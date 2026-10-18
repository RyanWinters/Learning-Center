LC.lesson({
  id: "found-history",
  title: "The story of industrial automation",
  track: "found",
  minutes: 15,
  level: 1,
  prereqs: [],
  tags: ["history", "plc", "dcs", "scada", "opc", "iiot"],
  summary: "From relay panels to MQTT: every step in the arc happened because the previous generation hit a wall you can still recognize today.",
  objectives: [
    "Explain why the PLC was invented and what it replaced",
    "Distinguish the PLC, DCS and PC-based SCADA lineages and the problem each solved",
    "Describe why OPC was needed and what it got wrong",
    "Place Ignition and the IIoT/MQTT movement in the arc"
  ],

  body: `
## Why a history lesson

Every tool in this curriculum exists because something older broke down. Ladder logic looks like relay wiring because it replaced relay wiring. OPC (OLE for Process Control, a data-exchange standard) exists because every HMI (human-machine interface, the operator screen) vendor wrote its own driver for every PLC (programmable logic controller). Ignition and MQTT (a lightweight messaging protocol, covered in Step 8) exist because per-tag licensing and polling stopped scaling. If you know what pain produced each step, you can predict what the next argument on a project will be.

{{diagram:arc}}

## Step 1: Relay panels (before 1968)

Before computers, machine logic was **{{term:relay-logic|relay logic}}**: electromechanical relays wired together in a cabinet. A transfer line at an auto plant might have hundreds or thousands of relays, with logic defined by physical wires. Pushbuttons, limit switches and solenoids (coil-operated valves) connected to the panel, and the "program" was the wiring diagram.

This worked, but it had real costs:

- Changing the logic meant rewiring. A model changeover could shut a line down for weeks.
- Relays wear out. Contacts pit, coils burn out, and finding one bad relay in a thousand is slow work.
- Panels were huge, hot and noisy.
- There was no data. If the line stopped, you walked to the panel and looked at which relay lights were on.

## Step 2: The PLC (1968 to the 1970s)

In 1968 the GM Hydra-Matic transmission division (part of General Motors) circulated a specification for a **standard machine controller** to replace hard-wired relay systems. The requirements were practical: solid-state, programmable by plant electricians and not only computer scientists, able to survive a factory floor, and reusable between models. ("Solid-state" means electronics with no moving contacts.) Bedford Associates, a small engineering firm in Massachusetts co-founded by **Dick Morley**, answered it. The prototype was the firm's 84th project, which is why it became the **Modicon 084**. Bedford soon renamed itself Modicon (for MOdular DIgital CONtroller).

> [!note] Dates differ by source
> Trade-press accounts place a working Bedford prototype in 1968, while some encyclopedic accounts date the finished 084 to 1969. Both are consistent with a prototype in 1968 and a delivered unit shortly after.

Two design decisions shaped everything after:

1. **The language looked like the drawing electricians already read.** {{lesson:plc-ladder-basics}} is the descendant of relay ladder diagrams. A technician could read a rung without learning to code.
2. **The controller was built to be abused.** Hardened I/O (the input and output connections to the machine), no moving parts, immunity to electrical noise. This is why PLCs are not just small PCs even today.

Allen-Bradley (Rockwell today) introduced its own PLC in the early 1970s, and the market filled out through the decade. By the 1980s every plant had PLCs, and each vendor had its own proprietary programming software and network. See {{lesson:plc-intro}} for the family you will work with.

## Step 3: The DCS (1975 on)

PLCs excelled at fast discrete logic: conveyors, presses, interlocks. Continuous process plants (refineries, chemicals, power) had a different problem: hundreds of analog loops, all needing PID (proportional-integral-derivative) control, operator displays, trending and alarms, all working together. Honeywell's **TDC 2000** (1975) is the usual milestone for the **{{term:dcs|distributed control system}}**: many small controllers spread around the plant, joined by a data highway to operator consoles, sold as one engineered, vendor-integrated package.

The tradeoff was lock-in. A DCS gave a unified database, built-in graphics and alarms, and very high reliability. In exchange you bought everything from one vendor, and expansion was expensive. Today the PLC and DCS worlds have largely converged, but the habits differ: DCS plants think in loops and faceplates, PLC plants think in machines and sequences.

## Step 4: PCs get a screen (1980s to 1990s)

PLCs had no screens and no history. As PCs became affordable, vendors built Windows software to show process graphics and log data. **Wonderware InTouch** is the best-known example, with Rockwell's **RSView**, Intellution **FIX** and others competing. This is the origin of **{{term:scada|SCADA}}** (supervisory control and data acquisition) and {{term:hmi|HMI}} software as a separate product from the controller.

It solved the visibility problem but created a new one: every package had to talk to every PLC. Each vendor wrote its own drivers, each in its own format. Add a new PLC brand and you might wait months for a driver.

## Step 5: OPC (1996)

The answer was a standard interface. In 1996 the **OPC Foundation** released **{{term:opc-classic|OPC}}** (originally "OLE for Process Control"), built on Microsoft COM/DCOM (Component Object Model and its network version, Microsoft's way for programs to call each other). A device vendor wrote one OPC server. Any client could read from it. The driver problem went away.

OPC Classic had its own costs: it ran only on Windows, and DCOM was famously painful to configure across machines and firewalls. Those pains led to **{{term:opc-ua|OPC UA}}** (2008), which is platform-independent and secure. See {{lesson:proto-opc}}.

## Step 6: Ethernet reaches the floor (late 1990s to 2000s)

Early plant networks were proprietary: Data Highway, Modbus Plus, DeviceNet, PROFIBUS. Commodity Ethernet became fast, cheap and switched, and industrial protocols moved onto it: Modbus TCP, EtherNet/IP and PROFINET. Controllers, drives and PCs shared one kind of cable for the first time. That convergence is the source of both the benefits (cheap, flexible, remote access) and the cybersecurity problem you will study in {{lesson:net-security}}.

## Step 7: Ignition (2003 and 2010)

**Inductive Automation** was founded in 2003 by Steve Hechtman, a controls integrator, in Folsom, California. Its first products were FactorySQL and FactoryPMI. In 2010 these were merged and rebuilt as **{{term:ignition|Ignition}}**: a web-launched, server-based platform with a modular architecture. The product bet was a licensing change. Instead of charging per tag, per client or per driver, Ignition licensed per server with unlimited tags and clients. It also put SQL (Structured Query Language) databases at the center, so SCADA data sat in an ordinary relational database any engineer could query.

For an integrator the effect was big. A proposal no longer had to be sized around license counts. See {{lesson:ign-what}}.

## Step 8: IIoT and MQTT (2010s)

As cloud and enterprise analytics grew, the old model (a central server **polling** each device) showed its limits. Every new consumer of data added more polling traffic, and every consumer needed to know every device's address. **{{term:mqtt|MQTT}}**, a lightweight publish/subscribe protocol designed in 1999 for oil pipeline telemetry over satellite links, found a second life. With the **Sparkplug** specification adding a defined topic structure and payload on top, devices publish only changes to a broker, and any number of subscribers consume them. This is the core of **{{term:iiot|IIoT}}** (Industrial Internet of Things) architectures and of the Unified Namespace (UNS) in {{lesson:mes-uns}}.

## The arc in one table

| Era | Pain | Answer | What it cost |
|---|---|---|---|
| Relay panels | Rewiring for any change | PLC | New skill set, vendor-specific software |
| PLCs | Analog control, plant-wide view | DCS | Vendor lock-in |
| PLCs without screens | No visibility | PC-based SCADA | A driver per vendor |
| Driver chaos | N vendors times M devices | OPC | Windows/DCOM fragility |
| Per-tag licensing, siloed data | Cost and silos | Ignition, SQL-centric | Need for IT-style skills |
| Polling everything | Scaling to enterprise and cloud | MQTT/Sparkplug, UNS | New architecture patterns |

> [!tip] Using the arc on a project
> When a customer says "we have a legacy system," ask which step they are on. A plant stuck at step 4 has proprietary drivers and a single Windows machine as a point of failure. A plant at step 6 has PLCs on Ethernet but probably a flat network. The step tells you the likely problems before you walk in the door.
`,

  eli5: `
Imagine a toy train layout. At first, to change how the trains move, you have to physically rewire a huge board of switches. Every change means unscrewing and re-soldering. Then someone invents a little box where you just rearrange cards to change the rules. That's the programmable controller.

Next, you want one big map on the wall showing where every train is. Each map-maker has to learn the secret language of each train box, which takes forever. So everyone agrees on one shared language, and any map can show any box. That's OPC.

Finally, you want people in other towns to watch your trains too. If every town keeps phoning your layout to ask "where is it now?" you get overwhelmed. So instead the layout shouts "train moved!" to a bulletin board, and anyone who cares reads the board. That's MQTT.

Each new idea fixed the headache of the one before it.
`,

  why: `
**Why learn the history at all?** Because the layers still exist in the field. You will find a relay-era interlock chain, a 1990s PLC-5 with an RSView screen, an OPC DA tunnel, and a new Sparkplug edge node in the same plant. Knowing what each was meant to solve tells you what it will be bad at.

**Why PLCs speak ladder.** The ladder language was a sales decision as much as an engineering one. The people who maintained plants were electricians, and a language that looked like their drawings got adopted. This is also why \`XIC\` and \`XIO\` mean "examine if closed/open", relay-contact vocabulary. Experienced integrators still argue over whether ladder is the right default for everything, and {{lesson:plc-languages}} covers the counterarguments.

**Why each step cost something.** Each generation traded one problem for another: flexibility for skills, visibility for drivers, standardization for Windows dependence, openness for security risk. Notice that the security problem is a direct result of the Ethernet step, because the protocols were designed when the network was a private wire. Expect the next step (cloud, UNS) to cost something too, and be able to name what.

**Why per-server licensing mattered.** It changed who decides the architecture. When licenses scale with tags, the customer limits the design. When they do not, the integrator can design for what the plant needs. Many of the patterns in this curriculum would be unaffordable under the older model.
`,

  history: `
Key dates, in order: GM Hydra-Matic's standard machine controller specification and the Bedford Associates prototype (1968); Modicon 084 (1969 as commonly dated); Honeywell TDC 2000 (1975); Modbus (1979); OPC Foundation and OPC Classic (1996); Inductive Automation founded (2003); Ignition released (2010). Sources disagree slightly on the exact dates of the earliest PLC prototypes, so treat the year ranges as approximate.
`,

  examples: [
    {
      title: "Walking into a legacy plant",
      body: `A packaging plant has SLC 5/05 PLCs, a Windows XP box running an old HMI package, and OPC Classic between them. You can place it at steps 2 through 5. Expect a single-point-of-failure PC, no historian, DCOM settings that nobody documented, and a flat network. A reasonable migration pitches an Ignition gateway, an OPC UA driver for the PLCs, and a segmented network, not a rip-and-replace of the controllers.`
    },
    {
      title: "Why the license model changes the proposal",
      body: `A customer wants 40,000 tags across 12 lines. Under a per-tag model the quote is dominated by tag count, so engineers trim scope. With per-server unlimited-tag licensing, scope is decided by what the plant needs, and the cost drivers become servers, modules and engineering hours.`
    }
  ],

  diagrams: {
    arc: `<svg viewBox="0 0 640 250" role="img" aria-label="Timeline of industrial automation from relay panels in the 1960s through PLC, DCS, PC SCADA, OPC, Ethernet, Ignition and MQTT">
  <text class="dg-title" x="20" y="26">Each step fixed the one before</text>
  <line class="dg-line" x1="30" y1="120" x2="610" y2="120"/>
  <rect class="dg-box" x="20" y="60" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="52" y="80">Relay</text>
  <text class="dg-text-sm dg-mid" x="52" y="96">panels</text>
  <text class="dg-text-muted dg-mid" x="52" y="140">pre-1968</text>
  <rect class="dg-box-accent" x="100" y="60" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="132" y="88">PLC</text>
  <text class="dg-text-muted dg-mid" x="132" y="140">1968</text>
  <rect class="dg-box" x="180" y="60" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="212" y="88">DCS</text>
  <text class="dg-text-muted dg-mid" x="212" y="140">1975</text>
  <rect class="dg-box" x="260" y="60" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="292" y="80">PC</text>
  <text class="dg-text-sm dg-mid" x="292" y="96">SCADA</text>
  <text class="dg-text-muted dg-mid" x="292" y="140">1980s</text>
  <rect class="dg-box-accent" x="340" y="60" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="372" y="88">OPC</text>
  <text class="dg-text-muted dg-mid" x="372" y="140">1996</text>
  <rect class="dg-box" x="420" y="60" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="452" y="80">Plant</text>
  <text class="dg-text-sm dg-mid" x="452" y="96">Ethernet</text>
  <text class="dg-text-muted dg-mid" x="452" y="140">2000s</text>
  <rect class="dg-box-accent" x="500" y="60" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="532" y="88">Ignition</text>
  <text class="dg-text-muted dg-mid" x="532" y="140">2010</text>
  <rect class="dg-box" x="576" y="60" width="50" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="601" y="88">MQTT</text>
  <text class="dg-text-muted dg-mid" x="601" y="140">2010s</text>
  <text class="dg-text-sm" x="20" y="180">Pain: rewire to change</text>
  <text class="dg-text-sm" x="20" y="198">Pain: no screen, no history</text>
  <text class="dg-text-sm" x="20" y="216">Pain: a driver per vendor</text>
  <text class="dg-text-sm" x="260" y="180">Fix: programmable logic</text>
  <text class="dg-text-sm" x="260" y="198">Fix: PC graphics and logging</text>
  <text class="dg-text-sm" x="260" y="216">Fix: one standard interface</text>
  <text class="dg-text-sm" x="460" y="180">Pain: polling, per-tag cost</text>
  <text class="dg-text-sm" x="460" y="198">Fix: publish/subscribe</text>
</svg>`
  },

  pitfalls: [
    "Treating all legacy gear as junk. A 30-year-old PLC that still runs is a feature; migrate the HMI and data layer first.",
    "Assuming Ethernet on the plant floor means the network is designed. Many plants just grew into it.",
    "Thinking PLC, DCS and SCADA are competing products. They solve different layers and now overlap.",
    "Confusing OPC Classic (Windows COM/DCOM) with OPC UA (platform-independent, secure)."
  ],

  keyTerms: ["relay-logic", "plc", "dcs", "scada", "hmi", "opc-classic", "opc-ua", "ignition", "mqtt", "iiot"],

  quiz: [
    {
      q: "What was the main business reason the PLC replaced relay panels?",
      options: ["Relays could not switch motors", "Changing logic required rewiring, which meant long downtime", "Relays were illegal in new plants", "PLCs were cheaper per I/O point from day one"],
      answer: 1,
      explain: [
        "Relays and contactors still switch motors in every plant today.",
        "Correct. A software change replaced a wiring change, which made model changeovers faster and cheaper.",
        "Relays were never banned; they are still used in safety and power circuits.",
        "Early PLCs were not cheaper per point. The saving came from flexibility and maintenance."
      ]
    },
    {
      q: "Why does ladder logic look like electrical drawings?",
      options: ["It was easy to render on early printers", "The IEC standard requires it", "It runs faster than other languages", "The people maintaining plants were electricians who read relay diagrams"],
      answer: 3,
      explain: [
        "The look came from the audience, not from printers.",
        "The IEC standard came much later and includes other languages.",
        "Speed is unrelated to how the language looks.",
        "Correct. Adoption depended on making plant electricians productive."
      ]
    },
    {
      q: "A refinery has 800 PID loops, centralized alarming, and wants one vendor responsible for everything. Which lineage fits best?",
      options: ["Relay panel", "Standalone PLCs with a PC HMI", "DCS", "MQTT broker"],
      answer: 2,
      explain: [
        "A relay panel cannot do analog loop control at this scale.",
        "This can work, but the DCS lineage was built around exactly this loop-heavy case.",
        "Correct. A DCS bundles controllers, operator stations and a shared database for continuous processes.",
        "MQTT is a transport for data, not a control system."
      ]
    },
    {
      q: "What problem was OPC (1996) created to solve?",
      options: ["Every HMI vendor writing its own driver for every PLC", "Insecure remote access", "Slow Ethernet speeds", "Lack of SQL databases in SCADA"],
      answer: 0,
      explain: [
        "Correct. One OPC server per device lets any OPC client read it.",
        "Security was a later concern, and OPC Classic was not secure.",
        "Ethernet speed was not the issue OPC addressed.",
        "Databases were not part of the OPC problem."
      ]
    },
    {
      q: "Why did MQTT with Sparkplug gain traction in the 2010s for plant data?",
      options: ["It can control motors directly", "It replaced PLCs", "It lets many consumers get changes from a broker without each polling every device", "It requires no network"],
      answer: 2,
      explain: [
        "MQTT carries data. Control stays in PLCs.",
        "PLCs still run the machines.",
        "Correct. Publish/subscribe decouples producers from consumers, which scales to enterprise and cloud use.",
        "MQTT needs a TCP/IP network and a broker."
      ]
    },
    {
      q: "You find a plant with PLC-5 controllers, an HMI PC running Windows 7, and OPC Classic between them. What is the most likely first risk to raise?",
      options: ["The PLC scan time", "A single aging PC and undocumented DCOM configuration as points of failure", "Too many analog inputs", "The use of ladder logic"],
      answer: 1,
      explain: [
        "Scan time is rarely the problem on a stable legacy line.",
        "Correct. The PC, OS age and DCOM setup are the fragile parts of this generation.",
        "The number of analog inputs is not a risk factor by itself.",
        "Ladder is fine and is still the dominant language."
      ]
    }
  ],

  resources: [
    { title: "Programmable logic controller (history section)", url: "https://en.wikipedia.org/wiki/Programmable_logic_controller", type: "article", source: "Wikipedia" },
    { title: "Historical Engineers: Richard Morley and the PLC", url: "https://www.allaboutcircuits.com/news/historical-engineers-richard-morley-programmable-logic-controller-PLC/", type: "article", source: "All About Circuits" },
    { title: "How Programmable Logic Controllers Emerged from Industry Needs", url: "https://www.controleng.com/articles/how-programmable-logic-controllers-emerged-from-industry-needs/", type: "article", source: "Control Engineering" },
    { title: "The dawn of the programmable logic controller", url: "https://www.automation.com/en-us/articles/2015-2/the-dawn-of-the-programmable-logic-controller-plc", type: "article", source: "Automation.com" },
    { title: "Inductive Automation", url: "https://en.wikipedia.org/wiki/Inductive_Automation", type: "article", source: "Wikipedia" },
    { title: "The Developers of Ignition Tell Their Story", url: "https://inductiveautomation.com/resources/podcast/episode-2-carl-gould-colby-clegg", type: "video", source: "Inductive Automation" }
  ]
});
