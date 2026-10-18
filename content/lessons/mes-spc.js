LC.lesson({
  id: "mes-spc",
  title: "SPC: control charts and rules",
  track: "mes",
  minutes: 25,
  level: 3,
  prereqs: ["mes-what"],
  tags: ["spc", "quality", "control-charts", "cpk", "sampling"],
  summary: "How to tell a process that is merely noisy from one that has actually changed, and how to put a number on whether it fits the spec.",
  objectives: [
    "Distinguish common cause from special cause variation",
    "Choose the right control chart for variable and attribute data",
    "Calculate control limits for an X-bar/R chart and an individuals chart",
    "Explain why control limits and spec limits are different things",
    "Apply Western Electric and Nelson run rules",
    "Calculate Cp and Cpk from a mean, a sigma and spec limits"
  ],

  body: `
## What SPC is for

{{term:spc|Statistical Process Control}} answers one question: is this process behaving the way it normally does? Every real process varies. A filler never drops exactly 500.0 g. Reacting to every wiggle makes things worse, and ignoring a real shift makes scrap. SPC gives you a method to react only when the data says something changed.

For an integrator this matters because the data collection, the charts and the alarms on rule violations are what you actually build. The statistics are small, and a handful of formulas cover most plant needs.

## Two kinds of variation

{{term:common-special-cause|Common cause}} variation is the steady background noise of a stable process: small differences in material, temperature, wear. You can only reduce it by changing the process itself. **Special cause** variation comes from something specific: a new batch of resin, a worn nozzle, a tired operator. It shows up as a point or a pattern the normal noise would rarely produce, and somebody can go and find the cause.

A {{term:control-chart|control chart}} separates the two. You plot measurements in time order, draw a center line at the average, and draw {{term:control-limits|control limits}} at about 3 standard deviations either side. Points inside the limits with no pattern are common cause, so leave the process alone. A signal means go and look.

## Control limits are not spec limits

This is the most common confusion on site.

| | Control limits (UCL, LCL) | {{term:spec-limits|Spec limits}} (USL, LSL) |
|---|---|---|
| Come from | The process's own data | The customer or the design drawing |
| Mean | What the process does | What is allowed |
| Used for | Detecting change | Judging each part good or bad |
| Can you change them? | They move when the process changes | Only by changing the requirement |

A process can be in control and still make scrap (stable but centered badly or too wide). A process can be inside spec and still out of control, which is an early warning. Never draw spec limits as if they were control limits, and never set control limits by typing in the spec.

## Variable data charts

### X-bar and R

When you take small samples, called {{term:subgroup-sampling|subgroups}}, of n measurements at each check, use an {{term:xbar-r-chart|X-bar and R chart}}. One chart plots the subgroup average, and the other plots the subgroup range (max minus min). Check the range chart first: if spread is unstable, the average chart limits are meaningless.

With subgroup size n = 5 the constants are A2 = 0.577, D3 = 0 and D4 = 2.114, and d2 = 2.326.

> [!example] Worked example: a shaft diameter
> Spec: 10.00 mm plus or minus 0.30 mm (LSL 9.70, USL 10.30). You take 5 shafts every hour and, after 25 subgroups, find:
>
> - Grand average (X-double-bar) = 10.08 mm
> - Average range (R-bar) = 0.14 mm
>
> X-bar chart: UCL = 10.08 + 0.577 x 0.14 = **10.161**, LCL = 10.08 - 0.081 = **9.999**.
> R chart: UCL = 2.114 x 0.14 = **0.296**, LCL = 0 (D3 is 0 for n = 5).
> Estimated sigma = R-bar / d2 = 0.14 / 2.326 = **0.060 mm**.

### Individuals and moving range

When there is one measurement per check (a tank temperature every shift, a batch assay), use the {{term:individuals-chart|individuals and moving range chart}}. The moving range is the absolute difference between consecutive points. Limits are the average plus or minus 2.66 times the average moving range, and the moving-range chart's upper limit is 3.267 times the average moving range. Sigma is estimated as MR-bar / 1.128. The individuals chart assumes the data are roughly normal and not strongly autocorrelated. Check a histogram or run a normality test before you trust the limits on skewed data such as a vibration or particle count.

If you have 20 readings averaging 50.0 with an average moving range of 1.5, the limits are 50.0 plus or minus 2.66 x 1.5 = 50.0 plus or minus 4.0, so **46.0 to 54.0**.

## Attribute charts

Attribute data is a count or a yes/no result rather than a measurement.

| Chart | Tracks | Limits | When |
|---|---|---|---|
| {{term:p-chart|p chart}} | Fraction defective per sample | p-bar plus or minus 3 x sqrt(p-bar(1 - p-bar) / n) | Sample size may vary |
| np chart | Number defective | n x p-bar plus or minus the same scaling | Fixed sample size |
| {{term:c-chart|c chart}} | Defects per unit | c-bar plus or minus 3 x sqrt(c-bar) | Fixed inspection area, e.g. flaws per panel |
| u chart | Defects per unit, varying area | u-bar plus or minus 3 x sqrt(u-bar / n) | Variable inspection area |

Worked numbers. A line inspects 200 units per hour and the long-run fraction defective is 0.04. Sigma of p = sqrt(0.04 x 0.96 / 200) = 0.0139. UCL = 0.04 + 3 x 0.0139 = **0.0817** (8.2 percent). The lower limit works out to -0.0016, so it is set to **0**. For a c chart with c-bar = 4 flaws per panel, UCL = 4 + 3 x 2 = **10** and LCL = 0.

When counts are low, variable data charts give more information for the same sample effort. Prefer measuring to counting when you can.

## Run rules

A point outside the 3-sigma limit is only one way to detect change. The chart is divided into zones: Zone C is within 1 sigma of the center, B is 1 to 2 sigma, A is 2 to 3 sigma. Run rules look for patterns that are unlikely by chance.

The {{term:western-electric-rules|Western Electric rules}}:

1. One point beyond 3 sigma.
2. Two of three consecutive points beyond 2 sigma on the same side.
3. Four of five consecutive points beyond 1 sigma on the same side.
4. Eight consecutive points on the same side of the center line.

The {{term:nelson-rules|Nelson rules}} are a similar eight-rule set. They include one point beyond 3 sigma, nine in a row on one side, six in a row steadily rising or falling, fourteen alternating up and down, two of three beyond 2 sigma, four of five beyond 1 sigma, fifteen in a row within 1 sigma (too little variation, often a sign of a stuck gauge or mixed streams), and eight in a row outside 1 sigma on both sides.

{{diagram:chart}}

> [!warning] More rules, more false alarms
> Each extra rule raises the chance of a false signal. A single 3-sigma limit gives a false alarm about once in 370 samples on average (1 divided by 0.0027). Stacking several Western Electric rules shortens that interval a lot, to well under 100 samples for the full set, and the exact figure depends on which rules you combine. Turn on a small set, and train operators on what each signal means and what to do.

## Process capability: Cp and Cpk

A control chart tells you the process is stable. {{term:cp-cpk|Cp and Cpk}} tell you whether a stable process fits the spec. Only compute them after the process is in control.

- **Cp** = (USL - LSL) / (6 x sigma). It compares spec width to process spread and ignores centering.
- **Cpk** = the smaller of (USL - mean) / (3 x sigma) and (mean - LSL) / (3 x sigma). It uses the nearer limit, so off-center processes score lower.

> [!example] Worked example continued
> Mean = 10.08, sigma = 0.060, LSL = 9.70, USL = 10.30.
>
> Cp = 0.60 / (6 x 0.060) = 0.60 / 0.36 = **1.67**
>
> Upper: (10.30 - 10.08) / 0.18 = 1.22. Lower: (10.08 - 9.70) / 0.18 = 2.11.
> Cpk = min(1.22, 2.11) = **1.22**
>
> The process could comfortably fit (Cp 1.67) but runs 0.08 mm high, so Cpk is only 1.22. Re-centering at 10.00 would give Cpk = 1.67 without reducing variation at all.

Common targets are Cpk of 1.33 or better for existing processes and 1.67 for critical characteristics. These are widely used conventions, not laws. Your customer's quality agreement or PPAP requirement sets the real number. A Cpk of 1.0 means the nearer spec limit is only 3 sigma away, which produces roughly 0.13 percent out of spec on that side. Ppk uses the same formula with the overall long-term standard deviation, so it also counts drift between subgroups.

## Sampling plans

The data you collect decides whether the chart is useful.

- **Subgroup size.** 4 to 5 for X-bar charts is typical. Larger subgroups detect smaller shifts but cost more to measure.
- **Rational subgroups.** Take the units from one short time window and one stream, so variation inside a subgroup is common cause only. Mixing two cavities or two shifts in a subgroup hides what you want to see.
- **Frequency.** Often hourly, per shift or per lot. Sample more often when the process is new or being improved, and less when it has proven stable.
- **Baseline.** Compute limits from a reasonable run of in-control data. Textbooks commonly suggest about 20 to 25 subgroups, though your quality procedure may say otherwise. Recompute only when the process is deliberately changed.
- **Capture the context.** Record product, line, shift, gauge and operator with every sample, so you can stratify later.

## Where the data comes from

Automatic collection is possible when a gauge or PLC value can be sampled at an event (end of part, fill complete), as in {{lesson:ign-databases}} for storage. Manual entry from calipers or lab tests still matters, so give operators a clear entry screen with a required reason when a signal fires. In Ignition you can build this yourself with SQL and charts, or use a module that adds sample definitions, rules and charts; {{lesson:mes-sepasoft}} shows what the Sepasoft SPC module offers.
`,

  eli5: `
Imagine you walk to school every day and time how long it takes. Some days it is 14 minutes, some 16, some 15. That wobble is normal. It depends on traffic lights, how fast you walk, a dog on the sidewalk. You wouldn't call that a problem.

Then one day it takes 27 minutes. That is not normal wobble. Something happened, maybe road work. A control chart is a way to draw your usual wobble as a pair of lines, so a day like that jumps out at you, and so does a slow creep where you get a little slower every day for a week.

Now the school itself has a rule: you must arrive before the bell at 8:30. That is a separate line. Your walk could be perfectly steady and still always arrive late, if you leave too late. The wobble lines tell you whether you changed. The bell tells you whether it matters. Cpk is a score for how far your usual wobble stays from the bell.
`,

  why: `
**Why not just alarm on the spec limit?** By the time a part is out of spec you have already made scrap. A control chart can flag a shift while every part is still good, such as eight points in a row on one side of the center. That early signal is the entire economic value of SPC.

**Why control limits come from data, not from the spec.** Spec limits describe what the customer tolerates. Control limits describe what the process does. If you set limits from the spec, a drifting process looks fine until it falls off the cliff. If you set the spec from the process, you are telling the customer what to accept. Keeping them separate is the point.

**Why not react to every point?** Tampering is the technical term for adjusting a stable process in response to noise. It increases variation. A common failure is an operator who "corrects" the setpoint after each reading. The chart tells them when not to touch it.

**Why argue about the rule set?** Experienced quality engineers disagree about how many run rules to enable. More rules catch smaller shifts but produce more false alarms, and operators learn to ignore a chart that cries wolf. Many plants use rule 1 plus one or two run rules for production and add more only on critical characteristics.

**Why integrators care.** The most common SPC failure is not statistical. It is that the data goes to a spreadsheet, nobody sees the signal in time, and nobody knows what to do when it fires. Build the response (a notification, a required note, a hold) into the system with the chart.
`,

  history: `
Walter Shewhart developed the control chart at Bell Telephone Laboratories in the 1920s. The Western Electric Company, the manufacturing arm of the Bell System, codified its detection rules in a handbook whose first edition appeared in 1956. Lloyd Nelson later published a similar eight-rule set. W. Edwards Deming promoted Shewhart's ideas widely after the Second World War, notably in Japan.
`,

  examples: [
    {
      title: "Filler weight individuals chart",
      body: `Net weight is checked by a checkweigher every 15 minutes on one line. Target 500 g. Twenty readings give a mean of 501.2 g and an average moving range of 1.1 g. Limits: 501.2 plus or minus 2.66 x 1.1 = 498.3 to 504.1 g. At 10:30 the reading is 505.0, outside the upper limit. The chart signals a special cause. The line lead finds the fill head temperature had dropped. The chart did its job before anything went below the 495 g internal reject limit (an example value for this line).`
    },
    {
      title: "Reading a signal that is not an outlier",
      body: `On an X-bar chart, nine consecutive hourly averages sit just above the center line. None is near a limit. Western Electric rule 4 (eight on one side) fires. The cause is a new bag of raw material that shifted the mean by a small amount. Nothing is out of spec yet, but the process has moved, and you now know before it gets worse.`
    }
  ],

  diagrams: {
    chart: `<svg viewBox="0 0 640 260" role="img" aria-label="A control chart with a center line, UCL and LCL at 3 sigma, zones A B and C, a run of points on one side of the center, and one point beyond the upper limit">
  <rect class="dg-box" x="60" y="20" width="560" height="210" rx="4"/>
  <line class="dg-line-alarm" x1="60" y1="45" x2="620" y2="45"/>
  <line class="dg-line" x1="60" y1="125" x2="620" y2="125"/>
  <line class="dg-line-alarm" x1="60" y1="205" x2="620" y2="205"/>
  <line class="dg-dash" x1="60" y1="72" x2="620" y2="72"/>
  <line class="dg-dash" x1="60" y1="98" x2="620" y2="98"/>
  <line class="dg-dash" x1="60" y1="152" x2="620" y2="152"/>
  <line class="dg-dash" x1="60" y1="178" x2="620" y2="178"/>
  <text class="dg-text-sm" x="8" y="49">UCL</text>
  <text class="dg-text-sm" x="8" y="129">Mean</text>
  <text class="dg-text-sm" x="8" y="209">LCL</text>
  <text class="dg-text-muted" x="560" y="63">Zone A</text>
  <text class="dg-text-muted" x="560" y="89">Zone B</text>
  <text class="dg-text-muted" x="560" y="115">Zone C</text>
  <polyline class="dg-line-thin" fill="none" points="90,130 125,118 160,140 195,126 230,112 265,132 300,108 335,104 370,98 405,95 440,92 475,88 510,40"/>
  <circle class="dg-fill-fg" cx="90" cy="130" r="3"/>
  <circle class="dg-fill-fg" cx="125" cy="118" r="3"/>
  <circle class="dg-fill-fg" cx="160" cy="140" r="3"/>
  <circle class="dg-fill-fg" cx="195" cy="126" r="3"/>
  <circle class="dg-fill-fg" cx="230" cy="112" r="3"/>
  <circle class="dg-fill-fg" cx="265" cy="132" r="3"/>
  <circle class="dg-fill-warn" cx="300" cy="108" r="4"/>
  <circle class="dg-fill-warn" cx="335" cy="104" r="4"/>
  <circle class="dg-fill-warn" cx="370" cy="98" r="4"/>
  <circle class="dg-fill-warn" cx="405" cy="95" r="4"/>
  <circle class="dg-fill-warn" cx="440" cy="92" r="4"/>
  <circle class="dg-fill-warn" cx="475" cy="88" r="4"/>
  <circle class="dg-fill-alarm" cx="510" cy="40" r="5"/>
  <text class="dg-text-sm" x="300" y="250">Run above the mean (warning), then a point past the UCL (signal)</text>
</svg>`
  },

  pitfalls: [
    "Drawing the spec limits on a control chart and calling them control limits.",
    "Computing Cpk on data from an unstable process. The number means nothing until the chart is in control.",
    "Mixing two machines, cavities or shifts into one subgroup, which inflates the range and hides real shifts.",
    "Enabling every Nelson rule on every chart, so operators learn to ignore the alarms.",
    "Recalculating limits after every signal, which quietly widens them to cover the problem.",
    "Using a p chart limit that goes below zero. Clamp the lower limit at 0.",
    "Adjusting the process after every single point (tampering) instead of waiting for a signal."
  ],

  keyTerms: ["spc", "control-chart", "common-special-cause", "control-limits", "spec-limits", "xbar-r-chart", "individuals-chart", "p-chart", "c-chart", "western-electric-rules", "nelson-rules", "cp-cpk", "subgroup-sampling"],

  quiz: [
    {
      q: "A process has been stable for months, and every X-bar point is inside the control limits. Parts are still frequently rejected for being over the upper spec. What does this tell you?",
      options: ["The control limits are calculated wrongly", "The process is in control but off-center or too wide for the spec, so Cpk is low", "A special cause is present in every point", "The chart should use spec limits instead"],
      answer: 1,
      explain: [
        "The limits come from the process's own data and can be perfectly correct while the process fails the spec.",
        "Correct. Being in control means stable, not capable. You need to re-center or reduce variation.",
        "Special cause shows up as signals on the chart, which are absent here.",
        "Spec limits are for judging parts. Using them on the chart would hide drift."
      ]
    },
    {
      q: "Spec is 20.0 +/- 0.6. The stable process has mean 20.2 and sigma 0.1. What is Cpk?",
      options: ["2.00", "1.33", "1.67", "4.00"],
      answer: 1,
      explain: [
        "That would be Cp: 1.2 / (6 x 0.1) = 2.0. It ignores that the process is off-center.",
        "Correct. Upper: (20.6 - 20.2) / 0.3 = 1.33. Lower: (20.2 - 19.4) / 0.3 = 2.67. Cpk is the smaller one.",
        "This would be the result if the mean sat 0.1 above target instead of 0.2.",
        "This uses the wrong formula and has no basis in the data."
      ]
    },
    {
      q: "A technician measures one tank pH per shift. Which chart fits?",
      options: ["X-bar and R chart", "p chart", "Individuals and moving range chart", "c chart"],
      answer: 2,
      explain: [
        "X-bar and R needs a subgroup of several measurements at each check.",
        "A p chart is for the fraction of defective items, which is attribute data.",
        "Correct. One measurement per check is the textbook case for I-MR.",
        "A c chart counts defects per unit, which is not what a pH reading is."
      ]
    },
    {
      q: "On an X-bar chart nine consecutive averages sit above the center line but inside the limits. What is the right reaction?",
      options: ["Nothing, all points are inside the limits", "Treat it as a signal and investigate what changed", "Widen the control limits", "Switch to spec limits"],
      answer: 1,
      explain: [
        "Staying inside the limits does not make a run of this length random.",
        "Correct. A long run on one side is a run-rule violation, which indicates a shift of the mean.",
        "Widening limits to fit the data hides the shift.",
        "Spec limits are unrelated to detecting a change in the process."
      ]
    },
    {
      q: "Why is the lower control limit of a p chart often shown as 0?",
      options: ["A fraction defective cannot be negative, so a negative computed limit is clamped to zero", "Lower limits are never used in attribute charts", "Because defects are always rare", "Because sample sizes are constant"],
      answer: 0,
      explain: [
        "Correct. With low defect rates and small samples the formula gives a negative number, which is meaningless.",
        "Lower limits exist, but with small p and n they can fall below zero.",
        "Rarity is why it happens, but the reason is the arithmetic being clamped, not the rarity alone.",
        "Sample size only changes the width of the limits."
      ]
    },
    {
      q: "Adding more run rules to a chart generally does what?",
      options: ["Detects smaller shifts sooner but raises the false alarm rate", "Lowers the false alarm rate", "Has no effect on detection", "Replaces the need for control limits"],
      answer: 0,
      explain: [
        "Correct. Every additional rule is another chance to fire by luck, so the trade-off is real.",
        "More rules means more false alarms, not fewer.",
        "Run rules exist because they detect patterns that single-point limits miss.",
        "Rules work with the limits and the zones calculated from them."
      ]
    }
  ],

  resources: [
    { title: "Western Electric rules", url: "https://en.wikipedia.org/wiki/Western_Electric_rules", type: "article", source: "Wikipedia" },
    { title: "Control chart", url: "https://en.wikipedia.org/wiki/Control_chart", type: "article", source: "Wikipedia" },
    { title: "SPC Module Overview (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/spc-module-overview", type: "docs", source: "Sepasoft" },
    { title: "What Is SPC (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/what-is-spc", type: "docs", source: "Sepasoft" },
    { title: "Control Charts (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/control-charts", type: "docs", source: "Sepasoft" },
    { title: "SPC Rules in Sample Definitions (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/spc-rules-in-sample-definitions", type: "docs", source: "Sepasoft" }
  ]
});
