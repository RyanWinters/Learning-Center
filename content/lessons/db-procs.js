LC.lesson({
  id: "db-procs",
  title: "Views, stored procedures and logic in the database",
  track: "db",
  minutes: 15,
  level: 3,
  prereqs: ["db-sql-joins"],
  tags: ["sql", "views", "stored-procedures", "triggers", "ignition", "architecture"],
  summary: "Three ways to keep SQL on the database side, the surprises triggers cause, and how integrators decide what belongs in Ignition and what belongs in the DB.",
  objectives: [
    "Write a view that hides a multi-table join behind one reporting-friendly name",
    "Write a stored procedure with input and output parameters and call it from Ignition",
    "Explain why triggers surprise people and when to avoid them",
    "Choose between Ignition scripting, named queries, transaction groups and database logic for a given job",
    "Name the two Ignition mechanisms for calling a stored procedure"
  ],

  body: `
## Why logic ends up in the database

A plant database is rarely touched by one program. Ignition writes to it, a report tool reads it, an MES or ERP integration pulls from it, and an analyst opens it in Excel. If every one of those consumers has to remember how to join \`production_run\` to \`machine\` to \`line\`, someone will get it wrong. The database can carry that knowledge itself. Three tools do the job: **views**, **stored procedures** and **triggers**. Each moves a little more logic to the server, and each has a cost.

This lesson uses the running plant schema: \`line\`, \`machine\`, \`production_run\`, \`downtime_event\` and \`downtime_reason\`.

{{diagram:layers}}

## Views: a saved SELECT

A {{term:sql-view|view}} is a named query. It stores no data of its own. Each time someone selects from it, the database runs the underlying query. Use a view to give reporting users one clean "table" instead of a five-table join.

\`\`\`sql
-- T-SQL (SQL Server). PostgreSQL form of the duration is in the comment below.
CREATE VIEW v_downtime_report AS
SELECT  l.line_name,
        m.machine_name,
        d.start_time,
        d.end_time,
        DATEDIFF(SECOND, d.start_time, d.end_time) AS duration_s,   -- PostgreSQL: EXTRACT(EPOCH FROM (d.end_time - d.start_time))
        r.reason_name,
        r.category
FROM    downtime_event  d
JOIN    machine         m ON m.machine_id = d.machine_id
JOIN    line            l ON l.line_id    = m.line_id
LEFT JOIN downtime_reason r ON r.reason_id = d.reason_id;
\`\`\`

A Perspective table, a report and an analyst now run \`SELECT * FROM v_downtime_report WHERE line_name = 'Line 2'\`. The \`LEFT JOIN\` is deliberate: events nobody has coded yet still show up with a NULL reason, which is exactly what a supervisor wants to see.

| Benefit | Detail |
|---|---|
| One definition | Fix the join once and every report is fixed |
| Permissions | Grant a reporting user SELECT on the view only, not on the base tables |
| Stability | Rename a column in a table, patch the view, and clients never notice |
| Cost | A plain view is not faster than its query. Heavy views stacked on views are slow and hard to debug |

> [!note] Materialized views
> PostgreSQL has \`CREATE MATERIALIZED VIEW\`, which stores the result and refreshes on demand. SQL Server's nearest feature is an *indexed view*, which has many restrictions. MySQL has neither. If a report is slow, an index or a summary table loaded on a schedule is often simpler.

## Stored procedures: SQL with parameters

A {{term:stored-procedure|stored procedure}} is a named, saved block of SQL that takes parameters and runs on the server. It can run several statements as one unit, use variables and branches, and return output values or result sets.

Here is a procedure that closes the open downtime event on a machine and attaches a reason. Operators tap a button; the logic stays out of the screen.

\`\`\`sql
CREATE PROCEDURE usp_close_downtime
    @machine_id INT,
    @reason_id  INT,
    @closed_id  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;       -- any run-time error rolls the whole transaction back
    SET @closed_id = NULL;

    BEGIN TRY
        BEGIN TRANSACTION;

        SELECT TOP 1 @closed_id = event_id
        FROM   downtime_event WITH (UPDLOCK)
        WHERE  machine_id = @machine_id AND end_time IS NULL
        ORDER  BY start_time DESC;

        IF @closed_id IS NULL
        BEGIN
            ROLLBACK;
            RETURN -1;            -- nothing was open
        END

        UPDATE downtime_event
        SET    end_time = SYSUTCDATETIME(), reason_id = @reason_id   -- UTC, like every timestamp in this track
        WHERE  event_id = @closed_id;

        COMMIT;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;                    -- re-raise so Ignition sees the error
    END CATCH
END
\`\`\`

> [!warning] The open-transaction hazard
> Without \`SET XACT_ABORT ON\` or the TRY/CATCH, a failing UPDATE (for example a \`@reason_id\` that breaks the foreign key) can leave SQL Server's transaction open with the UPDLOCK still held on that row. The caller sees an error, the connection goes back to the pool, and the next user of that connection inherits a locked, half-finished transaction. Every procedure that opens a transaction needs one of the two guards, and preferably both. This is the same forgotten-BEGIN problem {{lesson:db-sql-modify}} warns about, only harder to see.

The \`end_time\` is written in UTC. For the duration to make sense, the \`start_time\` the Ignition script wrote must be UTC too ({{lesson:db-project}} covers how). Mix a local start with a UTC end and every duration is off by the UTC offset, with no error anywhere.

That is SQL Server's T-SQL dialect. PostgreSQL uses \`CREATE PROCEDURE ... LANGUAGE plpgsql\` (or \`CREATE FUNCTION\`), MySQL uses \`DELIMITER\` blocks, and Oracle uses PL/SQL. The ideas carry over; the syntax does not, so expect to rewrite procedures if you change databases.

Why bother?

- **One round trip.** The lookup, check and update happen on the server. A script doing the same thing sends three queries over the network.
- **Atomic.** The whole body runs in a transaction, so a half-finished close can't exist. See {{lesson:db-sql-modify}}.
- **Narrow permissions.** Give the Ignition user EXECUTE on the procedure and no UPDATE on the table. The only way to change downtime is through code you wrote and tested.
- **A clear contract.** Parameters in, outputs out.

## Triggers: logic that fires by itself

A {{term:database-trigger|trigger}} is code the database runs automatically when a row is inserted, updated or deleted. PostgreSQL supports BEFORE, AFTER and INSTEAD OF timing, and row-level or statement-level firing. The [PostgreSQL CREATE TRIGGER reference](https://www.postgresql.org/docs/current/sql-createtrigger.html) lists the options.

A typical use is an audit trail. This example is T-SQL (SQL Server) syntax; PostgreSQL writes the same idea as a trigger function plus a \`CREATE TRIGGER ... EXECUTE FUNCTION\` statement.

\`\`\`sql
CREATE TRIGGER trg_downtime_audit
ON downtime_event AFTER UPDATE AS
INSERT INTO downtime_audit (event_id, old_reason_id, new_reason_id, changed_at)
SELECT d.event_id, d.reason_id, i.reason_id, SYSUTCDATETIME()
FROM   deleted d JOIN inserted i ON i.event_id = d.event_id
WHERE  ISNULL(d.reason_id, 0) <> ISNULL(i.reason_id, 0);
\`\`\`

Triggers are useful for audit logs and for rules that must hold no matter who writes the data. They also cause the strangest bugs in the plant, because:

1. **They are invisible.** Someone runs \`UPDATE\` and a second table changes. Nothing in the query or the Ignition project hints at it.
2. **They run per statement or per row.** A trigger written to handle one row misbehaves when an UPDATE touches 5,000. SQL Server's \`inserted\` and \`deleted\` tables hold *all* affected rows.
3. **They slow bulk writes.** Historian partitions and store-and-forward catch-up loads can push thousands of inserts at once.
4. **They can chain.** Trigger A updates a table with trigger B, which updates a table with trigger A.
5. **They break during migrations.** A bulk load or restore may disable them, and nobody notices.

The usual guidance: use triggers for audit and hard integrity rules, keep them tiny, document them where the next integrator will look, and put business logic in procedures that callers invoke on purpose.

## Logic in Ignition or in the database?

Integrators argue about this constantly. Both camps are right some of the time.

| Question | Leans to Ignition | Leans to the database |
|---|---|---|
| Who else needs the rule? | Only this project | Several apps, reports, an ERP integration |
| How does it change? | Often, by the controls team | Rarely, under change control |
| Does it need tag or device data? | Yes | No |
| Is it set-based over many rows? | No | Yes (aggregates, rollups) |
| Must it be atomic across several tables? | No | Yes |
| Who can maintain it? | Ignition developers | A DBA exists |
| Portability | Same scripts work on any JDBC database | Dialect-specific, rewrite on a migration |
| Version control and debugging | Project export, Git, logger | Separate scripts, harder to see from SCADA |

A practical rule many integrators use: **put the *what* in the database and the *when* in Ignition.** The database knows how a downtime event is closed. Ignition knows the operator pressed the button, which user is logged in and which machine is selected. Business rules that must survive a change of SCADA vendor belong in the database. Presentation logic, tag-driven triggers and anything that depends on live process values belong in Ignition.

Whichever you choose, write it down. The worst case is half the rules in a stored procedure nobody remembers and half in a Gateway script nobody can find.

## Calling stored procedures from Ignition

Ignition gives you two direct routes, plus a named-query shortcut for simple calls.

**1. Scripting with \`system.db.createSProcCall\`.** You create a call object, register parameters, execute it and read the results.

\`\`\`python
call = system.db.createSProcCall("usp_close_downtime", "PlantDB")
call.registerInParam("machine_id", system.db.INTEGER, 1)      # 1 = M101 in the machine table
call.registerInParam("reason_id",  system.db.INTEGER, 7)
call.registerOutParam("closed_id", system.db.INTEGER)
call.registerReturnParam(system.db.INTEGER)

system.db.execSProcCall(call)

log = system.util.getLogger("Meridian.Downtime")
if call.getReturnValue() == 0:
    closed = call.getOutParamValue("closed_id")
    log.info("Closed event %d" % closed)
else:
    log.info("No open downtime on M101")
\`\`\`

Parameters can be registered by position or by name. Inputs, outputs and return values each have a register call (an in/out parameter is registered twice, once as input and once as output); results come back via \`getResultSet()\`, \`getUpdateCount()\`, \`getReturnValue()\` and \`getOutParamValue()\`. See the [8.3 system.db reference](https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-db) (and the 8.1 [createSProcCall page](https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-db/system-db-createSProcCall) if you run 8.1) for the exact argument forms in your version. \`createSProcCall\` only builds the object. The blocking happens in \`execSProcCall\`, so a slow procedure ties up the thread that ran it ([forum discussion](https://forum.inductiveautomation.com/t/stored-procedure-call-blocking-or-timeout/74316)).

> [!warning] PostgreSQL
> Ignition's documentation notes that on PostgreSQL, \`createSProcCall\` works with *functions*. Real PostgreSQL procedures (\`CREATE PROCEDURE\`) are typically run with a \`CALL\` statement with \`system.db.runPrepUpdate\` (the 8.3 manual names it for this), or an Update Query named query called with \`system.db.execUpdate\`. Check the manual and your driver version before you commit to a design.

> [!tip] Named queries
> Many integrators call stored procedures through a named query (for example a scalar query containing \`EXEC usp_name :param\`), because named queries give parameter binding, caching and a clean place to set the database connection. The scripting call object is better when you need output parameters or a return value.

**2. A Stored Procedure transaction group.** The SQL Bridge module's transaction groups run on a schedule or trigger. A stored procedure group maps group items (usually tags) to the procedure's parameters. Input items send tag values in, and output items write returned values back to tags. The [transaction group documentation](https://docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups/transaction-group-examples) describes it, and the procedure must already exist in the database. Two gotchas from the docs: Oracle and PostgreSQL need indexed rather than named parameters, and PostgreSQL may also need \`escapeSyntaxCallMode=callIfNoReturn\` on the JDBC connection string.

This is a good fit for "when the batch-complete bit goes true, call \`usp_record_batch\` with the product code, quantity and end time tags." It needs no scripting and runs under the Gateway's trigger logic. If the call fails, the group reports the error on its status, so you still need to watch it.

> [!example] Worked decision
> The plant wants downtime events closed with a reason. Choices: (a) a Perspective script that runs three queries; (b) \`usp_close_downtime\` called from the button's script. You pick (b). Another system, a Power BI report, already reads \`v_downtime_report\`, and the supervisor's phone app will soon close events too. The rule lives once, in the database. The button stays a three-line script. Ignition still handles user, machine selection and error toasts.

## Security and maintenance notes

- Grant EXECUTE on procedures, and SELECT on views, to the Ignition account instead of broad table rights. See {{lesson:db-operations}}.
- Keep procedure and view scripts in a Git repo and apply them through numbered migration files, so a rebuilt database matches production.
- Never build SQL by concatenating strings inside a procedure from user input. Use parameters, which also avoids SQL injection.
- Name things consistently: \`v_\` for views, \`usp_\` for procedures. Avoid the \`sp_\` prefix on SQL Server, since Microsoft uses it for system procedures and the lookup checks the master database first.
- Grant EXECUTE on write procedures only to the application login that needs them, never to the reporting login ({{lesson:db-operations}} shows the grants).
`,

  eli5: `
Imagine a restaurant. The pantry holds ingredients (the tables). A customer could walk into the kitchen and cook for themselves, but they'd make a mess and might take something they shouldn't.

A **view** is a menu photo: "the burger plate" is already put together from five ingredients, and you just point at it. A **stored procedure** is a recipe card that the kitchen follows exactly: you say "one close-downtime, table 14, reason 7" and the cook does all the steps in the right order, or none of them if something goes wrong. A **trigger** is a rule taped to the wall: "whenever someone takes the last egg, write it in the log." It happens by itself, which is handy, but if you forgot the note was there you'd wonder who keeps writing in the log.

The argument integrators have is whether the recipe should be kept in the front-of-house tablet (Ignition) or in the kitchen (the database).
`,

  why: `
**Why not put everything in Ignition scripts?** Ignition is excellent at reacting to tags, users and screens. It is a weak place to hold rules that other systems must obey. When an MES, a BI tool and a scripted import all write downtime, the only way to keep the rules identical is to put them where all of them pass: the database. That is also where a transaction can guarantee several tables change together.

**Why not put everything in the database?** Database code is hard to see from the SCADA side. It is dialect-specific, often owned by a different team, and it does not live in your Ignition project export. A procedure that quietly depends on a trigger that quietly depends on a setting is how a plant ends up with a system only one retired person understood. Debugging also means switching tools.

**Why do experienced integrators distrust triggers?** Every surprise is the same shape: a developer changes data and something else happens with no sign in the code. Triggers also run inside the writer's transaction, so a slow or failing trigger makes the *Ignition* write fail, or store-and-forward back up, for a reason that looks unrelated. Many shops allow triggers for audit and nothing else.

**What do integrators argue about?** Procedures versus named queries for simple writes (named queries are easier to see in the project, procedures give you tighter permissions), and how much "business logic" counts. A useful test: if the rule would still be true after you replaced Ignition with another SCADA, it belongs in the database. If it only makes sense with a tag or a screen, it belongs in Ignition.

**The tradeoff you are making** is portability and visibility against consistency and atomicity. Know which one the project values, then say so in the design document.
`,

  history: `
Stored procedures became common in the 1980s and 1990s as client/server databases such as Sybase, Oracle and SQL Server added procedural extensions to SQL (T-SQL, PL/SQL). The aim was to cut network chatter and centralize rules. Web-era application developers later moved logic into application code and ORMs, then partly swung back as data volumes grew. Industrial software kept the older habit longer, because plant databases are shared by many tools and rarely rebuilt.
`,

  examples: [
    {
      title: "A reporting view for Perspective",
      body: `A Perspective table needs downtime for the last shift with line, machine and reason. Instead of embedding a four-table join in every named query, the team creates \`v_downtime_report\` once. Each named query becomes \`SELECT * FROM v_downtime_report WHERE line_name = :line AND start_time >= :since\`. When the reason table gains a \`category\` column, only the view changes.`
    },
    {
      title: "Batch record from a PLC bit",
      body: `A Stored Procedure transaction group triggers on \`[default]Plant1/Area10/Line1/Batch/Complete\`. Its items map the tags \`ProductCode\`, \`GoodCount\` and \`ScrapCount\` to the parameters of \`usp_record_run\`. The procedure inserts a \`production_run\` row, closes the previous one and returns the new \`run_id\` to an output item. No script exists to maintain, and the DBA can change the procedure without touching the project.`
    }
  ],

  diagrams: {
    layers: `<svg viewBox="0 0 640 250" role="img" aria-label="Ignition calls a stored procedure and reads a view; both sit on top of base tables; a trigger fires from a table write">
  <defs><marker id="dbp-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box-accent" x="20" y="20" width="170" height="60" rx="6"/>
  <text class="dg-title dg-mid" x="105" y="46">Ignition</text>
  <text class="dg-text-sm dg-mid" x="105" y="66">button, named query, group</text>
  <rect class="dg-box" x="250" y="20" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="335" y="46">usp_close_downtime</text>
  <text class="dg-text-muted dg-mid" x="335" y="66">stored procedure</text>
  <rect class="dg-box" x="450" y="20" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="535" y="46">v_downtime_report</text>
  <text class="dg-text-muted dg-mid" x="535" y="66">view (saved SELECT)</text>
  <line class="dg-line" x1="190" y1="38" x2="248" y2="38" marker-end="url(#dbp-ah)"/>
  <line class="dg-line dg-dash" x1="190" y1="64" x2="448" y2="64" marker-end="url(#dbp-ah)"/>
  <rect class="dg-box" x="20" y="140" width="400" height="60" rx="6"/>
  <text class="dg-text" x="36" y="164">downtime_event</text>
  <text class="dg-text" x="200" y="164">machine</text>
  <text class="dg-text" x="300" y="164">line</text>
  <text class="dg-text-muted" x="36" y="186">base tables hold the data</text>
  <rect class="dg-box-warn" x="450" y="140" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="535" y="166">trg_downtime_audit</text>
  <text class="dg-text-muted dg-mid" x="535" y="186">fires on its own</text>
  <line class="dg-line" x1="335" y1="80" x2="335" y2="138" marker-end="url(#dbp-ah)"/>
  <line class="dg-line" x1="535" y1="80" x2="420" y2="150" marker-end="url(#dbp-ah)"/>
  <line class="dg-line" x1="420" y1="175" x2="448" y2="175" marker-end="url(#dbp-ah)"/>
  <text class="dg-text-muted" x="20" y="232">Solid arrows: calls. Dashed: reads. The trigger is the one nobody sees in the Ignition project.</text>
</svg>`
  },

  pitfalls: [
    "Treating a view as a performance feature. It is a saved query and runs every time.",
    "Writing a trigger that assumes one row per statement, then bulk-loading 5,000 rows.",
    "Putting business logic in three places (screen script, Gateway script, procedure) with no document saying which wins.",
    "Granting the Ignition account full table rights when a handful of EXECUTE grants would do.",
    "Assuming createSProcCall behaves the same on PostgreSQL as on SQL Server.",
    "Calling a slow stored procedure on the UI thread and freezing a screen."
  ],

  keyTerms: ["sql-view", "stored-procedure", "database-trigger", "sproc-call", "transaction-group-sproc", "least-privilege"],

  quiz: [
    {
      q: "A reporting tool, an Excel analyst and Perspective all need the same four-table downtime join. What is the cleanest way to share it?",
      options: ["Copy the join into each tool's query", "Create a view and point everyone at it", "Create a trigger on downtime_event", "Store the joined result in a tag"],
      answer: 1,
      explain: [
        "Three copies of a join drift apart the first time someone changes a column.",
        "Correct. A view defines the join once, and permissions can be granted on the view alone.",
        "Triggers react to writes. They don't expose data for reading.",
        "Tags hold live values, not relational query results."
      ]
    },
    {
      q: "Why might you grant the Ignition database user EXECUTE on a stored procedure and no UPDATE on the table?",
      options: ["It makes queries run faster", "Ignition cannot update tables directly", "It is required by SQL Bridge", "Changes can only happen through code you wrote and tested"],
      answer: 3,
      explain: [
        "Permissions don't make a query faster.",
        "Ignition can run UPDATE statements fine. This is a policy choice.",
        "SQL Bridge does not require it. Plain table groups write directly.",
        "Correct. The procedure becomes the only door to the data, which narrows what a bug or a compromised account can do."
      ]
    },
    {
      q: "A bulk catch-up load after a network outage takes ten times longer than normal and nobody changed the query. What is a likely hidden cause?",
      options: ["A row-by-row trigger on the target table", "A view on the same table", "The stored procedure has an output parameter", "The table has a primary key"],
      answer: 0,
      explain: [
        "Correct. Triggers add work to every write and can be written for single rows. They are easy to forget.",
        "A view stores nothing and does not run on writes.",
        "Output parameters return a value. They don't multiply the write cost.",
        "A primary key is normal and cheap to maintain."
      ]
    },
    {
      q: "Which rule is the best candidate to live in the database rather than in an Ignition script?",
      options: ["Show a red banner when a tag is bad quality", "Hide a button for operators without a role", "Closing a downtime event must update two tables or neither, for every system that writes downtime", "Pick the right unit label for a tag"],
      answer: 2,
      explain: [
        "That depends on tag quality and screens, so it belongs in Ignition.",
        "Roles and screen elements are Ignition concerns.",
        "Correct. Several writers and an all-or-nothing change point to a stored procedure and a transaction.",
        "Display formatting is presentation logic."
      ]
    },
    {
      q: "You need an OUT parameter and a return value from a stored procedure in a Perspective button script. What do you use?",
      options: ["system.db.createSProcCall with registerOutParam and registerReturnParam, then execSProcCall", "system.db.runQuery", "system.db.runNamedQuery only", "A tag history binding"],
      answer: 0,
      explain: [
        "Correct. The call object holds registered parameters and you read the results after execSProcCall.",
        "runQuery returns a result set. It is not the route for out and return parameters.",
        "A named query can call a procedure, but output and return values are most direct with the call object.",
        "History bindings read the historian, not stored procedure results."
      ]
    },
    {
      q: "A Stored Procedure transaction group fails on PostgreSQL even though the procedure exists. What does Ignition's documentation suggest checking?",
      options: ["Switching the group to run once per day", "Removing all output items", "The JDBC connection string setting escapeSyntaxCallMode", "Renaming the procedure with an sp_ prefix"],
      answer: 2,
      explain: [
        "Schedule has nothing to do with whether the call syntax works.",
        "Output items are supported, and removing them does not fix a syntax problem.",
        "Correct. The documentation notes that PostgreSQL may need escapeSyntaxCallMode=callIfNoReturn for the call to work.",
        "A prefix has no effect on how the driver builds the call."
      ]
    }
  ],

  resources: [
    { title: "system.db scripting functions (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-db", type: "docs", source: "Inductive Automation" },
    { title: "system.db.createSProcCall (8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-db/system-db-createSProcCall", type: "docs", source: "Inductive Automation" },
    { title: "SQL Stored Procedures in Ignition", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/sql-in-ignition/writing-sql-queries/sql-stored-procedures", type: "docs", source: "Inductive Automation" },
    { title: "Transaction Group Examples (8.3)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/sql-bridge-transaction-groups/transaction-group-examples", type: "docs", source: "Inductive Automation" },
    { title: "Types of transaction groups", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/sql-bridge-transaction-groups/types-of-groups", type: "docs", source: "Inductive Automation" },
    { title: "Stored procedure call blocking or timeout", url: "https://forum.inductiveautomation.com/t/stored-procedure-call-blocking-or-timeout/74316", type: "forum", source: "Inductive Automation Forum" },
    { title: "PostgreSQL: CREATE TRIGGER", url: "https://www.postgresql.org/docs/current/sql-createtrigger.html", type: "docs", source: "PostgreSQL" }
  ]
});
