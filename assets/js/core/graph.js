/* Prerequisite graph: statuses, soft locks, recommendations. */
(function () {
  const LC = window.LC = window.LC || {};
  const DONE = { complete: 1, skipped: 1, 'tested-out': 1 };
  const STORED = { complete: 1, skipped: 1, 'tested-out': 1, 'in-progress': 1 };
  const readAnyway = new Set();

  function stored(id) { return (LC.store.get().lessons[id] || {}).status; }
  function isSatisfied(id) { return !!DONE[stored(id)]; }
  function unmet(id) {
    const m = LC.index[id]; if (!m) return [];
    return m.prereqs.filter(p => LC.index[p] && !isSatisfied(p));
  }
  function status(id) {
    const s = stored(id);
    if (STORED[s]) return s;
    return unmet(id).length ? 'locked' : 'available';
  }
  function lessonsIn(trackId) { return LC.trackLessons[trackId] || []; }
  function progress(trackId) {
    const ids = lessonsIn(trackId);
    let done = 0, skipped = 0, started = 0;
    ids.forEach(id => {
      const s = status(id);
      if (s === 'complete' || s === 'tested-out') done++;
      else if (s === 'skipped') skipped++;
      else if (s === 'in-progress') started++;
    });
    return { total: ids.length, done: done, skipped: skipped, started: started, pct: ids.length ? Math.round(100 * (done + skipped) / ids.length) : 0, learnedPct: ids.length ? Math.round(100 * done / ids.length) : 0 };
  }
  function trackComplete(trackId) {
    const ids = lessonsIn(trackId);
    return ids.length > 0 && ids.every(id => { const s = stored(id); return s === 'complete' || s === 'tested-out'; });
  }
  function dependents(id) { return Object.keys(LC.index).filter(k => LC.index[k].prereqs.indexOf(id) >= 0); }

  /* Column for the skill map: longest in-track prerequisite chain. */
  const depthMemo = {};
  function depth(id) {
    if (depthMemo[id] != null) return depthMemo[id];
    depthMemo[id] = 0;
    const m = LC.index[id];
    let d = 0;
    m.prereqs.forEach(p => { if (LC.index[p] && LC.index[p].track === m.track) d = Math.max(d, depth(p) + 1); });
    return (depthMemo[id] = d);
  }

  function trackStarted(t) {
    return lessonsIn(t).some(id => { const s = stored(id); return s && s !== 'available'; });
  }
  function upNext(n) {
    const c = Object.keys(LC.index).filter(id => status(id) === 'available' && !LC.missing[id]);
    c.sort((a, b) => {
      const A = LC.index[a], B = LC.index[b];
      const sa = trackStarted(A.track) ? 0 : 1, sb = trackStarted(B.track) ? 0 : 1;
      return (sa - sb) || (A.level - B.level) || (A.order - B.order);
    });
    return c.slice(0, n);
  }
  /* Home recommendations with a reason label: next lessons in started tracks, then an entry point per other track
     (available, or soft-locked only by Foundations lessons so experienced users can jump in). */
  function upNextWhy(n, exclude) {
    exclude = exclude || [];
    const out = [], seen = new Set(exclude);
    const trackOrder = (LC.tracks || []).map(t => t.id);
    const firstOpen = t => lessonsIn(t).find(id => status(id) === 'available' && !LC.missing[id] && !seen.has(id));
    trackOrder.filter(trackStarted).forEach(t => {
      const id = firstOpen(t);
      if (id) { seen.add(id); out.push({ id: id, why: 'Next in ' + LC.trackById[t].code }); }
    });
    trackOrder.filter(t => !trackStarted(t)).forEach(t => {
      const ids = lessonsIn(t);
      const id = ids.find(i => {
        if (seen.has(i) || LC.missing[i]) return false;
        const st = status(i);
        if (st === 'available') return true;
        return st === 'locked' && unmet(i).every(u => LC.index[u].track === 'found');
      });
      if (!id) return;
      seen.add(id);
      out.push({ id: id, why: t === 'found' ? 'Start of ' + LC.trackById[t].code : (unmet(id).length ? 'Jump in at ' + LC.trackById[t].code + ' · ' + skipsText(id) : 'Start of ' + LC.trackById[t].code) });
    });
    return out.slice(0, n);
  }
  /* "Skips: A, B" for a soft-locked lesson, so a shortcut always says what it leaves out. */
  function skipsText(id) {
    const u = unmet(id);
    if (!u.length) return '';
    return 'skips ' + u.slice(0, 2).map(x => LC.index[x].title).join(', ') + (u.length > 2 ? ' +' + (u.length - 2) + ' more' : '');
  }
  /* Last lesson the user actually opened. A lesson whose prerequisites are unmet only counts if it
     was opened (in-progress is only set by opening or reading it). */
  function continueLesson() {
    let best = null, at = -1;
    const L = LC.store.get().lessons;
    Object.keys(L).forEach(id => {
      const r = L[id];
      if (r.status !== 'in-progress' || !LC.index[id] || LC.missing[id]) return;
      if (unmet(id).length && !(r.startedAt || r.readAt || r.attempts)) return;
      if ((r.updatedAt || 0) > at) { best = id; at = r.updatedAt || 0; }
    });
    return best;
  }
  /* What to do after finishing a lesson: the next open lesson in its track, else the first "Up next" pick. */
  function nextAfter(id) {
    const m = LC.index[id]; if (!m) return null;
    const ids = lessonsIn(m.track), at = ids.indexOf(id);
    const open = i => i !== id && !LC.missing[i] && (status(i) === 'available' || status(i) === 'in-progress');
    const pick = ids.slice(at + 1).find(open) || ids.slice(0, at).find(open);
    if (pick) return { id: pick, why: 'Next in ' + LC.trackById[m.track].code };
    const alt = upNextWhy(4, [id])[0];
    return alt ? { id: alt.id, why: alt.why } : null;
  }
  function markStarted(id) {
    const s = stored(id);
    if (s && s !== 'available') return;
    LC.store.update(d => {
      const r = d.lessons[id] = d.lessons[id] || { attempts: 0 };
      r.status = 'in-progress'; r.startedAt = r.startedAt || Date.now();
    });
  }
  function skip(ids) {
    LC.store.update(d => {
      ids.forEach(id => {
        const r = d.lessons[id] = d.lessons[id] || { attempts: 0, startedAt: Date.now() };
        if (!DONE[r.status]) r.status = 'skipped';
      });
    });
    LC.gamify.checkBadges();
  }
  function unskip(id) {
    LC.store.update(d => { const r = d.lessons[id]; if (r && r.status === 'skipped') r.status = 'available'; });
  }

  LC.graph = { status: status, stored: stored, isSatisfied: isSatisfied, unmet: unmet, lessonsIn: lessonsIn, progress: progress, trackComplete: trackComplete, dependents: dependents, depth: depth, upNext: upNext, upNextWhy: upNextWhy, continueLesson: continueLesson, nextAfter: nextAfter, skipsText: skipsText, markStarted: markStarted, skip: skip, unskip: unskip, readAnyway: readAnyway };
})();
