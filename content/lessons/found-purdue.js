LC.lesson({
  id: "found-purdue",
  title: "The Purdue Model & ISA-95 levels",
  track: "found",
  minutes: 15,
  level: 1,
  prereqs: ["found-history"],
  tags: ["purdue", "isa-95", "levels", "architecture", "dmz", "uns"],
  summary: "The map of a plant's computers, from the sensor on the pipe to the ERP in the head office. Every other lesson lives somewhere on it.",
  objectives: [
    "Name Purdue/ISA-95 levels 0 to 5 and the typical systems at each",
    "Give the time scale of decisions at each level",
    "Explain what Level 3.5 (the industrial DMZ) is and why it was added",
    "Place Ignition, PLCs, MES and ERP on the model",
    "Describe how a Unified Namespace and edge architectures bend the strict hierarchy"
  ],

  body: `
## What the model is

The **{{term:purdue-model|Purdue model}}** (formally the Purdue Enterprise Reference Architecture, PERA) is a layered picture of an industrial company's information systems. It was developed at Purdue University in the 1990s. The **{{term:isa-95|ISA-95}}** standard (from ISA, the International Society of Automation; also IEC 62264, from the International Electrotechnical Commission) adopted its functional levels and defines what information moves between them. Security people later used it as a network zoning guide. Two more terms you will hear constantly: **IT** (information technology, the office and business networks) and **OT** (operational technology, the plant-floor systems).

You will use it daily, mostly as shared vocabulary: "that's a Level 2 problem", "ERP wants that from Level 3", "put it in the DMZ". It anchors the rest of this curriculum, so learn it well.

{{diagram:levels}}

## The levels

| Level | Name | Typical systems | Typical time scale | Question it answers |
|---|---|---|---|---|
| 5 | Enterprise / external | Corporate network, cloud, vendor and partner access | days to years | What is the business doing? |
| 4 | Business planning | {{term:erp|ERP}} (SAP, Oracle), supply chain, corporate BI (business intelligence reporting) | shifts to months | What should we make and sell? |
| 3.5 | Industrial DMZ | Firewalls, jump hosts, replicated historians, brokers | n/a | What may cross between IT and OT? |
| 3 | Site operations | {{term:mes|MES}} (manufacturing execution system), site historian, Ignition gateway (site), batch, LIMS (laboratory information management system) | minutes to shifts | How did production go? What is next? |
| 2 | Supervisory control | SCADA (supervisory control and data acquisition) and {{term:hmi|HMI}} (human-machine interface), operator stations, alarm servers, Ignition | seconds to minutes | What is the process doing? |
| 1 | Basic control | {{term:plc|PLCs}} (programmable logic controllers), DCS (distributed control system) controllers, drive controllers, safety PLCs | milliseconds to seconds | What should the outputs be right now? |
| 0 | Process | Sensors, valves, motors, instruments | real time (continuous) | What is physically happening? |

Notes that matter in practice:

- **Level 0** is the physical equipment. See {{lesson:found-devices}}.
- **Level 1** executes control logic every scan, typically 5 to 50 ms for a machine. See {{lesson:plc-scan}}.
- **Level 2** shows operators the process, sets setpoints, and raises alarms. This is where most Perspective work happens.
- **Level 3** is the manufacturing operations layer: work orders, recipes, genealogy, OEE (overall equipment effectiveness), quality. See {{lesson:mes-what}}.
- **Level 4** is the realm of IT: ERP, procurement, finance, planning. Time is measured in days and months.
- **Level 5** is sometimes drawn as the wider enterprise or internet. Sources vary on whether it is its own level, so ask what your customer's diagram means.

## Level 3.5: the industrial DMZ

The original model assumed layers talked only to their neighbors. In practice, ERP wants production counts and a historian wants to reach the cloud, and a direct IT-to-OT connection puts the control system on the corporate network's attack surface. The fix is an **{{term:dmz|industrial DMZ}}** (demilitarized zone), a buffer network between Level 3 and Level 4. It is not part of the original ISA-95 text; it was added by the security community and is now standard practice. See {{lesson:net-security}}.

The rule is simple: **no traffic crosses directly.** IT connects to services in the DMZ. OT connects to services in the DMZ. Nothing on either side opens a session straight through. Typical DMZ occupants are a replicated historian, a patch server, a remote-access jump host, and an MQTT broker.

> [!warning] Level 3 is not the DMZ
> Diagrams sometimes label Level 3 as "the DMZ." It is not. Level 3 is site operations and runs real production applications. The DMZ sits between Level 3 and Level 4 and runs nothing operational of its own.

## A worked example: one number's journey

Meridian Foods' tank level transmitter LT101 (0 to 5.0 m) sends 14 mA on a 4-20 mA loop (see {{lesson:found-signals}}).

1. **Level 0:** the {{term:transmitter|transmitter}} measures pressure and sets the loop current.
2. **Level 1:** the PLC's analog input card converts it to a count, the program scales it to 62.5 percent of range (3.125 m), and the pump logic uses it every scan.
3. **Level 2:** an Ignition gateway reads the LT101 tag from the PLC (PLC1, 10.20.10.10) every second and shows it on a Perspective screen. It raises a high alarm at 90 percent.
4. **Level 3:** the site historian stores a sample each minute. The MES uses it to compute that batch 4412 used 8,300 L.
5. **Level 3.5:** a replicated historian in the DMZ copies the batch summary out.
6. **Level 4:** the ERP posts the material consumption to inventory and finance.

Notice how the time scale changes. The same measurement is acted on in milliseconds at Level 1 and tallied monthly at Level 4. Each level keeps only the detail it needs.

## Where Ignition fits

Ignition is unusual because it spans several levels depending on how you deploy it.

- As an HMI/SCADA server it lives at **Level 2**.
- With the historian, alarming, and reporting it reaches into **Level 3**.
- With a database and the Sepasoft modules it can be the **MES** at Level 3 (see {{lesson:mes-sepasoft}}).
- Ignition Edge sits close to **Level 1** on a machine.
- It can also publish to MQTT brokers that feed Level 4 and the cloud.

The same piece of software at different levels is why architecture decisions (what runs where, who connects to whom) matter more than the product choice.

## How modern architectures bend the model

The strict hierarchy is a good teaching model and a poor description of a modern plant:

- **Unified Namespace (UNS):** instead of ERP asking MES asking SCADA asking the PLC, every system publishes to and subscribes from a central broker with a shared topic structure. Data flows by topic, not up a ladder. See {{lesson:mes-uns}}.
- **Edge devices:** an edge gateway at Level 1 may talk MQTT straight to a broker that cloud applications consume.
- **Cloud services:** analytics run at Level 5 and send recommendations back down.
- **Smart devices:** an IO-Link sensor or a drive with an OPC UA server blurs Levels 0, 1 and 2.

The security rule survives the bend. A UNS broker lives in the DMZ or the OT side, devices connect outbound to it, and firewall rules are written for those flows, not for every pair of systems. The levels remain a way of reasoning about *who needs what, how fast, and with what risk*, even when the wires do not follow them.

> [!tip] Using it in a design review
> Draw the system, label each box with a level, then mark every line that skips a level. Each skipped level is either a deliberate design choice you can explain or a risk to fix.
`,

  eli5: `
Think of a restaurant. At the bottom are the people actually cooking: they chop, flip and stir, and they react in seconds. Above them is the head chef, who watches all the stations and calls out "table 4 is behind." Above that is the restaurant manager, who tracks tonight's orders and how many plates went out. Above that is the owner's office, who decides what's on next month's menu and orders ingredients from suppliers.

Each person cares about different things at different speeds. The cook needs to know "is the pan hot right now?" The owner needs to know "did we make money this quarter?" Nobody expects the owner to watch the pan or the cook to read the accounts.

The Purdue model is that same idea for a factory's machines and computers, with numbered floors from 0 at the bottom (the pan) to 4 and 5 at the top (the owner). And between the kitchen and the owner's office there's a hatch with a guard (the DMZ), so only approved messages pass through.
`,

  why: `
**Why levels at all?** Because different jobs need different speeds, reliability and trust. A PLC must respond in milliseconds and keep running if the network dies. An ERP can be down for an hour during a patch. Mixing them on one box or one network means the slowest, least reliable, most exposed component sets the limit for the rest.

**Why separate IT from OT?** The worst outcome in a plant is not lost data, it is a stopped line or a safety incident. IT networks get patched, rebooted and exposed to email and the internet. Control systems often cannot be patched for years. The boundary stops a ransomware infection in the office from reaching the PLCs. That is the reason for the DMZ and for the guidance in {{lesson:net-security}}.

**What integrators argue about.** Is the model still useful? Some say the UNS and cloud have killed it. Others say it remains the best way to reason about risk and responsibility, and that a UNS is simply a new way of routing data across the same levels. Both camps agree you still need to know what runs where. Another live argument is where to put things that straddle levels, such as an Ignition gateway that reads PLCs and also publishes to a cloud broker. The usual answer is to treat the gateway as a Level 2/3 system and keep its cloud-facing connection outbound-only through the DMZ.

**Why data volume shrinks going up.** The PLC may see 1,000 values per second. The historian keeps a selection. The MES keeps batch totals. The ERP keeps one number per order. Good architecture decides at each level what to keep and what to discard, instead of trying to move everything everywhere.
`,

  history: `
The Purdue Reference Model for Computer Integrated Manufacturing was developed at Purdue University under Theodore Williams in the 1980s and 1990s, and its Enterprise Reference Architecture generalized it. The ISA-95 standard (also IEC 62264) took the functional hierarchy and defined models for information exchanged between enterprise and control systems. The industrial DMZ, often called "Level 3.5," came later from the security community; the original models were about functions, not cybersecurity.
`,

  examples: [
    {
      title: "Classify these six systems",
      body: `A Micro850 on a packaging machine: Level 1. An Ignition Perspective operator screen: Level 2. A Sepasoft OEE module computing downtime by shift: Level 3. A pass-through firewall pair with a replicated historian: Level 3.5. SAP production orders: Level 4. A vendor's remote monitoring cloud: Level 5.`
    },
    {
      title: "A request that skips levels",
      body: `A finance analyst wants live line speed in Power BI. A direct connection from Power BI to the PLC skips Levels 2 to 4 and puts the PLC on the corporate network. A better design: Ignition publishes line speed through the DMZ broker or a replicated database, and Power BI reads from there.`
    }
  ],

  diagrams: {
    levels: `<svg viewBox="0 0 640 470" role="img" aria-label="Purdue model levels 0 to 5 with example systems at each level, an industrial DMZ at level 3.5, and the time scale of decisions on the right">
  <text class="dg-title" x="20" y="24">Purdue / ISA-95 levels</text>
  <text class="dg-text-muted" x="494" y="24">Time scale</text>

  <rect class="dg-box-2" x="20" y="36" width="464" height="48" rx="4"/>
  <text class="dg-text" x="32" y="56">Level 5   Enterprise / external</text>
  <text class="dg-text-sm" x="32" y="74">Corporate WAN, cloud analytics, partners</text>
  <text class="dg-text-sm" x="494" y="64">days to years</text>

  <rect class="dg-box-2" x="20" y="90" width="464" height="48" rx="4"/>
  <text class="dg-text" x="32" y="110">Level 4   Business planning</text>
  <text class="dg-text-sm" x="32" y="128">ERP, supply chain, finance, corporate BI</text>
  <text class="dg-text-sm" x="494" y="118">shifts to months</text>

  <rect class="dg-zone" x="12" y="146" width="478" height="42" rx="4"/>
  <rect class="dg-box-warn" x="20" y="150" width="464" height="34" rx="4"/>
  <text class="dg-text" x="32" y="172">Level 3.5   Industrial DMZ</text>
  <text class="dg-text-sm" x="250" y="172">firewall, jump host, broker</text>
  <text class="dg-text-sm" x="494" y="172">no direct sessions</text>

  <rect class="dg-box-accent" x="20" y="196" width="464" height="48" rx="4"/>
  <text class="dg-text" x="32" y="216">Level 3   Site operations</text>
  <text class="dg-text-sm" x="32" y="234">MES, site historian, batch, Ignition gateway</text>
  <text class="dg-text-sm" x="494" y="224">minutes to shifts</text>

  <rect class="dg-box-accent" x="20" y="250" width="464" height="48" rx="4"/>
  <text class="dg-text" x="32" y="270">Level 2   Supervisory control</text>
  <text class="dg-text-sm" x="32" y="288">SCADA, HMI, alarms, operator stations</text>
  <text class="dg-text-sm" x="494" y="278">seconds to minutes</text>

  <rect class="dg-box" x="20" y="304" width="464" height="48" rx="4"/>
  <text class="dg-text" x="32" y="324">Level 1   Basic control</text>
  <text class="dg-text-sm" x="32" y="342">PLCs, DCS controllers, drive and safety controllers</text>
  <text class="dg-text-sm" x="494" y="332">milliseconds to seconds</text>

  <rect class="dg-box" x="20" y="358" width="464" height="48" rx="4"/>
  <text class="dg-text" x="32" y="378">Level 0   Process</text>
  <text class="dg-text-sm" x="32" y="396">Sensors, transmitters, valves, motors, drives</text>
  <text class="dg-text-sm" x="494" y="386">continuous, real time</text>

  <text class="dg-text-muted" x="20" y="432">IT side: levels 4 to 5.  OT side: levels 0 to 3.  Firewalls guard 3.5.</text>
  <text class="dg-text-muted" x="20" y="452">Data volume falls as you go up: raw signals, then selected history, then batch totals.</text>
</svg>`
  },

  pitfalls: [
    "Labeling Level 3 as the DMZ. Level 3 runs production applications; the DMZ sits between 3 and 4.",
    "Letting IT systems open sessions straight into Levels 1 and 2 for convenience.",
    "Treating the levels as product categories. Ignition spans several depending on what you deploy.",
    "Moving all data up every level instead of deciding what each level needs.",
    "Assuming a UNS removes the need for zones and firewalls."
  ],

  keyTerms: ["purdue-model", "isa-95", "dmz", "erp", "mes", "scada", "hmi", "plc", "uns"],

  quiz: [
    {
      q: "At which Purdue level does a PLC normally sit?",
      options: ["Level 0", "Level 1", "Level 2", "Level 3"],
      answer: 1,
      explain: [
        "Level 0 is the physical process: sensors, valves, motors.",
        "Correct. Level 1 is basic control, where PLCs and DCS controllers execute logic.",
        "Level 2 is supervisory: HMI and SCADA.",
        "Level 3 is site operations such as MES."
      ]
    },
    {
      q: "The ERP team asks for live line counts. Which design respects the model?",
      options: ["Open the ERP server to the PLC subnet", "Install ERP software on the PLC network", "Email a spreadsheet every hour", "Publish counts to a broker or replica in the DMZ that ERP reads"],
      answer: 3,
      explain: [
        "That creates a direct IT-to-OT session that bypasses the DMZ.",
        "ERP does not belong on the control network.",
        "It works but is manual and not a real integration.",
        "Correct. The DMZ keeps sessions from crossing directly between IT and OT."
      ]
    },
    {
      q: "A diagram labels the MES server 'Level 3.5 DMZ'. What is wrong?",
      options: ["The MES runs production applications, so it is Level 3, not a buffer zone", "Nothing, MES is a DMZ system", "MES belongs at Level 1", "DMZs only contain databases"],
      answer: 0,
      explain: [
        "Correct. Level 3 is site operations; 3.5 is a buffer with no operational function of its own.",
        "The DMZ hosts intermediaries, not operational applications.",
        "MES is a plant-level manufacturing operations system, not a controller.",
        "DMZs contain several kinds of intermediary services, not only databases."
      ]
    },
    {
      q: "Which pairing of level and time scale is right?",
      options: ["Level 1: months", "Level 4: milliseconds", "Level 1: milliseconds to seconds", "Level 2: years"],
      answer: 2,
      explain: [
        "Control logic runs every scan, not monthly.",
        "ERP planning works in days to months.",
        "Correct. Control logic scans in milliseconds and loops respond in seconds.",
        "Supervisory screens react in seconds to minutes."
      ]
    },
    {
      q: "How does a Unified Namespace change the Purdue picture?",
      options: ["It removes the need for security zones", "It moves PLCs to Level 4", "Systems publish and subscribe to a central broker rather than passing data level by level", "It makes OPC UA unnecessary"],
      answer: 2,
      explain: [
        "The zoning and firewall rules remain; the broker usually sits in the OT side or DMZ.",
        "PLCs stay at Level 1.",
        "Correct. Data moves by topic through the broker, which bends the strict hierarchy while keeping the level thinking for risk.",
        "OPC UA is still a common way to get data from devices into the namespace."
      ]
    },
    {
      q: "Where does an Ignition gateway running Perspective screens and a historian belong?",
      options: ["Only Level 0", "Level 5", "Level 3.5 only", "Level 2, reaching into Level 3 for historian and reporting"],
      answer: 3,
      explain: [
        "Level 0 is physical devices.",
        "Level 5 is external and enterprise.",
        "The DMZ is for buffering and intermediaries, not running the site's HMI.",
        "Correct. Ignition is a supervisory platform that extends into site operations as you add modules."
      ]
    }
  ],

  resources: [
    { title: "The Purdue Model and Ignition", url: "https://inductiveautomation.com/resources/article/the-purdue-model-and-ignition", type: "article", source: "Inductive Automation" },
    { title: "What Is the Purdue Model for ICS Security?", url: "https://www.paloaltonetworks.com.au/cyberpedia/what-is-the-purdue-model-for-ics-security", type: "article", source: "Palo Alto Networks" },
    { title: "Revisiting the relevance of the industrial DMZ", url: "https://www.tripwire.com/state-of-security/revisiting-the-relevance-of-the-industrial-dmz-idmz", type: "article", source: "Tripwire" },
    { title: "What Is the Purdue Model?", url: "https://www.sentinelone.com/tw/cybersecurity-101/cybersecurity/what-is-the-purdue-model/", type: "article", source: "SentinelOne" }
  ]
});
