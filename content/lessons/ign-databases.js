LC.lesson({
  id: "ign-databases",
  title: "Databases in Ignition: named queries, transaction groups, store & forward",
  track: "ignition",
  minutes: 30,
  level: 2,
  prereqs: ["ign-tags", "db-sql-select"],
  tags: ["ignition", "database", "named-queries", "transaction-groups", "store-and-forward", "jdbc"],
  summary: "How Ignition talks to SQL databases: connections and pools, why named queries beat ad-hoc queries, what transaction groups do, and how store and forward keeps data safe when the database is down.",
  objectives: [
    "Describe how a database connection, JDBC driver and connection pool fit together",
    "Explain why named queries are safer and faster than client-side system.db.runQuery",
    "Pick the right transaction group type and use triggers and handshakes",
    "Trace a record through store and forward during a database outage",
    "Know what quarantine means and how to monitor it"
  ],

  body: `
## The database is the plant's memory

Ignition keeps live values in memory and forgets them on restart. Anything you want to keep, like production counts, downtime events, recipes, batch records and alarm history, belongs in a relational database. Ignition connects to it, runs your SQL, and in several cases moves data automatically. Three features do most of the work: **named queries** (you run SQL on demand), **transaction groups** (SQL Bridge module moves data on a schedule or trigger) and **store and forward** (nothing is lost when the database blips).

## Connections, drivers and pools

A database **connection** in the Gateway holds a JDBC URL, credentials and a driver. {{term:jdbc|JDBC}} is the Java standard for talking to SQL databases, and a **driver** is the library that speaks one vendor's wire protocol. Ignition bundles drivers for common engines (MySQL and MariaDB, PostgreSQL, Microsoft SQL Server, Oracle and others); you can add your own.

Opening a connection is expensive (TCP, TLS, login). So Ignition keeps a {{term:connection-pool|connection pool}}, a set of already-open connections that queries borrow and return. Key pool settings are max active connections, max idle connections, and a validation query that checks a borrowed connection is still alive. A pool that is too small makes queries wait. A pool that is too large can overwhelm the database server. Start with the defaults and tune only with evidence from the connection status page.

Connections can also have a **failover** connection. If the main database is unreachable, the Gateway uses the backup.

\`\`\`text
jdbc:postgresql://10.20.30.20:5432/mes
jdbc:sqlserver://10.20.30.20:1433;databaseName=Production
jdbc:mariadb://10.20.30.20:3306/ignition
\`\`\`

> [!tip] Use a dedicated database account
> Give Ignition its own database user with only the privileges it needs (SELECT, INSERT, UPDATE on specific schemas). Do not use an admin account. It limits the damage of a bad script or a leaked password.

## Named queries

A {{term:named-query|named query}} is SQL saved by name in a project and called with parameters:

\`\`\`sql
SELECT ts, line, good_count, scrap_count
FROM production_log
WHERE line = :line
  AND ts >= :start AND ts < :end
ORDER BY ts
\`\`\`

\`\`\`python
rows = system.db.execQuery("Production/getLineLog",
    {"line": "Line1", "start": start, "end": end})
\`\`\`

> [!note] In 8.1
> The call is \`system.db.runNamedQuery(path, params)\`. In 8.3 it is deprecated but still runs. \`system.db.execQuery\` is for SELECT-type queries, \`execUpdate\` for INSERT/UPDATE/DELETE, and \`execScalar\` for a single value. Pass \`{}\`, not \`None\`, when a query has no parameters. See the 8.3 manual for full parameters.

In Perspective, you can bind a table straight to the named query with parameters from the page. The key properties:

- **Parameters are typed** and become real JDBC prepared-statement parameters when used as values, so the database never confuses data with SQL. This defeats {{term:sql-injection|SQL injection}} for values. An *identifier* parameter (a table or column name) is checked against allowed characters, and a *query string* parameter is dropped in as raw text, so avoid that type for user input.
- **Execution happens on the Gateway**. A client or browser sends only the name and parameters. The Gateway can apply **security**, restricting a query by user role or security zone, and the client never needs database credentials or network access to the database.
- **Caching**: a query can cache results for a set time. Each distinct parameter set has its own cache, so an expensive "plant summary" query can serve 50 screens from one database hit. \`system.db.clearNamedQueryCache(path)\` clears all cached results for that query.
- **Query types**: Query (rows), Scalar (one value), and Update (INSERT/UPDATE/DELETE, returning row count or generated keys).

### Why not system.db.runQuery from the client?

\`system.db.runQuery("SELECT ... WHERE line='" + line + "'")\` builds SQL text from strings. If that string is influenced by a user, a text box or a URL parameter, someone can inject SQL. \`runPrepQuery\` binds values as parameters, so it is safe for values. The danger is any function fed a string you built from user input, and the habit of concatenating is the risk. The \`system.db.runQuery\` family is also on the 8.3 deprecated list. It still runs, and in 8.3 the replacements are \`system.db.execQuery\` (SELECT) and \`system.db.execUpdate\` (INSERT/UPDATE/DELETE) beside the named-query form shown above. With the legacy functions, the SQL itself is written in client scripts, so changing a table name means finding every screen. A named query is defined once, tested once, secured once and cached. The IA documentation itself recommends named queries over the standard statement functions where possible.

> [!warning] Named queries are not magic
> A Query String parameter inserts text directly into the SQL, with no protection. Use Value parameters for data. For dynamic table or column names use Identifier type, and validate against a fixed list in your script.

## Transaction groups (SQL Bridge)

The **SQL Bridge (Transaction Groups)** module moves data between tags and database rows without scripting. A {{term:ign-sql-bridge|transaction group}} has a name, an execution schedule, a target table and a list of items (tags or expressions mapped to columns). Four types exist in 8.3:

| Type | Direction | Typical use |
|---|---|---|
| **Standard** | Two-way: tags to database or database to tags | Recipes (load a row into PLC tags), production records, a configuration table |
| **Historical** | One-way, tag to database | Custom logging: one row per execution with a column per item |
| **Block** | Many rows per execution | Moving arrays or structured blocks from a PLC, like a 50-item parts list |
| **Stored Procedure** | Items are inputs and outputs of a procedure | Logic already living in the database, or strict DBA-controlled writes |

### Triggers, handshakes and schedule

A group runs on a **schedule** (a tag group or fixed rate) and optionally a **trigger**: an expression or tag condition that must be true for the group to execute. Typical pattern: the PLC sets \`Area10_Mixing.BatchComplete\`. The group's trigger watches it and inserts one row. After the insert the group can write to a **handshake** tag (acknowledge) so the PLC knows it was recorded and can safely reset its data. That handshake is what prevents lost or duplicate records when two systems exchange data.

{{diagram:handshake}}

Without a handshake the PLC does not know whether the insert occurred, so it either resets too soon (lost data) or waits forever (stuck line).

## Store and forward

{{diagram:sf}}

When Ignition writes history, alarms journal rows or transaction group rows, it uses the {{term:store-and-forward|store and forward}} engine so a database outage or restart does not drop data. Records go first into a **memory buffer**, then to the **database sink**, which retries on failure. The **disk cache** persists records that cannot be delivered yet.

- The memory buffer is fast but volatile. If the Gateway restarts, it is gone, and it cannot quarantine anything.
- The disk cache holds data waiting to forward and has a maximum record count (a configurable record count; check the store and forward page of the manual for your version's default and its advice on raising it, since the cache is short-term storage). The examples in this lesson assume a cache of 25,000 records. When full, new records are dropped.
- The sink retries a failed batch record by record. A record that keeps failing, for example from a data type mismatch or a missing column, goes to **{{term:quarantine|quarantine}}** instead of blocking everything behind it.

Check the **Store & Forward** status page and the system tags for quarantined and dropped counts. Quarantined data stays on disk until a person looks at it, fixes the cause (a table missing, a column too short) and releases or discards it. A non-zero quarantine count after commissioning is a real problem. Someone should be alerted.

For a database that is down for four hours, the arithmetic is simple: records per second times 14,400 must fit in the cache. At 500 rows/s that is 7.2 million rows, far above a 25,000-record cache. Plan outage tolerance explicitly and size the cache or reduce the data rate.

Transaction groups have a **Bypass Store and Forward** option for inserting groups. Then rows go straight to the database and errors are reported instead of cached. Use it when you must know immediately that a write failed, and accept that outages lose data.

> [!note] In 8.1
> The same four group types and store-and-forward model apply. In 8.3 the new Core Historian writes directly to disk and does not use store and forward, but the SQL Historian, transaction groups and alarm journals still do.
`,

  eli5: `
Imagine you are a shop clerk who writes down every sale on a notepad and, at the end of each hour, a courier takes the notes to the head office and files them in a giant cabinet. The head office is the database.

A **named query** is a form letter the head office has already approved: "Please tell me how many bolts we sold on [date]." You only fill in the blank. Nobody can slip a sneaky extra instruction into the form, and the office can keep a copy of the last answer so it doesn't re-count the bolts for every person who asks.

A **transaction group** is a standing order: "Every time the delivery truck arrives, write down the load and then ring the dock bell so the driver knows it was recorded."

**Store and forward** is the courier's satchel. If the head office is closed for the afternoon, the courier keeps the notes in the satchel (and a locked drawer, in case the van breaks down) and delivers everything when it reopens. A note that is smudged so the office can't read it goes into a "problems" folder, so it doesn't stop the courier from delivering all the rest.
`,

  why: `
**Why named queries instead of scripts?** There are three reasons that accumulate. Security: the SQL runs on the Gateway, parameters are bound, and access can be limited by role or zone, so a compromised browser can't send arbitrary SQL. Maintenance: one definition serves every screen, so a schema change is one edit. Performance: caching and the Gateway's pooled connections replace dozens of client connections. The counterargument is that scripting with \`runPrepQuery\` is more flexible for complex dynamic SQL. Experienced integrators still start with a named query and only drop to scripts for truly dynamic cases.

**Why a handshake?** Distributed systems fail between steps. If the PLC clears a count after seeing the "write" start rather than finish, a crash in between loses it. A handshake makes the sequence explicit: data ready, data stored, then reset. It is the same idea as acknowledging a message in any queue.

**Why store and forward?** Databases are maintained, restarted, patched and sometimes simply broken. The control system must not care. S&F decouples capturing data from storing it. Its tradeoff is bounded buffering: it protects against short outages, not weeks. It also hides problems, so a quiet quarantine count can mean a silent data loss. Monitor it like an alarm.

**Why transaction groups when we have scripting?** They are declarative, restart-safe and tested. A group that logs a production record is five minutes of clicking and no code to maintain. Teams that outgrow them usually move to scripts or a named-query-based pattern, which gives more control at the price of owning the edge cases.
`,

  history: `
SQL Bridge (transaction groups) is one of Ignition's earliest modules, built so plant data could move to a database without a developer. Named queries were added to Ignition in the 7.x line (check the manual for the exact release) to give a safer, central alternative to SQL strings in client scripts. Store and forward grew out of the same need: tag history and transaction data must survive a database restart.
`,

  examples: [
    {
      title: "A production counter handshake",
      body: `PLC bit \`Area20_Packaging.Done\` goes true with \`Area20_Packaging.GoodCount = 412\`. A standard transaction group triggers on \`Done\`, inserts a row into \`production_log\` (line, good_count, ts) and writes 1 to the handshake item \`Area20_Packaging.Stored\`. The PLC sees \`Stored\`, clears \`Done\` and resets the count. If the insert fails, the handshake is not written and the PLC keeps its data until the database recovers (unless the group uses store and forward, in which case confirm how your design treats the handshake). Test this outage case before go-live.`
    },
    {
      title: "Sizing a four-hour outage",
      body: `Historian plus transaction groups produce about 40 rows/s. Four hours is 14,400 s × 40 = 576,000 rows. A disk cache of 25,000 records would drop most of them, and doubling it to 50,000 still isn't enough. Options: lower the data rate (wider deadbands), give the database high availability, or use a local database as a front buffer.`
    }
  ],

  diagrams: {
    handshake: `<svg viewBox="0 0 640 230" role="img" aria-label="PLC sets a done bit, the transaction group sees the trigger, inserts a row into the database, writes the handshake tag, and the PLC then clears the done bit">
  <defs><marker id="ign-databases-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <text class="dg-title" x="60" y="24">PLC</text>
  <text class="dg-title" x="270" y="24">Transaction group</text>
  <text class="dg-title" x="520" y="24">Database</text>
  <line class="dg-line" x1="80" y1="34" x2="80" y2="215"/>
  <line class="dg-line" x1="320" y1="34" x2="320" y2="215"/>
  <line class="dg-line" x1="560" y1="34" x2="560" y2="215"/>
  <line class="dg-line" x1="80" y1="60" x2="318" y2="60" marker-end="url(#ign-databases-ah)"/>
  <text class="dg-text-sm" x="110" y="52">1 Done = 1</text>
  <line class="dg-line" x1="320" y1="95" x2="558" y2="95" marker-end="url(#ign-databases-ah)"/>
  <text class="dg-text-sm" x="360" y="87">2 INSERT row</text>
  <line class="dg-line" x1="558" y1="130" x2="322" y2="130" marker-end="url(#ign-databases-ah)"/>
  <text class="dg-text-sm" x="370" y="122">3 OK (or S&amp;F holds it)</text>
  <line class="dg-line" x1="318" y1="165" x2="82" y2="165" marker-end="url(#ign-databases-ah)"/>
  <text class="dg-text-sm" x="110" y="157">4 Stored = 1</text>
  <text class="dg-text-sm" x="95" y="200">5 PLC clears Done, resets count</text>
</svg>`,
    sf: `<svg viewBox="0 0 640 160" role="img" aria-label="Data flows from the Gateway into a memory buffer, then the database sink; failures go to the disk cache and repeated failures to quarantine">
  <defs><marker id="ign-databases-sf" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box" x="20" y="40" width="110" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="75" y="70">Data writers</text>
  <line class="dg-line" x1="130" y1="65" x2="165" y2="65" marker-end="url(#ign-databases-sf)"/>
  <rect class="dg-box-accent" x="170" y="40" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="235" y="70">Memory buffer</text>
  <line class="dg-line" x1="300" y1="65" x2="335" y2="65" marker-end="url(#ign-databases-sf)"/>
  <rect class="dg-box-accent" x="340" y="40" width="120" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="400" y="70">DB sink</text>
  <line class="dg-line" x1="460" y1="65" x2="495" y2="65" marker-end="url(#ign-databases-sf)"/>
  <rect class="dg-box" x="500" y="40" width="120" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="560" y="70">SQL server</text>
  <rect class="dg-box" x="340" y="110" width="120" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="400" y="135">Disk cache</text>
  <line class="dg-line" x1="400" y1="90" x2="400" y2="108" marker-end="url(#ign-databases-sf)"/>
  <text class="dg-text-muted" x="475" y="125">bad record: quarantine</text>
</svg>`
  },

  pitfalls: [
    "Using a Query String parameter for user input in a named query, which bypasses the bind protection.",
    "Calling system.db.runQuery from a client with a string built from user input.",
    "Resetting PLC data without a handshake from the transaction group.",
    "Ignoring the store and forward quarantine count until someone asks where last week's data went.",
    "Sizing the S&F disk cache for seconds of outage when the real outage tolerance needs hours.",
    "Pointing Ignition at the database with an admin account."
  ],

  keyTerms: ["jdbc", "connection-pool", "named-query", "sql-injection", "ign-sql-bridge", "trigger-handshake", "store-and-forward", "quarantine"],

  quiz: [
    {
      q: "Why are named queries safer than system.db.runQuery with concatenated strings?",
      options: ["They use a faster database driver", "Value parameters are bound as prepared-statement parameters and the SQL runs on the Gateway, so user input can't change the query", "They encrypt the SQL text", "They are only readable by administrators"],
      answer: 1,
      explain: [
        "Speed isn't the safety mechanism.",
        "Correct. Data is kept separate from SQL, and access can be restricted by role or zone.",
        "They do not encrypt the SQL.",
        "Visibility is not the issue. Binding is."
      ]
    },
    {
      q: "A transaction group logs a row when the PLC sets a Done bit. How should the PLC know it is safe to reset its counters?",
      options: ["Wait a fixed 5 seconds", "Reset as soon as Done is true", "Wait for a handshake tag written by the group after it stores the record", "Poll the database from the PLC"],
      answer: 2,
      explain: [
        "A fixed wait guesses. A slow database could still be mid-write.",
        "That loses the data the group has not yet read.",
        "Correct. A handshake makes the exchange explicit and safe.",
        "PLCs rarely talk SQL, and it bypasses the design."
      ]
    },
    {
      q: "Which transaction group type is best for loading a recipe row from a database into PLC tags?",
      options: ["Historical", "Standard", "Block", "None, only scripting can do that"],
      answer: 1,
      explain: [
        "Historical groups are one-way, tag to database.",
        "Correct. Standard groups are two-way and can write database values back to items.",
        "Block groups move many rows per execution, mostly outward.",
        "Standard groups do exactly this."
      ]
    },
    {
      q: "The database server is down for two hours at 40 rows/s and the S&F disk cache is configured for 25,000 records. What happens?",
      options: ["Everything is stored since S&F is unlimited", "The cache fills after about 10 minutes and later records are dropped", "Ignition stops the tags", "All data is quarantined"],
      answer: 1,
      explain: [
        "The cache has a maximum record count.",
        "Correct. 25,000 / 40 is about 625 s. After that new records are dropped.",
        "Tags keep running. Only the persistence is affected.",
        "Quarantine is for records that repeatedly fail, not for a full cache."
      ]
    },
    {
      q: "What does quarantine mean in store and forward?",
      options: ["A record that repeatedly fails to write is set aside on disk for a person to inspect", "Old records are archived", "The database is placed in read-only mode", "Records are encrypted"],
      answer: 0,
      explain: [
        "Correct. It stops one bad record blocking the rest.",
        "Archiving is a different feature.",
        "Quarantine does not change the database.",
        "It is about failure handling, not encryption."
      ]
    },
    {
      q: "A named query takes 3 seconds and 40 screens use it with the same parameters. What helps most?",
      options: ["Enable caching on the named query", "Increase the pool size", "Move it to a client script", "Convert it to a Query String parameter"],
      answer: 0,
      explain: [
        "Correct. Results for each parameter set are cached, so most requests skip the database.",
        "More connections do not shorten a 3 second query.",
        "That multiplies the load on the database.",
        "That adds injection risk and no speed."
      ]
    }
  ],

  resources: [
    { title: "SQL Bridge (Transaction Groups), Ignition 8.3 manual", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups", type: "docs", source: "Inductive Automation" },
    { title: "Types of Groups (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups/types-of-groups", type: "docs", source: "Inductive Automation" },
    { title: "Transaction Group Examples (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups/transaction-group-examples", type: "docs", source: "Inductive Automation" },
    { title: "Queries in Scripting", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/sql-in-ignition/queries-in-scripting", type: "docs", source: "Inductive Automation" },
    { title: "Store and Forward", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/database-connections/store-and-forward", type: "docs", source: "Inductive Automation" },
    { title: "Configuring Store and Forward", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/database-connections/store-and-forward/configuring-store-and-forward", type: "docs", source: "Inductive Automation" },
    { title: "Using Named Queries in Perspective", url: "https://inductiveuniversity.com/videos/using-named-queries-in-perspective/8.3", type: "video", source: "Inductive University" },
    { title: "runNamedQuery vs runPrepQuery", url: "https://forum.inductiveautomation.com/t/runnamedquery-vs-runprepquery/81268", type: "forum", source: "Inductive Automation Forum" }
  ]
});
