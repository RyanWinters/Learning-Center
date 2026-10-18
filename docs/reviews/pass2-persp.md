# Pass 2 review: persp track (8 lessons)

Lessons: persp-containers, persp-embedding, persp-navigation, persp-events, persp-styles, persp-mobile, persp-charts, persp-performance.
Standards applied: docs/HOUSE_STANDARD.md, docs/FACTS.md. Cross-checked against persp-library.js, persp-bindings.js, db-project.js, ign-scripting.js.

## Persona

Process control engineer who builds Ignition Perspective HMIs every day and owns this app. Wants expert depth: exact function signatures, failure modes, cost reasoning, and the sharp edges a site audit finds. Finds the basics (what a flex container is, what a session is, binding vs script) too elementary, and the eli5 and history blocks are noise for this reader. Checked every quiz: answer indices point at the correct option in all 8 lessons, and every explain array has four entries aligned to its options.

## Per-lesson findings

### persp-containers
- **[med] [accuracy]** "Column container ... three breakpoints ... each with a minimum viewport width" versus "A breakpoint container ... shows one set based on the container's own width" → Two breakpoint models sit side by side with different width sources. State which width each uses and cite the 8.3 container palette page (verify).
- **[med] [consistency]** "Touch targets under about 40 px are hard to hit with gloves." → persp-mobile says "at least about 48 px square." Pick one value, tie it to a source or say "your site's glove spec." HOUSE §7 bars uncited numbers.
- **[low] [accuracy]** "At 1920 px that is six per line, on a tablet three, on a phone one." (repeated in quiz q3) → A 300 px basis gives two tiles on a 768 px tablet. Three needs roughly 900 px plus gaps. Name the tablet width or drop the tablet figure.
- **[med] [missing]** Advanced section candidate: the flex min-size trap. A long tag name inside a flex child will not shrink below its content, so a header label pushes the Acknowledge button off screen. Cover how to stop it (min-width, overflow and shrink settings as Perspective exposes them, verify) and how faceplates should truncate long UDT names.
- **[low] [clarity]** The eli5 and history blocks are beginner material for this owner. Collapse by default on the persp track.

### persp-embedding
- **[med] [consistency]** Worked example: `motorPath = [default]Plant1/Area2/Pump1`, UDT members `Run`, `Speed`, `Fault`, `Config/Name`. → HOUSE §2 and §3 require `[default]Plant1/Area10/Line1/M101`, a faceplate param named `tagPath`, and `UDT_Motor` members `Cmd`, `Sts`, `Cfg`, `Alm` (`Sts/Running`, `Sts/Speed`, `Sts/Fault`, `Cfg/Description`). Rewrite the example to match. Same drift in persp-bindings, persp-views, persp-library and persp-mobile (see Cross-lesson).
- **[med] [accuracy]** `"propConfig": { "params.motorPath": { "paramDirection": "input", "persistent": true } }` and the `references` JSON. → Structure looks plausible but I did not check it against an exported 8.3 view.json. Mark (verify) or replace with an export.
- **[low] [clarity]** Worked example title "Renaming a param safely" describes a breakage: "every tile goes blank at once." → Retitle "Renaming a param breaks every embedder," then give the safe sequence.
- **[med] [missing]** Advanced section candidate: what forces a repeater instance to rebuild (keys, ordering, reference identity), what `persistent` changes, round-trip timing of in/out params, the per-instance cost of `onStartup` scripts, and paging for lists over about 50 items. The claim "keep the instance objects stable ... so Perspective can reuse instances" is asserted without a mechanism (verify).

