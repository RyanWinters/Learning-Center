LC.lesson({
  id: "plc-oneshots",
  title: "One-shots: ONS, OSR, OSF",
  track: "plc",
  minutes: 15,
  level: 2,
  prereqs: ["plc-sealin"],
  tags: ["ladder", "one-shot", "ONS", "OSR", "OSF", "edge", "toggle"],
  summary: "Turn a held input into a one-scan event: how ONS, OSR and OSF work, the storage-bit rules, and the push-on/push-off toggle.",
  objectives: [
    "Explain the difference between testing a level and detecting an edge",
    "Use ONS, OSR and OSF and say when each output is true",
    "Apply the storage-bit rules: unique, private and never reused",
    "Build a push-on/push-off toggle from a one-shot",
    "Recognize the common bugs: shared storage, lost pulse and phantom first-scan edge"
  ],

  body: `A **one-shot** turns a long-lived condition into a single-scan event. Your push button might be held for half a second, and the PLC may scan it two hundred times. Without a one-shot, a rung that adds 1 to a total would add two hundred. With one, it adds exactly one, on the scan where the button went from released to pressed. One-shots are how you ask "did this just happen?" instead of "is this true?".

## Level versus edge

An ordinary contact like XIC tests a **level**: true for as long as the bit is 1. Counting, toggling, sequence stepping, logging and sending a message all need an **edge**: the moment the level changes. A transition from 0 to 1 is a **rising edge** (or leading edge). From 1 to 0 is a **falling edge** (trailing edge).

Logix has no "rising edge contact" in ladder. It builds edges from one stored bit that remembers what the rung looked like on the previous scan. The instruction compares now with then. If they differ in the right direction, it passes power for this scan only.

{{diagram:edges}}

## The three instructions

### ONS: One Shot

\`\`\`ladder
XIC(Part_Sensor) ONS(Part_Sensor_OS) OTE(Part_Seen)
\`\`\`

ONS has one operand, a **storage bit**. It sits in the middle of a rung like a contact. When the conditions to its left go from false to true, ONS lets the rest of the rung be true for exactly one scan. On later scans, with the left side still true, it blocks. It re-arms when the left side goes false.

### OSR: One Shot Rising

\`\`\`ladder
XIC(Start_PB) OSR(Start_PB_OS,Start_PB_Pulse)
\`\`\`

OSR has two operands: a storage bit and an **output bit**. The output is 1 for one scan when the rung condition-in goes from false to true. It is an output instruction, so it sits at the end of a rung (or on a branch leg), and you then use the output bit as an ordinary contact elsewhere: \`XIC(Start_PB_Pulse)\`.

### OSF: One Shot Falling

\`\`\`ladder
XIC(Part_Sensor) OSF(Part_Sensor_OS2,Part_Left)
\`\`\`

OSF is the mirror image. Its output is 1 for one scan when the rung condition-in goes from true to false. Use it for "the part just left the sensor", "the button was released" or "the run command was dropped".

| | Input to rung | Fires when | Operands | Placement |
|---|---|---|---|---|
| ONS | Middle of rung | rung-in rises | storage bit | like a contact |
| OSR | End of rung | rung-in rises | storage bit, output bit | like a coil |
| OSF | End of rung | rung-in falls | storage bit, output bit | like a coil |

> [!note] Names vary by view
> Some Rockwell safety documentation swaps the words "rising" and "falling" for OSR and OSF. In the general-purpose Logix instruction set, OSR is the rising edge and OSF is the falling edge. Check the instruction help for your version if a task depends on it.

## Storage bit rules

The storage bit is the instruction's memory. It is a plain BOOL that holds last scan's rung state. Treat it as owned by that one instruction.

1. **Every one-shot gets its own storage bit.** Two one-shots sharing a bit overwrite each other's memory. Both produce confusing, intermittent results.
2. **Never use the storage bit anywhere else.** Do not examine it, write it with OTE or reset it from the HMI.
3. **Do not reuse the output bit as the storage bit.** They have different jobs.
4. **A one-shot only updates when it executes.** If its rung is skipped (inside a routine that is not being called, or behind a JMP), the memory goes stale and a false edge can appear when it runs again.
5. **Use clear names.** \`Start_PB_OS\` for the storage bit and \`Start_PB_Pulse\` for the output keeps them straight.

> [!warning] Position the ONS next to the output
> The ONS "uses up" its pulse on the scan it fires, whether or not the rest of the rung can use it. If a condition to the right of the ONS is false on that scan, the pulse is lost and the ONS will not fire again until the left side drops and rises. Put ONS as the last thing before the output, so every condition that matters is to its left.

\`\`\`ladder
XIC(Cycle_Start) XIC(Machine_Ready) XIO(Fault) ONS(Cycle_Start_OS) OTL(Cycle_Running)
\`\`\`

## Push-on / push-off toggle

A single button that toggles a motor or a mode is the classic one-shot application. It takes two rungs: make an edge pulse, then flip.

\`\`\`ladder
XIC(Toggle_PB) OSR(Toggle_OS,Toggle_Edge)
[XIC(Toggle_Edge) XIO(Run_Cmd) ,XIC(Run_Cmd) XIO(Toggle_Edge)] OTE(Run_Cmd)
\`\`\`

{{diagram:toggle}}

Walk through it. Run_Cmd is 0 and you press the button. Toggle_Edge is 1 for one scan, so the first branch is true and Run_Cmd becomes 1. The next scan, Toggle_Edge is 0 and Run_Cmd is 1, so the second branch holds it on. Press again: Toggle_Edge is 1 and Run_Cmd is 1, so *neither* branch is true and Run_Cmd drops to 0. The rung is an exclusive-OR of the pulse and the current state.

Without the one-shot, this rung would flip Run_Cmd on every scan while the button is held, leaving it in an unpredictable state when released.

{{sim:sim-ons}}

## Common one-shot bugs

- **Shared storage bits.** Copy-pasting a one-shot rung and forgetting to rename the storage bit. Both rungs now fire at odd moments.
- **Lost pulse.** ONS placed before a condition that is false on the edge scan. The event is swallowed.
- **Power-up edge.** After a download or first run, the storage bit may be 0 while the input is already 1. The one-shot then fires once on the first scan, and a counter or sequence takes a phantom step. If that matters, qualify with \`XIO(S:FS)\`.
- **Output used before the OSR in the scan.** The pulse bit is true for one scan, but a rung *above* the OSR reads it in the following scan if it has already been scanned, or it may never see it if the pulse sits in a different task. Keep consumers in the same routine, below the OSR.
- **Too-short inputs.** A one-shot sees an input only when the PLC scans it. A pulse shorter than a scan, or an input filtered slower than your pulse, is missed. Use an input with a fast filter or an interrupt task for high-speed signals.
- **Missing edge in HMI writes.** An Ignition button that writes 1 then 0 quickly might change faster than the scan can see. Have the PLC clear the command bit, or hold the write for a fixed time.

## Worked example: counting parts once

A photo-eye sees a box on a conveyor. Boxes travel slowly, so the sensor stays true for around 400 ms, which is dozens of scans with a 10 ms scan time. A CTU already counts only on false-to-true transitions (see {{lesson:plc-counters}}), but you often want a separate pulse as well, for example to log a timestamp or fire a message.

\`\`\`ladder
XIC(Box_Eye) OSR(Box_Eye_OS,Box_Arrived)
XIC(Box_Arrived) ADD(Boxes_Today,1,Boxes_Today)
XIC(Box_Arrived) MOV(Shift_ID,Last_Box_Shift)
\`\`\`

Rung 1 produces a one-scan pulse. Rungs 2 and 3 run their instructions once per box. An ADD in the rung without the pulse would add 1 every scan, 40 times for one box. This is the single most common one-shot use: protecting a math or move instruction that is not edge-triggered by itself.`,

  eli5: `Imagine a doorbell that rings once for every press, no matter how long you lean on the button. You press it and it goes "ding". You keep your finger there for ten seconds and it does not ding ten hundred times. Only a new press makes a new ding.

A PLC is like a person who looks at the doorbell button very, very quickly, over and over. If you hold the button, it sees "pressed" every look. A one-shot is a little note the PLC keeps for itself: "last time I looked, was it pressed?" If last time it was not pressed and now it is, that is a new press, so ring once. If last time it was pressed too, stay quiet.

The "note to self" is the storage bit. Two doorbells cannot share one note, or each will forget what the other one saw.`,

  why: `**Why does the PLC need this at all?** Because it scans, and it scans fast. A human press lasts hundreds of scans, and any instruction that acts "when true" acts every one of them. Add, move, send-message and step-the-sequence instructions all do something on each scan the rung is true. One-shots are the standard tool to make them act once.

**Why a stored bit instead of a built-in edge contact?** The Logix instruction set keeps the edge memory in tag data you can see, which means you can monitor it, and it also means you can break it by sharing or overwriting it. The tradeoff is flexibility for responsibility.

**Why not just use a timer or a latch to get one action?** You can, but each adds state to manage and to reset. A one-shot is the shortest correct solution and reads clearly: "once, when it rises".

**Why do experienced integrators distrust ONS in the middle of a rung?** Because the pulse is consumed even if a later condition blocks it, which silently drops events. Many people prefer OSR into a named pulse bit, then use that bit as a normal contact next to the other conditions. The pulse is then visible in the tag table and in the HMI during troubleshooting.

**Why does power-up matter?** Edge memory starts at whatever the storage bit holds. A fresh download makes an already-true input look like a brand-new event, so anything that mustn't happen on startup needs a first-scan guard.`,

  history: `Relay panels had no concept of an edge, so one-shot circuits used a time-delay relay to make a brief pulse. PLCs brought one-shot instructions to give the same effect in software. The ONS, OSR and OSF family carried through from the PLC-5 and SLC 500 platforms into Logix, where the storage bit became an ordinary tag.`,

  examples: [
    { title: "Release detection for a jog", body: `A jog button should log how long it was held. \`XIC(Jog_PB) OSR(Jog_OS,Jog_Start)\` stores the start time on the pulse, and \`XIC(Jog_PB) OSF(Jog_OS2,Jog_End)\` runs the subtraction on release. Each uses its own storage bit.` },
    { title: "Why the toggle fails without OSR", body: `With the toggle rung driven directly by the button, holding it for 50 ms (five scans) flips Run_Cmd five times. The final value depends on whether you held it an odd or even number of scans. Adding the one-shot makes it one flip per press.` }
  ],

  diagrams: {
    edges: `<svg viewBox="0 0 640 250" role="img" aria-label="Timing of ONS, OSR and OSF: the input stays high for many scans but the one-shot outputs are true for exactly one scan at the edge">
  <text class="dg-title" x="20" y="24">One-shot outputs against a held input</text>
  <text class="dg-text-sm" x="20" y="66">Input rung</text>
  <path class="dg-line-accent" d="M170,72 L260.0,72 L260.0,50 L485.0,50 L485.0,72 L620,72"/>
  <text class="dg-text-sm" x="20" y="110">OSR output</text>
  <path class="dg-line-ok" d="M170,116 L260.0,116 L260.0,94 L271.2,94 L271.2,116 L620,116"/>
  <text class="dg-text-sm" x="20" y="154">OSF output</text>
  <path class="dg-line-alarm" d="M170,160 L485.0,160 L485.0,138 L496.2,138 L496.2,160 L620,160"/>
  <line class="dg-line-thin dg-dash" x1="260.0" y1="44" x2="260.0" y2="172"/>
  <text class="dg-text-muted dg-mid" x="260.0" y="188">rising</text>
  <line class="dg-line-thin dg-dash" x1="485.0" y1="44" x2="485.0" y2="172"/>
  <text class="dg-text-muted dg-mid" x="485.0" y="188">falling</text>
  <text class="dg-text-sm" x="170" y="226">Each pulse is one scan wide (drawn wider than scale so you can see it).</text>
</svg>`,
    toggle: `<svg viewBox="0 0 640 230" role="img" aria-label="Push-on push-off toggle: each press of the button flips Run, because the one-shot pulse XORs with Run">
  <text class="dg-title" x="20" y="24">Push-on / push-off toggle</text>
  <text class="dg-text-sm" x="20" y="64">Button</text>
  <path class="dg-line-accent" d="M170,70 L215.0,70 L215.0,48 L305.0,48 L305.0,70 L395.0,70 L395.0,48 L507.5,48 L507.5,70 L620,70"/>
  <text class="dg-text-sm" x="20" y="108">Edge pulse</text>
  <path class="dg-line-ok" d="M170,114 L215.0,114 L215.0,92 L224.0,92 L224.0,114 L395.0,114 L395.0,92 L404.0,92 L404.0,114 L620,114"/>
  <text class="dg-text-sm" x="20" y="152">Run</text>
  <path class="dg-line-accent" d="M170,158 L215.0,158 L215.0,136 L395.0,136 L395.0,158 L620,158"/>
  <line class="dg-line-thin dg-dash" x1="215.0" y1="42" x2="215.0" y2="170"/>
  <text class="dg-text-muted dg-mid" x="215.0" y="186">press 1</text>
  <line class="dg-line-thin dg-dash" x1="395.0" y1="42" x2="395.0" y2="170"/>
  <text class="dg-text-muted dg-mid" x="395.0" y="186">press 2</text>
  <text class="dg-text-sm" x="170" y="212">Press 1 turns Run on, press 2 turns it off. Holding the button does nothing extra.</text>
</svg>`
  },

  pitfalls: [
    "Reusing one storage bit for two one-shots.",
    "Putting the ONS before conditions that can be false on the edge scan.",
    "Forgetting that an already-true input produces an edge on the first scan after download.",
    "Reading the pulse bit above the OSR in the routine, so the consumer sees it a scan late.",
    "Expecting a one-shot to catch an input pulse shorter than the scan or the input filter time.",
    "Writing to or examining the storage bit elsewhere."
  ],

  keyTerms: ["one-shot", "rising-edge", "falling-edge", "storage-bit", "push-on-push-off"],

  quiz: [
    {
      q: "An OSR sees its rung stay true for 300 scans. How many scans is its output bit true?",
      options: ["300", "1", "2", "Until the rung goes false"],
      answer: 1,
      explain: [
        "That would be a plain XIC, not a one-shot.",
        "Correct. OSR pulses once, on the false-to-true scan.",
        "One scan, not two.",
        "That describes the level, not the edge."
      ]
    },
    {
      q: "Two one-shot rungs both use the storage bit Edge_OS. What happens?",
      options: ["Nothing, storage bits can be shared", "Each overwrites the other's memory, so edges fire or vanish unpredictably", "The controller faults", "The second rung is ignored at download"],
      answer: 1,
      explain: [
        "Sharing is the classic bug.",
        "Correct. Each sees what the other left behind.",
        "No fault is generated, just wrong behavior.",
        "Logix does not check for this."
      ]
    },
    {
      q: "Which instruction detects that a part has just left a photo-eye?",
      options: ["OSR on the sensor", "OSF on the sensor", "XIC with no one-shot", "CTU"],
      answer: 1,
      explain: [
        "OSR fires when the part arrives.",
        "Correct. The sensor goes true to false as the part leaves.",
        "A plain contact is true the whole time the part is present.",
        "A counter accumulates, it does not give a one-scan pulse."
      ]
    },
    {
      q: "In the toggle rung, why is the Run_Cmd branch written with XIO(Toggle_Edge) in the second leg?",
      options: ["To stop the seal-in from holding Run_Cmd on during the scan of the second press", "To save a contact", "To make the rung scan faster", "Because OSR requires it"],
      answer: 0,
      explain: [
        "Correct. On the second press both Edge and Run are 1, and the second leg must be false for Run_Cmd to turn off.",
        "It adds a contact rather than saving one.",
        "Scan time is unaffected.",
        "OSR has no such requirement."
      ]
    },
    {
      q: "An ONS sits in the middle of a rung with a false permissive to its right when the button first goes true. What happens?",
      options: ["The pulse is saved until the permissive is true", "The pulse is lost and the rung fires only after the button drops and rises again", "The ONS bypasses the permissive", "The controller sets a minor fault"],
      answer: 1,
      explain: [
        "ONS does not queue pulses.",
        "Correct. The ONS consumed the edge and cannot fire again until re-armed.",
        "Series conditions always apply.",
        "No fault is raised."
      ]
    }
  ],

  resources: [
    { title: "Bit Instructions (Studio 5000 Logix Designer online help)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/bit-instructions1.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers General Instructions Reference Manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm018_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix5000 Controllers General Instructions Reference Manual (1756-RM003I)", url: "https://lvmcc-pubs.rockwellautomation.com/pubs/1756-rm003i-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
