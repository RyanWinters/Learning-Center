LC.sim({
  id: "sim-tank-fill", title: "Fill/drain sequence", level: 4, lesson: "plc-state-machines",
  brief: `A batch tank is filled, held for a soak period, then drained. The level transmitter is live: with \`FillValve\` open the level rises about **10% per second**, with \`DrainValve\` open it falls about **5% per second**.

Build the sequence as a state machine on one DINT, \`Step\`:

| Step | Name | Does | Moves on when |
|---|---|---|---|
| 0 | Idle | all valves closed | \`Start\` pressed |
| 10 | Fill | open \`FillValve\` | \`Level >= 90\` (or fault after **15 s**) |
| 20 | Hold | all closed | 5 s elapsed |
| 30 | Drain | open \`DrainValve\` | \`Level <= 5\`, back to Idle |
| 900 | Fault | all closed, \`Fault\` lamp | \`Reset\` pressed, back to Idle |

The 15 s fill timeout is the important part. Flip **Supply valve closed upstream** to cut off the water: the level never rises, and without a timeout the sequence would sit in Fill forever. The \`Stop\` button (normally closed) aborts any step back to Idle with valves closed.

Remember: outputs are driven by \`EQU(Step,n)\`, and all transitions go at the **bottom**.

\`\`\`ladder
EQU(Step,10)OTE(FillValve);
EQU(Step,10)TON(FillTmr,15000,0);
\`\`\``,
  tags: {
    Start: "BOOL", Stop: { type: "BOOL", desc: "NC stop: 1 at rest" }, Reset: "BOOL",
    Step: { type: "DINT", desc: "0 Idle, 10 Fill, 20 Hold, 30 Drain, 900 Fault" },
    Level: { type: "REAL", desc: "Tank level, percent" },
    NoSupply: { type: "BOOL", desc: "Field simulation: upstream supply closed" },
    FillTmr: { type: "TIMER", desc: "Fill timeout" }, HoldTmr: { type: "TIMER", desc: "Soak time" },
    FillValve: "BOOL", DrainValve: "BOOL", Fault: "BOOL"
  },
  io: [
    { tag: "Start", widget: "pb", label: "Start" },
    { tag: "Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "Reset", widget: "pb", label: "Fault reset" },
    { tag: "NoSupply", widget: "toggle", label: "Supply valve closed upstream", states: ["Open", "Closed"] },
    { tag: "Level", widget: "bar", label: "Tank level", min: 0, max: 100, hi: 90, lo: 5, unit: "%" },
    { tag: "Step", widget: "value", label: "Step" },
    { tag: "FillValve", widget: "lamp", label: "Fill valve open", color: "ok" },
    { tag: "DrainValve", widget: "lamp", label: "Drain valve open", color: "warn" },
    { tag: "Fault", widget: "lamp", label: "Fault", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "EQU", "GEQ", "LEQ", "MOV", "BRANCH"],
  requires: ["EQU", "TON", "MOV"],
  process: {
    init: function (tags) { tags.Level = 0; },
    step: function (tags, dt) {
      var lv = Number(tags.Level) || 0;
      if (tags.FillValve && !tags.NoSupply) lv += 10 * dt / 1000;
      if (tags.DrainValve) lv -= 5 * dt / 1000;
      tags.Level = Math.max(0, Math.min(100, lv));
    }
  },
  starter: "EQU(Step,0)XIC(Start)MOV(10,Step);\nEQU(Step,10)OTE(FillValve);\nEQU(Step,10)GEQ(Level,90)MOV(20,Step);",
  tests: [
    { name: "Idle: valves closed and nothing moves", steps: [{ wait: 3000 }, { expect: { Step: 0, FillValve: false, DrainValve: false, Fault: false, Level: 0 } }] },
    { name: "Start opens only the fill valve and the level rises", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 3000 }, { expect: { Step: 10, FillValve: true, DrainValve: false, Level: "> 20" } }] },
    { name: "At 90% the fill closes and the tank holds without overflowing", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 11000 }, { expect: { Step: 20, FillValve: false, DrainValve: false, Level: ">= 90" } }, { wait: 1500 }, { expect: { Step: 20, Level: "<= 92" } }] },
    { name: "After the 5 s hold it drains, then returns to Idle", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 16500 }, { expect: { Step: 30, DrainValve: true, FillValve: false } }, { wait: 20000 }, { expect: { Step: 0, DrainValve: false, FillValve: false, Level: "<= 5" } }] },
    { name: "With no supply the fill times out into Fault with valves closed", steps: [{ set: { NoSupply: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 14000 }, { expect: { Step: 10, Fault: false } }, { wait: 2500 }, { expect: { Step: 900, Fault: true, FillValve: false, DrainValve: false } }] },
    { name: "Fault holds until Reset; Stop aborts to Idle", steps: [{ set: { NoSupply: true } }, { press: { tag: "Start", ms: 200 } }, { wait: 17000 }, { press: { tag: "Start", ms: 200 } }, { wait: 500 }, { expect: { Step: 900 } }, { set: { NoSupply: false } }, { press: { tag: "Reset", ms: 200 } }, { wait: 200 }, { expect: { Step: 0, Fault: false } }, { press: { tag: "Start", ms: 200 } }, { wait: 2000 }, { expect: { FillValve: true } }, { press: { tag: "Stop", ms: 200 } }, { wait: 200 }, { expect: { Step: 0, FillValve: false } }] }
  ],
  hints: [
    "Draw the table as rungs: one OTE per valve and lamp gated by \`EQU(Step,n)\`, a TON for the fill timeout and one for the hold, then transitions that MOV the next step number.",
    "Fill has two exits: \`EQU(Step,10)GEQ(Level,90)MOV(20,Step)\` and \`EQU(Step,10)XIC(FillTmr.DN)MOV(900,Step)\`. Hold exits on \`HoldTmr.DN\`, Drain on \`LEQ(Level,5)\`, Fault on Reset. A final \`XIO(Stop)MOV(0,Step)\` handles the abort.",
    "\`EQU(Step,10)OTE(FillValve);\` \`EQU(Step,30)OTE(DrainValve);\` \`EQU(Step,900)OTE(Fault);\` \`EQU(Step,10)TON(FillTmr,15000,0);\` \`EQU(Step,20)TON(HoldTmr,5000,0);\` then \`EQU(Step,0)XIC(Start)MOV(10,Step);\` \`EQU(Step,10)GEQ(Level,90)MOV(20,Step);\` \`EQU(Step,10)XIC(FillTmr.DN)MOV(900,Step);\` \`EQU(Step,20)XIC(HoldTmr.DN)MOV(30,Step);\` \`EQU(Step,30)LEQ(Level,5)MOV(0,Step);\` \`EQU(Step,900)XIC(Reset)MOV(0,Step);\` \`XIO(Stop)MOV(0,Step);\`"
  ],
  solution: "EQU(Step,10)OTE(FillValve);\nEQU(Step,30)OTE(DrainValve);\nEQU(Step,900)OTE(Fault);\nEQU(Step,10)TON(FillTmr,15000,0);\nEQU(Step,20)TON(HoldTmr,5000,0);\nEQU(Step,0)XIC(Start)MOV(10,Step);\nEQU(Step,10)GEQ(Level,90)MOV(20,Step);\nEQU(Step,10)XIC(FillTmr.DN)MOV(900,Step);\nEQU(Step,20)XIC(HoldTmr.DN)MOV(30,Step);\nEQU(Step,30)LEQ(Level,5)MOV(0,Step);\nEQU(Step,900)XIC(Reset)MOV(0,Step);\nXIO(Stop)MOV(0,Step);",
  explain: `Every output is a function of the **current step only**: \`FillValve\` is just \`EQU(Step,10)\`. When the step changes, the valve closes by itself, because OTE writes false when its rung goes false. Compare that with a latch-based version, where a forgotten unlatch leaves the fill valve open into an overflowing tank.

The process model closes the loop. The level rises *because* your logic opened the valve, and your logic reads that level to decide when to move on. Each step that **waits on the real world** (here, Fill waiting for the level) needs a timeout, because devices fail quietly: a closed manual valve, a tripped supply pump, a dead transmitter. The \`FillTmr\` turns a silent stall into a named state, Step 900, that the HMI can display and a technician can act on. Note that Fault leaves **all valves closed**, and a reset returns to Idle, not to the step that failed.

Two more habits from the lesson: all transitions are at the bottom of the program so only one fires per scan, and the abort (\`XIO(Stop)MOV(0,Step)\`) is last so it wins over any other transition in the same scan.

In a Logix project the state would be a member of a sequence UDT (\`Fill.Seq.Step\`) with \`FaultStep\` and \`FaultCode\` recorded on the way into Fault. The level hard limit (90%) should also have an independent high-high level switch wired to the fill valve, because a software timeout is not a safety function.`,
  tips: [
    "Set the timeout from the real fill rate with margin: here 90% takes 9 s, so 15 s catches a failure without false trips.",
    "A 'Drain' timeout is just as important in a real plant (a plugged outlet makes the level stop falling). Add one when you reuse this pattern.",
    "Hold the fault code and the failed step in tags before you change Step to 900, so the HMI can say 'Fault in Fill' instead of just 'Fault'."
  ]
});
