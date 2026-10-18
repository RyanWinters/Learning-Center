# Fixes: Ignition track (ign-*)

Global: `track` set to `"ign"` in the 11 lessons that said `"ignition"` (matches curriculum). No glossary terms added (e6.js unchanged).
Note for orchestrator: glossary entry `ign-unlimited-licensing` (b1.js) still says "no limits on ... clients"; it should be reworded (not my file).

## ign-what
- Fixed: licensing premise (per Gateway plus modules; Perspective sessions/Vision clients licensed per module; link ign-licensing; no prices) in body, table, editions, eli5, example, pitfalls, quiz 1 and its explains.
- Softened: Edge "no database connectivity" -> check the edition page.

## ign-architecture
- Fixed: house tag path and LT101 trace; historian module naming reconciled (8.3 Historian: SQL + Core providers; 8.1 Tag Historian).
- Softened: Perspective scope claim (scripts you write run in Gateway scope; check docs), launcher OS list, Designer "locking and merge" claim.

## ign-install
- Softened: Docker env var names, port-search behavior (quiz kept, per install guide), gateway.xml hand-editing, 255-char path, tag group API claim, openapi path.
- Fixed: day-one example uses 10.20.30.10, Plant1-GW1, adds 8060 and closing 8088; curl to house host.

## ign-devices
- Fixed: concurrency default cited to driver settings (FACTS 7), not forum; house names (PLC1, M101, LT101); illustrative label on 800->150 ms; plain statement that tags are OPC UA client; status labels hedged; links to ign-logix-driver (3).

## ign-tags
- Fixed: history date (first release 2010); removed unsourced 8.0 mode claim; house paths and M101 in examples, JSON, quiz, diagram.

## ign-udts
- Rewritten to HOUSE s2 Motor (Cmd/Sts/Cfg/Alm folders, `ns=1;s=[{PLC}]{InstanceName}.Sts.Running`, `[default]Plant1/Area10/Line1/M101`), faceplate `tagPath`, diagram, quizzes, examples.
- Added: "Tag groups and scan rates per member" with 40-motor sizing (600 tags, ~456/s vs 2,400/s). Replaced vague 8.1 note with concrete storage difference.

## ign-expressions
- Fixed: power operator is `^`, not `**` (verified against 8.1 docs); bitwise row corrected; 5.0/9 float division; house paths. Softened now() default rate.

## ign-scripting
- Fixed: house paths, M101 Cmd/Start example, hardwired-stop note; added runPrepQuery/8.3 deprecated-family note.

## ign-events
- Fixed: "four families" -> three; library prerequisite (gateway scripting project, link ign-projects); log/try-except note; house paths. Softened event ordering.

## ign-historian
- Fixed: FACTS 1 (queryRawPoints/queryAggregatedPoints first); naming conflict removed (unsourced "embedded"/QuestDB-early-access text cut); house paths.
- Softened: monthly partition default, 60 s pre-process default, pruner failure wording, keyword names in query, 7.x history.

## ign-alarming
- Fixed: diagram redrawn with all four states and labeled transitions (condition true, operator acks, condition clears, leaves list); LT101/LAH-101 example; Motor UDT alarm example with hardwired overload note.

## ign-databases
- Softened: S&F cache default/50,000 advice (quiz and examples now say "configured for 25,000"), transaction group types, parameter-type behavior, named query release.
- Fixed: garbled runPrepQuery sentence; runQuery family deprecated with exec* replacements (FACTS 10); house JDBC hosts and PLC names.

## ign-security
- Fixed: example tag and subnet (10.20.20.0/24 HMI VLAN; note servers are 10.20.30.0/24); DMZ reverse proxy note.
- Softened: IdP import, security level names, helpers, self-signed cert, audit events/restore (quiz kept).

## ign-projects
- Fixed: event-script wording; Perspective "all scripts" softened; link to ign-events.

## ign-versioning
- Only change: "Pump faceplate" commit message -> Motor. Other findings (4-software) did not concern this lesson.

