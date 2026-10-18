# Pass 2 review: Ignition track (ign-*)

## Persona

Ignition Gold-certified integrator who has deployed dozens of 8.1 and 8.3 Gateways. Field experience covers Standard Gateways with Perspective and Vision, Logix and Modbus device connections, SQL Historian and Core Historian, SQL Bridge transaction groups, store and forward tuning, identity provider and Classic security setups, and multi-project inheritance. Reviewed against docs/HOUSE_STANDARD.md, docs/FACTS.md and the other ign lessons. Items marked (verify) need a check against the 8.3 manual or a live Gateway before a fix is made.

Mechanical checks run on all ten lessons: quiz answer indices point at the intended option, every explain array matches its options length, and every {{lesson:...}} reference resolves to an existing file. No failures were found. The findings below are content-level.

## Per-lesson findings

### ign-what
- **[high accuracy]** quiz 1 premise and `Standard Gateway license covers unlimited tags, unlimited clients` in body, plus quiz explain `Ignition does not license client seats.` → Perspective sessions and Vision clients are licensed counts, separate from the unlimited tag and device side (verify included counts on the current pricing page). Reword the body to "unlimited tags and device connections per Gateway; Perspective sessions and Vision clients are licensed separately", and rewrite quiz 1 so the distractor "Eight client seat licenses" is not a plausibly correct answer. As written, the lesson's central licensing claim is wrong for an integrator who has bought session packs.
- **[med accuracy]** Table row `Adding 10 operator stations | Ten more seats | Nothing to buy` → same issue as above; qualify it with "Perspective sessions or Vision clients may need licenses (verify)".

### ign-architecture
- **[high accuracy] (verify)** `Perspective is the surprise. Although it feels like a web client, its scripts (component events, bindings with scripts, session events) execute in the Gateway scope, not in the browser.` → The lesson builds its scope section, pitfall 1 and the `system.file.writeFile` example on this claim. Check the 8.3 Perspective scripting docs for which Perspective events and bindings run on the Gateway. If any run in the client context, reword the example and the "surprise" framing to match. The same absolute claim is repeated in ign-projects and implied in ign-expressions.
- **[med consistency]** worked trace `[default]Tanks/Tank1/Level` → HOUSE_STANDARD section 2 requires `[default]Plant1/Area10/Line1/<Equipment>/...`. Use a house-standard path, or say in one sentence that the path is deliberately generic.
- **[med consistency]** module table row `Tag Historian (SQL Historian in 8.3 also)` vs. the 8.1 note `8.3 lists a SQL Historian module as new. In 8.1 you had Tag Historian only.` → These contradict each other, and ign-historian describes SQL Historian as the classic provider with Core Historian as the new one. Rewrite both places to say the 8.3 Historian module offers SQL Historian and Core Historian providers, with the 8.1 Tag Historian as the predecessor (verify).
- **[low accuracy] (verify)** `Launchers and Workstation are available for Windows, Linux and macOS in 8.3.` → Check platform support per release before keeping the list.
- **[low accuracy] (verify)** `with project-level locking and merge handling` → Confirm Designer behavior with concurrent editors. If there is no project locking, reword to "last save wins unless you use version control".

### ign-install
- **[med accuracy] (verify)** `GATEWAY_HTTP_PORT`, default 8088, and `GATEWAY_HTTPS_PORT`, default 8043` → Confirm the environment variable names in the Docker image docs for the tag you use. Also check `The ports live in the Gateway's data/gateway.xml file as gateway.port and gateway.sslport`.
- **[med accuracy] (verify)** quiz 5 and explain `Clean installs check defaults and move up until a free port is found. Upgrades do not search and fault instead.` → This is quiz-graded behavior. Confirm it on a clean install and an upgrade before keeping it.
- **[med consistency] (verify)** `POST http://gw-prod:8088/data/api/v1/scan/projects` and `tag groups cannot be created through the API or scripting` → Check the path against /openapi on an 8.3 Gateway. The tag group limitation is sourced to forum replies, so cite the version it was observed on or drop it.
- **[low clarity]** `Inductive recommends talking to support before editing them by hand` → Say instead "edit these only with the Gateway stopped, and check the docs for your version" (the current wording reads as a support-desk instruction).
- **[low missing]** Day-one example `The firewall allows 8043 and the OPC UA port from the plant network only.` → Add the Gateway Network port 8060 rule for any site-to-site link, and state that 8088 should be closed once HTTPS is working.
- **[low accuracy] (verify)** `8.3 tag files can sit deep enough to hit the 255-character path limit` → Keep only if you have hit it on a real project.

