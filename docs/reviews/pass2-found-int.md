## Persona

Senior controls project engineer at a CSIA-certified integrator. Work covers P&IDs, FDS writing, FAT/SAT, loop checks and alarm rationalization. Reviewed against docs/HOUSE_STANDARD.md and docs/FACTS.md. No FACTS violations found.

## Per-lesson findings

### found-control
- **[med, consistency]** "a pure P controller can only produce 45% if the error is 22.5%. It settles below setpoint." → At Kp 2.0 that steady state is PV 37.5%, which is below the 52% start. The same paragraph says "As the level rises, e shrinks", so the example contradicts itself. Fix: use a balance output between 0 and 16% (for example 14%, which gives e = 7 and PV = 53%). That also matches quiz 2 ("settles at 53%").
- **[med, missing]** No mention of controller action (direct or reverse, the sign of Kp) or of valve fail position (fail-open or fail-closed). Both are the usual cause of a loop that drives the wrong way on first commissioning. Fix: add a short paragraph and link it to the air-to-open or air-to-close check in {{lesson:int-commissioning}}.
- **[low, verify]** "Built into the Logix PID instructions and DCS blocks" → confirm anti-windup on the basic PID instruction, or keep the claim to PIDE.
- **[low, missing]** "usually 1 to 3 times the process time constant" is an uncited number (HOUSE §7). Fix: cite the source or say "check your tuning reference".

### found-jargon
- **[low, accuracy]** "Eight cards, plus the controller and power supply, fill a 12-slot chassis with room to grow." → 8 I/O cards plus the controller is 9 slots, and the power supply may or may not take a slot depending on the chassis. Use "fit" and "verify slot layout for the chassis".
- **[low, missing]** Counting example ignores spare. The same site's {{lesson:found-pid-docs}} makes 15 to 20 percent spare the rule. Fix: "The AO card has no spare" → at 15 percent spare, 8 AO points need 9.2 channels, so 2 AO cards. Say so.
- **[low, verify]** "Every term here is also in the glossary, and the app links them as you read other lessons." → keyTerms lists only 10 terms. Confirm glossary coverage or soften the claim.

### found-pid-docs
- **[med, consistency]** "you need 4 AI cards, 3 AO cards, 6 DI cards and 3 DO cards, plus spare capacity." → The lesson's own 15 percent rule is not applied. 180 DI on 32-channel cards is 6 cards (192 channels, 6.7 percent spare). With 15 percent spare the counts are 5 AI (64 becomes 74), 4 AO (24 becomes 28), 7 DI (180 becomes 207) and 4 DO (90 becomes 104). Fix: show the spare-adjusted counts.
- **[med, consistency]** Table mixes "P101-RUN" and "P101-FLT" with "FT-101", "FV-101" and "LSH-310" in one example. HOUSE §2 says controls tags have no separator. Fix: state once that drawings keep the hyphen (FT-101) and the tag database uses FT101. See Cross-lesson item 1.
- **[low, verify]** "| Diamond in a square | PLC or other programmable logic function |" → confirm against the ISA-5.1 legend convention. Diamond placement is a site convention as much as a standard.
- **[low, clarity]** Quiz 2 explain: "Correct. A shared number across different first and succeeding letters indicates the transmitter, controller and valve of one loop." → "Correct. The shared loop number ties FT, FIC and FV to one loop, whatever their letters."

### found-roles
- **[med, consistency]** "The higher tiers require staff holding Ignition certifications (Core, then Gold)." → {{lesson:int-career}} says Credentialed needs only an Inductive University credential, which is not a certification. Fix: "Credentialed needs an IU credential, Certified needs Core, Gold needs a Gold-certified employee plus a sales threshold."
- **[low, verify]** Tier names and "free to join" → verify on the current Integrator Program page. Tier requirements change.
- **[low, verify]** "CSIA ... founded in 1994" → verify date.

### int-alarm-mgmt
- **[med, accuracy]** Worksheet row "| PAL-1004 | LT-100 bad quality | Control blind, level unknown | 10 min |" → PAL is a pressure alarm low by ISA-5.1 letters, and 1004 does not match loop 100. Fix: use a quality-alarm name that the alarm philosophy defines, tied to LT-100 (for example "LT-100 quality bad" with the agreed tag). The same tag is copied into {{lesson:int-fds}}.
- **[med, missing]** "it removes 30 to 60 percent of alarms on many sites with no loss of protection (a commonly reported range, not a promise)" → uncited specific number (HOUSE §7). Fix: cite the source or remove the figure.
- **[low, verify]** "one that repeats three or more times in one minute" → verify the chattering definition against ISA-18.2 or EEMUA 191 before keeping the number.
- **[low, verify]** "roughly 80/15/5 split ... guidance such as the ISA-18.2 technical reports and many owners' philosophies" → name the source. EEMUA 191 is cited elsewhere in this lesson.

