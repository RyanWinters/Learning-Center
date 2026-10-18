# Pass 2 review: MES track

Scope: mes-what, mes-downtime, mes-track-trace, mes-batch, mes-spc, mes-recipes, mes-build-vs-buy, mes-erp, mes-uns, mes-industry4.
Read first: docs/HOUSE_STANDARD.md, docs/FACTS.md. No repo files edited.

## Persona

MES consultant: ISA-95 and ISA-88 models, OEE and downtime, batch recipes and records, SPC, Sepasoft-based builds, and ERP integration (B2MML, file drops, duplicate-safe confirmations). Reviewing for accuracy against practice, house conventions, quiz integrity and whether a new controls engineer can act on each lesson.

## Per-lesson findings

### mes-what
- **[low accuracy]** "**Part 4** covers the object models and attributes used to exchange data between Part 3 activities." → Part 4 is the object-model part for manufacturing operations activities. mes-erp describes it differently (scheduling, performance and work records). Reword to match one description and check the scope (verify against ISA-95.00.04).
- No other significant issues. Quiz indices, explain alignment and the "Correct" markers all check out. Cross-references resolve.

### mes-downtime
- **[med accuracy]** "Sepasoft's equipment state configuration includes a short stop threshold in seconds ... setting it to zero includes every event." and "Sepasoft documents that planned breaks and similar scheduled stops do not count against line OEE Availability." → Vendor behavior claims with no verify mark. Check both against the linked Sepasoft pages for the release in use, or add "(verify for your release)".
- **[med consistency]** "If 'Other' is more than about 5 percent of downtime" and "Around 8 top-level choices and 30 to 50 leaves in total" → house §7 forbids uncited specific numbers. Present them as practitioner rules of thumb, or cite them. Also, the example tree directly below has 4 top-level categories, so "around 8 top-level choices" does not match what the reader just saw.
- **[med clarity]** The first-out ST snippet: "FirstOutTime := NowTimestamp;" → `NowTimestamp` is not a Logix identifier. Label the block as pseudo-ST, or show a real source such as a clock tag or `GSV(WallClockTime, ...)` (verify exact form for Studio 5000 v33+).
- **[low accuracy]** "A packaging line with 40 jams a shift at 25 seconds each loses 16 minutes" → 40 x 25 s = 16.7 min. Write "about 17 minutes".
- **[low accuracy (verify)]** "Sepasoft's Perspective downtime table lets operators assign more than one reason to an event and split it at the line level." → Verify against the OEE Downtime Table page cited in resources.

### mes-track-trace
- **[med missing]** The worked recall reconciles 1,000 kg as 300 + 450 + 250 on hand, but the lesson never states the rule. Add a mass-balance paragraph: received = consumed + on hand + scrapped + returned, and any gap means a missing or wrong scan. This is the check a practitioner runs first on a recall.
- **[med clarity]** Backward-trace example: "carton 7450-B ... The unit table gives serial 000412" → The model has no carton-to-unit link (the `shipment` table is referenced but never defined, and `unit` has no carton column). Add a `carton` or packing table, or say the carton-to-serial map comes from the packing line.
- **[low clarity]** The SVG genealogy diagram draws R-5530 feeding WO-702, but the text's worked recall shows WO-702 consuming only R-5521. Add one sentence for the R-5530 top-up, or remove the arrow.
- **[low accuracy]** Recursive CTE: "WITH RECURSIVE downstream(lot_id, depth) AS (...)" has no cycle or depth guard. A mis-scan that links a lot back to its own descendant will loop on MySQL and PostgreSQL. Add a depth limit (e.g. `WHERE d.depth < 50`) and note it.
- **[low accuracy (verify)]** "Sepasoft's Track & Trace module ... covers ... serialization of items and sub-assemblies, and WIP inventory." → Verify against the Sepasoft pages.

### mes-batch
- **[med consistency]** "Acme Foods" and "Dayton plant" in the physical-model table, and "The Dayton plant" in quiz 3 → House §1 requires Meridian Foods, Plant 1 (Chicago), or a one-sentence statement that the example is deliberate. Neither is present.
- **[low accuracy (verify)]** Tags "K101.Heat.Cmd", "K101.Heat.State" → In ISA-5.1 the first letter K means time schedule, so K101 is a poor kettle tag. Use a vessel-style prefix (e.g. R101 or TK101) per house §2 (verify house convention).
- No other significant issues. ISA-88 levels, recipe types and state values are consistent across the handshake, the hold example and the quiz.

