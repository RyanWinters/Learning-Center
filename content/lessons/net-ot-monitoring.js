LC.lesson({
  id: "net-ot-monitoring",
  title: "OT monitoring, asset inventory and data diodes",
  track: "net",
  minutes: 15,
  level: 4,
  prereqs: ["net-security"],
  tags: ["ot-security", "monitoring", "asset-inventory", "data-diode", "ids", "62443", "incident-response"],
  summary: "You cannot defend or troubleshoot what you cannot see. Passive monitoring, an asset inventory, a traffic baseline, good logs and, at high security levels, a one-way gateway at the DMZ.",
  objectives: [
    "Explain passive asset discovery from a SPAN port or TAP and why it suits OT",
    "Describe a traffic baseline and the events worth alerting on, such as new devices and unexpected writes",
    "List the log sources a plant should collect, including the Ignition audit log",
    "Explain how a unidirectional gateway replicates a historian from Level 3 to Level 3.5",
    "Outline OT incident response and tie monitoring to ISA/IEC 62443 zones and conduits"
  ],

  body: `
## Visibility comes first

Segmentation, firewalls and VLANs from {{lesson:net-security}} reduce what an attacker or a mistake can reach. They do not tell you what is happening on the wire. Most plants cannot answer simple questions: how many controllers do we have, what firmware are they on, who talks to PLC1 at \`10.20.10.10\`, and did anything new appear on VLAN 10 last night? OT monitoring answers those questions without touching the controllers.

## Asset inventory

An {{term:ot-asset-inventory|asset inventory}} lists every controller, drive, I/O adapter, switch, server and HMI, with address, model, firmware, location and owner. CISA and partner agencies publish joint guidance on building one (linked below), and it underpins everything else: you patch what you know about, monitor what you know about and recover what you know about.

Three ways to build the list:

| Method | How | Strength | Risk |
|---|---|---|---|
| Manual | Walk the plant, read nameplates and the project files | Finds offline and unnetworked gear | Goes stale fast |
| Active scanning | Query devices with a scanner | Gets firmware and model detail | Can disturb fragile controllers. Use only with care and an approved method |
| {{term:passive-asset-discovery|Passive discovery}} | Listen to copied traffic | Zero load on devices | Sees only devices that are online and talking, and gives less detail |

A CISA paper on asset data notes exactly that last limit: passive monitoring only captures devices that are known and currently active, so it is paired with careful active collection to find quiet assets. Most plants combine all three.

## Getting the traffic: SPAN and TAP

Passive monitoring needs a copy of the traffic.

- A {{term:span-port|SPAN port}} (port mirror) tells a managed switch to copy chosen ports or VLANs to a monitor port. It is free but uses switch resources, can drop frames under load and can be awkward in complex networks, as an ISA article observes.
- A {{term:network-tap|network TAP}} is an inline hardware device that copies every frame without loading the switch. It costs money and needs a maintenance window to install, but it does not miss traffic.

Where to place it: the highest-value mirrors are the uplink of the control VLAN (10), the Level 3 servers (VLAN 30) and the DMZ (VLAN 250). The monitoring sensor lives on VLAN 99 (network management) with a mirror input that cannot send traffic back into the control network. The sensor only receives.

{{diagram:monitoring}}

## Baselining normal

A {{term:traffic-baseline|baseline}} records who normally talks to whom, over what protocol, how often and with which function codes. OT networks are unusually good for this because they are small and repetitive: the Ignition Gateway polls the PLCs on a fixed schedule, historians write on a fixed schedule, engineers connect from a short list of workstations. Vendors say mapping behavior can take weeks depending on how often devices communicate (Claroty, in its asset discovery article). CISA's Volt Typhoon advisory also tells operators to measure normal ICS operations and network traffic so anomalies can be judged.

> [!example] A Plant 1 baseline in plain language
> - \`10.20.30.10\` (Ignition master) talks to PLC1 \`10.20.10.10\` and PLC2 \`10.20.10.11\` on TCP 44818, reading continuously and writing occasionally.
> - \`10.20.30.20\` (SQL) receives from the Gateway on 1433 only.
> - Engineering workstations on VLAN 50 may connect to PLCs on 44818 during working hours.
> - Nothing on VLAN 10 initiates a connection to the Internet or to VLAN 20.

## What to alert on

Alerts people act on are few and specific. Start with these:

1. **A new device** on VLAN 10 (a new MAC or IP that is not in the inventory).
2. **A new conversation:** a host that never spoke to PLC1 starts connecting to port 44818 or 502.
3. **Unexpected writes.** A CIP write service or a Modbus write function code (05, 06, 15, 16) from a source that has never written. Reads are normal. A write from a laptop on VLAN 50 at 3 a.m. is not. See {{lesson:proto-enip}} and {{lesson:proto-modbus}}.
4. **Controller state changes:** a mode change to program, a firmware update command or a download.
5. **Scanning behavior:** one host touching many addresses.
6. **New protocols or ports** on a segment, for example RDP or SMB inside VLAN 10.

## OT IDS products

{{term:ot-ids|OT intrusion detection and monitoring}} is a product category. These tools parse industrial protocols, discover assets, learn baselines and flag threats from a SPAN or TAP feed. Examples include Claroty, Nozomi Networks, Dragos and Microsoft Defender for IoT. Naming them here is not an endorsement. Evaluate on protocol coverage for your equipment, passive deployment, integration with your SIEM and how alerts are tuned for plant staff, not security analysts. Free and open tools exist too, but the work of tuning them lands on you.

## Log sources beyond the sensor

Network sensing is one source. Collect these centrally, ideally to a syslog or SIEM server in the DMZ:

- **Switches:** link up/down, port security, configuration changes, MAC table changes.
- **Firewalls:** allowed and denied connections at each conduit, and administrator actions.
- **Windows hosts:** logons on the Gateway servers, jump host and engineering workstations.
- **Ignition:** the {{term:audit-log|audit log}}. In the Gateway, an audit profile (internal, database or remote) records events such as login, logout, user and role changes, certificate changes, backup restores and security zone changes. The 8.1 reference lists these and notes that unintended shutdowns are not recorded. Check the audit page for your version. Enable a gateway audit profile under Config, Security, General, and consider a remote or database profile so logs survive the Gateway.
- **Controllers:** mode changes and fault logs, where the model offers them.

Use {{lesson:net-timesync}} so timestamps from all these sources line up. A timeline with a 4-minute clock skew is nearly useless.

## One-way: data diodes at the Level 3 to 3.5 boundary

Plants with high security level targets under {{term:iec-62443|ISA/IEC 62443}} may want physical proof that nothing can flow from the business side back to the plant. A {{term:data-diode|data diode}} is hardware that permits traffic in one direction only, commonly built with a transmitter and a receiver and no return path. A unidirectional gateway adds software on both sides.

The common use is {{term:historian-replication|historian replication}}. A Waterfall submission to NIST says the single most common deployment is replicating historian servers from plant networks to business networks. The mechanism:

1. The Level 3 side software reads the historian (for example, queries the SQL server at \`10.20.30.20\`).
2. It sends the data one way over the hardware.
3. The receiving side rebuilds the data in a replica server, here the historian replica in the DMZ at \`10.20.250.20\`.
4. Enterprise users and the corporate Gateway query the replica. Nothing can write back through the diode.

Limits to understand: a diode cannot take part in a two-way TCP session, so vendors use proxy software that emulates the server on each side. The physical guarantee covers the data path only. The replica and the software on each side still need patching and monitoring. And two-way needs (remote access, commands from the enterprise) have to use other, more controlled paths such as the jump host at \`10.20.250.30\`.

The house pattern in {{lesson:net-security}} uses outgoing Gateway Network connections into the DMZ. That is a firewall-enforced design. A diode is the stronger option for zones where an organization's risk assessment sets a high target security level. Whether to pay for one is a risk decision, not a default.

## Tying it to 62443 and the house DMZ

In 62443 terms, the plant is a set of **zones**, and the traffic between them passes through **conduits**. The standard distinguishes target security levels (SL-T), set by risk assessment, capability levels (SL-C) of components and achieved levels (SL-A) of the running system. Monitoring is how you gather evidence that SL-A is meeting SL-T: a training outline from ISA lists monitoring (SIEM/IDS) and incident response among the activities that keep the achieved level on target. Place sensors at each conduit: Level 2 to 3 (VLAN 10 uplink), Level 3 to 3.5 (the DMZ firewall or diode) and 3.5 to 4.

## Incident response basics for OT

An {{term:ot-incident-response|OT incident response plan}} differs from IT's in one major way: shutting things down can be dangerous or expensive. Build the plan before you need it.

1. **Roles and contacts:** who decides, who is on call, how to reach the vendor and the safety lead.
2. **Detect and triage:** is it a real compromise or a misconfiguration? The baseline tells you.
3. **Contain with process safety first:** isolate at a conduit (disable the DMZ rule, disconnect the jump host or unplug the uplink) rather than powering down controllers. The process may need to keep running manually or go to a safe state under operations' control.
4. **Preserve evidence:** keep packet captures, logs and a copy of controller programs as found.
5. **Recover from known-good:** restore controller projects, Ignition backups and configurations from offline copies. See {{lesson:ign-versioning}}.
6. **Report and learn:** NIST SP 800-82 stresses tested recovery plans that restore the physical process safely, and CISA provides reporting channels in the U.S.

Practice with a tabletop exercise at least once.
`,

  eli5: `
Picture a factory as a small town. The town has roads (the network), houses (controllers and computers) and delivery trucks (messages). Security guards at the gates keep strangers out. But without a map of the town, a guard cannot say whether a new house just appeared overnight.

OT monitoring is a quiet person sitting on a hill with binoculars and a notebook. They never knock on doors, because some houses are fragile and would be startled. They only watch the traffic. After a few weeks they know which trucks go where, at what time. Then one night a truck from an unknown depot drives up to the pump house and drops off a package that tells the pump to do something. The watcher notices straight away because it never happened before.

A data diode is a one-way chute in the wall of the town. Postcards can slide out to the outside world, such as daily reports. Nothing can come back through the chute, no matter how hard someone pushes. People outside read the postcard copies instead of coming into town.
`,

  why: `
**Why passive instead of scanning?** Many controllers and drives were built on the assumption that the network is friendly. An unexpected scan can crash a communications stack or fault a controller. A mirror port costs the device nothing. The tradeoff is depth: passive sees what talks, not what sits silent, so serious programs combine it with careful, approved active collection and manual walk-downs.

**Why baseline instead of signatures alone?** OT traffic is repetitive. A new write from a new host is suspicious even if the packet itself is perfectly valid and matches no known attack. Signature-only tools miss that. But a baseline tool is only as good as its learning period: if the network was already compromised or misbehaving during learning, the baseline blesses the problem.

**Why argue about diodes?** Firewalls are software and policies, and can be misconfigured or exploited. A diode is physics, so a certain class of back-channel attack is off the table. Critics point out that it costs money, adds an operational component, needs proxying for anything interactive and does not stop an attacker who is already inside from sending data out or from using a different path such as a USB stick. Most plants reach for a firewall plus DMZ first, and use a diode where a regulator or a risk assessment requires it.

**Why collect Ignition's audit log?** The Gateway holds credentials, tag write paths and project changes. If an intruder or an insider changes a user role or a security zone, that is the first place the evidence appears. Logs kept only on the Gateway can be altered or lost with it, so send a copy elsewhere.

**Why plan incident response in advance?** In OT the first reflex, pulling the plug, can stop a process in an unsafe state. The plan decides in daylight, with operations and safety in the room, what containment looks like for each area.
`,

  history: `
The ISA/IEC 62443 series, written by the ISA99 committee and the IEC, supplies the zone, conduit and security level model that most OT security programs use. NIST's OT security guide (SP 800-82) covers monitoring, segmentation and incident response for industrial systems, and its Revision 3 is the current final edition at the time of writing. Unidirectional gateways pair one-way hardware with replication software, and vendors report historian replication as their most common deployment.
`,

  examples: [
    {
      title: "Catching an unexpected write",
      body: `The OT sensor on the VLAN 10 mirror sees a CIP write to PLC1 \`10.20.10.10\` from \`10.20.50.77\`, an engineering workstation that has only ever read. The alert fires. The on-call engineer checks the change log: a vendor tech was on site and used a laptop. It was approved but unrecorded. The finding leads to a rule: vendor work goes through the jump host at \`10.20.250.30\` and is logged.`
    },
    {
      title: "Historian replica through a diode",
      body: `Corporate wants Plant 1 production history. Instead of allowing corporate to query \`10.20.30.20\`, the plant installs a unidirectional gateway at the Level 3 to 3.5 boundary. Software on the plant side copies the history tables into the replica at \`10.20.250.20\`. Corporate analysts and the corporate Ignition Gateway read only the replica. Ask the vendor how the product handles a gap after a link outage.`
    }
  ],

  diagrams: {
    monitoring: `<svg viewBox="0 0 640 280" role="img" aria-label="A sensor receives mirrored traffic from the control VLAN switch; a unidirectional gateway sends historian data one way from Level 3 to a replica in the DMZ">
  <defs><marker id="net-ot-monitoring-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="30" width="130" height="50" rx="6"/>
  <text class="dg-text-sm" x="30" y="52">PLC1 .10.10</text>
  <text class="dg-text-muted" x="30" y="70">VLAN 10</text>
  <rect class="dg-box" x="20" y="100" width="130" height="50" rx="6"/>
  <text class="dg-text-sm" x="30" y="122">PLC2 .10.11</text>
  <text class="dg-text-muted" x="30" y="140">VLAN 10</text>
  <rect class="dg-box-accent" x="200" y="60" width="120" height="70" rx="6"/>
  <text class="dg-text dg-mid" x="260" y="88">Switch</text>
  <text class="dg-text-muted dg-mid" x="260" y="108">SPAN or TAP</text>
  <line class="dg-line" x1="150" y1="55" x2="198" y2="85" marker-end="url(#net-ot-monitoring-ah)"/>
  <line class="dg-line" x1="150" y1="125" x2="198" y2="105" marker-end="url(#net-ot-monitoring-ah)"/>
  <rect class="dg-box-ok" x="200" y="190" width="120" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="260" y="214">OT sensor</text>
  <text class="dg-text-muted dg-mid" x="260" y="234">receive only</text>
  <line class="dg-dash" x1="260" y1="130" x2="260" y2="188" marker-end="url(#net-ot-monitoring-ah)"/>
  <text class="dg-text-muted" x="270" y="164">mirror copy</text>
  <rect class="dg-box" x="370" y="30" width="110" height="60" rx="6"/>
  <text class="dg-text-sm" x="380" y="54">L3 historian</text>
  <text class="dg-text-muted" x="380" y="74">10.20.30.20</text>
  <rect class="dg-box-warn" x="500" y="30" width="120" height="60" rx="6"/>
  <text class="dg-text-sm" x="510" y="54">One-way gateway</text>
  <text class="dg-text-muted" x="510" y="74">TX to RX only</text>
  <line class="dg-line-accent" x1="480" y1="60" x2="498" y2="60" marker-end="url(#net-ot-monitoring-ah)"/>
  <rect class="dg-box" x="500" y="130" width="120" height="60" rx="6"/>
  <text class="dg-text-sm" x="510" y="154">Historian replica</text>
  <text class="dg-text-muted" x="510" y="174">10.20.250.20 DMZ</text>
  <line class="dg-line-accent" x1="560" y1="90" x2="560" y2="128" marker-end="url(#net-ot-monitoring-ah)"/>
  <text class="dg-text-muted" x="370" y="226">Corporate reads the replica.</text>
  <text class="dg-text-muted" x="370" y="244">Nothing flows back to Level 3.</text>
</svg>`
  },

  pitfalls: [
    "Running an active scanner across the control VLAN without an approved method, then faulting a controller.",
    "Letting the monitoring sensor's mirror port or management port bridge into the control network. Make the capture side receive-only.",
    "Training the baseline during an incident or a commissioning burst, so abnormal behavior is learned as normal.",
    "Alerting on everything. Start with new devices and unexpected writes, then tune.",
    "Keeping the only copy of the Ignition audit log on the Gateway server.",
    "Buying a diode and then adding a two-way side channel for convenience, which removes its value.",
    "Writing an incident plan that begins with 'shut down the PLCs.'"
  ],

  keyTerms: ["ot-ids", "passive-asset-discovery", "ot-asset-inventory", "traffic-baseline", "network-tap", "span-port", "data-diode", "historian-replication", "ot-incident-response", "iec-62443", "audit-log", "dmz"],

  quiz: [
    {
      q: "Why is passive discovery usually the first choice in an OT network?",
      options: ["It finds every device including powered-off ones", "It gives exact firmware versions for every device", "It replaces the need for an inventory", "It adds no load to fragile devices, at the cost of seeing only devices that are talking"],
      answer: 3,
      explain: [
        "Passive only sees devices that are active on the mirrored links.",
        "Detail depends on what appears in traffic, and passive often has less detail than active queries.",
        "Passive discovery feeds the inventory but does not replace maintaining it.",
        "Correct. Listening costs the devices nothing; combine with careful active methods or walk-downs for quiet assets."
      ]
    },
    {
      q: "Which event is the strongest candidate for a high-priority alert on the control VLAN?",
      options: ["PLC1 answering a read from the Ignition Gateway", "A CIP write to PLC1 from a host that has never written before", "The Gateway polling PLC2 every second", "A switch sending its normal keepalive"],
      answer: 1,
      explain: [
        "That is the baseline traffic.",
        "Correct. A new writer is a change in behavior and could alter the process.",
        "Regular polling is part of normal behavior.",
        "Normal housekeeping traffic is not an indicator."
      ]
    },
    {
      q: "A unidirectional gateway sits at the Level 3 to 3.5 boundary. What do corporate users query?",
      options: ["The Level 3 historian directly through the diode", "The PLCs, through a proxy", "A replica of the historian in the DMZ", "Nothing; replication is not possible"],
      answer: 2,
      explain: [
        "A diode cannot carry a two-way query session back to Level 3.",
        "Direct PLC access from the enterprise would break the zone model.",
        "Correct. Software copies data one way into a replica and users read the replica.",
        "Historian replication is the most common use of these gateways."
      ]
    },
    {
      q: "Which statement about SPAN ports and TAPs is accurate?",
      options: ["A TAP copies traffic with hardware and does not load the switch, while a SPAN uses switch resources", "A SPAN port never drops frames", "Both require the sensor to transmit on the control network", "A TAP changes IP addresses"],
      answer: 0,
      explain: [
        "Correct. TAPs are more reliable but cost money and need a maintenance window.",
        "SPAN can drop frames under load.",
        "The sensor's capture side should be receive-only.",
        "TAPs are passive copies and do not alter addresses."
      ]
    },
    {
      q: "A suspected compromise is found on the DMZ jump host. What is the most OT-appropriate first containment step?",
      options: ["Power down all PLCs immediately", "Delete the logs", "Isolate the jump host at the conduit (disable the rule or unplug the uplink) while operations keeps the process safe", "Reinstall Ignition"],
      answer: 2,
      explain: [
        "Stopping controllers can leave the process in an unsafe state.",
        "Deleting logs destroys evidence.",
        "Correct. Contain at the boundary, preserve evidence and let operations control the process.",
        "Reinstalling before preserving evidence loses information and does not address the cause."
      ]
    },
    {
      q: "In IEC 62443 terms, what does monitoring help you show?",
      options: ["That the achieved security level of zones and conduits matches the target", "That the target security level was set correctly", "That every device is certified", "That no incident can occur"],
      answer: 0,
      explain: [
        "Correct. Monitoring supplies evidence about SL-A against SL-T.",
        "The target comes from risk assessment, not from monitoring.",
        "Certification is a product property.",
        "Monitoring detects events but does not guarantee none occur."
      ]
    }
  ],

  resources: [
    { title: "Foundations for OT Cybersecurity: Asset Inventory Guidance (CISA and partners)", url: "https://www.cisa.gov/sites/default/files/2025-08/joint-guide-foundations-for-OT-cybersecurity-asset-inventory-guidance_508c.pdf", type: "standard", source: "CISA" },
    { title: "The Hunt for Deeper Level Asset Data and Why It Matters for Security", url: "https://www.cisa.gov/sites/default/files/2023-03/The%20Hunt%20for%20Deeper%20Level%20Asset%20Data%20and%20Why%20It%20Matters%20for%20Security%20508c_0.pdf", type: "article", source: "CISA" },
    { title: "Why Network Discovery is Critical in the ICS/IACS Environment", url: "https://gca.isa.org/blog/why-network-discovery-is-critical-in-the-ics/iacs-environment", type: "article", source: "ISA Global Cybersecurity Alliance" },
    { title: "A Practical Approach to Adopting the IEC 62443 Standards", url: "https://gca.isa.org/blog/a-practical-approach-to-adopting-the-iec-62443-standards", type: "article", source: "ISA Global Cybersecurity Alliance" },
    { title: "NIST SP 800-82 Rev. 3, Guide to Operational Technology (OT) Security", url: "https://csrc.nist.gov/pubs/sp/800/82/r3/final", type: "standard", source: "NIST" },
    { title: "Data Diode and Unidirectional Gateways", url: "https://waterfall-security.com/data-diode-and-unidirectional-gateways/", type: "article", source: "Waterfall Security Solutions (vendor)" },
    { title: "OT Asset Discovery: 5 Steps to Gain Visibility for Your Network Assets", url: "https://claroty.com/blog/ot-asset-discovery", type: "article", source: "Claroty (vendor)" },
    { title: "Audit Log and Profiles (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/audit-log-and-profiles", type: "docs", source: "Inductive Automation" }
  ]
});
