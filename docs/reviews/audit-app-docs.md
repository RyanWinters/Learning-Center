# Audit: app, docs and UI copy

## Checked
- Counts computed from files: 141 lessons (136 in T0-T9 + HD, 5 build labs), 12 tracks in `curriculum.js`, 26 sim challenges, 47 glossary files, 805 terms (validate.js), 31 badges.
- store.js, gamify.js, quiz.js, server.py read against README, PLAN, APP_SPEC, SIM_SPEC, CONTENT_GUIDE, IMPROVEMENT_PLAN.
- grep of assets/js for user-facing wording (skip / known / test out / level / review).
- `node --check` on every JS file under assets/ and tools/ and the content index files: all pass. `test-merge.js` OK, `test_server.py` 7 tests OK, `validate.js` OK (2 "no diagrams" warnings), `sim-test.js` passes.
- Playwright (server on 8077, welcome sheet dismissed): home, tracks, map, HMI track, 11 lessons across tracks and a build lab, quiz, test-out, review, glossary, profile, readiness, lab, sandbox, 2 sims, search and a bad route at 390x844 and 1280x800. 0 console errors, 0 failed requests, no horizontal overflow. Server stopped, `data/` removed.

## Fixed
- README.md: 141 lessons, ~800 glossary terms, readiness page, module I/O tags, self-hosted fonts, `content/files/`, `data/progress.json.bak` path, served-paths allowlist, X-LC header.
- PLAN.md: banner marking it the original plan, plus a "What changed since" table (counts per track, files, fonts, server, XP, tools). Body untouched.
- docs/APP_SPEC.md: fonts (self-hosted, not Google), routes (+readiness, sandbox, 404 page), full progress model (resetAt, history, stats, welcomeSeen, qDone, checks, tombstones), lesson XP by level (40/60/90/130), level thresholds (0..17,000), 31 badges, readiness screen, nav, new Server section (localhost bind, tailscale serve, allowlist, keep-alive, queue 128, X-LC, sanitize, .bak).
- docs/SIM_SPEC.md: 26 ids; module I/O types (MOD_DI16/DO16/AI4/AO2), tag-valued presets, ACC holds at PRE, sandbox now uses Local:1:I.Data.n etc.
- docs/CONTENT_GUIDE.md: sim-step-fault added to the id table (26).
- docs/IMPROVEMENT_PLAN.md: note that counts are historical, decisions were taken, pointer to audits.
- UI copy, one name per concept ("marked as known" / "I already know this" / "Test out"):
  - ui.js: status label "Skipped" -> "Marked known".
  - lesson.js: "Undo skip" -> "Undo".
  - tracks.js: "Ten tracks and a set of build labs" -> "Eleven tracks and five build labs"; confirm sheet "as skipped" -> "as known"; button "Skip N lessons" -> "Mark N lessons as known".
  - home.js: "The ten tracks" -> "The eleven tracks".
  - readiness.js: legend, aria label and note use "marked known".
  - app.js welcome sheet: said Mark as known earns XP; now says it earns no XP and test-out earns XP and counts as done (matches code).

## Needs a decision / risky (not changed)
- Skill map route (`#/map`) is live and linked from Tracks, so not dead. The word "skip" remains in internal names (`LC.graph.skip`, `data-skip`, CSS `rb-skip`, `sw-skip`); only labels changed.
- Dead-looking CSS: `.toast-xp-wrap`, `.tk-c/.tk-k/.tk-n/.tk-s` (no JS reference found, possibly built dynamically in md.js highlighter), `.lrow.st-locked`. Other unreferenced classes are built dynamically (`chip-*`, `sico-*`, `mp-*`, `sg-*`, `callout-*`). Left alone.
- `io.js` `sandboxIO(legacy)` and the `lab.js` engine probe (`MOD_DI16` try/catch) keep an I0/O0 fallback for an engine that "cannot yet parse" Logix names. The engine now does, so this is dead but harmless; remove if you agree.
- `index.html` comment "owned by the simulator builder; absent files are tolerated" is stale; wording only.
- PLAN.md body still lists `check-links.js`, `instructions.js`, `challenges.js`, `content/glossary.js` (kept as history; the new table says they differ).
- Lesson and sim files are being edited by other auditors (git diff shows many content changes); not touched here.
- Duplicate `esc` helper aliases exist in views (`const esc = U.esc`), consistent, no action.
- No console.log, TODO, FIXME or debugger in assets/ or server.py.
