LC.sim({
  id: "sim-latch", title: "OTL/OTU latch with reset", level: 1, lesson: "plc-sealin",
  brief: `A furnace has an over-temperature switch, \`TempSwitch\`, that closes (reads 1) when the temperature is too high. It may only trip for a moment before the temperature recovers, but the operators must **always find out** that it happened.

Latch an alarm:

- When \`TempSwitch\` trips, \`AlarmLatched\` turns on and **stays on**, even if the switch recovers.
- It is cleared only by pressing \`Reset\`, and **only when the temperature switch is back to normal**. Resetting while still tripped must not clear it.

Use the two latching instructions. **OTL** (output latch) sets its bit when its rung is true and does nothing when false. **OTU** (output unlatch) clears the bit when its rung is true. Between them the bit **holds its value**.

\`\`\`ladder
XIC(Trip)OTL(Alarm);
XIC(Reset)OTU(Alarm);
\`\`\``,
  tags: { TempSwitch: { type: "BOOL", desc: "1 when the furnace is too hot" }, Reset: "BOOL", AlarmLatched: "BOOL" },
  io: [
    { tag: "TempSwitch", widget: "sensor", label: "Over-temp switch", states: ["Normal", "TRIPPED"] },
    { tag: "Reset", widget: "pb", label: "Alarm reset" },
    { tag: "AlarmLatched", widget: "lamp", label: "Over-temp alarm", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "OTL", "OTU", "BRANCH"],
  requires: ["OTL", "OTU"],
  starter: "XIC(TempSwitch)OTE(AlarmLatched);",
  tests: [
    { name: "No alarm at start", steps: [{ scan: 3 }, { expect: { AlarmLatched: false } }] },
    { name: "A trip turns the alarm on", steps: [{ set: { TempSwitch: true } }, { scan: 2 }, { expect: { AlarmLatched: true } }] },
    { name: "The alarm stays on after the switch recovers", steps: [{ set: { TempSwitch: true } }, { scan: 2 }, { set: { TempSwitch: false } }, { wait: 500 }, { expect: { AlarmLatched: true } }] },
    { name: "Reset does not clear it while the switch is still tripped", steps: [{ set: { TempSwitch: true } }, { scan: 2 }, { press: { tag: "Reset", ms: 200 } }, { wait: 100 }, { expect: { AlarmLatched: true } }] },
    { name: "Reset clears it once the switch is normal", steps: [{ set: { TempSwitch: true } }, { scan: 2 }, { set: { TempSwitch: false } }, { scan: 2 }, { press: { tag: "Reset", ms: 200 } }, { wait: 100 }, { expect: { AlarmLatched: false } }, { wait: 500 }, { expect: { AlarmLatched: false } }] }
  ],
  hints: [
    "OTE would follow the switch and drop out when it recovers. You need an instruction that sets a bit and then leaves it alone. Which two instructions do that?",
    "Two rungs: one with \`OTL(AlarmLatched)\` driven by the trip, one with \`OTU(AlarmLatched)\` driven by Reset. The reset rung also needs a condition that the switch is back to normal.",
    "Rung 0: \`XIC(TempSwitch)OTL(AlarmLatched);\`  Rung 1: \`XIC(Reset)XIO(TempSwitch)OTU(AlarmLatched);\`"
  ],
  solution: "XIC(TempSwitch)OTL(AlarmLatched);\nXIC(Reset)XIO(TempSwitch)OTU(AlarmLatched);",
  explain: `\`OTL\` and \`OTU\` are **retentive** outputs. Unlike OTE, a false rung does nothing to them. The bit keeps its value until the opposite instruction changes it. That is what a latch is.

Rung 0 sets the bit every scan the switch is tripped. Rung 1 clears it when Reset is pressed **and** \`XIO(TempSwitch)\` says the switch is normal. If both rungs are true, the bit is set in rung 0 and then cleared in rung 1, and the last one executed wins, so the bit ends the scan **cleared**. Order your rungs on purpose.

The extra \`XIO(TempSwitch)\` is the operator-friendly rule: you cannot hide an active problem by pressing Reset. The alarm is acknowledged once the cause has gone.

This is a plain alarm latch, with no horn or acknowledge separate from reset. A proper alarm handler (ISA-18.2 style) has states for unacknowledged, acknowledged and returned-to-normal. You will see that pattern in later challenges.`,
  tips: [
    "Latches **survive** power cycles and Program-to-Run changes on a Logix controller. A latched \`Motor_Run\` can start equipment as soon as the processor goes to Run. Clear command bits that should not persist in your first-scan logic (using \`S:FS\`). This simulator's Reset clears everything, which a real controller does not.",
    "Prefer the seal-in circuit for motor control and OTL/OTU for **status you must remember**: alarms, faults, batch state. That way a power loss never restarts a machine on its own.",
    "Search the project for each latched tag with Cross Reference. A latch with no unlatch anywhere is a bug waiting to happen, and Studio makes that easy to see."
  ]
});
