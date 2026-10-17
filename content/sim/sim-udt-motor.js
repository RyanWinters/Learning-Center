LC.sim({
  id: "sim-udt-motor", title: "Motor UDT with fault", level: 3, lesson: "plc-udt",
  brief: `A transfer pump is described by a user-defined type called **Motor**, and the tag is \`Pump1\`. Every member lives under the one name:

| Member | Meaning |
|---|---|
| \`Pump1.Start\`, \`Pump1.Stop\` | Pushbuttons (Stop is normally closed, reads 1 at rest) |
| \`Pump1.Reset\` | Fault reset button |
| \`Pump1.Run\` | Contactor command |
| \`Pump1.RunFb\` | Aux contact feedback: 1 when the contactor is really pulled in |
| \`Pump1.Fault\` | Latched fault |
| \`Pump1.FbTimer\` | A TIMER inside the UDT |

Write the logic:

1. Start/Stop seal-in on \`Pump1.Run\`. A fault **blocks** running.
2. If \`Run\` is commanded but \`RunFb\` stays off for **2 seconds**, latch \`Pump1.Fault\` (contactor failed to pull in, or seized motor).
3. \`Pump1.Reset\` clears the fault.

Use the \`Seized\` toggle to make the feedback fail. The fault must **stay** after the feedback problem goes away, until someone presses Reset.

\`\`\`ladder
XIC(Pump1.Run)XIO(Pump1.RunFb)TON(Pump1.FbTimer,2000,0);
\`\`\``,
  udts: { Motor: { Start: "BOOL", Stop: "BOOL", Reset: "BOOL", Run: "BOOL", RunFb: "BOOL", Fault: "BOOL", FbTimer: "TIMER" } },
  tags: { Pump1: { type: "Motor", desc: "Transfer pump 1" }, Seized: { type: "BOOL", desc: "Field simulation: feedback fails" } },
  io: [
    { tag: "Pump1.Start", widget: "pb", label: "Start" },
    { tag: "Pump1.Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "Pump1.Reset", widget: "pb", label: "Fault reset" },
    { tag: "Seized", widget: "toggle", label: "Simulate: contactor fails", states: ["OK", "Failed"] },
    { tag: "Pump1.Run", widget: "motor", label: "Pump 1" },
    { tag: "Pump1.Fault", widget: "lamp", label: "Pump 1 fault", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "OTL", "OTU", "TON", "BRANCH"],
  requires: ["TON"],
  process: {
    init: function (tags) { tags["Pump1.RunFb"] = false; },
    step: function (tags) { tags["Pump1.RunFb"] = !!tags["Pump1.Run"] && !tags["Seized"]; }
  },
  starter: "[XIC(Pump1.Start),XIC(Pump1.Run)]XIC(Pump1.Stop)OTE(Pump1.Run);",
  tests: [
    { name: "Pump is stopped at power-up", steps: [{ scan: 3 }, { expect: { "Pump1.Run": false, "Pump1.Fault": false } }] },
    { name: "Start runs the pump and it keeps running with feedback", steps: [{ press: { tag: "Pump1.Start", ms: 200 } }, { wait: 4000 }, { expect: { "Pump1.Run": true, "Pump1.Fault": false } }] },
    { name: "Stop halts the pump without a fault", steps: [{ press: { tag: "Pump1.Start", ms: 200 } }, { wait: 500 }, { press: { tag: "Pump1.Stop", ms: 200 } }, { wait: 3000 }, { expect: { "Pump1.Run": false, "Pump1.Fault": false } }] },
    { name: "No feedback for 2 s trips the fault and stops the pump", steps: [{ set: { Seized: true } }, { press: { tag: "Pump1.Start", ms: 200 } }, { wait: 1000 }, { expect: { "Pump1.Fault": false } }, { wait: 1500 }, { expect: { "Pump1.Fault": true, "Pump1.Run": false } }] },
    { name: "The fault stays latched and blocks a restart", steps: [{ set: { Seized: true } }, { press: { tag: "Pump1.Start", ms: 200 } }, { wait: 3000 }, { set: { Seized: false } }, { wait: 1000 }, { expect: { "Pump1.Fault": true } }, { press: { tag: "Pump1.Start", ms: 200 } }, { wait: 500 }, { expect: { "Pump1.Run": false } }] },
    { name: "Reset clears the fault and the pump can start again", steps: [{ set: { Seized: true } }, { press: { tag: "Pump1.Start", ms: 200 } }, { wait: 3000 }, { set: { Seized: false } }, { press: { tag: "Pump1.Reset", ms: 200 } }, { wait: 200 }, { expect: { "Pump1.Fault": false } }, { press: { tag: "Pump1.Start", ms: 200 } }, { wait: 3000 }, { expect: { "Pump1.Run": true, "Pump1.Fault": false } }] }
  ],
  hints: [
    "Treat \`Pump1.Run\` like the motor in the three-wire rung, with one extra condition: no active fault. Then think about what 'commanded to run but not confirmed' looks like in bits.",
    "Seal-in with \`XIO(Pump1.Fault)\` in series. Run the timer on \`XIC(Pump1.Run)XIO(Pump1.RunFb)\`, latch the fault with OTL from the timer's DN, and clear it with OTU from Reset.",
    "\`[XIC(Pump1.Start),XIC(Pump1.Run)]XIC(Pump1.Stop)XIO(Pump1.Fault)OTE(Pump1.Run);\` \`XIC(Pump1.Run)XIO(Pump1.RunFb)TON(Pump1.FbTimer,2000,0);\` \`XIC(Pump1.FbTimer.DN)OTL(Pump1.Fault);\` \`XIC(Pump1.Reset)OTU(Pump1.Fault);\`"
  ],
  solution: "[XIC(Pump1.Start),XIC(Pump1.Run)]XIC(Pump1.Stop)XIO(Pump1.Fault)OTE(Pump1.Run);\nXIC(Pump1.Run)XIO(Pump1.RunFb)TON(Pump1.FbTimer,2000,0);\nXIC(Pump1.FbTimer.DN)OTL(Pump1.Fault);\nXIC(Pump1.Reset)OTU(Pump1.Fault);",
  explain: `Every member is addressed as \`Pump1.Member\`, and a TIMER can sit inside the structure: \`Pump1.FbTimer\` has its own \`.PRE\`, \`.ACC\` and \`.DN\`. In Studio 5000 you create the UDT once in the Data Types folder, then create a tag of that type for each motor.

The logic is the standard **command versus feedback** check: if the PLC commands the output and the aux contact does not confirm within a time, something is wrong. The delay (2 s here) absorbs the contactor's pull-in time, so a normal start never faults.

The fault is **latched** (OTL) on purpose. If it followed the condition, then turning the pump off would clear the feedback error, the fault would vanish, and the operator would never know the pump tripped. Latching plus a deliberate Reset forces acknowledgment. Because the fault also blocks the seal-in, the pump cannot restart until the cause is looked at.

The payoff of the UDT comes with the second pump: you copy the four rungs and replace \`Pump1\` with \`Pump2\`. Later the same structure becomes an Add-On Instruction and an HMI faceplate, all bound to the same member names.`,
  tips: [
    "Group members by who writes them (Cmd, Sts, Cfg, Alm) in real UDTs. Here they are flat to keep the paths short.",
    "Pick the feedback timeout from the contactor and the motor's actual start time. Too short and every start faults, too long and a seized motor cooks.",
    "Never reset a fault automatically on a motor that failed to start. Auto-restarting a tripped motor is how coils and windings get burned."
  ]
});
