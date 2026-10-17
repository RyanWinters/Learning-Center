LC.lesson({
  id: "persp-performance",
  title: "Performance and scale",
  track: "persp",
  minutes: 25,
  level: 4,
  prereqs: ["persp-embedding", "persp-events"],
  tags: ["perspective", "performance", "scale", "gateway", "bindings", "diagnostics", "load-testing"],
  summary: "In Perspective the Gateway does the work for every viewer. Learn what each session costs, how to measure it and how to design for hundreds of them.",
  objectives: [
    "Explain why Perspective load scales with sessions and what each session costs the Gateway",
    "Rank binding, transform and script patterns by cost and pick the cheaper one",
    "Use the Gateway status and diagnostics pages and a thread dump to find a hot spot",
    "Apply named query caching and tag bindings in place of polling",
    "Plan and run a load test before a site goes live"
  ],

  body: `
## The Gateway is the client's CPU

A Perspective client is mostly a display. Bindings, expression evaluation, transforms, scripts and tag subscriptions run **on the Gateway**, once per session. The browser only draws what the Gateway sends. That is why a project that feels fine with five users can bring a server to its knees with 150. Load is roughly **sessions times what each session does**, so the lever is almost always "do less per session" or "share the work across sessions".

A {{term:perspective-session|session}} lives from page open to page close or timeout. Each open view in a session holds its own bindings, its own tag subscriptions and its own memory. A wall display that sits on a busy overview screen 24 hours a day is the most expensive user you have.

## What costs what

{{diagram:cost}}

Think of costs in layers, from cheapest to most expensive.

| Pattern | Cost per session | Notes |
|---|---|---|
| Static property | Almost none | Computed once |
| {{term:persp-tag-binding|Tag binding}} (direct) | Low | Gateway subscribes; updates only on change; subscriptions are shared with other sessions looking at the same tag |
| Expression binding on tag values | Low to medium | Re-evaluates when any input changes |
| Property or view parameter binding chain | Medium | Each link re-evaluates when its source changes |
| Query binding with a polling rate | Medium to high | Runs every N seconds per session, hits the database each time unless cached |
| Script transform in Jython | High | Interpreter call on every input change; blocks a thread while it runs |
| \`runScript()\` expression | High | Calls a project library script from an expression, repeatedly |
| Tag history binding on a fast refresh | High | Every refresh reads the historian for every viewer |

The three that cause most trouble in the field:

1. **Polling query bindings.** A named query bound with a 1-second poll in 100 sessions is 100 database queries per second, all for data that changes once a minute.
2. **Script transforms in repeated components.** A flex repeater with 200 instances, each with a script transform that fires on every tag change, can mean thousands of interpreter calls per second.
3. **\`runScript\` in expressions.** It looks tidy, but it runs your script whenever its arguments change, and it holds a Gateway thread. A library function that opens a database connection becomes a hidden polling loop.

## Prefer subscriptions to polling

A **tag binding** asks the Gateway to subscribe once and push updates when a value changes. Many sessions on the same tag share one subscription. A **polling** binding asks again and again whether or not anything changed.

> [!tip] Move data into tags, then bind
> If forty views need "number of open work orders", do not query the database forty times. Run one Gateway script on a timer or a gateway event, write the count to a memory tag, and bind every view to that tag. The database sees one query. Sessions see a cheap push.

Rules of thumb that senior integrators repeat:

- **Tag bindings over polling queries** for anything that already exists as a tag.
- **Expressions over scripts.** An expression is evaluated by the Gateway's expression engine and is far cheaper than a Jython call. If \`if(\${tag} > 80, 'hot', 'ok')\` will do, do not write a script transform.
- **Avoid \`runScript\`** except for work that needs it. Replace with a tag, an expression or a property computed once on view load.
- **Do heavy work once, share the result.** Computation that is identical for every session belongs in the Gateway scope (a timer script, a tag change script), not in each view.
- **Use indirect bindings sparingly** in repeated components. Each is a separate subscription to resolve.

## Named query caching

{{term:named-query-cache|Caching}} on a named query lets the Gateway reuse a result for a set time instead of hitting the database. A reporting query behind a 30 second poll, with a cache lifetime of 30 seconds, hits the database once per half minute for everyone. Caching only helps when the data is identical for every caller. A query with a per-user parameter makes a separate cache entry for each distinct value. And a cache hides changes: if someone edits the table, viewers see the old data until the lifetime ends. A scripting call exists to clear named query caches when you need to force a refresh, so a save button can clear the cache for the data it just changed.

## Embedded views and repeaters

Every embedded view is a full view with its own bindings. Fifty embedded motor faceplates on one page are fifty sets of bindings. Practical limits:

- Show **summary tiles** in the list and open the detailed faceplate on demand, in a popup.
- Keep each embedded view light: a few bindings, no scripts.
- Place simple symbols directly on the page rather than wrapping each in a view when no reuse is needed. Embedding has a cost even with nothing in it.
- Be aware of view **load-ahead** behavior and test load time on a real network, not on localhost.

Details of embedding are in {{lesson:persp-embedding}}.

## Diagnosing a slow system

Guessing wastes days. Measure.

1. **Gateway status pages.** The status section of the Gateway web page shows CPU and memory, the list of active Perspective sessions, database connection status and script performance figures. Start with CPU and memory over time, then sessions: how many are open, who owns the oldest, which screens they are on.
2. **Session count and ownership.** A hundred sessions with 70 idle on a hidden browser tab still hold their subscriptions. Set a session timeout and make sure kiosks recover from a Gateway restart.
3. **Thread viewer and thread dump.** When CPU spikes, take a thread dump (the Gateway diagnostics threads page, or \`system.util.threadDump()\` triggered from a script). Threads parked in your library script names, in database drivers or in the historian tell you who is eating time. Take two or three dumps a few seconds apart. A thread that appears in all of them is the culprit.
4. **Time your own code.** Wrap suspect functions with \`java.lang.System.nanoTime()\` or \`time.time()\` and log durations above a threshold with \`system.util.getLogger\`. The Gateway's script performance figures also point to hot library functions.
5. **Database side.** Check the database for slow or repeated queries. A Gateway that looks busy may be waiting on a lock.

> [!example] Finding a runScript hot spot
> CPU sits at 75% with 60 sessions. Three thread dumps all show a thread inside \`project.utils.formatAlarmText\`, called from a binding. The overview binds a label expression to \`runScript("project.utils.formatAlarmText", 0, {Alarm.Priority})\` in a 120-item repeater. Replace it with an expression using \`if()\` and \`concat()\` and CPU drops to 25%. The same output, no interpreter calls.

## Designing for hundreds of sessions

When the plan is a couple of hundred concurrent sessions, make these choices up front.

- **Size the Gateway.** CPU cores, heap and a fast disk for the historian. Give the Java heap enough room without choosing a size so large that garbage collection pauses hurt. Follow the manual's sizing guidance and then measure.
- **Separate roles.** Put the database, historian and heavy reporting on their own servers. Consider a front-end Gateway for Perspective sessions that reads from a back-end Gateway that owns tags and drivers. See {{lesson:arch-patterns}}.
- **Make screens cheap by default.** Overview screens use tag bindings and expressions only. Details open on demand.
- **Avoid per-session timers.** Ten timers per view times 200 sessions is 2,000 timers.
- **Keep alarm displays efficient.** Use the alarm status table with sensible filters rather than custom polling of the alarm journal.
- **Control history queries.** Cap trend windows and row counts. See {{lesson:persp-charts}}.

## Load testing

Do not learn your limit on go-live day.

1. **Define a scenario.** For example: 150 operators, each on one of 12 screens, 20% open a trend popup every 10 minutes, 10% acknowledge an alarm every minute.
2. **Replay or simulate.** Open many real sessions with scripted browsers or a load tool, driving realistic actions. Browser automation is slow to scale, so put each simulated client on separate machines.
3. **Instrument.** Record Gateway CPU, heap, garbage collection, thread count, database connections and response time of key actions while the test runs.
4. **Ramp and soak.** Increase sessions in steps and then hold the peak for hours. Memory leaks and unreleased subscriptions show up in the soak, not the ramp.
5. **Test the bad day.** Kill the database, restart the Gateway and watch 150 sessions reconnect at once. The reconnect storm is often the real peak.
6. **Record the result** as a baseline, so a future change can be compared to it.
`,

  eli5: `
Imagine a restaurant with one cook. Each customer at a table can ask the cook to do things. Some requests are easy: "Please tell me when my soup is ready." The cook does it once and calls out when it happens. Other requests are painful: "Every second, go check whether the oven is hot and tell me."

If five customers ask the painful way, the cook is busy but fine. If a hundred and fifty customers ask the painful way, the cook does nothing but check ovens and nobody gets dinner.

Making the restaurant work for a crowd means three things. Ask the "tell me when it changes" way. If a hundred people want to know the same thing, have the cook check once and shout it to the whole room. And watch the cook: when the kitchen gets slow, look at what the cook is stuck doing, instead of guessing.
`,

  why: `
**Why is Perspective expensive per session when Vision was not?** Vision clients ran logic on each user's PC. Perspective moved it all to the Gateway so that nothing needs installing and logic is secured in one place. The price is that every viewer consumes Gateway resources. You gain deployment ease and pay in server capacity and in design discipline.

**Why prefer expressions and tag bindings over scripts?** They are evaluated by optimized engines and share subscriptions, so cost scales with changes, not with sessions times time. A script transform is a Jython call and a thread. Used once it is nothing. Used 200 times per page across 100 sessions it dominates.

**Why do experienced integrators argue about caching?** Caching saves the database and hides staleness. A cache of 60 seconds is fine for a daily summary and wrong for a lockout status. The argument is not whether to cache but which data tolerates being old, and who gets blamed when it is.

**Why a thread dump before a rewrite?** Because intuition about hot spots is wrong more often than right. A dump costs a minute and tells you which function is stuck. Without it, teams rewrite the wrong screen for a week.

**Why load test with realistic behavior?** Because the peak is rarely steady state. It is a shift change, an alarm flood or a restart with everyone reconnecting. A test that replays only quiet browsing gives false comfort.
`,

  history: `
Vision scaled by pushing work to client PCs, which limited how many Gateway resources one user took but made deployment painful. Perspective inverted that tradeoff in Ignition 8.0 with browser clients. Inductive Automation published performance guidance and forum threads about session cost grew with real deployments of hundreds of sessions.
`,

  examples: [
    {
      title: "Replacing a polling query with a tag",
      body: `A header banner shows "Open work orders: 14" using a named query polled every 2 seconds. With 120 operators that is 60 queries per second against the maintenance database. Replace it: a Gateway timer script runs the query every 30 seconds with \`system.db.runNamedQuery\`, writes the count to a memory tag \`[default]Site/OpenWorkOrders\`, and the banner binds to that tag. Database load drops from 60 queries per second to about 0.03, and the number is at most 30 seconds old.`
    },
    {
      title: "A reconnect storm",
      body: `After a planned Gateway restart, 180 sessions reconnect within a minute. Every session reloads its views, each running several named queries with a cold cache. Database connections hit the pool maximum and views stall for two minutes. The fix: pre-warm shared caches with a startup script, raise the pool size to match the database capacity, and stagger kiosk reconnects.`
    }
  ],

  diagrams: {
    cost: `<svg viewBox="0 0 640 250" role="img" aria-label="Sessions share the Gateway: tag subscriptions are shared and cheap, polling queries and script transforms run per session and cost more">
  <defs><marker id="persp-performance-ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-box" x="20" y="30" width="140" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="90" y="60">Session 1</text>
  <rect class="dg-box" x="20" y="95" width="140" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="90" y="125">Session 2</text>
  <rect class="dg-box" x="20" y="160" width="140" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="90" y="190">Session N</text>
  <rect class="dg-box-accent" x="240" y="30" width="170" height="60" rx="6"/>
  <text class="dg-text dg-mid" x="325" y="56">Tag subscription</text>
  <text class="dg-text-sm dg-mid" x="325" y="76">shared, on change</text>
  <rect class="dg-box-warn" x="240" y="105" width="170" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="325" y="128">Polling query</text>
  <text class="dg-text-sm dg-mid" x="325" y="146">per session, per tick</text>
  <rect class="dg-box-alarm" x="240" y="170" width="170" height="50" rx="6"/>
  <text class="dg-text dg-mid" x="325" y="193">Script transform</text>
  <text class="dg-text-sm dg-mid" x="325" y="211">per session, per change</text>
  <rect class="dg-box-2" x="480" y="60" width="140" height="130" rx="6"/>
  <text class="dg-title dg-mid" x="550" y="100">Gateway</text>
  <text class="dg-text-sm dg-mid" x="550" y="125">threads, heap</text>
  <text class="dg-text-sm dg-mid" x="550" y="145">DB pool</text>
  <line class="dg-line" x1="160" y1="55" x2="238" y2="60" marker-end="url(#persp-performance-ah)"/>
  <line class="dg-line" x1="160" y1="120" x2="238" y2="130" marker-end="url(#persp-performance-ah)"/>
  <line class="dg-line" x1="160" y1="185" x2="238" y2="195" marker-end="url(#persp-performance-ah)"/>
  <line class="dg-line" x1="410" y1="60" x2="478" y2="100" marker-end="url(#persp-performance-ah)"/>
  <line class="dg-line" x1="410" y1="130" x2="478" y2="130" marker-end="url(#persp-performance-ah)"/>
  <line class="dg-line" x1="410" y1="195" x2="478" y2="160" marker-end="url(#persp-performance-ah)"/>
  <text class="dg-text-muted" x="240" y="242">Cost grows with sessions x work per session</text>
</svg>`
  },

  pitfalls: [
    "Polling a named query every second from every session for data that changes every minute.",
    "Using runScript() in an expression inside a repeater. It becomes a hidden loop of Jython calls.",
    "Embedding dozens of full faceplates on one page instead of summary tiles with on-demand popups.",
    "Judging performance from one browser on localhost. Test with many sessions on a realistic network.",
    "Adding a cache to per-user queries, so each user gets their own entry and nothing is saved.",
    "Skipping a restart test, then meeting a reconnect storm for the first time in production.",
    "Tuning from intuition instead of a thread dump."
  ],

  keyTerms: ["perspective-session", "persp-tag-binding", "named-query-cache", "run-script-expression", "thread-dump", "load-testing", "polling", "historian"],

  quiz: [
    {
      q: "100 operators open a screen with a named-query binding polled every 2 seconds. The data changes about once a minute. What is the best redesign?",
      options: ["Poll every 1 second for freshness", "A Gateway timer runs the query once, writes to a tag, and views bind to the tag", "Move the query into a script transform", "Add more RAM to the Gateway"],
      answer: 1,
      explain: [
        "That doubles the load for no benefit.",
        "Correct. One database query serves everyone, and sessions get cheap pushed updates.",
        "A script transform is the more expensive pattern.",
        "Memory does not remove 50 queries per second against the database."
      ]
    },
    {
      q: "Where does a Perspective script transform execute?",
      options: ["In the viewer's browser", "On the Gateway, in each session's context", "On the database server", "On the PLC"],
      answer: 1,
      explain: [
        "The browser draws the result. It does not run Jython.",
        "Correct. All Perspective scripting runs on the Gateway, so cost scales with sessions.",
        "The database only runs the SQL you send it.",
        "The PLC runs its own logic only."
      ]
    },
    {
      q: "CPU is at 80% and users complain. Which first step gives the most reliable information?",
      options: ["Rewrite the biggest screen", "Take two or three thread dumps a few seconds apart and see what the busy threads are doing", "Restart the Gateway nightly", "Reduce the number of tags"],
      answer: 1,
      explain: [
        "That is a guess and may fix nothing.",
        "Correct. Threads that show up repeatedly identify the hot function or query.",
        "A restart hides the problem temporarily.",
        "Tag count is rarely the cause and reducing it is a large change."
      ]
    },
    {
      q: "Why does caching a named query that takes a per-user parameter often save little?",
      options: ["Caches only work with SELECT *", "Each distinct parameter value creates its own cache entry", "Caching is disabled for parameters", "The cache is cleared every second"],
      answer: 1,
      explain: [
        "Caching works with any query the feature supports.",
        "Correct. The cache is keyed by the parameters, so unique values rarely get reused.",
        "Parameters are allowed. They just divide the cache.",
        "Lifetime is set by you, not fixed at one second."
      ]
    },
    {
      q: "A 120-row repeater uses runScript in each row's label expression. What is the likely problem?",
      options: ["Repeaters do not allow expressions", "Each row calls Jython whenever its inputs change, multiplying interpreter calls per session", "runScript is blocked in the browser", "It breaks tag subscriptions"],
      answer: 1,
      explain: [
        "Repeaters allow expressions in their instances.",
        "Correct. The calls multiply by rows and by sessions and hold Gateway threads.",
        "runScript runs on the Gateway.",
        "It does not break subscriptions. It adds CPU cost."
      ]
    },
    {
      q: "Your load test passes a steady 150-session ramp. What did it probably miss?",
      options: ["Nothing; steady state is the worst case", "A soak period and a reconnect storm after a Gateway or database restart", "The color theme", "Browser caching"],
      answer: 1,
      explain: [
        "Peaks usually come from events like shift change or restarts.",
        "Correct. Leaks appear over hours, and mass reconnects are often the true peak.",
        "Colors do not affect load.",
        "Client caching is not the main risk for Gateway capacity."
      ]
    }
  ],

  resources: [
    { title: "Perspective Performance: strategies for diagnosing slow load times", url: "https://forum.inductiveautomation.com/t/perspective-performance-strategies-for-diagnosing-slow-load-times/100034", type: "forum", source: "Inductive Automation Forum" },
    { title: "Wisdom from performance testing Ignition", url: "https://forum.inductiveautomation.com/t/wisdom-from-performance-testing-ignition/114769", type: "forum", source: "Inductive Automation Forum" },
    { title: "Gateway Performance Issues and Tuning", url: "https://forum.inductiveautomation.com/t/gateway-performance-issues-and-tuning/67109", type: "forum", source: "Inductive Automation Forum" },
    { title: "How to check the load impact of project library scripts on the Gateway", url: "https://forum.inductiveautomation.com/t/how-to-check-the-load-performance-impact-of-project-library-scripts-on-the-ignition-gateway/115596", type: "forum", source: "Inductive Automation Forum" },
    { title: "Low loading speed of Perspective views", url: "https://forum.inductiveautomation.com/t/low-loading-speed-of-perspective-views/79580", type: "forum", source: "Inductive Automation Forum" },
    { title: "Perspective Module (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/modules-overview/core-modules/perspective-module", type: "docs", source: "Inductive Automation" }
  ]
});
