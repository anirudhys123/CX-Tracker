// ============================================================
//  HARDCODED SUPABASE CREDENTIALS – Replace with your own
// ============================================================
const SUPABASE_URL = 'https://dgwdagwqhccxceqpwbsv.supabase.co';      // <-- CHANGE THIS
const SUPABASE_ANON_KEY = 'sb_publishable_4ppZPRbbipi079J3W5O6aQ_tiXhmcr6';   // <-- CHANGE THIS

// ============================================================
//  STATE
// ============================================================
const LEVELS = ['L1', 'L2', 'L3', 'L4'];
let activeLevel = 'L1';
let tableData = { L1: [], L2: [], L3: [], L4: [] };
let supabaseConfig = { url: SUPABASE_URL, key: SUPABASE_ANON_KEY }; // always use hardcoded

// Filter state
let currentPackageFilter = 'all';
let currentSearchTerm = '';

const COLUMNS = [
  { key: 'sno', label: 'S.No', type: 'sno', width: '52px' },
  { key: 'equipment_nomenclature', label: 'Equipment Nomenclature', type: 'text', width: '180px' },
  { key: 'package', label: 'Package', type: 'select', width: '110px', options: ['', 'HVAC', 'Electrical', 'ELV'] },
  { key: 'target_date', label: 'Target Date', type: 'date', width: '140px' },
  { key: 'actual_date', label: 'Actual Date', type: 'date', width: '140px' },
  { key: 'remarks', label: 'Remarks', type: 'text', width: '160px' },
  { key: 'site_progress', label: 'Site Progress', type: 'status', width: '120px' },
  { key: 'procure_submission', label: 'Procure Submission', type: 'status', width: '140px' },
  { key: 'procure_approval', label: 'Procure Approval', type: 'status', width: '140px' },
  { key: 'responsibility', label: 'Responsibility', type: 'text', width: '140px' },
  { key: '_del', label: '', type: 'del', width: '44px' },
];
const STATUS_OPTIONS = ['Pending', 'Completed'];

// ─── Init ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // No need to load stored config – we always use hardcoded values
  document.getElementById('db-status-label').textContent = 'Supabase';
  LEVELS.forEach(l => { buildTableHead(l); loadData(l); });
  updateStats();

  // Filter event listeners
  const packageSelect = document.getElementById('filter-package');
  const levelSelect = document.getElementById('filter-level');
  const searchInput = document.getElementById('filter-search');
  const clearBtn = document.getElementById('clear-filters');

  packageSelect?.addEventListener('change', (e) => {
    currentPackageFilter = e.target.value;
    refreshDisplay();
  });
  levelSelect?.addEventListener('change', (e) => {
    const selectedLevel = e.target.value;
    if (selectedLevel !== 'all') {
      const tabBtn = Array.from(document.querySelectorAll('.tab-btn')).find(
        btn => btn.getAttribute('onclick')?.includes(`'${selectedLevel}'`)
      );
      if (tabBtn) tabBtn.click();
      levelSelect.value = 'all';
    }
  });
  searchInput?.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value;
    refreshDisplay();
  });
  clearBtn?.addEventListener('click', () => {
    currentPackageFilter = 'all';
    currentSearchTerm = '';
    if (packageSelect) packageSelect.value = 'all';
    if (searchInput) searchInput.value = '';
    refreshDisplay();
    showToast('Filters cleared', 'info');
  });
});

// ─── Table header ───────────────────────────────────────────────────
function buildTableHead(level) {
  const tr = document.getElementById(`thead-${level}`);
  if (!tr) return;
  tr.innerHTML = '';
  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    if (col.type === 'sno') th.className = 'th-sno';
    th.style.minWidth = col.width;
    th.textContent = col.label;
    tr.appendChild(th);
  });
}

