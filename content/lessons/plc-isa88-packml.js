LC.lesson({
  id: "plc-isa88-packml",
  title: "ISA-88 and the PackML state model",
  track: "plc",
  minutes: 25,
  level: 3,
  prereqs: ["plc-state-machines"],
  tags: ["isa-88", "packml", "omac", "packtags", "state-model", "equipment-module"],
  summary: "Two standards that give every machine and process cell the same shape: ISA-88 for how plants are modelled, PackML for how a machine behaves.",
  objectives: [
    "Name the levels of the ISA-88 physical model and place a pump skid in it",
    "Distinguish the physical, procedural and process models",
    "List the main PackML modes and states and what each means",
    "Explain what PackTags are and how they feed an MES or Ignition",
    "Map an equipment module onto Logix code (AOI, UDT, state machine)"
  ],

  body: `
## Why standardise the shape of a machine

Every machine builder invents their own idea of "running", "held" and "faulted." That is fine until you have fifteen machines and one OEE dashboard. {{term:isa-88|ISA-88}} (also called S88) and {{term:packml|PackML}} are the two standards integrators reach for to remove that variation. ISA-88 defines the models for batch and process equipment. PackML, formally ISA-TR88.00.02, applies the same terminology to packaging and discrete machines with a fixed set of states and tags.

## The ISA-88 physical model

The physical model is a hierarchy of equipment. ISA-88 uses the upper levels as an enterprise view, and the lower levels are where PLC code lives.

| Level | Example | Lives in |
|---|---|---|
| Enterprise | The company | Business systems |
| Site | The Dayton plant | Business systems |
| Area | Bulk liquids | MES, SCADA |
| Process cell | Syrup batching line | Controllers, MES |
| Unit | Mix tank T-101 | One controller, one batch at a time |
| Equipment module | Transfer pump with valves | Controller code |
| Control module | One valve with limit switches | Controller code |

{{diagram:physical}}

A **unit** is the item a batch occupies. It does one thing at a time, so it is often the scope of a state machine. An {{term:equipment-module|equipment module}} is a group of devices that does a defined job, such as "transfer to tank" or "heat to setpoint." A {{term:control-module|control module}} is the smallest group that acts as one device: a valve plus its open and closed switches, or a VFD plus its contactor.

## The procedural model

ISA-88 separates **what equipment exists** from **what you make with it**.

- **Procedure** is the top-level recipe for a product.
- **Unit procedure** is the work done in one unit.
- **Operation** is a group of phases.
- **Phase** is the smallest piece that runs on one unit, such as "Charge Water" or "Mix".

A recipe is a procedure that calls phases with parameters (target 400 L, speed 60 %). The same phases serve many recipes. This is why a plant can change a product without touching PLC code: the recipe is data, the phases are code. The batch side of this is taught in {{lesson:mes-batch}}.

## PackML: a model for machines

PackML comes from the OMAC Packaging Workgroup. {{term:omac|OMAC}} is the users' group of manufacturers that wanted machines from different builders to behave alike. PackML defines **modes** and **states**.

**Modes** say why the machine is running: Production, Maintenance, Manual (and Clean-in-place or Setup in some definitions). A mode selects which states are allowed.

**States** are the 17 PackML states. Some are *acting* states, which do work and end by themselves. Others are *waiting* states, which hold until a command arrives.

| Group | States | Type |
|---|---|---|
| Start up | Resetting, Starting | acting |
| Start up | Stopped, Idle | waiting |
| Production | Execute, Suspending, Unsuspending, Completing | acting |
| Production | Suspended, Complete | waiting |
| Hold | Holding, Unholding | acting |
| Hold | Held | waiting |
| Stop | Stopping | acting |
| Fault | Aborting, Clearing | acting |
| Fault | Aborted | waiting |

The full list is: Stopped, Starting, Idle, Suspended, Execute, Stopping, Aborting, Aborted, Holding, Held, Unholding, Suspending, Unsuspending, Resetting, Completing, Complete, Clearing. Acting states end with "ing" and exit when the work is done. Waiting states sit until a command.

{{diagram:packml}}

Commands move between them: Reset, Start, Stop, Hold, Unhold, Suspend, Unsuspend, Abort, Clear, and a state-complete signal from acting states. A fault does not just stop things. It drives **Aborting**, then **Aborted**, and only a Clear command takes the machine through **Clearing** to Stopped.

## PackTags

{{term:packtags|PackTags}} are the standard tag names and structure that carry the model. The main groups are:

- **Command** (\`Cmd\`): \`UnitMode\`, \`UnitModeChangeRequest\`, \`CntrlCmd\`, \`CmdChangeRequest\`.
- **Status** (\`Status\`): \`UnitModeCurrent\`, \`StateCurrent\`, \`StateRequested\`, \`MachSpeed\`.
- **Admin** (\`Admin\`): \`StopReason\`, \`AlarmHistory\`, \`ProdProcessedCount\` (product counts, good and defective).

A PackML implementation in Logix usually has a single UDT instance per machine, such as \`PackML_Unit\`, whose \`Status.StateCurrent\` is a DINT. The state number is the same on every machine: 1 Clearing, 2 Stopped, 3 Starting, 4 Idle, 5 Suspended, 6 Execute, 7 Stopping, 8 Aborting, 9 Aborted, 10 Holding, 11 Held, 12 Unholding, 13 Suspending, 14 Unsuspending, 15 Resetting, 16 Completing, 17 Complete. Check your template's table against the document you are working to.

> [!note] Where to get the tags
> Rockwell ships PackML templates and sample code for Logix, and the OMAC site publishes an OPC UA companion specification that defines PackTags as an address space. The standard itself is sold through ISA, and OMAC members get a copy.

## Mapping equipment modules to Logix code

A straightforward structure:

1. One **UDT** per equipment module type holds commands, status, config and alarms.
2. One **AOI** (or a program) per type contains the logic, including its own small state machine.
3. The unit-level routine runs the PackML state model and calls the equipment modules with commands such as "Start" or "Hold."
4. Each module reports back with a status word and a \`Faulted\` flag.

A control module becomes an AOI like \`Valve_2Pos\` or \`Motor_VFD\`. An equipment module (for instance \`Xfer_Pump\`) holds those control modules as members and sequences them. The pattern is the same one used in {{lesson:plc-state-machines}}, with the states fixed by the standard.

## Worked example: filler line stops

A bottle filler runs in Production mode and reaches **Execute** (6). A jam sensor stops infeed. The machine code sets \`CmdChangeRequest\` to Hold, the model moves to **Holding** (10) where the conveyor ramps down, then **Held** (11). The operator clears the jam and sends Unhold. **Unholding** (12) restarts the infeed and returns to Execute. During all this, \`Admin.StopReason\` reads "Infeed jam" and the Ignition OEE screen records Held time as a downtime with a reason. Because the filler, the capper and the labeller all use the same numbers, one Perspective template shows all three.
`,

  eli5: `
Imagine a school where every classroom is built differently and every teacher has their own bell. To know whether a class is in session you have to ask each teacher in their own language.

Now imagine the school adopts one rule book. Every room has the same four lights outside: waiting, working, paused, broken. And every building is described the same way: the campus, the building, the floor, the classroom, the teacher's desk, the pencil.

ISA-88 is the way of describing the whole campus from the top down to the pencil. PackML is the set of four-light signs for each machine, with a few more lights for the in-between moments, like "slowing down to pause." Once everyone uses the same signs, a visitor with a clipboard (the plant dashboard) can walk the whole school without learning each teacher's habits.
`,

  why: `
**Why standardise states at all?** Without a common model, every machine reports "running" differently, and an OEE number is built from a different guess per machine. A shared set of states means availability, performance and quality come from the same definitions across the plant. The goal is comparable data, not elegant code.

**Why acting and waiting states?** Stopping a machine safely takes time: conveyors ramp down, a cut finishes, product is cleared. Acting states give that work a home, and the model tells the supervisory system that the machine is in transition. Without them, "stopped" means "someone pulled the plug."

**Why separate Aborting from Stopping?** A fault is different from a planned stop. Aborting drives the machine to a safe condition as fast as possible, and Aborted can only be left through a deliberate Clear. This keeps a fault from being masked by a restart command.

**What integrators argue about.** Some teams apply the full 17-state model to machines that never need Suspended or Completing. Others strip it down to the minimum set. The pragmatic view: keep the state numbers and tag names standard, implement the states that matter, and make the unused ones pass through. Another argument is how far down ISA-88 should go. Fully batch-oriented sites model every valve as a control module. Packaging sites often stop at the machine level, with PackML as the only part used. Match the standard to what the MES will consume, as discussed in {{lesson:mes-batch}}.
`,

  history: `
ISA-88 (ANSI/ISA-88.00.01) grew out of the batch control work of the late 1980s and 1990s, adopted internationally as IEC 61512. The OMAC group created PackML in the early 2000s to give packaging machines a common state model, and ISA published it as ISA-TR88.00.02 (revised in 2015 with a minimum set of PackTags and states, and again in 2022).
`,

  examples: [
    {
      title: "Placing a pump skid in the physical model",
      body: `A transfer skid has pump P-201, inlet valve XV-201A, outlet valve XV-201B and a flow meter. The skid is an **equipment module** (\`Xfer_Skid\`). Each valve with its limit switches is a **control module** (\`Valve_2Pos\` AOI). The pump with its starter is another control module. The tank T-101 that receives is a **unit**, and the skid belongs to that unit.`
    },
    {
      title: "Mapping StateCurrent for Ignition",
      body: `Read \`[Line1]Filler.Status.StateCurrent\` as a DINT. In Perspective use a map to colour the status: 6 Execute green, 11 Held amber, 9 Aborted red, 4 Idle grey. The same view works on every PackML machine, so you build it once as a template.`
    }
  ],

  diagrams: {
    physical: `<svg viewBox="0 0 640 240" role="img" aria-label="ISA-88 physical model hierarchy from enterprise down to control module">
  <rect class="dg-box" x="20" y="20" width="200" height="30" rx="4"/>
  <text class="dg-text-sm" x="32" y="40">Enterprise</text>
  <rect class="dg-box" x="50" y="58" width="200" height="30" rx="4"/>
  <text class="dg-text-sm" x="62" y="78">Site</text>
  <rect class="dg-box" x="80" y="96" width="200" height="30" rx="4"/>
  <text class="dg-text-sm" x="92" y="116">Area</text>
  <rect class="dg-box" x="110" y="134" width="200" height="30" rx="4"/>
  <text class="dg-text-sm" x="122" y="154">Process cell</text>
  <rect class="dg-box-accent" x="140" y="172" width="200" height="30" rx="4"/>
  <text class="dg-text-sm" x="152" y="192">Unit</text>
  <rect class="dg-box-accent" x="170" y="208" width="200" height="26" rx="4"/>
  <text class="dg-text-sm" x="182" y="226">Equipment module</text>
  <rect class="dg-box-accent" x="400" y="208" width="220" height="26" rx="4"/>
  <text class="dg-text-sm" x="412" y="226">Control module</text>
  <text class="dg-text-muted" x="360" y="40">Business view</text>
  <text class="dg-text-muted" x="400" y="190">PLC code lives here</text>
</svg>`,
    packml: `<svg viewBox="0 0 640 230" role="img" aria-label="Simplified PackML flow: Stopped, Resetting, Idle, Starting, Execute, with Holding and Held, and Aborting to Aborted">
  <defs>
    <marker id="plc-isa88-packml-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="30" width="90" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="65" y="55">Stopped</text>
  <rect class="dg-box" x="140" y="30" width="90" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="185" y="55">Resetting</text>
  <rect class="dg-box" x="260" y="30" width="90" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="305" y="55">Idle</text>
  <rect class="dg-box" x="380" y="30" width="90" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="425" y="55">Starting</text>
  <rect class="dg-box-ok" x="500" y="30" width="100" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="550" y="55">Execute</text>
  <line class="dg-line" x1="110" y1="50" x2="138" y2="50" marker-end="url(#plc-isa88-packml-ah)"/>
  <line class="dg-line" x1="230" y1="50" x2="258" y2="50" marker-end="url(#plc-isa88-packml-ah)"/>
  <line class="dg-line" x1="350" y1="50" x2="378" y2="50" marker-end="url(#plc-isa88-packml-ah)"/>
  <line class="dg-line" x1="470" y1="50" x2="498" y2="50" marker-end="url(#plc-isa88-packml-ah)"/>
  <rect class="dg-box-warn" x="380" y="110" width="90" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="425" y="135">Holding</text>
  <rect class="dg-box-warn" x="500" y="110" width="100" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="550" y="135">Held</text>
  <line class="dg-line" x1="550" y1="72" x2="550" y2="108" marker-end="url(#plc-isa88-packml-ah)"/>
  <line class="dg-line" x1="498" y1="130" x2="472" y2="130" marker-end="url(#plc-isa88-packml-ah)"/>
  <rect class="dg-box-alarm" x="140" y="180" width="90" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="185" y="205">Aborting</text>
  <rect class="dg-box-alarm" x="260" y="180" width="90" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="305" y="205">Aborted</text>
  <line class="dg-line" x1="230" y1="200" x2="258" y2="200" marker-end="url(#plc-isa88-packml-ah)"/>
  <text class="dg-text-muted" x="380" y="205">Clear, then Clearing, then Stopped</text>
  <text class="dg-text-muted" x="20" y="130">Acting states end by themselves.</text>
  <text class="dg-text-muted" x="20" y="148">Waiting states need a command.</text>
</svg>`
  },

  pitfalls: [
    "Treating the physical model as a rigid org chart. It is a naming convention, so use only the levels you need.",
    "Starting every project with all 17 states fully built when only 8 are used.",
    "Putting recipe values inside the phase code, which forces a program change for every product.",
    "Letting each machine renumber the states. The numbers and tag names are the whole point.",
    "Clearing a fault by jumping straight to Execute, bypassing Aborted and Clearing."
  ],

  keyTerms: ["isa-88", "packml", "omac", "packtags", "equipment-module", "control-module", "acting-state"],

  quiz: [
    {
      q: "A valve with an open and a closed limit switch is best described in ISA-88 as a:",
      options: ["Unit", "Equipment module", "Control module", "Process cell"],
      answer: 2,
      explain: [
        "A unit is a larger item such as a tank that holds a batch.",
        "An equipment module groups several devices to do a job.",
        "Correct. A control module is the smallest group acting as one device.",
        "A process cell is a whole line or group of units."
      ]
    },
    {
      q: "What does it mean that Stopping is an acting state?",
      options: ["It waits for an operator command", "It does work and exits by itself when done", "It can only be entered by a fault", "It has no outputs"],
      answer: 1,
      explain: [
        "That describes a waiting state.",
        "Correct. Acting states run a task, such as ramping down, then signal complete.",
        "Faults go to Aborting, not Stopping.",
        "Acting states drive outputs, which is their purpose."
      ]
    },
    {
      q: "Why does PackML separate Aborting and Aborted from Stopping and Stopped?",
      options: ["Faults need a fast route to a safe state and a deliberate Clear", "To use more state numbers", "Stopping is for the HMI only", "ISA-88 requires it for batch"],
      answer: 0,
      explain: [
        "Correct. A fault is not a planned stop, and a restart command should not hide it.",
        "The number of states is a result, not the reason.",
        "Stopping is a real machine state.",
        "The abort distinction is part of PackML, not a batch requirement."
      ]
    },
    {
      q: "In the procedural model, which element is the smallest that runs on a single unit?",
      options: ["Procedure", "Unit procedure", "Operation", "Phase"],
      answer: 3,
      explain: [
        "The procedure is the top level for the whole product.",
        "A unit procedure is the work for one unit, built from operations.",
        "An operation is a group of phases.",
        "Correct. A phase such as Charge Water is the smallest piece."
      ]
    },
    {
      q: "You need one Perspective status template for ten machines from different builders. What makes that possible?",
      options: ["Using the same PLC brand", "Every machine exposing the standard StateCurrent numbers and PackTag names", "Running all the machines in Production mode", "Polling faster"],
      answer: 1,
      explain: [
        "Brand does not decide what the numbers mean.",
        "Correct. Common state numbers and tag names let one view serve every machine.",
        "Mode says why the machine is running, not how it reports.",
        "Poll rate does not solve inconsistent definitions."
      ]
    }
  ],

  resources: [
    { title: "PackML (overview and state model)", url: "https://en.wikipedia.org/wiki/PackML", type: "article", source: "Wikipedia" },
    { title: "ISA-TR88.00.02-2022 table of contents and foreword", url: "https://www.isa.org/getmedia/d185b772-9266-43a4-8f43-31b623c6eb23/tr_880002_toc.pdf", type: "standard", source: "ISA" },
    { title: "ISA Approves Next Generation ANSI/ISA-TR88.00.02-2015 with PackML", url: "https://omac.org/isa-approves-next-generation-ansiisa-tr88-00-02-2015-with-packml/", type: "article", source: "OMAC" },
    { title: "PackTags in an OPC UA server implementation guide", url: "https://omac.org/workgroups/packtags-in-an-opc-ua-server-implementation-guide", type: "standard", source: "OMAC" },
    { title: "PackML", url: "https://www.omac.org/packml", type: "docs", source: "OMAC" }
  ]
});
