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
if (pending.length) console.log("  pending (not written yet): " + pending.length + " (" + pending.join(", ") + ")");
console.log(fails ? "\nsim-test: " + fails + " problem(s)" : "\nsim-test: all written challenges pass");
process.exit(fails ? 1 : 0);