### ign-devices
- **[med accuracy]** `The default is low (forum posters cite 2).` → FACTS 7 records the Logix driver default of 2 concurrent requests from the driver settings. Cite the manual, not forum posters, and keep the forum note only as the source of the tuning advice.
- **[med consistency]** `Tank1_Level` (controller tag), `Pump1_Run`, `Program:MainProgram.Pump1_Run` → HOUSE_STANDARD section 2 says underscores appear only after a prefix (UDT_, AOI_) or between an area and a name. Use house-style names such as `M101.Sts.Running`, `P101.Cmd.Start`, or mark these as deliberately outside the house convention.
- **[low accuracy] (verify)** `Disconnected / Faulted` and `Connected`, `Disabled` state names → Check the labels on the 8.3 device Status page and match them exactly.
- **[low clarity]** `Ignition's tag system then acts as an OPC UA client of that server, and OPC tags reference items by server and node ID.` → Say plainly that Ignition's own tags read through the built-in OPC UA module, since that is the point the two-layer model depends on.
- **[low missing]** Example `drops from about 800 ms to about 150 ms` is hypothetical. Label it "illustrative" so the numbers are not read as measurements (HOUSE_STANDARD section 7).

### ign-expressions
- **[high accuracy] (verify)** operator table row `Arithmetic ... and ** for power` and row `Bitwise & | ^ ~ << >>, used to unpack status words` → Check the Expression Functions page for these. Ignition documents power and bitwise operations as functions (for example pow and the bit functions). If the operator forms do not exist, replace the operator row with the function names.
- **[med clarity]** example `numberFormat(({[default]Oven1/Temp} - 32) * 5 / 9, "0.0") + " C"` → If Oven1/Temp is an integer tag, 5 / 9 integer-divides before formatting, so a 50 F reading shows as 10.0 C. The lesson's own pitfall warns about this. Rewrite as `* 5.0 / 9` or wrap the tag in toFloat().
- **[low accuracy] (verify)** `Without a rate it uses a default of about a second` → Cite the manual default or drop "about".
- **[low consistency]** `Oven1/Temp` path → Use a house-standard full path (cross-lesson issue below).

### ign-events
- **[med clarity]** `Ignition gives you four families of Gateway-side triggers: tag events, gateway events (...), and, covered elsewhere, alarm pipelines.` → The sentence lists three families. Say three, or name the missing fourth.
- **[med consistency]** why section: `put only tiny, generic behavior in the tag (setting a timestamp, calling one library function) and keep real logic in project script libraries that both call.` → A tag event script can reach a project library only after the gateway scripting project is designated, as ign-projects explains. Add that prerequisite here so the advice does not fail on first use.
- **[med accuracy] (verify)** `Events for a single tag are delivered in order.` → Confirm this guarantee in the 8.3 scripting docs and cite it, or soften it to "generally delivered in order".
- **[low missing]** No mention that exceptions in tag event, timer and message scripts are written to the Gateway log and do not stop the event source. A practitioner's first debugging step is reading the log, so add a short note and a try/except example.

### ign-historian
- **[high accuracy]** intro `Later, trends and scripts such as system.tag.queryTagHistory read them back` → FACTS 1 requires the 8.3 API first, with the old function in an "In 8.1" callout. Replace with system.historian.queryRawPoints and queryAggregatedPoints, and keep queryTagHistory in the 8.1 note only.
- **[med consistency]** `8.1 has the SQL Historian only, plus the older internal "embedded" historian option.` and the module naming in ign-architecture → Reconcile the 8.1 and 8.3 provider names across ign-architecture and ign-historian (see ign-architecture above).
- **[med accuracy] (verify)** `partitions ... by default, monthly` and `Pre-processed partitions ... (60 seconds by default)` → Uncited specific defaults. HOUSE_STANDARD section 7 requires a citation or "check the manual for your version". Add the citation or the phrase.
- **[med accuracy] (verify)** example query `system.historian.queryAggregatedPoints(paths=..., startDate=..., endDate=..., returnSize=24, aggregates=[...])` → Confirm keyword names against the 8.3 signature. The 8.1 note says to check parameter names when porting, so the 8.3 example should carry the same warning.
- **[low accuracy] (verify)** history section and 8.1 note: `previously called the internal historian based on QuestDB in early access` → Unsourced product history. Cut it or cite it.
- **[low accuracy] (verify)** pitfall `Enabling pruning on two providers that share the same database` → `put the sink in a failed state` needs a source or softer wording.
- Sizing arithmetic checked and correct: 500 rows/s, 43.2 M rows/day, about 2.2 GB/day, about 194 GB over 90 days, about 0.55 GB/day with a one-in-four deadband. No change needed.

### ign-databases
- **[high accuracy] (verify)** `the disk cache ... (default 25,000, and the manual advises against going above 50,000 ...)` and quiz 4 options and explain that depend on it → Uncited specific numbers (HOUSE_STANDARD section 7). Cite the store and forward page for the version, or write "check the manual for your version". Quiz 4's answer (about 10 minutes) changes if the default differs.
- **[med clarity]** `The same applies in runPrepQuery only if you build the string unsafely, but the habit of concatenating is the risk.` → Garbled. Say that runPrepQuery binds values as parameters, so it is safe for values, and that any function fed a string built from user input is unsafe.
- **[med missing]** section `Why not system.db.runQuery from the client?` → FACTS 10 lists the runQuery family as deprecated on the 8.3 deprecated-pages list. Say so, and give the 8.3 replacement (execQuery or execUpdate) beside the legacy call.
- **[low accuracy] (verify)** `Named queries arrived in Ignition 7.9`; parameter types `Value`, `Identifier`, `Query String`; `Identifier ... checked against allowed characters`; and the four 8.3 transaction group types → Check each against the 8.3 manual before the lesson is taught.
- Quizzes 1 to 6 checked: answer indices and explanations are correct.

