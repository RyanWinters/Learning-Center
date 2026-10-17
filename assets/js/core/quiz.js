/* Quiz grading, completion rules and the Leitner review queue. */
(function () {
  const LC = window.LC = window.LC || {};
  const PASS = 70, TESTOUT = 80, BOX_DAYS = [1, 2, 4, 8, 16];
  const DONE = { complete: 1, 'tested-out': 1 };

  function grade(lesson, answers) {
    const qs = lesson.quiz || [];
    const per = qs.map((q, i) => answers[i] === q.answer);
    const correct = per.filter(Boolean).length;
    return { correct: correct, total: qs.length, pct: qs.length ? Math.round(100 * correct / qs.length) : 0, per: per };
  }
  function dueDate(days) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
    return d.getTime();
  }

  /* Record a finished quiz. opts.testout runs the cold-quiz rules. */
  function record(id, answers, opts) {
    opts = opts || {};
    const L = LC.lessons[id]; if (!L) return null;
    const g = grade(L, answers);
    let firstCorrect = 0, perfectFirst = false, newCards = 0, testedOut = false, wasDone = false;
    LC.store.update(d => {
      const r = d.lessons[id] = d.lessons[id] || { attempts: 0, startedAt: Date.now() };
      wasDone = !!DONE[r.status];
      r.attempts = (r.attempts || 0) + 1;
      r.bestScore = Math.max(r.bestScore || 0, g.pct);
      r.lastScore = g.pct;
      r.qDone = r.qDone || {};
      g.per.forEach((ok, i) => {
        if (ok) { if (!r.qDone[i]) { r.qDone[i] = 1; firstCorrect++; } }
        else { d.cards[id + ':' + i] = { lessonId: id, q: i, box: 1, due: dueDate(BOX_DAYS[0]) }; newCards++; }
      });
      if (g.pct === 100 && !r.perfectAwarded) { r.perfectAwarded = 1; perfectFirst = true; }
      if (opts.testout) {
        if (g.pct >= TESTOUT && !DONE[r.status]) { r.status = 'tested-out'; r.completedAt = Date.now(); testedOut = true; }
      } else if (g.pct >= PASS) r.quizPassed = true;
      if (!r.status || r.status === 'available') r.status = 'in-progress';
    });
    let xp = firstCorrect * 10;
    LC.gamify.addXp(firstCorrect * 10, 'Quiz');
    if (perfectFirst) { LC.gamify.addXp(25, 'Perfect score'); xp += 25; }
    if (testedOut) { LC.gamify.addXp(30, 'Tested out'); xp += 30; }
    const completed = !opts.testout && g.pct >= PASS ? maybeComplete(id) : 0;
    if (completed) xp += completed;
    LC.gamify.checkBadges();
    return { pct: g.pct, correct: g.correct, total: g.total, per: g.per, xp: xp, passed: g.pct >= (opts.testout ? TESTOUT : PASS), testedOut: testedOut, completed: !!completed, perfect: g.pct === 100, newCards: newCards, firstCorrect: firstCorrect };
  }

  /* Complete = reader reached the end AND quiz >= 70. Returns XP awarded (0 if not completed now). */
  function maybeComplete(id) {
    const r = LC.store.lesson(id), L = LC.lessons[id];
    if (!r || DONE[r.status] || !r.readAt) return 0;
    if (L && L.quiz && L.quiz.length && !(r.quizPassed || r.bestScore >= PASS)) return 0;
    const lvl = (LC.index[id] || {}).level || 1, xp = 40 + 10 * lvl;
    LC.store.update(d => { const x = d.lessons[id]; x.status = 'complete'; x.completedAt = Date.now(); });
    LC.gamify.addXp(xp, 'Lesson complete');
    LC.gamify.checkBadges();
    return xp;
  }
  function markRead(id) {
    const r = LC.store.lesson(id);
    if (!r.readAt) LC.store.update(d => { const x = d.lessons[id] = d.lessons[id] || { attempts: 0, startedAt: Date.now() }; x.readAt = Date.now(); if (!x.status || x.status === 'available') x.status = 'in-progress'; });
    return maybeComplete(id);
  }

  /* ---- review queue ---- */
  function allCards() { return Object.keys(LC.store.get().cards).map(k => Object.assign({ key: k }, LC.store.get().cards[k])).filter(c => !c.reset && c.lessonId); }
  function due(now) {
    now = now || Date.now();
    return allCards().filter(c => c.due <= now).sort((a, b) => a.due - b.due || a.box - b.box);
  }
  function answerCard(key, ok) {
    LC.store.update(d => {
      const c = d.cards[key]; if (!c) return;
      c.box = ok ? Math.min(5, c.box + 1) : 1;
      c.due = dueDate(BOX_DAYS[c.box - 1]);
      if (ok) d.stats.reviewCorrect = (d.stats.reviewCorrect || 0) + 1;
    });
    if (ok) { LC.gamify.addXp(5, 'Review'); LC.gamify.checkBadges(); }
  }
  function nextDue() {
    const c = allCards().sort((a, b) => a.due - b.due)[0];
    return c ? c.due : null;
  }

  LC.quiz = { PASS: PASS, TESTOUT: TESTOUT, BOX_DAYS: BOX_DAYS, grade: grade, record: record, maybeComplete: maybeComplete, markRead: markRead, allCards: allCards, due: due, answerCard: answerCard, nextDue: nextDue };
})();
