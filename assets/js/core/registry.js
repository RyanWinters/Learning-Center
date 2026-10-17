/* Registry: content registration, curriculum index and on-demand loading. */
(function () {
  const LC = window.LC = window.LC || {};
  LC.lessons = {};
  LC.terms = {};
  LC.sims = {};
  LC.views = LC.views || {};
  LC.missing = {};          // lesson ids whose file 404'd ("coming soon")
  LC._glDirty = true;

  LC.lesson = function (obj) { LC.lessons[obj.id] = obj; };
  LC.glossary = function (arr) {
    (arr || []).forEach(function (t) { if (t && t.id && !LC.terms[t.id]) LC.terms[t.id] = t; });
    LC._glDirty = true;
  };
  LC.sim = function (obj) { LC.sims[obj.id] = obj; };

  // Curriculum index: id -> { id, title, prereqs, minutes, level, track, order }
  LC.index = {};
  LC.trackById = {};
  LC.trackLessons = {};
  (LC.tracks || []).forEach(function (t) { LC.trackById[t.id] = t; LC.trackLessons[t.id] = []; });
  (LC.lessonIndex || []).forEach(function (r, i) {
    const track = r[0].split('-')[0];
    const m = { id: r[0], title: r[1], prereqs: r[2] || [], minutes: r[3], level: r[4], track: track, order: i };
    LC.index[m.id] = m;
    if (LC.trackLessons[track]) LC.trackLessons[track].push(m.id);
  });

  LC.loadScript = function (src) {
    return new Promise(function (resolve) {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(true); };
      s.onerror = function () { s.remove(); resolve(false); };
      document.head.appendChild(s);
    });
  };

  const pending = {};
  LC.loadLesson = function (id) {
    if (LC.lessons[id]) return Promise.resolve(LC.lessons[id]);
    if (LC.missing[id]) return Promise.resolve(null);
    if (!pending[id]) {
      pending[id] = LC.loadScript('content/lessons/' + id + '.js').then(function (ok) {
        delete pending[id];
        if (!ok || !LC.lessons[id]) { LC.missing[id] = true; return null; }
        return LC.lessons[id];
      });
    }
    return pending[id];
  };

  // Load many lessons with limited concurrency (used by search).
  let allPromise = null;
  LC.loadAllLessons = function () {
    if (allPromise) return allPromise;
    const ids = Object.keys(LC.index).filter(function (id) { return !LC.lessons[id] && !LC.missing[id]; });
    let i = 0;
    function worker() {
      if (i >= ids.length) return Promise.resolve();
      return LC.loadLesson(ids[i++]).then(worker);
    }
    allPromise = Promise.all([worker(), worker(), worker(), worker(), worker()]);
    return allPromise;
  };
})();
