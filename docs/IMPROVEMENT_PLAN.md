# Improvement plan (from 8 persona reviews)

Reviewers (Haiku): veteran integrator, total beginner, electrical engineer, software engineer, the owner (process
control engineer → integrator), mobile UX designer, senior Allen-Bradley programmer, OT network/security engineer.
Each read 5–7 lessons plus the relevant screens, sim files or code. Together they covered ~45 of 121 lessons.
Raw feedback: `docs/reviews/*.md`. Claims marked ✔ were verified by the orchestrator against the code.

## Themes

1. **Contradictions between lessons are the biggest content problem.** Individual lessons are strong, but parallel
   writers chose different conventions: three Motor UDT naming schemes, three plant IP plans, two 4–20 mA count
   scales and three NAMUR fault thresholds. Gateway Network examples also go straight from plant to HQ, which the
   security lesson calls a defect.
2. **A handful of real technical errors.** Session affinity is explained backwards, a Sparkplug topic is wrong in
   the capstone, overload and E-stop are shown as PLC-only (a safety issue), the alarm state diagram is missing a state,
   a fee is double-counted, an MSG polling rung is incomplete, and a compose file won't start.
3. **App bugs and exposure.** ✔ An XP-losing sync bug, ✔ the server serves `.git` and (via encoded paths) the progress
   file, one malformed record can wedge sync, and a bad URL hash blanks the screen.
4. **Simulator realism.** ✔ Timer ACC runs past PRE, RES clears .EN, presets can't be tags, and the sandbox uses `I0/O0`
   instead of Logix-style names.
5. **Phone UX.** The lab editor is buried under the brief and I/O, and wide diagrams and ladder clip at 390px. The map is
   hard to use, "Jump in" appears on locked lessons, and there's no first-run explanation of XP, levels and review.
6. **Motivation for the owner.** The perspective lessons feel basic for someone who already builds Perspective. There's
   nothing hands-on in Ignition, no "integrator readiness" view, and XP doesn't reward harder lessons.
7. **Gaps.** Licensing and sizing, time sync / SOE, Logix driver tuning in Ignition, hardwired motor control and output
   wiring, plant electrical safety basics, Sparkplug and CIP security, and data diodes and OT monitoring.

## Phase 1: Bugs, exposure, safety (do first)

| Item | Fix |
|---|---|
| ✔ XP lost on sync | Set `resetAt` only in `reset()`. Add `tools/test-merge.js` covering stale device, reset, poisoned record. |
| ✔ Server exposure | Decode the path before checks. Serve an allowlist only (`index.html`, `assets/`, `content/`). 404 dotfiles, `.git`, `data/`, `docs/`, `tools/`. |
| Server robustness | Validate PUT types (numbers / objects) → JSON 400 on anything bad or on merge errors. Require `Content-Type: application/json` plus a custom header (blocks cross-site writes). Add a request timeout. Keep `progress.json.bak`. |
| Server binding | **Your call:** see Decision 1. |
| Router | try/catch around URL decoding → "not found" instead of a blank screen. |
| ✔ Sim timers | TON/RTO ACC holds at PRE. RES clears ACC/DN/TT and leaves EN to the rung. Allow a DINT tag as the preset operand. |
| Electrical safety | plc-sealin, found-devices and sim-sealin: overload and E-stop are hardwired in the coil circuit and the PLC only monitors them. Add one control-circuit schematic. Fix the sim tip that says otherwise. |

## Phase 2: Make the curriculum agree with itself

Write one **house standard** (`docs/HOUSE_STANDARD.md`) and make every lesson follow it:
- **Equipment UDT shape:** Logix `Motor.Cmd.Start / Motor.Sts.Running / Motor.Cfg.HighLimit`, Ignition `Motor/Cmd/Start`. Applies to plc-udt, plc-best-practices, ign-udts, persp-library, int-naming, the capstone and sim-udt-motor.
- **One plant IP plan:** used by net-ip, net-vlan, net-security, arch-gateway-network and the capstone.
- **One 4–20 mA count scale and one NE43 table:** used by found-signals, found-devices, plc-analog and sim-scp.
- **One DMZ pattern for Gateway Network and Perspective:** gateway connections end in the DMZ. Fix the ports table to include 8060/8043/62541.

