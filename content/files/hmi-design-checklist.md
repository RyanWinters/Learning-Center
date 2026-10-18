# HMI design checklist (one page)

Use this before a screen goes to operators. Mark each line Pass, Fail or N/A. Fix anything that affects detecting an abnormal condition first.
Screen: ____________  Reviewer: ____________  Date: ________  Tested with an operator: Y / N

## Layout
- [ ] Position follows the task analysis: frequent and critical tasks get the best space and fewest steps
- [ ] Related items are grouped, and flow reads left to right or top to bottom
- [ ] Nothing the operator needs is more than two taps away
- [ ] Equipment, units and names match the drawings and the tag naming scheme

## Color
- [ ] Neutral (grey) base. Color is used only for abnormal conditions or a defined, written state
- [ ] Alarm colors are never used for normal states (for example "running")
- [ ] No state depends on color alone. Each has a word or shape too
- [ ] Contrast checked on the real panel in real lighting, and color-blind check done
- [ ] No rainbow fills, gradients, shadows or fake 3D

## Text and numbers
- [ ] One typeface. Text meets the project minimum size. Key values are the largest text
- [ ] Every value shows its engineering unit. Decimal places are consistent and sensible
- [ ] Labels follow one pattern (tag, name, value, unit)
- [ ] Muted or low-contrast text is not used for important values

## Data display
- [ ] Each analog value has context: range, normal band, limit or trend
- [ ] Bars and trends are used instead of bare digits or round dials where the operator needs the situation
- [ ] Scales are fixed and labelled. Trends show the alarm limit
- [ ] Digits that nobody uses to make a decision are removed or moved to a lower level

## Abnormal states
- [ ] The abnormal condition is the most visible thing on the screen
- [ ] The alarm display shows tag, description, value, limit, priority, time and acknowledgement state
- [ ] Bad quality, stale data and lost communication are visible and different from a normal zero
- [ ] Cause-related state (for example a closed valve) is stated in words
- [ ] Alarm presentation matches the alarm system priorities

## Interaction
- [ ] Status objects are never buttons. Commands are in a consistent place, on the faceplate
- [ ] Touch targets are at least 44 to 48 px (about 9 mm) with gaps, larger for gloves, and tested with the real gloves
- [ ] Feedback shows "command sent" and "equipment responded" separately, with a timeout for no response
- [ ] Disabled controls stay visible and say why (permissive or interlock reason)
- [ ] Confirmation is used only for hard-to-reverse or safety-related actions, names the equipment, and the safe option is the default
- [ ] Numeric entry shows the current value, unit and limits, rejects bad values, and is separate from Apply
- [ ] Limits are enforced in the PLC as well as the HMI
- [ ] Roles and write permissions are enforced on the server side

## Navigation
- [ ] Navigation is in the same place on every screen, with the same size and shape for every item
- [ ] The current location is marked and there is one clear way back
- [ ] Faceplates open from the equipment object and show the equipment name in the header

## Testing and change
- [ ] Task analysis done with operators from each shift
- [ ] Heuristic review done (Nielsen's ten heuristics)
- [ ] Scenario test with at least five operators, think-aloud, time to detect recorded
- [ ] Style guide updated, change recorded, crews informed before the change goes live
- [ ] Review scheduled 30 and 90 days after go-live

Notes and findings:
