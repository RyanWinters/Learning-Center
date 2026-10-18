LC.lesson({
  id: "net-ethernet",
  title: "Ethernet, MAC addresses and switches",
  track: "net",
  minutes: 20,
  level: 1,
  prereqs: ["net-models"],
  tags: ["ethernet", "mac", "switch", "stratix", "fiber", "duplex", "m12"],
  summary: "Ethernet is how every device on the plant floor actually delivers a frame to its neighbor. Understand the switch and most plant network faults make sense.",
  objectives: [
    "Describe the fields of an Ethernet frame and what a MAC address identifies",
    "Explain how a switch learns MAC addresses and what it does with unknown and broadcast frames",
    "Define a broadcast domain and say what does and does not split one",
    "Choose between unmanaged and managed, and commercial and industrial, switches",
    "Pick copper or fiber and the right connector (RJ45 or M12), and diagnose a duplex mismatch"
  ],

  body: `
## What Ethernet is

{{term:ethernet|Ethernet}} is the layer 1 and layer 2 technology almost every modern controller, drive, HMI and gateway uses to talk. It defines the cable and signalling (layer 1) and the **frame** (layer 2): a small, self-contained package of bytes addressed from one device to another on the same local network. Everything above it, IP, TCP, Modbus, EtherNet/IP, rides inside frames.

## The frame

{{diagram:frame}}

| Field | Size | Purpose |
|---|---|---|
| Destination MAC | 6 bytes | Who the frame is for |
| Source MAC | 6 bytes | Who sent it |
| EtherType | 2 bytes | What is inside: \`0x0800\` IPv4, \`0x0806\` ARP, \`0x8100\` VLAN tag, \`0x88CC\` LLDP, \`0x8892\` PROFINET |
| Payload | 46 to 1500 bytes | The IP packet or other data |
| FCS | 4 bytes | CRC checksum. A bad one means the frame is dropped |

The 1500-byte payload limit is the {{term:mtu|MTU}}. A preamble precedes the frame on the wire to sync the receiver, but you never see it in a capture.

### MAC addresses

A {{term:mac-address|MAC address}} is a 48-bit address burned into a network interface, written as six hex bytes: \`00:1D:9C:4A:7B:21\`. The first three bytes are the **OUI**, a manufacturer ID assigned by the IEEE. The last three are the device's serial-like portion. Rockwell devices commonly start with \`00:00:BC\` or \`00:1D:9C\`, and you will quickly learn to recognize Siemens, Moxa and Cisco prefixes too.

MAC addresses matter in three practical ways:

- A switch uses them to decide where to send frames.
- Many industrial devices (Logix modules, drives) show their MAC on a label, and it is the only way to identify a brand-new device with no IP address yet. Tools such as BOOTP/DHCP servers and Rockwell's RSLinx or Studio 5000 Logix Designer's Ethernet tools use it to assign an address.
- **Broadcast** is the MAC \`FF:FF:FF:FF:FF:FF\`. Every device on the local network receives it.

## What a switch does

An Ethernet {{term:switch|switch}} connects devices and forwards frames only where they need to go. It is a layer 2 device. It reads the destination MAC and uses its {{term:mac-table|MAC address table}} to pick the port.

The switch builds that table by itself:

1. A frame arrives on port 3 from source MAC \`AA\`. The switch records "AA is on port 3."
2. If the destination MAC is already in the table, the frame is sent out only that port.
3. If the destination is unknown, the switch **floods** it out every port except the one it came in on.
4. If the frame is a broadcast, the switch floods it as well.
5. Entries age out after a few minutes of silence (the aging time is configurable, so check your switch manual for its default), so the table adapts when a cable is moved.

> [!example] A frame crosses a switch
> The Ignition Gateway (MAC \`AA\`, port 1) pings a PLC (MAC \`BB\`, port 5) for the first time. The ARP request is a broadcast, so the switch floods it. The PLC replies from port 5, so the switch learns "BB is on port 5". From then on, frames between \`AA\` and \`BB\` go only between ports 1 and 5, and the other ports never see them.

This is a major reason switches replaced hubs. A hub repeated every frame to every port, so devices fought over one shared wire (a "collision domain") and half duplex was the rule. Each switch port is its own collision domain, so full duplex (send and receive at once) is the normal case and collisions are gone.

### Broadcast domains

A {{term:broadcast-domain|broadcast domain}} is the set of devices that receive each other's broadcasts. **A plain switch does not split a broadcast domain.** Ten switches daisy-chained form one big one. Only a router, or a VLAN configured on a managed switch, creates a boundary. See {{lesson:net-vlan}}.

Broadcasts are normal (ARP, DHCP, device discovery). The problem is volume. A big flat network with hundreds of devices produces constant chatter, and a misbehaving device or a loop can create a **broadcast storm** that saturates every link and takes down the plant network. That is why people segment, and why loop-prevention protocols exist (see {{lesson:net-topology}}).

## Choosing a switch

### Unmanaged versus managed

| | Unmanaged | Managed |
|---|---|---|
| Setup | Plug and play, nothing to configure | Configured by web interface, CLI or software |
| Features | Learns MACs and forwards. That is all | VLANs, port mirroring, QoS, IGMP snooping, SNMP, port security, ring protocols, NAT on some |
| Visibility | None. Link lights only | Port counters, error rates, topology, alarms |
| Good for | Small, isolated, simple machine networks | Anything shared, plant-wide, or that needs diagnosis |
| Example | Rockwell Stratix 2000 | Stratix 5200 / 5400 / 5700 |

A good rule is to use managed switches anywhere that matters, and to keep unmanaged ones to a simple cell inside a machine. When an unmanaged switch misbehaves, you have nothing to look at except lights.

### Commercial versus industrial

Switches from an office supplier are built for 0-40 C, clean air and a wall outlet. Industrial switches (Stratix, Hirschmann, Moxa, Siemens Scalance, Phoenix Contact and many more) are built for plant conditions:

- Wide temperature range (often -40 to 75 C)
- DIN-rail mounting and 24 VDC redundant power inputs
- Vibration, shock and noise immunity
- A relay output for fault alarming
- Industrial protocol support such as EtherNet/IP CIP integration, PROFINET, and ring redundancy

A $50 office switch in a panel at 55 C will work for a few months and then become the root cause of an intermittent fault nobody can reproduce.

## Copper, fiber and connectors

### Copper

Standard twisted-pair Ethernet (Cat5e or Cat6) is limited to **100 meters** per segment, including patch cords. It is cheap and easy to terminate. It carries electrical noise, so in a plant use shielded cable, keep it away from VFD output cables, and ground the shield at one end according to your standards.

### Fiber

Fiber carries light, so it is immune to electrical noise, gives complete electrical isolation between buildings (no ground loop) and goes far:

| Type | Typical reach | Use |
|---|---|---|
| Multimode (OM1-OM4) | Hundreds of meters (about 550 m at 1 Gbps on OM3 SX, and about 2 km at 100 Mbps) | Within a building or campus |
| Single-mode | 10 km and up | Between buildings, across a site |

Fiber ports on industrial switches use pluggable **SFP** modules, so one switch can mix copper and fiber and different reach options. Match the module type (multimode or single-mode) and wavelength on both ends, and clean connectors before blaming the module. A dirty fiber end is the most common cause of a flaky link.

### Connectors

- **RJ45** is the familiar plastic clip connector. It is fine inside a clean panel. In machine environments it can be shaken loose.
- **M12** is a round, screw-locked, sealed connector that survives washdown, vibration and dust. **D-coded** (4-pin) is used for 100 Mbps and **X-coded** (8-pin) for gigabit. Use patch cables built for the job, not RJ45-to-M12 adapters thrown together on site.

## Speed, duplex and auto-negotiation

Ethernet links run at 10, 100, 1000 Mbps (and up). Each end can also run **full duplex** (both directions at once) or half duplex. {{term:auto-negotiation|Auto-negotiation}} lets the two ends advertise what they can do and pick the best match. For gigabit over copper (1000BASE-T) the standard requires auto-negotiation, so you cannot hard-set it the way you can at 100 Mbps. Fiber links (SX/LX) work differently.

### The duplex mismatch story

A {{term:duplex-mismatch|duplex mismatch}} happens when one end is hard-coded to 100 full and the other is left on auto. The auto end cannot see a negotiation, assumes **half** duplex and uses CSMA/CD rules. The full duplex side transmits whenever it likes. The result is a link that comes up, passes ping, and then runs slowly with bursts of errors and dropped I/O connections under load.

> [!warning] Ping passes but I/O flaps
> A common pattern on a plant floor: a drive or camera "works" in the shop, but in production its EtherNet/IP connection times out every few minutes. The link light is on and pings succeed, because small light traffic survives a mismatch. Look at the switch port counters. A half-duplex side shows **late collisions** and the full-duplex side shows **FCS or CRC errors**. Set both ends to auto (the usual recommendation, and required at gigabit) or hard-code *both* ends to the same setting.

Rules that avoid the problem:

- Default to **auto on both ends**.
- If a device vendor mandates a fixed setting, hard-code the switch port to match, and write it in the panel documentation.
- Never hard-code one side only.
- Check the error counters on a managed switch regularly. Rising errors on a port are the early warning.

## Putting it together in Ignition-world

When an Ignition Gateway cannot reach a device, a layer 2 view helps. Can the gateway's switch port see the device's MAC in its table? Does the port show a link and the expected speed and duplex? Are error counters climbing? Those answers come before IP configuration. Many managed industrial switches also let you see port status from a web page, and some Rockwell switches integrate with Studio 5000 (check your model's manual), so you can diagnose a remote cabinet without opening it.
`,

  eli5: `
Think of a mail sorting room in an apartment building. Every apartment has a permanent name plate on its door (that is the MAC address, set at the factory). A letter is a frame, with a "to" name and a "from" name on the front.

A hub is a person who photocopies every letter and slides a copy under every door. Everyone gets everyone's mail and must sort through it. A switch is a smarter clerk. The first time he sees a letter from "Apartment 5," he writes in his notebook "5 lives on floor 3." After that, letters to 5 go only to floor 3.

If a letter is addressed "to everybody," the clerk has to deliver it to every door. That is a broadcast. A few notices are fine, but if somebody starts sending thousands, the whole building drowns in paper, which is how a broadcast storm feels.

Fiber is a cable that carries flashes of light instead of electricity, so lightning or noise cannot jump along it. And "duplex" is whether two people on a phone line can talk at the same time (full) or have to take turns (half). If one person thinks they can talk over each other and the other thinks they must wait, the conversation is a mess.
`,

  why: `
**Why do switches learn instead of being told?** Plants add and move devices constantly. A self-learning table means a technician can plug in a new drive and it works, with no central list to update. The cost is that the switch has no idea what the traffic means, which is why managed features exist for the cases where you must control it.

**Why isn't an office switch good enough?** The failure is rarely a clean break. It is heat, vibration, and power quality that cause intermittent faults that take days to isolate. Industrial switches cost several times more, and a single hour of downtime on a packaging line usually costs more than the whole panel of them. Experienced integrators treat the network as a piece of the control system and spec it for the environment.

**Why argue about auto versus fixed speed and duplex?** Older guidance said to hard-code industrial ports so the link never renegotiates. Newer practice, and gigabit itself, favors auto-negotiation everywhere because a one-sided hard-code is the main cause of mismatches. If a plant has hundreds of switches, hand-configuring each port is not realistic and invites mistakes. The compromise is a written standard: auto by default, and document any exception.

**Why does the broadcast domain size matter?** Every device processes every broadcast, and a PLC with a slow processor can lose scan time to it. Smaller broadcast domains (by VLAN and subnet) contain faults, limit the blast radius of a storm and make security rules possible. That is the bridge into {{lesson:net-ip}} and {{lesson:net-vlan}}.
`,

  history: `
Ethernet was developed at Xerox PARC in the 1970s by a team including Robert Metcalfe, and standardized by the IEEE as 802.3 in 1983. Early Ethernet shared a single coaxial cable using collision detection (CSMA/CD). Twisted-pair hubs followed, and switching in the 1990s gave every device its own full-duplex link, which made Ethernet deterministic enough for control. Industrial Ethernet protocols such as EtherNet/IP, PROFINET and Modbus TCP began to replace proprietary fieldbuses in the 2000s.
`,

  examples: [
    {
      title: "Finding a device by its MAC",
      body: `A new drive arrives with no IP address and the label \`MAC: 00:1D:9C:4A:7B:21\`. Plug it into the managed switch, open the switch's MAC table and look for that address. It shows the drive is on port Gi1/0/12. Now you know which cable it is, and a BOOTP/DHCP tool can assign it an IP using that MAC.`
    },
    {
      title: "Duplex mismatch on a vision camera",
      body: `A camera on an M12 cable keeps dropping its EtherNet/IP connection. Pings are fine. The switch port shows 100 Mbps half duplex with rising late collisions. The camera had been set to a fixed 100 full while the switch port was left on auto. Setting the camera back to auto, and the port left on auto, cleared the errors and the connection stayed up.`
    }
  ],

  diagrams: {
    frame: `<svg viewBox="0 0 640 190" role="img" aria-label="An Ethernet frame: destination MAC, source MAC, EtherType, payload, FCS">
  <text class="dg-title" x="20" y="26">Ethernet II frame</text>
  <rect class="dg-box" x="20" y="44" width="110" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="75" y="66">Dest MAC</text>
  <text class="dg-text-muted dg-mid" x="75" y="84">6 bytes</text>
  <rect class="dg-box" x="130" y="44" width="110" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="185" y="66">Source MAC</text>
  <text class="dg-text-muted dg-mid" x="185" y="84">6 bytes</text>
  <rect class="dg-box-2" x="240" y="44" width="90" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="285" y="66">EtherType</text>
  <text class="dg-text-muted dg-mid" x="285" y="84">2 bytes</text>
  <rect class="dg-box-accent" x="330" y="44" width="200" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="430" y="66">Payload</text>
  <text class="dg-text-muted dg-mid" x="430" y="84">46-1500 bytes (IP packet)</text>
  <rect class="dg-box" x="530" y="44" width="90" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="575" y="66">FCS</text>
  <text class="dg-text-muted dg-mid" x="575" y="84">4 bytes</text>
  <text class="dg-text-mono" x="20" y="130">0x0800 = IPv4   0x0806 = ARP   0x8100 = VLAN tag</text>
  <text class="dg-text-mono" x="20" y="152">0x88CC = LLDP   0x8892 = PROFINET</text>
  <text class="dg-text-muted" x="20" y="176">Bad FCS: frame dropped by the receiver and counted as a CRC error.</text>
</svg>`
  },

  pitfalls: [
    "Hard-coding speed and duplex on one end only, which causes a duplex mismatch that passes ping.",
    "Using an unmanaged switch in a place that needs diagnosis, then having no port counters when it misbehaves.",
    "Exceeding 100 m on copper including patch cords, or routing it alongside VFD output cables.",
    "Mixing multimode and single-mode fiber or SFPs, or leaving dust caps off and connectors dirty.",
    "Daisy-chaining switches in a loop without a loop-prevention protocol, which creates a broadcast storm.",
    "Assuming a switch splits the broadcast domain. Only a router or a VLAN does."
  ],

  keyTerms: ["ethernet", "mac-address", "mtu", "switch", "mac-table", "broadcast-domain", "auto-negotiation", "duplex-mismatch"],

  quiz: [
    {
      q: "A switch receives a frame whose destination MAC is not in its MAC table. What does it do?",
      options: [
        "Drops it and logs an error",
        "Sends it back to the sender",
        "Floods it out every port except the one it came in on",
        "Sends it only to the uplink port"
      ],
      answer: 2,
      explain: [
        "Unknown unicast frames are normal while the table is still learning.",
        "A switch does not return frames to the sender.",
        "Correct. Flooding finds the destination, and the reply teaches the switch where that MAC lives.",
        "Only certain configurations behave that way. The default for unknown unicast is to flood."
      ]
    },
    {
      q: "A camera pings fine but drops its EtherNet/IP connection under load. The switch port shows late collisions and the camera side shows CRC errors. Likely cause?",
      options: [
        "Wrong subnet mask",
        "Duplex mismatch",
        "A full MAC table",
        "Fiber with the wrong wavelength"
      ],
      answer: 1,
      explain: [
        "A wrong mask would break reachability, not produce late collisions.",
        "Correct. One end hard-coded and the other on auto leaves a half-duplex end colliding with a full-duplex end.",
        "A full MAC table makes the switch flood more, but it would not create late collisions on one port.",
        "The camera uses copper, and a wavelength mismatch gives no link at all."
      ]
    },
    {
      q: "You connect eight switches in a line with no routers or VLANs. How many broadcast domains do you have?",
      options: ["One", "Eight", "Four", "It depends on the number of devices"],
      answer: 0,
      explain: [
        "Correct. Plain switches forward broadcasts, so everything is a single broadcast domain.",
        "Each switch does not make a new domain.",
        "Daisy-chaining does not pair them off.",
        "The number of devices affects load, not how many domains exist."
      ]
    },
    {
      q: "Two machines sit 400 m apart in different buildings with different ground potential. Which link is best?",
      options: [
        "Cat6 copper with a shield",
        "Cat5e copper through two extra switches",
        "Wi-Fi bridge only",
        "Multimode fiber with SFPs"
      ],
      answer: 3,
      explain: [
        "Copper stops at 100 m per segment and carries ground potential differences.",
        "Switches in the middle would regenerate the signal, but the grounding problem remains and you need power and panels in between.",
        "A wireless bridge is possible but adds interference and security concerns for a fixed link.",
        "Correct. Fiber reaches 400 m and gives full electrical isolation."
      ]
    },
    {
      q: "Why is an unmanaged switch a poor choice in a plant-wide backbone?",
      options: [
        "It cannot forward frames",
        "It gives no VLANs, no port statistics and no way to diagnose or segment",
        "It uses less power",
        "It cannot use RJ45"
      ],
      answer: 1,
      explain: [
        "Unmanaged switches forward frames perfectly well.",
        "Correct. A backbone needs visibility, segmentation and redundancy features that unmanaged switches lack.",
        "Power use is not the concern.",
        "Unmanaged switches use RJ45 connectors normally."
      ]
    }
  ],

  resources: [
    { title: "Network switch", url: "https://en.wikipedia.org/wiki/Manageable_and_Unmanageable_switches", type: "article", source: "Wikipedia" },
    { title: "Autonegotiation: An EtherNet/IP Implementation Problem", url: "https://www.rtautomation.com/rtas-blog/autonegotiation", type: "article", source: "RTA" },
    { title: "Hidden EtherNet/IP Performance Problems", url: "https://www.rtautomation.com/?p=64278", type: "article", source: "RTA" },
    { title: "Stratix 5700 Industrial Managed Ethernet Switch", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pp/enet-pp005_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Stratix 5400 Industrial Ethernet Switches", url: "https://rockwellautomation.com/en-us/products/hardware/network-security-and-infrastructure/stratix-5400-industrial.html", type: "docs", source: "Rockwell Automation" },
    { title: "Duplex mismatches affecting physical link speed", url: "https://documentation.meraki.com/General_Administration/Tools_and_Troubleshooting/Duplex_mismatches_affecting_physical_link_speed", type: "docs", source: "Cisco Meraki" }
  ]
});
