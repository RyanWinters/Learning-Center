LC.sim({
  id: "sim-xio", title: "Normally-closed logic and XIO", level: 1, lesson: "plc-ladder-basics",
  brief: `Field devices come in two flavors, and the PLC cannot tell which one it has. It only sees a 1 or a 0.

- A **normally open (NO)** device reads 0 at rest and 1 when activated.
- A **normally closed (NC)** device reads **1 at rest** and 0 when activated, or when its wire breaks.

Stop buttons are wired NC on purpose. If a wire falls off, the input goes to 0 and the machine stops. The cost is that, in the PLC, "Stop is not pressed" is the bit being **1**.

Two jobs:

1. The \`Fan\` runs while the \`RunSwitch\` is on **and** the stop button is **not** pressed. The Stop button is NC: look at its tag in the panel and notice it reads 1 at rest.
2. A door sensor \`DoorClosed\` reads 1 when the door is shut. Turn on \`DoorLamp\` whenever the door is **not** closed.

You have **XIC** (true when the bit is 1) and **XIO** (examine if open, true when the bit is **0**). Choose the right one for each contact by asking what bit value you want to see.

\`\`\`ladder
XIC(Switch)XIO(Fault)OTE(Run);
\`\`\``,
  tags: { RunSwitch: "BOOL", Stop: { type: "BOOL", desc: "NC stop button: 1 at rest, 0 when pressed" }, DoorClosed: { type: "BOOL", desc: "1 when the door is shut" }, Fan: "BOOL", DoorLamp: "BOOL" },
  io: [
    { tag: "RunSwitch", widget: "toggle", label: "Run switch" },
    { tag: "Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "DoorClosed", widget: "sensor", label: "Door closed sensor", init: true, states: ["Open", "Shut"] },
    { tag: "Fan", widget: "motor", label: "Fan" },
    { tag: "DoorLamp", widget: "lamp", label: "Door open lamp", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "BRANCH"],
  requires: ["XIO"],
  starter: "XIO(Stop)XIC(RunSwitch)OTE(Fan);\nXIC(DoorClosed)OTE(DoorLamp);",
  tests: [
    { name: "Everything is quiet at start", steps: [{ scan: 3 }, { expect: { Fan: false, DoorLamp: false } }] },
    { name: "The fan runs when the switch is on", steps: [{ set: { RunSwitch: true } }, { scan: 2 }, { expect: { Fan: true } }] },
    { name: "The fan stays off with the switch off", steps: [{ scan: 5 }, { expect: { Fan: false } }] },
    { name: "Pressing Stop stops the fan, releasing lets it run again", steps: [{ set: { RunSwitch: true } }, { scan: 2 }, { expect: { Fan: true } }, { set: { Stop: false } }, { scan: 2 }, { expect: { Fan: false } }, { set: { Stop: true } }, { scan: 2 }, { expect: { Fan: true } }] },
    { name: "Opening the door lights the lamp", steps: [{ set: { DoorClosed: false } }, { scan: 2 }, { expect: { DoorLamp: true } }, { set: { DoorClosed: true } }, { scan: 2 }, { expect: { DoorLamp: false } }] }
  ],
  hints: [
    "Ignore the names for a moment and ask what the bit is. For the fan, which value of \`Stop\` means the fan is allowed to run? For the lamp, which value of \`DoorClosed\` means there is a problem?",
    "The NC stop reads **1** when healthy, so the fan rung needs \`Stop\` to be 1: that is an XIC. The door sensor reads 1 when shut, and you want the lamp when it is **0**: that is an XIO.",
    "Rung 0: \`XIC(RunSwitch)XIC(Stop)OTE(Fan);\`  Rung 1: \`XIO(DoorClosed)OTE(DoorLamp);\`  Notice the starter had them the wrong way round."
  ],
  solution: "XIC(RunSwitch)XIC(Stop)OTE(Fan);\nXIO(DoorClosed)OTE(DoorLamp);",
  explain: `The rule that removes all the confusion: **XIC passes power when the bit is 1, XIO passes power when the bit is 0.** Neither instruction knows anything about wiring.

- \`XIC(Stop)\` looks wrong to newcomers, because it reads like "if Stop is pressed". It means "if the Stop **input bit** is 1", and an NC button's bit is 1 when it is *not* pressed. So the rung is true when the circuit is healthy. Pressing the button, or breaking the wire, makes the bit 0 and drops the rung. That is fail-safe behavior.
- \`XIO(DoorClosed)\` is true when the door-closed bit is 0, which is when the door is open.

If the Stop button had been wired NO, you would need \`XIO(Stop)\`, and a broken wire would leave the machine running with no way to stop it. That is why plants standardize on NC for stops, E-stops, overloads and most safety-related inputs.

You will meet the same trap in the next challenge, where the Stop button breaks the seal.`,
  tips: [
    "Name the tag for the **healthy** state when the field device is NC: \`Stop_OK\`, \`Guard_Closed\`, \`Overload_OK\`. Then \`XIC(Stop_OK)\` reads naturally and nobody inverts it by mistake.",
    "When troubleshooting online in Studio 5000, a highlighted (green) contact means the **bit is true**, not that the physical device is pressed. A lit XIC on a stop button is the normal, healthy picture.",
    "Never solve a wiring convention with a fudge in logic. If a tag is the opposite of what its name says, rename it or fix the wiring, and write it down in the tag description."
  ]
});
