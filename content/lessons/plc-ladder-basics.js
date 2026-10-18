LC.lesson({
  id: "plc-ladder-basics",
  title: "Ladder fundamentals: XIC, XIO, OTE",
  track: "plc",
  minutes: 25,
  level: 1,
  prereqs: ["plc-scan", "plc-tags"],
  tags: ["ladder", "xic", "xio", "ote", "rung", "boolean"],
  summary: "Three instructions build half of every machine: look for a 1, look for a 0, and set an output. Then add series and parallel and you have Boolean logic.",
  objectives: [
    "Read a ladder rung left to right and say when its output is on",
    "Explain what XIC, XIO and OTE examine and do",
    "Build AND with contacts in series and OR with a parallel branch",
    "Write the truth table for a rung",
    "Explain why a normally closed stop button uses XIC, and avoid the classic wiring/logic mix-up",
    "Explain why two OTEs on one bit cause a bug"
  ],

  body: `
## What ladder is

{{term:ladder-logic|Ladder logic}} is a picture of control logic. It was drawn to look like the wiring diagram of a relay panel, with two vertical **{{term:power-rail|power rails}}** (left and right) and horizontal **{{term:rung|rungs}}** between them. Conditions go on the left of a rung and the action goes on the right. If the conditions allow "power flow" from the left rail to the action, the action happens.

Nothing real flows, of course. It is a way of thinking: a rung is a true/false sentence. "If the Start button is pressed, turn the Motor on."

\`\`\`ladder
XIC(Start) OTE(Motor)
\`\`\`

Read it as: **if Start is 1, then Motor is 1**. That is the entire idea. The rest of the lesson shows how to combine conditions.

## The three instructions

| Instruction | Name | True when | Symbol idea |
|---|---|---|---|
| {{term:xic|XIC}} | Examine If Closed | the bit is **1** | A pair of open contacts: \`--| |--\` |
| {{term:xio|XIO}} | Examine If Open | the bit is **0** | Contacts with a slash: \`--|/|--\` |
| {{term:ote|OTE}} | Output Energize | (is an action) sets its bit to 1 when the rung is true, 0 when false | A coil: \`--( )--\` |

### Contacts examine the bit, not the wiring

This is the point that confuses everyone at first. **XIC and XIO look at a bit in memory.** They do not know whether a wire is normally open or normally closed. XIC means "is the bit a 1?" and XIO means "is the bit a 0?". Period.

{{diagram:rung}}

What the bit *means* depends on the field device that sets it. A normally-open pushbutton makes the input bit 1 when pressed. A normally-closed one makes it 1 when *not* pressed. The logic only sees 1 and 0. Keep these two layers apart: the **wiring** decides what the bit means, the **instruction** decides how you test it.

### How the rung is solved

During the program scan (see {{lesson:plc-scan}}) the controller walks the rung left to right. It starts with "true" at the left rail. Each contact passes the true on, or blocks it. When it reaches the output, the OTE copies the final result into its bit:

- Rung true: OTE sets the bit to 1.
- Rung false: OTE sets the bit to 0.

So an OTE **follows** the rung. It does not remember. When the conditions go away, the output goes away, which is exactly what a lamp that should be on only while a button is held needs.

Now try your first rung in the simulator.

{{sim:sim-xic-ote}}

## Series is AND

Contacts in a row on one rung, left to right, must **all** be true for power to reach the output.

\`\`\`ladder
XIC(Guard_Closed) XIC(Start) OTE(Motor)
\`\`\`

Motor runs only if the guard is closed **and** Start is pressed.

| Guard_Closed | Start | Motor |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

## Parallel is OR

A **branch** puts two paths side by side. Power flows if **either** path is true.

> [!note] How branches are written in text
> This course writes a rung as plain text so it fits on a line. Instructions in a row are in series, left to right. A **branch** is written in square brackets with a **comma between the parallel legs**: \`[XIC(A) ,XIC(B)]\` means "A in one leg, B in a second leg underneath it". Anything after the closing bracket is in series with the whole branch. Drawn out, \`[XIC(A) ,XIC(B)] OTE(C)\` is two contacts stacked one above the other, joined on both ends, then a coil.

\`\`\`ladder
[XIC(Start_Local) ,XIC(Start_Remote)] OTE(Motor)
\`\`\`

Motor runs if the local start **or** the remote start is on.

| Start_Local | Start_Remote | Motor |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 1 |

You can combine them. This rung says: (local start OR remote start) AND guard closed.

\`\`\`ladder
[XIC(Start_Local) ,XIC(Start_Remote)] XIC(Guard_Closed) OTE(Motor)
\`\`\`

In Boolean terms: Motor = (Start_Local + Start_Remote) · Guard_Closed. A rung can only express what series and parallel can; later lessons add timers, counters and compare instructions as extra "contacts" in the same picture.

Practice both in the simulator.

{{sim:sim-and-or}}

## XIO: the "not"

XIO is true when the bit is **0**. That makes it the "NOT" of the bit.

\`\`\`ladder
XIC(Start) XIO(Fault) OTE(Motor)
\`\`\`

Motor runs when Start is on **and** there is no fault. If the Fault bit goes to 1, the XIO opens and the motor stops.

Use XIO when the condition you want is the *absence* of something: no fault, not running, door not open.

{{sim:sim-xio}}

## The normally-closed stop button

This is the single most important safety habit in this lesson.

A stop button is almost always wired **normally closed (NC)**: it passes current until you press it. The reason is fail-safe design. If the wire to the button breaks, the input loses power exactly as if someone pressed Stop, and the machine stops. A normally-open stop would leave a broken wire looking like "nobody pressed stop", and the machine would keep running, unable to be stopped.

Now think through what the PLC input sees:

| Situation | Stop wiring | Input bit |
|---|---|---|
| Button not pressed, wire good | NC contact closed, 24 V reaches input | **1** |
| Button pressed | NC opens, no voltage | **0** |
| Wire broken | No voltage | **0** (looks like pressed, safe) |

A healthy, unpressed stop button is a **1**. So to say "run only if the stop is not pressed", you test for a 1:

\`\`\`ladder
XIC(Start) XIC(Stop_PB) OTE(Motor)
\`\`\`

An **XIC** on an NC stop button. A beginner who thinks "stop is a not, so use XIO" writes \`XIO(Stop_PB)\`, and the motor can only run while the stop is *pressed*. That does not run at all in practice, because nobody holds Stop while pressing Start. It is a very common first error.

> [!warning] Think in bits, not buttons
> Ask two questions in order. First, "what is the bit when the device is healthy and idle?" Second, "which instruction passes power in that state?" For an NC stop: bit is 1 when idle, so XIC passes power. For a normally-open start: bit is 0 when idle, so XIC blocks power until pressed.

A reliable habit: add a description to every tag that says the wiring ("NC, 1 = healthy"), so the next person doesn't have to guess.

## The duplicate OTE problem

Each bit should have one OTE writing it. Look at this:

\`\`\`ladder
XIC(Start_A) OTE(Motor)
XIC(Start_B) OTE(Motor)
\`\`\`

The rungs are solved in order. If Start_A is 1 and Start_B is 0, rung 1 sets Motor to 1, then rung 2 sets it right back to 0. The **last rung wins**. Motor never runs from Start_A. Studio 5000 allows this, and its cross-reference tool warns about it, but the compile does not stop you.

The fix is to combine the conditions into one rung with a parallel branch:

\`\`\`ladder
[XIC(Start_A) ,XIC(Start_B)] OTE(Motor)
\`\`\`

(Later you will use OTL/OTU and seal-in for memory. See {{lesson:plc-sealin}}.)

## Worked example: a guarded pump

Requirements: pump motor P101 runs while the operator holds Run, but only if the local stop is healthy (NC, 1 = healthy), the tank is not empty (low-level switch is 1 when there is liquid) and the overload relay has not tripped (a status contact, NC, 1 = healthy).

\`\`\`ladder
XIC(Run_PB) XIC(Stop_OK) XIC(Level_NotLow) XIC(P101_OL_OK) OTE(P101_Run)
\`\`\`

Everything is XIC because every device is wired so that a 1 means "ok to go". Any one condition at 0 stops the pump, and a broken wire reads as 0. A good test is to ask of each contact: "if this wire fell off, would the machine stop?"

The level switch is a process permissive and belongs in the logic. The overload and the E-stop are different: in a real panel they are **hardwired in the starter coil circuit**, so they cut the contactor whatever the program does. The PLC only reads the overload status (as above) and an E-stop status to show alarms and avoid commanding a start into a tripped starter. {{lesson:plc-sealin}} shows the wiring.
`,

  eli5: `
Imagine a hallway with a lamp at the end, and the hallway has doors across it. Each door is a bit in the PLC.

An **XIC** door is a door that is open only when its bit is 1. A door that is shut blocks the light, so "is the bit a 1?" is the question XIC asks. An **XIO** door is the opposite: it is open only when its bit is 0, so it asks "is the bit a 0?" The lamp at the end of the hall is the **OTE**. It lights if light reaches it, and goes out the moment light stops reaching it.

If every door in a row is open, light travels down the hall and the lamp goes on. That is "and". Now imagine two hallways side by side leading to the same lamp. If either one is clear, the lamp goes on. That is "or".

The stop button is the clever one. We wire it so its door is open all the time and only shuts when someone presses stop. If the wire to the button breaks, the door shuts too, exactly as if someone pressed stop, so the machine stops and you find the problem. That "open until pressed" door is an XIC on a bit that reads 1 when everything is healthy.

The PLC never sees real doors, only ones and zeros. Your job at each door is to decide whether to ask "is it a one?" or "is it a zero?"
`,

  why: `
**Why XIC on a stop button?** Because the input bit is 1 when the circuit is healthy. Fail-safe wiring puts the safety in the field, and the program must follow what the wire says. If your logic uses XIO on an NC stop, the machine either refuses to run or, worse, runs only when stop is pressed. If someone later "fixes" the wiring to normally-open to match the logic, you have turned a fail-safe circuit into one that fails dangerous. Integrators fight over this on every commissioning, and the discipline is to describe every tag by its wiring and bit state.

**Why does the standard use E-stops in hardware?** A real emergency stop should cut power through a hard-wired safety relay or safety PLC. The ordinary PLC stop button in this lesson is a **process stop**, not a safety function. See {{lesson:plc-safety}}. Never rely on standard ladder for personnel protection.

**Why avoid duplicate OTEs?** Because the final state depends on rung order, which is not visible in the picture. A bug that appears when someone moves a rung is the most expensive kind to find. Most standards say one write per bit, and review checks use the cross-reference tool to find any bit with two OTEs.

**Why do we draw this as ladder at all?** Because electricians already read relay diagrams. A maintenance tech at 3 a.m. can open the program online, watch the rung highlight, and see which contact is blocking power. That readability beats the elegance of text for simple interlocks, which is why ladder survives.

**What do experienced integrators disagree on?** How much to put in one rung. Some pack ten conditions in a branching rung, others prefer small rungs with intermediate bits such as \`Pump_Permissive\`. The second style is easier to troubleshoot and costs a few extra bits.
`,

  history: `
Ladder logic comes straight from relay control diagrams, which were drawn with power rails at the sides and devices on horizontal lines between them. When the first PLCs were introduced around 1969 for General Motors, the programming display copied those diagrams so that electricians could adopt them without learning a computer language. Instruction names such as XIC and XIO ("examine if closed/open") come from Allen-Bradley's early PLC naming and remain in Logix today.
`,

  examples: [
    {
      title: "Reading a rung aloud",
      body: `\`[XIC(Hand) ,XIC(Auto_Req)] XIO(Fault) XIC(Guard_Closed) OTE(Fan)\` reads: "The fan runs if (Hand OR Auto_Req) AND there is no Fault AND the guard is closed." Reading rungs aloud like this is the fastest way to find a mistake.`
    },
    {
      title: "Debugging a motor that will not start",
      body: `Online, the rung \`XIC(Start) XIC(Stop_PB) OTE(Motor)\` shows Start highlighted (true) but Stop_PB not highlighted. The XIC on Stop_PB is blocking. The tag value is 0. Since Stop_PB is wired NC and 1 means healthy, a 0 means either it is being pressed, the wire is open, or the input module has no 24 V. A meter at the terminal answers it in a minute, and the logic is fine.`
    }
  ],

  diagrams: {
    rung: `<svg viewBox="0 0 640 190" role="img" aria-label="A ladder rung between two power rails: an XIC contact on Start in series with an XIO contact on Stop, driving an OTE coil on Motor">
  <line class="dg-line" x1="40" y1="30" x2="40" y2="130"/>
  <line class="dg-line" x1="600" y1="30" x2="600" y2="130"/>
  <line class="dg-line" x1="40" y1="80" x2="160" y2="80"/>
  <line class="dg-line" x1="160" y1="62" x2="160" y2="98"/>
  <line class="dg-line" x1="190" y1="62" x2="190" y2="98"/>
  <line class="dg-line" x1="190" y1="80" x2="330" y2="80"/>
  <line class="dg-line" x1="330" y1="62" x2="330" y2="98"/>
  <line class="dg-line" x1="360" y1="62" x2="360" y2="98"/>
  <line class="dg-line" x1="326" y1="100" x2="364" y2="60"/>
  <line class="dg-line" x1="360" y1="80" x2="470" y2="80"/>
  <circle class="dg-box-accent" cx="490" cy="80" r="20"/>
  <line class="dg-line" x1="510" y1="80" x2="600" y2="80"/>
  <text class="dg-text-mono dg-mid" x="175" y="50">Start</text>
  <text class="dg-text-sm dg-mid" x="175" y="120">XIC: true if 1</text>
  <text class="dg-text-mono dg-mid" x="345" y="50">Stop</text>
  <text class="dg-text-sm dg-mid" x="345" y="120">XIO: true if 0</text>
  <text class="dg-text-mono dg-mid" x="490" y="50">Motor</text>
  <text class="dg-text-sm dg-mid" x="490" y="124">OTE: output</text>
  <text class="dg-text-muted dg-mid" x="40" y="150">Left rail</text>
  <text class="dg-text-muted dg-mid" x="600" y="150">Right rail</text>
  <text class="dg-text-sm" x="40" y="180">Power flows left to right only when every contact in series is true.</text>
</svg>`
  },

  pitfalls: [
    "Using XIO on a normally-closed stop button because 'stop means not'. The bit is 1 when healthy, so use XIC.",
    "Changing field wiring from NC to NO to 'match the logic', which breaks fail-safe behavior.",
    "Writing the same bit with two OTE instructions. The last rung wins.",
    "Thinking XIC means 'normally open contact'. It tests for a 1, whatever the wiring.",
    "Treating a standard ladder stop as a safety function."
  ],

  keyTerms: ["ladder-logic", "rung", "power-rail", "xic", "xio", "ote", "rung-condition", "normally-closed-stop"],

  quiz: [
    {
      q: "What does XIC test?",
      options: ["Whether the field wire is normally open", "Whether the bit is 0", "Whether the bit is 1", "Whether the output is energized in the field"],
      answer: 2,
      explain: [
        "XIC does not know anything about wiring. It reads a bit.",
        "That is XIO.",
        "Correct. XIC is true when its bit is 1.",
        "It reads a memory bit, not the physical output."
      ]
    },
    {
      q: "Which rung runs the Motor when Start OR Jog is on? (Reminder: \`[A ,B]\` means A and B are in parallel legs of a branch, and anything written in a row is in series.)",
      options: ["[XIC(Start) ,XIC(Jog)] OTE(Motor)", "XIC(Start) XIC(Jog) OTE(Motor)", "XIO(Start) XIO(Jog) OTE(Motor)", "XIC(Start) OTE(Motor) XIC(Jog)"],
      answer: 0,
      explain: [
        "Correct. Contacts in parallel branches make OR.",
        "Two contacts in series is AND. Both must be on.",
        "That would run only when both are off.",
        "An output belongs at the end of the rung."
      ]
    },
    {
      q: "A stop button is wired normally closed (its contact is closed until pressed), so the 24 V supply reaches the input when the button is not pressed. Which instruction lets the motor run when the button is released?",
      options: ["XIO(Stop_PB)", "XIC(Stop_PB)", "OTE(Stop_PB)", "Either one works"],
      answer: 1,
      explain: [
        "The bit is 1 when released. XIO passes power only when the bit is 0, so the motor could only run while Stop is pressed.",
        "Correct. Released means the bit is 1, and XIC passes power on a 1.",
        "OTE is an output, not a condition.",
        "They behave opposite to each other here."
      ]
    },
    {
      q: "What happens with \`XIC(A) OTE(Out)\` on rung 1 and \`XIC(B) OTE(Out)\` on rung 2 when A is 1 and B is 0?",
      options: ["Out is 1", "The controller faults", "Out toggles each scan", "The last-written value, 0, because rung 2 overwrites rung 1"],
      answer: 3,
      explain: [
        "Rung 1 sets it to 1, but rung 2 runs after it.",
        "Studio 5000 allows this and may only warn.",
        "The result is steady, not toggling.",
        "Correct. The last OTE to execute decides the bit's final state."
      ]
    },
    {
      q: "In the rung \`XIC(Run) XIO(Fault) OTE(Pump)\`, when does the pump bit go to 1?",
      options: ["Run = 1 and Fault = 1", "Run = 0 and Fault = 0", "Run = 1 and Fault = 0", "Run = 0 and Fault = 1"],
      answer: 2,
      explain: [
        "XIO needs Fault to be 0.",
        "Run must be 1.",
        "Correct. XIC needs Run at 1 and XIO needs Fault at 0.",
        "Both contacts would be false."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers General Instructions Reference (1756-RM003/RM018)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm018_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Quick Start Steps (Logix Designer)", url: "https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/37-00/contents-ditamap/quick-start-steps.html", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures (1756-PM001)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
