/* Progress store. The server is the source of truth; localStorage is a cache.
   Merge rule mirrors server.py: per-item newest updatedAt wins inside
   lessons/sims/cards/badges; the newer document wins for scalars. */
(function () {
  const LC = window.LC = window.LC || {};
  const KEY = 'lc.v1';
  const MAPS = ['lessons', 'sims', 'cards', 'badges'];
  const BACKOFF = [2000, 5000, 15000, 60000];
  let doc = null, snap = null;
  let timer = null, retryTimer = null, retry = 0, inflight = false, dirty = false;
  let syncState = 'synced';
  const handlers = { change: [], sync: [] };

  function blank() {
    return {
      version: 1, updatedAt: 0, xp: 0,
      streak: { count: 0, lastDay: null }, daily: { day: null, xp: 0 },
      history: {}, stats: { reviewCorrect: 0 },
      settings: { theme: 'system', eli5Default: false, dailyGoal: 100, updatedAt: 0 },
      lessons: {}, sims: {}, cards: {}, badges: {}
    };
  }
  function normalize(d) {
    const b = blank();
    const o = Object.assign(b, d || {});
    o.settings = Object.assign(blank().settings, (d && d.settings) || {});
    o.streak = Object.assign(blank().streak, (d && d.streak) || {});
    o.daily = Object.assign(blank().daily, (d && d.daily) || {});
    o.stats = Object.assign(blank().stats, (d && d.stats) || {});
    o.history = (d && d.history) || {};
    MAPS.forEach(k => { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; });
    return o;
  }
  function newer(a, b) {            // b wins ties, like the server
    if (!a || typeof a !== 'object') return b;
    if (!b || typeof b !== 'object') return a;
    return (a.updatedAt || 0) > (b.updatedAt || 0) ? a : b;
  }
  function merge(server, client) {
    if (!server || !Object.keys(server).length) return client;
    const out = Object.assign({}, newer(server, client));
    MAPS.forEach(k => {
      const s = server[k] || {}, c = client[k] || {}, m = {};
      Object.keys(s).concat(Object.keys(c)).forEach(id => { m[id] = newer(s[id], c[id]); });
      out[k] = m;
    });
    out.updatedAt = Math.max(server.updatedAt || 0, client.updatedAt || 0);
    return out;
  }

  function readCache() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function writeCache() { try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch (e) {} }
  function emit(type, arg) { handlers[type].forEach(f => { try { f(arg); } catch (e) { console.error(e); } }); }
  function takeSnap() {
    snap = {};
    MAPS.forEach(k => { snap[k] = {}; Object.keys(doc[k]).forEach(id => { snap[k][id] = JSON.stringify(doc[k][id]); }); });
  }
  function setSync(s) { if (s !== syncState) { syncState = s; emit('sync', s); } }

  /* ---- network ---- */
  function fetchT(url, opts, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms || 6000);
    return fetch(url, Object.assign({ signal: ctl && ctl.signal }, opts)).finally(() => clearTimeout(t));
  }
  function adopt(serverDoc) {
    const before = JSON.stringify(doc);
    doc = normalize(merge(normalize(serverDoc), doc));
    takeSnap(); writeCache();
    if (JSON.stringify(doc) !== before) emit('change', { remote: true });
  }
  function schedule() {
    setSync('pending');
    clearTimeout(timer);
    timer = setTimeout(push, 800);
  }
  function push(keepalive) {
    if (inflight) { dirty = true; return Promise.resolve(); }
    inflight = true; dirty = false;
    clearTimeout(timer); clearTimeout(retryTimer);
    const body = JSON.stringify(doc);
    return fetchT('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: !!keepalive && body.length < 60000 })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(s => { inflight = false; retry = 0; adopt(s); setSync(dirty ? 'pending' : 'synced'); if (dirty) push(); })
      .catch(() => {
        inflight = false; setSync('offline');
        const wait = BACKOFF[Math.min(retry++, BACKOFF.length - 1)];
        retryTimer = setTimeout(push, wait);
      });
  }

  /* ---- public ---- */
  const store = {
    get: () => doc,
    syncState: () => syncState,
    on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    off(type, fn) { handlers[type] = (handlers[type] || []).filter(f => f !== fn); },

    init() {
      doc = normalize(readCache());
      takeSnap();
      return fetchT('/api/progress', {}, 4000)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(s => {
          const serverAt = (s && s.updatedAt) || 0;
          if (s && Object.keys(s).length) { doc = normalize(merge(normalize(s), doc)); takeSnap(); writeCache(); }
          setSync('synced');
          if (doc.updatedAt > serverAt) schedule();
        })
        .catch(() => { setSync('offline'); retryTimer = setTimeout(push, BACKOFF[0]); });
    },

    /* Mutate the document inside fn(doc). Changed items get a fresh updatedAt. */
    update(fn) {
      const now = Math.max(Date.now(), (doc.updatedAt || 0) + 1);
      fn(doc);
      MAPS.forEach(k => {
        Object.keys(doc[k]).forEach(id => {
          if (JSON.stringify(doc[k][id]) !== snap[k][id]) doc[k][id].updatedAt = now;
        });
      });
      doc.updatedAt = now;
      takeSnap(); writeCache();
      emit('change', {});
      schedule();
    },
    setting(key, value) {
      store.update(d => { d.settings[key] = value; d.settings.updatedAt = Date.now(); });
    },
    lesson(id) { return doc.lessons[id] || {}; },
    sim(id) { return doc.sims[id] || {}; },

    setLessonStatus(id, status) {
      store.update(d => {
        const r = d.lessons[id] = d.lessons[id] || { attempts: 0, startedAt: Date.now() };
        r.status = status;
        if (status === 'complete' && !r.completedAt) r.completedAt = Date.now();
      });
    },
    recordQuiz(id, answers, opts) { return LC.quiz.record(id, answers, opts); },

    recordSim(id, o) {
      o = o || {};
      let xp = 0, first = false;
      store.update(d => {
        const r = d.sims[id] = d.sims[id] || { status: 'started', hintsUsed: 0 };
        r.hintsUsed = Math.max(r.hintsUsed || 0, o.hintsUsed || 0);
        if (o.passed && r.status !== 'passed') {
          r.status = 'passed'; r.passedAt = Date.now(); first = true;
          xp = Math.max(20, 60 - 10 * (o.hintsUsed || 0));
        }
      });
      if (first) { LC.gamify.addXp(xp, 'Simulator challenge passed'); LC.gamify.checkBadges(); }
      return xp;
    },
    saveSimProgram(id, text) {
      store.update(d => {
        const r = d.sims[id] = d.sims[id] || { status: 'started', hintsUsed: 0 };
        r.program = text;
      });
    },

    syncNow() { return push(); },
    /* The server merges per item, so a reset must overwrite every record with a newer tombstone. */
    reset() {
      const old = doc, now = Math.max(Date.now(), old.updatedAt || 0) + 1;
      doc = normalize({ settings: old.settings });
      MAPS.forEach(k => Object.keys(old[k]).forEach(id => { doc[k][id] = { reset: true, updatedAt: now }; }));
      doc.updatedAt = now;
      takeSnap(); writeCache();
      emit('change', {});
      return push();
    }
  };
  LC.store = store;

  document.addEventListener('visibilitychange', () => {
    if (!doc) return;
    if (document.visibilityState === 'visible') push();
    else if (syncState !== 'synced') push(true);
  });
  window.addEventListener('online', () => { if (doc) push(); });
})();
