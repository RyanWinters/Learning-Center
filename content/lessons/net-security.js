LC.lesson({
  id: "net-security",
  title: "Firewalls, DMZs and ISA/IEC 62443",
  track: "net",
  minutes: 30,
  level: 3,
  prereqs: ["net-vlan", "found-purdue"],
  tags: ["security", "firewall", "dmz", "62443", "zones", "conduits", "remote-access", "purdue"],
  summary: "How to divide a plant network into zones, control every path between them, and place Ignition so that no one in IT has a direct line to a PLC.",
  objectives: [
    "Define zone, conduit and security level in the ISA/IEC 62443 sense",
    "Describe what lives in the Level 3.5 industrial DMZ and why",
    "Explain why a direct IT-to-PLC path is a design failure and show the alternative",
    "Lay out a safe remote access pattern for vendors and engineers",
    "Place Ignition Gateways in a zone model and name the ports that cross each conduit"
  ],

  body: `
## Why OT security is different

An office network protects data. A plant network protects physical process: pressure, temperature, motors, people. A ransomware infection on a laptop costs money. The same infection on an HMI that is the only way to stop a pump can cost a shift, a batch or an injury. Controllers also run for decades, cannot be patched on Tuesday, and speak protocols such as Modbus with no login at all.

So OT security leans on **architecture** rather than on patching and antivirus. You decide which devices may talk to which, build the rules once, and enforce them with firewalls.

## Real incidents, briefly

- **Stuxnet (discovered 2010)** was malware aimed at specific Siemens controllers at an Iranian enrichment plant. It crossed an air gap on USB drives, then modified controller logic while showing operators normal values. Lesson: an air gap is not a control, and removable media is a path.
- **Ukrainian grid attacks (2015, 2016)** used stolen credentials and remote access tools on the operations network to open breakers. Lesson: remote access with weak authentication and a flat network.
- **Triton/Trisis (2017)** targeted a safety instrumented system at a petrochemical plant and tripped the plant when the attackers made a mistake. Lesson: safety controllers must be on their own protected zone, and keys should not be left in program mode.
- **Colonial Pipeline (2021)** was an IT ransomware attack. Operators shut down the pipeline as a precaution because they could not be sure IT and OT were separate. Lesson: if you cannot prove separation, you shut down.

You do not need the technical details. You need the pattern: the attacker gets in through IT or remote access, and a flat network lets them travel.

## The standard: ISA/IEC 62443

The ISA/IEC 62443 series is the main standard for industrial control system security. It is written by the ISA99 committee and adopted by IEC. It covers policy, system design, component requirements and the product lifecycle. For a network designer, the key ideas are:

### Zones and conduits

A {{term:zone-conduit|zone}} is a group of assets that share the same security requirements and consequences if compromised. A **conduit** is the controlled channel between two zones. All traffic between zones must go through a conduit, and a conduit is something you design, with a firewall and an allow list.

| Zone | Contents | Notes |
|---|---|---|
| Cell/Area control | PLCs, drives, I/O, local HMI | Most protected |
| Safety | Safety PLCs, safety I/O | Own zone, tighter rules |
| Site operations | Ignition Gateway, historian, engineering workstations | Level 3 |
| Industrial DMZ | Jump hosts, patch servers, data replicas | Level 3.5 |
| Enterprise | ERP, email, business users | IT network |

### Security levels

Each zone gets a target {{term:security-level|security level}} (SL-T), and each device or system has a capability (SL-C). The levels describe the kind of attacker the zone must resist:

| SL | Protects against |
|---|---|
| SL 1 | Casual or accidental violation |
| SL 2 | Intentional violation with simple means, low skill and motivation |
| SL 3 | Sophisticated means, moderate resources, IACS-specific skill |
| SL 4 | Sophisticated means, extended resources, high motivation (nation-state class) |

Most plant zones target SL 1 or 2, critical infrastructure and safety zones SL 3. SL 4 is rare and expensive. The risk assessment (62443-3-2) sets the target, so it is a business decision backed by a risk analysis, not a number you pick from a menu.

## The industrial DMZ at Level 3.5

In the Purdue model (see {{lesson:found-purdue}}), levels 0 to 3 are the plant and levels 4 and 5 are the enterprise. The industrial {{term:dmz|DMZ}} sits between them as a "Level 3.5". Two firewalls (or one firewall with separate interfaces) create it: one facing the plant, one facing IT.

{{diagram:dmz}}

**The rule: no connection passes straight through.** Traffic from IT ends in the DMZ. Traffic from the plant ends in the DMZ. Anything that needs to cross is handled by a server in the DMZ that terminates one connection and opens a separate, new one on the other side.

What lives in the DMZ:

- A **historian or database replica**, so enterprise reports read from a copy and never query the plant directly.
- A **patch and antivirus server** for the plant, so plant hosts never reach out to the internet.
- A **remote access gateway / {{term:jump-host|jump host}}**, the only way for outsiders in.
- An MQTT broker or OPC UA aggregator when you push data up. Plant clients connect outward to it, so no inbound connection to the plant is needed.

> [!warning] No direct IT-to-PLC paths
> Any rule that lets an enterprise address reach a PLC, a drive or an engineering workstation directly is a defect, even if limited to one port. The exceptions that look harmless, such as "Planning needs to read one tag", create the paths real attackers use. Put a replica in the DMZ.

## Firewall rules in practice

A {{term:firewall|firewall}} allows or blocks traffic by source, destination, port and protocol, and modern ones can inspect application-layer content. The default stance is **deny all, then allow what you can justify**, in a table you can show an auditor.

The rows below use the Meridian Foods Plant 1 addressing (site \`10.20.0.0/16\`, DMZ on VLAN 250 at \`10.20.250.0/24\`, Corporate \`10.100.0.0/16\`).

| Conduit | Source | Destination | Port | Why |
|---|---|---|---|---|
| Plant to DMZ | Ignition master 10.20.30.10 | DMZ gateway 10.20.250.10 | TCP 8060 | Gateway Network, outgoing connection from the site |
| Corporate to DMZ | Corporate gateway | DMZ gateway 10.20.250.10 | TCP 8060 | Gateway Network, outgoing connection from Corporate. It reaches site services through the DMZ gateway |
| Office to DMZ | Office browsers | Reverse proxy 10.20.250.10 | TCP 8043 | Perspective over HTTPS. The proxy passes it to the site over the Gateway Network |
| Plant to DMZ | SQL 10.20.30.20 | Historian replica 10.20.250.20 | TCP 1433 | Push history to the replica |
| IT to DMZ | Enterprise BI server | Historian replica 10.20.250.20 | TCP 1433 | Reporting reads the copy |
| Plant to DMZ | Edge publisher or Ignition MQTT client | MQTT broker in the DMZ | TCP 8883 | MQTT over TLS, outgoing only. Use 1883 (plain) only on a trusted isolated segment |
| DMZ to plant | Jump host 10.20.250.30 | Engineering workstation (VLAN 50) | TCP 3389 | Vendor session, time-limited |
| Plant to PLC | Ignition master 10.20.30.10 | PLC1 10.20.10.10 | TCP 44818 | EtherNet/IP explicit messaging |
| Plant to PLC | Ignition master 10.20.30.10 | Modbus meter (one address, for example 10.20.10.20) | TCP 502 | Power data |
| Plant internal | OPC UA clients in Level 3 | Ignition master 10.20.30.10 | TCP 62541 | Ignition's built-in OPC UA server. Never opened to IT |
| Plant internal | Ignition master 10.20.30.10 | Third-party OPC UA server | TCP 4840 (or the vendor's port) | 4840 is the OPC UA default. Many servers use another port |

Two things stand out in this table. Every row that touches the DMZ is an outgoing connection from the side that starts it, and nothing runs straight from Level 3 to Level 4. Also, 8060 appears twice because the site and Corporate each dial *out* to the DMZ gateway. Neither side opens an inbound port to the other. A direct plant-to-HQ Gateway Network link can exist, but it is a documented exception, not the default.

Each row names source, destination, port and reason. Every row you cannot justify is a row to delete.

## Where Ignition sits

An Ignition Gateway that talks to PLCs lives in the **site operations zone (Level 3)**: it has a leg toward the control network and a leg toward clients. The Gateway's ports are well known: 8088 (HTTP) and 8043 (HTTPS) for web and Perspective sessions, 62541 for the built-in OPC UA server, and 8060 for the Gateway Network (verify the port on your gateway). Database connections go to the DB port (1433, 3306 or 5432), and tag data goes to PLCs on 44818 or 502. MQTT uses 1883, or 8883 with TLS.

A common layout is:

1. **Site gateway** inside the plant, talking to PLCs, never exposed outward.
2. **Perspective access** for office users: browser, HTTPS 8043, DMZ reverse proxy or front-end gateway, then the Gateway Network to the site gateway. Users never connect to the plant gateway directly.
3. **Gateway Network** links follow the DMZ pattern. The site gateway makes an outgoing connection to the DMZ gateway, and the corporate gateway also makes an outgoing connection to it, so corporate reaches site services through the DMZ gateway and no inbound port opens into the plant.
4. Engineering access through a jump host, with multi-factor authentication.

## Remote access patterns

Vendors need access to their equipment, and a lot of incidents begin there.

- **Bad:** a cellular router with port forwarding to a PLC, a shared VPN account, TeamViewer left running on an HMI.
- **Better:** a VPN into the DMZ only, with individual accounts and multi-factor authentication, ending at a jump host.
- **Best:** brokered, time-boxed access. A person requests a session, an operator approves it, access opens for two hours, it is recorded and it closes by itself. The vendor sees only the one machine they support.

## Defense in depth

No single control is trusted. Layers stack so that a failure of one is caught by another: physical locks on cabinets and disabled unused switch ports, VLANs and firewalls between zones, application allow lists on workstations, role-based accounts in Ignition, controller key switches in RUN mode, and monitoring that watches for new devices and unusual traffic. Safety systems add a last layer that cannot be reached from any of the above.

For the highest-risk boundaries, a **data diode** (a unidirectional gateway) lets data flow out of the plant with no return path at all, and passive monitoring builds an asset inventory and a baseline so a new device stands out. Both are covered in {{lesson:net-ot-monitoring}}.
`,

  eli5: `
Think of a castle. The simple idea is a big wall around everything, but if one person gets over the wall, they can walk into every room, including the treasury.

A better castle has rooms with their own locked doors. The kitchen staff can get into the kitchen and the hall, but not the treasury. The treasury has the strongest door of all. Each room is a zone. The doors between rooms are conduits, and a guard stands at each one with a list of who may pass.

The industrial DMZ is the guest house outside the main gate. Visitors never come inside the castle. They meet the steward in the guest house, hand over their papers, and the steward carries what is needed inside. A visitor with bad intentions never gets near the treasury, because they never set foot past the guest house.
`,

  why: `
**Why zones instead of one strong perimeter?** Attackers get past perimeters, usually through a phishing email or a stolen vendor password. A flat plant network turns one compromised laptop into a compromised plant. Zones turn it into a compromised laptop. This is the central idea of defense in depth.

**Why a DMZ instead of a firewall with a few holes?** Every hole is a direct path. With a DMZ, the enterprise side has no connection into the plant at all. It talks to a server in the DMZ. If that server is compromised, the attacker has a machine that is allowed to talk to almost nothing. The DMZ trades some complexity (replicas to maintain) for a very big reduction in exposed paths.

**Why designed conduits?** Most plants have conduits already, created by accident: a dual-homed PC, a cellular modem, a USB stick. Naming them and putting a firewall on each is how you find the unplanned ones.

**What integrators argue about.** How strictly to apply Purdue. Cloud and IIoT push data from Level 1 and 2 straight to the cloud, which the original model did not anticipate. Many designs now treat the outbound-only, brokered connection (MQTT with TLS from the plant to a broker) as an accepted conduit, because no inbound port is open. Others argue that 62443's zones and conduits are the real model and Purdue levels are just a labeling aid.

**The tradeoff.** Security that slows the 2 a.m. repair is bypassed. If the vendor cannot get in at night, someone will plug in a cellular router. The best designs make the safe path also the fast path.
`,

  history: `
The Purdue Enterprise Reference Architecture came out of Purdue University in the early 1990s as a model for computer-integrated manufacturing, not as a security design. ISA formed the ISA99 committee to address industrial security in the early 2000s. Its work became the ISA/IEC 62443 series, which has been published in parts over many years. Stuxnet in 2010 moved industrial security from a niche concern to a board-level topic.
`,

  examples: [
    {
      title: "Opening one hole the right way",
      body: `Finance wants live line counts in a BI tool. The wrong answer is a rule from the BI server to the PLC. The right answer: Ignition writes line counts to a table in a database in the DMZ every 10 seconds (outbound from plant to DMZ, TCP 1433). The BI server reads that table over a rule that allows IT to the DMZ only. If the BI server is compromised, the attacker can read a table of counts and nothing else.`
    },
    {
      title: "Vendor remote support",
      body: `A packaging OEM needs to debug their line. They connect over VPN to the DMZ with their own MFA account. The jump host allows only RDP to the one engineering workstation for that line, for a two hour window requested by the plant. The session is recorded. When the window ends, the rule disappears. No port is forwarded on any plant router.`
    }
  ],

  diagrams: {
    dmz: `<svg viewBox="0 0 640 260" role="img" aria-label="Three zones from left to right: enterprise IT, the industrial DMZ at level 3.5, and the plant control zone, separated by two firewalls, with no direct path from IT to the plant">
  <text class="dg-title" x="20" y="24">Enterprise (L4-5)</text>
  <rect class="dg-box" x="20" y="36" width="150" height="130" rx="6"/>
  <text class="dg-text-sm dg-mid" x="95" y="70">ERP / BI</text>
  <text class="dg-text-sm dg-mid" x="95" y="100">Email</text>
  <text class="dg-text-sm dg-mid" x="95" y="130">Business users</text>
  <text class="dg-title" x="240" y="24">DMZ (L3.5)</text>
  <rect class="dg-box-accent" x="240" y="36" width="160" height="130" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="66">Historian replica</text>
  <text class="dg-text-sm dg-mid" x="320" y="92">Jump host</text>
  <text class="dg-text-sm dg-mid" x="320" y="118">Patch server</text>
  <text class="dg-text-sm dg-mid" x="320" y="144">Perspective proxy</text>
  <text class="dg-title" x="470" y="24">Plant (L0-3)</text>
  <rect class="dg-box" x="470" y="36" width="150" height="130" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="70">Ignition Gateway</text>
  <text class="dg-text-sm dg-mid" x="545" y="100">PLCs, drives</text>
  <text class="dg-text-sm dg-mid" x="545" y="130">Safety zone</text>
  <line class="dg-line" x1="170" y1="100" x2="240" y2="100"/>
  <line class="dg-line" x1="400" y1="100" x2="470" y2="100"/>
  <text class="dg-text-muted dg-mid" x="205" y="190">Firewall 1</text>
  <text class="dg-text-muted dg-mid" x="435" y="190">Firewall 2</text>
  <text class="dg-text-muted" x="20" y="236">Every flow ends in the DMZ. IT never opens a session into the plant.</text>
</svg>`
  },

  pitfalls: [
    "Allowing a direct rule from enterprise addresses to PLCs 'just for one report'.",
    "Believing an air gap protects you while USB drives and laptops move freely.",
    "Leaving a cellular router with port forwarding on a PLC after a vendor visit.",
    "Putting the Ignition Gateway in the DMZ and the PLCs on the same flat network as IT.",
    "Setting security level targets without a risk assessment.",
    "Controllers left in PROG or REM mode with the key out of the RUN position."
  ],

  keyTerms: ["zone-conduit", "security-level", "dmz", "firewall", "jump-host", "iec-62443", "defense-in-depth"],

  quiz: [
    {
      q: "Finance needs line counts in a BI tool. Which design follows zone and conduit practice?",
      options: ["Allow the BI server to read PLC tags on port 44818", "Put the BI server on the control VLAN", "Open the BI server's firewall to the plant", "Replicate the data into a database in the DMZ and let the BI server read that"],
      answer: 3,
      explain: [
        "That is a direct IT-to-PLC path, even though it is one port.",
        "This moves an IT system into the control zone and enlarges the attack surface.",
        "This weakens the conduit for everyone.",
        "Correct. Each side talks to the DMZ, and no session crosses from IT to the plant."
      ]
    },
    {
      q: "In 62443, what is a conduit?",
      options: ["A cable tray for network cabling", "A controlled communication path between zones", "A type of firewall appliance", "The weakest part of a zone"],
      answer: 1,
      explain: [
        "The word is borrowed from cabling, but here it is a logical concept.",
        "Correct. A conduit is the designed, enforced path between zones.",
        "A firewall may enforce a conduit, but the conduit is the path and its rules.",
        "A conduit has its own security requirements and is meant to be controlled."
      ]
    },
    {
      q: "A zone is rated SL 2. What does that describe?",
      options: ["The zone has 2 firewalls", "The zone is at Purdue level 2", "The zone resists intentional attacks using simple means by low-skill attackers", "The zone can be patched within 2 days"],
      answer: 2,
      explain: [
        "Security levels describe the attacker, not the number of devices.",
        "Security levels are not Purdue levels.",
        "Correct. SL 2 is protection against intentional violation with simple means and low motivation.",
        "Patching is separate from the security level."
      ]
    },
    {
      q: "A vendor needs after-hours access to a line. Which pattern is best?",
      options: ["Individual MFA login to a DMZ jump host with a time-limited, recorded session to one machine", "A shared VPN account with a permanent port forward", "A cellular router the vendor keeps on the machine", "Leaving TeamViewer on the HMI"],
      answer: 0,
      explain: [
        "Correct. It ends in the DMZ, uses individual identity and limits scope and time.",
        "Shared accounts cannot be attributed or revoked, and a permanent forward is always open.",
        "Unmanaged cellular routers bypass the firewall completely.",
        "Always-on remote tools are a common entry point."
      ]
    },
    {
      q: "Where does the site Ignition Gateway that talks to PLCs normally sit?",
      options: ["In the enterprise network", "Directly on the Internet", "Inside the safety zone", "In the plant site operations zone, with office users reaching Perspective through a proxy or front-end gateway"],
      answer: 3,
      explain: [
        "That would require IT-to-PLC paths.",
        "Exposing it to the Internet invites attacks against the system that runs the plant.",
        "Safety systems are isolated and are not polled for general SCADA purposes.",
        "Correct. It is a Level 3 system, reachable through controlled conduits."
      ]
    },
    {
      q: "What lesson does the Colonial Pipeline shutdown teach about IT and OT?",
      options: ["PLCs were hacked directly", "Firewalls cause outages", "Without provable separation, an IT incident can force an operational shutdown", "Ransomware cannot affect operations"],
      answer: 2,
      explain: [
        "The ransomware hit IT systems. The pipeline was shut down as a precaution.",
        "The point is that segmentation prevents spread and uncertainty.",
        "Correct. Not being sure that OT was isolated was enough to stop operations.",
        "It can, as this incident showed, through decisions made out of caution."
      ]
    }
  ],

  resources: [
    { title: "IEC 62443 zones and conduits explained", url: "https://www.fabrico.io/blog/iec-62443-zones-conduits/", type: "article", source: "Fabrico" },
    { title: "IEC 62443 overview", url: "https://www.trout.software/resources/iec-62443", type: "article", source: "Trout Software" },
    { title: "OT/IT Segmentation, DMZ and the Purdue Model for Remote Maintenance", url: "https://wz-it.com/en/knowledge/remote-access/ot-it-segmentation-dmz-remote-access/", type: "article", source: "WZ-IT" },
    { title: "IEC 62443 compliance whitepaper", url: "https://cms.endian.com/media/download/endian_iec-62443-compliance_whitepaper_en.pdf", type: "article", source: "Endian" }
  ]
});
