/* Home: level, continue, today, up next, track grid. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;

  function strip(trackId) {
    return '<span class="strip" aria-hidden="true">' + LC.graph.lessonsIn(trackId).map(id => '<i class="sg-' + LC.graph.status(id) + '"></i>').join('') + '</span>';
  }
  function trackTile(t) {
    const p = LC.graph.progress(t.id);
    return '<a class="ttile" href="#/track/' + t.id + '"><span class="ttile-top"><span class="mono-tag">' + esc(t.code) + '</span><span class="ttile-pct num">' + p.pct + '%</span></span>' +
      '<span class="ttile-title">' + esc(t.title) + '</span>' + strip(t.id) +
      '<span class="ttile-sub num">' + (p.done + p.skipped) + ' of ' + p.total + ' lessons</span></a>';
  }

  LC.views.home = function (root) {
    const s = LC.store.get(), li = LC.gamify.levelInfo(s.xp), today = LC.gamify.today(), streak = LC.gamify.streak();
    const due = LC.quiz.due().length;
    const cont = LC.graph.continueLesson();
    const pool = LC.graph.upNextWhy(6, cont ? [cont] : []);
    const first = cont ? null : (pool[0] ? pool[0].id : 'found-history');
    const next = pool.filter(x => x.id !== first).slice(0, 5);
    const fresh = Object.keys(s.lessons).filter(k => s.lessons[k].status).length === 0;

    let contHtml;
    if (cont) {
      const m = LC.index[cont], tr = LC.trackById[m.track], r = s.lessons[cont];
      const step = r.readAt ? 'Take the quiz to finish' : 'Pick up where you left off';
      contHtml = '<a class="continue" href="#/lesson/' + cont + (r.readAt ? '/quiz' : '') + '"><span class="eyebrow">Continue · ' + esc(tr.code) + ' ' + esc(tr.title) + '</span>' +
        '<span class="continue-title">' + esc(m.title) + '</span><span class="continue-sub">' + step + ' · ' + m.minutes + ' min</span><span class="continue-go">' + (r.readAt ? 'Start quiz' : 'Resume') + icon('right', 18) + '</span></a>';
    } else {
      const m = LC.index[first];
      contHtml = '<a class="continue continue-new" href="#/lesson/' + first + '"><span class="eyebrow">' + (fresh ? 'Start here' : 'Next lesson') + '</span>' +
        '<span class="continue-title">' + esc(m.title) + '</span><span class="continue-sub">' + (fresh ? 'The ten tracks run from signals and networks to MES architecture. Begin with the story so far.' : 'Nothing in progress. This is the next open lesson.') + '</span><span class="continue-go">Begin' + icon('right', 18) + '</span></a>';
    }

    const reviewHtml = due
      ? '<a class="today-review" href="#/review">' + icon('review', 18) + '<span><b class="num">' + due + '</b> ' + (due === 1 ? 'card' : 'cards') + ' due for review</span>' + icon('chev', 16) + '</a>'
      : '<div class="today-review is-idle">' + icon('check', 18) + '<span>Review queue is clear</span></div>';

    root.innerHTML = '<div class="page home">' +
      '<header class="hero"><p class="eyebrow">' + U.greeting() + '</p><h1 class="hero-title">' + esc(li.title) + '</h1>' +
        '<div class="hero-xp"><div class="bar bar-xp bar-lg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(li.pct * 100) + '" aria-label="XP to next level"><i style="width:' + (li.pct * 100).toFixed(1) + '%"></i></div>' +
        '<p class="hero-xp-meta num"><span>Level ' + li.n + '</span><span>' + (li.ceil ? s.xp.toLocaleString() + ' / ' + li.ceil.toLocaleString() + ' XP to ' + esc(li.next) : s.xp.toLocaleString() + ' XP, top level') + '</span></p></div></header>' +
      '<div class="home-grid"><div class="home-main">' + contHtml +
        '<section class="sec"><div class="sec-head"><h2>Up next</h2><a href="#/tracks">All tracks</a></div>' +
        (next.length ? '<div class="rows">' + next.map(x => U.lessonRow(x.id, { track: true }).replace('<span class="lrow-meta">', '<span class="lrow-meta"><span class="lrow-why">' + esc(x.why) + '</span>')).join('') + '</div>' : '<div class="empty empty-sm"><p class="muted">Nothing is open right now. Finish or skip a lesson to unlock more.</p></div>') + '</section></div>' +
      '<aside class="today" aria-label="Today"><div class="today-top">' +
        U.ring(today.pct, 104, 9, '<span class="ring-num num">' + today.xp + '</span><span class="ring-sub">of ' + today.goal + ' XP</span>') +
        '<div class="today-side"><p class="eyebrow">Today</p><p class="today-state">' + (today.hit ? 'Goal reached' : (today.goal - today.xp) + ' XP to go') + '</p>' +
        '<p class="streak ' + (streak ? '' : 'is-off') + '">' + icon('flame', 18) + '<b class="num">' + streak + '</b> day streak</p></div></div>' + reviewHtml + '</aside></div>' +
      '<section class="sec"><div class="sec-head"><h2>Tracks</h2><a href="#/map">Skill map</a></div><div class="ttiles">' + LC.tracks.map(trackTile).join('') + '</div></section></div>';
  };
})();
