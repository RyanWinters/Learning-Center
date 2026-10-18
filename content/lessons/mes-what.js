LC.lesson({
  id: "mes-what",
  title: "What MES is: ISA-95 Part 3",
  track: "mes",
  minutes: 20,
  level: 2,
  prereqs: ["found-purdue"],
  tags: ["mes", "isa-95", "level-3", "mesa", "scope"],
  summary: "MES is the layer that knows what the plant is supposed to make, what it actually made, and how well it went. ISA-95 Part 3 gives you the vocabulary to scope it.",
  objectives: [
    "Place MES at Level 3 and say what it exchanges with ERP above and control below",
    "Name the four operations categories and the eight generic activities in the ISA-95 Part 3 model",
    "List the MESA-11 functions and use them as a scoping checklist",
    "Say what MES is not, and spot when a request is really a SCADA or ERP job",
    "Frame the build vs buy decision for a first MES project"
  ],

  body: `
## What MES is and why you should care

A {{term:mes|Manufacturing Execution System}} manages and records production while it is happening. It sits between {{term:erp|ERP}}, which knows orders, customers and money, and the control layer, which knows pumps, motors and setpoints. ERP says "make 10,000 units of product A this week." The PLC does not know what product A is. MES is the layer that turns the first sentence into something the line can act on, and turns what the line did back into records ERP and quality can use.

If you build {{term:perspective|Perspective}} screens today, you already touch Level 3 data: counts, states, downtime, recipes. The move to integrator is learning to see it as a system with defined activities, rather than a collection of screens and tables.

## Where it sits

In the {{term:purdue-model|Purdue model}} (see {{lesson:found-purdue}}), Levels 0 to 2 are sensing, control and supervision. Level 4 is business planning. Level 3 is **manufacturing operations management**. {{term:isa-95|ISA-95}} (also published as IEC 62264) is the standard family that defines the boundary between Levels 3 and 4 and the activities inside Level 3.

- **Part 1** gives models and terminology.
- **Part 2** defines object models and attributes for the information exchanged across the Level 3/4 boundary.
- **Part 3** is the activity model for manufacturing operations management. This is the lesson.
- **Part 4** defines object models and attributes for the operations-management activities themselves (for example schedules, performance and work records). Part numbering and scope have changed between editions, so check the edition you are working from.

## The four operations categories

Part 3 treats Level 3 as four categories of operations. Each has the same internal shape.

| Category | Typical content |
|---|---|
| Production operations | Work orders, running the line, counts, consumption, yield |
| Quality operations | Inspections, test results, SPC, hold and release |
| Maintenance operations | Work requests, PMs, equipment status, calibration |
| Inventory operations | Material lots, locations, movements, WIP |

Real products blur the borders. A "MES" might do production and quality and hand maintenance to a {{term:cmms|CMMS}}. That is normal. The model lets you say clearly which category a given feature belongs to and who owns it.

## The activity model

For each category, Part 3 describes a set of generic activities. Think of them as a loop that runs from "what is the plan" to "how did we do."

{{diagram:activities}}

| Activity | What it answers | Example |
|---|---|---|
| Definition management | What is the product and how do we make it? | Recipe, bill of materials, routing |
| Resource (capability) management | What do we have available to do it? | Which lines are up, which operators are qualified, how much material |
| Detailed scheduling | Who does what, and when? | Sequence of work orders on Line1 |
| Dispatching | Release specific work to a resource | Operator sees the next order on the HMI |
| Execution management | Run the work in the right order | Steps, interlocks, holds |
| Data collection | What was measured and counted? | Counts, temperatures, scans, operator entries |
| Tracking | Where is each thing and what happened to it? | Lot genealogy, WIP location |
| Performance analysis | How did we do against plan and target? | OEE, yield, scrap, schedule adherence |

The last box feeds the first: analysis tells you the ideal cycle time you assumed is wrong, so definition management changes the product's standard rate. Most of the other lessons in this track dive into one or two of these boxes: {{lesson:mes-oee}} and {{lesson:mes-downtime}} are data collection and analysis, {{lesson:mes-track-trace}} is tracking, {{lesson:mes-batch}} is execution management for recipe-driven processes.

> [!example] One order through the loop
> ERP releases work order WO-48213: 10,000 units of SKU 7750, ship Friday. **Definition** supplies the recipe and bill of materials. **Resource management** confirms Line1 is available and the resin lots are on hand. **Scheduling** puts the order on Line1 Tuesday. **Dispatching** pushes it to the Line1 operator screen. **Execution** runs it. **Data collection** records counts, rejects and downtime from the PLC. **Tracking** links finished pallets to the resin lots. **Analysis** reports 9,640 good units and OEE of 71 percent, and that goes back to ERP as actuals.

## The MESA-11 view

Before ISA-95 Part 3 matured, the MES industry association (MESA International) published a list of eleven functions that an MES typically covers. It is older, less formal, and still the most common scoping checklist you will see in RFQs and vendor brochures.

1. Resource allocation and status
2. Operations and detailed scheduling
3. Dispatching production units
4. Document control
5. Data collection and acquisition
6. Labor management
7. Quality management
8. Process management
9. Maintenance management
10. Product tracking and genealogy
11. Performance analysis

The two views map onto each other well. MESA-11 is easier to read in a sales meeting, and the ISA-95 activity model is better for drawing boundaries between systems. Use MESA-11 to ask a customer "which of these do you need?" and Part 3 to decide where each one will live.

## What MES is not

- **Not SCADA.** SCADA (see {{term:scada|SCADA}}) supervises and controls in real time, with second-level response and a focus on process values and alarms. MES works in shift, order and lot time. A SCADA screen shows tank level. An MES screen shows which batch is in the tank.
- **Not ERP.** ERP owns financials, purchasing, customer orders and planning at the week or month scale. MES does not replace it. It feeds it actuals.
- **Not a {{term:historian|historian}}.** A historian stores time series by tag. MES stores events and records tied to orders, lots and equipment states, often reading from the historian.
- **Not the controller.** Safety, interlocks and machine sequencing stay in the PLC. MES sends a recipe or a target and receives status. It never sits in a control loop.
- **Not a single product.** Plants have run MES on spreadsheets, on SQL and Ignition, and on seven-figure suites.

## Build vs buy: the overview

Controls engineers often ask whether to build an MES on Ignition or buy a packaged one. There is no universal answer, but the tradeoffs are consistent.

| Option | Strengths | Risks |
|---|---|---|
| Buy a full suite | Broad functions out of the box, validation packages, vendor support | Cost, long implementation, rigid workflows, often a separate IT-owned platform |
| Ignition plus a module set (for example Sepasoft MES modules, covered in {{lesson:mes-sepasoft}}) | Reuses your tags, security and screens; modular; priced by function | You still design the model, reason codes and integrations |
| Build from Ignition and SQL | Maximum fit, lowest license cost | You own every bug, upgrade and missing report; staff turnover risk |

A practical rule: buy or license the parts that are standard and hard to get right (OEE state engines, genealogy models, scheduling), build the parts that are specific to the plant (screens, rules, label formats). Whichever way you go, get a written scope against MESA-11 or Part 3 before any code. Most MES failures are scope failures: nobody agreed on what "downtime tracking" included.

## A first MES scoping exercise

When a customer says "we need MES," ask five questions.

1. What decisions are made today from paper, whiteboards and spreadsheets?
2. What must be traceable, and for how long?
3. What does ERP expect back, and how often?
4. Which lines are in the first phase, and what data can the PLCs already provide?
5. Who owns the master data (products, recipes, reason codes) after go-live?

The answers decide which activities you build first. Most plants start with data collection and analysis (OEE and downtime) because it needs the least master data and gives visible wins. Genealogy comes next when a customer or regulator demands it.
`,

  eli5: `
Think of a bakery. The owner in the front office takes orders and pays the bills: "Forty chocolate cakes for Saturday." The ovens in the back just bake whatever is put in them at whatever temperature is set.

Somebody has to sit in the middle. That person writes the day's baking list, checks there is enough flour and eggs, hands each baker the right recipe, counts how many cakes came out good and how many were burnt, notes which bag of flour went into which batch, and tells the owner at the end how the day went.

That middle person is what a manufacturing execution system does. It is not the oven and it is not the owner's accounting book. It is the clipboard and the whiteboard that connect the two, kept by software so nothing gets lost when the baker goes home.
`,

  why: `
**Why a standard activity model at all?** Without one, every MES project invents its own scope and vocabulary. One person says "scheduling" and means a Gantt chart; another means the operator picking the next order. The ISA-95 split into definition, scheduling, dispatching, execution, data collection, tracking and analysis lets a team write down exactly which pieces are in scope and which belong to ERP, to the CMMS or to the PLC.

**Why the Level 3 / Level 4 line matters.** The costly mistakes are at that boundary. If ERP also tries to hold real-time line state, or MES tries to own purchasing, you end up with two systems of record and constant reconciliation. Experienced integrators argue about where finite scheduling lives, and the honest answer is "it depends on who has the better data." What they agree on is that you must decide on purpose and write it down.

**Why not start with the biggest MES?** The tradeoff is time to value against fit. A full suite fits many industries and takes a year to configure. A modular build on Ignition can show OEE on one line in weeks, but you carry the design. Integrators who have done several projects tend to start small, on one line and one or two activities, and expand once the master data is clean.

**Why MESA-11 still shows up.** Customers and RFQs use it because it reads like a shopping list. Use it for conversation, then translate to Part 3 for design. It keeps you from missing a function the customer assumed was included, such as labor management or document control.

**What goes wrong.** Projects fail when MES becomes a data collection project with no owner for master data, when reason codes are copied from another plant, or when the PLC cannot supply states cleanly. Those are why this track spends so much time on the plant floor interface.
`,

  history: `
MESA International published its list of eleven MES functions in the 1990s, and it was the first widely shared description of what an MES does. The ISA-95 standard family was developed by the International Society of Automation to define the boundary between enterprise and control systems, and it is also published as IEC 62264. Part 3, the activity models for manufacturing operations management, was published as ANSI/ISA-95.00.03-2013. It is written as UML activity diagrams and names the activities without tying them to particular products.
`,

  examples: [
    {
      title: "Sorting a customer request into activities",
      body: `A packaging plant asks for "a screen where operators pick the next job, a report of why the line stopped, and a way to find which film roll went into a pallet." Mapped: picking the job is **dispatching**, the stop report is **data collection** and **performance analysis**, finding the film roll is **tracking** (genealogy). None of it is scheduling, so you do not need a scheduler. The scope becomes three small features instead of "an MES."`
    },
    {
      title: "Where a request does not belong",
      body: `A manager asks MES to start the filler when the order is released. Starting a machine is control. The right design has MES write a recipe and an "order released" flag to the PLC, and the PLC's own state machine decides when it is safe to run. MES supplies intent, the PLC owns action.`
    }
  ],

  diagrams: {
    activities: `<svg viewBox="0 0 640 250" role="img" aria-label="ISA-95 Part 3 activity loop: definition, capability, scheduling, dispatching, execution, data collection, tracking, analysis, with ERP above and the control layer below">
  <defs>
    <marker id="mes-what-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box-accent" x="20" y="12" width="600" height="34" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="34">Level 4: ERP (orders, materials, actuals)</text>
  <rect class="dg-box" x="20" y="64" width="140" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="90" y="90">Definition</text>
  <rect class="dg-box" x="170" y="64" width="140" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="240" y="90">Capability</text>
  <rect class="dg-box" x="320" y="64" width="140" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="390" y="90">Scheduling</text>
  <rect class="dg-box" x="470" y="64" width="150" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="545" y="90">Dispatching</text>
  <rect class="dg-box" x="470" y="124" width="150" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="545" y="150">Execution</text>
  <rect class="dg-box" x="320" y="124" width="140" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="390" y="150">Data collection</text>
  <rect class="dg-box" x="170" y="124" width="140" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="240" y="150">Tracking</text>
  <rect class="dg-box" x="20" y="124" width="140" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="90" y="150">Analysis</text>
  <line class="dg-line" x1="160" y1="86" x2="168" y2="86" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="310" y1="86" x2="318" y2="86" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="460" y1="86" x2="468" y2="86" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="545" y1="108" x2="545" y2="122" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="470" y1="146" x2="462" y2="146" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="320" y1="146" x2="312" y2="146" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="170" y1="146" x2="162" y2="146" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="90" y1="124" x2="90" y2="110" marker-end="url(#mes-what-ah)"/>
  <rect class="dg-box-accent" x="20" y="196" width="600" height="40" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="214">Level 2 and below: PLCs, HMI, sensors</text>
  <text class="dg-text-muted dg-mid" x="320" y="230">states, counts, faults in; recipes and targets out</text>
  <line class="dg-line" x1="545" y1="168" x2="545" y2="194" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="390" y1="194" x2="390" y2="170" marker-end="url(#mes-what-ah)"/>
  <line class="dg-line" x1="320" y1="48" x2="320" y2="62" marker-end="url(#mes-what-ah)"/>
</svg>`
  },

  pitfalls: [
    "Treating MES as a bigger SCADA and putting control logic or interlocks in it. Keep machine control in the PLC.",
    "Starting with a scope of 'everything in MESA-11' instead of one line and one or two activities.",
    "Leaving master data (products, recipes, reason codes) without an owner, so the system fills with inconsistent names.",
    "Letting ERP and MES both hold the order status, creating two systems of record.",
    "Buying a suite or building a custom system before writing down which activities are in scope."
  ],

  keyTerms: ["mes", "isa-95", "erp", "cmms", "historian", "scada", "purdue-model", "mesa-11", "work-order", "mes-master-data"],

  quiz: [
    {
      q: "An operator needs to see the next work order for Line1 on a screen when the previous one completes. Which ISA-95 activity is this?",
      options: ["Definition management", "Dispatching", "Tracking", "Performance analysis"],
      answer: 1,
      explain: [
        "Definition management holds the product and recipe, not the release of work to a resource.",
        "Correct. Dispatching releases specific work to a resource at the right time.",
        "Tracking records where things are and what happened to them, after the fact.",
        "Analysis measures results. It does not release work."
      ]
    },
    {
      q: "A customer wants MES to open a valve when a tank reaches 80 percent so the process stays safe. What is the best response?",
      options: ["Put it in ERP","Put it in the historian","Build it in MES, since MES has the data","Keep that logic in the PLC and have MES supply recipe and targets only"],
      answer: 3,
      explain: [
        "ERP is the planning layer and is even further from real time.",
        "A historian stores data. It does not run logic.",
        "MES works in shift and order time and is not a deterministic controller. Safety and process logic do not belong there.",
        "Correct. The PLC owns control and interlocks. MES passes intent and receives status."
      ]
    },
    {
      q: "Which statement best separates MES from a historian?",
      options: ["A historian stores time series per tag; MES records events tied to orders, lots and equipment states", "MES stores data faster", "Historians cannot store production counts", "MES replaces the need for tags"],
      answer: 0,
      explain: [
        "Correct. The historian is organized by tag and time. MES is organized by order, lot, equipment and event, and often reads the historian.",
        "Speed is not the difference. They answer different questions.",
        "A historian can store any tag, including counts.",
        "MES still reads values from tags."
      ]
    },
    {
      q: "Why do integrators use MESA-11 during scoping even though ISA-95 Part 3 is more formal?",
      options: ["It reads like a checklist customers recognize, so it is good for deciding which functions are wanted","It defines the database schema","It is required for compliance","It is newer than ISA-95"],
      answer: 0,
      explain: [
        "Correct. It is easy to discuss in a meeting. Part 3 is better for deciding which system owns each activity.",
        "Neither MESA-11 nor Part 3 defines a database schema.",
        "It is a scoping aid, not a compliance requirement.",
        "MESA-11 is the older view."
      ]
    },
    {
      q: "A plant wants quick wins on a first MES project with little master data prepared. Where is the most sensible place to start?",
      options: ["Replacing ERP planning","Detailed finite scheduling across all lines","Data collection and performance analysis (OEE and downtime) on one line","Full genealogy for every product"],
      answer: 2,
      explain: [
        "MES supplements ERP and does not replace it.",
        "Scheduling needs clean routings, capacities and master data that are not ready yet.",
        "Correct. OEE and downtime need the least master data and show value quickly.",
        "Genealogy needs reliable lot identification and scanning, which takes more setup."
      ]
    },
    {
      q: "What is the most common reason MES projects fail, according to the scoping advice in this lesson?",
      options: ["Nobody agreed on exactly what was in scope or who owns master data","PLCs cannot send data","Ignition cannot store the records","The software is too slow"],
      answer: 0,
      explain: [
        "Correct. Unclear scope and unowned master data cause most of the pain.",
        "PLC data quality can be a problem, but it is a symptom of design choices, not a hard limit.",
        "Ignition with a SQL database stores this kind of data routinely.",
        "Performance rarely drives failure at this scale."
      ]
    }
  ],

  resources: [
    { title: "ISA-95 Standard: Enterprise-Control System Integration", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard", type: "standard", source: "ISA" },
    { title: "The ISA-95 Enterprise-Control System Integration standards (InTech)", url: "https://www.isa.org/intech/2020/september-october/the-isa-95-enterprise-control-system-integration-s", type: "article", source: "ISA InTech" },
    { title: "Using ISA95 for Industry 4.0 and Smart Manufacturing (InTech)", url: "https://www.isa.org/getmedia/5e1e6f16-428c-4e3b-9e3b-47fa6884fbc1/InTech-October-2021.pdf", type: "article", source: "ISA InTech" },
    { title: "Using Sepasoft MES Modules", url: "https://docs.sepasoft.com/articles/user-manual/mes-modules", type: "docs", source: "Sepasoft" },
    { title: "Sepasoft MES platform", url: "https://www.sepasoft.com/", type: "article", source: "Sepasoft" }
  ]
});
