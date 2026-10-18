LC.lesson({
  id: "net-timesync",
  title: "Time synchronization and sequence of events",
  track: "net",
  minutes: 20,
  level: 3,
  prereqs: ["net-routing"],
  tags: ["ntp", "ptp", "cip-sync", "soe", "timestamps", "utc", "dst"],
  summary: "Every alarm, historian row and trip report depends on clocks agreeing. Learn how plant time is distributed, where it drifts, and how to rebuild the true order of events.",
  objectives: [
    "Explain why timestamps from different devices must be on one clock before you can trust their order",
    "Describe an NTP hierarchy for Plant 1 using the DMZ as the plant time source",
    "Say when NTP is enough and when you need PTP or CIP Sync",
    "Identify which clock stamps a value in a PLC, an OPC UA tag, an Ignition alarm and a historian row",
    "Store time in UTC and avoid the daylight saving traps in displays and reports",
    "Work out the real order of events from timestamps that disagree"
  ],

  body: `
## Why timestamps matter

When a pump trips and the line goes down, the first question is "what happened first?" Alarm journals, the historian, controller fault logs and drive event logs all answer with timestamps. If the clocks behind those stamps disagree, the answer is wrong, and you will blame the wrong device. Time sync is invisible when it works and expensive when it does not. It also underpins audit trails, batch records, regulatory data and any join between data from two sources.

## Where timestamps come from

The same event can carry several timestamps, from different clocks:

| Where | Clock | Notes |
|---|---|---|
| **Field input module** | Module clock, or system time from CIP Sync | Best case: stamped at the physical transition with a synchronized clock |
| **PLC program** | Controller wall clock | You can read it in logic (in Logix with GSV from the WallClockTime object) and stamp your own events |
| **Device driver / OPC UA server** | Source timestamp from the device or the server's own clock | OPC UA values carry a source and a server timestamp |
| **Ignition Gateway** | Gateway operating system clock | Stamps values received, and sets alarm times depending on the Timestamp Source setting |
| **Database server** | SQL server clock | Rows can be stamped by the database as well as by Ignition |
| **Browser / client** | Client clock and time zone | Only used for display |

Ignition alarms have a **Timestamp Source** setting. It chooses between the time the gateway generated the event and the timestamp carried by the triggering value, such as the one from the OPC server. Choose it on purpose. If the PLC clocks are well synchronized, the value timestamp is closer to the physical event. If they are not, the gateway timestamp gives one consistent (but later) clock for the whole plant.

## NTP in the plant

{{term:ntp|NTP}} (Network Time Protocol) is the workhorse. A client asks a server for the time over UDP port 123, measures the round-trip delay, and slews its clock toward the answer. Servers are organized in {{term:ntp-stratum|strata}}. Stratum 0 is a reference clock such as GPS or an atomic source. A server synced directly to it is stratum 1, a server synced to that is stratum 2, and so on. Stratum counts hops from the reference and is not a quality score by itself.

NTP over a LAN typically holds clocks to within a few milliseconds, and over the public internet it is much looser. That is enough for minute-level logs and most alarm journals. It is not enough to put two events 5 ms apart in the right order.

### A time plan for Plant 1

{{diagram:hierarchy}}

The house network plan sends every conversation between Level 3 and Level 4 through the DMZ (VLAN 250, 10.20.250.0/24). Time follows the same rule.

1. Install one **plant time server** in the DMZ. In this example it is a GPS-disciplined appliance at \`10.20.250.40\` (illustrative address, in the DMZ subnet). If you cannot mount a GPS antenna, the DMZ server can instead take time from the corporate NTP server at Corporate (\`10.100.0.0/16\`), with the DMZ firewall allowing only that one UDP 123 flow.
2. Level 3 servers (Ignition master \`10.20.30.10\`, backup \`.11\`, SQL \`.20\`) use the DMZ server as their time source. Firewall rule: UDP 123 from VLAN 30 to \`10.20.250.40\` only.
3. Control-network devices (PLC1 \`10.20.10.10\`, PLC2 \`.11\`, drives and managed switches) use the same source, or they take time from a CIP Sync grandmaster that itself follows it (see below).
4. HMI clients and engineering workstations (VLANs 20 and 50) use the DMZ server or the domain hierarchy. In a Windows domain, make sure the top of the domain's time chain points at the plant source, not an internet pool.
5. Configure **two** sources where the device supports it, so one failure does not leave a clock free-running.

Allowed flows are specific: no device in VLAN 10 should reach the internet to find a time server. An open NTP path from the control network to an external pool is an exposure, and a plain pool server is not a reliable source in a plant without internet access.

## PTP and CIP Sync

When you need events ordered to the microsecond or millisecond across devices, NTP's network jitter is the limit. {{term:ptp|PTP}} (IEEE 1588) fixes this by timestamping packets in the hardware of the network port, and by having switches correct for their own delay. One device is elected the {{term:grandmaster-clock|grandmaster}}. Everyone else follows it.

{{term:cip-sync|CIP Sync}} is Rockwell's implementation of IEEE 1588 for EtherNet/IP. It defines a Time Sync object and gives ControlLogix controllers, EtherNet/IP modules and CIP I/O a shared system time, available as UTC or Coordinated System Time. Rockwell's Studio 5000 documentation lists possible grandmasters, including an IEEE 1588 V2 capable switch, a GPS-based grandmaster, a 1756-EN2X module with suitable firmware, or a ControlLogix or GuardLogix controller with firmware V18 or later. CIP Sync works over EtherNet/IP and the ControlLogix backplane only. Note that the validity bit alone does not prove time-dependent operations are ready; verify the grandmaster as the manual instructs.

| Need | Use | Typical accuracy |
|---|---|---|
| Logs, alarm journal, reports | NTP | milliseconds to tens of milliseconds |
| Ordering fast events, SOE, coordinated motion | PTP / CIP Sync | well under a millisecond |
| Legal or billing time | GPS-disciplined source plus NTP, audited | per the requirement |

PTP needs network support: managed switches that handle PTP, and a plan for the grandmaster. A plant that adds SOE modules usually creates a small PTP domain in the control VLAN, with a GPS grandmaster, and still uses NTP elsewhere.

## Time zones, UTC and DST

Store timestamps in {{term:utc|UTC}}, convert for display. Ignition's tag historian stores the timestamp as epoch milliseconds, which has no time zone in it. DateTime tag values are UTC-based. Where the time zone matters is the display: Perspective components can show the browser or session time zone, or the gateway time zone. A table of alarms read by a Chicago operator and a viewer at Corporate in another zone will show different clock times for the same moment. That is correct, so label the zone on the screen.

{{term:daylight-saving-time|Daylight saving time}} causes three classic bugs:

- **The repeated hour in fall.** 01:30 happens twice. Data stored with local time cannot tell the two apart.
- **The missing hour in spring.** 02:30 never exists. A shift report that sums "24 hours" may sum 23 or 25.
- **Controllers and servers that apply DST differently.** A PLC set to local time with DST on, and a server on UTC, agree for half the year.

Rules: run servers and databases on UTC or a fixed zone, keep PLC time zones documented, aggregate by UTC or by a defined production day, and test the Sunday of the change in a lab.

## Sequence of events

{{term:sequence-of-events|Sequence of events (SOE)}} is a data-capture method for fast events: breaker trips, safety chain operations, power system disturbances. A normal scan-based input has a resolution of one PLC scan (and a driver poll), so two events that happen 3 ms apart can look simultaneous. An SOE input module timestamps each transition itself, on a synchronized clock.

Rockwell's 1732E ArmorBlock SOE modules illustrate the design. Each input gets its own timestamp for ON and OFF, using a 64-bit system time with microsecond resolution that comes from the module's master clock via CIP Sync. The module is a PTP slave, so another device on the network must be the master clock. The stamp is taken at the initial transition, before input filtering. The module returns the event records in a buffer for the controller to read. Diagnostic events such as open wire are not timestamped. Check the module manual for buffer sizes and modes.

The controller or Ignition then merges records from all modules and sorts by timestamp. The sort is only as good as the clock agreement between modules.

## A worked example: alarms out of order

At Meridian Foods Plant 1, Area10 has two PLCs. PLC1 (\`10.20.10.10\`) has a good clock. PLC2 (\`10.20.10.11\`) was set by hand at commissioning and was never synced. A 20 ppm crystal gains about 1.7 seconds a day (20 × 10⁻⁶ × 86,400 s). After about a day and a half, PLC2 runs 2.4 seconds fast.

At true time 14:03:10.5 pump P101, on PLC2's I/O, trips on overload. Suction pressure falls and at 14:03:11.2 the low-low alarm on PLC1 fires. The alarms use the value timestamp as their source.

| Event | PLC | True time | Recorded time |
|---|---|---|---|
| P101 overload (cause) | PLC2, +2.4 s | 14:03:10.5 | 14:03:12.9 |
| Suction low-low (effect) | PLC1, correct | 14:03:11.2 | 14:03:11.2 |

{{diagram:order}}

The journal sorted by time shows the low-low alarm first and the overload second. The operator concludes that low suction killed the pump, and the maintenance ticket goes to the supply side. In truth the pump tripped and then suction collapsed.

How to catch it: compare the PLC wall clock with the gateway clock. A simple tag \`[default]Plant1/Diagnostics/PLC2/ClockOffsetMs\` that holds (PLC time minus gateway time) will show 2,400 ms and can alarm at, say, 500 ms. How to fix it: sync PLC2 from the plant time source (NTP in the module or CIP Sync from a grandmaster), and set a diagnostic alarm so drift is noticed within a day.

Until all clocks are fixed, switch the alarms' Timestamp Source to the gateway clock. Order becomes consistent, but sub-second order will reflect arrival at the gateway.

> [!tip] Make drift visible
> Monitor each controller's clock offset to the gateway on a schedule, store it in the historian, and alarm on a threshold chosen for your accuracy need. A drift trend that creeps up each day tells you a device has lost its time source long before it matters.

> [!note] In 8.1
> Alarm Timestamp Source and Perspective time zone handling exist in 8.1 and 8.3 documentation. Check the manual for your version for the exact property names.
`,

  eli5: `
Imagine five friends each timing a race with their own wristwatch. Nobody set their watch from the same place, so one is a couple of seconds fast and another is a bit slow. When they compare notes, Anna says the red car crossed the line at 12:00:05, but Ben says the blue car crossed at 12:00:04. You would say blue won, even though red was actually first, because Anna's watch was running fast.

A factory has the same problem. Each controller, each server and each sensor card has its own watch. When something breaks, the first job is to put all the events in order. If the watches disagree, the order is wrong, and you blame the wrong machine.

Fixing it is like handing everyone a copy of one master clock every few minutes. That is NTP. For races where milliseconds matter, you use a stopwatch at the finish line that everyone checks against the same signal many times per second. That is the precise version, PTP.

Finally, don't write down "3 o'clock" and forget which city you were in. Write down one world time and change it to local time only when you show it to a person.
`,

  why: `
**Why does order matter more than the exact time?** Almost nobody needs to know that a pump tripped at exactly 14:03:10.5. They need to know it tripped *before* the low pressure alarm. Relative order is what root cause analysis uses. A consistent clock that is wrong by a minute is much safer than clocks that each drift by seconds in different directions.

**Why UTC for storage?** Local time is a display format. It has a repeated hour, a missing hour, and it changes by region. A stored UTC value is unambiguous and sorts correctly. The cost is a conversion at the screen. Teams that store local time save a little effort at first and pay for it at every autumn DST change.

**Why does the DMZ own plant time?** The same reasoning as other plant services: one controlled source, one firewall rule, no direct path from the control network to the internet or to the corporate network. If every PLC goes to the internet for time, you have punched holes in the zone model. If every device uses a different source, you have clock disagreement. A single plant source solves both. The tradeoff is that the DMZ server is critical. Use two sources and monitor it.

**Why not run PTP everywhere?** It needs PTP-aware switches, a designed grandmaster, and operational knowledge. Most data does not need it. Experienced integrators argue about whether the gateway clock or the device clock should win for alarms. The device value timestamp is closer to the physical event if devices are synced. The gateway timestamp is consistent even when devices are not. The right answer depends on whether you trust your device clocks, and the way to earn that trust is to measure their offsets.

**Why SOE modules at all?** Scan-based logic cannot order events that happen between scans. For a power system or safety trip investigation the order in a few milliseconds is the whole point.
`,

  history: `
NTP is one of the oldest protocols still in use on the internet, developed by David Mills in the 1980s. IEEE 1588, the Precision Time Protocol, was first published in 2002 and revised in 2008 (version 2). Industrial automation adopted it for motion control and for SOE. Rockwell built CIP Sync on top of IEEE 1588 so that Logix controllers and I/O could share a system time. Earlier SOE systems used dedicated cabling for a time signal such as IRIG-B to reach each recorder.
`,

  examples: [
    {
      title: "Which clock stamped this alarm?",
      body: `An Ignition alarm on M101's overload shows 14:03:12.9. Look at the alarm's Timestamp Source. If it is set to the value timestamp, the time came from PLC2 through the OPC UA driver, and PLC2's clock is in play. If it is set to the gateway time, the time is when the gateway generated the event, which includes polling delay. Neither is "wrong". They answer different questions, so know which one you configured before comparing.`
    },
    {
      title: "Daylight saving and a daily report",
      body: `A daily production report runs from 00:00 to 24:00 Chicago time. On the fall-back Sunday that day has 25 hours, and on the spring-forward Sunday it has 23. If the query uses "start + 24 hours" it misses an hour in November or includes an hour of the next day. Build the window from midnight to next midnight in the plant time zone, convert both ends to UTC, and query on UTC.`
    }
  ],

  diagrams: {
    hierarchy: `<svg viewBox="0 0 640 330" role="img" aria-label="Plant time distribution: a GPS reference feeds a DMZ time server at 10.20.250.40, which serves Level 3 servers, the control VLAN with PLCs, and HMI and engineering VLANs over UDP 123, with corporate NTP as a fallback source">
  <defs>
    <marker id="net-timesync-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="24">Plant 1 time distribution</text>
  <rect class="dg-box" x="40" y="40" width="180" height="48" rx="6"/>
  <text class="dg-text-sm dg-mid" x="130" y="62">GPS reference</text>
  <text class="dg-text-muted dg-mid" x="130" y="78">stratum 0</text>
  <rect class="dg-box" x="420" y="40" width="190" height="48" rx="6"/>
  <text class="dg-text-sm dg-mid" x="515" y="62">Corporate NTP (fallback)</text>
  <text class="dg-text-muted dg-mid" x="515" y="78">Level 4, 10.100.0.0/16</text>
  <rect class="dg-box-accent" x="190" y="120" width="260" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="142">DMZ plant time server</text>
  <text class="dg-text-mono dg-mid" x="320" y="162">10.20.250.40 (stratum 1)</text>
  <line class="dg-line" x1="130" y1="88" x2="230" y2="118" marker-end="url(#net-timesync-ah)"/>
  <line class="dg-line dg-dash" x1="515" y1="88" x2="410" y2="118" marker-end="url(#net-timesync-ah)"/>
  <rect class="dg-box" x="20" y="240" width="190" height="64" rx="6"/>
  <text class="dg-text-sm dg-mid" x="115" y="262">L3 VLAN 30</text>
  <text class="dg-text-mono dg-mid" x="115" y="280">Ignition .10 .11, SQL .20</text>
  <text class="dg-text-muted dg-mid" x="115" y="296">stratum 2, NTP</text>
  <rect class="dg-box" x="225" y="240" width="190" height="64" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="262">Control VLAN 10</text>
  <text class="dg-text-mono dg-mid" x="320" y="280">PLC1 .10, PLC2 .11</text>
  <text class="dg-text-muted dg-mid" x="320" y="296">NTP or CIP Sync</text>
  <rect class="dg-box" x="430" y="240" width="190" height="64" rx="6"/>
  <text class="dg-text-sm dg-mid" x="525" y="262">VLANs 20 and 50</text>
  <text class="dg-text-mono dg-mid" x="525" y="280">HMI, engineering</text>
  <text class="dg-text-muted dg-mid" x="525" y="296">NTP</text>
  <line class="dg-line" x1="250" y1="176" x2="115" y2="238" marker-end="url(#net-timesync-ah)"/>
  <line class="dg-line" x1="320" y1="176" x2="320" y2="238" marker-end="url(#net-timesync-ah)"/>
  <line class="dg-line" x1="390" y1="176" x2="525" y2="238" marker-end="url(#net-timesync-ah)"/>
  <text class="dg-text-muted" x="40" y="212">UDP 123, one allowed flow per VLAN</text>
</svg>`,
    order: `<svg viewBox="0 0 640 260" role="img" aria-label="Timeline from 14:03:10 to 14:03:14. True order: overload at 10.5 then low-low at 11.2. Recorded order: low-low at 11.2 then overload at 12.9 because PLC2 runs 2.4 seconds fast">
  <text class="dg-title" x="20" y="24">True order</text>
  <line class="dg-line" x1="60" y1="70" x2="600" y2="70"/>
  <circle class="dg-fill-alarm" cx="120" cy="70" r="7"/>
  <text class="dg-text-sm dg-mid" x="120" y="50">P101 overload</text>
  <circle class="dg-fill-warn" cx="204" cy="70" r="7"/>
  <text class="dg-text-sm" x="214" y="100">Suction low-low</text>
  <text class="dg-title" x="20" y="136">As recorded (PLC2 clock +2.4 s)</text>
  <line class="dg-line" x1="60" y1="180" x2="600" y2="180"/>
  <circle class="dg-fill-warn" cx="204" cy="180" r="7"/>
  <text class="dg-text-sm dg-mid" x="204" y="160">Suction low-low</text>
  <circle class="dg-fill-alarm" cx="408" cy="180" r="7"/>
  <text class="dg-text-sm dg-mid" x="408" y="160">P101 overload</text>
  <line class="dg-line-thin" x1="60" y1="215" x2="600" y2="215"/>
  <line class="dg-line-thin" x1="60" y1="210" x2="60" y2="220"/>
  <line class="dg-line-thin" x1="180" y1="210" x2="180" y2="220"/>
  <line class="dg-line-thin" x1="300" y1="210" x2="300" y2="220"/>
  <line class="dg-line-thin" x1="420" y1="210" x2="420" y2="220"/>
  <line class="dg-line-thin" x1="540" y1="210" x2="540" y2="220"/>
  <text class="dg-text-sm dg-mid" x="60" y="238">:10</text>
  <text class="dg-text-sm dg-mid" x="180" y="238">:11</text>
  <text class="dg-text-sm dg-mid" x="300" y="238">:12</text>
  <text class="dg-text-sm dg-mid" x="420" y="238">:13</text>
  <text class="dg-text-sm dg-mid" x="540" y="238">:14</text>
  <text class="dg-text-muted" x="20" y="254">Seconds past 14:03. The cause appears after its effect.</text>
</svg>`
  },

  pitfalls: [
    "Setting a controller clock by hand at commissioning and never syncing it. Drift builds up silently.",
    "Letting PLCs and servers reach external internet NTP pools directly instead of the plant source.",
    "Storing local time in the database, then getting a repeated or missing hour twice a year.",
    "Comparing timestamps from value-timestamp alarms and gateway-timestamp alarms as if they shared a clock.",
    "Assuming NTP is accurate enough to order events a few milliseconds apart.",
    "Treating a CIP Sync valid bit as proof that the grandmaster is correct.",
    "Building a 'daily' report window as start plus 24 hours."
  ],

  keyTerms: ["ntp", "ntp-stratum", "ptp", "cip-sync", "grandmaster-clock", "sequence-of-events", "clock-drift", "daylight-saving-time", "utc", "timestamp-source"],

  quiz: [
    {
      q: "Two alarms sorted by timestamp show the effect before the cause. What should you check first?",
      options: ["Whether the historian is full", "Whether the alarm priorities are wrong", "Whether the two sources' clocks agree", "Whether Perspective is using the browser time zone"],
      answer: 2,
      explain: [
        "Storage capacity does not reorder timestamps.",
        "Priority affects display importance, not time order.",
        "Correct. Clock offset between the devices (or between devices and gateway) is the likely cause.",
        "A display time zone shifts all values by the same amount and keeps the order."
      ]
    },
    {
      q: "In the Plant 1 plan, how does a Level 3 Ignition server get its time?",
      options: ["From the DMZ plant time server over UDP 123", "Directly from an internet NTP pool", "From PLC1", "By manual setting every month"],
      answer: 0,
      explain: [
        "Correct. Time follows the same DMZ rule as other traffic: one controlled source, one narrow firewall rule.",
        "This bypasses the DMZ and relies on internet access from the plant network.",
        "PLCs are not a general time source for servers in this design.",
        "Manual setting is how drift starts."
      ]
    },
    {
      q: "You need to order two input transitions 2 ms apart from different I/O blocks. What do you use?",
      options: ["NTP on every device", "Faster PLC scan time", "A longer alarm deadband", "SOE input modules on a PTP / CIP Sync time base"],
      answer: 3,
      explain: [
        "NTP accuracy is not tight enough for this.",
        "Even a fast scan quantizes events to scan boundaries and cannot fix clock offset between blocks.",
        "A deadband changes alarm behavior, not timestamp resolution.",
        "Correct. Modules stamp the transition itself on a clock shared through PTP."
      ]
    },
    {
      q: "Why store timestamps in UTC?",
      options: ["UTC is more accurate than local time", "It has no repeated or missing hour and sorts unambiguously", "Ignition cannot store local time", "It removes the need for time sync"],
      answer: 1,
      explain: [
        "UTC and local time represent the same instant. The difference is format.",
        "Correct. Convert to local time only for display.",
        "You can store local time, but it creates ambiguity at DST changes.",
        "UTC is a time scale. You still need synchronized clocks."
      ]
    },
    {
      q: "A PLC with a 20 ppm clock error is never synced. Roughly how far off is it after ten days?",
      options: ["About 0.2 seconds", "About 17 seconds", "About 2 seconds", "About 170 seconds"],
      answer: 1,
      explain: [
        "That would be about 2 ppm over ten days.",
        "Correct. 20 ppm of 86,400 s is about 1.7 s per day, so ten days is about 17 s.",
        "At 20 ppm the clock gains close to 1.7 s per day, so ten days is more than 2 s.",
        "That is ten times more drift than the 20 ppm figure gives."
      ]
    },
    {
      q: "Which statement about NTP strata is correct?",
      options: ["Stratum counts hops from a reference clock and is not by itself a quality rating", "A lower stratum number always means better accuracy at the client", "Stratum 16 is the best", "All devices in a plant must be stratum 1"],
      answer: 0,
      explain: [
        "Correct. A stratum 3 server on a clean network can beat a stratum 2 on a poor one.",
        "The client's accuracy also depends on network delay and the server's own condition.",
        "Stratum 16 means unsynchronized.",
        "Only the plant source needs to be near the top. Clients sit below it."
      ]
    }
  ],

  resources: [
    { title: "CIP Sync (Studio 5000 Logix Designer)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/studio-5000-logix-designer/controller-properties/cip-sync.html", type: "docs", source: "Rockwell Automation" },
    { title: "Deploying Scalable Time Distribution within a Converged Plantwide Ethernet Architecture", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/at/ia-at003_-en-p.pdf", type: "article", source: "Rockwell Automation" },
    { title: "1732E EtherNet/IP ArmorBlock Supporting Sequence of Events", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1732e-um002_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "ControlLogix Time Synchronization Module 1756-TIME", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1756-um542_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Time Zones in Perspective (Ignition 8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/time-zones-in-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Tag Alarm Properties (Ignition 8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-properties/tag-alarm-properties", type: "docs", source: "Inductive Automation" },
    { title: "Clocks, Oscillators, and PLLs: an introduction to synchronization", url: "https://tf.nist.gov/seminars/WSTS/PDFs/1-1_Qulsar_Shenoi_tutorial.pdf", type: "article", source: "NIST Time and Frequency Division" }
  ]
});