### int-career
- **[med, verify]** "Listed at about 350 USD; must be completed within 30 days of purchase"; "Typically 16 to 40 hours of work; submit within 6 months"; "Certifications last three years" → uncited specifics (HOUSE §7). Fix: cite the testing page or say "check the current testing page". The same applies to "175 questions over four hours" and "about five to ten years" (CAP), and "roughly 85 questions" and "about nine and a half hours" (PE). Verify each.
- **[low, accuracy]** "Both are experience-based with no formal application form" → CAP is an exam plus an experience requirement. Reword (verify).
- **[low, clarity]** Quiz 4 explain: "Correct. Gold needs a Gold-certified employee plus sales since joining." → "since joining" is unclear. State the sales period and cite it, or say "check the current tier rules".

### int-commissioning
- **[med, accuracy]** "injecting 17.6 mA (86 psi) raises" → (17.6 - 4) / 16 × 100 = 85.0 psi, not 86. 86 psi needs 17.76 mA. Also 85 psi is the alarm setpoint, so 17.6 mA sits exactly on the threshold. Fix: inject 17.76 mA for 86 psi.
- **[med, quiz]** Quiz 1: "At 4 mA it shows 1.2 in and at 20 mA it shows 120.0 in." → The errors are +1.2 at 4 mA and 12 mA but 0 at 20 mA. That is neither a constant zero offset nor a span error, so the question's diagnosis does not follow from the data. Fix: make the 20 mA reading 121.2 in (constant offset). Change the correct option to "A zero offset of about 1.2 in, constant across the range, so check the transmitter zero or the scaling constants".
- **[med, consistency]** "HS-101 (start) toggles `P101.Cmd.StartPB`" and "`P101.Sts.OverloadOK`" → HOUSE §2 UDT_MotorCmd has `Start`, and the overload status is `Alm.Overload`. Fix: use `P101.Cmd.Start` and `P101.Alm.Overload`.
- **[low, verify]** Example "the analog module was configured for 0-20 mA while the scaling assumed a 4-20 mA range" → the arithmetic does not reproduce 0.5 in. With HOUSE §5 counts, 4 mA on a 0-20 mA module lands near 1.5 in. Show the numbers or change the example.
- **[low, consistency]** Quiz 2 explain: "A 4-20 mA signal drops below 4 mA on a broken wire" → HOUSE §5 (NE43) puts the fault limit below 3.6 mA and indeterminate at 3.6 to 3.8 mA. Use those thresholds.
- **[low, consistency]** Code sample `paths = ["[Plant]Area1/Tank1/LT101/Value", ...]` → HOUSE §2 uses `[default]Plant1/Area10/Line1/M101/Sts/Running`. Align the sample path with the house format. The I/O table in the same lesson uses "LT-101", which is the hyphen issue in Cross-lesson item 1.
- **[low, verify]** "persist across power cycles in many configurations" → verify for the Logix version you target.
- **[low, verify]** "In Ignition 8.3 the tag diagnostics view shows each alarm's last state and a count of live events" → verify the view and field names.

### int-fds
- **[med, consistency]** Sequence table: "| 20 Heat | Open steam valve per TIC-200 | TT-200 at or above 60 C for 30 s | 30 |" → only 10 Fill has a timeout. The text says "Every state needs an exit for the unhappy path", and the table breaks that rule for states 20, 30 and 40. Fix: add timeout or over-temperature fault rows for Heat, Hold and Drain.
- **[med, accuracy]** "| PAL-1004 | LT-100 bad quality | Quality not good | 3 s | High |" → same issue as {{lesson:int-alarm-mgmt}}. Use the agreed quality-alarm name.
- **[low, missing]** "**4.2.5 Failure behavior.** If LT-100 has bad quality, P-101 shall stop" → covers only bad quality. Add power loss, communication loss and the fail position of XV-101 and the steam valve. The brief for this lesson asks for "what happens on Stop, Hold and power loss".

