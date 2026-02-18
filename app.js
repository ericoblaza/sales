// Store sales data: { [dateKey]: [ { name, price, qty, total } ] }
// dateKey format: "YYYY-MM-DD"
const STORAGE_KEY = 'store_sales_data';

function getStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setStoredData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateShort(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatMonth(year, month) {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatCurrency(n) {
  return '₱' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function addSale(dateKey, item) {
  const data = getStoredData();
  if (!data[dateKey]) data[dateKey] = [];
  data[dateKey].push(item);
  setStoredData(data);
  refreshAll();
}

function deleteSale(dateKey, index) {
  const data = getStoredData();
  if (!data[dateKey]) return;
  data[dateKey].splice(index, 1);
  if (data[dateKey].length === 0) delete data[dateKey];
  setStoredData(data);
  refreshAll();
  if (selectedDateKey === dateKey) showSelectedDay(dateKey);
}

function confirmDelete(dateKey, index) {
  const items = getSalesForDate(dateKey);
  const item = items[index];
  if (!item) return;
  const msg = `Are you sure you want to delete "${item.name}" (${formatCurrency(item.total || item.price * item.qty)})?`;
  if (confirm(msg)) deleteSale(dateKey, index);
}

function updateSale(dateKey, index, item) {
  const data = getStoredData();
  if (!data[dateKey] || !data[dateKey][index]) return;
  data[dateKey][index] = item;
  setStoredData(data);
  refreshAll();
  if (selectedDateKey === dateKey) showSelectedDay(dateKey);
}

function getSalesForDate(dateKey) {
  const data = getStoredData();
  return data[dateKey] || [];
}

function getSalesForMonth(year, month) {
  const data = getStoredData();
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const result = [];
  for (const key in data) {
    if (key.startsWith(prefix)) result.push({ dateKey: key, items: data[key] });
  }
  result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return result;
}

function calcTotal(items) {
  return items.reduce((sum, i) => sum + (i.total || i.price * i.qty), 0);
}

function getTotalForDate(dateKey) {
  const items = getSalesForDate(dateKey);
  return calcTotal(items);
}

function getTotalForDateRange(startDate, endDate) {
  const data = getStoredData();
  let total = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = getDateKey(d);
    total += calcTotal(data[key] || []);
  }
  return total;
}

// --- UI ---

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let selectedDateKey = null;
let editingState = null; // { dateKey, index }

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');

  if (tabId === 'monthly') renderMonthly();
  if (tabId === 'calendar') renderCalendar();
  if (tabId === 'summary') renderSummary();
}

function renderAddForm() {
  const form = document.getElementById('addForm');
  const submitBtn = form?.querySelector('button[type="submit"]');
  const cancelBtn = document.getElementById('cancelEditBtn');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('itemName').value.trim();
    const price = parseFloat(document.getElementById('itemPrice').value) || 0;
    const qty = parseInt(document.getElementById('itemQty').value, 10) || 1;
    if (!name) return;

    const total = price * qty;
    const item = { name, price, qty, total };

    if (editingState) {
      updateSale(editingState.dateKey, editingState.index, item);
      cancelEdit();
    } else {
      const today = getDateKey(new Date());
      addSale(today, item);
    }

    form.reset();
    document.getElementById('itemQty').value = 1;
    document.getElementById('itemName').focus();
  });

  cancelBtn?.addEventListener('click', cancelEdit);

  function cancelEdit() {
    editingState = null;
    form?.reset();
    document.getElementById('itemQty').value = 1;
    if (submitBtn) submitBtn.textContent = 'Add to Today\'s Sales';
    if (cancelBtn) cancelBtn.style.display = 'none';
  }

  window.startEdit = function(dateKey, index) {
    const items = getSalesForDate(dateKey);
    const i = items[index];
    if (!i) return;
    editingState = { dateKey, index };
    document.getElementById('itemName').value = i.name;
    document.getElementById('itemPrice').value = i.price;
    document.getElementById('itemQty').value = i.qty;
    if (submitBtn) submitBtn.textContent = 'Update Sale';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    switchTab('add');
  };
}

