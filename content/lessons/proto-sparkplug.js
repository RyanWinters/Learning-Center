LC.lesson({
  id: "proto-sparkplug",
  title: "Sparkplug B",
  track: "proto",
  minutes: 15,
  level: 3,
  prereqs: ["proto-mqtt"],
  tags: ["sparkplug", "mqtt", "protobuf", "birth-death", "uns", "iiot"],
  summary: "MQTT gives you a bus. Sparkplug B adds the rules that make devices, tags and their health discoverable and state-aware.",
  objectives: [
    "Read a Sparkplug topic and name each of its five parts",
    "Explain what NBIRTH, NDEATH, DBIRTH, DDEATH, NDATA, DDATA, NCMD and STATE messages are for",
    "Describe how aliases, sequence numbers and bdSeq keep a consumer's picture correct",
    "Explain what a primary host application is and why it publishes a STATE message",
    "Say how report-by-exception works safely when the consumer knows the state of every tag"
  ],

  body: `
## What Sparkplug is

Plain {{lesson:proto-mqtt}} carries bytes to topics and says nothing else. Two vendors can pick different topic layouts and different JSON, and a consumer cannot even know which tags exist. {{term:sparkplug|Sparkplug}} is a specification that adds exactly the missing rules on top of MQTT: a fixed topic namespace, a defined payload format, and a life cycle for announcing when a node and its devices come online or go away. The version you will meet is **Sparkplug B**, which defines the payload as Google Protocol Buffers.

The specification is now maintained as an open Eclipse Foundation specification (the Eclipse Sparkplug project, with the current published release being 3.0). It was created by Cirrus Link, the company co-founded by Arlen Nipper, one of MQTT's inventors. Cirrus Link's MQTT modules for Ignition, MQTT Engine, MQTT Transmission and the Distributor, are the most common Sparkplug implementation in plants. See {{lesson:arch-mqtt}}.

## The topic namespace

Every Sparkplug topic follows one pattern:

\`\`\`text
spBv1.0 / group_id / message_type / edge_node_id / [device_id]
\`\`\`

| Part | Meaning | Example |
|---|---|---|
| \`spBv1.0\` | Namespace and version token. Fixed. | \`spBv1.0\` |
| \`group_id\` | A logical grouping chosen by you, often a site or area | \`Plant1\` |
| \`message_type\` | What this message is (see below) | \`DDATA\` |
| \`edge_node_id\` | The gateway or Edge Node that owns the connection | \`Area10_Line1\` |
| \`device_id\` | Optional. A device or data source *behind* that node | \`M101\` |

So \`spBv1.0/Plant1/DDATA/Area10_Line1/M101\` means "new data from device M101 (a motor) behind the Area10_Line1 node in group Plant1." Sparkplug's namespace is fixed, so never put an ISA-95 path like \`meridian/plant1/area10/...\` in these topics. The hierarchy shows up in the group and node IDs and in metric names such as \`Sts/Running\`. Plain MQTT topics follow a different, lowercase form; see {{lesson:proto-mqtt}}. Node-level message types carry no device ID.

Two roles matter. An **Edge Node** is the MQTT client that talks to the broker, typically a gateway, a PLC with MQTT built in or Ignition Edge. A **Device** is something the Edge Node represents, like a PLC or a drive. A **host application**, usually an Ignition server running MQTT Engine, subscribes to everything and builds the tags.

## The message types

{{diagram:lifecycle}}

| Type | Topic has device? | Purpose |
|---|---|---|
| **NBIRTH** | no | Edge Node came online. Contains every metric of the node with name, data type, alias and current value. |
| **NDEATH** | no | Edge Node is gone. Published by the broker as the node's MQTT will. |
| **DBIRTH** | yes | A device came online. Contains every device metric with its current value. |
| **DDEATH** | yes | A device went offline (its link to the node was lost). |
| **NDATA** / **DDATA** | no / yes | Metric values that changed since last time. |
| **NCMD** / **DCMD** | no / yes | Commands to a node or device, such as a write or a rebirth request. |
| **STATE** | n/a | The host application's own online/offline status, on \`spBv1.0/STATE/<host_id>\`. |

The first thing a node publishes after connecting is NBIRTH. It is the **birth certificate**: the full list of tags and their values. Only after a birth does a node send NDATA or DDATA, and those carry only what changed. The consumer can now rebuild its tag tree from nothing but the births.

## The payload: protobuf, metrics, aliases

Sparkplug B payloads are {{term:protobuf|Protocol Buffers}}: a compact binary encoding where a schema defines the fields. A payload holds a timestamp, a **seq** number and a list of **metrics**. Each metric has a name (like \`Sts/Speed\`), a data type (Int32, Float, Boolean, String, DataSet, Template for UDTs, and others), a value, a timestamp and optional properties such as engineering units or quality.

Names are long strings. To avoid sending them every time, the birth message assigns each metric a numeric **alias**, and later data messages can use the alias alone:

\`\`\`json
// NBIRTH (shown as JSON for readability)
{ "timestamp": 1760000000000, "seq": 0, "metrics": [
  { "name": "bdSeq", "dataType": "Int64", "value": 3 },
  { "name": "Node Control/Rebirth", "dataType": "Boolean", "value": false }
]}

// DBIRTH for device M101: names and aliases for its metrics
{ "timestamp": 1760000000100, "seq": 1, "metrics": [
  { "name": "Sts/Speed", "alias": 17, "dataType": "Float", "value": 1450.0 },
  { "name": "Sts/Running", "alias": 18, "dataType": "Boolean", "value": true }
]}

// Later DDATA for M101: alias only, no name
{ "timestamp": 1760000002000, "seq": 2, "metrics": [
  { "alias": 17, "dataType": "Float", "value": 1462.5 }
]}
\`\`\`

The tag name appears once, then each update costs a few bytes. A binary float, an alias and a timestamp fit in roughly a dozen bytes, which is why Sparkplug is practical over cellular links.

## Sequence numbers: seq and bdSeq

- **seq** is a counter from 0 to 255 that rolls over. Every Sparkplug message from a node and its devices after the NBIRTH (which uses 0) increments it by one. If the host sees 41 then 43, it knows it missed a message and asks for a rebirth.
- **bdSeq** is the birth/death sequence. The NBIRTH contains a \`bdSeq\` metric, and the NDEATH message (the MQTT will) carries the same value. When a host sees an NDEATH, it checks the \`bdSeq\` against the current NBIRTH. This stops a delayed will from an old, dead session from marking a newly reconnected node as offline.

When the host sees a problem, it publishes an NCMD with the \`Node Control/Rebirth\` metric set true. The node answers with a fresh NBIRTH and DBIRTHs, and the host's picture is whole again.

## The primary host application

A **primary host application** is the single system of record, typically the SCADA or the Ignition Gateway running MQTT Engine. It publishes a retained **STATE** message saying it is online, with a will that says offline. Edge nodes configured to know about a primary host watch that topic. When the host is offline, they can keep **buffering** data (store-and-forward). When it returns, they republish a rebirth and the buffered history, in order, flagged as historical. Without this handshake, a node would not know whether the host restarted and lost its state.

## Report by exception with state awareness

Sparkplug is built to publish only on change ({{lesson:proto-polling-rbe}}). That is dangerous in plain MQTT, since a silent tag could mean "unchanged" or "device dead." Sparkplug fixes this by making the *state* explicit. Births give a full snapshot, DDEATH marks devices stale, and NDEATH marks the entire node and all its devices stale. Ignition's MQTT Engine sets the quality of every tag under a dead node or device to stale or bad, so your screen shows a grey tag instead of a confidently wrong number.

> [!example] Following a node through a day
> 1. Edge node \`Area10_Line1\` connects. Broker holds its will: \`NDEATH\` with bdSeq 3.
> 2. It publishes \`spBv1.0/Plant1/NBIRTH/Area10_Line1\` with seq 0, bdSeq 3 and its node metrics.
> 3. It publishes \`DBIRTH\` for \`M101\` and \`P101\` (seq 1 and 2).
> 4. Motor speed changes. It publishes \`DDATA\` for M101 with seq 3, one metric, alias only.
> 5. The cable to the P101 drive is cut. The node publishes \`DDEATH\` for \`P101\` (seq 4). Its tags go stale in Ignition. The M101 tags stay good.
> 6. The WAN drops. The broker publishes the NDEATH will with bdSeq 3. All Area10_Line1 tags go stale.
> 7. The WAN returns. The node reconnects with bdSeq 4 and publishes a new NBIRTH. Everything refreshes.

## Securing a Sparkplug network

Sparkplug defines topics and payloads. It does not define authentication or authorization, so security comes from the MQTT broker and the network. The risk is concrete: anyone who can publish to \`spBv1.0/#\` can forge an NBIRTH to create tags in the host, and anyone who can publish NCMD or DCMD can send writes or a rebirth storm to an edge node. This is a {{lesson:net-security}} conduit problem, so treat the broker like any other Level 3 or DMZ service.

- **TLS on 8883.** Use MQTT over TLS (port 8883) for every edge node and host. Plain 1883 sends credentials and payloads in the clear. Validate the broker certificate on the client.
- **A unique credential per edge node.** One shared username for every gateway means one stolen password impersonates the whole plant, and you cannot revoke one node. Give \`Area10_Line1\` its own username (or client certificate) and tie the MQTT client ID to it.
- **Broker ACLs by group and edge node.** Allow \`Area10_Line1\` to publish only \`spBv1.0/Plant1/+/Area10_Line1/#\`, and to subscribe only to its own NCMD and DCMD topics and the host's STATE topic. Edge nodes must not subscribe to other nodes' data or publish under another node's ID. Only the primary host may publish \`spBv1.0/STATE/<host_id>\`, NCMD and DCMD.
- **Write authorization for NCMD and DCMD.** A command topic is a write path into the process. Limit which accounts can publish to it (normally the host application only), and have the host enforce its own tag-level permissions before it publishes a command. The edge node should also accept only the commands and metrics you intend to be writable. Wrong or missing ACLs here are how a compromised account turns into a process change. The same motor-safety rule as everywhere applies: stops and protection stay hardwired, never a Sparkplug command.
- **Network placement.** Edge nodes make outgoing connections to a broker in the plant or DMZ, and no connection passes straight from Level 3 to Level 4. Open only 8883 from the node to the broker. Details of the zone and conduit pattern are in {{lesson:net-security}}.

Check your broker's manual for how it expresses ACLs, since the syntax differs between products.

## Sparkplug in Ignition

In Ignition, **MQTT Transmission** turns tags into an Edge Node (publishing births and data), **MQTT Engine** acts as the host, and the **Distributor** is a broker module. The Engine creates tag providers from births automatically, with UDT definitions from Template metrics. Names in Ignition tag paths mirror the group, node, device and metric names, so choose them carefully. Renaming them later means rebuilding history and UDT mappings.

> [!note] Namespaces beyond B
> Cirrus Link's modules can also publish and read plain JSON or raw payloads under other namespaces, but those carry none of the birth/death state guarantees. Use them for integration with non-Sparkplug systems, not for plant data.
`,

  eli5: `
Imagine a group chat where lots of machines post updates. If the chat has no rules, one machine writes "temp is 72" and another writes "T=72F ok" and a third just posts a photo of a gauge. Nobody can build anything reliable from that.

Sparkplug is the rulebook for the chat. Every machine must start with an "I'm here" message that lists everything it can tell you and what each one is right now. After that, it posts only the things that change, using short nicknames so messages stay tiny. If a machine drops out, the chat posts an "I've left" message so you know everything it said earlier might be out of date. Each post is numbered, so if you see 41 and then 43, you know you missed one and can ask "please say it all again."

Because everyone follows the same rulebook, a new screen can join the chat, read the "I'm here" messages and build itself.
`,

  why: `
**Why not just publish JSON to MQTT?** You can, and many plants do, but every project reinvents the same four problems: tag discovery, data typing, device health, and recovering after a restart. Sparkplug answers them once. The cost is rigidity. You have to follow its topic structure and birth/death behavior, and you get a payload that is unreadable without a decoder. Teams that want human-readable topics for a unified namespace often run Sparkplug at the edge and republish into a friendlier JSON topic tree. See {{lesson:mes-uns}}.

**Why births and deaths instead of timestamps?** A timestamp tells you when a value was last sent, not whether the source is alive. With report-by-exception, a flat line could be a steady process or a cut cable. Explicit death messages make "unknown" a first-class state. The tradeoff is that the system depends on the broker delivering the will correctly. A broker restart mid-session is the classic cause of stale tags that never go stale. Test it.

**Why a primary host?** Without one, a node cannot tell whether the SCADA restarted and lost its tag tree. The STATE handshake makes the host's health observable, so nodes can buffer when it is down and rebirth when it returns. Experienced integrators argue about whether to allow a second, non-primary host. It is allowed, but only the primary host is trusted for commands and store-and-forward release.

**Why aliases?** On a metered cellular link every byte costs money, and report-by-exception traffic is dominated by names if you send them each time. The tradeoff is that a lost birth leaves the consumer unable to decode data, which is exactly why rebirth requests exist.

**Why protobuf?** It is compact, typed and has libraries in every language. The downside is you cannot read it in a plain MQTT client without a Sparkplug-aware tool.
`,

  history: `
Cirrus Link, founded by Arlen Nipper, defined Sparkplug to give MQTT an interoperable industrial layer, because MQTT by itself left each vendor to invent its own payloads. The specification was later moved to the Eclipse Foundation as the Eclipse Sparkplug project, which publishes it openly. Versions 2.2 and 3.0 are public. The namespace token \`spBv1.0\` stayed the same in 3.0. Sparkplug A, an older payload format based on a different encoding, is now rarely used.
`,

  examples: [
    {
      title: "Reading a topic",
      body: `\`spBv1.0/Plant1/NCMD/Area10_Line1\` is a **command to the node** (no device ID) in group \`Plant1\`. If the payload is a single Boolean metric \`Node Control/Rebirth\` = true, the host is asking the node to resend its birth. \`spBv1.0/Plant1/DDATA/Area10_Line1/M101\` is changed data from device \`M101\`.`
    },
    {
      title: "Spotting a missed message",
      body: `A host receives DDATA with seq 120, then DDATA with seq 122 from the same node. Seq 121 is missing. A well-behaved host marks the node's tags suspect and publishes the rebirth NCMD. After the new NBIRTH arrives, the tag values are known to be correct again.`
    }
  ],

  diagrams: {
    lifecycle: `<svg viewBox="0 0 640 270" role="img" aria-label="Timeline of an edge node: connect, NBIRTH, DBIRTH, repeated DATA, DDEATH, and NDEATH published by the broker on failure">
  <defs>
    <marker id="proto-sparkplug-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="24">Edge Node</text>
  <text class="dg-title" x="270" y="24">Broker</text>
  <text class="dg-title" x="490" y="24">Primary host</text>
  <line class="dg-line-thin" x1="70" y1="36" x2="70" y2="256"/>
  <line class="dg-line-thin" x1="320" y1="36" x2="320" y2="256"/>
  <line class="dg-line-thin" x1="550" y1="36" x2="550" y2="256"/>
  <line class="dg-line" x1="550" y1="52" x2="324" y2="52" marker-end="url(#proto-sparkplug-ah)"/>
  <text class="dg-text-sm" x="340" y="46">STATE online (retained)</text>
  <line class="dg-line" x1="70" y1="86" x2="316" y2="86" marker-end="url(#proto-sparkplug-ah)"/>
  <text class="dg-text-sm" x="84" y="80">NBIRTH seq 0, bdSeq 3</text>
  <line class="dg-line" x1="70" y1="120" x2="316" y2="120" marker-end="url(#proto-sparkplug-ah)"/>
  <text class="dg-text-sm" x="84" y="114">DBIRTH M101</text>
  <line class="dg-line-accent" x1="70" y1="154" x2="316" y2="154" marker-end="url(#proto-sparkplug-ah)"/>
  <text class="dg-text-sm" x="84" y="148">DDATA alias only</text>
  <line class="dg-line" x1="324" y1="154" x2="546" y2="154" marker-end="url(#proto-sparkplug-ah)"/>
  <line class="dg-line" x1="70" y1="188" x2="316" y2="188" marker-end="url(#proto-sparkplug-ah)"/>
  <text class="dg-text-sm" x="84" y="182">DDEATH M101</text>
  <line class="dg-line-alarm" x1="320" y1="228" x2="546" y2="228" marker-end="url(#proto-sparkplug-ah)"/>
  <text class="dg-text-sm" x="340" y="222">NDEATH (will)</text>
  <text class="dg-text-muted" x="84" y="246">link lost</text>
</svg>`
  },

  pitfalls: [
    "Changing group, edge node or device names after tags exist. Tag paths, history and UDT links all follow those names.",
    "Two Edge Nodes with the same edge_node_id in the same group. They will keep replacing each other's births.",
    "Ignoring the rebirth path and then wondering why tags are Bad until the next restart.",
    "Assuming a quiet tag is healthy. Check the node and device state, not just the last value.",
    "Expecting Sparkplug payloads to be readable in a generic MQTT client. They are binary protobuf."
  ],

  keyTerms: ["sparkplug", "protobuf", "edge-node", "sparkplug-birth-death", "primary-host", "report-by-exception", "mqtt", "last-will"],

  quiz: [
    {
      q: "In topic spBv1.0/Plant1/DDATA/Area10_Line1/M101, what is Area10_Line1?",
      options: ["The group ID", "The device ID", "The Edge Node ID", "The message type"],
      answer: 2,
      explain: [
        "The group ID is Plant1, the segment before the message type.",
        "The device ID is the last segment, M101.",
        "Correct. The Edge Node is the MQTT client that owns the connection and the devices behind it.",
        "The message type is DDATA."
      ]
    },
    {
      q: "Why does an NBIRTH message exist when NDATA already carries values?",
      options: [
        "It encrypts the session",
        "It gives the host the full tag list, data types, aliases and current values so later messages can be small",
        "It replaces the MQTT CONNECT packet",
        "It sets the broker's QoS"
      ],
      answer: 1,
      explain: [
        "Birth messages don't provide encryption. TLS does.",
        "Correct. The birth is the complete snapshot and dictionary that NDATA and DDATA rely on.",
        "CONNECT is still used. The birth is an application-level message after it.",
        "QoS is set per publish, not by the birth."
      ]
    },
    {
      q: "A host sees DDATA with seq 120, then seq 122. What should it do?",
      options: [
        "Ignore it, since seq is advisory",
        "Wait for 121 forever",
        "Disconnect from the broker",
        "Treat the data as suspect and publish an NCMD requesting a rebirth"
      ],
      answer: 3,
      explain: [
        "A gap means a message was lost, and ignoring it risks a wrong picture.",
        "MQTT will not deliver 121 later by itself.",
        "Disconnecting doesn't recover the missed value.",
        "Correct. A rebirth gives a fresh full snapshot and resets the host's view."
      ]
    },
    {
      q: "What is the job of bdSeq?",
      options: [
        "It matches an NDEATH will to the specific NBIRTH session it belongs to",
        "It numbers every data message",
        "It encodes the device's address",
        "It limits how many tags a node can have"
      ],
      answer: 0,
      explain: [
        "Correct. A delayed will from an old session won't wrongly mark a newly reconnected node as dead.",
        "That is seq, which rolls from 0 to 255.",
        "Addressing is in the topic.",
        "Tag counts aren't limited by bdSeq."
      ]
    },
    {
      q: "What does the primary host application's retained STATE message let edge nodes do?",
      options: [
        "Learn whether the host is online, so they can buffer data while it is down and rebirth when it returns",
        "Subscribe to all device topics",
        "Change the namespace version",
        "Pick a faster QoS"
      ],
      answer: 0,
      explain: [
        "Correct. It makes the host's health observable and drives store-and-forward and rebirth.",
        "Subscriptions are controlled by topic filters and broker permissions.",
        "The namespace token is fixed at spBv1.0 for Sparkplug B.",
        "STATE does not change QoS."
      ]
    },
    {
      q: "Why is report-by-exception safer in Sparkplug than in plain MQTT?",
      options: [
        "Sparkplug sends every tag every second",
        "It uses QoS 2 for everything",
        "It compresses values with a deadband",
        "Births give a full snapshot and deaths mark data stale, so silence has a defined meaning"
      ],
      answer: 3,
      explain: [
        "That would be polling and defeat the purpose.",
        "Sparkplug messages are normally QoS 0 or 1 depending on type.",
        "Deadbands are applied by the publisher, not defined by Sparkplug itself.",
        "Correct. The consumer knows the node and devices are alive or dead, so a quiet tag isn't ambiguous."
      ]
    }
    ,
    {
      q: "Who should be allowed to publish NCMD and DCMD topics on a Sparkplug broker?",
      options: [
        "Every edge node, so they can coordinate",
        "Anyone on the plant network, since Sparkplug authenticates senders",
        "Only the primary host application (and other explicitly authorized accounts), enforced by broker ACLs",
        "Nobody, because commands are not part of Sparkplug"
      ],
      answer: 2,
      explain: [
        "Edge nodes only need to receive commands for themselves. Letting them publish commands lets one compromised node write to others.",
        "Sparkplug has no sender authentication. The broker must provide it.",
        "Correct. Command topics are write paths, so limit publishers with ACLs and add tag-level permission checks in the host.",
        "NCMD and DCMD are part of Sparkplug, used for writes and rebirth requests."
      ]
    }
  ],

  resources: [
    { title: "Sparkplug 3.0.0 specification (PDF)", url: "https://sparkplug.eclipse.org/specification/version/3.0/documents/sparkplug-specification-3.0.0.pdf", type: "standard", source: "Eclipse Sparkplug" },
    { title: "Sparkplug 2.2 specification (PDF)", url: "https://sparkplug.eclipse.org/specification/version/2.2/documents/sparkplug-specification-2.2.pdf", type: "standard", source: "Eclipse Sparkplug" },
    { title: "Sparkplug message topics and payloads (MQTT Modules for Ignition)", url: "https://docs.chariot.io/display/CLD80/Cirrus+Link+Modules+Sparkplug+message+topics+and+payloads", type: "docs", source: "Cirrus Link" },
    { title: "MQTT Engine default namespaces", url: "https://docs.chariot.io/display/CLD80/MQTT+Engine+Default+Namespaces", type: "docs", source: "Cirrus Link" },
    { title: "Sparkplug B namespace when above version 1.0", url: "https://forum.cirrus-link.com/t/sparkplug-b-namespace-when-above-version-1-0/310", type: "forum", source: "Cirrus Link Forum" }
  ]
});
