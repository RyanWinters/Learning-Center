LC.lesson({
  id: "int-alarm-mgmt",
  title: "Alarm management in practice (ISA-18.2)",
  track: "int",
  minutes: 20,
  level: 3,
  prereqs: ["ign-alarming", "int-standards"],
  tags: ["alarms", "ISA-18.2", "EEMUA 191", "rationalization", "shelving", "operators"],
  summary: "An alarm system that cries wolf trains operators to ignore it. Learn the ISA-18.2 lifecycle, the numbers that tell you whether your alarms are healthy, and how to rationalize them in Ignition.",
  objectives: [
    "Walk through the ISA-18.2 lifecycle and say what each stage produces",
    "Use EEMUA 191-style benchmarks to judge an alarm system's load on an operator",
    "Recognize alarm floods, chattering alarms and stale alarms, and apply the standard fix to each",
    "Fill in a rationalization worksheet row with consequence, priority and operator action",
    "Map alarm management practices to Ignition alarm properties, the status and journal tables, and shelving"
  ],

  body: `
## Why alarm management is its own discipline

Anyone can add an alarm. It takes three clicks in Designer. The trouble starts a year later when the operator faces 400 active alarms during an upset and cannot tell which one matters. Alarm systems fail in a predictable way: every project adds alarms, nobody removes them, and eventually the operator ignores all of them. Several well-known industrial accidents had alarm overload as a contributing factor. Alarm management is the practice of keeping the alarm list small, meaningful and actionable. As an integrator you will often be asked to design the alarm system, and increasingly to clean up a bad one.

An **alarm** is an audible or visible indication that tells the operator about an abnormal condition that requires a timely response. Three words carry the weight: abnormal, response, timely. A status message, a log entry or a "machine is running" notice is an *event* and does not belong in the alarm list.

## The ISA-18.2 lifecycle

ANSI/ISA-18.2 (IEC 62682 internationally) defines a lifecycle for alarm systems. The standard treats it as a loop, because the system must keep improving as the plant changes. {{diagram:lifecycle}}

| Stage | What happens | Output |
|---|---|---|
| Philosophy | Define what an alarm is, priority levels, response times, design rules, roles | Alarm philosophy document |
| Identification | Find candidate alarms from P&IDs, hazard studies, LOPA, operator experience | List of candidate alarms |
| Rationalization | Test each candidate against the philosophy: justify, set limit, priority, class, action | Master alarm database (MADB) |
| Detailed design | Decide HMI presentation, suppression, delays, deadbands, grouping | Alarm design specification |
| Implementation | Configure the control system and HMI, test, train operators | Working, tested alarms |
| Operation | Operators respond, acknowledge, shelve, record | Operation records |
| Maintenance | Test, repair, take out of service, return to service under control | Maintained alarm devices |
| Monitoring and assessment | Measure alarm KPIs against the targets | Performance reports |
| Management of change | Control additions, changes and deletions | Approved changes |
| Audit | Periodic review of philosophy, system and process | Findings and actions |

### Philosophy

The philosophy is written once and applies everywhere. It defines priority levels (commonly three or four), the consequence classes that map to them, expected response times, the rules for annunciation (what sounds, what is silent), shelving authority and the performance targets. A new integrator joining a site should read it first. When the customer has none, offer to draft it. A short one beats none.

### Identification and rationalization

Identification gathers candidates from P&IDs, hazard and operability studies, layers of protection analysis, equipment manuals and operators. Rationalization then screens each one with questions:

1. Is the condition abnormal and does the operator need to act?
2. Is there a defined **operator action** that prevents the consequence?
3. Is there enough **time** to respond?
4. What is the **consequence** if no response (safety, environment, quality, equipment, production)?
5. What is the **priority** from the consequence and the response time?
6. What are the **limit, delay and deadband**?

If no operator action exists, it is not an alarm. It might be a log message, a trend or an automatic interlock. The results go in the master alarm database, which the control system is later audited against.

> [!example] Rationalization worksheet rows
> | Tag | Condition | Consequence if ignored | Time to respond | Action | Priority | Limit / delay / deadband |
> |---|---|---|---|---|---|---|
> | LAHH-101 | T-101 level high-high | Tank overflow, environmental release | 5 min | Stop feed, open drain XV-102 | High | 95 percent / 2 s / 2 percent |
> | LAH-101 | T-101 level high | Leads to LAHH-101 | 15 min | Check P-101 and valves | Medium | 85 percent / 5 s / 2 percent |
> | P-101 run status | P-101 running | None | n/a | None | Remove (status, not an alarm) | n/a |
> | LT-101 quality | LT-101 bad or uncertain quality (NE43 range, see {{lesson:int-commissioning}}) | Control blind, level unknown | 10 min | Check transmitter and wiring | High | quality not good / 3 s |

Note the third row: rationalization is mostly about **removing** alarms. The last row is a quality alarm. The philosophy defines one such alarm per transmitter, named after the instrument (here \`LT-101 quality\`, tag \`LT101\` in the PLC and Ignition), at one agreed priority. It is not a pressure or level alarm letter code, so it does not borrow one from ISA-5.1, and its loop number matches the transmitter it protects. {{lesson:int-fds}} uses the same name.

## Priority distribution

A frequent target, commonly seen in owners' philosophies and in the ISA-18.2 and EEMUA 191 literature, is a roughly 80/15/5 split: about 80 percent Low, 15 percent Medium and 5 percent High among configured alarms. Treat it as a starting point; check ISA-18.2 and EEMUA 191 for the wording and edition your owner follows. If half your alarms are High, the priority scale has lost its meaning. A value for Critical may exist for the highest consequence.

## Measuring the system: EEMUA 191 and ISA-18.2 KPIs

EEMUA Publication 191, from the Engineering Equipment and Materials Users Association (UK), published widely cited benchmarks that ISA-18.2 builds on. The numbers below are the widely quoted guideline values. Confirm exact wording and current edition in the source before putting them in a contract.

| Metric | Commonly quoted target |
|---|---|
| Average alarms per operator per 10 minutes, steady state | about 1 or fewer is very likely acceptable; about 2 is manageable; 5 or more is over-demanding |
| Alarms in the first 10 minutes after a major upset | fewer than about 10 is manageable |
| Alarm flood (ISA-18.2 definition) | more than 10 alarms in 10 minutes per operator |
| Percent of time in flood | low single digits, with a goal near zero |
| Standing (stale) alarms | stale means active longer than a set time, often 24 hours; aim for under about 5 at any moment |
| Top 10 most frequent alarms | should not dominate the load, since a few bad actors often cause a large share |
| Chattering alarm | commonly defined as one that repeats three or more times in one minute (confirm against ISA-18.2 or EEMUA 191 for your edition) |

Compute them from the alarm journal. A simple query counts alarm activations per hour per area. Run it monthly and plot it.

### Alarm floods

A flood happens when a single event cascades into many alarms: a trip of a main pump triggers low flow, low pressure, low level downstream, high temperature upstream, and so on. The operator drowns while the root cause scrolls away. Fixes include **state-based suppression** (when P-101 is stopped, suppress its low-flow alarm), **first-out** indication of the initiating alarm, grouping of related alarms, and better priority choices. Do not fix a flood by adding more alarms.

### Chattering alarms

A chattering alarm rapidly turns on and off because a signal hovers near its limit. It generates dozens of entries and wears out the operator. The cure is configuration, not shelving: add a **deadband** (hysteresis), an **on-delay** (alarm only if the condition holds for N seconds), and sometimes a **clear delay** or a filtered signal. See {{lesson:plc-analog}} for deadband and delay logic at the PLC level.

### Stale alarms

A stale alarm is active for a long time, say a day. Either it is a real problem nobody is fixing (a maintenance ticket is needed) or the condition is normal and the alarm is mis-designed. Stale alarms hide new ones. Review them weekly, fix them or remove them. An alarm for a pump that is out of service should be put in a formal out-of-service state, not left standing.

## Shelving, suppression and out of service

ISA-18.2 distinguishes three ways to take an alarm off the operator's screen, each with different controls.

| Mechanism | Who decides | Duration | Record |
|---|---|---|---|
| **Shelving** | Operator, with a reason | Temporary and automatic return, commonly minutes to hours | Logged |
| **Designed suppression** | Engineering, in the design (for example, state-based) | Automatic, by logic | In the design document |
| **Out of service** | Maintenance, with approval | Until returned to service | Formal, under change control |

Shelving is a safety valve for a nuisance alarm during a shift. The abuse of shelving (every shift shelves the same ten alarms) is a symptom that rationalization was never finished. Report on shelved-alarm counts.

## Alarm management in Ignition

Ignition's alarming module contains the building blocks. {{lesson:ign-alarming}} explains how alarms are configured, and {{lesson:arch-notification}} covers notification.

- **Alarm properties on a tag.** Each alarm has a mode and setpoint, a priority (Diagnostic, Low, Medium, High, Critical), an on-delay, a deadband and its clear behavior, an enabled flag and label, notes and associated data. These map directly to the rationalization worksheet columns: limit, priority, delay, deadband, operator action as the notes or display text.
- **UDT-based alarm templates.** Define alarms once inside a UDT with parameters for limits, so every pump gets the same structure and the master alarm database lines up with the tag model. See {{lesson:ign-udts}}.
- **Alarm Status Table.** The live operator view. It can show active, unacknowledged, cleared and acknowledged alarms, and supports acknowledgment and **shelving** for a chosen duration. When the shelve time expires and the condition is still active, the alarm returns. Scripts can shelve via \`system.alarm.shelve\`.
- **Alarm Journal Table and journal database.** The history: one row per state change. This is your measurement source for KPIs. Query it with \`system.alarm.queryJournal\` or SQL against the journal tables, then compute alarms per hour, top frequent alarms, standing alarm age and shelve counts.
- **Alarm pipelines.** Routes notifications (email, SMS, voice) with escalation, so the alarm that matters reaches a human who can act. See {{term:alarm-pipeline|alarm pipelines}}.
- **Security.** Restrict who can acknowledge, shelve and change alarm configuration through roles. See {{lesson:ign-security}}.
- **Expressions and bindings.** Use expression-based enable conditions or alarm modes to implement state-based suppression, such as enabling a low-flow alarm only while a pump is running.

> [!note] Version differences
> Property names for the status table and shelving options differ between Vision and Perspective components. Check the component documentation for your version before relying on a specific property name.

> [!tip] A monthly alarm review routine
> Query last month's journal. Take the 10 most frequent alarms and for each decide: fix the cause, retune (delay, deadband, limit), reprioritize, convert to an event, or remove. Record the decision in the master alarm database, route it through change control, and plot the monthly average rate. Customers love a trend line going down.

## A short plan for a project

1. Agree on or draft the alarm philosophy in the FDS phase ({{lesson:int-fds}}).
2. Rationalize alarms with operators and process engineers, ideally in a workshop with the P&IDs.
3. Configure alarms from the database, not from memory.
4. Include alarm performance targets in the acceptance criteria.
5. After go-live, monitor for 30 to 90 days and tune. Budget for it.
`,

  eli5: `
Imagine a house with a smoke alarm. Now imagine that alarm also beeps when you burn toast, when the dog walks by, when the fridge door is open and when the clock hits noon. After a week, you would stop looking up when it beeps. Then one day there is a real fire, and you ignore it too.

That is what happens in a factory when there are too many alarms. The people watching the machines get so many beeps that they cannot tell the important ones from the silly ones.

Alarm management is the job of tidying up. For every beep, we ask: is it really a problem, what should the person do about it, and how fast? If there is nothing for them to do, we take the beep away. If the beep keeps flickering on and off, we make it wait a few seconds so it only sounds when the problem is real. The most important beeps get the loudest sounds, and there are only a few of them. Then, when something sounds, the person pays attention.
`,

  why: `
**Why the alarm count matters more than the alarm quality.** A single operator can handle a limited number of alarms per hour. Past that, they skim, and skimmers miss the one that counts. Studies of incidents repeatedly find operators facing a flood of alarms in the minutes before a major event. Reducing the rate is the cheapest safety improvement a control system can make.

**Why rationalize instead of just tuning?** Tuning deadbands treats symptoms. Rationalization asks whether the alarm should exist at all, who responds and why. It is slower, but vendor and industry case studies regularly report large cuts in alarm counts with no loss of protection (the size depends on how bad the starting point was; check the case studies you cite). Experienced integrators run a workshop because the knowledge of why an alarm exists is in operators' heads, not in the project files.

**Why a philosophy document?** Without one, each engineer picks priorities by feel, and "High" means different things in different areas. The philosophy sets a shared definition so the operator learns that High always means respond now.

**Why monitor after commissioning?** Because the alarm system you hand over is a guess. Real plant behavior (startups, product changes, bad weather) creates alarm patterns nobody predicted. The standard's loop of monitoring, change management and audit exists because alarm systems decay like any other asset.

**What do people argue about?** Whether "every alarm needs an action" is too strict (some sites keep informational alarms for context), how aggressively to suppress alarms by plant state (risk: suppress something that mattered), and whether operators should have shelving powers at all. Safety-minded sites restrict shelving and require a reason, and busy plants say that without it operators lose control. The pragmatic approach is to allow it, log it and report it.

**A boundary to respect.** Alarms are not safety systems. If failure to respond leads to a severe hazard, a safety instrumented function ({{lesson:plc-safety}}) is the protection layer, not an operator alarm. The alarm may warn, but must not be the only barrier.
`,

  history: `
Alarm lists in early control rooms were annunciator panels with a lamp and a horn per alarm, so adding one meant physical hardware and was limited by cost. Distributed control systems made alarms nearly free to add, and alarm counts grew sharply. The UK's EEMUA published its alarm systems guide (Publication 191) in the 1990s and it became the reference for performance targets. ANSI/ISA-18.2 followed in 2009 with a lifecycle model, and it was later adopted internationally as IEC 62682. Revisions and technical reports have since added guidance on topics such as identification, rationalization and alarm shelving.
`,

  examples: [
    {
      title: "Fixing a chattering level alarm",
      body: `LAH-101 chatters 40 times an hour because the level hovers near 85 percent with a sloshing signal. Set the alarm on-delay to 5 seconds, set the deadband to 2 percent (so it clears at 83 percent) and filter the level signal in the PLC. In the next week's journal the alarm triggers twice. The rationalization record shows the changes and the reason.`
    },
    {
      title: "Cutting a flood with state-based suppression",
      body: `When pump P-101 trips, an area shows 14 alarms in 2 minutes: low flow, low discharge pressure, low downstream level and others. The team configures flow and pressure alarms to be enabled only when P-101 is running (an expression referencing the run status). Now the trip raises one alarm, "P-101 tripped," at High, followed by the real process effects only if they develop.`
    }
  ],

  diagrams: {
    lifecycle: `<svg viewBox="0 0 640 260" role="img" aria-label="ISA-18.2 alarm lifecycle as a loop: philosophy, identification, rationalization, design, implementation, operation, maintenance, monitoring, with management of change and audit feeding back">
  <defs><marker id="int-alarm-mgmt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <rect class="dg-box-accent" x="20" y="30" width="110" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="75" y="58">Philosophy</text>
  <rect class="dg-box" x="150" y="30" width="110" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="205" y="58">Identify</text>
  <rect class="dg-box-accent" x="280" y="30" width="110" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="335" y="58">Rationalize</text>
  <rect class="dg-box" x="410" y="30" width="100" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="460" y="58">Design</text>
  <rect class="dg-box" x="525" y="30" width="95" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="572" y="58">Implement</text>
  <line class="dg-line" x1="130" y1="53" x2="148" y2="53" marker-end="url(#int-alarm-mgmt-ah)"/>
  <line class="dg-line" x1="260" y1="53" x2="278" y2="53" marker-end="url(#int-alarm-mgmt-ah)"/>
  <line class="dg-line" x1="390" y1="53" x2="408" y2="53" marker-end="url(#int-alarm-mgmt-ah)"/>
  <line class="dg-line" x1="510" y1="53" x2="523" y2="53" marker-end="url(#int-alarm-mgmt-ah)"/>
  <path class="dg-line" d="M572 76 L572 120" fill="none" marker-end="url(#int-alarm-mgmt-ah)"/>
  <rect class="dg-box" x="525" y="122" width="95" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="572" y="150">Operate</text>
  <rect class="dg-box" x="410" y="122" width="100" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="460" y="150">Maintain</text>
  <rect class="dg-box-accent" x="260" y="122" width="130" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="325" y="150">Monitor + assess</text>
  <line class="dg-line" x1="525" y1="145" x2="512" y2="145" marker-end="url(#int-alarm-mgmt-ah)"/>
  <line class="dg-line" x1="410" y1="145" x2="392" y2="145" marker-end="url(#int-alarm-mgmt-ah)"/>
  <rect class="dg-box" x="100" y="122" width="130" height="46" rx="5"/>
  <text class="dg-text-sm dg-mid" x="165" y="143">Change control</text>
  <text class="dg-text-sm dg-mid" x="165" y="160">+ audit</text>
  <line class="dg-line" x1="260" y1="145" x2="232" y2="145" marker-end="url(#int-alarm-mgmt-ah)"/>
  <path class="dg-line" d="M165 122 L165 100 L335 100 L335 80" fill="none" marker-end="url(#int-alarm-mgmt-ah)"/>
  <text class="dg-text-muted" x="20" y="210">Findings from monitoring and audit feed back into rationalization, design and the philosophy.</text>
  <text class="dg-text-muted" x="20" y="230">The loop never ends: plants, products and operators change.</text>
</svg>`
  },

  pitfalls: [
    "Adding an alarm for every status and every tag 'just in case'. If no one acts on it, it is noise.",
    "Fixing a flood by adding alarms instead of suppressing consequences of a known trip.",
    "Shelving the same ten alarms every shift and never fixing the cause.",
    "Setting priorities by gut, so half the alarms are High and the scale is meaningless.",
    "Using an alarm as the only protection for a severe hazard, instead of a safety instrumented function.",
    "Never reviewing alarm performance after go-live."
  ],

  keyTerms: ["isa-18-2", "alarm-rationalization", "alarm-philosophy", "master-alarm-database", "alarm-flood", "chattering-alarm", "stale-alarm", "alarm-shelving", "deadband", "alarm-pipeline"],

  quiz: [
    {
      q: "During rationalization you find a 'Pump P-205 running' alarm that needs no operator response. What is the correct disposition?",
      options: ["Remove it from the alarm list and show it as a status or event", "Set it to Low priority", "Keep it but silence the horn", "Shelve it permanently"],
      answer: 0,
      explain: [
        "Correct. An alarm requires an abnormal condition and an operator action. A running status is information.",
        "A Low priority alarm still demands attention and adds to the load. With no action, it is not an alarm.",
        "Silencing the horn still leaves it in the list, adding noise.",
        "Permanent shelving hides the problem in a way the standard tries to avoid. The right fix is to remove it through change control."
      ]
    },
    {
      q: "An alarm turns on and off 30 times an hour because the signal hovers near its setpoint. What is the first-line fix?",
      options: ["Shelve it for the shift", "Add a deadband and an on-delay, and filter the signal if needed", "Raise its priority so the operator pays attention", "Move it to a different HMI screen"],
      answer: 1,
      explain: [
        "Shelving hides the symptom for a shift. The alarm returns and chatters again.",
        "Correct. Hysteresis and a delay are the standard remedy for a chattering alarm.",
        "Higher priority makes a chattering alarm worse, since it now demands attention 30 times an hour.",
        "Where the alarm appears does not change its behavior."
      ]
    },
    {
      q: "One pump trip causes 14 alarms in two minutes. Which approach best addresses this alarm flood?",
      options: ["Add more alarms to explain the cause", "Make all of them High priority", "Use state-based suppression so consequential alarms are enabled only when the pump is running, and keep a single clear trip alarm", "Reduce the operator's screen size"],
      answer: 2,
      explain: [
        "More alarms worsen a flood.",
        "Equal high priority removes the operator's ability to prioritize.",
        "Correct. Designed suppression lets the root alarm stand out and removes the predictable cascade.",
        "Screen size has no bearing on the number of alarms generated."
      ]
    },
    {
      q: "Which of these is a typical ISA-18.2 style definition of an alarm flood?",
      options: ["Any alarm that stays active more than a day", "An alarm that repeats three times in a minute", "Any High priority alarm", "More than 10 alarms in 10 minutes for one operator"],
      answer: 3,
      explain: [
        "That describes a stale (standing) alarm.",
        "That is the chattering alarm description.",
        "Priority has no bearing on whether a flood occurs.",
        "Correct. The commonly quoted definition is more than 10 alarms in a 10-minute window per operator."
      ]
    },
    {
      q: "In Ignition, where would you get data to compute alarms per hour and the top 10 most frequent alarms?",
      options: ["The Gateway's Wrapper log", "The Alarm Status Table alone", "The alarm journal, through the Alarm Journal Table or journal queries", "The OPC UA server's browse tree"],
      answer: 2,
      explain: [
        "The wrapper log records Gateway process messages, not alarm history.",
        "The Status Table shows live alarms and cannot give trends over a month.",
        "Correct. The journal stores one record per alarm state change, and is the source for KPIs.",
        "The browse tree lists tags and nodes, and holds no alarm history."
      ]
    },
    {
      q: "A site's operators shelve the same ten alarms every shift. What does this most likely indicate?",
      options: ["The shelving feature is working as intended", "Rationalization or tuning was not completed, so nuisance alarms remain", "The journal is misconfigured", "The alarms are too low in priority"],
      answer: 1,
      explain: [
        "Shelving is for occasional, temporary relief. Routine use is a warning sign.",
        "Correct. Repeated shelving points to alarms that need fixing, retuning or removal.",
        "Nothing suggests a journal fault. The journal is just recording the shelving.",
        "Priority is not the driver. The alarms are annoying regardless of priority."
      ]
    }
  ],

  resources: [
    { title: "ISA-18 Series of Standards", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-18-series-of-standards", type: "standard", source: "ISA" },
    { title: "Alarm Management and ISA-18: a journey, not a destination", url: "https://www.exida.com/articles/ALARM-MANAGEMENT-AND-ISA-18-A-JOURNEY-NOT-A-DESTINATION.pdf", type: "article", source: "exida" },
    { title: "exida alarm management resources", url: "https://www.exida.com/Alarm-Management/Resources", type: "article", source: "exida" },
    { title: "Connecting Alarm Management and Safety Instrumented Systems", url: "https://www.exida.com/articles/Connecting-Alarm-Management-and-Safety-Instrumented-Systems.pdf", type: "article", source: "exida" },
    { title: "ISA18 Update: Management of Alarms", url: "https://www.isa.org/intech-home/2021/august-2021/departments/isa18-update-management-of-alarms", type: "article", source: "ISA InTech" },
    { title: "Perspective Alarm Status Table", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-alarm-status-table", type: "docs", source: "Inductive Automation" },
    { title: "system.alarm.shelve", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-alarm/system-alarm-shelve", type: "docs", source: "Inductive Automation" },
    { title: "Displaying alarm history in Perspective", url: "https://inductiveuniversity.com/videos/displaying-alarm-history-perspective/8.3", type: "video", source: "Inductive University" }
  ]
});
