LC.lesson({
  id: "ign-licensing",
  title: "Licensing, editions and sizing",
  track: "ign",
  minutes: 20,
  level: 3,
  prereqs: ["ign-architecture"],
  tags: ["licensing", "editions", "sizing", "maker", "edge", "cloud", "scale-out"],
  summary: "Ignition is licensed by Gateway and module, not by tag or client count, so the real limit is your hardware. Learn the editions, how activation works and how to size a Gateway.",
  objectives: [
    "Explain Ignition's per-Gateway, per-module licensing model and what it does not limit",
    "Choose between Standard, Edge, Cloud Edition and Maker Edition for a scenario",
    "Describe trial mode, activation, leased licenses and what happens when a license check fails",
    "List the load drivers that size a Gateway: tags, value changes, history writes, sessions and scripts",
    "Decide when to scale out instead of buying a bigger server"
  ],

  body: `
## What you are actually buying

An Ignition license is tied to one Gateway and to the {{term:ign-module|modules}} installed on it. Inductive Automation's own sizing guide states that Ignition's licensing is unlimited, and that the thing that limits you is the size of your hardware. That is the model behind {{term:ign-unlimited-licensing|unlimited licensing}}: no per-tag, per-client or per-screen fee on the standard platform. As an integrator you stop asking "how many tags can we license?" and start asking "how big a server does this design need?"

Two cautions keep that sentence honest.

- Some products do carry hard caps. The Edge Panel product, for example, allows two concurrent Perspective sessions or Vision clients. Maker Edition has caps too (see below).
- Older or special license types may have client limits. Forum users report Perspective licenses with a session count. Confirm what your contract says before you promise a client unlimited anything.

> [!warning] Never quote prices
> Pricing, module bundles and discounts change and differ by region and reseller. This lesson deliberately has no numbers in dollars. For a quote, talk to Inductive Automation or your sales contact, and put the module list (not a price) in your design document.

## Modules and what they gate

The platform includes the Gateway, the OPC UA server, tags, the historian and alarming. Visualization is separate: the Perspective module and the {{term:vision-module|Vision module}} are licensed independently, so a Gateway can run one, the other or both. Further modules (Reporting, SFC, drivers for other PLC families, third-party modules) are added the same way. A third-party module is licensed by its vendor, not by Inductive Automation.

The practical rule: list every module in the design up front, because adding one later means a reactivation of the license on the Gateway.

## Editions

| Edition | Where it runs | Notes from the manual |
|---|---|---|
| Standard (Ignition) | On-premise or your own VM | The full platform. Capacity set by hardware. |
| {{term:ignition-edge|Edge}} | Small hardware at the machine or site edge | Cut-down feature set. Edge Panel is limited to two sessions or clients. Event Streams are not supported on Edge. |
| {{term:cloud-edition|Cloud Edition}} | Cloud marketplace images | Bought through the cloud marketplace. The paid image comes pre-licensed, so no key is applied. Usage-based billing on the container version ties charges to CPU cores and heap memory. Inductive Automation modules not included in the edition cannot be licensed on it. |
| {{term:ign-maker-edition|Maker Edition}} | Your own PC | Free, for non-commercial personal and educational use only. Documented caps include 10 Perspective sessions, 10,000 tags and Independent redundancy only. |

Maker Edition is what you use for every build lab in this Learning Center. It is not for a customer's plant, even a small one. Using it commercially breaks its terms.

## Trial mode, activation and transfer

Out of the box, a Gateway has no license and runs in trial mode. The {{term:ign-trial-timer|trial timer}} gives full functionality for two hours at a time. When it expires, modules stop and you press **Reset Trial** on the Gateway's Licensing page. Resets are unlimited, which is why trial mode is fine for a lab and useless for production.

Licensing a Gateway takes these steps:

1. Get the license key (eight characters for current leased keys) and, where required, an activation token from your Inductive Automation account.
2. Activate. {{term:ign-license-activation|Online activation}} is done from the Gateway's Licensing page. For a Gateway that cannot reach the internet, use offline activation: generate an activation request file, process it through your account on another machine and upload the resulting license file.
3. Check the Licensing page to confirm every module you expect shows as licensed.

Current 8.3 documentation describes {{term:ign-leased-license|leased licensing}}: the Gateway checks in with the activation service on a schedule (hourly), and if check-ins fail for longer than the documented timeout, the Gateway reverts to trial mode. The timeout changed during 2026, so read the Leased Licensing page for the exact figure on your version. Maker Edition uses the same activation-token mechanism.

> [!tip] Plan for the license check
> A production Gateway that loses its route to the activation service will, after the timeout, drop into trial mode and stop its modules every two hours. Put the activation service hostnames on the firewall allow list for the Gateway, or use offline activation where policy forbids outbound traffic. Add "license status" to your monitoring list.

Transfer is done by deactivating or reactivating through your account when you replace hardware. The mechanics are account-based, so do it while the old server still exists if you can. If the old server is dead, contact Inductive Automation support.

> [!note] In 8.1
> The 8.1 docs call out the same trial period and license activation page. Leased-license details are 8.3 documentation, so verify the model for the version you actually run.

## Sizing a Gateway

Because licenses do not cap load, you size from the work the Gateway does. Walk through these five drivers.

| Driver | Why it matters |
|---|---|
| **Tag count** | Memory for tag configuration and subscriptions. Expression tags and per-tag scripts push memory use up. |
| **{{term:tag-change-rate|Tag change rate}}** | The IA guide calls value changes the most important number. Each change can trigger alarms, history, bindings and scripts. A {{term:deadband|deadband}} on analog tags cuts noise. |
| **Historian writes per second** | Database throughput. The database should run on a separate server from the Gateway in production. |
| **Sessions and clients** | Each {{term:perspective-session|Perspective session}} is server-side work. Forum answers say Perspective loads a Gateway more heavily than Vision, so give it more CPU and RAM. Treat that as experience, not a rule. |
| **Scripts and events** | Gateway scripts, timers and named queries compete for the same threads. |

Inductive Automation's Server Sizing and Architecture Guide gives tiers for a standard single Gateway. As summarized from the guide, small is around 2,500 to 5,000 tags with 5 to 10 clients on 2 cores, medium is 10,000 to 50,000 tags with 20 to 50 clients on 4 cores, and large is 75,000 to 150,000 tags with 50 to 100 clients on 8 to 16 cores. The guide is revised between versions, so use the current copy (linked below) and treat these numbers as a starting point, not a promise.

> [!example] Meridian Plant 1 back-of-envelope
> Assume (these are illustrative assumptions) 20,000 tags on the Plant 1 master Gateway at \`10.20.30.10\`, a typical 10 percent of them changing in any given second, and 25 operators. That is about 2,000 value changes per second to push through alarming, history and bindings, with 25 Perspective sessions on top. On the guide's tiers this lands in the medium class. The SQL server at \`10.20.30.20\` is a separate machine sized for history writes. Measure it after commissioning: watch CPU, memory and the Gateway's status pages under real load and adjust.

## When to scale out

Add hardware before you add complexity. When one Gateway is near its limits, or when sessions and device polling interfere with each other, use IA's scale-out pattern: a **back-end Gateway** talks to PLCs and runs tags, and one or more **front-end Gateways** serve clients, connected over the {{term:gateway-network|Gateway Network}} with remote tag providers. See {{lesson:arch-patterns}} and {{term:scale-out-architecture|scale-out architecture}}. The guide also recommends non-default tag provider names in that design, so paths stay unambiguous.

{{diagram:sizing}}

Scale out for isolation reasons too: a plant that cannot afford a visualization load spike to touch device polling should split the roles even if the CPU graph looks fine.
`,

  eli5: `
Think of a restaurant that rents a kitchen. Some landlords charge you for every plate you serve. Ignition's landlord does not. You rent the kitchen once for each building you cook in, and you pay for extra appliances (the modules) like a pizza oven or a dishwasher. After that, you can cook as many plates as you want.

The catch is the kitchen itself. Cook too many plates at once and the stove cannot keep up. That is sizing: guessing how big a stove you need by counting how many dishes, how often the orders change, how many waiters ask questions and how much paperwork you file.

The free practice kitchen (Maker) has a sign on the door: home cooking only, no selling. The small kitchen for one machine (Edge) has limits on how many guests can sit. The rented kitchen in a cloud building (Cloud Edition) comes already licensed, and you pay by how big the stove is.

If the license check-in stops working, the landlord puts a timer on the door that closes the kitchen every two hours until the check-in works again.
`,

  why: `
**Why license by Gateway and module?** The model removes the arguments that wreck budgets on tag-priced systems. Nobody trims the tag list to save license cost, so historians and alarms hold the data operators need. The tradeoff is that nobody is forced to count either, so a careless design can end up with 200,000 tags that mostly never change. Hardware sizing becomes the discipline that tag-priced systems get for free from their invoices.

**Why does value change rate beat tag count?** A tag that never changes costs memory and little else. A tag that flickers costs CPU in every subsystem that listens to it. IA's guide puts value changes first for that reason. Deadbands, report-by-exception on the device side and sensible scan classes are cheaper than any server upgrade.

**Why keep the database off the Gateway?** Historian writes and Gateway work fight for disk and CPU, and a database restart should not take your SCADA down. Forum guidance and the IA guide both separate them in production.

**Why do experienced integrators argue about scale-out?** One camp starts with a single big Gateway because it is simple to back up, patch and debug. The other camp splits front end and back end from day one so Perspective load can never starve device polling. The honest answer depends on the number of sessions, the risk of the process and the team that will run it. Whichever you choose, write down the trigger (for example, "if sessions pass N or CPU stays above X for an hour, we split") so the decision is not made during an outage.

**Why plan for license loss?** Trial mode after a failed check-in is a silent failure with a two-hour fuse. The people who remember to monitor it are the people who have been woken up by it.
`,

  history: `
Ignition 8 licenses are activated against an online service, and the 8.3 documentation describes leased licensing with regular check-ins; the timeout figure was revised during 2026, so always read the current page. Cloud Edition is sold through cloud marketplaces, and a container version on AWS Marketplace is documented as added in 8.3.5. Maker Edition gives learners a free, capped license so that the two-hour trial timer is not the only way to practice at home.
`,

  examples: [
    {
      title: "Choosing an edition for three jobs",
      body: `**A packaging machine with its own touch panel and a single OEM Gateway** fits Edge Panel (two sessions). **Meridian Plant 1's master Gateway** is Standard with Perspective, Reporting and the modules in the design document. **A student building the Plant 1 lab at home** uses Maker Edition and stays inside its non-commercial terms.`
    },
    {
      title: "Diagnosing a Gateway that stops every two hours",
      body: `Operators report that all Perspective sessions drop and the Gateway shows a trial banner, but the plant has run for months. Open the Licensing page, confirm the status and look for failed check-ins. A recent firewall change blocking the activation service is the usual cause. Fix the rule, reactivate, then add license status to the monitoring dashboard.`
    }
  ],

  diagrams: {
    sizing: `<svg viewBox="0 0 640 260" role="img" aria-label="Five load drivers feed one Gateway: tags, value changes, history writes, sessions and scripts; at the limit, a back-end Gateway handles devices and front-end Gateways handle sessions">
  <defs><marker id="ign-licensing-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <text class="dg-title" x="20" y="24">Single Gateway: load drivers</text>
  <rect class="dg-box" x="20" y="36" width="130" height="30" rx="4"/>
  <text class="dg-text-sm" x="30" y="56">Tag count</text>
  <rect class="dg-box" x="20" y="72" width="130" height="30" rx="4"/>
  <text class="dg-text-sm" x="30" y="92">Value changes/s</text>
  <rect class="dg-box" x="20" y="108" width="130" height="30" rx="4"/>
  <text class="dg-text-sm" x="30" y="128">History writes/s</text>
  <rect class="dg-box" x="20" y="144" width="130" height="30" rx="4"/>
  <text class="dg-text-sm" x="30" y="164">Sessions</text>
  <rect class="dg-box" x="20" y="180" width="130" height="30" rx="4"/>
  <text class="dg-text-sm" x="30" y="200">Scripts, events</text>
  <rect class="dg-box-accent" x="210" y="70" width="130" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="275" y="104">Gateway</text>
  <text class="dg-text-muted dg-mid" x="275" y="124">CPU, RAM, disk</text>
  <line class="dg-line" x1="150" y1="51" x2="208" y2="95" marker-end="url(#ign-licensing-ah)"/>
  <line class="dg-line" x1="150" y1="87" x2="208" y2="105" marker-end="url(#ign-licensing-ah)"/>
  <line class="dg-line" x1="150" y1="123" x2="208" y2="115" marker-end="url(#ign-licensing-ah)"/>
  <line class="dg-line" x1="150" y1="159" x2="208" y2="125" marker-end="url(#ign-licensing-ah)"/>
  <line class="dg-line" x1="150" y1="195" x2="208" y2="135" marker-end="url(#ign-licensing-ah)"/>
  <text class="dg-title" x="390" y="24">At the limit: scale out</text>
  <rect class="dg-box-accent" x="390" y="40" width="230" height="52" rx="6"/>
  <text class="dg-text-sm" x="402" y="62">Back-end Gateway</text>
  <text class="dg-text-muted" x="402" y="80">PLC drivers, tags, history</text>
  <rect class="dg-box" x="390" y="150" width="105" height="52" rx="6"/>
  <text class="dg-text-sm" x="400" y="172">Front-end A</text>
  <text class="dg-text-muted" x="400" y="190">sessions</text>
  <rect class="dg-box" x="515" y="150" width="105" height="52" rx="6"/>
  <text class="dg-text-sm" x="525" y="172">Front-end B</text>
  <text class="dg-text-muted" x="525" y="190">sessions</text>
  <line class="dg-line" x1="442" y1="150" x2="480" y2="94" marker-end="url(#ign-licensing-ah)"/>
  <line class="dg-line" x1="567" y1="150" x2="530" y2="94" marker-end="url(#ign-licensing-ah)"/>
  <text class="dg-text-muted" x="390" y="232">Linked by the Gateway Network</text>
</svg>`
  },

  pitfalls: [
    "Promising a client 'unlimited' everything without checking their contract and the product (Edge Panel and Maker have documented caps).",
    "Using Maker Edition on a customer's production system. It is licensed for non-commercial, personal and educational use only.",
    "Blocking the activation service at the firewall, so the Gateway falls back to trial mode and stops its modules every two hours.",
    "Sizing by tag count alone and ignoring value change rate, sessions and scripts.",
    "Running the historian database on the Gateway server in production.",
    "Quoting prices in a design document. Check with Inductive Automation or sales instead."
  ],

  keyTerms: ["ign-unlimited-licensing", "ign-module", "ign-trial-timer", "ign-maker-edition", "cloud-edition", "ignition-edge", "ign-leased-license", "ign-license-activation", "gateway-sizing", "tag-change-rate", "scale-out-architecture"],

  quiz: [
    {
      q: "A customer asks how many tags their Ignition license allows. What is the most accurate answer for the standard platform?",
      options: ["Their license sets a hard tag count", "The standard license does not cap tags; the Gateway hardware and design are the limit", "It depends on how many clients log in", "Tags are limited to 10,000 on every edition"],
      answer: 1,
      explain: [
        "Inductive Automation's sizing guide describes licensing as unlimited with hardware as the limit.",
        "Correct. Confirm contract details, but the platform model is hardware-bound.",
        "Client count affects load, not the tag limit on the standard platform.",
        "10,000 tags is a documented Maker Edition cap, not a rule for every edition."
      ]
    },
    {
      q: "A Gateway that has run for months suddenly shows a trial banner and stops every two hours. What is the first thing to check?",
      options: ["Whether Perspective sessions exceed a cap", "Whether the Gateway can still reach the activation service", "Whether the tag count grew", "Whether the historian is full"],
      answer: 1,
      explain: [
        "Session count does not move a licensed Gateway into trial mode.",
        "Correct. Failed license check-ins past the timeout revert the Gateway to trial mode. Look at the Licensing page and recent firewall changes.",
        "Tag growth is not a licensing event on the standard platform.",
        "A full historian causes storage problems, not a trial banner."
      ]
    },
    {
      q: "Which load driver does Inductive Automation's guide treat as the most important when sizing tags?",
      options: ["Tag count", "Value changes", "Number of modules", "Number of device connections"],
      answer: 1,
      explain: [
        "Tag count matters for memory, but idle tags are cheap.",
        "Correct. Each value change can trigger alarms, history, bindings and scripts.",
        "Module count affects the license, not the load measure the guide emphasizes.",
        "Device count is relevant to polling, but the guide singles out value changes."
      ]
    },
    {
      q: "A hobbyist wants to run a small paid job for a neighbor on Maker Edition. What is the right call?",
      options: ["Fine, it is free", "Not allowed; Maker Edition is for non-commercial personal and educational use", "Fine if under 10 sessions", "Fine if the Gateway is offline"],
      answer: 1,
      explain: [
        "Free does not mean unrestricted.",
        "Correct. Paid work needs a commercial license. Ask Inductive Automation or sales.",
        "The session cap is a technical limit, not a permission to use it commercially.",
        "Being offline has no bearing on license terms."
      ]
    },
    {
      q: "Perspective sessions on the Plant 1 master Gateway are starving device polling during shift change. Which change best isolates the problem?",
      options: ["Raise the trial timer", "Move to a scale-out design with a back-end Gateway for devices and front-end Gateways for sessions", "Add more tags", "Switch to Maker Edition"],
      answer: 1,
      explain: [
        "The trial timer is unrelated to load.",
        "Correct. IA's scale-out pattern separates device communication from client serving, linked by the Gateway Network.",
        "More tags add load.",
        "Maker Edition has caps and is non-commercial."
      ]
    }
  ],

  resources: [
    { title: "Ignition Server Sizing & SCADA Architecture Guide", url: "https://inductiveautomation.com/resources/article/ignition-server-sizing-and-architecture-guide", type: "article", source: "Inductive Automation" },
    { title: "Ignition Maker Edition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/other-editions/ignition-maker-edition", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Cloud Edition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/other-editions/ignition-cloud-edition", type: "docs", source: "Inductive Automation" },
    { title: "Leased Licensing (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/licensing-and-activation/leased-licensing", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Edge (8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/other-editions/ignition-edge", type: "docs", source: "Inductive Automation" },
    { title: "About the Trial Period", url: "https://inductiveuniversity.com/videos/about-the-trial-period/8.3", type: "video", source: "Inductive University" },
    { title: "Online Activations", url: "https://inductiveuniversity.com/videos/online-activations/8.3", type: "video", source: "Inductive University" },
    { title: "Offline Activations", url: "https://inductiveuniversity.com/videos/offline-activations/8.3", type: "video", source: "Inductive University" }
  ]
});
