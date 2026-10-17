LC.sim({
  id: "sim-scp", title: "Scaling a 4-20 mA input", level: 3, lesson: "plc-analog",
  brief: `A level transmitter on a 10 m water tank sends **4-20 mA** to an analog input card. The card reports **raw counts**: 4 mA is **3277** counts and 20 mA is **16384** counts. The transmitter is ranged **0 to 10 m**.

Operators want meters on the screen, not counts. Build the scaling:

1. Use **SCP** to turn \`LevelRaw\` (counts) into \`LevelM\` (meters, REAL).
2. If \`LevelRaw\` falls below **3000** counts the loop is broken (wire-off or dead transmitter). Light \`LevelFault\`. Below about 3.8 mA the number is not a real level.
3. Light \`LevelLow\` when the scaled level is below **2.0 m**, **but not while the signal is faulted**. A dead wire scales to a negative level, and you do not want a false low-level alarm that hides the real problem.

Drag the slider to simulate the transmitter. Try 0 counts to see what a broken wire looks like.

\`\`\`ladder
SCP(LevelRaw,3277,16384,0,10,LevelM);
\`\`\``,
  tags: {
    LevelRaw: { type: "DINT", desc: "Raw counts from the analog card (3277 = 4 mA, 16384 = 20 mA)" },
    LevelM: { type: "REAL", desc: "Tank level in meters" },
    LevelFault: { type: "BOOL", desc: "Signal outside 4-20 mA range" },
    LevelLow: { type: "BOOL", desc: "Low level alarm (valid signal only)" }
  },
  io: [
    { tag: "LevelRaw", widget: "slider", label: "Transmitter (raw counts)", min: 0, max: 16384, step: 1, init: 9830 },
    { tag: "LevelM", widget: "value", label: "Level", unit: "m", dec: 2 },
    { tag: "LevelFault", widget: "lamp", label: "Signal fault", color: "alarm" },
    { tag: "LevelLow", widget: "lamp", label: "Low level", color: "warn" }
  ],
  palette: ["XIC", "XIO", "OTE", "SCP", "LES", "GRT", "MOV", "BRANCH"],
  requires: ["SCP"],
  starter: "MOV(LevelRaw,LevelM);",
  tests: [
    { name: "4 mA (3277 counts) scales to 0 m", steps: [{ set: { LevelRaw: 3277 } }, { scan: 2 }, { expect: { LevelM: 0, LevelFault: false } }] },
    { name: "20 mA (16384 counts) scales to 10 m", steps: [{ set: { LevelRaw: 16384 } }, { scan: 2 }, { expect: { LevelM: 10, LevelLow: false } }] },
    { name: "Mid-span (9830 counts) is about 5 m", steps: [{ set: { LevelRaw: 9830 } }, { scan: 2 }, { expect: { LevelM: 5, LevelLow: false, LevelFault: false } }] },
    { name: "A low reading (1.5 m) lights the low-level lamp", steps: [{ set: { LevelRaw: 5243 } }, { scan: 2 }, { expect: { LevelM: 1.5, LevelLow: true, LevelFault: false } }] },
    { name: "A dead loop (0 counts) is a signal fault, not a low level", steps: [{ set: { LevelRaw: 0 } }, { scan: 2 }, { expect: { LevelFault: true, LevelLow: false } }] },
    { name: "The fault clears when the signal returns", steps: [{ set: { LevelRaw: 0 } }, { scan: 2 }, { set: { LevelRaw: 12000 } }, { scan: 2 }, { expect: { LevelFault: false, LevelLow: false } }] }
  ],
  hints: [
    "Two points define a line: (3277 counts, 0 m) and (16384 counts, 10 m). Logix has one instruction that scales along that line. Look in the Math group.",
    "\`SCP(LevelRaw,3277,16384,0,10,LevelM)\` takes Input, Input min, Input max, Scaled min, Scaled max, Output. Then compare the **raw** value with 3000 for the fault, because it does not depend on the scaling.",
    "\`SCP(LevelRaw,3277,16384,0,10,LevelM);\` \`LES(LevelRaw,3000)OTE(LevelFault);\` \`XIO(LevelFault)LES(LevelM,2.0)OTE(LevelLow);\`"
  ],
  solution: "SCP(LevelRaw,3277,16384,0,10,LevelM);\nLES(LevelRaw,3000)OTE(LevelFault);\nXIO(LevelFault)LES(LevelM,2.0)OTE(LevelLow);",
  explain: `**SCP** draws a straight line through two known points and reads your input off it: \`out = (in - inMin) * (outMax - outMin) / (inMax - inMin) + outMin\`. With the tank, one count is 10 / 13107 = 0.000763 m, so 9830 counts gives 5.0 m.

Notice what happens at 0 counts. The line keeps going, so SCP returns **-2.5 m**. That is a feature: the unclamped number tells you the loop is dead. The fault test uses the **raw** counts (below 3000, roughly 3.7 mA) rather than the scaled value, because the raw value is what the card actually measured. The fault also **inhibits the low-level alarm**. Without that, a cut wire would announce "low level" and the operator would open the fill valve on a full tank.

In Studio 5000 the same instruction sits in a ladder rung as \`SCP\` with the same six parameters. Many integrators instead put the raw value, EU low, EU high and the scaled PV in an AnalogIn UDT and scale in one place per channel, so a technician can adjust a range from the HMI without a download. See the analog lesson for module-level scaling versus scaling in logic.`,
  tips: [
    "Always look at your module manual for the real count range. Different cards and ranges give different counts, and a copy-pasted 3277/16384 on the wrong card is a classic commissioning bug.",
    "Alarm on **bad signal** separately from **bad process**. A wire-off flag is worth one rung and saves an hour of chasing a phantom low-level alarm.",
    "Use REAL for the scaled value and DINT only for the raw counts. Scaling into a DINT throws away the decimals and makes a 0.4 m level display as 0."
  ]
});
