/* Ladder engine: tag database + scan execution with Logix semantics.  Pure (no DOM); runs in browsers and Node.
   Virtual time: every scan advances the clock by scanMs, so tests run instantly. */
(function (root) {
  "use strict";
  var LC = root.LC = root.LC || {};
  var P = LC.simParser || (typeof require !== "undefined" ? require("./parser.js") : null);
  var SPEC = P.SPEC;
  var MAXI = 2147483647, MINI = -2147483648;

  var STRUCTS = {
    TIMER: { PRE: "DINT", ACC: "DINT", EN: "BOOL", TT: "BOOL", DN: "BOOL" },
    COUNTER: { PRE: "DINT", ACC: "DINT", CU: "BOOL", CD: "BOOL", DN: "BOOL", OV: "BOOL", UN: "BOOL" }
  };
  var BASE = { BOOL: 1, DINT: 1, REAL: 1 };
  var NUM_RE = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
  function isNum(s) { return NUM_RE.test(String(s).trim()); }
  function EngineError(msg) { var e = new Error(msg); e.engine = true; return e; }
  function wrap32(n) { n = Math.trunc(n); if (n > MAXI || n < MINI) { n = ((n + 2147483648) % 4294967296 + 4294967296) % 4294967296 - 2147483648; } return n; }

  function create(cfg) {
    cfg = cfg || {};
    var e = {
      scanMs: cfg.scanMs || 50,
      now: 0, scans: 0, firstScan: true,
      values: {}, types: {}, arrays: {}, decl: [], info: {},
      phys: {}, inputs: {}, outputs: {}, physInit: {},
      rungs: [], errors: [], fault: null, trace: null, traceOn: !!cfg.trace, text: "", program: null,
      udts: cfg.udts || {}, io: cfg.io || [], process: cfg.process || null, stage: 0
    };
    var ctx = {};

    // ---------- tag database ----------
    function defaultOf(t) { return t === "BOOL" ? false : 0; }
    function expand(path, type) {
      var am = /^([A-Za-z_]\w*)\[(\d+)\]$/.exec(type);
      if (am) {
        e.arrays[path] = { base: am[1], n: +am[2] }; e.types[path] = type;
        for (var i = 0; i < +am[2]; i++) expand(path + "[" + i + "]", am[1]);
        return;
      }
      if (BASE[type]) { e.types[path] = type; e.values[path] = defaultOf(type); return; }
      var def = STRUCTS[type] || e.udts[type];
      if (!def) throw EngineError("Unknown data type '" + type + "' for " + path + ".");
      e.types[path] = type;
      Object.keys(def).forEach(function (m) { expand(path + "." + m, def[m]); });
    }
    function dropTag(name) {
      Object.keys(e.values).concat(Object.keys(e.types)).forEach(function (k) {
        if (k === name || k.indexOf(name + ".") === 0 || k.indexOf(name + "[") === 0) { delete e.values[k]; delete e.types[k]; delete e.arrays[k]; }
      });
    }
    e.declare = function (name, type, meta) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*(:[A-Za-z0-9_]+)?$/.test(name)) throw EngineError("'" + name + "' is not a valid tag name. Use letters, digits and underscores, starting with a letter.");
      var had = e.info[name];
      if (had) { if (had.type === type) return; dropTag(name); } else e.decl.push(name);
      expand(name, type);
      e.info[name] = Object.assign({ type: type, desc: "", auto: false }, meta || {});
    };
    e.removeTag = function (name) {
      dropTag(name); delete e.info[name]; e.decl = e.decl.filter(function (n) { return n !== name; });
    };
    function applyInit(map) { Object.keys(map || {}).forEach(function (k) { if (k in e.values) e.values[k] = coerce(k, map[k]); }); }

    function coerce(path, v) {
      var t = e.types[path];
      if (t === "BOOL") return typeof v === "number" ? v !== 0 : !!v;
      if (typeof v === "boolean") v = v ? 1 : 0;
      if (typeof v !== "number" || !isFinite(v)) throw EngineError("Math fault: result for " + path + " is not a number.");
      if (t === "DINT") return wrap32(Math.round(v));
      return Math.fround(v);
    }
    function setVal(path, v) { e.values[path] = coerce(path, v); }

    // system tags
    e.declare("S:Fault", "BOOL", { desc: "Minor fault flag (set by divide by zero).", system: true });
    e.declare("S:FS", "BOOL", { desc: "First scan after reset.", system: true });

    function tagsFromCfg() {
      var t = cfg.tags || {};
      Object.keys(t).forEach(function (n) {
        var d = t[n];
        if (typeof d === "string") e.declare(n, d, {});
        else e.declare(n, d.type, { desc: d.desc || "" });
      });
      applyInit(cfg.init);
      (cfg.tagDesc && Object.keys(cfg.tagDesc).forEach(function (n) { if (e.info[n]) e.info[n].desc = cfg.tagDesc[n]; }));
    }
    tagsFromCfg();

    // I/O classification
    function ioSetup() {
      e.inputs = {}; e.outputs = {}; e.physInit = {};
      e.io.forEach(function (w) {
        var inp = w.widget === "pb" || w.widget === "toggle" || w.widget === "sensor" || w.widget === "slider";
        if (inp) { e.inputs[w.tag] = true; e.physInit[w.tag] = w.widget === "pb" && w.nc ? true : (w.init != null ? w.init : defaultOf(e.types[w.tag] || "BOOL")); }
        else e.outputs[w.tag] = true;
      });
    }
    ioSetup();

    // ---------- operands ----------
    function rootOf(path) { return path.split(/[.\[]/)[0]; }
    function mkOperand(s) {
      s = String(s).trim();
      if (isNum(s)) return { lit: Number(s), text: s };
      return { path: s, dyn: /\[[^\]]*[A-Za-z_]/.test(s), text: s };
    }
    function resolve(o) {
      if (!o.dyn) return o.path;
      return o.path.replace(/\[([^\]]+)\]/g, function (m, x) {
        if (isNum(x)) return m;
        if (!(x in e.values)) throw EngineError("Index tag " + x + " does not exist.");
        return "[" + Math.trunc(Number(e.values[x])) + "]";
      });
    }
    function rd(o) {
      if (o.lit !== undefined) return o.lit;
      var p = resolve(o), v = e.values[p];
      if (v === undefined) throw EngineError("Index out of range or unknown tag: " + p);
      return typeof v === "boolean" ? (v ? 1 : 0) : v;
    }
    function rdBit(o) {
      var p = resolve(o), v = e.values[p];
      if (v === undefined) throw EngineError("Index out of range or unknown tag: " + p);
      return !!v;
    }
    function wr(o, v) {
      var p = resolve(o);
      if (!(p in e.values)) throw EngineError("Index out of range or unknown tag: " + p);
      setVal(p, v);
    }

    // Expression compiler for CPT
    function compileExpr(src) {
      var toks = [], re = /\s*(?:(\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+)|([A-Za-z_][\w:]*(?:\.\w+|\[[^\]]+\])*)|([-+*\/()]))/y, m, pos = 0;
      src = String(src);
      while (pos < src.length) {
        re.lastIndex = pos; m = re.exec(src);
        if (!m) { if (/^\s*$/.test(src.slice(pos))) break; throw EngineError("Can't read the expression near '" + src.slice(pos, pos + 8) + "'."); }
        toks.push(m[1] !== undefined ? { n: Number(m[1]) } : m[2] !== undefined ? { v: m[2] } : { o: m[3] });
        pos = re.lastIndex;
      }
      var i = 0;
      function peek() { return toks[i]; }
      function primary() {
        var t = toks[i++];
        if (!t) throw EngineError("The expression ends too early.");
        if (t.n !== undefined) return function () { return t.n; };
        if (t.v !== undefined) { var o = mkOperand(t.v); ctx.refs.push(o); return function () { return rd(o); }; }
        if (t.o === "(") { var f = add(); var c = toks[i++]; if (!c || c.o !== ")") throw EngineError("Missing ')' in the expression."); return f; }
        if (t.o === "-") { var g = primary(); return function () { return -g(); }; }
        if (t.o === "+") return primary();
        throw EngineError("Unexpected '" + t.o + "' in the expression.");
      }
      function mul() {
        var l = primary();
        while (peek() && (peek().o === "*" || peek().o === "/")) {
          (function (op, r0) { var r = primary(), L = l;
            l = op === "*" ? function () { return L() * r(); } : function () { var d = r(); if (d === 0) throw EngineError("DIVZERO"); return L() / d; }; })(toks[i++].o);
        }
        return l;
      }
      function add() {
        var l = mul();
        while (peek() && (peek().o === "+" || peek().o === "-")) {
          (function (op) { var r = mul(), L = l; l = op === "+" ? function () { return L() + r(); } : function () { return L() - r(); }; })(toks[i++].o);
        }
        return l;
      }
      var f = add();
      if (i < toks.length) throw EngineError("Unexpected '" + (toks[i].o || toks[i].v || toks[i].n) + "' in the expression.");
      return f;
    }

    // ---------- program load & validation ----------
    function baseKindOf(path) { return e.types[path]; }
    function lookupType(o) {
      if (o.lit !== undefined) return "LIT";
      var p = o.dyn ? o.path.replace(/\[[^\]]*[A-Za-z_][^\]]*\]/g, "[0]") : o.path;
      return e.types[p] || null;
    }
    function fault(msg) { e.fault = msg; }

    function inferTypes(prog) {
      var want = {}; // root -> type
      function note(o, type, strong) { if (o.lit !== undefined) return; var r = rootOf(o.path); if (r in e.info) return; if (strong || !want[r]) want[r] = type; }
      var refs = [];
      P.walk(prog.rungs.reduce(function (a, r) { return a.concat(r.nodes); }, []), function (n) {
        var sp = SPEC[n.op];
        sp.args.forEach(function (a, i) {
          var s = n.args[i]; if (s === undefined) return;
          if (a.k === "expr") { String(s).replace(/[A-Za-z_][\w:]*(?:\.\w+|\[[^\]]+\])*/g, function (t) { if (!isNum(t)) refs.push(t); }); return; }
          var o = mkOperand(s);
          if (o.lit !== undefined) return;
          var simple = o.path.indexOf(".") < 0 && o.path.indexOf("[") < 0;
          if (!simple) { refs.push(o.path); return; }
          if (a.k === "timer") note(o, "TIMER", true);
          else if (a.k === "counter") note(o, "COUNTER", true);
          else if (a.k === "bit") note(o, "BOOL", false);
          else if (a.k === "dest") note(o, n.op === "SCP" || n.op === "CPT" ? "REAL" : "DINT", false);
          else if (a.k === "num") note(o, "DINT", false);
        });
      });
      refs.forEach(function (p) {
        var r = rootOf(p); if (r in e.info || want[r]) return;
        var mm = /^[A-Za-z_]\w*\.(\w+)/.exec(p);
        if (mm) want[r] = /^(CU|CD|OV|UN)$/.test(mm[1]) ? "COUNTER" : "TIMER";
      });
      Object.keys(want).forEach(function (r) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(r)) e.declare(r, want[r], { auto: true });
      });
    }

    function compileNodes(nodes, rungErrs) {
      nodes.forEach(function (n) {
        if (n.t === "b") { n.legs.forEach(function (l) { compileNodes(l, rungErrs); }); return; }
        var sp = SPEC[n.op];
        n.c = {};
        try {
          n.c.o = n.args.map(function (s, i) { return sp.args[i].k === "expr" ? null : mkOperand(s); });
          n.c.o.forEach(function (o, i) {
            if (!o) return;
            var a = sp.args[i], ty = lookupType(o);
            if (o.lit !== undefined) {
              if (a.k === "bit" || a.k === "dest" || a.k === "timer" || a.k === "counter" || a.k === "tc") throw EngineError(n.op + " " + a.l + " must be a tag, not the number " + o.text + ".");
              return;
            }
            if (!ty) {
              var r = rootOf(o.path);
              if (r in e.info) throw EngineError("Tag '" + o.path + "' doesn't exist. " + (e.types[r] && STRUCTS[e.types[r]] ? r + " is a " + e.types[r] + " (members: " + Object.keys(STRUCTS[e.types[r]]).join(", ") + ")." : r + " is a " + e.info[r].type + "."));
              throw EngineError("Tag '" + o.path + "' isn't declared." + (/^[A-Za-z_]\w*\[/.test(o.path) ? " Arrays must be declared first." : ""));
            }
            var isStruct = !!(STRUCTS[ty] || e.udts[ty] || /\[\d+\]$/.test(ty));
            if (a.k === "bit") {
              if (ty !== "BOOL") throw EngineError(n.op + " needs a BOOL tag, but " + o.text + " is " + (STRUCTS[ty] ? "a " + ty + ". Use one of its bits, like " + o.text + "." + (ty === "TIMER" ? "DN" : "DN") : ty + ". Compare it with GRT/EQU instead.") + "");
            } else if (a.k === "timer") {
              if (ty !== "TIMER") throw EngineError(n.op + " needs a TIMER tag, but " + o.text + " is " + ty + ".");
            } else if (a.k === "counter") {
              if (ty !== "COUNTER") throw EngineError(n.op + " needs a COUNTER tag, but " + o.text + " is " + ty + ".");
            } else if (a.k === "tc") {
              if (ty !== "TIMER" && ty !== "COUNTER") throw EngineError("RES needs a TIMER or COUNTER tag, but " + o.text + " is " + ty + ".");
            } else if (a.k === "num" || a.k === "dest") {
              if (isStruct) throw EngineError(n.op + " needs a number tag, but " + o.text + " is " + ty + ". Pick a member such as " + o.text + (ty === "TIMER" || ty === "COUNTER" ? ".ACC" : ".<member>") + ".");
            }
          });
          if (sp.args.some(function (a) { return a.k === "expr"; })) {
            ctx.refs = [];
            n.c.f = compileExpr(n.args[1]);
            ctx.refs.forEach(function (o) {
              if (o.lit !== undefined) return;
              var ty = lookupType(o);
              if (!ty) throw EngineError("Tag '" + o.path + "' in the expression isn't declared.");
              if (STRUCTS[ty] || e.udts[ty]) throw EngineError("'" + o.text + "' in the expression is a " + ty + ", not a number.");
            });
          }
          if (n.op === "TON" || n.op === "TOF" || n.op === "RTO" || n.op === "CTU" || n.op === "CTD") {
            if (!isNum(n.args[1]) || !isNum(n.args[2] || "0")) throw EngineError(n.op + " Preset and Accum must be plain numbers (set PRE with MOV if it must change).");
          }
        } catch (er) {
          if (!er.engine) throw er;
          rungErrs.push(er.message);
        }
      });
    }

    e.load = function (text) {
      e.text = text;
      var prog = typeof text === "string" ? P.parse(text) : P.annotate(text);
      e.program = prog;
      e.errors = [];
      prog.errors && prog.errors.forEach(function (er) { e.errors.push({ rung: er.rung, message: er.message }); });
      try { inferTypes(prog); } catch (er) { if (!er.engine) throw er; e.errors.push({ rung: -1, message: er.message }); }
      prog.rungs.forEach(function (r, i) {
        if (r.error) return;
        var errs = [];
        compileNodes(r.nodes, errs);
        if (errs.length) { r.error = { message: errs[0], col: 0 }; r.raw = P.printSeq(r.nodes); r.nodes = r.nodes; e.errors.push({ rung: i, message: errs[0] }); }
      });
      e.rungs = prog.rungs;
      e.reset();
      return e.errors;
    };

    function applyPresets() {
      var seen = {};
      e.rungs.forEach(function (r) {
        if (r.error) return;
        P.walk(r.nodes, function (n) {
          if (/^(TON|TOF|RTO|CTU|CTD)$/.test(n.op)) {
            var p = n.args[0]; if (seen[p] || !(p + ".PRE" in e.values)) return; seen[p] = 1;
            e.values[p + ".PRE"] = wrap32(Number(n.args[1])); e.values[p + ".ACC"] = wrap32(Number(n.args[2] || 0));
          }
        });
      });
    }

    // ---------- execution ----------
    var tr = null;
    function mark(n, inp, out, v) { if (tr) tr[n.id] = (inp ? 1 : 0) | (out ? 2 : 0) | (v ? 4 : 0); }
    function execSeq(nodes, power) {
      for (var i = 0; i < nodes.length; i++) power = execNode(nodes[i], power);
      return power;
    }
    function execNode(n, inp) {
      if (n.t === "b") {
        var out = false;
        for (var l = 0; l < n.legs.length; l++) {
          var o = execSeq(n.legs[l], inp);
          if (tr) tr[n.id + "/" + l] = (inp ? 1 : 0) | (o ? 2 : 0);
          out = out || o;
        }
        mark(n, inp, out, out);
        return out;
      }
      var o = n.c.o, v = false, out = inp, d = e.scanMs;
      switch (n.op) {
        case "XIC": v = rdBit(o[0]); out = inp && v; break;
        case "XIO": v = !rdBit(o[0]); out = inp && v; break;
        case "OTE": wr(o[0], inp); v = inp; break;
        case "OTL": if (inp) wr(o[0], true); v = inp || rdBit(o[0]); break;
        case "OTU": if (inp) wr(o[0], false); v = inp; break;
        case "ONS": { var s = rdBit(o[0]); out = inp && !s; wr(o[0], inp); v = out; break; }
        case "OSR": { var s2 = rdBit(o[0]); out = inp && !s2; wr(o[0], inp); wr(o[1], out); v = out; break; }
        case "OSF": { var s3 = rdBit(o[0]); out = !inp && s3; wr(o[0], inp); wr(o[1], out); v = out; break; }
        case "TON": case "TOF": case "RTO": {
          var t = resolve(o[0]), V = e.values, PRE = V[t + ".PRE"], ACC = V[t + ".ACC"];
          if (n.op === "TON") {
            if (inp) { ACC = Math.min(ACC + d, MAXI); V[t + ".EN"] = true; V[t + ".DN"] = ACC >= PRE; V[t + ".TT"] = !V[t + ".DN"]; }
            else { ACC = 0; V[t + ".EN"] = V[t + ".TT"] = V[t + ".DN"] = false; }
          } else if (n.op === "RTO") {
            if (inp) { ACC = Math.min(ACC + d, MAXI); V[t + ".EN"] = true; V[t + ".DN"] = ACC >= PRE; V[t + ".TT"] = !V[t + ".DN"]; }
            else { V[t + ".EN"] = false; V[t + ".TT"] = false; }
          } else { // TOF
            if (inp) { ACC = 0; V[t + ".EN"] = true; V[t + ".DN"] = true; V[t + ".TT"] = false; }
            else {
              V[t + ".EN"] = false;
              if (V[t + ".DN"]) { ACC = Math.min(ACC + d, MAXI); if (ACC >= PRE) { V[t + ".DN"] = false; V[t + ".TT"] = false; } else V[t + ".TT"] = true; }
              else V[t + ".TT"] = false;
            }
          }
          V[t + ".ACC"] = ACC; v = V[t + ".DN"]; break;
        }
        case "CTU": case "CTD": {
          var c = resolve(o[0]), W = e.values, up = n.op === "CTU", edge = up ? ".CU" : ".CD";
          if (inp && !W[c + edge]) {
            var a = W[c + ".ACC"] + (up ? 1 : -1);
            if (a > MAXI) { a = MINI; W[c + ".OV"] = true; } else if (a < MINI) { a = MAXI; W[c + ".UN"] = true; }
            W[c + ".ACC"] = a;
          }
          W[c + edge] = inp;
          W[c + ".DN"] = W[c + ".ACC"] >= W[c + ".PRE"];
          v = W[c + ".DN"]; break;
        }
        case "RES": {
          if (inp) {
            var r = resolve(o[0]), X = e.values;
            X[r + ".ACC"] = 0; X[r + ".DN"] = false;
            if (e.types[r] === "TIMER") { X[r + ".EN"] = false; X[r + ".TT"] = false; } else { X[r + ".OV"] = false; X[r + ".UN"] = false; }
          }
          v = inp; break;
        }
        case "EQU": v = rd(o[0]) === rd(o[1]); out = inp && v; break;
        case "NEQ": v = rd(o[0]) !== rd(o[1]); out = inp && v; break;
        case "GRT": v = rd(o[0]) > rd(o[1]); out = inp && v; break;
        case "GEQ": v = rd(o[0]) >= rd(o[1]); out = inp && v; break;
        case "LES": v = rd(o[0]) < rd(o[1]); out = inp && v; break;
        case "LEQ": v = rd(o[0]) <= rd(o[1]); out = inp && v; break;
        case "LIM": {
          var lo = rd(o[0]), te = rd(o[1]), hi = rd(o[2]);
          v = lo <= hi ? (te >= lo && te <= hi) : (te >= lo || te <= hi); out = inp && v; break;
        }
        case "ADD": if (inp) wr(o[2], rd(o[0]) + rd(o[1])); v = inp; break;
        case "SUB": if (inp) wr(o[2], rd(o[0]) - rd(o[1])); v = inp; break;
        case "MUL": if (inp) wr(o[2], rd(o[0]) * rd(o[1])); v = inp; break;
        case "DIV": if (inp) { var den = rd(o[1]); if (den === 0) e.values["S:Fault"] = true; else wr(o[2], rd(o[0]) / den); } v = inp; break;
        case "MOV": if (inp) wr(o[1], rd(o[0])); v = inp; break;
        case "CLR": if (inp) wr(o[0], 0); v = inp; break;
        case "CPT": if (inp) { try { wr(o[0], n.c.f()); } catch (er) { if (er.message === "DIVZERO") e.values["S:Fault"] = true; else throw er; } } v = inp; break;
        case "SCP": if (inp) {
          var i0 = rd(o[1]), i1 = rd(o[2]);
          if (i1 === i0) e.values["S:Fault"] = true;
          else { var o0 = rd(o[3]), o1 = rd(o[4]); wr(o[5], (rd(o[0]) - i0) * (o1 - o0) / (i1 - i0) + o0); }
        } v = inp; break;
        default: throw EngineError("Unsupported instruction " + n.op);
      }
      mark(n, inp, out, v);
      return out;
    }

    e.inputScan = function () {
      Object.keys(e.inputs).forEach(function (k) { if (k in e.values && k in e.phys) e.values[k] = coerce(k, e.phys[k]); });
      e.stage = 1;
    };
    e.logicScan = function () {
      tr = e.traceOn ? {} : null;
      e.values["S:FS"] = e.firstScan;
      e.fault = null;
      for (var i = 0; i < e.rungs.length; i++) {
        var r = e.rungs[i];
        if (r.error) continue;
        try { execSeq(r.nodes, true); }
        catch (er) { if (!er.engine) throw er; e.fault = "Rung " + i + ": " + er.message; }
      }
      e.values["S:FS"] = false;
      e.trace = tr;
      e.stage = 2;
    };
    e.outputScan = function () {
      Object.keys(e.outputs).forEach(function (k) { e.physOut = e.physOut || {}; e.physOut[k] = e.values[k]; });
      e.stage = 3;
    };
    e.advance = function () {
      e.now += e.scanMs; e.scans++; e.firstScan = false; e.stage = 0;
      if (e.process && e.process.step) e.process.step.call(e.process, e.tags, e.scanMs);
    };
    e.scan = function () { e.inputScan(); e.logicScan(); e.outputScan(); e.advance(); };
    e.advanceTime = function (ms) { var n = Math.max(1, Math.ceil(ms / e.scanMs - 1e-9)); for (var i = 0; i < n; i++) e.scan(); return n; };

    e.setScanMs = function (ms) { e.scanMs = Math.max(1, ms | 0); };

    // physical side
    e.setInput = function (k, v) {
      if (!(k in e.values)) throw EngineError("Unknown tag '" + k + "'.");
      e.phys[k] = typeof v === "boolean" || e.types[k] !== "BOOL" ? v : !!v; e.inputs[k] = true;
    };
    e.get = function (k) { return e.values[k]; };
    e.read = function (k) { return k in e.phys && e.inputs[k] ? e.phys[k] : e.values[k]; };
    e.poke = function (k, v) { if (e.inputs[k]) e.phys[k] = v; setVal(k, v); };

    e.tags = new Proxy({}, {
      get: function (_, k) { if (typeof k !== "string") return undefined; return e.read(k); },
      set: function (_, k, v) { if (k in e.values) { e.setInput(k, v); } return true; },
      has: function (_, k) { return k in e.values; }
    });

    e.reset = function () {
      var keep = {};
      e.decl.forEach(function (n) { keep[n] = e.info[n].type; });
      // re-zero every tag
      Object.keys(e.values).forEach(function (k) { var t = e.types[k]; if (BASE[t]) e.values[k] = defaultOf(t); });
      applyInit(cfg.init);
      applyPresets();
      e.phys = {};
      Object.keys(e.physInit).forEach(function (k) { if (k in e.values) e.phys[k] = e.physInit[k]; });
      Object.keys(e.inputs).forEach(function (k) { if (!(k in e.phys) && k in e.values) e.phys[k] = defaultOf(e.types[k]); });
      e.physOut = {}; e.now = 0; e.scans = 0; e.firstScan = true; e.fault = null; e.trace = null; e.stage = 0;
      Object.keys(e.outputs).forEach(function (k) { e.physOut[k] = e.values[k]; });
      if (e.process && e.process.init) e.process.init.call(e.process, e.tags);
    };

    // ---------- tag table helpers ----------
    e.members = function (path) {
      var t = e.types[path], out = [], def;
      if (e.arrays[path]) { for (var i = 0; i < e.arrays[path].n; i++) out.push(path + "[" + i + "]"); return out; }
      def = STRUCTS[t] || e.udts[t];
      if (def) Object.keys(def).forEach(function (m) { out.push(path + "." + m); });
      return out;
    };
    e.isLeaf = function (path) { return !!BASE[e.types[path]]; };
    e.tagList = function () { return e.decl.map(function (n) { return { name: n, type: e.info[n].type, desc: e.info[n].desc, auto: e.info[n].auto, system: e.info[n].system }; }); };
    e.allPaths = function () {
      var out = []; Object.keys(e.values).forEach(function (k) { out.push(k); }); return out;
    };

    e.load(cfg.program || "");
    return e;
  }

  // ---------- challenge helpers ----------
  function engineFor(sim, opts) {
    opts = opts || {};
    return create({
      tags: sim.tags, udts: sim.udts, io: sim.io, init: sim.init, process: sim.process,
      scanMs: opts.scanMs || sim.scanMs || 50, trace: opts.trace, tagDesc: sim.tagDesc
    });
  }

  function cmp(actual, exp) {
    if (typeof exp === "boolean") return !!actual === exp;
    if (typeof exp === "string") {
      var m = /^\s*(>=|<=|>|<|==|!=)\s*(-?[\d.]+)\s*$/.exec(exp);
      if (!m) return String(actual) === exp;
      var x = Number(m[2]), a = Number(actual);
      return { ">=": a >= x, "<=": a <= x, ">": a > x, "<": a < x, "==": a === x, "!=": a !== x }[m[1]];
    }
    var an = typeof actual === "boolean" ? (actual ? 1 : 0) : actual;
    return Math.abs(an - exp) <= Math.max(Math.abs(exp) * 0.005, 1e-6);
  }
  function fmt(v) { return typeof v === "number" ? String(Math.round(v * 1000) / 1000) : String(v); }

  function runTests(sim, text, opts) {
    opts = opts || {};
    var res = { passed: false, tests: [], errors: [], missing: [] };
    var prog = P.parse(text);
    prog.errors.forEach(function (er) { res.errors.push("Rung " + er.rung + ": " + er.message); });
    var used = P.opsUsed(prog);
    (sim.requires || []).forEach(function (op) { if (used.indexOf(op) < 0) res.missing.push(op); });
    (sim.tests || []).forEach(function (t) {
      var r = { name: t.name, passed: true, message: "" };
      try {
        var eng = engineFor(sim, { scanMs: t.scanMs });
        var le = eng.load(text);
        if (le.length && !res.errors.length) le.forEach(function (x) { res.errors.push("Rung " + x.rung + ": " + x.message); });
        var last = "the program started";
        for (var i = 0; i < t.steps.length && r.passed; i++) {
          var s = t.steps[i];
          if (s.set) { Object.keys(s.set).forEach(function (k) { eng.setInput(k, s.set[k]); }); last = "setting " + Object.keys(s.set).map(function (k) { return k + " = " + s.set[k]; }).join(", "); }
          if (s.press) {
            var pw = (sim.io || []).filter(function (x) { return x.tag === s.press.tag; })[0], nc = !!(pw && pw.nc);
            eng.setInput(s.press.tag, !nc); eng.advanceTime(s.press.ms); eng.setInput(s.press.tag, nc);
            last = "pressing " + s.press.tag + " for " + s.press.ms + " ms";
          }
          if (s.scan) { for (var k = 0; k < s.scan; k++) eng.scan(); last = s.scan + " scan" + (s.scan === 1 ? "" : "s"); }
          if (s.wait) { eng.advanceTime(s.wait); last = "waiting " + s.wait + " ms"; }
          if (s.expect) {
            Object.keys(s.expect).some(function (k) {
              if (!(k in eng.values)) { r.passed = false; r.message = "The test expects a tag called " + k + ", but it doesn't exist in your program."; return true; }
              var act = eng.values[k];
              if (!cmp(act, s.expect[k])) {
                r.passed = false;
                r.message = "After " + last + ", expected " + k + " " + (typeof s.expect[k] === "string" ? "to be " : "= ") + fmt(s.expect[k]) + " but it was " + fmt(act) + "." + (s.note ? " " + s.note : "");
                return true;
              }
              return false;
            });
          }
        }
        if (r.passed && eng.fault) { /* faults do not fail a test by themselves */ }
      } catch (er) { r.passed = false; r.message = String(er.message || er); }
      res.tests.push(r);
    });
    var allOk = res.tests.every(function (t) { return t.passed; });
    if (res.errors.length) { res.tests.forEach(function (t) { if (t.passed) { t.passed = false; t.message = "Fix the rung error first."; } }); allOk = false; }
    res.passed = allOk && !res.missing.length && !res.errors.length;
    return res;
  }

  LC.simEngine = { create: create, engineFor: engineFor, runTests: runTests, STRUCTS: STRUCTS, isNum: isNum };
  if (typeof module !== "undefined" && module.exports) module.exports = LC.simEngine;
})(typeof window !== "undefined" ? window : globalThis);
