LC.lesson({
  id: "plc-safety",
  title: "Safety PLCs, SIL and PL",
  track: "plc",
  minutes: 15,
  level: 2,
  prereqs: ["plc-intro"],
  tags: ["safety", "guardlogix", "sil", "performance-level", "sis", "iec-61508"],
  summary: "Why safety functions run on certified hardware with their own rules, and the vocabulary you need to talk to a safety engineer without bluffing.",
  objectives: [
    "Explain why safety logic never goes in a standard PLC program",
    "Describe what a safety PLC adds: dual processing, safety tasks, safety tags and a safety signature",
    "Explain dual-channel inputs and why discrepancy is a fault",
    "Compare SIL (IEC 61508/61511) with PL (ISO 13849) at a conceptual level",
    "Tell a SIS from a BPCS and say what Ignition may and may not do with safety data"
  ],

  body: `
## What this lesson is, and is not

A safety function is something that must reduce risk to people even when parts of the control system fail: an e-stop that drops motor power, a light curtain that stops a press, a high-pressure trip that closes a feed valve. Standard PLCs are built to be flexible and easy to change. Safety PLCs are built to be **provably predictable when they break**. This lesson gives you awareness-level vocabulary so you can read a spec, talk to a safety engineer and know when to stop. It is not a design course. Specifying and validating a safety function is a job for a qualified functional safety engineer.

## Why you never put safety in standard logic

A standard PLC can fail dangerously and silently. A relay-output card can weld shut, a CPU memory bit can flip, an input can stick at 1, and the ladder program has no way to know. A rung that says \`XIC(EStop) OTE(MotorRun)\` assumes the e-stop signal is honest. For a safety function that assumption is not allowed.

Safety systems answer this with:

- **Redundancy and cross-checking.** Two independent paths compute the same thing and compare.
- **Diagnostics.** The system tests its own inputs, outputs and memory, and goes to a **safe state** (outputs de-energized) when it finds a fault.
- **Certification.** A third party has assessed the hardware and firmware for a target integrity level.
- **Controlled change.** You cannot silently edit the logic. Changes are tracked and the program carries a signature.

Putting a safety function in standard logic loses all four. Even if it works on the bench, you cannot prove it, and an insurer or inspector will not accept it.

> [!warning] The standard-logic trap
> A common mistake is a "software e-stop" in the standard task, or a safety reset that the HMI can write. If a bug, a forced bit or a screen can defeat the safety function, it is not a safety function.

## What a safety PLC adds

On the Rockwell side the family is **GuardLogix** (ControlLogix-style, e.g. 1756 and Compact GuardLogix 5069). A GuardLogix controller is a normal Logix controller that is also a safety controller, and it keeps two worlds apart.

{{diagram:tasks}}

| Concept | What it means |
|---|---|
| **Safety task** | A periodic task that runs only safety programs. It has a watchdog and a defined safety task period (a required reaction time). |
| **Safety tags** | Tags in the safety scope. Standard logic may read them, but only safety logic can write them. |
| **Standard tags** | Normal tags. Safety logic can read them for information, but may not base a safety decision on them. |
| **Safety I/O** | Dual-channel input and output modules with diagnostics. They talk to the controller over CIP Safety on EtherNet/IP. |
| **Safety signature** | A unique ID, date and time covering the safety logic, data and configuration. Any change creates a new signature. |
| **Safety lock** | Locks the safety task so it cannot be edited casually. |

The **safety signature** is how a safety engineer proves that the program in the controller is the one that was validated. Studio 5000 can generate a signature report. A signature is expected for SIL 2 or SIL 3 operation. When you see a different signature than the validation paperwork, the machine needs re-validation.

> [!note] How this reaches Ignition
> Ignition can read safety tags like any other tag, to display the e-stop chain or guard status. It must never write them. Treat safety tags as read-only information, and never use a screen button as a safety reset.

## Dual-channel inputs

A safety device such as an e-stop button or a light curtain has **two independent contacts** wired to two input terminals. The safety module evaluates both channels:

- Both channels must agree. If one reads closed and the other open for longer than a **discrepancy time** (for example 20 ms), the module declares a fault and drives the function to its safe state.
- The module can pulse each channel with **test outputs** to detect shorts to power or to the other channel.
- On a reset, both channels must go through a valid cycle (open, then closed) before the function is released.

The cost is double the wiring and I/O. The gain is that **a single failure cannot silently defeat the function**.

> [!example] A stuck contact
> An e-stop has two normally closed contacts. One contact welds closed. When the operator hits the button, channel B opens and channel A does not. After the discrepancy time the safety module faults and de-energizes the output. A single-channel input would have kept running.

## SIL and PL: two scales for the same idea

Both measure how much you can trust a safety function to work when needed. They come from different standards families, and you will hear both.

| | SIL | PL |
|---|---|---|
| Name | Safety Integrity Level | Performance Level |
| Standards | IEC 61508 (general), IEC 61511 (process industry), IEC 62061 (machinery) | ISO 13849-1 (machinery) |
| Levels | SIL 1 to 4 (SIL 4 rarely used) | PL a to e |
| Typical home | Process plants, SIS, complex programmable systems | Machine guarding, press, robot cells |
| Based on | Probability of dangerous failure per hour or on demand, architecture, diagnostics | Average probability of dangerous failure per hour, category (architecture), MTTFd, diagnostic coverage |

Rough correspondence is often quoted as PL d near SIL 2 and PL e near SIL 3, but the mapping is informative and not a substitution rule. Use whichever standard the project specification names.

The required level comes from a **risk assessment**: how severe could the harm be, how often is someone exposed, and how easily can they avoid it? A pinch point on a slow conveyor and a robot cell with a person inside need very different levels.

## SIS vs BPCS

In process plants the vocabulary changes:

- **BPCS** (Basic Process Control System) runs the process every day: PID loops, sequences, normal alarms. Your Logix project and Ignition live here.
- **SIS** (Safety Instrumented System) is an independent layer that takes the process to a safe state if the BPCS fails or an upset gets out of range. It has its own sensors, logic solver and final elements (valves). IEC 61511 governs it, and each safety instrumented function (SIF) gets a SIL.

Independence is the point. If the BPCS and SIS share a sensor or a PLC, a single failure can take out both the control and its safety net. That is why a trip valve usually has its own transmitter, wired to a separate logic solver. Some vendors offer SIS-rated variants (Rockwell's Logix SIS family is one) for process safety systems.

On a machine, the equivalent is simply "the safety circuit": e-stops, guard door switches and light curtains going into a safety relay or GuardLogix, and from there to contactors.

## Awareness checklist

- Know whether a safety function exists before you edit a project. Look for a safety task, safety tags or a safety relay in the drawings.
- Do not bypass, force or reroute safety signals "just for testing."
- Do not move logic between the safety and standard tasks.
- If a change touches safety logic, stop and involve whoever owns the validation.
- Keep SCADA and HMI interactions with safety **read-only**, except for approved, engineered reset functions.
`,

  eli5: `
Think of the brake system in a car. The engine control computer is clever and flexible, and if it crashes, the car simply stops running. But if the brakes depended on that same computer being right, a crash in it could mean no brakes at all.

So car makers build brakes differently. There are two separate hydraulic circuits. If one leaks, the other still stops the car. A warning light checks the system when you turn the key. The parts are tested to a standard that is much stricter than for the radio.

A safety PLC is the brakes. The regular PLC is the engine computer. They sit in the same car, and the engine computer can look at what the brakes are doing, but it can never press or release the brakes itself. Two switches wired to every emergency stop button are the two brake circuits. If they ever disagree, the machine stops and tells you something is wrong, instead of guessing.

SIL and PL are grades, like a star rating, for how trustworthy the brakes are.
`,

  why: `
**Why a separate safety PLC?** A standard controller cannot detect its own dangerous failures. Statistics decide this, not opinions. A safety function that must work "when called" or "per hour" at a given reliability needs diagnostics and redundancy that a general-purpose design does not have. That is why the safety hardware is certified, and why changes to its program are controlled with a signature.

**Why keep standard logic out of the safety task?** Every instruction in the safety task is something that must be validated. Mixing in convenience logic expands the validation scope and raises the chance that an unrelated edit breaks a safety function. The one-way rule (standard can read safety, safety does not trust standard) keeps the proven part small.

**Why SIS separate from BPCS?** If one fault can cause the upset and defeat the protection, you do not have two layers of protection, you have one. Independence is what earns the risk reduction credit.

**Where engineers argue.** Some teams use safety PLCs for all machine safety and accept the cost. Others use hardwired safety relays for simple functions (a single e-stop with one contactor) because they are simpler to validate and need no programming. Process teams argue about shared hardware between BPCS and SIS to save money, and in practice most standards-minded owners insist on separation. Integrators also differ on how much safety they will design: many will wire and program to a specification from a safety engineer, but will not own the risk assessment.
`,

  history: `
Machine safety was first done with hardwired relays, and the functional safety standards followed. IEC 61508 set the general framework for electrical, electronic and programmable electronic safety systems, and sector standards grew from it: IEC 61511 for process industries and IEC 62061 for machinery. ISO 13849 came from the machinery side with its own performance levels. Programmable safety controllers appeared once they could meet those standards, letting one controller replace racks of safety relays.
`,

  examples: [
    {
      title: "Reading a spec line",
      body: `A machine specification says: *"E-stop function, ISO 13849-1 PL d, Category 3, stop category 0."* PL d with Category 3 means a dual-channel architecture with good diagnostics. Stop category 0 means remove power to the actuators immediately. In practice that points to dual-channel e-stop inputs on a safety module, and a safety output that drops the contactor coils.`
    },
    {
      title: "What Ignition shows",
      body: `A Perspective screen shows the status of three e-stops and a guard door. The tags are safety tags read through the controller's OPC connection. The screen displays *Guard open* and who last reset it. It has no button that resets the safety circuit, because the reset is a physical button wired to the safety input, per the machine's validated design.`
    }
  ],

  diagrams: {
    tasks: `<svg viewBox="0 0 640 230" role="img" aria-label="A GuardLogix controller runs a standard task and a safety task. Standard logic can read safety tags. Safety logic writes safety outputs through dual-channel safety I/O.">
  <defs><marker id="plc-safety-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-zone" x="20" y="20" width="600" height="190" rx="8"/>
  <text class="dg-title" x="36" y="44">GuardLogix controller</text>
  <rect class="dg-box" x="40" y="62" width="230" height="130" rx="6"/>
  <text class="dg-text" x="56" y="88">Standard task</text>
  <text class="dg-text-muted" x="56" y="110">Normal programs and tags</text>
  <text class="dg-text-muted" x="56" y="128">Changes freely</text>
  <text class="dg-text-muted" x="56" y="146">Talks to Ignition</text>
  <rect class="dg-box-accent" x="370" y="62" width="230" height="130" rx="6"/>
  <text class="dg-text" x="386" y="88">Safety task</text>
  <text class="dg-text-muted" x="386" y="110">Safety programs, safety tags</text>
  <text class="dg-text-muted" x="386" y="128">Safety signature, lock</text>
  <text class="dg-text-muted" x="386" y="146">Dual-channel I/O, CIP Safety</text>
  <line class="dg-line" x1="368" y1="170" x2="272" y2="170" marker-end="url(#plc-safety-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="164">read only</text>
  <text class="dg-text-muted dg-mid" x="320" y="188">safety to standard</text>
</svg>`
  },

  pitfalls: [
    "Building a 'software e-stop' or safety reset in the standard task or on an HMI screen.",
    "Forcing, bypassing or jumpering a safety input to keep a machine running during troubleshooting.",
    "Changing safety logic without regenerating the signature and re-validating.",
    "Assuming SIL 2 and PL d are interchangeable on paper. Use the standard the specification names.",
    "Sharing a sensor or logic solver between the BPCS and the SIS, which removes their independence."
  ],

  keyTerms: ["safety-plc", "guardlogix", "safety-signature", "dual-channel", "sil", "performance-level", "sis", "bpcs"],

  quiz: [
    {
      q: "Why is an e-stop implemented as XIC(EStop) OTE(MotorRun) in a standard PLC task not acceptable as a safety function?",
      options: ["Ladder logic is too slow", "Standard PLCs cannot read pushbuttons", "A standard PLC cannot detect its own dangerous failures, such as a stuck input", "Ignition would override it"],
      answer: 2,
      explain: [
        "Speed is rarely the issue. Ladder can be fast enough.",
        "Standard PLCs read pushbuttons fine. The issue is trust under failure.",
        "Correct. Safety needs diagnostics, redundancy and certified hardware so a single fault cannot defeat the function.",
        "Ignition is not the reason. Even with no SCADA the design is inadequate."
      ]
    },
    {
      q: "An e-stop with two contacts feeds a safety input. One contact welds shut. What does a dual-channel safety module do when the button is pressed?",
      options: ["Ignores it, since one channel still says run", "Detects the discrepancy and drives the function to its safe state", "Waits for Ignition to confirm", "Switches to single-channel mode"],
      answer: 1,
      explain: [
        "This is exactly the failure dual-channel inputs exist to catch.",
        "Correct. The channels disagree beyond the discrepancy time, which is treated as a fault and results in the safe state.",
        "Safety modules do not depend on SCADA.",
        "Safety modules do not fall back to a lower-integrity mode silently."
      ]
    },
    {
      q: "What is the safety signature for?",
      options: ["Identifying the exact validated safety logic, data and configuration, so any change is detectable", "Authenticating Ignition users", "Encrypting the controller's network traffic", "Setting the safety task's period"],
      answer: 0,
      explain: [
        "Correct. If the signature in the controller differs from the validation record, the program has changed.",
        "User authentication is a separate security feature.",
        "The signature is an identifier, not encryption.",
        "The period is a task setting, separate from the signature."
      ]
    },
    {
      q: "A specification calls for 'PL d'. Which standard family is this from?",
      options: ["IEC 61511", "IEC 61131-3", "ISA-95", "ISO 13849-1"],
      answer: 3,
      explain: [
        "IEC 61511 is process safety and uses SIL.",
        "IEC 61131-3 defines PLC programming languages.",
        "ISA-95 is about enterprise-control integration.",
        "Correct. ISO 13849-1 defines performance levels a to e for machinery."
      ]
    },
    {
      q: "In a process plant, which is true about the BPCS and SIS?",
      options: ["They should share sensors to reduce cost and drift", "The SIS should be independent so one fault cannot defeat both control and protection", "The SIS is just another Ignition project", "The SIS runs the normal PID loops"],
      answer: 1,
      explain: [
        "Shared sensors create a common cause failure and remove independence.",
        "Correct. Independence is what lets the SIS count as a separate layer of protection.",
        "SCADA is part of the BPCS side and is not a safety system.",
        "Normal regulatory control is the BPCS's job."
      ]
    }
  ],

  resources: [
    { title: "GuardLogix Controller Systems Safety Reference Manual (1756-RM093)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm093_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "GuardLogix Controllers User Manual (1756-UM020)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1756-um020_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "GuardLogix 5580 and Compact GuardLogix 5580 Controllers (1756-RM012)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm012_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix SIS GuardLogix 5580 Controllers Safety Reference Manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm015_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Performance levels and safety integrity levels: a closer look", url: "https://automationworld.com/home/article/13297069/performance-levels-and-safety-integrity-levels-a-closer-look", type: "article", source: "Automation World" }
  ]
});
