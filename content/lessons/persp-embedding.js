LC.lesson({
  id: "persp-embedding",
  title: "Embedded views, parameters and flex repeaters",
  track: "persp",
  minutes: 15,
  level: 3,
  prereqs: ["persp-bindings", "ign-udts"],
  tags: ["perspective", "embedded view", "flex repeater", "view canvas", "udt", "templates", "params"],
  summary: "Build a view once, use it a hundred times: embedded views, parameters, flex repeaters, and the UDT-path pattern behind every professional Perspective faceplate library.",
  objectives: [
    "Embed a view and pass it parameters, and say how data flows back out",
    "Drive a flex repeater from a list or query so one tile becomes N tiles",
    "Pass a single UDT instance path as one param and build indirect bindings from it",
    "Use a view canvas for dynamic, multi-view surfaces and know when it beats an embedded view",
    "Build a complete motor tile from a UDT and anticipate its performance limits"
  ],

  body: `
## Reuse is the whole point

Perspective's reuse mechanism is the {{term:embedded-view|embedded view}}: a component whose job is to render another view at a path you give it. With it, the "motor tile" is built once, and every screen that needs a motor drops in the embedded view and says which motor. Fix the tile and every screen is fixed. This lesson combines {{lesson:persp-views}} (params), {{lesson:persp-bindings}} (indirect tag bindings) and {{lesson:ign-udts}} (one tag path stands for many members) into the pattern that scales.

{{diagram:flow}}

## The embedded view component

An embedded view (\`ia.display.view\`) has two properties that matter:

\`\`\`json
{
  "type": "ia.display.view",
  "meta": { "name": "MotorTile" },
  "position": { "basis": "300px", "grow": 1 },
  "props": {
    "path": "Tiles/MotorTile",
    "params": { "tagPath": "[default]Plant1/Area10/Line1/M101" }
  }
}
\`\`\`

- **path**: the view to render, relative to the project's views root. This is itself bindable, which is how you swap views at runtime.
- **params**: an object whose keys match the target view's param names. A Sync Params helper in the Designer fills in all the target's params and removes stale ones.

Param values are bindable like any property. Bind \`props.params.tagPath\` to an expression, a custom prop or a list item, and the embedded view receives the new value whenever it changes. The embedded view is a separate unit: a property binding in the parent cannot reach into a label inside it, and the child cannot reach out. The only data path in is \`params\`, and the only path out is an output or in/out param. Use direction deliberately.

> [!warning] Embedded views are real views
> Each embedded instance is a full view instance with its own bindings and subscriptions. Twenty tiles with twelve bindings each is 240 live bindings. That is fine, and 500 tiles is not. See {{lesson:persp-performance}} for the budget.

## Flex repeaters

A {{term:flex-repeater|flex repeater}} makes N embedded views from a list. Its core properties:

\`\`\`json
{
  "type": "ia.display.flex-repeater",
  "meta": { "name": "MotorGrid" },
  "props": {
    "path": "Tiles/MotorTile",
    "direction": "row",
    "wrap": "wrap",
    "elementPosition": { "basis": "300px", "grow": 1, "shrink": 0 },
    "instances": [
      { "tagPath": "[default]Plant1/Area10/Line1/M101" },
      { "tagPath": "[default]Plant1/Area10/Line1/M102" },
      { "tagPath": "[default]Plant1/Area10/Line1/M103" }
    ]
  }
}
\`\`\`

One \`path\`, many \`instances\`; each instance is an object of param values for one copy. The repeater lays out its copies the way a flex container does (direction, wrap, per-element basis/grow/shrink), so the tile grid from {{lesson:persp-containers}} falls out naturally. Only embedded views belong inside it.

### Driving instances from data

You rarely type instances by hand. Bind \`props.instances\` to something that produces a list of objects whose keys equal the param names:

1. **A query binding** returning rows with a column named \`tagPath\`. Make the column names match the view's params exactly, or add a transform to rename them.
2. **A tag browse** done in a script transform or message handler with \`system.tag.browse\`, mapped to \`[{"tagPath": path}, ...]\`.
3. **A view custom prop** holding a list that you edit.

A script transform that turns a browse result into instances:

\`\`\`python
def transform(self, value, quality, timestamp):
    # value is a list of tag path strings from a prior step or custom prop
    return [{"tagPath": p} for p in value]
\`\`\`

When the list changes, the repeater adds or removes instances. Keep the instance objects stable (same keys, same order) where you can. The advanced section below explains why this matters and what to measure.

## The view canvas

A {{term:view-canvas|view canvas}} shows several views on a coordinate surface, each with its own \`viewPath\`, \`viewParams\` and position, and the list can change at runtime. Where a flex repeater says "N copies of one view in a flow," a canvas says "these different views, at these places." That fits dashboards where users add or move panels, and floating windows inside a page. For everything else, embedded view or repeater is simpler.

## The UDT path pattern

Here is the move that makes templates scale. Do not pass a tile ten params (\`running\`, \`speed\`, \`fault\`...). Pass **one**: the folder path of the UDT instance, as a {{term:tag-path-param|tag path param}}. The view builds all of its bindings from it.

\`\`\`text
Param:   tagPath = [default]Plant1/Area10/Line1/M101
Bindings (indirect, {1} = {view.params.tagPath}):
   {1}/Sts/Running     -> run state
   {1}/Sts/Speed       -> speed
   {1}/Sts/Fault       -> fault
   {1}/Cfg/Description -> title
\`\`\`

Why one param? Because the UDT *guarantees* the members exist with those names ({{lesson:ign-udts}}). Adding a member to the UDT makes it available to every instance. And a caller only needs to know the instance path. The cost is that the tile depends on the UDT's shape, so document the type it expects in the view's description.

## Worked example: a motor tile from a UDT

Assume the house \`Motor\` UDT definition: folders \`Cmd\`, \`Sts\`, \`Cfg\` and \`Alm\`, with \`Sts/Running\`, \`Sts/Speed\`, \`Sts/Fault\` and \`Cfg/Description\`, and instances under \`[default]Plant1/Area10/Line1\`.

**1. Create the tile view** \`Tiles/MotorTile\`, flex column root. Declare one input param. (The JSON in this lesson shows the shape for orientation. Export a view from your own Gateway to see the exact keys for your version.)

\`\`\`json
"params": { "tagPath": "" },
"propConfig": { "params.tagPath": { "paramDirection": "input", "persistent": true } }
\`\`\`

**2. Add children** with indirect tag bindings. For the name label:

\`\`\`json
"propConfig": {
  "props.text": {
    "binding": {
      "type": "tag",
      "config": {
        "mode": "indirect",
        "tagPath": "{1}/Cfg/Description",
        "references": { "1": "{view.params.tagPath}" }
      }
    }
  }
}
\`\`\`

For the status badge, bind two view custom props straight to the tags, each with an indirect tag binding (\`custom.run\` to \`{1}/Sts/Running\`, \`custom.fault\` to \`{1}/Sts/Fault\`, with \`{1}\` = \`{view.params.tagPath}\`). Then add a third custom prop, \`custom.stateCode\`, with an expression binding:

\`\`\`text
if({view.custom.fault}, 2, if({view.custom.run}, 1, 0))
\`\`\`

Then map 0, 1, 2 on the badge's style binding to the style classes stopped, running and fault. Two tags feed one visible state with no script.

**3. Add an output param**, \`selected\`, bound inside the tile to a custom prop that a click handler sets. The parent grid reads it and can open a detail popup (see {{lesson:persp-events}}).

**4. Use it in a repeater** on a plant overview. Bind \`instances\` to a query:

\`\`\`sql
SELECT '[default]Plant1/Area10/Line1/' + name AS tagPath
FROM equipment WHERE area = :area AND type = 'Motor' ORDER BY name
\`\`\`

(Adjust the concatenation syntax to your database. Some use \`||\` or \`CONCAT\`.) Twelve motors in the area become twelve tiles. Add a thirteenth row to the table and a thirteenth tile appears, with no change to any view. That is the payoff: the plant's data model drives the screen.

> [!tip] Test with the dumbest case first
> Embed the tile once with a hand-typed path. Confirm the name appears. Only then wire the repeater. When 12 tiles all show "Bad_NotFound", you want to know it is the path and not the repeater.

## Limits to know

- **One binding is cheap, thousands are not.** A tile with 15 bindings times 300 instances is 4,500 live subscriptions per session. Use tag groupings (one structure binding) and shrink the tile.
- **Input params are the contract.** Changing a param name breaks every embedding. Treat param names as an API.
- **Output flows up one level.** A grandparent cannot read the grandchild directly. Pass through each layer, or use a session prop or message handler for cross-cutting values.
## If you already build Perspective

The pattern above is the easy half. These are the parts that decide whether 40 tiles feel instant or sluggish.

### What rebinding an instance costs

When a repeater's \`instances\` value changes, Perspective has to decide what to do with each embedded instance. Do not assume it matches instances by identity. Assume an instance whose params changed re-resolves its bindings, and one whose position in the list changed may be treated as a different instance. The practical rules, to confirm on your version by watching tag subscriptions in the Gateway status pages:

- Keep the list stable. Sort in the query (\`ORDER BY name\`), not in a transform that can reorder between polls.
- Do not rebuild the list from a polled query unless the content changed. Bind \`instances\` to a view custom prop and write it only when the new list differs (compare in a change script).
- Never put a volatile field (a live value, a timestamp) in an instance object. It makes every instance look new on every update. Pass identity only and let the child bind its own values.

### In and out param timing

Params are not a function call. The parent writes an input param, the child's bindings re-resolve, and values arrive later. An output param is written by the child after its own bindings settle, so the parent sees an empty or default value first. Do not enable a parent action off an output param without handling the initial default. Prefer a message to the parent or a session prop for events ("tile selected"), and keep output params for state ("isValid").

### onStartup scripts multiply

A view \`onStartup\` script, or a component script that runs at load, runs once per instance. Forty tiles means forty runs at page load, on the Gateway. Move one-time work to the parent, and pass results as a param, or compute once in a UDT expression tag. See {{lesson:persp-bindings}}.

### Large lists need paging

Past a few dozen tiles, the cost is not the repeater itself but the sum of the tile bindings times the session count. Page the list (a \`custom.page\` and a slice in the query), or switch from tiles to a table with one row per asset and open a faceplate on click. A table binds once and renders rows. Choose tiles when each asset needs live graphics, and tables when the operator is scanning for exceptions.

### View canvas versus repeater

Use a repeater for N copies of one view driven by data. Use a view canvas when the set of different views is the state, such as user-arranged panels. The canvas gives up flex layout for explicit positions, so size and position become your problem.

### Contract tests for a tile

Before releasing a tile to a library, run it with: an empty \`tagPath\`, a path that does not exist, a path to a different UDT type, and a very long description. A good tile shows "---" or an explicit "no tag" state in all four, and never throws errors in the Gateway log. A tile that fails this will fail in production on the first typo in a query.

`,

  eli5: `
Imagine you have a rubber stamp shaped like a little card with blanks on it: "Name: ____, Status: ____, Speed: ____". Instead of drawing a new card for every machine in the factory, you stamp the card once for each machine and fill in a single blank at the top, "which machine?" The card knows how to look up everything else about that machine by itself.

An embedded view is one stamp. A flex repeater is a stamp that runs along a list: you give it a list of machine names and it stamps one card per name, laid out in neat rows. If you add a name to the list, a new card appears. If you remove one, the card goes away.

The trick that makes it work is handing the card only one clue, the machine's address, instead of ten separate facts. Every machine of the same type has the same rooms in its house, so from the address the card can find the kitchen, the garage, the bedroom. One address, many answers.
`,

  why: `
**Why one path param instead of many?** A tile that takes \`running\`, \`speed\` and \`fault\` as params pushes all the plumbing to the caller. Every screen that uses the tile has to bind three things per motor, and adding a fourth value means editing every caller. Passing the instance path moves the knowledge into the tile and the UDT, where it belongs. The tradeoff is coupling: the tile now assumes a UDT shape. The counter-argument, which some architects hold, is that tiles taking plain values are easier to test and reuse across non-UDT sources. Both camps use the path pattern for anything that mirrors a UDT.

**Why templates beat copy-paste.** Copied views drift. After a year, "M101 screen" and "M102 screen" differ in five small ways nobody remembers. A template has a single definition, so a fix or a style change lands everywhere. For a plant with hundreds of assets this is the difference between a 10-view project and a 1,000-view project.

**Why watch the instance count.** Each embedded instance is a view with bindings, subscriptions and a rendering cost. The architecture scales by reuse, not by being free. Seasoned integrators set a budget (bindings per tile times tiles per page) and test with the real Gateway under real session load, then lazy-load content on tabs and use paging in repeaters for big lists.

**Why input-only params for tile config.** Output and in/out params make a tile talk back, which is great for selection and validation, but each one is a coupling the parent must handle. Use outputs sparingly and name them as events ("selected"), not as mirrored state.
`,

  history: `
Embedded views are Perspective's answer to Vision's templates: one definition, many instances, each configured by parameters. The flex repeater adds the template-plus-list pattern, and the view canvas handles dynamic multi-view surfaces. Designer helpers such as Sync Params and a parameter dropdown for repeater instances reduce the typing needed to wire them up.
`,

  examples: [
    {
      title: "Pump station overview from a tag browse",
      body: `A message handler runs \`system.tag.browse("[default]Plant1/Area10/Line1", {"tagType": "UdtInstance"})\` and stores the paths in \`session.custom.motorPaths\`. A flex repeater's \`instances\` is bound to that list through a transform returning \`[{"tagPath": p} for p in value]\`. A new motor added to the line's UDT folder appears the next time the handler runs.`
    },
    {
      title: "Renaming a param breaks every embedder",
      body: `The tile's \`tagPath\` is renamed \`assetPath\`. Every embedding and every repeater instance still passes \`tagPath\`, so every tile goes blank at once. The safe sequence: add the new param next to the old one, make the tile use the new one when set and fall back to the old, migrate embedders with Sync Params, then remove the old param. Treat param names as a published API.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 230" role="img" aria-label="A query supplies a list of tag paths to a flex repeater, which creates one embedded motor tile per path; each tile builds indirect tag bindings from its path param">
  <defs>
    <marker id="persp-embedding-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker>
  </defs>
  <rect class="dg-box" x="16" y="30" width="120" height="56" rx="6"/>
  <text class="dg-text dg-mid" x="76" y="54">Query / list</text>
  <text class="dg-text-sm dg-mid" x="76" y="74">tagPath rows</text>
  <rect class="dg-box-accent" x="190" y="30" width="150" height="56" rx="6"/>
  <text class="dg-text dg-mid" x="265" y="54">Flex repeater</text>
  <text class="dg-text-sm dg-mid" x="265" y="74">props.instances</text>
  <line class="dg-line" x1="136" y1="58" x2="188" y2="58" marker-end="url(#persp-embedding-ah)"/>
  <rect class="dg-box" x="400" y="14" width="224" height="52" rx="6"/>
  <text class="dg-text-sm" x="412" y="36">Tile 1: tagPath = .../M101</text>
  <text class="dg-text-mono" x="412" y="56">{1}/Sts/Speed {1}/Sts/Running</text>
  <rect class="dg-box" x="400" y="76" width="224" height="52" rx="6"/>
  <text class="dg-text-sm" x="412" y="98">Tile 2: tagPath = .../M102</text>
  <text class="dg-text-mono" x="412" y="118">{1}/Sts/Speed {1}/Sts/Running</text>
  <rect class="dg-box" x="400" y="138" width="224" height="52" rx="6"/>
  <text class="dg-text-sm" x="412" y="160">Tile N: tagPath = .../M10N</text>
  <text class="dg-text-mono" x="412" y="180">{1}/Sts/Speed {1}/Sts/Running</text>
  <line class="dg-line" x1="340" y1="50" x2="398" y2="40" marker-end="url(#persp-embedding-ah)"/>
  <line class="dg-line" x1="340" y1="60" x2="398" y2="102" marker-end="url(#persp-embedding-ah)"/>
  <line class="dg-line" x1="340" y1="70" x2="398" y2="164" marker-end="url(#persp-embedding-ah)"/>
  <text class="dg-text-muted" x="16" y="216">One template view, one path param, many live instances</text>
</svg>`
  },

  pitfalls: [
    "Passing a tile many value params when a single UDT path would do.",
    "Query column names that do not match the view's param names, leaving every instance blank.",
    "Renaming a param without updating every embedder and repeater instance list.",
    "Embedding hundreds of heavy tiles on one page and blaming the Gateway.",
    "Expecting a parent binding to read inside the embedded view instead of using an output param.",
    "Rebuilding the instances list with new keys or ordering on every poll, which can force instances to rebuild. Measure it."
  ],

  keyTerms: ["embedded-view", "flex-repeater", "view-canvas", "tag-path-param", "indirect-tag-binding", "view-params", "udt"],

  quiz: [
    {
      q: "A motor tile needs Run, Speed, Fault and Name for any motor UDT instance. What is the cleanest interface?",
      options: [
        "One input param holding the instance path, with indirect tag bindings inside the tile",
        "Four input params, one per value, bound by each caller",
        "A session prop that holds the current motor",
        "A bidirectional binding to the parent's label"
      ],
      answer: 0,
      explain: [
        "Correct. The UDT guarantees the members, so one path is enough and the tile owns the bindings.",
        "It pushes plumbing to every caller and breaks every embedder when a value is added.",
        "A session prop would make all tiles show the same motor.",
        "Bindings do not cross view boundaries, so there is no parent label to bind."
      ]
    },
    {
      q: "A flex repeater shows 12 tiles, all blank. The query returns columns named 'path' but the tile's param is 'tagPath'. What is the fix?",
      options: [
        "Increase the repeater's basis",
        "Rename the query column (or transform the rows) so the keys match the param name",
        "Make the param an output param",
        "Switch to a view canvas"
      ],
      answer: 1,
      explain: [
        "Basis only affects size.",
        "Correct. Instance keys must equal the target view's param names exactly.",
        "Direction does not affect whether keys match.",
        "The canvas has the same param-name requirement."
      ]
    },
    {
      q: "How does a motor tile report 'I was clicked' to the page that holds it?",
      options: [
        "A property binding in the parent targeting the tile's label",
        "A tag binding to the child's custom props",
        "It cannot; embedded views are isolated",
        "An output (or in/out) param on the tile that the parent reads through the embedded view's params"
      ],
      answer: 3,
      explain: [
        "Property bindings cannot cross the view boundary.",
        "Tag bindings read tags, not another view's properties.",
        "They are isolated by default, and params are the controlled exception.",
        "Correct. Output params are the declared way for a view to expose values."
      ]
    },
    {
      q: "When is a view canvas a better choice than a flex repeater?",
      options: [
        "When you need N copies of the same tile in a flowing grid",
        "When you want fewer bindings",
        "When you need different views at specific positions that can be added or moved at runtime",
        "When you need output params"
      ],
      answer: 2,
      explain: [
        "That is exactly the flex repeater's job.",
        "A canvas does not reduce bindings, and the hosted views keep theirs.",
        "Correct. The canvas places different views on a coordinate surface, with the list changeable at runtime.",
        "Both can expose outputs through params."
      ]
    },
    {
      q: "A page with 400 motor tiles of 15 bindings each is slow for 50 users. What is the most effective first step?",
      options: [
        "Add more RAM to the client PCs",
        "Switch the tiles to coordinate containers",
        "Cut the work: fewer tiles per page (paging or filtering), fewer bindings per tile, cheaper transforms",
        "Make all params in/out"
      ],
      answer: 2,
      explain: [
        "Bindings run on the Gateway, so client RAM is not the bottleneck.",
        "Container type does not change the number of live bindings.",
        "Correct. The work scales with instances times bindings times sessions, so reduce any factor.",
        "Direction does not reduce load, and in/out adds coupling."
      ]
    }
  ],

  resources: [
    { title: "Embedded Views (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/views-in-perspective/embedded-views", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - Embedded View component (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-embedding-palette/perspective-embedded-view", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - Flex Repeater (manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-embedding-palette/perspective-flex-repeater", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - View Canvas (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-embedding-palette/perspective-view-canvas", type: "docs", source: "Inductive Automation" },
    { title: "Using a Flex Repeater (video)", url: "https://inductiveuniversity.com/video/bip-using-a-flex-repeater", type: "video", source: "Inductive University" },
    { title: "Tag Bindings in Perspective (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/tag-bindings-in-perspective", type: "docs", source: "Inductive Automation" }
  ]
});
