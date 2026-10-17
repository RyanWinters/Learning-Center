/* Lesson reader. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;
  const RES_LABEL = { docs: 'Documentation', video: 'Video', forum: 'Forum', course: 'Courses', article: 'Articles', standard: 'Standards', book: 'Books', tool: 'Tools' };
  const RES_ORDER = ['docs', 'standard', 'video', 'course', 'article', 'forum', 'book', 'tool'];

  function head(m, tr) {
    return '<div class="lhead"><a class="icon-btn" href="#/track/' + m.track + '" aria-label="Back to ' + esc(tr.title) + '">' + icon('left', 22) + '</a>' +
      '<span class="mono-tag">' + esc(tr.code) + '</span><span class="lhead-title">' + esc(m.title) + '</span><div class="lprog" aria-hidden="true"><i></i></div></div>';
  }

  function prereqStrip(m) {
    if (!m.prereqs.length) return '';
    return '<div class="prereqs"><span class="eyebrow">Builds on</span>' + m.prereqs.map(p => {
      const pm = LC.index[p]; if (!pm) return '';
      const st = LC.graph.status(p);
      return '<a class="pchip st-' + st + '" href="#/lesson/' + p + '">' + U.statusIcon(st) + '<span>' + esc(pm.title) + '</span></a>';
    }).join('') + '</div>';
  }

  /* ---- gates ---- */
  function renderSoon(root, m, tr) {
    const unmet = LC.graph.unmet(m.id);
    root.innerHTML = head(m, tr) + '<div class="l-col"><div class="empty soon"><div class="empty-ic">' + icon('clock', 36) + '</div><p class="eyebrow">Coming soon</p><h1>' + esc(m.title) + '</h1>' +
      '<p class="muted">This lesson has not been written yet. It sits in ' + esc(tr.code) + ' ' + esc(tr.title) + ' at level ' + m.level + ', about ' + m.minutes + ' minutes.</p>' +
      (m.prereqs.length ? '<div class="soon-pre">' + prereqStrip(m) + '</div>' : '') +
      '<div class="empty-actions"><a class="btn" href="#/track/' + m.track + '">Back to track</a></div></div></div>';
  }
  function renderGate(root, m, tr, onRead) {
    const unmet = LC.graph.unmet(m.id);
    root.innerHTML = head(m, tr) + '<div class="l-col"><div class="gate"><div class="empty-ic">' + icon('lock', 32) + '</div><p class="eyebrow">Suggested order</p><h1>' + esc(m.title) + '</h1>' +
      '<p class="muted">This builds on lessons you have not finished. You can still read it.</p>' +
      '<p class="needs-line"><b>Needs:</b> ' + unmet.map(u => '<a href="#/lesson/' + u + '">' + esc(LC.index[u].title) + '</a>').join(', ') + '</p>' +
      '<div class="gate-actions"><a class="btn btn-primary" href="#/lesson/' + unmet[0] + '">Open ' + (unmet.length > 1 ? 'the first one' : 'it') + icon('right', 16) + '</a>' +
      '<button type="button" class="btn" data-known>I already know ' + (unmet.length > 1 ? 'these' : 'this') + '</button>' +
      '<button type="button" class="btn btn-ghost" data-anyway>Read anyway</button></div></div></div>';
    root.querySelector('[data-known]').addEventListener('click', () => { LC.graph.skip(unmet); LC.rerender(); });
    root.querySelector('[data-anyway]').addEventListener('click', () => { LC.graph.readAnyway.add(m.id); onRead(); });
  }

  /* ---- reader ---- */
  function renderLesson(root, p, L, m, tr) {
    const id = m.id;
    let mode = LC.store.get().settings.eli5Default ? 'eli5' : 'full';
    let bodyOpen = mode === 'full';
    LC.graph.markStarted(id);

    const ctx = { diagrams: L.diagrams || {} };
    const md = s => LC.md.render(s, ctx);
    const track = LC.graph.lessonsIn(m.track), at = track.indexOf(id);
    const prev = at > 0 ? track[at - 1] : null, nextId = at < track.length - 1 ? track[at + 1] : null;

    function statusBlock() {
      const st = LC.graph.status(id), r = LC.store.lesson(id);
      return U.chip(st) + (st === 'skipped' ? ' <button type="button" class="linkbtn" data-unskip>Undo skip</button>' : '') +
        (st === 'tested-out' ? '<span class="muted small"> Scored ' + r.bestScore + '% cold</span>' : '');
    }
    function actionsBlock() {
      const st = LC.graph.status(id);
      if (st === 'complete' || st === 'tested-out') return '';
      if (st === 'skipped') return '';
      return '<button type="button" class="btn btn-sm" data-skip>' + icon('skip', 16) + 'I already know this</button><a class="btn btn-sm" href="#/lesson/' + id + '/testout">' + icon('target', 16) + 'Test out</a>';
    }
    function ctaBlock() {
      const r = LC.store.lesson(id), st = LC.graph.status(id), qn = (L.quiz || []).length;
      const read = !!r.readAt, passed = r.quizPassed || (r.bestScore || 0) >= LC.quiz.PASS;
      const done = st === 'complete' || st === 'tested-out';
      const step = (ok, label, extra) => '<li class="' + (ok ? 'ok' : '') + '"><span class="step-ic">' + (ok ? icon('check', 14) : '') + '</span><span class="step-t">' + label + '</span>' + (extra || '') + '</li>';
      return '<h2 class="cta-title">' + (done ? 'Lesson ' + (st === 'tested-out' ? 'tested out' : 'complete') : 'Finish this lesson') + '</h2>' +
        (st === 'skipped' ? '<p class="muted small">Marked as known. Complete it anyway to earn XP.</p>' : '') +
        '<ul class="steps">' + step(read || done, 'Read to the end', read || done ? '' : '<button type="button" class="linkbtn" data-markread>Mark as read</button>') +
        step(passed || done, 'Score ' + LC.quiz.PASS + '% or more on the quiz', r.bestScore != null ? '<span class="num muted small">best ' + r.bestScore + '%</span>' : '') + '</ul>' +
        '<div class="cta-actions">' + (qn ? '<a class="btn btn-primary" href="#/lesson/' + id + '/quiz">' + (r.attempts ? 'Retake quiz' : 'Take the quiz') + ' · ' + qn + ' questions' + icon('right', 16) + '</a>' : '') + '</div>';
    }

    const examples = (L.examples || []).map(e => '<details class="ex"><summary>' + icon('example', 18) + '<span>' + esc(e.title) + '</span>' + icon('down', 18) + '</summary><div class="prose">' + md(e.body) + '</div></details>').join('');
    const resources = (function () {
      const by = {};
      (L.resources || []).forEach(r => { (by[r.type] = by[r.type] || []).push(r); });
      return RES_ORDER.filter(t => by[t]).concat(Object.keys(by).filter(t => RES_ORDER.indexOf(t) < 0)).map(t =>
        '<div class="res-group"><h3>' + esc(RES_LABEL[t] || t) + '</h3><ul>' + by[t].map(r => '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer"><span class="res-t">' + esc(r.title) + '</span><span class="res-s">' + esc(r.source || '') + '</span>' + icon('external', 15) + '</a></li>').join('') + '</ul></div>').join('');
    })();
    const terms = (L.keyTerms || []).filter(t => LC.terms[t]);

    root.innerHTML = head(m, tr) +
      '<article class="l-col lesson" data-lesson="' + id + '">' +
      '<header class="ltitle"><p class="eyebrow">' + esc(tr.code) + ' · ' + esc(tr.title) + '</p><h1>' + esc(m.title) + '</h1><p class="lede">' + esc(L.summary || '') + '</p>' +
        '<div class="lmeta"><span>' + icon('clock', 16) + m.minutes + ' min</span><span>' + U.pips(m.level) + U.LEVEL_NAMES[m.level] + '</span><span id="l-status">' + statusBlock() + '</span></div>' +
        '<div class="lactions" id="l-actions">' + actionsBlock() + '</div></header>' +
      prereqStrip(m) +
      (L.objectives && L.objectives.length ? '<section class="objectives"><h2 class="label">You will be able to</h2><ul>' + L.objectives.map(o => '<li>' + LC.md.inline(o) + '</li>').join('') + '</ul></section>' : '') +
      '<div class="modebar"><div class="seg" role="group" aria-label="Reading mode"><button type="button" class="seg-btn" data-mode="full" aria-pressed="' + (mode === 'full') + '">Full lesson</button><button type="button" class="seg-btn" data-mode="eli5" aria-pressed="' + (mode === 'eli5') + '">' + icon('spark', 15) + 'ELI5</button></div></div>' +
      '<section class="eli5-panel" id="eli5" ' + (mode === 'eli5' ? '' : 'hidden') + '><p class="label">In plain words</p><div class="prose">' + md(L.eli5 || '') + '</div></section>' +
      '<button type="button" class="fold-btn" id="fold" ' + (mode === 'eli5' ? '' : 'hidden') + ' aria-expanded="false">' + icon('down', 18) + 'Read the full lesson</button>' +
      '<div id="bodyWrap" ' + (bodyOpen ? '' : 'hidden') + '>' +
        '<div class="prose" id="body">' + md(L.body) + '</div>' +
        (examples ? '<section class="sect"><h2 class="sect-h">Worked examples</h2>' + examples + '</section>' : '') +
        (L.why ? '<section class="why"><h2 class="sect-h">' + icon('why', 22) + 'Why it\'s done this way</h2><div class="prose">' + md(L.why) + '</div></section>' : '') +
        (L.history ? '<section class="sect history"><h2 class="sect-h">History</h2><div class="prose">' + md(L.history) + '</div></section>' : '') +
        (L.pitfalls && L.pitfalls.length ? '<section class="sect pitfalls"><h2 class="sect-h">Common pitfalls</h2><ul>' + L.pitfalls.map(x => '<li>' + icon('warning', 18) + '<span>' + LC.md.inline(x) + '</span></li>').join('') + '</ul></section>' : '') +
        '<div id="endMark" aria-hidden="true"></div>' +
      '</div>' +
      (terms.length ? '<section class="sect"><h2 class="sect-h">Key terms</h2><div class="term-chips">' + terms.map(t => '<button type="button" class="term-chip" data-term="' + esc(t) + '">' + esc(LC.terms[t].term) + '</button>').join('') + '</div></section>' : '') +
      '<section class="cta" id="l-cta">' + ctaBlock() + '</section>' +
      (resources ? '<section class="sect resources"><h2 class="sect-h">Go deeper</h2>' + resources + '</section>' : '') +
      '<nav class="pn" aria-label="Lesson order">' + (prev ? '<a class="pn-prev" href="#/lesson/' + prev + '"><span class="eyebrow">Previous</span><span>' + esc(LC.index[prev].title) + '</span></a>' : '<span></span>') +
        (nextId ? '<a class="pn-next" href="#/lesson/' + nextId + '"><span class="eyebrow">Next</span><span>' + esc(LC.index[nextId].title) + '</span></a>' : '<a class="pn-next" href="#/track/' + m.track + '"><span class="eyebrow">Track</span><span>Back to ' + esc(tr.code) + '</span></a>') + '</nav></article>';

    LC.glossaryLink(root.querySelector('.lesson'));

    /* dynamic regions */
    function refresh() {
      root.querySelector('#l-status').innerHTML = statusBlock();
      root.querySelector('#l-actions').innerHTML = actionsBlock();
      root.querySelector('#l-cta').innerHTML = ctaBlock();
      LC.glossaryLink(root.querySelector('#l-status'));
    }
    function apply() {
      root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
      root.querySelector('#eli5').hidden = mode !== 'eli5';
      root.querySelector('#fold').hidden = !(mode === 'eli5' && !bodyOpen);
      root.querySelector('#bodyWrap').hidden = !bodyOpen;
    }
    root.querySelector('.lesson').addEventListener('click', e => {
      const mb = e.target.closest('[data-mode]');
      if (mb) { mode = mb.dataset.mode; bodyOpen = mode === 'full'; apply(); return; }
      if (e.target.closest('#fold')) { bodyOpen = true; apply(); return; }
      if (e.target.closest('[data-skip]')) { LC.graph.skip([id]); refresh(); U.toast('<span class="toast-xp">Marked as known</span><span class="toast-sub">No XP. You can undo this here.</span>', 'info'); return; }
      if (e.target.closest('[data-unskip]')) { LC.graph.unskip(id); refresh(); return; }
      if (e.target.closest('[data-markread]')) { readNow(); return; }
    });

    /* Reading progress and end-of-lesson detection */
    const bar = root.querySelector('.lprog i'), art = root.querySelector('.lesson');
    let ticking = false, scrolled = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const r = art.getBoundingClientRect(), total = r.height - window.innerHeight;
        const pct = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
        bar.style.transform = 'scaleX(' + pct.toFixed(3) + ')';
        if (window.scrollY > 240) scrolled = true;
        const end = root.querySelector('#endMark');
        if (scrolled && bodyOpen && end && end.getBoundingClientRect().top < window.innerHeight - 40) readNow(true);
      });
    }
    function readNow(auto) {
      const r = LC.store.lesson(id);
      if (r.readAt) return;
      const xp = LC.quiz.markRead(id);
      refresh();
      if (!xp) U.toast('<span class="toast-xp">Marked as read</span>' + (LC.graph.status(id) !== 'complete' ? '<span class="toast-sub">Pass the quiz to complete it</span>' : ''), 'info');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    LC.onLeave(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); });
    onScroll();
  }

  LC.views.lesson = async function (root, p) {
    const id = p.id, m = LC.index[id];
    if (!m) { root.innerHTML = '<div class="page"><div class="empty"><h1>Unknown lesson</h1><p class="muted">No lesson called ' + esc(id) + '.</p><a class="btn" href="#/tracks">Browse tracks</a></div></div>'; return; }
    const tr = LC.trackById[m.track];
    root.innerHTML = head(m, tr) + '<div class="l-col"><div class="skeleton"><i></i><i></i><i></i></div></div>';
    const L = await LC.loadLesson(id);
    if (!p.alive()) return;
    if (!L) { renderSoon(root, m, tr); return; }
    const go = () => {
      if (LC.graph.status(id) === 'locked' && !LC.graph.readAnyway.has(id)) renderGate(root, m, tr, go);
      else renderLesson(root, p, L, m, tr);
      window.scrollTo(0, 0);
    };
    go();
  };
})();
