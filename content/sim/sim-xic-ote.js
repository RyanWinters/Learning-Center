LC.sim({
  id: "sim-xic-ote", title: "First rung: button to lamp", level: 1, lesson: "plc-ladder-basics",
  brief: `A control panel has a **Lamp Test** pushbutton. While an operator holds it, the **Pilot Lamp** must light, so they can see the bulb still works.

Build one rung:

- the pushbutton \`LampTest\` is the condition (an **input**)
- the lamp \`PilotLamp\` is the result (an **output**)

Use the two instructions every ladder program is built from. **XIC** (examine if closed) is true while its bit is 1. **OTE** (output energize) sets its bit to match the rung every scan.

\`\`\`ladder
XIC(Sensor)OTE(Light);
\`\`\`

Press the button on the panel to try your rung while it runs. Then press **Check**.`,
  tags: { LampTest: { type: "BOOL", desc: "Lamp test pushbutton (input)" }, PilotLamp: { type: "BOOL", desc: "Panel pilot lamp (output)" } },
  io: [
    { tag: "LampTest", widget: "pb", label: "Lamp test" },
    { tag: "PilotLamp", widget: "lamp", label: "Pilot lamp" }
  ],
  palette: ["XIC", "OTE"],
  requires: ["XIC", "OTE"],
  starter: "; // Light PilotLamp while LampTest is held",
  tests: [
    { name: "The lamp is off when nobody presses the button", steps: [{ scan: 3 }, { expect: { PilotLamp: false } }] },
    { name: "The lamp lights while the button is held", steps: [{ set: { LampTest: true } }, { scan: 1 }, { expect: { PilotLamp: true } }, { scan: 5 }, { expect: { PilotLamp: true } }] },
    { name: "The lamp goes out when the button is released", steps: [{ set: { LampTest: true } }, { scan: 2 }, { set: { LampTest: false } }, { scan: 1 }, { expect: { PilotLamp: false } }] }
  ],
  hints: [
    "Every rung is an IF-THEN. The left side asks a question about an input, the right side acts on an output. Which instruction asks, and which acts?",
    "Put an XIC on the input tag \`LampTest\`, then an OTE on the output tag \`PilotLamp\`, both on the same rung. Tap the round + to add each one.",
    "In text mode the whole answer is one line: \`XIC(LampTest)OTE(PilotLamp);\`. In ladder mode, tap + once for XIC with tag LampTest, then tap the + after it for OTE with tag PilotLamp."
  ],
  solution: "XIC(LampTest)OTE(PilotLamp);",
  explain: `The rung says: **if** \`LampTest\` is 1, **then** make \`PilotLamp\` 1.

**XIC** is "examine if closed". It does not look at a physical contact. It looks at one bit in controller memory and passes power when the bit is 1, as though a switch were closed. The name comes from relay diagrams, where the program was drawn as a picture of the wiring.

**OTE** writes the state of the rung into its bit on **every scan**. When you release the button, the next scan sees a false rung and OTE writes 0, so the lamp turns off by itself. Nothing "remembers" the lamp was on. That is why OTE suits outputs that should follow a condition, and why latching needs different instructions, which come later.

In Studio 5000 you would see \`] [\` for the XIC and \`( )\` for the OTE, with the tag name above each. The tags would normally be aliases to real I/O points such as \`Local:1:I.Data.0\`, so the same rung drives the physical lamp.`,
  tips: [
    "Name tags for what they mean, not where they are wired: \`LampTest\`, not \`Input_0_3\`. Use an **alias tag** to connect the name to the I/O address once, and the rest of the program stays readable.",
    "Never write two OTEs to the same tag in a program. The one lower in the scan wins, and the upper one silently does nothing. Studio flags it in cross-reference, but not as an error.",
    "A contact only ever **reads** a bit. A coil only ever **writes** one. Keeping that picture clear is most of what ladder logic is."
  ]
});
