LC.lesson({
  id: "dev-iec-st",
  title: "IEC 61131-3 and Structured Text for Logix people",
  track: "dev",
  minutes: 30,
  level: 3,
  prereqs: ["plc-other-vendors", "proto-modbus"],
  tags: ["iec-61131-3", "structured-text", "openplc", "modbus", "logix", "plc"],
  summary: "Read and write IEC Structured Text the way Codesys and OpenPLC expect it: declarations, POUs, function block instances and located variables, mapped onto the Logix ideas you already know.",
  objectives: [
    "Name the IEC 61131-3 languages and the program organization units (program, function block, function)",
    "Read and write ST declarations: VAR sections, data types, TIME literals, arrays and structures",
    "Map Logix tags, UDTs, AOIs, TON and ONS onto their IEC equivalents",
    "Explain located variables (%IX, %QX, %IW, %QW, %MW) and how they reach the outside world",
    "Use OpenPLC's Modbus address map to address its variables from Ignition"
  ],

  body: `
## Same standard, different house

{{lesson:plc-languages}} introduced ST inside Studio 5000, and {{lesson:plc-other-vendors}} showed which ideas transfer between vendors. This lesson goes one step further: writing ST in an environment that follows {{term:iec-61131-3|IEC 61131-3}} closely, such as Codesys-based controllers or {{term:openplc|OpenPLC}}, the open-source PLC you can run on a PC, a Raspberry Pi or in a container. The statements (\`IF\`, \`CASE\`, \`FOR\`, \`:=\`) are the same as in Logix. What feels different is everything around them: declarations, how code is packaged, and how variables reach I/O.

## The languages and the packaging

The standard defines Ladder Diagram (LD), Function Block Diagram (FBD), Structured Text (ST) and Instruction List (IL, deprecated), plus Sequential Function Chart (SFC) elements for structuring sequences. PLCopen, the organization that promotes the standard, lists edition 4.0 as published in 2025.

Code is packaged in **{{term:pou|program organization units}}** (POUs):

| POU | Keeps state between calls? | Logix closest match |
|---|---|---|
| \`PROGRAM\` | Yes | A program with its program-scoped tags |
| \`FUNCTION_BLOCK\` | Yes, per instance | An Add-On Instruction (AOI) with its backing tag |
| \`FUNCTION\` | No; same inputs always give the same result | A small AOI with no internal state, or an expression |

A **task** in the configuration decides when each program runs, cyclically or on an event, just like Logix periodic and event tasks.

## Declarations come first

In Logix you create tags in a tag editor. In IEC ST, every POU starts with its own declarations in text, grouped into {{term:iec-var-sections|VAR sections}}:

\`\`\`st
FUNCTION_BLOCK FB_Motor
VAR_INPUT
    StartCmd : BOOL;
    StopCmd  : BOOL;
    AuxFbk   : BOOL;              (* run feedback from the aux contact *)
END_VAR
VAR_OUTPUT
    RunOut   : BOOL;
    FailToStart : BOOL;
END_VAR
VAR
    StartTmr : TON;               (* a function block instance *)
END_VAR
\`\`\`

| Section | Meaning | Logix equivalent |
|---|---|---|
| \`VAR_INPUT\` | Values passed in; read-only inside | AOI Input parameters |
| \`VAR_OUTPUT\` | Values passed out | AOI Output parameters |
| \`VAR_IN_OUT\` | Passed by reference, read and write | AOI InOut parameters |
| \`VAR\` | Internal state, kept between calls in an FB | AOI local tags |
| \`VAR_GLOBAL\` / global variable list | Shared by all POUs | Controller-scoped tags |

Data types will look familiar, with one trap:

| IEC | Size | Note |
|---|---|---|
| \`BOOL\` | 1 bit | |
| \`INT\` | 16-bit signed | Same as Logix INT. Logix programmers default to DINT; IEC code often uses INT |
| \`DINT\` | 32-bit signed | |
| \`REAL\` / \`LREAL\` | 32 / 64-bit float | |
| \`TIME\` | Duration | Written as literals: \`T#5s\`, \`T#250ms\`, \`T#1h30m\` |
| \`STRING\` | Text | |
| \`ARRAY[0..9] OF REAL\` | Array | Explicit lower and upper bounds |

User-defined structures, the IEC version of a Logix UDT, are declared once:

\`\`\`st
TYPE ST_MotorSts :
STRUCT
    Running : BOOL;
    Fault   : BOOL;
    Speed   : REAL;
END_STRUCT
END_TYPE
\`\`\`

## Timers are function block instances

This is the biggest mental shift for a Logix programmer. In Logix, a timer is a TIMER tag with \`.PRE\`, \`.ACC\` and \`.DN\`, driven by a TON instruction on a rung. In IEC, \`TON\` is a **function block type**. You declare an **instance** (\`StartTmr : TON;\` above), call it with named inputs, then read its outputs.

\`\`\`st
StartTmr(IN := RunOut AND NOT AuxFbk, PT := T#5s);
FailToStart := StartTmr.Q;
\`\`\`

{{diagram:ton}}

| Logix TIMER | IEC TON instance |
|---|---|
| Rung condition enables the timer | \`IN\` input |
| \`.PRE\` (DINT, milliseconds) | \`PT\` (TIME, e.g. \`T#5s\`) |
| \`.ACC\` | \`ET\` (elapsed time) |
| \`.DN\` | \`Q\` |
| \`.EN\`, \`.TT\` | Not provided; derive them from \`IN\` and \`Q\` if needed |

Call each instance **exactly once per scan**, unconditionally, and pass \`IN\` as the condition. Calling it inside an \`IF\` that goes false freezes it in its last state, the IEC cousin of a timer on a rung that stops being scanned.

Edge detection works the same way. The Logix ONS needs a storage bit; IEC uses the \`R_TRIG\` and \`F_TRIG\` function blocks, each instance keeping its own memory: \`ResetEdge(CLK := ResetCmd); IF ResetEdge.Q THEN ... END_IF;\`

## Mapping the rest of Logix

| Logix | IEC 61131-3 / Codesys-style |
|---|---|
| Controller-scoped tag | Global variable (global variable list) |
| Program-scoped tag | \`VAR\` in a \`PROGRAM\` |
| UDT | \`TYPE ... STRUCT\` |
| AOI | \`FUNCTION_BLOCK\` |
| AOI backing tag | FB instance |
| \`MOV(Src, Dest)\` | \`Dest := Src;\` |
| OTL/OTU | Assignment, or \`S\`/\`R\` coils in LD |
| \`CTU\` with \`.DN\` | \`CTU\` instance with \`CU\`, \`PV\`, \`Q\`, \`CV\` |
| I/O module tags (\`Local:1:I.Data.0\`) | {{term:located-variable\\|Located variables}} (\`%IX0.0\`) |
| Alias tag for I/O | \`StartPB AT %IX0.0 : BOOL;\` |

## Located variables

IEC addresses physical and communication memory with a **%** prefix, a location and a size:

| Prefix | Meaning |
|---|---|
| \`%I\` | Input |
| \`%Q\` | Output |
| \`%M\` | Memory |
| \`X\` / \`W\` / \`D\` / \`L\` | Bit / 16-bit word / 32-bit double word / 64-bit long word |

So \`%IX0.3\` is input byte 0, bit 3; \`%QW2\` is output word 2; \`%MD4\` is memory double word 4. You bind a readable name to an address with \`AT\`, which is exactly what a Logix alias tag does. Good practice is the same as Logix I/O mapping ({{lesson:plc-best-practices}}): use located variables only at the edge, map them into named variables, and write the logic against the names.

## OpenPLC and its Modbus map

OpenPLC runs IEC 61131-3 programs on ordinary hardware. The current generation is OpenPLC Editor v4 with Runtime v4, which publishes multi-architecture container images. Its Modbus TCP server is **disabled by default**; you enable it in the project's server settings, and it listens on port 502 on all interfaces by default. If Linux refuses the port below 1024, the documentation suggests a higher port such as 1502.

The useful part for an integrator is the fixed map from located variables to {{term:modbus|Modbus}} tables:

| IEC variable | Modbus table | Starts at offset |
|---|---|---|
| \`%IX\` | Discrete inputs (FC02) | 0 |
| \`%QX\` | Coils (FC01/05/15) | 0 |
| \`%MX\` | Coils, after the \`%QX\` bits | Depends on configured sizes |
| \`%IW\` | Input registers (FC04) | 0 |
| \`%QW\` | Holding registers (FC03/06/16) | 0 |
| \`%MW\` | Holding registers, after the \`%QW\` words | Depends on configured sizes |
| \`%MD\` / \`%ML\` | Holding registers, after \`%MW\`; 2 / 4 registers each | Depends on configured sizes |

Bit addresses count across bytes: \`%QX1.0\` is coil 8. The offsets are **zero-based**, while Ignition's Modbus driver defaults to **one-based** addressing (\`HR1\` = 40001 = offset 0). So \`%QW0\` is Ignition \`HR1\` with default settings, and \`%QX0.0\` is \`C1\`. Write one known value, read it back, and fix the addressing setting before you build anything, exactly as {{lesson:proto-modbus}} recommends. Multi-register values (\`%MD\`, \`%ML\`) bring back the word-order question.

> [!note] OpenPLC v3
> Many tutorials online were written for OpenPLC v3, which had a browser interface and used addresses starting at \`%IX100.0\` for its I/O slots. Its map differs from the v4 table above. Check the address documentation for the exact version you run.

> [!warning] Modbus has no authentication
> An OpenPLC instance with its Modbus server enabled accepts writes from anything that can reach the port. In a lab, keep it on an isolated network. Never put a soft PLC with an open Modbus server on a plant control VLAN.
`,

  eli5: `
Logix and IEC are two kitchens that cook the same dishes with slightly different habits.

In the Logix kitchen there's one big pantry list on the wall where every ingredient is written down. In the IEC kitchen, each recipe card starts with its own little ingredients list: what comes in, what goes out, and what the cook keeps on the side between batches.

A timer in Logix is a kitchen timer screwed to the wall with a number on it. In IEC, a timer is a type of gadget, and you take one out of the drawer for each job and give it a name, like "the egg timer". You tell it how long and when to start, and you look at it to see if it's done.

Located variables are the labels on the pass-through hatches between the kitchen and the dining room: input hatch 0, slot 3. You stick a friendly name on each hatch so the recipes can say "start button" instead of "hatch 0, slot 3".

OpenPLC's Modbus map is the floor plan telling outsiders which hatch number in the wall matches which hatch label inside.
`,

  why: `
**Why learn IEC-style ST if you work in Logix.** Machine builders increasingly ship Codesys-based controllers, Beckhoff and others for skids and packaging lines. Being able to read their code during FAT, and write the interface logic, makes you the integrator who can take the job. Open-source soft PLCs like OpenPLC also give you a free target for home labs, CI tests and simulators.

**Why declarations in the code.** IEC puts the interface of each POU right at the top, in text. That makes code self-describing and easy to diff in Git, which is why Codesys-style projects fit version control better than a binary ACD file. The cost is more typing, and that changing a type means editing text instead of a grid.

**Why function block instances instead of timer tags.** Instances make every piece of state explicit and owned by one POU. You can't accidentally drive the same timer from two places without seeing it. The Logix approach is more visible online for electricians, which is why Logix shops keep timers in ladder.

**Why located variables only at the edge.** Logic written against \`%IX0.3\` breaks the day an input moves. Logic written against \`StartPB\` survives, because only the one \`AT\` line changes. It's the same reason good Logix projects map module tags into UDTs once.

**What people argue about.** How portable IEC code really is. In practice, standard ST and FBD move between IEC environments with modest edits, while I/O configuration, libraries and vendor function blocks don't. Treat portability as a bonus, not a plan.
`,

  history: `
IEC 61131-3 brought the programming styles of different PLC vendors together into one standard. PLCopen formed to promote it and to define common extensions such as motion control function blocks and an XML exchange format. Later editions added object-oriented features for function blocks, deprecated Instruction List, and the fourth edition was published in 2025. OpenPLC began as an open-source project to give students and researchers a standards-based PLC, and its current Runtime v4 runs headless on standard hardware and in containers.
`,

  examples: [
    {
      title: "A motor function block, Logix to IEC",
      body: `A Logix AOI_Motor with inputs Start, Stop, AuxFbk and a TON for fail-to-start becomes \`FB_Motor\` with \`VAR_INPUT\`, \`VAR_OUTPUT\` and an internal \`StartTmr : TON\`. In the program you declare \`M101 : FB_Motor;\` and call \`M101(StartCmd := M101_StartCmd, StopCmd := M101_StopCmd, AuxFbk := M101_Aux);\` once per scan. The hardwired overload and E-stop stay in the starter circuit, as the house standard requires.`
    },
    {
      title: "Reading an OpenPLC tank level from Ignition",
      body: `In the lab, OpenPLC writes a scaled LT101 value in hundredths of a metre to \`%QW3\` (342 = 3.42 m). With Ignition's default one-based Modbus addressing that is \`HR4\` (offset 3). A quick read shows 342, so the addressing is right, and a tag scale of 0–500 raw to 0–5.00 m finishes the job.`
    }
  ],

  diagrams: {
    ton: `<svg viewBox="0 0 640 220" role="img" aria-label="An IEC TON function block instance StartTmr with inputs IN and PT on the left and outputs Q and ET on the right, compared with Logix TIMER members">
  <rect class="dg-box-accent" x="220" y="40" width="200" height="130" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="30">StartTmr : TON</text>
  <text class="dg-text-mono" x="232" y="88">IN</text>
  <text class="dg-text-mono" x="232" y="138">PT</text>
  <text class="dg-text-mono" x="390" y="88">Q</text>
  <text class="dg-text-mono" x="384" y="138">ET</text>
  <line class="dg-line" x1="120" y1="84" x2="220" y2="84"/>
  <line class="dg-line" x1="120" y1="134" x2="220" y2="134"/>
  <line class="dg-line" x1="420" y1="84" x2="520" y2="84"/>
  <line class="dg-line" x1="420" y1="134" x2="520" y2="134"/>
  <text class="dg-text-sm" x="20" y="80">RunOut AND</text>
  <text class="dg-text-sm" x="20" y="98">NOT AuxFbk</text>
  <text class="dg-text-mono" x="40" y="139">T#5s</text>
  <text class="dg-text-sm" x="528" y="89">FailToStart</text>
  <text class="dg-text-sm" x="528" y="139">elapsed</text>
  <text class="dg-text-muted" x="20" y="200">Logix: rung → .EN, .PRE (ms) → PT, .DN → Q, .ACC → ET</text>
</svg>`
  },

  pitfalls: [
    "Calling a TON instance inside an IF, so it stops being updated when the condition goes false.",
    "Writing logic directly against %IX and %QX addresses instead of named variables.",
    "Assuming OpenPLC's zero-based Modbus offsets match Ignition's one-based default.",
    "Following an OpenPLC v3 tutorial's address map on a v4 runtime.",
    "Leaving the soft PLC's Modbus server reachable from a real control network.",
    "Using INT out of Logix habit where a value can exceed 32,767."
  ],

  keyTerms: ["iec-61131-3", "structured-text", "pou", "iec-var-sections", "function-block", "iec-time-literal", "r-trig", "located-variable", "openplc", "plcopen", "instruction-list"],

  quiz: [
    {
      q: "In IEC ST, what is the equivalent of reading a Logix timer's .DN bit?",
      options: ["StartTmr.DN", "StartTmr.ET", "StartTmr.PT", "StartTmr.Q"],
      answer: 3,
      explain: [
        "IEC TON has no DN output.",
        "ET is elapsed time, like .ACC.",
        "PT is the preset time input, like .PRE.",
        "Correct. Q goes true when the elapsed time reaches PT while IN is true."
      ]
    },
    {
      q: "A TON instance is called only inside IF Auto THEN ... END_IF. Auto goes false while the timer is running. What happens?",
      options: ["The timer resets immediately", "The instance isn't called, so its outputs freeze at their last values", "The timer keeps timing in the background", "The PLC faults"],
      answer: 1,
      explain: [
        "Resetting requires calling it with IN false.",
        "Correct. Call instances once per scan unconditionally and put the condition in IN.",
        "A function block only updates when it's called.",
        "It's legal code, just a logic bug."
      ]
    },
    {
      q: "Which Logix concept maps most directly to an IEC FUNCTION_BLOCK?",
      options: ["An Add-On Instruction", "A UDT", "A periodic task", "A produced tag"],
      answer: 0,
      explain: [
        "Correct. Both have parameters, local state and one instance per use.",
        "A UDT maps to TYPE ... STRUCT: data only, no code.",
        "Tasks schedule programs; they aren't code units.",
        "Produced/consumed tags are a communication feature."
      ]
    },
    {
      q: "OpenPLC writes a value to %QW5. With Ignition's Modbus driver at its default one-based addressing, which address reads it?",
      options: ["HR5", "IR5", "HR6", "HR40006"],
      answer: 2,
      explain: [
        "%QW5 is zero-based offset 5. One-based addressing calls that HR6.",
        "%QW maps to holding registers, not input registers.",
        "Correct. Offset 5 in the holding register table is HR6 with one-based addressing.",
        "Ignition's HR prefix already selects the table; the 4xxxx number isn't used."
      ]
    },
    {
      q: "Why write 'StartPB AT %IX0.3 : BOOL;' and use StartPB in the logic, instead of %IX0.3 everywhere?",
      options: ["Located addresses are slower", "OpenPLC requires names", "Names use less memory", "If the input moves, only the one AT declaration changes"],
      answer: 3,
      explain: [
        "Speed is the same.",
        "Direct addresses are allowed; it's a maintainability choice.",
        "Memory use is the same.",
        "Correct. It's the IEC version of mapping I/O once and writing logic against names."
      ]
    },
    {
      q: "What is T#250ms in IEC ST?",
      options: ["A tag named T with value 250", "A TIME literal of 250 milliseconds", "A timer preset in counts", "A comment"],
      answer: 1,
      explain: [
        "T# is a literal prefix, not a tag.",
        "Correct. TIME literals carry their units, unlike a Logix .PRE in milliseconds.",
        "TIME values are durations, not counts.",
        "Comments use (* *) or //."
      ]
    }
  ],

  resources: [
    { title: "IEC 61131-3 and PLCopen", url: "https://www.plcopen.org/standards/logic/iec-61131-3/", type: "standard", source: "PLCopen" },
    { title: "Modbus addressing (OpenPLC Editor)", url: "https://edge.autonomylogic.com/docs/openplc-editor/communication/modbus/addressing", type: "docs", source: "Autonomy Logic" },
    { title: "Modbus server (OpenPLC Editor)", url: "https://edge.autonomylogic.com/docs/openplc-editor/communication/modbus/server", type: "docs", source: "Autonomy Logic" },
    { title: "OpenPLC Runtime v4", url: "https://github.com/autonomy-logic/openplc-runtime", type: "tool", source: "GitHub (Autonomy Logic)" }
  ]
});
