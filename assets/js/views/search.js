/* Search results page. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;

  LC.views.search = function (root, p) {
    root.innerHTML = '<div class="page page-narrow"><header class="page-head"><p class="eyebrow">Search</p><h1>Find a lesson or term</h1></header>' +
      '<label class="field field-lg">' + icon('search', 20) + '<input type="search" id="sq" placeholder="Try &quot;modbus&quot; or &quot;subnet&quot;" aria-label="Search" autocomplete="off" spellcheck="false" value="' + esc(p.q || '') + '"></label>' +
      '<div id="sres" aria-live="polite"></div></div>';
    const input = root.querySelector('#sq'), res = root.querySelector('#sres');
    let loaded = false, loading = false;
    // Titles come from LC.lessonIndex immediately; summaries and tags need lesson files, loaded only once the user searches.
    function ensureLoaded() {
      if (loaded || loading) return;
      loading = true;
      LC.loadAllLessons().then(() => { loaded = true; loading = false; if (p.alive() && document.contains(input)) draw(); });
    }

    function draw() {
      const q = input.value.trim();
      if (!q) { res.innerHTML = '<div class="empty empty-sm"><p class="muted">Search covers lesson titles, tags and summaries, plus every glossary term.</p></div>'; return; }
      ensureLoaded();
      const r = LC.search.run(q);
      let h = '';
      if (r.lessons.length) h += '<section class="sec"><div class="sec-head"><h2>Lessons</h2><span class="muted num">' + r.lessons.length + '</span></div><div class="rows">' + r.lessons.slice(0, 12).map(x => U.lessonRow(x.id, { track: true })).join('') + '</div></section>';
      if (r.terms.length) h += '<section class="sec"><div class="sec-head"><h2>Glossary</h2><span class="muted num">' + r.terms.length + '</span></div><div class="rows">' + r.terms.slice(0, 10).map(x => {
        const t = LC.terms[x.id];
        return '<a class="lrow" href="#/glossary/' + esc(t.id) + '"><span class="sico sico-mute">' + icon('book', 16) + '</span><span class="lrow-main"><span class="lrow-title">' + esc(t.term) + '</span><span class="lrow-meta"><span class="clamp">' + esc(t.def) + '</span></span></span><span class="lrow-end">' + icon('chev', 18) + '</span></a>';
      }).join('') + '</div></section>';
      if (!h) h = '<div class="empty empty-sm"><div class="empty-ic">' + icon('search', 30) + '</div><h2>No matches for "' + esc(q) + '"</h2><p class="muted">Check the spelling or try a shorter word.' + (loaded || !loading ? '' : ' Still indexing lessons.') + '</p></div>';
      res.innerHTML = h;
    }
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { draw(); try { history.replaceState(null, '', '#/search/' + encodeURIComponent(input.value.trim())); } catch (e) {} }, 220);
    });
    draw();
    if (matchMedia('(max-width: 1023px)').matches) input.focus({ preventScroll: true });
  };
})();
