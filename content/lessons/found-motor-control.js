LC.lesson({
  id: "found-motor-control",
  title: "Motor control circuits and output wiring",
  track: "found",
  minutes: 25,
  level: 2,
  prereqs: ["found-devices", "found-signals"],
  tags: ["motor-control", "contactor", "wiring", "schematics", "stop-categories", "safety"],
  summary: "How a start/stop circuit is really wired, where the PLC output enters it, and why overloads and E-stops stay in the hardwired chain.",
  objectives: [
    "Trace a three-wire start/stop circuit and name each device in the coil path",
    "Explain why the overload contact and E-stop are wired in series with the coil and not in PLC logic",
    "Choose between driving a coil directly and using an interposing relay",
    "Describe how a 24 VDC sourcing output drives a coil, and why you add suppression and fusing",
    "Tell stop category 0, 1 and 2 apart at awareness level",
    "Read a motor control schematic using wire numbers and cross-references"
  ],

  body: `
## What a motor circuit is

A motor in Meridian Plant 1 (M101 in Area10) is not started by the PLC directly. A **{{term:motor-starter|motor starter}}** does the switching: a {{term:contactor|contactor}} that closes three power poles, plus an {{term:motor-overload|overload relay}} that watches the motor current. The PLC asks the starter to run through a small control circuit. If you understand that circuit, you understand why the PLC program has the shape it has, and you can read an electrician's drawing without guessing.

There are two circuits to keep apart. The **power circuit** carries motor current (say 480 V three-phase). The **control circuit** carries a few tenths of an amp to the contactor coil, at 120 VAC or 24 VDC. This lesson is about the control circuit and the PLC output that joins it.

## The control transformer

Most starters get control power from a **{{term:control-transformer|control power transformer}}** inside the panel. It steps 480 V down to 120 V. Its secondary is fused, and one side is usually grounded (the neutral, X2). Everything in the coil path runs at that 120 V, which is why a "control circuit" in a motor cabinet is still dangerous. See {{lesson:found-elec-safety}}.

PLC-side circuits run at 24 VDC from a separate DC supply. Many panels use both: 120 VAC for the starter coil path and 24 VDC for PLC I/O, joined by relays.

## The three-wire start/stop circuit

{{diagram:threewire}}

The classic circuit has a normally-closed Stop button, a normally-open Start button (momentary) and a contactor coil M. Three wires go to the push-button station, hence the name {{term:three-wire-control|three-wire control}}. Reading the first schematic left to right:

1. **E-stop (NC).** A latching mushroom button. Closed when released. Pulling or pressing it opens the path and drops out the coil.
2. **Stop (NC).** Closed until pressed.
3. **Start (NO)** in parallel with the **seal-in**: an {{term:aux-contact|auxiliary contact}} on the contactor itself, wired to close when M pulls in.
4. **Overload contact (NC).** Opens when the overload relay trips.
5. **Coil M.** When the path is complete, the coil energizes and the contactor pulls in.

Press Start and the coil energizes. The auxiliary contact closes in parallel with Start. Release Start and the aux contact keeps the coil energized: this is the hardwired {{term:seal-in|seal-in}} you meet in ladder logic in {{lesson:plc-sealin}}. Press Stop, trip the overload, pull the E-stop or lose power, and the coil drops out. When power returns the coil stays off until someone presses Start again. That is deliberate: a motor should not restart by itself after an outage.

> [!why] Why NC for stop devices
> A normally-closed stop device fails safe. A cut wire or a loose terminal looks exactly like a pressed Stop button, so the motor stops. A normally-open stop would fail by *not stopping* when you need it.

### Where the PLC enters

The third branch in the schematic shows the PLC. The PLC output energizes **CR101**, a small {{term:interposing-relay|interposing relay}}, and CR101's contact sits in parallel with the Start button. The PLC is acting like a very fast operator pressing Start. It is *inside* the hardwired chain, not above it. Stop, E-stop and overload are in series with everything, so no PLC output or program can keep the coil energized once any of them opens.

This is the house rule: **overloads, E-stops and safety-rated stops are hardwired in the starter coil circuit. The PLC monitors an auxiliary contact and overload status. It never provides the only means of stopping or protection.** Software permissives such as "tank level is OK" live in logic.

There are other arrangements. Some designs use the PLC output to drive the coil circuit directly, with the output contact in series with the stop chain, and no seal-in at all in hardware (the PLC holds the run command). Both are common. What does not vary is that protection devices sit in the coil path in hardware.

### Interposing relay or direct drive

| Option | When it fits | Watch for |
|---|---|---|
| **Interposing relay** | Coil current or inrush above what the output can switch; AC coil on a DC output; isolation between PLC and starter | Another part to fail, but cheap, replaceable and gives a fault-isolation point |
| **Direct to coil** | Small DC coil within the output module rating | Check the module manual for per-point and per-group current limits, and inrush. A coil draws several times its sealed current while the armature closes |

The practical default is the interposing relay. A relay output module (dry contacts) or a triac output are alternatives. Choose from the output module's published ratings.

## Monitoring from the PLC

The PLC does not trust the command it sent. It reads back what happened.

- **Run feedback.** An auxiliary contact on the contactor feeds a PLC input. If this input is on, the contactor actually closed. This is the source for \`M101.Sts.Running\`.
- **Overload status.** The overload relay has a separate auxiliary contact (IEC-style overloads label them 95-96 and 97-98 on the terminals). Wire an NC contact so a broken wire reads as "tripped". This drives \`M101.Alm.Overload\`.
- **Fail to start.** If \`M101_RunCmd\` has been on longer than \`M101.Cfg.StartDelay\` and the aux input is off, raise \`M101.Alm.FailToStart\`. Causes: tripped OL, open E-stop, blown control fuse, bad coil.

\`\`\`st
// Status comes from the field, not from our own output
M101.Sts.Running  := M101_AuxIn;              // aux contact on the contactor
M101.Alm.Overload := NOT M101_OLOK;           // NC OL status contact, 1 when healthy

// Fail-to-start: command is on but no feedback
FailToStartTmr.IN := M101_RunCmd AND NOT M101_AuxIn;
FailToStartTmr.PT := M101.Cfg.StartDelay;     // DINT, ms
TON(FailToStartTmr);
M101.Alm.FailToStart := FailToStartTmr.Q;
\`\`\`

Notice that the PLC cannot tell the difference between "overload tripped" and "E-stop pulled" unless you wire a feedback for each. Many sites wire the E-stop status or the safety relay status to a separate input so the HMI can say which one it was.

{{sim:sim-sealin}}

## 24 VDC outputs, coils and spikes

{{diagram:output}}

A typical 24 VDC **sourcing** output (PNP) supplies +24 V to the load when it turns on. The load's other side goes to 0 V. A **sinking** output (NPN) does the opposite: the load connects to +24 V and the output switches the 0 V side. See {{term:sinking-sourcing|sinking/sourcing}}. Check the module's wiring diagram, because mixing them gives a load that never turns on, or one that is always on.

**Suppression.** A coil is an inductor. When the output turns off, the collapsing magnetic field makes the coil voltage spike far above the supply, in the opposite direction. That spike can damage output electronics and couples noise into neighboring wiring. {{term:coil-suppression|Coil suppression}} gives that current a harmless path:

| Coil type | Suppressor | Notes |
|---|---|---|
| DC coil | **Diode** across the coil (cathode to +) | Simple and effective. Slows dropout a bit because current circulates in the coil |
| DC coil, faster drop-out needed | Diode in series with a zener | Fast release, higher clamp voltage |
| AC coil | **RC snubber** or **metal oxide varistor (MOV)** | A diode does not work on AC |
| Many modern relays | Plug-in suppression module | Often built into the relay base |

Most output modules and interposing relay bases have some protection. Don't assume. Add suppression at the coil, which is where the energy is.

**Fusing.** A shorted coil or damaged wire can pull far more than the module can carry. Put a fuse or circuit protector in the supply to each group of outputs, sized from the module manual and the wire. The {{term:output-fusing|output fuse}} should blow before the module's own protection or the wire fails. Many output modules have a built-in fuse or electronic limit, so read the manual.

## Stop categories at awareness level

{{term:stop-categories|Stop categories}} from IEC 60204-1 describe how a machine stops. NFPA 79 ({{term:nfpa-79|NFPA 79}}) follows the same ideas for US machinery.

| Category | What happens | Typical use |
|---|---|---|
| **0** | Power to the actuators is removed immediately. The machine coasts (uncontrolled stop) | E-stop on a mixer that can safely coast |
| **1** | A controlled stop with power available to brake, then power is removed when stopped | E-stop on a conveyor or large rotating load that must brake first |
| **2** | A controlled stop with power left on the actuators | Normal production stop, where the drive holds the load |

An emergency stop must act as category 0 or 1, chosen from a risk assessment. A category 0 stop uses hardwired electromechanical means, and does not rely on software or a network command. On a VFD the category 0 function is usually done with Safe Torque Off. The stopping distance and time depend on the load. These categories are unrelated to the "Category B, 1, 2, 3, 4" architectures of ISO 13849-1, which is a frequent source of confusion. Safety circuits beyond a basic E-stop belong to a safety PLC or relay, covered in {{lesson:plc-safety}}.

## Reading a schematic

A motor circuit drawing is a ladder with power rails on the sides and one rung per circuit. Three habits make it readable.

- **Wire numbers.** Every conductor between two devices has a number, and the same number appears on every point at that electrical node. If you find wire 3 at the Stop button, you will find it at the Start button and the seal-in contact. On a physical panel the label on the wire matches the drawing. Troubleshooting becomes: measure from wire 4 to X2 and see where the voltage disappears.
- **Device tags.** M is the contactor, OL the overload, CR101 the relay, S1 a button. They are written next to the symbol.
- **Cross-references.** Under each coil, a small table lists the sheet and line where that coil's contacts are used (for example "M: 3, 3, 8"). Under each contact, the line of its coil. This is how you find "where is the other contact of CR101?" on a 40-sheet drawing.

> [!example] Tracing a no-start on M101
> The operator presses Start and nothing happens. The HMI shows \`M101.Alm.FailToStart\`. From the schematic: measure 120 V from wire 1 to X2 (control power OK). Measure from wire 2 to X2 (E-stop closed?) and wire 3 to X2 (Stop closed?). Wire 4 to X2 reads 120 V but wire 5 reads 0 V: the overload contact between them is open. The overload is tripped, but the PLC input \`M101_OLOK\` already told you that before anyone opened the panel. The measurements above are a task for a qualified person, not for you with the door open. The point for you is that the tag tells you which section of the schematic to hand over.
`,

  eli5: `
Think of a doorbell button that turns on a light, with a few safety rules built into the wiring.

In a motor circuit, the light is the motor's big switch. There is a little electromagnet (the coil) that, when it gets power, pulls a heavy switch shut. To keep the light on after you let go of the button, a second little switch moves along with the big one and quietly holds the connection for you. That helper is the "seal-in."

Now the safety rules. Between the power and the electromagnet you put a string of "must be closed" switches in a row: the big red emergency button, the stop button, and a heat sensor that opens if the motor gets too hot. If any one of them opens, the chain breaks and the electromagnet lets go. The computer is just another finger that can press the start button. It cannot cut through the chain, because the chain is made of plain wire and switches.

When the electromagnet turns off, it kicks out a little spark of energy. A small diode next to it gives that kick somewhere safe to go, like a drain beside a sink.
`,

  why: `
**Why is protection hardwired and not in the PLC?** A PLC can freeze, be in program mode, have an output stuck on, or run a program with a bug. A motor overload that depends on a program fails when the program fails. A wire and a contact in series with the coil does not need a power-up or a scan. The hardwired chain also lets an electrician isolate and test the safety path without a laptop. This is why safety codes such as NFPA 79 require emergency stop circuits to be hardware-based, and it is why the PLC reads status but does not own stopping.

**Why monitor with an auxiliary contact and not trust the output?** The output tells you what the PLC *wanted*. The aux contact tells you what the contactor *did*. The difference is the entire fault-detection story: fail to start, welded contactor, tripped overload, blown fuse. Experienced integrators argue about whether Running should come from the aux contact (truthful, slower, needs a wire) or from the command (simple, can lie). The house standard is the aux contact.

**Why an interposing relay?** It costs a few dollars and protects an expensive output card. A shorted coil or an inrush that damages a $300 module is replaced by a $15 relay. The tradeoff is more parts and one more thing in the troubleshooting path.

**Why suppress coils?** Skipping a $0.30 diode saves almost nothing and produces failures that look like random PLC glitches: outputs welding, inputs flickering, an analog reading that jumps when a contactor drops. Noise problems are hard to diagnose, so suppress at the source.

**Where do integrators disagree?** Whether to seal in with hardware or in software. Hardware seal-in keeps working if the PLC stops and drops out on power loss, which is often what you want. Software seal-in gives a single place to see the logic. Many plants use software with a hardwired stop chain as shown here. Whichever you choose, document it on the schematic.
`,

  history: `
Before PLCs, plants controlled motors with relay panels, with the start/stop station, seal-in contact and overload wired exactly as in this lesson. PLCs were created to replace those panels, and ladder logic keeps the look of the relay schematic. The wiring convention outlived the technology: today's PLC output is often just one more contact in the same coil circuit. Stop categories come from IEC 60204-1, the machinery electrical standard, and NFPA 79 is the US counterpart.
`,

  examples: [
    {
      title: "Wire numbers for M101",
      body: `Meridian drawing for M101: control power from the CPT secondary is wire 1. E-stop output is 2, Stop output is 3, the Start/aux/CR101 parallel group output is 4, overload output is 5, the coil returns to X2. If a meter reads 120 V at wire 3 but 0 V at wire 4, the fault is in the Start group: a bad CR101 contact, a bad aux contact, or a loose terminal. Wire numbers shrink the search to one rung segment.`
    },
    {
      title: "Choosing coil suppression",
      body: `The interposing relay CR101 has a 24 VDC coil on a PLC sourcing output. Use a diode across the coil. The contactor M has a 120 VAC coil. A diode would conduct on one half cycle and short the coil, so use an RC snubber or MOV rated for the coil voltage, usually as a plug-in block. When in doubt, check the coil's data sheet and the manufacturer's accessory list.`
    }
  ],

  diagrams: {
    threewire: `<svg viewBox="0 0 640 290" role="img" aria-label="Three-wire motor control schematic: control power rails, E-stop and Stop in series, Start in parallel with the M auxiliary seal-in contact and a PLC relay contact, then the overload contact in series with coil M">
  <line class="dg-line" x1="30" y1="40" x2="30" y2="236"/>
  <line class="dg-line" x1="610" y1="40" x2="610" y2="236"/>
  <text class="dg-text-sm" x="14" y="30">L1 120 V</text>
  <text class="dg-text-sm dg-end" x="626" y="30">X2</text>
  <line class="dg-line" x1="30" y1="90" x2="60" y2="90"/>
  <rect class="dg-box" x="60" y="76" width="64" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="92" y="95">E-STOP</text>
  <line class="dg-line" x1="124" y1="90" x2="150" y2="90"/>
  <rect class="dg-box" x="150" y="76" width="64" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="182" y="95">STOP</text>
  <line class="dg-line" x1="214" y1="90" x2="240" y2="90"/>
  <line class="dg-line" x1="240" y1="90" x2="240" y2="196"/>
  <line class="dg-line" x1="240" y1="90" x2="260" y2="90"/>
  <rect class="dg-box-accent" x="260" y="76" width="64" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="292" y="95">START</text>
  <line class="dg-line" x1="240" y1="146" x2="260" y2="146"/>
  <rect class="dg-box-accent" x="260" y="132" width="64" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="292" y="151">M aux</text>
  <line class="dg-line" x1="240" y1="196" x2="260" y2="196"/>
  <rect class="dg-box-ok" x="260" y="182" width="64" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="292" y="201">CR101</text>
  <line class="dg-line" x1="324" y1="90" x2="350" y2="90"/>
  <line class="dg-line" x1="324" y1="146" x2="350" y2="146"/>
  <line class="dg-line" x1="324" y1="196" x2="350" y2="196"/>
  <line class="dg-line" x1="350" y1="90" x2="350" y2="196"/>
  <line class="dg-line" x1="350" y1="90" x2="380" y2="90"/>
  <rect class="dg-box" x="380" y="76" width="64" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="412" y="95">OL (NC)</text>
  <line class="dg-line" x1="444" y1="90" x2="492" y2="90"/>
  <circle class="dg-box-alarm" cx="520" cy="90" r="28"/>
  <text class="dg-text dg-mid" x="520" y="95">M</text>
  <line class="dg-line" x1="548" y1="90" x2="610" y2="90"/>
  <text class="dg-text-sm dg-mid" x="45" y="82">1</text>
  <text class="dg-text-sm dg-mid" x="137" y="82">2</text>
  <text class="dg-text-sm dg-mid" x="227" y="82">3</text>
  <text class="dg-text-sm dg-mid" x="365" y="82">4</text>
  <text class="dg-text-sm dg-mid" x="468" y="82">5</text>
  <text class="dg-text-sm" x="372" y="150">Seal-in: aux contact on M</text>
  <text class="dg-text-sm" x="372" y="200">PLC run request via relay CR101</text>
  <text class="dg-text-muted" x="30" y="262">E-stop, Stop and OL are in series with the coil. The PLC can only add a Start path.</text>
  <text class="dg-text-muted" x="30" y="280">Numbers 1 to 5 are wire numbers. Each appears at every point on that wire.</text>
</svg>`,
    output: `<svg viewBox="0 0 640 300" role="img" aria-label="A 24 VDC sourcing PLC output through a fuse to an interposing relay coil CR101, with a flyback diode across the coil and a 0 V return">
  <text class="dg-title" x="20" y="26">24 VDC sourcing output to interposing relay</text>
  <text class="dg-text-sm" x="30" y="60">+24 V</text>
  <line class="dg-line" x1="30" y1="70" x2="70" y2="70"/>
  <rect class="dg-box-warn" x="70" y="56" width="50" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="95" y="75">F1</text>
  <line class="dg-line" x1="120" y1="70" x2="200" y2="70"/>
  <rect class="dg-box-accent" x="200" y="50" width="140" height="90" rx="6"/>
  <text class="dg-text-sm dg-mid" x="270" y="76">PLC output module</text>
  <text class="dg-text-sm dg-mid" x="270" y="94">sourcing, point 3</text>
  <text class="dg-text-mono dg-mid" x="270" y="116">switches +24 V</text>
  <line class="dg-line" x1="340" y1="110" x2="400" y2="110"/>
  <rect class="dg-box" x="400" y="94" width="70" height="32" rx="4"/>
  <text class="dg-text-sm dg-mid" x="435" y="115">CR101</text>
  <line class="dg-line" x1="470" y1="110" x2="560" y2="110"/>
  <line class="dg-line" x1="380" y1="110" x2="380" y2="180"/>
  <line class="dg-line" x1="380" y1="180" x2="412" y2="180"/>
  <rect class="dg-box-ok" x="412" y="166" width="46" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="435" y="185">D1</text>
  <line class="dg-line" x1="458" y1="180" x2="490" y2="180"/>
  <line class="dg-line" x1="490" y1="110" x2="490" y2="180"/>
  <line class="dg-line" x1="560" y1="110" x2="560" y2="236"/>
  <line class="dg-line" x1="270" y1="140" x2="270" y2="236"/>
  <line class="dg-line" x1="30" y1="236" x2="560" y2="236"/>
  <text class="dg-text-sm" x="30" y="226">0 V</text>
  <text class="dg-text-muted" x="300" y="226">COM</text>
  <text class="dg-text-muted" x="500" y="160">diode across coil</text>
  <text class="dg-text-muted" x="30" y="262">Path when on: +24 V, fuse F1, output, coil, 0 V. D1 absorbs the turn-off spike.</text>
  <text class="dg-text-muted" x="30" y="282">A sinking output would instead switch the 0 V side and tie the coil to +24 V.</text>
</svg>`
  },

  pitfalls: [
    "Putting an overload or E-stop in PLC logic instead of the hardwired coil path.",
    "Deriving Running from the command bit, so a tripped overload still shows the motor running.",
    "Using a diode across an AC coil, which shorts it on half the cycle.",
    "Driving a contactor coil straight from an output without checking inrush and per-point limits.",
    "Wiring a stop device with a normally-open contact so a broken wire does not stop anything.",
    "Confusing stop categories 0, 1 and 2 with the ISO 13849-1 safety categories.",
    "Forgetting suppression, then chasing 'random' PLC faults that follow contactor drop-outs."
  ],

  keyTerms: ["motor-starter", "control-transformer", "aux-contact", "interposing-relay", "coil-suppression", "stop-categories", "wire-number", "output-fusing", "sinking-sourcing", "three-wire-control"],

  quiz: [
    {
      q: "Where does the motor overload contact belong in a starter circuit?",
      options: ["In PLC logic, as an interlock bit", "In parallel with the Start button", "On the PLC input only", "In series with the contactor coil, in hardware"],
      answer: 3,
      explain: [
        "Protection that depends on a program fails when the program or controller does.",
        "Parallel with Start would let a trip help the motor start.",
        "The PLC should monitor the overload, but monitoring alone does not stop the motor.",
        "Correct. An NC overload contact in the coil path opens whatever the PLC is doing."
      ]
    },
    {
      q: "The PLC output for M101 turns on and the operator hears nothing. M101_AuxIn stays off and M101_OLOK is off. What is most likely?",
      options: ["The overload is tripped, which opened the coil path", "The PLC output module failed", "The seal-in is wired to the wrong side", "The motor is overheating but still running"],
      answer: 0,
      explain: [
        "Correct. OLOK off means the NC OL status is open, and the coil path is open with it.",
        "A failed output would not explain an OL status input that is off.",
        "A seal-in problem would not turn off the OL status.",
        "If it were running, the aux input would be on."
      ]
    },
    {
      q: "You are driving a 120 VAC contactor coil with a 24 VDC sourcing output. What is the best design?",
      options: ["Wire the coil to the output with a diode across it", "Use an interposing relay with a 24 VDC coil (and diode) whose contact switches the 120 VAC coil circuit", "Put the coil in series with the output and ground", "Use a sinking output so the voltage matches"],
      answer: 1,
      explain: [
        "A DC output cannot switch an AC coil, and a diode does not work on AC.",
        "Correct. The relay isolates voltage levels and takes the inrush.",
        "That does not apply the correct voltage.",
        "Sinking or sourcing does not convert DC to 120 VAC."
      ]
    },
    {
      q: "Why put a diode across a 24 VDC relay coil?",
      options: ["To raise the pull-in voltage", "To make the relay slower to pull in", "To absorb the inductive voltage spike when the coil is switched off", "To allow AC operation"],
      answer: 2,
      explain: [
        "The diode does not affect the pull-in voltage.",
        "It affects drop-out, not pull-in.",
        "Correct. Current circulates through the diode as the field collapses, protecting the output and reducing noise.",
        "A diode makes sense only on DC coils."
      ]
    },
    {
      q: "Which statement about stop categories is correct?",
      options: ["Category 0 brakes under power and then removes power", "Category 1 removes power immediately", "Category 2 leaves power on the actuators after a controlled stop", "An E-stop must be category 2"],
      answer: 2,
      explain: [
        "That describes category 1.",
        "Category 1 is a controlled stop that removes power once at rest. Category 0 removes power immediately.",
        "Correct. A normal production stop is typically category 2.",
        "E-stops must be category 0 or 1, per risk assessment."
      ]
    },
    {
      q: "On the schematic, wire number 4 reads 120 V to X2, but wire 5 reads 0 V. Which device is between them?",
      options: ["The E-stop", "The overload (NC) contact", "The PLC interposing relay coil", "The Stop button"],
      answer: 1,
      explain: [
        "The E-stop sits between wires 1 and 2.",
        "Correct. Wire 4 enters the OL contact and wire 5 leaves it toward the coil, so an open OL explains voltage in and none out.",
        "The relay coil is on the PLC side and is not in this path.",
        "The Stop button sits between wires 2 and 3."
      ]
    }
  ],

  resources: [
    { title: "Safety related control systems for machinery", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/safebk-rm002_-en-p.pdf", type: "book", source: "Rockwell Automation" },
    { title: "Emergency Stop Push Buttons White Paper", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/wp/800-wp008_-en-p.pdf", type: "article", source: "Rockwell Automation" },
    { title: "Significant changes to NFPA 79 2015 Electrical Standard for Industrial Machinery", url: "https://app-community.nfpa.org/docs/DOC-1090", type: "article", source: "NFPA" },
    { title: "Safety Function: Actuator Subsystems", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/at/safety-at151_-en-p.pdf", type: "article", source: "Rockwell Automation" },
    { title: "700-2.14: Safety Relays", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/700-td556_-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
