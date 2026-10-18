LC.lesson({
  id: "arch-edge",
  title: "Ignition Edge",
  track: "arch",
  minutes: 20,
  level: 3,
  prereqs: ["arch-patterns"],
  tags: ["edge", "oem", "sync-services", "store-and-forward", "licensing"],
  summary: "A small, cheap Ignition for the machine or remote site, built to collect data locally and push it to a central gateway.",
  objectives: [
    "Name the two current Ignition Edge editions and what each includes",
    "Explain what Sync Services does and what happens during a network outage",
    "Choose between Edge and a full Ignition Gateway for a given site",
    "Describe an OEM panel design and a remote-site design using Edge",
    "List the restrictions that make Edge unsuitable as a central server"
  ],

  body: `
## What Edge is

{{term:ignition-edge|Ignition Edge}} is a restricted edition of Ignition sold for the edge of the network: one machine, one skid, one pump station, one remote site. It runs the same core platform as a full gateway, so the skills carry over, but it is priced and limited for small installations. You buy one Edge gateway per site or per machine, and a full gateway sits upstream to collect everything.

The pattern that matters for an integrator is simple. Put a small, cheap node next to the equipment. Let it talk to the PLC locally, keep a short buffer of history, and forward data to a central gateway when the network allows. That is the "spoke" in the hub-and-spoke architectures in {{lesson:arch-patterns}}.

{{diagram:spoke}}

## Editions as currently sold

Inductive Automation's current structure has two editions. Naming has changed over the years, so check the pricing page before quoting anything to a customer.

| Edition | Local visualization | What it is for |
|---|---|---|
| **Edge IIoT** | None | Headless data collection: connect to devices, store local history, publish with MQTT, forward with Sync Services |
| **Edge Panel** | Yes (Perspective or Vision, with small session limits) | A machine-side HMI that is also an edge data node |

Per the 8.1.33 and later documentation, both editions include the capabilities that used to be sold as separate Edge products: **Compute** (scripting and logic on the edge), **Sync Services** and **EAM** (managing many gateways from one place, see {{lesson:arch-eam}}). Older material that lists Edge Compute, Edge EAM and Edge Sync Services as separate purchases describes the pre-8.1.33 packaging.

## Limits to know

The manual is the source of truth here, and limits have moved between releases. Check the [Ignition Edge page of the manual](https://docs.inductiveautomation.com/docs/8.3/other-editions/ignition-edge) for your version before you quote any of these:

- **Tags and devices:** Edge is not capped the way early Edge products were (an older two-device limit is gone), but the drivers and modules included depend on the edition.
- **Panel visualization:** Panel allows only a small number of Perspective sessions or Vision clients (see {{lesson:ign-licensing}}). Panel is a machine HMI, not a plant-wide screen server.
- **Local history:** the Edge gateway keeps a limited window of tag history, alarm journal and audit log locally. That window has been extended between releases, so older notes are out of date. Verify the current window in the manual for your version.
- **No database connectivity, and only the modules each edition includes.** You cannot run Reporting, SFC, the SQL Bridge module or Event Streams on Edge. Edge ships with a fixed set of included modules and features, so you cannot add arbitrary modules the way you can on a standard gateway. Edge is also a spoke: it is not the central hub other gateways connect to for management or history.

> [!warning] Edge is a spoke, not a server
> If a design needs SQL databases, Reporting, more than a few client sessions or modules the Edge edition does not include at the site, you need a standard gateway there. Edge is the wrong tool, however cheap it looks.

## Sync Services and store-and-forward

{{term:sync-services|Sync Services}} connects the Edge gateway to a central gateway over the Gateway Network (see {{lesson:arch-gateway-network}}). It exposes the Edge tag provider, tag history and alarms to the central gateway, and keeps working during outages. While the link is down the Edge gateway stores history and alarm events locally. When the link returns, the data backfills into the central historian and journal. The buffer is bounded by the local retention window, so a very long outage can still lose the oldest data.

Edge IIoT can also act as an MQTT edge node, publishing Sparkplug to a broker instead of to a gateway. This is the one case where an MQTT module runs on Edge: the publishing side (MQTT Transmission). The subscribing side (MQTT Engine) belongs on the hub gateway. Confirm on the Edge edition page which MQTT capability your edition includes and whether it is licensed separately. That route is covered in {{lesson:arch-mqtt}}.

## When Edge is the right answer

1. **OEM machines.** The machine builder ships a PLC, a panel and an Edge Panel gateway on a DIN-rail or panel PC. The customer gets a local HMI that works with no network, and the builder gets a standard way to deliver remote data to the customer's central Ignition.
2. **Remote sites.** Pump stations, wells and substations behind cellular links. A site gateway polls the local PLCs at full rate on its fast LAN, then forwards on its own schedule over the slow, unreliable link. See {{lesson:net-wireless}}.
3. **Protocol and edge compute.** An Edge IIoT node next to old equipment can convert Modbus or other protocol data into a clean tag provider or Sparkplug stream, and run scripts to clean it first.

A full gateway is better when the site needs a plant historian, reports, a database, many operators or modules like SFC.

> [!example] Fifty pump stations
> A water utility has 50 stations, each with one PLC and a cellular modem. Each gets an Edge IIoT gateway (no screen needed). Each polls its PLC every second and keeps local history. Sync Services forwards to a central gateway in the control room, where operators see all 50 as remote tag providers. When a station's cell link drops for four hours, the Edge node keeps logging, and the central historian fills the gap when the link returns. Licensing is 50 Edge licenses plus one standard gateway, not 51 standard gateways (check current prices and edition terms with Inductive Automation).

## Design checks

- Decide the retention you need during an outage. Compare it with the Edge local window and your worst-case outage.
- Plan for management. Fifty gateways without {{lesson:arch-eam}} means fifty manual backups and upgrades.
- Protect the link. Edge talks to the hub over the Gateway Network or MQTT, so firewall rules and certificates matter. See {{lesson:net-security}}.
`,

  eli5: `
Imagine a chain of lemonade stands, plus one head office. The head office wants to know how many cups every stand sells, but it would be silly to build a full office at every stand. So each stand gets a small notebook and a cheap pencil.

Each stand writes down every sale as it happens. When the phone line to head office works, it reads out the numbers. When the line is down, the stand just keeps writing. When the line comes back, it reads out everything it missed, in order, so head office has the whole story.

The small notebook can't do everything the head office's big computer can. It can't print fancy reports, and it only holds a few weeks of notes. But that's fine, because that isn't its job. Its job is to be cheap, to sit right next to the lemonade, and to never lose count.
`,

  why: `
**Why not a full gateway at every site?** Cost and sprawl. A standard gateway at 50 or 500 sites multiplies licensing, patching and backups. Edge gives you the same platform for a fraction of the price, with limits that stop anyone from turning a spoke into a second server. The limits are a feature: they keep the architecture honest.

**Why poll locally and forward?** Polling a PLC across a cellular link wastes bandwidth and breaks when the link drops. Polling over a local LAN, then sending changes upstream, means the link only carries results. Local polling also means the data has the right timestamp. That timestamp comes from the Edge node, not from whenever the central server managed to reach the site.

**Why store-and-forward matters.** Without it, a network outage becomes a hole in your history and, for some customers, in your compliance records. With it, an outage is only a delay. The tradeoff is that the buffer is finite, so you size it against your worst realistic outage and test it by pulling the cable.

**What integrators argue about.** Edge Panel versus a small standard gateway on an industrial PC is a common debate. Edge wins on price and simplicity for one machine. A standard gateway wins when the customer later wants a database, reports or a few more clients, because upgrading an Edge deployment into a standard one means re-licensing and migrating. Ask about growth before you quote.
`,

  history: `
Edge started as a way to put Ignition on small machine-side and remote hardware. Around Ignition 8.0.10 the family was reorganized into separate editions, with products such as Edge Panel, Edge IIoT, Edge Compute, Edge EAM and Edge Sync Services. From 8.1.33 the Compute, EAM and Sync Services capabilities were bundled into the two remaining editions, IIoT and Panel. Limits such as the local history window have been raised between releases, so check the documentation for your exact version.
`,

  examples: [
    {
      title: "OEM packaging machine",
      body: `A packaging machine builder ships every machine with a CompactLogix PLC and a panel PC running Edge Panel with a Perspective HMI. The operator screen works with no network. Sync Services forwards counts and alarms to the customer's central Ignition Gateway when the machine is connected, so the builder can offer the same screens remotely without reprogramming for each customer.`
    },
    {
      title: "Sizing the outage buffer",
      body: `A remote lift station loses cellular service for up to 3 days a few times a year. Check whether the Edge gateway's local history window for your version covers 3 days. If it does, Sync Services will backfill the gap. If the site needed to survive 60 days offline, Edge would not be enough, and you would put a standard gateway with a database there.`
    }
  ],

  diagrams: {
    spoke: `<svg viewBox="0 0 640 260" role="img" aria-label="Three sites each with a PLC and an Edge gateway forward data over Sync Services to a central Ignition Gateway">
  <defs><marker id="arch-edge-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="220" y="20" width="200" height="56" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="46">Central gateway</text>
  <text class="dg-text-sm dg-mid" x="320" y="64">history, reports, database</text>
  <rect class="dg-box" x="20" y="170" width="150" height="56" rx="6"/>
  <text class="dg-text dg-mid" x="95" y="194">Edge Panel</text>
  <text class="dg-text-sm dg-mid" x="95" y="212">Machine A + HMI</text>
  <rect class="dg-box" x="245" y="170" width="150" height="56" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="194">Edge IIoT</text>
  <text class="dg-text-sm dg-mid" x="320" y="212">Pump station</text>
  <rect class="dg-box" x="470" y="170" width="150" height="56" rx="6"/>
  <text class="dg-text dg-mid" x="545" y="194">Edge IIoT</text>
  <text class="dg-text-sm dg-mid" x="545" y="212">Remote well</text>
  <line class="dg-line" x1="95" y1="170" x2="240" y2="78" marker-end="url(#arch-edge-ah)"/>
  <line class="dg-line" x1="320" y1="170" x2="320" y2="80" marker-end="url(#arch-edge-ah)"/>
  <line class="dg-line" x1="545" y1="170" x2="400" y2="78" marker-end="url(#arch-edge-ah)"/>
  <text class="dg-text-muted dg-mid" x="320" y="250">Sync Services: live data, plus backfill after an outage</text>
</svg>`
  },

  pitfalls: [
    "Quoting an Edge license for a site that needs a database, Reporting, SFC, Event Streams or modules the edition does not include.",
    "Assuming the local history window covers any outage. It is finite, so size it against the worst case.",
    "Quoting old Edge product names and prices. Compute, EAM and Sync Services are bundled into current editions.",
    "Forgetting to manage dozens of Edge gateways as a fleet, then hand-patching each one.",
    "Skipping a real outage test. Pull the network cable for an hour and check the backfill."
  ],

  keyTerms: ["ignition-edge", "sync-services", "oem", "historian", "mqtt-store-forward", "edge-node"],

  quiz: [
    {
      q: "A water utility wants 50 unattended pump stations to log locally and forward history to the control room. No local screens are needed. Which fits best?",
      options: ["A standard gateway with SQL at every station", "A Vision client at each station", "An Edge IIoT gateway at every station using Sync Services", "Edge Panel with Vision at each station"],
      answer: 2,
      explain: [
        "That works but multiplies cost and maintenance for needs Edge already covers.",
        "Vision clients are screens, and there are no operators at these sites.",
        "Correct. Headless data collection with store-and-forward is exactly the Edge IIoT use case.",
        "Panel adds visualization the sites don't need, so it costs more for nothing."
      ]
    },
    {
      q: "What does Sync Services do when the link to the central gateway drops?",
      options: ["Stops the Edge gateway until the link returns", "Moves the data to a SQL database on the Edge gateway", "Sends everything again in real time at the old timestamps", "Keeps storing history and alarms locally, then backfills when the link returns"],
      answer: 3,
      explain: [
        "The Edge gateway keeps running locally.",
        "Edge has no database connectivity.",
        "Timestamps are kept, but data is backfilled from the buffer, not replayed as live.",
        "Correct. Data is buffered locally and backfilled, within the local retention limit."
      ]
    },
    {
      q: "A customer at a remote site later asks for scheduled PDF reports from a SQL database on site. What's the problem with Edge?",
      options: ["Edge has no database connectivity and doesn't run modules like Reporting", "Edge can't poll PLCs", "Edge only supports Vision", "Reports require four Edge licenses"],
      answer: 0,
      explain: [
        "Correct. A standard gateway is needed at that site, or the reports should run on the central gateway.",
        "Edge polls devices fine.",
        "Panel supports Perspective or Vision.",
        "Licensing doesn't work that way."
      ]
    },
    {
      q: "Which statement about Edge packaging is most accurate for current releases?",
      options: ["Compute, EAM and Sync Services must each be bought separately", "Edge IIoT and Edge Panel include Compute, EAM and Sync Services", "Only Edge Panel includes Sync Services", "Edge has a two-device limit"],
      answer: 1,
      explain: [
        "That was the pre-8.1.33 packaging.",
        "Correct. They are bundled into both editions now.",
        "Both editions include it.",
        "The two-device limit was removed."
      ]
    },
    {
      q: "Why poll the PLC from an Edge gateway on site instead of from the central gateway over a cellular link?",
      options: ["PLCs refuse remote connections", "Edge is faster than OPC UA", "The central gateway can't use drivers", "It keeps fast polling on the local LAN, makes timestamps accurate, and lets the link carry only results"],
      answer: 3,
      explain: [
        "They accept connections; the problem is link quality and cost.",
        "Edge uses the same drivers and protocols.",
        "A central gateway has the same drivers.",
        "Correct. Local polling survives outages and gives correct timestamps."
      ]
    }
  ],

  resources: [
    { title: "Ignition Edge (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/other-editions/ignition-edge", type: "docs", source: "Inductive Automation" },
    { title: "Configuring Sync Services (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/other-editions/ignition-edge/edge-gateway/configuring-sync-services", type: "docs", source: "Inductive Automation" },
    { title: "Ignition editions and pricing", url: "https://inductiveautomation.com/pricing/edition", type: "article", source: "Inductive Automation" },
    { title: "Which Ignition Edition Is Right For Your System?", url: "https://inductiveautomation.com/resources/video/which-ignition-edition-is-right-for-your-system", type: "video", source: "Inductive Automation" },
    { title: "Ignition Edge Sync Services hub-and-spoke with store-and-forward", url: "https://inductiveautomation.com/static/images/edge/IgnitionEdge-SyncServices.pdf", type: "article", source: "Inductive Automation" },
    { title: "Ignition Edge historian limitations", url: "https://forum.inductiveautomation.com/t/ignition-edge-historian-limitations/33775/26", type: "forum", source: "Inductive Automation Forum" }
  ]
});
