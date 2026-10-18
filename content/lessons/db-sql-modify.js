LC.lesson({
  id: "db-sql-modify",
  title: "SQL III: INSERT, UPDATE, DELETE and transactions",
  track: "db",
  minutes: 15,
  level: 2,
  prereqs: ["db-sql-select"],
  tags: ["sql", "insert", "update", "delete", "transaction", "acid", "sql injection", "named queries"],
  summary: "Change data safely: the three write statements, the missing-WHERE disaster, transactions you can roll back, and why values must travel as parameters.",
  objectives: [
    "Write INSERT, UPDATE and DELETE statements and check their effect with a SELECT first",
    "Explain the missing-WHERE mistake and three habits that prevent it",
    "Group statements into a transaction with BEGIN, COMMIT and ROLLBACK and state what ACID guarantees",
    "Describe isolation levels in plain words and why long transactions hurt",
    "Explain SQL injection and how parameterized queries and Ignition Named Queries prevent it"
  ],

  body: `
## Reading is safe, writing is not

{{lesson:db-sql-select}} only looked at data. The three write statements, INSERT, UPDATE and DELETE, change it, and a database does not ask "are you sure?" The habits in this lesson are the ones that keep a typo from becoming a lost shift of production data. Examples use the plant tables from {{lesson:db-intro}}, and we assume \`event_id\` is auto-numbered.

## INSERT: add rows

Always list the columns. Without a column list the values must match the table's column order exactly, and any future column breaks the statement.

\`\`\`sql
INSERT INTO downtime_event
  (machine_id, reason_id, start_time, end_time, duration_min, notes)
VALUES
  (3, 1, '2026-03-02T14:30:00', '2026-03-02T14:36:00', 6, 'Label web tore');
\`\`\`

The database assigns \`event_id\` (11 here). Columns you leave out get their default, or NULL if none is set. A NOT NULL column with no default makes the insert fail, which is a feature: the table refuses incomplete rows.

You can insert several rows in one statement by repeating the parenthesized group: \`VALUES (...), (...), (...)\`. One statement with many rows is much faster than many statements, which matters when a script logs data.

Finding the id the database just generated differs by engine:

| Engine | Get the new key |
|---|---|
| SQL Server | \`INSERT ... OUTPUT INSERTED.event_id VALUES (...)\` or \`SELECT SCOPE_IDENTITY()\` |
| MySQL / MariaDB | \`SELECT LAST_INSERT_ID()\` right after the insert |
| PostgreSQL | \`INSERT ... VALUES (...) RETURNING event_id\` |

Check your work with a SELECT:

\`\`\`sql
SELECT event_id, machine_id, reason_id, duration_min, notes
FROM downtime_event
WHERE event_id = 11;
\`\`\`

| event_id | machine_id | reason_id | duration_min | notes |
|---|---|---|---|---|
| 11 | 3 | 1 | 6 | Label web tore |

You can also insert the result of a query: \`INSERT INTO archive_table (cols) SELECT cols FROM downtime_event WHERE ...\`.

## UPDATE: change rows

\`\`\`sql
UPDATE downtime_event
SET    notes = 'Cap chute jam, second time this shift'
WHERE  event_id = 4;
\`\`\`

The database replies with a **rows affected** count: 1. That number is your first sanity check. You expected one row, you got one. If it says 10, stop and think.

\`SET\` takes several assignments separated by commas, and the right-hand side can use the old value: \`SET duration_min = duration_min + 5\`.

### The missing-WHERE horror story

Here is a story that every database team has told in some form. Someone needs to reclassify one downtime event. They type:

\`\`\`sql
UPDATE downtime_event
SET    reason_id = 1;
\`\`\`

and run it. There is no WHERE, so it is valid. Every row in the table becomes "Jam". The reply says "10 rows affected" and it is easy to miss. Now a quarter of downtime history says the lines only ever jammed, the Pareto chart is wrong, and the only fix is a restore from last night's backup, losing everything entered today. It happens in plants, in banks, in startups.

The same applies to DELETE. \`DELETE FROM downtime_event;\` removes every row.

Habits that prevent it:

1. **Write the SELECT first.** Run \`SELECT * FROM downtime_event WHERE event_id = 4\`, confirm it returns exactly the rows you mean, then change SELECT * FROM into UPDATE ... SET (or DELETE FROM) while leaving the WHERE untouched.
2. **Open a transaction.** Run the statement inside \`BEGIN\`, look at the rows-affected count and re-select, and only then COMMIT. If it is wrong, ROLLBACK.
3. **Use a limited login.** Day-to-day tools should log in with an account that can read and write specific tables, not the database owner.
4. **Turn on guard rails.** MySQL's command-line client has a \`--safe-updates\` option that refuses UPDATE or DELETE without a key in the WHERE. Many GUI clients can warn on a missing WHERE.
5. **Have a backup you have restored at least once** ({{lesson:db-operations}}).

## DELETE: remove rows

\`\`\`sql
DELETE FROM downtime_event
WHERE event_id = 11;
\`\`\`

Two things to know.

**Foreign keys protect you.** Try to delete reason 1 (Jam) while events still point at it and the database refuses with an error. That is the key doing its job: you cannot orphan rows. Deleting reason 6 (Material Shortage, unused) works.

**Deleting history is rarely right.** In production data, people usually add an \`is_active\` or \`deleted_at\` column and filter on it (a "soft delete"), so the original is auditable. Hard deletes are for test data and for retention jobs that purge old rows by date.

| Statement | Removes | Can roll back? | Notes |
|---|---|---|---|
| \`DELETE FROM t WHERE ...\` | Chosen rows | Yes | Logged row by row, slower on huge tables |
| \`DELETE FROM t\` | All rows | Yes | The missing-WHERE case |
| \`TRUNCATE TABLE t\` | All rows, quickly | SQL Server and PostgreSQL yes; MySQL and MariaDB no | Resets auto-number, often blocked by foreign keys |
| \`DROP TABLE t\` | The table itself | Mostly no | Structure and data gone |

## Transactions: all or nothing

A {{term:db-transaction|transaction}} wraps several statements so they succeed or fail together. Suppose an operator reports that the 45-minute changeover on Filler 1 (event 2) was really a 30-minute changeover followed by a 15-minute operator break. That needs two changes:

\`\`\`sql
BEGIN TRANSACTION;      -- SQL Server; use START TRANSACTION in MySQL/MariaDB, BEGIN in PostgreSQL

UPDATE downtime_event
SET    end_time = '2026-03-02T07:30:00', duration_min = 30
WHERE  event_id = 2;

INSERT INTO downtime_event
  (machine_id, reason_id, start_time, end_time, duration_min)
VALUES
  (1, 5, '2026-03-02T07:30:00', '2026-03-02T07:45:00', 15);

COMMIT;
\`\`\`

{{diagram:txn}}

If the INSERT fails (a bad reason id, a lost connection), you issue \`ROLLBACK\` and the UPDATE is undone as though it never ran. Without the transaction, you would be left with 15 minutes of downtime missing and a report that totals 128 instead of 143.

By default each statement is its own transaction (**autocommit**). MySQL's manual says autocommit is on by default, and the other engines behave the same way when you do not open one explicitly. \`BEGIN\` starts an explicit transaction that holds until you COMMIT or ROLLBACK.

> [!warning] Never leave a transaction open
> An open transaction holds locks on the rows it touched. A forgotten BEGIN in a client window can block production writers for hours. Commit or roll back right away, and close the tab.

### ACID in plain words

The guarantees of a real transaction are called {{term:acid|ACID}}:

| Letter | Promise | Example |
|---|---|---|
| **A**tomicity | All the statements happen or none do | The split above never half-applies |
| **C**onsistency | Rules (keys, NOT NULL, checks) hold before and after | You cannot commit an event for a reason that does not exist |
| **I**solation | Concurrent transactions do not trip over each other | A report running during your edit sees sensible data |
| **D**urability | Once committed, it survives a crash or power loss | The server loses power one second after COMMIT; your row is still there |

### Isolation in plain words

Two people use the database at once. The {{term:isolation-level|isolation level}} sets how much of one person's unfinished work the other can see.

- **Read uncommitted**: you may see changes that the other person might still roll back (a "dirty read"). Fast, risky. SQL Server's \`WITH (NOLOCK)\` hint behaves this way.
- **Read committed**: you only see committed data, but if you read the same row twice, it may change in between. This is the default in SQL Server and PostgreSQL.
- **Repeatable read**: rows you have already read will not change under you. This is the MySQL/MariaDB InnoDB default.
- **Serializable**: transactions behave as if they ran one after another. Safest, slowest, and can cause more waiting or retry errors.

For plant reporting, the default is almost always fine. Reach for stricter levels when a calculation reads then writes (for example, allocating the next batch number). Keep transactions short: do the thinking before BEGIN, not inside it.

> [!note] Deadlocks
> If transaction A holds row 1 and wants row 2, while B holds row 2 and wants row 1, the engine picks one as the victim and rolls it back with a deadlock error. Your code should be ready to retry. Touching tables in the same order everywhere reduces them.

In Ignition, scripts can group several database calls in one transaction with \`system.db.beginTransaction\`, \`commitTransaction\`, \`rollbackTransaction\` and \`closeTransaction\`. A standalone Named Query call is a single statement and commits on its own; check the manual for how Named Queries behave when you pass a transaction handle.

## Parameterized queries and SQL injection

Here is a Perspective script that builds SQL by gluing text together:

\`\`\`python
name = self.view.custom.machineName          # typed by a user
query = "SELECT machine_id FROM machine WHERE machine_name = '" + name + "'"
\`\`\`

If the user types \`Filler 1\`, the query is fine. If they type \`x' OR '1'='1\`, the text becomes:

\`\`\`sql
SELECT machine_id FROM machine WHERE machine_name = 'x' OR '1'='1'
\`\`\`

and every machine is returned. Worse values can end a statement and start another. That is {{term:sql-injection|SQL injection}}. It is not just an internet problem. A barcode, a free-text note, a part number scanned off a label, or an apostrophe in a name like \`O'Brien\` all break string-built SQL, with or without malice.

The fix is a {{term:parameterized-query|parameterized query}}. The SQL text contains placeholders, and the values travel separately. The database parses the statement first and fills the values in afterward, so a value can never be read as SQL.

\`\`\`python
# 8.3: a Named Query (saved SQL: SELECT machine_id FROM machine WHERE machine_name = :name)
rows = system.db.execQuery("Plant/MachineByName", {"name": name})
\`\`\`

> [!note] In 8.1
> The classic call is \`system.db.runPrepQuery("SELECT machine_id FROM machine WHERE machine_name = ?", [name])\`, or \`system.db.runNamedQuery\`. Both still work in 8.3 but the \`runQuery\` and \`runNamedQuery\` families are on the deprecated list, so write new code with \`execQuery\` and \`execUpdate\` (see the 8.3 \`system.db\` page).

The \`:name\` in the saved query, or the \`?\` in the 8.1 call, is the placeholder. \`x' OR '1'='1\` now means "a machine literally named x' OR '1'='1", which matches nothing.

Placeholders hold **values**. They cannot stand in for table or column names. If a name must vary, choose it from a fixed allow-list in code rather than from user text.

### How Ignition Named Queries parameterize

A {{term:named-query|Named Query}} is a saved SQL statement with typed parameters, referenced by name from bindings and scripts. In the query text you write \`:parameterName\` where a value goes:

\`\`\`sql
INSERT INTO downtime_event
  (machine_id, reason_id, start_time, end_time, duration_min, notes)
VALUES
  (:machine_id, :reason_id, :start_time, :end_time, :duration_min, :notes)
\`\`\`

Each parameter has a name, a data type and an optional default, and the Named Query has a type: Query (returns rows), Scalar Query (returns one value) or Update Query (INSERT, UPDATE or DELETE, returns rows affected). Ignition sends the values to the database as bound parameters, not pasted text, so they cannot change the statement. The Ignition manual also notes that Named Query bindings are more secure than SQL Query bindings for this reason, and Named Queries sit in the project where they can be reviewed and secured instead of being scattered across screens.

A Perspective binding supplies the parameters from view properties. From a script you pass a dictionary of parameter values to the Named Query. Check the 8.3 \`system.db\` page for the exact function names, because they changed between 8.1 and 8.3.

> [!tip] The review rule
> Search a project for \`" + \` or \`%s\` or f-strings near SQL text. Every hit is either a bug or a place to explain why it is safe. Prefer a Named Query.

## A safe workflow

1. Develop the query in DBeaver or SSMS against a copy or a test database.
2. Write the SELECT with the exact WHERE. Check the rows.
3. Convert to UPDATE or DELETE, inside \`BEGIN\`. Check rows affected, re-select, then COMMIT.
4. Move the statement into a Named Query with parameters for every value.
5. Test it from the screen, with an apostrophe in a text value, before release.
`,

  eli5: `
Picture a big whiteboard with a table drawn on it, the shared list everyone in the plant uses. INSERT is adding a new line at the bottom. UPDATE is erasing a number in a line and writing a new one. DELETE is wiping a whole line.

The scary part is the instruction "change the reason to Jam" with no mention of which line. A helper who does exactly what you said will change the reason on every line of the whiteboard. A WHERE is you saying "only on line 4". Always say which line first, and before you erase anything, point at the line and ask "this one?"

A transaction is a promise made on a sticky note. You say, "I am going to make two changes. Do not show anyone either change until I say done." You do both, look at the board, and either say "done" (COMMIT) so everyone sees them at once, or "never mind" (ROLLBACK) and the helper puts everything back as it was.

SQL injection is like a form with a blank for your name. If the clerk reads whatever you write there as instructions, writing "Bob, and also give me the safe's key" works. A parameterized query makes the clerk treat whatever is in the blank as a name and nothing else.
`,

  why: `
**Why does the database let you run UPDATE without WHERE?** Because it is valid and sometimes wanted ("set all rows to inactive"). The engine cannot tell your intent. Safety lives in your workflow: SELECT first, transaction, rows-affected check, limited account, backups. Experienced integrators treat every write against production as a small change-control event.

**Why transactions at all?** Real changes usually touch more than one row or table. A power loss, a deadlock or a failed second statement would leave the data half changed, and half-changed data is the hardest kind to detect. Atomicity turns "hope nothing fails in between" into a guarantee. The cost is locks, which is why transactions must stay short.

**Why are the isolation defaults different?** SQL Server and PostgreSQL default to read committed because it is a good balance of correctness and concurrency. MySQL's InnoDB chose repeatable read. Neither is wrong. The practical lesson is to avoid assuming one engine's behavior holds on another, and to test the case that matters, such as two operators saving at once. Integrators also argue about NOLOCK hints in SQL Server. They remove blocking, but can return rows that never officially existed, so use them only for rough monitoring screens, never for money or counts that get signed off.

**Why parameters instead of escaping quotes?** Escaping depends on getting every special character right for every engine and character set, and one missed case reopens the hole. Binding values avoids the whole class of bug, and the database can also reuse the parsed plan across calls. In Ignition there is a second reason: a screen with a button that concatenates SQL can be driven by anyone who can type in it. Named Queries keep the SQL fixed and expose only typed parameters.

**Why soft deletes?** Production records feed audits, OEE and genealogy. If a row is physically gone, you cannot prove what happened. Flagging it keeps the trail. The cost is that every query must remember to filter, which is why people wrap it in a view ({{lesson:db-procs}}).
`,

  history: `
Transactions were formalized in the late 1970s and early 1980s. Jim Gray's work on transaction processing is the foundation, and the ACID acronym was coined by Theo Haerder and Andreas Reuter in 1983. SQL injection became widely known in the late 1990s, when web forms started passing text into databases, and it has been on OWASP's top vulnerability lists ever since. Parameterized queries are the standard defense.
`,

  examples: [
    {
      title: "Using rows affected as a tripwire",
      body: `An operator edits a downtime reason from a Perspective screen. The Update Query runs \`UPDATE downtime_event SET reason_id = :reason_id WHERE event_id = :event_id\` and returns the number of rows affected. The script checks that the value equals 1. Any other value (0 means a stale id, more than 1 means a broken WHERE) raises an error and logs it. The check costs one line and makes silent corruption loud.`
    },
    {
      title: "Rehearsing a risky update",
      body: `Before running \`UPDATE downtime_event SET reason_id = 3 WHERE reason_id = 4\` on production (folding Sensor Fault into No Product), wrap it: BEGIN, run it, then \`SELECT reason_id, COUNT(*) FROM downtime_event GROUP BY reason_id\`. On the sample data the update reports 3 rows affected (events 3, 9 and 10), Sensor Fault drops from 3 to 0 and No Product rises from 2 to 5. If anything looks off, ROLLBACK and nothing has changed.`
    }
  ],

  diagrams: {
    txn: `<svg viewBox="0 0 640 220" role="img" aria-label="A transaction: BEGIN, then UPDATE, then INSERT, then COMMIT makes both changes visible. An error at any step goes to ROLLBACK, which undoes everything.">
  <defs>
    <marker id="db-sql-modify-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/>
    </marker>
  </defs>
  <text class="dg-title" x="20" y="24">Changes are held privately until COMMIT</text>
  <rect class="dg-box" x="20" y="50" width="100" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="70" y="77">BEGIN</text>
  <rect class="dg-box" x="160" y="50" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="225" y="77">UPDATE event 2</text>
  <rect class="dg-box" x="330" y="50" width="130" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="395" y="77">INSERT break</text>
  <rect class="dg-box-ok" x="500" y="50" width="120" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="560" y="77">COMMIT</text>
  <line class="dg-line" x1="120" y1="72" x2="158" y2="72" marker-end="url(#db-sql-modify-ah)"/>
  <line class="dg-line" x1="290" y1="72" x2="328" y2="72" marker-end="url(#db-sql-modify-ah)"/>
  <line class="dg-line" x1="460" y1="72" x2="498" y2="72" marker-end="url(#db-sql-modify-ah)"/>
  <text class="dg-text-muted dg-mid" x="560" y="112">both changes visible</text>
  <text class="dg-text-muted dg-mid" x="560" y="128">to everyone, durable</text>
  <line class="dg-line-alarm" x1="395" y1="94" x2="395" y2="150" marker-end="url(#db-sql-modify-ah)"/>
  <text class="dg-text-muted" x="405" y="124">error or change of mind</text>
  <rect class="dg-box-alarm" x="300" y="152" width="190" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="395" y="179">ROLLBACK: undo everything</text>
  <text class="dg-text-muted" x="20" y="130">Other sessions see the old</text>
  <text class="dg-text-muted" x="20" y="146">values until COMMIT.</text>
</svg>`
  },

  pitfalls: [
    "Running UPDATE or DELETE without a WHERE, or with a WHERE you never tested as a SELECT.",
    "Ignoring the rows-affected count.",
    "Building SQL by concatenating user text, scanned barcodes or notes into a string.",
    "Leaving a BEGIN open in a client window and blocking everyone else.",
    "Using DELETE to remove records that auditors may need later.",
    "Assuming TRUNCATE can be rolled back on every engine.",
    "Assuming every engine has the same default isolation level."
  ],

  keyTerms: ["db-transaction", "acid", "isolation-level", "sql-injection", "parameterized-query", "named-query", "where-clause", "null-value"],

  quiz: [
    {
      q: "Someone runs UPDATE downtime_event SET reason_id = 1; and the tool says '10 rows affected'. What is the most likely situation?",
      options: [
        "The update worked as intended on one event",
        "The WHERE clause was left off, so every row changed",
        "The foreign key blocked the change",
        "The transaction was rolled back automatically"
      ],
      answer: 1,
      explain: [
        "Ten rows affected means every event changed, not one.",
        "Correct. Without WHERE the statement applies to all rows. If it was inside an open transaction, ROLLBACK undoes it.",
        "A foreign key violation raises an error and changes nothing. Reason 1 exists.",
        "Nothing rolls back automatically in autocommit mode. The change is already committed."
      ]
    },
    {
      q: "You split a 45-minute changeover into 30 minutes plus a 15-minute break using an UPDATE and an INSERT. Why wrap them in a transaction?",
      options: [
        "If the INSERT fails, ROLLBACK undoes the UPDATE so the data is never half changed",
        "It makes the statements run faster",
        "Transactions are required for any INSERT",
        "It stops other users from ever reading the table"
      ],
      answer: 0,
      explain: [
        "Correct. Atomicity means both changes happen or neither does, so downtime totals stay consistent.",
        "Transactions add overhead, they do not speed things up.",
        "Single statements are already atomic in autocommit mode.",
        "Other sessions can still read. Under the default isolation they see the old values until you commit."
      ]
    },
    {
      q: "A Perspective script builds SELECT ... WHERE part_no = '<scanned text>' by string concatenation. A part labeled O'Brien-7 throws a syntax error. What does this show, and what is the fix?",
      options: [
        "The barcode scanner is faulty; replace it",
        "Part numbers must never contain apostrophes; reject them on the screen",
        "The database needs a larger text column",
        "The apostrophe is being read as SQL syntax; pass the value as a bound parameter (Named Query)"
      ],
      answer: 3,
      explain: [
        "The scanner read the label correctly. The SQL string construction is the problem.",
        "Blocking characters is a fragile patch. It does not fix the design and some inputs will slip through.",
        "Column size would cause a truncation error, not a syntax error at the apostrophe.",
        "Correct. This is the same weakness that allows SQL injection. Bound parameters make the value data, never syntax."
      ]
    },
    {
      q: "Which statement about placeholders in a parameterized query is true?",
      options: [
        "They can replace table and column names",
        "They only work for numbers",
        "They hold values, and the database never interprets those values as SQL",
        "They are only available in PostgreSQL"
      ],
      answer: 2,
      explain: [
        "Identifiers cannot be bound. Use a fixed allow-list in code if a name must vary.",
        "Text, dates and other types can all be bound.",
        "Correct. The statement is parsed first and the values are supplied separately.",
        "Every major engine supports parameterized statements, and Ignition's Named Queries use them."
      ]
    },
    {
      q: "Your SQL Server report runs at read committed. Which problem can still occur?",
      options: [
        "Reading uncommitted changes that are later rolled back",
        "Losing committed data after a power failure",
        "Reading the same row twice in one transaction and seeing a different value",
        "Reading a row that has never existed in any form"
      ],
      answer: 2,
      explain: [
        "Read committed prevents dirty reads, so you only see committed data.",
        "Durability is separate from isolation. Committed data survives a crash.",
        "Correct. Another session can commit a change between your two reads. Repeatable read or snapshot isolation prevents it.",
        "That is a dirty read of a rolled-back insert, which read committed prevents."
      ]
    },
    {
      q: "What does an Ignition Update Query type tell you that a plain Query type does not?",
      options: [
        "It returns the rows affected by an INSERT, UPDATE or DELETE",
        "It runs only at night",
        "It disables parameters",
        "It always rolls back"
      ],
      answer: 0,
      explain: [
        "Correct. A Query returns rows. An Update Query runs a write statement and returns how many rows it changed.",
        "Scheduling is unrelated to the query type.",
        "Update Queries still use named, typed parameters.",
        "Update Queries commit like any other single statement."
      ]
    }
  ],

  resources: [
    { title: "START TRANSACTION, COMMIT, and ROLLBACK (MySQL 8.4 manual)", url: "https://dev.mysql.com/doc/refman/8.4/en/commit.html", type: "docs", source: "MySQL" },
    { title: "autocommit, Commit, and Rollback (InnoDB, MySQL 8.4)", url: "https://dev.mysql.com/doc/refman/8.4/en/innodb-autocommit-commit-rollback.html", type: "docs", source: "MySQL" },
    { title: "UPDATE (Transact-SQL), SQL Server", url: "https://learn.microsoft.com/en-us/sql/t-sql/queries/update-transact-sql?view=sql-server-ver16", type: "docs", source: "Microsoft Learn" },
    { title: "Named Query Parameters (Ignition 8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/sql-in-ignition/named-queries/named-query-parameters", type: "docs", source: "Inductive Automation" },
    { title: "Inserting Data into a Database (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition/common-sql-tasks/inserting-data-into-a-database", type: "docs", source: "Inductive Automation" },
    { title: "Named Query Bindings (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/vision/binding-types-in-vision/named-query-bindings", type: "docs", source: "Inductive Automation" },
    { title: "system.db scripting functions (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-db", type: "docs", source: "Inductive Automation" }
  ]
});
