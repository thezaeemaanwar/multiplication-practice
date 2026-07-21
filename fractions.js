// ----- Elements -----
const settingsScreen = document.getElementById('settings-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');

const numQuestionsInput = document.getElementById('num-questions');
const settingsError = document.getElementById('settings-error');

const progressEl = document.getElementById('progress');
const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answer');
const hintEl = document.getElementById('hint');

const scoreEl = document.getElementById('score');
const reviewList = document.getElementById('review-list');

// ----- Common fraction/percentage pool -----
// Curated set of common fractions (already in lowest terms).
const PAIRS = [
  [1, 2],
  [1, 3], [2, 3],
  [1, 4], [3, 4],
  [1, 5], [2, 5], [3, 5], [4, 5],
  [1, 6], [5, 6],
  [1, 8], [3, 8], [5, 8], [7, 8],
  [1, 10], [3, 10], [7, 10], [9, 10],
  [1, 20], [3, 20], [7, 20], [9, 20],
  [1, 25], [1, 50], [1, 100],
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
let questions = [];
let current = 0;
let score = 0;

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

  const direction = document.querySelector('input[name="direction"]:checked').value;
  const count = Number(numQuestionsInput.value);

  if (!Number.isInteger(count) || count < 1) {
    settingsError.textContent = 'Please enter a valid number of questions.';
    settingsError.hidden = false;
    return;
  }

  questions = [];
  for (let i = 0; i < count; i++) questions.push(makeQuestion(direction));
  current = 0;
  score = 0;

  showScreen(quizScreen);
  loadQuestion();
}

// ----- Question flow -----
function loadQuestion() {
  const q = questions[current];
  progressEl.textContent = `Question ${current + 1} / ${questions.length}`;

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
}

function nextQuestion() {
  const q = questions[current];
  q.given = answerInput.value.trim();
  q.correct = q.dir === 'toPercent'
    ? percentMatches(q.num, q.den, q.given)
    : fractionMatches(q.num, q.den, q.given);
  if (q.correct) score++;

  current++;
  if (current < questions.length) {
    loadQuestion();
  } else {
    showResults();
  }
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
    given.textContent = q.correct ? '✓' : `You: ${q.given === '' ? '—' : q.given}`;

    li.appendChild(prompt);
    li.appendChild(given);
    reviewList.appendChild(li);
  });

  showScreen(resultsScreen);
}

// ----- Events -----
document.getElementById('start-btn').addEventListener('click', startQuiz);
document.getElementById('next-btn').addEventListener('click', nextQuestion);
document.getElementById('restart-btn').addEventListener('click', () => showScreen(settingsScreen));

answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    nextQuestion();
  }
});

// ----- Init -----
showScreen(settingsScreen);
