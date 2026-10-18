LC.lesson({
  id: "arch-mqtt",
  title: "MQTT with Cirrus Link modules",
  track: "arch",
  minutes: 10,
  level: 3,
  prereqs: ["proto-sparkplug", "arch-edge"],
  tags: ["mqtt", "sparkplug", "cirrus-link", "transmission", "engine", "distributor", "chariot"],
  summary: "How Ignition publishes and consumes Sparkplug B: Transmission at the edge, a broker in the middle, Engine at the hub.",
  objectives: [
    "Say what MQTT Transmission, Distributor and Engine each do",
    "Draw a hub-and-spoke Sparkplug system with Ignition at both ends",
    "Explain how store-and-forward and the primary host STATE message work together",
    "Choose between an Ignition-hosted broker and the Chariot broker",
    "Predict the tag structure Engine creates for an edge node and its devices"
  ],

  body: `
## The three modules

Ignition speaks {{term:sparkplug|Sparkplug B}} over {{term:mqtt|MQTT}} through three modules from Cirrus Link. Each does one job, and you pick the ones the site needs. Cirrus Link builds these modules and supports them as the module vendor, and the module documentation lives with Cirrus Link at docs.chariot.io. Inductive Automation lists them on its price list, so you can buy them there, but that does not move support for the module itself to Inductive Automation. Confirm the support route in your purchase terms. The same arrangement is described in {{lesson:arch-ecosystem}}.

| Module | Role | Runs where |
|---|---|---|
| {{term:mqtt-transmission|MQTT Transmission}} | Publisher. Reads Ignition tags, turns them into Sparkplug messages, publishes to one or more brokers | Edge IIoT or a site gateway (check which MQTT capability your Edge edition includes, see {{lesson:arch-edge}}) |
| {{term:mqtt-distributor|MQTT Distributor}} | Broker. Makes an Ignition Gateway an MQTT 3.1.1 server | A gateway that should host the broker |
| {{term:mqtt-engine|MQTT Engine}} | Subscriber. Receives Sparkplug messages and creates and updates tags | Central or hub gateway |

Distributor comes in a standard version and a Plus version with a higher client-connection limit (50 versus 250 in Cirrus Link's published figures; confirm against current documentation). A third option for the broker role is {{term:chariot-broker|Chariot}}, Cirrus Link's standalone MQTT server, which runs outside Ignition.

{{diagram:hub}}

## Why this architecture

With OPC UA or Gateway Network links, the central server connects to each site and polls. With MQTT, every site opens one outbound connection to a broker and publishes. The central side subscribes. Outbound-only connections are friendlier to firewalls and cellular networks, and adding a site means pointing it at the broker, not editing the central server. Review {{lesson:proto-mqtt}} and {{lesson:proto-sparkplug}} for the protocol details.

## What Transmission does

Transmission is configured with a **tag provider** and a **tag path** to publish. It then behaves as a Sparkplug {{term:edge-node|edge node}}:

1. It connects to the broker with an MQTT client ID and a Sparkplug group ID and edge node ID.
2. It publishes an **NBIRTH** with its metrics and **DBIRTH** messages for each device, as described in {{term:sparkplug-birth-death|Sparkplug birth and death}}.
3. After that it publishes **NDATA** and **DDATA** only for tags whose values change. This is {{term:report-by-exception|report by exception}} with a Sparkplug payload that keeps data types, timestamps and quality.
4. It sets a last will so the broker publishes an NDEATH if the connection dies.

Transmission can publish to several brokers at once, for example a plant broker and a cloud broker. It can also publish tag **UDT definitions** so the receiving end gets typed structures, not flat tags.

> [!note] Transmission is not Sync Services
> Both forward data to a central place. Sync Services is Ignition to Ignition over the Gateway Network. Transmission is Ignition to any Sparkplug consumer through a broker. Pick Sparkplug when the consumer might not be Ignition or when outbound-only connectivity matters.

## What Engine does

Engine connects to the broker, subscribes to the Sparkplug namespace (topics beginning \`spBv1.0/\`), and builds tags from the birth messages. The result is a tag provider organized like the topics:

\`\`\`text
[MQTT Engine]Edge Nodes/Plant1/Area10_Line1/M101/Sts/Running
                        ^group ^edge node    ^device ^metric
\`\`\`

This follows the house mapping: Sparkplug group ID \`Plant1\`, edge node ID \`Area10_Line1\`, device ID \`M101\`, and a metric named \`Sts/Running\` that mirrors the Motor UDT member. On the wire the same data travels on topics such as \`spBv1.0/Plant1/DDATA/Area10_Line1/M101\`. The ISA-95 path stays in plain MQTT/UNS topics, never in a Sparkplug topic.

Tags appear when an edge node comes online, and they go stale or bad quality when its death certificate arrives. Because they are ordinary tags, you can use them in Perspective, alarming and history like any other. See {{lesson:ign-historian}} for storing them.

## Primary host and store-and-forward

Engine can act as the Sparkplug {{term:primary-host|primary host}}. It publishes a retained **STATE** message saying "online" (and a last will saying "offline") on a topic that edge nodes can watch. In Sparkplug 3.0 that topic is \`spBv1.0/STATE/<host_id>\`, for example \`spBv1.0/STATE/CorpScada\`. Earlier Sparkplug versions used a different STATE topic layout, so check the version your modules implement. Edge nodes that know about the primary host do two things:

- When the STATE says offline, they hold their data instead of publishing into the void.
- When it returns, they publish new births and send what they stored.

That is {{term:mqtt-store-forward|MQTT store-and-forward}}. Transmission can buffer time-stamped tag changes when the connection or the primary host is down, then backfill history and resume live data. Cirrus Link's documentation describes this as best effort (see the store-and-forward video and pages in the resources, and check the current docs for your module version). Edge cases around MQTT keep-alive timeouts can lose messages, so do not call it a guarantee in a compliance design. If you need the data in a historian for certain, test your outage scenarios and consider a second path.

> [!warning] Two historians, one set of data
> If Transmission backfills history, the receiving gateway must be set to accept and store the historical data. Check how Engine tags handle history so you do not store the same values twice, or lose them.

## Choosing a broker

| Option | Good for | Watch for |
|---|---|---|
| Distributor on a gateway | One plant, Ignition-centric, small client count | Broker shares CPU and memory with the gateway; client limits |
| Chariot | Larger fleets, dedicated broker, cloud or VM | A separate product to patch, license and monitor |
| Third-party broker | Corporate standard, cloud IoT services | Sparkplug-aware behaviors and retained messages must work |

For redundancy, brokers can be clustered or fronted by a load balancer depending on the product. Check the vendor's current guidance, and see {{lesson:arch-redundancy}}.

> [!example] Plant-wide rollout
> 12 packaging lines each have a site gateway with Transmission. They publish to Chariot on a VM. The corporate Ignition has Engine pointed at that broker with the primary host ID \`CorpScada\`. Tag count at the center grows as lines are added with no central configuration. During a WAN outage, each line's Transmission stores changes. After the link returns, the hub gets a gap-filled history.

## Security

Use TLS between clients and the broker, unique credentials per client, and topic access control lists on the broker so an edge node can publish only in its own namespace. See {{lesson:net-security}}. Only open the broker's port (8883 for TLS by convention) to the networks that need it.
`,

  eli5: `
Picture a big school with a mail room in the middle. Each classroom has a student who writes short notes about what's happening ("the hamster's awake!") and drops them in the mail room. The principal's office subscribes to the notes it cares about and picks them up from the mail room.

The student never walks to the principal's office. The principal never walks to every classroom. The mail room does the delivering. That means a new classroom can join by learning where the mail room is, and nobody else has to change anything.

If the mail room is closed one afternoon, the student keeps notes on a clipboard, with the time written on each. When the mail room reopens, the student hands them over in order. The principal's office can tell the mail room is open because it hangs an "OPEN" sign on the door, and students check the sign before sending.

The note writer is Transmission. The mail room is Distributor or Chariot. The principal's office reading the notes is Engine.
`,

  why: `
**Why a broker instead of direct connections?** Direct polling couples every site to the center. The center must reach every site, hold a connection to each, and know each address. A broker decouples them in both directions. Sites only need outbound access to one address, and the center needs one connection. That is why MQTT dominates remote and distributed work, and why Ignition's own Gateway Network is a better fit when everything is Ignition on a good network.

**Why Sparkplug on top of MQTT?** Plain MQTT says nothing about topic layout, payload format, or what to do when something disconnects. Every vendor would invent its own. Sparkplug fixes the namespace, the data types and the birth/death behavior, so Transmission and Engine, or any compliant products, interoperate without custom code.

**Why the primary host STATE?** Without it, an edge node cannot tell whether the broker is up but nobody is listening. It would publish into a broker that discards the data. The STATE message makes "the consumer is online" an explicit fact, so edge nodes can buffer and later send a clean sequence.

**What integrators argue about.** Whether MQTT replaces OPC UA or the Gateway Network. In practice: OPC UA for device-to-gateway, MQTT for site-to-enterprise and cloud, and the Gateway Network or Sync Services where everything is Ignition and you want remote tag providers, remote alarm pipelines and tight integration. Another argument is broker placement. A broker inside Ignition is simple, but a dedicated broker is easier to scale and to keep running when you patch the gateway.
`,

  history: `
MQTT was created by Andy Stanford-Clark and Arlen Nipper in 1999 for monitoring oil pipelines over satellite links, which is why it is frugal and handles unreliable networks. Arlen Nipper later co-founded Cirrus Link, whose modules brought MQTT and the Sparkplug specification into Ignition. Sparkplug is now governed under the Eclipse Foundation.
`,

  examples: [
    {
      title: "Reading the tag path Engine creates",
      body: `Transmission on the Plant 1 gateway with group ID \`Plant1\` and edge node ID \`Area10_Line1\` publishes a device named \`M101\` with a metric \`Sts/Running\`. At the hub, Engine creates a tag at \`Edge Nodes/Plant1/Area10_Line1/M101/Sts/Running\` in its provider. If the edge node dies, its tags go bad quality when the NDEATH arrives, so alarms and screens can show "stale" rather than a frozen number.`
    },
    {
      title: "Testing store-and-forward",
      body: `With a site publishing every second, block the broker's port at the firewall for 30 minutes, then unblock it. Check the central trend for the window. You should see backfilled points with their original timestamps. If you see a straight line or a gap, review the primary host ID setting, the history settings on the Engine side and the edge node's store-and-forward settings.`
    }
  ],

  diagrams: {
    hub: `<svg viewBox="0 0 640 250" role="img" aria-label="Edge gateways with MQTT Transmission publish Sparkplug to a broker, and a central gateway with MQTT Engine subscribes and creates tags">
  <defs><marker id="arch-mqtt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="16" y="30" width="170" height="52" rx="6"/>
  <text class="dg-text dg-mid" x="101" y="52">Site 1 gateway</text>
  <text class="dg-text-sm dg-mid" x="101" y="70">MQTT Transmission</text>
  <rect class="dg-box" x="16" y="110" width="170" height="52" rx="6"/>
  <text class="dg-text dg-mid" x="101" y="132">Site 2 gateway</text>
  <text class="dg-text-sm dg-mid" x="101" y="150">MQTT Transmission</text>
  <rect class="dg-box-accent" x="250" y="60" width="140" height="80" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="92">Broker</text>
  <text class="dg-text-sm dg-mid" x="320" y="110">Distributor or Chariot</text>
  <rect class="dg-box" x="454" y="60" width="170" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="539" y="92">Central gateway</text>
  <text class="dg-text-sm dg-mid" x="539" y="112">MQTT Engine</text>
  <text class="dg-text-sm dg-mid" x="539" y="128">creates tags</text>
  <line class="dg-line" x1="186" y1="56" x2="248" y2="88" marker-end="url(#arch-mqtt-ah)"/>
  <line class="dg-line" x1="186" y1="136" x2="248" y2="112" marker-end="url(#arch-mqtt-ah)"/>
  <line class="dg-line" x1="452" y1="100" x2="392" y2="100" marker-end="url(#arch-mqtt-ah)"/>
  <text class="dg-text-muted" x="22" y="196">NBIRTH, NDATA, DDATA: publish on change</text>
  <text class="dg-text-muted" x="22" y="216">STATE (retained): primary host online or offline</text>
  <text class="dg-text-muted" x="22" y="236">Sites buffer data while the broker or host is down</text>
</svg>`
  },

  pitfalls: [
    "Treating store-and-forward as a guarantee. Test outages and know the edge cases.",
    "Mismatched group IDs, edge node IDs or primary host IDs between Transmission and Engine, which leaves tags empty or never buffering.",
    "Running a broker with no TLS or per-client credentials on a routable network.",
    "Putting a busy broker and a busy SCADA gateway on one server, then patching them together.",
    "Storing backfilled history twice by historizing on both the edge and the hub without a plan."
  ],

  keyTerms: ["mqtt-transmission", "mqtt-engine", "mqtt-distributor", "chariot-broker", "mqtt-store-forward", "primary-host", "sparkplug", "mqtt-broker"],

  quiz: [
    {
      q: "Which module creates Ignition tags from Sparkplug messages received from a broker?",
      options: ["MQTT Transmission", "MQTT Distributor", "MQTT Engine", "Sync Services"],
      answer: 2,
      explain: [
        "Transmission publishes. It does not create tags from incoming data.",
        "Distributor is the broker itself.",
        "Correct. Engine subscribes and builds tags from birth messages.",
        "Sync Services links Ignition Gateways over the Gateway Network, not MQTT."
      ]
    },
    {
      q: "What problem does the primary host STATE message solve?",
      options: ["It encrypts data to the broker", "It tells edge nodes whether the consumer is online so they can hold and later send data", "It assigns edge node IDs", "It converts Sparkplug to OPC UA"],
      answer: 1,
      explain: [
        "Encryption is TLS, a separate concern.",
        "Correct. Nodes buffer while the primary host is offline and publish stored data when it returns.",
        "IDs are configured, not assigned by STATE.",
        "STATE has nothing to do with protocol conversion."
      ]
    },
    {
      q: "A site is connected through a firewall that allows only outbound connections. Which architecture fits best?",
      options: ["Central gateway polls each site by OPC UA", "Engine at each site, Transmission at center", "Distributor at every site", "Each site's Transmission publishes outbound to a broker, and the center runs Engine"],
      answer: 3,
      explain: [
        "Polling needs inbound access to every site.",
        "That reverses the roles of the modules.",
        "That puts a broker at every site and still needs a central connection.",
        "Correct. Outbound-only publishing is MQTT's strength."
      ]
    },
    {
      q: "After a 30-minute broker outage the center's trend shows a straight line across the gap. What should you check first?",
      options: ["Store-and-forward settings, the primary host ID and history handling at both ends", "Whether the PLC scan time is too long", "Whether TLS is enabled", "Whether Perspective is installed"],
      answer: 0,
      explain: [
        "Correct. Backfill depends on the edge buffering and the hub accepting historical values.",
        "Scan time doesn't cause a gap-length line.",
        "TLS would prevent connection, not shape the backfill.",
        "Perspective is unrelated to history."
      ]
    },
    {
      q: "What is the practical difference between Sync Services and Transmission?",
      options: ["Sync Services links Ignition Gateways over the Gateway Network, Transmission publishes Sparkplug to any consumer through a broker", "There is none", "Transmission is only for Edge", "Sync Services needs a broker"],
      answer: 0,
      explain: [
        "Correct. Choose by consumer type and network constraints.",
        "They differ in transport, consumer and licensing.",
        "Transmission also runs on standard gateways.",
        "Sync Services uses the Gateway Network, not a broker."
      ]
    }
  ],

  resources: [
    { title: "Cirrus Link MQTT modules", url: "https://cirrus-link.com/mqtt-modules/", type: "docs", source: "Cirrus Link" },
    { title: "New to MQTT? Start here", url: "https://cirrus-link.com/new-to-mqtt-start-here/", type: "article", source: "Cirrus Link" },
    { title: "MQTT Transmission configuration", url: "https://docs.chariot.io/display/CLD80/MT:+Configuration", type: "docs", source: "Cirrus Link" },
    { title: "Getting Started: Two Ignition architecture", url: "https://docs.chariot.io/pages/viewpage.action?pageId=103158383", type: "docs", source: "Cirrus Link" },
    { title: "Setup store-and-forward system (Implementing MQTT in Ignition, video 12)", url: "https://cirrus-link.com/videos/setup-store-and-foreward-system-mplementing-mqtt-in-ignition-video-12/", type: "video", source: "Cirrus Link" },
    { title: "Everything Cirrus Link MQTT and cloud connectivity (ICC 2024)", url: "https://inductiveautomation.com/resources/icc/2024/cirrus-link-exhibitor-demo-everything-cirrus-link-mqtt-and-cloud-connectivity", type: "video", source: "Inductive Automation" }
  ]
});
