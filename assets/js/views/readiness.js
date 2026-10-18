/* Integrator readiness: progress against Purdue levels 0-4 and curriculum difficulty L1-L4,
   with the capstone and the build labs as the finish line. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;

  const PURDUE = [
    { n: 0, name: 'The process', sub: 'Sensors, actuators and the physical plant', tracks: ['found', 'plc'] },
    { n: 1, name: 'Basic control', sub: 'PLCs, drives and the networks between them', tracks: ['found', 'plc', 'net', 'proto'] },
    { n: 2, name: 'Supervisory', sub: 'HMI, SCADA and the Ignition gateway', tracks: ['net', 'proto', 'ign', 'persp', 'arch'] },
    { n: 3, name: 'Site operations', sub: 'Historians, MES, batch and quality', tracks: ['ign', 'persp', 'arch', 'db', 'mes'] },
    { n: 4, name: 'Business', sub: 'ERP integration and multi-site architecture', tracks: ['db', 'mes'] }
  ];
  const CAPSTONE = 'int-capstone';

  function tally(ids) {
    const t = { total: ids.length, done: 0, skipped: 0 };
    ids.forEach(id => {
      const s = LC.graph.status(id);
      if (s === 'complete' || s === 'tested-out') t.done++;
      else if (s === 'skipped') t.skipped++;
    });
    t.pct = t.total ? Math.round(100 * t.done / t.total) : 0;
    return t;
  }
  function purdue() {
    return PURDUE.map(p => {
      const ids = [];
      p.tracks.forEach(t => LC.graph.lessonsIn(t).forEach(id => { if (ids.indexOf(id) < 0) ids.push(id); }));
      if (LC.index[CAPSTONE] && ids.indexOf(CAPSTONE) < 0) ids.push(CAPSTONE);
      return Object.assign({}, p, tally(ids));
    });
  }
  function levels() {
    return [1, 2, 3, 4].map(l => Object.assign({ l: l, name: U.LEVEL_NAMES[l] }, tally(Object.keys(LC.index).filter(id => LC.index[id].level === l))));
  }
  function summary() {
    const adv = LC.gamify.advancedIds(), t = tally(adv);
    return { done: t.done, total: t.total, pct: t.pct, capstone: LC.gamify.doneId(CAPSTONE), ready: LC.gamify.hasBadge('integrator-ready') };
  }
  LC.readiness = { purdue: purdue, levels: levels, summary: summary, tally: tally };

  function stack(t) {
    const d = t.total ? 100 * t.done / t.total : 0, s = t.total ? 100 * t.skipped / t.total : 0;
    return '<div class="rbar" role="img" aria-label="' + t.done + ' done, ' + t.skipped + ' skipped, of ' + t.total + '"><i class="rb-done" style="width:' + d.toFixed(1) + '%"></i><i class="rb-skip" style="width:' + s.toFixed(1) + '%"></i></div>';
  }

  LC.views.readiness = function (root) {
    const sm = summary(), P = purdue(), Lv = levels();
    const adv = LC.gamify.advancedIds(), left = adv.filter(id => !LC.gamify.doneId(id));
    const labs = LC.trackLessons.build || [];
    const cap = LC.index[CAPSTONE], capSt = cap ? LC.graph.status(CAPSTONE) : null;
    const labsDone = labs.filter(id => LC.gamify.doneId(id)).length;
    const checkCount = id => Object.keys((LC.store.get().lessons[id] || {}).checks || {}).length;

    root.innerHTML = '<div class="page"><a class="backlink" href="#/profile">' + icon('left', 16) + 'Profile</a>' +
      '<header class="page-head"><p class="eyebrow">Goal</p><h1>Integrator readiness</h1><p class="lede">How much of the job you have covered. The first view follows the plant (Purdue levels 0 to 4). The second follows lesson difficulty, L1 to L4. The finish line is the capstone and the build labs.</p></header>' +
      '<section class="ready-hero ' + (sm.ready ? 'is-ready' : '') + '">' + U.ring(sm.pct / 100, 112, 10, '<span class="ring-num num">' + sm.pct + '%</span>') +
        '<div><p class="eyebrow">' + (sm.ready ? 'Integrator ready' : 'Advanced coverage') + '</p><p class="ready-state">' + (sm.ready ? 'Every L3 and L4 lesson in T4 to T9 is done.' : sm.done + ' of ' + sm.total + ' L3 and L4 lessons done in T4 to T9') + '</p>' +
        '<p class="muted small">Finish those and the "Integrator ready" badge is yours. Skipped lessons do not count here; test out to count them.</p></div></section>' +

      '<section class="sec"><div class="sec-head"><h2>Plant levels</h2><span class="muted small">Purdue model, 0 to 4</span></div><div class="rrows">' + P.map(p =>
        '<div class="rrow"><div class="rrow-h"><span class="rrow-n" aria-hidden="true">' + p.n + '</span><div class="rrow-t"><b>Purdue level ' + p.n + ' · ' + esc(p.name) + '</b><span class="muted small">' + esc(p.sub) + '</span></div><span class="rrow-c num">' + p.done + '/' + p.total + '</span></div>' + stack(p) +
        '<div class="rrow-tr">' + p.tracks.map(t => '<a class="mono-tag" href="#/track/' + t + '">' + esc(LC.trackById[t].code) + '</a>').join('') + '<a class="mono-tag" href="#/lesson/' + CAPSTONE + '">Capstone</a></div></div>').join('') + '</div></section>' +

      '<section class="sec"><div class="sec-head"><h2>Lesson difficulty</h2><span class="muted small">L1 Intro to L4 Expert</span></div><div class="rrows">' + Lv.map(v =>
        '<div class="rrow"><div class="rrow-h">' + U.pips(v.l) + '<div class="rrow-t"><b>' + esc(v.name) + '</b></div><span class="rrow-c num">' + v.done + '/' + v.total + '</span></div>' + stack(v) + '</div>').join('') + '</div>' +
        '<p class="legend rlegend"><span class="lg"><i class="sw sw-done"></i>Done or tested out</span><span class="lg"><i class="sw sw-skip"></i>Skipped</span></p></section>' +

      '<section class="sec"><div class="sec-head"><h2>Finish line</h2></div>' +
        (cap ? '<a class="finish" href="#/lesson/' + CAPSTONE + '"><span class="finish-ic">' + icon('flag', 22) + '</span><span class="finish-main"><span class="eyebrow">Capstone</span><b>' + esc(cap.title) + '</b><span class="muted small">' + cap.minutes + ' min · ' + U.pips(cap.level) + '</span></span>' + U.chip(capSt, true) + '</a>' : '') +
        (labs.length ? '<div class="sec-head sec-sub"><h3>Build labs</h3><span class="muted small num">' + labsDone + ' of ' + labs.length + '</span></div><div class="rows">' + labs.map(id => {
          const r = U.lessonRow(id), n = checkCount(id);
          return n && !LC.gamify.doneId(id) ? r.replace('</span></span><span class="lrow-end">', '</span><span class="num">' + n + ' steps checked</span></span><span class="lrow-end">') : r;
        }).join('') + '</div>' : '') + '</section>' +

      (left.length ? '<section class="sec"><div class="sec-head"><h2>Still to cover</h2><span class="muted small num">' + left.length + ' advanced lessons</span></div><div class="rows">' + left.slice(0, 8).map(id => U.lessonRow(id, { track: true })).join('') + '</div>' + (left.length > 8 ? '<p class="muted small more-note">And ' + (left.length - 8) + ' more. Open the tracks to see them all.</p>' : '') + '</section>' : '') + '</div>';
  };
})();
