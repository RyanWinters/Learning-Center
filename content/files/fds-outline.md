# Functional design specification outline: Meridian Plant 1, Area10, Line1

Use this as a skeleton for the motor and line you build in the labs. Replace the bracketed text. Keep each requirement testable (one "shall" per line, numbered).

## 1. Document control
Title, revision, author, reviewer, date, change log.

## 2. Purpose and scope
- What the system does: monitor and control motors M101-M103 on Line1, show OEE for the shift.
- Out of scope: [safety functions, ERP integration, ...].
- Reference documents: P&ID, I/O list (io-list-template.csv), naming sheet (meridian-naming-sheet.md).

## 3. System architecture
- Ignition gateway (Level 3), PLC1 (Level 1), database `meridian_db`.
- Network and ports (see naming sheet).
- Tag provider `default`, project `Meridian`.

## 4. Equipment description (per motor)
- Tag, service, rating, starter type, VFD yes/no.
- Hardwired protection: overload, E-stop. State clearly that the PLC only monitors them.
- Permissives and interlocks (software).

## 5. Control narrative (per motor)
- Modes: Auto, Manual.
- Start sequence: command, start delay (`Cfg.StartDelay`), run feedback timeout, `FailToStart`.
- Stop sequence and fault behavior: `Overload`, reset (`Cmd.Reset`).
- Shall statements, e.g. "The motor shall raise FailToStart if Running is not true within [10] s of Start."

## 6. Data interface
Table: UDT member, data type, direction, scaling, units. (Cmd, Sts, Cfg, Alm.)

## 7. HMI requirements
- Screens: line overview, motor faceplate (one `tagPath` param), alarm screen, OEE screen.
- Navigation, colors (ISA-101 style: neutral normal state, color for abnormal), user roles.

## 8. Alarm requirements
Table: alarm, priority, delay, deadband, consequence, operator action (feeds the master alarm database).

## 9. History and reporting
- Tags historized, sample mode, deadband, retention.
- OEE definition (A x P x Q), shift times, ideal rates, downtime reason list.

## 10. Database requirements
Tables, retention, backup, service account.

## 11. Testing
- FAT/SAT test table: requirement number, test steps, expected result, pass/fail.
- Simulator test cases for the labs.

## 12. Open items and assumptions
