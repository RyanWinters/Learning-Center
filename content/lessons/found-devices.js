LC.lesson({
  id: "found-devices",
  title: "Field devices: sensors, transmitters, actuators, drives",
  track: "found",
  minutes: 20,
  level: 1,
  prereqs: ["found-purdue"],
  tags: ["sensors", "transmitters", "actuators", "valves", "vfd", "motor-control", "level-0"],
  summary: "The things at Level 0 that every tag in your SCADA ultimately points to: what they measure, what they move, and how they fail.",
  objectives: [
    "Separate sensors, transmitters, actuators and drives, and say what each hands to the PLC",
    "Pick a sensing technology for presence, temperature, pressure, flow and level",
    "Explain what a valve positioner and a solenoid do",
    "Trace power and control from breaker to motor through contactor, overload and VFD",
    "Describe what an MCC is and why motor starters have three separate protections"
  ],

  body: `
## Level 0 is where the truth is

Every number on a Perspective screen started as a physical effect at {{lesson:found-purdue}} Level 0: a pipe warmed up, a tank filled, a box passed a beam. Bad data almost always starts here, with a wrong sensor, a bad install or a failed actuator, and not in the software. If you can reason about the device, you can tell whether a strange reading is real.

Devices fall into two families.

- **Inputs:** *sensors* and *transmitters* tell the controller what is happening.
- **Outputs:** *actuators* and *drives* make something happen.

## Sensors vs. transmitters

A **{{term:sensor|sensor}}** detects a physical quantity. A **{{term:transmitter|transmitter}}** is a sensor plus electronics that conditions the raw effect into a standard signal the PLC can read, usually 4-20 mA ({{lesson:found-signals}}). A bare thermocouple produces a few millivolts. A temperature transmitter turns that into 4-20 mA for a chosen range, so the PLC card does not need to know thermocouple math.

### Discrete sensors (on/off)

| Device | How it works | Use it for | Watch out for |
|---|---|---|---|
| Limit switch | Mechanical contact closed by a lever | Position end-stops, door closed | Wear, misalignment, needs physical contact |
| Inductive proximity ({{term:proximity-sensor|prox}}) | Detects metal by its effect on a coil's field | Metal presence, cylinder position, gear teeth | Short range (a few mm), metal only |
| Capacitive prox | Detects change in capacitance | Non-metals, level through a tank wall | Sensitive to buildup and humidity |
| Photoelectric ({{term:photoeye|photo-eye}}) | Light beam interrupted or reflected | Part present, box counting, jams | Dust, alignment, shiny backgrounds |
| Float / level switch | Float or vibration fork | High/low tank level alarms | Fouling, sticking |
| Pressure switch | Contact closes at a set pressure | Low-oil pressure trip, compressor control | Drift, deadband setting |

Photo-eyes come in three styles. **Through-beam** has a separate emitter and receiver and is the most reliable at long range. **Retroreflective** uses one housing and a reflector. **Diffuse** uses one housing and the target itself, which is the easiest to install and the most easily fooled by color and surface.

### Analog sensors and transmitters

| Measurement | Common technologies | Notes |
|---|---|---|
| Temperature | {{term:rtd|RTD}} (Pt100), {{term:thermocouple|thermocouple}} | RTD: accurate and stable to about 600 C. Thermocouple: wide range (types K, J, T, and others), fast, less accurate |
| Pressure | Strain gauge or capacitive cell | Gauge, absolute and differential variants. A differential cell also measures flow and level |
| Flow | Magnetic, Coriolis, vortex, differential pressure (orifice), turbine, ultrasonic | Magmeters need conductive liquid. Coriolis gives mass flow and density |
| Level | Differential pressure, radar, ultrasonic, guided wave, capacitance | Radar is unaffected by vapor and temperature changes. Ultrasonic is cheaper and fooled by foam |
| Weight | Load cells | Often through a dedicated weigh indicator that speaks Modbus |
| Analysis | pH, conductivity, turbidity, dissolved oxygen | High maintenance: they need calibration and cleaning |

> [!tip] RTD vs thermocouple in a sentence
> Use an RTD where accuracy matters under about 500 C. Use a thermocouple for furnaces and fast response. A Pt100 reads 100.00 ohms at 0 C and 138.5 ohms at 100 C.

## Actuators

An **{{term:actuator|actuator}}** converts a control signal into physical action: valve movement, motor rotation, cylinder extension.

### Valves

Control valves throttle flow. The valve body is moved by an actuator: pneumatic (air diaphragm or piston, the most common in process plants), electric, or hydraulic. A **{{term:positioner|positioner}}** is the part people forget. It compares the commanded position (4-20 mA from the PLC) with the stem's actual position and drives air until they match. Without it, friction and varying air pressure make the valve land in the wrong place.

Two fail-safe terms matter on every valve spec: **fail open** (spring opens the valve on loss of air or signal) and **fail closed**. Pick the failure state that makes the process safe. A cooling-water valve usually fails open, a fuel valve usually fails closed.

On/off valves are simpler. A **solenoid valve** ({{term:solenoid-valve|solenoid}}) uses an electric coil to shift a small valve, often to port air to a pneumatic actuator. A typical solenoid takes 24 VDC or 120 VAC from a PLC output. Discrete valves usually have **limit switches** to report open and closed, which the PLC compares against its command to detect a stuck valve.

### Motors and how they are controlled

Motors are the largest electrical load in a plant, and there are three common ways to run one.

1. **Direct-on-line starter:** a contactor connects the motor straight to the supply. Simple, but starts with a current surge.
2. **Soft starter:** ramps voltage during startup. Reduces mechanical and electrical shock.
3. **{{term:vfd|VFD}} (variable frequency drive):** converts supply to variable frequency and voltage to control speed. Used for pumps and fans where speed adjustment saves energy and replaces throttling valves.

## The motor starter anatomy

A conventional starter combines three jobs. Many field problems come from confusing them.

| Part | Job | Protects against |
|---|---|---|
| Breaker or fuses (short-circuit protection) | Disconnect and short-circuit trip | Dead shorts, wiring faults |
| {{term:contactor|Contactor}} | Switch the motor power on and off; coil controlled by the PLC or a button | Not a protection, it is a switch |
| {{term:motor-overload|Overload relay}} | Trips on sustained excess current | Overheating from overload or locked rotor |

The PLC drives only the contactor coil (small power). The contactor switches big power. The overload contact feeds back to the PLC as a status input, so the HMI can show "motor tripped on overload." This is what a ladder rung like \`XIC(Start) XIC(OL_OK) OTE(Contactor)\` represents.

An **{{term:mcc|MCC}}** (motor control center) is a row of cabinets holding many starters or VFDs in plug-in buckets, sharing a common bus. When someone says "the pump is in the MCC," they mean the starter, not the pump, is in that room.

> [!example] Worked example: what the PLC sees for one pump
> Pump P-101 on a VFD in MCC-2 has these I/O points:
> - DO: \`P101_Run_Cmd\` (24 VDC to the drive's run terminal)
> - AO: \`P101_Speed_SP\` (4-20 mA = 0-60 Hz)
> - DI: \`P101_Running\` (drive relay output)
> - DI: \`P101_Fault\` (drive relay output)
> - AI: \`P101_Speed_FB\` (4-20 mA from drive output)
> - AI: \`FT101_Flow\` (flow transmitter on the discharge)
>
> Often the drive also reports status and current over EtherNet/IP, replacing many of those wires. The PLC logic ties all of these into one UDT per pump.

{{diagram:motor}}

## Intelligent devices

Modern field devices rarely stop at a single signal. A smart transmitter on HART reports diagnostics. A VFD on EtherNet/IP reports current, torque and fault codes. An IO-Link sensor sends its parameters over a three-wire cable. These blur the boundary between Level 0 and Level 1, and give your SCADA much richer data than a plain 4-20 mA.

> [!note] Diagnostics are free data
> If a drive already reports motor current and a fault code over the network, log them. Trends of current catch a worn bearing weeks before it trips.
`,

  eli5: `
Think of a human body. Your senses (eyes, skin, ears) notice what is happening: it's hot, something is moving toward you. That's the sensors. But a raw signal from your eye isn't useful to your brain until your nerves turn it into a language the brain understands. That's the transmitter: it takes the raw feeling and sends it in a standard form.

Your brain decides what to do. Then your muscles act on the decision: arms move, legs walk. Those are the actuators. A motor is a muscle. A valve is like a muscle that opens and closes a hose.

Some muscles need extra care. A good muscle controller doesn't just shout "move!"; it checks "did the arm actually get there?" and keeps adjusting. That's a valve positioner.

And just as your body has safety reflexes (pull your hand away from a hot stove), a motor has an overload relay that cuts power if it's being overworked.
`,

  why: `
**Why transmitters and not raw sensors?** A raw thermocouple signal is millivolts, sensitive to noise and wire length. Putting the conditioning electronics at the sensor and sending a robust 4-20 mA lets you run long cable through a noisy plant and keep the PLC input card generic. The cost is one more device to buy and calibrate. That tradeoff is almost always worth it.

**Why separate the contactor, overload and breaker?** Each handles a different failure at a different speed. A short circuit needs a trip in milliseconds, which the breaker does. An overload is slow heating that the overload relay models with a thermal curve. Combining them would mean a device that trips too late for shorts or too soon for normal motor start-up current. Keeping them separate also means the PLC can open the contactor without touching the protection.

**Why VFDs instead of throttle valves?** Throttling a pump with a valve wastes energy as heat across the valve. Slowing the motor reduces power roughly with the cube of speed for centrifugal loads, so a pump at 80 percent speed uses about half the power. This is why VFDs are the default in new pumping and HVAC. The tradeoff is harmonics, heat in the panel, and a more complex failure mode to troubleshoot.

**Why fail-safe positions matter to you.** The PLC program and the alarm logic must agree with the valve's mechanical fail state. If the valve fails closed and the PLC treats 0 mA as open, you will lose your first batch on commissioning day. Always read the instrument datasheet.

**What integrators argue about.** Hardwired signals versus networked devices. Hardwired is simple and debuggable with a multimeter. Networked gives diagnostics and saves wiring but depends on the network and the right EDS or driver files. Most modern plants use both: critical interlocks hardwired, diagnostics networked.
`,

  history: `
Pneumatic 3-15 psi signals dominated process control until the 1950s and 1960s, and transmitters sending 4-20 mA gradually replaced them as electronic instruments became reliable. Variable frequency drives became widely used in the 1980s as power semiconductors improved, displacing mechanical speed control. Smart transmitters with digital communication (HART) arrived in the late 1980s, adding diagnostics over the same two wires.
`,

  examples: [
    {
      title: "Choosing a level sensor",
      body: `A tank holds hot, foamy syrup. Ultrasonic reads the foam as the surface and gives a false level. Radar or a differential-pressure transmitter ignores it. Pick radar if the budget allows, and DP if you need a robust, familiar option and the density is known.`
    },
    {
      title: "Why a valve reads open but is stuck",
      body: `A solenoid is energized and the PLC shows the command ON, but the process flow is zero. The open limit switch input is still off after 5 seconds. A timer comparing command to feedback should raise a "valve failed to open" alarm, which points the technician to the valve and not the PLC.`
    }
  ],

  diagrams: {
    motor: `<svg viewBox="0 0 640 230" role="img" aria-label="Motor power path from breaker to contactor to overload to motor, with the PLC driving the contactor coil and reading the overload contact">
  <defs>
    <marker id="found-devices-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="26">Power path (heavy) and control path (light)</text>
  <rect class="dg-box" x="20" y="60" width="100" height="56" rx="4"/>
  <text class="dg-text-sm dg-mid" x="70" y="84">Breaker</text>
  <text class="dg-text-muted dg-mid" x="70" y="102">short circuit</text>
  <rect class="dg-box-accent" x="170" y="60" width="100" height="56" rx="4"/>
  <text class="dg-text-sm dg-mid" x="220" y="84">Contactor</text>
  <text class="dg-text-muted dg-mid" x="220" y="102">on / off</text>
  <rect class="dg-box" x="320" y="60" width="100" height="56" rx="4"/>
  <text class="dg-text-sm dg-mid" x="370" y="84">Overload</text>
  <text class="dg-text-muted dg-mid" x="370" y="102">heat trip</text>
  <circle class="dg-box" cx="520" cy="88" r="32"/>
  <text class="dg-text dg-mid" x="520" y="93">Motor</text>
  <line class="dg-line-accent" x1="120" y1="88" x2="170" y2="88" marker-end="url(#found-devices-ah)"/>
  <line class="dg-line-accent" x1="270" y1="88" x2="320" y2="88" marker-end="url(#found-devices-ah)"/>
  <line class="dg-line-accent" x1="420" y1="88" x2="488" y2="88" marker-end="url(#found-devices-ah)"/>
  <rect class="dg-box-2" x="170" y="160" width="200" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="270" y="182">PLC</text>
  <text class="dg-text-muted dg-mid" x="270" y="198">DO coil, DI overload OK</text>
  <line class="dg-line-thin dg-dash" x1="220" y1="160" x2="220" y2="116" marker-end="url(#found-devices-ah)"/>
  <line class="dg-line-thin dg-dash" x1="370" y1="116" x2="370" y2="160" marker-end="url(#found-devices-ah)"/>
  <text class="dg-text-muted" x="228" y="140">coil</text>
  <text class="dg-text-muted" x="378" y="140">status</text>
</svg>`
  },

  pitfalls: [
    "Trusting a valve command as proof the valve moved. Always wire and use feedback.",
    "Ignoring a valve's fail-safe state when writing PLC and alarm logic.",
    "Using an ultrasonic level sensor on foam, steam or vapor.",
    "Reading a VFD's frequency as motor speed without knowing slip and the scaling set in the drive.",
    "Treating the overload relay as a short-circuit protector. Breakers and fuses do that."
  ],

  keyTerms: ["sensor", "transmitter", "actuator", "proximity-sensor", "rtd", "thermocouple", "positioner", "contactor", "vfd", "mcc"],

  quiz: [
    {
      q: "What does a transmitter do that a bare sensor does not?",
      options: ["It senses a physical quantity", "It controls a valve", "It stores history", "It conditions the sensor's output into a standard signal such as 4-20 mA"],
      answer: 3,
      explain: [
        "Both sense; the sensor element does the detecting.",
        "Valves are moved by actuators.",
        "Historian software stores history, not a transmitter.",
        "Correct. The electronics turn a raw effect into a standardized signal the PLC can read."
      ]
    },
    {
      q: "A part is white plastic and the background is shiny metal. Which photo-eye style is most likely to misread?",
      options: ["Diffuse", "Through-beam", "Both equally", "None, color does not matter"],
      answer: 0,
      explain: [
        "Correct. A diffuse sensor relies on reflection from the target and can be fooled by surface and background.",
        "A through-beam is blocked by any opaque object regardless of color.",
        "Through-beam is far more tolerant.",
        "Color and surface affect diffuse sensors strongly."
      ]
    },
    {
      q: "What does a valve positioner do?",
      options: ["Reports flow rate", "Drives air until the actual stem position matches the commanded position", "Protects the motor from overload", "Converts AC to DC"],
      answer: 1,
      explain: [
        "That is a flow meter.",
        "Correct. It closes the loop on stem position.",
        "That is an overload relay.",
        "That is a power supply or rectifier."
      ]
    },
    {
      q: "A cooling-water valve for a reactor loses instrument air. What should its fail position usually be?",
      options: ["Closed", "Open", "Wherever it was", "It does not matter"],
      answer: 1,
      explain: [
        "Closing would remove cooling at the worst moment.",
        "Correct. Choose the failure state that makes the process safe; cooling usually fails open.",
        "Fail-in-place is a valid design for some valves, but not the usual choice for cooling.",
        "It is a safety decision and always matters."
      ]
    },
    {
      q: "In a standard motor starter, which device protects against a slow sustained overcurrent?",
      options: ["Contactor", "Breaker only", "Overload relay", "VFD enclosure"],
      answer: 2,
      explain: [
        "A contactor is a switch.",
        "A breaker is sized for short-circuit protection and would not follow a motor's thermal curve.",
        "Correct. The overload relay models heating and trips on sustained excess current.",
        "An enclosure protects against environment, not current."
      ]
    },
    {
      q: "Why do pumps on VFDs often save energy compared with throttling a valve?",
      options: ["VFDs are more efficient motors", "Power falls steeply with speed for centrifugal loads, so slowing down saves far more than throttling", "Throttle valves are illegal", "VFDs remove friction"],
      answer: 1,
      explain: [
        "The motor is the same; what changes is how speed is controlled.",
        "Correct. Power roughly follows the cube of speed for centrifugal loads, so a small speed reduction gives a big saving.",
        "Throttle valves are widely used.",
        "Friction is unrelated."
      ]
    }
  ],

  resources: [
    { title: "4-20mA Current Loop Signal Principle and Applications", url: "https://industrialmonitordirect.com/blogs/knowledgebase/4-20ma-current-loop-signal-principle-and-applications", type: "article", source: "Industrial Monitor Direct" },
    { title: "Programmable logic controller (I/O and modules)", url: "https://en.wikipedia.org/wiki/Programmable_logic_controller", type: "article", source: "Wikipedia" },
    { title: "Control valve fail safe: air to open vs air to close", url: "https://www.fabrico.io/blog/control-valve-fail-safe-air-to-open-vs-air-to-close/", type: "article", source: "Fabrico" },
    { title: "HART Technology Explained", url: "https://fieldcommgroup.org/technologies/hart/hart-technology-explained", type: "standard", source: "FieldComm Group" }
  ]
});
