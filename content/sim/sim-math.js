LC.sim({
  id: "sim-math", title: "Totalizer math", level: 3, lesson: "plc-compare-math",
  brief: `A tanker loading arm has a flow meter that sends **one pulse for every 10 gallons** on \`FlowPulse\`. The operator display must show the **gallons loaded** in a DINT, \`Total\`, and the operator clears it with \`ClearTotal\` before the next truck.

Build the totalizer:

- Each pulse adds **10** to \`Total\` using **ADD**.
- A pulse that lasts a long time (the meter's output is slow) must still add only **one** 10. Math instructions run **every scan** while their rung is true, so you need to act once per pulse.
- \`ClearTotal\` sets \`Total\` back to zero.

\`\`\`ladder
XIC(FlowPulse)ADD(Total,10,Total);
XIC(ClearTotal)CLR(Total);
\`\`\`
That starter is close, but think about how many times the ADD runs while the pulse is held on.`,
  tags: { FlowPulse: { type: "BOOL", desc: "1 while the meter pulse is on (10 gal per pulse)" }, ClearTotal: "BOOL", PulseOS: { type: "BOOL", desc: "One-shot storage bit" }, Total: { type: "DINT", desc: "Gallons loaded" } },
  io: [
    { tag: "FlowPulse", widget: "pb", label: "Flow meter pulse (10 gal)" },
    { tag: "ClearTotal", widget: "pb", label: "Clear total" },
    { tag: "Total", widget: "value", label: "Gallons loaded", unit: "gal" }
  ],
  palette: ["XIC", "XIO", "OTE", "ONS", "ADD", "CLR", "MOV", "BRANCH"],
  requires: ["ADD"],
  starter: "XIC(FlowPulse)ADD(Total,10,Total);",
  tests: [
    { name: "The total starts at zero", steps: [{ scan: 3 }, { expect: { Total: 0 } }] },
    { name: "Each pulse adds 10 gallons", steps: [{ press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { expect: { Total: 10 } }, { press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { expect: { Total: 30 } }] },
    { name: "A long pulse still adds only 10", steps: [{ set: { FlowPulse: true } }, { wait: 2000 }, { expect: { Total: 10 } }, { set: { FlowPulse: false } }, { wait: 200 }, { expect: { Total: 10 } }] },
    { name: "Clear sets the total to zero", steps: [{ press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { expect: { Total: 20 } }, { press: { tag: "ClearTotal", ms: 200 } }, { wait: 100 }, { expect: { Total: 0 } }] },
    { name: "Loading starts again from zero after a clear", steps: [{ press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { press: { tag: "ClearTotal", ms: 200 } }, { wait: 100 }, { press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { press: { tag: "FlowPulse", ms: 200 } }, { wait: 100 }, { expect: { Total: 20 } }] }
  ],
  hints: [
    "Test it with a long pulse. A math instruction does its sum on every scan that its rung is true. How many scans does a one-second pulse last, and how can you make the rung true for exactly one of them?",
    "Put a one-shot in front of the ADD: \`XIC(FlowPulse)ONS(PulseOS)ADD(Total,10,Total)\`. ONS needs its own BOOL storage bit. Clear the total with a second rung, \`XIC(ClearTotal)CLR(Total)\`.",
    "\`XIC(FlowPulse)ONS(PulseOS)ADD(Total,10,Total);\` \`XIC(ClearTotal)CLR(Total);\`"
  ],
  solution: "XIC(FlowPulse)ONS(PulseOS)ADD(Total,10,Total);\nXIC(ClearTotal)CLR(Total);",
  explain: `Logix has no "on change" mode for math. Like an OTE, an **ADD** executes each scan its rung is true. With a 50 ms scan, a pulse lasting a second would add 10 about twenty times, and the total would be nonsense. That is the number-one totalizer bug, and the starter shows it.

The **ONS** (one-shot) passes power for one scan on each false-to-true change of its rung and stores the previous state in a bit you give it, here \`PulseOS\`. Placed between the contact and the ADD, it makes the sum happen exactly once per pulse. Each ONS needs its **own** storage bit. Don't share it.

\`ADD(Total,10,Total)\` reads Source A and Source B and writes the result to the Destination. Using the same tag as source and destination is how you accumulate. \`CLR(Total)\` zeroes the destination and also runs each scan its rung is true, which is harmless because zero is zero every time.

**DINT** is a 32-bit integer. At 10 gallons per pulse, a DINT counts to 2,147,483,647 gallons before it wraps without warning, which is more than a tanker will ever load. Maths done on integers has no rounding error, which is why a counted total belongs in a DINT and not a REAL.`,
  tips: [
    "A totalizer that must survive power-down needs a retentive tag. Tags in Logix keep their value across power cycles unless your logic clears them, but check with your program's first-scan routine.",
    "Whenever you see ADD, SUB, MUL or MOV in a rung, ask: 'does this run once, or on every scan?' If you need once, use ONS, OSR, or a timer pulse.",
    "Accumulating a flow rate in a REAL every scan loses small amounts once the total gets large (a REAL has about 7 significant digits). For long-running totals use a DINT of counted pulses, or two tags (a large DINT plus a REAL remainder).",
    "Keep a billing total separate from a display total. The operator's CLEAR must never touch the legal custody total."
  ]
});
