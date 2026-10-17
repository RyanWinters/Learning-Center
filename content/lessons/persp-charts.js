LC.lesson({
  id: "persp-charts",
  title: "Charts and trends",
  track: "persp",
  minutes: 25,
  level: 2,
  prereqs: ["persp-bindings", "ign-historian"],
  tags: ["perspective", "charts", "trends", "historian", "aggregation", "performance", "hp-hmi"],
  summary: "Pick the right chart component, query history with the right aggregate and row count, and design a trend an operator can read at 3 a.m.",
  objectives: [
    "Choose among the Power Chart, Time Series Chart and XY Chart for a given job",
    "Configure a tag history binding with a query mode, aggregate and return size",
    "Explain what return size does and why asking for raw data over a long range hurts",
    "Call the historian from a script and shape the result for a chart",
    "Apply high-performance HMI rules to trend design"
  ],

  body: `
## Three chart components, three jobs

Perspective ships several chart components. For process data you will use three.

| Component | Best for | Who configures it | Data source |
|---|---|---|---|
| {{term:power-chart|Power Chart}} | Ad-hoc trending by an operator or engineer | The user at runtime, with some design-time defaults | Tag historian, picked from a tag browser |
| {{term:time-series-chart|Time Series Chart}} | A fixed trend on a screen: the three pens that matter for this unit | You, at design time | Bindings, usually a tag history binding |
| {{term:xy-chart|XY Chart}} | One variable against another (pump curve, temperature vs pressure) | You | Bindings; each axis is a data column, not time |

The **Power Chart** is the "give me a trend of whatever I want" tool. At runtime the user opens a tag browser, picks the database and the tag provider, and adds tags. Each becomes a **pen**. They can change the time range and pen scale, save and reload setups, and zoom. You can also build the pen list in script, which is handy when the tag set depends on the asset. It reads from the historian, so a tag only shows up if history is enabled on it. It does not trend string tags, so an operator will not find a state-name tag next to the analog ones.

The **Time Series Chart** is the one you design. You decide which pens, which colors, which axes and what the time window is. Because it is binding driven, you control exactly what query it sends. Pick it for the trend that lives on a unit overview or inside a faceplate.

The **XY Chart** plots value against value. Its data typically comes from a query that returns two columns, such as flow and head. Time is only a label for each point.

## Where the data comes from

Chart data arrives in three ways.

1. **Tag history binding.** A property binding of type *Tag History* where you list tags, a time range and an aggregation. This is the normal route for a Time Series Chart. The binding can return the data in different layouts: **wide** (one row per timestamp, one column per tag), **tall** (one row per tag per timestamp) or a **calculations** layout (one row per tag with the aggregate over the whole range).
2. **Script.** A script transform or an event script calls the historian and writes the result to a property. In 8.3 the newer \`system.historian\` functions such as \`queryAggregatedPoints\` and \`queryRawPoints\` sit beside the older \`system.tag.queryTagHistory\`. Both read the same stored data.
3. **Database query.** A named query that reads a table you maintain, for batch or lab data. See {{lesson:persp-bindings}}.

## The three knobs: range, aggregate, return size

Every historian query is the same three questions.

**Range.** Start and end, absolute or relative. Be careful if the end is "now". Intervals can include the end instant, so the last window may reach into the future and be filled with an interpolated value. That draws a cliff on the right edge of the trend. Pin the end to a value you control, or follow the manual's guidance for the binding's range setting.

**Aggregate (how to reduce).** The historian can return stored points as they were, or reduce each time slice to one value.

| Aggregate | Gives you | Use for |
|---|---|---|
| Average (time-weighted) | The mean across the slice, weighted by how long each value held | Default for analog trends |
| MinMax | Two entries per slice: the minimum and the maximum | Peaks and troughs when zoomed out |
| LastValue | The final value in the slice | Status, state and setpoints |
| Minimum / Maximum | Extreme of the slice | Limit checks |
| Sum | Total of values in the slice | Flow increments, counts |
| Count and duration modes | How many values, or how long in a state | Run-time and cycle analysis |

**Return size.** How many rows come back. The binding offers query modes. A *point count* mode splits the range into N slices. A *periodic* mode returns one row per fixed interval. An *as stored* mode returns the raw values, without reduction. The scripting API has the same idea: a return size of a positive number means "give me about this many rows", while zero lets the historian pick based on the logging rate, and -1 means raw values as they changed. If you pass an explicit return size, interval arguments are ignored.

{{diagram:funnel}}

## Why return size matters more than anything else

A chart has maybe 1,000 horizontal pixels. Sending 100,000 points to draw 1,000 pixels wastes disk reads, Gateway memory, network and browser time. The usual cause of a slow trend is not the chart. It is a query that returns every stored value for a month.

> [!example] Sizing a query
> A temperature is logged on change with a 0.1 degree deadband and changes about 1 time per second. A 7-day trend as raw data returns about 604,800 rows per pen. With five pens that is about 3 million rows sent to render a line 800 pixels wide. Change to a point-count of 800 using MinMax, and each pen returns about 1,600 rows (two per slice). Five pens now return about 8,000 rows in total, roughly 400 times fewer, and the peaks still show.

Rules of thumb:

- Match return size to chart width, not to history length.
- Use **MinMax** when spikes matter, so averaging doesn't hide them.
- Use **LastValue** for discrete signals. Average of a run/stop bit is a meaningless 0.37.
- Re-query on zoom. A user who zooms in on an hour should trigger a new query for that hour at higher resolution.
- If you only want a single number over a range (average temperature of the batch), use a calculations layout or an aggregate query that collapses the range to one value rather than fetching a series and averaging in a script.

> [!warning] Missing points are often a history problem
> If a trend shows gaps or straight lines where the process moved, look at the tag's history settings first. The sample mode, the deadband and the minimum or maximum time between samples decide what was stored. A chart can only draw what the historian kept. See {{lesson:ign-historian}}.

## Calling the historian from a script

For custom shaping, call the historian and convert the result to a dataset.

\`\`\`python
# Last 8 hours, 480 buckets (one per minute), time-weighted average
end = system.date.now()
start = system.date.addHours(end, -8)
paths = ["[default]Plant1/Boiler1/DrumLevel", "[default]Plant1/Boiler1/DrumPressure"]

ds = system.tag.queryTagHistory(
    paths=paths,
    startDate=start,
    endDate=end,
    returnSize=480,
    aggregationMode="Average",
    returnFormat="Wide")
\`\`\`

The result has a \`t_stamp\` column and one column per path. If you bind this to a chart, you rarely need the script at all: the tag history binding does the same query with no code and lets the chart refresh as the window moves. Reach for a script when you must merge in another source, rename columns for display, or downsample in a custom way.

> [!note] In 8.1
> \`system.tag.queryTagHistory\` is the main call in 8.1. The \`system.historian\` namespace is the 8.3 family. Check the manual's note on which parameters moved before porting scripts.

## Refresh and many users

Every session that shows a live trend with a moving window sends queries as time passes. One hundred operators on the same trend means one hundred queries every refresh. Use a sensible refresh (30 seconds, not 1), avoid recomputing the entire window when you could append, and keep trend popups to the pens that matter. The next lessons dig into session cost: {{lesson:persp-performance}}.

## Designing the trend itself

A trend is for judging, not for decoration. Apply the same HP-HMI discipline you use for the rest of the screen ({{lesson:persp-hphmi}}).

- **Few pens.** Three to five. More than that and no one can tell which line is which.
- **Quiet colors.** Muted background, gray grid, distinct hues for pens. Reserve red for alarm state, not for a pen.
- **Show the context.** Draw the setpoint as a dashed line and the alarm limits as thin horizontal bands, so the operator can see the margin, not just the value.
- **Consistent scale.** Put pens with the same units on a shared axis. Add separate axes only for different units. Do not let each pen auto-scale independently, because a flat signal then looks wildly noisy.
- **Sensible window.** Default to a window that matches the process time constant: 15 minutes for a flow loop, 8 hours for a tank, 7 days for a utility load.
- **Labels the operator knows.** Use equipment names from the P&ID, with units, not the tag's folder path.
`,

  eli5: `
Imagine you kept a diary of the temperature every second for a year. Now a friend asks, "What was it like last week?"

You could read them all 604,800 notes of the week, one at a time. That is slow, and your friend only has a small sheet of paper that fits about 800 dots.

A smarter way is to split the week into 800 equal chunks and for each chunk write down only the highest and lowest temperature. Now your friend can see every hot spike and cold dip, and the sheet fills quickly.

The chart is the sheet of paper. The "return size" is how many chunks you make. The "aggregate" is the rule for each chunk: average, highest and lowest, or the last thing you wrote. If you wrote down the average of "the heater was on" and "the heater was off," you would get a number that does not mean anything. For on/off things you note the last state.
`,

  why: `
**Why does return size matter more than the chart?** The chart can only draw as many points as it has pixels. Everything above that is cost with no value, paid in historian reads, Gateway memory, network and browser rendering, and paid again by every session that refreshes. The most common "Perspective is slow" ticket is a trend that asks for raw data over a long window.

**Why MinMax and not Average for overview trends?** Average smooths away exactly what the operator is looking for: the spike that tripped the interlock. Time-weighted average is the right default for a smooth analog signal in a short window. When you zoom out, switch to MinMax so extremes survive. Experienced integrators disagree on whether to show a band (min to max) or both lines. Bands read better but need custom styling, so many teams settle for two thin lines.

**Why a Power Chart and a Time Series Chart?** They solve different problems. A Power Chart gives freedom, which also gives an engineer the freedom to query every tag for a year. A Time Series Chart is a controlled view. Many sites put a Power Chart behind a "Trends" page for engineers and use fixed Time Series Charts on operator screens, where the query is predictable.

**Why design trends by HP-HMI rules?** Because color-heavy, ten-pen trends train operators to ignore them. A trend with a setpoint, limits and three pens answers the question "is this drifting and how fast" without study.
`,

  history: `
Trending is older than SCADA. Strip-chart recorders drew pen lines on paper, and operators learned to read slope, noise and setpoint distance on them. Digital historians kept the habit, which is why the pen metaphor survives in the Power Chart. Compression of stored data (deadband, swinging-door style rules) came from the same need: keep the shape, drop the redundancy.
`,

  examples: [
    {
      title: "Operator trend popup for a boiler drum",
      body: `A Time Series Chart shows drum level, steam flow and feedwater flow for the last 4 hours. The binding uses a point count of 600 with MinMax for level and Average for the flows. The setpoint is a dashed line and the high and low alarm limits are thin red bands. The chart refreshes every 30 seconds. When the operator zooms to 15 minutes, a script re-issues the query for that window, still at 600 points, so detail returns without raising the row count.`
    },
    {
      title: "Why a status trend lies",
      body: `A pump run bit is trended with Average over 8 hours into 480 buckets. A pump that ran half of each minute plots as 0.5, which looks like a half-speed pump. Change the aggregate to LastValue, or use a duration aggregate to get run seconds per slice, and the chart tells the truth.`
    }
  ],

  diagrams: {
    funnel: `<svg viewBox="0 0 640 220" role="img" aria-label="Raw historian rows are reduced by an aggregate and return size to about one row per pixel before reaching the chart">
  <defs><marker id="persp-charts-ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box" x="20" y="50" width="150" height="110" rx="6"/>
  <text class="dg-title dg-mid" x="95" y="80">Historian</text>
  <text class="dg-text-sm dg-mid" x="95" y="104">604,800 stored</text>
  <text class="dg-text-sm dg-mid" x="95" y="124">rows per pen</text>
  <text class="dg-text-sm dg-mid" x="95" y="144">(7 days)</text>
  <rect class="dg-box-accent" x="235" y="60" width="170" height="90" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="88">Binding query</text>
  <text class="dg-text-sm dg-mid" x="320" y="110">range + aggregate</text>
  <text class="dg-text-sm dg-mid" x="320" y="130">+ return size 800</text>
  <rect class="dg-box" x="470" y="70" width="150" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="545" y="98">Chart</text>
  <text class="dg-text-sm dg-mid" x="545" y="120">about 800 px wide</text>
  <line class="dg-line" x1="170" y1="105" x2="233" y2="105" marker-end="url(#persp-charts-ah)"/>
  <line class="dg-line" x1="405" y1="105" x2="468" y2="105" marker-end="url(#persp-charts-ah)"/>
  <text class="dg-text-muted" x="175" y="190">Reduce on the server, not in the browser</text>
</svg>`
  },

  pitfalls: [
    "Trending raw (as stored) data over weeks. Cap rows to about the chart's pixel width.",
    "Using Average on a run/stop or state signal, which invents meaningless fractional values.",
    "Leaving the query end at 'now' so the last interval reaches into the future and draws a cliff.",
    "Adding string tags to a Power Chart and expecting them to appear.",
    "Blaming the chart for gaps that are really historian deadband or sample settings.",
    "Ten auto-scaled pens in rainbow colors. Nobody can read it."
  ],

  keyTerms: ["power-chart", "time-series-chart", "xy-chart", "tag-history-binding", "aggregation-mode", "return-size", "query-tag-history", "historian", "deadband"],

  quiz: [
    {
      q: "Engineers want to pick any tag at runtime and trend it for the last month. Which component fits?",
      options: ["XY Chart", "Power Chart", "Time Series Chart with a fixed pen list", "Table component"],
      answer: 1,
      explain: [
        "The XY Chart plots one variable against another, not tags over time.",
        "Correct. The Power Chart has a runtime tag browser and user-added pens.",
        "A fixed Time Series Chart shows only the pens you designed in.",
        "A table is not a trend."
      ]
    },
    {
      q: "A 7-day trend over five pens loads slowly. Each pen returns the raw stored rows. What is the best fix?",
      options: ["Upgrade the browser", "Use a point count near the chart width with a suitable aggregate", "Hide four of the pens", "Increase the historian deadband tomorrow"],
      answer: 1,
      explain: [
        "The cost is in rows read and sent, not the browser alone.",
        "Correct. Reduce on the server to roughly one row per pixel, using MinMax if spikes matter.",
        "Fewer pens helps, but each remaining pen still returns a huge series.",
        "A deadband change affects future storage, not how this query returns past data."
      ]
    },
    {
      q: "You trend a pump run bit over 8 hours in 480 buckets using Average. The line sits at 0.5 for hours. What does it mean and what is the fix?",
      options: ["The pump runs at half speed; no fix needed", "The pump cycled within each bucket; use LastValue or a duration aggregate", "The historian is broken", "The chart range is wrong"],
      answer: 1,
      explain: [
        "Average of a bit is the fraction of time it was 1, not a speed.",
        "Correct. Averaging a discrete signal blurs state. Use LastValue or a time-in-state aggregate.",
        "The historian is storing correctly. The aggregate is the wrong choice.",
        "The range does not change what Average does to a bit."
      ]
    },
    {
      q: "You zoom out to a month and want to be sure a 2-second pressure spike still appears. Which aggregate?",
      options: ["Average", "MinMax", "Sum", "Count"],
      answer: 1,
      explain: [
        "Average smooths the spike away across a long slice.",
        "Correct. MinMax returns the minimum and maximum of each slice, so peaks survive.",
        "Sum adds values and changes the unit of meaning.",
        "Count tells you how many samples, not their extremes."
      ]
    },
    {
      q: "A trend has a cliff at its right edge on every refresh. A likely cause is:",
      options: ["The tag has bad quality", "The query's end is 'now' and the last window includes future time that is filled by interpolation", "The pen color is wrong", "The chart is in a flex container"],
      answer: 1,
      explain: [
        "Bad quality shows differently, usually as gaps or flagged data.",
        "Correct. Inclusive intervals at 'now' can add a window with no real data, which then draws wrongly.",
        "Color has no effect on data.",
        "Layout does not change the query result."
      ]
    },
    {
      q: "Which design is closest to high-performance HMI practice for an operator trend?",
      options: ["Twelve bright pens with independent auto-scales", "Three to five pens on shared axes, setpoint as a dashed line and alarm limits as faint bands", "Black background with red pens only", "Animated pens that flash on change"],
      answer: 1,
      explain: [
        "Too many pens and independent scales make noise look like signal.",
        "Correct. Context plus restraint lets an operator judge drift quickly.",
        "Red should signal alarm state, not just identify a pen.",
        "Flashing distracts and conveys nothing new."
      ]
    }
  ],

  resources: [
    { title: "Perspective Power Chart (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/components/perspective-components/perspective-chart-palette/perspective-power-chart", type: "docs", source: "Inductive Automation" },
    { title: "Perspective Time Series Chart", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-chart-palette/perspective-time-series-chart", type: "docs", source: "Inductive Automation" },
    { title: "Tag History Bindings in Perspective", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/tag-history-bindings-in-perspective", type: "docs", source: "Inductive Automation" },
    { title: "system.tag.queryTagHistory", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-tag/system-tag-queryTagHistory", type: "docs", source: "Inductive Automation" },
    { title: "system.historian.queryAggregatedPoints (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-historian/system-historian-queryAggregatedPoints", type: "docs", source: "Inductive Automation" },
    { title: "system.historian.queryRawPoints (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-historian/system-historian-queryRawPoints", type: "docs", source: "Inductive Automation" },
    { title: "Displaying Tag History", url: "https://inductiveuniversity.com/videos/displaying-tag-history/8.3", type: "video", source: "Inductive University" },
    { title: "Time Series Chart", url: "https://inductiveuniversity.com/videos/time-series-chart/8.3", type: "video", source: "Inductive University" }
  ]
});
