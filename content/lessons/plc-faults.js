LC.lesson({
  id: "plc-faults",
  title: "Faults, fault routines and diagnostics",
  track: "plc",
  minutes: 20,
  level: 3,
  prereqs: ["plc-organization"],
  tags: ["faults", "gsv", "ssv", "diagnostics", "fault-handler", "io-status"],
  summary: "What makes a Logix controller stop, what you can catch in code, and how to read the controller's own diagnostics before you guess.",
  objectives: [
    "Tell major faults from minor faults and say what each does to the controller",
    "Explain the order in which a program fault routine, the controller fault handler and the power-up handler run",
    "Use GSV to read the clock and fault information, and SSV to set system values",
    "Read I/O module status and connection faults",
    "Walk through the controller properties and fault log to diagnose a stop"
  ],

  body: `
## Why faults matter

A Logix controller checks its own work every scan. When it hits something it cannot safely continue past, such as an array index out of range or a task that overran its watchdog, it raises a {{term:major-fault|major fault}}. By default that stops the controller (the controller's OK status indicator goes red) and outputs go to their configured fault state. For a plant, that can mean a line is down until someone connects. Knowing the fault types lets you decide what to catch in code, what to let stop the machine, and how to diagnose quickly.

## Major, minor and I/O faults

| Type | Effect | Typical examples | Where you see it |
|---|---|---|---|
| Major | Controller faults and stops unless a handler clears it | Watchdog timeout, array subscript too large, jump to a missing label, program fault | Controller properties, Major tab, OK light red |
| Minor | Controller keeps running; flagged only | Arithmetic overflow, for example (check the Major, Minor and I/O Faults manual for the full list) | \`S:MINOR\` bit, Minor tab |
| I/O (connection) | The affected module's connection is lost or faulted | Module removed, wrong electronic key, network cable out | Module properties, I/O tree yellow or red icon |

A major fault carries a **type** and a **code**. For example, type 4 (program fault) code 20 is "array subscript too large", and type 6 is a watchdog. Rockwell publishes the full table in its Major, Minor and I/O Faults manual and a fault code spreadsheet. Memorise a few and look up the rest.

> [!note] Recoverable faults
> Some major faults are *recoverable*. In code you can clear them so the controller continues. Others are non-recoverable (hardware faults, watchdog in some cases) and require a reset or download. The manual lists which is which, and your handler must check the type and code before clearing.

## The fault routines

Logix gives you three hooks.

1. **Program fault routine.** Each program can have one (select it in the program's properties, Configuration tab, where the main and fault routines are chosen). When a major fault occurs in a routine of that program, the program's fault routine runs first. If it clears the fault, execution continues.
2. **Controller fault handler.** One per controller, in its own special program. It runs if the program fault routine did not clear the fault, or did not exist.
3. **Power-up handler.** Runs when the controller powers up in Run mode and the project is set to fault on power-up, if one exists. It is where you decide whether to resume or reinitialise.

If none of them clears the fault, the controller stops. The order is: program fault routine, then controller fault handler.

{{diagram:faultflow}}

A fault routine that clears every fault is dangerous. It hides a real problem and the machine may keep running with bad data. The usual pattern is: handle only faults you recognise (a known bad array index in a recipe load), log them, and let anything else stop the controller.

### Clearing a fault in code

In a program fault routine you read the fault record, test the type and code, and clear it by writing zeros to the record with SSV. The pattern is:

\`\`\`text
// Pseudo-code. Check the attribute names and record layout in the GSV/SSV manual.
GSV  class Program, instance THIS, attribute MajorFaultRecord  -> FaultRec
if FaultRec.Type = 4 and FaultRec.Code = 20
    MOV 0 into FaultRec.Type and FaultRec.Code
    SSV  class Program, instance THIS, attribute MajorFaultRecord  <- FaultRec
    log to Fault.LastBadIndex
\`\`\`

The faulted instruction is not repeated, so the code after the fault runs with whatever that instruction left behind. Check the fault-handling chapter of the manual for exactly where execution resumes in your version. Either way, protect the data first (for example, a bounds check beforehand).

## GSV and SSV

{{term:gsv-ssv|GSV and SSV}} (Get System Value, Set System Value) read and write the controller's system objects. Logix has no fixed status file like the old PLC-5. Each object (Controller, Program, Task, Module, FaultLog, WallClockTime) has attributes. You name the class, the instance and the attribute, and a destination tag.

| Goal | Class | Instance | Attribute | Destination |
|---|---|---|---|---|
| Read the clock | \`WallClockTime\` | (blank) | \`LocalDateTime\` | \`DINT[7]\` |
| Program fault record | \`Program\` | \`THIS\` or the program name | \`MajorFaultRecord\` | UDT/DINT[11] (verify) |
| Minor fault bits | \`FaultLog\` | (none) | \`MinorFaultBits\` | DINT |
| Module fault code | \`Module\` | module name | \`FaultCode\` | DINT |
| Module status | \`Module\` | module name | \`EntryStatus\` | INT/DINT |

Example: read the time to stamp an alarm. \`GSV(WallClockTime, ,LocalDateTime, Clk[0])\` fills an array: year, month, day, hour, minute, second, microsecond. The array element 3 is the hour. An SSV to \`WallClockTime\` \`DateTime\` is how you set the controller clock from a time source, with the usual care about time zones and UTC.

Give the destination a type and size that match the attribute, as the manual lists. A mismatch gives wrong data or a fault, depending on the instruction and version. An SSV changes the running controller. Some SSV changes are not stored in the project file, so upload before you rely on them.

## I/O module status

Every module in the I/O tree has a connection. In code the quickest check is \`GSV(Module, Rack5_Slot3, EntryStatus, Mod.Status)\` or reading the module-defined tag, which includes a \`ConnectionFaulted\` bit. For a module on a 1756 chassis or a distributed rack, use that bit in a rung that sets a diagnostic alarm:

\`\`\`ladder
XIC(Rack5_Slot3:I.ConnectionFaulted) OTE(Alarm.IO_Rack5_Slot3)
\`\`\`

Keep one alarm per module or per rack, named for the location so the operator knows what to check. A faulted connection also sets the input data to a safe or stale value depending on the module, so alarm on the connection status, not on the data.

## Diagnosing a stopped controller

Work from the inside out:

1. In Logix Designer go online and open **Controller Properties, Major Faults tab**. Read the type, code, program and routine.
2. Look up the code. A watchdog (type 6) points to task priority or an infinite loop. A type 4 code 20 means a bad index in the named routine.
3. Check the **Minor Faults** tab and the I/O tree for yellow triangles.
4. Check the **Date/Time** tab: a wrong clock confuses sequence-of-events work.
5. Fix the cause, clear the fault in the properties, and go back to Run only if the process is safe.

## Worked example: array index fault

A recipe routine reads \`Recipe[RecipeNo].Qty\` with \`RecipeNo\` from an HMI. The array has 20 elements. An operator keys 25. The controller majors with type 4 code 20 and halts. Better: check \`RecipeNo\` between 1 and 20 before the array use, limit it with \`LIM\`, and write a "bad recipe number" alarm. Add a program fault routine only as a net, one that logs the fault and clears type 4 code 20, and lets everything else through to the controller handler.
`,

  eli5: `
Picture a pilot with a warning panel. A yellow light on the panel says "something is not ideal." The plane keeps flying, and the pilot decides what to do. A red light means "stop what you are doing, something is badly wrong," and the autopilot hands over control.

Every red light has a number, and there is a thick book that says what each one means. Some red lights can be fixed in flight by following a checklist. Others mean you must land.

The PLC works the same way. Yellow lights are minor faults. Red lights are major faults. The controller keeps a log of the last red light and which part of the program was running. A fault routine is a checklist you wrote ahead of time for the red lights you know about. If it is a light you do not know, the plane lands and the crew reads the log.
`,

  why: `
**Why does a major fault stop the controller?** Because continuing with bad data in a process that moves things is usually worse than stopping. An out-of-range index means the code is about to read or write memory it should not. The safe default is stop, and outputs go to their fault state.

**Why not just clear everything in a fault handler?** It looks like robustness and it is the opposite. The program runs on with unknown data, and the next failure is harder to trace. The integrator's rule is to handle only faults you can name and defend, and to log them where the operators and Ignition can see them.

**Why check in code before the fault?** The cheapest fault is the one that never happens. Range-check array indexes, clamp inputs, and test divisor values. The fault routine is the net, and the checks are the fence.

**Why alarm on the connection bit, not the value?** A dead module can leave stale data that looks believable. The connection status is the truth about whether the data is alive.

**What is argued about.** Some sites configure outputs to hold their last state on a fault, others to turn off. It depends on the process: a fan that cools a motor should hold, a conveyor should stop. Decide per module and document it.
`,

  history: `
The PLC-5 and SLC 500 had a fixed status file (S:) with bits like S:1/13 for major faults. Logix replaced that with objects read through GSV and SSV, though a few S: bits such as S:FS (first scan), S:MINOR and S:V remain for convenience.
`,

  examples: [
    {
      title: "Stamping an alarm with the controller clock",
      body: `Rung: \`GSV(WallClockTime, ,LocalDateTime, Clk[0])\` runs once per alarm onset using an \`ONS\`. \`Clk[0]\` is the year, \`Clk[1]\` the month, up to \`Clk[6]\` microseconds. Copy the first six into the alarm record so the Ignition historian and the controller agree on when it happened.`
    },
    {
      title: "Finding a module that dropped",
      body: `The I/O tree shows a yellow triangle on \`Rack5_Slot3\`. Module Properties, Connection tab, reads "Connection request error". The electronic keying was set to Exact Match and a replacement card had a different revision. Changing keying to Compatible Module (or loading the matching revision) restores the connection without a download of the logic.`
    }
  ],

  diagrams: {
    faultflow: `<svg viewBox="0 0 640 200" role="img" aria-label="Fault handling order: a major fault runs the program fault routine, then the controller fault handler, and if still not cleared the controller faults and stops">
  <defs>
    <marker id="plc-faults-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box-alarm" x="20" y="60" width="120" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="80" y="82">Major fault</text>
  <text class="dg-text-sm dg-mid" x="80" y="98">in a routine</text>
  <rect class="dg-box" x="190" y="60" width="140" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="260" y="82">Program fault</text>
  <text class="dg-text-sm dg-mid" x="260" y="98">routine</text>
  <rect class="dg-box" x="380" y="60" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="445" y="82">Controller</text>
  <text class="dg-text-sm dg-mid" x="445" y="98">fault handler</text>
  <rect class="dg-box-alarm" x="540" y="60" width="80" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="580" y="90">Stop</text>
  <line class="dg-line" x1="140" y1="85" x2="188" y2="85" marker-end="url(#plc-faults-ah)"/>
  <line class="dg-line" x1="330" y1="85" x2="378" y2="85" marker-end="url(#plc-faults-ah)"/>
  <line class="dg-line" x1="510" y1="85" x2="538" y2="85" marker-end="url(#plc-faults-ah)"/>
  <text class="dg-text-sm dg-mid" x="260" y="50">not cleared</text>
  <text class="dg-text-sm dg-mid" x="445" y="50">not cleared</text>
  <path class="dg-line-ok" d="M260 112 L260 160 L80 160 L80 140" fill="none" marker-end="url(#plc-faults-ah)"/>
  <path class="dg-line-ok" d="M445 112 L445 160 L80 160" fill="none"/>
  <text class="dg-text-sm" x="110" y="180">Cleared in either: scan resumes at the next rung</text>
</svg>`
  },

  pitfalls: [
    "A fault routine that clears every major fault, hiding real bugs.",
    "Clearing a fault without protecting the data that caused it, so the next scan faults again.",
    "Alarming on module data instead of the connection status bit.",
    "A GSV destination tag too small or the wrong type for the attribute.",
    "Setting the controller clock with SSV without deciding on UTC or local time first.",
    "Forgetting that SSV changes may not be in the project file until you upload."
  ],

  keyTerms: ["major-fault", "minor-fault", "fault-handler", "gsv-ssv", "power-up-handler", "watchdog"],

  quiz: [
    {
      q: "A major fault occurs in a routine that has a program fault routine and the controller fault handler. In what order do they run?",
      options: ["Controller fault handler, then program fault routine", "Both at once", "Program fault routine, then controller fault handler if not cleared", "Power-up handler first"],
      answer: 2,
      explain: [
        "The program-level routine is tried first.",
        "They run in sequence, not in parallel.",
        "Correct. If neither clears the fault the controller stops.",
        "The power-up handler runs at power up, not on a runtime fault."
      ]
    },
    {
      q: "Which is a minor fault?",
      options: ["Arithmetic overflow flagged without stopping the controller", "Watchdog timeout", "Array subscript out of range", "Jump to a missing label"],
      answer: 0,
      explain: [
        "Correct. Minor faults are recorded while the controller keeps running.",
        "A watchdog timeout is a major fault.",
        "Out-of-range subscripts are major faults.",
        "That is a major fault."
      ]
    },
    {
      q: "You want to know whether a remote input card is alive. What is the best signal?",
      options: ["The value of its first input", "The module's connection fault status", "The scan time", "The controller's OK light"],
      answer: 1,
      explain: [
        "A dead module can leave a believable stale value.",
        "Correct. Connection status tells you whether data is current.",
        "Scan time does not depend on one card.",
        "The OK light shows controller health, not each module."
      ]
    },
    {
      q: "A GSV on WallClockTime LocalDateTime needs which destination?",
      options: ["A single DINT", "A BOOL", "A STRING", "An array of at least seven DINTs"],
      answer: 3,
      explain: [
        "One DINT is too small for seven values.",
        "A BOOL cannot hold the date and time.",
        "The attribute returns numbers, not a string.",
        "Correct. Year, month, day, hour, minute, second and microsecond need seven elements."
      ]
    },
    {
      q: "What is the best way to avoid a type 4 code 20 fault from an HMI recipe number?",
      options: ["A fault routine that clears every fault", "Make the array bigger", "Range-check the index before it indexes the array", "Turn off the watchdog"],
      answer: 2,
      explain: [
        "That hides problems and lets bad data continue.",
        "A bigger array only moves the limit.",
        "Correct. A bounds check prevents the fault, and the fault routine remains as a net.",
        "The watchdog is unrelated to subscript errors."
      ]
    }
  ],

  resources: [
    { title: "Major, Minor, and I/O Faults (1756-PM014)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm014_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Information and Status (1756-PM015)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm015_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Get System Value (GSV) and Set System Value (SSV)", url: "https://www.rockwellautomation.com/en-fi/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/input-output-instructions/get-system-value--gsv--and-set-system-value--ssv-.html", type: "docs", source: "Rockwell Automation" },
    { title: "GSV/SSV Programming Example", url: "https://www.rockwellautomation.com/en-dk/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/input-output-instructions/gsv-ssv-programming-example.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Tasks, Programs, and Routines", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm005_-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
