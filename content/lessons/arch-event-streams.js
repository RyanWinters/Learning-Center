LC.lesson({
  id: "arch-event-streams",
  title: "Event Streams and Kafka (8.3)",
  track: "arch",
  minutes: 20,
  level: 4,
  prereqs: ["arch-webdev", "proto-mqtt"],
  tags: ["event-streams", "kafka", "mqtt", "pipeline", "8.3", "integration"],
  summary: "Event streams are 8.3 project resources that move events from a source through filter, transform and buffer stages to handlers, with Kafka as a first-class source and destination.",
  objectives: [
    "Describe the stages of an event stream and what each does",
    "Name the main sources and handlers and the module each depends on",
    "Explain why an event-driven pipeline beats polling for integration traffic",
    "Explain Kafka topics, partitions and consumer groups well enough to size a design",
    "Choose between an event stream, a gateway script and a WebDev endpoint for a job"
  ],

  body: `
## What an event stream is

Plants generate events: a tag changes, a message arrives, a batch completes. Integration code that reacts to those events used to mean a pile of tag change scripts, each with its own error handling and its own bugs. **Event Streams**, new in Ignition 8.3, make that pipeline a first-class **project resource**. You describe where events come from, how they are cleaned up, and where they go. The gateway handles queueing, batching and failure.

An event stream is configured in the Designer like any other resource, stored in the project, and versioned with it. It needs a full gateway. The [Event Streams page of the 8.3 manual](https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/event-streams) lists them as not supported on Ignition Edge (see {{lesson:arch-edge}}).

## The pipeline

Every stream is the same shape.

{{diagram:pipeline}}

| Stage | Job | Typical setting |
|---|---|---|
| **Source** | Where events originate | Tag Event, Kafka topic, HTTP endpoint, MQTT message |
| **Encoder** | Decodes raw bytes into an object the later stages can read | JSON, string, bytes |
| **Filter** | A script that drops events you do not want | Ignore bad quality, ignore tiny changes |
| **Transform** | A script that reshapes the event | Tag change to a flat JSON record |
| **Buffer** | Holds events briefly, so they can be sent in groups | Debounce, max wait, max queue size, overflow rule |
| **Handler(s)** | Does the work with each event or batch | Publish to Kafka, insert into a database, call HTTP, write a tag, run a script |
| **Error handler** | Decides what happens when a handler fails | Ignore, abort, retry |

### Sources

The 8.3 manual lists these sources. Some need other modules.

- **Tag Event**: reacts to a tag's value, quality or timestamp changing.
- **HTTP Endpoint**: opens a URL that accepts POST and PUT. Needs the Web Dev module ({{lesson:arch-webdev}}).
- **Kafka**: consumes a topic. Needs the Kafka module (one of the Cloud Connector modules).
- **Event Listener**: receives events raised inside the gateway.
- **MQTT**: Cirrus Link's MQTT Transmission and MQTT Engine modules add event stream sources and handlers for raw MQTT messages, and Engine also for Sparkplug ({{lesson:proto-sparkplug}}).

### Handlers

| Handler | What it does | Notes |
|---|---|---|
| Script | Runs your Python for each event | Escape hatch for anything unusual |
| HTTP | Sends outbound POST or PUT | Headers, body expression, timeouts |
| Database | INSERT or UPDATE into a SQL connection | Can create the table; needs SQL Bridge |
| Tag | Writes event data to a tag | Path, value, quality, timestamp as expressions |
| Kafka | Publishes to a topic | Needs the Kafka module |

Handlers read event fields with expressions such as \`{event.data.value}\` or \`{event.metadata.tagPath}\`. Several handlers can run in order for one stream.

## The buffer is where the engineering is

The buffer is a staging area between transform and handlers. It exists because sending one network message per event is slow and fragile. Its main settings:

- **Debounce**: how long to wait for quiet before flushing.
- **Max wait**: the longest an event may sit before being flushed.
- **Max queue size**: how many events the buffer holds before the overflow rule applies.

The buffer page of the 8.3 manual lists the defaults for these settings. Look them up for your version and set them deliberately.
- **Overflow**: if the queue is capped, whether to drop the oldest or the newest.

> [!warning] Check what "zero" means
> Forum reports on 8.3 file-based streams describe a batch timer of 0 meaning *disabled*, not *immediate*, and an error strategy of IGNORE showing a healthy handler that delivers nothing. These are community observations. Test failure paths on your own version, by unplugging the broker, before you trust a stream with production data.

## Why event-driven instead of polling

{{lesson:proto-polling-rbe}} explains why report-by-exception beats polling at the device layer. The same logic applies to integration. A script that queries the historian every five seconds to find "new" rows does work when nothing changed, misses fast changes between polls and needs its own bookkeeping to avoid sending duplicates. An event-driven stream does work only when something happens, carries each event once, and lets the buffer absorb bursts.

The tradeoff is operational. Pipelines run unattended, so you must decide up front what happens when the destination is down: drop, queue in memory, or buffer on disk somewhere else. An event stream's in-memory buffer is not a durable store.

## Kafka in ten minutes

**Apache Kafka** is a distributed log. Producers append records to **topics**. Consumers read them at their own pace. Records stay on disk for a retention period, so a slow or restarted consumer catches up rather than losing data.

- A **topic** is a named stream, like \`plant1.line3.counts\`.
- A topic is divided into **partitions**. Each partition is an ordered log. Order is guaranteed only within a partition. A record's **key** (say, the line ID) decides its partition, so all events for one key stay in order.
- A **consumer group** is a set of consumers that share a topic. Each partition is read by exactly one consumer in the group, so adding consumers up to the partition count increases throughput. A different group reads the same topic independently, with its own position.
- A consumer tracks an **offset**: how far it has read. After a restart it resumes from the committed offset.

> [!example] Sizing a design
> Four production lines publish a count every second. You key records by line ID on a 4-partition topic \`plant1.counts\`. Group \`historian-writer\` has two consumers that write to a database, two partitions each. Group \`dashboard\` is a separate consumer that reads the same records for a live view. With four partitions, a third consumer in \`historian-writer\` makes the split 2/1/1 and none sits idle. A fifth consumer would sit idle until you add partitions.

Kafka is not a tag historian and not a database. It is the durable pipe in the middle, which suits an enterprise that has many consumers. For a lightweight plant-to-cloud path, {{lesson:proto-mqtt}} with a broker is simpler. Kafka starts to pay off when many teams consume the same stream or when you need replay.

## A worked stream: line counts to Kafka

Goal: publish a JSON record whenever \`[default]Plant1/Area20/Line1/GoodCount\` changes, at most once per second per batch.

1. **Source**: Tag Event on the tag, trigger on value change.
2. **Filter**: drop events where \`quality\` is not good.
3. **Transform**: return \`{"line": "Line1", "good": value, "ts": timestamp}\`.
4. **Buffer**: debounce 200 ms, max wait 1000 ms, max queue 5000, drop oldest.
5. **Handler**: Kafka, topic \`plant1.counts\`, key from the line field.
6. **Error handler**: retry, with alarms on the stream's diagnostics.

Verify end to end by running a console consumer on the broker and bumping the count in the simulator. Then stop the broker and confirm what the stream does, because that is the behavior you will be judged on.

## Choosing the tool

| Need | Use |
|---|---|
| React to a tag, publish elsewhere, batching and retry | Event stream |
| Answer a question on demand ("what is the level?") | WebDev endpoint |
| One-off logic tightly tied to a single tag or alarm | Gateway script |
| Many sites to a broker with plug-and-play tag models | MQTT and Sparkplug, as in {{lesson:mes-uns}} |
`,

  eli5: `
Imagine a mailroom. Letters arrive at the front desk from all over. That desk is the source.

A clerk throws out junk mail. That is the filter. Another clerk opens each envelope and copies the important line onto a standard card. That is the transform. The cards go into a tray, and when the tray is full or a few seconds pass, someone carries the whole stack to the right office at once. The tray is the buffer, and the person carrying the stack is the handler.

If the office is closed, there is a rule written down: wait and try again, or throw the cards away. That is the error handler.

Kafka is like a very big, very orderly filing wall behind the mailroom. Every card gets filed on a shelf in order, and it stays there for days. Different offices can each keep their own bookmark on the shelf, so one can read slowly and another fast, and nobody loses a card.
`,

  why: `
**Why make the pipeline a resource?** Before 8.3, the same job was a tag change script with a try/except, a hand-rolled queue and a retry loop copied from the last project. Each copy drifted. A first-class resource gives you one place to see the stages, one set of diagnostics and one thing to put in version control. The tradeoff is that you work inside the stage model. For odd logic you fall back to a script handler.

**Why buffer at all?** One database insert per tag change looks fine until a PLC reboots and 8,000 tags change in a second. Batching turns a storm into a few writes. The cost is latency, up to the max-wait setting, and a window of events held in memory. Pick the latency you can live with, then size the queue for the worst burst.

**Why Kafka rather than MQTT?** Both move messages. MQTT is built for many small, unreliable devices and a lightweight broker. Kafka is built for high-volume enterprise data with replay and many independent consumers. Integrators often use both: Sparkplug and MQTT at the edge, a bridge into Kafka at the enterprise boundary. Choosing Kafka when one consumer needs one stream is extra infrastructure to run for no gain.

**Why partitions matter early.** The partition count caps consumer parallelism, and increasing it later can change which partition a key lands on, breaking ordering assumptions. Choose the key (line, asset, site) from the ordering you need, then pick a partition count with growth in mind.

**Why test the failure path.** In integration, the happy path always works. The question that costs money is what the stream does at 2 a.m. when the broker is gone. Decide, test and document it.
`,

  history: `
Kafka was created at LinkedIn to move activity data between systems and was open-sourced through the Apache Software Foundation. Industrial sites adopted it as OT data began to feed enterprise analytics. Ignition 8.3 brought event streams into the platform as a native module, alongside the Kafka module, so plant data could join that pipeline without custom code.
`,

  examples: [
    {
      title: "Downtime events into a database",
      body: `A tag event source watches \`Plant1/Area20/Line1/State\`. The filter keeps only transitions into Fault or out of Fault. The transform builds \`{line, state, ts}\`. A database handler inserts into \`downtime_event\` with a column mapping. The buffer batches inserts at 500 ms, so a plant-wide fault storm becomes a few writes instead of hundreds.`
    },
    {
      title: "Partner webhook into a tag",
      body: `A supplier's system posts "pallet arrived" JSON to an HTTP endpoint source. The filter rejects bodies without a pallet ID. A script handler looks up the dock door and a tag handler writes the pallet ID to \`Receiving/Door4/Pallet\`. Because the endpoint is a WebDev-backed source, require authentication on it just as you would on any other.`
    }
  ],

  diagrams: {
    pipeline: `<svg viewBox="0 0 640 210" role="img" aria-label="Event stream stages: source, filter, transform, buffer, then handlers such as Kafka, database and HTTP, with an error handler beneath">
  <defs>
    <marker id="arch-event-streams-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker>
  </defs>
  <rect class="dg-box" x="10" y="50" width="95" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="57" y="76">Source</text>
  <text class="dg-text-muted dg-mid" x="57" y="96">tag, Kafka</text>
  <rect class="dg-box" x="135" y="50" width="95" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="182" y="86">Filter</text>
  <rect class="dg-box" x="260" y="50" width="95" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="307" y="86">Transform</text>
  <rect class="dg-box-accent" x="385" y="50" width="95" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="432" y="76">Buffer</text>
  <text class="dg-text-muted dg-mid" x="432" y="96">batch</text>
  <rect class="dg-box" x="520" y="12" width="110" height="38" rx="6"/>
  <text class="dg-text-sm dg-mid" x="575" y="36">Kafka</text>
  <rect class="dg-box" x="520" y="60" width="110" height="38" rx="6"/>
  <text class="dg-text-sm dg-mid" x="575" y="84">Database</text>
  <rect class="dg-box" x="520" y="108" width="110" height="38" rx="6"/>
  <text class="dg-text-sm dg-mid" x="575" y="132">HTTP / tag</text>
  <line class="dg-line" x1="105" y1="80" x2="133" y2="80" marker-end="url(#arch-event-streams-ah)"/>
  <line class="dg-line" x1="230" y1="80" x2="258" y2="80" marker-end="url(#arch-event-streams-ah)"/>
  <line class="dg-line" x1="355" y1="80" x2="383" y2="80" marker-end="url(#arch-event-streams-ah)"/>
  <line class="dg-line" x1="480" y1="70" x2="518" y2="32" marker-end="url(#arch-event-streams-ah)"/>
  <line class="dg-line" x1="480" y1="80" x2="518" y2="80" marker-end="url(#arch-event-streams-ah)"/>
  <line class="dg-line" x1="480" y1="90" x2="518" y2="126" marker-end="url(#arch-event-streams-ah)"/>
  <rect class="dg-box" x="385" y="165" width="245" height="34" rx="6"/>
  <text class="dg-text-sm dg-mid" x="507" y="187">Error handler: ignore, abort, retry</text>
</svg>`
  },

  pitfalls: [
    "Trusting the in-memory buffer as durable storage. A gateway restart loses what it holds.",
    "Assuming a batch timer of 0 means 'immediately'. Test what your version does.",
    "Setting the error strategy to ignore and then seeing a healthy stream that delivers nothing.",
    "Picking a Kafka key without thinking about ordering, then discovering related events landed on different partitions.",
    "Planning an event stream for an Ignition Edge gateway. It is not supported there.",
    "Forgetting the module dependencies: Kafka needs the Kafka module, HTTP source needs Web Dev, the database handler needs SQL Bridge."
  ],

  keyTerms: ["event-stream", "kafka", "kafka-topic", "kafka-partition", "consumer-group", "report-by-exception", "mqtt-broker"],

  quiz: [
    {
      q: "A PLC reboot makes 8,000 tags change at once and your stream inserts each change into a database one by one. Which stage is the right fix?",
      options: ["Filter, by dropping all events", "Buffer, by batching events with debounce and max wait before the database handler", "Source, by switching to polling", "Encoder, by changing the format"],
      answer: 1,
      explain: [
        "Dropping everything loses real data. A filter should remove only unwanted events.",
        "Correct. The buffer groups events so a burst becomes a few database writes, at the cost of a little latency.",
        "Polling does more work, not less, and loses the event-driven benefits.",
        "The encoder decodes incoming data. It does not control write frequency."
      ]
    },
    {
      q: "Four consumers in the same consumer group read a topic that has two partitions. What happens?",
      options: ["All four share the load equally", "Two are active, two sit idle, because each partition is read by one consumer in a group", "Kafka rejects the extra consumers permanently", "Each consumer gets all records twice"],
      answer: 1,
      explain: [
        "A partition is assigned to one consumer in the group, so parallelism is capped at the partition count.",
        "Correct. Throughput scales with consumers only up to the number of partitions.",
        "They are allowed. They simply wait and take over if another fails.",
        "Within one group each record is delivered to one consumer. A different group would see its own copy."
      ]
    },
    {
      q: "You need ordered processing of all events for each production line. What should you do in Kafka?",
      options: ["Use one consumer per record", "Use the line ID as the record key so a line's events share a partition", "Randomize the key for even spread", "Turn off partitions"],
      answer: 1,
      explain: [
        "Order is guaranteed per partition, so this does not help and would be extremely slow.",
        "Correct. Records with the same key go to the same partition, where order is preserved.",
        "Random keys spread one line's events across partitions and lose ordering.",
        "Every topic has at least one partition, and a single partition limits throughput."
      ]
    },
    {
      q: "A site wants to deploy event streams on Ignition Edge panels at each machine. What is the problem?",
      options: ["Edge has no Designer", "Event streams are not available on Ignition Edge, so a full gateway is needed", "Edge only supports Kafka sources", "Event streams require Vision"],
      answer: 1,
      explain: [
        "The issue is the feature, not the Designer.",
        "Correct. The Inductive Automation 8.3 Event Streams documentation lists them as not supported on Edge.",
        "There is no such restriction. The module is simply not available.",
        "Event streams are a platform feature and are not tied to Vision."
      ]
    },
    {
      q: "An outside system asks 'what is the current level of tank 4?' on demand. Which Ignition feature fits best?",
      options: ["An event stream with a tag event source", "A WebDev doGet resource", "A Kafka consumer group", "A database handler"],
      answer: 1,
      explain: [
        "Event streams push events when things change. They are not built to answer ad hoc questions.",
        "Correct. On-demand request/response is exactly what a WebDev endpoint is for.",
        "Kafka is a durable log for streams of records, not an on-demand query tool.",
        "A database handler writes events into a table. It does not serve requests."
      ]
    }
  ],

  resources: [
    { title: "Event Streams (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/event-streams", type: "docs", source: "Inductive Automation" },
    { title: "Types of Handlers (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/event-streams/types-of-handlers", type: "docs", source: "Inductive Automation" },
    { title: "Source Data and Metadata (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/event-streams/types-of-sources/source-data-and-metadata", type: "docs", source: "Inductive Automation" },
    { title: "Kafka module (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/cloud-connector-modules/kafka", type: "docs", source: "Inductive Automation" },
    { title: "Event Streams overview video", url: "https://inductiveuniversity.com/video/whats-new-event-streams", type: "video", source: "Inductive University" },
    { title: "MQTT Transmission Event Streams (8.3)", url: "https://docs.chariot.io/display/CLD83/MQTT+Transmission+Event+Streams", type: "docs", source: "Cirrus Link / Chariot" },
    { title: "Event Streams to Kafka: file-based config shapes and failure modes", url: "https://forum.inductiveautomation.com/t/event-streams-to-kafka-the-file-based-config-shapes-and-five-silent-failure-modes-to-know-about/116696", type: "forum", source: "Inductive Automation Forum" }
  ]
});
