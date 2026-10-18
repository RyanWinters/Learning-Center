LC.lesson({
  id: "hmi-redesign",
  title: "Workshop: redesigning a bad screen",
  track: "hmi",
  minutes: 40,
  level: 4,
  prereqs: ["hmi-process", "hmi-dataviz", "hmi-abnormal"],
  tags: ["hmi", "workshop", "redesign", "critique", "checklist", "capstone", "isa-101"],
  summary: "Find ten problems on a realistic Area10 mixing screen, then walk through an after version decision by decision, and finish with a one-page review checklist you can print.",
  objectives: [
    "Critique a screen systematically for color, rendering, numbers, units, navigation and interaction defects",
    "Explain each redesign decision by the principle behind it",
    "Redesign a unit overview so the one abnormal condition is the most visible thing on the screen",
    "Apply a review checklist to your own screens before they go to operators"
  ],

  body: `
## The job

This is a capstone, so it is a workshop, not a lecture. You get a screen that looks like many real ones, you find what is wrong with it, and then you see a rebuilt version and the reasoning for every change. The unit is the Area10 mixing line at Meridian Foods Plant 1: tank T101 with level transmitter LT101, transfer pump P101, mixer agitator motor M101 and discharge valve FV101. It builds on {{lesson:hmi-perception}}, {{lesson:hmi-layout}}, {{lesson:hmi-color}}, {{lesson:hmi-type-numbers}}, {{lesson:hmi-dataviz}}, {{lesson:hmi-abnormal}}, {{lesson:hmi-interaction}} and {{lesson:hmi-process}}, and on the four-level hierarchy in {{lesson:persp-hphmi}}.

The situation, which you will have to find on the screen: **LT101 has reached 4.7 m on a 0 to 5.0 m transmitter, above the high alarm LAH-101 at 4.5 m, because FV101 is closed and P101 is stopped.** (The 4.5 m limit is an example for this workshop. Real limits come from your alarm rationalization.) A good screen lets an operator see that in a few seconds. A bad one hides it.

## Part 1: The before screen

Spend five minutes on this before you read on. Get a pen. Write down every problem you can see, and for each one, say what an operator would get wrong because of it. There are ten that this lesson numbers, and you may find more.

{{diagram:before}}

The numbers on the screen are only to help the discussion below. Do not look at them yet. Questions to ask while you look:

- Where does your eye land first? Is that where it should land?
- What is abnormal right now? How long did it take you to find it?
- What can you touch? How do you know?
- What is each number? What is its unit, and is it good or bad?

## Part 2: The critique

Here are the ten, each with what it costs and where the fix is taught.

| # | Problem | What it costs the operator | Fix taught in |
|---|---|---|---|
| 1 | **Rainbow colors.** Yellow tank, blue liquid, green and blue pipes, red motor, all at full saturation, with no meaning behind them. | Color stops carrying meaning. When everything is colored, color cannot signal abnormal. | {{lesson:hmi-color}} |
| 2 | **Fake 3D pipes.** Double outlines, highlights and drop shadows on pipes and the button. | Ink with no information. Pipes dominate the screen and compete with data. | {{lesson:hmi-perception}} |
| 3 | **Digits everywhere.** Eight loose numbers scattered over pipes and equipment. | None of them has a label, limit or context. The operator has to read all of them to find none that matters. | {{lesson:hmi-type-numbers}}, {{lesson:hmi-dataviz}} |
| 4 | **Missing units and key value in tiny muted text.** The tank level is "4.7" in small low-contrast type on a coloured fill. | The most important number is the hardest to read, and "4.7 what?" may be metres, feet or percent. | {{lesson:hmi-type-numbers}} |
| 5 | **Alarm colors misused for state.** Red marks the running motor, green marks the stopped pump. | Red now means "healthy". The real alarm for LAH-101 is a small red chip that looks like the motor. Green for stopped hides a problem. | {{lesson:hmi-color}}, {{lesson:hmi-abnormal}} |
| 6 | **Button-as-status.** M-101 is a raised, shadowed shape that is both the indicator and the thing you press. | An operator touches it to see the state and stops the mixer. | {{lesson:hmi-interaction}} |
| 7 | **Inconsistent navigation.** Tabs are different colors and widths, one item is plain text, Back sits at the far right and Home at the far left. | The operator has to hunt, and the layout teaches nothing that carries over to other screens. | {{lesson:hmi-layout}} |
| 8 | **Inconsistent labels.** "TANK 1", "M-101", "P101", "FV 101". | Three naming styles for one numbering scheme. People search for "LT101" and cannot find it. Mapping to the drawing and tag names is slower. | {{lesson:hmi-type-numbers}}, {{lesson:persp-library}} |
| 9 | **Decorative dial.** A round gauge for FT101 with a needle, no range labels, no units, no normal band, no limit. | A dial is expensive in space and gives no context. Is the needle in a good place? | {{lesson:hmi-dataviz}} |
| 10 | **Alarm indicator lost.** A tiny "LAH" chip with no value, no priority, no time, no acknowledgement state, in the same red as the running motor. | The only abnormal thing on the screen is the least visible. This is the failure that high-performance HMI exists to prevent. | {{lesson:hmi-abnormal}}, {{lesson:persp-hphmi}} |

Other things you may have found: no trend anywhere, so there is no history to say how fast the level rose; no indication that data is fresh and the PLC is talking; the state of FV101 as a word is missing; all the equipment is the same visual weight. These are real, and they are why the after screen adds more than it removes.

> [!example] Score yourself
> Found 7 or more without help: you are reviewing like an HMI specialist. Found 4 to 6: good, use the checklist at the end to catch the rest. Found fewer than 4: re-read {{lesson:hmi-color}} and {{lesson:hmi-abnormal}} first.

## Part 3: The after screen

Here is the same unit, same data, redesigned. The same event is happening: LT101 is at 4.7 m, FV101 is closed, P101 is stopped.

{{diagram:after}}

## Part 4: Decision by decision

### 1. Start with the tasks, not the pictures

Using the method in {{lesson:hmi-process}}, the operator's top tasks for this unit are: (a) notice anything abnormal, (b) know whether the tank is filling or draining and how fast, (c) reach the faceplate for the right device in one tap, (d) see the status of the transfer path. The layout puts those in priority order. Anything that does not support a task was removed. This is Nielsen's "aesthetic and minimalist design" applied through your task analysis.

### 2. Make normal quiet and put the abnormal on top

The screen is a calm light grey. Only two things have a color: the **alarm banner** at the top and the **LT101 value box**. Because nothing else is colored, the operator's eye goes straight to them (see {{lesson:hmi-perception}} on pre-attentive attention and {{lesson:persp-hphmi}} on the reservation rules). The banner carries what the operator needs to act: the tag (LAH-101), a plain-language description, value with unit and limit, priority, time and acknowledged state, plus an Ack button sized as a real touch target (see {{lesson:hmi-interaction}}).

### 3. One alarm vocabulary

Alarm colors are used only for alarms. The running motor, stopped pump and open valve have no alarm color. The FV101 box uses a warning tone for the "closed" state because the closed valve is the cause of the problem in this scenario. Every state is also written as a word ("Stopped", "Closed", "Running") so that color is never the only carrier, which matters for color-blind operators and for people viewing on a bad panel. See {{lesson:hmi-color}} and {{lesson:hmi-abnormal}}.

### 4. Consistent navigation

The tab bar sits in the same place on every Level 2 screen. All tabs are the same size and shape. The current page is marked with the one accent. Naming follows the area (Overview, Mixing, Packaging, Alarms, Trends). There is no second way to go back that looks different. This is the "consistency and standards" heuristic and the layout rules in {{lesson:hmi-layout}}.

### 5. Flat, quiet process graphics

Pipes are single thin grey lines, vessels are outlines, no shadows or highlights. Flow direction is implied by left-to-right layout. This frees the visual budget for what changes. See {{lesson:hmi-perception}}.

### 6. Numbers get context

LT101 is shown three ways, each for a different job: a **value** with its unit and a name (4.7 m), a **position** on a tank scale from 0 to 5.0 m with the LAH limit marked, and a **trend** for the last 30 minutes with the same limit. The operator sees that the level crossed the limit and how fast it got there. FT101 is a horizontal bar with a normal band and a pointer. A bar uses less space than a dial and shows range, band and position at once. Labels use one format: tag, name, value, unit. See {{lesson:hmi-type-numbers}} and {{lesson:hmi-dataviz}}.

### 7. Status is not a command

M101, P101 and FV101 are flat status objects: name, state in words, one relevant number. None is a button. A small "Open faceplate" cue on M101 says that tapping goes to the faceplate, which is a different, labelled object type. Commands live on the faceplate (see {{lesson:hmi-interaction}}), where the equipment name is in the header and permissives and interlock reasons are explained. The faceplate for a motor follows the layout in that lesson.

### 8. Consistent names

Every label follows one pattern: ISA-style tag as in the code (LT101, FV101, P101, M101), a plain-language name, and a unit where there is a value. On drawings and loop sheets the same tags have a hyphen (LT-101), and the alarm banner uses the alarm worksheet form (LAH-101), as the plant does. One mapping, stated in the style guide.

### 9. Show that the system itself is healthy

The footer shows the user and role, the time and PLC comms state. If comms are lost, this is where the screen says its values are stale, and the values dim or show a quality indicator. A screen that cannot say "I am not sure" is a risk. See {{lesson:hmi-abnormal}}.

### 10. What we chose not to do

- No animation of the agitator or flowing pipes. Motion pulls the eye, and only an alarm should.
- No raw I/O or diagnostic numbers. Luis the maintenance tech gets them on a different Level 3 view.
- No second alarm list on the screen. The alarm summary has its own page.
- Nothing is hidden for good. Anything removed is one tap away at a lower level.

## Part 5: One-page review checklist

Use this before any screen goes to operators. The same list is in the printable file [HMI design checklist](content/files/hmi-design-checklist.md).

**Layout.** Task order drives position. Same navigation in the same place. Related things grouped. Nothing needed is more than two taps away.

**Color.** Grey base. Color only for abnormal or a defined state. No color alone carries meaning. Alarm colors are never reused. Contrast tested for the real panel and lighting.

**Text and numbers.** One font, minimum sizes met, units on every value, consistent decimals, tags match the drawings.

**Data display.** Values have range, limit or trend context. Bars and trends beat bare digits and dials. Scales start where they should.

**Abnormal states.** The abnormal condition is the most visible thing on the screen. Alarm shows tag, value, limit, priority, time and ack state. Bad quality and lost comms are visible.

**Interaction.** Status is never a button. Targets sized and spaced for gloves. Feedback shows sent and responded. Disabled controls explain why. Confirmation only where it matters. Numeric entry shows limits.

**Navigation.** Consistent, with a clear current location and a way back. Faceplates open from objects.

**Testing.** Task analysis done, heuristic review done, tested on operators with a scenario, time to detect measured, style guide updated.

> [!tip] Make it a gate
> Add the checklist to your release process. A screen is not ready for production until a second person, ideally an operator, has been through it with the list.

## Try the redesign yourself

Take the before diagram, redraw it on paper, then compare with the after version. Do not look at the after version while you draw. Then compare: where did your eye go first on each version?

## If you already build Perspective

- **Colors as tokens.** The after screen has about five meaningful colors. Define them as theme tokens and style classes, not literal values on each component, so a re-theme is one change. See {{lesson:persp-hphmi}}.
- **One state-to-style binding.** Drive color classes for equipment from one expression based on the alarm state, so green or red can never be assigned by hand to a single object.
- **Repeaters for tiles.** The status tiles for M101, P101 and FV101 come from an embedded view and a UDT path, see {{lesson:persp-embedding}}.
- **Build the banner as a reusable view** used on every Level 2 screen, so alarm presentation is identical everywhere.
`,

  eli5: `
Imagine a cluttered kitchen counter with a dozen brightly colored gadgets, labels in different handwriting, and a smoke alarm hidden behind the toaster. The toast is burning. It takes you a long time to find the problem, because everything is shouting.

Now imagine a clean counter. Everything is white and grey, in neat rows, and each item has a clear label. When the toast starts to burn, only that thing turns red, and a note next to it says "Toast too hot, 14:02, unplugged?". You see it at once.

Redesigning a bad screen is tidying the counter. You remove the decoration, make everything quiet, label things clearly, and keep color for the one thing that needs your attention. The facts on the counter are the same. It is just far easier to see the one that matters.
`,

  why: `
**Why a workshop?** Because critique is a skill and it comes from practice. Reading that "color should be reserved" is easy, and finding the red motor on a busy graphic is harder. A before and after pair trains your eye, and a checklist converts it into a repeatable habit that does not depend on talent.

**Why start from the abnormal condition?** The measure of an operator screen is what happens when something goes wrong. In normal operation almost any screen works. A redesign that looks cleaner but does not shorten the time to detect an abnormal condition has missed the point. That is why the after screen is built around one event and why the ISA-101 guidance and the ASM research behind it focus on detection and situation awareness.

**Why remove so much?** Each item you remove makes the remaining items easier to see. Experienced integrators often feel uncomfortable deleting data operators once asked for. The compromise that works is to keep the data but move it to a lower display level, where it is available for the task that needs it, and to prove the change with a test.

**Where people disagree.** Some operators like the old style and feel the new one is bland. A grey screen is meant to look bland until it matters. Some sites keep a small amount of process color for orientation (a product line, for example) as a deliberate, written exception. Some keep numeric digits next to bars. Neither is wrong, as long as the rule is written down and applied the same way everywhere, which is why the style guide in {{lesson:hmi-process}} exists.

**The honest limit.** A mockup is not a tested design. The after screen is a good hypothesis. You still need operators, a simulator and a scenario. If your test shows no gain in detection time, trust the test.
`,

  history: `
Bad screens were not made by bad people. Early graphics packages offered cheap color and the ability to copy a P&ID onto the screen, and a generation of integrators did exactly that. The Abnormal Situation Management Consortium's research from the 1990s linked such interfaces to missed abnormal conditions, and the High Performance HMI Handbook turned the findings into rules. ISA-101.01-2015 made them part of a lifecycle standard. Today the typical migration is from an old graphic to a grey, level-based hierarchy, one unit at a time.
`,

  examples: [
    {
      title: "Reading the after screen in five seconds",
      body: `Look at the after screen once. 1: the red banner says LAH-101, Tank 1 level high, 4.7 m against a limit of 4.5. 2: the level value box is the only other colored object, and the trend shows a steady climb that crossed the limit. 3: P101 says Stopped and FV101 says Closed in words. The operator now has the symptom and the likely cause without opening a single page. On the before screen the same information takes minutes to assemble.`
    },
    {
      title: "Applying the checklist to a real screen",
      body: `Pick your busiest Perspective view. Print it. With the checklist beside you, mark each line pass or fail. Typical first-run results: units missing on a quarter of the values, two different navigation bars across the project, three different reds, and no indication of stale data. Fix the three that affect abnormal-condition detection first. Re-test with an operator before the rest.`
    }
  ],

  diagrams: {
    before: `<svg viewBox="0 0 680 350" role="img" aria-label="A cluttered before screen for the Area10 mixing unit with ten numbered problems: rainbow colors, fake 3D pipes, scattered digits, missing units, misused alarm colors, a button-like status, inconsistent navigation, inconsistent labels, a decorative dial and a lost alarm indicator">
  <rect class="dg-bg" x="0" y="0" width="680" height="350"/>
  <rect class="dg-box-accent" x="10" y="10" width="60" height="28" rx="2"/>
  <text class="dg-text-sm dg-mid" x="40" y="29">HOME</text>
  <rect class="dg-box-warn" x="76" y="10" width="104" height="28" rx="2"/>
  <text class="dg-text-sm dg-mid" x="128" y="29">MIXING &gt;&gt;</text>
  <rect class="dg-box-ok" x="186" y="10" width="44" height="28" rx="2"/>
  <text class="dg-text-sm dg-mid" x="208" y="29">PKG</text>
  <text class="dg-text-sm" x="244" y="29">Alarms (3)</text>
  <rect class="dg-box-2" x="580" y="10" width="90" height="28" rx="2"/>
  <text class="dg-text-sm dg-mid" x="625" y="29">&lt;&lt; Back</text>
  <text class="dg-title" x="10" y="64">AREA 10 MIXING UNIT  Line1</text>

  <rect class="dg-box-warn" x="40" y="80" width="120" height="170" rx="4"/>
  <rect class="dg-box-accent" x="44" y="92" width="112" height="154" rx="2"/>
  <text class="dg-text dg-mid" x="100" y="112">TANK 1</text>
  <text class="dg-text-muted dg-mid" x="100" y="170">4.7</text>

  <rect class="dg-box-2" x="194" y="96" width="110" height="44" rx="8"/>
  <rect class="dg-box-alarm" x="190" y="92" width="110" height="44" rx="8"/>
  <text class="dg-text dg-mid" x="245" y="119">M-101 RUN</text>
  <text class="dg-text-sm" x="310" y="152">1180</text>
  <text class="dg-text-sm" x="196" y="154">55.0</text>

  <circle class="dg-box-2" cx="470" cy="125" r="42"/>
  <line class="dg-line" x1="470" y1="125" x2="498" y2="104"/>
  <circle class="dg-fill-line" cx="470" cy="125" r="4"/>
  <line class="dg-line-thin" x1="440" y1="152" x2="446" y2="146"/>
  <line class="dg-line-thin" x1="500" y1="152" x2="494" y2="146"/>
  <text class="dg-text-sm dg-mid" x="470" y="190">FT101</text>

  <rect class="dg-box-ok" x="160" y="216" width="140" height="18"/>
  <line class="dg-line-thin" x1="162" y1="221" x2="298" y2="221"/>
  <line class="dg-line-thin" x1="162" y1="230" x2="298" y2="230"/>
  <circle class="dg-box-ok" cx="332" cy="225" r="32"/>
  <text class="dg-text-sm dg-mid" x="332" y="222">P101</text>
  <text class="dg-text-sm dg-mid" x="332" y="238">STOP</text>
  <rect class="dg-box-accent" x="364" y="216" width="150" height="18"/>
  <line class="dg-line-thin" x1="366" y1="221" x2="512" y2="221"/>
  <line class="dg-line-thin" x1="366" y1="230" x2="512" y2="230"/>
  <rect class="dg-box-warn" x="514" y="205" width="44" height="40" rx="2"/>
  <text class="dg-text-sm dg-mid" x="536" y="229">FV 101</text>
  <rect class="dg-box-2" x="558" y="216" width="112" height="18"/>
  <line class="dg-line-thin" x1="560" y1="221" x2="668" y2="221"/>
  <line class="dg-line-thin" x1="560" y1="230" x2="668" y2="230"/>

  <text class="dg-text-sm" x="176" y="208">12.3</text>
  <text class="dg-text-sm" x="244" y="256">0.87</text>
  <text class="dg-text-sm" x="400" y="208">45.2</text>
  <text class="dg-text-sm" x="430" y="256">7.1</text>
  <text class="dg-text-sm" x="572" y="208">101.4</text>
  <text class="dg-text-sm" x="590" y="256">63.5</text>

  <rect class="dg-box-alarm" x="40" y="290" width="46" height="22" rx="2"/>
  <text class="dg-text-sm dg-mid" x="63" y="306">LAH</text>
  <text class="dg-text-muted" x="10" y="338">Alarms: 3     14:03</text>

  <circle class="dg-box-accent" cx="22" cy="90" r="11"/><text class="dg-text-sm dg-mid" x="22" y="94">1</text>
  <circle class="dg-box-accent" cx="230" cy="190" r="11"/><text class="dg-text-sm dg-mid" x="230" y="194">2</text>
  <circle class="dg-box-accent" cx="500" cy="262" r="11"/><text class="dg-text-sm dg-mid" x="500" y="266">3</text>
  <circle class="dg-box-accent" cx="178" cy="150" r="11"/><text class="dg-text-sm dg-mid" x="178" y="154">4</text>
  <circle class="dg-box-accent" cx="332" cy="182" r="11"/><text class="dg-text-sm dg-mid" x="332" y="186">5</text>
  <circle class="dg-box-accent" cx="320" cy="92" r="11"/><text class="dg-text-sm dg-mid" x="320" y="96">6</text>
  <circle class="dg-box-accent" cx="370" cy="24" r="11"/><text class="dg-text-sm dg-mid" x="370" y="28">7</text>
  <circle class="dg-box-accent" cx="536" cy="184" r="11"/><text class="dg-text-sm dg-mid" x="536" y="188">8</text>
  <circle class="dg-box-accent" cx="530" cy="90" r="11"/><text class="dg-text-sm dg-mid" x="530" y="94">9</text>
  <circle class="dg-box-accent" cx="108" cy="301" r="11"/><text class="dg-text-sm dg-mid" x="108" y="305">10</text>
</svg>`,

    after: `<svg viewBox="0 0 680 440" role="img" aria-label="The redesigned Area10 mixing screen: grey and quiet, one alarm banner for LAH-101, flat equipment status with words, tank level scale with the alarm limit, a 30 minute trend and a flow bar with normal band">
  <rect class="dg-box-2" x="2" y="2" width="676" height="436" rx="4"/>

  <rect class="dg-box-alarm" x="12" y="12" width="656" height="34" rx="4"/>
  <text class="dg-text-sm" x="24" y="34">LAH-101  Tank 1 level high  4.7 m (limit 4.5)  P2  14:02:11  UNACK</text>
  <rect class="dg-box-accent" x="584" y="16" width="76" height="26" rx="4"/>
  <text class="dg-text-sm dg-mid" x="622" y="34">Ack</text>

  <rect class="dg-box-accent" x="12" y="54" width="110" height="30" rx="3"/>
  <text class="dg-text-sm dg-mid" x="67" y="74">Overview</text>
  <rect class="dg-box" x="126" y="54" width="110" height="30" rx="3"/>
  <text class="dg-text-sm dg-mid" x="181" y="74">Mixing</text>
  <rect class="dg-box" x="240" y="54" width="110" height="30" rx="3"/>
  <text class="dg-text-sm dg-mid" x="295" y="74">Packaging</text>
  <rect class="dg-box" x="354" y="54" width="110" height="30" rx="3"/>
  <text class="dg-text-sm dg-mid" x="409" y="74">Alarms</text>
  <rect class="dg-box" x="468" y="54" width="110" height="30" rx="3"/>
  <text class="dg-text-sm dg-mid" x="523" y="74">Trends</text>
  <text class="dg-text-muted dg-end" x="668" y="74">Area10 Mixing</text>

  <rect class="dg-box" x="12" y="94" width="420" height="290" rx="4"/>
  <text class="dg-text" x="40" y="116">T101  Mix tank</text>
  <rect class="dg-box" x="40" y="124" width="110" height="216" rx="6"/>
  <rect class="dg-box-2" x="42" y="140" width="106" height="198" rx="4"/>
  <line class="dg-line-alarm dg-dash" x1="36" y1="148" x2="156" y2="148"/>
  <text class="dg-text-muted dg-end" x="34" y="132">5.0</text>
  <text class="dg-text-muted dg-end" x="34" y="342">0 m</text>
  <rect class="dg-box-alarm" x="160" y="108" width="112" height="28" rx="4"/>
  <text class="dg-text-sm" x="168" y="127">LT101  4.7 m</text>
  <text class="dg-text-muted" x="160" y="158">LAH 4.5 m</text>

  <line class="dg-line-thin dg-dash" x1="150" y1="204" x2="262" y2="204"/>
  <rect class="dg-box" x="262" y="172" width="150" height="64" rx="4"/>
  <text class="dg-text" x="274" y="194">M101  Mixer</text>
  <text class="dg-text-sm" x="274" y="212">Running  Auto</text>
  <text class="dg-label-accent" x="274" y="228">Open faceplate</text>

  <line class="dg-line" x1="150" y1="322" x2="256" y2="322"/>
  <circle class="dg-box" cx="280" cy="322" r="24"/>
  <text class="dg-text-sm dg-mid" x="280" y="326">P101</text>
  <text class="dg-text-sm dg-mid" x="280" y="364">Stopped  Auto</text>
  <line class="dg-line" x1="304" y1="322" x2="330" y2="322"/>
  <rect class="dg-box-warn" x="330" y="308" width="44" height="28" rx="3"/>
  <text class="dg-text-sm dg-mid" x="352" y="326">FV101</text>
  <text class="dg-text-sm dg-mid" x="352" y="354">Closed</text>
  <line class="dg-line" x1="374" y1="322" x2="426" y2="322"/>
  <text class="dg-text-muted dg-end" x="426" y="304">to Area20</text>

  <rect class="dg-box" x="444" y="94" width="224" height="290" rx="4"/>
  <text class="dg-text-sm" x="456" y="116">LT101 level, last 30 min</text>
  <line class="dg-line-thin" x1="484" y1="126" x2="484" y2="206"/>
  <line class="dg-line-thin" x1="484" y1="206" x2="656" y2="206"/>
  <line class="dg-line-alarm dg-dash" x1="484" y1="134" x2="656" y2="134"/>
  <polyline class="dg-line-accent" fill="none" points="484,170 512,168 540,164 568,158 596,148 624,138 656,131"/>
  <text class="dg-text-muted dg-end" x="478" y="130">5.0</text>
  <text class="dg-text-muted dg-end" x="478" y="210">0</text>
  <text class="dg-text-muted" x="490" y="152">LAH 4.5</text>
  <text class="dg-text-muted" x="484" y="226">-30 min</text>
  <text class="dg-text-muted dg-end" x="656" y="226">now</text>

  <text class="dg-text-sm" x="456" y="258">FT101 feed flow</text>
  <text class="dg-title" x="456" y="280">62.5 m³/h</text>
  <rect class="dg-box" x="456" y="290" width="200" height="12" rx="2"/>
  <rect class="dg-box-2" x="496" y="290" width="120" height="12"/>
  <path class="dg-fill-fg" d="M581 306 l-6 10 h12 z"/>
  <text class="dg-text-muted" x="456" y="334">0</text>
  <text class="dg-text-muted dg-end" x="656" y="334">100</text>
  <text class="dg-text-muted dg-mid" x="556" y="352">normal band 20 to 80</text>

  <rect class="dg-box" x="12" y="394" width="656" height="34" rx="4"/>
  <text class="dg-text-muted" x="24" y="416">jdoe (Operator)   14:03:02   PLC1 comms OK</text>
</svg>`
  },

  pitfalls: [
    "Redesigning the look of the screen without changing what the operator can detect.",
    "Removing data operators use without giving them a lower-level place to find it.",
    "Keeping the alarm color for anything that is not an alarm, such as 'running'.",
    "Skipping the test: a mockup is a hypothesis, not a result.",
    "Doing one beautiful screen and leaving the rest of the project in four other dialects.",
    "Using the checklist only at the end, when fixes are expensive."
  ],

  keyTerms: ["hp-hmi", "isa-101", "faceplate", "hmi-style-guide", "heuristic-evaluation", "alarm-flood", "hmi"],

  quiz: [
    {
      q: "On the before screen, the motor is red when running and the pump is green when stopped. Why is this a problem even though each color is a common convention?",
      options: [
        "Red and green cannot be seen on a grey background",
        "It uses the alarm colors for healthy and unhealthy states in a way that hides the real alarm and means nothing to a color-blind operator",
        "Too many colors slow the PLC down",
        "Running equipment should always be shown without any color at all"
      ],
      answer: 1,
      explain: [
        "They are visible. The problem is meaning, not visibility.",
        "Correct. If red means running, then red cannot mean alarm, and the real LAH-101 chip disappears among red things. Color alone also fails for color-blind users.",
        "Colors have no effect on PLC load.",
        "A running state may be shown with a state word and, if the style guide says so, a neutral mark. The rule is about reserving alarm colors."
      ]
    },
    {
      q: "Which replacement for the round FT101 dial best follows the lessons in this track?",
      options: [
        "A larger dial with a thicker needle",
        "A digital readout with four decimals",
        "Remove the flow measurement from the screen entirely",
        "A horizontal bar with the unit, a normal band and a pointer for the current value"
      ],
      answer: 3,
      explain: [
        "A bigger dial still gives no context and takes more space.",
        "More digits give more precision than the operator needs and no sense of normal.",
        "FT101 supports a task (feed rate), so it stays, in a better form.",
        "Correct. A bar shows range, band and position in a small space, and the value is stated with its unit."
      ]
    },
    {
      q: "The after screen has color on only two objects. A colleague wants to color all running equipment green so that operators can see it is OK. What is the best response?",
      options: [
        "Decline, because added color would compete with the alarm banner and the value box, and the state is already written in words",
        "Agree, since green is the usual color for running",
        "Agree, but only for motors",
        "Use blue instead, so it does not look like a stop"
      ],
      answer: 0,
      explain: [
        "Correct. The normal state should be quiet. Color is saved for abnormal conditions, and the word 'Running' carries the state.",
        "Convention is not a reason when the aim is for the abnormal to stand out.",
        "Partial color is still noise and creates inconsistency across equipment types.",
        "Any added color for normal operation takes attention from the abnormal one."
      ]
    },
    {
      q: "In the after screen, M101 shows 'Open faceplate' instead of Start and Stop buttons. What is the main reason?",
      options: [
        "There was no room for buttons",
        "Operators are not allowed to start motors",
        "A status object should not also be a command, and commands belong on the faceplate where the equipment name, mode and interlock reasons are shown",
        "Perspective cannot place buttons on an overview"
      ],
      answer: 2,
      explain: [
        "Space is not the reason. The design separates command from status on purpose.",
        "Operators can command from the faceplate with the right role. This is a design choice, not a ban.",
        "Correct. The faceplate is the select step, and it shows permissives and feedback before an action.",
        "Perspective can place any component anywhere. The choice is about error prevention."
      ]
    },
    {
      q: "You finish the redesign and it looks much cleaner. What must you still do before calling it better?",
      options: [
        "Nothing, because it follows ISA-101",
        "Test it on operators with a scenario like the stuck FV101 and measure time to detect, compared with the old screen",
        "Ask the supervisor to approve the layout",
        "Add animation to show it is live"
      ],
      answer: 1,
      explain: [
        "Following guidance is a good start, but it is not evidence that this screen works for these operators.",
        "Correct. A mockup is a hypothesis. A scenario test shows whether operators notice and act sooner.",
        "A supervisor's approval is useful but does not measure detection.",
        "Animation adds visual competition with alarms."
      ]
    },
    {
      q: "During review you find that the alarm banner shows tag and description but not the value, limit or acknowledgement state. Which checklist group does this fall under, and what is the fix?",
      options: [
        "Layout: move the banner",
        "Navigation: add a link to the alarm page",
        "Testing: remove the banner until tested",
        "Abnormal states: add value with unit, limit, priority, time and ack state so the operator can act from the banner"
      ],
      answer: 3,
      explain: [
        "Position may be fine. The content is incomplete.",
        "A link helps, but the banner should be enough to start acting.",
        "Removing an alarm indicator for testing is the opposite of the aim.",
        "Correct. The banner must let the operator see what is wrong, how bad, how urgent and whether it has been acknowledged."
      ]
    },
    {
      q: "An operator asks you to bring back all the scattered numbers from the old screen. What is the best approach?",
      options: [
        "Put them all back, because operators know best",
        "Refuse, because they are clutter",
        "Ask which decisions those numbers support, put those specific values in context (with unit, limit or trend) where needed, and keep the rest at a lower display level",
        "Offer a toggle that shows all numbers"
      ],
      answer: 2,
      explain: [
        "That recreates the problem and loses the benefit of the redesign.",
        "Dismissing the request ignores valid information needs.",
        "Correct. This is the feedback method from the process lesson: find the need behind the request and serve it in context.",
        "A toggle can become the default for everyone and hides the problem instead of solving it."
      ]
    }
  ],

  resources: [
    { title: "ISA-101.01, Human Machine Interfaces for Process Automation Systems (InTech)", url: "https://www.isa.org/intech/2020/september-october/isa-101-01-human-machine-interfaces-for-process-au", type: "article", source: "ISA" },
    { title: "System Integration: The high performance HMI (InTech, Hollifield)", url: "https://ww2.isa.org/standards-publications/isa-publications/intech-magazine/2012/december/system-integration-the-high-performance-hmi/", type: "article", source: "ISA" },
    { title: "The Four Pillars of Operator Performance", url: "https://www.isa.org/intech-home/2023/2023-february-2023/features/four-pillars-operator-performance", type: "article", source: "ISA" },
    { title: "10 Usability Heuristics for User Interface Design", url: "https://www.nngroup.com/articles/ten-usability-heuristics/", type: "article", source: "NN/g" },
    { title: "Confirmation Dialogs Can Prevent User Errors", url: "https://www.nngroup.com/articles/confirmation-dialog/", type: "article", source: "NN/g" },
    { title: "Understanding Success Criterion 2.5.5: Target Size (Enhanced)", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html", type: "standard", source: "W3C" },
    { title: "Creating and Using Custom Perspective Themes (Ignition 8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/styles/creating-and-using-custom-perspective-themes", type: "docs", source: "Inductive Automation" }
  ]
});
