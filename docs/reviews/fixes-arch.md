# Fixes: arch lessons

## arch-gateway-network
- Fixed: listener, example, diagram, pitfalls and quiz 1 now follow the DMZ pattern (plant and corporate both dial out to the DMZ gateway 10.20.250.10; direct HQ link is a documented exception).
- Softened: ping/timeout/missed-ping defaults, 60 s enumeration, two-way-auth default, `gateway.metroSSLPort` name (now "check the manual / parameters page").

## arch-patterns
- Fixed: session affinity explained correctly (sessions live on one front-end, balancer pins clients, failover loses session state); quiz 4, diagram, pitfall and why updated.
- Fixed: one sizing threshold, labelled a rule of thumb tied to IA's sizing guide; licensing sentence corrected with link to {{lesson:ign-licensing}}. Removed uncited 250k/200 device and blog figures.

## arch-remote-services
- Fixed: history example routed through the DMZ gateway; house names; Plant 2 in alarm example.
- Softened: buffer mechanics, 8.1/8.3 setting names; forum claim now linked in place.

## arch-eam
- Fixed: "or the reverse" replaced by DMZ outbound-only connections.
- Softened: 60-minute Collect Backup timeouts, menu path, failover task behavior, pre-8.1 restore claim.

## arch-redundancy
- Fixed: example uses plan addresses (10.20.30.10/.11, PLC1, SQL .20); added SFC/EAM/Perspective failover sentence.
- Softened: warm-standby upgrade advice, ping/recovery/history setting names; dropped the 10,000 ms default.

## arch-edge
- Fixed: add-on module contradiction (fixed module set per edition; MQTT Transmission side may run on Edge; no DB/Reporting/SFC/SQL Bridge/Event Streams); unclear "central gateway" clause.
- Softened: session limits, tag/device limits, history window, licensing and 3-day window claims.

## arch-mqtt
- Fixed: Cirrus Link ownership (vendor builds and supports; IA price list does not move support), matched in arch-ecosystem; house Sparkplug mapping (Plant1 / Area10_Line1 / M101 / Sts/Running); named STATE topic.
- Softened: best-effort claim, STATE topic version note.

## arch-reporting
- Fixed: six-field Quartz cron explained; cross-reference now points to arch-patterns.
- Softened: system.report and Report Viewer names.

## arch-sfc
- Fixed: removed timing number; house names (M101, LT101 path); failover sentence added; safety-standards wording; unclear start clause.
- Softened: End-step, leftmost-transition and action options rules.

## arch-notification
- Fixed: added SMS acknowledgement explanation (objective 3).
- Softened: call-spacing advice, defaults, roster order, 7.x history.

## arch-event-streams
- Fixed: Kafka consumer example (4 partitions: 3 consumers = 2/1/1, fifth idle); Edge statement now cites IA Event Streams docs, in the lesson and quiz; house tag paths.
- Softened: buffer defaults removed in favor of the manual.

## arch-containers
- Fixed: compose has top-level `secrets:` with `file:`, 8043 published (8060 noted), gateway healthcheck, restart policy; docker run bind-mounts the secret file.
- Softened: `/StatusPing` and curl in image flagged to confirm.

## arch-webdev
- Fixed: doPost excludes bool, accepts long, checks `q[0].isGood()` and returns 503, names Document tag type; secrets call corrected (returns plaintext holder, two args, 8.3.1+); httpClient attribute names confirmed against manual; house tag names.

## arch-ecosystem
- Fixed: Cirrus Link support wording matches arch-mqtt; 8-of-14 labelled author's rule of thumb.
- Softened: Java version, Embr lineage, Sepasoft partner status.

## Rejected
- None outright. Reviewer claim that Edge cannot run Cirrus Link modules was not accepted as written; Transmission on Edge is kept with a verify note.
