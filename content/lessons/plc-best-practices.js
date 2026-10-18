LC.lesson({
  id: "plc-best-practices",
  title: "Structuring a Logix project like an integrator",
  track: "plc",
  minutes: 20,
  level: 4,
  prereqs: ["plc-aoi", "plc-state-machines", "plc-faults"],
  tags: ["best-practices", "project-structure", "naming", "udt", "aoi", "io-mapping", "source-control", "code-review"],
  summary: "The layout, naming, interface and review habits that make a Logix project survive hardware swaps, handoffs, and the next integrator who opens it.",
  objectives: [
    "Lay out a project by task, program and routine so each piece has one job",
    "Separate raw I/O mapping from logic and explain what that buys you",
    "Design Cmd/Sts/Cfg/Alm interface tags that an Ignition screen can bind to without custom code",
    "Decide what belongs in PLC alarm logic and what belongs in SCADA",
    "Version UDTs and AOIs, and keep a project in source control using L5X exports",
    "Apply a code review checklist to someone else's project"
  ],

  body: `
## What "like an integrator" means

Anyone can make a PLC program that runs. An integrator makes one that the next person can **find things in, change safely, and commission without you on the phone**. That person might be a maintenance tech at 3 a.m., a colleague next year, or you in eighteen months when you have forgotten every decision. The practices below are mostly about that reader. They also keep the Ignition side simple, because a clean PLC interface makes tags, UDT mappings and alarms easy to build.

Most of this is opinion backed by scars. Where experienced integrators disagree, the lesson says so, and you will have to choose with your customer's standards in mind. A customer standard always beats this page.

## The reference layout

A Logix project is organized as **tasks** that schedule **programs**, which contain **routines**. If that sounds unfamiliar, revisit {{lesson:plc-organization}}. A layout that scales:

{{diagram:layout}}

| Level | Item | Purpose |
|---|---|---|
| Task | \`MainTask\` (continuous or periodic, e.g. 20 ms) | Normal logic. Many projects use a periodic task so scan time is predictable. |
| Task | \`FastTask\` (periodic, 2-10 ms, only if needed) | Motion, high-speed counters, tight loops. Keep tiny. |
| Program | \`Plant_IO\` | Input and output mapping, nothing else |
| Program | \`Plant_Common\` | Alarms summary, clocks, mode, HMI heartbeat, shared state |
| Program | One per equipment area, e.g. \`Area10_Mixing\` | Everything for that area |
| Routine | \`MainRoutine\` | Only calls other routines (JSR), in a readable order |
| Routine | \`R10_Motors\`, \`R20_Sequence\`, \`R30_Interlocks\` | One concern each |
| Routine | \`Fault\` (program fault routine) | Handles faults per {{lesson:plc-faults}} |

Two rules hold this together. Every program has a \`MainRoutine\` that does nothing except call routines. And a routine does one thing. If you cannot name a routine in three words, it is doing too much.

### Where integrators disagree: one task or many

Some shops put everything in one continuous task. It is simple and works for small machines. Others use a periodic task for logic so timers and PID loops see a consistent interval. The risk with many tasks is overlap and data races: a higher-priority task can interrupt another halfway through a multi-word update. Our default is one periodic task for logic, a second only for something that truly needs speed, and no more.

## Naming conventions

Pick a convention, write it on one page, and apply it with no exceptions. The exact style matters less than the consistency. A solid default:

- **Tags and members**: PascalCase. An underscore appears only after a prefix (\`UDT_\`, \`AOI_\`) or between an area and a name (\`Area10_Mixing\`). Members never carry underscores for units or grouping, so it is \`M101.Cfg.StartDelay\`, not \`M101_Cfg_StartDelay_ms\`.
- **Equipment tags match the P&ID, minus the hyphen**: the drawing says \`M-101\`, \`LT-101\`, \`FV-101\`; the PLC tag is \`M101\`, \`LT101\`, \`FV101\`, because hyphens are not valid in Logix tag names. A tech with a drawing can find the tag with no lookup.
- **Booleans read as statements**: \`Running\`, \`Fault\`, \`HighLevel\`, not \`Bit7\` or \`Flag3\`.
- **Units go in the description**, not the name: \`LT101\` with the description "Mixer level, m", not \`Level_m\`. The same applies to engineering-unit properties in Ignition.
- **Routines**: prefix with a number so they sort in execution order (\`R10_\`, \`R20_\`).
- **UDTs and AOIs**: type prefix, \`UDT_Motor\`, \`AOI_Motor\`, so you never confuse a type with an instance. The house motor type is the one from {{lesson:plc-udt}}: \`UDT_Motor\` with nested \`Cmd\`, \`Sts\`, \`Cfg\` and \`Alm\` groups, so \`M101.Cmd.Start\` and \`M101.Sts.Running\` mean the same thing in every lesson and every project.

> [!tip] Descriptions are free
> Every tag, UDT member and AOI parameter has a Description field. It costs nothing, it appears as a tooltip in the editor, and it is exported with the tag. Fill it in. Ignition can also pull descriptions into tag documentation.

## Libraries: UDTs and AOIs with versions

Every repeated device (motor, valve, PID loop, analog input) should be a {{term:udt|UDT}} for its data and an {{term:aoi|AOI}} for its logic. See {{lesson:plc-udt}} and {{lesson:plc-aoi}}. At project scale the question becomes **how you manage the library**.

- Keep the master copy in a **library project** (or a folder of L5X files), not inside whichever job you last used it on. Rockwell's own version-control and change-management product for this is FactoryTalk AssetCentre, which can also track who changed which controller.
- Give each type a **revision number**. Logix AOIs have built-in revision and change-history fields. Use them and write what changed.
- **Never change a deployed UDT's member order or delete a member casually.** Changing a UDT reshapes memory, and every tag, produced/consumed connection and HMI mapping that uses it is affected. Add members at the end. Plan for spare members, such as a few reserved DINTs, so you rarely need to restructure. If it is genuinely needed, make the change in the library, bump the revision, and roll it out to each project on purpose.
- Decide a policy on **sealed AOIs** (source protected). Sealing guards your IP, but a customer may refuse to buy a PLC program they cannot read. Many integrators ship sealed-off only if the contract says so.

### Where integrators disagree: AOI or plain routine

AOIs give you reuse, a defined interface and clean instance data. They also have costs. Online edits are limited, they are harder to debug in some versions, and a bug fixed in the library does not fix existing copies until you update each one. Some experienced integrators prefer routine-per-device code with UDT arrays for simple repeated devices, and reserve AOIs for logic they truly want sealed and versioned. Both work. Choose per project and stay consistent.

## Map I/O first, then forget the hardware

The most useful single habit: **raw I/O never appears in logic.** A dedicated routine (or program) copies physical inputs into named tags, and copies named output tags to the physical points.

{{diagram:iomap}}

\`\`\`ladder
XIC(Local:3:I.Data.4) OTE(P101_RunFbk)
\`\`\`

\`\`\`ladder
XIC(P101_RunOut) OTE(Local:5:O.Data.2)
\`\`\`

Logic then reads \`P101_RunFbk\` (the starter's auxiliary contact) and sets \`P101_RunOut\`. The \`Local:3:I.Data.4\` address appears in exactly one place. For analog points, do the scaling here too, so the rest of the code sees engineering units.

This buys you three things:

1. **Hardware swaps.** The customer changes a 16-point input card to a remote drop. You edit the mapping routine and the logic does not change.
2. **Simulation.** Add a bypass in the mapping routine that feeds simulated values instead of real inputs. You can test the whole sequence on a desk, or in a digital twin, with no field wiring.
3. **Forcing and testing.** Because every physical point passes through one tag, you can see and override it in one place.

> [!warning] The cost
> You add one scan of latency and a few routines. For a typical plant task at 20 ms this is nothing. For a fast loop that must react in under a scan, keep the I/O in the fast task and map inside it.

## Interface tags for the HMI: Cmd, Sts, Cfg, Alm

Ignition and every other HMI read and write PLC tags. If those tags are scattered, every screen needs custom work. If every device exposes the **same four groups**, a screen template works for all of them. A pattern many integrators use inside the UDT:

| Group | Direction | Meaning | Example members |
|---|---|---|---|
| \`Cmd\` | HMI to PLC | Requests from the operator | \`Cmd.Start\`, \`Cmd.Stop\`, \`Cmd.Reset\` |
| \`Sts\` | PLC to HMI | What the device is doing | \`Sts.Running\`, \`Sts.Ready\`, \`Sts.Fault\`, \`Sts.Auto\` |
| \`Cfg\` | Engineer to PLC | Setpoints and limits, rarely changed | \`Cfg.SpeedHigh\`, \`Cfg.StartDelay\` |
| \`Alm\` | PLC to HMI | Alarm conditions the PLC detected | \`Alm.FailToStart\`, \`Alm.Overload\`, \`Alm.CommLoss\` |

Design rules that make Ignition happy:

- **Commands are requests, not outputs.** The HMI sets \`Cmd.Start\`; PLC logic decides whether to honor it and clears it. The operator never writes the physical output bit.
- **Pulse commands are cleared by the PLC.** If Ignition writes 1 and the PLC resets it, there is no stuck-bit problem when a client disconnects.
- **Status is one-way.** Never write to \`Sts\` from the HMI.
- **Add a numeric state member** (an INT or DINT) where a device has more than a few states, with a documented list, plus a text lookup in Ignition. It travels as one tag instead of a dozen booleans.
- **Match UDT to Ignition UDT.** Build the Ignition \`Motor\` UDT definition from \`UDT_Motor\` once, with identical folders and member names, and parameterize the device path (for example \`[default]Plant1/Area10/Line1/M101\`). See {{lesson:ign-udts}}.
- **Add a heartbeat.** A counter or toggle bit from Ignition that the PLC watches lets the PLC detect a dead SCADA and move to a safe mode.

## Alarms: in the PLC or in SCADA

Both can raise alarms, and good projects split the job:

- **PLC owns the condition.** Anything that affects control or safety, such as a low-low level that trips a pump, is evaluated in the PLC. It keeps working when the network is down.
- **PLC provides clean, latched, timestamped-friendly bits.** One \`Alm\` word or booleans per device, with deadband and on-delay already applied (see {{lesson:plc-analog}}).
- **SCADA owns the presentation.** Priority, grouping, shelving, acknowledgment, notification, history and screens live in Ignition's alarm system.

Where integrators disagree: some run **all alarm limits in Ignition** for flexibility, because changing a setpoint needs no PLC download. Others insist limits sit in the PLC so the alarm exists even when SCADA is offline. A common compromise: the PLC owns limits as \`Cfg\` members and raises alarm bits, Ignition just displays them. Avoid the worst case, which is the same alarm defined in both places with different limits.

## Comments and documentation

- **Rung comments** explain *why*, not *what*. "Hold start for 3 s so the VFD completes precharge" is useful. "Turns on pump" is noise.
- Give every routine a **header comment** in its first rung: purpose, author, date, revision.
- Keep a short **tag and I/O list** outside the PLC (a spreadsheet is fine) tied to drawing numbers.
- Use the project's **Controller Properties description** for the revision history.

## Avoid duplicate destructive bits

A bit is **destructive** when writing it changes the process: an OTE on an output, an OTL, a MOV into a setpoint. If two rungs can write the same bit, the last one scanned wins, and the result looks random.

\`\`\`ladder
XIC(Auto) XIC(StartReq) OTE(P101_RunOut)
\`\`\`

\`\`\`ladder
XIC(Manual) XIC(P101.Cmd.Start) OTE(P101_RunOut)
\`\`\`

The second rung overwrites the first every scan. When Auto is true and Manual is false, the second rung forces the output off. The fix is **one writer per bit**: combine the conditions into a single OTE in one place, or use an AOI that owns the output. Run the cross reference on every output tag during review. If an OTE appears twice, stop.

## Source control

Logix stores a project in a binary \`.ACD\` file, which Git cannot diff. Two common approaches:

- **Export to L5X** (XML) or L5K (older text format) and commit that. An L5X shows rung-level changes in a text diff, and the Studio 5000 import/export tools can export a whole project, a program, a routine, a UDT or an AOI. Store the ACD as a release artifact next to it.
- **FactoryTalk AssetCentre** (Rockwell's change-management product) or similar tools automate the compare, schedule backups and keep history for the whole plant. A Git repository of L5X files is the low-cost version of the same idea.

> [!warning] An L5X import can overwrite
> Importing an L5X into a live or shared project can overwrite same-named items (tags, UDTs, AOIs, routines) without you noticing. Treat a restore from L5X as a change to production: import into an offline copy first, compare it with what is running, check the import options and the conflict report, and only then download. Importing a UDT or AOI with a different definition than the one in use is the way controllers get damaged by a well-meant restore.

A workable manual routine: before each download, export the L5X, commit with a message ("Added P102 alternation, rev 1.4"), and tag releases. Always commit what is **currently running in the controller**, uploaded fresh, since field changes happen. Keep passwords and customer secrets out of the repo.

> [!example] A concrete recovery
> A plant calls: the mixer ran fine until an unexpected restart, and now stage 3 skips. You pull the last tagged L5X, diff it against the project uploaded from the PLC, and see someone edited a \`TON\` preset online from 30 to 3 seconds. Without source control, you would have no way to know that.

## Code review checklist

Before release, someone other than the author runs through:

1. Naming follows the standard and every tag has a description
2. \`MainRoutine\` only calls routines; every routine has a header comment
3. No raw I/O address appears outside the mapping routine
4. Every output has exactly one writer (check the cross reference)
5. All HMI commands are cleared by the PLC; no HMI write to \`Sts\`
6. Fault paths: what happens on a lost connection, a failed module, a power cycle?
7. Retentive data (OTL, RTO, counters) has a documented reset path
8. UDT and AOI revisions match the library, with change notes
9. Online edits are rolled back into the offline project
10. Scan time, with margins, is recorded, and a periodic task has no overruns
11. Safety is in the safety task only, and overloads and E-stops are hardwired, never PLC-only (see {{lesson:plc-safety}})
12. A fresh L5X export is committed and tagged

Try it as a lab: export one routine to L5X, delete it from an offline copy, re-import it, and read the import conflict report before you accept anything. Then change one \`TON\` preset online and find it with an L5X diff.
`,

  eli5: `
Imagine a kitchen shared by many cooks over many years. In a bad kitchen, ingredients are in random cupboards, labels say "thing 1" and "thing 2", and two cooks both turn the oven on and off without knowing it. Every new cook needs a week just to find the salt.

A good kitchen has a rule for where everything lives. Labels say what is inside. The delivery door is the only place groceries come in, so if the supplier changes, only the door procedure changes and every recipe stays the same. Each recipe card says why a step exists, not only what to do. Only one person is in charge of the oven at a time. And someone keeps a copy of the recipe book from each month, so if the soup suddenly tastes wrong you can compare today's recipe with last month's and see exactly what changed.

A PLC project is that kitchen. These habits do not make the machine run faster. They make it possible for the next person to fix it without breaking something else.
`,

  why: `
**Why separate I/O from logic?** Hardware always changes: a card fails and the replacement is a different model, a remote drop is added, a sensor moves to a new input. If logic references \`Local:3:I.Data.4\` in 80 places, each change risks missing one. One mapping routine means one edit. It also gives you the simulation hook that makes offline testing possible at all. The tradeoff is a small amount of extra code and a scan of latency.

**Why Cmd/Sts/Cfg/Alm?** The operator interface is the second most common source of bad PLC bugs after double-written outputs. When the HMI writes directly to physical bits or to status flags, you lose the ability to say who commanded what. Commands as requests let the PLC enforce interlocks and modes once, for every client, including Ignition, a technician's laptop and a future MES.

**Why one writer per bit?** Scan order decides who wins when two rungs disagree. Bugs of this type are intermittent, and they appear only under specific mode combinations, which is the worst thing to debug on a commissioning night.

**Why version libraries?** A shared AOI fixed in one project but not another produces machines that behave differently for the same operator. Integrators with many customers learn this the hard way. Versioned libraries make the question "which behavior does this plant have?" answerable.

**Where people argue.** Alarms in PLC versus SCADA, one task versus many, AOIs versus routines, and commercial source-control tools versus manual L5X in Git. The usual answer depends on who maintains the system after you leave. A plant with a strong controls team can use a richer structure. A plant with one electrician needs the simplest layout that still follows the rules above.
`,

  history: `
Early PLC programs were a single ladder file with absolute addresses like \`N7:12\` and \`B3:4/2\`, and the only documentation was the printout. The move to tag-based Logix with programs, routines and UDTs in the early 2000s made structure possible, but it did not enforce any. Integrator and end-user standards (for example, company-specific programming standards from large manufacturers) filled that gap, and industry groups later added ideas like PackML for machine state models. Many of the conventions in this lesson are descended from those standards documents.
`,

  examples: [
    {
      title: "Adding a spare pump without touching logic",
      body: `The mixing area has pump motors \`P101\` and \`P102\`. The customer adds \`P103\`. In the layout above you add a \`P103\` tag of type \`UDT_Motor\`, one rung in the mapping routine for its aux contact and run output, one call to \`AOI_Motor\` in \`R10_Motors\`, and the Ignition \`Motor\` UDT instance with \`P103\` as the instance name. The sequence in \`R20_Sequence\` already works from the pump's \`Sts\` and \`Cmd\` members, so it does not change.`
    },
    {
      title: "Replacing a failed input card with a different model",
      body: `A 1756-IB16 fails and the only stock is a 1734 POINT I/O module on a remote adapter. The new module has a different address path (\`Rack1:2:I.Data.4\`). You change the one mapping rung per point. Logic, HMI tags and alarms are untouched, and you verify by watching \`P101_RunFbk\` follow the field contact.`
    }
  ],

  diagrams: {
    layout: `<svg viewBox="0 0 640 260" role="img" aria-label="Project tree: one periodic task runs programs for I/O mapping, common data and equipment areas, each program has a MainRoutine that calls single-purpose routines">
  <rect class="dg-box-accent" x="20" y="20" width="140" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="90" y="40">MainTask</text>
  <text class="dg-text-muted dg-mid" x="90" y="56">periodic, 20 ms</text>
  <line class="dg-line" x1="160" y1="42" x2="200" y2="42"/>
  <line class="dg-line" x1="200" y1="42" x2="200" y2="220"/>
  <line class="dg-line" x1="200" y1="42" x2="220" y2="42"/>
  <line class="dg-line" x1="200" y1="130" x2="220" y2="130"/>
  <line class="dg-line" x1="200" y1="220" x2="220" y2="220"/>
  <rect class="dg-box" x="220" y="20" width="170" height="44" rx="6"/>
  <text class="dg-text-sm" x="234" y="40">Plant_IO</text>
  <text class="dg-text-muted" x="234" y="56">raw I/O only</text>
  <rect class="dg-box" x="220" y="108" width="170" height="44" rx="6"/>
  <text class="dg-text-sm" x="234" y="128">Plant_Common</text>
  <text class="dg-text-muted" x="234" y="144">mode, clock, heartbeat</text>
  <rect class="dg-box" x="220" y="198" width="170" height="44" rx="6"/>
  <text class="dg-text-sm" x="234" y="218">Area10_Mixing</text>
  <text class="dg-text-muted" x="234" y="234">one per area</text>
  <line class="dg-line" x1="390" y1="220" x2="420" y2="220"/>
  <line class="dg-line" x1="420" y1="150" x2="420" y2="240"/>
  <rect class="dg-box-2" x="430" y="138" width="190" height="26" rx="4"/>
  <text class="dg-text-mono" x="440" y="156">MainRoutine (JSRs)</text>
  <rect class="dg-box-2" x="430" y="170" width="190" height="26" rx="4"/>
  <text class="dg-text-mono" x="440" y="188">R10_Motors</text>
  <rect class="dg-box-2" x="430" y="202" width="190" height="26" rx="4"/>
  <text class="dg-text-mono" x="440" y="220">R20_Sequence</text>
  <rect class="dg-box-2" x="430" y="234" width="190" height="20" rx="4"/>
  <text class="dg-text-mono" x="440" y="249">R30_Interlocks, Fault</text>
</svg>`,
    iomap: `<svg viewBox="0 0 640 200" role="img" aria-label="Field I/O feeds an input mapping routine into named tags, logic works only on named tags, an output mapping routine writes back to physical outputs">
  <defs><marker id="plc-best-practices-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="60" width="110" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="75" y="90">Physical</text>
  <text class="dg-text-sm dg-mid" x="75" y="108">inputs</text>
  <rect class="dg-box-accent" x="180" y="60" width="120" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="240" y="90">Input map</text>
  <text class="dg-text-muted dg-mid" x="240" y="108">scale, sim bypass</text>
  <rect class="dg-box" x="350" y="60" width="120" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="410" y="90">Logic</text>
  <text class="dg-text-muted dg-mid" x="410" y="108">named tags only</text>
  <rect class="dg-box-accent" x="520" y="60" width="100" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="570" y="90">Output</text>
  <text class="dg-text-sm dg-mid" x="570" y="108">map</text>
  <line class="dg-line" x1="130" y1="95" x2="178" y2="95" marker-end="url(#plc-best-practices-ah)"/>
  <line class="dg-line" x1="300" y1="95" x2="348" y2="95" marker-end="url(#plc-best-practices-ah)"/>
  <line class="dg-line" x1="470" y1="95" x2="518" y2="95" marker-end="url(#plc-best-practices-ah)"/>
  <text class="dg-text-muted" x="180" y="165">Hardware changes edit only the maps</text>
  <text class="dg-text-muted" x="180" y="184">Simulation replaces the input map source</text>
</svg>`
  },

  pitfalls: [
    "Letting two rungs write the same output bit, so the last one scanned silently wins.",
    "Referencing physical I/O addresses all through the logic, which turns a card swap into a project-wide search.",
    "Reordering or deleting UDT members in a deployed project and breaking every tag, HMI mapping and consumed tag that uses it.",
    "Defining the same alarm with different limits in both the PLC and Ignition.",
    "Making online edits during commissioning and never uploading them back into the offline project or source control.",
    "Writing comments that restate the instruction instead of explaining why."
  ],

  keyTerms: ["udt", "aoi", "io-mapping", "cmd-sts-cfg", "acd-file", "destructive-bit", "plc", "hmi"],

  quiz: [
    {
      q: "A customer replaces an input card with a different model in a different slot. In a well-structured project, what changes?",
      options: ["Every rung that used the old address", "The Ignition UDT definitions", "Only the input mapping routine", "The task period"],
      answer: 2,
      explain: [
        "That is what happens when raw addresses are scattered through logic. The structure here avoids it.",
        "Ignition reads named PLC tags. As long as names do not change, its UDTs do not.",
        "Correct. Physical addresses appear only in the mapping routine, so logic and HMI tags are untouched.",
        "The card model does not affect the task period."
      ]
    },
    {
      q: "Rung A: XIC(Auto) OTE(P101_RunOut). Rung B, later in the scan: XIC(Manual) XIC(P101.Cmd.Start) OTE(P101_RunOut). Auto is true, Manual is false. What is the output state at the end of the scan?",
      options: ["On, because Rung A is true", "Undefined; the controller faults", "On, because OTE latches", "Off, because Rung B is scanned last and writes false"],
      answer: 3,
      explain: [
        "Rung A turns it on, but Rung B runs after and turns it off again.",
        "Logix does not fault on duplicate OTEs. It only gives a warning at verify time in some cases.",
        "OTE does not latch. It follows rung condition every scan.",
        "Correct. Each OTE writes its rung result every scan, so the last one scanned wins. Use one writer per bit."
      ]
    },
    {
      q: "Which design is best for a Start button on an Ignition screen?",
      options: ["The button writes directly to the physical output tag", "The button writes Cmd.Start, and PLC logic checks interlocks, acts, and clears it", "The button writes to a Cfg member", "The button writes Sts.Running so the screen looks right"],
      answer: 1,
      explain: [
        "That bypasses interlocks and modes, and any client could force the output.",
        "Correct. Commands are requests. The PLC decides, and clearing the bit prevents a stuck command.",
        "Cfg holds rarely changed settings, not momentary commands.",
        "Status is output from the PLC. Writing it from the HMI hides the real state."
      ]
    },
    {
      q: "Which statement about changing a deployed UDT is the most accurate?",
      options: ["Add members at the end and keep spares; avoid deleting or reordering", "Reorder members freely; the names keep tags working", "Always delete and recreate it in each project", "UDT changes never affect other tags"],
      answer: 0,
      explain: [
        "Correct. Appending is safest, and reserved spare members avoid frequent restructuring.",
        "Changing member order changes memory layout and can break produced/consumed tags and external mappings.",
        "Recreating a UDT risks losing data and links to every tag that uses it.",
        "Every tag of that type is affected by a UDT change."
      ]
    },
    {
      q: "A plant wants an alarm to trip a pump on low-low level even if the SCADA server is down. Where should the condition live?",
      options: ["In Ignition only, with a script", "In both, with independent limits", "In the PLC, with Ignition displaying the alarm bit", "In the HMI panel"],
      answer: 2,
      explain: [
        "If Ignition is offline, nothing would trip the pump.",
        "Two sets of limits will drift apart and confuse operators.",
        "Correct. The PLC owns anything that affects control, and SCADA owns presentation.",
        "An HMI panel is a display device, not the place for control decisions."
      ]
    },
    {
      q: "Why export L5X files to Git instead of committing only the ACD file?",
      options: ["L5X is text, so changes between versions can be compared line by line", "L5X files run faster", "ACD files cannot be opened offline", "L5X removes the need to upload from the PLC"],
      answer: 0,
      explain: [
        "Correct. XML text gives diffs, history and blame. The binary ACD does not.",
        "Speed is unrelated. L5X is an interchange file.",
        "ACD opens fine offline. It simply cannot be diffed in Git.",
        "You still need to upload from the controller to capture field changes before exporting."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers Import/Export (1756-RM014)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm014_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controller Import/Export Project Components (1756-PM019)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm019_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Add-On Instructions (1756-PM010)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm010_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures (1756-PM001)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Import/export a full project (Studio 5000 Logix Designer 37)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/studio-5000-logix-designer/import-and-export/import-export-a-full-project.html", type: "docs", source: "Rockwell Automation" },
    { title: "Programming Guideline for S7-1200/1500 (a useful comparison of style guides)", url: "https://support.industry.siemens.com/cs/attachments/90885040/81318674_Programming_guideline_DOC_v16_en.pdf", type: "docs", source: "Siemens" }
  ]
});
