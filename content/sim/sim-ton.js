LC.sim({
  id: "sim-ton", title: "On-delay timer", level: 2, lesson: "plc-timers",
  brief: `Before a long conveyor starts, a warning horn must sound for **3 seconds**, so anyone nearby can clear the belt.

Sequence:

1. The operator presses \`Start\`. A start sequence begins: \`Horn\` sounds immediately.
2. After **3 seconds** the horn stops and \`Conveyor\` starts.
3. \`Stop\` (normally closed, reads 1 at rest) cancels everything at any time, including during the countdown.

The starter already seals in a \`Starting\` bit for you. Add a **TON** (timer on delay) named \`WarnTimer\` with a 3000 ms preset, and use its bits:

- \`WarnTimer.DN\` turns on once 3 seconds of timing have accumulated
- \`WarnTimer.TT\` is on while it is still timing
- \`WarnTimer.EN\` follows the rung

\`\`\`ladder
XIC(Starting)TON(WarnTimer,3000,0);
\`\`\`

Presets are in **milliseconds**. Use the *Speed* menu if you want to watch it faster.`,
  tags: { Start: "BOOL", Stop: { type: "BOOL", desc: "NC stop: 1 at rest" }, Starting: { type: "BOOL", desc: "Start sequence active" }, WarnTimer: { type: "TIMER", desc: "Pre-start warning delay" }, Horn: "BOOL", Conveyor: "BOOL" },
  io: [
    { tag: "Start", widget: "pb", label: "Start" },
    { tag: "Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "Horn", widget: "lamp", label: "Warning horn", color: "warn" },
    { tag: "Conveyor", widget: "motor", label: "Conveyor" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "BRANCH"],
  requires: ["TON"],
  starter: "[XIC(Start),XIC(Starting)]XIC(Stop)OTE(Starting);\nXIC(Starting)OTE(Conveyor);",
  tests: [
    { name: "Nothing runs before Start", steps: [{ scan: 3 }, { expect: { Horn: false, Conveyor: false } }] },
    { name: "Start sounds the horn at once and holds the conveyor", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 100 }, { expect: { Horn: true, Conveyor: false } }] },
    { name: "The conveyor is still waiting just before 3 seconds", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 2700 }, { expect: { Horn: true, Conveyor: false } }] },
    { name: "After 3 seconds the horn stops and the conveyor starts", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 2900 }, { expect: { Horn: false, Conveyor: true } }, { wait: 3000 }, { expect: { Horn: false, Conveyor: true } }] },
    { name: "Stop during the countdown cancels the start", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 1000 }, { press: { tag: "Stop", ms: 200 } }, { wait: 5000 }, { expect: { Horn: false, Conveyor: false } }] },
    { name: "Stop halts a running conveyor", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 3500 }, { expect: { Conveyor: true } }, { press: { tag: "Stop", ms: 200 } }, { wait: 200 }, { expect: { Conveyor: false } }] },
    { name: "A second start gets a fresh 3 second warning", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 3500 }, { press: { tag: "Stop", ms: 200 } }, { wait: 300 }, { press: { tag: "Start", ms: 200 } }, { wait: 500 }, { expect: { Horn: true, Conveyor: false } }] }
  ],
  hints: [
    "The conveyor has to wait until some time has passed since the start sequence began. Which instruction measures time while its rung is true?",
    "Add \`XIC(Starting)TON(WarnTimer,3000,0)\` on its own rung. The preset is 3000 because it is in milliseconds. Then use the timer's \`.DN\` bit as the signal that the time is up.",
    "Horn: \`XIC(Starting)XIO(WarnTimer.DN)OTE(Horn);\`  Conveyor: \`XIC(WarnTimer.DN)OTE(Conveyor);\` Replace the starter's conveyor rung with that."
  ],
  solution: "[XIC(Start),XIC(Starting)]XIC(Stop)OTE(Starting);\nXIC(Starting)TON(WarnTimer,3000,0);\nXIC(Starting)XIO(WarnTimer.DN)OTE(Horn);\nXIC(WarnTimer.DN)OTE(Conveyor);",
  explain: `A **TON** is a little state machine with five members:

| Member | Meaning |
|---|---|
| \`.PRE\` | preset, in ms |
| \`.ACC\` | accumulated time, in ms |
| \`.EN\` | enable: the rung is true |
| \`.TT\` | timer timing: enabled and not yet done |
| \`.DN\` | done: \`ACC >= PRE\` |

While its rung is true, \`ACC\` grows by the time of each scan. When \`ACC\` reaches \`PRE\`, \`DN\` turns on. The instant the rung goes false, **ACC resets to zero and every bit clears**. That is why Stop, which drops \`Starting\`, instantly resets the countdown, and why a second start waits the full 3 seconds again.

Notice that the logic never watches the clock. It asks one question, "is the done bit on?", which makes timers easy to reason about and easy to test.

In Studio 5000 the instruction is drawn as a box with Timer, Time Base, Preset and Accum, just as in the simulator. The neutral text \`TON(WarnTimer,3000,0)\` carries the tag, preset and starting accumulator. The timer tag itself is a TIMER data type, created once and used by exactly one TON.`,
  tips: [
    "Use each timer tag in **one** TON only. Two TON instructions on one tag fight over the same ACC and produce strange timings.",
    "Test timer bits with \`.DN\`, \`.TT\` or \`.EN\`. Comparing \`.ACC\` against a number works but hides the intent, and Studio's cross-reference makes the bits easy to find.",
    "Timing accuracy is the scan time, plus any time other tasks use. A 3 s timer on a 10 ms scan is good to roughly 3.01 s. Do not use PLC timers for anything that needs sub-scan precision, such as encoder timing. Use a high-speed input or a motion task.",
    "Real startup horns are often required by safety standards to be audible for a minimum time. Put the preset in a tag so it can be changed without editing logic."
  ]
});
