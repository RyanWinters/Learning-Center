LC.lesson({
  id: "mes-build-vs-buy",
  title: "Plain Ignition vs Sepasoft",
  track: "mes",
  minutes: 20,
  level: 4,
  prereqs: ["mes-sepasoft"],
  tags: ["mes", "sepasoft", "architecture", "decision", "tco"],
  summary: "Ignition can do a lot of MES with tags, SQL and scripts. The hard question is who maintains it in year five.",
  objectives: [
    "List what a plain Ignition build handles well and where it starts to hurt",
    "Name what Sepasoft actually sells beyond the screens: a production model, a tested data model and an upgrade path",
    "Compare total cost of ownership over several years instead of day-one price",
    "Apply a decision checklist to a real scope",
    "Describe hybrid approaches that use Sepasoft for part of the scope"
  ],

  body: `
## The decision you will be asked to make

Sooner or later a customer says, "We already have Ignition. Can't we just build the MES ourselves?" The honest answer is "yes, for some scopes." Ignition gives you tags, a SQL layer, Perspective, scripting, alarming and a historian. That is most of the raw material for a production tracking system. What it does not give you is a design for the production data model, the logic for batch, OEE or genealogy, or anyone to blame when version 9 breaks it. This lesson is about when the raw material is enough and when the packaged product is cheaper.

Treat the sources with care. Most written comparisons come from Sepasoft or Inductive Automation, and both sell something. The forum threads from people who built their own are the useful counterweight.

## What you can build with plain Ignition

A competent integrator can deliver a lot with the platform alone:

| Need | Plain Ignition approach |
|---|---|
| Machine state and downtime | PLC state tag, a gateway script or Transaction Group writing state changes to a table |
| Production counts | Counter tags sampled into a \`production_count\` table by shift or run |
| Simple OEE | Availability, performance and quality computed in SQL or a Named Query |
| Work order display | A \`work_order\` table and a Perspective view with start/stop buttons |
| Lot tracking (simple) | A \`lot\` table and a scan-to-record workflow |
| Reports | The Reporting module or Perspective tables on Named Queries |
| Operator input | Perspective forms writing to SQL through Named Queries |

For one line, one product family and one customer who knows exactly what they want, this is often a sound choice. You control the schema, there are no per-module MES licenses, and the people who built it can explain every column.

> [!example] A build that works
> A bottler wants downtime reasons and shift counts on three lines. The integrator adds a \`downtime_event\` table (line, start, end, reason code), a state-machine script that opens and closes events from the PLC state tag, and one Perspective dashboard. About three weeks of work. Nobody needs genealogy, recipes or ERP integration. A packaged MES would be overkill.

## Where a build becomes a maintenance burden

The trouble is rarely the first screen. It is everything that arrives after.

- **Scope creep.** The line adds changeovers, then material lots, then a hold-and-release workflow, then ERP orders. Each addition touches the schema, scripts and screens you already have.
- **Hidden logic.** Business rules end up spread across Transaction Groups, gateway scripts, SQL triggers and Perspective bindings. After the original developer leaves, nobody holds the whole picture.
- **No tested core.** You write the state machine, the OEE rules, the lot genealogy queries and the edge cases (what happens on a power cycle mid-run, when two operators scan the same lot). Each is a place for bugs, and you are the only tester.
- **Documentation and training.** Packaged products come with manuals and community knowledge. Your custom system has whatever you wrote down.
- **Upgrades.** Ignition 8.1 to 8.3 changes can touch scripting, Perspective components and the gateway network. Custom code is yours to retest and fix. See {{lesson:arch-webdev}} for how much surface a custom web layer adds.
- **Multi-site.** The second plant needs the same thing slightly different. A parameterized model helps; a copy-and-edit fork of the first project does not.

A rough test is the "bus factor." If one person leaving would leave the customer unable to change a recipe or fix a report, you built a liability, not an asset.

## What Sepasoft actually sells

The modules are built on Ignition's module SDK, so they live inside the same gateway and use the same tags, databases and Perspective. See {{lesson:mes-sepasoft}} for the modules. The value breaks into three parts.

1. **A production model.** Enterprise, site, area, line and cell are defined once, and every module (OEE, track and trace, batch) hangs its settings on that structure. Your equipment hierarchy is data, not hard-coded names.
2. **A tested data model and logic.** The schema, the OEE calculation, material and lot tracking, work order handling and batch engine are written and exercised by the vendor across many customers. You configure instead of coding.
3. **An upgrade path.** Module versions are released and tested against Ignition versions. The vendor handles database migrations and compatibility, and you can file a support ticket.

Sepasoft also provides pieces that are painful to build: a batch engine in the ISA-88 style, document and SOP handling, SPC, and a business connector for ERP integration ({{lesson:mes-erp}}).

The cost is real too. You pay license fees, you accept the vendor's way of modeling things, and you still write scripts and screens to fit your process. A forum user with a long-running home-grown MES put it plainly: the object model and database structure are the main advantage, but you will still do a lot of scripting.

## Total cost of ownership

Compare over five years, not at go-live.

{{diagram:cost}}

| Cost item | Custom build | Sepasoft-based |
|---|---|---|
| Software licenses | Ignition only | Ignition plus MES modules |
| Initial engineering | High for anything beyond a simple scope: you design and build the core | Moderate: model, configure, then customize |
| Testing and QA | Yours, all of it | Vendor tests the core; you test your configuration |
| Documentation | Yours | Vendor manuals plus yours |
| Upgrades | Retest everything | Retest your configuration, follow vendor notes |
| Ongoing change | Developer time per request | Often configuration, sometimes scripting |
| Key-person risk | High | Lower: knowledge exists outside your team |

Custom costs are mostly labor and risk. Sepasoft costs are mostly licenses and learning. The curves cross at a scope that depends on the customer, but it comes sooner with batch, genealogy, multiple sites or ERP orders. Be careful with any vendor's TCO claims, including Sepasoft's. Ask for the customer's own labor rates and build the table with their numbers.

## Decision checklist

Answer these with the customer. More "yes" answers on the left side points to a custom build, more on the right points to Sepasoft.

| Leans custom | Leans Sepasoft |
|---|---|
| One line or one cell | Multiple lines or sites |
| Counts, downtime, simple OEE | Batch, recipes, genealogy, SPC |
| No regulated traceability | Regulated or recall-driven traceability |
| No ERP orders, or a trivial feed | ERP orders and confirmations ({{lesson:mes-erp}}) |
| In-house Ignition developer who will stay | Integrator turnover, or no developer on site |
| Stable requirements | Requirements will grow |
| Tight budget today | Budget for lifecycle cost |

Add two questions people forget. Who will fix this at 2 a.m. in year four? And does the customer's quality group need a validated, documented system?

## Hybrid approaches

It is not all or nothing.

- **Sepasoft for the core, custom for the edges.** Use the production model, OEE and track and trace, then build custom Perspective screens and reports on top of the vendor tables.
- **Custom first, packaged later.** Start with downtime and counts in plain Ignition, with a schema and naming that mirror an ISA-95 hierarchy. If the scope grows, you have a plant model ready to map into a production model.
- **One module only.** Some customers license just OEE, or just the batch engine, and build the rest.
- **Pre-packaged integrator products.** Some integrators sell their own template MES on Ignition. These can be good, but you inherit that integrator as a dependency, so ask what happens if they disappear.

> [!tip] Test before you decide
> You can install the Sepasoft modules in trial mode and configure one real line in a few days. That tells you more than any comparison article, including this one.
`,

  eli5: `
Imagine you need a bookshelf. You can buy planks and screws from the hardware store and build exactly the shelf you want. That is plain Ignition. It is cheap, and you decide every detail. If you only need one shelf for one wall, it is a great plan.

Now imagine you need shelves for a whole library that keeps getting bigger, and each wall has a different shape. If you built every shelf yourself, you would have to remember how each one was made, test whether it can hold heavy books, and fix any that wobble. And when you move away, nobody else knows how to repair them.

Buying a shelving system costs money, but the parts fit together, someone tested them with heavy books, and the company will send you new parts when you need them. You still choose where the shelves go.

The question is not which one is better. It is how big the library will get, and who will still be around to fix the shelves in five years.
`,

  why: `
**Why is this decision hard?** The up-front price is visible and the long-term price is not. A custom build looks cheap because the platform is already licensed and the first screens come quickly. The cost arrives later, as change requests, upgrades and staff turnover. Meanwhile a packaged MES looks expensive on a quote, and its value is mostly in work you never have to do.

**Why do experienced integrators disagree?** Some have seen custom builds run for fifteen years with one steady in-house developer. Others have inherited undocumented systems nobody dared touch. Both stories are true. The difference is usually the customer's people and how stable the scope is, not the technology.

**Why does the data model matter most?** Screens can be rebuilt in weeks. A production schema with years of lot and downtime history cannot be swapped out casually. If you build your own, design the keys, time handling and hierarchy as if you will keep them for a decade. If you buy, you are mostly buying someone else's tested answers to those questions.

**Why be skeptical of both sides?** Vendors tend to stress the risks of building. Builders tend to underestimate maintenance and overstate how much they can reuse. A sober approach is to price both options with the customer's real labor rates, include years three to five, and pick the one that fits the team that will actually own it.
`,

  examples: [
    {
      title: "A simple scope that stays custom",
      body: `Single packaging line. Needs: state, counts, downtime reasons, a shift report. Estimate: 120 hours of engineering, no MES license cost. Recommendation: plain Ignition with a documented schema (\`line\`, \`downtime_event\`, \`production_count\`), reviewed once a year. Revisit if the customer asks for lots or ERP orders.`
    },
    {
      title: "A scope that tips toward Sepasoft",
      body: `Three plants, 14 lines, SAP production orders, lot genealogy for recall response, and a customer quality audit each year. The custom estimate lists 1,800 hours before ERP confirmation and genealogy testing. The packaged option adds licenses but cuts build effort and brings a documented data model the auditors can read. The decision still depends on the customer's budget and team, but the checklist leans clearly one way.`
    }
  ],

  diagrams: {
    cost: `<svg viewBox="0 0 640 220" role="img" aria-label="Cost over time: a custom build starts low and rises with change and maintenance; a packaged MES starts higher and rises more slowly">
  <line class="dg-line" x1="60" y1="190" x2="600" y2="190"/>
  <line class="dg-line" x1="60" y1="30" x2="60" y2="190"/>
  <text class="dg-text-sm" x="300" y="212">Years after go-live</text>
  <text class="dg-text-sm" x="20" y="24">Cumulative cost</text>
  <text class="dg-text-muted" x="60" y="206">0</text>
  <text class="dg-text-muted" x="330" y="206">3</text>
  <text class="dg-text-muted" x="590" y="206">5</text>
  <polyline class="dg-line" fill="none" points="60,160 150,150 240,130 330,100 420,70 510,48 590,34"/>
  <polyline class="dg-line" fill="none" points="60,120 150,116 240,110 330,102 420,92 510,84 590,76"/>
  <text class="dg-text-sm" x="440" y="56">Custom build</text>
  <text class="dg-text-sm" x="440" y="108">Packaged MES</text>
  <text class="dg-text-muted" x="70" y="108">Higher day-one cost</text>
  <text class="dg-text-muted" x="70" y="178">Cheap start</text>
</svg>`
  },

  pitfalls: [
    "Quoting a custom build from the first screen's effort and ignoring change requests, testing and upgrades.",
    "Putting business rules in scattered Transaction Groups, scripts, triggers and bindings with no single document describing them.",
    "Assuming a packaged MES removes all engineering. You still model the plant, write scripts and build screens.",
    "Believing vendor TCO claims, Sepasoft's or anyone's, without rebuilding the numbers with the customer's labor rates.",
    "Designing a custom schema with no plant hierarchy, then needing a second site.",
    "Skipping a trial of the packaged option when a few days would answer the question."
  ],

  keyTerms: ["mes", "mes-production-model", "tco", "oee", "isa-95", "isa-88", "erp"],

  quiz: [
    {
      q: "A customer wants downtime reasons and shift counts on one line, nothing else, and has a dedicated in-house Ignition developer. What's the most defensible recommendation?",
      options: ["Plain Ignition with a documented schema, and revisit if scope grows", "Always license every Sepasoft module for future growth", "Buy a separate non-Ignition MES", "Delay until ERP integration is defined"],
      answer: 0,
      explain: [
        "Correct. The scope is small and stable and a developer will stay, so a custom build is reasonable. Document it and reassess if lots, batch or ERP orders appear.",
        "Licensing every module for a speculative future is expensive and not justified by the stated scope.",
        "That adds a second platform and cost without a driver for it.",
        "ERP integration is not part of the requirement, so waiting on it solves nothing."
      ]
    },
    {
      q: "Which is the best summary of what Sepasoft sells beyond screens?",
      options: ["Faster PLC communication", "A replacement for Ignition's gateway", "A production model, a tested data model and logic, and an upgrade path", "Free historian storage"],
      answer: 2,
      explain: [
        "PLC communication is the job of Ignition's OPC UA drivers and is unrelated to MES modules.",
        "The modules run inside the Ignition gateway. They don't replace it.",
        "Correct. The three durable benefits are the structured model of the plant, the vendor-tested schema and logic, and versioned upgrades with support.",
        "Storage is not what the modules are for."
      ]
    },
    {
      q: "Three years after go-live, a custom MES author has left and the customer asks for a new report. What risk is this?",
      options: ["Licensing risk", "Network latency", "OPC UA certificate expiry", "Key-person risk from undocumented, hard-to-trace logic"],
      answer: 3,
      explain: [
        "A custom build usually has no extra license fees. The issue here is knowledge.",
        "Latency is unrelated to who understands the system.",
        "Certificates affect connections, not report changes.",
        "Correct. Rules spread across scripts, groups and bindings with one author is the classic way a custom MES becomes a liability."
      ]
    },
    {
      q: "Which scope most strongly pushes the decision toward Sepasoft?",
      options: ["One line with state and counts", "Multiple plants with ERP orders, lot genealogy and audit requirements", "A single dashboard for a supervisor", "A proof of concept for a trade show"],
      answer: 1,
      explain: [
        "That's the textbook custom-friendly scope.",
        "Correct. Multi-site, ERP integration and regulated traceability each add heavy build and test effort that a packaged product already covers.",
        "A dashboard needs no MES platform.",
        "A proof of concept is short-lived and does not justify licensing."
      ]
    },
    {
      q: "A vendor's brochure says its MES lowers TCO versus custom builds. What should you do?",
      options: ["Rebuild the comparison over five years using the customer's own labor rates and scope", "Accept it because the vendor knows its product", "Ignore TCO and compare license prices only", "Assume custom is always cheaper"],
      answer: 0,
      explain: [
        "Correct. Use their numbers: build hours, test effort, upgrades, licenses and the risk of key-person loss.",
        "The vendor has an interest in the result, and your customer's scope may differ from their example.",
        "License price alone ignores the largest cost, labor.",
        "Custom is cheaper for small stable scopes only. As a rule it is not true in general."
      ]
    },
    {
      q: "A customer starts with a custom downtime tracker but expects to grow. What design choice keeps the packaged option open?",
      options: ["Hard-code line names into scripts", "Model the plant hierarchy (site, area, line) in tables, with consistent naming", "Store all data in a single wide table", "Avoid any database"],
      answer: 1,
      explain: [
        "Hard-coded names are exactly what makes a second site or a later migration painful.",
        "Correct. A hierarchy that mirrors ISA-95 maps cleanly onto a production model later, and also helps a second site.",
        "A wide table couples everything and complicates later mapping.",
        "MES needs persistent history. Skipping a database loses it."
      ]
    }
  ],

  resources: [
    { title: "Sepasoft vs Custom MES", url: "https://www.sepasoft.com/blog/mes-implementation/sepasoft-vs-custom/", type: "article", source: "Sepasoft (vendor view)" },
    { title: "Sepasoft MES vs. Pre-Packaged Custom Solutions", url: "https://www.sepasoft.com/sepasoft-mes-vs-prepackaged-integrator-solution/", type: "article", source: "Sepasoft (vendor view)" },
    { title: "Sepasoft vs. Ignition for MES", url: "https://forum.inductiveautomation.com/t/sepasoft-vs-ignition-for-mes/53675", type: "forum", source: "Inductive Automation Forum" },
    { title: "What is MES? Manufacturing Execution Systems Explained", url: "https://inductiveautomation.com/resources/article/what-is-a-manufacturing-execution-system-mes", type: "article", source: "Inductive Automation" },
    { title: "Using Sepasoft MES Modules", url: "https://docs.sepasoft.com/articles/user-manual/mes-modules", type: "docs", source: "Sepasoft" },
    { title: "MES Server Sizing & Architecture Guide", url: "https://docs.sepasoft.com/resources/Storage/knowledge-base/MES+Server+Sizing+and+Architecture+Guide+V6.pdf", type: "docs", source: "Sepasoft" }
  ]
});
