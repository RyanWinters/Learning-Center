/* XP, levels, streaks, badges. */
(function () {
  const LC = window.LC = window.LC || {};
  const esc = s => LC.ui.esc(s);

  const TITLES = ['Apprentice', 'Field Tech', 'Panel Builder', 'Controls Technician', 'Controls Engineer', 'Senior Controls Engineer', 'Systems Integrator', 'Lead Integrator', 'Solutions Architect', 'Systems Architect'];
  // Cumulative thresholds: first at 150 XP, each step about 1.5x the last. Level 10 at 11,230 XP.
  const AT = [0];
  (function () { let step = 150, sum = 0; for (let i = 1; i < 10; i++) { sum += Math.round(step); AT.push(sum); step *= 1.5; } })();

  function levelInfo(xp) {
    let n = 1;
    for (let i = 0; i < AT.length; i++) if (xp >= AT[i]) n = i + 1;
    const floor = AT[n - 1], ceil = n < 10 ? AT[n] : null;
    return { n: n, title: TITLES[n - 1], xp: xp, floor: floor, ceil: ceil, pct: ceil ? (xp - floor) / (ceil - floor) : 1, toNext: ceil ? ceil - xp : 0, next: n < 10 ? TITLES[n] : null };
  }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }
  function streak() {
    const s = LC.store.get().streak;
    return (s.lastDay === dayKey() || s.lastDay === yesterdayKey()) ? s.count : 0;
  }
  function today() {
    const d = LC.store.get(), goal = d.settings.dailyGoal || 100;
    const xp = d.daily.day === dayKey() ? d.daily.xp : 0;
    return { xp: xp, goal: goal, pct: Math.min(1, xp / goal), hit: xp >= goal };
  }
  function last14() {
    const h = LC.store.get().history || {}, out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      out.push({ day: k, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), xp: h[k] || 0, today: i === 0 });
    }
    return out;
  }

  /* XP: toasts are batched so a quiz does not spray notifications. */
  let batch = 0, reasons = [], batchTimer = null, levelBefore = null;
  function addXp(n, reason) {
    if (!n) return;
    if (levelBefore == null) levelBefore = levelInfo(LC.store.get().xp).n;
    const key = dayKey();
    let goalJustHit = false;
    LC.store.update(d => {
      d.xp += n;
      if (d.daily.day !== key) { d.daily = { day: key, xp: 0 }; }
      const wasHit = d.daily.xp >= (d.settings.dailyGoal || 100);
      d.daily.xp += n;
      if (!wasHit && d.daily.xp >= (d.settings.dailyGoal || 100)) goalJustHit = true;
      if (d.streak.lastDay !== key) {
        d.streak.count = d.streak.lastDay === yesterdayKey() ? d.streak.count + 1 : 1;
        d.streak.lastDay = key;
      }
      d.history[key] = (d.history[key] || 0) + n;
      const keys = Object.keys(d.history).sort();
      while (keys.length > 60) delete d.history[keys.shift()];
    });
    batch += n; if (reason && reasons.indexOf(reason) < 0) reasons.push(reason);
    if (goalJustHit) reasons.push('Daily goal reached');
    clearTimeout(batchTimer);
    batchTimer = setTimeout(flush, 350);
  }
  function flush() {
    const after = levelInfo(LC.store.get().xp);
    LC.ui.toast('<span class="toast-xp">+' + batch + ' XP</span><span class="toast-sub">' + esc(reasons.slice(0, 2).join(' · ')) + '</span>', 'xp');
    const up = after.n > levelBefore;
    batch = 0; reasons = []; levelBefore = null;
    if (up) setTimeout(() => levelUp(after), 700);
  }
  function levelUp(info) {
    LC.ui.sheet('<div class="levelup"><div class="levelup-n" aria-hidden="true">' + info.n + '</div>' +
      '<p class="eyebrow">Level up</p><h2>' + esc(info.title) + '</h2>' +
      '<p class="muted">' + (info.next ? esc(LC.ui.plural(info.toNext, 'XP', 'XP')) + ' to ' + esc(info.next) + '.' : 'Top of the ladder. Keep going.') + '</p>' +
      '<button class="btn btn-primary" data-close>Continue</button></div>', { label: 'Level up' });
  }

  /* ---- badges ---- */
  const GLYPH = {
    book: 'M8 8h8M8 12h8M8 16h5',
    target: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
    flame: 'M12 6c.7 2.5 3.5 4 3.5 7a3.5 3.5 0 0 1-7 0c0-1.5.7-2.2 1.4-3 0 1.5.7 2.2 1.4 2.2 0-2.2-.7-3.5.7-6.2z',
    chip: 'M9 9h6v6H9zM11 6v3M13 6v3M11 15v3M13 15v3M6 11h3M6 13h3M15 11h3M15 13h3',
    stack: 'M8 15h8M9 12h6M10 9h4',
    grid: 'M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM13 13h3v3h-3z',
    cards: 'M8 9h6v7H8zM10 7h6v7',
    check: 'M8 12.5l3 3 5-6'
  };
  const trackBadges = LC.tracks.map(t => ({ id: 'track-' + t.id, title: t.title.split(' & ')[0].replace(/^PLCs: /, '') + ' complete', desc: 'Finish every lesson in ' + t.code + ' ' + t.title + '.', glyph: 'code', code: t.code, test: () => LC.graph.trackComplete(t.id) }));
  const nLessons = () => Object.values(LC.store.get().lessons).filter(r => r.status === 'complete' || r.status === 'tested-out').length;
  const simsPassed = () => Object.values(LC.store.get().sims).filter(r => r.status === 'passed').length;
  const BADGES = [
    { id: 'first-lesson', title: 'First lesson', desc: 'Complete or test out of your first lesson.', glyph: 'book', test: () => nLessons() >= 1 },
    { id: 'first-perfect', title: 'Flawless', desc: 'Score 100% on any quiz.', glyph: 'target', test: () => Object.values(LC.store.get().lessons).some(r => r.bestScore === 100) },
    { id: 'off-by-one', title: 'Off-by-one survivor', desc: 'Score 100% on the Modbus quiz.', glyph: 'check', test: () => (LC.store.get().lessons['proto-modbus'] || {}).bestScore === 100 }
  ].concat(trackBadges, [
    { id: 'streak-3', title: 'Three in a row', desc: 'Earn XP three days running.', glyph: 'flame', num: '3', test: () => streak() >= 3 },
    { id: 'streak-7', title: 'Full week', desc: 'Earn XP seven days running.', glyph: 'flame', num: '7', test: () => streak() >= 7 },
    { id: 'streak-30', title: 'Thirty days', desc: 'Earn XP thirty days running.', glyph: 'flame', num: '30', test: () => streak() >= 30 },
    { id: 'first-sim', title: 'Rung one', desc: 'Pass your first simulator challenge.', glyph: 'chip', test: () => simsPassed() >= 1 },
    { id: 'sims-10', title: 'Ten rungs', desc: 'Pass 10 simulator challenges.', glyph: 'stack', test: () => simsPassed() >= 10 },
    { id: 'sims-all', title: 'Full ladder', desc: 'Pass every simulator challenge.', glyph: 'grid', test: () => { const n = (window.LC_SIM_INDEX || []).length; return n > 0 && simsPassed() >= n; } },
    { id: 'cards-25', title: 'Memory banks', desc: 'Answer 25 review cards correctly.', glyph: 'cards', test: () => (LC.store.get().stats.reviewCorrect || 0) >= 25 }
  ]);

  function badgeIcon(b, earned) {
    const hex = '<path d="M24 3l19 11v22L24 47 5 36V14L24 3z" class="bd-hex"/>';
    let inner;
    if (b.glyph === 'code') inner = '<text x="24" y="30" text-anchor="middle" class="bd-code">' + esc(b.code) + '</text>';
    else if (b.num) inner = '<g transform="translate(14 13) scale(.8)"><path d="' + GLYPH.flame + '" class="bd-g"/></g><text x="24" y="38" text-anchor="middle" class="bd-num">' + b.num + '</text>';
    else inner = '<g transform="translate(12 12) scale(1)"><path d="' + GLYPH[b.glyph] + '" class="bd-g"/></g>';
    return '<svg class="bd ' + (earned ? 'bd-on' : 'bd-off') + '" viewBox="0 0 48 50" width="56" height="58" aria-hidden="true">' + hex + inner + '</svg>';
  }
  function checkBadges() {
    const earned = LC.store.get().badges;
    const fresh = BADGES.filter(b => !(earned[b.id] && !earned[b.id].reset) && b.test());
    if (!fresh.length) return;
    LC.store.update(d => { fresh.forEach(b => { d.badges[b.id] = { earnedAt: Date.now() }; }); });
    fresh.forEach((b, i) => setTimeout(() => LC.ui.toast('<span class="toast-badge">' + badgeIcon(b, true) + '</span><span><span class="toast-xp">Badge earned</span><span class="toast-sub">' + esc(b.title) + '</span></span>', 'badge', 3600), 500 + i * 600));
  }
  function hasBadge(id) { const b = LC.store.get().badges[id]; return !!b && !b.reset; }

  LC.gamify = { levelInfo: levelInfo, TITLES: TITLES, AT: AT, dayKey: dayKey, streak: streak, today: today, last14: last14, addXp: addXp, BADGES: BADGES, badgeIcon: badgeIcon, checkBadges: checkBadges, hasBadge: hasBadge };
})();
