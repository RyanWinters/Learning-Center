/* Glossary auto-linker and the term popover (desktop) / bottom sheet (phone). */
(function () {
  const LC = window.LC = window.LC || {};
  const esc = s => LC.ui.esc(s);
  const SKIP = 'a, button, code, pre, h1, h2, input, textarea, select, .no-gloss, svg, script, style';
  const BLOCK = 'p, li, td, th, dd, dt, figcaption, h3, h4, summary, blockquote, .callout-body, .q-text, .opt-text, .gl-def';
  let re = null, owner = null;

  function rebuild() {
    owner = {};
    const list = [];
    Object.keys(LC.terms).forEach(id => {
      const t = LC.terms[id];
      [t.term].concat(t.aliases || []).forEach(a => { if (a && !(a in owner)) { owner[a] = id; list.push(a); } });
    });
    list.sort((a, b) => b.length - a.length);
    re = list.length ? new RegExp('(?<![\\w-])(?:' + list.map(a => a.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')).join('|') + ')(?![\\w-])', 'g') : null;
    LC._glDirty = false;
  }

  /* Wrap the first occurrence of each term, per block element, in a button. */
  function link(root, opts) {
    if (!root) return;
    if (LC._glDirty || !re) rebuild();
    if (!re) return;
    const exclude = (opts && opts.exclude) || null;
    const seen = new Map();
    const mark = (blk, id) => { let s = seen.get(blk); if (!s) seen.set(blk, s = new Set()); s.add(id); };
    const blockOf = n => (n.parentElement && n.parentElement.closest(BLOCK)) || root;
    root.querySelectorAll('.gl').forEach(b => mark(blockOf(b), b.dataset.term));

    const nodes = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.nodeValue.trim() && !(n.parentElement && n.parentElement.closest(SKIP))) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    while (w.nextNode()) nodes.push(w.currentNode);

    nodes.forEach(node => {
      const text = node.nodeValue;
      re.lastIndex = 0;
      let m, last = 0, frag = null;
      const blk = blockOf(node);
      while ((m = re.exec(text))) {
        const id = owner[m[0]];
        if (!id || (exclude && exclude.has(id))) continue;
        let s = seen.get(blk); if (s && s.has(id)) continue;
        mark(blk, id);
        frag = frag || document.createDocumentFragment();
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'gl'; b.dataset.term = id; b.textContent = m[0];
        frag.appendChild(b);
        last = m.index + m[0].length;
      }
      if (frag) {
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }
  LC.glossaryLink = link;

  /* ---- popover ---- */
  let pop = null, stack = [], opener = null, anchor = null, backdrop = null, eliOpen = false;
  const isPhone = () => window.matchMedia('(max-width: 640px)').matches;

  function content(id) {
    const t = LC.terms[id];
    const lesson = t.lesson && LC.index[t.lesson];
    return '<div class="pop-head">' +
      (stack.length > 1 ? '<button type="button" class="icon-btn" data-pop-back aria-label="Back">' + LC.ui.icon('left', 18) + '</button>' : '') +
      '<span class="eyebrow">Glossary</span><button type="button" class="icon-btn pop-x" data-pop-close aria-label="Close">' + LC.ui.icon('x', 18) + '</button></div>' +
      '<h3 class="pop-term">' + esc(t.term) + '</h3>' +
      '<p class="pop-def gl-def">' + esc(t.def) + '</p>' +
      (t.eli5 ? '<div class="pop-eli"><button type="button" class="seg-btn" data-pop-eli aria-expanded="' + eliOpen + '">' + LC.ui.icon('spark', 15) + ' ELI5</button><p class="pop-eli-text" ' + (eliOpen ? '' : 'hidden') + '>' + esc(t.eli5) + '</p></div>' : '') +
      '<div class="pop-links">' + (lesson ? '<a href="#/lesson/' + t.lesson + '">Learn it in: <strong>' + esc(lesson.title) + '</strong>' + LC.ui.icon('right', 16) + '</a>' : '') +
      '<a href="#/glossary/' + esc(id) + '">Open glossary' + LC.ui.icon('book', 16) + '</a></div>';
  }
  function paint() {
    const id = stack[stack.length - 1];
    pop.setAttribute('aria-label', 'Glossary: ' + LC.terms[id].term);
    pop.innerHTML = content(id);
    link(pop.querySelector('.pop-def'), { exclude: new Set([id]) });
  }
  function place() {
    if (!pop || isPhone() || !anchor || !document.contains(anchor)) return;
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8);
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function open(id, from) {
    if (!LC.terms[id]) return;
    const inside = pop && from && pop.contains(from);
    if (!inside) { close(true); stack = []; eliOpen = false; opener = from || document.activeElement; anchor = from; }
    if (!pop) {
      pop = document.createElement('div');
      pop.className = 'pop' + (isPhone() ? ' is-sheet' : '');
      pop.setAttribute('role', 'dialog'); pop.tabIndex = -1;
      if (isPhone()) {
        backdrop = document.createElement('div'); backdrop.className = 'pop-backdrop';
        document.body.appendChild(backdrop);
      }
      document.body.appendChild(pop);
      requestAnimationFrame(() => pop && pop.classList.add('in'));
    }
    stack.push(id);
    paint(); place();
    pop.focus({ preventScroll: true });
  }
  function close(silent) {
    if (!pop) return;
    pop.remove(); if (backdrop) backdrop.remove();
    pop = null; backdrop = null; stack = [];
    if (!silent && opener && document.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
  }
  LC.glossaryOpen = open;
  LC.glossaryClose = close;

  document.addEventListener('click', e => {
    const gl = e.target.closest('[data-term]');
    if (gl && !gl.closest('.pop-links')) { e.preventDefault(); open(gl.dataset.term, gl); return; }
    if (!pop) return;
    if (e.target.closest('[data-pop-close]')) { close(); return; }
    if (e.target.closest('[data-pop-back]')) { stack.pop(); paint(); place(); return; }
    if (e.target.closest('[data-pop-eli]')) { eliOpen = !eliOpen; paint(); return; }
    if (e.target.closest('.pop-links a')) { close(true); return; }
    if (!pop.contains(e.target)) close();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop) { e.stopPropagation(); close(); } }, true);
  window.addEventListener('hashchange', () => close(true));
  window.addEventListener('resize', () => { if (pop) { const s = stack.slice(); const a = anchor; close(true); stack = []; open(s[s.length - 1], a); } });
  window.addEventListener('scroll', () => { place(); }, true);
})();
