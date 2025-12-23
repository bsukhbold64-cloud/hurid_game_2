// Хүрд цээжлүүлэх тоглоом – Level + Streak + Mistake practice (Vanilla JS)

const els = {
  score: document.getElementById("score"),
  correct: document.getElementById("correct"),
  wrong: document.getElementById("wrong"),
  time: document.getElementById("time"),
  high: document.getElementById("high"),

  streak: document.getElementById("streak"),
  bestStreak: document.getElementById("bestStreak"),

  a: document.getElementById("a"),
  b: document.getElementById("b"),
  answer: document.getElementById("answer"),
  feedback: document.getElementById("feedback"),
  mistakes: document.getElementById("mistakes"),

  tableSelect: document.getElementById("tableSelect"),
  multSelect: document.getElementById("multSelect"),
  mode: document.getElementById("mode"),
  duration: document.getElementById("duration"),

  level: document.getElementById("level"),
  practice: document.getElementById("practice"),

  startBtn: document.getElementById("startBtn"),
  resetBtn: document.getElementById("resetBtn"),
  submitBtn: document.getElementById("submitBtn"),
};

const RANGE_MIN = 1;
const RANGE_MAX = 12;

let state = {
  running: false,
  a: 0,
  b: 0,

  score: 0,
  correct: 0,
  wrong: 0,

  streak: 0,
  bestStreak: 0,

  timeLeft: 60,
  timerId: null,

  // key: "a×b", value: {a,b,count,lastWrongAt}
  mistakes: new Map(),
};

const HIGH_KEY = "hurid_high_score_v2";
const BEST_STREAK_KEY = "hurid_best_streak_v2";

function fillSelect(selectEl) {
  for (let i = RANGE_MIN; i <= RANGE_MAX; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    selectEl.appendChild(opt);
  }
}

function loadHighScore() {
  const v = Number(localStorage.getItem(HIGH_KEY) || 0);
  els.high.textContent = String(v);
  return v;
}

function loadBestStreak() {
  const v = Number(localStorage.getItem(BEST_STREAK_KEY) || 0);
  state.bestStreak = v;
  els.bestStreak.textContent = String(v);
  return v;
}

function setHighScoreIfNeeded() {
  const currentHigh = loadHighScore();
  if (state.score > currentHigh) {
    localStorage.setItem(HIGH_KEY, String(state.score));
    els.high.textContent = String(state.score);
  }
}

function setBestStreakIfNeeded() {
  const current = Number(localStorage.getItem(BEST_STREAK_KEY) || 0);
  if (state.bestStreak > current) {
    localStorage.setItem(BEST_STREAK_KEY, String(state.bestStreak));
  }
  els.bestStreak.textContent = String(Math.max(current, state.bestStreak));
}

function updateStats() {
  els.score.textContent = String(state.score);
  els.correct.textContent = String(state.correct);
  els.wrong.textContent = String(state.wrong);
  els.time.textContent = String(state.timeLeft);

  els.streak.textContent = String(state.streak);
  els.bestStreak.textContent = String(state.bestStreak);
}

function setFeedback(msg, type /* "good" | "bad" | "" */) {
  els.feedback.textContent = msg;
  els.feedback.classList.remove("good", "bad");
  if (type) els.feedback.classList.add(type);
}

function keyFor(a, b) {
  return `${a}×${b}`;
}

function getLevelMax() {
  // Level 1: 1–5, Level 2: 1–9, Level 3: 1–12
  const lv = Number(els.level?.value || 3);
  if (lv === 1) return 5;
  if (lv === 2) return 9;
  return 12;
}