### mes-spc
- **[med accuracy (verify)]** "Published figures show that adding the Western Electric rules to an X-bar chart cuts the average time to a false alarm from about 370 samples to about 95." → Uncited number, which house §7 forbids. Cite the source or drop the figure. (Verify: the figure usually quoted for the combined WE rules is about 92, not 95.)
- **[med consistency]** "Common targets are Cpk of 1.33 or better ... and 1.67 for critical characteristics" and "at least 20 to 25 subgroups" → Practitioner conventions with no citation. Add "check your customer or PPAP requirement" or cite a reference.
- **[low accuracy]** "The chart did its job before anything went below the 495 g legal minimum." → A 495 g limit on a 500 g fill is not a legal figure here. Write "495 g internal reject limit (example)".
- **[low missing]** Individuals charts assume roughly normal data, and the lesson never says so. Add one sentence and a pointer to a normality check (verify).
- Math checked and correct: X-bar/R limits (10.161 / 9.999, R UCL 0.296), sigma 0.060, Cp 1.67, Cpk 1.22, I-MR limits 46.0 to 54.0, p-chart UCL 0.0817, c-chart UCL 10, quiz Cpk 1.33 and the 1.67 distractor.

### mes-recipes
- **[med consistency]** "Line1.Recipe.Staging.OvenZone2_C" and "Line1.Recipe.Active.OvenZone2_C" → House §2 allows underscores only after a prefix or between area and name. Rename to a PascalCase member such as `OvenZone2Setpoint` (verify house form).
- **[low missing]** The handshake has no timeout. If the PLC faults after Download.Request, SCADA waits forever. Add a timeout and an abort path.
- **[low consistency]** "Wrong settings are one of the most common causes of scrap after a changeover" → uncited claim. Soften it or cite it.
- Quiz: all five answers sit at index 1. See cross-lesson.

### mes-build-vs-buy
- **[med clarity]** Cost diagram: the x-axis labels "0", "3", "5" sit at x = 60, 330, 590. Equal-width ticks imply a linear scale, so year 3 should be at about x = 378 for 0 to 5 years at x = 60 to 590. Move the "3" label, or space the data points evenly.
- **[low clarity]** Quiz 5 explain: "Custom is cheaper for small stable scopes only. As a rule it is not true in general." → Reword to "Custom is cheaper only for small, stable scopes, so it is not a general rule."
- **[low accuracy (verify)]** "You can install the Sepasoft modules in trial mode and configure one real line in a few days." → Confirm the trial terms for the current release.
- No other significant issues. The quiz answers and explanations are correct, and the custom-versus-packaged checklist matches the body.

### mes-erp
- **[med consistency]** Worked slice: "ERP releases production order 1001234 for 5,000 cases of WIDGET-BLUE" versus the fragment "<QuantityString>5000</QuantityString> <UnitOfMeasure>EA</UnitOfMeasure>" → Cases and eaches disagree, and the pitfall list warns about exactly this. Use the case UoM code, or change the narrative to 5,000 each.
- **[med consistency (verify)]** "Part 4 of the standard goes deeper into operations management models for scheduling, performance and work records." → Conflicts in emphasis with mes-what. Reconcile the two descriptions and check the edition named.
- **[low accuracy]** "Plain Ignition can do all of the above with Python scripting" → The scripting engine is Jython 2.7 in 8.1. Check the 8.3 scripting docs (FACTS targets 8.3) and name the engine.
- **[low missing]** The REST row says "authentication", but no example shows how the gateway endpoint authenticates the middleware. One line on API keys or a service account would close it.

