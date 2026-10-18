LC.lesson({
  id: "hmi-dataviz",
  title: "Showing data: trends, bars, gauges and deviation",
  track: "hmi",
  minutes: 20,
  level: 3,
  prereqs: ["hmi-type-numbers", "hmi-color"],
  tags: ["hmi", "data visualization", "trends", "gauges", "sparklines", "deviation", "perspective", "bullet graph"],
  summary: "Match the picture to the question the operator is asking: trend for direction and rate, a bar with a normal band for 'is it OK', digits only when the exact value matters.",
  objectives: [
    "Choose between a trend, an analog indicator and digits from the operator's question",
    "Explain why round dial gauges waste space and what to use instead",
    "Design an analog indicator with a normal band and limits for a tank level",
    "Design a trend with sensible time range, axis scaling, limits and no dual axes",
    "Use sparklines and deviation overviews to show many variables at once",
    "Pick Perspective components for each visual"
  ],

  body: `
## Pick the picture from the question

An operator looks at a value to answer a question. Different questions need different pictures.

| Operator's question | Best visual | Why |
|---|---|---|
| Is it OK right now? | Moving analog indicator (bar or pointer) with the normal range shaded | The eye sees position against the band in a glance, no reading or mental comparison |
| Where is it heading, how fast? | Trend (line over time) | Only a trend shows direction, rate and history |
| What exactly is it? | Digits | Needed when the precise value drives an action: a setpoint, a batch weight, a calculation |
| Which of these 12 things is out of line? | Deviation or overview display, or a sparkline table | Compare many variables without reading each |
| How is it split into parts? | Bar chart with a zero baseline | Length encodes quantity |

The principle behind the table comes from the same research as {{lesson:persp-hphmi}}. A bare number forces the operator to remember the limits, do the comparison and decide, for every value, all shift. A picture does the comparison for them. This lesson is about when and how.

## Digits versus an analog indicator

Use digits when the exact number matters. Pair them with a picture when the operator must judge status. The best pattern combines both: a small moving bar with the normal band shaded and limits marked, with the number beside it.

{{diagram:indicator}}

Design points for the analog indicator:

- **Show the normal range as a quiet band** (a lighter grey), not as a colored zone. Reserve color for alarms ({{lesson:hmi-color}}).
- **Mark the alarm limits** as thin ticks, taken from the alarm configuration so the screen and the alarm system cannot disagree. For LT101 (0–5.0 m) those could be LAH-101 and LAHH-101.
- **Show the setpoint** as a separate tick or caret, where there is one.
- **Pick the scale to fit the job.** Show the full instrument range (0–5.0 m) so the operator sees headroom, or zoom to the useful range if the normal band would otherwise be a sliver.
- **Add a trend cue** (an arrow, or a small sparkline beside it) when direction matters.
- **Keep the same scale and position for the same instrument everywhere**, so the operator's eye learns where "normal" is on each indicator.

### Why round dial gauges waste space

The round dial is a skeuomorphic holdover from panel instruments. Stephen Few's criticism is that circular gauges use a lot of space to say little and are poor for comparison, and that his bullet graph delivers the same information in a compact linear form (Perceptual Edge). A circle is hard to line up with its neighbors: a row of eight dials needs eight separate reading actions, while eight horizontal bars stack and compare. The needle sweeps through an arc, so equal changes cover unequal screen distance, and the round shape leaves the corners of its bounding box empty. Few has also said the concept of a gauge is not wrong. It is the usual decorative implementation, with 3D bezels and glints, that is. A flat, linear, quiet indicator is the HMI version of his bullet graph.

The bullet graph specification has a label, one linear quantitative scale, the featured measure, an optional comparative measure (such as a target) and optional qualitative ranges (such as poor, satisfactory, good). Its scale normally starts at zero, and bright colors are kept for what needs attention. It maps well onto an HMI: the featured measure is the process value, the comparative measure is the setpoint, and the qualitative range is the normal band.

## Deviation and overview displays

A unit with 30 loops cannot show 30 trends. Two techniques help the operator spot the odd one out.

- **Deviation display.** Plot each variable as distance from its target or normal, scaled so that the same visual distance means the same degree of abnormality. A column of horizontal bars all pivoting on a center line makes the one that has strayed obvious. Everything near the line means all is well, and the display is quiet during normal operation.
- **Polar ("radar") overview.** Variables are arranged around a circle, with the normal value on a ring. In a healthy plant the figure is a regular shape, and a distortion in one direction shows which area has drifted. It is good for noticing a *pattern change* across a handful of related variables and bad for reading values. Few's critique of radar graphs in general is that reading values off them is hard, so use them only as an at-a-glance health shape, never for exact values, and always provide a way to drill to the indicator or trend.

Either way, normalize each variable to its own normal range first, or the display compares unlike things.

### Sparklines

Edward Tufte describes sparklines as small, intense, word-sized graphics with typographic resolution (Beautiful Evidence). A sparkline puts a tiny trend in a table cell or beside a value, usually with no axes, showing the recent shape. Use them to give direction at no extra screen cost: a table of 12 tanks with level, a bar, and a 30-minute sparkline answers "where is it, is it OK, and where is it going" in one row. Mark the current point and, if useful, the normal band as a faint strip. Add no gridlines, no ticks and no labels inside it.

## Designing the trend

A trend is for judging, not decorating. Build on the rules in {{lesson:persp-charts}}, and add these:

### Time range

Match the window to the process dynamics. A flow loop with seconds-scale response needs minutes. A large tank needs hours. A utility load needs days. Offer a few fixed ranges (for example 15 min, 1 h, 8 h, 24 h) rather than a free-form picker on the main view. Operators also want to see enough past context to know whether the current behavior is new, so default to at least a few multiples of the process time constant.

### Y-axis scaling and baselines

- **Bars need a zero baseline, lines do not.** Few's rule is that a bar encodes value by length, so a truncated bar lies. A line encodes by position and shape, so its scale may start above zero when that makes the useful range readable.
- **Use a fixed range for process trends with a known normal band.** Auto-ranging magnifies noise: a flat signal with 0.01 m of jitter fills the whole plot and looks like a crisis. In the Perspective Time Series Chart, if an axis has no min and max the chart auto-ranges from the bound data. Set them explicitly for operator trends. Leave auto-range for exploratory analysis in the Power Chart.
- **Choose the fixed range so the normal band sits in the middle third** and the alarm limits are on the plot, so there is room to see an excursion.
- **Same units share an axis.** Use a second axis only for a different unit, and never let each pen auto-scale on its own.

### Avoid dual y-axes

Putting two scales on one plot invites the reader to compare magnitudes that mean nothing, because the crossing point of the lines depends entirely on how you picked the scales. Few concludes that it is inappropriate to put more than one quantitative scale on one axis, with line graphs the one case he is less sure about. He suggests separate graphs close together, one above the other, sharing the time axis. For process data that is easy: stacked lanes, one per measurement, with a common time axis. Level on top, valve position below.

{{diagram:trends}}

### Show the limits and the setpoint

Draw alarm limits as thin horizontal lines, from the alarm configuration. Draw the setpoint as a dashed line. Then the operator can see the margin, not just the value, and an excursion is visibly heading toward a limit. Use the same line styles everywhere. Bad-quality or gap periods should show as a break in the line, never as an interpolated line (see {{lesson:hmi-abnormal}}).

### Pen colors

Use few pens (three to five) in muted, distinguishable hues, direct-labelled at the line end rather than in a separate legend. Avoid red and the other alarm colors for pens. Make the line weight heavy enough to read, and do not use markers for every sample.

## Data-ink and dashboard thinking

Tufte's data-ink ratio is the share of a graphic's ink that represents data. His advice is to maximize it by erasing ink that carries no information (heavy gridlines, boxes around everything, 3D, gradients). It is a guide, not a law, and removing everything can hurt orientation. On an HMI, the sensible reading is: every pixel of strong contrast should mean something. Quiet gridlines, no chart borders, no drop shadows, no gradient bars.

Few's dashboard work adds a second rule: a dashboard is information on one screen, so be selective about what is shown, group related items, and make the most important items most prominent. His paper "Why Most Dashboards Fail" lists common errors, including wasting space on decoration and choosing displays poorly. Applied here: a unit overview is a dashboard, so choose the few measures that matter and let everything else be one click away.

## Doing it in Perspective

| Need | Component or technique |
|---|---|
| Trend on a unit screen | **Time Series Chart** bound to tag history, with explicit axis min and max, a shared axis for same units, and limit lines as extra series or constant pens. See the axis settings in the component reference |
| Operator-driven analysis | **Power Chart** (user picks pens and ranges) in a popup or a dedicated page |
| Correlation or scatter | **XY Chart** |
| Analog indicator with normal band | A reusable embedded view with a \`tagPath\` param. A Coordinate container holds a track, a band and a marker. Bind the marker position and the band edges as percentages from the tag value and its limit properties, with an expression such as \`min(max(({value} - {min}) / ({max} - {min}), 0), 1) * 100\` (min and max keep the marker on the track when the value goes out of range). Style classes color and shape them |
| Digits | **Label** with a \`numberFormat()\` expression and the \`hmi/value\` class ({{lesson:hmi-type-numbers}}) |
| Sparkline | A small Time Series Chart with axes, grid, legend and padding removed, or a precomputed SVG path in a view. Query once per screen, not once per cell |
| Round gauge | The built-in Gauge component exists, but use it rarely. Prefer the linear indicator |

Bind limits to the alarm configuration (the tag's alarm setpoints) so one edit moves both the alarm and its tick. Query history in a single script or binding per view and share the result, because a hundred sparklines each making a query will slow every session (see {{lesson:persp-performance}} and the return-size discussion in {{lesson:persp-charts}}). Where raw numbers need exact alignment, reuse the number formatting from {{lesson:hmi-type-numbers}}.

## Rules of thumb

- Start from the question: OK now? (indicator with band) Heading where? (trend) Exact? (digits).
- Replace dial gauges with flat linear indicators; keep them the same scale and place on every screen.
- Show normal as a quiet band, limits as ticks from the alarm config, setpoint as a marker.
- Trend: match window to the process, fixed ranges for operator trends, same-unit pens on one axis, different units in stacked lanes, no dual y-axes.
- Bars start at zero. Lines may not.
- Draw limits and setpoints on every trend.
- Sparklines for direction in tables. Deviation displays to find the odd one out among many.
- Every strong mark should carry data. Remove gradients, shadows, 3D and heavy gridlines.

## Try it on your own screens

1. Find three places where a bare number is the only indicator of status. Ask what the operator is deciding. Replace one with an indicator carrying a normal band and limit ticks.
2. Replace one round gauge with a linear indicator and compare how many fit in the same area.
3. Open your main trend. Is the y-axis auto-ranged? Fix the range, add alarm limit lines and the setpoint, and remove any second y-axis by splitting into stacked lanes.
4. Check the default time window against the process time constant. Does the operator see enough history to know whether a change is new?
5. Build a unit table with a value, a bar and a 30-minute sparkline for each of six tanks. Check the page cost (queries per refresh).
`,

  eli5: `
Imagine you are driving and glance at the dashboard. You do not read "62.4 miles per hour" and then remember the speed limit and subtract. You just see the needle sitting comfortably in the middle, or creeping toward a red mark. That is an analog indicator: one look tells you "all fine" or "getting close".

A trend is like the line a heart monitor draws. It does not tell you only how fast the heart beats now. It shows whether it is speeding up or slowing down, and that matters more than the single number.

The number itself is for when you need to write it down exactly, like the weight on a kitchen scale for a recipe.

Round dials look nice but they take a lot of room. A row of flat bars lined up like a bar chart takes less space, and you can compare them at once because they all start in the same place.
`,

  why: `
**Why not digits everywhere?** A digit tells you a value and nothing else. To know whether 3.5 m is fine, the operator must recall the normal range and the limits, then compare. Humans do that badly under load. A bar against a shaded band moves that comparison onto the screen, where the visual system does it in parallel for every indicator at once. That is the whole argument behind analog indicators in high-performance HMIs, and it is why they pair a picture with, rather than replace, the number.

**Why argue about gauges?** Round dials feel familiar, and clients often ask for them because the old panel had them. The tradeoff is real: a dial's metaphor is recognizable, but it costs space, fights alignment and needs 3D styling to look right. The compromise many teams reach is to allow a flat, simple gauge for a single hero value (a main pressure) and use linear indicators elsewhere.

**Why fixed trend ranges?** An auto-ranged trend always fills the plot, so the shape of a quiet process looks the same as an upset. A fixed range preserves meaning: a flat line stays flat, a rising line visibly approaches the limit. The cost is that a value outside the range runs off the plot, so choose a range with margin around the limits or clamp and mark the overflow.

**Why no dual axes?** The visual crossing of two lines suggests a relationship that is only an artifact of the two scales. Operators then draw conclusions from it. Stacked lanes with a shared time axis give the same comparison of timing without the false magnitude. Few concedes the line-graph case is less clear-cut, so if a site insists, label both axes in the line colors and limit it to two pens.

**Why sparklines and deviation overviews?** Screens are finite. Tufte-style word-sized graphics add trend context without taking a whole chart's area, and deviation views let one screen watch dozens of variables because each is quiet when normal. The risk is cost: a view that runs 100 history queries on every refresh is a performance problem, so design the data flow with the visual.
`,

  history: `
Edward Tufte introduced the data-ink ratio in his early work on displaying quantitative information and later described sparklines in Beautiful Evidence. Stephen Few's Perceptual Edge material applied those ideas to business dashboards and proposed the bullet graph as a replacement for dial gauges. High-performance HMI work, drawing on research by the ASM Consortium, brought the same thinking into process graphics: restrained color and analog indicators with context instead of bare numbers (ISA overview).
`,

  examples: [
    {
      title: "LT101 as a linear indicator",
      body: `A 0–5.0 m track. A light-grey band from 2.0 to 4.0 m shows normal. Ticks at 4.2 m (LAH-101) and 4.6 m (LAHH-101) come from the tag's alarm setpoints. A marker sits at 3.5 m, with "3.5 m" in tabular figures beside it. The whole thing is one embedded view reused for every tank, with one \`tagPath\` param. (Band and limit values are illustrative for this example.)`
    },
    {
      title: "Unit overview table",
      body: `Six rows for the Area10 tanks: name, value and unit, a short linear indicator, and a 30-minute sparkline. One scripted history query per refresh fills a dict of six small series, and each sparkline binds to its entry. An operator can find the tank that is high and rising in about two seconds.`
    }
  ],

  diagrams: {
    indicator: `<svg viewBox="0 0 640 250" role="img" aria-label="Left: a bare number 3.5 m with no context. Right: a horizontal bar 0 to 5.0 meters with a shaded normal band from 2 to 4 meters, alarm limit ticks at 4.2 and 4.6, and a marker at 3.5.">
  <text class="dg-title" x="20" y="26">Digits only</text>
  <text class="dg-title" x="250" y="26">Analog indicator with normal band</text>
  <rect class="dg-box" x="20" y="44" width="200" height="170" rx="6"/>
  <text class="dg-text" x="40" y="80">Mixer level</text>
  <text class="dg-title" x="40" y="140">3.5 m</text>
  <text class="dg-text-muted" x="40" y="180">Fine? High? Rising?</text>
  <text class="dg-text-muted" x="40" y="200">Operator must remember.</text>
  <rect class="dg-box-accent" x="250" y="44" width="370" height="170" rx="6"/>
  <text class="dg-text" x="270" y="76">Mixer level</text>
  <text class="dg-title" x="540" y="76" text-anchor="end">3.5</text>
  <text class="dg-text-muted" x="548" y="76">m</text>
  <rect class="dg-box" x="270" y="100" width="330" height="26" rx="3"/>
  <rect class="dg-zone" x="402" y="100" width="132" height="26"/>
  <line class="dg-line-alarm" x1="547" y1="94" x2="547" y2="132"/>
  <line class="dg-line-alarm" x1="573" y1="94" x2="573" y2="132"/>
  <polygon class="dg-fill-accent" points="501,138 493,150 509,150"/>
  <line class="dg-line-accent" x1="501" y1="100" x2="501" y2="126"/>
  <text class="dg-text-sm" x="270" y="170">0</text>
  <text class="dg-text-sm" x="590" y="170">5.0 m</text>
  <text class="dg-text-sm" x="402" y="170">normal 2.0 to 4.0</text>
  <text class="dg-text-sm" x="530" y="190">LAH 4.2</text>
  <text class="dg-text-sm" x="530" y="206">LAHH 4.6</text>
  <text class="dg-text-muted" x="270" y="206">OK, mid-band</text>
</svg>`,
    trends: `<svg viewBox="0 0 640 300" role="img" aria-label="Left: a bad trend with two y-axes, auto-ranged noise, no limits and no units. Right: a good trend with a fixed range, alarm limit lines, a dashed setpoint, and a valve position lane below sharing the time axis.">
  <text class="dg-title" x="20" y="24">Bad trend</text>
  <rect class="dg-box" x="20" y="36" width="290" height="230" rx="6"/>
  <text class="dg-text-sm" x="26" y="54">0.4</text>
  <text class="dg-text-sm" x="26" y="250">0.2</text>
  <text class="dg-text-sm" x="268" y="54">900</text>
  <text class="dg-text-sm" x="268" y="250">100</text>
  <polyline class="dg-line-accent" fill="none" points="60,160 80,70 100,200 120,90 140,220 160,80 180,190 200,100 220,210 240,90"/>
  <polyline class="dg-line-ok" fill="none" points="60,220 100,190 140,160 180,130 220,100 240,80"/>
  <text class="dg-text-sm" x="30" y="288">Auto range, two axes, no units, no limits</text>
  <text class="dg-title" x="340" y="24">Good trend</text>
  <rect class="dg-box-accent" x="340" y="36" width="280" height="150" rx="6"/>
  <line class="dg-line-alarm" x1="390" y1="62" x2="610" y2="62"/>
  <text class="dg-text-sm" x="346" y="66">4.6</text>
  <line class="dg-line-alarm dg-dash" x1="390" y1="84" x2="610" y2="84"/>
  <text class="dg-text-sm" x="346" y="88">4.2</text>
  <line class="dg-line dg-dash" x1="390" y1="124" x2="610" y2="124"/>
  <text class="dg-text-sm" x="346" y="128">3.5</text>
  <polyline class="dg-line-accent" fill="none" points="390,128 430,122 470,118 510,126 550,112 590,100 610,96"/>
  <text class="dg-text-sm" x="346" y="170">0</text>
  <text class="dg-text-sm" x="390" y="52">Mixer level (m)</text>
  <rect class="dg-box" x="340" y="196" width="280" height="70" rx="6"/>
  <polyline class="dg-line" fill="none" points="390,250 470,250 470,214 560,214 560,232 610,232"/>
  <text class="dg-text-sm" x="390" y="212">Valve FV101 (%)</text>
  <text class="dg-text-sm" x="346" y="288">Fixed 0 to 5 m, limits, setpoint, shared time axis</text>
</svg>`
  },

  pitfalls: [
    "Auto-ranged operator trends that make a quiet process look like an upset.",
    "Dual y-axes whose line crossings imply relationships that do not exist.",
    "Truncated bar charts, which exaggerate differences.",
    "Replacing every number with a picture. Keep digits for values the operator must read exactly.",
    "Hand-typing alarm limits on the graphic so it disagrees with the alarm configuration after the next change.",
    "Running one history query per sparkline per refresh and slowing every session.",
    "Using red or other alarm colors for ordinary trend pens or the normal band.",
    "A radar overview used to read exact values."
  ],

  keyTerms: ["analog-indicator", "sparkline", "data-ink", "bullet-graph", "deviation-display", "deadband", "hp-hmi"],

  quiz: [
    {
      q: "The operator's question is 'Is the mixer level okay right now?' Which visual answers it fastest?",
      options: ["A linear indicator with the normal band shaded and alarm limits as ticks","A table of the last ten samples","A bare number with a unit","A 24-hour trend"],
      answer: 0,
      explain: [
        "Correct. Position against a shaded band answers 'OK?' at a glance, and the limits show the margin.",
        "A table forces reading and mental comparison for each row.",
        "A bare number makes the operator recall the range and compare.",
        "A trend answers direction and history, not the instantaneous OK-or-not question as quickly."
      ]
    },
    {
      q: "A tank-level trend is auto-ranged. In quiet operation the line jitters over the full height of the plot. What is the best fix?",
      options: ["Add a second y-axis","Make the line thicker","Set a fixed axis range that puts the normal band mid-plot and draw the limit lines","Hide the axis labels"],
      answer: 2,
      explain: [
        "A second axis makes comparisons less meaningful and does not stop auto-ranging from magnifying noise.",
        "Thickness does not change how the scale magnifies noise.",
        "Correct. A fixed range keeps scale meaning stable so noise looks small and approach to a limit is visible.",
        "Hiding labels removes information and leaves the misleading scale."
      ]
    },
    {
      q: "You must show tank level (m) and valve position (%) on one trend. What is the best design?",
      options: ["One plot with two y-axes","Two stacked lanes sharing the time axis, each with its own scale","One plot, valve position rescaled to 0–5 to share the level axis","Two separate pages"],
      answer: 1,
      explain: [
        "Few advises against dual-scaled axes because line crossings imply meaningless relationships.",
        "Correct. Stacked lanes keep each scale honest and still let the operator compare timing.",
        "Rescaling a percentage onto meters is a false equivalence and confusing to read.",
        "Operators need to see cause and effect together, so separate pages lose that."
      ]
    },
    {
      q: "A designer proposes a row of eight round dial gauges for eight tank levels. What is the stronger alternative?",
      options: ["Eight larger dials","A single pie chart","Eight bare numbers","Eight horizontal indicators on a shared scale, stacked, each with a normal band"],
      answer: 3,
      explain: [
        "Larger dials use even more space and remain hard to compare.",
        "A pie chart shows parts of a whole, which is not the question here.",
        "Bare numbers drop the context that shows which tank is abnormal.",
        "Correct. Linear indicators align and use less area, so out-of-band items stand out."
      ]
    },
    {
      q: "An engineer puts 'LAH 4.2 m' as a typed constant on the LT101 indicator. Six months later the alarm setpoint is changed to 4.0 m. What goes wrong and what prevents it?",
      options: ["Nothing, operators know the new value","The chart stops updating","The tick is now wrong. Bind the tick to the tag's alarm setpoint so the picture and alarm cannot disagree","The alarm will not trigger"],
      answer: 2,
      explain: [
        "Operators trust the screen. A wrong tick misleads them about margin.",
        "The tick value does not stop the chart updating.",
        "Correct. Binding to the configured setpoint keeps one source of truth.",
        "The alarm uses its own configuration. Only the picture is wrong."
      ]
    },
    {
      q: "You add a sparkline to each of 40 rows on an overview page, each with its own history query on a 5-second refresh, across 20 sessions. What is the likely result?",
      options: ["Faster pages because charts are small","Heavy history query load that slows sessions. Fetch once per screen, share the data, and refresh slowly","Sparklines cannot refresh","No impact because history is cached"],
      answer: 1,
      explain: [
        "Small charts still run the same queries.",
        "Correct. 40 rows x 20 sessions every 5 seconds is a large query stream. Query once per screen, share the results and use a slower refresh.",
        "They can refresh, which is the problem.",
        "Do not assume caching saves you. Design to avoid the load."
      ]
    }
  ],

  resources: [
    { title: "Bullet Graph Design Specification", url: "https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf", type: "article", source: "Perceptual Edge (Stephen Few)" },
    { title: "Dual-Scaled Axes in Graphs: Are They Ever the Best Solution", url: "https://www.perceptualedge.com/articles/visual_business_intelligence/dual-scaled_axes.pdf", type: "article", source: "Perceptual Edge (Stephen Few)" },
    { title: "Keep Radar Graphs Below the Radar - Far Below", url: "https://www.perceptualedge.com/articles/dmreview/radar_graphs.pdf", type: "article", source: "Perceptual Edge (Stephen Few)" },
    { title: "Why Most Dashboards Fail", url: "https://www.perceptualedge.com/articles/misc/WhyMostDashboardsFail.pdf", type: "article", source: "Perceptual Edge (Stephen Few)" },
    { title: "Sparkline theory and practice", url: "https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/", type: "article", source: "Edward Tufte" },
    { title: "Perspective - Time Series Chart (Ignition 8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-chart-palette/perspective-time-series-chart", type: "docs", source: "Inductive Automation" },
    { title: "Perspective - Power Chart (Ignition 8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-chart-palette/perspective-power-chart", type: "docs", source: "Inductive Automation" }
  ]
});
