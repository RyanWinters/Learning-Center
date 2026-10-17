LC.sim({
  id: "sim-flasher", title: "Two-timer flasher", level: 2, lesson: "plc-timers",
  brief: `At a chemical tank farm the **alarm beacon** must **flash**: half a second on, half a second off, for as long as \`Alarm\` is active. When the alarm clears the beacon must go dark at once.

There is no flasher instruction in ladder logic. You make one from **two timers that reset each other**:

- \`OnTmr\` and \`OffTmr\` are both TONs with a **500 ms** preset.
- \`OnTmr\` times while the alarm is active and \`OffTmr\` has not finished.
- \`OffTmr\` starts when \`OnTmr\` is done.
- When \`OffTmr\` finishes, it breaks the first rung, which resets \`OnTmr\`, which in turn resets \`OffTmr\`. The cycle restarts.

The \`Beacon\` follows one of the timer bits. Work out which.

\`\`\`ladder
XIC(Alarm)XIO(OffTmr.DN)TON(OnTmr,500,0);
XIC(OnTmr.DN)TON(OffTmr,500,0);
\`\`\``,
  tags: { Alarm: "BOOL", OnTmr: { type: "TIMER", desc: "Beacon lit phase" }, OffTmr: { type: "TIMER", desc: "Beacon dark phase" }, Beacon: "BOOL" },
  io: [
    { tag: "Alarm", widget: "toggle", label: "Tank alarm active" },
    { tag: "Beacon", widget: "lamp", label: "Alarm beacon", color: "warn" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "BRANCH"],
  requires: ["TON"],
  starter: "XIC(Alarm)TON(OnTmr,500,0);\nXIC(OnTmr.DN)OTE(Beacon);",
  tests: [
    { name: "The beacon is dark when there is no alarm", steps: [{ wait: 3000 }, { expect: { Beacon: false } }] },
    { name: "The beacon starts dark, then lights after 0.5 s", steps: [{ set: { Alarm: true } }, { wait: 250 }, { expect: { Beacon: false } }, { wait: 500 }, { expect: { Beacon: true } }] },
    { name: "The beacon keeps flashing: on, off, on, off", steps: [{ set: { Alarm: true } }, { wait: 750 }, { expect: { Beacon: true } }, { wait: 500 }, { expect: { Beacon: false } }, { wait: 500 }, { expect: { Beacon: true } }, { wait: 500 }, { expect: { Beacon: false } }] },
    { name: "Clearing the alarm darkens the beacon at once", steps: [{ set: { Alarm: true } }, { wait: 750 }, { expect: { Beacon: true } }, { set: { Alarm: false } }, { scan: 2 }, { expect: { Beacon: false } }, { wait: 2000 }, { expect: { Beacon: false } }] },
    { name: "A new alarm starts a fresh flash cycle", steps: [{ set: { Alarm: true } }, { wait: 750 }, { set: { Alarm: false } }, { wait: 300 }, { set: { Alarm: true } }, { wait: 250 }, { expect: { Beacon: false } }, { wait: 500 }, { expect: { Beacon: true } }] }
  ],
  hints: [
    "One timer can only time once: after it is done, it stays done while its rung is true. To repeat, something has to take the rung away and let the timer reset. Use a second timer to do that.",
    "Rung 1: the alarm and a normally-closed \`OffTmr.DN\` enable \`OnTmr\`. Rung 2: \`OnTmr.DN\` enables \`OffTmr\`. When \`OffTmr\` finishes it opens rung 1, and the whole thing restarts.",
    "\`XIC(Alarm)XIO(OffTmr.DN)TON(OnTmr,500,0);\` \`XIC(OnTmr.DN)TON(OffTmr,500,0);\` \`XIC(OnTmr.DN)OTE(Beacon);\`"
  ],
  solution: "XIC(Alarm)XIO(OffTmr.DN)TON(OnTmr,500,0);\nXIC(OnTmr.DN)TON(OffTmr,500,0);\nXIC(OnTmr.DN)OTE(Beacon);",
  explain: `Follow one cycle at 50 ms per scan. \`OnTmr\` times for 500 ms with the beacon **dark**. When it is done, \`OnTmr.DN\` turns on: the beacon lights and \`OffTmr\` begins timing. After another 500 ms \`OffTmr.DN\` goes on, and the \`XIO(OffTmr.DN)\` in rung 1 opens. A TON whose rung goes false clears **everything**, so \`OnTmr\` resets and \`OnTmr.DN\` drops. That removes the enable from \`OffTmr\`, so it resets too. Next scan, both are clear and the cycle starts over.

The beacon is lit exactly while \`OnTmr.DN\` is on. Because it reads the done bit of the first timer, it is **dark** for the first half of the cycle and lit for the second. If you would like it to light first, drive the beacon with \`XIC(Alarm)XIO(OnTmr.DN)\` instead.

The alarm is only in rung 1. When it drops, rung 1 clears \`OnTmr\`, rung 2 sees \`OnTmr.DN\` false in the same scan and clears \`OffTmr\`, and the beacon goes out immediately. Rung order matters: the output scan sees the result of one pass top to bottom.

In Studio 5000 you will often build this only once. Many projects keep one shared free-running pulse (a single flasher rung, or an Add-On Instruction) that every beacon and lamp reads, and some beacons flash themselves. The two-timer circuit is still the basic pattern behind every blinker, pulse train and cyclic-timer rung you will meet.`,
  tips: [
    "Total cycle time is the two presets plus about one scan, because the reset happens a scan late. At 50 ms scans, a nominal 1 s flasher runs at roughly 1.05 s.",
    "Do not use a flasher for anything safety-critical to be judged by eye. Use a purpose-built flashing beacon or a safety-rated light.",
    "Keep the presets in tags if operators want different flash rates. Remember that a TON preset must be set before the rung is true, and a change to a running timer does not restart it.",
    "Use a different timer tag for each timer. Using one tag twice makes both instructions fight over the same ACC."
  ]
});