### mes-uns
- **[med consistency]** Topic examples "acme/dallas/packaging/line2/..." and "acme/houston/blending/tank4/level" → House §2 defines the plain-MQTT UNS form as "meridian/plant1/area10/line1/m101/sts/running" (lowercase). Use the house plant, or add the one-sentence "deliberate" note.
- **[low accuracy (verify)]** "Cirrus Link has offered options to present Sparkplug data in a UNS-style hierarchy in MQTT Engine." → Verify against Cirrus Link docs for the release in use.
- **[low clarity]** "In an Inductive Automation webinar the point was made that the namespace is the sum of the contributors and the MQTT server, so the broker holds it." → Non sequitur. Rewrite as: "the namespace is the combined output of its contributors, and the broker is where it lives".
- **[low clarity]** "MQTT Transmission", "MQTT Engine" and "Chariot" are named without saying which vendor owns each. Add the vendor in parentheses on first use.
- No other significant issues. Quiz answers and explanations are correct, and the 45-connection math (10 systems, n(n-1)/2) checks out.

### mes-industry4
- **[med accuracy (verify)]** "System lifespan: 3 to 5 years (IT) / 15 to 30 years (OT)" → Uncited numbers, which house §7 forbids. Cite a source or soften to "IT refresh cycles are short, OT lifespans are often decades".
- **[low accuracy (verify)]** "The ISA's own writing on the subject frames IT/OT convergence as a layered architecture" → No citation. Name the ISA source or drop the attribution.
- **[low clarity]** Ladder SVG: rung 6 box is only 32 px high at y = 4, which crowds the top edge. Move the diagram down or shorten the list.
- No other significant issues. Quiz answers and explanations are correct, and the data-ladder ordering matches the body.

## Cross-lesson issues

1. **[med consistency] House plant and naming not used.** mes-batch (Acme Foods, Dayton), mes-uns (acme/dallas/packaging/line2, acme/houston), mes-track-trace (Acme), mes-downtime (Line 3), mes-erp (WIDGET-BLUE) use names outside the Meridian Foods Plant 1 reference, and none carries the one-sentence "deliberate" note house §0 requires. Move them to Meridian Plant 1, Area10, Line1, or add the note in each lesson.
2. **[med consistency] Uncited numbers.** mes-downtime (5 percent, 8 top-level choices, 30 to 50 leaves), mes-spc (370 and 95 samples, Cpk 1.33 and 1.67, 20 to 25 subgroups, 495 g "legal" minimum), mes-industry4 (IT 3 to 5 years, OT 15 to 30 years). House §7 requires a citation or a "check the manual" pointer at each point of use.
3. **[med accuracy] ISA-95 part numbering.** mes-what and mes-erp describe ISA-95 Part 4 differently. Pick one wording and verify it against the edition cited (verify).
4. **[med consistency] Unit of measure.** mes-erp uses cases in prose and EA in the B2MML fragment. Fix in mes-erp (see above).
5. **[med accuracy] Vendor claims.** mes-downtime, mes-track-trace, mes-erp, mes-uns and mes-build-vs-buy make specific Sepasoft, Cirrus Link and Inductive Automation feature claims with no "(verify for your release)" marks. The track is pitched to a Sepasoft-experienced reader, so mark them or link the release notes.
6. **[low consistency] Tag conventions.** mes-recipes uses underscores inside member names (OvenZone2_C), and mes-batch uses K101 for a kettle. Check both against house §2.
7. **[low quiz] Answer-position skew.** mes-recipes answers are 1,1,1,1,1 (all option B). mes-batch and mes-spc also lean to B. Shuffle the correct options so the answer is not a visible pattern.
8. **[low consistency] Lot R-5521.** mes-track-trace consumes R-5521 as 300 kg and 450 kg (1,000 kg lot). mes-erp shows R-5521 consuming 312 kg for order 1001234. Either say they are different events or use a different lot ID.
9. **[ok] FACTS.md.** No conflicts found. The lessons do not use the deprecated 8.3 tag-history or db-run functions, quality code 192, or the removed failover timeout. The `system.net.httpClient` reference in mes-erp is valid for 8.x.
10. **[ok] Structure.** All 16 lesson cross-references (`{{lesson:...}}`) and all prerequisite IDs resolve to existing lessons. All 58 quiz questions have a valid answer index, four options, four explanations, and a "Correct." explanation only at the answer index.

## One-line verdict

Technically strong and mostly correct across the ten lessons, but the house plant naming, uncited numbers and unverified Sepasoft claims need fixing before ship, and mes-erp's cases-versus-EA mismatch and mes-track-trace's missing carton link and mass-balance check are the highest-value content gaps.
