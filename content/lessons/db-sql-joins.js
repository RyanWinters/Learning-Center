LC.lesson({
  id: "db-sql-joins",
  title: "SQL II: JOINs and GROUP BY",
  track: "db",
  minutes: 15,
  level: 2,
  prereqs: ["db-sql-select"],
  tags: ["sql", "join", "group by", "aggregate", "having", "downtime", "reporting"],
  summary: "Stitch tables together on their keys, summarize with COUNT, SUM and AVG, and learn the three mistakes that quietly inflate or drop rows.",
  objectives: [
    "Explain a join as matching rows on a key, and write INNER and LEFT joins with ON",
    "Predict which rows an inner join drops and a left join keeps as NULLs",
    "Summarize with COUNT, SUM, AVG, MIN and MAX and group the result with GROUP BY",
    "Use HAVING to filter groups and WHERE to filter rows, and say when each runs",
    "Build the downtime-minutes-by-reason report and spot duplicate-row (fan-out) errors"
  ],

  body: `
## Why joins exist

In {{lesson:db-intro}} we stored \`machine_id\` in each downtime row instead of the machine's name. That keeps the data clean, but a report that says "machine 2" is useless to an operator. A **join** puts the name back by matching a key in one table to the same key in another. Together with grouping, joins produce nearly every report you will build: downtime by reason, counts by line, rejects by product.

The tables below are the same ones as before. If you skipped them, the key facts are: 7 machines (one, the spare, has no line), 4 lines (Line 4 has no machines yet), 10 downtime events, 6 reasons (5 and 6 never used).

## How a join works: matching rows

Forget circles and overlaps. Think of a join as a matching game. For each row on the left, look through the right table for rows whose key equals it. Every pair that matches becomes one output row.

{{diagram:match}}

\`\`\`sql
SELECT m.machine_name, l.line_name
FROM machine AS m
INNER JOIN line AS l
  ON m.line_id = l.line_id
ORDER BY m.machine_id;
\`\`\`

| machine_name | line_name |
|---|---|
| Filler 1 | Line 1 |
| Capper 1 | Line 1 |
| Labeler 1 | Line 1 |
| Filler 2 | Line 2 |
| Capper 2 | Line 2 |
| Case Packer 3 | Line 3 |

Notes on the syntax:

- \`m\` and \`l\` are short **table aliases**. Once you alias a table you use the alias everywhere in the query.
- \`ON\` states the match rule. It is nearly always \`child.foreign_key = parent.primary_key\`.
- Prefix columns with the alias (\`m.line_id\`) whenever the same name exists in both tables. The database raises an "ambiguous column" error otherwise.

### INNER JOIN: only pairs that match

An {{term:inner-join|INNER JOIN}} returns an output row only when both sides match. Look at the result above: the Spare Palletizer is gone, because its \`line_id\` is NULL and matches no line. Line 4 is also gone because no machine points at it. \`JOIN\` by itself means INNER JOIN.

### LEFT JOIN: keep everything on the left

A {{term:left-join|LEFT JOIN}} keeps every left-hand row. When there is no partner, the right-hand columns come back as NULL.

\`\`\`sql
SELECT m.machine_name, l.line_name
FROM machine AS m
LEFT JOIN line AS l
  ON m.line_id = l.line_id
ORDER BY m.machine_id;
\`\`\`

| machine_name | line_name |
|---|---|
| Filler 1 | Line 1 |
| Capper 1 | Line 1 |
| Labeler 1 | Line 1 |
| Filler 2 | Line 2 |
| Capper 2 | Line 2 |
| Case Packer 3 | Line 3 |
| Spare Palletizer | NULL |

Seven rows now. Flip the question to find parents with no children: which lines have no machines?

\`\`\`sql
SELECT l.line_name
FROM line AS l
LEFT JOIN machine AS m
  ON m.line_id = l.line_id
WHERE m.machine_id IS NULL;
\`\`\`

| line_name |
|---|
| Line 4 |

This "left join then keep the NULLs" pattern is how you answer "which reasons were never used" or "which machines have never faulted". RIGHT JOIN is a LEFT JOIN with the tables swapped. Most people write only LEFT. FULL OUTER JOIN keeps unmatched rows from both sides. It exists in SQL Server and PostgreSQL but not in MySQL or MariaDB.

> [!warning] A WHERE on the right table undoes a LEFT JOIN
> \`LEFT JOIN line l ON ... WHERE l.area = 'Bottling'\` throws away the NULL rows, because NULL is not equal to 'Bottling'. The result is an inner join in disguise. To filter the right-hand table and keep the left rows, put the condition in the ON clause: \`ON m.line_id = l.line_id AND l.area = 'Bottling'\`.

## Aggregates: many rows in, one value out

An {{term:aggregate-function|aggregate function}} summarizes rows.

\`\`\`sql
SELECT COUNT(*)          AS events,
       SUM(duration_min) AS total_min,
       MIN(duration_min) AS shortest,
       MAX(duration_min) AS longest,
       AVG(duration_min) AS avg_min
FROM downtime_event;
\`\`\`

| events | total_min | shortest | longest | avg_min |
|---|---|---|---|---|
| 10 | 143 | 4 | 45 | 14.3 |

> [!note] Dialect: AVG of integers
> MySQL, MariaDB and PostgreSQL return 14.3. SQL Server averages an integer column as an integer and returns **14**. Multiply by 1.0 to force decimals: \`AVG(duration_min * 1.0)\`.

Aggregates skip NULLs, with one exception. \`COUNT(*)\` counts rows. \`COUNT(notes)\` counts rows where \`notes\` is not NULL, which is 3 here, not 10. Choose on purpose.

## GROUP BY: one result row per group

{{term:group-by|GROUP BY}} splits the rows into piles by the value(s) you name, then runs the aggregates once per pile.

\`\`\`sql
SELECT machine_id, COUNT(*) AS events, SUM(duration_min) AS total_min
FROM downtime_event
GROUP BY machine_id
ORDER BY total_min DESC;
\`\`\`

| machine_id | events | total_min |
|---|---|---|
| 1 | 2 | 57 |
| 6 | 1 | 30 |
| 2 | 3 | 24 |
| 4 | 2 | 20 |
| 3 | 1 | 8 |
| 5 | 1 | 4 |

Machine 7 has no events, so it has no group and does not appear. Machine 1 (the filler) lost 57 minutes across two events.

The rule for GROUP BY: every column in SELECT must either be in GROUP BY or be inside an aggregate. \`SELECT machine_id, reason_id, SUM(...) ... GROUP BY machine_id\` fails in SQL Server and PostgreSQL because the engine cannot pick one reason_id for the whole machine. MySQL accepts some such queries depending on its \`ONLY_FULL_GROUP_BY\` setting and returns an arbitrary value, which is worse than an error.

## Worked example: downtime minutes by reason

Join events to reasons so the report shows names, then group by reason.

\`\`\`sql
SELECT r.reason_name,
       COUNT(*)                      AS events,
       SUM(e.duration_min)           AS total_min,
       AVG(e.duration_min * 1.0)     AS avg_min
FROM downtime_event AS e
INNER JOIN downtime_reason AS r
  ON r.reason_id = e.reason_id
GROUP BY r.reason_name
ORDER BY total_min DESC;
\`\`\`

| reason_name | events | total_min | avg_min |
|---|---|---|---|
| Changeover | 2 | 75 | 37.5 |
| No Product | 2 | 27 | 13.5 |
| Sensor Fault | 3 | 21 | 7.0 |
| Jam | 3 | 20 | 6.7 |

Check it: 75 + 27 + 21 + 20 = 143, which matches the total from the single-row query above. Whenever you build a grouped report, compare its grand total to a plain SUM. If they differ, the join added or dropped rows.

The picture a plant manager gets: changeovers cost the most minutes, but jams and sensor faults happen most often (3 each) and are short. Those need different fixes: scheduling for changeovers, maintenance for jams.

### Same report, including unused reasons

The inner join hides reasons 5 and 6. A LEFT JOIN starting from the reasons keeps them. Use \`COALESCE\` to turn the NULL sum into 0, and count a column from the right-hand table so unmatched rows count as zero.

\`\`\`sql
SELECT r.reason_name,
       COUNT(e.event_id)               AS events,
       COALESCE(SUM(e.duration_min),0) AS total_min
FROM downtime_reason AS r
LEFT JOIN downtime_event AS e
  ON e.reason_id = r.reason_id
GROUP BY r.reason_name
ORDER BY total_min DESC, r.reason_name;
\`\`\`

| reason_name | events | total_min |
|---|---|---|
| Changeover | 2 | 75 |
| No Product | 2 | 27 |
| Sensor Fault | 3 | 21 |
| Jam | 3 | 20 |
| Material Shortage | 0 | 0 |
| Operator Break | 0 | 0 |

\`COUNT(*)\` here would report 1 for the zero-event reasons, because the NULL-padded row still counts as a row. \`COUNT(e.event_id)\` correctly gives 0.

### Joining three tables: downtime by line

Events know their machine, machines know their line. Chain the joins.

\`\`\`sql
SELECT l.line_name,
       COUNT(*)            AS events,
       SUM(e.duration_min) AS total_min
FROM downtime_event AS e
INNER JOIN machine AS m ON m.machine_id = e.machine_id
INNER JOIN line    AS l ON l.line_id    = m.line_id
GROUP BY l.line_name
ORDER BY total_min DESC;
\`\`\`

| line_name | events | total_min |
|---|---|---|
| Line 1 | 6 | 89 |
| Line 3 | 1 | 30 |
| Line 2 | 3 | 24 |

89 + 30 + 24 = 143 again. Reconciled.

## HAVING versus WHERE

WHERE filters rows **before** grouping. {{term:having-clause|HAVING}} filters groups **after** the aggregates exist, so it is the only place you can test \`SUM\` or \`COUNT\`.

\`\`\`sql
SELECT r.reason_name, SUM(e.duration_min) AS total_min
FROM downtime_event AS e
INNER JOIN downtime_reason AS r ON r.reason_id = e.reason_id
GROUP BY r.reason_name
HAVING SUM(e.duration_min) > 25
ORDER BY total_min DESC;
\`\`\`

| reason_name | total_min |
|---|---|
| Changeover | 75 |
| No Product | 27 |

Order of work: FROM and JOIN, then WHERE, then GROUP BY, then HAVING, then SELECT, then ORDER BY. That is why you cannot use the alias \`total_min\` in HAVING on SQL Server or PostgreSQL, and why a row-level condition belongs in WHERE (cheaper, since fewer rows get grouped).

### Minutes from timestamps

If you only stored start and end times, compute the duration. This is a major dialect difference.

| Engine | Minutes between start_time and end_time |
|---|---|
| SQL Server | \`DATEDIFF(MINUTE, e.start_time, e.end_time)\` |
| MySQL / MariaDB | \`TIMESTAMPDIFF(MINUTE, e.start_time, e.end_time)\` |
| PostgreSQL | \`EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 60\` |

SQL Server's \`DATEDIFF\` counts boundaries crossed, not elapsed time. \`DATEDIFF(MINUTE, '10:59:59', '11:00:01')\` returns 1 even though 2 seconds passed, and \`DATEDIFF(HOUR, ...)\` on the same pair also returns 1. For downtime, compute in seconds and divide if precision matters.

## Common duplicate-row mistakes

### 1. The fan-out: joining two "many" tables

Suppose you want good parts per line and you join \`line\` to both \`machine\` and \`production_run\`:

\`\`\`sql
SELECT l.line_name, SUM(r.good_count) AS good_parts
FROM line AS l
INNER JOIN machine        AS m ON m.line_id = l.line_id
INNER JOIN production_run AS r ON r.line_id = l.line_id
GROUP BY l.line_name;
\`\`\`

| line_name | good_parts |
|---|---|
| Line 1 | 73650 |
| Line 2 | 30400 |
| Line 3 | 940 |

The true totals are 24,550 (18,450 + 6,100), 15,200 and 940. Line 1 is inflated threefold because it has three machines. Each run row was repeated once per machine, 3 machines times 2 runs gives 6 rows. The join is legal and the numbers look plausible, which makes this the most dangerous mistake in reporting. The fix is to not join the machine table at all, since the question never needed it, or to aggregate each table separately in a subquery before joining.

### 2. The missing ON: a cross join

\`FROM machine, line\` (comma join) or a JOIN with a forgotten condition pairs every machine with every line: 7 x 4 = 28 rows. Against large tables this can lock up a database. If a result has far more rows than either table, look for a missing ON.

### 3. Grouping by a name instead of an id

\`GROUP BY reason_name\` merges two reasons that happen to share a name. Group by the id and select the name too (\`GROUP BY r.reason_id, r.reason_name\`).

### 4. COUNT(*) on a left join

Shown above: the NULL row counts. Count a right-hand column instead. For machines per line:

\`\`\`sql
SELECT l.line_name, COUNT(m.machine_id) AS machines
FROM line AS l
LEFT JOIN machine AS m ON m.line_id = l.line_id
GROUP BY l.line_name
ORDER BY l.line_name;
\`\`\`

| line_name | machines |
|---|---|
| Line 1 | 3 |
| Line 2 | 2 |
| Line 3 | 1 |
| Line 4 | 0 |

### 5. DISTINCT as a bandage

If a join returns duplicates and you add DISTINCT to hide them, a SUM above it will still be wrong. Find out why rows are repeated instead.

> [!tip] In Ignition
> A Named Query that joins and groups returns a dataset with the column aliases as headers, ready to drop into a Perspective Table or chart. Alias every computed column (\`AS total_min\`) so the headers are readable and stable.
`,

  eli5: `
Imagine two stacks of index cards. One stack has a card for each machine, with a note in the corner: "belongs to line 2". The other stack has a card for each line, with the line's number and name.

A join is you sitting down and pairing the cards. For each machine card, you look at the corner note, find the line card with that number, and clip them together. Now you can read "Capper 2 belongs to Line 2" on one clipped pair.

Some cards might not have a partner. A new spare machine has no line yet, and a brand-new line has no machines yet. An inner join says "I only keep the clipped pairs." A left join says "I keep every machine card, and if it has no partner I clip a blank card on it."

Group by is the next step. Take your clipped pairs and sort them into piles, one pile per line. Then you add up the minutes written on each pile, or count the cards, or find the biggest. One answer per pile.

The big danger is clipping to too many partners at once. If one line card is clipped to three machine cards and also to two run cards, that one line shows up six times, and your pile totals come out wrong.
`,

  why: `
**Why not store everything in one wide table?** A single giant "downtime" table with the machine name, line name and reason name on every row avoids joins. It also means a rename touches thousands of rows, a typo creates a "new" reason, and your totals split across spellings. Joins are the price of keeping each fact in one place. Integrators accept that price for business records and then often build a **view** or a reporting table that pre-joins the data for the screens ({{lesson:db-procs}}).

**Why does a fan-out happen silently?** The database does exactly what you asked. A join multiplies rows by the number of matches, and nothing warns you. Experienced people reconcile every grouped report against a simple total from the base table. That one habit catches nearly every fan-out, dropped-row and double-counting error before an operator or manager does.

**Why LEFT JOIN so often?** Reports are judged by what is missing. A reason with zero events, a machine with no downtime, a line with no production are exactly the rows a manager asks about. An inner join makes them vanish without a trace, so the report looks complete and is wrong.

**Why does Ignition developers' advice stress doing the work in SQL?** Pulling 100,000 rows into a script to loop and add them up is slow and memory-hungry on the Gateway. A GROUP BY returns a handful of rows. The database is built for exactly that job, and it can use indexes ({{lesson:db-indexes}}). Reserve scripting for formatting and decisions.

**HAVING or a subquery?** HAVING is fine for simple thresholds. For multi-step logic, many people wrap the grouped query in a subquery or a common table expression and filter the outer query, which reads more clearly. Both are valid.
`,

  history: `
Joins come straight from Codd's relational model (1970), where combining relations on shared attributes is a core operation. SQL's explicit JOIN ... ON syntax arrived in the SQL-92 standard. Before that, people wrote comma-separated tables and put the match rule in WHERE, a style you will still see in older code. It works, but it makes a forgotten match condition much easier to miss.
`,

  examples: [
    {
      title: "Pareto of downtime for a shift review",
      body: `The reason-by-minutes query above is a ready-made Pareto: sort descending, then chart total_min as bars. Add a WHERE on start_time (half-open range from {{lesson:db-sql-select}}) to restrict it to the shift, and a second grouped column, such as \`l.line_name\`, to compare lines side by side. Always reconcile the bars' sum with \`SELECT SUM(duration_min)\` for the same window.`
    },
    {
      title: "Catching the 3x inflation",
      body: `A dashboard shows Line 1 producing 73,650 good bottles for a shift where the PLC counter says 24,550. The ratio is exactly 3, the number of machines on the line. Open the query, find the extra join to \`machine\`, remove it, and the number matches. Ratios that equal a child-row count are the signature of a fan-out.`
    }
  ],

  diagrams: {
    match: `<svg viewBox="0 0 640 300" role="img" aria-label="Row matching between machine rows and line rows. Six machines match a line. The spare palletizer has no matching line and Line 4 has no machine.">
  <text class="dg-title" x="40" y="22">machine (left)</text>
  <text class="dg-title" x="410" y="22">line (right)</text>

  <rect class="dg-box" x="40" y="36" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="50" y="55">Filler 1 · line_id 1</text>
  <rect class="dg-box" x="40" y="70" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="50" y="89">Capper 1 · line_id 1</text>
  <rect class="dg-box" x="40" y="104" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="50" y="123">Labeler 1 · line_id 1</text>
  <rect class="dg-box" x="40" y="138" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="50" y="157">Filler 2 · line_id 2</text>
  <rect class="dg-box" x="40" y="172" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="50" y="191">Capper 2 · line_id 2</text>
  <rect class="dg-box" x="40" y="206" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="50" y="225">Case Packer 3 · line_id 3</text>
  <rect class="dg-box-warn" x="40" y="240" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="50" y="259">Spare Palletizer · NULL</text>

  <rect class="dg-box-accent" x="410" y="70" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="420" y="89">line_id 1 · Line 1</text>
  <rect class="dg-box-accent" x="410" y="155" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="420" y="174">line_id 2 · Line 2</text>
  <rect class="dg-box-accent" x="410" y="206" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="420" y="225">line_id 3 · Line 3</text>
  <rect class="dg-box-warn" x="410" y="240" width="190" height="28" rx="4"/>
  <text class="dg-text-mono" x="420" y="259">line_id 4 · Line 4</text>

  <line class="dg-line" x1="230" y1="50" x2="410" y2="84"/>
  <line class="dg-line" x1="230" y1="84" x2="410" y2="84"/>
  <line class="dg-line" x1="230" y1="118" x2="410" y2="84"/>
  <line class="dg-line" x1="230" y1="152" x2="410" y2="169"/>
  <line class="dg-line" x1="230" y1="186" x2="410" y2="169"/>
  <line class="dg-line" x1="230" y1="220" x2="410" y2="220"/>
  <line class="dg-line dg-dash" x1="230" y1="254" x2="275" y2="254"/>
  <text class="dg-text-muted" x="282" y="258">no match</text>
  <text class="dg-text-muted" x="40" y="290">INNER JOIN keeps the 6 lines drawn. LEFT JOIN from machine also keeps the spare, with NULLs.</text>
</svg>`
  },

  pitfalls: [
    "Joining two child tables to one parent and summing, which multiplies the totals (fan-out).",
    "Using COUNT(*) after a LEFT JOIN, so unmatched rows count as 1.",
    "Putting a filter on the right-hand table in WHERE, silently turning a LEFT JOIN into an INNER JOIN.",
    "Forgetting the ON condition and producing a cross join.",
    "Selecting a column that is neither grouped nor aggregated.",
    "Averaging an integer column on SQL Server and getting a truncated integer.",
    "Never reconciling a grouped report to a plain total from the base table."
  ],

  keyTerms: ["inner-join", "left-join", "group-by", "aggregate-function", "having-clause", "null-value", "primary-key", "foreign-key", "sql-server"],

  quiz: [
    {
      q: "You INNER JOIN machine to line on line_id. Which machine row is missing from the result?",
      options: ["Filler 1", "Case Packer 3", "Capper 2", "Spare Palletizer, because its line_id is NULL"],
      answer: 3,
      explain: [
        "Filler 1 has line_id 1, which matches Line 1.",
        "Case Packer 3 has line_id 3 and matches Line 3.",
        "Capper 2 has line_id 2 and matches Line 2.",
        "Correct. NULL matches nothing, so an inner join drops the row. A LEFT JOIN from machine would keep it."
      ]
    },
    {
      q: "A report joins line, machine and production_run, then sums good_count. Line 1 shows 73,650 but the PLC says 24,550. What happened?",
      options: [
        "Each run row was repeated once per machine (3x), because both child tables fan out from line",
        "A missing WHERE clause",
        "AVG was used instead of SUM",
        "The PLC counter is wrong"
      ],
      answer: 0,
      explain: [
        "Correct. 24,550 x 3 = 73,650, and Line 1 has 3 machines. Remove the unneeded machine join or aggregate separately.",
        "A missing WHERE would include extra data, but not an exact triple.",
        "The query uses SUM. AVG would produce much smaller numbers.",
        "An exact factor equal to a row count is the signature of a join multiplying rows, not a counter error."
      ]
    },
    {
      q: "Which clause filters on SUM(duration_min) > 25 after grouping?",
      options: ["WHERE", "HAVING", "ORDER BY", "ON"],
      answer: 1,
      explain: [
        "WHERE runs before grouping, so aggregates do not exist yet.",
        "Correct. HAVING filters groups after the aggregates are computed.",
        "ORDER BY sorts rows. It does not filter them.",
        "ON defines how tables match in a join."
      ]
    },
    {
      q: "You LEFT JOIN downtime_reason to downtime_event to list every reason, even unused ones. For unused reasons, COUNT(*) returns 1. What should you count instead?",
      options: ["COUNT(r.reason_id)", "COUNT(DISTINCT *)", "COUNT(e.event_id)", "SUM(1)"],
      answer: 2,
      explain: [
        "r.reason_id exists on every row (it is the left table), so this also counts 1 for unused reasons.",
        "COUNT(DISTINCT *) is not valid SQL.",
        "Correct. e.event_id is NULL on unmatched rows, and COUNT of a column skips NULLs, giving 0.",
        "SUM(1) adds 1 for every row, the same as COUNT(*)."
      ]
    },
    {
      q: "LEFT JOIN line l ON m.line_id = l.line_id WHERE l.area = 'Bottling' returns no spare palletizer. Why, and what is the fix?",
      options: [
        "The WHERE rejects the NULL-padded row; move the area test into the ON clause",
        "LEFT JOIN cannot return NULLs; use RIGHT JOIN",
        "The spare palletizer is deleted by DISTINCT",
        "GROUP BY is missing"
      ],
      answer: 0,
      explain: [
        "Correct. NULL = 'Bottling' is not true, so WHERE removes the row. Putting the test in ON filters the lines but keeps every machine.",
        "LEFT JOIN returns NULLs for unmatched right-hand columns by design.",
        "No DISTINCT is involved.",
        "GROUP BY is not needed for a join and would not restore the row."
      ]
    },
    {
      q: "On SQL Server, AVG(duration_min) on an INT column returns 14 for data whose true mean is 14.3. What fixes it?",
      options: ["Switch to SUM / COUNT(*) only", "Add DISTINCT", "Add HAVING AVG(duration_min) > 0", "Use AVG(duration_min * 1.0) to force decimal arithmetic"],
      answer: 3,
      explain: [
        "SUM / COUNT(*) on integers has the same truncation problem unless one side is decimal.",
        "DISTINCT changes which rows are averaged and would give the wrong mean.",
        "HAVING filters groups. It does not change the arithmetic type.",
        "Correct. Multiplying by 1.0 turns the values into decimals, so the average keeps its fraction."
      ]
    }
  ],

  resources: [
    { title: "PostgreSQL tutorial: Joins Between Tables", url: "https://www.postgresql.org/docs/current/tutorial-join.html", type: "docs", source: "PostgreSQL" },
    { title: "PostgreSQL: Table Expressions (join types and ON)", url: "https://www.postgresql.org/docs/current/queries-table-expressions.html", type: "docs", source: "PostgreSQL" },
    { title: "SELECT (Transact-SQL), SQL Server", url: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql?view=sql-server-ver16&viewFallbackFrom=sql-server-ver16/", type: "docs", source: "Microsoft Learn" },
    { title: "SELECT Clause (Transact-SQL)", url: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-clause-transact-sql?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" },
    { title: "Using Named Queries, Example (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition/named-queries/using-named-queries-example", type: "docs", source: "Inductive Automation" },
    { title: "system.db scripting functions (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-db", type: "docs", source: "Inductive Automation" }
  ]
});
