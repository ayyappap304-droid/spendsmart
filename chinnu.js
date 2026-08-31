const titleInput     = document.getElementById('title-input');
const amountInput    = document.getElementById('amount-input');
const categoryInput  = document.getElementById('category-input');
const dateInput      = document.getElementById('date-input');
const expensesGrid   = document.getElementById('expenses-grid');


const API = 'https://expense-tracker-sx7a.onrender.com'
let currentFilter = 'all';


const CATEGORIES = {
  food:     { label: 'Food',     emoji: '🍔', color: '#4ade80' },
  travel:   { label: 'Travel',   emoji: '🚗', color: '#60a5fa' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#f472b6' },
  bills:    { label: 'Bills',    emoji: '💡', color: '#a78bfa' },
  other:    { label: 'Other',    emoji: '📦', color: '#fb923c' },
};


document.addEventListener('DOMContentLoaded', function () {

  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  const headerDate = document.getElementById('header-date');
  if (headerDate) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    headerDate.textContent = new Date().toLocaleDateString('en-IN', options);
  }

  renderExpenses();

});


async function addExpense() {

  const title    = titleInput.value.trim();
  const amount   = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date     = dateInput.value;


  if (!title) {
    alert('Please enter a title for the expense.');
    titleInput.focus();
    return;
  }

  if (title.length < 2) {
    alert('Title must be at least 2 characters.');
    titleInput.focus();
    return;
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount greater than zero.');
    amountInput.focus();
    return;
  }

  if (amount > 10000000) {
    alert('Amount seems too large. Please check and try again.');
    amountInput.focus();
    return;
  }

  if (!date) {
    alert('Please select a date.');
    return;
  }

  try {
    const response = await fetch(API + '/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, amount, category, date })
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert('Error: ' + errorData.error);
      return;
    }

  titleInput.value    = '';
  amountInput.value   = '';
  categoryInput.value = 'food';
  dateInput.value     = new Date().toISOString().split('T')[0];
  titleInput.focus();


  renderExpenses();
    
  } catch (error) {
    console.log("Error adding expense: ", error);
    alert("could not connect to the server. Make sure backend is running.")
    
  }

}


async function deleteExpense(id) {

  try {
    const response = await fetch(API + '/expenses/' + id, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert('Error: ' + errorData.error);
      return;
    }
    renderExpenses();
  } catch (error) {
    console.log('Error deleting expense: ', error);
    alert('Could not connect to the server. Make sure backend is running.');
  }

}


function filterExpenses(category, btn) {

  currentFilter = category;

  document.querySelectorAll('.filter-btn').forEach(function(button) {
    button.classList.remove('active');
  });

  btn.classList.add('active');

  renderExpenses();

}


async function renderExpenses() {
  try {
    const response = await fetch(API + '/expenses');
    const expenses = await response.json();

    let filtered;
  if (currentFilter === 'all') {
    filtered = expenses;
  } else {
    filtered = expenses.filter(function(expense) {
      return expense.category === currentFilter;
    });
  }


  const sorted = filtered.slice().sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });


  if (sorted.length === 0) {
    if (currentFilter === 'all') {
      expensesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💰</div>
          <p>No expenses yet.</p>
          <span>Add your first expense using the form above.</span>
        </div>
      `;
    } else {
      const cat = CATEGORIES[currentFilter];
      expensesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${cat.emoji}</div>
          <p>No ${cat.label} expenses yet.</p>
          <span>Try a different filter or add a ${cat.label} expense.</span>
        </div>
      `;
    }
    return;
  }


  expensesGrid.innerHTML = sorted.map(function(expense) {

    const cat          = CATEGORIES[expense.category];
    const formattedDate = formatDate(expense.date);
    const formattedAmt  = formatAmount(expense.amount);

    return `
      <div class="expense-card ${expense.category}">
        <div class="card-top">
          <div class="expense-title">${escapeHtml(expense.title)}</div>
          <div class="expense-amount">${formattedAmt}</div>
        </div>
        <div class="card-bottom">
          <div class="expense-meta">
            <span class="badge ${expense.category}">
              ${cat.emoji} ${cat.label}
            </span>
            <span class="expense-date">${formattedDate}</span>
          </div>
          <button class="btn-delete" onclick="deleteExpense('${expense._id}')">
            Delete
          </button>
        </div>
      </div>
    `;

  }).join('');

  updateSummary(expenses);
  updateSpendingBar(expenses);

  } catch (error) {
    console.log('Error fetching expenses: ', error);
    alert('Could not connect to the server. Make sure backend is running.');
  }

  

}


function updateSummary(expenses) {

  const total = expenses.reduce(function(sum, expense) {
    return sum + expense.amount;
  }, 0);

  const totalAmountEl = document.getElementById('total-amount');
  const totalCountEl  = document.getElementById('total-count');
  if (totalAmountEl) totalAmountEl.textContent = formatAmount(total);
  if (totalCountEl)  totalCountEl.textContent  =
    expenses.length + (expenses.length === 1 ? ' expense' : ' expenses');


  Object.keys(CATEGORIES).forEach(function(cat) {

    const catExpenses = expenses.filter(function(e) {
      return e.category === cat;
    });

    const catTotal = catExpenses.reduce(function(sum, e) {
      return sum + e.amount;
    }, 0);

    const amountEl = document.getElementById(cat + '-amount');
    const countEl  = document.getElementById(cat + '-count');

    if (amountEl) amountEl.textContent = formatAmount(catTotal);
    if (countEl)  countEl.textContent  =
      catExpenses.length + (catExpenses.length === 1 ? ' expense' : ' expenses');

  });

}


function updateSpendingBar(expenses) {

  const wrapper = document.getElementById('spending-bar-wrapper');
  const bar     = document.getElementById('spending-bar');
  const legend  = document.getElementById('spending-bar-legend');

  if (!wrapper || !bar || !legend) return;

  if (expenses.length === 0) {
    wrapper.classList.remove('visible');
    return;
  }

  wrapper.classList.add('visible');

  const total = expenses.reduce(function(sum, e) {
    return sum + e.amount;
  }, 0);

  let barHTML    = '';
  let legendHTML = '';

  Object.keys(CATEGORIES).forEach(function(cat) {

    const catTotal = expenses
      .filter(function(e) { return e.category === cat; })
      .reduce(function(sum, e) { return sum + e.amount; }, 0);

    if (catTotal === 0) return;

    const percent = ((catTotal / total) * 100).toFixed(1);
    const config  = CATEGORIES[cat];

    barHTML += `
      <div
        class="bar-segment"
        style="width:${percent}%; background:${config.color};"
        title="${config.label}: ${formatAmount(catTotal)} (${percent}%)">
      </div>
    `;

    legendHTML += `
      <div class="legend-item">
        <div class="legend-dot" style="background:${config.color};"></div>
        ${config.emoji} ${config.label} — ${percent}%
      </div>
    `;

  });

  bar.innerHTML    = barHTML;
  legend.innerHTML = legendHTML;

}


function formatAmount(amount) {
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}


function formatDate(dateStr) {
  const date    = new Date(dateStr + 'T00:00:00');
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-IN', options);
}


function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}


document.addEventListener('keydown', function(event) {

  if (event.key !== 'Enter') return;

  const active = document.activeElement;

  if (
    active === titleInput   ||
    active === amountInput  ||
    active === categoryInput
  ) {
    addExpense();
  }

});