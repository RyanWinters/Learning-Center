## Persona

Senior Allen-Bradley programmer, 12 years on Studio 5000 and ControlLogix, trains new hires. Picky about Logix semantics (scan, task, instruction behavior, fault types) and about terminology (Logix names, not generic PLC names). Checked against docs/HOUSE_STANDARD.md and docs/FACTS.md. Items marked (verify) need a check against the Logix instruction reference or the Studio 5000 help for the target version before publishing.

## Per-lesson findings

### plc-studio
- **[med accuracy]** "The change takes effect when you *Accept* and *Finalize* it, often mid-scan." → Studio 5000 online-edit steps are labelled Test Edits, Apply/Accept Test Edits and Cancel Edits. "Finalize" is not the on-screen term (verify). Fix: use the labels from the online-edit dialog for the version the course targets.
- **[med missing]** No mention of forces anywhere in the lesson. → Add a short section: a force overrides the logic and the input or output image, the "Forces Installed" indicator shows it, forces must be removed before handing the machine back, and force enable/disable is a controller-level setting (verify). Forces are the trap that most often bites a new hire.
- **[low accuracy]** "CompactLogix 5380 has a mode switch in the same style, and some models replace the physical key with a software setting." → (verify) Keep only what the 5380 models actually have.
- **[low accuracy]** "May lack comments or full structure" (Upload row) → (verify) Say what is really lost on upload, or which items must be checked against the offline file.

### plc-scan
- **[high consistency]** "Rule of thumb for the RPI: the I/O's reaction time is about twice the RPI plus the task scan." → Contradicts the worked example at the bottom: "filter (1 ms) + RPI (20 ms) + scan (15 ms) = 36 ms". The rule gives 55 ms. Fix: delete the 2x rule (it is also an uncited number, which HOUSE §7 bans) and keep the worst-case sum from the earlier passage ("input filter time + one full scan + the output delay").
- **[low accuracy]** "Logix Designer shows it in *Task Properties* under the *Monitor* tab, with last, maximum and average values." → (verify) Drop "average" unless the Monitor tab shows it.
- **[low accuracy]** "The default RPI for a digital input card is often 20 ms." → (verify) Say "check the module's default in its properties", or cite it.
- **[low accuracy]** "Outputs are written to the module at the end of a task's scan and at the module's RPI." → (verify) This is the only sentence on output timing; confirm it before the lesson teaches it.

### plc-tags
- **[med accuracy]** "`Local:1:I.Data        inputs of the module in slot 1 (a DINT, one bit per point)`" → The Data member size depends on the module. A 16-point card such as the 1756-IB16 is INT, and a 32-point card is DINT (verify). Fix: "INT for a 16-point card, DINT for 32-point (verify against the module profile)". The example's "16-point input card" makes this worse.
- **[med consistency]** "A tag named `Pump1` of type `Motor`" → HOUSE §2 names UDTs `UDT_Motor` with an underscore after the prefix. Fix: `M101` of type `UDT_Motor`, or say the names are illustrative.
- **[low accuracy]** "Descriptions (up to 512 characters) are stored with the tag and **appear in the ladder editor** next to every instruction that uses it" → (verify) Descriptions show on demand or as tooltips, not next to every instruction. Soften.
- **[low accuracy]** "Descriptions (up to 512 characters)" → (verify) limit.

### plc-oneshots
- **[med accuracy]** Note block: "Some Rockwell safety documentation swaps the words 'rising' and 'falling' for OSR and OSF. In the general-purpose Logix instruction set, OSR is the rising edge..." → I know of no such swap, and the note is unsourced. Fix: delete the note. If it stays, cite the document and version.
- **[med clarity]** Example "Release detection for a jog": "`XIC(Jog_PB) OSR(Jog_OS,Jog_Start)` stores the start time on the pulse" → An OSR only produces a pulse and stores no time. Fix: add the timestamp instruction (GSV to WallClockTime or a time tag) on the pulse rung, or reword.
- **[med terminology]** "use an input with a fast filter or an interrupt task for high-speed signals" → Logix has no "interrupt task". Say "a periodic task (or an event task for a defined trigger)". The same term appears in plc-counters.
- **[low accuracy]** history: "The ONS, OSR and OSF family carried through from the PLC-5 and SLC 500 platforms" → (verify) Confirm which of the three existed on PLC-5 and SLC 500.

