LC.lesson({
  id: "mes-recipes",
  title: "Recipes, settings and changeovers",
  track: "mes",
  minutes: 15,
  level: 3,
  prereqs: ["mes-batch"],
  tags: ["recipes", "changeover", "smed", "plc-handshake", "versioning"],
  summary: "Where product settings should live, how to get them into a PLC safely, and how to make switching products faster and less error-prone.",
  objectives: [
    "Describe what a recipe parameter set contains and which values belong in it",
    "Compare storing recipes in PLC arrays, a database and an MES",
    "Build a download and verify handshake between SCADA and a PLC",
    "Explain recipe versioning and approval, and why running batches must not change",
    "Apply SMED thinking to a changeover"
  ],

  body: `
## Why recipes are their own topic

A {{term:recipe|recipe}} is a named set of values that tells a machine how to make one product: line speed, oven setpoints, fill weight, label format, cure time. A plant with 40 products and 12 settings each has 480 numbers that someone must get right every time the product changes. Wrong settings are a familiar cause of scrap after a changeover, and they are easy to prevent with a bit of design.

The last lesson, {{lesson:mes-batch}}, covered ISA-88 batch recipes that include a procedure. This lesson is about the more general case: parameter sets for machines and lines, including discrete ones, and the work of switching between them.

## What goes in a recipe

Put in values that change with the **product**. Leave out values that belong to the **machine**.

| Recipe parameter (varies by product) | Machine configuration (does not) |
|---|---|
| Line speed 120 bpm | Conveyor drive ratio |
| Oven zone 2 setpoint 185 C | Thermocouple scaling |
| Target fill weight 500 g | Load cell calibration |
| Cure time 40 s | Valve travel limits |
| Label format ID 7 | Axis soft limits |

Mixing the two is a classic mistake. If a recipe can overwrite a calibration, a bad product edit can damage equipment. Each parameter should also carry **engineering units, a low and high limit, and a default**, so a typo like 1850 for 185 gets rejected before it reaches the machine.

## Where recipes live

There are three common homes, and many plants use a mix.

| Location | Strengths | Weaknesses |
|---|---|---|
| **PLC arrays or UDTs** | Works with no server, fast, survives network loss | Hard to edit, no history, limited count, every change is a PLC download |
| **Database (SQL)** | Unlimited recipes, history, queries, easy screens | Machine depends on the server unless values are cached in the PLC |
| **MES or recipe module** | Versioning, approval, audit trail, variance reporting | Cost, more moving parts |

A sound default: keep the master copy in a **database or MES**, and have the PLC keep the **active recipe** in a UDT. The PLC always runs from its local copy, so a server outage never stops the line, and the central system is the single place where recipes are edited and approved.

Compare the old pattern of hand-typing every setpoint at the HMI at each changeover. That has no check on who changed what and no way to see that two shifts ran the same product with different settings.

## The download and verify handshake

Writing 12 tags one at a time is unsafe. The PLC might read half old values and half new ones in the middle of a scan, or the write might fail partway. The fix is a {{term:recipe-handshake|handshake}} using a small set of control tags.

{{diagram:handshake}}

1. SCADA writes all values into a **staging** UDT in the PLC (not the active one).
2. SCADA writes the recipe ID and a checksum or version number, then sets \`Download.Request\` to 1.
3. The PLC checks every value against its limits and checks the machine is in a state that allows a change (for example Idle or Stopped).
4. If everything is valid, the PLC copies staging to active in a single scan with a COP instruction, sets \`Download.Done\` to 1 and echoes the loaded recipe ID. If not, it sets \`Download.Error\` with a code such as 2 = value out of limit, 3 = machine running.
5. SCADA **reads back** the active values and compares them to what it meant to send (the verify step), then clears \`Download.Request\`. The PLC clears Done.
6. The result is logged: recipe, version, who, when, and pass or fail.

**Add a timeout.** SCADA starts a timer when it sets \`Download.Request\`. If neither \`Done\` nor \`Error\` appears in time (choose a value that suits your scan time and network, and write it down), SCADA treats the download as failed: it clears the request, logs the failure, alerts the operator and does not start production on the old or the new recipe until someone resolves it. Without this, a PLC that faults after the request leaves SCADA waiting forever.

> [!example] Example tags
> \`\`\`text
> Area20_Line1.Recipe.Staging.OvenZone2Setpoint  REAL   <- SCADA writes
> Area20_Line1.Recipe.Staging.RecipeID       DINT
> Area20_Line1.Recipe.Download.Request       BOOL   <- SCADA sets
> Area20_Line1.Recipe.Download.Done          BOOL   -> PLC sets after COP
> Area20_Line1.Recipe.Download.Error         DINT   -> 0 = OK, 2 = limit, 3 = running
> Area20_Line1.Recipe.Active.OvenZone2Setpoint   REAL   -> machine uses this
> \`\`\`
> If the operator selects recipe 14 and the oven setpoint 185 is within the PLC's own 150 to 220 limit, Done goes high. If someone typed 1850, the PLC returns Error = 2 and the active recipe does not change.

The PLC checks the limits again even though the SCADA has already checked them. The PLC is the last line of defense, and it should never trust a value just because it arrived.

## Versioning and approval

A recipe that can be edited in place is a recipe you cannot trust. A change on Tuesday alters last Monday's history. Use these rules:

- **Immutable versions.** Saving an edit creates version 4, it never overwrites version 3. Each version records author, time and a change note.
- **Status.** A version is Draft, Approved or Retired. Only Approved versions can be downloaded to a line.
- **Approval by someone other than the author.** In regulated plants an electronic signature is required. Even where it is not, a second pair of eyes catches decimal slips.
- **Running work is pinned.** A batch or production run records the exact recipe version it started with. Editing or retiring a recipe never changes a run in progress.
- **Traceability.** Production records (counts, quality results, batch records) store the recipe ID and version so you can answer "what settings made this lot?"

A simple table design stores each version as a row, and each parameter as a child row, keyed by recipe ID plus version number. See {{lesson:db-schema}} for how to model it.

## Changeovers

A {{term:changeover|changeover}} is the time from the last good piece of product A to the first good piece of product B. It includes cleaning, mechanical changes, settings, and the ramp back to good quality. Changeover is often the biggest planned loss on a line, and it appears in {{lesson:mes-oee}} as availability loss.

### SMED basics

{{term:smed|SMED}} (Single-Minute Exchange of Die) comes from Shigeo Shingo's work on automotive press tooling. Its central idea is to separate tasks into two kinds:

- **Internal:** can only be done with the machine stopped (swap a die, replace a nozzle).
- **External:** can be done while the machine still runs (fetch the next tooling, pre-stage materials, pre-heat, print labels, load the next recipe into staging).

The common sequence is: observe and time the current changeover, separate internal from external, convert internal tasks into external ones, simplify what remains, standardize and repeat. Typical wins are using quick-release clamps instead of bolts, color-coded parts, pre-staged carts and removing adjustments by using fixed positions.

Recipes help in three ways. Loading the next recipe into staging while the old one still runs makes the settings step external. Automatic download removes manual entry errors. And a **changeover checklist** or verification step at the HMI can prove the line is ready before restart.

> [!example] Numbers
> A line changes product six times per week and each changeover takes 90 minutes. Moving 25 minutes of tasks to external work and automating 10 minutes of setting entry cuts it to 55 minutes. Six changeovers save 3.5 hours a week of production time, which at 100 units per minute is 21,000 units.

### Verification and variance

A good changeover system also checks **actual versus target**. After the download, the system compares live process values to the recipe (for example the real oven temperature against 185 C) and flags a difference beyond tolerance before allowing production to start. Over time, variance records show which settings operators keep correcting by hand, which means either the recipe is wrong or the equipment has a problem. {{lesson:mes-sepasoft}} shows how one MES module tracks these variances.
`,

  eli5: `
Think about a copy shop. Every customer wants something different: black and white or color, single or double sided, stapled or not. The settings for each job are a recipe.

You could have the clerk walk to the machine and push all the buttons from memory for each customer. That works until someone is tired, and then somebody gets color when they paid for black and white.

A better shop keeps a binder of job cards. The clerk picks the card, and the machine is set from the card. Better still, the machine checks the settings itself and says "that looks wrong" if a number is out of range, before wasting any paper.

The binder needs rules too. If someone can scribble on the card whenever they like, nobody can tell which version printed yesterday's order. So each change makes a new numbered card, a manager stamps it, and the print job remembers which card it used.

Changeover is the time between one customer's job and the next one. A smart shop gets the next paper and toner ready while the first job is still printing.
`,

  why: `
**Why keep the master in a database but the active copy in the PLC?** Because the two systems fail differently. The database is easy to edit and audit but can be down for patching. The PLC is hard to edit but keeps running. Holding the active recipe locally means a server outage never stops a line, and holding the master centrally means there is never an argument about which copy is correct.

**Why a handshake instead of just writing tags?** Writes can land in different scans, and a partial recipe is worse than none. A staged, validated, single-scan copy plus a read-back turns "I think it worked" into evidence. Integrators sometimes skip it on small machines to save time and then spend more chasing intermittent product problems.

**Why validate limits twice?** The HMI check is a convenience for the operator. The PLC check is protection. A script, a bad import or another client can write without going through the screen. The cheapest place to stop a wrong value is the last place before the machine.

**Why immutable versions?** Because a quality investigation needs to know what the machine was told on a specific day. Editing in place destroys that. The storage cost of old versions is trivial compared with the cost of not being able to explain a recall.

**What gets argued.** Teams disagree on whether operators may tweak a value mid-run. A pure view says no, change the recipe and re-approve. A practical view allows a bounded **operator adjustment** around the recipe value (say plus or minus 2 percent), recorded as such. Either way, decide it up front and log every change.
`,

  history: `
Shigeo Shingo developed SMED at Toyota-related plants in the 1950s and 1960s, famously reducing press die changes that took hours to under ten minutes. The idea of separating internal and external setup became a core part of lean manufacturing. Recipe management in automation grew from the batch process industries, where ISA-88 established the idea of recipes as data separate from equipment. Discrete manufacturers adopted the same pattern as products and settings multiplied.
`,

  examples: [
    {
      title: "Bakery oven recipe select",
      body: `An operator picks "Sourdough 800g" on the HMI. SCADA loads version 6 (Approved) from SQL, checks every value against its limits, and writes it to the oven PLC's staging UDT. The PLC sees Download.Request, finds it is in Idle and every value is in range, copies staging to active in one scan and raises Done. SCADA reads back all 14 values, they match, and the production run is logged with recipe ID 22 version 6.`
    },
    {
      title: "A rejected download",
      body: `During a run of recipe 14, a supervisor tries to load recipe 15 on the same line. The PLC sees the machine state is Running and returns Error = 3 without changing the active recipe. The HMI shows "Cannot change recipe while running". Nothing was written to Active and the run is unaffected.`
    }
  ],

  diagrams: {
    handshake: `<svg viewBox="0 0 640 250" role="img" aria-label="Recipe download: SCADA writes staging values and a request flag, PLC validates and copies to active, sets done, SCADA reads back and verifies">
  <marker id="mes-recipes-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker>
  <rect class="dg-box" x="20" y="20" width="130" height="40" rx="4"/>
  <text class="dg-text dg-mid" x="85" y="45">Database</text>
  <rect class="dg-box-accent" x="250" y="20" width="130" height="40" rx="4"/>
  <text class="dg-text dg-mid" x="315" y="45">SCADA</text>
  <rect class="dg-box" x="480" y="20" width="140" height="40" rx="4"/>
  <text class="dg-text dg-mid" x="550" y="45">PLC</text>
  <line class="dg-line" x1="150" y1="40" x2="250" y2="40" marker-end="url(#mes-recipes-ah)"/>
  <text class="dg-text-sm dg-mid" x="200" y="34">approved</text>
  <line class="dg-line-thin" x1="315" y1="60" x2="315" y2="240"/>
  <line class="dg-line-thin" x1="550" y1="60" x2="550" y2="240"/>
  <line class="dg-line" x1="315" y1="90" x2="550" y2="90" marker-end="url(#mes-recipes-ah)"/>
  <text class="dg-text-sm dg-mid" x="432" y="84">1. Write Staging values + ID</text>
  <line class="dg-line" x1="315" y1="125" x2="550" y2="125" marker-end="url(#mes-recipes-ah)"/>
  <text class="dg-text-sm dg-mid" x="432" y="119">2. Download.Request = 1</text>
  <text class="dg-text-sm" x="395" y="153">3. PLC checks limits + state,</text>
  <text class="dg-text-sm" x="395" y="169">copies Staging to Active</text>
  <line class="dg-line-ok" x1="550" y1="188" x2="315" y2="188" marker-end="url(#mes-recipes-ah)"/>
  <text class="dg-text-sm dg-mid" x="432" y="182">4. Done = 1 (or Error code)</text>
  <line class="dg-line" x1="315" y1="225" x2="550" y2="225" marker-end="url(#mes-recipes-ah)"/>
  <text class="dg-text-sm dg-mid" x="432" y="219">5. Read back Active, compare, log</text>
</svg>`
  },

  pitfalls: [
    "Storing calibration or machine constants inside product recipes, so a bad recipe edit can damage the machine.",
    "Writing recipe tags directly to the active values one at a time, which lets the machine see a half-old, half-new recipe.",
    "Trusting HMI limit checks and skipping range checks in the PLC.",
    "Editing an approved recipe in place and losing the history of what earlier lots were made with.",
    "Letting a recipe download happen while the machine is running.",
    "Measuring changeover as 'time machine was stopped' and ignoring the ramp to good quality.",
    "Forgetting to record which recipe version each production run used."
  ],

  keyTerms: ["recipe", "recipe-handshake", "recipe-versioning", "changeover", "smed", "setpoint", "udt"],

  quiz: [
    {
      q: "Why does the handshake write to a staging area instead of straight to the active recipe tags?",
      options: ["To make the download faster", "To save PLC memory", "So the PLC can validate the full set and switch it in one scan, avoiding a mixed old and new recipe", "Because active tags are read-only"],
      answer: 2,
      explain: [
        "Staging adds a step, it does not speed anything up.",
        "Staging uses extra memory, not less.",
        "Correct. Validation then a single-scan copy means the machine never sees a half-updated recipe.",
        "Active tags are normal read and write tags. The issue is consistency, not permission."
      ]
    },
    {
      q: "SCADA checks every value against limits before download. Why should the PLC check again?",
      options: ["Other clients, scripts or imports can write to the staging tags without going through the SCADA screen", "PLC checks are required by the standard", "SCADA limit checks are unreliable", "To use up the scan time"],
      answer: 0,
      explain: [
        "Correct. The PLC is the last line of defense, so it should not rely on any upstream check.",
        "No standard requires it, it is a design practice.",
        "The SCADA check works, but it only applies to writes that go through it.",
        "Scan time is a cost to minimize, not a goal."
      ]
    },
    {
      q: "Version 3 of a recipe is approved and in use. An engineer needs to change one setpoint. What is the right approach?",
      options: ["Edit version 3 in place so nothing else changes", "Create version 4 as a draft, get it approved, then use it for new runs", "Delete version 3 and recreate it", "Change the value at the HMI during the run"],
      answer: 1,
      explain: [
        "In-place edits destroy the record of what earlier lots were made with.",
        "Correct. Versions are immutable, and only approved ones can be downloaded.",
        "Deleting also erases history that production records still point to.",
        "An unlogged HMI change bypasses approval and leaves no trace in the recipe."
      ]
    },
    {
      q: "Which task is best converted from internal to external setup in a SMED effort?",
      options: ["Removing the old die while the machine is stopped", "Cleaning the product contact surfaces", "Running the first test piece", "Pre-staging the next product's tooling and loading its recipe into staging while the current product still runs"],
      answer: 3,
      explain: [
        "Removing the die needs the machine stopped, so it stays internal.",
        "Cleaning of contact surfaces usually requires the machine to be stopped.",
        "The first piece is by definition made after the machine is running again.",
        "Correct. Preparation that doesn't touch the running machine can happen early and shortens stopped time."
      ]
    },
    {
      q: "Where is the best home for the master copy of recipes in a plant with 60 products, versioning and audits?",
      options: ["A central database or MES, with the active recipe cached in the PLC", "Hardcoded in the PLC program", "In HMI memory only", "On a spreadsheet on the operator's desktop"],
      answer: 0,
      explain: [
        "Correct. Central control gives versions and approval, and the local active copy keeps the line independent of the server.",
        "Hardcoding makes every change a PLC project and keeps no history.",
        "HMI memory is lost on replacement or failure and has no audit trail.",
        "Spreadsheets have no approval flow or integrity, and cannot be tied to production records reliably."
      ]
    }
  ],

  resources: [
    { title: "Single-minute exchange of die", url: "https://en.wikipedia.org/wiki/Single-minute_exchange_of_die", type: "article", source: "Wikipedia" },
    { title: "Batch Procedure vs. Settings & Changeover", url: "https://www.sepasoft.com/blog/learn/batch-procedure-vs-settings-and-changeover/", type: "article", source: "Sepasoft" },
    { title: "Using Sepasoft MES Modules", url: "https://docs.sepasoft.com/articles/user-manual/mes-modules", type: "docs", source: "Sepasoft" },
    { title: "ISA-88 Series of Standards: Batch Process Control", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-88-standards", type: "standard", source: "ISA" },
    { title: "Batch Procedure (Sepasoft documentation)", url: "https://docs.sepasoft.com/articles/user-manual/batch-procedure", type: "docs", source: "Sepasoft" }
  ]
});
