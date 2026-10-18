LC.lesson({
  id: "db-schema",
  title: "Schema design and normalization",
  track: "db",
  minutes: 30,
  level: 3,
  prereqs: ["db-sql-joins"],
  tags: ["schema", "normalization", "keys", "design", "sql"],
  summary: "How to turn a plant spreadsheet into tables that stay correct: keys, the first three normal forms, lookup tables, and when to break the rules on purpose.",
  objectives: [
    "Identify entities and relationships in a plant requirement and draw them as an ER diagram",
    "Explain primary keys, foreign keys, and when to pick a surrogate key over a natural key",
    "Take a spreadsheet-style table through 1NF, 2NF and 3NF and say what anomaly each step removes",
    "Design a lookup table for downtime reason codes instead of storing free text",
    "Decide when denormalizing for reporting is a good trade, and name tables and columns consistently"
  ],

  body: `
## Why schema design matters on the plant floor

A {{term:schema|schema}} is the set of tables, columns, keys and rules that define what your database can hold. Most plant databases start life as a spreadsheet that someone exported, and they carry the spreadsheet's habits with them: the same line name typed five different ways, a downtime reason that is sometimes "Jam" and sometimes "jam - infeed", a column called \`Notes2\`. A good schema makes those mistakes impossible to store. A bad one makes every report an argument about which spelling is right.

This lesson assumes you can already write SELECT, JOIN and GROUP BY ({{lesson:db-sql-joins}}). The running example uses the same plant tables as the SQL lessons: \`line\`, \`machine\`, \`production_run\`, \`downtime_event\` and \`downtime_reason\`.

## Entities, attributes and relationships

Start on paper, not in SQL. Write down the **things** the plant cares about (entities), the facts about each (attributes), and how they connect (relationships).

| Entity | Example attributes | Relationship |
|---|---|---|
| Line | name, area | has many machines |
| Machine | name, ideal rate | belongs to one line, has many downtime events |
| Production run | start, end, good count | runs on one line |
| Downtime event | start, end | happens on one machine, has one reason |
| Downtime reason | code, description | is used by many events |

"Has many" and "belongs to one" are the two words that drive everything. A relationship where one row on one side matches many rows on the other is **one-to-many**, and it is by far the most common. A **many-to-many** relationship (a work order uses many materials, a material is used by many work orders) always needs a third table in the middle, called a junction table.

{{diagram:er}}

## Keys

A {{term:primary-key|primary key}} is the column (or columns) that uniquely identifies a row. A {{term:foreign-key|foreign key}} is a column that holds another table's primary key value, and the database enforces that it points at a row that exists. That enforcement is the whole point: you cannot log downtime against a machine that does not exist.

### Surrogate vs natural keys

A **natural key** is a real-world identifier: a machine tag like \`M101\`, a work order number, a lot code. A **surrogate key** is a meaningless number the database generates, usually named \`<table>_id\`.

| | Natural key | Surrogate key |
|---|---|---|
| Example | \`line_code = 'L1'\` | \`line_id = 7\` |
| Readable in raw data | yes | no |
| Survives a rename | no, every child row must change | yes |
| Size in child tables | often a string | one integer |
| Risk | the "never changes" value changes (lines get renumbered) | duplicates of the same real thing sneak in |

The usual integrator answer is both: a surrogate primary key for joins, plus a **UNIQUE constraint** on the natural identifier so duplicates are rejected. Plants renumber lines, rename machines and reuse work order numbers across years. Surrogate keys let those changes touch one row.

## Normalization with a worked example

{{term:normalization|Normalization}} is the process of splitting tables so each fact is stored exactly once. The payoff is that you cannot get out of sync with yourself. Here is a spreadsheet someone exported from a shift report:

| date | line | machines | reason | reason_cat | minutes | supervisor | supervisor_phone |
|---|---|---|---|---|---|---|---|
| 2026-03-02 | Line 1 | Filler, Capper | Jam | Mechanical | 14, 6 | Dana | 555-0101 |
| 2026-03-02 | Line 2 | Labeler | jam - infeed | Mechanical | 9 | Lee | 555-0102 |
| 2026-03-03 | Line 1 | Filler | Changeover | Planned | 40 | Dana | 555-0101 |

### First normal form: one value per cell

Row 1 packs two machines and two durations into single cells. You cannot sum minutes, count events per machine or join to a machine table. 1NF says every cell holds one value and there are no repeating groups. The fix is one row per downtime event:

| event_date | line | machine | reason | reason_cat | minutes | supervisor | supervisor_phone |
|---|---|---|---|---|---|---|---|
| 2026-03-02 | Line 1 | Filler | Jam | Mechanical | 14 | Dana | 555-0101 |
| 2026-03-02 | Line 1 | Capper | Jam | Mechanical | 6 | Dana | 555-0101 |

### Second normal form: depend on the whole key

With a composite key (event_date, line, machine), the supervisor depends only on date and line, not on the machine. Facts that depend on part of the key get their own table. The symptom is repeating: "Dana" and her phone number are typed again for every machine she supervises.

### Third normal form: depend on nothing but the key

\`reason_cat\` depends on \`reason\`, not on the event. Change "Jam" from Mechanical to Material-handling and you must edit thousands of rows, and miss one. 3NF says non-key columns may not depend on other non-key columns. Move reason and its category into a lookup table. The supervisor phone depends on the supervisor, so people get their own \`supervisor\` table, and a small assignment table says who supervised which line on which day.

A common memory aid: every non-key column depends on **the key, the whole key, and nothing but the key**.

### The result

\`\`\`sql
CREATE TABLE downtime_reason (
  reason_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reason_code  VARCHAR(20)  NOT NULL UNIQUE,
  description  VARCHAR(100) NOT NULL,
  category     VARCHAR(30)  NOT NULL      -- 'Planned' is a category value, not a second flag
);

CREATE TABLE downtime_event (
  event_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  machine_id  INTEGER     NOT NULL REFERENCES machine(machine_id),
  reason_id   INTEGER     NOT NULL REFERENCES downtime_reason(reason_id),
  start_time  TIMESTAMPTZ NOT NULL,       -- an absolute instant; see the UTC note below
  end_time    TIMESTAMPTZ,
  CHECK (end_time IS NULL OR end_time > start_time)
);

CREATE TABLE supervisor (
  supervisor_id  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name      VARCHAR(80) NOT NULL,
  phone          VARCHAR(30)
);

CREATE TABLE line_supervisor (            -- who supervised which line on which day
  line_id        INTEGER NOT NULL REFERENCES line(line_id),
  shift_date     DATE    NOT NULL,
  supervisor_id  INTEGER NOT NULL REFERENCES supervisor(supervisor_id),
  PRIMARY KEY (line_id, shift_date)
);

-- PostgreSQL does NOT index foreign key columns for you (it indexes the primary key
-- and UNIQUE columns only). Add the ones your joins and deletes will use.
CREATE INDEX ix_downtime_event_machine ON downtime_event (machine_id, start_time);
CREATE INDEX ix_downtime_event_reason  ON downtime_event (reason_id);
\`\`\`

The first draft of \`downtime_reason\` had an \`is_planned\` flag beside \`category\`. That is the same 3NF mistake as \`reason_cat\` in the spreadsheet: whether a reason is planned depends on its category, not on the reason row itself, so the two can disagree. Keep one of them. Here the category holds it, and a view or query derives the flag (\`category = 'Planned'\`). (If planned-ness is a real attribute of each reason that you set independently, keep the flag and drop it from the category's meaning instead. The rule is one source for each fact.)

Now the spreadsheet's supervisor columns have a home. \`supervisor\` holds each person once with one phone number, and \`line_supervisor\` records the date-and-line dependency from the 2NF step. Changing Dana's phone is one UPDATE.
> [!note] How UTC is enforced
> \`TIMESTAMPTZ\` does not store a time zone. PostgreSQL converts what you give it to an absolute instant (UTC internally) and shows it in the session's time zone. So set the application connection to UTC (or write explicit offsets such as \`'2026-03-02T12:00:00Z'\`) and the column holds the right instant whatever clock a client uses. SQL Server has no such type; use \`DATETIME2\` and write UTC values with \`SYSUTCDATETIME()\`, or use \`DATETIMEOFFSET\`. A plain \`TIMESTAMP\` or \`DATETIME2\` stores whatever wall-clock value it is given and cannot tell local from UTC, which is how the silent errors start.

> [!note] Identity syntax differs by database
> \`GENERATED ALWAYS AS IDENTITY\` is PostgreSQL (and standard SQL). MySQL uses \`AUTO_INCREMENT\`, and SQL Server uses \`IDENTITY(1,1)\`. The ideas are identical.

Notice \`end_time\` can be NULL. An open event is one that has started and not yet ended, which is a real state in a plant. The \`CHECK\` constraint stops impossible rows.

## Changing the schema safely: migrations

A schema is code. Keep every change as a small, numbered SQL script in version control (\`001_create_tables.sql\`, \`002_add_supervisor.sql\`) and apply them in order with a migration tool or a documented manual run. Record which scripts have run in a table. That way test and production databases end up identical, and "what changed last Tuesday" has an answer. Tools such as Flyway and Liquibase do this bookkeeping for you.

Plan for concurrent writers too: several screens, scripts and Transaction Groups will write to these tables at once. Constraints (keys, CHECK, NOT NULL) are the guard that works no matter who writes, which is why they belong in the database and not only in the Ignition script.

## Lookup tables for reason codes

Never store a downtime reason as free text. A lookup table gives you a controlled list: operators pick from it, reports group by it, and renaming "Jam" to "Product jam" is one UPDATE. Add an \`is_active\` flag instead of deleting retired codes, because old events still point at them. Hierarchies (category, then reason, then detail) can be a self-referencing \`parent_reason_id\` column or separate tables, depending on how deep operators must drill. {{lesson:mes-downtime}} covers how to design the list itself.

## When to denormalize

**Denormalization** means deliberately storing the same fact in more than one place to make reads cheaper. It is a legitimate tool when you know the cost:

- **Reporting tables.** A nightly job that fills \`oee_daily(line_id, day, availability, performance, quality)\` repeats information that could be calculated. Dashboards read it in milliseconds.
- **Snapshots of history.** An event row stores the \`product_id\` active at the time, even though the work order table also knows. If the work order is later corrected, the historical record should not shift.
- **High-rate writes.** Joining on every insert is slower than writing a flat row.

Rule of thumb: keep the transactional tables normalized, and add denormalized copies beside them that can be rebuilt from the source. Never denormalize the only copy.

## Naming conventions

Pick one set of rules and apply them everywhere. A workable set:

- Singular table names (\`machine\`, not \`machines\`), lowercase with underscores. Quoted mixed-case names cause trouble in PostgreSQL.
- Primary key \`<table>_id\`. A foreign key has the same name as the key it points at.
- Times end in \`_time\` (or \`_ts\`) and are stored in UTC (\`TIMESTAMPTZ\` on PostgreSQL). Booleans start with \`is_\`.
- No spaces, no reserved words (\`order\`, \`user\`, \`group\`). Put units in the description or in a name that states them (\`ideal_rate_per_min\`) when they are not obvious.
- Where a table holds Plant 1 equipment, store the equipment number without a hyphen (\`M101\`, \`LT101\`), as PLC and Ignition names do.
`,

  eli5: `
Imagine a school with one giant notebook where the teacher writes down every time a kid got a gold star. Each line says: "Maya, room 12, teacher Mr. Ortiz, Mr. Ortiz's phone number, got a star for helping." When Mr. Ortiz gets a new phone number, you have to find every line with his name and fix it. Miss one and now the notebook disagrees with itself.

The smarter way is a few small notebooks. One lists the kids. One lists the teachers and their phone numbers. One lists the stars, and each star only says "kid number 4, teacher number 2." Now a phone number lives in exactly one place. Change it once and everything is right.

Normalization is just that: sorting a messy notebook into small, tidy ones, with numbers that point from one to the next. The numbers that point are called keys. The price is that to read a full story you have to look in several notebooks, which is what a JOIN does.
`,

  why: `
**Why not just keep the spreadsheet shape?** Because the spreadsheet lets you store contradictions, and plants produce contradictions constantly. Two shifts spell the same reason differently, and your Pareto chart shows them as two causes, each too small to matter. Constraints and lookup tables move the quality check from "hope the operator types it right" to "the database refuses bad data."

**Why surrogate keys if natural ones are readable?** Plants renumber. A line called L3 becomes L5 after a rebuild, and if \`L3\` is the key in a hundred million production rows, you either rewrite them or live with a lie. A surrogate key keeps history stable, and a UNIQUE constraint on the code keeps humans honest. Some integrators still prefer natural keys for small, truly fixed code tables (country codes, unit abbreviations), which is a fair argument.

**Why do experienced people disagree on how normalized to go?** Purists stop at nothing short of 3NF everywhere. Pragmatists note that plant reporting reads far more than it writes, so wide, flat reporting tables are cheaper to query and easier for a Perspective table to bind to. The sensible compromise is to normalize the system of record and denormalize copies that you can regenerate. The failure to avoid is the opposite: a denormalized table that is the *only* source and drifts.

**What it prevents.** Normalization removes three classic anomalies: update (change a fact in some places but not others), insert (cannot record a new reason code until an event uses it), and delete (removing the last event also erases the supervisor's phone number). Every one of these has shown up in a real plant report.
`,

  history: `
Edgar F. Codd introduced the relational model at IBM in 1970, and he defined the first normal form in the early 1970s, with second and third normal forms following soon after. The idea was to protect data from update anomalies and to separate how data is logically organized from how it is stored. Later forms (Boyce-Codd, fourth, fifth) exist but are rarely needed outside specialist design work. Most practitioners aim for 3NF and then selectively denormalize.
`,

  examples: [
    {
      title: "Catching a typo with a foreign key",
      body: `An operator HMI inserts downtime with \`reason_id = 99\`, but no such reason exists. With the foreign key in place, the INSERT fails with a constraint error and the screen shows a message. Without it, the row is stored, the next report's JOIN silently drops it, and 40 minutes of downtime vanish from the Pareto chart.`
    },
    {
      title: "Reporting copy of a normalized design",
      body: `The transactional tables stay at 3NF. A scheduled job runs each night and writes one row per line per shift into a flat \`shift_summary\` table: line name, shift name, total minutes down, good count, reject count. Perspective table components bind to it with a simple \`SELECT * FROM shift_summary WHERE shift_date = ?\`. If the numbers ever look wrong, you truncate it and rebuild from the source tables.`
    }
  ],

  diagrams: {
    er: `<svg viewBox="0 0 640 260" role="img" aria-label="Entity relationship diagram: a line has many machines; a machine has many downtime events; each downtime event points to one downtime reason; a line has many production runs">
  <defs>
    <marker id="db-schema-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box-accent" x="20" y="20" width="150" height="70" rx="6"/>
  <text class="dg-title" x="34" y="44">line</text>
  <text class="dg-text-mono" x="34" y="64">line_id (PK)</text>
  <text class="dg-text-mono" x="34" y="80">line_name</text>
  <rect class="dg-box" x="245" y="20" width="150" height="70" rx="6"/>
  <text class="dg-title" x="259" y="44">machine</text>
  <text class="dg-text-mono" x="259" y="64">machine_id (PK)</text>
  <text class="dg-text-mono" x="259" y="80">line_id (FK)</text>
  <rect class="dg-box" x="470" y="20" width="150" height="70" rx="6"/>
  <text class="dg-title" x="484" y="44">downtime_event</text>
  <text class="dg-text-mono" x="484" y="64">event_id (PK)</text>
  <text class="dg-text-mono" x="484" y="80">machine_id (FK)</text>
  <rect class="dg-box" x="470" y="160" width="150" height="70" rx="6"/>
  <text class="dg-title" x="484" y="184">downtime_reason</text>
  <text class="dg-text-mono" x="484" y="204">reason_id (PK)</text>
  <text class="dg-text-mono" x="484" y="220">reason_code</text>
  <rect class="dg-box" x="20" y="160" width="150" height="70" rx="6"/>
  <text class="dg-title" x="34" y="184">production_run</text>
  <text class="dg-text-mono" x="34" y="204">run_id (PK)</text>
  <text class="dg-text-mono" x="34" y="220">line_id (FK)</text>
  <line class="dg-line" x1="170" y1="55" x2="243" y2="55" marker-end="url(#db-schema-ah)"/>
  <text class="dg-text-sm" x="176" y="47">1 : many</text>
  <line class="dg-line" x1="395" y1="55" x2="468" y2="55" marker-end="url(#db-schema-ah)"/>
  <text class="dg-text-sm" x="401" y="47">1 : many</text>
  <line class="dg-line" x1="545" y1="90" x2="545" y2="158" marker-end="url(#db-schema-ah)"/>
  <text class="dg-text-sm" x="553" y="130">many : 1</text>
  <line class="dg-line" x1="95" y1="90" x2="95" y2="158" marker-end="url(#db-schema-ah)"/>
  <text class="dg-text-sm" x="103" y="130">1 : many</text>
  <text class="dg-text-muted" x="200" y="205">Arrows point from the parent to the child that holds the foreign key.</text>
</svg>`
  },

  pitfalls: [
    "Storing a list in one cell (\"Filler, Capper\") because it was easy in the spreadsheet. You can no longer count or join it.",
    "Free-text reason codes. Every spelling becomes its own bar in your Pareto chart.",
    "Using a name or tag path as the primary key, then renaming the machine.",
    "Skipping foreign keys \"for speed\". Orphan rows silently disappear from JOIN-based reports.",
    "Deleting retired reason codes. Old events still reference them, so deactivate with a flag instead.",
    "Denormalizing the only copy of the data, so nothing remains to rebuild it from."
  ],

  keyTerms: ["schema", "primary-key", "foreign-key", "surrogate-key", "natural-key", "normalization", "lookup-table", "er-diagram"],

  quiz: [
    {
      q: "A shift report row has the cell 'Filler, Capper' in the machines column. Which normal form does this violate, and what is the fix?",
      options: ["1NF; make one row per machine", "2NF; add a composite key", "3NF; move the machine names to a lookup table", "It violates none; text columns can hold lists"],
      answer: 0,
      explain: [
        "Correct. 1NF requires one value per cell with no repeating groups. One row per downtime event and machine fixes it.",
        "2NF concerns columns that depend on only part of a composite key. This row has a multi-value cell, which is a 1NF problem.",
        "3NF is about non-key columns depending on other non-key columns. The multi-value cell comes first.",
        "A database will happily store it, but you can no longer count, sum or join by machine."
      ]
    },
    {
      q: "In downtime rows, 'reason_cat' (Mechanical, Planned) is repeated and depends on the 'reason' text, not on the event. What does that violate?",
      options: ["1NF", "2NF", "3NF", "Nothing; repetition is fine in a historian table"],
      answer: 2,
      explain: [
        "1NF is about multi-valued cells, which this is not.",
        "2NF is about partial dependence on a composite key. Here a non-key column depends on another non-key column.",
        "Correct. A non-key column (category) depends on another non-key column (reason), a transitive dependency. A lookup table fixes it.",
        "The repetition is exactly what lets two rows disagree about a reason's category."
      ]
    },
    {
      q: "Line L3 is rebuilt and renumbered L5. Which design handles this with the least pain across 100 million production rows?",
      options: ["Use line_code as the primary key and update every child row", "Use a surrogate line_id as the key, with line_code as a UNIQUE column", "Store the line name as text in every production row", "Create a new table for L5 and leave L3 as is"],
      answer: 1,
      explain: [
        "Changing a natural key means rewriting every child row, which is slow and risky.",
        "Correct. The code lives in one row, history keeps pointing at the same line_id, and UNIQUE prevents duplicates.",
        "That repeats the name 100 million times and makes a rename a huge update.",
        "That splits one physical line's history across two tables and breaks trend reports."
      ]
    },
    {
      q: "An HMI inserts a downtime event with reason_id = 99, which doesn't exist. What stops it from being stored?",
      options: ["The primary key on downtime_event", "A foreign key from downtime_event.reason_id to downtime_reason", "A UNIQUE constraint on start_time", "Nothing; the next JOIN will report an error"],
      answer: 1,
      explain: [
        "The primary key only ensures event_id is unique.",
        "Correct. The foreign key makes the database reject a value with no matching parent row.",
        "UNIQUE on start_time would block simultaneous events on different machines and has nothing to do with reasons.",
        "An inner JOIN doesn't error. It silently drops the row, which is the worse outcome."
      ]
    },
    {
      q: "Which is the best justification for denormalizing a table in a plant database?",
      options: ["It saves typing in the schema", "A rebuildable reporting table makes dashboards fast while the normalized tables stay the source of truth", "Normalization is obsolete with modern databases", "It makes writes safer"],
      answer: 1,
      explain: [
        "Convenience isn't a design reason, and it creates drift risk.",
        "Correct. The copy is read-optimized and can be regenerated, so it can't permanently disagree with the source.",
        "Normalization still prevents anomalies. Faster hardware doesn't change that.",
        "Duplicated facts make writes riskier because several places must change together."
      ]
    },
    {
      q: "You need to record which materials each work order consumed. A material can appear on many work orders and a work order uses many materials. What do you add?",
      options: ["A materials column on work_order holding a comma-separated list", "A junction table with work_order_id and material_id", "A second work_order table per material", "A foreign key from material to work_order only"],
      answer: 1,
      explain: [
        "That repeats the 1NF violation from the lesson.",
        "Correct. A many-to-many relationship becomes two one-to-many relationships through a junction table, which can also hold quantity.",
        "That duplicates structure and breaks queries.",
        "A single foreign key would allow each material to belong to only one work order."
      ]
    }
  ],

  resources: [
    { title: "Description of the database normalization basics", url: "https://learn.microsoft.com/en-us/troubleshoot/microsoft-365-apps/access/database-normalization-description", type: "docs", source: "Microsoft Learn" },
    { title: "Database normalization simplified", url: "https://learn.microsoft.com/en-us/archive/blogs/frice/database-normalization-simplified", type: "article", source: "Microsoft Learn" },
    { title: "Lesson 2: Designing a Normalized Database", url: "https://learn.microsoft.com/en-us/previous-versions/tn-archive/cc505842(v=technet.10)", type: "article", source: "Microsoft Learn" },
    { title: "SQL in Ignition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Database Table Reference", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/reference-pages/ignition-database-table-reference", type: "docs", source: "Inductive Automation" }
  ]
});
