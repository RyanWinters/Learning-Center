LC.lesson({
  id: "ign-udts",
  title: "UDTs in Ignition",
  track: "ignition",
  minutes: 30,
  level: 2,
  prereqs: ["ign-tags"],
  tags: ["ignition", "udt", "parameters", "templates", "design"],
  summary: "A UDT definition is written once; every motor, valve or tank is an instance that points at its own PLC tag by parameter. Done well, it makes the PLC, the tag tree and the screens agree.",
  objectives: [
    "Distinguish a UDT definition from an instance and say what an edit to each does",
    "Build an indirect OPC item path from {InstanceName} and custom parameters",
    "Use nesting, inheritance and overrides without creating an unmaintainable tree",
    "Put alarms, history and scripts in the definition so every instance gets them",
    "Map an Ignition UDT 1:1 onto a Logix UDT",
    "Explain why a UDT-first design makes Perspective templating nearly trivial"
  ],

  body: `
## Definitions and instances

A {{term:udt|UDT}} in Ignition is a tag structure you define once and stamp out many times. The two halves:

- A **definition** (data type) is the blueprint. It lives in the *Data Types* area of the Tag Browser. Its tags do not run. Nothing polls, nothing subscribes. It exists to be inherited.
- An **instance** is a running copy. It has a name (\`Motor_101\`), points at its definition, and executes like any folder of tags.

The relationship stays live. Edit the definition (add a member, change an alarm setpoint, fix a scaling) and every instance updates. An instance cannot add members of its own. It can only override properties the definition allows. That restriction is the point: 200 motors that cannot drift apart.

## Parameters and indirect paths

If every instance had the same OPC path, they would all read the same PLC tag. **Parameters** fix that. A parameter is a named value on the definition that each instance sets for itself. You use it by wrapping its name in braces anywhere a property accepts text, most importantly the OPC item path.

Ignition provides one parameter for free, \`{InstanceName}\`, the name of the instance. Anything else is a custom parameter you declare on the definition's root, such as \`PLC\` (the device connection name) or \`PlcTag\`.

\`\`\`text
ns=1;s=[{PLC}]{PlcTag}.Sts_Running
\`\`\`

For the instance \`Motor_101\` with \`PLC = PLC1\` and \`PlcTag = Motor_101\`, that resolves to \`ns=1;s=[PLC1]Motor_101.Sts_Running\`. The same string works for 400 instances because the instance supplies the pieces. If your Ignition instance names match the PLC tag names exactly (a very good habit), you can write \`[{PLC}]{InstanceName}.Sts_Running\` and set just one parameter, or none.

Parameters are not limited to paths. They are available to expressions, alarm names and scripts on the same definition, and they can drive "is this a VFD or a starter?" decisions. Keep them few. Every parameter is something an engineer must fill in correctly 400 times.

> [!tip] Parameters are strings
> Everything substitutes as text. Declare the data type on the parameter (string, integer, boolean and so on), but remember that what lands in the OPC path is text. Spaces or stray characters in a parameter value are a classic source of Bad_NotFound.

## Nesting, inheritance and overrides

**Nesting.** A UDT member can itself be an instance of another UDT. A \`Pump\` might contain a \`Motor\` and an \`AnalogInput\` for discharge pressure. Parameters can pass down: the inner member's path can use the outer \`{InstanceName}\`. This mirrors {{term:nested-udt|nested UDTs}} in Logix.

**Inheritance.** A definition can name a *parent* data type. The child gets all parent members and adds its own. A \`VFD_Motor\` can extend \`Motor\` with speed members. Use it for real "is-a" relations and keep the chain shallow (two levels). Changing an existing instance's parent type is not supported, so decide early.

**Overrides.** An instance can change a property on a member, for example a different high-alarm setpoint on one tank. The Designer marks overridden properties visually. Remove the override and the value falls back to the definition. Overrides are legitimate for setpoints and not for structure. If you find yourself overriding the same property on 80 percent of instances, the definition is wrong.

{{diagram:udt}}

## Putting behaviour in the definition

Anything you can put on a tag you can put on a UDT member:

- **Alarms.** Define \`Sts_Fault\` once with its priority, display path and label. Every motor alarms the same way. A parameter can supply the area name for the alarm's display path.
- **History.** Switch on history for speed feedback with a sensible deadband and sample mode. Each instance is then historized without anyone remembering.
- **Scripts.** Tag event scripts (value changed, alarm events) attach to members. They use the tag path of the member that fired, so one script serves every instance.
- **Documentation.** Descriptions and engineering units on members flow into every screen that uses them.

## Matching a PLC UDT 1:1

The cleanest architecture is a UDT in the controller and a UDT with the same name and the same members in Ignition. The PLC owns the structure, the HMI mirrors it. See {{lesson:plc-udt}} for the PLC side.

> [!example] Worked example: Motor
> The Logix data type \`Motor_UDT\`:
>
> | Member | Type | Direction |
> |---|---|---|
> | Cmd_Start | BOOL | HMI to PLC (a pulse) |
> | Cmd_Stop | BOOL | HMI to PLC (a pulse) |
> | Cmd_Auto | BOOL | HMI to PLC |
> | Sts_Running | BOOL | PLC to HMI |
> | Sts_Auto | BOOL | PLC to HMI |
> | Sts_Fault | BOOL | PLC to HMI |
> | SpeedSP | REAL | HMI to PLC |
> | SpeedFB | REAL | PLC to HMI |
> | RunHours | DINT | PLC to HMI |
>
> The controller has tags \`Motor_101\`, \`Motor_102\` and so on, each of type \`Motor_UDT\`. In Ignition, create a data type **Motor** with the same nine members, each an OPC tag in a Default tag group. On the definition, add parameters \`PLC\` (default \`PLC1\`) and, if you do not match names, \`PlcTag\`. Every member's item path follows the pattern \`ns=1;s=[{PLC}]{InstanceName}.<Member>\`. Configure these on the definition:
>
> - \`Sts_Fault\`: alarm on true, priority High, label "Motor fault".
> - \`SpeedFB\`: history on, 2 percent deadband, Engineering Units rpm.
> - \`SpeedSP\`: write access restricted to the Operator role and above.
> - \`Cmd_Start\`, \`Cmd_Stop\`: no history; the PLC resets them after acting.
>
> Then add instances \`Motor_101\` through \`Motor_140\`. Each is a folder in the tag tree with nine live tags, one shared alarm definition, and zero hand-typed item paths.

The reverse rule matters just as much. If the Logix UDT changes (a member added, a type changed), change the Ignition definition on the same day, or the Gateway will show Bad_NotFound on the new members. The names must match exactly, including case.

## Why UDT-first makes templating trivial

In Perspective, a view takes a **parameter**, typically a tag path. A \`MotorFaceplate\` view receives \`instancePath = [default]Plant/Motor_101\` and binds each component to \`{view.params.instancePath}/Sts_Running\`, \`{view.params.instancePath}/SpeedFB\` and so on. Because every instance has identical member names, one view serves every motor. Put it in a flex repeater and feed it a list of instance paths, and the screen for 40 motors is one view and one list. That depends entirely on the UDT guaranteeing the member names. Without it you write 40 screens and fix every change 40 times. See {{lesson:persp-embedding}}.

## Instances in JSON

An exported instance is small, because it stores only the definition name and the parameter values:

\`\`\`json
{
  "name": "Motor_101",
  "typeId": "Motor",
  "tagType": "UdtInstance",
  "parameters": { "PLC": "PLC1" }
}
\`\`\`

That small size is what makes bulk creation by script or spreadsheet practical: generate this JSON for 40 motors and import it. Treat the exact keys as something to confirm against an export from your own Gateway.

> [!note] In 8.1
> UDT definitions, parameters, \`{InstanceName}\`, nesting, inheritance and overrides all work the same in 8.1. If you have 7.9 habits, note that 8.x UDTs inherit from a parent type through the definition, not through copying.
`,

  eli5: `
Think of a cookie cutter and a tray of cookies. The cutter is the definition. Each cookie is an instance. If you decide every cookie should have a hole in the middle, you change the cutter once and every new cookie has the hole. You can't change the shape of a single cookie by itself, though you can put different sprinkles on one, and that is called an override.

Now suppose each cookie needs a label that says which oven it came from. You don't make a different cutter for every oven. You write the label's blank, "Oven number ___", on the cutter, and fill in the blank for each cookie. Those blanks are parameters.

The factory machines have the same idea in the PLC: a "motor" shape with the same slots (start button, running light, fault light). Ignition copies the same shape, so the screen that shows a motor only needs to be drawn once and can show any motor, as long as you tell it which cookie to look at.
`,

  why: `
**Why definitions don't run.** If a definition were live, it would poll the PLC for a tag that does not exist and generate noise. Keeping it inert makes it a pure blueprint, and it means editing it is safe at any time of day.

**Why match the PLC UDT exactly?** Every translation layer is a place to make a mistake. If the PLC says \`Sts_Fault\` and the HMI says \`Fault\`, someone has to remember the mapping forever. When the names are identical, the OPC path can be generated from the instance name, a screen can be copied across projects, and a commissioning tech who knows one side knows the other. The cost is that structure changes must be coordinated. Most teams accept this, and some treat the PLC UDT as the source of truth that generates the Ignition definition.

**Why keep behaviour in the definition?** An alarm configured on one motor tag by hand will be forgotten on the next motor. Behaviour on the definition is applied by construction.

**The inheritance debate.** Inheritance is powerful and abused. Veteran integrators often prefer a flat \`Motor\` with optional members over a five-level tree of \`Motor\`, \`VFDMotor\`, \`ReversingVFDMotor\`. Unused members cost almost nothing, because a member whose OPC path points nowhere can simply be left unused. A confusing hierarchy costs engineers' time every project.

**Why parameters sparingly?** Each parameter is a field someone fills in for every instance. A mistyped value fails quietly as a bad-quality tag. Prefer deriving values from \`{InstanceName}\` and folder structure.

**Why UDT-first even in small systems.** It is cheapest at the start. Retrofitting UDTs onto 600 loose tags later means re-pointing every screen.
`,

  history: `
The idea came from the PLC world, where user-defined structures became the normal way to model equipment. Ignition's data types add two things on top: parameters, so one definition can point at many different PLC tags, and live definitions, so a change to the definition updates every instance. The older habit it replaced was copying a folder of tags and editing each copy by hand.
`,

  examples: [
    {
      title: "A tank with an overridden alarm",
      body: `Twenty tanks use the Tank UDT with a High alarm at 90 percent. Tank_7 is shorter and must alarm at 80. On the instance, override only the High alarm setpoint. If the definition's priority later changes, Tank_7 follows it for everything except the setpoint, which stays at 80.`
    },
    {
      title: "Bad_NotFound after a controller edit",
      body: `The controls engineer adds \`Cmd_Reset\` to the Logix Motor_UDT and downloads. In Ignition nothing changes until someone adds \`Cmd_Reset\` to the Motor definition. Members that exist in Ignition but not in the PLC show Bad_NotFound. Members that exist in the PLC but not in Ignition are simply invisible. Both directions need a sync step in your change process.`
    }
  ],

  diagrams: {
    udt: `<svg viewBox="0 0 640 250" role="img" aria-label="One Motor definition feeding three instances, each with its own PLC tag name resolved from the instance name">
  <defs><marker id="ign-udts-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="20" y="30" width="220" height="190" rx="6"/>
  <text class="dg-title" x="34" y="54">Motor (definition)</text>
  <text class="dg-text-mono" x="34" y="80">Cmd_Start</text>
  <text class="dg-text-mono" x="34" y="100">Sts_Running</text>
  <text class="dg-text-mono" x="34" y="120">Sts_Fault  + alarm</text>
  <text class="dg-text-mono" x="34" y="140">SpeedFB    + history</text>
  <text class="dg-text-muted" x="34" y="170">path:</text>
  <text class="dg-text-mono" x="34" y="190">[{PLC}]{InstanceName}.Sts_Running</text>
  <rect class="dg-box" x="330" y="20" width="290" height="56" rx="6"/>
  <text class="dg-text-sm" x="344" y="42">Motor_101  PLC=PLC1</text>
  <text class="dg-text-mono" x="344" y="62">[PLC1]Motor_101.Sts_Running</text>
  <rect class="dg-box" x="330" y="97" width="290" height="56" rx="6"/>
  <text class="dg-text-sm" x="344" y="119">Motor_102  PLC=PLC1</text>
  <text class="dg-text-mono" x="344" y="139">[PLC1]Motor_102.Sts_Running</text>
  <rect class="dg-box" x="330" y="174" width="290" height="56" rx="6"/>
  <text class="dg-text-sm" x="344" y="196">Motor_201  PLC=PLC2</text>
  <text class="dg-text-mono" x="344" y="216">[PLC2]Motor_201.Sts_Running</text>
  <line class="dg-line" x1="240" y1="110" x2="328" y2="48" marker-end="url(#ign-udts-ah)"/>
  <line class="dg-line" x1="240" y1="125" x2="328" y2="125" marker-end="url(#ign-udts-ah)"/>
  <line class="dg-line" x1="240" y1="140" x2="328" y2="200" marker-end="url(#ign-udts-ah)"/>
</svg>`
  },

  pitfalls: [
    "Letting the Ignition definition drift from the Logix UDT, then chasing Bad_NotFound on new members.",
    "Using different case or underscores between the PLC tag name and {InstanceName}. OPC item names are matched exactly.",
    "Declaring many custom parameters that could be derived from the instance name.",
    "Overriding the same property across most instances instead of fixing the definition.",
    "Deep inheritance chains that no one can read.",
    "Hand-editing one instance's alarms, so the next motor silently lacks them."
  ],

  keyTerms: ["udt", "ign-udt-definition", "ign-udt-instance", "ign-udt-parameter", "ign-indirect-path", "resource-override", "nested-udt", "udt-member"],

  quiz: [
    {
      q: "You change the high-alarm setpoint on the Tank UDT definition. What happens?",
      options: ["Nothing, definitions are only templates for new instances", "Every existing instance updates, except where that property is overridden", "Only instances created after the change update", "The Gateway must be restarted first"],
      answer: 1,
      explain: [
        "Instances remain linked to the definition, so changes propagate.",
        "Correct. Instances inherit live from the definition, and overridden properties keep their own value.",
        "Existing instances stay linked and also update.",
        "No restart is needed. The tag system picks up the change."
      ]
    },
    {
      q: "Motor_101 shows Bad_NotFound on every member but Motor_102 is fine. Both use ns=1;s=[{PLC}]{InstanceName}.Sts_Running. What is the most probable cause?",
      options: ["The definition lost its alarm", "The Motor_101 instance's PLC parameter or its PLC tag name does not match", "History is not enabled", "The tag group rate is too slow"],
      answer: 1,
      explain: [
        "Alarms don't affect OPC item resolution.",
        "Correct. The path is built from the instance name and parameters. A typo in either leaves the OPC server unable to find the item.",
        "History has nothing to do with whether the item can be read.",
        "A slow rate gives slow updates, not NotFound."
      ]
    },
    {
      q: "What can an instance NOT do?",
      options: ["Override a member's alarm setpoint", "Set its own parameter values", "Add a new member that the definition lacks", "Be a nested member of another UDT"],
      answer: 2,
      explain: [
        "Overriding property values is allowed.",
        "Parameter values are set per instance, which is their purpose.",
        "Correct. Structure comes from the definition, which guarantees that every instance has the same members.",
        "Nesting UDT instances is supported."
      ]
    },
    {
      q: "Why does a UDT-first design make Perspective faceplates easy?",
      options: ["Perspective reads UDT definitions directly", "Every instance has identical member names, so one view bound to relative paths from a single parameter serves them all", "UDTs make tags faster", "Perspective requires UDTs"],
      answer: 1,
      explain: [
        "Views bind to tag paths and don't need to read definitions.",
        "Correct. One path parameter plus guaranteed member names means one view for every instance.",
        "UDTs organize tags. They don't change polling speed.",
        "Perspective works with any tags. UDTs just make the work cheaper."
      ]
    },
    {
      q: "The controls engineer renames Logix member Sts_Fault to Sts_Faulted and downloads. Nothing was changed in Ignition. What do you see?",
      options: ["Fault alarms continue to work", "Sts_Fault members go Bad_NotFound on every instance", "Ignition renames the members automatically", "Only new instances fail"],
      answer: 1,
      explain: [
        "The item path points at a name that no longer exists in the PLC.",
        "Correct. The definition still requests the old name, so each instance shows a bad-quality tag and the alarm cannot evaluate.",
        "Ignition does not follow PLC edits. Names are matched by text.",
        "All instances use the same definition, so all fail."
      ]
    }
  ],

  resources: [
    { title: "User Defined Types - UDTs (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/user-defined-types-udts", type: "docs", source: "Inductive Automation" },
    { title: "UDT Nesting (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/user-defined-types-udts/udt-nesting", type: "docs", source: "Inductive Automation" },
    { title: "UDT Parameters (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/tags/user-defined-types-udts/udt-parameters", type: "docs", source: "Inductive Automation" },
    { title: "Tags (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags", type: "docs", source: "Inductive Automation" },
    { title: "Configure Alarm in UDT (video)", url: "https://inductiveuniversity.com/video/configure-alarm-in-udt/7.7", type: "video", source: "Inductive University" }
  ]
});
