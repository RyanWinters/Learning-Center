LC.lesson({
  id: "plc-counters",
  title: "Counters: CTU, CTD, RES",
  track: "plc",
  minutes: 20,
  level: 2,
  prereqs: ["plc-timers", "plc-oneshots"],
  tags: ["counters", "CTU", "CTD", "RES", "edge", "DINT", "overflow"],
  summary: "The COUNTER structure, how CTU and CTD count edges, the up/down car-park pattern, overflow, and how to reset safely.",
  objectives: [
    "List the COUNTER members and say what .DN, .OV and .UN mean",
    "Explain why CTU and CTD count on false-to-true edges and need no extra one-shot",
    "Build an up/down counter by sharing one tag between a CTU and a CTD",
    "Choose where to place RES and what must happen before it clears a total",
    "Explain why counts are DINTs, and why a REAL stops counting past 16,777,216"
  ],

  body: `A counter remembers how many times something happened: parts through a gate, cars into a lot, cycles of a press, bottles in a case. In Logix there are two, **CTU** (count up) and **CTD** (count down), and one reset, **RES**. They look simple and they are, until you meet edge counting, overflow, and the question of who resets the thing.

## The COUNTER structure

A counter is a tag of type **COUNTER**, a structure with seven members.

| Member | Type | Meaning |
|---|---|---|
| \`.PRE\` | DINT | Preset: the target count |
| \`.ACC\` | DINT | Accumulated: the current count |
| \`.CU\` | BOOL | Count-up enable: follows the CTU rung |
| \`.CD\` | BOOL | Count-down enable: follows the CTD rung |
| \`.DN\` | BOOL | Done: true when ACC is greater than or equal to PRE |
| \`.OV\` | BOOL | Overflow: ACC passed the largest DINT while counting up |
| \`.UN\` | BOOL | Underflow: ACC passed the smallest DINT while counting down |

In ladder you write \`CTU(Part_Count,100,0)\`: the tag, the preset and the starting accumulator. As with timers, give each counter its own tag. The one deliberate exception is an up/down counter, where a CTU and a CTD share a tag so they operate on the same ACC.

## CTU: count up

\`\`\`ladder
XIC(Part_Eye) CTU(Part_Count,100,0)
XIC(Part_Count.DN) OTE(Case_Full)
XIC(Case_Removed) RES(Part_Count)
\`\`\`

CTU adds 1 to ACC each time its rung goes from **false to true**. It does not add on every scan the rung is true. That is edge counting, and it means you do not need a separate one-shot in front of a CTU the way you do in front of an ADD (see {{lesson:plc-oneshots}}). The counter keeps its own memory of the last rung state in the \`.CU\` bit.

{{diagram:ctu}}

Three details worth watching in the diagram:

- DN turns on when ACC reaches PRE and **stays** on while ACC is at or above PRE. The counter does not stop at the preset. A 101st part makes ACC 101 and DN stays true.
- When the rung goes false, **nothing resets**. ACC holds. Counters are retentive, like an RTO, and survive a power cycle.
- Only RES (or a MOV or CLR to ACC) clears the count and the DN, OV and UN bits.

{{sim:sim-ctu}}

## RES: resetting a counter

RES on a counter sets ACC to 0 and clears DN, OV, UN and the CU/CD bits. Put it in its own rung with its own condition. Typical reset conditions are an operator button, a case-complete event, a new-shift signal or a batch start. A common pattern resets the counter from its own DN:

\`\`\`ladder
XIC(Part_Eye) CTU(Case_Count,24,0)
XIC(Case_Count.DN) XIC(Case_Taped) RES(Case_Count)
\`\`\`

The case fills at 24, the tape station finishes, and the counter clears for the next case. Because the reset waits for a real event, the DN stays true long enough for other logic to act on it.

> [!warning] Do not RES in the same rung as the counter
> If RES shares the rung condition with the CTU, the counter is cleared every scan it counts and never gets past 0. Reset logic goes in a separate rung, after the counter rung.

## CTD: count down

\`\`\`ladder
XIC(Item_Picked) CTD(Bin_Stock,0,0)
\`\`\`

CTD subtracts 1 from ACC on each false-to-true edge of its rung. Like CTU, it holds its value and needs a RES or a preload. CTD sets DN when ACC is greater than or equal to PRE, the same test as CTU, so a stock counter that counts down toward zero is usually tested with a compare against ACC rather than with DN:

\`\`\`ladder
LEQ(Bin_Stock.ACC,0) OTE(Bin_Empty)
\`\`\`

To start a stock counter at, say, 500 items, load ACC with a MOV (\`MOV(500,Bin_Stock.ACC)\`) when the bin is refilled. Writing to .ACC directly is normal for counters.

## Up/down counting: the car park

An up/down counter is a CTU and a CTD on the **same tag**. Entries add, exits subtract, and ACC always holds the number of cars currently inside.

\`\`\`ladder
XIC(Entry_Eye) CTU(Cars,100,0)
XIC(Exit_Eye) XIC(Cars_Not_Empty) CTD(Cars,100,0)
GRT(Cars.ACC,0) OTE(Cars_Not_Empty)
XIC(Cars.DN) OTE(Lot_Full_Sign)
\`\`\`

{{diagram:updown}}

With PRE = 100, \`Cars.DN\` is true whenever ACC is 100 or more, so it works directly as the "FULL" sign, and it clears itself when a car leaves and ACC drops to 99. This is a pleasing use of the shared structure. The third rung stops the CTD from driving ACC negative if a sensor glitches, though note that the rung order matters: the permissive is computed after the counter that uses it, so it reflects the previous scan. That is fine for this purpose.

{{sim:sim-ctd}}

Sharing a tag between CTU and CTD works because each instruction watches its own enable bit (\`.CU\` or \`.CD\`) and both act on one ACC. If both rungs have an edge on the same scan, both fire, and the net change is zero.

## Edge counting limits

CTU and CTD detect an edge **only when they are scanned**. That sets three limits.

1. **The input must stay in one state for at least one full scan**, and be seen as changed. A pulse shorter than the scan time or the input module's filter will be missed.
2. **Fast inputs need hardware.** Counting a 5 kHz encoder or a high-speed flow meter belongs in a high-speed counter module or an HSC input, not CTU.
3. **A counter in a routine that is not called does not see its edges.** The rung's state at the next scan may produce a false edge.

## .OV and .UN, and why DINT

ACC and PRE are DINTs: 32-bit signed integers from −2,147,483,648 to 2,147,483,647. If CTU passes the upper limit, it wraps to −2,147,483,648 and sets \`.OV\`. If CTD passes the lower limit, it wraps to the top and sets \`.UN\`. You will hardly ever see either from parts counting, but an event counting at high rate can. At 1,000 counts per second a DINT overflows in about 24.8 days.

The data type matters for a reason beyond range. Compare the options for a running total:

| Type | Largest whole count | Problem |
|---|---|---|
| INT (16-bit) | 32,767 | 60 parts a minute overflows in 9 hours |
| DINT (32-bit) | 2,147,483,647 | Native size on a Logix CPU, so no conversion cost |
| REAL (32-bit float) | 16,777,216 exactly, then gaps | Adding 1 to 16,777,216 gives 16,777,216 again, so counting silently stops |
| LINT (64-bit) | 9.2 × 10^18 | Safe, but not a COUNTER member |

Logix registers and I/O are 32-bit native, so DINT is the default for every whole-number quantity. Never accumulate counts in a REAL.

## What survives, and what to reset

| Event | ACC after |
|---|---|
| Rung goes false | Held |
| Power cycle, Run/Program switch | Held (retentive) |
| RES | 0 |
| Download | Depends on whether the project's tag values are kept, so check |

Because counters persist, plan for who clears them. A counter that resets only when an operator remembers will report yesterday's total today. If you need totals per shift or per batch, reset on an event from the process, copy the final ACC to a history tag first, then RES. The order matters: MOV and then RES, in that scan order.`,

  eli5: `Picture a person at a stadium gate with a clicker in each hand, one for people coming in and one for people going out. Every time someone walks through the gate, you click. You do not click again if they stand in the doorway talking. You only click when a new person steps through.

The clicker keeps its number even when you take a break or the lights go off. To start over you have to press the little reset knob on the side.

If you ask the clicker "have we hit the number we wanted?", it says yes as soon as the count reaches the target and keeps saying yes while the count is at or above it. And the clicker has a limit. If you count past the highest number it can show, it rolls over, like a car odometer going from all nines back to zeros, and a little warning light turns on.`,

  why: `**Why count on the edge, not the level?** A box on a conveyor blocks the eye for hundreds of scans. Counting every scan would give hundreds of counts per box. The false-to-true rule makes the counter agree with how people think: one object, one count.

**Why are counters retentive?** A counter's whole job is to remember. If a power dip wiped a half-full pallet's count, the next shift would build a short pallet or an overfull one. That memory is also the trap. Anything that persists must be reset on purpose, and a missing reset is the commonest counter bug.

**Why DINT?** It is the CPU's native integer size, fast, and large enough that overflow is not a worry in everyday counting. INTs overflow in hours at normal rates, and REALs stop counting without any warning at 16.7 million. Counting in the wrong type fails silently, which makes it nastier than a loud fault.

**Why share a tag for up/down?** One ACC means one truth about how many cars are inside. Two counters would need a subtraction and would drift apart after any missed sensor edge.

**What do experienced integrators argue about?** Whether to trust a counter at all for inventory. A sensor misses a car and the count is off forever, so serious systems add a periodic correction (a reset when the lot is observed empty, or a reconciliation against a barcode scan). The counter is the fast estimate, the periodic check is the truth.`,

  history: `Mechanical and electromechanical counters, with a ratcheted wheel advanced by a solenoid, were standard in relay-era machines for tallying parts and cycles. PLC counters kept the same shape: a count input, a reset and a done contact at the preset. The up and down counter pair came across with the same names from the PLC-5 and SLC 500 families.`,

  examples: [
    { title: "A pallet of 48 cartons", body: `\`XIC(Carton_Eye) CTU(Pallet_Count,48,0)\` then \`XIC(Pallet_Count.DN) OTE(Pallet_Full)\`. The full lamp stays on until the forklift driver presses \`Pallet_Removed\`, wired to \`XIC(Pallet_Removed) RES(Pallet_Count)\`. If the driver forgets, the next carton makes ACC 49 with DN still on, and the lamp stays lit.` },
    { title: "Missed-pulse diagnosis", body: `A line counts 1,000 bottles an hour on the PLC, but the downstream scale says 1,012. The sensor's output pulses at 8 ms, the task runs at 10 ms. Some pulses fall between scans. Moving the count to an interrupt task or a fast input solves it. Adding a TON 'stretcher' in the sensor wiring or an input filter change does not, because the pulse is too short to begin with.` }
  ],

  diagrams: {
    ctu: `<svg viewBox="0 0 640 316" role="img" aria-label="CTU timing: each rising edge of the rung adds one to ACC, DN turns on when ACC reaches PRE and stays on while ACC is at or above PRE until RES clears the counter">
  <text class="dg-title" x="20" y="24">CTU, PRE = 3</text>
  <text class="dg-text-sm" x="20" y="64">Rung (input)</text>
  <path class="dg-line-accent" d="M170,70 L202.1,70 L202.1,48 L234.3,48 L234.3,70 L266.4,70 L266.4,48 L298.6,48 L298.6,70 L330.7,70 L330.7,48 L362.9,48 L362.9,70 L395.0,70 L395.0,48 L427.1,48 L427.1,70 L459.3,70 L459.3,48 L491.4,48 L491.4,70 L620,70"/>
  <text class="dg-text-sm" x="20" y="104">.CU</text>
  <path class="dg-line-accent" d="M170,110 L202.1,110 L202.1,88 L234.3,88 L234.3,110 L266.4,110 L266.4,88 L298.6,88 L298.6,110 L330.7,110 L330.7,88 L362.9,88 L362.9,110 L395.0,110 L395.0,88 L427.1,88 L427.1,110 L459.3,110 L459.3,88 L491.4,88 L491.4,110 L620,110"/>
  <text class="dg-text-sm" x="20" y="144">.DN</text>
  <path class="dg-line-alarm" d="M170,150 L330.7,150 L330.7,128 L523.6,128 L523.6,150 L620,150"/>
  <text class="dg-text-sm" x="20" y="184">RES rung</text>
  <path class="dg-line-accent" d="M170,190 L523.6,190 L523.6,168 L539.6,168 L539.6,190 L620,190"/>
  <text class="dg-text-sm" x="20" y="234">.ACC</text>
  <line class="dg-line-thin dg-dash" x1="170" y1="223.6" x2="620" y2="223.6"/>
  <text class="dg-text-muted dg-end" x="164" y="227.6">PRE</text>
  <path class="dg-line" d="M170.0,250.0 L202.1,250.0 L202.1,241.2 L266.4,241.2 L266.4,232.4 L330.7,232.4 L330.7,223.6 L395.0,223.6 L395.0,214.8 L459.3,214.8 L459.3,206.0 L523.6,206.0 L523.6,250.0 L620.0,250.0"/>
  <line class="dg-line-thin dg-dash" x1="202.1" y1="44" x2="202.1" y2="260"/>
  <text class="dg-text-muted dg-mid" x="202.1" y="276">1</text>
  <line class="dg-line-thin dg-dash" x1="266.4" y1="44" x2="266.4" y2="260"/>
  <text class="dg-text-muted dg-mid" x="266.4" y="276">2</text>
  <line class="dg-line-thin dg-dash" x1="330.7" y1="44" x2="330.7" y2="260"/>
  <text class="dg-text-muted dg-mid" x="330.7" y="276">3: DN</text>
  <line class="dg-line-thin dg-dash" x1="395.0" y1="44" x2="395.0" y2="260"/>
  <text class="dg-text-muted dg-mid" x="395.0" y="276">4</text>
  <line class="dg-line-thin dg-dash" x1="523.6" y1="44" x2="523.6" y2="260"/>
  <text class="dg-text-muted dg-mid" x="523.6" y="276">RES</text>
  <text class="dg-text-sm" x="20" y="302">Counts happen on the rising edge only. DN stays on past PRE, ACC keeps rising, RES zeroes all.</text>
</svg>`,
    updown: `<svg viewBox="0 0 640 250" role="img" aria-label="Up and down counting on one counter tag: entries raise ACC, exits lower it">
  <text class="dg-title" x="20" y="24">Car park: CTU on entry, CTD on exit, one shared counter</text>
  <text class="dg-text-sm" x="20" y="66">Entry eye</text>
  <path class="dg-line-accent" d="M170,72 L202.1,72 L202.1,50 L234.3,50 L234.3,72 L266.4,72 L266.4,50 L298.6,50 L298.6,72 L330.7,72 L330.7,50 L362.9,50 L362.9,72 L620,72"/>
  <text class="dg-text-sm" x="20" y="106">Exit eye</text>
  <path class="dg-line-accent" d="M170,112 L427.1,112 L427.1,90 L459.3,90 L459.3,112 L523.6,112 L523.6,90 L555.7,90 L555.7,112 L620,112"/>
  <text class="dg-text-sm" x="20" y="174">Cars.ACC</text>
  <line class="dg-line-thin dg-dash" x1="170" y1="140.0" x2="620" y2="140.0"/>
  <text class="dg-text-muted dg-end" x="164" y="144.0">PRE</text>
  <path class="dg-line" d="M170.0,190.0 L202.1,190.0 L202.1,173.3 L266.4,173.3 L266.4,156.7 L330.7,156.7 L330.7,140.0 L427.1,140.0 L427.1,156.7 L523.6,156.7 L523.6,173.3 L620.0,173.3"/>
  <line class="dg-line-thin dg-dash" x1="202.1" y1="44" x2="202.1" y2="200"/>
  <text class="dg-text-muted dg-mid" x="202.1" y="216">in</text>
  <line class="dg-line-thin dg-dash" x1="266.4" y1="44" x2="266.4" y2="200"/>
  <text class="dg-text-muted dg-mid" x="266.4" y="216">in</text>
  <line class="dg-line-thin dg-dash" x1="330.7" y1="44" x2="330.7" y2="200"/>
  <text class="dg-text-muted dg-mid" x="330.7" y="216">in</text>
  <line class="dg-line-thin dg-dash" x1="427.1" y1="44" x2="427.1" y2="200"/>
  <text class="dg-text-muted dg-mid" x="427.1" y="216">out</text>
  <line class="dg-line-thin dg-dash" x1="523.6" y1="44" x2="523.6" y2="200"/>
  <text class="dg-text-muted dg-mid" x="523.6" y="216">out</text>
  <text class="dg-text-sm" x="20" y="238">PRE = 3 here, so Cars.DN is on only while ACC is 3 or more (the lot is full).</text>
</svg>`
  },

  pitfalls: [
    "Putting RES in the same rung as the counter.",
    "Never resetting a counter and then trusting its total.",
    "Counting in INT or REAL instead of DINT.",
    "Assuming DN pulses at PRE. It stays on while ACC is at or above PRE.",
    "Counting pulses faster than the scan or the input filter.",
    "Letting a CTD run below zero because no limit was placed on the rung.",
    "Using two separate counters for entries and exits, then subtracting."
  ],

  keyTerms: ["ctu", "ctd", "counter-structure", "edge-counting", "dint", "overflow"],

  quiz: [
    {
      q: "A CTU rung is true for 400 scans while a box passes the eye. How many counts is that?",
      options: ["400", "1", "0", "It depends on the preset"],
      answer: 1,
      explain: [
        "Counters do not count every scan the rung is true.",
        "Correct. CTU adds one on the false-to-true transition.",
        "It counts when the rung rises.",
        "The preset sets DN, not the number of counts per event."
      ]
    },
    {
      q: "CTU preset is 10 and 12 parts arrive. What is the state of Count.DN?",
      options: ["Off, it only turns on at exactly 10", "On, and still on at 12", "On for one scan only", "Off, because .OV is set"],
      answer: 1,
      explain: [
        "DN is ACC >= PRE, not ACC = PRE.",
        "Correct. DN stays true as long as ACC is at or above PRE.",
        "DN is a held bit.",
        "OV only sets at the DINT limit."
      ]
    },
    {
      q: "Why put RES in its own rung instead of the counter's rung?",
      options: ["RES must come first in the file", "Sharing a condition would clear the counter on every counting scan", "Logix forbids two instructions in a rung", "RES only works on timers"],
      answer: 1,
      explain: [
        "Rung order alone is not the issue.",
        "Correct. The reset would fight the count and ACC would stay near 0.",
        "Many instructions can share a rung.",
        "RES works on both TIMER and COUNTER."
      ]
    },
    {
      q: "For a car park, which is the right structure?",
      options: ["Two COUNTERs, subtract the ACCs", "A CTU and a CTD on the same COUNTER tag", "A TON and a CTU", "One CTU and manual MOVs"],
      answer: 1,
      explain: [
        "That drifts after any missed edge.",
        "Correct. They share ACC, so it always holds the cars inside.",
        "A timer is not involved.",
        "That is more work and more error."
      ]
    },
    {
      q: "You count a total in a REAL tag with ADD(Total,1,Total). What goes wrong around 16.7 million?",
      options: ["It overflows and sets .OV", "Adding 1 stops changing the value", "It faults the controller", "It rolls to negative"],
      answer: 1,
      explain: [
        "REAL has no .OV member.",
        "Correct. A 32-bit float cannot represent the next whole number, so the total freezes.",
        "No fault is raised, which is why it is dangerous.",
        "That is the DINT wrap, not REAL behavior."
      ]
    },
    {
      q: "A part sensor pulses for 3 ms and the task scans every 10 ms. What is likely?",
      options: ["Every part is counted", "Some parts are missed", "Parts are counted twice", "The counter faults"],
      answer: 1,
      explain: [
        "The scan can fall between pulses.",
        "Correct. The PLC only sees the input when it scans.",
        "A one-sample pulse produces at most one edge.",
        "No fault is raised."
      ]
    }
  ],

  resources: [
    { title: "Timer and Counter Instructions (Studio 5000 Logix Designer v37)", url: "https://www.rockwellautomation.com/en-dk/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set/timer-and-counter-instructions.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers General Instructions Reference Manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm018_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Instruction Set (Studio 5000 Logix Designer v37)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/instruction-set.html", type: "docs", source: "Rockwell Automation" }
  ]
});
