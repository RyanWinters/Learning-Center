LC.sim({
  id: "sim-tof", title: "Off-delay fan run-on", level: 2, lesson: "plc-timers",
  brief: `An electric heater glows hot after it is switched off. Its cooling \`Fan\` must keep running for **5 seconds after the heater turns off**, then stop. If the heater comes back on during that time, the fan just stays on.

- \`HeaterSwitch\` is the operator's switch.
- \`Heater\` follows the switch.
- \`Fan\` runs while the heater is on, and for 5 s afterwards.

A **TON** delays turning something **on**. For delaying turning something **off** you want its mirror image, the **TOF** (timer off delay). Its done bit goes true the moment the rung is true, and drops only after the rung has been false for the preset time.

Use a \`TOF\` named \`FanRunOn\` with a 5000 ms preset.

\`\`\`ladder
XIC(Heater)TOF(FanRunOn,5000,0);
\`\`\``,
  tags: { HeaterSwitch: "BOOL", Heater: "BOOL", FanRunOn: { type: "TIMER", desc: "Fan run-on delay" }, Fan: "BOOL" },
  io: [
    { tag: "HeaterSwitch", widget: "toggle", label: "Heater switch" },
    { tag: "Heater", widget: "lamp", label: "Heater", color: "warn" },
    { tag: "Fan", widget: "motor", label: "Cooling fan" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "TOF", "BRANCH"],
  requires: ["TOF"],
  starter: "XIC(HeaterSwitch)OTE(Heater);\nXIC(Heater)OTE(Fan);",
  tests: [
    { name: "Everything is off at start", steps: [{ scan: 3 }, { expect: { Heater: false, Fan: false } }] },
    { name: "Switching the heater on runs the fan at once", steps: [{ set: { HeaterSwitch: true } }, { scan: 2 }, { expect: { Heater: true, Fan: true } }] },
    { name: "The fan runs on after the heater goes off", steps: [{ set: { HeaterSwitch: true } }, { scan: 2 }, { set: { HeaterSwitch: false } }, { scan: 2 }, { expect: { Heater: false, Fan: true } }, { wait: 2000 }, { expect: { Fan: true } }, { wait: 2000 }, { expect: { Fan: true } }] },
    { name: "The fan stops after 5 seconds", steps: [{ set: { HeaterSwitch: true } }, { scan: 2 }, { set: { HeaterSwitch: false } }, { wait: 5300 }, { expect: { Fan: false } }] },
    { name: "Turning the heater back on during run-on keeps the fan running", steps: [{ set: { HeaterSwitch: true } }, { scan: 2 }, { set: { HeaterSwitch: false } }, { wait: 3000 }, { set: { HeaterSwitch: true } }, { wait: 4000 }, { expect: { Fan: true, Heater: true } }] },
    { name: "A fresh 5 seconds after the second shutdown", steps: [{ set: { HeaterSwitch: true } }, { scan: 2 }, { set: { HeaterSwitch: false } }, { wait: 3000 }, { set: { HeaterSwitch: true } }, { scan: 2 }, { set: { HeaterSwitch: false } }, { wait: 4000 }, { expect: { Fan: true } }, { wait: 1500 }, { expect: { Fan: false } }] }
  ],
  hints: [
    "The fan must outlast the heater by a fixed time. A timer can hold something true after its input goes away, but only one type does that. Is it the on-delay or the off-delay?",
    "Time the **heater**, not the fan: \`XIC(Heater)TOF(FanRunOn,5000,0)\`. A TOF's \`.DN\` is true while the rung is true, and then stays true while it times out. Drive the fan from that bit.",
    "Rung 1: \`XIC(Heater)TOF(FanRunOn,5000,0);\`  Rung 2: \`XIC(FanRunOn.DN)OTE(Fan);\` The fan no longer needs a direct link to the heater."
  ],
  solution: "XIC(HeaterSwitch)OTE(Heater);\nXIC(Heater)TOF(FanRunOn,5000,0);\nXIC(FanRunOn.DN)OTE(Fan);",
  explain: `A **TOF** times while its rung is **false**.

- Rung true: \`.EN\` and \`.DN\` are on, \`.ACC\` is held at 0.
- Rung goes false: \`.DN\` stays on, \`.TT\` turns on, and \`.ACC\` starts counting up.
- When \`.ACC\` reaches \`.PRE\`: \`.DN\` and \`.TT\` turn off.
- If the rung goes true again before then, \`.ACC\` resets to 0 and the timing starts over later.

So \`FanRunOn.DN\` is exactly "the heater is on, or went off less than 5 seconds ago", which is the condition for the fan.

Compare with the TON: a TON's done bit rises after a delay, a TOF's done bit falls after a delay. Same five members, opposite sense. You can build an off-delay from a TON and some seal-in logic, but TOF says what you mean with one instruction.

In the run-on test where the heater switches back on at 3 s, notice that the fan never blinked. The TOF just reset, so the full 5 seconds start again next time.`,
  tips: [
    "On power-up, or after a Program-to-Run change, a TOF starts with \`.DN\` off. If you need the output on at power-up, reset the timer deliberately in your first-scan logic.",
    "Run-on timers appear everywhere: fan and pump overrun after a heater or motor stops, a lube pump after a gearbox stops, a hallway light, a VFD that must coast before the brake sets. Ask the manufacturer for the minimum run-on time, then add margin.",
    "A TOF that is driven by a field input needs a noise filter. A bounce on the input will restart the timing each time, which is usually harmless for an off-delay but can chatter an on-delay."
  ]
});
