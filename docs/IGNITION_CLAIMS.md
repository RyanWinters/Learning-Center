# Ignition claims inventory

Purpose: every Ignition-product-specific claim in the curriculum that an official docs page could confirm or refute, so a later pass can check them line by line. Built from a grep-first scan of all lessons (ign-, persp-, arch-, build-, db-, mes-, hmi-, int-, proto-, net-security) plus glossary/sim references to `system.*`.

Legend. Confidence: **high** = matches docs/FACTS.md or widely known; **med** = plausible, likely right, unverified; **low** = from memory or forum, check first. A star marks the roughly 40 most important or riskiest claims. Doc hints are path-style guesses in the Inductive Automation manual (docs.inductiveautomation.com), Sepasoft (docs.sepasoft.com) or Cirrus Link (docs.chariot.io).

Status of the first sweep (2026-10): contradictions between lessons were fixed in place (see docs/reviews/audit-ignition.md). Nothing here has yet been checked against the live docs.

| id | lesson (section) | claim (short quote) | category | ver | conf | docs page to check |
|---|---|---|---|---|---|---|
| **ign-scripting** | | | | | | |
| S01 ★ | ign-scripting (Python) | "Ignition scripting is Jython 2.7"; 8.1 and 8.3 both | scripting | 8.1/8.3 | high | 8.3 > Scripting > Scripting Overview / Jython |
| S02 | ign-scripting (Python) | NumPy/pandas cannot be installed with pip | scripting | all | high | 8.3 > Scripting > Python Scripting |
| S03 | ign-scripting (In 8.1) | legacy `system.tag.read/readAll/write/writeAll` replaced by Blocking versions "in the 8.0 line" | function | 8.0 | med | 8.3 > Appendix > Scripting Functions > system.tag (deprecated list) |
| S04 ★ | ign-scripting (system.tag) | `readBlocking` blocks until done or timeout "default 45 seconds" | function/default | 8.x | med | system.tag.readBlocking |
| S05 ★ | ign-scripting (system.tag) | `writeBlocking` returns list of quality codes; bad write "fails without raising" | function | 8.x | high | system.tag.writeBlocking |
| S06 | ign-scripting (system.tag) | also `configure`, `getConfiguration`, `browse`, `exists`, `query`, `readAsync`/`writeAsync` | function | 8.x | high | system.tag index |
| S07 ★ | ign-scripting (system.db) | `system.db.runPrepQuery(sql, [args], "plantdb")`; "run* family is on the 8.3 deprecated list but still works" | function | 8.3 | high (FACTS 10) | Deprecated > system.db |
| S08 | ign-scripting (system.util) | `getLogger`, `sendMessage`, `sendRequest`, `invokeAsynchronous`, `invokeLater`, `getGlobals`, `jsonEncode/jsonDecode`, `getProjectName` | function | 8.x | high | system.util index |
| S09 | ign-scripting (system.perspective) | helpers `navigate, openPopup/closePopup, sendMessage, getSessionInfo, print, download, refreshBinding`; "fail in a gateway timer script that has no session" | function | 8.x | med | system.perspective index |
| S10 ★ | ign-scripting (Where code lives) | Tag event scripts can only call functions in the Gateway Script Project | scope | 8.x | med | Project > Gateway Event Scripts / Script Project setting |
| S11 | ign-scripting (Where code lives) | Project libraries inherited between projects via parent | project | 8.x | high | Projects > Project Inheritance |
| S12 ★ | ign-scripting (Logging) | Levels trace, debug, info, warn, error; default threshold info; level change lasts until restart | logging | 8.x | med | Gateway > Status > Logs; Logging config |
| S13 | ign-scripting (Logging) | loggers appear on Gateway Diagnostics logs page and in `wrapper.log` | path | 8.x | med | Status > Diagnostics > Logs |
| S14 | ign-scripting (Logging) | `log.error("msg", exception)`; `log.isDebugEnabled()` | function | 8.x | med | system.util.getLogger (LoggerEx) |
| S15 | ign-scripting (Threads) | Vision/Designer: `invokeAsynchronous` then `invokeLater` | scope | 8.x | high | system.util.invokeAsynchronous |
| S16 | ign-scripting (scopes table) | Vision client adds `system.gui`, `system.nav`, `system.printing` | scope | 8.x | high | Appendix > Scripting Functions |
| **ign-architecture** | | | | | | |
| A01 | ign-architecture (Gateway) | Admin web UI at `http://host:8088` with Status and Config pages | port | 8.x | high | Getting Started > Installing |
| A02 ★ | ign-architecture (Scopes) | Perspective component events, script transforms, session events execute in Gateway scope | scope | 8.x | high | Perspective > Scripting |
| A03 ★ | ign-architecture (Scopes example) | `system.file.writeFile("C:/export.csv", data)` from Perspective writes on the server | function/scope | 8.x | high | system.file.writeFile |
| A04 | ign-architecture (table) | History: "Core Historian and SQL Historian providers in 8.3; Tag Historian in 8.1" | module | 8.1/8.3 | med | 8.3 > Ignition Modules > Tag Historian / Historian |
| A05 | ign-architecture (history) | Perspective arrived with 8.0 in 2019; 8.3 in 2025 | history | 8.0/8.3 | med | Release notes |
| **ign-install** | | | | | | |
| I01 ★ | ign-install (ports table) | 8088 HTTP, 8043 HTTPS, 8060 Gateway Network, 62541 OPC UA server | port | 8.x | high (FACTS 7) | Getting Started > Ports |
| I02 ★ | ign-install (8.3 UI/files) | 8.3 stores most config as files under `data/config`; resource = folder with JSON | file path | 8.3 | med | 8.3 > Platform > Gateway Configuration Files / Version Control |
| I03 ★ | ign-install (REST API) | gateway REST API; docs at `/openapi`; `/data/api/v1/resources`; `POST /data/api/v1/scan/projects` with header `X-Ignition-API-Token` | api | 8.3 | med | 8.3 > Platform > Gateway REST API |
| I04 | ign-install (backups) | `.gwbk` backup contains configuration, projects, other state | file | all | high | Platform > Gateway Backup |
| I05 | ign-install (quiz) | clean install with 8088 in use "moves to the next available port" | installer | 8.x | low | Installing and Upgrading > Installation |
| I06 | ign-install | commissioning flow: license EULA, admin user, ports (HTTP 8088, HTTPS 8043) | setup | 8.3 | med | Installing > Commissioning |
| **ign-versioning** | | | | | | |
| V01 ★ | ign-versioning (8.3) | project layout on disk: `view.json`, `code.py`, `config.json`, `resource.json` (scope, version, last modification, signatures) | file | 8.3 | med | 8.3 > Platform > Version Control > Project Structure |
| V02 | ign-versioning (table) | project export `.zip` (`.proj` in older versions) | file | 8.x | med | Platform > Projects |
| V03 ★ | ign-versioning (deployment modes) | named deployment modes (dev/test/prod) let resources carry per-mode values | feature | 8.3 | med | 8.3 > Platform > Deployment Modes |
| **ign-licensing** | | | | | | |
| L01 ★ | ign-licensing (Trial) | trial mode: full function for two hours, then Reset Trial on Licensing page | licensing | 8.x | high | Platform > Licensing |
| L02 ★ | ign-licensing (Editions) | Edge Panel limited to two Perspective sessions or Vision clients | limit | 8.1.33+ | med | Other Editions > Ignition Edge |
| L03 ★ | ign-licensing (Maker) | Maker Edition caps "10 Perspective sessions, 10,000 tags", non-commercial only | limit | 8.3 | low | 8.3 > Other Editions > Ignition Maker Edition |
| L04 ★ | ign-licensing (leased) | leased licensing: hourly check-ins, trial fallback after a timeout; "timeout changed during 2026" | licensing | 8.3 | low | 8.3 > Platform > Licensing > Leased Licensing |
| L05 | ign-licensing | container version on AWS Marketplace "added in 8.3.5" | version | 8.3.5 | low | Release notes 8.3.5 |
| L06 | ign-licensing (Edge row) | Event Streams not supported on Edge | edition | 8.3 | high (FACTS 6) | 8.3 > Event Streams |
| **ign-expressions** | | | | | | |
| E01 ★ | ign-expressions (operators) | `^` is power (not `**`); bitwise `&`, `xor`, `~`, `<<`, `>>`, single pipe OR | expression | 8.x | low | Appendix > Expression Functions > Operators |
| E02 | ign-expressions (operators) | comparison `=` or `==`, `!=` or `<>`; logic `&&`, `||`, `!` | expression | 8.x | high | Operators |
| E03 ★ | ign-expressions (functions) | `now(rate)`: re-evaluates every rate ms; `now(0)` evaluates once; `now(1000)` clock | expression | 8.x | high | Expression Functions > Date and Time > now |
| E04 | ign-expressions | `try(expr, fallback)`, `tag(path,[property])`, `lookup`, `switch`, `if`, `dateFormat`, `coalesce`, `isNull`, `numberFormat`, `toInt/toFloat/toStr` | expression | 8.x | high | Expression Functions index |
| E05 ★ | ign-expressions (quality) | `isGood()`, `isBad()`, `qualityOf()`; 7.x used 192 for Good, never compare to numbers | expression | 8.x | high (FACTS 2) | Expression Functions > Quality |
| E06 ★ | ign-expressions (runScript) | `runScript("shared.fmt.timeAgo", 5000, {[.]LastSeen})`; in expression tags the poll rate is limited by the tag group | expression | 8.x | med | Expression Functions > runScript |
| E07 | ign-expressions | references: `{[.]Level}` relative tag, `{view.params.x}`, `{this.props.text}` | syntax | 8.x | high | Perspective > Bindings |
| **ign-tags** | | | | | | |
| T01 ★ | ign-tags (types) | Value Source types: OPC, Memory, Expression, Derived, Reference, Query ("six tag types"); "memory tag is the default type" | tag | 8.x | low | Tags > Tag Types / Value Source |
| T02 ★ | ign-tags (types) | "Memory tags forget their value on a Gateway restart unless initial value or retain" | tag | 8.x | low | Tags > Memory Tags (persistence) |
| T03 | ign-tags | derived tag uses `{source}` in read expression and `{value}` in write expression | syntax | 8.x | med | Tags > Derived Tags |
| T04 ★ | ign-tags (tag groups) | modes Direct, Driven, Leased; scan class renamed tag group in 8.0 (was "7.9") | tag group | 8.x | med | Tags > Tag Groups |
| T05 | ign-tags (leased) | selecting a tag in Tag Browser does not trigger leased rate | tag group | 8.x | low | Tag Groups > Leased |
| T06 | ign-tags | `[.]` sibling, `[~]` current provider, indirect `{Line}` | syntax | 8.x | med | Tags > Tag Paths |
| T07 | ign-tags (quality table) | Bad_NotConnected, Bad_NotFound, Bad_Stale, Bad_AccessDenied, Bad_Disabled, Error_Configuration, Error_ExpressionEval | quality | 8.x | med | Appendix > Quality Codes |
| T08 | ign-tags | fresh gateway has one realtime provider called `default` | default | 8.x | high | Tags > Tag Providers |
| **ign-udts** | | | | | | |
| U01 ★ | ign-udts (parameters) | built-in `{InstanceName}` parameter; OPC item path `ns=1;s=[{PLC}]{PlcTag}.Sts.Running` | UDT | 8.x | med | Tags > UDTs > Parameters |
| U02 | ign-udts | parameters are strings; instance cannot add members; parent type cannot be changed on an instance | UDT | 8.x | med | UDTs > Inheritance |
| **ign-alarming** | | | | | | |
| AL1 ★ | ign-alarming (properties) | priorities Diagnostic, Low, Medium, High, Critical; ack mode Unused/Auto/Manual | alarm | 8.x | high | Alarming > Alarm Properties |
| AL2 ★ | ign-alarming (modes) | modes Above/Below/Between/Outside Setpoint, Equal/Not Equal, Bad Quality, On Condition, Any Change | alarm | 8.x | med | Alarming > Alarm Modes |
| AL3 | ign-alarming (deadband) | high alarm at 80, deadband 2 clears below 78 | alarm | 8.x | med | Alarm Properties > Deadband |
| AL4 | ign-alarming (Unused) | "Unused: always acknowledged ... keeps alarm out of pipelines" (ack is a default drop-out) | alarm | 8.x | low | Alarm Pipelines > Drop-out |
| AL5 | ign-alarming (shelving) | shelved events hidden from status tables | alarm | 8.x | med | Alarming > Shelving |
| AL6 | ign-alarming | alarm journal profile needs a database; status table is gateway memory | alarm | 8.x | high | Alarming > Journal |
| **ign-events** | | | | | | |
| EV1 ★ | ign-events (tag event) | signature `valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents)` | scripting | 8.x | high | Tags > Tag Event Scripts |
| EV2 | ign-events | `missedEvents` true when queue overflowed | scripting | 8.x | med | Tag Event Scripts |
| EV3 ★ | ign-events (messages) | `system.util.sendMessage(project, handlerName, payload, scope)`; scope `"G"`; `sendRequest`/`sendRequestAsync` | function | 8.x | high | system.util.sendMessage |
| EV4 | ign-events | Gateway Events: startup, shutdown, timer, tag change, message handlers | feature | 8.x | high | Designer > Gateway Events |
| EV5 | ign-events (timer) | fixed delay vs fixed rate timer options | feature | 8.x | high | Gateway Timer Scripts |
| EV6 | ign-events | tag event scripts run in a shared thread pool | scope | 8.x | med | Tag Event Scripts |
| **ign-historian / db-timeseries / build-alarms-history** | | | | | | |
| H01 ★ | ign-historian; FACTS 1 | `system.historian.queryRawPoints`, `queryAggregatedPoints` are 8.3; `system.tag.queryTagHistory`/`queryTagCalculations` deprecated but run | function | 8.3 | high | 8.3 > Appendix > Scripting Functions > system.historian; Deprecated |
| H02 ★ | ign-historian (example) | `queryAggregatedPoints(...)` keyword names (paths, startTime, endTime, ...) | function | 8.3 | low | system.historian.queryAggregatedPoints |
| H03 ★ | ign-historian (In 8.1) | `queryTagHistory(paths, startDate, endDate, returnSize=24, aggregationMode="Average", returnFormat="Wide")` | function | 8.1 | high | 8.1 > system.tag.queryTagHistory |
| H04 ★ | db-timeseries | `system.historian.storeDataPoints` (8.3) vs `system.tag.storeTagHistory` (8.1) | function | 8.3 | low | system.historian index |
| H05 ★ | ign-historian (table) | Core Historian (new in 8.3): built-in QuestDB, write-ahead log, no store and forward; SQL Historian uses S&F | module | 8.3 | med | 8.3 > Ignition Modules > Tag Historian > Core Historian |
| H06 | ign-databases (In 8.1) | Core Historian does not use store and forward; SQL Historian, transaction groups, alarm journals still do | module | 8.3 | med | Store and Forward |
| H07 | db-timeseries | `sqlth_te`, `sqlth_partitions`, `dataintegrity` column holds quality | schema | 8.x | high | Tag Historian > Database Tables |
| H08 | build-alarms-history | "Parameter names and accepted path forms changed in a later 8.3 patch release" | version | 8.3.x | low | 8.3 release notes (historian functions) |
| H09 | arch-remote-services | 8.3 "Remote Historian" (8.1 "Remote History Provider"); internal historian in "Historian Core" module | module | 8.3 | low | 8.3 > Historian > Remote Historian |
| **ign-databases / db-* / build-oee** | | | | | | |
| D01 ★ | ign-databases; FACTS 10 | 8.3: `system.db.execQuery` (SELECT), `execUpdate` (INSERT/UPDATE/DELETE), `execScalar`, `execUpdateAsync`; `runNamedQuery` deprecated | function | 8.3 | high | Deprecated > system-db-runNamedQuery |
| D02 ★ | ign-databases; build-oee | `execQuery("Production/getLineLog", {params})` signature, return type; `{}` not `None` for empty params | function | 8.3 | med | system.db.execQuery |
| D03 ★ | ign-databases; build-oee; db-project; persp-performance | gateway-scope calls need explicit project name (added by this audit) | function | 8.3 | low | system.db.execQuery (project arg name/position) |
| D04 | ign-databases | `system.db.clearNamedQueryCache(path)` | function | 8.x | med | system.db.clearNamedQueryCache |
| D05 | ign-databases | named query param types: value / identifier validated / query-string raw | named query | 8.x | med | Named Queries > Parameter Types |
| D06 | ign-databases | store and forward: memory buffer, database sink, disk cache with max record count, quarantine | feature | 8.x | med | Store and Forward |
| D07 | ign-databases | transaction groups: four group types, "Bypass Store and Forward" option, trigger/handshake | feature | 8.x | med | SQL Bridge > Transaction Groups |
| D08 | db-sql-modify | `system.db.beginTransaction/commitTransaction/rollbackTransaction/closeTransaction`; named query is a single statement | function | 8.x | med | system.db.beginTransaction |
| D09 | db-procs | `createSProcCall(name, db)`, `registerInParam/OutParam/ReturnParam`, `execSProcCall`, `getReturnValue`, `getOutParamValue`, `system.db.INTEGER` | function | 8.x | med | system.db.createSProcCall |
| D10 | db-procs | stored procedure via `execUpdate` with `CALL` (`runPrepUpdate` in 8.1) | function | 8.3 | low | system.db.execUpdate |
| D11 | db-intro; db-operations | default DB ports 1433 / 3306 / 5432; tested databases list | port | 8.3 | high | Platform > Database Connections |
| D12 | build-setup | JDBC URL `jdbc:postgresql://db:5432/meridian`; MariaDB `jdbc:mariadb://...:3306/ignition` | config | 8.x | high | Database Connections |
| **ign-devices / ign-logix-driver / proto-modbus / proto-opc** | | | | | | |
| DV1 ★ | ign-devices; ign-logix-driver; FACTS 7 | Logix driver: Max Concurrent Requests default 2; CIP Connection Size 500 | setting | 8.x | high | OPC UA > Device Drivers > Allen-Bradley > Logix Driver |
| DV2 | ign-logix-driver | Automatic Rebrowse true, Identity Request Frequency 5,000 ms, CIP Connection Timeout 16,000 ms (from 8.1) | setting | 8.1 | low | Logix Driver advanced settings |
| DV3 | ign-logix-driver | Slot Number zero-based, default 0; tag must be Read Only or Read/Write to appear in browse | setting | 8.x | med | Logix Driver |
| DV4 | ign-devices | drivers table: Logix, legacy PCCC, Siemens S7 ("Siemens Enhanced new in 8.3"), Modbus TCP/RTU over TCP | driver | 8.3 | med | OPC UA > Device Drivers |
| DV5 ★ | proto-modbus; FACTS 5 | Modbus driver one-based default (HR1 = 40001); zero-based toggle, word order options, address mapping | setting | 8.x | high | Modbus > Address Mapping |
| DV6 | proto-opc | "Upgrading from 8.1 to 8.3 generates new client and server certificates" | cert | 8.3 | low | OPC UA > Security > Certificates |
| DV7 | proto-opc; net-security | OPC UA default port 4840; Ignition's server 62541 | port | 8.x | high | OPC UA Server settings |
| DV8 | proto-others | DNP3 driver in OPC UA module (new + legacy driver) | driver | 8.3 | low | OPC UA > Drivers > DNP3 |
| **ign-security** | | | | | | |
| SE1 ★ | ign-security | 8.3 Classic (user sources) vs Identity Provider strategies; Designer/Vision use Classic, Perspective uses IdP | security | 8.3 | low | 8.3 > Platform > Security > Authentication |
| SE2 ★ | ign-security | security levels tree like `Authenticated/Roles/Operator`; security zones | security | 8.3 | med | 8.3 > Security Levels / Zones |
| SE3 | ign-security | IdPs not carried over on importing an 8.1 export | upgrade | 8.3 | low | 81to83 upgrade guide |
| SE4 | persp-mobile | roles from IdP; SAML/OIDC option | security | 8.3 | med | Security > Identity Providers |
| **ign-projects** | | | | | | |
| P01 | ign-projects | inheritance, Gateway scripting project, "global parent" holds shared code | project | 8.x | high | Projects > Inheritance |
| **arch-gateway-network** | | | | | | |
| G01 ★ | arch-gateway-network | default listening port 8060 (SSL); changeable | port | 8.x | med | Gateway Network > Settings |
| G02 ★ | arch-gateway-network | 8.3 "Require Two-Way Authentication" on by default; connection policies `ApprovedOnly` (default), `Unrestricted`, `SpecifiedList` | setting | 8.3 | med | 8.3 > Gateway Network > Incoming Connections |
| G03 | arch-gateway-network | "Allow Java Serialization" off on new 8.3 installs, on for upgraded | setting | 8.3 | low | 81to83 upgrade guide |
| G04 | arch-gateway-network | "Allowed Proxy Hops" setting; zero or less means none | setting | 8.x | med | Gateway Network > Proxy |
| G05 | arch-gateway-network | 8.3 gateways connect only to 8.3 or 8.1 gateways; 7.9 must upgrade first | compat | 8.3 | low | 81to83 upgrade guide |
| **arch-*** | | | | | | |
| R01 ★ | arch-redundancy; FACTS 3 | "Failover Timeout" removed in 8.1.37 | setting | 8.1.37 | high | 8.1.37 release notes |
| R02 | arch-redundancy | ping rate, ping timeout, max missed pings; resource Backup version for standby-specific values | setting | 8.3 | low | 8.3 > Redundancy |
| EM1 | arch-eam | 8.3 tasks/agents/archive under Network menu; 8.1 Config > Enterprise Administration; "Agent Recovery removed in 8.3" | menu | 8.3 | low | 8.3 > Enterprise Administration |
| EM2 | arch-eam | 8.3 gateway/Perspective event scripts cannot be Send Project to 8.1 agents | compat | 8.3 | low | EAM > Send Project |
| ED1 ★ | arch-edge | from 8.1.33 Compute, EAM, Sync Services bundled into Edge IIoT and Edge Panel | edition | 8.1.33 | med | Other Editions > Edge |
| ES1 ★ | arch-event-streams; FACTS 6 | Event Streams new in 8.3; source -> filter/transform -> buffer -> handlers; Kafka | module | 8.3 | high | 8.3 > Ignition Modules > Event Streams |
| ES2 | arch-event-streams | batch timer 0 means disabled; error strategy IGNORE shows healthy (forum) | setting | 8.3 | low | Event Streams > Buffer |
| WD1 ★ | arch-webdev | WebDev paths `/system/webdev/<project>/<resource>`; `doGet`/`doPost` | api | 8.x | high | Web Dev > Resources |
| WD2 ★ | arch-webdev | `system.net.httpClient()` factory and `.get()/.post()`; response `.good`, `.json`, `.statusCode`; `httpGet/httpPost` older | function | 8.3 | med | system.net.httpClient |
| WD3 ★ | arch-webdev | `system.secrets.readSecretValue(provider, name)` returns plaintext holder (context manager); "new in 8.3.1" | function | 8.3.1 | low | system.secrets |
| WD4 | arch-containers | 8.3 secrets management in config files | feature | 8.3 | med | 8.3 > Platform > Security > Secrets Management |
| CN1 ★ | arch-containers; build-setup; FACTS 9 | image `inductiveautomation/ignition`, data path `/usr/local/bin/ignition/data`, HTTPS 8043 | docker | 8.3 | high | Docker Image page |
| CN2 | arch-containers | env vars (`ACCEPT_IGNITION_EULA`, `GATEWAY_ADMIN_USERNAME`, `_FILE` secrets), healthcheck `/StatusPing` | docker | 8.3 | med | Docker Image environment variables |
| SF1 | arch-sfc | `system.sfc.startChart("Batches/MixAndFill", params)`; signature to verify | function | 8.x | low | system.sfc.startChart |
| RP1 | arch-reporting | `system.report` package functions for generating files | function | 8.3 | low | system.report |
| MQ1 | arch-mqtt | MQTT Distributor Standard vs Plus connection limits 50 vs 250 | limit | Cirrus | low | docs.chariot.io Distributor |
| MQ2 | arch-mqtt; proto-sparkplug | Transmission = publisher, Engine = subscriber/host creating tags under `[MQTT Engine]Edge Nodes/...`, Distributor = MQTT 3.1.1 broker | module | Cirrus | med | docs.chariot.io modules |
| PA1 | arch-patterns | front-end/back-end scale-out, session affinity | architecture | 8.3 | med | 8.3 > Scale-out Architecture |
| EC1 | arch-ecosystem | module is `.modl`; built against specific SDK/Java; 8.1 module will not load on 8.3 | module | 8.3 | high | Modules > Installing |
| **persp-*** | | | | | | |
| PE1 ★ | persp-events | `system.perspective.sendMessage(messageType, payload, scope)`; scopes view/page/session; default page | function | 8.x | med | system.perspective.sendMessage |
| PE2 ★ | persp-events | session-event handlers not reachable by `perspective.sendMessage`; use `system.util.sendMessage` | function | 8.x | low | sendMessage; Session Events |
| PE3 | persp-events | component script signature `valueChanged(self, previousValue, currentValue, origin, missedEvents)` | scripting | 8.x | med | Perspective > Property Change Scripts |
| PN1 ★ | persp-navigation | `navigate(page=, view=, url=)` priority page > view > url; `params` only with view | function | 8.x | low | system.perspective.navigate |
| PN2 ★ | persp-navigation; persp-mobile; build-faceplate | `openPopup(id, view, params, ...)`, optional `sessionId`, `pageId` | function | 8.x | med | system.perspective.openPopup |
| PL1 | persp-library | `system.tag.getConfiguration(path, False)[0]` returns config dict list | function | 8.x | med | system.tag.getConfiguration |
| PL2 | persp-library; hmi-abnormal; persp-hphmi | `system.alarm.queryStatus` once per screen; args per 8.3 | function | 8.x | med | system.alarm.queryStatus |
| PV1 | persp-views | `system.dataset.toPyDataSet`; `system.perspective.refresh()` is only a quiz distractor (not a real function) | function | 8.x | med | system.dataset |
| PV2 | persp-views | property objects in scripts are not plain Python types (copy with `list()`/`dict()`) | scripting | 8.x | med | Perspective > Scripting > Property types |
| PC1 | persp-charts | components Power Chart, Time Series Chart, XY Chart; Power Chart user-added pens via tag browser | component | 8.x | high | Perspective Components > Charts |
| PC2 | persp-charts | quality aggregate `PctGood` | function | 8.x | low | Historian aggregates |
| PO1 | persp-containers | Flex, Coordinate, Column, Breakpoint, Tab containers | component | 8.x | high | Perspective Components > Containers |
| PS1 | persp-styles | custom theme folder with `config.json` and `index.css`; bundled themes layering changed in 8.3 | file | 8.3 | low | 8.3 > Perspective > Themes |
| PB1 | persp-bindings | binding types, `tag()`, `{value}` transforms, `propConfig` | binding | 8.x | med | Perspective > Bindings |
| PB2 | persp-embedding | Flex Repeater `instances` as list of dicts with `tagPath`; `system.tag.browse` with `{"tagType": "UdtInstance"}` filter | component/function | 8.x | low | Flex Repeater; system.tag.browse |
| **build-*, int-*, mes-*, hmi-*** | | | | | | |
| B01 ★ | build-setup (history) | Maker Edition "arrived with 8.0.14"; Programmable Device Simulator replaced older simulators "in 8.0.8" | version | 8.0 | low (softened) | Release notes |
| B02 | build-setup | device menu "Devices" in 8.3 vs "OPC UA > Device Connections" in 8.1; Programmable Device Simulator | menu | 8.3 | med | Config > OPC UA / Devices |
| B03 | build-motor-udt | access rights / "External Access Read/Write" on UDT members | setting | 8.3 | low | Logix driver; Tag access rights |
| B04 | build-faceplate | view param `tagPath` with input mode; style classes by folder | component | 8.3 | low | Perspective > Views > Parameters |
| B05 | build-alarms-history | Time Series Chart, database historian provider vs Core Historian | module | 8.3 | med | Historian providers |
| B06 | build-oee | Named Query binding on custom property | binding | 8.x | med | Perspective > Named Query Binding |
| M01 ★ | mes-sepasoft; FACTS 4 | MES 4.0 pairs with Ignition 8.3 (4.83.x), 3.x (3.81.x) with 8.1; Settings & Changeover formerly Recipe & Changeover | module | 8.1/8.3 | high | docs.sepasoft.com; Sepasoft downloads |
| M02 ★ | mes-sepasoft | Production Module must be installed to run Batch Procedure, OEE Downtime, Track & Trace, Settings & Changeover, SPC, Document Management | module | MES | med | Sepasoft downloads page |
| M03 ★ | mes-sepasoft; FACTS 4 | no separate Interlocking module; Batch Procedure Permissive Start | module | MES | high | docs.sepasoft.com permissive-start |
| M04 | mes-sepasoft | Sepasoft is IA "Premier Technology Provider"; arch-ecosystem: Cirrus Link "Strategic Partner" | partner | n/a | low | IA partner pages |
| M05 | mes-downtime; mes-oee | short-stop threshold in seconds on equipment state; Planned Downtime type; detection modes | setting | MES | low | OEE Downtime docs |
| M06 | mes-sepasoft | `system.mes.getLineStateHistory` | function | MES | low | Sepasoft scripting functions |
| M07 | mes-erp | Business Connector / Web Services; B2MML mapping | module | MES | med | Sepasoft Business Connector |
| N01 | int-commissioning | tag diagnostics pages in 8.3 manual; browse with `system.tag.browse` | function | 8.3 | med | Status > Tags |
| N02 | net-security | gateway ports 8088/8043/8060/62541 in firewall matrix | port | 8.x | high | Ports |
| X01 | hmi-interaction | Numeric Entry Field input bounds (8.1) vs Form component min/max (8.3) | component | 8.1/8.3 | low | Perspective components |


## Orchestrator notes
- ign-tags: corrected "memory tags forget their value on restart". In Ignition 8, written memory tag values persist with the tag configuration. ★ Verify against the Memory Tags page.
- ign-expressions: `^` is the power operator in the Ignition expression language (bitwise XOR is `xor`). ★ Verify against the Expression Language Syntax page.
- persp-events: Perspective has session-scope message handlers (Session Events > Message), so `system.perspective.sendMessage(..., scope='session')` reaches them. ★ Verify.
