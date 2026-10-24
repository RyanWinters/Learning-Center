LC.lesson({
  id: "ign-architecture",
  title: "Gateway, Designer, clients and modules",
  track: "ign",
  minutes: 10,
  level: 1,
  prereqs: ["ign-what"],
  tags: ["ignition", "gateway", "designer", "modules", "perspective", "vision", "scopes"],
  summary: "One server holds everything. Designers edit it, clients view it, modules add capabilities, and scripts run in a scope that decides where the code actually executes.",
  objectives: [
    "Describe what runs on the Gateway and what runs on a Designer or client",
    "Differentiate a Vision client from a Perspective session and say where each runs",
    "List the core modules and what each one adds to the Gateway",
    "Separate Gateway-level resources (devices, databases, tag providers) from project resources (views, scripts)",
    "Predict where a piece of code runs using the Gateway, Designer and Client scopes"
  ],

  body: `
## One server, many windows

Everything in Ignition revolves around the {{term:ign-gateway|Gateway}}. It is a single Java process that holds the configuration, talks to devices, runs tags, logs history, evaluates alarms, serves projects and hosts a web interface. The other pieces of the platform are windows onto it: the {{term:ign-designer|Designer}} edits projects stored on it, and clients display projects served by it. When people say "Ignition is down," they almost always mean the Gateway.

{{diagram:arch}}

## The Gateway and its web interface

A Gateway has three jobs.

1. **Run the engine.** Device connections poll PLCs, tags evaluate, the historian writes to the database, alarm pipelines fire, and Gateway scripts execute.
2. **Serve projects.** It hands project resources to Designers and clients and executes the server-side half of Perspective sessions.
3. **Host the admin web UI.** At \`http://host:8088\` you get sections such as Home, Platform, Connections, Services and Diagnostics (8.1 split them into Status and Config pages), plus links to download launchers.

The Gateway web UI is where you set up database connections, device connections, tag providers, security, alarm settings and modules. Project content like views and scripts is not configured here. You edit it in the Designer.

## The Designer

The Designer is the development environment. You do not install it per project. You install the **Designer Launcher**, a small application that lists Gateways, downloads the Designer version matching the Gateway, and opens it. The Designer talks to the Gateway over HTTP(S) and saves changes into the project on the Gateway. Several people can have Designers open on the same Gateway, but concurrent edits to the same resource can overwrite each other, so check how your version handles collisions and do not make that your collaboration strategy (see {{lesson:ign-versioning}}).

## Clients: Vision and Perspective

Ignition has two client technologies, and they behave very differently.

| | {{term:vision-module|Vision}} | {{term:perspective|Perspective}} |
|---|---|---|
| Runtime | Java client launched from a Vision Client Launcher | Web page in any modern browser, Perspective Workstation, or the mobile app |
| Where logic runs | Mostly on the client machine | Mostly on the Gateway; the browser renders |
| Designed in | Windows, vector-style, fixed canvas | Views, responsive containers (flex, breakpoints, coordinates) |
| Best for | Dense desktop HMIs, legacy and large installed base | Responsive, mobile, touch, web-first |
| Network load | Client connects to the Gateway and subscribes to tags | Browser holds a websocket to the Gateway |
| Client PC need | Java client install | None beyond a browser |

A Perspective **session** is created when someone opens a project URL. The session lives on the Gateway: its state, bindings and session scripts run there, and the browser draws the result. This is why a Perspective deployment is limited by Gateway memory and CPU, and why thousands of bindings across many sessions matter to server sizing.

**Perspective Workstation** wraps a Perspective session in a kiosk-style desktop application, useful on plant-floor panel PCs where you want fullscreen, no address bar, and multiple monitor control. Check the downloads page for the operating systems each launcher and Workstation build supports in your version.

## Modules

A module is a signed package that adds capability to the Gateway. You install modules from the Gateway web UI and license them. A few come with the base install, and others are downloaded from the Ignition downloads page.

| Module | What it adds |
|---|---|
| OPC UA | Ignition's built-in OPC UA server and the device drivers (Logix, Modbus, Siemens and more), plus an OPC UA client |
| Perspective | The web/mobile visualization system |
| Vision | The Java desktop visualization system |
| Historian (Core Historian and SQL Historian providers in 8.3; Tag Historian in 8.1) | Stores and queries tag history |
| SQL Bridge | Transaction groups: data logging between tags and SQL tables |
| Alarm Notification | Email, voice and SMS paging, call rosters |
| Reporting | Designing and scheduling PDF reports |
| Enterprise Administration (EAM) | Central management of many Gateways |
| SFC | Sequential function chart execution |
| Event Streams, Kafka Connector | Stream tag and event data to Kafka and similar systems (new in 8.3) |

Third-party modules (Sepasoft MES, Cirrus Link MQTT, many others) install the same way. A module runs inside the Gateway's JVM, which is its power and its risk: a poorly written module can destabilize the whole server.

> [!note] In 8.1
> In 8.1 the history module is Tag Historian, which stores to SQL. In 8.3 the Historian module offers SQL Historian and Core Historian providers. Confirm which one a Gateway runs before copying instructions between versions, and see {{lesson:ign-historian}}.

## Gateway resources versus project resources

This distinction explains where to look when something is missing.

| Gateway-level (global) | Project-level |
|---|---|
| Database connections | Perspective views, Vision windows |
| Device connections | Project scripts (libraries) |
| Tag providers and their tags | Named queries |
| Identity providers, users, roles | Gateway event scripts (timers, tag change, message handlers) |
| Alarm pipelines, notification profiles | Session event scripts, styles |
| Modules, licensing | Project properties and permissions |

Gateway-level items are shared by every project on that Gateway. Project-level items belong to one project, though a project can inherit from a parent, which the {{lesson:ign-projects}} lesson covers. Tags are Gateway-level; a view binding that points to them is project-level.

## Scopes: where does my code run?

Ignition scripts always run in a scope, and the scope tells you which machine's CPU and memory they use.

- **Gateway scope**: scripts run in the Gateway JVM. Gateway event scripts, tag event scripts, alarm pipeline scripts run here, and Perspective scripts run in this JVM too, in the Perspective Session scope.
- **Designer scope**: scripts run in the Designer while you edit, including the script console and preview mode.
- **Client scope**: Vision client scripts run in the client JVM on the operator PC.

Perspective is the surprise. Although it feels like a web client, the scripts you write for it (component events, script transforms, session events) execute on the Gateway (Perspective Session scope), not in the browser. The browser only receives rendered updates. Confirm the details in the Perspective scripting pages of the manual for your version. That makes \`system.util.getLogger\` output appear in the Gateway logs, and it means \`system.file.*\` functions touch the server's disk, not the operator's.

> [!example] Where did that file save?
> A Perspective button runs \`system.file.writeFile("C:/export.csv", data)\`. You test it in a browser on your laptop and find no file. The script ran on the Gateway, so the file is on the server's C: drive. Use \`session.props\` or a download-style component to hand the file to the user instead.

## Worked trace: one tag value to one screen

1. A Logix PLC holds \`LT101\` (the Area10 tank level transmitter) with a scaled value of 3.62 m.
2. A device connection in the OPC UA module reads it every tag group period.
3. The tag \`[default]Plant1/Area10/Line1/LT101\` is bound to that OPC item, and the tag provider updates its value.
4. A Perspective session for a user at a browser has a binding to that tag. The Gateway pushes the new value over the session's websocket.
5. The browser redraws the gauge. Meanwhile the historian logs the change and the alarm engine compares it with its setpoints.

All five steps happen inside or around one Gateway process. That is the model to keep in your head for the rest of the Ignition track.
`,

  eli5: `
Think of a restaurant. The kitchen is the Gateway: it holds all the recipes, ingredients and cooks, and it is where everything real happens. The Designer is the chef's office where the menu is written and changed. The dining room is where the customers (clients) sit and see their food.

Some diners eat at a table inside the restaurant with their own cutlery and plates (that is Vision: a program on the diner's own computer). Others get a delivery box and eat at home from anything they own (that is Perspective: they just need something that can open the box). In both cases the kitchen made the food.

Modules are the kitchen's extra equipment. A basic kitchen cooks. Add a pizza oven and a pastry station and you serve more kinds of food. You only buy the equipment you need.
`,

  why: `
**Why centralize on one server?** A single Gateway means one place to patch, back up, secure and audit. It also means every layer shares the same tag values, so a trend, an alarm and a screen can never disagree about the current number. The cost is concentration. A Gateway failure affects everything above the PLC, which is why serious installations use redundancy and, at scale, multiple Gateways connected by the Gateway Network.

**Why scopes matter so much.** A script that works in the Designer script console may fail or behave differently in a Perspective session. Reading a local file, showing a popup or getting the current user are all scope-dependent. Knowing where code executes is half of debugging in Ignition.

**Why keep resource levels separate?** Putting devices and databases at Gateway level lets many projects share them. Putting views at project level lets a team iterate on one screen set without touching others. Integrators argue about how many projects to create. A common rule is one project per distinct audience or deployable unit, plus a shared parent project for common scripts and styles.

**Why the Vision-versus-Perspective choice is not trivial.** Perspective has the momentum and the better architecture for web and mobile, but a Gateway carrying hundreds of live sessions has a real memory budget. Vision pushes work to client machines. Neither is wrong, and many plants run both during a long migration.
`,

  history: `
Early Ignition versions used FactoryPMI-style Java web-launched clients, which became Vision. Perspective arrived with Ignition 8.0 in 2019 to deliver HTML5 and mobile clients. Ignition 8.3 (2025) separates platform configuration from an internal database into files and adds new modules for event streaming.
`,

  diagrams: {
    arch: `<svg viewBox="0 0 640 280" role="img" aria-label="The Gateway holds modules, tags, devices and projects; Designer, Vision clients and Perspective sessions connect to it; devices and databases sit below.">
  <defs><marker id="ign-architecture-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="20" width="170" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="105" y="47">Designer</text>
  <rect class="dg-box" x="235" y="20" width="170" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="47">Vision client</text>
  <rect class="dg-box" x="450" y="20" width="170" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="535" y="47">Perspective session</text>
  <rect class="dg-box-accent" x="20" y="100" width="600" height="90" rx="6"/>
  <text class="dg-title" x="36" y="124">Gateway (one Java process)</text>
  <text class="dg-text-sm" x="36" y="148">Modules: OPC UA, Perspective, Vision, Historian</text>
  <text class="dg-text-sm" x="36" y="168">Tags, alarms, projects, web UI on 8088 / 8043</text>
  <rect class="dg-box" x="20" y="226" width="170" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="105" y="253">PLCs and devices</text>
  <rect class="dg-box" x="235" y="226" width="170" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="253">SQL database</text>
  <rect class="dg-box" x="450" y="226" width="170" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="535" y="253">Other Gateways</text>
  <line class="dg-line" x1="105" y1="64" x2="105" y2="100" marker-end="url(#ign-architecture-ah)"/>
  <line class="dg-line" x1="320" y1="64" x2="320" y2="100" marker-end="url(#ign-architecture-ah)"/>
  <line class="dg-line" x1="535" y1="64" x2="535" y2="100" marker-end="url(#ign-architecture-ah)"/>
  <line class="dg-line" x1="105" y1="190" x2="105" y2="226" marker-end="url(#ign-architecture-ah)"/>
  <line class="dg-line" x1="320" y1="190" x2="320" y2="226" marker-end="url(#ign-architecture-ah)"/>
  <line class="dg-line" x1="535" y1="190" x2="535" y2="226" marker-end="url(#ign-architecture-ah)"/>
</svg>`
  },

  pitfalls: [
    "Assuming Perspective scripts run in the browser. They run on the Gateway.",
    "Testing a script only in the Designer script console, where the scope and session context differ.",
    "Forgetting that devices, databases and tag providers are Gateway-level and shared by all projects.",
    "Loading many heavy sessions on an undersized Gateway because 'licensing is unlimited'.",
    "Installing third-party modules on a production Gateway without testing them on a copy."
  ],

  keyTerms: ["ign-gateway", "ign-designer", "ign-launcher", "vision-module", "perspective", "ign-module", "ign-scope", "ign-sql-bridge"],

  quiz: [
    {
      q: "A Perspective button script calls system.file.writeFile to save a CSV. Where does the file end up?",
      options: ["On the user's laptop", "In the browser's downloads folder", "On the Gateway server's disk", "In the database"],
      answer: 2,
      explain: [
        "The browser is only a display. The script does not run there.",
        "A download needs a mechanism designed to send a file to the browser.",
        "Correct. Perspective scripts run on the Gateway, so file functions act on the server.",
        "writeFile writes to a filesystem path, not to SQL."
      ]
    },
    {
      q: "Which item is configured at the Gateway level and shared by every project?",
      options: ["Perspective views", "Project script libraries", "Named queries", "Database connections"],
      answer: 3,
      explain: [
        "Views belong to a project.",
        "Script libraries belong to a project, though they can be inherited.",
        "Named queries are project resources.",
        "Correct. Database, device and tag provider connections are Gateway-level resources."
      ]
    },
    {
      q: "Which module provides Ignition's PLC device drivers and built-in OPC UA server?",
      options: ["OPC UA", "SQL Bridge", "Perspective", "Reporting"],
      answer: 0,
      explain: [
        "Correct. The OPC UA module includes the server and drivers such as Logix and Modbus.",
        "SQL Bridge links tags to SQL tables.",
        "Perspective is visualization.",
        "Reporting builds PDF reports."
      ]
    },
    {
      q: "What is the main architectural difference between a Vision client and a Perspective session?",
      options: ["Vision runs in a browser and Perspective needs Java", "Perspective logic mostly executes on the Gateway while Vision logic mostly executes on the client", "Perspective cannot use tags", "Vision does not need a Gateway"],
      answer: 1,
      explain: [
        "It is the reverse: Perspective is browser based, and Vision uses a Java client.",
        "Correct. This drives server sizing for Perspective and client sizing for Vision.",
        "Both use Gateway tags.",
        "Both connect to a Gateway."
      ]
    },
    {
      q: "You open the Designer from your workstation. What actually installs and launches it?",
      options: ["A full Ignition server on your PC", "A browser extension", "A copy of the SQL database", "The Designer Launcher downloads the matching Designer from the Gateway"],
      answer: 3,
      explain: [
        "Designers are not servers.",
        "No extension is involved.",
        "The Designer edits projects on the Gateway and does not carry a database.",
        "Correct. The launcher manages Designer versions per Gateway."
      ]
    }
  ],

  resources: [
    { title: "Gateway (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/gateway", type: "docs", source: "Inductive Automation" },
    { title: "Designer (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/designer", type: "docs", source: "Inductive Automation" },
    { title: "Launchers and Workstation (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/launchers-and-workstation", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Modules (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules", type: "docs", source: "Inductive Automation" },
    { title: "Modules Overview (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/modules-overview", type: "docs", source: "Inductive Automation" },
    { title: "About Ignition's Modules (Inductive University)", url: "https://inductiveuniversity.com/videos/about-ignitions-modules/8.3", type: "video", source: "Inductive University" },
    { title: "Perspective Workstation (Inductive University)", url: "https://inductiveuniversity.com/videos/perspective-workstation/8.3", type: "video", source: "Inductive University" }
  ]
});
