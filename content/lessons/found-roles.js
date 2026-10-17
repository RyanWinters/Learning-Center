LC.lesson({
  id: "found-roles",
  title: "Who's who: end users, OEMs and system integrators",
  track: "found",
  minutes: 10,
  level: 1,
  prereqs: ["found-history"],
  tags: ["integrator", "oem", "end-user", "business", "csia"],
  summary: "Five kinds of company touch every automation project. Knowing which one you are talking to tells you what they care about, what they will pay for and who is accountable when something fails.",
  objectives: [
    "Distinguish end user, OEM, system integrator, distributor and vendor",
    "Explain what CSIA is and how Ignition's integrator program is organized",
    "Describe how an integration project is bid and what a change order is",
    "Compare a day as an in-house controls engineer with a day at an integrator",
    "Name what changes in your skills when you move from building screens to integrating systems"
  ],

  body: `
## The cast

Automation projects involve a chain of companies, and the same person can wear a different hat depending on the project. Here is who is who.

| Role | What they do | Example | Cares most about |
|---|---|---|---|
| {{term:end-user|End user}} | Owns and runs the plant that makes the product | A dairy, a water utility, a car plant | Uptime, safety, cost per unit, being able to support it |
| {{term:oem|OEM}} (original equipment manufacturer) | Builds a machine or skid and ships it with its own controls | A packaging-machine builder, a pump skid builder | Repeatable design, margin per machine, fast builds |
| {{term:system-integrator|System integrator (SI)}} | Designs, programs, installs and commissions control systems, usually one-off per customer | A 40-person controls firm | Getting the job done on budget, utilization, reputation |
| Distributor | Sells, stocks and supports vendor products locally; often provides training and a quote desk | A regional Rockwell or Ignition distributor | Parts availability, customer relationships |
| Vendor (manufacturer) | Makes the products | Rockwell, Siemens, Inductive Automation | Platform adoption, standardization on their ecosystem |

{{diagram:chain}}

Two additional names show up on large projects. An {{term:epc|EPC}} (engineering, procurement, construction) firm runs a whole new plant build and hires the integrator as one of many subcontractors. A **consultant** advises the end user, writes specifications and reviews designs, and usually does not build.

### OEM versus integrator

An OEM builds the **same machine** many times and keeps the PLC code as its intellectual property. An integrator builds a **different system** each time, tying together machines from several OEMs into a plant: a line controller that ties the filler, capper and labeler together, a SCADA that spans all of them, a batch system, an MES interface. A frequent source of friction: the end user wants the OEM's machine to talk to the plant system, and the OEM's controls were never designed to share data. The integrator's job is often to bridge it, using protocols covered in the {{lesson:proto-modbus}} lesson and its neighbors.

## How projects get bid

1. The end user (or an EPC) issues a **request for quote** ({{term:rfq|RFQ}}) or request for proposal. It usually includes a specification, a P&ID set and an {{term:io-list|I/O list}} if they have one.
2. Integrators walk the site, ask questions and price the work. Pricing is usually built from hours by role (controls engineer, panel designer, technician) plus materials, travel and a margin.
3. The proposal states the scope in a {{term:sow|statement of work}} ({{term:sow|SOW}}), lists exclusions and assumptions, and picks a **pricing model**: fixed price (the integrator carries the risk), time and materials (the end user carries the risk) or a hybrid with a not-to-exceed cap.
4. After award, work follows the lifecycle in {{lesson:int-lifecycle}}: design, build, factory test, install, commission, hand over.
5. When the end user asks for something outside the scope, the integrator issues a {{term:change-order|change order}}: written agreement on cost and schedule impact before the extra work is done.

> [!warning] Scope is where margin goes to die
> A phrase such as "and then the HMI will show the usual alarms" hides weeks of work. Integrators write down what an alarm summary, trend page or report includes, and what it does not. Fixed-price jobs fail on vague scope far more often than on technical difficulty.

## Associations and programs

**{{term:csia|CSIA}}** (Control System Integrators Association) is a not-for-profit trade association of integrators, founded in 1994. It publishes a Best Practices and Benchmarks manual and runs a certification program: an independent audit of an integrator's business and project-management practices. For an end user, a CSIA-certified integrator means the firm has been checked for how it runs projects, not that any one engineer is technically strong.

**Vendor integrator programs** work differently. Inductive Automation's program for Ignition is free to join and has five tiers: Registered, Credentialed, Certified, Gold and Premier. The higher tiers require staff holding Ignition certifications (Core, then Gold) and, at Gold, a minimum amount of product sold or contributed to. Benefits include software discounts, sales-engineer access and co-marketing. Rockwell, Siemens and others run partner programs of their own. Check the vendor's current program page for the rules, as tier requirements change.

## A day in two seats

| | In-house controls engineer (end user) | Integrator controls engineer |
|---|---|---|
| Typical morning | Troubleshoot last night's line stop; check historian | Stand-up on three active projects; update the FDS |
| Systems | One plant, a few platforms, for years | A new site, platform and customer every few months |
| Pressure | Downtime and safety | Budget, schedule, customer expectations |
| Documentation | Often thin; knowledge lives in heads | Required deliverable; reviewed by the customer |
| Travel | Rare | Frequent: site surveys, FAT, SAT, start-up |
| Billing | Salary | Billable hours against a project budget |

## Why your move to integration changes what you need to know

As a screen builder inside a plant, you can assume the network, the PLC code and the tag names exist and mostly work. As an integrator you are responsible for the whole chain, from the field wiring and cards to the data model and the enterprise interface, and for proving it works. You will be asked to:

- **Write and defend a design**: a functional specification, a network diagram, a backup plan.
- **Talk to everyone**: operators, maintenance, IT, process engineers, the purchasing department and the plant manager.
- **Be platform-aware**: customers already own Allen-Bradley, Siemens or Schneider, and your Ignition design must fit around that.
- **Estimate**: knowing roughly how many hours 200 tags, five screens and a historian configuration take is a core skill.
- **Hand over**: training, as-built drawings and a system someone else can support.

That is why this curriculum starts with how plants are structured and runs through networks, PLCs and databases before the capstone.
`,

  eli5: `
Think about building a house. The family who will live there is the end user. The company that makes the kitchen cabinets, built the same way for lots of houses, is like an OEM. The general contractor who works out how the plumbing, wiring and cabinets all fit together in this one specific house is the system integrator. The building supply store that stocks the pipes and wires is the distributor, and the factory that makes the pipes is the vendor.

When the family wants a bigger window after the walls are up, the contractor says "that costs extra and takes two more weeks, sign here." That signed note is a change order.

Moving from making one nice screen to being the integrator is like moving from painting a room to being the general contractor. You still need to know how to paint, but now people ask you how the whole house fits together, and what happens if it leaks.
`,

  why: `
**Why do these distinctions matter to you?** Each party has different incentives, and a good integrator reads them. An end user's maintenance team wants something they can fix at 3 a.m., which pushes toward their existing standards. An OEM wants minimal changes to a proven machine. A vendor wants its own ecosystem used. When these collide, the integrator is the one in the room who has to find the design that satisfies all of them.

**Why do integrators like standardizing on a few platforms?** Every platform multiplies training, spares, templates and support burden. Firms often pick a handful of vendors and build libraries (UDTs, templates, faceplates, test scripts) so the second job is cheaper than the first. This is also why customers ask "what is your standard?" when they select an integrator.

**Why fixed price and time-and-materials both exist?** Fixed price rewards the integrator for efficiency and punishes vague scope. Time and materials protects the integrator from unknowns, but the customer pays for every surprise. Mature customers split it: fixed price for well-defined phases, and T&M or a capped budget for discovery. Experienced hands argue about which is fairer. The common view is that the pricing model should match how well the scope is known.

**Why certification at the company level?** An integrator's biggest risk to a customer is not code quality, it is a project that runs out of money, schedule or key people. CSIA certification audits business and project practices because those are what usually fail first.
`,

  history: `
Control system integration as a business grew out of the 1970s and 80s, as PLCs and then personal-computer-based HMI software made it possible for small firms to build custom automation for plants that had once bought it from large vendors or built it in-house. CSIA formed in 1994 to give those firms a common body of practice. The Ignition integrator program, like other vendor channel programs, followed as platforms adopted a partner-led sales model.
`,

  examples: [
    {
      title: "Who is accountable when a filler talks to the plant MES?",
      body: `A bottling plant (end user) buys a new filler from an OEM and hires an integrator to connect it to the existing Ignition SCADA and MES. The OEM provides a tag list but not the PLC password. The integrator's scope covers the gateway-to-PLC connection and the screens. A line stop reveals the OEM's code writes a counter at 100 ms, and the polling tags in Ignition miss increments. Because the SOW excluded "changes to OEM machine code", fixing it needs a change order that involves all three parties. A good SOW names who owns each interface before work starts.`
    },
    {
      title: "Reading a two-line job posting",
      body: `"Controls engineer, integrator, 60% travel, Ignition and ControlLogix, FAT/SAT experience." You can now read that: billable project work, a few weeks a month at customer sites, a stack that matches this curriculum, and responsibility for the factory and site acceptance tests that gate payment milestones.`
    }
  ],

  diagrams: {
    chain: `<svg viewBox="0 0 640 230" role="img" aria-label="Vendors supply distributors and OEMs; distributors supply integrators; OEMs and integrators both deliver to the end user">
  <defs>
    <marker id="found-roles-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="16" y="20" width="150" height="54" rx="6"/>
  <text class="dg-text dg-mid" x="91" y="44">Vendor</text>
  <text class="dg-text-sm dg-mid" x="91" y="62">makes products</text>
  <rect class="dg-box" x="16" y="150" width="150" height="54" rx="6"/>
  <text class="dg-text dg-mid" x="91" y="174">Distributor</text>
  <text class="dg-text-sm dg-mid" x="91" y="192">stocks, supports</text>
  <rect class="dg-box" x="250" y="20" width="150" height="54" rx="6"/>
  <text class="dg-text dg-mid" x="325" y="44">OEM</text>
  <text class="dg-text-sm dg-mid" x="325" y="62">builds machines</text>
  <rect class="dg-box-accent" x="250" y="150" width="150" height="54" rx="6"/>
  <text class="dg-text dg-mid" x="325" y="174">Integrator</text>
  <text class="dg-text-sm dg-mid" x="325" y="192">builds systems</text>
  <rect class="dg-box" x="470" y="85" width="154" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="547" y="112">End user</text>
  <text class="dg-text-sm dg-mid" x="547" y="130">runs the plant</text>
  <path class="dg-line" d="M91 74 L91 148" marker-end="url(#found-roles-ah)"/>
  <path class="dg-line" d="M166 47 L248 47" marker-end="url(#found-roles-ah)"/>
  <path class="dg-line" d="M166 177 L248 177" marker-end="url(#found-roles-ah)"/>
  <path class="dg-line" d="M400 47 L435 47 L435 100 L468 100" marker-end="url(#found-roles-ah)"/>
  <path class="dg-line" d="M400 177 L435 177 L435 130 L468 130" marker-end="url(#found-roles-ah)"/>
</svg>`
  },

  pitfalls: [
    "Quoting a fixed price against a vague scope with no listed exclusions.",
    "Doing extra work verbally and trying to bill it later, instead of a written change order.",
    "Assuming an OEM will open its PLC code or give you passwords without that being in the contract.",
    "Equating CSIA certification of the company with the skill of one engineer.",
    "Treating the integrator program tiers as a quality ranking when they mostly track certifications and sales."
  ],

  keyTerms: ["end-user", "oem", "system-integrator", "epc", "csia", "rfq", "sow", "change-order"],

  quiz: [
    {
      q: "Which party typically builds the same machine many times and keeps its control code as intellectual property?",
      options: ["End user", "OEM", "Distributor", "Consultant"],
      answer: 1,
      explain: [
        "End users own and operate the plant. They usually buy machines rather than build them.",
        "Correct. An OEM designs a repeatable machine or skid and ships it with its own controls.",
        "Distributors sell and support vendor products. They do not design machines.",
        "Consultants advise and specify. They typically do not build or ship machines."
      ]
    },
    {
      q: "What does the CSIA certification audit?",
      options: ["Each engineer's programming skill", "An integrator's business and project-management practices", "The quality of the vendor's products", "The end user's plant safety"],
      answer: 1,
      explain: [
        "Individual skill is covered by vendor certifications such as Ignition Core and Gold.",
        "Correct. CSIA's certification is an independent audit of company-level practices.",
        "CSIA is an integrator association, not a product tester.",
        "Plant safety audits are done by other bodies."
      ]
    },
    {
      q: "During a fixed-price job the plant manager asks for an extra weekly OEE report that is not in the SOW. What should the integrator do?",
      options: ["Build it quietly and eat the cost", "Refuse all further changes", "Issue a change order covering cost and schedule, then build it", "Wait until handover and send a larger invoice"],
      answer: 2,
      explain: [
        "Absorbing the cost sets a precedent and erodes margin.",
        "Refusing everything damages the relationship. Changes are normal if priced.",
        "Correct. A written change order records the agreement before the work happens.",
        "Billing surprise work after the fact is how disputes start."
      ]
    },
    {
      q: "Which pricing model puts the cost risk on the integrator?",
      options: ["Time and materials", "Fixed price", "Cost-plus with no cap", "A purchase order for a daily rate"],
      answer: 1,
      explain: [
        "T&M bills for hours spent, so the end user carries the risk.",
        "Correct. If the work takes longer than priced, the integrator absorbs the overrun.",
        "Uncapped cost-plus passes the overrun to the customer.",
        "A daily-rate order is a form of time and materials."
      ]
    },
    {
      q: "Compared with an in-house controls engineer, what is a defining feature of the integrator role?",
      options: ["Supporting a single plant for years", "Working on a new customer, site and platform every few months, billed against project budgets", "Never travelling to site", "Avoiding documentation"],
      answer: 1,
      explain: [
        "That describes the end user seat.",
        "Correct. Variety, billable hours and customer-facing deliverables are the integrator's trade.",
        "Integrators travel for site surveys, FAT, SAT and start-up.",
        "Documentation is a contractual deliverable for integrators."
      ]
    }
  ],

  resources: [
    { title: "What is CSIA?", url: "https://www.controlsys.org/about/what-is-csia", type: "article", source: "Control System Integrators Association" },
    { title: "System integrators defined", url: "https://www.controleng.com/system-integrators-defined/", type: "article", source: "Control Engineering" },
    { title: "Inductive Automation's Integrator Program", url: "https://inductiveautomation.com/resources/video/inductive-automations-integrator-program", type: "video", source: "Inductive Automation" },
    { title: "Integrator Program terms", url: "https://inductiveautomation.com/integrators/program", type: "docs", source: "Inductive Automation" },
    { title: "Integrators remain key resource as manufacturers navigate complex tech landscape", url: "https://www.manufacturing.net/operations/article/22975346/integrators-remain-key-resource-as-manufacturers-navigate-increasingly-complex-tech-landscape", type: "article", source: "Manufacturing.net" }
  ]
});
