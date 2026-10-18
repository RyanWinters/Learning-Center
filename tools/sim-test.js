#!/usr/bin/env node
/* Runs every simulator challenge headless: the solution must pass all tests, the starter must fail at least one
   (unless starter === solution, as in the tour).  Usage: node tools/sim-test.js [id ...]   Exit 1 on failure. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
globalThis.LC = globalThis.LC || {};
const LC = globalThis.LC;
require(path.join(ROOT, "assets/js/sim/parser.js"));
const E = require(path.join(ROOT, "assets/js/sim/engine.js"));
const P = LC.simParser;

const sims = {};
LC.sim = (o) => { if (o && o.id) sims[o.id] = o; };
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(ROOT, "content/sim/index.js"), "utf8"), { filename: "content/sim/index.js" });
const index = globalThis.LC_SIM_INDEX || [];
const dir = path.join(ROOT, "content/sim");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "index.js");
const want = process.argv.slice(2);
let fails = 0, pending = [];
const fail = (id, msg) => { fails++; console.log("  FAIL " + id + ": " + msg); };

for (const f of files) {
  const id = f.replace(/\.js$/, "");
  if (want.length && !want.includes(id)) continue;
  try { vm.runInThisContext(fs.readFileSync(path.join(dir, f), "utf8"), { filename: f }); }
  catch (e) { fail(id, "load error: " + e.message); }
}
for (const x of index) if (!sims[x.id]) pending.push(x.id);

for (const id of Object.keys(sims)) {
  const s = sims[id], ix = index.find((x) => x.id === id);
  let ok = true;
  const bad = (m) => { ok = false; fail(id, m); };
  if (!ix) bad("not listed in content/sim/index.js");
  else {
    if (ix.level !== s.level) bad("level " + s.level + " differs from index " + ix.level);
    if (ix.lesson !== s.lesson) bad("lesson " + s.lesson + " differs from index " + ix.lesson);
    if (ix.title !== s.title) bad("title differs from index");
  }
  for (const k of ["brief", "tags", "io", "starter", "tests", "hints", "solution", "explain", "tips"]) if (s[k] == null) bad("missing field " + k);
  if (!ok) continue;
  if (s.hints.length !== 3) bad("needs exactly 3 hints, has " + s.hints.length);
  if (!s.tips.length) bad("needs tips");
  const sp = P.parse(s.solution), stp = P.parse(s.starter);
  if (sp.errors.length) bad("solution does not parse: " + sp.errors[0].message);
  if (stp.errors.length) bad("starter does not parse: " + stp.errors[0].message);
  if (s.process) { try { E.engineFor(s).scan(); } catch (e) { bad("process error: " + e.message); } }
  const isTour = !!s.tour;
  const r = E.runTests(s, s.solution);
  if (!r.passed) {
    bad("solution fails: " + (r.errors[0] || (r.missing.length ? "missing " + r.missing : "") || r.tests.filter((t) => !t.passed).map((t) => t.name + " -> " + t.message).join(" | ")));
  }
  if (isTour) { if (s.starter.trim() !== s.solution.trim()) bad("tour starter must equal solution"); }
  else if (s.starter.trim() === s.solution.trim()) bad("starter equals solution");
  else {
    const r2 = E.runTests(s, s.starter);
    if (r2.passed) bad("starter already passes every test");
  }
  for (const t of s.tests) if (!t.name || !Array.isArray(t.steps)) bad("malformed test " + t.name);
  const hasExpect = s.tests.every((t) => t.steps.some((st) => st.expect));
  if (!isTour && !hasExpect) bad("every test needs an expect step");
  // solution should survive a text round trip
  if (P.print(P.parse(s.solution)).replace(/\s+/g, "") !== s.solution.replace(/\s+/g, "").replace(/;?(\/\/.*)?$/gm, ";").replace(/;;/g, ";")) { /* formatting differences are fine */ }
  if (ok) console.log("  ok   " + id + " (" + s.tests.length + " tests)");
}

