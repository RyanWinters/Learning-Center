LC.lesson({
  id: "mes-downtime",
  title: "Downtime tracking and reason codes",
  track: "mes",
  minutes: 20,
  level: 2,
  prereqs: ["mes-oee"],
  tags: ["downtime", "reason-codes", "pareto", "micro-stops", "first-out", "oee"],
  summary: "The PLC knows a machine stopped. Only a person knows why. A good design gets the PLC to do as much of the work as it can and asks the operator for as little as possible.",
  objectives: [
    "Compare automatic, manual and hybrid downtime capture and pick one for a given line",
    "Design a short reason code tree and say why length kills data quality",
    "Handle micro-stops, split events and shift boundaries without losing time",
    "Build a Pareto from downtime events and read it correctly",
    "Specify first-out fault information the PLC should supply to MES"
  ],

  body: `
## What downtime tracking is

Downtime tracking records every period when a machine was supposed to produce and did not, with a start, an end, and a reason. It feeds the Availability factor of {{lesson:mes-oee}} and it is usually the first thing an MES is asked to do, because the stops are where the lost minutes are. The hard part is not the timer. It is getting a *reason* attached to each stop that someone will trust.

## Three capture styles

| Style | How it works | Strengths | Weaknesses |
|---|---|---|---|
| Automatic | PLC state and fault data classify the stop with no human input | Objective, no operator burden, catches every stop | Only knows what the machine can sense; "waiting for forklift" is invisible |
| Manual | Operator picks a reason on a screen | Captures things the machine cannot know | Late, inconsistent, skipped on busy shifts |
| Hybrid | PLC detects the stop and suggests or pre-fills a reason; operator confirms or changes it | Accurate times plus human context | Needs good design to avoid nagging |

Hybrid is what most successful projects end up with. The machine owns **when** and **what it saw**. The operator owns **why** only when the machine cannot say.

{{diagram:timeline}}

## Detecting the stop from the PLC

The cleanest signal is a machine state tag, not a guess from raw I/O. A state model with values such as Running, Idle, Starved, Blocked, Faulted, Changeover and Planned Stop lets MES derive nearly everything else. {{lesson:plc-isa88-packml}} describes the standard PackML states, which most packaging OEMs already expose.

A downtime event begins when the state leaves "Running" during planned production time, and ends when it returns. A few practical rules:

- **Debounce the state.** A state that flickers for 200 ms is not an event. Filter in the PLC if you can, in the MES if you cannot.
- **Use a time source you trust.** Timestamp in the PLC or at the edge, not when the gateway happens to poll. See {{term:polling|polling}}.
- **Record the state, not just running/not running.** Faulted, starved and blocked are different problems. Starved means upstream is late, blocked means downstream is full. Neither is this machine's fault, and OEE reports should be able to say so.

## Micro-stops

A {{term:micro-stop|micro-stop}} is a very short stop, often seconds, that the operator clears without calling anyone. A packaging line with 40 jams a shift at 25 seconds each loses about 17 minutes and no one logs a single event.

Two choices:

1. **Threshold.** Ignore stops shorter than a set time, such as 30 seconds, as events and let them show up as lost speed in Performance. Sepasoft's equipment state configuration includes a short stop threshold in seconds for this purpose: a state must last that long before it is logged against availability. Check [Configuring Equipment States](https://docs.sepasoft.com/articles/user-manual/configuring-equipment-states) for how your release treats very small values.
2. **Count and aggregate.** Record every micro-stop but do not prompt for a reason. Show the count and total time per shift and let engineering sample the causes.

Do not prompt the operator on every short stop. They will pick the first code in the list to make the screen go away, and your Pareto will say the top problem is "Adjustment."

## Reason code trees

A reason code is a controlled-vocabulary label for why a stop happened. The tree is the hierarchy.

\`\`\`text
Equipment
  Mechanical
    Jam - infeed
    Jam - labeler
    Worn part
  Electrical / controls
    Sensor fault
    Drive fault
Process
  Changeover
  Cleaning
  Waiting - material
Quality
  Out of spec - hold
Planned
  Break
  Preventive maintenance
\`\`\`

Rules that experienced integrators repeat:

- **Keep it short.** Two or three levels, a handful of top-level choices (the example tree above has four) and a few dozen leaves at most. This is practitioner experience, not a standard. An operator should reach a code in two taps.
- **Make the reason tell you who acts.** Maintenance, production, materials, quality, planned. A report that sorts by owner is more useful than one sorted by alphabet.
- **Separate planned from unplanned at the top level.** That one choice drives OEE's planned production time.
- **Avoid "Other" with free text as the common case.** If "Other" is a large share of downtime (many teams treat anything above a few percent as a warning, a rule of thumb rather than a standard), the tree needs work. Review it quarterly.
- **Design it with the operators.** Use their words. A code nobody understands gets misused.
- **Keep one master list.** Codes should live in master data with an ID, not as strings typed into screens. Retire codes rather than deleting them so history still resolves.

## Splitting events and the schedule

One stop is not always one cause. A 30-minute stop might be 20 minutes of jam clearing followed by 10 minutes waiting for a mechanic. Allow an event to be **split**, with each part carrying its own reason. Sepasoft's Perspective downtime table is built for operators to edit events and reasons, and splitting is covered in its documentation (see [OEE Downtime Table - Perspective](https://docs.sepasoft.com/articles/user-manual/oee-downtime-table-perspective); confirm the split options for your release). If you build your own, store split pieces as child rows that sum to the parent duration.

Context decides whether a stop counts at all:

- **Shift boundaries.** A stop that spans a shift change should be cut at the boundary so each shift reports its own time.
- **Schedule.** A stop during a scheduled break, a "no order scheduled" window or a planned maintenance block is not a loss against planned production time. Sepasoft lets you give a state a Planned Downtime type, which is how scheduled stops are kept out of the availability loss. Verify the exact rules for your release in the equipment-state pages.
- **Overlap.** Two machines in a line can fault together. Decide the rule up front: line downtime is attributed to the *key* machine (the bottleneck) or to the first cause. Sepasoft's detection modes exist for exactly this question.

## Pareto analysis

A Pareto chart ranks causes by total lost time and shows the cumulative percentage. It turns thousands of events into a short list of what to fix first.

| Reason | Minutes | Share | Cumulative |
|---|---|---|---|
| Changeover | 310 | 34.4% | 34.4% |
| Jam - labeler | 240 | 26.7% | 61.1% |
| Waiting - material | 150 | 16.7% | 77.8% |
| Film splice | 90 | 10.0% | 87.8% |
| Sensor fault | 60 | 6.7% | 94.4% |
| Other | 50 | 5.6% | 100.0% |
| **Total** | **900** | | |

One week on one line. Three reasons account for 78 percent of the lost time. Note what the Pareto does not tell you: *frequency*. The labeler jam may be 80 short events, while changeover is 6 long ones. Fixing them takes different tools, so chart both minutes and counts. And a Pareto is only as good as its reasons, so check "Other" and the "unassigned" bucket first.

\`\`\`sql
SELECT reason_code, COUNT(*) AS events, SUM(duration_s)/60.0 AS minutes
FROM downtime_event
WHERE line_id = :line_id
  AND start_ts >= :week_start AND start_ts < :week_end
  AND planned = 0
GROUP BY reason_code
ORDER BY minutes DESC;
\`\`\`

## Where the PLC should help: first-out fault codes

When a conveyor jams, the PLC often shows ten faults in the next second: the jam, a downstream starved alarm, a low-air warning caused by the e-stop. The operator sees a screen full of red. Only the first one matters. A **first-out** latch captures the first fault that occurred and holds it until reset, so MES can suggest the right reason code.

\`\`\`st
// Pseudo-ST: FaultCode is the ID of the fault that just became active (0 if none).
// WallClockNow stands for a timestamp read from the controller clock (for example via GSV);
// check the instruction form for your Studio 5000 version.
IF FaultCode <> 0 AND FirstOutCode = 0 THEN
    FirstOutCode := FaultCode;
    FirstOutTime := WallClockNow;
END_IF;

IF NOT MachineFaulted AND ResetPulse THEN
    FirstOutCode := 0;
END_IF;
\`\`\`

Expose \`FirstOutCode\` as an integer tag, with a lookup table in MES that maps each fault ID to a default reason code. The operator then sees "Jam - labeler (auto)" pre-filled and taps once to confirm. For this to work, the PLC fault numbering must be stable and documented, and treated as an interface. Renumbering it silently breaks every mapping downstream. If several faults can arrive in the same scan, define a priority rule so the code is deterministic.

> [!tip] Division of labor
> PLC: state, first-out fault ID, counts, timestamps. MES: event creation, splitting, schedule context, reason lookup. Operator: confirm or choose the reason when it is not obvious. Keeping that split stops PLC programmers from encoding reason trees in ladder and stops MES from guessing at faults.

## A minimal data model

\`\`\`sql
CREATE TABLE downtime_event (
  event_id     BIGINT IDENTITY PRIMARY KEY,
  line_id      INT NOT NULL,
  machine_id   INT NOT NULL,
  start_ts     DATETIME2 NOT NULL,
  end_ts       DATETIME2 NULL,         -- open event until state returns
  state_code   INT NOT NULL,           -- faulted, starved, blocked, changeover
  first_out    INT NULL,               -- PLC fault ID at start
  reason_code  INT NULL,               -- NULL = unassigned
  reason_src   CHAR(1) NOT NULL,       -- A auto, O operator, S supervisor
  planned      BIT NOT NULL DEFAULT 0,
  parent_id    BIGINT NULL,            -- for split events
  shift_id     INT NOT NULL,
  work_order   VARCHAR(30) NULL
);
\`\`\`

Keep the *source* of each reason, because auditing "how many were auto-assigned" tells you whether the system is working.
`,

  eli5: `
Think about a school bus that stops on its route. A little device in the bus knows exactly when the wheels stopped and when they started again. That is the machine telling you "I stopped for 6 minutes."

But the device cannot tell you whether the bus stopped for a red light, a flat tire, or a kid who forgot their backpack. Only the driver knows. If you ask the driver at every single red light, they will get fed up and write "red light" for everything. If you give them a huge list of 200 possible reasons, they will pick the first one.

So you do two things. The bus itself tells you the first warning light that came on (like "tire pressure low"), which is usually the real cause. And you give the driver a short list of ten simple reasons to tap when the bus cannot tell. At the end of the week you add up the minutes for each reason, and the biggest pile is what you fix first.
`,

  why: `
**Why not just let operators type a reason every time?** Because compliance decays. Early in a rollout operators fill in everything. After a month, on a busy shift, they pick the top code or leave it blank. The fix is to need less from them: let the PLC create the event, pre-fill what it knows, and prompt only for the stops above a meaningful duration.

**Why keep trees short?** Every extra level costs taps and invites guessing. A long tree also hides the problem it was built to expose. If "Jam" is split into 40 jam locations, none of them rank high on a Pareto, and the real total looks small. Start coarse. Split a bucket only when it is large enough to deserve attention.

**Why the PLC must supply the first-out fault.** Cascade faults make most of the alarm list noise. Without a first-out indicator, MES records a cascade as the cause, or a human guesses. Giving MES one integer that is usually correct is worth more than a thousand alarm tags.

**Why timestamps from the source.** If events are stamped when the gateway polls, a stop that lasted 4 seconds can appear as 0 or 10 depending on poll alignment. At scale that bias moves Availability by points. Use PLC or edge timestamps and sort out clock sync (see {{lesson:net-data}}).

**What integrators debate.** Whether to force a reason before the line can restart (some plants do; it frustrates operators and produces junk), how long a stop must be before prompting, and who may edit reasons after the fact. A common compromise is: no lockout, a prompt after a threshold, reasons editable by supervisors within the same day, and a visible "unassigned" bucket on the shift report.
`,

  history: `
Downtime logging began as paper forms and clipboard tallies on the line, and TPM practice in the 1970s and 1980s made the loss categories formal. When PLCs and SCADA systems were networked, plants began pulling machine state directly, and MES products added downtime modules that combine automatic detection with reason entry screens.
`,

  examples: [
    {
      title: "Splitting a 30-minute stop",
      body: `At 14:05 the labeler faults and stops. First-out code 214 maps to "Jam - labeler". The operator clears it by 14:25 but the line cannot restart until a mechanic replaces a worn guide, finishing at 14:35. In the downtime table the event is split: 14:05 to 14:25 "Jam - labeler" (20 min, auto), 14:25 to 14:35 "Waiting - maintenance" (10 min, operator). The Pareto now separates the jam rate from the response time, which are two different problems.`
    },
    {
      title: "A stop across a shift change",
      body: `A changeover starts at 05:40 and ends at 06:20, with shift change at 06:00. Cut the event at 06:00. Night shift owns 20 minutes and day shift owns 20 minutes. If you do not cut, one shift's Availability is hit for the other's minutes.`
    }
  ],

  diagrams: {
    timeline: `<svg viewBox="0 0 640 210" role="img" aria-label="Timeline of machine state: running, then a stop that the PLC detects and labels with a first-out code, split into two reasons, then running again">
  <text class="dg-title" x="20" y="22">Machine state over time</text>
  <rect class="dg-box" x="20" y="40" width="170" height="36" rx="3"/>
  <text class="dg-text-sm dg-mid" x="105" y="63">Running</text>
  <rect class="dg-box-accent" x="190" y="40" width="130" height="36" rx="3"/>
  <text class="dg-text-sm dg-mid" x="255" y="63">Faulted</text>
  <rect class="dg-box-accent" x="320" y="40" width="70" height="36" rx="3"/>
  <text class="dg-text-sm dg-mid" x="355" y="63">Idle</text>
  <rect class="dg-box" x="390" y="40" width="230" height="36" rx="3"/>
  <text class="dg-text-sm dg-mid" x="505" y="63">Running</text>
  <line class="dg-line" x1="190" y1="80" x2="190" y2="108"/>
  <line class="dg-line" x1="390" y1="80" x2="390" y2="108"/>
  <line class="dg-line" x1="190" y1="100" x2="390" y2="100"/>
  <text class="dg-text-sm dg-mid" x="290" y="124">One downtime event (30 min)</text>
  <rect class="dg-box" x="190" y="140" width="130" height="30" rx="3"/>
  <text class="dg-text-sm dg-mid" x="255" y="160">Jam - labeler</text>
  <rect class="dg-box" x="320" y="140" width="70" height="30" rx="3"/>
  <text class="dg-text-sm dg-mid" x="355" y="160">Wait</text>
  <text class="dg-text-muted" x="20" y="152">PLC gives:</text>
  <text class="dg-text-muted" x="20" y="168">first-out 214</text>
  <text class="dg-text-muted" x="20" y="192">Event split by operator into two reasons that add up to the parent</text>
</svg>`
  },

  pitfalls: [
    "Prompting for a reason on every micro-stop, which trains operators to pick the first code.",
    "A 200-code tree. Compliance drops and the Pareto fragments into small bars.",
    "Stamping events when the gateway polls instead of at the PLC, so short stops become random.",
    "Letting 'Other' hold more than a few percent of downtime and never reviewing it.",
    "Renumbering PLC fault codes without updating the MES mapping.",
    "Not cutting events at shift boundaries or around scheduled breaks, so OEE is charged for planned time.",
    "Ranking only by minutes. A Pareto by count shows a different priority."
  ],

  keyTerms: ["micro-stop", "reason-code", "first-out-fault", "downtime-pareto", "mes-equipment-state", "planned-production-time", "polling", "state-machine"],

  quiz: [
    {
      q: "Operators on a busy line stop filling in reasons after a month. Which design change best addresses this?",
      options: ["Add more detailed codes so the reason is easier to find","Move reason entry to the end of shift","Make the reason mandatory before the line can restart","Have the PLC create the event with a first-out fault pre-filled and prompt only for longer stops"],
      answer: 3,
      explain: [
        "More codes make selection slower and worsen guessing.",
        "End-of-shift entry relies on memory and produces vague reasons.",
        "Forced entry tends to produce junk codes chosen to clear the prompt.",
        "Correct. Reduce the operator's work by letting the machine supply what it knows."
      ]
    },
    {
      q: "A packaging line has 40 stops a shift of about 25 seconds each, and none are logged as events. Where does the lost time most likely show up?",
      options: ["Performance","Quality","Nowhere","Availability"],
      answer: 0,
      explain: [
        "Correct. Short stops reduce output during running time, which is a speed loss.",
        "Quality is about defects, not time.",
        "The output is still lower, so Performance reflects it.",
        "They fall below the stop threshold, so Availability does not capture them."
      ]
    },
    {
      q: "Why is a first-out fault code more useful than the full active alarm list for classifying a stop?",
      options: ["It has more detail", "Later alarms are often consequences of the first, so the first usually points to the cause", "It is easier to display", "It is required by ISA-95"],
      answer: 1,
      explain: [
        "It has less detail, not more. That is the point.",
        "Correct. Cascades produce many alarms and the first one is usually the root.",
        "Display ease is not the reason.",
        "ISA-95 does not require it."
      ]
    },
    {
      q: "A 40-minute changeover spans a 06:00 shift change (starts 05:40). How should MES handle it?",
      options: ["Assign all 40 minutes to the night shift", "Assign all 40 minutes to the day shift", "Cut the event at 06:00 so each shift gets 20 minutes", "Discard the event"],
      answer: 2,
      explain: [
        "That overstates night shift losses.",
        "That overstates day shift losses.",
        "Correct. Each shift should be charged for its own time.",
        "Discarding it hides a real loss."
      ]
    },
    {
      q: "The weekly Pareto shows 'Jam - labeler' as 27 percent of minutes and 'Changeover' as 34 percent. What else should you check before deciding what to fix?",
      options: ["The event counts and the size of the 'Other' and unassigned buckets","The OEE target","The PLC scan time","Nothing, fix the biggest bar"],
      answer: 0,
      explain: [
        "Correct. Frequency and data quality both change the priority.",
        "The target does not affect which loss is largest.",
        "Scan time is unrelated.",
        "Minutes alone hide whether the loss is many short events or a few long ones, which need different fixes."
      ]
    }
  ],

  resources: [
    { title: "Downtime Detection Modes (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/downtime-detection-modes", type: "docs", source: "Sepasoft" },
    { title: "OEE Downtime Table - Perspective (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/oee-downtime-table-perspective", type: "docs", source: "Sepasoft" },
    { title: "Configuring Equipment States (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/configuring-equipment-states", type: "docs", source: "Sepasoft" },
    { title: "OEE Downtime Module Features (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/oee-downtime-module-features/a/h2_104082701", type: "docs", source: "Sepasoft" },
    { title: "Six Big Losses in Manufacturing", url: "https://www.oee.com/oee-six-big-losses/", type: "article", source: "OEE.com" },
    { title: "How to Address the Six Big Losses", url: "https://www.oee.com/address-six-big-losses/", type: "article", source: "OEE.com" }
  ]
});
