(() => {
  'use strict';

  const STORAGE_KEY = 'catatan_uang.v1';
  const CATEGORIES = {
    expense: ['Makan & Minum', 'Transportasi', 'Belanja', 'Tagihan', 'Kesehatan', 'Hiburan', 'Pendidikan', 'Lainnya'],
    income: ['Gaji', 'Bonus', 'Usaha', 'Investasi', 'Hadiah', 'Lainnya'],
  };

  const $ = (id) => document.getElementById(id);
  const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const fmt = (n) => rupiah.format(n);

  // ---------- Penyimpanan ----------
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data.filter(isValidTx) : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      alert('Gagal menyimpan data. Penyimpanan browser mungkin penuh atau diblokir.');
    }
  }

  function isValidTx(t) {
    return t && typeof t.id === 'string'
      && (t.type === 'income' || t.type === 'expense')
      && Number.isFinite(t.amount) && t.amount > 0
      && /^\d{4}-\d{2}-\d{2}$/.test(t.date);
  }

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // ---------- State ----------
  let transactions = load();
  let editingId = null;

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ---------- Form ----------
  const form = $('txForm');
  const amountInput = $('amount');

  function currentType() {
    return form.querySelector('input[name="type"]:checked').value;
  }

  function fillCategories(type, selected) {
    $('category').innerHTML = CATEGORIES[type]
      .map((c) => `<option${c === selected ? ' selected' : ''}>${c}</option>`)
      .join('');
  }

  function parseAmount(str) {
    return Number(String(str).replace(/\D/g, ''));
  }

  amountInput.addEventListener('input', () => {
    const n = parseAmount(amountInput.value);
    amountInput.value = n ? n.toLocaleString('id-ID') : '';
  });

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') fillCategories(currentType());
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseAmount(amountInput.value);
    if (!amount) {
      amountInput.focus();
      return;
    }
    const tx = {
      id: editingId || newId(),
      type: currentType(),
      amount,
      date: $('date').value,
      category: $('category').value,
      note: $('note').value.trim(),
    };
    if (editingId) {
      transactions = transactions.map((t) => (t.id === editingId ? tx : t));
    } else {
      transactions.push(tx);
    }
    save();
    // Pindah ke bulan transaksi supaya langsung terlihat
    $('monthFilter').value = tx.date.slice(0, 7);
    resetForm();
    render();
  });

  function resetForm() {
    editingId = null;
    form.reset();
    $('date').value = today();
    fillCategories('expense');
    $('formTitle').textContent = 'Tambah Transaksi';
    $('submitBtn').textContent = 'Simpan';
    $('cancelEdit').hidden = true;
  }

  function startEdit(id) {
    const t = transactions.find((x) => x.id === id);
    if (!t) return;
    editingId = id;
    form.querySelector(`input[name="type"][value="${t.type}"]`).checked = true;
    fillCategories(t.type, t.category);
    amountInput.value = t.amount.toLocaleString('id-ID');
    $('date').value = t.date;
    $('note').value = t.note || '';
    $('formTitle').textContent = 'Ubah Transaksi';
    $('submitBtn').textContent = 'Perbarui';
    $('cancelEdit').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    amountInput.focus();
  }

  $('cancelEdit').addEventListener('click', resetForm);

  // ---------- Filter bulan ----------
  const monthFilter = $('monthFilter');

  function shiftMonth(delta) {
    const [y, m] = monthFilter.value.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    monthFilter.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    render();
  }

  $('prevMonth').addEventListener('click', () => shiftMonth(-1));
  $('nextMonth').addEventListener('click', () => shiftMonth(1));
  monthFilter.addEventListener('change', () => {
    if (!monthFilter.value) monthFilter.value = today().slice(0, 7);
    render();
  });
  $('search').addEventListener('input', render);

  // ---------- Render ----------
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  function render() {
    const month = monthFilter.value;
    const monthTx = transactions.filter((t) => t.date.startsWith(month));

    const sum = (list, type) => list.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0);
    const inc = sum(monthTx, 'income');
    const exp = sum(monthTx, 'expense');
    $('totalIncome').textContent = fmt(inc);
    $('totalExpense').textContent = fmt(exp);
    $('balance').textContent = fmt(inc - exp);
    $('allTimeBalance').textContent = fmt(sum(transactions, 'income') - sum(transactions, 'expense'));

    renderChart(monthTx);
    renderList(monthTx);
  }

  function renderChart(monthTx) {
    const totals = {};
    monthTx.filter((t) => t.type === 'expense').forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const chart = $('categoryChart');
    if (!rows.length) {
      chart.innerHTML = '<p class="empty">Belum ada pengeluaran.</p>';
      return;
    }
    const max = rows[0][1];
    const total = rows.reduce((a, r) => a + r[1], 0);
    chart.innerHTML = rows.map(([cat, val]) => `
      <div class="bar-row">
        <span>${escapeHtml(cat)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(val / max) * 100}%"></div></div>
        <span class="bar-value">${fmt(val)} · ${Math.round((val / total) * 100)}%</span>
      </div>`).join('');
  }

  function renderList(monthTx) {
    const q = $('search').value.trim().toLowerCase();
    const list = monthTx
      .filter((t) => !q || `${t.category} ${t.note}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    $('emptyState').hidden = list.length > 0;
    $('emptyState').textContent = q ? 'Tidak ada transaksi yang cocok.' : 'Belum ada transaksi di bulan ini.';

    let html = '';
    let lastDate = '';
    for (const t of list) {
      if (t.date !== lastDate) {
        const [y, m, d] = t.date.split('-').map(Number);
        html += `<li class="tx-day">${dayFmt.format(new Date(y, m - 1, d))}</li>`;
        lastDate = t.date;
      }
      const sign = t.type === 'income' ? '+' : '−';
      html += `
        <li class="tx">
          <div class="tx-main">
            <div class="tx-cat">${escapeHtml(t.category)}</div>
            ${t.note ? `<div class="tx-note">${escapeHtml(t.note)}</div>` : ''}
          </div>
          <span class="tx-amount ${t.type}">${sign}${fmt(t.amount)}</span>
          <div class="tx-btns">
            <button data-edit="${t.id}" aria-label="Ubah" title="Ubah">✎</button>
            <button data-del="${t.id}" aria-label="Hapus" title="Hapus">🗑</button>
          </div>
        </li>`;
    }
    $('txList').innerHTML = html;
  }

  $('txList').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.edit) startEdit(btn.dataset.edit);
    if (btn.dataset.del && confirm('Hapus transaksi ini?')) {
      transactions = transactions.filter((t) => t.id !== btn.dataset.del);
      if (editingId === btn.dataset.del) resetForm();
      save();
      render();
    }
  });

  // ---------- Ekspor / Impor ----------
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

  $('exportCsv').addEventListener('click', () => {
    const header = ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Jumlah'];
    const rows = [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [t.date, t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', t.category, t.note || '', t.amount]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    download(`catatan-uang-${today()}.csv`, '﻿' + csv, 'text/csv;charset=utf-8');
  });

  $('exportJson').addEventListener('click', () => {
    download(`catatan-uang-backup-${today()}.json`, JSON.stringify(transactions, null, 2), 'application/json');
  });

  $('importJson').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('format');
      const valid = data.filter(isValidTx);
      if (!valid.length) throw new Error('kosong');
      if (!confirm(`Pulihkan ${valid.length} transaksi? Data yang ada sekarang akan diganti.`)) return;
      transactions = valid;
      save();
      resetForm();
      render();
    } catch {
      alert('File cadangan tidak valid.');
    }
  });

  $('clearAll').addEventListener('click', () => {
    if (!transactions.length) return;
    if (!confirm('Hapus SEMUA transaksi? Tindakan ini tidak bisa dibatalkan.')) return;
    transactions = [];
    save();
    resetForm();
    render();
  });

  // ---------- Init ----------
  monthFilter.value = today().slice(0, 7);
  resetForm();
  render();
})();
