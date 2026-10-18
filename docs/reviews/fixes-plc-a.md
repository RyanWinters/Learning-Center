# Fixes: plc-a (plc-intro, plc-studio, plc-scan, plc-tags, plc-ladder-basics, plc-sealin, plc-oneshots, plc-timers, plc-counters, plc-compare-math, plc-analog)

## plc-intro
- No findings against this lesson in the assigned reviews. Unchanged.

## plc-studio
- Fixed: "Accept and Finalize" replaced with Test Edits / Accept Test Edits / Cancel Edits wording, with a "check your version" caveat.
- Fixed: added a Forces section (override, indicator, remove before handoff); reuses glossary id io-force.
- Softened: CompactLogix 5380 key-switch claim; Upload row ("may lack comments").
- Fixed: IPs now use the house plan (PLC1 10.20.10.10, workstation on VLAN 50).

## plc-scan
- Fixed (high): deleted the "twice the RPI plus scan" rule; worst-case sum is the only rule.
- Softened: default RPI ("check the module properties"), Monitor tab values, output-update timing, watchdog default.

## plc-tags
- Fixed: Local:1:I.Data width depends on module (INT for 16-point, DINT for 32-point; check profile).
- Fixed: UDT example now M101 of UDT_Motor with M101.Cmd.Start etc.
- Softened: description length / display claim.

## plc-ladder-basics
- Fixed: ELI5 now maps doors to XIC, XIO, OTE and the NC stop.
- Fixed: bracket/comma branch notation introduced before the quizzes; quiz 2 and 3 carry short definitions.
- Fixed: worked example no longer puts E-stop/overload protection in logic (HOUSE 6); uses P101, links plc-sealin.

## plc-sealin
- Fixed (high): new section "What is hardwired and what is in the PLC", with SVG control-circuit-vs-rung comparison and link to found-motor-control.
- Fixed: seal-in on M101_RunCmd with separate output rung; worked example rewritten with M101 UDT names, aux contact status, OL status, fail-to-start.
- Added: quiz question on where the overload protection must act.

## plc-oneshots
- Fixed: deleted the unsourced "safety documentation swaps rising/falling" note.
- Fixed: jog example now uses a GSV WallClockTime rung on the pulse (OSR stores no time).
- Fixed: "interrupt task" replaced by periodic/event task. Softened PLC-5/SLC history claim.

## plc-timers
- Fixed: RES rule (clears ACC, DN, TT; EN follows the rung); ACC stops at PRE stated; RTO diagram caption aligned.
- Fixed: rollover example uses ONS before CTU; DINT tag shown as preset (with a "check your version, else MOV to .PRE" fallback).
- Added: Structured Text timer section; quiz question on RES and EN.
- Rejected: none.

## plc-counters
- Softened (high): CTD .DN. I could not verify against Rockwell (the instruction pages were unreachable and search summaries conflicted). The lesson says the reference gives ACC >= PRE for both, tells readers to check the CTD page for their version, and tests with GEQ/LEQ on ACC. sim-ctd still treats CTD DN as ACC >= PRE; orchestrator should confirm.
- Fixed: car-park sign driven by GEQ(Cars.ACC,100); missed-pulse example separates hardware stretcher from PLC timer; "interrupt task" -> periodic task.
- Softened: power-cycle retention, overflow wrap.

## plc-compare-math
- Fixed: scaling examples use the HOUSE 5 card (LT101, 6242-31208, 0-5.0 m).
- Fixed: Recipes array declared 11 long (or index minus 1), agreeing with plc-tags.
- Removed: unverified EQ/GT/MOVE editor-name sentence.
- Softened: divide-by-zero, overflow fault, integer divide rounding claims.

## plc-analog
- Fixed: all numbers moved to HOUSE 5 (6242/31208, LT101 0-5.0 m, dead loop -1.25 m); NE43 table inserted; alarm example rescaled (H 4.0 m, deadband 0.1 m); diagrams and quiz updated.
- Rejected: truncated ALMA sentence (finding 9): the text in the file is complete.
