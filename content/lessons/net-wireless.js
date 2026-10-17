LC.lesson({
  id: "net-wireless",
  title: "Wireless and cellular in the plant",
  track: "net",
  minutes: 15,
  level: 2,
  prereqs: ["net-routing"],
  tags: ["wifi", "wireless", "cellular", "lte", "5g", "wirelesshart", "roaming", "perspective"],
  summary: "Which radio to use for tablets, field instruments and remote sites, and why control loops stay on a wire.",
  objectives: [
    "Explain why roaming and RF design decide whether a Perspective tablet works on a plant floor",
    "Choose between Wi-Fi, WirelessHART/ISA100, private LTE/5G and public cellular for a given job",
    "Describe how a cellular router connects a remote site and the addressing problem it creates",
    "Give reasons not to run control traffic over Wi-Fi",
    "List what a wireless site survey must find out"
  ],

  body: `
## Radios in a plant

A plant uses several wireless technologies at once, because no single one fits every job. Wi-Fi carries people and their tablets. A mesh of battery-powered sensors reports tank levels. A cellular router connects a pump station ten miles away. Private LTE or 5G is the newer option for large sites. The job of the integrator is to match the radio to the traffic and to say no when someone asks for the wrong one.

| Use | Typical radio | Rate | Latency | Notes |
|---|---|---|---|---|
| Operators with tablets, scanners | Wi-Fi (2.4/5 GHz, Wi-Fi 6) | 10 to 1000 Mbps | 5 to 100 ms, variable | Needs roaming design |
| Battery field instruments | {{term:wirelesshart|WirelessHART}}, {{term:wirelesshart|ISA100.11a}} | about 250 kbps | 100 ms to seconds | Mesh, for monitoring |
| Mobile equipment, AGVs, large sites | Private LTE / 5G | 10 to several 100 Mbps | 10 to 50 ms | Licensed or shared spectrum |
| Remote sites | Public LTE / 5G cellular | 5 to 100 Mbps | 30 to 100 ms | Carrier network in the path |

{{diagram:reach}}

## Wi-Fi for tablets running Perspective

Ignition Perspective runs in a browser, so a tablet or phone with Wi-Fi is a complete operator screen with nothing to install. That is the appeal. The pain is almost always the radio network, not Ignition.

A Perspective session is a websocket connection from the browser to the gateway. If the tablet briefly loses the network, the websocket breaks, the screen shows a disconnected banner and the session reconnects. A reconnect that takes a second is fine. One that takes thirty seconds while someone stands at a valve is a complaint.

### Roaming

A plant of any size has many access points (APs), each covering a cell. As the user walks, the tablet decides when to leave one AP for the next. This is **{{term:roaming|roaming}}**. Problems come from the client's side:

- **Sticky clients.** Tablets hold onto a weak AP until the signal is almost gone, then scan all channels, which takes seconds.
- **Different SSIDs.** All APs on the site must broadcast the same {{term:ssid|SSID}} and use the same security and VLAN, or the tablet reconnects from scratch.
- **Re-authentication.** A full 802.1X login on every move is slow. Fast roaming (802.11r, with OKC or PMK caching on controller-based systems) hands the keys over ahead of time. Test it with your tablet model, because client support varies.
- **IP address change.** If each AP is in its own subnet, the tablet gets a new IP at each move and the session dies. Put every AP in the same VLAN, or use a controller that tunnels clients to a single point.

> [!tip] Make the app tolerate the glitch
> You can't make Wi-Fi perfect. Design Perspective screens so that nothing dangerous depends on a continuous connection: a start command is a single pulse the PLC handles with its own logic, not a button that must stay held.

### Design for the environment

Steel, tanks and wet product reflect and absorb radio. A **site survey** with real tablets walking real paths is the only way to be sure. A survey should find:

1. Signal strength at tablet height, aiming for about -67 dBm or better in the work area.
2. Interference sources: microwave ovens, neighboring plants, Bluetooth, other APs on the same channel.
3. Dead spots behind machinery, in coolers and inside cabinets.
4. Capacity: how many clients per AP, and how many tablets, scanners and phones at shift change.

Use 5 GHz for tablets where possible, with channels planned so that adjacent APs do not overlap. Use WPA2 or WPA3 Enterprise with per-user or per-device credentials. Shared passwords on plant Wi-Fi are a common finding in audits. Put the wireless on its own VLAN and enforce who can reach the Ignition gateway with the firewall rules from {{lesson:net-security}}.

## Why not run control over Wi-Fi

You will be asked. Wi-Fi is shared, half-duplex airtime governed by contention. Any client can take airtime from any other. Interference is invisible and changes by the minute. Roaming adds seconds of silence. EtherNet/IP I/O with a 10 ms update and a timeout of a few packets cannot tolerate this: one retransmission storm and the drive faults.

> [!warning] The rule
> Safety signals and closed-loop control stay on wired links. Wi-Fi is for supervision and human interfaces. Where mobility is needed for control, such as an AGV or a crane, use purpose-built options: a private LTE/5G network, or dedicated industrial Wi-Fi with deterministic roaming, designed by someone who has done it before.

## WirelessHART and ISA100 in brief

WirelessHART and ISA100.11a (IEC 62734) are low-power mesh networks built on IEEE 802.15.4 at 2.4 GHz. Sensors with a battery that lasts years form a mesh, each hop relaying for its neighbors, and a gateway collects the data. Updates are every few seconds to minutes, which is fine for tank level, temperature or vibration. They suit places where running cable is expensive: a remote tank farm, a rotating kiln. Their data usually reaches Ignition via the gateway's Modbus TCP, OPC UA or HART-IP interface.

## Private LTE and 5G

A private cellular network is a base-station system you own or lease, using licensed or shared spectrum (in the US, CBRS). It gives wide coverage, a designed handover as devices move, and managed quality of service. It costs more up front than Wi-Fi, and needs specialist design. It makes sense for large outdoor sites, ports, mines and mobile fleets. Claims of sub-millisecond 5G control latency apply to specific modes of the standard and are not what you get from a typical deployment, so ask for measured numbers.

## Cellular routers for remote sites

Water towers, lift stations and wellheads have no wire. A cellular router (modem plus router) connects the site's PLC or RTU to the central Ignition gateway over a carrier network.

Things to know:

- **Carrier NAT.** Most plans give the router a private address behind carrier-grade NAT. You cannot connect inbound from outside. A static public IP or a **private APN** (a private route from the carrier into your network) fixes this, and is the secure choice.
- **Prefer outbound.** Better still is design where the site connects out. A VPN tunnel or an MQTT connection from site to the central broker needs no inbound port. This also suits {{lesson:proto-mqtt}} and report by exception, which keeps data volume low.
- **Data costs.** Polling Modbus every second over cellular eats a data plan. Report by exception cuts the traffic by an order of magnitude.
- **Security.** Disable the router's default password and web interface exposure. Many incidents begin with a cellular router with port forwarding to a PLC.
- **Dual SIM and signal.** Choose a router with two SIMs for carrier failover, and an external antenna on a mast if the site is in a metal building.

> [!example] Pump station numbers
> Polling 40 tags once a second over Modbus TCP, at roughly 100 bytes per request and reply pair per group of registers, adds up to many gigabytes a month. The same 40 tags sent by report by exception with a 60 second heartbeat move only when values change, often a hundredth of that traffic. Measure your own site, but expect the gap to be that large.
`,

  eli5: `
Wi-Fi is like a conversation in a crowded room. Everyone shares the same air, and if two people talk at once, both have to repeat themselves. That's fine for chatting, but you wouldn't use it for a game of catch where the ball has to arrive at exactly the right moment.

Walking around with a tablet is like walking through a building with a phone call going. Each room has its own speaker. If your phone sticks to the speaker in the room you left, the call gets garbled until it switches. Good setup means the phone switches early and smoothly.

Remote sites on cellular are like writing letters through a post office. The post office (the carrier) decides the addresses. So you can't just show up at the pump station's door. The pump station has to send a letter first, and then you reply to it, unless you pay the post office for a private mailbox.
`,

  why: `
**Why not use Wi-Fi for everything?** Because it is cheap and easy, which makes it tempting, and because the failures are intermittent. A drive that faults only when the forklift passes the access point is among the hardest problems to find. Wired links fail loudly and consistently. Radio fails quietly and randomly.

**Why roaming is the real project.** Buying tablets is the easy part. Making them keep a session while a person walks across a plant is a network design, a client configuration and a test plan. Integrators who skip the survey rework the install.

**Why outbound connections for remote sites.** Inbound access to a cellular router is the classic way a PLC becomes reachable from the internet. An outbound tunnel or broker connection means there is no listening port to find. It also survives the carrier changing the site's IP address.

**What integrators argue about.** Whether private 5G is worth the cost compared with a well-designed Wi-Fi 6 network. For most plants today, Wi-Fi covers supervision and tablets, and cellular is for remote sites. Private cellular wins where mobility, outdoor coverage or many moving machines matter.

**Tradeoff.** Wireless saves cable and adds an attack surface and a source of intermittent faults. Use it where the benefit is real and the process can tolerate a lost link.
`,

  history: `
Wi-Fi (IEEE 802.11) became common in plants in the 2000s, mostly for laptops and handheld scanners. WirelessHART was approved as part of the HART 7 specification in 2007, and ISA100.11a was published by ISA in 2009. Private LTE became practical in the late 2010s with shared spectrum such as CBRS in the US, and private 5G followed.
`,

  examples: [
    {
      title: "Tablet drops at the packaging line door",
      body: `Operators carrying tablets lose their Perspective session each time they walk from the packaging hall into the warehouse. The survey shows that the two areas have APs on different VLANs, so the tablet receives a new IP address at the door. Putting both APs on one VLAN and enabling 802.11r fast roaming makes the handover invisible. The Perspective session reconnects within a second.`
    },
    {
      title: "Choosing for a remote well",
      body: `A wellhead 12 km away has a CompactLogix and a cellular router. The router has a private APN, a static address inside the company's range, and a VPN to the central site. Ignition polls with the Allen-Bradley driver across the VPN, with scan classes of 30 seconds for non-critical tags. Data use is about 1 GB a month. A second SIM on a different carrier takes over if the first loses signal.`
    }
  ],

  diagrams: {
    reach: `<svg viewBox="0 0 640 220" role="img" aria-label="Wireless options arranged from short range and local to wide area: Wi-Fi, WirelessHART mesh, private LTE or 5G, public cellular to a remote site">
  <rect class="dg-box" x="20" y="40" width="130" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="68">Wi-Fi</text>
  <text class="dg-text-muted dg-mid" x="85" y="88">tablets, scanners</text>
  <rect class="dg-box" x="170" y="40" width="130" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="235" y="68">WirelessHART</text>
  <text class="dg-text-muted dg-mid" x="235" y="88">sensor mesh</text>
  <rect class="dg-box" x="320" y="40" width="140" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="390" y="68">Private LTE/5G</text>
  <text class="dg-text-muted dg-mid" x="390" y="88">large site, mobile</text>
  <rect class="dg-box-accent" x="480" y="40" width="140" height="70" rx="6"/>
  <text class="dg-text-sm dg-mid" x="550" y="68">Public cellular</text>
  <text class="dg-text-muted dg-mid" x="550" y="88">remote sites</text>
  <line class="dg-line" x1="20" y1="150" x2="620" y2="150"/>
  <text class="dg-text-muted" x="20" y="176">Local, you control the air</text>
  <text class="dg-text-muted" x="400" y="176">Wide area, carrier in the path</text>
  <text class="dg-text-sm" x="20" y="205">Control loops and safety: wired only</text>
</svg>`
  },

  pitfalls: [
    "Skipping the site survey and finding the dead spots after install.",
    "Giving each access point its own subnet, so tablets change IP address and drop sessions when roaming.",
    "Using a shared Wi-Fi password for plant tablets.",
    "Port forwarding from a cellular router straight to a PLC.",
    "Polling every tag every second over a metered cellular plan.",
    "Running EtherNet/IP I/O or safety signals over Wi-Fi."
  ],

  keyTerms: ["wifi", "roaming", "ssid", "wirelesshart", "private-lte", "cellular-router", "apn"],

  quiz: [
    {
      q: "Tablets drop their Perspective session at the doorway between two areas. Each area's access points are in a different subnet. What is the likely fix?",
      options: ["Increase the Perspective session timeout only", "Put the APs on the same VLAN or tunnel clients to one point, and enable fast roaming", "Switch the tablets to 2.4 GHz", "Add more gateways"],
      answer: 1,
      explain: [
        "A timeout won't help when the tablet's IP address changes and the connection is broken.",
        "Correct. Keeping the IP stable and speeding up key exchange makes the handover invisible.",
        "2.4 GHz is more crowded and has fewer channels. It rarely improves roaming.",
        "The gateway is not the cause. The client's network path is."
      ]
    },
    {
      q: "A manager asks to run drive I/O over Wi-Fi to save cabling. What is the best answer?",
      options: ["Fine if you use 5 GHz", "No: shared airtime, interference and roaming gaps break real-time I/O, so keep it wired", "Yes, with a higher RPI", "Yes, if WPA3 is enabled"],
      answer: 1,
      explain: [
        "5 GHz reduces interference but does not remove contention or roaming delays.",
        "Correct. Control and safety stay on wired links. Mobile control needs purpose-built systems.",
        "A slower RPI hides some jitter but makes the loop slower and the faults confusing.",
        "Encryption is not a reliability measure."
      ]
    },
    {
      q: "Why is a cellular router often unreachable from the central site?",
      options: ["Cellular does not support TCP", "The carrier places it behind NAT with a private address", "Ports above 1024 are blocked by law", "The router has no IP address"],
      answer: 1,
      explain: [
        "TCP works over cellular.",
        "Correct. Carrier-grade NAT blocks inbound connections. Use a static IP, private APN, or have the site connect outward.",
        "No such rule exists.",
        "It has an IP address. It is just not reachable from outside."
      ]
    },
    {
      q: "What suits a battery-powered tank-level sensor in a remote tank farm?",
      options: ["Wi-Fi 6", "WirelessHART or ISA100.11a mesh", "Private 5G with URLLC", "Bluetooth to a phone"],
      answer: 1,
      explain: [
        "Wi-Fi radios use too much power for years-long battery life.",
        "Correct. Low-power mesh is designed for slow, periodic measurements on a battery.",
        "That is overkill and costly for a level reading every few seconds.",
        "A phone is not a reliable data path into SCADA."
      ]
    },
    {
      q: "Which design reduces both the data bill and the attack surface for a remote pump station?",
      options: ["Port forward 502 and poll each second", "Site connects outward over VPN or MQTT and sends changes only", "Open the router's web UI to the internet for convenience", "Use a public IP with no firewall"],
      answer: 1,
      explain: [
        "This exposes Modbus, which has no authentication, to the internet and uses lots of data.",
        "Correct. Outbound connections have no listening port, and report by exception sends far less.",
        "Exposed admin interfaces are a common way in.",
        "A public IP with no firewall is the worst choice."
      ]
    }
  ],

  resources: [
    { title: "Private 5G: The Future of Industrial Wireless", url: "https://ar5iv.arxiv.org/html/2006.01820", type: "article", source: "arXiv" },
    { title: "Real-Time Performance of Industrial IoT Communication Technologies: A Review", url: "https://arxiv.org/pdf/2311.08852", type: "article", source: "arXiv" },
    { title: "Field wireless networks: ISA100 and other wireless technologies making inroads", url: "https://www.automation.com/article/field-wireless-networks-isa100-and-other-wireless-technologies-making-inroads", type: "article", source: "Automation.com" },
    { title: "When HART Goes Wireless: Understanding and Implementing the WirelessHART Standard", url: "https://library.e.abb.com/public/eb20fe80a391ca8485257bc600667573/When%20HART%20Goes%20Wireless%20Understanding%20and%20Implementing%20the%20WirelessHART%20Standard.pdf", type: "article", source: "ABB" }
  ]
});
