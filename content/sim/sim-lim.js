LC.sim({
  id: "sim-lim", title: "Limit window check", level: 3, lesson: "plc-compare-math",
  brief: `A bakery oven must be between **160.0 and 180.0 degrees C, inclusive**, before the operator is allowed to load dough. The temperature, \`OvenTemp\`, is a **REAL** from a thermocouple card.

Build the oven logic:

- \`InWindow\` is on whenever \`OvenTemp\` is between 160.0 and 180.0, **including both limits**.
- \`ReadyToLoad\` lamp shows the oven is ready: it follows \`InWindow\`.
- When the oven is switched on (\`OvenOn\`), \`OutOfRange\` lamp is on whenever the temperature is **not** in the window. While the oven is off, the alarm lamp stays dark.

Use one **LIM** instruction rather than two compares. LIM takes a low limit, a test value and a high limit, in that order.

\`\`\`ladder
LIM(160.0,OvenTemp,180.0)OTE(InWindow);
\`\`\``,
  tags: { OvenOn: "BOOL", OvenTemp: { type: "REAL", desc: "Oven temperature, deg C" }, InWindow: "BOOL", ReadyToLoad: "BOOL", OutOfRange: "BOOL" },
  io: [
    { tag: "OvenOn", widget: "toggle", label: "Oven switch" },
    { tag: "OvenTemp", widget: "slider", label: "Oven temperature", min: 100, max: 220, step: 0.1, unit: "C", init: 100 },
    { tag: "ReadyToLoad", widget: "lamp", label: "Ready to load" },
    { tag: "OutOfRange", widget: "lamp", label: "Out of range", color: "bad" },
    { tag: "InWindow", widget: "lamp", label: "In window", color: "ok" }
  ],
  init: { OvenTemp: 100 },
  palette: ["XIC", "XIO", "OTE", "LIM", "GEQ", "LEQ", "GRT", "LES", "BRANCH"],
  requires: ["LIM"],
  starter: "GRT(OvenTemp,160.0)OTE(InWindow);",
  tests: [
    { name: "Mid-window is in range and ready", steps: [{ set: { OvenTemp: 170 } }, { scan: 3 }, { expect: { InWindow: true, ReadyToLoad: true } }] },
    { name: "Both limits are included", steps: [{ set: { OvenTemp: 160 } }, { scan: 2 }, { expect: { InWindow: true } }, { set: { OvenTemp: 180 } }, { scan: 2 }, { expect: { InWindow: true } }] },
    { name: "Just outside either limit is out of window", steps: [{ set: { OvenTemp: 159.5 } }, { scan: 2 }, { expect: { InWindow: false } }, { set: { OvenTemp: 180.5 } }, { scan: 2 }, { expect: { InWindow: false, ReadyToLoad: false } }] },
    { name: "The alarm only works while the oven is on", steps: [{ set: { OvenTemp: 120 } }, { scan: 2 }, { expect: { OutOfRange: false } }, { set: { OvenOn: true } }, { scan: 2 }, { expect: { OutOfRange: true } }, { set: { OvenTemp: 170 } }, { scan: 2 }, { expect: { OutOfRange: false } }, { set: { OvenTemp: 190 } }, { scan: 2 }, { expect: { OutOfRange: true } }] }
  ],
  hints: [
    "A window has two edges. One compare checks only one edge, so it will be wrong on the other side. Logix has a single instruction that checks a value against a low and a high limit.",
    "\`LIM(low,test,high)\` passes power when low <= test <= high. Put the limits first and last and the thing you are testing in the middle: \`LIM(160.0,OvenTemp,180.0)\`. Then use the \`InWindow\` bit for the other two lamps.",
    "\`LIM(160.0,OvenTemp,180.0)OTE(InWindow);\` \`XIC(InWindow)OTE(ReadyToLoad);\` \`XIC(OvenOn)XIO(InWindow)OTE(OutOfRange);\`"
  ],
  solution: "LIM(160.0,OvenTemp,180.0)OTE(InWindow);\nXIC(InWindow)OTE(ReadyToLoad);\nXIC(OvenOn)XIO(InWindow)OTE(OutOfRange);",
  explain: `\`LIM(Low, Test, High)\` is an input instruction that is true when **Low <= Test <= High**. The limits are included. It does the job of two compares in series, \`GEQ(OvenTemp,160.0)\` and \`LEQ(OvenTemp,180.0)\`, in a single, readable block. A common mistake is writing the arguments in the wrong order, for example \`LIM(OvenTemp,160.0,180.0)\`; that tests whether 160 lies between the oven temperature and 180, which is true for the wrong values and gives no error.

We turned the result into a bit, \`InWindow\`, and used that bit in two more rungs. This is good practice: do the comparison once, give the result a name, then use the name. It makes the program easier to read online and you only have one place to change a limit.

The alarm uses \`XIO(InWindow)\` with the oven switch, so a cold oven that is switched off doesn't alarm. Gating alarms on the equipment state is how real alarm logic avoids nuisance alarms during start-up.

One more Logix detail: if Low is greater than High, the LIM instruction passes when Test is **outside** the range, i.e. Test >= Low or Test <= High. This wraps for circular values such as angles, and it surprises people who mix up their limits.`,
  tips: [
    "Use tags for the limits (\`Oven.LowLimit\`, \`Oven.HighLimit\`) so a recipe can change them. LIM accepts tags or literals in all three spots.",
    "LIM includes both limits. If the spec says 'strictly between', use two compares (GRT and LES) instead.",
    "Don't use EQU to check whether a REAL is on a setpoint. A window test with LIM is the safe way to ask 'close enough'.",
    "Add a few seconds of on-delay to an out-of-range alarm so a short temperature dip while the door is opened doesn't set it off."
  ]
});
