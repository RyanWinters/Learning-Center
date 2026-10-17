LC.lesson({
  id: "persp-views",
  title: "Views, components and properties",
  track: "persp",
  minutes: 25,
  level: 2,
  prereqs: ["ign-projects", "ign-tags"],
  tags: ["perspective", "views", "components", "params", "custom props", "session"],
  summary: "A Perspective screen is a JSON document. Learn its anatomy, the four property scopes, and the rule for deciding where each piece of state lives.",
  objectives: [
    "Describe a view as a JSON resource and read its component tree",
    "Tell props, custom, meta and position apart and say what each is for",
    "Declare input, output and in/out view parameters and know who may bind them",
    "Choose between component custom props, view custom props, session props and page URL params for a piece of state",
    "Read and write properties from a script without fighting the property tree types"
  ],

  body: `
## A view is a document

Every {{term:persp-view|Perspective view}} is stored in your project as a JSON resource, \`view.json\`, in a folder under \`com.inductiveautomation.perspective/views\`. The Designer is an editor for that file. Once you can read the JSON, the whole module gets easier to reason about: bindings, params, styles and layout are all just keys in a tree.

Here is a trimmed view with one label inside a flex container:

\`\`\`json
{
  "custom": { "alarmCount": 0 },
  "params": { "motorPath": "" },
  "propConfig": {
    "params.motorPath": { "paramDirection": "input", "persistent": true },
    "custom.alarmCount": {
      "binding": { "type": "expr", "config": { "expression": "len({this.custom.alarms})" } }
    }
  },
  "props": { "defaultSize": { "width": 360, "height": 120 } },
  "root": {
    "type": "ia.container.flex",
    "meta": { "name": "root" },
    "props": { "direction": "column" },
    "children": [
      {
        "type": "ia.display.label",
        "meta": { "name": "Title" },
        "position": { "basis": "32px" },
        "props": { "text": "Pump 1" }
      }
    ]
  }
}
\`\`\`

Four things to notice. The view has its own \`custom\`, \`params\` and \`props\`. Bindings do not live next to the value. They live in \`propConfig\`, keyed by the property path they feed. There is exactly one \`root\` component, and everything else hangs off \`children\`. And each component has a \`type\` string (\`ia.container.flex\`, \`ia.display.label\`) that selects its behavior.

> [!tip] Read the JSON
> In the Designer, the view context menu and the Project Browser let you open or copy the raw JSON. Diffing two versions of \`view.json\` in a text editor is often faster than clicking through the property panel, and it is how you review changes in version control. See {{lesson:ign-versioning}}.

{{diagram:anatomy}}

## The component tree

A {{term:persp-component|component}} is a node. Containers have \`children\`. Leaf components (labels, buttons, charts) do not. The tree gives you three things for free:

- **Naming.** \`meta.name\` is the component's identity within its parent. Scripts and bindings use names to find siblings, so renaming a component can break a script that said \`self.getSibling("Title")\`.
- **Scoping.** A binding on a child can reference \`{this.*}\` (itself), \`{view.*}\` (the view-level custom and params), \`{session.*}\`, or a path through the tree (\`{../Title.props.text}\` for a sibling).
- **Layout.** A child's \`position\` object is interpreted by its parent container. The same label has \`x\`, \`y\`, \`width\` and \`height\` inside a coordinate container and \`basis\`, \`grow\` and \`shrink\` inside a flex container. See {{lesson:persp-containers}}.

## The property scopes on a component

The property tree of one component has several top-level branches. Mixing them up is the most common beginner error.

| Branch | Holds | Who defines it | Example |
|---|---|---|---|
| \`props\` | The component's real settings, the ones the renderer reads | The component type | \`props.text\`, \`props.style.backgroundColor\` |
| \`custom\` | Your own values attached to this component | You | \`custom.hover\`, \`custom.rowsSelected\` |
| \`meta\` | Identity and runtime behavior | Fixed set | \`meta.name\`, \`meta.visible\`, \`meta.tooltip\` |
| \`position\` | Where the parent places it | The parent container type | \`position.x\`, \`position.basis\` |

You cannot add keys to \`props\`, \`meta\` or \`position\`. You can add anything to \`custom\`. That is the point of the scope: it is the only place a component can carry state of its own.

Each branch can also be reached from a script as \`self.props\`, \`self.custom\`, \`self.meta\` and \`self.position\`. A script on a button can say \`self.parent.getChild("Title").props.text\` to reach into its neighbor.

### Property types and the tree

Property values are JSON-shaped: string, number, boolean, null, object and array. A {{term:property-tree|property tree}} node can be an object containing other nodes, which is what makes \`props.style.classes\` and \`custom.rows[0].name\` addressable. In scripts, objects and arrays arrive as wrapped collections, not plain Python dicts and lists. The reliable way to edit one is to copy, change, and assign the whole property back:

\`\`\`python
rows = list(self.custom.rows)          # copy out
rows.append({"name": "P-101", "run": True})
self.custom.rows = rows                # assign the whole value
\`\`\`

Datasets are a separate type, produced by queries and the Table component. Convert them with \`system.dataset.toPyDataSet\` or \`system.perspective\`-friendly list-of-dict forms before heavy processing.

## View parameters: the interface of a view

A view is reusable only if it has a clear boundary. {{term:view-params|View parameters}} are that boundary. Each param has a **direction**, stored as \`paramDirection\` in \`propConfig\`:

| Direction | Who sets it | Can the view bind it internally? | Typical use |
|---|---|---|---|
| input | The parent (embedder, page URL, popup opener) | No. It is read-only inside | \`motorPath\`, \`title\` |
| output | The view itself | Yes. The parent can read it | \`selectedRow\`, \`isValid\` |
| in/out | Both sides | Yes, from both | A shared setpoint or filter |

Two behaviors cause real trouble. First, the **default direction is input**, so a param you meant to write to will silently refuse bindings until you change it. Second, input params are assigned when the view is created. Treat them as the view's constructor arguments, and design for the parent changing them by supplying a bound value rather than by mutating an old one. Popups and docked views are not children of a view in the tree, so the opener cannot read their output params. Use a message handler or a session prop to send data back (see {{lesson:persp-events}}).

The \`persistent\` flag in the JSON above makes a param's value survive view reloads in the Designer preview. It does not make a value persistent across user sessions.

## Where should this state live?

State in Perspective has four common homes. Pick by who needs to see it and how long it should live.

| Home | Lifetime and reach | Use for |
|---|---|---|
| Component \`custom\` | Lives and dies with one component | A hover flag, a locally computed total, a table's selection |
| View \`custom\` | Whole view; every child binds to \`{view.custom.x}\` | Shared intermediate values, lists, loading flags |
| {{term:session-props|Session custom props}} | One browser session across every page and view | Logged-in context, selected area, plant filter, theme choice |
| {{term:page-url-params|Page URL params}} | The URL itself; bookmarkable and shareable | Which asset a deep-linked page should show |

Gateway tags are the fifth home, for state that must be shared between sessions or survive a restart. If two operators must see the same value, a session prop is wrong.

> [!example] Choosing a home
> A plant overview has an "Area" dropdown. The selected area must filter the alarm table on this page, the trend on the next page and the header. That is session state, so it belongs in \`session.custom.area\`. The dropdown's open/closed animation flag is component custom. The alarm list pulled from a query is view custom, bound once and referenced by three children. And a link emailed to a supervisor, \`/asset?path=Plant1/Pump1\`, carries the pump in a page URL param, which Perspective passes to the primary view as an input param of the same name.

When a value is derived (a sum, a color decision, a formatted label), do not store it in a script-written custom prop. Make it a binding and let the platform keep it current. Stored derived state goes stale; bound derived state cannot.

## Putting it together: a minimal motor tile

A reusable tile takes one input param, \`motorPath\`, and builds everything else from it:

\`\`\`json
"params": { "motorPath": "[default]Plant1/Pump1" },
"propConfig": {
  "params.motorPath": { "paramDirection": "input", "persistent": true }
}
\`\`\`

Child bindings then reference \`{view.params.motorPath}\` to build indirect tag paths, which is the subject of {{lesson:persp-bindings}} and {{lesson:persp-embedding}}.
`,

  eli5: `
Think of a view as a recipe card for one screen. The card says "put a title at the top, a big number in the middle, and a button at the bottom," and it says it in a tidy list, not as a drawing. The computer reads the list and paints the screen from it.

Each item on the list can have a few kinds of notes. Some notes are the real instructions ("the title says Pump 1"). Some are your own reminders you write in the margin ("I've been clicked twice"). Some say what to call the item, and some say where it goes.

Now say you want to reuse the card for ten pumps. You leave a blank at the top: "Which pump?" Whoever uses the card fills in the blank. That blank is a parameter. Some blanks are for the person using the card to fill in, and some are places the card writes an answer back.

Last, you need to decide where to keep notes like "which room is the visitor in?" Put it on a sticky note on one item, on the card, in the visitor's own backpack, or in the web address. The right place depends on who needs to see it and for how long.
`,

  why: `
**Why JSON, not binary?** Vision stored screens as a serialized Java object graph that only the Designer could read sensibly. Perspective views are plain text. That means diffs, merges, search-and-replace across a project, and scripted generation of views. The cost is that you can break a view by hand-editing it, so treat raw JSON edits as power-user surgery with a backup.

**Why four property scopes?** Separating \`props\` from \`custom\` keeps the component contract clean. The renderer only reads \`props\`, so your invented keys can never collide with a future component feature. \`meta\` and \`position\` are separate because the parent container, not the component, defines position semantics. Experienced integrators lean on this: if you need a value, add it to \`custom\` and bind to it, instead of abusing \`props.text\` as a data store.

**Why param directions at all?** Because bindings are one-way pipes, and two writers on one property create fights. An input param guarantees the parent is the only writer, so the view behaves like a pure function of its params. Integrators argue over in/out params: they are convenient, and they also create hidden coupling between parent and child. Many teams ban them and use output params plus message handlers, so data flow stays readable.

**Why not put everything in session props?** It is tempting, because session props are reachable from anywhere. The cost is the same as global variables in any language: any view can change them, nothing documents who depends on them, and a rename breaks pages you forgot existed. Keep the session for genuinely session-wide facts, and keep everything else as close to its consumer as you can.
`,

  history: `
Perspective arrived with Ignition 8.0 as the module meant to replace Vision's Java client with HTML5 views rendered in a browser. Its views were JSON from the start, which let Inductive Automation add the Designer's property tree, style classes and parameterized embedding on a lightweight model. The param direction setting and the Sync Params helpers on embedded views were added over later 8.x releases as projects grew large enough to need cleaner interfaces.
`,

  examples: [
    {
      title: "Reading and writing from a button script",
      body: `On a button's \`onActionPerformed\` event: \`self.getSibling("Title").props.text = "Pump " + str(self.view.params.pumpNumber)\`. Reading a view param (\`self.view.params\`), writing a sibling's \`props\`, and addressing the sibling by \`meta.name\` all work as described above. If you rename the sibling in the Designer, the script breaks, which is why stable names matter.`
    },
    {
      title: "Output param for a validated form",
      body: `A setpoint-entry view has a text field and a computed \`isValid\` flag. Declare \`isValid\` as an **output** param and bind it to \`{this.custom.valid}\`. The embedding parent binds an OK button's \`enabled\` to the embedded view's output through the embedded view component's \`params.isValid\`. The child owns the logic, and the parent only reads the result.`
    }
  ],

  diagrams: {
    anatomy: `<svg viewBox="0 0 640 260" role="img" aria-label="A view JSON document has view-level params, custom and propConfig, and a root component that contains child components, each with props, custom, meta and position">
  <rect class="dg-box" x="20" y="20" width="600" height="230" rx="8"/>
  <text class="dg-title" x="36" y="44">view.json</text>
  <rect class="dg-box" x="36" y="58" width="170" height="82" rx="6"/>
  <text class="dg-text" x="48" y="80">params</text>
  <text class="dg-text-mono" x="48" y="100">motorPath (input)</text>
  <text class="dg-text-mono" x="48" y="120">isValid (output)</text>
  <rect class="dg-box" x="36" y="152" width="170" height="82" rx="6"/>
  <text class="dg-text" x="48" y="174">custom</text>
  <text class="dg-text-mono" x="48" y="194">alarms, loading</text>
  <text class="dg-text-muted" x="48" y="218">propConfig holds bindings</text>
  <rect class="dg-box-accent" x="226" y="58" width="378" height="176" rx="6"/>
  <text class="dg-title" x="240" y="80">root component (container)</text>
  <rect class="dg-box" x="240" y="94" width="168" height="128" rx="6"/>
  <text class="dg-text" x="250" y="114">child: Title label</text>
  <text class="dg-text-mono" x="250" y="136">props.text</text>
  <text class="dg-text-mono" x="250" y="154">custom.*</text>
  <text class="dg-text-mono" x="250" y="172">meta.name</text>
  <text class="dg-text-mono" x="250" y="190">position.basis</text>
  <rect class="dg-box" x="420" y="94" width="168" height="128" rx="6"/>
  <text class="dg-text" x="430" y="114">child: Value label</text>
  <text class="dg-text-mono" x="430" y="136">props.text</text>
  <text class="dg-text-mono" x="430" y="154">custom.*</text>
  <text class="dg-text-mono" x="430" y="172">meta.name</text>
  <text class="dg-text-mono" x="430" y="190">position.grow</text>
</svg>`
  },

  pitfalls: [
    "Leaving a param on its default direction (input) and wondering why you cannot bind it inside the view.",
    "Storing derived values in custom props with scripts instead of bindings, so they go stale.",
    "Using session props as a global scratchpad for data that only one view needs.",
    "Renaming a component and breaking scripts or bindings that referenced it by meta.name.",
    "Mutating a nested object property in place from a script instead of assigning a whole new value.",
    "Expecting a popup to expose output params to the view that opened it."
  ],

  keyTerms: ["perspective", "persp-view", "persp-component", "property-tree", "view-params", "custom-props", "session-props", "page-url-params"],

  quiz: [
    {
      q: "You add a param called selectedRow to a table view and bind it to the table's selection inside the view. The binding is refused. What is the most likely cause?",
      options: [
        "The param is still the default direction, input",
        "Params cannot be bound at all",
        "Table selection is not a property",
        "The param must be stored in session props first"
      ],
      answer: 0,
      explain: [
        "Correct. Input params are read-only inside the view. Switch it to output (or in/out) so the view can write it.",
        "Params can be bound. Output and in/out params are written by bindings inside the view.",
        "The table's selection is exposed as a property and can be a binding source.",
        "Session props are an alternative home for state, not a prerequisite for binding params."
      ]
    },
    {
      q: "Where should the 'selected plant area' value live if it filters three different pages for one operator?",
      options: [
        "Component custom props on the dropdown",
        "A gateway memory tag shared by all operators",
        "Session custom props",
        "An input param on every page's primary view, set by hand"
      ],
      answer: 2,
      explain: [
        "Component custom props die with that component and are invisible to other pages.",
        "A shared tag would make every operator's selection change everyone else's screen.",
        "Correct. Session props are unique per session and reachable from every view and page.",
        "Hand-set params duplicate state and drift. Bind params from the session prop instead."
      ]
    },
    {
      q: "A script does self.custom.rows.append({'name': 'P1'}) and the screen never updates. What is the dependable fix?",
      options: [
        "Add a polling rate to the component",
        "Copy the value to a list, change it, and assign the whole list back to self.custom.rows",
        "Move rows into props",
        "Call system.perspective.refresh()"
      ],
      answer: 1,
      explain: [
        "Polling is a binding option and does nothing for a missing property change.",
        "Correct. Assigning a whole new value is a property write the platform can detect and propagate.",
        "props belongs to the component type. You cannot invent keys there.",
        "There is no refresh call that substitutes for writing the property."
      ]
    },
    {
      q: "What does paramDirection control in a view's propConfig?",
      options: [
        "Whether the view is shown on mobile",
        "The order bindings are evaluated in",
        "Which side, parent or view, may write the param and whether the parent can read it",
        "Whether the param is persistent across sessions"
      ],
      answer: 2,
      explain: [
        "Mobile behavior is layout, not param direction.",
        "Direction affects who may write, not evaluation order.",
        "Correct. Input is parent-written, output is view-written and parent-readable, in/out is both.",
        "The separate persistent flag affects preview behavior, not user sessions."
      ]
    },
    {
      q: "A teammate stores a 'total running motors' count in view custom, updated by a script on each motor tile. What is the better design?",
      options: [
        "Keep it. Scripts are more flexible than bindings",
        "Move it to session props so other views can reach it",
        "Bind it with an expression over the data it is derived from",
        "Store it in a component's meta"
      ],
      answer: 2,
      explain: [
        "Script-maintained derived state goes stale when any path to update is missed.",
        "Session scope does not fix staleness and widens the reach unnecessarily.",
        "Correct. A bound derived value is recomputed whenever its inputs change.",
        "meta holds fixed identity and behavior fields. You cannot store arbitrary values there."
      ]
    }
  ],

  resources: [
    { title: "Views in Perspective (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/views-in-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Session Properties (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/perspective-sessions/session-properties", type: "docs", source: "Inductive Automation" },
    { title: "Perspective Component Properties (manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/working-with-perspective-components/perspective-component-properties", type: "docs", source: "Inductive Automation" },
    { title: "A Vision-Oriented Guide to Perspective", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/a-vision-oriented-guide-to-perspective", type: "docs", source: "Inductive Automation" },
    { title: "How do I use the Input, Output, Input/Output options on view params?", url: "https://forum.inductiveautomation.com/t/how-do-i-use-the-input-output-input-output-options-on-perspectives-view-params/24489", type: "forum", source: "Inductive Automation Forum" }
  ]
});