### ign-security
- **[high consistency]** worked example `Tag [default]Plant/Pumps/P101/SP` and `the 10.20.30.0/24 control room subnet` → HOUSE_STANDARD section 2 puts tags under `[default]Plant1/Area10/Line1/...`, and section 3 assigns 10.20.30.0/24 to VLAN 30 (Level 3 servers, Ignition master at .10). Control-room HMIs are VLAN 20 (10.20.20.0/24). Fix the path and the subnet, or say the example is deliberately off-standard.
- **[med accuracy] (verify)** `an IdP export from 8.1 cannot be imported into 8.3`; `Service security settings ... moved into security zone configuration`; `After a restore, audit profiles come back disabled and must be re-enabled` → Confirm each in the 8.1 to 8.3 upgrade guide. Quiz 5 is graded on the last one.
- **[med accuracy] (verify)** `Authenticated/Roles/Operator` tree path, `containsAny` and `containsAll` helpers → Check against the Security Level Rules page.
- **[low accuracy] (verify)** `Ignition ships with a self-signed certificate on the secure port.` → Confirm for the 8.3 default install.
- **[low accuracy] (verify)** audit log `Tag writes, logins and project saves are then recorded with user and time.` → Confirm which events the audit profile captures on each version.

### ign-projects
- **[high accuracy] (verify)** table row `Scripting scope | Client scope and gateway scope | All scripts run on the gateway` and `In Perspective those scripts run on the server.` → Same unverified Perspective scope claim as ign-architecture. An absolute "all" is risky. Verify, then reword to match what the 8.3 docs say.
- **[med consistency]** `Gateway event scripts (timers, tag change scripts, message handlers) run only in the project that is not merely inherited.` → Unclear wording, and the same clarity issue appears in the examples. Say "run only in the project that defines them; children that inherit them do not run a copy".
- **[med consistency]** section `The gateway scripting project` → Good content, but ign-events recommends putting library calls in tag event scripts without this prerequisite. Add a cross-reference from ign-events.

## Cross-lesson issues

1. **Track field.** ign-what, ign-architecture, ign-install and ign-devices use `track: "ign"`. ign-expressions, ign-events, ign-historian, ign-databases, ign-security and ign-projects use `track: "ignition"`. Pick one value across the track, or the track filter will split the lessons.
2. **Tag path convention.** HOUSE_STANDARD section 2 sets `[default]Plant1/Area10/Line1/<Equipment>` and says examples use it unless a lesson says otherwise. Shortened paths appear in ign-architecture (`[default]Tanks/Tank1/Level`), ign-security (`[default]Plant/Pumps/P101/SP`), ign-events (`Line1/Jam`, `Batch/Done`, `Line1/ShiftCount`), ign-historian (`Mixer1/Temp`, `Line1/Tank/Temp`) and ign-expressions (`Oven1/Temp`). None of them says it is a deliberate departure, which HOUSE_STANDARD requires in one sentence.
3. **Tag naming.** `Tank1_Level`, `Pump1_Run`, `Line1.GoodCount` and `Line1.Done` break the underscore rule in HOUSE_STANDARD section 2. Use PascalCase member names with the house prefixes, or mark each example as outside the convention.
4. **Historian naming.** ign-architecture and ign-historian describe the 8.1 and 8.3 historian modules differently (see the two entries above). This needs one agreed model.
5. **Perspective scope claim.** The "Perspective scripts run in the Gateway scope" statement (ign-architecture) is repeated in ign-projects and underpins the per-session polling argument in ign-expressions. Verify it once against the 8.3 docs, then align all three lessons.
6. **Licensing.** ign-what's "unlimited clients" and "does not license client seats" conflicts with any Perspective or Vision session licensing. Fix once in ign-what, then check any downstream mention.
7. **Cited numbers.** Uncited specifics that need a citation or "check the manual": ign-databases (25,000 cache, 50,000 advice), ign-historian (monthly partitions, 60 s pre-process window), ign-expressions (about one second default rate), ign-devices (forum-sourced concurrency default that FACTS 7 already states from the manual).
8. **FACTS coverage.** FACTS 1 is missed in ign-historian (fix above). FACTS 2 is applied correctly in ign-expressions. FACTS 7 is applied correctly in ign-devices, with the attribution issue noted. FACTS 10 is applied in ign-databases but the deprecation note is missing from the runQuery section.
9. **Lesson references.** All {{lesson:...}} and {{diagram:...}} references resolve. No broken links.

## One-line verdict

Solid structure and correct quiz mechanics, but the ign-what licensing premise, the unverified Perspective scripting-scope claim, the historian naming conflict, and the house-standard path and subnet violations need fixing before these lessons are taught as written.
