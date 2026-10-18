LC.sim({
  id: "sim-traffic", title: "Traffic light state machine", level: 4, lesson: "plc-state-machines",
  brief: `A one-way temporary traffic signal at a work zone cycles **Red, Green, Amber** while the \`Enable\` switch is on. When it is off, the signal rests on **Red** (the safe state).

Build it as a **state machine** with one DINT, \`Step\`. Only one step is active at a time, so only one lamp can ever be lit.

| Step | Name | Lamp | Moves on when |
|---|---|---|---|
| 0 | Idle | Red | \`Enable\` is on |
| 10 | Red | Red | 4 s elapsed |
| 20 | Green | Green | 5 s elapsed |
| 30 | Amber | Amber | 2 s elapsed |

Step 30 goes back to 10. If \`Enable\` goes off at any time, return to step 0.

Rules from the lesson: outputs come **only** from \`EQU(Step,n)\`, one timer per step, and all the \`MOV\`s that change \`Step\` sit at the **bottom** of the program.

\`\`\`ladder
EQU(Step,10)TON(RedTmr,4000,0);
EQU(Step,10)XIC(RedTmr.DN)MOV(20,Step);
\`\`\``,
  tags: {
    Enable: "BOOL", Step: { type: "DINT", desc: "State: 0 Idle, 10 Red, 20 Green, 30 Amber" },
    RedTmr: "TIMER", GrnTmr: "TIMER", AmbTmr: "TIMER", Red: "BOOL", Green: "BOOL", Amber: "BOOL"
  },
  io: [
    { tag: "Enable", widget: "toggle", label: "Signal enable" },
    { tag: "Red", widget: "lamp", label: "Red", color: "alarm" },
    { tag: "Amber", widget: "lamp", label: "Amber", color: "warn" },
    { tag: "Green", widget: "lamp", label: "Green", color: "ok" },
    { tag: "Step", widget: "value", label: "Step" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "EQU", "MOV", "BRANCH"],
  requires: ["EQU", "TON", "MOV"],
  starter: "EQU(Step,0)XIC(Enable)MOV(10,Step);\n[EQU(Step,0),EQU(Step,10)]OTE(Red);",
  tests: [
    { name: "Disabled, the signal rests on Red only", steps: [{ wait: 3000 }, { expect: { Step: 0, Red: true, Green: false, Amber: false } }] },
    { name: "Enabling starts the Red step", steps: [{ set: { Enable: true } }, { wait: 2000 }, { expect: { Step: 10, Red: true, Green: false, Amber: false } }] },
    { name: "Red lasts 4 s, then Green for 5 s", steps: [{ set: { Enable: true } }, { wait: 3500 }, { expect: { Step: 10 } }, { wait: 1000 }, { expect: { Step: 20, Red: false, Green: true, Amber: false } }, { wait: 4000 }, { expect: { Step: 20, Green: true } }] },
    { name: "Green is followed by Amber, then Red again", steps: [{ set: { Enable: true } }, { wait: 9500 }, { expect: { Step: 30, Red: false, Green: false, Amber: true } }, { wait: 2000 }, { expect: { Step: 10, Red: true, Green: false, Amber: false } }] },
    { name: "The cycle repeats", steps: [{ set: { Enable: true } }, { wait: 16000 }, { expect: { Step: 20, Green: true, Red: false, Amber: false } }] },
    { name: "Disabling mid-Green drops back to Red at once", steps: [{ set: { Enable: true } }, { wait: 6000 }, { expect: { Green: true } }, { set: { Enable: false } }, { wait: 200 }, { expect: { Step: 0, Red: true, Green: false, Amber: false } }] }
  ],
  hints: [
    "Write the outputs first: one rung per lamp, each gated by \`EQU(Step,n)\`. Red has to cover both Idle (0) and Red (10), so give it a branch of two EQUs.",
    "Each timed step has its own TON on \`EQU(Step,n)\` (4000, 5000, 2000 ms). At the bottom, one transition rung per step: \`EQU(Step,10)XIC(RedTmr.DN)MOV(20,Step)\`, and so on. Add \`EQU(Step,0)XIC(Enable)MOV(10,Step)\` and a last rung \`XIO(Enable)MOV(0,Step)\`.",
    "\`[EQU(Step,0),EQU(Step,10)]OTE(Red);\` \`EQU(Step,20)OTE(Green);\` \`EQU(Step,30)OTE(Amber);\` \`EQU(Step,10)TON(RedTmr,4000,0);\` \`EQU(Step,20)TON(GrnTmr,5000,0);\` \`EQU(Step,30)TON(AmbTmr,2000,0);\` \`EQU(Step,0)XIC(Enable)MOV(10,Step);\` \`EQU(Step,10)XIC(RedTmr.DN)MOV(20,Step);\` \`EQU(Step,20)XIC(GrnTmr.DN)MOV(30,Step);\` \`EQU(Step,30)XIC(AmbTmr.DN)MOV(10,Step);\` \`XIO(Enable)MOV(0,Step);\`"
  ],
  solution: "[EQU(Step,0),EQU(Step,10)]OTE(Red);\nEQU(Step,20)OTE(Green);\nEQU(Step,30)OTE(Amber);\nEQU(Step,10)TON(RedTmr,4000,0);\nEQU(Step,20)TON(GrnTmr,5000,0);\nEQU(Step,30)TON(AmbTmr,2000,0);\nEQU(Step,0)XIC(Enable)MOV(10,Step);\nEQU(Step,10)XIC(RedTmr.DN)MOV(20,Step);\nEQU(Step,20)XIC(GrnTmr.DN)MOV(30,Step);\nEQU(Step,30)XIC(AmbTmr.DN)MOV(10,Step);\nXIO(Enable)MOV(0,Step);",
  explain: `This is the pattern behind nearly every sequence in Logix: **one step number, outputs decided by \`EQU\`, transitions that \`MOV\` the next number**. Because \`Step\` can hold only one value, two lamps can never be on together. You do not have to prove that by studying latches; the data structure makes it impossible.

Why the layout matters:

- **Outputs use OTE, not OTL/OTU.** When the step changes, the old lamp's rung goes false and the lamp drops by itself. Nothing is left latched.
- **One timer per step.** Each timer's rung is gated by its step, so it resets automatically on exit (a TON with a false rung clears). The next visit starts from zero.
- **Timers gated by \`EQU(Step,n)\`.** A \`MOV\` changes \`Step\` immediately for every rung below it in the same scan, so transitions can chain. They do not here because each step's timer only runs while its own step is active: the next step's timer starts from zero, its \`.DN\` is false, and it cannot fire in the same scan. A transition whose condition is *already true* (for example a compare with no timer) can fall through two steps in one scan. Keeping transitions at the bottom also means the outputs above always show the step that was active for this whole scan.
- **The gaps (10, 20, 30)** leave room to insert 'All red clearance' as step 15 later without renumbering.

Real signal controllers are far more demanding (minimum greens, conflict monitors, hardware malfunction monitors that are independent of the controller), but the sequencing skeleton looks exactly like this. In Studio 5000 the same sequence is often written as a structured text CASE; the ladder with EQU per step is the equivalent.`,
  tips: [
    "Expose \`Step\` to the HMI. When something is stuck, operators and technicians can see which step it is waiting in.",
    "Keep the transition conditions in one place (the bottom). A MOV into Step anywhere else is how state machines turn into spaghetti.",
    "Real signals add a clearance interval (all red) and a conflict check. A state machine is easy to extend for that: insert a step."
  ]
});
