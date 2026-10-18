# Pass 2 review: db track (DBA lens)

## Persona

Database engineer and DBA for SQL Server and PostgreSQL, supporting manufacturing historians. Checked every SQL example, DDL, result table, arithmetic claim and quiz against the sample data and the two rule files (`docs/HOUSE_STANDARD.md`, `docs/FACTS.md`).

Verified by hand: all sample-data arithmetic in db-intro (downtime totals 143, per-reason and per-line sums), the fan-out figures in db-sql-joins (73,650 = 3 x 24,550; 30,400 = 2 x 15,200), the OEE chain in db-project (86.7 x 85.0 x 98.0 = 72.2, counts sum to 33,150), the historian epoch values in db-timeseries (1792195200000 = 2026-10-17 00:00 UTC), the sizing math in db-timeseries and db-historians, and the swinging-door interpolation in db-historians (81.5). All of these are correct. Every quiz answer index points at the right option and every explain array has four aligned entries.

## Per-lesson findings

### db-intro
- **[med, consistency]** `"| 1 | Line 1 | Bottling |"` and `"Plant 1"`-less sample data (Filler 1, Line 4 Packaging) → The reference plant is Meridian Foods Plant 1 with Area10 Batching / Area20 Packaging and Line1 (HOUSE_STANDARD section 1). Either rename the sample to house names or add the one-sentence "different example on purpose" note the standard requires. See cross-lesson item 1.
- **[low, accuracy]** `"Ignition's docs note it allows a single connection, so it suits testing"` → (verify) against the 8.3 SQLite page before the next release. The claim is cited only in passing.

### db-sql-joins
- **[low, clarity]** `"SQL Server's DATEDIFF counts boundary crossings, not elapsed time, so 10:59:59 to 11:00:01 is 1 hour apart."` → The sentence sits under a minutes-based table, so the reader will read it as a minute result. Rewrite as: "`DATEDIFF(MINUTE, '10:59:59', '11:00:01')` returns 1 even though 2 seconds passed. `DATEDIFF(HOUR, ...)` on the same pair also returns 1."
- Otherwise no significant issues. All result tables (inner, left, reason rollup with 0-event reasons, line rollup, HAVING > 25) match the sample data.

### db-sql-modify
- **[med, accuracy]** `"UPDATE downtime_event SET reason_id = 3 WHERE reason_id = 6 ... The counts should show Material Shortage at 0 and No Product up by exactly the number of rows you expected."` → Reason 6 has no events in the sample, so this statement updates 0 rows and the claimed result cannot happen. Fix: use `WHERE reason_id = 4` (Sensor Fault: events 3, 9, 10, so 3 rows), then say "Sensor Fault drops from 3 to 0 and No Product rises from 2 to 5."
- **[low, accuracy]** `"BEGIN turns autocommit off until you COMMIT or ROLLBACK."` → In SQL Server, BEGIN TRANSACTION starts an explicit transaction inside autocommit mode. Reword to "BEGIN starts an explicit transaction that holds until COMMIT or ROLLBACK."
- **[low, accuracy]** `"A Named Query is a single statement and commits on its own."` → (verify). Named queries can run inside a transaction group or a script transaction, so this is only true for standalone calls.
- **[low, quiz-adjacent / FACTS 10]** `"system.db.runPrepQuery(...)"` in the main code block, with the 8.3 callout saying it is "still available" → FACTS 10 says teach the 8.3 name first and that the runQuery family is on the deprecated list. Show `system.db.execQuery` or a named query as the primary example, and cite the 8.3 page for `runPrepQuery`.
- Quiz and explanations are correct.

