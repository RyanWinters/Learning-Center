/* Touch-first ladder editor: visual mode (tap-to-insert, bottom sheets) and text mode, with undo/redo.
   LC.simEditor.create(host, { engine, text, palette, onChange(text), onEvent(name, data), getErrors() }) */
(function (root) {
  "use strict";
  var LC = root.LC = root.LC || {};
  var P = LC.simParser, R = LC.ladder, IO = LC.simIO, el = IO.el, ico = IO.ico, SPEC = P.SPEC;
  var GAP = 30;

  // ---------- bottom sheet ----------
  var openCount = 0;
  function sheet(title, body, o) {
    o = o || {};
    var prev = document.activeElement;
    var back = el("div", { class: "sim-sheet-back" });
    var close = el("button", { type: "button", class: "sim-x", "aria-label": "Close", html: ico("x") });
    var h = el("h3", { text: title });
    var bodyWrap = el("div", { class: "sim-sheet-body" }, [body]);
    var panel = el("div", { class: "sim-sheet", role: "dialog", "aria-modal": "true", "aria-label": title }, [
      el("div", { class: "sim-sheet-grab", "aria-hidden": "true" }), el("header", { class: "sim-sheet-head" }, [h, close]), bodyWrap]);
    back.appendChild(panel);
    var api = {
      close: function (silent) {
        if (!back.parentNode) return;
        back.remove(); document.removeEventListener("keydown", key, true);
        if (--openCount <= 0) { openCount = 0; document.documentElement.classList.remove("sim-lock"); }
        if (prev && prev.focus && prev.isConnected) try { prev.focus(); } catch (e) {}
        if (!silent && o.onClose) o.onClose();
      },
      setBody: function (n, t) { bodyWrap.innerHTML = ""; bodyWrap.appendChild(n); if (t) { h.textContent = t; panel.setAttribute("aria-label", t); } bodyWrap.scrollTop = 0; focusFirst(); },
      el: panel
    };
    function key(e) { if (e.key === "Escape") { e.stopPropagation(); api.close(); } else if (e.key === "Tab") trap(e); }
    function trap(e) {
      var f = panel.querySelectorAll('button:not([disabled]),input,textarea,select,[tabindex="0"]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function focusFirst() { var f = bodyWrap.querySelector("input,textarea,button"); if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, 30); }
    close.addEventListener("click", function () { api.close(); });
    back.addEventListener("pointerdown", function (e) { if (e.target === back) api.close(); });
    document.body.appendChild(back); openCount++; document.documentElement.classList.add("sim-lock");
    document.addEventListener("keydown", key, true);
    if (!o.noFocus) focusFirst();
    return api;
  }
  function confirmSheet(title, text, okLabel, onOk, danger) {
    var body = el("div", { class: "sim-confirm" }, [el("p", { text: text }),
      el("div", { class: "sim-actions" }, [
        el("button", { type: "button", class: "btn", text: "Cancel", onclick: function () { s.close(); } }),
        el("button", { type: "button", class: "btn " + (danger ? "danger" : "primary"), text: okLabel, onclick: function () { s.close(true); onOk(); } })])]);
    var s = sheet(title, body);
    return s;
  }

  // ---------- editor ----------
  function create(host, opts) {
    var eng = opts.engine, text = opts.text || "", mode = "visual", sel = { rung: null, path: null };
    var hist = [text], hi = 0, MAX = 100;
    var prog = P.parse(text);
    host.innerHTML = "";
    var root = el("div", { class: "sed" });
    var bar = el("div", { class: "sed-bar" });
    var seg = el("div", { class: "seg", role: "group", "aria-label": "Editor mode" });
    var bVis = el("button", { type: "button", class: "on", "aria-pressed": "true", html: ico("ladder") + "<span>Ladder</span>", "data-tour": "mode-visual" });
    var bTxt = el("button", { type: "button", "aria-pressed": "false", html: ico("code") + "<span>Text</span>", "data-tour": "mode-text" });
    seg.appendChild(bVis); seg.appendChild(bTxt);
    var bUndo = el("button", { type: "button", class: "ibtn", "aria-label": "Undo", title: "Undo", html: ico("undo"), "data-tour": "undo" });
    var bRedo = el("button", { type: "button", class: "ibtn", "aria-label": "Redo", title: "Redo", html: ico("redo") });
    var bAdd = el("button", { type: "button", class: "btn small", html: ico("plus") + "<span>Rung</span>", "data-tour": "add-rung" });
    bar.appendChild(seg); bar.appendChild(el("span", { class: "sp" })); bar.appendChild(bUndo); bar.appendChild(bRedo); bar.appendChild(bAdd);
    var scroll = el("div", { class: "sed-scroll", tabindex: "-1" });
    var tx = el("div", { class: "sed-text", hidden: true });
    var ta = el("textarea", { class: "sed-ta", spellcheck: "false", autocapitalize: "off", autocomplete: "off", autocorrect: "off", "aria-label": "Ladder program as text", rows: 8 });
    var terr = el("ul", { class: "sed-terrs", "aria-live": "polite" });
    var help = el("details", { class: "sed-help" }, [el("summary", { text: "Text syntax" }),
      el("div", { html: "<p>One rung per line. Series is just writing instructions side by side. A branch is <code>[ leg , leg ]</code>. End a rung with <code>;</code>. <code>//</code> starts a comment.</p><pre>XIC(Start)XIO(Stop)[XIC(Motor),XIC(Jog)]OTE(Motor);\nXIC(Motor)TON(RunDelay,5000,0);\nXIC(RunDelay.DN)OTE(Lamp);</pre><p>Timers and counters take (tag, preset, accum). Compare: <code>GRT(a,b)</code>. Math: <code>ADD(a,b,dest)</code>. <code>CPT(dest,\"(a+b)/2\")</code>.</p>" })]);
    tx.appendChild(ta); tx.appendChild(terr); tx.appendChild(help);
    root.appendChild(bar); root.appendChild(scroll); root.appendChild(tx);
    host.appendChild(root);

    function emit(n, d) { if (opts.onEvent) opts.onEvent(n, d); }

    function commit(newText, coalesce) {
      newText = String(newText);
      if (newText === text) return;
      text = newText; prog = P.parse(text);
      if (coalesce && hi > 0 && hist.length - 1 === hi && coalesce === hist._co) { hist[hi] = text; }
      else { hist = hist.slice(0, hi + 1); hist.push(text); hi = hist.length - 1; if (hist.length > MAX) { hist.shift(); hi--; } hist._co = coalesce || null; }
      if (opts.onChange) opts.onChange(text);
      emit("edit", text);
      render();
    }
    function histMove(d) {
      var j = hi + d; if (j < 0 || j >= hist.length) return;
      hi = j; text = hist[hi]; prog = P.parse(text); hist._co = null;
      if (opts.onChange) opts.onChange(text);
      emit(d < 0 ? "undo" : "redo", text); render();
    }
    function applyProg(np, coalesce) { commit(P.print(np), coalesce); }

    // ---------- rendering ----------
    function errorsFor(i) {
      var out = [], r = prog.rungs[i];
      if (r && r.error) out.push(r.error.message);
      (opts.getErrors ? opts.getErrors() : []).forEach(function (e) { if (e.rung === i && !(r && r.error && r.error.message === e.message)) out.push(e.message); });
      return out;
    }
    function render() {
      bUndo.disabled = hi <= 0; bRedo.disabled = hi >= hist.length - 1;
      if (mode === "text") { renderTextErrors(); return; }
      var sx = scroll.scrollLeft, sy = scroll.scrollTop;
      if (sel.rung == null && prog.rungs.length === 1) sel.rung = 0;
      if (sel.rung != null && sel.rung >= prog.rungs.length) sel.rung = prog.rungs.length ? prog.rungs.length - 1 : null;
      scroll.innerHTML = "";
      var minW = Math.max(R.programWidth(prog, { gap: GAP }), 340);
      var wrap = el("div", { class: "sed-rungs", style: "min-width:" + minW + "px" });
      if (!prog.rungs.length) {
        wrap.appendChild(el("div", { class: "sed-empty" }, [el("p", { text: "No rungs yet." }), el("button", { type: "button", class: "btn primary", text: "Add the first rung", onclick: addRungAt.bind(null, 0) })]));
      }
      prog.rungs.forEach(function (r, i) {
        var isSel = sel.rung === i;
        var box = el("div", { class: "sed-rung" + (isSel ? " sel" : ""), "data-r": i });
        box.innerHTML = R.rungSVG(r, i, { gap: GAP, edit: true, slots: true, selected: sel.rung, minW: minW });
        var errs = errorsFor(i);
        if (errs.length) { var ed = el("div", { class: "sed-err", role: "alert", html: ico("info", 16) + "<span></span>" }); ed.lastChild.textContent = errs[0]; box.appendChild(ed); }
        if (isSel) box.appendChild(rungBar(i));
        wrap.appendChild(box);
      });
      scroll.appendChild(wrap);
      if (sel.path && sel.rung != null) {
        var g = scroll.querySelector('.lad-el[data-r="' + sel.rung + '"][data-p="' + sel.path.join(".") + '"]');
        if (g) g.classList.add("sel");
      }
      scroll.scrollLeft = sx; scroll.scrollTop = sy;
      scroll._lad = null;
      if (opts.engine) R.update(scroll, eng, { idle: !eng.trace });
    }
    function rungBar(i) {
      var b = el("div", { class: "sed-rbar", role: "toolbar", "aria-label": "Rung " + i + " actions" });
      var mk = function (icon, label, fn, danger) { return el("button", { type: "button", class: "chip" + (danger ? " danger" : ""), html: ico(icon, 16) + "<span>" + label + "</span>", onclick: fn }); };
      b.appendChild(mk("plus", "Rung below", function () { addRungAt(i + 1); }));
      b.appendChild(mk("plus", "Rung above", function () { addRungAt(i); }));
      b.appendChild(mk("edit", "Edit as text", function () { editRungText(i); }));
      b.appendChild(mk("msg", "Comment", function () { editComment(i); }));
      if (i > 0) b.appendChild(mk("up", "Move up", function () { sel.rung = i - 1; applyProg(P.ops.moveRung(prog, i, -1)); }));
      if (i < prog.rungs.length - 1) b.appendChild(mk("down", "Move down", function () { sel.rung = i + 1; applyProg(P.ops.moveRung(prog, i, 1)); }));
      b.appendChild(mk("trash", "Delete", function () { sel.path = null; applyProg(P.ops.deleteRung(prog, i)); }, true));
      return b;
    }
    function addRungAt(at) {
      sel.rung = at; sel.path = null;
      applyProg(P.ops.addRung(prog, at));
      if (mode === "visual" && at < prog.rungs.length) setTimeout(function () { pickAt(at, [], 0); }, 60);
    }
    function editComment(i) {
      var inp = el("input", { type: "text", class: "fld", value: prog.rungs[i].comment || "", placeholder: "What does this rung do?", maxlength: 120, "aria-label": "Rung comment" });
      var go = function () { s.close(true); applyProg(P.ops.setComment(prog, i, inp.value.trim())); };
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
      var s = sheet("Rung " + i + " comment", el("div", { class: "sim-form" }, [inp, el("div", { class: "sim-actions" }, [el("button", { type: "button", class: "btn primary", text: "Save", onclick: go })])]));
    }
    function editRungText(i) {
      var r = prog.rungs[i];
      var ta2 = el("textarea", { class: "fld mono", rows: 3, spellcheck: "false", "aria-label": "Rung text", autocapitalize: "off", autocorrect: "off" });
      ta2.value = r.error ? r.raw : P.printSeq(r.nodes) + ";";
      var er = el("p", { class: "sim-ferr", "aria-live": "polite" });
      var go = function () {
        var t = ta2.value.trim();
        var np = P.ops.setRungText(prog, i, t);
        s.close(true); applyProg(np);
      };
      ta2.addEventListener("input", function () { var pr = P.parse(ta2.value.replace(/\n+/g, " ")); er.textContent = pr.errors.length ? pr.errors[0].message : ""; });
      var s = sheet("Rung " + i + " as text", el("div", { class: "sim-form" }, [ta2, er, el("div", { class: "sim-actions" }, [el("button", { type: "button", class: "btn primary", text: "Apply", onclick: go })])]));
    }

    // ---------- pickers ----------
    function allow() { return opts.palette && opts.palette.length ? opts.palette : null; }
    function pickAt(rung, cpath, idx) {
      sel.rung = rung; sel.path = null;
      var last = pickAt._grp || "Bit", al = allow();
      var body = el("div", { class: "pal" });
      var tabs = el("div", { class: "seg pal-tabs", role: "tablist" }), grid = el("div", { class: "pal-grid" });
      var groups = P.GROUPS.filter(function (g) { return Object.keys(SPEC).some(function (k) { return SPEC[k].group === g && (!al || al.indexOf(k) >= 0); }); });
      if (groups.indexOf(last) < 0) last = groups[0];
      function fill(g) {
        pickAt._grp = g; grid.innerHTML = "";
        tabs.querySelectorAll("button").forEach(function (b) { var on = b.getAttribute("data-g") === g; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
        Object.keys(SPEC).filter(function (k) { return SPEC[k].group === g && (!al || al.indexOf(k) >= 0); }).forEach(function (k) {
          grid.appendChild(el("button", { type: "button", class: "pal-it", onclick: function () { chooseOp(k); } }, [el("b", { text: k }), el("span", { text: SPEC[k].name })]));
        });
        if (g === "Bit" && (!al || al.indexOf("BRANCH") >= 0)) grid.appendChild(el("button", { type: "button", class: "pal-it branch", onclick: function () { s.close(true); applyProg(P.ops.insert(prog, rung, cpath, idx, { t: "b", legs: [[], []] })); } }, [el("b", { text: "Branch" }), el("span", { text: "Two parallel paths (OR)" })]));
      }
      groups.forEach(function (g) { tabs.appendChild(el("button", { type: "button", role: "tab", "data-g": g, text: g, onclick: function () { fill(g); } })); });
      if (groups.length > 1) body.appendChild(tabs);
      body.appendChild(grid);
      var hint = el("p", { class: "pal-hint", text: "Tap an instruction to place it." }); body.appendChild(hint);
      var s = sheet("Add instruction", body, { onClose: function () { emit("palette-close"); } });
      fill(last);
      emit("palette", { rung: rung });
      function chooseOp(op) {
        var sp = SPEC[op];
        operandForm(s, op, SPEC[op].args.map(function (a) { return a.def || ""; }), "Add " + op, function (args) {
          s.close(true);
          applyProg(P.ops.insert(prog, rung, cpath, idx, { t: "i", op: op, args: args }));
        }, true);
      }
    }

    function candidates(kind, q) {
      var out = [], all = eng.allPaths(), seen = {};
      q = (q || "").toLowerCase();
      all.forEach(function (p) {
        if (p.indexOf("S:") === 0 && q.indexOf("s") !== 0) return;
        var t = eng.types[p], ok = false;
        if (kind === "bit") ok = t === "BOOL";
        else if (kind === "timer") ok = t === "TIMER";
        else if (kind === "counter") ok = t === "COUNTER";
        else if (kind === "tc") ok = t === "TIMER" || t === "COUNTER";
        else if (kind === "num" || kind === "dest") ok = t === "DINT" || t === "REAL";
        if (ok && !seen[p]) { seen[p] = 1; out.push(p); }
      });
      if (q) {
        out = out.filter(function (p) { return p.toLowerCase().indexOf(q) >= 0; });
        out.sort(function (a, b) { return (a.toLowerCase().indexOf(q) === 0 ? 0 : 1) - (b.toLowerCase().indexOf(q) === 0 ? 0 : 1); });
      }
      return out.slice(0, 14);
    }

    function operandForm(s, op, args, title, onSubmit, isNew) {
      var sp = SPEC[op], form = el("form", { class: "sim-form", novalidate: true, autocomplete: "off" });
      form.appendChild(el("p", { class: "sim-desc", text: sp.desc }));
      var inputs = [], sugg = el("div", { class: "sim-sugg", "aria-label": "Suggested tags" });
      var err = el("p", { class: "sim-ferr", "aria-live": "polite" });
      var active = 0;
      sp.args.forEach(function (a, i) {
        var tagish = a.k !== "lit" && a.k !== "expr";
        var inp = el("input", { type: "text", class: "fld mono", value: args[i] == null ? "" : args[i], "aria-label": a.l, autocapitalize: "off", autocorrect: "off", spellcheck: "false",
          inputmode: a.k === "lit" ? "decimal" : "text", placeholder: a.k === "bit" ? "tag name" : a.k === "timer" ? "timer name, e.g. RunDelay" : a.k === "counter" ? "counter name" : a.k === "num" ? "tag or number" : a.k === "dest" ? "destination tag" : a.k === "expr" ? "(A+B)/2" : "" });
        inputs.push(inp);
        var lab = el("label", { class: "sim-field" }, [el("span", { class: "sim-fl", text: a.l }), inp]);
        form.appendChild(lab);
        function showSugg() {
          active = i; sugg.innerHTML = "";
          if (!tagish) return;
          var c = candidates(a.k, inp.value.trim() === args[i] && !isNew ? "" : inp.value.trim());
          c.forEach(function (p) {
            sugg.appendChild(el("button", { type: "button", class: "chip tagchip", text: p, onclick: function () { inp.value = p; showSugg(); var nx = inputs[i + 1]; if (nx) nx.focus(); } }));
          });
          if (!c.length && inp.value.trim() && /^[A-Za-z_]/.test(inp.value.trim()) && !(inp.value.trim() in eng.values)) sugg.appendChild(el("span", { class: "sim-newtag", text: "New tag “" + inp.value.trim() + "” will be created" }));
        }
        inp.addEventListener("focus", showSugg); inp.addEventListener("input", showSugg);
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (inputs[i + 1]) inputs[i + 1].focus(); else form.requestSubmit ? form.requestSubmit() : submit(); } });
        lab.addEventListener("click", function () { inp.focus(); });
      });
      form.appendChild(sugg);
      form.appendChild(err);
      function submit() {
        var vals = inputs.map(function (x) { return x.value.trim(); });
        var min = sp.min || sp.args.length;
        for (var i = 0; i < sp.args.length; i++) {
          if (vals[i] === "" && i < min) { err.textContent = sp.args[i].l + " can't be empty."; inputs[i].focus(); return; }
          if (vals[i] === "") vals[i] = sp.args[i].def || "0";
          if (sp.args[i].k === "lit" && !LC.simEngine.isNum(vals[i])) { err.textContent = sp.args[i].l + " must be a number."; inputs[i].focus(); return; }
          if (sp.args[i].k === "expr") vals[i] = vals[i].replace(/^"|"$/g, "");
          else if (/[\s,()";]/.test(vals[i])) { err.textContent = "“" + vals[i] + "” isn't a valid tag name or number."; inputs[i].focus(); return; }
        }
        onSubmit(vals);
      }
      form.addEventListener("submit", function (e) { e.preventDefault(); submit(); });
      form.appendChild(el("div", { class: "sim-actions" }, [el("button", { type: "submit", class: "btn primary", text: isNew ? "Add" : "Save" })]));
      s.setBody(form, title);
      setTimeout(function () { var f = inputs.filter(function (x) { return !x.value; })[0] || inputs[0]; if (f) f.focus(); }, 40);
    }

    function elementSheet(rung, path) {
      var node = P.ops.find(prog, rung, path);
      if (!node || node.t !== "i") return;
      sel.rung = rung; sel.path = path; render();
      var sp = SPEC[node.op], cpath = path.slice(0, -1), idx = path[path.length - 1], inLeg = cpath.length > 0;
      var seqLen = P.ops.find(prog, rung, path) && (function () { var q = prog.rungs[rung].nodes; for (var k = 0; k < cpath.length; k += 2) q = q[cpath[k]].legs[cpath[k + 1]]; return q.length; })();
      var body = el("div", { class: "sim-menu" });
      var item = function (icon, label, fn, danger, sub) {
        return el("button", { type: "button", class: "sim-mi" + (danger ? " danger" : ""), onclick: fn, html: ico(icon, 20) + "<span><b>" + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span>" });
      };
      body.appendChild(el("div", { class: "sim-ihead" }, [el("code", { text: P.printSeq([node]) }), el("p", { text: sp.name + ". " + sp.desc })]));
      body.appendChild(item("edit", "Edit operands", function () { operandForm(s, node.op, node.args, "Edit " + node.op, function (args) { s.close(true); applyProg(P.ops.replace(prog, rung, path, { t: "i", op: node.op, args: args })); }, false); }));
      body.appendChild(item("left", "Insert before", function () { s.close(true); pickAt(rung, cpath, idx); }));
      body.appendChild(item("right", "Insert after", function () { s.close(true); pickAt(rung, cpath, idx + 1); }));
      body.appendChild(item("branch", "Add branch around", function () { s.close(true); applyProg(P.ops.wrap(prog, rung, path)); }, false, "Puts a parallel path next to this instruction"));
      if (inLeg) body.appendChild(item("plus", "Add parallel leg", function () { s.close(true); applyProg(P.ops.addLeg(prog, rung, path)); }));
      if (idx > 0) body.appendChild(item("left", "Move left", function () { s.close(true); sel.path = path.slice(0, -1).concat([idx - 1]); applyProg(P.ops.move(prog, rung, path, -1)); }));
      if (idx < seqLen - 1) body.appendChild(item("right", "Move right", function () { s.close(true); sel.path = path.slice(0, -1).concat([idx + 1]); applyProg(P.ops.move(prog, rung, path, 1)); }));
      body.appendChild(item("trash", "Delete instruction", function () { s.close(true); sel.path = null; applyProg(P.ops.remove(prog, rung, path)); }, true));
      var s = sheet(node.op + (node.args[0] ? " " + node.args[0] : ""), body, { onClose: function () { sel.path = null; render(); } });
    }
    function branchSheet(rung, bpath) {
      var br = P.ops.find(prog, rung, bpath); if (!br || br.t !== "b") return;
      var body = el("div", { class: "sim-menu" });
      body.appendChild(el("div", { class: "sim-ihead" }, [el("code", { text: P.printSeq([br]) }), el("p", { text: "A branch gives parallel paths. Power flows if any leg conducts (OR)." })]));
      body.appendChild(el("button", { type: "button", class: "sim-mi", html: ico("plus", 20) + "<span><b>Add parallel leg</b></span>", onclick: function () { s.close(true); applyProg(P.ops.addLegAt(prog, rung, bpath)); } }));
      br.legs.forEach(function (l, k) {
        body.appendChild(el("button", { type: "button", class: "sim-mi danger", html: ico("trash", 20) + "<span><b>Remove leg " + (k + 1) + "</b><small></small></span>", onclick: function () { s.close(true); applyProg(P.ops.removeLeg(prog, rung, bpath, k)); } })).querySelector("small").textContent = l.length ? P.printSeq(l) : "(empty leg)";
      });
      var s = sheet("Branch", body);
    }

    // ---------- events ----------
    scroll.addEventListener("click", function (e) {
      var t = e.target;
      var slot = t.closest && t.closest(".lad-slot"), elg = t.closest && t.closest(".lad-el"), brh = t.closest && t.closest(".lad-brh"), rg = t.closest && t.closest(".sed-rung");
      if (slot) { var c = slot.getAttribute("data-c"); pickAt(+slot.getAttribute("data-r"), c === "" ? [] : c.split(".").map(Number), +slot.getAttribute("data-i")); return; }
      if (brh) { branchSheet(+brh.getAttribute("data-r"), brh.getAttribute("data-b").split(".").map(Number)); return; }
      if (elg) { var r0 = +elg.getAttribute("data-r"); if (sel.rung !== r0) { sel.rung = r0; sel.path = null; render(); emit("select", r0); return; } elementSheet(r0, elg.getAttribute("data-p").split(".").map(Number)); return; }
      if (rg && t.closest(".sed-rbar") == null) { var r1 = +rg.getAttribute("data-r"); if (sel.rung !== r1) { sel.rung = r1; sel.path = null; render(); emit("select", r1); } }
    });
    root.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && mode === "visual" && !(e.target && /input|textarea/i.test(e.target.tagName))) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); histMove(-1); }
        else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); histMove(1); }
      }
    });
    bUndo.addEventListener("click", function () { histMove(-1); });
    bRedo.addEventListener("click", function () { histMove(1); });
    bAdd.addEventListener("click", function () {
      if (mode === "text") { ta.value = ta.value.replace(/\s*$/, "\n") + ";\n"; onTextInput(); ta.focus(); return; }
      addRungAt(sel.rung == null ? prog.rungs.length : sel.rung + 1);
    });
    function setMode(m) {
      if (m === mode) return;
      mode = m;
      bVis.classList.toggle("on", m === "visual"); bTxt.classList.toggle("on", m === "text");
      bVis.setAttribute("aria-pressed", m === "visual"); bTxt.setAttribute("aria-pressed", m === "text");
      scroll.hidden = m === "text"; tx.hidden = m === "visual";
      root.classList.toggle("is-text", m === "text");
      if (m === "text") { ta.value = text; autosize(); renderTextErrors(); } else { prog = P.parse(text); render(); }
      emit("mode", m);
    }
    bVis.addEventListener("click", function () { setMode("visual"); });
    bTxt.addEventListener("click", function () { setMode("text"); });

    var tTimer = null;
    function autosize() { ta.style.height = "auto"; ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, 160), 560) + "px"; }
    function onTextInput() {
      autosize();
      clearTimeout(tTimer);
      tTimer = setTimeout(function () {
        var v = ta.value; if (v === text) return;
        text = v; prog = P.parse(text);
        if (hi > 0 && hist._co === "text") hist[hi] = text; else { hist = hist.slice(0, hi + 1); hist.push(text); hi = hist.length - 1; hist._co = "text"; }
        if (opts.onChange) opts.onChange(text);
        emit("edit", text); render();
      }, 300);
    }
    ta.addEventListener("input", onTextInput);
    ta.addEventListener("blur", function () { hist._co = null; });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && !e.shiftKey) { /* leave focus order alone */ }
    });
    function renderTextErrors() {
      bUndo.disabled = hi <= 0; bRedo.disabled = hi >= hist.length - 1;
      terr.innerHTML = "";
      var pr = P.parse(ta.value);
      var items = pr.errors.map(function (e) { return "Rung " + e.rung + " (line " + e.line + "): " + e.message; });
      (opts.getErrors ? opts.getErrors() : []).forEach(function (e) {
        var m = "Rung " + e.rung + ": " + e.message;
        if (e.rung >= 0 && !pr.errors.some(function (p) { return p.rung === e.rung; })) items.push(m); else if (e.rung < 0) items.push(e.message);
      });
      if (!items.length) terr.appendChild(el("li", { class: "ok", html: ico("check", 16) + "<span>Program parses cleanly.</span>" }));
      items.forEach(function (m) { var li = el("li", { class: "bad", html: ico("info", 16) + "<span></span>" }); li.lastChild.textContent = m; terr.appendChild(li); });
    }

    var api = {
      el: root,
      getText: function () { return text; },
      setText: function (t, opt) {
        t = String(t);
        if (opt && opt.reset) { text = t; hist = [t]; hi = 0; prog = P.parse(t); sel = { rung: null, path: null }; if (opts.onChange && !opt.silent) opts.onChange(t); if (mode === "text") ta.value = t; render(); return; }
        commit(t); if (mode === "text") { ta.value = text; autosize(); }
      },
      refresh: function () { render(); },
      live: function (idle) { if (mode === "visual") R.update(scroll, eng, { idle: idle || !eng.trace }); },
      setMode: setMode, getMode: function () { return mode; },
      undo: function () { histMove(-1); }, redo: function () { histMove(1); },
      selectedRung: function () { return sel.rung; }
    };
    ta.value = text;
    render();
    return api;
  }

  LC.simEditor = { create: create, sheet: sheet, confirm: confirmSheet };
})(typeof window !== "undefined" ? window : globalThis);
