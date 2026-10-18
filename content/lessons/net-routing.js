LC.lesson({
  id: "net-routing",
  title: "Routing, gateways, NAT, DHCP and DNS",
  track: "net",
  minutes: 25,
  level: 2,
  prereqs: ["net-ip"],
  tags: ["routing", "gateway", "nat", "dhcp", "dns", "stratix", "layer 3"],
  summary: "How traffic leaves a subnet, how machines with identical IPs coexist, and how names and addresses get handed out. The glue between your cell networks and your Ignition servers.",
  objectives: [
    "Explain what a default gateway does and trace a packet across a router",
    "Describe what a layer 3 switch adds over a layer 2 switch",
    "Use 1:1 NAT to connect machines that share identical internal IP addresses",
    "Explain DHCP, reservations and option 82 port-based addressing",
    "Explain why Ignition gateways and their clients should use DNS names, and what breaks when DNS is wrong"
  ],

  body: `
## Leaving the subnet

A device only talks directly to addresses on its own subnet (see {{lesson:net-ip}}). For anything else it hands the packet to a **router**, a device that connects networks and forwards packets between them. The address of the router on the local subnet is the {{term:default-gateway|default gateway}}. If a device has no gateway set, or the wrong one, it can reach its own subnet and nothing else. That is the most common explanation for "I can ping the PLC next to me but not the one in the next cell."

### A packet across a router

An HMI at 10.20.20.50 (VLAN 20) wants to read PLC1 at 10.20.10.10 (VLAN 10). Mask /24 on both.

1. The HMI checks: 10.20.10.10 is not in 10.20.20.0/24, so it is remote.
2. It ARPs for its default gateway (10.20.20.1) and sends the frame to the **router's MAC**, with the PLC's IP inside.
3. The router looks up 10.20.10.0/24 in its routing table. It is directly connected on another interface.
4. The router ARPs for the PLC on that subnet and sends a new frame, with the router's MAC as source and the PLC's MAC as destination.
5. The IP addresses stay the same end to end. The MAC addresses change at every hop.

{{diagram:route}}

A routing table is a list of "to reach network X, send to next hop Y." Directly connected networks are added automatically. Others are added by hand (**static routes**) or learned from other routers by a routing protocol (OSPF is common in larger plants). A static route that sends Plant 2's 10.21.0.0/16 to the plant's WAN router is a typical one-line fix when a second site is added.

> [!note] The return path
> Routing is two-way thinking. The PLC must also know how to reach the HMI. If the PLC has no gateway, requests from another subnet arrive, replies never leave and the connection fails. Ping is a round trip too, so it cannot "work one way". The real symptom is a TCP connection that gets requests in and no reply out. Check the return route.

### Layer 3 switches

A layer 3 switch is a switch that can also route between VLANs and subnets in hardware. In practice, you create a VLAN interface (an SVI) on the switch for each subnet, give each one an IP address (that is the gateway address for the devices on it) and the switch routes between them at wire speed. Plants use layer 3 switches (an industrial layer 3 switch or a Cisco distribution switch; check the datasheet for your model's routing support) instead of a separate router box for the cell-to-plant traffic. This keeps the VLAN design in {{lesson:net-vlan}} and the IP design in one device. A layer 2 switch can only forward within one broadcast domain.

## NAT

{{term:nat|Network Address Translation}} rewrites IP addresses as packets pass through a device. The two forms you see on a plant:

- **Many-to-one NAT / PAT** (what your home router does): many private devices share one public address. Used at the plant firewall to the internet. You rarely touch it in OT.
- **1:1 NAT**: each internal address maps to a unique external address. This is the one controls engineers use.

### The machine builder problem

A machine builder ships 20 identical packaging machines. Every one has a PLC at 192.168.1.10, an HMI at 192.168.1.20 and a drive at 192.168.1.30, because the program, the HMI project and the documentation were built that way. At your plant, those twenty machines all land on one network, and you now have 20 devices claiming 192.168.1.10.

You cannot readdress them, because it means editing and re-validating a program from the vendor, voiding support, and doing it 20 times. The answer is a **1:1 NAT** device at the edge of each machine. {{term:one-to-one-nat|1:1 NAT}} translates each machine-internal address to a unique plant-side address:

| Inside the machine | Plant side, machine 3 |
|---|---|
| 192.168.1.10 (PLC) | 10.20.40.31 |
| 192.168.1.20 (HMI) | 10.20.40.32 |
| 192.168.1.30 (drive) | 10.20.40.33 |

Ignition at 10.20.30.10 now reads the PLC of machine 3 at 10.20.40.31. The switch translates it into 192.168.1.10 on the way in and back on the way out. Machine 4 gets 10.20.40.41-.43 with the same internal addresses.

{{diagram:nat}}

> [!note] Stratix NAT
> Some Rockwell Stratix managed switches include a NAT feature built for exactly this. Which models support it varies, so check Rockwell's current documentation. It describes a one-to-one mapping implemented in the switch, with a limited number of translations per switch. Check the current hardware and firmware documentation for the translation limit, supported ports and licensing before you design around it. Other industrial switch and router vendors offer equivalent features, and dedicated NAT appliances exist too.

NAT is not free. Things to watch:

- **You must use the translated address** in Ignition and any client outside the machine, and document it. The PLC's own address in its project is not what the outside world sees.
- **Protocols that embed IP addresses in the payload** can break, which is why CIP connections between controllers across NAT sometimes need careful configuration. Test each protocol you need.
- **Multicast and broadcast discovery** (RSLinx browsing) generally do not cross.
- NAT hides addresses but **is not a firewall**. It does not replace segmentation and rules (see {{lesson:net-security}}).

## DHCP

{{term:dhcp|DHCP}} (Dynamic Host Configuration Protocol) gives a device its address automatically. A new device broadcasts "I need an address" (DISCOVER). A DHCP server offers one (OFFER), the client requests it (REQUEST) and the server confirms (ACK). The lease includes the address, mask, gateway, DNS servers and a lease time. Clients ask to renew at the half-way point of the lease.

DHCP uses UDP ports 67 (server) and 68 (client). Because the first message is a broadcast, a server on another subnet needs a **DHCP relay** (a helper address on the router or L3 switch) to hear it.

### Reservations and persistence

For control devices, plain DHCP is risky, because the address a device gets can change. Two ways to make it stable:

- A **reservation** binds an address to a device's MAC. The server always gives that MAC the same IP. Replace a drive and the MAC changes, so you must update the reservation.
- **Port-based addressing with {{term:dhcp-option-82|DHCP option 82}}**. The switch (acting as a relay agent) adds the switch and port number to each DHCP request, as the "circuit ID." The server hands out an address by *port*, so whatever device is plugged into Gi1/0/12 gets 10.20.10.112. A technician can swap a failed drive and the new unit comes up with the old one's address, with no MAC editing and no software tool. Rockwell documents a related DHCP feature on some Stratix switches (check the current manual for its name and which models support it), and other vendors have equivalents. This is popular for drives and I/O blocks, where a replacement should "just work."

> [!tip] Static or DHCP? A working rule
> Servers, switches, firewalls and gateways: static. PLCs: static (the project holds the address). Replaceable field devices such as drives and remote I/O: static, or port-based DHCP with option 82 if your team swaps parts often. Laptops, phones and visitors: normal DHCP.

If a DHCP server fails, existing leases continue until they expire, and new devices get nothing (or 169.254.x.x). Do not put the only DHCP server on a machine that needs the plant network up to boot.

## DNS and hostnames

{{term:dns|DNS}} (Domain Name System) turns names like \`ignition-prod.plant.local\` into IP addresses. A client asks a DNS server, which answers with the IP. Names are cached, and DNS uses UDP/TCP port 53. On Windows you can query it with \`nslookup ignition-prod\`. A small \`hosts\` file on each machine can also map names to addresses and wins over DNS, which is useful and hard to remember six months later.

### Why names matter for Ignition

Ignition is a server system, and a lot of its connections depend on the name a client uses.

- **Clients and Designer** use a URL like \`https://ignition-prod.plant.local:8043\`. A name survives a server being replaced or moved, an IP address does not.
- **Gateway Network** connections between gateways use a host name or address (default port 8060). Using names keeps working after a server move.
- **TLS certificates** are issued for a name. A browser connecting to an IP address, or to a name the certificate does not list, shows a certificate warning. OPC UA also checks certificates, and many OPC UA clients connect by hostname. A server that moves or is renamed can fail with security errors, even though the IP is the same.
- **Perspective** sessions and the gateway's public address setting should use the name users actually type. Ignition can resolve client hostnames by reverse DNS (check the gateway settings in the manual for your version). The documentation warns that an unreachable or slow DNS server can block requests until a timeout, so only enable it if reverse DNS works.
- **Databases and historians** are referenced by hostname in JDBC connection strings.

> [!note] In 8.1
> The concepts above are the same in Ignition 8.1. Menu locations and a few settings pages differ, so check the 8.1 manual for the page names.

### What goes wrong

- DNS server unreachable: names fail but IPs work. Symptoms are slow logins, slow screen loads (a client waits for lookups to time out) and gateways that cannot connect to a database by name.
- Stale cache: after a server move, some clients still hit the old IP. \`ipconfig /flushdns\` clears Windows.
- Two names, one server: certificates and gateway settings must match the name users use.

Control devices (PLCs, drives) rarely use DNS. They talk by IP. DNS matters on the server side and the IT side of your design.
`,

  eli5: `
Think of a neighborhood. Within your street you can walk to anyone's house. When you want to send something to another street, you drop it at the end-of-street mailbox. That mailbox is the default gateway, and the post office behind it is the router. The post office knows which road leads to which street.

Now imagine twenty identical new houses, all built with the house number "10." That is a mess, because no mail can find the right one. The post office solves it by giving each one a second, unique "outside number" and swapping the numbers on every envelope on the way in and out. That is NAT. Inside, every house still thinks it is number 10.

DHCP is like a hotel front desk handing you a room number when you walk in. Option 82 is the desk saying, "Whoever stands at door 12 always gets room 112," so if a guest leaves and a new one takes the spot, they get the same room.

DNS is the phone book. You look up "Ignition server" and get the number to dial, so when the server moves to a new house, only the phone book changes, not everyone's contacts.
`,

  why: `
**Why a default gateway rather than a map of the world?** A PLC has little memory and does not run routing protocols. Giving each device one "everything else goes here" address keeps endpoints simple and puts the smarts in a few routers.

**Why NAT when we could readdress the machines?** Because readdressing a vendor's machine is a software change on a validated machine, repeated per unit, and is lost at the next program restore. 1:1 NAT moves the problem into the network, where one team owns it, and the machine stays exactly as shipped. The tradeoff is hidden complexity: engineers see one address in the PLC project and another in Ignition, and a mapping table must be kept current. Integrators argue about whether to demand unique addresses from builders in the purchase spec. The better answer is both: ask for unique addresses in the spec, and have NAT as the fallback.

**Why option 82 or reservations?** Replacing a failed drive at 3 a.m. should be a swap, not a laptop session. Port-based addressing makes the address belong to the location, and a maintenance tech can replace a part without any configuration. The tradeoff is that the switch and DHCP server become critical to restart, so they must be reliable and documented.

**Why do hostnames matter so much on Ignition?** Servers are replaced, virtualized, cloned and moved far more often than PLCs. If every client, gateway link and certificate points to an IP, each move means touching every one. A DNS name turns that into one record change. It also makes TLS certificates work, which is a requirement for OPC UA security and for HTTPS to a gateway.

**What about the cost?** DNS becomes a dependency. If it is down, a lot of things look broken that are actually fine. Treat it like any other critical server: redundant, monitored, documented.
`,

  history: `
Static routing and RFC 791 IP forwarding date from 1981. DHCP (RFC 2131) replaced the older BOOTP in 1997 and kept its port numbers. Option 82 came with RFC 3046 in 2001, designed for service providers to identify which port a customer was on, and industrial users later borrowed it for swapping field devices. DNS was introduced in 1983 to replace a single shared HOSTS.TXT file that was copied around. NAT appeared in the mid-1990s to stretch the IPv4 address space and has since become an industrial tool for reuse of identical machine addresses.
`,

  examples: [
    {
      title: "The 'ping works from here, reads hang from there' fault",
      body: `An engineering laptop at 10.20.10.60 pings a new PLC (10.20.10.40) and browses it fine, but Ignition (10.20.30.10) can never complete a read, and a capture on the PLC's switch port shows requests (SYNs) arriving with no replies leaving. Ping from Ignition would fail too. The PLC was configured with a mask but no gateway, so it answers its own subnet and nothing else. Adding gateway 10.20.10.1 in the PLC's network settings fixed it.`
    },
    {
      title: "Twenty identical machines",
      body: `Each machine's panel contains a Stratix switch with 1:1 NAT mapping 192.168.1.10 to 10.20.40.(machine number * 10 + 1), 192.168.1.20 to ...+2 and 192.168.1.30 to ...+3. Ignition's device list uses the translated addresses. A spreadsheet lists the mapping and the machine serial number. When a machine is moved to another plant, only the NAT mapping changes.`
    },
    {
      title: "Certificate warning after a server rebuild",
      body: `A gateway was rebuilt on a new VM with the same IP, but its HTTPS certificate was issued for a different hostname. Browsers warned, and an OPC UA client that checks certificates refused to connect. The fix was to give the new server the original DNS name and issue a certificate for that name.`
    }
  ],

  diagrams: {
    route: `<svg viewBox="0 0 640 230" role="img" aria-label="An HMI on subnet 10.20.20.0/24 reaches a PLC on 10.20.10.0/24 through a router, with the MAC address changing at each hop but the IPs staying the same">
  <defs>
    <marker id="net-routing-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-zone" x="10" y="40" width="190" height="120" rx="6"/>
  <text class="dg-title" x="20" y="60">10.20.20.0/24</text>
  <rect class="dg-box-accent" x="24" y="76" width="160" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="104" y="97">HMI</text>
  <text class="dg-text-mono dg-mid" x="104" y="116">10.20.20.50</text>
  <rect class="dg-box" x="240" y="76" width="160" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="97">Router / L3 switch</text>
  <text class="dg-text-mono dg-mid" x="320" y="116">.1 and .1</text>
  <rect class="dg-zone" x="440" y="40" width="190" height="120" rx="6"/>
  <text class="dg-title" x="450" y="60">10.20.10.0/24</text>
  <rect class="dg-box-accent" x="456" y="76" width="160" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="536" y="97">PLC</text>
  <text class="dg-text-mono dg-mid" x="536" y="116">10.20.10.10</text>
  <line class="dg-line" x1="184" y1="101" x2="240" y2="101" marker-end="url(#net-routing-ah)"/>
  <line class="dg-line" x1="400" y1="101" x2="456" y2="101" marker-end="url(#net-routing-ah)"/>
  <text class="dg-text-muted" x="20" y="186">Hop 1: dest MAC = router, dest IP = PLC</text>
  <text class="dg-text-muted" x="20" y="206">Hop 2: dest MAC = PLC, dest IP = PLC (same)</text>
  <text class="dg-text-muted" x="380" y="186">IPs stay end to end.</text>
  <text class="dg-text-muted" x="380" y="206">MACs change at every hop.</text>
</svg>`,
    nat: `<svg viewBox="0 0 640 200" role="img" aria-label="1:1 NAT: Ignition reads 10.20.40.31, the Stratix translates to the machine's internal 192.168.1.10">
  <defs>
    <marker id="net-routing-nat" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="60" width="150" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="95" y="84">Ignition</text>
  <text class="dg-text-mono dg-mid" x="95" y="104">10.20.30.10</text>
  <rect class="dg-box-accent" x="245" y="50" width="150" height="80" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="76">Switch with NAT</text>
  <text class="dg-text-mono dg-mid" x="320" y="98">.31 &lt;-&gt; .10</text>
  <text class="dg-text-muted dg-mid" x="320" y="118">1:1 mapping</text>
  <rect class="dg-box" x="470" y="60" width="150" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="545" y="84">Machine PLC</text>
  <text class="dg-text-mono dg-mid" x="545" y="104">192.168.1.10</text>
  <line class="dg-line" x1="170" y1="90" x2="245" y2="90" marker-end="url(#net-routing-nat)"/>
  <line class="dg-line" x1="395" y1="90" x2="470" y2="90" marker-end="url(#net-routing-nat)"/>
  <text class="dg-text-mono" x="40" y="160">sees 10.20.40.31</text>
  <text class="dg-text-mono" x="420" y="160">sees its own 192.168.1.10</text>
</svg>`
  },

  pitfalls: [
    "Setting an IP and mask on a device but no gateway, so it only answers its own subnet.",
    "Forgetting the return route. Requests arrive from another subnet, replies go nowhere, and the PLC works only for same-subnet clients.",
    "Using the PLC's internal address in Ignition when it sits behind NAT. Outside the machine you must use the translated address.",
    "Assuming NAT is a firewall. It hides addresses but does not restrict traffic.",
    "Leaving DHCP on a control device or pointing every client at a server IP instead of a DNS name.",
    "A DHCP server on a machine that needs the network up before it boots, so the first power-up after an outage hangs.",
    "Enabling Ignition's reverse DNS lookup when the DNS server is slow or unreachable, which makes requests wait for a timeout."
  ],

  keyTerms: ["default-gateway", "router", "layer-3-switch", "nat", "one-to-one-nat", "dhcp", "dhcp-option-82", "dns"],

  quiz: [
    {
      q: "A PLC at 10.20.10.40/24 has no default gateway. Which statement is true?",
      options: [
        "It can reach any device on the plant network",
        "It can reach only devices in 10.20.10.0/24",
        "It cannot reach anything, including its own subnet",
        "It can reach devices only by DNS name"
      ],
      answer: 1,
      explain: [
        "Reaching other subnets needs a gateway.",
        "Correct. Local addresses resolve by ARP, but anything remote has nowhere to be sent.",
        "Its own subnet works fine without a gateway.",
        "DNS is not involved. The problem is routing."
      ]
    },
    {
      q: "You receive twenty machines that all use 192.168.1.10 for the PLC. What is the most practical way to put them on one plant network without editing their programs?",
      options: [
        "Add 20 gateways at 192.168.1.1",
        "Put all of them on one VLAN",
        "Turn on DHCP in every PLC",
        "Use 1:1 NAT at each machine to map the internal address to a unique plant address"
      ],
      answer: 3,
      explain: [
        "That makes the duplicate address problem worse.",
        "A single VLAN is one broadcast domain, so you would have 20 devices fighting over one address.",
        "Many PLC projects hold a static address, and DHCP would not fix the other duplicate devices.",
        "Correct. Each machine keeps its identical internal addressing, and the NAT switch presents a unique address outside."
      ]
    },
    {
      q: "What does DHCP option 82 allow a switch to do?",
      options: [
        "Encrypt DHCP traffic",
        "Tell the server which switch and port a request came from so the same port always gets the same address",
        "Replace the default gateway",
        "Assign addresses without a DHCP server"
      ],
      answer: 1,
      explain: [
        "Option 82 is about identification, not encryption.",
        "Correct. The relay adds a circuit ID for the port, and the server maps it to a fixed address, so a replacement device inherits the old address.",
        "The gateway is a separate setting delivered in the lease.",
        "A DHCP server is still needed."
      ]
    },
    {
      q: "A gateway was moved to a new server and the IP was kept, but clients now get certificate errors. What is the likely cause?",
      options: [
        "The subnet mask changed",
        "The certificate was issued for a different hostname than the one clients use",
        "DHCP expired",
        "The PLC was NATed"
      ],
      answer: 1,
      explain: [
        "A mask change would break connectivity, not trigger certificate warnings.",
        "Correct. Certificates are issued for names. A mismatch triggers warnings, and OPC UA clients may refuse to connect.",
        "DHCP lease expiry would cause address trouble, not certificate errors.",
        "NAT on a PLC does not affect the gateway's web certificate."
      ]
    },
    {
      q: "A laptop on the PLC's own subnet can ping and browse the PLC, but Ignition on another subnet cannot complete a read. A capture at the PLC shows requests in and no replies out. What do you check?",
      options: [
        "Is the PLC missing a gateway for the return path to Ignition's subnet?",
        "Is Ignition's DNS record correct?",
        "Is auto-negotiation enabled?",
        "Is the MTU too large?"
      ],
      answer: 0,
      explain: [
        "Correct. Requests arrive, so the forward route works. Replies need a route back to another subnet, which means a gateway.",
        "Requests are already arriving at the PLC by IP, so name resolution is not the issue.",
        "Duplex problems cause errors on the port, not silent reply loss from one subnet.",
        "MTU problems affect large packets, and a basic read is tiny."
      ]
    }
  ],

  resources: [
    { title: "Stratix 5700 Network Address Translation Quick Start", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/qs/iasimp-qs038_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Deploying Network Address Translation within a Converged Plantwide Ethernet Architecture", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/enet-td007_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Stratix Managed Switches Stratix 5400 (1783-UM007)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/1783-um007_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Dynamic Host Configuration Protocol", url: "https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol", type: "article", source: "Wikipedia" },
    { title: "Web Server Settings (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/gateway/web-interface/network/web-server-settings", type: "docs", source: "Inductive Automation" },
    { title: "Gateway Network (Ignition 8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/gateway-network", type: "docs", source: "Inductive Automation" }
  ]
});
