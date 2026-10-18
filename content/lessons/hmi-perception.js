LC.lesson({
  id: "hmi-perception",
  title: "How operators see: perception and attention",
  track: "hmi",
  minutes: 25,
  level: 2,
  prereqs: ["found-purdue"],
  tags: ["hmi", "perception", "attention", "human factors", "situation awareness", "design"],
  summary: "What the eye and brain can and cannot do at a control desk, and why that makes a screen full of numbers a bad screen.",
  objectives: [
    "Explain foveal and peripheral vision and what each is good at on a screen",
    "Name the preattentive attributes and say why only abnormal things should use them",
    "Describe change blindness and give two screen designs that avoid it",
    "Use the working memory limit (about 4 chunks) to decide how much to show together",
    "Apply recognition over recall and the three levels of situation awareness to a real display",
    "Explain why a wall of numbers fails and what to replace it with in Perspective"
  ],

  body: `
## Start with the person, not the pixels

The owner's question was "how should I organise my screens?" The answer starts one step earlier: what can a person watching a screen for eight hours actually take in? Web design courses teach layout tricks. Operator screens need the reasons behind the tricks, because the job is different. A web visitor wants to find something. An operator needs to notice that something is wrong while looking at something else. This lesson covers the human side. {{lesson:hmi-layout}} and {{lesson:hmi-color}} turn it into rules for placement and color, and {{lesson:persp-hphmi}} shows where the industry codified it.

## Two kinds of vision

Your eye does not see a whole screen sharply. Only a small central patch, the **fovea**, gives sharp detail and good color. As a rough picture, it is a spot about the size of a thumbnail held at arm's length. Everything outside it is **peripheral vision**: blurry, poor at reading, but very good at detecting that something changed or moved.

{{diagram:vision}}

The eye jumps from spot to spot several times a second. Each jump lands on something that is chosen by what the viewer is looking for and by what pulls the eye. Reading a number needs a fixation on it. Noticing that a number is unusual should not. This leads to the first big design rule:

- **Reading** is serial and slow. One fixation, one value.
- **Pattern detection** is parallel and fast. A shape, a length or a color difference can be picked up from the corner of the eye.

A good operator screen lets the operator detect "something is off" in the periphery and then spend foveal attention only where needed.

## Preattentive attributes

Some visual differences are detected before conscious attention, in parallel, across the whole display. These are the **{{term:preattentive-attributes|preattentive attributes}}**: color (hue and intensity), size, orientation, shape, motion, enclosure, position and length. NN/g describes the effect with a simple example: you notice one large rectangle among many small ones effortlessly, but you cannot judge how much larger it is without looking carefully. The first part is the useful part for monitoring.

The catch is that a preattentive signal only works when it is rare. If one item among 40 is red, it pops. If twelve items are red, none pops, and the viewer is back to reading. NN/g's visual design guidance says the same thing in design terms: if everything is contrasted, nothing stands out.

| Attribute | Good use on an operator screen | Misuse that costs you |
|---|---|---|
| Hue (color) | One alarm color, used only when abnormal | Green running, red stopped, blue valves, yellow pipes on every screen |
| Size | Larger text for the one value the operator must read from across the room | Everything big, so nothing is big |
| Motion | Unacknowledged alarm indicator | Spinning agitators and flowing pipes on normal equipment |
| Orientation | A pointer or bar position that tilts away from its normal angle | Decorative angled labels |
| Length or position | Bar length against a marked normal band | Digits only |

Stephen Few, who writes about dashboard perception, points out that of the many visual attributes, only two (2-D position and line length) encode quantities accurately. Hue is good for flagging category or state and poor for conveying how much. That is why an HP HMI uses a bar for the number and a color only for "this is abnormal."

> [!why] The budget idea
> Preattentive attributes are a small budget the whole screen shares. Spend them on abnormal conditions and the screen tells the operator where to look. Spend them on decoration and the operator has to read every item to find the problem.

## Change blindness

NN/g defines **{{term:change-blindness|change blindness}}** as the tendency to miss things that change outside the focus of attention, especially if the change coincides with any brief disruption. Researchers have shown that big scene changes can go unseen when a flicker or blink interrupts the view (Rensink, O'Regan and Clark, 1997, as cited by NN/g).

On a control screen the disruptions are everywhere: a page change, a popup opening, a trend scrolling, a second alarm arriving. Practical consequences:

- A value that quietly changes color on a screen the operator is not looking at will be missed. Put a summary of abnormal conditions in a fixed place (an alarm banner on every page) so there is a known spot to glance at.
- A change that happens right where the eye already is will be caught. NN/g's advice is to place important new elements close to where the user's eyes are already focused. For example, when the operator clicks Start on M101, show the confirmation and the new state next to the button, not in a status bar at the bottom.
- Avoid screens that rebuild whole regions on refresh. A flicker is a disruption.

## Working memory: about four chunks

Working memory holds what you are actively thinking about. George Miller's 1956 estimate of "seven plus or minus two" is the famous number. Nelson Cowan's 2001 review argued the true limit is closer to **four chunks** (a range of about three to five, depending on how it is measured). Miller himself offered seven as a rough estimate, and the debate is not fully settled. For design, plan on four.

A **chunk** is a meaningful unit. "1 4 8 0" is four items. "Motor speed" is one chunk once you know what it means. Grouping and labeling turn many items into few chunks. That is the design lever: you cannot raise the limit, but you can reduce the number of things the operator must hold.

Two consequences for screens:

1. If a task needs the operator to compare two numbers, put them on the same screen, side by side. Making them flip pages costs working memory, and a page change is also a disruption (see change blindness).
2. A screen with 60 independent numbers has 60 chunks. A screen with 6 labeled groups of 10 has 6 chunks, which is still above four, so the groups must be visually distinct and ordered.

## Recognition over recall

People recognise much better than they recall. Seeing "Pump P101 - Stopped" on screen is cheap. Remembering which of 30 pump names to type, or remembering that the setpoint was 72 an hour ago, is expensive. In operator screens:

- Show the **normal band and limits** next to the value, so the operator recognises "high" rather than recalling what high is.
- Show the **setpoint and the mode** (auto or manual) beside the process value, so the operator does not have to recall them.
- Keep names, abbreviations and symbols identical on every screen. Recognition only works if the thing looks the same each time.
- Use trend sparklines so the history is seen instead of remembered.

## Situation awareness

Mica Endsley's model, widely used in aviation and process control, defines {{term:situation-awareness|situation awareness}} in three levels. A freeze-and-ask method called SAGAT is used to measure each level by blanking the display and questioning the operator. The levels are cumulative, which makes them useful as a design checklist:

{{diagram:sa}}

| Level | The operator can answer | Screen feature that supports it |
|---|---|---|
| 1 Perceive | "What is the state of the key elements?" | Quiet screen, alarms that pop, nothing hidden behind tabs |
| 2 Comprehend | "What does that mean?" | Bands, limits, setpoints, units, grouping that matches the process |
| 3 Project | "What happens next?" | Trend, rate-of-change arrow, time to limit, predicted value |

Most legacy screens stop at level 1. They print the raw value and leave comprehension and projection to the operator's memory. That is where an HP HMI earns its keep, and why ISA describes a bank of well-designed analog indicators as readable in about a two-second glance.

## Why a wall of numbers fails

Take the Area10 mixing screen with 36 tag values printed as digits, same font, same color. To find the one that is abnormal the operator must fixate on each (serial reading), recall the normal range for each (recall, not recognition), and hold the findings in mind (working memory). Nothing is preattentive. The abnormal value is as hard to find as every other.

{{diagram:wall}}

The same six values drawn as bars with a shaded normal band put the answer in peripheral vision: the PT101 marker is outside its band and the border is the only colored thing on screen. The operator finds it without reading anything, then reads the number.

## Rules of thumb

1. **Normal is quiet.** If a thing is normal, it gets no color, no motion and no extra size.
2. **Show context with every value.** Band, limits, setpoint, units and a hint of trend. Never make the operator recall a range.
3. **Count chunks, not tags.** Aim for about four groups the operator must consider together on any task screen, and make each group visibly distinct.
4. **Put comparisons side by side.** Anything compared during one task lives on one screen.
5. **Feedback goes where the eye is.** The result of a click appears at the click, not in a corner.
6. **One fixed home for "something is wrong".** An alarm banner in the same place on every page.
7. **Use length and position for how much, color for whether it is abnormal.**
8. **Never redraw the screen the operator is reading.** Update values in place.
9. **Test with a seeded abnormal.** Time how long it takes a real operator to find it.

## Try it on your own screens

1. Open one of your busiest screens. Squint or blur it (the browser zoom out to 25 percent works). Write down what you still see. If you can see more than one or two things, the screen is spending its preattentive budget on normal equipment.
2. Count the distinct colors, animations and font sizes in use on that screen. Mark each as "only when abnormal" or "always on". List the always-on ones you could remove.
3. Pick one task (for example, bringing M101 up to speed). List the values the operator needs. Are they all visible on one screen? Count the groups and compare with four.
4. Replace five bare numeric labels with one reusable indicator that shows band and limits. Ask an operator to find the seeded abnormal in the old and new versions and time them.
5. Walk through the three situation awareness levels for the screen. For each level, name the element that supports it. Write "none" where nothing does.

## What this means in Perspective

- Build **one reusable analog indicator** (embedded view with \`tagPath\`, range, band and limits parameters, see {{lesson:persp-embedding}}) and use it instead of bare Label components.
- Put a **fixed alarm banner** in the page's top dock so abnormal state has a known home (see {{lesson:persp-navigation}}).
- **Reserve animation and color for abnormal.** Drive \`props.style.classes\` from alarm state, not from a script that sets colors.
- **Limit what shares a screen.** Ask what the operator is doing, and show only what that task needs, in groups of about four chunks.
- **Keep the picture stable.** Avoid popups that cover the thing the operator was watching, and avoid timers that redraw whole views.
`,

  eli5: `
Imagine you are in a school cafeteria and your job is to spot the one kid who is getting into trouble. You cannot stare hard at every kid, because that takes too long. But if everyone wears a grey shirt and the kid in trouble puts on a bright red shirt, you notice from across the room without trying. That quick noticing is how your eyes work: the middle of your vision is sharp but tiny, and the edges are blurry but great at spotting "something is different."

Now imagine everyone wears a bright shirt in a different color. The kid in trouble no longer stands out. You have to look at each kid one by one.

Your memory has the same problem. You can juggle about four things in your head at once, like four balls. Hand someone sixty numbers and they drop most of them. The trick is to group things into a few labeled piles and to show a hint next to each number, like "normal is between here and here", so nobody has to remember it.
`,

  why: `
**Why this matters more than style.** Operator screens exist to catch problems early. Studies of major incidents led the {{term:asm-consortium|ASM Consortium}} to focus on the operator interface and on situation awareness, because a plant can have plenty of instruments and still lose the operator's attention. Perception research explains the mechanism: the display either helps the eye find the abnormal, or it hides it among normal-looking things.

**Why quiet screens beat lively ones.** Designers and customers often want screens to look alive, with flowing animations and bright equipment colors. Each one spends from the preattentive budget. The usual counter-argument is "operators like it." The honest reply is that they like it because it looks informative, and it is a legitimate question whether it is. Test it: seed an abnormal value on both versions and time how long operators take to find it.

**Why four chunks and not seven.** Miller's seven is what most people remember, and it was offered as a rough estimate. Later work (Cowan, 2001) puts the limit near four when rehearsal and chunking are controlled. The practical view: treat four as the target for items that must be compared or held together, and accept that experts chunk better than novices, so a screen that works for a 20-year operator may fail a trainee.

**What experienced integrators argue about.** Some say the claim "grey screens are faster" is overstated, because the published comparisons are few and often come from people who also teach or sell the approach. ISA's own material cautions about overdoing it: if the Level 1 overview only shows abnormal conditions, inefficiencies and sub-optimal operation (not alarms yet) can go unseen. The balanced position is that the perception principles are well established, the specific percent improvements vary by study and site, and you should verify with your own operators.
`,

  history: `
Psychologists were studying attention long before control rooms had screens. George Miller published his paper on the limits of short-term memory in 1956. Nelson Cowan's 2001 review argued for a lower limit of about four chunks. Mica Endsley's three-level model of situation awareness came out of aviation research, and process control borrowed it. The ASM Consortium formed in the 1990s to study abnormal situations in plants, and its human-factors work fed into HP HMI practice and ISA-101.
`,

  examples: [
    {
      title: "Finding the abnormal value: digits versus bars",
      body: `A tank screen lists LT101 3.42 m, FT101 41.8 m3/h, TT101 62.3 C, PT101 2.90 bar, M101 1480 rpm and P101 11.9 A. PT101 has a normal band of 1.5 to 2.2 bar and a high alarm at 2.8. As digits, six lines look equally fine and the operator must know all six bands. As indicators, five markers sit inside grey bands and one has crossed its band. The 2.90 bar value is already above the alarm limit, so the screen should show that it is in alarm, with a priority number and color, not just out of band.`
    },
    {
      title: "Keeping the response next to the eye",
      body: `The operator presses Start on M101 in a faceplate. Version A shows "Starting" in a status bar at the page bottom. Version B changes the Start button's own state in place to "Starting... (4 s start delay)" and then shows Running with the speed. Version B keeps the feedback inside the foveal area where the eye already is, which reduces the chance of change blindness.`
    }
  ],

  diagrams: {
    vision: `<svg viewBox="0 0 640 250" role="img" aria-label="A screen mockup with a small sharp foveal spot on one value and a wide blurry peripheral region where only a color and a bar position are detected">
  <rect class="dg-box" x="20" y="20" width="400" height="210" rx="6"/>
  <text class="dg-title" x="36" y="46">Area10 Mixing - Overview</text>
  <rect class="dg-box-2" x="36" y="62" width="110" height="50" rx="4"/>
  <text class="dg-text-sm" x="46" y="82">LT101 level</text>
  <text class="dg-text" x="46" y="102">3.42 m</text>
  <rect class="dg-box-2" x="160" y="62" width="110" height="50" rx="4"/>
  <text class="dg-text-sm" x="170" y="82">TT101 temp</text>
  <text class="dg-text" x="170" y="102">62.3 C</text>
  <rect class="dg-box-alarm" x="284" y="62" width="120" height="50" rx="4"/>
  <text class="dg-text-sm" x="294" y="82">PT101 pressure</text>
  <text class="dg-text" x="294" y="102">2.90 bar</text>
  <rect class="dg-box-2" x="36" y="126" width="110" height="50" rx="4"/>
  <text class="dg-text-sm" x="46" y="146">M101 speed</text>
  <text class="dg-text" x="46" y="166">1480 rpm</text>
  <rect class="dg-box-2" x="160" y="126" width="110" height="50" rx="4"/>
  <text class="dg-text-sm" x="170" y="146">P101 current</text>
  <text class="dg-text" x="170" y="166">11.9 A</text>
  <rect class="dg-box-2" x="284" y="126" width="120" height="50" rx="4"/>
  <text class="dg-text-sm" x="294" y="146">FT101 flow</text>
  <text class="dg-text" x="294" y="166">41.8 m3/h</text>
  <circle class="dg-zone" cx="105" cy="94" r="30"/>
  <text class="dg-label-accent" x="36" y="204">Fovea: reads one value</text>
  <text class="dg-text-sm" x="36" y="222">Periphery: sees the one colored box</text>
  <line class="dg-line-accent" x1="440" y1="94" x2="500" y2="94"/>
  <text class="dg-title" x="440" y="46">What the eye gets</text>
  <rect class="dg-box" x="440" y="110" width="180" height="46" rx="4"/>
  <text class="dg-text-sm" x="452" y="130">Fovea: sharp text,</text>
  <text class="dg-text-sm" x="452" y="147">one fixation at a time</text>
  <rect class="dg-box" x="440" y="168" width="180" height="46" rx="4"/>
  <text class="dg-text-sm" x="452" y="188">Periphery: blurry,</text>
  <text class="dg-text-sm" x="452" y="205">detects color and change</text>
</svg>`,
    sa: `<svg viewBox="0 0 640 230" role="img" aria-label="Three stepped boxes: perceive, comprehend, project, each with the screen feature that supports it">
  <rect class="dg-box" x="20" y="130" width="190" height="80" rx="6"/>
  <text class="dg-title" x="34" y="156">1 Perceive</text>
  <text class="dg-text-sm" x="34" y="178">Quiet screen, alarm banner,</text>
  <text class="dg-text-sm" x="34" y="196">abnormal pops out</text>
  <rect class="dg-box" x="225" y="80" width="190" height="130" rx="6"/>
  <text class="dg-title" x="239" y="106">2 Comprehend</text>
  <text class="dg-text-sm" x="239" y="128">Normal band, limits,</text>
  <text class="dg-text-sm" x="239" y="146">setpoint, units,</text>
  <text class="dg-text-sm" x="239" y="164">process-shaped groups</text>
  <rect class="dg-box-accent" x="430" y="30" width="190" height="180" rx="6"/>
  <text class="dg-title" x="444" y="56">3 Project</text>
  <text class="dg-text-sm" x="444" y="78">Trend, rate arrow,</text>
  <text class="dg-text-sm" x="444" y="96">time to limit</text>
  <text class="dg-label-accent" x="444" y="190">Most legacy screens stop</text>
  <text class="dg-label-accent" x="444" y="206">before this level</text>
</svg>`,
    wall: `<svg viewBox="0 0 640 270" role="img" aria-label="Left: six process values as plain digits where the abnormal one is invisible. Right: the same six values as bars with normal bands where PT101 is outside its band">
  <text class="dg-title" x="20" y="26">Wall of numbers</text>
  <rect class="dg-box" x="20" y="40" width="270" height="214" rx="6"/>
  <text class="dg-text-mono" x="36" y="72">LT101   3.42 m</text>
  <text class="dg-text-mono" x="36" y="104">FT101   41.8 m3/h</text>
  <text class="dg-text-mono" x="36" y="136">TT101   62.3 C</text>
  <text class="dg-text-mono" x="36" y="168">PT101   2.90 bar</text>
  <text class="dg-text-mono" x="36" y="200">M101    1480 rpm</text>
  <text class="dg-text-mono" x="36" y="232">P101    11.9 A</text>
  <text class="dg-title" x="330" y="26">Same data, with context</text>
  <rect class="dg-box" x="330" y="40" width="290" height="214" rx="6"/>
  <text class="dg-text-sm" x="342" y="72">LT101</text>
  <rect class="dg-box-2" x="396" y="60" width="150" height="16" rx="3"/>
  <rect class="dg-fill-line" x="446" y="60" width="50" height="16"/>
  <rect class="dg-fill-fg" x="470" y="57" width="4" height="22"/>
  <text class="dg-text-sm" x="342" y="104">FT101</text>
  <rect class="dg-box-2" x="396" y="92" width="150" height="16" rx="3"/>
  <rect class="dg-fill-line" x="436" y="92" width="60" height="16"/>
  <rect class="dg-fill-fg" x="462" y="89" width="4" height="22"/>
  <text class="dg-text-sm" x="342" y="136">TT101</text>
  <rect class="dg-box-2" x="396" y="124" width="150" height="16" rx="3"/>
  <rect class="dg-fill-line" x="446" y="124" width="50" height="16"/>
  <rect class="dg-fill-fg" x="480" y="121" width="4" height="22"/>
  <text class="dg-text-sm" x="342" y="168">PT101</text>
  <rect class="dg-box-alarm" x="396" y="156" width="150" height="16" rx="3"/>
  <rect class="dg-fill-line" x="426" y="156" width="40" height="16"/>
  <rect class="dg-fill-alarm" x="518" y="153" width="5" height="22"/>
  <text class="dg-label-accent" x="556" y="169">2.90 !</text>
  <text class="dg-text-sm" x="342" y="200">M101</text>
  <rect class="dg-box-2" x="396" y="188" width="150" height="16" rx="3"/>
  <rect class="dg-fill-line" x="436" y="188" width="60" height="16"/>
  <rect class="dg-fill-fg" x="466" y="185" width="4" height="22"/>
  <text class="dg-text-sm" x="342" y="232">P101</text>
  <rect class="dg-box-2" x="396" y="220" width="150" height="16" rx="3"/>
  <rect class="dg-fill-line" x="426" y="220" width="70" height="16"/>
  <rect class="dg-fill-fg" x="458" y="217" width="4" height="22"/>
</svg>`
  },

  pitfalls: [
    "Spending color, size and motion on normal equipment, so nothing is left to flag the abnormal.",
    "Showing the value without its normal band, setpoint or limits, which forces the operator to recall them.",
    "Opening popups or refreshing whole views over the thing the operator was watching, which invites change blindness.",
    "Splitting values that must be compared across two pages, which costs working memory and adds a disruption.",
    "Assuming that a display that looks informative is informative. Test it by timing how fast operators find a seeded abnormal.",
    "Citing exact percentage improvements from vendor material as if they were universal."
  ],

  keyTerms: ["preattentive-attributes", "change-blindness", "working-memory", "recognition-over-recall", "foveal-vision", "situation-awareness", "hp-hmi", "hmi"],

  quiz: [
    {
      "q": "A Level 2 screen shows 40 values as same-size black digits. An operator takes 25 seconds to notice that one is out of range. Which perception problem is the main cause?",
      "options": [
        "Working memory is too large for the task",
        "The font is too small for foveal vision",
        "The operator has change blindness",
        "Nothing is preattentive, so the abnormal value must be found by serial reading and recalled limits"
      ],
      "answer": 3,
      "explain": [
        "Working memory is limited to about four chunks, not too large. The problem is demand on it.",
        "Font size might matter, but the delay comes from having to read all 40, not from one unreadable item.",
        "Change blindness is about missing a change outside attention. This case is a static search problem.",
        "Correct. With no difference in color, length or position, detection depends on fixating each value and recalling its range."
      ]
    },
    {
      "q": "You color all running pumps green, all stopped pumps red and all valves blue on the overview. What is the main perceptual cost?",
      "options": [
        "Preattentive color no longer separates the abnormal from the normal because many things are colored all the time",
        "Color vision deficiency makes blue invisible",
        "Green is slower to detect than red",
        "Operators will forget what blue means"
      ],
      "answer": 0,
      "explain": [
        "Correct. Preattentive attributes only work when they are rare. Constant color uses up the budget.",
        "The issue is not blue visibility. Red and green are the usual CVD pair, and that is a separate problem.",
        "There is no basis for the claim that green is slower than red here. Rarity is what matters.",
        "Memory is a secondary issue. The primary one is that nothing stands out."
      ]
    },
    {
      "q": "A Start command on faceplate M101 produces a message in a status bar at the bottom of the page. Operators miss it. What is the best fix based on change blindness?",
      "options": [
        "Make the status bar message flash",
        "Show the new state in place on the Start button or next to it, where the eye already is",
        "Move the status bar to the top of the page",
        "Add a sound for every command"
      ],
      "answer": 1,
      "explain": [
        "Flashing spends motion on a normal event and can annoy. It also does not address where the eye is.",
        "Correct. NN/g advises placing important new elements near where the user's eyes are already focused.",
        "Top or bottom, a status bar is still away from the foveal spot at the moment of the click.",
        "Sound for every command adds noise and dilutes alarm sounds."
      ]
    },
    {
      "q": "A screen needs the operator to compare the feed temperature and the reactor temperature while adjusting a valve. How should you use the working memory limit?",
      "options": [
        "Put each on its own page and add a navigation button",
        "Show both as large digits in the corner",
        "Put the two temperatures and the valve control on the same screen, close together",
        "Add a table of 30 related values for context"
      ],
      "answer": 2,
      "explain": [
        "Splitting across pages forces recall and adds a disruption.",
        "Large digits help reading but not comparison.",
        "Correct. The task needs only a few chunks if they are visible together, so the operator does not have to remember one while looking at the other.",
        "Thirty extra values add chunks and make the key ones harder to find."
      ]
    },
    {
      "q": "Which design change best raises an indicator from situation awareness level 1 to level 3?",
      "options": [
        "Add the normal band and alarm limit ticks only",
        "Add a short trend and a rate-of-change arrow in addition to the band and limits",
        "Add a bigger font to the value",
        "Add a second digital readout in engineering units"
      ],
      "answer": 1,
      "explain": [
        "Bands and limits support comprehension (level 2). Level 3 needs direction and rate.",
        "Correct. Trend and rate let the operator project what happens next.",
        "A bigger font helps reading (level 1) only.",
        "A second readout adds more numbers, not meaning."
      ]
    },
    {
      "q": "A colleague says 'people hold 7 plus or minus 2 items, so each screen can have 9 groups'. What is the best response?",
      "options": [
        "Plan for about four chunks, and make groups visibly distinct, because later work puts the limit lower and Miller called seven a rough estimate",
        "Agree, since Miller's number is a firm limit",
        "Working memory does not matter for screens",
        "Limit screens to two items"
      ],
      "answer": 0,
      "explain": [
        "Correct. Cowan's review argues for about four chunks (three to five), so aim for few, distinct groups.",
        "Seven is a rough estimate and later work suggests it is lower.",
        "Working memory is the reason context should be displayed instead of recalled.",
        "Two is too restrictive and has no support."
      ]
    }
  ],

  resources: [
    { title: "Change Blindness in UX: Definition", url: "https://www.nngroup.com/articles/change-blindness-definition/", type: "article", source: "Nielsen Norman Group" },
    { title: "Change Blindness Causes People to Ignore What Designers Expect Them to See", url: "https://www.nngroup.com/articles/change-blindness/", type: "article", source: "Nielsen Norman Group" },
    { title: "Dashboards: Making Charts and Graphs Easier to Understand", url: "https://www.nngroup.com/articles/dashboards-preattentive/", type: "article", source: "Nielsen Norman Group" },
    { title: "Psychology for UX: Study Guide", url: "https://www.nngroup.com/articles/psychology-study-guide/", type: "article", source: "Nielsen Norman Group" },
    { title: "The magical number 4 in short-term memory: a reconsideration of mental storage capacity (Cowan, 2001)", url: "https://pubmed.ncbi.nlm.nih.gov/11515286/?dopt=Abstract", type: "article", source: "PubMed" },
    { title: "System Integration: The high performance HMI (InTech, ISA)", url: "https://ww2.isa.org/standards-publications/isa-publications/intech-magazine/2012/december/system-integration-the-high-performance-hmi/", type: "article", source: "ISA" },
    { title: "The Visual Perception of Variation in Data Displays (Few)", url: "https://www.perceptualedge.com/articles/visual_business_intelligence/the_visual_perception_of_variation.pdf", type: "article", source: "Perceptual Edge" }
  ]
});
