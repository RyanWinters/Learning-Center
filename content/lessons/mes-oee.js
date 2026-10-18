LC.lesson({
  id: "mes-oee",
  title: "OEE",
  track: "mes",
  minutes: 15,
  level: 2,
  prereqs: ["mes-what"],
  tags: ["oee", "availability", "performance", "quality", "tpm", "metrics"],
  summary: "One number from three ratios. The arithmetic is easy. The argument is about what counts as planned time, what the ideal rate is, and who gets to change them.",
  objectives: [
    "Calculate Availability, Performance, Quality and OEE from a shift's raw numbers",
    "Define planned production time, run time, ideal cycle time and good count",
    "Map the six big losses onto the three OEE factors",
    "Distinguish OEE from TEEP and say when each is the right number",
    "Spot common ways OEE is gamed or miscalculated, and explain why 85 percent is not a universal target"
  ],

  body: `
## What OEE is

{{term:oee|OEE}} (Overall Equipment Effectiveness) answers one question: of the time we planned to make good product, what fraction was truly spent making good product at full speed? It comes from Total Productive Maintenance (TPM) and it is the most common number an MES reports. It multiplies three ratios:

\`\`\`text
OEE = Availability x Performance x Quality
\`\`\`

Each ratio isolates one kind of waste, so a low OEE tells you where to look. A plant that ran all shift but ran slowly has a performance problem. A plant that ran at full speed but stopped for an hour has an availability problem. Same OEE, different fix.

## The vocabulary

- **Planned production time**: the time the equipment was *scheduled* to run. Start with the shift length and subtract planned stops such as breaks, scheduled maintenance and meetings. Different plants draw this line differently, which is the source of many arguments.
- **Stop time**: unplanned stops plus setup and changeover. Anything where the machine was supposed to run and did not.
- **Run time**: planned production time minus stop time.
- **{{term:ideal-cycle-time|Ideal cycle time}}**: the fastest time per part the equipment can sustain in normal operation. The reciprocal is the **ideal rate**.
- **Total count**: everything the machine produced, good or bad.
- **Good count**: parts that passed the first time with no rework.

## The three factors

| Factor | Formula | Losses it captures |
|---|---|---|
| Availability | Run time / Planned production time | Breakdowns, setup and changeover |
| Performance | (Ideal cycle time x Total count) / Run time | Micro-stops, slow cycles, reduced speed |
| Quality | Good count / Total count | Scrap, rework, startup rejects |

Performance is best read as "how many parts did we make, divided by how many we would have made at the ideal rate in the same running time." It can never fall below zero and should never exceed 100 percent. If it does, the ideal rate is wrong.

## A full worked example

One 8-hour shift on a bottle capper.

| Item | Value |
|---|---|
| Shift length | 480 min |
| Planned stops (30 min lunch and breaks) | 30 min |
| **Planned production time** | **450 min** |
| Breakdown stops | 42 min |
| Changeover to new cap size | 18 min |
| **Run time** | 450 - 42 - 18 = **390 min** |
| Ideal cycle time | 2.0 s per bottle (30 per min) |
| Total count | 10,530 |
| Rejects | 316 |
| **Good count** | 10,530 - 316 = **10,214** |

Step by step:

\`\`\`text
Availability = 390 / 450                    = 0.8667  (86.7%)
Ideal count  = 390 min x 30/min             = 11,700
Performance  = 10,530 / 11,700              = 0.9000  (90.0%)
Quality      = 10,214 / 10,530              = 0.9700  (97.0%)

OEE = 0.8667 x 0.9000 x 0.9700              = 0.7566  (75.7%)
\`\`\`

There is a shortcut that makes a good sanity check. OEE is the **fully productive time** divided by planned production time. Good count times ideal cycle time is 10,214 x 2 s = 20,428 s = 340.5 min. Then 340.5 / 450 = 75.7 percent. Same answer.

{{diagram:waterfall}}

The waterfall shows where the 450 planned minutes went: 60 min lost to availability, about 39 min of equivalent time to speed, and about 10 min to defects. The biggest single bucket is the stops. The changeover alone, 18 min, is 30 percent of that. That is a better conversation than "OEE is 75.7."

> [!tip] Build it in SQL
> Store state intervals and counts, never the percentages. A query can then compute any ratio for any time window, and you can re-run history when someone corrects the ideal rate. Averaging each hour's OEE gives the wrong answer for the shift. Always sum the numerators and denominators first.

## The six big losses

The TPM literature groups equipment losses into six categories. Each one lands in exactly one OEE factor, which makes them a good checklist when you design reason codes (see {{lesson:mes-downtime}}).

| Big loss | OEE factor | Example |
|---|---|---|
| Equipment failure | Availability | Gearbox seizes, 42 min down |
| Setup and adjustment | Availability | Changeover to new cap size, 18 min |
| Idling and minor stops | Performance | Jam cleared in 20 seconds, ten times an hour |
| Reduced speed | Performance | Line run at 25/min because of a worn feeder |
| Process defects | Quality | Over-torqued caps cracked, scrapped |
| Reduced yield | Quality | First 200 bottles after startup rejected |

Notice that quality counts first-pass yield. Parts that are reworked and then pass are still a loss.

## OEE vs TEEP

OEE only looks at time you *planned* to run. **{{term:teep|TEEP}}** (Total Effective Equipment Performance) multiplies OEE by loading, which is planned production time divided by all calendar time:

\`\`\`text
Loading = 450 min / 1,440 min (24 h) = 31.25%
TEEP    = 31.25% x 75.7%            = 23.6%
\`\`\`

OEE says "when we run, how well do we run?" TEEP says "of all the hours the asset exists, how much did we use?" If a plant is running one shift on a line it could run three shifts, a high OEE looks great and TEEP shows the headroom. Use OEE to improve operations and TEEP for capacity and capital decisions.

## How OEE gets gamed or miscalculated

Almost every OEE dispute is about inputs, not arithmetic.

- **Wrong ideal rate.** If the ideal is set to what the line "usually does," performance sits at 100 percent and tells you nothing. If set to something too slow, performance exceeds 100 percent. Using the example above, an ideal of 25/min instead of 30/min gives 10,530 / (390 x 25) = 108 percent. Ideal rate should come from the nameplate, the engineering standard or the best demonstrated sustained rate, and be written down per product.
- **Excluding changeovers.** If changeovers are classed as planned stops, the example shrinks planned production time to 432 min. Availability becomes 390 / 432 = 90.3 percent and OEE climbs to 78.8 percent without any improvement. Some plants do this on purpose, and the choice is fine if it is applied the same everywhere and reported. Hiding the loss is not fine.
- **Reclassifying stops.** Operators or supervisors move unplanned stops into "planned maintenance" or "no order." Review code usage and look for suspicious growth in planned categories.
- **Ignoring micro-stops.** If the system only records stops longer than a threshold such as two minutes, shorter stops disappear into "reduced speed" or vanish entirely. See {{term:micro-stop|micro-stops}}.
- **Counting rework as good.** Inflates quality, which is why first-pass yield is the standard.
- **Wrong count source.** A count taken after a buffer or after a downstream reject station gives different numbers than a count at the machine. Decide which one and stay consistent.
- **Averaging percentages.** Shift OEE is not the mean of line OEEs unless every line has the same planned time and rate.

## The 85 percent "world-class" figure

You will hear that world-class OEE is 85 percent, a figure OEE.com's [Practical OEE](https://www.oee.com/practical-oee/) guidance and many other sources repeat. It is commonly built from Availability 90 percent, Performance 95 percent and Quality 99 percent: 0.90 x 0.95 x 0.99 = 84.6 percent. Treat it as a rule of thumb from discrete manufacturing, not a target. A batch process with long cleaning cycles may never reach it. A high-volume bottling line may exceed it easily. Comparing your 68 percent filler to another plant's 85 percent packaging line is meaningless, because the two plants define planned time and ideal rate differently. Compare a line to its own history, use the loss breakdown to pick targets, and do not publish a plant-wide number without writing down the definitions.

> [!note] In Ignition and Sepasoft
> Sepasoft's OEE modules compute these factors from equipment states, counts and a standard rate. Their docs describe grouping states so several (such as loading, heating and molding) all count as Running, planned breaks that do not count against availability, and tag collectors that can take mode, state, counts and standard rate from Ignition tags. The details are in {{lesson:mes-sepasoft}}. The same inputs apply if you build the calculation yourself.

## What the PLC should provide

OEE quality depends on clean signals from Level 1 and 2.

1. A **machine state** that distinguishes running, stopped, faulted, starved, blocked, and idle. Do not make MES guess from motor current.
2. A **good count** and **reject count** from the machine, as separate counters that roll over safely.
3. The **product ID** or recipe number, so MES can look up the right ideal rate.

If you are writing the PLC code, the state model from {{lesson:plc-isa88-packml}} gives you most of this for free.
`,

  eli5: `
Imagine you run a lemonade stand and you promised to be open from 9 to 5. That is your plan. Lunch is fine, nobody counts that against you.

Now count three kinds of waste. First, how long were you actually not selling when you should have been? The pitcher broke and you spent an hour fixing it. Second, when you were selling, were you going as fast as you possibly could? Maybe you were pouring slowly because the ice was stuck. Third, of the cups you poured, how many were good? A few spilled or tasted bad.

Multiply the three "how good were we" numbers together and you get one score. If you only gave a single score of "70 out of 100" it would not tell you what to fix. But because you kept the three parts, you know whether to buy a better pitcher, a better scoop, or better ingredients.

The tricky bit is that everyone has to agree what "as fast as you possibly could" means, and what counts as lunch. Those two choices change the score more than any real improvement does.
`,

  why: `
**Why three factors multiplied?** Multiplication means any one weak factor drags the whole number down, and it forces every kind of waste into the same unit: lost productive time. Availability, performance and quality all convert to "minutes of good production we did not get." That common unit is what lets you rank a changeover against a micro-stop against a scrap problem.

**Why is the ideal rate the center of every fight?** Performance is only as honest as its denominator. A conservative ideal rate flatters the line and removes the reason to improve. An aggressive one makes everything look bad and gets ignored. Experienced integrators put the ideal rate in product master data with an owner (usually engineering), record who changed it and when, and report OEE against the rate in effect at the time.

**Why record losses before percentages?** A plant that only stores OEE cannot recompute when the definition changes. A plant that stores state intervals, counts and reasons can answer any question later. This is the same principle as storing raw events in the historian.

**Why do the definitions matter more than the target?** OEE becomes a bonus metric surprisingly often. The moment someone's pay depends on it, the inputs get pushed. The defense is not a better formula. It is transparency: visible reason codes, audit of changes, and a rule that planned time is set by the schedule, not by the operator.

**What integrators argue about.** Whether to include changeovers in planned time, whether to report TEEP alongside OEE, and whether a single plant-wide OEE number is useful at all. A common compromise is to report OEE per line and loss category, and keep a plant-wide number only as a trend.
`,

  history: `
OEE is attributed to Seiichi Nakajima, who developed it as part of Total Productive Maintenance in Japan. TPM focused on getting operators involved in maintaining their own equipment, and OEE gave them a single measure and a breakdown of losses to work on. The six big losses became the standard way to teach it. MES vendors later built OEE calculation into their products, and ISA-95 places it in the performance analysis activity.
`,

  examples: [
    {
      title: "Reading a poor OEE",
      body: `Two lines both report 60 percent OEE. Line A: Availability 65, Performance 95, Quality 97. Line B: Availability 95, Performance 65, Quality 97. Line A needs maintenance and changeover work. Line B runs, but slowly, so look for micro-stops, worn feeders or operators running under the ideal rate for safety. Same OEE, opposite action plans.`
    },
    {
      title: "Checking the ideal rate",
      body: `Performance for a product keeps showing 112 percent. Nothing is wrong with the line. The product's standard rate is 24/min but the machine's nameplate is 30/min. Correct the ideal rate in master data, and recompute history from stored counts and run time. Do not cap the percentage at 100, because that hides the error.`
    }
  ],

  diagrams: {
    waterfall: `<svg viewBox="0 0 640 230" role="img" aria-label="Waterfall of the worked example: 450 planned minutes reduced by stops, speed loss and defects to 340.5 fully productive minutes">
  <text class="dg-title" x="20" y="22">Where the 450 planned minutes went</text>
  <rect class="dg-box-accent" x="20" y="40" width="560" height="28" rx="3"/>
  <text class="dg-text-sm" x="30" y="59">Planned production time: 450 min</text>
  <rect class="dg-box" x="20" y="80" width="486" height="28" rx="3"/>
  <text class="dg-text-sm" x="30" y="99">Run time: 390 min (lost 60 to stops)</text>
  <rect class="dg-box" x="20" y="120" width="437" height="28" rx="3"/>
  <text class="dg-text-sm" x="30" y="139">Net run time: 351 min (lost 39 to speed)</text>
  <rect class="dg-box-accent" x="20" y="160" width="424" height="28" rx="3"/>
  <text class="dg-text-sm" x="30" y="179">Fully productive: 340.5 min (lost 10.5 to defects)</text>
  <text class="dg-text-muted" x="20" y="212">A = 390/450   P = 351/390   Q = 340.5/351   OEE = 340.5/450 = 75.7%</text>
</svg>`
  },

  pitfalls: [
    "Setting the ideal rate to what the line usually runs, which makes performance 100 percent and useless.",
    "Capping performance at 100 percent instead of fixing the ideal rate that produced 112 percent.",
    "Averaging hourly or per-line OEE percentages instead of summing times and counts first.",
    "Classifying changeovers as planned time in one plant and unplanned in another, then comparing them.",
    "Counting reworked parts as good, which inflates quality.",
    "Storing only the OEE percentage so history cannot be recalculated when definitions change."
  ],

  keyTerms: ["oee", "ideal-cycle-time", "planned-production-time", "six-big-losses", "teep", "micro-stop", "first-pass-yield", "mes-equipment-state"],

  quiz: [
    {
      q: "A line has planned production time of 400 min, run time of 320 min, total count 9,600 at an ideal rate of 35/min, and 96 rejects. What is Performance?",
      options: ["92.0 percent","80.0 percent","85.7 percent","99.0 percent"],
      answer: 2,
      explain: [
        "This does not come from the given numbers.",
        "80 percent is Availability (320/400), not Performance.",
        "Correct. Ideal count = 320 x 35 = 11,200. Performance = 9,600 / 11,200 = 85.7 percent.",
        "99 percent is Quality (9,504 / 9,600)."
      ]
    },
    {
      q: "Which of the six big losses reduces the Performance factor?",
      options: ["Idling and minor stops", "Equipment failure", "Setup and adjustment", "Process defects"],
      answer: 0,
      explain: [
        "Correct. Minor stops and reduced speed both hit Performance.",
        "Equipment failure is a long stop and lands in Availability.",
        "Setup and changeover are stops, so Availability.",
        "Defects land in Quality."
      ]
    },
    {
      q: "A plant reclassifies a 20-minute changeover as a planned stop. What happens to the reported OEE?",
      options: ["It goes down", "It goes up with no real improvement", "It stays the same", "It becomes TEEP"],
      answer: 1,
      explain: [
        "Shrinking planned time and keeping the same run time raises Availability.",
        "Correct. Planned time drops and Availability rises, but nothing physical changed.",
        "Availability is run time over planned time, and planned time changed.",
        "TEEP uses calendar time as its base. This does not change the metric."
      ]
    },
    {
      q: "A product's Performance reads 112 percent every shift. What is the best fix?",
      options: ["Increase planned production time","Ignore the product","Cap Performance at 100 percent in the report","Correct the product's ideal rate in master data"],
      answer: 3,
      explain: [
        "Changing planned time does not fix the speed reference.",
        "Ignoring it leaves bad data in the system.",
        "Capping hides the data problem, and the other factors stay misleading.",
        "Correct. Performance above 100 percent means the ideal rate is too slow. Fix it at the source and recompute."
      ]
    },
    {
      q: "A plant runs one 8-hour shift and has an OEE of 80 percent. What does TEEP show that OEE does not?",
      options: ["The scrap rate","The mean time between failures","How well the machine runs when scheduled","How much of the calendar time the asset is used at all"],
      answer: 3,
      explain: [
        "Scrap is in the Quality factor of both.",
        "MTBF is a separate reliability metric.",
        "That is what OEE already shows.",
        "Correct. TEEP multiplies OEE by loading (planned time over calendar time), exposing unused capacity."
      ]
    },
    {
      q: "Why is it better to store state intervals and counts than only the OEE percentage?",
      options: ["Operators prefer raw data","You can recompute any window or corrected definition later, and sum correctly across lines","ERP requires it","Percentages take more storage"],
      answer: 1,
      explain: [
        "Operator preference is not the reason.",
        "Correct. Percentages cannot be re-aggregated or recalculated after a definition changes.",
        "ERP does not require it.",
        "Storage is not the issue."
      ]
    }
  ],

  resources: [
    { title: "OEE Factors: Availability, Performance, and Quality", url: "https://www.oee.com/oee-factors/", type: "article", source: "OEE.com" },
    { title: "Six Big Losses in Manufacturing", url: "https://www.oee.com/oee-six-big-losses/", type: "article", source: "OEE.com" },
    { title: "Calculate TEEP: Increase Equipment Utilization", url: "https://www.oee.com/teep/", type: "article", source: "OEE.com" },
    { title: "Practical OEE: Learn Fundamentals and Avoid Mistakes", url: "https://www.oee.com/practical-oee/", type: "article", source: "OEE.com" },
    { title: "OEE FAQ", url: "https://www.oee.com/faq/", type: "article", source: "OEE.com" },
    { title: "Configuring Equipment States (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/configuring-equipment-states", type: "docs", source: "Sepasoft" },
    { title: "OEE Production Data Collection (Sepasoft)", url: "https://docs.sepasoft.com/articles/user-manual/oee-production-data-collection", type: "docs", source: "Sepasoft" }
  ]
});