### plc-counters
- **[high accuracy]** "CTD sets DN when ACC is greater than or equal to PRE, the same test as CTU, so a stock counter that counts down toward zero is usually tested with a compare against ACC rather than with DN" → (verify) My understanding of the Logix reference is that CTD's DN is the reverse test (ACC less than or equal to PRE). If so, `CTD(Bin_Stock,0,0)` has DN on from the first scan. Fix: state the CTD DN test as the instruction reference gives it, and keep the advice to compare ACC directly.
- **[high consistency]** Car-park example: "`XIC(Cars.DN) OTE(Lot_Full_Sign)`" → Cars is one tag shared by a CTU and a CTD, both with PRE 100. Whose DN test wins depends on the CTD test above. Fix: drive the sign from `GEQ(Cars.ACC,100)`. That is also more readable for new hires.
- **[med accuracy]** Missed-pulse example: "Adding a TON 'stretcher' in the sensor wiring or an input filter change does not, because the pulse is too short to begin with." → Wrong as stated. A hardware pulse stretcher in the sensor wiring does help. A PLC-side timer does not help, because the scan still has to see the pulse. Fix: separate the two cases.
- **[med terminology]** "Moving the count to an interrupt task or a fast input solves it." → Say "periodic task (for example 5 ms)".
- **[med accuracy]** "Power cycle, Run/Program switch | Held (retentive)" → (verify) Whether a counter's ACC survives a power cycle depends on the controller's nonvolatile memory and load settings. Do not present it as a fixed table fact without a check.
- **[low accuracy]** "If CTU passes the upper limit, it wraps to −2,147,483,648 and sets `.OV`." → (verify)

### plc-compare-math
- **[high consistency]** `LIM(1,Recipe_Sel,10) COP(Recipes[Recipe_Sel],Active_Recipe,1)` with `EQU(Recipe_Sel,1) COP(Recipes[1],...)` → Recipes 1 to 10 in a zero-based array needs 11 elements. plc-tags says exactly that ("make the array 11 long"). Fix: state the array size, or index `Recipes[Recipe_Sel - 1]` with `LIM(1,Recipe_Sel,10)`, so the two lessons agree.
- **[high consistency]** Scaling example: "A transmitter gives raw counts 4000 to 20000 for 0 to 100 percent." → HOUSE §5 teaching card is 0–21 mA ↔ 0–32,767 counts, with 4 mA = 6,242 and 20 mA = 31,208. This lesson does not say it is deliberately different. Fix: use the house numbers, or add the one-sentence exception the house rule requires.
- **[med accuracy]** "for integers it is a fault condition, and for REALs it produces infinity or not-a-number, which then poisons every calculation" → (verify) Logix divide-by-zero behavior (flags, minor or major fault, and the REAL result) must be checked before it is stated.
- **[med accuracy]** "Dividing a DINT sum by 10 into a DINT would round the average to a whole number." → The text earlier says REAL to DINT rounds. Integer DIV truncation or rounding is a separate question (verify). Show the result, or do not claim it.
- **[low accuracy]** "In newer versions the editor may show shorter names such as EQ, GT or LE for some of these, and MOVE for MOV." → (verify) Remove unless confirmed. A new hire who sees "MOVE" in an editor will ask why.
- **[low clarity]** "Integer division loses the fraction ... Test `7 / 2` in the emulator" → Good advice. Add what Logix actually returns for 7 / 2 (verify).

### plc-organization
- **[med consistency]** "commonly 32 on ControlLogix 5580 and CompactLogix 5380" → An uncited number (HOUSE §7). Cite it or say "check the controller manual for the task limit".
- **[med accuracy]** "Use the program-parameter and produced-tag mechanisms, or copy a whole structure at a controlled point" → Program parameters and produced tags do not make a multi-word copy atomic, and a higher-priority task can still interrupt the copy. Fix: name the real protections. Examples: write the staging structure, then set a valid or sequence flag last; or copy inside one task.
- **[med consistency]** Layout block: "Data types: Motor, Valve, AnalogIn, PID_Loop" → HOUSE §2 requires `UDT_` for UDTs (`AOI_` is already used correctly further down). Fix: `UDT_Motor`, `UDT_Valve`, `UDT_AnalogIn`, `UDT_PID_Loop`.
- **[low accuracy]** "If the task takes 12 ms to execute, it uses 12 percent of the CPU." → Only 12 percent of that task's period, not of the CPU. Reword.
- **[low missing]** The layout omits the Line level that HOUSE §1 puts in the hierarchy (Enterprise → Site → Area → Line → Equipment). Low priority, since the lesson is about Logix programs, but say so in one sentence.