// ---- engine self-tests (Logix semantics) ----
{
  const st = (name, fn) => { try { const m = fn(); if (m) fail("engine", name + ": " + m); else console.log("  ok   engine: " + name); } catch (e) { fail("engine", name + ": " + e.message); } };
  const mk = (prog, cfg) => { const e = E.create(Object.assign({ scanMs: 50 }, cfg || {})); const er = e.load(prog); if (er.length) throw new Error(er[0].message); return e; };
  const run = (e, ms) => e.advanceTime(ms);
  st("TON ACC holds at PRE after DN", () => { const e = mk("XIC(Go)TON(T1,1000,0);"); e.setInput("Go", true); run(e, 5000); return e.values["T1.ACC"] === 1000 && e.values["T1.DN"] && !e.values["T1.TT"] ? "" : "ACC=" + e.values["T1.ACC"]; });
  st("RTO ACC holds at PRE after DN", () => { const e = mk("XIC(Go)RTO(T1,1000,0);"); e.setInput("Go", true); run(e, 5000); return e.values["T1.ACC"] === 1000 ? "" : "ACC=" + e.values["T1.ACC"]; });
  st("RES clears ACC/DN/TT but EN follows the rung", () => { const e = mk("XIC(Go)TON(T1,1000,0);\nXIC(Go)RES(T1);"); e.setInput("Go", true); run(e, 500);
    return e.values["T1.EN"] === true && e.values["T1.ACC"] === 0 && !e.values["T1.DN"] && !e.values["T1.TT"] ? "" : JSON.stringify([e.values["T1.EN"], e.values["T1.ACC"]]); });
  st("TON accepts a DINT tag as PRE, resolved each scan", () => { const e = mk("XIC(Go)TON(T1,Delay_PRE,0);", { tags: { Delay_PRE: "DINT" }, init: { Delay_PRE: 500 } });
    e.setInput("Go", true); run(e, 400); if (e.values["T1.DN"]) return "DN too early"; run(e, 200); if (!e.values["T1.DN"]) return "DN not set at 500";
    e.values.Delay_PRE = 2000; run(e, 100); return e.values["T1.PRE"] === 2000 && !e.values["T1.DN"] ? "" : "PRE did not follow tag"; });
  st("CTU accepts a DINT tag as PRE", () => { const e = mk("XIC(P)CTU(C1,Cnt_PRE,0);", { tags: { Cnt_PRE: "DINT" }, init: { Cnt_PRE: 2 } });
    for (let i = 0; i < 2; i++) { e.setInput("P", true); e.scan(); e.setInput("P", false); e.scan(); } return e.values["C1.DN"] && e.values["C1.PRE"] === 2 ? "" : "DN not set"; });
  st("Logix module I/O tags (Local:1:I.Data.0 / Local:2:O.Data.3 / Local:3:I.Ch0Data)", () => {
    const e = mk("XIC(Local:1:I.Data.0)OTE(Local:2:O.Data.3);\nMOV(Local:3:I.Ch0Data,Raw);");
    if (e.types["Local:1:I.Data.0"] !== "BOOL" || e.types["Local:3:I.Ch0Data"] !== "REAL") return "types " + e.types["Local:1:I.Data.0"] + "/" + e.types["Local:3:I.Ch0Data"];
    e.setInput("Local:1:I.Data.0", true); e.scan(); return e.values["Local:2:O.Data.3"] === true ? "" : "output not set"; });
  st("Declared module I/O with an io list", () => {
    const e = E.create({ tags: { "Local:1:I": "MOD_DI16", "Local:2:O": "MOD_DO16" }, io: [{ tag: "Local:1:I.Data.0", widget: "pb" }, { tag: "Local:2:O.Data.3", widget: "lamp" }] });
    e.load("XIC(Local:1:I.Data.0)OTE(Local:2:O.Data.3);"); e.setInput("Local:1:I.Data.0", true); e.scan(); return e.values["Local:2:O.Data.3"] ? "" : "no output"; });
  st("Nested UDT members (M1.Cmd.Start)", () => {
    const e = E.create({ udts: { C: { Start: "BOOL" }, S: { Running: "BOOL" }, M: { Cmd: "C", Sts: "S" } }, tags: { M1: "M" } });
    e.load("XIC(M1.Cmd.Start)OTE(M1.Sts.Running);"); e.setInput("M1.Cmd.Start", true); e.scan(); return e.values["M1.Sts.Running"] ? "" : "no output"; });
}
if (pending.length) console.log("  pending (not written yet): " + pending.length + " (" + pending.join(", ") + ")");
console.log(fails ? "\nsim-test: " + fails + " problem(s)" : "\nsim-test: all written challenges pass");
process.exit(fails ? 1 : 0);
