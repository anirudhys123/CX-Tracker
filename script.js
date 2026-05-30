// ============================================================
//  SUPABASE CREDENTIALS (replace with your own if needed)
// ============================================================
const SUPABASE_URL = 'https://dgwdagwqhccxceqpwbsv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4ppZPRbbipi079J3W5O6aQ_tiXhmcr6';

// ============================================================
//  STATE
// ============================================================
const LEVELS = ['L1', 'L2', 'L3', 'L4'];
let activeLevel = 'L1';
let tableData = { L1: [], L2: [], L3: [], L4: [] };
let supabaseConfig = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
let currentPackageFilter = 'all';
let currentFloorFilter = 'all';
let currentSearchTerm = '';

const COLUMNS = [
  { key: 'sno', label: 'S.No', type: 'sno', width: '50px' },
  { key: 'equipment_nomenclature', label: 'Equipment Nomenclature', type: 'text', width: '180px' },
  { key: 'package', label: 'Package', type: 'select', width: '110px', options: ['', 'HVAC', 'Electrical', 'ELV'] },
  { key: 'floor', label: 'Floor', type: 'select', width: '80px', options: ['', '07', '08'] },
  { key: 'target_date', label: 'Target Date', type: 'date', width: '130px' },
  { key: 'actual_date', label: 'Actual Date', type: 'date', width: '130px' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', width: '240px' },
  { key: 'site_progress', label: 'Site Progress', type: 'status', width: '120px' },
  { key: 'procure_submission', label: 'Procure Submission', type: 'status', width: '140px' },
  { key: 'procure_approval', label: 'Procure Approval', type: 'status', width: '140px' },
  { key: 'responsibility', label: 'Responsibility', type: 'text', width: '140px' },
  { key: '_del', label: '', type: 'del', width: '40px' }
];
const STATUS_OPTIONS = ['Pending', 'Completed'];

// ============================================================
//  HELPERS
// ============================================================
function buildTableHead(level) {
  const tr = document.getElementById(`thead-${level}`);
  if (!tr) return;
  tr.innerHTML = '';
  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.style.minWidth = col.width;
    th.textContent = col.label;
    tr.appendChild(th);
  });
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function updateStats() {
  let total = 0, completed = 0, pending = 0;
  LEVELS.forEach(level => {
    const rows = tableData[level] || [];
    total += rows.length;
    rows.forEach(r => {
      if (r.site_progress === 'Completed') completed++;
      else pending++;
    });
  });
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-pending').textContent = pending;
}

function refreshDisplay() {
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const level = activeLevel;
  let filtered = [...(tableData[level] || [])];
  if (currentPackageFilter !== 'all')
    filtered = filtered.filter(r => r.package === currentPackageFilter);
  if (currentFloorFilter !== 'all')
    filtered = filtered.filter(r => r.floor === currentFloorFilter);
  if (currentSearchTerm) {
    const term = currentSearchTerm.toLowerCase();
    filtered = filtered.filter(r =>
      (r.equipment_nomenclature || '').toLowerCase().includes(term) ||
      (r.remarks || '').toLowerCase().includes(term)
    );
  }
  renderFilteredTable(level, filtered);
}

