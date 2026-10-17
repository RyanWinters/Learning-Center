## Persona
Retail worker just hired as a junior plant technician; never seen a PLC, has no idea what a subnet or SQL is, and quits when a screen is a wall of text.

## What works
- Opening analogies land for a total beginner: the toy-train story in found-history eli5, the restaurant kitchen in found-purdue, the flashlight for 4-20 mA in found-signals, and the street-and-house picture for IP in net-ip.
- Quiz feedback after answering is clear: a red "NOT QUITE" block, a green "THE ANSWER IS D", and tick/cross marks on the options (m-quiz-answered.png).
- Tapping an underlined term opens a glossary sheet with a plain definition, an ELI5 button and a "Learn it in" link (m-popover.png). This is the best beginner feature I saw.
- The sim lab says "Stop (NC) ... NC: reads 1 at rest" and limits the palette to the instructions needed, so I know what to use (m-sim.png).
- Quiz explanations for wrong answers say why they are wrong (found-history, plc-ladder-basics, db-sql-select), which teaches more than the right answer alone.

## Problems
1. **[severity: high] [area: ui]** Home screen (m-home.png): the "CONTINUE - T3 Timers" banner and the "Up next" items say "JUMP IN AT T1 (SKIPS INTRO LESSON)" while the same rows show LOCKED. A new user is told to continue a lesson they cannot open yet. Fix: show only unlocked items as Continue/Jump in, and name the intro lesson the jump skips.
2. **[severity: high] [area: content]** plc-ladder-basics eli5: the door analogy never maps a door to XIC, XIO or OTE. The sentence about "the hinge breaks, the alarm triggers" is a non sequitur. Fix: one short sentence per instruction, for example "XIC = a door that is open only when the bit is 1", followed by a single rung picture.
3. **[severity: high] [area: sim]** sim-xic-ote brief: the example "XIC(Sensor)OTE(Light);" uses tags that do not exist in this challenge. The real tags are LampTest and PilotLamp, and the solution is XIC(LampTest)OTE(PilotLamp);. A beginner who copies the example fails. Fix: use the real tag names in the example, or say "your tags will be...".
4. **[severity: high] [area: accuracy]** net-ip eli5 says "one house number on every street is always held back". The body and quiz say two addresses are reserved (network and broadcast). Also "a bigger ruler (a shorter mask)" is ambiguous. Fix: say two, and give a /24 example in the eli5 with the numbers spelled out.
5. **[severity: med] [area: content]** net-ip body opening (the first two paragraphs): "identifies a device at layer 3", "bitwise AND", "ARP", "MAC address" appear before any example. The quiz then asks about /26 host counts. Fix: start with one real address (10.20.10.15) and a plain "/24 = first 24 bits are the street" line before any jargon.
6. **[severity: med] [area: content]** plc-ladder-basics quiz 2 option "[XIC(Start) ,XIC(Jog)] OTE(Motor)" uses bracket and comma notation that is never introduced. Quiz 3 says "24 V" and "normally closed" without a definition on the same screen. Fix: show each option as a drawn rung, and add a short definition under the question.
7. **[severity: med] [area: ui]** Timers lesson, RTO diagram (m-plc-timers-0.png): the "PRESET 360000" value and the "Retentive Timer" title are clipped at the right edge. The sim lab rung toolbar (m-sim.png) clips the "EDIT" button the same way. Fix: scale or wrap the SVG and toolbar to 390px.
8. **[severity: med] [area: content]** db-sql-select body: "two integers divide as integers (45 / 60 gives 0)", "Named Query", and SQL Server vs PostgreSQL dialect talk are all new to a beginner. The lesson depends on {{lesson:db-intro}} without a visible reminder. Quiz 3 (a row at 23:59:59.500) is too obscure for a first SQL lesson. Fix: move dialect and integer-division detail to "why", and keep the quiz to SELECT, WHERE and NULL.
9. **[severity: med] [area: content]** found-signals "why" section: "AOI or UDT", "2-wire electronics", "resolution" and "calibrator" appear with no definition. Quiz 2 needs (8 - 4) / 16 = 25%, but the body never shows a worked example with numbers. Fix: add one worked 4-20 mA example in the body with each step written out.
10. **[severity: low] [area: content]** Timers quiz 1 (m-quiz-answered.png): "PRE = 4000" has no unit, and the explanation "DN never sets" uses PRE, DN and ACC with no on-screen definition. Fix: write "PRE = 4000 ms (the preset)" and link DN and ACC to the glossary.

## Missing
- A "first week" path that explains a PLC scan, a tag and a bit in plain words before ladder. plc-scan and plc-tags are prerequisites but show as locked from home.
- Acronym expansion on first use for PLC, HMI, SCADA, MES, ERP, DMZ, PID. The glossary sheet helps only if I think to tap it.
- Basic electrical and machine safety (lockout/tagout, never touching live panels). A new plant technician expects this first, and I did not find it in these lessons.
- Real photos or simple pictures of a PLC, an HMI panel and a cabinet, so I can match the diagrams to the equipment on my first day.
- Lessons that are roughly 17 to 20 KB of body text. On a phone they read as a wall, and I could not see a "you can stop here" marker.

## One-line verdict
The analogies and quiz feedback are beginner-friendly, but the first screens and sim brief use tags and jargon I have not been taught, so I would quit at the first locked "Jump in" or copied example.