Then fix the specific errors the reviewers found (about 30 items, listed per lesson in the feedback files):
- **Architecture and capstone:** session affinity, licensing and threshold numbers, the capstone's Sparkplug topic and database HA.
- **PLC lessons:** mixer step numbering, complete MSG polling rungs, the RES rule, the timer rollover example, and the transition-ordering explanation.
- **Ignition and project lessons:** the alarm 4-state diagram, the double-counted site hours in int-lifecycle, and the HP-HMI alarm expression.
- **Software lessons:** db-schema 3NF and TIMESTAMPTZ, compose secrets and the HTTPS port, the doPost write-quality check, and Perspective output params.
- **Beginner items:** the net-ip ELI5 (two reserved addresses, not one), sim-xic-ote tag names, and the PNP/NPN claim.
- **Overstated or uncited claims:** hedge the UDT BOOL packing detail, the OPC UA trust wording, the Stratix querier claim, and the MSG queue size.
- **Security content:** add Sparkplug and CIP security sections.

**Second review pass:** the reviewers read only ~45 lessons, so the same kinds of problems likely exist in the other ~76.
Run the same persona format (Haiku) over the unreviewed lessons, then fix what it finds in the same pass.

## Phase 3: Phone and app UX

- **Lab on phone:** editor and "Add rung" first. Brief, I/O and tag table become collapsible sheets. Fix toolbar overflow. Same for the sandbox.
- **Wide content:** diagrams and static ladder scale to fit on phones, with a visible scroll cue where they can't.
- **Skill map:** vertical layout on phones with ≥13px labels. Place Map under Tracks on both phone and desktop.
- **Home:** never say "Continue" or "Jump in" for a soft-locked lesson without naming what it skips.
- **Color and layout:** prerequisite text in a neutral color (amber means "in progress"). Make the desktop rail full height.
- **Explaining the system:** a first-run welcome (what XP, levels, streaks and the review queue are), a line on the Review page explaining where cards come from, and readable profile chart labels.
- **Lesson difficulty:** show it as "L1–L4" so it isn't confused with your XP level, and add per-level progress on Profile.
- **Lesson reading:** an in-lesson section list (jump-to and progress) so long lessons can be read in sittings on a phone.
- **Lesson completion:** after a passed quiz, show XP, any badge, and a "Next: …" handoff.
- **Offline and speed:** self-host the fonts so the app works on a plant network without internet. Defer loading the glossary, and save the simulator program less often.

## Phase 4: Motivation and depth for you

- **XP:** scale lesson XP by level (L3/L4 worth more). Add integrator milestone badges (first L4 lesson, each track's capstone-level lesson, capstone).
- **Integrator readiness page:** progress against Purdue levels 0–4 and curriculum levels L1–L4, with the capstone as the finish line.
- **Deeper Perspective lessons:** persp-hphmi gets a worked theme and style-class set plus a full level-2 display. The other Perspective lessons get an "if you already build Perspective" advanced section.
- **Hands-on Ignition labs (new):** 4–5 guided builds you do in Ignition Maker Edition (free) with checklists the app tracks:
  Motor UDT matching the Logix UDT → simulator device → faceplate from the library pattern → alarms and history → OEE screen.
- **Downloadable artifacts:** a sample FDS outline, a tag/UDT export, and an I/O list template.

## Phase 5: New lessons for the gaps

- **Ignition:** licensing and sizing (sessions vs clients, Edge limits, modules); Logix driver tuning and bad-quality triage in Ignition.
- **Data and time:** time synchronization (NTP/PTP, controller vs server timestamps, sequence of events).
- **Electrical:** motor control circuits and output wiring (control circuit, interposing relays, suppression, stop categories 0/1/2); plant electrical safety basics (LOTO, arc flash awareness, working near live panels).
- **OT security:** monitoring, asset inventory and unidirectional gateways (folded into net-security or a new lesson).
- **Simulator:** a step-timeout / fault-state challenge, and Logix-style I/O names (`Local:1:I.Data.0`) in the sandbox.

## Cost and execution

| Phase | Agents | Rough tokens |
|---|---|---|
| 1 | Orchestrator, plus 1 Sonnet for the simulator and safety content | ~0.3M |
| 2 | 1 Sonnet for the standard, ~6 Sonnet fixers by track, 6–8 Haiku second-pass reviewers | ~1.5M |
| 3 | 2 Sonnet (lab/simulator UI, app UI) | ~0.5M |
| 4 | 1 Sonnet (app), 2 Sonnet (Perspective depth, labs) | ~0.6M |
| 5 | 3 Sonnet writers, 1 Sonnet for simulator additions | ~0.6M |

Every phase ends with `validate.js`, `sim-test.js`, the new merge test, and a Playwright pass at phone and desktop size before commit.

## Decisions needed

1. **Server exposure.** (a) *Recommended:* bind to 127.0.0.1 and reach it with `tailscale serve`, which gives an HTTPS URL that only your
   tailnet can reach. Nothing on the plant or home LAN can see it. (b) Keep it open on all interfaces and add a passphrase.
2. **Scope.** All five phases, or phases 1–3 now and 4–5 later?
3. **Second review pass** over the ~76 unreviewed lessons (cheap, Haiku): include it in Phase 2?
