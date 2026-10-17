/* Small markdown renderer: exactly the features in docs/CONTENT_GUIDE.md. All text is escaped;
   only lesson diagram SVGs are injected raw. */
(function () {
  const LC = window.LC = window.LC || {};
  const esc = s => LC.ui.esc(s);

  function lessonRef(id) {
    const m = LC.index[id];
    if (!m) return '<span class="lref lref-miss">' + esc(id) + '</span>';
    const st = LC.graph.status(id);
    const mark = st === 'available' ? '' : '<span class="lref-st">' + LC.ui.statusIcon(st) + '</span>';
    return '<a class="lref" href="#/lesson/' + id + '">' + esc(m.title) + mark + '</a>';
  }
  function termBtn(id, text) {
    const t = LC.terms[id];
    return '<button type="button" class="gl" data-term="' + esc(id) + '">' + (text || esc(t ? t.term : id)) + '</button>';
  }

  function inline(src) {
    const codes = [];
    let s = String(src == null ? '' : src).replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0001' + (codes.length - 1) + '\u0002'; });
    s = esc(s);
    s = s.replace(/\{\{term:([\w-]+)(?:\|([^}]*))?\}\}/g, (m, id, t) => termBtn(id, t));
    s = s.replace(/\{\{lesson:([\w-]+)\}\}/g, (m, id) => lessonRef(id));
    s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\s](?:[^*]*[^*\s])?)\*(?![*\w])/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[^\s)]*|mailto:[^\s)]+)\)/g, (m, t, u) => {
      const ext = /^https?:/.test(u);
      return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + t + '</a>';
    });
    return s.replace(/\u0001(\d+)\u0002/g, (m, i) => '<code>' + esc(codes[i]) + '</code>');
  }

  /* ---- minimal syntax highlighting ---- */
  const KW = {
    python: ['def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|try|except|finally|with|lambda|None|True|False|pass|raise|is|print', 'g', '#.*', '"""[\\s\\S]*?"""|\'[^\'\\n]*\'|"[^"\\n]*"'],
    sql: ['SELECT|FROM|WHERE|AND|OR|NOT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|HAVING|LIMIT|AS|CREATE|TABLE|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|NULL|IS|IN|BETWEEN|LIKE|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|UNION|ALTER|DROP|DEFAULT|DESC|ASC|OFFSET|OVER|PARTITION|WITH', 'gi', '--.*', '\'[^\']*\''],
    st: ['IF|THEN|ELSE|ELSIF|END_IF|CASE|OF|END_CASE|FOR|TO|BY|DO|END_FOR|WHILE|END_WHILE|REPEAT|UNTIL|END_REPEAT|AND|OR|NOT|XOR|MOD|TRUE|FALSE|EXIT|RETURN', 'gi', '\\(\\*[\\s\\S]*?\\*\\)|//.*', '\'[^\'\\n]*\''],
    json: ['true|false|null', 'g', '(?!)', '"(?:[^"\\\\\\n]|\\\\.)*"']
  };
  function highlight(code, lang) {
    const k = KW[lang]; if (!k) return esc(code);
    const re = new RegExp('(' + k[2] + ')|(' + k[3] + ')|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b(?:' + k[0] + ')\\b)', k[1]);
    let out = '', last = 0, m;
    while ((m = re.exec(code))) {
      if (m[0] === '') { re.lastIndex++; continue; }
      out += esc(code.slice(last, m.index));
      const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
      out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(code.slice(last));
  }
  function codeBlock(text, lang) {
    if (lang === 'ladder' && LC.ladder && LC.ladder.renderStatic) {
      try {
        const r = LC.ladder.renderStatic(text);
        const html = typeof r === 'string' ? r : (r && r.outerHTML) || '';
        if (html) return '<div class="ladder-static no-gloss">' + html + '</div>';
      } catch (e) { /* fall through to plain code */ }
    }
    const label = lang && lang !== 'text' ? lang : '';
    return '<div class="code no-gloss"><div class="code-bar"><span>' + esc(label || 'text') + '</span><button type="button" class="code-copy" data-copy>Copy</button></div><pre><code>' + highlight(text, lang) + '</code></pre></div>';
  }

  /* ---- blocks ---- */
  const CALLOUT = { tip: 'Tip', warning: 'Warning', example: 'Example', note: 'Note', why: 'Why' };
  const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
  const isBlockStart = l => /^\s*```/.test(l) || /^#{1,4}\s/.test(l) || /^\s*>/.test(l) || LIST_RE.test(l) || /^\s*\|/.test(l) || /^\{\{(diagram|sim):[\w-]+\}\}\s*$/.test(l);

  function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function parseList(lines, i) {
    const items = [];
    const baseIndent = lines[i].match(LIST_RE)[1].length;
    const ordered = /\d/.test(lines[i].match(LIST_RE)[2]);
    while (i < lines.length) {
      let m = lines[i].match(LIST_RE);
      if (!m && !lines[i].trim()) {                       // allow one blank line inside a list
        const nx = lines[i + 1] && lines[i + 1].match(LIST_RE);
        if (nx && nx[1].length >= baseIndent) { i++; continue; }
        break;
      }
      if (!m) {
        if (/^\s+\S/.test(lines[i]) && items.length) {    // continuation line
          const it = items[items.length - 1];
          (it.kids.length ? it.kids[it.kids.length - 1] : it).text += ' ' + lines[i].trim();
          i++; continue;
        }
        break;
      }
      const ind = m[1].length;
      if (ind < baseIndent) break;
      if (ind - baseIndent >= 2) {
        if (items.length) items[items.length - 1].kids.push({ text: m[3], ordered: /\d/.test(m[2]) });
      } else items.push({ text: m[3], kids: [] });
      i++;
    }
    let h = '';
    items.forEach(it => {
      h += '<li>' + inline(it.text);
      if (it.kids.length) {
        const tag = it.kids[0].ordered ? 'ol' : 'ul';
        h += '<' + tag + '>' + it.kids.map(k => '<li>' + inline(k.text) + '</li>').join('') + '</' + tag + '>';
      }
      h += '</li>';
    });
    const tag = ordered ? 'ol' : 'ul';
    return { html: '<' + tag + '>' + h + '</' + tag + '>', next: i };
  }

  function splitRow(l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|')); }

  function blocks(lines, ctx) {
    let out = '', i = 0, m;
    while (i < lines.length) {
      const ln = lines[i];
      if (!ln.trim()) { i++; continue; }
      if ((m = ln.match(/^\s*```(\w*)\s*$/))) {
        const buf = []; i++;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out += codeBlock(buf.join('\n'), m[1].toLowerCase());
        continue;
      }
      if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) {
        const lvl = Math.min(4, Math.max(2, m[1].length === 1 ? 2 : m[1].length));
        out += '<h' + lvl + ' id="' + slug(m[2]) + '">' + inline(m[2]) + '</h' + lvl + '>';
        i++; continue;
      }
      if ((m = ln.match(/^\{\{diagram:([\w-]+)\}\}\s*$/))) {
        const svg = ctx.diagrams && ctx.diagrams[m[1]];
        if (svg) {
          const cap = (svg.match(/aria-label="([^"]*)"/) || [])[1] || '';
          out += '<figure class="dg no-gloss">' + svg + (cap ? '<figcaption>' + cap + '</figcaption>' : '') + '</figure>';
        }
        i++; continue;
      }
      if ((m = ln.match(/^\{\{sim:([\w-]+)\}\}\s*$/))) {
        const idx = (window.LC_SIM_INDEX || []).find(s => s.id === m[1]);
        const sim = LC.sims[m[1]];
        const title = (idx && idx.title) || (sim && sim.title) || m[1];
        const done = (LC.store.get().sims[m[1]] || {}).status === 'passed';
        out += '<a class="sim-card no-gloss" href="#/lab/' + esc(m[1]) + '">' + LC.ui.icon('lab', 22) +
          '<span class="sim-card-main"><span class="eyebrow">Try it in the simulator</span><span class="sim-card-title">' + esc(title) + '</span></span>' +
          (done ? LC.ui.chip('complete', true).replace('Done', 'Passed') : LC.ui.icon('chev', 18)) + '</a>';
        i++; continue;
      }
      if (/^\s*\|/.test(ln) && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const head = splitRow(ln); i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(splitRow(lines[i++]));
        out += '<div class="tbl-wrap"><table><thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
          rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
        continue;
      }
      if (/^\s*>/.test(ln)) {
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*> ?/, ''));
        const cm = buf[0].match(/^\[!(\w+)\]\s*(.*)$/);
        if (cm) {
          const type = CALLOUT[cm[1].toLowerCase()] ? cm[1].toLowerCase() : 'note';
          const title = cm[2].trim() || CALLOUT[type];
          out += '<aside class="callout callout-' + type + '"><div class="callout-head no-gloss">' + LC.ui.icon(type, 18) + '<span class="callout-title">' + inline(title) + '</span></div><div class="callout-body">' + blocks(buf.slice(1), ctx) + '</div></aside>';
        } else out += '<blockquote>' + blocks(buf, ctx) + '</blockquote>';
        continue;
      }
      if (LIST_RE.test(ln)) {
        const r = parseList(lines, i); out += r.html; i = r.next; continue;
      }
      const buf = [];
      while (i < lines.length && lines[i].trim() && !(buf.length && isBlockStart(lines[i]))) buf.push(lines[i++].trim());
      out += '<p>' + inline(buf.join(' ')) + '</p>';
    }
    return out;
  }

  function render(src, ctx) {
    return blocks(String(src == null ? '' : src).replace(/\r/g, '').split('\n'), ctx || {});
  }
  LC.md = { render: render, inline: inline, highlight: highlight };
})();
