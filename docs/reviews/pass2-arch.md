## Persona
Ignition solutions architect who designs multi-site, redundant, MQTT-based enterprise systems: Gateway Network, EAM, redundant pairs, Edge at remote sites, Sparkplug/Cirrus Link, reporting, SFC, alarm notification and event streams. Judges against HOUSE_STANDARD (Meridian Foods IP plan, DMZ pattern, ISA-95 naming, Sparkplug mapping) and FACTS.

## Per-lesson findings
### arch-remote-services
- **[med] [consistency]** "On HQ, set Service Security so `PLANT-A` may store to `HQ_Hist`." and "On PLANT-A, add a Remote Historian pointing at HQ's `HQ_Hist`" → This is a direct plant-to-HQ Gateway Network link. HOUSE_STANDARD §4 makes every connection end in the DMZ (site gateway and corporate gateway each connect outbound to the DMZ gateway 10.20.250.10). Route the example through the DMZ, or name it explicitly as the documented exception.
- **[med] [accuracy]** "Data is buffered locally (memory, then disk) when the destination is unreachable" → Buffer mechanics (memory then disk, forward order) are not sourced. Cite the 8.3 Remote Historian/store-and-forward page, or mark "(verify)".
- **[low] [accuracy]** "The 8.1 manual calls these Remote History Providers, and the Internal Historian has a Remote Sync setting." → Menu/setting names are unsourced. Add "(verify)" or link the page.
- **[low] [clarity]** "A forum discussion makes this point that the buffer lives on the source gateway" → Forum claim is uncited in the body. Link the thread at that point rather than only in resources.

### arch-eam
- **[med] [accuracy]** "In 8.3, Collect Backup waits up to 60 minutes for the agent to produce the backup and up to another 60 for the transfer." → Specific timeouts with no citation (HOUSE_STANDARD §7). Cite the 8.3 backup-and-restore page or write "check the manual for your version".
- **[med] [consistency]** "Create outgoing connections from each plant to the controller, or the reverse, and approve them." → "Or the reverse" implies a direct path from HQ into plant gateways, which is not the default under HOUSE_STANDARD §4. Say plant gateways connect outbound to the DMZ gateway and the controller reaches them through it.
- **[low] [accuracy]** "In 8.3, tasks, agents and archive are in the controller's **Network > Enterprise** section" and "Scheduled tasks on a master controller pause during failover and resume when it returns." → Navigation path and failover behavior are unsourced. Mark "(verify)".
- **[low] [accuracy]** "restoring a backup made before Ignition 8.1 onto an 8.3 gateway is not supported" → Plausible but unsourced. Cite or mark "(verify)".

### arch-redundancy
- **[med] [consistency]** "Master `gw-a` at 10.10.1.11 and backup `gw-b` at 10.10.1.12 both connect to PLC 10.10.5.20 and a database at `db1`." → Off-plan addressing. HOUSE_STANDARD §3 puts Ignition master/backup at 10.20.30.10/.11, PLC1 at 10.20.10.10 and SQL at 10.20.30.20. Use the plan addresses, or say in one sentence that the example is deliberately different.
- **[med] [accuracy]** "Ignition's own upgrade guidance for patching a pair recommends warm standby on both." → Unsourced claim about IA guidance. Cite the page or soften to "check the upgrade guide for your version".
- **[med] [accuracy]** "Ping Rate**, **Ping Timeout** and **Ping Max Missed**" and "Recovery Mode ... *Automatic* ... *Manual*" and "History Mode ... *Partial*: the backup caches history until the master returns, then reconciles" → Setting names and semantics are unsourced. Mark "(verify)" or cite the 8.3 redundancy settings page.
- **[low] [accuracy]** "(default 10,000 ms) that was removed in 8.1.37" → FACTS #3 verifies the removal only, not the default. Drop the default number or cite it. The same number repeats in the History block.
- **[low] [missing]** "Failover time is the sum of detection, takeover and recovery." → No mention that running SFC charts, EAM scheduled tasks and Perspective sessions behave differently across a pair switch. Add one sentence pointing to arch-sfc and arch-eam.

