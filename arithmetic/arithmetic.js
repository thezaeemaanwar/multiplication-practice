// ----- Elements -----
const settingsScreen = document.getElementById('settings-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');

const maxNumberInput = document.getElementById('max-number');
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

const scoreEl = document.getElementById('score');
const reviewList = document.getElementById('review-list');

// ----- State -----
let mode = 'questions';       // 'questions' | 'time'
let operation = 'add';        // 'add' | 'subtract' | 'mixed'
let maxNumber = 20;
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

// ----- Question generation -----
// Subtraction is generated so the result is never negative (a >= b).
function makeQuestion(operation, maxNum) {
  let op = operation;
  if (op === 'mixed') op = Math.random() < 0.5 ? 'add' : 'subtract';

  let a, b, answer, symbol;
  if (op === 'add') {
    a = randInt(0, maxNum);
    b = randInt(0, maxNum);
    answer = a + b;
    symbol = '+';
  } else {
    a = randInt(0, maxNum);
    b = randInt(0, a);
    answer = a - b;
    symbol = '−';
  }
  return { a, b, op, symbol, answer, given: null };
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
  operation = document.querySelector('input[name="operation"]:checked').value;

  maxNumber = Number(maxNumberInput.value);
  if (!Number.isInteger(maxNumber) || maxNumber < 5) {
    return showError('Please enter a largest number of at least 5.');
  }

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
    for (let i = 0; i < count; i++) questions.push(makeQuestion(operation, maxNumber));
  } else {
    const minutes = Number(totalTimeInput.value);
    if (!Number.isInteger(minutes) || minutes < 1) {
      return showError('Please enter a valid total time.');
    }
    totalTimeLeft = minutes * 60;
    questions = [makeQuestion(operation, maxNumber)]; // first question; more added on demand
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

  questionEl.textContent = `${q.a} ${q.symbol} ${q.b}`;
  answerInput.value = '';
  answerInput.focus();
  startTimer(); // per-question countdown runs in both modes
}

function recordAnswer(q) {
  const raw = answerInput.value.trim();
  q.given = raw === '' ? null : Number(raw);
  if (q.given === q.answer) score++;
}

function nextQuestion() {
  stopTimer();

  recordAnswer(questions[current]);
  current++;

  if (mode === 'time') {
    // Keep generating questions until the total timer runs out.
    if (questions.length <= current) {
      questions.push(makeQuestion(operation, maxNumber));
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
  recordAnswer(questions[current]);
  showResults();
}

// ----- Results -----
function showResults() {
  scoreEl.textContent = `You scored ${score} / ${questions.length}`;
  reviewList.innerHTML = '';

  questions.forEach((q) => {
    const correct = q.given === q.answer;
    const li = document.createElement('li');
    li.className = correct ? 'correct' : 'wrong';

    const prompt = document.createElement('span');
    prompt.textContent = `${q.a} ${q.symbol} ${q.b} = ${q.answer}`;

    const given = document.createElement('span');
    given.className = 'given';
    if (correct) {
      given.innerHTML = '<span class="material-symbols-outlined">check</span>';
    } else {
      given.textContent = `You: ${q.given === null ? '—' : q.given}`;
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
