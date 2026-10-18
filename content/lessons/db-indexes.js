LC.lesson({
  id: "db-indexes",
  title: "Indexes and query performance",
  track: "db",
  minutes: 25,
  level: 3,
  prereqs: ["db-schema"],
  tags: ["index", "b-tree", "performance", "execution-plan", "sql"],
  summary: "Why a query on 50 million production rows takes 40 seconds or 40 milliseconds, and how to read the plan that tells you which.",
  objectives: [
    "Describe how a B-tree index finds a row without reading the whole table",
    "Explain clustered vs nonclustered indexes and what a covering index avoids",
    "Choose the column order in a composite index using the leftmost-prefix rule",
    "Explain why an index on the timestamp column matters for production and downtime data",
    "Read an execution plan and spot a full table scan",
    "State the write cost of indexes and decide how many are too many"
  ],

  body: `
## What an index is

Without help, a database answers \`WHERE start_time >= '2026-03-02'\` by reading every row in the table and checking each one. That is a **table scan**, and its cost grows with the table. A {{term:database-index|database index}} is a second, sorted structure that lets the database jump to the matching rows. It is the same idea as the index at the back of a book: sorted terms, each with a page number.

This matters to an integrator because plant tables only grow. A downtime table with a few hundred rows feels fine on day one. After two years of count logging at one row per minute per machine it holds millions, and the same Perspective screen that loaded instantly now times out.

## B-tree intuition

Almost every index you create is a {{term:b-tree|B-tree}}. Picture a phone book. You do not read from page one; you open to the middle, see you are at "M", flip left or right, and narrow down in a handful of steps. A B-tree does this with a wide, shallow tree: each node holds hundreds of sorted keys and pointers to the next level down.

{{diagram:btree}}

Because each node is so wide, the tree stays very shallow. The depth depends on key width and page size, but even for tens of millions of rows it stays small, so finding one row costs a handful of page reads instead of millions (check your engine's index-size view or the query plan to see the real numbers). The leaf level is sorted and linked, which also makes **range** scans efficient: find the first leaf for \`2026-03-02 00:00\`, then walk right until you pass \`2026-03-03 00:00\`. That is exactly the shape of time-based plant queries.

## Clustered vs nonclustered

| | Clustered index | Nonclustered (secondary) index |
|---|---|---|
| What it is | The table's rows are physically stored in index order | A separate structure holding key values plus a pointer to the row |
| How many per table | One | Many |
| Lookup cost | Straight to the row | Find the entry, then a second hop to fetch the row (a "lookup") |
| Typical default | The primary key (SQL Server, MySQL InnoDB) | Everything you add with CREATE INDEX |

In MySQL's InnoDB engine the primary key is always the clustered index, and every secondary index stores the primary key value as its pointer. SQL Server lets you pick which index is clustered; by default it is the primary key. PostgreSQL stores tables as heaps (unordered) and all its indexes are what other systems would call nonclustered.

One consequence: a wide primary key (a long string, say) is copied into every secondary index, so a compact integer surrogate key keeps all your indexes smaller.

## Composite indexes and column order

A composite index covers several columns, such as \`(machine_id, start_time)\`. The entries are sorted by the first column, then by the second within each first-column value. That makes **order** critical, because the index can only be used from the left (the leftmost-prefix rule).

\`\`\`sql
CREATE INDEX ix_downtime_machine_start
  ON downtime_event (machine_id, start_time);
\`\`\`

| Query | Uses the index? |
|---|---|
| \`WHERE machine_id = 7\` | Yes, prefix \`machine_id\` |
| \`WHERE machine_id = 7 AND start_time >= '2026-03-01'\` | Yes, both columns, best case |
| \`WHERE start_time >= '2026-03-01'\` | Not efficiently. \`start_time\` is not the leftmost column |
| \`WHERE machine_id = 7 ORDER BY start_time\` | Yes, and no sort step is needed |

Guidance for choosing the order: put columns tested with **equality** first and the column tested with a **range** (like a time window) last. Put the more selective equality column first when everything else is equal. If you also run plant-wide queries by time alone, add a separate index on \`(start_time)\`.

## Covering indexes

A **covering index** contains every column a query needs, so the database answers from the index and never visits the table. Suppose the Pareto query is:

\`\`\`sql
SELECT reason_id, COUNT(*) AS events
FROM downtime_event
WHERE start_time >= '2026-03-01' AND start_time < '2026-04-01'
GROUP BY reason_id;
\`\`\`

An index on \`(start_time, reason_id)\` holds both columns the query touches, so it is covering. SQL Server also offers \`INCLUDE\` columns to ride along in the leaf level without being part of the sort key. The trade: wider indexes cost more space and more write work, so cover your hottest queries, not all of them.

## Why the timestamp index matters

Nearly every production and downtime question has a time window: this shift, this week, since the last changeover. If \`production_count\` has 50 million rows and no index on its timestamp, "yesterday's counts" scans all 50 million. With an index it reads about 1,440 rows per machine for a day of per-minute data.

> [!example] The slow shift report
> A shift report query takes 38 seconds on a table of 30 million count rows. Adding \`CREATE INDEX ix_count_machine_time ON production_count (machine_id, count_time);\` drops it to under 100 ms. Nothing else changed. The query was already correct; it was just scanning the whole table.

Index the selective columns that appear in \`WHERE\`, \`JOIN ... ON\` and \`ORDER BY\` of queries you have measured, not every column you can think of. Foreign key columns used in joins are the usual forgotten ones: PostgreSQL and SQL Server do not index them automatically.

## Reading an execution plan

An {{term:execution-plan|execution plan}} shows how the database will (or did) run a query. Ask for it with \`EXPLAIN\` (MySQL, PostgreSQL) or the Display Estimated Execution Plan button in SQL Server Management Studio. Add \`ANALYZE\` in PostgreSQL to run the query and see real timings.

\`\`\`text
Seq Scan on production_count  (cost=0.00..812345.00 rows=48 width=24)
  Filter: (machine_id = 7 AND count_time >= '2026-03-02')
  Rows Removed by Filter: 29999952
\`\`\`

The words to hunt for:

| Plan says | Meaning | Reaction |
|---|---|---|
| Seq Scan / Table Scan / type: ALL | Reads every row | Fine for tiny tables, a red flag for big ones |
| Index Scan / Index Seek / type: ref, range | Uses an index to find rows | What you want |
| Index Only Scan / Using index | Covering index, no table visit | Best case |
| Sort | Rows had to be sorted afterward | Column order of the index may be off |
| Rows Removed by Filter very large | Reading far more than returned | Missing or wrong index |

After adding \`ix_count_machine_time\`, the same query shows an index scan reading about 48 rows. Always compare the plan before and after. Do not trust a guess.

> [!tip] Check what the optimizer actually did
> Small tables are scanned even when an index exists because that is cheaper. Test on a table the size of your real data, or the plan will mislead you.

## The write cost

Every index is a second copy of some columns, kept sorted. Each INSERT must also insert into every index, and each UPDATE of an indexed column must move its entry. Inserts that land in the middle of a B-tree can split pages. Time-ordered keys are friendly here because new rows append at the right edge.

| Indexes on table | Read speed | Insert speed | Disk |
|---|---|---|---|
| None beyond PK | slow for filters | fastest | smallest |
| 2 or 3 targeted | fast for known queries | slightly slower | moderate |
| 10 on every column | marginal gain | noticeably slower | large |

For a table that takes one insert per second per machine, even ten indexes are fine. For a table fed by a high-rate logger, keep to the few that serve real queries and drop the rest. Review unused indexes periodically; both PostgreSQL (\`pg_stat_user_indexes\`) and SQL Server (\`sys.dm_db_index_usage_stats\`) track how often each one is used.
`,

  eli5: `
Think of a huge library with a million books thrown on the shelves in whatever order they arrived. To find every book about pumps, you would have to pick up every single book. That is slow, and it gets slower with every book added.

Now imagine the librarian keeps a card catalog: cards sorted by topic, each card saying which shelf the book is on. You flip to "pumps," read the shelf numbers and walk straight there.

An index is that card catalog. The cost is that when a new book arrives, the librarian must file a new card as well as shelving the book, and the card drawers take up room. A catalog for every possible question would fill the whole building, so you only keep cards for the questions people actually ask.

A covering index is a card that carries the answer itself, so you never walk to the shelf at all.
`,

  why: `
**Why do production tables need indexes more than most?** They are append-only and time-ordered, so they grow forever, while the questions people ask always cover a narrow slice of time. The ratio of rows stored to rows needed is huge, which is the exact situation an index exists for.

**Why not index everything?** Indexes are not free. Each one slows every write, consumes disk and memory (a poorly chosen index can push useful data out of the cache), and adds work for backups. On a busy logging table, a pile of indexes added "just in case" is a common cause of insert latency that makes store-and-forward buffers back up. The discipline is to add an index when a measured query needs it, and to verify the plan used it.

**Why argue about column order?** Because the same two columns in a different order serve different queries. \`(machine_id, start_time)\` serves "this machine, this window". \`(start_time, machine_id)\` serves "everything in this window". Integrators who index by habit often end up with the wrong one and see no improvement. The leftmost-prefix rule lets you reason about it instead of guessing.

**What about the optimizer deciding for itself?** The database picks the plan from statistics about your data. Stale statistics can make it choose a bad plan, which is why a query that was fast last month can suddenly crawl. Updating statistics (ANALYZE in PostgreSQL, UPDATE STATISTICS in SQL Server) is part of routine maintenance, and {{lesson:db-operations}} touches on it.
`,

  history: `
The B-tree was invented by Rudolf Bayer and Edward McCreight at Boeing in 1970 and described in a paper published in 1972. It was designed for disk storage, where reading one big block is almost as cheap as reading a little, so wide nodes with many keys per block made sense. More than fifty years later it is still the default index type in PostgreSQL, MySQL and SQL Server.
`,

  examples: [
    {
      title: "Choosing an index for the OEE downtime query",
      body: `The OEE report asks: for line 2, total downtime minutes per machine for last week. The filter is \`machine_id IN (...)\` and a start_time range, and it groups by machine. An index on \`(machine_id, start_time)\` serves the equality-then-range shape. Adding \`duration_min\` as an INCLUDE column (SQL Server) or as a third key column lets the database sum durations from the index alone.`
    },
    {
      title: "The index that wasn't used",
      body: `A query uses \`WHERE DATE(start_time) = '2026-03-02'\`. An index on \`start_time\` exists but the plan shows a table scan, because wrapping the column in a function hides it from the index. Rewrite as \`WHERE start_time >= '2026-03-02' AND start_time < '2026-03-03'\` and the plan switches to an index range scan.`
    }
  ],

  diagrams: {
    btree: `<svg viewBox="0 0 640 250" role="img" aria-label="A B-tree index: a root node splits the key range, branch nodes narrow it, and linked leaf nodes hold sorted timestamps with row pointers">
  <defs>
    <marker id="db-indexes-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="24">Find start_time = 03-02 08:15</text>
  <rect class="dg-box-accent" x="240" y="36" width="160" height="38" rx="5"/>
  <text class="dg-text-sm dg-mid" x="320" y="60">root: 03-01 | 03-03</text>
  <rect class="dg-box" x="60" y="110" width="160" height="38" rx="5"/>
  <text class="dg-text-sm dg-mid" x="140" y="134">branch: &lt; 03-01</text>
  <rect class="dg-box-accent" x="240" y="110" width="160" height="38" rx="5"/>
  <text class="dg-text-sm dg-mid" x="320" y="134">branch: 03-01 to 03-03</text>
  <rect class="dg-box" x="420" y="110" width="160" height="38" rx="5"/>
  <text class="dg-text-sm dg-mid" x="500" y="134">branch: &gt;= 03-03</text>
  <line class="dg-line" x1="290" y1="74" x2="150" y2="108" marker-end="url(#db-indexes-ah)"/>
  <line class="dg-line-accent" x1="320" y1="74" x2="320" y2="108" marker-end="url(#db-indexes-ah)"/>
  <line class="dg-line" x1="350" y1="74" x2="490" y2="108" marker-end="url(#db-indexes-ah)"/>
  <rect class="dg-box" x="60" y="190" width="160" height="38" rx="5"/>
  <text class="dg-text-sm dg-mid" x="140" y="214">leaf: sorted keys</text>
  <rect class="dg-box-accent" x="240" y="190" width="160" height="38" rx="5"/>
  <text class="dg-text-sm dg-mid" x="320" y="208">leaf: 03-02 08:15</text>
  <text class="dg-text-muted dg-mid" x="320" y="223">&gt; row pointer</text>
  <rect class="dg-box" x="420" y="190" width="160" height="38" rx="5"/>
  <text class="dg-text-sm dg-mid" x="500" y="214">leaf: sorted keys</text>
  <line class="dg-line" x1="140" y1="148" x2="140" y2="188" marker-end="url(#db-indexes-ah)"/>
  <line class="dg-line-accent" x1="320" y1="148" x2="320" y2="188" marker-end="url(#db-indexes-ah)"/>
  <line class="dg-line" x1="500" y1="148" x2="500" y2="188" marker-end="url(#db-indexes-ah)"/>
  <line class="dg-dash" x1="220" y1="209" x2="238" y2="209"/>
  <line class="dg-dash" x1="400" y1="209" x2="418" y2="209"/>
  <text class="dg-text-muted" x="20" y="246">Leaves are linked in order, so a range scan walks right.</text>
</svg>`
  },

  pitfalls: [
    "Adding an index per column instead of one composite index that matches the real query.",
    "Wrapping an indexed column in a function (DATE(col), CAST, YEAR) so the index cannot be used.",
    "Testing on a 1,000-row dev table and never seeing the scan that appears at 30 million rows.",
    "Indexing every column of a high-rate logging table and slowing inserts until buffers back up.",
    "Forgetting to index foreign key columns that appear in joins.",
    "Trusting that an index is used without checking the execution plan."
  ],

  keyTerms: ["database-index", "b-tree", "clustered-index", "composite-index", "covering-index", "execution-plan"],

  quiz: [
    {
      q: "A table has an index on (machine_id, start_time). Which query can NOT use that index efficiently?",
      options: ["WHERE machine_id = 7", "WHERE machine_id = 7 AND start_time >= '2026-03-01'", "WHERE start_time >= '2026-03-01'", "WHERE machine_id = 7 ORDER BY start_time"],
      answer: 2,
      explain: [
        "machine_id is the leftmost column, so this uses the index.",
        "Both columns match from the left, which is the best case.",
        "Correct. start_time is not the leftmost column, so the index cannot be used for an efficient seek. A separate (start_time) index would help.",
        "The index returns rows already sorted by start_time within a machine, so no sort is needed."
      ]
    },
    {
      q: "Why does a B-tree index on 50 million rows take only a few page reads to find one row?",
      options: ["It stores a copy of the table in memory", "Each node holds many sorted keys, so the tree stays only a few levels deep", "It hashes the key to a direct location", "It only indexes the most recent rows"],
      answer: 1,
      explain: [
        "Indexes live on disk and are cached like other pages. They don't require the whole table in memory.",
        "Correct. Wide nodes mean a very shallow tree, so a lookup touches one node per level.",
        "Hash indexes work that way. B-trees narrow down by comparing sorted keys, which is also why they support ranges.",
        "A standard index covers every row."
      ]
    },
    {
      q: "A query is slow and the plan says 'Seq Scan ... Rows Removed by Filter: 29,999,952' with 48 rows returned. What's the best first step?",
      options: ["Add RAM to the database server", "Create an index matching the WHERE columns, then re-check the plan", "Rewrite the app to fetch all rows and filter in Ignition", "Drop the primary key"],
      answer: 1,
      explain: [
        "More RAM may hide it briefly, but the query still reads 30 million rows.",
        "Correct. The plan shows nearly all rows read and discarded. An index on the filter columns lets the database read about 48 rows.",
        "That moves the full scan and network transfer to the gateway, which is worse.",
        "The primary key is usually the clustered index and supports lookups. Removing it harms performance."
      ]
    },
    {
      q: "What does a covering index let the database skip?",
      options: ["Checking the WHERE clause", "Visiting the table, because the index already has every column the query needs", "Maintaining the index on INSERT", "Sorting the index"],
      answer: 1,
      explain: [
        "The WHERE clause is still evaluated.",
        "Correct. All needed columns come from the index leaf, so no table lookup happens.",
        "A covering index is still an index and is still maintained on every write.",
        "It is stored sorted either way."
      ]
    },
    {
      q: "A logger inserts 2,000 rows per second into a table with 12 indexes. Inserts lag and store-and-forward is buffering. What is the likeliest cause and fix?",
      options: ["Indexes only help reads, so they are harmless to writes", "Each insert updates 12 indexes, so drop the ones no real query uses", "The primary key is too small", "The B-tree is too shallow"],
      answer: 1,
      explain: [
        "Every INSERT must also add an entry to every index on the table.",
        "Correct. Write cost scales with index count. Review index usage statistics and keep only the ones serving real queries.",
        "Compact integer keys are good for performance.",
        "Shallow trees are a strength. They mean fewer reads per lookup."
      ]
    },
    {
      q: "Your query uses WHERE DATE(start_time) = '2026-03-02' and ignores an index on start_time. What fix lets the index be used?",
      options: ["Add another index on DATE(start_time) using a different column name", "Rewrite as start_time >= '2026-03-02' AND start_time < '2026-03-03'", "Convert start_time to text", "Add ORDER BY start_time"],
      answer: 1,
      explain: [
        "Some databases support functional indexes, but the simpler range rewrite needs no new index.",
        "Correct. A range on the bare column lets the optimizer seek into the index.",
        "Text comparisons would make date handling worse and still hide the original column type.",
        "Sorting doesn't change whether the filter can use the index."
      ]
    }
  ],

  resources: [
    { title: "MySQL 8.0 Reference: Multiple-Column Indexes", url: "https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html", type: "docs", source: "MySQL" },
    { title: "MySQL 8.0 Reference: Optimization and Indexes", url: "https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html", type: "docs", source: "MySQL" },
    { title: "MySQL 8.0 Reference: Optimizing InnoDB Queries", url: "https://dev.mysql.com/doc/refman/8.0/en/optimizing-innodb-queries.html", type: "docs", source: "MySQL" },
    { title: "MySQL Reference: How MySQL Uses Indexes", url: "https://dev.mysql.com/doc/en/mysql-indexes.html", type: "docs", source: "MySQL" },
    { title: "Database Query Browser (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/platform/designer/designer-tools/database-query-browser", type: "docs", source: "Inductive Automation" }
  ]
});
