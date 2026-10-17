LC.lesson({
  id: "plc-organization",
  title: "Tasks, programs and routines",
  track: "plc",
  minutes: 20,
  level: 2,
  prereqs: ["plc-ladder-basics"],
  tags: ["tasks", "programs", "routines", "scan", "organization", "logix"],
  summary: "The three-level hierarchy inside every Logix controller, and how to lay a project out so the next engineer can find anything in thirty seconds.",
  objectives: [
    "Describe the Task, Program and Routine hierarchy in a Logix controller",
    "Choose between continuous, periodic and event tasks and set priorities",
    "Use program-scoped tags and program parameters instead of everything at controller scope",
    "Call routines with JSR and use MainRoutine as an index",
    "Lay out a project by area and equipment"
  ],

  body: `
## The hierarchy

Logix organizes code in three levels. A **task** decides *when* code runs. A **program** is a container of code and its private data. A **routine** is one piece of logic written in one language.

\`\`\`text
Controller
  Task (continuous or periodic or event)
    Program (scheduled in the task)
      MainRoutine   <- runs first, calls the others
      Routine       <- called by JSR
      Routine
      Program-scoped tags
\`\`\`

Every routine belongs to a program, every program is scheduled in a task, and a program can be scheduled in only one task. Understanding this chain tells you why a piece of logic runs when it does.

## Tasks: when code runs

| Type | Triggered by | Count | Typical use |
|---|---|---|---|
| **Continuous** | Runs all the time, whenever no higher-priority task needs the CPU | At most one | General logic, sequences, anything without a hard timing need |
| **Periodic** | A fixed timer (e.g. every 10 ms) | Many | Motion, PID, fast I/O, anything that needs a steady interval |
| **Event** | A defined event: a consumed tag, an EVENT instruction, a motion event | Many | Reacting to a specific trigger with low latency |

A controller can hold several tasks (the limit depends on the controller family, commonly 32 on ControlLogix 5580 and CompactLogix 5380). Check the product's documentation for your hardware.

### Priority and preemption

Each periodic or event task has a **priority** from 1 to 15. A lower number means a higher priority. A higher-priority task interrupts a lower one in the middle of its logic. The continuous task is the lowest priority of all and gets whatever time is left. Periodic and event tasks also have a **watchdog**. If a task takes longer than its watchdog, the controller raises a major fault.

> [!warning] Overlap
> If a periodic task's execution time exceeds its period, the next trigger arrives while it is still running. The controller counts this as an overlap. A few are tolerable, but a steady stream means the task is overloaded and its timing is no longer what you configured. Check task execution times in the task properties.

### Choosing a type

- Put the bulk of the logic in one **continuous** task. It is simple, and the scan covers all logic in a repeating order.
- Use a **periodic** task where the math needs fixed timing. A PID loop that assumes a 100 ms update should run in a 100 ms task, not drift with the scan.
- Reserve **event** tasks for specific needs such as a fast response to a consumed tag. Most projects need none.
- Keep the number of tasks low. Every extra task adds scheduling interactions you must reason about. Many solid projects have one continuous task and one or two periodic tasks.

Data shared between tasks has a special risk. A higher-priority task can interrupt a lower one while it is halfway through writing a multi-word value, so the reader may see half-old, half-new data. Use the program-parameter and produced-tag mechanisms, or copy a whole structure at a controlled point, when tasks exchange anything bigger than a single DINT.

## Programs

A program holds routines and **program-scoped tags**. Tags created in a program are visible only inside it, so \`Run\` in the Mixer program and \`Run\` in the Filler program are two different tags with no conflict. Tags created in the controller scope are visible to every program.

| Scope | Visible to | Use for |
|---|---|---|
| **Controller** | All programs, I/O, produced/consumed, external clients like Ignition | I/O module tags, shared data, items that must be addressable from outside |
| **Program** | The routines in that program | Internal state, timers, intermediate values |

Good practice is to default to program scope and promote to controller scope only when something else needs the tag. A smaller scope means fewer places to look when a bit misbehaves.

{{diagram:hierarchy}}

### Program parameters

Instead of reading another program's tags directly, a program can expose **program parameters**: named inputs and outputs, bound to tags in other programs or at controller scope. They make the data flow between programs explicit and visible. Parameters also give you a defined boundary so that a program can be copied and re-bound to different data. Ignition and other external clients can address them, with the program path as part of the name. See the Rockwell program-parameters manual in the resources for the exact rules.

Use parameters for what is genuinely the interface of a program, such as "Tank 2 level in, fill valve command out." Do not make every tag a parameter. It becomes an API with 300 members.

## Routines, MainRoutine and JSR

Each program has a **main routine**, named MainRoutine by default. When the task runs the program, the main routine executes first. It should do almost nothing except call other routines with **JSR** (Jump to Subroutine).

\`\`\`ladder
JSR(R01_Inputs) JSR(R10_Sequence) JSR(R20_Equipment) JSR(R90_Outputs)
\`\`\`

Treat MainRoutine as a table of contents. Reading it tells you the execution order of the whole program: inputs first, logic next, outputs last. JSR can pass input and return parameters, but most teams use program tags for this purpose and keep JSRs simple. A program may also have a **fault routine** that runs if a routine in it faults, which {{lesson:plc-faults}} covers.

> [!tip] Number your routines
> Prefix routine names with a number (R01, R10, R20). The editor sorts alphabetically, so the list in the organizer matches the order the MainRoutine calls them.

## A clean layout

Here is a layout for a small packaging line with a mixer area and a filler area. It uses one continuous task for the process logic and one periodic task for fast PID.

\`\`\`text
Controller: Line1_PLC
  Task: MainTask (continuous)
    Program: Common
      MainRoutine, R01_Inputs, R90_Outputs, R95_Diagnostics
    Program: Area10_Mixer
      MainRoutine, R10_Sequence, R20_Pumps, R30_Valves, R40_Analogs
    Program: Area20_Filler
      MainRoutine, R10_Sequence, R20_Conveyors, R30_Fillers
  Task: Fast_100ms (periodic, priority 5)
    Program: Loops
      MainRoutine, R10_Mixer_Temp_PID, R20_Mixer_Level_PID
  Data types: Motor, Valve, AnalogIn, PID_Loop
  Add-On Instructions: AOI_Motor, AOI_Valve, AOI_AnalogIn
\`\`\`

The pattern is: tasks by timing need, programs by physical area or machine, routines by function inside the area. The equipment is represented by UDT tags, and the routines call AOIs to operate them. Someone who has never seen the project can answer "where is the Mixer pump 2 logic?" from the names alone: Area10_Mixer, R20_Pumps.

Some integrators split further, one program per major piece of equipment (a pump station, a tank). That scales well for copies of the same unit, since a program can be duplicated. The cost is more programs to manage. Choose by how many copies you expect.

Keep these rules and the project stays tidy:

1. One area or machine per program.
2. Hardware I/O tags and mapping live in one place (the Common program), and the rest of the code works on named data.
3. Each routine does one job and fits on a few screens.
4. Use descriptions on tags and rung comments on non-obvious logic. They are what a new engineer reads first.

## The scan, in this structure

For a continuous task, the controller runs each scheduled program in order, runs each program's main routine, then processes communications and housekeeping, then repeats. Periodic and event tasks preempt it. That is why the order of programs in the task, the order of JSRs, and where you read inputs and write outputs all affect behavior. For a deeper look at input and output timing, see {{lesson:plc-scan}}.
`,

  eli5: `
Picture a school. The **bell schedule** is the task: it says when each class happens. One class runs whenever nothing urgent is on (that's continuous), some happen at fixed times like 9:00 sharp (periodic), and a fire drill happens whenever the alarm goes off (event). Drills win over regular classes. That's priority.

Each **classroom** is a program. It has its own whiteboard that only people in the room can see. That's program-scoped tags. The hallway notice board that everyone can read is controller scope.

Inside the classroom, the teacher has a lesson plan with a few topics: attendance, then the main lesson, then cleanup. Those are routines. The lesson plan's first page is the table of contents that says "do topic A, then B, then C." That's MainRoutine calling the others.

If you label the classrooms by subject and number the topics in order, a new teacher can walk in and know exactly where everything is.
`,

  why: `
**Why not put everything in one big routine?** It works for a demo and fails at the first change. You can't find logic, you can't reuse a piece, and two people can't edit it at once. Splitting by program and routine is what makes a project readable and testable, and it gives you natural units to copy for the second tank or second line.

**Why prefer one continuous task?** More tasks bring more preemption, more places for data to be torn, and more timing to analyze. A continuous task with a sensible scan (a few to a few tens of ms) is enough for most process and discrete work. Add a periodic task only when you can name the reason: a PID that needs a fixed sample time, or motion. Integrators who add tasks "for speed" often find that they have made the system harder to debug without making it faster.

**Why program-scope by default?** Scope is a fence. A tag at controller scope can be written by any routine in the controller, and a hundred-program project has no easy way to know who. A tag in program scope has a short list of possible writers. That cuts debugging time and lets you reuse a program in another controller without name collisions.

**The tradeoff with program scope:** Ignition and other clients must address tags with the program path (\`Program:Area10_Mixer.Pump1\`), and some teams find that awkward. Others keep all equipment UDT tags at controller scope so the HMI paths are short, and keep only internal temporaries in the program. Both are defensible. What matters is a written rule.

**Why MainRoutine as an index?** It makes the execution order readable in one glance, which is exactly the thing you need when a timing-related bug appears.
`,

  history: `
Early PLCs ran one program from the top in a single scan. The ControlLogix platform (1997) introduced the Task, Program, Routine model with multitasking and symbolic tags, in place of the single fixed program and numbered data files of the PLC-5 and SLC 500. The model borrows from general computing: tasks as units of scheduling, programs as units of organization.
`,

  examples: [
    {
      title: "A PID that needs a steady sample time",
      body: `A temperature loop is tuned for a 100 ms update. In the continuous task, the scan might take 8 ms one moment and 35 ms the next, so the PID's effective sample time wanders. Move the loop into a 100 ms periodic task (priority 5), and the PID gets a regular tick. If the task takes 12 ms to execute, it uses 12 percent of the CPU.`
    },
    {
      title: "Torn data between tasks",
      body: `A periodic task writes a 6-member structure of setpoints, while the continuous task copies it to a recipe record. The continuous task is interrupted halfway through the copy, and the record ends up with new values in the first three members and old values in the last three. Fix: have the periodic task write to a staging structure and set a 'valid' flag, or do the copy inside the same task.`
    }
  ],

  diagrams: {
    hierarchy: `<svg viewBox="0 0 640 280" role="img" aria-label="Controller containing tasks, each task containing programs, each program containing routines and program tags">
  <rect class="dg-box" x="20" y="14" width="600" height="252" rx="8"/>
  <text class="dg-title" x="34" y="38">Controller</text>
  <rect class="dg-box-accent" x="40" y="56" width="350" height="190" rx="6"/>
  <text class="dg-text" x="54" y="80">Task: MainTask (continuous)</text>
  <rect class="dg-box" x="56" y="92" width="150" height="140" rx="4"/>
  <text class="dg-text-sm" x="66" y="112">Program Area10</text>
  <text class="dg-text-mono" x="66" y="134">MainRoutine</text>
  <text class="dg-text-mono" x="66" y="152">R20_Pumps</text>
  <text class="dg-text-mono" x="66" y="170">R30_Valves</text>
  <text class="dg-text-muted" x="66" y="204">program tags</text>
  <rect class="dg-box" x="224" y="92" width="150" height="140" rx="4"/>
  <text class="dg-text-sm" x="234" y="112">Program Area20</text>
  <text class="dg-text-mono" x="234" y="134">MainRoutine</text>
  <text class="dg-text-mono" x="234" y="152">R20_Conveyors</text>
  <text class="dg-text-mono" x="234" y="170">R30_Fillers</text>
  <text class="dg-text-muted" x="234" y="204">program tags</text>
  <rect class="dg-box-warn" x="410" y="56" width="190" height="104" rx="6"/>
  <text class="dg-text" x="424" y="80">Task: Fast (100 ms)</text>
  <text class="dg-text-sm" x="424" y="100">periodic, priority 5</text>
  <text class="dg-text-mono" x="424" y="124">Program Loops</text>
  <text class="dg-text-mono" x="424" y="142">R10_PID</text>
  <rect class="dg-box-ok" x="410" y="176" width="190" height="70" rx="6"/>
  <text class="dg-text-sm" x="424" y="198">Controller-scope tags</text>
  <text class="dg-text-muted" x="424" y="218">I/O, shared data, HMI</text>
</svg>`
  },

  pitfalls: [
    "Putting every tag at controller scope, so any routine can write any bit.",
    "Adding several periodic tasks for speed, then fighting torn data and overlaps.",
    "Letting a periodic task's execution time creep up to its period.",
    "A giant MainRoutine with all the logic in it instead of an index of JSR calls.",
    "Naming programs after people or dates instead of areas and equipment.",
    "Scheduling the same logic needs in two tasks and expecting a defined order between them."
  ],

  keyTerms: ["task", "continuous-task", "periodic-task", "event-task", "program-scope", "jsr", "program-parameter"],

  quiz: [
    {
      q: "Which task type is the right home for a PID loop tuned for a steady 100 ms update?",
      options: ["Continuous task", "Event task triggered by the HMI", "Periodic task at 100 ms", "Any, because the scan is always 100 ms"],
      answer: 2,
      explain: [
        "The continuous task has a variable scan time, so the sample time drifts.",
        "An HMI trigger is irregular.",
        "Correct. A periodic task gives a regular tick.",
        "Scan time varies with the load and is not fixed."
      ]
    },
    {
      q: "Task A has priority 3 and Task B has priority 8. Both are ready. What happens?",
      options: ["B runs first because 8 is higher", "A runs first and can interrupt B", "They run at the same time on one core", "The continuous task runs first"],
      answer: 1,
      explain: [
        "A lower number is the higher priority.",
        "Correct. Priority 3 outranks priority 8 and preempts it.",
        "A single task engine does not run two tasks simultaneously.",
        "The continuous task has the lowest priority."
      ]
    },
    {
      q: "A tag called Run exists in program Mixer and in program Filler. Is this allowed?",
      options: ["Only if both are BOOL", "No, names must be unique in the controller", "Yes, if both are program-scoped tags", "Only with a prefix"],
      answer: 2,
      explain: [
        "The data type does not matter.",
        "Names must be unique within a scope, not across all programs.",
        "Correct. Each program has its own scope.",
        "A prefix is a convention, not a requirement."
      ]
    },
    {
      q: "What should MainRoutine mostly contain?",
      options: ["JSR calls to other routines in execution order", "All the program logic", "Only comments", "Only the I/O mapping"],
      answer: 0,
      explain: [
        "Correct. It works as an index of what runs and in what order.",
        "That produces one unreadable routine.",
        "Comments help but do nothing.",
        "I/O mapping belongs in a dedicated routine."
      ]
    },
    {
      q: "Two tasks exchange a 6-member structure. What risk exists?",
      options: ["None, because the controller locks structures", "A higher-priority task can interrupt mid-copy, leaving mixed old and new data", "The structure becomes read-only", "The watchdog will clear it"],
      answer: 1,
      explain: [
        "Structures are not locked across a multi-word copy by default.",
        "Correct. Preemption can happen between members.",
        "Nothing makes it read-only.",
        "The watchdog faults the task, and does not clean up data."
      ]
    },
    {
      q: "Which layout reads best to a new engineer?",
      options: ["Programs named after the engineer who wrote them", "One program with a 4,000-rung routine", "Programs by area, numbered routines by function, MainRoutine as an index", "One program per tag"],
      answer: 2,
      explain: [
        "Names should describe the plant, not people.",
        "Nothing can be found or reused.",
        "Correct. Names answer where something lives.",
        "That is far too fine-grained."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers Program Parameters (1756-PM021)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm021_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Design Considerations (1756-RM094)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm094_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Common Procedures (1756-PM001)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Ladder Diagram (1756-PM008)", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm008_-en-p.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
