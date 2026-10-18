LC.lesson({
  id: "persp-library",
  title: "Building a reusable faceplate library",
  track: "persp",
  minutes: 35,
  level: 4,
  prereqs: ["persp-embedding", "persp-hphmi"],
  tags: ["perspective", "faceplate", "library", "udt", "inheritance", "style-classes", "versioning", "capstone"],
  summary: "The integrator's Perspective capstone: one library project that every site inherits, with motor, valve and analog faceplates driven by a single tag path.",
  objectives: [
    "Structure a library project that site projects inherit from",
    "Design a faceplate that takes one UDT instance path and derives everything else",
    "Open faceplates as popups from any screen with a standard pattern",
    "Define style classes and a tag-type to view mapping that keep the look consistent",
    "Version, document and release the library without breaking running sites",
    "Evaluate Ignition Exchange resources as starting points"
  ],

  body: `
## Why a library, and what goes in it

Your tenth site should cost a fraction of your first. That only happens when the screens, styles and faceplates are written once and inherited. In Ignition this is a **library project**: a normal project that holds views, style classes, scripts and themes, and is named as the **parent** of other projects. A {{term:project-inheritance|child project}} sees everything in its parent, can use it directly and can override pieces locally.

A good library holds four things:

1. **Faceplate views.** Motor, valve, analog instrument, PID loop, VFD, discrete sensor.
2. **Symbols and tiles.** Small views that show one device on a P&ID or a summary list.
3. **Style classes and theme.** Colors, fonts, spacing, state colors, all in one place. See {{lesson:persp-styles}}.
4. **Shared scripts.** Helper functions, kept few and cheap (see {{lesson:persp-performance}}).

Site projects hold only what is truly site-specific: the P&ID graphics, the page layout, the navigation and the tag providers.

{{diagram:library}}

> [!note] Inheritance and the Designer
> A child project shows inherited resources read-only. You can override one by copying it into the child, and from then on the child's version wins. Overrides are powerful and dangerous: every override is a fork you must maintain.

## One parameter drives the whole faceplate

The central pattern is that a faceplate takes a **single view parameter**: the path of the UDT instance. Everything else is derived from it.

\`\`\`text
View: Library/Faceplates/Motor
Params:  tagPath  (string)  e.g. [default]Plant1/Area10/Line1/M101
\`\`\`

Inside the view, each binding builds its tag path from that parameter with an indirect tag binding, for example a label bound to \`{view.params.tagPath}/Status/Running\`. In expression form:

\`\`\`text
tag({view.params.tagPath} + "/Status/Running")
\`\`\`

The UDT defines the member names (\`Status/Running\`, \`Status/Fault\`, \`Cmd/Start\`, \`Cmd/Stop\`, \`Cfg/Description\`, \`Cfg/Units\`). The faceplate depends on that contract, not on any particular motor. If your {{term:udt|UDT}} for motors has the same member names on every site, the same faceplate works everywhere. That makes **UDT design the real interface of the library**. Treat member names like an API: add members freely, never rename or remove one without a version bump. See {{lesson:ign-udts}}.

Perspective views take parameters as strings, numbers, objects and more, but there is no first-class "UDT" parameter type, so passing the path as a string and using indirect bindings is the standard approach. Dragging a UDT instance onto a view can map to a path parameter, which is a convenience in the Designer.

### Derive, do not pass

Resist adding parameters. If you find yourself passing \`tagPath\`, \`description\`, \`units\`, \`high limit\` and \`pump type\`, ask whether each lives in the UDT. If so, read it from the tag. One parameter means one thing to get wrong when the faceplate is dropped on a screen.

### Selecting the right faceplate by type

A generic open-faceplate action should not need an if-else tree. Use the UDT's type id to look up the view:

\`\`\`python
# Library script: library.faceplates
TYPE_TO_VIEW = {
    'Motor':   'Library/Faceplates/Motor',
    'Valve':   'Library/Faceplates/Valve',
    'Analog':  'Library/Faceplates/Analog',
    'PID':     'Library/Faceplates/PID',
}

def openFaceplate(tagPath):
    typeId = system.tag.getConfiguration(tagPath, False)[0]['typeId']  # UDT type of the instance
    view = TYPE_TO_VIEW.get(str(typeId).split('/')[-1], 'Library/Faceplates/Generic')
    system.perspective.openPopup(
        'fp-' + tagPath, view,
        params={'tagPath': tagPath},
        title=tagPath.split('/')[-1],
        modal=False)
\`\`\`

A single popup action on every symbol, \`library.faceplates.openFaceplate(self.view.params.tagPath)\`, now opens the right view for every device type. When you add a Heater type, you add one line in the map and one view. Keep the map in a dataset tag or a JSON resource if sites need to extend it without editing the library.

## Popups as faceplates

Operators expect a faceplate to appear over the current screen and to be ignored or dismissed quickly. A popup does that and keeps the underlying page alive.

- **Give each popup a unique id** based on the tag path (\`fp-\` plus the path). Opening the same device again focuses or replaces the existing popup, and opening a different device creates another. Without a stable id you get stacks of identical windows.
- **Non-modal for monitoring, modal for confirmation.** The faceplate itself is non-modal. A "Confirm stop" dialog opened from it is modal.
- **Position and size.** Standardize the size per device class so operators build muscle memory.
- **Close behavior.** Closing a popup disposes its bindings. That is a performance reason to prefer popups to always-open embedded views. See {{lesson:persp-navigation}}.
- **Touch.** Sizes that suit glove use also suit a mouse. See {{lesson:persp-mobile}}.

## Consistent look: style classes

All appearance flows from named {{term:style-class|style classes}}, never from per-component colors. A faceplate component says \`classes: "fp/value"\`, and the library defines what that means.

| Style class | Meaning | Notes |
|---|---|---|
| \`fp/title\` | Faceplate header | One font size across all |
| \`fp/value\` | Live number or text | Monospaced digits so numbers do not jitter |
| \`fp/label\` | Static caption | Muted |
| \`state/running\` | Equipment running | Per your HP-HMI color plan |
| \`state/stopped\` | Equipment stopped | Neutral gray |
| \`state/fault\` | Equipment faulted | Reserved for abnormal state |
| \`cmd/primary\` | Normal command button | Sized for touch |
| \`cmd/danger\` | Stop / trip command | Requires confirm |

Keep state colors few and meaningful per ISA-101 practice ({{lesson:persp-hphmi}}). A child project can change the theme, such as swapping a dark theme for a light one, without touching a single faceplate, because the faceplates only name classes. That is the payoff of the discipline.

> [!warning] No hard-coded colors in library views
> One \`#00FF00\` in a faceplate will survive every theme change and stand out as a bug at the next site. Review library views for literal colors before every release.

## Putting a motor faceplate together

A minimal motor faceplate, top to bottom:

1. **Header**: description from \`Cfg/Description\`, tag name small and muted.
2. **State**: Running, Stopped, Faulted, shown by a symbol and text (not color alone) with a state class chosen by an expression on \`Status/State\`.
3. **Live values**: speed, current, run hours.
4. **Commands**: Start, Stop, and a Local/Remote indicator. Commands are disabled when the device is in local mode or the user lacks the role.
5. **Interlocks and permissives**: a small list reading \`Status/Permissives\` bits.
6. **Trend**: a small Time Series Chart for current and speed, 15 minute window, with a capped row count. See {{lesson:persp-charts}}.
7. **Alarms**: a filtered alarm table for this path.

Commands should write to a command member (\`Cmd/Start\`), and the PLC logic decides whether to act. The HMI asks, the PLC decides. See {{lesson:plc-udt}}.

## Versioning the library

The library is shared infrastructure, so releases need the same discipline as any software.

- **Semantic versions.** Use MAJOR.MINOR.PATCH. A patch fixes a bug. A minor adds an optional parameter or a new faceplate. A major changes a parameter name or a UDT contract.
- **Keep the version visible.** Store it in a project resource or a tag and show it in an About popup, so a technician can say "site B is on 2.3.1."
- **Release by export.** Export the library project, tag it in source control and archive the file with release notes. Projects are stored as files on the Gateway, so Gateway projects can live in version control.
- **Staging before production.** Roll each release to a test Gateway first. Do not edit the production library directly.
- **One library, or one per site?** A single shared library on each site's Gateway means a site picks up a change by importing a new release. A library on a central Gateway shared over the Gateway network changes every site at once, which is convenient and dangerous. Most integrators release per site, on a schedule agreed with the plant.
- **Deprecate, do not delete.** Keep the old view for one major version with a note in its description, then remove it.

## Documenting it

A library nobody can use is a library nobody will use.

- A **catalog view** that shows every faceplate with live test tags, so a developer can see it before using it.
- A **README per faceplate**: purpose, parameters, UDT members required, style classes used.
- A **change log** with release notes and migration steps.
- **Naming rules**: views by type (\`Faceplates/Motor\`), classes with a prefix, parameters in camelCase.
- A **test project** that opens every faceplate against a simulated UDT instance. This is your regression test before release.

## Ignition Exchange as a source of examples

The Ignition Exchange offers community and vendor resources, many for Perspective: full projects, single views and templates. Treat them as examples to learn from or starting points to adapt, not as drop-in production code.

- Read the README the Exchange package includes, and check which Ignition version it targets.
- **Import with care.** Importing a package at the Gateway into an existing project can overwrite resources of the same name. Back up first. To bring in only part of a package, use the Designer's import and choose resources.
- Review scripts before you run them on a production Gateway. Treat them like any third party code.
- Fold what you keep into your library, renamed to your conventions and classes, so you own it.

## The capstone check

When you can answer yes to each, the library is ready for a second site:

1. Does every faceplate take exactly one required parameter, a UDT path?
2. Could another site with the same UDT member names use it unchanged?
3. Is every color and font in a style class, with none hard-coded?
4. Does one script or action open the correct faceplate for any device?
5. Is there a version number, a change log and a catalog view?
6. Does the library pass the same performance test as the rest of the project ({{lesson:persp-performance}})?
`,

  eli5: `
Picture a toy company that makes many different toys but wants every box to look the same. So they build one set of cardboard templates. There is a template for a box that holds a car, one for a doll, one for a puzzle. Every box has the same logo spot, the same colors and a label in the same place.

When a new toy arrives, a worker does not draw a new box. They pick the matching template and write just one thing on it: the toy's name. The box figures out the rest from the name, like the picture, the price and the age range, because that information is in the toy's file.

If the company decides to change its color, it changes the template stack once and every new box has the new color.

A factory screen library works the same way. One template per kind of machine, one name to fill in, and one place to change the colors.
`,

  why: `
**Why one parameter?** Every extra parameter is a chance for someone to wire up the wrong value at 2 a.m. during commissioning. If the tag path is the only input, and the UDT carries the description, units and limits, then a screen builder cannot mismatch them. The cost is that your UDT design must be disciplined, and that is where the effort belongs.

**Why inheritance rather than copying views?** Copies drift. A fix in site A never reaches site B, and after three years you have five motor faceplates that look alike but behave differently. Inheritance gives one fix, many beneficiaries. The tradeoff is blast radius: a bad library release can hurt every site that takes it. That is why releases are versioned, staged and scheduled.

**Why do integrators argue about overrides?** Overrides are the escape hatch that lets a site be different. They are also how a library dies. Some teams ban overrides and require a library change request. Others allow them but track every one in a list. The pragmatic middle is to allow overrides, record them, and review them at each major release to decide whether to pull the change back into the library.

**Why popups instead of embedded faceplates?** A popup creates its bindings when opened and releases them when closed. An always-embedded faceplate costs Gateway resources for every viewer even when nobody looks at it. At scale that matters.

**Why style classes and not property colors?** A theme change, an accessibility fix or a customer's brand request becomes a one-file edit instead of a hunt through hundreds of views.
`,

  history: `
Reusable symbol libraries predate HMI software: P&ID standards define symbols so any engineer can read any drawing. Vision offered templates and the Perspective equivalent is the embedded view with parameters, combined with project inheritance, which lets one project build on another. Community sharing grew through the Ignition Exchange, a place where users publish projects, views and tools.
`,

  examples: [
    {
      title: "A valve faceplate from one path",
      body: `A site drops a valve symbol on a P&ID and sets its parameter \`tagPath\` to \`[default]Plant1/Area2/XV-204\`. Clicking the symbol calls \`library.faceplates.openFaceplate\`. The type lookup returns the Valve view. The faceplate reads \`Cfg/Description\` ("Feed isolation valve"), shows \`Status/Position\` (Open, Closed, Travelling, Fault) as text and symbol, and enables Open and Close buttons from \`Status/Permissives\`. No other configuration was needed. A second site with the same UDT gets the identical faceplate on import of the library.`
    },
    {
      title: "Releasing version 2.4.0",
      body: `The team adds an optional "Maintenance mode" indicator to the Motor faceplate. Because it reads \`Status/MaintMode\` only if the member exists, older UDTs still work, so it is a minor version bump. The release notes say: "Motor 2.4.0: new Maintenance indicator; requires UDT Motor v1.3 or later for the indicator; no action for older UDTs." The library goes to a test Gateway, the catalog view is checked, and each site installs it at its next maintenance window.`
    }
  ],

  diagrams: {
    library: `<svg viewBox="0 0 640 270" role="img" aria-label="A library project holds faceplates, styles and scripts; three site projects inherit it and pass a single UDT path to each faceplate">
  <defs><marker id="persp-library-ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box-accent" x="170" y="20" width="300" height="90" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="46">Library project (v2.4.0)</text>
  <text class="dg-text-sm dg-mid" x="320" y="70">Faceplates: Motor, Valve, Analog, PID</text>
  <text class="dg-text-sm dg-mid" x="320" y="88">Style classes, theme, helper scripts</text>
  <rect class="dg-box" x="20" y="170" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="105" y="195">Site A project</text>
  <text class="dg-text-sm dg-mid" x="105" y="215">P&amp;IDs, pages</text>
  <rect class="dg-box" x="235" y="170" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="195">Site B project</text>
  <text class="dg-text-sm dg-mid" x="320" y="215">P&amp;IDs, pages</text>
  <rect class="dg-box" x="450" y="170" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="535" y="195">Site C project</text>
  <text class="dg-text-sm dg-mid" x="535" y="215">P&amp;IDs, pages</text>
  <line class="dg-line" x1="105" y1="170" x2="240" y2="112" marker-end="url(#persp-library-ah)"/>
  <line class="dg-line" x1="320" y1="170" x2="320" y2="112" marker-end="url(#persp-library-ah)"/>
  <line class="dg-line" x1="535" y1="170" x2="400" y2="112" marker-end="url(#persp-library-ah)"/>
  <text class="dg-text-muted" x="20" y="256">Sites inherit. One tagPath parameter per faceplate. Overrides are the exception.</text>
</svg>`
  },

  pitfalls: [
    "Passing five parameters to a faceplate when four of them already live in the UDT.",
    "Renaming a UDT member without a major version bump, silently breaking every faceplate that binds to it.",
    "Hard-coding colors or fonts in library views, which defeats theming.",
    "Editing the production library directly with no staging or version tag.",
    "Overriding library views at a site and never recording the fork.",
    "Importing an Exchange package straight into a live project and overwriting same-named resources.",
    "Embedding every faceplate on the page instead of opening them as popups."
  ],

  keyTerms: ["faceplate", "project-inheritance", "udt", "style-class", "view-params", "semantic-versioning", "ignition-exchange", "indirect-tag-binding"],

  quiz: [
    {
      q: "A Motor faceplate takes tagPath, description, units, highLimit and motorType as five parameters. What is the better design?",
      options: ["Keep all five for flexibility", "Pass only tagPath and read description, units and limits from the UDT's members", "Pass a JSON blob of all five", "Make the operator type them in"],
      answer: 1,
      explain: [
        "More parameters mean more places for a wrong value, especially during commissioning.",
        "Correct. The UDT already carries the data, so one path derives everything and cannot be mismatched.",
        "A blob is still five values that can be wrong or out of date.",
        "Typing invites mistakes and makes the screen unusable."
      ]
    },
    {
      q: "You rename the UDT member Status/Running to Status/IsRunning to match a new naming standard. What is the consequence for the library?",
      options: ["None; bindings update automatically", "Every faceplate binding to Status/Running breaks, so it needs a major version bump and migration", "Only popups are affected", "Only style classes are affected"],
      answer: 1,
      explain: [
        "Indirect bindings use the string path. They do not follow renames.",
        "Correct. UDT member names are the library's API, so changing one is a breaking change.",
        "Any binding to that member is affected, popup or not.",
        "Style classes do not reference tag members."
      ]
    },
    {
      q: "Why open a faceplate as a popup with an id built from the tag path?",
      options: ["Popups are required for faceplates", "Opening the same device again reuses the same popup instead of stacking duplicates, and bindings are released on close", "It makes the faceplate read-only", "It avoids needing a view"],
      answer: 1,
      explain: [
        "They are a good pattern, not a requirement.",
        "Correct. A stable id prevents duplicate windows, and closing frees the Gateway resources.",
        "Popups can write if the view and user permissions allow.",
        "A popup still opens a view."
      ]
    },
    {
      q: "A site needs a different brand color scheme for all faceplates. How does a well-built library handle it?",
      options: ["Edit every faceplate in the child project", "Change the theme or style class definitions, since faceplates only reference class names", "Delete the library and rebuild", "Use per-component color properties"],
      answer: 1,
      explain: [
        "That creates dozens of overrides to maintain.",
        "Correct. Appearance lives in styles, so one change restyles every faceplate.",
        "Far too destructive for a color change.",
        "Per-component colors are exactly what the style class approach avoids."
      ]
    },
    {
      q: "You add an optional Maintenance indicator that only appears if the UDT has the new member. Which version bump is right under semantic versioning?",
      options: ["Major", "Minor", "Patch", "No bump"],
      answer: 1,
      explain: [
        "Major is for breaking changes. This is backward compatible.",
        "Correct. New optional functionality that keeps old UDTs working is a minor release.",
        "Patch is for bug fixes with no new function.",
        "Any shipped change needs a version so sites can tell what they have."
      ]
    },
    {
      q: "You download an Exchange project and import it at the Gateway into your live project, which has a view of the same name. What can happen?",
      options: ["Nothing; imports are always merged", "The same-named resources are overwritten, so back up first or import selected resources through the Designer", "Only styles are overwritten", "The Gateway rejects the import"],
      answer: 1,
      explain: [
        "Gateway import does not merge differing resources by content.",
        "Correct. Same-named resources in the target project are overwritten. Back up and prefer selective Designer import.",
        "Views and other resources are affected too.",
        "The Gateway accepts the package and applies it."
      ]
    }
  ],

  resources: [
    { title: "Ignition Exchange (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/gateway/ignition-exchange", type: "docs", source: "Inductive Automation" },
    { title: "Projects (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/projects", type: "docs", source: "Inductive Automation" },
    { title: "Style Classes (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/styles/style-classes", type: "docs", source: "Inductive Automation" },
    { title: "User Defined Types - UDTs (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/user-defined-types-udts", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Exchange Resource Showcase", url: "https://inductiveautomation.com/resources/icc/2023/ignition-exchange-resource-showcase", type: "video", source: "Inductive Automation" },
    { title: "UDT Parameter on Perspective view", url: "https://forum.inductiveautomation.com/t/udt-parameter-on-perspective-view/23061", type: "forum", source: "Inductive Automation Forum" },
    { title: "How to pass tags into a popup perspective", url: "https://forum.inductiveautomation.com/t/how-to-pass-tags-into-a-popup-perspective/68950", type: "forum", source: "Inductive Automation Forum" },
    { title: "Lost my Perspective views after Exchange download", url: "https://forum.inductiveautomation.com/t/lost-my-perspective-views-after-exchange-download/93227", type: "forum", source: "Inductive Automation Forum" }
  ]
});
