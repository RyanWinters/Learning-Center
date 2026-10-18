/* Lesson reader. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;
  const RES_LABEL = { docs: 'Documentation', video: 'Video', forum: 'Forum', course: 'Courses', article: 'Articles', standard: 'Standards', book: 'Books', tool: 'Tools' };
  const RES_ORDER = ['docs', 'standard', 'video', 'course', 'article', 'forum', 'book', 'tool'];
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFile = url => /^content\/files\//.test(url || '');

  function head(m, tr) {
    return '<div class="lhead"><a class="icon-btn" href="#/track/' + m.track + '" aria-label="Back to ' + esc(tr.title) + '">' + icon('left', 22) + '</a>' +
      '<span class="mono-tag">' + esc(tr.code) + '</span><span class="lhead-title">' + esc(m.title) + '</span>' +
      '<button type="button" class="lh-sec" data-sections hidden aria-label="Sections in this lesson">' + icon('list', 18) + '<span class="num" data-seccount></span></button>' +
      '<div class="lprog" aria-hidden="true"><i></i></div></div>';
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
    root.innerHTML = head(m, tr) + '<div class="l-col"><div class="empty soon"><div class="empty-ic">' + icon('clock', 36) + '</div><p class="eyebrow">Coming soon</p><h1>' + esc(m.title) + '</h1>' +
      '<p class="muted">This lesson has not been written yet. It sits in ' + esc(tr.code) + ' ' + esc(tr.title) + ' at difficulty L' + m.level + ' (' + U.LEVEL_NAMES[m.level] + '), about ' + m.minutes + ' minutes.</p>' +
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
    const checklist = Array.isArray(L.checklist) ? L.checklist : [];
    const lab = checklist.length > 0;
    const isBuild = U.isLab(id);

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
    function checkedCount() { const c = LC.store.lesson(id).checks || {}; return checklist.filter((_, i) => c[i]).length; }
    function ctaBlock() {
      const r = LC.store.lesson(id), st = LC.graph.status(id), qn = (L.quiz || []).length;
      const read = !!r.readAt, passed = r.quizPassed || (r.bestScore || 0) >= LC.quiz.PASS;
      const done = st === 'complete' || st === 'tested-out';
      const step = (ok, label, extra) => '<li class="' + (ok ? 'ok' : '') + '"><span class="step-ic">' + (ok ? icon('check', 14) : '') + '</span><span class="step-t">' + label + '</span>' + (extra || '') + '</li>';
      const nChecked = checkedCount(), allChecked = lab && nChecked === checklist.length;
      const first = lab
        ? step(allChecked || done, 'Check every lab step', '<span class="num muted small">' + nChecked + ' of ' + checklist.length + '</span>')
        : step(read || done, 'Read to the end', read || done ? '' : '<button type="button" class="linkbtn" data-markread>Mark as read</button>');
      const nm = lab ? 'Lab' : 'Lesson';
      return '<h2 class="cta-title">' + (done ? nm + ' ' + (st === 'tested-out' ? 'tested out' : 'complete') : 'Finish this ' + nm.toLowerCase()) + '</h2>' +
        (st === 'skipped' ? '<p class="muted small">Marked as known. Complete it anyway to earn XP.</p>' : '') +
        '<ul class="steps">' + first +
        step(passed || done, 'Score ' + LC.quiz.PASS + '% or more on the quiz', r.bestScore != null ? '<span class="num muted small">best ' + r.bestScore + '%</span>' : '') + '</ul>' +
        '<div class="cta-actions">' + (qn ? '<a class="btn btn-primary" href="#/lesson/' + id + '/quiz">' + (r.attempts ? 'Retake quiz' : 'Take the quiz') + ' · ' + qn + ' questions' + icon('right', 16) + '</a>' : '') + '</div>';
    }
    function checklistBlock() {
      const c = LC.store.lesson(id).checks || {};
      return '<h2 class="sect-h">' + icon('check', 24) + 'Lab checklist</h2><p class="muted small num" id="ckcount" aria-live="polite">' + checkedCount() + ' of ' + checklist.length + ' steps checked. Your ticks are saved.</p><ul class="checks">' +
        checklist.map((t, i) => '<li><label class="check"><input type="checkbox" data-check="' + i + '"' + (c[i] ? ' checked' : '') + '><span class="check-box" aria-hidden="true">' + icon('check', 14) + '</span><span class="check-t">' + LC.md.inline(t) + '</span></label></li>').join('') + '</ul>';
    }

    const examples = (L.examples || []).map(e => '<details class="ex"><summary>' + icon('example', 18) + '<span>' + esc(e.title) + '</span>' + icon('down', 18) + '</summary><div class="prose">' + md(e.body) + '</div></details>').join('');
    const resources = (function () {
      const by = {};
      (L.resources || []).forEach(r => { (by[r.type] = by[r.type] || []).push(r); });
      return RES_ORDER.filter(t => by[t]).concat(Object.keys(by).filter(t => RES_ORDER.indexOf(t) < 0)).map(t =>
        '<div class="res-group"><h3>' + esc(RES_LABEL[t] || t) + '</h3><ul>' + by[t].map(r => isFile(r.url)
          ? '<li><a class="dl" href="' + esc(r.url) + '" download><span class="res-t">' + esc(r.title) + '</span><span class="res-s">' + esc(r.source || 'Download') + '</span>' + icon('download', 15) + '</a></li>'
          : '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer"><span class="res-t">' + esc(r.title) + '</span><span class="res-s">' + esc(r.source || '') + '</span>' + icon('external', 15) + '</a></li>').join('') + '</ul></div>').join('');
    })();
    const terms = (L.keyTerms || []).filter(t => LC.terms[t]);

    root.innerHTML = head(m, tr) +
      '<div class="lwrap"><article class="l-col lesson" data-lesson="' + id + '">' +
      '<header class="ltitle"><p class="eyebrow">' + esc(tr.code) + ' · ' + esc(tr.title) + '</p><h1>' + esc(m.title) + '</h1><p class="lede">' + esc(L.summary || '') + '</p>' +
        '<div class="lmeta">' + (isBuild ? '<span class="labchip labchip-lg">' + icon('lab', 15) + 'Lab</span>' : '') + '<span>' + icon('clock', 16) + (isBuild ? 'About ' + m.minutes + ' min to build' : m.minutes + ' min') + '</span><span>' + U.pips(m.level) + U.LEVEL_NAMES[m.level] + '</span><span id="l-status">' + statusBlock() + '</span></div>' +
        '<div class="lactions" id="l-actions">' + actionsBlock() + '</div></header>' +
      prereqStrip(m) +
      (L.objectives && L.objectives.length ? '<section class="objectives"><h2 class="label">You will be able to</h2><ul>' + L.objectives.map(o => '<li>' + LC.md.inline(o) + '</li>').join('') + '</ul></section>' : '') +
      '<div class="modebar"><div class="seg" role="group" aria-label="Reading mode"><button type="button" class="seg-btn" data-mode="full" aria-pressed="' + (mode === 'full') + '">Full lesson</button><button type="button" class="seg-btn" data-mode="eli5" aria-pressed="' + (mode === 'eli5') + '">' + icon('spark', 15) + 'ELI5</button></div></div>' +
      '<section class="eli5-panel" id="eli5" ' + (mode === 'eli5' ? '' : 'hidden') + '><p class="label">In plain words</p><div class="prose">' + md(L.eli5 || '') + '</div></section>' +
      '<button type="button" class="fold-btn" id="fold" ' + (mode === 'eli5' ? '' : 'hidden') + ' aria-expanded="false">' + icon('down', 18) + 'Read the full lesson</button>' +
      '<div id="bodyWrap" ' + (bodyOpen ? '' : 'hidden') + '>' +
        '<div class="prose" id="body">' + md(L.body) + '</div>' +
        (examples ? '<section class="sect" id="sec-examples" data-sec="Worked examples"><h2 class="sect-h">Worked examples</h2>' + examples + '</section>' : '') +
        (L.why ? '<section class="why" id="sec-why" data-sec="Why it\'s done this way"><h2 class="sect-h">' + icon('why', 22) + 'Why it\'s done this way</h2><div class="prose">' + md(L.why) + '</div></section>' : '') +
        (L.history ? '<section class="sect history" id="sec-history" data-sec="History"><h2 class="sect-h">History</h2><div class="prose">' + md(L.history) + '</div></section>' : '') +
        (L.pitfalls && L.pitfalls.length ? '<section class="sect pitfalls" id="sec-pitfalls" data-sec="Common pitfalls"><h2 class="sect-h">Common pitfalls</h2><ul>' + L.pitfalls.map(x => '<li>' + icon('warning', 18) + '<span>' + LC.md.inline(x) + '</span></li>').join('') + '</ul></section>' : '') +
        '<div id="endMark" aria-hidden="true"></div>' +
      '</div>' +
      (lab ? '<section class="sect checklist" id="sec-checklist" data-sec="Lab checklist">' + checklistBlock() + '</section>' : '') +
      (terms.length ? '<section class="sect"><h2 class="sect-h">Key terms</h2><div class="term-chips">' + terms.map(t => '<button type="button" class="term-chip" data-term="' + esc(t) + '">' + esc(LC.terms[t].term) + '</button>').join('') + '</div></section>' : '') +
      '<section class="cta" id="l-cta" data-sec="' + (lab ? 'Finish the lab' : 'Quiz') + '">' + ctaBlock() + '</section>' +
      (resources ? '<section class="sect resources" id="sec-resources" data-sec="Go deeper"><h2 class="sect-h">Go deeper</h2>' + resources + '</section>' : '') +
      '<nav class="pn" aria-label="Lesson order">' + (prev ? '<a class="pn-prev" href="#/lesson/' + prev + '"><span class="eyebrow">Previous</span><span>' + esc(LC.index[prev].title) + '</span></a>' : '<span></span>') +
        (nextId ? '<a class="pn-next" href="#/lesson/' + nextId + '"><span class="eyebrow">Next</span><span>' + esc(LC.index[nextId].title) + '</span></a>' : '<a class="pn-next" href="#/track/' + m.track + '"><span class="eyebrow">Track</span><span>Back to ' + esc(tr.code) + '</span></a>') + '</nav></article>' +
      '<aside class="lnav" id="lnav" aria-label="Sections"></aside></div>';

    LC.glossaryLink(root.querySelector('.lesson'));
    LC.md.enhance(root);

    /* ---- section list: jump menu with progress ---- */
    const bodyEl = root.querySelector('#body');
    const used = new Set();
    bodyEl.querySelectorAll('h2').forEach((h, i) => {
      let base = 'sec-' + (h.id || i), k = base, n = 2;
      while (used.has(k) || document.getElementById(k)) k = base + '-' + n++;
      used.add(k); h.id = k; h.dataset.sec = h.textContent.trim();
    });
    const KEY = 'lc.sec.' + id;
    let maxIdx = 0, curIdx = 0;
    try { maxIdx = +localStorage.getItem(KEY) || 0; } catch (e) {}
    function sections() {
      return Array.from(root.querySelectorAll('#body h2, section[data-sec]')).map(el => ({ el: el, label: el.dataset.sec || el.textContent.trim() }))
        .filter(s => s.label);
    }
    let secs = sections();
    function menuHtml(sheet) {
      const resume = maxIdx > 0 && maxIdx !== curIdx && secs[maxIdx];
      return '<nav class="snav" aria-label="Sections in this lesson"><p class="eyebrow snav-h">In this lesson<span class="num">' + Math.min(secs.length, Math.max(curIdx, maxIdx) + 1) + ' of ' + secs.length + '</span></p>' +
        '<div class="bar snav-bar" aria-hidden="true"><i style="width:' + (secs.length ? Math.round(100 * (Math.max(curIdx, maxIdx) + 1) / secs.length) : 0) + '%"></i></div>' +
        (resume ? '<button type="button" class="linkbtn snav-resume" data-jump="' + maxIdx + '">Resume at ' + esc(secs[maxIdx].label) + '</button>' : '') +
        '<ol>' + secs.map((s, i) => {
          const done = i < Math.max(curIdx, maxIdx) || (i < curIdx), cur = i === curIdx;
          return '<li><a href="#" data-jump="' + i + '" class="' + (cur ? 'is-cur ' : '') + (done ? 'is-done' : '') + '"' + (cur ? ' aria-current="location"' : '') + '><span class="snav-ic">' + (done ? icon('check', 13) : '<i></i>') + '</span><span class="snav-t">' + esc(s.label) + '</span></a></li>';
        }).join('') + '</ol></nav>';
    }
    function paintMenu() {
      const a = root.querySelector('#lnav'); if (a) a.innerHTML = menuHtml();
      const c = root.querySelector('[data-seccount]'); if (c) c.textContent = (Math.max(curIdx, 0) + 1) + '/' + secs.length;
      const b = root.querySelector('[data-sections]'); if (b) b.hidden = false;
    }
    function jump(i) {
      const s = secs[i]; if (!s) return;
      if (!bodyOpen) { bodyOpen = true; apply(); }
      s.el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }
    function updateSections() {
      let cur = 0, any = false;
      secs.forEach((s, i) => { const r = s.el.getBoundingClientRect(); if (r.height === 0 && r.width === 0) return; any = true; if (r.top <= 120) cur = i; });
      if (!any) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = secs.length - 1;
      if (cur === curIdx && cur <= maxIdx) return;
      curIdx = cur;
      if (cur > maxIdx) { maxIdx = cur; try { localStorage.setItem(KEY, String(cur)); } catch (e) {} }
      paintMenu();
    }
    paintMenu();
    function onNav(e) {
      const j = e.target.closest('[data-jump]');
      if (j) { e.preventDefault(); jump(+j.dataset.jump); return; }
      if (e.target.closest('[data-sections]')) {
        const sh = U.sheet('<h2 class="sheet-title">Sections</h2>' + menuHtml(true), { label: 'Sections in this lesson' });
        sh.el.addEventListener('click', ev => {
          const a = ev.target.closest('[data-jump]'); if (!a) return;
          ev.preventDefault(); const i = +a.dataset.jump; sh.close(); setTimeout(() => jump(i), 200);
        });
      }
    }
    root.querySelector('.lwrap').addEventListener('click', onNav);
    root.querySelector('.lhead').addEventListener('click', onNav);

    /* ---- dynamic regions ---- */
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
      if (bodyOpen) LC.md.enhance(root);
    }
    root.querySelector('.lesson').addEventListener('click', e => {
      const mb = e.target.closest('[data-mode]');
      if (mb) { mode = mb.dataset.mode; bodyOpen = mode === 'full'; apply(); return; }
      if (e.target.closest('#fold')) { bodyOpen = true; apply(); return; }
      if (e.target.closest('[data-skip]')) { LC.graph.skip([id]); refresh(); U.toast('<span class="toast-xp">Marked as known</span><span class="toast-sub">No XP. You can undo this here.</span>', 'info'); return; }
      if (e.target.closest('[data-unskip]')) { LC.graph.unskip(id); refresh(); return; }
      if (e.target.closest('[data-markread]')) { readNow(); return; }
    });
    root.querySelector('.lesson').addEventListener('change', e => {
      const cb = e.target.closest('[data-check]'); if (!cb) return;
      const xp = LC.quiz.toggleCheck(id, +cb.dataset.check, cb.checked);
      const cc = root.querySelector('#ckcount'); if (cc) cc.textContent = checkedCount() + ' of ' + checklist.length + ' steps checked. Your ticks are saved.';
      refresh();
      if (checklist.length && checkedCount() === checklist.length && !xp && LC.graph.status(id) !== 'complete') U.toast('<span class="toast-xp">All steps checked</span><span class="toast-sub">Pass the quiz to finish the lab</span>', 'info');
    });
    root.querySelector('.lwrap').addEventListener('toggle', e => { if (e.target.matches && e.target.matches('details')) LC.md.enhance(e.target); }, true);

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
        if (!lab && scrolled && bodyOpen && end && end.getBoundingClientRect().top < window.innerHeight - 40) readNow(true);
        updateSections();
      });
    }
    function readNow(auto) {
      const r = LC.store.lesson(id);
      if (r.readAt) return;
      const xp = LC.quiz.markRead(id);
      refresh();
      if (!xp) U.toast('<span class="toast-xp">Marked as read</span>' + (LC.graph.status(id) !== 'complete' ? '<span class="toast-sub">Pass the quiz to complete it</span>' : ''), 'info');
    }
    const onResize = () => { onScroll(); LC.md.enhance(root); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    LC.onLeave(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); });
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
