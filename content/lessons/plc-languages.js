LC.lesson({
  id: "plc-languages",
  title: "Structured Text, FBD and SFC",
  track: "plc",
  minutes: 25,
  level: 2,
  prereqs: ["plc-organization"],
  tags: ["structured-text", "fbd", "sfc", "iec-61131-3", "ladder", "languages", "logix"],
  summary: "Ladder is one of four languages Logix speaks. Learn when text, function blocks and sequential charts do the job better, and how to mix them in one project.",
  objectives: [
    "Name the IEC 61131-3 languages and the four that Studio 5000 Logix Designer supports",
    "Write the same logic in ladder and structured text",
    "Use ST control structures: IF, CASE, FOR",
    "Say when FBD and SFC fit better than ladder",
    "Mix languages sensibly across routines and AOIs"
  ],

  body: `
## One standard, several languages

{{term:iec-61131-3|IEC 61131-3}} is the international standard for PLC programming languages. It defines five: Ladder Diagram (LD), Function Block Diagram (FBD), Structured Text (ST), Sequential Function Chart (SFC) and Instruction List (IL, rarely used and not offered in Logix). Studio 5000 Logix Designer supports LD, FBD, ST and SFC. Each routine you create is written in one of them, and routines in different languages live side by side in the same program.

The reader already knows ladder. The question is not which language is best. It is which fits the job, because a good integrator reaches for the right one.

| Language | Form | Fits | Weak at |
|---|---|---|---|
| **Ladder (LD)** | Rungs of contacts and coils | Discrete interlocks, motor control, anything a technician must troubleshoot online | Math-heavy code, loops, big case logic |
| **Structured Text (ST)** | Pascal-like text | Calculations, arrays, loops, string handling, case logic | Live troubleshooting by electricians |
| **Function Block Diagram (FBD)** | Blocks wired together | PID loops, signal conditioning, continuous process | Sequencing, step logic |
| **Sequential Function Chart (SFC)** | Steps and transitions | Batch sequences, startup/shutdown procedures | Fast interlocks, math |

## The same logic in LD and ST

Take a latched motor start command with a stop button and a fault. It seals in on the command bit \`M101_RunCmd\`, and the starter output is driven from that bit. (The overload and E-stop are hardwired in the starter coil circuit, not in this rung.)

\`\`\`ladder
[XIC(Start) ,XIC(M101_RunCmd)] XIC(Stop_NC) XIO(Fault) OTE(M101_RunCmd)
\`\`\`

In structured text:

\`\`\`st
M101_RunCmd := (Start OR M101_RunCmd) AND Stop_NC AND NOT Fault;
\`\`\`

Both produce the same behavior. Ladder shows the power path at a glance, which is exactly what an electrician wants at 3 a.m. Text is shorter and scales better. Now a comparison that is clumsy in ladder:

\`\`\`st
IF Level_m >= H_Limit THEN
  High_Alarm := 1;
ELSIF Level_m < (H_Limit - Deadband) THEN
  High_Alarm := 0;
END_IF;
\`\`\`

The alarm sets above the limit and clears below limit minus deadband, as in {{lesson:plc-analog}}. In ladder this takes a compare, a branch and a latch. In ST it reads like a sentence.

## Structured text basics

ST is a line-by-line language. Assignment uses \`:=\`, comparison uses \`=\`, \`<>\`, \`<\`, \`>\`, \`<=\`, \`>=\`, and logic uses \`AND\`, \`OR\`, \`XOR\`, \`NOT\`. Every statement ends with a semicolon. Comments are \`//\` to end of line or \`(* ... *)\`.

### IF

\`\`\`st
IF Temp > 90.0 THEN
  Heater := 0;
ELSIF Temp < 80.0 THEN
  Heater := 1;
END_IF;
\`\`\`

This is a thermostat with hysteresis in four lines. When the temperature is between 80 and 90, neither branch runs, so the heater keeps its last state.

### CASE

CASE selects on an integer, which makes it the natural tool for a state machine or a recipe selector.

\`\`\`st
CASE Step OF
  0: // Idle
    IF Start THEN Step := 10; END_IF;
  10: // Fill
    FillValve := 1;
    IF Level_m >= 8.0 THEN FillValve := 0; Step := 20; END_IF;
  20: // Mix
    Mixer := 1;
    IF MixDone THEN Mixer := 0; Step := 0; END_IF;
  ELSE
    Step := 0;
END_CASE;
\`\`\`

### FOR, WHILE and REPEAT

\`\`\`st
// Count how many of ten motors are running
RunCount := 0;
FOR i := 0 TO 9 DO
  IF Motors[i].Sts.Running THEN
    RunCount := RunCount + 1;
  END_IF;
END_FOR;
\`\`\`

A FOR loop over an array of UDTs, like the \`Motors\` array of \`UDT_Motor\` from {{lesson:plc-udt}}, is where ST pays off: ten lines of ladder repeated ten times become one loop.

> [!warning] Loops run inside one scan
> A loop executes fully every time the routine runs. A FOR over 10 items is trivial. A WHILE that waits for a condition that only changes in a later scan never exits, and the watchdog will fault the controller. Never wait inside ST. Set a flag and return, then check it next scan.

### Practical ST notes in Logix

- Timers and counters are called as instructions: \`TON(MyTimer);\` after setting the preset (and enable) members in the tag first, as the counter lessons do. They keep their normal tag structure.
- Instructions that are rung-based in ladder, like OTL/OTU, are replaced with assignments. One-shots need explicit storage bits and are handled differently, so check the ST syntax in the Logix help for each.
- Always initialize variables you rely on. ST makes it easy to read a tag that nothing writes.
- Online editing works in ST, and the editor highlights pending edits. A syntax error stops the verify.

## Function Block Diagram

In FBD you place blocks on a sheet and wire the output of one to the input of another. The block set includes math, compare, timers, and the **process control** instructions: PID, PIDE (enhanced PID), ramp/soak, totalizer, lead-lag, scaling and alarms (ALMA, ALMD). A sheet reads left to right like a P&ID's control strategy.

Every block executes once per scan in an order Logix derives from the wires. Where there is a loop, you must break it or mark which wire carries a delay, and you can set execution order manually on a sheet. Sheets pass values to each other with off-sheet connectors.

FBD is the natural choice for a PID loop with feedforward, a cascade, or a ratio control, because the diagram looks like the control strategy diagram the process engineer already drew. It is a poor choice for discrete interlocks.

{{diagram:fbd}}

## Sequential Function Chart

SFC models a procedure as **steps** (states), joined by **transitions** (conditions). One or more steps are active at a time. When the active step's transition becomes true, control moves to the next step. Each step can have **actions** that run while it is active, written in ST or LD, with qualifiers such as "do this on entry" or "do this continuously while active."

SFC fits a startup sequence, a batch phase, or a CIP cycle. The chart is a picture of the process procedure that operators and process engineers both understand, and the active step is visible online. The tradeoff is overhead: simple sequences are quicker in a CASE statement, and SFC makes its own execution rules (it can complicate the scan if the chart is large). Many integrators build state machines in ST CASE or in a standard state model. We cover that in {{lesson:plc-state-machines}} and {{lesson:plc-isa88-packml}}.

{{diagram:sfc}}

## Mixing languages

A project is not required to choose one. A typical split:

- **Ladder** for discrete interlocks, I/O mapping and equipment-level logic a technician will troubleshoot.
- **ST** for calculations, array loops, string and data handling, and the heart of state machines.
- **FBD** for PID and process control sheets.
- **SFC** for procedures where the sequence itself is the deliverable.

Add-On Instructions can be written in LD, FBD or ST, and the choice is independent of the language that calls them. A motor AOI written in ST can be called from a ladder rung. See {{lesson:plc-aoi}}.

> [!tip] Know your audience
> Write for whoever will be at the machine at 3 a.m. If that is an electrician with a laptop, keep the interlocks in ladder. If it is a controls engineer, the AOI internals can be ST. A mixed project is fine, but each routine should be in the language its maintainer can read.

Vendor note: Siemens and Codesys systems expose the same standard languages with slightly different syntax (for example, Siemens SCL for ST). The ideas carry over; see {{lesson:plc-other-vendors}}.
`,

  eli5: `
Think of four ways to give someone directions.

Ladder is a wiring diagram: "power goes through this switch, then that switch, then lights the lamp." Great when you want to follow the path with your finger.

Structured text is writing the directions in words: "If the light is red, stop. Otherwise, keep going." It is shorter and easier when the directions have lots of "if this, then that" and counting.

Function block is a flow chart of machines on a conveyor: sensor goes into a calculator, the calculator goes into a dial. It's perfect for a thermostat-style job where numbers keep flowing and being adjusted.

A sequential chart is a board game track: you stand on one square until something happens, then you move to the next. It's perfect for a recipe with ordered steps.

None of them is the winner. A good cook uses a whisk, a knife and an oven for different jobs in the same kitchen.
`,

  why: `
**Why more than one language?** Different problems have different natural shapes. Interlocks are wires, math is a formula, control loops are signal flow, and procedures are ordered steps. Forcing everything into ladder produces unreadable rungs (the 30-rung math chain) and forcing everything into text hides the power path that technicians need to see. The standard exists so each shape has a fitting notation.

**Why do ladder users resist ST?** Because the person who maintains the machine is often an electrician or technician who learned ladder. Code they cannot read is code they cannot fix at 3 a.m. That is a legitimate cost, and the right response is not to avoid ST but to put it where the maintenance person won't need to go, such as inside a tested AOI or a calculation routine with good comments.

**Why do integrators like ST for the heavy lifting?** Loops over arrays, string building, state machines with 20 states, and data shuffling are dramatically shorter and easier to review as text, and text diffs well in version control. A 300-rung ladder routine does the same work as a 40-line ST routine, with more room for copy-paste mistakes.

**Why is SFC controversial?** It maps beautifully to a procedure and the active step is visible online. But it's a different execution model, many technicians have never used it, and it can be awkward to modify in the field. Many teams write sequences as an ST CASE statement with named states and add a status display in Ignition. Others use SFC for batch work, where the chart is the deliverable. Choose based on who maintains it.

**Why FBD for process?** The sheet matches the control-strategy drawing, and the process instructions are built to work as connected blocks. If the plant is PlantPAx-style, much of the library is FBD-friendly.
`,

  history: `
The IEC 61131-3 standard was first published in 1993 as part of IEC 1131, to end the situation where every PLC vendor had its own incompatible programming style. It standardized languages that already existed: ladder from relay diagrams, function blocks from DCS practice, and SFC from the French GRAFCET method. Structured text borrowed its style from Pascal. Later editions added object-oriented extensions. Allen-Bradley's Logix platform (RSLogix 5000, now Studio 5000 Logix Designer) went on to offer ST, FBD and SFC alongside ladder.
`,

  examples: [
    {
      title: "Averaging four temperature probes in ST",
      body: `\`\`\`st
Sum := 0.0; Good := 0;
FOR i := 0 TO 3 DO
  IF NOT Probe[i].Sts.BadSignal THEN
    Sum := Sum + Probe[i].Sts.PV;
    Good := Good + 1;
  END_IF;
END_FOR;
IF Good > 0 THEN AvgTemp := Sum / Good; END_IF;
\`\`\`
In ladder this needs eight or more rungs plus careful handling of the divide-by-zero case. The ST version keeps it in view on one screen.`
    },
    {
      title: "Choosing the language for a heating batch",
      body: `Interlocks (door closed, level OK, no E-stop) are in ladder, so electricians can trace them. The temperature loop is an FBD sheet with a PIDE block. The 'heat, hold, cool' sequence is an SFC with three steps. A scaling and averaging routine is ST. All four are in one program, called from MainRoutine by JSR.`
    }
  ],

  diagrams: {
    fbd: `<svg viewBox="0 0 640 190" role="img" aria-label="Function block diagram: scaled temperature and setpoint feed a PID block whose output goes to a valve">
  <defs><marker id="plc-languages-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="30" width="130" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="85" y="50">Analog input</text>
  <text class="dg-text-mono dg-mid" x="85" y="68">TT101_PV</text>
  <rect class="dg-box" x="20" y="110" width="130" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="85" y="130">Setpoint</text>
  <text class="dg-text-mono dg-mid" x="85" y="148">TIC101_SP</text>
  <rect class="dg-box-accent" x="260" y="50" width="130" height="90" rx="4"/>
  <text class="dg-text dg-mid" x="325" y="82">PIDE</text>
  <text class="dg-text-sm dg-mid" x="325" y="104">PV, SP in</text>
  <text class="dg-text-sm dg-mid" x="325" y="122">CV out</text>
  <rect class="dg-box" x="500" y="75" width="120" height="40" rx="4"/>
  <text class="dg-text-sm dg-mid" x="560" y="100">Steam valve</text>
  <line class="dg-line" x1="150" y1="55" x2="256" y2="80" marker-end="url(#plc-languages-ah)"/>
  <line class="dg-line" x1="150" y1="135" x2="256" y2="112" marker-end="url(#plc-languages-ah)"/>
  <line class="dg-line" x1="390" y1="95" x2="496" y2="95" marker-end="url(#plc-languages-ah)"/>
</svg>`,
    sfc: `<svg viewBox="0 0 640 260" role="img" aria-label="Sequential function chart: Idle, Fill, Mix steps joined by transitions with conditions">
  <rect class="dg-box-accent" x="40" y="14" width="150" height="40" rx="3"/>
  <text class="dg-text dg-mid" x="115" y="39">Step 0: Idle</text>
  <line class="dg-line" x1="115" y1="54" x2="115" y2="80"/>
  <line class="dg-line" x1="95" y1="80" x2="135" y2="80"/>
  <text class="dg-text-sm" x="146" y="85">Start = 1</text>
  <line class="dg-line" x1="115" y1="80" x2="115" y2="106"/>
  <rect class="dg-box" x="40" y="106" width="150" height="40" rx="3"/>
  <text class="dg-text dg-mid" x="115" y="131">Step 10: Fill</text>
  <line class="dg-line" x1="115" y1="146" x2="115" y2="172"/>
  <line class="dg-line" x1="95" y1="172" x2="135" y2="172"/>
  <text class="dg-text-sm" x="146" y="177">Level &gt;= 8.0 m</text>
  <line class="dg-line" x1="115" y1="172" x2="115" y2="198"/>
  <rect class="dg-box" x="40" y="198" width="150" height="40" rx="3"/>
  <text class="dg-text dg-mid" x="115" y="223">Step 20: Mix</text>
  <rect class="dg-box" x="300" y="106" width="300" height="40" rx="3"/>
  <text class="dg-text-sm" x="312" y="131">Action: FillValve := 1  (while active)</text>
  <line class="dg-dash" x1="190" y1="126" x2="300" y2="126"/>
  <text class="dg-text-sm" x="300" y="228">Active step runs its actions; a true transition</text>
  <text class="dg-text-sm" x="300" y="246">hands control to the next step.</text>
</svg>`
  },

  pitfalls: [
    "Putting a WHILE or REPEAT loop in ST that waits for something that changes only on a later scan.",
    "Writing a 400-line ST routine with no comments and expecting an electrician to maintain it.",
    "Using ladder for heavy math and array loops, producing dozens of near-identical rungs.",
    "Using SFC for a simple three-state sequence, adding complexity for no benefit.",
    "Forgetting that ST assignments run every scan, so a conditional assignment does not hold a value unless you design it to.",
    "Mixing three languages in one routine's worth of logic without a reason, when separate routines would be clearer."
  ],

  keyTerms: ["iec-61131-3", "structured-text", "function-block-diagram", "sequential-function-chart", "case-statement", "pide"],

  quiz: [
    {
      q: "Which language best fits a cascade temperature control loop with feedforward?",
      options: ["Ladder", "Instruction List", "Function Block Diagram", "SFC"],
      answer: 2,
      explain: [
        "Ladder can do it, but the signal flow is hard to follow.",
        "Logix does not support Instruction List.",
        "Correct. FBD wires process blocks like the strategy drawing, and PIDE is built for it.",
        "SFC models sequences, not continuous control."
      ]
    },
    {
      q: "Which ST statement correctly assigns a value?",
      options: ["Motor = 1;", "Motor := 1;", "Motor <- 1;", "SET Motor;"],
      answer: 1,
      explain: [
        "A single = is a comparison in ST.",
        "Correct. Assignment uses :=.",
        "That syntax is not ST.",
        "This is not a Logix ST statement."
      ]
    },
    {
      q: "A routine contains WHILE NOT Done DO ... END_WHILE; where Done is set by a rung later in the same routine or by a lower-priority task. What happens?",
      options: ["It waits politely until Done is set", "The loop never ends within the scan, the watchdog expires and the controller faults", "The compiler rejects it", "The scan skips the loop"],
      answer: 1,
      explain: [
        "No. The setter cannot run while this task is stuck in the loop. Only a higher-priority task could preempt the loop and set Done, and designing around that is a bug, not a wait. A lower-priority or same-task setter never runs while the loop spins.",
        "Correct. Loops run to completion inside one scan. Never wait in ST.",
        "It compiles. The failure is at run time.",
        "There is no such skipping."
      ]
    },
    {
      q: "You must write a batch startup sequence that process engineers and operators will review step by step. Which language fits best?",
      options: ["SFC", "FBD", "Ladder with a single long rung", "ST with no state variable"],
      answer: 0,
      explain: [
        "Correct. Steps and transitions mirror the procedure, and the active step is visible.",
        "FBD suits continuous signal flow.",
        "A single long rung hides the sequence.",
        "Without a state variable the sequence has no memory."
      ]
    },
    {
      q: "Which is the strongest reason to keep interlocks in ladder?",
      options: ["Ladder runs faster", "Maintenance staff can trace the logic online", "ST cannot do boolean logic", "The standard requires it"],
      answer: 1,
      explain: [
        "Execution speed is similar for simple logic.",
        "Correct. Ladder shows the power path and its live state in a form technicians know.",
        "ST handles boolean logic with AND, OR and NOT.",
        "No standard requires ladder for interlocks."
      ]
    },
    {
      q: "Can a ladder routine call an AOI written in ST?",
      options: ["No, languages cannot be mixed in a program", "Yes, the AOI's internal language is independent of the caller", "Only if the whole project is ST", "Only through a MSG instruction"],
      answer: 1,
      explain: [
        "Logix programs can hold routines in different languages.",
        "Correct. The caller sees the AOI's parameters and nothing about how it is written.",
        "No such restriction exists.",
        "MSG is for communication between controllers."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers Ladder Diagram (1756-PM008)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm008_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Function Block Diagram (1756-PM009)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm009_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Sequential Function Charts (1756-PM006)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm006_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Sequential function chart", url: "https://en.wikipedia.org/wiki/Sequential_function_chart", type: "article", source: "Wikipedia" },
    { title: "IEC 61131-3: a standard programming resource", url: "https://www.plcopen.org/download_file/force/bcddc27b-53f6-44ea-b0e3-e3d49c1564dc/342/", type: "standard", source: "PLCopen" }
  ]
});
