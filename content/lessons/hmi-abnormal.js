LC.lesson({
  id: "hmi-abnormal",
  title: "Making abnormal obvious: alarms, states and attention",
  track: "hmi",
  minutes: 25,
  level: 3,
  prereqs: ["hmi-color", "ign-alarming"],
  tags: ["hmi", "alarms", "equipment state", "flashing", "quality", "interlocks", "perspective", "isa-18.2", "isa-101"],
  summary: "A quiet screen where abnormal conditions are impossible to miss: alarm priority coded three ways, flashing only until acknowledged, equipment state without rainbow colors, and bad data that never looks live.",
  objectives: [
    "Code alarm priority redundantly with color, shape and text",
    "Place alarm indicators beside the value they belong to and summarize them in a banner and list",
    "Explain when flashing is justified and when it is harmful",
    "Show equipment state (running, stopped, faulted, auto) without a rainbow of colors",
    "Present first-out, operator guidance, interlocks and permissives so the operator knows what to do",
    "Display bad or stale data so a last-good value is never mistaken for a live one",
    "Wire these cues in Perspective from UDT alarm properties and style classes"
  ],

  body: `
## The job of an abnormal-condition display

A good HMI is quiet when things are normal and loud only when something needs a person. That puts the weight on the abnormal cues: they have to be noticed quickly, understood without reading a manual, and tied to an action. This lesson covers the cues. The alarm system behind them, with priorities, rationalization and KPIs, is in {{lesson:int-alarm-mgmt}}. The palette philosophy is in {{lesson:persp-hphmi}} and {{lesson:hmi-color}}, which reserve alarm hues for alarms.

An alarm, in the standard definition, is an audible or visible indication of an abnormal condition that needs a timely response. Everything on the screen that signals abnormal should earn that definition, or be demoted to ordinary information.

## Redundant coding of priority

Never carry priority in color alone. Some operators are colour-vision deficient, and under glare, on a washed-out monitor or on a worn wall display, hues blur. An ISA overview of high-performance graphics describes alarm depiction as a redundantly coded element (shape, color and text) showing the alarm's presence and priority. Vendor style guides map it concretely, for example a red rectangle with a 1 for critical and a yellow triangle with a 2 for high. The same vendor guidance warns that red/green and blue/purple pairs are poorly distinguished by colour-blind users.

{{diagram:symbols}}

Rules of thumb:

- **Three channels, always**: color, a distinct outline shape, and a number or short word. If you remove color, priority must still be readable.
- **Few priorities, visually well separated.** Three or four is typical and matches the priorities set up in the alarm pipeline (see {{lesson:int-alarm-mgmt}} for the priority distribution). Do not use more shapes than you have priorities.
- **The same symbols everywhere**: on the graphic, in the banner, in the alarm list and in the faceplate title.
- **Reserve the colors.** If red means a critical alarm, red does not mean "pump stopped" on any screen. Alarm colors on a piece of equipment that is merely in a state are the fast route to alarm blindness.
- **Do not paint the value to show the alarm.** The ISA overview calls changing the color of a value or its background a poor practice, because it conveys little. Put a small symbol next to the value, and keep the value legible.

## Put the indicator next to the thing

An alarm indicator belongs beside the value or equipment that is in alarm, at a fixed offset, so the eye goes from the symbol straight to the cause. Then summarize:

- **Alarm banner** (a header strip): counts by priority of active, and of unacknowledged, for the operator's area. The count of unacknowledged alarms is the key number.
- **Alarm summary / list**: sorted so the newest unacknowledged and the highest priority are visible without scrolling. Show time, equipment (plain language, see {{lesson:hmi-type-numbers}}), condition, priority symbol and state.
- **Navigation cue**: a symbol on the page button or area tile that has an active alarm, so the operator sees trouble on screens they are not looking at.

Where more alarms are active than the list can show, say so. A banner that shows "37 active, 12 unacknowledged" tells the story at once, and a list that hides the 38th does not.

## Flashing: only for the unacknowledged, and why

People notice movement far better than color change in peripheral vision. That is the case for flashing: it pulls the eye. The usual practice is that the indicator flashes while the alarm is unacknowledged, then goes steady once acknowledged, and remains visible while the condition persists. Acknowledgment is the signal that a person has seen it.

Hold to these limits:

- **Flash only unacknowledged alarms.** Flashing anything else (a running motor, a normal state, a busy graphic) teaches the operator to filter motion out.
- **Flash the small indicator, not the whole value or background.** Flashing text is hard to read.
- **Keep it slow and synchronized**, so several flashing items do not form a strobing pattern. A forum thread on this exact topic found no ISA or IEEE guidance on flash rates or colors, and recommended making them configurable. Choose a rate with your operators and put it in the style guide.
- **One flash style for the whole plant.** Make it a style class animation, not a per-screen effort.
- **Think about the floor.** A wall of flashing indicators in a flood is noise. Fix the flood (below) rather than adding more motion.

## Equipment state without rainbow colors

Old graphics colored equipment by state: green running, red stopped, yellow standby, blue auto. The result is a rainbow in which normal and abnormal look equally loud. Compare:

{{diagram:states}}

A quiet approach:

- **Normal is plain.** Running equipment, which is the expected condition, gets the default line and fill. Do not make normal the brightest thing on screen.
- **Stopped (intended) is a different form, not a different alarm color.** A hollow outline, a lighter fill, or a text word ("Stopped") does the job. If stopping is abnormal because the plant expects it running, that is an alarm or an abnormal indicator, with a symbol.
- **Faulted** gets the alarm indicator for its priority, plus a fault word near the equipment. The UDT's \`Sts.Fault\` or \`Alm.*\` members drive it.
- **Mode (auto, manual, out of service)** is small text or a badge, not a color flood. Exceptions to the expected mode (a pump left in manual) deserve a quiet "abnormal" cue.
- **Use text and shape as well as fill.** The state must still read in greyscale.
- **Transitions** (starting, stopping) can use a distinct outline, such as dashed, so the operator sees something is changing.

For the Meridian Foods mixer M101 the UDT already has \`Sts.Running\`, \`Sts.Ready\`, \`Sts.Fault\` and \`Sts.Auto\`. Build the symbol from these four bits, and let the \`Alm.FailToStart\`, \`Alm.Overload\` and \`Alm.CommLoss\` alarms drive the priority indicator. The state symbol and the alarm indicator are separate things: a motor can be stopped with no alarm, or stopped with a high-priority fault.

## First-out and "what do I do"

In an upset, one trip often causes a cascade of alarms. The operator needs to know which came first. Mark the **first-out** alarm in the list and on the graphic (a small "1st" tag, see {{term:first-out-fault|first-out}}), and sort or group the consequent alarms below it. Without it, the operator troubleshoots the loudest symptom.

Then say what to do. A rationalized alarm has a recorded consequence of inaction and an operator action (see the rationalization worksheet in {{lesson:int-alarm-mgmt}}). Surface that in the display: a one-line action on the alarm row or in a click-through, such as "Check suction valve FV101 and reset M101 overload". A screen that says only "M101 Fault" asks the operator to remember the procedure. Alarm properties such as notes or associated data in Ignition can hold that text, so the list can show it (check the alarm properties reference for your version).

## Sound

An audible alarm is for when the operator is not looking at the screen. Practice that holds up:

- **Few, distinct tones** by priority, so priority is known by ear. Low priority may need no sound.
- **Acknowledge silences.** The operator controls the sound, with a clear way to silence it.
- **Do not sound for status or events.** Only for alarms that need a response.
- **Test in the room.** Loudness, background noise and shared spaces decide what works.
- **Browser sound is limited.** In Perspective, audio comes from the client browser, which commonly restricts autoplay until the user interacts with the page, and a session that is not open plays nothing. Do not rely on it as the only audible path for critical alarms. Hardware annunciators or a dedicated alarm client are the usual answer. See the audible alarm forum thread for the practical details.

I have not found a source for specific tone frequencies or volumes, so set them in your alarm philosophy rather than taking numbers from this lesson.

## Alarm floods on screens

A flood fills the list, blinds the banner and hides the important alarm. Design for it:

- **Counts first**, then the list, and a filter by area and priority.
- **Group consequential alarms** under the first-out.
- **Show shelved and suppressed counts** so the operator knows what is not being displayed.
- **Do not "fix" a flood with a bigger list.** Fix it upstream through rationalization, deadbands, delays and state-based suppression ({{lesson:int-alarm-mgmt}}).
- **Never hide an alarm from the list while it is active and unacknowledged**, even if the graphic is busy.

## Interlocks and permissives

A disabled Start button with no explanation is a trap. The operator needs to know *why*. Show the interlock or permissive chain next to the control: a short list of conditions with a clear met/not-met mark, and the first unmet one stated in words ("Start blocked: suction valve FV101 not open"). Distinguish three things on screen:

| Thing | Meaning | Presentation |
|---|---|---|
| Permissive | Condition that must be true to start | List with met/not-met marks beside the control |
| Interlock | Condition that forces a stop or blocks an action while true | Active interlock shown as an abnormal indicator with its cause |
| Hardwired safety | E-stop, overload, safety stop | Status only. It is monitored by the PLC, never defeated or controlled from the screen |

The house standard keeps overloads and E-stops hardwired. The screen reports them and does not offer a software bypass. Software permissives live in PLC logic and the screen shows their state. See {{lesson:hmi-interaction}} for control design.

## Bad and stale data

The worst thing a screen can do is show a number that looks live and is not. If a transmitter loop fails, a communication link drops, or a driver stops updating, the last good value may sit on screen looking exactly like a healthy reading. Operators then make decisions on a fiction.

Rules:

- **Never show a last-good value as if it were live.** On bad quality, replace or visually override the value.
- **Make the bad state unmistakable but not an alarm color.** Show dashes or a hatched field, a dashed outline, muted text, and a word such as "Bad" or "No data". The {{term:stale-data|stale}} cue should be a distinct, recognizable style (the HP-HMI class set uses a dashed outline and muted text).
- **Optionally show the last good value and its time**, clearly labelled ("last good 14:02: 3.5 m"), in a muted style.
- **Disable controls** that act on a bad value.
- **Treat questionable as questionable.** For a 4-20 mA loop, the house NAMUR table says 3.6–3.8 or 20.5–21 mA is indeterminate (uncertain quality), and below 3.6 or above 21 mA is a device or loop failure (bad). Carry that distinction to the display ({{term:ign-quality-code|quality code}}).
- **Detect a frozen value.** A value can be good quality and unchanging because a source stopped. Use a heartbeat or watchdog and show a communication-loss state, as the \`Alm.CommLoss\` member in the motor UDT does.

Ignition helps: Perspective and Vision components show quality overlays when a bound tag's quality is not good, and a binding can opt out of that overlay. Do not opt out unless you replace it with a better cue. In expressions use \`isGood()\` and \`isBad()\`, and never compare to a number such as 192 (see the quality code note in the Ignition 8 reference).

## Doing it in Perspective

1. **Drive the cues from the tag, not from scripts.** Alarms are configured on tags, such as the UDT's \`Alm\` members, with a priority each. A tag with alarms exposes runtime alarm metrics, including \`ActiveUnackCount\` (active and unacknowledged) and a \`HasUnacknowledged\` flag, from the Tag Diagnostics metrics. Bind a symbol's class expression to them (see the worked expression in {{lesson:persp-hphmi}}).
2. **Get priority from one script or the alarm status table**, not per symbol. A per-screen script that calls \`system.alarm.queryStatus\` once and stores a dict keyed by source path is cheaper than per-symbol queries.
3. **Make classes for each cue**: \`hmi/alarm-1\` to \`hmi/alarm-4\`, \`hmi/abnormal\`, \`hmi/bad-quality\`, \`hmi/flash\` (a CSS animation applied only when unacknowledged). Put the shape in the symbol view and swap it with the priority, so the shape does not depend on the class color.
4. **Alarm Status Table**: its \`rowStyles\` object has per-state entries (active unacknowledged, active acknowledged, cleared unacknowledged, cleared acknowledged) that take style classes, so unacknowledged rows can flash and acknowledged rows go steady.
5. **Quality**: in a reusable value view, bind the display with \`if(isGood({value}), numberFormat({value},'0.0'), '---')\` and a class that switches to \`hmi/bad-quality\`.
6. **Symbols as reusable embedded views** with a \`tagPath\` parameter, one for equipment state and one for the alarm indicator, so M101 and P101 behave identically.
7. **Test the cue states**: all normal, one alarm per priority, unacknowledged, acknowledged, cleared-unacknowledged, shelved, bad quality, stale, and communication loss. Test them in greyscale.

## Rules of thumb

- Priority is color plus shape plus number or word. If it fails in greyscale, it fails.
- Alarm colors are only for alarms. Normal equipment is plain.
- An indicator sits next to the value it belongs to. Banner counts unacknowledged alarms by priority.
- Flash only unacknowledged alarms, only the small indicator, slowly and in sync, with the rate agreed with operators.
- State uses text, outline and fill intensity, never the alarm palette.
- Mark first-out. Put the operator action one click away.
- Say why a control is blocked, in words, beside the control.
- Bad or stale data never looks live. Dashes, dashed outline, a word, controls disabled.
- Fix floods upstream. The screen shows counts, groups and shelved totals.

## Try it on your own screens

1. Print or screenshot an alarm-heavy screen and convert it to greyscale. Can you still tell the priorities and states apart?
2. List the colors used for equipment state. Are any of them also used for alarms? Remove the overlap.
3. Find every flashing element. Which are unacknowledged alarms, and which are decoration? Remove the decoration.
4. Unplug or force a tag to bad quality in a test project. What does the screen show? Does the old value still look live?
5. Find a disabled Start button. Add the list of unmet permissives beside it.
6. Pick one alarm and write the one-line operator action. Does the display show it?
`,

  eli5: `
Think about a classroom. When everything is normal, the room is calm and nobody stands out. If a child gets sick, a teacher wants to notice right away, so the sick child gets a clear sign: a bright badge, a different shape of badge for "needs help now" versus "needs help soon", and a word on the badge, in case a teacher cannot tell colors apart.

If every child wore a bright colored shirt for every little thing (running, resting, reading, napping), the teacher could never pick out the one who needs help. That is the rainbow problem.

A blinking light is like a hand waving: it grabs attention. But once the teacher says "I see you", the hand should stop waving and the child just stays marked until they are fine. And if the child's name tag shows yesterday's temperature as if it were today's, that is worse than no tag, so a tag that is out of date must look out of date.
`,

  why: `
**Why redundant coding?** A signal carried by color alone fails for the colour-blind, under glare and on aged displays. Adding shape and text costs little and means the signal survives when one channel fails. This is the same idea as a traffic light's position, which tells a colour-blind driver which lamp is lit.

**Why quiet normal?** Attention is limited. If normal equipment is colored, the abnormal one must outshout it, and the screen gets louder every year. A quiet baseline keeps the signal-to-noise ratio high. Integrators do argue about this: some operators like to see green for running because that is how the old panel looked. The compromise is to drop the color but keep the information as text or an outline, and to test it with the operators who will use it.

**Why flash only the unacknowledged?** Motion is a strong cue because the visual system is built to detect it, which is why flashing works. The same property makes it expensive: constant motion fatigues, and motion for everything means motion for nothing. Acknowledgment is the natural moment to stop, because it records that a person has noticed. The opposing view is that a critical alarm should keep flashing until it clears. The ISA-18.2 lifecycle gives you the place to decide that, in the philosophy document, instead of case by case.

**Why show the reason for a block?** A disabled button transfers the diagnostic work to the operator at the worst moment. The PLC already knows which permissive is unmet. Showing it costs a few bindings and saves minutes in a startup or an upset.

**Why be paranoid about stale data?** Industrial systems fail quietly: a network cable is pulled, a driver stalls, a cached value persists. An operator who trusts a frozen number can overfill a tank. A screen is a statement of what the system knows, so when the system does not know, the screen must say so.
`,

  history: `
Early panel annunciators used lit windows that flashed until acknowledged and then stayed on until cleared, which is where the flash-then-steady convention comes from. When graphics moved to screens, designers added color for everything because they could. High-performance HMI work, drawing on research by the ASM Consortium and later codified in ISA-101.01, reversed that with restrained color and redundant coding. ISA-18.2 and EEMUA 191 supplied the alarm-system side.
`,

  examples: [
    {
      title: "M101 state and alarm indicator",
      body: `Embedded view \`hmi/MotorState\` with \`tagPath\` = \`[default]Plant1/Area10/Line1/M101\`. It draws the motor symbol in plain grey line art when \`Sts.Running\`, a hollow outline with the word "Stopped" when not, and a small "Auto" or "Man" badge from \`Sts.Auto\`. A second view, \`hmi/AlarmIndicator\`, sits to its upper right. It shows the priority shape and number, flashes while \`ActiveUnackCount\` > 0, and goes steady after acknowledgment.`
    },
    {
      title: "Blocked start explained",
      body: `Start M101 is disabled. Beside it: "Start blocked. 1 of 3 permissives not met" and a click-through list: Suction valve FV101 open (not met), Tank level above low (met), No active fault (met). The permissives are PLC logic bits. The screen only displays them.`
    }
  ],

  diagrams: {
    symbols: `<svg viewBox="0 0 640 270" role="img" aria-label="Alarm priority symbol set: priority 1 square with number 1, priority 2 triangle with number 2, priority 3 diamond with number 3, priority 4 circle with number 4, each with name and behavior.">
  <text class="dg-title" x="20" y="26">Priority symbol set (color + shape + number)</text>
  <rect class="dg-fill-alarm" x="30" y="46" width="34" height="34"/>
  <text class="dg-title" x="76" y="70">1</text>
  <text class="dg-text" x="110" y="68">Critical</text>
  <text class="dg-text-muted" x="230" y="68">flashes until acknowledged, then steady</text>
  <polygon class="dg-fill-warn" points="47,102 30,138 64,138"/>
  <text class="dg-title" x="76" y="130">2</text>
  <text class="dg-text" x="110" y="128">High</text>
  <text class="dg-text-muted" x="230" y="128">flashes until acknowledged, then steady</text>
  <polygon class="dg-fill-accent" points="47,162 30,180 47,198 64,180"/>
  <text class="dg-title" x="76" y="190">3</text>
  <text class="dg-text" x="110" y="188">Medium</text>
  <text class="dg-text-muted" x="230" y="188">flashes until acknowledged, then steady</text>
  <circle class="dg-fill-ok" cx="47" cy="226" r="17"/>
  <text class="dg-title" x="76" y="236">4</text>
  <text class="dg-text" x="110" y="234">Low</text>
  <text class="dg-text-muted" x="230" y="234">no flash, steady until cleared</text>
  <text class="dg-text-muted" x="30" y="262">Remove color and the shape plus number still carry priority.</text>
</svg>`,
    states: `<svg viewBox="0 0 640 290" role="img" aria-label="Left: rainbow state coloring where running, stopped, standby and fault are all bright fills. Right: quiet states where running is plain grey, stopped is hollow with a word, and fault shows an alarm symbol with the word Fault.">
  <text class="dg-title" x="20" y="26">Rainbow (everything shouts)</text>
  <rect class="dg-box-ok" x="20" y="44" width="130" height="50" rx="6"/>
  <text class="dg-text" x="34" y="74">P101 Run</text>
  <rect class="dg-box-alarm" x="160" y="44" width="130" height="50" rx="6"/>
  <text class="dg-text" x="174" y="74">P102 Stop</text>
  <rect class="dg-box-warn" x="20" y="104" width="130" height="50" rx="6"/>
  <text class="dg-text" x="34" y="134">M101 Hold</text>
  <rect class="dg-box-accent" x="160" y="104" width="130" height="50" rx="6"/>
  <text class="dg-text" x="174" y="134">M102 Auto</text>
  <text class="dg-text-muted" x="20" y="184">Stopped looks as loud as a fault.</text>
  <text class="dg-text-muted" x="20" y="204">Normal is the brightest thing.</text>
  <text class="dg-title" x="340" y="26">Quiet (only abnormal stands out)</text>
  <rect class="dg-box" x="340" y="44" width="130" height="50" rx="6"/>
  <text class="dg-text" x="354" y="74">P101 Run</text>
  <rect class="dg-box dg-dash" x="480" y="44" width="130" height="50" rx="6" fill="none"/>
  <text class="dg-text" x="494" y="74">P102 Stopped</text>
  <rect class="dg-box" x="340" y="104" width="130" height="50" rx="6"/>
  <text class="dg-text" x="354" y="134">M101 Auto</text>
  <rect class="dg-box" x="480" y="104" width="130" height="50" rx="6"/>
  <text class="dg-text" x="494" y="134">M102 Fault</text>
  <polygon class="dg-fill-warn" points="590,100 578,122 602,122"/>
  <text class="dg-text-sm" x="584" y="120">2</text>
  <text class="dg-text-muted" x="340" y="184">Run is plain. Stopped is hollow and labelled.</text>
  <text class="dg-text-muted" x="340" y="204">The fault carries a priority symbol and a word.</text>
  <text class="dg-text-muted" x="20" y="256">Both columns must read in greyscale. Only the right one does.</text>
</svg>`
  },

  pitfalls: [
    "Carrying alarm priority in color alone.",
    "Using alarm colors for ordinary equipment states, so alarm color stops meaning anything.",
    "Flashing running equipment, values or whole backgrounds as decoration.",
    "Showing the last good value in the normal style after a quality or communication failure.",
    "Disabling a control with no explanation of which permissive is unmet.",
    "Offering a screen button that bypasses a hardwired safety. Safety status is display only.",
    "Hiding active unacknowledged alarms from the list during a flood.",
    "Typing alarm priorities or limits onto the graphic instead of reading them from the alarm configuration.",
    "Relying on browser audio as the only audible alarm path for critical alarms."
  ],

  keyTerms: ["alarm-priority", "first-out-fault", "stale-data", "ign-quality-code", "alarm-flood", "interlock", "permissive", "redundant-coding", "style-class"],

  quiz: [
    {
      q: "A style guide says Critical = red, High = orange, Medium = yellow, Low = cyan, with identical square badges. What is the main weakness?",
      options: ["Too many colors","Squares are hard to draw","Badges are too small","Priority is carried by color alone, so it fails for colour-blind users and in glare"],
      answer: 3,
      explain: [
        "Four colors is fine. The issue is what happens when color is lost.",
        "Drawing difficulty is not the concern.",
        "Size can matter, but the fundamental defect is single-channel coding.",
        "Correct. Shape and a number or word are the redundant channels. With identical squares, greyscale loses the priority."
      ]
    },
    {
      q: "P101 is intentionally stopped between batches. Which presentation fits a quiet HMI?",
      options: ["Solid red fill so no one forgets","Flashing yellow","A hollow outline with the word 'Stopped', and no alarm indicator","Hide the pump"],
      answer: 2,
      explain: [
        "Red is reserved for alarms. An expected stop is not one.",
        "Flashing is only for unacknowledged alarms.",
        "Correct. State is shown by form and text, and no alarm cue appears because nothing abnormal exists.",
        "Hiding equipment removes the operator's overview."
      ]
    },
    {
      q: "When should an alarm indicator flash?",
      options: ["Whenever the condition is active","While the alarm is unacknowledged, then go steady after acknowledgment while the condition persists","Only when the alarm clears","Never, because flashing is distracting"],
      answer: 1,
      explain: [
        "Flashing for the whole active period fatigues the operator and loses the meaning of acknowledgment.",
        "Correct. Motion draws the eye until a person has noticed, and acknowledgment stops it.",
        "A cleared-unacknowledged state may justify a different cue, but this is not the general rule.",
        "Never is too strong. Motion is the strongest peripheral cue and is worth using for the unacknowledged."
      ]
    },
    {
      q: "LT101's 4-20 mA loop fails and the driver stops updating. The Label still shows 3.5 m in the normal style. What is wrong and what is the fix?",
      options: ["The screen presents a stale value as live. Use quality in the binding to show dashes or a bad-quality style, optionally the last-good time, and disable dependent controls","Nothing, the value is the last known","Increase the polling rate","Color the value red"],
      answer: 0,
      explain: [
        "Correct. A bad-quality state must be visibly distinct and never look live. Quality overlays or explicit expressions with isGood() do this.",
        "That is the core hazard: the operator will act on a fiction.",
        "The loop has failed, so faster polling returns the same bad data.",
        "Red is an alarm color. A bad-data cue should be different and say what is wrong."
      ]
    },
    {
      q: "The Start button for M101 is disabled and the operator asks you why. What is the best design change?",
      options: ["Show a short permissive list with met/not-met marks and the first unmet condition in words beside the button","Remove the button when disabled","Make the button flash","Add a popup that says 'Error'"],
      answer: 0,
      explain: [
        "Correct. The PLC logic knows the unmet condition. Displaying it saves time in startup and upsets.",
        "Removing the button hides the control and the reason.",
        "Flashing is reserved for unacknowledged alarms.",
        "A generic error gives the operator no direction."
      ]
    },
    {
      q: "In Perspective, you need the alarm priority for 60 symbols on a unit screen. What is the efficient approach?",
      options: ["A script call to system.alarm.queryStatus inside each symbol","Hard-code the priority on each symbol","Skip priority and use one color","One per-screen query (or the alarm status data) stored in a dict keyed by source path, with symbols reading from it"],
      answer: 3,
      explain: [
        "Sixty queries per refresh per session adds needless load.",
        "Hard-coded priorities drift from the alarm configuration.",
        "Dropping priority removes information the operator needs.",
        "Correct. One query per screen refreshed modestly, shared by all symbols, matches the approach in the HP-HMI lesson."
      ]
    },
    {
      q: "A flood of 40 alarms follows a pump trip. Which screen behavior helps most?",
      options: ["Show all 40 with equal prominence","Flash all 40","Mark the first-out, group the consequential alarms beneath it, and show counts by priority","Hide acknowledged ones and unacknowledged ones"],
      answer: 2,
      explain: [
        "Equal prominence hides the cause among the symptoms.",
        "Flashing 40 items is a strobe and gives no direction.",
        "Correct. First-out identifies the cause, grouping reduces noise, and the counts keep the operator oriented.",
        "Hiding unacknowledged alarms is never acceptable."
      ]
    }
  ],

  resources: [
    { title: "High Performance Graphics to Maximize Operator Effectiveness", url: "https://www.isa.org/getmedia/06130a38-f7af-4b35-8c9c-2c34f25c1977/The-High-Performance-HMI-Overview-v2-01.pdf", type: "article", source: "ISA" },
    { title: "ISA-101.01, Human Machine Interfaces for Process Automation Systems", url: "https://www.isa.org/intech/2020/september-october/isa-101-01-human-machine-interfaces-for-process-au", type: "article", source: "ISA InTech" },
    { title: "ISA-101 Series of Standards", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards", type: "standard", source: "ISA" },
    { title: "High Performance SCADA alarming (forum discussion on flash rate and colors)", url: "https://forum.inductiveautomation.com/t/high-performance-scada-alarming/71169", type: "forum", source: "Inductive Automation Forum" },
    { title: "Tag Alarm Properties (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/tags/tag-properties/tag-alarm-properties", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - Alarm Status Table", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-display-palette/perspective-alarm-status-table", type: "docs", source: "Inductive Automation" },
    { title: "Quality Codes and Overlays", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/tags/quality-codes-and-overlays", type: "docs", source: "Inductive Automation" },
    { title: "Understanding SC 1.4.1: Use of Color", url: "https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html", type: "standard", source: "W3C WAI" }
  ]
});
