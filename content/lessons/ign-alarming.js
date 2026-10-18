LC.lesson({
  id: "ign-alarming",
  title: "Alarming",
  track: "ign",
  minutes: 15,
  level: 2,
  prereqs: ["ign-tags"],
  tags: ["ignition", "alarms", "isa-18.2", "notification", "operators"],
  summary: "How an Ignition tag becomes an alarm, what each setting really changes, and how alarm state, the status table, the journal and pipelines fit together.",
  objectives: [
    "Configure an alarm on a tag with the right mode, setpoint and priority",
    "Explain deadband, active delay and clear delay and when to use each",
    "Describe the four alarm states and the three acknowledge modes",
    "Distinguish the alarm status table from the alarm journal",
    "Outline what an alarm notification pipeline does and tie alarm design to ISA-18.2"
  ],

  body: `
## An alarm is a condition on a tag

In Ignition an {{term:ign-alarm|alarm}} is not a separate object in the PLC. It is a **configuration on a tag** that the Gateway evaluates every time the tag's value changes. When the condition is true for long enough, the Gateway creates an **alarm event**, tracks its life cycle, shows it to operators and can hand it to a pipeline that notifies people. Because it lives on the tag, you can put alarms on a UDT definition and every instance gets them.

Alarms are only evaluated after the tag value changes, and after any tag-level deadband has been applied. A signal that never changes cannot start or clear an alarm.

## Anatomy of a tag alarm

Open a tag, go to the Alarms section and add one. The core properties:

| Property | What it controls |
|---|---|
| **Name** | Shown to operators. Short and unique per tag |
| **{{term:alarm-mode|Mode}}** | The kind of condition (table below) |
| **Setpoint(s)** | The threshold(s) the mode compares against; can be bound to another tag |
| **Priority** | Diagnostic, Low, Medium, High or Critical; used by screens, pipelines and scripts |
| **Deadband** | How far past the setpoint the value must retreat before it clears |
| **Active delay / Clear delay** | Seconds the condition must hold before the alarm goes active / clear |
| **Ack mode** | Unused, Auto or Manual |
| **Notes and label** | Free-form documentation shown to the operator |
| **Associated data** | Extra values captured with the event |
| **Enabled, shelving, pipeline** | Whether it runs, whether it may be shelved, where notifications go |

### Modes

| Mode | Active when |
|---|---|
| Above Setpoint | value is above (or at, if inclusive) the setpoint |
| Below Setpoint | value is below the setpoint |
| Between Setpoints | value is between a low and high setpoint |
| Outside Setpoints | value is below the low or above the high |
| Equal / Not Equal to Setpoint | exact match or mismatch; good for state values and enums |
| Bad Quality | the tag quality is bad (communications lost, bad address) |
| On Condition | an expression you write evaluates true |
| Any Change | every change of value, for event logging rather than true alarms |

Pick the simplest mode that matches the physical meaning. A high-level alarm is Above Setpoint. A "valve not in commanded position" alarm is better as On Condition with an expression comparing command and feedback, ideally with an active delay to give the valve time to move.

### Deadband, active delay and clear delay

These three settings fix different problems.

- **Deadband** fixes *chatter near the setpoint*. With a High alarm at 80 and a deadband of 2, the alarm goes active at 80.1 but clears only when the value falls below 78. In a Between mode with setpoints 50 and 70 and deadband 2, it activates inside 50 to 70 and clears only below 48 or above 72.
- **Active delay** fixes *momentary spikes and transitions*. A motor current alarm with a 5 s active delay ignores the inrush at start-up.
- **Clear delay** fixes *flicker on the way out*. The condition must stay false for that many seconds before the alarm clears.

> [!example] High tank level: working numbers (LT101)
> Level transmitter LT-101 on the P&ID (tag \`LT101\` in Ignition), ranged 0 to 5.0 m, normal range 2.0 to 3.5 m. The alarm LAH-101 is Above Setpoint 4.25 m, priority High, deadband 0.15 m, active delay 10 s, ack Manual. Behavior: the level crosses 4.25 and stays above for 10 s, so the alarm goes active and unacknowledged. It falls to 4.20, and nothing happens (still inside the deadband). It falls below 4.10 and the condition clears, becoming clear and (if not yet acknowledged) clear-unacknowledged. The high-high alarm LAHH-101 and any overflow protection belong in the PLC or a hardwired circuit, not only in Ignition.

## Alarm states and acknowledgement

An alarm event sits in one of four states, combining *active or clear* with *acknowledged or not*:

{{diagram:states}}

**Ack mode** decides what acknowledgement means:

- **Manual**: an operator must acknowledge. The default for anything that needs a human decision.
- **Auto**: the alarm is considered acknowledged when it clears. Fine for informational alarms.
- **Unused**: the alarm is always acknowledged. Note that an acknowledged alarm is a default drop-out condition for pipelines, so Unused effectively keeps the alarm out of notification pipelines.

## Shelving

Shelving tells the system to ignore an alarm for a chosen time, such as 1 hour or a shift. While shelved, no notifications are generated and its events are hidden from the alarm status tables. It is how operators deal with a known-bad instrument without drowning in noise. Use it deliberately. A shelved alarm that nobody remembers is an unprotected process. Good sites record who shelved what and review the shelf list daily.

## Where alarms show up: status vs journal

| | Alarm Status Table | Alarm Journal |
|---|---|---|
| Answers | What is in alarm *right now*? | What happened over time? |
| Storage | Gateway memory (live state) | Database table (written by a journal profile) |
| Needs a database | No | Yes |
| Used for | Operator screens, ack, shelve | Reports, KPIs, audits, root cause |

If you want alarm history, you must configure an **alarm journal profile** pointing at a database connection. Without it, a cleared alarm is gone once it leaves the status table.

## Alarm notification pipelines

A **pipeline**, from the Alarm Notification module, is a flow chart that runs for each active alarm. Blocks can wait, test conditions, send an email or SMS, call a voice message, escalate to someone else if nobody acknowledges within N minutes or write a script. A pipeline stops when its drop-out condition becomes true, by default when the alarm is acknowledged or cleared. The next lessons {{lesson:arch-notification}} and {{lesson:int-alarm-mgmt}} go deeper.

## Associated data

Associated data captures extra context at the instant an alarm goes active or clears. Typical examples are the tag value at that moment, a batch id or a motor's load. It appears in the event details, the journal and pipelines, so a notification can say "High Level on LT101, 4.4 m, Batch 4471" instead of just "High Level." Use it generously and keep the values simple.

## Designing for operators: ISA-18.2

The tooling makes it very easy to add alarms. That is the danger. {{term:isa-18-2|ISA-18.2}} (and the EEMUA 191 guide before it) describes an **alarm management lifecycle**: philosophy, identification, rationalization, detailed design, implementation, operation, monitoring, management of change and audit. The core rule is that every alarm must require a **specific operator action**, have a **consequence if ignored** and a **time to respond**. Anything else belongs on a screen as information, in a log or in a maintenance report, not in the alarm list. A common target is an average of roughly one new alarm per ten minutes per operator, with the ability to cope with bursts. See {{lesson:int-alarm-mgmt}} for the practice.

> [!note] In 8.1
> Alarm properties and states are the same in 8.1. The evaluation model is unchanged between 8.1 and 8.3. Some manual pages were reorganized, so section names may differ.
`,

  eli5: `
Think of a smoke detector in your house. It watches the air. When the smoke is above a certain level, it beeps. That level is the setpoint.

Now add some sensible rules. If it beeped for a half second every time you made toast, you would rip the battery out, so you tell it, "only beep if there is smoke for 10 seconds straight." That is an active delay. If it stopped and started beeping right at the edge of the threshold, it would drive you mad, so it keeps beeping until the smoke is clearly gone. That is a deadband.

You then have to press the button to say "I heard you." That is acknowledging. Pressing it doesn't make the smoke go away, it just says a person knows. Sometimes you press a snooze button for an hour because you know the oven is smoky. That is shelving.

Finally, if nobody hears the beeping, the alarm company calls your phone, then your neighbor. That is a pipeline: a plan for who to tell next.
`,

  why: `
**Why alarms on tags and not in the PLC?** PLC alarms are fast and survive a SCADA outage, but they are hard to change, tricky to distribute and carry no notification logic. Ignition alarms are easy to configure and route. The mature answer is both: safety and process protection in the PLC or safety system, operator awareness alarms in SCADA. Never let an Ignition alarm be the only thing standing between a hazard and a consequence.

**Why delays and deadbands?** Without them, noisy signals generate floods of repeats. A chattering alarm trains operators to ignore the list, and a missed real alarm is how incidents happen. Alarm floods are a documented factor in major industrial incidents, which is why standards such as ISA-18.2 exist.

**Why manual acknowledgement?** The acknowledgement is evidence that a human saw it. Auto-ack removes that evidence and, in Ignition, can cut a notification pipeline short. The tradeoff is operator workload: acknowledging 200 trivial alarms wastes attention. The right fix is fewer alarms, not an auto-ack setting.

**Why priority matters:** If everything is Critical, nothing is. A typical distribution is about 80 percent low, 15 percent medium and 5 percent high or critical.

**Where integrators argue:** whether to allow shelving by operators or require supervisor approval, whether to alarm on instrument bad quality at all, and whether notification pipelines belong in the alarm design or should be kept minimal and handled by a separate call-out system.
`,

  history: `
Alarm annunciator panels, rows of lighted windows with horns, came first. Control rooms with CRT screens made it cheap to add alarms, and alarm counts exploded in the 1980s and 1990s. EEMUA published its Publication 191 on alarm systems in 1999, and the ISA-18.2 standard followed in 2009 (with the IEC 62682 counterpart later), making alarm management a lifecycle discipline.
`,

  examples: [
    {
      title: "Alarm on a UDT so all motors inherit it",
      body: `Add to the \`Motor\` UDT definition a Bad Quality alarm on \`Sts/Speed\`, an Above Setpoint alarm on \`Sts/Speed\` bound to the member \`Cfg/SpeedHigh\`, and an On Condition alarm \`{[.]Cmd/Start} && !{[.]Sts/Running}\` with a 5 s active delay. Every motor (\`M101\` to \`M140\`) gets the same alarms and each reads its own limit from its \`Cfg\` folder. Overload protection stays hardwired in the starter, and the PLC's \`Alm/Overload\` bit only informs the operator.`
    },
    {
      title: "Reading the journal for bad actors",
      body: `\`\`\`sql
SELECT source, COUNT(*) AS activations
FROM alarm_events
WHERE eventtime > NOW() - INTERVAL '7 days' AND eventtype = 0
GROUP BY source ORDER BY activations DESC LIMIT 10;
\`\`\`
The ten most frequent alarms in a week are your rationalization list. Column and table names depend on the journal profile, so check your schema.`
    }
  ],

  diagrams: {
    states: `<svg viewBox="0 0 640 300" role="img" aria-label="Alarm life cycle with four states: Active Unacknowledged, Active Acknowledged, Clear Unacknowledged and Clear Acknowledged. Condition true moves Normal to Active Unacknowledged, an operator ack moves unacknowledged to acknowledged, and the condition clearing moves active to clear. A cleared and acknowledged alarm leaves the active list.">
  <defs><marker id="ign-alarming-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box" x="10" y="120" width="100" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="60" y="147">Normal</text>
  <rect class="dg-box-alarm" x="170" y="30" width="170" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="255" y="52">Active</text>
  <text class="dg-text-sm dg-mid" x="255" y="70">Unacknowledged</text>
  <rect class="dg-box-accent" x="450" y="30" width="170" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="535" y="52">Active</text>
  <text class="dg-text-sm dg-mid" x="535" y="70">Acknowledged</text>
  <rect class="dg-box-warn" x="170" y="190" width="170" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="255" y="212">Clear</text>
  <text class="dg-text-sm dg-mid" x="255" y="230">Unacknowledged</text>
  <rect class="dg-box" x="450" y="190" width="170" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="535" y="212">Clear</text>
  <text class="dg-text-sm dg-mid" x="535" y="230">Acknowledged</text>
  <line class="dg-line" x1="60" y1="120" x2="168" y2="62" marker-end="url(#ign-alarming-ah)"/>
  <text class="dg-text-muted" x="10" y="84">condition true</text>
  <line class="dg-line" x1="340" y1="55" x2="448" y2="55" marker-end="url(#ign-alarming-ah)"/>
  <text class="dg-text-muted" x="352" y="46">operator acks</text>
  <line class="dg-line" x1="255" y1="80" x2="255" y2="188" marker-end="url(#ign-alarming-ah)"/>
  <text class="dg-text-muted" x="263" y="138">condition clears</text>
  <line class="dg-line" x1="535" y1="80" x2="535" y2="188" marker-end="url(#ign-alarming-ah)"/>
  <text class="dg-text-muted dg-end" x="527" y="138">condition clears</text>
  <line class="dg-line" x1="340" y1="215" x2="448" y2="215" marker-end="url(#ign-alarming-ah)"/>
  <text class="dg-text-muted" x="352" y="206">operator acks</text>
  <path class="dg-line" fill="none" d="M535 240 L535 268 L60 268 L60 166" marker-end="url(#ign-alarming-ah)"/>
  <text class="dg-text-muted" x="150" y="260">cleared and acknowledged: leaves the active list</text>
  <text class="dg-text-muted" x="10" y="292">Active delay applies before the first arrow; clear delay before the clear arrows.</text>
</svg>`
  },

  pitfalls: [
    "Setting no active delay on a signal with start-up transients, creating nuisance alarms every start.",
    "Leaving every alarm at Critical priority so priority carries no information.",
    "Using Unused ack mode and then wondering why the notification pipeline never runs.",
    "Expecting alarm history without configuring a journal profile and database.",
    "Using a deadband of 0 on a noisy analog, so the alarm chatters.",
    "Alarming on information that requires no operator action, which builds floods."
  ],

  keyTerms: ["ign-alarm", "alarm-mode", "alarm-priority", "alarm-active-delay", "alarm-ack-mode", "alarm-shelving", "alarm-associated-data", "alarm-journal", "alarm-pipeline", "isa-18-2", "deadband"],

  quiz: [
    {
      q: "A High alarm at 80 with deadband 2 is active at 81. At what value does it clear?",
      options: ["Below 80", "Below 78", "Below 82", "Only when acknowledged"],
      answer: 1,
      explain: [
        "That would clear immediately at the setpoint, with no deadband protection against chatter.",
        "Correct. The value must retreat past the setpoint by the deadband (80 minus 2).",
        "That is above the setpoint, so it would never clear properly.",
        "Acknowledgement changes the acknowledged state, not whether the condition is true."
      ]
    },
    {
      q: "A motor current alarm triggers briefly during every start-up. Which setting fixes it with the least side effect?",
      options: ["Raise the priority", "Add an active delay of a few seconds", "Switch to Auto ack", "Disable shelving"],
      answer: 1,
      explain: [
        "Priority doesn't stop the alarm from firing.",
        "Correct. The condition must stay true past the inrush before the alarm goes active.",
        "Ack mode changes acknowledgement, not whether it triggers.",
        "Shelving is unrelated to this behavior."
      ]
    },
    {
      q: "Operators want a list of alarms that occurred last night. What must exist?",
      options: ["An alarm journal profile writing to a database", "An alarm status table on a screen", "A tag historian on the alarm tag", "A shelving rule"],
      answer: 0,
      explain: [
        "Correct. The journal stores events in a database for later queries.",
        "The status table shows current state only.",
        "The Tag Historian stores values, not alarm events.",
        "Shelving hides alarms."
      ]
    },
    {
      q: "What does shelving an alarm do?",
      options: ["Deletes it from the tag", "Acknowledges it permanently", "Changes its priority to Diagnostic", "Suppresses notifications and hides its events from alarm status tables for a time"],
      answer: 3,
      explain: [
        "The configuration remains.",
        "It is not an acknowledgement.",
        "Priority is unchanged.",
        "Correct. It is a temporary, deliberate suppression."
      ]
    },
    {
      q: "Which alarm best matches an ISA-18.2 'good alarm'?",
      options: ["Motor M101 running", "Any change on a setpoint tag", "LT101 level high, requiring the operator to divert flow within 5 minutes to avoid overflow", "Communications OK"],
      answer: 2,
      explain: [
        "Status information belongs on a screen.",
        "That is a log entry, not an alarm.",
        "Correct. It has a required action, a consequence and time to respond.",
        "Normal conditions are not alarms."
      ]
    }
  ],

  resources: [
    { title: "Alarming (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/alarming", type: "docs", source: "Inductive Automation" },
    { title: "Configuring Alarms (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/alarming/configuring-alarms", type: "docs", source: "Inductive Automation" },
    { title: "Tag Alarm Properties (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-properties/tag-alarm-properties", type: "docs", source: "Inductive Automation" },
    { title: "Alarm Associated Data", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/alarming/configuring-alarms/alarm-associated-data", type: "docs", source: "Inductive Automation" },
    { title: "Alarm Notification Pipelines", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/alarm-notification/alarm-notification-pipelines", type: "docs", source: "Inductive Automation" },
    { title: "Configure an Alarm", url: "https://inductiveuniversity.com/videos/configure-an-alarm/8.3", type: "video", source: "Inductive University" },
    { title: "Dynamic Alarm Setpoints", url: "https://inductiveuniversity.com/videos/dynamic-alarm-setpoints/8.3", type: "video", source: "Inductive University" }
  ]
});
