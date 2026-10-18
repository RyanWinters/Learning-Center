LC.lesson({
  id: "found-pid-docs",
  title: "Reading P&IDs, loop sheets and I/O lists",
  track: "found",
  minutes: 15,
  level: 2,
  prereqs: ["found-signals"],
  tags: ["p&id", "isa-5.1", "io-list", "loop-sheet", "documentation"],
  summary: "The three documents every project runs on: the P&ID that shows what the process is, the loop sheet that shows how one loop is wired, and the I/O list that becomes your PLC and your tag database.",
  objectives: [
    "Decode an ISA-5.1 tag such as FIC-101, PT-205 or LSH-310 letter by letter",
    "Read instrument bubbles to tell field devices from DCS or PLC functions",
    "Distinguish process, pneumatic, electrical and data lines on a P&ID",
    "Derive I/O points (AI, AO, DI, DO) from a P&ID and total the card count",
    "Explain what a loop sheet adds beyond the P&ID and I/O list"
  ],

  body: `
## Three documents, three jobs

A {{term:pid-drawing|P&ID}} (piping and instrumentation diagram) shows the process: tanks, pumps, pipes, valves and every instrument, with tags. A **loop sheet** (instrument loop diagram) shows the wiring of one instrument loop from the field device to the controller card terminal. The {{term:io-list|I/O list}} is a spreadsheet with one row per signal, and it is the document integrators spend the most time in, because every other deliverable is derived from it.

| Document | Question it answers | Who draws it | Who uses it |
|---|---|---|---|
| P&ID | What is the process, and what is measured or controlled where? | Process / instrument engineer | Everyone, first |
| I/O list | What signals exist, what type, and where do they land? | Instrument or controls engineer | Integrator, panel shop, HMI builder |
| Loop sheet | How is this one loop wired, terminal by terminal? | Instrument designer | Electricians, commissioning techs |

If you have built Perspective screens from a tag export, you have been downstream of an I/O list. Learning to read one at the source lets you catch errors before they are in code.

## ISA-5.1 tag names

The {{term:isa-5-1|ISA-5.1}} standard (from ISA, the International Society of Automation; title: Instrumentation Symbols and Identification) gives each instrument a tag built from letters and a loop number. The first letter is what is measured or initiated. Later letters say what the device does. Read them left to right.

| First letter | Measured variable | Later letter | Function |
|---|---|---|---|
| F | Flow | I | Indicator (shows a value) |
| L | Level | C | Controller |
| P | Pressure | T | Transmitter |
| T | Temperature | E | Primary element (the sensing part) |
| A | Analysis (pH, conductivity, O2) | V | Valve or damper (final element) |
| S | Speed or frequency | S | Switch |
| Z | Position | A | Alarm |
| H | Hand (manual) | R | Recorder |
| W | Weight or force | Y | Relay, computing function |
| X | Unclassified (often on/off valve) | H, L (last) | High, low (HH and LL for high-high, low-low) |

Examples you can now decode:

- **FIC-101**: Flow Indicating Controller, loop 101. It shows the flow and holds a setpoint.
- **FT-101**: the Flow Transmitter in that same loop. Same number, so it belongs to the same loop.
- **FV-101**: the Flow control Valve of loop 101.
- **PT-205**: a Pressure Transmitter, loop 205.
- **LSH-310**: Level Switch, High. A discrete contact that closes or opens at a high level.
- **LAHH-310**: Level Alarm, High-High, the alarm function that goes with it.
- **TE-402** and **TT-402**: temperature element (the RTD, or resistance temperature detector, itself) and the transmitter that converts it to 4-20 mA.
- **XV-501** with **ZSO-501** and **ZSC-501**: an on/off valve, with limit switches reporting open and closed.

The letters name functions, not boxes. One physical transmitter may be tagged PT-205 and also feed a PI-205 indication and a PAH-205 alarm; those extra functions show up as extra bubbles or extra I/O rows. Many sites add area or unit prefixes, such as \`2-FIC-101\` or \`U200-LT-001\`. The tag is the common key across the P&ID, I/O list, PLC, historian and HMI (human-machine interface), which is why {{lesson:int-naming}} matters so much.

> [!note] Drawing tag versus code tag
> On drawings, loop sheets and I/O lists the tag keeps its hyphen: \`FT-101\`, \`FV-101\`, \`LAHH-101\`. In PLC, Ignition, database and MQTT names the hyphen is dropped, because hyphens are not valid in Logix tag names: \`FT101\`, \`FV101\`, \`LAHH101\`. The base letters and loop number stay identical, so the mapping is mechanical. This course writes drawing tags with the hyphen and code tags without it.

## Bubbles: where does the function live

Each instrument is drawn as a circle ("bubble") with the tag split across two lines: the letters on top and the loop number below. The shape and the line across it tell you where the function is performed.

{{diagram:pid}}

| Symbol | Meaning |
|---|---|
| Plain circle | Discrete instrument, field mounted |
| Circle with a solid horizontal line | Mounted in the main control room or panel, accessible to the operator |
| Circle with a dashed line | Mounted behind the panel, or an auxiliary location, not operator-accessible |
| Circle in a square | Shared display and shared control, normally a function inside the DCS |
| Hexagon | Computer function |
| Diamond in a square | PLC (programmable logic controller) or other programmable logic function (as in the common ISA-5.1 legend; confirm on the project legend) |

Drawing conventions vary between companies and eras, and the no-line case in particular is read differently on older drawings. Always check the legend sheet at the front of the set before trusting a symbol.

### Line types

| Line | Usually means |
|---|---|
| Heavy solid | Process pipe (arrows show flow direction; line weight is the main process line) |
| Thin solid | Instrument connection to process, impulse tubing or mechanical link |
| Short cross-hatches (slashes) | Pneumatic signal |
| Dashed | Electrical signal (4-20 mA, 24 VDC or contact) |
| Dashed with small circles or dots | Software or data link, such as fieldbus or network |
| Dotted or double-dashed | Capillary or other special connection (see legend) |

Pay attention to how signals connect. A dashed line from FT-101 into a controller bubble tells you the transmitter is wired to something that will have I/O. A dashed line leaving the controller to a valve means an analog output. A bubble with no dashed line to a controller is local only: a gauge or a field indicator, and it costs you no I/O.

## From P&ID to I/O list

The I/O list is built by walking the P&ID, instrument by instrument, and asking "does a signal leave the field for the control system?" Each signal becomes a row with a **type**:

| Type | Direction | Example | Typical signal |
|---|---|---|---|
| AI (analog input) | Field to controller, analog | FT-101 flow | 4-20 mA (see {{lesson:found-signals}}) |
| AO (analog output) | Controller to field, analog | FV-101 position command | 4-20 mA |
| DI (discrete input) | Field to controller, discrete | LSH-310 high level, pump running | 24 VDC contact |
| DO (discrete output) | Controller to field, discrete | Pump P-101 start, horn | Relay or 24 VDC |

> [!example] One loop and one pump, as rows
> Loop 101 and pump P-101 produce these rows:
>
> | Drawing tag | PLC tag | Description | Type | Signal | Range | Scale |
> |---|---|---|---|---|---|---|
> | FT-101 | FT101 | Feed flow | AI | 4-20 mA, 2-wire | 0-120 m3/h | 4 mA = 0 |
> | FV-101 | FV101 | Feed valve command | AO | 4-20 mA | 0-100% | 4 mA = closed |
> | ZSC-101 | ZSC101 | FV-101 closed | DI | 24 VDC | open = not closed | |
> | LSH-310 | LSH310 | Tank high level | DI | 24 VDC, fail-safe | NC contact | opens in alarm |
> | P-101 | P101_RunCmd | Pump P-101 run command | DO | Relay | | |
> | P-101 | P101_RunFb | Pump running feedback | DI | 24 VDC | | |
> | P-101 | P101_Fault | Pump fault | DI | 24 VDC | | |
> | P-101 | P101_Remote | Pump in remote | DI | 24 VDC | | |
>
> That is 1 AI, 1 AO, 5 DI and 1 DO from one loop and one pump.

Real I/O lists add columns for rack, slot and channel; the PLC tag or address; engineering units; alarm limits; the P&ID and loop-sheet numbers; the power source (loop powered, 24 VDC from the panel, isolated); the field junction box; and the hazardous-area rating if one applies.

### Counting cards

Totals drive the hardware bill. If the list gives 64 AI, 24 AO, 180 DI and 90 DO, and the cards are 16-channel analog inputs, 8-channel analog outputs, and 32-channel discrete cards, then the bare minimum is 4 AI cards, 3 AO cards, 6 DI cards and 3 DO cards. That leaves no room to grow, so apply the spare rule first. This lesson uses 15 percent installed spare channels, plus slot space for future cards, because adding a rack after panel build costs far more than a few unused terminals (some sites ask for 20 percent; follow the project specification).

Required channels = points x 1.15, rounded up. Cards = required channels / channels per card, rounded up.

| Type | Points | With 15% spare | Card size | Cards | Spare channels left |
|---|---|---|---|---|---|
| AI | 64 | 74 | 16 | 5 | 16 (25%) |
| AO | 24 | 28 | 8 | 4 | 8 (33%) |
| DI | 180 | 207 | 32 | 7 | 44 (24%) |
| DO | 90 | 104 | 32 | 4 | 38 (42%) |

Without spare, 180 DI would fit on 6 cards (192 channels), only 6.7 percent spare. The seventh card is what the rule buys. Rounding up to whole cards always gives at least the target, and often much more.

{{diagram:flow}}

## Why the I/O list is where integrators live

- **Scope and price.** Point count is the first number that bounds a quote. A 400-point job and a 4,000-point job are different projects.
- **One source of truth.** Tags in the PLC, the OPC server, the Ignition tag provider, the historian, the alarm list and the HMI should all come from it. Generating them with a script from a spreadsheet beats typing them.
- **Change control.** When the process engineer adds an instrument, the I/O list changes, then the P&ID revision, then the panel drawings. If the integrator discovers it at commissioning, it is a change order.
- **Checkout.** Every row is a test: {{term:loop-check|loop checks}} walk the list and confirm each signal end to end (see {{lesson:int-commissioning}}).

## Loop sheets and the other drawings

The **loop sheet** (ISA-5.4 style) shows one loop as a wiring path: the transmitter terminals, the junction box (JB) terminal strip, the marshalling cabinet cross-connection, the barrier or isolator if there is one, and finally the I/O card channel, plus the power source and the shield termination. When a loop check finds the PLC reads 0 mA, this is the page that tells the electrician where to put the meter. Other documents that sit around it: the instrument index (a list of every tag with its datasheet), the cable schedule, the control panel layout, and the cause-and-effect matrix that spells out interlocks.

> [!tip] Review the P&ID before you read the code
> Walk each controller bubble and ask three questions: what is the measurement, what is the final element, and is there a separate trip or switch? A control loop with no independent high-level switch is a design question for the process engineer, not a programming detail for you.
`,

  eli5: `
Imagine a big blueprint for a water park. One drawing shows all the slides, pools and pipes, and puts a little numbered sticker on every gauge and switch. That is the P&ID.

The stickers have a secret code. A sticker that starts with F is about flow, L is about level, and T is about temperature. The letters after say what the gadget does: one just shows a number, one sends the number somewhere, one is a switch that trips when the water gets too high. So "LSH" reads as "level switch, high."

Now the park's control room needs to know which of those gadgets have a wire running to it. Someone walks the blueprint and writes a shopping list: one row for every wire, saying what kind of signal it is and which plug on the control computer it goes into. That is the I/O list.

A loop sheet is the page of instructions for one single wire, from the gadget in the pool all the way to the right plug, so the electrician knows where to check when something is wrong.
`,

  why: `
**Why standardized tag letters?** Without a convention, every plant invents its own, and a technician who moves between sites has to relearn the code. ISA-5.1 means an operator at a refinery and a brewery both read LIC the same way. For you, it means a tag name carries meaning that can be used for sorting, filtering and generating screens automatically.

**Why separate bubble shapes for field, panel and DCS?** The shape tells maintenance where to walk and tells the controls engineer where a function is implemented. A flow indicator in a bubble with a square is a faceplate on a screen. A plain circle is a gauge someone has to climb to read. This matters when an operator asks why they cannot see a value: it may only exist in the field.

**Why derive the I/O list from the P&ID rather than from the PLC?** The P&ID is owned by process engineering and is the contractual statement of what the plant has. If the integrator builds the I/O list from the PLC code, the code and the plant can silently diverge. Starting from the P&ID and reconciling the two catches missing instruments, duplicate tags and valves that need position feedback. Experienced integrators argue about who owns the I/O list. When the owner's engineering firm produces it, the integrator reviews it. When nobody produces it, the integrator builds it, and should price that work.

**Why spare I/O?** Because every project grows. Spares cost cents per channel at build time and thousands per channel when you must add a rack, re-pull cable and re-test after the plant is running.
`,

  examples: [
    {
      title: "Catching a missing signal in the P&ID review",
      body: `A P&ID shows a transfer pump P-210 with a dashed line from a control-room hand switch bubble (HS-210) to the pump, but no running feedback bubble. The I/O list has a run command and no running status. In code, the HMI would show "Running" the moment the PLC commands the output, whether the contactor pulled in or not. Raising it in review costs one email and one DI channel. Finding it at SAT (site acceptance test), with the pump seized, costs a night shift.`
    },
    {
      title: "Reading an unfamiliar tag in the field",
      body: `An electrician says "check TT-4408." You decode it: temperature transmitter, loop 4408. The loop sheet will show a TE-4408 (the RTD) wired to the transmitter head, and 4-20 mA going to AI channel 3 of the card in slot 5. If the transmitter is configured 0-150 C, then 12 mA should read 75 C. That gives you a checkpoint to compare with the HMI value before touching any code.`
    }
  ],

  diagrams: {
    pid: `<svg viewBox="0 0 640 260" role="img" aria-label="A small P&ID fragment: a feed line with flow transmitter FT-101, flow controller FIC-101 in a DCS square and valve FV-101 into a tank with a level switch and level transmitter">
  <defs>
    <marker id="found-pid-docs-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <path class="dg-line" d="M16 120 L300 120" marker-end="url(#found-pid-docs-ah)"/>
  <rect class="dg-box" x="300" y="70" width="120" height="140" rx="8"/>
  <text class="dg-text-sm dg-mid" x="360" y="196">Tank T-201</text>
  <path class="dg-box" d="M210 108 L238 132 L238 108 L210 132 Z"/>
  <text class="dg-text-sm dg-mid" x="224" y="154">FV-101</text>
  <path class="dg-line-thin" d="M80 60 L80 120"/>
  <circle class="dg-box" cx="80" cy="42" r="20"/>
  <text class="dg-text-sm dg-mid" x="80" y="40">FT</text>
  <text class="dg-text-sm dg-mid" x="80" y="54">101</text>
  <rect class="dg-box-accent" x="128" y="18" width="48" height="48" rx="2"/>
  <circle class="dg-box-accent" cx="152" cy="42" r="20"/>
  <text class="dg-text-sm dg-mid" x="152" y="40">FIC</text>
  <text class="dg-text-sm dg-mid" x="152" y="54">101</text>
  <path class="dg-line dg-dash" d="M100 42 L128 42"/>
  <path class="dg-line dg-dash" d="M176 42 L224 42 L224 108" marker-end="url(#found-pid-docs-ah)"/>
  <path class="dg-line-thin" d="M420 100 L456 100"/>
  <circle class="dg-box" cx="476" cy="100" r="20"/>
  <text class="dg-text-sm dg-mid" x="476" y="98">LSH</text>
  <text class="dg-text-sm dg-mid" x="476" y="112">310</text>
  <path class="dg-line-thin" d="M420 160 L456 160"/>
  <circle class="dg-box" cx="476" cy="160" r="20"/>
  <text class="dg-text-sm dg-mid" x="476" y="158">LT</text>
  <text class="dg-text-sm dg-mid" x="476" y="172">201</text>
  <path class="dg-line dg-dash" d="M496 160 L546 160"/>
  <rect class="dg-box-accent" x="546" y="136" width="48" height="48" rx="2"/>
  <circle class="dg-box-accent" cx="570" cy="160" r="20"/>
  <text class="dg-text-sm dg-mid" x="570" y="158">LI</text>
  <text class="dg-text-sm dg-mid" x="570" y="172">201</text>
  <text class="dg-text-sm" x="16" y="232">Plain circle: field mounted. Circle in square: shared display / DCS function.</text>
  <text class="dg-text-sm" x="16" y="250">Heavy line: process pipe. Dashed: electrical signal. Thin line: instrument tap.</text>
</svg>`,
    flow: `<svg viewBox="0 0 640 170" role="img" aria-label="The P&ID is walked to produce the I/O list, which drives card counts and panel design, the PLC and HMI tag lists, and the loop check sheets">
  <defs>
    <marker id="found-pid-docs-ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="16" y="60" width="110" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="71" y="90">P&amp;ID</text>
  <path class="dg-line" d="M126 85 L186 85" marker-end="url(#found-pid-docs-ah2)"/>
  <rect class="dg-box-accent" x="188" y="60" width="130" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="253" y="90">I/O list</text>
  <path class="dg-line" d="M318 85 L360 85 L360 30 L400 30" marker-end="url(#found-pid-docs-ah2)"/>
  <path class="dg-line" d="M318 85 L400 85" marker-end="url(#found-pid-docs-ah2)"/>
  <path class="dg-line" d="M318 85 L360 85 L360 140 L400 140" marker-end="url(#found-pid-docs-ah2)"/>
  <rect class="dg-box" x="402" y="8" width="224" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="514" y="35">Cards, racks, panel, BOM</text>
  <rect class="dg-box" x="402" y="63" width="224" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="514" y="90">PLC, OPC and Ignition tags, alarms</text>
  <rect class="dg-box" x="402" y="118" width="224" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="514" y="145">Loop sheets and loop checks</text>
</svg>`
  },

  pitfalls: [
    "Trusting a bubble symbol without reading the project legend sheet.",
    "Building the I/O list from the PLC code instead of reconciling it with the P&ID.",
    "Forgetting feedback signals for commanded devices (running, open and closed limits, fault).",
    "Treating FT-101 and FV-101 as unrelated tags. The shared loop number ties them to one loop.",
    "Sizing cards with zero spare capacity.",
    "Letting the PLC tag names drift from the I/O list names after the first revision."
  ],

  keyTerms: ["pid-drawing", "isa-5-1", "io-list", "loop-sheet", "loop-check", "tag", "io"],

  quiz: [
    {
      q: "What does the tag LSH-310 describe?",
      options: ["Liquid Sensor Hot, loop 310", "Level Signal Hardwired, loop 310", "Line Speed High, loop 310", "Level Switch, High, loop 310"],
      answer: 3,
      explain: [
        "The first letter L means level in ISA-5.1, and the S in second position means switch.",
        "ISA-5.1 letters are functions, so 'hardwired' is not a meaning here.",
        "Line speed would start with S for speed. L is level.",
        "Correct. L is level, S is switch, H is high; 310 is the loop number."
      ]
    },
    {
      q: "On a P&ID, FT-101, FIC-101 and FV-101 appear on different parts of the drawing. What do they have in common?",
      options: ["They are on the same pipe", "They share a loop number, so they belong to one loop", "They connect to the same I/O card", "They are all field-mounted"],
      answer: 1,
      explain: [
        "Wrong. They may sit in different places. The loop number ties the functions together, not the piping.",
        "Correct. The shared loop number ties FT, FIC and FV to one loop, whatever their letters.",
        "Wrong. Card assignment comes from the I/O list. The FIC is a controller function and has no card channel of its own.",
        "Wrong. The FIC is probably a DCS or PLC function, drawn with a different bubble, while the FT and FV are field devices."
      ]
    },
    {
      q: "A circle drawn inside a square on a P&ID usually means:",
      options: ["A gauge in the field", "A manual valve", "A shared display or control function, such as in a DCS", "A pneumatic signal"],
      answer: 2,
      explain: [
        "Field gauges are plain circles.",
        "Manual valves are valve symbols, not bubbles.",
        "Correct. The square marks a shared display and shared control function normally in a DCS.",
        "Pneumatic signals are shown by line style, not bubble shape."
      ]
    },
    {
      q: "A P&ID has one flow transmitter, one control valve with open and closed limit switches, and one high-level switch. How many I/O points does that add up to?",
      options: ["5", "3", "4", "6"],
      answer: 0,
      explain: [
        "Correct. FT gives 1 AI, the valve gives 1 AO plus 2 DI for the limits, and the switch gives 1 DI: 1 AI, 1 AO, 3 DI.",
        "That counts devices, not signals. The valve has three signals on its own.",
        "That misses a limit switch. Valve command plus two limits make three points.",
        "That would need another signal that was not described."
      ]
    },
    {
      q: "The I/O list shows 70 discrete inputs and the DI cards have 16 channels. You want at least 15 percent installed spare. How many cards do you order?",
      options: ["7", "4", "6", "5"],
      answer: 2,
      explain: [
        "Seven cards (112 channels) is about 60 percent spare, more than the rule of thumb calls for.",
        "Four cards give 64 channels, which cannot even cover the 70 points.",
        "Correct. 70 x 1.15 = 80.5 channels needed, and 6 cards x 16 = 96, which covers it with room for rounding up.",
        "Five cards give 80 channels. That leaves 10 spare, about 14 percent of the 70, just under the target."
      ]
    }
  ],

  resources: [
    { title: "ISA-5.1 P&ID instrument tag combinations with PLC/DCS", url: "https://industrialmonitordirect.com/blogs/knowledgebase/isa-51-pid-instrument-tag-combinations-with-plcdcs", type: "article", source: "Industrial Monitor Direct" },
    { title: "PLC and DCS tag naming conventions: ISA-5.1 structure and examples", url: "https://industrialmonitordirect.com/blogs/knowledgebase/plc-and-dcs-tag-naming-conventions-isa-51-structure-and-examples", type: "article", source: "Industrial Monitor Direct" },
    { title: "How to read oil and gas P&ID symbols", url: "https://kimray.com/node/1351", type: "article", source: "Kimray" },
    { title: "All about loop checking with the new ANSI/ISA standard", url: "https://www.automation.com/article/all-about-loop-checking-with-new-ansiisa-standard", type: "article", source: "Automation.com" },
    { title: "ISA-105 standards", url: "https://isa.org/standards-and-publications/isa-standards/isa-105-standards", type: "standard", source: "ISA" }
  ]
});
