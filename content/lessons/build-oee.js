LC.lesson({
  "id": "build-oee",
  "title": "Lab 4: A line OEE screen",
  "track": "build",
  "minutes": 75,
  "level": 4,
  "prereqs": [
    "build-alarms-history",
    "mes-oee",
    "ign-databases"
  ],
  "tags": [
    "lab",
    "oee",
    "named-query",
    "sql",
    "downtime",
    "pareto",
    "perspective"
  ],
  "summary": "Create a small downtime and count schema, log M102 stops with a gateway tag change script and execUpdate, compute shift OEE as A x P x Q, and show it with a downtime Pareto in Perspective.",
  "objectives": [
    "Create a minimal downtime and production schema from the db-project design",
    "Write parameterized named queries and call them with system.db.execQuery and execUpdate",
    "Log machine state changes with a gateway tag change script, handling initial change and bad quality",
    "Compute Availability, Performance, Quality and OEE for a shift",
    "Build a Perspective screen with KPI tiles and a downtime Pareto"
  ],
  "body": "\nThis lab closes the loop. The motors you built produce state changes; you will log those changes to your database as downtime events, add production counts, compute OEE for a shift, and show it on a Perspective screen with a downtime Pareto. It applies {{lesson:mes-oee}} for the math, {{lesson:db-project}} for the schema and {{lesson:ign-databases}} for named queries. Event scripting is in {{lesson:ign-events}}. Keep the [naming sheet](content/files/meridian-naming-sheet.md) handy, and note that the FDS for this screen can start from the [FDS outline](content/files/fds-outline.md).\n\n> [!note] Teaching simplification\n> Real OEE needs a work order, a product ideal rate and operator-entered reasons. This lab uses M101 as the Line1 \"machine,\" a fixed ideal rate and an automatic \"Unassigned\" reason. The structure is the same.\n\n## The target\n\n{{diagram:flow}}\n\nM102's Running tag toggles. A tag change script turns each stop into a row in `downtime_event`. A timer script writes production counts. Named queries read the tables back, and the screen turns the numbers into Availability x Performance x Quality plus a Pareto.\n\n## Part 1: Create the schema\n\nRun this in your PostgreSQL container (`docker compose exec db psql -U ignition -d meridian`) or a SQL client. It is a trimmed version of the schema in {{lesson:db-project}}, using `Line1` and the lab machines.\n\n```sql\nCREATE TABLE machine (\n  machine_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  machine_code VARCHAR(30) NOT NULL UNIQUE,      -- M101, M102, M103\n  line_code    VARCHAR(20) NOT NULL,             -- Line1\n  ideal_rate_per_min NUMERIC(8,2) NOT NULL CHECK (ideal_rate_per_min > 0)\n);\nCREATE TABLE downtime_reason (\n  reason_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  reason_code VARCHAR(20) NOT NULL UNIQUE,\n  description VARCHAR(100) NOT NULL,\n  is_planned  BOOLEAN NOT NULL DEFAULT FALSE\n);\nCREATE TABLE downtime_event (\n  event_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  machine_id INTEGER NOT NULL REFERENCES machine(machine_id),\n  reason_id  INTEGER NOT NULL REFERENCES downtime_reason(reason_id),\n  start_time TIMESTAMP NOT NULL,\n  end_time   TIMESTAMP,\n  CHECK (end_time IS NULL OR end_time > start_time)\n);\nCREATE TABLE production_count (\n  count_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  machine_id INTEGER NOT NULL REFERENCES machine(machine_id),\n  count_time TIMESTAMP NOT NULL,\n  good_count INTEGER NOT NULL CHECK (good_count >= 0),\n  reject_count INTEGER NOT NULL DEFAULT 0 CHECK (reject_count >= 0)\n);\nCREATE INDEX ix_dt_mach_time ON downtime_event (machine_id, start_time);\nCREATE UNIQUE INDEX ux_one_open_event ON downtime_event (machine_id) WHERE end_time IS NULL;\n\nINSERT INTO machine (machine_code, line_code, ideal_rate_per_min) VALUES ('M101','Line1',100), ('M102','Line1',100), ('M103','Line1',100);\nINSERT INTO downtime_reason (reason_code, description, is_planned) VALUES\n  ('BREAK','Scheduled break',TRUE), ('JAM','Product jam',FALSE),\n  ('CHG','Changeover',FALSE), ('UNASGN','Unassigned stop',FALSE);\n```\n\nThe `ux_one_open_event` index is a guard: a machine cannot have two open stops. MySQL has no partial indexes, so there you enforce it in the query. Turn this into your own naming: table and column names are `snake_case`, a different convention from tag paths, and that is intentional.\n\nSeed some history so the Pareto has shape before your live data arrives:\n\n```sql\nINSERT INTO downtime_event (machine_id, reason_id, start_time, end_time)\nSELECT 2, r.reason_id, NOW() - INTERVAL '6 hours' + (g * INTERVAL '40 minutes'),\n       NOW() - INTERVAL '6 hours' + (g * INTERVAL '40 minutes') + (g * INTERVAL '2 minutes')\nFROM generate_series(1,6) g, downtime_reason r WHERE r.reason_code = CASE WHEN g % 3 = 0 THEN 'CHG' WHEN g % 2 = 0 THEN 'JAM' ELSE 'UNASGN' END;\n```\n\nCheck: `SELECT COUNT(*) FROM downtime_event;` returns 6.\n\n## Part 2: Named queries\n\nIn the Designer, open Named Queries in the project browser and create these. Named queries live in the project, and the SQL runs on the gateway through the connection `meridian_db`. They take parameters written `:name` in the SQL. See {{lesson:db-sql-modify}} for the statements.\n\n| Name | Type | SQL (shortened) | Parameters |\n|---|---|---|---|\n| `Downtime/Open` | Update | `INSERT INTO downtime_event (machine_id, reason_id, start_time) SELECT m.machine_id, r.reason_id, NOW() FROM machine m, downtime_reason r WHERE m.machine_code = :machine AND r.reason_code = 'UNASGN'` | `machine` String |\n| `Downtime/Close` | Update | `UPDATE downtime_event SET end_time = NOW() WHERE end_time IS NULL AND machine_id = (SELECT machine_id FROM machine WHERE machine_code = :machine)` | `machine` String |\n| `Counts/Insert` | Update | `INSERT INTO production_count (machine_id, count_time, good_count, reject_count) SELECT machine_id, NOW(), :good, :reject FROM machine WHERE machine_code = :machine` | `machine` String, `good` Int, `reject` Int |\n| `Oee/Shift` | Query | See Part 5 | `machine`, `shiftStart`, `shiftEnd` |\n| `Downtime/Pareto` | Query | See Part 6 | `machine`, `shiftStart`, `shiftEnd` |\n\n> [!warning] Parameters, never string concatenation\n> Always pass values as named parameters. Building SQL by gluing strings from tag values or user input is how SQL injection happens. See {{lesson:db-sql-modify}}.\n\nUse the named query's **Test** button with sample values to confirm each works before scripting it.\n\n## Part 3: Log state changes with a tag change script\n\nCreate the event in the **gateway** scope so it runs without a client. In the Designer open Gateway Events (under Scripting) and add a **Tag Change** script that subscribes to `[default]Plant1/Area10/Line1/M102/Sts/Running`.\n\n```python\ndef valueChanged(tagPath, previousValue, currentValue, initialChange, missedEvents):\n    if initialChange:\n        return\n    if not currentValue.quality.isGood():\n        return\n    log = system.util.getLogger(\"Meridian.Downtime\")\n    if currentValue.value:\n        system.db.execUpdate(\"Downtime/Close\", {\"machine\": \"M102\"})\n        log.info(\"M102 running, closed open stop\")\n    else:\n        system.db.execUpdate(\"Downtime/Open\", {\"machine\": \"M102\"})\n        log.info(\"M102 stopped, opened stop\")\n```\n\nThree details matter. `initialChange` is skipped, otherwise restarting the gateway logs a fake stop. A tag with bad quality is ignored so a lost device does not count as production downtime. And the unique index stops duplicate open events if the script fires twice.\n\n> [!note] In 8.1\n> The same work is done with `system.db.runNamedQuery(\"Downtime/Open\", {...})`. In 8.3 that is deprecated, and `system.db.execUpdate` (for INSERT, UPDATE, DELETE) and `system.db.execQuery` (for SELECT) replace it. The old call still runs. In 8.3 pass an empty dictionary `{}`, not `None`, when a query has no parameters. If a call from a child project cannot find a query in the parent, pass the project name as the extra `project` argument.\n\nCheck: let M102 toggle for a few minutes, then `SELECT * FROM downtime_event ORDER BY event_id DESC LIMIT 5;` shows closed events with start and end times.\n\n## Part 4: Count production on a timer\n\nAdd a **Timer** gateway event with a fixed rate of 60 seconds that writes counts as deltas:\n\n```python\nimport random\nrunning = system.tag.readBlocking([\"[default]Plant1/Area10/Line1/M102/Sts/Running\"])[0]\nif running.quality.isGood() and running.value:\n    good = random.randint(90, 100)\n    reject = random.randint(0, 4)\n    system.db.execUpdate(\"Counts/Insert\", {\"machine\": \"M102\", \"good\": good, \"reject\": reject})\n```\n\nA real line reads counter tags and stores the difference since the last reading. Storing deltas keeps sums trivial and survives PLC counter resets. The random numbers stand in for those counters.\n\n## Part 5: The OEE query\n\nThe shift window and the numbers:\n\n- Planned production time = shift minutes minus planned stops.\n- Run time = planned production time minus unplanned downtime.\n- Ideal output = ideal rate x run time.\n\n```sql\nSELECT\n  EXTRACT(EPOCH FROM (CAST(:shiftEnd AS TIMESTAMP) - CAST(:shiftStart AS TIMESTAMP))) / 60 AS shift_min,\n  COALESCE(SUM(CASE WHEN r.is_planned THEN dur.min ELSE 0 END), 0) AS planned_stop_min,\n  COALESCE(SUM(CASE WHEN NOT r.is_planned THEN dur.min ELSE 0 END), 0) AS unplanned_stop_min,\n  (SELECT COALESCE(SUM(good_count),0) FROM production_count c WHERE c.machine_id = m.machine_id\n     AND c.count_time >= CAST(:shiftStart AS TIMESTAMP) AND c.count_time < CAST(:shiftEnd AS TIMESTAMP)) AS good,\n  (SELECT COALESCE(SUM(reject_count),0) FROM production_count c WHERE c.machine_id = m.machine_id\n     AND c.count_time >= CAST(:shiftStart AS TIMESTAMP) AND c.count_time < CAST(:shiftEnd AS TIMESTAMP)) AS reject,\n  m.ideal_rate_per_min\nFROM machine m\nLEFT JOIN downtime_event e ON e.machine_id = m.machine_id\n  AND e.start_time >= CAST(:shiftStart AS TIMESTAMP) AND e.start_time < CAST(:shiftEnd AS TIMESTAMP)\nLEFT JOIN downtime_reason r ON r.reason_id = e.reason_id\nLEFT JOIN LATERAL (SELECT EXTRACT(EPOCH FROM (COALESCE(e.end_time, NOW()) - e.start_time)) / 60 AS min) dur ON TRUE\nWHERE m.machine_code = :machine\nGROUP BY m.machine_id, m.ideal_rate_per_min;\n```\n\nThis is PostgreSQL syntax. For MariaDB use `TIMESTAMPDIFF(SECOND, ...)` in place of `EXTRACT(EPOCH ...)`, and a subquery in place of the lateral join. The query returns one row of raw numbers. Keep the arithmetic out of SQL. It is easier to test and change in one place.\n\nCall it from the Perspective screen's script or use a **Named Query binding** on a custom property. In a script use `system.db.execQuery(\"Oee/Shift\", {...})` and check the 8.3 manual for the return type of your version.\n\nThen compute, in an expression on the view (names are examples):\n\n```text\nplanned    = shift_min - planned_stop_min\nrun        = planned - unplanned_stop_min\nA = run / planned\nP = (good + reject) / (ideal_rate_per_min * run)\nQ = good / (good + reject)\nOEE = A * P * Q\n```\n\nGuard against divide by zero when the shift has no data: show a dash, not NaN. And if P exceeds 1, the ideal rate is wrong, not the machine superhuman.\n\nWorked check with numbers: 480 min shift, 30 planned, 60 unplanned. Planned production 450, run 390, A = 0.867. If 33,150 were made against 39,000 ideal, P = 0.85. With 32,487 good, Q = 0.98. OEE = 0.867 x 0.85 x 0.98 = 0.72.\n\n## Part 6: The Pareto query\n\n```sql\nSELECT r.description, ROUND(SUM(EXTRACT(EPOCH FROM (COALESCE(e.end_time, NOW()) - e.start_time)) / 60)) AS minutes\nFROM downtime_event e\nJOIN downtime_reason r ON r.reason_id = e.reason_id\nJOIN machine m ON m.machine_id = e.machine_id\nWHERE m.machine_code = :machine\n  AND e.start_time >= CAST(:shiftStart AS TIMESTAMP) AND e.start_time < CAST(:shiftEnd AS TIMESTAMP)\nGROUP BY r.description\nORDER BY minutes DESC;\n```\n\n## Part 7: The screen\n\n1. Create a view `Line1/Oee` and a page `/line1/oee`.\n2. Add custom properties `shiftStart` and `shiftEnd`. Set them with a script on view startup, such as the start and end of the current 8-hour block (06:00 to 14:00, 14:00 to 22:00, 22:00 to 06:00).\n3. Add three **gauge-style** or KPI tiles: Availability, Performance, Quality, each with its percent, and a larger OEE tile. Use neutral colors for values in range and color only when OEE falls below a target you set in a custom property.\n4. Add a **bar chart** bound to the Pareto named query: categories are the descriptions, values are minutes, sorted descending. A cumulative-percent line makes it a true Pareto. Compute it in a script transform.\n5. Add a refresh: a view timer or bind a query's polling rate to 30 seconds. Avoid polling faster than the data changes.\n6. Show the current state from the live tag: `{[default]Plant1/Area10/Line1/M102/Sts/Running}`.\n\nYou should see: OEE tile with a believable percentage, Pareto bars led by the reason with the most minutes (seeded Unassigned and Jam), and the live state changing as M102 toggles. After a few minutes the live Unassigned bar grows.\n\n## Common mistakes\n\n- **Dividing by planned time of zero** when the shift hasn't started or data is empty.\n- **Counting planned breaks as downtime.** Planned stops reduce planned production time. They do not reduce availability.\n- **Storing running totals** instead of deltas, then getting negative production after a counter reset.\n- **Opening a stop without a bad-quality check**, so a lost device looks like a plant stall.\n- **Running the tag change script in a client scope.** Gateway scope runs even when nobody has a screen open.\n- **Passing `None` for empty named query parameters in 8.3.** Use `{}`.\n\n## Result check\n\nStop M102 in the simulator, see an open event in the table within seconds, see the Pareto update, see OEE drop. That chain from a bit in a PLC to a percentage on a screen is the whole pitch of an MES-lite system.\n",
  "checklist": [
    "Tables machine, downtime_reason, downtime_event and production_count created in meridian",
    "Machines M101 to M103 and four downtime reasons inserted",
    "Seed downtime events inserted and counted",
    "Named queries Downtime/Open, Downtime/Close, Counts/Insert, Oee/Shift and Downtime/Pareto created",
    "Each named query passes its Test with sample parameters",
    "Gateway tag change script on M102 Sts/Running ignores initialChange and bad quality",
    "Stopping and starting M102 opens and closes a row in downtime_event",
    "Timer script inserts production_count rows every 60 seconds while M102 runs",
    "Oee/Shift returns one row of raw numbers for the current shift",
    "Availability, Performance, Quality and OEE computed in an expression, with divide-by-zero guarded",
    "A hand calculation matches the screen for a chosen window",
    "Pareto bar chart shows minutes by reason sorted descending",
    "Screen refreshes about every 30 seconds and shows live M102 state",
    "Scripts use execQuery and execUpdate with {} for empty params"
  ],
  "eli5": "\nImagine a lemonade stand open from 9 to 5. Some of that time you are not selling (you were fixing the jug), some of the time you sell slowly, and some of the lemonade you make is too sour to sell.\n\nOEE asks three simple questions. Were you open when you were supposed to be? (Availability.) When you were open, how fast did you sell compared with your best speed? (Performance.) Of what you made, how much was good? (Quality.) Multiply the three answers and you get one score.\n\nTo work that out you need a notebook. Every time the stand stops, write the time and why. Every minute, write how many cups you sold. The Pareto is a tally that shows which reason for stopping cost you the most minutes, so you fix that first.\n",
  "why": "\n**Why log state changes with a script and not poll with a query?** A state change is an event with a start and an end. Polling a status every minute misses a 40 second jam and cannot say exactly how long it lasted. A change script writes the exact time. The tradeoff is that the script must be reliable: gateway restarts, bad quality and duplicate triggers each need handling, which is why the script above skips `initialChange` and bad quality, and the database has a unique index for open events.\n\n**Why gateway scope?** Client-scope scripts only run while a screen is open. A line that stops at 3 a.m. with nobody logged in still has to be recorded.\n\n**Why named queries and not SQL in the view?** They are centralized, parameterized, testable on their own, cached if you wish, and the database credentials never reach the client. SQL strings buried in component scripts get copied, drift apart and invite injection.\n\n**Why `execQuery` and `execUpdate`?** In 8.3 they replace the single `runNamedQuery`, and make intent clear: one reads, one changes data. The old calls still work, so existing projects are not forced to change at once.\n\n**Why keep OEE arithmetic out of SQL?** SQL is good at summing a window. A ratio of sums depends on definitions (what is planned, what is ideal) that change. Keeping the formula in one expression or script makes the definition explicit and reviewable. Integrators disagree on whether to push all of it into views or procedures. For a first build, one place you can read beats clever.\n\n**Why an Unassigned reason?** Operators will not always enter a reason. An automatic reason keeps the time accounted for, and a growing Unassigned bar on the Pareto is itself the sign that reason capture needs attention. {{lesson:mes-downtime}} covers this.\n",
  "diagrams": {
    "flow": "<svg viewBox=\"0 0 640 220\" role=\"img\" aria-label=\"M102 running tag feeds a gateway script that writes downtime events, a timer writes counts, named queries read them and a Perspective OEE screen shows A times P times Q and a Pareto\"><defs><marker id=\"build-oee-ah\" markerWidth=\"10\" markerHeight=\"8\" refX=\"9\" refY=\"4\" orient=\"auto\"><path class=\"dg-fill-line\" d=\"M0,0 L10,4 L0,8 z\"/></marker></defs><rect class=\"dg-box\" x=\"20\" y=\"30\" width=\"140\" height=\"50\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"32\" y=\"60\">M102 Sts/Running</text><rect class=\"dg-box\" x=\"20\" y=\"130\" width=\"140\" height=\"50\" rx=\"4\"/><text class=\"dg-text-sm\" x=\"32\" y=\"160\">Timer 60 s</text><rect class=\"dg-box-accent\" x=\"220\" y=\"30\" width=\"150\" height=\"150\" rx=\"6\"/><text class=\"dg-title\" x=\"234\" y=\"58\">meridian_db</text><text class=\"dg-text-sm\" x=\"234\" y=\"90\">downtime_event</text><text class=\"dg-text-sm\" x=\"234\" y=\"112\">production_count</text><text class=\"dg-text-sm\" x=\"234\" y=\"134\">machine, reason</text><rect class=\"dg-box\" x=\"440\" y=\"30\" width=\"180\" height=\"150\" rx=\"6\"/><text class=\"dg-title\" x=\"454\" y=\"58\">OEE screen</text><text class=\"dg-text-sm\" x=\"454\" y=\"90\">A x P x Q</text><text class=\"dg-text-sm\" x=\"454\" y=\"112\">Pareto</text><text class=\"dg-text-sm\" x=\"454\" y=\"134\">named queries</text><line class=\"dg-line\" x1=\"160\" y1=\"55\" x2=\"218\" y2=\"80\" marker-end=\"url(#build-oee-ah)\"/><line class=\"dg-line\" x1=\"160\" y1=\"155\" x2=\"218\" y2=\"130\" marker-end=\"url(#build-oee-ah)\"/><line class=\"dg-line\" x1=\"370\" y1=\"105\" x2=\"438\" y2=\"105\" marker-end=\"url(#build-oee-ah)\"/></svg>"
  },
  "pitfalls": [
    "Counting planned stops against availability instead of removing them from planned time.",
    "Logging a downtime event when a device goes bad rather than when the machine stops.",
    "Not skipping initialChange, so every gateway restart logs a fake stop.",
    "Building SQL by concatenating strings in scripts.",
    "Passing None for empty named query parameters in 8.3, where {} is expected."
  ],
  "keyTerms": [
    "oee",
    "downtime-pareto",
    "named-query",
    "parameterized-query",
    "tag-event-script",
    "timer-script",
    "reason-code",
    "ideal-cycle-time",
    "planned-production-time",
    "database-table"
  ],
  "quiz": [
    {
      "q": "Why does the tag change script ignore initialChange and bad quality?",
      "options": [
        "They are slower to process",
        "Otherwise a gateway restart or a lost device would be logged as a machine stop, polluting availability",
        "Ignition forbids them in gateway scope",
        "Bad quality means the value is always false"
      ],
      "answer": 1,
      "explain": [
        "Speed is not the issue.",
        "Correct. Both create events that did not happen on the machine.",
        "They are permitted. The script chooses to filter them.",
        "A bad quality value can be anything, and it should not be trusted."
      ]
    },
    {
      "q": "A 30 minute scheduled break appears in the shift. Where does it go in the OEE math?",
      "options": [
        "It reduces availability",
        "It is subtracted from shift time to get planned production time",
        "It is added to quality",
        "It is ignored entirely"
      ],
      "answer": 1,
      "explain": [
        "Availability is run time over planned production time. Planned stops are already removed.",
        "Correct. Planned stops shrink the denominator.",
        "Quality is about good versus total parts.",
        "It must be recorded, then used to reduce planned time."
      ]
    },
    {
      "q": "Performance comes out at 130 percent. What is the most likely cause?",
      "options": [
        "The line is exceptionally fast",
        "The ideal rate for the product is set too low, so the design is wrong, not the machine",
        "Availability is too high",
        "The Pareto is unsorted"
      ],
      "answer": 1,
      "explain": [
        "Possible only if the ideal was understated.",
        "Correct. Performance over 100 percent signals a bad ideal rate or counts.",
        "Availability is a separate factor.",
        "Sorting does not change performance."
      ]
    },
    {
      "q": "Why store production counts as deltas per interval?",
      "options": [
        "Deltas take less storage",
        "Sums are simple and a PLC counter reset can never produce a negative production number",
        "Named queries require deltas",
        "Perspective cannot chart totals"
      ],
      "answer": 1,
      "explain": [
        "Storage is similar.",
        "Correct. A running total can drop on reset, and subtraction then gives nonsense.",
        "Queries can handle anything. This is a design choice.",
        "Charts handle totals well."
      ]
    },
    {
      "q": "In 8.3 which pair replaces system.db.runNamedQuery?",
      "options": [
        "system.db.runQuery and runPrepQuery",
        "system.db.execQuery for SELECT and system.db.execUpdate for INSERT/UPDATE/DELETE",
        "system.historian.queryRawPoints and system.tag.write",
        "system.db.beginTransaction only"
      ],
      "answer": 1,
      "explain": [
        "Those are also in the deprecated family.",
        "Correct. The 8.3 names say what each call does, and the old one still runs.",
        "Those are historian and tag functions.",
        "Transactions are separate from the replacement."
      ]
    }
  ],
  "resources": [
    {
      "title": "system.db (8.3 scripting functions)",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-db",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Named Queries (8.3)",
      "url": "https://docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition/named-queries",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Inserting Data into a Database (8.3)",
      "url": "https://docs.inductiveautomation.com/docs/8.3/platform/sql-in-ignition/common-sql-tasks/inserting-data-into-a-database",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "system.db.runNamedQuery (deprecated)",
      "url": "https://www.docs.inductiveautomation.com/docs/deprecated/system-functions/system-db-deprecated/system-db-runNamedQuery",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "8.1 to 8.3 Upgrade Guide",
      "url": "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/installing-and-upgrading/ignition-8-upgrade-guide/81to83-upgrade-guide",
      "type": "docs",
      "source": "Inductive Automation"
    },
    {
      "title": "Execute update vs transactions (forum)",
      "url": "https://forum.inductiveautomation.com/t/looping-updates-in-a-transaction-question-execupdate-vs-beginnamedquerytransaction/112200",
      "type": "forum",
      "source": "Inductive Automation Forum"
    }
  ]
});
