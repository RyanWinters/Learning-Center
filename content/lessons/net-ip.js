LC.lesson({
  id: "net-ip",
  title: "IP addressing and subnetting",
  track: "net",
  minutes: 30,
  level: 2,
  prereqs: ["net-ethernet"],
  tags: ["ip", "subnet", "cidr", "mask", "addressing", "dhcp", "arp"],
  summary: "An IPv4 address plus a mask tells a device who is local and who needs a router. Get the math right and plant IP plans become easy.",
  objectives: [
    "Read an IPv4 address and subnet mask in dotted and CIDR form",
    "Calculate network address, broadcast address, host range and host count for any mask",
    "Decide whether two addresses are on the same subnet",
    "Recognize private ranges and link-local addresses",
    "Draft a simple plant IP plan and decide which devices get static addresses"
  ],

  body: `
## What an IP address is

An {{term:ip-address|IP address}} identifies a device at layer 3. An IPv4 address is 32 bits, written as four decimal bytes: \`10.20.10.15\`. Where a MAC address (see {{lesson:net-ethernet}}) is a permanent hardware ID that only matters on the local network, an IP address is a logical address you assign, and it is what lets traffic find a device across many networks. In a plant, nearly every PLC, HMI, drive, camera and gateway has one, and a wrong one is the most common reason "it was working yesterday."

An address has two parts: a **network** part (which network am I on) and a **host** part (which device on that network). The {{term:subnet-mask|subnet mask}} says where the line falls.

## The mask

The mask is 32 bits too: ones for the network part, zeros for the host part. \`255.255.255.0\` is \`11111111.11111111.11111111.00000000\`, so the first 24 bits are the network and the last 8 are the host.

A device combines its own address and mask with a bitwise AND to find its network. Before sending, it does the same to the destination. **If both give the same network, the destination is local** and the device sends the frame straight to it (after an ARP lookup, below). If not, it sends the packet to its default gateway. That decision is the entire reason masks matter.

{{diagram:mask}}

### CIDR notation

{{term:cidr|CIDR}} notation writes the mask as the count of network bits after a slash: \`10.20.10.0/24\` means 24 network bits, mask \`255.255.255.0\`. It is shorter and what you will see in firewall rules, switch configs and documentation.

| CIDR | Mask | Host bits | Addresses | Usable hosts |
|---|---|---|---|---|
| /30 | 255.255.255.252 | 2 | 4 | 2 |
| /29 | 255.255.255.248 | 3 | 8 | 6 |
| /28 | 255.255.255.240 | 4 | 16 | 14 |
| /27 | 255.255.255.224 | 5 | 32 | 30 |
| /26 | 255.255.255.192 | 6 | 64 | 62 |
| /25 | 255.255.255.128 | 7 | 128 | 126 |
| /24 | 255.255.255.0 | 8 | 256 | 254 |
| /23 | 255.255.254.0 | 9 | 512 | 510 |
| /22 | 255.255.252.0 | 10 | 1024 | 1022 |
| /16 | 255.255.0.0 | 16 | 65,536 | 65,534 |

Two addresses in every subnet are reserved. The first (all host bits zero) is the **network address**, and the last (all host bits one) is the {{term:broadcast-address|broadcast address}}. Usable hosts = 2^(host bits) - 2.

## Subnetting by hand

The fast method uses the **block size**: the number of addresses in a subnet. For the interesting byte of the mask, block size = 256 minus the mask's value in that byte. Subnets start at multiples of the block size.

> [!example] Worked example 1: 10.20.30.77/27
> /27 is mask 255.255.255.224. The interesting byte is the fourth: block size = 256 - 224 = **32**. Subnets start at 0, 32, 64, 96...
> - 77 falls between 64 and 96, so the **network address** is 10.20.30.64.
> - Broadcast is the address before the next block: **10.20.30.95**.
> - Usable range: **10.20.30.65 to 10.20.30.94** (30 hosts).

> [!example] Worked example 2: 172.16.5.130/26
> /26 is mask 255.255.255.192, block size 256 - 192 = **64**. Blocks start at 0, 64, 128, 192.
> - 130 is in the 128 block: network **172.16.5.128**, broadcast **172.16.5.191**.
> - Usable: 172.16.5.129 to 172.16.5.190 (62 hosts).

> [!example] Worked example 3: are these two on the same subnet?
> Controller 192.168.1.20 and drive 192.168.1.200, both mask 255.255.255.192 (/26). Block size 64: the controller is in the 0 block (0-63), the drive is in the 192 block (192-255). **Different subnets.** They cannot talk without a router, even though the first three bytes match. With a /24 mask they would be on the same subnet. This one catches people constantly.

When the mask boundary is in the third byte (like /22, 255.255.252.0), apply the same method to the third byte: block size 256 - 252 = 4, so blocks of 4 in the third byte. 10.20.14.9/22 sits in the 12 block: network 10.20.12.0, broadcast 10.20.15.255.

## Private ranges and special addresses

Some ranges are reserved by RFC 1918 for internal use and are never routed on the public internet. This is where nearly every plant network lives.

| Range | CIDR | Typical use |
|---|---|---|
| 10.0.0.0 to 10.255.255.255 | 10.0.0.0/8 | Large sites, many VLANs |
| 172.16.0.0 to 172.31.255.255 | 172.16.0.0/12 | Medium sites |
| 192.168.0.0 to 192.168.255.255 | 192.168.0.0/16 | Small networks, machine-internal networks |

Other ranges to recognize:

- **169.254.0.0/16** is link-local. A device that asked for DHCP and got no answer picks one of these (APIPA). Seeing 169.254.x.x on a gateway or laptop means "DHCP failed."
- **127.0.0.1** is loopback, the device talking to itself.
- **224.0.0.0 to 239.255.255.255** is multicast, used by EtherNet/IP I/O among others.
- **255.255.255.255** is the limited broadcast.

## ARP: from IP to MAC

A frame needs a MAC address, but applications use IP addresses. {{term:arp|ARP}} (Address Resolution Protocol) bridges them. To reach 10.20.10.10, a device broadcasts "who has 10.20.10.10?" The owner replies with its MAC, and the sender caches it for a while. The cache is why changing a device's IP can leave a laptop pointing at the old one for a few minutes, and why duplicate IPs cause intermittent behavior: two devices answer ARP and the cache flips between them. You can see the cache with \`arp -a\` on Windows.

## A plant IP plan

A good plan encodes meaning in the address, so anyone can tell what a device is from its IP. This is one common pattern for a single site using 10.20.0.0/16 ("site 20"):

| Subnet | Purpose | Notes |
|---|---|---|
| 10.20.1.0/24 | Network management | Switch and firewall management addresses |
| 10.20.10.0/24 | Line 1 controls | PLCs, drives, I/O, HMIs |
| 10.20.11.0/24 | Line 2 controls | Same layout as Line 1 |
| 10.20.50.0/24 | Machine-builder uplinks | Where NAT'd machine addresses land |
| 10.20.100.0/24 | Servers | Ignition gateways, historian, databases |
| 10.20.200.0/24 | Wireless and handhelds | Isolated from controls |

Inside each controls subnet, reserve a pattern, for example: .1 gateway, .2-.9 switches, .10-.49 PLCs, .50-.99 HMIs and panels, .100-.199 drives and I/O, .200-.249 instruments, DHCP pool for laptops only. Write it down, put it in the panel drawings and keep a spreadsheet or IPAM tool. The plan outlives the people who made it.

> [!tip] Size subnets for growth, and for the broadcast domain
> A /24 (254 hosts) is plenty for one line. A flat /16 with 65,000 addresses is not a goal, it is a broadcast domain of unknown size. Smaller subnets, joined by a router or L3 switch, contain faults and make firewall rules possible. See {{lesson:net-routing}} and {{lesson:net-vlan}}.

## Static versus DHCP for field devices

- **Static** addresses are typed into the device. They never change, show up in drawings, and keep working when a server is down. PLCs, drives, HMIs, servers, switches and Ignition gateways should be static (or the equivalent of static, see DHCP reservations).
- **DHCP** (see {{lesson:net-routing}}) assigns addresses automatically. It is good for laptops, phones and visitors. It is risky for control devices, because a lease that changes breaks every connection pointing at it.

Some controllers also support BOOTP/DHCP for the *first* address and then you must disable it, or the device can pick up a new address after a power cycle. When Logix modules ship, many come with DHCP enabled. Set a static address and turn that off.

## Doing the math in tools

You will not do this by hand every day. Use a subnet calculator, \`ipconfig\` or \`ip addr\` to see your own address and mask, and \`ping\` and \`arp -a\` to test. The skill is knowing enough to catch an error when you read an address table. When a laptop at 192.168.1.50/24 cannot reach a PLC at 192.168.0.10/24, the answer is one glance at the third byte.

## Quick practice

Try these before checking the answers in the quiz below.

1. How many usable hosts are in 10.20.10.0/25?
2. What is the broadcast address of 192.168.4.37/28?
3. What mask is /22?
4. Do 10.20.10.200 and 10.20.11.5 share a subnet with mask /23? With /24?
`,

  eli5: `
Think of a street of houses. A full address has two parts, the street name and the house number. The street name tells you which street, and the house number finds the house on that street.

An IP address is both parts written together, like "10.20.10.15". But the number alone does not say where the street name ends and the house number begins. The subnet mask is a little ruler laid over the address that says "these first digits are the street, the rest is the house."

If you want to send something to a house on your own street, you walk it over yourself. If it is on another street, you hand it to the post office, which is the router. The ruler is how you decide between walking and handing it to the post office.

A bigger ruler (a shorter mask) means a longer street with more houses. A smaller ruler means a short street with only a few. And one house number on every street is always held back for "everyone on the street," so you cannot give that one to a person.
`,

  why: `
**Why does the mask exist?** The device must decide without asking anyone: is this destination on my wire, or do I need a router? The mask gives it the answer with one cheap bitwise AND. Without it, every device would need a list of who is local.

**Why subnet at all instead of one big network?** Broadcasts, faults and security. Every broadcast reaches every device in the subnet, so a smaller subnet limits the damage of a storm or a misbehaving device. A single subnet is also a single trust zone: anything on it can talk to everything else. Subnets are the unit you attach firewall rules and VLANs to. Experienced integrators almost always give each production line or machine area its own subnet.

**Why is the plan more important than the math?** The calculation is mechanical. The hard part is the design: leaving room to grow, not reusing a range that the IT department already uses elsewhere, and keeping the structure obvious. IP plans that are chosen casually (192.168.1.x everywhere) cost the most later, when two sites need to be joined and the address spaces overlap. That is why machine builders and integrators agree on ranges in the contract.

**Why static for control devices?** A device whose address changes breaks every client that connected to it by that address, and may do so at 3 a.m. after a power outage when the DHCP server was slower to boot than the PLCs. People still argue for DHCP with reservations (the server always gives the same IP to a given MAC, or to a given switch port) because it centralizes management. Both work if you document the choice. What fails is an undocumented mix.

**Why IPv4 still?** Plant networks are private and small, so address exhaustion does not hurt them, and most industrial devices are IPv4 only. IPv6 matters more on the IT side and in cloud links.
`,

  history: `
IPv4 was specified in 1981 (RFC 791) with 32-bit addresses and fixed "classes" (A, B, C) that set the network size. By the early 1990s the classes were wasteful and the internet was running out of address space, so CIDR (1993) replaced classes with the variable-length masks you use today. RFC 1918 (1996) set aside the private ranges that let organizations reuse addresses internally. NAT, introduced to stretch address space, later became a standard industrial tool for reconciling duplicate machine addresses.
`,

  examples: [
    {
      title: "Why the laptop cannot reach the PLC",
      body: `Laptop: 192.168.1.50 / 255.255.255.0. PLC: 192.168.0.10 / 255.255.255.0. The laptop ANDs the PLC address with its own mask and gets 192.168.0.0, which is not its own network, 192.168.1.0. It sends the packet to its default gateway (probably none) instead of directly to the PLC. Fix: put the laptop on 192.168.0.x, or add a second address on the laptop's adapter in the PLC's subnet.`
    },
    {
      title: "Carving a line subnet",
      body: `A small packaging line has 40 devices today and could double. Plan: 10.20.12.0/25 gives 126 usable hosts, a good fit. Gateway 10.20.12.1, PLC 10.20.12.10, HMI 10.20.12.50, drives 10.20.12.100-119. The upper half, 10.20.12.128/25, stays free as a second zone if you ever split the line.`
    }
  ],

  diagrams: {
    mask: `<svg viewBox="0 0 640 230" role="img" aria-label="Address 10.20.30.77 with mask /27: the first 27 bits are the network, the last 5 bits are the host">
  <text class="dg-title" x="20" y="26">10.20.30.77 /27 (mask 255.255.255.224)</text>
  <text class="dg-text-mono" x="20" y="62">Address</text>
  <text class="dg-text-mono" x="120" y="62">00001010.00010100.00011110.010 01101</text>
  <text class="dg-text-mono" x="20" y="92">Mask</text>
  <text class="dg-text-mono" x="120" y="92">11111111.11111111.11111111.111 00000</text>
  <rect class="dg-box-accent" x="120" y="108" width="272" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="256" y="130">network bits (27)</text>
  <rect class="dg-box-2" x="392" y="108" width="100" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="442" y="130">host (5)</text>
  <text class="dg-text-mono" x="20" y="176">Network   10.20.30.64   (host bits all 0)</text>
  <text class="dg-text-mono" x="20" y="198">Broadcast 10.20.30.95   (host bits all 1)</text>
  <text class="dg-text-mono" x="20" y="220">Hosts     10.20.30.65 - .94 (30 usable)</text>
</svg>`
  },

  pitfalls: [
    "Assuming that matching the first three bytes means same subnet. The mask decides, and a /26 can split a /24 into four.",
    "Using 192.168.1.x everywhere. Two sites or two machines with the same range collide as soon as they are joined.",
    "Leaving DHCP enabled on a PLC or drive so its address changes after a power cycle.",
    "Assigning the network or broadcast address to a device, such as .0 or .255 in a /24.",
    "Duplicate IP addresses, which show as intermittent connectivity as two devices fight over ARP.",
    "Planning subnets with zero growth, then running out of addresses on a line."
  ],

  keyTerms: ["ip-address", "subnet-mask", "cidr", "broadcast-address", "arp", "private-ip-address", "static-ip"],

  quiz: [
    {
      q: "How many usable host addresses are in 10.20.10.0/26?",
      options: ["64", "62", "30", "254"],
      answer: 1,
      explain: [
        "64 is the total number of addresses. Two are reserved for the network and broadcast addresses.",
        "Correct. /26 leaves 6 host bits: 2^6 = 64 addresses, minus network and broadcast = 62.",
        "30 is the usable count for a /27.",
        "254 is the usable count for a /24."
      ]
    },
    {
      q: "What is the broadcast address for 172.16.5.130/26?",
      options: ["172.16.5.191", "172.16.5.255", "172.16.5.131", "172.16.5.129"],
      answer: 0,
      explain: [
        "Correct. Block size is 64, so 130 is in the 128-191 block, and 191 is the last address of it.",
        "That is the broadcast address of the whole /24, not this /26.",
        "That is just the next host address.",
        "That is the first usable host of the block, one above the network address 172.16.5.128."
      ]
    },
    {
      q: "A PLC is 192.168.1.20/26 and a drive is 192.168.1.200/26. Can they talk directly without a router?",
      options: [
        "Yes, the first three bytes match",
        "Yes, because both are private addresses",
        "No, the PLC is in the 0-63 block and the drive is in the 192-255 block",
        "No, because the drive's address is above 128"
      ],
      answer: 2,
      explain: [
        "Matching bytes are not what decides. The mask is.",
        "Private addresses are not automatically on the same subnet.",
        "Correct. With block size 64 they sit in different subnets and need a router.",
        "The drive's address is not the issue. It is in a different block from the PLC."
      ]
    },
    {
      q: "A newly installed gateway PC shows 169.254.37.12. What is the most likely problem?",
      options: [
        "The subnet mask is too short",
        "The gateway has a duplicate IP",
        "It was assigned a public IP",
        "It is set to DHCP and no DHCP server answered"
      ],
      answer: 3,
      explain: [
        "A mask problem does not produce a 169.254 address.",
        "A duplicate IP would show a normal address plus a conflict warning.",
        "169.254.0.0/16 is link-local, not public.",
        "Correct. 169.254.x.x is the self-assigned link-local address a device uses when DHCP fails."
      ]
    },
    {
      q: "Which subnet mask is /22?",
      options: ["255.255.255.192", "255.255.254.0", "255.255.252.0", "255.255.248.0"],
      answer: 2,
      explain: [
        "That is /26.",
        "That is /23.",
        "Correct. /22 is 22 network bits: 255.255.252.0, giving 1024 addresses in blocks of 4 in the third byte.",
        "That is /21."
      ]
    },
    {
      q: "Which devices should usually get a static address (or a fixed DHCP reservation) rather than a dynamic one?",
      options: [
        "Visitor laptops",
        "PLCs, drives, HMIs and Ignition gateways",
        "Guest phones",
        "Technician tablets only"
      ],
      answer: 1,
      explain: [
        "Visitors are the classic DHCP use case.",
        "Correct. Anything other devices connect to by address must stay put.",
        "Phones are transient clients and fit DHCP.",
        "Tablets are clients too. The servers and controllers are the ones that need fixed addresses."
      ]
    }
  ],

  resources: [
    { title: "Dynamic Host Configuration Protocol", url: "https://en.wikipedia.org/wiki/Dynamic_Host_Configuration_Protocol", type: "article", source: "Wikipedia" },
    { title: "Deploying Network Address Translation within a Converged Plantwide Ethernet Architecture", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/td/enet-td007_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "OSI model", url: "https://en.wikipedia.org/wiki/OSI_model", type: "article", source: "Wikipedia" },
    { title: "Modbus driver (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/modbus", type: "docs", source: "Inductive Automation" }
  ]
});
