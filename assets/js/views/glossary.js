/* Glossary: A-Z list with filter and jump letters. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;

  LC.views.glossary = function (root, p) {
    const terms = Object.keys(LC.terms).map(k => LC.terms[k]).sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' }));
    const groups = {};
    terms.forEach(t => { const c = /[a-z]/i.test(t.term[0]) ? t.term[0].toUpperCase() : '#'; (groups[c] = groups[c] || []).push(t); });
    const letters = Object.keys(groups).sort();
    if (!terms.length) {
      root.innerHTML = '<div class="page"><header class="page-head"><p class="eyebrow">Reference</p><h1>Glossary</h1></header><div class="empty"><div class="empty-ic">' + icon('book', 36) + '</div><h2>No terms loaded yet</h2><p class="muted">Terms appear here as lessons are written.</p></div></div>';
      return;
    }
    root.innerHTML = '<div class="page"><header class="page-head"><p class="eyebrow">Reference</p><h1>Glossary</h1><p class="lede num">' + terms.length + ' terms. Tap any underlined word in a lesson to see it in context.</p></header>' +
      '<div class="gl-tools"><label class="field">' + icon('search', 18) + '<input type="search" id="glq" placeholder="Filter terms" aria-label="Filter terms" autocomplete="off"></label>' +
      '<div class="letters" aria-label="Jump to letter">' + letters.map(l => '<a href="#" data-letter="' + l + '">' + l + '</a>').join('') + '</div></div>' +
      '<div id="glist">' + letters.map(l => '<section class="gl-group" data-g="' + l + '" id="g-' + (l === '#' ? 'num' : l) + '"><h2 class="gl-letter">' + l + '</h2>' + groups[l].map(t => {
        const lm = t.lesson && LC.index[t.lesson];
        return '<article class="gl-entry" id="t-' + esc(t.id) + '" data-q="' + esc((t.term + ' ' + (t.aliases || []).join(' ') + ' ' + t.def).toLowerCase()) + '"><h3>' + esc(t.term) + '</h3><p class="gl-def">' + esc(t.def) + '</p>' +
          (t.eli5 ? '<p class="gl-eli"><span class="eyebrow">Plain words</span> ' + esc(t.eli5) + '</p>' : '') +
          (lm ? '<a class="gl-learn" href="#/lesson/' + t.lesson + '">Learn it in ' + esc(lm.title) + icon('right', 15) + '</a>' : '') + '</article>';
      }).join('') + '</section>').join('') + '</div><p class="empty empty-sm" id="glnone" hidden>No terms match.</p></div>';

    const list = root.querySelector('#glist');
    list.querySelectorAll('.gl-def').forEach(d => LC.glossaryLink(d, { exclude: new Set([d.parentElement.id.slice(2)]) }));
    const q = root.querySelector('#glq'), none = root.querySelector('#glnone');
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase(); let any = false;
      list.querySelectorAll('.gl-entry').forEach(e => { const hit = !v || e.dataset.q.indexOf(v) >= 0; e.hidden = !hit; if (hit) any = true; });
      list.querySelectorAll('.gl-group').forEach(g => { g.hidden = !g.querySelector('.gl-entry:not([hidden])'); });
      none.hidden = any;
    });
    root.querySelector('.letters').addEventListener('click', e => {
      const a = e.target.closest('[data-letter]'); if (!a) return;
      e.preventDefault();
      const g = root.querySelector('[data-g="' + a.dataset.letter + '"]');
      if (g) { q.value = ''; q.dispatchEvent(new Event('input')); g.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
    });
    if (p.id) {
      const el = root.querySelector('#t-' + CSS.escape(p.id));
      if (el) requestAnimationFrame(() => { el.classList.add('is-target'); el.scrollIntoView({ block: 'center' }); });
    }
  };
})();
