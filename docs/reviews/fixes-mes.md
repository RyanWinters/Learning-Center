# Fixes: MES track

Sources: 1-integrator.md (mes-sepasoft), 5-owner.md (mes-oee), pass2-mes.md. Web checks: Sepasoft docs (equipment states, versioning scheme).

## mes-sepasoft
- Fixed: added worked "Plant1 Line1" example (Area20 packer M201): house UDT bits -> single State DINT -> Sepasoft state types/modes -> one overload downtime event -> Pareto row; added state-code table and ST snippet.
- Fixed: brochure wording on Batch Procedure and Settings & Changeover replaced with neutral text and "check the docs".
- Fixed: version claims. Removed "3.81.11"; kept 4.83.x/3.81.x only with the verified scheme (platform.Ignition.minor, FACTS #4) and links to the versioning and downloads pages.
- Fixed: diagram and text moved from Acme/Dayton/Line 3 to Meridian Foods/Plant1/Area20/Line1. Removed unverified Confluence-history sentence. Resources updated.

## mes-oee
- Fixed: "a third" -> 30 percent (18 of 60). Added a source link to the 85 percent figure. OEE math rechecked, unchanged.

## mes-downtime
- Fixed: 40 x 25 s -> about 17 min; "Line 3" SQL -> parameter; pseudo-ST labeled with clock source note; 8 top-level/30-50 leaves/5 percent turned into rules of thumb (tree has four top-level choices).
- Softened: Sepasoft short-stop threshold ("zero includes all" removed), split and planned-break claims now point to docs and say verify.

## mes-track-trace
- Fixed: mass-balance rule added; carton_unit and shipment tables added; R-5530 top-up explained; recursive CTE depth guard; Acme/Beta -> Customer A/B; Line 2 -> Line1.
- Softened: Sepasoft Track & Trace capability list.

## mes-batch
- Fixed: Acme/Dayton -> Meridian Foods/Plant1/Area10; K101 -> TK101 (TK-101 on P&ID); unit-bearing members (TargetC, HoldMin, PeakC) -> TargetTemp, HoldTime, PeakTemp; quiz answers reshuffled.

## mes-spc
- Fixed: 370/95 figure replaced by the 1/0.0027 arithmetic and a qualitative statement; Cpk targets and 20-25 subgroups marked as conventions; "legal minimum" -> internal reject limit; normality caveat for I-MR; quiz answers reshuffled.

## mes-recipes
- Fixed: OvenZone2_C -> OvenZone2Setpoint under Area20_Line1; handshake timeout and abort path added; scrap claim softened; quiz answers reshuffled (were all B).

## mes-build-vs-buy
- Fixed: diagram tick "3" repositioned and labeled illustrative; quiz 5 explain reworded. Softened trial-mode claim.

## mes-erp
- Fixed: cases vs EA (now CS in B2MML with conversion note); Widget/resin -> Marinara/tomato paste, lot R-5521 -> T-4410 (no clash with track-trace); Part 4 wording aligned with mes-what; Jython named; service account/API key and DMZ reverse proxy note added.

## mes-what
- Fixed: Part 2/Part 4 wording; Line 2/3 -> Line1.

## mes-uns
- Fixed: topics moved to meridian/plant1/area10/line1/m101/sts/running form; added plain-vs-Sparkplug table (never mixed) using HOUSE mapping; vendor named at first use; webinar sentence rewritten; Cirrus Link claim softened to "check docs".

## mes-industry4
- Fixed: IT/OT lifespan numbers softened; ISA attribution removed; ladder diagram shifted down.

## Rejected
- pass2 "K101 first letter means time schedule": applied anyway (TK101) since vessel tags suit house style.
- pass2 item that mes-track-trace "Sepasoft pages" need link verification: softened rather than verified.
- Glossary e10.js: no new terms needed.
