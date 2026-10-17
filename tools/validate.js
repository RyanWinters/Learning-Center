#!/usr/bin/env node
/* Content validator. Usage:
     node tools/validate.js                 validate everything
     node tools/validate.js plc-timers ...  validate only these lesson ids (plus curriculum + glossary)
   Exit code 1 on any error. Warnings never fail. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

const lessons = {};
const glossary = [];
const sims = {};
const sandbox = { window: {}, console };
sandbox.window.LC = {
  lesson: (l) => { if (l && l.id) lessons[l.id] = l; },
  glossary: (arr) => { (arr || []).forEach((t) => glossary.push(t)); },
  sim: (s) => { if (s && s.id) sims[s.id] = s; }
};
sandbox.LC = sandbox.window.LC;
vm.createContext(sandbox);

function load(file) {
  try {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
    return true;
  } catch (e) {
    err(path.relative(ROOT, file), `failed to load: ${e.message}`);
    return false;
  }
}

load(path.join(ROOT, "content/curriculum.js"));
const LC = sandbox.window.LC;
const index = LC.lessonIndex || [];
const ids = new Set(index.map((r) => r[0]));
const trackIds = new Set((LC.tracks || []).map((t) => t.id));

// Curriculum checks: unique ids, track prefix, prereqs exist, no cycles
const seen = new Set();
for (const [id, title, prereqs] of index) {
  if (seen.has(id)) err(id, "duplicate id in curriculum");
  seen.add(id);
  if (!trackIds.has(id.split("-")[0])) err(id, "id prefix is not a track id");
  for (const p of prereqs) if (!ids.has(p)) err(id, `unknown prereq ${p}`);
}
const graph = Object.fromEntries(index.map((r) => [r[0], r[2]]));
const state = {};
function visit(n, stack) {
  if (state[n] === 2) return;
  if (state[n] === 1) { err(n, `prereq cycle: ${[...stack, n].join(" -> ")}`); return; }
  state[n] = 1;
  for (const p of graph[n] || []) visit(p, [...stack, n]);
  state[n] = 2;
}
Object.keys(graph).forEach((n) => visit(n, []));

// Glossary
for (const f of sandbox.window.LC_GLOSSARY_FILES || []) {
  const fp = path.join(ROOT, f);
  if (!fs.existsSync(fp)) { err(f, "listed in LC_GLOSSARY_FILES but missing"); continue; }
  load(fp);
}
const gloss = {};
const aliasOwner = {};
for (const t of glossary) {
  if (!t.id || !t.term || !t.def) { err(`glossary:${t.id || t.term}`, "needs id, term, def"); continue; }
  if (gloss[t.id]) err(`glossary:${t.id}`, "duplicate glossary id");
  gloss[t.id] = t;
  if (!t.eli5) warn(`glossary:${t.id}`, "missing eli5");
  for (const a of t.aliases || []) {
    if (aliasOwner[a] && aliasOwner[a] !== t.id) err(`glossary:${t.id}`, `alias "${a}" already used by ${aliasOwner[a]}`);
    aliasOwner[a] = t.id;
  }
  if (t.lesson && !ids.has(t.lesson)) err(`glossary:${t.id}`, `unknown lesson ${t.lesson}`);
}

// Lessons
const only = process.argv.slice(2);
const lessonDir = path.join(ROOT, "content/lessons");
const files = fs.existsSync(lessonDir) ? fs.readdirSync(lessonDir).filter((f) => f.endsWith(".js")) : [];
for (const f of files) {
  const id = f.replace(/\.js$/, "");
  if (only.length && !only.includes(id)) continue;
  if (!ids.has(id)) err(f, "lesson file has no entry in curriculum.js");
  load(path.join(lessonDir, f));
  const l = lessons[id];
  if (!l) { err(id, "file did not call LC.lesson() with a matching id"); continue; }
  const row = index.find((r) => r[0] === id);
  if (row && l.title !== row[1]) warn(id, `title differs from curriculum ("${row[1]}")`);

  for (const k of ["summary", "objectives", "body", "eli5", "why", "quiz", "resources", "keyTerms"])
    if (!l[k] || (Array.isArray(l[k]) && !l[k].length)) err(id, `missing ${k}`);

  const words = (s) => (s || "").split(/\s+/).filter(Boolean).length;
  const bw = words(l.body);
  if (bw < 700) warn(id, `body is short (${bw} words; aim 900-2000)`);
  if (bw > 3200) warn(id, `body is long (${bw} words)`);
  if (words(l.eli5) < 80) warn(id, "eli5 is very short");

  // Diagrams referenced in body must exist, and vice versa
  const refs = [...(l.body || "").matchAll(/\{\{diagram:([\w-]+)\}\}/g)].map((m) => m[1]);
  const diags = l.diagrams || {};
  for (const r of refs) if (!diags[r]) err(id, `body references missing diagram ${r}`);
  for (const d of Object.keys(diags)) {
    if (!refs.includes(d)) warn(id, `diagram ${d} never referenced`);
    const svg = diags[d];
    if (!/^\s*<svg[\s>]/.test(svg) || !/<\/svg>\s*$/.test(svg)) err(id, `diagram ${d} is not a single <svg>`);
    if (/#[0-9a-fA-F]{3,6}\b/.test(svg)) err(id, `diagram ${d} uses a literal hex color; use var(--d-*) or currentColor`);
    if (!/viewBox=/.test(svg)) err(id, `diagram ${d} needs a viewBox`);
    for (const m of svg.matchAll(/\b(fill|stroke)="([^"]*)"/g))
      if (!["none", "currentColor"].includes(m[2])) err(id, `diagram ${d} sets ${m[1]}="${m[2]}"; use dg-* classes`);
    if (/style="[^"]*(fill|stroke|color)\s*:/.test(svg)) err(id, `diagram ${d} sets colors inline; use dg-* classes`);
  }
  if (!refs.length) warn(id, "no diagrams");

  // Term shortcodes must exist in the glossary
  for (const m of (l.body + (l.eli5 || "") + (l.why || "")).matchAll(/\{\{term:([\w-]+)(\|[^}]*)?\}\}/g))
    if (!gloss[m[1]]) err(id, `term shortcode ${m[1]} not in glossary`);
  for (const t of l.keyTerms || []) if (!gloss[t]) err(id, `keyTerm ${t} not in glossary`);
  for (const m of (l.body || "").matchAll(/\{\{sim:([\w-]+)\}\}/g))
    if (!fs.existsSync(path.join(ROOT, "content/sim", m[1] + ".js"))) warn(id, `sim challenge ${m[1]} not written yet`);
  for (const m of (l.body + (l.why || "")).matchAll(/\{\{lesson:([\w-]+)\}\}/g))
    if (!ids.has(m[1])) err(id, `lesson link ${m[1]} unknown`);

  // Quiz
  const q = l.quiz || [];
  if (q.length < 2 || q.length > 10) err(id, `quiz has ${q.length} questions (need 2-10)`);
  q.forEach((x, i) => {
    const n = `q${i + 1}`;
    if (!x.q) err(id, `${n} missing q`);
    if (!Array.isArray(x.options) || x.options.length < 3 || x.options.length > 5) err(id, `${n} needs 3-5 options`);
    if (!Number.isInteger(x.answer) || x.answer < 0 || x.answer >= (x.options || []).length) err(id, `${n} answer index out of range`);
    if (!Array.isArray(x.explain) || x.explain.length !== (x.options || []).length) err(id, `${n} needs one explain per option`);
  });

  // Resources
  const r = l.resources || [];
  if (r.length < 3) err(id, `only ${r.length} resources (need >= 3)`);
  const types = new Set(["docs", "video", "forum", "course", "article", "standard", "book", "tool"]);
  r.forEach((x, i) => {
    if (!x.title || !x.url || !x.source) err(id, `resource ${i + 1} needs title, url, source`);
    if (x.url && !/^https:\/\//.test(x.url)) err(id, `resource ${i + 1} url must be https`);
    if (x.type && !types.has(x.type)) err(id, `resource ${i + 1} bad type ${x.type}`);
  });
  const src = JSON.stringify(l);
  if (/VERIFY:/.test(src)) warn(id, "contains VERIFY flags");
}

const missing = index.filter((r) => !files.includes(r[0] + ".js")).map((r) => r[0]);
if (!only.length) console.log(`lessons written: ${files.length}/${index.length}; glossary terms: ${glossary.length}`);
if (warnings.length) console.log(`\nWARNINGS (${warnings.length})\n  ` + warnings.join("\n  "));
if (errors.length) { console.log(`\nERRORS (${errors.length})\n  ` + errors.join("\n  ")); process.exit(1); }
console.log("\nOK");
if (!only.length && process.env.SHOW_MISSING) console.log("missing: " + missing.join(", "));