### db-indexes
- **[med, accuracy]** `"Adding end_time as an INCLUDE column (SQL Server) or as a third key column lets the database sum durations from the index alone."` → The sum reads `duration_min`, not `end_time`. Fix: "Adding `duration_min` as an INCLUDE column lets the database sum durations from the index alone."
- **[med, consistency]** `"An index on 50 million rows is typically only 3 to 4 levels deep"` → Uncited specific number, against HOUSE_STANDARD section 7. Depth depends on key width and page size. Replace with "depth depends on key width and page size; check the plan or the engine's index-size view (verify for your engine)."
- **[low, clarity]** `"Index the columns that appear in WHERE, JOIN ... ON and ORDER BY."` → Overgeneralized. Add "that are selective, and only for queries you measure".
- Plans, covering-index examples and quiz are correct.

### db-timeseries
- **[med, consistency]** `"dataintegrity is the quality code, where 192 means good in the stored table."` and the query `AND d.dataintegrity = 192` → FACTS 2 says 8.x quality codes differ from 7.x, where 192 was Good, and that code should never compare to 192. The lesson asserts the stored meaning and then teaches a filter on it. Fix: mark the meaning "(verify for 8.3)" and filter on quality through the API in the example, or add a comment in the SQL that the code is version-dependent.
- **[med, missing]** `"the historian store functions (the older system.tag.storeTagHistory in 8.1) for writes"` → No 8.3 write function is named, although the section is otherwise 8.3-first. Name the 8.3 store call (verify: likely `system.historian.storeDataPoints`) with the 8.1 callout.
- **[low, accuracy]** `"the stored path is lowercase, provider handling differs between historian setups"` → Uncited. Mark (verify).
- **[low, clarity]** `"Daily partitions use a different suffix pattern"` → Give the actual pattern (verify) or drop the sentence.
- Arithmetic (34.6 million rows/day, about 1.04 billion/month, about 52 GB/month) and the epoch values are correct.

### db-project
- **[med, consistency]** `"Changing it on the product affects only future runs if you copy it to the run at start time (see the pitfalls)."` → `production_run` has no ideal-rate column, and the OEE query reads `p.ideal_rate_per_min` from `product`. The copy-at-start design is described but not built. Fix: add `ideal_rate_per_min NUMERIC(8,2) NOT NULL` to `production_run`, fill it at run start, and read it in the `base` CTE. Or delete the sentence and align pitfall 3.
- **[low, clarity]** `"production_count stores interval deltas (good and reject since the last reading)"` → The first sample row (08:00) covers from run start (06:00), which is never stated. Add: "the first interval runs from run start to the first reading."
- **[low, clarity]** Pareto query `ORDER BY minutes DESC;` with three 30-minute rows in the result table → Tied rows have no defined order, so the displayed order is arbitrary. Add `, r.description` as a tiebreak.
- **[low, verify]** `"the connection's store-and-forward feature caches the writes and replays them"` → (verify) that store-and-forward applies to SQL Bridge transaction groups and not only to the connection or historian. See cross-lesson item 3.
- OEE chain, 72.2, the Pareto minutes, the partial unique index, the sample inserts and all quiz answers are correct.

