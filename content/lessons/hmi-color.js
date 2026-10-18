LC.lesson({
  id: "hmi-color",
  title: "Color theory for control rooms",
  track: "hmi",
  minutes: 20,
  level: 2,
  prereqs: ["hmi-perception"],
  tags: ["hmi", "color", "contrast", "wcag", "accessibility", "themes", "perspective"],
  summary: "How color works (hue, saturation, lightness), why contrast ratios and color vision deficiency decide your palette, and how to build one palette of greys plus reserved alarm colors as Perspective theme variables.",
  objectives: [
    "Describe a color by hue, saturation and lightness and say which one carries information on a screen",
    "Calculate or read a WCAG contrast ratio and apply 4.5:1 and 3:1 to HMI text and graphics",
    "Explain color vision deficiency and why color can never be the only signal",
    "Build a palette of grey levels plus a small reserved set of alarm colors, with roles for each",
    "Choose between a light and a dark background for a given control room",
    "Handle the red/green convention conflict between process and electrical plants",
    "Implement the palette as theme variables and test it with simulators"
  ],

  body: `
## Why color needs a theory

{{lesson:persp-hphmi}} gives the rule: mostly grey, color only for the abnormal. This lesson explains why that rule works and gives you the tools to build and check a palette yourself. Three facts drive everything. Color is a limited attention budget ({{lesson:hmi-perception}}). A meaningful share of operators cannot tell some colors apart. And what looks fine on your office monitor can be unreadable under control room lighting.

## Hue, saturation, lightness

Every color has three independent properties.

| Property | What it is | What it does on a screen |
|---|---|---|
| **Hue** | The color family: red, orange, yellow, cyan | Says *which* thing: which alarm priority. Good for categories, poor for amounts |
| **Saturation** | How vivid versus grey | Vivid colors pop. Low saturation recedes. Muted equipment drawing is low saturation |
| **Lightness** (value) | How light or dark | Carries most of the *contrast*. Readability depends on lightness difference, not hue |

The key practical point: **lightness difference makes things readable, hue difference makes things distinguishable only for people with normal color vision.** Convert any screenshot to greyscale. What disappears was relying on hue alone. Stephen Few notes that hue does not represent quantity well; use position or length for how much, and hue to flag state.

### Why muted greys

If the background and equipment are low-saturation greys, a saturated alarm color is the most vivid thing on screen by a wide margin. That is the preattentive effect from {{lesson:hmi-perception}} at work. Bright saturated backgrounds, such as neon on black, make every item compete and are tiring over a long shift.

{{diagram:goodbad}}

## Luminance contrast and WCAG

**Luminance** is how much light a color gives off, weighted for how the eye responds to red, green and blue. The WCAG contrast ratio compares the relative luminance of two colors:

\`\`\`text
ratio = (L_lighter + 0.05) / (L_darker + 0.05)
\`\`\`

The ratio runs from 1:1 (identical) to 21:1 (black on white). WCAG is a web accessibility standard, not an HMI standard, but its thresholds are well researched and easy to test, so many HMI style guides borrow them.

| WCAG criterion | Threshold | HMI meaning |
|---|---|---|
| 1.4.3 Contrast (Minimum), AA | 4.5:1 for normal text; 3:1 for large text (at least 24 px, or 18.5 px bold) | Value text, labels, units, alarm text |
| 1.4.11 Non-text Contrast, AA | 3:1 for UI component boundaries and meaningful graphics | Equipment outlines, bar markers, alarm borders, icons, focus rings |

W3C explains that 4.5:1 allows for the contrast loss from moderately low vision, color deficiencies and aging. The ratios are hard thresholds, so 4.499:1 does not pass. Operators span a wide age range, and control room glare lowers effective contrast, so treat these as minimums, not targets.

### Worked example: checking the palette from the HP HMI lesson

Using the example Plant 1 palette in {{lesson:persp-hphmi}} (computed with the formula above):

| Foreground on background | Ratio | Verdict |
|---|---|---|
| Text \`#262626\` on \`#ebebeb\` | 12.7:1 | Pass, large margin |
| Muted text/equipment \`#595959\` on \`#ebebeb\` | 5.9:1 | Pass for text |
| Critical red \`#c8102e\` on \`#ebebeb\` | 4.9:1 | Passes as text or line |
| High orange \`#e07000\` on \`#ebebeb\` | 2.7:1 | **Fails 3:1** as thin line or text |
| Medium yellow \`#f2c500\` on \`#ebebeb\` | 1.4:1 | **Fails badly** as line or text |
| Low cyan \`#3aa7c4\` on \`#ebebeb\` | 2.4:1 | **Fails 3:1** as line |
| Dark text \`#262626\` on yellow \`#f2c500\` fill | 9.2:1 | Pass |
| Dark text \`#262626\` on orange \`#e07000\` fill | 4.7:1 | Pass |
| White on red \`#c8102e\` fill | 5.9:1 | Pass |

The finding: on a light background, yellow, orange and cyan **cannot be thin lines or text**, but they work as **filled shapes with dark text on top**. So an alarm indicator should be a filled badge (color fill, dark number inside), not a colored outline or colored digits. On a dark background (\`#262626\`) the opposite holds for red: \`#c8102e\` gives only 2.6:1, so the dark theme needs a lighter red (a value near \`#ff4d5e\` gives 4.7:1), while yellow gives 9.2:1 and orange 4.7:1. **A palette passes or fails per background.** Check every token against every background it appears on.

> [!tip] Check it in code
> The formula is short enough for a Jython script or the browser console. Keep a small contrast checker in your project tools and run it whenever a token changes. The W3C pages in the resources list describe the exact definition of relative luminance.

## Color vision deficiency

Color vision deficiency (CVD) is mostly inherited. Reviews put red-green deficiency at up to about 8% of men and about 0.5% of women of Northern European descent (a 2025 review in PMC; Colour Blind Awareness gives about 1 in 12 men and 1 in 200 women). Rates are lower in some other populations. The two commonest forms are **deuteranopia and deuteranomaly** (reduced green sensitivity) and **protanopia and protanomaly** (reduced red sensitivity); in both, reds, greens, oranges and browns can look alike. Tritan (blue-yellow) deficiency is rare. Control rooms are often staffed mostly by men, so assume that every site has someone affected.

A red-green status pair is the single worst choice for an HMI: it is the exact pair that the most common CVD confuses, and both are used for normal state in old screens.

### Never color alone

WCAG's "Use of Color" principle, and common sense, say color must not be the only means of conveying information. Add at least one more channel:

{{diagram:redundant}}

| Information | Color channel | Add this |
|---|---|---|
| Alarm priority | Red, orange, yellow, cyan | A priority number or letter in the badge, and a different shape (for example diamond, triangle, square) |
| Running / stopped | Avoid color | Symbol fill (solid versus outline), text "RUN"/"STOP", position |
| Out of band | Border | A glyph (!) and a label |
| Bad quality | Muted/dashed | Dashed outline and "BAD" or "?" |
| Selected or active | Accent | Thick outline or position change |

If you need color to tell two states apart, the states are not distinct enough.

## Building a palette

Build it in two layers, as in {{lesson:persp-hphmi}}: a raw palette, then semantic tokens with roles. A good palette is **small**. Count what you need.

**Greys (5 to 7 levels).** Give each a job and keep the jobs fixed.

| Role | Light theme (example) | Contrast target |
|---|---|---|
| Background | very light grey | the base |
| Panel / group fill | slightly darker | visible against background without being a border |
| Normal band, inactive fill | mid-light grey | decorative; not needed for meaning |
| Equipment lines, symbols | mid-dark grey | 3:1 or more |
| Muted text (units, labels) | dark grey | 4.5:1 or more |
| Primary text and values | near black | 7:1 or more |

**Reserved colors (4 to 5).** One per alarm priority (Critical, High, Medium, Low), matching your alarm system's priorities (see {{lesson:int-alarm-mgmt}}), plus optionally one **neutral accent** for interactive state such as selection or focus, in a hue that is not one of the alarm hues. Write one sentence of meaning for each, and ban other uses.

{{diagram:palette}}

Other palette rules:

- **Do not use alarm colors for decoration, logos or branding**, even if the customer's brand is red.
- **Use fewer hues than you think.** Four alarm hues in different lightness steps is already a lot for a person to hold in memory (see the four-chunk limit in {{lesson:hmi-perception}}).
- **Colored process lines** (steam, water, product) belong in the greys with a label or a line style, not in a rainbow. If your site must color fluids, keep them low-saturation and different in lightness as well as hue.
- If you need categorical colors for trend pens, use a tested set. ColorBrewer's qualitative schemes have a colorblind-safe filter, and it warns that most qualitative schemes rely on hue differences with only subtle lightness differences.

## Light or dark background

| Factor | Light grey background | Dark grey background |
|---|---|---|
| Bright rooms with windows | Usually better, less glare contrast | Reflections show on dark screens |
| Dim 24/7 control rooms | Large bright area can dazzle, tiring at night | Often preferred by operators at night |
| Alarm colors | Yellow, orange and cyan need fills | Red needs a lighter value; yellow and orange read well |
| Text | Dark on light | Light grey, not pure white |

Two practical points. First, avoid the extremes of pure white on pure black; off-white on dark grey and near-black on light grey are less fatiguing. Second, **do not choose in the office**. Test on the control room's monitors at the lighting levels of the shifts. Many sites offer both themes and let the operator switch, keeping the alarm colors in the same relative order and the same meaning in both.

## Conventions and culture

Color meanings are learned, and they conflict.

- **Process plants** often say green is running or open and red is stopped or closed, borrowing traffic-light logic.
- **Electrical and utility plants** often say the opposite: red means a breaker is **closed and energized** (danger), green means open. Forum and vendor sources report this as near universal for utilities and common at power plants, though neither is formally standardized by IEC or ISA and the sources are informal; check the client's own standard.
- Red means danger, stop or alarm in most Western contexts, and other cultures attach other meanings to red, white and green. If the plant is multinational, ask.

An HP HMI sidesteps much of this: it does not use red or green for plain running and stopped state at all. When a site has an electrical single-line diagram embedded in a process display, the conflict is real. Two safe approaches: use the site's established convention for the breaker symbols only, **and** label them OPEN / CLOSED in text, or draw both with a solid versus outline symbol and keep alarm colors alarm-only. Write the chosen convention in the style guide.

## Perspective implementation

Perspective themes are CSS files whose colors are defined as CSS variables. The built-in themes keep colors in a variables file, and Inductive Automation's documentation recommends putting your own variables and overrides in a custom CSS file instead of editing the built-in theme files, because edits to built-in files are replaced on startup and upgrade. In a style class, reference a variable with \`var()\`. (Check the theme documentation for your Ignition version for the exact file layout and when a restart is needed.)

\`\`\`css
/* custom light theme tokens */
:root {
  --hmi-bg:            #ebebeb;
  --hmi-text:          #262626;
  --hmi-equipment:     #595959;
  --hmi-alarm-critical: #c8102e;
  --hmi-alarm-high:    #e07000;
  --hmi-alarm-medium:  #f2c500;
  --hmi-alarm-low:     #3aa7c4;
  --hmi-on-alarm:      #262626;  /* text drawn on a filled alarm badge */
}
/* custom dark theme: only the semantic tokens change */
:root {
  --hmi-bg:            #262626;
  --hmi-text:          #d9d9d9;
  --hmi-equipment:     #a6a6a6;
  --hmi-alarm-critical: #ff4d5e;  /* lighter so it passes 4.5:1 on the dark background */
}
\`\`\`

(The two blocks are separate theme files. They are shown together to compare.) Then style classes only reference tokens:

\`\`\`text
hmi/alarm-badge-high : background-color: var(--hmi-alarm-high);
                       color: var(--hmi-on-alarm);
                       border: 2px solid var(--hmi-text);
\`\`\`

Keep alarm priority in the class **name** and shape, and let the token supply only the color. Components then never contain hex values. One edit to a token restyles the whole project, and a check against the table above takes minutes.

## Testing palettes

1. **Greyscale test.** View a screenshot in greyscale. Every distinction that matters must survive. Alarm priorities should still be separable by shape and number.
2. **CVD simulation.** The Chrome and Edge developer tools can emulate protanopia, deuteranopia, tritanopia and achromatopsia. Open the page, emulate each, and screenshot your alarm states. ColorBrewer's colorblind-safe filter helps pick trend pen colors.
3. **Contrast check.** Compute ratios for every foreground and background pair in every theme. Fix failures first for text, second for graphics.
4. **Lighting test.** Look at the actual monitor in the room at day and night.
5. **Operator naming test.** Show an operator an alarm in each state and ask them to name it without the legend.
6. **Rerun** after every token change.

## Rules of thumb

1. Readability comes from lightness difference. Hue only helps people with normal color vision.
2. Text 4.5:1 or better, meaningful graphics 3:1 or better, on every background they appear on.
3. Yellow, orange and cyan on light grey: use as fills with dark text, never as thin lines or text.
4. On a dark theme lighten red until it passes.
5. Never color alone. Add shape, text, position or fill.
6. Use at most four alarm hues plus one neutral accent. One meaning each, everywhere.
7. Avoid red/green for plain state. If a site convention demands it, add text labels.
8. Do not use alarm colors for decoration or branding.
9. Choose light or dark by testing in the room. Avoid pure white on pure black.
10. Put hex values only in theme files. Components use semantic tokens.

## Try it on your own screens

1. List every color used on one screen. Next to each, write its job. Anything with no job, or two jobs, goes.
2. Take a screenshot and make it greyscale. Can you still tell the alarm priorities apart? Can you tell running from stopped?
3. Pull the hex values of your palette. Compute the contrast ratio of each foreground-background pair, including muted text. Fix everything under 4.5:1 for text and 3:1 for graphics.
4. Run the Chrome emulation for deuteranopia and protanopia. Mark every item that becomes ambiguous.
5. If you have electrical equipment on a process screen, find out the site's breaker color convention and add OPEN / CLOSED text.
6. Replace one hard-coded hex color in a component with a theme variable via a style class.
`,

  eli5: `
Think about a classroom wall covered with posters. If every poster is bright and loud, none of them catches your eye. If the whole wall is plain beige and just one poster is bright red, you look at it right away. Color on a screen works the same way. The plain parts are for quiet things that are fine, and bright colors are saved for the things that need you to look.

Colors also have three knobs. One knob picks the color family (red, blue). One makes it bold or washed out. One makes it light or dark. The light-dark knob is the one that makes words readable: dark letters on a light page are easy, pale yellow letters on a white page are not, even though yellow is a bright color.

Some people, about one in twelve boys and men in some parts of the world, cannot tell red from green. So if a light is red for "stop" and green for "go" and nothing else is different, they are stuck. The fix is easy: also put a word or a shape on it, like a STOP sign shape.
`,

  why: `
**Why contrast numbers instead of "looks fine".** Eyes adapt, monitors vary and designers are usually in their thirties with good vision and a good display. A ratio is a measurable standard that does not depend on who is looking. WCAG's reason for 4.5:1 is to allow for moderately low vision, color deficiencies and age-related loss of contrast sensitivity. A control room has all three, plus glare. Using the ratios catches the yellow-on-grey mistake before an operator does.

**Why red and green clash with alarms.** In the old style, green means running and red means stopped, so a red icon is normal for a stopped pump. In an HP HMI red means "act now." If both meanings share one color, a stopped pump and a critical alarm look alike, and the red budget is gone. This is a main reason ISA-101-style guides move normal state into greys.

**Why not just ban color.** Colorblind-safe design is not "no color." It is "color plus another cue." Color is still the fastest preattentive signal for a viewer with normal vision, so you keep it for alarms and add shape and text for everyone else.

**Where integrators disagree.** Dark versus light theme is the loudest argument. Some operators love dark themes at night, some find them harder to read; neither side has a universal winner, so test locally. Another is how strictly to apply WCAG. It was written for web content, and an alarm badge that is intentionally a vivid color may not hit 3:1 against its background if the badge has a high-contrast outline and a number inside. The honest approach is to meet the ratios for anything the operator must read, and document the exceptions. A third is the red/green electrical convention, where the answer is the client's own standard plus text labels.
`,

  history: `
The WCAG contrast thresholds come from the W3C Web Accessibility Initiative guidelines. The 4.5:1 and 3:1 text thresholds appeared in WCAG 2.0 and the 3:1 non-text criterion was added in WCAG 2.1. ISA-101 does not publish a mandatory palette, so each site's style guide owns the actual values.
`,

  examples: [
    {
      title: "Fixing a yellow alarm that nobody could read",
      body: `Area10 had a Medium priority alarm drawn as yellow text on a light grey panel. Contrast was 1.4:1 and operators complained the text was invisible in the afternoon sun. The fix kept yellow as the alarm hue but moved it to a filled diamond with a dark "3" inside (dark text on yellow is 9.2:1). The diamond shape distinguishes it from the High alarm's triangle, so the priority is clear in greyscale as well.`
    },
    {
      title: "Dark theme red",
      body: `The night theme reused the day theme's Critical red (#c8102e) on a dark grey background (#262626). Contrast was 2.6:1, so Critical looked dimmer than Medium yellow, which is backwards. The dark theme overrides only the Critical token to a lighter red near #ff4d5e (4.7:1). The shape, number and meaning stay the same.`
    }
  ],

  diagrams: {
    redundant: `<svg viewBox="0 0 640 210" role="img" aria-label="Four alarm priority badges that differ by shape and number as well as color: Critical filled octagon with 1, High triangle with 2, Medium diamond with 3, Low circle with 4">
  <text class="dg-title" x="20" y="26">Alarm priority: color plus shape plus number</text>
  <polygon class="dg-fill-alarm" points="60,60 80,60 94,74 94,94 80,108 60,108 46,94 46,74"/>
  <text class="dg-text dg-mid" x="70" y="91">1</text>
  <text class="dg-text dg-mid" x="70" y="132">Critical</text>
  <text class="dg-text-sm dg-mid" x="70" y="150">octagon, red</text>
  <polygon class="dg-fill-warn" points="190,58 218,108 162,108"/>
  <text class="dg-text dg-mid" x="190" y="100">2</text>
  <text class="dg-text dg-mid" x="190" y="132">High</text>
  <text class="dg-text-sm dg-mid" x="190" y="150">triangle, orange</text>
  <polygon class="dg-fill-accent" points="310,58 336,84 310,110 284,84"/>
  <text class="dg-text dg-mid" x="310" y="89">3</text>
  <text class="dg-text dg-mid" x="310" y="132">Medium</text>
  <text class="dg-text-sm dg-mid" x="310" y="150">diamond, yellow</text>
  <circle class="dg-fill-ok" cx="430" cy="84" r="26"/>
  <text class="dg-text dg-mid" x="430" y="89">4</text>
  <text class="dg-text dg-mid" x="430" y="132">Low</text>
  <text class="dg-text-sm dg-mid" x="430" y="150">circle, cyan</text>
  <rect class="dg-box" x="500" y="52" width="120" height="110" rx="6"/>
  <text class="dg-text-sm" x="510" y="76">Greyscale test:</text>
  <text class="dg-text-sm" x="510" y="96">shape and number</text>
  <text class="dg-text-sm" x="510" y="116">still say which</text>
  <text class="dg-text-sm" x="510" y="136">priority it is</text>
  <text class="dg-text-sm" x="20" y="190">Schematic. Fill shades here are the diagram theme, not the plant palette.</text>
</svg>`,
    palette: `<svg viewBox="0 0 640 300" role="img" aria-label="Palette diagram: a ladder of grey levels with roles and contrast ratios, then four reserved alarm colors drawn as filled badges with dark text, and the rule that alarm colors are used only for abnormal">
  <text class="dg-title" x="20" y="26">Layer 1: greys with fixed jobs</text>
  <rect class="dg-box" x="20" y="40" width="120" height="56" rx="4"/>
  <text class="dg-text-sm" x="30" y="62">Background</text>
  <text class="dg-text-sm" x="30" y="80">the base</text>
  <rect class="dg-box-2" x="146" y="40" width="120" height="56" rx="4"/>
  <text class="dg-text-sm" x="156" y="62">Panel fill</text>
  <text class="dg-text-sm" x="156" y="80">groups</text>
  <rect class="dg-box-2" x="272" y="40" width="120" height="56" rx="4"/>
  <text class="dg-text-sm" x="282" y="62">Normal band</text>
  <text class="dg-text-sm" x="282" y="80">decorative</text>
  <rect class="dg-fill-line" x="398" y="40" width="108" height="56" rx="4"/>
  <text class="dg-text-sm" x="408" y="62">Equipment</text>
  <text class="dg-text-sm" x="408" y="80">3:1 or more</text>
  <rect class="dg-fill-fg" x="512" y="40" width="108" height="56" rx="4"/>
  <text class="dg-text-sm" x="522" y="62">Text, values</text>
  <text class="dg-text-sm" x="522" y="80">7:1 or more</text>
  <text class="dg-title" x="20" y="132">Layer 2: reserved, used only when abnormal (schematic shades)</text>
  <rect class="dg-fill-alarm" x="20" y="146" width="136" height="56" rx="4"/>
  <text class="dg-text-sm" x="30" y="168">1 Critical</text>
  <text class="dg-text-sm" x="30" y="186">white text, 5.9:1</text>
  <rect class="dg-fill-warn" x="170" y="146" width="136" height="56" rx="4"/>
  <text class="dg-text-sm" x="180" y="168">2 High</text>
  <text class="dg-text-sm" x="180" y="186">dark text, 4.7:1</text>
  <rect class="dg-fill-accent" x="320" y="146" width="136" height="56" rx="4"/>
  <text class="dg-text-sm" x="330" y="168">3 Medium</text>
  <text class="dg-text-sm" x="330" y="186">dark text, 9.2:1</text>
  <rect class="dg-fill-ok" x="470" y="146" width="150" height="56" rx="4"/>
  <text class="dg-text-sm" x="480" y="168">4 Low</text>
  <text class="dg-text-sm" x="480" y="186">dark text, 5.4:1</text>
  <rect class="dg-box-accent" x="20" y="222" width="600" height="64" rx="6"/>
  <text class="dg-text" x="34" y="248">Rule: the alarm hues have one meaning each and are never used</text>
  <text class="dg-text" x="34" y="270">for decoration. Check every pair against every background.</text>
</svg>`,
    goodbad: `<svg viewBox="0 0 640 290" role="img" aria-label="Left, a bad screen where every piece of equipment is colored and a critical alarm is lost. Right, a good screen in greys where one alarm badge with a number stands out and equipment state is shown by fill and text">
  <text class="dg-title" x="20" y="24">Bad: color everywhere</text>
  <rect class="dg-box" x="20" y="36" width="290" height="236" rx="6"/>
  <rect class="dg-box-ok" x="34" y="52" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="42" y="76">P101</text>
  <rect class="dg-box-alarm" x="124" y="52" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="132" y="76">P102</text>
  <rect class="dg-box-accent" x="214" y="52" width="82" height="40" rx="4"/>
  <text class="dg-text-sm" x="222" y="76">FV101</text>
  <rect class="dg-box-ok" x="34" y="104" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="42" y="128">M101</text>
  <rect class="dg-box-warn" x="124" y="104" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="132" y="128">M102</text>
  <rect class="dg-box-alarm" x="214" y="104" width="82" height="40" rx="4"/>
  <text class="dg-text-sm" x="222" y="128">LT101</text>
  <text class="dg-text-sm" x="34" y="176">Red = stopped P102 or alarm LT101?</text>
  <text class="dg-text-sm" x="34" y="196">Green = running. Blue = valve.</text>
  <text class="dg-text-sm" x="34" y="216">Alarm hue spent on normal state.</text>
  <text class="dg-text-sm" x="34" y="248">Indistinguishable in greyscale.</text>
  <text class="dg-title" x="334" y="24">Good: grey plus one cue</text>
  <rect class="dg-box" x="334" y="36" width="286" height="236" rx="6"/>
  <rect class="dg-box-2" x="348" y="52" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="356" y="76">P101 RUN</text>
  <rect class="dg-box" x="438" y="52" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="446" y="76">P102 STOP</text>
  <rect class="dg-box-2" x="528" y="52" width="82" height="40" rx="4"/>
  <text class="dg-text-sm" x="536" y="76">FV101 40%</text>
  <rect class="dg-box-2" x="348" y="104" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="356" y="128">M101 RUN</text>
  <rect class="dg-box" x="438" y="104" width="78" height="40" rx="4"/>
  <text class="dg-text-sm" x="446" y="128">M102 STOP</text>
  <rect class="dg-box-alarm" x="528" y="104" width="82" height="40" rx="4"/>
  <polygon class="dg-fill-alarm" points="548,112 560,112 568,120 568,132 560,140 548,140 540,132 540,120"/>
  <text class="dg-text-sm" x="574" y="128">LT101</text>
  <text class="dg-text-sm" x="348" y="176">Running = filled box, stopped = outline,</text>
  <text class="dg-text-sm" x="348" y="196">and the word. No hue for normal state.</text>
  <text class="dg-text-sm" x="348" y="216">One alarm badge with octagon and number.</text>
  <text class="dg-text-sm" x="348" y="248">Still readable in greyscale.</text>
</svg>`
  },

  pitfalls: [
    "Using yellow, orange or cyan as thin lines or text on a light grey background, where contrast is far below 3:1.",
    "Reusing the light theme's red on a dark background without checking, so Critical looks dimmer than Medium.",
    "Showing running as green and stopped as red, which collides with alarm red and with the commonest color vision deficiency.",
    "Using color as the only difference between alarm priorities or between normal and abnormal.",
    "Using the customer's brand color (often red or orange) anywhere it could be read as an alarm.",
    "Hard-coding hex values in components instead of theme variables, so palette fixes take weeks.",
    "Choosing the theme in the office instead of testing at the control room's lighting.",
    "Assuming your own vision is representative. Never skip the simulator and greyscale checks."
  ],

  keyTerms: ["contrast-ratio", "wcag", "color-vision-deficiency", "redundant-coding", "luminance", "persp-theme", "style-class", "hp-hmi"],

  quiz: [
    {
      "q": "The High priority alarm is drawn as an orange (#e07000) outline, 2 px wide, on a #ebebeb panel. The contrast is 2.7:1. What is the best fix?",
      "options": [
        "Make the line 4 px wide in the same orange",
        "Leave it, because the hue is vivid",
        "Switch the orange for pure yellow",
        "Use a filled orange badge with dark text and a shape cue, and keep the outline dark grey"
      ],
      "answer": 3,
      "explain": [
        "Width helps visibility, but the contrast ratio is unchanged, and thick outlines add clutter.",
        "Vivid hue does not give readable lightness contrast, and a user with CVD may not see the hue at all.",
        "Yellow on this grey is about 1.4:1, which is worse.",
        "Correct. Dark text on orange is 4.7:1, and a filled shape with a number does not depend on thin-line contrast. The shape and number also work in greyscale."
      ]
    },
    {
      "q": "A client's old screens show green for running and red for stopped. You are doing an ISA-101 style redesign. What is the best approach for pump state?",
      "options": [
        "Show run versus stop with fill, label text and position, and keep red for alarms only",
        "Keep green and red, since operators know them",
        "Use blue for running and yellow for stopped",
        "Hide the state unless it is abnormal"
      ],
      "answer": 0,
      "explain": [
        "Correct. Redundant, non-hue cues carry normal state, and the alarm hues stay reserved.",
        "That uses alarm red for a normal state, collides with the common red-green deficiency and spends the color budget.",
        "Yellow is an alarm hue in the reserved set and blue would still be color-only.",
        "Operators need to see whether a pump is running at all times, so hiding the state removes information."
      ]
    },
    {
      "q": "About how common is red-green color vision deficiency, and what does that imply for a 12-person control room team that is mostly men?",
      "options": [
        "About 0.5% of men, so you can ignore it",
        "About 25% of men, so avoid all color",
        "Up to about 8% of men of Northern European descent, so assume at least one team member could be affected and design for it",
        "It only affects women"
      ],
      "answer": 2,
      "explain": [
        "0.5% is the figure for women, not men.",
        "The figure is not that high, and the answer is redundant cues, not no color.",
        "Correct. Sources give up to roughly 8% of men of Northern European descent, so a mostly male team of 12 has a real chance of at least one affected person.",
        "It is more common in men because the genes are on the X chromosome."
      ]
    },
    {
      "q": "Your dark theme reuses the day theme's red, #c8102e, on a #262626 background (about 2.6:1). What should you do?",
      "options": [
        "Nothing, since red is always visible",
        "Lighten the Critical token in the dark theme until the ratio passes (for example near #ff4d5e at about 4.7:1)",
        "Make Critical blue in the dark theme",
        "Replace the alarm color with white"
      ],
      "answer": 1,
      "explain": [
        "Contrast depends on the pair, and a dark red on dark grey is weak.",
        "Correct. Override the semantic token for the theme and recheck, keeping meaning and shape the same.",
        "Changing the hue between themes breaks the rule of one meaning per color.",
        "White loses the hue, and white is commonly used for text and ordinary values."
      ]
    },
    {
      "q": "A breaker single-line on your process screen shows closed breakers in green, but the electrical engineer expects red for closed and energized. What is the sound design response?",
      "options": [
        "Find the site's or client's documented convention, apply it to the breaker symbols only, and add OPEN / CLOSED text",
        "Argue that green is correct because it is the traffic-light convention",
        "Use random colors for each breaker",
        "Remove the breaker display"
      ],
      "answer": 0,
      "explain": [
        "Correct. Follow the local standard, label the state with text so color is not the only cue, and record it in the style guide.",
        "Neither convention is a formal IEC or ISA standard according to the sources, so arguing from tradition is weak.",
        "Random colors confuse everybody.",
        "Operators need the breaker state."
      ]
    },
    {
      "q": "Which test would catch the most palette problems with the least effort?",
      "options": [
        "Ask the screen designer if it looks good",
        "Convert screenshots to greyscale, run deuteranopia and protanopia emulation, compute contrast ratios, and ask an operator to name each alarm state",
        "Compare the hex codes to a competitor's screens",
        "Check only the day theme"
      ],
      "answer": 1,
      "explain": [
        "Designers have the most trained eye and the best monitors, so this is the least representative test.",
        "Correct. Each step catches a different failure: lightness, CVD confusion, contrast and meaning.",
        "Copying hex codes does not tell you whether they pass on your backgrounds.",
        "Every theme and every background needs its own check."
      ]
    }
  ],

  resources: [
    { title: "Understanding Success Criterion 1.4.3: Contrast (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html", type: "standard", source: "W3C" },
    { title: "Understanding Success Criterion 1.4.11: Non-text Contrast", url: "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html", type: "standard", source: "W3C" },
    { title: "Web Content Accessibility Guidelines (WCAG) 2.1", url: "https://www.w3.org/TR/WCAG21/", type: "standard", source: "W3C" },
    { title: "ColorBrewer: Color Advice for Maps", url: "https://colorbrewer2.org/", type: "tool", source: "ColorBrewer" },
    { title: "Color scheme types (ColorBrewer)", url: "https://colorbrewer2.org/learnmore/schemes_full.html", type: "docs", source: "ColorBrewer" },
    { title: "Creating and Using Custom Perspective Themes (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/styles/creating-and-using-custom-perspective-themes", type: "docs", source: "Inductive Automation" },
    { title: "A Global Perspective of Color Vision Deficiency: Awareness, Diagnosis, and Lived Experiences", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12385717/", type: "article", source: "PMC" },
    { title: "Colour Blind Awareness", url: "https://www.colourblindawareness.org/", type: "article", source: "Colour Blind Awareness" },
    { title: "HMI Breaker Status Color Standards and Best Practices", url: "https://industrialmonitordirect.com/blogs/knowledgebase/hmi-breaker-status-color-standards-and-best-practices", type: "article", source: "Industrial Monitor Direct (vendor note)" }
  ]
});
