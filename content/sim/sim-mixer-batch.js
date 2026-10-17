LC.sim({
  id: "sim-mixer-batch", title: "Mixer batch sequence", level: 4, lesson: "plc-isa88-packml",
  brief: `A small mixing tank makes one batch at a time. The tank has an \`InletValve\`, a \`Mixer\` motor with a guarded lid, and a \`DrainValve\`. The level is live: the inlet adds about **10%/s**, the drain removes about **10%/s**.

Build the batch as a state machine on a DINT, \`Step\`:

| Step | Name | Outputs | Moves on when |
|---|---|---|---|
| 0 | Idle | none | \`Start\` pressed **and the lid is closed** |
| 10 | Charge | \`InletValve\` | \`Level >= 60\` (fault after **12 s**) |
| 20 | Mix | \`Mixer\` | 8 s elapsed (fault if the lid opens) |
| 30 | Discharge | \`DrainValve\` | \`Level <= 2\`, back to Idle |
| 900 | Fault | \`Fault\` lamp, all else off | \`Reset\` pressed |

**Interlocks:**

- The mixer may only turn when \`LidClosed\` is on. Opening the lid during Mix goes to Fault.
- \`Stop\` (normally closed, e-stop style) sends any step except Idle to Fault.
- Start is ignored with the lid open.

Use **Inlet blocked** to cut the supply and test the charge timeout.

\`\`\`ladder
EQU(Step,10)OTE(InletValve);
EQU(Step,20)XIC(LidClosed)OTE(Mixer);
\`\`\``,
  tags: {
    Start: "BOOL", Stop: { type: "BOOL", desc: "NC stop: 1 at rest" }, Reset: "BOOL",
    LidClosed: { type: "BOOL", desc: "Lid limit switch: 1 when closed" }, InletBlocked: { type: "BOOL", desc: "Field simulation: supply blocked" },
    Step: { type: "DINT", desc: "0 Idle, 10 Charge, 20 Mix, 30 Discharge, 900 Fault" },
    Level: { type: "REAL", desc: "Tank level, percent" },
    ChargeTmr: { type: "TIMER", desc: "Charge timeout" }, MixTmr: { type: "TIMER", desc: "Mix time" },
    InletValve: "BOOL", Mixer: "BOOL", DrainValve: "BOOL", Fault: "BOOL"
  },
  io: [
    { tag: "Start", widget: "pb", label: "Start batch" },
    { tag: "Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "Reset", widget: "pb", label: "Fault reset" },
    { tag: "LidClosed", widget: "sensor", label: "Lid", init: true, states: ["Open", "Closed"] },
    { tag: "InletBlocked", widget: "toggle", label: "Inlet blocked", states: ["Clear", "Blocked"] },
    { tag: "Level", widget: "bar", label: "Level", min: 0, max: 100, hi: 60, lo: 2, unit: "%" },
    { tag: "Step", widget: "value", label: "Step" },
    { tag: "InletValve", widget: "lamp", label: "Inlet valve", color: "ok" },
    { tag: "Mixer", widget: "motor", label: "Mixer" },
    { tag: "DrainValve", widget: "lamp", label: "Drain valve", color: "warn" },
    { tag: "Fault", widget: "lamp", label: "Fault", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "EQU", "NEQ", "GEQ", "LEQ", "MOV", "BRANCH"],
  requires: ["EQU", "TON", "MOV"],
  process: {
    init: function (tags) { tags.Level = 0; },
    step: function (tags, dt) {
      var lv = Number(tags.Level) || 0;
      if (tags.InletValve && !tags.InletBlocked) lv += 10 * dt / 1000;
      if (tags.DrainValve) lv -= 10 * dt / 1000;
      tags.Level = Math.max(0, Math.min(100, lv));
    }
  },
  starter: "EQU(Step,0)XIC(Start)MOV(10,Step);\nEQU(Step,10)OTE(InletValve);\nEQU(Step,10)GEQ(Level,60)MOV(20,Step);\nEQU(Step,20)OTE(Mixer);",
  tests: [
    { name: "Idle: everything off", steps: [{ wait: 2000 }, { expect: { Step: 0, InletValve: false, Mixer: false, DrainValve: false, Fault: false } }] },
    { name: "Start with the lid open is refused", steps: [{ set: { LidClosed: false } }, { press: { tag: "Start", ms: 200 } }, { wait: 1000 }, { expect: { Step: 0, InletValve: false } }] },
    { name: "A full batch runs charge, mix, discharge in order", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 3000 }, { expect: { Step: 10, InletValve: true, Mixer: false, DrainValve: false } }, { wait: 4000 }, { expect: { Step: 20, InletValve: false, Mixer: true, DrainValve: false, Level: ">= 60" } }, { wait: 8000 }, { expect: { Step: 30, InletValve: false, Mixer: false, DrainValve: true } }, { wait: 8000 }, { expect: { Step: 0, DrainValve: false, Mixer: false, InletValve: false, Level: "<= 2" } }] },
    { name: "Opening the lid during Mix stops the mixer and faults", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 8000 }, { expect: { Mixer: true } }, { set: { LidClosed: false } }, { wait: 200 }, { expect: { Mixer: false, Step: 900, Fault: true, InletValve: false, DrainValve: false } }] },
    { name: "A blocked inlet times out of Charge into Fault", steps: [{ set: { InletBlocked: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 11000 }, { expect: { Step: 10, Fault: false } }, { wait: 2000 }, { expect: { Step: 900, Fault: true, InletValve: false } }] },
    { name: "Stop aborts to Fault, and Reset returns to Idle", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 2000 }, { press: { tag: "Stop", ms: 200 } }, { wait: 300 }, { expect: { Step: 900, InletValve: false, Fault: true } }, { press: { tag: "Reset", ms: 200 } }, { wait: 300 }, { expect: { Step: 0, Fault: false } }] }
  ],
  hints: [
    "Same recipe as the fill sequence: outputs from \`EQU(Step,n)\`, a TON for the charge timeout and one for the mix, transitions at the bottom. The mixer rung also needs the lid contact in series.",
    "Start needs two conditions: \`EQU(Step,0)XIC(Start)XIC(LidClosed)MOV(10,Step)\`. Fault entries: \`EQU(Step,10)XIC(ChargeTmr.DN)MOV(900,Step)\`, \`EQU(Step,20)XIO(LidClosed)MOV(900,Step)\`, and \`NEQ(Step,0)XIO(Stop)MOV(900,Step)\` as the very last rung.",
    "\`EQU(Step,10)OTE(InletValve);\` \`EQU(Step,20)XIC(LidClosed)OTE(Mixer);\` \`EQU(Step,30)OTE(DrainValve);\` \`EQU(Step,900)OTE(Fault);\` \`EQU(Step,10)TON(ChargeTmr,12000,0);\` \`EQU(Step,20)TON(MixTmr,8000,0);\` then \`EQU(Step,0)XIC(Start)XIC(LidClosed)MOV(10,Step);\` \`EQU(Step,10)GEQ(Level,60)MOV(20,Step);\` \`EQU(Step,10)XIC(ChargeTmr.DN)MOV(900,Step);\` \`EQU(Step,20)XIC(MixTmr.DN)MOV(30,Step);\` \`EQU(Step,20)XIO(LidClosed)MOV(900,Step);\` \`EQU(Step,30)LEQ(Level,2)MOV(0,Step);\` \`EQU(Step,900)XIC(Reset)MOV(0,Step);\` \`NEQ(Step,0)XIO(Stop)MOV(900,Step);\`"
  ],
  solution: "EQU(Step,10)OTE(InletValve);\nEQU(Step,20)XIC(LidClosed)OTE(Mixer);\nEQU(Step,30)OTE(DrainValve);\nEQU(Step,900)OTE(Fault);\nEQU(Step,10)TON(ChargeTmr,12000,0);\nEQU(Step,20)TON(MixTmr,8000,0);\nEQU(Step,0)XIC(Start)XIC(LidClosed)MOV(10,Step);\nEQU(Step,10)GEQ(Level,60)MOV(20,Step);\nEQU(Step,10)XIC(ChargeTmr.DN)MOV(900,Step);\nEQU(Step,20)XIC(MixTmr.DN)MOV(30,Step);\nEQU(Step,20)XIO(LidClosed)MOV(900,Step);\nEQU(Step,30)LEQ(Level,2)MOV(0,Step);\nEQU(Step,900)XIC(Reset)MOV(0,Step);\nNEQ(Step,0)XIO(Stop)MOV(900,Step);",
  explain: `This is a miniature **batch**: a fixed recipe of phases (charge, mix, discharge) run in order, each with an entry action, an exit condition and a way to fail. ISA-88 calls those phases, and PackML adds named states such as Execute, Held and Aborted. The skeleton is exactly the \`Step\` DINT you used for the traffic light and the tank.

What makes it a real machine is the **interlocks**:

- **Permissives to start.** Start does nothing with the lid open: the lid is part of the transition into Charge.
- **Continuous interlocks.** The mixer output carries \`XIC(LidClosed)\` in its own rung, so even a bad write to \`Step\` cannot turn a blade while the lid is up. The transition to Fault then makes the stop visible and stops the batch.
- **Timeouts.** Charge cannot wait forever: a blocked inlet is caught at 12 s and the valves close. The Mix step has no level condition, so its timer is the exit, not a watchdog.
- **Abort.** The Stop rung is last, so it overrides any transition written above it in that scan, and it only applies away from Idle.

The valve rung and the lid contact would be hardwired to a safety relay in a real mixer. A lid that exposes moving blades is a **safety function** and is never left to a PLC bit alone. The sequence logic here handles the process side: what to do next, and what to say when something stops it.`,
  tips: [
    "Record why you faulted. Store a FaultCode and FaultStep before MOV(900, Step) so the HMI can say 'Lid opened during Mix'.",
    "Fault returns to Idle through Reset only. If a fault could clear itself, an operator would never learn that a lid switch is flickering.",
    "A guard on a mixer is a safety device. Use a safety-rated lid switch and safety relay, and treat the PLC lid input as status, not protection."
  ]
});