### db-procs
- **[high, accuracy]** `BEGIN TRANSACTION; ... UPDATE downtime_event SET end_time = SYSUTCDATETIME(), reason_id = @reason_id ...; COMMIT; RETURN 0;` with no TRY/CATCH and no `SET XACT_ABORT ON` → If the UPDATE fails (for example, `@reason_id` violates the FK the body says is enforced), T-SQL can leave the transaction open with an UPDLOCK on the row. That is the exact hazard db-sql-modify warns about. Fix: add `SET XACT_ABORT ON;` after `SET NOCOUNT ON;`, or wrap the body in TRY/CATCH with ROLLBACK and THROW.
- **[high, consistency]** `SET end_time = SYSUTCDATETIME()` (procedure), `SYSUTCDATETIME()` (audit trigger), versus `system.date.now()` for `start_time` in db-project → A downtime row would hold a local start and a UTC end, so `duration_min` is inflated by the UTC offset and nothing errors. The CHECK constraint still passes. Fix: one convention across the track. Use `GETDATE()` to match Ignition local time, or UTC everywhere and convert in Ignition. db-historians already calls mixing these a pitfall.
- **[med, consistency]** `"Avoid the sp_ prefix on SQL Server if you can"` → Every procedure in the lesson is `sp_close_downtime` or `sp_record_run`, and db-operations grants `sp_close_downtime`. Rename to `usp_` throughout, including the Ignition script and the GRANT.
- **[med, accuracy]** `"A database trigger ... PostgreSQL supports BEFORE, AFTER and INSTEAD OF timing"` followed by a `CREATE TRIGGER ... AFTER UPDATE AS` block using `inserted`/`deleted` → This is SQL Server syntax, not labeled. Add "This example is T-SQL (SQL Server) syntax."
- **[low, accuracy]** `DATEDIFF(SECOND, d.start_time, d.end_time)` in `v_downtime_report` → Dialect not labeled (T-SQL). Add the PostgreSQL form, as db-sql-joins does.
- **[low, clarity]** `"Ignition gives you two common routes."` → A named-query tip follows, so the reader sees three. Reconcile the count.
- **[low, verify]** `"on PostgreSQL, createSProcCall works with functions"`; `escapeSyntaxCallMode=callIfNoReturn`; Oracle index-based parameters → (verify) against the 8.3 manual. Quiz 6 depends on the PostgreSQL claim.
- **[low, verify]** `call.registerInParam("machine_id", system.db.INTEGER, 14)` → (verify) argument order of `registerInParam` in 8.3.
- **[low, FACTS]** Resources link only the 8.1 `createSProcCall` page → Add the 8.3 page first, with the 8.1 link as the callout.

### db-operations
- **[high, consistency / security]** `GRANT EXECUTE ON sp_close_downtime TO ignition_reports;` → The account is the reporting account. The lesson's own rule is "Analysts and report tools get SELECT on views, not on base tables," and the Power BI example says the reporting login "can't touch production_run." Granting a write-capable procedure to the reporting login contradicts both. Fix: remove that line and give EXECUTE only to a separate operator or application login.
- **[med, consistency]** `GRANT SELECT ON v_production_summary` and `"read two views"` in the Power BI example → `v_production_summary` is not defined anywhere in the track; db-procs defines only `v_downtime_report`. Define it in db-procs or remove the reference.
- **[med, clarity]** Worked example: `"A nightly full backup meets RPO only if..."` and later `"a restore of the weekend full, the latest differential and a day of logs"` → The schedule is a Sunday full with nightly differentials, so the worked example mixes two schemes. Fix: "a nightly differential on top of the Sunday full" in both places.
- **[low, clarity]** `"Full backup Sunday at 02:00." / "Differential every night at 02:00."` → Both run at 02:00 on Sunday. Offset the differential (for example 03:00) or say the full replaces it that night.
- **[low, consistency]** `"warn at 20 percent, page at 10 percent"` → Uncited thresholds. Label as house practice guidance, not a vendor figure.
- Backup types, recovery models, the RPO and RTO worked numbers (1 hour, 8 hours, 12 hours), Purdue placement and ports (1433, 5432, 3306) match HOUSE_STANDARD. The log-full example is internally consistent. Quiz answers are correct.

