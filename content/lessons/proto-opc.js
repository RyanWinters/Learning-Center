LC.lesson({
  id: "proto-opc",
  title: "From OPC Classic to OPC UA",
  track: "proto",
  minutes: 25,
  level: 2,
  prereqs: ["net-routing"],
  tags: ["opc", "opc-ua", "opc-da", "security", "certificates", "subscriptions"],
  summary: "How industrial software learned to share data: from fragile Windows-only OPC to OPC UA, and why certificate trust is where projects stall.",
  objectives: [
    "Explain why OPC Classic (DA, HDA, A&E) was tied to COM/DCOM and why that hurt",
    "Describe the OPC UA address space: nodes, node IDs, namespaces and browsing",
    "Distinguish sampling interval from publishing interval in a subscription",
    "Choose a security mode and explain what a certificate trust list does",
    "Describe Ignition's roles as both an OPC UA server and an OPC UA client",
    "Troubleshoot a connection that is stuck on an untrusted certificate"
  ],

  body: `
## Why OPC exists

Every PLC vendor has its own protocol, and every SCADA or historian vendor used to write a driver for each one. {{term:opc-classic|OPC}} (OLE for Process Control) was an attempt to stop that: a vendor writes one **OPC server** for its devices, and every OPC **client** can read it. The client does not care whether the other end is Modbus, EtherNet/IP or S7. For two decades this was how a SCADA package talked to a third-party driver server such as Kepware, and OPC UA is its modern replacement.

## OPC Classic

OPC Classic is a family of separate specifications:

| Spec | Purpose |
|---|---|
| **OPC DA** (Data Access) | Read and write current values of items (tags). The one most people mean by "OPC." |
| **OPC HDA** (Historical Data Access) | Read stored history from a historian |
| **OPC A&E** (Alarms & Events) | Receive alarm and event notifications |

All three were built on Microsoft **COM** and **DCOM** (Distributed COM). That meant OPC Classic only worked on Windows, and talking across machines depended on DCOM, which relies on Windows security settings, user accounts, RPC ports and firewall rules. Connections often worked on the bench and broke when a server was moved, a domain policy changed or a patch tightened DCOM defaults. The failure is subtle because DCOM connections run in **both directions**: the client calls the server, and the server calls back to the client with data. If the callback is blocked, the client shows "connected" and then gets bad-quality tags.

Because of this, integrators put the client and server on the *same* machine whenever possible, or used a tunneling product to carry OPC traffic over a single TCP port instead of DCOM. Ignition offers an OPC COM module for connecting to classic DA servers, and the documentation recommends its tunneller module over remote DCOM. You will still need it to reach old servers that have no UA interface.

## OPC UA

{{term:opc-ua|OPC UA}} (Unified Architecture) rebuilt everything. It is platform-independent (Windows, Linux, embedded devices), does not use DCOM, uses a single TCP port (commonly 4840 for a default server, but each product chooses its own, for example Ignition's is 62541), and has security built in. It also combines what DA, HDA and A&E did separately: current values, history and alarms are all available through one service model.

### The address space

A UA server presents its data as an {{term:opc-address-space|address space}}: a graph of **nodes**. A node might be an object (a Pump), a variable (the pump's \`Speed\`), a method you can call, or a type definition. Nodes have **attributes** (Value, DataType, AccessLevel, DisplayName) and **references** to other nodes (hierarchical references make the tree you see when browsing).

Every node has a {{term:node-id|NodeId}}: a namespace index plus an identifier. A NodeId of \`ns=2;s=[PLC1]Tank1.Level\` means namespace 2, string identifier \`[PLC1]Tank1.Level\`. Namespace 0 is OPC UA's own standard nodes, and each server defines the rest. Namespace indexes can change between server restarts, so well-written clients store the **namespace URI** and resolve the index at connect time.

**Browse** is how a client explores the tree: it asks a node for its children and walks down. This is what you do in Ignition's OPC browser when you pick a tag from a device. Browsing is a convenience and the NodeId is what you actually store.

> [!example] An Ignition OPC item path
> An Ignition OPC tag typically stores a server name and a path such as \`ns=1;s=[Line1_PLC]Mixer.Speed\`. The bracketed part is the device connection name, and the rest is the address in the driver. When someone renames the device connection, every tag that uses the old path goes bad.

### Reading, writing and subscribing

A client can **read** or **write** a node on demand. But the normal pattern is to **subscribe**, which means polling is done by the server on the client's behalf and only changes are reported.

{{diagram:subscription}}

A **subscription** contains a list of **monitored items** and has a **publishing interval**. The two intervals that matter:

- **Sampling interval** (per monitored item): how often the server checks the value. For a driver, this decides how often the server actually reads the device.
- **Publishing interval** (per subscription): how often the server packages queued changes and sends them to the client.

Default behavior of a monitored item is *report on change*: if the value is the same at the next sample, nothing is queued. A **deadband** can be added to ignore small changes in analog values. A queue holds samples between publishes so a fast change is not lost. If nothing changed for several publish cycles the server sends a **keep-alive**, and the client uses this to notice a dead connection.

Typical numbers: sample at 1000 ms, publish at 1000 ms for process values, and sample faster for items that matter more. Sampling faster than the device can be read gains nothing, and publishing much slower than sampling creates latency in the client.

## Security

OPC UA's security has two parts: how messages are protected, and who is allowed to connect.

| Security mode | What it does |
|---|---|
| **None** | No signing, no encryption. Fine on a bench and not on a plant network. |
| **Sign** | Messages are signed so tampering is detected, but readable. |
| **SignAndEncrypt** | Signed and encrypted. The normal choice for production. |

A **security policy** (such as Basic256Sha256, or the newer Aes128_Sha256_RsaOaep) chooses the algorithms. Older policies like Basic128Rsa15 and Basic256 are deprecated, and servers increasingly disable them.

Separately, each OPC UA application (client or server) has an **application instance certificate** that identifies it. When a client connects with a secure mode, the server checks the client's certificate and the client checks the server's. If a certificate is not in the other side's **trust list**, the connection is refused. The user may also authenticate with a username and password, or an anonymous token, on top of the application identity.

### Where projects get stuck

The typical first-day problem: you create an OPC UA connection to a third-party server, the status says Faulted or Bad, and the server logs "certificate rejected." Nothing is misconfigured. The two sides have not yet been told to trust each other.

The fix is a short, manual exchange:

1. Create the connection from the client. The server receives the client's certificate and puts it in a **rejected** or **quarantined** list.
2. On the server, open its certificate manager and move the client's certificate to **trusted**.
3. In the client, trust the server's certificate in the same way.

Ignition does not automatically accept third-party server certificates. A new, untrusted certificate shows up in a **quarantined certificates** list in the Gateway's OPC security settings, and an administrator can inspect it, trust it or delete it. Upgrading from 8.1 to 8.3 generates new client and server certificates, so third-party servers and clients must trust the new ones, and a redundant backup Gateway needs the same manual step. Certificates Ignition regenerates itself are trusted automatically by that Gateway.

> [!warning] Don't turn security off to "make it work"
> Both Ignition and many servers can be set to no validation or the None mode for testing. That is acceptable for ten minutes on a bench, and a hazard once it ships. A plant OPC UA endpoint with no encryption and anonymous login lets anyone on the network read and write control tags.

Other certificate gotchas: a certificate's **hostname/URI** must match how the client addresses the server (connecting by IP when the cert says a hostname can fail validation); certificates **expire**, and an expired one brings a working system down on its anniversary; and a replaced server machine has a new certificate, so trust must be redone.

## Ignition as OPC UA server and client

Ignition's OPC UA module acts as both, at the same time.

- **As a server.** Every device connection (Logix, Modbus, S7) lives *inside* Ignition's built-in OPC UA server. Ignition tags read from the devices through it, and other systems can connect to Ignition's server as OPC UA clients to read your data, using their own certificate that you must trust on the Gateway's **Server** tab.
- **As a client.** Ignition can connect to other OPC UA servers (a Kepware server, a vendor's embedded server, another Ignition Gateway). These show up as OPC connections, and Ignition reads them through its client. Its certificates live on the **Client** tab.

So there are two certificate lists in Ignition, one for each role, and which one you need depends on who is connecting to whom. See {{lesson:ign-devices}}. For Ignition 8.3, the details of the quarantine workflow are in the OPC UA security settings page of the manual. In 8.1 the layout of the security screens differs, so use the 8.1 manual if you run that version.

> [!note] In 8.1
> The same trust concepts apply to 8.1, but the screen names and the certificate generated at upgrade differ. Read the 8.1 OPC UA Security page for exact menu names.
`,

  eli5: `
Imagine every appliance in a house speaks a different language: the oven speaks French, the fridge Japanese, the washing machine German. You want one app on your phone that can ask them all how they're doing.

OPC is like hiring an interpreter for each appliance. The old interpreters (OPC Classic) only worked inside one particular brand of house (Windows) and used a fragile telephone system (DCOM) that broke whenever somebody changed the phone settings.

OPC UA is a new kind of interpreter who works in any house, uses normal mail, and always checks ID. Before it will pass on a word, both sides show a passport (a certificate). Each has to say "yes, I know that person" (trust) before the conversation begins.

Instead of asking the oven every second, you can say "tell me if the temperature changes." You also pick how often the oven looks at its own thermometer (sampling) and how often a message is sent to you (publishing).
`,

  why: `
**Why did OPC Classic fail to scale?** It tied an industry-wide standard to one operating system's remote-call mechanism. DCOM was designed for trusted office networks, and it needs reliable name resolution, matching accounts and open RPC ports. In a plant with firewalls and domain policies it is brittle. Every large integrator has a war story about a plant stopped by a Windows update that tightened DCOM. UA removes the dependency and uses ordinary TCP.

**Why subscriptions rather than polling?** Polling asks a thousand questions every second to learn that nothing changed. A subscription lets the server do the sampling close to the source and send only changes, which cuts network load and makes slow links usable. The cost is that you must think about two intervals, a queue size and a deadband. Setting the sampling interval below what the device can deliver just adds load. Setting the publishing interval above the sampling interval delays the news, and a short queue can lose intermediate values in a burst.

**Why is certificate trust such a burden?** Because the design is safe by default, and no one can read your plant's data unless an administrator allowed that specific application. The trade is operational friction at commissioning, at upgrade, at server replacement and at expiry. The mature approach: keep a list of every OPC UA connection in the plant with its two certificates and expiry dates, trust only what is needed, use sensible lifetimes and avoid blanket "trust everything" settings. Teams that disable validation to save time usually discover the cost during a security audit.

**Why not just use OPC UA for everything?** It is excellent for SCADA-to-device and server-to-server links, but heavier than MQTT for many remote edge sites, and its client/server nature (the client must reach the server's port) is awkward across firewalls. This is part of why {{lesson:proto-sparkplug}} exists. Choose by the network shape, not by fashion.
`,

  history: `
The OPC Foundation was formed in 1996 by a group of automation vendors with Microsoft, and the first OPC specification used COM to let Windows applications share process data. OPC UA was developed in the 2000s and released in 2008 as a platform-independent successor, and the Foundation's later work added a binary and a JSON/MQTT-based transport, and companion specifications that define standard models for devices such as CNC machines and robots. Classic OPC is still installed in a very large number of plants.
`,

  examples: [
    {
      title: "Connecting Ignition to a Kepware server",
      body: `On the Gateway, add an OPC UA connection with the endpoint URL of the Kepware server (for instance \`opc.tcp://kepware-host:49320\`) and a security policy such as Basic256Sha256 with SignAndEncrypt. The connection reports Faulted. Ignition's server certificate appears as rejected in Kepware's OPC UA configuration, so trust it there. Back in Ignition, Kepware's certificate appears under quarantined certificates on the Client tab. Trust it, and the connection goes Connected. Tags can then be browsed.`
    },
    {
      title: "Sizing intervals for a tank level",
      body: `A tank level changes slowly, and the PLC scan is 50 ms. In a tag group or subscription, set the sampling interval to 1000 ms with a 0.5 percent deadband and a publishing interval of 1000 ms. The server samples once a second, queues only values that moved at least 0.5 percent and sends one message per second. A motor current used for a trend might sample at 250 ms. Setting 10 ms on either wastes bandwidth.`
    }
  ],

  diagrams: {
    subscription: `<svg viewBox="0 0 640 230" role="img" aria-label="A server samples a value at the sampling interval, queues only changes, and publishes the queued changes to the client at the publishing interval">
  <defs>
    <marker id="proto-opc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="24">One subscription, two clocks</text>
  <rect class="dg-box" x="20" y="44" width="120" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="80" y="68">Device</text>
  <text class="dg-text-muted dg-mid" x="80" y="88">value = 41.8</text>
  <rect class="dg-box-accent" x="250" y="44" width="150" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="325" y="68">UA server</text>
  <text class="dg-text-muted dg-mid" x="325" y="88">monitored item + queue</text>
  <rect class="dg-box" x="510" y="44" width="110" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="565" y="78">Client</text>
  <line class="dg-line" x1="142" y1="74" x2="248" y2="74" marker-end="url(#proto-opc-ah)"/>
  <line class="dg-line-accent" x1="402" y1="74" x2="508" y2="74" marker-end="url(#proto-opc-ah)"/>
  <text class="dg-text-sm dg-mid" x="195" y="126">sampling interval</text>
  <text class="dg-text-sm dg-mid" x="455" y="126">publishing interval</text>
  <text class="dg-text-muted" x="20" y="162">Samples:    41.8   41.8   41.8   42.1   42.1   42.6</text>
  <text class="dg-text-muted" x="20" y="182">Queued:     41.8   -      -      42.1   -      42.6   (changes only)</text>
  <text class="dg-text-muted" x="20" y="202">Published every publishing interval; keep-alive if the queue is empty.</text>
</svg>`
  },

  pitfalls: [
    "Debugging DCOM permissions for hours when the server could have been reached over OPC UA.",
    "Leaving a connection on security mode None after commissioning.",
    "Not trusting the certificate on both sides, then assuming the network is the problem.",
    "Connecting by IP address when the certificate names a hostname, or the reverse.",
    "Letting certificates expire with no calendar reminder.",
    "Setting sampling intervals far faster than the device or the process needs."
  ],

  keyTerms: ["opc-classic", "opc-da", "opc-hda", "opc-ae", "dcom", "opc-ua", "opc-address-space", "node-id", "opc-subscription", "sampling-interval", "publishing-interval", "opc-security-mode", "opc-trust-list"],

  quiz: [
    {
      q: "What made OPC Classic notoriously hard to deploy across machines?",
      options: ["It required Linux", "It relied on DCOM, whose security, account and callback requirements broke easily", "It only supported 8 tags per connection", "It had no support for writes"],
      answer: 1,
      explain: [
        "It was Windows-only.",
        "Correct. DCOM needs matching accounts, open RPC ports and working callbacks in both directions.",
        "There was no such low tag limit.",
        "OPC DA supported both reads and writes."
      ]
    },
    {
      q: "In an OPC UA subscription, what is the difference between the sampling interval and the publishing interval?",
      options: ["They are the same setting under two names", "Sampling is how often the server checks the value, and publishing is how often it sends queued changes to the client", "Sampling is for writes and publishing is for reads", "Publishing is how often the client polls the server"],
      answer: 1,
      explain: [
        "They are separate settings that govern two stages.",
        "Correct. The server samples items on one clock and delivers notifications on another.",
        "Both apply to data sent from the server to the client.",
        "The client does not poll in a subscription. The server publishes."
      ]
    },
    {
      q: "You create an OPC UA connection from Ignition to a vendor's server. The status is Faulted and the server log says the client certificate was rejected. What is the fix?",
      options: ["Reinstall the Ignition Gateway", "Trust Ignition's client certificate on the server, and trust the server's certificate in Ignition", "Switch the connection to OPC DA", "Increase the publishing interval"],
      answer: 1,
      explain: [
        "Nothing is broken. The two applications simply have not been told to trust each other.",
        "Correct. Trust has to be established in both directions.",
        "The question is about a UA endpoint, and DA would bring back DCOM problems.",
        "Intervals have nothing to do with identity validation."
      ]
    },
    {
      q: "Which security mode signs and encrypts messages?",
      options: ["None", "Sign", "SignAndEncrypt", "Anonymous"],
      answer: 2,
      explain: [
        "None does neither.",
        "Sign protects integrity but data stays readable.",
        "Correct. This is the normal choice on a plant network.",
        "Anonymous is a user token type and not a message security mode."
      ]
    },
    {
      q: "A third-party OPC UA client needs to read data from Ignition. Which certificate list on the Gateway does the administrator manage?",
      options: ["The Client tab, because the third party is a client", "The Server tab, because Ignition is acting as the server", "Neither, because Ignition trusts all clients", "The Gateway Network settings"],
      answer: 1,
      explain: [
        "The Client tab holds certificates for when Ignition itself is the client.",
        "Correct. For inbound connections, Ignition acts as the server, so the connecting client's certificate is trusted on the Server tab.",
        "Ignition does not automatically trust third-party certificates.",
        "Gateway Network uses a separate certificate setup."
      ]
    },
    {
      q: "A monitored item samples a tank level every 1000 ms with the publishing interval at 5000 ms. What would a client see?",
      options: ["Updates once a second", "Changes batched and delivered every five seconds, with up to five samples queued between deliveries", "No data, because publishing must be shorter than sampling", "A new value every 5000 ms regardless of the queue"],
      answer: 1,
      explain: [
        "Publishing at five seconds means the client hears about changes every five seconds.",
        "Correct. The queue holds changed samples between publishes. A short queue can drop intermediate values.",
        "A publishing interval longer than sampling is legal and common for slow data.",
        "Only changed samples are queued, and keep-alives are sent if there are none."
      ]
    }
  ],

  resources: [
    { title: "OPC UA Security Settings (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-security", type: "docs", source: "Inductive Automation" },
    { title: "OPC UA Connections (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-connections", type: "docs", source: "Inductive Automation" },
    { title: "Connecting to Kepware OPC UA (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/third-party-opc-servers/connecting-to-kepware-opc-ua", type: "docs", source: "Inductive Automation" },
    { title: "OPC COM Module (Ignition 8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/getting-started/modules-overview/additional-modules/OPC-COM-module", type: "docs", source: "Inductive Automation" },
    { title: "OPC UA Part 1: Overview and Concepts", url: "https://reference.opcfoundation.org/specs/OPC-10000-1/full", type: "standard", source: "OPC Foundation" },
    { title: "OPC UA Part 4: Services", url: "https://reference.opcfoundation.org/specs/OPC-10000-4/full", type: "standard", source: "OPC Foundation" },
    { title: "OPC Unified Architecture", url: "https://opcfoundation.org/about/opc-technologies/opc-ua/", type: "docs", source: "OPC Foundation" }
  ]
});
