LC.sim({
  id: "sim-ctu", title: "Part counter with reset", level: 2, lesson: "plc-counters",
  brief: `A packing line fills boxes with **5 parts**. A photo-eye, \`PartEye\`, is blocked by each part that passes. The line's \`Conveyor\` must run until 5 parts have gone by, then stop and light the \`BatchFull\` lamp. The operator presses \`ResetBtn\` after emptying the box to start the next batch.

Use a **CTU** (count up) named \`PartCount\` with a preset of **5**:

- a CTU counts each **false to true** change of its rung, not every scan, so a part that sits in the beam for a long time still counts once
- \`PartCount.ACC\` holds the count, \`PartCount.DN\` turns on when \`ACC >= PRE\`
- a counter does not reset by itself. Use **RES** on the counter tag.

\`\`\`ladder
XIC(PartEye)CTU(PartCount,5,0);
XIC(ResetBtn)RES(PartCount);
\`\`\`

Click the photo-eye to block and clear it again for each part.`,
  tags: { PartEye: { type: "BOOL", desc: "Photo-eye: 1 while a part blocks the beam" }, ResetBtn: "BOOL", PartCount: { type: "COUNTER", desc: "Parts in current box" }, Conveyor: "BOOL", BatchFull: "BOOL" },
  io: [
    { tag: "PartEye", widget: "sensor", label: "Part photo-eye", states: ["Clear", "Part"] },
    { tag: "ResetBtn", widget: "pb", label: "Reset batch" },
    { tag: "Conveyor", widget: "motor", label: "Conveyor" },
    { tag: "BatchFull", widget: "lamp", label: "Batch full", color: "warn" },
    { tag: "PartCount.ACC", widget: "value", label: "Parts counted" }
  ],
  palette: ["XIC", "XIO", "OTE", "CTU", "RES", "BRANCH"],
  requires: ["CTU", "RES"],
  starter: "XIC(PartEye)OTE(BatchFull);",
  tests: (function () {
    var part = [{ set: { PartEye: true } }, { scan: 2 }, { set: { PartEye: false } }, { scan: 2 }];
    var parts = function (n) { var a = []; for (var i = 0; i < n; i++) a = a.concat(part); return a; };
    return [
      { name: "The conveyor runs and no batch is flagged at start", steps: [{ scan: 3 }, { expect: { Conveyor: true, BatchFull: false, "PartCount.ACC": 0 } }] },
      { name: "Three parts are counted and the line keeps running", steps: parts(3).concat([{ expect: { "PartCount.ACC": 3, BatchFull: false, Conveyor: true } }]) },
      { name: "A part resting in the beam counts only once", steps: [{ set: { PartEye: true } }, { wait: 2000 }, { expect: { "PartCount.ACC": 1 } }] },
      { name: "Five parts stop the line and light the lamp", steps: parts(4).concat([{ expect: { BatchFull: false, Conveyor: true } }]).concat(parts(1)).concat([{ expect: { "PartCount.ACC": 5, BatchFull: true, Conveyor: false } }]) },
      { name: "Reset clears the count and restarts the line", steps: parts(5).concat([{ press: { tag: "ResetBtn", ms: 200 } }, { wait: 100 }, { expect: { "PartCount.ACC": 0, BatchFull: false, Conveyor: true } }]) },
      { name: "A second batch counts from zero again", steps: parts(5).concat([{ press: { tag: "ResetBtn", ms: 200 } }, { wait: 100 }]).concat(parts(2)).concat([{ expect: { "PartCount.ACC": 2, BatchFull: false } }]) }
    ];
  })(),
  hints: [
    "You need something that remembers a number between scans, and only adds one when a part arrives. Which instruction counts, and how do you set it back to zero?",
    "\`XIC(PartEye)CTU(PartCount,5,0)\` counts parts. Then use the counter's \`.DN\` bit for the lamp, and \`XIO(PartCount.DN)\` for the conveyor. A second rung with \`RES(PartCount)\` driven by the reset button clears it.",
    "\`XIC(PartEye)CTU(PartCount,5,0);\` \`XIC(PartCount.DN)OTE(BatchFull);\` \`XIO(PartCount.DN)OTE(Conveyor);\` \`XIC(ResetBtn)RES(PartCount);\`"
  ],
  solution: "XIC(PartEye)CTU(PartCount,5,0);\nXIC(PartCount.DN)OTE(BatchFull);\nXIO(PartCount.DN)OTE(Conveyor);\nXIC(ResetBtn)RES(PartCount);",
  explain: `A **CTU** remembers whether its rung was true on the previous scan, in its \`.CU\` bit. On each scan where the rung is true and \`.CU\` was off, it adds 1 to \`.ACC\`. That is the false-to-true edge, so you do **not** need a one-shot in front of a CTU. A part that blocks the beam for two seconds counts once.

Members you will use:

| Member | Meaning |
|---|---|
| \`.PRE\` | preset (here 5) |
| \`.ACC\` | the count |
| \`.DN\` | on while \`ACC >= PRE\` |
| \`.CU\` | the rung was true last scan (edge memory) |
| \`.OV\` | overflowed past 2,147,483,647 |

The counter **keeps counting past the preset**: a sixth part makes \`ACC\` 6 and DN stays on. DN is a comparison, not a stop. Stopping the line is your logic's job, which here is the XIO on \`.DN\`.

A counter never resets on its own. **RES** clears \`.ACC\`, \`.DN\` and the overflow bits. Counters hold their value when the rung is false and through a power cycle, so a missing reset is a classic reason a line "remembers" yesterday's batch.`,
  tips: [
    "Put the RES on a **separate rung** from the CTU. If you put them on the same rung and the rung is true, the counter is reset on every scan and never counts.",
    "A photo-eye with a vibrating part can flicker and double count. Use an on-delay of 20 to 50 ms on the input before the CTU, or use the PLC input's hardware filter setting.",
    "For up and down counts on one number, use CTU and CTD with the **same** counter tag, as in the car-park challenge. For counts that must survive a reboot, consider writing \`.ACC\` to a retentive DINT periodically.",
    "Production counters are usually fed from the plant's own sensors through a proven filter. Counting boxes with a single photo-eye is fine for teaching, but real lines count with two sensors to reject back-travel."
  ]
});
