LC.lesson({
  id: "arch-ecosystem",
  title: "Third-party modules and the Ignition Exchange",
  track: "arch",
  minutes: 15,
  level: 2,
  prereqs: ["ign-architecture"],
  tags: ["modules", "third-party", "exchange", "sdk", "ecosystem", "risk"],
  summary: "Ignition is a platform other companies build on. Know where to find modules and shared resources, which names matter, and how to judge the support risk before you design around one.",
  objectives: [
    "Distinguish the Ignition Exchange from the Module Showcase and from Inductive Automation's own modules",
    "Name notable third-party module vendors and what they provide",
    "Install a third-party module and explain why signing and version compatibility matter",
    "Run a support and longevity check before putting a module into a design",
    "Explain what the Ignition SDK is and when custom module work is justified"
  ],

  body: `
## A platform, not a closed product

Ignition's open module architecture is the reason one gateway can be an HMI, a historian, an MES and an MQTT hub. Inductive Automation builds the core modules. Because the module API and SDK are public, other companies build modules too, and the community shares projects, scripts and components. As an integrator you will use this ecosystem on almost every job. You will also be the one blamed when a module you chose is abandoned, so learn to evaluate it.

{{diagram:layers}}

## Three different things people call "the marketplace"

| Name | What it is | Cost | Who vets it |
|---|---|---|---|
| **Inductive Automation modules** | Modules in the 8.3 manual: Perspective, Vision, SQL Bridge, Reporting, Alarm Notification, SFC, Web Dev, Event Streams and more | Licensed by module on the gateway | Inductive Automation builds and supports them |
| **Module Showcase** | A listing of third-party modules, mostly paid, with links to buy from the developer | Set by each vendor | Light. The developer requests a signing certificate from Inductive Automation, and IA can remove modules with known problems or risks |
| **Ignition Exchange** | A library of community-shared resources: project templates, Perspective views, scripts, UDTs and sometimes free modules | Often free | Community. Read before you import |

Remember that an Exchange resource is usually a project or a set of files you import and then own, while a Showcase module is installed software with a vendor behind it. Different expectations apply to each.

The forum also has a 3rd Party Modules category where module developers post releases and users report problems. Read it for any module you are considering. Questions that go unanswered for a year tell you something.

## Vendors you will meet

Names change, so treat this as orientation, not an endorsement list.

| Vendor | What they provide | Notes |
|---|---|---|
| **Cirrus Link** | MQTT Engine, MQTT Transmission, and MQTT Distributor (a broker), which implement Sparkplug in Ignition | Recognized by Inductive Automation as a Strategic Partner (check IA's partner pages). Cirrus Link builds and supports its modules, and the module documentation is theirs. IA's price list lists them too, but that does not move support to IA (see {{lesson:arch-mqtt}}). Their modules also supply the MQTT event stream sources and handlers ({{lesson:arch-event-streams}}) |
| **Sepasoft** | MES modules for OEE, SPC, track and trace, recipes and batch | Listed by Inductive Automation as a Premier Technology Provider (verify on IA's partner pages). See {{lesson:mes-sepasoft}} |
| **Embr** (from Musson Industrial) | Utility modules such as SNMP device support, server-sent events and charting | Community listings suggest its Charts module succeeds an earlier charting module from a different developer (verify before relying on the lineage) |
| **Others** | Drivers for specific PLC families, extra charting, document and PDF tools, mapping, OEE widgets | Browse the Showcase for the current set |

Strategic Partners and Premier Technology Providers are recognized by Inductive Automation. The documentation points out that their products are still built by separate groups and may need their own vetting. Being known to IA reduces risk. It does not transfer support responsibility.

## Installing a module

A module is a file with the extension \`.modl\`. On the gateway you install it from the Config section's module page. Installation needs a **module signature** and a **trusted certificate chain**, so Ignition can tell the file is authentic and unaltered. Unsigned or self-signed modules need an explicit step to accept the risk, and many policies forbid that on production gateways.

Things to check before you install:

1. **Version fit.** A module is built against a specific Ignition SDK version. An 8.1 module will not load on 8.3. The Java version the platform requires has also changed between major releases (check the upgrade guide for yours), which broke some third-party modules until they were rebuilt. See {{lesson:ign-versioning}}.
2. **Trial mode.** Many commercial modules run in a time-limited demo so you can test before buying. Do that on a dev gateway, not production.
3. **Licensing.** Some modules attach to the gateway's license, some use their own key. A gateway rebuild or a new container can invalidate a key, so record how to reactivate it.
4. **Redundancy and upgrade behavior.** Find out whether it works on a redundant pair and what happens on an Ignition upgrade.

## Evaluating support and longevity

This is the main skill in this lesson. A module is a dependency of your customer's plant for ten years or more. Ask these questions.

- **Who is behind it?** A company with staff, a support line and other customers, or one person? Both can be fine. One person means you need an exit plan.
- **How fast does it follow Ignition releases?** Look at its release history around the 8.1 to 8.3 move. If it took a year to arrive, expect that again.
- **Is the forum thread alive?** Do users get answers? Are bugs fixed?
- **Does it hold your data hostage?** Does it store data in open tables you can query, or in a private format? Can you take your configuration with you?
- **What is the exit plan?** Could you replace it with plain Ignition features, a different module or a script in a reasonable time? For example, an SNMP module has alternatives; a deeply embedded MES suite does not.
- **Is the source available or in escrow?** Sometimes a vendor will agree to it for a large project.
- **Cost model.** Per-gateway license, subscription or per-seat? Check what happens to price at renewal.

> [!example] A quick scorecard
> Rate each of the seven questions 0 to 2. A score under 8 out of 14 for a module that sits on the critical path is, by this lesson's own rule of thumb (not a standard), a reason to choose a different design, or to sign a support agreement with the vendor before you build on it. A cosmetic module, such as a chart type you could swap, can tolerate a lower score.

## Building your own: the Ignition SDK

The **Ignition SDK** lets Java and Kotlin developers write modules. A module can add a new scripting function, an OPC UA driver, a Perspective component, a gateway service or a Designer tool. The SDK documentation and example modules are public, and the forum has a category for module developers.

Custom modules are justified when you must talk to hardware or software that no existing driver supports, or when a component is needed in many projects. They are rarely justified for something a script, a WebDev endpoint ({{lesson:arch-webdev}}) or a Perspective custom component can do. A custom module is code you must maintain through every Ignition major release, and it needs a signing certificate. Most integrators never write one. They still need to know the option exists so they can price it honestly.

## Practical guidance

- Prefer built-in features and Inductive Automation modules when they meet the need.
- Pin the module version in your deployment notes, next to the Ignition version.
- Keep a copy of the \`.modl\` file with the project. The vendor's download page may not exist in five years.
- For shared Exchange resources, read the code, test on a copy, and own it after import.
- Write module choices into the design document ({{lesson:int-fds}}) so the customer knows what they are depending on.
`,

  eli5: `
Think of Ignition like a big phone that comes with some built-in apps. The phone company made those apps and will fix them if they break.

There is also an app store. Other companies sell apps there. The store checks that each app has a proper maker's stamp on it, but it does not promise that every app is good or that the maker will still be around next year.

Next to the store is a community table where neighbors leave things they made, such as a nice screen layout or a handy tool. Often they are free. You can take one, but if it has a problem, you are the one who fixes it.

Before you rely on an app for something important, you ask: who makes it, do they answer questions, will it still work when the phone gets a big update, and if it vanished tomorrow could I do the job another way?
`,

  why: `
**Why use third-party modules at all?** Because the alternative is writing and maintaining it yourself. A Sepasoft OEE module or Cirrus Link's MQTT stack represents years of work. Buying that is nearly always cheaper than scripting a lookalike. The risk is real but manageable if you choose deliberately.

**Why evaluate longevity so carefully?** Plants run systems for a decade. Ignition does major releases that change platform pieces, such as the Java version, so modules need active maintenance. A module that lags a major release can leave a customer stuck on an old Ignition version, and a stuck module holds the whole gateway back, including security patches.

**Why do some integrators avoid third-party modules entirely?** They want a single vendor to call. When a problem appears at the boundary between a module and the platform, each side can blame the other. Others accept that risk for functions IA does not offer. The pragmatic middle is to use well-known vendors for the big capabilities and avoid obscure modules for minor conveniences.

**Why the Exchange needs caution.** Exchange resources are shared in good faith and not formally supported. Importing a script or view that calls out to the network or writes to the database without reading it is the same mistake as running an unknown executable on a control system.

**Why know about the SDK even if you never use it?** Because it changes the conversation with a customer who says "Ignition can't do X." Often it can, with a script, an existing module, or a modest custom module. Knowing the options lets you give a priced answer instead of a no.
`,

  history: `
Ignition has been modular since its early releases, with the SDK public so outside developers could add to it. Over time a recognizable group of vendors formed around the platform. Inductive Automation later added the Module Showcase as a central place to find paid third-party modules and recognized certain companies as Strategic Partners or Premier Technology Providers. The Exchange grew from the community habit of sharing projects and components.
`,

  examples: [
    {
      title: "Choosing between a module and a script",
      body: `A customer wants SNMP data from 30 managed switches in their Ignition screens. A script that polls with a Java library is possible, but alarm handling, tag browsing and diagnostics would be your own code. A module that exposes the switches as OPC tags gives all of that. You run the scorecard: the vendor is a known integrator, it follows Ignition releases, and the exit plan is a script. Score 11 out of 14, so you use the module and keep the \`.modl\` file with the project.`
    },
    {
      title: "An upgrade blocked by a module",
      body: `A plant on 8.1 wants to move to 8.3. The audit lists 12 modules. Eleven have 8.3 builds. One niche label-printing module has no release, and its vendor does not answer on the forum. The team has three options: leave that function on a small 8.1 gateway for now, replace it with a script that sends ZPL to the printer, or pay the vendor for a rebuild. Without the audit, they would have found out mid-upgrade.`
    }
  ],

  diagrams: {
    layers: `<svg viewBox="0 0 640 220" role="img" aria-label="Layers of the Ignition ecosystem: platform core, Inductive Automation modules, third-party modules from the Module Showcase, and community Exchange resources, with risk increasing outward">
  <rect class="dg-box" x="20" y="14" width="600" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="42">Ignition platform core and SDK</text>
  <rect class="dg-box-accent" x="20" y="68" width="600" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="96">Inductive Automation modules: Perspective, Web Dev, Event Streams, SQL Bridge</text>
  <rect class="dg-box" x="20" y="122" width="600" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="150">Module Showcase: Cirrus Link, Sepasoft, Embr and others</text>
  <rect class="dg-box" x="20" y="176" width="600" height="38" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="200">Exchange: shared views, scripts, templates</text>
</svg>`
  },

  pitfalls: [
    "Designing the critical path around a module without checking how quickly the vendor follows Ignition releases.",
    "Installing an unsigned or self-signed module on a production gateway.",
    "Importing an Exchange resource without reading its scripts.",
    "Losing the .modl file and the license key, then being unable to rebuild the gateway.",
    "Assuming that a partner of Inductive Automation means Inductive Automation supports the module.",
    "Writing a custom module for something a script or WebDev endpoint could do."
  ],

  keyTerms: ["ignition-exchange", "module-showcase", "ignition-sdk", "signed-module", "mqtt", "mes", "cirrus-link"],

  quiz: [
    {
      q: "What best describes the Ignition Exchange?",
      options: ["The official store where Inductive Automation sells its own modules", "A certification body for third-party vendors", "The module signing authority", "A community library of shared projects, views, scripts and some modules, with light vetting"],
      answer: 3,
      explain: [
        "IA's own modules are licensed through Inductive Automation, not the Exchange.",
        "Certification of vendors is not what the Exchange does.",
        "Signing certificates are requested from Inductive Automation, a separate process.",
        "Correct. It is community-shared material that you should review and then own."
      ]
    },
    {
      q: "A module vendor was a long-time partner of Inductive Automation. A bug appears at the module and platform boundary. Who supports the module?",
      options: ["Inductive Automation, because they partner with the vendor", "Nobody; partner modules are unsupported", "The vendor, because the module is their product", "The integrator who installed it, always"],
      answer: 2,
      explain: [
        "Partner status signals trust but does not move support responsibility.",
        "Commercial modules normally come with vendor support.",
        "Correct. The vendor builds and supports it, though you may need to coordinate both sides.",
        "You are the first contact, but the vendor still owns fixing their module."
      ]
    },
    {
      q: "You are upgrading from 8.1 to 8.3 and one third-party module has no 8.3 build. What is the sensible first step?",
      options: ["Ask the vendor for a timeline and plan alternatives such as keeping that function elsewhere or replacing it", "Install the 8.1 module on 8.3 and hope it loads", "Skip the upgrade permanently", "Disable signature checks"],
      answer: 0,
      explain: [
        "Correct. Find out the vendor's plan and prepare a workaround before the upgrade date.",
        "Modules are built against a specific SDK and Java version, so an 8.1 module will not simply load on 8.3.",
        "Staying on old versions leaves you without patches and is rarely the right permanent answer.",
        "Disabling signature checks adds risk and does not make the module compatible."
      ]
    },
    {
      q: "Which situation most justifies writing a custom module with the SDK?",
      options: ["Showing a table of tag values", "Supporting a proprietary device protocol with no existing driver, needed across many projects", "Emailing an alarm", "Adding a button that writes a tag"],
      answer: 1,
      explain: [
        "Standard components and scripts already cover that.",
        "Correct. New drivers and widely reused components are the strongest cases, and they justify the maintenance cost.",
        "Alarm notification already exists as a module.",
        "That is a trivial script or binding."
      ]
    },
    {
      q: "Which finding is the biggest red flag when vetting a niche module for a critical function?",
      options: ["It has a free trial", "It is listed in the Module Showcase", "It requires a license key", "A single developer, no activity in the forum thread for a year and a private data format"],
      answer: 3,
      explain: [
        "Trials are helpful and normal.",
        "The Showcase listing is normal, though it is only light vetting.",
        "License keys are normal for commercial software.",
        "Correct. Weak continuity, low responsiveness and lock-in combine into a high longevity risk with no exit."
      ]
    }
  ],

  resources: [
    { title: "Ignition Modules (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules", type: "docs", source: "Inductive Automation" },
    { title: "Modules Overview (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/getting-started/modules-overview", type: "docs", source: "Inductive Automation" },
    { title: "Installing or Upgrading a Module", url: "https://www.docs.inductiveautomation.com/docs/8.1/getting-started/installing-and-upgrading/installing-or-upgrading-a-module", type: "docs", source: "Inductive Automation" },
    { title: "Ignition modules overview", url: "https://inductiveautomation.com/ignition/modules", type: "article", source: "Inductive Automation" },
    { title: "3rd Party Modules category", url: "https://forum.inductiveautomation.com/c/3rd-party-modules/8", type: "forum", source: "Inductive Automation Forum" },
    { title: "Free Ignition Modules and Resources wiki", url: "https://forum.inductiveautomation.com/t/free-ignition-modules-and-resources-wiki-links-and-details/111081", type: "forum", source: "Inductive Automation Forum" }
  ]
});
