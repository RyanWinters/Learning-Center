LC.sim({
  id: "sim-ctd", title: "Up/down car-park counter", level: 2, lesson: "plc-counters",
  brief: `A small car park has **5 spaces**. A sensor at the entry, \`EntryEye\`, is blocked by each car driving in. A second sensor at the exit, \`ExitEye\`, is blocked by each car leaving. The sign at the gate must show **FULL** (\`LotFull\` lamp) when all the spaces are taken, and the \`EntryGate\` must stay closed while it is full.

You need **one number** that goes up and down: the number of cars inside.

- Use a **CTU** and a **CTD** on the **same counter tag**, \`Cars\`, with a preset of **5**.
- \`Cars.ACC\` is the number of cars in the lot. \`Cars.DN\` turns on when \`ACC >= PRE\`.
- \`LotFull\` follows \`Cars.DN\`, and \`EntryGate\` is open when the lot is **not** full.
- If the count drifts (a car turns around at the gate, say), the attendant presses \`Resync\` to set the count back to zero when the lot is empty. That needs **RES**.

\`\`\`ladder
XIC(EntryEye)CTU(Cars,5,0);
XIC(ExitEye)CTD(Cars,5,0);
\`\`\``,
  tags: { EntryEye: { type: "BOOL", desc: "1 while a car blocks the entry beam" }, ExitEye: { type: "BOOL", desc: "1 while a car blocks the exit beam" }, Resync: "BOOL", Cars: { type: "COUNTER", desc: "Cars in the lot" }, LotFull: "BOOL", EntryGate: "BOOL" },
  io: [
    { tag: "EntryEye", widget: "sensor", label: "Entry sensor", states: ["Clear", "Car"] },
    { tag: "ExitEye", widget: "sensor", label: "Exit sensor", states: ["Clear", "Car"] },
    { tag: "Resync", widget: "pb", label: "Attendant resync" },
    { tag: "LotFull", widget: "lamp", label: "FULL sign", color: "warn" },
    { tag: "EntryGate", widget: "lamp", label: "Entry gate open" },
    { tag: "Cars.ACC", widget: "value", label: "Cars inside" }
  ],
  palette: ["XIC", "XIO", "OTE", "CTU", "CTD", "RES", "BRANCH"],
  requires: ["CTU", "CTD", "RES"],
  starter: "XIC(EntryEye)CTU(Cars,5,0);\nXIC(Cars.DN)OTE(LotFull);",
  tests: (function () {
    var car = function (tag) { return [{ set: (function () { var o = {}; o[tag] = true; return o; })() }, { scan: 2 }, { set: (function () { var o = {}; o[tag] = false; return o; })() }, { scan: 2 }]; };
    var cars = function (tag, n) { var a = []; for (var i = 0; i < n; i++) a = a.concat(car(tag)); return a; };
    return [
      { name: "Cars entering are counted up", steps: cars("EntryEye", 3).concat([{ expect: { "Cars.ACC": 3, LotFull: false, EntryGate: true } }]) },
      { name: "A car waiting in the beam counts only once", steps: [{ set: { EntryEye: true } }, { wait: 2000 }, { expect: { "Cars.ACC": 1 } }, { set: { EntryEye: false, ExitEye: true } }, { wait: 2000 }, { expect: { "Cars.ACC": 0 } }] },
      { name: "The fifth car fills the lot and closes the gate", steps: cars("EntryEye", 4).concat([{ expect: { LotFull: false, EntryGate: true } }]).concat(cars("EntryEye", 1)).concat([{ expect: { "Cars.ACC": 5, LotFull: true, EntryGate: false } }]) },
      { name: "One car leaving a full lot reopens it", steps: cars("EntryEye", 5).concat(cars("ExitEye", 1)).concat([{ expect: { "Cars.ACC": 4, LotFull: false, EntryGate: true } }]) },
      { name: "Resync sets the count back to zero", steps: cars("EntryEye", 5).concat([{ press: { tag: "Resync", ms: 200 } }, { wait: 100 }, { expect: { "Cars.ACC": 0, LotFull: false, EntryGate: true } }]).concat(cars("EntryEye", 2)).concat([{ expect: { "Cars.ACC": 2 } }]) }
    ];
  })(),
  hints: [
    "Going up is one instruction and going down is another. They have to act on the **same number**, so think about which part of the instruction names that number.",
    "Use \`XIC(EntryEye)CTU(Cars,5,0)\` and \`XIC(ExitEye)CTD(Cars,5,0)\`: the same tag \`Cars\` in both. Use \`Cars.DN\` for the FULL sign and \`XIO(Cars.DN)\` for the gate. Put \`RES(Cars)\` on its own rung for the resync button.",
    "\`XIC(EntryEye)CTU(Cars,5,0);\` \`XIC(ExitEye)CTD(Cars,5,0);\` \`XIC(Cars.DN)OTE(LotFull);\` \`XIO(Cars.DN)OTE(EntryGate);\` \`XIC(Resync)RES(Cars);\`"
  ],
  solution: "XIC(EntryEye)CTU(Cars,5,0);\nXIC(ExitEye)CTD(Cars,5,0);\nXIC(Cars.DN)OTE(LotFull);\nXIO(Cars.DN)OTE(EntryGate);\nXIC(Resync)RES(Cars);",
  explain: `A counter is a tag with an \`.ACC\`, and **CTU** and **CTD** are two instructions that can both act on it. A CTU adds one to \`.ACC\` on each false-to-true change of its rung, and a CTD subtracts one on each false-to-true change of its own rung. Each keeps its own edge memory (\`.CU\` for the CTU, \`.CD\` for the CTD), so a car parked in a beam counts only once.

Using **one tag** is the whole trick. If you make a separate counter for exits, you get two numbers that you would have to subtract. With a shared tag the result is already the answer: \`Cars.ACC\` is the number of cars inside.

\`.DN\` is true whenever \`ACC >= PRE\`, so it follows the count up and **drops again** when a car leaves. It is a comparison and not a latch, which is exactly what you want for a FULL sign. Count more than 5 and the counter keeps going. Stopping the gate is your logic's job.

**RES** clears \`.ACC\` and the status bits. It must be on a separate rung, or the counter would be held at zero while the rung is true. In Studio 5000 the CTU and CTD boxes are drawn separately but display the same Counter, Preset and Accum.`,
  tips: [
    "A counter can go negative. If a car is counted leaving that was never counted entering, ACC becomes -1. Add an attendant resync, a floor with a GRT compare, or a second sensor that checks the direction.",
    "Real car parks use two beams or loops at each gate to know the direction of travel. A single beam can't tell a car in from a car out.",
    "In Logix the CTU's \`.DN\` is set when \`ACC >= PRE\`. The CTD's \`.DN\` bit is also set when \`ACC >= PRE\`, so always read one counter's DN, never rely on a separate 'zero' bit.",
    "A counter keeps its value through power loss in the controller. A missing reset logic or a forgotten resync is how a lot shows FULL on Monday morning."
  ]
});
