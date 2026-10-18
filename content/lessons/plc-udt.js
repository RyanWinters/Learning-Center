LC.lesson({
  id: "plc-udt",
  title: "UDTs: designing data structures",
  track: "plc",
  minutes: 25,
  level: 3,
  prereqs: ["plc-tags", "plc-compare-math"],
  tags: ["udt", "data-types", "structure", "logix", "naming", "faceplates"],
  summary: "The single design decision that most separates a clean Logix project from a tag swamp: one structure per kind of equipment, grouped into Cmd, Sts, Cfg and Alm.",
  objectives: [
    "Design UDT_Motor, UDT_Valve and UDT_AnalogIn types with Cmd, Sts, Cfg and Alm member groups",
    "Explain how BOOL members pack into memory, why member order may matter, and how to check the real size",
    "Nest UDTs to build a layered structure and know when not to",
    "State the limits on editing a UDT online and plan around them",
    "Show how one UDT design maps to an Ignition UDT and a faceplate"
  ],

  body: `
## Why UDTs are the center of a Logix project

A {{term:udt|user-defined type}} (UDT) is a template for a bundle of related data. Instead of ten loose tags per motor (\`M101_Run\`, \`M101_Fault\`, \`M101_Speed\`...), you define a \`UDT_Motor\` structure once and create a tag of that type for every motor. The tag \`M101\` (the mixer motor in Area10 at Meridian Foods Plant 1) then has members such as \`M101.Cmd.Start\`, \`M101.Sts.Running\` and \`M101.Cfg.SpeedHigh\`.

The benefit is bigger than tidiness. A UDT is a contract. The PLC logic, the HMI, the historian and the alarm system can all assume the same member names exist on every motor. When you add 40 motors, nothing new needs inventing.

In Studio 5000 Logix Designer, user-defined types are under **Assets > Data Types > User-Defined** in the controller organizer. You name the type, add members with a data type and optional description, and then create tags of that type like any other.

## The grouping convention: Cmd, Sts, Cfg, Alm

Experienced integrators group members by who writes them. That makes the structure self-documenting, and it controls who is allowed to change what.

| Group | Written by | Examples |
|---|---|---|
| **Cmd** (command) | Operator, HMI, sequence logic | Start, Stop, Reset |
| **Sts** (status) | Equipment logic (PLC only) | Running, Ready, Fault, Auto, Speed, RunHours |
| **Cfg** (configuration) | Engineer, at commissioning | StartDelay, SpeedHigh, Description |
| **Alm** (alarm) | Equipment logic | FailToStart, Overload, CommLoss |

The rule that gives this its value: **the PLC logic is the only writer of Sts and Alm**, and the HMI is the only writer of Cmd (apart from automatic sequences that request the same thing). A Cfg value changes rarely and on purpose. When a bug shows a motor running in the HMI while the PLC thinks it is stopped, you know where to look.

> [!tip] Commands are requests
> Treat Cmd bits as requests, not outputs. The motor logic decides whether the request is allowed (interlocks, permissives, fault state). The physical output belongs to the logic, not to the HMI.

## The house Motor UDT

{{diagram:motor}}

\`\`\`text
UDT_Motor                   (UDT)
  Cmd : UDT_MotorCmd        (nested UDT; written by HMI, cleared by PLC)
    Start        BOOL
    Stop         BOOL
    Reset        BOOL
  Sts : UDT_MotorSts
    Running      BOOL
    Ready        BOOL
    Fault        BOOL
    Auto         BOOL       1 = automatic, 0 = manual
    Speed        REAL
    RunHours     REAL
  Cfg : UDT_MotorCfg
    StartDelay   DINT       fail-to-start timeout, ms (in the description)
    SpeedHigh    REAL
    Description  STRING
  Alm : UDT_MotorAlm
    FailToStart  BOOL
    Overload     BOOL
    CommLoss     BOOL
\`\`\`

This is the Meridian house standard. Every lesson in the course uses these exact names, so \`M101.Cmd.Start\` means the same thing in the PLC, in the Ignition UDT and on the faceplate. Units live in descriptions and engineering-unit properties, not in member names (\`Cfg.StartDelay\`, not \`Cfg.StartDelay_ms\`).

Using it is plain member access:

\`\`\`ladder
XIC(M101.Cmd.Start) XIO(M101.Cmd.Stop) XIO(M101.Sts.Fault) OTE(M101.Sts.Running)
\`\`\`

The rung is simplified for teaching: a real motor block adds the run feedback, the seal-in, the fail-to-start timer and the output. Overloads and E-stops are not in this rung at all. They are hardwired in the starter coil circuit, and the PLC only monitors them. You will wrap that logic in an AOI in {{lesson:plc-aoi}}, and the AOI takes a \`UDT_Motor\` as one InOut parameter. That pairing is the whole idea: data structure plus the code that works on it.

{{sim:sim-udt-motor}}

## Valve and AnalogIn

Do the same for other equipment. A discrete valve has Open and Close commands, OpenLS and CloseLS feedback, travel timers, and FailToOpen and FailToClose alarms. An analog input follows the scaling lesson, {{lesson:plc-analog}}. Here is a sketch for a level transmitter such as \`LT101\` (0 to 5.0 m):

\`\`\`text
UDT_AnalogIn                (UDT)
  Cfg
    RawMin / RawMax     DINT       counts at 4 mA and 20 mA (6242 / 31208 on the teaching card)
    EUMin / EUMax       REAL       engineering range
    HHLimit, HLimit, LLimit, LLLimit  REAL
    Deadband            REAL
    Delay               DINT       alarm delay, ms
  Sts
    Raw                 DINT
    PV                  REAL       scaled value
    BadSignal           BOOL
  Alm
    HH, H, L, LL        BOOL
\`\`\`

All limits live in Cfg, so any tank or flow meter instance can be retuned without touching the logic.

## How data is laid out in memory

Logix stores a UDT as one contiguous block. Three rules affect real projects.

1. **BOOL packing.** BOOLs inside a structure are not stored one per byte. Consecutive BOOLs share a hidden host member, so a run of BOOLs takes far less space than one slot each. The host width (and so the exact byte count for a given number of BOOLs) is not something to memorize. Open the Data Type editor in your Studio 5000 version and read the size it reports. A single stray BOOL between two REALs still costs a whole slot once padding is added.
2. **Alignment.** REAL and DINT members start on 4-byte boundaries. Putting a BOOL group, then a REAL, then another BOOL group may leave padding. Grouping all BOOLs together, then the DINTs and REALs, tends to reduce wasted space. Compare the size shown in the editor before and after reordering.
3. **Total size.** Larger structures are copied and transferred as one lump. A Motor of 100 bytes is fine. A "mega-UDT" of 10 KB copied by a MSG instruction to another controller every scan is a performance cost.

Packing is also why the nested group pattern is cheap. A \`UDT_MotorCmd\` of three BOOLs costs very little memory; the readable names are the point. The size is shown in the Data Type editor.

## Nesting

A UDT can contain another UDT as a member, as in the Motor above. Nesting works best for the Cmd/Sts/Cfg/Alm groups, and for reusing a small structure such as a \`UDT_TimestampedValue\` or a shared \`UDT_Interlock\` block. Keep it shallow: two levels (equipment, then group) is plenty. Deep chains make tag paths long (\`Area10.Line1.M101.Motor.Sts.Run.Flag\`) and make HMI binding awkward. Also remember that arrays of UDTs are allowed. \`Motors[0..9]\` of type \`UDT_Motor\` gives you ten indexable motors, which is the foundation of loop-driven code in {{lesson:plc-languages}}.

## Editing a UDT online (the limits)

Think of changing a UDT as changing a rubber stamp after you have stamped 200 pages. Every tag of that type has to change, and changing a type with live data is restricted.

- Logix Designer lets you make some UDT edits while the controller is running, but not all of them. Adding, removing or reordering members changes the size and layout of every tag of that type, so an online edit that does that is restricted or requires a download, depending on your version and the controller state.
- Pure description changes are safe. Member names, types and order are not.
- A change that does go through can reset or reinitialize member data, so check what the controller does to existing values before doing it on live equipment.
- Anything that refers to the UDT elsewhere (an AOI parameter, an Ignition UDT definition, a message mapping) must be updated too.

The practical lesson is to **design for change**. Put spare, reserved members in the first release (a few spare BOOLs and a couple of REALs, named \`Spare1\`, \`Spare2\`), keep Cfg and Sts as separate nested UDTs so each can be revised on its own, and treat the member list as a public API. Plan UDT changes for a maintenance window and keep the offline project as the source of truth. Check your Logix Designer release notes for what your version allows.

## From PLC to Ignition and faceplates

A tidy UDT pays off later, because Ignition can mirror it. An Ignition UDT definition named \`Motor\` has folders \`Cmd\`, \`Sts\`, \`Cfg\` and \`Alm\` that mirror the PLC. The OPC item path is built from parameters, \`ns=1;s=[{PLC}]{InstanceName}.Sts.Running\`, and an instance path becomes \`[default]Plant1/Area10/Line1/M101/Sts/Running\`. Group-based naming means a single Perspective faceplate view with one \`tagPath\` parameter (for example \`[default]Plant1/Area10/Line1/M101\`) can show any motor, since \`{tagPath}/Sts/Running\`, \`{tagPath}/Cmd/Start\` and so on exist on all of them. Alarm configuration inherits from the Alm group, and the historian picks up the Sts members. {{diagram:mapping}}

Mirroring PLC UDTs in Ignition is covered in {{lesson:ign-udts}} and naming standards in {{lesson:int-naming}}.

> [!warning] Naming is forever
> Once an HMI, historian and report refer to \`Sts.Running\`, renaming it is a cross-system change. Pick names carefully, and use the same vocabulary across motor, valve and pump types (Running, Fault, Ready, Auto).
`,

  eli5: `
Think of a registration form at a gym. Every member fills out the same form: name, phone, membership type, emergency contact. The front desk always knows where to look, and the form never has to be reinvented for a new member.

A UDT is that form for a pump or a valve. Instead of every pump having its own random pile of sticky notes (one that says "running," another "broken," a third "speed"), each pump gets the same form with the same boxes. The form is also divided into sections: a box for what you are asking the pump to do, a box for what the pump reports back, a box for its settings, and a box for its alarms.

Because everyone uses the same form, the screen that shows a pump can work for any pump. It just needs to be told which form to read. If you want to add a new box to the form after 200 people have filled it out, you have to reprint everyone's copy, so it pays to leave a couple of blank boxes at the start.
`,

  why: `
**Why group by Cmd/Sts/Cfg/Alm?** Because it answers "who is allowed to write this?" in the name. Without it, someone eventually writes a status bit from the HMI "to test," and a ghost fault appears. With it, you can set external access rules and code reviews can check them at a glance. It also maps neatly to Ignition permissions: operators get Cmd, engineers get Cfg, nobody but the PLC touches Sts.

**Why one big structure and not many tags?** Consistency is leverage. A single motor AOI, a single Perspective faceplate and a single Ignition UDT serve every motor. Without it you maintain N bespoke variants, and they drift. The argument against is size: an enormous UDT forces every instance to carry members it doesn't use (a fixed-speed pump with VFD members). Good integrators resolve this with a family of types (\`UDT_MotorFixed\`, \`UDT_MotorVFD\`) or with Cfg flags, not by making each motor unique.

**Why the debate about nesting?** Nested groups read well and bind well, but add path length and a type to maintain per group. Some teams flatten to one level with prefixes (\`CmdStart\`, \`StsRunning\`); this course uses nested groups. Both work. What matters is consistency across the whole project.

**Why worry about online edits?** Because the cost shows up on the plant floor, when you can't download without stopping the process. Teams that treat the UDT as a public API and leave room to grow rarely get forced into a shutdown.

**Why packing and size?** Not because memory is scarce on a 5580. It matters for communications: structures that cross MSG, produced/consumed tags or OPC reads get copied whole, so a lean structure moves faster.
`,

  history: `
Early Allen-Bradley PLCs (PLC-5, SLC 500) used fixed data files: N7:0, B3:1, F8:4. Everything was an address with a meaning you had to remember. ControlLogix introduced tag-based programming and user-defined data types in the late 1990s, with symbolic names and structured data. Integrators then spent two decades arguing about conventions. PlantPAx and similar libraries standardized the "command, status, config" separation in vendor-supplied types.
`,

  examples: [
    {
      title: "Ten pumps, one definition",
      body: `Create a tag \`Motors\` of type \`UDT_Motor\` with dimension [10]. A FOR loop in a routine can call the same motor logic for \`Motors[i]\`. In Ignition, one Perspective view with a \`tagPath\` parameter shows each motor. Adding motor 11 is one array size change in the PLC and one folder in Ignition.`
    },
    {
      title: "Spares paying for themselves",
      body: `The first release of \`UDT_Motor\` included \`Cfg.Spare1\` (DINT) and \`Alm.Spare1\` to \`Alm.Spare4\` (BOOL). Commissioning added a 'Seal water loss' alarm. It took the first spare BOOL, was renamed in a maintenance window, and the HMI binding was updated. No members were added, so the structure kept the same size.`
    }
  ],

  diagrams: {
    motor: `<svg viewBox="0 0 640 260" role="img" aria-label="Motor UDT split into Cmd, Sts, Cfg and Alm groups showing who writes each group">
  <rect class="dg-box-accent" x="20" y="14" width="600" height="34" rx="6"/>
  <text class="dg-title" x="34" y="37">UDT_Motor   M101, M102, ... one tag per motor</text>
  <rect class="dg-box" x="20" y="64" width="140" height="130" rx="6"/>
  <text class="dg-text" x="34" y="88">Cmd</text>
  <text class="dg-text-mono" x="34" y="112">Start</text>
  <text class="dg-text-mono" x="34" y="130">Stop</text>
  <text class="dg-text-mono" x="34" y="148">Reset</text>
  <text class="dg-text-sm" x="34" y="182">writer: HMI, sequence</text>
  <rect class="dg-box" x="175" y="64" width="140" height="130" rx="6"/>
  <text class="dg-text" x="189" y="88">Sts</text>
  <text class="dg-text-mono" x="189" y="112">Running</text>
  <text class="dg-text-mono" x="189" y="130">Ready / Fault</text>
  <text class="dg-text-mono" x="189" y="148">Auto / Speed</text>
  <text class="dg-text-sm" x="189" y="182">writer: PLC logic</text>
  <rect class="dg-box" x="330" y="64" width="140" height="130" rx="6"/>
  <text class="dg-text" x="344" y="88">Cfg</text>
  <text class="dg-text-mono" x="344" y="112">StartDelay</text>
  <text class="dg-text-mono" x="344" y="130">SpeedHigh</text>
  <text class="dg-text-mono" x="344" y="148">Description</text>
  <text class="dg-text-sm" x="344" y="182">writer: engineer</text>
  <rect class="dg-box-alarm" x="485" y="64" width="135" height="130" rx="6"/>
  <text class="dg-text" x="499" y="88">Alm</text>
  <text class="dg-text-mono" x="499" y="112">FailToStart</text>
  <text class="dg-text-mono" x="499" y="130">Overload</text>
  <text class="dg-text-mono" x="499" y="148">CommLoss</text>
  <text class="dg-text-sm" x="499" y="182">writer: PLC logic</text>
  <text class="dg-text-sm" x="20" y="226">Same member names in the PLC, the Ignition UDT and the faceplate.</text>
  <text class="dg-text-sm" x="20" y="246">Cmd up from the HMI; Sts and Alm down from the PLC.</text>
</svg>`,
    mapping: `<svg viewBox="0 0 640 200" role="img" aria-label="One UDT design used by Logix tags, an Ignition UDT definition and a Perspective faceplate">
  <defs><marker id="plc-udt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <rect class="dg-box-accent" x="20" y="60" width="160" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="100" y="94">Logix UDT</text>
  <text class="dg-text-sm dg-mid" x="100" y="116">UDT_Motor</text>
  <rect class="dg-box" x="240" y="60" width="160" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="94">Ignition UDT</text>
  <text class="dg-text-sm dg-mid" x="320" y="116">Motor, same members</text>
  <rect class="dg-box" x="460" y="60" width="160" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="540" y="94">Faceplate view</text>
  <text class="dg-text-sm dg-mid" x="540" y="116">param: tagPath</text>
  <line class="dg-line" x1="180" y1="100" x2="236" y2="100" marker-end="url(#plc-udt-ah)"/>
  <line class="dg-line" x1="400" y1="100" x2="456" y2="100" marker-end="url(#plc-udt-ah)"/>
  <text class="dg-text-sm" x="20" y="180">One design, three consumers. A renamed member breaks all three.</text>
</svg>`
  },

  pitfalls: [
    "Creating a UDT per machine instead of per kind of equipment, then copying logic for each.",
    "Letting the HMI write Sts bits or the PLC logic write Cmd bits, which destroys the ownership rule.",
    "Scattering single BOOLs between REALs and wasting space with padding (check the size in the Data Type editor).",
    "No spare members, so every small change becomes a UDT edit and a download.",
    "Renaming members after the HMI and historian are built, without a cross-system change list.",
    "Nesting four or five levels deep, which makes tag paths unreadable."
  ],

  keyTerms: ["udt", "udt-member", "bool-packing", "nested-udt", "cmd-sts-cfg", "faceplate"],

  quiz: [
    {
      q: "Which group should an operator's Start button write to in a Motor UDT?",
      options: ["Sts.Running", "Cfg.StartDelay", "Alm.FailToStart", "Cmd.Start"],
      answer: 3,
      explain: [
        "Sts members are written only by PLC logic. The HMI writing Running would lie about the motor.",
        "Cfg holds slow-changing settings, not operator actions.",
        "Alm members are written by the PLC when a fault is detected.",
        "Correct. Cmd members are requests, and the motor logic decides whether to honor them."
      ]
    },
    {
      q: "Why do Cmd, Sts, Cfg and Alm groups matter to an integrator?",
      options: ["The group name tells you who may write each member, which makes bugs and permissions easy to reason about", "They make the project compile faster", "Logix requires them", "They reduce memory by half"],
      answer: 0,
      explain: [
        "Correct. Ownership is readable from the member path.",
        "Compile speed is unaffected.",
        "It is a convention, not a Logix rule.",
        "Grouping does not change memory use much."
      ]
    },
    {
      q: "A structure has BOOL, REAL, BOOL, REAL, BOOL. What is a good way to improve it?",
      options: ["Convert the BOOLs to DINTs", "Group the BOOLs together so they pack into a shared hidden host member", "Make every member a REAL", "Nothing: order never matters"],
      answer: 1,
      explain: [
        "That wastes more space and loses bit clarity.",
        "Correct. Consecutive BOOLs share a hidden host member, so scattering them between REALs can add padding.",
        "A REAL for a bit is wasteful and confusing.",
        "Order affects padding and size."
      ]
    },
    {
      q: "You need to add a member to a UDT used by 60 motors on a running plant. What is the best planning approach?",
      options: ["Add it online whenever it is convenient", "Create a second UDT with a different name for each new member", "Reserve spare members up front and schedule structural changes for a maintenance window with the offline project as the source", "Delete the UDT and recreate it"],
      answer: 2,
      explain: [
        "Structural edits are restricted online and affect every tag of that type.",
        "That fragments the design and defeats reuse.",
        "Correct. Spares avoid most structural changes, and the rest should be planned.",
        "Deleting a type in use is not possible without removing all its tags."
      ]
    },
    {
      q: "What makes one Perspective faceplate work for any motor?",
      options: ["Perspective auto-detects member names", "Each motor has its own copy of the faceplate", "The PLC sends the faceplate layout", "Every motor has the same UDT member names, so one tagPath parameter is enough"],
      answer: 3,
      explain: [
        "Perspective binds to paths you define. It does not guess.",
        "Copies defeat the purpose and drift apart.",
        "The PLC only holds data, not screen layouts.",
        "Correct. The structure is the contract the view relies on."
      ]
    },
    {
      q: "Which is the better UDT nesting depth for equipment data?",
      options: ["One level with no groups", "Two levels: the equipment, then Cmd/Sts/Cfg/Alm groups", "Six levels so every concept has its own type", "Nesting is not allowed in Logix"],
      answer: 1,
      explain: [
        "Flat is workable but groups ownership less clearly.",
        "Correct. It balances readability and short tag paths.",
        "Deep chains make paths long and bindings brittle.",
        "Nesting is supported."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers I/O and Tag Data", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm004_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Design Considerations", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm094_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "PlantPAx Process Solutions Technical Documentation", url: "https://www.rockwellautomation.com/en-us/support/documentation/technical/capabilities/plantpax-process-solutions.html", type: "docs", source: "Rockwell Automation" }
  ]
});
