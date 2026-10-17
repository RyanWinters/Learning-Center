/* Quiz screen (also used for test-out) and the shared question component. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon, KEYS = 'ABCDE';

  /* Shared question UI. onAnswer(chosenIndex, isCorrect) fires once. */
  function question(el, q, onAnswer) {
    let answered = false;
    el.innerHTML = '<div class="qcard"><p class="q-text">' + LC.md.inline(q.q) + '</p><div class="opts" role="radiogroup" aria-label="Answer choices">' +
      q.options.map((o, i) => '<button type="button" class="opt" role="radio" aria-checked="false" data-i="' + i + '"><span class="opt-key">' + KEYS[i] + '</span><span class="opt-text">' + LC.md.inline(o) + '</span><span class="opt-mark"></span></button>').join('') +
      '</div><div class="explain" aria-live="polite" hidden></div></div>';
    LC.glossaryLink(el);
    const btns = Array.from(el.querySelectorAll('.opt'));
    function choose(i) {
      if (answered) return; answered = true;
      const ok = i === q.answer;
      btns.forEach((b, k) => {
        b.classList.add('locked');
        b.setAttribute('aria-checked', k === i);
        if (k === i) { b.classList.add(ok ? 'is-right' : 'is-wrong'); b.querySelector('.opt-mark').innerHTML = icon(ok ? 'check' : 'x', 18); }
        else if (k === q.answer) { b.classList.add('is-answer'); b.querySelector('.opt-mark').innerHTML = icon('check', 18); }
      });
      const ex = q.explain || [];
      const ox = el.querySelector('.explain');
      ox.className = 'explain ' + (ok ? 'explain-ok' : 'explain-bad');
      ox.innerHTML = '<p class="explain-h">' + icon(ok ? 'check' : 'x', 16) + (ok ? 'Correct' : 'Not quite') + '</p>' +
        '<p>' + LC.md.inline(ex[i] || '') + '</p>' +
        (ok ? '' : '<p class="explain-h explain-h2">' + icon('check', 16) + 'The answer is ' + KEYS[q.answer] + '</p><p>' + LC.md.inline(ex[q.answer] || q.options[q.answer]) + '</p>');
      ox.hidden = false;
      LC.glossaryLink(ox);
      onAnswer(i, ok);
    }
    el.addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) choose(+b.dataset.i); });
    function key(e) {
      if (answered || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= q.options.length) choose(n - 1);
    }
    document.addEventListener('keydown', key);
    LC.onLeave(() => document.removeEventListener('keydown', key));
    return { stop: () => document.removeEventListener('keydown', key) };
  }
  LC.questionUI = question;

  LC.views.quiz = async function (root, p) {
    const id = p.id, m = LC.index[id], testout = !!p.testout;
    if (!m) { root.innerHTML = '<div class="page"><div class="empty"><h1>Unknown lesson</h1><a class="btn" href="#/tracks">Tracks</a></div></div>'; return; }
    root.innerHTML = '<div class="qwrap"><div class="skeleton"><i></i><i></i></div></div>';
    const L = await LC.loadLesson(id);
    if (!p.alive()) return;
    if (!L || !(L.quiz || []).length) {
      root.innerHTML = '<div class="page"><div class="empty"><div class="empty-ic">' + icon('clock', 36) + '</div><h1>' + (L ? 'No quiz yet' : 'Coming soon') + '</h1><p class="muted">' + esc(m.title) + ' has no questions to take yet.</p><a class="btn" href="#/lesson/' + id + '">Back to lesson</a></div></div>';
      return;
    }
    const qs = L.quiz;
    let idx = 0, answers = [], stopQ = null;

    function frame(inner, step) {
      root.innerHTML = '<div class="qwrap"><header class="qhead"><a class="icon-btn" href="#/lesson/' + id + '" aria-label="Leave quiz">' + icon('x', 22) + '</a>' +
        '<div class="qhead-mid"><span class="eyebrow">' + (testout ? 'Test out' : 'Quiz') + ' · ' + esc(m.title) + '</span>' +
        (step ? '<div class="steps-bar" aria-label="Question ' + (idx + 1) + ' of ' + qs.length + '">' + qs.map((_, i) => '<i class="' + (i < idx ? 'done' : i === idx ? 'now' : '') + '"></i>').join('') + '</div>' : '') + '</div>' +
        (step ? '<span class="qcount num">' + (idx + 1) + '/' + qs.length + '</span>' : '<span></span>') + '</header>' + inner + '</div>';
    }

    function show() {
      frame('<div class="qbody"><div id="qslot"></div></div><div class="qfoot"><button type="button" class="btn btn-primary btn-block" id="qnext" disabled>Check an answer</button></div>', true);
      if (idx === 0 && testout) root.querySelector('#qslot').insertAdjacentHTML('beforebegin', '<p class="testout-note">' + icon('target', 16) + 'Cold quiz. Score ' + LC.quiz.TESTOUT + '% or more to mark this lesson as tested out and earn XP.</p>');
      const next = root.querySelector('#qnext');
      if (stopQ) stopQ.stop();
      stopQ = question(root.querySelector('#qslot'), qs[idx], (i) => {
        answers[idx] = i;
        next.disabled = false;
        next.innerHTML = idx === qs.length - 1 ? 'See results' + icon('right', 16) : 'Next question' + icon('right', 16);
        next.focus({ preventScroll: true });
      });
      next.addEventListener('click', () => { if (idx < qs.length - 1) { idx++; show(); window.scrollTo(0, 0); } else finish(); });
    }

    function finish() {
      const r = LC.store.recordQuiz(id, answers, { testout: testout });
      const li = LC.store.lesson(id);
      const nextId = (function () { const t = LC.graph.lessonsIn(m.track), i = t.indexOf(id); return i < t.length - 1 ? t[i + 1] : null; })();
      const missed = qs.map((q, i) => ({ q: q, i: i })).filter(x => !r.per[x.i]);
      const ok = r.passed;
      const head = testout ? (ok ? 'Tested out' : 'Not this time') : (ok ? 'Passed' : 'Not yet');
      const sub = testout
        ? (ok ? 'You know this one. It now counts toward unlocking what follows.' : 'You needed ' + LC.quiz.TESTOUT + '%. Read the lesson, then take the regular quiz.')
        : (ok ? (r.completed ? 'Lesson complete.' : (li.readAt ? '' : 'Quiz passed. Finish reading to complete the lesson.')) : 'You need ' + LC.quiz.PASS + '% to pass. The misses are in your review queue.');
      frame('<div class="qbody result"><div class="result-top">' + U.ring(r.pct / 100, 148, 12, '<span class="ring-num ring-big num">' + r.pct + '%</span><span class="ring-sub num">' + r.correct + ' of ' + r.total + '</span>') + '</div>' +
        '<h1 class="result-h ' + (ok ? 'is-pass' : 'is-miss') + '">' + head + '</h1><p class="muted result-sub">' + sub + '</p>' +
        '<ul class="result-stats">' + '<li><span class="eyebrow">XP earned</span><b class="num xp">+' + r.xp + '</b></li>' +
        '<li><span class="eyebrow">Best score</span><b class="num">' + li.bestScore + '%</b></li>' +
        '<li><span class="eyebrow">To review</span><b class="num">' + r.newCards + '</b></li></ul>' +
        (ok && !testout && !r.completed && !li.readAt ? '<div class="result-note">' + icon('note', 18) + '<span>Reading counts too. <button type="button" class="linkbtn" id="markread">Mark as read and complete</button></span></div>' : '') +
        (missed.length ? '<section class="missed"><h2 class="label">Review these</h2>' + missed.map(x => '<div class="missed-i"><p class="q-text">' + LC.md.inline(x.q.q) + '</p><p class="missed-a">' + icon('check', 16) + '<span>' + LC.md.inline(x.q.options[x.q.answer]) + '</span></p></div>').join('') + '</section>' : '') +
        '</div><div class="qfoot qfoot-r"><div class="result-actions">' +
        (ok ? (nextId ? '<a class="btn btn-primary" href="#/lesson/' + nextId + '">Next lesson' + icon('right', 16) + '</a>' : '<a class="btn btn-primary" href="#/track/' + m.track + '">Back to track</a>') : '<a class="btn btn-primary" href="#/lesson/' + id + (testout ? '' : '/quiz') + '" id="retry">' + (testout ? 'Read the lesson' : 'Try again') + '</a>') +
        '<a class="btn" href="#/lesson/' + id + '">Back to lesson</a>' + (r.newCards ? '<a class="btn btn-ghost" href="#/review">Review cards</a>' : '') + '</div></div>', false);
      LC.glossaryLink(root.querySelector('.missed'));
      const mr = root.querySelector('#markread');
      if (mr) mr.addEventListener('click', () => { LC.quiz.markRead(id); finishAgain(); });
      const rt = root.querySelector('#retry');
      if (rt && !testout) rt.addEventListener('click', e => { e.preventDefault(); idx = 0; answers = []; show(); window.scrollTo(0, 0); });
      window.scrollTo(0, 0);
    }
    function finishAgain() { root.querySelector('#markread').closest('.result-note').innerHTML = icon('check', 18) + '<span>Lesson complete.</span>'; }
    show();
  };
})();
