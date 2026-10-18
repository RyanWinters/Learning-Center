# Fixes: int-* lessons

## int-naming (canonical HOUSE section 2)
- Fixed: worked example rebased on Meridian Foods Plant1/Area10/Line1/M101 across drawing M-101, PLC M101, OPC item path, Ignition path, historian, Perspective tagPath, SQL, MES, plain UNS topic and Sparkplug (spBv1.0/Plant1/DDATA/Area10_Line1/M101, metric Sts/Running). Second mapping table for LT-101 to LT101. Drawing hyphen vs code no-hyphen rule stated once.
- Fixed: regex now `^[A-Z]{1,4}[0-9]{3}[A-Z]?$` (tested); `P101_Pump` correctly fails. Underscore rule and "units not in member names" per HOUSE. UDT members Sts.Fault, Cfg.StartDelay, Alm.Overload; diagrams and quiz rewritten.
- Fixed: Sparkplug vs plain UNS split into two explicit rules.
- Softened: removed the uncited 256-character limit and provider-name claim ("check the 8.3 manual"); removed "manual warns" wording on UDT rename.

## int-capstone
- Fixed: Sparkplug topic per HOUSE (group Plant1, node Area10_Line1, device M101); ISA-95 path only for plain MQTT/UNS.
- Fixed: database HA added to D5/D7 and R4 with chained availability table (99.85 / 99.90 / 99.93 percent), link to db-operations; new quiz question on series availability. Figures are labeled as assumptions.
- Fixed: DMZ pattern per HOUSE 4 (outgoing connections to DMZ gateway, proxy hops, no L3-L4 direct, jump host); house IP plan table for Plants 1-3 and Corporate; plants named Plant 1/2/3 (cities in brackets); company renamed Meridian Foods. Diagrams updated.
- Rejected: none.

## int-lifecycle
- Fixed: site-hours double count. Fixed price now covers 450 design/build hours (67,500 + 10 percent contingency = 74,250); site 100 h (15,000) is T&M capped separately; max 89,250. FAT example uses LAH-101 on high level.

## int-alarm-mgmt
- Fixed: PAL-1004 replaced by "LT-101 quality" (philosophy-defined quality alarm); worksheet moved to loop 101 (LAHH-101, LAH-101, T-101).
- Softened: removed "30 to 60 percent"; 80/15/5 split and chattering definition now point to ISA-18.2 / EEMUA 191 for confirmation.

## int-fds
- Fixed: loop numbers to 101; PAL-1004 replaced by "LT-101 quality"; unhappy-path exit rows for Heat, Hold, Drain and an operator Stop row; 4.2.5 now covers bad quality (NE43), comms loss, power loss and valve fail position; `P101_Ctl` replaced by `AOI_Pump`.

## int-commissioning
- Fixed: alarm test now 17.76 mA = 86 psi (17.6 mA is exactly 85); clear at 83 psi = 17.28 mA.
- Fixed: quiz 1 data (constant +0.05 m offset on a 0-5.0 m LT-101, matching HOUSE LT101); example rewritten with real arithmetic (raw min 6000 vs 6242 gives 0.048 m). Added teaching-card counts with module-specific disclaimer and the NE43 table; quiz 2 explain uses 3.6 mA.
- Fixed: `P101.Cmd.Start`, `P101.Alm.Overload`, overload hardwired note; sample path `[default]Plant1/Area10/Line1/...`; hyphen/no-hyphen note for the I/O list.
- Softened: force persistence across power cycles; tag diagnostics alarm view claim.

## int-standards
- Fixed: quiz 3 distractor explanations; TIC-210A Ignition form now `TIC210A` (no underscore); hyphen claim replaced by the Logix reason.
- Softened: IEC 61131-3 instruction list status ("check the edition").

## int-career
- Softened: price, time limits, validity period, question counts, experience years, exam length, CSIA renewal term all replaced by "check the issuer's site". Quiz 4 explain clarified.
- Fixed: ISA wording (exam plus experience requirements, not "no application").
- Reworked: new "What to build to be hireable" capstone-style section mapping evidence to {{lesson:build-setup}}, build-motor-udt, build-faceplate, build-alarms-history, build-oee plus decision log, naming standard, FDS excerpt, commissioning record. Home lab and portfolio examples use Meridian names.
- Not changed: curriculum.js level/prereq mismatch (outside my files); no new glossary terms (e11.js untouched).