### arch-edge
- **[high] [consistency]** "No database connectivity and no add-on modules. You cannot run Reporting, SFC or the SQL Bridge module on Edge" → Contradicts the same lesson: the Edge IIoT row says "publish with MQTT", and "Edge can also act as an MQTT edge node using the Cirrus Link modules". Rewrite the bullet: no database, no Reporting/SFC/SQL Bridge, and add-on modules limited to what each edition supports (verify which Cirrus Link modules are allowed).
- **[med] [accuracy]** "Perspective with two sessions, or Vision with one local and one remote client" / "unlimited tags and device connections" / "The tag history window was extended in 8.1.35" → Specific limits and version notes with no citation (HOUSE_STANDARD §7). Cite the 8.3 Edge limits page at the point of use, or write "check the manual for your version".
- **[med] [missing]** The "No database connectivity" list omits Event Streams, which FACTS #6 says are not supported on Edge. Add it to the list so arch-event-streams and this lesson agree.
- **[low] [clarity]** "and Edge cannot be installed on a central gateway." → Ambiguous. Say an Edge node cannot act as the central hub, or drop the clause.
- **[low] [accuracy]** "Total licensing is 50 small Edge licenses plus one standard gateway" and "a local history window comfortably covers 3 days" → Licensing and window sizing are unsourced. Mark "(verify)".

### arch-mqtt
- **[high] [consistency]** "Ignition itself sells and supports them, but the module documentation lives with Cirrus Link" → Contradicts arch-ecosystem ("The vendor builds and supports it"; quiz answer "The vendor, because the module is their product"). State the verified arrangement once and make both lessons match (verify who sells and who is the first support contact).
- **[med] [consistency]** "Edge Nodes/PlantA/Line1_Gateway/Filler/Speed" and "Edge Nodes/Bottling/Site2/Filler/Pressure" → HOUSE_STANDARD §2 maps Sparkplug as group `Plant1`, edge node `Area10_Line1`, device `M101`, metric `Sts/Running`. Use the house mapping so the tag path matches the Motor UDT examples used elsewhere.
- **[low] [accuracy]** "a retained **STATE** message ... on a topic that edge nodes can watch" → No topic given. Name the Sparkplug STATE topic (`spBv1.0/STATE/<host_id>` in Sparkplug v3, verify) so students can subscribe to it.
- **[low] [accuracy]** "Cirrus Link documents that this is best effort." and "50 versus 250 in Cirrus Link's published figures" → Vendor claims; the 50/250 figures are already hedged. Mark the best-effort claim "(verify)" with a link.

### arch-reporting
- **[low] [clarity]** "A report schedule uses cron format" with `0 0 6,14,22 * * ?` → That is a six-field, seconds-first expression, not the 5-field cron used elsewhere in the curriculum. Say "six-field Quartz-style cron (verify)" and explain the `?` placeholder.
- **[low] [accuracy]** "Scripts can call the report-execution functions in the `system.report` package" and "a **Report Viewer** component" → Names unsourced. Mark "(verify)" or link the 8.3 scripting page.
- **[low] [consistency]** "Move reports to a separate gateway on large systems (see {{lesson:arch-remote-services}})." → arch-remote-services does not discuss placing reports. Point to arch-patterns, or explain the reference.

### arch-sfc
- **[med] [accuracy]** "runs in the Gateway's JVM on the order of tens or hundreds of milliseconds" → Uncited timing number (HOUSE_STANDARD §7). Remove it, or say that Gateway timing is not deterministic and must be measured on the site.
- **[med] [consistency]** "The chart writes `Line1.Cmd.Run = 1` and waits for `Line1.Sts.Running = 1`" and "`[default]Tank1/Level`" → HOUSE_STANDARD §2 uses `M101.Cmd.Start` / `M101.Sts.Running` and `[default]Plant1/Area10/Line1/M101/...`. Use house names, or add the one-sentence "different example on purpose" note the standard requires.
- **[med] [missing]** "A Gateway restart, a patch, a lost connection or a scripting error stops the chart." → No mention of a redundant-pair failover (arch-redundancy). Add: what happens to a running instance on the active node when the backup takes over, and whether it resumes.
- **[low] [accuracy]** "Standards like IEC 62061 and ISO 13849 expect protective functions in suitably rated hardware." → Overstated. These standards require a suitably rated safety function (safety PLC or safety-rated logic), not specific hardware. Reword to "a suitably rated safety function, not a general-purpose Gateway".
- **[low] [accuracy]** "End steps can't be inside parallel sections", "the leftmost true one wins", and "can be set to run on start, on stop or on a timer" → Unsourced SFC rules. Mark "(verify)".
- **[low] [clarity]** "Charts are started with a script or, for charts marked for it, from the gateway." → Unclear mechanism. Name the setting or delete the second clause.

