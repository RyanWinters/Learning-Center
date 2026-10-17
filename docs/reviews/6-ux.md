## Persona
Senior product/UX designer for mobile learning apps (Duolingo, Brilliant lens): hierarchy, navigation, readability, touch, delight, onboarding, empty states, accessibility.

## What works
- Lesson opener (m-plc-timers-0): title, one-line promise, "I already know this" / "Test out" beside the start path, "Builds on" chip and a "You will be able to" checklist. Clear, low-friction entry.
- Quiz feedback (m-quiz-answered): wrong pick gets a red X and a "NOT QUITE" line that explains why; the right answer gets a green check and "THE ANSWER IS D". Best moment in the app: it teaches, it doesn't just grade.
- Locked tracks (m-track, d-track) say what is needed ("Needs: ...") and the page subtitle says "Locks are only suggestions." Honest and motivating.
- Glossary popover (m-popover) is a bottom sheet with a plain-language definition, an ELI5 toggle and a "Learn it in" link. Right size for a phone.
- Empty review state (m-review) is calm and gives a date ("Next cards come up Sunday, Oct 18", which matches 2026-10-17). Sim (d-sim) shows Hint (3 left) with Show solution locked until earned, which is a good scaffold.
- Content I checked is accurate: the TON reset quiz (PRE=4000, rung 3.9 s / 1 s / 3.9 s, DN never sets), the TOF timing text, and the flasher explanation all hold up.

## Problems
**[severity: high] [area: ui]** Lab sandbox on phone (m-sandbox): the ladder editor and "Add the first rung" sit about 2000px down, after 16 I/O tiles, the Analog controls and a 25-row tag table. The main task is buried. Fix: on phone, put the rung editor and "Add rung" first, and move I/O and the tag table into a collapsible panel or sheet.

**[severity: high] [area: ui]** Lesson diagrams on phone (m-plc-timers-3, flasher section): the TON block runs off the right edge ("Fl", "TT" cut off) and there is no scroll cue. Fix: scale SVG diagrams to container width with a viewBox, or stack the rung and the function block vertically below 420px. Check every diagram in m-ign-udts-* too.

**[severity: med] [area: ui]** Skill map on phone (m-map): node text is roughly 11–12px, the locked icons are tiny, and the track pills (T1 to T5) and the right-hand nodes are clipped at the edge. The graph is hard to read by touch. Fix: fit the graph to width or lay it out vertically on phone, use at least 13px node labels, and add a visible pan affordance.

**[severity: med] [area: ui]** Information architecture: on phone, Skill map is under MORE (m-map has MORE active), while on desktop it is a primary rail item (d-home, d-tracks). The same destination is in two different places. Fix: keep one IA. Either move Skill map into the Tracks tab on phone or demote it to a Tracks sub-view on both.

**[severity: med] [area: ui]** Color semantics: the "Needs: ..." prerequisite text uses the amber warn color (m-track, d-track), the same color the app uses for IN PROGRESS (Timers row, T3 tile). A learner will read "needs" as a status. Fix: set prerequisite text to --muted (or a neutral info token) and keep amber for in-progress and attention states only.

**[severity: med] [area: accuracy]** XP figures disagree across screens: m-home shows "46 / 159 XP to Field Tech", d-home shows "50 / 150 XP", m-sim shows "60 XP, 90 to go", and m-profile shows "56 XP, 100 to go" (which implies 156). The level threshold is 150 on some screens and 159 on others. Either the screenshots were taken at different times without a note, or the level bar reads a different value from the header. Fix: confirm the screenshot timestamps, then put one XP source behind the header, home, profile and sim, and show the same threshold everywhere.

**[severity: med] [area: ui]** Desktop rail (d-home, d-tracks, d-track, d-lab, d-sim, d-search): the sidebar background stops at roughly 800px and bare grey shows below it, so the rail looks cut off. Fix: make the rail height 100vh and sticky, or give it the page background.

**[severity: low] [area: ui]** Profile chart (m-profile, "Last 14 days"): the day labels are about 7px and unreadable, and with one bar the chart says little. Fix: labels at 11px minimum, plus a plain "Your first XP shows here" empty state for new users.

**[severity: low] [area: ui]** Lab ladder toolbar on desktop (d-sim): the "Comment" button sits flush against the editor's right edge with no margin. Fix: wrap the toolbar or add right padding.

**[severity: low] [area: ui]** Phone tab bar in full-page captures (m-home, m-tracks, m-track, m-profile, m-sandbox) sits mid-page. Probably a screenshot artifact of a fixed element, but if the bar is not fixed in the real layout it would hide content. Fix: confirm in a live scroll; if the bar is fixed, no change is needed.

## Missing
- Quiz results screen: m-quiz-end is still question 6/6 with "See results". There is no score, XP earned, missed-question review or next-step CTA captured. This is the highest-value gamification moment and I could not review it.
- Lesson completion moment: nothing shows what happens after the quiz (badge, streak update, the next lesson as a handoff).
- Review onboarding: the Review page shows 6 cards in Box 1 but never explains how cards get there or how to add one from a lesson.
- First-run orientation: no visible explanation of XP, streaks or levels for a brand-new user before the header numbers appear.
- Coverage gap in my review: I viewed 23 of roughly 60 screenshots. I did not review d-map, d-ign-udts-*, d-quiz-*, d-review, d-popover, d-profile, m-ign-udts-1/2/3/5/6, m-plc-timers-1/2/4/5/6, or m-glossary*. Findings on those screens are not covered here.

## One-line verdict
The learning UX is well-crafted: the quiz feedback and lesson openers teach well and the layout is calm, but the phone lab, diagram clipping, skill-map legibility and inconsistent XP numbers need fixing before this feels ready for learners.
