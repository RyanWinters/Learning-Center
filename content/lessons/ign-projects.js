LC.lesson({
  id: "ign-projects",
  title: "Projects, inheritance, and Vision vs Perspective",
  track: "ign",
  minutes: 10,
  level: 2,
  prereqs: ["ign-architecture"],
  tags: ["projects", "inheritance", "vision", "perspective", "scripting"],
  summary: "A project is the container for everything users see and run. Inheritance lets many projects share one set of parts, and Vision and Perspective are the two ways to draw the screens.",
  objectives: [
    "Explain what a project holds and what lives at Gateway level instead",
    "Use inheritance to share scripts, views and templates across projects",
    "Describe how overriding works and what it costs",
    "Explain the Gateway scripting project and why inherited event scripts run in every leaf project",
    "Choose between Vision, Perspective or both for a given job"
  ],

  body: `
## What a project is

An Ignition **project** is a named container of resources: screens, scripts, named queries, Gateway events, alarm settings that belong to the project, and so on. Each Designer session opens one project. Each Perspective session or Vision client runs one project. A single Gateway can host dozens.

Not everything is in a project. Devices, database connections, tag providers, user sources and identity providers are **Gateway configuration**, shared by every project on that Gateway. A useful rule: if a resource is a screen or logic that one app owns, it belongs to a project. If it is a connection to the outside world, it belongs to the Gateway.

| Lives in a project | Lives on the Gateway |
|---|---|
| Perspective views and Vision windows | Device connections |
| Project library scripts | Database connections |
| Named queries | Tag providers and tags |
| Gateway event scripts, message handlers | Identity providers, user sources |
| Perspective session settings, page config | Security zones |

## Inheritance

A project can **inherit** from a parent. The child sees everything the parent has, plus its own resources. Edit the parent and every child changes. Inheritance is one parent per project, but parents can chain (grandparent, parent, child).

{{diagram:inherit}}

### The base project pattern

Most mature Gateways have a project named something like \`Global\` or \`Base\` that holds only shared things:

- Utility script libraries (\`util.format\`, \`util.alarms\`, a database helper)
- Perspective styles, shared views and standard popups
- Vision templates or a standard header/navigation window
- Named queries many apps use

Each real app (\`Packaging\`, \`Utilities\`, \`Warehouse\`) inherits from it. A fix to a shared script is made once. Resources are not copied into the child. The child only stores what is its own or overridden.

### Overriding

If a child defines a resource with the same path as one in the parent, the child's version wins. That is an **override**. In the Designer, an overridden resource is marked and you can revert it. Use overrides rarely. Each one is a place where the child quietly stops following the parent, and a shared fix will not reach it.

> [!tip] Keep the base project dull
> Put generic building blocks in the base project and no plant-specific content. If a view names a specific tag path, it probably belongs in the app project.

### Event scripts run in every leaf project

Screens, scripts and templates inherit. **Gateway event scripts** (timers, tag change scripts, message handlers) are *runnable* resources: they run in every leaf project that inherits them, so a timer defined in \`Global\` runs once for each child. The manual advises keeping runnable resources in a leaf or standalone project. The common pattern is to write the real logic as a library function in the base project and call it from a one-line event script in the leaf project.

The Gateway also has one **Gateway scripting project** setting. It names the project whose script library is available to scripts that run outside any project, such as tag event scripts on tags and some Gateway-wide scripting. Tag event scripts (see {{lesson:ign-events}}) depend on it. If your shared utilities live in \`Global\` and that is not designated, tag scripts cannot see them. A good habit is to designate the base scripting project early.

## Vision versus Perspective

Both modules build screens on top of the same Gateway, tags, historian and alarms. They differ in how the screen is drawn and run.

| | Vision | Perspective |
|---|---|---|
| Runs as | Java Swing desktop client, launched from the Gateway | Web app in a browser, built on React |
| Install on the operator side | Client launcher or Vision Client Launcher | None. A URL, or a native wrapper |
| Layout | Pixel-based windows, absolute positioning | Responsive containers (flex, breakpoints, column) |
| Scripting scope | Client scope and Gateway scope | The scripts you write run on the Gateway (Perspective Session scope) (see the Perspective scripting pages for details) |
| Mobile and tablets | Poor | Designed for it |
| Heavy native integration | Strong (local files, printing, serial) | Limited by the browser |
| Bindings | Property, expression, tag, SQL, with polling | Same ideas, plus transforms and a session model |

### When Vision still wins

- **Big existing Vision apps.** Rewriting hundreds of windows is a project in itself. Many plants run both for years.
- **Client-side scripting.** Vision can touch the local machine: print to a specific printer, read a file, talk to a barcode scanner. In Perspective the scripts you write run on the server.
- **Dense, fixed-resolution control rooms.** Wall-mounted HMIs at a known resolution do not need responsive layout.
- **Some third-party modules** only support Vision. Check before you commit.

### When Perspective wins

- Anything used on phones, tablets or by many users with no installed software.
- Remote access through a browser, with identity-provider sign-in.
- New projects. Most new Ignition work targets Perspective.

### Mixing both

Nothing stops one Gateway from hosting both. A common shape: operators on Vision HMIs in the control room, managers on Perspective dashboards on their phones. Share the tag provider, named queries and a base project of scripts. Keep UI resources in separate inheritable projects, because a Perspective view cannot be used in Vision and vice versa. Designer shows both in one project, so a project can contain both kinds of screens.

> [!example] Worked example: one fix, three apps
> A plant has projects \`Packaging\`, \`Utilities\` and \`Warehouse\`, all inheriting \`Global\`. \`Global\` has \`util.fmt.duration(seconds)\`, which formats seconds as \`2h 05m\`. Someone finds it prints \`2h 5m\`. The fix goes into \`Global\` once. All three apps get it on the next save. Had \`Utilities\` overridden the script with a local copy, it would still print \`2h 5m\`. Search for overrides when a shared fix does not take.

> [!note] In 8.1
> Inheritance, the Gateway scripting project and Vision and Perspective work the same way in 8.1. The main difference is where things are stored. In 8.1 projects are saved in the Gateway's internal storage and are imported and exported as files. In 8.3 they are real folders on disk. See {{lesson:ign-versioning}}.
`,

  eli5: `
Imagine a school with several classrooms. Each classroom has its own bulletin board, its own seating chart and its own lesson plan. Those are projects.

Some things are the same everywhere: the fire drill sign, the school rules poster, the hall pass. It would be silly to write a new copy by hand for each room. So the school keeps one master copy in the office, and each classroom just points to it. If the rule changes, you fix it in the office and every room shows the new rule. That is inheritance.

If one teacher wants a different rule poster for her room, she can put up her own. Now her room doesn't change when the office does. That is an override. It is allowed, but she has to remember to update it herself.

Vision and Perspective are two ways to put up the poster. One is a big paper sign that you can only read standing in the room. The other is a screen that you can read on your own phone from anywhere.
`,

  why: `
**Why projects at all?** One Gateway often serves several areas, owned by different people, with different users. Separate projects keep work from colliding. An engineer breaking the Packaging screens does not take down Utilities. It also gives you a natural unit for permissions, deployment and version control.

**Why inheritance instead of copy and paste?** Copies drift. Six months later you have six versions of the same formatting function and nobody knows which one is right. Inheritance gives one source of truth. The cost is coupling: a bad edit to the base project now breaks every child at once. Experienced integrators treat the base project like shared library code. Small changes, tested on a dev Gateway, and a short list of people allowed to save it.

**Why is overriding discouraged?** An override is a fork. It buys local freedom and costs shared fixes. A few overrides are healthy. Dozens mean the base project is the wrong shape and should be split.

**Why do event scripts not inherit?** If a timer script ran once per child, a Gateway with ten children would run it ten times. Writing the logic once in the base and calling it from the leaf keeps the behavior predictable.

**Vision or Perspective?** Integrators argue about this. The practical answer is that Perspective is the default for new work, and Vision stays where its strengths matter or where the cost of rewriting is not justified. Whichever you pick, put the logic in project scripts and named queries so the screens stay thin and a later migration is cheaper.
`,

  history: `
Vision was Ignition's original client technology, a Java Swing application launched from the Gateway. Perspective arrived with Ignition 8.0 as a web-native module, built for browsers, phones and tablets. Inductive Automation has said it considers Perspective the future of its visualization, while continuing to support Vision. Project inheritance has existed since the Ignition 7 era.
`,

  examples: [
    {
      title: "Scripts that cannot find the library",
      body: `A tag change script calls \`util.alarms.notify()\`, but the function lives in \`Global\`. It fails with a name error. The Gateway scripting project was not set to \`Global\`, so scripts that run outside a project cannot see it. Designate \`Global\` as the Gateway scripting project.`
    },
    {
      title: "Where to put a message handler",
      body: `You want a message handler named \`printLabel\` that every app can call. Put the real code in \`Global\` as \`labels.print(args)\`. In each leaf project create a one-line handler \`labels.print(payload)\`. Keep the handler in the leaf, not in \`Global\`, because an inherited Gateway event resource runs in every leaf project.`
    }
  ],

  diagrams: {
    inherit: `<svg viewBox="0 0 640 240" role="img" aria-label="Three app projects inherit from one Global project, and Utilities overrides one script">
  <defs><marker id="ign-projects-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="190" y="20" width="260" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="46">Global (base project)</text>
  <text class="dg-text-sm dg-mid" x="320" y="68">util scripts, styles, named queries</text>
  <rect class="dg-box" x="20" y="150" width="170" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="105" y="176">Packaging</text>
  <text class="dg-text-sm dg-mid" x="105" y="198">own views, inherits all</text>
  <rect class="dg-box" x="235" y="150" width="170" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="176">Utilities</text>
  <text class="dg-text-sm dg-mid" x="320" y="198">overrides util.fmt</text>
  <rect class="dg-box" x="450" y="150" width="170" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="535" y="176">Warehouse</text>
  <text class="dg-text-sm dg-mid" x="535" y="198">own views, inherits all</text>
  <line class="dg-line" x1="105" y1="148" x2="250" y2="92" marker-end="url(#ign-projects-ah)"/>
  <line class="dg-line" x1="320" y1="148" x2="320" y2="92" marker-end="url(#ign-projects-ah)"/>
  <line class="dg-line" x1="535" y1="148" x2="390" y2="92" marker-end="url(#ign-projects-ah)"/>
  <text class="dg-text-muted" x="335" y="125">child wins</text>
</svg>`
  },

  pitfalls: [
    "Putting plant-specific content in the base project, so it cannot be reused.",
    "Overriding shared scripts and forgetting, so later fixes never arrive.",
    "Putting a timer or tag change script in a parent project, then finding it runs once for every child.",
    "Not designating a Gateway scripting project, then wondering why library calls fail from tag scripts.",
    "Making a quick edit to the base project in production with no dev Gateway test.",
    "Rewriting a large working Vision app to Perspective only because Perspective is newer."
  ],

  keyTerms: ["ign-project", "project-inheritance", "gateway-scripting-project", "resource-override", "vision-module", "perspective"],

  quiz: [
    {
      q: "Which of these belongs to the Gateway configuration, not to a project?",
      options: ["A Perspective view", "A named query", "A device connection to a PLC", "A project library script"],
      answer: 2,
      explain: [
        "Views are project resources.",
        "Named queries live in projects.",
        "Correct. Devices, databases and tag providers are shared by every project on the Gateway.",
        "Library scripts are project resources."
      ]
    },
    {
      q: "A bug in a shared formatting script is fixed in the Global project. Packaging and Warehouse pick it up, but Utilities still shows the bug. What is the likely cause?",
      options: ["Utilities needs a Gateway restart", "Perspective caches scripts for a week", "Global can only change one child", "Utilities overrides the script locally"],
      answer: 3,
      explain: [
        "Inherited changes do not need a restart.",
        "There is no such cache rule.",
        "A parent project affects every child that inherits from it.",
        "Correct. A child's override wins over the parent's version, so the parent's fix does not reach it."
      ]
    },
    {
      q: "A timer script is defined in the base project, and ten apps inherit from it. How many times does it run?",
      options: ["Ten, once per child", "Once, in the base project only", "Once per session", "Zero, timers are not allowed in projects"],
      answer: 0,
      explain: [
        "Correct. Gateway event scripts are runnable resources and run in each leaf project, so keep them in a leaf or standalone project.",
        "Inherited runnable resources run in every leaf project, not only in the parent.",
        "Sessions are a UI concept, not a timer trigger.",
        "Timers are valid project Gateway events."
      ]
    },
    {
      q: "Which job is the best fit for Vision rather than Perspective?",
      options: ["A fixed-resolution control room HMI that prints to a local label printer from client scripts", "A phone dashboard for managers", "A browser view for remote contractors", "A responsive page for tablets"],
      answer: 0,
      explain: [
        "Correct. Vision has client-scope scripting that reaches local devices, and fixed layouts suit control room screens.",
        "Phones are Perspective's strength.",
        "Remote browser access is Perspective's strength.",
        "Responsive layout for tablets favors Perspective."
      ]
    },
    {
      q: "Where do you set which project's scripts are available to tag event scripts that run outside any project?",
      options: ["The Gateway scripting project setting", "In each view's properties", "In the tag provider's name", "In the Vision client launcher"],
      answer: 0,
      explain: [
        "Correct. The Gateway designates one project as the scripting project for scripts outside project scope.",
        "Views only affect their own scripts.",
        "A provider name has no effect on scripting.",
        "The launcher is client-side."
      ]
    }
  ],

  resources: [
    { title: "Project Inheritance (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/projects/project-inheritance", type: "docs", source: "Inductive Automation" },
    { title: "Project Inheritance video", url: "https://inductiveuniversity.com/videos/project-inheritance/8.3", type: "video", source: "Inductive University" },
    { title: "A Vision-Oriented Guide to Perspective", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/a-vision-oriented-guide-to-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Perspective and Vision: which is best for me?", url: "https://www.docs.inductiveautomation.com/docs/8.1/getting-started/perspective-and-vision", type: "docs", source: "Inductive Automation" },
    { title: "Vision and Perspective: which module is best for your next project?", url: "https://inductiveautomation.com/blog/vision-perspective-which-module-is-best-for-your-next-project", type: "article", source: "Inductive Automation" },
    { title: "Where do gateway scripts live with an inherited project structure?", url: "https://forum.inductiveautomation.com/t/where-do-should-gateway-scripts-live-with-respect-to-an-inherited-project-structure/83460", type: "forum", source: "Inductive Automation Forum" },
    { title: "Gateway vs. client event scripts", url: "https://inductiveuniversity.com/videos/gateway-vs-client-event-scripts/8.3", type: "video", source: "Inductive University" }
  ]
});
