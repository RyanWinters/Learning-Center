LC.lesson({
  id: "plc-other-vendors",
  title: "Siemens, Codesys and the rest of the world",
  track: "plc",
  minutes: 15,
  level: 2,
  prereqs: ["plc-languages"],
  tags: ["siemens", "tia-portal", "codesys", "iec-61131-3", "twincat", "vendors"],
  summary: "You will meet non-Allen-Bradley PLCs on real jobs. Here is how their ideas map onto Logix, and how Ignition talks to each.",
  objectives: [
    "Map Siemens TIA Portal concepts (OB, FB, FC, DB) to Logix tasks, AOIs, routines and tags",
    "Describe what a Codesys-based controller is and name vendors that use it",
    "Say what transfers across vendors through IEC 61131-3 and what does not",
    "Choose the right Ignition driver or protocol for Siemens, Codesys and other PLCs"
  ],

  body: `
## Why this matters to you

Allen-Bradley dominates North America, but Siemens dominates much of the rest of the world, and Codesys-based controllers sit inside a huge number of machines from European and Asian builders. As an integrator you will inherit a skid with a Siemens PLC, a packaging line with a Wago controller and a Beckhoff IPC. You do not need to be an expert in all of them. You need to recognize the concepts, know the vocabulary and know how to get the data into Ignition.

## What transfers: IEC 61131-3

{{term:iec-61131-3|IEC 61131-3}} is the international standard for PLC programming languages. It defines Ladder Diagram (LD), Function Block Diagram (FBD), Structured Text (ST), Sequential Function Chart (SFC) and Instruction List (IL, now deprecated). You met these in {{lesson:plc-languages}}. Almost every PLC vendor claims some degree of compliance.

What transfers well:

- The **scan cycle** idea: read inputs, run logic, write outputs.
- **Ladder, ST and FBD** logic. A seal-in or a timer rung reads the same everywhere.
- **Timers, counters, edge detection and comparisons**, though names differ (TON is TON almost everywhere).
- **Function blocks with instance data**, the idea behind Logix AOIs.
- Structured thinking: state machines, interlocks, mapped I/O.

What does not transfer:

- **Project structure and memory model.** Logix uses a tag database. Siemens uses numbered blocks and data blocks. Codesys is closer to IEC with global variable lists.
- **Addressing and I/O configuration.** Everything about modules, racks and networks.
- **Tooling and shortcuts, online edit behavior, library and licensing models.**
- **Vendor-specific instructions**, such as motion, PID and communication blocks.
- **Safety, security and diagnostics features.**

> [!tip] Treat the standard as a dictionary, not a guarantee
> Moving a program between vendors is almost always a rewrite. The logic is portable in your head, not in a file.

## Siemens: TIA Portal and the S7 family

Siemens programs the **SIMATIC S7-1200** (small) and **S7-1500** (mid to large) in **TIA Portal**, a single engineering tool that also configures drives, HMIs (WinCC) and networks. Older S7-300 and S7-400 used STEP 7 Classic, and you will still see them in the field.

### The block model

A Siemens program is made of **blocks**:

| Siemens | What it is | Closest Logix idea |
|---|---|---|
| **OB** (Organization Block) | Entry point called by the operating system on an event. OB1 is the main cycle. Others handle startup, cyclic interrupts, hardware interrupts and errors. | Tasks plus the main routine, plus fault handlers |
| **FC** (Function) | Code with inputs and outputs but **no memory** between calls | A routine you call with parameters, or an AOI with no stored state |
| **FB** (Function Block) | Code with inputs, outputs and **its own stored data** in an instance data block | An Add-On Instruction. The instance DB is like the AOI's backing tag |
| **DB** (Data Block) | A block that holds data and no code. A global DB is shared. An instance DB belongs to one FB instance. | A UDT-typed tag, or a structure of tags |
| **UDT** (PLC data type) | A reusable structure | A Logix UDT |
| **Tag table** | Named I/O and memory bits | Controller-scoped tags mapped to I/O |

{{diagram:blocks}}

A rule of thumb: Siemens has three kinds of thing where Logix has one tag database. In Siemens the *data* lives in DBs and the *logic* lives in FBs and FCs. A motor in a Siemens project is usually an FB with an instance DB, called from OB1 or from a block that OB1 calls. A Logix integrator would use a UDT plus an AOI.

### Siemens details that surprise Logix people

- **Optimized block access.** New DBs are "optimized": the CPU arranges memory itself, and symbols are the only way to reach members. It is faster and more flexible, but external tools cannot rely on fixed byte offsets.
- **Symbolic and absolute addressing.** Absolute addresses like \`DB10.DBW4\` or \`%I0.0\` are still common in older projects and S7 drivers.
- **Safety** is a failsafe CPU variant (F-CPU) with F-blocks, using the same ideas as {{lesson:plc-safety}}.
- **Cyclic interrupt OBs** (e.g. OB30) fill the role of a periodic task.

## Codesys-based controllers

**CODESYS** is a vendor-neutral IEC 61131-3 programming environment and runtime from the CODESYS Group. The company does not make PLCs. It licenses its development system and runtime to hundreds of hardware makers, who put the runtime on their own controllers and often brand the tool themselves. If you learn Codesys once, you can program a large family of devices.

| Vendor | Product family | Notes |
|---|---|---|
| WAGO | PFC100 / PFC200 | Programmed with e!COCKPIT, which is Codesys-based |
| Beckhoff | TwinCAT 3 | Beckhoff's own IEC 61131-3 environment, running on industrial PCs. Often grouped with Codesys-style tools because the structure is similar, but it is a separate product. |
| Schneider Electric | Machine Expert, some M2xx controllers | Codesys-based |
| Many others | Eaton, ifm, Turck, Festo and more | Codesys is a common choice for machine builders |

Concepts you will see:

- A **POU** (Program Organization Unit) is a program, function block or function. This is the IEC naming for what Siemens calls blocks.
- **Global Variable Lists (GVL)** hold shared data.
- **Tasks** are configured in a task configuration and run programs on a cycle or an event.
- **Libraries** for communication and motion are a major selling point.

Codesys-based controllers often expose **OPC UA**, **Modbus TCP** or their own symbol access, and many support **EtherCAT** as the fieldbus for I/O and drives.

## Omron and Mitsubishi in brief

- **Omron** has the NJ/NX Sysmac family, programmed in Sysmac Studio with IEC-style structured programs and EtherCAT as the backbone, plus older CJ/CP series using FINS communication. Strong in packaging and motion.
- **Mitsubishi** has the iQ-R and FX families, programmed in GX Works. Ladder is the most common language. The older MELSEC devices use device addresses like \`D100\` and \`M0\`, and protocols such as MC (MELSEC) protocol.

Both are common in Asia and in machine builders' equipment. For an integrator, the usual route is not to learn the PLC deeply but to get data out through a standard protocol the controller supports.

## How Ignition connects to each

{{diagram:ignition}}

| PLC | Typical Ignition path | Notes |
|---|---|---|
| Allen-Bradley Logix | Allen-Bradley Logix driver (EtherNet/IP) | Browses tags and UDTs |
| Siemens S7-1200/1500 | Siemens driver (S7 protocol over TCP port 102) or OPC UA | Classic drivers use absolute addressing; a newer enhanced driver supports symbolic browsing |
| Siemens with OPC UA server | Ignition OPC UA client connection | Cleanest option on S7-1500 with an OPC UA license enabled |
| Codesys / Wago / Beckhoff | OPC UA client, or Modbus TCP | Many have a built-in OPC UA server |
| Omron NJ/NX | OPC UA, or EtherNet/IP | Sysmac supports both |
| Mitsubishi | Modbus TCP or MC protocol via a third-party driver | Check the module in use |
| Anything with MQTT | MQTT/Sparkplug through the Cirrus Link modules | See {{lesson:proto-sparkplug}} |

> [!note] Siemens access settings
> For the classic Siemens driver to read an S7-1200/1500 data block, the DB must be a global block with optimized access turned off, and the CPU must permit PUT/GET access. Docs for the driver describe these settings. If tags show bad quality on a new Siemens PLC, check these first.

> [!example] Worked example: a skid with a Siemens PLC
> A water treatment skid arrives with an S7-1200 at 192.168.10.20 and an HMI export showing \`DB10.DBD0\` as a tank level (REAL). In Ignition you add a Siemens device with that IP, port 102 and the CPU's rack and slot as the driver expects. You make a tag with address \`DB10.DBD0\`, data type Float4. If it reads Bad, you check that DB10 has optimized access off and PUT/GET is enabled. Then you ask the vendor for a symbolic list so the rest of the tags can be imported in bulk.

## A practical approach for a new vendor

1. Find the **engineering software** and its free trial or simulator, and the manual's data-access section.
2. Identify the **data model**: tag database, DBs, or variable lists.
3. Check **which Ignition path** the PLC supports (native driver, OPC UA, Modbus, MQTT).
4. Make three test tags first: a known constant, a counter that changes, and a writable value.
5. Ask for the **symbol/tag export** from the machine builder and automate tag creation.
`,

  eli5: `
Think of cooking in different countries. Everywhere, you chop, heat and season, and those skills carry over. But the kitchens are laid out differently. In one country the pantry is one big cupboard where everything has a label (that's Allen-Bradley, a single list of named tags). In another, there are numbered drawers: drawer 10 holds the tank numbers, drawer 11 holds the pump numbers, and recipe cards live in a separate binder (that's Siemens, with data blocks and function blocks). In a third, a company sells kitchen layouts and lets lots of different restaurants use the same one (that's Codesys).

IEC 61131-3 is like an agreement that everyone will write "bake" and "boil" the same way. The words match, but the layout of the pantry still differs, so you cannot copy a restaurant's whole kitchen into another one. You can carry your cooking skill, though.

Ignition is the waiter who learns how to ask each kitchen for what's ready, using whatever language that kitchen speaks.
`,

  why: `
**Why learn the mapping instead of each product?** Vendor tools change constantly, but the concepts underneath do not. A tag database versus numbered blocks is a real difference in how you organize and share data. Knowing that an FB is an AOI and a DB is a structure of tags lets you read an unfamiliar project in an hour and ask the right questions.

**Why does IEC 61131-3 only partly help?** The standard defines languages and a software model, not memory layout, I/O, communications, online editing, licensing or safety. Vendors add extensions to compete, and the extensions are where projects become non-portable. Anyone who promises a one-click conversion between vendors is selling a translation tool that needs hand-cleanup.

**Why does Ignition's connection path matter?** Native drivers know the vendor's protocol and often browse tags. Generic paths such as OPC UA and Modbus work with many devices, but you lose some convenience. OPC UA is often the best generic choice, because it has typed, named data and security. Modbus works nearly everywhere but gives you only registers.

**Where people argue.** Standardizing on a single PLC brand per site lowers training and spares cost, and many plants insist on it. Machine builders prefer open Codesys platforms for cost and flexibility. Integrators argue about whether to demand OPC UA or symbolic tag lists from builders as a contract term. Our view is to ask for it up front, since retrofitting tag lists after the machine ships is expensive.
`,

  history: `
Siemens introduced its SIMATIC S7 line in the 1990s, and TIA Portal arrived around 2010 as one engineering environment for PLCs, HMIs and drives. CODESYS began in the 1990s from a German company (3S-Smart Software Solutions) and grew by licensing its runtime to controller makers, which is why so many unrelated brands share the same programming experience. IEC 61131-3 was first published in 1993 to bring order to the many incompatible PLC programming styles.
`,

  examples: [
    {
      title: "Reading an unfamiliar Siemens project",
      body: `You open a TIA Portal project and find OB1 (Main), OB30 (cyclic interrupt, 100 ms), FB10 "Motor" with instance DBs DB11 to DB20, and a global DB "HMI". Mapping to Logix: OB1 is your main routine, OB30 is a 100 ms periodic task, FB10 is an AOI, DB11 to DB20 are the AOI instance tags, and the global DB is the HMI interface structure. You now know where to look.`
    },
    {
      title: "Getting data from a Wago PFC200",
      body: `The builder gives you a Wago controller with an OPC UA server enabled at port 4840. In Ignition you add an OPC UA connection to \`opc.tcp://192.168.1.50:4840\`, browse the address space, and drag the variables from the GVL into the tag browser. Typed data comes through without register math.`
    }
  ],

  diagrams: {
    blocks: `<svg viewBox="0 0 640 220" role="img" aria-label="Siemens OB1 calls function blocks that use instance data blocks, compared with a Logix task calling a routine that uses an AOI and a UDT tag">
  <defs><marker id="plc-other-vendors-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="20" y="24">Siemens TIA Portal</text>
  <rect class="dg-box-accent" x="20" y="36" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="62">OB1 Main</text>
  <rect class="dg-box" x="200" y="36" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="265" y="62">FB Motor</text>
  <rect class="dg-box-2" x="380" y="36" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="455" y="56">Instance DB</text>
  <text class="dg-text-muted dg-mid" x="455" y="72">its stored data</text>
  <line class="dg-line" x1="150" y1="58" x2="198" y2="58" marker-end="url(#plc-other-vendors-ah)"/>
  <line class="dg-line" x1="330" y1="58" x2="378" y2="58" marker-end="url(#plc-other-vendors-ah)"/>
  <text class="dg-title" x="20" y="124">Logix</text>
  <rect class="dg-box-accent" x="20" y="136" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="156">Task and</text>
  <text class="dg-text-sm dg-mid" x="85" y="172">MainRoutine</text>
  <rect class="dg-box" x="200" y="136" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="265" y="162">AOI Motor</text>
  <rect class="dg-box-2" x="380" y="136" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="455" y="156">Tag of UDT</text>
  <text class="dg-text-muted dg-mid" x="455" y="172">its stored data</text>
  <line class="dg-line" x1="150" y1="158" x2="198" y2="158" marker-end="url(#plc-other-vendors-ah)"/>
  <line class="dg-line" x1="330" y1="158" x2="378" y2="158" marker-end="url(#plc-other-vendors-ah)"/>
</svg>`,
    ignition: `<svg viewBox="0 0 640 230" role="img" aria-label="Ignition gateway connects to Logix over EtherNet/IP, to Siemens over the S7 driver or OPC UA, to Codesys controllers over OPC UA, and to others over Modbus TCP or MQTT">
  <rect class="dg-box-accent" x="20" y="80" width="130" height="70" rx="6"/>
  <text class="dg-text dg-mid" x="85" y="110">Ignition</text>
  <text class="dg-text-muted dg-mid" x="85" y="130">Gateway</text>
  <line class="dg-line" x1="150" y1="115" x2="240" y2="40"/>
  <line class="dg-line" x1="150" y1="115" x2="240" y2="90"/>
  <line class="dg-line" x1="150" y1="115" x2="240" y2="140"/>
  <line class="dg-line" x1="150" y1="115" x2="240" y2="190"/>
  <rect class="dg-box" x="240" y="22" width="380" height="36" rx="4"/>
  <text class="dg-text-sm" x="254" y="45">Allen-Bradley Logix: EtherNet/IP driver</text>
  <rect class="dg-box" x="240" y="72" width="380" height="36" rx="4"/>
  <text class="dg-text-sm" x="254" y="95">Siemens S7: S7 driver (port 102) or OPC UA</text>
  <rect class="dg-box" x="240" y="122" width="380" height="36" rx="4"/>
  <text class="dg-text-sm" x="254" y="145">Codesys, Wago, Beckhoff: OPC UA client</text>
  <rect class="dg-box" x="240" y="172" width="380" height="36" rx="4"/>
  <text class="dg-text-sm" x="254" y="195">Omron, Mitsubishi, others: Modbus TCP, OPC UA, MQTT</text>
</svg>`
  },

  pitfalls: [
    "Assuming IEC 61131-3 compliance means a program will import into another vendor's tool.",
    "Trying to read an optimized Siemens data block with absolute byte offsets through a classic driver.",
    "Forgetting to enable PUT/GET access on an S7-1200/1500 and chasing a network problem that does not exist.",
    "Treating every Codesys-based controller as identical. The runtime, libraries and OPC UA support differ by vendor.",
    "Taking on a machine without asking for a symbol or tag export up front."
  ],

  keyTerms: ["iec-61131-3", "tia-portal", "organization-block", "function-block", "data-block", "codesys", "twincat", "opc-ua"],

  quiz: [
    {
      q: "A Siemens project has FB20 'Valve' with instance data blocks DB21 to DB30. What is the closest Logix equivalent?",
      options: ["A task with ten programs", "An Add-On Instruction with ten instance tags", "Ten separate routines", "A produced tag"],
      answer: 1,
      explain: [
        "Tasks schedule programs. They do not model a reusable block with stored data.",
        "Correct. An FB keeps its state in an instance DB, as an AOI keeps it in its backing tag.",
        "Routines share the program's tags and have no per-instance data.",
        "Produced tags are for sharing data between controllers."
      ]
    },
    {
      q: "What is the difference between an FC and an FB in TIA Portal?",
      options: ["FCs are safety-rated, FBs are not", "FBs keep their own data between calls in an instance DB, FCs do not", "FCs run in OB1, FBs in other OBs only", "There is no difference"],
      answer: 1,
      explain: [
        "Safety is a separate feature (F-blocks).",
        "Correct. An FC has no memory between calls unless you pass data in and out. An FB has an instance DB.",
        "Both can be called from any OB.",
        "They differ exactly on stored instance data."
      ]
    },
    {
      q: "Which of these is the vendor-neutral company behind a programming environment used by Wago and many other controller makers?",
      options: ["CODESYS", "Sysmac", "GX Works", "STEP 7"],
      answer: 0,
      explain: [
        "Correct. CODESYS licenses its tool and runtime to many hardware vendors.",
        "Sysmac Studio is Omron's own tool.",
        "GX Works is Mitsubishi's tool.",
        "STEP 7 is Siemens' older engineering software."
      ]
    },
    {
      q: "You port a ladder program from one vendor to another by exporting and importing a file, because both claim IEC 61131-3 compliance. What most likely happens?",
      options: ["It imports and runs unchanged", "It will not import directly; the logic ideas carry over but the project must be rebuilt", "Only the HMI breaks", "Only timers fail"],
      answer: 1,
      explain: [
        "The standard does not define a common file format for whole projects or hardware configuration.",
        "Correct. Concepts transfer, files and I/O configuration do not.",
        "The issue is the controller project itself, not just the HMI.",
        "Timers are among the more portable parts, but the rest of the project is not."
      ]
    },
    {
      q: "A new S7-1500 shows bad quality on tags in Ignition using the classic Siemens driver. What should you check first?",
      options: ["That the DB has optimized access disabled and PUT/GET is allowed", "That the PLC runs ladder, not SCL", "That the gateway has a historian", "That the PLC is in the safety task"],
      answer: 0,
      explain: [
        "Correct. The classic driver needs absolute access to global DBs and permission to use PUT/GET.",
        "The programming language does not change data access.",
        "A historian has nothing to do with live reads.",
        "Safety tasks are not part of this connection."
      ]
    }
  ],

  resources: [
    { title: "Siemens Drivers (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/siemens/siemens-drivers", type: "docs", source: "Inductive Automation" },
    { title: "Siemens Enhanced Driver (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/siemens/siemens-enhanced-driver", type: "docs", source: "Inductive Automation" },
    { title: "Programming Guideline for S7-1200/1500 TIA Portal", url: "https://support.industry.siemens.com/cs/attachments/90885040/81318674_Programming_guideline_DOC_v16_en.pdf", type: "docs", source: "Siemens" },
    { title: "Library of General Functions (LGF) for S7-1200 / S7-1500", url: "https://support.industry.siemens.com/cs/attachments/109479728/109479728_LGF_V5_1_0_en.pdf", type: "docs", source: "Siemens" },
    { title: "TwinCAT 3 PLC programming languages", url: "https://infosys.beckhoff.com/content/1033/tcplccontrol/925243019.html", type: "docs", source: "Beckhoff" },
    { title: "CODESYS Store: SoftPLC and runtime", url: "https://store.codesys.com/en/softplc.html", type: "tool", source: "CODESYS" }
  ]
});
