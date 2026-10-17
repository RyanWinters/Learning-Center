LC.lesson({
  id: "net-data",
  title: "Bits, bytes, hex and data types",
  track: "net",
  minutes: 20,
  level: 1,
  prereqs: ["found-signals"],
  tags: ["binary", "hex", "bcd", "endianness", "float", "data types", "modbus"],
  summary: "Every value on a plant network is a pile of bits. Learn to read them, and word-order and signed-value bugs stop being mysteries.",
  objectives: [
    "Convert between binary, hexadecimal and decimal for byte and word values",
    "Explain signed versus unsigned integers and two's complement, and predict what a 16-bit value reads as in each",
    "Describe how a 32-bit REAL is laid out and why floats are not exact",
    "Explain endianness and word swap, and fix a scrambled 32-bit value",
    "Show how a Logix DINT maps to two Modbus registers and how strings are stored"
  ],

  body: `
## Why a controls engineer needs this

A {{term:bit|bit}} is a single 0 or 1. Eight bits make a {{term:byte|byte}}. Everything a PLC sends, from a valve command to a 64-character batch name, is bits grouped into bytes and words. You can build a lot of Ignition screens without thinking about this, until a 32-bit value shows up as 1.7E+38, a temperature goes negative at 33,000, or a status word needs one bit pulled out of it. Then the only way forward is reading the raw bits.

## Binary, decimal and hex

Binary is base 2. Each position is worth double the one to its right: 128, 64, 32, 16, 8, 4, 2, 1 for a byte. {{term:hexadecimal|Hexadecimal}} (hex, base 16) is shorthand for binary: one hex digit is exactly four bits (a "nibble"). The digits are 0-9 then A=10, B=11, C=12, D=13, E=14, F=15.

| Decimal | Binary | Hex |
|---|---|---|
| 0 | 0000 0000 | 0x00 |
| 10 | 0000 1010 | 0x0A |
| 127 | 0111 1111 | 0x7F |
| 165 | 1010 0101 | 0xA5 |
| 182 | 1011 0110 | 0xB6 |
| 200 | 1100 1000 | 0xC8 |
| 255 | 1111 1111 | 0xFF |

Hex is popular because it lines up with byte boundaries. A 16-bit word is exactly four hex digits, a 32-bit value is eight. You will see it written as \`0x1F\`, \`16#1F\` (what Logix displays, often with underscores like \`16#0001_86A0\`), or \`1Fh\`. Binary in Logix shows as \`2#0001_1111\`.

### Converting by hand

To go from binary to hex, split into nibbles from the right and convert each. \`1011 0110\` is B and 6, so \`0xB6\`. To get decimal, multiply: \`0xB6 = 11 x 16 + 6 = 182\`.

To go from decimal to hex, divide by 16. For 200: 200 / 16 = 12 remainder 8, so C and 8: \`0xC8\`.

> [!tip] Drill: do these on paper
> 1. \`0xA5\` in binary and decimal (answer: 1010 0101, 165)
> 2. 100 in hex (answer: 0x64)
> 3. \`0000 1111 1111 0000\` in hex (answer: 0x0FF0, which is 4080)
> 4. Which bit numbers are set in \`0x0014\`? (answer: bits 2 and 4, counting from 0 at the right)

Bit numbering matters for status words. Bit 0 is the rightmost (least significant) bit. A drive might document "Status word bit 3 = Fault". With the value \`0x0008\` (binary \`1000\`), bit 3 is set, so the drive is faulted. In Logix you can address that directly as \`DriveStatus.3\`.

## Binary-coded decimal (BCD)

{{term:bcd|BCD}} stores each decimal digit in its own nibble. The number 1234 in BCD is \`0001 0010 0011 0100\`, which is \`0x1234\`. As an ordinary binary integer, \`0x1234\` is 4660. BCD wastes space, but it survived because thumbwheel switches, seven-segment displays, some older drives and many legacy PLC instructions use it. If a value from an old device looks wrong in a way that is "close but off", check whether it is BCD. A tell: every hex nibble is 0-9, never A-F.

## Integers: signed and unsigned

Logix and most devices offer these sizes:

| Logix type | Bits | Unsigned range | Signed range |
|---|---|---|---|
| BOOL | 1 | 0 to 1 | n/a |
| SINT | 8 | 0 to 255 | -128 to 127 |
| INT | 16 | 0 to 65,535 | -32,768 to 32,767 |
| DINT | 32 | 0 to 4,294,967,295 | -2,147,483,648 to 2,147,483,647 |
| LINT | 64 | very large | very large |

Logix integers are **signed** by default (SINT, INT, DINT). Many other systems, and Modbus registers, are just 16 raw bits and the *tag or driver* decides whether they are signed.

### Two's complement

{{term:twos-complement|Two's complement}} is how signed integers are stored. The top bit is the sign: 0 is positive or zero, 1 is negative. To negate a number, invert all bits and add 1. For a 16-bit value:

- \`0x0002\` is +2
- invert: \`0xFFFD\`, add 1: \`0xFFFE\`, which is -2
- \`0x7FFF\` is 32,767, the largest positive
- \`0x8000\` is -32,768, the most negative
- \`0xFFFF\` is -1

The same bits have two meanings. \`0xFFFE\` is 65,534 unsigned and -2 signed. If a temperature that should be -2 degrees shows up as 65534, the driver is treating it as unsigned. In Ignition's Modbus driver this is the data type suffix on the address (a signed 16-bit versus an unsigned one). If a counter runs past 32,767 and suddenly goes negative, a signed 16-bit register is rolling over.

## Floating point (REAL)

A Logix REAL is a 32-bit {{term:ieee-754|IEEE-754}} single-precision float. It is scientific notation in binary: a sign bit, 8 exponent bits and 23 fraction bits.

{{diagram:real}}

The value is \`(-1)^sign x 1.fraction x 2^(exponent - 127)\`. You do not need to compute it by hand. You need the intuition:

- **Floats are approximate.** A REAL has about 7 significant decimal digits. 0.1 cannot be stored exactly in binary, so it is stored as 0.100000001490116...
- **Big numbers lose small steps.** Above 16,777,216 (2^24) a REAL cannot represent every whole number. A totalizer that adds 1.0 per scan to a REAL will stop counting at 16,777,216 because adding 1 no longer changes the value. Use a DINT or LINT for counts, or a LREAL (64-bit) for large totals.
- **Never compare floats with equals.** Test with a range ("greater than 99.5") instead.
- **Known anchors help.** \`0x3F800000\` is 1.0, \`0x40000000\` is 2.0, \`0x00000000\` is 0.0, \`0x43666666\` is about 230.4.

## Endianness and word order

A 16-bit value is two bytes. Which byte is sent first? **Big-endian** sends the most significant byte first, **little-endian** sends the least significant byte first. {{term:endianness|Endianness}} varies by system:

- Modbus transmits each 16-bit register big-endian.
- Logix controllers and Intel PCs are little-endian in memory.
- Network protocols (IP, TCP) are big-endian by convention. CIP/EtherNet/IP is little-endian.

You usually never see byte order because drivers handle it. You see it when you cross a boundary, mostly with **32-bit values built from two 16-bit registers**, where nothing says which register is the high half. The fix is called {{term:word-swap|word swap}} (or "reverse word order").

> [!example] A DINT across two Modbus registers
> A PLC exposes the DINT \`BatchCount = 100,000\` over Modbus. In hex, 100,000 is \`0x000186A0\`. It splits into a high word \`0x0001\` (1) and a low word \`0x86A0\` (34,464). The device puts them in holding registers 40001 and 40002.
>
> - High word first (big-endian word order): 1 x 65,536 + 34,464 = **100,000**. Correct.
> - Low word first: the driver builds \`0x86A00001\`, which as a signed DINT is about **-2.04 billion**.
>
> When a count looks astronomically wrong but still counts upward in odd jumps, flip the word-order setting on the Ignition device or tag. Test with a value you know, such as a firmware revision or a number you typed into the PLC.

A {{term:dint|DINT}} written to a Modbus device from Ignition has the same problem in reverse. If writes land scrambled, the word order setting is wrong for writes too.

{{diagram:regs}}

## Strings

Text is stored as bytes using an encoding, almost always ASCII for PLC work: 'A' is 65 (\`0x41\`), 'a' is 97 (\`0x61\`), '0' is 48 (\`0x30\`), space is 32 (\`0x20\`).

A Logix \`STRING\` is a small structure: a DINT \`LEN\` (how many characters are used) and an 82-element SINT array \`DATA\` holding the characters. So the string "PUMP" has \`LEN = 4\` and \`DATA = 80, 85, 77, 80, 0, 0...\`. You can define shorter or longer string types. Ignition reads a Logix string tag as a normal string, so you rarely deal with the layout.

Over Modbus there is no string type. Text is packed two characters per register. A register holding \`0x5055\` is the characters "PU". Some devices put the first character in the high byte, others in the low byte, so you may get "UPMP" for "PUMP". That is byte swap on top of word swap. If you see pairs of letters flipped, it is the byte order within the register.

## Where this shows up in Ignition

- **OPC tags** on a Modbus device need a matching data type: Int2 (16-bit), Int4 (32-bit), Float4, and so on, signed or unsigned, with word order as a device setting.
- **Bit access:** to use one bit of a status word, create a boolean expression tag that shifts and masks the word, so alarms and screens bind to a named flag instead of a raw number.
- **Logix tags** carry their own types, so a DINT arrives as a proper 32-bit integer and none of this matters until you cross to a Modbus or serial device.
`,

  eli5: `
Think of a row of light switches on a wall. Each switch is either up or down. That is a bit. A group of eight switches is a byte, and with eight switches you can make 256 different patterns.

Hex is just a shorthand way to write the pattern so you do not have to say "up down up up down." You split the row into two groups of four and give each group one symbol.

Now imagine a number too big for one row of switches. You use two rows and write the number across both. The question is which row is the "big end" of the number, like deciding whether "1" and "00" in a price of 100 should be read left to right or right to left. Two machines can disagree on that, and when they do you read 100 as 001. Fixing the order of the rows is what "word swap" does.

Negative numbers use a trick: the first switch means "this is negative." So the same pattern of switches can mean 65,534 to one reader and -2 to another.
`,

  why: `
**Why do devices use fixed-size integers at all?** Hardware that adds 16 or 32 bits at a time is fast and cheap, and a PLC has to finish its scan in milliseconds. The cost is that you must pick a type that fits the range of the data. An INT temperature in tenths of a degree tops out at 3,276.7, which is fine. An INT energy counter in watt-hours rolls over in under two days at a busy plant. Experienced integrators pick DINT for anything that accumulates.

**Why integers scaled by 10 or 100 instead of floats?** Many field devices send a temperature of 23.4 as the integer 234 with a documented scale of 0.1. Integers are exact, take one register, and avoid word-order problems. The price is a scale you must apply in the tag. Forgetting the scale is the most common "values are ten times too high" ticket.

**Why do vendors disagree on word order?** The Modbus spec fixed the byte order inside a register but left multi-register values undefined, and each vendor picked whatever their processor produced naturally. There is no right answer, only a documented one (when you are lucky). Teams argue about whether to fix this in the PLC, the gateway or the tag. The usual best practice is to fix it once, at the edge nearest the device, and keep the tag value correct from there upward.

**Why test with known values?** Before building anything on top of a new 32-bit or float point, read one value you can verify with a calculator. It takes two minutes and avoids a week of subtly wrong data in the historian. See {{lesson:proto-modbus}} for the commissioning routine.
`,

  history: `
Binary arithmetic in machines goes back to the early digital computers. Hex became the programmer's shorthand when 8-bit and 16-bit machines took over, because it maps cleanly onto bytes. The IEEE-754 floating-point standard was first published in 1985 and gave different computers a common float format, replacing a mix of vendor-specific layouts. The 2019 revision is the current one. The endianness terms come from Jonathan Swift's *Gulliver's Travels*, where two kingdoms fight over which end of an egg to crack, and were borrowed by computer scientists in 1980.
`,

  examples: [
    {
      title: "Reading a status word",
      body: `A VFD returns holding register value \`0x0A21\` as its status word. In binary that is \`0000 1010 0010 0001\`. The manual says bit 0 = Ready, bit 5 = At Speed, bit 9 = Fault. Bits 0, 5 and 9 are set, so the drive is ready, at speed and faulted. Ready and Fault together is suspicious, so confirm in the manual whether bits are numbered from 0 or 1. In Ignition, map each bit to a separate boolean expression tag (shift and mask) so alarms and screens use named flags instead of raw numbers.`
    },
    {
      title: "Signed temperature from a Modbus sensor",
      body: `A sensor on a freezer reports -18.4 C as the register value 65352 (\`0xFF48\`). Signed, that is -184, and with a scale of 0.1 it is -18.4. The tag was set to unsigned 16-bit, so the HMI showed 6535.2. Changing the data type to signed 16-bit and applying a 0.1 scale fixed it.`
    }
  ],

  diagrams: {
    real: `<svg viewBox="0 0 640 170" role="img" aria-label="A 32-bit REAL is 1 sign bit, 8 exponent bits and 23 fraction bits">
  <text class="dg-title" x="20" y="26">IEEE-754 single precision (Logix REAL)</text>
  <rect class="dg-box-accent" x="20" y="44" width="50" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="45" y="74">S</text>
  <rect class="dg-box" x="70" y="44" width="170" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="155" y="74">exponent</text>
  <rect class="dg-box-2" x="240" y="44" width="380" height="50" rx="4"/>
  <text class="dg-text-sm dg-mid" x="430" y="74">fraction (mantissa)</text>
  <text class="dg-text-muted dg-mid" x="45" y="116">1 bit</text>
  <text class="dg-text-muted dg-mid" x="155" y="116">8 bits</text>
  <text class="dg-text-muted dg-mid" x="430" y="116">23 bits</text>
  <text class="dg-text-mono" x="20" y="150">230.4 = 0 10000110 1100110 01100110 01100110 = 0x43666666</text>
</svg>`,
    regs: `<svg viewBox="0 0 640 230" role="img" aria-label="DINT 100000 split into two Modbus registers; correct word order gives 100000, swapped order gives a huge negative number">
  <text class="dg-title" x="20" y="26">DINT 100,000 = 0x000186A0 over two registers</text>
  <rect class="dg-box-accent" x="20" y="40" width="130" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="85" y="60">40001</text>
  <text class="dg-text-mono dg-mid" x="85" y="76">0x0001</text>
  <rect class="dg-box" x="150" y="40" width="130" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="215" y="60">40002</text>
  <text class="dg-text-mono dg-mid" x="215" y="76">0x86A0</text>
  <text class="dg-text-muted" x="300" y="68">high word, then low word</text>
  <line class="dg-line" x1="85" y1="84" x2="85" y2="120"/>
  <line class="dg-line" x1="215" y1="84" x2="215" y2="120"/>
  <rect class="dg-box-ok" x="20" y="120" width="260" height="40" rx="4"/>
  <text class="dg-text-sm" x="32" y="145">high first: 0x000186A0 = 100,000</text>
  <rect class="dg-box-alarm" x="20" y="170" width="260" height="40" rx="4"/>
  <text class="dg-text-sm" x="32" y="195">low first: 0x86A00001 = -2.04 billion</text>
  <text class="dg-text-muted" x="300" y="145">word order = correct</text>
  <text class="dg-text-muted" x="300" y="195">fix: swap words on the device</text>
</svg>`
  },

  pitfalls: [
    "Treating a signed value as unsigned (or the reverse), which turns -2 into 65534 or a rolling counter into a negative number.",
    "Forgetting a documented scale factor. A raw 234 that means 23.4 degrees shows up as 234.",
    "Totalizing in a REAL. It stops incrementing at 16,777,216 and gives no error.",
    "Comparing floats with equals instead of a range, then wondering why the test never fires.",
    "Assuming bit numbering starts at 1. Logix and most manuals start at 0, but some drive manuals start at 1.",
    "Fixing word order in three places (device, tag, expression) and ending up swapped twice."
  ],

  keyTerms: ["bit", "byte", "hexadecimal", "bcd", "twos-complement", "ieee-754", "endianness", "word-swap", "dint"],

  quiz: [
    {
      q: "A drive status word reads 0x00A4. Which bits are set (bit 0 is the rightmost)?",
      options: ["Bits 2, 5 and 7", "Bits 1, 4 and 6", "Bits 4 and 10", "Bits 0 and 4"],
      answer: 0,
      explain: [
        "Correct. 0xA4 is 1010 0100. Reading from the right, bits 2, 5 and 7 are 1.",
        "These numbers come from counting bit positions starting at 1 instead of 0, which shifts every answer by one.",
        "Each hex digit covers four bits. A is 1010 and 4 is 0100, which does not give bits 4 and 10.",
        "Bit 0 is the least significant bit and 0xA4 ends in binary 0100, so bit 0 is clear."
      ]
    },
    {
      q: "A level transmitter in a pit goes below zero and the HMI shows 65,531 instead of -5. What is the best fix?",
      options: [
        "Change the polling rate",
        "Change the tag data type from unsigned 16-bit to signed 16-bit",
        "Swap the word order",
        "Change the tag to a REAL"
      ],
      answer: 1,
      explain: [
        "Polling rate changes how often you read, not how the bits are interpreted.",
        "Correct. 0xFFFB is 65,531 unsigned and -5 in two's complement. The driver just needs to read the same bits as signed.",
        "Word order only matters when a value spans two registers. This is a single 16-bit value.",
        "Reinterpreting a 16-bit integer as a REAL would produce garbage, because a REAL needs 32 bits laid out differently."
      ]
    },
    {
      q: "A counter in a REAL tag stops at exactly 16,777,216 and never changes again. Why?",
      options: [
        "The PLC watchdog tripped",
        "The REAL has run out of exponent bits",
        "A REAL has 24 significant bits, so adding 1 to 16,777,216 rounds back to the same value",
        "The Modbus register is full"
      ],
      answer: 2,
      explain: [
        "A watchdog fault would stop the whole scan, not freeze one value.",
        "The exponent can represent values far larger than this. The limit is precision, not range.",
        "Correct. Above 2^24 the gap between neighboring floats is 2 or more, so +1 is lost. Use a DINT for counts.",
        "Nothing in this question involves Modbus, and a register would not pause at that particular number."
      ]
    },
    {
      q: "A Modbus device documents a 32-bit float at 40101-40102. The tag reads about 2.4E-41 while the real value is about 100. What do you try first?",
      options: [
        "Zero-based addressing",
        "A faster scan class",
        "Replace the cable",
        "Word swap (reverse word order) on the 32-bit tag"
      ],
      answer: 3,
      explain: [
        "Wrong addressing gives a value from the neighboring registers, not a scrambled version of the right one.",
        "Speed does not change how the bits are decoded.",
        "A bad cable gives bad quality or timeouts. The device is answering with valid data.",
        "Correct. A tiny or huge value that tracks the process is the signature of swapped 16-bit halves."
      ]
    },
    {
      q: "A thumbwheel BCD input reads 0x0259 in the PLC. What does the operator see on the thumbwheel?",
      options: ["601", "259", "0x259", "89"],
      answer: 1,
      explain: [
        "601 is the decimal value of 0x259 as an ordinary binary integer, which is a wrong reading for BCD.",
        "Correct. In BCD each hex nibble is a decimal digit, so 0x0259 shows 259.",
        "That is just the hex notation, not a decimal reading of what the operator set.",
        "89 is the low byte 0x59 in decimal, which ignores the upper digit."
      ]
    },
    {
      q: "How is the Logix STRING \"HI\" stored?",
      options: [
        "As two REALs",
        "As a single DINT of 0x4849",
        "As a DINT LEN of 2 plus an array of SINT characters",
        "As one Modbus register only"
      ],
      answer: 2,
      explain: [
        "REALs are floating-point numbers, not characters.",
        "Text is not packed into one DINT in a Logix STRING.",
        "Correct. A Logix STRING holds LEN (characters used) and DATA (an 82-byte array by default).",
        "Modbus can pack two characters in a register, but that is a convention, not how Logix stores a STRING."
      ]
    }
  ],

  resources: [
    { title: "IEEE 754", url: "https://en.wikipedia.org/wiki/IEEE_754", type: "article", source: "Wikipedia" },
    { title: "Modbus driver (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/opc-ua/opc-ua-drivers/modbus", type: "docs", source: "Inductive Automation" },
    { title: "Modbus specifications and implementation guides", url: "https://modbus.org/modbus-specifications", type: "standard", source: "Modbus Organization" },
    { title: "About Modbus Address Mapping", url: "https://inductiveuniversity.com/video/about-modbus-address-mapping/8.3", type: "video", source: "Inductive University" }
  ]
});