function renderFilteredTable(level, filteredRows) {
  const tbody = document.getElementById(`tbody-${level}`);
  const emptyDiv = document.getElementById(`empty-${level}`);
  const countEl = document.getElementById(`rowcount-${level}`);
  const tabCount = document.getElementById(`count-${level}`);
  if (!tbody) return;

  const totalCount = tableData[level]?.length || 0;
  if (tabCount) tabCount.textContent = totalCount;
  if (countEl) countEl.textContent = `${filteredRows.length} record${filteredRows.length !== 1 ? 's' : ''}${filteredRows.length !== totalCount ? ' (filtered)' : ''}`;

  if (filteredRows.length === 0) {
    tbody.innerHTML = '';
    if (emptyDiv) emptyDiv.style.display = 'block';
    return;
  }
  if (emptyDiv) emptyDiv.style.display = 'none';
  tbody.innerHTML = '';

  filteredRows.forEach((row, idx) => {
    const tr = document.createElement('tr');
    COLUMNS.forEach(col => {
      const td = document.createElement('td');
      if (col.type === 'sno') {
        td.textContent = idx + 1;
      } else if (col.type === 'del') {
        const btn = document.createElement('button');
        btn.className = 'del-btn';
        btn.innerHTML = '🗑';
        btn.title = 'Delete row';
        btn.onclick = () => deleteRow(level, row._rid);
        td.appendChild(btn);
      } else if (col.key === 'remarks') {
        const textarea = document.createElement('textarea');
        textarea.className = 'cell-input remarks-textarea';
        textarea.rows = 2;
        textarea.placeholder = 'Add remarks (multi‑line)';
        textarea.value = row.remarks || '';
        textarea.oninput = (e) => { row.remarks = e.target.value; updateStats(); };
        td.appendChild(textarea);
      } else if (col.type === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'cell-input';
        inp.value = row[col.key] || '';
        inp.oninput = (e) => { row[col.key] = e.target.value; };
        td.appendChild(inp);
      } else if (col.type === 'date') {
        const inp = document.createElement('input');
        inp.type = 'date';
        inp.className = 'cell-input';
        inp.value = row[col.key] || '';
        inp.onchange = (e) => { row[col.key] = e.target.value; };
        td.appendChild(inp);
      } else if (col.type === 'select') {
        const sel = document.createElement('select');
        sel.className = 'cell-input';
        col.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt || '—';
          if (row[col.key] === opt) option.selected = true;
          sel.appendChild(option);
        });
        sel.onchange = (e) => { row[col.key] = e.target.value; };
        td.appendChild(sel);
      } else if (col.type === 'status') {
        const sel = document.createElement('select');
        sel.className = 'cell-input';
        STATUS_OPTIONS.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          if (row[col.key] === opt) option.selected = true;
          sel.appendChild(option);
        });
        sel.onchange = (e) => {
          row[col.key] = e.target.value;
          updateStats();
        };
        td.appendChild(sel);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ============================================================
//  CRUD
// ============================================================
function addRow(level) {
  const newId = Date.now() + Math.random();
  const newRow = {
    _rid: newId,
    sno: (tableData[level]?.length || 0) + 1,
    equipment_nomenclature: '',
    package: '',
    floor: '',
    target_date: '',
    actual_date: '',
    remarks: '',
    site_progress: 'Pending',
    procure_submission: 'Pending',
    procure_approval: 'Pending',
    responsibility: ''
  };
  tableData[level].push(newRow);
  refreshDisplay();
  updateStats();
  showToast(`New row added to ${level}`, 'success');
}

async function deleteRow(level, rid) {
  const row = tableData[level].find(r => r._rid === rid);
  if (!row) return;
  if (supabaseConfig.url && supabaseConfig.key && row.id) {
    try {
      await fetch(`${supabaseConfig.url}/rest/v1/cx_tracker?id=eq.${row.id}`, {
        method: 'DELETE',
        headers: sbHeaders(supabaseConfig.key)
      });
      showToast('Deleted from Supabase', 'success');
    } catch (e) {
      showToast('Supabase delete failed, removing locally', 'error');
    }
  }
  tableData[level] = tableData[level].filter(r => r._rid !== rid);
  refreshDisplay();
  updateStats();
  showToast('Row removed', 'info');
}

// ============================================================
//  SUPABASE & LOCALSTORAGE
// ============================================================
function sbHeaders(key) {
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

async function saveToSupabase(level) {
  const btn = document.querySelector(`#panel-${level} .bottom-bar .btn-primary`);
  if (btn) { btn.innerHTML = '<span class="spinner"></span> Saving...'; btn.disabled = true; }
  try {
    const { url, key } = supabaseConfig;
    await fetch(`${url}/rest/v1/cx_tracker?level=eq.${level}`, { method: 'DELETE', headers: sbHeaders(key) });
    const rowsToInsert = (tableData[level] || []).map(r => {
      const obj = {};
      COLUMNS.forEach(c => {
        if (!['sno', '_del', '_rid', 'id'].includes(c.key) && c.key !== '_del')
          obj[c.key] = r[c.key] !== undefined ? r[c.key] : null;
      });
      obj.sno = r.sno;
      obj.level = level;
      return obj;
    });
    if (rowsToInsert.length) {
      const res = await fetch(`${url}/rest/v1/cx_tracker`, {
        method: 'POST',
        headers: { ...sbHeaders(key), 'Prefer': 'return=representation' },
        body: JSON.stringify(rowsToInsert)
      });
      if (!res.ok) throw new Error(await res.text());
      const inserted = await res.json();
      inserted.forEach((ins, idx) => {
        if (tableData[level][idx]) tableData[level][idx].id = ins.id;
      });
    }
    showToast(`${level} saved to Supabase`, 'success');
  } catch (e) {
    console.error(e);
    saveToLocalStorage(level);
    showToast('Supabase failed → saved to Local Storage', 'error');
  } finally {
    if (btn) { btn.innerHTML = '💾 Save All'; btn.disabled = false; }
  }
}

function saveToLocalStorage(level) {
  const clean = (tableData[level] || []).map(r => {
    const { _rid, id, ...rest } = r;
    return rest;
  });
  localStorage.setItem(`cx_tracker_${level}`, JSON.stringify(clean));
  showToast(`${level} saved to Local Storage`, 'info');
}

async function loadFromSupabase(level) {
  try {
    const res = await fetch(`${supabaseConfig.url}/rest/v1/cx_tracker?level=eq.${level}&order=sno.asc`, {
      headers: sbHeaders(supabaseConfig.key)
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    tableData[level] = data.map((r, i) => ({ ...r, _rid: Date.now() + i + Math.random(), id: r.id }));
    refreshDisplay();
    updateStats();
  } catch (e) {
    console.warn(e);
    loadFromLocalStorage(level);
  }
}

function loadFromLocalStorage(level) {
  try {
    const raw = localStorage.getItem(`cx_tracker_${level}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      tableData[level] = parsed.map((r, i) => ({ ...r, _rid: Date.now() + i + Math.random() }));
      refreshDisplay();
      updateStats();
    }
  } catch (e) { console.warn(e); }
}

async function saveData(level) {
  if (supabaseConfig.url && supabaseConfig.key) await saveToSupabase(level);
  else saveToLocalStorage(level);
}

async function loadData(level) {
  if (supabaseConfig.url && supabaseConfig.key) await loadFromSupabase(level);
  else loadFromLocalStorage(level);
}

// ============================================================
//  UI ACTIONS
// ============================================================
function switchTab(level, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`panel-${level}`).classList.add('active');
  activeLevel = level;
  document.getElementById('stat-level').textContent = level;
  refreshDisplay();
}

function exportCSV() {
  const headers = COLUMNS.filter(c => c.type !== 'del').map(c => c.label);
  const rows = [];
  LEVELS.forEach(level => {
    (tableData[level] || []).forEach(row => {
      const cols = COLUMNS.filter(c => c.type !== 'del').map(c => {
        if (c.type === 'sno') return row.sno;
        let val = row[c.key] || '';
        if (c.key === 'remarks') val = val.replace(/\n/g, '\\n');
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      rows.push([`"${level}"`, ...cols].join(','));
    });
  });
  const csv = ['Level,' + headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cx_tracker_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('CSV exported', 'success');
}

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('db-status-label').textContent = 'Supabase';
  LEVELS.forEach(l => buildTableHead(l));
  for (const level of LEVELS) await loadData(level);

  // Filter listeners
  document.getElementById('filter-package')?.addEventListener('change', e => {
    currentPackageFilter = e.target.value;
    refreshDisplay();
  });
  document.getElementById('filter-floor')?.addEventListener('change', e => {
    currentFloorFilter = e.target.value;
    refreshDisplay();
  });
  document.getElementById('filter-level')?.addEventListener('change', e => {
    const lvl = e.target.value;
    if (lvl !== 'all') {
      const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(`'${lvl}'`));
      if (btn) btn.click();
      document.getElementById('filter-level').value = 'all';
    }
  });
  document.getElementById('filter-search')?.addEventListener('input', e => {
    currentSearchTerm = e.target.value;
    refreshDisplay();
  });
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    currentPackageFilter = 'all';
    currentFloorFilter = 'all';
    currentSearchTerm = '';
    document.getElementById('filter-package').value = 'all';
    document.getElementById('filter-floor').value = 'all';
    document.getElementById('filter-search').value = '';
    refreshDisplay();
    showToast('All filters cleared', 'info');
  });
});