LC.lesson({
  id: "plc-comms",
  title: "Produced/consumed tags, MSG and remote I/O",
  track: "plc",
  minutes: 25,
  level: 3,
  prereqs: ["plc-organization", "proto-enip"],
  tags: ["produced-consumed", "msg", "rpi", "remote-io", "cip", "connections"],
  summary: "The three ways Logix controllers move data: shared tags between controllers, MSG for one-off reads and writes, and remote I/O over EtherNet/IP.",
  objectives: [
    "Choose between produced/consumed tags, MSG and a shared I/O adapter for a given data exchange",
    "Set up a produced/consumed pair with a sensible RPI",
    "Configure a CIP data table read and write MSG, and handle its enable and error bits",
    "Describe how remote I/O adapters such as the 1756-EN2T and 5069-AENTR present racks to a controller",
    "Count connections and decide when Ignition should read tags versus the PLC using MSG"
  ],

  body: `
## Three ways to move data

A plant is rarely one controller. A filler talks to a capper, a utility skid sends status to a line PLC, and distributed racks hold the field I/O. Logix offers three main mechanisms, and each one uses a different amount of the controller's **connections**.

| Mechanism | Pattern | Timing | Cost |
|---|---|---|---|
| Produced/consumed tags | One controller publishes a tag, others subscribe | Scheduled by RPI, no logic needed | Connections on both sides, fixed rate |
| MSG instruction | Logic triggers a read or write of a tag in another device | On demand, whenever the rung fires | Uses a connection or unconnected request; shares the controller's message queue |
| Remote I/O | Controller owns modules in a remote chassis or block | Scheduled by RPI per module | One connection per module or per adapter |

## Produced and consumed tags

A {{term:produced-consumed|produced tag}} is a controller-scoped tag that one controller makes available to others. A consumer controller defines a **consumed tag** that points at the producer, and the data arrives on a schedule with no ladder logic. Both sides must be controller-scoped tags of the same data type, and a controller cannot consume its own produced tag.

Steps:

1. In the producer, create a tag \`Line1_To_Line2\` of a UDT type, and set its type to **Produced** with the number of allowed consumers.
2. In the consumer, add the producer controller to the I/O tree, create \`Line1_To_Line2\` with the same UDT, type **Consumed**, pick the producer and the tag name.
3. Set the **RPI** (see below). The consumer sees a new value every RPI.

Use a UDT for the payload, with a status DINT in the first member. Both ends must use an identical definition. Changing the UDT on one side without the other breaks the connection (a type mismatch fault).

> [!tip] Heartbeat
> Add a counter or timestamp to the produced data and watch it on the consumer. If the value stops changing for a few RPIs, the data is stale even if the connection bit still looks fine.

### RPI

The {{term:rpi|Requested Packet Interval}} is how often a connection exchanges data. It is set in milliseconds, per connection. A 20 ms RPI means 50 updates per second. Smaller is not better. Fast RPIs load the controller and the network, and the data cannot be used faster than the program scan reads it. As rough starting points (not limits), fast signals get a short RPI, general I/O a moderate one, and status shared between lines a slow one. Take the allowed range and defaults from the module's documentation. On EtherNet/IP, RPI values are delivered over Class 1 implicit messaging, usually multicast for inputs and unicast where configured.

## The MSG instruction

The {{term:msg-instruction|MSG}} instruction sends one request. It is used for reads and writes to another Logix controller, or a PLC-5, SLC or a third-party device that speaks CIP or one of the legacy protocols.

For Logix to Logix, the message type is **CIP Data Table Read** or **Write**.

| Field | Read example |
|---|---|
| Message type | CIP Data Table Read |
| Source element | \`Recipe_Active\` (in the target) |
| Number of elements | 1 |
| Destination element | \`Line2_Recipe\` (local) |
| Path | \`1, 0\` for backplane slot 0 or \`LINE2_PLC\` if in the I/O tree |
| Connected | Yes (recommended) |

The message control tag has status bits:

| Bit | Meaning |
|---|---|
| \`.EN\` | Enabled. Set when the MSG rung goes true and the message starts. It stays set until the message finishes (\`DN\`) or fails (\`ER\`), even if the rung goes false in the meantime. |
| \`.DN\` | Done. The message completed successfully. |
| \`.ER\` | Error. The message failed. \`.ERR\` and \`.EXERR\` hold the error codes. |

\`.DN\` and \`.ER\` clear when the MSG rung next goes true and a new message starts, so they are the result of the *last* request, not a trigger. The handshake is to start one message, wait for \`DN\` or \`ER\`, record the result, then wait before starting the next. A complete polling set is three rungs, in this order:

\`\`\`ladder
XIC(Poll_Enable) TON(Poll_Timer,1000,0)
\`\`\`

\`\`\`ladder
[XIC(Msg_Read.DN) ,XIC(Msg_Read.ER)] ONS(Msg_Done_OS) RES(Poll_Timer)
\`\`\`

\`\`\`ladder
XIC(Poll_Timer.DN) XIO(Msg_Read.EN) MSG(Msg_Read)
\`\`\`

How it flows: the timer reaches its preset and the MSG rung goes true, starting the message (\`EN\` on, old \`DN\`/\`ER\` cleared). While \`EN\` is on, the \`XIO(Msg_Read.EN)\` contact stops the rung from retriggering. When the message completes, \`EN\` drops and \`DN\` or \`ER\` comes on, and the reset rung (the one-shot makes it act for one scan only, so the timer can restart) clears the timer, which also clears \`Poll_Timer.DN\`. The reset rung sits *before* the MSG rung so that the timer's done bit is cleared in the same scan that \`EN\` drops. In the other order, the MSG rung would see a true timer and a false \`EN\` for one scan and fire a second message. Add your own handling for \`ER\`, for example a retry counter and a comms-lost alarm.

Many integrators prefer **read** messages over **write** messages when they can. A read runs in the controller that needs the data, so that controller owns the timing and a communications loss shows up on the side that cares. The Logix 5000 messaging manual (1756-PM012) covers message types and the controller's message queue. The queue size, and what happens when it is full, depend on the controller, so check that manual for your model before you design many simultaneous messages.

Use produced/consumed for steady, repeating data, such as a status block every 100 ms. Use MSG for infrequent or operator-driven transfers, such as loading a recipe on demand. A MSG that fires every scan is a sign you wanted produced/consumed.

## Remote I/O and adapters

Remote I/O puts modules away from the controller, near the equipment, to save wiring.

- **1756-EN2T** (and newer EN2TR, EN4TR): an EtherNet/IP bridge module in a ControlLogix chassis. In a *remote* chassis it carries the I/O to the controller. In the local chassis it carries the controller's traffic to the network.
- **1734-AENTR** and **5069-AENTR**: adapter modules for POINT I/O and Compact 5000 I/O. They sit at the head of a rack of I/O modules, with one network connection to the controller.

In Studio 5000 you add the adapter under the controller's Ethernet bridge in the I/O tree, give it an IP address, and then add each I/O module beneath it. The controller creates tags like \`Rack3:2:I.Data\` for each module. You choose the RPI per module (or **rack optimized** connections, where a single connection serves a whole rack of discrete modules).

{{diagram:mech}}

### Counting connections

Each controller has a connection limit, and the numbers depend on the model and on the communication modules installed. Every produced tag with a consumer, every consumed tag, every I/O module with a direct connection, every connected MSG and every connection from an HMI or Ignition uses one. Exceeding the limit gives "connection request error" on new devices. Reduce use by rack-optimizing discrete I/O, combining several values into one produced UDT, and using unconnected or cached MSGs only where needed. Check the numbers for your controller in Rockwell's Design Considerations reference.

## Ignition and the PLC

Ignition's Logix driver reads tags directly by name over EtherNet/IP using CIP. It opens connections to the controller and reads many tags per packet, so it does not use your MSG queue. Use it for HMI and historian reads. Build the shape of the PLC tags for it: UDTs for equipment, and an HMI-facing block rather than hundreds of scattered tags.

Use MSG from the PLC when the **PLC** needs data from another controller, or when it talks to a device Ignition cannot reach. When a third-party device has only Modbus TCP or a custom protocol, the better fit is often a gateway device, or Ignition's own driver talking to the device and writing needed values to the PLC. Do not put plant-to-enterprise data flows through PLC-to-PLC MSG chains. See {{lesson:proto-enip}} for how the connections work.

## Worked example: line to line handshake

Line 1 (controller L1, ControlLogix 5580, PLC1 at 10.20.10.10) sends a start-request block to Line 2 (CompactLogix 5380, L2, PLC2 at 10.20.10.11, both on the control VLAN) and reads back its status.

- L1 produces \`L1_To_L2\` (UDT \`UDT_Handshake\`) with RPI 50 ms, and L2 consumes it.
- L2 produces \`L2_To_L1\` the same way.
- Each UDT begins with \`Heartbeat\` (DINT incremented every 500 ms). Each controller watches the other's heartbeat. If it has not changed for 2 seconds, it raises "Line 2 comms lost" and stops requesting.
- A recipe name (STRING[40]) is sent by MSG write only when the operator presses "Load recipe", because it changes rarely.

That uses two produced and two consumed connections, plus a MSG connection for a few seconds when the recipe is sent.
`,

  eli5: `
Imagine two teams in different buildings who need to share information.

Produced and consumed tags are like a bulletin board that is photocopied and posted in the other building every few seconds. Nobody has to ask. Whatever is on the board arrives.

A MSG is a phone call. You ring up only when you need something: "what is today's recipe?" You wait for an answer, and if nobody picks up, you find out and try again.

Remote I/O is like having a helper stationed far away in the field who reads the gauges and flips the switches for you. The helper reports back on a set schedule, and you tell the helper what to do the same way.

The number of conversations you can have at once is limited, like a switchboard with only so many lines. If everyone uses a line all day, there is none left.
`,

  why: `
**Why produced/consumed for steady data?** Because the controller schedules the exchange without any logic. It keeps running while ladder is stopped, it has a defined update rate, and it fails in a visible way when the link drops. A MSG fired every scan is polling in disguise, with a queue and retries.

**Why do many integrators prefer MSG reads?** The controller that reads is the one that cares whether the data is fresh. If a write MSG fails, the sender has to notice and the receiver has no idea. With a read the receiver sees the error bit and can fall back to a safe value.

**Why watch the RPI?** Teams set 2 ms RPIs everywhere because faster sounds safer. It uses CPU and bandwidth, and the scan cannot use the data faster than it executes. Pick the slowest rate the process tolerates. The bits that matter for response time, such as a safety interlock, belong in a dedicated fast connection or a safety-rated path.

**Why count connections?** Connection exhaustion is silent until you add one more drive, then a random device fails to connect. Plan the count when you size the controller, and leave headroom. That is a day-one decision, not a commissioning surprise.

**What integrators argue about.** Whether PLC-to-PLC should be produced/consumed or Ignition acting as the middleman. Direct PLC-to-PLC is faster and keeps working if the gateway is down. Going through Ignition is easier to log and monitor but couples line safety logic to a server. Interlocks stay PLC-to-PLC, and supervisory data goes through Ignition.
`,

  history: `
PLC-5 and SLC controllers used message instructions with file addresses like N7:0. Logix introduced symbolic tags and the CIP data table messages in the late 1990s, along with produced/consumed tags built on the Producer/Consumer model of ControlNet and later EtherNet/IP. Remote I/O moved from Remote I/O (RIO) and DeviceNet to EtherNet/IP adapters as Ethernet took over the plant floor.
`,

  examples: [
    {
      title: "Message path to a controller in the I/O tree",
      body: `L2 is added to L1's I/O tree as \`L2_PLC\`. The MSG path is \`L2_PLC\` and the source element is \`Recipe_Active\`. If it were not in the tree, you would type the path as \`1, 2, 2, 10.20.10.11, 1, 0\`: backplane port 1, slot 2 (the Ethernet module), Ethernet port 2, the IP address, backplane port 1, controller slot 0.`
    },
    {
      title: "Reducing connections with rack optimisation",
      body: `A POINT I/O rack with eight discrete modules uses eight direct connections if each is added separately. With a rack-optimised connection to the 5069-AENTR or 1734-AENTR, a single connection covers all eight, and the RPI is set once for the rack. Analog and specialty modules still need their own direct connections.`
    }
  ],

  diagrams: {
    mech: `<svg viewBox="0 0 640 230" role="img" aria-label="Produced and consumed tags flow on a schedule, MSG is a request and reply on demand, and remote I/O adapters pass module data on an RPI">
  <defs>
    <marker id="plc-comms-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box-accent" x="20" y="30" width="120" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="80" y="56">Controller A</text>
  <rect class="dg-box-accent" x="340" y="30" width="120" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="400" y="56">Controller B</text>
  <line class="dg-line" x1="140" y1="45" x2="338" y2="45" marker-end="url(#plc-comms-ah)"/>
  <text class="dg-text-sm dg-mid" x="240" y="38">Produced tag, every RPI</text>
  <line class="dg-line-thin" x1="338" y1="62" x2="142" y2="62" marker-end="url(#plc-comms-ah)"/>
  <text class="dg-text-sm dg-mid" x="240" y="80">MSG read reply, when asked</text>
  <rect class="dg-box" x="20" y="130" width="120" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="80" y="156">Controller</text>
  <rect class="dg-box" x="250" y="130" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="315" y="150">Adapter</text>
  <text class="dg-text-mono dg-mid" x="315" y="166">5069-AENTR</text>
  <line class="dg-line" x1="140" y1="152" x2="248" y2="152" marker-end="url(#plc-comms-ah)"/>
  <line class="dg-line" x1="380" y1="152" x2="418" y2="152"/>
  <rect class="dg-box" x="420" y="120" width="60" height="22" rx="3"/>
  <rect class="dg-box" x="490" y="120" width="60" height="22" rx="3"/>
  <rect class="dg-box" x="420" y="160" width="60" height="22" rx="3"/>
  <rect class="dg-box" x="490" y="160" width="60" height="22" rx="3"/>
  <text class="dg-text-sm dg-mid" x="450" y="136">DI</text>
  <text class="dg-text-sm dg-mid" x="520" y="136">DO</text>
  <text class="dg-text-sm dg-mid" x="450" y="176">AI</text>
  <text class="dg-text-sm dg-mid" x="520" y="176">AO</text>
  <text class="dg-text-muted" x="20" y="214">Remote I/O: one connection per module, or one per rack when rack optimised.</text>
</svg>`
  },

  pitfalls: [
    "Firing a MSG every scan. Use produced/consumed or a timer-gated request instead.",
    "Changing the UDT on one side of a produced/consumed pair and not the other.",
    "Setting every RPI to the minimum and loading the controller and the network.",
    "Running out of connections after adding a few drives, because nobody counted.",
    "Using write MSGs everywhere so the sender never learns the receiver is down.",
    "Routing safety interlocks through Ignition instead of PLC to PLC."
  ],

  keyTerms: ["produced-consumed", "msg-instruction", "rpi", "remote-io", "cip-connection", "rack-optimized"],

  quiz: [
    {
      q: "Line 1 needs to give Line 2 a status block every 100 ms, without any ladder logic to move it. What do you use?",
      options: ["A MSG fired every scan", "An Ignition script", "A GSV instruction", "Produced and consumed tags"],
      answer: 3,
      explain: [
        "A MSG every scan loads the message queue and is polling in disguise.",
        "That puts a server in the middle of a PLC interlock path.",
        "GSV reads local system data, not another controller's tags.",
        "Correct. The controller schedules it at the RPI with no logic."
      ]
    },
    {
      q: "Why do many integrators prefer read MSGs to write MSGs where possible?",
      options: ["Reads are faster on the wire", "Writes cannot be connected", "The controller that needs the data owns the timing and sees errors", "Reads do not use connections"],
      answer: 2,
      explain: [
        "Speed is similar. The reason is ownership of the result.",
        "Writes can be connected.",
        "Correct. The reader sees its own error bits and can fall back to a safe value.",
        "Connected reads do use a connection."
      ]
    },
    {
      q: "A new drive fails to connect with a connection request error, though the network is fine. What should you check first?",
      options: ["The controller's connection count", "The IP address of the HMI", "The OK light", "The Ignition license"],
      answer: 0,
      explain: [
        "Correct. Controllers and bridge modules have a limited number of connections.",
        "An HMI address does not affect a drive connection.",
        "The OK light shows controller health, not connection use.",
        "Ignition licensing does not control PLC connections."
      ]
    },
    {
      q: "What is a rack-optimized connection?",
      options: ["A faster RPI for every module", "One connection that carries all the discrete modules in an adapter rack", "A MSG with a cached path", "A produced tag with multiple consumers"],
      answer: 1,
      explain: [
        "It reduces connection count, not RPI.",
        "Correct. It trades per-module settings for fewer connections.",
        "MSG caching is a different feature.",
        "A produced tag with consumers is the produced/consumed model."
      ]
    },
    {
      q: "Ignition needs to read 400 tags from a ControlLogix. Which approach loads the PLC's MSG queue the least?",
      options: ["Have the PLC MSG each value to Ignition", "Use one MSG per tag", "Produce each tag to Ignition", "Use Ignition's Logix driver to read tags directly"],
      answer: 3,
      explain: [
        "Ignition is not a Logix target for MSG, and the messages would consume the queue.",
        "That would flood the controller's message queue and waste connections.",
        "Produced tags are for controllers, not for an HMI driver.",
        "Correct. The driver opens connections and reads many tags per packet without using MSG."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers Produced and Consumed Tags (1756-PM011)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm011_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controller Messages (1756-PM012)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm012_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Configuring Message Instructions", url: "https://www.rockwellautomation.com/en-ca/docs/studio-5000-logix-designer/37-00/contents-ditamap/studio-5000-logix-designer/configuring-message-instructions.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers I/O and Tag Data (1756-PM004)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm004_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Design Considerations (1756-RM094)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm094_-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
