LC.lesson({
  id: "persp-bindings",
  title: "Bindings and transforms",
  track: "persp",
  minutes: 30,
  level: 2,
  prereqs: ["persp-views", "ign-expressions"],
  tags: ["perspective", "bindings", "transforms", "tags", "expressions", "queries", "performance"],
  summary: "Bindings are how data gets onto the screen. Know every binding type, the order transforms run in, and what each one costs the Gateway.",
  objectives: [
    "Choose among property, expression, expression structure, tag, query and HTTP bindings for a given job",
    "Write direct and indirect tag bindings, including bidirectional ones, as JSON config",
    "Predict the output of a chain of map, format, expression and script transforms",
    "Explain polling and when a binding re-evaluates",
    "Recognize and remove the common performance costs of script transforms and heavy bindings"
  ],

  body: `
## What a binding is

A {{term:persp-binding|binding}} keeps one property equal to some source. When the source changes, the platform recomputes the property. Bindings are stored in the view JSON under \`propConfig\`, keyed by the property they target:

\`\`\`json
"propConfig": {
  "props.text": {
    "binding": {
      "type": "tag",
      "config": { "mode": "direct", "tagPath": "[default]Plant1/Pump1/Speed" },
      "transforms": [
        { "type": "format", "formatType": "numeric", "format": "0.0" }
      ]
    }
  }
}
\`\`\`

Every binding has a **type** (where the value comes from), optional **transforms** (what happens to it on the way) and a **target** property. The binding runs on the Gateway, and the browser receives only the resulting property value. That has consequences for security and for load, both covered below.

{{diagram:pipeline}}

## The binding types

| Type | Source | Updates when | Use for |
|---|---|---|---|
| Property | Another property in the same view | The source property changes | Linking siblings, params, custom props |
| Expression | An expression with \`{ }\` references | Any referenced value changes | Calculations, conditions, string building |
| {{term:expression-structure-binding|Expression structure}} | A set of named expressions | Any member changes | Building one object from several values |
| Tag | A tag path, direct or indirect | Tag value, quality or timestamp changes | Live process values |
| {{term:query-binding|Query}} | A named query | On a polling interval or when parameters change | Database rows, lists, history |
| Tag history | The historian | On a polling interval | Trend data |
| HTTP | A URL | On a polling interval or when parameters change | External REST data |

### Property bindings

A property binding links to another property in the same view: \`{this.props.value}\`, \`{view.params.motorPath}\`, \`{../Slider.props.value}\`. It cannot reach into another view instance, not even an embedded one. Data crosses a view boundary only through view params. In 8.3 a tag or property binding can be made bidirectional with the Bidirectional option (see below).

### Expression bindings

Expressions use the same language as Ignition tags and the rest of the platform; see {{lesson:ign-expressions}}. References to other properties are in curly braces:

\`\`\`text
if({view.custom.mode} = "auto",
   "AUTO: " + toStr({../Speed.props.value}),
   "MANUAL")
\`\`\`

Expression bindings are mostly event driven. They recompute when a referenced value changes. Functions that read the clock, such as \`now()\`, take a polling rate and recompute on that interval. A tag value can be read inside an expression with the \`tag()\` function, which also lets you build the path by string concatenation (\`tag("[default]" + {view.params.motor} + "/Speed")\`). That is a quick way to compose a dynamic path, but it hides the dependency from the Designer's tag tooling. Prefer a real indirect tag binding when the path comes from params.

### Expression structure bindings

This type builds one object from several expressions, one per key. It is the right tool when a component wants a JSON object (a chart series, a style object, a card's data) and each field is derived differently:

\`\`\`json
{
  "title": "Pump 1",
  "running": "{[default]Plant1/Pump1/Run}",
  "speed": "round({[default]Plant1/Pump1/Speed}, 1)"
}
\`\`\`

The output is \`{"title": "Pump 1", "running": true, "speed": 42.7}\`, so one binding replaces three plus a script.

### Tag bindings

A direct tag binding names a full path, including the provider: \`[default]Plant1/Pump1/Speed\`. The binding delivers the value, with its quality and timestamp available to transforms. An **indirect** tag binding has placeholders in the path, each linked to a source:

\`\`\`json
{
  "type": "tag",
  "config": {
    "mode": "indirect",
    "tagPath": "{1}/Speed",
    "references": { "1": "{view.params.motorPath}" },
    "bidirectional": false
  }
}
\`\`\`

If \`view.params.motorPath\` is \`[default]Plant1/Pump1\`, the binding resolves to \`[default]Plant1/Pump1/Speed\`. Change the param and the binding re-subscribes to the new tag automatically. One view definition, any number of {{term:indirect-tag-binding|indirect}} instances. This is the mechanism behind every reusable faceplate; the next lessons build on it ({{lesson:persp-embedding}}).

> [!note] Direct, indirect and expression paths
> Direct is the cheapest and clearest. Indirect is the right tool when the path varies by param or session. An expression-built path via \`tag()\` works too, but treat it as a last resort because it is invisible to refactoring tools and mixes path logic into formulas.

### Query and HTTP bindings

A {{term:query-binding|query binding}} runs a named query ({{lesson:ign-databases}}) and puts the result in the property. It has a polling mode (off, or a rate in seconds) and re-runs when its query parameters change. HTTP bindings do the same for a URL. Both are polled work done on the Gateway for *every session with that binding open*, so ten operators viewing one screen means ten queries per interval unless you use the Cache and Share option where your version offers it, which runs the query once and hands results to all consumers.

## Bidirectional bindings

By default a binding is one-way: source to property. Tag and property bindings can be made {{term:bidirectional-binding|bidirectional}}. Now an edit to the property (the user types in a text field or moves a slider) is written back to the source. Details matter:

- The tag's security must allow the writing user to write it. The binding does not bypass tag permissions.
- Writing on every keystroke can flood a device. Use the coalescing option so that rapid changes collapse into the last value.
- A bidirectional binding on a computed value (one that has transforms) needs transforms that can be reversed. If they cannot, write through a button and an event script, which gives you an audit point and a confirmation, as in {{lesson:persp-events}}.

For setpoints, many teams skip bidirectional entirely. Read the setpoint with a one-way binding, edit in a local custom prop, and write with an explicit "Apply" button.

## Transforms

A {{term:persp-transform|transform}} sits between the binding and its target. Four types exist, and they run **in the order listed**, each receiving the previous one's output. You can reorder them.

| Transform | What it does | Cost |
|---|---|---|
| Map | Look up the input in a table, optionally with ranges, and output a value | Very low |
| Format | Turn numbers, dates, strings into formatted strings | Very low |
| Expression | Apply an expression using \`{value}\` as input | Low |
| Script | Run Python with the value, quality and timestamp | Highest |

\`\`\`json
"transforms": [
  { "type": "map", "inputType": "scalar", "outputType": "style",
    "mappings": [
      { "input": 0, "output": { "classes": "state/stopped" } },
      { "input": 1, "output": { "classes": "state/running" } },
      { "input": 2, "output": { "classes": "state/fault" } }
    ],
    "fallbackDelay": 0 }
]
\`\`\`

This one maps a state code to a style class with no code. A common chain is **expression, then map, then format**: scale a raw count, bucket it into a state, then render text. Because order matters, swapping the first two changes the result; a map after a format sees a string, not a number.

### Script transforms

A {{term:script-transform|script transform}} receives the value, quality and timestamp, and a reference to the component:

\`\`\`python
def transform(self, value, quality, timestamp):
    if not quality.isGood():
        return "---"
    return "{:.1f} rpm".format(value * 60.0)
\`\`\`

Its return value replaces the value, and that includes its type. It is the escape hatch for anything map, format and expression cannot express, such as walking a nested object.

> [!warning] What script transforms cost
> Script transforms run in the Gateway for every session and every update, on a shared thread pool. A blocking call inside one (a database query, an HTTP request, a sleep) stalls the thread pool for everyone. Do not call \`system.db\` or other slow functions from a transform. If you need data, use a query binding and transform its result. If you find yourself writing scripts in transforms for string formatting, use a format or expression transform instead, which are dramatically cheaper.

## Binding to params

View params are valid binding targets and sources, subject to direction. An embedded view's \`params.motorPath\` can be bound from the parent. Inside the child, \`{view.params.motorPath}\` is the source for indirect tag bindings. Because the param is an input, the child sees every change the parent makes and rebinds. See {{lesson:persp-views}}.

## Performance habits

- Bind to the smallest thing you need. A binding to a whole UDT instance JSON re-evaluates on any member change.
- Move shared computation into one view-level custom prop and bind children to it, rather than repeating an expression in 40 components.
- Prefer map, format and expression transforms over script transforms.
- Keep query polling modest (5 to 30 seconds is common for lists) and put shared queries behind caching where possible.
- Do not bind to tag history and a chart's own history at the same time.
`,

  eli5: `
Imagine a whiteboard in the lunchroom that always shows today's soup. A binding is the arrangement where, whenever the cook changes the soup in the kitchen, somebody walks out and rewrites the board. You never touch the board, and it never goes out of date.

Different bindings are different kinds of messengers. One watches a single sign in the kitchen. One watches several signs and combines them ("soup of the day, with bread, $6"). One calls the supplier every ten minutes to ask the price.

A transform is a helper standing in the hallway between the kitchen and the board. They can swap the number 2 for the word "Tomato" (a lookup), tidy the price into dollars and cents (formatting), or do a little math. If you hire several helpers, they work in a line, so the order matters. A helper who writes by hand (a script) can do anything, but they are slower, and if one of them stops to make a phone call, the whole hallway jams.

Two-way bindings are when you can also write on the board and the kitchen changes its plan. Handy, but you want to be sure someone is allowed to do that.
`,

  why: `
**Why do bindings run on the Gateway?** Perspective sessions are thin. The browser renders; the Gateway holds the data connections, evaluates bindings and pushes property changes. That centralizes security (the client never sees tag paths it should not read, and tag permissions are enforced server side) and keeps clients simple. It also means a binding's cost is paid by the Gateway, multiplied by the number of sessions. This is why a design that is fine for one tester can fall over with 60 operators.

**Why transforms are ordered pipelines.** A chain of small, single-purpose steps is testable and readable. A single big script hides logic. Experienced integrators treat the script transform as a last resort and try map, format and expression first. A common rule of thumb: if the logic is a lookup, use map; if it is a calculation on one value, use expression; if it is output text, use format.

**Why indirect over expression paths.** Both can build a tag path from a param. Indirect bindings are a first-class feature: the Designer knows the reference, the subscription is managed cleanly and the path is visible in configuration. A concatenated path in an expression works but hides intent. Teams that standardize on indirect bindings find it much easier to audit what a view reads.

**The bidirectional debate.** Bidirectional bindings feel elegant, but they make writes implicit. In a regulated plant you often need a confirmation and an audit trail for setpoint changes, which an explicit button with an event script provides. In a utility or building-automation project where operators tweak many values, bidirectional with coalescing is fine. Know which you are building.
`,

  history: `
Perspective bindings follow the idea Vision made familiar, a property fed by a tag or expression, but evaluate on the Gateway to suit browser clients. Transforms cover many cases that Vision handled with scripted property-change events, and the script transform handles the remainder. In 8.3 the script transform receives the value, quality and timestamp.
`,

  examples: [
    {
      title: "Speed text from a UDT member, three steps",
      body: `A label's \`props.text\` has an indirect tag binding to \`{1}/Speed\` (with \`{1}\` = \`{view.params.motorPath}\`). Transforms in order: (1) Expression \`{value} / 100\` converts raw hundredths of hertz to hertz, (2) Format numeric \`0.00\`, (3) Expression \`{value} + " Hz"\`. A raw value 4512 becomes 45.12 then "45.12" then "45.12 Hz". Swap steps 1 and 2 and the format step would act on 4512 first and the division would then fail on a string.`
    },
    {
      title: "Replacing a script transform",
      body: `A script transform turned state codes 0, 1, 2 into "Stopped", "Running", "Fault" with if statements, at a cost of a Python call per update per session. Replacing it with a Map transform (input 0, 1, 2 to the three strings) gives the same output with no script execution. A second Map to style classes colors the label from the same source value.`
    }
  ],

  diagrams: {
    pipeline: `<svg viewBox="0 0 640 170" role="img" aria-label="A binding source flows through an ordered chain of transforms into a target property; a bidirectional binding also writes back to the source">
  <defs>
    <marker id="persp-bindings-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker>
  </defs>
  <rect class="dg-box" x="16" y="50" width="100" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="66" y="72">Source</text>
  <text class="dg-text-sm dg-mid" x="66" y="90">tag / query</text>
  <rect class="dg-box-accent" x="160" y="50" width="86" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="203" y="80">1 Expr</text>
  <rect class="dg-box-accent" x="278" y="50" width="86" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="321" y="80">2 Map</text>
  <rect class="dg-box-accent" x="396" y="50" width="86" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="439" y="80">3 Format</text>
  <rect class="dg-box" x="524" y="50" width="100" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="574" y="72">Target</text>
  <text class="dg-text-sm dg-mid" x="574" y="90">props.text</text>
  <line class="dg-line" x1="116" y1="75" x2="158" y2="75" marker-end="url(#persp-bindings-ah)"/>
  <line class="dg-line" x1="246" y1="75" x2="276" y2="75" marker-end="url(#persp-bindings-ah)"/>
  <line class="dg-line" x1="364" y1="75" x2="394" y2="75" marker-end="url(#persp-bindings-ah)"/>
  <line class="dg-line" x1="482" y1="75" x2="522" y2="75" marker-end="url(#persp-bindings-ah)"/>
  <path class="dg-line" d="M574 100 L574 140 L66 140 L66 102" fill="none" marker-end="url(#persp-bindings-ah)"/>
  <text class="dg-text-muted dg-mid" x="320" y="132">bidirectional write-back (optional)</text>
</svg>`
  },

  pitfalls: [
    "Doing a database or HTTP call inside a script transform, which blocks a shared Gateway thread pool.",
    "Putting transforms in the wrong order, such as formatting to a string before a numeric map.",
    "Repeating the same expression binding across dozens of components instead of computing it once in a view custom prop.",
    "Turning on bidirectional for setpoints in a plant that requires confirmation and an audit trail.",
    "Assuming a property binding can read a property of an embedded view. It cannot; use a param.",
    "Query bindings with a 1-second poll that run once per open session."
  ],

  keyTerms: ["persp-binding", "persp-transform", "indirect-tag-binding", "script-transform", "bidirectional-binding", "expression-structure-binding", "query-binding"],

  quiz: [
    {
      q: "A label should say 'Running' or 'Stopped' based on a tag with values 1 and 0, with the lowest possible Gateway cost. Which transform?",
      options: ["Script transform with if/else", "Map transform with two entries", "Expression transform that calls a Python function", "A query binding"],
      answer: 1,
      explain: [
        "It works but runs Python per update per session.",
        "Correct. A map is a pure lookup and the cheapest way to translate codes.",
        "Expressions do not call project Python functions that way, and a lookup does not need it.",
        "A query binding talks to a database, which is unrelated to a tag-to-text lookup."
      ]
    },
    {
      q: "You have an expression transform {value} / 100 followed by a format transform '0.00'. What happens if you reorder them so format runs first?",
      options: [
        "Nothing, transform order does not matter",
        "The format step acts on the raw number, the expression step then gets a string and the division is wrong or fails",
        "The binding becomes bidirectional",
        "Perspective reorders them automatically"
      ],
      answer: 1,
      explain: [
        "Order is the whole point of a pipeline.",
        "Correct. Each transform receives the previous output, so format first yields a string for the division.",
        "Transform order has no effect on direction.",
        "Perspective runs transforms in the order listed."
      ]
    },
    {
      q: "A view needs to show the same tile for 40 different motors. How should the Speed label get its tag?",
      options: [
        "40 copies of the view, each with a direct tag binding",
        "An indirect tag binding with the path built from a view param",
        "A script that writes the tag path into props.text",
        "A property binding to the other view's label"
      ],
      answer: 1,
      explain: [
        "That is the maintenance nightmare indirection exists to avoid.",
        "Correct. One view, a param for the base path, and an indirect binding in the child.",
        "A script would write text, not subscribe to a tag.",
        "Property bindings cannot reach into another view instance."
      ]
    },
    {
      q: "Why can a heavy script transform hurt even when it takes only 20 ms?",
      options: [
        "Because it runs in the browser on every phone",
        "Because it runs on the Gateway for every session and update on a shared pool, and the cost multiplies",
        "Because Python is not allowed in transforms",
        "Because it changes the tag's quality"
      ],
      answer: 1,
      explain: [
        "Bindings are evaluated on the Gateway, not in the browser.",
        "Correct. Twenty milliseconds times 60 sessions times frequent updates adds up, and blocking calls are worse.",
        "Python is allowed. It is simply the most expensive transform.",
        "A transform changes the value delivered to the property, not the tag's quality."
      ]
    },
    {
      q: "An operator types a setpoint into a field with a bidirectional tag binding and a script transform that rounds the value. What is the risk?",
      options: [
        "None, bidirectional reverses any transform",
        "Transforms cannot be reversed automatically, so what is written back may not be what was typed",
        "The tag is locked",
        "Bidirectional only works for query bindings"
      ],
      answer: 1,
      explain: [
        "The platform cannot invert arbitrary transforms.",
        "Correct. Bidirectional writes the property value as-is, so a computed or transformed value needs a deliberate design, or use an Apply button with an event script.",
        "Nothing locks the tag, though its security must still permit the write.",
        "Bidirectional is offered for tag and property bindings."
      ]
    },
    {
      q: "What is the right way to get data from an embedded view's label into the parent?",
      options: [
        "A property binding straight to the child's label",
        "An output param on the child, bound from inside the child",
        "A session prop written by a transform",
        "It cannot be done"
      ],
      answer: 1,
      explain: [
        "Property bindings cannot cross the view boundary.",
        "Correct. Output params are how a view exposes values, and the parent reads them through the embedded view's params.",
        "That adds shared state and hidden coupling when a param is available.",
        "It is a standard pattern."
      ]
    }
  ],

  resources: [
    { title: "Tag Bindings in Perspective (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/tag-bindings-in-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Property Bindings in Perspective (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/property-bindings-in-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Expression Bindings in Perspective (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/expression-bindings-in-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Script Transform (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/transforms/script-transform", type: "docs", source: "Inductive Automation" },
    { title: "Format Transform (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/transforms/format-transform", type: "docs", source: "Inductive Automation" },
    { title: "Query Bindings in Perspective (8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/query-bindings-in-perspective", type: "docs", source: "Inductive Automation" }
  ]
});
