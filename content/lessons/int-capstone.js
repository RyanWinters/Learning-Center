LC.lesson({
  id: "int-capstone",
  title: "Capstone: architect a multi-site system",
  track: "int",
  minutes: 45,
  level: 4,
  prereqs: ["arch-patterns", "mes-uns", "db-schema", "int-naming"],
  tags: ["architecture", "capstone", "multi-site", "decision-log", "purdue", "uns", "mes", "redundancy", "security"],
  summary: "One scenario, three plants and a headquarters, worked as a decision log: each choice, the alternatives you rejected and why.",
  objectives: [
    "Turn a business brief into measurable requirements and constraints",
    "Zone a multi-site network with the Purdue model and IEC 62443 zones and conduits",
    "Choose Edge or full gateways per site and hub-and-spoke transport (Gateway Network, MQTT/UNS)",
    "Place historians, databases and the EAM controller, and decide where redundancy pays",
    "Scope MES (Sepasoft or custom) and the ERP integration",
    "Write the architecture as a decision log that a customer can review and challenge"
  ],

  body: `
## How to read this lesson

This lesson uses earlier tools on one problem, in the order a senior integrator meets it: requirements, zones, software, then operations. Each decision follows a short form: **context, decision, alternatives considered, consequences**. That is a decision log, the document a customer's IT and operations leads will argue over. Links point back to the lesson that teaches each block.

## The scenario

**Meridian Beverage Co.** makes bottled drinks in three plants and runs the business from a headquarters.

| Site | Profile | Control | Constraints |
|---|---|---|---|
| Chicago | 12 filling lines, 24/7, about 9,000 tags | ControlLogix 5580 per line | Downtime costs about 18,000 USD per hour |
| Dallas | 5 lines, 2 shifts, about 3,500 tags, acquired company | Mix of CompactLogix and old PLC-5 or SLC-500 on two lines | Brownfield; a cutover window of 8 hours at weekends only |
| Phoenix | 1 line, 1 shift, about 1,200 tags | CompactLogix | One controls person on site; slow WAN link |
| HQ (Columbus) | Corporate IT, ERP, data team | n/a | Wants one dashboard across plants, one order flow from ERP, and lot genealogy for recalls |

The brief says: "Same look and feel at every plant, a single view of OEE, lot traceability within 4 hours of a recall call, plants keep running if the WAN fails, and IT must be able to defend it in a security review." Design for growth: a fourth plant and double the data.

## Step 1: Turn the brief into requirements

Vague goals become testable numbers. This is where scope fights are won. See {{lesson:int-lifecycle}} and {{lesson:int-fds}}.

| ID | Requirement | Measure |
|---|---|---|
| R1 | Plants operate through a WAN outage | Each plant runs 72 h with no WAN, with no data loss after reconnection |
| R2 | Enterprise OEE view | Shift OEE per line visible at HQ within 1 minute of shift data |
| R3 | Recall traceability | Lot genealogy query answers in under 4 hours, ideally minutes |
| R4 | Availability | Chicago HMI/history 99.9 percent; others best effort |
| R5 | Security | IEC 62443 zone model, no direct IT-to-PLC path |
| R6 | Standardization | Same UDTs, views and naming at all sites ({{lesson:int-naming}}) |
| R7 | ERP orders and confirmations | Orders arrive at the plant, completions return within 5 minutes |
| R8 | Growth | New plant onboarded in under 12 weeks from a template |

## Step 2: Zones and conduits

Start from the network, not from software. Apply the Purdue model ({{lesson:found-purdue}}) at each site and divide it into IEC 62443 zones with controlled conduits ({{lesson:net-security}}, {{lesson:net-vlan}}).

{{diagram:zones}}

**Decision D1: zone per line cell, one site operations zone, a DMZ per site.**
- *Context:* Lines are independent. A fault on one line should not flood another's network.
- *Decision:* Each line gets its own VLAN and cell firewall zone at Levels 0-2. Site gateways, historian DB and MES server sit in a Level 3 zone. A DMZ (Level 3.5) holds the MQTT broker, remote-access jump host and patch relay. Nothing from corporate IT reaches Level 2 directly.
- *Alternatives:* One flat plant VLAN (a broadcast storm or malware affects all lines).
- *Consequences:* More firewall rules to document. Every conduit is listed with port, protocol and direction in the network design.

## Step 3: PLC standards

**Decision D2: one PLC standard with UDTs and AOIs for all Logix sites.**
- *Decision:* A Logix template project with \`UDT_Motor\`, \`UDT_Valve\`, \`UDT_AnalogIn\` and matching Ignition UDTs. Names follow {{lesson:int-naming}}; project structure follows {{lesson:plc-best-practices}}. State models use PackML on the filling lines ({{lesson:plc-isa88-packml}}).
- *Alternatives:* Each site keeps its own style (impossible to support centrally).
- *Consequences:* Dallas's old PLC-5 lines get a gateway driver and an Ignition UDT instance that looks the same as the others. Replace the controllers later, at a planned outage.

## Step 4: Edge versus full gateways

Revisit {{lesson:arch-edge}} and {{lesson:ign-architecture}}.

**Decision D3: a full Ignition gateway at each plant; Edge gateways at selected machines.**
- *Context:* Each plant must run alone for 72 hours (R1) and needs local history, alarming, notification and MES.
- *Decision:* Chicago, Dallas and Phoenix each run a full gateway (Chicago redundant, see D7). Three packaged machines at Dallas and a wastewater skid at Phoenix get Edge gateways that publish to the site gateway through MQTT. Check the Edge licensing and feature list for your Ignition version before committing the machine list.
- *Alternatives:* Edge as the only gateway at Phoenix (cheaper, but no room for the MES and local reporting the plant will ask for); everything on one central gateway (a WAN failure would blind the plants).
- *Consequences:* Four gateway types to patch and back up, which is why the EAM decision matters (D6).

## Step 5: Hub-and-spoke and transport

**Decision D4: Gateway Network for Ignition-to-Ignition, MQTT with Sparkplug and a UNS for everything else.**
- *Context:* HQ wants a single view across plants. A data team wants plant data in an analytics platform that does not run Ignition.
- *Decision:* Plant gateways and the central gateway at HQ connect over the Gateway Network ({{lesson:arch-gateway-network}}) for remote tag access, EAM, and drill-down views. In addition, each plant publishes selected tags and events to an MQTT broker in its DMZ with Sparkplug B ({{lesson:proto-sparkplug}}), bridged to a central broker, which forms the UNS ({{lesson:mes-uns}}, {{lesson:arch-mqtt}}). The topic hierarchy follows ISA-95 naming: \`meridian/<site>/<area>/<line>/<equipment>/...\`.
- *Alternatives:* MQTT only (a good choice if there were no Ignition at HQ, but it loses remote tag browsing and EAM); Gateway Network only (simple, but the data team and any later non-Ignition consumers would need point integrations); OPC UA from HQ to each plant (pull-based, many connections, harder through firewalls).
- *Consequences:* Two paths to maintain, so the plan states which data uses which. Operational control and screens use the Gateway Network. Analytics and cross-site KPIs use the UNS. Control commands never travel the UNS.

{{diagram:topology}}

## Step 6: Historian and database placement

See {{lesson:db-historians}}, {{lesson:db-schema}} and {{lesson:db-timeseries}}.

**Decision D5: raw history stays at the plant; rolled-up data goes to HQ.**
- *Context:* 9,000 tags at 1-second scan in Chicago is a lot to ship over WAN, and R1 demands local history.
- *Decision:* Each plant has its own SQL database server in Level 3 holding Ignition history (with store and forward on), alarm journal and MES tables. Central keeps a reporting database with shift OEE, downtime and lot summaries, plus selected analog tags at low frequency.
- *Alternatives:* Central-only historian (WAN dependency, large bandwidth); full replication of raw history (cost and little value).
- *Consequences:* Cross-site raw-data queries need the plant database, reachable from HQ through the Gateway Network or a read-only replica. State this in the design so nobody promises a global 1-second trend.

## Step 7: EAM, deployment and version control

See {{lesson:arch-eam}}, {{lesson:ign-projects}} and {{lesson:ign-versioning}}.

**Decision D6: central gateway as the EAM controller; templates deployed from source control.**
- *Decision:* The HQ gateway runs the Enterprise Administration module as controller. Each plant gateway is an agent. EAM gives scheduled backups, status monitoring and a way to push shared project or configuration changes. A Git repository holds the project resources, tag exports and UDT definitions. Changes move dev, then test, then production gateways via pull request review. PLC projects are archived (ACD and L5X) with the same release tag. Dev and test gateways run in containers ({{lesson:arch-containers}}).
- *Alternatives:* Manual exports (no history, no review); each site customizes locally (drift and unsupportable).
- *Consequences:* A change process the plants must accept, and a rule that nobody edits production directly except during a declared emergency, with a back-port to Git afterwards.

## Step 8: Redundancy where it pays

See {{lesson:arch-redundancy}}.

**Decision D7: Ignition redundant pair at Chicago; virtualization high availability elsewhere.**
- *Context:* R4 requires 99.9 percent at Chicago, where an hour costs 18,000 USD. 99.9 percent allows about 8.8 hours per year. A redundant pair plus a failover test pays back inside one avoided outage.
- *Decision:* Chicago runs a master and backup gateway on separate hosts and switches. Dallas and Phoenix run a single gateway on a virtualization cluster with restart-on-failure, plus tested backups.
- *Alternatives:* Redundancy everywhere (cost and upkeep, little value at Phoenix); none (fails R4).
- *Consequences:* The PLC layer is not made redundant by this decision. If the customer wants controller redundancy, that is a separate, costed item.

## Step 9: MES scope and build versus buy

See {{lesson:mes-what}}, {{lesson:mes-oee}}, {{lesson:mes-track-trace}}, {{lesson:mes-sepasoft}} and {{lesson:mes-build-vs-buy}}.

**Decision D8: Sepasoft MES modules for OEE, downtime and track and trace; custom code for the ERP bridge and the scheduling rules.**
- *Context:* R2 and R3 are standard MES functions, and a team of three cannot support a homegrown genealogy engine.
- *Decision:* Sepasoft OEE and downtime at Chicago and Dallas first. Track and trace for lot genealogy on all filling lines. Phoenix starts with OEE-lite using the same equipment model, then adds modules on request. Scheduling stays in the ERP for now.
- *Alternatives:* A full custom MES (high long-term cost); a monolithic MES vendor (long implementation, mismatched screens).
- *Consequences:* Equipment model names must match the standard ({{lesson:int-naming}}) because the same names appear in MES, history and the UNS.

## Step 10: ERP integration

See {{lesson:mes-erp}}.

**Decision D9: a central integration layer with staging tables, not direct site-to-ERP links.**
- *Decision:* The ERP publishes production orders into a staging table (or REST endpoint) in the central integration database. The central gateway validates them and sends them to the right site. Plants post completions, scrap and material consumption back through the same layer. Failed messages go to an error table with alerts. Each message has an ID so retries do not duplicate.
- *Alternatives:* Each plant integrates with ERP separately (three integrations to build and audit); ERP talks to PLCs (never).
- *Consequences:* The central layer is a dependency, so plants queue outgoing confirmations locally and keep running if it is down (R1).

## Step 11: Security

See {{lesson:ign-security}}, {{lesson:net-security}} and {{lesson:int-standards}}.

**Decision D10: central identity, least privilege, brokered remote access.**
- *Decision:* Ignition authenticates through the corporate identity provider with role groups mapped to Ignition roles and security zones. Local emergency accounts are vaulted and audited. Remote access passes through the DMZ jump host with multi-factor authentication. Gateway Network connections use TLS and explicit approval. PLCs sit behind cell firewalls with only the gateway allowed on the controller ports.
- *Alternatives:* Local accounts only (does not scale or offboard); direct vendor VPN into plant networks (a common breach path).
- *Consequences:* A WAN outage must not lock operators out, so each plant keeps a local fallback path for authentication.

## Step 12: Commissioning and rollout

Roll out as a template: **Dallas pilot line, then Phoenix, then Chicago**, because Chicago has the highest cost of failure and should get the proven template. Each rollout uses {{lesson:int-commissioning}}: FAT with simulated I/O, SAT with point-to-point checkout, a cutover plan with rollback, and the alarm philosophy from {{lesson:int-alarm-mgmt}}.

## Putting it together

{{diagram:flow}}

Track the decisions in one table that leads the design document:

| ID | Decision | Main alternative | Why not |
|---|---|---|---|
| D1 | Zones per line plus site DMZ | Flat plant network | Blast radius, 62443 |
| D2 | One PLC standard | Per-site styles | Supportability |
| D3 | Full gateway per site, Edge on machines | Central only | R1 WAN failure |
| D4 | Gateway Network plus MQTT UNS | MQTT only | Loses remote tags and EAM |
| D5 | Local raw history, central rollups | Central historian | Bandwidth, R1 |
| D6 | EAM and Git deploy | Manual exports | Drift |
| D7 | Redundancy at Chicago only | Everywhere | Cost versus value |
| D8 | Sepasoft plus custom bridge | Full custom MES | Support burden |
| D9 | Central ERP integration layer | Site-to-ERP links | Three integrations |
| D10 | Central identity, brokered access | Local accounts | Offboarding, risk |

> [!tip] Review it adversarially
> For every line on the diagrams ask what breaks if it dies. If the answer is not in the log, the design is not finished.
`,

  eli5: `
Say a company has three bakeries in three towns and one head office. The head office wants to know how many loaves each bakery made and how many were burnt, and it wants to find every bakery that used a bad batch of flour if there is a recall.

You would not make the head office run the ovens by phone. Each bakery needs its own manager, its own whiteboard and its own notebook, so it can keep baking when the phone line is down. Each bakery sends a short report to head office every few minutes, and head office keeps a big summary book. The bakeries use the same recipe cards and the same names for things, so the summaries add up. Each bakery locks its back door and only lets the delivery driver into one room.

Architecting a multi-site system is doing that for control systems. You decide what stays local, what is sent upward, who can reach what, and what happens when something breaks. Then you write down every choice and the other choices you turned down, so the owner can check your thinking.
`,

  why: `
**Why a decision log?** Architecture documents usually describe the result and hide the thinking. A log shows alternatives and consequences, so a reviewer can challenge a decision while it is cheap. Two years later, when the next engineer asks "why did we not centralize history?", the answer is on paper. Software teams call this an architecture decision record. It is just as useful in a plant.

**Why local autonomy first?** The plant exists to make product. A system that needs the WAN to run the line has made a bad trade, and the first long outage proves it. Autonomy also limits blast radius: an update or breach at HQ should not stop three plants. The cost is duplicated servers and more to patch, which is why standardization and EAM are part of the same design.

**Central or per-site gateways?** Experienced integrators lean toward per-site gateways with a central one for visibility, because latency, WAN reliability and operational ownership point that way. Others argue for one large gateway on small footprints. For 24/7 production, per-site is the safer default.

**Why two transport paths?** Gateway Network is excellent for Ignition-to-Ignition features. MQTT with a UNS is excellent for decoupling many consumers. People argue for one or the other. A written rule about which data uses which path avoids the worst outcome, where both carry everything and nobody knows which is authoritative.

**Where to spend on redundancy.** Redundancy is a cost-benefit question measured in dollars per hour of downtime. Show the arithmetic to the customer. If an hour costs 18,000 USD and the pair costs less than one avoided outage per year, it passes. If a site loses 500 USD per hour, a tested backup is the better buy.

**Why build the rollout order into the architecture?** The first site teaches you what the template got wrong. Starting with the lowest-risk site lets you fix the template before it touches the plant that cannot afford surprises.
`,

  history: `
Multi-site SCADA used to mean a central master station polling remote terminal units over leased lines. As networks improved and edge computing arrived, designs moved toward autonomous site systems that forward summarized data upward. Publish-subscribe designs such as MQTT and the Unified Namespace idea extended that: plants publish their state once, and any authorized consumer subscribes. Standards such as ISA-95 and IEC 62443 gave integrators common vocabularies for hierarchy and security zoning.
`,

  examples: [
    {
      title: "Sizing the WAN for one plant",
      body: `Chicago has 9,000 tags. Only about 400 are published to the UNS, as report-by-exception values with deadband. A typical publish rate is 150 changes per second at peak with a 120-byte payload, roughly 18 KB/s or 144 kbit/s. Even a 5 Mbit/s link carries that with room to spare. Sending all raw 1-second history would be about 9,000 values per second and would need a far larger link, which is the argument for keeping raw history local.`
    },
    {
      title: "The WAN fails for 6 hours",
      body: `Dallas loses its link. Site operations continue. Store-and-forward caches outgoing UNS messages and central-bound history. MES confirmations queue in a local table. When the link returns, queues drain in order. HQ dashboards show Dallas as stale for 6 hours and then catch up. The checklist for the SAT includes pulling the WAN for 2 hours and verifying the catch-up.`
    }
  ],

  diagrams: {
    zones: `<svg viewBox="0 0 640 260" role="img" aria-label="One plant divided into zones: line cells at Levels 0 to 2, a site operations zone at Level 3, and a DMZ at Level 3.5 that connects to corporate IT at Level 4">
  <defs><marker id="int-capstone-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-zone" x="10" y="10" width="620" height="60" rx="6"/>
  <text class="dg-title" x="22" y="32">Level 4-5: Corporate IT</text>
  <text class="dg-text-sm" x="22" y="54">ERP, identity provider, analytics, central gateway</text>
  <rect class="dg-box-warn" x="10" y="86" width="620" height="44" rx="6"/>
  <text class="dg-title" x="22" y="106">Level 3.5: DMZ</text>
  <text class="dg-text-sm" x="22" y="124">MQTT broker, jump host with MFA, patch relay</text>
  <rect class="dg-zone" x="10" y="146" width="620" height="50" rx="6"/>
  <text class="dg-title" x="22" y="166">Level 3: Site operations</text>
  <text class="dg-text-sm" x="22" y="186">Site gateway (or pair), SQL database, MES, backup server</text>
  <rect class="dg-box" x="10" y="212" width="196" height="40" rx="5"/>
  <text class="dg-text-sm dg-mid" x="108" y="236">Line 1 cell zone (L0-2)</text>
  <rect class="dg-box" x="222" y="212" width="196" height="40" rx="5"/>
  <text class="dg-text-sm dg-mid" x="320" y="236">Line 2 cell zone (L0-2)</text>
  <rect class="dg-box" x="434" y="212" width="196" height="40" rx="5"/>
  <text class="dg-text-sm dg-mid" x="532" y="236">Line N cell zone (L0-2)</text>
  <line class="dg-line" x1="320" y1="146" x2="320" y2="130" marker-end="url(#int-capstone-ah)"/>
  <line class="dg-line" x1="320" y1="86" x2="320" y2="70" marker-end="url(#int-capstone-ah)"/>
  <line class="dg-line" x1="108" y1="212" x2="108" y2="196" marker-end="url(#int-capstone-ah)"/>
  <line class="dg-line" x1="320" y1="212" x2="320" y2="196" marker-end="url(#int-capstone-ah)"/>
  <line class="dg-line" x1="532" y1="212" x2="532" y2="196" marker-end="url(#int-capstone-ah)"/>
</svg>`,
    topology: `<svg viewBox="0 0 640 290" role="img" aria-label="Hub-and-spoke topology: headquarters hub with central gateway, EAM controller and central MQTT broker; three plant spokes each with a site gateway, site database and a broker; Chicago has a redundant pair">
  <defs><marker id="int-capstone-tp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="170" y="12" width="300" height="86" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="34">HQ (Columbus): hub</text>
  <text class="dg-text-sm dg-mid" x="320" y="54">Central gateway + EAM controller</text>
  <text class="dg-text-sm dg-mid" x="320" y="72">Central MQTT broker (UNS), reporting DB</text>
  <text class="dg-text-sm dg-mid" x="320" y="90">ERP integration layer, Git, identity</text>
  <rect class="dg-box" x="10" y="186" width="196" height="90" rx="6"/>
  <text class="dg-title dg-mid" x="108" y="208">Chicago</text>
  <text class="dg-text-sm dg-mid" x="108" y="228">Redundant gateway pair</text>
  <text class="dg-text-sm dg-mid" x="108" y="246">SQL DB, Sepasoft MES</text>
  <text class="dg-text-sm dg-mid" x="108" y="264">12 lines, DMZ broker</text>
  <rect class="dg-box" x="222" y="186" width="196" height="90" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="208">Dallas</text>
  <text class="dg-text-sm dg-mid" x="320" y="228">Gateway on VM cluster</text>
  <text class="dg-text-sm dg-mid" x="320" y="246">SQL DB, Sepasoft MES</text>
  <text class="dg-text-sm dg-mid" x="320" y="264">3 Edge gateways on machines</text>
  <rect class="dg-box" x="434" y="186" width="196" height="90" rx="6"/>
  <text class="dg-title dg-mid" x="532" y="208">Phoenix</text>
  <text class="dg-text-sm dg-mid" x="532" y="228">Single gateway, SQL DB</text>
  <text class="dg-text-sm dg-mid" x="532" y="246">OEE-lite, Edge on skid</text>
  <text class="dg-text-sm dg-mid" x="532" y="264">Slow WAN, queues locally</text>
  <line class="dg-line" x1="108" y1="186" x2="220" y2="98" marker-end="url(#int-capstone-tp)"/>
  <line class="dg-line" x1="320" y1="186" x2="320" y2="98" marker-end="url(#int-capstone-tp)"/>
  <line class="dg-line" x1="532" y1="186" x2="420" y2="98" marker-end="url(#int-capstone-tp)"/>
  <text class="dg-text-muted" x="14" y="130">Gateway Network (TLS) + MQTT/Sparkplug</text>
  <text class="dg-text-muted" x="14" y="148">Spokes keep running without the hub</text>
</svg>`,
    flow: `<svg viewBox="0 0 640 250" role="img" aria-label="Data flow from PLCs to the site gateway, local history and MES, then rollups and UNS messages to HQ, and ERP orders flowing down">
  <defs><marker id="int-capstone-fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="12" y="96" width="100" height="58" rx="5"/>
  <text class="dg-text-sm dg-mid" x="62" y="120">PLCs</text>
  <text class="dg-text-sm dg-mid" x="62" y="138">UDT tags</text>
  <rect class="dg-box-accent" x="150" y="96" width="120" height="58" rx="5"/>
  <text class="dg-text-sm dg-mid" x="210" y="120">Site gateway</text>
  <text class="dg-text-sm dg-mid" x="210" y="138">alarms, screens</text>
  <rect class="dg-box" x="150" y="12" width="120" height="48" rx="5"/>
  <text class="dg-text-sm dg-mid" x="210" y="32">Site SQL DB</text>
  <text class="dg-text-sm dg-mid" x="210" y="50">raw history</text>
  <rect class="dg-box" x="150" y="190" width="120" height="48" rx="5"/>
  <text class="dg-text-sm dg-mid" x="210" y="210">Site MES</text>
  <text class="dg-text-sm dg-mid" x="210" y="228">OEE, lots</text>
  <rect class="dg-box-accent" x="320" y="96" width="140" height="58" rx="5"/>
  <text class="dg-text-sm dg-mid" x="390" y="120">DMZ broker</text>
  <text class="dg-text-sm dg-mid" x="390" y="138">Sparkplug / UNS</text>
  <rect class="dg-box" x="500" y="12" width="128" height="58" rx="5"/>
  <text class="dg-text-sm dg-mid" x="564" y="36">Central DB</text>
  <text class="dg-text-sm dg-mid" x="564" y="54">rollups</text>
  <rect class="dg-box" x="500" y="96" width="128" height="58" rx="5"/>
  <text class="dg-text-sm dg-mid" x="564" y="120">Central gateway</text>
  <text class="dg-text-sm dg-mid" x="564" y="138">dashboards, EAM</text>
  <rect class="dg-box-ok" x="500" y="180" width="128" height="58" rx="5"/>
  <text class="dg-text-sm dg-mid" x="564" y="204">ERP</text>
  <text class="dg-text-sm dg-mid" x="564" y="222">orders, confirms</text>
  <line class="dg-line" x1="112" y1="125" x2="150" y2="125" marker-end="url(#int-capstone-fl)"/>
  <line class="dg-line" x1="210" y1="96" x2="210" y2="60" marker-end="url(#int-capstone-fl)"/>
  <line class="dg-line" x1="210" y1="154" x2="210" y2="190" marker-end="url(#int-capstone-fl)"/>
  <line class="dg-line" x1="270" y1="125" x2="320" y2="125" marker-end="url(#int-capstone-fl)"/>
  <line class="dg-line" x1="460" y1="125" x2="500" y2="125" marker-end="url(#int-capstone-fl)"/>
  <line class="dg-line" x1="564" y1="96" x2="564" y2="70" marker-end="url(#int-capstone-fl)"/>
  <line class="dg-line-accent" x1="500" y1="209" x2="270" y2="215" marker-end="url(#int-capstone-fl)"/>
  <text class="dg-text-muted" x="300" y="195">orders down via integration layer</text>
</svg>`
  },

  pitfalls: [
    "Designing the software before the network zones, then discovering the firewall team will not open the ports you assumed.",
    "Centralizing everything for the dashboard and losing the plants when the WAN drops.",
    "Letting both Gateway Network and MQTT carry the same data with no rule on which is authoritative.",
    "Buying redundancy for every site without a downtime cost to justify it.",
    "Letting each site customize the template so that the central team cannot support or upgrade it.",
    "Integrating each plant to ERP separately and ending up with three different order flows.",
    "Presenting an architecture without the alternatives, so the customer cannot judge it."
  ],

  keyTerms: ["purdue-model", "zone-conduit", "iec-62443", "dmz", "hub-and-spoke", "decision-log", "ignition-edge", "uns", "sparkplug", "mqtt-broker", "mes", "erp", "historian"],

  quiz: [
    {
      q: "Requirement R1 says each plant must run 72 hours without the WAN. Which design choice follows most directly?",
      options: ["A full gateway, local history database and queued confirmations at each plant", "A single central gateway for all plants", "Edge gateways with no site database", "Direct ERP links to each PLC"],
      answer: 0,
      explain: [
        "Correct. Local gateway, history and queued messages keep operation and data safe through an outage and let queues drain afterwards.",
        "A central gateway would lose the plants when the WAN drops.",
        "Edge can be right for machines, but a site with MES and 72 hours of history needs a site database and a full gateway.",
        "ERP should never connect directly to controllers, and that does not help WAN autonomy."
      ]
    },
    {
      q: "Why does the log keep both the Gateway Network and an MQTT UNS between plants and HQ?",
      options: ["Gateway Network gives Ignition-specific features such as remote tags and EAM; the UNS decouples non-Ignition consumers", "They are duplicates for redundancy", "MQTT cannot run over a WAN", "The Gateway Network is required for ERP"],
      answer: 0,
      explain: [
        "Correct. Each fits a different job, and the plan assigns data to one path to avoid ambiguity.",
        "They are for different purposes, not copies. Duplicate carriage creates two sources of truth.",
        "MQTT is designed for unreliable networks and works over a WAN.",
        "ERP integration is handled by a separate integration layer."
      ]
    },
    {
      q: "Chicago loses 18,000 USD per hour of downtime; Phoenix loses about 500 USD. What does the redundancy decision imply?",
      options: ["Redundant pair at Chicago; tested backup and fast restore at Phoenix", "Redundant pairs everywhere", "No redundancy anywhere", "Redundant pair at Phoenix only"],
      answer: 0,
      explain: [
        "Correct. Spend where the cost of an hour justifies it, and rely on tested restores elsewhere.",
        "Uniform redundancy costs more and adds maintenance with little return at Phoenix.",
        "That fails the 99.9 percent requirement at Chicago.",
        "This is backwards relative to downtime cost."
      ]
    },
    {
      q: "Where should raw 1-second history for 9,000 Chicago tags be stored?",
      options: ["In the Chicago site database, with only rollups and selected tags sent to HQ", "Only in the HQ database", "Only in the PLC", "In the MQTT broker"],
      answer: 0,
      explain: [
        "Correct. Local raw history avoids WAN load and survives outages, while HQ gets what cross-site reports need.",
        "Central-only history depends on the WAN and carries the full data rate.",
        "PLC memory is small and not a historian.",
        "Brokers move messages. They are not a long-term store."
      ]
    },
    {
      q: "Which statement about the ERP integration decision is correct?",
      options: ["A central integration layer with staging tables and message IDs gives one audited order flow and safe retries", "Each plant should have its own ERP connector", "ERP writes orders directly into PLC tags", "Confirmations should be sent only when the WAN is up and discarded otherwise"],
      answer: 0,
      explain: [
        "Correct. One flow is easier to audit, and IDs prevent duplicates after a retry.",
        "Three separate integrations triple the build and audit effort.",
        "ERP does not belong at the control level.",
        "Dropping confirmations loses production records. Queue them locally instead."
      ]
    },
    {
      q: "A reviewer asks why you did not use one flat VLAN per plant. Which answer comes from the log?",
      options: ["A flat network lets a fault or malware on one line reach all lines, and 62443 expects zones and conduits", "Flat networks cannot carry Ethernet/IP", "VLANs are required by Ignition", "A flat network costs more"],
      answer: 0,
      explain: [
        "Correct. Blast radius and the zone model drive the decision.",
        "Ethernet/IP runs on flat networks. That is the reason they are common and risky.",
        "Ignition does not require VLANs.",
        "Flat networks are usually cheaper. The issue is risk, not price."
      ]
    },
    {
      q: "Why does the rollout order put Chicago last?",
      options: ["It has the highest cost of failure, so the template should be proven at lower-risk sites first", "It has the fewest tags", "It cannot use the template", "It has no network"],
      answer: 0,
      explain: [
        "Correct. Lessons from the first sites improve the template before it reaches the plant that can least afford surprises.",
        "Chicago has the most tags.",
        "It uses the same template.",
        "It has a network. The ordering is about risk."
      ]
    }
  ],

  resources: [
    { title: "Gateway Network (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/platform/gateway-network", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Redundancy (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/ignition-redundancy", type: "docs", source: "Inductive Automation" },
    { title: "Redundant EAM Configuration", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/enterprise-administration/redundant-eam-configuration", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Edge (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/other-editions/ignition-edge", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Unified Namespace Solution", url: "https://inductiveautomation.com/solutions/unified-namespace", type: "article", source: "Inductive Automation" },
    { title: "Using MQTT Modules in a UNS Architecture", url: "https://docs.chariot.io/display/CLD80/Using+MQTT+Modules+in+a+UNS+Architecture", type: "docs", source: "Cirrus Link" },
    { title: "Sparkplug 3.0.0 Specification", url: "https://sparkplug.eclipse.org/specification/version/3.0/documents/sparkplug-specification-3.0.0.pdf", type: "standard", source: "Eclipse Sparkplug" },
    { title: "CSIA Best Practices Manual", url: "https://controlsys.org/community-resources/best-practices-manual/", type: "standard", source: "Control System Integrators Association" }
  ]
});
