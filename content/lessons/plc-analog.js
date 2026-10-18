LC.lesson({
  id: "plc-analog",
  title: "Analog scaling, alarm limits and deadband",
  track: "plc",
  minutes: 25,
  level: 2,
  prereqs: ["plc-compare-math", "found-signals"],
  tags: ["analog", "scaling", "scp", "alarms", "deadband", "4-20ma", "logix"],
  summary: "How a 4-20 mA current becomes 5.0 meters of water on a screen, and how to alarm on it without chattering.",
  objectives: [
    "Convert raw analog counts to engineering units with y = mx + b and with the SCP instruction",
    "Choose between module-level scaling and scaling in logic, and say what each costs you",
    "Use under-range, over-range and wire-off status to tell a bad signal from a bad process",
    "Build HH/H/L/LL alarms with an on-delay and a deadband so they do not chatter",
    "Recognize when to use the ALMA and ALMD instructions instead of hand-built alarm logic"
  ],

  body: `
## Why analog needs its own lesson

A discrete input is a bit. An analog input is a number the PLC invents from a current or voltage, and every step of that invention can go wrong: wrong range, wrong scaling, a broken wire that looks like "0 percent level." Alarms add a second problem. A level that hovers at the alarm limit will flip the alarm on and off hundreds of times unless you design against it. This lesson covers the path from wire to alarm, in the order the data travels.

## From milliamps to counts

A {{term:4-20-ma|4-20 mA}} transmitter sends a current proportional to the measurement. 4 mA means the bottom of the calibrated range and 20 mA means the top. The "live zero" at 4 mA is deliberate: 0 mA can only mean a broken loop, so a dead wire is distinguishable from a real low reading.

The analog input module has an ADC (analog-to-digital converter) that turns the current into an integer called **raw counts**. The count range depends on the module and the range you choose in its configuration. **Counts are module-specific. ControlLogix 1756/5069 analog modules usually scale to engineering units in the module**, so read your module's manual for the real mapping. This course uses one teaching card throughout: a 1769-IF4-style raw scale where 0 to 21 mA spans 0 to 32,767 counts.

> [!example] Level transmitter LT101 on the Plant 1 batching tank
> On the teaching card, 4 mA is **6,242** counts and 20 mA is **31,208** counts (21 mA is 32,767). LT101 is ranged **0 to 5.0 m**. A reading of 18,725 counts sits in the middle of the span, so the level is 2.5 m. (On the P&ID it is LT-101. In PLC and Ignition names the hyphen is dropped: \`LT101\`.)

## Scaling: y = mx + b

Scaling is a straight line through two known points. Raw counts are x, engineering units (EU) are y.

\`\`\`text
m = (EU_high - EU_low) / (Raw_high - Raw_low)
y = m * (x - Raw_low) + EU_low
\`\`\`

With LT101: m = 5.0 / (31208 - 6242) = 5.0 / 24966 = 0.0002003 m per count. For x = 18725, y = 0.0002003 x (18725 - 6242) = 2.5 m. Equivalent form: y = 0.0002003x - 1.25, so b is -1.25 m. That negative offset is why a dead loop (0 counts) scales to -1.25 m instead of 0, which is a useful tell.

{{diagram:scaling}}

### The SCP instruction

Logix has a one-instruction version called {{term:scp-instruction|SCP}} (Scale). Its parameters are the input value, the input min and max, the scaled min and max, and the output:

\`\`\`st
// Structured Text form. In ladder, the same arguments go in the SCP box.
SCP(LT101_Raw, 6242, 31208, 0.0, 5.0, LT101_Level);
\`\`\`

Do the math on an out-of-range input: 2,000 counts extrapolates to about -0.85 m. Check your Logix Designer instruction help to see whether SCP clamps the output or lets it run past the scaled endpoints. Decide on purpose, because the unclamped value is what tells you the loop is broken.

You can also write the math by hand with CPT (compute) or in ST. That is slightly faster to review when the scaling has an offset or a square-root flow calculation.

## Module-level scaling

Modern Logix analog modules such as the 5069-IF8 (Compact 5000 I/O) and the 1756 analog family can scale for you. In the module's properties in Studio 5000 Logix Designer you set the input range (for example 4-20 mA), then the low and high **signal** values and the low and high **engineering units**. The module then returns a REAL (floating point) value in the I/O tag, such as \`Local:3:I.Ch0Data\`, already in meters.

| | Module-level scaling | Scaling in logic (SCP/CPT) |
|---|---|---|
| Where the numbers live | Module configuration | Tags or constants in code |
| Visible in code review | No: hidden in the I/O tree | Yes: next to the logic |
| Change without download | Needs a reconfiguration of the module | Edit a tag value |
| Per-channel cost | None | One instruction per channel |
| Works when the module is swapped | Only if the config is copied | Yes |

Many integrators scale in logic into a UDT member (the AnalogIn UDT in {{lesson:plc-udt}} holds the raw value, EU low, EU high and the scaled PV). The reason is auditability: the scaling constants sit with the tag, appear in the faceplate for a technician to adjust, and survive a module replacement. Module scaling is fine for a small machine where nobody will ever touch it. Pick one approach per project and write it in the standard.

## Under-range, over-range and wire-off

A 4-20 mA loop is meant to stay between 4 and 20 mA. Outside that, something is wrong or the measurement is saturated. The course uses one table, **NAMUR NE43**, for the current ranges:

| Current | Meaning | Treat as |
|---|---|---|
| 3.8 to 20.5 mA | Measurement range (3.8 to 4 and 20 to 20.5 are slight under- and over-range) | Good, clamp for display |
| 3.6 to 3.8 or 20.5 to 21 mA | Indeterminate | Uncertain quality, alarm after a delay |
| below 3.6 or above 21 mA | Device or loop failure | Bad quality, fail-safe action |

A wire-off or open loop reads about 0 mA, which is far below 3.6 mA: broken wire, blown fuse, dead transmitter or no loop power. On the teaching card, 3.8 mA is about 5,930 counts and 3.6 mA is about 5,617 counts. Many NAMUR-style transmitters deliberately drive a failure current outside the measurement range when they detect an internal fault. The exact thresholds vary by module and instrument, so confirm them in the instrument and module documentation.

Modules report these conditions as status bits on the channel, typically under-range and over-range flags, and some modules add open-wire detection when the input type supports it. Use the status bit first. In logic you can also check the raw count yourself, as a second test that does not depend on the module:

\`\`\`ladder
LES(LT101_Raw,5617) OTE(LT101_BadSignal)
\`\`\`

A bad-signal flag should do three things. It shows the operator that the value is suspect, it forces a fail-safe behavior (a bad level must not start a pump), and it prevents the alarm logic below from reporting a process alarm that is really an instrument fault. Latch the last good value if the process needs one, but never hide the fault.

## HH, H, L, LL alarms

Process alarms are comparisons against limits, normally four of them:

- **HH** (high-high) and **LL** (low-low): critical, often tied to an interlock or trip.
- **H** (high) and **L** (low): warnings that give the operator time to act.

Naive logic is \`GRT(LT101_Level, 4.0) OTE(LT101_H)\`. It fails in two ways. A noisy signal brushes 4.0 and the alarm flickers. And when the level hovers at 3.99 to 4.01, the operator is told a hundred times.

### On-delay and deadband

Two cheap fixes solve nearly all of it.

1. **On-delay**: the condition must hold for a time, say 3 seconds, before the alarm sets. A one-scan noise spike never becomes an alarm. Use a TON ({{lesson:plc-timers}}).
2. **Deadband** (also called hysteresis): the alarm sets at the limit but clears only after the value has moved a margin back inside. With H = 4.0 m and a deadband of 0.1 m, the alarm sets at 4.0 and clears at 3.9.

\`\`\`st
// High alarm with 3 s on-delay and 0.1 m deadband
Cond_H := (LT101_Level >= H_Limit) OR (H_Alarm AND (LT101_Level > (H_Limit - H_Deadband)));
HiTmr.PRE := 3000;       // 3 s on-delay (TIMER tag)
HiTmr.TimerEnable := Cond_H;   // drives the timer's enable bit
TON(HiTmr);
H_Alarm := HiTmr.DN;
\`\`\`

The second term in Cond_H is the memory: once the alarm is on, the condition stays true until the value drops below 3.9. A common mistake is putting the on-delay after the deadband, which makes the clear delayed too. Size the deadband to your noise: 1 to 2 percent of span for a quiet level, more for a bouncy flow. The {{sim:sim-alarm-deadband}} challenge lets you watch a signal cross a limit with and without the deadband.

{{diagram:alarm}}

> [!warning] Alarm limits are data, not constants
> Put limits, deadbands and delays in tags (a Cfg group of the UDT), not in compare instructions. Operators and engineers will retune them from a faceplate, and the same logic should then serve every tank.

## ALMA and ALMD

Hand-built alarms get you the basics. Logix also ships {{term:alma-almd|ALMA and ALMD}}, built-in alarm instructions for analog (ALMA) and digital (ALMD) points. ALMA carries HH/H/L/LL limits, deadband, on-delay, rate-of-change, severity, and operator actions such as acknowledge, suppress and shelve. They also feed FactoryTalk alarm and event servers directly, and their state model lines up with ISA-18.2 ideas in {{lesson:int-alarm-mgmt}}. If your HMI is Ignition, you may prefer to keep PLC alarms as simple status bits and let Ignition alarming do the notification and history, or you may use ALMA/ALMD for protected, PLC-side alarm state. Decide that in the standard. Either way, the lesson above still applies: the instruction needs a clean scaled value and a sane bad-signal strategy in front of it.

## Practice

Use {{sim:sim-scp}} to scale a 4-20 mA signal and confirm a mid-scale count lands at the expected value. Then use {{sim:sim-alarm-deadband}} to build the high alarm with delay and deadband.
`,

  eli5: `
Imagine a thermometer taped to a window that only tells you how far the red line is from the bottom, as a ruler measurement: 3 centimeters, 7 centimeters. That's not a temperature yet. To get degrees you need to know that 0 cm means 0 degrees and 10 cm means 50 degrees. Doing that conversion is scaling.

Now imagine a smoke detector that beeps the moment the kitchen gets slightly warm, then stops, then beeps again as you open and close the oven. Annoying. A better one waits a few seconds before beeping, and once it starts, refuses to stop until the room has clearly cooled down. The waiting is the on-delay. The "clearly cooled" gap is the deadband.

Finally, the ruler only starts at 4 centimeters on purpose. If you ever read 0, you know the thermometer fell off the window rather than the room being cold.
`,

  why: `
**Why 4 mA and not 0 mA?** The live zero makes a dead loop distinguishable from a real minimum. A level of 0 percent and a cut wire look identical on a 0-20 mA loop. On 4-20 mA, one is 4 mA and the other is 0. Every sensible bad-signal check in your code relies on that gap. It's also why the instrument can power itself from the loop.

**Why scale in logic rather than in the module?** It's an argument you will hear. Module scaling is quick and keeps the logic clean. Logic scaling keeps the numbers where the maintenance person can see and change them, makes the scaling identical across module brands, and survives a hardware swap. Integrators who build large systems choose logic scaling into a UDT because the faceplate in Ignition can then show and edit the range directly.

**Why deadband and on-delay both?** They fix different faults. The on-delay filters short spikes. The deadband stops the alarm from toggling when the value rests near the limit. Using only one leaves you with either flickering at the boundary or a delayed alarm with no hysteresis. Cost is minimal; the benefit is a quieter alarm list, which matters because operators ignore alarm lists that scream.

**Why separate bad signal from process alarm?** If the transmitter dies low and your L alarm fires, the operator goes to look at the tank. The right response is to call instrumentation. Mixing them sends people to the wrong place and, worse, trains operators to distrust alarms.
`,

  history: `
The 4-20 mA current loop became the dominant analog signal in process plants in the 1960s and 70s, replacing pneumatic 3-15 psi signaling. Current survives long cable runs and electrical noise better than voltage, and a single loop can power the transmitter. Analog scaling on early PLCs was done by hand-written math on 12-bit integers. Logix added the SCP instruction and later let analog modules scale on their own, and ALMA/ALMD brought ISA-18.2-style alarm states into the controller.
`,

  examples: [
    {
      title: "Scaling a 0-150 PSI pressure transmitter",
      body: `On the teaching card the raw range is 6242 to 31208 and the EU range is 0 to 150 PSI. m = 150 / 24966 = 0.006008 PSI per count. A raw reading of 18,725 (mid-span) gives 0.006008 x (18725 - 6242) = 75.0 PSI. In ST: \`SCP(Press_Raw, 6242, 31208, 0.0, 150.0, Press_PSI);\``
    },
    {
      title: "Alarm timeline with deadband",
      body: `LT101 H limit 4.0 m, deadband 0.1 m, on-delay 3 s. The level crosses 4.0 at t=0 and stays above. At t=3 s the alarm sets. Later the level falls to 3.95 m: the alarm stays on, because it must drop below 3.9. It clears at 3.89. A noisy 4.01/3.99 flicker never gets past the 3 s delay, so no alarm at all.`
    }
  ],

  diagrams: {
    scaling: `<svg viewBox="0 0 640 230" role="img" aria-label="Scaling line mapping raw counts 6242 to 31208 onto 0 to 5.0 meters, with the bad-signal region below 5617">
  <line class="dg-line" x1="70" y1="190" x2="600" y2="190"/>
  <line class="dg-line" x1="70" y1="190" x2="70" y2="30"/>
  <text class="dg-text-sm" x="300" y="222">Raw counts (x)</text>
  <text class="dg-text-sm" x="14" y="24">Level (m)</text>
  <line class="dg-line-accent" x1="150" y1="170" x2="560" y2="50"/>
  <circle class="dg-fill-accent" cx="150" cy="170" r="5"/>
  <circle class="dg-fill-accent" cx="560" cy="50" r="5"/>
  <text class="dg-text-mono" x="86" y="160">6242 = 0 m</text>
  <text class="dg-text-mono" x="430" y="42">31208 = 5.0 m</text>
  <line class="dg-dash" x1="355" y1="190" x2="355" y2="110"/>
  <line class="dg-dash" x1="70" y1="110" x2="355" y2="110"/>
  <text class="dg-text-sm" x="362" y="150">18725 = 2.5 m</text>
  <rect class="dg-box-alarm" x="72" y="196" width="76" height="14" rx="3"/>
  <text class="dg-text-sm" x="152" y="208">below 5617: bad signal</text>
</svg>`,
    alarm: `<svg viewBox="0 0 640 240" role="img" aria-label="Level signal crossing the H limit, alarm setting after the on-delay and clearing below limit minus deadband">
  <line class="dg-line-thin" x1="40" y1="60" x2="610" y2="60"/>
  <text class="dg-text-sm" x="44" y="52">H limit 4.0 m</text>
  <line class="dg-line-thin" x1="40" y1="90" x2="610" y2="90"/>
  <text class="dg-text-sm" x="44" y="106">Clear point 3.9 (deadband 0.1)</text>
  <polyline class="dg-line-accent" fill="none" points="40,130 120,110 170,56 190,70 210,50 260,40 330,58 400,76 450,64 500,86 540,110 600,130"/>
  <line class="dg-dash" x1="170" y1="30" x2="170" y2="190"/>
  <text class="dg-text-sm" x="132" y="24">crosses H</text>
  <line class="dg-dash" x1="290" y1="30" x2="290" y2="190"/>
  <text class="dg-text-sm" x="236" y="24">+3 s: alarm sets</text>
  <line class="dg-dash" x1="520" y1="30" x2="520" y2="190"/>
  <text class="dg-text-sm" x="478" y="24">below 3.9: clears</text>
  <rect class="dg-box" x="40" y="200" width="250" height="24" rx="3"/>
  <rect class="dg-box-alarm" x="290" y="200" width="230" height="24" rx="3"/>
  <rect class="dg-box" x="520" y="200" width="90" height="24" rx="3"/>
  <text class="dg-text-sm" x="300" y="217">H_Alarm = 1</text>
</svg>`
  },

  pitfalls: [
    "Scaling with integer math, so everything rounds to whole units. Use REAL for the scaled value.",
    "Hard-coding scaling constants and limits in instructions instead of tags.",
    "No under-range or wire-off check, so a cut wire reads as an empty tank and starts the fill pump.",
    "Alarm with no deadband, which chatters at the limit and fills the alarm journal.",
    "Setting the deadband larger than the gap between H and HH, so the two alarms overlap and confuse the operator.",
    "Scaling a 1-5 V or 0-10 V module the same way as 4-20 mA. The raw endpoints differ."
  ],

  keyTerms: ["4-20-ma", "scaling", "scp-instruction", "engineering-units", "deadband", "alarm-limits", "alma-almd"],

  quiz: [
    {
      q: "A 4-20 mA input reports 6,242 counts at 4 mA and 31,208 at 20 mA. The range is 0 to 5.0 m. What is the level at 18,725 counts?",
      options: ["About 3.0 m", "About 0.6 m", "About 5.0 m", "About 2.5 m"],
      answer: 3,
      explain: [
        "That scales 18,725 / 31,208 against the span and ignores the 4 mA offset.",
        "This is the fraction of the full count range, 18,725 / 32,767, never mapped onto the EU span.",
        "5.0 m is the top of the span, which is 31,208 counts.",
        "Correct. (18725 - 6242) x 5.0 / 24966 = 2.5 m, the midpoint of the span."
      ]
    },
    {
      q: "Why is the signal 4-20 mA instead of 0-20 mA?",
      options: ["A broken loop (0 mA) can be told apart from a real minimum reading", "Lower current uses less power", "The ADC cannot read below 4 mA", "It makes the scaling math simpler"],
      answer: 0,
      explain: [
        "Correct. The live zero means 0 mA can only be a fault, not a real measurement.",
        "Power use is not the reason.",
        "The module can read below 4 mA. That is how it detects under-range and wire-off.",
        "It makes the math include an offset, so it is slightly more work."
      ]
    },
    {
      q: "A level alarm toggles on and off many times a minute while the level sits near the H limit. Which change addresses this most directly?",
      options: ["Add an on-delay only", "Raise the H limit", "Add a deadband so it clears below the limit minus a margin", "Change the HMI refresh rate"],
      answer: 2,
      explain: [
        "An on-delay stops the set from spikes, but the alarm can still chatter once it is stable around the limit.",
        "This moves the problem but does not remove it.",
        "Correct. Hysteresis keeps the alarm set until the value is clearly back inside the limit.",
        "The HMI only displays the state. The chatter is in the PLC logic."
      ]
    },
    {
      q: "The level transmitter wire is cut. What should your logic do?",
      options: ["Report 0 percent level and start filling", "Flag a bad signal, alert the operator and take the fail-safe action", "Hold the last value silently", "Nothing: the L alarm will report it"],
      answer: 1,
      explain: [
        "That is the dangerous failure: a cut wire read as a real empty tank.",
        "Correct. Make the fault visible, separate it from a process alarm, and fail safe.",
        "Hiding the fault means nobody fixes it.",
        "An L alarm sends operators to the tank when the problem is the instrument."
      ]
    },
    {
      q: "What is the main argument for scaling in logic into a UDT instead of at the module?",
      options: ["It is faster to execute", "The ranges are visible, editable from a faceplate and survive a module swap", "Modules cannot scale", "SCP is required by the standard"],
      answer: 1,
      explain: [
        "Execution time is negligible either way.",
        "Correct. Auditability and maintainability are the real reason.",
        "Modern Logix analog modules can scale.",
        "Nothing requires SCP. It is a convenience."
      ]
    },
    {
      q: "Where should alarm limits, deadband and delay live?",
      options: ["In constants inside compare instructions", "In tags, grouped in the equipment's Cfg structure", "In the HMI only", "In the module configuration"],
      answer: 1,
      explain: [
        "Constants require an online edit or download to retune.",
        "Correct. Tags can be tuned from a faceplate and reused across instances.",
        "The PLC logic needs the values, and the HMI would be a single point of truth the PLC cannot see.",
        "Module configuration has its own alarm limits, but they are not the place for process alarm tuning."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers I/O and Tag Data", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm004_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Function Block Diagram (includes process instructions)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm009_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "PlantPAx Process Solutions Technical Documentation", url: "https://www.rockwellautomation.com/en-us/support/documentation/technical/capabilities/plantpax-process-solutions.html", type: "docs", source: "Rockwell Automation" }
  ]
});
