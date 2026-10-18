LC.lesson({
  id: "plc-state-machines",
  title: "State machines and sequences",
  track: "plc",
  minutes: 30,
  level: 3,
  prereqs: ["plc-counters", "plc-compare-math"],
  tags: ["state-machine", "sequence", "case", "ladder", "structured-text", "fault"],
  summary: "How to write any step-by-step process as one DINT, one transition table and one set of outputs, instead of a pile of latches that fight each other.",
  objectives: [
    "Describe a sequence as states, transitions and actions",
    "Implement a state machine with a DINT step number, using CASE in structured text and EQU per step in ladder",
    "Add step timeouts, a fault state and pause/resume without breaking the sequence",
    "Explain why a state machine is easier to debug and extend than latched rungs",
    "Expose the step number so an Ignition screen can show where the machine is"
  ],

  body: `
## What a state machine is

A {{term:state-machine|state machine}} describes a process as a list of **states** (what the machine is doing right now), **transitions** (the conditions that move it to another state) and **actions** (what the outputs do while in a state). Exactly one state is active at a time. Fill a tank, then mix, then drain: that is three states in order, and the machine is always in one of them.

If you build Perspective screens, you already think this way. A screen has a current page, and a click moves you to another. The PLC version stores "which page am I on" in a number.

## The step number

In Logix the usual implementation is a single \`DINT\` tag, often called \`Step\` or \`State\`. Each value means one state. Use gaps (10, 20, 30) so you can insert a step later without renumbering.

| Step | Name | Outputs on | Moves on when |
|---|---|---|---|
| 0 | Idle | none | \`StartCmd\` and \`Tank_Empty\` |
| 10 | Filling | \`Fill_Valve\` | \`Level >= 800.0\` (litres) |
| 20 | Mixing | \`Mixer\` | \`StepTmr.DN\` (90 s) |
| 30 | Draining | \`Drain_Valve\` | \`Level <= 5.0\` (litres) |
| 900 | Fault | alarm horn | \`ResetCmd\` and fault cleared |

{{diagram:flow}}

This is the one numbering used for the rest of the lesson, the worked example, the diagram and the quiz. The rule that makes this robust: **outputs are decided only by the current step, and the step changes in one place.** Nothing else in the program writes to \`Step\`.

## Structured text with CASE

Structured text is the natural fit. One routine reads the step, runs the transition test, and sets the next step.

\`\`\`st
CASE Seq.Step OF
  0:  // Idle
    IF Cmd.Start AND Tank.Empty THEN
      Seq.Step := 10;
    END_IF;

  10: // Filling
    IF Tank.Level >= 800.0 THEN
      Seq.Step := 20;
    END_IF;

  20: // Mixing
    IF Seq.StepTmr.DN THEN
      Seq.Step := 30;
    END_IF;

  30: // Draining
    IF Tank.Level <= 5.0 THEN
      Seq.Step := 0;
    END_IF;

  900: // Fault
    IF Cmd.Reset AND NOT Seq.Faulted THEN
      Seq.Step := 0;
    END_IF;
ELSE
  Seq.Step := 900;   // unknown value: fail safe
END_CASE;
\`\`\`

The \`ELSE\` branch matters. If a bad write or a download leaves \`Step\` at 47, the machine drops into the fault state instead of doing nothing.

## Ladder with EQU per step

Ladder has no CASE, so each step is a small group of rungs gated by \`EQU\`. Transitions are rungs that \`MOV\` the next number.

\`\`\`ladder
EQU(Seq.Step,10) XIC(Tank.Level_HI) MOV(20,Seq.Step)
\`\`\`

\`\`\`ladder
EQU(Seq.Step,10) OTE(Fill_Valve)
\`\`\`

\`\`\`ladder
EQU(Seq.Step,20) OTE(Mixer)
\`\`\`

Keep transitions and outputs in separate sections of the routine. Use \`OTE\` for outputs, not \`OTL\`/\`OTU\`. The output goes false by itself when the step changes, so nothing is left latched behind.

> [!warning] Transitions in one scan
> A \`MOV\` anywhere in the routine changes \`Step\` for every rung *below* it in the same scan. So if step 10's transition rung sits above step 20's, and step 20's exit condition is already true, the machine falls through both steps in one scan. Whether that happens depends on the conditions, not on a rule that only one transition can fire per scan. Timer-based steps are protected by a different mechanism: the step's timer rung is gated by \`EQU(Seq.Step,n)\`, so the timer starts counting from zero only after \`Step\` equals \`n\`, and its \`.DN\` cannot be true in the scan it was entered. Level and switch conditions have no such protection. Put all transition rungs at the bottom of the routine (after the outputs and timers), or use one CASE, so each step is seen for at least one full scan.

## Timeouts, faults and pause

**Step timeout.** Every step that waits for the real world (a valve limit switch, a level) needs a timer so a failed device cannot hold the sequence forever. Use one timer, \`StepTmr\`, that runs while the step is unchanged and resets when it changes. A common pattern keeps \`LastStep\` and compares: if \`Step <> LastStep\`, reset the timer and copy \`Step\` into \`LastStep\`. Each step then has a limit, for example step 10 (Filling) allows 180 s. If \`StepTmr.ACC\` passes it, set \`Seq.FaultCode := 10\` and \`Seq.Step := 900\`.

**Fault state.** Step 900 is the fault state. It turns off process outputs, raises an alarm and records which step failed (\`Seq.FaultStep\`). Write the fault code and the failed step before moving. Reset returns to Idle, not to the step that failed, unless you design a safe restart.

**Pause and resume.** Add a hold flag rather than a new step number per step. When \`Cmd.Hold\` is true, freeze the timer and force outputs off, but leave \`Step\` alone. Releasing \`Hold\` resumes in place. For a mixer, hold pauses the motor but keeps the elapsed mix time. For a full hold/restart design with states like Held and Aborted, see {{lesson:plc-isa88-packml}}.

## Why not a pile of latches

The older style uses \`OTL\` and \`OTU\` rungs: set "filling" when start is pressed, unlatch it and latch "mixing" when the level is reached. It works on a good day. Every latch needs a matching unlatch in every path, and a power cycle or fault leaves several latches set at once. Debugging means reading every rung that touches each bit.

| Concern | Latches | State machine |
|---|---|---|
| Two stages active at once | Possible, hard to see | Impossible, one number |
| Where does it stop? | Search the latch bits | Read \`Step\` |
| Add a step | Edit unlatch lists | Add a number and a branch |
| Recovery after power loss | Whatever was retained | Decide in one place |
| HMI status | One bit per stage | One DINT with a lookup |

## Worked example: mixer batch

Take the mixer from the step table, a 1,000 L tank: 0 Idle, 10 Filling to 800 L, 20 Mixing 90 s, 30 Draining to 5 L, 900 Fault. Timeouts: fill step 180 s, drain step 240 s.

If \`Step\` is 10 and the level stops rising for 180 s, \`StepTmr\` passes the limit and the fault state records \`FaultStep = 10\`, \`FaultCode = 10\`. The HMI shows "Fault in Filling". The operator opens the valve, presses reset, and the sequence returns to Idle. Nothing was left latched.

Try the same ideas in the simulator: {{sim:sim-traffic}} is the smallest state machine, {{sim:sim-tank-fill}} adds levels, {{sim:sim-pump-alternation}} uses a state to remember which pump leads, and {{sim:sim-mixer-batch}} puts it together with timers. {{sim:sim-step-fault}} exercises exactly the step timeout and fault state described above: let a step stall, watch the timeout, then reset out of Fault.

## Showing it in Ignition

Because the state is one DINT, an Ignition tag \`[PLC]Mixer.Seq.Step\` is enough. A Perspective view can map the number to text with an expression \`map({[.]Step}, 0, "Idle", 10, "Filling", 20, "Mixing", 30, "Draining", 900, "Fault")\`. Better yet, keep the text in the PLC (\`Seq.StepName\` as a STRING or a lookup array) so the screen stays correct when the sequence changes. The SFC module in Ignition ({{lesson:arch-sfc}}) uses the same ideas at the supervisory level.
`,

  eli5: `
Think of a board game with a single token. The token sits on one square at a time. Each square says what to do ("heat the water") and what has to happen before you can move ("until the thermometer says 90"). You cannot be on two squares at once, and the only way to move is to follow the arrow off your square.

A pile of latches is different. It is like giving a different helper a light switch for each job and telling them "turn yours on when the last one finishes, and turn the last one off." If one helper falls asleep, two switches stay on and nobody knows what stage you are in.

A state machine is the board game. To know what the machine is doing, you look at where the token is. If it is stuck, you read the square and see what it is waiting for. A timer on each square is a kitchen timer that says "if nothing happens in two minutes, shout for help."
`,

  why: `
**Why one step number?** The core failure of latch-based sequences is that the machine can be in an impossible combination of stages. A single DINT cannot represent two stages at once, so that whole class of bug disappears. It also gives the HMI, the historian and the alarm system one value that tells the whole story.

**Why only one place writes the step?** When five rungs in three routines can change \`Step\`, you are back to a pile of latches with a number in front. Integrators argue about this: some allow an emergency stop routine to force the fault step from elsewhere. The safer rule is to set a request flag (\`Seq.Abort\`) and let the one state machine routine act on it.

**Why timeouts on every waiting step?** Real devices fail silently. A limit switch sticks, a pump cavitates, a level transmitter reads flat. Without a timeout, the sequence waits forever and the operator sees a machine that is "running" but doing nothing. The timeout turns a silent stall into a named fault that says which step failed.

**Why CASE over EQU?** CASE is easier to read and to review, and your reader sees the whole sequence on one screen. Ladder EQU gives online edit visibility and fits teams that only read ladder. Pick one per project. The tradeoff is consistency, not capability.

**Why a fail-safe ELSE?** Step numbers can be corrupted by a bad write, an HMI mistake or a partial download. Landing in Fault is a controlled outcome. Doing nothing is not.
`,

  history: `
Sequential control predates PLCs. Relay panels used drum sequencers and stepping relays, where a rotating contact advanced one position per step. Early PLCs reproduced this with shift registers and latch rungs. The IEC 61131-3 standard added Sequential Function Chart (SFC), a graphical state machine, and Logix supports SFC, but many integrators prefer a hand-written CASE for tight control over transitions and fault handling.
`,

  examples: [
    {
      title: "Shared step timer reset",
      body: `Keep \`LastStep\` as a DINT. Rung: \`NEQ(Seq.Step,Seq.LastStep)\` then \`MOV(Seq.Step,Seq.LastStep)\` and \`RES(Seq.StepTmr)\`. The timer is a TON whose preset is loaded per step. The timer restarts on every transition, so each step gets a full timeout.`
    },
    {
      title: "Reading a stuck sequence",
      body: `The operator says the mixer "just sits there". You open the tag: \`Step = 10\`, \`StepTmr.ACC = 61000\`. Step 10 is Filling, which waits for level >= 800. The level is 640 and not rising. You skip the program and go check the supply valve. The step number told you what the machine was waiting for.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 220" role="img" aria-label="State machine flow: Idle to Filling to Mixing to Draining and back to Idle, with a Fault state reachable from any step">
  <defs>
    <marker id="plc-state-machines-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="40" width="100" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="70" y="62">Idle</text>
  <text class="dg-text-mono dg-mid" x="70" y="80">0</text>
  <rect class="dg-box-accent" x="170" y="40" width="100" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="220" y="62">Filling</text>
  <text class="dg-text-mono dg-mid" x="220" y="80">10</text>
  <rect class="dg-box-accent" x="320" y="40" width="100" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="370" y="62">Mixing</text>
  <text class="dg-text-mono dg-mid" x="370" y="80">20</text>
  <rect class="dg-box-accent" x="470" y="40" width="100" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="520" y="62">Draining</text>
  <text class="dg-text-mono dg-mid" x="520" y="80">30</text>
  <line class="dg-line" x1="120" y1="65" x2="168" y2="65" marker-end="url(#plc-state-machines-ah)"/>
  <line class="dg-line" x1="270" y1="65" x2="318" y2="65" marker-end="url(#plc-state-machines-ah)"/>
  <line class="dg-line" x1="420" y1="65" x2="468" y2="65" marker-end="url(#plc-state-machines-ah)"/>
  <text class="dg-text-sm dg-mid" x="144" y="32">Start</text>
  <text class="dg-text-sm dg-mid" x="294" y="32">Level HI</text>
  <text class="dg-text-sm dg-mid" x="444" y="32">Timer DN</text>
  <path class="dg-line" d="M520 90 L520 122 L70 122 L70 92" fill="none" marker-end="url(#plc-state-machines-ah)"/>
  <text class="dg-text-sm dg-mid" x="295" y="116">Level LO, back to Idle</text>
  <rect class="dg-box-alarm" x="245" y="160" width="150" height="44" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="180">Fault</text>
  <text class="dg-text-mono dg-mid" x="320" y="197">900</text>
  <text class="dg-text-muted" x="410" y="186">timeout or device fault from any step</text>
</svg>`
  },

  pitfalls: [
    "Letting several routines write the step number. Use one writer and request flags.",
    "Putting transition rungs above output rungs and falling through multiple steps in one scan.",
    "Using OTL/OTU for step outputs so they stay on after the step changes.",
    "Waiting steps with no timeout, so a stuck sensor looks like a running machine.",
    "No default for unknown step values after a download or bad write.",
    "Resetting a fault straight back into the failed step with outputs energised."
  ],

  keyTerms: ["state-machine", "step-number", "state-transition", "step-timeout", "case-statement", "fault-state"],

  quiz: [
    {
      q: "A sequence is written with OTL/OTU latches per stage. After a power cycle, two stage latches are set. What is the root problem?",
      options: ["Nothing enforces that only one stage is active", "The scan time is too long", "OTL instructions are not retentive", "The program needs a bigger timer"],
      answer: 0,
      explain: [
        "Correct. A single step number can only hold one value, so only one state can be active.",
        "Scan time does not decide how many latches are set.",
        "OTL is retentive, which is why the bits survive. That is part of the problem, not the root cause.",
        "Timers do not control which latches remain set."
      ]
    },
    {
      q: "Why put an ELSE branch that sets Step to the fault state in the CASE?",
      options: ["It saves memory", "It makes the CASE run faster", "It is required by the compiler", "A corrupted or unexpected step value lands in a controlled state"],
      answer: 3,
      explain: [
        "Memory use is unaffected.",
        "Scan time does not improve.",
        "The compiler accepts CASE without ELSE.",
        "Correct. Unknown values then produce a visible fault instead of silent inactivity."
      ]
    },
    {
      q: "A ladder state machine skips from step 10 to step 30 in one scan, with no timer involved. Most likely cause?",
      options: ["The step DINT is too small", "Step 10's transition sits above step 20's, so the second sees the updated step, and its condition was already true", "The timer preset is zero", "The HMI wrote to the step"],
      answer: 1,
      explain: [
        "A DINT holds values far larger than 30.",
        "Correct. A MOV changes Step for the rungs below it in the same scan, so a later transition whose condition is already true fires immediately. Timer steps are protected because their EQU-gated timer starts at zero.",
        "A zero preset would finish the timer, but the skip described happens because of rung order.",
        "An HMI write is possible but not the typical cause of a double jump."
      ]
    },
    {
      q: "Which design adds pause/resume with the least risk?",
      options: ["A Held step number for every step", "Resetting to Idle on hold", "A hold flag that freezes the timer and forces outputs off while Step stays unchanged", "Unlatching all outputs and re-latching them on resume"],
      answer: 2,
      explain: [
        "That multiplies the states and the chance of a missed path.",
        "That loses the batch progress.",
        "Correct. The step is preserved and resuming continues in place.",
        "Latching is the pattern the state machine avoids."
      ]
    },
    {
      q: "Your fill step has no timeout. The level transmitter fails flat at 10%. What does the operator see?",
      options: ["An immediate fault", "The machine apparently running in Filling forever", "The sequence skipping to Mixing", "A controller major fault"],
      answer: 1,
      explain: [
        "Without a timeout nothing detects the failure.",
        "Correct. The transition condition never becomes true and nothing flags the stall.",
        "The transition needs the level condition, which is not met.",
        "A flat transmitter is not a controller fault."
      ]
    }
  ],

  resources: [
    { title: "Logix 5000 Controllers General Instructions Reference Manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/rm/1756-rm018_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Logix 5000 Controllers Tasks, Programs, and Routines", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm005_-en-p.pdf", type: "docs", source: "Rockwell Automation" },
    { title: "Programming Manual Logix 5000 Controllers Common Procedures", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/pm/1756-pm001_-en-e.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