### db-historians
- **[med, consistency]** `"A bridge forwards Plant A/Line 2/Filler 14/Temperature and its siblings to an Event Hubs topic."` after `"publishes Sparkplug B to a local broker"` → HOUSE_STANDARD section 2 says "Never put an ISA-95 path in a Sparkplug topic," and gives the Sparkplug mapping and the lowercase UNS topic. Fix: show `spBv1.0/Plant1/...` for the Sparkplug leg and the house UNS form `meridian/plant1/area10/line1/m101/sts/running` for the cloud topic.
- **[med, consistency]** `"Plant A"`, `"Line 2"`, `"Filler 14"`, `L2_M14_TT_203` → Not the house plant or tag scheme (Meridian Foods Plant 1, Area10/Line1, ISA-5.1 tags such as M101 and LT101). Use house names, or add the one-sentence "different example on purpose" note.
- **[med, uncited]** `"PI Square forum guidance, quoted from OSIsoft practice, suggests setting exception deviation slightly below the instrument's precision, and often about half of the compression deviation."` → The attribution is unclear and "about half" is uncited. Cite the PI Square thread in the sentence, mark the ratio "(verify)", or drop it.
- **[low, uncited]** `"figures in the 90 to 98 percent range quoted by the vendor"` → Cite the Timescale compression page (already in Resources) and mark (verify).
- **[low, verify]** `"AVEVA acquired OSIsoft in 2020"`; `"Canary ... lossless compression"` in the table; `"No extra license beyond Ignition"` → (verify) each against vendor sources.
- The swinging-door example (81.5 degC) and the sizing example (144 million rows/hour, about 5.8 GB/hour at 40 bytes) are correct. Quiz answers are correct.

## Cross-lesson issues

1. **Plant naming differs from HOUSE_STANDARD across the whole track (med).** db-intro, db-sql-select/joins/modify, db-indexes, db-project, db-procs, db-operations and db-historians use an unnamed bottling/packaging site (Line 1 "Bottling", Filler 1, `L1-FILLER`, Plant A, `L2_M14_TT_203`). None of them uses Meridian Foods Plant 1, Area10/Area20, Line1, or ISA-5.1 equipment numbers, and none has the "different example on purpose" sentence. Fix once in db-intro: state the teaching plant and why, or map the names to house names.
2. **Time-zone convention is inconsistent (high).** db-project writes `system.date.now()` (gateway local); db-procs writes `SYSUTCDATETIME()` in the procedure and the audit trigger; db-project's OEE query uses server `now()`. db-historians warns against exactly this mix. Pick one convention and state it in db-intro.
3. **Store-and-forward is attributed to three different things (low).** db-intro calls it a general Ignition feature; db-project says "the connection's store-and-forward feature" protects transaction groups; db-operations says "on database connections and the Tag Historian." Verify and use one accurate description.
4. **Quality code 192 (med).** db-timeseries teaches 192 as good and filters on it in SQL. FACTS 2 says 8.x codes differ and warns against comparing to 192. Resolve in db-timeseries (see above).
5. **8.3-first API rule is not applied everywhere (low to med).** db-sql-modify's main code uses `runPrepQuery` (FACTS 10 runQuery family) with the 8.3 callout as a footnote. db-procs cites only the 8.1 `createSProcCall` page. db-project's main code correctly uses 8.3 `execUpdate` with the 8.1 callout.
6. **Procedure naming contradicts itself (med).** db-procs uses `sp_` everywhere and then advises against it. db-operations copies the `sp_` name into a GRANT. Rename to `usp_` in both lessons.
7. **Undefined and inconsistent references (med).** `v_production_summary` (db-operations) is never defined. db-procs's `v_downtime_report` uses T-SQL functions without a dialect label, and the trigger is T-SQL under a PostgreSQL sentence.
8. **Uncited numbers against HOUSE_STANDARD section 7 (low to med).** db-indexes "3 to 4 levels"; db-historians "about half" and "90 to 98 percent"; db-operations "20 percent / 10 percent"; db-timeseries "40 to 60 bytes" (a range, labeled as an estimate, acceptable). Cite or label each.
9. **Cross-references resolve (no issue).** All `{{lesson:...}}` targets exist, including mes-oee, mes-downtime, mes-uns, proto-sparkplug, arch-mqtt, found-purdue, net-security and ign-historian. Every `{{term:...}}` key used in db-* lessons has a definition in the content tree (checked by search; not an exhaustive glossary audit).

## One-line verdict

Arithmetic, result tables and quiz answers are correct throughout, but fix the high-severity items before release: the `sp_close_downtime` open-transaction hazard, the local-versus-UTC timestamp mix, and the reporting login granted EXECUTE on a write procedure in db-operations.
