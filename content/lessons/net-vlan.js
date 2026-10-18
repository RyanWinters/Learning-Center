LC.lesson({
  id: "net-vlan",
  title: "VLANs, QoS and IGMP snooping",
  track: "net",
  minutes: 25,
  level: 2,
  prereqs: ["net-routing"],
  tags: ["vlan", "802.1Q", "igmp", "multicast", "qos", "dscp", "switching"],
  summary: "How one physical switch becomes several isolated networks, and the two settings (IGMP snooping and a querier) that keep EtherNet/IP I/O from flooding every port.",
  objectives: [
    "Explain what a VLAN is and what an 802.1Q tag adds to an Ethernet frame",
    "Choose between an access port and a trunk port for a given device",
    "Describe how traffic gets from one VLAN to another and what that costs you",
    "Explain why EtherNet/IP multicast I/O floods an unmanaged switch and how IGMP snooping with a querier fixes it",
    "Say what DSCP marking does for CIP traffic and where it must be trusted"
  ],

  body: `
## What a VLAN is

A {{term:vlan|VLAN}} (virtual LAN) splits one physical switch into several logical switches. Ports in VLAN 10 can talk to each other at layer 2 and cannot talk to ports in VLAN 20, even though they are plugged into the same box. Each VLAN is its own broadcast domain and, by convention, its own IP subnet.

Plants use VLANs for three reasons. They shrink broadcast domains, so a chatty device cannot disturb everything. They separate trust levels, so a vendor laptop on the line cannot see the PLCs. And they let you reuse one switch stack for cell traffic, cameras and office uplinks without running separate cabling.

The Meridian Foods Plant 1 plan (site supernet \`10.20.0.0/16\`, gateway \`.1\` on each subnet) is the one used across this course:

| VLAN | Purpose | Subnet | Notable hosts |
|---|---|---|---|
| 10 | Control: PLCs, I/O adapters, drives | 10.20.10.0/24 | PLC1 \`10.20.10.10\`, PLC2 \`.11\` |
| 20 | HMI clients and panels | 10.20.20.0/24 | |
| 30 | Level 3 servers | 10.20.30.0/24 | Ignition master \`10.20.30.10\`, backup \`.11\`, SQL \`.20\` |
| 40 | OEM skid uplinks (1:1 NAT) | 10.20.40.0/24 | |
| 50 | Engineering workstations | 10.20.50.0/24 | |
| 99 | Network management | 10.20.99.0/24 | |
| 250 | DMZ (Level 3.5) | 10.20.250.0/24 | Reverse proxy \`10.20.250.10\`, historian replica \`.20\`, jump host \`.30\` |

Larger plants often add a VLAN per line or cell (for example a second control VLAN). That is a design choice. This plan keeps one control VLAN for PLC1 and PLC2.

## The 802.1Q tag

When a frame must carry its VLAN membership across a link, the switch inserts a 4-byte {{term:dot1q|802.1Q}} tag after the source MAC address. The tag holds a 12-bit VLAN ID (1 to 4094 usable), a 3-bit priority field (PCP, used for layer 2 QoS) and a type marker.

{{diagram:tag}}

The frame grows from 1518 to 1522 bytes, which is why very old switches that choke on tagged frames are a thing of the past.

## Access ports and trunk ports

An {{term:access-port|access port}} belongs to one VLAN. The device plugged into it sends and receives ordinary untagged frames. The switch adds the tag internally and strips it on the way out. Every PLC, drive and HMI goes on an access port.

A {{term:trunk-port|trunk port}} carries many VLANs on one link, with tags on every frame. You use trunks between switches, and to routers, firewalls and virtualization hosts. One trunk can be the single cable between a cabinet switch and the core.

| | Access port | Trunk port |
|---|---|---|
| VLANs carried | One | Many (allowed list) |
| Frames on wire | Untagged | Tagged (except the native VLAN) |
| Plugs into | End devices | Switches, routers, servers with VLAN-aware NICs |

The **native VLAN** is the one VLAN on a trunk that travels untagged. If the two ends disagree about which VLAN is native, frames leak between VLANs. Set it explicitly on both ends and prefer an unused VLAN. Also prune the allowed list so a trunk carries only the VLANs that should cross it.

> [!warning] Don't leave devices in VLAN 1
> Default switch ports sit in VLAN 1, and management traffic often lives there too. Move control devices to named VLANs and put management on its own VLAN.

## Getting between VLANs

VLANs cannot talk to each other at layer 2 by design. To cross, traffic goes through a router, either a layer 3 switch (a switch with routing built in, using a **switched virtual interface**, SVI, per VLAN) or a router/firewall on a trunk (the classic "router on a stick"). This is {{term:inter-vlan-routing|inter-VLAN routing}}.

The router is also your choke point. Access control lists or firewall rules there decide who may reach what, for example "the Ignition master at 10.20.30.10 (VLAN 30) may reach TCP 44818 on PLC1 at 10.20.10.10 (VLAN 10), and nothing else may."

Two things to remember about routing between VLANs:

- **Multicast and broadcast do not cross unless the router is told to.** A PLC multicasting I/O to a drive in another VLAN needs multicast routing, which most plants avoid. Keep producer and consumer of I/O in the same VLAN.
- **Discovery tools stop at the router.** RSLinx browsing and BOOTP/DHCP tools use broadcast. Plan for that when you commission across VLANs.

## Why multicast I/O floods a switch

EtherNet/IP implicit (I/O) messaging, the cyclic data between a controller and its I/O, can run as UDP **multicast** on port 2222. A drive produces its status once and any number of consumers can listen. Multicast addresses for CIP sit in the 239.192.x.x range and are derived from the device's IP address.

A switch learns where unicast addresses live by watching source MACs. Nobody ever sends *from* a multicast address, so the switch never learns where listeners are. By default it treats multicast like broadcast and sends it out every port in the VLAN.

> [!example] A real flood
> A line has 40 I/O blocks each producing 20 packets per second at about 100 bytes. That is small. But the packets reach every port, including the HMI, the camera, the laptop of a contractor, and an old PLC with a slow Ethernet processor. The slow device spends its CPU on packets it does not want, its own connections time out, and the symptom is "random" connection faults on the one device nobody thought was involved.

{{diagram:flood}}

Unmanaged switches cannot help. This is the main reason an industrial network with multicast I/O needs managed switches.

## IGMP snooping and the querier

{{term:igmp-snooping|IGMP snooping}} lets the switch listen to the IGMP join messages that consumers send ("I want group 239.192.1.17"). It builds a table of which ports want which groups and forwards each multicast only to those ports, plus the port toward the router.

IGMP snooping alone is not enough. Consumers do not keep announcing themselves. An **{{term:igmp-querier|IGMP querier}}** sends a general query every 60 to 125 seconds, and members reply to refresh their entries. Without a querier, snooping entries age out after a few minutes and the switch either drops the stream or falls back to flooding.

Rules for a working design:

1. Turn snooping on in every VLAN that carries multicast I/O.
2. Make exactly one device the querier per VLAN. If a layer 3 switch or router has an interface in the VLAN, it is usually the querier. In an isolated cell with no router, configure one managed switch as querier.
3. If several devices are queriers, the one with the lowest IP wins the election. Check that the winner is the one you intended.
4. Leave Rockwell's multicast setting alone unless you have a reason: a connection can often be set to unicast if the I/O adapter supports it, which sidesteps the issue for small cells.

Do not assume your switch has snooping or a querier enabled out of the box. Defaults differ by vendor, model and firmware version, so check the manual for your switch and write the querier down as an explicit design decision.

## QoS and DSCP for CIP

When a link is congested, the switch must pick what to drop. {{term:network-qos|Quality of Service}} lets you tell it. Packets carry a priority marking, and the switch maps that marking to a queue. At layer 3 the marking is the 6-bit {{term:dscp|DSCP}} field in the IP header.

CIP defines default DSCP values per traffic class: urgent 55, scheduled 47, high 43, low 31 and explicit messaging 27. Devices mark their own packets, and the network must be told to **trust** the markings on ports facing industrial devices. On ports facing the office, reset (re-mark) them so no one can claim top priority.

QoS only matters under congestion. A 100 Mbps device-level link at 3 percent load never queues, so no QoS setting helps it. It matters on uplinks shared with video, file transfers or backups, and on the segment where a firmware download can saturate a ring.

> [!tip] Check the basics first
> Before tuning QoS, confirm the cause is actually congestion. Look at switch port counters for output drops. Zero drops means QoS is not your problem.

## Putting it together

For a new cell: one VLAN for control, access ports for every device, a trunk to the distribution switch with only the needed VLANs, IGMP snooping on with one querier, DSCP trusted on device ports, and a router or firewall with explicit rules at the boundary. That layout will carry {{lesson:proto-enip}} traffic cleanly and gives {{lesson:net-security}} something to enforce.
`,

  eli5: `
Think of an office building with one big open floor. Everyone hears everyone. Now put up temporary walls so Accounting, Shipping and Maintenance each get their own room. People can still work in the same building and share the same plumbing, but conversations stay inside each room. That's a VLAN.

The hallway between the rooms has a door guard, who is the router. If Shipping wants to ask Accounting something, the guard checks the request.

Now picture the loudspeaker. Some messages are meant for only a few people, like "drivers, your trucks are ready." A dumb building plays every announcement in every room, and everyone's work gets interrupted. A smart building keeps a list of who asked to hear what and only plays the announcement in those rooms. That list-keeping is IGMP snooping. Someone has to walk the halls every minute asking "who still wants to hear this?", or the list goes stale. That person is the querier.
`,

  why: `
**Why not just one flat network?** It works until it doesn't. Broadcast storms, a misconfigured laptop with a duplicate IP, or a vendor tool scanning the subnet can take down every device. Flat networks fail all at once and are hard to diagnose. VLANs limit the blast radius and give you a place to enforce rules.

**Why keep I/O producers and consumers in one VLAN?** Routing multicast between VLANs needs PIM or static multicast routes, adds latency and jitter, and creates a failure mode that few people on the plant floor can debug. Integrators argue about whether to give each machine its own VLAN or each line its own. A common compromise is one VLAN per machine or cell, with the router only carrying unicast traffic to SCADA.

**Why the querier trips people up.** Snooping appears to work during commissioning because the entries are fresh. Then, a few minutes after a power cycle or a topology change, the I/O connections start timing out. The cause is a missing or misplaced querier. Experienced integrators make "who is the querier" a line in the network drawing.

**Why trust DSCP selectively?** If every port trusts markings, any device can mark its traffic highest and starve control traffic. If no port trusts them, your DSCP values are ignored. The practice is to trust at the edge ports facing known industrial devices and re-mark everything coming from IT or guest links.

**The tradeoff.** More VLANs mean more routing rules, more documentation and more places for a typo to isolate a device. Segment to the level your team can maintain.
`,

  history: `
IEEE 802.1Q, published in 1998, standardized VLAN tagging and replaced vendor-specific schemes such as Cisco's ISL. Industrial Ethernet adopted it as managed switches got cheap in the 2000s. EtherNet/IP's use of multicast for I/O dates from its introduction, and early deployments on cheap unmanaged switches are the origin of much of the guidance to use IGMP snooping.
`,

  examples: [
    {
      title: "Adding a drive in another cabinet",
      body: `The control network is VLAN 10 (10.20.10.0/24). A new drive goes in a remote panel with an unmanaged-looking 5-port switch. Replace it with a managed switch, set the drive's port as an access port in VLAN 10, and make the uplink a trunk allowing only VLAN 10 (and 99 for management). Enable IGMP snooping for VLAN 10 and leave the querier on the core layer 3 switch. Check with \`show ip igmp snooping groups\` (Cisco syntax) that the drive's multicast group lists only its own port and the controller port.`
    },
    {
      title: "Symptom: HMI loses connection every few minutes",
      body: `An HMI on the same switch as 30 I/O blocks drops its CIP connection at irregular times. Port counters show 100 percent of the HMI's receive bandwidth is multicast. Snooping was enabled but no querier exists in the VLAN. Configuring a querier on the cabinet's managed switch fixes it, because entries no longer age out and the HMI's port is no longer in the flood list.`
    }
  ],

  diagrams: {
    tag: `<svg viewBox="0 0 640 190" role="img" aria-label="An Ethernet frame with a 4-byte 802.1Q tag inserted after the source MAC address, containing a type marker, priority and VLAN ID">
  <text class="dg-title" x="20" y="26">Untagged frame</text>
  <rect class="dg-box" x="20" y="36" width="100" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="70" y="59">Dest MAC</text>
  <rect class="dg-box" x="120" y="36" width="100" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="170" y="59">Src MAC</text>
  <rect class="dg-box" x="220" y="36" width="80" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="260" y="59">Type</text>
  <rect class="dg-box" x="300" y="36" width="200" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="400" y="59">Payload + FCS</text>
  <text class="dg-title" x="20" y="110">802.1Q tagged frame</text>
  <rect class="dg-box" x="20" y="120" width="100" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="70" y="143">Dest MAC</text>
  <rect class="dg-box" x="120" y="120" width="100" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="170" y="143">Src MAC</text>
  <rect class="dg-box-accent" x="220" y="120" width="130" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="285" y="143">Tag 4 bytes</text>
  <rect class="dg-box" x="350" y="120" width="70" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="385" y="143">Type</text>
  <rect class="dg-box" x="420" y="120" width="200" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="520" y="143">Payload + FCS</text>
  <text class="dg-text-muted" x="220" y="178">PCP 3 bits (priority) · VLAN ID 12 bits (1-4094)</text>
</svg>`,
    flood: `<svg viewBox="0 0 640 250" role="img" aria-label="Without IGMP snooping a multicast from a drive reaches every switch port; with snooping it reaches only the controller">
  <text class="dg-title" x="20" y="24">No snooping: flood</text>
  <rect class="dg-box-accent" x="20" y="40" width="90" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="65" y="63">Drive</text>
  <rect class="dg-box" x="150" y="36" width="90" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="195" y="63">Switch</text>
  <line class="dg-line" x1="110" y1="58" x2="150" y2="58"/>
  <rect class="dg-box" x="300" y="30" width="110" height="26" rx="4"/>
  <text class="dg-text-sm dg-mid" x="355" y="48">PLC (wants it)</text>
  <rect class="dg-box" x="300" y="62" width="110" height="26" rx="4"/>
  <text class="dg-text-sm dg-mid" x="355" y="80">HMI</text>
  <rect class="dg-box" x="300" y="94" width="110" height="26" rx="4"/>
  <text class="dg-text-sm dg-mid" x="355" y="112">Laptop</text>
  <line class="dg-line" x1="240" y1="50" x2="300" y2="43"/>
  <line class="dg-line" x1="240" y1="58" x2="300" y2="75"/>
  <line class="dg-line" x1="240" y1="66" x2="300" y2="107"/>
  <text class="dg-text-muted" x="430" y="75">every port gets it</text>
  <text class="dg-title" x="20" y="154">Snooping + querier: filtered</text>
  <rect class="dg-box-accent" x="20" y="170" width="90" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="65" y="193">Drive</text>
  <rect class="dg-box" x="150" y="166" width="90" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="195" y="193">Switch</text>
  <line class="dg-line" x1="110" y1="188" x2="150" y2="188"/>
  <rect class="dg-box-accent" x="300" y="160" width="110" height="26" rx="4"/>
  <text class="dg-text-sm dg-mid" x="355" y="178">PLC (joined)</text>
  <rect class="dg-box" x="300" y="192" width="110" height="26" rx="4"/>
  <text class="dg-text-muted dg-mid" x="355" y="210">HMI: nothing</text>
  <rect class="dg-box" x="300" y="222" width="110" height="22" rx="4"/>
  <text class="dg-text-muted dg-mid" x="355" y="238">Laptop: nothing</text>
  <line class="dg-line" x1="240" y1="180" x2="300" y2="173"/>
  <text class="dg-text-muted" x="430" y="180">only the joined port</text>
</svg>`
  },

  pitfalls: [
    "Enabling IGMP snooping without a querier. It works at commissioning and fails minutes after a power cycle.",
    "Two different native VLANs on the two ends of a trunk, which leaks traffic between VLANs.",
    "Leaving control devices and management in VLAN 1.",
    "Putting an I/O producer and its consumer in different VLANs and then wondering why multicast I/O never arrives.",
    "Trusting DSCP on every port, including office and guest links.",
    "Using an unmanaged switch in a cell that carries multicast I/O."
  ],

  keyTerms: ["vlan", "dot1q", "access-port", "trunk-port", "inter-vlan-routing", "multicast", "igmp-snooping", "igmp-querier", "network-qos", "dscp"],

  quiz: [
    {
      q: "A PLC and a VFD must exchange EtherNet/IP I/O. Where should they live?",
      options: ["In different VLANs, with multicast routing on the core", "In the same VLAN on access ports", "On a trunk port each", "In VLAN 1 so they can see everything"],
      answer: 1,
      explain: [
        "That works only with multicast routing, which adds complexity and failure modes for no gain.",
        "Correct. Same VLAN keeps multicast and discovery at layer 2 where it works without extra configuration.",
        "End devices belong on access ports. Trunks are for switches, routers and VLAN-aware hosts.",
        "VLAN 1 is the default and is a poor place for anything you want to control."
      ]
    },
    {
      q: "IGMP snooping is on and I/O works after commissioning. Ten minutes after a power cycle, connections time out. What is the most likely cause?",
      options: ["The DSCP values were reset", "The trunk native VLAN changed", "No IGMP querier in the VLAN, so group entries aged out", "The switch ran out of MAC table space"],
      answer: 2,
      explain: [
        "DSCP mismatches affect priority under congestion, not whether connections time out on a quiet network.",
        "A native VLAN mismatch causes leaks or no connectivity from the start, not delayed failure.",
        "Correct. Snooping depends on periodic queries to refresh membership. Without a querier, entries expire.",
        "MAC table exhaustion needs thousands of devices and shows as flooding of unicast, not group timeouts."
      ]
    },
    {
      q: "What does a trunk port do that an access port does not?",
      options: ["Routes between VLANs", "Encrypts traffic", "Blocks multicast", "Carries frames for several VLANs with 802.1Q tags"],
      answer: 3,
      explain: [
        "Routing needs a layer 3 device. A trunk is only a tagged link.",
        "VLAN tags give no encryption and no confidentiality.",
        "Trunks forward multicast like any other port, subject to snooping.",
        "Correct. The tag tells the far end which VLAN each frame belongs to."
      ]
    },
    {
      q: "Why does a multicast stream reach every port of an unmanaged switch?",
      options: ["It never sees a multicast address as a source, so it never learns where listeners are", "The switch broadcasts all frames by design", "Multicast uses a different Ethernet standard", "Unmanaged switches have no MAC table"],
      answer: 0,
      explain: [
        "Correct. Learning is based on source MACs, and a multicast address is never a source, so it is flooded.",
        "Unicast is filtered after learning. Only unknown destinations flood.",
        "Multicast is ordinary Ethernet with a special destination address.",
        "Unmanaged switches do learn unicast MAC addresses."
      ]
    },
    {
      q: "When does DSCP marking actually change how CIP traffic is treated?",
      options: ["Always, on every link", "Only when a link is congested and the switch has to choose what to drop or delay", "Only on trunk ports", "Only for explicit messaging"],
      answer: 1,
      explain: [
        "On an idle link every packet is forwarded at once, so priority makes no difference.",
        "Correct. Queues only form under congestion, and that is where marking decides the order.",
        "Marking applies to any port with QoS enabled, trunk or access.",
        "Both implicit and explicit messaging carry DSCP, with different default values."
      ]
    },
    {
      q: "Two switches both act as IGMP querier in one VLAN. What happens?",
      options: ["An election runs and the lowest IP address becomes the querier", "Both send queries forever", "Multicast stops entirely", "The higher IP wins automatically"],
      answer: 0,
      explain: [
        "Correct. The device with the lowest IP address wins, so check that it is the one you intended.",
        "The standard has them elect one so the other goes quiet.",
        "Streams keep flowing. The risk is the wrong switch winning, not an outage.",
        "It is the lowest address, not the highest, that wins."
      ]
    }
  ],

  resources: [
    { title: "Ethernet-to-the-Factory 1.2 Design and Implementation Guide (multicast, IGMP snooping)", url: "https://www3-realm.cisco.com/en/US/docs/solutions/Verticals/EttF/ch4_EttF.html", type: "docs", source: "Cisco" },
    { title: "Scaling EtherNet/IP I/O Traffic: RPI, Multicast and Switch", url: "https://industrialmonitordirect.com/blogs/knowledgebase/scaling-ethernetip-io-traffic-rpi-multicast-and-switch", type: "article", source: "Industrial Monitor Direct" },
    { title: "EtherNet/IP VLAN Segmentation for Industrial Networks", url: "https://industrialmonitordirect.com/blogs/knowledgebase/ethernetip-vlan-segmentation-for-industrial-networks", type: "article", source: "Industrial Monitor Direct" },
    { title: "Layer 3 Switch for EtherNet/IP Network Segmentation Guide", url: "https://industrialmonitordirect.com/blogs/knowledgebase/layer-3-switch-for-ethernetip-network-segmentation-guide", type: "article", source: "Industrial Monitor Direct" }
  ]
});
