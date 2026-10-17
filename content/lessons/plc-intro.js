LC.lesson({
  id: "plc-intro",
  title: "What a PLC is and the Allen-Bradley family",
  track: "plc",
  minutes: 20,
  level: 1,
  prereqs: ["found-devices"],
  tags: ["plc", "allen-bradley", "controllogix", "compactlogix", "hardware"],
  summary: "A PLC is a tough, boring computer that runs one job forever: read inputs, decide, write outputs. Here is the hardware, and the Rockwell product names you will hear.",
  objectives: [
    "Explain what a PLC does and how it differs from a PC and from a relay panel",
    "Name the physical parts of a modular PLC: chassis, backplane, power supply, controller and I/O modules",
    "Tell ControlLogix, CompactLogix, Micro800 and the legacy SLC-500/PLC-5 families apart",
    "Match each Allen-Bradley controller family to its programming software",
    "Recognize the FactoryTalk product names that sit around the PLC"
  ],

  body: `
## What a PLC is

A {{term:plc|PLC}} (programmable logic controller) is an industrial computer built to run one program, over and over, for years, with no operator. It reads electrical signals from the machine (buttons, limit switches, sensors), runs your logic, and switches electrical outputs (motor starters, valves, lamps). That is the whole job. Everything else in this track is detail about how to describe the logic, name the data, and keep it running safely.

You care because every plant you will integrate has them, and your Ignition screens are only a window into what the PLC is doing. The PLC makes the decisions. Ignition shows and records them.

## PLC vs PC vs relay panel

| | Relay panel | PLC | Industrial PC |
|---|---|---|---|
| Logic is | Wires between relays | Software, run in a fixed loop | Software, scheduled by an OS |
| Change it by | Rewiring | Editing and downloading | Editing and redeploying |
| Reaction time | Milliseconds, fixed by relay speed | A few to tens of milliseconds, predictable | Usually fast, not guaranteed |
| Failure mode | Contacts weld or burn out | Rare. Modules fail, program keeps running | OS updates, disk, reboot |
| Environment | Cabinet | Cabinet, 0 to 60 C, vibration, noise | Needs care and often fans |
| Expected life | Decades | 15 to 25 years | 3 to 7 years |

**Predictability is the PLC's selling point.** A PC running Windows may pause for a fraction of a second to install an update or index a disk. For a dashboard that is fine. For a press that must stop when a light curtain is broken, it is not.

Before PLCs, control was **{{term:relay-logic|relay logic}}**: hundreds of electromechanical relays wired into a panel. Changing a sequence meant new wire runs. PLCs were created in the late 1960s to replace those panels, and their first programming language, ladder, was drawn to look like the relay wiring diagram so electricians could read it. You will see this in {{lesson:plc-ladder-basics}}.

## The physical parts

A modular PLC is a set of cards in a metal frame. The names matter because you will use them when you order parts or read the I/O tree.

{{diagram:chassis}}

- **Chassis (rack).** The frame with slots. ControlLogix chassis come in 4, 7, 10, 13 and 17 slots.
- **{{term:backplane|Backplane}}.** The bus along the back of the chassis. Cards talk to each other through it. In a ControlLogix 5580 system the backplane carries the controller's data to local I/O.
- **Power supply.** Takes plant power (24 V DC or 120/240 V AC depending on model) and feeds the backplane. It does not power field devices. You size it by adding up each card's current draw.
- **Controller (CPU).** Holds your program and data, and runs the scan. In ControlLogix it is a card in a slot. In CompactLogix it is the first unit of the rail.
- **Communication modules.** Ethernet cards, ControlNet or DeviceNet bridges. Most 5580 controllers also have built-in Ethernet.
- **{{term:io-module|I/O modules}}.** The cards with terminals. A **digital input** card reports on or off (typically 24 V DC means 1). A **digital output** card switches loads. An **analog input** card turns 4 to 20 mA or 0 to 10 V into a number. Analog outputs go the other way.

> [!note] Field wiring never goes to the CPU
> Sensors and actuators wire to I/O module terminals. Nothing in the field wires to the controller itself except its programming port and network. That separation is why you can swap a failed output card without touching the program.

## The Allen-Bradley family

Allen-Bradley is the brand of Rockwell Automation, the dominant PLC vendor in North America. The product names are confusing at first because the same word appears in several families.

| Family | Size and role | Typical use | Software |
|---|---|---|---|
| **{{term:controllogix|ControlLogix}}** (1756; 5580 is the current generation) | Large, chassis-based, high performance, many I/O | Process plants, large lines, plant-wide control | Studio 5000 Logix Designer |
| **{{term:compactlogix|CompactLogix}}** (5380 and 5480 are current) | Medium, controller and I/O in a compact footprint | Machines and skids; 5480 is the high-performance option | Studio 5000 Logix Designer |
| **{{term:micro800|Micro800}}** (Micro820, 850, 870) | Small, fixed I/O with plug-in cards | Simple machines and small standalone jobs | {{term:ccw|Connected Components Workbench (CCW)}} |
| **SLC-500 / MicroLogix** | Legacy small and medium PLCs | Old machines still running | {{term:rslogix-500|RSLogix 500}} |
| **PLC-5** | Legacy large PLC | Old plants awaiting migration | RSLogix 5 |

ControlLogix and CompactLogix share the same project format, instruction set and tag model. A program written for one moves to the other with modest changes, mostly I/O. That shared model is called **Logix**, and it is what this track teaches. Micro800 looks similar but is a separate branch with its own differences: its tags and instructions are close, but its projects do not open in Studio 5000.

**Legacy platforms** use fixed data files with addresses like \`N7:0\` (integer file 7, word 0) and \`B3:0/1\` (bit). If your first site has an SLC-500, you will see this instead of named tags. It is still ladder, just with numeric addresses. Plan to meet it, but do not start there.

### What the numbers mean

Catalog numbers carry information. \`1756-L83E\` is a ControlLogix 5580 controller (the "1756" says ControlLogix, "L8" says 5580, "3" is memory tier, "E" is Ethernet). \`1769-L33ER\` is a CompactLogix 5370 (older). \`5069-L330ER\` is a CompactLogix 5380 (the 5069 family). \`2080-LC50\` is a Micro850. You do not need to memorize these. You do need to read the first four digits to know the family.

## The software around the PLC

Programs are written in **Studio 5000 Logix Designer** (see {{lesson:plc-studio}}), which used to be called RSLogix 5000. Rockwell also sells a family of other software under the {{term:factorytalk|FactoryTalk}} name:

- **FactoryTalk View** (Site Edition and Machine Edition): Rockwell's HMI/SCADA software, and the main thing Ignition competes with.
- **PanelView**: a physical HMI terminal running a View Machine Edition app.
- **FactoryTalk Linx / RSLinx**: the communication driver on a PC so software can reach controllers.
- **FactoryTalk Historian**, **FactoryTalk Batch**, **FactoryTalk Optix**: the historian, batch engine and newer HMI platform.

You will often meet a plant with Logix PLCs and a FactoryTalk View SCADA, and be asked to replace or extend it with Ignition. Learn the vocabulary so you can speak both.

> [!example] Reading a bill of materials
> A machine's panel spec lists: \`5069-L320ER\` controller, \`5069-IB16\` 16-point 24 V DC input, \`5069-OB16\` 16-point DC output, \`5069-IF8\` 8-channel analog input. You can tell: a CompactLogix 5380 controller, 16 buttons or sensors in, 16 lamps or relays out, and eight analog channels (say, four pressure and four temperature transmitters). With 16 inputs, a field device on terminal 3 will show up as bit 3 of the input module's data, which is the key link we make in {{lesson:plc-tags}}.

## Ordering and thinking about capacity

You will be asked "how big a PLC?" Start with counts: digital in, digital out, analog in, analog out, plus network devices (drives, remote I/O). Add 20 percent spare I/O. Check controller memory and the number of Ethernet connections each model supports; both scale up the catalog ladder. Most small projects fit comfortably in the middle of the range. Large process plants typically use ControlLogix 5580 because of connection count and speed.
`,

  eli5: `
Think of a PLC as a very patient night watchman with a checklist. He walks the same route all night. At each stop he looks at a few things (is the door shut, is the light on, is the tank full) and follows his checklist: "If the tank is full, close the valve." Then he does the walk again. He never gets bored, never takes a break, and does the walk many times every second.

In the old days, the checklist was built from lots of little mechanical switches wired together in a big cabinet. To change the rules you had to rewire the cabinet. A PLC replaces the cabinet with a small computer, so changing a rule is typing a change and sending it. The cards in the PLC are like the watchman's eyes and hands: some cards look at things, some cards push buttons.
`,

  why: `
**Why not just use a PC?** You can, and some plants do, but the PLC's value is **determinism and ruggedness**. A PLC has no desktop, no pop-ups and no forced update. It boots straight into the program and is designed to run for years. When it fails, it fails in a defined way: outputs go to a known state. Industrial PCs and soft PLCs are catching up, but integrators still choose PLCs when a bad day means a damaged machine or a hurt person.

**Why modular?** Plants change. A card with 16 inputs fills up, and someone adds a sensor. With a modular PLC you add a card, edit the I/O tree and logic, and download. You also stock spares by card type, not by whole machine. The tradeoff is cost: a modular system costs more up front than a fixed-I/O brick, which is why Micro800 and CompactLogix exist.

**Why do integrators argue about vendors?** Allen-Bradley dominates North America, Siemens dominates Europe and much of Asia, and many OEMs use others. The argument is rarely about technology. It is about what your client's maintenance team can support, what their spares are, and how long the platform will be supported. Standardizing on one vendor per site is common. We cover the others in {{lesson:plc-other-vendors}}.

**Why learn the legacy platforms at all?** A great deal of working equipment is 20 to 30 years old. The integrator who can read an SLC-500 ladder, and knows when to migrate and when to leave it alone, is valuable. A migration done badly can shut a line.
`,

  history: `
The programmable controller was proposed in 1968 by General Motors Hydramatic, which wanted to stop rewiring relay panels at every model change. Bedford Associates, with Dick Morley, delivered the Modicon 084 in 1969. Allen-Bradley followed with its own PLC family through the 1970s and 80s (PLC-2, PLC-5, later SLC-500). ControlLogix arrived in the late 1990s and brought the tag-based model that replaced fixed addresses. RSLogix 5000 became Studio 5000 Logix Designer around 2012.
`,

  examples: [
    {
      title: "Sizing a simple pump skid",
      body: `The skid has 10 pushbuttons and limit switches, 6 solenoids and lamps, 4 pressure transmitters and 2 temperature inputs. That is 10 digital in, 6 digital out, 6 analog in. With 20 percent spare, order 16 in, 8 out, 8 analog. A CompactLogix 5380 with a 16-point input card, an 8-point output card and an 8-channel analog input fits in about 40 cm of DIN rail and costs far less than a ControlLogix chassis.`
    },
    {
      title: "Which software do I install?",
      body: `Walking into a plant you find: a 1756-L73 in a 10-slot chassis (ControlLogix, Studio 5000), a SLC 5/04 on an older press (RSLogix 500), and a 2080-LC50 on a stand-alone packaging station (CCW). Three controllers, three tools. The first lesson in the field is to ask the site which tools and versions they use, and install them before the day you need them.`
    }
  ],

  diagrams: {
    chassis: `<svg viewBox="0 0 640 230" role="img" aria-label="A ControlLogix chassis: power supply, controller, Ethernet module and I/O modules sit side by side on a backplane, and field devices wire to the I/O module terminals">
  <rect class="dg-zone" x="20" y="50" width="600" height="110" rx="6"/>
  <text class="dg-title" x="30" y="40">Chassis with backplane</text>
  <rect class="dg-box" x="34" y="66" width="70" height="80" rx="4"/>
  <text class="dg-text-sm dg-mid" x="69" y="100">Power</text>
  <text class="dg-text-sm dg-mid" x="69" y="116">supply</text>
  <rect class="dg-box-accent" x="114" y="66" width="80" height="80" rx="4"/>
  <text class="dg-text-sm dg-mid" x="154" y="100">Controller</text>
  <text class="dg-text-muted dg-mid" x="154" y="116">CPU</text>
  <rect class="dg-box" x="204" y="66" width="80" height="80" rx="4"/>
  <text class="dg-text-sm dg-mid" x="244" y="100">Ethernet</text>
  <text class="dg-text-muted dg-mid" x="244" y="116">module</text>
  <rect class="dg-box" x="294" y="66" width="80" height="80" rx="4"/>
  <text class="dg-text-sm dg-mid" x="334" y="100">Digital in</text>
  <rect class="dg-box" x="384" y="66" width="80" height="80" rx="4"/>
  <text class="dg-text-sm dg-mid" x="424" y="100">Digital out</text>
  <rect class="dg-box" x="474" y="66" width="80" height="80" rx="4"/>
  <text class="dg-text-sm dg-mid" x="514" y="100">Analog in</text>
  <line class="dg-line-thin" x1="34" y1="152" x2="606" y2="152"/>
  <text class="dg-text-muted" x="34" y="176">Backplane: data and power between cards</text>
  <line class="dg-line" x1="334" y1="146" x2="334" y2="196"/>
  <line class="dg-line" x1="424" y1="146" x2="424" y2="196"/>
  <line class="dg-line" x1="514" y1="146" x2="514" y2="196"/>
  <text class="dg-text-sm dg-mid" x="334" y="216">Buttons</text>
  <text class="dg-text-sm dg-mid" x="424" y="216">Lamps, valves</text>
  <text class="dg-text-sm dg-mid" x="514" y="216">Transmitters</text>
</svg>`
  },

  pitfalls: [
    "Assuming every Allen-Bradley PLC uses the same software. Micro800 needs CCW, and SLC/MicroLogix needs RSLogix 500.",
    "Sizing the power supply by I/O count instead of adding each card's backplane current.",
    "Wiring field devices to the wrong voltage card. A 24 V DC input card does not accept 120 V AC.",
    "Treating a PLC like a PC and expecting it to wait politely while a slow operation finishes.",
    "Ignoring legacy equipment on the plant floor until a failure forces a rushed migration."
  ],

  keyTerms: ["plc", "relay-logic", "backplane", "io-module", "controllogix", "compactlogix", "micro800", "ccw", "rslogix-500", "factorytalk"],

  quiz: [
    {
      q: "What is the main reason integrators choose a PLC over an ordinary PC for machine control?",
      options: ["PLCs are always faster than PCs", "PLCs run logic predictably and keep going for years without a desktop OS getting in the way", "PCs cannot read digital inputs", "PLCs use less electricity"],
      answer: 1,
      explain: [
        "Raw speed is not the point. A PC is often faster, but its timing is not guaranteed.",
        "Correct. Determinism and ruggedness are the key: fixed scan, no forced updates, defined behavior on failure.",
        "PCs can read inputs with add-in hardware. They just lack the predictable behavior.",
        "Power use is minor next to the cost of unpredictable control."
      ]
    },
    {
      q: "A technician says, 'Replace the card in slot 4.' Where do you look on the hardware?",
      options: ["The chassis, where each card sits in a numbered slot", "The programming laptop's COM port", "The HMI screen", "The network switch"],
      answer: 0,
      explain: [
        "Correct. Slots are positions in the chassis and are part of the card's address in the I/O tree.",
        "A COM port on a laptop is not a PLC slot.",
        "HMI screens do not have slots for I/O cards.",
        "Switch ports are not PLC slots."
      ]
    },
    {
      q: "You are handed a Micro850 (2080-LC50). Which software opens its project?",
      options: ["Studio 5000 Logix Designer", "RSLogix 500", "Connected Components Workbench", "FactoryTalk View"],
      answer: 2,
      explain: [
        "Logix Designer is for ControlLogix and CompactLogix.",
        "RSLogix 500 is for SLC-500 and MicroLogix.",
        "Correct. Micro800 controllers are programmed in CCW.",
        "FactoryTalk View is an HMI/SCADA package, not a PLC programming tool."
      ]
    },
    {
      q: "A site has an old PLC-5 whose addresses look like N7:0 and B3:0/1. What does that tell you?",
      options: ["It stores data in numbered files, not named tags", "It is a ControlLogix 5580", "Its program cannot be ladder", "It must be using Ethernet only"],
      answer: 0,
      explain: [
        "Correct. Legacy platforms address data by file type, file number and element.",
        "ControlLogix uses named tags like Motor_Run.",
        "Legacy PLCs are programmed in ladder, which is what makes the address style so familiar to old-timers.",
        "Communication method is unrelated to the address style."
      ]
    },
    {
      q: "A panel spec lists a 5069-L320ER controller and 5069 I/O cards. What can you infer?",
      options: ["A ControlLogix 5580 system", "A CompactLogix 5380 system", "A Micro800 system", "An SLC-500 system"],
      answer: 1,
      explain: [
        "ControlLogix 5580 controllers are 1756-L8x catalog numbers.",
        "Correct. The 5069 family is CompactLogix 5380.",
        "Micro800 catalog numbers start with 2080.",
        "SLC-500 catalog numbers start with 1747."
      ]
    }
  ],

  resources: [
    { title: "Studio 5000 Logix Designer Online Help: Quick Start Steps", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/quick-start-steps.html", type: "docs", source: "Rockwell Automation" },
    { title: "Design Software Technical Documentation", url: "https://www.rockwellautomation.com/en-us/support/documentation/technical/factorytalk-software/design.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures (1756-PM001)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Studio 5000 Logix Designer Level 1: ControlLogix System Fundamentals", url: "https://www.rockwellautomation.com/en-us/support/workforce-development-training/instructor-led/studio-5000-logix-designer-lvl-1-ctrl-sys-fund-ccp146.html", type: "course", source: "Rockwell Automation" }
  ]
});
