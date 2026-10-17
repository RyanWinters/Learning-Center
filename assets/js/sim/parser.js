/* Ladder text <-> program model.  Neutral Studio 5000 text subset.  Runs in browsers and Node.
   Model:  program = { rungs: [ { nodes: [Node], comment, raw?, error? } ] }
           Node    = { t:"i", op, args:[string] }  |  { t:"b", legs:[[Node]] }
   annotate() gives every node an id ("<rung>:<i>.<leg>.<i>...") that the engine and renderer share. */
(function (root) {
  "use strict";
  var LC = root.LC = root.LC || {};

  // kind: bit | timer | counter | tc | num (tag or literal) | dest (numeric tag) | lit (number) | expr
  var A = function (k, l, def) { return { k: k, l: l, def: def }; };
  var SPEC = {
    XIC: { group: "Bit", name: "Examine If Closed", shape: "contact", desc: "True while the bit is 1.", args: [A("bit", "Tag")] },
    XIO: { group: "Bit", name: "Examine If Open", shape: "contact", desc: "True while the bit is 0.", args: [A("bit", "Tag")] },
    OTE: { group: "Bit", name: "Output Energize", shape: "coil", desc: "Bit = rung state, every scan.", args: [A("bit", "Tag")] },
    OTL: { group: "Bit", name: "Output Latch", shape: "coil", desc: "Sets the bit when true. Stays set.", args: [A("bit", "Tag")] },
    OTU: { group: "Bit", name: "Output Unlatch", shape: "coil", desc: "Clears the bit when true.", args: [A("bit", "Tag")] },
    ONS: { group: "Bit", name: "One Shot", shape: "small", desc: "Passes power for one scan on a false to true change.", args: [A("bit", "Storage bit")] },
    OSR: { group: "Bit", name: "One Shot Rising", shape: "small", desc: "Output bit is on for one scan on a rising edge.", args: [A("bit", "Storage bit"), A("bit", "Output bit")] },
    OSF: { group: "Bit", name: "One Shot Falling", shape: "small", desc: "Output bit is on for one scan on a falling edge.", args: [A("bit", "Storage bit"), A("bit", "Output bit")] },
    TON: { group: "Timer/Counter", name: "Timer On Delay", shape: "box", desc: "Times while the rung is true. DN when ACC reaches PRE.", min: 2, args: [A("timer", "Timer"), A("lit", "Preset (ms)", "1000"), A("lit", "Accum", "0")] },
    TOF: { group: "Timer/Counter", name: "Timer Off Delay", shape: "box", desc: "Times while the rung is false. DN stays on until PRE runs out.", min: 2, args: [A("timer", "Timer"), A("lit", "Preset (ms)", "1000"), A("lit", "Accum", "0")] },
    RTO: { group: "Timer/Counter", name: "Retentive Timer On", shape: "box", desc: "Like TON but keeps ACC when the rung goes false. Needs RES.", min: 2, args: [A("timer", "Timer"), A("lit", "Preset (ms)", "1000"), A("lit", "Accum", "0")] },
    CTU: { group: "Timer/Counter", name: "Count Up", shape: "box", desc: "Counts each false to true change of its rung.", min: 2, args: [A("counter", "Counter"), A("lit", "Preset", "10"), A("lit", "Accum", "0")] },
    CTD: { group: "Timer/Counter", name: "Count Down", shape: "box", desc: "Counts down on each false to true change of its rung.", min: 2, args: [A("counter", "Counter"), A("lit", "Preset", "0"), A("lit", "Accum", "0")] },
    RES: { group: "Timer/Counter", name: "Reset", shape: "small", desc: "Clears a timer or counter (ACC, DN and the status bits).", args: [A("tc", "Timer or counter")] },
    EQU: { group: "Compare", name: "Equal", shape: "box", desc: "True when A = B.", args: [A("num", "Source A"), A("num", "Source B")] },
    NEQ: { group: "Compare", name: "Not Equal", shape: "box", desc: "True when A is not equal to B.", args: [A("num", "Source A"), A("num", "Source B")] },
    GRT: { group: "Compare", name: "Greater Than", shape: "box", desc: "True when A > B.", args: [A("num", "Source A"), A("num", "Source B")] },
    GEQ: { group: "Compare", name: "Greater or Equal", shape: "box", desc: "True when A >= B.", args: [A("num", "Source A"), A("num", "Source B")] },
    LES: { group: "Compare", name: "Less Than", shape: "box", desc: "True when A < B.", args: [A("num", "Source A"), A("num", "Source B")] },
    LEQ: { group: "Compare", name: "Less or Equal", shape: "box", desc: "True when A <= B.", args: [A("num", "Source A"), A("num", "Source B")] },
    LIM: { group: "Compare", name: "Limit Test", shape: "box", desc: "True when Low <= Test <= High.", args: [A("num", "Low limit"), A("num", "Test"), A("num", "High limit")] },
    ADD: { group: "Math/Move", name: "Add", shape: "box", desc: "Dest = A + B while the rung is true.", args: [A("num", "Source A"), A("num", "Source B"), A("dest", "Dest")] },
    SUB: { group: "Math/Move", name: "Subtract", shape: "box", desc: "Dest = A - B.", args: [A("num", "Source A"), A("num", "Source B"), A("dest", "Dest")] },
    MUL: { group: "Math/Move", name: "Multiply", shape: "box", desc: "Dest = A x B.", args: [A("num", "Source A"), A("num", "Source B"), A("dest", "Dest")] },
    DIV: { group: "Math/Move", name: "Divide", shape: "box", desc: "Dest = A / B. Divide by zero sets S:Fault.", args: [A("num", "Source A"), A("num", "Source B"), A("dest", "Dest")] },
    MOV: { group: "Math/Move", name: "Move", shape: "box", desc: "Copies Source into Dest.", args: [A("num", "Source"), A("dest", "Dest")] },
    CPT: { group: "Math/Move", name: "Compute", shape: "box", desc: "Dest = expression using + - * / and ( ).", args: [A("dest", "Dest"), A("expr", "Expression")] },
    SCP: { group: "Math/Move", name: "Scale", shape: "box", desc: "Linear scale of Input from one range to another.", args: [A("num", "Input"), A("num", "Input min"), A("num", "Input max"), A("num", "Scaled min"), A("num", "Scaled max"), A("dest", "Output")] },
    CLR: { group: "Math/Move", name: "Clear", shape: "small", desc: "Sets Dest to 0.", args: [A("dest", "Dest")] }
  };
  var GROUPS = ["Bit", "Timer/Counter", "Compare", "Math/Move"];

  function lev(a, b) {
    var m = [], i, j;
    for (i = 0; i <= a.length; i++) { m[i] = [i]; }
    for (j = 1; j <= b.length; j++) { m[0][j] = j; }
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  }
  function suggest(op) {
    var best = null, bd = 3, k;
    for (k in SPEC) { var d = lev(op.toUpperCase(), k); if (d < bd) { bd = d; best = k; } }
    return best;
  }

  function stripComment(line) {
    var q = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') q = !q;
      else if (!q && c === "/" && line[i + 1] === "/") return [line.slice(0, i), line.slice(i + 2).trim()];
    }
    return [line, ""];
  }

  // ---- rung body parser ----
  function parseBody(src) {
    var s = src, pos = 0;
    function ws() { while (pos < s.length && /\s/.test(s[pos])) pos++; }
    function fail(msg, at) { var e = new Error(msg); e.col = at == null ? pos : at; throw e; }
    function seq(depth) {
      var nodes = [];
      for (;;) {
        ws();
        if (pos >= s.length) break;
        var c = s[pos];
        if (c === "]" || c === ",") {
          if (depth > 0) break;
          fail(c === "]" ? "Unexpected ']' with no matching '['." : "Unexpected ',' outside a branch.");
        }
        if (c === ";") { pos++; continue; }
        if (c === "[") {
          var open = pos; pos++;
          var legs = [];
          for (;;) {
            legs.push(seq(depth + 1));
            ws();
            if (s[pos] === ",") { pos++; continue; }
            if (s[pos] === "]") { pos++; break; }
            fail("Branch opened here is missing its closing ']'.", open);
          }
          nodes.push({ t: "b", legs: legs });
          continue;
        }
        var m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(pos));
        if (!m) fail("Unexpected '" + c + "'. Expected an instruction like XIC(Tag).");
        var opStart = pos, op = m[0];
        pos += op.length; ws();
        if (s[pos] !== "(") fail(op + " must be followed by '(' and its operands.", opStart);
        var argsStart = pos; pos++;
        var args = [], cur = "", d = 0, q = false, closed = false;
        for (; pos < s.length; pos++) {
          var ch = s[pos];
          if (ch === '"') { q = !q; cur += ch; continue; }
          if (!q) {
            if (ch === "(" || ch === "[") d++;
            else if (ch === "]") d--;
            else if (ch === ")") { if (d === 0) { closed = true; pos++; break; } d--; }
            else if (ch === "," && d === 0) { args.push(cur.trim()); cur = ""; continue; }
          }
          cur += ch;
        }
        if (!closed) fail("Missing ')' after " + op + "(" + args.concat([cur]).join(",").slice(0, 24) + "...", argsStart);
        if (cur.trim() !== "" || args.length) args.push(cur.trim());
        var up = op.toUpperCase();
        var sp = SPEC[up] || SPEC[op];
        if (!sp) {
          var sg = suggest(op);
          fail("Unknown instruction '" + op + "'." + (sg ? " Did you mean " + sg + "?" : ""), opStart);
        }
        op = SPEC[op] ? op : up;
        var min = sp.min || sp.args.length;
        if (args.length < min || args.length > sp.args.length) {
          fail(op + " takes " + (min === sp.args.length ? min : min + " to " + sp.args.length) + " operand" + (sp.args.length === 1 ? "" : "s") +
            " (" + sp.args.map(function (a) { return a.l; }).join(", ") + ") but got " + args.length + ".", opStart);
        }
        for (var i = 0; i < args.length; i++) {
          if (args[i] === "") fail("Operand " + (i + 1) + " of " + op + " (" + sp.args[i].l + ") is empty.", opStart);
          if (sp.args[i].k === "expr") args[i] = args[i].replace(/^"([\s\S]*)"$/, "$1");
        }
        // fill optional accum so the model is always complete
        while (args.length < sp.args.length) args.push(sp.args[args.length].def || "0");
        nodes.push({ t: "i", op: op, args: args });
      }
      return nodes;
    }
    var out = seq(0);
    ws();
    if (pos < s.length) fail("Unexpected '" + s[pos] + "'.");
    return out;
  }

  function annotateSeq(nodes, prefix, rung) {
    nodes.forEach(function (n, i) {
      var p = prefix.concat([i]);
      n.path = p;
      n.id = rung + ":" + p.join(".");
      if (n.t === "b") n.legs.forEach(function (leg, l) { annotateSeq(leg, p.concat([l]), rung); });
    });
  }
  function annotate(prog) {
    prog.rungs.forEach(function (r, i) { r.index = i; annotateSeq(r.nodes, [], i); });
    return prog;
  }

  function parse(text) {
    var prog = { rungs: [], errors: [] };
    var lines = String(text == null ? "" : text).split(/\r?\n/);
    var pending = [];
    lines.forEach(function (line, ln) {
      var sc = stripComment(line), body = sc[0].trim(), cmt = sc[1];
      if (body === "") { if (cmt) pending.push(cmt); return; }
      var comment = pending.concat(cmt ? [cmt] : []).join(" ");
      pending = [];
      var rung = { nodes: [], comment: comment, line: ln + 1 };
      try { rung.nodes = parseBody(body); }
      catch (e) {
        rung.error = { message: e.message, col: e.col || 0 };
        rung.raw = body.replace(/[;\s]+$/, "");
        rung.nodes = [];
        prog.errors.push({ rung: prog.rungs.length, line: ln + 1, message: e.message, col: e.col || 0 });
      }
      prog.rungs.push(rung);
    });
    return annotate(prog);
  }

  function printSeq(nodes) {
    return nodes.map(function (n) {
      if (n.t === "b") return "[" + n.legs.map(printSeq).join(",") + "]";
      var sp = SPEC[n.op];
      return n.op + "(" + n.args.map(function (a, i) { return sp && sp.args[i] && sp.args[i].k === "expr" ? '"' + a + '"' : a; }).join(",") + ")";
    }).join("");
  }
  function printRung(r) {
    var body = r.error ? r.raw : printSeq(r.nodes);
    return body + ";" + (r.comment ? " // " + r.comment : "");
  }
  function print(prog) { return prog.rungs.map(printRung).join("\n") + (prog.rungs.length ? "\n" : ""); }

  // ---- structural edits (operate on a clone; callers re-parse the printed text) ----
  function clone(prog) { return JSON.parse(JSON.stringify(prog)); }
  // cpath: [] = top sequence; [i, leg] = leg `leg` of the branch at index i; [i, leg, j, leg2] deeper
  function seqAt(rung, cpath) {
    var seq = rung.nodes;
    for (var k = 0; k < cpath.length; k += 2) seq = seq[cpath[k]].legs[cpath[k + 1]];
    return seq;
  }
  function split(path) { return { cpath: path.slice(0, -1), idx: path[path.length - 1] }; }
  function normalize(seq) {
    for (var i = seq.length - 1; i >= 0; i--) {
      var n = seq[i];
      if (n.t !== "b") continue;
      n.legs.forEach(normalize);
      var nonEmpty = n.legs.filter(function (l) { return l.length; });
      if (nonEmpty.length === 0) { seq.splice(i, 1); }
      else if (n.legs.length === 1) { Array.prototype.splice.apply(seq, [i, 1].concat(n.legs[0])); }
      else if (nonEmpty.length === 1 && n.legs.length === 2 && false) { /* keep: an empty leg is a valid bypass */ }
    }
  }
  function mkInst(op, args) {
    var sp = SPEC[op];
    return { t: "i", op: op, args: args || sp.args.map(function (a) { return a.def || ""; }) };
  }
  var ops = {
    insert: function (prog, rung, cpath, idx, node) {
      var p = clone(prog); seqAt(p.rungs[rung], cpath).splice(idx, 0, node); normalizeRung(p.rungs[rung]); return p;
    },
    remove: function (prog, rung, path) {
      var p = clone(prog), s = split(path); seqAt(p.rungs[rung], s.cpath).splice(s.idx, 1); normalizeRung(p.rungs[rung]); return p;
    },
    replace: function (prog, rung, path, node) {
      var p = clone(prog), s = split(path); seqAt(p.rungs[rung], s.cpath)[s.idx] = node; return p;
    },
    wrap: function (prog, rung, path) { // branch around one element: [elem , <empty>]
      var p = clone(prog), s = split(path), seq = seqAt(p.rungs[rung], s.cpath);
      seq[s.idx] = { t: "b", legs: [[seq[s.idx]], []] }; return p;
    },
    addLeg: function (prog, rung, path) { // path of a node inside a leg: add an empty leg to its parent branch
      var p = clone(prog), cp = path.slice(0, -1); // [.., i, leg]
      var bpath = cp.slice(0, -1);
      var parentSeq = seqAt(p.rungs[rung], bpath.slice(0, -1));
      parentSeq[bpath[bpath.length - 1]].legs.push([]); return p;
    },
    addLegAt: function (prog, rung, bpath) { // bpath: path of the branch node
      var p = clone(prog), s = split(bpath); seqAt(p.rungs[rung], s.cpath)[s.idx].legs.push([]); return p;
    },
    move: function (prog, rung, path, dir) {
      var p = clone(prog), s = split(path), seq = seqAt(p.rungs[rung], s.cpath), j = s.idx + dir;
      if (j < 0 || j >= seq.length) return p;
      var t = seq[s.idx]; seq[s.idx] = seq[j]; seq[j] = t; return p;
    },
    moveRung: function (prog, rung, dir) {
      var p = clone(prog), j = rung + dir; if (j < 0 || j >= p.rungs.length) return p;
      var t = p.rungs[rung]; p.rungs[rung] = p.rungs[j]; p.rungs[j] = t; return p;
    },
    removeLeg: function (prog, rung, bpath, leg) {
      var p = clone(prog), s = split(bpath); seqAt(p.rungs[rung], s.cpath)[s.idx].legs.splice(leg, 1); normalizeRung(p.rungs[rung]); return p;
    },
    addRung: function (prog, at) { var p = clone(prog); p.rungs.splice(at, 0, { nodes: [], comment: "" }); return p; },
    deleteRung: function (prog, rung) { var p = clone(prog); p.rungs.splice(rung, 1); return p; },
    setComment: function (prog, rung, text) { var p = clone(prog); p.rungs[rung].comment = text; return p; },
    setRungText: function (prog, rung, text) {
      var np = parse(text.replace(/\n+/g, " "));
      var p = clone(prog);
      if (np.rungs.length === 0) np.rungs.push({ nodes: [], comment: "" });
      var cmt = p.rungs[rung].comment;
      np.rungs[0].comment = np.rungs[0].comment || cmt;
      p.rungs.splice.apply(p.rungs, [rung, 1].concat(np.rungs)); return p;
    },
    find: function (prog, rung, path) {
      var node = null, seq = prog.rungs[rung].nodes;
      for (var k = 0; k < path.length; k++) {
        if (k % 2 === 0) { node = seq[path[k]]; if (!node) return null; }
        else seq = node.legs[path[k]];
      }
      return node;
    }
  };
  function normalizeRung(r) { normalize(r.nodes); }

  function walk(nodes, fn) {
    nodes.forEach(function (n) { if (n.t === "b") n.legs.forEach(function (l) { walk(l, fn); }); else fn(n); });
  }
  function opsUsed(prog) {
    var set = {}; prog.rungs.forEach(function (r) { walk(r.nodes, function (n) { set[n.op] = true; }); }); return Object.keys(set);
  }

  LC.simParser = { SPEC: SPEC, GROUPS: GROUPS, parse: parse, print: print, printRung: printRung, printSeq: printSeq, annotate: annotate,
    ops: ops, mkInst: mkInst, walk: walk, opsUsed: opsUsed, suggest: suggest };
  if (typeof module !== "undefined" && module.exports) module.exports = LC.simParser;
})(typeof window !== "undefined" ? window : globalThis);
