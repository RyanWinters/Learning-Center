LC.lesson({
  id: "persp-hphmi",
  title: "High-Performance HMI and ISA-101",
  track: "persp",
  minutes: 30,
  level: 3,
  prereqs: ["persp-styles"],
  tags: ["hmi", "isa-101", "high-performance", "alarms", "style classes", "design"],
  summary: "Why the best operator screens are mostly grey, how ISA-101 organizes displays into four levels, and how to build and defend the approach in Perspective.",
  objectives: [
    "Describe where High-Performance HMI came from and what problem it targets",
    "Explain the ISA-101.01 lifecycle and the four-level display hierarchy",
    "Design an analog indicator with normal range, limits and a trend cue instead of a bare number",
    "State the color reservation rules and why they work",
    "Implement the palette and indicators in Perspective with style classes",
    "Make a practical case to operators and managers who want bright, busy screens"
  ],

  body: `
## What it is and why you care

{{term:hp-hmi|High-Performance HMI}} (HP HMI) is a way of designing operator screens so that a person can notice an abnormal condition early, understand it, and act correctly. It is not a graphics style. It is a set of rules derived from human-factors research, and it is now codified in {{term:isa-101|ISA-101}}. If you build Perspective screens for process plants, customers will increasingly ask for "ISA-101 compliant" displays, and the habit of drawing a colorful P&ID with spinning fans and fast animation is the thing you are being asked to stop doing.

The central claim is simple. A traditional graphic is busy all the time, so abnormal conditions do not stand out. An HP HMI is deliberately quiet during normal operation, so the abnormal thing is the only thing that has color.

## Where it came from

In the 1990s a group of operating companies and a control vendor formed the {{term:asm-consortium|ASM Consortium}} (Abnormal Situation Management) to study why major incidents and costly upsets kept happening even with plenty of instrumentation and alarms. Their research pointed at the operator interface and at operator situation awareness. Bill Hollifield and co-authors later distilled the practical guidance in *The High Performance HMI Handbook*, which gave the industry concrete design rules: grey backgrounds, sparing color, analog indicators with context, and a display hierarchy. ISA then wrote the consensus standard.

## ISA-101.01 in one page

ANSI/ISA-101.01-2015 covers the philosophy, design, implementation, operation and maintenance of HMIs for process automation. It is a **lifecycle**, not just a graphics guide:

| Stage | What you produce |
|---|---|
| Philosophy | Principles and goals for this site's HMIs |
| Style guide | The rules: colors, symbols, naming, navigation, alarm presentation |
| Toolkit | Reusable objects and templates that follow the style guide |
| Design | Displays built from the toolkit, reviewed by operators |
| Implementation | Testing and operator training |
| Operation and maintenance | Change control so displays don't drift |

The deliverable that matters most for an integrator is the **style guide plus toolkit**. Everything else follows from consistent reusable parts. In Perspective that toolkit is your style classes, theme variables and a library of parameterized symbols ({{lesson:persp-library}}).

## The four-level display hierarchy

A {{term:display-hierarchy|display hierarchy}} gives progressive exposure of detail. An operator should not need a flat set of P&ID pages to find out what is wrong.

{{diagram:levels}}

| Level | Purpose | Example |
|---|---|---|
| **1 Overview** | Whole area at a glance: key KPIs, summary of abnormal conditions. Often on the big screen | Plant overview with the 10 most important indicators |
| **2 Unit control** | Run one unit: see and act in one place, with trends and the controls to respond | Reactor R-101 with temperature, pressure, feed and cooling |
| **3 Detail** | Equipment or loop detail: faceplate-level data, interlocks, P&ID-like views | Pump P-101 detail with permissives |
| **4 Support** | Diagnostics, help, procedures, tuning, maintenance data | Calibration data, device diagnostics |

Level 1 is for knowing whether anything needs attention. Level 2 is where most real operating happens. Levels 3 and 4 are for investigation and are visited rarely.

## Color and the rules that follow

**Grey backgrounds.** Neutral light grey (or dark grey for dim control rooms) lets color carry meaning. Black backgrounds with neon colors fatigue eyes and make every item compete.

**Color is reserved for abnormal.** Normal equipment and values are drawn in grey tones. Red, yellow, orange and magenta are used only for alarm priority and abnormal states, and each has one meaning on every screen. If green means "running" on one display and "OK" on another and "valve open" on a third, it means nothing. Many HP HMI schemes avoid green and red for plain state (running or stopped) because it clashes with alarm colors and with red-green color blindness. Instead they use shape, position and text.

**Redundant coding.** Alarm priority must be shown by more than color: a shape or number, so it works for colorblind operators and in poor light.

**Consistency.** The same object always looks the same, and the same alarm color always means the same priority. This is where the {{term:persp-theme|theme}} and style class discipline from {{lesson:persp-styles}} pays off.

## Analog indicators beat digits

A number such as \`72.4\` tells the operator nothing until they remember the normal range. An {{term:analog-indicator|analog indicator}} shows the value on a scale with context:

- The **normal operating range** is marked (a shaded band).
- **Alarm limits** are visible tick marks, so distance to the limit is visible.
- The **setpoint** is marked on the scale.
- A **trend cue** (a small sparkline or rate arrow) shows direction.
- The value is still printed for exactness.

At a glance the operator sees "near the high limit and climbing" without reading. A screen of 40 bare numbers has to be read one by one. A screen of 40 bars with their normal bands shows the one that is off.

> [!example] Reading 72.4
> Two reactors both show 72.4 degrees. Reactor A has a normal band of 65 to 80 and a high alarm at 90. Reactor B has a normal band of 40 to 60 and a high alarm at 75. A digit reads the same on both. The indicators make it obvious that A is fine and B is already out of band and near its alarm.

## Situation awareness

{{term:situation-awareness|Situation awareness}} has three levels: perceive the elements, comprehend what they mean, and project what happens next. HP HMI targets all three. Quiet screens help perception. Context (bands, limits, trends) helps comprehension. Trends, rate cues and predicted values help projection. Analytical studies by ASM and others reported better detection of abnormal situations and faster response with HP-style displays, though results vary by study and site, so treat specific percentages with caution.

## Applying it in Perspective

1. **Set theme variables**: \`--hmi-bg\`, \`--hmi-equipment\`, \`--hmi-text\`, \`--hmi-alarm-low\`, \`--hmi-alarm-medium\`, \`--hmi-alarm-high\`.
2. **Create meaning-named style classes**: \`hmi/value\`, \`hmi/value-alarm-high\`, \`hmi/equipment\`, \`hmi/equipment-abnormal\`.
3. **Drive classes from state, not colors from scripts**: bind \`props.style.classes\` to an expression of the alarm state. No scripts.
4. **Build the analog indicator once** as a parameterized embedded view (tag path, range, normal band, limits as params) and reuse it everywhere. Drive the band and limit positions from the tag's engineering and alarm configuration where possible, so the screen cannot disagree with the alarm system.
5. **Make level 1 reflect alarms**: an alarm summary at the top (a docked view, see {{lesson:persp-navigation}}) and area summaries that go from grey to colored on abnormal.
6. **Keep animation out of normal operation**. Motion draws the eye, so spend it on abnormal states only.

\`\`\`text
// props.style.classes expression for a pump symbol
if({[default]P101/Alarm/HighHigh}, "hmi/equipment-alarm-high",
 if({[default]P101/Alarm/High}, "hmi/equipment-alarm-medium",
  "hmi/equipment"))
\`\`\`

## How to win the argument

Operators who want bright colors are usually reacting to a real thing: the old screens had information, and grey looks like information was removed. A few tactics:

- **Do not argue taste. Test it.** Run a simple trial: seed an abnormal condition on an old screen and a new one and time how long operators take to spot it. Real numbers beat opinions.
- **Keep the information, change the presentation.** Show them the old P&ID value is still there, now with its normal band.
- **Involve operators in the style guide.** ISA-101 expects it. People defend what they helped design.
- **Preserve what works.** If operators rely on a specific layout, keep it at Level 2 and clean up color and indicators first.
- **Explain the color budget.** Red means "act now." If a dozen things are always red or green, red cannot mean that.
- **Roll out gradually with training** and keep a way to give feedback. Revise the style guide through change control.

> [!why] The color budget
> Think of color as a limited budget. Every non-alarm use of red or yellow spends it. When the screen is quiet, one red box is unmissable. When ten things are red as part of normal decoration, an alarm is lost in them.
`,

  eli5: `
Imagine you are watching a crowd of people all dressed in grey, and one person walks in wearing a bright red jacket. You spot them instantly. Now imagine the same crowd, but everyone wears a different bright color. You would have to look at every person to find the one you were told to watch.

A high-performance screen works like the grey crowd. Everything that is fine looks calm and similar, and the color only shows up when something needs your attention.

Numbers are another example. If someone just tells you "seventy-two," you do not know whether that is good or bad. If they show you a thermometer with a green zone marked on it and the line sits right at the top of the zone, you know straight away. That is why these screens use gauges with the safe zone drawn on them instead of plain digits.

The people who invented this studied why workers missed problems on busy, colorful control screens, and found that calm screens made the problems easier to see.
`,

  why: `
**Why it exists.** Operators watch hundreds or thousands of values, and most of the time nothing is wrong. Human attention is poor at monitoring for rare events in a busy field. The research behind HP HMI says the fix is not to make operators try harder but to change the display so that the rare event creates a large visual contrast. Quiet is a feature.

**Why digits fail.** A number has no context. To know if 72.4 is fine, the operator must remember the limits for that tag, and with thousands of tags nobody does. Putting the range on the display moves that knowledge from the operator's head into the screen. In an upset, when stress is high and memory worst, the screen does the remembering.

**Why color is rationed.** Color works by contrast. If color is also used for decoration, equipment states and branding, the contrast that alarms need is gone. Rationing also keeps alarm color consistent with the {{lesson:ign-alarming}} priorities, so the screen and the alarm system tell the same story.

**Tradeoffs and criticism.** Grey screens look unfinished to some customers and to some operators trained on color P&IDs, and training takes time. Some find a strict "no green" rule awkward when a plant standard already says green is running. Teams also disagree on how many levels they need for small plants, and on whether to keep process flow cues at all. The standard allows site-specific style guides. What it requires is that the guide exist, be followed and be maintained.

**Failure story to remember.** A project converts an old HMI to Perspective and carries over the colors. Within a year, new engineers add a few more colored items per screen, "just this once." Five years on, alarm color means nothing. A style guide with change control is what prevents that drift.
`,

  history: `
The ASM Consortium formed in the 1990s to study abnormal situations in process plants, and its human-factors findings fed what became High-Performance HMI. Bill Hollifield and co-authors published *The High Performance HMI Handbook* in 2008, turning the research into design rules. ISA published ANSI/ISA-101.01 in 2015 as the consensus standard for process HMIs, with a technical report on usability and performance that followed, and the standard has been taken up for adoption as an IEC standard (IEC 63303).
`,

  examples: [
    {
      title: "Level 2 unit display for a heat exchanger",
      body: `Equipment is grey line art. Outlet temperature shows as a bar with a shaded normal band of 55 to 65 degrees C, a high alarm tick at 72, a setpoint marker at 60 and a small trend. The value reads 68.1, outside normal, no alarm yet. The bar's marker turns amber with a "H" shape cue only when the value leaves the normal band. Nothing else on the screen has color, so the amber is the first thing seen.`
    },
    {
      title: "Drift audit",
      body: `Before a 2-year review, export the project and count components that set an inline color or use a color class not in the style guide. A count above zero means the toolkit is being bypassed. Fix the cases, or amend the guide through change control if the need is real.`
    }
  ],

  diagrams: {
    levels: `<svg viewBox="0 0 640 250" role="img" aria-label="Four-level display hierarchy from overview at the top to support displays at the bottom">
  <defs>
    <marker id="persp-hp-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box-accent" x="150" y="14" width="340" height="44" rx="4"/>
  <text class="dg-title dg-mid" x="320" y="34">Level 1: Overview</text>
  <text class="dg-text-muted dg-mid" x="320" y="50">is anything abnormal?</text>
  <rect class="dg-box-accent" x="110" y="68" width="420" height="44" rx="4"/>
  <text class="dg-title dg-mid" x="320" y="88">Level 2: Unit control</text>
  <text class="dg-text-muted dg-mid" x="320" y="104">act and see the response</text>
  <rect class="dg-box" x="70" y="122" width="500" height="44" rx="4"/>
  <text class="dg-title dg-mid" x="320" y="142">Level 3: Detail</text>
  <text class="dg-text-muted dg-mid" x="320" y="158">equipment, loops, interlocks</text>
  <rect class="dg-box" x="30" y="176" width="580" height="44" rx="4"/>
  <text class="dg-title dg-mid" x="320" y="196">Level 4: Support</text>
  <text class="dg-text-muted dg-mid" x="320" y="212">diagnostics, help, procedures</text>
  <text class="dg-text-muted" x="30" y="242">Fewer screens, visited often (top)</text>
  <text class="dg-text-muted" x="400" y="242">More screens, visited rarely (bottom)</text>
</svg>`
  },

  pitfalls: [
    "Carrying the old colorful P&ID look into Perspective and calling it ISA-101.",
    "Using red and green for plain equipment state, which burns the alarm color budget and fails for color-blind operators.",
    "Showing bare numbers with no normal range or limits.",
    "Defining analog bands in the screen that differ from the alarm configuration, so the display and the alarm system disagree.",
    "Skipping the style guide and change control, so the display drifts back to rainbow within a year.",
    "Animating normal equipment, so motion no longer signals trouble."
  ],

  keyTerms: ["hp-hmi", "isa-101", "asm-consortium", "display-hierarchy", "situation-awareness", "analog-indicator", "style-class"],

  quiz: [
    {
      q: "A plant standard uses green for 'running' and red for 'stopped' on every pump. An HP HMI reviewer objects. What is the strongest reason?",
      options: ["Green is too bright for LCDs", "Using alarm colors for normal state spends the contrast alarms need, and it fails for red-green color blindness", "ISA-101 forbids all color", "Pumps should never be displayed"],
      answer: 1,
      explain: [
        "Brightness is not the core objection.",
        "Correct. If red and green mark everyday states, a real alarm color no longer stands out, and the pair is a problem for color-blind users.",
        "ISA-101 does not forbid color. It reserves it for meaning.",
        "Displaying equipment is fine."
      ]
    },
    {
      q: "Which level of the display hierarchy is where operators do most real-time operating, seeing and acting in one place?",
      options: ["Level 1", "Level 2", "Level 3", "Level 4"],
      answer: 1,
      explain: [
        "Level 1 is the overview used to see whether anything needs attention.",
        "Correct. Level 2 shows one unit with its controls and trends together.",
        "Level 3 is detail for investigation.",
        "Level 4 holds support and diagnostic displays."
      ]
    },
    {
      q: "Why is an analog indicator with a normal band better than a digit for an operator under stress?",
      options: ["It looks more modern", "It uses less Gateway memory", "It moves the knowledge of normal and limits from the operator's memory into the display", "Digits cannot be read in Perspective"],
      answer: 2,
      explain: [
        "Appearance is not the reason.",
        "Resource use is not the argument for it.",
        "Correct. The operator sees distance to the limit and direction without recalling ranges for thousands of tags.",
        "Digits can be read. They just lack context."
      ]
    },
    {
      q: "You implement an HP HMI in Perspective. What is the best way to color a pump symbol by alarm state?",
      options: ["A script computes a hex color on each change", "An expression binding on the style classes property chooses a meaning-named class", "Separate views for each color", "Inline background color typed on each pump"],
      answer: 1,
      explain: [
        "That scatters color decisions in scripts and defeats the style guide.",
        "Correct. Data selects the class, and the class (one definition) decides the look, so the palette changes in one place.",
        "Views aren't the unit of styling and would multiply maintenance.",
        "Inline colors across all pumps are exactly the maintenance problem classes avoid."
      ]
    },
    {
      q: "An operator says the grey screens look like information was removed. What is the most effective response?",
      options: ["Tell them the standard requires it", "Switch back to bright colors", "Show that the values are still there, now with context, and run a side-by-side test of how fast an abnormal condition is spotted", "Remove the old screens so there is no choice"],
      answer: 2,
      explain: [
        "Appeal to authority does not address their concern and breeds resentment.",
        "That abandons the design goals.",
        "Correct. It respects the concern, shows the information is kept, and uses evidence.",
        "Forcing the change without buy-in tends to fail."
      ]
    },
    {
      q: "What does ISA-101.01 treat as more than a graphics guide?",
      options: ["A color palette only", "A lifecycle: philosophy, style guide, toolkit, design, implementation and maintenance", "A list of approved fonts", "A Perspective-specific API"],
      answer: 1,
      explain: [
        "Color is only one part.",
        "Correct. The standard covers the whole HMI lifecycle, including keeping it consistent over time.",
        "Fonts are a small part of a style guide.",
        "ISA-101 is vendor-neutral and says nothing about Ignition."
      ]
    }
  ],

  resources: [
    { title: "ISA-101.01, Human Machine Interfaces for Process Automation Systems (InTech)", url: "https://www.isa.org/intech/2020/september-october/isa-101-01-human-machine-interfaces-for-process-au", type: "article", source: "ISA" },
    { title: "ISA-101 Series of Standards", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards", type: "standard", source: "ISA" },
    { title: "System Integration: The high performance HMI (InTech, Hollifield)", url: "https://ww2.isa.org/standards-publications/isa-publications/intech-magazine/2012/december/system-integration-the-high-performance-hmi/", type: "article", source: "ISA" },
    { title: "Guidelines for Optimizing HMI Usability and Performance", url: "https://www.isa.org/news-press-releases/2019/august/guidelines-for-hmi-usability-and-perfromance-isa", type: "article", source: "ISA" },
    { title: "The Four Pillars of Operator Performance", url: "https://www.isa.org/intech-home/2023/2023-february-2023/features/four-pillars-operator-performance", type: "article", source: "ISA" },
    { title: "Creating and Using Custom Perspective Themes (Ignition 8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/styles/creating-and-using-custom-perspective-themes", type: "docs", source: "Inductive Automation" }
  ]
});
