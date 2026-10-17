LC.sim({
  id: "sim-rto", title: "Retentive runtime hours", level: 2, lesson: "plc-timers",
  brief: `The maintenance plan for a transfer pump says: **service the seals every 500 running hours**. Running hours means hours the motor was actually turning, not hours since commissioning. The pump starts and stops all day, so a plain on-delay timer is no use: it throws its time away every time the pump stops.

For the simulator, **10 seconds of run time stands in for 500 hours**, so you can see it work.

Build it:

- \`PumpCall\` (a switch on the control panel) runs \`Pump\`.
- Run time accumulates **only while the pump runs**, and is **kept** when the pump stops. Use an **RTO** (retentive timer on) named \`RunTime\` with a 10000 ms preset.
- When the timer is done, \`ServiceDue\` lights and **stays lit even if the pump is stopped**.
- The technician presses \`ServiceReset\` after the job to clear the hours. A retentive timer never clears itself, so you will need **RES**.

\`\`\`ladder
XIC(Pump)RTO(RunTime,10000,0);
XIC(ServiceReset)RES(RunTime);
\`\`\``,
  tags: { PumpCall: "BOOL", ServiceReset: "BOOL", Pump: "BOOL", RunTime: { type: "TIMER", desc: "Pump run time (ms), retentive" }, ServiceDue: "BOOL" },
  io: [
    { tag: "PumpCall", widget: "toggle", label: "Pump run switch" },
    { tag: "ServiceReset", widget: "pb", label: "Service done (reset)" },
    { tag: "Pump", widget: "motor", label: "Transfer pump" },
    { tag: "ServiceDue", widget: "lamp", label: "Service due", color: "warn" },
    { tag: "RunTime.ACC", widget: "value", label: "Run time (ms)" }
  ],
  palette: ["XIC", "XIO", "OTE", "TON", "RTO", "RES", "BRANCH"],
  requires: ["RTO", "RES"],
  starter: "XIC(PumpCall)OTE(Pump);\nXIC(Pump)TON(RunTime,10000,0);\nXIC(RunTime.DN)OTE(ServiceDue);",
  tests: [
    { name: "Run time accumulates while the pump runs", steps: [{ set: { PumpCall: true } }, { wait: 6000 }, { expect: { Pump: true, "RunTime.ACC": 6000, ServiceDue: false } }] },
    { name: "Stopping the pump keeps the hours (retentive)", steps: [{ set: { PumpCall: true } }, { wait: 6000 }, { set: { PumpCall: false } }, { wait: 3000 }, { expect: { Pump: false, "RunTime.ACC": 6000 } }] },
    { name: "Hours from separate runs add up to the preset", steps: [{ set: { PumpCall: true } }, { wait: 6000 }, { set: { PumpCall: false } }, { wait: 1000 }, { set: { PumpCall: true } }, { wait: 3000 }, { expect: { "RunTime.ACC": 9000, ServiceDue: false } }, { wait: 1500 }, { expect: { ServiceDue: true } }] },
    { name: "Service Due stays lit after the pump stops", steps: [{ set: { PumpCall: true } }, { wait: 10500 }, { set: { PumpCall: false } }, { wait: 2000 }, { expect: { Pump: false, ServiceDue: true } }] },
    { name: "Service Reset clears the hours and the lamp", steps: [{ set: { PumpCall: true } }, { wait: 10500 }, { set: { PumpCall: false } }, { wait: 500 }, { press: { tag: "ServiceReset", ms: 200 } }, { wait: 200 }, { expect: { "RunTime.ACC": 0, ServiceDue: false } }, { set: { PumpCall: true } }, { wait: 2000 }, { expect: { "RunTime.ACC": 2000, ServiceDue: false } }] }
  ],
  hints: [
    "Compare what you want with what a TON does: when its rung goes false, a TON throws its accumulated time away. Which timer instruction keeps ACC when the rung goes false?",
    "Swap the TON for an **RTO** with the same tag and preset: \`XIC(Pump)RTO(RunTime,10000,0)\`. An RTO never clears itself, so add a separate rung that clears it when the technician presses \`ServiceReset\`.",
    "\`XIC(PumpCall)OTE(Pump);\` \`XIC(Pump)RTO(RunTime,10000,0);\` \`XIC(RunTime.DN)OTE(ServiceDue);\` \`XIC(ServiceReset)RES(RunTime);\`"
  ],
  solution: "XIC(PumpCall)OTE(Pump);\nXIC(Pump)RTO(RunTime,10000,0);\nXIC(RunTime.DN)OTE(ServiceDue);\nXIC(ServiceReset)RES(RunTime);",
  explain: `An **RTO** has the same members as a TON (\`.PRE\`, \`.ACC\`, \`.EN\`, \`.TT\`, \`.DN\`) and times the same way while its rung is true. The difference is what happens when the rung goes **false**: a TON clears \`.ACC\`, but an RTO **holds** it. The next time the rung is true it carries on from where it left off, so six seconds plus three seconds plus more seconds adds up to the total running time.

Because nothing ever clears it, you must clear it yourself with **RES** on the same timer tag. RES zeroes \`.ACC\` and clears \`.DN\`, \`.EN\` and \`.TT\`. If you forget RES, the timer reaches its preset once, \`.DN\` stays on forever and the service lamp can never be cleared. That is the classic RTO bug.

Notice that \`ServiceDue\` is driven from \`RunTime.DN\`, not from the pump. \`.DN\` is retained along with \`.ACC\`, so the lamp stays lit while the pump is stopped. This is also what a technician needs: the reminder must survive until someone does the job.

In Studio 5000 the RTO box looks just like the TON box, with Timer, Time Base, Preset and Accum. The RES instruction takes the timer tag. A retentive timer's \`.ACC\` also survives a switch of the controller between Program and Run mode, and a power cycle with the battery or the energy storage module healthy.`,
  tips: [
    "Presets are limited to about 24.8 days of milliseconds (2,147,483,647). For real running hours, drive a DINT or REAL accumulator from a one-second pulse, or add the RTO's seconds to a retentive tag and clear the RTO each time it is done.",
    "Put RES on its **own rung**, not on the same rung as the RTO. If the RES rung is true it holds the timer at zero every scan.",
    "Gate the RTO on a real run feedback (contactor aux contact or VFD running bit), not the run command. A pump that was commanded but tripped did not run.",
    "Never put a TON and an RTO on the same timer tag, and use each timer tag in one instruction only."
  ]
});
