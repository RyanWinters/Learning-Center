/* I/O panel: widgets bound to tags (pb, toggle, sensor, slider, lamp, motor, value, bar), plus tiny DOM and icon helpers.
   Process models live on the challenge (process.init/step) and are driven by the engine, not here. */
(function (root) {
  "use strict";
  var LC = root.LC = root.LC || {};

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k === "text") n.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  var ICONS = {
    play: '<path d="M7 5l12 7-12 7z"/>', pause: '<path d="M8 5v14M16 5v14"/>', step: '<path d="M6 5l9 7-9 7zM19 5v14"/>',
    reset: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5"/>', undo: '<path d="M9 7L4 12l5 5M4 12h10a6 6 0 0 1 0 12"/>',
    redo: '<path d="M15 7l5 5-5 5M20 12H10a6 6 0 0 0 0 12"/>', plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>', code: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>', ladder: '<path d="M6 3v18M18 3v18M6 8h12M6 16h12"/>',
    check: '<path d="M5 12l5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    branch: '<path d="M3 12h4M17 12h4M7 12V6h10v12H7z"/>', msg: '<path d="M4 5h16v11H9l-5 4z"/>', tag: '<path d="M3 12l9-9h8v8l-9 9z"/><circle cx="16" cy="8" r="1.4"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>'
  };
  function ico(name, size) {
    var s = size || 18;
    return '<svg class="ico" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  function fmt(v, dec) {
    if (typeof v === "boolean") return v ? "1" : "0";
    if (typeof v !== "number") return "-";
    if (Number.isInteger(v) && dec == null) return String(v);
    // With an explicit decimal count, keep the fixed format; otherwise drop a trailing ".0".
    return dec == null ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(dec);
  }

  function create(host, opts) {
    var eng = opts.engine, io = opts.io || [], widgets = [], onInput = opts.onInput || function () {};
    host.innerHTML = "";
    var wrap = el("div", { class: "sio" });
    var cin = el("div", { class: "sio-col sio-in", "data-side": "in" }, [el("h4", { class: "sio-h", text: "Inputs" })]);
    var cout = el("div", { class: "sio-col sio-out", "data-side": "out" }, [el("h4", { class: "sio-h", text: "Outputs" })]);
    var gin = el("div", { class: "sio-grid" }), gout = el("div", { class: "sio-grid" });
    cin.appendChild(gin); cout.appendChild(gout);

    function setIn(tag, v) { try { eng.setInput(tag, v); } catch (e) { return; } onInput(tag, v); }

    io.forEach(function (w) {
      var node, upd, isIn = true;
      var label = el("span", { class: "sio-label", text: w.label || w.tag });
      var tagEl = el("span", { class: "sio-tag", text: w.tag });
      if (w.widget === "pb") {
        var held = false;
        var btn = el("button", { type: "button", class: "sio-pb" + (w.nc ? " nc" : ""), "aria-pressed": "false", "aria-label": (w.label || w.tag) + (w.nc ? " (normally closed)" : " (hold to press)") });
        btn.innerHTML = '<span class="cap"></span>';
        var press = function (e) { if (held) return; held = true; if (e && e.pointerId != null) { try { btn.setPointerCapture(e.pointerId); } catch (x) {} } setIn(w.tag, !w.nc); upd(); };
        var rel = function () { if (!held) return; held = false; setIn(w.tag, !!w.nc); upd(); };
        btn.addEventListener("pointerdown", function (e) { e.preventDefault(); press(e); });
        btn.addEventListener("pointerup", rel); btn.addEventListener("pointercancel", rel); btn.addEventListener("lostpointercapture", rel);
        btn.addEventListener("contextmenu", function (e) { e.preventDefault(); });
        btn.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); press(); } });
        btn.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); rel(); } });
        btn.addEventListener("blur", rel);
        node = el("div", { class: "sio-w sio-w-pb" }, [btn, label, tagEl, w.nc ? el("span", { class: "sio-note", text: "NC: reads 1 at rest" }) : null]);
        upd = function () { var v = eng.read(w.tag); var pressed = w.nc ? !v : !!v; btn.classList.toggle("down", pressed); btn.setAttribute("aria-pressed", pressed ? "true" : "false"); tagEl.setAttribute("data-v", fmt(v)); tagEl.textContent = w.tag + " = " + fmt(v); };
      } else if (w.widget === "toggle" || w.widget === "sensor") {
        var sw = el("button", { type: "button", class: "sio-sw" + (w.widget === "sensor" ? " sensor" : ""), role: "switch", "aria-checked": "false", "aria-label": w.label || w.tag });
        var st = w.states || (w.widget === "sensor" ? ["Clear", "Blocked"] : ["Off", "On"]);
        var stEl = el("span", { class: "sio-state" });
        sw.innerHTML = w.widget === "sensor"
          ? '<svg viewBox="0 0 56 36" class="sio-eye" aria-hidden="true"><rect x="2" y="9" width="10" height="18" rx="2" class="body"/><rect x="44" y="9" width="10" height="18" rx="2" class="body"/><path d="M12 18H44" class="beam"/><rect class="obj" x="24" y="6" width="8" height="24" rx="1.5"/></svg>'
          : '<span class="knob"></span>';
        sw.appendChild(stEl);
        sw.addEventListener("click", function () { setIn(w.tag, !eng.read(w.tag)); upd(); });
        node = el("div", { class: "sio-w sio-w-" + w.widget }, [sw, label, tagEl]);
        upd = function () { var v = !!eng.read(w.tag); sw.classList.toggle("on", v); sw.setAttribute("aria-checked", v ? "true" : "false"); stEl.textContent = st[v ? 1 : 0]; tagEl.textContent = w.tag + " = " + fmt(v); };
      } else if (w.widget === "slider") {
        var min = w.min != null ? w.min : 0, max = w.max != null ? w.max : 100, stp = w.step != null ? w.step : 1;
        var rng = el("input", { type: "range", class: "sio-range", min: min, max: max, step: stp, "aria-label": w.label || w.tag });
        var out = el("output", { class: "sio-num" });
        rng.addEventListener("input", function () { setIn(w.tag, Number(rng.value)); upd(); });
        node = el("div", { class: "sio-w sio-w-slider" }, [el("div", { class: "sio-row" }, [label, out]), rng, tagEl]);
        upd = function () { var v = eng.read(w.tag); if (document.activeElement !== rng || true) rng.value = v; out.textContent = fmt(v, stp < 1 ? 1 : null) + (w.unit ? " " + w.unit : ""); tagEl.textContent = w.tag; };
      } else {
        isIn = false;
        if (w.widget === "lamp") {
          var lamp = el("span", { class: "sio-lamp c-" + (w.color || "ok"), "aria-hidden": "true" });
          var ls = el("span", { class: "sio-state" });
          node = el("div", { class: "sio-w sio-w-lamp", role: "img" }, [lamp, label, ls, tagEl]);
          upd = function () { var v = !!(eng.physOut && w.tag in eng.physOut ? eng.physOut[w.tag] : eng.get(w.tag)); lamp.classList.toggle("on", v); ls.textContent = v ? "ON" : "OFF"; node.setAttribute("aria-label", (w.label || w.tag) + " " + (v ? "on" : "off")); tagEl.textContent = w.tag; };
        } else if (w.widget === "motor") {
          var mt = el("span", { class: "sio-motor c-" + (w.color || "ok"), html: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" class="rim"/><g class="blades"><path d="M24 24L24 6A18 18 0 0 1 39.6 15z"/><path d="M24 24L39.6 33A18 18 0 0 1 24 42z"/><path d="M24 24L8.4 33A18 18 0 0 1 8.4 15z"/></g><circle cx="24" cy="24" r="4" class="hub"/></svg>' });
          var ms = el("span", { class: "sio-state" });
          node = el("div", { class: "sio-w sio-w-motor", role: "img" }, [mt, label, ms, tagEl]);
          upd = function () { var v = !!(eng.physOut && w.tag in eng.physOut ? eng.physOut[w.tag] : eng.get(w.tag)); mt.classList.toggle("on", v); ms.textContent = v ? "RUNNING" : "STOPPED"; node.setAttribute("aria-label", (w.label || w.tag) + " " + (v ? "running" : "stopped")); tagEl.textContent = w.tag; };
        } else if (w.widget === "value") {
          var nv = el("span", { class: "sio-big" }), un = el("span", { class: "sio-unit", text: w.unit || "" });
          node = el("div", { class: "sio-w sio-w-value" }, [el("div", { class: "sio-readout" }, [nv, un]), label, tagEl]);
          upd = function () { var v = eng.read(w.tag); nv.textContent = fmt(v, w.dec); tagEl.textContent = w.tag; };
        } else if (w.widget === "bar") {
          var fill = el("span", { class: "fill" }), tube = el("span", { class: "sio-tube", role: "meter" }, [fill]);
          var bmin = w.min != null ? w.min : 0, bmax = w.max != null ? w.max : 100;
          [["hi", w.hi], ["lo", w.lo]].forEach(function (m) { if (m[1] != null) tube.appendChild(el("i", { class: "mark " + m[0], style: "bottom:" + (100 * (m[1] - bmin) / (bmax - bmin)) + "%" })); });
          var bn = el("span", { class: "sio-num" });
          node = el("div", { class: "sio-w sio-w-bar" }, [tube, el("div", { class: "sio-bcol" }, [bn, label, tagEl])]);
          upd = function () { var v = Number(eng.read(w.tag)) || 0; var p = Math.max(0, Math.min(100, 100 * (v - bmin) / (bmax - bmin))); fill.style.height = p + "%"; bn.textContent = fmt(v, 1) + (w.unit ? " " + w.unit : ""); tube.setAttribute("aria-valuenow", v); tube.setAttribute("aria-valuemin", bmin); tube.setAttribute("aria-valuemax", bmax); tube.setAttribute("aria-label", w.label || w.tag); tagEl.textContent = w.tag; };
        }
      }
      if (!node) return;
      (isIn && !(w.widget === "bar" || w.widget === "value") ? gin : (isIn ? gin : gout)).appendChild(node);
      widgets.push({ w: w, upd: upd });
    });
    // a bar/value placed under an input side (process variable) lives on the output side visually
    if (!gin.children.length) cin.classList.add("empty");
    if (!gout.children.length) cout.classList.add("empty");
    wrap.appendChild(cin); wrap.appendChild(cout); host.appendChild(wrap);

    return {
      update: function () { widgets.forEach(function (x) { try { x.upd(); } catch (e) { /* tag missing */ } }); },
      release: function () { host.querySelectorAll(".sio-pb.down").forEach(function (b) { b.classList.remove("down"); }); }
    };
  }

  // Sandbox panel definition: 8 inputs, 8 lamps, one slider, one value.
  function sandboxIO() {
    var io = [];
    for (var i = 0; i < 4; i++) io.push({ tag: "I" + i, widget: "pb", label: "Pushbutton " + i });
    for (i = 4; i < 8; i++) io.push({ tag: "I" + i, widget: "toggle", label: "Switch " + i });
    io.push({ tag: "AI0", widget: "slider", label: "Analog in", min: 0, max: 100, step: 1 });
    for (i = 0; i < 8; i++) io.push({ tag: "O" + i, widget: "lamp", label: "Lamp " + i });
    io.push({ tag: "AO0", widget: "value", label: "Analog out", dec: 1 });
    return io;
  }

  LC.simIO = { create: create, el: el, ico: ico, sandboxIO: sandboxIO, fmt: fmt };
})(typeof window !== "undefined" ? window : globalThis);
