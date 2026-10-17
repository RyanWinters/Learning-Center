LC.sim({
  id: "sim-alarm-deadband", title: "High alarm with delay and deadband", level: 3, lesson: "plc-analog",
  brief: `A wet well fills with wastewater and the level wobbles with waves and pump surges. The operator sees \`HiAlarm\` on the HMI, and right now it flickers on and off every few seconds, so the operators have started ignoring it.

Make it behave like a real alarm:

- **On-delay:** the level must stay at or above **80%** for **3 seconds** before \`HiAlarm\` turns on, so a short wave crest does not alarm.
- **Deadband:** once alarmed, the alarm stays on until the level falls below **75%** (a 5% deadband). A level that hovers at 79-81% must not toggle it.

Use a \`TON\` named \`HiDelay\` for the on-delay. The alarm bit must hold itself between 75% and 80%.

\`\`\`ladder
GEQ(Level,80)TON(HiDelay,3000,0);
\`\`\`

Slide the level up past 80, wait, then wiggle it around the limit.`,
  tags: {
    Level: { type: "REAL", desc: "Wet well level, percent" },
    HiDelay: { type: "TIMER", desc: "3 s on-delay before the alarm" },
    HiAlarm: { type: "BOOL", desc: "High level alarm" }
  },
  io: [
    { tag: "Level", widget: "slider", label: "Level", min: 0, max: 100, step: 0.5, unit: "%", init: 50 },
    { tag: "HiAlarm", widget: "lamp", label: "High level alarm", color: "alarm" },
    { tag: "HiDelay.ACC", widget: "value", label: "Delay timer (ms)" }
  ],
  palette: ["XIC", "XIO", "OTE", "OTL", "OTU", "TON", "GEQ", "GRT", "LES", "BRANCH"],
  requires: ["TON"],
  starter: "GEQ(Level,80)OTE(HiAlarm);",
  tests: [
    { name: "No alarm at a normal level", steps: [{ set: { Level: 50 } }, { wait: 5000 }, { expect: { HiAlarm: false } }] },
    { name: "A short crest above 80% does not alarm", steps: [{ set: { Level: 85 } }, { wait: 1500 }, { expect: { HiAlarm: false } }, { set: { Level: 70 } }, { wait: 4000 }, { expect: { HiAlarm: false } }] },
    { name: "A sustained high level alarms after the delay", steps: [{ set: { Level: 85 } }, { wait: 2000 }, { expect: { HiAlarm: false } }, { wait: 1500 }, { expect: { HiAlarm: true } }] },
    { name: "The alarm stays on inside the deadband (75-80%)", steps: [{ set: { Level: 85 } }, { wait: 3500 }, { expect: { HiAlarm: true } }, { set: { Level: 77 } }, { wait: 2000 }, { expect: { HiAlarm: true } }] },
    { name: "The alarm clears below 75%", steps: [{ set: { Level: 85 } }, { wait: 3500 }, { set: { Level: 77 } }, { wait: 1000 }, { set: { Level: 74 } }, { wait: 500 }, { expect: { HiAlarm: false } }] },
    { name: "Hovering around 80% does not chatter", steps: [{ set: { Level: 81 } }, { wait: 3500 }, { expect: { HiAlarm: true } }, { set: { Level: 79 } }, { wait: 300 }, { expect: { HiAlarm: true } }, { set: { Level: 81 } }, { wait: 300 }, { expect: { HiAlarm: true } }, { set: { Level: 79.5 } }, { wait: 3000 }, { expect: { HiAlarm: true } }] }
  ],
  hints: [
    "Two separate problems: the alarm should wait before turning on (a timer), and it should hold itself on until the level drops further than where it came on (a seal-in with a lower compare).",
    "\`GEQ(Level,80)TON(HiDelay,3000,0)\` supplies the delay. For the alarm rung, branch \`XIC(HiDelay.DN)\` around with \`XIC(HiAlarm)\` and follow with a compare against **75**, then \`OTE(HiAlarm)\`.",
    "\`GEQ(Level,80)TON(HiDelay,3000,0);\` \`[XIC(HiDelay.DN),XIC(HiAlarm)]GEQ(Level,75)OTE(HiAlarm);\`"
  ],
  solution: "GEQ(Level,80)TON(HiDelay,3000,0);\n[XIC(HiDelay.DN),XIC(HiAlarm)]GEQ(Level,75)OTE(HiAlarm);",
  explain: `The starter has the classic alarm bug: it compares and energizes in one step, so the alarm follows the level exactly. A level that sits at 80% flips it on and off with every wave.

The fix has two parts that solve different problems:

- **On-delay (TON).** \`GEQ(Level,80)TON(HiDelay,3000,0)\` only reaches \`.DN\` after 3 seconds of continuous high level. A 1.5 second crest never gets there, because the timer resets to zero when the compare goes false.
- **Deadband (seal-in with a lower threshold).** The alarm rung is a seal-in, like a motor start/stop. The set path is the timer's \`.DN\`. The hold path is the alarm's own contact, but it is only allowed while \`Level >= 75\`. Between 75 and 80 the timer has already dropped out, yet the alarm holds. Below 75 the compare fails, the seal breaks, and the alarm clears.

In Studio 5000 you would often reach for the built-in **ALMA** (analog alarm) instruction, which has HH/H/L/LL limits, a deadband and an on-delay as parameters, plus acknowledge handling. Knowing the hand-built version tells you what ALMA is doing underneath and lets you tune alarms on platforms or legacy code that lack it.`,
  tips: [
    "Pick the deadband from the noise on the signal, not from a guess. A common start is 2-5% of span, or a few times the peak-to-peak noise you see on a trend.",
    "Put the delay on the alarm **set** only. A delay on the clear as well makes alarms feel sticky and can hide a quick recovery from the operator.",
    "Alarm setpoints belong in tags (or a UDT), not literals buried in rungs, so operators and engineers can adjust them from the HMI. Literals are used here only to keep the challenge short."
  ]
});
