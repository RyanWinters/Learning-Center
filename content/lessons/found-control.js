LC.lesson({
  id: "found-control",
  title: "Control basics: loops, on/off and PID",
  track: "found",
  minutes: 20,
  level: 2,
  prereqs: ["found-signals"],
  tags: ["control", "pid", "loops", "tuning", "setpoint"],
  summary: "Every automatic control strategy is a loop: measure, compare, act. Learn the two workhorses, on/off with hysteresis and PID, and where each one runs.",
  objectives: [
    "Tell open-loop from closed-loop control and name the parts of a feedback loop",
    "Size a hysteresis band for an on/off controller and explain why it exists",
    "Describe what the P, I and D terms each do using a tank or heater",
    "Recognize integral windup and the usual defenses",
    "Say where PID runs (PLC, DCS, drive) and why Ignition normally only writes the setpoint",
    "Outline how Ziegler-Nichols and lambda tuning differ at awareness level"
  ],

  body: `
## Why control theory shows up in an integration job

A {{term:plc|PLC}} (programmable logic controller) program that starts motors is sequence logic. A loop that holds a tank at 60% level, a heater at 80 C or a header at 4.5 bar is something else: it has to keep deciding how hard to push. Most plants have both, and the operators' complaints about the second kind ("the level keeps swinging") land on whoever built the screen (the HMI, or human-machine interface, in SCADA, supervisory control and data acquisition, terms). You do not need to derive transfer functions to be useful. You need to know what the controller is doing, which numbers matter, and where to look when a loop misbehaves.

## Open loop and closed loop

An **open-loop** system acts without checking the result. A timer that runs a fill valve for 40 seconds is open loop. It works only while the pump, the supply pressure and the tank never change.

A **closed-loop** (feedback) system measures the result and corrects it. Four parts appear every time:

{{diagram:loop}}

| Part | Tank level example | Symbol you will see |
|---|---|---|
| {{term:process-variable|Process variable (PV)}} | measured level, 52% | PV |
| {{term:setpoint|Setpoint (SP)}} | wanted level, 60% | SP |
| Error | SP minus PV = 8% | e |
| Controller output (CV, "control variable") | valve position, 0-100% | CV or OUT |

The controller computes the error each scan and moves the output to shrink it. The transmitter, the valve and the vessel together are "the process" as the controller sees it. Whatever delay or lag they have decides how aggressively you can tune.

## On/off control with hysteresis

The simplest closed loop is a thermostat. Heater on when cold, off when hot. If you switch exactly at the setpoint, the output chatters: the temperature touches 60.0, the heater drops out, the reading ticks to 59.9, the heater pulls in again. Contactors and relays die from that.

The fix is **{{term:hysteresis|hysteresis}}** (also called a deadband or differential): two thresholds instead of one.

{{diagram:hyst}}

> [!example] Heater with a 4 C band
> Setpoint 60 C, hysteresis 4 C, so the band is 58 to 62. The heater turns **on** when the temperature falls below 58 and turns **off** when it rises above 62. In between it keeps whatever state it had, which means the logic needs memory (a latch, or the output reads itself back). A heater that gains 1 C per minute and loses 0.5 C per minute cycles roughly every 12 minutes: 4 minutes heating, 8 minutes cooling. Widening the band to 8 C doubles the cycle time and halves the switching wear, at the cost of a wider temperature swing.

On/off is right when the process is slow, the actuator is on/off anyway (a heater contactor, a compressor, a sump pump) and the product tolerates the swing. Alarms use the same idea under the name deadband (see {{lesson:int-alarm-mgmt}}).

## PID in plain terms

When the actuator is modulating (a valve, a drive speed, an SCR heater, where an SCR is a silicon controlled rectifier power controller) you can do much better than slamming it between two states. **{{term:pid|PID}}** computes the output from three views of the error:

\`\`\`text
OUT = Kp * e  +  Ki * (sum of e over time)  +  Kd * (how fast e is changing)
\`\`\`

| Term | What it looks at | Behavior | Too much gives you |
|---|---|---|---|
| **P**roportional | the error right now | Output proportional to error: big gap, big push | Offset if used alone, then oscillation at high gain |
| **I**ntegral | how long the error has persisted | Keeps ramping the output until error is zero | Slow rolling oscillation, overshoot, windup |
| **D**erivative | how fast the error is changing | Brakes the output when PV approaches SP quickly | Noise amplification, twitchy valves |

> [!example] Level loop with real numbers
> A tank is at 52% with a 60% setpoint, so e = 8%. With Kp = 2.0 (output % per error %) the P term alone asks for 16% valve opening. As the level rises, e shrinks, and the P output shrinks with it. Suppose the valve opening that exactly balances the outflow is 14%. A pure P controller can only hold 14% output if Kp * e = 14, so e = 14 / 2.0 = 7%. The level therefore settles at 60 - 7 = **53%**, below setpoint, and stays there. That steady gap is **offset**. The integral term fixes it: as long as any error remains, I keeps adding output until the level reaches 60% and the error is zero.

Most real loops are **PI**. Flow and pressure loops often use PI with a very fast integral time. Level loops are often P-heavy by design because you want the tank to absorb flow swings, not pass them downstream. Derivative is for slow, lag-heavy loops such as temperature, and is the term most often left at zero.

Integral is usually expressed as **reset**: *Ti* in minutes per repeat or repeats per minute. Controllers differ (gain vs proportional band, minutes vs seconds, series vs parallel form), so when you copy numbers from one system to another, check the units first.

### Controller action and valve fail position

Two settings decide whether a new loop drives the right way at all, and both are the usual cause of a loop that runs away on first commissioning.

- **Controller action.** *Reverse acting* means the output goes up when PV falls below SP (in effect, the sign of the gain). A level loop that fills a tank through an inlet valve is reverse acting: low level, open the valve. *Direct acting* means the output goes up when PV rises. A level loop that drains the tank through an outlet valve is direct acting: high level, open the valve. A cooling loop is usually direct acting and a heating loop reverse acting. Vendors name and sign this differently, so check the block's documentation.
- **Valve fail position.** An air-to-open valve fails closed on loss of air. An air-to-close valve fails open. This is a safety choice made on the datasheet (see {{lesson:found-devices}}), and it also decides how the 4-20 mA output maps to flow: 4 mA is closed on an air-to-open valve and fully open on an air-to-close one. If the action or the mapping is wrong, the valve opens when it should close and the error grows instead of shrinking.

Before you tune, stroke the valve from the HMI and watch the PV move the right way. The same check appears in {{lesson:int-commissioning}}.

### Integral windup

Suppose the valve is fully open (100%) and the level is still below setpoint, because the supply pump is off. The error never closes, so the integral term keeps accumulating. When the pump starts, the level overshoots the setpoint, and the integral has to be unwound by an equal and opposite error before the valve can close. The tank overflows.

Defenses, in order of how often you will see them:

1. **Output clamping with anti-windup**: stop integrating when the output is at its limit. Built into PIDE and DCS blocks (check the manual for the basic PID instruction in your version), but make sure limits are set.
2. **Tracking / tieback**: feed the real valve position back so the block knows what the output actually did.
3. **Initialize on mode change**: when the loop goes from manual to auto, the block must start from the current output, not from zero. This is called bumpless transfer.

## Beyond a single loop

- **{{term:cascade-control|Cascade}}**: a master loop sets the setpoint of a faster slave loop. A reactor temperature controller (slow) outputs the setpoint for a jacket-temperature controller (fast), which drives the steam valve. Disturbances in steam pressure get corrected by the fast inner loop before they reach the reactor.
- **{{term:feedforward|Feedforward}}**: use a measured disturbance to act before the PV moves. A boiler drum level loop adds steam flow to its output, because a jump in steam demand is going to drop the level.
- **Ratio**: hold one flow proportional to another, such as air to fuel or additive to base.
- **Split range**: one controller output drives two valves, for example a heating valve at 0-50% and a cooling valve at 50-100%.

## Where PID runs

| Platform | Typical block | Notes |
|---|---|---|
| ControlLogix / CompactLogix | **PID** (ladder/ST) or **{{term:pide|PIDE}}** (function block) | PIDE (enhanced PID) adds scaling, alarms, modes (manual, auto, cascade), tieback and windup handling. The usual choice in new code. |
| {{term:dcs|DCS}} (DeltaV, PCS 7, Experion) | PID function block in the controller | Faceplates, modes, alarms and tuning tools come with it. |
| VFD (drive) | Built-in PID parameter group | Handy for a stand-alone pump or fan holding pressure with no PLC in the loop. |
| Ignition | Not a control platform | Writes SP and mode, reads PV and OUT. |

Keep the loop in the controller. A PLC scans in milliseconds, in a deterministic task. A gateway reads over a network with variable latency and can restart, lose a connection or be patched. Closing a control loop through a screen is how plants get oscillating valves and, eventually, an incident report. Ignition's job is the faceplate: setpoint entry, auto/manual, alarm limits, trend of PV, SP and OUT, and (with the right permissions) tuning parameters.

## Tuning at awareness level

Tuning means choosing Kp, Ti and Td so the loop responds quickly without ringing. Two methods you will hear named:

**Ziegler-Nichols (1942).** Either (a) raise gain with I and D off until the loop sustains an oscillation, note that **ultimate gain Ku** and period **Pu**, then set Kp = 0.6 Ku, Ti = Pu / 2, Td = Pu / 8; or (b) make a step change in manual, read the dead time L and time constant T off the response, and apply tabulated formulas. It is fast to apply, aggressive (a quarter-decay response with sizable overshoot) and not something to do to a live pressure loop.

**Lambda tuning.** You pick the closed-loop speed you want, called lambda, as a multiple of the process time constant (check your tuning reference for sensible multiples). Set Ti equal to the process time constant and choose gain so that the loop settles in about that lambda time. A large lambda gives a slow, gentle response with no overshoot, which is perfect for a level loop that should not upset downstream units. Lambda is popular in process plants because the engineer picks the behavior instead of getting whatever the process gives.

In practice, many loops are tuned by a patient technician making small changes and watching a trend, or by auto-tune tools in the PLC or DCS. A common sequence: step the output in manual, record the PV trend, estimate dead time and time constant, then compute starting values and refine. Trend PV, SP and OUT together at a one-second sample rate. That chart is the loop's medical record.

> [!tip] Before you retune anything
> Check the field first. A sticky valve, a transmitter with heavy damping or a loose positioner makes any tuning look bad. If the PV oscillates with a fixed period and the output moves in small jumps, suspect the valve before suspecting the numbers.
`,

  eli5: `
Think about filling a bathtub to a line you drew on the wall, with your eyes closed except when you peek.

If you just count to sixty with the tap open and then stop, that is open loop. It only works if the tap flow is always the same.

Now you peek. If the water is far below the line, you open the tap wide. As it gets close, you turn the tap down. That "push harder when far away" idea is the P part of PID. But you notice the water stops a little short of the line, because a tiny trickle still drains out. So you think, "it has been short for a while now, open the tap a bit more." That is the I part: patience turns into extra push. And if the water is racing up toward the line, you ease off early so it does not slosh over the top. That is the D part.

A simple thermostat is the cheap version: tap fully on below one mark, fully off above a second mark a little higher, so it is not flicking on and off every second. That gap between the two marks is hysteresis.
`,

  why: `
**Why hysteresis instead of a single switch point?** A real signal has noise, and a real actuator has wear. With one threshold, noise of a tenth of a degree can toggle a contactor dozens of times a minute. A contactor is rated for a finite number of operations, and a compressor can be damaged by short cycling. The band trades a little accuracy for equipment life. Integrators argue about how wide to go, and the answer comes from process tolerance and the minimum on/off time the equipment allows.

**Why PI and not full PID?** Derivative works on the rate of change, and a noisy 4-20 mA signal has a large, meaningless rate of change. D amplifies noise into valve chatter, which wears actuators. So D is only worth it on slow, smooth processes such as heat exchangers and large temperature loops. Many experienced hands run PI everywhere and add D only when they can show it helps.

**Why keep the loop out of the SCADA layer?** Latency and failure modes. A PLC loop keeps running if the gateway is down for patching. A loop through a gateway stops, and the valve either freezes or goes to whatever the last written value was. The rule is that anything that must run to keep the process safe must run in the controller. The screen only adjusts targets.

**Why are people so careful about modes?** Auto, manual and cascade each have a different source for the output. The usual start-up bug is a loop that jumps when switched, because the block did not initialize to the current output. That is why PIDE and DCS blocks have tieback and bumpless-transfer behavior built in, and why you should never write your own PID block unless you have a reason.
`,

  history: `
Pneumatic controllers with proportional, reset and rate action were common in process plants by the 1930s and 40s. Ziegler and Nichols published their tuning rules in a 1942 ASME paper, written around those pneumatic controllers. Electronic analog controllers followed, then single-loop digital controllers in the 1970s, and DCS products in the mid-1970s moved PID into software blocks. PLCs added PID instructions in the 1980s so a machine builder no longer needed a separate controller for a temperature zone.
`,

  examples: [
    {
      title: "Wastewater wet well with lead pump on a VFD",
      body: `Level transmitter LT-201 (written LT201 in the PLC) reads 0-5 m as 4-20 mA. Setpoint is 2.5 m. A PIDE block in the PLC drives pump speed 30-100% (a minimum speed keeps flow above scour velocity). The level loop is deliberately gentle, with a large lambda (a slow closed-loop response compared with the well's fill time), so inflow surges are absorbed instead of passed to the treatment plant. Ignition (the SCADA platform) shows PV, SP, OUT and mode, lets the operator change SP from 2.0 to 3.0 m, and alarms on high level at 4.2 m. The PLC also has an independent float switch as a hard high-level trip.`
    },
    {
      title: "Spotting windup on a trend",
      body: `A mixing tank temperature loop sits at 100% steam output for ten minutes while the steam header is isolated. When the header opens, the temperature climbs past the 70 C setpoint to 81 C before the output finally drops to zero, then undershoots. The trend shows OUT pinned at 100 while the PV was below SP, and the overshoot lasting about as long as the pinned period. That pattern points to windup. The fix is to enable the anti-windup limits in the block and add a permissive that holds the loop in manual when the header is isolated.`
    }
  ],

  diagrams: {
    loop: `<svg viewBox="0 0 640 200" role="img" aria-label="A feedback loop: setpoint and measured value are compared, the controller drives a valve, the process responds, and a transmitter feeds the measurement back">
  <defs>
    <marker id="found-control-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-text" x="16" y="62">SP</text>
  <path class="dg-line" d="M44 66 L92 66" marker-end="url(#found-control-ah)"/>
  <circle class="dg-box" cx="110" cy="66" r="18"/>
  <text class="dg-text-sm dg-mid" x="84" y="56">+</text>
  <text class="dg-text-sm dg-mid" x="124" y="98">-</text>
  <path class="dg-line" d="M128 66 L168 66" marker-end="url(#found-control-ah)"/>
  <text class="dg-text-sm" x="136" y="56">error</text>
  <rect class="dg-box-accent" x="170" y="44" width="110" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="225" y="64">Controller</text>
  <text class="dg-text-sm dg-mid" x="225" y="80">PID</text>
  <path class="dg-line" d="M280 66 L328 66" marker-end="url(#found-control-ah)"/>
  <text class="dg-text-sm" x="284" y="56">OUT</text>
  <rect class="dg-box" x="330" y="44" width="100" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="380" y="72">Valve</text>
  <path class="dg-line" d="M430 66 L478 66" marker-end="url(#found-control-ah)"/>
  <rect class="dg-box" x="480" y="44" width="110" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="535" y="72">Process</text>
  <path class="dg-line" d="M590 66 L628 66"/>
  <text class="dg-text-sm" x="596" y="56">PV</text>
  <path class="dg-line" d="M610 66 L610 150 L420 150"/>
  <rect class="dg-box" x="290" y="132" width="130" height="36" rx="6"/>
  <text class="dg-text-sm dg-mid" x="355" y="155">Transmitter</text>
  <path class="dg-line" d="M290 150 L110 150 L110 86" marker-end="url(#found-control-ah)"/>
  <text class="dg-text-sm" x="130" y="144">measured PV</text>
</svg>`,
    hyst: `<svg viewBox="0 0 640 200" role="img" aria-label="Temperature rises to 62 degrees and the heater turns off, falls to 58 and the heater turns on, cycling inside a hysteresis band around the 60 degree setpoint">
  <text class="dg-title" x="16" y="20">Heater, setpoint 60 C, band 58 to 62</text>
  <path class="dg-line dg-dash" d="M110 60 L620 60"/>
  <path class="dg-line-thin" d="M110 95 L620 95"/>
  <path class="dg-line dg-dash" d="M110 130 L620 130"/>
  <text class="dg-text-sm" x="16" y="64">62 off</text>
  <text class="dg-text-sm" x="16" y="99">60 SP</text>
  <text class="dg-text-sm" x="16" y="134">58 on</text>
  <path class="dg-line-accent" d="M120 160 L150 130 L215 60 L315 130 L380 60 L480 130 L545 60 L610 105"/>
  <text class="dg-text-sm dg-mid" x="180" y="182">heater ON</text>
  <text class="dg-text-sm dg-mid" x="265" y="182">OFF</text>
  <text class="dg-text-sm dg-mid" x="350" y="182">ON</text>
  <text class="dg-text-sm dg-mid" x="430" y="182">OFF</text>
  <text class="dg-text-sm dg-mid" x="515" y="182">ON</text>
</svg>`
  },

  pitfalls: [
    "Switching an on/off output at exactly the setpoint with no band, so the contactor chatters.",
    "Closing a control loop through the SCADA gateway instead of in the PLC.",
    "Adding derivative to a noisy flow or pressure signal, which turns noise into valve movement.",
    "Leaving output limits unset, so integral windup has no stop.",
    "Retuning a loop whose real problem is a sticky valve or an over-damped transmitter.",
    "Copying tuning numbers between systems without checking whether the gain is gain or proportional band, and minutes or seconds."
  ],

  keyTerms: ["pid", "setpoint", "process-variable", "hysteresis", "integral-windup", "cascade-control", "feedforward", "pide", "lambda-tuning", "ziegler-nichols"],

  quiz: [
    {
      q: "A heater contactor is clicking on and off every few seconds around the setpoint. What is the most direct fix?",
      options: ["Add derivative action", "Add a hysteresis band with separate on and off thresholds", "Raise the scan rate of the PLC", "Switch to open-loop timing"],
      answer: 1,
      explain: [
        "On/off control has no derivative term, and derivative would amplify the noise that causes chatter.",
        "Correct. Separate thresholds keep noise from toggling the output and set a minimum swing between switch events.",
        "A faster scan just makes the chatter faster. The cause is the single switch point.",
        "Open-loop timing loses the feedback and drifts away from the setpoint whenever conditions change."
      ]
    },
    {
      q: "A P-only level controller settles at 53% with a 60% setpoint and never closes the gap. What term removes it?",
      options: ["Integral", "Derivative", "A higher scan rate", "A wider hysteresis band"],
      answer: 0,
      explain: [
        "Correct. Integral keeps adding output while any error remains, which removes offset.",
        "Derivative reacts to rate of change. At steady state that rate is zero, so it does nothing for offset.",
        "Scan rate does not change the steady-state offset of a P controller.",
        "Hysteresis belongs to on/off control and is not a PID parameter."
      ]
    },
    {
      q: "A steam valve sat at 100% for ten minutes while the header was isolated. After reopening, the temperature overshoots badly. What is this?",
      options: ["Derivative kick", "Cascade interaction", "Integral windup", "Transmitter drift"],
      answer: 2,
      explain: [
        "Derivative kick happens on a setpoint step, not after a long saturated period.",
        "No cascade is described, and cascade would not explain a saturated output.",
        "Correct. The integral term accumulated during saturation and has to unwind through an overshoot.",
        "Drift would give a steady error, not a long overshoot after a saturation period."
      ]
    },
    {
      q: "Why should a PID loop that protects a process normally run in the PLC rather than as a script in Ignition?",
      options: ["Ignition cannot do arithmetic", "PLCs are required by ISA", "Gateway scripts cannot read tags", "The loop must keep running with deterministic timing if the gateway or network fails"],
      answer: 3,
      explain: [
        "Ignition can calculate anything. Capability is not the issue.",
        "There is no such requirement. It is a design practice with reasons behind it.",
        "Scripts read tags fine. The problem is latency and availability.",
        "Correct. The controller scans deterministically and survives a gateway restart or network loss."
      ]
    },
    {
      q: "A master temperature controller sets the setpoint of a fast jacket-temperature controller that drives a steam valve. What is this arrangement called?",
      options: ["Feedforward", "Ratio control", "Cascade", "Split range"],
      answer: 2,
      explain: [
        "Feedforward uses a measured disturbance, not another controller's output, as the correcting input.",
        "Ratio control holds one flow proportional to another.",
        "Correct. A slow outer loop writes the setpoint for a fast inner loop.",
        "Split range uses one output to drive two valves."
      ]
    },
    {
      q: "What is the key difference in philosophy between Ziegler-Nichols and lambda tuning?",
      options: ["Lambda requires derivative; Z-N does not", "Z-N is for level only", "They give identical settings", "Z-N picks the response from the process; lambda lets you choose the closed-loop speed"],
      answer: 3,
      explain: [
        "Lambda is usually applied as PI, and Z-N tables include PID. Neither statement holds.",
        "Z-N was developed for general process loops, not just level.",
        "Z-N is aggressive and lambda is chosen by the engineer, so they usually differ greatly.",
        "Correct. Z-N derives settings from ultimate gain or a step test and gives a lively response; lambda sets Ti to the process time constant and picks a target speed."
      ]
    }
  ],

  resources: [
    { title: "Quantitative PID tuning procedures", url: "https://control.com/textbook/process-dynamics-and-pid-controller-tuning/quantitative-pid-tuning-procedures/", type: "article", source: "control.com textbook" },
    { title: "Limit, selector and override controls", url: "https://control.com/textbook/basic-process-control-strategies/limit-selector-and-override-controls/", type: "article", source: "control.com textbook" },
    { title: "Pneumatic PID controllers", url: "https://control.com/textbook/closed-loop-control/pneumatic-pid-controllers/", type: "article", source: "control.com textbook" },
    { title: "PID controller tuning guide", url: "https://www.fabrico.io/blog/pid-controller-tuning/", type: "article", source: "Fabrico" }
  ]
});
