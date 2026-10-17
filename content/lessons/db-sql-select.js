LC.lesson({
  id: "db-sql-select",
  title: "SQL I: SELECT, WHERE and ORDER BY",
  track: "db",
  minutes: 25,
  level: 1,
  prereqs: ["db-intro"],
  tags: ["sql", "select", "where", "order by", "null", "timestamps", "dialects"],
  summary: "Read data with SELECT, filter it with WHERE, sort it, cap it, and avoid the NULL and timestamp traps that give plausible-looking wrong answers.",
  objectives: [
    "Write a SELECT that picks columns, renames them with aliases and filters rows with WHERE",
    "Combine conditions with AND, OR, IN, BETWEEN, LIKE and IS NULL, using parentheses correctly",
    "Sort results with ORDER BY and limit them with TOP (SQL Server) or LIMIT (MySQL, MariaDB, PostgreSQL)",
    "Use DISTINCT to list unique values",
    "Filter a time range without losing rows to end-of-day, DST or time zone mistakes"
  ],

  body: `
## SELECT is a question, not a command

{{term:select-statement|SELECT}} reads rows and changes nothing. That makes it the safest SQL to learn on a production database, and the one you will write most. Everything in this lesson uses the plant tables from {{lesson:db-intro}}.

The basic shape is three clauses in a fixed order:

\`\`\`sql
SELECT machine_name, machine_type
FROM machine
WHERE line_id = 1;
\`\`\`

| machine_name | machine_type |
|---|---|
| Filler 1 | Filler |
| Capper 1 | Capper |
| Labeler 1 | Labeler |

Read it in this order: **FROM** says which table, **WHERE** keeps the rows that match, **SELECT** chooses the columns to show. SQL is written SELECT first but the database works through FROM and WHERE before it picks columns. That is why you cannot use a column alias from SELECT inside WHERE.

\`SELECT *\` returns every column. It is fine for a first look and a bad habit in a Named Query or script, because adding a column to the table later changes what your code receives. Name the columns you need.

Keywords are not case-sensitive, and whitespace does not matter. A semicolon ends a statement. Text values go in **single quotes** (\`'Filler'\`). Double quotes mean "this is a column name" in standard SQL.

### Aliases

\`AS\` renames a column or table for the result. Use it for readable headings and for short table names later.

\`\`\`sql
SELECT event_id, duration_min AS minutes_down
FROM downtime_event
WHERE event_id <= 3;
\`\`\`

| event_id | minutes_down |
|---|---|
| 1 | 7 |
| 2 | 45 |
| 3 | 8 |

You can also compute columns: \`duration_min / 60.0 AS hours_down\`. Dividing by \`60.0\` rather than \`60\` matters, because two integers divide as integers in SQL Server and PostgreSQL (45 / 60 gives 0).

## Filtering with WHERE

| Operator | Meaning | Example |
|---|---|---|
| \`=\`, \`<>\` (or \`!=\`), \`<\`, \`<=\`, \`>\`, \`>=\` | Compare | \`duration_min >= 10\` |
| \`AND\`, \`OR\`, \`NOT\` | Combine conditions | \`reason_id = 1 AND machine_id = 2\` |
| \`IN (...)\` | Matches any in a list | \`reason_id IN (1, 4)\` |
| \`BETWEEN a AND b\` | Inclusive range | \`duration_min BETWEEN 5 AND 8\` |
| \`LIKE\` | Pattern: \`%\` any text, \`_\` one character | \`machine_name LIKE 'Capper%'\` |
| \`IS NULL\`, \`IS NOT NULL\` | Missing / present | \`line_id IS NULL\` |

A combined example: jams and sensor faults that lasted between 5 and 8 minutes.

\`\`\`sql
SELECT event_id, reason_id, duration_min
FROM downtime_event
WHERE reason_id IN (1, 4)
  AND duration_min BETWEEN 5 AND 8;
\`\`\`

| event_id | reason_id | duration_min |
|---|---|---|
| 1 | 1 | 7 |
| 3 | 4 | 8 |
| 9 | 4 | 5 |
| 10 | 4 | 8 |

Event 4 (a 9-minute jam) and event 6 (a 4-minute jam) are correctly missing. \`BETWEEN\` includes both ends, so the 5 and 8 rows stay.

> [!warning] AND binds tighter than OR
> \`WHERE reason_id = 1 OR reason_id = 4 AND duration_min > 8\` means "reason 1 (any length), OR reason 4 longer than 8". If you meant "either reason, and longer than 8", write \`WHERE (reason_id = 1 OR reason_id = 4) AND duration_min > 8\`. Parenthesize whenever AND and OR share a WHERE.

### Patterns with LIKE

\`\`\`sql
SELECT machine_id, machine_name FROM machine WHERE machine_name LIKE 'Capper%';
\`\`\`

| machine_id | machine_name |
|---|---|
| 2 | Capper 1 |
| 5 | Capper 2 |

> [!note] Dialect: case and LIKE
> SQL Server and MySQL/MariaDB compare text case-insensitively under their default collations, so \`LIKE 'capper%'\` matches. PostgreSQL's \`LIKE\` is case-sensitive. Use \`ILIKE\` for case-insensitive matching there.

### NULL needs its own tests

{{term:null-value|NULL}} means "no value". It is neither equal nor unequal to anything, including itself. So \`line_id = NULL\` never matches a row, and \`line_id <> 1\` also skips NULL rows. Use \`IS NULL\`.

\`\`\`sql
SELECT machine_id, machine_name FROM machine WHERE line_id IS NULL;
\`\`\`

| machine_id | machine_name |
|---|---|
| 7 | Spare Palletizer |

Here is the surprise. \`SELECT machine_name FROM machine WHERE line_id <> 1\` returns Filler 2, Capper 2 and Case Packer 3, but **not** the spare palletizer, because comparing NULL to 1 is neither true nor false. If you want it, add \`OR line_id IS NULL\`. Another variant of the same trap: \`NOT IN (list)\` returns nothing at all if the list contains a NULL.

## Sorting and limiting

\`ORDER BY\` sorts the result. Default is ascending (\`ASC\`); add \`DESC\` for largest first. Without ORDER BY, row order is **not guaranteed**, even if it looks sorted today.

\`\`\`sql
SELECT event_id, machine_id, duration_min
FROM downtime_event
WHERE duration_min >= 10
ORDER BY duration_min DESC;
\`\`\`

| event_id | machine_id | duration_min |
|---|---|---|
| 2 | 1 | 45 |
| 7 | 6 | 30 |
| 5 | 4 | 15 |
| 8 | 1 | 12 |

You can sort by several columns (\`ORDER BY machine_id, start_time DESC\`) and by an alias.

To get only the top few rows, the engines disagree. This is the most common dialect trap when you move a query between systems.

| Engine | Three longest events |
|---|---|
| SQL Server | \`SELECT TOP 3 event_id, duration_min FROM downtime_event ORDER BY duration_min DESC;\` |
| MySQL / MariaDB | \`SELECT event_id, duration_min FROM downtime_event ORDER BY duration_min DESC LIMIT 3;\` |
| PostgreSQL | same as MySQL: \`... LIMIT 3;\` |
| Standard SQL (PostgreSQL; SQL Server spells it \`OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY\`) | \`... ORDER BY duration_min DESC FETCH FIRST 3 ROWS ONLY;\` |

All return:

| event_id | duration_min |
|---|---|
| 2 | 45 |
| 7 | 30 |
| 5 | 15 |

Always pair TOP or LIMIT with ORDER BY. Microsoft's own documentation says ORDER BY is the only way to predict which rows TOP picks. Sorting NULLs also differs: SQL Server and MySQL put NULLs first in ascending order, PostgreSQL puts them last.

### DISTINCT

\`DISTINCT\` removes duplicate result rows. Which reasons have actually been used?

\`\`\`sql
SELECT DISTINCT reason_id FROM downtime_event ORDER BY reason_id;
\`\`\`

| reason_id |
|---|
| 1 |
| 2 |
| 3 |
| 4 |

Reasons 5 and 6 never appear. Be careful using DISTINCT to make a wrong query look right. If you add it only to hide duplicate rows, the real cause is usually a join problem ({{lesson:db-sql-joins}}).

## Filtering by time

Timestamps cause more wrong reports than any other column type. Three rules cover most of it.

### 1. Use a half-open range: start inclusive, end exclusive

To get everything from 06:00 up to (not including) 12:00:

\`\`\`sql
SELECT event_id, start_time
FROM downtime_event
WHERE start_time >= '2026-03-02T06:00:00'
  AND start_time <  '2026-03-02T12:00:00'
ORDER BY start_time;
\`\`\`

| event_id | start_time |
|---|---|
| 1 | 2026-03-02 06:14:00 |
| 2 | 2026-03-02 07:00:00 |
| 3 | 2026-03-02 08:30:00 |
| 4 | 2026-03-02 09:05:00 |
| 5 | 2026-03-02 09:40:00 |
| 6 | 2026-03-02 10:10:00 |
| 7 | 2026-03-02 11:00:00 |

Event 8 started at 12:20 and is correctly excluded. The ISO form with a \`T\` between date and time is safe on every engine. SQL Server's older \`DATETIME\` type can read \`'2026-03-02 06:00:00'\` differently depending on language settings.

Why not \`BETWEEN '2026-03-02' AND '2026-03-02 23:59:59'\`? Because timestamps may hold fractions of a second. A row at 23:59:59.500 is missed, and a bare date means midnight at the *start* of the day. "Up to but not including the next day's midnight" never misses a row and never double-counts the boundary row when you run adjacent ranges.

### 2. Know whether the column is local time or UTC

A timestamp column has no idea what time zone it is in, unless the type says so. Ignition's historian stores time as **epoch milliseconds in {{term:utc|UTC}}**. Many hand-built tables store the gateway's local time instead. A 06:00 local shift start in Chicago in winter is 12:00 UTC. Compare the wrong pair and your "first shift" report shows the wrong six hours.

Pick one convention per table and write it in the column name or documentation. UTC for storage and local time for display avoids most arguments.

### 3. Daylight saving time creates a missing hour and a duplicate hour

When clocks move forward, 02:00 to 03:00 does not exist. When they move back, 01:00 to 02:00 happens twice. A local-time "shift" query on those days spans 7 or 9 hours instead of 8. Store UTC, and convert at the edges.

| Task | SQL Server | MySQL / MariaDB | PostgreSQL |
|---|---|---|---|
| Now | \`SYSDATETIME()\` | \`NOW()\` | \`NOW()\` |
| Today at midnight | \`CAST(SYSDATETIME() AS date)\` | \`CURDATE()\` | \`CURRENT_DATE\` |
| 24 hours ago | \`DATEADD(HOUR, -24, SYSDATETIME())\` | \`NOW() - INTERVAL 1 DAY\` | \`NOW() - INTERVAL '1 day'\` |

> [!tip] In Ignition
> Pass dates into Named Queries as Date parameters from Perspective Date Range components or script \`system.date\` functions, rather than building date strings in SQL text. Ignition handles the conversion, and you avoid the quoting problems covered in {{lesson:db-sql-modify}}.

## Putting it together

A realistic request: "Which downtime events over 10 minutes happened this morning on Line 1's machines, longest first, top 2?" Line 1's machines are 1, 2 and 3 (a join would find those for you, next lesson).

\`\`\`sql
-- PostgreSQL / MySQL / MariaDB version; use SELECT TOP 2 on SQL Server
SELECT event_id, machine_id, duration_min
FROM downtime_event
WHERE machine_id IN (1, 2, 3)
  AND duration_min > 10
  AND start_time >= '2026-03-02T06:00:00'
  AND start_time <  '2026-03-02T12:00:00'
ORDER BY duration_min DESC
LIMIT 2;
\`\`\`

| event_id | machine_id | duration_min |
|---|---|---|
| 2 | 1 | 45 |

Only one row returns. Event 8 on machine 1 (12 minutes) is after noon, so it is outside the window, and nothing else on Line 1 exceeds 10 minutes. A short result is the database being correct, not broken.
`,

  eli5: `
Think of a big wall calendar with a sticky note for every time something broke at the factory. Each note has a few blanks filled in: which machine, why, how long.

SELECT is you saying to a helper, "Look at the notes and tell me which ones I care about." The WHERE part is your rule: "only the ones longer than ten minutes," or "only the ones about the capper." ORDER BY is "put the longest on top." LIMIT or TOP is "just give me the first three."

The tricky bit is blank boxes. If a note has a box left empty, you can't say it equals 5 or doesn't equal 5, because nobody knows what it holds. You have to ask specifically, "Show me the notes where that box is empty."

Time is the other tricky bit. If one calendar uses the factory's wall clock and another uses a clock in London, "9 o'clock" means two different moments. Pick one clock, write down which, and always ask for "from 6:00 up to but not including noon" so a note stamped exactly at noon never gets counted twice.
`,

  why: `
**Why does the database not guarantee row order?** A relational table is a set of rows, not a list. The engine reads rows in whatever order is fastest: index order, disk order, or the order a parallel scan finished. The result often looks sorted until the table grows or an index is added, and then a screen that "always worked" shuffles. ORDER BY is the only contract.

**Why is NULL not equal to anything?** NULL means "unknown", and the honest answer to "is an unknown value equal to 1?" is "unknown", not "no". SQL uses three-valued logic (true, false, unknown), and WHERE keeps only rows that are true. This is mathematically consistent and practically confusing. The habit that protects you is to ask what each nullable column means when it is empty and to write IS NULL conditions explicitly.

**Why the half-open time range?** Because ranges then tile perfectly. Hour 1 is \`>= 06:00 AND < 07:00\`, hour 2 is \`>= 07:00 AND < 08:00\`, and a row at exactly 07:00 lands in one and only one. Using BETWEEN with an "end of day" literal either misses the final fraction of a second or counts the boundary row twice. Production totals that are off by one event are very hard to track down later.

**Why do dialects differ for something as basic as TOP and LIMIT?** SQL has an ISO standard, but vendors shipped their own syntax years before the standard caught up and then had to keep it for compatibility. The takeaway is practical. Prove a query in the same engine you will run it on. Do not assume that a snippet from a forum works on your database.

**Why prefer named columns to SELECT *?** A script or binding that depends on column order breaks when someone adds a column. It also pulls data you do not use across the network on every poll, which matters when a Perspective screen refreshes every few seconds.
`,

  history: `
SQL began as SEQUEL at IBM in the 1970s, based on E. F. Codd's relational model, and the name was shortened to SQL. It was standardized by ANSI in 1986 and ISO in 1987. The row-limiting clause was not in the early standards, so SQL Server chose TOP, while MySQL and PostgreSQL chose LIMIT. The standard's FETCH FIRST ... ROWS ONLY arrived later, in SQL:2008.
`,

  examples: [
    {
      title: "Last shift's long stops, as a Named Query",
      body: `A screen needs stoppages over 10 minutes between two Date parameters. The query is \`SELECT event_id, machine_id, duration_min FROM downtime_event WHERE duration_min > 10 AND start_time >= :start AND start_time < :end ORDER BY start_time\`. Run it first in DBeaver with literal dates, check the row count against what operators remember, then save it as a Named Query with \`start\` and \`end\` as Date parameters.`
    },
    {
      title: "The line_id <> 1 surprise",
      body: `An engineer writes \`WHERE line_id <> 1\` to find "machines not on Line 1" and gets 3 rows. Seven machines exist and 3 are on Line 1, so 4 were expected. The missing one is the spare palletizer with a NULL line. The fix is \`WHERE line_id <> 1 OR line_id IS NULL\`.`
    }
  ],

  diagrams: {},

  pitfalls: [
    "Writing = NULL or <> value and expecting NULL rows to match.",
    "Mixing AND and OR without parentheses.",
    "Using BETWEEN with '23:59:59' as an end-of-day bound, which misses fractional seconds.",
    "Relying on row order without ORDER BY.",
    "Using TOP without ORDER BY (or LIMIT without ORDER BY) and getting arbitrary rows.",
    "Comparing a UTC column to a local-time literal, or ignoring the gateway's time zone and daylight saving shifts.",
    "Copying a TOP query to PostgreSQL or a LIMIT query to SQL Server without changing the syntax."
  ],

  keyTerms: ["select-statement", "where-clause", "null-value", "sql", "utc", "sql-server", "mysql-mariadb", "postgresql"],

  quiz: [
    {
      q: "Which WHERE clause finds machines that are not assigned to any line?",
      options: ["WHERE line_id = NULL", "WHERE line_id = 0", "WHERE line_id IS NULL", "WHERE line_id <> 1"],
      answer: 2,
      explain: [
        "Comparing anything to NULL with = is never true, so this returns no rows.",
        "A line_id of 0 is a real value that does not exist here. The machine has no value at all.",
        "Correct. IS NULL is the only way to test for a missing value.",
        "<> 1 skips NULL rows entirely, so the unassigned machine would not appear."
      ]
    },
    {
      q: "You want the 5 longest downtime events on SQL Server. Which is right?",
      options: [
        "SELECT * FROM downtime_event ORDER BY duration_min DESC LIMIT 5",
        "SELECT TOP 5 * FROM downtime_event ORDER BY duration_min DESC",
        "SELECT TOP 5 * FROM downtime_event",
        "SELECT * FROM downtime_event ORDER BY duration_min DESC OFFSET 5"
      ],
      answer: 1,
      explain: [
        "LIMIT is MySQL, MariaDB and PostgreSQL syntax. Older SQL Server versions reject it.",
        "Correct. TOP N with ORDER BY DESC returns the five largest.",
        "Without ORDER BY the five rows are arbitrary, not the longest.",
        "OFFSET skips rows. It does not select the first five."
      ]
    },
    {
      q: "A report for 2026-03-02 uses WHERE start_time BETWEEN '2026-03-02' AND '2026-03-02T23:59:59'. What is the flaw?",
      options: [
        "BETWEEN is not allowed on timestamps",
        "It includes events from 2026-03-03 00:00:00",
        "It can miss a row at 23:59:59.500 because the bound has no fractional seconds",
        "It excludes events at exactly midnight on 2026-03-02"
      ],
      answer: 2,
      explain: [
        "BETWEEN works on timestamps. The issue is the bound you chose.",
        "The upper bound is before midnight of the next day, so it does not include 03-03.",
        "Correct. Timestamps may hold fractions of a second. Use >= start AND < next-day midnight instead.",
        "BETWEEN is inclusive, so midnight at the start is included."
      ]
    },
    {
      q: "What does WHERE reason_id = 1 OR reason_id = 4 AND duration_min > 8 mean?",
      options: [
        "Reason 1 or 4, and longer than 8 minutes",
        "Reason 1 with any duration, or reason 4 longer than 8 minutes",
        "A syntax error",
        "Reason 1 longer than 8, or any reason 4"
      ],
      answer: 1,
      explain: [
        "That needs parentheses around the OR: (reason_id = 1 OR reason_id = 4) AND duration_min > 8.",
        "Correct. AND is evaluated before OR, so the AND pairs reason 4 with the duration test.",
        "The syntax is valid. The meaning is just not what many people expect.",
        "The duration test attaches to reason 4, not reason 1."
      ]
    },
    {
      q: "Shift 1 runs 06:00 to 14:00 local time. Your table stores UTC and the plant is 6 hours behind UTC. Which window do you query?",
      options: ["06:00 to 14:00 UTC", "00:00 to 08:00 UTC", "12:00 to 20:00 UTC", "It does not matter if the dates match"],
      answer: 2,
      explain: [
        "That would be 00:00 to 08:00 local time, the wrong shift.",
        "That is the reverse conversion. UTC is ahead of local time here, so subtracting is wrong.",
        "Correct. Local 06:00 is 12:00 UTC when the plant is UTC-6, so the shift is 12:00 to 20:00 UTC. (The offset changes with daylight saving.)",
        "It matters. A 6-hour mistake puts events in the wrong shift."
      ]
    },
    {
      q: "A query returns 3 of the 7 machines for WHERE line_id <> 1 when you expected 4. What most likely happened?",
      options: [
        "DISTINCT removed a row",
        "ORDER BY dropped a row",
        "One machine has a NULL line_id and NULL <> 1 is not true",
        "The engine limits results to 3 rows"
      ],
      answer: 2,
      explain: [
        "No DISTINCT is in the query, and it would only remove exact duplicates.",
        "ORDER BY sorts. It never removes rows.",
        "Correct. NULL compared with anything is unknown, so WHERE drops that row. Add OR line_id IS NULL.",
        "No engine has such a limit unless you wrote TOP or LIMIT."
      ]
    }
  ],

  resources: [
    { title: "TOP (Transact-SQL), SQL Server", url: "https://learn.microsoft.com/en-us/sql/t-sql/queries/top-transact-sql?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" },
    { title: "ORDER BY Clause (Transact-SQL)", url: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-order-by-clause-transact-sql?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" },
    { title: "SELECT (Transact-SQL)", url: "https://learn.microsoft.com/en-us/sql/t-sql/queries/select-transact-sql?view=sql-server-ver16&viewFallbackFrom=sql-server-ver16/", type: "docs", source: "Microsoft Learn" },
    { title: "PostgreSQL tutorial: The SQL Language", url: "https://www.postgresql.org/docs/current/tutorial-sql.html", type: "docs", source: "PostgreSQL" },
    { title: "SQL in Ignition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition", type: "docs", source: "Inductive Automation" },
    { title: "Using Named Queries, Example (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition/named-queries/using-named-queries-example", type: "docs", source: "Inductive Automation" }
  ]
});
