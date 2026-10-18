LC.lesson({
  id: "plc-scan",
  title: "The scan cycle",
  track: "plc",
  minutes: 15,
  level: 1,
  prereqs: ["plc-intro"],
  tags: ["scan", "scan-time", "rpi", "tasks", "watchdog"],
  summary: "A PLC does not react to events. It loops: read, solve, write. Knowing that loop explains most 'weird' ladder behavior.",
  objectives: [
    "Describe the three-stage scan model: input scan, program scan, output scan",
    "Explain why the order of rungs can change behavior",
    "Explain how Logix I/O really updates (RPI) and why the textbook model is only a model",
    "Distinguish continuous and periodic tasks and read scan time",
    "Say what the watchdog does and what causes a watchdog fault"
  ],

  body: `
## The loop that runs everything

A {{term:plc|PLC}} does not wait for a button press and then react. It runs a **{{term:scan-cycle|scan cycle}}**, a loop it repeats as fast as it can, many times a second. Each pass has three stages in the teaching model:

1. **Input scan.** Copy the state of every input into an input image in memory.
2. **Program scan.** Solve the logic, rung by rung, top to bottom, left to right, reading the input image and writing to an output image and internal tags.
3. **Output scan.** Copy the output image to the real output hardware.

{{diagram:scan}}

Then it starts over. A typical pass takes a few milliseconds for a small program, and tens of milliseconds for a large one.

You care because every surprising PLC behavior, such as an output that is one scan late, two rungs that fight, or a timer that never reaches its preset, comes from this loop.

## Why a snapshot?

During the program scan, the logic works from a **snapshot** of the inputs, not from the live wires. That keeps a single scan consistent. If a limit switch flips halfway through, every rung in that scan still sees the same value, so two rungs that use the same contact cannot disagree.

The cost is **latency**. If the button is pressed just after the input scan, the PLC does not see it until the next pass. In the worst case the delay from real-world event to real-world response is about:

> input filter time + one full scan + the output delay of the hardware

With a 10 ms scan, you can plan on 10 to 25 ms of reaction time. That is fine for a conveyor and too slow for a punch-press stop, which is why safety circuits do not depend on this loop. See {{lesson:plc-safety}}.

## Rung order matters

Rungs are solved in order. If a later rung depends on a bit that an earlier rung writes, the result is available in the same scan. If it depends on a bit that a later rung writes, the value is **one scan old**.

\`\`\`ladder
XIC(Start) OTE(Step_A)
XIC(Step_A) OTE(Lamp)
\`\`\`

Here Lamp turns on in the same scan as Step_A, because the Step_A rung runs first. Swap the two rungs and Lamp lags Step_A by one scan. On a 10 ms scan nobody notices. In a sequence where one rung resets what another needs, or where a counter and a reset share a condition, it is the difference between working and failing.

Rules of thumb:

- Put rungs that compute a bit **before** the rungs that use it.
- Write each output bit from **one** place. If two rungs both write an OTE for the same bit, the last rung wins and the other is wasted. See {{lesson:plc-ladder-basics}}.
- Do not assume a bit has changed since the start of the scan. It might change during the scan, if a rung earlier in the program wrote it.

## What really happens in Logix

The three-stage model describes older PLCs (PLC-5, SLC-500) closely. **Logix I/O does not work that way.** In ControlLogix and CompactLogix:

- I/O modules send their input data to the controller on their own schedule, set by the **{{term:rpi|RPI}} (Requested Packet Interval)** in the module properties, such as 20 ms. Data arrives **asynchronously**, independent of the program scan.
- When a tag like \`Local:1:I.Data.0\` is read in a rung, the logic sees whatever value last arrived. It might change between two reads in the same scan. Rockwell's documentation says that I/O updates are asynchronous to the program.
- Output values are sent to the module on a similar schedule, tied to the task and the module's RPI (the exact update rules are in the I/O chapter of the Logix manuals for your controller). The module's output reaches the real terminal after that.
- So reaction time depends on the **input filter**, the **RPI**, the **task scan** and the **output delay**. Add them up for the worst case, as in the worked example below. There is no safe shortcut multiplier.

To keep a snapshot in your logic (for instance, when you need two rungs to agree on one input), **copy the input into an internal bit at the top of the routine** and use the copy. This is what the older model did for free.

> [!tip] Choosing an RPI
> Check the default RPI in the module's properties. For a slow tank-level system 100 ms is fine and saves network and CPU load. For a fast machine 5 ms may be needed. Do not set every module to the minimum: a 1 ms RPI on 50 modules floods the controller with updates and causes problems of its own.

## Tasks: continuous and periodic

Logix groups programs into **tasks**, and tasks decide when code runs. Detail is in {{lesson:plc-organization}}. For the scan, you need two kinds:

| Task type | When it runs | Typical use |
|---|---|---|
| {{term:continuous-task|Continuous}} | Runs, finishes, immediately restarts. Gets the time not used by others | General logic. A new project starts with one called MainTask |
| {{term:periodic-task|Periodic}} | Starts at a fixed interval (say 10 ms), interrupts lower priority tasks | Motion, PID loops, anything needing a steady time base |
| Event | Starts when a trigger occurs | Fast reaction to an input |

A controller may have only one continuous task. Periodic tasks have a **priority** from 1 (highest) to 15 (lowest), and a higher priority preempts a lower one. The continuous task sits below them all.

### Scan time

{{term:scan-time|Scan time}} is how long one pass of a task takes. Logix Designer shows it in *Task Properties* under the *Monitor* tab, with last and maximum values (and others, depending on the version). For a periodic task, if the scan takes 4 ms and the period is 10 ms, the task has headroom. If the scan takes 12 ms against a 10 ms period, the task **overlaps**: it cannot finish before the next trigger. The controller counts overlaps and flags them.

Typical reasons for a long scan: a big program in one task, loops that process arrays (FOR loops in Structured Text), messaging, and interrupts from higher-priority tasks.

### Watchdog

Each task has a **{{term:watchdog|watchdog}}** time, 500 ms by default. If a task runs longer than its watchdog, the controller raises a major fault and stops. This is a safety net against logic stuck in a loop or a stuck JMP. Setting the watchdog to a huge value hides real problems. Setting it just above the expected maximum scan time is the usual approach.

## Worked example

A bottle line has a 15 ms continuous scan and photo-eyes at 20 ms RPI. A bottle passes in front of the eye for 30 ms.

- Worst case input latency: filter (1 ms) + RPI (20 ms) + scan (15 ms) = 36 ms.
- The bottle blocks the eye for 30 ms, so the PLC could just miss it.
- Fixes: lower the RPI to 5 ms, move the counting logic to a 5 ms periodic task, or use a high-speed counter input. All three work; the last is best for fast products.

Try the effect on a live rung in the simulator.

{{sim:sim-tour}}
`,

  eli5: `
Think of a security guard who checks the same list of rooms in the same order, over and over. At each room he glances in, then moves on. He doesn't hear things from rooms he isn't in front of.

If something happens in room 4 right after he passes, he won't notice until his next lap. A quick lap means a quick reaction. A very slow lap means problems might wait a long time.

Now imagine the guard has a radio, and the rooms send him their news every so often whether he is nearby or not (that is Logix I/O). He still walks his lap, but the news he uses is whatever last came over the radio.

The guard has a boss with a stopwatch. If one lap takes absurdly long, the boss figures the guard is stuck and shuts the building down. That is the watchdog.
`,

  why: `
**Why a loop at all?** A loop is simple, predictable and cheap to build into hardware. You can calculate the worst-case time it will take to react, which is why PLCs earned trust in factories. An event-driven system can be faster on average but is harder to prove.

**Why snapshot the inputs?** Consistency. Without a snapshot, a limit switch could be 0 for the first rung and 1 for the tenth rung, and your logic would see a state that never existed. Older PLCs got this free. Logix gives it up in exchange for speed and distributed I/O, so careful programmers copy critical inputs at the top of the routine when consistency matters.

**Why do integrators argue about task layout?** Some use one continuous task and are done. Others place fast loops in periodic tasks. The risk of many periodic tasks is that a high-priority task which runs long can starve the continuous task, and you can end up with watchdog faults that only occur when the machine is busy. The usual advice is to start simple, measure the scan time, and add a periodic task only when you can show it is needed.

**Why does rung order feel like a bug?** In ladder, nothing in the picture shows the order of evaluation. It is a property of position. Programmers who come from event-driven software expect everything to react at once. Teaching yourself "top to bottom, one pass" removes a whole class of mysteries.
`,

  history: `
Early PLCs had one processor that could do one thing at a time, so the loop (read inputs, solve, write outputs) was the natural design and the only one affordable. Later controllers added multiple tasks, interrupts and fast I/O to meet speed needs, but the loop stayed as the mental model. Logix moved I/O onto a producer/consumer network model in the late 1990s, which is why the textbook scan and the real behavior differ.
`,

  examples: [
    {
      title: "The one-scan-late lamp",
      body: `Rung 5 sets \`Ready\` when the conveyor is at speed. Rung 2 lights a lamp with \`XIC(Ready)\`. The lamp comes on one scan after the conveyor reaches speed because rung 2 ran before rung 5. Moving the lamp rung below rung 5 removes the lag. On a 10 ms scan this is invisible, but it matters when a counter on rung 3 reads \`Ready\` and a reset on rung 4 clears it in the same pass.`
    },
    {
      title: "Reading the scan time",
      body: `A periodic task has a 10 ms period. *Monitor* shows last scan 3.2 ms, max 8.7 ms, overlap count 0. Max 8.7 ms is close to the period, so adding a big new routine could cause overlaps. The fix is to measure again after the change and either lengthen the period or move the heavy work to the continuous task.`
    }
  ],

  diagrams: {
    scan: `<svg viewBox="0 0 640 210" role="img" aria-label="The scan cycle: input scan copies inputs to memory, the program scan solves rungs top to bottom, the output scan writes outputs, and the loop repeats">
  <defs>
    <marker id="plc-scan-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="50" width="170" height="80" rx="6"/>
  <text class="dg-title dg-mid" x="105" y="80">1. Input scan</text>
  <text class="dg-text-sm dg-mid" x="105" y="102">Copy inputs to memory</text>
  <rect class="dg-box-accent" x="235" y="50" width="170" height="80" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="80">2. Program scan</text>
  <text class="dg-text-sm dg-mid" x="320" y="102">Solve rungs, top to bottom</text>
  <rect class="dg-box" x="450" y="50" width="170" height="80" rx="6"/>
  <text class="dg-title dg-mid" x="535" y="80">3. Output scan</text>
  <text class="dg-text-sm dg-mid" x="535" y="102">Write outputs to modules</text>
  <line class="dg-line" x1="190" y1="90" x2="233" y2="90" marker-end="url(#plc-scan-ah)"/>
  <line class="dg-line" x1="405" y1="90" x2="448" y2="90" marker-end="url(#plc-scan-ah)"/>
  <path class="dg-line" d="M535 130 L535 170 L105 170 L105 134" fill="none" marker-end="url(#plc-scan-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="192">Repeat: one pass is the scan time, for example 5 to 20 ms</text>
</svg>`
  },

  pitfalls: [
    "Writing the same output bit with OTE on two rungs. Only the last one wins.",
    "Assuming an input stays constant through the whole scan in Logix. It can change mid-scan unless you copy it.",
    "Setting RPI as low as it will go on every module and overloading the controller.",
    "Raising the watchdog to a large number to silence a fault instead of finding the slow logic.",
    "Using the PLC scan for safety functions that need guaranteed reaction times."
  ],

  keyTerms: ["scan-cycle", "scan-time", "rpi", "watchdog", "continuous-task", "periodic-task", "rung"],

  quiz: [
    {
      q: "In the basic scan model, in what order does the PLC work?",
      options: ["Output scan, program scan, input scan", "Input scan, program scan, output scan", "Program scan, input scan, output scan", "All three at once"],
      answer: 1,
      explain: [
        "That would write outputs from stale data.",
        "Correct. Read inputs into memory, solve the logic, then write outputs.",
        "The program would then be solving with old inputs.",
        "The stages are sequential in the model."
      ]
    },
    {
      q: "Rung 10 writes bit Ready. Rung 3 uses XIC(Ready) to drive a lamp. When does the lamp respond to a change in Ready?",
      options: ["In the same scan", "One scan later", "Two scans later", "Immediately, outside the scan"],
      answer: 1,
      explain: [
        "Rung 3 ran before rung 10 in this scan, so it saw the old value.",
        "Correct. The lamp rung reads the value written on the previous pass.",
        "One scan is enough for the lag.",
        "Logic does not run outside the scan."
      ]
    },
    {
      q: "In ControlLogix, how does input data from a local I/O card reach the controller?",
      options: ["Only at the start of each program scan", "Asynchronously, at the module's RPI", "Only when the logic asks for it", "Only through messaging"],
      answer: 1,
      explain: [
        "That describes the older textbook model, not Logix.",
        "Correct. Each module sends data on its own RPI schedule, independent of the program scan.",
        "The logic does not request I/O. It reads whatever last arrived.",
        "Messaging is used between controllers, not for local I/O."
      ]
    },
    {
      q: "A periodic task has a 10 ms period and its last scan time is 12 ms. What is the problem?",
      options: ["The task overlaps because it cannot finish before the next trigger", "The watchdog is too small", "The RPI is too slow", "Nothing; periodic tasks wait"],
      answer: 0,
      explain: [
        "Correct. A task that takes longer than its period causes overlaps and signals a design problem.",
        "A 12 ms scan is far below the default 500 ms watchdog.",
        "RPI affects I/O data, not the task's own run time.",
        "The next trigger arrives regardless, and the controller counts the overlap."
      ]
    },
    {
      q: "Why does a controller have a watchdog on each task?",
      options: ["To log operators' actions", "To fault the controller if a task runs far longer than expected", "To speed up the scan", "To keep the clock accurate"],
      answer: 1,
      explain: [
        "Audit trails are a different feature.",
        "Correct. It catches runaway logic such as an endless loop.",
        "It has no effect on speed.",
        "Clock accuracy is unrelated."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers Common Procedures (1756-PM001)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers I/O and Tag Data (1756-PM004)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm004_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Studio 5000 Logix Designer Online Help", url: "https://www.rockwellautomation.com/en-nl/docs/studio-5000-logix-designer/37-00/contents-ditamap.html", type: "docs", source: "Rockwell Automation" }
  ]
});
