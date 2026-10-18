LC.lesson({
  id: "hmi-type-numbers",
  title: "Typography, numbers and units",
  track: "hmi",
  minutes: 20,
  level: 2,
  prereqs: ["hmi-layout"],
  tags: ["hmi", "typography", "numbers", "units", "perspective", "style classes", "legibility"],
  summary: "Numbers are most of what an operator reads. Choose a plain font, align digits, size text from the viewing distance, and show only the decimals that mean something.",
  objectives: [
    "Pick a typeface and style rules that keep digits and units readable at a glance",
    "Compute a minimum text height from viewing distance with the visual-angle formula",
    "Align, round and label numbers so a column of values can be scanned",
    "Write labels in plain language and decide when a tag name belongs on screen",
    "Build a small set of text-role style classes in Perspective"
  ],

  body: `
## Why type matters on a process screen

An operator screen is mostly text and numbers. Pictures of tanks help orientation, but the decision usually comes from a value, a unit and a label. If those are hard to read from the operator's real chair, the best layout fails. Typography on an HMI is not about looking modern. It is about reading a number correctly in about a second, from across a control room, at 3 a.m.

This lesson covers the text half of the problem. Layout and grouping are in {{lesson:hmi-layout}}, color is in {{lesson:hmi-color}}, and the overall philosophy is in {{lesson:persp-hphmi}}.

## Choosing a typeface

Rules of thumb that most HMI style guides converge on:

- **Use a plain sans-serif.** On screens, a simple sans-serif with open shapes reads well at small sizes and at a distance. Fonts with a decorative personality add nothing and slow reading.
- **Look at the x-height.** The {{term:x-height|x-height}} is the height of lowercase letters such as "x" relative to the full font size. A larger x-height makes lowercase text legible at a smaller point size, which matters for labels like "Mixer M101 speed". Compare candidates at the same pixel size, not the same font-size number.
- **Tell confusable characters apart.** Check that 0 and O, 1 and l and I, 5 and S, and 8 and B are distinct in the font. A tag called \`LT101\` must not read as \`LTIOI\`.
- **Use one family, two weights.** One typeface, regular and bold, is enough. Weight and size are your hierarchy tools (see below). Italics and underlines are rarely needed.
- **Make sure the font exists on every client.** A Perspective session renders in the operator's browser. A font that is not installed or loaded falls back silently to another one, and your widths and alignment change. Prefer a system font stack, or load a web font through your theme so it is the same everywhere.

## Numbers: align, round, label

### Tabular figures and right alignment

In many fonts the digit 1 is narrower than 8. These are proportional figures, good for prose and bad for a column of readings, because the decimal points drift and 1.1 looks shorter than 8.8. {{term:tabular-figures|Tabular figures}} give every digit the same width, so numbers stack. In CSS this is \`font-variant-numeric: tabular-nums\`, which maps to the OpenType \`tnum\` feature (W3C CSS Fonts Level 4). It only works if the font contains tabular glyphs. A monospaced font always satisfies it.

Then **right-align numbers** (or align on the decimal point) so units, tens and tenths sit in columns. Left-aligned numbers force the operator to read each one fully to compare size. Left-align text labels, right-align numbers.

{{diagram:columns}}

### Show only meaningful decimals

Every digit you show claims precision. A value like 3.4712 m from a 4–20 mA level transmitter implies you know the level to a tenth of a millimetre. You do not. The sensor, the scaling, the stilling effects of an agitated surface and the operator's task decide how many decimals mean anything.

- Start from the transmitter and loop accuracy, then from what the operator would do differently. If a 0.05 m change changes no decision, do not show hundredths.
- Use the same number of decimals for the same kind of value everywhere. Level 3.5 on one screen and 3.50 on another looks like two different instruments.
- Constant decimals per field, so the field does not jump in width. Tabular figures plus a fixed decimal count make the number stable.
- Drop trailing precision on big numbers (12,480 kg, not 12,480.37 kg) and use a thousands separator suited to your site.
- Raw counts and unrounded floats do not belong on operator screens. They belong on a diagnostics page.

> [!example] LT101 precision
> LT101 spans 0–5.0 m. Suppose the loop is good to about 0.1 m (an assumed figure for this example; use your own loop's accuracy). Show one decimal: **3.5 m**. In Perspective a Label text expression can do it: \`numberFormat({[default]Plant1/Area10/Line1/LT101.Value}, '0.0')\`. A rounded display is only a display choice. The alarm still trips on the unrounded value.

### Always show units

A bare number is an invitation to misread. Show units next to every value, in a quieter style than the number so they support it without competing. Pull them from the tag's engineering-unit property rather than typing them into the label, so a unit change is made once. Put the unit in the same place every time: right after the number, or in a unit column.

Mixed units on one screen (kPa here, bar there) are a classic cause of wrong actions. Pick one per measurement type in the style guide. See {{lesson:hmi-process}} for the style-guide workflow.

## Hierarchy: labels, values, units

Not every piece of text deserves equal weight. The operator reads **values** first, **labels** second, and **units** barely. Express that with size, weight and contrast, not color:

| Role | Treatment | Why |
|---|---|---|
| Value | Largest of the three, regular or bold, high-contrast, tabular figures, right-aligned | The thing being read |
| Label | Smaller, regular, muted-dark, left-aligned | Identifies the value, read once then ignored |
| Units | Smaller than the value, muted | Needed to be correct, not needed to be noticed |
| Title | Bold, larger, used sparingly | Orients to the area or unit |
| Alarm or abnormal text | Reserved style, see {{lesson:hmi-abnormal}} | Nothing else uses it |

Avoid ALL-CAPS for sentences or labels of more than a word or two. Capitals share one height, so words lose their outline shape and read slower. Sentence case or title case for labels works best. All-caps is fine for very short codes and abbreviations such as "PSI" or "AUTO". NN/g's guidance on glanceable reading does recommend larger sizes and uppercase for single words read at a glance, which suits short status words rather than labels and sentences. Consistency matters more than which you choose.

## Sizing text for the viewing distance

Pixel or point sizes mean nothing without a distance. What the eye receives is the **visual angle** the text subtends. For a character of height h at distance d:

> visual angle = 2 × arctan(h / 2d), which for small angles is about h / d in radians.

Rearranged for design: **h = d × tan(angle)**. Choose a target angle, then solve for height. The target is a design assumption you own. Ergonomics standards and site guides each set one, so take the figure from your corporate standard or ISO 9241 and test it with operators. The numbers below use **20 arcminutes** (one-third of a degree, 0.00582 rad) for capital-letter height purely as an illustration.

{{diagram:angle}}

### Worked example

Assume a 24-inch 1920 × 1080 monitor, which is about 531 mm wide, so about 0.277 mm per pixel. A capital letter is about 0.72 of the font size (varies by font).

| Case | Distance | Cap height needed | In pixels | Font size |
|---|---|---|---|---|
| Normal desktop | 0.7 m | 700 mm × 0.00582 = 4.1 mm | 14.7 px | about 20 px |
| Operator console, 1.5 m away | 1.5 m | 1500 mm × 0.00582 = 8.7 mm | 31.5 px | about 44 px |
| Wall display, 4 m away | 4 m | 4000 mm × 0.00582 = 23.3 mm | 23.3 / 0.634 = 36.7 px on a 55-inch 1080p panel (0.634 mm per pixel) | about 51 px |

Two lessons come out of this. First, a screen designed at a desk and shown at 1.5 m or 4 m is far too small. Second, the wall display needs about 2.5 times the physical letter height of the 1.5 m console, so the same view cannot serve both. Give the wall a different, simpler view with fewer, larger values (see {{lesson:hmi-layout}}).

> [!warning] Check on the real screen
> A CSS pixel is not always a physical pixel. Browser zoom, operating-system scaling and a panel's native resolution all change the physical size. Measure the cap height on the actual screen with a ruler, at the actual distance, and adjust.

Minimum sizes are also a contrast problem. WCAG 2.x asks for 4.5:1 contrast for normal text and 3:1 for large text (18 pt, or 14 pt bold). Muted label colors often fail first. See {{lesson:hmi-color}}.

## Names: plain language vs tag names

Operators think in equipment and actions, not in tag paths. Compare:

| Bad | Better | Why |
|---|---|---|
| \`Area10_Mix_LT101_PV\` | Mixer level | The plant's language |
| \`M101 SPD FB\` | Mixer speed | Abbreviation saved nothing |
| LVL | Level | Four letters are cheap |
| TEMP. CTRL. DEV. ALM | Temperature deviation alarm | Say the thing |

Use the plant's own vocabulary, the one on the P&ID and in the operator's mouth. Where equipment is numbered on the floor, show the number: "Mixer M101" or "Pump P101". Keep the hyphenated drawing form (LT-101) where operators read drawings and the unhyphenated form (LT101) only where the system requires it, as defined in the house standard. Never show a historian path, a UDT member path or a gateway name.

Abbreviate only when it is universal on site (pH, psi, kg, °C) and the style guide lists it. Write each unit and abbreviation once in the guide and use exactly that form everywhere. Raw tag names are still valuable to maintainers, so put them in a tooltip, a diagnostics popup or a hidden-by-default field rather than on the main view.

## Doing it in Perspective

Build text roles as **style classes**, not per-component overrides. A class is defined once in the theme and applied by name, so changing "value" text in one place changes it on every screen (see {{lesson:persp-styles}} and the class set in {{lesson:persp-hphmi}}). Perspective prefixes classes with \`psc-\` in the page, and you enter the name without the prefix in a component's style classes.

\`\`\`css
/* in the theme or advanced stylesheet; names without the psc- prefix are entered in the component */
.psc-hmi\\/value {
  font-variant-numeric: tabular-nums;
  text-align: right;
  font-weight: 600;
  font-size: var(--hmi-size-value);
  color: var(--hmi-text);
}
.psc-hmi\\/label { font-size: var(--hmi-size-label); color: var(--hmi-text-muted); }
.psc-hmi\\/units { font-size: var(--hmi-size-units); color: var(--hmi-text-muted); }
\`\`\`

- Define sizes as theme variables (\`--hmi-size-value\`) so a wall-display theme can scale every role at once.
- Put number formatting in the binding (a Format transform or \`numberFormat()\`), not in many hand-typed labels. Wrap it in a reusable embedded view with a \`tagPath\` param, so the value, unit and label are one component.
- Bind units to the tag's engineering-unit property.
- Fix the label's width and use a flex row so numbers never wobble when a digit appears.
- Keep text on a limited scale: for example five sizes (title, value, label, units, small note). Anything else is a defect.

## Rules of thumb

- One plain sans-serif family, two weights. Check the x-height, and check that 0/O and 1/l/I differ.
- Numbers: tabular figures, right-aligned (or decimal-aligned), fixed decimals, same format everywhere.
- Show decimals the instrument and the decision justify. Never raw counts.
- Every value has a unit, in a quieter style, from the tag's property.
- Value outranks label outranks unit by size and weight, not color.
- Sentence case for labels. Capitals only for short codes and status words.
- Size text from the real distance with h = d × tan(angle). Measure on the real screen.
- Plain-language labels. Tag names go in tooltips and diagnostics.

## Try it on your own screens

1. Pick one busy screen. Photograph it from the operator's chair, or stand where the operator sits. Which values can you not read at that distance?
2. Measure the real distance and the cap height of your value text with a ruler. Compute the visual angle. Compare it with your site's target, or with the 20 arcminute figure used above.
3. List every number on the screen with its decimals. Strike out each decimal that would not change an action.
4. Find a column of numbers. Are they right-aligned and tabular? If not, fix the class and check that the font has tabular figures.
5. Find five labels that use tag names or abbreviations. Rewrite them in plain language.
6. Create \`hmi/value\`, \`hmi/label\` and \`hmi/units\` classes and re-skin one view with them.
`,

  eli5: `
Think of a road sign. The sign needs big, plain letters because the driver is far away and moving. The words "STOP" or "Exit 12" are easy because the letters are simple and the spacing is even. A sign with curly letters, tiny numbers or numbers of different widths would be a hazard.

An operator screen is a road sign the operator reads again and again. If your numbers are different widths, they do not line up, and you have to hunt for the biggest one. If you show too many decimals it is like a speed sign that says "55.38291 mph". That is silly because no one drives that precisely. If you leave off the units it is like a sign that just says "80", and you do not know whether that is miles or kilometres.

And how big the letters should be depends on how far away you stand. A sign meant for a car on a highway must be bigger than a sign in your kitchen.
`,

  why: `
**Why plain fonts and tabular figures?** Operators compare numbers. Scanning a column to find the one that is out of line is a pattern-matching task, and the eye does it faster when digits line up. Misaligned digits turn comparison into reading, and reading is slow and error-prone under stress. Tabular figures and right alignment are cheap to do once in a style class, which is why experienced integrators treat them as the default.

**Why limit decimals?** Extra digits are noise. They flicker, they widen the field, and they make a stable process look unstable (a value that wiggles in the fourth decimal looks busy when nothing has changed). Rounding is only a display choice, so you lose nothing in control or alarming. The disagreement among integrators is where to draw the line. Some operators want to see more for tuning. The usual answer is a clean main view and a diagnostics or tuning popup with the extra precision.

**Why derive size from distance?** Style guides that give a point size without a distance produce screens that look fine in the lab and fail at the console or on the wall. The visual-angle formula moves the argument from taste to measurement. The target angle itself is a judgment call that depends on the task, the lighting and the operators' eyesight, which is why you test it on real operators (see {{lesson:hmi-process}}).

**Why plain-language labels?** Tag names are for maintainers, and abbreviations are for the person who invented them. In an upset, the operator reads the label as part of a diagnosis. A label that forces translation costs seconds and invites errors. The opposing view is that operators know the tag names and want them. If your operators truly do, show them as a quiet secondary line, not as the primary label.

**Why style classes?** Per-component overrides drift. After a year, no two screens use the same value size and no one knows which is right. A class set puts the decision in one place and makes theme changes (night mode, wall display) one edit.
`,

  history: `
The "tabular versus proportional figures" distinction comes from typesetting, where financial tables needed digits of equal width. Screen fonts inherited the option through OpenType, and CSS exposes it as \`font-variant-numeric\`. Visual-angle thinking comes from vision science and display ergonomics, and it is the reason signs, instrument panels and cockpit displays are specified by angular size rather than by absolute size. Early plant graphics often used fonts and sizes picked for the screen resolution of the day, which is one reason many legacy screens have tiny text.
`,

  examples: [
    {
      title: "A level readout done well",
      body: `Label "Mixer level" (left, muted, regular), value "3.5" (right-aligned, tabular, bold, largest) and unit "m" (smaller, muted, from the tag's engineering unit). All three are one embedded view with a \`tagPath\` param, so every tank on every screen is formatted the same way.`
    },
    {
      title: "Re-sizing for a 4 m wall display",
      body: `The console theme sets \`--hmi-size-value\` to 44 px. The wall theme sets it to 51 px (from the worked example, 55-inch 1080p panel) and also drops the label and units roles to the same size scale. Every view picks up the change without edits. Check on the real wall with a ruler.`
    }
  ],

  diagrams: {
    columns: `<svg viewBox="0 0 640 250" role="img" aria-label="Left: proportional, left-aligned numbers with no units that do not line up. Right: tabular, right-aligned numbers with a unit column and labels.">
  <text class="dg-title" x="20" y="26">Hard to scan</text>
  <text class="dg-title" x="340" y="26">Easy to scan</text>
  <rect class="dg-box" x="20" y="40" width="280" height="190" rx="6"/>
  <text class="dg-text" x="36" y="72">LT101_PV 3.4712</text>
  <text class="dg-text" x="36" y="104">TT101 18.2</text>
  <text class="dg-text" x="36" y="136">FT101.PV 112.375</text>
  <text class="dg-text" x="36" y="168">M101 SPD FB 1450</text>
  <text class="dg-text-muted" x="36" y="206">no units, ragged, raw names</text>
  <rect class="dg-box-accent" x="340" y="40" width="280" height="190" rx="6"/>
  <text class="dg-text" x="356" y="72">Mixer level</text>
  <text class="dg-text-mono" x="500" y="72" text-anchor="end">3.5</text>
  <text class="dg-text-muted" x="508" y="72">m</text>
  <text class="dg-text" x="356" y="104">Temperature</text>
  <text class="dg-text-mono" x="500" y="104" text-anchor="end">18.2</text>
  <text class="dg-text-muted" x="508" y="104">°C</text>
  <text class="dg-text" x="356" y="136">Feed flow</text>
  <text class="dg-text-mono" x="500" y="136" text-anchor="end">112</text>
  <text class="dg-text-muted" x="508" y="136">L/min</text>
  <text class="dg-text" x="356" y="168">Mixer speed</text>
  <text class="dg-text-mono" x="500" y="168" text-anchor="end">1,450</text>
  <text class="dg-text-muted" x="508" y="168">rpm</text>
  <text class="dg-text-muted" x="356" y="206">aligned, fixed decimals, units</text>
</svg>`,
    angle: `<svg viewBox="0 0 640 240" role="img" aria-label="Visual angle geometry: an eye at distance d from a letter of height h; the angle at the eye equals two times arctan of h over two d.">
  <defs><marker id="hmi-type-numbers-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0 0 L8 4 L0 8 z"/></marker></defs>
  <circle class="dg-box-accent" cx="70" cy="120" r="14"/>
  <text class="dg-text" x="40" y="160">Eye</text>
  <line class="dg-line" x1="84" y1="120" x2="520" y2="70"/>
  <line class="dg-line" x1="84" y1="120" x2="520" y2="170"/>
  <line class="dg-line-accent" x1="520" y1="70" x2="520" y2="170"/>
  <text class="dg-title" x="534" y="126">H</text>
  <text class="dg-text-muted" x="534" y="146">letter height h</text>
  <line class="dg-line-thin dg-dash" x1="84" y1="214" x2="520" y2="214" marker-end="url(#hmi-type-numbers-ah)"/>
  <text class="dg-text" x="260" y="206">distance d</text>
  <text class="dg-text" x="110" y="124">angle</text>
  <text class="dg-text-mono" x="20" y="40">angle = 2 x arctan(h / 2d)    h = d x tan(angle)</text>
  <text class="dg-text-muted" x="20" y="64">20 arcmin at 1.5 m: h = 8.7 mm. At 4 m: h = 23.3 mm.</text>
</svg>`
  },

  pitfalls: [
    "Designing at a desk and deploying to a console or wall without recomputing sizes for the real distance.",
    "Using a font that is not installed on the operator clients, so the browser substitutes one and the alignment breaks.",
    "Showing unrounded floats or raw counts on the main view, which flicker and imply false precision.",
    "Mixing units for the same measurement on different screens.",
    "Putting units in the label text by hand, so a unit change means editing dozens of labels.",
    "Using ALL-CAPS for long labels and tag names as primary labels.",
    "Hard-coding fonts and sizes per component instead of using theme variables and style classes."
  ],

  keyTerms: ["x-height", "tabular-figures", "visual-angle", "style-class", "hp-hmi", "isa-5-1"],

  quiz: [
    {
      q: "A column of flow readings shows 9.8, 112.4 and 1,450.0 in a proportional font, left-aligned. Operators keep misjudging which is largest. What is the best fix?",
      options: ["Make the numbers bold","Color the largest value red","Use tabular figures and right-align (or decimal-align) the values","Switch to ALL-CAPS labels"],
      answer: 2,
      explain: [
        "Bold makes the digits heavier but does not fix the ragged columns that hide magnitude.",
        "Red is reserved for alarms, and coloring a value because it is large invents a false abnormal signal.",
        "Correct. Same-width digits and right alignment make units, tens and hundreds line up, so magnitude is visible at a glance.",
        "Label capitalization has nothing to do with how the numbers align."
      ]
    },
    {
      q: "Using a 20 arcminute design target (0.00582 rad), roughly how tall must capital letters be for an operator 1.5 m from the screen?",
      options: ["About 8.7 mm","About 1.5 mm","About 4 mm","About 23 mm"],
      answer: 0,
      explain: [
        "Correct. h = 1500 mm x 0.00582 = 8.7 mm.",
        "That would subtend a tiny angle at 1.5 m. It is closer to what suits very close reading.",
        "That is the figure for 0.7 m, a normal desktop distance.",
        "That is the figure for 4 m. At 1.5 m it would be needlessly big."
      ]
    },
    {
      q: "The console screens look fine, but the same view on a 4 m wall display is unreadable. What does the visual-angle math tell you?",
      options: ["Increase the brightness of the wall display","Use a smaller font because the wall is bigger","Add more decimals so values look precise","Scale text for the longer distance (about 2.7 times the height of the 1.5 m case) and show fewer, larger values"],
      answer: 3,
      explain: [
        "Brightness does not change the angular size of the letters.",
        "A larger physical screen does not help if the letters stay the same angular size or smaller.",
        "More decimals make numbers wider and harder to read at a distance, and they add false precision.",
        "Correct. Required height scales with distance (4 / 1.5), so the wall view needs larger text and therefore fewer items."
      ]
    },
    {
      q: "LT101 spans 0–5.0 m and the loop is good to about 0.1 m. Which display is the best choice for the main view?",
      options: ["3.4712","3.5","3.47","6,482 (raw counts)"],
      answer: 1,
      explain: [
        "Four decimals imply micron-level knowledge, and the last digits will flicker.",
        "Correct. One decimal matches the accuracy. The alarm logic still uses the unrounded value.",
        "Two decimals still claim more precision than the loop provides.",
        "Raw counts mean nothing to an operator and belong on a diagnostics page."
      ]
    },
    {
      q: "An integrator hard-codes font-size and font-weight on each Label across 40 views. A client asks for larger text on the wall display. What should have been done?",
      options: ["Nothing, edit each label","Use the browser's zoom on the wall display only","Define text roles as style classes using theme size variables, so a wall theme changes all of them at once","Put all labels in a single huge view"],
      answer: 2,
      explain: [
        "That is the failure mode: 40 views of edits, and some will be missed.",
        "Browser zoom scales everything, including layout, and can break fitted views. It is a workaround, not a design.",
        "Correct. Classes plus variables turn a screen-wide change into one theme edit.",
        "One huge view makes performance and maintenance worse and does not solve the sizing."
      ]
    },
    {
      q: "A label reads \`Area10_Mix_LT101_PV\`. The operator calls it 'mixer level'. What is the best practice?",
      options: ["Show 'Mixer level' as the label and keep the tag name in a tooltip or diagnostics view","Keep the tag name because it is exact","Abbreviate it to 'LVL'","Use all capitals so it stands out"],
      answer: 0,
      explain: [
        "Correct. Plain language for the operator, and the tag path is still available to maintainers one hover away.",
        "Exact names serve maintainers, not the operator's diagnosis.",
        "Abbreviations save little space and add translation effort.",
        "Capitals reduce readability and do not fix the vocabulary problem."
      ]
    }
  ],

  resources: [
    { title: "Legibility articles (NN/g), including typography for glanceable reading", url: "https://www.nngroup.com/topic/legibility/", type: "article", source: "Nielsen Norman Group" },
    { title: "font-variant-numeric (MDN)", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-numeric", type: "docs", source: "MDN Web Docs" },
    { title: "CSS Fonts Module Level 4", url: "https://www.w3.org/TR/css-fonts-4/", type: "standard", source: "W3C" },
    { title: "Understanding SC 1.4.3: Contrast (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html", type: "standard", source: "W3C WAI" },
    { title: "Style Classes (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/styles/style-classes", type: "docs", source: "Inductive Automation" },
    { title: "High Performance Graphics to Maximize Operator Effectiveness", url: "https://www.isa.org/getmedia/06130a38-f7af-4b35-8c9c-2c34f25c1977/The-High-Performance-HMI-Overview-v2-01.pdf", type: "article", source: "ISA" }
  ]
});
