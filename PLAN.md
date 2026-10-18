# Learning Center — Project Plan

> **This is the original plan, kept as written.** The app has since grown past it. Read the "What changed since" section just below for the
> current shape, and `README.md`, `docs/APP_SPEC.md` and `docs/SIM_SPEC.md` for how it works now.

## What changed since this plan

| Plan said | Now |
|---|---|
| ~95 lessons across 10 tracks | 141 lessons: 136 in 11 tracks (T0 to T9, plus HD, HMI & Screen Design) and 5 hands-on Build Labs (LB). Lessons per track: T0 10, T1 12, T2 9, T3 22, T4 17, T5 12, T6 14, T7 11, T8 12, T9 8, HD 9, LB 5 |
| Glossary in one `content/glossary.js` | 47 files in `content/glossary/` (about 800 terms), loaded after first paint and listed in `LC_GLOSSARY_FILES` |
| Simulator: ~10 core challenges, `instructions.js`, `challenges.js` | 26 challenges in `content/sim/` (plus the sandbox). Files are `parser.js`, `engine.js`, `render.js`, `io.js`, `editor.js`. Logix-style module I/O tags (`Local:1:I.Data.0`) and tag-valued timer presets are supported |
| Views: home, tracks, skill tree, lesson, quiz, review, profile, glossary, lab | Also `search`, `readiness` (Integrator readiness) and the `map` view; `store.js` holds progress only, XP and badges are in `gamify.js`, grading and the review queue in `quiz.js` |
| `tools/check-links.js` | Never built. Tools are `validate.js`, `sim-test.js`, `test-merge.js` and `test_server.py` |
| Google-hosted fonts | Fonts are self-hosted in `assets/fonts/` and declared in `assets/css/fonts.css`. The app needs no internet |
| Server listens on the LAN, or Tailscale by name | `server.py` binds to 127.0.0.1; use `tailscale serve --bg 8080` for the phone. It serves an allowlist only (`index.html`, `assets/`, `content/`), needs an `X-LC: 1` header on the API, keeps one `progress.json.bak`, uses HTTP/1.1 keep-alive and a 128-connection listen queue |
| Downloads | `content/files/` holds the FDS outline, HMI checklist, I/O list template and naming sheet |
| XP not specified | Lesson XP by difficulty (L1 40, L2 60, L3 90, L4 130), 10 per first-correct quiz answer, 25 perfect bonus, 30 test-out, 5 per review card, 20 to 60 per sim. Ten levels from 0 to 17,000 XP. 31 badges |
| Reviews and fixes | See `docs/IMPROVEMENT_PLAN.md` and `docs/reviews/` for the persona reviews, the fix passes and the audits. `docs/HOUSE_STANDARD.md` and `docs/FACTS.md` now govern all examples |

The rest of this file is the plan as first written, including its estimates and track lists.

A self-paced, offline-first learning platform that takes a process control engineer from
"I can build a Perspective screen" to "I can architect a plant-to-enterprise system as an integrator."
Focus: Inductive Automation Ignition (8.3, with 8.1 notes where they differ), Allen-Bradley/Logix PLCs,
industrial networking and protocols, databases, MES (incl. Sepasoft), and the standards and history
behind why things are done the way they are.

---

## 1. Goals and success criteria

| Goal | What "done" looks like |
|---|---|
| Broad + deep coverage | ~95 lessons across 10 tracks, Level 0 field devices up through Level 4 enterprise |
| Understand the *why* | Every lesson has a "Why it's done this way" section and a "History" note where relevant |
| Digestible | Concise core reading, an **ELI5** toggle, inline SVG diagrams, worked examples, key-terms box |
| Verifiable | Every lesson ends with 3+ real, checked source links (IA docs, Inductive University, IA forum, Rockwell literature, Sepasoft/Cirrus Link docs, standards bodies) |
| Tested | 2–10 multiple-choice questions per lesson, with an explanation for every answer option |
| Hands-on PLC practice | A browser ladder-logic simulator with its own guided lessons, challenges with automatic grading, hints, and tips |
| Structured | Prerequisite graph; locked lessons show what's missing; "I already know this" skip and "test out" quiz |
| Jargon everywhere | Every industry term anywhere in the app (lessons, quizzes, simulator, glossary itself) is tappable and opens a definition + ELI5 + "learn it in" lesson link |
| Sticky | XP, levels, streaks, badges, a skill-tree map, and a spaced-repetition review queue of missed questions |
| Runs anywhere | Served from your PC by a tiny dependency-free server (`python server.py`), reached from any device over Tailscale; no build step; responsive for phones |
| Progress saved | Stored server-side in `data/progress.json`, so PC and phone share one progress record automatically; `localStorage` is only an offline cache |

