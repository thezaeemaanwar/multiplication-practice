// ----- Elements -----
const settingsScreen = document.getElementById('settings-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');

const numQuestionsInput = document.getElementById('num-questions');
const totalTimeInput = document.getElementById('total-time');
const timePerQuestionInput = document.getElementById('time-per-question');
const questionsSettings = document.getElementById('questions-settings');
const timeSettings = document.getElementById('time-settings');
const settingsError = document.getElementById('settings-error');

const progressEl = document.getElementById('progress');
const timerEl = document.getElementById('timer');
const totalTimerEl = document.getElementById('total-timer');
const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answer');
const hintEl = document.getElementById('hint');

const scoreEl = document.getElementById('score');
const reviewList = document.getElementById('review-list');

// ----- Common fraction/percentage pool -----
// Standard "common fractions with decimal & percent equivalents" chart.
const PAIRS = [
  [1, 2],
  [1, 3], [2, 3],
  [1, 4], [3, 4],
  [1, 5], [2, 5], [3, 5], [4, 5],
  [1, 6], [5, 6],
  [1, 8], [3, 8], [5, 8], [7, 8],
  [1, 9], [2, 9], [4, 9], [5, 9], [7, 9], [8, 9],
  [1, 10],
  [1, 12],
  [1, 16],
  [1, 32],
].map(([num, den]) => ({ num, den }));

// A percentage terminates (finite decimals) when the reduced denominator's
// only prime factors are 2 and 5. Only these are used for "% → Fraction".
function isTerminating(den) {
  let d = den;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}
const TERMINATING_PAIRS = PAIRS.filter((p) => isTerminating(p.den));

// ----- State -----
let mode = 'questions';       // 'questions' | 'time'
let direction = 'toPercent';
let questions = [];
let current = 0;
let score = 0;

let timeLimit = 10;           // per-question time (both modes)
let timeLeft = 10;            // per-question countdown
let timerId = null;

let totalTimerId = null;      // whole-quiz countdown (time mode)
let totalTimeLeft = 0;        // seconds remaining (time mode)

// ----- Helpers -----
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[randInt(0, list.length - 1)];
}

// Percentage of num/den, truncated (NOT rounded) to `places` decimals.
// Uses integer long division so there is no floating-point error.
function truncPercent(num, den, places) {
  let remainder = num * 100;
  const intPart = Math.floor(remainder / den);
  remainder %= den;

  let decimals = '';
  for (let i = 0; i < places; i++) {
    remainder *= 10;
    decimals += Math.floor(remainder / den);
    remainder %= den;
  }
  return places > 0 ? `${intPart}.${decimals}` : `${intPart}`;
}

// Exact percentage string for terminating fractions (strips trailing zeros).
function exactPercent(num, den) {
  let remainder = num * 100;
  const intPart = Math.floor(remainder / den);
  remainder %= den;

  let decimals = '';
  let guard = 0;
  while (remainder !== 0 && guard < 12) {
    remainder *= 10;
    decimals += Math.floor(remainder / den);
    remainder %= den;
    guard++;
  }
  return decimals ? `${intPart}.${decimals}` : `${intPart}`;
}

// Human-friendly percent for display (adds … for repeating decimals).
function displayPercent(num, den) {
  if (isTerminating(den)) return exactPercent(num, den);
  return `${truncPercent(num, den, 4)}…`;
}

// ----- Answer checking -----
// Fraction → %: accept any truncation of the exact value to the number of
// decimal places the user typed (no rounding). e.g. 1/3 → 33.3, 33.33, 33 ...
function percentMatches(num, den, userStr) {
  const s = userStr.replace('%', '').trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return false;

  const dot = s.indexOf('.');
  const places = dot === -1 ? 0 : s.length - dot - 1;
  const expected = truncPercent(num, den, places);
  return parseFloat(s) === parseFloat(expected);
}

// % → Fraction: accept any fraction equal in value (e.g. 2/4 for 1/2).
function fractionMatches(num, den, userStr) {
  const m = userStr.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return false;
  const p = Number(m[1]);
  const q = Number(m[2]);
  if (q === 0) return false;
  return p * den === q * num;
}

// ----- Question generation -----
function makeQuestion(direction) {
  let dir = direction;
  if (dir === 'mixed') dir = Math.random() < 0.5 ? 'toPercent' : 'toFraction';

  const pool = dir === 'toFraction' ? TERMINATING_PAIRS : PAIRS;
  const { num, den } = pick(pool);
  return { num, den, dir, given: '' };
}

// ----- Screens -----
function showScreen(screen) {
  [settingsScreen, quizScreen, resultsScreen].forEach((s) => {
    s.hidden = s !== screen;
  });
}

// ----- Start -----
function startQuiz() {
  settingsError.hidden = true;

  mode = document.querySelector('input[name="mode"]:checked').value;
  direction = document.querySelector('input[name="direction"]:checked').value;

  // Per-question timer applies in both modes.
  timeLimit = Number(timePerQuestionInput.value);
  if (!Number.isInteger(timeLimit) || timeLimit < 1) {
    return showError('Please enter a valid time per question.');
  }

  if (mode === 'questions') {
    const count = Number(numQuestionsInput.value);
    if (!Number.isInteger(count) || count < 1) {
      return showError('Please enter a valid number of questions.');
    }
    questions = [];
    for (let i = 0; i < count; i++) questions.push(makeQuestion(direction));
  } else {
    const minutes = Number(totalTimeInput.value);
    if (!Number.isInteger(minutes) || minutes < 1) {
      return showError('Please enter a valid total time.');
    }
    totalTimeLeft = minutes * 60;
    questions = [makeQuestion(direction)]; // first question; more added on demand
  }

  current = 0;
  score = 0;

  // Overall countdown badge only in time mode.
  totalTimerEl.hidden = mode !== 'time';

  showScreen(quizScreen);
  if (mode === 'time') startTotalTimer();
  loadQuestion();
}

