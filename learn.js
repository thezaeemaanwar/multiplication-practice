// ----- Elements -----
const tableInput = document.getElementById('table-input');
const showBtn = document.getElementById('show-btn');
const modeBtn = document.getElementById('mode-btn');
const checkBtn = document.getElementById('check-btn');
const tableList = document.getElementById('table-list');
const practiceResult = document.getElementById('practice-result');

// ----- Config -----
const ROWS = 10; // multipliers 1..10

// ----- State -----
let table = 7;         // the number whose table is shown
let practicing = false;

// ----- Rendering -----
function render() {
  tableList.innerHTML = '';
  practiceResult.hidden = true;

  for (let i = 1; i <= ROWS; i++) {
    const li = document.createElement('li');
    li.className = 'table-row';

    const expr = document.createElement('span');
    expr.className = 'expr';
    expr.textContent = `${table} × ${i} =`;
    li.appendChild(expr);

    if (practicing) {
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'table-answer';
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      input.dataset.answer = String(table * i);
      // Enter checks all answers
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkAnswers();
        }
      });
      li.appendChild(input);
    } else {
      const product = document.createElement('span');
      product.className = 'product';
      product.textContent = String(table * i);
      li.appendChild(product);
    }

    tableList.appendChild(li);
  }

  // Focus the first answer box in practice mode for quick typing
  if (practicing) {
    const first = tableList.querySelector('.table-answer');
    if (first) first.focus();
  }
}

// ----- Actions -----
function showTable() {
  const n = Number(tableInput.value);
  if (!Number.isInteger(n) || n < 1) {
    practiceResult.hidden = false;
    practiceResult.className = 'practice-result wrong';
    practiceResult.textContent = 'Please enter a valid table number.';
    return;
  }
  table = n;
  render();
}

function toggleMode() {
  practicing = !practicing;
  modeBtn.innerHTML = practicing
    ? '<span class="material-symbols-outlined">visibility</span> View answers'
    : '<span class="material-symbols-outlined">edit</span> Practice this table';
  checkBtn.hidden = !practicing;
  render();
}

function checkAnswers() {
  const inputs = tableList.querySelectorAll('.table-answer');
  let correct = 0;

  inputs.forEach((input) => {
    const expected = Number(input.dataset.answer);
    const given = input.value.trim();
    input.classList.remove('correct', 'wrong');

    if (given === '') return; // leave blanks unmarked
    if (Number(given) === expected) {
      input.classList.add('correct');
      correct++;
    } else {
      input.classList.add('wrong');
    }
  });

  practiceResult.hidden = false;
  practiceResult.className = correct === inputs.length
    ? 'practice-result correct'
    : 'practice-result';
  practiceResult.textContent = `You got ${correct} / ${inputs.length} correct.`;
}

// ----- Events -----
showBtn.addEventListener('click', showTable);
modeBtn.addEventListener('click', toggleMode);
checkBtn.addEventListener('click', checkAnswers);
tableInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    showTable();
  }
});

// ----- Init -----
render();
