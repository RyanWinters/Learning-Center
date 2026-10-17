LC.lesson({
  id: "plc-compare-math",
  title: "Compare, math and move instructions",
  track: "plc",
  minutes: 25,
  level: 2,
  prereqs: ["plc-ladder-basics"],
  tags: ["compare", "math", "MOV", "COP", "CPT", "LIM", "REAL", "DINT", "rounding"],
  summary: "Judge, calculate and copy numbers in ladder, and avoid the REAL, rounding and overflow traps that catch every beginner.",
  objectives: [
    "Use EQU, NEQ, GRT, GEQ, LES, LEQ, LIM and CMP and say what each passes",
    "Use ADD, SUB, MUL, DIV and CPT, and explain why math in a true rung runs every scan",
    "Choose MOV, COP or CLR for a task and state what each does to types",
    "Explain REAL to DINT rounding and why EQU on REALs fails",
    "Recognize DINT overflow, divide-by-zero and array-index faults and guard against them"
  ],

  body: `Most useful ladder is more than relays. You compare a tank level to a setpoint, add up parts, copy a recipe into the active setpoints and clear a counter at shift change. These instructions move and judge numbers instead of bits. Logix has a family of them, and a few traps around data types that bite every new programmer at least once.

## Compare instructions

A compare instruction is an input instruction. It sits in the rung like an XIC and passes power when its test is true.

| Instruction | Passes when | Reads as |
|---|---|---|
| \`EQU(A,B)\` | A = B | Equal |
| \`NEQ(A,B)\` | A is not equal to B | Not equal |
| \`GRT(A,B)\` | A > B | Greater than |
| \`GEQ(A,B)\` | A >= B | Greater or equal |
| \`LES(A,B)\` | A < B | Less than |
| \`LEQ(A,B)\` | A <= B | Less or equal |
| \`LIM(Low,Test,High)\` | Test is inside the window | Limit test |
| \`CMP(expression)\` | The expression is true | Compare expression |

Sources can be tags or constants, and they can be different numeric types. Studio 5000 converts them for the test. In newer versions the editor may show shorter names such as EQ, GT or LE for some of these, and MOVE for MOV. The behavior is the same, so look at the help for your version if a name differs from what you see here.

\`\`\`ladder
GRT(Tank.Level,80.0) OTE(Tank_High)
LES(Tank.Level,20.0) OTE(Tank_Low)
EQU(Recipe_Sel,3) OTE(Recipe3_Active)
\`\`\`

Compare instructions are evaluated every scan. They have no memory and no edge behavior, so a chattering process value will chatter the output. For alarms, add a deadband and a delay (the topic of {{lesson:plc-analog}}).

{{sim:sim-compare}}

### LIM: the window test

\`LIM(Low,Test,High)\` is true when the test value is between the limits, **inclusive**. It is one instruction instead of a GEQ and a LEQ in series.

{{diagram:lim}}

If Low is greater than High, LIM turns around: it is true when the test value is *outside* the window, that is, greater than or equal to Low or less than or equal to High. This is useful for "alarm when out of range" but is a surprise if you swapped the numbers by accident.

\`\`\`ladder
LIM(20.0,Tank.Level,80.0) OTE(Level_In_Range)
\`\`\`

{{sim:sim-lim}}

### CMP: an expression in one box

\`CMP\` evaluates a text expression, with AND, OR, NOT and arithmetic, as a single condition:

\`\`\`ladder
CMP(Tank.Level > 20.0 AND Tank.Level < 80.0 AND Pump_Temp < 90.0) OTE(Pump_Ok)
\`\`\`

It is compact, but it hides the individual tests and is harder to debug online. Many teams use CMP for short math and separate compares when each condition deserves its own visible contact.

## Math instructions

Math instructions are output instructions. They do their work **when the rung is true**, and, importantly, **on every scan the rung is true**.

| Instruction | Does |
|---|---|
| \`ADD(A,B,Dest)\` | Dest = A + B |
| \`SUB(A,B,Dest)\` | Dest = A - B |
| \`MUL(A,B,Dest)\` | Dest = A x B |
| \`DIV(A,B,Dest)\` | Dest = A / B |
| \`CPT(Dest,"expression")\` | Dest = result of an expression |

\`\`\`ladder
XIC(Box_Arrived) ADD(Boxes_Today,1,Boxes_Today)
CPT(Gal_Per_Sec,"Flow_GPM / 60.0")
\`\`\`

The first rung depends on \`Box_Arrived\` being a one-scan pulse, otherwise Boxes_Today climbs by 1 every 10 ms. This is the usual reason ADD is paired with a one-shot (see {{lesson:plc-oneshots}}). The second rung is meant to run every scan, so it needs no pulse.

CPT takes the whole formula as text: \`CPT(Scaled,"(Raw - 4000) * 100.0 / 12000.0")\`. It follows normal operator precedence, supports parentheses and functions like \`ABS\`, \`SQR\` and \`MOD\`, and is easier to read than a chain of ADD, SUB and MUL when you have four or more steps. It is a little slower, which only matters on very large loops.

{{sim:sim-math}}

## Move and copy

| Instruction | Does |
|---|---|
| \`MOV(Source,Dest)\` | Copies one value, converting types |
| \`COP(Source,Dest,Length)\` | Copies raw memory, no conversion, for arrays and structures |
| \`CLR(Dest)\` | Sets Dest to 0 |

MOV is the workhorse. Its source and destination may differ in type, in which case Logix converts the value. COP copies a block of bytes exactly as they are, which is what you want to copy an array or a UDT, and is the wrong choice between different types, because it copies bit patterns. The length counts elements of the destination type. CLR zeroes a value, and is often used to reset a total or a working register.

\`\`\`ladder
EQU(Recipe_Sel,1) COP(Recipes[1],Active_Recipe,1)
EQU(Recipe_Sel,2) COP(Recipes[2],Active_Recipe,1)
XIC(Shift_Change) CLR(Shift_Total)
\`\`\`

A recipe array is better written as a single indexed COP, with the index checked first, because an index outside the array is a **major fault** that stops the controller:

\`\`\`ladder
LIM(1,Recipe_Sel,10) COP(Recipes[Recipe_Sel],Active_Recipe,1)
\`\`\`

{{sim:sim-mov}}

## REAL versus DINT

Two types dominate Logix math.

- **DINT**: a 32-bit signed integer. Exact. No fractions.
- **REAL**: a 32-bit IEEE floating-point number. Has fractions. About seven significant digits, and most decimal fractions cannot be stored exactly.

### Rounding on conversion

When a REAL is moved or calculated into a DINT destination, Logix **rounds** to the nearest whole number. It does not chop off the fraction. So \`MOV(3.7,Count)\` puts 4 into a DINT, and 3.2 gives 3. Moving a DINT into a REAL is exact up to 16,777,216 and starts losing precision after that. If you add 3.2 and 3.2 into a DINT destination, the sum is 6.4 and the destination holds 6. If fractions matter, keep everything in REAL until the very end.

> [!warning] Integer division loses the fraction
> When both inputs and the destination are integers, there is nowhere to keep the remainder. Test \`7 / 2\` in the emulator before you build a formula on it, and when the fraction matters, convert one operand to REAL or use CPT with a REAL operand like \`7.0 / 2.0\`.

### Why EQU on REALs is a trap

A REAL carries tiny rounding errors. Add 0.1 ten times and you get 1.0000001, not 1.0. \`EQU(Total,1.0)\` is then false forever. Analog values scaled from a 4-20 mA signal almost never land on an exact number. Even a setpoint typed as 50.0 can come back from a scaling calculation as 49.99999.

Avoid EQU and NEQ on REALs. Use one of these:

- A tolerance: \`CMP(ABS(Level - 50.0) < 0.5)\`
- A window: \`LIM(49.5,Level,50.5)\`
- A one-sided test: \`GEQ(Level,50.0)\`, which is robust because it asks "has it reached", not "is it exactly".

{{diagram:realtrap}}

## Overflow and minor faults

A DINT holds up to 2,147,483,647. Add 1 to that and the result wraps around to −2,147,483,648, the overflow status flag \`S:V\` is set, and the controller may log a **minor fault**. A minor fault does not stop the program, but it shows up in the controller's fault display and in the fault log, and it is a signal that a calculation did something unintended. Dividing by zero is another source: for integers it is a fault condition, and for REALs it produces infinity or not-a-number, which then poisons every calculation that uses it.

Defend against both in the rung:

\`\`\`ladder
NEQ(Pulses_Per_Rev,0) DIV(Total_Pulses,Pulses_Per_Rev,Revs)
\`\`\`

Check divisors before dividing, keep intermediate results in a type large enough to hold them, and watch the minor-fault count when commissioning. If a REAL is being used as an accumulator that grows large, remember that adding a small increment to a huge number can have no effect at all.

## Worked example: tank with a high/low window and a totalizer

A tank level in percent (REAL) drives alarms and a flow (REAL, gallons per minute) feeds a daily total. Scan-time ticking comes from a 1-second pulse bit, \`Tick_1s\`.

\`\`\`ladder
GRT(Tank.Level,85.0) OTE(Tank_High)
LES(Tank.Level,15.0) OTE(Tank_Low)
LIM(15.0,Tank.Level,85.0) OTE(Level_Normal)
XIC(Tick_1s) CPT(Gal_Today,"Gal_Today + Flow_GPM / 60.0")
XIC(Midnight_Pulse) MOV(Gal_Today,Gal_Yesterday)
XIC(Midnight_Pulse) CLR(Gal_Today)
\`\`\`

Rung 4 adds one second of flow each second. Rungs 5 and 6 save and zero the daily total. They run in that order, so the save happens before the clear. The totalizer is REAL because the flow has fractions, and it is safe here because a day's total stays far below 16 million gallons. If you were totalizing for a year, you would roll whole gallons into a DINT and carry the fraction.`,

  eli5: `Think of a kitchen scale and a recipe card. A compare instruction is you looking at the scale and asking "is it more than 200 grams?" and answering yes or no. A window check asks "is it between 180 and 220?".

Math is doing the arithmetic on the card: add the flour and the sugar, divide the batch by four. A move is copying a number from one card onto another, and a clear is rubbing a number out.

Now the traps. The scale shows decimals, but your measuring cup only shows whole cups. Pour 3.7 cups into a cup that only counts whole numbers and it rounds to 4. And two numbers that look the same on the scale, like 1.0000001 and 1.0, may not be exactly the same, so asking "is it exactly 1?" fails. Better to ask "is it close enough to 1?".

Finally, a ruler only goes so high. Keep adding to a counter that tops out and it flips back to the lowest number it can show, like an odometer rolling over.`,

  why: `**Why does math run every scan?** The PLC has no concept of "do this once" in an output instruction. Every instruction in a true rung runs on each scan. That makes continuous calculations (scaling, averaging, totalizing) trivial and one-time actions (add one, copy a recipe) need a one-shot. Knowing which kind you are writing is the key habit.

**Why are REALs not trusted for equality?** Because the hardware stores binary fractions, and most decimal values have no exact binary form. Rounding error is built in. The practice is to compare with a window or a one-sided limit, which is robust to error, instead of fighting it.

**Why DINT for counts and REAL for measurements?** Counts are exact whole numbers and want exact arithmetic over a large range. Measurements are continuous and imprecise anyway. Mixing them silently converts and rounds, so be deliberate about where the conversion happens.

**Why guard divisors and array indexes?** A divide-by-zero or a bad index is data-dependent. It happens on the one day a sensor drops out or an HMI sends garbage. An out-of-range array index is a major fault that stops the controller, so the guard is cheap insurance.

**What do integrators argue about?** CPT versus chains of ADD and MUL. CPT is compact and readable. Chains show intermediate values you can watch online and break on. A reasonable compromise is CPT for formulas and a separate tag for each result you may need to inspect.`,

  history: `Early PLCs were relay replacers and had no arithmetic. Compare and math blocks arrived in the 1970s as controllers took on process work like batching and temperature control, and they were kept simple on purpose: one operation per block, with the result written to a named location. Floating point became common as processors improved, which is how REAL arrived next to integer types.`,

  examples: [
    { title: "Scaling a 4-20 mA input", body: `A transmitter gives raw counts 4000 to 20000 for 0 to 100 percent. \`CPT(Level_Pct,"(Raw - 4000.0) * 100.0 / 16000.0")\` gives 0.0 to 100.0. Raw 12000 gives exactly 50.0, and raw 12001 gives 50.00625. Storing the result in a DINT would round it to 50 and lose that resolution, so keep it REAL. (Logix also has SCP for scaling, covered in the analog lesson.)` },
    { title: "Safe average of 10 readings", body: `Add 10 REAL readings into a sum with CPT, divide by 10.0 in the last step and store the result in a REAL. Dividing a DINT sum by 10 into a DINT would round the average to a whole number. If the sample count were a variable, wrap the divide in \`NEQ(Sample_Count,0)\` first.` }
  ],

  diagrams: {
    lim: `<svg viewBox="0 0 640 230" role="img" aria-label="LIM number line: the instruction is true when the test value lies between the low and high limits, inclusive; with the limits swapped it is true outside the window">
  <text class="dg-title" x="20" y="24">LIM(Low, Test, High) on a number line</text>
  <text class="dg-text-sm" x="20" y="58">Low = 20, High = 80</text>
  <line class="dg-line-thin" x1="40" y1="90" x2="600" y2="90"/>
  <rect class="dg-box-ok" x="180" y="72" width="280" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="95">LIM true (20 to 80, inclusive)</text>
  <text class="dg-text-sm dg-mid" x="110" y="95">false</text>
  <text class="dg-text-sm dg-mid" x="530" y="95">false</text>
  <text class="dg-text-mono dg-mid" x="180" y="128">20</text>
  <text class="dg-text-mono dg-mid" x="460" y="128">80</text>
  <text class="dg-text-sm" x="20" y="168">Low = 80, High = 20 (swapped)</text>
  <line class="dg-line-thin" x1="40" y1="196" x2="600" y2="196"/>
  <rect class="dg-box-ok" x="40" y="178" width="140" height="36" rx="4"/>
  <rect class="dg-box-ok" x="460" y="178" width="140" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="110" y="201">true</text>
  <text class="dg-text-sm dg-mid" x="530" y="201">true</text>
  <text class="dg-text-sm dg-mid" x="320" y="201">false (20 to 80 excluded)</text>
</svg>`,
    realtrap: `<svg viewBox="0 0 640 220" role="img" aria-label="Why EQU on a REAL fails: a value that is mathematically 1.0 may be stored as 1.0000001, so compare with a tolerance band instead">
  <text class="dg-title" x="20" y="24">Compare a REAL with a tolerance, not EQU</text>
  <line class="dg-line-thin" x1="40" y1="100" x2="600" y2="100"/>
  <rect class="dg-box-ok" x="260" y="70" width="120" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="62">target +/- 0.001</text>
  <line class="dg-line" x1="320" y1="64" x2="320" y2="136"/>
  <text class="dg-text-mono dg-mid" x="320" y="154">1.000</text>
  <circle class="dg-fill-accent" cx="333" cy="100" r="6"/>
  <text class="dg-text-mono dg-mid" x="333" y="180">1.0000001</text>
  <text class="dg-text-sm" x="40" y="204">EQU(x,1.0) is false here. ABS(x - 1.0) &lt; 0.001 is true.</text>
  <text class="dg-text-sm dg-mid" x="120" y="124">too low</text>
  <text class="dg-text-sm dg-mid" x="520" y="124">too high</text>
</svg>`
  },

  pitfalls: [
    "Using EQU or NEQ to test a REAL for an exact value.",
    "Putting an ADD in a rung driven by a held input without a one-shot, so it adds every scan.",
    "Moving a REAL into a DINT and forgetting that it rounds.",
    "Swapping the limits of a LIM and getting an inverted window.",
    "Dividing without checking the divisor.",
    "Indexing an array with an unchecked variable, which can stop the controller with a major fault.",
    "Using COP between different data types, which copies bit patterns instead of converting values.",
    "Accumulating a long total in a REAL until additions stop having any effect."
  ],

  keyTerms: ["compare-instructions", "lim-instruction", "cpt-instruction", "mov-instruction", "real-type", "minor-fault"],

  quiz: [
    {
      q: "`ADD(Total,1,Total)` is in a rung driven directly by a held sensor. The sensor is on for 0.5 s with a 10 ms scan. What does Total gain?",
      options: ["1", "About 50", "0", "0.5"],
      answer: 1,
      explain: [
        "That would need a one-shot.",
        "Correct. The ADD runs every scan the rung is true, so about 50 scans, 50 additions.",
        "The rung is true, so it executes.",
        "The result is in units of added 1s, not seconds."
      ]
    },
    {
      q: "`LIM(20,Level,80)` with Level = 80. What is the result?",
      options: ["False, 80 is the edge", "True, limits are inclusive", "Fault", "Only true if Level is a DINT"],
      answer: 1,
      explain: [
        "The limits are included.",
        "Correct. LIM is true from Low to High inclusive.",
        "No fault occurs.",
        "Type does not change this."
      ]
    },
    {
      q: "What does `MOV(3.7,Count)` do when Count is a DINT?",
      options: ["Stores 3", "Stores 4", "Faults", "Stores 3.7"],
      answer: 1,
      explain: [
        "Logix rounds to the nearest whole number on conversion.",
        "Correct. The REAL is rounded to 4.",
        "The conversion is legal.",
        "A DINT cannot hold a fraction."
      ]
    },
    {
      q: "Why does `EQU(Total,1.0)` fail after ten additions of 0.1 in a REAL?",
      options: ["Total is a different type", "Rounding error leaves the total near but not exactly 1.0", "EQU only works on DINT", "Ten additions overflow"],
      answer: 1,
      explain: [
        "Types can be compared.",
        "Correct. Binary floating point cannot store 0.1 exactly.",
        "EQU accepts REALs.",
        "There is no overflow here."
      ]
    },
    {
      q: "An array index comes from an HMI numeric entry. What guards the controller best?",
      options: ["Nothing, Logix checks it", "A LIM or compare on the index before using it", "Moving it to a REAL", "Using COP instead of MOV"],
      answer: 1,
      explain: [
        "An out-of-range subscript is a major fault.",
        "Correct. Validate the range first.",
        "Type changes do not bound the value.",
        "Both instructions use the index the same way."
      ]
    },
    {
      q: "When should you choose COP over MOV?",
      options: ["Copying an array or a UDT of the same type", "Converting a REAL to a DINT", "Adding two numbers", "Clearing a tag"],
      answer: 0,
      explain: [
        "Correct. COP copies raw memory efficiently for blocks of the same type.",
        "COP does not convert, MOV does.",
        "COP does not calculate.",
        "That is CLR."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers General Instructions Reference Manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm018_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Instruction Set (Studio 5000 Logix Designer v37)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix5000 Controllers General Instructions Reference Manual (1756-RM003I)", url: "https://lvmcc-pubs.rockwellautomation.com/pubs/1756-rm003i-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
