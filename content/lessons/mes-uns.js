LC.lesson({
  id: "mes-uns",
  title: "The Unified Namespace",
  track: "mes",
  minutes: 25,
  level: 4,
  prereqs: ["proto-sparkplug", "mes-what"],
  tags: ["uns", "mqtt", "sparkplug", "isa-95", "architecture", "iiot"],
  summary: "One shared, event-driven data space organized like the business, with an MQTT broker in the middle. Useful idea, easy to oversell.",
  objectives: [
    "Define a Unified Namespace and the architecture problem it targets",
    "Explain why it is event-driven, edge-driven and report-by-exception",
    "Design a topic hierarchy using enterprise, site, area, line and cell",
    "Compare Sparkplug B with plain JSON topics for a UNS",
    "State the main criticisms and where Ignition sits in a UNS"
  ],

  body: `
## The problem it targets

In a traditional plant, systems connect point to point. The historian polls the PLCs, the MES polls the historian and the PLCs, the ERP interface reads the MES database, the quality system reads another database. Ten systems can need up to 45 connections, and each one is custom. Change a tag name and three integrations break. This is the "spaghetti" diagram, and it's the thing a {{term:uns|Unified Namespace}} (UNS) is meant to replace.

A UNS is an architecture pattern. Every system publishes its data to one shared place, organized by a common structure, and every system that needs data subscribes to that place. It is not a product you install. The term was popularized by Walker Reynolds and the 4.0 Solutions community, and was picked up by Inductive Automation, HiveMQ, Cirrus Link and many others.

## The core ideas

| Idea | Meaning |
|---|---|
| Single source of truth | The current state of the business lives at one logical address per thing, not copied in ten places |
| Event-driven | Systems publish when something happens, and consumers react. Nobody polls on a timer |
| Edge-driven | Data enters the namespace at the source, from the PLC or machine, with context added early |
| Report by exception | Only changes are published ({{term:report-by-exception|report by exception}}), which saves bandwidth |
| Hierarchical | The structure follows the business: enterprise, site, area, line, cell |
| Decoupled | Publishers don't know who consumes. Adding a consumer needs no change to the producer |

The reference structure borrows from {{term:isa-95|ISA-95}} equipment hierarchy. Reynolds' common suggestion is to start with the ISA-95 levels and then adapt them to the business, not to treat them as sacred.

## The broker in the middle

The usual implementation uses an {{term:mqtt-broker|MQTT broker}} as the hub. Clients connect to the broker, publish to {{term:mqtt-topic|topics}}, and subscribe with filters. The broker routes messages and holds the last value of a topic when messages are marked {{term:retained-message|retained}}, so a new subscriber gets current state immediately.

{{diagram:uns}}

Why MQTT? It's lightweight, works over a single outbound connection from the plant (friendly to firewalls and the {{term:dmz|DMZ}}), has publish/subscribe semantics, quality-of-service levels, and a Last Will message for detecting dead clients. See {{lesson:proto-mqtt}} for the protocol.

Other technologies can play the broker role. Kafka, a message bus or a data platform can hold part of the pattern. MQTT is common because of its edge fit, not because the idea requires it.

## Topic design

A topic is a path. A readable UNS topic might look like:

\`\`\`text
acme/dallas/packaging/line2/filler/temperature
acme/dallas/packaging/line2/filler/state
acme/dallas/packaging/line2/oee
acme/dallas/packaging/line2/workorder/current
acme/houston/blending/tank4/level
\`\`\`

Levels: enterprise (\`acme\`), site (\`dallas\`), area (\`packaging\`), line (\`line2\`), cell or asset (\`filler\`), then a measurement or object name.

Some practical rules:

- **Keep the hierarchy stable.** Names are keys that many consumers depend on. Renaming \`line2\` is a breaking change.
- **Use consistent case and characters.** No spaces. Pick lowercase or camelCase and enforce it.
- **Don't put values in topics.** \`filler/temp/72.4\` is wrong. The value belongs in the payload.
- **Decide how deep to go.** One topic per tag gives fine-grained subscriptions. One topic per asset with a JSON payload of many fields gives fewer, richer messages.
- **Separate raw from contextualized data.** Many designs keep a raw layer near the edge and a cleaned, modeled layer in the UNS.

A payload for the filler might be:

\`\`\`json
{
  "timestamp": "2026-10-17T14:03:22.418Z",
  "value": 72.4,
  "unit": "degC",
  "quality": "good"
}
\`\`\`

The payload structure matters as much as the topic. If every publisher chooses its own, you have the same spaghetti with a nicer address.

## Sparkplug B or plain JSON?

This is the live argument in the community.

| | {{term:sparkplug|Sparkplug B}} | Plain MQTT with JSON |
|---|---|---|
| Topic structure | Fixed: \`spBv1.0/group/message_type/edge_node/device\` | You design it |
| Payload | Protobuf with metrics, types, timestamps | Whatever you define (often JSON) |
| Discovery | Birth/death messages announce what exists and its state | None built in; you build conventions |
| State awareness | Defined: edge nodes and devices report online/offline | Last Will plus your own convention |
| Bandwidth | Compact binary, report by exception | Larger, depends on your design |
| Interoperability | Tools that speak Sparkplug work together | Only as good as your documentation |
| Hierarchy fit | Group / edge node / device is shallow and not ISA-95 shaped | Any depth you want |

The case for Sparkplug is plug-and-play discovery and a well-defined state model, with products like Cirrus Link's MQTT modules for Ignition built around it. The case against, argued for example by HiveMQ, is that its rigid topic structure limits semantic design for an enterprise-wide namespace, and that a more flexible approach scales better. Cirrus Link has offered options to present Sparkplug data in a UNS-style hierarchy in MQTT Engine.

A common compromise: Sparkplug between edge and a site-level broker, then a modeled, hierarchical (often JSON) UNS above it. Neither camp is obviously wrong. Choose based on your edge devices, your tools and who will consume the data.

## Where Ignition fits

Ignition is usually a **node** in the UNS, not the UNS itself. In an Inductive Automation webinar the point was made that the namespace is the sum of the contributors and the MQTT server, so the broker holds it.

A typical Ignition-based arrangement:

- **Edge gateways** (or {{term:ignition-edge|Ignition Edge}}) connect to PLCs over OPC UA or native drivers and publish with {{term:mqtt-transmission|MQTT Transmission}}.
- **A broker** such as {{term:chariot-broker|Chariot}}, or a third-party broker, receives and distributes.
- **A central gateway** runs {{term:mqtt-engine|MQTT Engine}} to subscribe and create tags, then provides {{term:historian|historian}}, Perspective and alarming.
- **UDTs** model assets, and the same structure can be reflected in topics.
- **Sepasoft MES, ERP interfaces and cloud analytics** publish to or consume from the same namespace.

> [!example] A line OEE value in the UNS
> The packaging line's MES computes OEE every minute. It publishes \`acme/dallas/packaging/line2/oee\` as a retained message with value 0.742 and a timestamp. A maintenance dashboard, an executive screen and a cloud analytics service all subscribe to that topic. None of them query the MES database, and the MES doesn't know how many consume.

## Criticisms worth knowing

A balanced view includes the objections:

- **A broker is not a database.** It holds the latest retained value per topic, and some brokers retain a little more, but it doesn't give you history, queries or joins. You still need a historian and relational stores. "The UNS" does not replace them.
- **Governance is the hard part.** Someone has to own the hierarchy, naming, payload rules and change process. Without that, the namespace becomes a dump of whatever each team published.
- **Semantics don't come free.** An MQTT topic has no meaning by itself. Units, definitions, state codes and relationships need a {{term:semantic-model|semantic model}}, and tooling for that is immature compared with the transport.
- **Not everything is an event.** Batch loads, large files and heavy analytics may fit better elsewhere.
- **Security.** A central broker is a high-value target. Authentication, topic-level authorization and TLS matter. See {{lesson:net-security}}.
- **Hype.** The UNS is sometimes sold as a cure for any data problem. Many plants have no ability to publish clean data at the edge yet. If tag naming is chaos today, a UNS will show the chaos faster.

None of this means the idea is wrong. It means a UNS is a discipline plus a broker, and the discipline is most of the work. See {{term:data-governance|data governance}}.
`,

  eli5: `
Imagine a big school with lots of offices: the nurse, the bus company, the cafeteria, the principal and the teachers. Today, whenever one office needs a fact from another, someone walks down the hall and asks. Every office has worn a path to every other office, and when someone moves rooms, everybody gets lost.

Now put up a huge bulletin board in the main hall. Whenever something changes, the person who knows about it pins up a note in the right section: "Bus 12 is late," "Lunch is pizza," "Room 4 is closed." Anyone who cares about buses just looks at the bus section. The bus driver doesn't need to know who is reading.

The board has sections arranged like the school: building, floor, room. Each section has the newest note on top. That's a Unified Namespace.

But a bulletin board isn't a filing cabinet. It shows what's true now, not everything that ever happened. And if everyone invents their own way of writing notes, it becomes a mess, so someone has to set the rules for the board.
`,

  why: `
**Why event-driven rather than polling?** Polling asks "anything new?" thousands of times for nothing. Publishing on change means the cost scales with how often things actually happen. It also means a new consumer can join without the producer doing any work.

**Why a hierarchy that matches the business?** People navigate by place. A maintenance planner thinks "Dallas, packaging, line 2." If topics follow that shape, subscriptions like \`acme/dallas/packaging/#\` make natural sense. The hierarchy also gives a place to hang models of assets, which is the semantic work you'd need anyway.

**Why do skeptics push back?** They have seen "single source of truth" projects before, such as data warehouses and master data programs, and most struggled with ownership and data quality, not transport. A broker doesn't fix either. The critics are right that a UNS without governance is just a faster way to spread bad data.

**Why does the Sparkplug debate matter?** It is really an argument about where meaning lives: in the protocol (Sparkplug defines types, state and discovery) or in your own model on top (flexible topics and payloads). The choice shows up later as how easy it is to onboard a new system and how much documentation you must write.

**Why should a controls engineer care?** Because the data starts with you. Clean tag names, consistent units, correct quality and timestamps at the edge are the foundation of any UNS. If those are poor, no broker will rescue them. See {{lesson:int-naming}}.
`,

  history: `
MQTT was created in 1999 for monitoring oil pipelines over expensive satellite links. Sparkplug, originally from Cirrus Link, became an Eclipse Foundation specification. The phrase "Unified Namespace" gained traction in the late 2010s and early 2020s through Walker Reynolds and the 4.0 Solutions community, and then through vendors who built reference architectures around it. It is a young pattern with a lot of marketing, so expect terms and best practices to keep shifting.
`,

  examples: [
    {
      title: "Designing the first six topics",
      body: `A single plant starts small. Enterprise \`acme\`, site \`dallas\`. Publish per line: \`.../line2/state\`, \`.../line2/oee\`, \`.../line2/workorder/current\`, plus \`.../line2/filler/speed\`, \`.../line2/filler/temperature\`, \`.../line2/filler/alarm/active\`. Document each topic's payload fields and units in one page everyone can read. Add lines one at a time using the same pattern.`
    },
    {
      title: "Using a wildcard subscription",
      body: `A site dashboard subscribes to \`acme/dallas/+/+/oee\`. The \`+\` wildcard matches one level, so it receives the OEE topic of every line in every area at the Dallas site. Adding a new line needs no dashboard change, provided the new line follows the naming pattern. A typo like \`Line3\` instead of \`line3\` would be missed by anyone filtering on lowercase names.`
    }
  ],

  diagrams: {
    uns: `<svg viewBox="0 0 640 300" role="img" aria-label="Publishers such as PLC gateways, MES and ERP publish to a central MQTT broker holding the hierarchy; subscribers such as dashboards, historian and cloud analytics read from it">
  <defs><marker id="mes-uns-ah" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L9,4 L0,8 z"/></marker></defs>
  <text class="dg-title" x="20" y="24">Publishers</text>
  <text class="dg-title" x="470" y="24">Subscribers</text>
  <rect class="dg-box" x="20" y="40" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="95" y="65">Edge gateway (PLCs)</text>
  <rect class="dg-box" x="20" y="100" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="95" y="125">MES</text>
  <rect class="dg-box" x="20" y="160" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="95" y="185">ERP interface</text>
  <rect class="dg-box" x="20" y="220" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="95" y="245">Quality / LIMS</text>
  <rect class="dg-box-accent" x="225" y="60" width="190" height="180" rx="8"/>
  <text class="dg-title dg-mid" x="320" y="90">MQTT broker</text>
  <text class="dg-text-sm dg-mid" x="320" y="115">acme/</text>
  <text class="dg-text-sm dg-mid" x="320" y="135">dallas/</text>
  <text class="dg-text-sm dg-mid" x="320" y="155">packaging/</text>
  <text class="dg-text-sm dg-mid" x="320" y="175">line2/</text>
  <text class="dg-text-mono dg-mid" x="320" y="195">filler/temperature</text>
  <text class="dg-text-muted dg-mid" x="320" y="222">latest value, not history</text>
  <rect class="dg-box" x="470" y="40" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="65">Perspective screens</text>
  <rect class="dg-box" x="470" y="100" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="125">Historian</text>
  <rect class="dg-box" x="470" y="160" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="185">Cloud analytics</text>
  <rect class="dg-box" x="470" y="220" width="150" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="245">Maintenance (CMMS)</text>
  <line class="dg-line" x1="170" y1="60" x2="223" y2="100" marker-end="url(#mes-uns-ah)"/>
  <line class="dg-line" x1="170" y1="120" x2="223" y2="130" marker-end="url(#mes-uns-ah)"/>
  <line class="dg-line" x1="170" y1="180" x2="223" y2="170" marker-end="url(#mes-uns-ah)"/>
  <line class="dg-line" x1="170" y1="240" x2="223" y2="200" marker-end="url(#mes-uns-ah)"/>
  <line class="dg-line" x1="415" y1="100" x2="468" y2="60" marker-end="url(#mes-uns-ah)"/>
  <line class="dg-line" x1="415" y1="130" x2="468" y2="120" marker-end="url(#mes-uns-ah)"/>
  <line class="dg-line" x1="415" y1="170" x2="468" y2="180" marker-end="url(#mes-uns-ah)"/>
  <line class="dg-line" x1="415" y1="200" x2="468" y2="240" marker-end="url(#mes-uns-ah)"/>
</svg>`
  },

  pitfalls: [
    "Treating the broker as a database and expecting history or queries from it.",
    "Starting with the broker before anyone owns naming, units and payload rules.",
    "Letting every team invent its own payload format, which rebuilds point-to-point spaghetti with nicer addresses.",
    "Putting values or changing identifiers in topic names.",
    "Renaming hierarchy levels after consumers depend on them.",
    "Publishing from the PLC with poor tag names and quality, then blaming the UNS.",
    "Leaving the broker open without authentication and topic-level authorization."
  ],

  keyTerms: ["uns", "mqtt", "mqtt-broker", "mqtt-topic", "sparkplug", "report-by-exception", "retained-message", "semantic-model", "data-governance", "isa-95"],

  quiz: [
    {
      q: "What does a Unified Namespace replace?",
      options: ["The PLCs", "The historian", "Point-to-point integrations between systems", "The network firewall"],
      answer: 2,
      explain: [
        "PLCs still run the machines and are the source of much of the data.",
        "A broker holds latest values. You still need a historian for time-series history.",
        "Correct. Each system publishes to and reads from a shared space instead of a custom link to every other system.",
        "Security controls remain necessary, arguably more so."]
    },
    {
      q: "Which is a correct statement about a retained message?",
      options: ["The broker keeps the last value for the topic and gives it to new subscribers", "It stores all values ever published", "It guarantees the message is encrypted", "It makes the topic read-only"],
      answer: 0,
      explain: [
        "Correct. That's how a new subscriber learns current state without waiting for a change.",
        "Only the last message is retained, not history.",
        "Retain has nothing to do with encryption.",
        "It doesn't affect write access."]
    },
    {
      q: "A teammate proposes the topic acme/dallas/line2/filler/temperature/72.4. What's wrong with it?",
      options: ["Nothing", "It has too many levels", "Topics cannot contain numbers", "The value belongs in the payload, and a topic should identify a thing"],
      answer: 3,
      explain: [
        "Putting the value in the topic creates a new topic for every reading.",
        "Six levels are not a problem. Inconsistent structure is.",
        "Topics can contain digits. The problem is putting changing data in them.",
        "Correct. The topic names the thing. The payload carries the value, timestamp and quality."]
    },
    {
      q: "What is a fair argument for plain JSON topics over Sparkplug B in an enterprise UNS?",
      options: ["JSON is always smaller", "Topic hierarchy and payload semantics are fully under your control", "JSON has built-in birth and death messages", "Brokers cannot carry Sparkplug"],
      answer: 1,
      explain: [
        "Sparkplug's binary payload is usually more compact than JSON.",
        "Correct. Flexibility to model the business hierarchy and meaning is the main argument, at the cost of defining your own conventions.",
        "Birth and death messages are a Sparkplug feature.",
        "Sparkplug runs on ordinary MQTT brokers."]
    },
    {
      q: "A plant publishes everything to a broker and then asks 'what was the average level last Tuesday?' What's the lesson?",
      options: ["The broker should be tuned", "MQTT is unreliable", "A UNS broker is not a database, and history needs a historian", "The topics were too short"],
      answer: 2,
      explain: [
        "Tuning doesn't turn a message router into a time-series store.",
        "MQTT is doing what it is designed to do.",
        "Correct. The broker holds current state. History comes from a subscriber that writes to a historian.",
        "Topic length is unrelated to history storage."]
    },
    {
      q: "In a typical Ignition UNS design, what role does Ignition play?",
      options: ["A node that publishes, subscribes, models and visualizes data, with the namespace living in the broker", "It is the only possible broker", "It replaces all PLC programming", "It forbids third-party systems"],
      answer: 0,
      explain: [
        "Correct. Ignition connects to the namespace through MQTT modules and adds historian, UDT models and screens.",
        "Ignition gateways connect to brokers, and the broker can be a third-party one.",
        "PLCs still run control logic.",
        "UNS designs are about open participation by many systems."]
    }
  ],

  resources: [
    { title: "What is Unified Namespace (UNS)", url: "https://inductiveautomation.com/resources/article/uns-unified-namespace", type: "article", source: "Inductive Automation" },
    { title: "Demystifying The Unified Namespace with Ignition", url: "https://inductiveautomation.com/resources/icc/2024/demystifying-the-unified-namespace-with-ignition", type: "video", source: "Inductive Automation (ICC 2024)" },
    { title: "Ignition Unified Namespace Solution", url: "https://inductiveautomation.com/solutions/unified-namespace", type: "article", source: "Inductive Automation" },
    { title: "Data-Driven Manufacturing with Unified Namespace", url: "https://www.hivemq.com/blog/data-driven-manufacturing-with-unified-namespace-uns/", type: "article", source: "HiveMQ" },
    { title: "Beyond MQTT: The Fit and Limitations of Other Technologies in a UNS", url: "https://www.hivemq.com/blog/beyond-mqtt-fit-and-limitations-other-technologies-in-uns/", type: "article", source: "HiveMQ" },
    { title: "Three ways to kickstart your Unified Namespace", url: "https://cirrus-link.com/three-ways-to-kickstart-your-unified-namespace/", type: "article", source: "Cirrus Link" }
  ]
});