### arch-notification
- **[med] [missing]** Objective 3: "Explain how acknowledgment by phone or SMS works with Twilio" → The body only explains voice acknowledgement (public hostname, PIN). SMS "ack by reply" appears only in the table and is never explained. Add a short SMS subsection covering the reply path and whether it needs an inbound route.
- **[med] [accuracy]** "The manual advises at least a second between calls for most phone systems." and "defaults to zero" and "This defaults to on for voice in the manual." → Specific defaults and advice with no citation (HOUSE_STANDARD §7). Cite the Twilio profile page or mark "(verify)".
- **[low] [accuracy]** "Notification block ... SMS and voice work through contacts one at a time, in roster order." → Behavior unsourced. Mark "(verify)".
- **[low] [accuracy]** "since the 7.x line (the 7.9 manual documents pipelines and escalation)" → Version history uncited. Mark "(verify)" or drop.

### arch-event-streams
- **[high] [accuracy]** "Add a third consumer to `historian-writer` and one sits idle until you add partitions." → Wrong for the stated setup. With four partitions, three consumers take 2/1/1 and none is idle. Fix: "With four partitions, three consumers share them 2/1/1. A fifth consumer would sit idle."
- **[med] [accuracy]** "**Debounce** (default 100 ms)", "**Max wait** (default 1000 ms)", "**Max queue size** (default 0, meaning unlimited)" → Specific defaults with no citation (HOUSE_STANDARD §7). Cite the 8.3 buffer settings page or mark "(verify)".
- **[med] [consistency]** "The Chariot (Cirrus Link) documentation states that event streams are not available on Ignition Edge." (also quiz 4 explanation: "The Chariot 8.3 documentation states...") → FACTS #6 attributes this to the Inductive Automation 8.3 Event Streams docs. Cite that source; keep Chariot only if it also says so (verify).

### arch-ecosystem
- **[med] [consistency]** "Strategic Partners and Premier Technology Providers are recognized by Inductive Automation." (with the Cirrus Link row) → Vendor-support framing conflicts with arch-mqtt; see cross-lesson issue 1.
- **[low] [clarity]** "A score under 8 out of 14 for a module that sits on the critical path is a reason to choose a different design" → The threshold is a teaching heuristic, not a standard. Label it as the author's rule of thumb.
- **[low] [accuracy]** "Java also moved from 11 to 17 along the way" → Unsourced version detail. Cite or mark "(verify)".
- **[low] [accuracy]** "Embr (from Musson Industrial) ... succeeding an earlier charting module from a different developer" and "Sepasoft ... A Premier Technology Provider" → Vendor-status and product-lineage claims unsourced. Mark "(verify)".

## Cross-lesson issues
1. **[high] Support ownership of Cirrus Link modules.** arch-mqtt says "Ignition itself sells and supports them"; arch-ecosystem says the vendor builds and supports them, and partner status "does not transfer support responsibility". One of these is wrong or incomplete. Verify the current sales and support arrangement and make both lessons say the same thing.
2. **[high] Edge module boundary.** arch-edge says Edge has "no add-on modules" but also says Edge can publish MQTT via Cirrus Link; arch-mqtt says Transmission runs on "Edge or site gateway"; arch-event-streams says event streams are not on Edge. Settle one rule (which modules run on Edge) and apply it in all three.
3. **[med] DMZ and addressing vs HOUSE_STANDARD.** arch-remote-services (direct plant-to-HQ link), arch-eam ("or the reverse") and arch-redundancy (10.10.x addresses) all conflict with HOUSE_STANDARD §3–§4. Route the examples through the DMZ and use the plan addresses, or mark each as a deliberate exception.
4. **[med] Naming vs house UDT and Sparkplug mapping.** arch-mqtt (Sparkplug tag path) and arch-sfc (`Line1.Cmd.Run`, `Tank1/Level`) do not use HOUSE_STANDARD §2 names. A student who learns from these will not match the Motor UDT used in the rest of the track.
5. **[med] Uncited numbers across the track.** EAM 60-minute timeouts, Edge session and history limits, event stream buffer defaults, notification call spacing and SFC timing all break HOUSE_STANDARD §7. Cite each at the point of use or add "check the manual for your version".
6. **[low] Gap at redundancy failover.** arch-redundancy, arch-sfc and arch-eam each describe a Gateway switch without saying what running charts, scheduled EAM tasks or event stream buffers do across it. One short cross-reference sentence in each would close the gap.
7. **[pass] Cross-references.** All `{{lesson:...}}` targets in these ten files resolve to existing lesson files. All quiz `answer` indices point at the correct option, and the explain arrays are aligned.

## One-line verdict
Well-built lessons with correct quiz keys, but the Edge and Cirrus Link support contradictions, the Kafka consumer example error, DMZ and naming departures from HOUSE_STANDARD, and many uncited numbers should be fixed before publish.
