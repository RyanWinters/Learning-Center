LC.lesson({
  id: "proto-enip",
  title: "EtherNet/IP and CIP",
  track: "proto",
  minutes: 25,
  level: 2,
  prereqs: ["net-vlan"],
  tags: ["ethernet-ip", "cip", "allen-bradley", "io", "rpi", "multicast"],
  summary: "The Allen-Bradley native language: an object model (CIP) carried two ways, request/reply for configuration and scheduled producer/consumer for I/O.",
  objectives: [
    "Explain how CIP organizes a device into classes, instances and attributes",
    "Contrast explicit messaging (TCP 44818) with implicit I/O (UDP 2222)",
    "Describe what an RPI is and what a CIP connection costs a controller",
    "Explain why implicit I/O is multicast by default and what that demands of the network",
    "Say what an EDS file is and when you need one",
    "Describe how Ignition reaches a Logix controller and why connection counts matter"
  ],

  body: `
## What EtherNet/IP is

{{term:ethernet-ip|EtherNet/IP}} is the industrial Ethernet protocol of Rockwell Automation, and it is managed by ODVA, the vendor group that also owns DeviceNet and ControlNet. The "IP" stands for *Industrial Protocol*, not Internet Protocol. It is the native network of ControlLogix and CompactLogix PLCs, their I/O racks, drives, safety devices and a huge range of third-party gear. If you work in an Allen-Bradley plant, most of what is on the wire is EtherNet/IP.

The important point is that EtherNet/IP is a *transport*. The actual language is the **Common Industrial Protocol (CIP)**, an object-oriented protocol that ODVA also runs over DeviceNet and ControlNet. EtherNet/IP is CIP carried on ordinary Ethernet, TCP and UDP. Learn CIP once and DeviceNet makes sense too.

## The CIP object model

{{term:cip|CIP}} describes every device as a collection of **objects**. An object is built from three levels:

| Level | Meaning | Example |
|---|---|---|
| **Class** | A kind of object | Identity (class 0x01) |
| **Instance** | One copy of that class | Instance 1 of the Identity object |
| **Attribute** | One data item on the instance | Attribute 7 is the product name |

A request names a **service** (such as Get Attribute Single, 0x0E) plus the class/instance/attribute path. This is why every compliant device answers an identity request: ask class 0x01, instance 1 and you get vendor ID, device type, product code, revision, serial number and name. Tools use this to "browse" a network and list what is there.

Logix controllers add their own services on top for symbolic access, so you can ask for a tag by name (\`M101.Sts.Running\`) rather than by a numeric path.

## Two ways to move data

CIP defines two kinds of messaging, and they behave very differently on the network.

{{diagram:messaging}}

### Explicit messaging: request and reply on TCP 44818

{{term:explicit-messaging|Explicit messaging}} is client/server. The request spells out what is wanted (service, class, instance, attribute, or a tag name) and the device replies. It runs over **TCP port 44818**, and it suits configuration, diagnostics, program upload and anything that does not need a fixed update rate. A Logix \`MSG\` instruction, a Studio 5000 online session, a Rockwell faceplate read and Ignition reading tags are all explicit.

### Implicit messaging: scheduled I/O on UDP 2222

{{term:implicit-messaging|Implicit messaging}} is for real-time I/O. First, a CIP **connection** is opened (using a service called Forward Open on the TCP port). That connection fixes the data layout, size and rate. After that, data flows on **UDP port 2222** as small packets with just a connection ID, no addressing, no service code and no tag names. Both ends already know what the bytes mean. The word "implicit" refers to this.

Implicit traffic is **producer/consumer**. A device *produces* its data at a steady rate, and any number of consumers can receive the same packet. A drive, a remote I/O block and a safety controller all do this.

## Connections and the RPI

The rate at which a connection exchanges data is the {{term:rpi|Requested Packet Interval (RPI)}}. A remote I/O module configured with a 10 ms RPI sends its inputs to the controller every 10 ms and receives outputs at the same rate. The RPI is a request. The device may agree to a different value within its capabilities.

Each open connection uses controller memory and CPU. Every controller and Ethernet module has a maximum number of CIP connections, and the number is listed in its specification. I/O modules use connections, produced/consumed tags use connections, and so do MSG instructions, HMI sessions and Ignition. Run out and new devices fail with connection errors while old ones keep running.

> [!example] Counting connections
> A cell has one ControlLogix with a 1756-EN2T. It has 20 rack-optimized I/O blocks (20 connections), 6 drives with direct connections (6), 4 produced tags to a neighboring PLC (4 plus some consumed), a few MSG instructions and one Ignition Gateway. The total is nowhere near the module limit. Now add a second SCADA server, two engineering laptops, a vision system and 100 individually-connected I/O modules. The limit becomes a real design constraint.

*Rack-optimized* connections bundle many I/O modules into one connection, which is the main trick for saving count. Larger RPIs also reduce network and CPU load, so do not set everything to the fastest value. A 5 ms RPI on a temperature input that changes every minute wastes capacity.

## Unicast vs multicast

Implicit I/O uses **multicast** by default for produced data, so one packet reaches every consumer. The downside is that an ordinary unmanaged switch treats multicast like broadcast and sends it to every port. A busy I/O network then floods every device and every laptop on it.

A managed switch controls this with **IGMP snooping** and an IGMP querier, which prune multicast streams to only the ports whose devices joined the group. This is covered in {{lesson:net-vlan}}. Newer devices and controllers can also use **unicast** for implicit connections, which avoids the multicast issue at the cost of one packet per consumer. Many integrators choose unicast for small cells to avoid IGMP problems and multicast for plants with many consumers and properly managed switches.

> [!warning] Multicast floods
> The classic EtherNet/IP outage: someone plugs a laptop and a camera into an unmanaged switch carrying 40 multicast I/O streams. The laptop's NIC saturates, and the camera drops. If I/O devices and general traffic share a switch, use managed switches with IGMP snooping, or separate VLANs.

## EDS files

An {{term:eds-file|EDS (Electronic Data Sheet)}} is a text file from the device vendor that describes a device: its identity, which connections it supports, assembly sizes and parameters. Studio 5000 uses it to add third-party I/O or drives to the I/O tree, and configuration tools use it to show parameter names. Without the EDS you can still use a **Generic Ethernet Module** profile and enter the assembly instance numbers and sizes from the manual by hand. Rockwell devices usually have built-in profiles and need no EDS. Always match the device's firmware revision to the EDS or profile revision. A mismatch is a common cause of "electronic keying" faults.

## How Ignition reads a Logix controller

Ignition's Allen-Bradley Logix driver (part of the OPC UA module) connects to a controller over **explicit messaging on TCP 44818**. You create a device connection on the Gateway, give it the controller's IP address, and for a chassis-based controller give the slot number of the processor (zero-based). The driver is a client: it asks for tag values by name. It does not take part in implicit I/O or receive the cyclic produced/consumed data.

Ignition's documentation says the Logix driver supports Logix devices with firmware v21 and later, and that older controllers use the legacy ControlLogix and CompactLogix drivers. Tags in the controller can be browsed from the Gateway, so you rarely type tag names by hand. See {{lesson:ign-devices}}.

Each Ignition device connection opens CIP connections to the controller, so a Gateway with many device definitions or a redundant pair can add up on a busy controller. Keep the number of device connections per controller small, and read from a structured UDT rather than hundreds of independent addresses where possible. Large-scale polling behavior is covered in {{lesson:proto-polling-rbe}}.

> [!tip] If Ignition cannot connect to a controller
> Test in order. Ping the IP. Confirm TCP 44818 is open (a firewall or VLAN may block it). Check the slot number of the processor in the chassis. Check controller connection usage in the Ethernet module's diagnostic pages. Check that the controller is in a mode that allows reads.

## Securing EtherNet/IP

Classic CIP has no built-in authentication or encryption. A client that can reach TCP 44818 can read tags, and a client that can write can change the process. Layer the defenses:

- **Network first.** Keep controllers such as PLC1 (10.20.10.10) in the control VLAN, allow 44818 and 2222 only from the hosts that need them (for example the Ignition server, an engineering workstation), and keep enterprise and vendor traffic out. See {{lesson:net-security}}.
- **CIP Security.** ODVA's CIP Security extension adds device identity, integrity and optional encryption to EtherNet/IP, using TLS for explicit traffic and DTLS for implicit I/O. It works only if the controller, communication module and peers all support it, and it needs certificate or key management. Check the product documentation for supported firmware and profiles before you plan around it.
- **Controller mode and keyswitch.** On Logix controllers the keyswitch (RUN, REM, PROG) and the controller mode limit what a remote user can do. With the keyswitch in RUN, the mode cannot be changed remotely and downloads are blocked. Leaving controllers in REM or PROG makes remote mode changes and downloads possible, so set the mode your site policy requires.
- **Trusted sources and write restrictions.** Many Ethernet modules and controllers can disable unused services (such as the web server), restrict which sources may connect, or limit what an HMI or SCADA account may write. Rockwell's FactoryTalk Security and controller security settings are examples. The names and options vary by product and firmware, so check the manual for your version. In Ignition, use a read-only account or device connection where write access is not needed.
- **Protect the source.** Source protection and change tracking on the controller project make unauthorized edits visible.

Safety traffic on EtherNet/IP (CIP Safety) stays in the safety system and is outside the SCADA integration scope.
`,

  eli5: `
Think of a factory floor as a school office. Each device is a student with a locker. CIP is the rule that every locker has the same shape: a *category* (like "ID card"), a *numbered locker* inside it, and *items* in the locker.

There are two ways to get something from a locker. The first is to walk up and ask the student: "Please tell me the name on locker 1's ID card." That's explicit messaging. It's polite, flexible, and takes a moment.

The second is a standing arrangement. Before class, you and the student agree: "Every 10 seconds, put a note with your answer on the class board." Nobody has to ask again. Everyone who cares just glances at the board. That's implicit messaging. The note has no labels because everyone already knows what it means.

The board can get crowded, though. If every student pins a note and the school only has one big noticeboard, everyone has to read everything. A smarter board (a managed switch) shows each person only the notes they signed up for.
`,

  why: `
**Why two kinds of messaging?** Control needs *determinism*: the answer from input card 3 must arrive every 10 ms, whether or not anyone is looking at it. A request/reply cycle can't promise that, since replies queue and retry. Scheduled implicit connections give the controller a predictable stream. Humans and SCADA, meanwhile, need to ask for arbitrary things at arbitrary times. EtherNet/IP gives both at the cost of two models to learn.

**Why is the RPI a choice, not "as fast as possible"?** Every packet costs CPU in the controller and bandwidth on the switch. The scan is the real clock for control, so an RPI much faster than the controller's task period delivers data nobody uses. A common rule is to match the RPI to the speed the process actually needs: tens of milliseconds for general discrete I/O, faster for motion. People disagree here. Some integrators set everything to 20 ms and move on, others tune carefully. The cost of tuning is time, and the cost of not tuning is hidden until the network grows.

**Why does multicast cause so many problems?** Multicast is efficient on a correctly configured network and harmful on an unmanaged one. Many plants inherit unmanaged switches that quietly flood. The fix is usually network design (managed switches, IGMP snooping, VLANs) and not a PLC change. If you integrate, you will be asked to explain this to IT.

**Why do connection counts matter to a SCADA person?** Because a new Ignition Gateway, a historian or a diagnostic tool is a *client* of the controller, and clients consume connections. A controller that is "full" fails in confusing ways: some devices drop out when another client connects. Treat connections as a budget when you add integrations, and put them in the design document.

**Why security matters here.** Explicit CIP will carry a write from anyone who can reach port 44818. Put controllers behind firewalls and segment I/O traffic from enterprise traffic. CIP Security, controller mode and write restrictions add layers where the hardware supports them (see the section above and {{lesson:net-security}}).
`,

  history: `
ODVA published the EtherNet/IP specification in 2000 (the group was formed in 1995 to manage DeviceNet), applying the already-established CIP to standard Ethernet. Rockwell Automation made it the native network of its Logix platform, displacing ControlNet and DeviceNet in most new designs. CIP also runs over DeviceNet, ControlNet and CompNet, which is why the object model feels familiar across them.
`,

  examples: [
    {
      title: "Reading a tag from Ignition",
      body: `PLC1, a ControlLogix at 10.20.10.10, has its processor in slot 0 of the chassis. In the Gateway, add a Logix device connection with hostname 10.20.10.10 and slot 0. A controller-scoped UDT tag named \`M101\` then appears under the device in the OPC browser. Drag it to the tag browser and Ignition reads it with explicit messages on TCP 44818. Program-scoped tags are addressed with their program prefix, for example \`Program:MainProgram.Counter\`.`
    },
    {
      title: "A drive added with a Generic Ethernet Module",
      body: `The vendor supplied an EDS file, but you prefer not to install it. In the I/O tree choose Generic Ethernet Module with the drive's IP address, set the input assembly to instance 101 with size 4, the output assembly instance to 100 with size 4, and the configuration assembly to 102 with size 0 (all from the manual). Set the RPI to 20 ms. The controller opens a Class 1 connection and the drive's data appears as controller tags.`
    }
  ],

  diagrams: {
    messaging: `<svg viewBox="0 0 640 250" role="img" aria-label="Explicit messaging is a request and reply over TCP port 44818. Implicit messaging is a cyclic UDP port 2222 stream produced by an I/O device and received by a controller at the RPI.">
  <defs>
    <marker id="proto-enip-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="24">Explicit: ask and answer</text>
  <rect class="dg-box" x="20" y="38" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="68">Ignition / MSG</text>
  <rect class="dg-box-accent" x="470" y="38" width="150" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="68">Logix controller</text>
  <line class="dg-line" x1="152" y1="53" x2="466" y2="53" marker-end="url(#proto-enip-ah)"/>
  <line class="dg-line" x1="466" y1="75" x2="152" y2="75" marker-end="url(#proto-enip-ah)"/>
  <text class="dg-text-sm dg-mid" x="309" y="46">read M101.Sts.Speed</text>
  <text class="dg-text-sm dg-mid" x="309" y="96">value = 1450.0</text>
  <text class="dg-text-muted" x="20" y="116">TCP 44818 · carries service + path or tag name · any time</text>
  <text class="dg-title" x="20" y="152">Implicit: scheduled stream</text>
  <rect class="dg-box" x="20" y="166" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="196">Remote I/O block</text>
  <rect class="dg-box-accent" x="470" y="166" width="150" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="196">Logix controller</text>
  <line class="dg-line-accent" x1="152" y1="180" x2="466" y2="180" marker-end="url(#proto-enip-ah)"/>
  <line class="dg-line-accent" x1="152" y1="192" x2="466" y2="192" marker-end="url(#proto-enip-ah)"/>
  <line class="dg-line-accent" x1="152" y1="204" x2="466" y2="204" marker-end="url(#proto-enip-ah)"/>
  <text class="dg-text-sm dg-mid" x="309" y="162">every RPI (e.g. 10 ms)</text>
  <text class="dg-text-muted" x="20" y="238">UDP 2222 · connection ID only · data layout fixed by Forward Open</text>
</svg>`
  },

  pitfalls: [
    "Setting every RPI to the minimum. It loads the controller and the network without helping control.",
    "Putting multicast I/O on unmanaged switches shared with laptops, cameras and servers.",
    "Forgetting that every SCADA, historian and engineering client consumes controller connections.",
    "Using the wrong slot number (it is zero-based) when connecting to a chassis-based controller.",
    "Ignoring electronic keying and firmware mismatches when swapping a module or drive.",
    "Assuming an Ignition read is part of the I/O scan. It is a separate explicit request."
  ],

  keyTerms: ["ethernet-ip", "cip", "explicit-messaging", "implicit-messaging", "rpi", "eds-file", "producer-consumer", "cip-connection", "igmp-snooping"],

  quiz: [
    {
      q: "Ignition reads tags from a ControlLogix. Which kind of CIP messaging does the Logix driver use?",
      options: ["Implicit messaging on UDP 2222", "Explicit messaging on TCP 44818", "Modbus TCP on port 502", "Multicast producer/consumer"],
      answer: 1,
      explain: [
        "Implicit messaging is the scheduled I/O stream between controllers and I/O devices.",
        "Correct. The driver asks for tag values by name using request/reply messages.",
        "Modbus is a separate protocol and port.",
        "Producer/consumer is implicit I/O, which this driver does not join."
      ]
    },
    {
      q: "A remote I/O block has an RPI of 10 ms. What does that mean?",
      options: ["The block can respond to one MSG every 10 ms", "The block sends data only when a value changes by more than 10 ms of travel", "The block takes 10 ms to boot", "The controller and block exchange I/O data every 10 ms over an open connection"],
      answer: 3,
      explain: [
        "MSG instructions use explicit messaging and are not the RPI.",
        "RPI is a time interval and has no connection to value deadbands.",
        "RPI has nothing to do with boot time.",
        "Correct. The RPI is the requested update rate of the connection."
      ]
    },
    {
      q: "After a laptop and a camera are plugged into the I/O switch, several I/O devices begin dropping out. The switch is unmanaged. What is the most likely cause and fix?",
      options: ["Multicast I/O is flooding all ports; use a managed switch with IGMP snooping or a separate network", "The RPI is too long; shorten it", "The EDS file is the wrong revision; reinstall it", "TCP 44818 is blocked; open the port"],
      answer: 0,
      explain: [
        "Correct. An unmanaged switch floods multicast to every port. IGMP snooping prunes it.",
        "A shorter RPI would add more traffic, making the flooding worse.",
        "A wrong EDS revision shows up as a keying or configuration fault, not as a flood.",
        "Blocked TCP prevents connection setup. It does not match dropouts that start when other hosts join."
      ]
    },
    {
      q: "In CIP, what do class, instance and attribute describe?",
      options: ["Three layers of the OSI model", "Three levels of access control", "The kind of object, one copy of it, and one data item on it", "The sender, receiver and checksum"],
      answer: 2,
      explain: [
        "They are CIP's addressing hierarchy and not network layers.",
        "Access control is a separate security feature.",
        "Correct. For example: Identity (class), the first one (instance), product name (attribute).",
        "Those are packet fields, not the object model."
      ]
    },
    {
      q: "You are adding a third-party drive. The vendor gave you an EDS file. What does it give you?",
      options: ["A description of the device's connections, assemblies and parameters for your engineering tool", "A firewall exception", "A license for implicit messaging", "The device's IP address"],
      answer: 0,
      explain: [
        "Correct. Tools use it to build the module profile so you do not have to type assembly sizes by hand.",
        "An EDS is a description file and has no network function.",
        "There is no separate license for messaging in an EDS file.",
        "IP addresses are set on the device or through DHCP or BOOTP."
      ]
    },
    {
      q: "A controller starts rejecting new HMI sessions while I/O keeps running. What is a likely cause?",
      options: ["The scan time is too short", "The controller has run out of CIP connections", "The RPI is set to zero", "The gateway's license expired"],
      answer: 1,
      explain: [
        "A short scan time is not a cause of connection failures.",
        "Correct. Existing connections stay open, and new ones fail when the limit is reached.",
        "An RPI cannot be zero, and it would affect I/O, not HMI sessions.",
        "A license problem would not leave the connection-limited symptoms on the controller."
      ]
    }
  ],

  resources: [
    { title: "EtherNet/IP Technology Overview (Pub 138)", url: "https://www.odva.org/publication_download/ethernet-ip-technology-overview/", type: "standard", source: "ODVA" },
    { title: "CIP on Ethernet Technology (PUB00138)", url: "https://www.odva.org/wp-content/uploads/2024/04/PUB00138R8_Ethernet.pdf", type: "standard", source: "ODVA" },
    { title: "Common Industrial Protocol and the Family of CIP Networks", url: "https://www.odva.org/wp-content/uploads/2020/06/PUB00123R1_Common-Industrial_Protocol_and_Family_of_CIP_Networks.pdf", type: "standard", source: "ODVA" },
    { title: "EtherNet/IP Quick Start for Vendors Handbook", url: "https://www.odva.org/wp-content/uploads/2020/05/PUB00213R0_EtherNetIP_Developers_Guide.pdf", type: "standard", source: "ODVA" },
    { title: "Network Infrastructure for EtherNet/IP: Introduction and Considerations", url: "https://www.odva.org/wp-content/uploads/2020/05/PUB00035R0_Infrastructure_Guide.pdf", type: "standard", source: "ODVA" },
    { title: "Driver Modules (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/modules-overview/core-modules/opc-ua-module/driver-modules", type: "docs", source: "Inductive Automation" },
    { title: "Connecting to Logix (Ignition 8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/opc-ua/opc-ua-drivers/allen-bradley-ethernet/connecting-to-logix", type: "docs", source: "Inductive Automation" }
  ]
});
