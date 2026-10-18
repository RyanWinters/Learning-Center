LC.sim({
  id: "sim-conveyor", title: "Conveyor jam detection", level: 4, lesson: "plc-faults",
  brief: `A case-packing conveyor carries boxes past a photo-eye, \`Eye\`. While the belt moves, boxes pass the eye one after another: it is blocked for about half a second, then clear again, every couple of seconds.

A box that **wedges** at the eye keeps the beam blocked while the belt keeps pushing. That burns the belt and can start a fire. Your job:

1. Normal start/stop seal-in on \`Conveyor\`. Stop is normally closed.
2. If the belt is **running** and the eye stays blocked for **3 seconds**, latch \`JamAlarm\` and **stop the drive**.
3. The alarm stays until the operator clears the jam and presses \`Reset\`. It must not restart by itself.
4. A box sitting on the eye while the belt is **stopped** is not a jam.

Use the **Box wedged** switch to create a jam. The sensor behaves like the real thing: with the jam present the beam stays blocked, even after the belt stops.

\`\`\`ladder
XIC(Conveyor)XIC(Eye)TON(JamTmr,3000,0);
\`\`\``,
  tags: {
    Start: "BOOL", Stop: { type: "BOOL", desc: "NC stop: 1 at rest" }, Reset: "BOOL",
    Eye: { type: "BOOL", desc: "Photo-eye: 1 while a box blocks the beam" },
    Wedge: { type: "BOOL", desc: "Field simulation: box wedged at the eye" },
    JamTmr: { type: "TIMER", desc: "Beam blocked while running" },
    Conveyor: "BOOL", JamAlarm: { type: "BOOL", desc: "Latched jam fault" }
  },
  io: [
    { tag: "Start", widget: "pb", label: "Start" },
    { tag: "Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "Reset", widget: "pb", label: "Reset alarm" },
    { tag: "Wedge", widget: "toggle", label: "Box wedged at eye", states: ["Free", "Wedged"] },
    { tag: "Eye", widget: "lamp", label: "Photo-eye blocked", color: "warn" },
    { tag: "Conveyor", widget: "motor", label: "Conveyor drive" },
    { tag: "JamAlarm", widget: "lamp", label: "Jam alarm", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "OTL", "OTU", "TON", "BRANCH"],
  requires: ["TON"],
  process: {
    init: function (tags) { this.t = 0; tags.Eye = false; },
    step: function (tags, dt) {
      var run = !!tags.Conveyor;
      if (tags.Wedge) { tags.Eye = true; return; }
      if (!run) { tags.Eye = false; return; }
      this.t = (this.t + dt) % 2000;
      tags.Eye = this.t < 500;
    }
  },
  starter: "[XIC(Start),XIC(Conveyor)]XIC(Stop)OTE(Conveyor);",
  tests: [
    { name: "The belt starts and stops normally", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 500 }, { expect: { Conveyor: true } }, { press: { tag: "Stop", ms: 200 } }, { wait: 300 }, { expect: { Conveyor: false } }] },
    { name: "Boxes passing the eye normally do not trip the jam alarm", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 20000 }, { expect: { Conveyor: true, JamAlarm: false } }] },
    { name: "A wedged box stops the belt after 3 s and raises the alarm", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 1000 }, { set: { Wedge: true } }, { wait: 2000 }, { expect: { Conveyor: true, JamAlarm: false } }, { wait: 1500 }, { expect: { Conveyor: false, JamAlarm: true } }] },
    { name: "The alarm stays latched and the belt will not restart until reset", steps: [{ press: { tag: "Start", ms: 200 } }, { set: { Wedge: true } }, { wait: 4000 }, { set: { Wedge: false } }, { wait: 1000 }, { expect: { JamAlarm: true, Conveyor: false } }, { press: { tag: "Start", ms: 200 } }, { wait: 500 }, { expect: { Conveyor: false } }] },
    { name: "Reset clears the alarm and the belt restarts", steps: [{ press: { tag: "Start", ms: 200 } }, { set: { Wedge: true } }, { wait: 4000 }, { set: { Wedge: false } }, { press: { tag: "Reset", ms: 200 } }, { wait: 200 }, { expect: { JamAlarm: false } }, { press: { tag: "Start", ms: 200 } }, { wait: 6000 }, { expect: { Conveyor: true, JamAlarm: false } }] },
    { name: "A box on the eye while the belt is stopped is not a jam", steps: [{ set: { Wedge: true } }, { wait: 6000 }, { expect: { JamAlarm: false, Conveyor: false } }] }
  ],
  hints: [
    "A jam is a **condition that lasts**: the beam is blocked while the belt is running. Which instruction measures how long something has been true?",
    "Run a TON from \`XIC(Conveyor)XIC(Eye)\`. When its DN comes on, latch an alarm with OTL. Put \`XIO(JamAlarm)\` in the belt rung so the alarm stops the drive, and clear the alarm with OTU on a Reset rung.",
    "\`[XIC(Start),XIC(Conveyor)]XIC(Stop)XIO(JamAlarm)OTE(Conveyor);\` \`XIC(Conveyor)XIC(Eye)TON(JamTmr,3000,0);\` \`XIC(JamTmr.DN)OTL(JamAlarm);\` \`XIC(Reset)OTU(JamAlarm);\`"
  ],
  solution: "[XIC(Start),XIC(Conveyor)]XIC(Stop)XIO(JamAlarm)OTE(Conveyor);\nXIC(Conveyor)XIC(Eye)TON(JamTmr,3000,0);\nXIC(JamTmr.DN)OTL(JamAlarm);\nXIC(Reset)OTU(JamAlarm);",
  explain: `A jam detector is a timer on **a condition that should only be momentary**. A box takes about half a second to pass the eye. If the beam stays blocked three seconds while the belt runs, the box is not moving. The TON resets every time the eye clears, so normal traffic never accumulates the time.

Three details separate a working jam alarm from a bad one:

- **Qualify the timer with the belt running.** With the belt stopped, a box on the eye is normal (the operator may have stopped it there). Without \`XIC(Conveyor)\` the machine would alarm during every stop.
- **Latch the alarm.** If the alarm followed the eye, the belt would stop, the beam would clear (or not), and the alarm would drop out. Worse, the belt could restart on its own and drive straight back into the jam.
- **The alarm blocks the run rung.** Notice the circular dependency is safe: Conveyor turns off, which resets the timer, which does not matter because the alarm is already latched.

In a real project this is the pattern behind most 'run feedback' and 'travel time' faults: command, expected result, timer, latched fault, deliberate reset. A guard-door or E-stop would be hardwired through a safety relay or safety PLC, not just this logic.`,
  tips: [
    "Set the jam time from the real part spacing and belt speed, with margin. Slow, loaded belts need longer times than empty ones.",
    "Photo-eyes on dusty lines fail by staying blocked. A dirty lens looks exactly like a jam, so show the operator the eye state on the HMI to speed up diagnosis.",
    "Add the alarm text 'Jam at pack eye, clear box and press Reset'. A good alarm says what to do, not only what happened."
  ]
});
