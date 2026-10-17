LC.sim({
  id: "sim-pump-alternation", title: "Lead/lag pump alternation", level: 4, lesson: "plc-state-machines",
  brief: `A booster station has two identical pumps, \`Pump1\` and \`Pump2\`. When the system calls for water (\`Call\`) one pump, the **lead**, runs. If one pump always leads, it wears out first and the other sits idle and seizes. So the lead should **alternate each call**.

Build it:

1. \`Call\` on: the **lead** pump runs. Call 1 uses Pump1, call 2 uses Pump2, call 3 Pump1 again, and so on.
2. \`LagCall\` (demand too high for one pump) also starts the **lag** pump. Only then may both pumps run.
3. If a pump is faulted (\`Fault1\` / \`Fault2\`) it must not run, and the other pump takes over as lead.

Hold the lead selection in a DINT, \`Lead\` (1 or 2), and swap it **when a call ends**. A trick: \`CPT(Lead,"3 - Lead")\` flips 1 and 2 in a single instruction.

\`\`\`ladder
XIC(Call)OSF(CallMem,CallEnd)CPT(Lead,"3 - Lead");
\`\`\`

Use the **Call** switch like a pressure switch: turn it on, then off, and watch which pump runs.`,
  tags: {
    Call: { type: "BOOL", desc: "System demand" }, LagCall: { type: "BOOL", desc: "High demand: start the lag pump too" },
    Fault1: { type: "BOOL", desc: "Pump 1 faulted (tripped overload)" }, Fault2: { type: "BOOL", desc: "Pump 2 faulted (tripped overload)" },
    Lead: { type: "DINT", desc: "Which pump leads the next call: 1 or 2" },
    CallMem: "BOOL", CallEnd: { type: "BOOL", desc: "One scan pulse when a call ends" },
    Pump1: "BOOL", Pump2: "BOOL"
  },
  init: { Lead: 1 },
  io: [
    { tag: "Call", widget: "toggle", label: "Demand (Call)" },
    { tag: "LagCall", widget: "toggle", label: "High demand (Lag call)" },
    { tag: "Fault1", widget: "toggle", label: "Pump 1 fault", states: ["OK", "Tripped"] },
    { tag: "Fault2", widget: "toggle", label: "Pump 2 fault", states: ["OK", "Tripped"] },
    { tag: "Pump1", widget: "motor", label: "Pump 1" },
    { tag: "Pump2", widget: "motor", label: "Pump 2" },
    { tag: "Lead", widget: "value", label: "Next lead pump" }
  ],
  palette: ["XIC", "XIO", "OTE", "EQU", "OSF", "OSR", "CPT", "MOV", "BRANCH"],
  requires: ["EQU"],
  starter: "XIC(Call)OTE(Pump1);",
  tests: (function () {
    var call = [{ set: { Call: true } }, { scan: 3 }];
    var rest = [{ set: { Call: false } }, { scan: 3 }];
    return [
      { name: "Both pumps are off with no call", steps: [{ scan: 3 }, { expect: { Pump1: false, Pump2: false } }] },
      { name: "Call 1: only Pump1 runs (and stops when the call ends)", steps: call.concat([{ expect: { Pump1: true, Pump2: false } }]).concat(rest).concat([{ expect: { Pump1: false, Pump2: false } }]) },
      { name: "Call 2: the lead swaps to Pump2 only", steps: call.concat(rest).concat(call).concat([{ expect: { Pump1: false, Pump2: true } }]) },
      { name: "Call 3: back to Pump1, and never both pumps together", steps: call.concat(rest).concat(call).concat(rest).concat(call).concat([{ expect: { Pump1: true, Pump2: false } }]) },
      { name: "A lag call starts both pumps", steps: call.concat([{ set: { LagCall: true } }, { scan: 3 }, { expect: { Pump1: true, Pump2: true } }, { set: { LagCall: false } }, { scan: 3 }, { expect: { Pump1: true, Pump2: false } }]) },
      { name: "A faulted lead pump is skipped, the other one takes over", steps: [{ set: { Fault1: true } }, { scan: 1 }].concat(call).concat([{ expect: { Pump1: false, Pump2: true } }, { set: { LagCall: true } }, { scan: 3 }, { expect: { Pump1: false, Pump2: true } }]) }
    ];
  })(),
  hints: [
    "You need memory of whose turn it is (a DINT is perfect) and a one-scan pulse when a call finishes, so it flips exactly once per call. Which one-shot fires on a falling edge?",
    "\`XIC(Call)OSF(CallMem,CallEnd)CPT(Lead,\"3 - Lead\")\` flips Lead when the call ends. Each pump rung is: Call, not faulted, and a branch with 'my turn' (\`EQU(Lead,n)\`), \`LagCall\`, or 'the other pump is faulted'.",
    "\`XIC(Call)OSF(CallMem,CallEnd)CPT(Lead,\"3 - Lead\");\` \`XIC(Call)XIO(Fault1)[EQU(Lead,1),XIC(LagCall),XIC(Fault2)]OTE(Pump1);\` \`XIC(Call)XIO(Fault2)[EQU(Lead,2),XIC(LagCall),XIC(Fault1)]OTE(Pump2);\`"
  ],
  solution: "XIC(Call)OSF(CallMem,CallEnd)CPT(Lead,\"3 - Lead\");\nXIC(Call)XIO(Fault1)[EQU(Lead,1),XIC(LagCall),XIC(Fault2)]OTE(Pump1);\nXIC(Call)XIO(Fault2)[EQU(Lead,2),XIC(LagCall),XIC(Fault1)]OTE(Pump2);",
  explain: `Alternation is a tiny state machine whose state is **whose turn it is**. \`Lead\` holds 1 or 2, and it changes exactly once per call.

- **When to flip.** \`OSF\` (one-shot falling) produces a pulse for a single scan when \`Call\` goes from on to off. \`CPT(Lead,"3 - Lead")\` turns 1 into 2 and 2 into 1 in one instruction. If you wrote two rungs, 'if 1 then 2' and 'if 2 then 1', the second rung would see the result of the first and flip it straight back in the same scan.
- **Flip at the end of the call, not the beginning.** Flipping at the start would change the lead while the pump is running and swap the pumps mid-call.
- **Who runs.** Each pump runs on a call if it is not faulted **and** it is the lead, or the lag has been asked for, or its partner is faulted. That one expression gives you alternation, lead/lag staging and automatic takeover.

Real stations also add a minimum run time and a short delay between starting the lead and the lag pump, so both do not start inrush at the same instant. Hours-based alternation (lead = the pump with fewer run hours, from an RTO as in the runtime challenge) is a common alternative, and it survives a power cycle if the data is retentive. Remember that \`Lead\` must be retained across a download or power loss, or Pump1 always leads after a restart.`,
  tips: [
    "Do not use a pump's output bit as its own history. Keep the alternation state in a separate tag so a fault or a manual run does not corrupt it.",
    "Add a small start delay between the lead and the lag pump (for example 5 s) to avoid starting two big motors at the same instant.",
    "Skipping a faulted pump should raise an alarm. Quiet takeover is useful, but nobody fixes a pump they do not know is broken."
  ]
});
