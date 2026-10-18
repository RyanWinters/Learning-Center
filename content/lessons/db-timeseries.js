LC.lesson({
  id: "db-timeseries",
  title: "Time-series data in SQL and historian tables",
  track: "db",
  minutes: 25,
  level: 3,
  prereqs: ["db-indexes", "ign-historian"],
  tags: ["historian", "time-series", "partitioning", "sqlth", "storage"],
  summary: "What the Ignition historian actually writes into your database, how its tables fit together, and why you let the scripting API do the joining.",
  objectives: [
    "Name the historian metadata tables and the partitioned data tables, and say what each holds",
    "Walk through how a history query finds the right tag and the right monthly table",
    "Explain partitioning and partition pruning, and why dropping a partition beats deleting rows",
    "Compare wide and narrow time-series table designs",
    "Explain why history should be read through the historian API instead of raw SQL",
    "Estimate storage growth from tag count and change rate"
  ],

  body: `
## Time-series data is a different shape

Production counts and downtime events are *business* records: a few thousand rows a day, each with meaning. Time-series data is *signal* data: a value, a timestamp, and a very large number of them. A single tag logged once per second makes 86,400 rows a day. Two thousand tags make 172 million. The access pattern is also different: rows are written once, almost never updated, and read in time windows ("tag X between 06:00 and 14:00").

You can store this in an ordinary SQL table, and for modest volumes people do. The Ignition Tag Historian does exactly that, on top of whatever database you connected. Understanding its layout makes you far better at sizing, troubleshooting and cleaning up a historian database. For the feature-level view, see {{lesson:ign-historian}}.

## The historian tables

When you enable history on tags, the module creates a set of tables in your connected database. Four are worth knowing by name.

| Table | Role | Key columns |
|---|---|---|
| \`sqlth_drv\` | One row per historian "driver": which gateway and tag provider wrote the data | \`id\`, \`name\`, \`provider\` |
| \`sqlth_scinfo\` | Scan class (tag group) info, linked to a driver | \`id\`, \`drvid\`, \`scname\` |
| \`sqlth_te\` | **Tag entries**: one row per historical tag configuration | \`id\`, \`tagpath\`, \`scid\`, \`datatype\`, \`created\`, \`retired\` |
| \`sqlth_partitions\` | A map from time ranges to data tables | \`pname\`, \`drvid\`, \`start_time\`, \`end_time\` |
| \`sqlt_data_X_YYYY_MM\` | The actual values, one table per partition | \`tagid\`, \`intvalue\`, \`floatvalue\`, \`stringvalue\`, \`datevalue\`, \`dataintegrity\`, \`t_stamp\` |

The data tables are named \`sqlt_data_<driverId>_<year>_<month>\` for the default monthly partition size, so \`sqlt_data_1_2026_10\` holds October 2026 for driver 1. If you choose a different partition size, the suffix and table names change, so read \`sqlth_partitions\` for the real names instead of guessing them.

### What a data row looks like

| tagid | intvalue | floatvalue | stringvalue | datevalue | dataintegrity | t_stamp |
|---|---|---|---|---|---|---|
| 42 | NULL | 118.6 | NULL | NULL | 192 | 1792195260000 |
| 42 | NULL | 118.9 | NULL | NULL | 192 | 1792195261000 |
| 57 | 1 | NULL | NULL | NULL | 192 | 1792195261250 |

Two details trip people up:

- \`t_stamp\` is **milliseconds since 1970-01-01 UTC** in a BIGINT, not a SQL timestamp. 1792195200000 is 2026-10-17 00:00 UTC.
- The value goes in one of four typed columns, chosen by the tag's \`datatype\` in \`sqlth_te\`. The others are NULL. \`dataintegrity\` holds the quality code. The 192 shown above is an example from the older numbering, and Ignition 8 changed quality codes, so check the table reference for your version before relying on any number. In scripts and expressions never compare to 192. Use \`isGood()\` or \`.quality.isGood()\`.

### Tag versions

A row in \`sqlth_te\` represents one *version* of a tag's history configuration. Rename a tag or change its data type and the old row is retired and a new row is created with a new \`id\`. The same tag can therefore own several ids over its life, and the historian stitches them together by path when you query.

## How a query joins them

To read raw history for one tag from SQL you must do the historian's job by hand:

1. Look up the tag in \`sqlth_te\` by path to get its \`id\` (all non-retired and retired versions).
2. Look in \`sqlth_partitions\` for the tables whose \`start_time\`/\`end_time\` overlap your window.
3. Query each of those \`sqlt_data_*\` tables, filtering by \`tagid\` and \`t_stamp\`.
4. UNION the results.

\`\`\`sql
-- One tag, one day, all inside October 2026 (partition sqlt_data_1_2026_10).
-- No quality filter here: quality codes are version-dependent. The historian API filters quality for you.
SELECT te.tagpath, d.t_stamp, d.floatvalue
FROM sqlt_data_1_2026_10 d
JOIN sqlth_te te ON te.id = d.tagid
WHERE te.tagpath = 'plant1/area10/line1/m101/sts/speed'
  AND d.t_stamp >= 1792195200000   -- 2026-10-17 00:00 UTC
  AND d.t_stamp <  1792281600000   -- 2026-10-18 00:00 UTC
ORDER BY d.t_stamp;
\`\`\`

{{diagram:join}}

That works for one day inside one month. Cross a month boundary and you need a second table name in a UNION, built dynamically. Query "last 90 days" and you may touch four tables. Tag path matching also has quirks (the stored path is normalized, typically to lowercase, and provider handling differs between historian setups, so check what \`sqlth_te\` actually holds), and the gateway tracks the table names so the query does not have to.

## Partitioning and pruning

**Partitioning** splits one logical table into many physical pieces, here by time. It gives you two big wins.

**Pruning.** A query for last Tuesday needs only October's table. The other tables are never opened. Each partition also has its own index on tag id and time, so those indexes stay smaller and fit in memory.

**Cheap retention.** Deleting 400 million rows with \`DELETE FROM ... WHERE t_stamp < ...\` is slow, generates enormous transaction logs and fragments the table. Dropping an entire monthly table is nearly instant. The historian's own **data pruning** setting (a retention age in the history provider's configuration) works this way, removing old partitions and their \`sqlth_partitions\` rows together.

> [!warning] Never drop a data table by hand
> If you drop a \`sqlt_data_*\` table without removing its \`sqlth_partitions\` row, the historian still believes the data exists and queries error out. Use the provider's pruning settings, or remove both the table and the partition row inside a maintenance window.

Choose the partition size by volume. Monthly suits most plants. If a single month would hold hundreds of millions of rows, daily partitions keep each table and its index manageable.

## Wide vs narrow tables

The historian uses a **narrow** (tall) layout: one row per sample, with the tag identified by a column. The alternative is a **wide** layout, one column per tag.

| | Narrow (tagid, value, t_stamp) | Wide (t_stamp, tag1, tag2, ... tagN) |
|---|---|---|
| Adding a tag | Insert a row in \`sqlth_te\`, no schema change | ALTER TABLE, and column limits apply |
| Tags changing at different rates | Stores only what changed | Stores every column on every row, many NULLs or repeats |
| Storage per value | Larger (key + timestamp each time) | Smaller per value when all tags sample together |
| Query one tag over time | Needs filter on tagid | Direct column read |
| Query all tags at one instant | Needs pivot | Simple SELECT of one row |
| Fit for plants | Excellent: thousands of tags, change-based | Reasonable for a fixed set sampled in lockstep, such as a batch report |

Wide tables are what you get when a transaction group logs a handful of values into one row each cycle, which is a fine design for a defined report. For thousands of independent tags, narrow wins.

## Why use the API, not raw SQL

Ignition exposes history through scripting functions and bindings that hide all the above. In 8.3 the primary functions are in \`system.historian\` (for example \`system.historian.queryRawPoints\` and \`system.historian.queryAggregatedPoints\`). The older \`system.tag.queryTagHistory\` and \`system.tag.queryTagCalculations\` still run in legacy projects but are deprecated in favor of those.

> [!note] In 8.1
> The functions are \`system.tag.queryTagHistory\` and \`system.tag.queryTagCalculations\`. The \`system.historian\` namespace arrived with 8.3.

What the API does for you:

- Resolves tag paths to the right \`sqlth_te\` ids, across retired versions.
- Finds and queries only the partitions covering your window.
- Handles aggregation (average, min, max, the right number of points per pixel), interpolation, gaps and quality filtering.
- Works with other history providers, including remote gateways and non-SQL stores, with the same call.
- Survives internal schema changes between versions, which raw SQL does not.

Use raw SQL against these tables for administration: counting rows per partition, finding the biggest tags, checking for gaps. Never write application logic that depends on them, and never INSERT or UPDATE them directly. Inductive Automation's guidance is to use the provided functions for reads and the historian store functions for writes. In 8.3 those live in \`system.historian\` (look for \`storeDataPoints\` on the 8.3 \`system.historian\` page); in 8.1 the call is \`system.tag.storeTagHistory\`.

## Data volume math

Estimate before you buy disks. A data row is roughly 25 bytes of raw columns and about 40 to 60 bytes with row overhead and its indexes.

> [!example] Sizing a historian
> 2,000 historized tags, each changing on average once every 5 seconds.
>
> - Rows per second: 2,000 / 5 = 400
> - Rows per day: 400 x 86,400 = 34.6 million
> - Rows per month: about 1.04 billion
> - Storage at 50 bytes per row: about 52 GB per month, or about 620 GB per year
>
> Switch the same tags from "on change, no deadband" to a 1% deadband and an analog that jitters might drop 90 percent. Tuning deadbands and logging only what you use is the cheapest storage you will ever buy.

Business tables look tiny next to this. 100 machines writing one count row per minute is 144,000 rows a day, about 53 million a year. That is why production schemas ({{lesson:db-project}}) and historian tables live side by side, with very different tuning.
`,

  eli5: `
Imagine you keep a diary where, every second, you write down the temperature of your oven. After a day the diary has 86,400 lines. After a year, it fills a room.

Nobody wants one giant diary. So you start a new notebook each month and keep a little index card on the shelf: "October notebook covers Oct 1 to Oct 31." When a friend asks, "What was the oven at lunch on October 17th?", you glance at the cards, pull out only the October notebook, and look inside. The other eleven notebooks stay on the shelf.

When a notebook is too old to care about, you recycle the whole cover instead of ripping out a million pages one by one.

The Ignition historian does this in a database. Each notebook is a table, the index cards are a table of time ranges, and a third table lists which oven or sensor each number belongs to. You could read all of that by hand, but the historian already knows the shelf layout, so you ask it politely and it fetches the right page.
`,

  why: `
**Why does the historian use many monthly tables instead of one?** A single table with billions of rows has a huge index, slow maintenance, and no cheap way to age data out. Monthly tables keep each index small, let queries skip irrelevant months, and make retention a table drop. The cost is the lookup layer (\`sqlth_partitions\`) that the historian maintains, which is exactly why you shouldn't go around it.

**Why narrow instead of wide?** Plants add tags constantly, and tags change at different rates. A wide table needs a schema change per tag and writes a full row even when one value moved. Narrow storage is schema-stable and stores only what changed. The tradeoff is more bytes per value and the need to reshape results for tables and reports. Experienced integrators argue about this in the other direction too: for a fixed batch report, a wide table logged by a transaction group is simpler to query and bind to.

**Why not query the tables directly if you can write SQL?** Because the layout is an implementation detail. It has changed between major versions and may again. Tag renames, retired versions, partition boundaries, quality filtering and aggregation all live in the historian's code. Teams that hand-rolled queries against \`sqlt_data\` tables have broken reports when a tag was renamed or a month rolled over. Staff on the Inductive Automation forum consistently point people at the scripting functions for the same reason.

**Why does this belong in a database course?** Because the historian shares your database server with your production schema. A runaway history volume that exhausts disk or I/O hurts the MES tables too. Many sites put the historian in its own database or instance for that reason. For commercial and purpose-built alternatives, see {{lesson:db-historians}}.
`,

  history: `
Process historians date from the 1980s, when vendors such as OSIsoft (PI) built proprietary compressed stores, because relational databases of the day could not absorb thousands of writes per second at an acceptable price. Ignition's historian took the opposite route: it stores data in standard SQL databases, using partitioned narrow tables so the same data is open to ordinary SQL tools. The sqlth_ metadata design with sqlth_te, sqlth_partitions and per-period sqlt_data tables is the layout current Ignition versions still use.
`,

  examples: [
    {
      title: "Finding the heaviest tags",
      body: `A DBA asks which tags are filling the disk. Counting rows per tag in the current partition answers it: \`SELECT te.tagpath, COUNT(*) FROM sqlt_data_1_2026_10 d JOIN sqlth_te te ON te.id = d.tagid GROUP BY te.tagpath ORDER BY 2 DESC\`. The top few are almost always noisy analog tags with no deadband. Adding a deadband in the tag history settings cuts rows without losing useful detail.`
    },
    {
      title: "Reading history the supported way",
      body: `In an 8.3 script, \`system.historian.queryRawPoints\` takes the tag paths and a start and end time and returns the values, without your code knowing any table names. A Perspective Power Chart or Easy Chart binds to the same history provider with no SQL at all. Your SQL stays for production and downtime tables.`
    }
  ],

  diagrams: {
    join: `<svg viewBox="0 0 640 250" role="img" aria-label="A history query looks up the tag in sqlth_te, finds the time range in sqlth_partitions, then reads only the matching monthly sqlt_data table">
  <defs>
    <marker id="db-timeseries-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box-accent" x="20" y="20" width="170" height="52" rx="6"/>
  <text class="dg-text-sm dg-mid" x="105" y="42">Query</text>
  <text class="dg-text-mono dg-mid" x="105" y="60">tag + time window</text>
  <rect class="dg-box" x="235" y="20" width="170" height="52" rx="6"/>
  <text class="dg-text-mono dg-mid" x="320" y="42">sqlth_te</text>
  <text class="dg-text-sm dg-mid" x="320" y="60">tagpath  &gt; tagid</text>
  <rect class="dg-box" x="450" y="20" width="170" height="52" rx="6"/>
  <text class="dg-text-mono dg-mid" x="535" y="42">sqlth_partitions</text>
  <text class="dg-text-sm dg-mid" x="535" y="60">time range  &gt; table</text>
  <line class="dg-line" x1="190" y1="46" x2="233" y2="46" marker-end="url(#db-timeseries-ah)"/>
  <line class="dg-line" x1="405" y1="46" x2="448" y2="46" marker-end="url(#db-timeseries-ah)"/>
  <rect class="dg-box" x="40" y="140" width="130" height="50" rx="6"/>
  <text class="dg-text-mono dg-mid" x="105" y="161">sqlt_data_1</text>
  <text class="dg-text-mono dg-mid" x="105" y="178">_2026_08</text>
  <rect class="dg-box" x="195" y="140" width="130" height="50" rx="6"/>
  <text class="dg-text-mono dg-mid" x="260" y="161">sqlt_data_1</text>
  <text class="dg-text-mono dg-mid" x="260" y="178">_2026_09</text>
  <rect class="dg-box-accent" x="350" y="140" width="130" height="50" rx="6"/>
  <text class="dg-text-mono dg-mid" x="415" y="161">sqlt_data_1</text>
  <text class="dg-text-mono dg-mid" x="415" y="178">_2026_10</text>
  <rect class="dg-box" x="505" y="140" width="115" height="50" rx="6"/>
  <text class="dg-text-mono dg-mid" x="562" y="161">sqlt_data_1</text>
  <text class="dg-text-mono dg-mid" x="562" y="178">_2026_11</text>
  <line class="dg-line-accent" x1="535" y1="72" x2="430" y2="138" marker-end="url(#db-timeseries-ah)"/>
  <line class="dg-line-accent" x1="320" y1="72" x2="400" y2="138" marker-end="url(#db-timeseries-ah)"/>
  <text class="dg-text-sm" x="20" y="222">Pruned: tables outside the time window are never opened.</text>
  <text class="dg-text-muted" x="20" y="242">Accent table is the only one read for an October query.</text>
</svg>`
  },

  pitfalls: [
    "Treating t_stamp as a SQL timestamp. It is milliseconds since 1970 UTC.",
    "Writing application reports that query sqlt_data tables directly, then breaking them when a tag is renamed.",
    "Dropping a data table by hand without removing its sqlth_partitions row.",
    "Historizing every tag on change with no deadband and being surprised by 50 GB a month.",
    "Putting the historian and the production schema on an undersized shared database server.",
    "Inserting or updating historian tables with SQL instead of using the store functions."
  ],

  keyTerms: ["sqlth-tables", "table-partitioning", "narrow-table", "data-pruning", "historian", "deadband", "database-index"],

  quiz: [
    {
      q: "Which historian table tells the system which monthly data table covers a given time range?",
      options: ["sqlth_te", "sqlth_scinfo", "sqlth_drv", "sqlth_partitions"],
      answer: 3,
      explain: [
        "sqlth_te holds tag entries (path, datatype, id), not time ranges.",
        "sqlth_scinfo stores tag group (scan class) information.",
        "sqlth_drv identifies the gateway and provider that wrote the data.",
        "Correct. sqlth_partitions maps start and end times to the name of the sqlt_data table."
      ]
    },
    {
      q: "A row in sqlt_data_1_2026_10 has t_stamp = 1792195260000. What is that value?",
      options: ["Milliseconds since 1970-01-01 UTC", "A SQL DATETIME", "Seconds since the start of the month", "A tag id"],
      answer: 0,
      explain: [
        "Correct. Convert it to a date in your query or let the historian API do it.",
        "The column is a BIGINT, not a SQL date type.",
        "It is epoch-based, not relative to the month.",
        "The tag id is in the tagid column."
      ]
    },
    {
      q: "You must delete history older than 18 months from a 2-billion-row historian. What is the best approach?",
      options: ["DELETE FROM each table WHERE t_stamp < cutoff", "Let the history provider's pruning remove whole old partitions", "TRUNCATE sqlth_te", "Run the delete from a Perspective button"],
      answer: 1,
      explain: [
        "Row-by-row deletes are slow, write huge logs and fragment the tables.",
        "Correct. Dropping a whole partition and its sqlth_partitions row is fast and keeps metadata consistent.",
        "That erases the tag definitions and breaks every history query.",
        "The tool isn't the issue. A mass delete is the problem."
      ]
    },
    {
      q: "Why is a narrow (tagid, value, t_stamp) layout a good fit for a historian of thousands of tags?",
      options: ["It uses fewer bytes per value than any wide table", "It makes cross-tag queries at one instant trivial", "Adding a tag needs no schema change and only changed values are stored", "It avoids needing indexes"],
      answer: 2,
      explain: [
        "It usually uses more bytes per value because the tag id and timestamp repeat on every row.",
        "All-tags-at-one-instant is the case a wide table handles better, since a narrow table needs a pivot.",
        "Correct. New tags are new rows in sqlth_te, and each tag writes only when it changes.",
        "It needs indexes on tag id and time to be fast."
      ]
    },
    {
      q: "A teammate wants a custom report that SELECTs from sqlt_data_1_2026_10 joined to sqlth_te. What is the strongest argument for using the historian API instead?",
      options: ["SQL cannot join those tables", "The API is always faster than any SQL", "The API handles tag renames, partition boundaries, aggregation and quality for you and survives layout changes", "The tables are encrypted"],
      answer: 2,
      explain: [
        "SQL can join them, as shown in the lesson.",
        "Speed isn't the main reason, and hand-tuned SQL can be fast for narrow cases.",
        "Correct. The raw query only covers one partition, one tag version and no aggregation. The API deals with those cases.",
        "The tables are ordinary and readable with SQL."
      ]
    },
    {
      q: "2,000 historized tags each change about once every 4 seconds. Roughly how many rows per day does the historian write?",
      options: ["About 43 million", "About 4.3 million", "About 430 million", "About 4.3 billion"],
      answer: 0,
      explain: [
        "Correct. 500 rows per second x 86,400 seconds is 43.2 million per day.",
        "That would be about 50 rows per second, too low. 2,000 / 4 = 500 rows per second.",
        "That would need about 5,000 rows per second.",
        "That would need about 50,000 rows per second."
      ]
    }
  ],

  resources: [
    { title: "Ignition Database Table Reference", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/reference-pages/ignition-database-table-reference", type: "docs", source: "Inductive Automation" },
    { title: "Historian (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian", type: "docs", source: "Inductive Automation" },
    { title: "History Providers (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian/tag-history-providers", type: "docs", source: "Inductive Automation" },
    { title: "How the Tag Historian System Works", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/tag-historian/how-the-tag-historian-system-works", type: "docs", source: "Inductive Automation" },
    { title: "system.tag.queryTagHistory (8.1 reference)", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-tag/system-tag-queryTagHistory", type: "docs", source: "Inductive Automation" },
    { title: "Join Partitioned Historian Tables in MS SQL", url: "https://forum.inductiveautomation.com/t/join-partitioned-historian-tables-in-ms-sql/85956", type: "forum", source: "Inductive Automation Forum" },
    { title: "Ignition Historian Guide (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/tutorials/ignition-historian-guide", type: "docs", source: "Inductive Automation" }
  ]
});
