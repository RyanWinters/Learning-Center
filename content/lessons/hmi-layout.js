LC.lesson({
  id: "hmi-layout",
  title: "Layout, grouping and where the eye lands",
  track: "hmi",
  minutes: 30,
  level: 2,
  prereqs: ["hmi-perception"],
  tags: ["hmi", "layout", "gestalt", "grid", "eye tracking", "perspective", "containers"],
  summary: "What eye-tracking research does and does not say about where to put things, how grouping works, and how to build a consistent, grid-aligned layout in Perspective.",
  objectives: [
    "Explain the F-pattern and Z-pattern and say what transfers to monitoring screens and what does not",
    "State the 'top-left' rule honestly, including why consistency matters more than the corner",
    "Apply proximity, similarity, enclosure, alignment and continuity to regroup a cluttered screen",
    "Lay a screen out on a grid with consistent header, navigation and alarm zones",
    "Arrange a process screen so it follows the flow of material, left to right",
    "Choose between flex, column, coordinate and breakpoint containers for a given layout job"
  ],

  body: `
## The top-left claim, in one paragraph

You heard "put the most important numbers top-left because that's how people read." There is a true core in that and an overstatement around it. Eye-tracking studies of web pages (Nielsen Norman Group, NN/g) show that people whose language reads left to right look at the top and left of a page more than the bottom and right. So a first glance often lands near the top-left. But those studies were of people looking for information on pages of text, not of operators watching a process. On a monitoring screen, the eye is pulled to whatever differs from its surroundings and goes to a learned location for what it has learned to check. The right rule is this: **put the overview and the most important state where the first glance usually lands, then keep every screen in the same arrangement so the operator's eye learns where things are.** Consistent placement beats the best possible corner.

## What the eye-tracking research says

### The F-pattern

NN/g's original study (2006, 232 users) found that on text-heavy web pages people read a line across the top, then a shorter line a bit lower, then scan down the left edge. The shape is roughly an F. NN/g later published a follow-up and made two points that matter for us. First, the pattern appears mainly when text is dense and unstructured; clear headings and short bullets break it. Second, it is a symptom of scanning, not a goal to design for. Its variations include an E shape and an inverted L, and for right-to-left readers it mirrors.

NN/g also reports that, on pages in general, most fixations fall in the left half and that attention is highest at the top. NN/g's later work on comparison tables describes a "lawn mower" pattern: left to right along a row, then back to the left on the next row.

### The Z-pattern

The Z-pattern (top-left to top-right, diagonal to bottom-left, then across to bottom-right) is widely taught in design courses for sparse pages such as landing pages. In my searches I did not find an NN/g or other eye-tracking study that establishes it, so treat it as a design heuristic for simple layouts, not a research finding.

### What transfers to monitoring screens

{{diagram:patterns}}

| Finding | Transfers? | What to do |
|---|---|---|
| People start near the top-left (left-to-right readers) | Partly, for the first glance on a newly opened screen | Put the area name, overall status and alarm summary there |
| Attention drops down the page | Yes, for reading text and tables | Put what must be read first higher; do not hide key values below the fold |
| F-pattern on dense text | Only for text-heavy screens such as procedures, alarm lists and tables | Use headings, short lines, and bold lead words |
| Lawn mower on tables | Yes, for value tables | Align numbers in columns, keep row labels at left |
| Attention follows pop-out features | Yes, and it overrides reading order | Reserve pop-out for abnormal (see {{lesson:hmi-perception}}) |
| Eye goes where past experience says information is | Yes | Keep layout identical across screens |

Operators scan a familiar screen in a habitual route. Move a block on one screen and the habit sends their eye to the wrong place. That is why **consistency of position across screens matters more than which corner you choose.**

## Gestalt principles: how the brain groups things

The Gestalt principles describe how people see groups before they read anything. They let you show relationships without drawing extra lines.

| Principle | Meaning | Operator-screen example |
|---|---|---|
| **Proximity** | Things close together belong together. NN/g calls it among the most important grouping principles | Keep the M101 value, setpoint and Start/Stop together, with larger gaps between M101 and P101 |
| **Similarity** | Things that look alike are seen as related. NN/g's example is shared color, shape or size | All pumps use the same symbol and size. Make the abnormal one different |
| **Enclosure** | A shared border or background makes a group | A light grey panel behind the controls for one unit |
| **Alignment** | Edges on the same line read as connected | Right-align numbers on the decimal point in a column |
| **Continuity** | The eye follows smooth lines | Pipes drawn straight, with few crossings, make flow easy to follow |
| **Closure** | The brain completes gaps | A dashed outline is read as a boundary |

Rules that follow: pick **one** grouping method per relationship, usually proximity plus a subtle enclosure. Do not use a border *and* a color *and* a gap for the same grouping; the extra ink is clutter.

{{diagram:regroup}}

## Grids and alignment

A grid is a set of invisible lines that every element snaps to. On a screen it does three jobs: it makes alignment automatic, it makes spacing consistent, and it makes screens predictable.

- Choose a **base unit** (8 px is common) and make all margins, gaps and component sizes multiples of it.
- Align component **left edges** to shared vertical lines and **text baselines** to shared horizontal lines.
- **Right-align numbers** (or align on the decimal point) so the operator can scan down a column and compare magnitudes by digit count.
- Use the **same card width** for repeated items such as motors, valves and indicators, so a row of them looks like a table.

## Whitespace and density

Whitespace is information: it separates groups. It is also expensive on a control room screen, because operators want to see a lot. The goal is **density with structure**. A rule of thumb used by designers is to make the space between groups clearly larger than the space inside groups (a 2:1 ratio is a workable start), then check by squinting that the groups still read. Remove decoration first (borders, shadows, gradients), not data.

NN/g's visual design guidance recommends no more than about three type sizes in a typical layout. For operator screens that means one size for labels, one for values, one for titles. See {{lesson:hmi-type-numbers}} for the detail.

## Follow the process

For a process unit, the best arrangement is the one that matches the plant: **material flows left to right, top to bottom**, the way a P&ID is drawn. Inputs (feeds, raw materials) at left, the main vessel in the middle, outputs (product, waste, utilities out) at right. A flow arrow that points the same way as the reading direction needs no explanation.

Keep that direction consistent across all units. Where the real plant flows right to left, still draw the display left to right and say so in a note. Operators do not see the plant layout from the control room anyway.

## Consistent zones

Pick zones once and use them for every screen.

{{diagram:zones}}

The zones in the picture are an example. What matters is that the same job always sits in the same place:

| Zone | Job | Notes |
|---|---|---|
| Header strip | Area or unit name, user, date and time | Always the same height |
| Alarm banner | Count and top priority of active alarms, acknowledge | Never covered by a popup. Shows on every page |
| Navigation | Move between areas and levels | Left rail or bottom bar, same on every page |
| Work area | The unit display, in a three-region split | The only part that changes |
| Footer / status | Connection state, mode | Optional |

ISA-101's four display levels (see {{lesson:persp-hphmi}}) give the navigation structure. Layout gives it a visible place.

## Information hierarchy on one screen

Rank what is on the screen: what must the operator see at once, what at a glance, and what only on request. Then express the rank with **position, size and grouping**, not with color. A workable four-tier model for a Level 2 screen:

1. **Always visible:** unit status, alarm banner, key process values (the 5 to 9 you would call out in a shift handover).
2. **At a glance:** controller state, setpoints, modes, trend of the key values.
3. **On demand:** faceplates and detail, opened by clicking the equipment.
4. **Rarely:** diagnostics, configuration, help.

If everything is important, nothing is. Count the tier-1 items on your screen. If there are more than about a dozen, you are showing level-2 information as level 1.

## Doing it in Perspective

| Container | Use it for | Notes |
|---|---|---|
| **Flex container** | Most layouts, including the page skeleton and rows of indicators | Direction, wrap, grow, shrink, basis, justify and align. See the Flex container glossary entry |
| **Column container** | A 12-column grid whose component positions change with up to three breakpoints | Good for forms and dashboards that must reflow |
| **Coordinate container** | The process graphic with exact positions | Use percent mode when the view must scale with the window |
| **Breakpoint container** | Swapping whole layouts (phone, tablet, desktop) | Nest breakpoint containers for more sizes |

A page skeleton that supports the zones above:

\`\`\`text
Root: Flex container, direction column, fills the page
 ├─ Header (basis 56 px, no grow)           [docked view or child]
 ├─ AlarmBanner (basis 40 px, no grow)      [docked view, same on every page]
 └─ Body: Flex container, direction row, grow 1
     ├─ Nav (basis 64 px, no grow)
     └─ Work area: Flex container, direction row, wrap
         ├─ Process graphic (basis 40%, grow 1)
         ├─ Indicators (basis 30%, grow 1)
         └─ Controls and trend (basis 30%, grow 1)
\`\`\`

Tips:

- Put the header, alarm banner and navigation in **docked views** or in a shared embedded view so they are literally the same on every page (see {{lesson:persp-navigation}}). Consistency by construction beats consistency by discipline.
- Give repeated items a **fixed basis** and let the container wrap them. A flex repeater (see {{lesson:persp-embedding}}) over a list of motors gives a uniform card grid.
- Choose a **fixed design resolution** for the control room screens (for example 1920 by 1080), and use a breakpoint container only for the phone and tablet variants (see {{lesson:persp-mobile}}).
- Set the container \`style.gap\` or padding with your base unit as a style class, not per component.

## Worked example: regrouping the Area10 mixing screen

The cluttered version scatters 18 elements: tank LT101, valve FV101, pump P101 and motor M101 symbols; 11 numbers; Start/Stop buttons for each; and a legend. The numbers sit wherever there was room. The Start button for M101 is far from the M101 symbol, near the P101 value.

The regrouped version uses the zones above and three groups in process order:

| Group | Contents | Grouping cue |
|---|---|---|
| Feed (left) | FV101 symbol and position, feed flow FT101 | Proximity, light panel |
| Mix (centre) | Tank with LT101 level bar, M101 symbol with speed, mode and Start/Stop beside it | One panel, controls under the symbol |
| Discharge (right) | P101 symbol with current, discharge pressure PT101 | Proximity, light panel |

Result: the same 18 elements, but the operator sees three chunks, flow runs left to right, and each control sits next to the thing it controls. Nothing was removed.

## Rules of thumb

1. Put overview and status where the first glance lands (top-left for left-to-right readers), then **never move it**.
2. Same job, same place, same size on every screen.
3. Control next to the thing it controls; value next to its label.
4. Gap between groups at least twice the gap inside groups.
5. One grouping cue per relationship. Do not stack border, color and gap.
6. Align to a grid. Base unit of 8 px, left edges shared, numbers right-aligned.
7. Draw flow left to right, top to bottom. Minimise pipe crossings.
8. At most about three type sizes.
9. Rank by position and size, not color.
10. Build zones into shared docked views so consistency does not depend on people.

## Try it on your own screens

1. Print or screenshot five of your screens. Lay them side by side and mark where the header, navigation and alarm indication sit. How many positions are there? The goal is one.
2. Pick one screen and list its elements. Draw circles around the groups you think the operator sees. Then squint at the screenshot. Do the groups you drew match the groups that actually appear?
3. Check alignment: draw vertical lines on the screenshot through the left edges. Count how many different x positions you get. Aim to cut that number in half.
4. Find a control that is not adjacent to the item it controls. Move it, or add an enclosure that makes the relationship obvious.
5. Redraw one P&ID-based screen so the flow runs left to right. Compare operator comments.
6. Rebuild one screen's skeleton as the flex layout above and put the header and alarm banner in docked views.
`,

  eli5: `
Think about a kitchen. A good kitchen puts the knives, cutting board and bowls together where you chop, and the pots, stove and spoons together where you cook. When you go to cook, you do not have to hunt for things, because things you use together are near each other, and the same thing is always in the same drawer. You could reach for the spoons with your eyes closed.

A bad kitchen has the knives in one corner, the cutting board across the room, and the spoons mixed in with the towels. Everything is there, but you stand around looking.

A screen is a kitchen for your eyes. Put the things used together next to each other, put a little empty space between different jobs, line things up so they look tidy, and keep everything in the same drawer every time. The corner matters a little, because people tend to start looking at the top-left, but it matters much less than putting things in the same place every time.
`,

  why: `
**Why the top-left idea is half true.** Eye-tracking of web pages shows heavier attention on the top and the left half, for people who read left to right. That makes the top-left a reasonable home for the screen's name, overall status and alarm summary. It does not mean the most important process variable should always go in that corner. The eye of a trained operator goes to the thing that changes or that they have learned to check. So the research gives a starting point and the real work is consistency.

**Why consistency beats cleverness.** Operators build a habit route over a screen. They find a value by where it is, not by reading. If tank level is bottom-left on one unit and top-right on the next, every move forces a search. Fixed zones, shared docked views and one template cost you a day of design and save every operator a small search, thousands of times.

**Why group by process instead of by instrument type.** A common mistake is a screen of "all temperatures", "all flows", "all pressures". That is how the I/O list is organised. It is not how an operator thinks. An operator thinks "the mixer", "the feed". Group by equipment and process step, and the whole task is in one place.

**What integrators argue about.** Some like strict grids and no decoration. Others add enclosure panels because customers like the look of structure. The test is whether the grouping aids the task. Another debate is how dense to go. Operators of a mature plant often want more on screen than a designer's instincts allow, and a trend plus values in one view beats paging. The answer is to keep the density and add structure. Fixed design resolution versus responsive layout is another trade-off: a fixed 1920 by 1080 layout is easier to make consistent; responsive layouts serve phones and tablets but are harder to keep identical.
`,

  history: `
Gestalt psychology came out of early twentieth-century German research on how people perceive wholes before parts, which is where the grouping principles come from. NN/g published its F-pattern eye-tracking research in 2006 and followed up later. Process control picked up these ideas through human-factors work behind ISA-101, which puts the display hierarchy and consistent navigation in its HMI lifecycle.
`,

  examples: [
    {
      title: "Alarm banner that stays put",
      body: `A site has three Perspective projects with the alarm summary at the top, bottom and right. Operators who move between Area10 and Area20 have to hunt for it. The fix is one shared embedded view, "Banner/Alarm", loaded in the north dock of every page, with fixed height 40 px. Nothing else on any page is allowed to cover that strip, including popups, which are positioned below it.`
    },
    {
      title: "Numbers in a column",
      body: `A table of five tank levels is left-aligned: 3.4, 12.07, 0.9, 11.25, 4.6. Compare magnitudes by eye and it is slow. Right-align on the decimal point with a fixed one-decimal format: 3.4, 12.1, 0.9, 11.3, 4.6. Now the tens digit makes the two large values visible in the column at a glance, and the row of dots lines up.`
    }
  ],

  diagrams: {
    patterns: `<svg viewBox="0 0 640 230" role="img" aria-label="Three scan patterns: F-shaped on a text page, left-to-right rows on a table, and the eye jumping to the one highlighted item on a monitoring screen">
  <text class="dg-title" x="20" y="24">Text page: F-pattern</text>
  <rect class="dg-box" x="20" y="36" width="190" height="150" rx="4"/>
  <line class="dg-line-accent" x1="34" y1="54" x2="196" y2="54"/>
  <line class="dg-line-accent" x1="34" y1="84" x2="150" y2="84"/>
  <line class="dg-line-accent" x1="34" y1="54" x2="34" y2="170"/>
  <line class="dg-line-thin" x1="34" y1="104" x2="196" y2="104"/>
  <line class="dg-line-thin" x1="34" y1="122" x2="196" y2="122"/>
  <line class="dg-line-thin" x1="34" y1="140" x2="196" y2="140"/>
  <line class="dg-line-thin" x1="34" y1="158" x2="196" y2="158"/>
  <text class="dg-text-sm" x="20" y="208">Dense, unstructured text</text>
  <text class="dg-title" x="228" y="24">Table: row by row</text>
  <rect class="dg-box" x="228" y="36" width="190" height="150" rx="4"/>
  <line class="dg-line-accent" x1="242" y1="58" x2="404" y2="58"/>
  <line class="dg-line-accent dg-dash" x1="404" y1="58" x2="242" y2="88"/>
  <line class="dg-line-accent" x1="242" y1="88" x2="404" y2="88"/>
  <line class="dg-line-accent dg-dash" x1="404" y1="88" x2="242" y2="118"/>
  <line class="dg-line-accent" x1="242" y1="118" x2="404" y2="118"/>
  <line class="dg-line-thin" x1="242" y1="148" x2="404" y2="148"/>
  <text class="dg-text-sm" x="228" y="208">Tables of values</text>
  <text class="dg-title" x="436" y="24">Monitoring screen</text>
  <rect class="dg-box" x="436" y="36" width="184" height="150" rx="4"/>
  <rect class="dg-box-2" x="448" y="50" width="70" height="40" rx="3"/>
  <rect class="dg-box-2" x="538" y="50" width="70" height="40" rx="3"/>
  <rect class="dg-box-2" x="448" y="130" width="70" height="40" rx="3"/>
  <rect class="dg-box-alarm" x="538" y="130" width="70" height="40" rx="3"/>
  <line class="dg-line-alarm" x1="460" y1="70" x2="570" y2="148"/>
  <text class="dg-text-sm" x="436" y="208">Eye jumps to the odd one</text>
  <text class="dg-text-sm" x="436" y="224">out, then to learned spots</text>
</svg>`,
    regroup: `<svg viewBox="0 0 640 310" role="img" aria-label="Left: the same Area10 elements scattered with uneven gaps. Right: the same elements grouped into Feed, Mix and Discharge panels in left-to-right process order with aligned edges">
  <text class="dg-title" x="20" y="24">Cluttered</text>
  <rect class="dg-box" x="20" y="36" width="290" height="260" rx="6"/>
  <rect class="dg-box-2" x="30" y="48" width="64" height="34" rx="3"/>
  <text class="dg-text-sm" x="36" y="70">FV101</text>
  <rect class="dg-box-2" x="206" y="52" width="80" height="34" rx="3"/>
  <text class="dg-text-sm" x="212" y="74">PT101 2.9</text>
  <rect class="dg-box-2" x="112" y="96" width="76" height="34" rx="3"/>
  <text class="dg-text-sm" x="118" y="118">LT101 3.4</text>
  <rect class="dg-box-2" x="38" y="150" width="70" height="34" rx="3"/>
  <text class="dg-text-sm" x="44" y="172">P101</text>
  <rect class="dg-box-2" x="224" y="124" width="70" height="34" rx="3"/>
  <text class="dg-text-sm" x="230" y="146">Start M101</text>
  <rect class="dg-box-2" x="140" y="176" width="64" height="34" rx="3"/>
  <text class="dg-text-sm" x="146" y="198">M101</text>
  <rect class="dg-box-2" x="40" y="236" width="86" height="34" rx="3"/>
  <text class="dg-text-sm" x="46" y="258">FT101 41.8</text>
  <rect class="dg-box-2" x="214" y="222" width="76" height="34" rx="3"/>
  <text class="dg-text-sm" x="220" y="244">Stop M101</text>
  <text class="dg-title" x="334" y="24">Regrouped, same data</text>
  <rect class="dg-box" x="334" y="36" width="286" height="260" rx="6"/>
  <rect class="dg-zone" x="344" y="68" width="76" height="216" rx="4"/>
  <text class="dg-label-accent" x="344" y="60">FEED</text>
  <rect class="dg-box-2" x="352" y="80" width="60" height="34" rx="3"/>
  <text class="dg-text-sm" x="358" y="102">FV101</text>
  <rect class="dg-box-2" x="352" y="124" width="60" height="34" rx="3"/>
  <text class="dg-text-sm" x="358" y="146">FT101</text>
  <rect class="dg-zone" x="432" y="68" width="100" height="216" rx="4"/>
  <text class="dg-label-accent" x="432" y="60">MIX</text>
  <rect class="dg-box-2" x="442" y="80" width="80" height="34" rx="3"/>
  <text class="dg-text-sm" x="448" y="102">LT101 3.4</text>
  <rect class="dg-box-2" x="442" y="124" width="80" height="34" rx="3"/>
  <text class="dg-text-sm" x="448" y="146">M101</text>
  <rect class="dg-box-2" x="442" y="190" width="80" height="34" rx="3"/>
  <text class="dg-text-sm" x="448" y="212">Start</text>
  <rect class="dg-box-2" x="442" y="234" width="80" height="34" rx="3"/>
  <text class="dg-text-sm" x="448" y="256">Stop</text>
  <rect class="dg-zone" x="544" y="68" width="68" height="216" rx="4"/>
  <text class="dg-label-accent" x="544" y="60">OUT</text>
  <rect class="dg-box-2" x="552" y="80" width="52" height="34" rx="3"/>
  <text class="dg-text-sm" x="558" y="102">P101</text>
  <rect class="dg-box-2" x="552" y="124" width="52" height="34" rx="3"/>
  <text class="dg-text-sm" x="558" y="146">PT101</text>
</svg>`,
    zones: `<svg viewBox="0 0 640 330" role="img" aria-label="Layout zone diagram of an operator page: header strip, alarm banner, navigation rail, a work area split into process graphic, indicators and controls, and a footer">
  <rect class="dg-box" x="20" y="20" width="600" height="290" rx="6"/>
  <rect class="dg-box-2" x="30" y="30" width="580" height="36" rx="3"/>
  <text class="dg-text" x="42" y="53">Header: Area10 Mixing / user / time</text>
  <text class="dg-text-sm dg-end" x="600" y="53">basis 56 px</text>
  <rect class="dg-box-alarm" x="30" y="72" width="580" height="30" rx="3"/>
  <text class="dg-text" x="42" y="92">Alarm banner: counts, top priority, ack</text>
  <text class="dg-text-sm dg-end" x="600" y="92">basis 40 px</text>
  <rect class="dg-box-2" x="30" y="108" width="62" height="164" rx="3"/>
  <text class="dg-text-sm" x="38" y="130">Nav</text>
  <text class="dg-text-sm" x="38" y="148">L1</text>
  <text class="dg-text-sm" x="38" y="166">L2</text>
  <text class="dg-text-sm" x="38" y="184">L3</text>
  <rect class="dg-box-accent" x="98" y="108" width="236" height="164" rx="3"/>
  <text class="dg-text" x="110" y="132">Process graphic</text>
  <text class="dg-text-sm" x="110" y="152">flow left to right</text>
  <text class="dg-text-sm" x="110" y="170">grow 1, basis 40%</text>
  <rect class="dg-box-accent" x="340" y="108" width="132" height="164" rx="3"/>
  <text class="dg-text" x="350" y="132">Indicators</text>
  <text class="dg-text-sm" x="350" y="152">bars, bands,</text>
  <text class="dg-text-sm" x="350" y="170">limits</text>
  <rect class="dg-box-accent" x="478" y="108" width="132" height="164" rx="3"/>
  <text class="dg-text" x="488" y="132">Controls</text>
  <text class="dg-text-sm" x="488" y="152">trend, alarm list</text>
  <rect class="dg-box-2" x="30" y="278" width="580" height="24" rx="3"/>
  <text class="dg-text-sm" x="42" y="295">Footer: connection, mode</text>
  <text class="dg-label-accent" x="98" y="324">Work area (the only part that changes per page)</text>
</svg>`
  },

  pitfalls: [
    "Putting the biggest or brightest item top-left because of the reading-order claim, instead of putting the overview and status there.",
    "Treating the F-pattern as a design target. It is a symptom of scanning unstructured text.",
    "Changing the position of the header or alarm banner between pages or projects.",
    "Grouping by instrument type (all temperatures together) instead of by equipment and process step.",
    "Stacking border, background color and gap for the same group, which adds clutter without information.",
    "Placing a control away from the equipment it controls, so the operator must remember which button belongs to what.",
    "Hand-positioning every component in a coordinate container, so alignment drifts as soon as someone edits the view."
  ],

  keyTerms: ["f-pattern", "gestalt-principles", "visual-hierarchy", "design-grid", "display-hierarchy", "flex-container", "breakpoint-container", "hmi"],

  quiz: [
    {
      q: "A vendor says 'always put the most critical process variable top-left, because that is where eyes land first'. How do you apply that on your Area10 screens?",
      options: [
        "Put LT101 top-left on every screen, regardless of unit",
        "Put the area name, overall status and alarm summary top-left and keep every screen's arrangement the same",
        "Ignore the claim, because eye tracking is irrelevant to operators",
        "Put the largest number top-left and shrink the rest"
      ],
      answer: 1,
      explain: [
        "Unit-specific variables vary by screen, so the position would not be consistent. The first glance is better spent on orientation and alarm state.",
        "Correct. The first glance usually lands near top-left for left-to-right readers, so use it for overview. Consistency across screens matters more than the corner.",
        "The research is about web pages, so it only partly transfers, but it is not irrelevant. It supports using the top-left for orientation.",
        "Size encodes importance, but a lone big number is not an overview, and using size everywhere removes its signal."
      ]
    },
    {
      q: "Three pumps' Start buttons are in a row at the bottom, and their status and current values are at the top. Operators sometimes start the wrong pump. Which principle does the layout break, and what is the fix?",
      options: [
        "Continuity, so draw longer pipes",
        "Proximity, so place each Start button next to its own pump",
        "Closure, so add dashed outlines",
        "Similarity, so make all buttons different colors"
      ],
      answer: 1,
      explain: [
        "Pipe continuity is unrelated to which button belongs to which pump.",
        "Correct. Proximity tells the eye what belongs together. Controls should sit with their equipment.",
        "Closure is a weaker cue and would not fix the separation.",
        "Different button colors would use up color and make the abnormal harder to spot, and the buttons still would not be near their pumps."
      ]
    },
    {
      q: "A screen has a light panel, a thick border and a different font color around every group of values. What is the most likely improvement?",
      options: [
        "Keep all three and add a fourth cue",
        "Use one cue per grouping, such as proximity plus a subtle panel, and remove the rest",
        "Remove all grouping and use one large table",
        "Switch to a darker theme"
      ],
      answer: 1,
      explain: [
        "More cues add clutter without extra meaning.",
        "Correct. One grouping method per relationship, usually proximity with a subtle enclosure, is enough.",
        "A single table loses the grouping that supports chunking.",
        "Theme choice does not fix redundant visual cues."
      ]
    },
    {
      q: "Which Perspective approach gives the most reliable consistency of header and alarm banner across 30 pages?",
      options: [
        "Copy the same components onto every page and keep them aligned by hand",
        "Put them in docked views or a shared embedded view used by every page",
        "Use a breakpoint container on each page",
        "Set the alarm banner colors through a script on each page"
      ],
      answer: 1,
      explain: [
        "Manual copies drift over time as people edit pages.",
        "Correct. A shared view is literally the same on every page, so consistency does not depend on discipline.",
        "Breakpoint containers swap layouts by width. They do not enforce sameness across pages.",
        "Colors and position are different issues, and scripts per page make drift worse."
      ]
    },
    {
      q: "A table shows five tank levels with varying digits, left-aligned. What change helps the operator compare magnitudes most?",
      options: [
        "Increase the font weight",
        "Right-align on the decimal point with a fixed number of decimals",
        "Center the values",
        "Add a different color for each row"
      ],
      answer: 1,
      explain: [
        "Weight does not help compare magnitudes.",
        "Correct. Aligned digits let the eye compare by length, in line with the tabular scanning that NN/g describes.",
        "Centered numbers make digits misalign.",
        "Row colors spend color and do not help comparison."
      ]
    },
    {
      q: "You are designing the Area10 mixing Level 2 screen. Which layout best supports the process?",
      options: [
        "Group by measurement type: all levels, all flows, all pressures",
        "Group by process step in flow order: Feed, Mix, Discharge, left to right",
        "Put all controls in one panel at the bottom",
        "Scatter symbols to fit the available space"
      ],
      answer: 1,
      explain: [
        "That follows the I/O list, not how operators think about the process.",
        "Correct. Process-order grouping reduces chunks, and left-to-right flow matches reading direction and P&IDs.",
        "Separating controls from their equipment breaks proximity.",
        "Scattered symbols have no grouping or alignment."
      ]
    },
    {
      q: "Which is the best statement about the Z-pattern?",
      options: [
        "NN/g proved it is how operators scan SCADA screens",
        "It is a design heuristic for sparse pages, and I did not find eye-tracking evidence establishing it, so do not rely on it for monitoring screens",
        "It means the bottom-right is the most important zone",
        "It replaces the F-pattern on all dense pages"
      ],
      answer: 1,
      explain: [
        "NN/g research does not claim this about operator screens, and operator behavior differs from web browsing.",
        "Correct. Treat it as a heuristic for simple layouts and do not build a control room standard on it.",
        "The pattern describes a scan path, not a ranking of zones.",
        "The F-pattern and Z-pattern describe different page types, and neither is a rule for monitoring screens."
      ]
    }
  ],

  resources: [
    { title: "F-Shaped Pattern For Reading Web Content (original eyetracking research)", url: "https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/", type: "article", source: "Nielsen Norman Group" },
    { title: "F-Shaped Pattern of Reading: Misunderstood, But Still Relevant", url: "https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/", type: "article", source: "Nielsen Norman Group" },
    { title: "Horizontal Attention Leans Left", url: "https://www.nngroup.com/articles/horizontal-attention-leans-left/", type: "article", source: "Nielsen Norman Group" },
    { title: "The Lawn Mower Eyetracking Pattern for Scanning Comparison Tables", url: "https://www.nngroup.com/articles/lawn-mower-pattern/", type: "article", source: "Nielsen Norman Group" },
    { title: "Proximity Principle in Visual Design", url: "https://www.nngroup.com/articles/gestalt-proximity/", type: "article", source: "Nielsen Norman Group" },
    { title: "Similarity Principle in Visual Design", url: "https://www.nngroup.com/articles/gestalt-similarity/", type: "article", source: "Nielsen Norman Group" },
    { title: "5 Principles of Visual Design in UX", url: "https://www.nngroup.com/articles/principles-visual-design/", type: "article", source: "Nielsen Norman Group" },
    { title: "Perspective - Column Container (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/components/perspective-components/perspective-container-palette/perspective-column-container", type: "docs", source: "Inductive Automation" }
  ]
});
