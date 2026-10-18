LC.lesson({
  id: "mes-batch",
  title: "Batch control: ISA-88 models",
  track: "mes",
  minutes: 15,
  level: 3,
  prereqs: ["mes-what", "plc-isa88-packml"],
  tags: ["isa-88", "batch", "recipes", "phases", "batch-records"],
  summary: "How ISA-88 splits batch manufacturing into equipment, procedures and recipes, and where the logic should live.",
  objectives: [
    "Name the levels of the ISA-88 physical and procedural models",
    "Explain general, site, master and control recipes and what each one is for",
    "Decide what belongs in PLC phase logic and what belongs in the batch engine",
    "Describe what a batch record contains and why it must be complete",
    "Explain how batch control differs from discrete and PackML-style machine control"
  ],

  body: `
## What batch control is

A batch process makes a finite quantity of material by following a recipe: charge ingredients, heat, hold, cool, transfer, clean. Paint, food, pharmaceuticals, chemicals and beverages all work this way. Each batch has its own ID, its own lot numbers and its own history, and the same equipment is often reused for many different products.

{{term:isa-88|ISA-88}} (also IEC 61512) is the standard vocabulary for this. It does not tell you what software to buy. It gives everyone, from the process engineer to the PLC programmer to the auditor, the same words for equipment, procedures and recipes. If you have read {{lesson:plc-isa88-packml}}, you have seen the equipment half. This lesson adds the recipe half.

## The key idea: separate the recipe from the equipment

Before ISA-88, a recipe was often hardcoded inside PLC logic. Changing a hold time meant editing and re-testing a program, and every new product meant a new program. ISA-88 splits the problem in two:

- **Equipment** knows how to do things: heat, agitate, transfer, dose. It is built and validated once.
- **Recipes** say what to do, in what order, with which numbers. They are data that process people can edit and approve.

Everything else in the standard follows from this split.

## The physical model

The {{term:physical-model|physical model}} is a hierarchy of equipment. The upper levels are about organization, the lower ones are what you actually wire.

| Level | Meaning | Example |
|---|---|---|
| Enterprise | The company | Meridian Foods |
| Site | A location | Plant1 (Chicago) |
| Area | A section of the site | Area10 (Batching) |
| {{term:process-cell|Process cell}} | Equipment that makes batches together | Line1 (sauce line) |
| {{term:isa88-unit|Unit}} | Equipment that holds one batch at a time | Cook kettle TK-101 (TK101 in the PLC) |
| {{term:equipment-module|Equipment module}} | Devices that do a defined job | Steam jacket control |
| Control module | Basic device control | Steam valve with its feedback |

Most integrators spend their time on the bottom three. A unit is the key concept: **one batch occupies one unit at a time**, and the unit is what a recipe step is assigned to.

## The procedural model

The {{term:procedural-model|procedural model}} is the same nesting idea applied to the recipe.

| Level | What it is | Example |
|---|---|---|
| Procedure | The whole recipe | Make tomato sauce |
| {{term:unit-procedure|Unit procedure}} | Work done on one unit | Cook in TK-101 |
| Operation | A major action inside it | Heat and hold |
| {{term:equipment-phase|Phase}} | One equipment-level task | Heat to setpoint |

{{diagram:models}}

A phase takes parameters. "Heat to setpoint" receives a target temperature. "Hold" receives a time. The phase runs in the equipment, reports its state, and finishes. The recipe never reaches inside a phase to open a valve.

> [!note] Levels can be skipped
> The standard allows some levels to be omitted. A small system might have a procedure made directly of phases. Don't force four levels on a simple process.

## Recipe types

ISA-88 defines four recipe types, each more specific than the last.

| Type | Written for | Contains | Typical author |
|---|---|---|---|
| {{term:general-recipe|General}} | The company | Ingredients and process steps, no equipment | Corporate R&D |
| {{term:site-recipe|Site}} | One site | Local materials and regulations | Site process engineering |
| {{term:master-recipe|Master}} | One process cell | Equipment-specific phases, parameters, ranges | Process engineer |
| {{term:control-recipe|Control}} | One batch | Master copy plus batch size, lot numbers, assigned units | The batch engine, automatically |

In day-to-day system work you only touch two. The **master recipe** is the approved template. The **control recipe** is created when an operator starts a batch: the system copies the master, scales the quantities, assigns units and runs it. Editing the master afterwards must not change a batch already running, which is the whole reason for the copy.

A recipe also separates the **procedure** from the {{term:batch-recipe-formula|formula}}. The formula holds the numbers (amounts, temperatures, times). Keeping them apart lets one procedure serve many products by swapping formulas.

## Where does the logic live?

This is the design decision you will argue about on every batch project.

**Phase logic in the PLC.** Each phase is a small state machine, usually modeled on the PackML-like states you met earlier: Idle, Running, Held, Complete, Aborted. The PLC owns safety, interlocks, device sequencing and fast control. A phase exposes a command word, a status word and a block of parameters (setpoints in, results out).

**Recipe execution in the batch engine.** The batch engine (Ignition with a batch module, or a dedicated batch system) reads the control recipe, picks the next phase, writes its parameters, issues Start, watches for Complete, then moves on. It also handles operator prompts, approvals, material tracking and the record.

| Concern | PLC phase logic | Batch engine |
|---|---|---|
| Valve and motor sequencing | Yes | No |
| Interlocks and safety | Yes | No |
| Order of steps in the recipe | No | Yes |
| Parameter values | Receives them | Supplies them |
| Operator prompts, signatures | No | Yes |
| Batch record | Reports values | Writes the record |
| Runs if the server is down | Current phase finishes safely | Stops advancing |

> [!why] The rule of thumb
> If it would be dangerous or damaging for the step to wait for a server round trip, it belongs in the PLC. If it is a business or product decision that changes with the recipe, it belongs in the engine.

## A worked example: one phase handshake

Phase \`Heat_01\` in the kettle PLC exposes these tags:

\`\`\`text
TK101.Heat.Cmd             1=Start 2=Hold 3=Restart 4=Stop 5=Abort 6=Reset
TK101.Heat.State           0=Idle 1=Running 2=Held 3=Complete 4=Aborted 5=Faulted
TK101.Heat.Par.TargetTemp  REAL   deg C (input from batch engine)
TK101.Heat.Par.HoldTime    REAL   minutes (input)
TK101.Heat.Rpt.PeakTemp    REAL   deg C (output to the batch record)
\`\`\`

The engine executes the step "Heat to 82 C, hold 20 min":

1. Check \`State = Idle\` (anything else, wait or raise an error).
2. Write \`TargetTemp = 82.0\` and \`HoldTime = 20\`.
3. Write \`Cmd = 1\` (Start). The PLC clears the command and moves to Running.
4. Watch \`State\`. On 3 (Complete), read \`PeakTemp\` into the batch record and advance. On 5 (Faulted), stop the recipe and prompt the operator.

{{diagram:handshake}}

If the engine host reboots at minute 8, the PLC keeps controlling temperature and holding. When the engine reconnects, it reads \`State\`, sees Running, and resumes waiting rather than starting again. That recovery behavior is why phases are state machines and not one-shot commands.

## The batch record

The {{term:batch-record|batch record}} is the evidence. For a regulated product (food safety, pharma, cosmetics) it is the document that lets you release or reject the batch. A complete record holds:

- Batch ID, product, recipe name **and version**, start and end times.
- Material lots consumed and quantities (target and actual).
- Every phase: start and end time, parameters sent, results returned.
- Operator prompts, entries, and electronic signatures.
- Alarms, holds, aborts and deviations, with who did what.

Two properties matter. It must be written **as the batch runs**, not reconstructed afterwards, and it must be **tamper-evident**: changes are appended and attributed, never overwritten. Store it in a relational database (see {{lesson:db-schema}}), with the process values for trends pulled from the historian by batch start and end time.

## How this differs from discrete and PackML control

Discrete machine control (a packaging line, a conveyor system) is about running a machine continuously at speed. The PackML state model (Idle, Execute, Held, Aborted and so on) describes one machine's state, and the product rarely changes the program. {{term:packml|PackML}} also came from ISA-88 ideas but concentrates on the machine, not the recipe.

| | Discrete / PackML | Batch (ISA-88) |
|---|---|---|
| Unit of work | Parts per minute | A batch with an ID |
| Variation between runs | Few settings | Different procedure and formula per product |
| Timeline | Continuous, repeating cycle | Sequence of steps with a start and end |
| History needs | Counts, downtime, OEE | Full traceable record per batch |
| Key software | MES for OEE and downtime | Batch engine, recipe management, record |

Real plants mix both. A bottling plant has a batch syrup room feeding a discrete filling line. The syrup is ISA-88; the filler is PackML; the MES ties the two together by lot.
`,

  eli5: `
Think about a big family dinner. The cookbook has a recipe for lasagna written for any kitchen in the world. Your family has a version adapted for your town's ingredients. The card taped inside your cupboard is written for your exact oven and pots. Tonight, you photocopy that card, scribble "double batch, Aunt May's tomatoes" on it, and cook from the copy.

Those are the four recipe types: general, site, master and control. The card in the cupboard never gets scribbled on, only the photocopy does.

Now the kitchen itself. You have a pot, and the pot knows how to do a few things: heat, stir, pour. You don't rebuild the stove for every dish. You just say "heat to 80 degrees and stir for ten minutes." That instruction is a phase, and the stove's own controls do the work safely. The recipe only says which instruction comes next.

At the end you write a diary entry: what went in, how hot it got, and who tasted it. That's the batch record, and the health inspector may ask to see it.
`,

  why: `
**Why separate recipe from equipment?** Because the two change at different speeds and need different approvals. A new product should not require re-validating motor and valve logic, and a PLC change should not silently alter a product. When the split is clean, a process engineer can add a product in an afternoon. When it is not, every product launch becomes a PLC project.

**Why keep phase logic in the PLC?** A batch engine runs on a server that gets patched, rebooted and disconnected. If the engine was driving valves step by step, a network blip would stop a reaction halfway. Phases with their own state machines keep the process safe by themselves and let the engine recover by reading state.

**Why argue about phase size?** Experienced integrators disagree on granularity. Coarse phases ("Make the slurry") are easy to program but inflexible and hard to reuse. Fine phases ("Open valve") are flexible, but they push so much sequencing into the engine that you rebuild the problem ISA-88 was trying to remove. A good phase is something an operator would name: charge, heat, hold, transfer.

**Why the full record?** In regulated plants a missing record can mean a rejected batch or a recall. Even in unregulated plants, the first customer complaint about a lot makes the record worth the effort. The cost is design time: record what you will need to answer questions you can't yet predict.

**Why not always buy a batch system?** Full batch packages are expensive and heavy for a plant that makes four products with simple steps. Many sites use a lighter approach and stay compatible with ISA-88 vocabulary. See {{lesson:mes-sepasoft}} for how one product handles it.
`,

  history: `
ISA-88 grew out of work in the late 1980s to give batch process plants a common language, because every vendor and every site described batches differently. ISA approved the first part in 1995, with an update in 2010. It was adopted internationally as IEC 61512. Later parts cover data structures and batch production records. The standard describes concepts and models, and the ISA's own materials stress that it applies to manual processes too, not only to automated ones.
`,

  examples: [
    {
      title: "Reusing one procedure for two sauces",
      body: `A kettle procedure has three phases: Charge, Heat and hold, Transfer. For marinara the formula is Charge 400 kg, 85 C, 25 min. For arrabbiata it is Charge 380 kg, 90 C, 30 min. Same procedure, same phases, two formulas. The PLC code never changes, and the master recipes differ only in data.`
    },
    {
      title: "A hold during a batch",
      body: `An operator presses Hold at minute 10 of a 20 minute hold phase because a gasket is leaking. The engine writes Cmd=2. The phase moves to Held and the PLC stops the agitator but keeps the jacket temperature. After repair, the operator presses Restart (Cmd=3), the hold timer resumes from 10 minutes elapsed, and the batch record shows the hold event with the operator and reason.`
    }
  ],

  diagrams: {
    models: `<svg viewBox="0 0 640 260" role="img" aria-label="ISA-88 physical model on the left nesting from site down to control module; procedural model on the right from procedure down to phase, with the phase linking to an equipment module">
  <text class="dg-title" x="20" y="24">Physical model</text>
  <text class="dg-title" x="340" y="24">Procedural model</text>
  <rect class="dg-box" x="20" y="36" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="32" y="58">Enterprise / Site / Area</text>
  <rect class="dg-box" x="20" y="78" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="32" y="100">Process cell</text>
  <rect class="dg-box" x="20" y="120" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="32" y="142">Unit (holds one batch)</text>
  <rect class="dg-box-accent" x="20" y="162" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="32" y="184">Equipment module</text>
  <rect class="dg-box" x="20" y="204" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="32" y="226">Control module (valve, motor)</text>
  <rect class="dg-box" x="340" y="36" width="280" height="34" rx="4"/>
  <text class="dg-text-sm" x="352" y="58">Procedure (whole recipe)</text>
  <rect class="dg-box" x="340" y="78" width="280" height="34" rx="4"/>
  <text class="dg-text-sm" x="352" y="100">Unit procedure (on one unit)</text>
  <rect class="dg-box" x="340" y="120" width="280" height="34" rx="4"/>
  <text class="dg-text-sm" x="352" y="142">Operation</text>
  <rect class="dg-box-accent" x="340" y="162" width="280" height="34" rx="4"/>
  <text class="dg-text-sm" x="352" y="184">Phase (runs in the PLC)</text>
  <line class="dg-line-accent" x1="280" y1="179" x2="340" y2="179" stroke-dasharray="4 3"/>
  <text class="dg-text-muted" x="352" y="224">The phase is where recipe meets equipment.</text>
</svg>`,
    handshake: `<svg viewBox="0 0 640 220" role="img" aria-label="Batch engine and PLC phase exchange: write parameters, start command, running state, complete state, read results">
  <marker id="mes-batch-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker>
  <rect class="dg-box-accent" x="40" y="20" width="150" height="40" rx="4"/>
  <text class="dg-text dg-mid" x="115" y="45">Batch engine</text>
  <rect class="dg-box" x="450" y="20" width="150" height="40" rx="4"/>
  <text class="dg-text dg-mid" x="525" y="45">PLC phase</text>
  <line class="dg-line-thin" x1="115" y1="60" x2="115" y2="205"/>
  <line class="dg-line-thin" x1="525" y1="60" x2="525" y2="205"/>
  <line class="dg-line" x1="115" y1="85" x2="525" y2="85" marker-end="url(#mes-batch-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="79">1. Write parameters (TargetTemp, HoldTime)</text>
  <line class="dg-line" x1="115" y1="115" x2="525" y2="115" marker-end="url(#mes-batch-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="109">2. Cmd = Start</text>
  <line class="dg-line" x1="525" y1="145" x2="115" y2="145" marker-end="url(#mes-batch-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="139">3. State = Running ... Complete</text>
  <line class="dg-line" x1="525" y1="180" x2="115" y2="180" marker-end="url(#mes-batch-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="174">4. Read results (PeakTemp) into the batch record</text>
</svg>`
  },

  pitfalls: [
    "Hardcoding product numbers inside PLC phases, which brings back the one-program-per-product problem.",
    "Making phases so fine-grained that the batch engine is driving individual valves.",
    "Letting a master recipe edit change a running batch instead of copying it into a control recipe first.",
    "Building the batch record after the fact from historian trends, so it misses operator actions and lot numbers.",
    "Sending Start to a phase without checking it is Idle, which fails confusingly after an abort.",
    "Forgetting to define what happens to the batch if the engine host goes offline mid-phase."
  ],

  keyTerms: ["isa-88", "physical-model", "procedural-model", "unit-procedure", "equipment-phase", "master-recipe", "control-recipe", "batch-record"],

  quiz: [
    {
      q: "An operator starts a batch of tomato sauce. Which recipe type is created at that moment, and what does it hold?",
      options: ["A general recipe with company-wide steps", "A control recipe: a copy of the master with batch size, lots and units assigned", "A site recipe adjusted for local ingredients", "A new master recipe for that batch"],
      answer: 1,
      explain: [
        "General recipes are written once at company level and never executed directly.",
        "Correct. The control recipe is the executable copy for one batch, so later edits to the master cannot disturb it.",
        "Site recipes adapt a general recipe to a location. They are authored ahead of time.",
        "Masters are the approved templates. Starting a batch makes a copy and leaves the master untouched."
      ]
    },
    {
      q: "Where should valve sequencing for a Heat phase and its interlocks live?",
      options: ["In the PLC phase logic", "In the batch engine, so it is all in one place", "In the master recipe as extra steps", "In the batch record database"],
      answer: 0,
      explain: [
        "Correct. The PLC owns fast control and safety so the phase stays safe if the engine is unavailable.",
        "A server reboot or network drop would leave the process half-controlled.",
        "Recipes describe order and parameters at phase level. Device sequencing is equipment behavior.",
        "The database stores records. It does not run equipment."
      ]
    },
    {
      q: "Which of these is a unit in the ISA-88 physical model?",
      options: ["A single steam valve", "Plant1 (the whole site)", "A kettle that holds one batch at a time", "A step in the recipe called Heat"],
      answer: 2,
      explain: [
        "A valve with its feedback is a control module.",
        "A location like a plant is a site.",
        "Correct. A unit is the vessel-level equipment that processes one batch at a time.",
        "A recipe step is part of the procedural model, not the physical model."
      ]
    },
    {
      q: "A recipe says 'Heat and hold' and that action contains phases for ramp and hold. At what procedural level is 'Heat and hold'?",
      options: ["Procedure", "Unit procedure", "Phase", "Operation"],
      answer: 3,
      explain: [
        "The procedure is the whole recipe.",
        "A unit procedure is the work for one unit, which contains several operations.",
        "Phases are the leaf level that equipment executes. This item contains phases.",
        "Correct. Operations sit between unit procedure and phase and group phases into a major action."
      ]
    },
    {
      q: "The batch engine host reboots in the middle of a 20 minute hold phase. What is the best behavior?",
      options: ["The PLC aborts the phase immediately", "The PLC phase continues and the engine, once back, reads the phase state and resumes waiting", "The engine restarts the phase from the beginning", "The batch record is discarded"],
      answer: 1,
      explain: [
        "Aborting would waste material for an infrastructure problem.",
        "Correct. A phase that is its own state machine keeps controlling, and the engine recovers by reading state.",
        "Restarting would double the hold time and break the record.",
        "Records should be written continuously so a reboot loses nothing already stored."
      ]
    },
    {
      q: "What is the main difference between a PackML-style machine and an ISA-88 batch process?",
      options: ["PackML has no states", "ISA-88 only applies to manual processes", "A batch has its own ID, a recipe-driven sequence and a per-batch record, while a packaging machine mostly runs a repeating cycle", "Batch processes cannot use PLCs"],
      answer: 2,
      explain: [
        "PackML defines a state model with states such as Idle, Execute and Held.",
        "ISA-88 applies to manual and automated processes alike.",
        "Correct. Batch work is recipe and record centered, discrete work is rate and uptime centered.",
        "Most batch plants use PLCs for phase logic."
      ]
    }
  ],

  resources: [
    { title: "ISA-88 Series of Standards: Batch Process Control", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-88-standards", type: "standard", source: "ISA" },
    { title: "ISA-88 (overview of models and recipe types)", url: "https://en.wikipedia.org/wiki/ISA-88", type: "article", source: "Wikipedia" },
    { title: "PackML with comparison to S88", url: "https://en.wikipedia.org/wiki/PackML_(with_comparison_to_S88)", type: "article", source: "Wikipedia" },
    { title: "Training: Batch Control Using the ISA-88 Standards (IC40)", url: "https://www.isa.org/training/course-description/ic40", type: "course", source: "ISA" },
    { title: "Batch Procedure (Sepasoft documentation)", url: "https://docs.sepasoft.com/articles/user-manual/batch-procedure", type: "docs", source: "Sepasoft" },
    { title: "Batch Procedure Phases (Sepasoft documentation)", url: "https://docs.sepasoft.com/articles/user-manual/Batch-Procedure-Phases", type: "docs", source: "Sepasoft" }
  ]
});
