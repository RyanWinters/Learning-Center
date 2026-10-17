/* App shell: navigation chrome, theme, route dispatch, boot. */
(function () {
  const LC = window.LC = window.LC || {};
  const U = LC.ui, esc = U.esc, icon = U.icon;
  let token = 0, current = null;

  const NAV = [
    ['home', '#/', 'Home', 'home'],
    ['tracks', '#/tracks', 'Tracks', 'tracks'],
    ['map', '#/map', 'Skill map', 'map'],
    ['lab', '#/lab', 'Lab', 'lab'],
    ['review', '#/review', 'Review', 'review'],
    ['glossary', '#/glossary', 'Glossary', 'book'],
    ['profile', '#/profile', 'Profile', 'user']
  ];
  const TAB_FOR = { home: 'home', tracks: 'tracks', track: 'tracks', lesson: 'tracks', quiz: 'tracks', lab: 'lab', review: 'review' };
  const RAIL_FOR = { track: 'tracks', lesson: 'tracks', quiz: 'tracks' };

  function applyTheme() {
    const t = LC.store.get().settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  function shell() {
    const mark = '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><rect width="32" height="32" rx="6" class="bm-bg"/><path d="M8 22V10h4v8h6v4zM20 10h4v12h-4z" class="bm-fg"/></svg>';
    document.getElementById('app').innerHTML =
      '<a class="skip" href="#view" data-skip>Skip to content</a>' +
      '<aside class="rail" aria-label="Primary">' +
        '<a class="brand" href="#/">' + mark + '<span class="brand-name">Learning<br>Center</span></a>' +
        '<form class="rail-search" role="search" data-search-form>' + icon('search', 18) + '<input type="search" id="railQ" placeholder="Search" aria-label="Search lessons and terms" autocomplete="off" spellcheck="false"><kbd>/</kbd></form>' +
        '<nav class="rail-nav">' + NAV.map(n => '<a href="' + n[1] + '" data-nav="' + n[0] + '">' + icon(n[3], 20) + '<span>' + n[2] + '</span>' + (n[0] === 'review' ? '<b class="count" data-due hidden></b>' : '') + '</a>').join('') + '</nav>' +
        '<div class="rail-foot"><div id="railLevel"></div><div class="sync" id="syncInd"></div></div>' +
      '</aside>' +
      '<div class="main">' +
        '<header class="topbar"><a class="brand-sm" href="#/">' + mark + '<span>Learning Center</span></a><span class="grow"></span>' +
          '<span class="sync-sm" id="syncSm" hidden></span><span class="pill pill-streak" id="pillStreak"></span><span class="pill pill-xp" id="pillXp"></span>' +
          '<a class="icon-btn" href="#/search" aria-label="Search">' + icon('search', 22) + '</a></header>' +
        '<main id="view" class="view" tabindex="-1"></main>' +
      '</div>' +
      '<nav class="tabbar" aria-label="Primary">' +
        [['home', '#/', 'Home', 'home'], ['tracks', '#/tracks', 'Tracks', 'tracks'], ['lab', '#/lab', 'Lab', 'lab'], ['review', '#/review', 'Review', 'review']].map(n => '<a href="' + n[1] + '" data-tab="' + n[0] + '">' + icon(n[3], 22) + '<span>' + n[2] + '</span>' + (n[0] === 'review' ? '<b class="count" data-due hidden></b>' : '') + '</a>').join('') +
        '<button type="button" data-tab="more" data-more>' + icon('more', 22) + '<span>More</span></button></nav>';

    const form = document.querySelector('[data-search-form]'), input = document.getElementById('railQ');
    let t;
    form.addEventListener('submit', e => { e.preventDefault(); go(input.value); });
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => go(input.value), 220); });
    function go(q) {
      q = q.trim(); const h = '#/search/' + encodeURIComponent(q);
      if (!q) { if (current && current.name === 'search') location.replace('#/search'); return; }
      if (current && current.name === 'search') location.replace(h); else location.hash = h;
    }
    document.querySelector('[data-more]').addEventListener('click', openMore);
  }

  function openMore() {
    const th = LC.store.get().settings.theme;
    const seg = (v, label, ic) => '<button type="button" class="seg-btn" data-theme-set="' + v + '" aria-pressed="' + (th === v) + '">' + icon(ic, 16) + label + '</button>';
    U.sheet('<h2 class="sheet-title">More</h2><nav class="more-list">' +
      [['#/map', 'Skill map', 'map'], ['#/glossary', 'Glossary', 'book'], ['#/profile', 'Profile and settings', 'user'], ['#/search', 'Search', 'search']].map(n => '<a href="' + n[0] + '">' + icon(n[2], 20) + '<span>' + n[1] + '</span>' + icon('chev', 18) + '</a>').join('') +
      '</nav><div class="more-theme"><span class="eyebrow">Theme</span><div class="seg" role="group" aria-label="Theme">' + seg('system', 'Auto', 'spark') + seg('light', 'Light', 'sun') + seg('dark', 'Dark', 'moon') + '</div></div>', { label: 'More' });
  }

  function chrome() {
    const s = LC.store.get(), li = LC.gamify.levelInfo(s.xp), streak = LC.gamify.streak(), due = LC.quiz.due().length;
    const q = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
    q('[data-due]', el => { el.hidden = !due; el.textContent = due > 99 ? '99+' : due; });
    const ps = document.getElementById('pillStreak'), px = document.getElementById('pillXp');
    if (ps) { ps.innerHTML = icon('flame', 16) + '<b>' + streak + '</b>'; ps.title = streak + ' day streak'; ps.classList.toggle('is-off', !streak); }
    if (px) { px.innerHTML = icon('bolt', 16) + '<b>' + s.xp.toLocaleString() + '</b>'; px.title = 'Level ' + li.n + ', ' + li.title; }
    const rl = document.getElementById('railLevel');
    if (rl) rl.innerHTML = '<div class="rl-top"><span class="rl-n">' + li.n + '</span><span class="rl-t"><span class="eyebrow">Level</span><span class="rl-title">' + esc(li.title) + '</span></span></div>' +
      '<div class="bar bar-xp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(li.pct * 100) + '" aria-label="XP to next level"><i style="width:' + (li.pct * 100).toFixed(1) + '%"></i></div>' +
      '<div class="rl-sub num"><span>' + s.xp.toLocaleString() + ' XP</span><span>' + (li.ceil ? li.toNext.toLocaleString() + ' to go' : 'Max level') + '</span></div>' +
      '<div class="rl-row">' + icon('flame', 15) + '<span class="num">' + streak + '</span> day streak</div>';
  }
  function syncIndicator() {
    const st = LC.store.syncState();
    const map = { synced: ['cloud', 'Synced'], pending: ['review', 'Saving'], offline: ['cloudoff', 'Offline, will sync'] };
    const m = map[st];
    const el = document.getElementById('syncInd'), sm = document.getElementById('syncSm');
    if (el) { el.className = 'sync sync-' + st; el.innerHTML = icon(m[0], 15) + '<span>' + m[1] + '</span>'; }
    if (sm) { sm.hidden = st !== 'offline'; sm.className = 'sync-sm sync-' + st; sm.innerHTML = icon('cloudoff', 16) + '<span>Offline</span>'; }
  }

  function markNav(p) {
    const name = p.name;
    document.body.className = 'route-' + name + (name === 'quiz' ? ' focus' : '');
    document.querySelectorAll('[data-nav]').forEach(a => { const on = a.dataset.nav === (RAIL_FOR[name] || name); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const tab = TAB_FOR[name] || 'more';
    document.querySelectorAll('[data-tab]').forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle('on', on); if (a.tagName === 'A') { if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); } });
    const rq = document.getElementById('railQ');
    if (rq && name !== 'search' && rq.value) rq.value = '';
    if (rq && name === 'search' && p.q != null && document.activeElement !== rq) rq.value = p.q;
  }

  const leave = [];
  LC.onLeave = fn => leave.push(fn);

  async function dispatch(p, soft) {
    while (leave.length) { try { leave.pop()(); } catch (e) {} }
    current = p;
    const my = ++token;
    markNav(p);
    const view = document.getElementById('view');
    if (!soft) window.scrollTo(0, 0);
    view.className = 'view v-' + p.name;
    view.innerHTML = '';
    const fn = p.name === 'track' ? LC.views.track : LC.views[p.name];
    p.alive = () => my === token;
    try {
      if (p.name === 'lab' && !LC.views.lab) view.innerHTML = labPlaceholder();
      else if (!fn) view.innerHTML = notFound(p.path);
      else if (p.name === 'lab') await LC.views.lab(view, { id: p.id });
      else await fn(view, p);
    } catch (e) {
      console.error(e);
      view.innerHTML = '<div class="page"><div class="empty"><h1>Something broke</h1><p class="muted">' + esc(e.message) + '</p><a class="btn" href="#/">Go home</a></div></div>';
    }
    if (my === token) {
      if (!soft && p.name !== 'lesson') view.classList.add('v-in');
      chrome();
    }
  }
  function notFound(path) {
    return '<div class="page"><div class="empty"><div class="empty-ic">' + icon('map', 36) + '</div><h1>Nothing at ' + esc(path) + '</h1><p class="muted">That page does not exist.</p><a class="btn btn-primary" href="#/">Back home</a></div></div>';
  }
  function labPlaceholder() {
    return '<div class="page"><header class="page-head"><p class="eyebrow">Lab</p><h1>Ladder simulator</h1></header><div class="empty"><div class="empty-ic">' + icon('lab', 36) + '</div><h2>The simulator is still being wired in</h2><p class="muted">Challenges will appear here once it is ready. Your lessons and quizzes work in the meantime.</p><a class="btn btn-primary" href="#/tracks">Browse tracks</a></div></div>';
  }
  LC.rerender = function () { if (current) dispatch(Object.assign({}, current), true); };

  /* Global delegated handlers */
  document.addEventListener('click', e => {
    const th = e.target.closest('[data-theme-set]');
    if (th) { LC.store.setting('theme', th.dataset.themeSet); applyTheme(); document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', b === th)); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const text = cp.closest('.code').querySelector('code').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => { cp.textContent = 'Copied'; setTimeout(() => cp.textContent = 'Copy', 1400); }).catch(() => { cp.textContent = 'Press Ctrl+C'; });
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/input|textarea|select/i.test((e.target.tagName || '')) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const r = document.getElementById('railQ');
      if (r && r.offsetParent) r.focus(); else location.hash = '#/search';
    }
  });

  async function boot() {
    try {
      await LC.store.init();
    } catch (e) { console.error(e); }
    applyTheme();
    shell();
    syncIndicator();
    LC.store.on('sync', syncIndicator);
    LC.store.on('change', e => {
      chrome();
      if (e && e.remote && current && ['home', 'tracks', 'track', 'map', 'profile'].indexOf(current.name) >= 0) LC.rerender();
    });
    LC.store.on('change', e => { if (e && e.remote) applyTheme(); });
    chrome();
    LC.router.start(dispatch);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
