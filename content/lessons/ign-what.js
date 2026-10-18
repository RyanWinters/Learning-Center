LC.lesson({
  id: "ign-what",
  title: "What Ignition is and why it changed SCADA",
  track: "ign",
  minutes: 15,
  level: 1,
  prereqs: ["found-purdue"],
  tags: ["ignition", "scada", "licensing", "editions", "purdue"],
  summary: "A web-deployed, SQL-centric, modular platform licensed per Gateway and per module instead of by the tag. That pricing and architecture combination is why it spread.",
  objectives: [
    "Explain how Ignition's per-Gateway licensing (unlimited tags and devices, licensed modules) differs from per-tag SCADA pricing",
    "Describe the four properties that define the platform: Java gateway, web deployment, modularity, SQL at the center",
    "Place Ignition at the right Purdue levels for a given job",
    "Choose between Standard, Edge, Cloud Edition and Maker Edition for a scenario",
    "Use the trial and its two-hour timer without being surprised by it"
  ],

  body: `
## What Ignition is

{{term:ignition|Ignition}} is an industrial application platform from Inductive Automation. You install one server program, called the {{term:ign-gateway|Gateway}}, and then add modules to it. Depending on which modules you license, the same Gateway becomes your {{term:hmi|HMI}} and {{term:scada|SCADA}} front end, your tag historian, your alarm system, your report server, your MQTT broker or your OEE system. You already build Perspective screens, so you have used one slice of it. This lesson is about the whole thing and why it was built that way.

## Where it came from

Inductive Automation was founded in 2003 by Steve Hechtman, who came from the systems integration world. The company's first products were FactoryPMI, a web-launched HMI/visualization package, and FactorySQL, a tool that moved PLC data to and from SQL databases. Those two ideas, web deployment and SQL as the data layer, were rare in a market where HMI packages were installed on every operator PC and stored data in proprietary files. In 2010 the company combined the lineage into a single platform and released it as Ignition. Versions 7, 8.0, 8.1 and 8.3 (2025) followed, with 8.3 the first release to move the Gateway's configuration out of an internal database and into plain files.

## The licensing idea

Most SCADA vendors of that era priced by the number of tags (I/O points) and by the number of client seats. A 5,000-tag license with 5 clients was a different product, at a different price, from a 50,000-tag license with 20 clients. Every plant expansion was a quote.

Ignition licenses **per Gateway plus modules**. A Gateway license does not count tags, screens or device connections, so those are unlimited in the license (within what the hardware can serve). You buy the modules you need, and each module is licensed per Gateway. Client access is licensed through the module that provides it: Perspective sessions and Vision clients are counted by that module's license, so check the current terms when you size a visualization purchase. {{lesson:ign-licensing}} covers the details. This lesson quotes no prices.

| | Per-tag / per-client model | Ignition model |
|---|---|---|
| What you count | Tags, client seats, sometimes drivers | Gateways and modules (plus sessions or clients inside a visualization module) |
| Adding 2,000 tags | New license tier | Nothing to buy |
| Adding 10 operator stations | Ten more seats | Check the session or client allowance of the visualization module |
| Cost of a prototype | Full price or crippled demo | Free trial with all modules |
| Risk for the buyer | Sizing the license before you know the scope | Sizing the server hardware |

The consequence is behavioral. An integrator can say yes to "can we also show the packaging line?" without re-quoting tags. The cost of being wrong about scope moves mostly from tag licensing to server sizing and module session counts, which is a much cheaper mistake.

## What defines the platform

**Java gateway.** The Gateway is a Java application running on its own embedded web server. It runs on Windows, Linux and macOS, on bare metal, in a VM, or in a Docker container. There is no dependency on a Windows-only stack, which was unusual for SCADA in 2010.

**Web-deployed clients.** Operators do not install a project. They open a URL or launch a client from the Gateway, which sends the current version of the project at launch. Update the project and the next launch gets the update. With Perspective, the client is just a browser session.

**Modular.** The base Gateway is small. Capabilities arrive as signed modules you install and license separately: OPC UA, Perspective, Vision, Historian, SQL Bridge, Reporting, Alarm Notification and many more, plus third-party modules. You run what you need. {{lesson:ign-architecture}} covers the list.

**SQL-centric.** The platform assumes a relational database exists. Historian data, alarm journals, audit logs, transaction groups and your own application tables all live in SQL, and scripts and bindings can query it directly. This is why Ignition is such a common bridge between the plant floor and MES or ERP systems, which already speak SQL.

## Where it sits in the Purdue model

Because it is a general platform, Ignition shows up at several levels of the {{term:isa-95|Purdue / ISA-95}} model, and which one you mean matters when you design the network.

| Level | Typical Ignition role |
|---|---|
| 0 / 1 | Not here. Ignition does not control machines. The {{term:plc|PLC}} does. |
| 2 | Perspective or Vision HMI, local OPC UA server talking to PLCs, Edge on a machine |
| 3 | Plant SCADA, historian, alarm notification, reporting, MES-style modules |
| 3.5 | A Gateway acting as an integration point or broker between OT and IT |
| 4 | Dashboards and reports for the business, reading plant data through SQL or APIs |

{{diagram:purdue}}

Beginners often put one big Gateway everywhere. Experienced architects use several Gateways, each at the level that matches its job, and link them with the Gateway Network or MQTT. See {{lesson:arch-gateway-network}}.

> [!warning] Ignition is not a controller
> It reads and writes values, but a Gateway restart, a patch, or a Windows reboot must never stop a machine. Safety and sequence control stay in the PLC.

## Editions

| Edition | What it is | Typical use |
|---|---|---|
| Standard | The full platform, unlimited tags and device connections, all modules available (licensed per module) | Plant SCADA, HMI, historian, MES |
| Edge | A trimmed edition for small devices and machines with a limited module set (check the edition page for what is excluded) | Machine-level HMI, data forwarding over MQTT |
| Cloud Edition | Ignition hosted by Inductive, with a bundle of modules preinstalled, usage-based pricing | Enterprise or cloud dashboards without managing servers |
| Maker Edition | Free, for personal non-commercial use and learning, with capped usage | Home labs, education |

Check the current edition pages for exact limits, since they change between releases.

## The trial and its timer

You can download Ignition and run every module without paying. The trial is limited by a two-hour timer: after two hours the modules stop and projects stop working, and you reset the timer from the Gateway with a click. You can reset it as often as you like. There is no tag limit and no feature lock, so a full prototype is possible. The catch for a prototype that someone leaves running over a weekend is that it will quietly stop. Put a licensed Gateway in front of anything you promise to leave running.

> [!example] Sizing a first project
> A packaging plant has 4 lines, 6,000 tags, 12 operator stations and a plan to add a historian next year. A per-tag vendor quotes three licenses. With Ignition you buy one Gateway license plus the modules you need now (OPC UA, Perspective, Historian) and add modules when you need them. Two questions remain: how many concurrent Perspective sessions the module license must cover, and how many sessions and tag changes per second one server can handle. Answer the second with a trial, and the first with the licensing terms (see {{lesson:ign-licensing}}).
`,

  eli5: `
Imagine you want a toolbox for your workshop. Most toolbox companies charge by the number of tools you put in it and the number of friends allowed to borrow it. Every time you add a screwdriver or invite a friend, you pay more.

Ignition is a toolbox company that sells you the box itself and lets you put in as many tools as the box can physically hold. You pay extra for the special drawers you choose, like a drawer for recording measurements or one that rings a bell when something goes wrong, and the drawer that lets friends borrow the box has its own limit on how many can use it at once.

The box also works over the internet, so your friends do not need to carry their own copy. They open a link and see the same tools you see. And everything you write down is kept in a standard notebook (a database) that other people's programs already know how to read.
`,

  why: `
**Why per-Gateway licensing mattered.** In per-tag pricing the vendor's incentive is to make you count tags. The customer's incentive is to avoid adding data, so trends, diagnostics and context get left out because each one costs money. Per-Gateway pricing removed that tension. Plants collect more data because adding it is free, and integrators prototype in front of the customer rather than quoting from a spec.

**Why SQL in the middle.** Proprietary historian files are fast, but nobody else can read them. A SQL database is boring and universal. Every MES, ERP, BI tool and reporting engine can query it. Ignition accepted a performance cost in exchange for making plant data a first-class citizen of the rest of the company's software.

**Why web deployment.** Installing software on 60 operator PCs means 60 patch cycles and 60 chances for a version mismatch. A launched client always matches the Gateway. The tradeoff is that the Gateway becomes a single point of failure, which is why redundancy (a backup Gateway) is a standard feature and not a luxury.

**What integrators argue about.** One big Gateway is simple but a blast radius. Many small Gateways limit failures but multiply patching and configuration. The version control and deployment features in 8.3 shift that argument by making many Gateways easier to manage. Another argument is whether the unlimited tag licensing hides a cost: every tag and every session consumes CPU, memory and database throughput, so "unlimited" really means "limited by your hardware and design."
`,

  history: `
Inductive Automation was founded in 2003 by Steve Hechtman. Its early products were FactoryPMI (web-launched visualization) and FactorySQL (PLC-to-SQL data logging), which were merged into Ignition in 2010 under the per-Gateway model. The platform has been updated through the 7, 8.0 and 8.1 lines, and 8.3 arrived in 2025 with file-based configuration and a REST API.
`,

  examples: [
    {
      title: "Choosing an edition for three jobs",
      body: `A small OEM wants a touchscreen on each machine that also forwards data to the customer's plant over MQTT: **Edge**. A food plant wants one SCADA, a historian, alarm paging and reports for six lines: **Standard**. A corporate team wants a live OEE dashboard of ten plants without running a server: **Cloud Edition**, fed by plant Gateways. You at home, learning Perspective on a Raspberry Pi: **Maker Edition**.`
    },
    {
      title: "The trial timer bites",
      body: `You build a demo on Friday and leave it running. Monday the screens show a trial-expired banner because the two-hour timer ran out and nobody reset it. The fix is to reset the trial in the Gateway, but the lesson is that a demo for a customer deserves a real license or a reminder to reset.`
    }
  ],

  diagrams: {
    purdue: `<svg viewBox="0 0 640 250" role="img" aria-label="Ignition roles at Purdue levels 2, 3 and 4, with PLCs at level 1 and a firewall at level 3.5">
  <rect class="dg-box" x="20" y="20" width="600" height="40" rx="4"/>
  <text class="dg-text" x="34" y="45">Level 4: business dashboards, reports, ERP</text>
  <rect class="dg-box-accent" x="20" y="70" width="600" height="40" rx="4"/>
  <text class="dg-text" x="34" y="95">Level 3: plant Gateway (SCADA, historian, alarms, MES)</text>
  <rect class="dg-box" x="20" y="120" width="600" height="30" rx="4"/>
  <text class="dg-text-sm" x="34" y="140">Level 3.5: DMZ / firewall</text>
  <rect class="dg-box-accent" x="20" y="160" width="600" height="36" rx="4"/>
  <text class="dg-text" x="34" y="183">Level 2: area Gateway or Edge (HMI, OPC UA server)</text>
  <rect class="dg-box" x="20" y="206" width="600" height="36" rx="4"/>
  <text class="dg-text" x="34" y="229">Level 1: PLCs run the process. Ignition only reads and writes.</text>
</svg>`
  },

  pitfalls: [
    "Treating 'unlimited' as free of cost. Every tag and session uses CPU, memory and database throughput.",
    "Running a customer demo on the trial and letting the two-hour timer expire.",
    "Putting safety or sequence logic in Ignition scripts instead of the PLC.",
    "Using one Gateway for every level of the plant without thinking about network zones.",
    "Assuming Edge has the same module list as Standard, or that unlimited tags means unlimited Perspective sessions."
  ],

  keyTerms: ["ignition", "ign-gateway", "ign-unlimited-licensing", "ignition-edge", "ign-maker-edition", "ign-trial-timer", "scada", "isa-95"],

  quiz: [
    {
      q: "A competitor prices by tags and clients. Your customer adds 3,000 tags to an existing Ignition Standard system, and 8 more operators will use Perspective. What is the licensing consequence?",
      options: ["A larger tag license tier", "One new Gateway license per operator station", "An upgrade to Cloud Edition", "No tag purchase is needed, but confirm the Perspective module's session allowance covers the extra operators and size the hardware"],
      answer: 3,
      explain: [
        "Ignition does not sell tag tiers.",
        "Operators do not need their own Gateway license. Their sessions fall under the visualization module's licensing.",
        "Cloud Edition is a hosting model, not an upgrade path for tag counts.",
        "Correct. Tags are not counted. Sessions and clients are licensed per module, so check that allowance, and the other constraint is server capacity."
      ]
    },
    {
      q: "Which property makes Ignition a natural bridge between plant data and MES or ERP systems?",
      options: ["SQL is the central data store for history, alarms and application data", "It uses a proprietary historian format", "It only runs on Windows", "It requires every client to be installed locally"],
      answer: 0,
      explain: [
        "Correct. Other business systems can already query a relational database.",
        "A proprietary format would make integration harder.",
        "Ignition is cross-platform Java.",
        "Clients are launched from the Gateway or run in a browser."
      ]
    },
    {
      q: "Where is Ignition's role NOT appropriate?",
      options: ["Plant-wide historian at level 3", "Operator HMI at level 2", "Running the machine's safety interlocks and sequence control", "Forwarding data to cloud dashboards"],
      answer: 2,
      explain: [
        "A historian is a standard Ignition use.",
        "HMI is its most common role.",
        "Correct. Control and safety belong in the PLC, which keeps running if the Gateway restarts.",
        "Cloud and enterprise data flow is a normal use."
      ]
    },
    {
      q: "You need a free environment to learn Perspective at home with no commercial use. Which choice fits?",
      options: ["Cloud Edition", "Maker Edition", "Edge on a production machine", "Standard with a purchased license"],
      answer: 1,
      explain: [
        "Cloud Edition is hosted and usage-priced.",
        "Correct. Maker Edition is the free, non-commercial option for learning and hobby use.",
        "Edge is a commercial edition for devices and machines.",
        "A purchase is unnecessary for personal learning."
      ]
    },
    {
      q: "A trial Gateway you left running over a weekend is showing expired screens. What happened?",
      options: ["The tag limit was exceeded", "The 30-day evaluation period ended", "The two-hour trial timer ran out and was not reset", "The database lost its license"],
      answer: 2,
      explain: [
        "The trial does not cap tags.",
        "The trial is timed in hours and reset repeatedly, not by a one-time 30-day period.",
        "Correct. The trial runs on a two-hour timer that you can reset any number of times.",
        "Databases are separate products and have no bearing on the Ignition trial."
      ]
    }
  ],

  resources: [
    { title: "Introducing Ignition (8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/getting-started/introducing-ignition", type: "docs", source: "Inductive Automation" },
    { title: "What is Ignition (Inductive University)", url: "https://inductiveuniversity.com/videos/what-is-ignition/8.3", type: "video", source: "Inductive University" },
    { title: "Ignition Software Pricing & Editions", url: "https://inductiveautomation.com/pricing/edition", type: "article", source: "Inductive Automation" },
    { title: "Ignition Maker Edition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/other-editions/ignition-maker-edition", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Cloud Edition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/other-editions/ignition-cloud-edition", type: "docs", source: "Inductive Automation" },
    { title: "Modules Overview (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/modules-overview", type: "docs", source: "Inductive Automation" }
  ]
});
