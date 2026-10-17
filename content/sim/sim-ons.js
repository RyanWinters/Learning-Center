LC.sim({
  id: "sim-ons", title: "One-shot push-on/push-off", level: 2, lesson: "plc-oneshots",
  brief: `A sump has one pushbutton, \`PB_Pump\`. Each **press** should flip the \`Pump\`: first press turns it on, second turns it off, third on again, and so on.

The trap is the scan. A press lasts maybe a quarter of a second, which is **five scans or more** at 50 ms. If your logic flips the pump on every scan the button is down, the pump chatters and ends up on or off at random.

You need a **one-shot**: an instruction that is true for exactly **one scan** when its input goes from false to true. In Logix that is **ONS**. It stores the previous state of the rung in a storage bit you provide.

\`\`\`ladder
XIC(Button)ONS(Button_OS)OTE(Pulse);
\`\`\`

Make the pump toggle once per press, even if the button is held for a long time. New tags such as \`PB_OS\` are created for you when you use them.`,
  tags: { PB_Pump: "BOOL", Pump: "BOOL" },
  io: [
    { tag: "PB_Pump", widget: "pb", label: "Pump button" },
    { tag: "Pump", widget: "motor", label: "Sump pump" }
  ],
  palette: ["XIC", "XIO", "OTE", "ONS", "BRANCH"],
  requires: ["ONS"],
  starter: "XIC(PB_Pump)OTE(Pump);",
  tests: [
    { name: "The pump is off at start", steps: [{ scan: 3 }, { expect: { Pump: false } }] },
    { name: "One press turns the pump on", steps: [{ press: { tag: "PB_Pump", ms: 250 } }, { wait: 200 }, { expect: { Pump: true } }] },
    { name: "A second press turns it off", steps: [{ press: { tag: "PB_Pump", ms: 250 } }, { wait: 200 }, { press: { tag: "PB_Pump", ms: 250 } }, { wait: 200 }, { expect: { Pump: false } }] },
    { name: "A third press turns it on again", steps: [{ press: { tag: "PB_Pump", ms: 250 } }, { wait: 150 }, { press: { tag: "PB_Pump", ms: 250 } }, { wait: 150 }, { press: { tag: "PB_Pump", ms: 250 } }, { wait: 150 }, { expect: { Pump: true } }] },
    { name: "Holding the button toggles only once", steps: [{ set: { PB_Pump: true } }, { scan: 1 }, { expect: { Pump: true } }, { scan: 1 }, { expect: { Pump: true } }, { scan: 1 }, { expect: { Pump: true } }, { scan: 6 }, { expect: { Pump: true } }, { set: { PB_Pump: false } }, { scan: 3 }, { expect: { Pump: true } }] }
  ],
  hints: [
    "While the button is down, XIC(PB_Pump) is true for many scans in a row. You need something that is true for just one of them.",
    "Make a pulse bit: \`XIC(PB_Pump)ONS(PB_OS)OTE(Pulse);\` is true for one scan per press. Then flip \`Pump\` when \`Pulse\` is true. Careful: if one rung turns the pump on and a later rung turns it off in the same scan, it cancels itself.",
    "A neat toggle is an exclusive-or. Rung 1: \`[XIC(Pulse)XIO(Pump),XIC(Pump)XIO(Pulse)]OTE(Pump);\` Both legs read the **old** Pump, and OTE writes the new value once, at the end."
  ],
  solution: "XIC(PB_Pump)ONS(PB_OS)OTE(Pulse);\n[XIC(Pulse)XIO(Pump),XIC(Pump)XIO(Pulse)]OTE(Pump);",
  explain: `**ONS** works like this: when its rung-in condition is true and its storage bit is 0, it passes power for this scan. Either way it then copies the rung-in state into the storage bit. So the output is true on the first scan of a press and false on every later scan, until the button is released and pressed again.

\`Pulse\` is therefore a one-scan bit. The second rung turns it into a toggle:

- leg 1: pulse arrives while the pump is off, so turn it on
- leg 2: the pump is on and there is no pulse, so keep it on

When the next pulse arrives with the pump on, neither leg is true, and the pump turns off.

**Why not OTL/OTU?** A common first attempt is one rung that latches the pump when it is off and another that unlatches it when it is on, both driven by the pulse. They fight. In the same scan the first rung sets the bit and the second sees it set and clears it again. The logic does what the scan order says, which is not what you meant. Computing from the old value and writing once avoids it.

Logix also has **OSR** and **OSF**, which give you a separate output bit as well as a storage bit. ONS is the compact form for use in the middle of a rung.`,
  tips: [
    "Each ONS needs its **own** storage bit. Sharing one storage bit between two one-shots makes them steal each other's edges. Give each a descriptive name such as \`PB_Pump_OS\`.",
    "ONS inside a rung that is also reached by other conditions can miss edges: the storage bit only updates when the scan reaches it. Put the ONS right after the contact whose edge you care about.",
    "In real plants the same single-button pattern is used for local/remote toggles, page-up buttons on HMIs and 'next step' commands. HMI pushbuttons should usually write a momentary bit, and the PLC does the edge detection, so a lost network packet cannot leave a bit stuck."
  ]
});