// ─── Add row ────────────────────────────────────────────────────────
function addRow(level) {
  const newId = Date.now() + Math.random() * 10000;
  const newRow = {
    _rid: newId,
    sno: tableData[level].length + 1,
    equipment_nomenclature: '',
    package: '',
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

// ─── Delete row ─────────────────────────────────────────────────────
function deleteRow(level, rid) {
  tableData[level] = tableData[level].filter(r => r._rid !== rid);
  refreshDisplay();
  updateStats();
  showToast('Row deleted', 'info');
}

// ─── Render filtered table (no re-render on edit) ───────────────────
function refreshDisplay() { applyFiltersAndRender(); }

function applyFiltersAndRender() {
  const level = activeLevel;
  const fullData = tableData[level] || [];
  let filtered = [...fullData];

  if (currentPackageFilter !== 'all') {
    filtered = filtered.filter(row => row.package === currentPackageFilter);
  }
  if (currentSearchTerm) {
    const term = currentSearchTerm.toLowerCase();
    filtered = filtered.filter(row =>
      (row.equipment_nomenclature && row.equipment_nomenclature.toLowerCase().includes(term)) ||
      (row.remarks && row.remarks.toLowerCase().includes(term))
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
    const displaySno = idx + 1;

    COLUMNS.forEach(col => {
      const td = document.createElement('td');

      if (col.type === 'sno') {
        td.className = 'td-sno';
        td.textContent = displaySno;
      } else if (col.type === 'del') {
        td.style.textAlign = 'center';
        const btn = document.createElement('button');
        btn.className = 'del-btn';
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M3 3l.5 7h5L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
        btn.onclick = () => deleteRow(level, row._rid);
        td.appendChild(btn);
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
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt || '— select —';
          if (row[col.key] === opt) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = (e) => { row[col.key] = e.target.value; };
        td.appendChild(sel);
      } else if (col.type === 'status') {
        const sel = document.createElement('select');
        sel.className = 'cell-input';
        STATUS_OPTIONS.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (row[col.key] === opt) o.selected = true;
          sel.appendChild(o);
        });
        sel.onchange = (e) => {
          row[col.key] = e.target.value;
          applyStatusColor(sel, e.target.value);
          updateStats();
        };
        applyStatusColor(sel, row[col.key]);
        td.appendChild(sel);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function applyStatusColor(el, val) {
  if (el) el.style.color = val === 'Completed' ? 'var(--accent-green)' : 'var(--accent-amber)';
}

// ─── Switch tab ────────────────────────────────────────────────────
function switchTab(level, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`panel-${level}`).classList.add('active');
  activeLevel = level;
  document.getElementById('stat-level').textContent = level;
  refreshDisplay();
}

// ─── Stats ──────────────────────────────────────────────────────────
function updateStats() {
  let total = 0, completed = 0, pending = 0;
  LEVELS.forEach(l => {
    const rows = tableData[l] || [];
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

// ─── Save / Load (always try Supabase first, fallback to local) ────
async function saveData(level) {
  if (supabaseConfig.url && supabaseConfig.key) {
    await saveToSupabase(level);
  } else {
    saveToLocalStorage(level);
    showToast('Saved to local storage', 'success');
  }
}

function saveToLocalStorage(level) {
  const clean = (tableData[level] || []).map(r => {
    const o = { ...r };
    delete o._rid;
    return o;
  });
  localStorage.setItem(`cx_tracker_${level}`, JSON.stringify(clean));
}

async function loadData(level) {
  if (supabaseConfig.url && supabaseConfig.key) {
    await loadFromSupabase(level);
  } else {
    loadFromLocalStorage(level);
  }
}

function loadFromLocalStorage(level) {
  try {
    const raw = localStorage.getItem(`cx_tracker_${level}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      tableData[level] = parsed.map((r, i) => ({ ...r, _rid: i + 1 }));
      refreshDisplay();
    }
  } catch (e) { console.warn(e); }
}

// ─── Supabase integration (using hardcoded credentials) ────────────
async function saveToSupabase(level) {
  const btn = document.querySelector(`#panel-${level} .bottom-bar .btn-primary`);
  if (!btn) return;
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="spinner"></span> Saving...';
  btn.disabled = true;
  try {
    const { url, key } = supabaseConfig;
    await fetch(`${url}/rest/v1/cx_tracker?level=eq.${level}`, {
      method: 'DELETE', headers: sbHeaders(key)
    });
    const rows = (tableData[level] || []).map(r => {
      const o = {};
      COLUMNS.forEach(c => {
        if (!['sno', '_del', '_rid'].includes(c.key)) o[c.key] = r[c.key] || null;
      });
      o.sno = r.sno;
      o.level = level;
      return o;
    });
    if (rows.length) {
      const res = await fetch(`${url}/rest/v1/cx_tracker`, {
        method: 'POST', headers: { ...sbHeaders(key), 'Prefer': 'return=minimal' }, body: JSON.stringify(rows)
      });
      if (!res.ok) throw new Error(await res.text());
    }
    showToast(`${level} saved to Supabase`, 'success');
  } catch (e) { 
    console.error(e);
    showToast('Save failed, using local storage', 'error');
    saveToLocalStorage(level);
  }
  finally { btn.innerHTML = orig; btn.disabled = false; }
}

async function loadFromSupabase(level) {
  try {
    const { url, key } = supabaseConfig;
    const res = await fetch(`${url}/rest/v1/cx_tracker?level=eq.${level}&order=sno.asc`, { headers: sbHeaders(key) });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    tableData[level] = data.map((r, i) => ({ ...r, _rid: i + 1 }));
    refreshDisplay();
  } catch (e) { 
    console.warn(e);
    loadFromLocalStorage(level);
  }
}

function sbHeaders(key) {
  return { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// ─── Config modal is now optional – we keep it for override (optional) ──
// If you want to remove the modal entirely, just delete the modal HTML.
// The functions below are kept so the modal doesn't cause errors.
function openConfigModal() {
  showToast('Supabase is pre‑configured. No changes needed.', 'info');
}
function closeConfigModal() {}
function saveConfig() {}
function clearConfig() {}
function loadStoredConfig() {} // not used

// ─── Export CSV ────────────────────────────────────────────────────
function exportCSV() {
  const headers = COLUMNS.filter(c => c.type !== 'del').map(c => c.label);
  const rows = [];
  LEVELS.forEach(level => {
    (tableData[level] || []).forEach(row => {
      const r = COLUMNS.filter(c => c.type !== 'del').map(c => {
        if (c.type === 'sno') return row.sno;
        const v = row[c.key] || '';
        return `"${String(v).replace(/"/g, '""')}"`;
      });
      rows.push([`"${level}"`, ...r].join(','));
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

// ─── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✓', error: '✗', info: 'ⓘ' };
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}