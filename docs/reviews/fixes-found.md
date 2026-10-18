# Fixes: found-* lessons

## found-devices
- Fixed: starter anatomy now says overload and E-stop are hardwired in the coil circuit, the PLC only monitors (aux contact), process permissives stay in logic (HOUSE 6). Teaching rung changed to `XIC(M101_RunCmd) OTE(M101_Contactor)`; diagram caption/labels updated. VFD stop is hardwired too.
- Fixed: "three protections" wording (objectives and body): short-circuit, overload, hardwired stop chain; contactor is the switch.
- Fixed: drawing vs code tag mapping shown once (P-101/FT-101 vs P101/FT101); acronyms expanded (PLC, HMI, HART, EDS, RTD).

## found-signals
- Fixed: one count scale (0-21 mA = 0-32,767; 4 mA = 6,242, 20 mA = 31,208, with "counts are module-specific"). Worked 4-20 mA example in the body (LT101, 8 mA -> 25% -> 1.25 m, plus counts). ST snippet uses NE43 limits.
- Fixed: single NE43 table per HOUSE 5; removed the conflicting 3.6 mA row from the 4-20 table.
- Softened: PNP/NPN regional claim (both used in North America, PNP widely in Europe); discrete threshold voltage and HART minimum loop resistance now "check the datasheet".
- Fixed: AOI, UDT, resolution, calibrator defined; acronyms expanded.

## found-control
- Fixed: P-only offset arithmetic (balance output 14%, e = 7, PV settles at 53%, matches quiz 2).
- Added: controller action (direct/reverse) and valve fail position section, linked to int-commissioning.
- Softened: anti-windup claim limited to PIDE/DCS blocks; lambda multiple and wet-well lambda example no longer give a number.
- Acronyms expanded; LT-201 drawing/code form noted.

## found-pid-docs
- Fixed: spare-capacity math with formula and table (5 AI, 4 AO, 7 DI, 4 DO at 15%); quiz 5 already consistent.
- Fixed: drawing tags keep hyphen, PLC tag column added to the I/O example, mapping note added.
- Softened: diamond-in-square legend. Quiz 2 explanation rewritten; other explanations in that quiz clarified.
- Acronyms expanded (ISA, DCS, AI/AO/DI/DO, RTD, SAT, HMI).

## found-jargon
- Fixed: chassis slot claim ("fit", verify layout); counting example applies 15% spare (4 DI, 3 AI, 1 DO, 2 AO).
- Softened: glossary-coverage claim. Tag row shows drawing/code naming; acronyms expanded in table rows.

## found-roles
- Fixed: tiers aligned with int-career (Credentialed = IU credential, Certified = Core, Gold = Gold employee + sales, Premier = more Gold), kept generic with "check the program page"; removed "free to join".
- Softened: CSIA founding year removed (not verified). Acronyms expanded.

## found-history, found-purdue
- No review findings. Acronyms expanded on first use. found-history: key-date order fixed, unverified ICC 2013 date removed. found-purdue: worked example arithmetic fixed (12.4 mA is 52.5%, not 62.5%; now 14 mA) and moved to LT101/PLC1.

No rejections; no web searches used.
