LC.lesson({
  id: "plc-tags",
  title: "Tags and data types in Logix",
  track: "plc",
  minutes: 25,
  level: 2,
  prereqs: ["plc-studio", "net-data"],
  tags: ["tags", "data-types", "dint", "scope", "alias", "external-access"],
  summary: "Logix stores data in named, typed tags instead of numbered addresses. Learn the types, the scope rules, and how a physical wire becomes a tag.",
  objectives: [
    "Choose among BOOL, SINT, INT, DINT, REAL, LINT and STRING for a given job",
    "Explain why DINT is the native integer size in Logix",
    "Create and index an array, and read its zero-based addressing",
    "Choose between controller and program scope",
    "Read module-defined I/O tags such as Local:1:I.Data.0 and build alias tags for them",
    "Use External Access to decide what an HMI or Ignition can read or write"
  ],

  body: `
## Names instead of addresses

In older PLCs you wrote \`N7:0\` and had to remember that file 7, word 0 was the tank level. Logix replaced that with {{term:logix-tag|tags}}: you name a piece of memory \`Tank1_Level\`, give it a type, and the controller finds the space. A tag is a labelled box. The label is the name, and the shape of the box is the data type.

You care because the tag list is the interface of the PLC. Your Ignition tags, alarms and historian all point at it, and naming it well saves years of confusion. The naming standards themselves are covered in {{lesson:int-naming}}.

## Data types

{{diagram:types}}

| Type | Size | Range or meaning | Use |
|---|---|---|---|
| {{term:bool|BOOL}} | 1 bit | 0 or 1 | Switches, lamps, flags |
| {{term:sint-int|SINT}} | 8 bits | -128 to 127 | Rare. Matching other devices |
| {{term:sint-int|INT}} | 16 bits | -32,768 to 32,767 | Data from drives and 16-bit devices |
| {{term:dint|DINT}} | 32 bits | about -2.1 billion to 2.1 billion | **The default whole number** |
| {{term:lint|LINT}} | 64 bits | very large whole numbers | Timestamps, big totals (newer firmware) |
| {{term:real-type|REAL}} | 32 bits | floating point, about 7 digits | Temperatures, flows, scaled values |
| {{term:logix-string|STRING}} | 88 bytes | up to 82 characters plus a length | Recipe names, messages |

### Why DINT is the default

Logix controllers are 32-bit machines. When you use a SINT or INT in math, the controller converts it to 32 bits, does the math, and converts back. Small types do not save memory either: a lone BOOL, SINT or INT takes a 32-bit slot. Smaller types save space only inside arrays and structures where they are packed together. Rockwell's advice is to use DINT for integers unless you have a reason not to, and every compare and math instruction runs fastest on DINT and REAL.

Use INT when the **other end** uses 16 bits, for example a drive's data or a Modbus gateway. Use REAL whenever a value has a fractional part or engineering units. Be careful with REAL equality: 0.1 + 0.2 is not exactly 0.3. Compare REALs with a range (greater than or less than), not with equals.

### BOOLs inside a word

A DINT is 32 bits, so \`MyWord.0\` through \`MyWord.31\` are individual bits of a DINT. You write \`Status.5\` to access bit 5. This matters for I/O tags and for devices that pack flags into a word.

## Arrays

An {{term:tag-array|array}} is a numbered list of the same type. In Logix, you create one by giving a dimension in the tag's **Style** or **Data Type** field, for example \`DINT[10]\` or \`REAL[24]\`.

- Elements are numbered from **0**, so \`Temps[0]\` through \`Temps[9]\` for ten.
- You can use a tag as the index, \`Temps[Pointer]\`, to loop over data.
- Up to three dimensions: \`REAL[4,6]\`, \`DINT[2,3,4]\`.
- An index outside the range causes a major fault in many cases, so check bounds if the index comes from outside.

> [!warning] Zero-based, again
> \`Temps[10]\` does not exist in a ten-element array. If your recipe has 10 steps numbered 1 to 10, make the array 11 long and ignore element 0, or subtract 1 in the index. Either way write it down. This is the same trap as Modbus addressing in {{lesson:proto-modbus}}.

## Scope: controller vs program

Every tag lives in a **scope**.

| Scope | Visible to | Use for |
|---|---|---|
| {{term:controller-scope|Controller scope}} | All programs, plus outside systems and other controllers | I/O tags, data shared between programs, anything an HMI or Ignition reads, produced/consumed tags |
| {{term:program-scope|Program scope}} | One program only | Internal working variables, so two programs can reuse names |

Two programs can each have a program-scoped tag named \`Step\` and they do not conflict. A program-scoped tag cannot be reached by name from outside the program, and external systems that use the controller-scope tag list cannot see it without extra setup. If an HMI needs it, make it controller scope or copy it to one.

The usual convention: put I/O and shared state at controller scope, and everything else inside programs.

## Tag name rules

A tag name has up to 40 characters, starts with a letter or underscore, and uses letters, numbers and underscores. Names are not case sensitive (\`Pump1\` and \`PUMP1\` are the same), but be consistent. Avoid double underscores and ending with an underscore. Descriptions are stored with the tag and can be shown in the ladder editor and the tag window (check your version for the display options and the length limit), so writing them is the cheapest documentation you can do.

## Module-defined I/O tags

When you add an I/O module to the {{term:io-configuration|I/O Configuration}}, Logix creates its tags for you. These are {{term:module-defined-tag|module-defined tags}} and follow a pattern:

\`\`\`text
Local:1:I.Data        inputs of the module in slot 1 (one bit per point; the width depends on the module)
Local:1:I.Data.0      input point 0
Local:2:O.Data.3      output point 3 of the module in slot 2
Local:3:I.Ch0Data     analog channel 0 of the module in slot 3
Local:3:C             configuration data (ranges, filters)
\`\`\`

The size of \`.Data\` follows the module: a 16-point card such as a 16-point 24 V DC input typically presents an INT, and a 32-point card a DINT. Check the module profile in your project rather than assuming. The bit-per-point addressing (\`.Data.5\`) works the same either way.

\`Local\` means the same chassis as the controller. Modules reached across Ethernet use their module name instead, such as \`Rack2_Slot4:I.Data.5\`. The letter after the colon says the direction: **I** input, **O** output, **C** configuration.

The bit number is the **terminal point** on the card. Point 0 is the first input terminal. If a photo-eye is wired to input 5 of the card in slot 1, its state is \`Local:1:I.Data.5\`.

Nobody wants to read a ladder rung full of \`Local:1:I.Data.5\`. That is what {{term:alias-tag|alias tags}} are for. An alias tag is another name for the same memory:

| Alias name | Points to |
|---|---|
| \`PE_Infeed\` | \`Local:1:I.Data.5\` |
| \`Lamp_Run\` | \`Local:2:O.Data.0\` |

You write logic with \`PE_Infeed\`, and when someone moves the wire to another terminal, you change the alias in one place and no logic edits are needed. **Always alias physical I/O**, and write the description with the wire or device label.

> [!example] One wire, three names
> The photo-eye wired to terminal 5 of slot 1 is \`Local:1:I.Data.5\` (module-defined), \`PE_Infeed\` (alias), and in Ignition it will be an OPC tag such as \`[PLC1]PE_Infeed\`. Same bit, three names. Fixing the alias fixes the logic and the screen.

## External access and constants

Each controller-scope tag has an {{term:external-access|External Access}} attribute: **Read/Write**, **Read Only** or **None**. It controls what outside systems such as an HMI, OPC server or Ignition may do with the tag. Set Read Only for values you only display and None for internals nobody outside should touch. This also keeps your tag browse list clean. New tags default to Read/Write, which is permissive, so many shops change the default habit.

A tag can also be marked **Constant**, which prevents logic and outside systems from changing its value online. That fits fixed limits and conversion factors.

## Produced and consumed

A controller-scope tag can be configured as **produced** so other controllers can **consume** it without any messaging code. It is a fast way to share data between PLCs. The details arrive in {{lesson:plc-comms}}. For now, know it is a property of controller-scope tags.

## Structures

Types can be grouped. Built-in structures exist for timers (\`TIMER\` with \`.PRE\`, \`.ACC\`, \`.DN\`), counters and strings. You can define your own **user-defined types** (UDTs) with named members. In this course the motor tag \`M101\` has type \`UDT_Motor\`, with nested members you reach by path: \`M101.Cmd.Start\`, \`M101.Sts.Running\`, \`M101.Sts.Speed\`, \`M101.Cfg.StartDelay\`. Designing them is the subject of {{lesson:plc-udt}}.
`,

  eli5: `
A PLC's memory is like a wall of mailboxes. In the old days every mailbox had a number, and you had to remember that box 7, slot 0 was the tank level. Tags are like sticking a name label on each mailbox: "Tank Level".

Each mailbox also has a shape. Some are tiny and hold only a yes or no (a light switch). Some hold a whole number, some hold a number with decimals, and some hold words. The shape decides what you can put in.

Some mailboxes belong to the whole building (anyone can look in them) and some belong to one office only. Mailboxes for the real wires, like "the button on card 1, terminal 5", are created for you with long, boring names. So you stick a short friendly nickname on top, like "Start Button", that points to the very same box.

You can also put a "Look but don't touch" sign on a mailbox, so visitors can read it but can't change what's inside.
`,

  why: `
**Why tags instead of addresses?** Fixed addresses make programs readable only to the person who wrote the address list. Named tags make programs self-documenting, let tools browse the data (Ignition can list the controller's tags and import them), and let the controller handle memory layout. The tradeoff is that the name becomes an API. Rename a tag and every HMI screen and Ignition tag that used it breaks.

**Why DINT everywhere?** It is the native size, so it is fastest, and it avoids silent overflow in 16-bit math. A counter that exceeds 32,767 on an INT rolls to a negative number, which is a classic way for a production counter to show -32,768 on the last shift. People who inherit INT-heavy code from older platforms find these bugs.

**Why alias physical I/O?** Because wiring changes and logic should not. An electrician moves a sensor to a spare terminal on commissioning day. If the logic used \`Local:1:I.Data.5\` in thirty places, you must edit thirty places and hope you found them all. With an alias, you edit one. Experienced integrators also argue the other way: some prefer mapping I/O into a UDT in a single "I/O mapping" routine, so that the logic never touches the raw I/O at all. That also gives you a stable snapshot of the inputs, which ties back to {{lesson:plc-scan}}.

**Why does scope matter?** Program scope is how you keep large projects from tripping over their own names, and how you reuse a program as a template. Controller scope is how you make data visible. The cost of too much controller scope is a flat list of thousands of tags that nobody can navigate. Aim for structures and clear prefixes.

**Why set External Access?** Defaults favor convenience. A tag writable by anything on the network is a risk, whether from a faulty HMI script or a curious visitor. Restrict what must be restricted.
`,

  history: `
Before ControlLogix (1997), Allen-Bradley PLC-5 and SLC-500 systems used data files with fixed addresses such as N7:0. Logix introduced symbolic, tag-based addressing and 32-bit data as the norm. 64-bit LINT and related types were added in later firmware revisions. Many engineers who learned on legacy platforms still reach for INT out of habit.
`,

  examples: [
    {
      title: "Wiring a start button",
      body: `A start pushbutton is wired to terminal 2 of a 16-point input card in slot 3. The module-defined tag is \`Local:3:I.Data.2\`. Create an alias tag \`PB_Start\` that points to it, with the description "Panel A start button, wire 112". Use \`PB_Start\` in the ladder. When maintenance moves the wire to terminal 6, change the alias to \`Local:3:I.Data.6\`, and no rung changes.`
    },
    {
      title: "A zone-temperature array",
      body: `Eight zones each have a temperature. Create \`Zone_Temp\` as \`REAL[8]\`, controller scope, External Access Read Only. In logic, \`Zone_Temp[3]\` is the fourth zone. In Ignition the OPC item is \`[PLC1]Zone_Temp[3]\`, or the whole array can be read at once with \`[PLC1]Zone_Temp\`. If you ever see "index out of range", check the indexes against 0 to 7.`
    }
  ],

  diagrams: {
    types: `<svg viewBox="0 0 640 210" role="img" aria-label="Relative size of Logix data types: BOOL is 1 bit, SINT 8 bits, INT 16 bits, DINT and REAL 32 bits, LINT 64 bits">
  <text class="dg-title" x="20" y="26">Size in bits (one block = 8 bits)</text>
  <rect class="dg-box" x="20" y="44" width="10" height="20" rx="2"/>
  <text class="dg-text-sm" x="130" y="59">BOOL: 1 bit (still takes a 32-bit slot alone)</text>
  <rect class="dg-box" x="20" y="74" width="40" height="20" rx="2"/>
  <text class="dg-text-sm" x="130" y="89">SINT: 8 bits</text>
  <rect class="dg-box" x="20" y="104" width="80" height="20" rx="2"/>
  <text class="dg-text-sm" x="130" y="119">INT: 16 bits</text>
  <rect class="dg-box-accent" x="20" y="134" width="160" height="20" rx="2"/>
  <text class="dg-text-sm" x="200" y="149">DINT and REAL: 32 bits (native size)</text>
  <rect class="dg-box" x="20" y="164" width="320" height="20" rx="2"/>
  <text class="dg-text-sm" x="360" y="179">LINT: 64 bits</text>
</svg>`
  },

  pitfalls: [
    "Using INT for counters that can pass 32,767 and rolling over to negative.",
    "Comparing REALs with the equals instruction instead of a range.",
    "Using Array[10] on a 10-element array. Valid indexes are 0 to 9.",
    "Using raw Local:1:I.Data.x addresses throughout the logic instead of aliases.",
    "Leaving every tag Read/Write for external access.",
    "Putting shared data in program scope and then wondering why the HMI can't browse it."
  ],

  keyTerms: ["logix-tag", "bool", "dint", "sint-int", "real-type", "lint", "logix-string", "tag-array", "controller-scope", "program-scope", "alias-tag", "module-defined-tag", "external-access", "produced-consumed"],

  quiz: [
    {
      q: "Why should you default to DINT for whole numbers in Logix?",
      options: ["It is the controller's native 32-bit size, so it is fastest and avoids 16-bit overflow", "It uses less memory than INT", "INT is not allowed", "DINT can hold decimals"],
      answer: 0,
      explain: [
        "Correct. Math runs fastest on 32-bit types, and the range is large.",
        "A lone INT also occupies a 32-bit slot. Memory is not the reason.",
        "INT is allowed, just usually unnecessary.",
        "Decimals need REAL."
      ]
    },
    {
      q: "A photo-eye is wired to terminal 5 of the input card in slot 1 of the local chassis. Which tag reads it?",
      options: ["Local:5:I.Data.1", "Local:1:I.Data.5", "Local:1:O.Data.5", "Local:1:C.5"],
      answer: 1,
      explain: [
        "That swaps slot and point.",
        "Correct. Slot 1, input direction, bit 5.",
        "O is an output tag, and this is an input.",
        "C is configuration data."
      ]
    },
    {
      q: "Why create an alias tag for physical inputs?",
      options: ["So the PLC runs faster", "So the logic uses a meaningful name and survives terminal changes by editing one place", "So the input becomes writable", "So HMIs can't read it"],
      answer: 1,
      explain: [
        "Aliases do not change speed.",
        "Correct. The alias is a readable name pointing to the same memory.",
        "Aliasing an input does not make it writable by logic in any useful way.",
        "Visibility is controlled by external access, not by aliasing."
      ]
    },
    {
      q: "A REAL[8] array is called Zone_Temp. Which element is the last?",
      options: ["Zone_Temp[8]", "Zone_Temp[7]", "Zone_Temp[1]", "Zone_Temp[0]"],
      answer: 1,
      explain: [
        "Index 8 would be the ninth element, which does not exist.",
        "Correct. Eight elements are numbered 0 to 7.",
        "Index 1 is the second element.",
        "Index 0 is the first element."
      ]
    },
    {
      q: "Ignition needs to read a value that lives in a program-scoped tag. What is the simplest fix?",
      options: ["Nothing, Ignition reads all scopes the same way", "Make it controller scope or copy it to a controller-scope tag", "Change it to an INT", "Set it as a constant"],
      answer: 1,
      explain: [
        "Outside systems browse the controller-scope list by default.",
        "Correct. Controller scope is the shared interface to the outside.",
        "Data type does not change visibility.",
        "A constant cannot be changed, and that does not make it visible."
      ]
    },
    {
      q: "You want an HMI to display a tank level but never change it. Which setting fits?",
      options: ["Constant", "External Access: Read Only", "External Access: None", "Program scope"],
      answer: 1,
      explain: [
        "Constant stops logic from changing it too, which defeats the point of a live level.",
        "Correct. Read Only lets outside systems read it but not write it.",
        "None hides it from the HMI altogether.",
        "That would also hide it from the HMI."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers I/O and Tag Data (1756-PM004)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm004_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Data Access (1756-PM020)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm020_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures (1756-PM001)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Studio 5000 Logix Designer Online Help", url: "https://www.rockwellautomation.com/en-nl/docs/studio-5000-logix-designer/37-00/contents-ditamap.html", type: "docs", source: "Rockwell Automation" }
  ]
});
