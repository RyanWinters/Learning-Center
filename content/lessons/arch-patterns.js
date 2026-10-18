LC.lesson({
  id: "arch-patterns",
  title: "Architectures: standard, scale-out, hub-and-spoke, cloud",
  track: "arch",
  minutes: 15,
  level: 3,
  prereqs: ["arch-gateway-network"],
  tags: ["architecture", "scale-out", "hub-and-spoke", "cloud", "design", "mqtt"],
  summary: "Inductive Automation's published patterns for laying out Gateways, and the questions that tell you which one to use.",
  objectives: [
    "Describe the standard, scale-out, hub-and-spoke and cloud/hybrid patterns and draw each one",
    "Name which Gateway does what in a scale-out design (back-end, front-end, load balancer)",
    "Explain why hub-and-spoke tolerates bad links and what each spoke keeps working on its own",
    "Choose a pattern from site count, link quality, client load and tag count",
    "State the tradeoffs of splitting a system, including what you give up"
  ],

  body: `
## Start with one Gateway

Ignition licenses by Gateway and by module, not by tag count, and the standard platform has no per-client fee. Some products and some older or special license types do carry session or client caps, so check what your contract says (see {{lesson:ign-licensing}}). A single {{term:ignition|Ignition}} Gateway on decent hardware can do a surprising amount, so the default question is not "which architecture?" but "what forces me off one box?" Inductive Automation (IA) publishes a set of reference patterns for the cases where one Gateway is not enough. This lesson covers each, when it fits, and what it costs.

## Pattern 1: Standard

One on-premise Gateway does everything: talks to the PLCs, logs history to a SQL database, runs alarming and serves all clients. The database is usually a separate server or at least a separate service.

{{diagram:standard}}

This is where almost every project should start. It is simple to back up, simple to secure and simple to debug. The limit is hardware, not the licence. IA's Server Sizing and Architecture Guide gives example benchmark tiers for a single Gateway, and the numbers depend on device count, tag subscriptions, history change rate and client count. {{lesson:ign-licensing}} summarizes the tiers. As a rule of thumb used in this track, a single well-sized Gateway is the default up to roughly the upper tier of that guide (on the order of 100,000 tags and 50 to 100 clients). That is the author's reading, not an IA limit. Treat it as a starting point to test against, and check the current guide before quoting any figure to a customer.

If uptime matters, you add {{lesson:arch-redundancy}} to this pattern. A redundant pair is still the standard pattern.

## Pattern 2: Scale-out

Scale-out splits one site's work across several Gateways joined by the {{lesson:arch-gateway-network}}.

{{diagram:scaleout}}

| Role | Does | Scales by |
|---|---|---|
| **Back-end (I/O) Gateways** | Talk to PLCs and devices, own the tag providers, run historian and alarming | Adding Gateways as devices or tag counts grow |
| **Front-end (visualization) Gateways** | Serve Perspective sessions or Vision clients, read tags through remote tag providers | Adding Gateways as concurrent clients grow |
| **Load balancer** | Spreads new client sessions across front-ends and pins each client to the one that owns its session | Sits in front of the front-end group |

Each front-end sees back-end tags through a {{term:remote-tag-provider|remote tag provider}}, so screens bind to the same tag paths whichever Gateway they run on. A Perspective session lives in memory on the one front-end Gateway that owns it, so the load balancer must pin each client to that front-end (session affinity, also called sticky sessions). The manual's scale-out pages do not cover load-balancer settings, so configure sticky sessions per your load balancer's documentation. If a front-end fails, the sessions on it are lost: clients reconnect through the load balancer to another front-end and start new sessions, and any unsaved page state is gone. What should be identical on every front-end is configuration (projects, tag provider connections, security), which is why teams manage the group with {{lesson:arch-eam}} or the same project sources. The IA guide gives example sizes for large scale-out systems. Read those as illustrations of the shape, not guarantees.

**Why split I/O from visualization?** The two workloads load the machine differently. Device polling is steady and memory heavy. Client sessions are spiky and tied to people. Separating them means a rush of operators logging in does not slow data collection.

**What you give up.** More servers to patch, more links to monitor, and a dependency: if a back-end drops, every front-end screen that uses it goes bad quality. That is why scale-out designs often use {{lesson:arch-eam}} to manage the fleet.

## Pattern 3: Hub-and-spoke

Hub-and-spoke is for several sites that are geographically separate or connected over unreliable links.

{{diagram:hubspoke}}

Each **spoke** is a complete Gateway at its site. It talks to local devices, logs to local history, raises its own alarms and serves its own operators. The **hub** gathers what headquarters needs. In IA's current guidance the hub is a cloud-hosted Gateway (Cloud Edition) running Perspective, with MQTT and a cloud database. Older guides describe a hub with Vision and Reporting modules and a database server. Both are the same idea. Spokes may be full Gateways or {{lesson:arch-edge}}.

The key property is independence. If the WAN drops, the site keeps running, because it never depended on the hub for control or local visualization. When the link returns, store-and-forward and MQTT session handling catch the hub up (see {{lesson:arch-remote-services}} for what that does and does not cover).

Spokes reach the hub in one of two ways:

- **Gateway Network**: remote tag providers, remote history, remote alarm journals. Everything is Ignition to Ignition and works with no extra modules, but the two sides are tightly coupled.
- **MQTT / Sparkplug**: spokes publish to a broker and the hub subscribes ({{lesson:proto-sparkplug}}). It decouples the sides and handles many sites well. It needs the Cirrus Link modules. See {{lesson:arch-mqtt}}.

## Pattern 4: Cloud and hybrid

The hybrid pattern keeps control and local HMI on premises and puts the enterprise layer in the cloud. The on-premise Gateways are the same standard or spoke Gateways as above. The cloud side hosts analytics, a historian copy, Perspective for remote users, and sometimes the MQTT broker. The data flows up. Writes to the plant come down only if you deliberately allow it, and control stays local. For deployment mechanics, see {{lesson:arch-containers}}.

## Choosing a pattern

| Situation | Reach for |
|---|---|
| One site that fits the single-gateway tiers in IA's sizing guide (rule of thumb above) | Standard, plus redundancy if downtime is costly |
| One very large site, many devices, hundreds of clients | Scale-out |
| Many sites, WAN links that can fail | Hub-and-spoke |
| Executives or partners need global views | Hub-and-spoke with a cloud hub |
| Local control must never depend on the cloud | Any pattern, with the plant Gateway doing the control |

> [!example] A worked decision
> A food company has 12 plants, each with about 8,000 tags and 15 operators, on a mix of fibre and LTE. Each plant needs to keep running during a WAN outage. Headquarters wants one OEE dashboard. One Gateway easily covers each plant, so the site pattern is standard, and the multi-site pattern is hub-and-spoke: 12 spokes sending data to one hub. Scale-out inside any plant would be over-engineering. Add redundancy only at the two plants where an hour of downtime costs six figures.

## When to split, and when not to

Split when you have a reason you can name: device count, concurrent clients, geography, network reliability, a security boundary (for example, a DMZ Gateway) or an organizational one (different teams own different plants). Do not split for a reason like "it feels more enterprise." Every extra Gateway is another thing to license, patch, back up, secure and troubleshoot.
`,

  eli5: `
Think about running a pizza shop.

One kitchen and one counter handles a small shop. That's the standard setup. Business grows, and the kitchen gets crowded.

You could build a bigger operation in the same building: one team only makes pizzas (the back), another team only takes orders and talks to customers (the front). If more customers show up, you add counter staff. If you add more ovens, you add cooks. That's scale-out.

Now imagine twelve shops in twelve towns. Each shop has its own kitchen and its own counter so it can keep selling pizza even if the phone line to head office goes down. Head office just collects the daily numbers. That's hub-and-spoke.

If head office keeps its records in a big rented warehouse instead of its own building, that's the cloud version.

You don't pick the biggest setup first. You start with one shop and only add more when something actually stops working.
`,

  why: `
**Why start with standard?** Because the cost of a split is paid forever, and the benefit only exists if you needed it. A single well-sized Gateway has fewer failure modes and one place to look when something breaks. Experienced integrators ask for evidence (tag count, device count, session count, a latency requirement) before they draw a second box.

**Why keep control local?** The cardinal rule in hub-and-spoke and cloud designs is that the plant must not need the WAN to run. If a spoke needs the hub to start a pump, a fibre cut becomes a production outage. Local Gateway, local history buffer, local alarm pipeline. The hub is for visibility and analytics.

**Why the load balancer must pin clients.** A Perspective session lives on the front-end Gateway that created it. If the load balancer sent a client's next request to a different front-end, that front-end would know nothing about the session. So the balancer keeps each client on one front-end (session affinity). The price is that a front-end failure drops its sessions: users reconnect to another front-end and lose in-flight state. That is why the front-ends are kept as interchangeable as possible. Configuration is identical on each, and anything that must survive lives in the back-end, the tag providers or the database, never in front-end-only tags or scripts.

**Gateway Network or MQTT between sites?** This is a live argument. The Gateway Network is quick to set up, and gives you tag semantics and history forwarding for free. MQTT scales to many more sites, decouples versions and vendors, and fits a unified namespace. Many designs use both: Gateway Network inside a site (scale-out), MQTT between sites.

**The cost of too many Gateways.** Fleet sprawl is the real failure of over-splitting. Twenty Gateways that each need patching, backups and certificate approvals is why {{lesson:arch-eam}} exists. Plan the operations story at the same time as the architecture.
`,

  history: `
IA's reference architectures have been published for years as a standard, a scale-out and a hub-and-spoke diagram, along with enterprise and cloud variants. The older hub-and-spoke papers put Vision and Reporting at the hub. More recent guidance shows a Cloud Edition hub with Perspective and MQTT. The patterns stayed stable while the technologies filling the boxes changed.
`,

  examples: [
    {
      title: "Sizing a scale-out split",
      body: `A refinery site has 180 devices and about 220,000 tags, with 120 operators. One Gateway would be above IA's single-server example tiers. You choose two back-end Gateways (about 90 devices each) and two front-ends behind a load balancer. Screens use tag paths like \`[unit1]Pumps/P101/Speed\`, where \`unit1\` is a remote tag provider on the back-end. Test before committing: simulate the client load against the front-ends and watch CPU and memory on all four boxes.`
    },
    {
      title: "Hub-and-spoke failure drill",
      body: `You unplug a spoke's WAN for two hours. The spoke keeps running: operators see live data, alarms notify locally, history buffers to disk through store-and-forward. The hub shows the spoke's tags as bad quality or stale for two hours. When the link returns, buffered history fills the gap. Alarm journal events and any live-only values need a separate check, which is why you run this drill before go-live.`
    }
  ],

  diagrams: {
    standard: `<svg viewBox="0 0 640 220" role="img" aria-label="Standard architecture: one gateway connects PLCs, a SQL database and clients">
  <defs><marker id="arch-patterns-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="30" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="60">PLCs / devices</text>
  <rect class="dg-box" x="20" y="130" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="160">SQL database</text>
  <rect class="dg-box-accent" x="240" y="60" width="160" height="90" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="95">One gateway</text>
  <text class="dg-text-muted dg-mid" x="320" y="115">tags, history,</text>
  <text class="dg-text-muted dg-mid" x="320" y="132">alarms, clients</text>
  <rect class="dg-box" x="490" y="30" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="555" y="60">Operators</text>
  <rect class="dg-box" x="490" y="130" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="555" y="160">Designer, mobile</text>
  <path class="dg-line" d="M150 55 L240 90" marker-end="url(#arch-patterns-ah)"/>
  <path class="dg-line" d="M240 125 L150 155" marker-end="url(#arch-patterns-ah)"/>
  <path class="dg-line" d="M490 55 L400 90" marker-end="url(#arch-patterns-ah)"/>
  <path class="dg-line" d="M490 155 L400 125" marker-end="url(#arch-patterns-ah)"/>
</svg>`,
    scaleout: `<svg viewBox="0 0 640 330" role="img" aria-label="Scale-out architecture: clients go through a load balancer to front-end gateways, which reach back-end I/O gateways over the Gateway Network; back-ends talk to PLCs and the database">
  <defs><marker id="arch-patterns-ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="240" y="14" width="160" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="39">Clients (Perspective)</text>
  <rect class="dg-box-2" x="240" y="76" width="160" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="101">Load balancer (sticky)</text>
  <rect class="dg-box-accent" x="110" y="144" width="170" height="52" rx="6"/>
  <text class="dg-text-sm dg-mid" x="195" y="166">Front-end gateway 1</text>
  <text class="dg-text-muted dg-mid" x="195" y="184">owns its sessions</text>
  <rect class="dg-box-accent" x="360" y="144" width="170" height="52" rx="6"/>
  <text class="dg-text-sm dg-mid" x="445" y="166">Front-end gateway 2</text>
  <text class="dg-text-muted dg-mid" x="445" y="184">owns its sessions</text>
  <rect class="dg-box" x="110" y="238" width="170" height="52" rx="6"/>
  <text class="dg-text-sm dg-mid" x="195" y="260">Back-end gateway A</text>
  <text class="dg-text-muted dg-mid" x="195" y="278">devices, tags, history</text>
  <rect class="dg-box" x="360" y="238" width="170" height="52" rx="6"/>
  <text class="dg-text-sm dg-mid" x="445" y="260">Back-end gateway B</text>
  <text class="dg-text-muted dg-mid" x="445" y="278">devices, tags, history</text>
  <path class="dg-line" d="M320 54 L320 76" marker-end="url(#arch-patterns-ah2)"/>
  <path class="dg-line" d="M290 116 L215 144" marker-end="url(#arch-patterns-ah2)"/>
  <path class="dg-line" d="M350 116 L425 144" marker-end="url(#arch-patterns-ah2)"/>
  <path class="dg-line-accent" d="M195 196 L195 238"/>
  <path class="dg-line-accent" d="M215 196 L420 238"/>
  <path class="dg-line-accent" d="M445 196 L445 238"/>
  <path class="dg-line-accent" d="M425 196 L220 238"/>
  <text class="dg-text-muted" x="20" y="222">Gateway Network</text>
  <text class="dg-text-muted" x="20" y="240">remote tag providers</text>
  <text class="dg-text-muted" x="548" y="268">PLCs, SQL</text>
  <text class="dg-text-muted" x="20" y="316">Back-ends scale with devices; front-ends scale with sessions.</text>
</svg>`,
    hubspoke: `<svg viewBox="0 0 640 300" role="img" aria-label="Hub-and-spoke architecture: three plant gateways each run independently and send data over the WAN to a hub gateway that provides enterprise views">
  <defs><marker id="arch-patterns-ah3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="210" y="20" width="220" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="48">Hub gateway</text>
  <text class="dg-text-muted dg-mid" x="320" y="68">enterprise views, MQTT / DB</text>
  <rect class="dg-box" x="20" y="190" width="170" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="105" y="215">Spoke: Plant A</text>
  <text class="dg-text-muted dg-mid" x="105" y="235">local HMI, history, alarms</text>
  <rect class="dg-box" x="235" y="190" width="170" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="215">Spoke: Plant B</text>
  <text class="dg-text-muted dg-mid" x="320" y="235">local HMI, history, alarms</text>
  <rect class="dg-box" x="450" y="190" width="170" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="535" y="215">Spoke: Plant C</text>
  <text class="dg-text-muted dg-mid" x="535" y="235">local HMI, history, alarms</text>
  <path class="dg-line-accent" d="M105 190 L260 90" marker-end="url(#arch-patterns-ah3)"/>
  <path class="dg-line-accent" d="M320 190 L320 90" marker-end="url(#arch-patterns-ah3)"/>
  <path class="dg-dash" d="M535 190 L380 90"/>
  <text class="dg-text-muted" x="400" y="150">WAN down</text>
  <text class="dg-text-muted" x="400" y="168">spoke keeps running</text>
  <text class="dg-text-muted dg-mid" x="320" y="285">Each spoke is fully independent. Only the data flows up.</text>
</svg>`
  },

  pitfalls: [
    "Splitting into scale-out before measuring. One properly sized Gateway often covers it.",
    "Using hub-and-spoke but letting spokes depend on the hub for local control or login.",
    "Running a scale-out front-end group without session affinity on the load balancer, or keeping front-end-only tags and state that users expect to survive a failover.",
    "Quoting IA's example sizing numbers as guarantees. They are benchmarks that depend on history rates and device mix.",
    "Designing the architecture with no plan to patch, back up and license the extra Gateways.",
    "Forgetting the database is a single point of failure in every one of these patterns."
  ],

  keyTerms: ["standard-architecture", "scale-out-architecture", "back-end-gateway", "front-end-gateway", "hub-and-spoke", "load-balancer", "cloud-edition", "remote-tag-provider", "mqtt", "sparkplug"],

  quiz: [
    {
      q: "A single plant has 90 operators, 40 devices and 60,000 tags, and operators are happy with performance. A colleague proposes scale-out. What is the best response?",
      options: [
        "Agree, scale-out is always more reliable",
        "Stay with a standard Gateway (plus redundancy if needed) until a measured limit forces a split",
        "Switch to hub-and-spoke with a cloud hub",
        "Split the tags into one Gateway per device"
      ],
      answer: 1,
      explain: [
        "Scale-out adds servers and links, which adds failure points and work. It is not inherently more reliable.",
        "Correct. Ignition licenses per server, so one Gateway is the simplest design until a number says otherwise.",
        "Hub-and-spoke solves multi-site and unreliable-link problems, which this single plant does not have.",
        "A Gateway per device multiplies operations work for no benefit."
      ]
    },
    {
      q: "In a scale-out design, what runs on the back-end Gateways?",
      options: [
        "Device connections, tag providers, history and alarming",
        "Perspective sessions for operators",
        "The load balancer",
        "Only the SQL database"
      ],
      answer: 0,
      explain: [
        "Correct. Back-ends own the I/O and the tag providers. Front-ends read those through remote tag providers.",
        "Sessions run on front-end Gateways, which is the point of the split.",
        "The load balancer is a separate network component in front of the front-ends.",
        "The database is a separate service, not a Gateway role."
      ]
    },
    {
      q: "A site on an unreliable satellite link must keep running when the link drops. Which pattern fits?",
      options: [
        "Scale-out with the front-end at headquarters",
        "Standard, with the only Gateway at headquarters",
        "A cloud Gateway that reads the PLC directly",
        "Hub-and-spoke with a complete Gateway at the site"
      ],
      answer: 3,
      explain: [
        "A remote front-end would lose its back-end data when the link fails, so site operators would be blind.",
        "Operators at the site would lose everything when the link drops.",
        "Direct PLC access from the cloud over an unreliable link is the worst case.",
        "Correct. A full local Gateway keeps control, HMI, alarms and history buffering working while disconnected."
      ]
    },
    {
      q: "Why must the load balancer in front of scale-out front-ends use session affinity, and what happens when a front-end fails?",
      options: [
        "Front-ends cannot store files, so each user needs a dedicated one",
        "The licence forbids moving a user between front-ends",
        "A Perspective session lives on one front-end, so the client must stay pinned to it. If that front-end fails, its sessions are lost and clients reconnect to another",
        "Sessions are replicated to every front-end, so affinity only improves speed"
      ],
      answer: 2,
      explain: [
        "Front-ends can store files. The issue is where the session state lives.",
        "Licensing is not the reason.",
        "Correct. Session state is held in memory on the owning front-end. Failover means new sessions on a surviving front-end and loss of in-flight state.",
        "Sessions are not replicated across front-ends. Without affinity a request could reach a Gateway that does not know the session."
      ]
    },
    {
      q: "You manage 15 sites and want the sites decoupled from the hub's Ignition version and from each other. Which link between sites and hub is the usual choice?",
      options: [
        "MQTT with Sparkplug",
        "Remote tag providers over the Gateway Network",
        "A shared Vision client",
        "Direct OPC DA over the WAN"
      ],
      answer: 0,
      explain: [
        "Correct. MQTT decouples publisher and subscriber and scales to many sites, which is why it is common for hub-and-spoke.",
        "This works and is simple, but couples the Gateways more tightly, which is the opposite of the goal here.",
        "Clients do not link Gateways.",
        "OPC DA relies on DCOM and does not belong on a WAN."
      ]
    },
    {
      q: "Which statement about IA's published sizing numbers is the most accurate?",
      options: [
        "They are guaranteed limits for any project",
        "They are example benchmarks that depend on device mix, history change rate and client count",
        "They apply only to Ignition Edge",
        "They replace the need for load testing"
      ],
      answer: 1,
      explain: [
        "IA states the numbers depend on the workload, so they are not guarantees.",
        "Correct. Use them as a starting point and test your own workload.",
        "The guide covers standard and cloud tiers, not only Edge.",
        "Testing is still the way to confirm a design."
      ]
    }
  ],

  resources: [
    { title: "A SCADA Architecture for Every Industrial Need", url: "https://inductiveautomation.com/ignition/architectures", type: "article", source: "Inductive Automation" },
    { title: "Ignition Server Sizing & SCADA Architecture Guide", url: "https://inductiveautomation.com/resources/article/ignition-server-sizing-and-architecture-guide", type: "article", source: "Inductive Automation" },
    { title: "Scale-Out Architecture Guide (8.3)", url: "https://docs.inductiveautomation.com/docs/8.3/tutorials/tutorials-and-helpful-tricks/scale-out-architecture-guide", type: "docs", source: "Inductive Automation" },
    { title: "Scale Out Architecture (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/system-architectures/scale-out-architecture", type: "docs", source: "Inductive Automation" },
    { title: "Enterprise Architecture (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/system-architectures/enterprise-architecture", type: "docs", source: "Inductive Automation" },
    { title: "Choose Your Ignition Architecture And Scale With Confidence", url: "https://inductiveautomation.com/blog/choose-your-ignition-architecture-and-scale-with-confidence", type: "article", source: "Inductive Automation" },
    { title: "Design Like a Pro: How to Pick the Right System Architecture", url: "https://inductiveautomation.com/resources/webinar/design-like-a-pro-how-to-pick-the-right-system-architecture", type: "video", source: "Inductive Automation" },
    { title: "Ignition System Architectures (transcript)", url: "https://inductiveuniversity.com/videos/transcript/ignition-system-architectures", type: "video", source: "Inductive University" }
  ]
});
