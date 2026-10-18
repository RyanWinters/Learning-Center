# Glossary audit (content/glossary/*.js)

Method: a throwaway Node script (outside the repo) loaded all 805 terms and the lessons, then flagged duplicate or colliding terms and aliases, short or generic aliases, missing or weak eli5, defs over two sentences, and `lesson` pointers whose lesson does not use the term. I read every definition against docs/HOUSE_STANDARD.md, docs/FACTS.md and the lesson it points to. `node tools/validate.js` and `node tools/sim-test.js` pass (804 terms).

## Fixed

Duplicates and collisions. Every near-duplicate id below is referenced by a lesson, so none were deleted except `chassis`.
- `chassis` merged into `rack` (nothing referenced it); "chassis" is now an alias of `rack` and the def covers both.
- `persp-session` and `perspective-session` both had the term "Perspective session". Kept both because lessons reference both. The second is now "Perspective session load" with a load-focused def; "Perspective sessions" moved to `persp-session`.
- `ign-scope` and `ign-scripting-scope` shared the aliases gateway, client and Designer scope. Aliases now sit on one entry each, and both defs list Gateway, Designer, Vision client and Perspective session.
- `gateway-message-handler` and `persp-message-handler` both used "Message handler". Renamed to "Gateway message handler" and "Perspective message handler", and the ambiguous bare "message handler" aliases were dropped. Lessons use explicit `{{term:}}` shortcodes.

Definitions that contradicted FACTS or HOUSE_STANDARD.
- `query-tag-history`: said the system.historian functions are "the newer family beside it". Now says it is deprecated in 8.3 but still runs, with queryRawPoints and queryAggregatedPoints (FACTS #1).
- `ign-indirect-path`: example used `.Sts_Running`; now `.Sts.Running`.
- `udt`: example "Motor with Run, Fault, Speed" is now "Cmd, Sts and Cfg members". `cmd-sts-cfg` now mentions Alm.

Generic or ambiguous aliases removed or made specific.
- `DB`, `DBs` (Siemens data block, but "DB" means database in the SQL track)
- `CASE` (SQL CASE), `CAP` (CAP theorem), `CST` (Central Standard Time), `EU`, `RTU` (remote terminal unit), `CPT` (clashed with control power transformer; "CPT instruction" added)
- `OPC`, `OPC server(s)` and `Data Access` (OPC Classic), `security policy`
- `overload(s)`, `scaling`, `Warm`, `Compose`, `Exchange`, `start-up`, `auditing`, `normalized`
- `cross-reference(s)`, `wall clock`, `device load`, `sizing guide`, `standard rate`, `style guide`, `shadowing`, `base unit`
- `point-to-point`, `point to point`, `partitioning`, `partitioned`
- `array(s)`: term is now "Logix array"
- `parity`: term is now "Serial parity"
- `transform(s)`: term is now "Binding transform"
- `redundancy`: term is now "Gateway redundancy"
- `State transition` (was "Transition")
- `security zone(s)`: now "Ignition security zone(s)", so it will not link in network-security prose

Lesson pointer: `ign-request-concurrency` now points to `ign-logix-driver`, which teaches it more fully (it was `ign-devices`).

Style.
- Defs trimmed to two sentences: `run-program-mode`, `select-statement`, `approach-boundaries`, `ign-unlimited-licensing`.
- Weak eli5 rewritten: `xic`, `udt-member`, `ign-udt-definition`, `ign-expression-tag`, `ign-project-library`, `eam-controller`, `eam-agent`, `backup-gateway`.

## Checked, no change
- No term lacks an eli5 or a lesson. Every `lesson` pointer is a lesson that uses the term. The weakest are `electrically-safe-work-condition` (the lesson teaches "de-energized by default" without that phrase) and `operation` (a table row only).
- `gwbk` and `gateway-backup`, `rto` (timer) and `recovery-time-objective`, and `deadband` and `historian-deadband-style` are distinct concepts. The two backup entries are referenced separately, and the defs agree with the lessons.
- The defs for redundancy standby levels, timer types, message scopes, partitions and pruning, `ApprovedOnly` and ack modes match their lessons. NAMUR values match HOUSE_STANDARD section 5.

## Needs a decision
- `lessons/persp-charts.js` line 40 says the system.historian functions "sit beside" system.tag.queryTagHistory. FACTS #1 says to teach the 8.3 API first and call the old one deprecated. This is outside my lane.
- Very common words stay as aliases because they are domain terms: `database`, `historian`, `broker` (also Kafka), `binding`, `recipe`, `traceability`, `overflow`/`underflow`, `schema`, `popup`, `polling`. They link once per paragraph and may feel noisy.
- Capitalised single-word terms (Switch, Router, Tag, Download, Upload, Rack, Roaming) also link at the start of a sentence. Fixing that needs a linker change, such as case-sensitive matching only for terms flagged as such.
- The `RTO` alias belongs to the Logix timer. "RTO" in database prose will link to the timer, not Recovery time objective.