function renderTodayList() {
  const today = getDateKey(new Date());
  const items = getSalesForDate(today);

  document.getElementById('todayDate').textContent = '— ' + formatDateShort(today);
  const listEl = document.getElementById('todayList');
  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">No sales yet today.</p>';
  } else {
    listEl.innerHTML = `<table>
      <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th><th>Actions</th></tr></thead>
      <tbody>${items.map((i, idx) => `
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td>${formatCurrency(i.price)}</td>
          <td>${i.qty}</td>
          <td>${formatCurrency(i.total || i.price * i.qty)}</td>
          <td class="actions">
            <button type="button" class="btn-action btn-edit" onclick="startEdit('${today}',${idx})" title="Edit">✏️</button>
            <button type="button" class="btn-action btn-delete" onclick="confirmDelete('${today}',${idx})" title="Delete">🗑️</button>
          </td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }
  document.getElementById('todayTotal').textContent = formatCurrency(calcTotal(items));

  document.getElementById('todayQuickTotal').textContent = formatCurrency(calcTotal(items));
}

function renderMonthly() {
  const monthLabel = document.getElementById('monthLabel');
  monthLabel.textContent = formatMonth(currentYear, currentMonth);

  const monthData = getSalesForMonth(currentYear, currentMonth);
  const allItems = [];
  monthData.forEach(({ dateKey, items }) => {
    items.forEach(i => {
      allItems.push({ ...i, dateKey });
    });
  });

  const listEl = document.getElementById('monthlyList');
  if (allItems.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">No sales this month.</p>';
  } else {
    const grouped = {};
    monthData.forEach(({ dateKey, items }) => {
      const label = formatDateShort(dateKey);
      grouped[label] = { dateKey, items };
    });

    let html = '<table><thead><tr><th>Date</th><th>Item</th><th>Price</th><th>Qty</th><th>Total</th><th>Actions</th></tr></thead><tbody>';
    for (const dateLabel in grouped) {
      const { dateKey, items } = grouped[dateLabel];
      items.forEach((i, idx) => {
        const rowspan = idx === 0 ? ` rowspan="${items.length}"` : '';
        const dateCell = idx === 0 ? `<td${rowspan}>${dateLabel}</td>` : '';
        html += `<tr>${dateCell}<td>${escapeHtml(i.name)}</td><td>${formatCurrency(i.price)}</td><td>${i.qty}</td><td>${formatCurrency(i.total || i.price * i.qty)}</td><td class="actions"><button type="button" class="btn-action btn-edit" onclick="startEdit('${dateKey}',${idx})" title="Edit">✏️</button><button type="button" class="btn-action btn-delete" onclick="confirmDelete('${dateKey}',${idx})" title="Delete">🗑️</button></td></tr>`;
      });
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }

  const total = monthData.reduce((s, { items }) => s + calcTotal(items), 0);
  document.getElementById('monthlyTotal').textContent = formatCurrency(total);
}

function renderCalendar() {
  const labelEl = document.getElementById('calMonthLabel');
  labelEl.textContent = formatMonth(calYear, calMonth);

  const grid = document.getElementById('calendarGrid');
  const today = getDateKey(new Date());
  const first = new Date(calYear, calMonth, 1);
  const last = new Date(calYear, calMonth + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();

  const data = getStoredData();
  const dayTotals = {};
  for (const key in data) {
    if (key.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, '0')}`)) {
      const day = parseInt(key.split('-')[2], 10);
      dayTotals[day] = calcTotal(data[key]);
    }
  }

  let html = '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(w => { html += `<div class="calendar-day calendar-day-header">${w}</div>`; });

  for (let i = 0; i < startPad; i++) {
    const prevMonthLast = new Date(calYear, calMonth, -startPad + i + 1);
    const key = getDateKey(prevMonthLast);
    const has = (data[key] || []).length > 0;
    html += `<div class="calendar-day other-month has-sales-${has}" data-date="${key}"><span class="date-num">${prevMonthLast.getDate()}</span></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasSales = (data[key] || []).length > 0;
    const total = dayTotals[d] || 0;
    const isToday = key === today;
    let cls = 'calendar-day';
    if (hasSales) cls += ' has-sales';
    if (isToday) cls += ' today';
    html += `<div class="calendar-day ${cls}" data-date="${key}"><span class="date-num">${d}</span>${hasSales ? `<span class="date-total">${formatCurrency(total)}</span>` : ''}</div>`;
  }

  const remaining = 42 - (startPad + daysInMonth);
  for (let i = 0; i < remaining; i++) {
    const nextMonthDay = new Date(calYear, calMonth + 1, i + 1);
    const key = getDateKey(nextMonthDay);
    html += `<div class="calendar-day other-month" data-date="${key}"><span class="date-num">${nextMonthDay.getDate()}</span></div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.calendar-day:not(.calendar-day-header)').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.getAttribute('data-date');
      if (!key) return;
      selectedDateKey = key;
      document.querySelectorAll('.calendar-day').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      showSelectedDay(key);
    });
  });
}

function showSelectedDay(dateKey) {
  const info = document.getElementById('selectedDayInfo');
  const items = getSalesForDate(dateKey);

  document.getElementById('selectedDateLabel').textContent = formatDateShort(dateKey);
  const listEl = document.getElementById('selectedDayList');
  if (items.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">No sales on this day.</p>';
  } else {
    listEl.innerHTML = `<table>
      <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th><th>Actions</th></tr></thead>
      <tbody>${items.map((i, idx) => `
        <tr>
          <td>${escapeHtml(i.name)}</td><td>${formatCurrency(i.price)}</td><td>${i.qty}</td><td>${formatCurrency(i.total || i.price * i.qty)}</td>
          <td class="actions">
            <button type="button" class="btn-action btn-edit" onclick="startEdit('${dateKey}',${idx})" title="Edit">✏️</button>
            <button type="button" class="btn-action btn-delete" onclick="confirmDelete('${dateKey}',${idx})" title="Delete">🗑️</button>
          </td>
        </tr>
      `).join('')}</tbody>
    </table>`;
  }
  document.getElementById('selectedDayTotal').textContent = formatCurrency(calcTotal(items));
  info.style.display = 'block';
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function refreshAll() {
  renderTodayList();
  renderMonthly();
  renderSummary();
}

// Daily Summary
function renderSummary() {
  const today = new Date();
  const todayKey = getDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  // This week: Monday to today (or Sunday to today for simplicity - last 7 days)
  const getMonday = (d) => {
    const m = new Date(d);
    const day = m.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    m.setDate(m.getDate() + diff);
    return m;
  };
  const mondayThis = getMonday(today);
  const sundayThis = new Date(mondayThis);
  sundayThis.setDate(sundayThis.getDate() + 6);
  const mondayLast = new Date(mondayThis);
  mondayLast.setDate(mondayLast.getDate() - 7);
  const sundayLast = new Date(mondayLast);
  sundayLast.setDate(sundayLast.getDate() + 6);

  const todayTotal = getTotalForDate(todayKey);
  const yesterdayTotal = getTotalForDate(yesterdayKey);
  const thisWeekTotal = getTotalForDateRange(mondayThis, today);
  const lastWeekTotal = getTotalForDateRange(mondayLast, sundayLast);

  document.getElementById('summaryToday').textContent = formatCurrency(todayTotal);
  document.getElementById('summaryYesterday').textContent = formatCurrency(yesterdayTotal);
  document.getElementById('summaryThisWeek').textContent = formatCurrency(thisWeekTotal);
  document.getElementById('summaryLastWeek').textContent = formatCurrency(lastWeekTotal);

  const todayCompare = document.getElementById('summaryTodayCompare');
  if (yesterdayTotal > 0) {
    const pct = ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(0);
    const up = todayTotal >= yesterdayTotal;
    todayCompare.textContent = up ? `↑ ${pct}% vs yesterday` : `↓ ${Math.abs(pct)}% vs yesterday`;
    todayCompare.className = 'summary-compare ' + (up ? 'up' : 'down');
  } else {
    todayCompare.textContent = todayTotal > 0 ? '↑ New today' : '';
    todayCompare.className = 'summary-compare';
  }

  const weekCompare = document.getElementById('summaryWeekCompare');
  if (lastWeekTotal > 0) {
    const pct = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100).toFixed(0);
    const up = thisWeekTotal >= lastWeekTotal;
    weekCompare.textContent = up ? `↑ ${pct}% vs last week` : `↓ ${Math.abs(pct)}% vs last week`;
    weekCompare.className = 'summary-compare ' + (up ? 'up' : 'down');
  } else {
    weekCompare.textContent = thisWeekTotal > 0 ? '↑ New this week' : '';
    weekCompare.className = 'summary-compare';
  }
}

// Backup & Restore
function exportBackup() {
  const data = getStoredData();
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-backup-${getDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const statusEl = document.getElementById('importStatus');
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      const data = backup.data || backup;
      if (typeof data !== 'object') throw new Error('Invalid backup format');
      setStoredData(data);
      refreshAll();
      if (selectedDateKey) showSelectedDay(selectedDateKey);
      statusEl.textContent = '✓ Restore successful! Your data has been restored.';
      statusEl.className = 'import-status success';
    } catch (err) {
      statusEl.textContent = '✗ Failed to restore: ' + (err.message || 'Invalid file');
      statusEl.className = 'import-status error';
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// Print functions
function printToday() {
  const today = getDateKey(new Date());
  const items = getSalesForDate(today);
  const total = calcTotal(items);
  const html = `
    <div class="print-header">
      <h2>Today's Sales – ${formatDateShort(today)}</h2>
      <p>Printed on ${formatDate(new Date())}</p>
    </div>
    <table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
    <tbody>${items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${formatCurrency(i.price)}</td><td>${i.qty}</td><td>${formatCurrency(i.total || i.price * i.qty)}</td></tr>`).join('')}</tbody>
    </table>
    <p><strong>Total: ${formatCurrency(total)}</strong></p>
  `;
  printWindow(html);
}

function printMonthly() {
  const monthData = getSalesForMonth(currentYear, currentMonth);
  const total = monthData.reduce((s, { items }) => s + calcTotal(items), 0);
  let rows = '';
  monthData.forEach(({ dateKey, items }) => {
    items.forEach((i, idx) => {
      const dateCell = idx === 0 ? `<td rowspan="${items.length}">${formatDateShort(dateKey)}</td>` : '';
      rows += `<tr>${dateCell}<td>${escapeHtml(i.name)}</td><td>${formatCurrency(i.price)}</td><td>${i.qty}</td><td>${formatCurrency(i.total || i.price * i.qty)}</td></tr>`;
    });
  });
  const html = `
    <div class="print-header">
      <h2>Monthly Sales – ${formatMonth(currentYear, currentMonth)}</h2>
      <p>Printed on ${formatDate(new Date())}</p>
    </div>
    <table><thead><tr><th>Date</th><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
    <p><strong>Total for month: ${formatCurrency(total)}</strong></p>
  `;
  printWindow(html);
}

function printSelectedDay() {
  if (!selectedDateKey) return;
  const items = getSalesForDate(selectedDateKey);
  const total = calcTotal(items);
  const html = `
    <div class="print-header">
      <h2>Sales on ${formatDateShort(selectedDateKey)}</h2>
      <p>Printed on ${formatDate(new Date())}</p>
    </div>
    <table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
    <tbody>${items.map(i => `<tr><td>${escapeHtml(i.name)}</td><td>${formatCurrency(i.price)}</td><td>${i.qty}</td><td>${formatCurrency(i.total || i.price * i.qty)}</td></tr>`).join('')}</tbody>
    </table>
    <p><strong>Total: ${formatCurrency(total)}</strong></p>
  `;
  printWindow(html);
}

function printWindow(content) {
  const w = window.open('', '_blank');
  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head><title>Print - Store Sales</title>
    <style>
      body{padding:20px;font-family:Segoe UI,sans-serif;font-size:14px;}
      .print-header{margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:2px solid #333;}
      table{width:100%;border-collapse:collapse;margin:1rem 0;}
      th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd;}
      th{font-weight:600;background:#f5f5f5;}
      p{margin:0.5rem 0;}
    </style>
    </head>
    <body>${content}</body>
    </html>
  `);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 250);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  // Welcome overlay smooth transition
  const welcome = document.getElementById('welcomeOverlay');
  if (welcome) {
    setTimeout(() => {
      welcome.classList.add('fade-out');
      setTimeout(() => {
        welcome.classList.add('hidden');
        document.body.classList.add('welcome-done');
      }, 800);
    }, 2500);
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('prevMonth').addEventListener('click', () => {
    if (currentMonth === 0) { currentYear--; currentMonth = 11; } else currentMonth--;
    renderMonthly();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    if (currentMonth === 11) { currentYear++; currentMonth = 0; } else currentMonth++;
    renderMonthly();
  });

  document.getElementById('prevCalMonth').addEventListener('click', () => {
    if (calMonth === 0) { calYear--; calMonth = 11; } else calMonth--;
    renderCalendar();
  });
  document.getElementById('nextCalMonth').addEventListener('click', () => {
    if (calMonth === 11) { calYear++; calMonth = 0; } else calMonth++;
    renderCalendar();
  });

  renderAddForm();
  renderTodayList();
  renderMonthly();
  renderCalendar();
});
