/* Review queue: Leitner cards from missed quiz questions. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;

  function empty(root, cards) {
    const all = LC.quiz.allCards(), nd = LC.quiz.nextDue();
    const boxes = [0, 0, 0, 0, 0]; all.forEach(c => boxes[c.box - 1]++);
    const max = Math.max(1, Math.max.apply(null, boxes));
    const when = nd ? new Date(nd).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : null;
    root.innerHTML = '<div class="page page-narrow"><header class="page-head"><p class="eyebrow">Spaced review</p><h1>Review</h1></header>' +
      '<div class="empty">' + '<div class="empty-ic">' + icon(all.length ? 'check' : 'review', 36) + '</div>' +
      (all.length
        ? '<h2>Nothing due right now</h2><p class="muted">Next cards come up ' + esc(when) + '.</p>'
        : '<h2>No cards yet</h2><p class="muted">Every question you miss in a quiz lands here, then returns after 1, 2, 4, 8 and 16 days until it sticks.</p>') +
      '<a class="btn btn-primary" href="#/tracks">Keep learning</a></div>' +
      (all.length ? '<section class="sec"><div class="sec-head"><h2>Your boxes</h2></div><div class="boxes">' + boxes.map((n, i) => '<div class="box"><span class="box-bar"><i style="height:' + Math.round(100 * n / max) + '%"></i></span><b class="num">' + n + '</b><span class="eyebrow">Box ' + (i + 1) + '</span><span class="muted small">' + LC.quiz.BOX_DAYS[i] + ' d</span></div>').join('') + '</div></section>' : '') + '</div>';
  }

  LC.views.review = async function (root, p) {
    const queue = LC.quiz.due();
    if (!queue.length) { empty(root); return; }
    root.innerHTML = '<div class="qwrap"><div class="skeleton"><i></i><i></i></div></div>';
    await Promise.all(Array.from(new Set(queue.map(c => c.lessonId))).map(id => LC.loadLesson(id)));
    if (!p.alive()) return;
    const cards = queue.filter(c => LC.lessons[c.lessonId] && LC.lessons[c.lessonId].quiz[c.q]);
    if (!cards.length) { empty(root); return; }
    let i = 0, right = 0;

    function frame(inner, step) {
      root.innerHTML = '<div class="qwrap"><header class="qhead"><a class="icon-btn" href="#/review" data-exit aria-label="Close review">' + icon('x', 22) + '</a>' +
        '<div class="qhead-mid"><span class="eyebrow">Review · box ' + (step ? step.box : '') + '</span>' +
        '<div class="steps-bar">' + cards.map((_, k) => '<i class="' + (k < i ? 'done' : k === i ? 'now' : '') + '"></i>').join('') + '</div></div><span class="qcount num">' + (i + 1) + '/' + cards.length + '</span></header>' + inner + '</div>';
    }
    function show() {
      const c = cards[i], L = LC.lessons[c.lessonId], q = L.quiz[c.q];
      frame('<div class="qbody"><p class="review-from">From <a href="#/lesson/' + c.lessonId + '">' + esc(L.title) + '</a></p><div id="qslot"></div></div><div class="qfoot"><button type="button" class="btn btn-primary btn-block" id="qnext" disabled>Check an answer</button></div>', c);
      const next = root.querySelector('#qnext');
      LC.questionUI(root.querySelector('#qslot'), q, (ch, ok) => {
        LC.quiz.answerCard(c.key, ok); if (ok) right++;
        next.disabled = false; next.innerHTML = (i === cards.length - 1 ? 'Finish' : 'Next card') + icon('right', 16);
        next.focus({ preventScroll: true });
      });
      next.addEventListener('click', () => { if (i < cards.length - 1) { i++; show(); window.scrollTo(0, 0); } else done(); });
    }
    function done() {
      root.innerHTML = '<div class="page page-narrow"><div class="empty"><div class="empty-ic">' + icon('check', 36) + '</div><h1>Session done</h1><p class="muted num">' + right + ' of ' + cards.length + ' correct. Correct cards move up a box; misses start over at box 1.</p><div class="empty-actions"><a class="btn btn-primary" href="#/">Home</a><a class="btn" href="#/tracks">Keep learning</a></div></div></div>';
    }
    show();
  };
})();
