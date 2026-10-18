LC.lesson({
  id: "proto-modbus",
  title: "Modbus RTU & TCP",
  track: "proto",
  minutes: 25,
  level: 2,
  prereqs: ["proto-serial", "net-ip"],
  tags: ["modbus", "polling", "registers", "serial", "drivers"],
  summary: "The oldest protocol you'll still use every month: four tables, a handful of function codes, and one off-by-one trap.",
  objectives: [
    "Name the four Modbus data tables and say which are read-only",
    "Translate a 4xxxx address from a device manual into a function code and a zero-based offset",
    "Explain how Modbus RTU and Modbus TCP frame the same request differently",
    "Handle 32-bit values and word order when reading floats",
    "Configure an Ignition Modbus device and address a tag correctly"
  ],

  body: `
## What Modbus is

{{term:modbus|Modbus}} is a request/response protocol published by Modicon in 1979 for its PLCs. It was simple, documented and free to implement, so every vendor adopted it. Today you will find it in power meters, VFDs, flow computers, chillers, scales and almost any packaged equipment whose builder wanted "a protocol everyone can talk to."

Modbus has one job: let a **client** (historically "master") read and write values in a **server** (historically "slave"). The server never speaks unless asked. That single fact explains most of Modbus's strengths and weaknesses.

## The four tables

Every Modbus server exposes up to four tables. Device manuals describe them with a leading digit, which is a convention for humans, not something sent on the wire.

{{diagram:tables}}

| Table | Convention | Size | Access | Read FC | Write FC |
|---|---|---|---|---|---|
| Coils | 0xxxx | 1 bit | read/write | 01 | 05 single, 15 multiple |
| Discrete Inputs | 1xxxx | 1 bit | read-only | 02 | none |
| Input Registers | 3xxxx | 16 bits | read-only | 04 | none |
| Holding Registers | 4xxxx | 16 bits | read/write | 03 | 06 single, 16 multiple |

Holding registers do most of the real work. Setpoints, run commands and status words almost always live there.

Modbus only knows bits and 16-bit words. The same 16 bits are an INT or a UINT depending on the tag's data type: a temperature of -5 degrees C arrives as 65531 in an unsigned tag. A negative value showing up as 65,000-plus means the tag is UINT and should be INT. Values wider than 16 bits (32-bit integers, floats) span two registers, and the word order is a device setting.

> [!warning] The off-by-one trap
> On the wire, addresses are **zero-based offsets** inside a table. "40001" in a manual means *holding register table, offset 0*. "40108" means offset 107. Some manuals list offsets directly (0-based), some list register numbers (1-based), and a few mix both. When a value comes back from the register next to the one you expected, this is almost always why.

## Function codes

A request is just a {{term:function-code|function code}} plus parameters. "Read holding registers" (FC03) sends a starting offset and a count; the server answers with the bytes. A single FC03 can read up to 125 registers, so a good driver groups neighboring addresses into one request instead of asking for each value separately.

If the server can't do what you asked, it replies with the function code plus 0x80 (FC03 becomes 0x83) and an **exception code**:

- **01 Illegal Function**: the device doesn't support that function code (common when you ask a meter for coils it doesn't have).
- **02 Illegal Data Address**: the offset doesn't exist. Usually the off-by-one trap, or reading a block that crosses a gap in the device's map.
- **03 Illegal Data Value**: the value or count is out of range.
- **04 Server Device Failure**: the device had an internal error.

## RTU vs TCP: same message, different envelope

The request inside, called the PDU, is identical. What changes is the wrapper around it.

{{diagram:frames}}

**{{term:modbus-rtu|Modbus RTU}}** runs over serial, usually {{term:rs485|RS-485}}, where many devices share one pair of wires. Each frame starts with a **unit address** (1–247) so the right device answers, and ends with a CRC-16 checksum. Frames are separated by silence, at least 3.5 character times. Only one client may exist on the bus, and only one request is in flight at a time, so the poll cycle is the sum of every device's response time.

**{{term:modbus-tcp|Modbus TCP}}** wraps the PDU in a 7-byte **MBAP header** and sends it over TCP port 502. There's no CRC because TCP already guarantees delivery. The header carries a transaction ID, so a client can have several requests outstanding, plus a **unit ID**. The unit ID is ignored by most native TCP devices, but it is essential when you go through a **serial gateway**. In that case the gateway uses the unit ID to pick which RS-485 device to forward to.

## Data types beyond 16 bits

Modbus only knows bits and 16-bit words. Anything bigger, such as a 32-bit integer, a REAL/float or a 64-bit energy total, spans two or four consecutive registers. The standard says bytes inside a register are big-endian, but it says nothing about which *register* comes first. Vendors disagree, which is why every serious driver has a "word swap" or "reverse word order" option.

> [!example] Reading a float
> A meter documents "Voltage L1-N, FLOAT32, 40101–40102". Your driver reads offsets 100 and 101 and gets 0x4366 and 0x6666. Combined high word first, that's 0x43666666 = **230.4**. Swapped, it's 0x66664366, a nonsense number around 2.7 × 10²³. If you see absurd values that change smoothly, try the word-swap setting first.

## Modbus in Ignition

Ignition ships Modbus drivers as part of its OPC UA module. You add a device on the Gateway, give it an IP address and port (502), and then create OPC tags that point at addresses like these:

- \`HR1\`: holding register 1 (40001), as a 16-bit integer
- \`HRF101\`: a float built from holding registers 101–102 (type prefixes and suffixes vary, so confirm the exact syntax on the Modbus address mapping page for your Ignition version)
- \`C5\`, \`DI5\`, \`IR5\`: coil, discrete input and input register 5

The driver defaults to **one-based** addressing, so \`HR1\` means 40001 (wire offset 0). The device settings include a zero-based toggle and word-order options, and **address mapping** lets you define blocks of addresses for devices whose manuals use their own numbering, including octal. Many meters and drives also expose a watchdog or heartbeat register. Write an incrementing value to it from Ignition (or read the device's own counter) and alarm if it stops changing; that is a reliable way to feed a communication-loss alarm such as \`Alm.CommLoss\` in the motor UDT. The tag's quality tells you about exceptions: a tag with a bad address will show a bad quality instead of a value.

> [!tip] Commissioning a new Modbus device
> Before building screens, create three test tags: one register whose value you know (a firmware version or serial number), one float, and one value you can change at the device. If the known value is off by one register, fix the zero-based setting. If the float is garbage, fix word order. Then build the rest.

## Why Modbus still matters

Modbus is everywhere because it costs a vendor almost nothing to implement and needs no licensing, special hardware or configuration tool. Its limits are just as real: there is no security (anyone on the network can write a coil), no data types, no tag names and no way for a device to report a change on its own. Every value must be polled. Those gaps are exactly what newer protocols like {{lesson:proto-opc}} and {{lesson:proto-sparkplug}} were designed to close.
`,

  eli5: `
Picture a filing cabinet with four drawers. Two drawers hold light switches (on/off things) and two hold number cards. In one switch drawer and one number drawer you're only allowed to look. In the other two you can look *and* change things.

Modbus is a very polite, very strict way to ask for things from that cabinet: "Please show me number cards 100 and 101 from the change-allowed number drawer." The cabinet never volunteers anything. If you want to know whether a number changed, you have to keep asking.

The confusing part is the labels. The manual calls the first card "40001", but the cabinet itself calls it "card 0". So when you're one card off, that's why.

RTU and TCP are just two ways of delivering the same note. RTU is like passing it down a row of desks, where everyone hears it and only the named person answers. TCP is like mailing it in an envelope.
`,

  why: `
**Why holding registers for everything?** Many devices put even read-only values in holding registers because FC03 is the one function every client supports. Expect it, and don't assume a value is writable just because it's a 4xxxx address. Check the manual.

**Why group addresses?** Each request costs a round trip. On RS-485 at 19,200 baud, one request and reply for a single register takes several milliseconds, and the bus can only carry one at a time. Reading 50 neighboring registers in one FC03 is far faster than 50 separate reads. That's why drivers optimize contiguous blocks, and why a device map with values scattered everywhere polls slowly.

**Why isolate Modbus networks?** Modbus has no authentication. A Modbus TCP device on a flat network can be written by anything that can reach port 502. Put such devices on their own VLAN or behind a firewall that only lets the SCADA server through. See {{lesson:net-security}}.
`,

  history: `
Modicon released Modbus in 1979 for its 084 and 184 controllers. Modicon is the company Dick Morley's team founded to build the first PLC. Modbus/TCP followed in 1999. In 2004 Schneider Electric, by then Modicon's owner, transferred the rights to the independent Modbus Organization, which publishes the specifications free of charge. The Modbus Organization has since moved its specifications from "master/slave" to "client/server" wording (check its current documents for details), and newer manuals use the new terms.
`,

  examples: [
    {
      title: "Reading a VFD's speed from its manual",
      body: `The drive manual says: *"Output Frequency, 0.01 Hz units, read-only, register 40003"*. In Ignition with default one-based addressing, the tag address is \`HR3\`. A raw value of 4512 means 45.12 Hz, so add a scale on the tag (raw 0–6000 → 0–60.00 Hz) or divide by 100 in an expression tag.`
    },
    {
      title: "Diagnosing exception 02",
      body: `Reading 40001–40125 from a power meter fails with *Illegal Data Address*, but 40001–40050 works. The meter's map has a gap at 40051–40099. A request that spans a gap fails as a whole. The fix is to stop the driver from grouping across the gap, by splitting the tags or tuning the driver's maximum request size.`
    }
  ],

  diagrams: {
    tables: `<svg viewBox="0 0 640 230" role="img" aria-label="The four Modbus tables: coils and holding registers are read-write, discrete inputs and input registers are read-only">
  <text class="dg-title" x="20" y="26">Bits</text>
  <text class="dg-title" x="340" y="26">16-bit words</text>
  <rect class="dg-box-accent" x="20" y="40" width="280" height="80" rx="6"/>
  <text class="dg-text" x="36" y="68">Coils</text>
  <text class="dg-text-mono" x="36" y="90">0xxxx · FC01 / 05 / 15</text>
  <text class="dg-label-accent" x="36" y="108">READ / WRITE</text>
  <rect class="dg-box" x="20" y="132" width="280" height="80" rx="6"/>
  <text class="dg-text" x="36" y="160">Discrete Inputs</text>
  <text class="dg-text-mono" x="36" y="182">1xxxx · FC02</text>
  <text class="dg-text-muted" x="36" y="200">READ ONLY</text>
  <rect class="dg-box-accent" x="340" y="40" width="280" height="80" rx="6"/>
  <text class="dg-text" x="356" y="68">Holding Registers</text>
  <text class="dg-text-mono" x="356" y="90">4xxxx · FC03 / 06 / 16</text>
  <text class="dg-label-accent" x="356" y="108">READ / WRITE</text>
  <rect class="dg-box" x="340" y="132" width="280" height="80" rx="6"/>
  <text class="dg-text" x="356" y="160">Input Registers</text>
  <text class="dg-text-mono" x="356" y="182">3xxxx · FC04</text>
  <text class="dg-text-muted" x="356" y="200">READ ONLY</text>
</svg>`,
    frames: `<svg viewBox="0 0 640 200" role="img" aria-label="An RTU frame is unit address, PDU and CRC; a TCP frame is MBAP header and the same PDU">
  <text class="dg-title" x="20" y="26">Modbus RTU (serial)</text>
  <rect class="dg-box" x="20" y="38" width="110" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="75" y="65">Unit address</text>
  <rect class="dg-box-accent" x="130" y="38" width="330" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="295" y="58">PDU</text>
  <text class="dg-text-mono dg-mid" x="295" y="74">function code + data</text>
  <rect class="dg-box" x="460" y="38" width="110" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="515" y="65">CRC-16</text>
  <text class="dg-title" x="20" y="124">Modbus TCP (port 502)</text>
  <rect class="dg-box" x="20" y="136" width="110" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="75" y="156">MBAP header</text>
  <text class="dg-text-muted dg-mid" x="75" y="172">7 bytes, unit ID</text>
  <rect class="dg-box-accent" x="130" y="136" width="330" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="295" y="156">PDU</text>
  <text class="dg-text-mono dg-mid" x="295" y="172">identical to RTU</text>
  <text class="dg-text-muted" x="470" y="163">no CRC: TCP</text>
  <text class="dg-text-muted" x="470" y="177">checks delivery</text>
</svg>`
  },

  pitfalls: [
    "Assuming 40001 is sent as 40001. It's offset 0 in the holding register table.",
    "Ignoring word order on 32-bit values, which gives huge or tiny numbers that still track the real value.",
    "Putting two Modbus clients on one RS-485 bus. RTU allows exactly one.",
    "Polling hundreds of scattered single registers on a slow serial link, then wondering why updates take 10 seconds.",
    "Leaving Modbus TCP devices on a flat network. There is no authentication."
  ],

  keyTerms: ["modbus", "modbus-rtu", "modbus-tcp", "function-code", "holding-register", "rs485", "polling"],

  quiz: [
    {
      q: "A meter manual lists 'Total kWh' at 40021. Which function code reads it, and what offset goes on the wire?",
      options: ["FC04, offset 21", "FC03, offset 20", "FC03, offset 40021", "FC01, offset 20"],
      answer: 1,
      explain: [
        "FC04 reads input registers (3xxxx). 4xxxx is the holding register table.",
        "Correct. 4xxxx means holding registers (FC03), and register 40021 is offset 20 because wire addresses start at 0.",
        "The leading 4 isn't sent. It only tells a human which table to use.",
        "FC01 reads coils, which are single bits."
      ]
    },
    {
      q: "Which two Modbus tables can a client write to?",
      options: ["Coils and holding registers", "Discrete inputs and input registers", "Holding and input registers", "All four"],
      answer: 0,
      explain: [
        "Correct. Coils (bits) and holding registers (words) are read/write.",
        "Both of these are read-only by definition.",
        "Input registers are read-only.",
        "Discrete inputs and input registers are read-only."
      ]
    },
    {
      q: "A float tag reads 1.7E+38 and moves up and down with the real process value. What's the most likely fix?",
      options: ["Switch to zero-based addressing", "Change the word order (swap words)", "Use FC04 instead of FC03", "Lower the poll rate"],
      answer: 1,
      explain: [
        "An addressing error usually gives a value from the wrong register entirely, not a scrambled float that still tracks the process.",
        "Correct. A huge value that follows the process means the two 16-bit halves are being combined in the wrong order.",
        "The function code chooses the table. If the table were wrong you'd likely get an exception or unrelated data.",
        "The poll rate affects how often you read, not how the value is decoded."
      ]
    },
    {
      q: "Why does Modbus TCP not need the CRC that Modbus RTU uses?",
      options: ["TCP already detects and retransmits corrupted data", "Modbus TCP values are encrypted", "Ethernet cables don't have noise", "The MBAP header contains a CRC"],
      answer: 0,
      explain: [
        "Correct. TCP (and Ethernet underneath it) handles error detection and retransmission.",
        "Standard Modbus TCP has no encryption at all.",
        "Noise exists everywhere. The lower layers detect it.",
        "The MBAP header holds a transaction ID, protocol ID, length and unit ID. It has no checksum."
      ]
    },
    {
      q: "Ignition talks Modbus TCP to a serial gateway with six RS-485 drives behind it. What tells the gateway which drive a request is for?",
      options: ["The TCP port number", "The unit ID in the MBAP header", "A different IP address per drive", "The function code"],
      answer: 1,
      explain: [
        "Every request goes to the same port, normally 502.",
        "Correct. The gateway forwards each request to the RS-485 device whose address matches the unit ID.",
        "The drives sit behind one gateway with one IP address.",
        "The function code says what to do, not which device to do it on."
      ]
    },
    {
      q: "What is the biggest security concern with Modbus TCP?",
      options: ["It uses UDP", "It has no authentication, so anything that reaches port 502 can write", "It only works on a single subnet", "Its CRC can be forged"],
      answer: 1,
      explain: [
        "Modbus TCP runs over TCP, not UDP.",
        "Correct. Network segmentation is the main defense.",
        "It's routable like any TCP traffic, which is part of the risk.",
        "Modbus TCP has no CRC. Even RTU's CRC is only error detection, not security."
      ]
    }
  ],

  resources: [
    { title: "Modbus driver (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/modbus", type: "docs", source: "Inductive Automation" },
    { title: "Modbus Address Mapping (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/modbus/modbus-address-mapping", type: "docs", source: "Inductive Automation" },
    { title: "About Modbus Address Mapping", url: "https://inductiveuniversity.com/video/about-modbus-address-mapping/8.3", type: "video", source: "Inductive University" },
    { title: "Connecting to a Modbus device", url: "https://inductiveuniversity.com/videos/connecting-to-modbus-device/8.3", type: "video", source: "Inductive University" },
    { title: "Modbus TCP tag creation: address confusion", url: "https://forum.inductiveautomation.com/t/modbus-tcp-tag-creation-address-confusion/110845", type: "forum", source: "Inductive Automation Forum" },
    { title: "Modbus specifications and implementation guides", url: "https://modbus.org/modbus-specifications", type: "standard", source: "Modbus Organization" }
  ]
});
