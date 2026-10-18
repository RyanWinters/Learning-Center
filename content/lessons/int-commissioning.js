LC.lesson({
  id: "int-commissioning",
  title: "Commissioning and I/O checkout",
  track: "int",
  minutes: 20,
  level: 3,
  prereqs: ["int-lifecycle", "found-pid-docs"],
  tags: ["commissioning", "io-checkout", "loop-check", "punch-list", "cutover", "testing"],
  summary: "How a system goes from 'it works on my bench' to 'operations signed for it': loop checks, point-to-point checkout, punch lists, and proving Ignition itself.",
  objectives: [
    "Separate pre-commissioning, checkout, functional testing and startup, and say who owns each",
    "Run a point-to-point I/O checkout and a loop check against a loop sheet, and record the result",
    "Choose between simulated and live testing for a given signal and justify the risk",
    "Run an Ignition commissioning pass: tag quality sweep, alarm verification, historian check",
    "Plan a brownfield cutover with a rollback path"
  ],

  body: `
## What commissioning is

{{term:commissioning|Commissioning}} is the structured proof that what was built matches what was specified, signal by signal, before the plant relies on it. A swapped pair of wires costs ten minutes in checkout and a ruined batch in production. Electricians, instrument techs, the vendor and operations all touch it, so the discipline is mostly records and sequence.

The usual phases run in this order:

{{diagram:phases}}

| Phase | What happens | Typical owner |
|---|---|---|
| Pre-commissioning (construction check) | Wiring continuity, megger tests, panel power-up, instruments mounted and tagged, nothing connected to live process | Electrical / instrumentation contractor |
| I/O checkout | Every field point proven end to end to the control system | Instrument tech plus controls engineer |
| Loop checks | Analog loops proven across their range, with scaling and units | Instrument tech plus controls engineer |
| Functional testing | Interlocks, sequences, alarms and HMI behavior against the functional spec | Integrator, witnessed by operations |
| Startup / performance | Real product or water runs, tuning, capacity proof | Operations with integrator support |
| Handover | Punch list closed, as-builts issued, training done, sign-off | Project manager |

A {{term:fat|factory acceptance test}} happens at your shop before shipment. A {{term:sat|site acceptance test}} repeats the important parts on site, with real field wiring. Checkout is the on-site work that precedes the SAT.

## Pre-commissioning

Do not start I/O checkout until the construction check is signed off, whatever the schedule pressure:

- **Power and grounding verified.** Panel voltage, 24 VDC supply output, and shield terminations are measured and recorded.
- **Network verified.** Switches are configured, IP addresses match the plan, and you can ping every device. See {{lesson:net-troubleshoot}}.
- **PLC program downloaded and backed up.** The version loaded is the version you tested at FAT. Record the controller's project name, revision and checksum or date.
- **Documents in hand.** Current {{term:io-list|I/O list}}, P&IDs, wiring diagrams and loop sheets. If the field has been redlined, you want the redlines.
- **Safety first.** Lock-out/tag-out and permits are in place, and moving equipment is isolated until you test it.

## The I/O list drives everything

The I/O list is the master checklist. Each row is one point: the plant tag, a description, signal type, panel and terminal, PLC address, range and units, alarm limits. Drawings and the I/O list keep the hyphen (\`LT-101\`). In the PLC and Ignition the same point is \`LT101\`, because hyphens are not valid in Logix tag names. The checkout record is the same list with extra columns. Do not invent a second spreadsheet. Extend the first one so nothing can drift.

| Tag | Description | Type | Terminal | PLC address | Range | Wired OK | Signal OK | Scaled OK | Alarm OK | Initials / date |
|---|---|---|---|---|---|---|---|---|---|---|
| LT-101 | Tank 1 level | AI 4-20 mA | TB3-7/8 | Local:3:I.Ch0Data | 0-5.0 m | | | | | |
| HS-201 | Pump 1 start PB | DI 24 V | TB4-1 | Local:1:I.Data.0 | n/a | | | | | |
| XV-301 | Inlet valve | DO 24 V | TB5-3 | Local:2:O.Data.2 | n/a | | | | | |

## Point-to-point checkout

A point-to-point (P2P) checkout proves the path from the field device to the controller tag, and for outputs from the controller tag to the field device. "Point to point" means each end is touched, not inferred.

### Digital inputs

1. Find the device (pushbutton, limit switch, proximity sensor) in the field.
2. Operate it physically, or ask the electrician to lift and land a lead.
3. Watch the PLC tag, or the module LED, in the other person's hands via radio. The bit must change in the correct direction.
4. Check **polarity**. A normally closed stop button must read 1 when healthy. A wire break must fault, not look like a press. See {{term:fail-safe-wiring|fail-safe wiring}}.
5. Record initials and date on the I/O list.

### Digital outputs

1. Confirm the equipment is safe to move and everybody is clear.
2. Force the output or toggle it from a test routine. The device must act: valve strokes, relay clicks.
3. Confirm feedback (open/closed limit) matches. A valve that moves with no feedback change means a feedback wiring or limit adjustment fault.
4. Remove the force, verify the output returns to its safe state, and record.

### Analog inputs

Test at least **three points**: 0 %, 50 % and 100 % of range. A 4-20 mA loop calibrator injects 4, 12 and 20 mA at the transmitter's terminals. Check the value arriving in the PLC and then in Ignition. A level transmitter ranged 0-5.0 m (LT-101) should read 0, 2.5 and 5.0 m. If it reads 0.05 m at 4.00 mA, the transmitter zero or the scaling is off. Teaching card: on a 1769-IF4-style raw scale (0-21 mA to 0-32,767 counts), 4 mA is 6,242 counts and 20 mA is 31,208, so a Scale with Parameters (SCP) instruction takes In 6242-31208 to Out 0.0-5.0. Counts are module-specific. ControlLogix 1756/5069 analog modules usually scale to engineering units in the module.

Also test a **wire break**: pull one lead and confirm the point goes to a bad or fault state, not to 0. A {{term:live-zero|live-zero}} signal makes this possible. Use the one NAMUR NE43 table for the thresholds:

| Current | Meaning | Treat as |
|---|---|---|
| 3.8 to 20.5 mA | Measurement range (3.8-4 and 20-20.5 are slight under/over range) | Good, clamp for display |
| 3.6 to 3.8 mA or 20.5 to 21 mA | Indeterminate | Uncertain quality, alarm after delay |
| below 3.6 mA or above 21 mA | Device or loop failure | Bad quality, fail-safe action |

A pulled lead gives about 0 mA, well below 3.6, so the point must go Bad. Inject 3.7 mA as well and confirm Uncertain.

### Analog outputs

Command 0, 50 and 100 % and measure the current at the field device. A control valve at 12 mA should be at mid-stroke. Check whether it is air-to-open or air-to-close, because a reversed assumption inverts the process.

## Loop checks and the loop sheet

A {{term:loop-check|loop check}} proves a whole control loop, not just a wire: transmitter, wiring, I/O card, scaling, controller logic, output, final element and the display at the operator screen. The {{term:loop-sheet|loop sheet}} (also called a loop folder) lists the components, ranges and tag names for the loop so the tester can sign each step.

{{diagram:loop}}

Take a flow control loop FIC-205 as an example:

1. FT-205 range 0-500 gpm, 4-20 mA. Inject 12 mA; the HMI shows 250 gpm.
2. In manual, set the PID output to 50 %; FV-205 moves to mid stroke and 12 mA appears at the valve positioner.
3. Check that the valve position feedback ZT-205 agrees within the agreed tolerance, for example 2 %.
4. Confirm the high-flow alarm at 450 gpm triggers on screen with the right priority and text.
5. Return the loop to the as-found mode and sign.

Tuning is **not** part of a loop check. It happens later under process conditions.

## Simulated versus live testing

Simulated testing uses forced values, a test routine, an emulator or a PLC simulation to prove logic without the process. Live testing uses the real equipment, water, or product. You need both, in that order.

| Aspect | Simulated | Live |
|---|---|---|
| Risk | Low, if forces are tracked | Real equipment, real consequences |
| What it proves | Logic, sequences, interlocks, HMI behavior, alarm texts | Field wiring, scaling, sensor behavior, mechanical timing |
| What it misses | Wiring errors, dead sensors, valve speed, process lag | Corner cases you cannot safely create (overpressure, E-stop during a transfer) |
| Best for | FAT, alarm tests, rare failure paths | Final loop checks, startup |

Rules for forces on a live controller:

- Keep a **force log** with who, when and why. At the end of the day, the log and the controller's force list must match.
- A bypass that defeats an interlock needs a named authorizer.

> [!warning] Forces survive downloads
> In Logix, I/O forces stay applied until removed. Check how forces behave across power cycles and downloads for your controller and firmware, and never assume they clear. A forgotten force on a high-level switch is a classic cause of an overflowed tank months later. Make "remove all forces, print the force list" a closing step of every session.

## Punch lists

The {{term:punch-list|punch list}} is the running list of defects and incomplete items found during checkout and testing. Each item has a number, description, location, owner, severity and status. Agree on categories early:

- **A**: blocks startup or safety. Must be fixed before the equipment runs.
- **B**: must be fixed before handover, but the plant can start.
- **C**: cosmetic or nice-to-have. Can be deferred with written agreement.

Close items with evidence: a re-test initial, a photo, a revision number. Keep the list in one shared place, not in four inboxes.

## Commissioning the Ignition layer

The PLC can be perfect and the system still wrong. Ignition has its own checkout, and it deserves the same discipline.

### Tag quality sweep

Every tag should be **Good**. In the Designer, browse the tag tree and look for quality overlays (bad, stale, error, not connected). For a repeatable sweep, read every path on the I/O list and print anything that is not Good:

\`\`\`python
# Script Console. Paste the paths from your I/O list export, or build the list with system.tag.browse.
paths = ["[default]Plant1/Area10/Line1/LT101/Value", "[default]Plant1/Area10/Line1/M101/Sts/Running"]
for p, qv in zip(paths, system.tag.readBlocking(paths)):
    if not qv.quality.isGood():
        print p, qv.quality
\`\`\`

Expect a few legitimate bad tags (a spare input, a device not yet installed). Document them, then either delete the tag or mark it. A tag that shows bad forever trains operators to ignore bad.

### Alarm verification

For each alarm on the alarm list, trigger the condition (using a simulation, or a calibrator on the loop) and check:

- It appears on the active alarm table with the correct priority, label and display path.
- The setpoint and deadband behave as in the alarm philosophy. See {{lesson:int-alarm-mgmt}}.
- Acknowledge, shelve and clear work, and the journal records them.
- Notification (email, SMS, call-out) goes to the right roster for the right priority.

The tag diagnostics pages in the 8.3 manual (see Resources) describe what Ignition reports per tag. Check what your version shows for alarms, because it is a quick way to find alarms that never fire.

### Historian check

- Confirm each historized tag is writing. Tag diagnostics report the time of last storage and the timestamp of the last stored value.
- Compare a trend of the last hour to the raw value you see in the PLC.
- Confirm sample modes and deadbands are sensible. A tight deadband on a noisy analog fills the database; a loose one hides process movement.
- Check history through a **gateway restart** and through a **database outage** if store-and-forward is configured. Pull the database connection for two minutes, then reconnect and verify the gap fills.

### Everything else

Open every Perspective view as each role. Click each navigation target and command, and confirm that a setpoint write is audited. Test on the real screens and devices.

## Cutover planning for brownfield sites

In a {{term:brownfield|brownfield}} project the old system is running production. You cannot turn it off on a Friday and hope. A cutover plan answers six questions:

1. **Window.** When is the shutdown, and how long can it be? Typically the shortest gap in the production schedule, or a planned maintenance outage.
2. **Sequence.** In what order are loops, motors and areas moved? Many projects cut over area by area.
3. **Parallel running.** Can the new system read all inputs while the old one controls? That lets you compare values before taking over outputs.
4. **Rollback.** What is the trigger for going back, and can the old wiring be reinstated within the window? Keep the old system intact until the new one has run stable for an agreed period.
5. **People.** Who is on shift, who has authority to call the rollback, who talks to operations?
6. **Data.** What history, recipes and set points must migrate, and how will you validate them?

> [!tip] Cutover rehearsal
> Rehearse in an offline copy where you can, with numbered tasks, owners and durations. If the plan says 4 hours and the rehearsal takes 9, you learned it on a Tuesday instead of at 2 a.m.

## Worked example: one pump, start to sign-off

Pump P-101 (PLC tag \`P101\`, type \`UDT_Motor\`) has a start/stop, a run feedback, a motor overload contact, a discharge pressure transmitter PT-101 (tag \`PT101\`, 0-100 psi) and a high-pressure alarm at 85 psi. The overload and E-stop are hardwired in the starter coil circuit. The PLC only monitors the overload auxiliary contact.

- **Pre-comm**: motor megger-tested, overload set to nameplate amps, panel power on.
- **DI checkout**: HS-101 (start pushbutton on a DI) sets the start request that the PLC maps to \`P101.Cmd.Start\`. The overload auxiliary contact is wired normally closed (fail-safe), and opening it sets \`P101.Alm.Overload\` to 1 in Ignition within one second.
- **DO checkout**: the contactor pulls in when the output is forced. The motor is bumped, with rotation direction checked at the coupling, and the force is removed.
- **AI loop check**: 4, 12, 20 mA gives 0, 50, 100 psi. A wire break (below 3.6 mA) shows bad quality, and the HMI shows the "Bad PV" state.
- **Alarm**: injecting 17.76 mA gives (17.76 - 4) / 16 x 100 = 86 psi, just over the 85 psi setpoint, and raises "P-101 Discharge Pressure High", priority High (17.6 mA is exactly 85 psi, on the threshold, so it proves nothing). With a 2 psi deadband the alarm clears at 83 psi, which is 17.28 mA.
- **Ignition**: tag quality Good, historian stores the PV, faceplate shows the right units and the Start button writes with an audit entry.
- **Record**: all boxes initialed, one B-level punch item (a tag label missing on the transmitter), closed after relabeling.
`,

  eli5: `
Think about moving into a new house with a lot of light switches, taps and a doorbell. Before you trust any of it, you walk through and test each one. You flip the hallway switch and watch whether the hallway light comes on, not the kitchen light. You turn on every tap and see whether the hot side is hot. You write each one down on a list with a tick.

Some things you test with a fake: you press the doorbell with the power off and listen for the click. Others you test for real: you run the dishwasher. You also make a list of things you spot that are wrong, like a loose cupboard door, and sort them into "fix before we sleep here" and "fix when we have time".

And if you are moving from an old house to a new one, you do not throw away the old keys on day one. You keep them until the new place has proven it works.

Commissioning is that same walk-through, done with wires, sensors, valves and screens, and with a signed list at the end that says it all works.
`,

  why: `
**Why check every point?** Wiring errors are common and hard to see in software. A swapped pair, a wrong terminal, a transmitter ranged differently from the drawing: each looks like a plausible value until the process goes abnormal. Checking every point costs hours up front. Finding the same defect during a trip costs a shutdown and a trust problem with operations.

**Why a record, not just a test?** The signed I/O list is the proof that protects both parties. If a valve is later found reversed, the record shows whether it was tested, by whom, and against which drawing revision. Without it, the argument becomes opinion.

**Why simulate first, then go live?** Simulation lets you break things safely. You can test a high-high level interlock without overfilling a tank. Live testing finds what simulation cannot: wrong scaling, a sticky valve, a transmitter on the wrong impulse line. Shops that skip simulation discover logic bugs in front of the customer, with product in the vessel. Shops that skip live testing ship logic that is perfect and wired backwards.

**Where integrators argue.** Some insist on testing 100 % of points with full range for analogs; others test only three points per loop and trust the transmitter calibration. Safety and regulated environments tend to require the full record. Another argument is who owns the loop check: instrument techs argue that it is a field calibration task, while controls engineers argue it must include the logic. The answer is usually shared, with the I/O list showing who signed what.

**Why commission the Ignition layer separately?** Operators judge the system by the screen. An alarm that exists in the PLC but is not configured in Ignition does not exist for them. A trend with no history is a lie. Treat the gateway as a controlled deliverable with its own checks and its own backup at handover.

**Why plan the rollback?** A cutover without a rollback plan is a bet that nothing will go wrong. Brownfield plants run 24 hours a day, and the cost of a failed cutover is measured in lost production per hour. The plan lets the person on site make a calm decision at the trigger point rather than inventing a plan under pressure.
`,

  history: `
Loop checks and instrument loop folders come from process-plant construction practice, where thousands of field instruments had to be proven before introducing hazardous material. The loop sheet is a descendant of the instrument index and loop diagram conventions that ISA standards describe. In the PLC era the I/O list took over as the master document, and electronic spreadsheets replaced paper forms. Modern commissioning also treats the SCADA and historian layers as deliverables, because they are now the main operator interface.
`,

  examples: [
    {
      title: "The level transmitter that read 0.05 m at 4 mA",
      body: `During a loop check on LT-101 (0-5.0 m) the 4 mA injection showed 0.05 m on the HMI instead of 0. The technician first suspected the transmitter. A look at the PLC showed the scaling instruction had a raw minimum of 6000 counts, typed from memory, instead of 6242 (the count for 4 mA on that module). Then 4 mA gives (6242 - 6000) / (31208 - 6000) x 5.0 = 0.048 m, and 20 mA still reads 5.0 m, so the error shrinks toward full scale. Correcting the constant fixed it. The lesson is to look at both ends before swapping hardware.`
    },
    {
      title: "Forgotten force",
      body: `A tech forced a low-level switch to 'healthy' while testing a pump interlock, then left for the day. Two weeks later the supply tank ran dry and the pump ran against it. The force list was not part of the handover. After that the shop added 'print the force list and attach it to the shift report' to every commissioning day.`
    }
  ],

  diagrams: {
    phases: `<svg viewBox="0 0 640 210" role="img" aria-label="Commissioning phases in order: pre-commissioning, I/O checkout, loop checks, functional tests, startup, handover, with the punch list running underneath all of them">
  <defs><marker id="int-commissioning-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="12" y="30" width="94" height="64" rx="5"/>
  <text class="dg-text-sm dg-mid" x="59" y="56">Pre-comm</text>
  <text class="dg-text-sm dg-mid" x="59" y="74">power, network</text>
  <rect class="dg-box" x="116" y="30" width="94" height="64" rx="5"/>
  <text class="dg-text-sm dg-mid" x="163" y="56">I/O checkout</text>
  <text class="dg-text-sm dg-mid" x="163" y="74">point to point</text>
  <rect class="dg-box" x="220" y="30" width="94" height="64" rx="5"/>
  <text class="dg-text-sm dg-mid" x="267" y="56">Loop checks</text>
  <text class="dg-text-sm dg-mid" x="267" y="74">range, scaling</text>
  <rect class="dg-box-accent" x="324" y="30" width="94" height="64" rx="5"/>
  <text class="dg-text-sm dg-mid" x="371" y="56">Functional</text>
  <text class="dg-text-sm dg-mid" x="371" y="74">logic, alarms</text>
  <rect class="dg-box" x="428" y="30" width="94" height="64" rx="5"/>
  <text class="dg-text-sm dg-mid" x="475" y="56">Startup</text>
  <text class="dg-text-sm dg-mid" x="475" y="74">real product</text>
  <rect class="dg-box-ok" x="532" y="30" width="96" height="64" rx="5"/>
  <text class="dg-text-sm dg-mid" x="580" y="56">Handover</text>
  <text class="dg-text-sm dg-mid" x="580" y="74">sign-off</text>
  <line class="dg-line" x1="106" y1="62" x2="116" y2="62" marker-end="url(#int-commissioning-ah)"/>
  <line class="dg-line" x1="210" y1="62" x2="220" y2="62" marker-end="url(#int-commissioning-ah)"/>
  <line class="dg-line" x1="314" y1="62" x2="324" y2="62" marker-end="url(#int-commissioning-ah)"/>
  <line class="dg-line" x1="418" y1="62" x2="428" y2="62" marker-end="url(#int-commissioning-ah)"/>
  <line class="dg-line" x1="522" y1="62" x2="532" y2="62" marker-end="url(#int-commissioning-ah)"/>
  <rect class="dg-box-warn" x="12" y="124" width="616" height="40" rx="5"/>
  <text class="dg-text dg-mid" x="320" y="149">Punch list: opened at the first defect, closed only with evidence</text>
  <text class="dg-text-muted dg-mid" x="320" y="190">FAT happens before shipment; SAT repeats key tests on site</text>
</svg>`,
    loop: `<svg viewBox="0 0 640 220" role="img" aria-label="A loop check follows the signal from a loop calibrator at the transmitter through the I/O card and PLC scaling to the Ignition display, and the output back to the valve">
  <defs><marker id="int-commissioning-lp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="16" y="24">Input path (FT-205, 0-500 gpm)</text>
  <rect class="dg-box" x="16" y="38" width="110" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="71" y="60">Calibrator</text>
  <text class="dg-text-sm dg-mid" x="71" y="78">injects 12 mA</text>
  <rect class="dg-box" x="160" y="38" width="110" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="215" y="60">AI card</text>
  <text class="dg-text-sm dg-mid" x="215" y="78">raw counts</text>
  <rect class="dg-box" x="304" y="38" width="110" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="359" y="60">PLC scaling</text>
  <text class="dg-text-sm dg-mid" x="359" y="78">250.0 gpm</text>
  <rect class="dg-box-accent" x="448" y="38" width="176" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="536" y="60">Ignition tag + view</text>
  <text class="dg-text-sm dg-mid" x="536" y="78">250 gpm, quality Good</text>
  <line class="dg-line" x1="126" y1="64" x2="160" y2="64" marker-end="url(#int-commissioning-lp)"/>
  <line class="dg-line" x1="270" y1="64" x2="304" y2="64" marker-end="url(#int-commissioning-lp)"/>
  <line class="dg-line" x1="414" y1="64" x2="448" y2="64" marker-end="url(#int-commissioning-lp)"/>
  <text class="dg-title" x="16" y="134">Output path (FV-205)</text>
  <rect class="dg-box-accent" x="16" y="148" width="130" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="81" y="170">Ignition / PLC</text>
  <text class="dg-text-sm dg-mid" x="81" y="188">output 50 %</text>
  <rect class="dg-box" x="190" y="148" width="120" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="250" y="170">AO card</text>
  <text class="dg-text-sm dg-mid" x="250" y="188">12 mA</text>
  <rect class="dg-box" x="354" y="148" width="130" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="419" y="170">Positioner</text>
  <text class="dg-text-sm dg-mid" x="419" y="188">mid stroke</text>
  <rect class="dg-box-ok" x="528" y="148" width="96" height="52" rx="5"/>
  <text class="dg-text-sm dg-mid" x="576" y="170">ZT-205</text>
  <text class="dg-text-sm dg-mid" x="576" y="188">feedback 50 %</text>
  <line class="dg-line" x1="146" y1="174" x2="190" y2="174" marker-end="url(#int-commissioning-lp)"/>
  <line class="dg-line" x1="310" y1="174" x2="354" y2="174" marker-end="url(#int-commissioning-lp)"/>
  <line class="dg-line" x1="484" y1="174" x2="528" y2="174" marker-end="url(#int-commissioning-lp)"/>
</svg>`
  },

  pitfalls: [
    "Starting I/O checkout before construction checks are signed off, then chasing wiring faults and software faults at the same time.",
    "Checking only that a bit changes, not that it is the right bit, in the right direction, for the right tag.",
    "Testing analogs at one point only. A zero and span error needs at least three points.",
    "Leaving forces or bypasses in the controller at the end of the day with no log.",
    "Commissioning the PLC and forgetting alarms, history and security in Ignition.",
    "Closing punch items by conversation rather than evidence.",
    "Cutting over a brownfield area with no rollback trigger and no rehearsal."
  ],

  keyTerms: ["commissioning", "loop-check", "loop-sheet", "io-list", "punch-list", "fat", "sat", "brownfield", "point-to-point", "pre-commissioning", "io-force", "ign-quality-code", "cutover"],

  quiz: [
    {
      q: "During a loop check you inject 4, 12 and 20 mA at a 0-5.0 m level transmitter and the HMI shows 0.05 m, 2.55 m and 5.05 m. What does this pattern suggest?",
      options: ["The wire is broken", "A zero offset of about 0.05 m, constant across the range, so check the transmitter zero or the scaling constants", "The HMI is in simulation mode", "The PLC scan time is too slow"],
      answer: 1,
      explain: [
        "A broken wire produces a bad or fault state, or a reading near 0 mA. It does not give a nearly correct value.",
        "Correct. The same +0.05 m error at all three points is a constant zero offset (a span error would grow or shrink with the reading). The three-point test exposed it.",
        "A simulation would not respond to the injected current at all.",
        "Scan time delays an update. It cannot create a steady scaling error."
      ]
    },
    {
      q: "Why must a point-to-point checkout include a wire-break test on analog inputs?",
      options: ["To prove that a failure shows as bad or faulted rather than as a believable value", "To burn in the module", "Because the standard requires 12 mA", "To check the PLC firmware"],
      answer: 0,
      explain: [
        "Correct. A broken wire takes a 4-20 mA signal to about 0 mA, below the NE43 failure limit of 3.6 mA, and the logic should flag it as bad quality. If it silently reads 0, an operator might act on a false level.",
        "Burn-in is not the purpose and pulling a wire does not do it.",
        "No standard dictates that. The test shows how the system reacts to failure.",
        "Firmware has nothing to do with wiring behavior."
      ]
    },
    {
      q: "Which statement about simulated and live testing is most accurate?",
      options: ["Simulation proves logic safely; live testing proves wiring, scaling and mechanics, so you need both", "Live testing replaces simulation", "Simulation is only for training", "Live testing is unnecessary after FAT"],
      answer: 0,
      explain: [
        "Correct. Each finds a different class of fault.",
        "Live testing cannot safely create many abnormal conditions, like an overpressure interlock trip.",
        "Simulation is a main tool for finding logic and interlock errors.",
        "FAT used simulated or bench field devices, so wiring and site conditions are still unproven."
      ]
    },
    {
      q: "A tank overflowed weeks after commissioning because a level switch input stayed forced healthy. Which practice would have prevented it?",
      options: ["A faster historian", "More alarm priorities", "A force log reconciled with the controller's force list at the end of each session", "Checking IP addresses"],
      answer: 2,
      explain: [
        "History records the problem. It does not stop a force from persisting.",
        "Alarm priorities do not help when the input they depend on is forced.",
        "Correct. Forces are invisible to operators. A reconciled log makes sure every one is removed or documented.",
        "Addressing is unrelated to a forced input."
      ]
    },
    {
      q: "In a brownfield cutover, what is the purpose of running the new system in parallel with the old one before taking over outputs?",
      options: ["To double the production rate", "To avoid writing a rollback plan", "To skip the I/O checkout", "To compare real inputs and logic results before the new system controls anything"],
      answer: 3,
      explain: [
        "Parallel running is about verification, not capacity.",
        "A rollback plan is still required.",
        "Parallel running supplements the checkout and does not replace it.",
        "Correct. Reading the same inputs lets you verify scaling and logic outputs while the old system keeps running safely."
      ]
    },
    {
      q: "An Ignition tag sweep shows 14 bad-quality tags across a provider. What is the best response?",
      options: ["Ignore them, they are probably spares", "Disable quality display on views", "Raise the historian deadband", "Investigate each, then fix, delete or document it, so that bad quality always means something"],
      answer: 3,
      explain: [
        "Some may be spares, but you only know after checking. Unexamined bad tags hide real faults.",
        "Hiding quality removes the operator's warning that data is not reliable.",
        "Deadband controls storage, not whether a tag is healthy.",
        "Correct. Each one is a wiring, address, device or configuration fault, or a documented spare."
      ]
    }
  ],

  resources: [
    { title: "Tag Diagnostics (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-diagnostics", type: "docs", source: "Inductive Automation" },
    { title: "Configuring Tag History (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/tag-historian/configuring-tag-history", type: "docs", source: "Inductive Automation" },
    { title: "Build Ignition Projects More Efficiently With This Checklist", url: "https://inductiveautomation.com/blog/build-ignition-projects-more-efficiently-with-this-checklist", type: "article", source: "Inductive Automation" },
    { title: "Ignition Historian Guide", url: "https://www.docs.inductiveautomation.com/docs/8.1/tutorials/ignition-historian-guide", type: "docs", source: "Inductive Automation" },
    { title: "CSIA Best Practices Manual", url: "https://controlsys.org/community-resources/best-practices-manual/", type: "standard", source: "Control System Integrators Association" }
  ]
});
