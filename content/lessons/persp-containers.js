LC.lesson({
  id: "persp-containers",
  title: "Containers and responsive layout",
  track: "persp",
  minutes: 25,
  level: 2,
  prereqs: ["persp-views"],
  tags: ["perspective", "layout", "flex", "responsive", "containers", "breakpoints"],
  summary: "Every Perspective layout decision is a container choice. Learn what each container does to its children, and why flex-first views survive change.",
  objectives: [
    "Explain how a parent container interprets a child's position object",
    "Compare coordinate, flex, column, breakpoint, tab, split and drawing containers and pick one for a task",
    "Set flex direction, grow, shrink, basis, wrap, justify and align to build a layout that adapts",
    "Design one view that works on a phone and a desktop using breakpoints or wrapping flex",
    "Argue why flex-first layouts are cheaper to maintain than pixel-placed ones"
  ],

  body: `
## The container decides the layout

A Perspective view has a root component, and almost always that root is a container. The container does not just group children. It **owns the meaning of their \`position\` property**. Drop a label into a coordinate container and its position holds \`x\`, \`y\`, \`width\`, \`height\`. Move the same label into a flex container and the position is rewritten to \`basis\`, \`grow\`, \`shrink\`. Choosing a container is choosing the layout model for everything inside it. See {{lesson:persp-views}} for how \`position\` fits in the property tree.

| Container | Layout model | Typical use |
|---|---|---|
| {{term:coordinate-container|Coordinate}} | Explicit x/y/width/height (fixed px or percent) | P&ID-style graphics, overlays, anything pinned to a picture |
| {{term:flex-container|Flex}} | Row or column that shares space | Almost all forms, tiles, headers, toolbars, dashboards |
| {{term:column-container|Column}} | 12-column grid with per-breakpoint spans | Responsive page grids where items change width by device |
| {{term:breakpoint-container|Breakpoint}} | Swaps whole child sets by container width | Genuinely different phone vs desktop layouts |
| {{term:tab-container|Tab}} | One pane visible, tabs to switch | Settings pages, multi-section detail views |
| {{term:split-container|Split}} | Two panes with a draggable divider | Master/detail, tree beside content |
| Drawing | Vector shapes on a drawing surface | Custom graphics and process symbols |

{{diagram:models}}

## Coordinate containers

A coordinate container positions each child with \`x\`, \`y\`, \`width\` and \`height\`. It has a mode setting:

- **Fixed**: values are pixels. The container itself keeps its size, so on a bigger browser window you get empty margins, and on a smaller one you get scrollbars.
- **Percent**: values are percentages of the container. Children stretch and move with it.

A child in a coordinate container can overlap others, which is why it is the right tool for a graphic with live values sitting on top of a tank picture. It is also the layout that fights you the hardest. Add one field to a form and you must move everything below it by hand. Percent mode distorts text-bearing components when the aspect ratio changes, because text does not scale with the box.

## Flex containers

The {{term:flex-container|flex container}} uses the CSS flexbox model, which is worth learning as such. Container-level props:

| Prop | Controls | Common values |
|---|---|---|
| \`direction\` | The main axis | \`row\`, \`column\` (and reverse variants) |
| \`wrap\` | Whether children flow to a new line | \`nowrap\`, \`wrap\` |
| \`justify\` | Spacing along the main axis | \`flex-start\`, \`center\`, \`space-between\` |
| \`alignItems\` | Alignment across the main axis | \`stretch\`, \`center\`, \`flex-start\` |
| \`alignContent\` | Spacing between wrapped lines | \`flex-start\`, \`space-around\` |

Per-child values live in \`position\` and use {{term:flex-grow-shrink-basis|grow, shrink and basis}}:

- **basis**: the starting size on the main axis (\`200px\`, \`30%\`, or \`auto\` to size by content).
- **grow**: a weight for sharing leftover space. Two children with grow 1 split spare room equally. A child with grow 2 gets twice a grow-1 sibling's share of the extra.
- **shrink**: a weight for giving up space when the container is too small. Set to 0 to make a child hold its size.

\`\`\`json
{
  "type": "ia.container.flex",
  "meta": { "name": "Header" },
  "props": { "direction": "row", "justify": "space-between", "alignItems": "center" },
  "children": [
    { "type": "ia.display.label", "meta": { "name": "Title" },
      "position": { "basis": "auto", "grow": 1, "shrink": 1 },
      "props": { "text": "Boiler 2" } },
    { "type": "ia.input.button", "meta": { "name": "Ack" },
      "position": { "basis": "96px", "grow": 0, "shrink": 0 },
      "props": { "text": "Acknowledge" } }
  ]
}
\`\`\`

Here the button is a fixed 96 px that never squeezes. The title takes all remaining room and shrinks first. Nobody calculated a pixel position, and the header works at 360 px or 1920 px wide.

### Flex wrap as free responsiveness

A row container with \`wrap: wrap\` and children with \`basis: 320px; grow: 1\` makes a tile grid that fits as many tiles per line as the width allows, with no breakpoint at all. Browsers do the arithmetic.

## Column containers

The {{term:column-container|column container}} divides its width into 12 columns and has three breakpoints, small, medium and large, each with a minimum width. Every child stores a separate position per breakpoint: a column span, a row index and a column index. A chart can span 12 columns on small, 6 on medium and 4 on large. The active breakpoint is chosen at runtime. Switching breakpoints in the Designer changes what you are editing, not the container's own size. Use it when different devices need different *widths* for the same set of items. Column and breakpoint containers both switch on width, but they may not measure the same width (the container's own box or the browser viewport). Check the container palette pages in the manual for your version, and test by embedding the view in a narrow region before you rely on either.

## Breakpoint containers

A {{term:breakpoint-container|breakpoint container}} holds more than one set of children and shows one set based on a width threshold you configure. Use it when the layouts differ in substance: a phone shows a stacked summary and a drill-down list, while a desktop shows a trend, a table and a P&ID side by side. Because the hidden set is still defined, give each set the same inputs by binding to view-level custom props or params. If you duplicate bindings across sets, you will fix a bug in one and forget the other.

## Tab and split containers

A {{term:tab-container|tab container}} shows one child pane at a time. Panes that are not visible are not free to ignore: bindings inside them can still run depending on configuration, so a tab container with ten heavy tabs deserves a look at {{lesson:persp-embedding}}, where you lazy-load content by embedding a view only when its tab is selected. A {{term:split-container|split container}} holds exactly two children with a draggable divider and a horizontal or vertical orientation. Operators like it for list-and-detail screens.

## Choosing, and why flex-first wins

> [!tip] A decision rule
> Start every view with a flex root. Use nested flex containers for rows and columns. Reach for a coordinate container only for an area that is genuinely a picture with things pinned on it, and nest it inside the flex layout so the picture area as a whole still adapts. Use a column container when you have a page-level grid and designers specify per-device column counts. Use breakpoint when the two devices need different component sets.

The reason is change cost. A pixel-placed screen encodes the *result* of a layout decision. A flex screen encodes the *rule*. When a new field, a longer translated label or a taller banner arrives, the flex rule re-flows everything and the pixel layout needs manual surgery. Across a plant with 200 views, that difference is weeks of work.

### A phone-and-desktop pattern

1. Root: flex column, filling the page.
2. A header flex row: title (grow 1), alarm badge (basis auto, grow 0).
3. A body flex row with \`wrap: wrap\`. Children are embedded tiles with \`basis: 340px; grow: 1\`.
4. For anything that needs a truly different phone layout, wrap just that region in a breakpoint container.
5. Test with the Designer's device preview, then on an actual phone. Size touch targets to your site's glove and device spec (see {{lesson:persp-mobile}}) instead of a rule of thumb.

> [!warning] Percent is not responsive
> Percent mode in a coordinate container scales boxes, but text, borders and icons stay a fixed size. On a narrow screen you get a label wider than its box, clipped. A coordinate layout is resolution-dependent even when it looks flexible.
## If you already build Perspective

You know grow, shrink and basis. These are the failures that show up in a plant with long tag names and mixed screens.

### The flex min-size trap

In CSS, a flex item will not shrink below the size of its content by default. A header row holding \`Title\` (basis auto, shrink 1) and an Acknowledge button (shrink 0) works until a UDT instance name such as \`Area10_Line1_Mixing_Tank_Transfer_Pump_Discharge_Valve\` arrives. The label refuses to shrink below its text width, so the row overflows and pushes the button off screen. Setting \`shrink: 1\` is not enough.

The fix is to let the label give up its minimum: set \`min-width: 0\` and \`overflow: hidden\` with \`text-overflow: ellipsis\` and \`white-space: nowrap\` in a style class applied to the label (style classes take raw CSS), then give the row a tooltip with the full name. Apply the same treatment to every label that shows a name coming from a tag or database. Put it in one class (\`text/truncate\`) in your {{lesson:persp-styles}} set and use it in faceplates, so a long name on one asset cannot break a shared template.

### Nesting depth and layout cost

Each flex container adds a layout pass in the browser. Deep nesting is not a Gateway cost, but it makes the property tree hard to read and leads to wrapper containers that exist only to carry one grow value. Rules that keep trees shallow:

- One direction change per level. A row inside a column inside a row is usually two containers too many.
- Use \`gap\`-style spacing from the container where your version exposes it, not empty spacer components.
- A container with one child and no styling is a wrapper to delete.

### Which container for a multi-area plant

| Region | Container | Why |
|---|---|---|
| Page shell | Flex column, or dock-based page layout | Header, nav and content adapt, see {{lesson:persp-navigation}} |
| Unit overview with tiles | Flex row, wrap | Tile count changes per area |
| P&ID for one unit | Percent coordinate inside a flex body | Pinned graphic, adaptive frame |
| Two device classes (control room, phone) | Breakpoint container around the differing region only | Different content, shared bindings |
| Dense list plus detail | Split container | Operator resizes to taste |

### Reduce hidden-branch cost

A breakpoint container defines every child set. Treat the hidden sets as live code. If they hold embedded views, bind each embedded view's path so the hidden one has an empty path, which keeps it from loading. The phone set and desktop set should read from the same view custom props, so you are not paying for two sets of query bindings.

### Test matrix

Test three real widths, not the Designer preview alone: a control-room monitor, a tablet in a holder, and a phone in portrait. Then test the longest real names and a translated label. Layout bugs are almost always content bugs.

`,

  eli5: `
Imagine arranging photos on a bulletin board. You can push a pin through each photo at an exact spot, measured with a ruler. That looks perfect on one board. If someone swaps in a smaller board, the photos hang off the edge, and if you add a photo you have to move all the pins.

Or you can use a magnetic strip along a shelf. You tell the photos, "line up in a row, share the empty room evenly, and when the shelf is full, start a new row." Add a photo and the others slide over. Use a smaller shelf and they start a new row on their own.

The pins are the coordinate container. The magnetic shelf is the flex container. Breakpoint is like keeping two different shelf setups, one for a tiny board and one for a big board, and picking the right one when you walk in. Most of the time the shelf is the right choice, and you save the pins for the one picture where every piece has to be at an exact spot.
`,

  why: `
**Why container choice is the first layout decision.** Components cannot place themselves. The container interprets position, so changing containers rewrites every child. Teams that start in coordinate mode and later need phone support discover they have to rebuild each view, not tweak it.

**Why flex first?** Flex gives you adaptation, content-driven sizing and cheap edits. Coordinate gives you exactness and overlap. Most operator screens need the former. The common failure is the "pixel-perfect mock-up from a designer" translated literally into coordinates. It looks right in the review and breaks the first time a tag name is longer than the sample.

**What integrators argue about.** One camp says use a column container for everything because it matches the way web designers think. The other says flex covers 90% of cases with fewer concepts and is better documented in the wider web world (anything you learn about CSS flexbox applies). Both agree on avoiding nested coordinate containers more than one level deep. Another argument is whether to build separate mobile views or one responsive view. Separate views double maintenance, so the safer default is one view with wrapping flex and a breakpoint container for the few regions that differ.

**Cost of the hidden branch.** A breakpoint or tab container that keeps all of its children defined costs memory and binding load even when they are not visible. Hide expensive content behind an embedded view whose path is bound, so it only exists when needed.
`,

  history: `
Perspective launched with Ignition 8.0 as a browser-native alternative to Vision, whose windows were placed in pixels. Its flex container follows the CSS Flexible Box Layout model from the W3C, which is why general web flexbox references describe its behavior accurately. The column, breakpoint and split containers give integrators grid, device-switching and resizable-pane patterns on top of that base.
`,

  examples: [
    {
      title: "Tile grid with no breakpoints",
      body: `A dashboard of 12 motor tiles. Root is a flex container with \`direction: row\`, \`wrap: wrap\`, \`justify: flex-start\`. Each tile has \`basis: 300px\`, \`grow: 1\`, \`shrink: 0\`. At 1920 px that is six per line, on a 768 px tablet two, on a phone one. Nothing was positioned by hand and the same JSON serves every device.`
    },
    {
      title: "P&ID with live values",
      body: `A tank graphic needs value labels placed on specific pipes. Build the screen as a flex column: header row (basis 56 px), then a body with \`grow: 1\` holding a **percent-mode coordinate container**. The picture and its labels use percent coordinates inside the body. The header and any footer still adapt, and only the graphic region is pinned.`
    }
  ],

  diagrams: {
    models: `<svg viewBox="0 0 640 250" role="img" aria-label="Coordinate container places children at x and y; flex container flows children in a row sharing space by grow; column container assigns spans out of 12 columns">
  <text class="dg-title" x="20" y="24">Coordinate</text>
  <rect class="dg-box" x="20" y="36" width="190" height="150" rx="6"/>
  <rect class="dg-box-accent" x="36" y="50" width="70" height="40" rx="4"/>
  <rect class="dg-box-accent" x="110" y="110" width="80" height="60" rx="4"/>
  <text class="dg-text-mono" x="20" y="210">x, y, width, height</text>
  <text class="dg-text-muted" x="20" y="230">pinned, can overlap</text>
  <text class="dg-title" x="235" y="24">Flex (row)</text>
  <rect class="dg-box" x="235" y="36" width="190" height="150" rx="6"/>
  <rect class="dg-box-accent" x="245" y="90" width="40" height="42" rx="4"/>
  <rect class="dg-box-accent" x="289" y="90" width="80" height="42" rx="4"/>
  <rect class="dg-box-accent" x="373" y="90" width="42" height="42" rx="4"/>
  <text class="dg-text-mono" x="235" y="210">basis, grow, shrink</text>
  <text class="dg-text-muted" x="235" y="230">shares leftover space</text>
  <text class="dg-title" x="450" y="24">Column (12)</text>
  <rect class="dg-box" x="450" y="36" width="170" height="150" rx="6"/>
  <rect class="dg-box-accent" x="458" y="46" width="154" height="40" rx="4"/>
  <rect class="dg-box-accent" x="458" y="92" width="74" height="40" rx="4"/>
  <rect class="dg-box-accent" x="538" y="92" width="74" height="40" rx="4"/>
  <text class="dg-text-mono" x="450" y="210">span per breakpoint</text>
  <text class="dg-text-muted" x="450" y="230">12 / 6+6 on small</text>
</svg>`
  },

  pitfalls: [
    "Building a whole screen in a fixed coordinate container, then discovering it breaks on any other browser size.",
    "Believing percent mode makes text and icons scale. Only box positions and sizes scale.",
    "Duplicating bindings in both children sets of a breakpoint container, so fixes land in only one.",
    "Leaving shrink at its default on fixed-size controls such as buttons, so they get squeezed unreadable.",
    "Putting ten heavy tabs in a tab container and keeping all content live.",
    "Designing at the Designer's default window size and never testing a real phone."
  ],

  keyTerms: ["coordinate-container", "flex-container", "column-container", "breakpoint-container", "tab-container", "split-container", "flex-grow-shrink-basis"],

  quiz: [
    {
      q: "A header row has a title and an Acknowledge button. You want the button to stay 96 px wide and the title to take the rest. Which position values do this?",
      options: [
        "Title basis 96px, button grow 1",
        "Both grow 1, both shrink 1",
        "Button basis 96px grow 0 shrink 0; title grow 1",
        "Switch to percent mode and set title to 80%"
      ],
      answer: 2,
      explain: [
        "That reverses the roles and fixes the wrong item.",
        "Equal grow splits the free space evenly, so the button would grow to match the title.",
        "Correct. The button holds a fixed size and the title absorbs all leftover space.",
        "Percent mode is for coordinate containers, and a fixed percentage does not adapt to content or screen."
      ]
    },
    {
      q: "Why does a child's position object change shape when you drag it from a coordinate container into a flex container?",
      options: [
        "The Designer is buggy",
        "The parent container defines what position means",
        "Flex containers ignore position entirely",
        "Position is copied from style classes"
      ],
      answer: 1,
      explain: [
        "It is by design.",
        "Correct. Each container type interprets position its own way: x/y/width/height vs basis/grow/shrink.",
        "Flex uses position for basis, grow, shrink and similar values.",
        "Style classes control appearance, not placement."
      ]
    },
    {
      q: "You need a tile grid that shows about six tiles per row on a monitor, fewer on a tablet and one on a phone, using the least configuration. What do you build?",
      options: [
        "Three views, one per device",
        "A flex container with wrap on and tiles at basis 300px grow 1",
        "A coordinate container in fixed mode with 12 tiles pinned",
        "A tab container with a tab per device"
      ],
      answer: 1,
      explain: [
        "That triples the maintenance and is unnecessary here.",
        "Correct. The browser wraps tiles as room allows, with no breakpoints needed.",
        "Fixed pixel positions cannot adapt to different screen widths.",
        "Tabs switch content, not density."
      ]
    },
    {
      q: "When is a breakpoint container the better choice than wrapping flex?",
      options: [
        "When phone and desktop need substantially different sets of components",
        "When you want to avoid writing bindings",
        "When you need children to overlap",
        "Whenever the screen has more than ten components"
      ],
      answer: 0,
      explain: [
        "Correct. Breakpoint swaps child sets, which is right when the layouts differ in substance.",
        "It adds binding duplication risk, not less.",
        "Overlap is a coordinate container feature.",
        "Component count does not decide it. Layout difference does."
      ]
    },
    {
      q: "A designer's mock-up was built in percent-mode coordinates. On a narrow phone, labels overflow their boxes. Why?",
      options: [
        "Percent mode scales box positions and sizes but not font size",
        "Percent mode is limited to 100 children",
        "The phone browser disables percent",
        "Labels cannot be placed in coordinate containers"
      ],
      answer: 0,
      explain: [
        "Correct. Boxes shrink but text stays the same size, so text no longer fits.",
        "No such limit exists.",
        "Percent is evaluated by the browser's layout engine on every device.",
        "Labels are valid in any container."
      ]
    }
  ],

  resources: [
    { title: "Perspective - Container Palette (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-container-palette", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - Coordinate Container (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-container-palette/perspective-coordinate-container", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - Column Container (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-container-palette/perspective-column-container", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - Flex Container (manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-container-palette/perspective-flex-container", type: "docs", source: "Inductive Automation" },
    { title: "Flex Container video", url: "https://inductiveuniversity.com/videos/flex-container/8.3", type: "video", source: "Inductive University" },
    { title: "Breakpoint Container video", url: "https://inductiveuniversity.com/videos/breakpoint-container/8.1", type: "video", source: "Inductive University" }
  ]
});
