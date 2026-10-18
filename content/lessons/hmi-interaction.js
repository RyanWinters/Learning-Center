LC.lesson({
  id: "hmi-interaction",
  title: "Controls, faceplates and preventing operator error",
  track: "hmi",
  minutes: 20,
  level: 3,
  prereqs: ["hmi-layout"],
  tags: ["hmi", "faceplate", "controls", "touch", "confirmation", "poka-yoke", "motor", "usability"],
  summary: "How to make a control look like a control, size it for a gloved thumb, confirm it only when it matters, and lay out a motor faceplate that tells the operator what will happen before they press anything.",
  objectives: [
    "Separate commands from status so nothing on the screen is both an indicator and a button",
    "Size and space touch targets using published guidance and Fitts' law, including a plan for gloves",
    "Choose between direct action, select-then-act, confirmation and undo for a given risk level",
    "Show \"command sent\" and \"equipment responded\" as two different facts, with sensible timing",
    "Lay out a faceplate for the house Motor UDT, including mode, permissives and interlock reasons",
    "Design numeric entry that shows units and limits and refuses bad values",
    "Apply poka-yoke thinking to remove error-prone steps instead of warning about them"
  ],

  body: `
## Why interaction design is a safety topic

Reading a screen is only half the job. The other half is changing something: starting a motor, opening a valve, typing a setpoint. Every one of those is a chance to do the right thing to the wrong item, or the wrong thing to the right item, at 3 a.m. with a phone ringing. Good interaction design makes the right action easy and the wrong action hard or impossible, so you do not need to rely on the operator's vigilance. This lesson assumes you already know how to build a faceplate (see {{lesson:persp-library}} and {{lesson:persp-embedding}}) and the reservation rules for color (see {{lesson:persp-hphmi}}). It is about what the faceplate should contain and how each control should behave.

## Affordances: what looks clickable

An {{term:affordance|affordance}} is a visual hint about what you can do with an object. Operators learn the hints once and then rely on them without reading. Pick a small set and never break it:

| Element | Looks like | Rule |
|---|---|---|
| Command button | Raised or outlined box with a verb label ("Start", "Stop") | The only thing that looks like this on the screen |
| Status indicator | Flat shape or text, no border, no hover effect | Never clickable |
| Navigation link | Underlined or tab-shaped text | Takes you somewhere, never changes the process |
| Disabled control | Same shape, dashed or faded outline, muted text | Shown with the reason, see below |
| Input field | Inset box with a visible unit and limits | Tapping opens an entry pad |

The rule that causes the most field trouble: **never make a status indicator also a button.** A box that reads "M101 RUN" in a raised shape can mean "M101 is running" or "press to run M101". Operators have stopped pumps by touching what they thought was a lamp. Show state with a flat indicator on the process graphic, and let the operator open the faceplate to command. Commands live in one predictable place. If you must put a command on an overview, it is a clearly labeled verb button ("Start M101") that is a different shape from any status.

> [!tip] Hover does not exist on a touchscreen
> In Perspective the hover style is invisible on tablets and panels. Do not rely on a hover highlight to tell the operator something is clickable. The resting appearance must already say it.

## Target size, spacing and Fitts' law

Fitts' law is a well-tested model of pointing: the time to hit a target grows with the distance to it and shrinks as the target gets bigger. A common form is \`MT = a + b * log2(D / W + 1)\`, where D is distance, W is target width, and a and b are constants measured for a device and user. Two practical consequences: make important targets big, and put targets that are used in sequence close to each other. Very small targets also raise the error rate, which matters more than speed on a plant screen.

Published guidance gives you a floor to start from. The W3C's WCAG 2.1 enhanced target size criterion (2.5.5) asks for pointer targets of at least 44 by 44 CSS pixels, and its own explanation says larger is better for avoiding accidental activation. Google's Material guidance uses 48 dp, which it says works out to about 9 mm physical size regardless of screen. The W3C mobile accessibility task force proposed the same 9 mm by 9 mm minimum. Apple's iOS guidance is commonly quoted as 44 points. These numbers are for bare fingers on a phone or tablet. They are a minimum, not a goal.

{{diagram:targets}}

Note that 44 CSS pixels and 9 mm are not the same thing. A pixel's physical size depends on the screen. Measure on the real panel: draw a 9 mm square with a ruler on a printout and compare, or ask the vendor for the panel's pixel density.

### Gloves, sweat and vibration

The guidance above does not cover gloves. Nitrile, cut-resistant and insulated gloves reduce accuracy, and many resistive and capacitive panels need a glove-capable setting. Treat the 44 to 48 px figure as the smallest target on any screen, and make critical command buttons clearly larger. Then test with the actual gloves worn on your actual site. If the panel is also on a vibrating skid, test it there too.

### Spacing is as important as size

- Leave a gap between adjacent targets. 8 px is a common floor. For a Start and Stop pair, separate them further than that and give them different positions and weights so a slip does not hit the neighbour.
- Do not put a rarely-used destructive command next to a frequently-used harmless one.
- Keep the same control in the same place on every faceplate. Muscle memory is a safety feature.

## Commands, status and the two kinds of feedback

A command is a request. Status is what the equipment actually did. These are two different facts, and the screen should show both.

{{diagram:feedback}}

Nielsen's response-time limits (from NN/g, based on his 1993 work) give you timing targets. About **0.1 s** feels instantaneous. About **1 s** keeps the user's flow of thought. Around **10 s** is where attention is lost. For a control:

1. **Within about 100 ms of the touch**, change the control's own appearance (pressed state, "Sending..."). This tells the operator the screen registered the touch. It says nothing about the plant.
2. **Within about a second**, show that the command reached the controller. In practice this means the write to \`M101.Cmd.Start\` succeeded and the PLC cleared the bit. In Ignition, script writes can fail, so check the result of the write and show a failure plainly.
3. **When the equipment responds**, show the real status: \`M101.Sts.Running\` is true. Starting a large motor can legitimately take several seconds because of \`Cfg.StartDelay\`, a soft start or a ramp.
4. **If it never responds**, set a per-equipment timeout and show "No response from M101 after 5 s" as an abnormal state. This is the \`Alm.FailToStart\` condition in the house UDT. The 5 s here is an example, not a standard: use the equipment's real start time plus margin.

Never show the running state because the operator pressed Start. Show it because \`Sts.Running\` came back true. A screen that pretends the command worked is worse than one that is slow.

## Confirm, select, or just do it

More confirmation is not safer. NN/g warns that users who get a dialog after every decision learn to click through without reading, and says to reserve confirmation dialogs for high-impact actions and label the confirm button with the specific verb ("Stop M101") instead of "OK". It also recommends undo as the better protection where the action can be reversed, because undo adds no step to every action.

| Risk of the action | Pattern | Example |
|---|---|---|
| Harmless and reversible | Act immediately, show feedback | Opening a trend, changing a display range |
| Reversible process change | Act immediately with a visible, quick reverse | Start/Stop a transfer pump in manual |
| Hard to reverse, or affects product or people | Select, then act (two taps), or a confirmation that names the equipment and the consequence | Dump a batch, change a recipe, bypass an interlock |
| Safety or regulatory impact | Authorization (role, sometimes a second person), reason code, logged | Override a safety bypass, edit alarm limits |

**Select-then-act** (select the equipment, then press the verb) is a lighter pattern than a dialog. The faceplate itself is the "select" step: you opened M101's faceplate, its name is in the header, and then you press Stop. That is why a tag-aware popup is safer than a global Stop button.

A confirmation that is worth having says exactly what will happen: "Stop M101 Mixer agitator? Batch B2210 is in step 4 (Mixing)." A confirmation that is not worth having says "Are you sure?".

> [!warning] Confirmation fatigue
> If operators see a dialog more than a few times a shift, they will stop reading it. Count the dialogs during a normal shift (see {{lesson:hmi-process}}). Remove the ones for reversible actions and spend the budget on the ones that matter.

### Undo and safe defaults

Where the physics allows, offer a quick reverse: a setpoint change shows the previous value and a "Revert" button for a minute. Many process actions cannot be undone, so the safe default is the real protection: entry fields start with the current value, never blank or zero; a dropdown that selects a recipe does not default to the previous batch's; a dialog's default button is the safe one (Cancel); a selection times out after, say, 30 seconds and goes back to idle.

## A faceplate for the house Motor UDT

The Motor UDT (\`Cmd\`, \`Sts\`, \`Cfg\`, \`Alm\`) already tells you what the faceplate needs. One \`tagPath\` parameter (\`[default]Plant1/Area10/Line1/M101\`) feeds every binding.

{{diagram:faceplate}}

What goes on it, and why:

- **Header.** Equipment tag, description (\`Cfg.Description\`), and where it lives. The name is the "select" step. It must be impossible to open the wrong faceplate without noticing.
- **State and mode.** \`Sts.Running\`, \`Sts.Fault\`, \`Sts.Auto\` as words ("Stopped", "Manual"), not just colors. In auto, the sequence owns the motor. In manual, the operator does. Make that visible and gate the buttons on it.
- **Commands.** \`Cmd.Start\`, \`Cmd.Stop\`, \`Cmd.Reset\` as three verb buttons, always in the same positions. Buttons that cannot apply right now are shown disabled (dashed outline, muted text) and never hidden, because a button that vanishes teaches the operator nothing.
- **Permissives and interlock reasons.** A {{term:permissive|permissive}} is a condition that must be true before a start. List each one with a plain "MET" or "NOT MET". When Start is disabled, say why in one line: "Start blocked: FV101 discharge valve is not open." The PLC should publish the reason (a bit or code per permissive), because the HMI should not re-implement the logic. An unexplained greyed-out button is a support call at 3 a.m. For an {{term:interlock|interlock}} that stops the motor, show which one tripped.
- **Hardwired protection is context, not a command.** E-stop and overload are in the starter circuit by house standard. The faceplate shows their state (\`Alm.Overload\`, a monitored E-stop contact) but never offers a button that claims to defeat them.
- **Feedback strip.** The last command, when it was sent, and whether the equipment confirmed it.
- **Alarms.** \`Alm.FailToStart\`, \`Alm.Overload\`, \`Alm.CommLoss\` shown as a quiet "none active" and only loud when active. See {{lesson:hmi-abnormal}}.
- **Secondary info.** Run hours (\`Sts.RunHours\`), configuration (\`Cfg.StartDelay\`) and links to trends and maintenance, further down or behind a role check. Do not let them compete with the command area.

> [!note] Mode requests
> The house UDT exposes \`Sts.Auto\` but no mode command. If you add a mode request member, treat it exactly like Start and Stop: gated, with the same two-stage feedback. Do not write the status bit from the HMI.

### Role and write protection

Disable commands for users without the role, and say why ("Requires Operator role"). Do the enforcement on the server side too: a Perspective component being disabled is not security. See {{lesson:ign-security}}.

## Keyboard and numeric entry

Typing a number is where most real damage happens: 1,150 becomes 11,500, a decimal point goes missing, or 5.0 m is entered as 50.

- Show the **current value, the unit and the allowed range** next to the field. "1,150 rpm, allowed 600 to 1,800".
- **Refuse** an out-of-range value with a message that includes the range. Do not silently clamp it. Clamping hides the mistake.
- Use a numeric pad that matches the field (no letters), large keys, and a visible display of what was typed before it is applied.
- Separate **entering** from **applying**: the value is staged in the field, and a distinct Apply button writes it. A tab key or a stray touch should never write to the plant.
- Enforce the limits in the PLC too. The HMI limit is courtesy, the PLC limit is protection.
- Show the result: after Apply, display "Setpoint 1,150 rpm applied 14:02:11" once the status confirms.

In Perspective, the Numeric Entry Field has input-bounds properties in the 8.1 manual, and the 8.3 Form component has number constraints with min and max and messages for out-of-range input. Confirm which component and property names your version uses in the manual. On touch devices, check how the on-screen keyboard behaves, see {{lesson:persp-mobile}}.

## Tablets and phones

- No hover, no right-click, no precise pointer. Every function must be reachable by tap.
- Glare and gloves reduce accuracy further. Test outdoors if the tablet goes outdoors.
- Gestures such as pull-to-refresh and swipe-back can fire by accident next to a control. Keep controls away from screen edges.
- Decide as a policy, not per screen, whether control from a phone is allowed. Many sites allow view-only on personal devices and control only on fixed stations.
- Show connection state prominently. A tablet that lost Wi-Fi must not look like a working screen.

## Poka-yoke: build the mistake out

Poka-yoke is a manufacturing idea (mistake-proofing) from Shigeo Shingo's work on Toyota's production system: design the process so the error cannot happen, or is caught immediately, rather than asking people to be careful. On an HMI:

| Mistake | Poka-yoke |
|---|---|
| Commanding the wrong pump | Command only from its own faceplate, with name in the header |
| Start and Stop hit by accident | Different positions, sizes and separation |
| Typing a bad number | Bounds, units, staged Apply |
| Commanding in the wrong mode | Disable by mode with the reason shown |
| Believing a command worked | Show equipment status, not command intent |
| Leaving something selected | Selection timeout |

Nielsen's usability heuristics list this directly as "error prevention", and the full list is used in {{lesson:hmi-process}}.

## If you already build Perspective

- **One faceplate, one parameter.** Derive every member path from \`tagPath\`. Put the permissive list in a repeater driven by a PLC-published array so you never rebuild the view for a new motor.
- **Disable, do not hide.** Use \`enabled\` and a style class for the disabled look. Pair it with a text line that explains why.
- **Write results.** Use \`system.tag.writeAsync\` carefully, or a binding with a write confirmation, and look at the returned quality codes. Do not assume the write worked.
- **Count your dialogs.** Search the project for popups opened from button actions and decide which deserve to stay.
`,

  eli5: `
Think about the buttons in a car. The horn is big, in the middle of the wheel, and you can find it with your eyes closed. The hazard button is separate and has a different shape, so you do not hit it when you want the horn. When you turn the key, the engine makes a noise and the dashboard lights up, so you know it worked. And the car will not let you pull the key out while it is moving.

A screen for a machine should work like that. Buttons look like buttons and nothing else does. They are big enough to press with a thick glove. Two buttons you should never mix up are far apart. When you press one, the screen tells you two things: "I heard you" right away, and "the machine actually did it" a moment later. If the machine cannot do it right now, the button is greyed out and a short sentence tells you why, such as "the door is open".

The best protection is not a sign saying "be careful". It is making the wrong thing impossible, the same way a car will not let you take the key out while it is driving.
`,

  why: `
**Why separate command from status?** Because they answer different questions and they fail differently. Status says what the plant is doing. A command says what a person asked for. If one object shows both, the operator cannot tell a lamp from a switch, and a screen that flips to "Running" on press hides a motor that never started. Many incidents in the human-factors literature involve an operator believing the plant was in a state it was not in. Separating the two keeps that belief honest.

**Why not confirm everything?** It is tempting, because a dialog feels like diligence. The trade-off is that every confirmation spends the operator's attention and trains the habit of clicking Yes. NN/g makes the same point for ordinary software. In a control room the effect is stronger, because the same operator does the same action hundreds of times a year. Confirmation gives real protection only when it is rare, specific and tied to a consequence. Experienced integrators argue about where to draw the line, and the honest answer is to draw it with the operators and the process hazard analysis, then check by counting how often each dialog appears.

**Why disabled-with-a-reason beats hidden?** A hidden Start button makes the operator think the screen is broken or that they are in the wrong place. A disabled button with "Start blocked: FV101 not open" teaches the plant. It also halves the phone calls to the control room engineer, because the interlock explains itself. The tradeoff is that your PLC must publish the reason. That work belongs in the controller, not in script.

**Why do the limits twice?** The HMI check gives instant feedback. The PLC check is the one that cannot be bypassed by another client, a script or a stale screen. Doing both costs a few minutes and removes a class of incident.

**Where people disagree.** Some sites forbid any control from tablets. Others allow it with a role check and a proximity requirement. Some insist on select-before-operate for every command, others only for critical ones. There is no universal answer. What works is deciding the policy, writing it into the HMI style guide, and applying it the same way everywhere.
`,

  history: `
Fitts' law is a model of pointing time from experimental psychology that interface designers adopted decades ago. Nielsen's three response-time limits come from his early 1990s usability work and are still cited by NN/g. Poka-yoke (mistake-proofing) comes from Japanese manufacturing, associated with Shigeo Shingo and the Toyota production system. Process-control standards groups apply the same thinking through the HMI philosophy and style guide described in ISA-101.
`,

  examples: [
    {
      title: "A blocked start, explained",
      body: `An operator opens M101 in manual and the Start button is dashed. The reason line reads "Start blocked: FV101 discharge valve is not open." The PLC publishes a permissive word where bit 2 is FV101 open. The view binds the reason text to the first unmet permissive. The operator opens FV101 from its own faceplate, the reason clears, and Start becomes active. Nobody called the control room.`
    },
    {
      title: "A stuck start, shown honestly",
      body: `The operator presses Start at 14:02:40. The button shows "Sending..." at once, then "Sent 14:02:40" as the write completes. \`Cfg.StartDelay\` is 3,000 ms, so 3 s later \`Sts.Running\` should be true. It is not, and at 5 s the faceplate shows "No response from M101" and \`Alm.FailToStart\` goes active. The screen never claimed the motor was running.`
    }
  ],

  diagrams: {
    targets: `<svg viewBox="0 0 640 210" role="img" aria-label="Touch target sizes drawn at one SVG unit per pixel: 24 pixels is too small, 44 and 48 pixels meet guidance, and adjacent buttons need a gap">
  <text class="dg-title" x="20" y="26">Touch targets drawn at 1 unit = 1 CSS px</text>
  <rect class="dg-box" x="30" y="56" width="24" height="24" rx="3"/>
  <text class="dg-text-sm" x="30" y="108">24 px</text>
  <text class="dg-text-muted" x="30" y="126">Too small to hit</text>
  <text class="dg-text-muted" x="30" y="142">reliably under stress</text>
  <rect class="dg-box-accent" x="170" y="56" width="44" height="44" rx="4"/>
  <text class="dg-text-sm" x="170" y="126">44 px</text>
  <text class="dg-text-muted" x="170" y="142">WCAG 2.1 AAA 2.5.5</text>
  <text class="dg-text-muted" x="170" y="158">minimum</text>
  <rect class="dg-box-accent" x="320" y="56" width="48" height="48" rx="4"/>
  <text class="dg-text-sm" x="320" y="126">48 px</text>
  <text class="dg-text-muted" x="320" y="142">Material 48 dp,</text>
  <text class="dg-text-muted" x="320" y="158">about 9 mm</text>
  <rect class="dg-box-accent" x="470" y="56" width="64" height="48" rx="4"/>
  <rect class="dg-box" x="542" y="56" width="64" height="48" rx="4"/>
  <text class="dg-text-sm dg-mid" x="502" y="85">Start</text>
  <text class="dg-text-sm dg-mid" x="574" y="85">Stop</text>
  <text class="dg-text-sm" x="470" y="126">Pair with 8 px gap</text>
  <text class="dg-text-muted" x="470" y="142">Floor, not target.</text>
  <text class="dg-text-muted" x="470" y="158">Go bigger for gloves.</text>
  <text class="dg-text-muted" x="20" y="194">Sizes are bare-finger guidance. Test critical buttons with your site's gloves.</text>
</svg>`,

    feedback: `<svg viewBox="0 0 640 220" role="img" aria-label="Four stages of a command: touch registered within 100 ms, command written to the controller within about a second, equipment status confirmed, or a timeout shown as no response">
  <defs>
    <marker id="hmi-interaction-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="26">One press, three separate facts</text>
  <rect class="dg-box" x="20" y="44" width="130" height="78" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="66">1. Touch seen</text>
  <text class="dg-text-muted dg-mid" x="85" y="86">Button shows</text>
  <text class="dg-text-muted dg-mid" x="85" y="102">pressed, Sending</text>
  <rect class="dg-box" x="175" y="44" width="130" height="78" rx="6"/>
  <text class="dg-text-sm dg-mid" x="240" y="66">2. Command sent</text>
  <text class="dg-text-muted dg-mid" x="240" y="86">Write accepted,</text>
  <text class="dg-text-muted dg-mid" x="240" y="102">Cmd.Start seen</text>
  <rect class="dg-box" x="330" y="44" width="130" height="78" rx="6"/>
  <text class="dg-text-sm dg-mid" x="395" y="66">3. PLC acts</text>
  <text class="dg-text-muted dg-mid" x="395" y="86">Logic runs,</text>
  <text class="dg-text-muted dg-mid" x="395" y="102">StartDelay, ramp</text>
  <rect class="dg-box-accent" x="485" y="44" width="135" height="78" rx="6"/>
  <text class="dg-text-sm dg-mid" x="552" y="66">4. Equipment</text>
  <text class="dg-text-muted dg-mid" x="552" y="86">Sts.Running is</text>
  <text class="dg-text-muted dg-mid" x="552" y="102">true: show Running</text>
  <line class="dg-line" x1="150" y1="83" x2="173" y2="83" marker-end="url(#hmi-interaction-ah)"/>
  <line class="dg-line" x1="305" y1="83" x2="328" y2="83" marker-end="url(#hmi-interaction-ah)"/>
  <line class="dg-line" x1="460" y1="83" x2="483" y2="83" marker-end="url(#hmi-interaction-ah)"/>
  <text class="dg-text-sm dg-mid" x="85" y="146">within ~0.1 s</text>
  <text class="dg-text-sm dg-mid" x="240" y="146">within ~1 s</text>
  <text class="dg-text-sm dg-mid" x="552" y="146">seconds, per equipment</text>
  <path class="dg-line dg-dash" d="M395 122 V172 H330" marker-end="url(#hmi-interaction-ah)"/>
  <rect class="dg-box-warn" x="20" y="158" width="310" height="44" rx="6"/>
  <text class="dg-text-sm" x="34" y="177">No status by the timeout (example 5 s):</text>
  <text class="dg-text-sm" x="34" y="194">show "No response from M101", Alm.FailToStart</text>
</svg>`,

    faceplate: `<svg viewBox="0 0 640 480" role="img" aria-label="Mockup of a motor faceplate for M101: stopped, manual, Start blocked because FV101 is not open, last command Stop confirmed, no active alarms">
  <rect class="dg-box" x="10" y="10" width="620" height="460" rx="8"/>
  <rect class="dg-box-2" x="10" y="10" width="620" height="48" rx="8"/>
  <text class="dg-title" x="26" y="32">M101  Mixer agitator motor</text>
  <text class="dg-text-muted" x="26" y="50">Plant1 / Area10 / Line1</text>
  <rect class="dg-box" x="578" y="14" width="44" height="40" rx="4"/>
  <text class="dg-text dg-mid" x="600" y="40">X</text>

  <text class="dg-label-accent" x="26" y="80">STATUS</text>
  <text class="dg-text-muted" x="26" y="104">State</text>
  <text class="dg-text" x="130" y="104">Stopped</text>
  <text class="dg-text-muted" x="26" y="128">Mode</text>
  <text class="dg-text" x="130" y="128">Manual</text>
  <text class="dg-text-muted" x="26" y="152">Speed</text>
  <text class="dg-text" x="130" y="152">0 rpm</text>
  <text class="dg-text-muted" x="26" y="176">Run hours</text>
  <text class="dg-text" x="130" y="176">4,215 h</text>
  <rect class="dg-box" x="26" y="188" width="250" height="12" rx="2"/>
  <text class="dg-text-muted" x="26" y="218">0</text>
  <text class="dg-text-muted dg-end" x="276" y="218">1,800 rpm</text>

  <text class="dg-label-accent" x="26" y="252">PERMISSIVES</text>
  <text class="dg-text-sm" x="26" y="276">MET</text>
  <text class="dg-text-sm" x="96" y="276">E-stop circuit healthy</text>
  <text class="dg-text-sm" x="26" y="298">MET</text>
  <text class="dg-text-sm" x="96" y="298">No active fault</text>
  <rect class="dg-box-warn" x="20" y="306" width="318" height="22" rx="3"/>
  <text class="dg-text-sm" x="26" y="322">NOT MET</text>
  <text class="dg-text-sm" x="96" y="322">FV101 discharge valve open</text>
  <text class="dg-text-sm" x="26" y="344">MET</text>
  <text class="dg-text-sm" x="96" y="344">Tank level above minimum</text>

  <text class="dg-label-accent" x="350" y="80">COMMAND</text>
  <rect class="dg-box" x="350" y="92" width="84" height="48" rx="6" stroke-dasharray="4 3"/>
  <text class="dg-text-muted dg-mid" x="392" y="121">Start</text>
  <rect class="dg-box-accent" x="442" y="92" width="84" height="48" rx="6"/>
  <text class="dg-text dg-mid" x="484" y="121">Stop</text>
  <rect class="dg-box" x="534" y="92" width="80" height="48" rx="6" stroke-dasharray="4 3"/>
  <text class="dg-text-muted dg-mid" x="574" y="121">Reset</text>
  <rect class="dg-box-warn" x="350" y="152" width="264" height="48" rx="4"/>
  <text class="dg-text-sm" x="360" y="170">Start blocked:</text>
  <text class="dg-text-sm" x="360" y="188">FV101 discharge valve is not open</text>

  <text class="dg-text-muted" x="350" y="224">Speed setpoint (VFD variant)</text>
  <rect class="dg-box" x="350" y="234" width="120" height="44" rx="4"/>
  <text class="dg-text dg-end" x="462" y="262">1,150</text>
  <text class="dg-text-muted" x="480" y="262">rpm</text>
  <rect class="dg-box-accent" x="530" y="234" width="84" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="572" y="262">Apply</text>
  <text class="dg-text-muted" x="350" y="298">Allowed 600 to 1,800 rpm</text>
  <rect class="dg-box-2" x="350" y="312" width="264" height="44" rx="4"/>
  <text class="dg-text-sm" x="360" y="330">MODE: Manual (Sts.Auto false)</text>
  <text class="dg-text-sm" x="360" y="346">Operator Start and Stop enabled</text>

  <rect class="dg-box" x="26" y="368" width="588" height="48" rx="4"/>
  <text class="dg-text-sm" x="38" y="388">Stop sent 14:01:57, confirmed 14:01:58 (Sts.Running false)</text>
  <text class="dg-text-muted" x="38" y="406">Alarms: none active (Fail to start, Overload, Comm loss)</text>

  <rect class="dg-box" x="26" y="426" width="110" height="40" rx="4"/>
  <text class="dg-text-sm dg-mid" x="81" y="451">Trend</text>
  <rect class="dg-box" x="144" y="426" width="130" height="40" rx="4"/>
  <text class="dg-text-sm dg-mid" x="209" y="451">Alarm history</text>
  <rect class="dg-box" x="282" y="426" width="120" height="40" rx="4"/>
  <text class="dg-text-sm dg-mid" x="342" y="451">Maintenance</text>
</svg>`
  },

  pitfalls: [
    "Making a status shape clickable, so the operator cannot tell a lamp from a switch.",
    "Showing Running the moment Start is pressed, instead of when Sts.Running comes back true.",
    "Hiding buttons that do not apply instead of disabling them with a reason.",
    "Putting an OK-only confirmation behind every command until operators click through all of them.",
    "Clamping an out-of-range entry silently, which hides the typo.",
    "Testing touch targets with a bare finger when the operator wears insulated gloves.",
    "Enforcing limits only in the HMI, so another client or script can still write a bad value."
  ],

  keyTerms: ["faceplate", "affordance", "fitts-law", "touch-target", "poka-yoke", "select-before-operate", "permissive", "interlock", "hmi"],

  quiz: [
    {
      q: "An overview graphic shows each motor as a rounded box that says \"M101 RUN\" or \"M101 STOP\" and toggles the motor when touched. What is the best fix?",
      options: [
        "Add a confirmation dialog to every toggle",
        "Change the colors so running is red and stopped is green",
        "Make the box a flat status indicator and put Start and Stop on the M101 faceplate",
        "Make the boxes bigger so they are easier to hit"
      ],
      answer: 2,
      explain: [
        "A dialog treats the symptom. The box still reads as both lamp and switch, and operators will tap through the dialog.",
        "Color choice does not fix the ambiguity, and it breaks the rule that red is for abnormal conditions.",
        "Correct. Status and command are separated, and the faceplate header names the equipment, which doubles as the select step.",
        "A bigger target makes accidental toggles more likely, not less."
      ]
    },
    {
      q: "Operators wear insulated gloves. Your panel buttons are 44 px high, matching the WCAG 2.1 enhanced target size. What should you do?",
      options: [
        "Nothing. 44 px meets the guidance, so it is safe",
        "Treat 44 to 48 px as the smallest target, enlarge critical commands, and test with the actual gloves on the panel",
        "Switch to 9 mm because it is the same number",
        "Add hover highlights so operators know what they are touching"
      ],
      answer: 1,
      explain: [
        "The published figures are minimums for bare fingers. They do not cover gloves.",
        "Correct. Use the guidance as a floor, go larger for critical buttons, and verify on the real device with real gloves.",
        "44 CSS px and 9 mm are not equal. They depend on the screen's pixel density.",
        "Touchscreens do not show hover, so this does not help."
      ]
    },
    {
      q: "The operator presses Start on M101. Which behavior is correct?",
      options: [
        "Show Running immediately so the operator gets instant feedback",
        "Wait silently until Sts.Running is true, then update the screen",
        "Show a modal dialog until Sts.Running is true",
        "Show pressed state within about 100 ms, show Command sent when the write is accepted, show Running only when Sts.Running is true, and flag a timeout if it never is"
      ],
      answer: 3,
      explain: [
        "That reports command intent as plant state. If the motor fails to start, the screen lies.",
        "A silent gap longer than about a second makes operators press the button again.",
        "A blocking modal prevents the operator from doing other things and does not add information.",
        "Correct. Each stage reports a different fact, and the timeout makes a failure visible as an abnormal state."
      ]
    },
    {
      q: "A plant has a confirmation dialog on every command, including changing a trend time range. Operators click OK without reading. What is the best response?",
      options: [
        "Remove confirmation from harmless and reversible actions, and keep specific, named confirmations or select-then-act for hard-to-reverse ones",
        "Add a second confirmation for important commands",
        "Remove all confirmations and rely on training",
        "Make the dialog flash so it gets read"
      ],
      answer: 0,
      explain: [
        "Correct. Spend the operator's attention only where the consequence justifies it, and make the confirm label name the action.",
        "More dialogs deepen the click-through habit.",
        "Hard-to-reverse and safety-related actions still need a deliberate step.",
        "Flashing adds noise and does not change the habit."
      ]
    },
    {
      q: "Start is disabled on the M101 faceplate in manual mode. What should the screen show?",
      options: [
        "Nothing extra, since the disabled style is enough",
        "A dashed Start button and a one-line reason such as \"Start blocked: FV101 discharge valve is not open\", published by the PLC",
        "A hidden Start button, so operators cannot press it",
        "A pop-up listing all interlocks in the plant"
      ],
      answer: 1,
      explain: [
        "A grey button with no reason leads to phone calls and workarounds.",
        "Correct. The PLC owns the logic and publishes the reason, so the HMI is explaining without re-implementing.",
        "Hiding it removes the cue that a command exists and makes the screen look broken.",
        "Too much information. The operator needs the one unmet permissive."
      ]
    },
    {
      q: "A speed setpoint field accepts 600 to 1,800 rpm. An operator types 11500. Which design is best?",
      options: [
        "Refuse it with a message that shows the allowed range, keep the old value, and enforce the same limits in the PLC",
        "Clamp to 1,800 rpm and apply it",
        "Apply it and let the PLC reject it later",
        "Accept any value and show a warning"
      ],
      answer: 0,
      explain: [
        "Correct. The HMI gives immediate feedback, and the PLC limit protects against other clients and scripts.",
        "Silent clamping hides the typo and writes a value the operator did not intend.",
        "The operator would get no feedback, and the screen could show a wrong setpoint.",
        "A warning lets a bad value reach the plant."
      ]
    }
  ],

  resources: [
    { title: "Understanding Success Criterion 2.5.5: Target Size (Enhanced)", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html", type: "standard", source: "W3C" },
    { title: "Proposed SC Target Size (Mobile Accessibility Task Force)", url: "https://www.w3.org/WAI/GL/mobile-a11y-tf/wiki/Proposed_SC_Target_Size", type: "standard", source: "W3C" },
    { title: "Touch targets (Material Design 3)", url: "https://m3.material.io/foundations/designing/structure", type: "docs", source: "Material Design" },
    { title: "Response Time Limits (Jakob Nielsen)", url: "https://www.nngroup.com/articles/response-times-3-important-limits/", type: "article", source: "NN/g" },
    { title: "Confirmation Dialogs Can Prevent User Errors", url: "https://www.nngroup.com/articles/confirmation-dialog/", type: "article", source: "NN/g" },
    { title: "Preventing User Errors: Avoiding Conscious Mistakes", url: "https://www.nngroup.com/articles/user-mistakes/", type: "article", source: "NN/g" },
    { title: "Perspective Numeric Entry Field (Ignition 8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-input-palette/perspective-numeric-entry-field", type: "docs", source: "Inductive Automation" },
    { title: "Perspective Form component (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-input-palette/perspective-form", type: "docs", source: "Inductive Automation" }
  ]
});
