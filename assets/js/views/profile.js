/* Profile: level, 14-day XP, badges, settings, sync, reset. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;

  function chart(days) {
    // The viewBox matches the drawn width so labels stay at their real 11-12px size.
    const max = Math.max(50, Math.max.apply(null, days.map(d => d.xp))), W = window.innerWidth < 640 ? 320 : 420, H = 140, bw = W / days.length;
    const none = !days.some(d => d.xp);
    return '<svg class="xpchart" viewBox="0 0 ' + W + ' ' + (H + 24) + '" role="img" aria-label="XP earned per day over the last 14 days">' +
      (none ? '<text x="' + W / 2 + '" y="' + (H / 2) + '" text-anchor="middle" class="xc-empty">Your first XP shows up here</text>' : '') +
      '<line x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '" class="xc-axis"/>' +
      days.map((d, i) => {
        const h = Math.round((d.xp / max) * (H - 18)), x = i * bw + 6;
        return '<g><rect x="' + x + '" y="' + (H - h) + '" width="' + (bw - 12) + '" height="' + Math.max(h, d.xp ? 2 : 0) + '" rx="2" class="xc-bar' + (d.today ? ' is-today' : '') + '"/>' +
          (d.xp ? '<text x="' + (x + (bw - 12) / 2) + '" y="' + (H - h - 5) + '" text-anchor="middle" class="xc-v">' + d.xp + '</text>' : '') +
          '<text x="' + (x + (bw - 12) / 2) + '" y="' + (H + 18) + '" text-anchor="middle" class="xc-l' + (d.today ? ' is-today' : '') + '">' + esc(d.label) + '</text><title>' + esc(d.day) + ': ' + d.xp + ' XP</title></g>';
      }).join('') + '</svg>';
  }

  LC.views.profile = function (root) {
    const s = LC.store.get(), li = LC.gamify.levelInfo(s.xp), st = s.settings, days = LC.gamify.last14();
    const lessons = Object.values(s.lessons);
    const done = lessons.filter(r => r.status === 'complete' || r.status === 'tested-out').length;
    const sims = Object.values(s.sims).filter(r => r.status === 'passed').length;
    const earned = LC.gamify.BADGES.filter(b => LC.gamify.hasBadge(b.id)).length;
    const seg = (key, val, label, cur) => '<button type="button" class="seg-btn" data-set="' + key + '" data-val="' + val + '" aria-pressed="' + (String(cur) === String(val)) + '">' + label + '</button>';

    function paint() {
      const sy = LC.store.syncState();
      root.innerHTML = '<div class="page"><header class="page-head"><p class="eyebrow">Profile</p><h1>' + esc(li.title) + '</h1></header>' +
        '<div class="prof-grid"><section class="prof-level"><div class="rl-top"><span class="rl-n rl-n-lg">' + li.n + '</span><div class="grow"><p class="eyebrow">Level ' + li.n + ' of 10</p>' +
        '<div class="bar bar-xp bar-lg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(li.pct * 100) + '"><i style="width:' + (li.pct * 100).toFixed(1) + '%"></i></div>' +
        '<p class="hero-xp-meta num"><span>' + s.xp.toLocaleString() + ' XP</span><span>' + (li.ceil ? li.toNext.toLocaleString() + ' to ' + esc(li.next) : 'Top level') + '</span></p></div></div>' +
        '<ul class="stats num"><li><b>' + done + '</b><span>lessons done</span></li><li><b>' + LC.gamify.streak() + '</b><span>day streak</span></li><li><b>' + sims + '</b><span>sims passed</span></li><li><b>' + earned + '/' + LC.gamify.BADGES.length + '</b><span>badges</span></li></ul></section>' +
        '<section class="prof-chart"><div class="sec-head"><h2>Last 14 days</h2><span class="muted small">XP per day</span></div>' + chart(days) + '</section></div>' +
        '<section class="sec"><div class="sec-head"><h2>Lesson difficulty</h2><a href="#/readiness">Integrator readiness</a></div><p class="muted small lv-note">Difficulty is shown as L1 to L4 on every lesson. It is separate from your XP level.</p><div class="lv-rows">' + LC.readiness.levels().map(v =>
          '<div class="lv-row">' + U.pips(v.l) + '<span class="lv-n">' + esc(v.name) + '</span><div class="rbar" role="img" aria-label="' + v.done + ' of ' + v.total + ' done"><i class="rb-done" style="width:' + (v.total ? 100 * v.done / v.total : 0).toFixed(1) + '%"></i><i class="rb-skip" style="width:' + (v.total ? 100 * v.skipped / v.total : 0).toFixed(1) + '%"></i></div><span class="num lv-c">' + v.done + '/' + v.total + '</span></div>').join('') + '</div></section>' +
        '<a class="ready-link ready-link-wide" href="#/readiness"><span class="ready-top">' + icon('gauge', 18) + '<b>Integrator readiness</b>' + icon('chev', 16) + '</span><span class="muted small">See your progress against Purdue levels 0 to 4, the capstone and the build labs.</span></a>' +
        '<section class="sec"><div class="sec-head"><h2>Badges</h2></div><div class="badges">' + LC.gamify.BADGES.map(b => {
          const on = LC.gamify.hasBadge(b.id);
          return '<div class="badge ' + (on ? 'is-on' : '') + '">' + LC.gamify.badgeIcon(b, on) + '<span class="badge-t">' + esc(b.title) + '</span><span class="badge-d">' + esc(b.desc) + '</span><span class="sr-only">' + (on ? 'Earned' : 'Locked') + '</span></div>';
        }).join('') + '</div></section>' +
        '<section class="sec settings"><div class="sec-head"><h2>Settings</h2></div>' +
        '<div class="set-row"><div><b>Theme</b><span class="muted small">Auto follows your device.</span></div><div class="seg" role="group" aria-label="Theme">' + seg('theme', 'system', 'Auto', st.theme) + seg('theme', 'light', 'Light', st.theme) + seg('theme', 'dark', 'Dark', st.theme) + '</div></div>' +
        '<div class="set-row"><div><b>Daily goal</b><span class="muted small">XP per day for the goal ring.</span></div><div class="seg" role="group" aria-label="Daily goal">' + [50, 100, 150, 250].map(n => seg('goal', n, n, st.dailyGoal)).join('') + '</div></div>' +
        '<div class="set-row"><div><b>Open lessons in ELI5</b><span class="muted small">Start each lesson with the plain-language version.</span></div><button type="button" class="switch" role="switch" aria-checked="' + !!st.eli5Default + '" data-eli aria-label="Open lessons in ELI5"><i></i></button></div>' +
        '<div class="set-row"><div><b>Sync</b><span class="muted small">Progress lives on your server and is cached on this device.</span></div><div class="sync-box"><span class="sync sync-' + sy + '">' + icon(sy === 'offline' ? 'cloudoff' : 'cloud', 15) + '<span>' + (sy === 'synced' ? 'Synced' : sy === 'pending' ? 'Saving' : 'Offline, will sync') + '</span></span><button type="button" class="btn btn-sm" data-sync>Sync now</button></div></div>' +
        '<div class="set-row set-danger"><div><b>Reset progress</b><span class="muted small">Clears XP, lessons, badges and review cards on every device.</span></div><div id="resetSlot"><button type="button" class="btn btn-sm btn-danger-o" data-reset>Reset</button></div></div></section></div>';
    }
    paint();

    root.querySelector('.page').addEventListener('click', e => {
      const b = e.target.closest('[data-set]');
      if (b) {
        if (b.dataset.set === 'theme') { LC.store.setting('theme', b.dataset.val); const t = b.dataset.val; if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }
        if (b.dataset.set === 'goal') LC.store.setting('dailyGoal', +b.dataset.val);
        b.parentElement.querySelectorAll('.seg-btn').forEach(x => x.setAttribute('aria-pressed', x === b));
        return;
      }
      const sw = e.target.closest('[data-eli]');
      if (sw) { const v = sw.getAttribute('aria-checked') !== 'true'; LC.store.setting('eli5Default', v); sw.setAttribute('aria-checked', v); return; }
      if (e.target.closest('[data-sync]')) { LC.store.syncNow(); return; }
      if (e.target.closest('[data-reset]')) {
        root.querySelector('#resetSlot').innerHTML = '<div class="confirm"><span>Erase everything?</span><button type="button" class="btn btn-sm btn-danger" data-reset-yes>Yes, erase</button><button type="button" class="btn btn-sm" data-reset-no>Cancel</button></div>';
        return;
      }
      if (e.target.closest('[data-reset-no]')) { root.querySelector('#resetSlot').innerHTML = '<button type="button" class="btn btn-sm btn-danger-o" data-reset>Reset</button>'; return; }
      if (e.target.closest('[data-reset-yes]')) { LC.store.reset().then(() => { LC.rerender(); }); LC.rerender(); }
    });
    const onSync = () => { const el = root.querySelector('.sync-box .sync'); if (el && document.contains(el)) { const sy = LC.store.syncState(); el.className = 'sync sync-' + sy; el.innerHTML = icon(sy === 'offline' ? 'cloudoff' : 'cloud', 15) + '<span>' + (sy === 'synced' ? 'Synced' : sy === 'pending' ? 'Saving' : 'Offline, will sync') + '</span>'; } };
    LC.store.on('sync', onSync);
    LC.onLeave(() => LC.store.off('sync', onSync));
  };
})();
