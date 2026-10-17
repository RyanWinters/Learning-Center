/* Hash router. */
(function () {
  const LC = window.LC = window.LC || {};
  const ROUTES = [
    [/^\/?$/, 'home', []],
    [/^\/tracks$/, 'tracks', []],
    [/^\/track\/([^/]+)$/, 'track', ['id']],
    [/^\/map(?:\/([^/]+))?$/, 'map', ['id']],
    [/^\/lesson\/([^/]+)$/, 'lesson', ['id']],
    [/^\/lesson\/([^/]+)\/quiz$/, 'quiz', ['id']],
    [/^\/lesson\/([^/]+)\/testout$/, 'quiz', ['id'], { testout: true }],
    [/^\/review$/, 'review', []],
    [/^\/glossary(?:\/([^/]+))?$/, 'glossary', ['id']],
    [/^\/search(?:\/(.*))?$/, 'search', ['q']],
    [/^\/lab(?:\/([^/]+))?$/, 'lab', ['id']],
    [/^\/profile$/, 'profile', []]
  ];
  function parse(hash) {
    const path = (hash == null ? location.hash : hash).replace(/^#/, '') || '/';
    for (const r of ROUTES) {
      const m = path.match(r[0]);
      if (m) {
        const p = Object.assign({ name: r[1], path: path }, r[3] || {});
        r[2].forEach((k, i) => { p[k] = m[i + 1] ? decodeURIComponent(m[i + 1]) : null; });
        return p;
      }
    }
    return { name: 'notfound', path: path };
  }
  function go(path) { location.hash = '#' + path; }
  function start(handler) {
    window.addEventListener('hashchange', () => handler(parse()));
    handler(parse());
  }
  LC.router = { parse: parse, go: go, start: start };
})();
