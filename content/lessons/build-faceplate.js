LC.lesson({
  "id": "build-faceplate",
  "title": "Lab 2: A motor faceplate from one tagPath",
  "track": "build",
  "minutes": 60,
  "level": 3,
  "prereqs": [
    "build-motor-udt",
    "persp-embedding"
  ],
  "tags": [
    "lab",
    "perspective",
    "faceplate",
    "embedded-view",
    "flex-repeater",
    "isa-101"
  ],
  "summary": "Build a Perspective motor faceplate with one tagPath parameter, indirect bindings, ISA-101 style states, a popup and a flex repeater showing all motors.",
  "objectives": [
    "Create a view whose only input is tagPath and derive every binding from it",
    "Build one derived state property and style it by state",
    "Write commands to Cmd members only",
    "Open the faceplate as a popup for any motor",
    "Fill a page with faceplates using a flex repeater"
  ],
  "body": "\nA faceplate is a small screen for one piece of equipment. The trick of this lab is that you build it **once**, give it a single input, `tagPath`, and reuse it for M101, M102, M103 and every motor you add later. You will build the view, bind it with indirect bindings, style states the ISA-101 way, open it as a popup, and then fill a screen with all three motors using a flex repeater. The theory is in {{lesson:persp-embedding}} and the library pattern in {{lesson:persp-library}}. Styling rules are in {{lesson:persp-hphmi}}.\n\n## The target\n\n{{diagram:flow}}\n\nOne view, `Faceplates/Motor`, with one parameter: `tagPath = [default]Plant1/Area10/Line1/M101`. Every component derives its member paths from it: `{tagPath}/Sts/Running`, `{tagPath}/Cmd/Start`, `{tagPath}/Cfg/Description`.\n\n## Part 1: Create the faceplate view\n\n1. In the Project Browser, under Perspective > Views, open the `Faceplates` folder and create a new view named `Motor`. Use a Flex or Coordinate container as the root, whichever you prefer for a fixed-size tile. A fixed size such as 260 by 300 works well for a faceplate.\n2. Open the view's **Params** and add one parameter, `tagPath`, type String. Set its default to `[default]Plant1/Area10/Line1/M101` so the Designer preview shows live data. Mark it as an input parameter where your 8.3 build offers that option.\n3. Add components, top to bottom:\n\n| Component | Purpose | Binds to |\n|---|---|---|\n| Label (title) | Motor tag and description | `{tagPath}/Cfg/Description` and the tag name |\n| Label or shape (state) | Running, Stopped, Fault, Not ready | Expression from several Sts members |\n| Label x2 (readouts) | Speed (Hz) and run hours | `{tagPath}/Sts/Speed`, `{tagPath}/Sts/RunHours` |\n| Label (mode) | Auto or Manual | `{tagPath}/Sts/Auto` |\n| Button x3 | Start, Stop, Reset | Write to `{tagPath}/Cmd/...` |\n\n## Part 2: Indirect bindings from one parameter\n\nAn indirect tag binding builds its path from a reference list. The idea: define one reference, `{1}`, that equals `{view.params.tagPath}`, and write the tag path as `{1}/Sts/Running`.\n\n1. Select the speed label and add a **Tag binding** to `props.text`.\n2. Choose indirect mode. In the reference list, add one entry and bind it to `{view.params.tagPath}`.\n3. Set the tag path to `{1}/Sts/Speed`. Because `tagPath` already contains the provider (`[default]`), no provider prefix is added.\n4. Use the number formatting on the binding, or a transform, to show one decimal.\n\nRepeat for each readout. Most faceplates need five or six bindings and they all share the same reference.\n\n> [!tip] One param, not twelve\n> Resist adding a parameter per member. `tagPath` alone keeps the interface tiny, and the faceplate cannot be wired to mismatched members. If a new member is added to the UDT, only the view changes.\n\n## Part 3: One state, not four booleans\n\nOperators should see one word for the motor's state. Create a view custom property `custom.state` and fill it with an expression binding that uses indirect tag bindings from the same reference. Bind four custom properties first (`custom.running`, `custom.ready`, `custom.fault`, `custom.good`), each as an indirect tag binding. Then add `custom.state` as an expression:\n\n```text\nif(!{this.custom.good}, \"Comm lost\",\n  if({this.custom.fault}, \"Fault\",\n    if({this.custom.running}, \"Running\",\n      if({this.custom.ready}, \"Stopped\", \"Not ready\"))))\n```\n\n`custom.good` is a binding on the Sts/Running tag's quality: use the binding's quality output or an expression with `isGood()`. Test it against all three motors by changing the default `tagPath`.\n\nCheck: for M101 you see Running, for M103 you see Fault (it has the fault bit set), and when the PLC1 device is disabled you see Comm lost.\n\n## Part 4: State styling the ISA-101 way\n\nISA-101 style screens keep the normal state quiet and spend color only on abnormal conditions. Normal running equipment is not green. It is a neutral gray, and a bright color means \"look at this.\"\n\n| State | Fill | Text | Why |\n|---|---|---|---|\n| Running | Mid gray | Dark | Normal, nothing to see |\n| Stopped | Light gray | Dark | Normal, off |\n| Not ready | Light gray, dashed outline | Dark | Different from stopped by shape, not color |\n| Fault | Saturated red or amber (match your alarm priority) | White or dark, high contrast | Needs action |\n| Comm lost | Hatched or magenta, per your standard | | Not a motor problem, a data problem |\n\nDo not rely on color alone: the state word stays on screen so color-blind operators and monochrome printouts still work.\n\n1. Create a **style class** `Motor/State` with variants for each state (for example a `running` class, a `fault` class).\n2. Bind the state component's `props.style.classes` to an expression that maps `custom.state` to a class name, such as `\"Motor/State \" + ...` using `case` or `if`. In 8.3 the style class path and variant names follow the folder you saved them in.\n3. Avoid animation on normal states. Blinking is for unacknowledged alarms only.\n\nYou should see: M101 is gray, M103 is red, nothing is green.\n\n## Part 5: Commands that tell the truth\n\nButton writes go to `Cmd` only. On the Start button, add an `onActionPerformed` script:\n\n```python\npath = self.view.params.tagPath + \"/Cmd/Start\"\nsystem.tag.writeBlocking([path], [True])\n```\n\nDo the same for Stop and Reset. The PLC clears the bits when it has acted, so there is no \"write false\" in the HMI. In this lab you clear them by hand. Disable Start unless `Sts.Ready` is true and the motor is not already running, by binding the button's `props.enabled` to an expression of those custom properties. Remember that this enable is a **convenience**, not a safety measure. The real interlocks and permissives live in the PLC. See the motor safety rule in the [naming sheet](content/files/meridian-naming-sheet.md).\n\nAlso restrict writes by role. Apply a security requirement to the button so that only a role such as Operator can use it (see {{lesson:ign-security}}).\n\n## Part 6: Open it as a popup\n\n1. In the `Meridian` project, create a page view named `Line1` (path `/line1`) and add three small buttons labeled `M101`, `M102`, `M103`.\n2. On each button's `onActionPerformed`, open a popup:\n\n```python\nsystem.perspective.openPopup(\"motor-\" + self.props.text, \"Faceplates/Motor\",\n    params={\"tagPath\": \"[default]Plant1/Area10/Line1/\" + self.props.text},\n    title=\"Motor \" + self.props.text, modal=False)\n```\n\nThe popup id is unique per motor so you can open two faceplates side by side. The same popup mechanism is described in {{lesson:persp-navigation}}.\n\n## Part 7: A flex repeater of all motors\n\n1. On the `Line1` page add a **Flex Repeater**. Set its `props.path` to `Faceplates/Motor` and its direction to row with wrap enabled.\n2. Add a view custom property `custom.motors` with three strings: the three tag paths.\n3. Bind `props.instances` to a script transform on `custom.motors`:\n\n```python\ndef transform(self, value, quality, timestamp):\n    return [{\"tagPath\": p} for p in value]\n```\n\nThe key `tagPath` must match the faceplate's parameter name exactly, including case. Turn off the repeater's \"use default width/height\" options if you want tiles to size to the repeater.\n\nYou should see: three identical faceplates in a row, each with its own live data. Adding a fourth motor to `custom.motors` adds a fourth tile.\n\n> [!note] A repeater child must be an embedded view\n> A Flex Repeater only takes embedded views as its children, unlike a Flex Container. That is by design: it repeats one view.\n\n## Common mistakes\n\n- **Parameter name mismatch** between the instance object (`tagpath`) and the view param (`tagPath`). The faceplate then shows its default motor in every tile.\n- **Adding the provider twice.** `tagPath` already includes `[default]`. Prefixing it again gives a bad path.\n- **Binding colors directly to booleans.** Use one derived `state` property so color and text can never disagree.\n- **Using green for running.** It trains operators to read color as \"fine,\" which is the opposite of the intent. See {{lesson:persp-hphmi}}.\n- **Forgetting the view's default `tagPath` for Designer testing**, then wondering why everything is empty while you build.\n\n## Result check\n\nA popup faceplate opens for any motor, a repeater shows all three, and you can change the layout of the faceplate once and see it change in every tile.\n",
  "checklist": [
    "View Faceplates/Motor exists with a single String param tagPath",
    "Default tagPath is [default]Plant1/Area10/Line1/M101",
    "Speed and run hours labels use indirect tag bindings built from the tagPath reference",
    "Description label bound to Cfg/Description",
    "custom.state expression shows Running, Stopped, Not ready, Fault and Comm lost",
    "M103 shows Fault and disabling PLC1 shows Comm lost",
    "State style classes defined with neutral normal states and color only for abnormal",
    "Start, Stop and Reset buttons write only to Cmd members",
    "Start button enable depends on Ready and not Running",
    "Buttons restricted by security role",
    "Page Line1 opens a popup faceplate for M101, M102 and M103",
    "Flex repeater on Line1 shows three faceplates from custom.motors",
    "Adding a fourth path to custom.motors adds a fourth tile"
  ],
  "eli5": "\nA restaurant has one menu card design. You do not paint a new menu for each table. You print the same card and write the table number at the top.\n\nThe faceplate is that menu card. It has blank spaces for the motor's name, whether it is running, how fast it is going, and buttons. The one thing you write at the top is the motor's address, the `tagPath`. Everything else on the card finds its answer by adding something to that address, like \"address plus /Speed.\"\n\nThe repeater is the person who prints the same card for every table at once. If you change the card design, every table's card changes the next time it is printed.\n",
  "why": "\n**Why one parameter?** Every extra parameter is a chance for a mismatch between members of different motors. With `tagPath` alone, the faceplate cannot be pointed at the speed of one motor and the status of another. It also keeps the interface the same for the person embedding it. Some integrators pass the whole path and derive the rest, as here. Others pass named parameters for flexibility. The single path wins when equipment follows a UDT, because the UDT guarantees the members exist.\n\n**Why indirect bindings and not a script?** Bindings are subscribed by the gateway and updated on change. A script that reads tags in a loop polls, costs more, and is harder to read. Indirect bindings also fail visibly: a wrong path turns the component's quality bad.\n\n**Why a derived `state` property?** If color is bound to Running and the text to Fault, there will be a moment where they disagree and the screen lies. One expression that picks the state in priority order (comm lost, then fault, then running) makes the screen consistent. The priority order is a design decision worth writing into the FDS.\n\n**Why gray for normal?** In a plant with hundreds of green lights, nobody sees the one that matters. High-performance HMI practice keeps normal quiet so abnormal stands out. Not every customer accepts this, so many integrators offer it as an option and agree it in the style guide.\n\n**Why not trust the Start button's enabled state?** Disabling a button is a usability aid. A second client, a script or a mistaken write can still set the bit. The PLC must decide whether starting is allowed.\n",
  "diagrams": {
    "flow": "<svg viewBox=\"0 0 640 230\" role=\"img\" aria-label=\"A list of tag paths feeds a flex repeater, which creates one Motor faceplate per path; each faceplate builds indirect bindings from its tagPath\"><defs><marker id=\"build-faceplate-ah\" markerWidth=\"10\" markerHeight=\"8\" refX=\"9\" refY=\"4\" orient=\"auto\"><path class=\"dg-fill-line\" d=\"M0,0 L10,4 L0,8 z\"/></marker></defs><rect class=\"dg-box\" x=\"20\" y=\"60\" width=\"170\" height=\"100\" rx=\"6\"/><text class=\"dg-title\" x=\"34\" y=\"84\">custom.motors</text><text class=\"dg-text-mono\" x=\"34\" y=\"110\">.../M101</text><text class=\"dg-text-mono\" x=\"34\" y=\"130\">.../M102</text><text class=\"dg-text-mono\" x=\"34\" y=\"150\">.../M103</text><rect class=\"dg-box-accent\" x=\"240\" y=\"60\" width=\"150\" height=\"100\" rx=\"6\"/><text class=\"dg-title\" x=\"256\" y=\"96\">Flex Repeater</text><text class=\"dg-text-sm\" x=\"256\" y=\"120\">instances:</text><text class=\"dg-text-mono\" x=\"256\" y=\"140\">{tagPath: ...}</text><rect class=\"dg-box\" x=\"440\" y=\"20\" width=\"180\" height=\"56\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"452\" y=\"44\">Faceplates/Motor</text><text class=\"dg-text-mono\" x=\"452\" y=\"64\">{1}/Sts/Running</text><rect class=\"dg-box\" x=\"440\" y=\"88\" width=\"180\" height=\"56\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"452\" y=\"112\">Faceplates/Motor</text><text class=\"dg-text-mono\" x=\"452\" y=\"132\">{1}/Sts/Running</text><rect class=\"dg-box\" x=\"440\" y=\"156\" width=\"180\" height=\"56\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"452\" y=\"180\">Faceplates/Motor</text><text class=\"dg-text-mono\" x=\"452\" y=\"200\">{1}/Sts/Running</text><line class=\"dg-line\" x1=\"190\" y1=\"110\" x2=\"238\" y2=\"110\" marker-end=\"url(#build-faceplate-ah)\"/><line class=\"dg-line\" x1=\"390\" y1=\"110\" x2=\"438\" y2=\"110\" marker-end=\"url(#build-faceplate-ah)\"/></svg>"
  },
  "pitfalls": [
    "Instance key tagpath vs view param tagPath: names must match exactly.",
    "Prefixing the provider onto a tagPath that already has it.",
    "Binding color and text to different booleans so they can disagree.",
    "Using green for normal running and losing the eye-catch of abnormal.",
    "Treating a disabled Start button as a safety interlock."
  ],
  "keyTerms": [
    "faceplate",
    "embedded-view",
    "flex-repeater",
    "tag-path-param",
    "indirect-tag-binding",
    "view-params",
    "isa-101",
    "hp-hmi",
    "popup-view"
  ],
  "quiz": [
    {
      "q": "Every tile in your repeater shows M101's data. What is the most likely cause?",
      "options": [
        "The repeater is limited to one tile",
        "The instance objects use a key that does not exactly match the view parameter name",
        "The historian is off",
        "Style classes are missing"
      ],
      "answer": 1,
      "explain": [
        "The repeater makes one tile per instance.",
        "Correct. A mismatched key (tagpath vs tagPath) leaves the param at its default, which is M101.",
        "History has no effect on live bindings.",
        "Styles change looks, not data."
      ]
    },
    {
      "q": "Why derive one state property and not bind color and text to separate booleans?",
      "options": [
        "Expressions run faster",
        "So color and text can never disagree, and priority between conditions is decided in one place",
        "Perspective only allows one binding per component",
        "Booleans cannot be bound to styles"
      ],
      "answer": 1,
      "explain": [
        "Speed is not the driver.",
        "Correct. A single priority-ordered expression gives one answer for every consumer.",
        "Components can have many bindings.",
        "Booleans can be used. They just invite contradictions."
      ]
    },
    {
      "q": "Why is gray the normal color in ISA-101 style screens?",
      "options": [
        "Gray displays are cheaper",
        "Quiet normal states make abnormal colors stand out and keep alarms meaningful",
        "Green is not a supported color",
        "It reduces bandwidth"
      ],
      "answer": 1,
      "explain": [
        "Cost is unrelated.",
        "Correct. If everything is bright, nothing is.",
        "Any color is supported. It is a design choice.",
        "Colors do not change bandwidth."
      ]
    },
    {
      "q": "The Start button is disabled when Ready is false. Does this make the motor safe against an unwanted start?",
      "options": [
        "Yes, the HMI is the last line of defense",
        "No, it is a usability aid. The PLC and the hardwired circuit must enforce permissives and protection",
        "Yes, if the user role is Operator",
        "Only if the button is hidden"
      ],
      "answer": 1,
      "explain": [
        "The HMI can never be the only protection.",
        "Correct. Anyone or any script that can write the bit bypasses the button.",
        "Roles limit who clicks, not what the PLC accepts.",
        "Hiding does not stop a write."
      ]
    },
    {
      "q": "Why does the faceplate take tagPath instead of separate params for speed, state and command?",
      "options": [
        "Perspective cannot take more than one param",
        "One path guarantees all members belong to the same motor because the UDT guarantees the members exist",
        "Separate params are not allowed in embedded views",
        "It makes the view smaller on disk"
      ],
      "answer": 1,
      "explain": [
        "Views can take many params.",
        "Correct. Members are derived from one identity, so mismatches cannot occur.",
        "They are allowed. They are just riskier.",
        "Disk size is not the reason."
      ]
    }
  ],
  "resources": [
    {
      "title": "Embedded Views (8.3)",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/views-in-perspective/embedded-views",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Perspective - Embedded View component (8.3)",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-embedding-palette/perspective-embedded-view",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Perspective - Flex Repeater",
      "url": "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-embedding-palette/perspective-flex-repeater",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Flex Repeater video (8.3)",
      "url": "https://inductiveuniversity.com/videos/flex-repeater/8.3",
      "type": "video",
      "source": "Inductive University"
    },
    {
      "title": "Building in Perspective course",
      "url": "https://inductiveuniversity.com/courses/elective-studies/building-in-perspective",
      "type": "course",
      "source": "Inductive University"
    }
  ]
});