### plc-languages
- **[high accuracy]** Quiz 3, explain for the correct option: "Nothing can set Done while this task is stuck in the loop." → Wrong if the setter is a higher-priority periodic task. That task preempts the continuous task, sets Done, and the loop can exit. Fix: "Only a higher-priority task can preempt the loop and set Done. A lower-priority or continuous setter never runs while the loop spins."
- **[med consistency]** `[XIC(Start) ,XIC(Motor)] XIC(Stop_NC) XIO(Fault) OTE(Motor)` and `Motor := (Start OR Motor) AND Stop_NC AND NOT Fault;` → HOUSE §6 says seal-ins seal on a command bit (`M101_RunCmd`) or an auxiliary contact, and that a note must explain any rung that seals on the output. This lesson seals on the output with no note. Fix: seal on a command bit, or add the one-sentence teaching-rung note.
- **[low accuracy]** history: "Allen-Bradley added ST, FBD and SFC to RSLogix 5000 alongside ladder at the start of the Logix platform." → (verify) ST arrived in a later RSLogix 5000 release. Drop "at the start" unless confirmed.
- **[low clarity]** "Timers and counters are called as instructions: `TON(MyTimer);`" → Fine. Consider one line that the preset is set in the tag first, to match the counter lesson.

### plc-faults
- **[high accuracy/consistency]** Pseudo-code: "GSV Program <this program> MajorFaultRecord -> MajorFaultRecord" and "SSV Program <this program> MajorFaultRecord" → The table two sections earlier puts MajorFaultRecord under class `FaultLog`, not `Program`, and `<this program>` is not Logix syntax (the instance is `THIS` or blank). Fix: use the class and instance from the table, or label the block clearly as pseudo-code and verify the real GSV/SSV form for the fault record before publishing.
- **[med consistency]** Table row "Read the clock | `WallClockTime` | `THIS` | `LocalDateTime`" vs example "`GSV(WallClockTime, ,LocalDateTime, Clk[0])`" → The example leaves the instance blank. Make them match.
- **[med accuracy]** "A GSV to a bad attribute logs a minor fault and leaves the destination unchanged" → (verify)
- **[med accuracy]** "Clearing means the controller returns to executing the next rung, not the instruction that faulted." → (verify) Confirm how the fault routine resumes before teaching it.
- **[low accuracy]** "(the key switch shows a red OK light)" → The red light is the controller's status indicator, not the key switch. Reword.
- **[low accuracy]** Minor table: "battery low" listed as a minor fault example → (verify)
- **[low missing]** The lesson says each program can have a fault routine but never says where to enable it (program properties). Add one sentence with the property name (verify).

### plc-isa88-packml
- **[high consistency]** "| Site | The Dayton plant | Business systems |" and "| Area | Bulk liquids |" → HOUSE §1 reference plant is Meridian Foods, Plant 1 (Chicago), with Area10 Batching and Area20 Packaging. Fix: use Meridian Plant 1 or add the one-sentence exception.
- **[med consistency]** AOI and UDT names: "`PackML_Unit`", "`Valve_2Pos` AOI", "`Motor_VFD`", "`Xfer_Pump`", "`Xfer_Skid`" → HOUSE §2 uses `UDT_` and `AOI_` prefixes. Fix: `UDT_PackML_Unit`, `AOI_Valve_2Pos`, `AOI_Motor_VFD`, and so on.
- **[med accuracy]** Group table: "Stop | Stopping | acting" and "Start up | Stopped, Idle | waiting" → Stopped is placed in the Start up group but is the end state of Stopping. Move it to the Stop group, or note the grouping (verify against the PackML state diagram).
- **[low accuracy]** "revised in 2015 with a minimum set of PackTags and states, and again in 2022" → (verify)
- **[low accuracy]** "Modes ... Clean-in-place or Setup in some definitions" → (verify) If not in the target version of the standard, drop it.
- Positive: the 17 state numbers in the StateCurrent list match the FACTS #8 numbering. The PackTag names (Cmd, Status, Admin, StopReason, ProdProcessedCount) are correct.

