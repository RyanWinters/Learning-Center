# Ladder Logic Simulator spec

A browser ladder-logic simulator that teaches Allen-Bradley Logix-style programming with guided, auto-graded challenges.
Vanilla JS, classic scripts, no dependencies. It must be usable on a phone, because touch is the hard case.

## Files (simulator builder owns these)
- `assets/js/sim/parser.js`: neutral text ⇄ program model
- `assets/js/sim/engine.js`: tag database and scan execution (pure, no DOM; must also run under Node for tests)
- `assets/js/sim/render.js`: rung rendering (SVG), plus `LC.ladder.renderStatic(text)` for lesson code blocks
- `assets/js/sim/editor.js`: touch-friendly rung editor
- `assets/js/sim/io.js`: I/O panel widgets and simple process models
- `assets/js/views/lab.js`: `LC.views.lab(container, {id})`: lab index, challenge view, sandbox
- `assets/css/sim.css`: styles, using tokens from `tokens.css` only
- `content/sim/index.js`: `window.LC_SIM_INDEX = [{ id, title, level, lesson, summary }]` in curriculum order (all 26 ids from CONTENT_GUIDE.md)
- `content/sim/<id>.js`: `LC.sim({...})` challenge files
- `tools/sim-test.js`: Node script that loads the engine and every challenge, runs each `solution` against its `tests`, and confirms
  the `starter` fails at least one test (unless `starter === solution` for the tour). Exit 1 on failure.

## Program text format (Studio 5000 neutral text subset)
One rung per line. Instructions are written `MNEMONIC(operand,operand)`. Series is just adjacency. A branch is `[ leg , leg , … ]`, and branches nest.
Whitespace is optional. A trailing `;` is optional. `//` starts a rung comment.
```
XIC(Start)XIO(Stop)[XIC(Motor),XIC(Jog)]OTE(Motor);
XIC(Motor)TON(RunDelay,5000,0);
XIC(RunDelay.DN)OTE(Lamp);
```
Timers: `TON(tag,pre,accum)`. Counters: `CTU(tag,pre,accum)`. Compare: `GRT(a,b)`. Math: `ADD(a,b,dest)`. `MOV(src,dest)`. `LIM(low,test,high)`.
`SCP(in,inMin,inMax,outMin,outMax,dest)`. `CPT(dest,"expression")` with + - * / and parentheses over tags and numbers. Operands are tag paths
(`Tank.Level`, `Timer1.DN`, `Arr[3]`) or numeric literals.

## Instructions (v1)
Bit: XIC, XIO, OTE, OTL, OTU, ONS, OSR(storage,output), OSF(storage,output).
Timer: TON, TOF, RTO, RES. Counter: CTU, CTD, RES.
Compare: EQU, NEQ, GRT, GEQ, LES, LEQ, LIM. Math/move: ADD, SUB, MUL, DIV, MOV, CPT, SCP, CLR.
Follow Logix semantics: rung-condition-in → out per instruction; OTE writes false when its rung is false; TON .EN/.TT/.DN/.ACC/.PRE in ms;
TOF timing while the rung is false; RTO retains ACC until RES; CTU/CTD count on the false→true transition of their rung (keep .CU/.CD edge memory),
with .DN when ACC ≥ PRE and .OV/.UN; DIV by zero sets a minor fault flag on `S:Fault` instead of crashing. Output instructions on a branch leg
are allowed (parallel outputs).

## Tags and types
Types: BOOL, DINT, REAL, TIMER {PRE, ACC, EN, TT, DN}, COUNTER {PRE, ACC, CU, CD, DN, OV, UN}, arrays of BOOL/DINT/REAL, module I/O types, and UDTs
defined by a challenge (`udts: { Motor: { Run: "BOOL", Fault: "BOOL", Speed: "REAL", RunTimer: "TIMER" } }`). Tags auto-create as BOOL
when typed in the sandbox with a prompt to pick the type.

**Module I/O tags** use Logix-style names. Declare a tag such as `Local:1:I` with type `MOD_DI16` or `Local:2:O` with `MOD_DO16` and use the
bits as `Local:1:I.Data.0` to `.15`. `MOD_AI4` gives `Ch0Data` to `Ch3Data` (REAL) and `Ch0Fault` to `Ch3Fault`; `MOD_AO2` gives `Ch0Data` and
`Ch1Data`. The engine auto-creates a module tag when a program or I/O widget uses one of these paths.

**Tag presets.** A timer or counter takes its `PRE` and `ACC` from the first instruction that uses it (`TON(T1,5000,0)`). `PRE` can be a
number or a DINT tag, which is read every scan. TON/RTO `ACC` holds at `PRE`, and RES clears ACC/DN/TT but leaves EN to the rung. The tag table shows name, type, value (live), and description, and members expand.

## Scan model
Each scan: (1) copy physical inputs into the input image, (2) execute rungs top to bottom, left to right, (3) copy the output image to physical
outputs, (4) advance time. Show this as a 3-stage indicator that lights in step mode. Controls: Run / Pause / Single scan / Reset (Program →
Run clears non-retentive state). Scan time is 10–500 ms (default 50 ms), and the engine uses virtual time so tests run instantly.
Note in the UI that real Logix updates I/O asynchronously; the image-table model is the classic teaching model.