### persp-navigation
- **[high] [accuracy]** `system.perspective.openPopup(id="motor-" + ..., viewPath="Faceplates/Motor", ...)` and the quick-reference line `openPopup(id=tagPath, viewPath="Faceplates/Motor", ...)`. → The second parameter is `view`, not `viewPath`. persp-library.js and persp-mobile.js both pass it positionally, which is correct. Fix both occurrences to `openPopup(id, view, params=..., ...)`. Verify against the 8.3 page in the resources list before publishing.
- **[med] [accuracy]** "If you pass several arguments, `page` wins over `view`, which wins over `url`." and quiz q3 ("The page argument takes priority"). → I cannot confirm this precedence. The manual may treat them as mutually exclusive or raise an error. Verify, then rewrite the sentence and the quiz to match.
- **[med] [accuracy]** Dock "Display: visible, onDemand, or auto" and "Define docks in Shared Settings so they apply to every page." → Verify the exact 8.3 dock option names and where docks are defined.
- **[med] [accuracy]** Quiz q5 "Out-of-session calls need both IDs." → Verify that both `sessionId` and `pageId` are required for `navigate` and `openPopup`, since the quiz answer rests on it.
- **[med] [missing]** Advanced section candidate, and the most useful gap for this owner: role-gated navigation. Page visibility and access by `session.props.auth.user.roles`, what a bookmarked deep link does when the user lacks the role, how a gateway-side script finds `sessionId` and `pageId`, session timeout behavior on kiosks, and popup id collisions across pages.
- **[low] [consistency]** Alarm deep link uses `/area/L3` and `area = "L3"`. HOUSE §1 names areas `Area10` and `Area20`. Use `/area/Area10`.
- **[low] [accuracy]** "A refresh creates a new session" is stated as fact. Verify for 8.3 session behavior.
- **[low] [clarity]** The concierge eli5 and the history block add little for this reader.

