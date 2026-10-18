LC.lesson({
  id: "proto-fieldbus",
  title: "PROFIBUS, PROFINET, DeviceNet and ControlNet",
  track: "proto",
  minutes: 15,
  level: 2,
  prereqs: ["proto-serial", "net-ethernet"],
  tags: ["profibus", "profinet", "devicenet", "controlnet", "fieldbus", "legacy"],
  summary: "The networks that sit between a PLC and its devices. You will rarely build new ones, but you will inherit plenty.",
  objectives: [
    "Place PROFIBUS, PROFINET, DeviceNet and ControlNet on a map of who uses them and why",
    "Recognize each by its physical layer and typical symptoms",
    "Explain PROFINET RT vs IRT in plain terms",
    "Say what a GSD or GSDML file is and why you need it",
    "Choose a way to get data from these networks into Ignition"
  ],

  body: `
## What a fieldbus is

A **fieldbus** connects a controller to field devices such as I/O blocks, drives, valves and sensors, replacing a separate home-run wire for every signal. The controller is the master (or scanner), and devices exchange a fixed block of input and output data every cycle. The four networks here are the ones you will meet when you inherit a plant. All of them are *cyclic I/O networks*: they move process data on a schedule between a controller and devices, not between SCADA and the world. Your SCADA usually reaches them through the PLC, not directly.

| Network | Backed by | Physical layer | Common in |
|---|---|---|---|
| **PROFIBUS DP / PA** | PI (PROFIBUS & PROFINET International) | RS-485 (DP), 2-wire intrinsically safe MBP (PA) | Siemens plants, process industry, Europe |
| **PROFINET** | PI | Standard Ethernet | Siemens and many others; new builds |
| **DeviceNet** | ODVA | CAN bus, 4-wire cable with 24 V power | Allen-Bradley, North American discrete and packaging |
| **ControlNet** | ODVA | Coax cable (RG-6), 5 Mbps | Older Allen-Bradley process and plant-wide I/O |

## PROFIBUS

{{term:profibus|PROFIBUS}} has two main flavors. **PROFIBUS DP** (Decentralized Periphery) is the factory-automation version. It runs on RS-485 twisted pair, with speeds from 9.6 kbit/s to 12 Mbit/s depending on cable length, up to 32 stations per segment and addresses 0 to 125. A DP master polls its slaves in a fixed cycle, and every slave has a numeric address set by DIP switches or software. **PROFIBUS PA** (Process Automation) carries both power and data over a two-wire intrinsically safe cable at 31.25 kbit/s, which is why you find it on instruments in hazardous areas. The figures in this section (stations per segment, speeds, node counts, terminator values) are typical published values. Check the manual or specification for your version and devices.

The physical layer is plain {{term:rs485|RS-485}}, so everything in {{lesson:proto-serial}} applies: terminate both ends, keep a daisy chain, and watch your shield grounding. PROFIBUS connectors have a small switch to turn termination on at the end nodes. A bus with a missing terminator or a loose connector shows intermittent device dropouts, and a PROFIBUS-specific tester or a PLC with diagnostics can show you which station lost the message.

## PROFINET

{{term:profinet|PROFINET}} is PROFIBUS's Ethernet successor. It shares the same basic architecture as PROFIBUS DP: a controller, devices and a device description file. The big difference is that it runs over standard Ethernet cabling and switches, so it can share infrastructure with IT.

PROFINET devices are called **IO-Devices**, the PLC is an **IO-Controller**, and an engineering station or HMI is an **IO-Supervisor**. Devices are found by *name*, not by a switch setting. You assign each device a station name in the engineering tool, and the controller resolves it to an IP address on startup. This surprises people used to PROFIBUS: swap a device and it needs the same **name** (a Siemens tool can sometimes assign it automatically by neighbor port).

PROFINET has several performance levels:

| Level | What it is | Typical use |
|---|---|---|
| **RT** (Real-Time) | Process data sent directly on Ethernet at layer 2, using priority tagging (VLAN priority), not TCP/IP. Runs on standard switches that handle priority. | General I/O: most plant networks |
| **IRT** (Isochronous Real-Time) | Time-slotted communication synchronized by the network clock (IEEE 1588 PTP). Cycle times down to 31.25 microseconds with very low jitter, and it needs hardware support in devices and switches. | Motion control, high-speed packaging |
| **TSN** | Newer Time-Sensitive Networking options in the standard | Newer designs |

Non-real-time traffic such as configuration, web servers and SNMP uses ordinary TCP/IP on the same wire. PROFINET is one of the few industrial protocols where the real-time part does not use IP at all, so it cannot be routed between subnets.

## DeviceNet

{{term:devicenet|DeviceNet}} is a CIP network over a CAN (Controller Area Network) bus, designed to replace the point-to-point wiring of sensors, push buttons and small drives. One 4-wire cable carries two data conductors and two power conductors (24 V DC) to the devices, which makes wiring cheap. A trunk-and-drop topology supports up to 64 nodes, and data rates are 125, 250 and 500 kbit/s, with maximum trunk length falling as speed rises. Because it speaks CIP, it shares the object model in {{lesson:proto-enip}} and uses EDS files. Typical faults are a missing 24 V supply, a missing terminator (121 ohm at each end) and duplicate node addresses.

Safety I/O on these networks (PROFIsafe on PROFIBUS and PROFINET, CIP Safety on DeviceNet and EtherNet/IP) is outside the SCADA integration scope and stays in the safety PLC.

## ControlNet

{{term:controlnet|ControlNet}} is also CIP, over coaxial cable at 5 Mbit/s. It uses a **scheduled** time-slot method (CTDMA, concurrent time domain multiple access). Every node gets a guaranteed slot in each cycle for I/O, and a slice is left for unscheduled traffic such as messages. This gave it determinism, and the ability to span a plant with redundant cable runs. Ethernet gradually replaced it, but you will see ControlNet in older ControlLogix systems and will still find scanner cards for it. You configure it with a schedule, using RSNetWorx for ControlNet in older environments or the equivalent tool for your software generation.

## Description files: GSD and GSDML

Every one of these networks needs the controller to know what a device offers. The description file is how.

- **GSD** (General Station Description): a keyword-based text file for **PROFIBUS** devices.
- **GSDML**: an XML version used by **PROFINET**.
- **EDS**: the equivalent for **DeviceNet** and ControlNet (and EtherNet/IP).

You import the file into the engineering tool (TIA Portal, Studio 5000, a third-party master configurator). The tool then offers the device in its catalog and knows its module slots, input/output sizes and parameters. The #1 mistake is using the generic profile because the file is missing, and then guessing byte counts. The #2 mistake is using a file that does not match the device's firmware.

{{diagram:stack}}

## Getting this data into Ignition

Ignition has no native PROFIBUS, DeviceNet or ControlNet drivers. The practical options, in order of how often they are used:

1. **Read the PLC, which already has the data.** The controller is the master. The device data is copied into its tags, and Ignition reads the controller with its native driver (Logix, S7 or Modbus). This is the right answer almost every time.
2. **Add a protocol gateway** that sits on the fieldbus as a device or master and exposes the data as Modbus TCP, EtherNet/IP or OPC UA. These are common for adding a PROFIBUS instrument cluster to a system that has no PROFIBUS master.
3. **Use a third-party OPC server** with the fieldbus driver, connected to Ignition as an OPC UA client. Check which cards and drivers the vendor supports.

For PROFINET, there is one nuance. PROFINET devices are controlled by one IO-Controller. Ignition cannot become a second one on the same device. Reading data goes through the controller, a gateway or a device's own Modbus/OPC UA interface.

> [!example] A PROFIBUS flow meter on a Siemens plant
> A flow meter sits on a PROFIBUS DP segment with station address 12. The S7 PLC is the master and has the GSD imported. The input bytes land in a data block, \`DB10.DBD0\` for example. Ignition's Siemens driver reads \`DB10.DBD0\` as a REAL. Ignition never touches the PROFIBUS cable.
`,

  eli5: `
Picture a bus driver collecting kids at stops along a route. The driver (the PLC) goes round in a fixed order and asks each kid, "Anything to report? Anything for you?" Every kid answers in the same short way, every trip.

PROFIBUS is a bus driver using a long phone line. DeviceNet is a bus driver with a simple cable that also carries electricity to power the kids' flashlights. ControlNet gives every kid a guaranteed time slot, like a school timetable. PROFINET does the same trip but over the school's normal computer network, with a fast lane for the driver's messages.

Each kid also carries a small information card (a GSD or EDS file) that says, "I have 4 pockets and these are the pocket sizes." Without the card, the driver doesn't know how to read the answers.

The SCADA computer is the school principal. The principal doesn't ride the bus. They ask the driver for the day's report.
`,

  why: `
**Why do these still exist?** Because they work, and rip-and-replace costs more than the benefit. A PROFIBUS network that has run since 2005 with no faults is a cheap asset. Migration usually comes from end of life of a scanner card, a vendor dropping support, or a plant moving to one Ethernet standard. Each is a good reason to document the old network carefully before touching it.

**Why does PROFINET dominate new Siemens work and EtherNet/IP dominate new Allen-Bradley work?** Both are open standards on standard Ethernet, but each ecosystem's tools, profiles and support favor its own vendor. Mixed plants are common, and a gateway or a PLC-to-PLC link is how you bridge them. Integrators argue about whether a plant should standardize on one. The pragmatic answer is "standardize per area, and bridge at the controller level, not the device level."

**Why does the SCADA integrator care?** Because outages on these networks often show up in Ignition as bad-quality tags or frozen values, and the cause is on a cable the Gateway never sees. Knowing the physical layer gives you the right first question. A device that goes bad quality at random on a DeviceNet line is probably power or termination. A PROFIBUS station dropping out might be a connector. A PROFINET device that vanishes after replacement is often a missing station name.

**Why keep the description files?** The file matched to the firmware is part of your as-built documentation. When a module is replaced in five years, the matching file is how the engineer reproduces the configuration. Store it with the project backup.
`,

  history: `
PROFIBUS was developed in a German public research project and standardized in the late 1980s, becoming the dominant fieldbus in Europe and a staple of Siemens systems. DeviceNet was introduced by Allen-Bradley in the mid-1990s and passed to ODVA, which also took on ControlNet and later EtherNet/IP. PROFINET arrived in the early 2000s as PROFIBUS's Ethernet-era successor. The earlier fieldbus wars led to the IEC 61158 family, which lists many incompatible bus types side by side.
`,

  examples: [
    {
      title: "Replacing a PROFINET drive",
      body: `A drive fails and its replacement powers up but the PLC reports the device as missing. The new drive has no station name, so the IO-Controller cannot find it. Using the engineering tool's "assign device name" function over the network (or the port-based neighbor detection if enabled), give it the same name as the old one, say \`drive-pump3\`. The controller finds it and sends the configuration.`
    },
    {
      title: "Bringing PROFIBUS data into a Modbus-only SCADA",
      body: `A packaging line has a PROFIBUS master on a PLC that Ignition cannot reach, but a spare gateway can act as a PROFIBUS slave and a Modbus TCP server. The PLC (the PROFIBUS master) writes the 20 values to the gateway's output area, meaning the data the master sends to this slave, and the gateway's Modbus server exposes them as holding registers. (In the other direction, a slave's input area is what it sends to the master. Check the gateway vendor's manual for its exact terms.) Ignition reads the gateway as a Modbus device, as in {{lesson:proto-modbus}}.`
    }
  ],

  diagrams: {
    stack: `<svg viewBox="0 0 640 220" role="img" aria-label="A SCADA server reads a PLC over Ethernet, and the PLC acts as master on a PROFIBUS segment, a PROFINET network and a DeviceNet trunk">
  <text class="dg-title" x="20" y="24">SCADA reaches the fieldbus through the controller</text>
  <rect class="dg-box-accent" x="20" y="44" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="74">Ignition Gateway</text>
  <line class="dg-line" x1="150" y1="69" x2="250" y2="69"/>
  <text class="dg-text-muted" x="158" y="60">Ethernet</text>
  <rect class="dg-box" x="250" y="44" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="315" y="74">PLC (master)</text>
  <line class="dg-line" x1="380" y1="69" x2="440" y2="69"/>
  <rect class="dg-box" x="440" y="44" width="180" height="30" rx="6"/>
  <text class="dg-text-sm dg-mid" x="530" y="64">PROFIBUS DP, RS-485</text>
  <line class="dg-line" x1="315" y1="94" x2="315" y2="140"/>
  <rect class="dg-box" x="440" y="84" width="180" height="30" rx="6"/>
  <text class="dg-text-sm dg-mid" x="530" y="104">PROFINET, Ethernet</text>
  <line class="dg-line" x1="380" y1="80" x2="440" y2="99"/>
  <rect class="dg-box" x="440" y="124" width="180" height="30" rx="6"/>
  <text class="dg-text-sm dg-mid" x="530" y="144">DeviceNet, CAN + 24 V</text>
  <line class="dg-line" x1="380" y1="86" x2="440" y2="139"/>
  <rect class="dg-box" x="250" y="140" width="130" height="30" rx="6"/>
  <text class="dg-text-sm dg-mid" x="315" y="160">GSD / GSDML / EDS</text>
  <text class="dg-text-muted" x="20" y="200">Device data lands in PLC tags. Ignition reads the tags.</text>
</svg>`
  },

  pitfalls: [
    "Trying to reach a fieldbus device from SCADA directly when the PLC already holds its data.",
    "Replacing a PROFINET device without assigning its station name.",
    "Importing the wrong GSD/GSDML/EDS revision, or skipping the file and guessing byte counts.",
    "Forgetting termination and bus power on DeviceNet, or termination switches on PROFIBUS.",
    "Mixing up PROFIBUS (RS-485) with PROFINET (Ethernet) because the names are similar.",
    "Assuming PROFINET RT traffic can be routed across subnets. It cannot."
  ],

  keyTerms: ["profibus", "profinet", "devicenet", "controlnet", "gsd-gsdml", "profinet-rt-irt", "eds-file", "fieldbus"],

  quiz: [
    {
      q: "Which network uses RS-485 as its physical layer?",
      options: ["PROFINET", "DeviceNet", "PROFIBUS DP", "ControlNet"],
      answer: 2,
      explain: [
        "PROFINET runs on standard Ethernet.",
        "DeviceNet uses a CAN bus.",
        "Correct. PROFIBUS DP uses RS-485, so termination and daisy-chain wiring rules apply.",
        "ControlNet uses coaxial cable."
      ]
    },
    {
      q: "A replacement PROFINET drive powers up and its link light is on, but the PLC reports it missing. What is the most likely cause?",
      options: ["The drive needs an RS-485 terminator", "The drive has no station name matching the configuration", "DeviceNet power is off", "The GSD file is for PROFIBUS"],
      answer: 1,
      explain: [
        "PROFINET runs on Ethernet and has no RS-485 terminators.",
        "Correct. PROFINET devices are found by name, so a replacement must be given the old device's name.",
        "DeviceNet is a different network.",
        "A PROFIBUS GSD would not have been used for the PLC configuration. The imported file for PROFINET is a GSDML."
      ]
    },
    {
      q: "What is the difference between PROFINET RT and IRT?",
      options: ["RT is for wireless and IRT for wired", "RT is prioritized real-time on standard Ethernet, and IRT adds time-slotted synchronized communication for motion", "RT uses TCP and IRT uses UDP", "IRT is the older version of RT"],
      answer: 1,
      explain: [
        "Both are wired Ethernet technologies.",
        "Correct. IRT needs hardware support and clock synchronization and reaches much shorter, steadier cycles.",
        "RT bypasses the IP stack. It does not use TCP or UDP for process data.",
        "IRT is an additional, more demanding mode, not an older one."
      ]
    },
    {
      q: "Ignition needs a value from a flow meter on a PROFIBUS DP segment mastered by an S7 PLC. What is the simplest approach?",
      options: ["Install a PROFIBUS driver in the Gateway", "Read the value from the PLC tag that holds the meter's input data", "Connect Ignition to the PROFIBUS cable as a second master", "Convert the PROFIBUS cable to Ethernet with a hub"],
      answer: 1,
      explain: [
        "Ignition does not provide a native PROFIBUS driver.",
        "Correct. The PLC already has the data, so use a PLC driver.",
        "A second master on a DP bus is not the normal way to read process data and needs special hardware.",
        "PROFIBUS and Ethernet are different networks. A hub does not convert."
      ]
    },
    {
      q: "What does a GSDML file do?",
      options: ["It configures the switch VLANs", "It describes a PROFINET device so the engineering tool knows its modules, data sizes and parameters", "It stores the PLC program", "It encrypts PROFINET traffic"],
      answer: 1,
      explain: [
        "Switches are configured separately.",
        "Correct. It is the PROFINET counterpart of the PROFIBUS GSD and the CIP EDS file.",
        "The program lives in the controller project.",
        "GSDML has no security function."
      ]
    },
    {
      q: "Random devices on a DeviceNet trunk drop out under load. Which check is the most relevant?",
      options: ["Bus power voltage and terminators at both ends", "IGMP snooping settings", "The station name of each device", "The RPI of the Ethernet module"],
      answer: 0,
      explain: [
        "Correct. DeviceNet carries 24 V on the cable and needs termination, and either problem causes intermittent faults.",
        "DeviceNet is not an Ethernet network and does not use IGMP.",
        "Station names belong to PROFINET.",
        "The RPI is a CIP-over-Ethernet parameter and unrelated to the CAN trunk's physical faults."
      ]
    }
  ],

  resources: [
    { title: "PROFINET - Industrial Ethernet Protocol", url: "https://www.profibus.com/technologies/profinet", type: "docs", source: "PROFIBUS & PROFINET International" },
    { title: "RT (Real-Time) technology", url: "https://www.profibus.com/technologies/rt", type: "docs", source: "PROFIBUS & PROFINET International" },
    { title: "GSDML Specification for PROFINET", url: "https://www.profibus.com/download/gsdml-gsdx-specification-for-profinet", type: "standard", source: "PROFIBUS & PROFINET International" },
    { title: "PROFINET Design Guideline", url: "https://www.profibus.com/fileadmin/media/downloadsection/installation_guide/PROFINET_Design_Guideline_8062_V159_Jan25.pdf", type: "standard", source: "PROFIBUS & PROFINET International" },
    { title: "Profinet", url: "https://en.wikipedia.org/wiki/Profinet", type: "article", source: "Wikipedia" },
    { title: "Common Industrial Protocol and the Family of CIP Networks", url: "https://www.odva.org/wp-content/uploads/2020/06/PUB00123R1_Common-Industrial_Protocol_and_Family_of_CIP_Networks.pdf", type: "standard", source: "ODVA" },
    { title: "CIP on CTDMA Technology (ControlNet)", url: "https://www.odva.org/wp-content/uploads/2020/05/PUB00200R1-Tech-Series-ControlNet.pdf", type: "standard", source: "ODVA" }
  ]
});
