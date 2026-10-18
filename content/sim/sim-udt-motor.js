LC.sim({
  id: "sim-udt-motor", title: "Motor UDT with fault", level: 3, lesson: "plc-udt",
  brief: `Motor **M101** (a transfer pump) is described by the house user-defined type **UDT_Motor**. Its members are grouped by who owns them, as nested structures:

| Path | Meaning |
|---|---|
| \`M101.Cmd.Start\`, \`M101.Cmd.Stop\` | Pushbuttons (Stop is normally closed, reads 1 at rest). In a plant the HMI writes \`Cmd\`; the panel buttons stand in for it here |
| \`M101.Cmd.Reset\` | Fault reset |
| \`M101.Sts.Running\` | Aux contact feedback: 1 when the contactor is really pulled in |
| \`M101.Sts.Fault\` | Summary fault status, written by the PLC |
| \`M101.Cfg.StartDelay\` | Configuration: how long (ms) feedback may be missing after a run command. Set to 2000 |
| \`M101.Alm.FailToStart\` | Latched alarm: commanded to run but never confirmed |

Two plain tags sit beside it: \`M101_RunCmd\` (the internal run command, a BOOL) and \`M101_FbTmr\` (a TIMER). The pump's contactor output follows \`M101_RunCmd\`.

Write the logic:

1. Start/Stop seal-in on \`M101_RunCmd\`. A fail-to-start alarm **blocks** running.
2. If \`M101_RunCmd\` is on but \`M101.Sts.Running\` stays off for the **StartDelay** time, latch \`M101.Alm.FailToStart\`. Use the config member as the timer **preset** (a tag can be the preset).
3. \`M101.Sts.Fault\` shows the alarm. \`M101.Cmd.Reset\` clears it.

Use the \`Seized\` toggle to make the feedback fail. The alarm must **stay** after the feedback problem goes away, until someone presses Reset.

\`\`\`ladder
XIC(M101_RunCmd)XIO(M101.Sts.Running)TON(M101_FbTmr,M101.Cfg.StartDelay,0);
\`\`\``,
  udts: {
    UDT_MotorCmd: { Start: "BOOL", Stop: "BOOL", Reset: "BOOL" },
    UDT_MotorSts: { Running: "BOOL", Ready: "BOOL", Fault: "BOOL", Auto: "BOOL", Speed: "REAL", RunHours: "REAL" },
    UDT_MotorCfg: { StartDelay: "DINT", SpeedHigh: "REAL" },
    UDT_MotorAlm: { FailToStart: "BOOL", Overload: "BOOL", CommLoss: "BOOL" },
    UDT_Motor: { Cmd: "UDT_MotorCmd", Sts: "UDT_MotorSts", Cfg: "UDT_MotorCfg", Alm: "UDT_MotorAlm" }
  },
  tags: { M101: { type: "UDT_Motor", desc: "Transfer pump 101" }, M101_RunCmd: { type: "BOOL", desc: "Internal run command (seal-in bit)" }, M101_FbTmr: { type: "TIMER", desc: "Feedback timer" }, Seized: { type: "BOOL", desc: "Field simulation: feedback fails" } },
  init: { "M101.Cfg.StartDelay": 2000 },
  io: [
    { tag: "M101.Cmd.Start", widget: "pb", label: "Start" },
    { tag: "M101.Cmd.Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "M101.Cmd.Reset", widget: "pb", label: "Fault reset" },
    { tag: "Seized", widget: "toggle", label: "Simulate: contactor fails", states: ["OK", "Failed"] },
    { tag: "M101_RunCmd", widget: "motor", label: "Pump M101" },
    { tag: "M101.Sts.Fault", widget: "lamp", label: "M101 fault", color: "alarm" }
  ],
  palette: ["XIC", "XIO", "OTE", "OTL", "OTU", "TON", "BRANCH"],
  requires: ["TON"],
  process: {
    init: function (tags) { tags["M101.Sts.Running"] = false; },
    step: function (tags) { tags["M101.Sts.Running"] = !!tags["M101_RunCmd"] && !tags["Seized"]; }
  },
  starter: "[XIC(M101.Cmd.Start),XIC(M101_RunCmd)]XIC(M101.Cmd.Stop)OTE(M101_RunCmd);",
  tests: [
    { name: "Pump is stopped at power-up", steps: [{ scan: 3 }, { expect: { "M101_RunCmd": false, "M101.Sts.Fault": false } }] },
    { name: "Start runs the pump and it keeps running with feedback", steps: [{ press: { tag: "M101.Cmd.Start", ms: 200 } }, { wait: 4000 }, { expect: { "M101_RunCmd": true, "M101.Sts.Fault": false } }] },
    { name: "Stop halts the pump without a fault", steps: [{ press: { tag: "M101.Cmd.Start", ms: 200 } }, { wait: 500 }, { press: { tag: "M101.Cmd.Stop", ms: 200 } }, { wait: 3000 }, { expect: { "M101_RunCmd": false, "M101.Sts.Fault": false } }] },
    { name: "No feedback for 2 s trips the fault and stops the pump", steps: [{ set: { Seized: true } }, { press: { tag: "M101.Cmd.Start", ms: 200 } }, { wait: 1000 }, { expect: { "M101.Sts.Fault": false } }, { wait: 1500 }, { expect: { "M101.Sts.Fault": true, "M101_RunCmd": false } }] },
    { name: "The fault stays latched and blocks a restart", steps: [{ set: { Seized: true } }, { press: { tag: "M101.Cmd.Start", ms: 200 } }, { wait: 3000 }, { set: { Seized: false } }, { wait: 1000 }, { expect: { "M101.Sts.Fault": true } }, { press: { tag: "M101.Cmd.Start", ms: 200 } }, { wait: 500 }, { expect: { "M101_RunCmd": false } }] },
    { name: "Reset clears the fault and the pump can start again", steps: [{ set: { Seized: true } }, { press: { tag: "M101.Cmd.Start", ms: 200 } }, { wait: 3000 }, { set: { Seized: false } }, { press: { tag: "M101.Cmd.Reset", ms: 200 } }, { wait: 200 }, { expect: { "M101.Sts.Fault": false } }, { press: { tag: "M101.Cmd.Start", ms: 200 } }, { wait: 3000 }, { expect: { "M101_RunCmd": true, "M101.Sts.Fault": false } }] }
  ],
  hints: [
    "Treat \`M101_RunCmd\` like the motor in the three-wire rung, with one extra condition: no active fail-to-start alarm. Then think about what 'commanded to run but not confirmed' looks like in bits.",
    "Seal-in with \`XIO(M101.Alm.FailToStart)\` in series. Run the timer on \`XIC(M101_RunCmd)XIO(M101.Sts.Running)\` with \`M101.Cfg.StartDelay\` as its preset, latch the alarm with OTL from the timer's DN, clear it with OTU from Reset, and copy the alarm to \`M101.Sts.Fault\`.",
    "\`[XIC(M101.Cmd.Start),XIC(M101_RunCmd)]XIC(M101.Cmd.Stop)XIO(M101.Alm.FailToStart)OTE(M101_RunCmd);\` \`XIC(M101_RunCmd)XIO(M101.Sts.Running)TON(M101_FbTmr,M101.Cfg.StartDelay,0);\` \`XIC(M101_FbTmr.DN)OTL(M101.Alm.FailToStart);\` \`XIC(M101.Cmd.Reset)OTU(M101.Alm.FailToStart);\` \`XIC(M101.Alm.FailToStart)OTE(M101.Sts.Fault);\`"
  ],
  solution: "[XIC(M101.Cmd.Start),XIC(M101_RunCmd)]XIC(M101.Cmd.Stop)XIO(M101.Alm.FailToStart)OTE(M101_RunCmd);\nXIC(M101_RunCmd)XIO(M101.Sts.Running)TON(M101_FbTmr,M101.Cfg.StartDelay,0);\nXIC(M101_FbTmr.DN)OTL(M101.Alm.FailToStart);\nXIC(M101.Cmd.Reset)OTU(M101.Alm.FailToStart);\nXIC(M101.Alm.FailToStart)OTE(M101.Sts.Fault);",
  explain: `Every member is addressed by a path: \`M101.Cmd.Start\`, \`M101.Sts.Running\`, \`M101.Cfg.StartDelay\`, \`M101.Alm.FailToStart\`. \`UDT_Motor\` is built from four smaller types (\`UDT_MotorCmd\`, \`UDT_MotorSts\`, \`UDT_MotorCfg\`, \`UDT_MotorAlm\`), and the grouping tells you who owns each bit: the HMI writes \`Cmd\`, the PLC writes \`Sts\` and \`Alm\`, and an engineer sets \`Cfg\`. In Studio 5000 you create the types once in the Data Types folder, then create a tag of type \`UDT_Motor\` for each motor.

The logic is the standard **command versus feedback** check: if the PLC commands the output and the aux contact does not confirm within a time, something is wrong. The delay absorbs the contactor's pull-in time, so a normal start never faults. The delay lives in \`Cfg.StartDelay\`, and the TON uses that tag as its **preset**, so a technician can retune it without editing the program.

The alarm is **latched** (OTL) on purpose. If it followed the condition, then turning the pump off would clear the feedback error, the alarm would vanish, and the operator would never know the pump tripped. Latching plus a deliberate Reset forces acknowledgment. Because the alarm also blocks the seal-in, the pump cannot restart until the cause is looked at. \`Sts.Fault\` is the summary the HMI displays.

The payoff of the UDT comes with the second pump: you copy the rungs and replace \`M101\` with \`M102\`. Later the same structure becomes an Add-On Instruction and an HMI faceplate, all bound to the same member names.

Two simplifications here: the real house UDT also has a \`Cfg.Description\` string (this simulator has no STRING type), and the timer and run-command bit are separate tags beside the UDT instead of inside an AOI.`,
  tips: [
    "Group members by who writes them (Cmd, Sts, Cfg, Alm), as the nested types here do. A tag path like \`M101.Sts.Running\` then tells you the owner at a glance.",
    "Pick the feedback timeout from the contactor and the motor's actual start time. Too short and every start faults, too long and a seized motor cooks.",
    "Never reset a fault automatically on a motor that failed to start. Auto-restarting a tripped motor is how coils and windings get burned. Overload trips are hardwired in the starter circuit; the PLC only monitors \`Alm.Overload\`."
  ]
});
