LC.lesson({
  id: "persp-navigation",
  title: "Sessions, pages, docks and popups",
  track: "persp",
  minutes: 25,
  level: 2,
  prereqs: ["persp-containers"],
  tags: ["perspective", "session", "navigation", "popups", "docks", "pages"],
  summary: "A Perspective app is a server-side session wearing a browser tab. Learn what lives in the session, how URLs map to views, and how to build navigation that survives refresh, bookmarks and multiple monitors.",
  objectives: [
    "Explain what a Perspective session is, where it lives, and what ends it",
    "Use session props and session.custom as shared state, and know when not to",
    "Configure pages with URL patterns, path parameters and a primary view",
    "Design a shared docked header and nav that does not reload on every page change",
    "Open, close and parameterize popups from actions and from system.perspective.openPopup",
    "Choose between page, view and URL navigation, and plan for multi-monitor stations"
  ],

  body: `
## Why navigation is an architecture topic

Anyone can drop a navigation button on a view. The expert question is where state lives when the operator moves around. Perspective is not a page-per-URL website. It is a long-lived {{term:persp-session|session}} on the Gateway, and the browser is a thin display for it. Pages, docks and popups are all just ways of choosing which views that session shows. If you understand the session, navigation design gets much simpler and many "weird" behaviors (state surviving, popups lingering, a refresh losing something) make sense.

## The session

When a browser tab opens a Perspective project, the Gateway creates a **session**. It is an object on the server that holds:

- **Session props** (\`session.props\`): built-in, mostly read-only facts such as the authenticated user, the device type, locale and time zone, and the session id.
- **Custom session props** (\`session.custom\`): a free-form object you define in the Designer under Session Props. Any view in that session can bind to it.
- The list of open pages and popups, and their view instances.
- The session's event scripts (startup, shutdown, message handlers).

Each browser tab or window is its own session. Two tabs open to the same URL are two independent sessions with independent state. A refresh creates a new session, which is why anything the operator needs to survive a refresh must come from a tag, a database or the URL, not from session or view state.

{{diagram:session}}

Session props are the right home for small, operator-scoped context: the selected area, the shift, a preferred units system. They are the wrong home for anything another session needs to see, and the wrong home for process values. Use {{term:tag|tags}} for those. A good test: if two operators on different screens should both see the change, it does not belong in \`session.custom\`.

> [!tip] One bind, many views
> Put "selected equipment path" in \`session.custom.selectedPath\` and let the faceplate popup, the trend and the alarm table all bind to it. Writing it once from a nav tree beats passing the same parameter through four views.

## Pages and URLs

A **page** is a URL pattern mapped to a primary view. They are defined in {{term:page-configuration|page configuration}}. A few rules matter in practice:

| Piece | Example | Note |
|---|---|---|
| Page URL | \`/area/:line\` | The part after the colon is a **path parameter** |
| Primary view | \`Screens/LineOverview\` | The view shown in the main area |
| Query string | \`?shift=B\` | Reachable on the page, not a view param by default |
| Home page | \`/\` | What opens when no path is given |

Path parameters are passed into the page's primary view when the names match the view's params, so \`/area/L3\` can open the same overview view with \`line = "L3"\`. Characters like \`/\` and \`?\` are not valid inside a parameter value. The URL is also the only thing a user can bookmark or send in a message, so a view that needs context to render should get it from the URL or a tag, not from state a refresh would erase.

> [!note] In 8.1
> The page and navigation model is the same in 8.1. The main differences you will notice are in the Designer UI layout and in how some settings are grouped. The scripting calls below work the same way.

### Navigating

There are three ways to move, in order of preference:

1. **Navigation action** on a button or menu (Navigate to page). Declarative, no script, easy to audit.
2. **\`system.perspective.navigate(page=...)\`** from a script when the destination depends on logic.
3. **\`navigate(url=...)\`** for full URLs, including query strings or leaving the session for another site.

If you pass several arguments, \`page\` wins over \`view\`, which wins over \`url\`. The \`view\` form swaps the primary view without changing the URL; it works, but the address bar no longer describes what the user sees, which breaks bookmarks and the back button. Use it sparingly.

\`\`\`python
# Button script: jump to the overview for the clicked line
line = self.view.params.line
system.perspective.navigate(page="/area/" + line)
\`\`\`

## Docked views

A {{term:docked-view|docked view}} is a view attached to the north, south, east or west edge of a page. Each edge holds one. The classic uses are a north header with logo, alarm count and user, and a west navigation tree. Key settings:

- **Display**: visible (always open), onDemand (collapsed with a handle), or auto (responds to screen size).
- **Content**: push (resizes the primary view) or cover (overlays it).
- **Size** and handle visibility.
- **Dock ID**: an optional string that lets \`openDock\`, \`closeDock\` and \`toggleDock\` find it from a script.

Define docks in **Shared Settings** so they apply to every page. The dock view instance stays alive while the page content changes, which is the whole point. A header that keeps its alarm summary subscription and scroll state across navigations is cheaper and calmer than one reloaded on every click.

> [!warning] Don't hide context in the dock
> If the dock holds the nav tree, the selected node should be driven by the page URL (or \`session.custom\`), not by clicks inside the dock. Otherwise a bookmarked deep link opens a page with the wrong tree node highlighted.

## Popups

A {{term:popup-view|popup}} floats over the current page. You can open it from a Popup action or from a script:

\`\`\`python
system.perspective.openPopup(
    id="motor-" + self.view.params.tag,   # unique per instance
    viewPath="Faceplates/Motor",
    params={"tagPath": self.view.params.tagPath},
    title="Pump 101",
    modal=False, draggable=True, resizable=True,
    position={"left": 120, "top": 80}
)
\`\`\`

The **id** is what you need later to close or toggle the popup, so build one from the data (equipment tag) and the same equipment will not open twice. Useful options: \`modal\` (blocks the page behind it), \`backgroundDismissible\`, \`showCloseIcon\`, and \`viewportBound\` to keep it on screen. Params go in as view params, so a popup is a normal parameterized view and works with the same indirect-tag patterns as an embedded view.

Modal popups suit confirmations and setpoint entry. Modeless popups suit faceplates, which operators often want two or three of at once.

## Multiple monitors and workstations

A control room often has four screens. The browser does not know that, so each screen is a separate window and a separate session. Two ways to coordinate:

- **Shared tags**: a memory tag like \`[default]UI/Console1/SelectedArea\` that every screen binds to. This survives refresh and is visible to all sessions.
- **Targeted calls**: \`navigate\` and \`openPopup\` accept \`sessionId\` and \`pageId\` so a script (often on the Gateway) can push a screen to another window. You must supply both IDs.

For kiosk-style stations, give each monitor its own URL (\`/console1/left\`, \`/console1/right\`) and set the home page from the launcher. The mobile and Workstation specifics are covered in {{lesson:persp-mobile}}.

## Worked example: a plant nav

- Shared north dock \`Chrome/Header\`: logo, user, alarm summary, with a Dock ID of \`header\`.
- Shared west dock \`Chrome/NavTree\`, onDemand, push, bound to \`session.custom.area\`.
- Pages: \`/\` (overview), \`/area/:area\` (Area view), \`/trend\`.
- Equipment symbol click: \`openPopup(id=tagPath, viewPath="Faceplates/Motor", params={tagPath})\`.
- Alarm banner click: navigate to \`/area/\` plus the alarm's area, then open the popup.

Nothing in that design needs a script outside the two click handlers, and it still works from a bookmark, a refresh and a second screen.
`,

  eli5: `
Think of a hotel concierge desk. When you walk in, the hotel gives you a personal assistant, and that assistant keeps notes about you: your name, your room, what you asked for. That assistant is your session. It lives in the hotel, not in your pocket. If you leave and come back through the door again, you get a brand new assistant who knows nothing.

The hotel has a map on the wall that says "ask for the pool and you're sent to this room." That's the list of pages. Each address on the map leads to one room.

The sign above the front door and the lift buttons never change as you walk to different rooms. Those are the docks. And when you want a quick look at something, the assistant holds up a card in front of you without moving you anywhere. That card is a popup.

If two of your friends each come in, each gets their own assistant. They don't share notes unless they write on the hotel's shared whiteboard, and that's what a tag is.
`,

  why: `
**Why a server-side session?** Perspective keeps the logic, the bindings and the scripts on the Gateway, and sends the browser only the instructions to draw. That makes the client thin and lets the same project run on a phone, a wall panel and a laptop. The price is that the Gateway carries per-session memory and CPU, so a heavy view opened by 80 operators is 80 copies. Navigation choices (reuse of docks, not opening ten popups per click) are performance choices.

**Why URLs matter more than they look.** Operators bookmark pages, text each other links and refresh when something looks stuck. If your design stores "where am I" only in session state, every one of those actions loses it. Treat the URL as the source of truth for location and a tag for anything shared, and keep \`session.custom\` for per-operator preferences.

**Why shared docks?** The alternative is putting the header on every view. Then a change to the header is a change to forty views, and each navigation tears down and rebuilds it. A dock is built once and persists. The tradeoff is that a dock is a long-lived view with no natural lifecycle, so be careful with expensive bindings in it.

**What integrators argue about:** popups versus pages for faceplates (popups are fast and contextual, but operators lose track of them, so cap how many can open), and whether to use the \`view\` navigation form (flexible, but breaks the URL contract). Many teams ban it for anything but test screens.
`,

  history: `
Ignition's older Vision client was a Java application that opened windows on the operator's PC, so "navigation" meant swapping windows locally. Perspective, introduced as a web-native module in Ignition 8, moved the interface to the browser with a Gateway-side session. URLs, docks and popups follow web conventions, which is why browser buttons and bookmarks behave the way they do.
`,

  examples: [
    {
      title: "Deep link from an alarm",
      body: `An alarm notification email contains \`https://gateway.example.com/data/perspective/client/Plant/area/L3?focus=P101\`. The page config \`/area/:area\` opens the overview with \`area = "L3"\`, and a startup script on the view reads the query value and calls \`openPopup\` for P101. The operator lands on the right screen with the right faceplate open, in one click.`
    },
    {
      title: "Two-monitor console",
      body: `A console has left and right 4K screens. Left runs \`/console1/overview\`, right runs \`/console1/detail\`. Both bind their selection to the memory tag \`[default]UI/Console1/SelectedArea\`. Clicking a unit on the left changes the tag, and the right screen's bindings follow it without any cross-session scripting.`
    }
  ],

  diagrams: {
    session: `<svg viewBox="0 0 640 250" role="img" aria-label="A browser tab connects to a Gateway session that holds session props, custom props, pages, docks and popups">
  <defs>
    <marker id="persp-nav-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box" x="20" y="50" width="150" height="150" rx="6"/>
  <text class="dg-title" x="36" y="78">Browser tab</text>
  <text class="dg-text-sm" x="36" y="104">Draws the view</text>
  <text class="dg-text-sm" x="36" y="124">Sends clicks</text>
  <text class="dg-text-sm" x="36" y="144">Holds no logic</text>
  <text class="dg-text-muted" x="36" y="180">Refresh = new session</text>
  <line class="dg-line" x1="170" y1="110" x2="236" y2="110" marker-end="url(#persp-nav-ah)"/>
  <line class="dg-line" x1="236" y1="140" x2="170" y2="140" marker-end="url(#persp-nav-ah)"/>
  <rect class="dg-zone" x="240" y="20" width="380" height="215" rx="8"/>
  <text class="dg-title" x="256" y="44">Gateway: one session per tab</text>
  <rect class="dg-box-accent" x="256" y="58" width="168" height="52" rx="4"/>
  <text class="dg-text-sm" x="268" y="80">session.props</text>
  <text class="dg-text-muted" x="268" y="98">user, device, locale</text>
  <rect class="dg-box-accent" x="436" y="58" width="168" height="52" rx="4"/>
  <text class="dg-text-sm" x="448" y="80">session.custom</text>
  <text class="dg-text-muted" x="448" y="98">your shared state</text>
  <rect class="dg-box" x="256" y="122" width="168" height="48" rx="4"/>
  <text class="dg-text-sm" x="268" y="143">Page + docks</text>
  <text class="dg-text-muted" x="268" y="160">URL to primary view</text>
  <rect class="dg-box" x="436" y="122" width="168" height="48" rx="4"/>
  <text class="dg-text-sm" x="448" y="143">Popups</text>
  <text class="dg-text-muted" x="448" y="160">opened by id</text>
  <rect class="dg-box" x="256" y="182" width="348" height="40" rx="4"/>
  <text class="dg-text-sm" x="268" y="207">Session scripts and message handlers</text>
</svg>`
  },

  pitfalls: [
    "Storing process-visible or multi-user state in session.custom. Other sessions cannot see it. Use a tag.",
    "Relying on view navigation (the view argument) and then wondering why bookmarks and the back button misbehave.",
    "Opening popups with a constant id for different equipment, so each click replaces the last one. Build the id from the data.",
    "Putting expensive bindings (large tables, charts) in a docked view. It stays alive for the whole session.",
    "Trying to navigate or open popups in another session without supplying both sessionId and pageId."
  ],

  keyTerms: ["persp-session", "session-props", "page-configuration", "docked-view", "popup-view", "tag"],

  quiz: [
    {
      q: "An operator refreshes the browser and their selected area resets, although the plant data is fine. Where was the selection most likely stored?",
      options: ["In a memory tag", "In session.custom or a view property", "In the page URL", "In the Gateway database"],
      answer: 1,
      explain: [
        "Tags live on the Gateway independent of any session, so a refresh would not reset them.",
        "Correct. A refresh creates a brand new session, so session and view state starts from its defaults.",
        "Anything in the URL is rebuilt from the address on refresh, so it would survive.",
        "Database values are unaffected by the browser."
      ]
    },
    {
      q: "Two control-room screens must always show the same selected area. What is the simplest robust design?",
      options: ["Copy session.custom between sessions with a timer script", "Bind both screens to a shared memory tag", "Use the same browser profile on both", "Open the second screen as a popup of the first"],
      answer: 1,
      explain: [
        "That is fragile, adds latency and needs cross-session scripting.",
        "Correct. A tag is session-independent, survives refresh and all bound screens update together.",
        "A shared browser profile does not share server-side session state.",
        "A popup is in the same session, but it can't be placed on the second monitor like a separate window."
      ]
    },
    {
      q: "You call system.perspective.navigate with both page and url arguments. What happens?",
      options: ["It errors", "The url is used", "The page argument takes priority", "Both open, in two tabs"],
      answer: 2,
      explain: [
        "It does not error. It resolves the conflict by a fixed priority.",
        "url has the lowest priority of the three navigation arguments.",
        "Correct. Priority is page, then view, then url.",
        "Only the newTab option opens another tab, and only for the one chosen destination."
      ]
    },
    {
      q: "Why build a popup id from the equipment tag path instead of a fixed string?",
      options: ["Popup ids must contain a slash", "So the same equipment does not open twice and each popup can be closed individually", "It makes the popup modal", "Fixed ids are not allowed"],
      answer: 1,
      explain: [
        "There is no such rule.",
        "Correct. A unique, data-derived id lets you target, toggle or close the right popup, and re-opening the same equipment reuses the same id.",
        "Modality is a separate option.",
        "Fixed ids are allowed, but every open would collide with the previous one."
      ]
    },
    {
      q: "What is the main advantage of defining a header as a shared docked view instead of embedding it in every page's primary view?",
      options: ["It is not subject to security zones", "It is built once and persists across page changes, and edits happen in one place", "Docks run on the client, so they cost no Gateway CPU", "Docks can show more components"],
      answer: 1,
      explain: [
        "Docks follow the same security as other views.",
        "Correct. It avoids rebuilding it on every navigation and avoids editing many views.",
        "All Perspective views run on the Gateway, docks included.",
        "A dock is a normal view with the same component limits."
      ]
    },
    {
      q: "A script on the Gateway needs to open a faceplate popup on a specific operator's screen. What must it supply?",
      options: ["Only the view path", "The user name", "sessionId and pageId", "The popup's position"],
      answer: 2,
      explain: [
        "Without session targeting, the call has no idea which screen to use.",
        "Perspective addresses sessions by id, not by user name.",
        "Correct. Out-of-session calls need both IDs to find the session and the page.",
        "Position is optional and unrelated to targeting."
      ]
    }
  ],

  resources: [
    { title: "Perspective Sessions (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/perspective-sessions", type: "docs", source: "Inductive Automation" },
    { title: "Docked Views (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/views-in-perspective/docked-views", type: "docs", source: "Inductive Automation" },
    { title: "Popup Views (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/views-in-perspective/popup-views", type: "docs", source: "Inductive Automation" },
    { title: "system.perspective.openPopup", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-perspective/system-perspective-openPopup", type: "docs", source: "Inductive Automation" },
    { title: "system.perspective.navigate", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-perspective/system-perspective-navigate", type: "docs", source: "Inductive Automation" },
    { title: "Pages in Perspective", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/pages-in-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Scripting Navigation in Perspective", url: "https://forum.inductiveautomation.com/t/scripting-navigation-in-perspective/81857", type: "forum", source: "Inductive Automation Forum" }
  ]
});
