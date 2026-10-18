LC.lesson({
  id: "int-lifecycle",
  title: "Project lifecycle: proposal to handover",
  track: "int",
  minutes: 20,
  level: 2,
  prereqs: ["found-roles"],
  tags: ["projects", "lifecycle", "FAT", "SAT", "estimating", "change orders", "handover"],
  summary: "Every integrator project walks the same path from RFQ to warranty. Know the phases, the paperwork at each gate, and the places where money and goodwill leak away.",
  objectives: [
    "List the phases of an integration project in order and name the deliverable that closes each one",
    "Choose between fixed price, time and materials and a hybrid, and say what risk each one moves",
    "Explain how URS, FDS and detailed design relate to each other and to FAT and SAT",
    "Distinguish FAT, SAT and commissioning, and say who signs what",
    "Spot the common ways a project goes wrong and the control that prevents each"
  ],

  body: `
## Why the lifecycle matters

A process engineer usually meets a project in the middle: the design is done, the scope is known, and the job is to make the plant run. An integrator lives the whole arc, starting before there is a contract and ending when the warranty expires. Most profit and most pain is decided early, in the proposal and the specification, long before anyone opens Designer or Studio 5000. If you learn the phases and the paperwork, you will know what to ask for at each gate and what to refuse to start without.

The names vary by company. The Control System Integrators Association (CSIA) Best Practices manual treats a system development lifecycle (kickoff, requirements, design review and so on) as a core audited area of a mature integrator, which is a good sign that the shape below is industry normal.

{{diagram:phases}}

## Phase 1: Proposal

### RFQ and RFP

The customer opens with an {{term:rfq|RFQ or RFP}}. A request for quote is mostly about price for a defined scope. A request for proposal asks the integrator to propose an approach and is judged on more than price. Either one usually arrives with a few drawings, an I/O count, a one-page description of the process and a date by which bids are due.

Your first job is to decide whether to bid at all. Ask whether the scope is understood, whether the schedule is possible, whether the customer has paid integrators on time before, and whether you have people free in the build window. A bid you should not win costs more than a bid you decline.

### Scoping and estimating

Estimating is where a process engineer's plant knowledge pays off. A usual method is to break the job into work packages and size each from counts:

| Work package | Driver | Example sizing |
|---|---|---|
| PLC programming | I/O points, unique equipment types | 480 I/O, 6 motor types, 4 PID types |
| HMI / SCADA screens | screens, faceplates, tag count | 25 screens, 6 faceplates |
| Database and reports | tables, reports | 3 reports, 1 downtime schema |
| Documentation | FDS pages, manuals | 60-page FDS, O&M binder |
| Testing | FAT days, SAT days | 3 days FAT, 5 days SAT |
| Project management | percent of total | 10 to 15 percent |
| Travel and site | days on site | 20 days, 2 people |

Add contingency for the risk you cannot size. Write the **assumptions** into the proposal, for example "customer supplies the final P&IDs by week 2" and "the existing PLC code is not modified." Assumptions are what you point to later when scope drifts.

### Fixed price vs time and materials

| Model | Customer pays | Risk sits with | Works best when |
|---|---|---|---|
| Fixed price | agreed sum, usually milestone billed | integrator | scope is well defined and stable |
| Time and materials (T&M) | hours worked at rates, plus materials | customer | scope is vague or exploratory |
| T&M with a cap (not-to-exceed) | hours, up to a ceiling | shared | scope is mostly known |
| Hybrid | fixed for design, T&M for site | split by phase | site conditions are unknown |

Fixed price rewards a tight specification and punishes a loose one. That is the single best argument for writing a good {{lesson:int-fds}}: the FDS is the document that defines what "fixed" means. Many integrators bid a small paid **discovery phase** (T&M) to produce the FDS, then quote the build as fixed price against it. The {{term:sow|statement of work}} in the contract states what is included, what is excluded and the assumptions.

## Phase 2: Kickoff and design

### Kickoff

The kickoff meeting puts the customer, the project manager, the lead engineer and often the electrical contractor in one room (or call). Settle the contacts, the schedule, who reviews documents and how fast, how changes are requested, and what the customer must supply: network access, drawings, process data, equipment on site. Write minutes and send them out. A decision that is not in writing did not happen.

### URS to FDS to detailed design

Three documents form a chain, and each one answers a different question.

| Document | Owner | Question it answers |
|---|---|---|
| URS (user requirement specification) | customer | What do we need the system to achieve? |
| {{term:fds|FDS}} (functional design specification) | integrator, approved by customer | What exactly will the system do, in operator and process terms? |
| Detailed design | integrator | How is it built: panel drawings, network layout, code structure, tag model? |

The URS says "the operator must be able to start and stop the transfer pumps and be alarmed on low suction pressure." The FDS says which pump, which permissives, what the low pressure setpoint and delay are, and what the screen looks like. Detailed design turns that into electrical drawings, a bill of materials, PLC program structure, an {{term:io-list|I/O list}} and a tag naming plan. The customer's signature on the FDS is the project's most valuable asset. After it, a change is a change order.

## Phase 3: Build and test

### Build

Panels are built and wired in the shop, the PLC and HMI/SCADA software is written, and the database and reporting pieces are stood up. Use a shared version-controlled project, follow a naming standard and run internal code reviews. A second engineer reading your logic finds bugs the author never will.

### Internal test

Before the customer sees anything, the team tests against its own checklist. Simulate I/O (many teams use a simulation routine in the PLC or a software emulator), walk every sequence, trip every interlock and force every alarm. Anything the customer finds during {{term:fat|FAT}} that you could have found yourself costs trust, not just time.

### FAT

The Factory Acceptance Test happens at the integrator's shop with the customer present, against a written test procedure traced to the FDS. Each test step lists the action, the expected result, pass or fail, a date and an initial. Defects go on a {{term:punch-list|punch list}} with an owner and a due date. A signed FAT is the customer's permission to ship, and it often triggers a milestone payment.

### Shipping and installation

Panels ship, the electrical contractor sets and terminates field wiring, and the integrator supports. Damage in transit, missing field devices and unfinished field wiring are the usual delays. Your job here is mostly to answer questions fast and to keep a list of everything that blocks you.

## Phase 4: Site

### Loop checks and commissioning

{{term:commissioning|Commissioning}} proves the installed system with the real plant. Loop checks verify every signal end to end: field device, wire, I/O card, tag, screen. Then you tune loops, prove interlocks and run sequences with product or water. See {{lesson:int-commissioning}} for the detailed method.

### SAT

The Site Acceptance Test repeats the key FAT tests in the real environment, plus the ones that only work on site: communications to other systems, real instrument ranges, safety functions with the real trip points. Many contracts define {{term:sat|SAT}} as the final acceptance event. The plant's operations lead signs.

### Training

Train operators, maintenance staff and the IT or controls team separately. Operators need screens and normal and abnormal procedures. Maintenance needs diagnostics and spares. IT needs backups, accounts, ports and patching. Record attendance. Training is often a contract line item that gets cut when time runs short, and it is the first thing the customer remembers when the system "doesn't work."

### Handover and warranty

Handover delivers the as-built package: final drawings, final FDS, program and project backups, the tag list, passwords and licenses transferred to the customer, test records, spare parts list and the O&M manuals. Then the **warranty** period starts, commonly 12 months, during which the integrator fixes defects at no charge. Define what counts as a defect (it does not work as the FDS says) versus an enhancement (the customer now wants something new, a change order).

> [!example] Worked example: a transfer-pump station
> Estimate: 120 I/O, 3 pump types, 8 screens, 1 report. Design and build hours: PLC 160 h, HMI 120 h, FDS 60 h, testing and FAT 60 h, PM 50 h, total 450 h at 150 per hour is 67,500. Add a 10 percent contingency (6,750) and the fixed price for design, build and FAT is 74,250. Site work (commissioning and SAT) is not in that figure. It is estimated separately at 100 h, 15,000 at the same rate, and billed T&M capped at 15,000 because the existing tank farm wiring is unverified. The most the customer pays for labor is 74,250 + 15,000 = 89,250, and each hour is counted once. Milestones on the fixed part: 20 percent at FDS approval, 40 percent at FAT sign-off, 30 percent at SAT, 10 percent at the end of warranty. Panel hardware and field devices are quoted as materials on top.

## Change orders

A {{term:change-order|change order}} is a written, priced and signed modification to scope, price or schedule. The rule is short: do not start extra work until the change order is signed, or at least until the customer has emailed an approval of the price. Verbal "while you're here, can you also..." requests are the most expensive sentences in integration. Keep a change log with a number, description, hours, price, requester and status. Good customers like a change log because it shows control.

## Where projects go wrong

| Failure | What it looks like | Control |
|---|---|---|
| Vague scope | "The system shall be user friendly" | Specific FDS with measurable behavior |
| Late or missing information | Drawings arrive after programming starts | Assumptions in the SOW, dates in the kickoff minutes |
| Unsigned FDS | Customer disputes behavior at FAT | Signature gate before build |
| Scope creep | Many small additions | Change log and change orders |
| Skipped internal test | Customer finds basic bugs at FAT | Own test checklist, second reviewer |
| Site not ready | Engineers wait for power, network or product | Readiness checklist before mobilizing |
| No training time | Operators reject the system | Training as a milestone |
| Unclear acceptance | Project never closes | Written acceptance criteria and a final sign-off |
`,

  eli5: `
Think of building a custom treehouse for a family. First the family tells you what they want (the request). You walk the yard, count the boards and nails you'll need and give a price (the quote). Then you sit down together, agree on a drawing, and sign it (the specification). If they later say "can we add a slide?", you say "sure, here is what it costs," and they say yes before you cut any wood. That is the change order.

You build most of the treehouse in your garage, test that the pieces fit, and let the family look at it there (the factory test). Then you move it to their yard, bolt it together and let the kids climb on it while you watch (the site test). You show everyone how to use the rope ladder and the trap door (training), hand over the instruction sheet and the spare bolts, and promise to come back and fix anything that breaks in the first year (warranty).

Most treehouse arguments happen because the family and the builder pictured different treehouses and nobody wrote it down.
`,

  why: `
**Why so much paper?** Because the project has two sides with different incentives, and the paperwork is how they stay honest. The customer wants more for the same money. The integrator, under a fixed price, wants to build the minimum that satisfies the words. A good FDS and a clear change process make the argument about the document, not about people. Experienced integrators say a signed specification is the cheapest insurance on the project.

**Why bid fixed price at all?** Customers like a known number, and a good integrator earns a margin by being efficient and having reusable standards. The argument against fixed price is that it punishes honesty: if the customer discovers a new requirement, they hesitate to mention it. Time and materials avoids that, but gives the customer no cost ceiling. Hybrids are popular because they price the unknown honestly. Which one is right depends on how well the scope is known, not on the integrator's preference.

**Why test at the factory?** A defect found at FAT costs a few hours at a desk. The same defect found at SAT costs travel, idle operators and an unhappy plant manager. Pushing testing earlier is the largest single quality lever you have, which is why mature integrators invest in simulation and automated test scripts.

**Why do projects go wrong near the end?** Because the early phases are paid for, visible and exciting, while the last 10 percent (punch list, documentation, training, backups) is dull and gets squeezed by the schedule. Budget the tail explicitly.

**What integrators argue about:** how detailed an FDS should be, how much to give away free to keep a customer, and whether to hold final payment until warranty ends. Reasonable people differ, but all of them agree about writing it down.
`,

  examples: [
    {
      title: "A change order that saved the margin",
      body: `Midway through build, the operations manager asks for an end-of-shift report that was not in the FDS. The project manager estimates 18 hours at 150 per hour, 2,700, emails a one-page change order with the schedule impact (two days) and asks for a signature. The report is built after approval and appears on the change log as CO-003. Without the paper, the 18 hours would have come out of the project's profit.`
    },
    {
      title: "A FAT test step",
      body: `Step 14. Action: with Pump P-101 in AUTO, force LT-101 above 80 percent. Expected: P-101 starts within 5 s, alarm LAH-101 annunciates at Priority Medium, HMI shows pump running. Reference: FDS 4.2.3. Result: pass or fail, initials, date. Every step traces to a clause, so a failure has an obvious owner.`
    }
  ],

  diagrams: {
    phases: `<svg viewBox="0 0 640 250" role="img" aria-label="Project lifecycle in two rows: proposal, scoping, kickoff, FDS, detailed design; then build, internal test, FAT, installation, SAT and commissioning, handover and warranty">
  <defs><marker id="int-lifecycle-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <text class="dg-title" x="20" y="24">Define</text>
  <rect class="dg-box" x="20" y="36" width="104" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="72" y="67">RFQ / RFP</text>
  <rect class="dg-box" x="142" y="36" width="104" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="194" y="67">Estimate</text>
  <rect class="dg-box" x="264" y="36" width="104" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="316" y="67">Kickoff</text>
  <rect class="dg-box-accent" x="386" y="36" width="104" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="438" y="67">URS to FDS</text>
  <rect class="dg-box" x="508" y="36" width="112" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="564" y="67">Detail design</text>
  <line class="dg-line" x1="124" y1="62" x2="140" y2="62" marker-end="url(#int-lifecycle-ah)"/>
  <line class="dg-line" x1="246" y1="62" x2="262" y2="62" marker-end="url(#int-lifecycle-ah)"/>
  <line class="dg-line" x1="368" y1="62" x2="384" y2="62" marker-end="url(#int-lifecycle-ah)"/>
  <line class="dg-line" x1="490" y1="62" x2="506" y2="62" marker-end="url(#int-lifecycle-ah)"/>
  <text class="dg-title" x="20" y="136">Deliver</text>
  <rect class="dg-box" x="20" y="148" width="92" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="66" y="179">Build</text>
  <rect class="dg-box" x="124" y="148" width="92" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="170" y="179">Int. test</text>
  <rect class="dg-box-accent" x="228" y="148" width="92" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="274" y="179">FAT</text>
  <rect class="dg-box" x="332" y="148" width="92" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="378" y="179">Install</text>
  <rect class="dg-box-accent" x="436" y="148" width="92" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="482" y="173">SAT +</text>
  <text class="dg-text-sm dg-mid" x="482" y="190">commission</text>
  <rect class="dg-box" x="540" y="148" width="80" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="580" y="173">Handover</text>
  <text class="dg-text-sm dg-mid" x="580" y="190">+ warranty</text>
  <line class="dg-line" x1="112" y1="174" x2="122" y2="174" marker-end="url(#int-lifecycle-ah)"/>
  <line class="dg-line" x1="216" y1="174" x2="226" y2="174" marker-end="url(#int-lifecycle-ah)"/>
  <line class="dg-line" x1="320" y1="174" x2="330" y2="174" marker-end="url(#int-lifecycle-ah)"/>
  <line class="dg-line" x1="424" y1="174" x2="434" y2="174" marker-end="url(#int-lifecycle-ah)"/>
  <line class="dg-line" x1="528" y1="174" x2="538" y2="174" marker-end="url(#int-lifecycle-ah)"/>
  <path class="dg-line" d="M564 88 L564 112 L66 112 L66 146" fill="none" marker-end="url(#int-lifecycle-ah)"/>
  <text class="dg-text-muted" x="20" y="232">Highlighted boxes are the customer sign-off gates: FDS approval, FAT and SAT.</text>
</svg>`
  },

  pitfalls: [
    "Starting to build before the FDS is signed, then arguing about what was agreed.",
    "Doing small extras for free, with no change log, until the margin is gone.",
    "Leaving assumptions out of the proposal, so late drawings or unknown field wiring become your problem.",
    "Skipping internal testing and using FAT to find your own bugs in front of the customer.",
    "Treating training, documentation and backups as a last-day task.",
    "Using vague acceptance wording, so the project never formally closes and warranty never starts."
  ],

  keyTerms: ["rfq", "sow", "fds", "urs", "fixed-price", "time-and-materials", "fat", "sat", "commissioning", "punch-list", "change-order", "project-kickoff"],

  quiz: [
    {
      q: "A customer asks you to bid fixed price on a plant upgrade, but the existing wiring has never been documented. Which approach best manages risk?",
      options: ["Bid fixed price for everything and add a large unstated buffer", "Refuse to quote until the customer redraws the whole plant", "Bid pure time and materials with no cap", "Bid fixed price for design and build, and T&M with a cap for the site work that depends on unknown wiring"],
      answer: 3,
      explain: [
        "An unstated buffer hides the risk instead of pricing it, and customers dislike discovering hidden padding. It also does not protect you if the wiring is far worse than expected.",
        "That is rarely realistic and loses the job. A hybrid gets you to the same protection faster.",
        "It moves all risk to the customer, who will likely not accept it for a job that could be partly defined.",
        "Correct. A hybrid prices what is known as fixed and shares the unknown, with written assumptions about the wiring."
      ]
    },
    {
      q: "What is the relationship between the URS and the FDS?",
      options: ["The URS states what the customer needs, and the FDS states exactly how the delivered system will behave to meet it", "They are the same document with two names", "The FDS is written by the customer, the URS by the integrator", "The URS describes panel wiring and the FDS describes PLC code"],
      answer: 0,
      explain: [
        "Correct. The URS is the need, and the FDS is the integrator's committed, detailed answer that the customer approves.",
        "They differ in detail and owner. The URS is broad and written from the customer's view.",
        "It is the other way around. The customer normally owns the URS.",
        "Wiring and code structure belong to detailed design, which follows the FDS."
      ]
    },
    {
      q: "During build, the plant manager asks you in the hallway to add a shift report. What should you do?",
      options: ["Add it quietly, since it is a small request and keeps the customer happy", "Say no, because anything outside the FDS is forbidden", "Estimate it, send a written change order, and begin after approval", "Wait until SAT and build it as a warranty item"],
      answer: 2,
      explain: [
        "Unlogged extras accumulate, and the hours come out of your margin and your schedule.",
        "Refusing outright is unhelpful. The change process exists so that the work can happen, with a price.",
        "Correct. A priced and approved change order keeps the budget and schedule honest.",
        "A new feature is an enhancement, not a defect, and warranty does not cover it."
      ]
    },
    {
      q: "Which statement best separates FAT from SAT?",
      options: ["FAT tests software only, and SAT tests wiring only", "FAT happens at the integrator's facility against the FDS, and SAT happens at the customer's site in the real environment", "FAT is run by the customer alone, and SAT by the integrator alone", "They are two names for the same test"],
      answer: 1,
      explain: [
        "Both can cover software and hardware. The location and conditions differ.",
        "Correct. Same traceable procedure approach, different place and conditions. SAT adds site-only items such as real communications and instrument ranges.",
        "Both are normally witnessed together, with the customer signing.",
        "They are separate gates, often tied to separate payment milestones."
      ]
    },
    {
      q: "A project is 'done' but the customer has not yet signed acceptance, the as-builts are missing and the warranty clock has not started. What is the most likely root cause?",
      options: ["The warranty period was too long", "FAT was skipped", "The estimate used T&M", "Acceptance criteria and handover deliverables were not defined in the contract"],
      answer: 3,
      explain: [
        "Warranty length does not prevent acceptance from being signed.",
        "Skipping FAT causes other problems, but it does not explain missing as-builts and acceptance.",
        "The pricing model is unrelated to the closing paperwork.",
        "Correct. Without written acceptance criteria and a handover list, there is no moment at which the project is complete."
      ]
    }
  ],

  resources: [
    { title: "CSIA Best Practices and Benchmark Manual (V6.1)", url: "https://controlsys.org/wp-content/uploads/2024/05/BPB-V6.1-Release.pdf", type: "standard", source: "Control System Integrators Association" },
    { title: "CSIA Best Practices Manual V6 Summary and FAQs", url: "https://controlsys.org/wp-content/uploads/2024/07/CSIA_Best_Practices_Manual_Summary.pdf", type: "article", source: "Control System Integrators Association" },
    { title: "Systems integrators add to the success of projects", url: "https://www.isa.org/intech-home/2018/november-december/departments/systems-integrators-add-to-the-success-of-automati", type: "article", source: "ISA InTech" },
    { title: "SCADA lifecycle diagram (FAT, SAT, loop checks, burn-in)", url: "https://www.isa.org/getmedia/ac809e6d-27ed-4305-b207-9813b04f43b4/ISA112_SCADA-Systems_SCADA-lifecycle-diagram_rev2020-06-15.pdf", type: "standard", source: "ISA112 committee" },
    { title: "CSIA certification", url: "https://controlsys.org/certification/", type: "article", source: "Control System Integrators Association" }
  ]
});
