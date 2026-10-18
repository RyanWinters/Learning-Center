LC.sim({
  id: "sim-scp", title: "Scaling a 4-20 mA input", level: 3, lesson: "plc-analog",
  brief: `Level transmitter **LT101** on a water tank sends **4-20 mA** to an analog input card. In this course the teaching card reports **raw counts** on a 0-21 mA to 0-32,767 scale, so **4 mA is 6242** counts and **20 mA is 31208** counts. LT101 is ranged **0 to 5.0 m**.

*Counts are module-specific. ControlLogix 1756/5069 analog modules usually scale to engineering units in the module, so check your manual.*

Operators want meters on the screen, not counts. Build the scaling:

1. Use **SCP** to turn \`LevelRaw\` (counts) into \`LevelM\` (meters, REAL).
2. Light \`LevelFault\` when the signal is bad. Use **both** checks: the card's wire-off status bit \`LevelWireOff\`, and a raw-count check that does not depend on the card. Under NAMUR NE43 a current **below 3.6 mA** is a loop or device failure, which is about **5617** counts. (Between 3.6 and 3.8 mA is "uncertain": a real program would alarm after a delay, but you only need the hard fault here.)
3. Light \`LevelLow\` when the scaled level is below **1.0 m**, **but not while the signal is faulted**. A dead wire scales to a negative level, and you do not want a false low-level alarm that hides the real problem.

Drag the slider to simulate the transmitter, and use the **Wire-off** switch to simulate the card's status bit. Try 0 counts to see what a broken wire looks like.

\`\`\`ladder
SCP(LevelRaw,6242,31208,0,5,LevelM);
\`\`\``,
  tags: {
    LevelRaw: { type: "DINT", desc: "Raw counts from the analog card (6242 = 4 mA, 31208 = 20 mA)" },
    LevelWireOff: { type: "BOOL", desc: "Card status: channel wire-off / open loop" },
    LevelM: { type: "REAL", desc: "LT101 level in meters (0-5.0 m)" },
    LevelFault: { type: "BOOL", desc: "Bad signal (NE43 failure range or wire-off)" },
    LevelLow: { type: "BOOL", desc: "Low level alarm (valid signal only)" }
  },
  io: [
    { tag: "LevelRaw", widget: "slider", label: "Transmitter (raw counts)", min: 0, max: 32767, step: 1, init: 18725 },
    { tag: "LevelWireOff", widget: "toggle", label: "Card wire-off status", states: ["OK", "Wire-off"] },
    { tag: "LevelM", widget: "value", label: "Level", unit: "m", dec: 2 },
    { tag: "LevelFault", widget: "lamp", label: "Signal fault", color: "alarm" },
    { tag: "LevelLow", widget: "lamp", label: "Low level", color: "warn" }
  ],
  palette: ["XIC", "XIO", "OTE", "SCP", "LES", "GRT", "MOV", "BRANCH"],
  requires: ["SCP"],
  starter: "MOV(LevelRaw,LevelM);",
  tests: [
    { name: "4 mA (6242 counts) scales to 0 m", steps: [{ set: { LevelRaw: 6242 } }, { scan: 2 }, { expect: { LevelM: 0, LevelFault: false } }] },
    { name: "20 mA (31208 counts) scales to 5.0 m", steps: [{ set: { LevelRaw: 31208 } }, { scan: 2 }, { expect: { LevelM: 5, LevelLow: false, LevelFault: false } }] },
    { name: "Mid-span (18725 counts) is about 2.5 m", steps: [{ set: { LevelRaw: 18725 } }, { scan: 2 }, { expect: { LevelM: 2.5, LevelLow: false, LevelFault: false } }] },
    { name: "A low reading (0.75 m) lights the low-level lamp", steps: [{ set: { LevelRaw: 9988 } }, { scan: 2 }, { expect: { LevelM: 0.75, LevelLow: true, LevelFault: false } }] },
    { name: "Just above the NE43 failure limit (3.8 mA, 5930 counts) is not a fault", steps: [{ set: { LevelRaw: 5930 } }, { scan: 2 }, { expect: { LevelFault: false } }] },
    { name: "A dead loop (0 counts) is a signal fault, not a low level", steps: [{ set: { LevelRaw: 0 } }, { scan: 2 }, { expect: { LevelFault: true, LevelLow: false } }] },
    { name: "Below 3.6 mA (5500 counts) is a signal fault", steps: [{ set: { LevelRaw: 5500 } }, { scan: 2 }, { expect: { LevelFault: true, LevelLow: false } }] },
    { name: "The card's wire-off bit faults the signal even if the counts look fine", steps: [{ set: { LevelRaw: 9988, LevelWireOff: true } }, { scan: 2 }, { expect: { LevelFault: true, LevelLow: false } }] },
    { name: "The fault clears when the signal returns", steps: [{ set: { LevelRaw: 0 } }, { scan: 2 }, { set: { LevelRaw: 20000 } }, { scan: 2 }, { expect: { LevelFault: false, LevelLow: false } }] }
  ],
  hints: [
    "Two points define a line: (6242 counts, 0 m) and (31208 counts, 5.0 m). Logix has one instruction that scales along that line. Look in the Math group. The fault needs two conditions in parallel: either the status bit or a low raw count.",
    "\`SCP(LevelRaw,6242,31208,0,5,LevelM)\` takes Input, Input min, Input max, Scaled min, Scaled max, Output. Compare the **raw** value with 5617 (3.6 mA) for the fault, in a branch beside \`XIC(LevelWireOff)\`, because neither depends on the scaling.",
    "\`SCP(LevelRaw,6242,31208,0,5,LevelM);\` \`[LES(LevelRaw,5617),XIC(LevelWireOff)]OTE(LevelFault);\` \`XIO(LevelFault)LES(LevelM,1.0)OTE(LevelLow);\`"
  ],
  solution: "SCP(LevelRaw,6242,31208,0,5,LevelM);\n[LES(LevelRaw,5617),XIC(LevelWireOff)]OTE(LevelFault);\nXIO(LevelFault)LES(LevelM,1.0)OTE(LevelLow);",
  explain: `**SCP** draws a straight line through two known points and reads your input off it: \`out = (in - inMin) * (outMax - outMin) / (inMax - inMin) + outMin\`. Here one count is 5.0 / 24966 = 0.0002 m, so 18725 counts gives 2.5 m.

Notice what happens at 0 counts. The line keeps going, so SCP returns **-1.25 m**. That is a feature: the unclamped number tells you the loop is dead. But a number alone is a poor way to detect a fault, so the program uses two independent checks:

- **The module's status bit** (\`LevelWireOff\`). A real analog card reports wire-off and under/over-range as status bits on the channel, and the scaled value does not simply fall to a clean negative number. Use the status bit first.
- **The raw count**, below 5617 (3.6 mA). This follows the NAMUR NE43 table: 3.8-20.5 mA is measurement, 3.6-3.8 and 20.5-21 mA is uncertain, and below 3.6 mA or above 21 mA is device or loop failure. The raw check works on any module because it only looks at what the card measured.

The fault also **inhibits the low-level alarm**. Without that, a cut wire would announce "low level" and the operator would open the fill valve on a full tank.

In Studio 5000 the same instruction sits in a ladder rung as \`SCP\` with the same six parameters. Many integrators put the raw value, EU low, EU high and the scaled PV in an AnalogIn UDT and scale in one place per channel, so a technician can adjust a range from the HMI without a download. See the analog lesson for module-level scaling versus scaling in logic.`,
  tips: [
    "Always look at your module manual for the real count range. Different cards and ranges give different counts, and a copy-pasted 6242/31208 on the wrong card is a classic commissioning bug.",
    "Alarm on **bad signal** separately from **bad process**. A wire-off flag is worth one rung and saves an hour of chasing a phantom low-level alarm.",
    "Use REAL for the scaled value and DINT only for the raw counts. Scaling into a DINT throws away the decimals and makes a 0.4 m level display as 0."
  ]
});