function renderMistakes() {
  const items = Array.from(state.mistakes.values())
    .sort((x, y) => y.count - x.count)
    .slice(0, 30);

  els.mistakes.innerHTML = "";

  if (items.length === 0) {
    els.mistakes.classList.add("empty");
    els.mistakes.textContent = "Одоогоор алдаа алга 🙂";
    return;
  }

  els.mistakes.classList.remove("empty");
  for (const it of items) {
    const div = document.createElement("div");
    div.className = "badge";
    div.innerHTML = `<b>${it.a}×${it.b}=${it.a * it.b}</b> • алдаа: ${it.count}`;
    els.mistakes.appendChild(div);
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function matchesConstraints(a, b) {
  const mode = els.mode.value;
  const table = Number(els.tableSelect.value);
  const mult = Number(els.multSelect.value);

  if (mode === "fixedTable") return a === table;
  if (mode === "fixedMultiplier") return b === mult;
  return true; // mixed
}

function pickFromMistakes() {
  // practice "only" эсвэл "mixed" үед алдаанаас жинлэж сонгоно
  const candidates = Array.from(state.mistakes.values()).filter(it => matchesConstraints(it.a, it.b));

  if (candidates.length === 0) return null;

  // weight = count (их алдсаныг илүү магадлалтай)
  const total = candidates.reduce((s, it) => s + Math.max(1, it.count), 0);
  let r = Math.random() * total;

  for (const it of candidates) {
    r -= Math.max(1, it.count);
    if (r <= 0) return { a: it.a, b: it.b };
  }
  // fallback
  const last = candidates[candidates.length - 1];
  return { a: last.a, b: last.b };
}

function pickRandomQuestion() {
  const max = getLevelMax();
  const mode = els.mode.value;
  const table = Number(els.tableSelect.value);
  const mult = Number(els.multSelect.value);

  let a, b;

  if (mode === "fixedTable") {
    a = table;
    b = randInt(RANGE_MIN, max);
  } else if (mode === "fixedMultiplier") {
    a = randInt(RANGE_MIN, max);
    b = mult;
  } else {
    a = randInt(RANGE_MIN, max);
    b = randInt(RANGE_MIN, max);
  }

  return { a, b };
}

function pickQuestion() {
  const practiceMode = els.practice?.value || "off";
  const hasMistakes = state.mistakes.size > 0;

  let chosen = null;

  if (practiceMode === "only" && hasMistakes) {
    chosen = pickFromMistakes();
  } else if (practiceMode === "mixed" && hasMistakes) {
    // Алдааг түлхүү: ~65% алдаанаас, 35% санамсаргүй
    const p = 0.65;
    if (Math.random() < p) chosen = pickFromMistakes();
  }

  if (!chosen) chosen = pickRandomQuestion();

  state.a = chosen.a;
  state.b = chosen.b;

  els.a.textContent = String(state.a);
  els.b.textContent = String(state.b);
}

function focusAnswer() {
  els.answer.focus();
  els.answer.select();
}

function streakBonus(streak) {
  // 1–3: 0 бонус
  // 4–6: +2
  // 7–9: +4
  // 10–12: +6 ...
  if (streak <= 3) return 0;
  return Math.min(20, Math.floor((streak - 1) / 3) * 2);
}

function start() {
  if (state.running) return;

  state.running = true;

  state.score = 0;
  state.correct = 0;
  state.wrong = 0;

  state.streak = 0;
  // bestStreak-ийг хадгалсан утгаас эхлүүлнэ
  loadBestStreak();

  state.mistakes.clear();

  state.timeLeft = Number(els.duration.value);
  updateStats();
  renderMistakes();

  setFeedback("Эхэллээ! Стрикээ өсгөөрэй 💪", "good");
  pickQuestion();
  focusAnswer();

  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    updateStats();
    if (state.timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  if (!state.running) return;

  state.running = false;
  clearInterval(state.timerId);
  state.timerId = null;

  setHighScoreIfNeeded();
  setBestStreakIfNeeded();

  const msg = `Дууслаа! Оноо: ${state.score} • Зөв: ${state.correct} • Буруу: ${state.wrong} • Best стрик: ${state.bestStreak}`;
  setFeedback(msg, state.wrong === 0 ? "good" : "");
  els.answer.blur();
}

function resetUI() {
  endGame();

  state.score = 0;
  state.correct = 0;
  state.wrong = 0;
  state.streak = 0;

  state.timeLeft = Number(els.duration.value);
  state.mistakes.clear();

  els.a.textContent = "-";
  els.b.textContent = "-";
  els.answer.value = "";
  setFeedback("", "");
  updateStats();
  renderMistakes();
}

function submit() {
  if (!state.running) {
    setFeedback("Эхлүүлэх товч дарна уу 🙂", "");
    return;
  }

  const user = Number(els.answer.value);
  if (!Number.isFinite(user)) return;

  const correctAns = state.a * state.b;

  if (user === correctAns) {
    state.correct += 1;

    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    const bonus = streakBonus(state.streak);
    state.score += 10 + bonus;

    setFeedback(
      bonus > 0 ? `Зөв! ✅ Стрик ${state.streak} (+${bonus} бонус)` : `Зөв! ✅ Стрик ${state.streak}`,
      "good"
    );
  } else {
    state.wrong += 1;

    state.streak = 0;
    state.score = Math.max(0, state.score - 5);

    setFeedback(`Буруу ❌ Зөв нь: ${correctAns} (стрик 0 боллоо)`, "bad");

    const k = keyFor(state.a, state.b);
    const prev = state.mistakes.get(k);
    if (prev) {
      prev.count += 1;
      prev.lastWrongAt = Date.now();
    } else {
      state.mistakes.set(k, { a: state.a, b: state.b, count: 1, lastWrongAt: Date.now() });
    }
    renderMistakes();
  }

  updateStats();
  els.answer.value = "";
  pickQuestion();
  focusAnswer();
}

// events
els.startBtn.addEventListener("click", start);
els.resetBtn.addEventListener("click", resetUI);
els.submitBtn.addEventListener("click", submit);

els.answer.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
  if (e.key === "Escape") endGame();
});

// Хэрвээ тоглож байхад Level/Mode/Practice өөрчилбөл дараагийн асуултаас хэрэгжинэ
["change"].forEach((ev) => {
  els.level?.addEventListener(ev, () => { if (state.running) pickQuestion(); });
  els.practice?.addEventListener(ev, () => { if (state.running) pickQuestion(); });
  els.mode?.addEventListener(ev, () => { if (state.running) pickQuestion(); });
  els.tableSelect?.addEventListener(ev, () => { if (state.running) pickQuestion(); });
  els.multSelect?.addEventListener(ev, () => { if (state.running) pickQuestion(); });
});

// init
fillSelect(els.tableSelect);
fillSelect(els.multSelect);
els.tableSelect.value = "2";
els.multSelect.value = "2";

loadHighScore();
loadBestStreak();
resetUI();
