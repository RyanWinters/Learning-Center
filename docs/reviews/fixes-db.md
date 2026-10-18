# Fixes: db track

Convention set in db-intro: the SQL sample is a deliberately simple teaching plant (noted in the lesson); all timestamps are stored in UTC.

## db-intro
- Fixed: "different example on purpose" note plus mapping to Plant1 names; UTC storage convention stated; timestamp type row now UTC/TIMESTAMPTZ; store-and-forward wording softened; SQLite claim softened.

## db-sql-select
- Fixed (2-noob): integer division, LIKE case, TOP/FETCH, NULL sort order, time functions and DST moved to "why"; quiz now covers SELECT/WHERE/NULL/DISTINCT/ORDER BY only (timestamp and TOP questions removed).

## db-sql-joins
- Fixed: DATEDIFF sentence rewritten with the MINUTE/HOUR example.

## db-sql-modify
- Fixed: rehearsal example uses reason 4 (3 rows; Sensor Fault 3 to 0, No Product 2 to 5); BEGIN wording; named-query commit claim softened; main example uses 8.3 execQuery with an 8.1 callout.

## db-schema
- Fixed: is_planned dropped (derived from category); supervisor and line_supervisor tables added; TIMESTAMPTZ with a UTC enforcement note; PostgreSQL does not index FKs (indexes added); versioned migrations and concurrent writers paragraph; M101 natural key example.

## db-indexes
- Fixed: INCLUDE duration_min; "3 to 4 levels" removed; index-selectivity caveat.

## db-timeseries
- Fixed/softened: 192 quality code no longer used as a filter and flagged version-dependent; 8.3 store call named (storeDataPoints, "look for"); lowercase path and partition suffix claims softened; house tag path.

## db-project
- Fixed: ideal_rate_per_min copied onto production_run and used by the OEE query; TIMESTAMPTZ and UTC session; is_planned replaced by category; Pareto tiebreak; first-interval note; store-and-forward softened; FK index; Line1/M101 names.

## db-procs
- Fixed: XACT_ABORT, TRY/CATCH and warning for the open-transaction hazard; sp_ renamed usp_ everywhere; UTC consistency note; T-SQL labels on view and trigger; route count reconciled; 8.3 system.db resource added; PostgreSQL claims softened ("check the manual").

## db-operations
- Fixed: reporting login has SELECT only, separate ignition_app login gets EXECUTE; v_production_summary removed; schedule/worked example made consistent (Sunday full, nightly differential, hourly logs); 20/10 percent labeled house practice; reference plant addresses (10.20.30.20, DMZ replica).

## db-historians
- Fixed: house names and Sparkplug/UNS topic forms; PI Square ratio claim and "90 to 98" removed; license claim reworded.
- Rejected: AVEVA/OSIsoft 2020 acquisition left as is (well known).
