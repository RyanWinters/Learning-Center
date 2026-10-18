/* UI helpers: escaping, icons, chips, toasts, sheets, shared list rows. */
(function () {
  const LC = window.LC = window.LC || {};
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);

  /* 24px grid, stroke icons (stroke set on the svg). */
  const P = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
    tracks: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    map: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 6h4c3 0 3 6 6 6M7 18h4c3 0 3-6 6-6"/>',
    lab: '<path d="M9 3h6M10 3v6l-5.5 9.5A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><path d="M7.5 15h9"/>',
    review: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5v-15z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    skip: '<path d="M5 5l9 7-9 7V5z"/><path d="M19 5v14"/>',
    flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6l1-8z"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tip: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    warning: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/>',
    note: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    example: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
    why: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    spark: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    half: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>',
    circle: '<circle cx="12" cy="12" r="8.5"/>',
    medal: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>',
    cloudoff: '<path d="M3 3l18 18"/><path d="M9 5.5A6 6 0 0 1 18 10a4 4 0 0 1 2.5 6.5M6.5 18H7a5 5 0 0 1-1-9.9"/>',
    cloud: '<path d="M7 18a5 5 0 0 1-1-9.9 6 6 0 0 1 11.6 1.4A4 4 0 0 1 17 18H7z"/>',
    layers: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/>',
    play: '<path d="M7 4l13 8-13 8V4z"/>',
    grid: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>',
    stack: '<rect x="4" y="13" width="16" height="6" rx="1"/><rect x="6" y="8" width="12" height="5" rx="1"/><rect x="8" y="3" width="8" height="5" rx="1"/>',
    cards: '<rect x="3" y="7" width="13" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5"/><path d="M5 20h14"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>'
  };
  function icon(name, size) {
    size = size || 20;
    return '<svg class="ic ic-' + name + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>';
  }

  /* Status vocabulary: always icon + label, never color alone. */
  const STATUS = {
    complete: { label: 'Done', icon: 'check', cls: 'ok' },
    'tested-out': { label: 'Tested out', icon: 'medal', cls: 'ok' },
    'in-progress': { label: 'In progress', icon: 'half', cls: 'warn' },
    skipped: { label: 'Marked known', icon: 'skip', cls: 'mute' },
    locked: { label: 'Locked', icon: 'lock', cls: 'mute' },
    available: { label: 'Ready', icon: 'circle', cls: 'accent' },
    soon: { label: 'Coming soon', icon: 'clock', cls: 'mute' }
  };
  function chip(status, small) {
    const s = STATUS[status] || STATUS.available;
    return '<span class="chip chip-' + s.cls + (small ? ' chip-sm' : '') + '">' + icon(s.icon, small ? 13 : 15) + '<span>' + s.label + '</span></span>';
  }
  function statusIcon(status) {
    const s = STATUS[status] || STATUS.available;
    return '<span class="sico sico-' + s.cls + '" title="' + s.label + '">' + icon(s.icon, 16) + '</span>';
  }
  /* Lesson difficulty, shown as L1-L4 so it is never confused with the XP level. */
  function pips(level) {
    const n = LEVEL_NAMES[level] || '';
    return '<span class="ltag l' + level + '" role="img" aria-label="Difficulty L' + level + ', ' + n + '" title="L' + level + ' · ' + n + '">L' + level + '</span>';
  }
  const LEVEL_NAMES = ['', 'Intro', 'Core', 'Advanced', 'Expert'];

  function ring(pct, size, stroke, inner) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.min(1, Math.max(0, pct)));
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px"><svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle class="ring-bg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle class="ring-fg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/></svg>' +
      '<div class="ring-in">' + (inner || '') + '</div></div>';
  }

  const isLab = id => /^build-/.test(id);

  /* A lesson as a list row (not a card). */
  function lessonRow(id, o) {
    o = o || {};
    const m = LC.index[id]; if (!m) return '';
    const st = LC.graph.status(id);
    const soon = LC.missing[id];
    const unmet = st === 'locked' ? LC.graph.unmet(id) : [];
    let meta = '';
    if (o.track) meta += '<span class="mono-tag">' + esc(LC.trackById[m.track].code) + '</span>';
    meta += '<span>' + m.minutes + ' min</span>' + pips(m.level) + (isLab(id) ? '<span class="labchip">' + icon('lab', 12) + 'Lab</span>' : '');
    if (unmet.length) meta += '<span class="needs">Needs: ' + esc(unmet.slice(0, 2).map(u => LC.index[u].title).join(', ')) + (unmet.length > 2 ? ' +' + (unmet.length - 2) : '') + '</span>';
    const end = soon ? chip('soon', true) : (st === 'available' ? icon('chev', 18) : chip(st, true));
    return '<a class="lrow st-' + st + '" href="#/lesson/' + id + '">' + statusIcon(soon ? 'soon' : st) +
      '<span class="lrow-main"><span class="lrow-title">' + esc(m.title) + '</span><span class="lrow-meta">' + meta + '</span></span>' +
      '<span class="lrow-end">' + end + '</span></a>';
  }

  /* Toasts */
  function toast(html, kind, ms) {
    const box = document.getElementById('toasts'); if (!box) return;
    const t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    t.innerHTML = html;
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 260); }, ms || 2800);
  }

  /* Bottom sheet on phones, centred dialog on desktop. */
  const openSheets = new Set();
  function sheet(html, opts) {
    opts = opts || {};
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet-backdrop"></div><div class="sheet" role="dialog" aria-modal="true" tabindex="-1" aria-label="' + esc(opts.label || 'Dialog') + '"><div class="sheet-grab"></div>' + html + '</div>';
    document.body.appendChild(wrap);
    document.documentElement.classList.add('no-scroll');
    const box = wrap.querySelector('.sheet');
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      openSheets.delete(close);
      document.removeEventListener('keydown', key, true);
      wrap.classList.add('out');
      setTimeout(() => { wrap.remove(); if (!document.querySelector('.sheet-wrap')) document.documentElement.classList.remove('no-scroll'); }, 170);
      if (prev && prev.focus && document.contains(prev)) { try { prev.focus(); } catch (e) {} }
      if (opts.onClose) opts.onClose();
    }
    function key(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    document.addEventListener('keydown', key, true);
    wrap.querySelector('.sheet-backdrop').addEventListener('click', close);
    wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    openSheets.add(close);
    box.focus({ preventScroll: true });
    return { el: box, close: close };
  }
  window.addEventListener('hashchange', () => { Array.from(openSheets).forEach(f => f()); });

  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Late shift' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  function plural(n, w, p) { return n + ' ' + (n === 1 ? w : (p || w + 's')); }

  LC.ui = { esc: esc, icon: icon, chip: chip, statusIcon: statusIcon, pips: pips, ring: ring, lessonRow: lessonRow, toast: toast, sheet: sheet, isLab: isLab, greeting: greeting, plural: plural, STATUS: STATUS, LEVEL_NAMES: LEVEL_NAMES };
})();
