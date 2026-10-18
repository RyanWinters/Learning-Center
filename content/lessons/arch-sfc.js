LC.lesson({
  id: "arch-sfc",
  title: "The SFC module",
  track: "arch",
  minutes: 20,
  level: 3,
  prereqs: ["ign-scripting", "plc-state-machines"],
  tags: ["sfc", "sequencing", "batch", "state-machine", "safety"],
  summary: "Graphical sequences that run on the Gateway, and the line you must not cross between gateway sequencing and PLC control.",
  objectives: [
    "Describe steps, transitions, parallel branches and enclosing steps",
    "Explain chart scope and how a chart receives start parameters",
    "Start, monitor and cancel charts from scripts and screens",
    "Decide what belongs in a Gateway SFC and what belongs in the PLC",
    "Name the main design rules for reliable charts"
  ],

  body: `
## What it is

The SFC module runs sequential function charts on the Gateway. You draw a flowchart of steps and transitions in the Designer, each step runs actions (write tags, run scripts, call other charts), and the chart advances when a transition's condition is true. Use it for multi-step procedures that are awkward as a pile of scripts: recipe downloads, batch-style sequences, startup routines, data collection routines and operator-guided procedures.

It is related to, but not the same as, the SFC language in IEC 61131-3 PLCs (see {{lesson:plc-languages}}). Ignition's SFC runs in the Gateway's JVM, not in a deterministic PLC scan. Its timing is not guaranteed and must be measured on the real system.

## Chart elements

| Element | What it does |
|---|---|
| **Begin / End step** | Mark the start and finish. End steps can't be inside parallel sections (verify in the SFC manual for your version) |
| **{{term:sfc-step|Action step}}** | Runs an action, usually a script, when entered. Can have a timeout, and can be set to run on start, on stop or on a timer (verify the options in the SFC manual for your version) |
| **{{term:sfc-transition|Transition}}** | A boolean expression. The chart waits until it is true. When several transitions leave a step, the leftmost true one wins (verify in the manual) |
| **Parallel** | Splits into branches that run together and wait at the sync until all finish. A cancel condition can stop the rest early |
| **Branching** | Several transitions leaving one step choose a path |
| **{{term:sfc-enclosing-step|Enclosing step}}** | Runs another chart on the same Gateway and waits for it to finish |

{{diagram:chart}}

Waiting is the job of a transition, not an action. A step that sits in \`time.sleep()\` blocks a thread and hides what the chart is waiting for. Put the wait in the transition: \`{[default]Plant1/Area10/Line1/LT101/Level} > 3.5\`.

## Chart scope

{{term:sfc-chart-scope|Chart scope}} variables belong to one running instance of a chart. The begin step defines them and gives their defaults, and the **start parameters** you pass when launching overwrite them. Every step and transition in that instance reads and writes the same scope. Two instances of the same chart run independently with separate values.

There are also higher scopes. Parameters from an enclosing chart can be passed down, and values can reach the enclosed chart by parameter. Prefer passing explicit parameters over reading tags you don't need to, so a chart is testable and reusable.

## Starting and monitoring charts

Charts are started from a script. In a script, the \`system.sfc\` functions start a chart by its path and a dictionary of start parameters, cancel it, pause it, and read its state. The Designer has a chart monitor view and an SFC status in the Gateway web page, showing which step each instance is on.

\`\`\`python
# From a button in the client or a gateway event
params = {"recipe": "R42", "batchSize": 500}
instanceId = system.sfc.startChart("Batches/MixAndFill", params)
\`\`\`

Verify exact function names and signatures in the 8.3 \`system.sfc\` documentation before copying this. Build the screen around a status tag or the chart's instance state, so operators see where a sequence is.

## What belongs in the PLC

An Ignition SFC is a convenient place for sequencing, but it is not a safe place for control that protects people or equipment. Gateway sequencing depends on a computer, an OS, a JVM, a network and a database. A Gateway restart, a patch, a lost connection or a scripting error stops the chart. A redundant-pair failover is a restart from the chart's point of view: the instance running on the failed node does not simply carry on at the same step on the other node, so design the chart to be restartable and check what your version restores (see {{lesson:arch-redundancy}}). The equipment keeps doing whatever its last command was.

> [!warning] Safety and fast control stay in the PLC
> Interlocks, permissives, e-stop handling, anything that has to stop a motor or close a valve within a scan or two, and any sequence where a half-completed run can hurt someone or break something, belong in the PLC. Use a safety-rated PLC where required (see {{lesson:plc-safety}}). The PLC should do the right thing if the Gateway disappears.

A practical split:

| In the PLC | In an Ignition SFC |
|---|---|
| Equipment states and interlocks (see {{lesson:plc-state-machines}}) | Recipe selection and download |
| Fast sequencing: fill, drain, mix with timed steps | Coordinating several units, operator prompts |
| Fault handling and safe state on loss of comms | Logging, data collection, report triggers |
| Anything under {{term:iec-61131-3|IEC 61131-3}} safety rules | Cross-unit scheduling and production tracking |

The Gateway SFC *requests* a state ("Run recipe R42"), and the PLC state machine *performs* it and reports back. Charts then wait on status tags, with timeouts.

> [!example] Batch with PLC-owned equipment
> The chart writes recipe values to the PLC, sets \`Mixer.Cmd = Start\`, and waits on a transition \`{Mixer.Sts} == "Running"\`. A timeout of 30 seconds leads to a fault branch that notifies the operator. The PLC owns the mixer's interlocks. If the Gateway dies mid-batch, the PLC drops to its own safe or hold state and the chart resumes or is restarted after recovery.

## Design rules

1. Keep each step small. A step with 80 lines of script is hiding logic.
2. Give every wait a timeout and a fault path.
3. Make charts restart-safe. Decide what happens to running instances after a Gateway restart and test it.
4. Handshake with the PLC. Command, wait for status, then clear the command. Never fire and forget.
5. Reuse sub-charts through enclosing steps instead of copying steps.
6. Log each step entry with an instance ID so you can reconstruct a run.
`,

  eli5: `
A recipe card says: first melt the butter, then, once it's melted, add the flour, then stir until it's thick, then pour it into the pan. You do one thing at a time, and you only move on when the thing you're waiting for has happened.

An SFC is a recipe card for a machine. Each box is a "do this" step. Between the boxes are gates that only open when something is true, like "butter is melted". Some recipes have parts you can do at the same time, like chopping onions while the water boils, and you can't plate the dish until both are done.

The card also has its own notepad ("how much flour is this batch?") that only that cooking session uses.

Now the important part. The person reading the card is the manager in the office. The actual stove has its own safety rules, like "turn off the gas if the flame goes out". Those rules must live at the stove, not on the manager's card, because if the manager leaves the room, the stove still has to be safe.
`,

  why: `
**Why use SFC at all?** A sequence written as scattered tag-change scripts and timers is hard to read and harder to debug. Nobody can tell what step it is on. A chart shows the sequence, the current step and what it is waiting for. That visibility is the reason, more than the execution model.

**Why transitions do the waiting?** The chart engine can evaluate conditions efficiently and show you the blocking condition. A sleep inside a step hides it and ties up a thread. Operators and maintenance staff can read a transition expression and see why a batch is stuck.

**Why keep safety logic out?** The Gateway is a general-purpose server on a general-purpose OS. It gets patched, restarted, and sometimes lags. A PLC scans on a known cycle and has deterministic behavior. Standards like IEC 62061 and ISO 13849 expect protective functions to be implemented as a suitably rated safety function, not in a general-purpose Gateway. Beyond standards, there is the plain failure story: a sequence in the Gateway commands a valve open, the Gateway restarts, nothing commands it closed. Design so the default on loss of the Gateway is safe.

**What integrators argue about.** How much sequencing the Gateway should own. Some build batch-style systems entirely in Ignition SFC with the PLC doing only equipment control. Others use the PLC for all sequencing (often with PackML or ISA-88 state models, see {{lesson:plc-isa88-packml}}) and use Ignition only to request and display. The safe middle: the PLC owns anything time-critical, safety-related or needed during a network outage, and the Gateway owns coordination, recipes and records.
`,

  history: `
Sequential function charts descend from the French Grafcet standard of the 1970s and became one of the five IEC 61131-3 languages. Ignition's SFC module brings the same visual idea to Gateway-side sequencing and is positioned for batch-style and procedural work, not for scan-level machine control.
`,

  examples: [
    {
      title: "Parallel fill and heat",
      body: `A chart enters a Parallel element with two branches: one fills Tank 1 to 80 percent, the other heats a jacket to 60 C. Each branch ends in a transition on its own condition. The parallel sync waits for both. A cancel condition of \`{chartScope.abort} == true\` lets an operator button stop the branches early.`
    },
    {
      title: "Handshake with a PLC state machine",
      body: `The chart writes \`M101.Cmd.Start = 1\` (tag \`[default]Plant1/Area10/Line1/M101/Cmd/Start\`) and waits for \`M101.Sts.Running = 1\` with a 20 second timeout. After the next transition it clears the command bit. If the timeout hits, it goes to a fault branch that raises an alarm and stops. The PLC alone decides whether starting is allowed.`
    }
  ],

  diagrams: {
    chart: `<svg viewBox="0 0 640 260" role="img" aria-label="A chart with a begin step, an action step, a transition, a parallel split into two branches, a sync and an end step">
  <defs><marker id="arch-sfc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="100" width="80" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="60" y="127">Begin</text>
  <rect class="dg-box-accent" x="140" y="100" width="100" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="190" y="127">Load recipe</text>
  <line class="dg-line" x1="100" y1="122" x2="138" y2="122" marker-end="url(#arch-sfc-ah)"/>
  <line class="dg-line" x1="240" y1="122" x2="290" y2="122" marker-end="url(#arch-sfc-ah)"/>
  <line class="dg-line" x1="265" y1="108" x2="265" y2="136"/>
  <text class="dg-text-muted" x="232" y="94">ready?</text>
  <line class="dg-line" x1="290" y1="122" x2="330" y2="122"/>
  <line class="dg-line" x1="330" y1="50" x2="330" y2="194"/>
  <rect class="dg-box" x="370" y="30" width="110" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="425" y="55">Fill tank</text>
  <rect class="dg-box" x="370" y="174" width="110" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="425" y="199">Heat jacket</text>
  <line class="dg-line" x1="330" y1="50" x2="368" y2="50" marker-end="url(#arch-sfc-ah)"/>
  <line class="dg-line" x1="330" y1="194" x2="368" y2="194" marker-end="url(#arch-sfc-ah)"/>
  <line class="dg-line" x1="480" y1="50" x2="520" y2="50"/>
  <line class="dg-line" x1="480" y1="194" x2="520" y2="194"/>
  <line class="dg-line" x1="520" y1="50" x2="520" y2="194"/>
  <line class="dg-line" x1="520" y1="122" x2="548" y2="122" marker-end="url(#arch-sfc-ah)"/>
  <rect class="dg-box" x="550" y="100" width="72" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="586" y="127">End</text>
  <text class="dg-text-muted" x="330" y="246">Parallel branch: both run. Sync waits for both.</text>
</svg>`
  },

  pitfalls: [
    "Putting interlocks or safety sequencing in a Gateway chart.",
    "Using sleep inside a step instead of a transition with a timeout.",
    "Firing a PLC command and never checking status.",
    "Not deciding what happens to running chart instances after a Gateway restart.",
    "Packing logic into huge scripts inside one step."
  ],

  keyTerms: ["sfc-step", "sfc-transition", "sfc-chart-scope", "sfc-enclosing-step", "sequential-function-chart", "state-machine", "interlock"],

  quiz: [
    {
      q: "A chart must wait until a tank level exceeds 80 percent. Where does that wait belong?",
      options: ["A sleep loop in an action step", "A transition expression on the level tag, ideally with a timeout path", "A tag change script that starts the next chart", "The begin step"],
      answer: 1,
      explain: [
        "That blocks a thread and hides what the chart is waiting for.",
        "Correct. Transitions are the waiting mechanism and are visible in the monitor.",
        "That scatters the sequence and loses the single chart view.",
        "The begin step only initializes."
      ]
    },
    {
      q: "Which belongs in the PLC rather than in a Gateway SFC?",
      options: ["Selecting a recipe and downloading values", "An interlock that must stop a motor if a guard opens", "Writing a batch record to a database", "Prompting an operator to confirm a step"],
      answer: 1,
      explain: [
        "Recipe handling is a good Gateway task.",
        "Correct. Protective and fast control stays in PLC hardware that keeps working if the Gateway goes away.",
        "Records are a Gateway job.",
        "Operator prompts are Gateway work."
      ]
    },
    {
      q: "What do the parallel sync lines at the bottom of a parallel element do?",
      options: ["Start every branch", "Wait until all branches finish before continuing", "Pick the fastest branch", "Run branches one at a time"],
      answer: 1,
      explain: [
        "The branch lines at the top start them.",
        "Correct. The chart continues once all branches are done, or sooner if a cancel condition fires.",
        "It waits for all, not the fastest.",
        "Branches run together."
      ]
    },
    {
      q: "Two instances of the same chart run at once. What is true of chart scope variables?",
      options: ["They share one set of variables", "Each instance has its own", "Only the first instance can write", "They reset every step"],
      answer: 1,
      explain: [
        "That would make instances interfere.",
        "Correct. Each running instance has independent chart scope.",
        "There is no such restriction.",
        "They persist for the life of the instance."
      ]
    },
    {
      q: "The Gateway restarts mid-sequence while the chart had just commanded a pump to run. What design prevents harm?",
      options: ["A longer chart timeout", "The PLC owns the pump's interlocks and safe state, and the chart only requests actions", "A second chart that polls the first", "Increasing the Gateway memory"],
      answer: 1,
      explain: [
        "A timeout runs on the Gateway that just died.",
        "Correct. The PLC must do the right thing without the Gateway.",
        "A second Gateway chart has the same dependency.",
        "Memory doesn't help a restart."
      ]
    }
  ],

  resources: [
    { title: "Sequential Function Charts (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/sequential-function-charts", type: "docs", source: "Inductive Automation" },
    { title: "SFC Basics (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/sequential-function-charts/SFC-basics", type: "docs", source: "Inductive Automation" },
    { title: "Action Step Best Practices (8.3)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/sequential-function-charts/SFCs-in-action/action-step-best-practices", type: "docs", source: "Inductive Automation" },
    { title: "SFC Elements (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/sequential-function-charts/SFC-elements", type: "docs", source: "Inductive Automation" },
    { title: "Parallel Element video", url: "https://inductiveuniversity.com/videos/parallel-element/8.3", type: "video", source: "Inductive University" },
    { title: "Enclosing Step video", url: "https://inductiveuniversity.com/videos/enclosing-step/8.3", type: "video", source: "Inductive University" }
  ]
});
