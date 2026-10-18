LC.lesson({
  id: "found-signals",
  title: "Signals: discrete, analog, 4-20 mA and HART",
  track: "found",
  minutes: 20,
  level: 1,
  prereqs: ["found-devices"],
  tags: ["signals", "4-20-ma", "hart", "scaling", "analog", "discrete", "namur"],
  summary: "How a physical quantity becomes a number in a PLC: on/off signals, the 4-20 mA loop, the scaling math, and what the odd values mean when something breaks.",
  objectives: [
    "Distinguish discrete and analog signals and name common voltage levels",
    "Explain sinking versus sourcing for 24 VDC inputs",
    "Say why 4-20 mA starts at 4 mA, and what a reading of 0 mA or 22 mA means",
    "Compare 2-wire and 4-wire transmitters and 0-10 V versus current signals",
    "Scale a raw analog value to engineering units by hand",
    "Describe how HART shares a 4-20 mA loop and what NAMUR NE43 defines"
  ],

  body: `
## Two kinds of signal

Everything a PLC (programmable logic controller) reads or writes at {{lesson:found-purdue}} Level 0 arrives as one of two electrical kinds.

- **Discrete** ({{term:discrete-signal|digital}}): on or off, one bit. A pushbutton, a prox sensor, a contactor coil, a lamp.
- **{{term:analog-signal|Analog}}**: a continuous range. A temperature, a flow, a valve position, a drive speed.

The devices behind them are covered in {{lesson:found-devices}}. This lesson is about the wire between the device and the PLC's I/O (input/output) card.

## Discrete signals

The usual level in North American control panels is **24 VDC** (volts, direct current) for sensors and PLC I/O, and 120 VAC (volts, alternating current) for some older or heavier devices. A discrete input card sees voltage above a threshold as ON and near zero as OFF. The exact thresholds are on the card's datasheet. A discrete output card turns a voltage on and off to drive a relay coil, lamp or solenoid.

### Sinking and sourcing

DC input and output cards are described as **sinking** or **sourcing**, and the pairing trips up even experienced technicians. The terms describe where *current flows relative to the card*.

- A **{{term:sinking-sourcing|sourcing}}** device pushes current out toward the load. A sourcing output puts +24 V on its terminal.
- A **sinking** device pulls current in to a common. A sinking input provides a path to 0 V when the field device sends it +24 V.

Current always needs a source on one side and a sink on the other, so a sourcing field device pairs with a sinking card and the reverse. For sensors this shows up as the wiring type. **PNP** sensors source: they switch +24 V onto the signal wire, and need a sinking input card. **NPN** sensors sink: they switch the signal wire to 0 V, and need a sourcing input card. Which one you meet depends on the region, the industry and the machine builder. Both are used in North America, and PNP is widely used in Europe. Some cards accept either, so check the sensor datasheet and the card's wiring diagram.

> [!warning] Check before you buy
> Mixing an NPN sensor with a sinking input card gives you a sensor that appears dead. It is a common commissioning mistake that no software setting will fix. Check the sensor datasheet and the card's wiring diagram first.

Discrete signals also come as **normally open (NO)** and **normally closed (NC)** contacts. Safety and stop circuits use NC wiring on purpose: a cut wire looks the same as a pressed stop button, so the failure is detected as a stop. See {{lesson:plc-ladder-basics}}.

## Analog signals

### The 4-20 mA current loop

The standard industrial analog signal is **4-20 mA**, a current that represents the range of a measurement. 4 mA means 0 percent of the range and 20 mA means 100 percent. The PLC's analog input (AI) card passes the current through a precision resistor (often 250 ohms), reads the resulting voltage (1 to 5 V across 250 ohms), and converts it to a number.

Why current and not voltage?

- A loop is a series circuit, so the same current flows through every point. Wire resistance does not change it, as long as the supply can push the current through. Voltage signals drop along long cable runs.
- Current is less sensitive to electrical noise.
- A single pair of wires can power the transmitter and carry the signal at once.

### Why live zero (4 mA)

The signal starts at 4 mA, not 0, so the value "zero percent" is distinguishable from "no signal". If a wire breaks, a transmitter dies or power is lost, the loop reads 0 mA, which can never be a valid measurement. The PLC can raise a "wire break" alarm. This is called a **{{term:live-zero|live zero}}**. The remaining 4 mA also powers the transmitter's own electronics in a 2-wire (loop-powered) design, explained below.

| Current | Meaning on a 0-100 PSI transmitter |
|---|---|
| 0 mA | Open loop, dead transmitter or failed power: a fault |
| 4 mA | 0 PSI |
| 12 mA | 50 PSI |
| 20 mA | 100 PSI |

Currents just outside 4 to 20 mA (3.6 to 3.8 mA, or 20.5 to 21 mA, for example) have defined meanings in the NAMUR NE43 table later in this lesson.

### 2-wire vs 4-wire

| Type | Power | Signal | Use |
|---|---|---|---|
| **2-wire (loop-powered)** | Loop supply (usually 24 VDC) powers the transmitter through the same two wires | Same two wires | Most field transmitters; low power sensors |
| **4-wire (externally powered)** | Separate power wires (24 VDC or 120 VAC) | Two signal wires | Power-hungry devices: radar, magmeters, analyzers |
| **3-wire** | Shared common | Signal wire | Cheaper sensors with a sourced output |

Because 2-wire devices are in a series loop, the total loop resistance (card input resistor, wire, any indicators) must not exceed what the supply can drive. Budget: with a 24 V supply and a transmitter needing at least 12 V, you have 12 V left. At 20 mA that allows 12 / 0.020 = 600 ohms of loop resistance. A 250 ohm input resistor and some wire fit easily.

### Voltage signals: 0-10 V

A **0-10 V** signal is common on drives, HVAC actuators and cheap sensors. It is easy to wire and easy to test with a meter, but it loses accuracy over long runs, picks up noise, and has no live zero: 0 V could be a valid value or a broken wire. Use it inside a cabinet or on short runs. Use 4-20 mA for the field.

{{diagram:loop}}

### Scaling: raw counts to engineering units

An analog input card converts current to an integer. Depending on its configuration, a Logix analog card reports raw counts or scales to engineering units itself. For the math, this course uses a teaching card in the style of the 1769-IF4: raw scale **0 to 21 mA = 0 to 32,767 counts**. That puts 4 mA at **6,242** counts, 20 mA at **31,208**, 3.8 mA at about 5,930, 3.6 mA at about 5,617 and 21 mA at 32,767. Counts are module-specific. ControlLogix 1756/5069 analog modules usually scale to engineering units in the module. The scaling is a straight line:

\`EU = EUmin + (raw - rawMin) * (EUmax - EUmin) / (rawMax - rawMin)\`

> [!example] Worked example: 8 mA on a level transmitter, step by step
> LT101 at Meridian Foods Plant 1 measures 0 to 5.0 m. The card sees **8 mA**.
>
> 1. Take off the live-zero offset: 8 - 4 = 4 mA above zero.
> 2. Divide by the span (20 - 4 = 16 mA): 4 / 16 = 0.25, or 25 percent.
> 3. Multiply by the range: 0.25 * 5.0 m = **1.25 m**.
>
> The same signal in counts: 8 mA is 8 / 21 * 32,767 = about **12,483** counts.
>
> EU = 0 + (12,483 - 6,242) * (5.0 - 0) / (31,208 - 6,242)
> = 6,241 * 5.0 / 24,966
> = **1.25 m**
>
> Both routes agree. Check with the mid-point: 12 mA is 50 percent of 5.0 m, which is 2.50 m, at about 18,725 counts.

If the raw value comes in below 6,242 minus a small tolerance, the signal is under 4 mA. Do not clamp it silently. The NE43 table below says when to treat it as uncertain and when as bad.

In a Logix controller you can use the \`SCP\` (scale) instruction or compute with \`CPT\`. See {{lesson:plc-analog}} and try {{sim:sim-scp}}.

\`\`\`st
// Structured Text scaling with NE43 checks (LT101: 0 to 5.0 m)
LT101_mA := (LT101_Raw - 6242.0) * 16.0 / 24966.0 + 4.0;
IF LT101_mA < 3.6 OR LT101_mA > 21.0 THEN
    LT101_Bad := TRUE;            // device or loop failure: bad quality, fail-safe action
    LT101_Uncertain := FALSE;
ELSE
    LT101_Bad := FALSE;
    // 3.6 to 3.8 and 20.5 to 21 mA: indeterminate, alarm after a delay
    LT101_Uncertain := LT101_mA < 3.8 OR LT101_mA > 20.5;
    LT101_Level := (LT101_mA - 4.0) * 5.0 / 16.0;   // clamp for display
END_IF;
\`\`\`

## NAMUR NE43: what out-of-range means

The NAMUR NE43 recommendation (NAMUR is an association of process-industry users) standardizes the meaning of currents outside 4-20 mA. This is the one table the whole course uses:

| Current | Meaning | Treat as |
|---|---|---|
| 3.8 to 20.5 mA | Measurement range (3.8 to 4 and 20 to 20.5 = slight under or over range) | Good, clamp for display |
| 3.6 to 3.8 or 20.5 to 21 mA | Indeterminate | Uncertain quality, alarm after a delay |
| Below 3.6 or above 21 mA | Device or loop failure | Bad quality, fail-safe action |

A transmitter that detects an internal fault is configured to "burn out" high (above 21 mA) or low (below 3.6 mA). That direction is a setting on the transmitter, so the PLC program must be written for the direction the instrument is configured for. The PLC then treats values outside the valid window as bad quality rather than as a process excursion. This is how an Ignition tag ends up with a "bad" quality code rather than a believable-but-wrong number.

## HART: digital data on the same wires

**{{term:hart|HART}}** (Highway Addressable Remote Transducer) superimposes a small digital signal on top of the 4-20 mA current. It uses frequency-shift keying: a 1200 Hz tone represents a 1 and a 2200 Hz tone a 0, at 1200 bits per second. The tones average to zero over time, so the analog current the PLC reads is unaffected.

What you get from HART on the same two wires:

- Device configuration (range, damping, burnout direction) without opening the instrument
- Diagnostics and device status
- Secondary measured variables (a flow transmitter's temperature, for example)
- Calibration records

A technician with a HART communicator can read all of this from anywhere on the loop. In larger systems an asset-management tool does it centrally, through HART-capable I/O cards, or through multiplexers. In a typical PLC project the PLC reads only the analog 4-20 mA value and HART is used by maintenance. A HART loop also needs a minimum loop resistance so the digital signal has voltage to ride on. Check the HART documentation and the transmitter manual for the figure; the usual 250 ohm input shunt normally satisfies it.
`,

  eli5: `
Imagine you want to tell a friend across a field how much water is in a tank. You could shout a number, but wind and distance make it hard to hear. So you agree on a better system: you hold a flashlight, and the brightness tells the story. Dim means almost empty and full brightness means full.

Now what if the flashlight is just completely off? Does that mean the tank is empty, or did your friend drop the flashlight? You can't tell. So you change the rule: "empty" is a small glow, never fully dark. Now, if it's completely dark, you know something broke. That's the 4 mA live zero.

On/off signals are simpler: a light switch. It's either on or off.

HART is like finding out the flashlight can also flicker a secret Morse code at a speed so fast that it doesn't change how bright it looks. Your friend sees the brightness and a technician with a special viewer can read the flickers: "I'm a pressure sensor, and I think my sensor is getting old."
`,

  why: `
**Why 4-20 mA beat everything else.** Older pneumatic systems used 3-15 psi air signals. When electronics took over, current was chosen over voltage because the same current flows everywhere in a series loop. A 300 m cable adds resistance, but the current stays the same. That robustness through noise and distance is why a 1950s signal convention still dominates new installations.

**Why the offset of 4 mA?** It buys fault detection and power. The minimum current gives the transmitter electronics enough power to run, and the line between 0 mA (fault) and 4 mA (zero) lets software tell a dead loop from a true zero. The cost is that you give up 20 percent of the range, and resolution (the smallest change the card can tell apart) is slightly lower than a 0-20 mA scheme.

**Why scaling errors cause real incidents.** The most common commissioning bug is scaling an input against the wrong range: 0 to 100 in the PLC, 0 to 150 in the transmitter. The tag looks perfectly healthy and is wrong by 50 percent. Always check the transmitter's configured range against the I/O list and verify with a known value (a calibrator, a handheld tool that injects a known current, set to 12 mA should read exactly 50 percent).

**Why bad-quality handling matters.** If your PLC clamps a 0 mA input to 0 percent, the high-level alarm will never fire and a pump will run dry. A level transmitter with a broken wire is a failure to report, not a reading of zero. Experienced integrators write analog handling once, in an AOI (add-on instruction, a reusable block of logic) or a UDT (user-defined data type, a custom bundle of tags), with explicit out-of-range checking, and reuse it. See {{lesson:plc-aoi}}.

**What integrators argue about.** Whether to put HART or fieldbus on everything. HART's extra data is valuable, but if no one reads it, you have wired cost for no benefit. Pay for it where maintenance will actually use it, such as critical control valves and custody-transfer meters.
`,

  history: `
Pneumatic 3-15 psi signalling gave way to electronic 4-20 mA in the 1950s through the 1970s, and the standard live-zero range was widely adopted in the 1970s. HART was developed by Rosemount in the 1980s and later passed to the HART Communication Foundation, now part of FieldComm Group, as an open protocol that works with existing 4-20 mA wiring. NAMUR, an association of process-industry users, published NE43 to standardize how instruments signal failure on the 4-20 mA loop.
`,

  examples: [
    {
      title: "Diagnosing 0 mA",
      body: `A flow tag drops to zero and the pump trips on low flow. The field meter shows 0.0 mA at the PLC terminals but 4.0 mA at the transmitter. The wire is broken between them. A PLC that treats a sub-3.6 mA input as bad quality would have raised "wire break" instead of a misleading low-flow trip.`
    },
    {
      title: "Loop budget check",
      body: `Supply 24 V. Transmitter minimum 10.5 V. Input resistor 250 ohms drops 5 V at 20 mA. The round trip over 400 m of 18 AWG is about 2,600 ft of copper at roughly 6.4 ohms per 1000 ft, so about 17 ohms, which drops 0.34 V. Total used: 10.5 + 5 + 0.34 = about 15.9 V of 24. The loop works with about 8 V of margin.`
    }
  ],

  diagrams: {
    loop: `<svg viewBox="0 0 640 260" role="img" aria-label="A 2-wire 4-20 mA loop: a 24 volt supply, a loop-powered transmitter and the PLC input resistor in series, with a table of current to percent of range">
  <defs>
    <marker id="found-signals-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="26">2-wire loop: one series circuit</text>
  <rect class="dg-box" x="20" y="60" width="110" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="75" y="86">24 VDC</text>
  <text class="dg-text-muted dg-mid" x="75" y="104">supply</text>
  <rect class="dg-box-accent" x="260" y="60" width="130" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="325" y="86">Transmitter</text>
  <text class="dg-text-muted dg-mid" x="325" y="104">sets 4 to 20 mA</text>
  <rect class="dg-box" x="500" y="60" width="120" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="560" y="86">PLC AI card</text>
  <text class="dg-text-muted dg-mid" x="560" y="104">250 ohm shunt</text>
  <line class="dg-line" x1="130" y1="80" x2="260" y2="80"/>
  <line class="dg-line" x1="390" y1="80" x2="500" y2="80"/>
  <line class="dg-line" x1="75" y1="120" x2="75" y2="150"/>
  <line class="dg-line" x1="75" y1="150" x2="560" y2="150"/>
  <line class="dg-line" x1="560" y1="150" x2="560" y2="120"/>
  <line class="dg-line-accent" x1="180" y1="70" x2="215" y2="70" marker-end="url(#found-signals-ah)"/>
  <text class="dg-text-muted" x="160" y="58">same current I</text>
  <text class="dg-text-mono" x="20" y="186">4 mA = 0%</text>
  <text class="dg-text-mono" x="20" y="206">12 mA = 50%</text>
  <text class="dg-text-mono" x="20" y="226">20 mA = 100%</text>
  <text class="dg-text-mono" x="260" y="186">0 mA   = broken loop</text>
  <text class="dg-text-mono" x="260" y="206">&lt; 3.6  = fail low</text>
  <text class="dg-text-mono" x="260" y="226">&gt; 21   = fail high</text>
</svg>`
  },

  pitfalls: [
    "Pairing sensor and input types wrongly (NPN to a sinking card, for example).",
    "Scaling against the wrong range, which makes every value plausible and wrong.",
    "Clamping or ignoring out-of-range values instead of marking them bad quality.",
    "Forgetting that the loop needs enough supply voltage for transmitter, shunt and wire.",
    "Using 0-10 V on long, noisy runs where 4-20 mA is the right choice.",
    "Not knowing which direction a transmitter burns out in a failure."
  ],

  keyTerms: ["discrete-signal", "analog-signal", "sinking-sourcing", "4-20-ma", "live-zero", "hart", "namur-ne43", "scaling"],

  quiz: [
    {
      q: "Why does 4-20 mA use 4 mA for zero percent instead of 0 mA?",
      options: ["To save power", "Because 0 mA is not possible to generate", "So a dead loop (0 mA) can be told apart from a true zero reading", "To make scaling math simpler"],
      answer: 2,
      explain: [
        "The offset costs range, not power; it actually powers 2-wire electronics.",
        "A source can easily produce 0 mA.",
        "Correct. A live zero turns a broken wire into a detectable fault.",
        "The offset complicates the scaling math slightly."
      ]
    },
    {
      q: "LT101 spans 0 to 5.0 m. The PLC measures 8 mA. What is the level?",
      options: ["1.25 m", "2.00 m", "1.60 m", "2.50 m"],
      answer: 0,
      explain: [
        "Correct. (8 - 4) / 16 = 25 percent, and 25 percent of 5 m is 1.25 m.",
        "That uses 8/20 = 40 percent, forgetting the 4 mA offset.",
        "That divides by 5 instead of by the 16 mA span.",
        "That would be 12 mA, mid-scale."
      ]
    },
    {
      q: "A previously healthy analog tag now reads 0.0 mA. What is the best interpretation?",
      options: ["The process is at zero percent", "The sensor is perfect", "HART communication is active", "An open loop or dead transmitter, so the value should be flagged bad"],
      answer: 3,
      explain: [
        "A valid zero percent would read 4 mA.",
        "That does not describe a fault.",
        "HART modulation is tiny and does not drop the current to zero.",
        "Correct. Anything below the valid window indicates a fault, not a process value."
      ]
    },
    {
      q: "What does the HART digital signal do to the 4-20 mA analog reading?",
      options: ["It has no effect because its tones average to zero", "It raises it by 1 mA", "It replaces it", "It makes it noisy by design"],
      answer: 0,
      explain: [
        "Correct. The FSK tones average out, so the PLC's analog reading is unchanged.",
        "HART's tones are symmetrical; they do not add a DC offset.",
        "The analog signal remains the primary measurement.",
        "It is designed not to disturb the analog signal."
      ]
    },
    {
      q: "A 24 VDC PNP proximity sensor is wired to a PLC input card. Which kind of card does it normally need?",
      options: ["A sourcing input card", "A sinking input card", "An AC input card", "An analog card"],
      answer: 1,
      explain: [
        "A sourcing card would pair with an NPN (sinking) sensor.",
        "Correct. The PNP sensor sources +24 V onto the signal, and the sinking card provides the path to 0 V.",
        "AC cards expect 120 VAC.",
        "Analog cards read continuous values, not on/off switching."
      ]
    },
    {
      q: "A transmitter is configured to burn out high at 22 mA on internal failure. Your PLC clamps inputs to 0-100 percent. What happens on a failure?",
      options: ["Nothing, the PLC clamps to 100 percent", "The PLC faults", "The tag shows 100 percent with no sign of a fault, and could trigger wrong control action", "It reads 0 percent"],
      answer: 2,
      explain: [
        "Clamping hides the fault, which is the problem, not a solution.",
        "A PLC does not fault on an analog value outside range unless you program it to.",
        "Correct. Without an out-of-range check the fault looks like a real, extremely high reading. NE43 ranges should map to bad quality.",
        "A high burnout reads high, not low."
      ]
    }
  ],

  resources: [
    { title: "HART Technology Explained", url: "https://fieldcommgroup.org/technologies/hart/hart-technology-explained", type: "standard", source: "FieldComm Group" },
    { title: "4-20mA Current Loop Signal Principle and Applications", url: "https://industrialmonitordirect.com/blogs/knowledgebase/4-20ma-current-loop-signal-principle-and-applications", type: "article", source: "Industrial Monitor Direct" },
    { title: "What 4-20mA actually means and why your zero is at 4", url: "https://dev.to/mariusgjerd/what-4-20ma-actually-means-and-why-your-zero-is-at-4-7fh", type: "article", source: "DEV Community" },
    { title: "The HART protocol", url: "https://novusautomation.com/en/theHARTprotocol", type: "article", source: "Novus" }
  ]
});