function showError(msg) {
  settingsError.textContent = msg;
  settingsError.hidden = false;
}

// ----- Question flow -----
function loadQuestion() {
  const q = questions[current];
  progressEl.textContent = mode === 'questions'
    ? `Question ${current + 1} / ${questions.length}`
    : `Question ${current + 1}`;

  if (q.dir === 'toPercent') {
    questionEl.textContent = `${q.num}/${q.den} = ? %`;
    hintEl.textContent = 'Decimals may be shortened, e.g. 33.3 (no rounding).';
    answerInput.placeholder = 'e.g. 50';
  } else {
    questionEl.textContent = `${displayPercent(q.num, q.den)}% = ? (fraction)`;
    hintEl.textContent = 'Type a fraction like 1/2. Any equal fraction is fine.';
    answerInput.placeholder = 'e.g. 1/2';
  }

  answerInput.value = '';
  answerInput.focus();
  startTimer(); // per-question countdown runs in both modes
}

function nextQuestion() {
  stopTimer();

  const q = questions[current];
  q.given = answerInput.value.trim();
  q.correct = q.dir === 'toPercent'
    ? percentMatches(q.num, q.den, q.given)
    : fractionMatches(q.num, q.den, q.given);
  if (q.correct) score++;

  current++;

  if (mode === 'time') {
    // Keep generating questions until the total timer runs out.
    if (questions.length <= current) {
      questions.push(makeQuestion(direction));
    }
    loadQuestion();
    return;
  }

  if (current < questions.length) {
    loadQuestion();
  } else {
    showResults();
  }
}

// ----- Per-question timer -----
function startTimer() {
  stopTimer();
  timeLeft = timeLimit;
  updateTimerDisplay();
  timerId = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      nextQuestion(); // time out -> record whatever is typed (or blank)
    }
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateTimerDisplay() {
  timerEl.textContent = timeLeft;
  timerEl.classList.toggle('low', timeLeft <= 3);
}

// ----- Total timer (time mode) -----
function startTotalTimer() {
  stopTotalTimer();
  updateTotalTimerDisplay();
  totalTimerId = setInterval(() => {
    totalTimeLeft--;
    updateTotalTimerDisplay();
    if (totalTimeLeft <= 0) {
      endTimeQuiz();
    }
  }, 1000);
}

function stopTotalTimer() {
  if (totalTimerId !== null) {
    clearInterval(totalTimerId);
    totalTimerId = null;
  }
}

function updateTotalTimerDisplay() {
  const m = Math.floor(totalTimeLeft / 60);
  const s = totalTimeLeft % 60;
  totalTimerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  totalTimerEl.classList.toggle('low', totalTimeLeft <= 10);
}

function endTimeQuiz() {
  stopTotalTimer();
  stopTimer();
  // Record the answer for the question on screen when time ran out.
  const q = questions[current];
  q.given = answerInput.value.trim();
  q.correct = q.dir === 'toPercent'
    ? percentMatches(q.num, q.den, q.given)
    : fractionMatches(q.num, q.den, q.given);
  if (q.correct) score++;
  showResults();
}

// ----- Results -----
function showResults() {
  scoreEl.textContent = `You scored ${score} / ${questions.length}`;
  reviewList.innerHTML = '';

  questions.forEach((q) => {
    const li = document.createElement('li');
    li.className = q.correct ? 'correct' : 'wrong';

    const prompt = document.createElement('span');
    const answer = q.dir === 'toPercent'
      ? `${displayPercent(q.num, q.den)}%`
      : `${q.num}/${q.den}`;
    const asked = q.dir === 'toPercent'
      ? `${q.num}/${q.den} = ${answer}`
      : `${displayPercent(q.num, q.den)}% = ${answer}`;
    prompt.textContent = asked;

    const given = document.createElement('span');
    given.className = 'given';
    if (q.correct) {
      given.innerHTML = '<span class="material-symbols-outlined">check</span>';
    } else {
      given.textContent = `You: ${q.given === '' ? '—' : q.given}`;
    }

    li.appendChild(prompt);
    li.appendChild(given);
    reviewList.appendChild(li);
  });

  showScreen(resultsScreen);
}

// ----- Events -----
document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('next-btn').addEventListener('click', nextQuestion);
document.getElementById('restart-btn').addEventListener('click', () => {
  stopTimer();
  stopTotalTimer();
  showScreen(settingsScreen);
});

// Show the settings group matching the selected quiz mode
document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const isTime = document.querySelector('input[name="mode"]:checked').value === 'time';
    questionsSettings.hidden = isTime;
    timeSettings.hidden = !isTime;
  });
});

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    nextQuestion();
  }
});

// ----- Init -----
showScreen(settingsScreen);
