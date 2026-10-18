# Audit: Ignition-specific claims

Output: docs/IGNITION_CLAIMS.md (about 150 claims grouped by lesson, 58 starred).

## Checked
- Every `system.*` call in lessons, sims and glossary (about 180 hits) for signature, deprecation wording (FACTS 1, 10) and 8.1/8.3 labelling.
- Ports, file paths, defaults, edition and version statements across ign-, arch-, build-, db-, persp-, mes-, proto-, net-security.
- Cross-lesson consistency: historian naming, store and forward vs Core Historian, Failover Timeout (8.1.37), Edge packaging, Event Streams on Edge, Sepasoft version pairing and renamed modules, Gateway Network defaults, Modbus one-based addressing, quality codes (no 192), Logix defaults. No contradictions found in these.
- Code conventions: no f-strings, type hints or py3-only syntax found in Ignition examples; the only per-tag loop is the labelled anti-pattern in ign-scripting; getLogger used throughout.

## Fixed
- db-procs.js: stored-procedure example used `system.perspective.print`; now uses `system.util.getLogger`.
- ign-scripting.js: library example used `system.perspective.print("Start sent")`; now a logger call.
- ign-databases.js, db-project.js, build-oee.js, persp-performance.js: added that Gateway-scope named-query calls (tag change, timer, message handler) need the project name; argument name and position deferred to the 8.3 manual.
- build-setup.js: removed unverifiable "Maker Edition 8.0.14" and "simulator 8.0.8" version claims; now "check the release notes".

## Needs a decision
- ign-tags: "memory tag is the default type" and "memory tags forget value on restart unless retain" (low confidence, likely wrong for 8.x persistence).
- ign-expressions: `^` as power operator and bitwise operator spellings (E01).
- ign-licensing: Maker Edition caps (10 sessions, 10,000 tags), leased-license "timeout changed during 2026", AWS Marketplace "8.3.5".
- ign-security: Classic vs Identity Provider split for Designer/Vision vs Perspective.
- persp-events: claim that `system.perspective.sendMessage` cannot reach session-event handlers.
- arch-eam, arch-gateway-network: Agent Recovery removed in 8.3; 8.3 talks only to 8.3/8.1 gateways.
- Named-query execQuery/execUpdate signature (project argument) cannot be stated until checked against the 8.3 page.
- db-* lessons use "Tag Historian" generically; 8.3 calls it SQL Historian provider (cosmetic).
- ign-events uses py2 `except Exception, e:`; valid in Jython but `as e` is preferable (left unchanged).
