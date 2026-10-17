LC.lesson({
  id: "proto-serial",
  title: "Serial: RS-232, RS-422 and RS-485",
  track: "proto",
  minutes: 20,
  level: 1,
  prereqs: ["net-data"],
  tags: ["serial", "rs485", "rs232", "wiring", "gateways"],
  summary: "Three electrical standards, one idea: bytes sent one bit at a time. Know which wires, which settings and which resistor you forgot.",
  objectives: [
    "Compare RS-232, RS-422 and RS-485 by topology, signaling and distance",
    "Explain why differential signaling survives electrical noise",
    "Say where termination and biasing resistors go and what each one fixes",
    "Read a settings string such as 9600 8N1 and match it on both ends",
    "Diagnose the common serial wiring mistakes",
    "Explain what a serial-to-Ethernet gateway does and what it cannot fix"
  ],

  body: `
## What serial is and why you still care

A **serial** link sends data one bit at a time over a pair of wires (or a few of them). Ethernet has taken over most new designs, but serial is still how you reach power meters, VFDs, scales, barcode readers, chemical analyzers, old PLC ports and a long list of packaged machines. The protocol riding on it is very often {{term:modbus-rtu|Modbus RTU}}. If you integrate for a living, you will be handed a roll of twisted pair and a manual in broken English at some point.

Serial is really two separate layers. The **electrical standard** (RS-232, RS-422, RS-485) says what voltages mean 1 and 0 and how many devices can share the wires. The **settings** (baud rate, data bits, parity, stop bits) say how bytes are framed. Both ends must agree on both layers, and the protocol on top (Modbus, ASCII, a vendor protocol) is a third matter.

## The three standards

| | RS-232 | RS-422 | RS-485 |
|---|---|---|---|
| Signaling | Single-ended, referenced to ground | Differential | Differential |
| Topology | Point-to-point | One driver, up to 10 receivers | Multidrop: many drivers and receivers |
| Typical wires | TX, RX, GND (plus handshake lines) | 2 pairs (4-wire) | 1 pair (2-wire, half duplex) or 2 pairs |
| Duplex | Full | Full | Half on 2 wires, full on 4 |
| Typical max length | Around 15 m at 9600 baud | Around 1200 m | Around 1200 m |
| Termination | None | At the receiving end | At both ends of the bus |
| Seen on | PC COM ports, console ports, scales, older instruments | Some drives, long point-to-point runs | Modbus RTU networks, building automation, PROFIBUS DP |

Distance depends on baud rate. The 1200 m figure is for slow speeds; at several megabaud you get tens of meters.

### RS-232: the point-to-point cable

{{term:rs-232|RS-232}} is what a PC COM port speaks. A 9-pin connector commonly uses pin 2 (RX), pin 3 (TX) and pin 5 (ground). Voltages swing both ways around ground (roughly +/- 3 to 15 V), and the receiver compares each wire to ground. That makes it sensitive to ground differences and noise, which is why it stays short and connects exactly two devices.

The classic mistake is **TX to TX**. A device that sends on pin 3 must connect to a device that receives on pin 3, which means the cable must cross over. A PC (a DTE) and a modem (a DCE) use a straight-through cable. Two DTEs, such as a PC and a PLC port, need a **null-modem** cable that swaps TX and RX. When unsure, swap two wires and try again. You will not damage anything.

### RS-422 and RS-485: differential pairs

{{term:rs-422|RS-422}} and {{term:rs485|RS-485}} send each bit as a voltage *difference* between two wires, usually labeled A and B (sometimes - and +, which is where the trouble starts, see below). {{term:differential-signaling|Differential signaling}} is the key idea. Noise from a motor drive or a relay couples onto both wires almost equally. The receiver looks only at the difference, so the noise cancels out. A twisted pair keeps the two wires close so they pick up the same noise.

{{diagram:bus}}

RS-422 has one driver talking to up to ten receivers on dedicated pairs. RS-485 added **tri-state drivers**: a driver can switch itself off and let go of the wires, so up to 32 unit loads (more with modern low-load transceivers) share one pair, taking turns. This is the {{term:multidrop|multidrop}} bus, and it is why RS-485 is the industrial default.

On 2-wire RS-485 the pair is **half duplex**: only one device talks at a time, and a master/slave protocol like Modbus enforces turns. A converter has to flip between transmit and receive. Most do this automatically, but cheap or badly configured ones add delay or clip the first byte of a reply.

## Termination and biasing

Fast edges travelling down a cable reflect from the far end if the end is not matched to the cable. The reflections corrupt bits. The fix is a {{term:termination-resistor|termination resistor}} across the pair at the **two physical ends** of an RS-485 bus. Twisted-pair data cable is typically about 120 ohms, so a 120 ohm resistor is the usual value. Two rules:

- Terminate the two ends of the bus only, never the middle devices.
- On a short bus at low speed (a few meters at 9600 baud) reflections do not matter and the bus often works with no terminators. That is how people learn the wrong lesson. The same layout fails at 115200 baud or 300 m.

The second problem is the idle state. When every driver is switched off, the pair floats and the receivers see noise, which they may decode as random bytes. **Bias resistors** (also called fail-safe resistors) pull A and B apart slightly when nobody is driving, so the idle bus reads as a clean "1". Bias goes at **one place only**, usually in the master or converter, because multiple bias networks in parallel load the bus. The standard does not fix their values. Many converters have a switch or jumper for terminate and bias, and many modern transceivers have fail-safe built in.

> [!tip] A quick bus health check
> With the whole bus powered but silent, measure the voltage between A and B. A biased bus idles at a few hundred millivolts or more, with A positive relative to B on most devices. About 0 V means no bias. Powered off, measure resistance across the pair. Two 120 ohm terminators in parallel read near 60 ohms. 120 ohms means one is missing, and an open reading means both are.

## Serial settings: reading 9600 8N1

Both ends must use the same framing, or you will see garbage or nothing.

- **Baud rate**: signal changes per second, which equals bits per second here. Common values are 9600, 19200, 38400 and 115200.
- **Data bits**: usually 8 (7 appears in old ASCII devices).
- **Parity**: None, Even or Odd. An extra bit that makes the count of 1s even or odd so the receiver can spot a single-bit error.
- **Stop bits**: 1 or 2, a quiet gap that ends each character.

The string **9600 8N1** means 9600 baud, 8 data bits, no parity, 1 stop bit. Each character then costs 10 bit times on the wire (1 start + 8 data + 1 stop), so 9600 baud moves about 960 bytes per second at best.

> [!example] What 9600 baud really costs
> A Modbus RTU request to read 10 holding registers is 8 bytes. The reply is 25 bytes. That is 33 bytes, or 330 bits, which takes about 34 ms at 9600 baud before the device's own thinking time and the required silent gaps. Poll twenty such devices one after another and a full scan takes close to a second. Raising the baud rate to 19200 halves that. This is the main reason slow serial networks "feel" slow.

Modbus RTU specifies even parity by default and allows none (with 2 stop bits). Manufacturers vary, so match what the device manual says rather than assuming. Parity mismatch is a classic cause of a device that answers some requests and not others.

## Common wiring mistakes

| Symptom | Likely cause |
|---|---|
| Nothing answers, TX light flashes, RX light dead | A and B swapped, or the wrong converter polarity convention |
| Works on the bench, fails in the plant | Missing termination, or a ground difference between buildings |
| Random timeouts, CRC errors | Star or branching wiring instead of a daisy chain; long stubs; noise from a VFD cable |
| Works with 3 devices, fails with 12 | Too many terminators, or none; bad bias; a device with a damaged transceiver pulling the bus down |
| Garbled data | Baud, parity or stop bit mismatch |
| First byte of each reply missing | Converter slow to flip from transmit to receive |
| RS-232 cable gets warm or does nothing | TX to TX, or a null modem where a straight cable was needed |

**A and B naming is not standard.** Some vendors call the non-inverting line A, others call it B, and plenty of equipment labels it D+ and D-. If a link is dead and everything else matches, swap the two wires. It costs nothing.

Rules for good RS-485 cable: use shielded twisted pair, run it as a **daisy chain** (device to device along the bus, stubs as short as possible), ground the shield at one end only, and keep it away from VFD output cables and power conductors. Add a common reference conductor when devices are powered from different supplies.

## Serial-to-Ethernet gateways

You rarely want a serial cable running to the Gateway server. A **serial-to-Ethernet gateway** (also called a device server or terminal server) sits near the devices, speaks serial on one side and Ethernet on the other. There are two common modes:

- **Transparent tunnel / raw TCP**: the gateway forwards serial bytes inside TCP. The software on the PC still talks Modbus RTU framing, just over a TCP socket, or through a virtual COM port driver.
- **Protocol gateway**: the box understands Modbus. It accepts {{term:modbus-tcp|Modbus TCP}} from Ignition and converts each request to RTU on the serial side. The TCP unit ID becomes the RTU device address, so many RS-485 devices appear behind one IP address.

A gateway does not make the serial side faster. The RS-485 bus is still one request at a time at the same baud rate, and a slow bus behind a fast Ethernet link is still slow. What it does give you is a drop-in Ethernet connection, easier remote diagnostics and placement near the devices so the serial run is short. Treat the gateway as an IT asset: give it a static address, put it on the right VLAN and change its default password.
`,

  eli5: `
Imagine you and a friend are on opposite sides of a noisy playground, passing notes by sliding them under a fence one letter at a time. That's serial. You have to agree on how fast to slide (baud), how many letters make a word, and how to show a word is finished.

RS-232 is one friend on each side with a short string between you. It works fine when you're close.

RS-485 is a long fence with many kids standing along it. Only one kid talks at a time, and everyone else listens. The noise in the playground is like wind, and the trick is to compare two strings that wiggle together in the wind. If both move up the same amount, you ignore it, and you only care when one moves *more* than the other. That's differential signaling.

At each end of the fence you put a cushion (the termination resistor) so your message doesn't bounce back and confuse everyone. And when nobody is talking, a gentle spring (bias) keeps the strings slightly apart so listeners know it's quiet, not broken.
`,

  why: `
**Why differential?** A single-ended signal is a voltage relative to ground, and ground is not the same everywhere in a plant. A welder or a big VFD can lift the ground at one end by several volts. A differential receiver ignores that shift because it only compares two wires that both moved. This is why RS-485 runs 1200 m through noisy plants and RS-232 does not.

**Why daisy chain, not star?** A signal that hits a junction splits, and each branch reflects part of it back. With a single twisted pair and two terminators, the signal sees one clean cable. With a star, you cannot terminate every leg, and reflections show up as intermittent errors that depend on which device is talking. Integrators still argue about how long a stub can be. The honest answer is "short, and shorter at higher baud." A star wired by an electrician for tidiness is a common cause of serial problems that "only happen sometimes."

**Why terminate only the ends, and bias in one place?** Termination matches the cable's impedance where the signal ends. A resistor in the middle just loads the line. Bias resistors set the idle voltage, and if three devices each add their own, the sum can overload the drivers or shift the idle level. One consistent point is the design rule.

**Why does the slow bus matter for Ignition?** Ignition polls Modbus devices, and a poll cycle on serial is the sum of every request. Faster baud, fewer devices per bus, grouped registers and a gateway per cluster of devices all cut cycle time. Choosing the right topology is a performance decision, not just a cabling one. See {{lesson:proto-modbus}}.

**Why keep serial at all?** Because the installed base is enormous, the hardware is cheap and the failure modes are well understood. The sensible stance is to accept serial for field devices, bring it to Ethernet at the nearest cabinet and keep the serial run short.
`,

  history: `
RS-232 was published by the Electronic Industries Association in 1960 to connect terminals to modems, which is why the connector names (DTE and DCE) come from telephone gear. RS-422 and RS-485 followed in the 1970s and 1980s to get past RS-232's distance and device-count limits. The "RS" prefix stood for Recommended Standard. Today the standards are maintained as TIA/EIA documents, though most people still say "RS."
`,

  examples: [
    {
      title: "Bringing up a new RS-485 meter",
      body: `The meter manual says 19200 baud, 8 data bits, even parity, 1 stop bit, Modbus address 5. Set the converter or gateway to 19200 8E1 and set the Ignition device to match. If you get no reply, swap A and B at the meter. If you get replies for some registers only, recheck parity first. Before leaving, measure idle A-B voltage and confirm both bus ends are terminated.`
    },
    {
      title: "One gateway, six drives",
      body: `Six VFDs on a single RS-485 pair are addressed 1 to 6. An Ethernet gateway at 10.20.30.40 accepts Modbus TCP on port 502. In Ignition, you add one device at 10.20.30.40 and read each drive by changing the unit ID. Reading drive 3's speed uses the same address as drive 4's but a different unit ID. All six share one serial bus, so polling is still one request at a time.`
    }
  ],

  diagrams: {
    bus: `<svg viewBox="0 0 640 230" role="img" aria-label="An RS-485 multidrop bus: a master at the left, two slaves in the middle, a 120 ohm terminator at each end of the twisted pair, and a bias network at the master">
  <text class="dg-title" x="20" y="24">RS-485 multidrop bus (2-wire, half duplex)</text>
  <line class="dg-line" x1="60" y1="90" x2="600" y2="90"/>
  <line class="dg-line" x1="60" y1="110" x2="600" y2="110"/>
  <text class="dg-text-sm" x="608" y="94">A</text>
  <text class="dg-text-sm" x="608" y="114">B</text>
  <rect class="dg-box-accent" x="60" y="140" width="110" height="46" rx="6"/>
  <text class="dg-text-sm dg-mid" x="115" y="160">Master</text>
  <text class="dg-text-muted dg-mid" x="115" y="177">+ bias</text>
  <line class="dg-line-thin" x1="100" y1="90" x2="100" y2="140"/>
  <line class="dg-line-thin" x1="130" y1="110" x2="130" y2="140"/>
  <rect class="dg-box" x="260" y="140" width="110" height="46" rx="6"/>
  <text class="dg-text-sm dg-mid" x="315" y="168">Device 1</text>
  <line class="dg-line-thin" x1="295" y1="90" x2="295" y2="140"/>
  <line class="dg-line-thin" x1="335" y1="110" x2="335" y2="140"/>
  <rect class="dg-box" x="430" y="140" width="110" height="46" rx="6"/>
  <text class="dg-text-sm dg-mid" x="485" y="168">Device 2</text>
  <line class="dg-line-thin" x1="465" y1="90" x2="465" y2="140"/>
  <line class="dg-line-thin" x1="505" y1="110" x2="505" y2="140"/>
  <rect class="dg-box-warn" x="34" y="90" width="12" height="20"/>
  <text class="dg-text-sm" x="20" y="72">120 ohm</text>
  <rect class="dg-box-warn" x="572" y="90" width="12" height="20"/>
  <text class="dg-text-sm" x="548" y="72">120 ohm</text>
  <text class="dg-text-muted" x="20" y="214">Terminate the two ends only. Short stubs. Bias in one place.</text>
</svg>`
  },

  pitfalls: [
    "Wiring RS-485 as a star or with long stubs, then chasing intermittent CRC errors.",
    "Terminating every device, or none, or terminating the middle of the bus.",
    "Adding bias resistors in several devices instead of one place.",
    "Assuming A and B mean the same on every vendor's terminals. Swap them if the link is dead.",
    "Mismatching parity or stop bits while the baud rate matches, giving a partly working link.",
    "Expecting a serial-to-Ethernet gateway to speed up the serial side."
  ],

  keyTerms: ["rs-232", "rs-422", "rs485", "differential-signaling", "multidrop", "termination-resistor", "bias-resistors", "baud-rate", "serial-parity", "serial-gateway"],

  quiz: [
    {
      q: "Which standard lets many devices share one twisted pair with each able to transmit in turn?",
      options: ["RS-232", "RS-422", "RS-485", "All three"],
      answer: 2,
      explain: [
        "RS-232 is point-to-point between exactly two devices.",
        "RS-422 allows one driver and several receivers. Only one device can ever transmit.",
        "Correct. RS-485 adds tri-state drivers so multiple devices can transmit in turn on the same pair.",
        "Only RS-485 supports multiple drivers on the same wires."
      ]
    },
    {
      q: "A 300 m RS-485 run at 115200 baud works with 2 devices on the bench but throws CRC errors in the plant. What do you check first?",
      options: ["Whether the baud rate is a multiple of 9600", "That both ends of the bus have a 120 ohm terminator", "That the cable is shielded RS-232 cable", "The parity of the master"],
      answer: 1,
      explain: [
        "115200 is valid. The same settings worked on the bench.",
        "Correct. Short and slow buses hide missing termination. At speed and distance, reflections corrupt bits.",
        "RS-232 cable is not the right type of cable for a differential bus.",
        "A parity mismatch would have failed on the bench as well."
      ]
    },
    {
      q: "What does a bias (fail-safe) network do?",
      options: ["Matches the cable impedance", "Defines the bus idle state when no driver is active", "Raises the signal voltage for longer distances", "Isolates the shield from ground"],
      answer: 1,
      explain: [
        "That is the job of the termination resistor.",
        "Correct. Without it, the floating pair can be decoded as noise or random bytes.",
        "It does not increase the drive level.",
        "It acts on the signal pair, not the shield."
      ]
    },
    {
      q: "What does the setting 9600 8N1 mean?",
      options: ["9600 baud, 8 stop bits, no parity", "9600 baud, 8 data bits, no parity, 1 stop bit", "9600 bytes per second, 8 devices, 1 master", "9600 baud, 8 data bits, none flow control, 1 start bit"],
      answer: 1,
      explain: [
        "Eight is the number of data bits, not stop bits.",
        "Correct. A character occupies 10 bit times: start, 8 data and 1 stop.",
        "Baud is bits per second and the other digits are framing, not device counts.",
        "N means no parity. Flow control is a separate setting."
      ]
    },
    {
      q: "Six drives sit on one RS-485 bus behind a Modbus TCP gateway. Does the gateway make polling all six faster than a direct serial connection at the same baud rate?",
      options: ["Yes, Ethernet is faster so all six are read at once", "No, the serial bus still carries one request at a time at the same baud rate", "Yes, but only if each drive has its own IP address", "No, because a gateway always adds a second master"],
      answer: 1,
      explain: [
        "Ethernet carries the request quickly, but the serial side remains one request at a time.",
        "Correct. A gateway changes the connection type, not the speed of the serial bus.",
        "Drives behind a gateway share the gateway's IP address and are chosen by unit ID.",
        "A protocol gateway acts as the single serial master. It does not add a second one."
      ]
    },
    {
      q: "An RS-232 link between a PC and a PLC port shows no data in either direction. The cable is straight-through. What is the most likely fix?",
      options: ["Add termination resistors", "Use a null-modem cable that swaps TX and RX", "Change the stop bits to 2", "Add bias resistors"],
      answer: 1,
      explain: [
        "RS-232 does not use termination resistors.",
        "Correct. Two devices that both transmit on the same pin need the TX and RX lines crossed.",
        "Framing errors may garble data but would not cause complete silence in both directions.",
        "Bias is an RS-485 concern."
      ]
    }
  ],

  resources: [
    { title: "Guide to Selecting and Using RS-232, RS-422, and RS-485 Serial Data Standards", url: "https://www.analog.com/en/resources/technical-articles/guide-to-selecting-and-using-rs232-rs422-and-rs485-serial-data-standards.html", type: "article", source: "Analog Devices" },
    { title: "422 and 485 Overview and System Configurations", url: "https://www.ti.com/lit/an/slla070d/slla070d.pdf", type: "article", source: "Texas Instruments" },
    { title: "RS-485 Basics Series (white paper)", url: "https://www.ti.com/lit/wp/slla545/slla545.pdf", type: "article", source: "Texas Instruments" },
    { title: "RS-485", url: "https://en.wikipedia.org/wiki/RS-485", type: "article", source: "Wikipedia" },
    { title: "RS-422", url: "https://en.wikipedia.org/wiki/RS-422", type: "article", source: "Wikipedia" },
    { title: "Modbus driver (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/modbus", type: "docs", source: "Inductive Automation" }
  ]
});
