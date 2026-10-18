LC.lesson({
  id: "int-naming",
  title: "Tag naming and system-wide standards",
  track: "int",
  minutes: 20,
  level: 3,
  prereqs: ["plc-udt", "ign-udts"],
  tags: ["naming", "standards", "isa-5.1", "isa-95", "tag-paths", "uns", "udt", "database"],
  summary: "One name for one thing, from the P&ID to the PLC tag, the Ignition path, the historian, the MES and the MQTT topic, and how to write the standard down so it survives.",
  objectives: [
    "Build a naming convention that carries a P&ID tag number through every layer",
    "Lay out an Ignition tag tree with an ISA-95 hierarchy and UDT instances",
    "Apply consistent casing and separator rules across PLC, Ignition, SQL and MQTT, and know where case matters",
    "Trace one motor through the PLC, Ignition, historian, MES and UNS with consistent names",
    "Write and enforce a one-page naming standard"
  ],

  body: `
## Why one name matters

A plant has one pump and at least six different names for it. The P&ID calls it P-101. The PLC programmer typed \`Pump1\`. The Perspective view says "Mix Tank Feed Pump". The historian has \`mixer/pump_a\`. The MES has "Feed Pump A" and the maintenance system has asset number 40022. Every one of those is a join waiting to fail. Reports need translation tables, alarms need lookup spreadsheets, and a night-shift technician cannot find the drawing for the thing screaming on the screen.

A {{term:naming-convention|naming convention}} is a written rule that gives each thing one identity and derives the other names from it mechanically. This lesson is the canonical explanation of the Meridian Foods naming standard (the house standard every example in this course follows). It builds a convention that runs from ISA-style tag numbers to Ignition paths, SQL columns, UNS topics and Sparkplug B. {{lesson:plc-best-practices}} and {{lesson:plc-udt}} cover the PLC half. {{lesson:ign-udts}} covers UDT mechanics in Ignition.

## Start with the plant tag number

The root of everything is the plant {{term:tag-number|tag number}} on the P&ID. ISA-5.1 style numbers combine a function code and a loop number, such as \`LT-101\` (level transmitter, loop 101), \`FV-101\` (flow valve) or \`LAHH-101\` (level alarm high-high). Many plants add an area prefix: \`10-LT-101\`. See {{lesson:found-pid-docs}}.

Use that number as the spine. Rules that help:

- **Drawings keep the hyphen, code drops it.** On P&IDs, loop sheets, I/O lists and alarm worksheets the tag is \`LT-101\`, \`FV-101\`, \`LAHH-101\`. In PLC, Ignition, database and MQTT names it is \`LT101\`, \`FV101\`, because hyphens are not valid in Logix tag names. Make that mapping once, in the standard, and never invent another.
- **Keep the tag number's letters and digits intact.** Do not renumber for software. Number ranges are per area: Area10 uses the 100s, Area20 the 200s.
- **Name equipment, not just instruments.** The motor is \`M101\`, the pump \`P101\`, the valve \`FV101\` and the level transmitter \`LT101\`. Loop numbers match the equipment: LT-101's alarms are LAH-101 and LAHH-101.
- **Do not add type words.** \`M101\`, not \`M101_Motor\`. The type is in the UDT definition, so a suffix repeats what the type already says.
- **Never reuse a number.** If M-101 is replaced by a new motor, it can keep the number. If it is scrapped and a different motor takes its place elsewhere, issue a new number.

## Layer by layer

### Casing and separators

Pick one style per layer and write it down. A common, workable set:

| Layer | Style | Example |
|---|---|---|
| Drawings (P&ID, loop sheet, I/O list, alarm worksheet) | ISA, with hyphen | \`LT-101\`, \`LAHH-101\` |
| PLC tags | Uppercase tag number, hyphen dropped | \`LT101\`, \`M101\` |
| PLC UDT members | PascalCase. An underscore only after a prefix or between an area and a name | \`Sts.Running\`, \`Cfg.StartDelay\`, \`Area10_Mixing\` |
| PLC types | Type prefix | \`UDT_Motor\`, \`AOI_Valve\` |
| Ignition folders and tags | PascalCase, no spaces | \`Plant1/Area10/Line1/M101\` |
| Ignition UDT definitions | PascalCase, no prefix, in folders | \`Motor\` |
| Perspective views | PascalCase paths | \`Faceplates/Motor\` |
| SQL tables and columns | lower snake_case, singular tables | \`equipment_event\`, \`site_id\` |
| Plain MQTT / UNS topics | lowercase, slash-separated | \`meridian/plant1/area10/line1/m101\` |
| Sparkplug B | Fixed namespace, house mapping below | \`spBv1.0/Plant1/DDATA/Area10_Line1/M101\` |

**Units never go in member names.** \`Cfg.StartDelay\`, not \`Cfg.StartDelay_ms\`. Units live in the description and in the engineering-unit properties (tags, UDT members, the data dictionary).
Spaces and special characters are legal in many places but cause trouble in scripts, bindings, OPC item paths and URLs. Avoid them.

### Why case matters in some layers and not others

Ignition tag paths are not a place to rely on case. Treat \`M101\` and \`m101\` as the same thing in your head and never create two tags that differ only by case. **MQTT topics are case sensitive**: \`Meridian/Plant1\` and \`meridian/plant1\` are different topics, and a subscriber will miss messages if the case differs. SQL identifiers vary by database and quoting. A rule that is easy to remember beats a rule that is correct in one place: the only safe route is **one canonical form per layer, generated by a script where possible**.

### The PLC layer

Follow the structure in {{lesson:plc-best-practices}}. Instance names come from the drawing, types carry a prefix, members read as statements. The house \`UDT_Motor\` has nested member structures (\`Cmd\`, \`Sts\`, \`Cfg\`, \`Alm\`):

\`\`\`text
M101                : UDT_Motor
  Cmd.Start         BOOL   (written by HMI, cleared by PLC)
  Cmd.Stop          BOOL
  Cmd.Reset         BOOL
  Sts.Running       BOOL
  Sts.Ready         BOOL
  Sts.Fault         BOOL
  Sts.Auto          BOOL
  Cfg.StartDelay    DINT   (ms)
  Alm.Overload      BOOL
LT101               : an analog-input type in the same style
  Value             REAL   (m, 0.0 to 5.0)
  Alm.HighHigh      BOOL
\`\`\`

The units are in the comments above, not in the member names. See {{lesson:plc-udt}} for the full member table.

### The Ignition layer

Ignition has three kinds of names to plan: the {{term:ign-tag-provider|tag provider}}, the folder tree and the UDT definitions. Check the 8.3 manual's tag and tag-provider pages for the legal characters and any length limits before you fix your rules. Beyond that the structure is yours. The house provider is \`default\`.

A {{term:ign-tag-path|tag path}} looks like \`[default]Plant1/Area10/Line1/M101/Sts/Running\`. The part in square brackets is the provider. Everything after is folders, the UDT instance and its members.

Put the **ISA-95 hierarchy** in the folders: site (Plant1), area (Area10 Batching, Area20 Packaging), line, then equipment. The enterprise (Meridian) shows up in the UNS topic and the MES model, not in the tag path. Use the levels you have and no more.

{{diagram:tree}}

In text form:

\`\`\`text
[default]
  Plant1                  (site)
    Area10                (area, Batching)
      Line1               (line)
        M101              (UDT instance, type Motor)
        LT101             (UDT instance, type AnalogIn)
\`\`\`

{{diagram:chain}}

Keep UDT definitions in a folder tree of their own if the list grows. Renaming a definition after instances exist breaks the link to those instances, so name definitions as you would name a database table: once, carefully. Parameterize them: the house \`Motor\` definition has parameters \`PLC\` and \`InstanceName\` that build each member's OPC item path (\`ns=1;s=[{PLC}]{InstanceName}.Sts.Running\`), so an instance needs only parameter values, not 40 edited tags. See {{lesson:ign-udts}}.

### Views, scripts and bindings

Perspective views, custom properties and script functions follow the same casing as the tag tree. A faceplate takes the path of the UDT instance as a parameter, so \`Faceplates/Motor\` with \`tagPath = [default]Plant1/Area10/Line1/M101\` works for every motor. Names inside views that are shown to operators (labels) can be human text, kept in one place such as the tag's Documentation property or a description, not retyped on screens.

### Databases

SQL names should read well in a query. Use \`snake_case\`, singular table names and an explicit key that matches the plant identity:

\`\`\`sql
CREATE TABLE equipment_event (
  event_id       BIGINT PRIMARY KEY,
  site_id        VARCHAR(16)  NOT NULL,   -- 'Plant1'
  equipment_id   VARCHAR(40)  NOT NULL,   -- 'M101'
  event_type     VARCHAR(20)  NOT NULL,   -- 'RUN', 'STOP', 'FAULT'
  event_time     TIMESTAMP    NOT NULL
);
\`\`\`

Store the same \`equipment_id\` string you use in the tag path and the PLC. Tag numbers are unique per area range, so the key is \`site_id\` plus \`equipment_id\`. If a report must display "Batching Mixer Motor", look it up in an equipment table; do not store the label as the key.

### MES and the UNS

In a MES equipment model, the enterprise > site > area > line > cell levels mirror the ISA-95 hierarchy, so reuse the same names. The {{term:uns|Unified Namespace}} has two rules, and they must not be mixed:

1. **Plain MQTT / UNS topics** carry the ISA-95 path in lowercase: \`meridian/plant1/area10/line1/m101/sts/running\`.
2. **Sparkplug B** has a fixed namespace, \`spBv1.0/<group_id>/<msg_type>/<edge_node_id>/<device_id>\`. The house map is group_id = \`Plant1\`, edge_node_id = \`Area10_Line1\`, device_id = \`M101\`, and the metric name is \`Sts/Running\`. **Never put an ISA-95 path inside a Sparkplug topic.** The hierarchy rides in the group, node, device and metric names.

Decide up front which levels go where and document it. See {{lesson:proto-sparkplug}} and {{lesson:mes-uns}}.

## Worked example: one motor everywhere

Mixer motor M-101 at Meridian Foods Plant 1 (Chicago), Area10 Batching, Line 1:

| System | Name | Notes |
|---|---|---|
| P&ID, I/O list | \`M-101\` | Source of truth, with the hyphen |
| PLC (Logix) | \`M101\` : \`UDT_Motor\` | Hyphen dropped. Member \`Sts.Running\`, path \`M101.Sts.Running\` |
| OPC item path | \`ns=1;s=[PLC1]M101.Sts.Running\` | Built by the UDT's parameters (\`PLC\` = \`PLC1\`, \`InstanceName\` = \`M101\`) |
| Ignition tag path | \`[default]Plant1/Area10/Line1/M101/Sts/Running\` | UDT type \`Motor\` |
| Historian | same tag path | History is stored against the tag, so the name above is the series name |
| Perspective | \`Faceplates/Motor\`, param \`tagPath\` = \`[default]Plant1/Area10/Line1/M101\` | One view for all motors |
| SQL | \`site_id = 'Plant1'\`, \`equipment_id = 'M101'\` | Event and downtime tables |
| MES equipment model | \`Meridian/Plant1/Area10/Line1/M101\` | Enterprise/site/area/line/equipment |
| Plain MQTT / UNS topic | \`meridian/plant1/area10/line1/m101/sts/running\` | Lowercase, same hierarchy |
| Sparkplug B | \`spBv1.0/Plant1/DDATA/Area10_Line1/M101\`, metric \`Sts/Running\` | group_id \`Plant1\`, edge node \`Area10_Line1\`, device \`M101\`. No ISA-95 path in the topic |
| CMMS asset | \`P1-M101\` | Maintenance asset ID, with the tag number embedded |

The same walk for an instrument, with the drawing-to-code mapping shown once:

| Layer | Name |
|---|---|
| P&ID, loop sheet, alarm worksheet | \`LT-101\`, alarms \`LAH-101\` and \`LAHH-101\` |
| PLC tag | \`LT101\` (0 to 5.0 m) |
| Ignition path | \`[default]Plant1/Area10/Line1/LT101\` |
| UNS topic | \`meridian/plant1/area10/line1/lt101\` |

The test is a mechanical one: given the P&ID tag \`M-101\`, a person can write the other names without looking them up. If a name needs a spreadsheet to decode, the convention has a gap.

## What a good tag-naming standard document contains

Write it as a short document, not a manual. Put it where the team works and under version control.

1. **Scope.** Which systems the standard covers.
2. **Identity rules.** How a tag number is formed and issued, who issues it, how a new one is requested.
3. **Per-layer styles.** The table above, for your plant.
4. **Hierarchy.** The ISA-95 levels, with the allowed names at each (site codes, area codes).
5. **Member vocabulary.** The shared words: \`Running\`, \`Fault\`, \`Auto\`, \`Ready\`, \`Cmd\`, \`Sts\`, \`Cfg\`, \`Alm\`. A {{term:data-dictionary|data dictionary}} lists them with types, units and meaning.
6. **Reserved words and prohibited characters.**
7. **Worked examples**, including the table above for a real piece of equipment.
8. **Change process.** How names change and what else gets updated.
9. **Review checklist.** What reviewers look for in a pull request.

> [!tip] Make the standard testable
> A script can check names. Export the tag tree as JSON, match every path against a regular expression, and fail the review when a name does not match. A rule a script can check is a rule that gets followed.

## Common conflicts and how to resolve them

- **PLC programmer uses \`Pump1\`, drawing says \`P-101\`.** The drawing wins; the PLC tag becomes \`P101\`. Rename in the PLC while the project is small.
- **The OEM skid has its own tag names.** Wrap the OEM tags in your UDT or alias, and keep the OEM name in the description. Do not rename the skid's internal program.
- **A site already has a convention.** Adopt it if it is coherent, and document the translation to the enterprise convention at the boundary (Gateway Network or UNS).
- **Several plants, different old names.** Standardize the enterprise names and site codes first (\`Plant1\`, \`Plant2\`, \`Plant3\`). The site folder is the first level, and everything beneath can be migrated plant by plant.

## Renaming safely

Names are referenced from places you cannot see: scripts, bindings, history, SQL rows, MES mappings, reports, notebooks and operators' habits. Before renaming anything:

1. Search the project export and source control for the old name.
2. List the systems that store it (history, SQL, MES, UNS retained messages).
3. Decide whether to migrate stored data or to keep an alias table.
4. Do the change in one controlled window and record it in the change log.
`,

  eli5: `
Imagine a school where every kid has a different name depending on who you ask. The teacher calls Maria "Maria", the lunch lady has her down as "Table 4 girl", the bus driver lists her as "Stop 12 rider", and the nurse has her as "Student 2231". When a note comes home saying "she had a fever", nobody can tell which kid it is about.

The fix is easy. Give each child one official ID. Then every list, from lunch to bus to nurse, uses that ID, and the nicer names are written next to it. The rules for making the ID are simple enough that a new teacher can work it out without asking: grade, class, then number.

A factory has the same problem with machines. A pump shows up on the drawings, in the controller, on the screen, in the database and in the maintenance system, and each place may call it something different. A naming standard is the rule that says: use the drawing's name everywhere, and build all the other names from it the same way every time.
`,

  why: `
**Why derive names instead of choosing them?** Mechanical rules scale. If a person can compute the Ignition path from the P&ID tag, nobody maintains a mapping table, and a new integrator is productive on day one. If each system gets a hand-picked name, you have a translation problem at every boundary, and the translation tables rot.

**Why the drawing is the root.** The P&ID is the one artifact the plant already controls, with a change process and a legal-ish status. Operators, maintenance and the engineering contractor all use it. Starting from it means your names match what people see on the floor.

**Why avoid putting meaning in the position of the name.** Teams love encoding everything: \`CHI_MIX_L1_P101_RUN_STS\`. It works until a pump moves to another line or a value gets a second meaning. Keep the hierarchy in folders and the leaf names short and stable. Paths change when equipment moves; identities should not.

**Why UDT member names are a public API.** Once a historian query, a report and a faceplate refer to \`Sts.Running\`, renaming is a project. Pick a shared vocabulary across types, as in {{lesson:plc-udt}}, and treat changes like interface changes.

**Where integrators disagree.** Some prefer flat names with prefixes (\`CHI_MIX_P101\`) because they survive being copied into logs and filenames. Others prefer deep folder trees because they navigate well and map to ISA-95. A related argument is whether the Ignition tree should mirror the physical plant (area/line/cell) or the equipment type (all pumps in one folder). The usual answer is the plant hierarchy for tags, because operators think in places and the equipment type is already captured in the UDT definition. A third argument is whether to include the site in every path when each site has its own gateway. Include it. The day you merge sites into a central gateway or a UNS, you will be glad it is already there.

**The cost of a bad standard** is usually paid at integration time: the day a second site is added, the day MES is connected, the day a UNS is rolled out. A convention that cannot grow with the hierarchy has to be rewritten at that point, and every dependent system with it.
`,

  history: `
The ISA-5.1 tag-numbering scheme for instruments (function letters plus a loop number) goes back to mid-twentieth-century instrument standards and is still how process drawings are numbered. ISA-95 added a hierarchy of enterprise, site, area, line and cell for describing manufacturing operations. Ignition's folder-and-UDT tag model and later the Unified Namespace idea made it natural to carry that hierarchy into software paths and MQTT topics.
`,

  examples: [
    {
      title: "Checking a tag tree with a regular expression",
      body: `A team agrees that every UDT instance under a line folder must match \`^[A-Z]{1,4}[0-9]{3}[A-Z]?$\` (one to four letters, three digits, an optional loop suffix letter). A short script exports the tag tree to JSON and prints violations: \`Pump1\`, \`mixer_pump\`, \`P-101\` and \`P101_Pump\` all fail, while \`M101\`, \`LT101\` and \`TIC210A\` pass. It runs in the code review for every tag export.`
    },
    {
      title: "Merging two plants into one UNS",
      body: `Plant A calls its fillers \`Filler1\`, plant B calls its equivalents \`FIL-01\`. Because both sites already used the same hierarchy (site, area, line), the central UNS only needed an equipment-name mapping at the line level. The site and area folders matched the enterprise standard, so none of the history or reports moved.`
    }
  ],

  diagrams: {
    chain: `<svg viewBox="0 0 640 290" role="img" aria-label="One identity, M-101, derives names in the PLC, Ignition, the database, the UNS topic and the Sparkplug B mapping">
  <defs><marker id="int-naming-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="14" y="108" width="116" height="58" rx="6"/>
  <text class="dg-title dg-mid" x="72" y="134">P&amp;ID tag</text>
  <text class="dg-text-mono dg-mid" x="72" y="154">M-101</text>
  <rect class="dg-box" x="200" y="12" width="426" height="38" rx="5"/>
  <text class="dg-text-sm" x="212" y="36">PLC: M101 : UDT_Motor, M101.Sts.Running</text>
  <rect class="dg-box" x="200" y="58" width="426" height="38" rx="5"/>
  <text class="dg-text-sm" x="212" y="82">Ignition: [default]Plant1/Area10/Line1/M101/Sts/Running</text>
  <rect class="dg-box" x="200" y="104" width="426" height="38" rx="5"/>
  <text class="dg-text-sm" x="212" y="128">SQL: site_id = 'Plant1', equipment_id = 'M101'</text>
  <rect class="dg-box" x="200" y="150" width="426" height="38" rx="5"/>
  <text class="dg-text-sm" x="212" y="174">UNS: meridian/plant1/area10/line1/m101/sts/running</text>
  <rect class="dg-box" x="200" y="196" width="426" height="38" rx="5"/>
  <text class="dg-text-sm" x="212" y="220">Sparkplug: spBv1.0/Plant1/DDATA/Area10_Line1/M101</text>
  <text class="dg-text-muted" x="212" y="256">metric Sts/Running. The ISA-95 path never goes inside a Sparkplug topic.</text>
  <line class="dg-line" x1="130" y1="128" x2="200" y2="31" marker-end="url(#int-naming-ah)"/>
  <line class="dg-line" x1="130" y1="132" x2="200" y2="77" marker-end="url(#int-naming-ah)"/>
  <line class="dg-line" x1="130" y1="137" x2="200" y2="123" marker-end="url(#int-naming-ah)"/>
  <line class="dg-line" x1="130" y1="142" x2="200" y2="169" marker-end="url(#int-naming-ah)"/>
  <line class="dg-line" x1="130" y1="146" x2="200" y2="215" marker-end="url(#int-naming-ah)"/>
</svg>`,
    tree: `<svg viewBox="0 0 640 230" role="img" aria-label="An Ignition tag tree following the ISA-95 hierarchy: provider, site, area, line, then UDT instances with Cmd, Sts and Cfg members">
  <rect class="dg-box-accent" x="16" y="16" width="110" height="34" rx="5"/>
  <text class="dg-text-sm dg-mid" x="71" y="38">[default]</text>
  <rect class="dg-box" x="56" y="62" width="110" height="34" rx="5"/>
  <text class="dg-text-sm dg-mid" x="111" y="84">Plant1</text>
  <rect class="dg-box" x="96" y="108" width="110" height="34" rx="5"/>
  <text class="dg-text-sm dg-mid" x="151" y="130">Area10</text>
  <rect class="dg-box" x="136" y="154" width="110" height="34" rx="5"/>
  <text class="dg-text-sm dg-mid" x="191" y="176">Line1</text>
  <rect class="dg-box-accent" x="290" y="130" width="140" height="34" rx="5"/>
  <text class="dg-text-sm dg-mid" x="360" y="152">M101</text>
  <rect class="dg-box-accent" x="290" y="176" width="140" height="34" rx="5"/>
  <text class="dg-text-sm dg-mid" x="360" y="198">LT101</text>
  <rect class="dg-box" x="480" y="104" width="140" height="30" rx="5"/>
  <text class="dg-text-mono dg-mid" x="550" y="124">Cmd/Start</text>
  <rect class="dg-box" x="480" y="140" width="140" height="30" rx="5"/>
  <text class="dg-text-mono dg-mid" x="550" y="160">Sts/Running</text>
  <rect class="dg-box" x="480" y="176" width="140" height="30" rx="5"/>
  <text class="dg-text-mono dg-mid" x="550" y="196">Cfg/StartDelay</text>
  <line class="dg-line" x1="71" y1="50" x2="71" y2="79"/>
  <line class="dg-line" x1="111" y1="96" x2="111" y2="125"/>
  <line class="dg-line" x1="151" y1="142" x2="151" y2="171"/>
  <line class="dg-line" x1="246" y1="171" x2="290" y2="147"/>
  <line class="dg-line" x1="246" y1="171" x2="290" y2="193"/>
  <line class="dg-line" x1="430" y1="147" x2="480" y2="119"/>
  <line class="dg-line" x1="430" y1="147" x2="480" y2="155"/>
  <line class="dg-line" x1="430" y1="147" x2="480" y2="191"/>
  <text class="dg-text-muted" x="16" y="224">site / area / line / equipment instance / UDT members</text>
</svg>`
  },

  pitfalls: [
    "Letting the PLC programmer invent names instead of taking them from the P&ID.",
    "Mixing casing styles in one layer, then discovering that MQTT subscriptions are case sensitive.",
    "Putting spaces or special characters in tag, folder or view names.",
    "Encoding every attribute (site, area, state) into one long leaf name rather than into the hierarchy.",
    "Renaming a UDT definition or member after instances, bindings and history exist.",
    "Storing display labels as keys in SQL instead of stable equipment IDs.",
    "Writing the standard once and never checking it with a script or a review."
  ],

  keyTerms: ["naming-convention", "tag-number", "isa-5-1", "isa-95", "ign-tag-provider", "ign-tag-path", "udt", "uns", "data-dictionary", "mqtt-topic"],

  quiz: [
    {
      q: "A new integrator can work out every system's name for a pump from its P&ID tag with no spreadsheet. What does that demonstrate?",
      options: ["The names are derived mechanically from one identity", "The plant uses a flat namespace", "Every system uses the same case", "The convention has too few rules"],
      answer: 0,
      explain: [
        "Correct. Derivation removes translation tables, which is the main goal of a standard.",
        "The scheme may be hierarchical. Flatness is not the point.",
        "Layers can use different casing as long as each has a rule.",
        "A small rule set that still produces every name is a strength."
      ]
    },
    {
      q: "Why are MQTT UNS topics usually lowercased by a naming standard when Ignition tag paths use PascalCase?",
      options: ["Ignition cannot read lowercase", "MQTT topics are case sensitive, so one canonical form avoids missed subscriptions", "Sparkplug rejects uppercase letters", "Lowercase topics are faster"],
      answer: 1,
      explain: [
        "Ignition handles both. The standard chooses a form for consistency.",
        "Correct. A subscriber to the wrong case receives nothing, so a single canonical form per layer prevents silent failures.",
        "Sparkplug has no such rule. The reason is predictability, not a protocol restriction.",
        "Case has no effect on speed."
      ]
    },
    {
      q: "Instances of the UDT definition Equipment/Motor already exist across the plant. A team wants to rename the definition to Equipment/Drive. What should they expect?",
      options: ["Instances update automatically with no side effects", "Only history is affected", "Nothing, because UDTs are only for the PLC", "Orphaned instances unless the change is planned and migrated"],
      answer: 3,
      explain: [
        "Automatic update is not the behavior. Instances reference the type by name.",
        "Tags, views and scripts all depend on it, not just history.",
        "Ignition UDT definitions are Ignition objects, not PLC objects.",
        "Correct. The manual warns that renaming a definition after instances exist orphans them, so treat the name as an interface."
      ]
    },
    {
      q: "Which database design best follows a system-wide naming standard?",
      options: ["Store the display label as the key", "Store a new random number for each plant", "Store equipment_id = 'M101' (with site_id) and look up the display label from an equipment table", "Store the full Ignition tag path in every column name"],
      answer: 2,
      explain: [
        "Labels change for cosmetic reasons and would break joins.",
        "A random number discards the shared identity.",
        "Correct. A stable key shared with the PLC and Ignition joins everywhere, and labels can change without breaking data.",
        "Columns should be attributes. Paths belong in values and may change when equipment moves."
      ]
    },
    {
      q: "An OEM skid arrives with its own internal tag names that do not match your standard. What is the best practice?",
      options: ["Rewrite the OEM's program with your names", "Ignore your standard for that skid", "Rename the P&ID to match the OEM", "Wrap or alias the OEM tags in your UDT and keep the OEM name in the description"],
      answer: 3,
      explain: [
        "Rewriting an OEM program can void support and introduce bugs.",
        "One exception becomes a dozen and weakens the standard.",
        "The drawing is the root of identity for the plant, not the vendor's internal naming.",
        "Correct. Your layers stay consistent and you keep a record of the OEM name for support calls."
      ]
    },
    {
      q: "Which choice puts the hierarchy in the right place?",
      options: ["Site, area and line as folders; short stable equipment names as leaves", "All attributes in one long leaf name", "Equipment type as the top folder and nothing else", "No hierarchy, because folders slow the gateway"],
      answer: 0,
      explain: [
        "Correct. Folders carry place, leaves carry identity, and a move changes the path but not the identity.",
        "Long encoded names break when equipment moves or a value gains a second meaning.",
        "Operators think in places, and type is already captured by the UDT definition.",
        "Folders have no meaningful effect on performance and they map to ISA-95."
      ]
    }
  ],

  resources: [
    { title: "Tags (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags", type: "docs", source: "Inductive Automation" },
    { title: "Tag Paths (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-paths", type: "docs", source: "Inductive Automation" },
    { title: "Tag Providers (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-providers", type: "docs", source: "Inductive Automation" },
    { title: "User Defined Types - UDTs (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/user-defined-types-udts", type: "docs", source: "Inductive Automation" },
    { title: "Demystifying The Unified Namespace with Ignition", url: "https://inductiveautomation.com/resources/icc/2024/demystifying-the-unified-namespace-with-ignition", type: "video", source: "Inductive Automation" },
    { title: "Sparkplug 3.0.0 Specification", url: "https://sparkplug.eclipse.org/specification/version/3.0/documents/sparkplug-specification-3.0.0.pdf", type: "standard", source: "Eclipse Sparkplug" }
  ]
});
