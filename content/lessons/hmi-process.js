LC.lesson({
  id: "hmi-process",
  title: "Designing with operators: task analysis, style guides and testing",
  track: "hmi",
  minutes: 30,
  level: 3,
  prereqs: ["hmi-interaction", "persp-hphmi"],
  tags: ["hmi", "process", "task analysis", "style guide", "usability testing", "heuristic evaluation", "isa-101", "operators"],
  summary: "How to find out what operators actually do, write it into a style guide, test screens on real operators with real scenarios, and handle feedback and change after go-live.",
  objectives: [
    "Plan and run operator interviews and shadowing sessions, and record what you learn as a task analysis",
    "Write short personas for operator, supervisor and maintenance users and use them to decide what each screen is for",
    "Prototype on paper or in wireframes before building in Perspective",
    "Outline an HMI style guide and philosophy inside the ISA-101 lifecycle",
    "Run a heuristic evaluation using Nielsen's ten heuristics translated to HMIs",
    "Run a think-aloud, scenario-based usability test and measure time to detect an abnormal condition",
    "Turn vague feedback such as \"make it brighter\" into evidence and a decision, and manage change after go-live"
  ],

  body: `
## Screens are tools for a job you have not seen yet

You know Ignition. What you probably do not yet know is what happens at 02:40 in the control room when a batch is late and two alarms are active. The fastest way to build better screens is to find out before you draw anything. Design with operators, not for them. This lesson is a practical method, from the first interview to change control after go-live, and it fits inside the lifecycle in {{term:isa-101|ISA-101}}. It assumes you have read {{lesson:persp-hphmi}} and {{lesson:hmi-interaction}}.

{{diagram:cycle}}

## Step 1: Interview and shadow

Nielsen Norman Group describes *contextual inquiry* as watching users do their real work in their real setting and asking why they did what they did. It borrows the master and apprentice relationship: you are the apprentice. For an HMI project that means:

- **Sit a full shift with each crew** (day, night, weekend if they differ). You will see tasks that nobody mentions in an interview: the sticky note on the monitor, the paper log, the handheld radio, the phone call to the maintenance tech.
- **Ask about the last time something went wrong.** Specific stories beat opinions. "Walk me through the last time the mixer tripped."
- **Ask "what do you look at first?"** and write down the answer in the operator's words.
- **Photograph the workspace** (with permission): screens, whiteboards, notes. Workarounds are a design brief written by the operators.
- **Do not defend the old screens.** Your goal is to learn. Save design ideas for later.

> [!tip] Record vocabulary
> Keep a list of the operator's own words for equipment and states ("the big tank", "tripped on the bimetal"). Use their words on the screen, and match them to the ISA tags in the labels (LT-101 on drawings, LT101 in tags). Mismatched names are an error source.

## Step 2: Task analysis

A *task analysis* (NN/g: goals, steps, their order, where and when the task happens, and the information needed along the way) turns your notes into design input. For a process screen, for each task capture:

| Field | Example for Area10 mixing |
|---|---|
| Task | Charge Mixer 1 with base ingredient |
| Trigger | Batch scheduled, tank T101 level below charge threshold |
| Decisions | Is LT101 below minimum? Is FV101 closed? Is the recipe loaded? |
| Information needed | LT101 level, FV101 state, recipe name, M101 state |
| Actions | Open FV101, start P101 transfer, watch level |
| Frequency | Several times per shift |
| Stress | Low normally; high when charge is late and a downstream line is waiting |
| Consequences of error | Overfill (LAH-101 / LAHH-101), wasted batch |
| Who else is involved | Packaging lead, maintenance |

Sort tasks by **frequency and criticality**. Frequent and critical tasks get the best real estate and the fewest steps. Rare and critical tasks get protection (select-then-act, confirmations). Frequent and harmless tasks get speed. Rare and harmless tasks can be buried.

### Personas

Write a short persona for each role, one paragraph each. They are cheap and they stop you designing for yourself.

| Persona | Goal | Looks at | Needs from the screen |
|---|---|---|---|
| Operator (Maria, 8 years, nights) | Keep the unit in range, react early | Overview all shift, alarms, trends on demand | Calm normal state, obvious abnormal, fast path to the right faceplate |
| Supervisor (Dev) | Know whether the area will make its target | Status summary, batch progress, shift events | Summary, not detail; read-only is fine |
| Maintenance tech (Luis) | Diagnose a faulty device | Device diagnostics, run hours, fault history, comms | Detail the operator never needs, behind a role check |

Do not build one screen for all three. Build a Level 2 unit display for Maria and a different view for Luis. See the display levels in {{lesson:persp-hphmi}}.

## Step 3: Write the style guide and philosophy

ISA-101.01-2015 covers the philosophy, design, implementation, operation and maintenance of HMIs, with work processes for the lifecycle. ISA's description of the committee's working groups includes one on philosophy and style guide, and ISA published a technical report on HMI philosophy in 2022. The practical output you need is a short, written document. Keep it to a few pages that people will read:

1. **Philosophy.** What the HMI is for (situation awareness, early detection), who the users are, which standards apply.
2. **Display hierarchy.** Which levels exist and what each shows.
3. **Navigation.** Fixed positions, naming, back behavior.
4. **Color and text rules.** The palette with meaning, fonts, sizes, units format. See {{lesson:hmi-color}} and {{lesson:hmi-type-numbers}}.
5. **Object library.** Each symbol and faceplate, with states, sizes and behaviors. See {{lesson:persp-library}}.
6. **Interaction rules.** Command patterns, confirmation policy, entry limits.
7. **Alarm presentation.** How alarms look and sound, aligned to the alarm philosophy. See {{lesson:hmi-abnormal}}.
8. **Change process.** Who may change a screen, how it is tested, how it is released.

Make it executable where you can: theme tokens and named style classes in Perspective mean the guide is enforced by the library, not by reminders. Add the guide to version control next to the project.

## Step 4: Prototype cheaply

Do not open the Designer yet. A rough layout on paper, a whiteboard or a slide, with real tag names and plausible values, shows 80 percent of the layout and navigation problems in an hour. Print it, put it in front of an operator, and ask them to run a scenario by pointing: "The level just went high. What do you do?" Moving a sticky note costs nothing. Moving 40 embedded views costs a day. Once the layout survives a few paper runs, build one real Level 2 view and test it before cloning it.

## Step 5: Heuristic evaluation

Before you involve operators, review the screen yourself or with a colleague against a checklist. Nielsen's ten usability heuristics (published by NN/g, developed with Rolf Molich) are broad rules of thumb. Translated for an HMI:

| Heuristic | On an HMI screen, ask |
|---|---|
| 1. Visibility of system status | Can the operator see what every device is doing and whether data is fresh (comms, stale quality)? |
| 2. Match to the real world | Do labels use the operators' words, with units, in the same format as the P&ID? |
| 3. User control and freedom | Can they back out of a selection or a popup? Is there a revert for setpoints? |
| 4. Consistency and standards | Same object looks and behaves the same everywhere? Nav always in the same place? |
| 5. Error prevention | Are bounds enforced? Are modes gated? Is the wrong item hard to command? |
| 6. Recognition over recall | Is the information on the screen, or must the operator remember a tag or a page? |
| 7. Flexibility and efficiency | Is there a fast path for experts (shortcuts to faceplates, recent items) without hurting novices? |
| 8. Aesthetic and minimalist design | Is every item on the screen needed for a task in your task analysis? |
| 9. Help recognize, diagnose and recover from errors | Do failed commands and interlocks say what happened and what to do? |
| 10. Help and documentation | Is the key help (alarm response, interlock reasons) one tap away? |

Two or three evaluators find more than one. Rate each finding by severity (cosmetic, minor, major, critical) and keep a list.

## Step 6: Usability testing with operators

Heuristics find problems you can see. Testing finds the ones you cannot. NN/g's guidance for a qualitative usability study of a single user group is about five participants, with a facilitator who asks them to think aloud as they perform tasks. For a control room, translate that:

- **Pick 5 operators**, mix experience, include a night-shift person.
- **Write scenarios, not instructions.** "The tank level is rising and nobody has touched anything. What do you do?" Never say "click the trend button".
- **Think aloud.** Ask them to say what they see and what they expect. Stay quiet. If they ask you where something is, that is data.
- **Use the simulator**, not the live plant. You can inject the abnormal condition: a stuck valve, an analog going bad (see NAMUR levels in {{lesson:hmi-abnormal}}), a communication loss.
- **Measure.** The best single measure on a process HMI is **time to detect** an abnormal condition, then time to diagnose and time to act.

{{diagram:timing}}

Compare designs with the same operators on different scenarios of equal difficulty. If the same operator sees both designs on the same scenario, the second run is easier. Record: time to each stage, wrong clicks, hesitations, and what they said. Do not report averages from five people as statistics. Report patterns: "Four of five missed the FV101 closed state for more than a minute."

Also test **normal** work: a routine task end to end, counting steps and taps. A screen that is great at alarms but slow for routine work will lose to workarounds.

## Step 7: Managing feedback

Feedback arrives as solutions. "Make it brighter." "Put the big numbers back." "I want the old screen." Your job is to find the need behind the request, and then use evidence to decide.

| They say | Ask | Evidence to collect |
|---|---|---|
| "Make it brighter" | When and where can't you read it? Which part? | Photo or reading at the console in the real lighting, contrast measured, check for glare. May be a lighting problem or a font-size problem. |
| "Where are my numbers?" | Which numbers do you use, how often, for what decision? | Task analysis: put those specific values in context, not every value everywhere. |
| "The grey is boring" | What can't you see? | Run the detection test: does color on a quiet screen help or hurt time to detect? |
| "I don't trust it" | What did the old screen show that this one doesn't? | A side-by-side of the values they relied on. May expose a missing quality or comms indicator. |
| "Too many clicks" | Which task? How often? | Count taps for that task from your task analysis. Shorten the frequent ones. |

Never argue from taste. Offer to test it. If three operators, on the scenario you agreed, find the item as fast on the new design as the old, that is a result both sides can accept. If they do not, you found a defect in your design.

> [!warning] The loudest voice
> One strong opinion from the most senior operator can overrule five quieter ones. Collect feedback from every shift and role, and record who said what.

## Step 8: Iteration and change management

ISA-101's lifecycle runs past commissioning. ISA's description of ISA-TR101.02 mentions continuous work processes of audit, validation and management of change. In practice:

- **Version the library and the style guide.** Release notes, a test Gateway, then production. See {{lesson:persp-library}}.
- **Management of change (MOC).** Any change to a screen that affects operations goes through review. A color change, a new nav item, a moved button: each can confuse a crew. Small cosmetic changes can have a light process, but write it down.
- **Train before you deploy.** Show the crew the change, with a one-page change note, before the shift that gets it.
- **Review after 30 and 90 days.** Collect what is working, what operators work around, and how many alarms and dialogs they see. Update the guide.
- **Audit periodically** that screens still conform to the guide. Drift is normal.

## Worked example: five operators, one screen

At Meridian Plant 1, you redesign the Area10 mixing overview. You shadow day and night crews for two shifts each. You discover: operators check LT101 and the discharge valve FV101 every few minutes during a charge and write the level on a paper log. A tablet in the corner shows the Packaging line status and nobody uses it. You write a persona for Maria and Luis, and a task analysis for "charge T101". You draw a paper layout that puts T101, FV101, P101 and M101 on one screen with a 30 minute trend. Three operators run a paper scenario ("level high, who do you call?"). The layout moves the alarm banner to the top after two of them look in the wrong place. You build one Level 2 view in Perspective and test five operators on the simulator with a stuck FV101. Time to detect is measured. You write the style guide and commit it to the repo with the library.

## If you already build Perspective

- **Design time is cheaper than rework time.** An hour with a printout beats a day of rebinding.
- **Keep a decision log.** One line per design choice and the evidence behind it (observation, test result, standard). When someone asks "why is it grey?", you can answer.
- **Use the Gateway's audit and tag history as test data**, for instance to learn how often each command is used, before you decide which buttons get the best positions.
- **Test with the real client.** Operators use a panel, a thin client or a browser. Test on that device with its resolution, glare and gloves, see {{lesson:persp-mobile}}.
`,

  eli5: `
Imagine you are designing a kitchen for a restaurant, but you have never cooked in one. You could draw something pretty. But the cook will not be able to reach the salt while holding a hot pan.

So you do three things. First, you stand in a working kitchen for a few days and watch what the cooks do and what they reach for. Second, you make a cardboard model of the new kitchen and ask a cook to pretend to make an order in it. You move a shelf if they stretch for it. Third, once it is built, you ask cooks to show you how they make a few dishes, and you time how long it takes them to notice when a pot starts to boil over.

When a cook says "make the kitchen brighter", you do not just buy bigger lights. You ask where they could not see, and you check. And you write down the kitchen rules in a short sheet, so the next person who changes something follows the same rules.
`,

  why: `
**Why not just apply the rules from a book?** Rules like grey backgrounds and sparing color come from research on operators in general. They do not know that your night crew reads a paper log, or that the discharge valve on Mixer 1 sticks. The rules tell you the shape of a good answer. The operators tell you what the question is. Skipping the second half is how teams deliver technically compliant screens that crews work around.

**Why task analysis before pictures?** Because layout follows tasks. If you do not know which decisions an operator makes, how often and under what pressure, you end up putting everything on screen because everything might matter. That is how you end up with a screen full of numbers. A task analysis also gives you a defensible reason to leave things off.

**Why test with five and measure time to detect?** Qualitative testing finds the most common problems quickly, and NN/g's guidance of around five users for a single group reflects that diminishing returns set in. The measure matters because the point of a high-performance HMI is early detection of abnormal conditions. If a redesign looks great but operators do not notice the stuck valve any sooner, it has not done its job. Measuring forces the claim to be tested. Be honest about the limits: five people do not give statistics, and a simulator is not a night shift under stress.

**Why a written guide and MOC?** Screens decay. Each engineer adds a button in their own style and within two years the plant has four dialects. A style guide plus a change process is the cheapest way to keep consistency, and it makes a new engineer productive faster. The tradeoff is overhead. Keep the guide short and the process proportional to risk.

**Where people disagree.** Some argue heavily for an HMI specialist or human-factors engineer. Others say a good integrator with access to operators is enough. Some sites test every release; others only major changes. The principle is that someone outside the design team sees the screen under realistic conditions before it goes live.
`,

  history: `
Human-centered methods such as contextual inquiry and task analysis come from human factors and usability engineering, and NN/g documents them for software teams. The process industry formalized HMI practice with ISA-101.01-2015, which defines a lifecycle based on earlier ISA standards for alarm management (ISA-18.2) and safety instrumented systems (ISA-84). ISA-TR101.02-2019 added usability and performance guidance, and ISA-TR101.01-2022 addressed HMI philosophy.
`,

  examples: [
    {
      title: "From 'make it brighter' to a fix",
      body: `A night operator says the new overview is too dim. You ask when. "Around 04:00 when the sun starts hitting the window." You photograph the console then and see glare across the left monitor. The screen is not too dim, the window is. You add a blind and bump the lowest-contrast label (muted grey on grey) to a stronger tone. You re-test at 04:00. Nobody had to give up the grey background.`
    },
    {
      title: "Time to detect, before and after",
      body: `Five operators run the "FV101 stuck closed, level rising" scenario on the simulator. On the old screen the times to say "level is rising and the valve is closed" are 95, 140, 70, 180 and 110 seconds. On the redesign they are 40, 55, 30, 90 and 45 seconds. These are example numbers, five people is not a statistical sample, but the pattern and the comments ("the closed valve is the only thing with color") are what you take to the review.`
    }
  ],

  diagrams: {
    cycle: `<svg viewBox="0 0 640 270" role="img" aria-label="HMI design process: observe operators, task analysis, style guide, paper prototype, build, operator test, commission, monitor and manage change">
  <defs>
    <marker id="hmi-process-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="30" width="130" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="52">1. Observe</text>
  <text class="dg-text-muted dg-mid" x="85" y="70">interview, shadow</text>
  <rect class="dg-box" x="175" y="30" width="130" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="240" y="52">2. Task analysis</text>
  <text class="dg-text-muted dg-mid" x="240" y="70">personas, tasks</text>
  <rect class="dg-box" x="330" y="30" width="130" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="395" y="52">3. Style guide</text>
  <text class="dg-text-muted dg-mid" x="395" y="70">philosophy, rules</text>
  <rect class="dg-box" x="485" y="30" width="135" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="552" y="52">4. Paper prototype</text>
  <text class="dg-text-muted dg-mid" x="552" y="70">scenario walk</text>
  <line class="dg-line" x1="150" y1="57" x2="173" y2="57" marker-end="url(#hmi-process-ah)"/>
  <line class="dg-line" x1="305" y1="57" x2="328" y2="57" marker-end="url(#hmi-process-ah)"/>
  <line class="dg-line" x1="460" y1="57" x2="483" y2="57" marker-end="url(#hmi-process-ah)"/>
  <path class="dg-line" d="M552 84 V122 H85 V148" marker-end="url(#hmi-process-ah)"/>
  <rect class="dg-box" x="20" y="150" width="130" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="172">5. Build</text>
  <text class="dg-text-muted dg-mid" x="85" y="190">one view first</text>
  <rect class="dg-box-accent" x="175" y="150" width="130" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="240" y="172">6. Operator test</text>
  <text class="dg-text-muted dg-mid" x="240" y="190">think-aloud, timing</text>
  <rect class="dg-box" x="330" y="150" width="130" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="395" y="172">7. Commission</text>
  <text class="dg-text-muted dg-mid" x="395" y="190">train the crews</text>
  <rect class="dg-box" x="485" y="150" width="135" height="54" rx="6"/>
  <text class="dg-text-sm dg-mid" x="552" y="172">8. Monitor</text>
  <text class="dg-text-muted dg-mid" x="552" y="190">audit, manage change</text>
  <line class="dg-line" x1="150" y1="177" x2="173" y2="177" marker-end="url(#hmi-process-ah)"/>
  <line class="dg-line" x1="305" y1="177" x2="328" y2="177" marker-end="url(#hmi-process-ah)"/>
  <line class="dg-line" x1="460" y1="177" x2="483" y2="177" marker-end="url(#hmi-process-ah)"/>
  <text class="dg-text-muted" x="20" y="240">Every stage feeds back. Test findings change the prototype and the guide.</text>
  <text class="dg-text-muted" x="20" y="258">Field changes go through management of change and update the guide.</text>
</svg>`,

    timing: `<svg viewBox="0 0 640 190" role="img" aria-label="Usability test timeline: an abnormal condition is injected, then time to detect, time to diagnose and time to act are measured">
  <line class="dg-line" x1="30" y1="86" x2="610" y2="86"/>
  <circle class="dg-fill-accent" cx="60" cy="86" r="7"/>
  <circle class="dg-fill-accent" cx="230" cy="86" r="7"/>
  <circle class="dg-fill-accent" cx="400" cy="86" r="7"/>
  <circle class="dg-fill-accent" cx="570" cy="86" r="7"/>
  <text class="dg-text-sm" x="30" y="30">t0: condition injected</text>
  <text class="dg-text-muted" x="30" y="48">LT101 ramps past LAH-101</text>
  <text class="dg-text-sm" x="190" y="30">t1: operator notices</text>
  <text class="dg-text-muted" x="190" y="48">"Tank 1 level is rising"</text>
  <text class="dg-text-sm" x="360" y="30">t2: operator diagnoses</text>
  <text class="dg-text-muted" x="360" y="48">"FV101 is closed"</text>
  <text class="dg-text-sm" x="520" y="30">t3: correct action</text>
  <text class="dg-text-muted" x="520" y="48">opens FV101</text>
  <path class="dg-line-thin" d="M60 106 V116 H230 V106"/>
  <path class="dg-line-thin" d="M230 106 V116 H400 V106"/>
  <path class="dg-line-thin" d="M400 106 V116 H570 V106"/>
  <text class="dg-text-sm dg-mid" x="145" y="136">time to detect</text>
  <text class="dg-text-sm dg-mid" x="315" y="136">time to diagnose</text>
  <text class="dg-text-sm dg-mid" x="485" y="136">time to act</text>
  <text class="dg-text-muted" x="30" y="170">Same scenario type per design, different operators or order, to avoid a learning effect.</text>
</svg>`
  },

  pitfalls: [
    "Designing from the engineering office and showing operators the finished screen at commissioning.",
    "Interviewing only the lead operator or only one shift.",
    "Asking leading questions in tests (\"Would you click the trend button?\") instead of giving a scenario.",
    "Reporting five-person timing averages as if they were statistics.",
    "Accepting a requested solution (\"bigger numbers\") without finding the need behind it.",
    "Writing a 60-page style guide nobody reads, or none at all.",
    "Changing live screens without telling the crew or recording why."
  ],

  keyTerms: ["isa-101", "hp-hmi", "task-analysis", "contextual-inquiry", "hmi-style-guide", "heuristic-evaluation", "think-aloud", "persona", "hmi"],

  quiz: [
    {
      q: "You have one day before design starts. Which activity gives the most useful input for a new Area10 overview?",
      options: [
        "Review competitors' HMI screenshots",
        "Shadow the night and day crews, ask about the last time something went wrong, and photograph the workspace",
        "Send operators a survey asking which colors they prefer",
        "Draw three layouts and let the supervisor choose"
      ],
      answer: 1,
      explain: [
        "Screenshots show style, not what your operators decide and do.",
        "Correct. Observing real work in context exposes workarounds and tasks nobody mentions in a meeting.",
        "Color preference is the least important input, and a survey will not show behavior.",
        "A supervisor is not the operator, and options drawn without task knowledge are guesses."
      ]
    },
    {
      q: "In a task analysis, which task should get the best screen real estate and fewest steps?",
      options: [
        "Rare and harmless",
        "Frequent and critical",
        "Rare and critical",
        "Whatever the project sponsor mentions first"
      ],
      answer: 1,
      explain: [
        "Rare and harmless can be buried.",
        "Correct. Frequent and critical tasks drive layout and navigation.",
        "Rare and critical tasks need protection such as select-then-act, not necessarily prime space.",
        "Priorities come from task frequency and consequence, not who mentioned it."
      ]
    },
    {
      q: "An operator says, \"Make the screen brighter.\" What is the best next step?",
      options: [
        "Raise the background brightness for everyone",
        "Say the grey is part of the standard and decline",
        "Ask when and where they cannot read it, then check at that time and place for glare, contrast and text size",
        "Add a brightness slider to every view"
      ],
      answer: 2,
      explain: [
        "That may solve nothing and could harm other users and the contrast of abnormal states.",
        "Dismissing the request loses a possibly valid finding.",
        "Correct. The request is a solution. Finding the need often reveals glare or a low-contrast label.",
        "A slider adds complexity and does not address the cause."
      ]
    },
    {
      q: "Which test design best measures whether the redesign helps operators notice problems?",
      options: [
        "Ask five operators if they like it",
        "Tell operators to open the trend and describe what they see",
        "Inject a stuck-valve scenario on the simulator, ask operators to think aloud, and time how long until they notice, diagnose and act",
        "Measure how long operators stay on the overview screen"
      ],
      answer: 2,
      explain: [
        "Opinion is not performance, and operators may like something that slows them down.",
        "Instructing the path removes the thing you want to test: whether they find it unaided.",
        "Correct. A scenario with measured stages tests the claim directly and gives comments about why.",
        "Time on a screen does not tell you whether an abnormal condition was detected."
      ]
    },
    {
      q: "During a heuristic evaluation you find that a disabled Start button gives no reason. Which heuristic does this most directly violate?",
      options: [
        "Aesthetic and minimalist design",
        "Match between system and the real world",
        "Help users recognize, diagnose, and recover from errors, and visibility of system status",
        "Flexibility and efficiency of use"
      ],
      answer: 2,
      explain: [
        "Adding a reason line does not make the screen less minimal; the missing reason is the issue.",
        "Labels may be fine. The problem is lack of explanation.",
        "Correct. The operator cannot tell why the action is blocked or what to fix.",
        "Shortcuts for experts are not the issue."
      ]
    },
    {
      q: "Two months after go-live, an engineer wants to move the alarm banner to the bottom because it looks tidier. What should happen?",
      options: [
        "Make the change on the live project since it is small",
        "Reject it, because the style guide cannot change",
        "Treat it as a change: check the style guide and the evidence for the current position, test it, notify the crews and record the decision through the management of change process",
        "Ask the engineer to try it on one screen first"
      ],
      answer: 2,
      explain: [
        "Small visual changes can still confuse crews and break consistency.",
        "A style guide should be able to change, through a process.",
        "Correct. Changes need evidence, testing, communication and a record. The guide is updated if the change is accepted.",
        "One screen different from the rest creates the inconsistency the guide exists to prevent."
      ]
    }
  ],

  resources: [
    { title: "Contextual Inquiry: Inspire Design by Observing and Interviewing Users in Their Context", url: "https://www.nngroup.com/articles/contextual-inquiry/", type: "article", source: "NN/g" },
    { title: "Task Analysis: Support Users in Achieving Their Goals", url: "https://www.nngroup.com/articles/task-analysis/", type: "article", source: "NN/g" },
    { title: "10 Usability Heuristics for User Interface Design", url: "https://www.nngroup.com/articles/ten-usability-heuristics/", type: "article", source: "NN/g" },
    { title: "Usability (User) Testing 101", url: "https://www.nngroup.com/articles/usability-testing-101/", type: "article", source: "NN/g" },
    { title: "Help Users Think Aloud (video)", url: "https://www.nngroup.com/videos/think-aloud/", type: "video", source: "NN/g" },
    { title: "Qualitative Usability Testing: Study Guide", url: "https://www.nngroup.com/articles/qual-usability-testing-study-guide/", type: "article", source: "NN/g" },
    { title: "ISA-101 Series of Standards", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards", type: "standard", source: "ISA" },
    { title: "New ISA101 HMI technical report focuses on usability and performance", url: "https://www.isa.org/intech-home/2019/july-august/departments/new-isa101-hmi-technical-report-focuses-on-usabili", type: "article", source: "ISA" }
  ]
});
