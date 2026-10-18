LC.lesson({
  id: "ign-tags",
  title: "Tags and tag providers",
  track: "ign",
  minutes: 15,
  level: 2,
  prereqs: ["ign-devices"],
  tags: ["ignition", "tags", "tag-groups", "quality", "providers"],
  summary: "A tag is a value, a quality and a timestamp, evaluated on a schedule you control. Learn the six tag types, how tag groups set the cost of every tag, and what the quality code is telling you.",
  objectives: [
    "Choose the right tag type (OPC, memory, expression, derived, query, reference) for a job",
    "Read a tag path and say which provider, folder and tag it names",
    "Configure a direct, driven or leased tag group and predict the resulting load on the PLC",
    "Interpret the common quality codes and the difference between a stale tag and a bad one",
    "Explain the difference between a tag executing and a tag changing",
    "Export, edit and re-import tags as JSON"
  ],

  body: `
## What an Ignition tag is

An Ignition {{term:tag|tag}} is a named data point on the Gateway. It carries three things at all times: a **value**, a **quality** and a **timestamp**. Everything else in the platform (screens, alarms, history, scripts) talks to tags, never directly to the PLC. That indirection is the reason you can swap a PLC, change a register, or simulate a value without touching a single screen.

Tags are not the same as {{term:logix-tag|Logix tags}}. A Logix tag is memory inside the controller. An Ignition tag is a Gateway object that *may* point at one.

## Tag providers and tag paths

Tags live in a **tag provider**, a container with a name. A fresh Gateway has one realtime provider called \`default\`. You can add more, for example one per site, or a remote provider that shows another Gateway's tags over the Gateway Network (see {{lesson:arch-remote-services}}).

A **tag path** names a tag completely:

\`\`\`text
[default]Plant1/Area10/Line1/M101/Sts/Speed
 ^provider  ^folders                ^tag
\`\`\`

- The part in brackets is the provider. Leaving it off means "whatever provider the caller assumes", which breaks when code moves between scopes. Always write it in scripts.
- Slashes separate folders. A UDT instance behaves like a folder, so \`M101/Sts/Speed\` can be a member.
- A **relative path** such as \`[.]Speed\` means "the sibling called Speed", resolved against the tag that contains the reference. \`[~]\` means "relative to the current provider". Relative paths are what make a UDT work when it is copied 200 times.
- An **indirect path** substitutes parameters, for example \`[default]Plant1/Area10/Line{Line}/M101/Sts/Speed\`. Bindings and UDTs both use this idea.

## The six tag types

The tag's **Value Source** property sets its type.

| Type | Value comes from | Typical use |
|---|---|---|
| OPC | An item on an OPC UA connection (your PLC device) | Live process data |
| Memory | A value stored in the Gateway, written by anything | Setpoints, switches, test values, flags |
| Expression | An expression ({{lesson:ign-expressions}}) evaluated by the Gateway | Unit conversions, combined statuses |
| Derived | Another tag, transformed by a read expression and a write expression | Show degrees C while the source holds degrees F, in both directions |
| Reference | Another tag, mirrored. Writes pass through | Aliases, a stable name over a changing source |
| Query | A SQL query run through a database connection | Slow-changing data from a table |

A memory tag is the default type. It is also the right place for operator-entered values that no PLC needs to know about. A reference tag is the cheapest way to give one value a second name. A derived tag is a reference tag that also converts: its read expression uses \`{source}\` and its write expression uses \`{value}\`, so an operator who types a Celsius setpoint writes Fahrenheit to the source.

Memory tags forget their value on a Gateway restart unless you give them an initial value or enable the retain behavior. If a screen setpoint must survive a restart, keep it in the PLC or in a database.

## Tag groups decide what everything costs

Every tag runs in a **tag group** (called a scan class in Ignition 7.9). The group sets *when* the Gateway evaluates the tag. For an OPC tag, that rate becomes the subscription rate to the OPC UA server, and the server in turn polls the device at that rate. So the tag group is where Gateway load and PLC load are decided.

| Mode | Behavior | When to use |
|---|---|---|
| Direct | One fixed rate | Default for almost everything |
| Driven | Runs at the base rate, switches to the faster *driven* rate while a condition on the group is true | Fast sampling only during a batch or an alarm |
| Leased | Runs at the slow base rate until something is looking at the tag (a screen, a history or alarm demand), then switches to the leased rate | Thousands of detail tags that matter only when a screen is open |

{{diagram:flow}}

> [!note] Leased groups and the Tag Browser
> Merely selecting a tag in the Tag Browser does not trigger the leased rate. A tag has to be in use by a client view, a binding or similar.

A starting layout that works at most plants: a **Default** direct group at 1000 ms, a **Fast** direct group at 250 ms for a short list of control-critical values, and a **Slow** group at 10,000 ms for temperatures, totals and anything that drifts. Rates are a budget. A thousand tags at 100 ms is a different load than a thousand at 1000 ms, and the PLC's CPU sees the difference.

## Quality codes

The quality tells you whether to trust the value. The ones you will meet daily:

| Quality | Meaning | First check |
|---|---|---|
| Good | Value is current and valid | Nothing |
| Bad_NotConnected | The device connection is down | Device status, cable, PLC power |
| Bad_NotFound | The OPC server has no such item | Typo in the item path, a renamed PLC tag |
| Bad_Stale | The value has not been refreshed in time | Subscription or network trouble |
| Bad_AccessDenied | Reading or writing is not allowed | Tag security or OPC permissions |
| Bad_Disabled | The tag or its group is disabled | Tag group enabled flag |
| Error_Configuration / Error_ExpressionEval | The tag itself is misconfigured | Fix the tag, not the network |

Scripts must check it. \`readBlocking\` returns a qualified value, and a bad one still has a "value" that is the last known number. Using it without checking \`quality.isGood()\` is how screens show confident fiction.

## Tag properties worth knowing

- **Scaling.** For an OPC tag you can scale raw counts to engineering units in the Gateway (linear, square root and others), together with Engineering Low/High and units. Prefer scaling in the PLC when you can, because then every consumer sees the same number. Use Gateway scaling for devices you do not control. See {{term:scaling|analog scaling}}.
- **Deadband.** A threshold that suppresses tiny changes before they reach history and value-change scripts. Absolute or percent. See {{term:deadband|deadband}}.
- **History.** Switch on historian storage, pick a historical provider and a sample mode. Covered in {{lesson:ign-historian}}.
- **Alarms.** A tag holds a list of alarm definitions with setpoints, priority and delays. Covered in {{lesson:ign-alarming}}.
- **Security.** Read and write permission by security level and role. A write to a pump run command should not be open to every logged-in user.
- **Documentation and tooltips.** Cheap, and the reason a new engineer can use the tag tree.

## Executing is not changing

A tag **executes** every time its group evaluates it. It **changes** only when the new value, quality or timestamp differs, or exceeds its deadband. A 1000 ms group executes the tag every second whether or not the PLC value moved. This distinction matters for scripts. A tag **Value Changed** event script fires on change, not on execution, so a steady value triggers nothing. An expression tag using \`now()\` changes every poll by construction. Put heavy work in change events, never in something that executes continuously.

## The Tag Browser and JSON

The Designer's Tag Browser is where you build the tree. For bulk work, right-click a folder and **Export Tags** to a JSON file, edit it, then **Import**. The file is a nested structure of \`name\`, \`tagType\`, \`valueSource\`, \`opcItemPath\`, \`tagGroup\` and so on.

\`\`\`json
{
  "name": "Speed",
  "tagType": "AtomicTag",
  "valueSource": "opc",
  "dataType": "Float4",
  "tagGroup": "Default",
  "opcServer": "Ignition OPC UA Server",
  "opcItemPath": "ns=1;s=[PLC1]M101.Sts.Speed",
  "engUnit": "rpm"
}
\`\`\`

> [!example] Mass-creating 300 tags
> Export a folder holding one correct tag, copy it in a spreadsheet or a short script 300 times with new names and item paths, and import. For repeating structures like pumps and motors, do not do this at all. Build a UDT instead ({{lesson:ign-udts}}), so the structure lives in one place.

> [!note] In 8.1
> The tag model, tag groups and JSON export are the same in 8.1. The main 8.3 differences you will notice are in the Gateway and Designer user interface and in how configuration is stored. Treat menu paths in older videos as approximate.
`,

  eli5: `
Imagine a notice board at a factory with a lot of little cards. Each card has a name, a number written on it, a note saying "this number is reliable" or "this number is old", and the time it was written.

A tag is one of those cards. The people who read the board, the screens, the alarm bell and the record book, never walk out to the machine. They only read the board.

A worker called the Gateway walks to the machines and updates the cards. How often he walks is the tag group. Some cards he checks every second. Some he checks every ten seconds. Some he only checks while someone is standing at the board looking at them, which is a leased group, a bit like a shop that only turns on the lights in an aisle when a customer walks in.

The "reliable or old" note is the quality. If the walkway to the machine is blocked, the worker doesn't erase the card. He keeps the last number and stamps it "old". That is why you always read the note, not just the number.
`,

  why: `
**Why not just point screens at the PLC?** Because every screen would then own a connection, an address and a polling rate. A tag layer lets one subscription feed twenty screens, an alarm, a history record and a script. It also gives you one place to rename, scale or relocate a value.

**Why tag groups instead of one global rate?** Rates are the main knob on load. Fast everywhere overloads PLC communication and the Gateway. Slow everywhere makes operators wait for feedback. Experienced integrators argue about the exact numbers, but most agree on a small set of groups named for purpose, never one per tag. The anti-pattern is a tag group named "M101_Special".

**Why check quality?** A bad-quality tag keeps its last value. Anything that reads it without looking at quality will happily compute with old data. This is the same hazard as {{term:stale-data|stale data}} on any polled link. Silent staleness is worse than a visible error.

**Why memory tags and expression tags are not free.** They run on the Gateway for the life of the project. A few thousand expression tags that call scripts at 1 s are a real CPU cost. Tag-heavy designs deserve a periodic look at the Gateway's tag diagnostics.

**The debate.** Some teams create every tag by hand in Ignition. Others keep tag definitions as JSON in version control and import them. Both are fine. The mistake is half-and-half, where the PLC, the Gateway and the documentation each hold a different truth.
`,

  history: `
Early SCADA systems tied every tag to a licensed point count, so tags were scarce and expensive. Ignition's licensing, which does not count tags, has been part of the platform since its first release in 2010, and it flipped the design habit: model everything. Scan classes (versions up to 7.9) were renamed tag groups in Ignition 8.0.
`,

  examples: [
    {
      title: "Driven group for a batch reactor",
      body: `Temperatures in the Area10 mixer normally run at 5000 ms. A boolean tag \`[default]Plant1/Area10/Line1/Mixer1/BatchActive\` drives the group: when it equals 1, the group switches to a 500 ms driven rate. The operator sees smooth trends during the batch, and the PLC is not polled fast for the other 20 hours of the day.`
    },
    {
      title: "Reading a Bad_NotFound tag",
      body: `After a PLC program change, a motor status tag shows Bad_NotFound while its neighbours are good. The OPC item path is \`ns=1;s=[PLC1]Motor101.Sts.Running\`. Someone renamed the controller tag to \`M101\`. Fix the path in the tag (or, in a UDT, fix the parameter). No network work is needed.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 220" role="img" aria-label="A PLC feeds an OPC UA server, which feeds a tag in the Gateway whose tag group sets the rate; screens, alarms and history consume the tag">
  <defs><marker id="ign-tags-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="16" y="80" width="96" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="64" y="106">PLC</text>
  <text class="dg-text-muted dg-mid" x="64" y="124">M101.Sts</text>
  <rect class="dg-box" x="150" y="80" width="110" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="205" y="106">OPC UA</text>
  <text class="dg-text-muted dg-mid" x="205" y="124">subscription</text>
  <rect class="dg-box-accent" x="300" y="60" width="150" height="100" rx="6"/>
  <text class="dg-title dg-mid" x="375" y="84">Tag</text>
  <text class="dg-text-mono dg-mid" x="375" y="106">value 1480.2</text>
  <text class="dg-text-mono dg-mid" x="375" y="124">quality Good</text>
  <text class="dg-text-mono dg-mid" x="375" y="142">time 14:03:11</text>
  <rect class="dg-box" x="500" y="20" width="124" height="38" rx="6"/>
  <text class="dg-text-sm dg-mid" x="562" y="44">Screens</text>
  <rect class="dg-box" x="500" y="91" width="124" height="38" rx="6"/>
  <text class="dg-text-sm dg-mid" x="562" y="115">Alarms</text>
  <rect class="dg-box" x="500" y="162" width="124" height="38" rx="6"/>
  <text class="dg-text-sm dg-mid" x="562" y="186">History</text>
  <line class="dg-line" x1="112" y1="110" x2="148" y2="110" marker-end="url(#ign-tags-ah)"/>
  <line class="dg-line" x1="260" y1="110" x2="298" y2="110" marker-end="url(#ign-tags-ah)"/>
  <line class="dg-line" x1="450" y1="95" x2="498" y2="42" marker-end="url(#ign-tags-ah)"/>
  <line class="dg-line" x1="450" y1="110" x2="498" y2="110" marker-end="url(#ign-tags-ah)"/>
  <line class="dg-line" x1="450" y1="125" x2="498" y2="180" marker-end="url(#ign-tags-ah)"/>
  <text class="dg-label-accent dg-mid" x="280" y="40">Tag group sets the rate: 1000 ms</text>
  <line class="dg-dash" x1="280" y1="46" x2="340" y2="58"/>
</svg>`
  },

  pitfalls: [
    "Reading a tag value in a script without checking quality. A bad tag still returns its last number.",
    "Leaving tags in a fast group because it was convenient. Rates multiply across thousands of tags.",
    "Omitting the provider in tag paths in scripts, then moving the code to another scope or Gateway.",
    "Using expression or memory tags for logic that belongs in the PLC. Gateway restarts and network breaks stop it.",
    "Gateway scaling on a tag that the PLC also scales, applying the conversion twice.",
    "Importing JSON over a live tag tree without a backup. A bad import can replace working configuration."
  ],

  keyTerms: ["ign-tag-provider", "ign-tag-path", "ign-tag-group", "ign-quality-code", "ign-memory-tag", "ign-reference-tag", "ign-derived-tag", "ign-query-tag", "deadband", "scaling", "stale-data"],

  quiz: [
    {
      q: "A screen shows M101 at a speed of 1480 rpm and it has not moved for ten minutes, but the PLC power is off. The tag quality is Bad_NotConnected. What does the 1480 represent?",
      options: ["The current speed read a moment ago", "A default initial value", "The last value the Gateway received before the connection dropped", "The scaled engineering high limit"],
      answer: 2,
      explain: [
        "The connection is down, so nothing has been read recently.",
        "Defaults apply to memory tags without a source, not to a dropped OPC connection.",
        "Correct. A bad-quality tag keeps its last known value, which is why you must check quality before trusting a number.",
        "Scaling limits don't become the displayed value when quality is bad."
      ]
    },
    {
      q: "An operator should type a setpoint in degrees C, but the PLC holds degrees F. Which tag type fits best?",
      options: ["Memory tag", "Derived tag", "Query tag", "Expression tag"],
      answer: 1,
      explain: [
        "A memory tag would not write to the PLC.",
        "Correct. A derived tag has both a read and a write expression, so a value written in C is converted and sent to the source in F.",
        "A query tag reads from a SQL database, which is not the need here.",
        "An expression tag is read-only. It cannot write the converted value back to the source."
      ]
    },
    {
      q: "Two thousand OPC tags are only interesting while a detail screen is open. Which tag group mode reduces PLC load the most without losing responsiveness?",
      options: ["Leased with a slow base rate and a fast leased rate", "Direct at 100 ms", "Driven by a screen-open flag in a memory tag only", "Disable the tags"],
      answer: 0,
      explain: [
        "Correct. Leased groups run slowly until a client is actually using the tag, then speed up.",
        "That polls 2000 tags every 100 ms at all times.",
        "A driven group depends on a condition you maintain. It would work only if something sets the flag, which is more work and error-prone.",
        "Disabled tags give Bad_Disabled quality and no value at all."
      ]
    },
    {
      q: "A steady PLC value is read every second by a 1000 ms tag group. How often does the tag's Value Changed script run?",
      options: ["Every second", "Every time the group executes and the quality is good", "Once at startup only", "Only when the value, quality or timestamp meets the change rules"],
      answer: 3,
      explain: [
        "That would be execution, not change.",
        "Execution happens every second. The change event does not.",
        "It also runs on genuine changes after startup.",
        "Correct. Executing and changing are different. A steady value executes continually but triggers no change event."
      ]
    },
    {
      q: "Which tag path is the most robust to put in a gateway script?",
      options: ["M101/Sts/Speed", "[default]Plant1/Area10/Line1/M101/Sts/Speed", "[.]Speed", "Plant1.Area10.Line1.M101.Sts.Speed"],
      answer: 1,
      explain: [
        "Without the provider, the target depends on what the caller assumes.",
        "Correct. A fully qualified path names the provider, folders and tag.",
        "A relative path needs a containing tag to resolve against, and a script has none.",
        "Dots are not the folder separator in tag paths."
      ]
    },
    {
      q: "You need to create the same 40 motor structures with six members each. What is the best approach?",
      options: ["Define a UDT once and create 40 instances", "Create 240 tags by hand", "Export, replicate in a spreadsheet, import", "Create one expression tag per pump"],
      answer: 0,
      explain: [
        "Correct. A UDT keeps the structure in one definition and instances inherit from it.",
        "That is slow and any later change has to be made 40 times.",
        "It works once, but every later change must be repeated across copies.",
        "Expression tags compute values. They are not a way to replicate a structure."
      ]
    }
  ],

  resources: [
    { title: "Tags (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags", type: "docs", source: "Inductive Automation" },
    { title: "Types of Tags (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/types-of-tags", type: "docs", source: "Inductive Automation" },
    { title: "Tag Groups (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-groups", type: "docs", source: "Inductive Automation" },
    { title: "Tag Properties (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-properties", type: "docs", source: "Inductive Automation" },
    { title: "Exporting and Importing Tags", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/exporting-and-importing-tags", type: "docs", source: "Inductive Automation" },
    { title: "Tags in Ignition (video)", url: "https://inductiveuniversity.com/videos/tags-in-ignition/8.3", type: "video", source: "Inductive University" },
    { title: "Reference and Derived Tags (video)", url: "https://inductiveuniversity.com/videos/reference-and-derived-tags/8.3", type: "video", source: "Inductive University" }
  ]
});
