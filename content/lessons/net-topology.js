LC.lesson({
  id: "net-topology",
  title: "Industrial topologies, rings and DLR",
  track: "net",
  minutes: 20,
  level: 2,
  prereqs: ["net-vlan"],
  tags: ["topology", "ring", "dlr", "rstp", "redundancy", "cpwe", "switching"],
  summary: "Star, line and ring layouts, why rings need special protocols, and how fast each protocol recovers when a cable gets cut.",
  objectives: [
    "Compare star, line and ring topologies on cost, cabling and fault tolerance",
    "Explain why a physical ring needs a loop-prevention or ring protocol",
    "Give rough recovery times for STP, RSTP and Device Level Ring",
    "Describe the ring supervisor role in DLR and what happens on a break",
    "Place switches in the layers of the Cisco/Rockwell CPwE reference architecture"
  ],

  body: `
## Three shapes, one question

Every plant network is built from three shapes, and the real question is always the same: what happens to the machines when one cable or switch dies?

| Topology | How it's wired | Cost | If one cable breaks |
|---|---|---|---|
| **Star** | Every device to a central switch | Most cable | Only that one device is lost |
| **Line (daisy chain)** | Device to device, each with two ports | Least cable | Everything past the break is lost |
| **Ring** | A line whose ends connect back together | Little cable | Nothing is lost, traffic reroutes the other way |

A star is the easiest to understand and troubleshoot. It costs the most copper and the switch is a single point of failure. A line is how many machine builders wire I/O: a drive, a block and a valve manifold, each with a built-in two-port switch. It saves money until someone unplugs the third device for maintenance and the next five go offline. A ring gives you the line's cabling economy plus a second path.

{{diagram:ring}}

## Why a ring cannot simply be plugged in

Ethernet switches forward broadcasts out every port. If you connect switches in a loop, a single broadcast circles forever and each pass makes more copies. Within seconds the network is saturated, which is called a **broadcast storm**. So a ring needs software that keeps one link logically blocked while the ring is whole, and opens it when a link fails.

The recovery time, called convergence, is what separates the protocols.

| Protocol | Standard | Typical recovery | Notes |
|---|---|---|---|
| {{term:spanning-tree|STP}} (Spanning Tree) | IEEE 802.1D | 30 to 50 seconds | Too slow for control. Often enabled by default |
| {{term:spanning-tree|RSTP}} (Rapid Spanning Tree) | IEEE 802.1w | Under 1 to a few seconds | Common in plants, scales to mesh |
| {{term:dlr|DLR}} (Device Level Ring) | ODVA, EtherNet/IP | Typically 3 ms to under 100 ms | Needs DLR-capable devices |
| {{term:rep-mrp|REP}} (Resilient Ethernet Protocol) | Cisco proprietary | Typically under 50 ms | Cisco and Stratix switches only |
| {{term:rep-mrp|MRP}} (Media Redundancy Protocol) | IEC 62439-2 | Around 200 ms (a faster profile exists) | Common with PROFINET |

Treat the numbers as ranges. They depend on ring size, switch models and configuration, and vendor test figures are best cases.

## Why convergence time matters

A controller talks to its I/O at a requested packet interval, say 20 ms, and drops the connection after missing a number of packets. The default timeout multiplier is typically 4 packets. At a 20 ms interval, the connection dies after about 80 ms of silence, and the module faults.

- A DLR recovery of tens of milliseconds fits inside that window. The machine never notices.
- An RSTP recovery of one second does not. The I/O connections time out, outputs go to their fault state, and the line stops, though the network heals by itself.
- STP at 30 seconds is useless for anything with real-time I/O.

So the choice depends on what rides on the ring. Between HMI and SCADA traffic, a one-second RSTP outage is a blip. For motion or safety I/O, it is a stoppage.

## Device Level Ring

{{term:dlr|DLR}} is part of the EtherNet/IP specification, so DLR-capable products from different vendors can share a ring. It is built for the "line of devices" case: each device has two Ethernet ports and an embedded switch, and the last device connects back to the first, closing the ring with no extra switch.

Two roles exist:

- **Ring supervisor**: at least one node must be configured as the {{term:ring-supervisor|ring supervisor}}. In normal operation it blocks one of its two ports for normal traffic (while still sending its own beacon frames) so there is no loop. It sends beacon frames around the ring in both directions to check that the ring is intact.
- **Ring nodes**: everything else forwards frames and watches its two links. If a node sees a link fail, it tells the supervisor.

When a cable breaks, the supervisor sees its beacons stop, unblocks the blocked port, and the ring becomes a line fed from both ends. Every device is still reachable, only the path changed. When you replace the cable, the supervisor re-blocks a port.

In practice, you configure the supervisor in the controller or in a switch such as a Stratix. It is common to enable a backup supervisor with a lower precedence, so the ring survives the supervisor itself dying. Enable the ring's fault location diagnostics, because a ring hides faults: the machine runs fine on a single break, and nobody notices until the second break takes it down.

> [!warning] A ring that has already broken is a line
> A ring tolerates one fault. After that, you have a line with no redundancy and nobody knows. Monitor the ring status tag (the supervisor reports "ring fault" and the break location) and alarm on it in Ignition.

### Limits of DLR

- It only protects a single ring. Rings connect to the wider network through switches, and that connection point is its own single point of failure unless you attach the ring to two switches (redundant gateways).
- It needs every node to be DLR-capable. A non-DLR device must connect through a switch or a DLR-aware media converter.
- Ring size is limited, commonly around 50 nodes in vendor guidance.

## REP and MRP in brief

Switch vendors have their own ring protocols. Cisco's **REP** runs on Cisco and Rockwell Stratix switches and is designed for rings of switches rather than devices, with recovery typically under 50 ms. **MRP** is the open standard favored in the PROFINET world. On a mixed plant you may see DLR at the machine level, REP or RSTP in the distribution layer and MRP on a Siemens skid, and each is its own island.

## The CPwE reference architecture

Cisco and Rockwell publish a set of validated designs called Converged Plantwide Ethernet, or {{term:cpwe|CPwE}}. It organizes the plant network into layers:

| Layer | Role | Typical gear |
|---|---|---|
| Cell/Area zone | Machines and lines: devices, drives, I/O | Industrial Ethernet access switches, DLR rings |
| Distribution | Aggregates several cells at plant level | Layer 3 switches, often in redundant pairs |
| Core | Site backbone, routes between plant and IT | Redundant layer 3 switches |
| Industrial DMZ | Controlled boundary to enterprise IT | Firewalls, jump hosts, historian mirrors |

Cell zones typically attach to the distribution layer by two uplinks, one to each of a redundant switch pair. This gives you a ring or a redundant star at the bottom and a routed, redundant design above. The DMZ at the top is the subject of {{lesson:net-security}}.

> [!example] Sizing a cell
> A packaging line has 18 devices: 12 drives, 4 I/O blocks and 2 HMIs. Drives and blocks with two ports go in a single DLR with a ControlLogix 5580 as supervisor, for 16 nodes. Both HMIs plug into a Stratix access switch that also connects the ring (the switch is a ring node itself) and has two uplinks to the plant distribution pair. A cable cut inside the ring recovers in tens of milliseconds. The loss of one uplink is handled by the distribution layer's own redundancy.

## Choosing

1. Is the traffic real-time I/O? Use DLR or a fast switch ring (REP, MRP), not STP.
2. Is the cabling a daisy chain of two-port devices? DLR matches the physical layout.
3. Is it a switch-to-switch backbone? RSTP is fine for supervisory traffic, and a vendor ring protocol is better for speed.
4. Keep the number of protocols small. Each one is another thing your maintenance team must learn.
`,

  eli5: `
Imagine houses along a single road, with one road in and out of the neighborhood. If a tree falls on the road, everyone beyond it is stuck. That's a line.

Now connect the far end of the road back around to the entrance, so it forms a loop. If a tree falls at one spot, drivers just go the other way around. That's a ring, and it's far more robust for the cost of one extra stretch of road.

There's a catch with loops. If a message gets onto a loop with no one in charge, it can chase itself around forever and jam everything. So one person, the supervisor, puts a cone across the road at one spot while everything is fine. When a tree falls somewhere, the supervisor notices the traffic from one side has stopped arriving, and pulls the cone away so the road is open in both directions again.

Different ring systems differ mostly in how fast the supervisor notices and moves the cone.
`,

  why: `
**Why the ring at all?** Cabling is a big part of the cost of a machine. A star requires a home run to a switch for every device. A ring uses short hops between neighbors and still survives a cut. For line-style machines, that is a large saving, which is why machine builders like DLR.

**Why not use plain STP everywhere?** Because the default timers, which were designed for office networks, take tens of seconds to converge. Many plants discover this the hard way: someone plugs in a patch cable, STP recalculates, and the whole line faults for 30 seconds. RSTP and the ring protocols exist because control traffic cannot wait.

**What integrators argue about.** One camp says use the same protocol everywhere (RSTP for all) because it is simple and standard. The other says match the protocol to the traffic: DLR for devices, a fast switch ring for the backbone. The second approach gives better recovery, but it multiplies things to maintain and gives you boundaries where two protocols meet, which are the places most often misconfigured.

**The hidden failure.** Redundancy makes failures invisible. A ring can run for months with a broken cable, and the next fault takes the line down. The practice that matters most is not the topology but the monitoring: bring ring status into SCADA and alarm on it.

**Redundancy is not free.** A redundant design is only as good as its weakest shared element. A ring that runs from a single switch to a single uplink has a single point of failure at that uplink. Draw the whole path, not just the ring.
`,

  history: `
Spanning tree was invented by Radia Perlman at DEC in the 1980s and standardized as IEEE 802.1D. Rapid Spanning Tree (802.1w) followed in 2001 to fix its slow convergence. The ODVA added Device Level Ring to the EtherNet/IP specification around 2009 so that devices with embedded two-port switches could form rings without separate infrastructure switches. Cisco and Rockwell's CPwE guides grew out of their alliance on validated designs for plant networks.
`,

  examples: [
    {
      title: "Reading the timeouts",
      body: `A drive's connection is set to a 10 ms packet interval with a timeout multiplier of 4, so it faults after about 40 ms of silence. DLR recovering in under 40 ms keeps it alive. RSTP recovering in 800 ms does not, so the drive faults on every cable pull. Either slow the interval and raise the multiplier (for example 50 ms by 8 gives 400 ms, still short of 800), or move that device to a ring protocol that converges faster.`
    },
    {
      title: "Spotting a hidden break",
      body: `The ring supervisor on a bottling line exposes a ring status and a fault location as tags. In Ignition, an alarm on \`[PLC1]Line3_DLR.RingFault\` shows "Ring fault between Drive 7 and Block 3". Maintenance finds a crushed cable behind a conveyor, replaced during the next break, before a second fault stops the line.`
    }
  ],

  diagrams: {
    ring: `<svg viewBox="0 0 640 250" role="img" aria-label="A ring of five devices with a supervisor blocking one port, and the same ring after a cable break where the supervisor unblocks and traffic flows both ways">
  <text class="dg-title" x="20" y="24">Healthy ring</text>
  <rect class="dg-box-accent" x="110" y="40" width="100" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="160" y="62">Supervisor</text>
  <rect class="dg-box" x="30" y="110" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="70" y="132">Node A</text>
  <rect class="dg-box" x="40" y="180" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="80" y="202">Node B</text>
  <rect class="dg-box" x="200" y="180" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="240" y="202">Node C</text>
  <rect class="dg-box" x="210" y="110" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="250" y="132">Node D</text>
  <line class="dg-line" x1="130" y1="74" x2="80" y2="110"/>
  <line class="dg-line" x1="70" y1="144" x2="80" y2="180"/>
  <line class="dg-line" x1="120" y1="197" x2="200" y2="197"/>
  <line class="dg-line" x1="240" y1="180" x2="250" y2="144"/>
  <line class="dg-line" x1="190" y1="74" x2="230" y2="110" stroke-dasharray="4 4"/>
  <text class="dg-text-muted" x="205" y="84">blocked</text>
  <text class="dg-title" x="360" y="24">After a cable break</text>
  <rect class="dg-box-accent" x="440" y="40" width="100" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="490" y="62">Supervisor</text>
  <rect class="dg-box" x="360" y="110" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="400" y="132">Node A</text>
  <rect class="dg-box" x="370" y="180" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="410" y="202">Node B</text>
  <rect class="dg-box" x="530" y="180" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="570" y="202">Node C</text>
  <rect class="dg-box" x="540" y="110" width="80" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="580" y="132">Node D</text>
  <line class="dg-line" x1="460" y1="74" x2="410" y2="110"/>
  <line class="dg-line" x1="400" y1="144" x2="410" y2="180"/>
  <line class="dg-line" x1="450" y1="197" x2="465" y2="197"/>
  <line class="dg-line" x1="520" y1="197" x2="530" y2="197"/>
  <line class="dg-line" x1="570" y1="180" x2="580" y2="144"/>
  <line class="dg-line" x1="520" y1="74" x2="560" y2="110"/>
  <text class="dg-text-muted" x="380" y="236">break: supervisor opens both ways</text>
</svg>`
  },

  pitfalls: [
    "Leaving STP at its defaults on a network that carries real-time I/O.",
    "Building a physical loop with no ring protocol enabled, which causes a broadcast storm.",
    "Not alarming on ring faults. The ring hides the first break until the second one stops the line.",
    "Mixing non-DLR devices into a DLR ring without a switch or media converter.",
    "Running two ring protocols on the same links, or two supervisors with no priority set.",
    "Forgetting that the ring's single uplink is a single point of failure."
  ],

  keyTerms: ["spanning-tree", "dlr", "ring-supervisor", "rep-mrp", "cpwe", "broadcast-storm"],

  quiz: [
    {
      q: "A drive's I/O connection has a 20 ms packet interval and a timeout multiplier of 4. A cable break occurs in an RSTP ring that recovers in 1 second. What happens?",
      options: ["Nothing, RSTP is fast enough", "The connection times out and the drive faults", "RSTP waits for the drive to reconnect", "The controller buffers the missed packets"],
      answer: 1,
      explain: [
        "The connection dies after about 80 ms of silence. One second is far longer.",
        "Correct. The network heals after about a second, but the I/O connection has already timed out.",
        "RSTP has no awareness of application connections.",
        "Missed implicit I/O packets are lost, not buffered."
      ]
    },
    {
      q: "What is the job of the DLR ring supervisor?",
      options: ["Assign IP addresses to ring nodes", "Block one port in normal operation, send beacons, and open the path when a fault occurs", "Route traffic to the enterprise network", "Encrypt ring traffic"],
      answer: 1,
      explain: [
        "IP assignment is done by BOOTP/DHCP, not the ring protocol.",
        "Correct. Blocking prevents the loop, and beacons detect breaks.",
        "Routing is a layer 3 function outside DLR.",
        "DLR provides redundancy, not encryption."
      ]
    },
    {
      q: "Why is a physical loop of switches with no ring protocol dangerous?",
      options: ["It halves the bandwidth", "Broadcasts circulate forever and multiply, saturating the network", "Switches refuse to power on", "It only works with fiber"],
      answer: 1,
      explain: [
        "The problem is not capacity but runaway copies.",
        "Correct. Each pass copies the frame out of every port, so a broadcast storm builds in seconds.",
        "Switches work fine, which is why the mistake is so easy to make.",
        "The medium makes no difference."
      ]
    },
    {
      q: "A ring has run for six months with one broken cable and nobody noticed. What does this show?",
      options: ["The ring is oversized", "Redundancy hides faults, so ring status must be monitored and alarmed", "The cable was not needed", "DLR is unreliable"],
      answer: 1,
      explain: [
        "Size is unrelated.",
        "Correct. The ring is now a line, and the next fault will stop the line unless the first was alarmed.",
        "The ring used the other path, but the redundancy was gone.",
        "DLR did exactly what it should. The monitoring was missing."
      ]
    },
    {
      q: "Which protocol suits a daisy chain of EtherNet/IP drives, each with two ports, with no extra switches?",
      options: ["STP", "DLR", "Spanning tree with BPDU guard", "VLAN trunking"],
      answer: 1,
      explain: [
        "STP is too slow for real-time I/O, and it needs switch logic the devices lack.",
        "Correct. DLR was designed for devices with embedded two-port switches.",
        "This is a protection feature, not a ring protocol.",
        "Trunking is about VLAN tagging and has nothing to do with redundancy."
      ]
    }
  ],

  resources: [
    { title: "Device Level Ring (DLR), ControlLogix documentation", url: "https://www.rockwellautomation.com/en-dk/docs/technical/logix5000/_online/1756-um901/controllogix-5590-high-availability-ditamap/configure-enet-network/device-level-ring--dlr-.html", type: "docs", source: "Rockwell Automation" },
    { title: "Industrial networking: Build Ethernet networks using device level ring technology", url: "https://www.controleng.com/industrial-networking-build-ethernet-networks-using-device-level-ring-technology/", type: "article", source: "Control Engineering" },
    { title: "Ethernet-to-the-Factory 1.2 Design and Implementation Guide", url: "https://www3-realm.cisco.com/en/US/docs/solutions/Verticals/EttF/ch4_EttF.html", type: "docs", source: "Cisco" }
  ]
});
