LC.lesson({
  id: "plc-aoi",
  title: "Add-On Instructions",
  track: "plc",
  minutes: 25,
  level: 3,
  prereqs: ["plc-udt", "plc-timers"],
  tags: ["aoi", "add-on-instruction", "reuse", "logix", "plantpax", "parameters"],
  summary: "Write the motor logic once, call it fifty times: how Add-On Instructions package logic and data, and the rules that make them safe to share.",
  objectives: [
    "Define an AOI with Input, Output and InOut parameters and local tags",
    "Explain EnableIn, EnableOut and the Logic, Prescan, EnableInFalse and Postscan routines",
    "Choose between an AOI, a UDT and a program for a given piece of reusable work",
    "Describe signatures, revisions and source protection",
    "Explain why AOI definitions are painful to change on a running controller"
  ],

  body: `
## What an AOI is

An {{term:aoi|Add-On Instruction}} (AOI) is a custom instruction you write in Logix Designer. It has a name, parameters, its own private data and its own logic, and once it exists you drop it into a rung like XIC or TON. Each time you use it, you give it a tag of its own, called the **instance**. The logic is shared. The data is per-instance.

That is the whole appeal. Motor control logic (interlock, seal-in, fail-to-start timer, run feedback, fault latch) is identical for 50 motors. Write it once as \`AOI_Motor\`, then call it with 50 different \`UDT_Motor\` tags (\`M101\`, \`M102\`...). Fix a bug in one place and every call gets the fix.

An AOI gives you three things you do not get from copy-pasted rungs: one definition to maintain, a private scope for temporary tags, and a clean interface that hides the internals from callers.

## Parameters

{{diagram:aoi}}

Parameters are the interface. Each has a name, a data type, a **usage** and settings such as Required and Visible.

| Usage | Direction | Passing | Typical use |
|---|---|---|---|
| **Input** | Into the AOI | By value (copied in) | Permissives, setpoints, feedback bits |
| **Output** | Out of the AOI | By value (copied out) | Output command, status bits |
| **InOut** | Both | By reference (pointer to caller's tag) | A whole UDT such as a \`UDT_Motor\`, arrays, structures |

Input and Output copy the value on each call. InOut passes a reference, so the AOI reads and writes the caller's tag directly. That is why the standard pattern puts the equipment UDT, the \`UDT_Motor\` with Cmd/Sts/Cfg/Alm from {{lesson:plc-udt}}, in a single InOut parameter. The AOI has no copy of it, so the HMI-facing data always shows current values.

**Required** parameters must be wired when you place the instruction. **Visible** controls whether the parameter appears on the instruction block in ladder. InOut parameters are always required.

> [!note] Which parameters show on the block
> In ladder, keep the block short. Show the InOut structure and a few wired inputs and outputs (interlock bit, physical feedback, physical output). Hide the rest, and configure them through the instance tag instead.

## Local tags

**Local tags** are private variables inside the AOI instance: timers, one-shot storage, intermediate bits. They live in the instance's data, so each call has its own timers. Callers cannot name them in their own logic, which prevents accidental use. In the HMI they are reachable through the instance tag if you flag them, but treat that as a debugging aid.

Because timers are local tags, an AOI is the correct place for the fail-to-start timer. If you put a TON in a routine and call it in a loop, every motor shares one timer and fails mysteriously.

## EnableIn and EnableOut

Every AOI gets two automatic Boolean parameters. **EnableIn** is true when the rung leading into the AOI is true. **EnableOut** passes the rung forward. Their behavior has two rules:

- Rung true: the **Logic** routine executes and EnableOut follows EnableIn unless your code changes it.
- Rung false: the Logic routine does **not** run. If you defined an **EnableInFalse** routine, that runs instead, and the AOI's outputs are not automatically cleared. Whatever the Logic routine last wrote stays there.

That second point causes a common bug. A motor AOI is called on a rung that goes false (say, the area is disabled). The Run output remains whatever it last was, and the motor keeps running. Either write an EnableInFalse routine that clears outputs, or call the AOI unconditionally and handle disable inside it.

## The four routines

| Routine | When it executes |
|---|---|
| **Logic** | Each scan the rung is true. Required. |
| **Prescan** | Once, when the controller enters Run mode or the program is first scanned. Use for initialization and for setting default configuration. |
| **EnableInFalse** | Each scan the rung is false (EnableIn = 0). |
| **Postscan** | Once, when the program containing the call is unscheduled or the step or action that calls it is deactivated (for example in an SFC). Rarely used. |

Prescan is the one to understand. A rising-edge one-shot needs its stored bit initialized, otherwise an edge could fire on startup. Prescan lets you do it. Reference tags used for the HMI (the Cfg defaults) are another example.

## Scan modes and state

An AOI instance behaves according to which of its routines the controller runs on a given scan: Prescan once on the way into Run, Logic while the rung is true, EnableInFalse while it is false. If an AOI looks frozen while debugging, check the rung feeding it first. Instance tags also expose their own state bits, which is how a faceplate can see \`EnableIn\` and \`EnableOut\`.

{{diagram:scan}}

## A worked example: AOI_Motor

\`\`\`text
AOI_Motor
  InOut  Motor        UDT_Motor   (the house UDT from the UDT lesson)
  Input  Interlock    BOOL    permissive from process logic
  Input  RunFbk       BOOL    auxiliary contact from the starter
  Output RunCmd       BOOL    to the physical output
  Local  FailTmr      TIMER
  Local  StopTmr      TIMER
\`\`\`

Logic, in structured text for readability. Inside the AOI the InOut parameter is called \`Motor\`; when you place the block for motor M101, you wire the tag \`M101\` to it, so \`Motor.Cmd.Start\` here is \`M101.Cmd.Start\` on the controller. Teaching note: the Stop and fault handling below is process logic. The overload and E-stop are hardwired in the starter coil circuit, and the PLC only reads their status (see {{lesson:plc-safety}}).

\`\`\`st
// Ready when nothing blocks starting
Motor.Sts.Ready := Interlock AND NOT Motor.Sts.Fault;

// Start request seals in; stop request or fault drops it
IF Motor.Cmd.Start AND Motor.Sts.Ready THEN
  RunCmd := 1;
END_IF;
IF Motor.Cmd.Stop OR NOT Interlock OR Motor.Sts.Fault THEN
  RunCmd := 0;
END_IF;
Motor.Cmd.Start := 0;   // consume the request
Motor.Cmd.Stop  := 0;

// Fail to start: commanded but no feedback after the configured time
FailTmr.PRE := Motor.Cfg.StartDelay;
FailTmr.TimerEnable := RunCmd AND NOT RunFbk;
TON(FailTmr);
IF FailTmr.DN THEN
  Motor.Alm.FailToStart := 1;
  Motor.Sts.Fault := 1;
END_IF;

Motor.Sts.Running := RunFbk;
IF Motor.Cmd.Reset THEN
  Motor.Alm.FailToStart := 0;
  Motor.Sts.Fault := 0;
  Motor.Cmd.Reset := 0;
END_IF;
\`\`\`

Usage in ladder is a single block per motor:

\`\`\`ladder
XIC(Area10_Enable) AOI_Motor(M101,M101_Interlock,M101_RunFbk,M101_RunOut)
\`\`\`

In the {{sim:sim-udt-motor}} challenge you build the same idea with a motor UDT and a fault. Note one design decision: clearing Cmd.Start inside the AOI means the HMI button acts as a pulse. Many teams prefer that the HMI writes a bit and the PLC consumes it, since a held-high Start bit from a stuck screen would otherwise restart the motor after every fault reset.

## Signatures, revisions and protection

Every AOI definition has a **revision** (major.minor, assigned by you), a **vendor**, a description and a **signature**. The signature is a generated hash of the definition's content. A revision tells humans what version it is. The signature tells the software whether two AOIs with the same name and revision are actually identical. Teams that distribute AOI libraries use the signature to check that the project on the plant floor really runs the approved version.

**Source protection** hides the logic from users. Use it when distributing an AOI you do not want edited, or to stop field changes to a validated routine. Protection is applied with a password. Keep passwords in a vault, not in the AOI description.

You can also export an AOI to an \`.L5X\` file and import it into another project. When two projects hold different revisions, the importer asks which to keep.

## Why you can't edit an AOI online

In most Logix Designer versions, you cannot edit an AOI's logic or definition while online with the controller in the way you can edit a rung. There are reasons. One definition has many instances, and each instance carries data laid out by the definition. Changing parameters or local tags changes the size and layout of every instance. A logic change would also swap running code under 50 live calls at once. Check your version's release notes, since the allowed operations have changed across releases.

The practical rule: finish and test the AOI offline against a simulated or bench controller, bump the revision, and plan the download. If you must change a live AOI, you generally go offline for it. Another consequence is that a field fix to a vendor-supplied AOI is not a ten-minute change, which is also a reason to design a new AOI generously (spare parameters, config flags).

## AOI vs UDT vs program

| | Holds data | Holds logic | Instance count | Use it for |
|---|---|---|---|---|
| **UDT** | Yes | No | Many | The shape of data for one kind of equipment |
| **AOI** | Yes (instance + locals) | Yes | Many | Logic that works on every instance of that equipment |
| **Program** | Yes (program-scoped tags) | Yes (routines) | One per task slot | An area, a unit or a machine (see {{lesson:plc-organization}}) |

They work together: a UDT defines what a motor is, an AOI defines how a motor behaves, and a program holds the equipment of one area and calls the AOI for each. AOIs also nest, up to a limit that depends on the version.

## The PlantPAx library as a model

Rockwell's PlantPAx **Library of Process Objects** is a large set of AOIs (and matching faceplates) for motors, valves, PID loops, analog inputs and more. They show the pattern at scale: consistent InOut command/status structures, built-in alarm handling, modes (operator, program, maintenance) and matching HMI graphics. Even if you never use PlantPAx, reading a few of the objects is a good education in how a mature library handles interlocks, bypass and fault latching. If you do use it, do not modify the objects in place. Treat them as vendor-supplied, wrap them if you need different behavior, and manage library versions deliberately.
`,

  eli5: `
Imagine you run a bakery with a recipe for cookie dough. You could write the full recipe on a sticky note for every cookie tray, but if you ever want to change the sugar amount, you would have to find and rewrite 50 notes.

An Add-On Instruction is one recipe card kept in a binder. Every tray just says "use the cookie recipe" and has its own bowl of dough (that's the data that belongs to that tray). Change the sugar on the card and every future tray follows it.

The card has slots for the things you hand it (eggs, flour), things it hands back (finished dough), and a few things it keeps in its own private bowl (a kitchen timer). It also has special instructions: what to do when you first open the bakery in the morning, and what to do when a tray is told "not today."

You can't rewrite the recipe card in the middle of baking a batch. You have to stop, change the card, and start the next batch, because trays already half done would not match the new recipe.
`,

  why: `
**Why use AOIs at all?** Reuse and a single point of truth. Fifty copies of motor logic drift apart: someone fixes a fail-to-start timer on 12 of them. An AOI removes that class of bug. It also gives a code reviewer one place to read, and it gives commissioning a standard behavior across every motor in the plant.

**Why not make everything an AOI?** Each AOI has overhead in definition management, and online edits are limited. One-off logic that will never repeat belongs in a routine. A rule of thumb among integrators: if it appears three times or more, or if a vendor or standard dictates behavior, make it an AOI. Otherwise start in a routine and promote it later.

**Why InOut for the equipment structure?** Passing by reference means the AOI works on the real tag and no copy goes stale. It also keeps the block small. The trade-off: an InOut can't be a constant or an expression, and the AOI can modify it, so ownership rules (Cmd, Sts, Cfg, Alm) must be strict.

**Why signatures and revisions?** In a regulated or multi-site setting you must prove that what runs matches what was approved. Signatures give you that proof. The cost is discipline: every change bumps the revision and re-validates.

**What do experienced people argue about?** Whether to protect the source (safe but opaque for the next engineer), whether to put alarms inside the AOI or on the HMI, and how many modes a standard motor should support. There is no universal answer. Write your decision in the project standard and apply it everywhere.
`,

  history: `
Add-On Instructions arrived in RSLogix 5000 around version 16 (2007), at a time when Rockwell wanted to compete with the function block libraries of other vendors and to let customers and OEMs package their know-how. They were later extended with more routine languages, source protection and better import/export. The PlantPAx process library grew out of the same idea at product scale.
`,

  examples: [
    {
      title: "Parameter design for a valve AOI",
      body: `\`AOI_Valve\`: InOut \`Valve\` (a \`UDT_Valve\` tag such as \`FV101\`), Inputs \`Interlock\`, \`OpenLS\`, \`CloseLS\`, Outputs \`OpenCmd\`, \`CloseCmd\`. Locals: \`TravelTmr\`. If the valve is commanded open and \`OpenLS\` is not made within \`Valve.Cfg.TravelTime\` (milliseconds), set \`Valve.Alm.FailToOpen\`. The same block serves every valve on site, and the HMI faceplate reads the same UDT.`
    },
    {
      title: "The disabled-area bug",
      body: `Area20 is put in 'maintenance'. The rung calling \`AOI_Motor\` for motor M201 goes false. M201's \`RunCmd\` output stays on because the Logic routine never ran again. Fix: add an EnableInFalse routine that sets RunCmd to 0 and clears Sts bits, or call the AOI unconditionally and pass the area-enable as an input to the interlock.`
    }
  ],

  diagrams: {
    aoi: `<svg viewBox="0 0 640 260" role="img" aria-label="An Add-On Instruction with Input, Output and InOut parameters, local tags and its routines">
  <rect class="dg-box-accent" x="200" y="20" width="240" height="210" rx="8"/>
  <text class="dg-title dg-mid" x="320" y="46">AOI_Motor (instance M101)</text>
  <text class="dg-text-sm dg-mid" x="320" y="72">Routines</text>
  <text class="dg-text-mono dg-mid" x="320" y="92">Prescan  Logic</text>
  <text class="dg-text-mono dg-mid" x="320" y="110">EnableInFalse  Postscan</text>
  <rect class="dg-box" x="224" y="128" width="192" height="84" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="150">Local tags (per instance)</text>
  <text class="dg-text-mono dg-mid" x="320" y="172">FailTmr  StopTmr</text>
  <text class="dg-text-mono dg-mid" x="320" y="192">one-shot bits</text>
  <text class="dg-text-sm" x="20" y="60">Inputs (copied in)</text>
  <text class="dg-text-mono" x="20" y="82">Interlock</text>
  <text class="dg-text-mono" x="20" y="100">RunFbk</text>
  <text class="dg-text-sm" x="20" y="150">InOut (reference)</text>
  <text class="dg-text-mono" x="20" y="172">Motor : UDT_Motor</text>
  <text class="dg-text-sm" x="470" y="60">Outputs (copied out)</text>
  <text class="dg-text-mono" x="470" y="82">RunCmd</text>
  <text class="dg-text-mono" x="470" y="100">EnableOut</text>
  <line class="dg-line" x1="150" y1="78" x2="200" y2="78"/>
  <line class="dg-line" x1="150" y1="168" x2="200" y2="168"/>
  <line class="dg-line" x1="440" y1="78" x2="465" y2="78"/>
</svg>`,
    scan: `<svg viewBox="0 0 640 200" role="img" aria-label="Which AOI routine runs: Prescan once at start, Logic when the rung is true, EnableInFalse when it is false">
  <rect class="dg-box" x="20" y="30" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="105" y="56">Prescan</text>
  <text class="dg-text-sm dg-mid" x="105" y="76">once, entering Run</text>
  <rect class="dg-box-ok" x="235" y="30" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="56">Logic</text>
  <text class="dg-text-sm dg-mid" x="320" y="76">each scan, rung true</text>
  <rect class="dg-box-warn" x="450" y="30" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="535" y="56">EnableInFalse</text>
  <text class="dg-text-sm dg-mid" x="535" y="76">each scan, rung false</text>
  <text class="dg-text-sm" x="20" y="136">If the rung goes false and no EnableInFalse routine exists,</text>
  <text class="dg-text-sm" x="20" y="156">the outputs keep the last values Logic wrote.</text>
</svg>`
  },

  pitfalls: [
    "Leaving outputs latched when the rung goes false, because no EnableInFalse routine clears them.",
    "Using shared timers outside the AOI instead of local tags, so instances interfere.",
    "Passing a big UDT as Input instead of InOut, which copies it and hides writes.",
    "Editing a vendor library AOI in place, then losing the change on the next library update.",
    "Skipping the revision bump, so two different definitions carry the same revision.",
    "Planning an AOI online hot-fix that Logix Designer will not allow."
  ],

  keyTerms: ["aoi", "inout-parameter", "enablein-enableout", "prescan", "add-on-signature", "aoi-local-tag", "plantpax"],

  quiz: [
    {
      q: "A motor AOI is called on a rung that goes false, and the motor output stays on. Why?",
      options: ["The AOI ran twice", "EnableOut forced the output high", "The timer expired", "Logic did not execute, and nothing cleared the outputs"],
      answer: 3,
      explain: [
        "An AOI does not run twice per scan from one call.",
        "EnableOut only passes rung state forward. It does not drive a physical output.",
        "Timers have nothing to do with it.",
        "Correct. A false rung skips Logic. Without an EnableInFalse routine, outputs keep their last values."
      ]
    },
    {
      q: "Which parameter usage should carry a UDT_Motor tag into an AOI?",
      options: ["Input", "Output", "InOut", "Local"],
      answer: 2,
      explain: [
        "An Input copies the data in, so the AOI's writes would not reach the caller's tag.",
        "An Output copies out only, and the AOI could not read the incoming commands.",
        "Correct. InOut is passed by reference, so the AOI reads and writes the real tag.",
        "Locals are private to the instance and not visible to the caller."
      ]
    },
    {
      q: "What does the Prescan routine do?",
      options: ["Runs every scan before Logic", "Runs once when the controller enters Run mode, to initialize state", "Runs when the rung is false", "Runs only after a download from the HMI"],
      answer: 1,
      explain: [
        "That would be redundant with Logic.",
        "Correct. It is the place to set initial values and one-shot storage.",
        "That is EnableInFalse.",
        "Prescan relates to controller mode transitions, not the HMI."
      ]
    },
    {
      q: "Why can't you freely edit an AOI definition on a running controller?",
      options: ["Changes alter the data layout and code of every instance at once", "Rockwell wants you to buy more licenses", "AOIs cannot be edited at all", "Only the PlantPAx library can be edited"],
      answer: 0,
      explain: [
        "Correct. One definition backs many instances, so layout and logic changes affect all of them.",
        "Licensing has nothing to do with it.",
        "AOIs can be edited. The restriction is on doing it online.",
        "PlantPAx objects follow the same rules as any AOI."
      ]
    },
    {
      q: "What is the signature of an AOI for?",
      options: ["To store the author's name", "To encrypt the logic", "To set the scan mode", "To check that two AOIs claiming the same name and revision are identical in content"],
      answer: 3,
      explain: [
        "That is the vendor field.",
        "Source protection encrypts. The signature does not.",
        "Scan behavior is separate.",
        "Correct. It's a content-derived check, useful for proving which definition is running."
      ]
    },
    {
      q: "Which job fits a UDT, not an AOI?",
      options: ["Fail-to-start timing for each motor", "Interlocking a valve against a pump", "Describing the Cmd/Sts/Cfg/Alm shape of a motor", "Calculating a PID output"],
      answer: 2,
      explain: [
        "That is logic, which belongs in an AOI.",
        "Interlocks are logic.",
        "Correct. A UDT holds the data shape and no logic.",
        "A PID is logic and belongs in an instruction or AOI."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers Add-On Instructions (1756-PM010)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm010_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Design Considerations (1756-RM094)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm094_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Program Parameters", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm021_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "PlantPAx 5.0 Library of Process Objects", url: "https://www.rockwellautomation.com/en-us/capabilities/process-solutions/process-systems/plantpax-distributed-control-system/plantpax-5-0-technical-features---library-of-process-objects.html", type: "docs", source: "Rockwell Automation" },
    { title: "Rockwell Automation Library of Process Objects: Configuration and Usage", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/proces-rm002_-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