---

## 2. Technical architecture

**Static site + tiny Python stdlib server, zero dependencies, zero build.** `server.py` serves the folder and a
single-user progress API (`GET/PUT /api/progress`, atomic write to `data/progress.json`, timestamp-based merge so
a stale tab can't clobber newer progress). Run it on the PC, then `tailscale serve` (HTTPS on the tailnet) or
browse `http://<pc-tailscale-name>:8080` from the phone. Lessons load on demand so phones stay fast.

```
server.py                  stdlib HTTP server + /api/progress (Python 3.8+)
data/progress.json         your progress (gitignored)
index.html                 app shell; loads scripts in order
assets/css/tokens.css      design tokens (light/dark), type scale, spacing
assets/css/app.css         components
assets/js/core/            store.js (progress, XP, SRS), router.js (hash routes), md.js (tiny markdown renderer),
                           graph.js (prereqs/unlocks), quiz.js, gamify.js, search.js
assets/js/views/           home, tracks, skill-tree, lesson, quiz, review, profile, glossary, lab
assets/js/sim/             ladder simulator: engine.js (scan cycle), instructions.js, editor.js, render.js, challenges.js
content/curriculum.js      tracks + lesson order + prerequisite edges (single source of truth)
content/lessons/<id>.js    one file per lesson: LC.lesson({...})
content/glossary.js        jargon dictionary, cross-linked from lessons
content/sim/<id>.js        simulator lessons and challenges
tools/validate.js          node script: schema, prereq cycles, quiz shape, missing IDs, word counts
tools/check-links.js       node script: HEAD/GET every resource URL, report dead links
```

**Lesson schema** (enforced by `tools/validate.js`):

```js
LC.lesson({
  id: "proto-modbus",            // track-prefix + slug
  title: "Modbus RTU & TCP",
  track: "protocols",
  minutes: 20,
  level: 2,                       // 1 intro · 2 core · 3 advanced · 4 expert
  prereqs: ["net-ip-basics", "proto-serial"],
  tags: ["modbus", "polling"],
  summary: "One-sentence hook.",
  objectives: ["...", "..."],
  body: `markdown with {{diagram:id}} and {{term:modbus}} shortcodes`,
  eli5: `plain-language analogy version`,
  why: `why this is best practice / design rationale`,
  history: `optional: where it came from`,
  examples: [{ title, body }],
  diagrams: { id: `<svg>…</svg>` },     // inline, theme-aware via currentColor / CSS vars
  pitfalls: ["..."],
  keyTerms: ["modbus", "register", "coil"],
  quiz: [{ q, options: [..], answer: 1, explain: [..per option..] }],  // 2–10
  resources: [{ title, url, type: "docs|video|forum|course|article|standard", source }]
});
```

**Progress model** (server `data/progress.json`, cached in `localStorage["lc.v1"]`): per-lesson status (`locked|available|in-progress|complete|skipped|tested-out`),
best quiz score, attempts, timestamps; XP; streak; badges; SRS cards (missed questions, Leitner boxes);
sim challenge results; settings (theme, ELI5 default). Versioned with a migration hook.

**Phone access:** over Tailscale. Same URL, same progress on every device. If the server is unreachable the app
keeps working from the local cache and syncs when it reconnects.

---

## 3. Curriculum (10 tracks, ~95 lessons)

Prerequisites flow mostly top-down; arrows across tracks are noted.

### T0 — Foundations & History (start here)
1. The story of industrial automation: relays → Modicon 084 (1968) → DCS → PC-based HMI/SCADA → IIoT
2. The Purdue Model & ISA-95 levels 0–4 (where every later lesson "lives")
3. Field devices: sensors, transmitters, actuators, VFDs, motor starters
4. Signals: discrete vs analog, 4–20 mA (why live-zero), 0–10 V, HART, sinking vs sourcing
5. Control basics: open vs closed loop, on/off, PID intuition, cascade
6. Reading P&IDs, loop sheets, and I/O lists (ISA-5.1 symbols)
7. Jargon survival guide (links to the glossary)
8. Roles in the industry: end user, OEM, system integrator, CSIA

### T1 — Networking for OT
1. Bits, bytes, hex, and data types (int, real, BCD, endianness/word swap)
2. OSI vs TCP/IP model — practically
3. Ethernet, MAC addresses, switches (managed vs unmanaged), cabling
4. IP addressing & subnetting (with a subnet practice drill)
5. Routing, gateways, NAT, DHCP, DNS
6. VLANs, QoS, IGMP snooping (why multicast EtherNet/IP floods unmanaged switches)
7. Industrial topologies: star, ring, DLR, redundancy protocols
8. Firewalls, DMZ, remote access; ISA/IEC 62443 zones & conduits
9. Wireless & cellular in plants
10. Troubleshooting toolkit: ping, tracert, arp, Wireshark basics

### T2 — Industrial Protocols
1. Serial: RS-232, RS-422, RS-485 (multidrop, termination)
2. Modbus RTU & TCP: coils, registers, addressing (0x/1x/3x/4x), function codes, polling
3. EtherNet/IP & CIP: implicit vs explicit messaging, RPI, connections
4. PROFIBUS / PROFINET, DeviceNet, ControlNet (history + where you'll still find them)
5. OPC Classic (DA/HDA/COM/DCOM pain) → OPC UA (address space, security, subscriptions)
6. MQTT: pub/sub, broker, QoS, retained, LWT
7. Sparkplug B: birth/death certificates, state, report-by-exception
8. DNP3, IEC 61850, BACnet — utilities and buildings in brief
9. Polling vs report-by-exception: the architectural tradeoff

### T3 — PLCs: Allen-Bradley / Logix (paired with the Simulator)
1. What a PLC is; AB families (ControlLogix, CompactLogix, Micro800, legacy PLC-5/SLC-500)
2. Studio 5000 tour: controller organizer, I/O tree, online/offline, download/upload
3. The scan cycle (input image → logic → output image) and why it matters
4. Tags & data types: BOOL, SINT/INT/DINT, REAL, STRING, arrays; base vs alias; controller vs program scope
5. Ladder fundamentals: rungs, XIC/XIO/OTE, series = AND, parallel = OR ▶ Sim lab
6. Seal-in circuits, start/stop, latches (OTL/OTU) and when not to use them ▶ Sim lab
7. One-shots (ONS/OSR/OSF) ▶ Sim lab
8. Timers: TON, TOF, RTO; .PRE/.ACC/.EN/.TT/.DN ▶ Sim lab
9. Counters: CTU, CTD, RES ▶ Sim lab
10. Compare & math: EQU, NEQ, GRT, LES, LIM, CMP, ADD, SUB, MUL, DIV, CPT, MOV, COP ▶ Sim lab
11. Analog scaling (SCP), alarm limits, deadband ▶ Sim lab
12. UDTs: designing data structures (motor, valve, analog-in)
13. Add-On Instructions (AOIs): encapsulation, parameters, versioning
14. Program organization: tasks (continuous/periodic/event), programs, routines, JSR
15. Other IEC 61131-3 languages: Structured Text, FBD, SFC — when each fits
16. State machines and sequences (step logic in ladder & ST) ▶ Sim lab
17. ISA-88 & PackML state model in the PLC
18. Faults, fault routines, GSV/SSV, diagnostics
19. Produced/consumed tags, MSG instructions, I/O over EtherNet/IP
20. PLC program structure best practices & naming conventions (a reference project layout)
21. Safety PLCs (GuardLogix), SIL/PL concepts — awareness level
22. The rest of the world: Siemens TIA Portal, Codesys — mapping the concepts

### T4 — Ignition Fundamentals
1. What Ignition is; IA's history; the unlimited licensing model and why it disrupted SCADA
2. Architecture: Gateway, Designer, Vision Client, Perspective Session, modules
3. Install, commission, the Gateway web interface; 8.3 changes (file-based config, deployment modes, REST API)
4. Device connections & the Ignition OPC UA server; drivers (Logix, Modbus, Siemens), third-party OPC
5. Tags: OPC, memory, expression, derived, query, reference tags; tag providers
6. UDTs in Ignition: definitions, instances, parameters, inheritance, overrides
7. Expressions vs scripting; the expression language
8. Python/Jython scripting: scopes (gateway, client, session, designer), system.* functions, project library
9. Events: tag change, gateway events, timer scripts, message handlers
10. Tag Historian: storage, deadband, compression, partitions, query modes
11. Alarming: configuration, pipelines, journals, shelving; link to ISA-18.2
12. Databases in Ignition: connections, named queries, transaction groups, store & forward
13. Security: users, roles, identity providers (SSO), security zones, security levels
14. Projects: inheritance, global resources, Vision vs Perspective — choosing
15. Version control, backups (.gwbk), project export, 8.3 git-friendly resources

### T5 — Perspective Deep Dive (prereq: T4.1–T4.8)
1. Views, the component tree, props vs custom props vs params
2. Containers: coordinate, flex, column, breakpoint, tab, split — responsive design
3. Bindings: property, tag, expression, query, indirect tag; transforms; performance
4. Embedded views, view parameters, flex repeater, view canvas — templating screens from UDTs
5. Sessions, pages, docked views, navigation, popups
6. Component and session events, scripting actions, message handling patterns
7. Styles, style classes, themes, CSS in Perspective
8. High-Performance HMI (ISA-101): greyscale, alarm color reservation, display hierarchy (L1–L4)
9. Perspective on mobile: device features, workstation, kiosk
10. Charts & trends: Power Chart, XY Chart, Time Series Chart
11. Performance and scale: binding counts, polling rates, session load
12. Building a reusable component library (motor/valve faceplates tied to UDTs)

### T6 — Ignition Architecture & Advanced Modules
1. Gateway Network: connections, services, security
2. Architectures: standard, scale-out, hub-and-spoke, hybrid, cloud — choosing
3. Remote tag providers, remote historians, remote alarm journals
4. Enterprise Administration Module (EAM): central controller, agents, backups, project sync
5. Redundancy: master/backup, failover behavior, what is and isn't redundant
6. Ignition Edge: Edge Panel, IIoT, Compute, Sync Services; when to use
7. MQTT with Cirrus Link: Transmission, Distributor, Engine; Ignition as UNS node
8. Reporting module
9. SFC (Sequential Function Charts) module
10. Alarm Notification, Voice, SMS, and on-call rosters
11. WebDev module and REST APIs (in and out)
12. Event Streams (8.3), Kafka, and other enterprise connectors
13. Ignition in containers: Docker, Kubernetes, Cloud Edition
14. Third-party module ecosystem & the Ignition Exchange

### T7 — Databases (Relational → Time-series → Enterprise)
1. What a database is; RDBMS vs NoSQL vs time-series; MSSQL, MySQL/MariaDB, PostgreSQL, SQLite
2. SQL I: SELECT, WHERE, ORDER BY, LIMIT
3. SQL II: JOINs (inner/left), GROUP BY, aggregates, HAVING
4. SQL III: INSERT/UPDATE/DELETE, transactions, ACID
5. Schema design: keys, normalization (1NF–3NF), when to denormalize
6. Indexes and query performance; reading an execution plan
7. Time-series data in SQL: Ignition historian tables, partitioning, pruning
8. Designing a production/downtime schema from scratch (worked project)
9. Stored procedures, views, and when to put logic in the DB
10. Backups, high availability, and DB security for OT
11. Data historians & data lakes: PI, Canary, InfluxDB, TimescaleDB, cloud warehouses

### T8 — MES, Level 3/4 & Industry 4.0
1. What MES is (and isn't); ISA-95 Part 3 activity model
2. OEE: Availability × Performance × Quality, worked examples, pitfalls
3. Downtime tracking and reason codes
4. Track & Trace / genealogy / lot tracking
5. Batch control: ISA-88 physical & procedural models
6. SPC: control charts, Western Electric rules
7. Recipes, settings & changeovers
8. Sepasoft MES modules: OEE, Track & Trace, Batch Procedure, SPC, Recipe, Document Mgmt, Web Services, Business Connector, Interlocking
9. Building MES in "plain" Ignition vs Sepasoft — tradeoffs
10. ERP integration (SAP/Oracle), B2MML, ISA-95 Part 2 objects
11. Unified Namespace (UNS): concept, topic design, and criticism
12. IT/OT convergence, Industry 4.0 / IIoT, digital twins — separating hype from value

### T9 — The Integrator's Craft
1. Project lifecycle: proposal → FDS → design → build → FAT → SAT → handover
2. Writing a Functional Design Specification
3. Standards cheat-sheet: ISA-88, ISA-95, ISA-101, ISA-18.2, ISA/IEC 62443, IEC 61131-3
4. Alarm management in practice (ISA-18.2 lifecycle, rationalization, KPIs)
5. Commissioning and I/O checkout
6. Tag naming & system-wide standards (PLC ↔ Ignition ↔ DB alignment)
7. Capstone: architect a multi-site system (worked reference architecture, decision log)
8. Certifications & career: Inductive University, Ignition Core/Gold, CSIA, ISA CCST/CAP

### Simulator track (inside T3, also accessible from "Lab")
~25 guided exercises: each has a goal, I/O description, starter program, hints (progressive),
auto-grading via test vectors (inputs over time → expected outputs), and a model solution.

---

## 4. Ladder Logic Simulator spec

- **Editor:** rung-based, touch-friendly. Toolbar palette inserts instructions; branches (parallel) supported;
  tap to select/delete; tag picker with autocomplete. Logix-style instruction names and mnemonic display.
- **Instructions (v1):** XIC, XIO, OTE, OTL, OTU, ONS, OSR, OSF, TON, TOF, RTO, CTU, CTD, RES,
  EQU, NEQ, GRT, GEQ, LES, LEQ, LIM, MOV, ADD, SUB, MUL, DIV, CPT (simple expressions), SCP, JSR (stretch).
- **Tags:** BOOL, DINT, REAL, TIMER, COUNTER, and simple user UDTs (members addressable `Motor1.Run`).
- **Engine:** deterministic scan (read inputs → evaluate rungs left-to-right, top-to-bottom → write outputs),
  configurable scan time, pause/step-scan, power-flow highlighting, live tag monitor.
- **I/O panel:** pushbuttons (momentary), selector switches, sensors, analog slider; lamps, motors, a simple
  animated process (conveyor/tank) for some challenges.
- **Grading:** each challenge defines test vectors; "Check" runs them headless and reports which case failed.
- **Hints:** 3-tier (nudge → approach → near-solution); tips explain real Studio 5000 equivalents.
- Saved per challenge in progress store.

---

## 5. UI / UX & gamification

Designed with the `artifact-design` guidance and reviewed with the `design:design-critique` and
`design:accessibility-review` skills (that's the "designer Claude" part).

- **Home:** "Continue" card, daily goal ring, streak, XP bar, recommended next lessons (unlocked + prereqs met).
- **Skill tree:** per-track node graph with locked/available/done states.
- **Lesson reader:** objectives → body (diagrams, examples, callouts) → Why → History → Pitfalls → Key terms →
  Quiz → Resources. ELI5 toggle on every lesson, glossary tooltips, reading progress, mobile-first typography.
- **Skip:** "I already know this" (marks skipped, unlocks dependents, no XP) or "Test out" (quiz gate; ≥80% = tested-out + XP).
- **Gamification:** XP for lessons/quizzes/sim challenges; 10 levels with industry titles
  (Apprentice → Technician → Controls Engineer → … → Systems Architect); streaks; ~20 badges; review queue (Leitner SRS).
- Light/dark theme, keyboard accessible, WCAG AA contrast, 16px gutters on phones, no horizontal scroll.

---

## 6. Content-accuracy policy

> Environment note: this build container's network blocks direct page fetches to the IA/Rockwell/Sepasoft sites, so
> writers research through web search (server-side) and cite only URLs that search returned. Adding those domains to the
> environment's allowed list would let agents read full pages.


- Writers research primarily from: docs.inductiveautomation.com (8.3 + 8.1), inductiveuniversity.com,
  forum.inductiveautomation.com, inductiveautomation.com/resources (articles, webinars, ICC talks),
  literature.rockwellautomation.com, docs.sepasoft.com, docs.chariot.io / cirrus-link.com, modbus.org,
  odva.org, opcfoundation.org, sparkplug.eclipse.org, isa.org.
- Every factual claim specific to a product must be traceable to a listed resource.
- `tools/check-links.js` verifies every URL resolves; dead links are fixed or removed before merge.
- Where a source can't be verified, the writer flags `// VERIFY:` and the reviewer resolves it.

---

## 7. Agent orchestration (token-efficient)

**Roles**
| Role | Model | Job |
|---|---|---|
| Orchestrator (me) | Opus | Plan, schema, design tokens, task specs, reviewing summaries, merging, final QA |
| App builder | Sonnet | App shell, views, store, gamification |
| Simulator builder | Sonnet | Ladder engine + editor + challenges |
| Lesson writers (×N, parallel) | Sonnet | Research + write 4–6 lessons each to schema, run validator on own files |
| Validators / link checkers | Haiku | Run `validate.js` / `check-links.js`, fix mechanical issues (quiz shape, broken URL swaps) |
| Reviewer | Sonnet | Spot-check accuracy & consistency per track, resolve `VERIFY` flags |

Detailed contracts: `docs/CONTENT_GUIDE.md` (writers), `docs/APP_SPEC.md` (app), `docs/SIM_SPEC.md` (simulator).

**Efficiency rules (from Anthropic's guidance on agents/subagents)**
1. **Contract first:** schema, file layout, and one exemplar lesson exist *before* any writer starts —
   writers copy the pattern instead of inventing.
2. **Small, closed tasks:** each agent gets an explicit file list, explicit lesson IDs, and a done-definition.
   4–6 lessons per writer keeps context small.
3. **Write to disk, return a summary:** agents return ≤150 words (files written, validator result, open flags) —
   never full content back to the orchestrator.
4. **Bounded research:** ≤ ~6 fetches per lesson; prefer docs pages over long video pages; no re-fetching.
5. **Self-check loop with a cap:** run the validator, fix, re-run — max 3 iterations, then report and stop.
6. **Parallel where independent:** content waves run concurrently; app and simulator in parallel with content.
7. **Cheapest capable model:** Haiku for mechanical checks; Sonnet for writing/code; Opus only for orchestration/decisions.
8. **No loops:** I monitor progress; an agent with no file output after its work window, or repeating failures, is stopped and its task re-scoped.
9. **Commit per wave** so work is never lost if the container recycles.

---

## 8. Phases & milestones

| Phase | Work | Parallel? |
|---|---|---|
| P0 | This plan; repo scaffold; schema; `validate.js`; design tokens; one exemplar lesson | Orchestrator |
| P1 | App shell: router, store, home, track list, skill tree, lesson reader, quiz, skip/test-out, profile, glossary | Sonnet ×1 |
| P2 | Ladder simulator engine + editor + 10 core challenges | Sonnet ×1 (parallel with P1/P3) |
| P3 | Content wave A: T0, T1, T2, T3 (theory) | Sonnet ×~8 |
| P4 | Content wave B: T4, T5, T6 | Sonnet ×~8 |
| P5 | Content wave C: T7, T8, T9 + glossary + remaining sim challenges | Sonnet ×~7 |
| P6 | QA: validate, link-check, accuracy review, design critique + a11y review, phone layout test (Playwright screenshots) | Haiku + Sonnet |
| P7 | Polish, README (run the server, Tailscale setup, start on boot), PR | Orchestrator |

---

## 9. Risks

- **Accuracy drift** (esp. 8.3 vs 8.1 differences) → source-first writing, link checks, `VERIFY` flags, reviewer pass.
- **Volume** (~95 lessons) → strict schema + validator keep quality uniform; waves can be cut at track boundaries.
- **Simulator complexity** → v1 scope fixed above; advanced instructions are stretch goals.
- **Two devices editing at once** → per-lesson `updatedAt` merge on the server; last real change wins per item, not per file.
- **Copyright** → original explanations only; we link to IA/Rockwell material, never copy it.
