/* Tracks overview and the track page. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;

  /* Shared header for the Tracks list and the skill map: a List | Map toggle. */
  LC.tracksHead = function (active) {
    const tab = (v, href, label, ic) => '<a class="seg-btn" href="' + href + '"' + (active === v ? ' aria-current="page"' : '') + '>' + icon(ic, 16) + label + '</a>';
    return '<header class="page-head"><p class="eyebrow">Curriculum</p><h1>Tracks</h1><p class="lede">Eleven tracks and five build labs, from what a transmitter does to architecting a multi-site system. Work in order, or jump to what you need. Locks are only suggestions.</p>' +
      '<div class="seg view-toggle" role="group" aria-label="Tracks view">' + tab('list', '#/tracks', 'List', 'list') + tab('map', '#/map', 'Map', 'map') + '</div></header>';
  };

  LC.views.tracks = function (root) {
    root.innerHTML = '<div class="page">' + LC.tracksHead('list') +
      '<div class="track-list">' + LC.tracks.map(t => {
        const p = LC.graph.progress(t.id);
        const min = LC.graph.lessonsIn(t.id).reduce((a, id) => a + LC.index[id].minutes, 0);
        return '<a class="trow" href="#/track/' + t.id + '"><span class="trow-code">' + esc(t.code) + '</span><span class="trow-main"><span class="trow-title">' + esc(t.title) + '</span><span class="trow-blurb">' + esc(t.blurb) + '</span>' +
          '<span class="trow-meta num"><span>' + p.total + ' lessons</span><span>' + Math.round(min / 60 * 10) / 10 + ' h</span><span>' + p.pct + '% done</span></span>' +
          '<span class="strip" aria-hidden="true">' + LC.graph.lessonsIn(t.id).map(id => '<i class="sg-' + LC.graph.status(id) + '"></i>').join('') + '</span></span>' + icon('chev', 20) + '</a>';
      }).join('') + '</div></div>';
  };

  LC.views.track = function (root, p) {
    const t = LC.trackById[p.id];
    if (!t) { root.innerHTML = '<div class="page"><div class="empty"><h1>Unknown track</h1><a class="btn" href="#/tracks">All tracks</a></div></div>'; return; }
    const ids = LC.graph.lessonsIn(t.id);
    const pr = LC.graph.progress(t.id);
    const min = ids.reduce((a, id) => a + LC.index[id].minutes, 0);
    const allKnown = pr.done + pr.skipped === pr.total;
    root.innerHTML = '<div class="page"><a class="backlink" href="#/tracks">' + icon('left', 16) + 'Tracks</a>' +
      '<header class="track-head"><div class="track-code">' + esc(t.code) + '</div><div class="track-info"><h1>' + esc(t.title) + '</h1><p class="lede">' + esc(t.blurb) + '</p>' +
      '<div class="track-stats num"><span><b>' + pr.pct + '%</b> done</span><span><b>' + pr.total + '</b> lessons</span><span><b>' + Math.round(min / 60 * 10) / 10 + '</b> hours</span></div>' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pr.pct + '" aria-label="Track progress"><i style="width:' + pr.pct + '%"></i></div>' +
      '<div class="track-actions"><a class="btn btn-sm" href="#/map/' + t.id + '">' + icon('map', 16) + 'Skill map</a>' +
      (allKnown ? '' : '<button type="button" class="btn btn-sm btn-ghost" data-know>' + icon('skip', 16) + 'I know this track</button>') + '</div></div></header>' +
      '<div class="rows rows-flush">' + ids.map((id, i) => U.lessonRow(id)).join('') + '</div></div>';
    LC.glossaryLink(root.querySelector('.lede'));

    const btn = root.querySelector('[data-know]');
    if (btn) btn.addEventListener('click', () => {
      const todo = ids.filter(id => ['complete', 'tested-out', 'skipped'].indexOf(LC.graph.status(id)) < 0);
      const sh = U.sheet('<h2 class="sheet-title">Mark ' + esc(t.code) + ' as known?</h2><p class="muted">This marks ' + U.plural(todo.length, 'lesson') + ' as known. No XP is awarded, prerequisites in other tracks unlock, and you can undo any lesson from its own page.</p>' +
        '<div class="sheet-actions"><button type="button" class="btn btn-primary" data-yes>Mark ' + todo.length + ' lessons as known</button><button type="button" class="btn" data-close>Cancel</button></div>', { label: 'Confirm mark track as known' });
      sh.el.querySelector('[data-yes]').addEventListener('click', () => { LC.graph.skip(todo); sh.close(); LC.rerender(); U.toast('<span class="toast-xp">' + esc(t.code) + ' marked as known</span>', 'info'); });
    });
  };
})();
