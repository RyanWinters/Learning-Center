LC.lesson({
  id: "db-intro",
  title: "What a database is: relational, NoSQL and time-series",
  track: "db",
  minutes: 15,
  level: 1,
  prereqs: ["net-data"],
  tags: ["database", "sql", "relational", "time-series", "schema", "keys"],
  summary: "A database is a program that stores tables of rows and keeps them correct while many people use them. Learn the vocabulary, the engines Ignition talks to, and the plant schema every SQL lesson reuses.",
  objectives: [
    "Describe tables, rows, columns, primary keys and foreign keys",
    "Compare relational, document, key-value and time-series databases and say when each fits",
    "Name the engines Ignition connects to and what SQLite is good and bad for",
    "Explain why Ignition leans on SQL for history, alarms, audit and production data",
    "Read the running plant schema (line, machine, production_run, downtime_event, downtime_reason) and its sample data"
  ],

  body: `
## What a database is

A {{term:database|database}} is a program that stores data on disk, lets many users and programs read and change it at the same time, and keeps it correct when something goes wrong halfway. You could store plant data in a spreadsheet or a CSV file, and for a week it would work. Then two people save at once, a power blip hits mid-write, or you need "all downtime longer than 20 minutes on Line 2 last quarter", and the file approach falls apart. A database engine solves those problems for you.

For a controls engineer, databases matter because almost everything above the PLC ends up in one: tag history, alarm journals, production counts, downtime, recipes, work orders. If you can read the data directly, you stop depending on someone else's screen to answer a question.

## Relational databases

An {{term:rdbms|RDBMS}} (relational database management system) organizes data into **tables**. A {{term:database-table|table}} is like one spreadsheet tab with a fixed set of **columns** (each with a name and a data type) and any number of **rows**, one row per thing. You talk to it in {{term:sql|SQL}}.

Two kinds of column carry the "relational" part:

- A {{term:primary-key|primary key}} is a column whose value is unique per row, such as \`machine_id\`. It is how you point at exactly one row.
- A {{term:foreign-key|foreign key}} is a column that stores another table's primary key, such as \`machine.line_id\`. It says "this machine belongs to that line" without copying the line's name into every machine row.

Store each fact once and refer to it by key. If Line 1 is renamed, you change one row and every report is right. That idea is called normalization, and {{lesson:db-schema}} covers it in depth.

## Other kinds of database

| Type | Stores | Good at | Typical examples |
|---|---|---|---|
| Relational | Tables of typed rows, linked by keys | Business records, anything with relationships, reports | SQL Server, MySQL/MariaDB, PostgreSQL |
| {{term:nosql|Document}} (NoSQL) | JSON-like documents, flexible shape | Varied records that change shape, web apps | MongoDB |
| Key-value | One value per key | Caches, session data, very fast lookups | Redis |
| {{term:time-series-database|Time-series}} | Value + timestamp, in time order | Millions of sensor samples, range queries, downsampling | InfluxDB, TimescaleDB |
| Process historian | Time-stamped tag values with quality | Plant history with compression and gap handling | PI, Canary, Ignition Tag Historian (on SQL) |

"NoSQL" does not mean "better". It means a different trade: you give up some structure or guarantees for flexibility or scale. For plant data, relational is the default, and time-series engines handle the high-volume sensor streams. The Ignition Tag Historian stores its data in a relational database, which is why SQL skills help even for history ({{lesson:db-timeseries}} and {{lesson:db-historians}} go deeper).

## The engines you will meet

Ignition connects to databases through {{term:jdbc|JDBC}} drivers. Its documentation lists MariaDB, MySQL, Microsoft SQL Server, PostgreSQL and SQLite as tested databases, with bundled drivers for the first four and a built-in one for SQLite. Other engines work if you install the vendor's JDBC driver, though some features may not.

| Engine | Strengths | Watch for |
|---|---|---|
| {{term:sql-server|Microsoft SQL Server}} | Strong tooling (SSMS), common in Windows plants and IT shops | Licensing cost (Express edition is free but size-limited); T-SQL dialect |
| {{term:mysql-mariadb|MySQL / MariaDB}} | Free, fast, huge community | Two similar but diverging products; dialect differs from the others |
| {{term:postgresql|PostgreSQL}} | Free, very standards-compliant, powerful features | Fewer plant IT teams know it; tuning is your job |
| {{term:sqlite|SQLite}} | Zero setup, one file | The Ignition manual describes it as a single-connection, file-based option, so it suits testing, not production history (check the SQLite page for your version) |

Pick the engine your plant's IT group can back up, patch and monitor. A "better" database that nobody maintains is worse than a plain one with nightly backups ({{lesson:db-operations}}).

## Why Ignition is SQL-centric

Ignition does not ship with its own plant database. Instead, the Gateway holds **database connections**, and nearly every feature that stores data writes it to one of them:

- The Tag Historian writes tag values to SQL tables.
- The alarm journal and the audit log write to SQL.
- Transaction Groups copy PLC values into rows, and back.
- Named Queries run your own SQL from screens and scripts.
- Store-and-forward, where it is enabled on the feature that writes (for example the Tag Historian), buffers writes to local disk when the database is unreachable and flushes them later. Check the manual for which features support it in your version.

So "how do I get this report" nearly always becomes "write a query". Ignition's historian leaves you tables with names starting \`sqlth_\` (metadata such as \`sqlth_te\`, the tag entries) and partitioned data tables named like \`sqlt_data_1_2026_03\`. The {{term:sqlth-tables|sqlth_ tables}} are system tables. Read them freely and never edit them by hand.

> [!note] In 8.1
> Named Queries, database connections and the Tag Historian work the same way in 8.1 for everything in this track. Follow the 8.3 manual links in Resources for current menu locations.

## Client tools

You rarely type SQL into Ignition first. You prove the query in a {{term:db-client-tools|database client}}, then paste it into a Named Query.

- **SSMS** (SQL Server Management Studio): free from Microsoft, SQL Server only.
- **MySQL Workbench**: free from Oracle, MySQL and MariaDB.
- **pgAdmin**: free, PostgreSQL.
- **DBeaver**: free community edition, one tool for all of the above and SQLite. A good choice if you touch several engines.

Connect with a host name, port (SQL Server 1433, MySQL/MariaDB 3306, PostgreSQL 5432), database name and a login. Use a read-only login for exploring.

## The running example: a small plant database

Every SQL lesson in this track uses the same five tables. Learn them once.

> [!note] A different example on purpose
> The Meridian Foods Plant 1 reference plant (Area10 Batching, Area20 Packaging, Line1, M101) is used for tags and paths elsewhere in the course. This SQL sample is a small bottling-and-packaging site with plain names (Line 1, Filler 1), because short numeric ids and obvious names make the join results easy to check by eye. In a real Plant 1 database, \`machine_name\` would hold the equipment number (\`M101\`) and \`line_name\` would hold \`Line1\`. The later lessons (schema, project, procedures) switch to those names where they build the real design.

**Time convention for the whole track:** the tables below show clock times to keep them readable. In a real database you store every timestamp in UTC (\`DATETIME2\` on SQL Server, \`TIMESTAMPTZ\` on PostgreSQL) and convert to local time only when you display it. Mixing local and UTC values in one table is a classic silent error: nothing fails, but every duration is off by the UTC offset.

{{diagram:schema}}

| Table | One row is... | Key columns |
|---|---|---|
| \`line\` | A production line | \`line_id\` (PK), \`line_name\`, \`area\` |
| \`machine\` | A machine on a line | \`machine_id\` (PK), \`line_id\` (FK), \`machine_name\`, \`machine_type\` |
| \`production_run\` | One product run on a line | \`run_id\` (PK), \`line_id\` (FK), \`product_code\`, \`start_time\`, \`end_time\`, \`good_count\`, \`reject_count\` |
| \`downtime_event\` | One stoppage of a machine | \`event_id\` (PK), \`machine_id\` (FK), \`reason_id\` (FK), \`start_time\`, \`end_time\`, \`duration_min\`, \`notes\` |
| \`downtime_reason\` | A coded reason | \`reason_id\` (PK), \`reason_name\`, \`category\` |

Here is the data you will see in every example. A line, a machine without a line (a spare), and a line without machines (still being commissioned) are included on purpose, because they expose how joins behave.

**line**

| line_id | line_name | area |
|---|---|---|
| 1 | Line 1 | Bottling |
| 2 | Line 2 | Bottling |
| 3 | Line 3 | Packaging |
| 4 | Line 4 | Packaging |

**machine**

| machine_id | line_id | machine_name | machine_type |
|---|---|---|---|
| 1 | 1 | Filler 1 | Filler |
| 2 | 1 | Capper 1 | Capper |
| 3 | 1 | Labeler 1 | Labeler |
| 4 | 2 | Filler 2 | Filler |
| 5 | 2 | Capper 2 | Capper |
| 6 | 3 | Case Packer 3 | Case Packer |
| 7 | NULL | Spare Palletizer | Palletizer |

**downtime_reason**

| reason_id | reason_name | category |
|---|---|---|
| 1 | Jam | Mechanical |
| 2 | Changeover | Planned |
| 3 | No Product | Starved |
| 4 | Sensor Fault | Electrical |
| 5 | Operator Break | Planned |
| 6 | Material Shortage | Starved |

**downtime_event** (all on 2026-03-02; times shown without the date)

| event_id | machine_id | reason_id | start_time | end_time | duration_min | notes |
|---|---|---|---|---|---|---|
| 1 | 2 | 1 | 06:14 | 06:21 | 7 | Cap chute |
| 2 | 1 | 2 | 07:00 | 07:45 | 45 | NULL |
| 3 | 3 | 4 | 08:30 | 08:38 | 8 | Label gap sensor |
| 4 | 2 | 1 | 09:05 | 09:14 | 9 | NULL |
| 5 | 4 | 3 | 09:40 | 09:55 | 15 | NULL |
| 6 | 5 | 1 | 10:10 | 10:14 | 4 | NULL |
| 7 | 6 | 2 | 11:00 | 11:30 | 30 | NULL |
| 8 | 1 | 3 | 12:20 | 12:32 | 12 | NULL |
| 9 | 4 | 4 | 13:15 | 13:20 | 5 | Level probe |
| 10 | 2 | 4 | 14:02 | 14:10 | 8 | NULL |

**production_run** (same day)

| run_id | line_id | product_code | start_time | end_time | good_count | reject_count |
|---|---|---|---|---|---|---|
| 1 | 1 | COLA-500 | 06:00 | 14:00 | 18450 | 210 |
| 2 | 2 | COLA-500 | 06:00 | 14:00 | 15200 | 330 |
| 3 | 3 | CASE-24 | 06:00 | 14:00 | 940 | 6 |
| 4 | 1 | COLA-500 | 14:00 | NULL | 6100 | 75 |

Run 4 has no \`end_time\` because it is still running. \`duration_min\` is stored for convenience. In a stricter design you would compute it from the two timestamps.

### Creating the tables

The structure is created with CREATE TABLE. The shape is the same everywhere. The auto-numbering syntax is not.

\`\`\`sql
CREATE TABLE line (
  line_id    INT PRIMARY KEY,
  line_name  VARCHAR(50) NOT NULL,
  area       VARCHAR(50)
);

CREATE TABLE machine (
  machine_id    INT PRIMARY KEY,
  line_id       INT NULL REFERENCES line(line_id),   -- foreign key; NULL = unassigned
  machine_name  VARCHAR(50) NOT NULL,
  machine_type  VARCHAR(50)
);
\`\`\`

| Need | SQL Server | MySQL / MariaDB | PostgreSQL |
|---|---|---|---|
| Auto-number key | \`INT IDENTITY(1,1)\` | \`INT AUTO_INCREMENT\` | \`INT GENERATED ALWAYS AS IDENTITY\` |
| Timestamp type | \`DATETIME2\` (store UTC values) | \`DATETIME\` (store UTC values) | \`TIMESTAMPTZ\` |
| Limit rows | \`TOP 5\` | \`LIMIT 5\` | \`LIMIT 5\` |
| Quote a name | \`[name]\` | backticks | \`"name"\` |
| Current time | \`SYSDATETIME()\` | \`NOW()\` | \`NOW()\` |

Every later lesson shows the portable form first and flags where the three engines differ.
`,

  eli5: `
Imagine a school's filing room. There is one cabinet of student cards, one of classroom cards and one of teacher cards. Each card has the same blanks to fill in, and every card has its own ID number written in the corner.

A student card does not copy the teacher's whole description. It just writes the teacher's ID number. If the teacher changes their name, you fix one card and every student's card still points to the right person.

A database is that filing room, plus a very fast, very picky clerk. You write a request in a special language called SQL ("show me every student whose teacher is number 7") and the clerk finds the cards in a blink. If two people ask for changes at once, or the lights go out while the clerk is working, the clerk makes sure nothing ends up half filed.

Some filing rooms are built for different jobs. One is made for diary entries with a time on each line ("at 9:01 the tank was 40 percent"), written millions of times a day. That is a time-series database. The plain card cabinets are the relational kind, and they are what most of your plant's records will live in.
`,

  why: `
**Why not a spreadsheet or CSV?** Files have no protection against two writers, partial writes or a crash mid-save, and they cannot answer a question without reading everything. A database gives you concurrent access, transactions and indexes. The moment more than one person or program touches the data, you need one.

**Why keys instead of copying names?** A downtime row that stores "Capper 1" as text breaks the day someone types "Capper-1" or the machine is renamed. Storing \`machine_id\` means one correct spelling in one place. The cost is that you need a join to see the name again, which is the subject of {{lesson:db-sql-joins}}. Experienced integrators accept that trade almost every time, except in history tables that are written millions of times and never edited, where some duplication is deliberate.

**Why does Ignition lean on SQL?** Inductive Automation chose to use existing, replaceable databases for history and records instead of a private store. The plant's IT group can already back up, secure and report from a standard engine, and any tool that speaks SQL (Power BI, Excel, an ERP interface) can read the data. The price is that you inherit database work: sizing, indexing, retention, backups. Many Ignition performance problems are database problems in disguise.

**Which engine?** Integrators argue about this constantly. A good rule is to use whatever the customer's IT team already runs and can restore at 3 a.m. SQL Server is the safe answer in Windows shops, PostgreSQL or MariaDB where licensing matters. Avoid SQLite for anything that must survive production load, since the Ignition docs note it allows only one connection at a time.

**Why not just use a historian for everything?** Historians are excellent for process values over time and poor for relational data such as orders, downtime reasons and work instructions. Most plants end up with both: a time-series store for sensors, a relational database for business records.
`,

  history: `
The relational model was proposed by E. F. Codd at IBM in 1970. SQL grew out of IBM research in the 1970s, became an ANSI standard in 1986 and an ISO standard in 1987. Every vendor then added its own extensions, which is why TOP, LIMIT and date functions still differ. The "NoSQL" label became popular around 2009 for non-relational stores built for web-scale workloads.
`,

  examples: [
    {
      title: "Why the spare palletizer has a NULL line",
      body: `Machine 7 has been bought but not installed, so its \`line_id\` is NULL. That is honest: the machine exists, it just belongs to nothing yet. Later lessons use that row to show why an inner join silently drops it while a left join keeps it.`
    },
    {
      title: "Finding Ignition's own tables",
      body: `Connect DBeaver to the database your Tag Historian uses and expand the table list. You will see \`sqlth_te\` (one row per historized tag, with its path), \`sqlth_drv\` and \`sqlth_scinfo\` (driver and tag group metadata) and monthly data tables such as \`sqlt_data_1_2026_03\`. Each data row holds a tag id, a value, a quality code and a timestamp stored as milliseconds since 1970 (epoch time). {{lesson:db-timeseries}} dissects them.`
    }
  ],

  diagrams: {
    schema: `<svg viewBox="0 0 640 340" role="img" aria-label="Plant schema: line has many machines and many production runs; machine has many downtime events; each downtime event has one downtime reason">
  <rect class="dg-box-accent" x="20" y="30" width="170" height="120" rx="6"/>
  <text class="dg-title" x="32" y="52">line</text>
  <text class="dg-text-mono" x="32" y="72">line_id (PK)</text>
  <text class="dg-text-mono" x="32" y="89">line_name</text>
  <text class="dg-text-mono" x="32" y="106">area</text>

  <rect class="dg-box" x="235" y="30" width="170" height="120" rx="6"/>
  <text class="dg-title" x="247" y="52">machine</text>
  <text class="dg-text-mono" x="247" y="72">machine_id (PK)</text>
  <text class="dg-text-mono" x="247" y="89">line_id (FK)</text>
  <text class="dg-text-mono" x="247" y="106">machine_name</text>
  <text class="dg-text-mono" x="247" y="123">machine_type</text>

  <rect class="dg-box" x="450" y="30" width="170" height="120" rx="6"/>
  <text class="dg-title" x="462" y="52">downtime_event</text>
  <text class="dg-text-mono" x="462" y="72">event_id (PK)</text>
  <text class="dg-text-mono" x="462" y="89">machine_id (FK)</text>
  <text class="dg-text-mono" x="462" y="106">reason_id (FK)</text>
  <text class="dg-text-mono" x="462" y="123">start_time, end_time</text>
  <text class="dg-text-mono" x="462" y="140">duration_min, notes</text>

  <rect class="dg-box" x="20" y="200" width="170" height="120" rx="6"/>
  <text class="dg-title" x="32" y="222">production_run</text>
  <text class="dg-text-mono" x="32" y="242">run_id (PK)</text>
  <text class="dg-text-mono" x="32" y="259">line_id (FK)</text>
  <text class="dg-text-mono" x="32" y="276">product_code</text>
  <text class="dg-text-mono" x="32" y="293">start_time, end_time</text>
  <text class="dg-text-mono" x="32" y="310">good_count, reject_count</text>

  <rect class="dg-box" x="450" y="200" width="170" height="120" rx="6"/>
  <text class="dg-title" x="462" y="222">downtime_reason</text>
  <text class="dg-text-mono" x="462" y="242">reason_id (PK)</text>
  <text class="dg-text-mono" x="462" y="259">reason_name</text>
  <text class="dg-text-mono" x="462" y="276">category</text>

  <line class="dg-line" x1="190" y1="90" x2="235" y2="90"/>
  <text class="dg-text-sm" x="194" y="82">1</text>
  <text class="dg-text-sm" x="217" y="82">N</text>
  <line class="dg-line" x1="405" y1="90" x2="450" y2="90"/>
  <text class="dg-text-sm" x="409" y="82">1</text>
  <text class="dg-text-sm" x="432" y="82">N</text>
  <line class="dg-line" x1="105" y1="150" x2="105" y2="200"/>
  <text class="dg-text-sm" x="112" y="168">1</text>
  <text class="dg-text-sm" x="112" y="192">N</text>
  <line class="dg-line" x1="535" y1="150" x2="535" y2="200"/>
  <text class="dg-text-sm" x="542" y="168">N</text>
  <text class="dg-text-sm" x="542" y="192">1</text>
  <text class="dg-text-muted" x="235" y="200">1 = one row, N = many rows.</text>
  <text class="dg-text-muted" x="235" y="220">One line has many machines and many runs.</text>
  <text class="dg-text-muted" x="235" y="240">One machine has many downtime events.</text>
  <text class="dg-text-muted" x="235" y="260">Each event points at one reason.</text>
</svg>`
  },

  pitfalls: [
    "Using a spreadsheet or SQLite file as the production data store because it was quick to set up.",
    "Storing the same fact (a machine name, a line name) as text in many tables instead of by key.",
    "Treating NULL as zero or empty text. It means unknown or missing.",
    "Picking an engine nobody in IT can back up or restore.",
    "Editing Ignition's sqlth_ system tables by hand."
  ],

  keyTerms: ["database", "rdbms", "sql", "database-table", "primary-key", "foreign-key", "nosql", "time-series-database", "sql-server", "postgresql", "mysql-mariadb", "sqlite", "jdbc", "db-client-tools", "sqlth-tables"],

  quiz: [
    {
      q: "In the plant schema, machine.line_id is best described as what?",
      options: ["A primary key of machine", "A foreign key pointing at line.line_id", "A copy of the line's name", "A unique timestamp"],
      answer: 1,
      explain: [
        "machine_id is the primary key of machine. line_id repeats across machines on the same line.",
        "Correct. It stores the key of the owning line, which links the two tables without copying the line's details.",
        "It stores the line's id number, not its name. The name lives once in the line table.",
        "It has nothing to do with time. It identifies a line."
      ]
    },
    {
      q: "You need to store 50,000 temperature samples per minute and read back ranges by time. Which kind of store fits that workload best?",
      options: ["A key-value cache such as Redis", "A spreadsheet", "A document database holding one JSON file per sample", "A time-series database or historian"],
      answer: 3,
      explain: [
        "Key-value stores are fast for lookup by key, not for range queries over time.",
        "A spreadsheet cannot take that write rate or share it safely.",
        "That would work poorly. One document per sample wastes space and makes range queries slow.",
        "Correct. Time-series stores and historians are built for high-rate time-ordered writes and time-range reads with compression."
      ]
    },
    {
      q: "Why does Ignition rely on external SQL databases for so many features?",
      options: ["SQL databases are already backed up, secured and read by other plant and IT tools", "It cannot store any data itself", "Only SQL databases support timestamps", "Ignition licensing requires it"],
      answer: 0,
      explain: [
        "Correct. Using a standard engine lets IT use their usual backup and reporting tools, and lets other software read the same data.",
        "Ignition keeps its own configuration internally. It uses SQL for history, alarm journal, audit and your records.",
        "Many stores support timestamps. This is not the reason.",
        "Licensing does not require it. The design does."
      ]
    },
    {
      q: "A colleague wants to use SQLite for the Tag Historian on a busy production Gateway. What is the strongest objection?",
      options: ["SQLite cannot store numbers", "Ignition does not include a SQLite driver", "SQLite allows only one connection at a time and lacks server-grade features", "SQLite stores data in the cloud"],
      answer: 2,
      explain: [
        "SQLite stores numbers fine.",
        "Ignition includes a built-in SQLite driver.",
        "Correct. It is a single-file engine with one connection at a time, which suits testing but not a production workload with concurrent writers and readers.",
        "SQLite is a local file, not a cloud service."
      ]
    },
    {
      q: "In the sample data, why is machine 7 (Spare Palletizer) stored with line_id NULL?",
      options: ["It is a data-entry mistake that must be fixed", "It exists but is not assigned to any line, and NULL represents a missing value", "NULL means line 0", "NULL makes the row inactive"],
      answer: 1,
      explain: [
        "It is deliberate. A machine can exist before it is installed on a line.",
        "Correct. NULL means unknown or not applicable, so the machine is not claimed by any line.",
        "NULL is not zero. Line 0 would be a real value that does not exist.",
        "NULL has no such meaning. A separate status column would do that."
      ]
    },
    {
      q: "Which statement about the engines Ignition connects to is accurate?",
      options: ["Only SQL Server is supported", "PostgreSQL requires the Tag Historian module to be removed", "NoSQL stores such as MongoDB are the default", "MariaDB, MySQL, SQL Server, PostgreSQL and SQLite are listed as tested, and others work through a vendor JDBC driver"],
      answer: 3,
      explain: [
        "Several engines are supported, not just one.",
        "Nothing like that is required.",
        "Ignition's records and history use relational SQL databases.",
        "Correct. The 8.3 manual lists these as tested, and you can add other engines by installing their JDBC driver, with some features possibly unavailable."
      ]
    }
  ],

  resources: [
    { title: "Database Connections (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/database-connections", type: "docs", source: "Inductive Automation" },
    { title: "SQL in Ignition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition", type: "docs", source: "Inductive Automation" },
    { title: "JDBC Drivers (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/jdbc-drivers", type: "docs", source: "Inductive Automation" },
    { title: "Tag History Providers (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian/tag-history-providers", type: "docs", source: "Inductive Automation" },
    { title: "Connecting to SQLite (Ignition 8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/database-connections/connecting-to-databases/connecting-to-sqlite", type: "docs", source: "Inductive Automation" },
    { title: "PostgreSQL tutorial: The SQL Language", url: "https://www.postgresql.org/docs/current/tutorial-sql.html", type: "docs", source: "PostgreSQL" }
  ]
});
