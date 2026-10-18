/* Skill map (a view of Tracks): one SVG node graph per track.
   Desktop: columns = prerequisite depth, scrolling sideways inside its container.
   Phone: depth becomes rows, two nodes per row, so the graph reads top to bottom. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;
  const PAD = 24;

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
  const isPhone = () => window.matchMedia('(max-width: 640px)').matches;

  /* Group lesson ids by prerequisite depth. */
  function byDepth(trackId) {
    const ids = LC.graph.lessonsIn(trackId), cols = [];
    ids.forEach(id => { const d = LC.graph.depth(id); (cols[d] = cols[d] || []).push(id); });
    return { ids: ids, cols: cols.filter(Boolean) };
  }
  function parents(id, pos) { return LC.index[id].prereqs.filter(p => pos[p]); }

  /* Desktop: x by depth, y by order within the depth (barycentre of parents). */
  function placeH(trackId, g) {
    const W = 200, H = 58, CG = 68, RG = 16, pos = {};
    g.cols.forEach((col, ci) => {
      if (ci > 0) {
        const bc = id => { const ps = parents(id, pos); return ps.length ? ps.reduce((a, p) => a + pos[p].row, 0) / ps.length : 99; };
        col.sort((a, b) => (bc(a) - bc(b)) || (LC.index[a].order - LC.index[b].order));
      }
      let last = -1;
      col.forEach(id => {
        const ps = parents(id, pos);
        const want = ci === 0 ? last + 1 : Math.max(last + 1, Math.round(ps.length ? ps.reduce((a, p) => a + pos[p].row, 0) / ps.length : last + 1));
        pos[id] = { col: ci, row: want }; last = want;
      });
    });
    const nrows = Math.max.apply(null, g.ids.map(id => pos[id].row)) + 1;
    g.ids.forEach(id => { pos[id].x = PAD + pos[id].col * (W + CG); pos[id].y = PAD + 8 + pos[id].row * (H + RG); });
    return { pos: pos, W: W, H: H, w: PAD * 2 + g.cols.length * W + (g.cols.length - 1) * CG, h: PAD * 2 + nrows * H + (nrows - 1) * RG + 10, vertical: false, font: 13, lines: 2, chars: 24 };
  }

  /* Phone: depth becomes a row; two nodes per row, so labels can stay at 13px or more. */
  function placeV(trackId, g) {
    const avail = Math.max(300, Math.min(window.innerWidth, 640) - 32), per = 2, GAP = 14, P = 12;
    const W = Math.floor((avail - P * 2 - GAP * (per - 1)) / per), H = 84, RG = 18;
    const pos = {};
    let y = P + 12;
    g.cols.forEach((col, ci) => {
      if (ci > 0) {
        const bc = id => { const ps = parents(id, pos); return ps.length ? ps.reduce((a, p) => a + pos[p].x, 0) / ps.length : 1e6; };
        col.sort((a, b) => (bc(a) - bc(b)) || (LC.index[a].order - LC.index[b].order));
      }
      for (let i = 0; i < col.length; i += per) {
        const chunk = col.slice(i, i + per), off = (per - chunk.length) * (W + GAP) / 2;
        chunk.forEach((id, k) => { pos[id] = { x: P + off + k * (W + GAP), y: y }; });
        y += H + RG;
      }
      y += 6;
    });
    return { pos: pos, W: W, H: H, w: P * 2 + per * W + (per - 1) * GAP, h: y + P, vertical: true, font: 13, lines: 3, chars: 15 };
  }

  function svgFor(trackId) {
    const g = byDepth(trackId), L = isPhone() ? placeV(trackId, g) : placeH(trackId, g), pos = L.pos, W = L.W, H = L.H;
    let edges = '', nodes = '';
    g.ids.forEach(id => {
      LC.index[id].prereqs.forEach(p => {
        if (!pos[p]) return;
        const done = LC.graph.isSatisfied(p), cls = 'mp-edge' + (done ? ' mp-edge-on' : '');
        if (L.vertical) {
          const x1 = pos[p].x + W / 2, y1 = pos[p].y + H, x2 = pos[id].x + W / 2, y2 = pos[id].y, my = (y1 + y2) / 2;
          edges += '<path class="' + cls + '" d="M' + x1 + ' ' + y1 + 'C' + x1 + ' ' + my + ' ' + x2 + ' ' + my + ' ' + x2 + ' ' + y2 + '"/>';
        } else {
          const x1 = pos[p].x + W, y1 = pos[p].y + H / 2, x2 = pos[id].x, y2 = pos[id].y + H / 2, mx = (x1 + x2) / 2;
          edges += '<path class="' + cls + '" d="M' + x1 + ' ' + y1 + 'C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '"/>';
        }
      });
    });
    g.ids.forEach(id => {
      const m = LC.index[id], st = LC.missing[id] ? 'soon' : LC.graph.status(id), S = U.STATUS[st] || U.STATUS.available;
      const x = pos[id].x, y = pos[id].y, lines = wrap(m.title, L.chars, L.lines), lh = 16;
      const cross = Array.from(new Set(m.prereqs.filter(p => LC.index[p] && LC.index[p].track !== trackId).map(p => LC.trackById[LC.index[p].track].code)));
      const ic = icon(S.icon, 16).replace('<svg ', '<svg x="' + (x + 10) + '" y="' + (y + 12) + '" ');
      const ty = y + (L.vertical ? 22 : (lines.length > 1 ? 24 : 33));
      const xtxt = 'needs ' + cross.join(' '), xw = Math.round(xtxt.length * 7.4 + 14);
      nodes += '<a href="#/lesson/' + id + '" class="mp-node mp-' + st + '" aria-label="' + esc(m.title + ', ' + S.label) + '"><title>' + esc(m.title + ' (' + S.label + ')') + '</title>' +
        '<rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + H + '" rx="6"/>' + ic +
        '<text x="' + (x + 32) + '" y="' + ty + '" class="mp-t">' + lines.map((l, i) => '<tspan x="' + (x + 32) + '" dy="' + (i ? lh : 0) + '">' + esc(l) + '</tspan>').join('') + '</text>' +
        '<text x="' + (x + W - 8) + '" y="' + (y + H - 8) + '" text-anchor="end" class="mp-m">' + m.minutes + ' min · L' + m.level + '</text>' +
        (cross.length ? '<g class="mp-x"><rect x="' + (x + 8) + '" y="' + (y - 10) + '" width="' + xw + '" height="19" rx="3"/><text x="' + (x + 14) + '" y="' + (y + 4) + '">' + esc(xtxt) + '</text></g>' : '') + '</a>';
    });
    return { svg: '<svg class="mp-svg" width="' + L.w + '" height="' + L.h + '" viewBox="0 0 ' + L.w + ' ' + L.h + '" role="group" aria-label="Skill map">' + edges + nodes + '</svg>', ids: g.ids, pos: pos, vertical: L.vertical };
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
    root.innerHTML = '<div class="page page-wide">' + LC.tracksHead('map') +
      '<div class="chips-scroll" role="tablist" aria-label="Pick a track">' + LC.tracks.map(x => '<a class="tchip' + (x.id === tid ? ' on' : '') + '" role="tab" aria-selected="' + (x.id === tid) + '" href="#/map/' + x.id + '"><b>' + esc(x.code) + '</b><span class="tchip-pct num">' + LC.graph.progress(x.id).pct + '%</span></a>').join('') + '</div>' +
      '<h2 class="map-title">' + esc(t.code) + ' ' + esc(t.title) + '</h2><p class="muted small num map-sub">' + pr.pct + '% known. ' + (g.vertical ? 'Read top to bottom: each row builds on the one above.' : 'Left to right follows prerequisites.') + '</p>' +
      '<div class="legend">' + legend + '</div>' +
      '<div class="map-scroll' + (g.vertical ? ' is-vertical' : '') + '" tabindex="0" role="region" aria-label="Skill map for ' + esc(t.title) + '">' + g.svg + '</div>' +
      '<p class="map-hint small muted" hidden>Drag or swipe to pan the map.</p></div>';
    const sc = root.querySelector('.map-scroll');
    const target = g.ids.find(id => LC.graph.status(id) === 'in-progress') || g.ids.find(id => LC.graph.status(id) === 'available');
    if (target) requestAnimationFrame(() => {
      if (!g.vertical) { sc.scrollLeft = Math.max(0, g.pos[target].x - 40); sc.scrollTop = Math.max(0, g.pos[target].y - 80); }
    });
    requestAnimationFrame(() => { const h = root.querySelector('.map-hint'); if (h && sc.scrollWidth > sc.clientWidth + 4) h.hidden = false; });
    const chip = root.querySelector('.tchip.on');
    if (chip && chip.parentElement) chip.parentElement.scrollLeft = Math.max(0, chip.offsetLeft - 16);
    // Switching between phone and desktop width needs the other layout.
    let was = isPhone(), tm;
    const onResize = () => { clearTimeout(tm); tm = setTimeout(() => { if (isPhone() !== was) LC.rerender(); }, 150); };
    window.addEventListener('resize', onResize);
    LC.onLeave(() => window.removeEventListener('resize', onResize));
  };
})();
