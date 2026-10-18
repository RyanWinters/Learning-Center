/* Lab view: #/lab (index), #/lab/<id> (challenge), #/lab/sandbox.  Integrates through LC.views.lab only. */
(function (root) {
  "use strict";
  var LC = root.LC = root.LC || {};
  LC.views = LC.views || {};
  var IO = LC.simIO, el = IO.el, ico = IO.ico, P = LC.simParser, E = LC.simEngine, R = LC.ladder, ED = LC.simEditor;
  var LEVELS = { 1: "Foundations", 2: "Core instructions", 3: "Applied logic", 4: "Whole machines" };
  var SCAN_OPTS = [10, 20, 50, 100, 250, 500], SPEEDS = [1, 5, 25, 100];

  // ---------- helpers ----------
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function inline(s) {
    s = esc(s);
    s = s.replace(/\{\{term:([\w-]+)\|([^}]*)\}\}/g, '<button type="button" class="gl" data-term="$1">$2</button>');
    s = s.replace(/\{\{lesson:([\w-]+)\}\}/g, function (m, id) { var t = LC.lessonIndex && LC.lessonIndex[id]; return '<a href="#/lesson/' + id + '">' + esc(t && t.title || id) + "</a>"; });
    s = s.replace(/\{\{sim:([\w-]+)\}\}/g, '<a href="#/lab/$1">Open challenge</a>');
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return s;
  }
  function md(src) {
    var lines = String(src || "").replace(/\r/g, "").split("\n"), out = [], i = 0;
    while (i < lines.length) {
      var l = lines[i];
      if (/^\s*$/.test(l)) { i++; continue; }
      var f = /^```(\w*)\s*$/.exec(l);
      if (f) {
        var buf = []; i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]); i++;
        if (f[1] === "ladder" && R && R.renderStatic) out.push(R.renderStatic(buf.join("\n")));
        else out.push("<pre><code>" + esc(buf.join("\n")) + "</code></pre>");
        continue;
      }
      var hd = /^(#{2,4})\s+(.*)$/.exec(l);
      if (hd) { var lv = Math.min(hd[1].length + 1, 5); out.push("<h" + lv + ">" + inline(hd[2]) + "</h" + lv + ">"); i++; continue; }
      var co = /^>\s*\[!(\w+)\]\s*(.*)$/.exec(l);
      if (co) {
        var body = []; i++;
        while (i < lines.length && /^>/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ""));
        out.push('<aside class="lab-callout ' + co[1].toLowerCase() + '"><strong>' + inline(co[2] || co[1]) + "</strong>" + md(body.join("\n")) + "</aside>");
        continue;
      }
      if (/^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")) {
        var rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        var cells = function (r) { return r.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }); };
        var hdr = cells(rows[0]), t = '<div class="lab-tbl"><table><thead><tr>' + hdr.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
        rows.slice(2).forEach(function (r) { t += "<tr>" + cells(r).map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; });
        out.push(t + "</tbody></table></div>"); continue;
      }
      var li = /^(\s*)([-*]|\d+\.)\s+/.exec(l);
      if (li) {
        var ord = /\d/.test(li[2]), items = [];
        while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "")); i++; }
        out.push("<" + (ord ? "ol" : "ul") + ">" + items.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("") + "</" + (ord ? "ol" : "ul") + ">");
        continue;
      }
      var para = [l]; i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{2,4}\s|```|>\s*\[!|\s*([-*]|\d+\.)\s+|\s*\|)/.test(lines[i])) para.push(lines[i++]);
      out.push("<p>" + inline(para.join(" ")) + "</p>");
    }
    return out.join("");
  }
  function gl(node) { if (LC.glossaryLink) { try { LC.glossaryLink(node); } catch (e) {} } return node; }
  function mdEl(src, cls) { var d = el("div", { class: "lab-md" + (cls ? " " + cls : ""), html: md(src) }); return gl(d); }

  function storeSims() { try { return (LC.store && LC.store.get().sims) || {}; } catch (e) { return {}; } }
  function loadProgram(id, starter) {
    try {
      var s = storeSims()[id];
      if (s && typeof s.program === "string") return s.program;
      var ls = localStorage.getItem("lc.sim." + id);
      if (ls != null) return ls;
    } catch (e) {}
    return starter;
  }
  var saveT = {};
  function saveProgram(id, text) {
    clearTimeout(saveT[id]);
    saveT[id] = setTimeout(function () {
      try { if (LC.store && LC.store.saveSimProgram) LC.store.saveSimProgram(id, text); else localStorage.setItem("lc.sim." + id, text); } catch (e) {}
    }, 400);
  }
  function simIndex() { return root.LC_SIM_INDEX || []; }
  function loadSim(id) {
    return new Promise(function (resolve) {
      if (LC.sims && LC.sims[id]) return resolve(LC.sims[id]);
      var s = document.createElement("script");
      s.src = "content/sim/" + id + ".js"; s.async = true;
      s.onload = function () { resolve((LC.sims && LC.sims[id]) || null); };
      s.onerror = function () { s.remove(); resolve(null); };
      document.head.appendChild(s);
    });
  }
  function isPhone() { try { return !!(root.matchMedia && root.matchMedia("(max-width: 640px)").matches); } catch (e) { return false; } }
  // One plain line for the collapsed phone brief: first prose paragraph with the markup stripped.
  function briefLine(src) {
    var lines = String(src || "").replace(/\r/g, "").split("\n"), keep = [], fence = false;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^```/.test(l)) { fence = !fence; continue; }
      if (fence || /^\s*(#|>|\||[-*]\s|\d+\.\s)/.test(l)) { if (keep.length) break; continue; }
      if (/^\s*$/.test(l)) { if (keep.length) break; continue; }
      keep.push(l.trim());
    }
    return keep.join(" ").replace(/\{\{term:[\w-]+\|([^}]*)\}\}/g, "$1").replace(/\{\{[^}]*\}\}/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "").replace(/\s+/g, " ").trim();
  }
  function backLink() { return el("a", { class: "lab-back", href: "#/lab", html: ico("left", 16) + "<span>Lab</span>" }); }

  // ---------- index ----------
  function indexView(container) {
    container.innerHTML = "";
    var idx = simIndex(), sims = storeSims();
    var page = el("div", { class: "lab lab-index" });
    var passed = idx.filter(function (x) { return sims[x.id] && sims[x.id].status === "passed"; }).length;
    page.appendChild(el("header", { class: "lab-ihead" }, [
      el("p", { class: "eyebrow", text: "Simulator lab" }),
      el("h1", { text: "Write ladder logic. Watch it scan." }),
      el("p", { class: "lede", text: "Each challenge gives you a small machine, a goal and a set of automatic tests. Build the rungs, press Check, and read why the answer works. Hints are there when you need them, and each one costs a little XP." }),
      idx.length ? el("p", { class: "lab-prog", html: "<b>" + passed + "</b> of " + idx.length + " challenges passed" }) : null]));
    page.appendChild(el("a", { class: "lab-sbx", href: "#/lab/sandbox" }, [
      el("span", { class: "lab-sbx-ico", html: ico("ladder", 28) }),
      el("span", { class: "lab-sbx-txt" }, [el("b", { text: "Sandbox" }), el("span", { text: "Every instruction, an empty program and a generic panel of buttons, lamps and a slider. No goals, no grading." })]),
      el("span", { class: "lab-go", html: ico("right", 20) })]));
    if (!idx.length) page.appendChild(el("p", { class: "lab-empty", text: "The challenge index hasn't loaded." }));
    [1, 2, 3, 4].forEach(function (lv) {
      var items = idx.filter(function (x) { return x.level === lv; });
      if (!items.length) return;
      var sec = el("section", { class: "lab-level" }, [el("h2", { html: '<span class="lv">Level ' + lv + "</span> " + LEVELS[lv] })]);
      var ul = el("ul", { class: "lab-list" });
      items.forEach(function (x) {
        var st = sims[x.id], state = st && st.status === "passed" ? "passed" : st && st.status === "started" ? "started" : "new";
        var chip = state === "passed" ? '<span class="chip ok">' + ico("check", 14) + "Passed</span>" : state === "started" ? '<span class="chip warn">' + ico("edit", 14) + "In progress</span>" : '<span class="chip">Not started</span>';
        var hints = st && st.hintsUsed ? '<span class="lab-hu">' + st.hintsUsed + (st.hintsUsed === 1 ? " hint" : " hints") + "</span>" : "";
        ul.appendChild(el("li", {}, [el("a", { class: "lab-row " + state, href: "#/lab/" + x.id, html: '<span class="lab-rt"><b></b><small></small></span><span class="lab-rs">' + hints + chip + "</span>" })]));
        var a = ul.lastChild.firstChild; a.querySelector("b").textContent = x.title; a.querySelector("small").textContent = x.summary || "";
      });
      sec.appendChild(ul); page.appendChild(sec);
    });
    container.appendChild(page);
    gl(page);
  }

  // ---------- tag table ----------
  function tagTable(eng, opts) {
    var wrap = el("details", { class: "lab-tags" }, [el("summary", { html: ico("tag", 16) + "<span>Tags</span>" })]);
    if (opts.open) wrap.open = true;
    var body = el("div", { class: "lab-tags-body" });
    wrap.appendChild(body);
    var cells = {}, expanded = {};
    function valCell(path) {
      var t = eng.types[path], td = el("td", { class: "tv" });
      if (t === "BOOL") {
        var b = el("button", { type: "button", class: "tbool", "aria-label": "Toggle " + path, onclick: function () { try { eng.poke(path, !eng.read(path)); } catch (e) {} opts.refresh(); } });
        td.appendChild(b); cells[path] = function () { var v = !!eng.read(path); b.textContent = v ? "1" : "0"; b.classList.toggle("on", v); b.setAttribute("aria-pressed", v); };
      } else {
        var inp = el("input", { type: "text", class: "tnum", inputmode: "decimal", "aria-label": "Value of " + path });
        inp.addEventListener("change", function () { var n = Number(inp.value); if (isFinite(n)) { try { eng.poke(path, n); } catch (e) {} } opts.refresh(); });
        td.appendChild(inp); cells[path] = function () { if (document.activeElement !== inp) inp.value = R.fmtVal(eng.read(path)); };
      }
      return td;
    }
    function rowFor(path, label, depth, info) {
      var t = eng.types[path], kids = eng.members(path), tr = el("tr", { class: "d" + depth });
      var nm = el("td", { class: "tn" });
      if (kids.length) {
        var open = !!expanded[path];
        nm.appendChild(el("button", { type: "button", class: "tx", "aria-expanded": open, "aria-label": (open ? "Collapse " : "Expand ") + label, html: ico(open ? "down" : "right", 14), onclick: function () { expanded[path] = !open; build(); } }));
      }
      nm.appendChild(el("code", { text: label }));
      tr.appendChild(nm);
      var ty = el("td", { class: "tt" });
      if (info && info.auto && opts.retype) {
        var sel = el("select", { "aria-label": "Type of " + label });
        ["BOOL", "DINT", "REAL", "TIMER", "COUNTER"].forEach(function (o) { var op = el("option", { value: o, text: o }); if (o === t) op.selected = true; sel.appendChild(op); });
        sel.addEventListener("change", function () { opts.retype(label, sel.value); });
        ty.appendChild(sel);
      } else ty.textContent = eng.arrays[path] ? t : t;
      tr.appendChild(ty);
      if (eng.isLeaf(path)) tr.appendChild(valCell(path)); else tr.appendChild(el("td", { class: "tv muted", text: kids.length ? kids.length + (eng.arrays[path] ? " items" : " members") : "" }));
      tr.appendChild(el("td", { class: "td", text: (info && info.desc) || "" }));
      return tr;
    }
    function addRows(tbody, path, label, depth, info) {
      tbody.appendChild(rowFor(path, label, depth, info));
      if (expanded[path]) eng.members(path).forEach(function (m) { addRows(tbody, m, m.slice(path.length).replace(/^\./, "."), depth + 1, null); });
    }
    function build() {
      cells = {}; body.innerHTML = "";
      if (opts.addTag) {
        var nm = el("input", { type: "text", class: "fld mono", placeholder: "NewTag", "aria-label": "New tag name", autocapitalize: "off", spellcheck: "false" });
        var ty = el("select", { class: "fld", "aria-label": "New tag type" }); ["BOOL", "DINT", "REAL", "TIMER", "COUNTER", "DINT[10]", "BOOL[8]"].forEach(function (o) { ty.appendChild(el("option", { value: o, text: o })); });
        var msg = el("span", { class: "sim-ferr", "aria-live": "polite" });
        var add = function () { try { eng.declare(nm.value.trim(), ty.value, { auto: false }); nm.value = ""; msg.textContent = ""; opts.refresh(true); build(); } catch (e) { msg.textContent = e.message; } };
        nm.addEventListener("keydown", function (e) { if (e.key === "Enter") add(); });
        body.appendChild(el("div", { class: "lab-addtag" }, [nm, ty, el("button", { type: "button", class: "btn small", html: ico("plus", 14) + "<span>Add tag</span>", onclick: add }), msg]));
      }
      var table = el("table", { class: "tt-tab" }, [el("thead", {}, [el("tr", {}, [el("th", { text: "Name" }), el("th", { text: "Type" }), el("th", { text: "Value" }), el("th", { text: "Description" })])])]);
      var tb = el("tbody"); table.appendChild(tb);
      eng.tagList().forEach(function (t) { addRows(tb, t.name, t.name, 0, t); });
      body.appendChild(el("div", { class: "lab-tbl" }, [table]));
      api.update();
    }
    var api = { el: wrap, rebuild: build, update: function () { Object.keys(cells).forEach(function (k) { cells[k](); }); } };
    build();
    return api;
  }

  // ---------- challenge / sandbox ----------
  function workbench(container, sim, mode) {
    if (container._labStop) { try { container._labStop(); } catch (e) {} }
    var stopped = false, timers = [];
    container._labStop = function () { stopped = true; timers.forEach(clearTimeout); timers = []; if (tickT) clearInterval(tickT); };
    var isBox = mode === "sandbox", id = sim.id, tour = sim.tour || null;
    var eng = E.engineFor(sim, { trace: true });
    var running = true, speed = 1, tickT = null, hintsShown = 0, failedChecks = 0, solShown = false, passedNow = false, stepping = false;
    var prevStatus = storeSims()[id] && storeSims()[id].status;
    var tourState = { step: 0, done: false };

    container.innerHTML = "";
    var page = el("div", { class: "lab lab-ch" + (isBox ? " is-sandbox" : "") });
    var head = el("header", { class: "lab-head" }, [backLink(), el("h1", { text: sim.title }),
      el("div", { class: "lab-meta" }, isBox ? [] : [el("span", { class: "chip lvl", text: "Level " + sim.level + " · " + LEVELS[sim.level] }),
        el("span", { class: "chip st", "data-st": "" })])]);
    page.appendChild(head);
    var grid = el("div", { class: "lab-grid" });
    page.appendChild(grid);

    // brief
    var phone = isPhone();
    var briefSrc = isBox && sim.legacy ? "A free workbench. Add rungs, use any instruction, and invent your own tags. New tags are created for you as you type them, and you can change their type in the **Tags** table. Inputs `I0` to `I7`, lamps `O0` to `O7`, analog in `AI0` and analog out `AO0` are already wired to the panel.\n\nTry `XIC(I0)OTE(O0);` then hold PB1 Start." : isBox ? "A free workbench. Add rungs, use any instruction, and invent your own tags. New tags are created for you as you type them, and you can change their type in the **Tags** table. The panel is wired like a Logix chassis: inputs `Local:1:I.Data.0` to `.7` (PB1 Start, PB2 Stop and so on), outputs `Local:2:O.Data.0` to `.7` (lamps, contactor, valve) and analog in `Local:3:I.Ch0Data` (REAL).\n\nTry `XIC(Local:1:I.Data.0)OTE(Local:2:O.Data.0);` then hold PB1 Start." : sim.brief;
    var briefD = el("details", { class: "lab-brief", open: !phone }, [el("summary", { html: ico("book", 16) + "<span class='bl'>" + (isBox ? "About the sandbox" : "Brief") + "</span><span class='bx'></span><span class='bm'><span class='bm-c'>Read brief</span><span class='bm-o'>Hide brief</span></span>" })]);
    briefD.querySelector(".bx").textContent = briefLine(briefSrc);
    briefD.appendChild(mdEl(briefSrc, "brief-md"));
    if (sim.palette && !isBox) briefD.appendChild(el("p", { class: "lab-note", text: "This challenge limits the palette to: " + sim.palette.join(", ") + ". Text mode accepts anything." }));
    var briefCol = el("div", { class: "lab-brief-wrap" }, [briefD]);
    grid.appendChild(briefCol);

    // tour card
    var tourCard = null;
    if (tour) {
      tourCard = el("section", { class: "lab-tour", "aria-live": "polite" });
      briefCol.insertBefore(tourCard, briefD);
    }

    // work column
    var work = el("div", { class: "lab-work" });
    var ioHost = el("div", { class: "lab-io-host" });
    var ioD = el("details", { class: "lab-io", open: !phone || (sim.io || []).length <= 4, "data-tour": "io" }, [el("summary", { html: ico("flag", 16) + "<span>Inputs and outputs</span>" }), ioHost]);
    work.appendChild(ioD);
    // controls
    var bRun = el("button", { type: "button", class: "btn primary run", html: ico("pause") + "<span>Pause</span>", "data-tour": "run" });
    var bStep = el("button", { type: "button", class: "btn", html: ico("step") + "<span>Single scan</span>", "data-tour": "step" });
    var bReset = el("button", { type: "button", class: "btn", html: ico("reset") + "<span>Reset</span>", "data-tour": "reset" });
    var selScan = el("select", { "aria-label": "Scan time" }); SCAN_OPTS.forEach(function (v) { var o = el("option", { value: v, text: v + " ms" }); if (v === eng.scanMs) o.selected = true; selScan.appendChild(o); });
    var selSpeed = el("select", { "aria-label": "Run speed" }); SPEEDS.forEach(function (v) { selSpeed.appendChild(el("option", { value: v, text: v + "x" })); });
    var stages = ["Input scan", "Logic", "Output scan"].map(function (t, i) { return el("li", { "data-s": i + 1 }, [el("span", { class: "n", text: i + 1 }), el("span", { text: t })]); });
    var stageList = el("ol", { class: "lab-stages", "aria-label": "Scan stages", "data-tour": "stages" }, stages);
    var stat = el("div", { class: "lab-stat", role: "status" });
    var ctrl = el("section", { class: "lab-ctrl" }, [
      el("div", { class: "lab-btns" }, [bRun, bStep, bReset]),
      el("div", { class: "lab-sel" }, [el("label", {}, [el("span", { text: "Scan time" }), selScan]), el("label", {}, [el("span", { text: "Speed" }), selSpeed])]),
      stageList, stat,
      el("details", { class: "lab-about" }, [el("summary", { text: "How the scan works" }), el("p", { text: "Each scan copies the physical inputs into the input image, runs every rung top to bottom, left to right, then copies the output image to the physical outputs, and the clock advances by one scan time. Real Logix controllers update I/O asynchronously, but this image-table model is the classic way to learn it. Pause, press a button, then use Single scan to watch each stage." })])]);
    work.appendChild(ctrl);
    var edHost = el("div", { class: "lab-ed", "data-tour": "editor" });
    work.appendChild(edHost);
    var created = el("p", { class: "lab-created", hidden: true, "aria-live": "polite" });
    work.appendChild(created);
    var fault = el("p", { class: "lab-fault", hidden: true, role: "alert" });
    work.appendChild(fault);
    var reset2 = el("button", { type: "button", class: "btn small ghost", html: ico("reset", 14) + "<span>Start over</span>", onclick: function () {
      ED.confirm("Start over?", "Replace your program with the starting program? You can undo this afterwards.", "Start over", function () { editor.setText(sim.starter || ""); }, true); } });
    work.appendChild(el("div", { class: "lab-edfoot" }, isBox ? [] : [reset2]));
    grid.appendChild(work);

    // check area
    var checkSec = el("section", { class: "lab-check", "data-tour": "check" });
    var bCheck = el("button", { type: "button", class: "btn primary", html: ico("check") + "<span>Check</span>" });
    var bHint = el("button", { type: "button", class: "btn", html: ico("bulb") + "<span>Hint</span>", "data-tour": "hint" });
    var bSol = el("button", { type: "button", class: "btn ghost", html: ico("lock", 16) + "<span>Show solution</span>" });
    var actions = el("div", { class: "lab-actions" }, [bCheck, bHint, bSol]);
    var results = el("div", { class: "lab-results", "aria-live": "polite" });
    var hintsBox = el("ol", { class: "lab-hints" });
    var solBox = el("div", { class: "lab-sol", hidden: true });
    var explainBox = el("div", { class: "lab-explain", hidden: true });
    if (!isBox && !tour) { checkSec.appendChild(actions); checkSec.appendChild(results); checkSec.appendChild(hintsBox); checkSec.appendChild(solBox); }
    checkSec.appendChild(explainBox);
    if (!isBox) grid.appendChild(checkSec);

    // tags
    var tags = tagTable(eng, {
      addTag: isBox, open: isBox && !phone,
      refresh: function (rebuild) { if (rebuild) { loadText(editor.getText(), true); } refreshAll(); },
      retype: function (name, type) { try { eng.declare(name, type, { auto: true }); } catch (e) {} loadText(editor.getText(), true); tags.rebuild(); refreshAll(); }
    });
    var tagWrap = el("div", { class: "lab-tagwrap" }, [tags.el]);
    grid.appendChild(tagWrap);

    container.appendChild(page);

    // ----- IO -----
    var iop = IO.create(ioHost, { engine: eng, io: sim.io, onInput: function (tag, v) { tourFire("input:" + tag + ":" + (v ? 1 : 0)); if (!running) refreshAll(); } });

    // ----- editor -----
    var knownAuto = {};
    function loadText(text, quiet) {
      var before = {}; eng.tagList().forEach(function (t) { before[t.name] = 1; });
      eng.load(text);
      iop.release && 0;
      if (!quiet && isBox) announceCreated(before);
      else if (!quiet) announceCreated(before);
    }
    function announceCreated(before) {
      var made = eng.tagList().filter(function (t) { return t.auto && !before[t.name] && !knownAuto[t.name]; });
      made.forEach(function (t) { knownAuto[t.name] = 1; });
      if (made.length) {
        created.hidden = false;
        created.innerHTML = ico("info", 16) + "<span>Created tag" + (made.length > 1 ? "s" : "") + ": " + made.map(function (t) { return "<code>" + esc(t.name) + "</code> (" + t.type + ")"; }).join(", ") + ". Wrong type? Change it in the Tags table.</span>";
        if (!phone) tags.el.open = true;
      } else if (!eng.tagList().some(function (t) { return t.auto; })) created.hidden = true;
      tags.rebuild();
    }
    var startText = isBox ? loadProgram("sandbox", "") : loadProgram(id, sim.starter || "");
    var editor = LC.simEditor.create(edHost, {
      engine: eng, text: startText, palette: sim.palette,
      getErrors: function () { return eng.errors; },
      onChange: function (text) { loadText(text); saveProgram(isBox ? "sandbox" : id, text); refreshAll(); },
      onEvent: function (n, d) { tourFire(n); if (n === "edit") tourFire("edit"); }
    });
    loadText(startText, true);
    tags.rebuild();
    editor.refresh();

    // ----- run loop -----
    function refreshAll() {
      iop.update(); editor.live(); tags.update();
      var f = eng.fault;
      fault.hidden = !f; if (f) fault.innerHTML = ico("info", 16) + "<span>" + esc(f) + "</span>";
      stat.innerHTML = "<span class='st-" + (running ? "run" : "pause") + "'>" + (running ? "RUN" : "PAUSED") + "</span><span>Scan " + eng.scans + "</span><span>" + (eng.now / 1000).toFixed(2) + " s</span><span>" + (eng.errors.length ? "Program has " + eng.errors.length + " error" + (eng.errors.length > 1 ? "s" : "") : "No errors") + "</span>";
      stages.forEach(function (li, i) { li.classList.toggle("on", eng.stage === i + 1 && !running); });
    }
    function interval() { return Math.max(eng.scanMs, 20); }
    function startLoop() {
      if (tickT) clearInterval(tickT);
      tickT = setInterval(function () {
        if (stopped || !container.isConnected) { container._labStop && container._labStop(); return; }
        if (!running || stepping) return;
        var n = Math.max(1, Math.round(interval() / eng.scanMs)) * speed;
        for (var i = 0; i < n; i++) eng.scan();
        refreshAll();
      }, interval());
    }
    function setRunning(r) {
      running = r; bRun.innerHTML = ico(r ? "pause" : "play") + "<span>" + (r ? "Pause" : "Run") + "</span>"; bRun.classList.toggle("primary", r);
      if (!r) eng.trace = eng.trace; refreshAll(); tourFire(r ? "run" : "pause");
    }
    bRun.addEventListener("click", function () { setRunning(!running); });
    bReset.addEventListener("click", function () { eng.reset(); iop.release(); refreshAll(); editor.live(true); tourFire("reset"); });
    selScan.addEventListener("change", function () { eng.setScanMs(+selScan.value); startLoop(); refreshAll(); });
    selSpeed.addEventListener("change", function () { speed = +selSpeed.value; });
    bStep.addEventListener("click", function () {
      if (stepping) return; stepping = true; bStep.disabled = true;
      if (running) setRunning(false);
      var seq = [function () { eng.inputScan(); }, function () { eng.logicScan(); }, function () { eng.outputScan(); }, function () { eng.advance(); eng.stage = 0; }];
      var k = 0;
      (function go() {
        if (stopped) return;
        seq[k++](); refreshAll();
        if (k < seq.length) timers.push(setTimeout(go, 420)); else { stepping = false; bStep.disabled = false; tourFire("scan"); }
      })();
    });
    startLoop();

    // ----- hints / check -----
    var hints = sim.hints || [];
    var tiers = ["Nudge", "Approach", "Nearly there"];
    function updateHintUi() {
      var left = hints.length - hintsShown;
      bHint.disabled = left <= 0;
      bHint.querySelector("span").textContent = left > 0 ? "Hint (" + left + " left)" : "No more hints";
      var unlocked = hintsShown >= Math.min(3, hints.length) || failedChecks > 0 || solShown;
      bSol.disabled = !unlocked && !solShown;
      bSol.innerHTML = ico(unlocked ? "eye" : "lock", 16) + "<span>Show solution</span>";
      bSol.title = unlocked ? "" : "Unlocks after 3 hints or a failed check";
      var stEl = head.querySelector(".chip.st");
      var s = storeSims()[id];
      if (stEl) { var ps = passedNow || (s && s.status === "passed"); stEl.className = "chip st " + (ps ? "ok" : ""); stEl.innerHTML = ps ? ico("check", 14) + "Passed" : "Not passed yet"; }
    }
    bHint.addEventListener("click", function () {
      if (hintsShown >= hints.length) return;
      var h = hints[hintsShown];
      var li = el("li", {}, [el("span", { class: "tier", text: tiers[Math.min(hintsShown, 2)] }), mdEl(h)]);
      hintsBox.appendChild(li); hintsShown++; updateHintUi(); tourFire("hint");
      li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    bSol.addEventListener("click", function () {
      if (solShown) { solBox.hidden = !solBox.hidden; return; }
      ED.confirm("Show the solution?", "This counts as using every hint, so the XP for this challenge drops to the minimum. Try one more hint first if you can.", "Show solution", function () {
        solShown = true; hintsShown = Math.max(hintsShown, 3);
        solBox.hidden = false; solBox.innerHTML = "";
        solBox.appendChild(el("h3", { text: "One solution" }));
        solBox.appendChild(el("div", { html: R.renderStatic(sim.solution) }));
        solBox.appendChild(el("div", { class: "lab-actions" }, [el("button", { type: "button", class: "btn", html: ico("edit", 16) + "<span>Load into editor</span>", onclick: function () { editor.setText(sim.solution + "\n"); } })]));
        updateHintUi();
      }, false);
    });
    function renderResults(res) {
      results.innerHTML = "";
      var ok = res.tests.filter(function (t) { return t.passed; }).length;
      var sum = el("p", { class: "lab-sum " + (res.passed ? "ok" : "bad"), html: ico(res.passed ? "check" : "x", 18) + "<span></span>" });
      sum.lastChild.textContent = res.passed ? "All " + res.tests.length + " tests pass." : ok + " of " + res.tests.length + " tests pass.";
      results.appendChild(sum);
      if (res.errors.length) { var e1 = el("p", { class: "lab-note bad", html: ico("info", 16) + "<span></span>" }); e1.lastChild.textContent = "Fix this first: " + res.errors[0]; results.appendChild(e1); }
      if (res.missing.length) { var e2 = el("p", { class: "lab-note bad", html: ico("info", 16) + "<span></span>" }); e2.lastChild.textContent = "This challenge asks you to use " + res.missing.join(", ") + "."; results.appendChild(e2); }
      var ul = el("ul", { class: "lab-tests" });
      res.tests.forEach(function (t) {
        var li = el("li", { class: t.passed ? "ok" : "bad", html: ico(t.passed ? "check" : "x", 16) + "<span><b></b><small></small></span>" });
        li.querySelector("b").textContent = t.name; li.querySelector("small").textContent = t.passed ? "" : t.message;
        ul.appendChild(li);
      });
      results.appendChild(ul);
    }
    function onPass() {
      if (passedNow) return;
      passedNow = true;
      var used = Math.min(solShown ? Math.max(hintsShown, 3) : hintsShown, 9);
      try { if (LC.store && LC.store.recordSim && prevStatus !== "passed") LC.store.recordSim(id, { passed: true, hintsUsed: used }); } catch (e) {}
      explainBox.hidden = false; explainBox.innerHTML = "";
      explainBox.appendChild(el("h2", { html: ico("check", 20) + "<span>Passed</span>" }));
      explainBox.appendChild(mdEl(sim.explain || ""));
      if (sim.tips && sim.tips.length) {
        var tl = el("div", { class: "lab-tips" }, [el("h3", { text: "Real-world tips" })]);
        var ul = el("ul"); sim.tips.forEach(function (t) { ul.appendChild(el("li", { html: inline(t) })); }); tl.appendChild(ul); explainBox.appendChild(tl);
      }
      var idx = simIndex(), at = idx.map(function (x) { return x.id; }).indexOf(id), nx = idx[at + 1];
      if (nx) explainBox.appendChild(el("a", { class: "btn primary lab-next", href: "#/lab/" + nx.id, html: "<span></span>" + ico("right", 18) })).firstChild.textContent = "Next: " + nx.title;
      gl(explainBox); updateHintUi();
      explainBox.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    bCheck.addEventListener("click", function () {
      var res = E.runTests(sim, editor.getText());
      renderResults(res); tourFire("check");
      if (res.passed) onPass(); else { failedChecks++; updateHintUi(); }
    });
    if (!isBox) updateHintUi();
    if (!isBox && !tour) { var s0 = storeSims()[id]; if (s0 && s0.status === "passed") { passedNow = false; } }

    // ----- tour -----
    function tourRender() {
      if (!tour) return;
      var st = tour[tourState.step], last = tourState.step === tour.length - 1;
      tourCard.innerHTML = "";
      page.querySelectorAll(".tour-hl").forEach(function (n) { n.classList.remove("tour-hl"); });
      if (tourState.done) {
        tourCard.appendChild(el("h2", { html: ico("check", 20) + "<span>Tour complete</span>" }));
        return;
      }
      tourCard.appendChild(el("p", { class: "tour-n", text: "Step " + (tourState.step + 1) + " of " + tour.length }));
      tourCard.appendChild(el("h2", { text: st.title }));
      tourCard.appendChild(mdEl(st.body));
      var okMsg = el("p", { class: "tour-ok", hidden: !tourState.ok, html: ico("check", 16) + "<span>Done. Nice.</span>" });
      tourCard.appendChild(okMsg);
      var back = el("button", { type: "button", class: "btn small", text: "Back", disabled: tourState.step === 0, onclick: function () { tourState.step--; tourState.ok = false; tourRender(); } });
      var next = el("button", { type: "button", class: "btn small primary", text: last ? "Finish tour" : (st.done && st.done !== "next" && !tourState.ok ? "Skip step" : "Next"), onclick: function () {
        if (last) { tourState.done = true; tourRender(); finishTour(); return; }
        tourState.step++; tourState.ok = false; tourRender();
      } });
      tourCard.appendChild(el("div", { class: "lab-actions" }, [back, next]));
      if (st.target) { var t = page.querySelector(st.target); if (t) { t.classList.add("tour-hl"); if (t.scrollIntoView) t.scrollIntoView({ block: "nearest", behavior: "smooth" }); } }
      if (st.open) { var d = page.querySelector(st.open); if (d && d.tagName === "DETAILS") d.open = true; }
    }
    function tourFire(evt) {
      if (!tour || tourState.done) return;
      var st = tour[tourState.step];
      if (st.done && st.done !== "next" && !tourState.ok) {
        var match = st.done === evt || (st.done.indexOf("*") > 0 && evt.indexOf(st.done.slice(0, -1)) === 0);
        if (match) { tourState.ok = true; var ok = tourCard.querySelector(".tour-ok"); if (ok) ok.hidden = false; var nb = tourCard.querySelector(".btn.primary"); if (nb && nb.textContent === "Skip step") nb.textContent = tourState.step === tour.length - 1 ? "Finish tour" : "Next"; }
      }
    }
    function finishTour() {
      passedNow = false; onPass();
    }
    tourRender();
    refreshAll();
    updateHintUi && !isBox && updateHintUi();
  }

  function comingSoon(container, id) {
    var x = simIndex().filter(function (s) { return s.id === id; })[0];
    container.innerHTML = "";
    var page = el("div", { class: "lab lab-ch" }, [el("header", { class: "lab-head" }, [backLink(), el("h1", { text: x ? x.title : "Challenge" })]),
      el("div", { class: "lab-soon" }, [el("span", { class: "chip warn", text: "Coming soon" }), el("p", { text: x ? x.summary : "This challenge isn't available." }),
        el("p", { text: "It hasn't been written yet. The sandbox has every instruction if you want to experiment now." }), el("a", { class: "btn", href: "#/lab/sandbox", text: "Open the sandbox" })])]);
    container.appendChild(page);
  }

  LC.views.lab = function (container, args) {
    var id = args && args.id;
    if (container._labStop) { try { container._labStop(); } catch (e) {} container._labStop = null; }
    if (!LC.simEngine || !LC.simEditor || !LC.ladder) { container.textContent = "The simulator scripts did not load."; return; }
    if (!id) return indexView(container);
    if (id === "sandbox") {
      var legacy = false, MODS = { "Local:1:I": "MOD_DI16", "Local:2:O": "MOD_DO16", "Local:3:I": "MOD_AI4", "Local:4:O": "MOD_AO2" };
      try { E.engineFor({ id: "probe", tags: { "Local:1:I": "MOD_DI16" }, io: [], tests: [] }, {}); } catch (e) { legacy = true; } // engine without module tags
      var tags = {}, sio = IO.sandboxIO(legacy);
      if (legacy) sio.forEach(function (w) { tags[w.tag] = w.widget === "slider" || w.widget === "value" ? "REAL" : "BOOL"; });
      else tags = MODS;
      return workbench(container, { id: "sandbox", title: "Sandbox", tags: tags, io: sio, legacy: legacy, starter: "", tests: [], hints: [] }, "sandbox");
    }
    container.innerHTML = '<div class="lab"><p class="lab-loading">Loading challenge…</p></div>';
    loadSim(id).then(function (sim) {
      if (container._labToken !== token) return;
      if (!sim) return comingSoon(container, id);
      workbench(container, sim, "challenge");
    });
    var token = container._labToken = {};
  };
})(typeof window !== "undefined" ? window : globalThis);
