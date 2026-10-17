LC.lesson({
  id: "plc-timers",
  title: "Timers: TON, TOF, RTO",
  track: "plc",
  minutes: 25,
  level: 2,
  prereqs: ["plc-ladder-basics"],
  tags: ["timers", "TON", "TOF", "RTO", "RES", "debounce", "flasher"],
  summary: "The TIMER structure and the three timer instructions, with timing diagrams, RES, debounce, a flasher and the self-resetting-timer trap.",
  objectives: [
    "Name the five TIMER members and state that .PRE and .ACC are in milliseconds",
    "Predict .EN, .TT and .DN for TON, TOF and RTO from a timing diagram",
    "Choose between TON, TOF and RTO for a start delay, a run-on and a run-hours counter",
    "Reset a retentive timer with RES and explain why TON and TOF do not need it",
    "Build a debounce and a two-timer flasher, and explain the self-resetting timer pitfall"
  ],

  body: `Timers are how a PLC reasons about time: wait 5 seconds before starting the second conveyor, run the fan for a minute after the heater is off, ignore a sensor that bounces. Logix gives you three, **TON**, **TOF** and **RTO**, and one reset instruction, **RES**. Almost every machine uses a handful of them, so it pays to know exactly what each bit does on each scan.

## The TIMER structure

A timer is not a single number. In Logix it is a tag of type **TIMER**, a structure with five members:

| Member | Type | Meaning |
|---|---|---|
| \`.PRE\` | DINT | Preset: how long to time, in **milliseconds** |
| \`.ACC\` | DINT | Accumulated: how long it has timed so far, in milliseconds |
| \`.EN\` | BOOL | Enable: true while the timer instruction's rung is true (TON, RTO) or follows the rung (TOF) |
| \`.TT\` | BOOL | Timer timing: true while the timer is actively accumulating |
| \`.DN\` | BOOL | Done: the result you usually test |

The time base is always 1 ms, so \`.PRE\` of 5000 is five seconds and 60000 is a minute. In ladder you write the timer as \`TON(Timer_Tag,5000,0)\`: the tag, the preset, and the starting accumulator (almost always 0). The largest preset is 2,147,483,647 ms, about 24.8 days. Longer waits need a counter fed by a one-second pulse.

Give each timer its own tag. Two timer instructions on the same tag fight over the same ACC and bits.

> [!note] Timers update when they execute
> A timer adds elapsed time to ACC each time its instruction is scanned. If it lives in a routine that is not being called, ACC simply stops changing and its bits stay as they were. Do not put a timer you rely on behind a jump or a conditionally called subroutine unless you understand that freeze.

## TON: on-delay

\`\`\`ladder
XIC(Motor_Run) TON(Conv2_Delay,5000,0)
XIC(Conv2_Delay.DN) OTE(Conv2_Run)
\`\`\`

TON times while its rung is true. \`.EN\` goes high with the rung, \`.TT\` is high while ACC is below PRE, and when ACC reaches PRE, \`.DN\` goes high and \`.TT\` drops. If the rung goes false at *any* time, the timer resets: ACC to 0, and EN, TT and DN all cleared. A TON is **non-retentive**.

{{diagram:ton}}

Use TON for "after X has been true for N seconds": a start delay between motors, a "pump has been running long enough, check pressure", a fault that must persist before it counts.

{{sim:sim-ton}}

## TOF: off-delay

\`\`\`ladder
XIC(Heater_On) TOF(Fan_Runon,60000,0)
XIC(Fan_Runon.DN) OTE(Fan_Run)
\`\`\`

TOF is the mirror image, and its name confuses newcomers because it times while the rung is **false**. While the rung is true, \`.DN\` is true and ACC is 0. When the rung goes false, \`.TT\` goes high and ACC starts counting. When ACC reaches PRE, \`.DN\` drops and TT clears. If the rung goes true again before then, ACC resets to 0 and DN never dropped.

{{diagram:tof}}

Use TOF where something must keep running for a while after its cause is gone: fan run-on after a heater turns off, a lubrication pump that runs 10 seconds after the machine stops, a lamp that stays on after the door closes.

{{sim:sim-tof}}

## RTO: retentive on-delay

\`\`\`ladder
XIC(Pump_Running) RTO(Pump_Hours,3600000,0)
XIC(Hours_Reset) RES(Pump_Hours)
\`\`\`

RTO accumulates while its rung is true but **does not reset** when the rung goes false. ACC is held, and it resumes when the rung goes true again. It also survives a power cycle, which is the whole point. DN sets when ACC reaches PRE and stays set. The only way to clear an RTO is a **RES** instruction on the same tag.

{{diagram:rto}}

RTO is the natural tool for run-hours, "oil change every 500 hours", batch times that must carry over a pause and any measurement of total time that is true.

{{sim:sim-rto}}

## RES: the reset instruction

RES clears the TIMER (ACC, EN, TT and DN) or a COUNTER when its rung is true. Put it on its own rung, as above. Never put a RES on the same tag in the same rung condition as the TON or RTO and expect clean behavior: the RES runs while the timer is trying to time. For a TON or TOF you rarely need RES because dropping the rung does the job.

## Debounce

Mechanical switches and some proximity sensors chatter for a few milliseconds when they change. A scan of 5 ms can read the chatter as several on/off events. A TON in front of the signal filters it out.

\`\`\`ladder
XIC(Door_Switch_Raw) TON(Door_Debounce,50,0)
XIC(Door_Debounce.DN) OTE(Door_Closed)
\`\`\`

The raw input must stay true for 50 ms before Door_Closed turns on. It turns off immediately when the raw input drops, because the TON resets. If you need to debounce both edges, add a TOF on the same signal and combine them. Do not set a debounce longer than the real event can tolerate, and remember it adds that delay to every response.

## Flasher: two timers

A flasher is two TONs that reset each other.

\`\`\`ladder
XIC(Flash_Enable) XIO(Flash_Off.DN) TON(Flash_On,500,0)
XIC(Flash_On.DN) TON(Flash_Off,500,0)
XIC(Flash_On.DN) OTE(Alarm_Lamp)
\`\`\`

Trace it. Flash_On times 500 ms with the lamp off. Its DN goes high, the lamp turns on, and Flash_Off starts. After another 500 ms Flash_Off.DN goes high, which opens the XIO in rung 1 and resets Flash_On. DN drops, which resets Flash_Off, whose DN drops, and the cycle begins again. Result: 500 ms off, 500 ms on, a 1 Hz flash. Make the two presets different for a duty cycle other than 50 percent.

{{sim:sim-flasher}}

## The self-resetting timer pitfall

A shorter flasher uses one timer that resets itself:

\`\`\`ladder
XIO(Tick.DN) TON(Tick,1000,0)
\`\`\`

When ACC reaches PRE, DN goes true during that scan. The XIO sees it on the *next* scan and drops the rung, which resets the timer and clears DN. So Tick.DN is true for roughly one scan. That is usable as a once-a-second pulse, but with two caveats.

1. **Who sees the pulse depends on scan order.** Rungs after the timer see DN in the same scan. Rungs before the timer see it in the next scan. A rung in another routine or task may see it, or may miss it entirely if its task does not run in the right scan.
2. **A one-scan pulse feeding a counter or a one-shot can be lost.** If the consumer is in a slower task, it may never see DN high.

When another part of the program must respond to the tick, capture it in a bit instead. Latch a flag with an OTL when DN goes true and clear it in the consuming logic, or use a different design, such as the two-timer flasher whose output stays true for 500 ms.

## Worked example: motor start-up and run-on

A blower needs 10 seconds of warm-up before the belt starts and must keep running for 30 seconds after the belt stops to cool the motor.

\`\`\`ladder
XIC(Cycle_Run) TON(Belt_Delay,10000,0)
XIC(Belt_Delay.DN) XIO(Belt_Fault) OTE(Belt_Run)
XIC(Cycle_Run) TOF(Blower_Cool,30000,0)
XIC(Blower_Cool.DN) OTE(Blower_Run)
\`\`\`

Cycle_Run turns the blower on immediately (the TOF's DN is true as soon as its rung is). The belt waits for the TON. When Cycle_Run drops, the belt stops at once and the blower continues until Blower_Cool times out 30 seconds later. Four rungs, two timers, no extra state.

## Tips from the floor

- Keep presets in tags (a DINT you can edit from Ignition) rather than hard-coded, and move them into the timer with MOV. A preset you can tune without downloading is worth a lot during commissioning.
- Display a timer with \`ACC\` and \`PRE\` on the HMI as a sanity check. Operators trust a countdown.
- Name timer tags after their purpose (\`Belt_Start_Delay\`), not their number (\`T4\`).
- To work in seconds, make your own tag in seconds and multiply by 1000 with MUL when loading PRE.`,

  eli5: `Think of an egg timer in a kitchen. You turn the dial to set how long (that is the preset), and the little hand shows how much time has gone by (that is the accumulated time).

An **on-delay** timer is like a timer that only runs while you hold the start lever down. Let go early and the dial snaps back to zero. Hold it long enough and it dings.

An **off-delay** timer works the other way. It is happy and ringing while you hold the lever, and when you let go it counts down before it falls silent. Like the light in a hallway that stays on for a minute after you walk out.

A **retentive** timer is a stopwatch. Stop it and it remembers where it was. Start it again and it carries on. The only way to get it back to zero is to press a separate reset button.

The PLC checks these timers on every pass through its program, so it reads them many times each second.`,

  why: `**Why milliseconds in a DINT?** A 32-bit integer gives millisecond precision for up to 24.8 days, with no floating-point surprises. It also means a preset is just a number you can write from an HMI or compute in math.

**Why does TOF time while false?** Because "off delay" is a statement about the output: the done bit lags the rung when it turns off. The mechanics of counting only while the input is false is the cost of getting that behavior from one instruction.

**Why do timers reset when the rung drops?** It is the entire definition of "has been true for N seconds". Without the reset, a sensor that flickered true four times for 2 seconds each would eventually total 8 and trip a 5-second delay. If you do want a running total, that is what RTO is for, and the distinction is the most common timer decision on a job.

**Why keep presets in tags?** Process times change during commissioning, and a download to change a constant is slow and risky. Tuning from the HMI is the norm. Many shops lock these behind a recipe or an engineering screen.

**What do integrators argue about?** Self-resetting timers for ticks. They are compact and they work, but the pulse is fragile in multi-task projects. Many teams ban them in favor of a system clock bit or a two-timer pattern. A related argument is whether to put a debounce in the PLC or rely on the input module filter. Use the module filter for pure electrical noise and the PLC timer for process-level chatter.`,

  history: `Relay panels used pneumatic and motor-driven time-delay relays, labeled "on-delay" and "off-delay" by when the contact changed. PLC timers copied that vocabulary exactly, which is why TON and TOF mean what they do. The retentive timer reproduced the elapsed-time meters and motor-driven timers that held position when power was removed.`,

  examples: [
    { title: "Why a short blip doesn't trip the alarm", body: `A level switch is wired to a high-level alarm. Splashing makes it flicker for 200 ms at a time. With \`XIC(LSH) TON(LSH_Delay,3000,0)\` and \`XIC(LSH_Delay.DN) OTE(High_Level_Alarm)\`, a splash never reaches 3 seconds, so no alarm. A real high level stays true and trips after 3 seconds.` },
    { title: "Run-hours with a rollover to a counter", body: `Use \`XIC(Pump_Run) RTO(Pump_Hr,3600000,0)\`, then \`XIC(Pump_Hr.DN) CTU(Pump_Hours,99999,0)\` followed by \`XIC(Pump_Hr.DN) RES(Pump_Hr)\`. Each hour fills the RTO, advances the counter and resets the timer. Because the RES comes after the CTU in the scan, the counter sees DN once per hour.` }
  ],

  diagrams: {
    ton: `<svg viewBox="0 0 640 300" role="img" aria-label="TON timing: DN comes on when accumulated time reaches the preset, and the whole timer clears when the rung goes false; a short pulse never reaches DN">
  <text class="dg-title" x="20" y="24">TON, PRE = 5 s</text>
  <text class="dg-text-sm" x="20" y="64">Rung (input)</text>
  <path class="dg-line-accent" d="M170,70 L202.1,70 L202.1,48 L427.1,48 L427.1,70 L491.4,70 L491.4,48 L555.7,48 L555.7,70 L620,70"/>
  <text class="dg-text-sm" x="20" y="104">.EN</text>
  <path class="dg-line-accent" d="M170,110 L202.1,110 L202.1,88 L427.1,88 L427.1,110 L491.4,110 L491.4,88 L555.7,88 L555.7,110 L620,110"/>
  <text class="dg-text-sm" x="20" y="144">.TT</text>
  <path class="dg-line-ok" d="M170,150 L202.1,150 L202.1,128 L362.9,128 L362.9,150 L491.4,150 L491.4,128 L555.7,128 L555.7,150 L620,150"/>
  <text class="dg-text-sm" x="20" y="184">.DN</text>
  <path class="dg-line-alarm" d="M170,190 L362.9,190 L362.9,168 L427.1,168 L427.1,190 L620,190"/>
  <text class="dg-text-sm" x="20" y="230">.ACC</text>
  <line class="dg-line-thin dg-dash" x1="170" y1="214.6" x2="620" y2="214.6"/>
  <text class="dg-text-muted dg-end" x="164" y="218.6">PRE</text>
  <path class="dg-line" d="M170.0,236.0 L202.1,236.0 L427.1,206.0 L427.1,236.0 L491.4,236.0 L555.7,227.4 L555.7,236.0 L620.0,236.0"/>
  <line class="dg-line-thin dg-dash" x1="202.1" y1="44" x2="202.1" y2="246"/>
  <text class="dg-text-muted dg-mid" x="202.1" y="262">on</text>
  <line class="dg-line-thin dg-dash" x1="362.9" y1="44" x2="362.9" y2="246"/>
  <text class="dg-text-muted dg-mid" x="362.9" y="262">ACC=PRE</text>
  <line class="dg-line-thin dg-dash" x1="427.1" y1="44" x2="427.1" y2="246"/>
  <text class="dg-text-muted dg-mid" x="427.1" y="262">off</text>
  <line class="dg-line-thin dg-dash" x1="555.7" y1="44" x2="555.7" y2="246"/>
  <text class="dg-text-muted dg-mid" x="555.7" y="262">early off</text>
  <text class="dg-text-sm" x="20" y="286">The second pulse (10 to 12 s) is too short. The timer resets and DN never turns on.</text>
</svg>`,
    tof: `<svg viewBox="0 0 640 300" role="img" aria-label="TOF timing: DN comes on at once with the rung and goes off only after the rung has been false for the preset time; a return of the rung during timing resets the accumulator">
  <text class="dg-title" x="20" y="24">TOF, PRE = 5 s</text>
  <text class="dg-text-sm" x="20" y="64">Rung (input)</text>
  <path class="dg-line-accent" d="M170,70 L198.1,70 L198.1,48 L338.8,48 L338.8,70 L395.0,70 L395.0,48 L423.1,48 L423.1,70 L620,70"/>
  <text class="dg-text-sm" x="20" y="104">.EN</text>
  <path class="dg-line-accent" d="M170,110 L198.1,110 L198.1,88 L338.8,88 L338.8,110 L395.0,110 L395.0,88 L423.1,88 L423.1,110 L620,110"/>
  <text class="dg-text-sm" x="20" y="144">.TT</text>
  <path class="dg-line-ok" d="M170,150 L338.8,150 L338.8,128 L395.0,128 L395.0,150 L423.1,150 L423.1,128 L563.8,128 L563.8,150 L620,150"/>
  <text class="dg-text-sm" x="20" y="184">.DN</text>
  <path class="dg-line-alarm" d="M170,190 L198.1,190 L198.1,168 L563.8,168 L563.8,190 L620,190"/>
  <text class="dg-text-sm" x="20" y="230">.ACC</text>
  <line class="dg-line-thin dg-dash" x1="170" y1="206.0" x2="620" y2="206.0"/>
  <text class="dg-text-muted dg-end" x="164" y="210.0">PRE</text>
  <path class="dg-line" d="M170.0,236.0 L338.8,236.0 L395.0,224.0 L395.0,236.0 L423.1,236.0 L563.8,206.0 L620.0,206.0"/>
  <line class="dg-line-thin dg-dash" x1="198.1" y1="44" x2="198.1" y2="246"/>
  <text class="dg-text-muted dg-mid" x="198.1" y="262">on</text>
  <line class="dg-line-thin dg-dash" x1="338.8" y1="44" x2="338.8" y2="246"/>
  <text class="dg-text-muted dg-mid" x="338.8" y="262">off</text>
  <line class="dg-line-thin dg-dash" x1="395.0" y1="44" x2="395.0" y2="246"/>
  <text class="dg-text-muted dg-mid" x="395.0" y="262">back on</text>
  <line class="dg-line-thin dg-dash" x1="423.1" y1="44" x2="423.1" y2="246"/>
  <text class="dg-text-muted dg-mid" x="423.1" y="262">off</text>
  <line class="dg-line-thin dg-dash" x1="563.8" y1="44" x2="563.8" y2="246"/>
  <text class="dg-text-muted dg-mid" x="563.8" y="262">DN off</text>
  <text class="dg-text-sm" x="20" y="286">At 8 s the rung returns before timing finishes, so ACC resets and DN never dropped.</text>
</svg>`,
    rto: `<svg viewBox="0 0 640 262" role="img" aria-label="RTO timing: accumulated time is held when the rung goes false, adds up across several on periods, and is cleared only by RES">
  <text class="dg-title" x="20" y="24">RTO, PRE = 5 s</text>
  <text class="dg-text-sm" x="20" y="64">Rung (input)</text>
  <path class="dg-line-accent" d="M170,70 L198.1,70 L198.1,48 L282.5,48 L282.5,70 L338.8,70 L338.8,48 L423.1,48 L423.1,70 L620,70"/>
  <text class="dg-text-sm" x="20" y="104">.DN</text>
  <path class="dg-line-alarm" d="M170,110 L395.0,110 L395.0,88 L507.5,88 L507.5,110 L620,110"/>
  <text class="dg-text-sm" x="20" y="144">RES rung</text>
  <path class="dg-line-accent" d="M170,150 L507.5,150 L507.5,128 L524.4,128 L524.4,150 L620,150"/>
  <text class="dg-text-sm" x="20" y="190">.ACC</text>
  <line class="dg-line-thin dg-dash" x1="170" y1="171.0" x2="620" y2="171.0"/>
  <text class="dg-text-muted dg-end" x="164" y="175.0">PRE</text>
  <path class="dg-line" d="M170.0,196.0 L198.1,196.0 L282.5,181.0 L338.8,181.0 L423.1,166.0 L507.5,166.0 L507.5,196.0 L620.0,196.0"/>
  <line class="dg-line-thin dg-dash" x1="198.1" y1="44" x2="198.1" y2="206"/>
  <text class="dg-text-muted dg-mid" x="198.1" y="222">on</text>
  <line class="dg-line-thin dg-dash" x1="282.5" y1="44" x2="282.5" y2="206"/>
  <text class="dg-text-muted dg-mid" x="282.5" y="222">off: ACC held</text>
  <line class="dg-line-thin dg-dash" x1="395.0" y1="44" x2="395.0" y2="206"/>
  <text class="dg-text-muted dg-mid" x="395.0" y="222">DN</text>
  <line class="dg-line-thin dg-dash" x1="507.5" y1="44" x2="507.5" y2="206"/>
  <text class="dg-text-muted dg-mid" x="507.5" y="222">RES</text>
  <text class="dg-text-sm" x="20" y="248">ACC holds at 3 s during the gap, resumes, passes PRE at 8 s and stays until RES.</text>
</svg>`
  },

  pitfalls: [
    "Using TOF with the rung logic backwards. It times when the rung goes false, so do not invert the condition to compensate.",
    "Putting two timer instructions on one tag.",
    "Expecting a TON to total up several short pulses. It resets each time the rung drops.",
    "Forgetting RES on an RTO, so it never restarts.",
    "Using a self-resetting timer's DN as a signal in another task, where it may be missed.",
    "Putting a timer in code that is not scanned and then wondering why it froze.",
    "Entering PRE as seconds. It is milliseconds."
  ],

  keyTerms: ["ton", "tof", "rto", "timer-structure", "debounce", "res-instruction"],

  quiz: [
    {
      q: "A TON has PRE = 4000. Its rung is true for 3.9 s, false for 1 s, then true for 3.9 s. When does DN turn on?",
      options: ["After the second 3.9 s", "Never, because the rung dropped", "After 7.8 s total", "At the moment the rung first goes true"],
      answer: 1,
      explain: [
        "The accumulator reset when the rung dropped.",
        "Correct. A TON is non-retentive. Each period is shorter than 4 s, so DN never sets.",
        "TON does not total separate periods. An RTO would.",
        "DN sets only when ACC reaches PRE."
      ]
    },
    {
      q: "A TOF tag has PRE = 30000. The rung goes false at t = 0. When does DN drop?",
      options: ["Immediately", "At 30 seconds if the rung stays false", "At 30 milliseconds", "Never, until RES"],
      answer: 1,
      explain: [
        "DN follows the rung up but lags it on the way down.",
        "Correct. TOF times while the rung is false and clears DN at PRE.",
        "PRE is in milliseconds, so 30000 is 30 seconds.",
        "TOF needs no RES."
      ]
    },
    {
      q: "You need total pump run-time that survives stops and power cycles. Which is right?",
      options: ["TON", "TOF", "RTO with a RES for reset", "CTU on the pump rung"],
      answer: 2,
      explain: [
        "TON resets when the pump stops.",
        "TOF times while off.",
        "Correct. RTO holds ACC when the rung is false, and RES clears it on purpose.",
        "A CTU counts events, not time."
      ]
    },
    {
      q: "`XIO(Tick.DN) TON(Tick,1000,0)` is used as a once-per-second pulse. What is a risk?",
      options: ["It never fires", "A rung in a different task may miss the one-scan pulse", "The timer overflows after 1000 uses", "DN can never be examined"],
      answer: 1,
      explain: [
        "It does fire, roughly once per second.",
        "Correct. DN is true for about one scan, so consumers must be in the right place to see it.",
        "There is no use counter.",
        "DN can be examined like any bit."
      ]
    },
    {
      q: "The preset for a 2 minute delay is entered as:",
      options: ["2", "120", "12000", "120000"],
      answer: 3,
      explain: [
        "That is 2 ms.",
        "That is 120 ms.",
        "That is 12 s.",
        "Correct. 2 minutes is 120 seconds, and PRE is milliseconds."
      ]
    },
    {
      q: "In the two-timer flasher, why does Flash_On get an XIO of Flash_Off.DN?",
      options: ["To make it seal in", "To reset Flash_On at the end of the cycle so the pattern repeats", "To invert the lamp", "To delay the lamp by 500 ms"],
      answer: 1,
      explain: [
        "There is no seal-in involved.",
        "Correct. When Flash_Off finishes it breaks Flash_On's rung, and everything restarts.",
        "The lamp is driven by Flash_On.DN.",
        "The first timer provides the initial delay."
      ]
    }
  ],

  resources: [
    { title: "Timer and Counter Instructions (Studio 5000 Logix Designer v37)", url: "https://www.rockwellautomation.com/en-dk/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/timer-and-counter-instructions.html", type: "docs", source: "Rockwell Automation" },
    { title: "Timer On Delay (TON)", url: "https://www.rockwellautomation.com/en-in/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/timer-and-counter-instructions/timer-on-delay--ton-.html", type: "docs", source: "Rockwell Automation" },
    { title: "Timer Off Delay (TOF)", url: "https://www.rockwellautomation.com/en-ie/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/timer-and-counter-instructions/timer-off-delay--tof-.html", type: "docs", source: "Rockwell Automation" },
    { title: "Retentive Timer On (RTO)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/timer-and-counter-instructions/retentive-timer-on--rto-.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers General Instructions Reference Manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm018_-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
