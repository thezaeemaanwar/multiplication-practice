// ----- Elements -----
const settingsScreen = document.getElementById('settings-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');

const numQuestionsInput = document.getElementById('num-questions');
const timePerQuestionInput = document.getElementById('time-per-question');
const totalTimeInput = document.getElementById('total-time');
const questionsSettings = document.getElementById('questions-settings');
const timeSettings = document.getElementById('time-settings');
const tablesGrid = document.getElementById('tables-grid');
const settingsError = document.getElementById('settings-error');

const progressEl = document.getElementById('progress');
const timerEl = document.getElementById('timer');
const totalTimerEl = document.getElementById('total-timer');
const questionEl = document.getElementById('question');
const answerInput = document.getElementById('answer');

const scoreEl = document.getElementById('score');
const reviewList = document.getElementById('review-list');

// ----- Config -----
const TABLE_MIN = 1;
const TABLE_MAX = 20;

// ----- State -----
let mode = 'questions';       // 'questions' | 'time'
let questions = [];           // answered/current questions
let selectedTables = [];
let current = 0;
let score = 0;
let timeLimit = 10;           // per-question time (questions mode)
let timeLeft = 10;            // per-question countdown (questions mode)
let timerId = null;

let totalTimerId = null;      // whole-quiz countdown (time mode)
let totalTimeLeft = 0;        // seconds remaining (time mode)

let usedKeys = new Set();     // ordered pairs already asked this test

// ----- Build table checkboxes -----
function buildTableToggles() {
  for (let n = TABLE_MIN; n <= TABLE_MAX; n++) {
    const label = document.createElement('label');
    label.className = 'table-toggle';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = String(n);
    if (n >= 2 && n <= 9) checkbox.checked = true; // sensible defaults

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(n));

    const sync = () => label.classList.toggle('checked', checkbox.checked);
    checkbox.addEventListener('change', sync);
    sync();

    tablesGrid.appendChild(label);
  }
}

function getSelectedTables() {
  return Array.from(tablesGrid.querySelectorAll('input:checked'))
    .map((cb) => Number(cb.value));
}

function setAllTables(checked) {
  tablesGrid.querySelectorAll('input').forEach((cb) => {
    cb.checked = checked;
    cb.dispatchEvent(new Event('change'));
  });
}

// ----- Quiz generation -----
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeQuestion(tables) {
  // Every distinct ordered pair (a from tables, b in 1..12).
  const poolSize = tables.length * 12;
  // If every unique question has been used (possible in time mode), start over.
  if (usedKeys.size >= poolSize) usedKeys.clear();

  let a, b, key;
  do {
    a = tables[randInt(0, tables.length - 1)];
    b = randInt(1, 12);
    key = `${a}x${b}`;
  } while (usedKeys.has(key));

  usedKeys.add(key);
  return { a, b, answer: a * b, given: null };
}

function generateQuestions(count, tables) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(makeQuestion(tables));
  }
  return list;
}

// ----- Screen switching -----
function showScreen(screen) {
  [settingsScreen, quizScreen, resultsScreen].forEach((s) => {
    s.hidden = s !== screen;
  });
}

// ----- Start -----
function startQuiz() {
  settingsError.hidden = true;

  mode = document.querySelector('input[name="mode"]:checked').value;
  selectedTables = getSelectedTables();
  usedKeys.clear();

  if (selectedTables.length === 0) {
    return showError('Please select at least one table.');
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
    questions = generateQuestions(count, selectedTables);
  } else {
    const minutes = Number(totalTimeInput.value);
    if (!Number.isInteger(minutes) || minutes < 1) {
      return showError('Please enter a valid total time.');
    }
    totalTimeLeft = minutes * 60;
    questions = [makeQuestion(selectedTables)]; // first question; more added on demand
  }

  current = 0;
  score = 0;

  // Show the overall countdown badge only in time mode.
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
  questionEl.textContent = `${q.a} × ${q.b}`;
  answerInput.value = '';
  answerInput.focus();
  startTimer(); // per-question countdown runs in both modes
}

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
  const raw = answerInput.value.trim();
  q.given = raw === '' ? null : Number(raw);
  if (q.given === q.answer) score++;
  showResults();
}

function nextQuestion() {
  stopTimer();

  const q = questions[current];
  const raw = answerInput.value.trim();
  q.given = raw === '' ? null : Number(raw);
  if (q.given === q.answer) score++;

  current++;

  if (mode === 'time') {
    // Keep generating questions until the total timer runs out.
    if (questions.length <= current) {
      questions.push(makeQuestion(selectedTables));
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

// ----- Results -----
function showResults() {
  scoreEl.textContent = `You scored ${score} / ${questions.length}`;
  reviewList.innerHTML = '';

  questions.forEach((q) => {
    const li = document.createElement('li');
    const correct = q.given === q.answer;
    li.className = correct ? 'correct' : 'wrong';

    const question = document.createElement('span');
    question.textContent = `${q.a} × ${q.b} = ${q.answer}`;

    const given = document.createElement('span');
    given.className = 'given';
    if (correct) {
      given.innerHTML = '<span class="material-symbols-outlined">check</span>';
    } else {
      given.textContent = `Your answer: ${q.given === null ? '—' : q.given}`;
    }

    li.appendChild(question);
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

// Show the settings group matching the selected mode
document.querySelectorAll('input[name="mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const isTime = document.querySelector('input[name="mode"]:checked').value === 'time';
    questionsSettings.hidden = isTime;
    timeSettings.hidden = !isTime;
  });
});
document.getElementById('select-all').addEventListener('click', () => setAllTables(true));
document.getElementById('clear-all').addEventListener('click', () => setAllTables(false));

// Enter key advances to next question
answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    nextQuestion();
  }
});

// ----- Init -----
buildTableToggles();
showScreen(settingsScreen);
