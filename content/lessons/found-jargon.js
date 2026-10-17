LC.lesson({
  id: "found-jargon",
  title: "Jargon survival guide",
  track: "found",
  minutes: 10,
  level: 1,
  prereqs: ["found-purdue"],
  tags: ["jargon", "glossary", "vocabulary", "field-guide"],
  summary: "A grouped field guide to the 50 or so terms you will hear in the first week on any plant floor or project call, with the one-line meaning that gets you through the meeting.",
  objectives: [
    "Place hardware terms (I/O, rack, chassis, card, panel, MCC, VFD) in the right physical picture",
    "Sort software terms by the layer they belong to (PLC, HMI, SCADA, DCS, historian, MES, ERP)",
    "Decode project-phase language: FAT, SAT, loop check, commissioning, punch list",
    "Translate a typical overheard sentence into plain meaning"
  ],

  body: `
Automation talk is dense with acronyms, and people assume you know them. This page is a field guide, not a lesson to memorize. Skim the tables, then come back when a word trips you up. Every term here is also in the glossary, and the app links them as you read other lessons.

## Hardware: the physical picture

A control system is a controller, plug-in cards that connect it to the world, and cabinets that hold everything.

| Term | What it means in one line |
|---|---|
| I/O | Input/output: the signals between the controller and the field. Inputs are sensors and switches; outputs are valves, motors and lamps. |
| Rack | A frame with slots for a controller, power supply and I/O cards. |
| Chassis | The housing and backplane for those cards. In Logix, "the chassis" and "the rack" mean nearly the same thing. |
| Backplane | The bus inside the chassis that powers the cards and carries data between them and the controller. |
| I/O card (module) | A plug-in with a fixed number of channels: 16 digital inputs, 8 analog inputs, and so on. |
| Remote I/O | Cards mounted near the equipment and connected back to the controller over a network cable. |
| Control panel | The enclosure with the PLC, power supplies, breakers, relays and terminals. Also called a control cabinet. |
| Junction box (JB) | A field box where individual instrument cables are joined onto one multi-pair cable. |
| Marshalling cabinet | A patch field between the field cables and the I/O cards, so wiring can be changed without re-pulling cable. |
| MCC | Motor control center: a lineup of cabinets with the starters and breakers for many motors. |
| VFD | Variable frequency drive: controls motor speed. Often shortened to "the drive." |
| PLC | The ruggedized controller that scans inputs, runs logic and writes outputs. |

> [!example] How they stack up
> A pump station has a **control panel** with a PLC in a **chassis**. Slot 1 is the controller, slot 2 a 16-point digital input **card**, slot 3 an 8-point analog input card. Field instruments land in a **junction box** at the wet well, and a multi-pair cable runs back to the panel. The pump runs from a **VFD** in the **MCC**, and the PLC talks to the drive over the network instead of through a hardwired analog signal. A second panel across the plant holds **remote I/O** for the screens and sump.

## Software and system layers

These are ordered roughly from the machine up to the boardroom, the layers you saw in {{lesson:found-purdue}}.

| Term | One-line meaning | Layer |
|---|---|---|
| HMI | The operator's screen for a machine or area. | Control / supervisory |
| SCADA | Software that gathers data from many controllers and lets operators supervise a site or many sites. | Supervisory |
| DCS | A matched controller, I/O, network and operator-station platform common in process plants, with PID and alarming built in. | Control + supervisory |
| Historian | A time-series database for process values; the source for trends. | Supervisory / plant |
| MES | Software that tracks and records production orders, quality and downtime. | Plant (ISA-95 level 3) |
| ERP | Business software for orders, inventory, finance and purchasing. | Enterprise (level 4) |
| OEE | A score: availability x performance x quality. A KPI computed by MES or SCADA, not a product. | Metric |
| CMMS | Maintenance work-order and parts software. | Plant / enterprise |
| OT | Operational technology: the plant-floor side. IT is the business side. | Whole-site term |
| Ignition | A single platform that can do HMI, SCADA, historian and more. | Supervisory and up |
| ISA-95 | The standard that names these levels and what passes between them. | Model |

OEE example: a line was scheduled for 480 minutes and ran 400 (availability 83%), at 90% of ideal speed (performance), and 95% of what it made was good (quality). OEE = 0.83 x 0.90 x 0.95 = about 71%.

## Data and programming

| Term | What it means |
|---|---|
| Tag | A named value with a data type, in the PLC or in SCADA, such as \`Pump1.Run\`. On a P&ID, a tag is also the instrument's ID (FIC-101). |
| UDT | User-defined type: a reusable template of members, such as a Motor with Run, Fault and Speed. |
| AOI | Add-On Instruction: a reusable Logix block with its own parameters and logic, such as a valve controller. |
| OPC | A family of data-exchange standards. OPC UA is the modern one. |
| RPI | Requested packet interval: how often, in milliseconds, a Logix controller exchanges data with a module. A card with 20 ms RPI is refreshed 50 times a second. |
| Setpoint | The target value a controller tries to hold. |
| Process variable | The measured value being controlled. |
| PID | The standard feedback-control algorithm (see {{lesson:found-control}}). |

## Control logic and safety words

| Term | Meaning |
|---|---|
| Interlock | Logic that blocks an action unless safe conditions hold: the pump cannot start with the discharge valve closed. |
| Permissive | A condition that must be true before a start is allowed. In casual use, close to an interlock. |
| HOA | Hand-Off-Auto: manual, off, or controlled by the system. |
| E-stop | The red mushroom button. Wired to cut power or motion, independent of normal PLC logic. |
| SIS | Safety instrumented system: an independent safety layer, with its own sensors and logic, that drives the process to a safe state. |

> [!warning] Do not mix control and safety
> An interlock in the PLC is a normal control function. An E-stop circuit or an SIS is safety. They are designed, wired and tested differently, often with certified safety controllers. If someone asks you to "just bypass the interlock," find out which kind it is before you do anything.

## Documents and project language

| Term | Meaning |
|---|---|
| P&ID | The drawing of the process and its instruments. See {{lesson:found-pid-docs}}. |
| I/O list | One row per signal; the basis for card counts and PLC tags. |
| Loop sheet | The wiring diagram of one instrument loop. |
| BOM | Bill of materials: the parts list for a panel. |
| FDS | Functional design specification: how the system will behave, agreed before programming. |
| FAT | Factory acceptance test: the customer-witnessed test at the builder's shop. |
| SAT | Site acceptance test: the formal test after installation on site. |
| Loop check | Confirming each instrument loop from the field device to the screen value, one at a time. |
| Commissioning | Bringing the installed system to life and proving it works; also called start-up. |
| Punch list | Remaining defects and loose ends to fix before sign-off. |
| As-builts | Drawings and code updated to match what was actually installed. |
| Brownfield | Work in an existing, running plant. |
| Greenfield | A new plant, built from scratch. |

Project roles (end user, OEM, system integrator, EPC, RFQ, SOW, change order, CSIA) are covered in {{lesson:found-roles}}.

## Translating an overheard conversation

> "The OEM's panel failed FAT because the drive RPI was set too long and three loop checks bounced. We'll fix it before SAT. Brownfield, so the MCC needs a punch-list walk first."

In plain terms: the machine builder's control cabinet failed its test at their shop, because the update interval for the drive was too slow (some values arrived late) and three instrument tests did not pass. They will fix it before testing again at the customer's site. Because the plant already runs, someone will inspect the motor starters and note leftover issues before work starts.

## A shortcut for new terms

When you meet an unfamiliar word, ask three questions: **where does it live** (field, panel, controller, server, business system), **what does it connect to** (upstream and downstream), and **who owns it** (instrument tech, electrician, controls engineer, IT). The answers place almost any term in the picture.
`,

  eli5: `
Joining a factory as a newcomer is like joining a hospital. Everyone talks in short codes. "OR is prepping, ICU needs a bed, labs are back." Nobody explains because they assume you know.

Factory language works the same way. "I/O" is just the wires going to and from the control computer. A "rack" is the shelf the plug-in cards sit on. A "panel" is the metal cabinet it all lives in. "FAT" is trying out the new machine at the builder's shop, and "SAT" is trying it again once it is installed at the customer's. "Commissioning" is turning everything on for the first time and checking it works.

You do not need to memorize them. You need a cheat sheet taped next to your desk and the willingness to ask "what does that stand for?" in the first week. Nobody expects you to know it all. They do expect you to ask.
`,

  why: `
**Why is there so much jargon?** Automation sits where electricians, instrument technicians, mechanical engineers, process engineers, IT staff and software developers meet. Each group has its own vocabulary, and the project borrowed all of it. Short names are efficient on a noisy floor and in meetings where hours cost money.

**Why does this matter to an integrator specifically?** Misreading a word costs money. If the customer says "we need SAT before the holiday" and you hear a general test rather than the formal, signed milestone that triggers payment, you will under-prepare. If someone says "the loop is done" and means the wiring is landed but not checked, you may schedule commissioning too early. Integrators repeat key terms back ("so you mean the signed site test, with the instrument loop checks witnessed?") to pin down the meaning.

**Why do the same words mean different things on different sites?** There is no governing body for casual speech. "The drive" may mean a VFD, a servo drive or a hard disk. "Tag" means a PLC variable to one person and an instrument ID to another. "Panel" can be the control cabinet, the HMI, or the front of an MCC bucket. Ask what the speaker means, and write definitions into the project's FDS so the paper and the people agree.

**Why group terms by layer?** Because a term is easier to remember attached to a place. Hardware terms live in cabinets, software terms live on servers and screens, and project terms live on the calendar.
`,

  examples: [
    {
      title: "Decoding a kickoff email",
      body: `"Attached are the P&IDs and I/O list rev B for the greenfield expansion. Please quote panel BOM, FDS and FAT. OEM skids will arrive pre-wired with their own PLCs." Translation: a new plant area with no legacy; drawings and signal list provided; price the parts list for the cabinets, the written behavior spec and the factory test; and expect to integrate with machines that bring their own controllers rather than programming everything yourself.`
    },
    {
      title: "Counting a card order from jargon",
      body: `"We have 48 DI, 20 AI, 12 DO and 8 AO." With 16-point digital cards and 8-point analog cards, that is 3 DI cards, 3 AI cards (24 points, covering 20), 1 DO card (16 points) and 1 AO card (8 points, no spare). Eight cards, plus the controller and power supply, fill a 12-slot chassis with room to grow. The AO card has no spare, which is worth flagging.`
    }
  ],

  pitfalls: [
    "Nodding along to an acronym you do not know. Ask in week one, when it is expected.",
    "Using 'tag' without saying PLC tag, SCADA tag or instrument tag.",
    "Treating an interlock as a safety function, or an E-stop as just another input.",
    "Assuming FAT and SAT mean informal testing. They are formal, documented milestones.",
    "Saying 'the drive' without saying which kind."
  ],

  keyTerms: ["io", "rack", "io-module", "mcc", "vfd", "dcs", "historian", "oee", "fat", "sat"],

  quiz: [
    {
      q: "A cabinet holds a controller, a 16-point input card and a power supply, all plugged into a shared housing with slots. What is that housing called?",
      options: ["Marshalling cabinet", "Chassis (rack)", "Junction box", "MCC"],
      answer: 1,
      explain: [
        "A marshalling cabinet is a patch field for field cables. It does not hold the cards.",
        "Correct. The chassis or rack has slots and a backplane to connect the modules.",
        "A junction box is a field enclosure for joining cables.",
        "An MCC houses motor starters, not PLC modules."
      ]
    },
    {
      q: "Which of these sits at ISA-95 level 3 and tracks production orders, genealogy and downtime?",
      options: ["ERP", "MES", "PLC", "VFD"],
      answer: 1,
      explain: [
        "ERP runs the business at level 4: orders, finance and purchasing.",
        "Correct. MES manages and records what is made, how well and why it stopped.",
        "A PLC is level 1, executing control logic.",
        "A VFD is power electronics that run a motor."
      ]
    },
    {
      q: "A line had 400 productive minutes out of 480 scheduled, ran at 90 percent of ideal speed and made 95 percent good product. About what is the OEE?",
      options: ["95 percent", "83 percent", "71 percent", "62 percent"],
      answer: 2,
      explain: [
        "That is only the quality factor.",
        "That is availability alone (400 / 480).",
        "Correct. 0.833 x 0.90 x 0.95 is about 0.71.",
        "That would need worse factors than described."
      ]
    },
    {
      q: "What is the difference between FAT and SAT?",
      options: ["FAT is at the builder's facility before shipping; SAT is on site after installation", "FAT is software; SAT is hardware", "They are the same test with different names", "FAT is for end users only; SAT is for OEMs only"],
      answer: 0,
      explain: [
        "Correct. Both are formal tests, in different places and at different times.",
        "Both tests cover the whole system, hardware and software together.",
        "They are separate milestones with separate documents.",
        "Both are usually witnessed by the customer and run by the builder or integrator."
      ]
    },
    {
      q: "An instrument tech says 'I'll do the loop checks on Thursday.' What will they do?",
      options: ["Tune PID loops on the controller", "Verify each instrument's signal end to end, from field device to the screen value", "Count the spare I/O points", "Write the FDS"],
      answer: 1,
      explain: [
        "That is tuning. A loop check tests the signal path, not the control parameters.",
        "Correct. Each signal is simulated or exercised and confirmed at the HMI.",
        "Counting spares is part of I/O list review.",
        "The FDS is a design document written before programming."
      ]
    },
    {
      q: "Which statement about interlocks and E-stops is right?",
      options: ["They are the same thing", "An interlock is normal control logic; an E-stop is a hard-wired safety function that works independent of PLC logic", "An E-stop is a software permissive", "Interlocks are only used on safety PLCs"],
      answer: 1,
      explain: [
        "They differ in design, wiring and testing requirements.",
        "Correct. Bypassing a control interlock and defeating a safety circuit are very different acts.",
        "E-stops are designed so they work even if software fails.",
        "Standard PLCs use interlocks all the time."
      ]
    }
  ],

  resources: [
    { title: "All about loop checking with the new ANSI/ISA standard", url: "https://www.automation.com/article/all-about-loop-checking-with-new-ansiisa-standard", type: "article", source: "Automation.com" },
    { title: "System integrators defined", url: "https://www.controleng.com/system-integrators-defined/", type: "article", source: "Control Engineering" },
    { title: "What is CSIA?", url: "https://www.controlsys.org/about/what-is-csia", type: "article", source: "Control System Integrators Association" },
    { title: "ISA-105 standards", url: "https://isa.org/standards-and-publications/isa-standards/isa-105-standards", type: "standard", source: "ISA" }
  ]
});
