LC.lesson({
  id: "ign-devices",
  title: "Device connections and the OPC UA server",
  track: "ign",
  minutes: 15,
  level: 2,
  prereqs: ["ign-install", "proto-opc"],
  tags: ["ignition", "devices", "opc-ua", "logix", "kepware", "drivers", "diagnostics"],
  summary: "Every PLC value in Ignition arrives through a device connection inside the OPC UA module. Knowing how that layer polls, groups and fails is what separates a stable system from a slow one.",
  objectives: [
    "Explain the relationship between a device connection, Ignition's built-in OPC UA server and a tag",
    "Choose between a native Ignition driver and a third-party OPC UA server such as Kepware",
    "Read device status and diagnostics to tell a network fault from an addressing fault",
    "Describe how the Logix driver reads controller tags and why tag design and External Access matter",
    "Tune request behavior (concurrency, tag grouping) without overloading a PLC"
  ],

  body: `
## The path every value takes

When you drag a tag onto a Perspective gauge, the value traveled a longer road than the screen suggests. In Ignition, PLC data enters through **device connections**. A device connection is a configured driver instance (an IP address, a driver type and a few settings) living in the Gateway's {{term:opc-ua|OPC UA}} module. Each connection publishes the device's data into Ignition's built-in **OPC UA server**. Ignition's own tags read through the built-in OPC UA module: an OPC tag is an OPC UA *client* of that server, and it references an item by server name and {{term:node-id|node ID}}.

{{diagram:path}}

So there are always two layers: the **driver** speaks the device's own protocol, and the **OPC UA server** presents everything in a uniform, browsable form. You rarely think about the second layer when using Ignition's own tags, but it is why other OPC UA clients can connect to your Gateway and see the same data.

## Native drivers

The OPC UA module ships with drivers for many device families. Typical ones include:

| Driver family | Protocol | Notes |
|---|---|---|
| Allen-Bradley Logix | {{term:ethernet-ip|EtherNet/IP}} / {{term:cip|CIP}} | ControlLogix and CompactLogix, symbolic tag names |
| Allen-Bradley legacy | CIP/PCCC | MicroLogix, SLC, PLC-5 style file addresses |
| Siemens | S7 | S7-300/400/1200/1500; 8.3 lists a Siemens Enhanced driver as new |
| Modbus | {{term:modbus-tcp|Modbus TCP}}, RTU over TCP, serial RTU | See {{lesson:proto-modbus}} |
| DNP3 | {{term:dnp3|DNP3}} | Utilities and remote sites, supports {{term:unsolicited-response|unsolicited responses}} |
| Others | BACnet, Omron, Mitsubishi and more | Availability varies by version |

A native driver is usually the first choice. There is one fewer server in the chain, usually no extra license (the Siemens Enhanced driver is not on a Platform license), and the driver lives in the same JVM as your tags. Adding a connection is a Gateway Config task: choose the driver, name the connection, enter the IP, save. Naming matters because the name becomes part of every OPC item path, for example \`[PLC1]LT101\` for the Plant1 Area10 PLC at \`10.20.10.10\`. Pick short, stable names that mean the equipment, not the date.

## Connecting to third-party OPC UA servers

Ignition can also be an OPC UA **client** to another server. You add an OPC UA connection to the server's endpoint URL, and you accept its certificate (see {{term:opc-trust-list|trust lists}}) in the Gateway. This is the route for:

- Devices with no Ignition driver, or where the manufacturer supplies an OPC UA server (a drive, a robot, a vision system).
- Existing **Kepware** (KEPServerEX / now often called a PTC Kepware server) installs that a plant already owns and trusts.
- A second Ignition Gateway's OPC UA server, when you want clean OPC UA access between systems.

| | Native Ignition driver | Third-party OPC UA server (e.g. Kepware) |
|---|---|---|
| Extra license | No | Yes, usually |
| Hops | Driver in the Gateway | Server to Ignition over OPC UA |
| Device coverage | Dozens of families | Hundreds of drivers |
| Security surface | One system | Two systems to patch, one more port |
| Use when | A good driver exists | Driver coverage or an existing standard demands it |

Do not add Kepware just because it is familiar. If a native driver exists and works, it is usually faster to set up and has fewer failure points. Add it for coverage, for a plant-wide OPC standard, or when the device vendor supports only one of them.

> [!tip] Browsing a remote server
> Once connected to a third-party server, you browse its address space in the Designer's OPC browser, then drag items into the tag tree. Tags keep the server name and node ID. If the remote server's namespace is rebuilt, node IDs can change and every tag breaks. Prefer servers whose item paths are stable.

## Device status and diagnostics

The Gateway's Status section lists every device connection with its state. Learn to read it, because most "tag is bad" tickets start here.

- **Connected**: the driver has a working link and is polling.
- **Disconnected / Faulted**: a link failed. The driver retries on a timer. Look at the error in the connection's detail page.
- **Disabled**: someone turned it off.

(The exact status labels differ a little between versions. Match them against your Gateway's Status page.)

The device page also shows per-connection statistics such as request counts, response times and the number of items subscribed. Combine them with the tag quality code on the tag itself.

| Symptom | Likely cause | First check |
|---|---|---|
| Whole device Faulted | Network path, wrong IP or slot, PLC down | Ping from the Gateway host, check the VLAN and firewall |
| Device Connected, one tag bad | Bad address or tag name | Compare the tag path to the controller tag, check data type |
| Device Connected, values stale or slow | Too many items or low concurrency | Look at response times and item counts |
| Intermittent bad quality | CPU load in PLC or switch issues | PLC comms load, network errors, duplex |

> [!warning] Ping from the right place
> A laptop that can ping the PLC proves nothing about the Gateway. The Gateway host may be on a different VLAN, behind a different firewall rule or have two NICs. Test from the Gateway machine itself.

## The Logix driver

For Allen-Bradley ControlLogix and CompactLogix, the Logix driver reads controller tags by **symbolic name**. You do not map register numbers as you do in Modbus. The tag \`LT101\` in {{term:logix-designer|Studio 5000}} becomes \`LT101\` as an OPC item, and a UDT tag such as \`M101\` appears as a folder with \`Cmd\`, \`Sts\`, \`Cfg\` and \`Alm\` below it. Arrays appear as browsable folders too. For connection tuning and bad-quality triage on this driver, continue with {{lesson:ign-logix-driver}}.

Key points:

- **Optimized for firmware v21 and up.** The driver supports newer controllers best, including 5380 CompactLogix and 5580 ControlLogix. On older firmware it works but with lower performance.
- **Connection settings.** You enter the IP address and the **communication path** (backplane and slot). For a ControlLogix, the path is typically the slot number of the controller. For a CompactLogix with built-in Ethernet the slot is usually 0. A forum report for 8.3.1 against a 5380 shows a connection stuck in a reconnect-wait state until the slot was set to 0 for the front Ethernet port.
- **CIP connection size.** Forward Open requests use a connection size, 500 by default in common practice (the 8.3 settings page does not list a default). Larger sizes allow more per packet but need the controller and network to support them.
- **Max concurrent requests.** This setting controls how many requests Ignition keeps in flight with the PLC. The default is commonly 2 (the 8.3 settings page does not list it). Raising it can reduce Ignition-side latency, and forum advice reports gains up to a point, but it increases load on the controller and too high a value can overwhelm the PLC. See {{lesson:ign-logix-driver}} for a tuning procedure.

### Controller tag design matters

A PLC polled by Ignition spends CPU time answering. How you design tags in the controller sets how efficiently Ignition can read them.

- **Group data into UDTs and arrays.** The driver can read a contiguous structure in far fewer requests than hundreds of unrelated base tags. {{lesson:plc-udt}} explains why a motor UDT helps both the PLC and Ignition.
- **Avoid reading AOI instances directly** when you can. Forum guidance says the driver can't bulk-read them efficiently. Expose the data through a UDT or mapped tags.
- **{{term:external-access|External Access}} must allow it.** A Logix tag with External Access set to None is invisible to Ignition. Read/Write is needed to write, and Read Only works for reads. Unexpected bad quality on one tag is often this property.
- **Respect the controller.** Heavy polling can show up in the controller's communication load. A continuous task with little spare time can cause comms to starve, and moving logic into a periodic task helps (forum advice).
- **Scope matters.** Program-scoped tags are addressed as \`Program:MainProgram.M101.Sts.Running\`. Controller scope is simpler to reference. The house convention keeps equipment UDT instances such as \`M101\` and \`P101\` at controller scope.

> [!example] Fixing a slow, bad-quality device (illustrative numbers)
> A CompactLogix feeds 3,000 Ignition tags, and the device shows response times near 800 ms. You find 2,200 of them are separate base tags scattered through the controller, and a tenth are inside AOI instances. You regroup them into 40 motor and valve UDTs, set External Access to Read Only for status data, raise Max Concurrent Requests from 2 to 4 and watch the PLC comms load stay below 50%. In this illustration, response times drop to about 150 ms and the bad-quality tags disappear. Your numbers will differ, so measure before and after.

## Request optimization

An OPC UA subscription gives the driver a list of items and rates. The driver groups items into as few device requests as it can, and the shape of that grouping depends on the protocol.

- **Logix**: the driver packs many tag reads into one CIP request up to the connection size. Contiguous structures help.
- **Modbus**: it groups neighboring registers into one function code request.
- **Everything**: slower tag groups mean fewer requests. Not every tag needs 100 ms. Status flags can be 1 s, and analog trends 1 to 5 s.

Practical habits:

1. Put tags on appropriate **tag groups**. Reserve fast rates for things people watch.
2. Use **separate device connections** for separate PLCs, and consider several connections to one very large PLC to increase concurrency (a forum-recommended technique).
3. Read the connection's response time and the PLC comms load together. If either is high, remove load before tuning.
4. Subscribe only what you need. Opening a screen that binds 5,000 tags creates subscriptions for all of them.

> [!note] In 8.1
> The Logix driver docs and settings pages are present in the 8.1 manual as well, and the setting names above come from there. In 8.3 the device is configured through the redesigned Config pages, and each connection is stored as a file under the Gateway's config directory (see {{lesson:ign-install}}). Verify setting names on your own Gateway.

## When things go wrong

Work down the stack. Is the device connection Connected? If not, fix the network and path. If yes, is the tag path valid? Is External Access allowed? Is the data type compatible? Only then look at performance. Do not tune concurrency to fix a bad address. The Logix-specific checklist is in {{lesson:ign-logix-driver}}. {{lesson:ign-tags}} follows the value from the device layer into the tag system.
`,

  eli5: `
Think of a translator at an international meeting. Each device speaks its own language: one speaks Allen-Bradley, another Modbus, another Siemens. Ignition has translators on staff (drivers) who each speak one language, and they all hand their notes to one front desk (the built-in OPC UA server). The front desk writes everything in the same clear style, so the rest of Ignition reads the notes without caring which language they started in.

Sometimes a device already has its own translator that writes in the same clear style, like a hired outside agency (a third-party OPC UA server such as Kepware). Ignition can read their notes too.

To keep the meeting fast, you ask for related things together, like "tell me everything about pump 3" rather than "what's pump 3's speed?" then "what's pump 3's pressure?" over and over. And you make sure the device is allowed to share the information you ask for.
`,

  why: `
**Why two layers (driver plus OPC UA server)?** Ignition made OPC UA the internal contract. Any driver, native or third-party, appears the same to tags, and any outside OPC UA client can use Ignition as a server. The cost is an extra translation step, but the benefit is that tags do not depend on driver internals.

**Why native drivers first.** Every added server is another thing to license, patch, back up and secure, and another place a fault can hide. Integrators argue about standardizing on Kepware across a plant: it gives one consistent connectivity layer for many SCADA and historian clients, but it adds a hop and a cost to Ignition. The choice depends on whether other systems also need that device data.

**Why PLC tag design is an Ignition problem.** Polling cost lands on the controller. A flat list of thousands of base tags forces many small requests, each using PLC communications time. A well-structured controller lets Ignition read in large grouped requests. That is the real reason integrators ask PLC programmers to use UDTs and arrays early, not later.

**Why External Access exists.** It stops arbitrary outside writes to critical tags and reduces the surface area exposed to anyone who can reach the controller. It also means "bad quality on one tag" is sometimes a deliberate setting and not a fault.

**Why concurrency has a ceiling.** More requests in flight improves throughput until the controller's communications capacity is saturated. Beyond that, you slow down the PLC's real work. Raise it in small steps while watching the controller's comms load.
`,

  history: `
Before Ignition, PLC data usually reached SCADA through OPC DA servers, then through vendor drivers. Ignition's OPC UA module, which includes its own server and drivers, made the OPC UA server the center of the platform. Native Allen-Bradley drivers were optimized for the Logix family around firmware v21, and Ignition 8.3 (2025) continued to add and enhance drivers, including a Siemens Enhanced driver.
`,

  examples: [
    {
      title: "An OPC item path",
      body: `Device connection named \`PLC1\` (\`10.20.10.10\`), controller UDT tag \`M101\`. The OPC item path for the running status is \`ns=1;s=[PLC1]M101.Sts.Running\`, and a tag in the default provider (\`[default]Plant1/Area10/Line1/M101/Sts/Running\`) references that node. A program-scoped tag looks like \`[PLC1]Program:MainProgram.M101.Sts.Running\`.`
    },
    {
      title: "Kepware or native?",
      body: `A plant already runs KEPServerEX for a historian and a legacy HMI, with 40 devices. Adding Ignition as a client of Kepware avoids polling the same PLCs twice from two systems. A new site with only Logix PLCs and only Ignition gets the native Logix driver and no Kepware license.`
    }
  ],

  diagrams: {
    path: `<svg viewBox="0 0 640 200" role="img" aria-label="Data path: PLC to device driver to the OPC UA server inside the Gateway to tags to Perspective, with an external OPC UA server also feeding in as a client connection.">
  <defs><marker id="ign-devices-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="10" y="30" width="100" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="60" y="60">PLC</text>
  <rect class="dg-box-accent" x="150" y="20" width="330" height="90" rx="6"/>
  <text class="dg-title" x="162" y="42">Gateway</text>
  <rect class="dg-box" x="162" y="56" width="90" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="207" y="83">Driver</text>
  <rect class="dg-box" x="262" y="56" width="100" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="312" y="76">OPC UA</text>
  <text class="dg-text-sm dg-mid" x="312" y="92">server</text>
  <rect class="dg-box" x="372" y="56" width="98" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="421" y="83">Tags</text>
  <rect class="dg-box" x="520" y="30" width="110" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="575" y="60">Perspective</text>
  <rect class="dg-box" x="150" y="145" width="150" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="225" y="172">Kepware (OPC UA)</text>
  <line class="dg-line" x1="110" y1="55" x2="150" y2="55" marker-end="url(#ign-devices-ah)"/>
  <line class="dg-line" x1="480" y1="55" x2="520" y2="55" marker-end="url(#ign-devices-ah)"/>
  <line class="dg-line" x1="300" y1="145" x2="400" y2="100" marker-end="url(#ign-devices-ah)"/>
  <text class="dg-text-muted" x="320" y="150">client connection</text>
  <text class="dg-text-muted" x="10" y="110">EtherNet/IP</text>
</svg>`
  },

  pitfalls: [
    "Testing connectivity with ping from a laptop instead of from the Gateway host.",
    "Leaving External Access at None on controller tags and chasing a phantom Ignition bug.",
    "Polling hundreds of scattered base tags instead of grouped UDTs and arrays.",
    "Raising Max Concurrent Requests without watching the PLC's communications load.",
    "Adding Kepware for a device a native driver already handles.",
    "Using a wrong slot or path for a CompactLogix and reading the error as a network fault."
  ],

  keyTerms: ["ign-device-connection", "ign-kepware", "ign-opcua-server", "external-access", "ethernet-ip", "logix-tag", "tag-array", "udt", "node-id"],

  quiz: [
    {
      q: "A Logix device connection shows Connected, but one tag has bad quality. Other tags from the same PLC work. What do you check first?",
      options: ["The tag path, data type and External Access on that controller tag", "The Gateway's HTTP port", "Replacing the network switch", "The Gateway license"],
      answer: 0,
      explain: [
        "Correct. A healthy connection with a single bad tag points at that tag's address or permissions.",
        "The HTTP port affects the web UI, not PLC polling.",
        "A switch fault would affect all tags and likely fault the connection.",
        "Licensing would not affect one tag."
      ]
    },
    {
      q: "Which is the best reason to use a third-party OPC UA server such as Kepware with Ignition?",
      options: ["It is always faster than a native driver", "Ignition cannot act as an OPC UA client", "It removes the need for tags", "Ignition has no driver for a device, or other systems also need that device data"],
      answer: 3,
      explain: [
        "It adds a hop, so it is not inherently faster.",
        "Ignition can connect to OPC UA servers as a client.",
        "Tags are still needed in Ignition.",
        "Correct. Coverage and plant-wide standards justify the extra hop and license."
      ]
    },
    {
      q: "A controller has 2,000 individually defined base tags that Ignition reads. Which change helps polling efficiency the most?",
      options: ["Increase every tag's scan rate", "Group related data into UDTs and arrays so reads combine", "Disable the OPC UA server", "Move all tags to program scope"],
      answer: 1,
      explain: [
        "Faster scan rates add load.",
        "Correct. Structured data lets the driver read more per request, reducing PLC load.",
        "The OPC UA server is part of the data path.",
        "Scope does not change how many requests are needed."
      ]
    },
    {
      q: "You raise Max Concurrent Requests from 2 to 20 and the PLC's comms load climbs near 100%. What is the right conclusion?",
      options: ["Increase it further", "The Gateway is faulty", "The setting is too high for that controller, so back it off and reduce load", "Disable External Access"],
      answer: 2,
      explain: [
        "More concurrency would worsen the overload.",
        "The Gateway is doing what you asked.",
        "Correct. Concurrency helps only until the controller's communications capacity is saturated.",
        "External Access is unrelated to throughput."
      ]
    },
    {
      q: "How does a tag in Ignition normally get PLC data?",
      options: ["The tag talks directly to the PLC with no driver", "Perspective polls the PLC", "The database sends it to the tag", "A device driver publishes into the built-in OPC UA server and the tag references that item"],
      answer: 3,
      explain: [
        "Tags do not bypass the driver and server.",
        "Perspective reads tags from the Gateway, not PLCs.",
        "The database stores history and does not feed live values.",
        "Correct. The driver feeds Ignition's OPC UA server, and OPC tags read from it as a client."
      ]
    },
    {
      q: "The Gateway connects to a PLC from a different VLAN than your laptop. Your laptop pings the PLC successfully, but the device shows Faulted. What does this show?",
      options: ["The Gateway's own network path must be tested, since your laptop's path differs", "The PLC is fine, so Ignition is wrong", "VLANs never affect Ignition", "The slot number is the cause"],
      answer: 0,
      explain: [
        "Correct. Connectivity must be tested from the Gateway host.",
        "A successful ping from elsewhere proves nothing about the Gateway's route.",
        "Routing and firewall rules matter a great deal.",
        "A wrong slot is possible, but nothing here suggests it yet."
      ]
    }
  ],

  resources: [
    { title: "Connecting to Logix (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/opc-ua/opc-ua-drivers/allen-bradley-ethernet/connecting-to-logix", type: "docs", source: "Inductive Automation" },
    { title: "Connecting to Logix v21+ (Inductive University)", url: "https://inductiveuniversity.com/videos/connecting-to-logix-v21/8.3", type: "video", source: "Inductive University" },
    { title: "Ignition & Logix best practice tips for better communications", url: "https://forum.inductiveautomation.com/t/ignition-logix-best-practice-tips-for-better-communications/60386", type: "forum", source: "Inductive Automation Forum" },
    { title: "Ignition 8.3.1 Allen-Bradley connection issue", url: "https://forum.inductiveautomation.com/t/ignition-standard-8-3-1-allen-bradley-connection-issue/111828", type: "forum", source: "Inductive Automation Forum" },
    { title: "Ignition Modules (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules", type: "docs", source: "Inductive Automation" },
    { title: "Modbus driver (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/modbus", type: "docs", source: "Inductive Automation" }
  ]
});
