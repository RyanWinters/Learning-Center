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
    "Design Motor, Valve and AnalogIn UDTs with Cmd, Sts, Cfg and Alm member groups",
    "Explain how BOOL members pack into memory and why member order matters",
    "Nest UDTs to build a layered structure and know when not to",
    "State the limits on editing a UDT online and plan around them",
    "Show how one UDT design maps to an Ignition UDT and a faceplate"
  ],

  body: `
## Why UDTs are the center of a Logix project

A {{term:udt|user-defined type}} (UDT) is a template for a bundle of related data. Instead of ten loose tags per motor (\`Pump1_Run\`, \`Pump1_Fault\`, \`Pump1_Speed\`...), you define a \`Motor\` structure once and create a tag of that type for every motor. The tag \`Pump1\` then has members \`Pump1.Run\`, \`Pump1.Fault\`, \`Pump1.Speed\`.

The benefit is bigger than tidiness. A UDT is a contract. The PLC logic, the HMI, the historian and the alarm system can all assume the same member names exist on every motor. When you add 40 motors, nothing new needs inventing.

In Studio 5000 Logix Designer, user-defined types are under **Assets > Data Types > User-Defined** in the controller organizer. You name the type, add members with a data type and optional description, and then create tags of that type like any other.

## The grouping convention: Cmd, Sts, Cfg, Alm

Experienced integrators group members by who writes them. That makes the structure self-documenting, and it controls who is allowed to change what.

| Group | Written by | Examples |
|---|---|---|
| **Cmd** (command) | Operator, HMI, sequence logic | Start, Stop, Reset, ManualMode, SpeedSP |
| **Sts** (status) | Equipment logic (PLC only) | Running, Faulted, Ready, Speed, RunHours |
| **Cfg** (configuration) | Engineer, at commissioning | HasVFD, FailTime, MaxSpeed, Interlocked |
| **Alm** (alarm) | Equipment logic | FailToStart, FailToStop, Overload |

The rule that gives this its value: **the PLC logic is the only writer of Sts and Alm**, and the HMI is the only writer of Cmd (apart from automatic sequences that request the same thing). A Cfg value changes rarely and on purpose. When a bug shows a motor running in the HMI while the PLC thinks it is stopped, you know where to look.

> [!tip] Commands are requests
> Treat Cmd bits as requests, not outputs. The motor logic decides whether the request is allowed (interlocks, permissives, fault state). The physical output belongs to the logic, not to the HMI.

## A Motor UDT

{{diagram:motor}}

\`\`\`text
Motor                       (UDT)
  Cmd : Motor_Cmd           (nested UDT)
    Start        BOOL
    Stop         BOOL
    Reset        BOOL
    Auto         BOOL       1 = automatic, 0 = manual
    SpeedSP      REAL
  Sts : Motor_Sts
    Running      BOOL
    Faulted      BOOL
    Ready        BOOL
    InAuto       BOOL
    Speed        REAL
    RunHours     REAL
  Cfg : Motor_Cfg
    HasVFD       BOOL
    StartTimeMs  DINT       fail-to-start timeout
    MaxSpeed     REAL
  Alm : Motor_Alm
    FailToStart  BOOL
    FailToStop   BOOL
    Overload     BOOL
\`\`\`

Using it is plain member access:

\`\`\`ladder
XIC(Pump1.Cmd.Start) XIO(Pump1.Cmd.Stop) XIO(Pump1.Sts.Faulted) OTE(Pump1.Sts.Running)
\`\`\`

The rung is simplified. A real motor block adds the run feedback, the seal-in, the fail-to-start timer and the output. You will wrap that logic in an AOI in {{lesson:plc-aoi}}, and the AOI takes a \`Motor\` as one InOut parameter. That pairing is the whole idea: data structure plus the code that works on it.

{{sim:sim-udt-motor}}

## Valve and AnalogIn

Do the same for other equipment. A discrete valve has Open and Close commands, OpenLS and CloseLS feedback, travel timers, and FailToOpen and FailToClose alarms. An analog input follows the scaling lesson, {{lesson:plc-analog}}:

\`\`\`text
AnalogIn                    (UDT)
  Cfg
    RawMin / RawMax     DINT       counts at 4 mA and 20 mA
    EUMin / EUMax       REAL       engineering range
    HHLimit, HLimit, LLimit, LLLimit  REAL
    Deadband            REAL
    DelayMs             DINT
  Sts
    Raw                 DINT
    PV                  REAL       scaled value
    BadSignal           BOOL
  Alm
    HH, H, L, LL        BOOL
\`\`\`

All limits live in Cfg, so any tank, pump or flow meter instance can be retuned without touching the logic.

## How data is laid out in memory

Logix stores a UDT as one contiguous block. Three rules affect real projects.

1. **BOOL packing.** BOOLs inside a structure are packed into 32-bit blocks, not one byte each. Several BOOLs in a row share one hidden DINT. If you have 5 BOOLs, the structure uses 4 bytes for them. A single stray BOOL between two REALs still costs a full 4-byte slot.
2. **Alignment.** REAL and DINT members start on 4-byte boundaries. Putting a BOOL block, then a REAL, then another BOOL block may leave padding. Grouping all BOOLs together, then the DINTs and REALs, reduces wasted space.
3. **Total size.** Larger structures are copied and transferred as one lump. A Motor of 100 bytes is fine. A "mega-UDT" of 10 KB copied by a MSG instruction to another controller every scan is a performance cost.

Packing is also why the nested group pattern is handy. \`Motor_Cmd\` with 8 BOOLs uses 4 bytes. The memory cost is minor; the readable names are the point. You can see the size in the data type editor when you expand it.

## Nesting

A UDT can contain another UDT as a member, as in the Motor above. Nesting works best for the Cmd/Sts/Cfg/Alm groups, and for reusing a small structure such as a \`Timestamped_Value\` or a shared \`Interlock\` block. Keep it shallow: two levels (equipment, then group) is plenty. Deep chains make tag paths long (\`Area1.Pump1.Motor.Sts.Run.Flag\`) and make HMI binding awkward. Also remember that arrays of UDTs are allowed. \`Pumps[0..9]\` of type Motor gives you ten indexable pumps, which is the foundation of loop-driven code in {{lesson:plc-languages}}.

## Editing a UDT online (the limits)

Think of changing a UDT as changing a rubber stamp after you have stamped 200 pages. Every tag of that type has to change, and changing a type with live data is restricted.

- Logix Designer lets you make some UDT edits while the controller is running, but not all of them. Adding, removing or reordering members changes the size and layout of every tag of that type, so an online edit that does that is restricted or requires a download, depending on your version and the controller state.
- Pure description changes are safe. Member names, types and order are not.
- A change that does go through can reset or reinitialize member data, so check what the controller does to existing values before doing it on live equipment.
- Anything that refers to the UDT elsewhere (an AOI parameter, an Ignition UDT definition, a message mapping) must be updated too.

The practical lesson is to **design for change**. Put spare, reserved members in the first release (a few spare BOOLs and a couple of REALs, named \`Spare1\`), keep Cfg and Sts as separate nested UDTs so each can be revised on its own, and treat the member list as a public API. Plan UDT changes for a maintenance window and keep the offline project as the source of truth. Check your Logix Designer release notes for what your version allows.

## From PLC to Ignition and faceplates

A tidy UDT pays off later, because Ignition can mirror it. An Ignition UDT definition for \`Motor\` mirrors the same members. Tag paths become \`[Plant]Area1/Pump1/Sts/Running\`. Group-based naming means a single Perspective faceplate view with a \`tagPath\` parameter can show any motor, since \`{path}/Sts/Running\`, \`{path}/Cmd/Start\` and so on exist on all of them. Alarm configuration inherits from the Alm group, and the historian picks up the Sts members. {{diagram:mapping}}

Mirroring PLC UDTs in Ignition is covered in {{lesson:ign-udts}} and naming standards in {{lesson:int-naming}}.

> [!warning] Naming is forever
> Once an HMI, historian and report refer to \`Sts.Running\`, renaming it is a cross-system change. Pick names carefully, and use the same vocabulary across Motor, Valve and Pump types (Running, Faulted, Ready, Auto).
`,

  eli5: `
Think of a registration form at a gym. Every member fills out the same form: name, phone, membership type, emergency contact. The front desk always knows where to look, and the form never has to be reinvented for a new member.

A UDT is that form for a pump or a valve. Instead of every pump having its own random pile of sticky notes (one that says "running," another "broken," a third "speed"), each pump gets the same form with the same boxes. The form is also divided into sections: a box for what you are asking the pump to do, a box for what the pump reports back, a box for its settings, and a box for its alarms.

Because everyone uses the same form, the screen that shows a pump can work for any pump. It just needs to be told which form to read. If you want to add a new box to the form after 200 people have filled it out, you have to reprint everyone's copy, so it pays to leave a couple of blank boxes at the start.
`,

  why: `
**Why group by Cmd/Sts/Cfg/Alm?** Because it answers "who is allowed to write this?" in the name. Without it, someone eventually writes a status bit from the HMI "to test," and a ghost fault appears. With it, you can set external access rules and code reviews can check them at a glance. It also maps neatly to Ignition permissions: operators get Cmd, engineers get Cfg, nobody but the PLC touches Sts.

**Why one big structure and not many tags?** Consistency is leverage. A single \`Motor\` AOI, a single Perspective faceplate and a single Ignition UDT serve every motor. Without it you maintain N bespoke variants, and they drift. The argument against is size: an enormous UDT forces every instance to carry members it doesn't use (a fixed-speed pump with VFD members). Good integrators resolve this with a family of types (Motor_FixedSpeed, Motor_VFD) or with Cfg flags, not by making each motor unique.

**Why the debate about nesting?** Nested groups read well and bind well, but add path length and a type to maintain per group. Some teams flatten to one level with prefixes (\`CmdStart\`, \`StsRunning\`). Both work. What matters is consistency across the whole project.

**Why worry about online edits?** Because the cost shows up on the plant floor, when you can't download without stopping the process. Teams that treat the UDT as a public API and leave room to grow rarely get forced into a shutdown.

**Why packing and size?** Not because memory is scarce on a 5580. It matters for communications: structures that cross MSG, produced/consumed tags or OPC reads get copied whole, so a lean structure moves faster.
`,

  history: `
Early Allen-Bradley PLCs (PLC-5, SLC 500) used fixed data files: N7:0, B3:1, F8:4. Everything was an address with a meaning you had to remember. ControlLogix introduced tag-based programming and user-defined data types in the late 1990s, with symbolic names and structured data. Integrators then spent two decades arguing about conventions. PlantPAx and similar libraries standardized the "command, status, config" separation in vendor-supplied types.
`,

  examples: [
    {
      title: "Ten pumps, one definition",
      body: `Create a tag \`Pumps\` of type \`Motor\` with dimension [10]. A FOR loop in a routine can call the same motor logic for \`Pumps[i]\`. In Ignition, one Perspective view bound to \`[Plant]Pumps/Pump{i}\` shows each pump. Adding pump 11 is one array size change in the PLC and one folder in Ignition.`
    },
    {
      title: "Spares paying for themselves",
      body: `The first release of Motor included \`Cfg.Spare1\` (DINT) and \`Alm.Spare1..Spare4\` (BOOL). Commissioning added a 'Seal water loss' alarm. It took the first spare BOOL, was renamed in a maintenance window, and the HMI binding was updated. No members were added, so the structure kept the same size.`
    }
  ],

  diagrams: {
    motor: `<svg viewBox="0 0 640 260" role="img" aria-label="Motor UDT split into Cmd, Sts, Cfg and Alm groups showing who writes each group">
  <rect class="dg-box-accent" x="20" y="14" width="600" height="34" rx="6"/>
  <text class="dg-title" x="34" y="37">Motor (UDT)   Pump1, Pump2, ... Pump10</text>
  <rect class="dg-box" x="20" y="64" width="140" height="130" rx="6"/>
  <text class="dg-text" x="34" y="88">Cmd</text>
  <text class="dg-text-mono" x="34" y="112">Start / Stop</text>
  <text class="dg-text-mono" x="34" y="130">Reset / Auto</text>
  <text class="dg-text-mono" x="34" y="148">SpeedSP</text>
  <text class="dg-text-sm" x="34" y="182">writer: HMI, sequence</text>
  <rect class="dg-box" x="175" y="64" width="140" height="130" rx="6"/>
  <text class="dg-text" x="189" y="88">Sts</text>
  <text class="dg-text-mono" x="189" y="112">Running</text>
  <text class="dg-text-mono" x="189" y="130">Faulted / Ready</text>
  <text class="dg-text-mono" x="189" y="148">Speed</text>
  <text class="dg-text-sm" x="189" y="182">writer: PLC logic</text>
  <rect class="dg-box" x="330" y="64" width="140" height="130" rx="6"/>
  <text class="dg-text" x="344" y="88">Cfg</text>
  <text class="dg-text-mono" x="344" y="112">HasVFD</text>
  <text class="dg-text-mono" x="344" y="130">StartTimeMs</text>
  <text class="dg-text-mono" x="344" y="148">MaxSpeed</text>
  <text class="dg-text-sm" x="344" y="182">writer: engineer</text>
  <rect class="dg-box-alarm" x="485" y="64" width="135" height="130" rx="6"/>
  <text class="dg-text" x="499" y="88">Alm</text>
  <text class="dg-text-mono" x="499" y="112">FailToStart</text>
  <text class="dg-text-mono" x="499" y="130">FailToStop</text>
  <text class="dg-text-mono" x="499" y="148">Overload</text>
  <text class="dg-text-sm" x="499" y="182">writer: PLC logic</text>
  <text class="dg-text-sm" x="20" y="226">Same member names in the PLC, the Ignition UDT and the faceplate.</text>
  <text class="dg-text-sm" x="20" y="246">Cmd up from the HMI; Sts and Alm down from the PLC.</text>
</svg>`,
    mapping: `<svg viewBox="0 0 640 200" role="img" aria-label="One UDT design used by Logix tags, an Ignition UDT definition and a Perspective faceplate">
  <defs><marker id="plc-udt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <rect class="dg-box-accent" x="20" y="60" width="160" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="100" y="94">Logix UDT</text>
  <text class="dg-text-sm dg-mid" x="100" y="116">Motor</text>
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
    "Scattering single BOOLs between REALs and wasting space with padding.",
    "No spare members, so every small change becomes a UDT edit and a download.",
    "Renaming members after the HMI and historian are built, without a cross-system change list.",
    "Nesting four or five levels deep, which makes tag paths unreadable."
  ],

  keyTerms: ["udt", "udt-member", "bool-packing", "nested-udt", "cmd-sts-cfg", "faceplate"],

  quiz: [
    {
      q: "Which group should an operator's Start button write to in a Motor UDT?",
      options: ["Sts.Running", "Cfg.StartTimeMs", "Cmd.Start", "Alm.FailToStart"],
      answer: 2,
      explain: [
        "Sts members are written only by PLC logic. The HMI writing Running would lie about the motor.",
        "Cfg holds slow-changing settings, not operator actions.",
        "Correct. Cmd members are requests, and the motor logic decides whether to honor them.",
        "Alm members are written by the PLC when a fault is detected."
      ]
    },
    {
      q: "Why do Cmd, Sts, Cfg and Alm groups matter to an integrator?",
      options: ["They make the project compile faster", "Logix requires them", "They reduce memory by half", "The group name tells you who may write each member, which makes bugs and permissions easy to reason about"],
      answer: 3,
      explain: [
        "Compile speed is unaffected.",
        "It is a convention, not a Logix rule.",
        "Grouping does not change memory use much.",
        "Correct. Ownership is readable from the member path."
      ]
    },
    {
      q: "A structure has BOOL, REAL, BOOL, REAL, BOOL. What is a good way to improve it?",
      options: ["Group the BOOLs together so they pack into shared 32-bit blocks", "Convert the BOOLs to DINTs", "Make every member a REAL", "Nothing: order never matters"],
      answer: 0,
      explain: [
        "Correct. Consecutive BOOLs share a 32-bit host, so scattering them wastes slots.",
        "That wastes more space and loses bit clarity.",
        "A REAL for a bit is wasteful and confusing.",
        "Order affects padding and size."
      ]
    },
    {
      q: "You need to add a member to a UDT used by 60 motors on a running plant. What is the best planning approach?",
      options: ["Add it online whenever it is convenient", "Reserve spare members up front and schedule structural changes for a maintenance window with the offline project as the source", "Create a second UDT with a different name for each new member", "Delete the UDT and recreate it"],
      answer: 1,
      explain: [
        "Structural edits are restricted online and affect every tag of that type.",
        "Correct. Spares avoid most structural changes, and the rest should be planned.",
        "That fragments the design and defeats reuse.",
        "Deleting a type in use is not possible without removing all its tags."
      ]
    },
    {
      q: "What makes one Perspective faceplate work for any motor?",
      options: ["Every motor has the same UDT member names, so one tagPath parameter is enough", "Perspective auto-detects member names", "Each motor has its own copy of the faceplate", "The PLC sends the faceplate layout"],
      answer: 0,
      explain: [
        "Correct. The structure is the contract the view relies on.",
        "Perspective binds to paths you define. It does not guess.",
        "Copies defeat the purpose and drift apart.",
        "The PLC only holds data, not screen layouts."
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
