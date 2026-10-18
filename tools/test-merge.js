#!/usr/bin/env node
/* Checks the browser store's merge (assets/js/core/store.js) against the same rules as server.py.
   Usage: node tools/test-merge.js */
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const mem = {};
const sb = { window: {}, console, setTimeout, clearTimeout, Date, JSON, Math, Object, Array,
  localStorage: { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } },
  document: { addEventListener() {}, visibilityState: "visible" }, addEventListener() {},
  fetch: () => Promise.reject(new Error("offline in tests")) };
sb.window = sb; sb.LC = sb.window.LC = {};
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../assets/js/core/store.js"), "utf8"), sb);
const merge = sb.LC.store._merge;
assert(merge, "store._merge not exposed");

let m = merge({ updatedAt: 100, xp: 50 }, { updatedAt: 120, xp: 0, lessons: { a: { updatedAt: 120 } } });
assert.strictEqual(m.xp, 50, "stale device lowered XP");
m = merge({ updatedAt: 100, xp: 500 }, { updatedAt: 200, resetAt: 200, xp: 0 });
assert.strictEqual(m.xp, 0, "reset ignored");
assert.strictEqual(merge(m, { updatedAt: 150, xp: 900 }).xp, 0, "pre-reset document counted");
m = merge({ updatedAt: 1, lessons: { x: { s: "complete", updatedAt: 10 } } }, { updatedAt: 2, lessons: { x: { s: "old", updatedAt: 5 }, y: { s: "new", updatedAt: 6 } } });
assert.strictEqual(m.lessons.x.s, "complete"); assert.strictEqual(m.lessons.y.s, "new");
console.log("test-merge: OK");
