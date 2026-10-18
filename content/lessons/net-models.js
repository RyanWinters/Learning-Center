LC.lesson({
  id: "net-models",
  title: "OSI and TCP/IP models, practically",
  track: "net",
  minutes: 15,
  level: 1,
  prereqs: ["net-data"],
  tags: ["osi", "tcp", "udp", "ports", "layers", "ethernet/ip"],
  summary: "Layers are a troubleshooting map. Know what lives where and you can say 'it's a layer 2 problem' and be right.",
  objectives: [
    "Name the seven OSI layers and the four TCP/IP layers and map them to each other",
    "Place real industrial things (cables, switches, IP addresses, Modbus, OPC UA) at the right layer",
    "Explain how TCP and UDP differ and when a protocol picks each",
    "Use port numbers to identify services and write a firewall rule for them",
    "Explain why EtherNet/IP uses UDP 2222 for implicit I/O and TCP 44818 for explicit messages"
  ],

  body: `
## Why layers exist

A message from an Ignition Gateway to a PLC crosses cables, switches, addresses, connections and a protocol that understands tags. Nobody builds all of that as one lump. Networks are split into **layers**, where each layer does one job and only talks to the layer above and below. A fiber cable does not care whether it carries Modbus or video. The practical payoff is troubleshooting: "link light is off" is a layer 1 problem and "wrong subnet" is layer 3, and you can stop looking at the other layers.

## The two models

The {{term:osi-model|OSI model}} has seven layers and was published by ISO in 1984. The {{term:tcp-ip-model|TCP/IP model}} has four and is what the internet actually runs on. People use OSI numbers as vocabulary and TCP/IP as reality.

{{diagram:layers}}

| OSI layer | TCP/IP layer | What it does | Industrial examples |
|---|---|---|---|
| 7 Application | Application | The actual conversation | Modbus TCP, CIP, OPC UA, MQTT, HTTP, SQL |
| 6 Presentation | Application | Encoding, encryption | TLS, OPC UA encoding, data types |
| 5 Session | Application | Sessions, connections | OPC UA secure channel, CIP connection |
| 4 Transport | Transport | End-to-end delivery, ports | TCP, UDP |
| 3 Network | Internet | Addressing and routing between networks | IP, routers, L3 switches |
| 2 Data link | Link | Delivery on one local network, MAC addresses | Ethernet frames, switches, VLAN tags |
| 1 Physical | Link | Signals on the medium | Cat6, fiber, M12 connectors, RS-485 |

In practice people lump 5-7 into "the application layer." A mantra to remember: **layer 1 cables, layer 2 switches, layer 3 routers, layer 4 ports, layer 7 your problem.**

### Encapsulation

When Ignition reads a value, the request is wrapped step by step. The Modbus request is placed in a TCP segment (adds ports and sequence numbers), which goes in an IP packet (adds source and destination IP), which goes in an Ethernet frame (adds source and destination MAC and a checksum). The receiver strips each wrapper in reverse. This is why a packet capture in Wireshark shows nested sections, and why a protocol that "runs over Ethernet" can also run over Wi-Fi: only the bottom layers change.

## Troubleshooting by layer

Walk from the bottom up.

1. **Layer 1:** Is there a link light? Is the cable good, the port enabled, the fiber clean?
2. **Layer 2:** Is the device on the right VLAN and does the switch see its MAC address? Is there a duplex mismatch?
3. **Layer 3:** Right IP, right subnet mask, right default gateway? Does ping work? (Ping uses ICMP, which rides directly on IP at layer 3. It is neither TCP nor UDP, so a good ping says nothing about any port.)
4. **Layer 4:** Is the port open? Is a firewall dropping TCP 502? Is the service listening?
5. **Layer 7:** Is the device address, unit ID, tag path or credential correct?

A PLC that answers ping but fails every Modbus read is saying "layers 1-3 are fine." Start at layer 4: is port 502 reachable? Is the connection limit on the device used up by another client?

## TCP versus UDP

Both live at layer 4 and both use **port numbers**, but they behave very differently.

| | {{term:tcp|TCP}} | {{term:udp|UDP}} |
|---|---|---|
| Connection | Handshake first (SYN, SYN-ACK, ACK) | None, just send |
| Delivery | Guaranteed: acknowledged, retransmitted, in order | Best effort: may be lost or reordered |
| Overhead | Higher (20+ byte header, state on both ends) | Lower (8-byte header) |
| Good for | Configuration, programs, tag reads, files, databases | Real-time cyclic data, discovery, time sync, multicast |
| Industrial examples | Modbus TCP, OPC UA, MQTT, HTTP, SQL, CIP explicit | EtherNet/IP implicit I/O, DNS lookups, DHCP, NTP |

The tradeoff is **reliability versus timeliness**. If a TCP segment is lost, TCP stops and resends it, and everything behind it waits. For a one-time write that is perfect. For a stream of motor-speed updates every 10 ms, the old value is worthless the moment a new one is ready. UDP just sends the next one.

## Ports

A {{term:port-number|port number}} (0-65535) tells the receiving machine which program the packet is for. An IP address finds the machine, and the port finds the service on it. A server listens on a well-known port, and the client picks a random high port for its side.

| Service | Port | Transport |
|---|---|---|
| Modbus TCP | 502 | TCP |
| EtherNet/IP explicit messaging | 44818 | TCP (and UDP for discovery) |
| EtherNet/IP implicit I/O | 2222 | UDP |
| OPC UA (standard) | 4840 | TCP |
| Ignition OPC UA server | 62541 | TCP |
| Ignition Gateway web (HTTP / HTTPS) | 8088 / 8043 | TCP |
| Ignition Gateway Network | 8060 | TCP |
| MQTT / MQTT over TLS | 1883 / 8883 | TCP |
| HTTP / HTTPS | 80 / 443 | TCP |
| SSH | 22 | TCP |
| DNS | 53 | UDP and TCP |
| DHCP | 67 / 68 | UDP |
| NTP | 123 | UDP |
| SQL Server / PostgreSQL / MySQL | 1433 / 5432 / 3306 | TCP |

Those are defaults. A site can move any of them, and **Ignition's ports are configurable**. When you write a firewall rule, you specify the source, the destination, the protocol and the port: "allow TCP 502 from the Ignition master at 10.20.30.10 to the meter's single address, 10.20.10.20." That one sentence is the difference between a segmented plant and a flat one.

## Why EtherNet/IP uses both

EtherNet/IP carries the CIP protocol, and it splits traffic into two kinds.

- **Explicit messaging** is request/response: read this attribute, upload this program, change this setting. It goes over a **TCP** connection to port **44818**, so every message is acknowledged. A configuration write must arrive and arrive once.
- **Implicit messaging** is the cyclic I/O data between a controller and its adapters, produced every Requested Packet Interval (RPI), often 5-20 ms. It is sent as **UDP** to port **2222**, frequently as multicast. Each packet carries the latest values and nothing about the previous one. A late retransmit would carry stale data, so a lost packet is simply replaced by the next one. The connection is monitored by a timeout (several missed RPIs), and the module reports a connection fault when it fires.

> [!example] A Logix controller and a Point I/O adapter
> The controller opens a CIP connection to the adapter using TCP 44818 (the forward-open handshake). Once that is established, the adapter sends its input data to the controller at the RPI over UDP 2222, and the controller sends outputs back the same way. If you set RPI to 10 ms and the network drops three consecutive packets, the connection times out and the I/O module shows a fault, even though pings still work.

This is why a firewall between a controller and a distributed rack must allow both TCP 44818 and UDP 2222, and why multicast I/O needs IGMP snooping (see {{lesson:net-vlan}}).

## Not everything uses IP

Some industrial protocols skip layers 3 and 4. **PROFINET real-time** frames and **Ethernet POWERLINK** run directly in Ethernet frames at layer 2, so they cannot be routed. Time-critical data stays on one local network. Serial protocols like Modbus RTU use layer 1 plus their own framing, with no layer 3 at all.
`,

  eli5: `
Imagine mailing a letter to someone inside a big office building. You write the message. You put it in an envelope with a person's name. You put that in an outer envelope with the building and street address. The mail carrier moves it along the road. At the other end somebody takes off the outer envelope, then the inner one, and hands your note to the right person.

Each step only cares about its own job. The road does not care what is in the letter. The mailroom does not care what the road looks like. If the letter does not arrive, you can ask one question at a time: did it leave the building, did it reach the right street, did it reach the right floor, did the right person get it?

Networks work the same way, in layers. And there are two kinds of delivery. Registered mail asks for a signature and resends if it is lost. That is slow but sure. Shouting across a room is fast and nobody checks that you were heard, which is fine if you are shouting "the score is now 3-2" every second and the next shout fixes any missed one.
`,

  why: `
**Why use layers at all?** Layers let each part change without breaking the others. We moved from coax to twisted pair to fiber to Wi-Fi at layer 1, and Modbus never noticed. We moved IPv4 to IPv6 at layer 3 and TCP is mostly unchanged. Without layering, every change would mean rewriting every protocol.

**Why teach OSI when the internet runs TCP/IP?** OSI is a vocabulary. "That's a layer 2 problem" is a shared shorthand with network engineers, firewall vendors and IT. The seven-layer details are less important than agreeing on what layers 1, 2, 3, 4 and 7 mean. Experienced integrators treat the model as a troubleshooting checklist, not a theory exam.

**Why do control protocols use UDP for I/O?** Control cares about the *latest* value, not every value. TCP's reliability adds head-of-line blocking, so one lost packet delays all that follow it. For a 10 ms I/O update the right answer is to drop the old one. That is also why implicit I/O is monitored with a timeout rather than retransmission: the controller wants to know *that* the data stopped, quickly, and trip a fault.

**What do people argue about?** Whether OT networks should be routed at all. Layer 2 protocols such as PROFINET real-time are simple and fast but cannot cross a router. IP-based protocols can be routed and secured at layer 3 and 4 by a firewall, which is why most plant-to-enterprise designs end up there. Security rules (see {{lesson:net-security}}) are written at layers 3 and 4: who may talk to whom, on which port.
`,

  history: `
The OSI reference model was published by ISO in 1984 as a framework for building open, interoperable networks. The TCP/IP protocols were developed earlier, through US research networking in the 1970s, and became the standard of the internet by the 1990s. OSI's own protocol suite lost out in the market, but its seven-layer vocabulary stuck. Industrial networking followed a similar path: proprietary fieldbuses of the 1980s and 1990s were replaced step by step by Ethernet at layers 1 and 2 with IP-based protocols above it.
`,

  examples: [
    {
      title: "Which layer is the fault?",
      body: `An HMI at 10.20.20.50 (VLAN 20) cannot read a PLC at 10.20.10.10 over Modbus TCP. Ping works. A TCP test to port 502 fails. Layers 1-3 are fine. At layer 4, either something is dropping port 502, or the PLC is not listening. The PLC's Modbus TCP server was disabled in its configuration, so there was nothing on port 502 to answer.`
    },
    {
      title: "A firewall rule between zones",
      body: `The security team asks what the Ignition Gateway needs to reach a ControlLogix controller and a Modbus power meter. Answer: TCP 44818 to the Logix (explicit messaging) and UDP 2222 if a CIP I/O connection crosses the firewall, plus TCP 502 to the meter. Everything else stays blocked.`
    }
  ],

  diagrams: {
    layers: `<svg viewBox="0 0 640 300" role="img" aria-label="OSI seven layers mapped to the four TCP/IP layers with industrial examples">
  <text class="dg-title" x="20" y="24">OSI (7)</text>
  <text class="dg-title" x="270" y="24">TCP/IP (4)</text>
  <text class="dg-title" x="440" y="24">Example</text>
  <rect class="dg-box-accent" x="20" y="36" width="230" height="30" rx="3"/>
  <text class="dg-text-sm" x="30" y="56">7 Application</text>
  <rect class="dg-box-accent" x="20" y="68" width="230" height="30" rx="3"/>
  <text class="dg-text-sm" x="30" y="88">6 Presentation</text>
  <rect class="dg-box-accent" x="20" y="100" width="230" height="30" rx="3"/>
  <text class="dg-text-sm" x="30" y="120">5 Session</text>
  <rect class="dg-box" x="20" y="132" width="230" height="30" rx="3"/>
  <text class="dg-text-sm" x="30" y="152">4 Transport</text>
  <rect class="dg-box" x="20" y="164" width="230" height="30" rx="3"/>
  <text class="dg-text-sm" x="30" y="184">3 Network</text>
  <rect class="dg-box-2" x="20" y="196" width="230" height="30" rx="3"/>
  <text class="dg-text-sm" x="30" y="216">2 Data link</text>
  <rect class="dg-box-2" x="20" y="228" width="230" height="30" rx="3"/>
  <text class="dg-text-sm" x="30" y="248">1 Physical</text>
  <rect class="dg-box-accent" x="270" y="36" width="150" height="94" rx="3"/>
  <text class="dg-text-sm" x="280" y="88">Application</text>
  <rect class="dg-box" x="270" y="132" width="150" height="30" rx="3"/>
  <text class="dg-text-sm" x="280" y="152">Transport</text>
  <rect class="dg-box" x="270" y="164" width="150" height="30" rx="3"/>
  <text class="dg-text-sm" x="280" y="184">Internet</text>
  <rect class="dg-box-2" x="270" y="196" width="150" height="62" rx="3"/>
  <text class="dg-text-sm" x="280" y="232">Link</text>
  <text class="dg-text-sm" x="440" y="88">Modbus, OPC UA, MQTT</text>
  <text class="dg-text-sm" x="440" y="152">TCP 502, UDP 2222</text>
  <text class="dg-text-sm" x="440" y="184">IP, routers</text>
  <text class="dg-text-sm" x="440" y="216">Ethernet, switches</text>
  <text class="dg-text-sm" x="440" y="248">Cat6, fiber, M12</text>
  <text class="dg-text-muted" x="20" y="285">Troubleshoot bottom up: link light, MAC/VLAN, IP/mask/gateway, port, application.</text>
</svg>`
  },

  pitfalls: [
    "Skipping layers when troubleshooting. A device that pings but will not talk Modbus is a layer 4 or 7 problem, so stop checking cables.",
    "Opening only TCP 44818 on a firewall and forgetting UDP 2222 for implicit I/O.",
    "Assuming PROFINET real-time or other layer 2 protocols will cross a router. They will not.",
    "Treating a UDP packet loss as an error to retransmit. Cyclic I/O is built to tolerate it and to time out.",
    "Memorizing OSI layer names and forgetting the practical map: cable, switch, router, port, application."
  ],

  keyTerms: ["osi-model", "tcp-ip-model", "tcp", "udp", "port-number"],

  quiz: [
    {
      q: "An operator cannot see a PLC. The PLC answers ping, but the Modbus TCP connection from Ignition is refused. Which layer do you look at next?",
      options: [
        "Layer 4: is port 502 reachable and is the PLC listening?",
        "Layer 1: replace the patch cable",
        "Layer 2: change the switch",
        "Layer 3: change the subnet mask"
      ],
      answer: 0,
      explain: [
        "Correct. Ping working proves layers 1-3. A refused TCP connection points at the port: a firewall, a disabled server or a connection limit.",
        "If the cable were bad, ping would fail too.",
        "Ping success shows frames are being switched correctly.",
        "If the mask were wrong, ping would normally fail or behave unreliably."
      ]
    },
    {
      q: "Why does EtherNet/IP use UDP for implicit I/O instead of TCP?",
      options: [
        "UDP is more secure",
        "The latest data matters more than retransmitting old data, and TCP retransmission would delay newer packets",
        "TCP cannot carry more than 500 bytes",
        "UDP uses a different cable"
      ],
      answer: 1,
      explain: [
        "UDP has no security features of its own.",
        "Correct. Cyclic I/O replaces itself every RPI, so a lost packet is superseded and a timeout flags a dead connection.",
        "TCP carries large streams with no such limit.",
        "Both run over the same Ethernet cable."
      ]
    },
    {
      q: "Which statement about a Layer 3 device is true?",
      options: [
        "It forwards frames using MAC addresses only",
        "It amplifies the signal on copper",
        "It encrypts Modbus traffic",
        "It makes decisions using IP addresses and joins different networks"
      ],
      answer: 3,
      explain: [
        "That describes a layer 2 switch.",
        "That is a layer 1 repeater function.",
        "Routers do not encrypt application data by default.",
        "Correct. Routers and L3 switches use IP addresses to move packets between subnets."
      ]
    },
    {
      q: "A security rule must allow Ignition to poll a power meter by Modbus TCP and nothing else. Which rule is the tightest correct one?",
      options: [
        "Allow all traffic from the gateway to the meter",
        "Allow UDP 2222 from the gateway to the meter",
        "Allow TCP 502 from the gateway IP to the meter IP",
        "Allow TCP 44818 from any host to the meter"
      ],
      answer: 2,
      explain: [
        "That is broad and allows every service on the meter.",
        "UDP 2222 is EtherNet/IP implicit I/O, not Modbus.",
        "Correct. Source, destination, protocol and port are all specified.",
        "44818 is EtherNet/IP and 'any host' is not tight."
      ]
    },
    {
      q: "Which of these cannot be routed between subnets because it works directly on Ethernet frames?",
      options: [
        "Modbus TCP",
        "MQTT",
        "OPC UA",
        "PROFINET real-time"
      ],
      answer: 3,
      explain: [
        "Modbus TCP uses IP and TCP, so it routes.",
        "MQTT runs over TCP/IP.",
        "OPC UA runs over TCP/IP.",
        "Correct. PROFINET RT uses layer 2 frames with no IP header, so a router has nothing to forward."
      ]
    }
  ],

  resources: [
    { title: "OSI model", url: "https://en.wikipedia.org/wiki/OSI_model", type: "article", source: "Wikipedia" },
    { title: "Ethernet Industrial Protocol (EtherNet/IP)", url: "https://store.chipkin.com/articles/ethernet-industrial-protocol-ip", type: "article", source: "Chipkin Automation Systems" },
    { title: "Hidden EtherNet/IP Performance Problems", url: "https://www.rtautomation.com/?p=64278", type: "article", source: "RTA" },
    { title: "Web Server Settings (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/gateway/web-interface/network/web-server-settings", type: "docs", source: "Inductive Automation" }
  ]
});
