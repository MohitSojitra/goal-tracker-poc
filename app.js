/* ==========================================================
   GoalDocs — app.js
   Two-way binding between the editor panel and the live A4
   sheet, autosave to localStorage, JSON backup/import,
   and print-to-PDF export.
   ========================================================== */

(function () {
  'use strict';

  const STORE_KEY = 'goaldocs.v1';

  /* ---------------- default document ---------------- */
  const DEFAULTS = {
    doc: 'goal',
    g: {
      title: 'THE GDS',
      byline: 'BY GAUTAM NAGRECHA',
      goalLine: 'DIWALI 2026 GOAL',
      duration: '51 DAYS',
      target: '50000000/- TURNOVERS',
      actionLabel: 'ACTION',
      footer: 'IF THERE IS A WILL, THERE IS A WAY.',
      blocks: [
        { top: '25 (1 TO 1)', left: '3 CLIENT', right: '30000000/- TURNOVER' },
        { top: '110 CALL',    left: '2 CLIENT', right: '20000000/- TURNOVER' }
      ]
    },
    p: {
      title: 'ACTION PLAN FOR GOAL',
      subtitle: '31 OCTOBER 2026',
      goalLabel: 'GOAL',
      goalValue: '',
      actionLabel: 'ACTION',
      colNo: 'NO.',
      colTask: 'TASK',
      colDate: 'COMPLETE DATE',
      rows: Array.from({ length: 25 }, () => ({ task: '1 TO 1', date: '' }))
    }
  };

  /* placeholders shown inside empty editable sheet fields */
  const PLACEHOLDERS = {
    'g.title': 'TITLE',
    'g.byline': 'BY ...',
    'g.goalLine': 'GOAL LINE',
    'g.duration': 'DURATION',
    'g.target': 'TARGET',
    'g.actionLabel': 'ACTION',
    'g.footer': 'FOOTER QUOTE',
    'p.title': 'TITLE',
    'p.subtitle': 'SUBTITLE',
    'p.goalLabel': 'GOAL',
    'p.goalValue': 'write your goal…',
    'p.actionLabel': 'ACTION',
    'p.colNo': 'NO.',
    'p.colTask': 'TASK',
    'p.colDate': 'COMPLETE DATE'
  };

  let state = load();

  /* ---------------- tiny helpers ---------------- */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function getPath(path) {
    return path.split('.').reduce(
      (o, k) => (o == null ? undefined : o[/^\d+$/.test(k) ? Number(k) : k]),
      state
    );
  }

  function setPath(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    let o = state;
    for (const k of keys) o = o[/^\d+$/.test(k) ? Number(k) : k];
    o[/^\d+$/.test(last) ? Number(last) : last] = value;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return clone(DEFAULTS);
      const saved = JSON.parse(raw);
      // shallow-merge so new fields in DEFAULTS still appear
      return {
        doc: saved.doc || 'goal',
        g: Object.assign(clone(DEFAULTS.g), saved.g || {}),
        p: Object.assign(clone(DEFAULTS.p), saved.p || {})
      };
    } catch (e) {
      return clone(DEFAULTS);
    }
  }

  let saveTimer = null;
  let lastWrite = 0;

  function writeNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    lastWrite = Date.now();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      flashSaved();
    } catch (e) { /* storage may be unavailable — editing still works */ }
  }

  /* Debounced, but never starves: continuous typing still writes at
     least every 500ms, and anything pending is flushed on unload. */
  function save() {
    if (Date.now() - lastWrite > 500) { writeNow(); return; }
    if (saveTimer) return;
    saveTimer = setTimeout(writeNow, 250);
  }

  window.addEventListener('pagehide', () => { if (saveTimer) writeNow(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && saveTimer) writeNow();
  });

  let hintTimer = null;
  function flashSaved() {
    const hint = $('#saveHint');
    if (!hint) return;
    hint.textContent = 'Saved';
    hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hint.classList.remove('show'), 1200);
  }

  /* ---------------- syncing one value everywhere ---------------- */
  /* Updates every mirror of `path` EXCEPT the element being typed in,
     so the caret is never disturbed. */
  function syncPath(path, value, source) {
    $$('[data-bind="' + path + '"]').forEach(el => {
      if (el !== source && el.value !== value) el.value = value;
    });
    $$('[data-edit="' + path + '"]').forEach(el => {
      if (el !== source && el.textContent !== value) el.textContent = value;
    });
  }

  function commit(path, value, source) {
    setPath(path, value);
    syncPath(path, value, source);
    save();
  }

  /* ---------------- render: goal sheet action blocks ---------------- */
  function renderBlocks() {
    const sheet = $('#sheetBlocks');
    const list  = $('#blockList');
    sheet.innerHTML = '';
    list.innerHTML  = '';

    state.g.blocks.forEach((b, i) => {
      /* --- sheet side --- */
      const box = document.createElement('div');
      box.className = 'gs-block';
      box.innerHTML =
        '<div class="gs-block-top" contenteditable="true" data-edit="g.blocks.' + i + '.top"></div>' +
        '<div class="gs-block-bot">' +
          '<span class="left" contenteditable="true" data-edit="g.blocks.' + i + '.left"></span>' +
          '<span class="right" contenteditable="true" data-edit="g.blocks.' + i + '.right"></span>' +
        '</div>';
      $('.gs-block-top', box).textContent = b.top;
      $('.left', box).textContent  = b.left;
      $('.right', box).textContent = b.right;
      sheet.appendChild(box);

      /* --- panel side --- */
      const item = document.createElement('div');
      item.className = 'repeat-item';
      item.innerHTML =
        '<div class="repeat-head"><span>Block ' + (i + 1) + '</span>' +
        '<button class="del" data-del-block="' + i + '" title="Remove block">&times;</button></div>' +
        '<label>Heading <input type="text" data-bind="g.blocks.' + i + '.top" placeholder="25 (1 TO 1)"></label>' +
        '<label>Left note <input type="text" data-bind="g.blocks.' + i + '.left" placeholder="3 CLIENT"></label>' +
        '<label>Right note <input type="text" data-bind="g.blocks.' + i + '.right" placeholder="30000000/- TURNOVER"></label>';
      $('[data-bind$=".top"]', item).value   = b.top;
      $('[data-bind$=".left"]', item).value  = b.left;
      $('[data-bind$=".right"]', item).value = b.right;
      list.appendChild(item);
    });
  }

  /* ---------------- render: action plan rows ---------------- */
  function renderRows() {
    const body = $('#sheetRows');
    const list = $('#rowList');
    body.innerHTML = '';
    list.innerHTML = '';

    state.p.rows.forEach((r, i) => {
      /* --- sheet side --- */
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="t-no">' + (i + 1) + '</td>' +
        '<td class="t-task" contenteditable="true" data-edit="p.rows.' + i + '.task"></td>' +
        '<td class="t-date" contenteditable="true" data-edit="p.rows.' + i + '.date"></td>';
      $('.t-task', tr).textContent = r.task;
      $('.t-date', tr).textContent = r.date;
      body.appendChild(tr);

      /* --- panel side --- */
      const item = document.createElement('div');
      item.className = 'row-item';
      item.innerHTML =
        '<span class="rn">' + (i + 1) + '</span>' +
        '<input type="text" data-bind="p.rows.' + i + '.task" placeholder="Task">' +
        '<input type="text" data-bind="p.rows.' + i + '.date" placeholder="Date">' +
        '<button class="del" data-del-row="' + i + '" title="Remove row">&times;</button>';
      const inputs = $$('input', item);
      inputs[0].value = r.task;
      inputs[1].value = r.date;
      list.appendChild(item);
    });

    $('#rowCount').value = state.p.rows.length;
  }

  /* ---------------- render: static fields ---------------- */
  function renderStatic() {
    Object.keys(PLACEHOLDERS).forEach(path => {
      $$('[data-edit="' + path + '"]').forEach(el => el.setAttribute('data-ph', PLACEHOLDERS[path]));
    });

    $$('[data-bind]').forEach(el => {
      const p = el.getAttribute('data-bind');
      if (p.indexOf('blocks.') > -1 || p.indexOf('rows.') > -1) return;
      const v = getPath(p);
      if (v !== undefined) el.value = v;
    });

    $$('[data-edit]').forEach(el => {
      const p = el.getAttribute('data-edit');
      if (p.indexOf('blocks.') > -1 || p.indexOf('rows.') > -1) return;
      const v = getPath(p);
      if (v !== undefined) el.textContent = v;
    });
  }

  function renderAll() {
    renderStatic();
    renderBlocks();
    renderRows();
    showDoc(state.doc);
  }

  /* ---------------- document switching ---------------- */
  function showDoc(which) {
    state.doc = which;
    $('#sheet-goal').classList.toggle('hidden', which !== 'goal');
    $('#sheet-plan').classList.toggle('hidden', which !== 'plan');
    $('#form-goal').classList.toggle('hidden', which !== 'goal');
    $('#form-plan').classList.toggle('hidden', which !== 'plan');
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.doc === which));
    save();
  }

  /* ---------------- zoom ---------------- */
  let zoom = 1;
  function applyZoom() {
    const scaler = $('#scaler');
    scaler.style.transform = 'scale(' + zoom + ')';
    /* keep the scroll box the right height for the scaled sheet */
    scaler.style.height = zoom === 1 ? '' : (297 * zoom) + 'mm';
    $('#zoomLabel').textContent = Math.round(zoom * 100) + '%';
  }
  function fitZoom() {
    const avail = $('#preview').clientWidth - 60;
    const sheetPx = 210 * 96 / 25.4; /* A4 width in CSS px */
    zoom = Math.min(1, Math.max(0.3, avail / sheetPx));
    applyZoom();
  }

  /* ---------------- events ---------------- */

  /* panel inputs -> state -> sheet */
  document.addEventListener('input', e => {
    const el = e.target;
    const path = el.getAttribute && el.getAttribute('data-bind');
    if (!path) return;
    commit(path, el.value, el);
  });

  /* sheet contenteditable -> state -> panel */
  document.addEventListener('input', e => {
    const el = e.target;
    const path = el.getAttribute && el.getAttribute('data-edit');
    if (!path) return;
    commit(path, el.textContent.replace(/ /g, ' ').trim(), el);
  });

  /* keep pasted content plain, and stop Enter making <div>s */
  document.addEventListener('paste', e => {
    if (!e.target.getAttribute || !e.target.getAttribute('data-edit')) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  });

  document.addEventListener('keydown', e => {
    if (e.target.getAttribute && e.target.getAttribute('data-edit') && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
    /* Cmd/Ctrl + P -> our export (same thing, but keeps zoom reset tidy) */
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      exportPdf();
    }
  });

  /* tabs */
  $$('.tab').forEach(t => t.addEventListener('click', () => showDoc(t.dataset.doc)));

  /* add / remove blocks */
  $('#addBlock').addEventListener('click', () => {
    state.g.blocks.push({ top: '', left: '', right: '' });
    renderBlocks();
    save();
  });

  $('#blockList').addEventListener('click', e => {
    const btn = e.target.closest('[data-del-block]');
    if (!btn) return;
    state.g.blocks.splice(Number(btn.dataset.delBlock), 1);
    renderBlocks();
    save();
  });

  /* add / remove rows */
  $('#addRow').addEventListener('click', () => {
    state.p.rows.push({ task: '', date: '' });
    renderRows();
    save();
  });

  $('#rowList').addEventListener('click', e => {
    const btn = e.target.closest('[data-del-row]');
    if (!btn) return;
    state.p.rows.splice(Number(btn.dataset.delRow), 1);
    renderRows();
    save();
  });

  $('#rowCount').addEventListener('change', e => {
    let n = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 1));
    const rows = state.p.rows;
    while (rows.length > n) rows.pop();
    while (rows.length < n) rows.push({ task: '', date: '' });
    renderRows();
    save();
  });

  $('#fillDefault').addEventListener('click', () => {
    state.p.rows.forEach(r => { if (!r.task) r.task = '1 TO 1'; });
    renderRows();
    save();
  });

  /* backup / import / reset */
  $('#btnSave').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'goaldocs-backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  $('#btnLoad').addEventListener('click', () => $('#fileInput').click());

  $('#fileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incoming = JSON.parse(reader.result);
        state = {
          doc: incoming.doc || 'goal',
          g: Object.assign(clone(DEFAULTS.g), incoming.g || {}),
          p: Object.assign(clone(DEFAULTS.p), incoming.p || {})
        };
        renderAll();
        save();
      } catch (err) {
        alert('That file could not be read as a GoalDocs backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#btnReset').addEventListener('click', () => {
    if (!confirm('Reset this document back to the blank template?')) return;
    const keep = state.doc;
    state[keep] = clone(DEFAULTS[keep]);
    renderAll();
    save();
  });

  /* zoom controls */
  $('#zoomIn').addEventListener('click', () => { zoom = Math.min(1.6, zoom + 0.1); applyZoom(); });
  $('#zoomOut').addEventListener('click', () => { zoom = Math.max(0.3, zoom - 0.1); applyZoom(); });
  $('#zoomFit').addEventListener('click', fitZoom);
  window.addEventListener('resize', () => { if (window.innerWidth < 1400) fitZoom(); });

  /* ---------------- PDF export ---------------- */
  function exportPdf() {
    const prev = zoom;
    zoom = 1;
    applyZoom();
    /* let layout settle at 100% before the print dialog snapshots the page */
    setTimeout(() => {
      window.print();
      zoom = prev;
      applyZoom();
    }, 60);
  }

  $('#btnPdf').addEventListener('click', exportPdf);

  /* ---------------- boot ---------------- */
  renderAll();
  fitZoom();
})();