## Editor (touch first)
- Rungs are drawn as SVG with left/right rails. Energized paths are highlighted while running (thicker line, `--ok` color) and true contacts
  are filled. Timers and counters render as boxes with live PRE/ACC and EN/TT/DN bits.
- **Visual mode**: tap a rung to select it. "+" insertion targets appear between elements, at the rung end and on branch legs. Tapping one opens an
  instruction palette (grouped: Bit, Timer/Counter, Compare, Math/Move), then a tag picker with autocomplete over existing tags and members. Tap an
  element to edit its operands, delete it, or "Add branch around". Rung actions: add above/below, delete, move up/down, comment.
- **Text mode**: per-rung or whole-program textarea using the neutral text above, with parse errors shown inline. Switching modes round-trips.
- Undo/redo (at least 50 steps). Programs auto-save per challenge through `LC.store.saveSimProgram(id, text)` if `LC.store` exists,
  else localStorage `lc.sim.<id>`.
- Must be usable at 390px width: the rung canvas scrolls horizontally inside its own container, and palette and pickers are bottom sheets.

## I/O panel
Widgets bound to tags: `pb` (momentary pushbutton, press and hold; `nc: true` for a stop button that is true at rest), `toggle` (maintained
switch or selector), `sensor` (toggleable photo-eye or limit switch with an icon), `slider` (analog, min/max/step), `lamp`, `motor` (spinning
indicator), `value` (numeric display), `bar` (vertical level). Layout: inputs left, outputs right. On phones the panel stacks above the rungs and can collapse.
Processes: a challenge may include `process: { init(tags), step(tags, dtMs) }`. It is trusted content code, called after each scan, and drives inputs
from outputs, for example a tank level rising while `FillValve` is on. Render widgets bound to process tags live.

## Challenge file
```js
LC.sim({
  id: "sim-sealin", title: "Three-wire start/stop", level: 1, lesson: "plc-sealin",
  brief: `markdown: the story and what to build`,
  udts: {}, tags: { Start: "BOOL", Stop: "BOOL", Motor: "BOOL" },
  io: [ { tag: "Start", widget: "pb", label: "Start" }, { tag: "Stop", widget: "pb", nc: true, label: "Stop" },
        { tag: "Motor", widget: "motor", label: "Conveyor motor" } ],
  starter: "XIC(Start)OTE(Motor);",
  tests: [ { name: "Start latches the motor", steps: [ { set: { Start: true } }, { scan: 1 }, { set: { Start: false } }, { wait: 200 },
            { expect: { Motor: true } } ] }, … ],
  hints: [ "nudge", "approach", "near-solution" ],
  solution: "[XIC(Start),XIC(Motor)]XIO(Stop)OTE(Motor);",
  explain: `markdown shown after passing: why this works, how it looks in Studio 5000, real-world notes`,
  tips: [ "Real-world tip…" ]
});
```
Note: with `nc: true`, a Stop button that is *not pressed* reads true, as a real NC contact wired to an input does. Teach the
XIC(Stop) vs XIO(Stop) consequence in sim-xio and sim-sealin. Test steps: `set`, `scan` (n scans), `wait` (ms of virtual time at the current scan
time), `expect` (tag → value, numbers with ±0.5% tolerance), and `press` ({tag, ms}, a set-true/wait/set-false shorthand).
"Check" runs the tests headless against a copy of the program and lists pass/fail per test with the first failing expectation explained
("After pressing Stop, expected Motor = false but it was true").

## Lab view
- `#/lab`: intro, sandbox card, and the challenge list grouped by level with pass state and hints used.
- `#/lab/<id>`: brief (glossary-linked via `LC.glossaryLink` if present), I/O panel, editor, scan controls, tag table (collapsible), Check button,
  Hints button (reveals the next hint, counted), "Show solution" (after 3 hints or a failed check, with confirm), and an explain panel after passing.
  On a pass, call `LC.store.recordSim(id, { passed: true, hintsUsed })`.
- `#/lab/sandbox`: every instruction, an empty program, a labelled I/O panel laid out like a Logix chassis (slot 1: 8 pushbuttons/switches on `Local:1:I.Data.0`–`.7`; slot 2: 8 lamps on `Local:2:O.Data.0`–`.7`;
  slot 3: a level slider on `Local:3:I.Ch0Data`; slot 4: a value display on `Local:4:O.Ch0Data`), and freely added tags.
- `sim-tour` is an interactive walkthrough of the UI (coach marks or stepped instructions). Passing = completing the steps.

## Verification (bounded)
`node tools/sim-test.js` passes. Run one Playwright pass at 390×844 and 1280×800 on `#/lab/sim-sealin` (load the page via
`python3 server.py --port 8098`; if the app shell isn't ready yet, a temporary local harness page in your scratchpad is fine). Make one fix round
and one confirming run, then stop.
