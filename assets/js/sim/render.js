/* Ladder rung renderer (SVG strings) + live updater.  LC.ladder.renderStatic(text) returns an HTML string.
   Styling lives in sim.css (classes lad-*).  Dynamic bits are tagged with data-t (trace id), data-v (value) and data-b (bit). */
(function (root) {
  "use strict";
  var LC = root.LC = root.LC || {};
  var P = LC.simParser || (typeof require !== "undefined" ? require("./parser.js") : null);
  var SPEC = P.SPEC;
  var FLUID_MIN = 0.8; // smallest scale at which 12px labels stay legible (about 9.6px)
  var CW = 7.2; // IBM Plex Mono advance at 12px

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function tw(s) { return String(s).length * CW; }
  function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function f1(n) { return Math.round(n * 10) / 10; }

  // ---------- leaf metrics ----------
  var FLAGS = {
    TIMER: [["EN", "EN", "ok"], ["TT", "TT", "warn"], ["DN", "DN", "ok"]],
    TOF: [["EN", "EN", "ok"], ["TT", "TT", "warn"], ["DN", "DN", "ok"]],
    CTU: [["CU", "CU", "ok"], ["DN", "DN", "ok"], ["OV", "OV", "alarm"]],
    CTD: [["CD", "CD", "ok"], ["DN", "DN", "ok"], ["UN", "UN", "alarm"]]
  };
  function boxRows(n) {
    var a = n.args, op = n.op, rows = [], flags = null;
    var R = function (l, t, live) { rows.push({ l: l, t: t, live: live || null }); };
    var V = function (l, path, st) { rows.push({ l: l, v: path, st: st }); };
    if (op === "TON" || op === "TOF" || op === "RTO") {
      R("Timer", a[0]); V("Preset", a[0] + ".PRE", a[1]); V("Accum", a[0] + ".ACC", a[2]);
      flags = (op === "TOF" ? FLAGS.TOF : FLAGS.TIMER).map(function (f) { return [f[0], a[0] + "." + f[1], f[2]]; });
    } else if (op === "CTU" || op === "CTD") {
      R("Counter", a[0]); V("Preset", a[0] + ".PRE", a[1]); V("Accum", a[0] + ".ACC", a[2]);
      flags = FLAGS[op].map(function (f) { return [f[0], a[0] + "." + f[1], f[2]]; });
    } else if (op === "LIM") { R("Low", a[0], a[0]); R("Test", a[1], a[1]); R("High", a[2], a[2]); }
    else if (/^(EQU|NEQ|GRT|GEQ|LES|LEQ)$/.test(op)) { R("Source A", a[0], a[0]); R("Source B", a[1], a[1]); }
    else if (/^(ADD|SUB|MUL|DIV)$/.test(op)) { R("Source A", a[0], a[0]); R("Source B", a[1], a[1]); R("Dest", a[2], a[2]); }
    else if (op === "MOV") { R("Source", a[0], a[0]); R("Dest", a[1], a[1]); }
    else if (op === "CPT") { R("Dest", a[0], a[0]); R("Expr", a[1]); }
    else if (op === "SCP") { R("Input", a[0], a[0]); R("In min", a[1], a[1]); R("In max", a[2], a[2]); R("Out min", a[3], a[3]); R("Out max", a[4], a[4]); R("Output", a[5], a[5]); }
    return { rows: rows, flags: flags };
  }
  var isNum = function (s) { return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(String(s).trim()); };
  var TITLE_H = 26, ROW_H = 18, FLAG_H = 26;

  function metrics(n) {
    var sp = SPEC[n.op], sh = sp.shape;
    if (sh === "contact" || sh === "coil") return { w: Math.max(52, tw(clip(n.args[0], 20)) + 12), up: 34, down: 28 };
    if (sh === "small") {
      var ls = n.op === "OSR" || n.op === "OSF" ? 2 : 1;
      var lw = Math.max.apply(null, n.args.map(function (s) { return tw(clip(s, 20)); }));
      return { w: Math.max(58, lw + 12), up: 22 + 14 * ls, down: 16, lines: ls };
    }
    var b = boxRows(n), opW = 0, hasLive = false;
    b.rows.forEach(function (r) { if (r.t !== undefined) opW = Math.max(opW, tw(clip(r.t, 22))); if (r.live || r.v) hasLive = true; });
    var W = Math.max(156, 10 + 68 + opW + (hasLive ? 70 : 8));
    if (b.flags) W = Math.max(W, 156);
    var H = TITLE_H + b.rows.length * ROW_H + (b.flags ? FLAG_H : 0) + 6;
    return { w: Math.ceil(W), up: TITLE_H / 2 + 2, down: H - TITLE_H / 2, box: b, H: H };
  }

  // ---------- layout ----------
  function layoutSeq(nodes, o) {
    var G = o.gap, items = [], w = G, up = 0, down = 0;
    nodes.forEach(function (n) {
      var it;
      if (n.t === "b") {
        var legs = n.legs.map(function (l) { return layoutSeq(l, o); });
        var W = Math.max.apply(null, legs.map(function (l) { return l.w; }));
        var y = 0, prev = null;
        legs.forEach(function (l, k) {
          if (k > 0) y += prev.down + l.up + 6; // spacing between wires
          l.y = y; prev = l;
        });
        var last = legs[legs.length - 1];
        it = { node: n, legs: legs, w: W, up: legs[0].up, down: last.y + last.down };
      } else {
        var m = metrics(n);
        it = { node: n, w: m.w, up: m.up, down: m.down, m: m };
      }
      it.x = w; w += it.w + G;
      up = Math.max(up, it.up); down = Math.max(down, it.down);
      items.push(it);
    });
    if (!nodes.length) { w = o.edit ? 64 : 40; up = 14; down = 14; }
    return { items: items, w: w, up: up, down: down };
  }

  // ---------- drawing ----------
  function Out(o) { this.s = []; this.o = o; }
  Out.prototype.add = function (x) { this.s.push(x); };
  function wire(out, x1, x2, y, ids, m) {
    if (x2 - x1 < 0.5) return;
    out.add('<path class="lad-w" d="M' + f1(x1) + " " + f1(y) + "H" + f1(x2) + '"' + (ids ? ' data-t="' + ids + '" data-m="' + m + '"' : "") + "/>");
  }
  function vwire(out, x, y1, y2, ids, m) {
    out.add('<path class="lad-w" d="M' + f1(x) + " " + f1(y1) + "V" + f1(y2) + '"' + (ids ? ' data-t="' + ids + '" data-m="' + m + '"' : "") + "/>");
  }
  function pathStr(p) { return p.join("."); }

  function drawLeaf(out, it, x, y, rung, o) {
    var n = it.node, sp = SPEC[n.op], sh = sp.shape, id = n.id, w = it.w, cx = x + w / 2, m = it.m;
    var a0 = n.args[0];
    out.add('<g class="lad-el" data-r="' + rung + '" data-p="' + pathStr(n.path) + '" tabindex="-1">');
    if (sh === "contact" || sh === "coil") {
      var half = sh === "contact" ? 9 : 12;
      wire(out, x, cx - half, y, id, 1); wire(out, cx + half, x + w, y, id, 2);
      out.add('<g class="lad-sym" data-t="' + id + '" data-m="4">');
      if (sh === "contact") {
        out.add('<rect class="lad-fill" x="' + (cx - 9) + '" y="' + (y - 11) + '" width="18" height="22"/>');
        out.add('<path class="lad-bar" d="M' + (cx - 9) + " " + (y - 12) + "v24M" + (cx + 9) + " " + (y - 12) + 'v24"/>');
        if (n.op === "XIO") out.add('<path class="lad-bar thin" d="M' + (cx - 6) + " " + (y + 9) + "L" + (cx + 6) + " " + (y - 9) + '"/>');
      } else {
        out.add('<circle class="lad-fill" cx="' + cx + '" cy="' + y + '" r="10"/>');
        out.add('<path class="lad-bar" d="M' + (cx - 7) + " " + (y - 12) + "Q" + (cx - 14) + " " + y + " " + (cx - 7) + " " + (y + 12) +
          "M" + (cx + 7) + " " + (y - 12) + "Q" + (cx + 14) + " " + y + " " + (cx + 7) + " " + (y + 12) + '"/>');
        if (n.op === "OTL" || n.op === "OTU") out.add('<text class="lad-in" x="' + cx + '" y="' + (y + 4) + '" text-anchor="middle">' + (n.op === "OTL" ? "L" : "U") + "</text>");
      }
      out.add("</g>");
      out.add('<text class="lad-tag" x="' + cx + '" y="' + (y - 18) + '" text-anchor="middle">' + esc(clip(a0, 20)) + "<title>" + esc(a0) + "</title></text>");
      out.add('<text class="lad-mn" x="' + cx + '" y="' + (y + 27) + '" text-anchor="middle">' + n.op + "</text>");
    } else if (sh === "small") {
      var bw = 44;
      wire(out, x, cx - bw / 2, y, id, 1); wire(out, cx + bw / 2, x + w, y, id, 2);
      out.add('<g class="lad-sym" data-t="' + id + '" data-m="' + (n.op === "RES" || n.op === "CLR" ? 1 : 4) + '"><rect class="lad-box" x="' + (cx - bw / 2) + '" y="' + (y - 12) + '" width="' + bw + '" height="24" rx="3"/>' +
        '<text class="lad-op" x="' + cx + '" y="' + (y + 5) + '" text-anchor="middle">' + n.op + "</text></g>");
      n.args.forEach(function (a, i) {
        var ty = y - 18 - (m.lines - 1 - i) * 14;
        out.add('<text class="lad-tag" x="' + cx + '" y="' + ty + '" text-anchor="middle">' + esc(clip(a, 20)) + "<title>" + esc(a) + "</title></text>");
      });
    } else { // box
      var b = m.box, top = y - TITLE_H / 2, bx = x + 0, bw2 = w;
      wire(out, x - 0, x, y, id, 1);
      out.add('<g class="lad-sym lad-boxg" data-t="' + id + '" data-m="' + (/^(EQU|NEQ|GRT|GEQ|LES|LEQ|LIM)$/.test(n.op) ? 4 : 1) + '">');
      out.add('<rect class="lad-box" x="' + bx + '" y="' + top + '" width="' + bw2 + '" height="' + m.H + '" rx="3"/>');
      out.add('<text class="lad-op" x="' + (bx + 8) + '" y="' + (y + 5) + '">' + n.op + "</text>");
      out.add('<text class="lad-name" x="' + (bx + bw2 - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(sp.name) + "</text>");
      out.add('<path class="lad-sep" d="M' + bx + " " + (top + TITLE_H) + "H" + (bx + bw2) + '"/>');
      b.rows.forEach(function (r, i) {
        var ry = top + TITLE_H + i * ROW_H + 13;
        out.add('<text class="lad-rl" x="' + (bx + 8) + '" y="' + ry + '">' + esc(r.l) + "</text>");
        if (r.v) {
          out.add('<text class="lad-val lv" x="' + (bx + bw2 - 8) + '" y="' + ry + '" text-anchor="end" data-v="' + esc(r.v) + '">' + esc(r.st) + "</text>");
        } else {
          var lit = isNum(r.t);
          out.add('<text class="lad-rt' + (lit ? " lit" : "") + '" x="' + (bx + 74) + '" y="' + ry + '">' + esc(clip(r.t, 22)) + (r.t.length > 22 ? "<title>" + esc(r.t) + "</title>" : "") + "</text>");
          if (r.live && !lit && !/[\[\]]/.test(r.live)) out.add('<text class="lad-val lv" x="' + (bx + bw2 - 8) + '" y="' + ry + '" text-anchor="end" data-v="' + esc(r.live) + '"></text>');
        }
      });
      if (b.flags) {
        var fy = top + TITLE_H + b.rows.length * ROW_H + 4, fx = bx + 8;
        b.flags.forEach(function (f, i) {
          var px = fx + i * 34;
          out.add('<g class="lad-pill ' + f[2] + '" data-b="' + esc(f[1]) + '"><rect x="' + px + '" y="' + fy + '" width="30" height="17" rx="8.5"/><text x="' + (px + 15) + '" y="' + (fy + 12.5) + '" text-anchor="middle">' + f[0] + "</text></g>");
        });
      }
      out.add("</g>");
      wire(out, x + w, x + w, y, id, 2);
      // right lead is the box edge itself; draw explicit stub for continuity
    }
    out.add('<rect class="lad-hit" x="' + x + '" y="' + (y - it.up) + '" width="' + w + '" height="' + (it.up + it.down) + '"/>');
    out.add("</g>");
  }

  function drawSeq(out, seq, x0, y, rung, o, ctxInfo, fullW) {
    // ctxInfo: {cpath, idsIn (trace id for lead wire when empty)}
    var G = o.gap, items = seq.items, W = fullW || seq.w;
    if (!items.length) {
      wire(out, x0, x0 + W, y, ctxInfo.emptyId, 2);
      if (o.slots) slot(out, x0 + W / 2, y, rung, ctxInfo.cpath, 0);
      return;
    }
    items.forEach(function (it, i) {
      var x = x0 + it.x, prevEnd = i === 0 ? x0 : x0 + items[i - 1].x + items[i - 1].w;
      wire(out, prevEnd, x, y, it.node.id, 1);
      if (it.node.t === "b") drawBranch(out, it, x, y, rung, o, ctxInfo);
      else drawLeaf(out, it, x, y, rung, o);
    });
    var li = items[items.length - 1];
    wire(out, x0 + li.x + li.w, x0 + W, y, li.node.id, 2);
    if (o.slots) {
      for (var i2 = 0; i2 <= items.length; i2++) {
        var sx = i2 === 0 ? x0 + G / 2 : (i2 === items.length ? x0 + li.x + li.w + G / 2 : x0 + items[i2].x - G / 2);
        slot(out, sx, y, rung, ctxInfo.cpath, i2);
      }
    }
  }
  function slot(out, x, y, rung, cpath, idx) {
    out.add('<g class="lad-slot" data-r="' + rung + '" data-c="' + cpath.join(".") + '" data-i="' + idx + '" tabindex="-1"><rect class="lad-slot-hit" x="' + (x - 16) + '" y="' + (y - 22) + '" width="32" height="44"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="10"/><path d="M' + (x - 4.5) + " " + y + "h9M" + x + " " + (y - 4.5) + 'v9"/></g>');
  }
  function drawBranch(out, it, x, y, rung, o, ctxInfo) {
    var W = it.w, n = it.node, legs = it.legs, ys = legs.map(function (l) { return y + l.y; });
    legs.forEach(function (l, k) {
      var cp = (ctxInfo.cpath || []).concat([n.path[n.path.length - 1], k]);
      drawSeq(out, l, x, ys[k], rung, o, { cpath: cp, emptyId: n.id + "/" + k }, W);
    });
    for (var k = 1; k < legs.length; k++) {
      vwire(out, x, ys[k - 1], ys[k], n.id, 1);
      var ids = []; for (var j = k; j < legs.length; j++) ids.push(n.id + "/" + j);
      vwire(out, x + W, ys[k - 1], ys[k], ids.join("|"), 2);
    }
    if (o.slots && legs.length > 1) {
      var hy = (ys[0] + ys[1]) / 2;
      out.add('<g class="lad-brh" data-r="' + rung + '" data-b="' + pathStr(n.path) + '" tabindex="-1"><rect class="lad-slot-hit" x="' + (x - 16) + '" y="' + (hy - 16) + '" width="32" height="32"/><rect class="lad-brh-d" x="' + (x - 8) + '" y="' + (hy - 8) + '" width="16" height="16" rx="3"/>' +
        '<path d="M' + (x - 4) + " " + (hy - 3) + "h8M" + (x - 4) + " " + (hy + 3) + 'h8"/></g>');
    }
  }

  function rungSVG(r, idx, o) {
    o = Object.assign({ gap: 14, edit: false, slots: false, minW: 0, numbers: true }, o || {});
    var out = new Out(o), H0 = 22;
    var sel = o.selected === idx;
    var seq = layoutSeq(r.nodes, o);
    var railL = 12, W = Math.max(o.minW, railL + seq.w + 40);
    var railR = W - 12, y = H0 + seq.up + 6, hgt = y + seq.down + 12;
    out.add('<text class="lad-num" x="' + railL + '" y="14">' + idx + "</text>");
    if (r.comment) out.add('<text class="lad-cmt" x="' + (railL + 24) + '" y="14">' + esc(clip(r.comment, Math.floor((W - 60) / 6.4))) + "<title>" + esc(r.comment) + "</title></text>");
    out.add('<path class="lad-rail" d="M' + railL + " " + (H0 - 4) + "V" + (hgt - 6) + "M" + railR + " " + (H0 - 4) + "V" + (hgt - 6) + '"/>');
    if (r.error) {
      out.add('<path class="lad-w" d="M' + railL + " " + y + "H" + railR + '"/>');
      out.add('<text class="lad-bad" x="' + (railL + 14) + '" y="' + (y - 8) + '">' + esc(clip(r.raw || "", Math.floor((W - 60) / 7.2))) + "</text>");
    } else {
      var o2 = Object.assign({}, o, { slots: o.slots && sel });
      var inner = new Out(o2);
      drawSeq(inner, seq, railL, y, idx, o2, { cpath: [], emptyId: null });
      out.s = out.s.concat(inner.s);
      var last = r.nodes[r.nodes.length - 1];
      wire(out, railL + seq.w, railR, y, last ? last.id : null, 2);
    }
    var cls = "lad-svg" + (sel ? " sel" : "") + (r.error ? " bad" : "");
    // fluid: scale down with the container (viewBox) but never below FLUID_MIN of native size; below that the parent scrolls sideways.
    var dim = o.fluid ? 'style="width:100%;max-width:' + Math.ceil(W) + "px;min-width:" + Math.ceil(W * FLUID_MIN) + 'px;height:auto" ' : 'width="' + W + '" height="' + hgt + '" ';
    return '<svg class="' + cls + '" xmlns="http://www.w3.org/2000/svg" ' + dim + 'viewBox="0 0 ' + W + " " + hgt + '" data-rung="' + idx + '" font-family="inherit">' + out.s.join("") + "</svg>";
  }

  function programWidth(prog, o) {
    o = Object.assign({ gap: 14 }, o || {});
    return Math.max.apply(null, [0].concat(prog.rungs.map(function (r) { return 12 + layoutSeq(r.nodes, o).w + 40; })));
  }

  function renderStatic(text) {
    var prog = P.parse(text), o = { gap: 14, fluid: true };
    o.minW = programWidth(prog, o);
    var label = "Ladder logic: " + prog.rungs.map(function (r) { return P.printRung(r).replace(/;.*$/, ""); }).join("; ");
    var svgs = prog.rungs.map(function (r, i) { return '<div class="lad-rung">' + rungSVG(r, i, o) + "</div>"; }).join("");
    return '<div class="lad lad-static" role="img" aria-label="' + esc(label) + '"><div class="lad-scroll">' + svgs + "</div></div>";
  }

  // ---------- live update ----------
  function fmtVal(v) {
    if (typeof v === "boolean") return v ? "1" : "0";
    if (typeof v !== "number") return "";
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 1000) / 1000);
  }
  function collect(rootEl) {
    var c = { t: [], v: [], b: [] };
    rootEl.querySelectorAll("[data-t]").forEach(function (el) { c.t.push([el, el.getAttribute("data-t").split("|"), +el.getAttribute("data-m")]); });
    rootEl.querySelectorAll("[data-v]").forEach(function (el) { c.v.push([el, el.getAttribute("data-v")]); });
    rootEl.querySelectorAll("[data-b]").forEach(function (el) { if (el.classList.contains("lad-pill")) c.b.push([el, el.getAttribute("data-b")]); });
    rootEl._lad = c; return c;
  }
  function update(rootEl, eng, opts) {
    var c = rootEl._lad || collect(rootEl), tr = (opts && opts.idle) ? null : eng.trace;
    c.t.forEach(function (x) {
      var on = false;
      if (tr) for (var i = 0; i < x[1].length; i++) if ((tr[x[1][i]] || 0) & x[2]) { on = true; break; }
      x[0].classList.toggle("on", on);
    });
    c.v.forEach(function (x) { var v = eng.values[x[1]]; if (v !== undefined) { var s = fmtVal(v); if (x[0].textContent !== s) x[0].textContent = s; } });
    c.b.forEach(function (x) { x[0].classList.toggle("on", !!eng.values[x[1]]); });
  }

  LC.ladder = { renderStatic: renderStatic, rungSVG: rungSVG, programWidth: programWidth, FLUID_MIN: FLUID_MIN, update: update, collect: collect, esc: esc, fmtVal: fmtVal };
  if (typeof module !== "undefined" && module.exports) module.exports = LC.ladder;
})(typeof window !== "undefined" ? window : globalThis);
