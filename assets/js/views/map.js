/* Skill map: one SVG node graph per track, columns = prerequisite depth. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;
  const W = 200, H = 58, CG = 68, RG = 16, PAD = 24;

  function wrap(text, max, lines) {
    const words = text.split(' '), out = [];
    let cur = '';
    words.forEach(w => {
      if ((cur + ' ' + w).trim().length <= max) cur = (cur + ' ' + w).trim();
      else { if (cur) out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/.{0,2}$/, '') + '…'; }
    return out;
  }

  function layout(trackId) {
    const ids = LC.graph.lessonsIn(trackId), cols = [], pos = {};
    ids.forEach(id => { const d = LC.graph.depth(id); (cols[d] = cols[d] || []).push(id); });
    cols.forEach((col, ci) => {
      if (ci > 0) {
        const bc = id => {
          const ps = LC.index[id].prereqs.filter(p => pos[p]);
          return ps.length ? ps.reduce((a, p) => a + pos[p].row, 0) / ps.length : 99;
        };
        col.sort((a, b) => (bc(a) - bc(b)) || (LC.index[a].order - LC.index[b].order));
      }
      // Resolve collisions so rows stay distinct integers while keeping barycentre order.
      let last = -1;
      col.forEach(id => {
        let want = ci === 0 ? last + 1 : Math.max(last + 1, Math.round((function () { const ps = LC.index[id].prereqs.filter(p => pos[p]); return ps.length ? ps.reduce((a, p) => a + pos[p].row, 0) / ps.length : last + 1; })()));
        pos[id] = { col: ci, row: want }; last = want;
      });
    });
    return { ids: ids, pos: pos, ncols: cols.length, nrows: Math.max.apply(null, ids.map(id => pos[id].row)) + 1 };
  }

  function svgFor(trackId) {
    const L = layout(trackId);
    const w = PAD * 2 + L.ncols * W + (L.ncols - 1) * CG, h = PAD * 2 + L.nrows * H + (L.nrows - 1) * RG + 10;
    const X = id => PAD + L.pos[id].col * (W + CG), Y = id => PAD + 8 + L.pos[id].row * (H + RG);
    let edges = '', nodes = '';
    L.ids.forEach(id => {
      LC.index[id].prereqs.forEach(p => {
        if (!L.pos[p]) return;
        const x1 = X(p) + W, y1 = Y(p) + H / 2, x2 = X(id), y2 = Y(id) + H / 2, mx = (x1 + x2) / 2;
        const done = LC.graph.isSatisfied(p);
        edges += '<path class="mp-edge' + (done ? ' mp-edge-on' : '') + '" d="M' + x1 + ' ' + y1 + 'C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
      });
    });
    L.ids.forEach(id => {
      const m = LC.index[id], st = LC.missing[id] ? 'soon' : LC.graph.status(id), S = U.STATUS[st] || U.STATUS.available;
      const x = X(id), y = Y(id), lines = wrap(m.title, 24, 2);
      const cross = Array.from(new Set(m.prereqs.filter(p => LC.index[p] && LC.index[p].track !== trackId).map(p => LC.trackById[LC.index[p].track].code)));
      const ic = icon(S.icon, 16).replace('<svg ', '<svg x="' + (x + 12) + '" y="' + (y + 12) + '" ');
      nodes += '<a href="#/lesson/' + id + '" class="mp-node mp-' + st + '" aria-label="' + esc(m.title + ', ' + S.label) + '"><title>' + esc(m.title + ' (' + S.label + ')') + '</title>' +
        '<rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + H + '" rx="6"/>' + ic +
        '<text x="' + (x + 36) + '" y="' + (y + (lines.length > 1 ? 24 : 33)) + '" class="mp-t">' + lines.map((l, i) => '<tspan x="' + (x + 36) + '" dy="' + (i ? 16 : 0) + '">' + esc(l) + '</tspan>').join('') + '</text>' +
        '<text x="' + (x + W - 10) + '" y="' + (y + H - 8) + '" text-anchor="end" class="mp-m">' + m.minutes + ' min</text>' +
        (cross.length ? '<g class="mp-x"><rect x="' + (x + 10) + '" y="' + (y - 9) + '" width="' + (cross.length * 28 + 34) + '" height="17" rx="3"/><text x="' + (x + 17) + '" y="' + (y + 3) + '">needs ' + esc(cross.join(' ')) + '</text></g>' : '') + '</a>';
    });
    return { svg: '<svg class="mp-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="group" aria-label="Skill map">' + edges + nodes + '</svg>', L: L, X: X, Y: Y };
  }

  LC.views.map = function (root, p) {
    let tid = p.id && LC.trackById[p.id] ? p.id : null;
    if (!tid) {
      const c = LC.graph.continueLesson();
      tid = c ? LC.index[c].track : (LC.tracks.find(t => LC.graph.progress(t.id).pct < 100) || LC.tracks[0]).id;
    }
    const t = LC.trackById[tid], pr = LC.graph.progress(tid);
    const g = svgFor(tid);
    const legend = ['complete', 'in-progress', 'available', 'skipped', 'locked'].map(s => '<span class="lg lg-' + s + '">' + icon(U.STATUS[s].icon, 14) + U.STATUS[s].label + '</span>').join('');
    root.innerHTML = '<div class="page page-wide"><header class="page-head"><p class="eyebrow">Skill map</p><h1>' + esc(t.code) + ' ' + esc(t.title) + '</h1>' +
      '<p class="lede num">' + pr.pct + '% of the track known. Left to right follows prerequisites.</p></header>' +
      '<div class="chips-scroll" role="tablist" aria-label="Tracks">' + LC.tracks.map(x => '<a class="tchip' + (x.id === tid ? ' on' : '') + '" role="tab" aria-selected="' + (x.id === tid) + '" href="#/map/' + x.id + '"><b>' + esc(x.code) + '</b><span class="tchip-pct num">' + LC.graph.progress(x.id).pct + '%</span></a>').join('') + '</div>' +
      '<div class="legend">' + legend + '</div>' +
      '<div class="map-scroll" tabindex="0" aria-label="Skill map for ' + esc(t.title) + ', scrolls sideways">' + g.svg + '</div></div>';
    // Bring the frontier into view.
    const sc = root.querySelector('.map-scroll');
    const target = g.L.ids.find(id => LC.graph.status(id) === 'in-progress') || g.L.ids.find(id => LC.graph.status(id) === 'available');
    if (target) requestAnimationFrame(() => { sc.scrollLeft = Math.max(0, g.X(target) - 40); sc.scrollTop = Math.max(0, g.Y(target) - 80); });
    const chip = root.querySelector('.tchip.on');
    if (chip && chip.scrollIntoView) chip.scrollIntoView({ inline: 'center', block: 'nearest' });
  };
})();
