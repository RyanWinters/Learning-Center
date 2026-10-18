LC.sim({
  id: "sim-step-fault", title: "Sequence with step timeout and fault state", level: 3, lesson: "plc-state-machines",
  brief: `A small process tank runs one cycle: **fill**, **heat**, **drain**. A sequence that waits forever for a condition is a bug waiting for a bad sensor, so every step gets a **timeout** that sends the machine to a **Fault** step and records **why**.

Build it on a DINT, \`Step\`:

| Step | Name | Output | Moves on when | Times out after |
|---|---|---|---|---|
| 0 | Idle | none | \`Start\` pressed | |
| 10 | Fill | \`FillValve\` | \`Level >= 80\` | 12 s (code 1) |
| 20 | Heat | \`Heater\` | \`Temp >= 60\` | 12 s (code 2) |
| 30 | Drain | \`DrainValve\` | \`Level <= 5\`, back to Idle | 12 s (code 3) |
| 900 | Fault | \`FaultLamp\` | \`Reset\` pressed, back to Idle | |

Use one timer per step: \`FillTmr\`, \`HeatTmr\`, \`DrainTmr\`. When a timer finishes while its step is still active, write the **reason code** into \`FaultCode\` and move to step 900. Pressing \`Reset\` returns to Idle and clears \`FaultCode\`. Start must do nothing while the machine is faulted.

Use the three field-fault switches (**Inlet blocked**, **Heater failed**, **Drain blocked**) to test each timeout.

\`\`\`ladder
EQU(Step,10)TON(FillTmr,12000,0);
EQU(Step,10)XIC(FillTmr.DN)MOV(1,FaultCode)MOV(900,Step);
\`\`\``,
  tags: {
    Start: "BOOL", Reset: "BOOL",
    InletBlocked: { type: "BOOL", desc: "Field simulation: fill supply blocked" },
    HeaterFailed: { type: "BOOL", desc: "Field simulation: heater does not heat" },
    DrainBlocked: { type: "BOOL", desc: "Field simulation: drain blocked" },
    Step: { type: "DINT", desc: "0 Idle, 10 Fill, 20 Heat, 30 Drain, 900 Fault" },
    FaultCode: { type: "DINT", desc: "Why the sequence faulted: 1 fill, 2 heat, 3 drain timeout" },
    Level: { type: "REAL", desc: "Tank level, percent" }, Temp: { type: "REAL", desc: "Tank temperature, degrees C" },
    FillTmr: "TIMER", HeatTmr: "TIMER", DrainTmr: "TIMER",
    FillValve: "BOOL", Heater: "BOOL", DrainValve: "BOOL", FaultLamp: "BOOL"
  },
  io: [
    { tag: "Start", widget: "pb", label: "Start cycle" },
    { tag: "Reset", widget: "pb", label: "Fault reset" },
    { tag: "InletBlocked", widget: "toggle", label: "Inlet blocked", states: ["Clear", "Blocked"] },
    { tag: "HeaterFailed", widget: "toggle", label: "Heater failed", states: ["OK", "Failed"] },
    { tag: "DrainBlocked", widget: "toggle", label: "Drain blocked", states: ["Clear", "Blocked"] },
    { tag: "Level", widget: "bar", label: "Level", min: 0, max: 100, hi: 80, lo: 5, unit: "%" },
    { tag: "Temp", widget: "value", label: "Temperature", unit: "C", dec: 0 },
    { tag: "Step", widget: "value", label: "Step" },
    { tag: "FaultCode", widget: "value", label: "Fault code" },
    { tag: "FillValve", widget: "lamp", label: "Fill valve", color: "ok" },
    { tag: "Heater", widget: "lamp", label: "Heater", color: "warn" },
    { tag: "DrainValve", widget: "lamp", label: "Drain valve", color: "ok" },
    { tag: "FaultLamp", widget: "lamp", label: "Fault", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "EQU", "GEQ", "LEQ", "MOV", "CLR", "BRANCH"],
  requires: ["EQU", "TON", "MOV"],
  process: {
    init: function (tags) { tags.Level = 0; tags.Temp = 20; },
    step: function (tags, dt) {
      var lv = Number(tags.Level) || 0, tp = Number(tags.Temp) || 20, s = dt / 1000;
      if (tags.FillValve && !tags.InletBlocked) lv += 10 * s;
      if (tags.DrainValve && !tags.DrainBlocked) lv -= 10 * s;
      if (tags.Heater && !tags.HeaterFailed) tp += 5 * s; else tp -= 2 * s;
      tags.Level = Math.max(0, Math.min(100, lv));
      tags.Temp = Math.max(20, Math.min(100, tp));
    }
  },
  starter: "EQU(Step,0)XIC(Start)MOV(10,Step);\nEQU(Step,10)OTE(FillValve);\nEQU(Step,20)OTE(Heater);\nEQU(Step,30)OTE(DrainValve);\nEQU(Step,10)GEQ(Level,80)MOV(20,Step);\nEQU(Step,20)GEQ(Temp,60)MOV(30,Step);\nEQU(Step,30)LEQ(Level,5)MOV(0,Step);",
  tests: [
    { name: "Idle: everything off and no fault code", steps: [{ wait: 2000 }, { expect: { Step: 0, FillValve: false, Heater: false, DrainValve: false, FaultLamp: false, FaultCode: 0 } }] },
    { name: "A healthy cycle runs fill, heat, drain, then returns to Idle", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 3000 }, { expect: { Step: 10, FillValve: true, Heater: false, DrainValve: false } }, { wait: 6000 }, { expect: { Step: 20, FillValve: false, Heater: true, DrainValve: false } }, { wait: 8000 }, { expect: { Step: 30, Heater: false, DrainValve: true } }, { wait: 9000 }, { expect: { Step: 0, DrainValve: false, FaultLamp: false, FaultCode: 0, Level: "<= 5" } }] },
    { name: "A blocked inlet times out of Fill after 12 s with code 1", steps: [{ set: { InletBlocked: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 11000 }, { expect: { Step: 10, FaultLamp: false } }, { wait: 2000 }, { expect: { Step: 900, FaultCode: 1, FaultLamp: true, FillValve: false } }] },
    { name: "A failed heater times out of Heat after 12 s with code 2", steps: [{ set: { HeaterFailed: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 8500 }, { expect: { Step: 20, Heater: true } }, { wait: 11000 }, { expect: { Step: 20, FaultLamp: false } }, { wait: 1500 }, { expect: { Step: 900, FaultCode: 2, FaultLamp: true, Heater: false } }] },
    { name: "A blocked drain times out of Drain after 12 s with code 3", steps: [{ set: { DrainBlocked: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 17000 }, { expect: { Step: 30, DrainValve: true } }, { wait: 10000 }, { expect: { Step: 30, FaultLamp: false } }, { wait: 3000 }, { expect: { Step: 900, FaultCode: 3, FaultLamp: true, DrainValve: false } }] },
    { name: "The fault holds until Reset, and Start is ignored while faulted", steps: [{ set: { InletBlocked: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 13000 }, { expect: { Step: 900 } }, { set: { InletBlocked: false } }, { wait: 3000 }, { expect: { Step: 900, FaultCode: 1, FaultLamp: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 500 }, { expect: { Step: 900, FillValve: false } }] },
    { name: "Reset returns to Idle, clears the code, and the cycle can restart", steps: [{ set: { InletBlocked: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 13000 }, { expect: { Step: 900, FaultCode: 1 } }, { set: { InletBlocked: false } }, { press: { tag: "Reset", ms: 200 } }, { wait: 300 }, { expect: { Step: 0, FaultCode: 0, FaultLamp: false } }, { press: { tag: "Start", ms: 200 } }, { wait: 2000 }, { expect: { Step: 10, FillValve: true } }] }
  ],
  hints: [
    "Start from the pattern in the traffic light: outputs from \`EQU(Step,n)\`, one TON per timed step, transitions at the bottom. The new part is a second exit from each step: the timer finishing before the normal condition.",
    "For each step add a rung such as \`EQU(Step,10)XIC(FillTmr.DN)MOV(1,FaultCode)MOV(900,Step)\`. A MOV passes power on, so one rung can write the reason and then the new step (reason first, because the second MOV changes Step). Step 900 needs its own output and a Reset rung that clears \`FaultCode\` too.",
    "\`EQU(Step,10)OTE(FillValve);\` \`EQU(Step,20)OTE(Heater);\` \`EQU(Step,30)OTE(DrainValve);\` \`EQU(Step,900)OTE(FaultLamp);\` the three \`EQU(Step,n)TON(...,12000,0);\` timers; then \`EQU(Step,0)XIC(Start)MOV(10,Step);\` \`EQU(Step,10)GEQ(Level,80)MOV(20,Step);\` \`EQU(Step,10)XIC(FillTmr.DN)MOV(1,FaultCode)MOV(900,Step);\` and the same for Heat (\`GEQ(Temp,60)\`, code 2) and Drain (\`LEQ(Level,5)\` back to 0, code 3), ending with \`EQU(Step,900)XIC(Reset)CLR(FaultCode)MOV(0,Step);\`"
  ],
  solution: "EQU(Step,10)OTE(FillValve);\nEQU(Step,20)OTE(Heater);\nEQU(Step,30)OTE(DrainValve);\nEQU(Step,900)OTE(FaultLamp);\nEQU(Step,10)TON(FillTmr,12000,0);\nEQU(Step,20)TON(HeatTmr,12000,0);\nEQU(Step,30)TON(DrainTmr,12000,0);\nEQU(Step,0)XIC(Start)MOV(10,Step);\nEQU(Step,10)GEQ(Level,80)MOV(20,Step);\nEQU(Step,10)XIC(FillTmr.DN)MOV(1,FaultCode)MOV(900,Step);\nEQU(Step,20)GEQ(Temp,60)MOV(30,Step);\nEQU(Step,20)XIC(HeatTmr.DN)MOV(2,FaultCode)MOV(900,Step);\nEQU(Step,30)LEQ(Level,5)MOV(0,Step);\nEQU(Step,30)XIC(DrainTmr.DN)MOV(3,FaultCode)MOV(900,Step);\nEQU(Step,900)XIC(Reset)CLR(FaultCode)MOV(0,Step);",
  explain: `A sequence is only as trustworthy as its worst wait. If the fill valve sticks, a machine without a timeout sits in step 10 forever and the operator sees a tank that is "filling". A **step timeout** turns that silent hang into a visible, named fault.

How the pieces fit:

- **One timer per step**, gated by \`EQU(Step,n)\`. When the step changes, the old timer's rung goes false and it clears by itself, and the next step's timer starts from zero. That is also why the chain of transitions does not run away inside one scan: the new step's timer has not had time to finish.
- **Two exits per step.** The normal exit (the level or temperature is reached) and the timeout exit (the timer's DN). Whichever rung is first to change \`Step\` wins, because the other rung's \`EQU\` is false afterwards.
- **A reason code.** The first MOV writes \`FaultCode\` while \`Step\` still holds the failing step's rung true, and the second MOV moves to 900. After the fault the step number alone no longer tells you where it failed, so the code carries that. An HMI can show "Heat timeout".
- **A deliberate reset.** Step 900 only leaves through \`Reset\`. If a fault cleared itself, a flickering sensor would go unnoticed. The Reset rung also clears the code so the next fault is not confused with an old one.
- **Safe outputs by construction.** Every output rung is gated by its \`EQU\`, so in step 900 the valves and heater all drop with no extra logic.

Timeouts should come from measured fill, heat and drain times plus margin, not guesses. In a real plant the timeout values would be configuration tags so they can be tuned without a program change. In Studio 5000 the TON Preset field takes a constant, so copy the tag in each scan with \`MOV(Fill_Timeout,FillTmr.PRE)\`. This simulator also accepts a tag directly in the Preset field as a shortcut.`,
  tips: [
    "Pick each timeout from the real step time plus a margin (here 8 s of work, 12 s timeout). Too tight and normal variation faults the machine, too loose and a stuck valve overflows the tank before you notice.",
    "Record why you faulted in a reason code (and the step it happened in) before you leave the failing step. A bare \"Fault\" lamp sends a technician searching.",
    "A process timeout is not a safety function. An over-temperature or overfill that can hurt people needs its own hardwired or safety-rated protection, independent of this sequence."
  ]
});
