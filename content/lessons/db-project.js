LC.lesson({
  id: "db-project",
  title: "Project: design a production and downtime schema",
  track: "db",
  minutes: 40,
  level: 3,
  prereqs: ["db-schema", "db-sql-modify"],
  tags: ["project", "schema", "oee", "downtime", "named-queries", "transaction-groups"],
  summary: "Build the database behind an OEE screen from requirements to DDL, sample data, queries, and the Ignition pieces that fill it.",
  objectives: [
    "Turn plant requirements into a list of entities and the tables that hold them",
    "Write DDL with keys, constraints and indexes, and explain each design decision",
    "Load sample data and compute availability, performance, quality and OEE with one query",
    "Use a named query and a transaction group to write production and downtime data from Ignition",
    "Spot the edge cases (open events, overlapping stops, counter resets) before they reach production"
  ],

  body: `
## The brief

Meridian Foods Plant 1 wants one screen per line that shows OEE for the current shift, the top downtime reasons, and a work order's progress. Operators will enter the reason for each stop. The PLC supplies counts and machine states. This lesson builds the database for that, step by step, using the tables from {{lesson:db-schema}}. The syntax is PostgreSQL; the notes call out MySQL and SQL Server differences. Following the course convention, every timestamp is stored in UTC (\`TIMESTAMPTZ\`), and only the shift windows and the screens use plant local time.

## Step 1: requirements to entities

Underline the nouns in the brief and ask what must be remembered about each.

| Requirement | Entity | Decision |
|---|---|---|
| "per line" | \`line\` | Top of the hierarchy |
| Stops are tied to equipment | \`machine\` | Belongs to a line (M101, M102 ...) |
| "current shift" | \`shift\` | Named time windows (day, swing, night) |
| "work order progress" | \`work_order\`, \`product\` | A work order makes one product on one line |
| Counts from the PLC | \`production_run\`, \`production_count\` | A run is one stretch of a work order on a line; counts are readings during it |
| Operators enter reasons | \`downtime_event\`, \`downtime_reason\` | Controlled list, never free text |

{{diagram:flow}}

## Step 2: the DDL

\`\`\`sql
CREATE TABLE line (
  line_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  line_code  VARCHAR(20)  NOT NULL UNIQUE,
  line_name  VARCHAR(100) NOT NULL
);

CREATE TABLE machine (
  machine_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  line_id       INTEGER      NOT NULL REFERENCES line(line_id),
  machine_code  VARCHAR(30)  NOT NULL UNIQUE,
  machine_name  VARCHAR(100) NOT NULL,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE shift (
  shift_id    SMALLINT PRIMARY KEY,
  shift_name  VARCHAR(30) NOT NULL UNIQUE,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL
);

CREATE TABLE product (
  product_id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku                VARCHAR(40)  NOT NULL UNIQUE,
  description        VARCHAR(100) NOT NULL,
  ideal_rate_per_min NUMERIC(8,2) NOT NULL CHECK (ideal_rate_per_min > 0)
);

CREATE TABLE work_order (
  work_order_id  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wo_number      VARCHAR(30) NOT NULL UNIQUE,
  product_id     INTEGER NOT NULL REFERENCES product(product_id),
  planned_qty    INTEGER NOT NULL CHECK (planned_qty > 0),
  status         VARCHAR(12) NOT NULL DEFAULT 'released'
);

CREATE TABLE production_run (
  run_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  work_order_id  INTEGER  NOT NULL REFERENCES work_order(work_order_id),
  line_id        INTEGER  NOT NULL REFERENCES line(line_id),
  shift_id       SMALLINT NOT NULL REFERENCES shift(shift_id),
  ideal_rate_per_min NUMERIC(8,2) NOT NULL CHECK (ideal_rate_per_min > 0),  -- copied from product at run start
  start_time     TIMESTAMPTZ NOT NULL,
  end_time       TIMESTAMPTZ,
  CHECK (end_time IS NULL OR end_time > start_time)
);

CREATE TABLE production_count (
  count_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id        BIGINT    NOT NULL REFERENCES production_run(run_id),
  count_time    TIMESTAMPTZ NOT NULL,
  good_count    INTEGER   NOT NULL CHECK (good_count >= 0),
  reject_count  INTEGER   NOT NULL DEFAULT 0 CHECK (reject_count >= 0)
);

CREATE TABLE downtime_reason (
  reason_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reason_code  VARCHAR(20)  NOT NULL UNIQUE,
  description  VARCHAR(100) NOT NULL,
  category     VARCHAR(30)  NOT NULL,      -- 'Planned' marks reasons that do not count against availability
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE downtime_event (
  event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  machine_id  INTEGER   NOT NULL REFERENCES machine(machine_id),
  reason_id   INTEGER   NOT NULL REFERENCES downtime_reason(reason_id),
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ,
  CHECK (end_time IS NULL OR end_time > start_time)
);

-- PostgreSQL does not index foreign key columns automatically, so add the ones you join on.
CREATE INDEX ix_run_work_order     ON production_run  (work_order_id);
CREATE INDEX ix_run_line_start     ON production_run  (line_id, start_time);
CREATE INDEX ix_count_run_time     ON production_count (run_id, count_time);
CREATE INDEX ix_downtime_mach_time ON downtime_event  (machine_id, start_time);
CREATE UNIQUE INDEX ux_one_open_event ON downtime_event (machine_id) WHERE end_time IS NULL;
\`\`\`

> [!note] Dialect differences
> MySQL: replace \`GENERATED ALWAYS AS IDENTITY\` with \`AUTO_INCREMENT\`; MySQL has no partial indexes, so enforce one open event in the named query instead. SQL Server: use \`IDENTITY(1,1)\`, \`BIT\`, \`DATETIME2\` (holding UTC values, written with \`SYSUTCDATETIME()\`), and a filtered index \`WHERE end_time IS NULL\`.

> [!note] Versioned migrations
> Keep this DDL as numbered scripts in version control (\`001_create_tables.sql\`, \`002_...\`) and apply them in order, as {{lesson:db-schema}} describes, rather than editing the live database by hand.

### Why it looks this way

- **Surrogate keys plus UNIQUE codes** (\`line_code\`, \`machine_code\`, \`wo_number\`, \`sku\`) keep joins small and let a name change without rewriting history.
- **\`ideal_rate_per_min\` lives on \`product\`, and is copied onto \`production_run\` when the run starts.** The ideal speed depends on what you are making, not on the machine. Because the run keeps its own copy, a later edit to the product changes future runs only, and last month's OEE does not move.
- **\`production_run\` separates "a stretch of making this work order" from the work order itself.** One work order can run across three shifts and be interrupted for a changeover, so it has several runs.
- **\`production_count\` stores interval deltas** (good and reject since the last reading, and the first interval runs from the run start to the first reading), not the PLC's running total. Sums are then trivial, and a PLC counter reset can never produce a negative number.
- **\`downtime_event.end_time\` is NULL while the stop is in progress.** The partial unique index guarantees a machine cannot have two open stops.
- **Planned vs unplanned is a property of the reason's category** (\`category = 'Planned'\`), so lunch breaks leave availability untouched while a jam does not. There is no separate flag to drift out of step with the category.
- **Three indexes follow three queries:** runs by line and time, counts by run and time, events by machine and time ({{lesson:db-indexes}}).

## Step 3: sample data

\`\`\`sql
SET TIME ZONE 'UTC';   -- literals below are read as UTC; shown as 06:00 to 14:00 to match the shift window

INSERT INTO line (line_code, line_name) VALUES ('Line1', 'Plant1 Area10 Line1');
INSERT INTO machine (line_id, machine_code, machine_name) VALUES
  (1, 'M101', 'Filler'), (1, 'M102', 'Capper');
INSERT INTO shift VALUES (1, 'Day', '06:00', '14:00');
INSERT INTO product (sku, description, ideal_rate_per_min) VALUES ('WTR-500', '500 mL water', 100);
INSERT INTO work_order (wo_number, product_id, planned_qty) VALUES ('WO-10432', 1, 40000);
INSERT INTO downtime_reason (reason_code, description, category) VALUES
  ('BREAK', 'Scheduled break',   'Planned'),
  ('JAM',   'Product jam',       'Mechanical'),
  ('CHG',   'Changeover',        'Changeover'),
  ('UNASGN','Unassigned stop',   'Unknown');
INSERT INTO production_run (work_order_id, line_id, shift_id, ideal_rate_per_min, start_time, end_time)
  VALUES (1, 1, 1, 100, '2026-03-02 06:00', '2026-03-02 14:00');   -- 100 copied from product WTR-500
INSERT INTO production_count (run_id, count_time, good_count, reject_count) VALUES
  (1, '2026-03-02 08:00', 8100, 170), (1, '2026-03-02 10:00', 8200, 160),
  (1, '2026-03-02 12:00', 8100, 170), (1, '2026-03-02 14:00', 8087, 163);
INSERT INTO downtime_event (machine_id, reason_id, start_time, end_time) VALUES
  (1, 2, '2026-03-02 07:10', '2026-03-02 07:30'),   -- Filler jam, 20 min
  (2, 2, '2026-03-02 09:00', '2026-03-02 09:10'),   -- Capper jam, 10 min
  (1, 1, '2026-03-02 10:00', '2026-03-02 10:30'),   -- break, 30 min
  (1, 3, '2026-03-02 13:00', '2026-03-02 13:30');   -- changeover, 30 min
\`\`\`

## Step 4: key queries

**Top downtime reasons this week (the Pareto):**

\`\`\`sql
SELECT r.description,
       ROUND(SUM(EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 60)) AS minutes
FROM downtime_event e
JOIN downtime_reason r ON r.reason_id = e.reason_id
JOIN machine m         ON m.machine_id = e.machine_id
WHERE m.line_id = 1
  AND e.start_time >= '2026-03-02' AND e.start_time < '2026-03-09'
  AND e.end_time IS NOT NULL
GROUP BY r.description
ORDER BY minutes DESC, r.description;
\`\`\`

| description | minutes |
|---|---|
| Changeover | 30 |
| Product jam | 30 |
| Scheduled break | 30 |

## Step 5: the OEE query

OEE is availability x performance x quality. Availability is run time over planned production time. Performance is actual output over what the ideal rate would have made in that run time. Quality is good over total. Here are the numbers for the sample run:

- Scheduled time: 480 min. Planned stops (break): 30. **Planned production time: 450.**
- Unplanned stops (two jams, changeover): 60. **Run time: 390.**
- Total made: 33,150 (32,487 good, 663 rejects). Ideal at 100/min x 390 = 39,000.

\`\`\`sql
WITH base AS (
  SELECT r.run_id, r.ideal_rate_per_min,
         EXTRACT(EPOCH FROM (r.end_time - r.start_time)) / 60 AS scheduled_min
  FROM production_run r
  WHERE r.run_id = 1
),
stops AS (
  SELECT r.run_id,
    SUM(CASE WHEN d.category = 'Planned'  THEN EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 60 ELSE 0 END) AS planned_min,
    SUM(CASE WHEN d.category <> 'Planned' THEN EXTRACT(EPOCH FROM (e.end_time - e.start_time)) / 60 ELSE 0 END) AS unplanned_min
  FROM production_run r
  JOIN machine m ON m.line_id = r.line_id
  JOIN downtime_event e ON e.machine_id = m.machine_id
       AND e.start_time >= r.start_time AND e.start_time < COALESCE(r.end_time, now())
  JOIN downtime_reason d ON d.reason_id = e.reason_id
  WHERE r.run_id = 1 AND e.end_time IS NOT NULL
  GROUP BY r.run_id
),
cnt AS (
  SELECT run_id, SUM(good_count) AS good, SUM(good_count + reject_count) AS total
  FROM production_count WHERE run_id = 1 GROUP BY run_id
)
SELECT ROUND(100.0 * run_min / planned_prod, 1)                         AS availability_pct,
       ROUND(100.0 * total / (ideal_rate_per_min * run_min), 1)          AS performance_pct,
       ROUND(100.0 * good / total, 1)                                    AS quality_pct,
       ROUND(100.0 * (run_min / planned_prod) * (total / (ideal_rate_per_min * run_min)) * (good::numeric / total), 1) AS oee_pct
FROM (
  SELECT b.ideal_rate_per_min, c.good, c.total,
         b.scheduled_min - s.planned_min               AS planned_prod,
         b.scheduled_min - s.planned_min - s.unplanned_min AS run_min
  FROM base b JOIN stops s USING (run_id) JOIN cnt c USING (run_id)
) x;
\`\`\`

| availability_pct | performance_pct | quality_pct | oee_pct |
|---|---|---|---|
| 86.7 | 85.0 | 98.0 | 72.2 |

The CTE structure (each piece computes one fact) is deliberate: you can test \`stops\` and \`cnt\` alone against a stopwatch and a counter before trusting the final number. {{lesson:mes-oee}} explains the definitions and the world-class benchmarks.

> [!warning] Edge cases to handle before go-live
> Overlapping stops: if the filler and the capper are both down at 07:15, summing minutes counts that time twice. For a serial line, count line-level stop time by merging overlapping intervals, or log events against one bottleneck machine. Open events (NULL \`end_time\`) are excluded here; for a live screen, treat them as ending at \`now()\`. Runs that cross midnight are fine because the join uses timestamps, not dates.

## Step 6: how Ignition writes to it

### Downtime events: tag change script plus named queries

Create two {{term:named-query|named queries}} in the project: \`Downtime/OpenEvent\` (INSERT with parameters \`machine_id\`, \`reason_id\`, \`start_time\`) and \`Downtime/CloseEvent\` (\`UPDATE downtime_event SET end_time = :end_time WHERE machine_id = :machine_id AND end_time IS NULL\`). Named queries use \`:name\` parameters, which Ignition binds safely instead of pasting text into SQL.

\`\`\`python
# Gateway tag change event on the machine state tag (1 = running, 0 = stopped)
def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange:
        return
    machineId = 1  # M101; in practice, derive from the tag path or a parameter
    if currentValue.value == 0 and previousValue.value == 1:
        system.db.execUpdate("Downtime/OpenEvent",
            {"machine_id": machineId, "reason_id": 4, "start_time": system.date.now()})  # 4 = Unassigned; the Date is an instant, so PostgreSQL TIMESTAMPTZ stores it correctly
    elif currentValue.value == 1 and previousValue.value == 0:
        system.db.execUpdate("Downtime/CloseEvent",
            {"machine_id": machineId, "end_time": system.date.now()})
\`\`\`

> [!note] In 8.1
> Use \`system.db.runNamedQuery\` for both calls. It is deprecated in 8.3 but still works.
>
> On SQL Server with \`DATETIME2\`, a Date passed through JDBC is written as the gateway's local clock time unless you convert it. To keep the UTC rule, let the query stamp the time itself (\`SYSUTCDATETIME()\`) or convert on the way in, and test one row against the clock.

The stop opens with the "Unassigned" reason immediately, so no time is lost if the operator is busy. The Perspective screen then runs an \`UPDATE\` named query to set the real \`reason_id\`. Filtering on the Unassigned reason also gives supervisors a report of stops nobody explained.

### Counts: a transaction group

A {{term:ign-sql-bridge|transaction group}} (SQL Bridge module) moves PLC tag values into table columns on a trigger. A Standard group inserts a row into \`production_count\` when the PLC raises a "interval complete" bit, and the group writes back a handshake to tell the PLC it can clear the interval counters. Items map to columns: \`run_id\` from an expression or a tag set when the run starts, \`good_count\` and \`reject_count\` from the PLC's interval registers, \`count_time\` from the current time. If the database is unreachable, Ignition's store and forward can buffer some writes and replay them later. Check the manual for exactly which features use it in your version and do not assume a transaction group is covered. That is why the PLC-side handshake matters: the group acknowledges only after a successful write, so no interval is lost or doubled.

> [!tip] Named query or transaction group?
> Use a transaction group for repeating, trigger-based logging of a known set of tags. Use named queries for event-driven or user-driven writes from scripts and screens, where you need to choose the SQL and parameters yourself.

## Step 7: test it like an integrator

1. Insert the sample data and compare the OEE query to the hand calculation: 72.2.
2. Open an event, then try to open a second on the same machine. The partial index must reject it.
3. Load 10 million synthetic \`production_count\` rows and check that \`EXPLAIN\` shows an index scan for one run.
4. Pull the network cable on the gateway for five minutes and confirm no counts are missing afterward.
`,

  eli5: `
Think of running a lemonade stand and wanting to know how well your day went. You keep three little notebooks. The first records every time you stopped selling and why: "ran out of cups, 10 minutes" or "lunch break, 30 minutes." The second records how many cups you sold, a tally every hour. The third lists your recipes and how fast you could ideally pour each one.

At the end of the day you ask three simple questions. How much of the day was I actually open? Of the time I was open, did I sell as fast as I could have? And of the cups I poured, how many did people actually get to drink instead of spilling? Multiply the three answers together and you get one score for the day.

A database for a factory is those notebooks, with a rule that you must pick the reason for a stop from a short list, so you never write "cups" in one place and "cup shortage" in another. The Ignition screen just writes the tally and the stops into the notebooks and reads the score back.
`,

  why: `
**Why start from questions instead of tables?** The queries decide the schema. If the first screen needs OEE per shift and a Pareto of reasons, the schema must make those two queries short and fast. Teams that model "everything about the plant" first end up with fifty tables and still cannot answer the one question the plant manager asked.

**Why store event rows instead of a state column?** A machine's status changing over time is naturally a list of intervals. Storing intervals (start, end, reason) lets you answer duration, frequency, time of day and reason questions from the same rows. Logging only "current state" throws history away, and rebuilding it from historian data after the fact is painful.

**Why compute OEE in SQL and not in the PLC or a tag expression?** The PLC knows counts and states but not the shift calendar, work orders or planned stops. SQL can join all of those. It also means the number is reproducible: anyone can rerun the query for last Tuesday and get the same answer, which matters when two shifts argue about who had the bad day. Some integrators prefer a nightly job that stores results in an \`oee_shift\` table and have dashboards read that. Both are reasonable. Keep the raw tables either way.

**Why the handshake and store-and-forward?** Databases go down for patches, networks drop, and gateways restart. Without a handshake the PLC either clears its counters too early (lost counts) or never clears them (double counts). Pushing writes through a buffered connection and acknowledging only after success is what keeps production totals honest. Mistakes here are the usual reason operators stop trusting the screen.
`,

  history: `
OEE (Overall Equipment Effectiveness) came out of Seiichi Nakajima's Total Productive Maintenance work in Japan in the 1960s and 1970s. Computing it from live data used to mean paper counts and spreadsheets filled in at the end of a shift. Plant databases fed from PLC counters and operator reason pick-lists turned it into something you can watch in real time, which is the pattern commercial MES products and Ignition-based builds both follow today.
`,

  examples: [
    {
      title: "Reporting on a work order across shifts",
      body: `A work order often spans several runs. To see progress, sum good counts by work order: \`SELECT w.wo_number, w.planned_qty, SUM(c.good_count) AS made FROM work_order w JOIN production_run r ON r.work_order_id = w.work_order_id JOIN production_count c ON c.run_id = r.run_id GROUP BY w.wo_number, w.planned_qty\`. For WO-10432 after the sample shift this returns 32,487 made against 40,000 planned, or about 81 percent.`
    },
    {
      title: "Fixing an unassigned stop",
      body: `Operators open a Perspective table of events where \`reason_id\` is the Unassigned reason. They pick a reason from a dropdown fed by a named query on \`downtime_reason WHERE is_active\`. Saving calls an UPDATE named query keyed by \`event_id\`. The event's times never change, only its reason, so shift totals stay correct.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 250" role="img" aria-label="Data flow: the PLC supplies counts and machine state; an Ignition transaction group and tag change script write through named queries into the production and downtime tables; a query computes OEE for the Perspective screen">
  <defs>
    <marker id="db-project-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="30" width="130" height="64" rx="6"/>
  <text class="dg-title" x="34" y="54">PLC</text>
  <text class="dg-text-sm" x="34" y="72">counts, state</text>
  <text class="dg-text-sm" x="34" y="88">interval bit</text>
  <rect class="dg-box-accent" x="190" y="20" width="170" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="275" y="45">Transaction group</text>
  <rect class="dg-box-accent" x="190" y="70" width="170" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="275" y="95">Tag change + named query</text>
  <rect class="dg-box" x="400" y="20" width="220" height="90" rx="6"/>
  <text class="dg-title" x="414" y="44">Database</text>
  <text class="dg-text-mono" x="414" y="64">production_count</text>
  <text class="dg-text-mono" x="414" y="82">downtime_event</text>
  <text class="dg-text-mono" x="414" y="100">production_run, ...</text>
  <line class="dg-line" x1="150" y1="50" x2="188" y2="40" marker-end="url(#db-project-ah)"/>
  <line class="dg-line" x1="150" y1="74" x2="188" y2="90" marker-end="url(#db-project-ah)"/>
  <line class="dg-line" x1="360" y1="40" x2="398" y2="50" marker-end="url(#db-project-ah)"/>
  <line class="dg-line" x1="360" y1="90" x2="398" y2="80" marker-end="url(#db-project-ah)"/>
  <rect class="dg-box" x="400" y="160" width="220" height="60" rx="6"/>
  <text class="dg-title" x="414" y="184">OEE query (CTEs)</text>
  <text class="dg-text-sm" x="414" y="204">A x P x Q per run or shift</text>
  <rect class="dg-box-accent" x="190" y="160" width="170" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="275" y="186">Perspective screen</text>
  <text class="dg-text-muted dg-mid" x="275" y="204">named query binding</text>
  <line class="dg-line" x1="510" y1="110" x2="510" y2="158" marker-end="url(#db-project-ah)"/>
  <line class="dg-line" x1="400" y1="190" x2="362" y2="190" marker-end="url(#db-project-ah)"/>
  <line class="dg-dash" x1="188" y1="40" x2="150" y2="62"/>
  <text class="dg-text-muted" x="20" y="242">Handshake: the group acknowledges so the PLC clears its interval counters.</text>
</svg>`
  },

  pitfalls: [
    "Storing the PLC's running total instead of interval deltas, then getting negative counts after a counter reset.",
    "Summing overlapping stops from several machines and reporting more downtime than the shift had minutes.",
    "Reading the ideal rate from the product at report time, so a later edit silently changes last month's OEE. That is why this design copies it to the run at start.",
    "Forgetting the open event case, so a screen goes blank or wrong while a stop is in progress.",
    "Letting operators type reasons as free text instead of choosing from downtime_reason.",
    "Building SQL strings in scripts with string concatenation instead of named query parameters."
  ],

  keyTerms: ["named-query", "ign-sql-bridge", "surrogate-key", "lookup-table", "oee", "composite-index", "execution-plan", "foreign-key"],

  quiz: [
    {
      q: "Why does downtime_event.end_time allow NULL?",
      options: ["It's a mistake; every event must have an end", "A NULL end_time represents a stop that is still in progress", "NULL saves disk space", "NULL means the event was deleted"],
      answer: 1,
      explain: [
        "A stop that is happening now genuinely has no end yet.",
        "Correct. The row is opened when the stop begins and closed when it ends, and a partial unique index can keep it to one open event per machine.",
        "Storage isn't the reason, and the NULL has meaning.",
        "Deleted rows should be removed or flagged, not given NULL times."
      ]
    },
    {
      q: "Run time is 390 min out of 450 planned production minutes. The line made 33,150 pieces at an ideal 100/min, with 32,487 good. What is OEE?",
      options: ["86.7 percent", "85.0 percent", "72.2 percent", "98.0 percent"],
      answer: 2,
      explain: [
        "That's availability (390 / 450) alone.",
        "That's performance alone: 33,150 / (100 x 390).",
        "Correct. 0.867 x 0.850 x 0.980 is about 0.722.",
        "That's quality alone: 32,487 / 33,150."
      ]
    },
    {
      q: "A scheduled lunch break is logged as downtime. How should the schema keep it from hurting availability?",
      options: ["Delete the event before running reports", "Give the reason the Planned category and subtract planned stops from scheduled time", "Store it in a different database", "Give it a NULL start_time"],
      answer: 1,
      explain: [
        "Deleting data loses the record that the break happened.",
        "Correct. The Planned category on the reason lets one query separate planned from unplanned stops.",
        "A separate database breaks joins and adds work for no benefit.",
        "start_time is required for the event to be placed on the timeline."
      ]
    },
    {
      q: "The PLC raises 'interval complete' every two hours and the transaction group inserts a count row. Why include a handshake back to the PLC?",
      options: ["To make the PLC scan faster", "So the PLC clears its interval counters only after the insert succeeded, avoiding lost or double counts", "To encrypt the data", "To create the table automatically"],
      answer: 1,
      explain: [
        "The handshake has nothing to do with scan speed.",
        "Correct. Without it, a database outage or restart could drop an interval or write it twice.",
        "Handshakes confirm delivery. They don't provide encryption.",
        "The group writes to existing tables and doesn't create them."
      ]
    },
    {
      q: "An operator screen needs to insert a stop with user-chosen reason and times. Which Ignition tool fits best?",
      options: ["A named query called from a script or binding with parameters", "A historian tag on the reason", "A transaction group with no trigger", "A raw SQL string built with + from user input"],
      answer: 0,
      explain: [
        "Correct. Named queries are parameterized and event-driven, which is ideal for user-driven writes.",
        "The historian stores tag values over time and doesn't write to your schema.",
        "Groups suit repeating, trigger-based logging of a fixed set of tags.",
        "String concatenation invites SQL injection and quoting bugs."
      ]
    },
    {
      q: "Two machines on one serial line are both down from 07:10 to 07:30. The OEE query sums both events. What's the result?",
      options: ["Correct downtime of 20 minutes", "Downtime double-counted at 40 minutes, lowering availability wrongly", "An error from the database", "Availability above 100 percent"],
      answer: 1,
      explain: [
        "Summing per-machine durations counts the overlap twice.",
        "Correct. Merge overlapping intervals or attribute line stops to one bottleneck machine.",
        "The query runs fine and returns a wrong number, which is worse.",
        "Extra downtime pushes availability down, not above 100."
      ]
    },
    {
      q: "Which index best supports 'all counts for run 1, in time order'?",
      options: ["(count_time, run_id)", "(run_id, count_time)", "(good_count)", "No index; the primary key is enough"],
      answer: 1,
      explain: [
        "With count_time leading, a filter on run_id alone can't seek into the index.",
        "Correct. Equality column first, then the time column, matching the leftmost-prefix rule and giving sorted output.",
        "good_count is not used in the filter.",
        "The primary key is count_id, which doesn't help find a run's rows."
      ]
    }
  ],

  resources: [
    { title: "SQL Bridge (Transaction Groups), Ignition 8.3 manual", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups", type: "docs", source: "Inductive Automation" },
    { title: "Types of Groups (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups/types-of-groups", type: "docs", source: "Inductive Automation" },
    { title: "Transaction Group Examples (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups/transaction-group-examples", type: "docs", source: "Inductive Automation" },
    { title: "Using Named Queries - Example (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition/named-queries/using-named-queries-example", type: "docs", source: "Inductive Automation" },
    { title: "system.db scripting functions (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-db", type: "docs", source: "Inductive Automation" },
    { title: "Database normalization description", url: "https://learn.microsoft.com/en-us/troubleshoot/microsoft-365-apps/access/database-normalization-description", type: "docs", source: "Microsoft Learn" }
  ]
});
