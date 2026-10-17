/* Search over lessons (title, tags, summary, objectives) and glossary terms. */
(function () {
  const LC = window.LC = window.LC || {};

  function run(q) {
    const toks = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return { lessons: [], terms: [] };
    const lessons = [], terms = [];
    Object.keys(LC.index).forEach(id => {
      const m = LC.index[id], L = LC.lessons[id];
      const title = m.title.toLowerCase();
      const tags = L ? (L.tags || []).join(' ').toLowerCase() : '';
      const sum = L ? (L.summary || '').toLowerCase() : '';
      const obj = L ? (L.objectives || []).join(' ').toLowerCase() : '';
      let score = 0;
      for (const t of toks) {
        let s = 0;
        if (title.indexOf(t) >= 0) s += title.startsWith(t) || title.indexOf(' ' + t) >= 0 ? 8 : 5;
        if (id.indexOf(t) >= 0) s += 2;
        if (tags.indexOf(t) >= 0) s += 4;
        if (sum.indexOf(t) >= 0) s += 2;
        if (obj.indexOf(t) >= 0) s += 1;
        if (!s) { score = 0; break; }
        score += s;
      }
      if (score) lessons.push({ id: id, score: score });
    });
    Object.keys(LC.terms).forEach(id => {
      const t = LC.terms[id];
      const name = (t.term + ' ' + (t.aliases || []).join(' ')).toLowerCase(), def = (t.def || '').toLowerCase();
      let score = 0;
      for (const k of toks) {
        let s = 0;
        if (name.indexOf(k) >= 0) s += t.term.toLowerCase().startsWith(k) ? 9 : 6;
        if (def.indexOf(k) >= 0) s += 1;
        if (!s) { score = 0; break; }
        score += s;
      }
      if (score) terms.push({ id: id, score: score });
    });
    const by = (a, b) => b.score - a.score;
    return { lessons: lessons.sort(by), terms: terms.sort(by) };
  }
  LC.search = { run: run };
})();