### plc-other-vendors
- **[med accuracy]** Quiz 4 explain: "The standard does not define a common file format for whole projects or hardware configuration." → IEC 61131-10 (PLCopen XML) does define an exchange format, for program organization units only. Fix: "PLCopen XML exchanges program units. Hardware configuration, tags and project settings do not move between vendors" (verify).
- **[low consistency]** Worked example "an S7-1200 at 192.168.10.20" → The house IP plan is 10.20.x for Plant 1. This skid is at another site, so say so in one sentence.
- **[low accuracy]** "Cleanest option on S7-1500 with an OPC UA license enabled" → (verify) licensing wording.
- **[low accuracy]** "For the classic Siemens driver to read an S7-1200/1500 data block, the DB must be a global block with optimized access turned off..." → (verify) against the Ignition 8.3 Siemens driver page.
- Positive: the OB, FB, FC and DB mapping to Logix (task, AOI, routine, UDT) is sound. Quiz answers 0 to 4 match their explain arrays.

## Cross-lesson issues

1. **Terminology: "interrupt task".** plc-oneshots ("an interrupt task for high-speed signals") and plc-counters ("Moving the count to an interrupt task") say it. plc-scan's "interrupts lower priority tasks" is acceptable prose. Logix uses continuous, periodic and event tasks. Standardise on "periodic task" or "event task".
2. **Reaction-time arithmetic.** plc-scan's "twice the RPI plus the task scan" rule contradicts its own worked example (36 ms vs 55 ms). Delete the rule everywhere it appears.
3. **Recipe indexing.** plc-tags says a 1-to-10 index needs an 11-element array. plc-compare-math uses `Recipes[Recipe_Sel]` with `LIM(1,...,10)` and no array size. Make the two agree.
4. **Analog scale.** plc-compare-math uses 4000–20000 counts for 4–20 mA. HOUSE §5 says 6,242–31,208 (0–21 mA, 0–32,767). Use the house scale, or state the exception.
5. **Seal-in rule.** plc-languages seals on the output with no note. HOUSE §6 forbids that without a note. Check the other seal-ins in the track, including plc-oneshots' toggle (which uses Run_Cmd and is fine).
6. **UDT and AOI naming.** HOUSE §2 uses `UDT_` and `AOI_` prefixes. plc-organization (Data types block), plc-tags ("type `Motor`"), and plc-isa88-packml (`Valve_2Pos`, `Motor_VFD`, `Xfer_Pump`, `PackML_Unit`) do not. plc-organization's AOI_Motor line is correct.
7. **Reference plant.** plc-isa88-packml uses "The Dayton plant" and a generic bulk-liquids area. HOUSE §1 names Meridian Foods Plant 1 (Chicago) and Area10 Batching.
8. **Counter DN semantics** (plc-counters) is an unverified claim that the car-park and stock-counter examples depend on. Resolve it once, in plc-counters, and keep the other lessons consistent with it.
9. **Forces are not covered in the track.** Only plc-studio is the natural home, and it does not mention them. Add a short forces passage there, since forces are the most common cause of a "the logic is right but the output is wrong" call.
10. **Fault-record access.** plc-faults' pseudo-code and its own table disagree on the GSV class. Fix once in plc-faults. No other lesson in the group repeats it.
11. **Quiz-explain accuracy on preemption.** plc-languages Q3 and plc-organization's torn-data fix both depend on what a higher-priority task can do to a lower one. Make the two lessons say the same thing.
12. **Verified and consistent.** Major fault type 4 code 20 (array subscript) and type 6 (watchdog) match FACTS #8 in plc-scan, plc-tags, plc-compare-math and plc-faults. The DINT overflow arithmetic (24.8 days at 1,000 counts per second) and the REAL 16,777,216 limit are correct. All lesson references in these 11 files resolve to existing lesson ids.

## One-line verdict

Sound Logix core and clear teaching, but fix before release: the CTD DN and RPI-rule errors, the GSV/fault-record pseudo-code, the wrong quiz explanation in plc-languages, and the house-standard breaches (plant, analog scale, seal-in, UDT/AOI prefixes).
