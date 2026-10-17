LC.sim({
  id: "sim-compare", title: "Tank high/low with compares", level: 3, lesson: "plc-compare-math",
  brief: `A process tank is filled by the plant. A level transmitter gives \`Tank.Level\` as a **REAL** percentage, 0.0 to 100.0. Your job is to control the drain pump and to raise level alarms.

- **Drain pump:** start \`DrainPump\` when the level goes **above 70.0**. Keep it running until the level falls **below 30.0**, then stop it. Between 30 and 70 it must stay in whichever state it was in. This gap is called **hysteresis**; without it the pump would chatter on and off around a single setpoint.
- **High alarm:** \`HighAlarm\` is on while the level is **above 90.0**.
- **Low alarm:** \`LowAlarm\` is on while the level is **below 10.0**.

Use compare instructions \`GRT\`, \`GEQ\`, \`LES\` and \`LEQ\`. Levels are REAL, so do **not** use \`EQU\` to catch a level: a REAL will almost never be exactly 70.0, and it can jump over it between scans.

\`\`\`ladder
GRT(Tank.Level,90.0)OTE(HighAlarm);
LES(Tank.Level,10.0)OTE(LowAlarm);
\`\`\`
Drag the slider to change the level.`,
  udts: { Tank: { Level: "REAL" } },
  tags: { Tank: { type: "Tank", desc: "Process tank" }, DrainPump: "BOOL", HighAlarm: "BOOL", LowAlarm: "BOOL" },
  io: [
    { tag: "Tank.Level", widget: "slider", label: "Tank level", min: 0, max: 100, step: 0.5, unit: "%" },
    { tag: "DrainPump", widget: "motor", label: "Drain pump" },
    { tag: "HighAlarm", widget: "lamp", label: "High level alarm", color: "bad" },
    { tag: "LowAlarm", widget: "lamp", label: "Low level alarm", color: "warn" }
  ],
  palette: ["XIC", "XIO", "OTE", "GRT", "GEQ", "LES", "LEQ", "EQU", "BRANCH"],
  requires: ["GRT", "LES"],
  starter: "GRT(Tank.Level,70.0)OTE(DrainPump);",
  tests: [
    { name: "Above 70 the pump starts, but exactly 70.0 does not", steps: [{ set: { "Tank.Level": 70 } }, { scan: 2 }, { expect: { DrainPump: false } }, { set: { "Tank.Level": 70.5 } }, { scan: 2 }, { expect: { DrainPump: true, HighAlarm: false } }] },
    { name: "A jump from 20 to 95 does not skip the start point", steps: [{ set: { "Tank.Level": 20 } }, { scan: 2 }, { set: { "Tank.Level": 95 } }, { scan: 2 }, { expect: { DrainPump: true, HighAlarm: true } }] },
    { name: "The pump keeps running while the level falls to 50", steps: [{ set: { "Tank.Level": 80 } }, { scan: 2 }, { set: { "Tank.Level": 50 } }, { scan: 2 }, { expect: { DrainPump: true } }] },
    { name: "The pump stops below 30 and stays stopped as the level rises", steps: [{ set: { "Tank.Level": 80 } }, { scan: 2 }, { set: { "Tank.Level": 29.5 } }, { scan: 2 }, { expect: { DrainPump: false } }, { set: { "Tank.Level": 50 } }, { scan: 2 }, { expect: { DrainPump: false } }] },
    { name: "High and low alarms follow the level (strictly above 90, below 10)", steps: [{ set: { "Tank.Level": 90 } }, { scan: 2 }, { expect: { HighAlarm: false } }, { set: { "Tank.Level": 90.5 } }, { scan: 2 }, { expect: { HighAlarm: true, LowAlarm: false } }, { set: { "Tank.Level": 10 } }, { scan: 2 }, { expect: { HighAlarm: false, LowAlarm: false } }, { set: { "Tank.Level": 9.5 } }, { scan: 2 }, { expect: { LowAlarm: true } }] }
  ],
  hints: [
    "One compare cannot give you a gap between start and stop. The pump rung needs to remember that it is running, the way a start/stop seal-in does. What can play the role of the Start button here?",
    "Make a seal-in: a branch with \`GRT(Tank.Level,70.0)\` on one leg and \`XIC(DrainPump)\` on the other, then a second compare in series that is true until the level falls below 30. Then add one simple rung each for the alarms.",
    "\`[GRT(Tank.Level,70.0),XIC(DrainPump)]GEQ(Tank.Level,30.0)OTE(DrainPump);\` \`GRT(Tank.Level,90.0)OTE(HighAlarm);\` \`LES(Tank.Level,10.0)OTE(LowAlarm);\`"
  ],
  solution: "[GRT(Tank.Level,70.0),XIC(DrainPump)]GEQ(Tank.Level,30.0)OTE(DrainPump);\nGRT(Tank.Level,90.0)OTE(HighAlarm);\nLES(Tank.Level,10.0)OTE(LowAlarm);",
  explain: `A compare instruction is an **input** instruction, like an XIC: it passes power if its test is true and blocks it if not. \`GRT(a,b)\` passes when a is greater than b. \`GEQ\` includes equal, \`LES\` and \`LEQ\` are the opposites, and \`EQU\` and \`NEQ\` test for equality.

The pump rung is a seal-in with a level in place of the Start button. Above 70 the top leg conducts and the pump starts. Once it is running, \`XIC(DrainPump)\` holds the rung, and the only way to break it is for the series \`GEQ(Tank.Level,30.0)\` to go false, which happens when the level falls **below 30**. Between 30 and 70, neither leg changes the state. That is hysteresis.

Boundaries matter. "Above 70" is \`GRT\`, so a level of exactly 70.0 doesn't start the pump, and a level of exactly 30.0 keeps it running. Check what the spec says, then pick GRT or GEQ on purpose.

**Why not EQU?** A REAL is an approximate binary number: 0.1 can't be stored exactly, and a level that arrives in jumps may never be exactly your setpoint. \`EQU\` on a REAL either never fires or fires by accident. Use GRT/LES to catch a range instead of a point.

In Studio 5000 these appear as compare blocks with Source A and Source B, or in neutral text exactly as here. The tags \`Tank.Level\` and friends are members of a user-defined type.`,
  tips: [
    "Never use EQU or NEQ on REAL values. Use a range (GEQ and LEQ, or LIM) instead.",
    "Real level transmitters are noisy. A small hysteresis band (here 40 %) is huge, but even 1 % keeps a pump from chattering at a single setpoint, and a short on-delay on the alarm helps further.",
    "Put the setpoints in tags (\`Tank.StartSP\`, \`Tank.StopSP\`) so the operator can tune them from the HMI instead of editing logic. Compare against the tags, not against literals.",
    "A failed transmitter reads below range or above range. Add a bad-signal alarm (for example, below 3.8 mA) so a broken wire does not look like an empty tank."
  ]
});
