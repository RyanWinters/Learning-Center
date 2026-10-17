LC.sim({
  id: "sim-sealin", title: "Three-wire start/stop", level: 1, lesson: "plc-sealin",
  brief: `The most common circuit in industrial control: a **momentary** Start button and a **momentary** Stop button run a motor.

An electrician calls it **three-wire control**. The relay (here, the motor coil) uses its own contact to hold itself on after Start is released. That is a **seal-in** (also called a *holding* or *latching* circuit).

Build it for the conveyor:

- Pressing \`Start\` starts \`Motor\`, and it keeps running after Start is released.
- Pressing \`Stop\` stops \`Motor\`, and it stays stopped after Stop is released.
- If both are pressed, **Stop wins**.

The Stop button is wired **normally closed**, so its tag reads **1 at rest** and 0 when pressed. Think about whether Stop needs an XIC or an XIO.

\`\`\`ladder
[XIC(Start),XIC(Motor)]XIC(Stop)OTE(Motor);
\`\`\``,
  tags: { Start: "BOOL", Stop: { type: "BOOL", desc: "NC stop: 1 at rest" }, Motor: "BOOL" },
  io: [
    { tag: "Start", widget: "pb", label: "Start" },
    { tag: "Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "Motor", widget: "motor", label: "Conveyor motor" }
  ],
  palette: ["XIC", "XIO", "OTE", "BRANCH"],
  requires: ["OTE"],
  starter: "XIC(Start)OTE(Motor);",
  tests: [
    { name: "Motor is off at power-up", steps: [{ scan: 3 }, { expect: { Motor: false } }] },
    { name: "A brief Start press latches the motor on", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 200 }, { expect: { Motor: true } }, { wait: 1000 }, { expect: { Motor: true } }] },
    { name: "Stop drops the motor out", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 100 }, { expect: { Motor: true } }, { press: { tag: "Stop", ms: 200 } }, { wait: 100 }, { expect: { Motor: false } }] },
    { name: "The motor stays off after Stop is released", steps: [{ press: { tag: "Start", ms: 200 } }, { press: { tag: "Stop", ms: 200 } }, { wait: 1000 }, { expect: { Motor: false } }] },
    { name: "Stop wins while Start is still held", steps: [{ set: { Start: true } }, { scan: 2 }, { expect: { Motor: true } }, { set: { Stop: false } }, { scan: 2 }, { expect: { Motor: false } }], },
    { name: "Start does nothing while Stop is held", steps: [{ set: { Stop: false } }, { scan: 1 }, { press: { tag: "Start", ms: 200 } }, { wait: 200 }, { expect: { Motor: false } }] }
  ],
  hints: [
    "Start is only pressed for a moment, yet the motor must keep running. So the rung needs a way to stay true on its own after Start is gone. What bit is true exactly when the motor is running?",
    "Put the motor's own bit in parallel with Start: a branch with \`XIC(Start)\` on one leg and \`XIC(Motor)\` on the other. Then put the Stop contact in series after the branch, so it can break the whole rung.",
    "Stop reads 1 at rest because it is NC, so Stop needs an **XIC** here (power passes while the stop circuit is healthy). Full rung: \`[XIC(Start),XIC(Motor)]XIC(Stop)OTE(Motor);\`"
  ],
  solution: "[XIC(Start),XIC(Motor)]XIC(Stop)OTE(Motor);",
  explain: `Follow the scan. When Start is pressed, the top leg conducts, Stop is healthy, and OTE sets \`Motor\` to 1. On the **next scan** the second leg, \`XIC(Motor)\`, is already true, so the rung stays true even though Start has been released. The motor holds itself on: it is **sealed in**.

Stop is placed in series **after** the branch, so it breaks the rung whatever else is true. That is what makes Stop dominant. If you put Stop in series with only the Start leg, a held Start button could keep the motor running while Stop is pressed, and you can prove it by trying it.

**Why XIC on the stop button?** The button is NC, so the input bit is 1 when the button is *not* pressed. XIC(Stop) is therefore true during normal operation and false when pressed or when the wire breaks. If you used XIO(Stop), the rung would be dead until someone pressed Stop, which you saw in the previous challenge.

In Studio 5000 the same rung is drawn with the Motor contact in a branch under Start, exactly as here.`,
  tips: [
    "A seal-in built on OTE is **not retentive**. The controller clears OTE bits during prescan when it goes to Run, so after a power loss the motor needs a fresh Start press. That is usually what safety wants. An OTL latch, in contrast, keeps its value and can restart equipment.",
    "Add every permissive and trip in series with Stop: overload OK, guard closed, E-stop healthy. Each is its own XIC, and any one dropping out stops the motor.",
    "Use the **output** tag as the seal contact only when the output is a plain internal bit. If the motor is a physical output, many integrators seal on a separate internal \`Motor_Run_Cmd\` bit and drive the output from it, so forcing the output for testing does not corrupt the seal."
  ]
});
