LC.sim({
  id: "sim-tour", title: "Tour of the simulator", level: 1, lesson: "plc-studio",
  brief: `This lab is a small, honest model of a Logix controller. You write **ladder logic**, the simulator **scans** it, and a panel of buttons and lamps plays the part of the plant.

Take the tour below. Each step highlights a part of the screen and asks you to try it. You cannot break anything: **Reset** puts the simulator back to a clean state, and **Undo** takes back any edit.

Finish the last step to pass. There are no tests to fail here.`,
  tags: { Start: "BOOL", Lamp: "BOOL" },
  io: [
    { tag: "Start", widget: "pb", label: "Start button" },
    { tag: "Lamp", widget: "lamp", label: "Pilot lamp" }
  ],
  starter: "XIC(Start)OTE(Lamp); // Lamp is on while Start is held",
  tour: [
    { title: "A rung is an IF-THEN", target: "[data-tour=editor]",
      body: `The line across the editor is one **rung**. Power flows from the left rail to the right rail. \`XIC(Start)\` asks "is Start on?" and \`OTE(Lamp)\` turns the lamp on if the answer is yes. Read it like IF Start THEN Lamp.`, done: "next" },
    { title: "Press and hold Start", target: "[data-tour=io]",
      body: `In the **Inputs and outputs** panel, press and hold the Start button. On a phone, touch and hold. Watch the rung turn green and the lamp light.`, done: "input:Start:1" },
    { title: "Let go", target: "[data-tour=io]",
      body: `Release Start. The green path disappears and the lamp goes dark. \`OTE\` writes the rung state to the lamp **every scan**, so it follows the button exactly.`, done: "input:Start:0" },
    { title: "Pause the controller", target: "[data-tour=run]",
      body: `Press **Pause**. The simulator now only runs when you tell it to, which lets you watch one scan at a time.`, done: "pause" },
    { title: "Step through one scan", target: "[data-tour=step]",
      body: `Press and hold Start, then press **Single scan**. The three stages light in order: **Input scan** copies the button into memory, **Logic** solves the rung, **Output scan** drives the lamp. Real controllers do exactly this, thousands of times a second.`, done: "scan" },
    { title: "Run it again", target: "[data-tour=run]",
      body: `Press **Run** to resume. The **Scan time** and **Speed** menus control how fast simulated time passes. Speed matters later, when a timer needs 30 seconds.`, done: "run" },
    { title: "Add a rung", target: "[data-tour=add-rung]",
      body: `Tap **Rung** to add an empty rung below the selected one. The program is a list of rungs, solved top to bottom.`, done: "edit" },
    { title: "Place an instruction", target: "[data-tour=editor]",
      body: `Select the new rung, then tap the round **+** on it. Pick **Bit**, then **XIC**, and type \`Start\` as the tag. Tap any instruction later to edit it, insert beside it, add a branch around it, move it or delete it.`, done: "edit" },
    { title: "See it as text", target: "[data-tour=mode-text]",
      body: `Tap **Text**. The same program is one line per rung, in the neutral text format Studio 5000 can import and export. Edit either view and the other follows. Switch back to **Ladder** when you are done looking.`, done: "mode" },
    { title: "Undo", target: "[data-tour=undo]",
      body: `Tap the **Undo** arrow to take back your last edit. You get at least 50 steps of undo, in both views.`, done: "undo" },
    { title: "The tag table", target: ".lab-tags", open: ".lab-tags",
      body: `Open **Tags** under the editor. Every tag shows its type and live value, and timers and counters expand to show their members. Tap a 0 or 1 to flip a bit, which is like forcing a value while you debug.`, done: "next" },
    { title: "Check, hints and solutions", target: "[data-tour=editor]",
      body: `On a real challenge you press **Check** to run the tests. **Hint** reveals three tiers, nudge then approach then nearly-there, and each one costs a little XP. After three hints or a failed check you can **Show solution**. Your progress and program are saved automatically.`, done: "next" }
  ],
  tests: [
    { name: "The lamp follows the Start button", steps: [
      { scan: 2 }, { expect: { Lamp: false } },
      { set: { Start: true } }, { scan: 1 }, { expect: { Lamp: true } },
      { set: { Start: false } }, { scan: 1 }, { expect: { Lamp: false } } ] }
  ],
  hints: [
    "Take the tour steps in order. Each one waits for you to try the thing it describes.",
    "If a step seems stuck, look for the highlighted outline. That is the control it wants.",
    "You can use Skip step on any step. Finish the last step to pass."
  ],
  solution: "XIC(Start)OTE(Lamp);",
  explain: `You have now used every part of the lab.

- **Rungs** read left to right. Contacts ask questions, coils and other outputs act.
- The **scan** has three stages: copy inputs, solve all rungs top to bottom, copy outputs. Everything you will learn about timers, one-shots and ordering follows from that loop.
- **Tags** are the variables. A bit like \`Start\` is a BOOL. A timer or counter is a structure with members such as \`.ACC\` and \`.DN\`.
- **Check** runs the challenge tests in a copy of the program, so a failing check never disturbs your running simulation.

In Studio 5000 the same rung looks almost identical. The editor is a drawing of the text above it, and you can drop into text any time.`,
  tips: [
    "Pause the controller and use Single scan whenever you are unsure what a rung does. Watching the order is the fastest way to learn it.",
    "Learn the keyboard in Studio 5000 early: \`I\` adds an XIC, \`O\` adds an OTE, \`T\` adds a TON on the selected rung. Those few keys make ladder fast to enter.",
    "This simulator's Reset clears every tag. A real controller keeps most tag values through a power cycle, so never rely on a restart to clear state."
  ]
});
