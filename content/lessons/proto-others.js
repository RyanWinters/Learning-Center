LC.lesson({
  id: "proto-others",
  title: "DNP3, IEC 61850 and BACnet in brief",
  track: "proto",
  minutes: 15,
  level: 2,
  prereqs: ["proto-modbus"],
  tags: ["dnp3", "iec-61850", "bacnet", "utilities", "substation", "building-automation"],
  summary: "Three protocols you will not use daily, but will meet the day you bid water, power or building work: where each lives and what makes it different.",
  objectives: [
    "Match DNP3, IEC 61850 and BACnet to the industries where they dominate",
    "Explain DNP3 event classes, unsolicited responses and timestamps",
    "Describe what IEC 61850 adds beyond a register map, including GOOSE messages",
    "Describe BACnet objects and change-of-value subscriptions",
    "Decide when you need a gateway rather than a native driver"
  ],

  body: `
## Why these three matter

{{diagram:homes}}

You can spend years in manufacturing and see only {{lesson:proto-enip}}, {{lesson:proto-modbus}} and {{lesson:proto-opc}}. The moment you quote a water utility, a substation or a commercial building, three other names appear on the spec. Each was built for a world with different problems than a factory floor, and each solved them in a way that shows up in how you design the system.

| Protocol | Home turf | Core problem it solved |
|---|---|---|
| {{term:dnp3|DNP3}} | Electric utilities, water and wastewater, oil and gas pipelines | Reliable telemetry from many remote sites over slow, noisy links, with accurate event times |
| {{term:iec-61850|IEC 61850}} | Electrical substations | Vendor-neutral, self-describing data models and very fast protection messages between intelligent devices |
| {{term:bacnet|BACnet}} | Commercial buildings: HVAC, lighting, access | Letting boilers, chillers and controllers from different vendors share one building network |

## DNP3: telemetry for the long haul

DNP3 (Distributed Network Protocol, now IEEE 1815) was developed in the 1990s for the electric power industry, to move data between a **master** (the control center) and **outstations** (RTUs and relays at remote sites). It is common in water and wastewater SCADA in North America, and also used in oil and gas. It runs over serial, and over TCP or UDP, with port 20000 as the usual default.

Unlike {{lesson:proto-modbus}}, DNP3 knows what a data point is. Points are grouped by type (binary input, analog input, counter, binary output) and carry **quality flags** such as online, restart, communications lost and over-range. Those flags travel with each value.

### Event classes and report by exception

The key idea is that an outstation keeps an **event buffer**. Each point can be assigned to a class:

- **Class 0**: the static value, "what is it right now." A master reads this occasionally as an **integrity poll**.
- **Class 1, 2 and 3**: change events, with priority chosen by you. A tripped breaker might be Class 1, a slow-moving tank level Class 3.

A normal poll cycle is a frequent, small **event poll** (classes 1 to 3) plus an occasional integrity poll (class 0). The master only receives what changed. That is the polling variant of {{lesson:proto-polling-rbe}}.

### Unsolicited responses

With **unsolicited responses**, the outstation does not wait to be polled. When an event of an enabled class occurs, it sends the data on its own initiative. The master turns this on with the "enable unsolicited" function code and must acknowledge each message. This matters for links where polling dozens of sites costs time or money, because the master hears about a pump failure immediately instead of at the next scan. Not every outstation supports it, and masters usually still run a slow integrity poll as a safety net in case an unsolicited message is lost.

### Timestamps and the sequence of events

DNP3 events can be **time-stamped at the source**, with millisecond resolution, instead of when the master receives them. That makes it possible to reconstruct the order of events after a disturbance, even if the link was down for an hour and the events arrived together. It also means outstation clocks need time sync. The master can send a time-sync command, and the outstation sets an "needs time" flag when it wants one.

> [!example] Event poll vs integrity poll
> A water utility has 40 lift stations over licensed radio. The master runs an event poll of each station every 10 seconds, which returns just the few changes. Every 30 minutes it runs a class 0 integrity poll to refresh everything. A wet-well high level is configured as Class 1 with unsolicited reporting, so the alarm arrives within a second, with the actual time it happened stamped by the RTU.

### DNP3 in Ignition

Ignition has a DNP3 driver in the OPC UA module, acting as a master that can connect to a DNP3 outstation over TCP. Documentation describes a newer driver and a legacy one, and notes the newer one supports event-based polling and unsolicited messaging. Check the current docs for your Ignition version and for what the driver supports, since this has changed across 8.1 releases.

## IEC 61850: the substation language

IEC 61850 is a standard for communication inside **substations** and between them. Its important idea is not the wire format but the **data model**. A protection relay is described as logical devices holding logical nodes (for example, XCBR for a circuit breaker, MMXU for measurements), each with named data objects and attributes. A relay's capabilities are published in a configuration file (SCL, in XML) that tools read. Where Modbus gives you "register 40021," IEC 61850 gives you a name like \`Bay1/XCBR1.Pos.stVal\`, with a defined meaning.

Several message services are mapped to different needs:

| Service | Used for | Speed |
|---|---|---|
| **MMS** (client/server) | Reading values, controls, reports to SCADA | Normal SCADA timescales |
| **Reporting** | Buffered and unbuffered event reports | Report by exception |
| **GOOSE** | Peer-to-peer messages between relays, such as a trip or interlock signal | A few milliseconds, sent as Ethernet multicast rather than over IP |
| **Sampled Values** | Streams of raw current and voltage samples | Continuous, very high rate |

GOOSE (Generic Object Oriented Substation Event) is what lets one relay tell another to block or trip without routing through SCADA. This is protection-grade traffic and sits behind the substation firewall, not in your Ignition project. What reaches SCADA is generally through an MMS client or, more commonly, through a gateway that presents IEC 61850 as DNP3 or OPC UA. Skim this one: you will likely read configuration files rather than write them.

## BACnet: the building network

BACnet (Building Automation and Control Networks, ASHRAE standard 135, also ISO 16484-5) is the open protocol of building automation. Variable air volume boxes, chillers, lighting panels and fire interfaces from many vendors can share a network and be seen by one front end.

BACnet organizes everything as **objects** with **properties**. A temperature sensor is an Analog Input object with properties such as Present_Value, Units, Out_Of_Service and Status_Flags. Other common objects are Binary Input/Output, Analog Output, Schedule, Trend Log and Device. Services let a client read and write properties, discover devices (Who-Is/I-Am) and subscribe to changes.

For efficiency, BACnet supports **Change of Value (COV)**. A client subscribes to an object, and the device sends a notification when the value moves by more than a configured increment. A subscription has a lifetime and must be renewed. This is the same report-by-exception idea you will see everywhere. It runs over several data links; **BACnet/IP** (default UDP port 47808, shown as 0xBAC0) is the one you meet most, with MS/TP, a token-passing RS-485 serial network, used on the field-level controllers.

> [!note] Broadcast and subnets
> BACnet/IP device discovery uses broadcasts, which routers do not forward. Crossing subnets needs a BBMD (BACnet Broadcast Management Device) or a foreign-device registration. If a front end sees no devices, this is why.

## What to do when you meet one

| Situation | Practical answer |
|---|---|
| Utility RTUs speak DNP3 | Use a DNP3 master driver, or a protocol gateway to OPC UA or Modbus. Get the point list and class assignments from the RTU owner |
| Substation relays speak IEC 61850 | Ask for the SCL file. Almost always integrate through a gateway or an existing substation HMI |
| Building controllers speak BACnet | Use a BACnet driver or gateway, and get the network layout and device instance numbers |
| Unknown protocol on a datasheet | Look for an OPC UA server or a Modbus map first. Those are the common denominators |

Always check that the Ignition driver or third-party module you plan on exists, supports your device profile and fits your security requirements before you promise it in a proposal.
`,

  eli5: `
Think of three different kinds of neighborhoods, each with its own way of passing messages.

DNP3 is a small town with a lot of far-away farms. Each farm keeps a notebook of things that changed, and the town office calls on a schedule to hear only the changes. For emergencies, a farm can phone the town office on its own, and every note carries the exact time it was written.

IEC 61850 is the control room of a power plant, where every gauge has a proper name and a description, and the safety switches yell directly to each other across the room without asking the boss first.

BACnet is a big office building where the air conditioning, lighting and elevators all come from different companies. They agreed to describe everything as little labeled cards, and you can say "tell me if this one changes by more than a degree."

Different towns, different habits, same basic idea: tell me what matters, when it matters.
`,

  why: `
**Why do these exist when Modbus and OPC UA do?** Each came from an industry with a constraint Modbus did not handle. Utilities needed event timestamps and efficient use of slow links. Substations needed millisecond protection signaling and self-describing devices. Buildings needed multi-vendor discovery and a common object model. They became entrenched because the equipment lasts 20 to 40 years, and regulators and consulting engineers write them into specifications.

**Why not replace them all with OPC UA or MQTT?** The installed base is enormous and works. In practice the integrator's job is rarely to swap the protocol. It is to bring the data into the plant-to-enterprise architecture through a gateway, and to keep the original protocol local to the segment where it is fast and trusted. This pattern appears again in {{lesson:net-security}}, where legacy protocols with weak security get isolated behind a boundary.

**Why know the report-by-exception behavior?** DNP3 event classes, IEC 61850 reports and BACnet COV all do what MQTT and Sparkplug do: send only what changed. The failure modes are similar too: a lost event leaves the master wrong until the next integrity poll. Learn to ask, for every protocol, "how do I resynchronize after a gap?"

**What experienced integrators argue about.** Whether to use unsolicited reporting at all. It reduces latency and traffic, but a misconfigured outstation can flood a master, and some links drop unsolicited messages silently. Many designs use unsolicited for critical alarms only and rely on polling for the rest.
`,

  history: `
DNP3 was developed in the 1990s for electric utility SCADA, and the DNP Users Group maintains it, with the standard published as IEEE 1815. IEC 61850 was developed from the late 1990s through the 2000s by IEC Technical Committee 57 as a replacement for the many proprietary substation protocols. BACnet was developed by an ASHRAE committee through the early 1990s, with the first standard published in 1995 as ANSI/ASHRAE 135-1995.
`,

  examples: [
    {
      title: "Choosing a DNP3 poll plan",
      body: `Twelve remote pump stations on a shared radio channel, each with 80 points. Assign alarms (high wet well, power fail) to Class 1 and enable unsolicited. Assign flows and levels to Class 2 with deadbands. Poll Class 1 to 3 every 15 seconds and Class 0 every 20 minutes. Total traffic stays low, and alarms still arrive with RTU timestamps.`
    },
    {
      title: "BACnet discovery fails across a router",
      body: `The front end is on 10.1.1.0/24 and the controllers are on 10.1.2.0/24. Who-Is broadcasts from the front end never reach the controllers. The fix is a BBMD on the controller subnet, or registering the front end as a foreign device with it.`
    }
  ],

  diagrams: {
    homes: `<svg viewBox="0 0 640 170" role="img" aria-label="Three protocols and where they live: DNP3 in utilities and water, IEC 61850 in substations, BACnet in buildings">
  <rect class="dg-box-accent" x="20" y="20" width="190" height="120" rx="8"/>
  <text class="dg-title dg-mid" x="115" y="48">DNP3</text>
  <text class="dg-text-sm dg-mid" x="115" y="76">Utilities, water, pipelines</text>
  <text class="dg-text-sm dg-mid" x="115" y="98">Event classes</text>
  <text class="dg-text-sm dg-mid" x="115" y="120">Unsolicited + timestamps</text>
  <rect class="dg-box" x="225" y="20" width="190" height="120" rx="8"/>
  <text class="dg-title dg-mid" x="320" y="48">IEC 61850</text>
  <text class="dg-text-sm dg-mid" x="320" y="76">Substations</text>
  <text class="dg-text-sm dg-mid" x="320" y="98">Named data model</text>
  <text class="dg-text-sm dg-mid" x="320" y="120">MMS, GOOSE</text>
  <rect class="dg-box" x="430" y="20" width="190" height="120" rx="8"/>
  <text class="dg-title dg-mid" x="525" y="48">BACnet</text>
  <text class="dg-text-sm dg-mid" x="525" y="76">Commercial buildings</text>
  <text class="dg-text-sm dg-mid" x="525" y="98">Objects + properties</text>
  <text class="dg-text-sm dg-mid" x="525" y="120">COV subscriptions</text>
</svg>`
  },

  pitfalls: [
    "Treating IEC 61850 as just another register map. The names and data model are the point.",
    "Running only unsolicited reporting with no periodic integrity poll, so a lost event goes uncorrected.",
    "Ignoring outstation clock sync, then getting event times that are hours off.",
    "Forgetting that BACnet/IP discovery uses broadcasts that routers do not forward.",
    "Promising a native Ignition driver in a proposal without checking it exists for the device and version."
  ],

  keyTerms: ["dnp3", "iec-61850", "bacnet", "unsolicited-response", "goose", "bacnet-cov", "report-by-exception"],

  quiz: [
    {
      q: "A water utility's RTUs send changed values and timestamps over a slow radio link. Which protocol is most likely?",
      options: ["BACnet", "DNP3", "Modbus RTU only", "IEC 61850 GOOSE"],
      answer: 1,
      explain: [
        "BACnet is for building automation.",
        "Correct. DNP3 was built for telemetry over slow links with event buffering and source timestamps.",
        "Modbus has no event buffer or timestamps, so it cannot report changes by itself.",
        "GOOSE is a fast Ethernet multicast inside substations, not a wide-area radio protocol."
      ]
    },
    {
      q: "What does DNP3's class 0 poll return?",
      options: ["Only events since the last poll", "The current static values of all points", "Only alarms", "The outstation's clock"],
      answer: 1,
      explain: [
        "Events are in classes 1, 2 and 3.",
        "Correct. Class 0 is the integrity poll: the current state of every point.",
        "Alarms are whatever you assign to event classes, not class 0.",
        "Time sync is a separate function."
      ]
    },
    {
      q: "Why do masters often keep a slow integrity poll even with unsolicited responses enabled?",
      options: [
        "Unsolicited responses are not allowed alone",
        "To catch events that were lost, so the master's picture is corrected",
        "To keep the outstation's clock running",
        "Because unsolicited messages are unencrypted"
      ],
      answer: 1,
      explain: [
        "They are allowed. It's a design choice, not a rule.",
        "Correct. A dropped unsolicited message would otherwise leave the master wrong indefinitely.",
        "Clock sync is done with a separate command.",
        "Security isn't the reason for the integrity poll."
      ]
    },
    {
      q: "What does IEC 61850 provide that a Modbus register map does not?",
      options: [
        "Faster serial baud rates",
        "Named, self-describing data models and fast peer-to-peer messages such as GOOSE",
        "Built-in cloud connectivity",
        "A free license for all vendors"
      ],
      answer: 1,
      explain: [
        "Speed on the wire isn't its defining feature.",
        "Correct. Devices expose standard logical nodes and described data, and GOOSE gives millisecond signaling between relays.",
        "It was designed for substations, not cloud links.",
        "Licensing isn't what separates the standards."
      ]
    },
    {
      q: "A BACnet front end on one subnet sees no controllers on another. What is the likely cause?",
      options: [
        "Who-Is broadcasts are not forwarded by routers, and a BBMD is missing",
        "BACnet only works on RS-485",
        "COV subscriptions expired",
        "The controllers use function code 03"
      ],
      answer: 0,
      explain: [
        "Correct. A BBMD or foreign-device registration carries broadcasts across subnets.",
        "BACnet/IP runs over Ethernet and UDP.",
        "Expired subscriptions affect notifications, not discovery.",
        "Function codes are a Modbus concept."
      ]
    }
  ],

  resources: [
    { title: "DNP3 Primer (DNP Users Group)", url: "https://www.dnp.org/Portals/0/AboutUs/DNP3%20Primer%20Rev%20A.pdf", type: "standard", source: "DNP Users Group" },
    { title: "Benefits of DNP3", url: "https://www.dnp.org/About/Benefits-of-DNP3", type: "article", source: "DNP Users Group" },
    { title: "DNP3 driver (Ignition 8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/opc-ua/opc-ua-drivers/dnp3", type: "docs", source: "Inductive Automation" },
    { title: "Legacy DNP3 driver (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/dnp3/legacy-dnp3-driver", type: "docs", source: "Inductive Automation" },
    { title: "The Language of BACnet: objects, properties and services", url: "https://bacnet.org/wp-content/uploads/sites/4/2022/06/The-Language-of-BACnet-1.pdf", type: "standard", source: "BACnet International" }
  ]
});
