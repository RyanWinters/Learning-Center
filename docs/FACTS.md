# Verified facts (orchestrator-checked)

Reviewers apply these across all lessons. Each fact was verified against a source during the build.

| # | Fact | Source |
|---|---|---|
| 1 | In Ignition 8.3, `system.tag.queryTagHistory` is **deprecated**; use `system.historian.queryRawPoints`. `system.tag.queryTagCalculations` → `system.historian.queryAggregatedPoints`. The old functions still run (backward compatibility). Teach the 8.3 API first, with an "In 8.1" callout for the old one. | https://www.docs.inductiveautomation.com/docs/8.3/getting-started/installing-and-upgrading/ignition-8-upgrade-guide/81to83-upgrade-guide |
| 2 | Ignition 8.x quality codes differ from 7.x (7.x used 192 = Good). Use `isGood()` / `isBad()` / `qualityOf()` in expressions and `.quality.isGood()` in scripts; never compare to 192. | Ignition 8 expression reference |
| 3 | The Redundancy "Failover Timeout" setting was removed in 8.1.37. | https://inductiveautomation.com/downloads/releasenotes/8.1.37 |
| 4 | Sepasoft has **no separate Interlocking module**. Interlocks are features inside modules (e.g. Batch Procedure Permissive Start). Sepasoft MES 4.0 pairs with Ignition 8.3; 3.x with 8.1. Recipe & Changeover was renamed Settings & Changeover. | https://docs.sepasoft.com/articles/user-manual/permissive-start |
| 5 | Ignition Modbus driver defaults to one-based addressing (HR1 = 40001); zero-based is a device setting. | https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/modbus/modbus-address-mapping |
| 6 | Event Streams are 8.3 project resources (source → optional filter/transform → buffer → handlers) and are not supported on Ignition Edge. | https://docs.inductiveautomation.com/docs/8.3/ignition-modules/event-streams |
| 7 | Ignition's built-in OPC UA server default endpoint port is 62541. Logix driver defaults: 2 concurrent requests, CIP connection size 500. | Ignition manual (OPC UA server / Logix driver settings) |
| 8 | Logix: REAL → DINT conversion rounds (does not truncate). Major fault type 4 code 20 = array subscript out of range; type 6 = watchdog. PackML state numbers 1–17 as ISA-TR88.00.02. | Rockwell Major/Minor Fault codes; ISA-TR88.00.02 |
| 9 | Official Docker image data path: `/usr/local/bin/ignition/data`. | hub.docker.com inductiveautomation/ignition |
| 10 | In 8.3, `system.db.runNamedQuery` / `runSFNamedQuery` are **deprecated** → `system.db.execQuery` (SELECT), `system.db.execUpdate` (INSERT/UPDATE/DELETE); `execScalar` and `execUpdateAsync` also exist. `system.db.runQuery` family is also on the deprecated-pages list. Old calls keep working. In 8.3 pass `{}` (not `None`) for empty named-query params. Teach 8.3 names first with an "In 8.1" callout. | https://www.docs.inductiveautomation.com/docs/deprecated/system-functions/system-db-deprecated/system-db-runNamedQuery |
