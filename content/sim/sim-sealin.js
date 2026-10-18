LC.sim({
  id: "sim-sealin", title: "Three-wire start/stop", level: 1, lesson: "plc-sealin",
  brief: `The most common circuit in industrial control: a **momentary** Start button and a **momentary** Stop button run a motor.

An electrician calls it **three-wire control**. The relay (here, the motor coil) uses its own contact to hold itself on after Start is released. That is a **seal-in** (also called a *holding* or *latching* circuit).

Build it for the conveyor. Following the house standard, the rung seals on an internal **run command** bit, \`Motor_RunCmd\`, and a second rung drives the physical output \`Motor\` from it:

- Pressing \`Start\` sets \`Motor_RunCmd\`, and it keeps running after Start is released.
- Pressing \`Stop\` clears it, and it stays stopped after Stop is released.
- \`Motor\` follows \`Motor_RunCmd\`.
- If both buttons are pressed, **Stop wins**.

This is the normal-stop pushbutton. The motor's **overload and E-stop are hardwired in the starter coil circuit**, not in this rung. The PLC only monitors them.

The Stop button is wired **normally closed**, so its tag reads **1 at rest** and 0 when pressed. Think about whether Stop needs an XIC or an XIO.

\`\`\`ladder
[XIC(Start),XIC(Motor_RunCmd)]XIC(Stop)OTE(Motor_RunCmd);
\`\`\``,
  tags: { Start: "BOOL", Stop: { type: "BOOL", desc: "NC stop: 1 at rest" }, Motor_RunCmd: { type: "BOOL", desc: "Internal run command (the seal-in bit)" }, Motor: { type: "BOOL", desc: "Conveyor motor contactor output" } },
  io: [
    { tag: "Start", widget: "pb", label: "Start" },
    { tag: "Stop", widget: "pb", nc: true, label: "Stop (NC)" },
    { tag: "Motor", widget: "motor", label: "Conveyor motor" }
  ],
  palette: ["XIC", "XIO", "OTE", "BRANCH"],
  requires: ["OTE", "XIC"],
  starter: "XIC(Start)OTE(Motor);",
  tests: [
    { name: "Motor is off at power-up", steps: [{ scan: 3 }, { expect: { Motor: false } }] },
    { name: "A brief Start press latches the motor on", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 200 }, { expect: { Motor: true } }, { wait: 1000 }, { expect: { Motor: true } }] },
    { name: "Stop drops the motor out", steps: [{ press: { tag: "Start", ms: 200 } }, { wait: 100 }, { expect: { Motor: true } }, { press: { tag: "Stop", ms: 200 } }, { wait: 100 }, { expect: { Motor: false } }] },
    { name: "The motor stays off after Stop is released", steps: [{ press: { tag: "Start", ms: 200 } }, { press: { tag: "Stop", ms: 200 } }, { wait: 1000 }, { expect: { Motor: false } }] },
    { name: "Stop wins while Start is still held", steps: [{ set: { Start: true } }, { scan: 2 }, { expect: { Motor: true } }, { set: { Stop: false } }, { scan: 2 }, { expect: { Motor: false } }], },
    { name: "Start does nothing while Stop is held", steps: [{ set: { Stop: false } }, { scan: 1 }, { press: { tag: "Start", ms: 200 } }, { wait: 200 }, { expect: { Motor: false } }] }
  ],
  hints: [
    "Start is only pressed for a moment, yet the motor must keep running. So the rung needs a way to stay true on its own after Start is gone. What bit is true exactly when the motor is running?",
    "Put the run-command bit in parallel with Start: a branch with \`XIC(Start)\` on one leg and \`XIC(Motor_RunCmd)\` on the other, ending in \`OTE(Motor_RunCmd)\`. Then put the Stop contact in series after the branch, so it can break the whole rung. A second rung copies the command to \`Motor\`.",
    "Stop reads 1 at rest because it is NC, so Stop needs an **XIC** here (power passes while the stop circuit is healthy). Full program: \`[XIC(Start),XIC(Motor_RunCmd)]XIC(Stop)OTE(Motor_RunCmd);\` \`XIC(Motor_RunCmd)OTE(Motor);\`"
  ],
  solution: "[XIC(Start),XIC(Motor_RunCmd)]XIC(Stop)OTE(Motor_RunCmd);\nXIC(Motor_RunCmd)OTE(Motor);",
  explain: `Follow the scan. When Start is pressed, the top leg conducts, Stop is healthy, and OTE sets \`Motor_RunCmd\` to 1. On the **next scan** the second leg, \`XIC(Motor_RunCmd)\`, is already true, so the rung stays true even though Start has been released. The command holds itself on: it is **sealed in**. The second rung copies the command to the physical output \`Motor\`.

**Why seal on \`Motor_RunCmd\` and not on \`Motor\`?** The house standard seals on a command bit and drives the output from it. If you force the output while testing, or the output is also written elsewhere, the seal contact is not corrupted. Sealing on the output itself is acceptable in a quick teaching rung, but it is the habit to leave behind.

Stop is placed in series **after** the branch, so it breaks the rung whatever else is true. That is what makes Stop dominant. If you put Stop in series with only the Start leg, a held Start button could keep the motor running while Stop is pressed, and you can prove it by trying it.

**Why XIC on the stop button?** The button is NC, so the input bit is 1 when the button is *not* pressed. XIC(Stop) is therefore true during normal operation and false when pressed or when the wire breaks. If you used XIO(Stop), the rung would be dead until someone pressed Stop, which you saw in the previous challenge.

**Where are overload and E-stop?** In a real panel they are wired in series with the starter coil, so they cut power to the contactor even if the PLC has stopped or a bit is forced. The PLC reads an auxiliary contact and the overload status only to monitor them and to show alarms. This rung is the *normal* stop. Safety-rated stops never depend on it.

In Studio 5000 the same rung is drawn with the run-command contact in a branch under Start, exactly as here.`,
  tips: [
    "A seal-in built on OTE is **not retentive**. The controller clears OTE bits during prescan when it goes to Run, so after a power loss the motor needs a fresh Start press. That is usually what safety wants. An OTL latch, in contrast, keeps its value and can restart equipment.",
    "Process permissives (a tank is not empty, a downstream conveyor is running) go in series with Stop as their own XIC contacts. **Overload and E-stop are not permissives**: they are hardwired in the starter coil circuit and the PLC only monitors them. Never make software the only way to stop a motor.",
    "Seal on a command bit (\`Motor_RunCmd\`) or on the run status from the starter's auxiliary contact, and drive the output from it. Seal on the output tag itself only in a quick teaching rung."
  ]
});
