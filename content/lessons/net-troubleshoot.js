LC.lesson({
  id: "net-troubleshoot",
  title: "Troubleshooting toolkit: ping to Wireshark",
  track: "net",
  minutes: 25,
  level: 2,
  prereqs: ["net-routing"],
  tags: ["troubleshooting", "ping", "wireshark", "arp", "tracert", "test-netconnection", "span", "nslookup"],
  summary: "A short list of tools, used in a fixed order, that finds the layer where a connection breaks, ending with a packet capture when nothing else explains it.",
  objectives: [
    "Use ping, ipconfig, arp -a, tracert, nslookup and netstat to localize a fault by layer",
    "Test a specific TCP port with Test-NetConnection when ping is not enough",
    "Write capture filters and display filters for Modbus TCP and EtherNet/IP",
    "Explain port mirroring (SPAN) and why you need it to capture other devices' traffic",
    "Walk through the 'HMI cannot see the PLC' diagnosis in order"
  ],

  body: `
## Work up the stack, not randomly

When something does not connect, the temptation is to try things. A better habit is to test one layer at a time, from the bottom up, and stop at the first layer that fails. The fault is there.

| Layer | Question | Tool |
|---|---|---|
| Physical | Is there a link light? Is the cable good? | Eyes, switch port status |
| Data link | Is the device's MAC address visible? | \`arp -a\`, switch MAC table |
| Network | Is the IP correct, and can packets get there? | \`ipconfig\`, \`ping\`, \`tracert\` |
| Name | Does the name resolve to the right address? | \`nslookup\` |
| Transport | Is the port open and listening? | \`Test-NetConnection\`, \`netstat\` |
| Application | Does the protocol conversation succeed? | Wireshark, driver diagnostics |

## The command-line tools

### ipconfig: what am I?

\`\`\`text
C:\\> ipconfig /all
Ethernet adapter Plant:
   IPv4 Address. . . . . : 10.10.30.5
   Subnet Mask . . . . . : 255.255.255.0
   Default Gateway . . . : 10.10.30.1
   DNS Servers . . . . . : 10.10.30.2
\`\`\`

Check your own address and mask first. A laptop at 192.168.1.50 cannot reach a PLC at 10.10.10.10 without a router, and a 169.254.x.x address means DHCP failed. Computers with two network cards often use the wrong one. Check which adapter is on the plant network.

### ping: is anything there?

\`ping 10.10.10.10\` sends ICMP echo requests. A reply means layers 1 to 3 work. No reply does **not** prove the device is down: some devices and firewalls ignore ping. Useful variations:

- \`ping -t 10.10.10.10\` runs continuously, so you can wiggle a cable and watch.
- \`ping -l 1472 -f 10.10.10.10\` sends a full-size packet with the "do not fragment" flag, to find MTU problems.
- Read the reply text. "Destination host unreachable" from your own address means no route or ARP failure. "Request timed out" means no answer.

### arp -a: did layer 2 find it?

\`arp -a\` lists the IP to MAC mappings your computer has learned. If the PLC's address is in the list with a MAC address, layer 2 works, and a vendor prefix (the first three bytes of the MAC) tells you what kind of device answered. Rockwell devices start with 00:00:BC or 5C:88:16, for example. If you see "incomplete" or no entry, the device is not answering ARP: wrong subnet, cable, or VLAN.

A MAC address that belongs to a different device than expected is the signature of a **duplicate IP address**. If two devices have the same IP, ping works intermittently, and the ARP entry flips between two MACs. Clear it with \`arp -d *\` and watch which MAC comes back.

### tracert: where does it stop?

\`tracert 10.20.1.10\` lists each router hop. Where it stops showing replies is the hop to investigate. A trace that dies at the first hop means your default gateway is wrong or down. If only the last hop fails, the target or its firewall is the issue.

### nslookup: name versus address

\`nslookup historian01\` asks DNS for the address. If the name resolves to an old IP, you have stale DNS. When a name works from one PC and not another, compare their DNS servers with \`ipconfig /all\`. For plant devices, use IP addresses in driver configuration where possible, which removes DNS as a cause.

### netstat: who is connected?

\`netstat -ano | findstr 44818\` lists TCP connections on port 44818 with the owning process ID. On the Ignition gateway machine, it shows if there is an established connection to the PLC. \`netstat -an | findstr LISTENING\` shows which ports a server is listening on.

## Testing a port: Test-NetConnection

Ping tells you about ICMP. Most industrial failures are about a TCP port. In PowerShell:

\`\`\`text
PS> Test-NetConnection 10.10.10.10 -Port 44818

ComputerName     : 10.10.10.10
RemotePort       : 44818
TcpTestSucceeded : True
\`\`\`

\`TcpTestSucceeded : True\` means a TCP handshake completed, so the path and the device's listener are fine. \`False\` with \`PingSucceeded : True\` means the host is alive but the port is blocked by a firewall or the service is not running. Common ports to test:

| Port | Service |
|---|---|
| TCP 502 | Modbus TCP |
| TCP 44818 | EtherNet/IP explicit messaging |
| UDP 2222 | EtherNet/IP implicit I/O (cannot be tested with TCP tools) |
| TCP 4840 | OPC UA |
| TCP 8088 / 8043 | Ignition gateway HTTP / HTTPS |
| TCP 1433, 3306, 5432 | SQL Server, MySQL, PostgreSQL |

## Wireshark

{{term:wireshark|Wireshark}} captures the actual packets and decodes protocols. It is the last tool because it answers questions the others can't: what exactly was sent, what came back, and how long it took.

### Capture filters and display filters

Two kinds of filters exist and use different syntax. A **capture filter** limits what is recorded, in BPF syntax. A **display filter** hides packets after capture, in Wireshark's own syntax.

| Goal | Capture filter | Display filter |
|---|---|---|
| Modbus TCP | \`tcp port 502\` | \`tcp.port == 502\` or \`modbus\` |
| EtherNet/IP explicit | \`port 44818\` | \`enip\` or \`tcp.port == 44818\` |
| CIP content | \`port 44818 or udp port 2222\` | \`cip\` |
| One device | \`host 10.10.10.10\` | \`ip.addr == 10.10.10.10\` |
| Slow or broken TCP | not available | \`tcp.analysis.flags\` |
| ARP only | \`arp\` | \`arp\` |

The Modbus dissector only decodes port 502 by default. If a gateway uses another port, change the dissector's port preference or use "Decode As".

### What to look for

- **TCP SYN with no reply** (or a reset): the port is blocked or closed.
- **Modbus exception responses**: filter \`modbus.func_code > 128\` to see error replies.
- **Retransmissions and long gaps**: \`tcp.analysis.retransmission\`. They point at packet loss or an overloaded device.
- **Response time**: right-click a request and apply the time between request and reply as a column. A slow device shows 500 ms where a healthy one shows 5 ms.

### Port mirroring (SPAN)

On a switch, a PC only sees traffic addressed to it, to broadcast, and to multicast it has joined. To see conversation between a PLC and the gateway, ask the switch to copy it. This is {{term:span-port|port mirroring}}, called SPAN on Cisco gear: you choose the source port (the PLC's) and a destination port (your laptop's). Everything entering and leaving the source is copied to the destination.

{{diagram:span}}

Capture on a mirrored port for a short time, and never leave a mirror configured. If the destination is a busy port, mirrored traffic can exceed the link and drop packets. For a permanent tap, use a hardware network tap.

> [!warning] Capturing on a live control network
> Wireshark on a mirror port is passive and safe. Do not plug an unmanaged laptop with DHCP or discovery tools into a control VLAN. Get the switch config right first, and follow your site's rules.

## The story: "The HMI can't see the PLC"

An operator reports that the HMI on the packaging line shows comm-fail on every tag. The PLC is a CompactLogix at 10.10.10.10, the HMI at 10.10.10.50, the gateway at 10.10.30.5. Work through it in order:

1. **Physical.** The HMI's link light is on, and the PLC's switch port shows green. No change was made at the panel today.
2. **ipconfig on the HMI.** It shows 10.10.10.50 / 255.255.255.0 and gateway 10.10.10.1. Correct.
3. **ping 10.10.10.10.** Replies in under 1 ms. Layers 1 to 3 are working between the HMI and the PLC.
4. **arp -a.** 10.10.10.10 maps to the right Rockwell MAC. No duplicate IP.
5. **Test-NetConnection 10.10.10.10 -Port 44818.** \`TcpTestSucceeded : True\`. The PLC accepts connections.

So the HMI reaches the PLC, yet tags show comm-fail. The network is fine and the problem is above it. Check the application layer:

6. **Driver diagnostics.** The HMI's driver is configured for 10.10.10.11 (a typo from last week's edit). The driver is trying to reach an address nobody owns.
7. **Wireshark** on the HMI, filter \`ip.addr == 10.10.10.11\`: you see only ARP requests with no reply, which is what a nonexistent host looks like on the wire.

The fix is a one-character address change in the driver, confirmed by a filter of \`enip\` showing the session register request and reply. The lesson: ping success only excludes layers 1 to 3. Each test removed a whole category of causes, and the capture proved the cause without guessing.

The gateway-side version of the same problem (the Ignition gateway cannot reach the PLC) runs the same steps from the gateway machine, and you also read the device's status page in the gateway configuration, which reports connection state and errors.
`,

  eli5: `
Imagine you phone a friend and no one answers. A good way to find out why is to check things in order. Is your phone charged? Do you have signal? Did you dial the right number? Is their phone ringing? Does someone pick up, but you can't understand them?

Each tool in this lesson checks one of those questions. Ping is like ringing the doorbell: if someone answers, the house exists and the road to it works. The ARP list is like the street directory your computer keeps of which house has which name. Tracert is a map of every town you pass through on the way. Test-NetConnection is knocking on one particular door (the one for the PLC) to see if someone opens.

Wireshark is the tape recorder. When the ordinary checks all pass and it still doesn't work, you record the whole conversation and listen to what was really said. Port mirroring is asking the post office to give you a copy of the letters going to one address, so you can read them.
`,

  why: `
**Why bottom-up?** Because the lower layers are cheaper to test and each pass rules out a whole class of causes. If ping works, you stop suspecting cables, VLANs and routes. People who start with Wireshark drown in packets. People who start by restarting things hide the evidence.

**Why ping isn't proof.** A device can reply to ping while its EtherNet/IP stack is dead, and can ignore ping while working fine. The question to ask is always "what test matches the thing I need?" If you need TCP 44818, test TCP 44818.

**Why capture is the last resort, not the first.** Packet captures are decisive, but they take time to read, they need a mirror port and they can include sensitive data. Most faults end at step 3 or 5. Wireshark is for the intermittent, the slow and the "everything looks fine" cases.

**What integrators argue about.** Whether to keep a dedicated troubleshooting laptop with a fixed address on every network, and whether permanent mirror or tap ports should exist in each cabinet. Teams that have one tend to solve problems in minutes, and teams that don't spend afternoons guessing. The risk to weigh is that a spare access port is also a place to plug in something unauthorized, so it needs port security and a documented procedure.

**Document the baseline.** The best troubleshooting data is a capture or a ping time you took when the system worked. Record normal response times and the ARP table after commissioning, and the comparison does half the work.
`,

  history: `
Ping was written by Mike Muuss in 1983 and named after the sound of sonar. The tool Wireshark began as Ethereal, written by Gerald Combs and first released in 1998, and was renamed in 2006. SPAN and similar port mirroring features appeared in managed switches in the 1990s, when switches replaced shared hubs that had let any machine see all traffic.
`,

  examples: [
    {
      title: "Ping works, Modbus doesn't",
      body: `A power meter at 10.10.50.20 replies to ping in 2 ms, but Ignition shows bad quality. \`Test-NetConnection 10.10.50.20 -Port 502\` returns \`TcpTestSucceeded : False\`. The meter has its Modbus TCP server disabled in the front-panel menu, and the setting reverted after a firmware update. Enabling it fixes the tags.`
    },
    {
      title: "Finding a duplicate IP",
      body: `Ping to a drive at 10.10.10.30 succeeds 3 times out of 4. \`arp -a\` shows the MAC for that IP alternating between 5c:88:16:aa:01:02 and a different vendor's address. A newly installed camera was given the same address. Changing the camera's IP restores stable ping and the drive's connection stops dropping.`
    }
  ],

  diagrams: {
    span: `<svg viewBox="0 0 640 220" role="img" aria-label="A switch copies all traffic from the PLC port to a mirror port where a laptop running Wireshark captures it, while normal traffic continues to the gateway">
  <rect class="dg-box" x="20" y="80" width="100" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="70" y="107">PLC</text>
  <rect class="dg-box-accent" x="250" y="60" width="140" height="84" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="96">Managed switch</text>
  <text class="dg-text-muted dg-mid" x="320" y="118">SPAN enabled</text>
  <rect class="dg-box" x="520" y="30" width="100" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="570" y="57">Gateway</text>
  <rect class="dg-box" x="500" y="140" width="120" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="560" y="162">Laptop</text>
  <text class="dg-text-muted dg-mid" x="560" y="178">Wireshark</text>
  <line class="dg-line" x1="120" y1="102" x2="250" y2="102"/>
  <line class="dg-line" x1="390" y1="82" x2="520" y2="55"/>
  <line class="dg-line" x1="390" y1="122" x2="500" y2="160" stroke-dasharray="5 4"/>
  <text class="dg-text-muted" x="130" y="94">source port</text>
  <text class="dg-text-muted" x="400" y="150">copy</text>
  <text class="dg-text-muted" x="410" y="62">normal path</text>
</svg>`
  },

  pitfalls: [
    "Treating a failed ping as proof the device is down, or a good ping as proof the protocol works.",
    "Capturing on a laptop plugged into a normal switch port and wondering why the PLC's traffic is not visible.",
    "Using a capture filter's syntax in the display filter bar, or the reverse.",
    "Changing several things at once, so you can't tell which one fixed it.",
    "Leaving a SPAN session or an open mirror port configured after the job.",
    "Using hostnames in device configs when DNS is unreliable on the plant network."
  ],

  keyTerms: ["ping", "arp", "tracert", "test-netconnection", "wireshark", "span-port", "capture-filter", "nslookup"],

  quiz: [
    {
      q: "Ping to a PLC succeeds, but Ignition shows the device as faulted. Which test best narrows it down next?",
      options: ["Replace the cable", "Test-NetConnection to the PLC on port 44818", "Reboot the switch", "tracert to the PLC"],
      answer: 1,
      explain: [
        "A cable that carries ping replies is rarely the problem.",
        "Correct. Ping only proves ICMP. Testing the actual TCP port shows if the listener is reachable.",
        "Rebooting hides evidence and rarely fixes an application-layer fault.",
        "Tracert shows router hops, and a same-subnet device has none."
      ]
    },
    {
      q: "You plug a laptop into a switch and run Wireshark. You see only broadcasts and your own traffic. What do you need?",
      options: ["A faster laptop", "A port mirror (SPAN) or tap copying the PLC's traffic to your port", "A different Wireshark version", "To disable the firewall"],
      answer: 1,
      explain: [
        "Speed does not change which frames the switch sends you.",
        "Correct. A switch forwards unicast only to the destination port, so you need a copy.",
        "All versions have the same limit.",
        "A host firewall does not change what the switch delivers."
      ]
    },
    {
      q: "In Wireshark, which is a display filter that shows only Modbus TCP traffic?",
      options: ["tcp port 502", "tcp.port == 502", "port=502", "modbus.port"],
      answer: 1,
      explain: [
        "That is capture filter (BPF) syntax and is used before capture starts.",
        "Correct. Display filters use field names with == for comparison.",
        "This is not valid in either filter language.",
        "No such field exists."
      ]
    },
    {
      q: "Ping to a drive succeeds three out of four times, and the ARP entry for its IP changes between two MAC addresses. What is the cause?",
      options: ["Packet loss on the cable", "A duplicate IP address", "A DNS error", "A full MAC table"],
      answer: 1,
      explain: [
        "Loss would not change the MAC for the IP.",
        "Correct. Two devices answer for the same address, so replies alternate.",
        "DNS maps names to addresses and doesn't affect ARP for a known IP.",
        "A full MAC table floods unicast but doesn't change ARP replies."
      ]
    },
    {
      q: "Test-NetConnection to the PLC on 44818 shows PingSucceeded True and TcpTestSucceeded False. What does this suggest?",
      options: ["The cable is bad", "The host is alive but the port is blocked or the service isn't listening", "DNS is wrong", "The PLC has no IP address"],
      answer: 1,
      explain: [
        "Ping replies show the physical path works.",
        "Correct. A firewall rule, ACL, or disabled service blocks the handshake.",
        "You tested by IP address, so DNS plays no part.",
        "The ping shows it has an address."
      ]
    }
  ],

  resources: [
    { title: "Wireshark Industrial Ethernet Filtering Tutorial", url: "https://industrialmonitordirect.com/blogs/knowledgebase/wireshark-industrial-ethernet-filtering-tutorial", type: "article", source: "Industrial Monitor Direct" },
    { title: "Using Wireshark for PLC Ethernet Communication Analysis", url: "https://industrialmonitordirect.com/blogs/knowledgebase/using-wireshark-for-plc-ethernet-communication-analysis", type: "article", source: "Industrial Monitor Direct" },
    { title: "Wireshark Modbus TCP capture filter and diagnosis", url: "https://docs.chipkin.com/articles/wireshark-modbus-tcp-capture-filter-diagnose/", type: "article", source: "Chipkin" }
  ]
});
