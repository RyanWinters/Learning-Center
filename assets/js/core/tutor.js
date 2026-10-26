/* Ask Claude: a tutor chat for the open lesson. server.py runs the Claude Code CLI on this PC.
   The chat for each lesson is kept in this browser so you can pick up where you left off. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;
  const KEY = id => 'lc.tutor.' + id;

  function load(id) { try { const v = JSON.parse(localStorage.getItem(KEY(id))); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function save(id, msgs) { try { localStorage.setItem(KEY(id), JSON.stringify(msgs)); } catch (e) {} }
  function clear(id) { try { localStorage.removeItem(KEY(id)); } catch (e) {} }

  /* The lesson as plain markdown: app markup becomes words, diagrams become their alt text. */
  function lessonText(L) {
    const plain = s => String(s || '')
      .replace(/\{\{term:[^|}]+\|([^}]+)\}\}/g, '$1')
      .replace(/\{\{term:([^}]+)\}\}/g, (_, t) => (LC.terms[t] ? LC.terms[t].term : t))
      .replace(/\{\{lesson:([^}]+)\}\}/g, (_, t) => '"' + (LC.index[t] ? LC.index[t].title : t) + '" (another lesson)')
      .replace(/\{\{diagram:([^}]+)\}\}/g, (_, d) => {
        const m = /aria-label="([^"]*)"/.exec((L.diagrams || {})[d] || '');
        return m ? '[Diagram: ' + m[1] + ']' : '';
      })
      .replace(/\{\{sim:[^}]+\}\}/g, '[Interactive simulator in the app]');
    const out = [];
    if (L.summary) out.push(plain(L.summary));
    if (L.objectives && L.objectives.length) out.push('## Objectives\n' + L.objectives.map(o => '- ' + plain(o)).join('\n'));
    out.push(plain(L.body));
    (L.examples || []).forEach(e => out.push('## Worked example: ' + e.title + '\n' + plain(e.body)));
    if (L.why) out.push('## Why it\'s done this way\n' + plain(L.why));
    if (L.pitfalls && L.pitfalls.length) out.push('## Common pitfalls\n' + L.pitfalls.map(p => '- ' + plain(p)).join('\n'));
    if (L.checklist && L.checklist.length) out.push('## Lab checklist\n' + L.checklist.map(p => '- ' + plain(p)).join('\n'));
    return out.join('\n\n');
  }

  function ask(L, title, msgs) {
    return fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-LC': '1' },
      body: JSON.stringify({ lesson: { title: title, text: lessonText(L) }, messages: msgs })
    }).then(r => r.json().catch(() => ({})).then(d => {
      if (r.ok && d.reply) return d.reply;
      throw new Error(d.error || (r.status === 404 || r.status === 501 ? 'The tutor needs the Learning Center server (server.py). It isn\'t available here.' : 'The server answered ' + r.status + '.'));
    }), () => { throw new Error('Couldn\'t reach the Learning Center server.'); });
  }

  LC.tutor = {
    lessonText: lessonText,
    open: function (L, m) {
      let msgs = load(m.id), busy = false, error = '';
      const sh = U.sheet(
        '<div class="tutor-head"><h2 class="sheet-title">' + icon('spark', 22) + 'Ask Claude</h2>' +
        '<button type="button" class="btn btn-sm btn-ghost" data-restart>' + icon('reset', 16) + 'Start over</button>' +
        '<button type="button" class="icon-btn" data-close aria-label="Close">' + icon('x', 22) + '</button></div>' +
        '<p class="muted small tutor-sub">Claude walks you through <b>' + esc(m.title) + '</b> one chunk at a time, with a quick check after each.</p>' +
        '<div class="tutor-log" aria-live="polite"></div>' +
        '<form class="tutor-form"><textarea rows="2" placeholder="Your answer or question" aria-label="Your answer or question"></textarea>' +
        '<button type="submit" class="btn btn-primary">Send</button></form>',
        { label: 'Ask Claude about ' + m.title });
      sh.el.classList.add('tutor');
      const log = sh.el.querySelector('.tutor-log'), form = sh.el.querySelector('.tutor-form'), ta = form.querySelector('textarea');

      function paint() {
        log.innerHTML = msgs.map(x => x.role === 'assistant'
          ? '<div class="tmsg tmsg-claude prose">' + LC.md.render(x.content, {}) + '</div>'
          : '<div class="tmsg tmsg-you">' + esc(x.content).replace(/\n/g, '<br>') + '</div>').join('') +
          (busy ? '<div class="tmsg tmsg-claude tmsg-wait muted">Claude is thinking<span class="dots"><i></i><i></i><i></i></span></div>' : '') +
          (error ? '<div class="tmsg tmsg-err">' + esc(error) + ' <button type="button" class="linkbtn" data-retry>Try again</button></div>' : '');
        form.querySelector('button').disabled = busy;
        // Long replies: show the start of Claude's latest message, not its end.
        const last = log.lastElementChild;
        log.scrollTop = last && last.classList.contains('prose') ? last.offsetTop - 4 : log.scrollHeight;
      }
      function next() {
        busy = true; error = ''; paint();
        ask(L, m.title, msgs).then(reply => {
          msgs.push({ role: 'assistant', content: reply }); save(m.id, msgs);
        }, e => { error = e.message; }).then(() => { busy = false; paint(); if (!error) ta.focus(); });
      }
      form.addEventListener('submit', e => {
        e.preventDefault();
        const t = ta.value.trim();
        if (!t || busy) return;
        msgs.push({ role: 'user', content: t }); save(m.id, msgs); ta.value = '';
        next();
      });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
      sh.el.addEventListener('click', e => {
        if (e.target.closest('[data-retry]')) next();
        else if (e.target.closest('[data-restart]') && !busy) { msgs = []; clear(m.id); next(); }
      });
      // A chat that ends on Ryan's message (closed mid-reply) or is empty needs Claude's turn.
      if (!msgs.length || msgs[msgs.length - 1].role === 'user') next(); else { paint(); ta.focus(); }
    }
  };
})();
