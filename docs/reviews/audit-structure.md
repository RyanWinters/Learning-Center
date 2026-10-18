# Structure audit (curriculum, sims, prereqs, quizzes)

Throwaway script (not in repo) computed per lesson: prose word count (body, why, history, examples, pitfalls; fenced and inline code excluded), reading time at 180 wpm, plus 0.5 min per quiz question and 3 min per `{{sim:}}` linked, level, prereqs, `{{lesson:}}` links and sim links. `node tools/validate.js` and `node tools/sim-test.js` pass after all edits.

## 1. Minutes (fixed)
- Formula: round5(words/180 + 0.5 x quiz questions + 3 x sims), minimum 10. Build Labs keep their build estimate (45/60/60/45/75).
- Result: the old numbers were mostly too HIGH, not too low. Typical lesson is 1,700-2,700 words and 6 questions, so 10-20 min. 113 of 141 values changed (for example plc-state-machines 30 -> 10, db-project 40 -> 15, int-capstone 45 -> 25, hmi-* 20-30 -> 20); a few went up (arch-ecosystem 10 -> 15, persp-mobile 15 -> 20, int-career 10 -> 15, found-jargon 10 -> 15).
- Lesson file `minutes` equals curriculum.js for all 141. Note: these figures cover reading and quiz only. Learners who do the sims or follow along in Studio 5000 / Ignition will take longer. If you want "realistic including practice", multiply PLC/Ign/Build-adjacent lessons by about 1.5; needs a decision.

## 2. Lesson file vs curriculum
- Before my edits, all 141 lesson files already matched curriculum.js on title, level and prereqs. Now re-synced after the changes below.

## 3. Prereqs and levels
Fixed (curriculum.js and lesson file both):
- plc-tags level 2 -> 1 (plc-ladder-basics is L1 and requires it).
- mes-industry4 level 3 -> 4 (requires mes-uns, L4).
- int-career prereq int-lifecycle (L2) -> found-roles (keeps it L1; it is a career lesson, not a lifecycle follow-on).
- ign-events + ign-udts (body teaches tag event scripts on UDT definitions).
- plc-comms + plc-udt (produced/consumed payload is a UDT, mismatch faults).
- ign-databases + ign-scripting (shows system.db.* calls throughout). No cycles; validator passes.

Checked and left alone (needs a decision if you disagree):
- Glossary-term scan (terms owned by a lesson that is not an ancestor, 3 or more distinct): int-commissioning, int-lifecycle, mes-what use found-jargon terms; mes-uns uses 3 arch-mqtt terms. Terms are hover-defined, so no prereq added.
- ign-devices recommends UDTs and the Logix driver but has no plc-* prereq (links plc-udt as see-also). db-timeseries shows a system.historian script without ign-scripting upstream. persp-hphmi, hmi-color/layout/perception lean on alarm colors without ign-alarming/int-alarm-mgmt upstream (hmi-abnormal does require ign-alarming). plc-scan uses ladder vocabulary a lesson before plc-ladder-basics (by design: scan precedes ladder).
- About 700 `{{lesson:}}` links point at non-ancestors (forward "see also"). That is normal cross-referencing; nothing relied on as a hard dependency beyond the above. Heaviest outward-linking lessons: int-career, int-capstone, int-standards (fine for reference lessons).
- Remaining level inversions: none.

## 4. Quizzes
Fixed:
- Answer position skew: 455 of 798 correct answers were option B (57%), A 19%, C 18%, D 6%. I moved the correct option of 574 questions to a seeded, per-lesson balanced position (now A 203, B 194, C 201, D 200), reordering options and explain arrays together and updating `answer`. Only the quiz arrays changed; a script verified option/explain pairs and non-quiz content are unchanged. 24 questions that reference "above/below/first option" wording were skipped.
- Explain alignment: every explain at the correct index starts "Correct", none of the wrong ones do. No duplicate options, no "all of the above".
- Spot checks against FACTS.md (8.3 historian and db functions, port numbers, fault codes, REAL/DINT rounding, subnet maths, Gateway Network DMZ pattern) found no contradictions. I did not read all 798 questions against their bodies.
- Duplicates across lessons: none real (plc-counters q1 / plc-oneshots q1 share an answer "1" but test different instructions).

Needs a decision:
- Length giveaway (systemic): the correct option is the longest in 680 of 798 questions (85%), and more than 1.3x longer than the next option in 557 (70%). A test-wise learner can score well without reading. Fixing needs distractors rewritten to similar length and specificity per question; too large and too subjective for a mechanical edit. Suggest a content pass on one track at a time.
- int-lifecycle q4 and mes-what q3 look similar ("separates X from Y") but are different questions.

## 5. content/sim/index.js
- All 26 titles, levels and lesson links match their challenge files; all 25 distinct `{{sim:}}` references in lessons exist.
- Decisions: sim-conveyor is referenced by no lesson (index lesson plc-faults, which does not mention jams); sim-mixer-batch is indexed under plc-isa88-packml but only plc-state-machines links it; sim-tour is indexed under plc-studio but linked from plc-scan; sim-step-fault (level 3) is listed last after the level-4 entries. Body edits to add the links are outside this lane.

## 6. Track coverage
- Entry lessons: found-history (no prereq); net-data (found-signals, T0); plc-intro (found-devices, T0); ign-what, hmi-perception, mes-what, int-standards (found-purdue, T0); int-lifecycle (found-roles, T0); build-setup (ign-install). OK.
- Entries needing a note: proto-* (proto-serial needs net-data, T1; proto-enip needs net-vlan; proto-opc and proto-mqtt need net-routing): sensible, since Protocols follows Networking. db-intro requires net-data (T1) only for bits/bytes; could be found-signals if you want T7 reachable from T0 alone. persp-views needs ign-projects + ign-tags; arch-gateway-network needs ign-architecture + net-routing. All fine.
- HMI track (starts at found-purdue) and Build Labs (build-setup via ign-install, ends at build-oee) are reachable. build-faceplate/alarms/oee are all chained.
- No inbound prereq or `{{lesson:}}` link from any other lesson: found-jargon, proto-fieldbus, proto-others, arch-reporting. (mes-industry4 and hmi-redesign are track ends.) They are reachable through the track list, but nothing leads to them. Fix needs a "see also" link in a related body (outside this lane): suggest proto-fieldbus and proto-others from proto-enip/proto-modbus, arch-reporting from ign-databases, found-jargon from found-history or found-purdue.