### int-naming
- **[high, accuracy]** "`^[A-Z]{1,4}[0-9]{3}[A-Za-z0-9]*$` ... while `P101_Pump` and `PT101_Disch` pass" → They do not pass. The character class has no underscore, so `P101_Pump` fails. Fix: `^[A-Z]{1,4}[0-9]{3}(_[A-Za-z0-9]+)?$`.
- **[high, consistency]** Worked example "`Acme/Chicago/Mixing/Line1/P101_Pump`", "`[Plant]Chicago/Mixing/Line1/P101_Pump/Sts/Running`" and "`acme/chicago/mixing/line1/p101_pump/sts/running`" → HOUSE §1 and §2 define the reference enterprise as Meridian Foods, Plant 1 (Chicago), with `[default]Plant1/Area10/Line1/M101/Sts/Running` and `meridian/plant1/area10/line1/m101/sts/running`. Fix: rebase the worked example on the house names, or state in one sentence that this is a deliberate variant.
- **[med, consistency]** "| PLC tags and UDT members | PascalCase, underscore only as area separator | `P101_Pump`, `Sts.Running` |" → the same lesson uses `P101_Pump`, `Cfg.RunTimeout_s` and `Cfg.RangeHi_psi`. Those underscores are not area separators, and HOUSE §2 allows underscores only after a prefix or between an area and a name. Fix: drop the role-word underscore (`P101`, `PT101`) or amend the rule.
- **[med, consistency]** UDT members `Sts.Faulted` and `Cfg.RunTimeout_s` → HOUSE §2 uses `Sts.Fault` and `Cfg.StartDelay`. Use the house vocabulary or say that this project differs.
- **[low, verify]** "The 8.3 manual notes that tag names are free-form, must start with a letter or underscore and stay under 256 characters" → verify the figure against the 8.3 manual. HOUSE §7 bars uncited numbers.

### int-standards
- **[low, clarity]** Quiz 3 explain: "ISA-5.1 letters describe the measured variable and function, not the meaning in this guess." and two options both explained only as "Not an ISA-5.1 reading." → Give each distractor a reason. For example, "Field instrument cabinet: ISA-5.1 letters describe function, not a cabinet."
- **[low, consistency]** "many integrators mirror it as `Plant/Area2/TIC_210A`" → underscore before the loop number breaks the HOUSE §2 rule. Also "hyphens do not work well in some tag paths" needs a verify tag.
- **[low, verify]** IEC 61131-3 "instruction list (deprecated in later editions)" → verify the edition in which IL was removed.

## Cross-lesson issues

1. **[high, consistency] Tag format conflicts with HOUSE §2.** HOUSE §2 says equipment tags are uppercase with no separator (`M101`, `LT101`). Hyphenated tags (`FT-101`, `LT-101`, `P-101`, `LAHH-100`, `PAL-1004`, `TIC-200`) appear in found-control, found-jargon, found-pid-docs, int-alarm-mgmt, int-commissioning, int-fds, int-naming and int-standards. int-commissioning mixes both forms in one lesson. Fix: decide once. Either add a HOUSE §2 line that drawings keep the hyphen and controls use no separator, with a mapping example, or change the house rule. Then apply it everywhere.
2. **[high, consistency] Enterprise, site and Ignition names differ from the reference plant.** int-naming uses "Acme", "Chicago" and `[Plant]` as provider. int-commissioning uses `[Plant]Area1/Tank1`. HOUSE §1 and §2 use Meridian Foods Plant 1, `Area10`, `Line1` and `[default]Plant1/Area10/Line1/M101`. Fix: align the examples with the house names.
3. **[med, consistency] UDT member names and underscore rule.** `Cmd.StartPB`, `Sts.OverloadOK`, `Sts.Faulted`, `Cfg.RunTimeout_s`, `P101_Ctl` and `TIC_210A` all differ from HOUSE §2 (`Cmd.Start`, `Alm.Overload`, `Sts.Fault`, `Cfg.StartDelay`). Underscores appear mid-name where the house rule does not allow them. Fix: one vocabulary, taken from HOUSE §2, used in every lesson.
4. **[high, accuracy] Alarm tag PAL-1004 is wrong in two lessons.** PAL is a pressure alarm low, but it is used for LT-100 quality in int-alarm-mgmt and int-fds, and the number does not match loop 100. Fix: one agreed quality-alarm name in both lessons.
5. **[med, consistency] Integrator tier requirements.** found-roles says higher tiers need "Ignition certifications". int-career says Credentialed needs only an IU credential. Fix: align found-roles to int-career.
6. **[med, verify] Uncited specific numbers (HOUSE §7).** int-career has prices, time limits, question counts and durations. int-alarm-mgmt has "30 to 60 percent". int-naming has "256 characters". found-control has lambda "1 to 3 times". Each needs a cited source or a "check the manual" pointer.
7. **[low, clarity] Garbled quiz explanations.** found-pid-docs quiz 2 and int-standards quiz 3 have explanations that do not explain the distractors. Rewrite as in the per-lesson items above.
8. **[info] FACTS check.** int-commissioning uses `qv.quality.isGood()`, consistent with FACTS 2. int-alarm-mgmt uses `system.alarm.*`, which the FACTS do not contradict. No lesson uses a deprecated 8.3 call or the number 192.

## One-line verdict

Technically sound and well taught. Before merge, fix the house-standard naming conflicts (tags, UDT members, Acme/Chicago, PAL-1004), the regex and psi/mA arithmetic errors in int-naming and int-commissioning, and the quiz data in int-commissioning.