### persp-events
- **[high] [accuracy]** `def valueChanged(self, previousValue, currentValue, origin, missedEvents):` and "The script receives `previousValue`, `currentValue`, `origin` and `missedEvents`." → The third argument is `initialChange` (boolean). db-project.js (line 243) uses that name. Fix the signature and the text. The startup guard then becomes `if initialChange: return`, which is cleaner than the null-check version shown.
- **[med] [accuracy]** "Session-level handlers ... are reached with `system.util.sendMessage`, not with the Perspective call." → ign-scripting.js (line 84) presents `system.util.sendMessage` as the cross-scope message call for handlers. Verify which call reaches Perspective session-scope handlers, then state it once and consistently with ign-scripting.
- **[med] [accuracy]** "Perspective forwards a few deliberately, as component events, over the websocket to the Gateway. That round trip is why events are not free: each one costs a network hop and a Gateway thread." → Many events and most bindings are handled in the client. Only scripts and Gateway-side actions incur the round trip. Tighten the claim, or cite the behavior (verify).
- **[low] [consistency]** Example 1 uses `"Level: " + toStr(round(...), 1)) + " %"` with `+`. The body recommends `concat` or `format`, and persp-performance uses single-quoted literals. Verify whether `+` concatenates in the expression language and use one form across the track.
- **[med] [missing]** Advanced section candidate: throttling high-rate events (a slider's onChange fires per pixel of drag), idempotent write actions (a double-click writes a setpoint twice), `invokeAsynchronous` error handling and feedback, and the property-change loop cases the lesson names but does not show with a working example.
- **[low] [clarity]** The three-mechanism table and the classroom eli5 are too basic for this owner.

### persp-styles
- **[med] [consistency]** "A small, strict set (around 20 to 40 for an HMI)." → Uncited number, which HOUSE §7 forbids. Remove it, or cite a source and say which.
- **[med] [accuracy]** Expression `if({[default]Pump1/Fault}, "hmi/pump fault", ...)`. → Path should follow HOUSE §2 (`P101`). The double-quoted string literals differ from persp-performance's single quotes. Verify the expression-language quoting rule and use it consistently.
- **[med] [accuracy]** "Built-in classes use an `IA_` prefix" and "Perspective adds a `psc-` prefix to project style classes in the page." → Quiz q4 and q5 depend on both facts. Verify both against the 8.3 Style Reference.
- **[low] [accuracy]** "8.3 supports creating custom themes by copying a bundled one or through the Gateway API." → Verify.
- **[med] [missing]** Advanced section candidate, and the right next step for this owner: theme tokens for an ISA-101 greyscale palette, dark mode switched by a session prop, how to type `var(--token)` into a class field and what the Designer previews, and a reproducible "one variable changes 800 components" demo. The current body stops at cascade basics.
- **[low] [clarity]** The school-uniform eli5 and the cascade diagram are beginner material. Collapse by default.

### persp-mobile
- **[high] [consistency]** "Put the phone and the Gateway on a private overlay ... The Gateway keeps its private address" offered as option 1, ahead of the DMZ proxy. → HOUSE §4: "No connection passes straight from Level 3 to Level 4 or back. Every connection ends in the DMZ," and "Never route vendor VPNs straight into VLAN 10." A mesh path that lands on the Gateway (VLAN 30) skips the DMZ. Make the DMZ reverse proxy (`10.20.250.10`, HTTPS 8043, with IdP) the default. Present mesh only as a documented, site-approved exception, and say so in the same paragraph as the warning.
- **[med] [consistency]** "Make tap targets at least about 48 px square." → Conflicts with persp-containers (40 px). Uncited (HOUSE §7). Align with the containers lesson and cite or attribute the number.
- **[med] [accuracy]** Barcode example: `def onBarcodeScanned(self, session, event):` with `event.value`. → The lesson admits the handler signature is on another page. Mark (verify) and keep the example. Change `Plant1/Area2/M101` to `Plant1/Area10/Line1/M101` (HOUSE §2).
- **[med] [accuracy]** "Sessions use the same tab for authentication flows, and Workstation connects only to Gateways of a supported version." → Unclear and unsourced. Verify or remove.
- **[low] [accuracy]** `system.perspective.workstation` scripting functions and the "Exit kiosk" action. → Verify the function names.
- **[med] [missing]** Advanced section candidate for this owner: IdP choice (Ignition IdP vs SAML or LDAP, and how roles map to pages), kiosk recovery after a Gateway restart, session timeout on Workstation, and device enrollment and revocation as a documented procedure. The touch and glove section is fine, but it is a checklist, not expert content.
- **[low] [clarity]** The eli5 and "why" blocks are too basic. The "Purdue level jump" warning is the most useful line in the lesson and should move up.

### persp-charts
- **[med] [accuracy]** "A positive return size means 'give me about this many rows', while zero lets the historian pick based on the logging rate, and -1 means raw values ... If you pass an explicit return size, interval arguments are ignored." → Verify against the 8.3 `queryRawPoints` and `queryAggregatedPoints` pages. The lesson cites no source for these three behaviors.
- **[med] [consistency]** Quiz q2 explanation: "Reduce on the server to roughly one row per pixel, using MinMax if spikes matter." → The sizing example in the body says MinMax returns two rows per slice (1,600 rows per pen for 800 px). Fix the explanation to "about one slice per pixel, two rows each with MinMax."
- **[low] [accuracy]** "The Power Chart ... does not trend string tags." → Verify.
- **[low] [accuracy]** Quiz q5 explanation: "Inclusive intervals at 'now' can add a window with no real data, which then draws wrongly." → Plausible but asserted. Tie it to the binding's range setting (verify).
- **[med] [missing]** Advanced section candidate: interpolation and stair-step drawing for discrete tags (the lesson covers aggregates but not how the line between samples is drawn), event markers for alarm and state changes on the trend, and how deadband-compressed history reads on a chart. The "three knobs" section is correct but basic for a process engineer.
- **[low] [clarity]** Strip-chart history and the eli5 are beginner material.

### persp-performance
- **[med] [consistency]** Example "Replacing a polling query with a tag" uses `system.db.runNamedQuery`. → FACTS #10: teach `system.db.execQuery` first with an "In 8.1" callout for `runNamedQuery`.
- **[med] [accuracy]** "`system.util.threadDump()` triggered from a script." → I could not confirm this function exists. Thread dumps are normally taken from the Gateway diagnostics pages. Verify and delete the parenthetical if it does not exist.
- **[low] [consistency]** `if(${tag} > 80, 'hot', 'ok')`. → `${tag}` is not the expression-binding syntax used elsewhere (`{[default]...}`). Replace with a real tag path, or verify the placeholder.
- **[med] [accuracy]** Cost table ranks patterns (High, Medium, Low) without numbers. → The ranking is directionally right and the lesson correctly avoids uncited figures. Mark the High rows as "measure on your own Gateway" or cite a source (verify).
- **[low] [accuracy]** "A scripting call exists to clear named query caches" with no name given. → Name it and verify, or cite the page.
- **[med] [missing]** Advanced section candidate, and the lesson this owner most needs deeper: reading the Gateway script profiler output, measured session cost (measure your own site, do not quote), Perspective session timeout and memory per view, DB pool sizing against cache lifetime, a worked trace of one binding chain from tag change to paint, and an alarm-table query with real filters. The lesson correctly frames the Gateway as the client's CPU and is correctly placed at level 4.

## Cross-lesson issues

1. **Naming drift from HOUSE_STANDARD (high).** The Area2, Pump1, motorPath, and Run/Speed/Fault UDT pattern appears in persp-embedding, persp-bindings, persp-views, persp-library and persp-mobile. HOUSE §2 and §3 require Area10 or Area20, M101-style tags, a `tagPath` faceplate param, and `UDT_Motor` members `Cmd`, `Sts`, `Cfg`, `Alm`. One rename pass fixes all five.
2. **Mesh VPN versus DMZ (high).** persp-mobile recommends a direct overlay path to the Gateway. HOUSE §4 says every connection ends in the DMZ. Reconcile both lessons on the DMZ reverse proxy as the default.
3. **openPopup signature (high).** persp-navigation uses `viewPath=`. persp-library and persp-mobile pass the view positionally, which matches the real `view` parameter. Fix persp-navigation.
4. **Property change signature (high).** persp-events names the third argument `origin`. db-project.js uses `initialChange`. Fix persp-events.
5. **Touch target size (med).** persp-containers says 40 px, persp-mobile says 48 px. Neither is sourced (HOUSE §7).
6. **FACTS #10 not applied (med).** persp-performance teaches `runNamedQuery` without the 8.3 `execQuery` first. The other persp lessons do not use it.
7. **Expression syntax drift (med).** `${tag}` in persp-performance, `"..."` strings in persp-styles and persp-events, `+` versus `concat` in persp-events, `viewPath` in persp-navigation. Pick the verified forms and apply them once.
8. **Uncited numbers (med).** "20 to 40 classes" (persp-styles), "40 px" and "48 px" (containers and mobile). HOUSE §7 bars them without a source.
9. **Too basic for this persona (med, track-wide).** Every lesson leads with eli5, history and a beginner table before reaching depth. Proposal: an "expert" toggle that collapses eli5 and history, and an Advanced section per lesson. Suggested advanced topics, in priority order: (a) session security and role-gated navigation (persp-navigation, persp-mobile); (b) historian interpolation and discrete-tag drawing (persp-charts); (c) Gateway profiling and measured session cost (persp-performance); (d) event throttling and idempotent writes (persp-events); (e) flex min-size behavior and long-name handling (persp-containers); (f) ISA-101 theme tokens and dark mode (persp-styles); (g) repeater rebuild rules and in/out param timing (persp-embedding).

## One-line verdict

Solid, honest structure and correct quiz keys, but the openPopup and valueChanged signatures, the mesh-VPN path that bypasses the DMZ, and the naming drift from HOUSE_STANDARD must be fixed before this track is trusted, and every lesson needs an expert layer because the basics are too thin for this owner.
