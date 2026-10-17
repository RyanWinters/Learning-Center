LC.lesson({
  id: "mes-sepasoft",
  title: "The Sepasoft MES modules",
  track: "mes",
  minutes: 35,
  level: 3,
  prereqs: ["mes-oee", "mes-track-trace", "ign-databases"],
  tags: ["sepasoft", "mes", "oee", "track-trace", "batch", "spc", "modules"],
  summary: "The third-party module suite that turns an Ignition Gateway into an MES: what each module does, how they share one production model, and what a project looks like.",
  objectives: [
    "Explain who Sepasoft is and how its modules relate to Ignition",
    "Describe the job of each module in the suite",
    "Explain the production model and why every module depends on it",
    "Pick the right module for a given plant problem",
    "Describe the versioning and licensing rules at a high level",
    "Outline the phases of a typical Sepasoft implementation"
  ],

  body: `
## What Sepasoft is

Sepasoft is a company that builds MES software as modules for Ignition. Inductive Automation lists it as a Premier Technology Provider, which is its partner tier for vendors whose products integrate deeply with the platform. Sepasoft's modules install into the Ignition Gateway like any third-party module, are configured in the Designer, and use the same tags, databases, security and Perspective or Vision clients you already know.

The pitch is simple. Ignition gives you connectivity, tags, history, alarms and screens. Sepasoft adds the MES layer on top: production orders and runs, OEE and downtime, lot genealogy, batch recipes, SPC and electronic work instructions. If you completed {{lesson:mes-what}} you know that these are the ISA-95 Level 3 functions. This lesson maps them to products.

Sepasoft is a separate company from Inductive Automation, with its own releases, documentation (docs.sepasoft.com) and licensing.

## The module map

| Module | What it does | Typical user |
|---|---|---|
| **OEE Downtime** | Records production counts, cycle times, equipment state and downtime events with reason codes, and computes {{term:oee|OEE}} | Operations, continuous improvement |
| **Track & Trace** | Lot and material tracking, genealogy (what went into what), and production control on the ISA-95 model | Quality, food and pharma, any recall-sensitive plant |
| **{{term:batch-procedure-module|Batch Procedure}}** | ISA-88 style recipes as graphical procedures that run across equipment phases | Process plants making batches |
| **SPC** | Sample collection, control charts, rule checks and capability indices | Quality engineers |
| **{{term:settings-changeover|Settings & Changeover}}** | Machine settings (recipes), downloads and variance checks during product changes | Discrete lines with many products |
| **Document Management** | Production documents such as work instructions and travelers that operators fill out and save with MES data | Operators, quality |
| **{{term:business-connector|Business Connector}}** | Moves data between the MES and enterprise systems | Integrators connecting ERP |
| **Web Services** | Lets the MES call or expose REST and SOAP services | Integrators |
| **Barcode Scanner** | Decodes 1D, 2D and GS1 barcode input at the Gateway without a client window open | Material and lot entry |

Sepasoft's catalog also includes an Instrument Interface, a Production Simulator and an interface for SAP ERP. Settings & Changeover was previously named Recipe & Changeover, so older documents and forum posts use the old name.

> [!note] Interlocking is a feature, not a module
> You will hear "MES interlocking" in sales conversations, but Sepasoft does not sell a separate Interlocking module. Interlocks show up inside other modules. For example, Batch Procedure's Permissive Start waits for the PLC to clear its permissives before a phase runs. In MES terms, interlocking means refusing a step or a material use unless conditions are met, such as blocking a lot that failed inspection. It never replaces safety-rated interlocks in the PLC or SIS.

### What the key modules actually do

**OEE Downtime** watches your equipment through tags. A line's state (running, stopped, and the user-defined **{{term:equipment-mode|equipment modes}}** you configure) and counts feed the calculation. When a line stops, the operator or an automatic rule assigns a reason code. The result is the availability, performance and quality numbers from {{lesson:mes-oee}}, and the Pareto charts from {{lesson:mes-downtime}}.

**Track & Trace** models material as lots that move through production. When 400 kg of lot A and 200 kg of lot B are consumed to make lot C, it stores that link. Query it forward (where did lot A go?) or backward (what went into lot C?) for recalls. See {{lesson:mes-track-trace}}.

**Batch Procedure** gives you a graphical recipe editor. Saving a recipe creates a master recipe, and each execution makes a control recipe copy that runs as a batch. A recipe step maps to an **equipment phase** which is tied one-to-one to phase logic in the PLC, matching the model in {{lesson:mes-batch}}. The module includes a built-in equipment phase with standard ISA-88 control values, which suits dozens of data points per phase. Sepasoft positions its recipes as including the workflow, operator steps and approvals, so the PLC can focus on equipment control.

**Settings & Changeover** has a different aim. A recipe here is a set of setpoints with no process-control logic. It is designed for sharing hundreds or thousands of data points with PLCs, comparing actual values against targets and reporting variances, as in {{lesson:mes-recipes}}. Choose it when the product changes and the machine just needs the right numbers. Choose Batch Procedure when the recipe has a sequence.

**SPC** provides sample definitions (what to measure, how often, how many per sample), control charts and rules. Built-in signals follow the Nelson and Western Electric rules, and you can write your own as Python scripts. Capability numbers such as Cpk are calculated for you, as in {{lesson:mes-spc}}.

**Document Management** is less about analysis and more about replacing paper: forms, travelers and work instructions that an operator completes on a screen and that are stored against the order or lot.

**Web Services and Business Connector** are the integration pair. Web Services connects the MES to anything with a REST or SOAP interface. Business Connector exchanges data with enterprise systems. Both versions must match, and both appear in {{lesson:mes-erp}} when you connect to ERP.

## The Production Model

Every module reads from one shared structure called the {{term:mes-production-model|production model}}. You build it once in the Designer as a tree of equipment, and it follows the ISA-95 equipment hierarchy: an enterprise containing sites, areas, production lines and line cells, with additional entities for storage and (for batch work) units. Each element can have tags, modes and properties attached.

{{diagram:model}}

The reason this matters: OEE counts, Track & Trace lots, SPC samples, setting values and batch phases all attach to the **same equipment element**. When a downtime event on Line 3 and a quality sample from Line 3 share an identity, you can ask questions across modules, such as "did the SPC signal on Line 3 happen during the changeover that followed the long stop?"

The production model is also where most projects go wrong. Rename or restructure it late and every module's configuration and history is affected. Spend the early days getting names, hierarchy and line definitions agreed with operations.

## Versions and licensing, at a high level

- **Version numbers track Ignition.** A module version such as 4.83.x pairs with Ignition 8.3, and 3.81.x pairs with Ignition 8.1. Sepasoft documents a "highest tested" Ignition version for each release.
- **MES 4.0 is the line for Ignition 8.3.** Sepasoft states that MES 4.0 is its only platform version compatible with Ignition 8.3. Plan for 3.x on 8.1.
- **Keep the modules in sync.** All Sepasoft MES modules in a Gateway should share the same version, and Business Connector and Web Services must match each other.
- **The Production Module is the base.** Sepasoft's downloads page states that the Production Module must be installed to run Batch Procedure, OEE Downtime, Track & Trace, Settings & Changeover, SPC and Document Management. Barcode Scanner and Instrument Interface are described as standalone.
- **Licensing.** Modules are installed on the Gateway and licensed through it, and licensing is typically per module. The exact pricing model, quantities and trial options change, so get a current quote from Sepasoft or Inductive Automation, and confirm what your customer's server needs.

> [!note] In 8.1
> On Ignition 8.1 you use the MES 3.x line (for example 3.81.11). The concepts here still apply. The module installation steps and some Designer screens differ between 3.x and 4.0, so always follow the documentation for the version you install.

## What a typical implementation looks like

1. **Discovery.** Which problems matter first: downtime visibility, traceability, SPC? Pick one or two modules, not all.
2. **Production model design.** Agree the equipment hierarchy, line and cell names, and the products or materials. This is a workshop with operations, not a Designer task.
3. **Infrastructure.** An Ignition Gateway sized for the load, a production database with backup, and a test environment with the same module versions.
4. **Connect to equipment.** Map PLC tags for counts, states and fault codes to the model. Fix the data first, since bad counts produce bad OEE.
5. **Configure the modules.** Downtime reason codes, modes, product and material definitions, SPC sample definitions, recipes or settings.
6. **Build the screens.** Operator views for selecting an order, entering reasons, scanning lots and completing documents.
7. **Integrate.** Orders in from ERP, confirmations out, through Business Connector or Web Services.
8. **Train and run in parallel.** Operators use the system alongside paper for a few weeks and compare.
9. **Handover.** Document the model, the module versions, the database and the upgrade plan.

> [!tip] Start narrow
> The most successful projects pick a single line, get its OEE and downtime trustworthy, then clone the model to other lines. Rolling out five modules across a plant at once is the most reliable way to deliver none of them well.

Whether you should use this suite or build the same functions with plain Ignition is the subject of {{lesson:mes-build-vs-buy}}.
`,

  eli5: `
Imagine you own a big toy workshop. You already have a good workbench, tools and lights. That's Ignition. It lets you see what is happening and control things.

Now you want to answer bigger questions. How many toys did we make today? Why did the machine stop for an hour? If a bad batch of paint was used, which toys got it? Is the size of the wheels slowly drifting? What exact steps and amounts do we use for the red batch?

Sepasoft sells add-on drawers that fit the workbench. One drawer counts toys and stops. Another follows paint tins into finished toys. Another follows recipes. Another draws charts of wheel sizes. Another holds the paper forms.

All the drawers share one big map of the workshop, which lists every table and machine by name. Because they share the map, "the red machine" means the same thing in every drawer. That's why you build the map carefully first.
`,

  why: `
**Why modules on top of Ignition instead of a standalone MES?** An MES needs the same plumbing as SCADA: device connections, tags, a database, users and screens. Putting the MES on the same Gateway removes a whole integration layer. The plant data model for OEE is the same tag you already display, and the operator uses the same login. For an integrator who already knows Ignition this is a big reduction in unknowns.

**Why a shared production model?** The alternative is each module keeping its own idea of "Line 3." That is how plants end up with an OEE system, a quality system and a traceability system that cannot be joined. One model costs design effort at the beginning and pays back every time you combine data across functions.

**Why choose modules narrowly?** Each module brings configuration, training and ownership. A plant that just wants downtime visibility needs OEE Downtime, not the full suite. Over-scoping is the most common reason MES projects stall. Experienced integrators often argue the opposite danger as well: buying a single module and then discovering later that traceability needed the production model designed for lots from day one. The compromise is to design the model for the whole plant, then switch on modules one at a time.

**Why the version discipline?** Because the modules share the Gateway and the model, mixing versions causes failures that look like database or tag problems. Pinning one version across the suite and testing upgrades on a copy of the Gateway is cheap insurance.

**What to watch.** Sepasoft is a separate vendor. Check its release notes and known issues for the exact version you plan to run before committing, particularly for newer Ignition versions.
`,

  history: `
Sepasoft's MES modules for Ignition have been through several platform generations, often written as MES 1.0, 2.0, 3.0 and now 4.0, with the module version numbers following the Ignition release they target. MES 4.0 is the line that supports Ignition 8.3. Settings & Changeover was previously called Recipe & Changeover. The documentation moved from a Confluence-style help site to the docs.sepasoft.com portal, so you may see both when searching.
`,

  examples: [
    {
      title: "Choosing modules for a plant",
      body: `A beverage plant has one filler line and a syrup room. The owner wants downtime reasons on the filler and a lot recall report. Choose: OEE Downtime for the filler, Track & Trace for syrup lots and finished-goods lots, Barcode Scanner for lot entry, and Batch Procedure for syrup if recipes are procedural. Defer SPC and Document Management until the first phase proves out. Build one production model covering the whole plant so the later modules attach without rework.`
    },
    {
      title: "Which recipe module?",
      body: `A packaging line runs 80 products and each needs 400 setpoints (speeds, temperatures, guide positions). There is no sequence: just numbers. Settings & Changeover fits. A chemical plant mixes a base with timed additions, heating and holds, with operator confirmations. That needs Batch Procedure.`
    }
  ],

  diagrams: {
    model: `<svg viewBox="0 0 640 280" role="img" aria-label="A shared production model tree of enterprise, site, area, line and cell, with OEE, Track and Trace, SPC, Settings and Batch modules all attaching to it">
  <marker id="mes-sepasoft-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker>
  <text class="dg-title" x="20" y="24">Production model (Designer)</text>
  <rect class="dg-box" x="20" y="36" width="190" height="30" rx="4"/>
  <text class="dg-text-sm" x="30" y="56">Enterprise: Acme Foods</text>
  <rect class="dg-box" x="40" y="74" width="170" height="30" rx="4"/>
  <text class="dg-text-sm" x="50" y="94">Site: Dayton</text>
  <rect class="dg-box" x="60" y="112" width="150" height="30" rx="4"/>
  <text class="dg-text-sm" x="70" y="132">Area: Packaging</text>
  <rect class="dg-box-accent" x="80" y="150" width="130" height="30" rx="4"/>
  <text class="dg-text-sm" x="90" y="170">Line 3</text>
  <rect class="dg-box" x="100" y="188" width="110" height="30" rx="4"/>
  <text class="dg-text-sm" x="110" y="208">Cell: Filler</text>
  <rect class="dg-box-2" x="360" y="36" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="372" y="58">OEE Downtime: states, counts, reasons</text>
  <rect class="dg-box-2" x="360" y="80" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="372" y="102">Track &amp; Trace: lots, genealogy</text>
  <rect class="dg-box-2" x="360" y="124" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="372" y="146">SPC: samples, charts, rules</text>
  <rect class="dg-box-2" x="360" y="168" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="372" y="190">Settings &amp; Changeover / Batch</text>
  <rect class="dg-box-2" x="360" y="212" width="260" height="34" rx="4"/>
  <text class="dg-text-sm" x="372" y="234">Documents, barcode, integration</text>
  <line class="dg-line-accent" x1="210" y1="165" x2="360" y2="55" marker-end="url(#mes-sepasoft-ah)"/>
  <line class="dg-line-accent" x1="210" y1="165" x2="360" y2="97" marker-end="url(#mes-sepasoft-ah)"/>
  <line class="dg-line-accent" x1="210" y1="165" x2="360" y2="141" marker-end="url(#mes-sepasoft-ah)"/>
  <line class="dg-line-accent" x1="210" y1="165" x2="360" y2="185" marker-end="url(#mes-sepasoft-ah)"/>
  <line class="dg-line-accent" x1="210" y1="165" x2="360" y2="229" marker-end="url(#mes-sepasoft-ah)"/>
  <text class="dg-text-muted" x="20" y="268">Every module attaches to the same equipment elements.</text>
</svg>`
  },

  pitfalls: [
    "Designing the production model late or casually, then restructuring it after history exists.",
    "Mixing Sepasoft module versions in one Gateway, or running a version not tested against your Ignition version.",
    "Starting with every module instead of one line and one or two modules.",
    "Choosing Batch Procedure when the need is just per-product setpoints (or the reverse).",
    "Trusting OEE numbers before the PLC count and state tags are verified.",
    "Quoting module names from memory. Names change (for example Recipe & Changeover became Settings & Changeover).",
    "Treating licensing as an afterthought. Confirm the modules and quantities with the vendor early."
  ],

  keyTerms: ["sepasoft", "mes-production-model", "settings-changeover", "batch-procedure-module", "business-connector", "equipment-mode", "oee"],

  quiz: [
    {
      q: "A packaging line has 80 products, each needing about 400 setpoints and no sequence of steps. Which Sepasoft module fits best?",
      options: ["Batch Procedure", "Settings & Changeover", "Track & Trace", "Web Services"],
      answer: 1,
      explain: [
        "Batch Procedure is designed for recipes with a procedure, not for large static parameter sets.",
        "Correct. Settings & Changeover handles setpoint-style recipes at scale and tracks variances to the targets.",
        "Track & Trace follows lots and genealogy. It doesn't download settings.",
        "Web Services connects to external APIs. It doesn't manage recipes."
      ]
    },
    {
      q: "What is the production model for?",
      options: ["A 3D drawing of the plant", "A shared equipment hierarchy that every MES module attaches to", "A list of customers", "The PLC program structure"],
      answer: 1,
      explain: [
        "It's a logical tree of equipment, not a drawing.",
        "Correct. Sharing it is what lets OEE, SPC, lots and settings refer to the same line.",
        "Customers and orders are separate data.",
        "PLC organization is independent. The model can be mapped to PLC tags, but it is not the PLC structure."
      ]
    },
    {
      q: "You see a forum post about Sepasoft 'Recipe & Changeover'. What is the best interpretation?",
      options: ["It's a different product that was discontinued", "It is the earlier name of the Settings & Changeover module", "It's the Batch Procedure module", "It's part of Ignition's core"],
      answer: 1,
      explain: [
        "It wasn't discontinued, it was renamed.",
        "Correct. The module was renamed, so older material still uses the old name.",
        "Batch Procedure is a separate module for ISA-88 procedures.",
        "It's a Sepasoft module, not part of Ignition's core."
      ]
    },
    {
      q: "Which statement about versions is correct?",
      options: ["Any mix of module versions will work if the Gateway starts", "All Sepasoft MES modules in a Gateway should be the same version, and MES 4.0 is the line for Ignition 8.3", "MES 3.x is the line for Ignition 8.3", "Version numbers have no relation to Ignition"],
      answer: 1,
      explain: [
        "Mixed versions cause hard-to-diagnose failures, so Sepasoft says to keep them in sync.",
        "Correct. Module versions follow Ignition (4.83.x for 8.3) and should match across the suite.",
        "3.x pairs with Ignition 8.1 (for example 3.81.x).",
        "Module versions carry the Ignition version they target."
      ]
    },
    {
      q: "A customer wants downtime visibility on one filler line within a month. What is the best plan?",
      options: ["Deploy all modules across the plant at once", "OEE Downtime on that line, with a production model designed for later growth", "Build a custom SQL database and skip the production model", "Start with Document Management"],
      answer: 1,
      explain: [
        "A wide rollout risks delivering nothing well in the time available.",
        "Correct. Start narrow, get trustworthy numbers, then replicate the model to other lines.",
        "Skipping the model removes the shared structure that the modules rely on.",
        "Document Management doesn't produce downtime data."
      ]
    },
    {
      q: "Which pair of modules is used to connect the MES to other systems such as ERP?",
      options: ["Barcode Scanner and SPC", "Business Connector and Web Services", "Batch Procedure and Track & Trace", "Document Management and OEE Downtime"],
      answer: 1,
      explain: [
        "Barcode Scanner decodes input and SPC handles quality charts. Neither integrates enterprise systems.",
        "Correct. Business Connector exchanges data with enterprise systems, and Web Services talks REST and SOAP.",
        "These handle recipes and genealogy inside the MES.",
        "These handle forms and downtime within the plant."
      ]
    }
  ],

  resources: [
    { title: "Using Sepasoft MES Modules", url: "https://docs.sepasoft.com/articles/user-manual/mes-modules", type: "docs", source: "Sepasoft" },
    { title: "MES with Sepasoft Modules", url: "https://docs.sepasoft.com/articles/user-manual/mes-with-sepasoft-modules", type: "docs", source: "Sepasoft" },
    { title: "Install Ignition Sepasoft Modules and Apply License", url: "https://docs.sepasoft.com/articles/user-manual/install-ignition-sepasoft-modules-and-apply-license", type: "docs", source: "Sepasoft" },
    { title: "Sepasoft versioning scheme", url: "https://docs.sepasoft.com/articles/knowledge-base/sepasoft-versioning-scheme-3-0", type: "docs", source: "Sepasoft" },
    { title: "Sepasoft MES downloads and release status", url: "https://www.sepasoft.com/downloads/", type: "article", source: "Sepasoft" },
    { title: "Batch Procedure vs. Settings & Changeover", url: "https://www.sepasoft.com/blog/learn/batch-procedure-vs-settings-and-changeover/", type: "article", source: "Sepasoft" },
    { title: "Sepasoft, Premier Technology Provider", url: "https://inductiveautomation.com/partners/technology-providers/sepasoft/", type: "article", source: "Inductive Automation" },
    { title: "OEE Demo Project (Ignition 8.3)", url: "https://docs.sepasoft.com/articles/mes-module-tutorials/oee-demo-project-ignition-8-3", type: "docs", source: "Sepasoft" }
  ]
});
