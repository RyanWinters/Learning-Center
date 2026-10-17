LC.lesson({
  id: "int-fds",
  title: "Writing a functional design specification",
  track: "int",
  minutes: 25,
  level: 3,
  prereqs: ["int-lifecycle"],
  tags: ["FDS", "specification", "control narrative", "alarms", "interlocks", "traceability", "scope"],
  summary: "The FDS is the contract between what the customer imagines and what you build. Learn the structure, write a control narrative a programmer and an operator can both use, and tie every sentence to a test.",
  objectives: [
    "State who reads an FDS and what each reader needs from it",
    "Lay out an FDS with a repeatable structure that scales from a single skid to a plant",
    "Write a control narrative and a sequence description with explicit states and transitions",
    "Specify alarms, interlocks and HMI requirements so they can be built and tested without guessing",
    "Trace each requirement to a test and use the FDS to hold the scope line"
  ],

  body: `
## What an FDS is for

A {{term:fds|functional design specification}} describes what the finished control system will do, in terms an operator, a process engineer and a programmer all read the same way. It sits between the customer's {{term:urs|URS}} (what we need) and the detailed design (how it is wired and coded). If the {{lesson:int-lifecycle}} lesson is the map, the FDS is the single most valuable document on it: the customer signs it, the programmers build from it, the testers write {{term:fat|FAT}} from it and the project manager defends scope with it.

You already know how a plant is supposed to behave. The new skill is writing that behavior down so precisely that a stranger could build it without phoning you.

## Audience

| Reader | What they look for |
|---|---|
| Customer operations | "Does it run the way we run the plant?" |
| Customer process / engineering | Setpoints, sequences, interlocks match the process design |
| Customer IT / maintenance | Interfaces, diagnostics, backups |
| PLC and HMI programmers | Unambiguous logic, states, ranges, units, tag names |
| Test engineers | Statements that can be checked, with numbers |
| Project manager | A boundary for scope and a basis for change orders |

Write for the programmer and the operator at once. If a sentence needs the author in the room to explain it, rewrite it.

## A structure that works

Templates vary by company, and many customers (pharma, water utilities, large owners) impose theirs. A sound default:

1. **Introduction**: purpose, scope, definitions, referenced documents (URS, P&IDs, I/O list, vendor manuals).
2. **System overview**: architecture drawing, network, hardware list, software platforms, interfaces to other systems.
3. **General requirements**: modes (Auto, Manual, Maintenance), user roles and security, time sync, power-fail behavior, naming standard.
4. **Equipment and control module descriptions**: one subsection per equipment type (motor, valve, PID loop), written once and reused.
5. **Area / unit control narratives**: one section per process unit.
6. **Sequences**: step-by-step with states.
7. **Alarms and events**: list or table with priorities and setpoints.
8. **Interlocks and permissives**: table.
9. **HMI requirements**: screens, navigation, faceplates, trends, reports.
10. **Interfaces**: historian, database, MES or ERP, third-party PLCs.
11. **I/O and tag references**: pointer to the {{term:io-list|I/O list}} and tag list, not a copy of them.
12. **Test traceability**: matrix from requirement to FAT and SAT step.
13. **Appendices**: revision history, open items, assumptions.

Number every section and, better, every requirement (for example 4.2.3). Numbers are how tests and change orders point back to the text.

## Control narratives

A {{term:control-narrative|control narrative}} describes how a piece of the process is controlled in operating language. It answers: what does the operator see, what does the system do automatically, what happens when something goes wrong. Keep these habits:

- Use **shall** for binding statements and keep other words for explanation. "The pump shall start when level exceeds 70 percent."
- Give **numbers and units** for every threshold, delay and rate. Not "high level," but "above 80 percent (LT-101), delay 5 s."
- Refer to equipment by **tag**, from the P&ID: P-101, LT-101, XV-201.
- Say what happens in each **mode** (Auto, Manual, Out of Service).
- Say what happens on **failure**: bad instrument quality, loss of communication, power restoration.
- Put one behavior in one place. If level control is described in three sections, they will drift apart.

> [!example] Control narrative excerpt: Transfer Pump P-101 (Tank T-100 level)
> **4.2.1 Modes.** P-101 shall have modes Auto, Manual and Out of Service, selectable from the pump faceplate by users with role Operator or higher. Out of Service requires Supervisor.
>
> **4.2.2 Auto operation.** In Auto, P-101 shall start when T-100 level (LT-100) rises above 70 percent for 5 seconds and shall stop when level falls below 30 percent for 5 seconds. A restart shall not be allowed for 120 seconds after a stop.
>
> **4.2.3 Permissives.** P-101 shall start only if (a) discharge valve XV-101 is confirmed open, (b) suction pressure PT-100 is above 0.5 bar, and (c) no P-101 fault is active.
>
> **4.2.4 Trips.** P-101 shall stop immediately if LT-100 falls below 10 percent (LSLL-100), or if XV-101 leaves its open position while running. A trip shall latch until reset by the operator after the cause clears.
>
> **4.2.5 Failure behavior.** If LT-100 has bad quality, P-101 shall stop, alarm PAL-1004 shall annunciate at Priority High, and Auto shall be prevented until quality is good for 10 seconds.
>
> **4.2.6 Manual.** In Manual, the operator may start and stop P-101 from the HMI. The trips in 4.2.4 remain active in Manual.

Notice what it does: every statement is checkable. A test engineer can force LT-100 to 69, 71, 29 and 9 percent and see what happens. A programmer can write the logic. The line about trips in Manual stops a debate that would otherwise surface at SAT.

## Sequence descriptions with states

A sequence (fill, heat, hold, drain, CIP, a startup) should be described as a state machine: a list of states, what each state does, and the transition conditions between them. A table prevents ambiguity. See {{lesson:plc-state-machines}} for how this maps to code.

| State | Actions (outputs) | Transition | Next |
|---|---|---|---|
| 0 Idle | All outputs off | Start command and permissives OK | 10 |
| 10 Fill | Open XV-201, run P-201 | LT-200 above 80 percent | 20 |
| 10 Fill | (timeout) | Fill step longer than 600 s | 90 Fault |
| 20 Heat | Open steam valve per TIC-200 | TT-200 at or above 60 C for 30 s | 30 |
| 30 Hold | Maintain 60 C | Hold timer 1800 s | 40 |
| 40 Drain | Close steam, open XV-202 | LT-200 below 5 percent | 0 Idle |
| 90 Fault | All outputs safe, alarm | Operator reset and causes clear | 0 Idle |

Every state needs an exit for the unhappy path: timeouts, aborts, holds. State what happens on Stop, Hold and power loss, and say whether the sequence resumes or restarts. Where the plant is batch oriented, align the vocabulary with {{lesson:plc-isa88-packml}} and {{lesson:mes-batch}}.

{{diagram:trace}}

## Alarms, interlocks and HMI

### Alarm list

Do not write "alarm on high level." Use a table with a row for each alarm.

| Tag | Description | Condition | Delay | Priority | Operator action |
|---|---|---|---|---|---|
| LAH-100 | T-100 level high | LT-100 above 85 percent | 5 s | Medium | Check P-101 and downstream valves |
| LAHH-100 | T-100 level high-high | LT-100 above 95 percent | 2 s | High | Stop feed, investigate |
| PAL-1004 | LT-100 bad quality | Quality not good | 3 s | High | Check transmitter and wiring |

The operator action column forces the author to justify the alarm. An alarm with no action is a candidate for deletion. See {{lesson:int-alarm-mgmt}} for the full rationalization process.

### Interlocks

List each interlock with the condition, the action, whether it is hardwired or software, whether it latches and how it resets. Separate **process interlocks** (software, in the PLC) from **safety interlocks** (a safety PLC or hard-wired relay, covered by {{lesson:plc-safety}}). The FDS should say plainly which is which. A safety function that is described only as an interlock in the FDS can end up as plain PLC code, and that is a real hazard.

### HMI requirements

Specify what the operator must be able to do and see, then leave pixel art to the design phase. Typical items: a screen list with navigation hierarchy, one standard faceplate for each equipment type, trend pens and default time spans, alarm banner behavior, security role for each command, and reports with their columns and schedule. Refer to the customer's style guide or {{lesson:persp-hphmi}} when one applies.

## I/O list and tag references

The FDS should not copy the I/O list, since two copies drift. It should reference the controlled document by number and revision, and state the naming standard so tags can be understood from the text. Equipment in the narrative uses the same tags as the list. See {{lesson:found-pid-docs}} and {{lesson:int-naming}}.

## Traceability to tests

Give each requirement an ID and build a matrix that maps ID to design item and to test step. A short table is enough.

| Req | Text (short) | Design | FAT step | SAT step |
|---|---|---|---|---|
| 4.2.2 | Auto start at 70 percent for 5 s | P101_Ctl AOI | FAT-14 | SAT-09 |
| 4.2.3 | Start permissives | P101_Ctl AOI | FAT-15 | SAT-10 |
| 4.2.4 | Latched trip at 10 percent | P101_Ctl AOI | FAT-16 | SAT-11 |

A requirement with no test is a promise you cannot prove. A test with no requirement is an opinion. Both create disputes.

## How a good FDS prevents scope creep

Scope creep happens when "what we agreed" is fuzzy. A sharp FDS gives you:

- **A baseline.** A request is either in a numbered section or it is not.
- **A shared language.** "Shall" statements with numbers leave less room for "I assumed it would...".
- **A review gate.** Customer comments and the signature happen before build, when changes are cheap.
- **An exclusions section.** State what is out of scope (for example, "no modification of the existing boiler controls").
- **A revision history.** Changes after sign-off appear as revisions tied to {{term:change-order|change orders}}.

Review the FDS with the people who will run the plant, not only the engineer who signs it. The operator who says "we never run it that way" in week 3 saves a change order in week 12.
`,

  eli5: `
Imagine you are hiring someone to build a robot butler. If you just say "make it help around the house," you might get a robot that carries soup in a bucket. So you write a detailed instruction sheet. "When the doorbell rings, walk to the door within 10 seconds. If a stranger is there, ask their name and do not open the door. If the person is on the family list, open it."

That sheet is the functional design specification. It says exactly what the robot should do in each situation, with numbers and names, so nobody has to guess. It also lists what happens when things go wrong ("if the battery is under 10 percent, go to the charger and stop everything else").

Because the sheet is detailed, you can test the robot afterward by going down the list one line at a time. It also helps when someone asks for a new trick halfway through. You can point at the sheet and say "that is not on it, so it costs extra." It keeps everybody honest and friendly.
`,

  why: `
**Why write it before building?** Because a misunderstanding costs almost nothing on paper and a fortune in code and rewiring. The customer's process engineer reading a sequence table will catch "you forgot the drain valve" in ten minutes. Finding it at SAT costs days.

**Why so specific?** Vague language is a loan the customer takes out against your future hours. "The system shall be easy to use" cannot fail a test and cannot be built, so the argument happens at acceptance. Numbers, tags and states can be tested. Experienced integrators write requirements as if a hostile reader had to prove them wrong.

**Why separate the FDS from the URS and the detailed design?** The URS belongs to the customer and describes goals. The FDS commits the integrator to behavior. Detailed design describes implementation and can change without touching behavior. If you put code structure in the FDS, every refactor becomes a customer approval. If you leave behavior out of it, the programmer decides, and the customer finds out at FAT.

**What do people argue about?** Length and level of detail. Some teams write 200 pages and nobody reads them. Others write ten and spend the project in meetings. A decent rule: be detailed where being wrong is expensive (sequences, interlocks, alarms, interfaces) and brief where the standard covers it (reference the equipment module description rather than repeating it for every pump). Another debate is whether the FDS should be a living document updated during the project. Most integrators freeze it at approval and track later changes as formal revisions. Updating it silently destroys its value as a baseline.

**Why traceability?** It converts an opinion contest into a lookup. When the customer says "that is not what I wanted," you open the matrix and see the requirement, the sign-off and the test they witnessed.
`,

  history: `
Specification documents for control systems grew out of large process and pharmaceutical projects where regulators and owners needed proof that a system did what was intended. In regulated industries the practice of tracing requirements to tests became formal, and many integrators carry the habit into all their work. Owner companies and CSIA-style best-practice manuals reinforced the idea that written requirements, design review and approval are the backbone of a repeatable delivery process.
`,

  examples: [
    {
      title: "Rewriting a vague requirement",
      body: `Draft: *"Tank level shall be controlled and alarmed."* Rewrite: *"4.1.1 The system shall hold T-100 level between 30 and 70 percent in Auto by starting and stopping P-101 (see 4.2). 4.1.2 LAH-100 shall alarm at 85 percent after a 5 second delay at Priority Medium. 4.1.3 LAHH-100 shall alarm at 95 percent after 2 seconds at Priority High and shall inhibit the T-100 inlet valve XV-100."* Each statement now has a number, a tag, a threshold and a test.`
    },
    {
      title: "Catching a missing failure case in review",
      body: `The operator reviewing a sequence table asks: "What if the steam valve sticks open?" The table had no over-temperature exit. The team adds a transition from Heat to Fault at 75 C, an alarm TAHH-200, and a FAT step that forces the temperature. Cost: one hour of editing before build instead of a trip during commissioning.`
    }
  ],

  diagrams: {
    trace: `<svg viewBox="0 0 640 170" role="img" aria-label="Traceability chain from user requirement to FDS clause to design item to FAT step to SAT step">
  <defs><marker id="int-fds-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="40" width="104" height="60" rx="5"/>
  <text class="dg-text-sm dg-mid" x="72" y="66">URS</text>
  <text class="dg-text-muted dg-mid" x="72" y="86">customer need</text>
  <rect class="dg-box-accent" x="146" y="40" width="104" height="60" rx="5"/>
  <text class="dg-text-sm dg-mid" x="198" y="66">FDS clause</text>
  <text class="dg-text-muted dg-mid" x="198" y="86">4.2.2</text>
  <rect class="dg-box" x="272" y="40" width="104" height="60" rx="5"/>
  <text class="dg-text-sm dg-mid" x="324" y="66">Design item</text>
  <text class="dg-text-muted dg-mid" x="324" y="86">AOI, screen</text>
  <rect class="dg-box" x="398" y="40" width="104" height="60" rx="5"/>
  <text class="dg-text-sm dg-mid" x="450" y="66">FAT step</text>
  <text class="dg-text-muted dg-mid" x="450" y="86">FAT-14</text>
  <rect class="dg-box" x="524" y="40" width="96" height="60" rx="5"/>
  <text class="dg-text-sm dg-mid" x="572" y="66">SAT step</text>
  <text class="dg-text-muted dg-mid" x="572" y="86">SAT-09</text>
  <line class="dg-line" x1="124" y1="70" x2="144" y2="70" marker-end="url(#int-fds-ah)"/>
  <line class="dg-line" x1="250" y1="70" x2="270" y2="70" marker-end="url(#int-fds-ah)"/>
  <line class="dg-line" x1="376" y1="70" x2="396" y2="70" marker-end="url(#int-fds-ah)"/>
  <line class="dg-line" x1="502" y1="70" x2="522" y2="70" marker-end="url(#int-fds-ah)"/>
  <text class="dg-text-muted" x="20" y="140">Every FDS clause has a number. Tests quote that number, so a failure points straight at the clause.</text>
</svg>`
  },

  pitfalls: [
    "Writing 'high level alarm' with no setpoint, delay, priority or operator action.",
    "Copying the I/O list into the FDS, so two versions drift apart.",
    "Describing safety functions as ordinary interlocks without saying which hardware performs them.",
    "Leaving out failure behavior: bad instrument quality, communication loss, power restoration.",
    "Putting code structure in the FDS, so every refactor needs customer approval.",
    "Updating the FDS silently after sign-off, which destroys it as a baseline."
  ],

  keyTerms: ["fds", "control-narrative", "urs", "traceability-matrix", "interlock", "io-list", "change-order", "scope-creep", "permissive"],

  quiz: [
    {
      q: "Which sentence is best suited to an FDS?",
      options: ["The pump will start when the tank is high.", "P-101 shall start when LT-100 is above 70 percent for 5 seconds, if XV-101 is confirmed open.", "The pump should be reliable and respond quickly.", "Use a Compact Logix 5380 with an AOI for the pump."],
      answer: 1,
      explain: [
        "It has no threshold, tag, delay or permissive, so a tester cannot pass or fail it.",
        "Correct. It has a tag, a threshold, a delay, a permissive and a verb ('shall') that makes it a binding requirement.",
        "'Reliable' and 'quickly' cannot be tested as written.",
        "This is an implementation choice that belongs in detailed design, not the FDS."
      ]
    },
    {
      q: "A sequence table lists Fill, Heat, Hold and Drain, each with a normal exit. What is the most important thing missing?",
      options: ["A color scheme", "Timeouts, abort and fault transitions for the unhappy path", "The PLC scan time", "The vendor's part numbers"],
      answer: 1,
      explain: [
        "Colors belong to the HMI design and have no bearing on sequence completeness.",
        "Correct. Real sequences stall, fail and get stopped. The FDS must say what the system does then.",
        "Scan time is an implementation detail.",
        "Part numbers belong in the bill of materials."
      ]
    },
    {
      q: "Why should the FDS reference the I/O list instead of copying it into an appendix?",
      options: ["The I/O list is confidential", "Two copies drift apart, and the controlled document should be the single source", "Customers do not read appendices", "The FDS must stay under 50 pages"],
      answer: 1,
      explain: [
        "Confidentiality is not the reason. The reason is document control.",
        "Correct. Reference by number and revision so there is one controlled copy.",
        "Readers might skip it, but that is not why you avoid copies.",
        "There is no such page limit."
      ]
    },
    {
      q: "Midway through the project, the customer asks for behavior that appears nowhere in the signed FDS. How does a good FDS help?",
      options: ["It lets you refuse any request", "It provides a baseline, so the request is clearly a change with a price and a revision", "It transfers the risk to the programmer", "It removes the need for FAT"],
      answer: 1,
      explain: [
        "Refusal is not the point. The point is that new work is priced and agreed.",
        "Correct. Because the baseline is numbered and signed, the extra request is visible as new scope.",
        "The FDS clarifies commitments between integrator and customer. It does not move risk onto an individual.",
        "FAT is still needed to prove the system matches the FDS."
      ]
    },
    {
      q: "What is the purpose of a requirement-to-test traceability matrix?",
      options: ["To make the FDS longer", "To show that each requirement is tested and each test comes from a requirement", "To list the project team", "To replace the P&IDs"],
      answer: 1,
      explain: [
        "Length is not a goal. Traceability adds a compact table.",
        "Correct. It exposes untested requirements and tests with no basis.",
        "That is a different document.",
        "P&IDs describe process equipment. The matrix describes requirements and tests."
      ]
    }
  ],

  resources: [
    { title: "CSIA Best Practices and Benchmark Manual (V6.1)", url: "https://controlsys.org/wp-content/uploads/2024/05/BPB-V6.1-Release.pdf", type: "standard", source: "Control System Integrators Association" },
    { title: "CSIA Best Practices Manual V6 Summary and FAQs", url: "https://controlsys.org/wp-content/uploads/2024/07/CSIA_Best_Practices_Manual_Summary.pdf", type: "article", source: "Control System Integrators Association" },
    { title: "SCADA lifecycle diagram (ISA112)", url: "https://www.isa.org/getmedia/ac809e6d-27ed-4305-b207-9813b04f43b4/ISA112_SCADA-Systems_SCADA-lifecycle-diagram_rev2020-06-15.pdf", type: "standard", source: "ISA112 committee" },
    { title: "Systems integrators add to the success of projects", url: "https://www.isa.org/intech-home/2018/november-december/departments/systems-integrators-add-to-the-success-of-automati", type: "article", source: "ISA InTech" }
  ]
});
