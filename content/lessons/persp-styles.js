LC.lesson({
  id: "persp-styles",
  title: "Styles, style classes and themes",
  track: "persp",
  minutes: 20,
  level: 2,
  prereqs: ["persp-containers"],
  tags: ["perspective", "styles", "css", "themes", "style classes"],
  summary: "Perspective styling is CSS with project plumbing. Learn the cascade from theme to class to inline style, and why a disciplined class library makes a project cheap to change.",
  objectives: [
    "State the cascade order of themes, style classes and inline styles",
    "Create a style class with element states and a media query",
    "Explain what a theme is and how CSS variables let one palette drive everything",
    "Use the advanced stylesheet resource and reference its classes correctly",
    "Argue for style classes over per-component styling"
  ],

  body: `
## Styling is just CSS, with three layers

Every Perspective component renders to HTML, so its look is CSS. Ignition gives you three places to put that CSS, applied in this order, each overriding the one before:

1. **Theme**: the base look of the whole app, in Gateway-level files.
2. **Style classes**: named, reusable bundles stored in the project.
3. **Inline style** (the \`style\` property): CSS set directly on one component.

Think of it as a cascade from broad to specific. The more you push styling toward the broad end, the cheaper the project is to change.

{{diagram:cascade}}

## Inline styles

Every component has a \`props.style\` object for CSS properties such as \`backgroundColor\`, \`color\`, \`fontSize\`, \`padding\` and \`border\`. Keys use camelCase, and a binding can drive any of them. This is the right tool for **values that depend on data**: a bar fill width from a percentage, a color picked from an alarm state by a map transform.

It is the wrong tool for anything you decide once. Inline styles cannot express hover or focus states, cannot use media queries, and live on exactly one component. Ten buttons styled inline are ten places to edit.

## Style classes

A {{term:style-class|style class}} is a named set of style properties stored under the project's Styles. You assign one or several to a component in its \`props.style.classes\` property, as a space-separated string. Highlights:

- **Inheritance and reuse**: edit the class and every user updates.
- **Element states**: define \`:hover\`, \`:active\`, \`:focus\` and \`:disabled\` variations inside the class. Inline styles cannot do this.
- **Media queries**: change values at screen sizes, for example smaller padding below 600 px wide.
- **Folders**: classes can live in folders, and the folder becomes part of the name.
- **Multiple classes** on one component: handy, but the order they apply in is not controlled by the order you list them. Keep classes that set the same property from overlapping.

Built-in classes use an \`IA_\` prefix (for example the table and button helpers that ship with Perspective). Do not reuse that prefix for your own classes.

### Binding the class itself

You can bind \`props.style.classes\` to an expression, which is the cleanest way to show state:

\`\`\`text
if({[default]Pump1/Fault}, "hmi/pump fault", if({[default]Pump1/Running}, "hmi/pump run", "hmi/pump idle"))
\`\`\`

The data decides which class applies. The look of "fault" lives in one class, so changing the fault look is one edit. Compare that with an expression computing a hex color on 400 symbols.

> [!tip] Class names are your design vocabulary
> Name classes for meaning, not appearance: \`hmi/value-abnormal\`, not \`hmi/red-bold\`. When the palette changes the name still tells the truth.

## Themes

A {{term:persp-theme|theme}} is the base layer: default fonts, component colors, backgrounds. Perspective ships light and dark themes, and users can switch. Themes live on the Gateway in a themes directory as folders of CSS files, and 8.3 supports creating custom themes by copying a bundled one or through the Gateway API. A derivative theme can extend a base theme and override only what differs.

The mechanism that makes this workable is the {{term:css-variable|CSS variable}}. Rather than hardcode \`#1b1b1b\` in forty places, a theme declares:

\`\`\`css
:root {
  --hmi-bg: #d3d3d3;
  --hmi-text: #202020;
  --hmi-alarm-critical: #d8232a;
}
\`\`\`

and styles reference \`var(--hmi-bg)\`. Swap the file for a night theme and everything follows. Bundled themes are built this way, which is why overriding a few variables is often all a "branded" theme needs.

> [!warning] Variables and the Designer
> A style class that uses \`var(--something)\` may not preview in the Designer until the project is saved and reloaded. Verify in a real browser session before concluding it does not work. After a version upgrade, recheck custom themes. The way bundled themes are layered and overridden changed in 8.3, and migrated projects have needed adjustments.

## The advanced stylesheet

For things the class editor cannot do, a project can include a stylesheet resource where you write raw CSS. The {{term:advanced-stylesheet|advanced stylesheet}} is the place for variables, complex selectors and rules for built-in component internals. Two details trip people up:

- Perspective adds a \`psc-\` prefix to project style classes in the page. When you target a class in raw CSS, write \`.psc-hmi\\\\/pump\` style names with the prefix. When you assign a class in the Designer, type the name without it.
- Classes you define only in the stylesheet do not appear in the Designer's dropdowns. You have to type their names in.

## Worked example: a three-class alarm palette

Define in the advanced stylesheet:

\`\`\`css
:root {
  --state-normal-fg: #404040;
  --state-warn-fg:   #b8860b;
  --state-alarm-fg:  #c8102e;
}
\`\`\`

Create classes \`hmi/value\`, \`hmi/value-warn\`, \`hmi/value-alarm\`, each setting only \`color\` from the matching variable, plus \`hmi/value\` carrying font size, weight and number alignment. Components get \`hmi/value\` always, with the state class added by a binding. A customer asks for a darker red: one variable changes, 800 components follow. A customer asks for colorblind-safe palette: one theme override.

## Responsive without per-view hacks

Use a media query inside a class (for example, bigger tap targets under 768 px) rather than building a separate mobile view for cosmetic differences. Layout differences still belong in container configuration; see {{lesson:persp-containers}}.
`,

  eli5: `
Think of dressing a school full of kids. You could hand each kid a pile of cloth and tell them exactly what to sew. Every kid ends up with a slightly different shirt, and if the principal decides the school color should change, you have to visit every kid.

Or the school can have uniforms. There is a "gym uniform," a "formal uniform," and a "winter coat." Kids just say which one they are wearing. If the school color changes, you update the pattern once and everyone's uniform follows.

The school also has a general rule everyone follows without being told: "we all wear blue." That is the theme. Uniforms are style classes. If one kid has a special patch sewn on, that is an inline style. It works, but one patch at a time is a slow way to run a school.

And paint labels like "school blue" are variables. Change what "school blue" means and everything painted with it changes.
`,

  why: `
**Why classes beat per-component styling.** Maintenance. A typical plant project has hundreds of views and thousands of components. A request such as "make fault text bigger" or "use the customer's brand font" is a one-line edit with classes and a week of clicking without them. Classes also enforce consistency: two operators' screens look the same because they share the same classes, not because someone remembered the hex code.

**Why name by meaning.** A class called \`red-bold\` becomes a lie when the palette changes. A class called \`value-abnormal\` stays correct, and it forces the team to decide what abnormal looks like, which is a design decision worth making once. This is the bridge to {{lesson:persp-hphmi}}, where color has fixed meaning.

**Why variables and themes.** Themes make dark mode, night shifts and customer rebrands cheap. The tradeoff is indirection: you must know which variable a color comes from. Document the variable names the way you document tag naming.

**Where it breaks down.** Style class precedence is not fully controllable when several classes set the same property, and inline styles beat classes. So a stray inline \`color\` on one component silently defeats your class. Audit for inline styles that duplicate class work. Data-dependent values (a bar width, a rotation angle) should stay inline or bound, since a class cannot depend on a number.

**What integrators argue about:** how many classes are too many. A small, strict set (around 20 to 40 for an HMI) is easier to keep consistent than a sprawling library with variants for every screen. Add a class when you have used the same look three times.
`,

  history: `
Perspective was designed around web technology, so its styling model is a thin layer over CSS rather than a proprietary system. That is a contrast with the older Vision client, where styling meant per-component property settings and custom painting. Style classes, themes with CSS variables, and the advanced stylesheet were added so Perspective projects could take on web-style design practices such as design systems.
`,

  examples: [
    {
      title: "Hover and disabled states in one class",
      body: `Create \`ui/button-primary\` with a background, white text and a 4 px radius. Under element states add hover (slightly darker background) and disabled (reduced opacity, \`cursor: not-allowed\`). Assign the class to every primary button. None of them needs an inline style, and a rebrand is one edit.`
    },
    {
      title: "Finding inline overrides",
      body: `Operators report that one pump shows black text in the fault state while all others show red. The class is correct. The component has a leftover inline \`style.color\` that beats the class. Clear the inline value, and the component follows the class again.`
    }
  ],

  diagrams: {
    cascade: `<svg viewBox="0 0 640 220" role="img" aria-label="Styling cascade: theme at the base, style classes over it, inline style on top, with the most specific winning">
  <defs>
    <marker id="persp-sty-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="60" width="170" height="100" rx="6"/>
  <text class="dg-title" x="36" y="88">1. Theme</text>
  <text class="dg-text-sm" x="36" y="112">Gateway CSS files</text>
  <text class="dg-text-sm" x="36" y="132">CSS variables</text>
  <text class="dg-text-muted" x="36" y="150">whole app</text>
  <line class="dg-line" x1="190" y1="110" x2="230" y2="110" marker-end="url(#persp-sty-ah)"/>
  <rect class="dg-box-accent" x="235" y="60" width="170" height="100" rx="6"/>
  <text class="dg-title" x="251" y="88">2. Style class</text>
  <text class="dg-text-sm" x="251" y="112">Named, reusable</text>
  <text class="dg-text-sm" x="251" y="132">States, media queries</text>
  <text class="dg-text-muted" x="251" y="150">project</text>
  <line class="dg-line" x1="405" y1="110" x2="445" y2="110" marker-end="url(#persp-sty-ah)"/>
  <rect class="dg-box" x="450" y="60" width="170" height="100" rx="6"/>
  <text class="dg-title" x="466" y="88">3. Inline style</text>
  <text class="dg-text-sm" x="466" y="112">One component</text>
  <text class="dg-text-sm" x="466" y="132">Bound to data</text>
  <text class="dg-text-muted" x="466" y="150">wins on conflict</text>
  <text class="dg-text-muted" x="20" y="200">Broad and cheap to change</text>
  <text class="dg-text-muted" x="450" y="200">Specific and costly</text>
</svg>`
  },

  pitfalls: [
    "Leaving inline styles on components that also have a class, so the inline value silently wins.",
    "Naming classes for appearance (red-bold) instead of meaning (value-abnormal).",
    "Forgetting the psc- prefix in raw CSS selectors, or typing it in the Designer class field.",
    "Trusting the Designer preview for var() usage. Test in a browser session.",
    "Hardcoding hex colors across forty classes instead of declaring variables once."
  ],

  keyTerms: ["style-class", "persp-theme", "css-variable", "advanced-stylesheet"],

  quiz: [
    {
      q: "A component has the class 'hmi/value-alarm' (red text) and an inline style color of black. What color shows?",
      options: ["Red, because classes win", "Black, because inline styles override classes", "Whichever was set last in time", "The theme color"],
      answer: 1,
      explain: [
        "The cascade is theme, then classes, then inline, with later layers winning.",
        "Correct. Inline style is the most specific layer here.",
        "Order in time doesn't matter, only the layer.",
        "The theme is the base layer and loses to both."
      ]
    },
    {
      q: "Which requirement can an inline style NOT satisfy?",
      options: ["A bar fill width driven by a percentage", "A background color chosen by a binding", "A different button color on hover", "A custom font size"],
      answer: 2,
      explain: [
        "Inline style is a good fit for data-driven values.",
        "A binding on an inline property is a normal use.",
        "Correct. Element states such as :hover need a style class or stylesheet rule.",
        "Font size is an ordinary style property."
      ]
    },
    {
      q: "The customer wants a darker alarm red across 800 components. What is the cheapest design to have started with?",
      options: ["Hex color set on each component", "A script that recolors at runtime", "A CSS variable used by a small set of state classes", "Separate views per color"],
      answer: 2,
      explain: [
        "That requires visiting all 800 components.",
        "A script is hidden logic and slower than a declared style.",
        "Correct. One variable edit flows through every class that uses it.",
        "Views are not the unit of styling."
      ]
    },
    {
      q: "You define a class directly in the advanced stylesheet and it does not appear in the Designer dropdown. What do you do?",
      options: ["It is broken, recreate it in the class editor", "Type its name (without the psc- prefix) into the component's classes field", "Restart the Gateway", "Prefix it with IA_"],
      answer: 1,
      explain: [
        "It is not broken. Stylesheet-only classes just are not listed.",
        "Correct. Type the name. Perspective adds the psc- prefix on the page.",
        "A restart doesn't change what the dropdown lists.",
        "IA_ is reserved for Perspective's built-in classes."
      ]
    },
    {
      q: "Which class name best follows the maintenance advice?",
      options: ["red-bold", "big-red", "value-abnormal", "style7"],
      answer: 2,
      explain: [
        "That describes appearance, which stops being true if the palette changes.",
        "Also appearance-based.",
        "Correct. It names the meaning, so the appearance can change without renaming.",
        "Opaque names tell the next maintainer nothing."
      ]
    }
  ],

  resources: [
    { title: "Creating and Using Custom Perspective Themes (Ignition 8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/styles/creating-and-using-custom-perspective-themes", type: "docs", source: "Inductive Automation" },
    { title: "Style Reference (Ignition 8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/reference-pages/style-reference", type: "docs", source: "Inductive Automation" },
    { title: "Style Classes", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/styles/style-classes", type: "docs", source: "Inductive Automation" },
    { title: "Styles video", url: "https://inductiveuniversity.com/videos/styles/8.3", type: "video", source: "Inductive University" },
    { title: "Style Classes video", url: "https://inductiveuniversity.com/videos/style-classes/8.3", type: "video", source: "Inductive University" },
    { title: "Advanced Stylesheet Setup video", url: "https://inductiveuniversity.com/video/advanced-stylesheet-setup", type: "video", source: "Inductive University" },
    { title: "Perspective class precedence", url: "https://forum.inductiveautomation.com/t/perspective-class-precedence/37892", type: "forum", source: "Inductive Automation Forum" }
  ]
});
