LC.sim({
  id: "sim-and-or", title: "Series (AND) and parallel (OR)", level: 1, lesson: "plc-ladder-basics",
  brief: `Two small jobs on one machine.

**1. Two-hand control.** A punch press may only cycle when the operator holds **both** palm buttons, so both hands are out of the die. The solenoid \`PressSol\` should be on only while \`PB_Left\` **and** \`PB_Right\` are pressed.

**2. Call horn.** Either of two call buttons, \`CallA\` **or** \`CallB\`, should sound the \`Horn\`.

In ladder logic these are just geometry:

- contacts in a row are **series**, which means **AND**
- contacts on separate paths between the same points are **parallel**, which means **OR**. This is called a **branch**.

\`\`\`ladder
XIC(A)XIC(B)OTE(AndOut);
[XIC(A),XIC(B)]OTE(OrOut);
\`\`\`

Build both rungs, then press **Check**.`,
  tags: { PB_Left: "BOOL", PB_Right: "BOOL", CallA: "BOOL", CallB: "BOOL", PressSol: "BOOL", Horn: "BOOL" },
  io: [
    { tag: "PB_Left", widget: "pb", label: "Palm button left" },
    { tag: "PB_Right", widget: "pb", label: "Palm button right" },
    { tag: "CallA", widget: "pb", label: "Call button A" },
    { tag: "CallB", widget: "pb", label: "Call button B" },
    { tag: "PressSol", widget: "lamp", label: "Press solenoid" },
    { tag: "Horn", widget: "lamp", label: "Horn", color: "warn" }
  ],
  palette: ["XIC", "XIO", "OTE", "BRANCH"],
  requires: ["XIC", "OTE"],
  starter: "XIC(PB_Left)OTE(PressSol); // needs both hands\nXIC(CallA)OTE(Horn); // needs either button",
  tests: [
    { name: "Nothing pressed: both outputs off", steps: [{ scan: 3 }, { expect: { PressSol: false, Horn: false } }] },
    { name: "Left hand alone does not run the press", steps: [{ set: { PB_Left: true } }, { scan: 2 }, { expect: { PressSol: false } }] },
    { name: "Right hand alone does not run the press", steps: [{ set: { PB_Right: true } }, { scan: 2 }, { expect: { PressSol: false } }] },
    { name: "Both hands run the press, releasing one stops it", steps: [{ set: { PB_Left: true, PB_Right: true } }, { scan: 2 }, { expect: { PressSol: true } }, { set: { PB_Right: false } }, { scan: 2 }, { expect: { PressSol: false } }] },
    { name: "Call A sounds the horn", steps: [{ set: { CallA: true } }, { scan: 2 }, { expect: { Horn: true } }, { set: { CallA: false } }, { scan: 2 }, { expect: { Horn: false } }] },
    { name: "Call B sounds the horn too", steps: [{ set: { CallB: true } }, { scan: 2 }, { expect: { Horn: true } }] },
    { name: "Both calls together still sound it", steps: [{ set: { CallA: true, CallB: true } }, { scan: 2 }, { expect: { Horn: true } }, { set: { CallA: false } }, { scan: 2 }, { expect: { Horn: true } }] }
  ],
  hints: [
    "The first rung needs both buttons true at once. The second needs at least one true. One is AND, the other is OR.",
    "AND: put both XICs one after the other. OR: select the first call contact, choose **Add branch around**, then tap + on the new lower path and add the second contact there.",
    "Rung 0: \`XIC(PB_Left)XIC(PB_Right)OTE(PressSol);\`  Rung 1: \`[XIC(CallA),XIC(CallB)]OTE(Horn);\` The square brackets with a comma are the branch."
  ],
  solution: "XIC(PB_Left)XIC(PB_Right)OTE(PressSol);\n[XIC(CallA),XIC(CallB)]OTE(Horn);",
  explain: `Power has to travel from the left rail to the coil. In **series**, it must pass through every contact, so every one must be true: AND. In **parallel**, it can take either path, so one true path is enough: OR.

The branch on the horn rung has two **legs**. The simulator highlights a leg green when power flows through it. Press both call buttons and you will see two green legs. Release one and the horn stays on, because the other leg still conducts.

Most real rungs combine both. For example \`[XIC(Start),XIC(Motor)]XIC(Stop)OTE(Motor)\` is "(Start OR Motor) AND Stop", which is exactly the seal-in circuit you build next.

A note on the press: this is a teaching exercise. A real two-hand control must be done with a safety-rated relay or safety PLC that also checks both buttons were pressed nearly together and were released between cycles. Plain ladder logic is not allowed to be the only protection.`,
  tips: [
    "In Studio 5000 you make a branch with the Branch button, drop it around the instruction, and then drag instructions onto the new leg. Branches can nest.",
    "Read a rung left to right as a sentence, and say AND for series and OR for parallel. If the sentence sounds wrong, the rung is wrong.",
    "Keep branches short. If a rung needs more than three or four legs, split it into intermediate bits with their own names."
  ]
});
