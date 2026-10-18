LC.lesson({
  id: "proto-mqtt",
  title: "MQTT: publish/subscribe for industry",
  track: "proto",
  minutes: 20,
  level: 2,
  prereqs: ["net-routing"],
  tags: ["mqtt", "pub-sub", "broker", "qos", "iiot"],
  summary: "A tiny publish/subscribe protocol built for oil pipelines on satellite links, now the transport under most modern plant-to-cloud designs.",
  objectives: [
    "Explain how a broker decouples publishers from subscribers",
    "Write a topic filter using the + and # wildcards and say what it matches",
    "Choose between QoS 0, 1 and 2 for a given payload",
    "Describe retained messages, Last Will and Testament and persistent sessions and the failure each one solves",
    "Say which port MQTT uses with and without TLS and name the main MQTT 3.1.1 vs 5 differences"
  ],

  body: `
## What MQTT is

{{term:mqtt|MQTT}} is a lightweight messaging protocol where devices never talk to each other directly. Everyone connects to a central server called a {{term:mqtt-broker|broker}}. A client **publishes** a message to a named **topic**, and every client that has **subscribed** to a matching topic receives a copy. Compare that with {{lesson:proto-modbus}}, where the client asks and the device answers. In MQTT the device speaks when it has something to say, and the consumer never needs to know the device exists.

You will meet MQTT whenever a plant wants data to leave the building: edge gateways publishing to a cloud, Ignition exchanging data with other Ignition servers, or a historian and an MES both consuming the same values. It is also the transport that {{lesson:proto-sparkplug}} sits on top of.

## The pieces

{{diagram:pubsub}}

- **Client**: anything that opens a TCP connection to the broker. A PLC gateway, an Ignition module, a Python script and a phone app are all clients. A client can publish, subscribe, or both.
- **Broker**: the server that accepts connections, keeps the subscription list and routes messages. Examples are Mosquitto, HiveMQ, EMQX and the Chariot broker from Cirrus Link. The broker is the single point everything depends on, so production designs often cluster it.
- **Topic**: a UTF-8 string with levels separated by slashes, such as \`meridian/plant1/area10/line1/m101/sts/running\` (the lowercase plain-MQTT form used throughout this course; {{lesson:proto-sparkplug}} uses its own fixed namespace instead). Topics are not created in advance. Publishing to one brings it into existence.
- **Payload**: the message body. MQTT does not care what is in it. It can be plain text, JSON or binary. Agreeing on the format is your problem, which is the reason {{lesson:proto-sparkplug}} exists.

## Topics and wildcards

Subscribers can use a **topic filter** with two wildcards. Publishers always use a full, exact topic.

| Wildcard | Meaning | Filter | Matches | Does not match |
|---|---|---|---|---|
| \`+\` | Exactly one level | \`meridian/plant1/area10/+/m101/sts/running\` | \`meridian/plant1/area10/line1/m101/sts/running\`, \`meridian/plant1/area10/line2/m101/sts/running\` | \`meridian/plant1/area10/line1/zone4/m101/sts/running\` |
| \`#\` | Everything below, must be last | \`meridian/plant1/area10/line1/#\` | \`meridian/plant1/area10/line1/m101/sts/running\`, \`meridian/plant1/area10/line1/p101/sts/running\` | \`meridian/plant1/area10/line2/m101/sts/running\` |

A subscription to \`#\` alone receives every message on the broker. That is useful when debugging with a tool like MQTT Explorer and a bad idea in production. Topics starting with \`$\` (such as \`$SYS/...\`) are reserved for broker statistics and are not matched by a leading wildcard.

> [!tip] Design topics like a folder path
> Put the broadest level first and the most specific last: \`enterprise/site/area/line/equipment/...\`. Never put data in the topic that changes (like a timestamp). Keep the level count modest, because each level is more bytes on every message.

## Quality of Service

Quality of Service (QoS) is a promise about delivery between **two hops**: publisher to broker, and broker to each subscriber. Each hop is negotiated separately, and the lower of the two QoS values wins on the subscriber side.

| QoS | Name | Behavior | Cost | Use for |
|---|---|---|---|---|
| 0 | At most once | Send once, no acknowledgment. A drop loses the message. | 1 packet | Fast-changing analog values where the next sample replaces the lost one |
| 1 | At least once | Receiver acknowledges (PUBACK). Sender retries until acknowledged, so duplicates are possible. | 2 packets | Most plant data, commands that are safe to repeat, alarms |
| 2 | Exactly once | A four-packet handshake guarantees one delivery. | 4 packets | Rare. Billing or counters where a duplicate causes harm |

QoS 1 is the usual default in industrial work. QoS 2 is slower and most industrial systems solve duplicate risk in the payload instead, with a sequence number or timestamp.

## Retained messages, Last Will, and sessions

Three features turn a basic message bus into something you can run a plant on.

**{{term:retained-message|Retained messages}}.** A publisher can set the retain flag. The broker then stores the last retained message for that topic and gives it to every new subscriber the moment they subscribe. Without it, a dashboard that connects at 9 a.m. waits until the next change to see a value that has not changed since midnight. Publishing an empty retained payload clears it.

**{{term:last-will|Last Will and Testament}}.** When a client connects, it can hand the broker a message to publish on its behalf if the client disappears without a clean disconnect. Network failure, power loss and a crashed gateway all trigger it. The classic use is \`meridian/plant1/area10/line1/gateway/status\`: the gateway publishes \`online\` (retained) when it connects, and its will is \`offline\` (retained). Everyone who watches the topic learns about the failure within the keep-alive window, which is typically 1.5 times the interval the client agreed to.

**{{term:persistent-session|Persistent sessions}}.** Normally a broker forgets a client's subscriptions when it disconnects. With a persistent session (the "clean session" flag off in 3.1.1, or a session expiry interval in 5), the broker keeps the subscriptions and queues QoS 1 and 2 messages while the client is offline. When the client reconnects with the same client ID, it receives what it missed. Always use a unique client ID per client. Two clients with the same ID will kick each other off in a loop.

> [!warning] Queues are not infinite
> A persistent session for a client that is offline for a week can fill broker memory or disk. Brokers cap queue lengths and drop the oldest messages. Decide what you want to happen before it happens.

## MQTT 3.1.1 vs MQTT 5

3.1.1 (an OASIS standard since 2014) is still the most widely deployed. MQTT 5 (OASIS, 2019) keeps the model and adds features learned from production use.

| Feature | 3.1.1 | 5 |
|---|---|---|
| Reason codes on acknowledgments | CONNACK return codes only (0 to 5). No reason codes on PUBACK, SUBACK or DISCONNECT | Detailed reason codes on CONNACK, PUBACK, SUBACK and DISCONNECT |
| Session control | Clean session flag only | Session expiry and message expiry intervals |
| Metadata on messages | None | User properties (key/value), content type, response topic |
| Shared subscriptions | Vendor extension | Standard, lets a pool of consumers split a topic |
| Topic aliases | No | Replace a long topic string with a small integer |

Many gateways and brokers still default to 3.1.1. Check the manual for each product and version (client, broker and any Ignition MQTT module) before you assume version 5 features.

## Ports and security

| Port | Use |
|---|---|
| 1883 | MQTT in plain text. Fine only on an isolated network |
| 8883 | MQTT over TLS |
| 443 | MQTT over WebSockets or TLS with ALPN, for networks that only allow web traffic |

Plain MQTT has a username and password in the connect packet, sent unencrypted on port 1883. Over a plant boundary, use port 8883 with TLS, ideally with client certificates, and set per-client topic permissions on the broker so a sensor gateway cannot subscribe to \`#\`. See {{lesson:net-security}}.

> [!example] A worked example
> An edge gateway on Area10 Line1 publishes the level of LT101 to \`meridian/plant1/area10/line1/lt101/sts/level\` with payload \`{"v": 2.41, "q": "good", "t": 1760000000000}\` (metres), QoS 1, retained. The SCADA server subscribes to \`meridian/plant1/area10/line1/+/sts/#\`. A new analyst opens a trend tool that subscribes to \`meridian/plant1/area10/line1/#\` and sees the last retained value for every tag instantly. The gateway's will on \`meridian/plant1/area10/line1/gateway/status\` is \`offline\`, so when a switch loses power, SCADA gets the offline flag within about 45 seconds if the keep-alive is 30. No one at the gateway had to know any of these consumers existed.

## Why pub/sub changes the architecture

In a polling design, every consumer is another client hitting every device. Add a historian, an MES and a cloud analytics tool and a PLC that served one client now serves four, and its connection limit and CPU become the bottleneck. With a broker, the device publishes once and the broker fans out. Consumers can be added, removed or replaced without touching the producer, and a producer that disappears does not break consumers. They just stop receiving. That decoupling is what makes the {{lesson:mes-uns}} idea practical.
`,

  eli5: `
Think of a community bulletin board in an apartment building, with a doorman at the desk who runs it.

If you want to tell people the pool is closed, you don't knock on every door. You hand a note to the doorman and say "put this under Pool." Anyone who told the doorman "I want to hear about the Pool" gets a copy. You don't know who they are, and they don't know you. If someone moves in tomorrow and asks about the Pool, the doorman hands them the last note right away, since you asked him to keep it. And if you leave a sealed envelope that says "if I ever vanish without saying goodbye, announce that I'm gone," the doorman will read it out when you fail to check in.

Notes can be sent three ways: toss it and hope, get a receipt, or a full signed handshake. More paperwork means more certainty but more time.
`,

  why: `
**Why a broker instead of device-to-device?** Industrial protocols were built around a client that owns the conversation. That works with one SCADA server and fails when data has to reach a dozen systems. A broker moves the fan-out burden off the device and onto a server built for it, and it gives you one place to apply authentication and permissions. The tradeoff is that the broker is now a critical dependency. Experienced integrators argue about whether a plant's single broker should live at the site or in the data center. The common compromise is a local broker at each site that keeps working during a WAN outage, bridged upward to a central one.

**Why QoS is per hop, and why QoS 2 is rare.** A QoS 1 publish only guarantees the message reached the broker. It says nothing about whether a subscriber got it. If a subscriber is offline with a clean session, the message is simply gone. This surprises people who assume QoS means end to end. Use persistent sessions when subscribers must not miss data, and put a sequence number in the payload so they can tell if they did.

**Why retained messages and wills exist.** Report-by-exception style traffic has a hidden problem: a value that never changes is never sent again. Retained messages solve the late-joiner problem. Wills solve the silent-failure problem, where a quiet topic could mean "stable" or "dead." Without both, a subscriber cannot tell the difference. See {{lesson:proto-polling-rbe}}.

**Why not just use MQTT for everything?** MQTT has no data model. Two vendors can both be "MQTT compliant" and publish incompatible JSON. It also has no standard way to know which tags exist. That gap is why {{lesson:proto-sparkplug}} defines topics, birth messages and payloads on top of it.
`,

  history: `
Andy Stanford-Clark of IBM and Arlen Nipper, then at Arcom (now part of Eurotech, with Nipper later co-founding Cirrus Link), created MQTT in 1999. The use case was monitoring oil pipelines over expensive, slow satellite links where bandwidth and battery power were both scarce, so the protocol had to be tiny and tolerate dropped connections. Originally the name stood for MQ Telemetry Transport, after IBM's MQ messaging products. IBM released it royalty-free in 2010, OASIS standardized 3.1.1 in 2014, and ISO adopted it as ISO/IEC 20922 in 2016. MQTT 5 followed in 2019.
`,

  examples: [
    {
      title: "Which filters match?",
      body: `Topic published: \`meridian/plant1/area10/line1/m101/sts/running\`. **Matches:** \`meridian/plant1/area10/+/m101/sts/running\`, \`meridian/plant1/area10/line1/#\`, \`+/+/+/+/+/+/+\`, \`#\`. **Does not match:** \`meridian/plant1/area10/+/sts/running\` (wrong number of levels), \`meridian/plant1/area10/line1/m101\` (no wildcard, so it must be exact), \`meridian/plant1/area10/line2/#\` (different line).`
    },
    {
      title: "Choosing QoS for three payloads",
      body: `A tank temperature sampled every 2 seconds: **QoS 0**, because the next sample replaces any loss. A high-level alarm event: **QoS 1** with an event ID in the payload so duplicates can be discarded. A command to dump a batch where repeating would be harmful: avoid relying on QoS 2 alone. Use QoS 1 and have the receiver ignore any command ID it has already executed.`
    }
  ],

  diagrams: {
    pubsub: `<svg viewBox="0 0 640 250" role="img" aria-label="Two publishers send to topics on a broker, which forwards copies to three subscribers whose filters match">
  <defs>
    <marker id="proto-mqtt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="24">Publishers</text>
  <text class="dg-title" x="270" y="24">Broker</text>
  <text class="dg-title" x="490" y="24">Subscribers</text>
  <rect class="dg-box" x="20" y="44" width="150" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="95" y="68">Edge gateway</text>
  <text class="dg-text-mono dg-mid" x="95" y="88">line1/m101/sts</text>
  <rect class="dg-box" x="20" y="150" width="150" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="95" y="174">PLC gateway</text>
  <text class="dg-text-mono dg-mid" x="95" y="194">line1/p101/sts</text>
  <rect class="dg-box-accent" x="250" y="60" width="130" height="130" rx="8"/>
  <text class="dg-text dg-mid" x="315" y="108">MQTT</text>
  <text class="dg-text dg-mid" x="315" y="130">broker</text>
  <text class="dg-text-muted dg-mid" x="315" y="156">routes by topic</text>
  <rect class="dg-box" x="460" y="36" width="160" height="48" rx="6"/>
  <text class="dg-text-sm dg-mid" x="540" y="56">Historian</text>
  <text class="dg-text-mono dg-mid" x="540" y="74">line1/#</text>
  <rect class="dg-box" x="460" y="100" width="160" height="48" rx="6"/>
  <text class="dg-text-sm dg-mid" x="540" y="120">SCADA</text>
  <text class="dg-text-mono dg-mid" x="540" y="138">line1/+/sts/#</text>
  <rect class="dg-box" x="460" y="164" width="160" height="48" rx="6"/>
  <text class="dg-text-sm dg-mid" x="540" y="184">Cloud analytics</text>
  <text class="dg-text-mono dg-mid" x="540" y="202">#</text>
  <line class="dg-line" x1="170" y1="72" x2="248" y2="100" marker-end="url(#proto-mqtt-ah)"/>
  <line class="dg-line" x1="170" y1="178" x2="248" y2="150" marker-end="url(#proto-mqtt-ah)"/>
  <line class="dg-line" x1="380" y1="90" x2="458" y2="62" marker-end="url(#proto-mqtt-ah)"/>
  <line class="dg-line" x1="380" y1="125" x2="458" y2="124" marker-end="url(#proto-mqtt-ah)"/>
  <line class="dg-line" x1="380" y1="160" x2="458" y2="188" marker-end="url(#proto-mqtt-ah)"/>
  <text class="dg-text-muted" x="20" y="238">Neither side knows the other exists. Each connects only to the broker.</text>
</svg>`
  },

  pitfalls: [
    "Subscribing to # in production. Every message on the broker lands on one client.",
    "Reusing one client ID on two connections. The broker disconnects the older one and they fight forever.",
    "Assuming QoS 1 means the subscriber got it. It only covers each hop separately.",
    "Using plain port 1883 across a plant boundary, with the password in clear text.",
    "Forgetting to retain status and birth-style messages, so late-joining clients see nothing until the next change.",
    "Letting a persistent session for a dead client queue messages until the broker runs out of memory."
  ],

  keyTerms: ["mqtt", "mqtt-broker", "mqtt-topic", "pub-sub", "mqtt-qos", "retained-message", "last-will", "persistent-session"],

  quiz: [
    {
      q: "A historian, an MES and a cloud tool all need the same 500 tags from a gateway that has limited CPU. What does MQTT change?",
      options: [
        "Each consumer still connects to the gateway, but with less overhead",
        "The gateway publishes once to the broker and the broker fans out to all three",
        "The tags must be duplicated on three topics",
        "The consumers must poll the broker for changes"
      ],
      answer: 1,
      explain: [
        "Consumers never connect to the publisher in pub/sub.",
        "Correct. The producer does the work once and the broker handles the fan-out.",
        "One topic can have any number of subscribers.",
        "Subscribers are pushed messages over their open connection. They don't poll."
      ]
    },
    {
      q: "Which filter matches meridian/plant1/area10/line1/m101/sts/running but NOT meridian/plant1/area10/line1/zone4/m101/sts/running?",
      options: ["meridian/plant1/#", "meridian/plant1/area10/line1/#", "meridian/plant1/area10/+/m101/sts/running", "meridian/plant1/area10/+/+/m101/sts/running"],
      answer: 2,
      explain: [
        "# matches everything below plant1, including the zone4 topic.",
        "# also matches the longer topic.",
        "Correct. + matches exactly one level, so the extra zone4 level breaks the match.",
        "This has eight levels in total, so it matches only the longer zone4 topic, the opposite of what you want."
      ]
    },
    {
      q: "A publisher sends QoS 1 and a subscriber is offline with a clean session. When it reconnects, what happens?",
      options: [
        "It receives everything it missed because QoS 1 guarantees delivery",
        "It receives only the retained message, if one exists, and the messages it missed are gone",
        "The broker rejects the reconnection",
        "The publisher resends automatically"
      ],
      answer: 1,
      explain: [
        "QoS 1 guarantees delivery only to the broker, then to a currently subscribed session.",
        "Correct. A clean session discards subscriptions and queued messages on disconnect. Only retained messages are delivered on new subscription.",
        "The broker accepts the connection normally.",
        "The publisher's responsibility ended when the broker acknowledged."
      ]
    },
    {
      q: "A status topic shows 'online' hours after a gateway lost power. What was most likely missing?",
      options: ["A higher QoS", "A Last Will and Testament message set to offline", "A persistent session", "Port 8883"],
      answer: 1,
      explain: [
        "QoS does not announce a dead client.",
        "Correct. The will is published by the broker when the client vanishes without a clean disconnect. Without one, nothing updates the topic.",
        "A persistent session keeps subscriptions and queued messages. It does not publish status.",
        "TLS secures the connection and does not report failure."
      ]
    },
    {
      q: "A new dashboard connects and shows blank values for slow-changing tags until they change. What fixes it?",
      options: [
        "Publish with the retain flag",
        "Change the broker port",
        "Switch to QoS 0",
        "Add a + wildcard to the subscription"
      ],
      answer: 0,
      explain: [
        "Correct. The broker stores the last retained value per topic and delivers it to each new subscriber.",
        "Ports have nothing to do with message content.",
        "QoS 0 reduces delivery guarantees and does not store anything.",
        "Wildcards control which topics match, not whether stored values are delivered."
      ]
    },
    {
      q: "Which port should an MQTT client use to reach a broker across the public internet?",
      options: ["1883", "502", "8883 with TLS", "4840"],
      answer: 2,
      explain: [
        "1883 is plain text, so credentials and data are visible.",
        "502 is Modbus TCP.",
        "Correct. 8883 is the registered port for MQTT over TLS.",
        "4840 is the default OPC UA port."
      ]
    }
  ],

  resources: [
    { title: "MQTT FAQ", url: "https://mqtt.org/faq/", type: "docs", source: "mqtt.org" },
    { title: "Introducing the MQTT Protocol (MQTT Essentials part 1)", url: "https://www.hivemq.com/blog/mqtt-essentials-part-1-introducing-mqtt/", type: "article", source: "HiveMQ" },
    { title: "The Origin of MQTT", url: "https://www.hivemq.com/blog/the-history-of-mqtt-part-1-the-origin/", type: "article", source: "HiveMQ" },
    { title: "Introduction to MQTT 5 (MQTT 5 Essentials part 1)", url: "https://www.hivemq.com/blog/mqtt5-essentials-part1-introduction-to-mqtt-5/", type: "article", source: "HiveMQ" },
    { title: "Andy Stanford-Clark", url: "https://en.wikipedia.org/wiki/Andy_Stanford-Clark", type: "article", source: "Wikipedia" }
  ]
});
