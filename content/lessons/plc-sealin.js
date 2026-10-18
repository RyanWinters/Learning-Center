LC.lesson({
  id: "plc-sealin",
  title: "Seal-in circuits, start/stop and latches",
  track: "plc",
  minutes: 20,
  level: 2,
  prereqs: ["plc-ladder-basics"],
  tags: ["ladder", "seal-in", "start-stop", "OTL", "OTU", "latch", "motor-control"],
  summary: "How a momentary Start button becomes a running motor, why a seal-in rung is safer than a latch, and the few places OTL/OTU are right.",
  objectives: [
    "Build a three-wire start/stop seal-in rung with the stop and fault conditions in series",
    "Explain why a stop pushbutton is wired normally-closed and examined with XIC",
    "Describe how OTL and OTU retain their value through power loss while OTE does not",
    "Choose between a seal-in and a latch for a motor, an alarm and a sequence flag",
    "Predict which of two rungs wins when OTL and OTU for the same bit are both true"
  ],

  body: `A **seal-in circuit** (also called a holding circuit or latching with a "maintain" contact) is how a momentary Start button becomes a motor that keeps running. You release the button and the motor stays on, because the rung feeds itself. It is the oldest pattern in ladder logic, it came straight from relay panels, and nearly every motor, pump and conveyor you will ever program starts from it.

## The relay-panel origin

Before PLCs, a motor starter was a contactor with a coil. A momentary Start button energized the coil, the contactor pulled in, and an auxiliary contact on the contactor closed in parallel with the Start button. When you let go of Start, that auxiliary contact kept the coil energized. The Stop button was a normally-closed contact in series with the coil. Press it, the circuit opens, the coil drops, the auxiliary contact opens, and the circuit stays dead until Start is pressed again.

That is **three-wire control**: a Start wire, a Stop wire and a common. The name survived into PLCs. Two-wire control, by contrast, is a maintained switch (a selector or a float switch): the motor runs as long as the contact is closed, and it restarts the moment power returns.

## The rung in Logix

{{diagram:threewire}}

\`\`\`ladder
[XIC(Start_PB) ,XIC(M101_RunCmd)] XIC(Stop_OK) OTE(M101_RunCmd)
XIC(M101_RunCmd) OTE(M101_Out)
\`\`\`

Read it left to right. Either Start_PB is pressed *or* M101_RunCmd is already on. Either one passes power to Stop_OK, which must also be true. If it is, the OTE turns M101_RunCmd on. The second rung copies the run command to the physical output \`M101_Out\` (house standard: seal on a command bit, drive the output from it). On the next scan, the M101_RunCmd contact in the lower branch is true, so releasing Start_PB changes nothing. When Stop_OK goes false, the rung goes false, OTE writes M101_RunCmd to 0, and the seal-in contact opens. Pressing Start again is the only way back.

This works because of how the scan is evaluated: the XIC(M101_RunCmd) reads the value the OTE wrote on the *previous* scan. The rung is feeding on its own last result. See {{lesson:plc-scan}} if that ordering is not clear.

### Stop dominates

Put the Stop and fault conditions in series *after* the parallel branch, not before it. If a Start press and a Stop condition are both present, the series element wins and the rung is false. A stop must always beat a start. This is also why the Start and the seal-in branch sit together at the left, and the permissives sit at the right.

### Wire the stop fail-safe

The Stop pushbutton is a **normally-closed** contact wired to the input card. With the button untouched, the input is energized (1). Pressing it, or a cut wire, or a loose terminal, drops the input to 0. In the program you therefore use **XIC** on the Stop input, which reads true when everything is healthy. Name the tag for the healthy state (\`Stop_OK\`, or \`Stop_PB_NC\`) so nobody reads it backwards. Status inputs such as the overload follow the same rule: a healthy circuit is a 1, and any failure is read as a trip.

> [!warning] Never wire Stop normally-open
> A normally-open Stop button reads 0 when idle and 1 when pressed. A broken wire looks identical to an idle button, so a motor you thought you could stop will not stop. Stop and safety circuits are always wired so that a loss of signal means stop. Remember too that a PLC rung is not a safety function. An E-stop must cut power through hardwired safety hardware, with the PLC only monitoring it (next section).

## What is hardwired and what is in the PLC

In a real starter, the **overload relay's NC contact and the E-stop are wired in series with the contactor coil**, in the field wiring, outside the PLC. The PLC output (usually through an interposing relay) is only one more contact in that same series string. The PLC also gets two read-only inputs: an **auxiliary contact** on the contactor (proof that it pulled in) and the **overload status** (a second, separate overload contact). This is the arrangement NFPA 79 and UL 508A panels use, and it is the house standard for every example in this course.

{{diagram:circuitvsrung}}

The reason is plain. If the overload lived only in a rung, a program fault, a forced bit or a welded output relay could keep the coil energized with the motor overheating. With the contact in the coil circuit, no software state can hold the contactor in. The PLC rung is the *normal* start and stop. The hardwired string is the *protection*. See {{lesson:found-motor-control}} for the wiring side of this, including how the output card enters the coil circuit.

| Item | Where it acts | What the PLC does with it |
|---|---|---|
| Overload relay NC contact | Hardwired in series with the coil | Reads a status input, raises an alarm, drops the run command |
| E-stop / safety-rated stop | Hardwired (or safety relay / safety PLC) in the coil circuit | Monitors it only |
| Normal Stop pushbutton | Input to the PLC rung | Opens the seal-in rung |
| Process permissives (tank not empty, downstream running) | In the rung | Series XIC contacts |
| Contactor auxiliary contact | Input only | Shows the motor really ran, feeds status and fail-to-start |

{{sim:sim-sealin}}

## Latches: OTL and OTU

Logix also has **OTL** (output latch) and **OTU** (output unlatch). OTL sets a bit to 1 when its rung is true and does nothing when the rung is false. OTU clears the bit when its rung is true and does nothing when false. The bit stays where it is in between.

\`\`\`ladder
XIC(Fault_Trip) OTL(Fault_Latched)
XIC(Fault_Reset) XIO(Fault_Trip) OTU(Fault_Latched)
\`\`\`

An OTL bit is **retentive**. It keeps its value through a power cycle and a switch from Run to Program and back. An OTE is the opposite: its value is recomputed every scan from its rung, so after power returns it comes back only if the rung conditions are true again.

{{diagram:powerloss}}

### Why seal-in beats OTL/OTU for a motor

Compare the two ways to start a motor.

| | OTE seal-in | OTL / OTU |
|---|---|---|
| Stop button pressed | Rung drops, motor off | OTU rung must be true, motor off |
| Wire to Stop breaks | Rung drops, motor off | OTU never fires, motor keeps running |
| Power lost then restored | Motor off, waits for Start | Motor bit still set, restarts alone |
| Fault condition appears | Series permissive drops it | Needs a separate OTU rung for every cause |
| Reading the logic | One rung shows all conditions | Set and clear are in different places |

The restart-on-power-up case is the dangerous one. A conveyor that restarts by itself after an outage can injure someone who went to clear a jam while power was off. The broken-wire case is the quiet one: with a latch, the logic *needs a signal* to stop, and a failed signal means no stop. With a seal-in, the logic *needs signals* to keep running, and a failed signal means a stop.

{{sim:sim-latch}}

### When latches are the right tool

Latches are correct when you *want* retention, or when set and clear really are separate events from separate places.

- **Alarm and fault latches.** A trip occurs for one scan, but the operator must see it and acknowledge it. OTL holds it, an acknowledge button clears it.
- **Sequence memory.** A "batch started" or "step 3 complete" flag that must survive a power cycle so the sequence can resume sensibly.
- **Mode flags.** Remembering Manual or Auto through an outage.
- **Set from one routine, clear from another**, where a single rung would be awkward.

> [!tip] Latch order matters
> If an OTL rung and an OTU rung for the same bit are both true in a scan, the one that executes last wins. Put the OTU after the OTL so reset dominates, or guard it as in the example above with an XIO of the trip condition.

If a latched bit must not survive a restart, clear it on the first scan after power-up. Logix provides the first-scan status bit \`S:FS\`, which is true on the first scan only. A rung like \`XIC(S:FS) OTU(Fault_Latched)\` forces a known state.

## Worked example: transfer pump motor M101

Pump motor M101 (Meridian Foods Plant 1, Area10) has a local start pushbutton, a normally-closed local stop, HMI Start and Stop bits in the \`M101.Cmd\` structure of its {{term:udt|UDT_Motor}}, an overload relay and a contactor auxiliary contact. The overload NC contact is **wired in the coil circuit**, and a second contact of the same relay goes to a digital input as \`M101_OL_OK\`. The contactor aux goes to \`M101_Aux\`.

\`\`\`ladder
[XIC(Local_Start_PB) ,XIC(M101.Cmd.Start) ,XIC(M101_RunCmd)] XIC(Local_Stop_OK) XIO(M101.Cmd.Stop) XIC(M101_OL_OK) XIC(Tank_Not_Low) OTE(M101_RunCmd)
XIC(M101_RunCmd) OTE(M101_Out)
XIC(M101_Aux) OTE(M101.Sts.Running)
XIO(M101_OL_OK) OTL(M101.Alm.Overload)
XIC(M101.Cmd.Reset) XIC(M101_OL_OK) OTU(M101.Alm.Overload)
\`\`\`

Rung 1 is the seal-in on the command bit. Local Start and the HMI Start are in parallel with the seal-in contact. The permissives are in series. Rung 2 drives the physical output from the command, so the logic can be tested without moving the real output. Rung 3 reports the **actual** running state from the auxiliary contact, which is what the HMI should show.

Rungs 4 and 5 are the one place a latch earns its keep: an overload trip is remembered for the operator until it is acknowledged, and the reset only works once the overload relay itself has reset. \`XIC(M101_OL_OK)\` in rung 1 is **not** the protection, since the hardwired contact already dropped the coil. It drops the *command*, so M101 does not restart on its own when the overload relay is reset.

Notice that \`M101.Cmd.Stop\` is XIO (a 0 means "not stopping"). An HMI-written bit is software and not a wire, so a stop pressed once and then released needs its own treatment, usually a momentary write from Ignition that the PLC clears.

## Seal in on the command, the output or the feedback?

The example seals on \`M101_RunCmd\`, the internal bit. Sealing on the physical output (\`M101_Out\`) is acceptable in a quick teaching rung, but forcing or double-writing the output then corrupts the seal, so the house standard seals on a command bit and drives the output from it.

Some designs seal on the contactor auxiliary input (\`M101_Aux\`) instead, so the rung only holds if the contactor truly pulled in. That is more honest but adds a start-up problem: the feedback is 0 when you press Start, so the Start branch has to hold the rung long enough for the contactor to close. A common compromise is to seal on the command bit and add a separate "failed to start" timer that sets \`M101.Alm.FailToStart\` and drops the command if the aux does not arrive within a second or two. A hardwired E-stop or overload trip then shows up as exactly that: command on, aux never made.`,

  eli5: `Think of a light switch and a doorbell button. A doorbell only rings while you hold it down. A light switch stays where you put it. A motor start button is a doorbell, but we want the motor to behave like the light.

So we give the motor a helper. When you press the doorbell, the motor starts, and the motor then reaches over and holds the button down for you. Now you can let go and it keeps going. The Stop button works by pulling the helper's hand away.

The special part is what happens when the lights go out. The helper is only holding the button while things are running, so when power vanishes the helper lets go, and nothing restarts when power comes back. A different kind of memory, a latch, is like a light switch that physically stays flipped. When power returns, the switch is still on, and the machine takes off by itself. That surprise is why we use the helper trick for machines that can hurt people.`,

  why: `**Why not just latch it?** A latch needs an explicit event to turn off. Everything that can stop the machine (stop button, overload, low level, guard open, a broken wire) must each be wired to an unlatch rung, and one forgotten cause means a motor that cannot be stopped by that cause. A seal-in inverts the burden: the motor runs only while every condition is true, so adding a new interlock is one more contact in series.

**Why does power-up behavior matter so much?** Plants lose power several times a year. If a conveyor or mixer restarts on its own, it does so with people possibly inside the guarding. Standards and site rules usually require a deliberate restart, and an OTE seal-in gives that for free, which is why integrators default to it.

**What do experienced people argue about?** Some insist OTL/OTU should never touch a motor. Others use a latched "run request" bit with a first-scan clear. Both camps agree on the core rule: the stop path must work with no signal and the start path must not survive a power cycle.

**Why wire Stop normally-closed when it looks backwards?** Because wires fail open far more often than they weld shut. A cut or loose wire on a NC circuit looks exactly like a Stop press, so the failure is visible and safe. On a normally-open Stop, the same failure is invisible until the day you need it.

**Why keep the logic on an internal bit?** It lets you simulate, force and test the logic without driving a real contactor, and it separates "the program wants it running" from "the output card did something".`,

  history: `The pattern is older than the PLC. Relay-ladder diagrams for motor starters were standard in industrial panels by the mid-20th century, and the first PLCs (late 1960s) were deliberately built to be programmed in that same ladder notation so electricians could read them. The seal-in contact, the series NC stop and the term three-wire control carried over unchanged.`,

  examples: [
    { title: "Start/stop with a jog button", body: `Add a Jog pushbutton that runs the motor only while held. Jog must not seal in. Give it its own bit and feed the output from a separate rung: \`XIC(Jog_PB) OTE(Jog_Cmd)\`, then \`[XIC(Run_Seal) ,XIC(Jog_Cmd)] XIC(Stop_OK) OTE(M101_Out)\`, where Run_Seal is the seal-in bit from the normal start rung. Releasing Jog drops Jog_Cmd and the motor stops, because Run_Seal was never set.` },
    { title: "Recovering from a power cycle", body: `A mixer uses OTL to hold Mixer_Run. After a 2 second outage it starts spinning the moment power returns, with the guard door open. The fix is to move to an OTE seal-in, or keep OTL but clear it with \`XIC(S:FS) OTU(Mixer_Run)\`. Test it by turning the controller off and on with the motor running.` }
  ],

  diagrams: {
    circuitvsrung: `<svg viewBox="0 0 640 330" role="img" aria-label="Two views of one motor starter. Top: a relay-era three-wire circuit with every contact hardwired in series with the coil. Bottom: a PLC rung does the start and stop, but the E-stop and overload contacts stay hardwired in the coil circuit and the PLC only reads the overload status and the contactor auxiliary contact.">
  <text class="dg-title" x="20" y="22">Control circuit versus rung</text>
  <rect class="dg-zone" x="10" y="32" width="620" height="120" rx="4"/>
  <text class="dg-text-sm" x="20" y="50">Relay-era three-wire circuit, all hardwired</text>
  <text class="dg-text-sm" x="20" y="100">L1</text>
  <line class="dg-line" x1="44" y1="96" x2="70" y2="96"/>
  <rect class="dg-box-ok" x="70" y="82" width="70" height="28" rx="3"/><text class="dg-text-sm dg-mid" x="105" y="100">E-stop NC</text>
  <line class="dg-line" x1="140" y1="96" x2="150" y2="96"/>
  <rect class="dg-box" x="150" y="82" width="64" height="28" rx="3"/><text class="dg-text-sm dg-mid" x="182" y="100">Stop NC</text>
  <line class="dg-line" x1="214" y1="96" x2="224" y2="96"/>
  <rect class="dg-box" x="224" y="82" width="64" height="28" rx="3"/><text class="dg-text-sm dg-mid" x="256" y="100">Start NO</text>
  <path class="dg-line" d="M218,96 L218,133 L224,133"/>
  <rect class="dg-box" x="224" y="120" width="64" height="26" rx="3"/><text class="dg-text-sm dg-mid" x="256" y="137">M aux NO</text>
  <path class="dg-line" d="M288,133 L294,133 L294,96"/>
  <line class="dg-line" x1="288" y1="96" x2="318" y2="96"/>
  <rect class="dg-box-ok" x="318" y="82" width="64" height="28" rx="3"/><text class="dg-text-sm dg-mid" x="350" y="100">OL NC</text>
  <line class="dg-line" x1="382" y1="96" x2="412" y2="96"/>
  <rect class="dg-box-accent" x="412" y="82" width="60" height="28" rx="14"/><text class="dg-text-sm dg-mid" x="442" y="100">Coil M</text>
  <line class="dg-line" x1="472" y1="96" x2="500" y2="96"/>
  <text class="dg-text-sm" x="506" y="100">L2</text>
  <text class="dg-text-muted dg-text-sm" x="320" y="140">The aux contact is the seal-in.</text>
  <rect class="dg-zone" x="10" y="162" width="620" height="160" rx="4"/>
  <text class="dg-text-sm" x="20" y="180">PLC era: the rung starts and stops, protection stays in the coil circuit</text>
  <rect class="dg-box-accent" x="20" y="192" width="230" height="120" rx="4"/>
  <text class="dg-text-sm" x="30" y="212">PLC</text>
  <text class="dg-text-sm" x="30" y="232">Rung: seal-in on M101_RunCmd</text>
  <text class="dg-text-sm" x="30" y="250">Output: M101_Out</text>
  <text class="dg-text-sm" x="30" y="268">Inputs: M101_Aux, M101_OL_OK</text>
  <text class="dg-text-sm" x="30" y="286">These two inputs are monitor only</text>
  <text class="dg-text-sm" x="266" y="244">L1</text>
  <line class="dg-line" x1="284" y1="240" x2="290" y2="240"/>
  <rect class="dg-box-ok" x="290" y="226" width="66" height="28" rx="3"/><text class="dg-text-sm dg-mid" x="323" y="244">E-stop NC</text>
  <line class="dg-line" x1="356" y1="240" x2="366" y2="240"/>
  <rect class="dg-box-ok" x="366" y="226" width="56" height="28" rx="3"/><text class="dg-text-sm dg-mid" x="394" y="244">OL NC</text>
  <line class="dg-line" x1="422" y1="240" x2="432" y2="240"/>
  <rect class="dg-box" x="432" y="226" width="70" height="28" rx="3"/><text class="dg-text-sm dg-mid" x="467" y="244">M101_Out</text>
  <line class="dg-line" x1="502" y1="240" x2="512" y2="240"/>
  <rect class="dg-box-accent" x="512" y="226" width="56" height="28" rx="14"/><text class="dg-text-sm dg-mid" x="540" y="244">Coil M</text>
  <line class="dg-line" x1="568" y1="240" x2="594" y2="240"/>
  <text class="dg-text-sm" x="598" y="244">L2</text>
  <path class="dg-line-thin dg-dash" d="M394,254 L394,274 L250,274"/>
  <text class="dg-text-muted dg-text-sm" x="300" y="270">OL status</text>
  <path class="dg-line-thin dg-dash" d="M540,254 L540,296 L250,296"/>
  <text class="dg-text-muted dg-text-sm" x="300" y="292">Aux contact status</text>
</svg>`,
    threewire: `<svg viewBox="0 0 640 250" role="img" aria-label="Timing of a seal-in rung: a brief Start press turns the motor on and it stays on until the Stop circuit opens">
  <text class="dg-title" x="20" y="24">Seal-in rung over time</text>
  <text class="dg-text-sm" x="20" y="66">Start_PB</text>
  <path class="dg-line-accent" d="M170,72 L260.0,72 L260.0,50 L305.0,50 L305.0,72 L620,72"/>
  <text class="dg-text-sm" x="20" y="110">Stop_OK (NC)</text>
  <path class="dg-line-accent" d="M170,94 L440.0,94 L440.0,116 L476.0,116 L476.0,94 L620,94"/>
  <text class="dg-text-sm" x="20" y="154">M101_RunCmd</text>
  <path class="dg-line-ok" d="M170,160 L260.0,160 L260.0,138 L440.0,138 L440.0,160 L620,160"/>
  <line class="dg-line-thin dg-dash" x1="260.0" y1="44" x2="260.0" y2="172"/>
  <text class="dg-text-muted dg-mid" x="260.0" y="188">press</text>
  <line class="dg-line-thin dg-dash" x1="305.0" y1="44" x2="305.0" y2="172"/>
  <text class="dg-text-muted dg-mid" x="305.0" y="188">released</text>
  <line class="dg-line-thin dg-dash" x1="440.0" y1="44" x2="440.0" y2="172"/>
  <text class="dg-text-muted dg-mid" x="440.0" y="188">Stop</text>
  <line class="dg-line-thin dg-dash" x1="476.0" y1="44" x2="476.0" y2="172"/>
  <text class="dg-text-muted dg-mid" x="476.0" y="188">Stop released</text>
  <text class="dg-text-sm" x="170" y="226">M101_RunCmd stays on after Start drops because its own contact is in parallel with Start.</text>
</svg>`,
    powerloss: `<svg viewBox="0 0 640 250" role="img" aria-label="Power loss: an OTE-sealed motor drops out and stays off after power returns, an OTL-latched motor comes back on by itself">
  <text class="dg-title" x="20" y="24">What happens across a power loss</text>
  <rect class="dg-box-alarm" x="330" y="40" width="110" height="150" rx="4"/>
  <text class="dg-text-sm dg-mid" x="385" y="60">Power off</text>
  <text class="dg-text-sm" x="20" y="78">Start_PB</text>
  <path class="dg-line-accent" d="M170,84 L260.0,84 L260.0,62 L305.0,62 L305.0,84 L620,84"/>
  <text class="dg-text-sm" x="20" y="122">Motor (seal-in OTE)</text>
  <path class="dg-line-ok" d="M170,128 L260.0,128 L260.0,106 L395.0,106 L395.0,128 L620,128"/>
  <text class="dg-text-sm" x="20" y="166">Motor (OTL latch)</text>
  <path class="dg-line-alarm" d="M170,172 L260.0,172 L260.0,150 L620,150"/>
  <line class="dg-line-thin dg-dash" x1="260.0" y1="44" x2="260.0" y2="184"/>
  <text class="dg-text-muted dg-mid" x="260.0" y="200">Start</text>
  <line class="dg-line-thin dg-dash" x1="395.0" y1="44" x2="395.0" y2="184"/>
  <text class="dg-text-muted dg-mid" x="395.0" y="200">loss</text>
  <line class="dg-line-thin dg-dash" x1="485.0" y1="44" x2="485.0" y2="184"/>
  <text class="dg-text-muted dg-mid" x="485.0" y="200">restore</text>
  <text class="dg-text-sm" x="20" y="226">The latched motor is still set when power returns, so it restarts with nobody pressing Start.</text>
</svg>`
  },

  pitfalls: [
    "Putting the Stop contact inside the seal-in branch or ahead of it, so Start can override a Stop condition.",
    "Wiring a Stop or overload as normally-open, which hides a broken wire.",
    "Using OTL/OTU for a motor run command, which restarts it after power loss and ignores a failed stop signal.",
    "Using the same bit in two OTE instructions. The last rung scanned wins and the earlier one is silently overwritten.",
    "Forgetting that OTL/OTU bits survive a power cycle and mode changes, so a stale latch can block the next start.",
    "Naming the input for the button (Stop_PB) rather than its healthy state, then reading the XIC backwards."
  ],

  keyTerms: ["seal-in", "three-wire-control", "otl-otu", "retentive", "fail-safe-wiring", "first-scan", "udt"],

  quiz: [
    {
      q: "A motor start rung is `[XIC(Start) ,XIC(Run)] XIC(Stop_OK) OTE(Run)`. Start is released while Stop_OK is true. What happens to Run?",
      options: ["It turns off, because Start went false", "It stays on, because XIC(Run) holds the rung true", "It flickers every scan", "It faults the controller"],
      answer: 1,
      explain: [
        "Start going false only removes one branch leg.",
        "Correct. The OTE wrote 1 to Run last scan, so the XIC(Run) leg keeps the rung true.",
        "The rung result is stable, so there is no flicker.",
        "This is ordinary, legal ladder."
      ]
    },
    {
      q: "Which is the best reason to wire a Stop pushbutton normally-closed?",
      options: ["A broken wire looks like a Stop press, so the failure is safe", "NC contacts last longer", "The PLC input cards only accept NC contacts", "It saves one rung of logic"],
      answer: 0,
      explain: [
        "Correct. Wire failure drops the input to 0 which stops the motor.",
        "Contact life is not the reason.",
        "Input cards accept either type.",
        "The logic is the same size either way, just inverted."
      ]
    },
    {
      q: "After a power outage, which motor control restarts by itself?",
      options: ["An OTE seal-in rung", "A two-wire rung with a held Start", "An OTL that set the Run bit", "None of them"],
      answer: 2,
      explain: [
        "The OTE bit is recomputed and the Start press is gone, so it stays off.",
        "A maintained two-wire contact can restart, but it is not a PLC-retained bit, and OTL is the clearer answer here.",
        "Correct. OTL is retentive, so the bit is still set when power returns.",
        "The OTL case does restart."
      ]
    },
    {
      q: "An OTL and an OTU for the same bit are both true in one scan. What is the final value?",
      options: ["Always 1", "Always 0", "The controller faults", "The instruction scanned last wins"],
      answer: 3,
      explain: [
        "OTL does not take priority.",
        "OTU does not take priority either.",
        "Neither instruction faults.",
        "Correct. Each writes in turn, so rung order decides."
      ]
    },
    {
      q: "Which use of OTL is a good fit?",
      options: ["Holding a conveyor run command", "Seal-in for a pump", "Remembering that a trip happened until the operator acknowledges it", "Replacing XIC on a stop button"],
      answer: 2,
      explain: [
        "That is the dangerous case.",
        "Use a seal-in for a pump.",
        "Correct. Alarms need to be remembered and acknowledged.",
        "OTL is an output, not an input contact."
      ]
    },
    {
      q: "Where should the stop and overload contacts go in a seal-in rung?",
      options: ["In parallel with Start", "In series after the Start/seal-in branch", "Only in a separate OTU rung", "Before the output on its own rung"],
      answer: 1,
      explain: [
        "A parallel stop would act like a start.",
        "Correct. Series conditions can always break the rung, so Stop dominates.",
        "That is the latch method, with its drawbacks.",
        "The rung needs them in line with the output so they can break it."
      ]
    },
    {
      q: "A pump overload relay trips. Where must its protective contact act?",
      options: ["Hardwired in series with the starter coil, with the PLC monitoring a status contact", "Only as an XIC in the seal-in rung, since the PLC sees it faster than a relay", "In an OTL rung that sets a fault bit", "Wired to the HMI so the operator can stop the pump"],
      answer: 0,
      explain: [
        "Correct. The hardwired contact cuts the coil whatever the software does. The PLC reads the status to alarm and to drop its own run command.",
        "A rung can be bypassed by a program fault, a force or a welded output relay, leaving the motor energized and overheating.",
        "A fault latch is useful for the operator but protects nothing.",
        "Protection must not depend on a person or a screen."
      ]
    }
  ],

  resources: [
    { title: "Bit Instructions (Studio 5000 Logix Designer online help)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/bit-instructions1.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers General Instructions Reference Manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm018_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Instruction Set (Studio 5000 Logix Designer v37)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set.html", type: "docs", source: "Rockwell Automation" }
  ]
});
