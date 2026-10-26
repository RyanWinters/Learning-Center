LC.lesson({
  id: "ign-historian",
  title: "The Tag Historian",
  track: "ign",
  minutes: 15,
  level: 2,
  prereqs: ["ign-tags", "db-intro"],
  tags: ["ignition", "historian", "history", "sql", "deadband", "store-and-forward"],
  summary: "How Ignition turns tag changes into rows on disk, what the knobs (sample mode, deadband, partitions) really do, and how to estimate the storage before it surprises you.",
  objectives: [
    "Describe what the Historian stores and the role of the sqlth_ tables",
    "Choose a sample mode and deadband style for a given signal",
    "Explain partitions and pruning and why you should not delete tables by hand",
    "Compare the SQL Historian with the 8.3 Core Historian",
    "Estimate storage for a tag count and change rate"
  ],

  body: `
## What the Historian does

A {{term:tag-historian|Tag Historian}} records tag values over time so you can trend them, report on them and analyze them later. You turn it on per tag: set **History Enabled**, pick a **history provider** (where it is stored) and choose when to record. Ignition then watches the tag and writes timestamped values. Later, trends and scripts such as \`system.historian.queryRawPoints\` and \`system.historian.queryAggregatedPoints\` read them back, with aggregation done for you.

In 8.3 the Historian module offers two storage back ends, called **history providers**. (In 8.1 the history module is named Tag Historian and stores to SQL.)

| Provider | Stores data in | Notes |
|---|---|---|
| **SQL Historian** (the classic one) | Your own relational database (MySQL/MariaDB, PostgreSQL, SQL Server, Oracle and others) | Uses {{term:store-and-forward|store-and-forward}}; you own backups and indexing |
| **Core Historian** (new in 8.3) | A built-in {{term:questdb|QuestDB}} time-series store on the Gateway's disk | Needs no external database; writes via a write-ahead log, skipping store-and-forward |

> [!note] In 8.1
> 8.1 has the Tag Historian module, which stores to SQL, the same approach 8.3 calls the SQL Historian provider. The Core Historian provider is new in 8.3. Everything below about sample modes and deadbands applies to both versions. The sqlth tables apply to the SQL provider in both. {{lesson:ign-architecture}} lists the module naming across versions.

## How the SQL Historian stores data

The SQL Historian creates a small set of tables with the \`sqlth_\` prefix plus data tables:

| Table | Holds |
|---|---|
| \`sqlth_drv\` | One row per Gateway history provider ("driver") writing to this database |
| \`sqlth_scinfo\` | Tag group (scan class) info and the historical sample rate |
| \`sqlth_te\` | **Tag entries**: one row per unique historical configuration of a tag, with a numeric \`id\` |
| \`sqlth_partitions\` | Maps time ranges to data table names |
| \`sqlt_data_<driver>_<year>_<month>\` | The values: tag id, int/float/string/date value, data integrity (quality), timestamp in milliseconds |

Two ideas matter. First, the data table does not store tag paths. It stores a small integer \`tagid\` that points into \`sqlth_te\`. That makes rows narrow. Second, if you rename a tag, change its data type or move it, Ignition retires the old \`sqlth_te\` row and creates a new one. History of the old name can still be queried, but only if you ask for the old path or use history-aware renaming tools.

\`\`\`sql
-- What is in the historian for tags under Plant1/Area10/Line1?
SELECT id, tagpath, datatype, querymode, created, retired
FROM sqlth_te
WHERE tagpath LIKE 'plant1/area10/line1/%'
ORDER BY tagpath;
\`\`\`

\`querymode\` records the deadband style (discrete or analog compression), which controls how raw data is interpreted at query time.

### Partitions and pruning

If you put every row in one table, deleting old data means a huge, slow \`DELETE\` that bloats the table. Instead the Historian creates a new {{term:history-partition|partition}} table on a schedule you configure (monthly is typical; check the manual for the default in your version). Queries consult \`sqlth_partitions\` to pick only the tables covering the requested time range. {{term:data-pruning|Pruning}} then deletes whole partitions older than the retention age (for example, 90 days). It is a drop, not a delete, so it is fast.

Rules that come from this design:

- A partition is only removed when its **newest** row is older than the prune age. A monthly partition therefore lives a bit longer than the retention you set.
- Enable pruning on **one** provider per database. Two pruners working on the same tables can conflict, so keep a single owner.
- **Never drop sqlt_data tables by hand** without also removing their rows in \`sqlth_partitions\`. Queries will then fail on a table that no longer exists.
- Pre-processed partitions (optional) store summary blocks beside raw data so long-range trends read fewer rows. They only help when the query window is larger than the pre-process window (check the manual for the default in your version).

## When a value is recorded

Per tag you choose a **sample mode**:

| Mode | Records | Typical use |
|---|---|---|
| **On Change** | Each time the value changes beyond the deadband | Most analog and discrete signals; the efficient default |
| **Periodic** | Every N seconds regardless | When you need regular samples, like a fixed trend grid |
| **Tag Group** | On the execution of a {{term:ign-tag-group|tag group}} | Align many tags to the same clock |

Around those modes sit guard rails. **Minimum time between records** drops rapid-fire changes. **Maximum time between records** forces a "heartbeat" row even when nothing changes, so you can tell a flat line from a dead system.

### Deadband style

{{term:historian-deadband-style|Deadband style}} has three settings, and the difference is large:

- **Discrete**: store a value only when it differs from the last stored value by more than the deadband. Right for states, counts and booleans.
- **Analog**: treats the deadband as a corridor around the signal's trajectory (a form of compression). A new point is stored only when the value leaves the corridor. Right for smoothly varying signals like temperature, where a straight ramp needs only two points.
- **Auto**: Ignition picks based on data type.

> [!warning] Too wide a deadband destroys data
> A deadband is data you will never get back. A deadband of 5 on a temperature that really moves 3 degrees through an event means the event is invisible. Set deadbands to a fraction of the instrument's meaningful change, usually about the noise floor, not "whatever reduces size."

{{diagram:flow}}

## Store-and-forward

The Gateway does not write directly to your database. Values enter a {{term:store-and-forward|store-and-forward}} pipeline that batches them, retries when the database is down and caches to disk. A database outage then loses nothing for hours, as long as the disk cache is not exceeded. Core Historian writes straight to its own disk through a write-ahead log, so this layer is not involved. The details of the engine are covered in {{lesson:ign-databases}}.

## Querying history

Query modes decide the shape of the answer. You request a time range, a **return size** (how many rows) or fixed interval, and an **aggregation mode** per tag.

| Aggregate | Meaning |
|---|---|
| Average, Minimum, Maximum | Statistics per interval; time-weighted average counts how long each value held |
| LastValue, Sum, Count | Closing value, total, or number of samples |
| MinMax | Both extremes (for spike-preserving trends) |
| PctGood, PctBad | Share of the window with good or bad quality |

\`\`\`python
end = system.date.now()
start = system.date.addHours(end, -24)
ds = system.historian.queryAggregatedPoints(
    paths=["[default]Plant1/Area10/Line1/LT101"],
    startTime=start, endTime=end,
    returnSize=24, aggregates=["Average"])
\`\`\`

> [!note] In 8.1
> The same query was \`system.tag.queryTagHistory(paths, startDate, endDate, returnSize=24, aggregationMode="Average", returnFormat="Wide")\`. It is deprecated in 8.3 but still runs. Parameter names differ in the new functions, so check the 8.3 manual before porting (8.3 uses \`startTime\`/\`endTime\`, not \`startDate\`/\`endDate\`). For raw, uncompressed values use \`system.historian.queryRawPoints\`.

Twenty-four hourly averages come back, no matter how many raw rows are underneath. Remember that an average hides spikes. Use MinMax or a max aggregate when the extremes matter, such as an over-temperature alarm review.

## Sizing: a worked estimate

Suppose 5,000 historized tags, each changing on average once every 10 seconds before compression.

- Raw rate: 5,000 / 10 = **500 rows/s** = 43.2 million rows/day.
- A SQL row costs roughly **50 bytes** counting the value, tag id, quality, timestamp and index overhead (varies by database).
- 43.2 M × 50 B = about **2.2 GB/day**, or about **194 GB** for 90 days.
- With a sensible analog deadband that keeps about one in four rows, that drops to roughly **0.55 GB/day** and 49 GB per 90 days.

Round up and add headroom for indexes and backups. Do the arithmetic before commissioning, and revisit it after a month of real data, because the real change rate is almost never what you guessed. For longer retention and much higher volumes, see {{lesson:db-timeseries}} and {{lesson:db-historians}}.
`,

  eli5: `
Imagine you keep a diary of the temperature outside. You could write down the temperature every single second, but you would fill a library and most pages would say "still 20 degrees."

Smarter diary rules: only write when the temperature changes by a degree. That's one rule. Another rule says write on the hour, every hour, even if nothing changed, so you can prove you were still paying attention.

Then you have the shelf problem. A year of diary is heavy. So you keep one notebook per month and, when a notebook is old enough, you throw the whole notebook away in one go instead of tearing out pages. And there is an index card that says which notebook covers which dates, so you don't search them all.

That is the historian: write only what matters, one notebook per period, throw away whole old notebooks, and an index telling you where to look.
`,

  why: `
**Why record on change instead of on a timer?** Most plant signals are flat most of the time. A tank level that sits at 72% for six hours should cost one row, not 21,600. On-change plus a heartbeat gives the information of a periodic log at a fraction of the volume. The tradeoff is that analyses that assume regular sampling (spreadsheets, some statistics) must resample. Ignition's query layer does that for you, which is why you ask for a return size instead of raw rows.

**Why a deadband at all?** Analog instruments are noisy. A level transmitter flickering by 0.01% would create a row every scan. Deadbands filter noise. The tension is real: a wide deadband saves disk and hides events, a narrow one preserves detail and fills the database. Experienced integrators set the deadband at the sensor's noise floor and revisit it when storage grows.

**Why partitions?** Dropping a table is cheap, deleting 40 million rows is not. Partitioning also keeps indexes small and lets recent queries touch only recent tables. The price is complexity: you must treat the historian tables as Ignition's, not yours.

**Why did 8.3 add the Core Historian?** Pairing a general SQL database with a time-series workload means tuning indexes and partitions you may not know how to manage. A purpose-built time-series store removes that burden and speeds up reads and writes, in exchange for data living on the Gateway's disk rather than in your database. Teams that already run a corporate SQL standard may still prefer SQL for access by other tools. That is a real design argument, not a settled one.
`,

  history: `
Ignition's Tag Historian has stored data in SQL tables for many Ignition versions, so any report tool could read history with ordinary queries. Version 8.3 added the Core Historian, built on the open-source QuestDB time-series database, to give new installs a zero-setup option with faster reads and writes.
`,

  examples: [
    {
      title: "Choosing settings for three signals",
      body: `**M101 \`Sts/Running\` (boolean):** On Change, discrete, deadband 0, max time between records 1 hour. **LT101 level (0 to 5.0 m, noise around 0.01 m):** On Change, analog, deadband 0.02, max time 5 minutes. **Energy meter total (kWh, always rising):** Periodic every 60 s or a tag group, discrete. A change-triggered record would add a row every scan with little value.`
    },
    {
      title: "Why the old trend vanished after a rename",
      body: `A tag \`Plant1/Area10/Line1/Mixer1/Temp\` is renamed to \`Plant1/Area10/Line1/Mixer01/Temp\`. The Historian retires the old \`sqlth_te\` row and starts a new tag id. A trend bound to the new path starts empty. Add the old path as a second pen, or query both and join the results.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 210" role="img" aria-label="Tag change flows through sample mode and deadband, then store-and-forward, into a data partition table; sqlth_te and sqlth_partitions are lookup tables">
  <defs><marker id="ign-historian-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box" x="20" y="60" width="100" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="70" y="90">Tag value</text>
  <line class="dg-line" x1="120" y1="85" x2="150" y2="85" marker-end="url(#ign-historian-ah)"/>
  <rect class="dg-box-accent" x="155" y="60" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="220" y="80">Sample mode</text>
  <text class="dg-text-muted dg-mid" x="220" y="98">+ deadband</text>
  <line class="dg-line" x1="285" y1="85" x2="315" y2="85" marker-end="url(#ign-historian-ah)"/>
  <rect class="dg-box" x="320" y="60" width="120" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="380" y="80">Store and</text>
  <text class="dg-text-sm dg-mid" x="380" y="98">forward</text>
  <line class="dg-line" x1="440" y1="85" x2="470" y2="85" marker-end="url(#ign-historian-ah)"/>
  <rect class="dg-box-accent" x="475" y="60" width="145" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="547" y="80">sqlt_data_1_</text>
  <text class="dg-text-sm dg-mid" x="547" y="98">2026_10</text>
  <rect class="dg-box" x="320" y="140" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="385" y="167">sqlth_te (tag ids)</text>
  <rect class="dg-box" x="470" y="140" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="545" y="167">sqlth_partitions</text>
  <line class="dg-line" x1="385" y1="140" x2="400" y2="112" marker-end="url(#ign-historian-ah)"/>
  <line class="dg-line" x1="545" y1="140" x2="547" y2="112" marker-end="url(#ign-historian-ah)"/>
</svg>`
  },

  pitfalls: [
    "Historizing every tag 'just in case' with no deadband, then running out of disk in months.",
    "Using a wide deadband to save space and later discovering the event you needed was filtered out.",
    "Deleting sqlt_data tables manually without cleaning sqlth_partitions.",
    "Enabling pruning on two providers that share the same database.",
    "Trending an Average over a long window and missing short spikes. Use MinMax or Maximum.",
    "Renaming tags and expecting history to follow automatically."
  ],

  keyTerms: ["tag-historian", "history-partition", "data-pruning", "historian-deadband-style", "ign-tag-group", "store-and-forward", "questdb", "historian", "deadband"],

  quiz: [
    {
      q: "A level signal sits flat for hours with small noise. Which setup stores it most efficiently while still catching real moves?",
      options: ["On Change, analog deadband sized near the noise floor, with a maximum time between records", "Periodic every second", "On Change, deadband 0", "Tag group at 100 ms"],
      answer: 0,
      explain: [
        "Correct. Noise is filtered, real changes are kept, and the heartbeat row proves the system is alive.",
        "That records 86,400 rows a day of mostly identical values.",
        "Every noise flicker would create a row.",
        "That is even more rows than a one-second periodic."
      ]
    },
    {
      q: "Why does the SQL Historian store a tagid rather than the tag path in each data row?",
      options: ["To hide tag names for security", "Because paths can't be stored in SQL", "To make rows narrow, with paths looked up in sqlth_te", "To make renames automatic"],
      answer: 2,
      explain: [
        "It is a storage optimization, not a security feature.",
        "Strings can be stored. They are just wasteful at this scale.",
        "Correct. A small integer per row saves enormous space across millions of rows.",
        "Renames actually create a new sqlth_te entry."
      ]
    },
    {
      q: "What does pruning do in the SQL Historian?",
      options: ["Deletes individual old rows nightly", "Compresses the oldest rows", "Moves old data to the Core Historian", "Drops entire partition tables whose newest data is older than the prune age"],
      answer: 3,
      explain: [
        "That would be slow and bloat the tables, the exact problem partitions avoid.",
        "Pruning removes data. It does not compress it.",
        "Pruning only deletes.",
        "Correct. Dropping a partition is fast, and it means data lives slightly beyond the nominal age."
      ]
    },
    {
      q: "A trend shows hourly Average temperature and never exceeds 80, but operators say the tank hit 95 for two minutes. What is the likely cause?",
      options: ["The historian lost data", "Averaging smoothed over the spike; use MinMax or Maximum", "The partition was pruned", "Quality was bad"],
      answer: 1,
      explain: [
        "Raw data is probably intact. The aggregate hid the event.",
        "Correct. A two-minute spike barely moves an hourly average.",
        "Pruned data would be missing, not smoothed.",
        "Bad quality would show as gaps or flagged data."
      ]
    },
    {
      q: "5,000 tags change every 10 s on average and a row costs about 50 bytes. About how much raw data per day before compression?",
      options: ["220 MB", "22 GB", "2.2 GB", "220 GB"],
      answer: 2,
      explain: [
        "That is ten times too small.",
        "That is ten times too large.",
        "Correct. 500 rows/s × 86,400 s × 50 B is about 2.2 GB.",
        "That is a hundred times too large."
      ]
    },
    {
      q: "Which is true of the 8.3 Core Historian compared with the SQL Historian?",
      options: ["It stores data on the Gateway using QuestDB and does not use store-and-forward", "It requires an external SQL database", "It uses sqlth_te tables", "It is only available in Ignition Edge"],
      answer: 0,
      explain: [
        "Correct. It writes to local disk through a write-ahead log.",
        "Needing no external database is its main attraction.",
        "Those tables belong to the SQL Historian.",
        "It is part of the Historian module in standard Ignition 8.3."
      ]
    }
  ],

  resources: [
    { title: "Historian (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian", type: "docs", source: "Inductive Automation" },
    { title: "Core Historian (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian/tag-history-providers/internal-historian-questdb", type: "docs", source: "Inductive Automation" },
    { title: "History Providers (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian/tag-history-providers", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Database Table Reference", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/reference-pages/ignition-database-table-reference", type: "docs", source: "Inductive Automation" },
    { title: "Configuring Tag History", url: "https://inductiveuniversity.com/videos/configuring-tag-history/8.3", type: "video", source: "Inductive University" },
    { title: "Ignition 8.3.0: Universal Historian Solution, Event Streams and more", url: "https://inductiveautomation.com/blog/ignition-830-universal-historian-solution-event-streams-new-perspective-drawing-tools-so-much-more", type: "article", source: "Inductive Automation" },
    { title: "History data table clean on tag deletion?", url: "https://forum.inductiveautomation.com/t/history-data-table-clean-on-tag-deletion/35360", type: "forum", source: "Inductive Automation Forum" }
  ]
});
