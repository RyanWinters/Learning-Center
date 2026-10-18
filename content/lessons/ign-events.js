LC.lesson({
  id: "ign-events",
  title: "Events: tag change, gateway events, timers and messages",
  track: "ign",
  minutes: 25,
  level: 3,
  prereqs: ["ign-scripting"],
  tags: ["ignition", "events", "timer", "gateway", "scripting", "threads"],
  summary: "Where Ignition runs your Python on the Gateway without a screen open: tag events, gateway events, timers and messages, and the shared queues that make slow scripts dangerous.",
  objectives: [
    "Choose between a tag event script and a gateway tag change script for a given job",
    "Explain fixed delay vs fixed rate and shared vs dedicated timer threading",
    "Use message handlers and system.util.sendMessage to decouple work",
    "Describe how event queues back up and why a slow script hurts the whole Gateway",
    "Rewrite a script that sleeps or loops into a state-based timer pattern"
  ],

  body: `
## Why events matter

Screens run only while someone is looking at them. A plant runs all night. Anything that must happen without an operator, like logging a batch when a PLC bit goes high, sending an email when a pump trips or resetting a counter at midnight, has to be triggered on the Gateway. Ignition gives you three families of Gateway-side triggers: **tag events**, **gateway events** (startup, shutdown, timer, tag change, scheduled, message handlers), and, covered elsewhere, alarm pipelines. This lesson is about the first two and the shared machinery under them.

All of them run Python (Jython) in the Gateway scope you met in {{lesson:ign-scripting}}. That means no \`self\`, no component and no client. You get \`system.*\` functions, the Gateway's resources and nothing else.

## Tag event scripts

A {{term:tag-event-script|tag event script}} lives on a tag (or on a UDT definition, so every instance inherits it). The main one is **Value Changed**, with a signature like this:

\`\`\`python
def valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents):
    if initialChange:
        return                      # tag just loaded or the provider restarted
    if previousValue.value == 0 and currentValue.value == 1:
        system.util.sendMessage("Plant", "batchStarted", {"path": str(tagPath)}, "G")
\`\`\`

Tag events also exist for quality changes and for alarm active/clear/acknowledged. The things to know:

- **\`initialChange\`** is true on the first evaluation after the tag is loaded. Without that guard, a Gateway restart looks like every batch just started.
- **\`missedEvents\`** is true when the tag's event queue overflowed and some changes were dropped. You are being told the script could not keep up.
- Values arrive as **qualified values**: use \`.value\`, \`.quality\` and \`.timestamp\`.
- An exception in a tag event, timer or message script is written to the Gateway log and does not stop the event source, so the first debugging step is to read the log (Status, Logs). Wrap risky code so the log says what failed (the try/except below).
- Tag event scripts run in a shared thread pool owned by the tag system. Events for a single tag are generally delivered in order, but confirm the guarantee in the scripting documentation for your version before building logic that depends on strict ordering.

\`\`\`python
try:
    doWork(currentValue.value)
except Exception, e:
    system.util.getLogger("events.m101").error("doWork failed", e)
\`\`\`

## Gateway tag change scripts

A **gateway tag change script** lives in a project, under Gateway Events in the Designer. You list one or more tag paths and choose which of **value, quality and timestamp** changes should fire it. It receives the tag path, old and new values and an \`initialChange\` flag, and it runs once per change event no matter how many of the three triggers changed.

| | Tag event script | Gateway tag change script |
|---|---|---|
| Lives in | The tag (or UDT definition) | A project's Gateway Events |
| Scope of resources | Gateway, tag-provider context | Gateway, that project's script library |
| Applies to many tags | Automatically through a UDT | By listing paths or wildcard-style paths |
| Travels with | Tag export and UDT | Project export |
| Good for | Behavior that is part of the thing (a motor UDT logs its own runs) | Application logic (when any line starts, create an order record) |

The rule of thumb integrators use: if the behavior belongs to the equipment, put it on the UDT. If it belongs to the application and calls project script libraries, use a gateway tag change script. Beware mixing the two for the same job. Two scripts reacting to the same change is a debugging puzzle waiting to happen.

## Startup and shutdown scripts

Gateway Events also holds **startup** and **shutdown** scripts. They run when the project's Gateway scope starts or stops. Use startup to warm caches, register things in memory or write initial values. Use shutdown to flush buffers or write a last-known state. Keep both short. Shutdown has a limited time to finish before the Gateway proceeds.

## Timer scripts

A {{term:timer-script|timer script}} runs on a schedule while the Gateway is up. You set a delay (milliseconds), a **delay type**, a **threading** mode and the code.

{{diagram:timers}}

### Fixed delay vs fixed rate

| Delay type | Meaning | Behavior when the script is slow |
|---|---|---|
| {{term:fixed-delay|Fixed Delay}} (default) | Wait the delay after the previous run *finishes* | Period stretches: run time + delay. Can never pile up |
| {{term:fixed-rate|Fixed Rate}} | Try to start every N ms from the first start | If a run exceeds N, the next one starts as soon as it ends. No overlap, but no breathing room |

Neither mode runs the same timer twice at once. Fixed delay is the safe default. Choose fixed rate only when the cadence matters, like a sample taken every 5 s for a calculation, and you know the code finishes well inside the period.

### Shared vs dedicated threading

**Shared** timer scripts take turns on one common thread, one after another. A slow shared script delays every other shared timer in the Gateway, including ones in other projects. **Dedicated** gives the script its own thread, so it can run in parallel with others and can be slow without blocking them. Dedicated costs a thread, so use it for scripts that do blocking work such as large queries or HTTP calls, and keep short housekeeping on shared.

## Scheduled scripts

A **scheduled script** runs at calendar times, using a cron-style schedule or a simple time-of-day setting. Use it for "at 06:00 every day" jobs like shift rollovers and daily emails. A timer with a one-day delay drifts and loses its place on restart, so scheduled is the right tool for wall-clock jobs.

## Message handlers

A {{term:gateway-message-handler|message handler}} is a named script that runs when someone sends it a message. The sender calls \`system.util.sendMessage(project, handlerName, payload, scope)\`. The payload is a dictionary. The scope picks where it runs: the Gateway (\`"G"\`), clients, or both. Related calls \`system.util.sendRequest\` and \`sendRequestAsync\` wait for or collect a return value.

Messages decouple the **trigger** from the **work**. A tag event script that must do something slow should do nothing but send a message, then return. The handler does the heavy lifting on its own thread. A Perspective button can use the same handler a tag event uses, so the logic lives in one place.

## Event queues and why long scripts are dangerous

Every event source has a queue and a limited pool of worker threads. When a tag changes, the event goes on a queue. A worker picks it up and runs your script. If the script takes 50 ms and changes arrive every 100 ms, the queue stays empty. If it takes 500 ms, the queue grows, latency rises and eventually the queue overflows and events are dropped (\`missedEvents\`).

{{diagram:queue}}

Because tag event workers are **shared across all tags**, one slow script does not only hurt itself. Every other tag's event waits too, so a database call that takes two seconds when the DB is slow can freeze unrelated logic across the Gateway. Worse, a \`time.sleep()\` holds a worker doing nothing at all.

> [!warning] Never sleep in an event script
> \`time.sleep(5)\` in a tag event script occupies a pool thread for five seconds. Ten tags changing at once can consume the entire pool. Use a timestamp tag and a timer, or a state machine, to wait.

> [!example] Replacing a delay with a state pattern
> Requirement: when \`Plant1/Area10/Line1/Jam\` goes true, wait 10 s and then send an alert if it is still true. Bad: sleep 10 in valueChanged. Good: on the rising edge, write \`system.date.now()\` to a memory tag \`Plant1/Area10/Line1/JamSince\`. A 1-second fixed-delay timer checks \`JamSince\` and \`Jam\`, sends the alert once when 10 s have passed and clears \`JamSince\`. Nothing ever blocks.

## A decision guide

1. Behavior of a device, per instance: **tag event script on the UDT**.
2. Application logic reacting to a tag: **gateway tag change script**.
3. Periodic polling, aggregation or housekeeping: **timer script** (fixed delay, shared if short, dedicated if blocking).
4. Wall-clock jobs: **scheduled script**.
5. Anything slow triggered by anything else: **send a message** and let a handler do it.
6. Alarms and notifications: prefer alarm pipelines, covered in {{lesson:ign-alarming}}.

> [!note] In 8.1
> The same event types exist in 8.1 with the same names and behavior. 8.3 moved some Gateway settings screens and added new modules (such as Event Streams), but the scripting model on this page applies to both.
`,

  eli5: `
Imagine a restaurant kitchen with a rail of order tickets and a few cooks. Every time a customer orders, a ticket goes on the rail. A cook grabs one, makes the dish and takes the next.

That works until one cook is told, "Stand at the stove for ten minutes and watch this pot." Now one of your few cooks is just standing there. If three tickets like that come in, the kitchen stops. Orders pile up on the rail and some tickets fall off the end.

The smart way is for the cook to put the pot on a timer, write "check pot at 7:10" on a note, and go cook the next dish. Another helper who only does checking glances at the notes every minute. In Ignition the tickets are changes in your data, the cooks are a small shared group of workers on the server, and the timer-and-notes pattern is how you wait without blocking anyone.
`,

  why: `
**Why are there two kinds of tag change script?** History. Tag event scripts are part of the tag system and travel with the tag, which makes them ideal for UDTs. Gateway tag change scripts were the project-level feature, and they have access to the project's script library and sit with other application logic. Integrators argue about which to use as the default. A common compromise is to put only tiny, generic behavior in the tag (setting a timestamp, calling one library function) and keep real logic in project script libraries that both call. A tag event script can reach a project library only after that project is designated as the gateway scripting project (see {{lesson:ign-projects}}), so set that up first.

**Why shared queues?** A Gateway can carry hundreds of thousands of tags. Giving each its own thread would exhaust memory, so Ignition uses a bounded pool. That is efficient until one script abuses it. The failure is hard to diagnose because the symptom (tags updating late, alarms delayed, screens stale) appears far from the cause (one script blocking on a database).

**Why fixed delay by default?** Fixed rate makes it easy to build a script that runs continuously when each run takes longer than the interval. That pins a core and starves others. Fixed delay trades exact cadence for safety.

**Why messages?** They let the trigger return immediately and give the slow work its own place to run and fail. They also make the logic testable, since you can send the same message from a script console.

**The tradeoff:** every extra layer (event, message, handler) adds a little latency and a place to debug. For quick, cheap logic, just do it in the event. Reserve messages for anything that touches a database, a network call or a loop.
`,

  history: `
Early Ignition (7.x) had separate "client event scripts" and "gateway event scripts" in the Designer, and tag change scripts were their own category. The 8.0 rewrite of the tag system made tag event scripts first-class and queue-based, which is why \`initialChange\` and \`missedEvents\` appear in their signature. The gateway event model of timer, startup, shutdown, tag change and message handler scripts has stayed recognizable ever since.
`,

  examples: [
    {
      title: "Shift counter reset at 06:00",
      body: `A scheduled script at 06:00 calls \`system.tag.writeBlocking(["[default]Plant1/Area10/Line1/ShiftCount"], [0])\`. Using a timer with a 24 h delay would drift by the run time each day and restart from zero after a Gateway reboot. Scheduled scripts follow the clock.`
    },
    {
      title: "Slow report triggered by a PLC bit",
      body: `A tag event script on \`[default]Plant1/Area10/Line1/Mixer1/BatchDone\` checks \`currentValue.value\` is true and not \`initialChange\`, then calls \`system.util.sendMessage("Plant", "buildBatchReport", {"batch": batchId}, "G")\`. The \`buildBatchReport\` handler is set to dedicated threading, runs three queries and emails a PDF. The tag event returns in a millisecond, so other tags are unaffected.`
    }
  ],

  diagrams: {
    timers: `<svg viewBox="0 0 640 230" role="img" aria-label="Timeline comparing fixed delay, where the gap starts after each run ends, with fixed rate, where runs start on a regular grid">
  <defs><marker id="ign-events-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">Fixed delay (delay = 100 ms)</text>
  <rect class="dg-box-accent" x="20" y="38" width="60" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="50" y="58">run 60</text>
  <rect class="dg-box-accent" x="180" y="38" width="100" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="230" y="58">run 100</text>
  <rect class="dg-box-accent" x="380" y="38" width="40" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="400" y="58">20</text>
  <line class="dg-line" x1="80" y1="53" x2="178" y2="53" marker-end="url(#ign-events-ah)"/>
  <line class="dg-line" x1="280" y1="53" x2="378" y2="53" marker-end="url(#ign-events-ah)"/>
  <text class="dg-text-muted" x="98" y="88">wait 100 after finish</text>
  <text class="dg-text-muted" x="300" y="88">wait 100 after finish</text>
  <text class="dg-title" x="20" y="130">Fixed rate (period = 160 ms)</text>
  <line class="dg-line" x1="20" y1="195" x2="620" y2="195"/>
  <line class="dg-line" x1="20" y1="150" x2="20" y2="195"/>
  <line class="dg-line" x1="180" y1="150" x2="180" y2="195"/>
  <line class="dg-line" x1="340" y1="150" x2="340" y2="195"/>
  <line class="dg-line" x1="500" y1="150" x2="500" y2="195"/>
  <rect class="dg-box-accent" x="20" y="150" width="60" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="50" y="170">60</text>
  <rect class="dg-box-accent" x="180" y="150" width="190" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="275" y="170">slow run 190</text>
  <rect class="dg-box-accent" x="370" y="150" width="50" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="395" y="170">late</text>
  <text class="dg-text-muted" x="20" y="215">Grid starts at 0, 160, 320... A long run pushes the next start late; runs never overlap.</text>
</svg>`,
    queue: `<svg viewBox="0 0 640 200" role="img" aria-label="Tag changes enter a shared event queue; a few worker threads run scripts; one slow script blocks a worker and the queue grows">
  <defs><marker id="ign-events-q" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">Tag changes</text>
  <rect class="dg-box" x="20" y="40" width="120" height="120" rx="6"/>
  <text class="dg-text-sm dg-mid" x="80" y="105">1000s of tags</text>
  <line class="dg-line" x1="140" y1="100" x2="200" y2="100" marker-end="url(#ign-events-q)"/>
  <rect class="dg-box" x="205" y="70" width="170" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="290" y="95">Event queue</text>
  <text class="dg-text-muted dg-mid" x="290" y="115">full = dropped events</text>
  <line class="dg-line" x1="375" y1="100" x2="430" y2="100" marker-end="url(#ign-events-q)"/>
  <rect class="dg-box-accent" x="435" y="40" width="185" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="527" y="63">Worker: quick script</text>
  <rect class="dg-box-accent" x="435" y="84" width="185" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="527" y="107">Worker: sleep(5) !</text>
  <rect class="dg-box-accent" x="435" y="128" width="185" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="527" y="151">Worker: slow DB call</text>
  <text class="dg-text-muted" x="20" y="190">A small shared pool means a few blocked workers delay every other tag's script.</text>
</svg>`
  },

  pitfalls: [
    "Calling time.sleep() or looping inside a tag event script, which occupies a shared worker thread.",
    "Forgetting the initialChange guard, so a Gateway restart fires every 'went true' action again.",
    "Running a slow database or HTTP call in a shared timer, delaying every other shared timer in the Gateway.",
    "Using fixed rate with a script that can run longer than its period.",
    "Using a 24-hour timer for a wall-clock job instead of a scheduled script.",
    "Putting the same logic in both a UDT tag event and a gateway tag change script, so it fires twice."
  ],

  keyTerms: ["tag-event-script", "gateway-event-script", "timer-script", "fixed-delay", "fixed-rate", "gateway-message-handler", "event-thread-pool"],

  quiz: [
    {
      q: "A tag event script calls time.sleep(10) to wait before checking a condition. What is the main risk?",
      options: ["It holds a shared worker thread, so other tags' events queue up behind it", "Jython does not support sleep", "The tag will lose quality", "The Gateway will restart automatically"],
      answer: 0,
      explain: [
        "Correct. Worker threads are shared by all tag events. Ten blocked workers can stall unrelated logic.",
        "Sleep works fine. That is why it is tempting.",
        "Quality is determined by the data source, not by your script's duration.",
        "Nothing restarts. The Gateway just gets slow, which is harder to diagnose."
      ]
    },
    {
      q: "A timer script has a 1000 ms delay and its body takes 300 ms. With Fixed Delay, how often does it start?",
      options: ["Every 1000 ms", "Every 1300 ms", "Every 700 ms", "Twice per second"],
      answer: 1,
      explain: [
        "That is fixed rate behavior when the run fits in the period.",
        "Correct. Fixed delay waits the full delay after each run finishes, so the period is run time plus delay.",
        "No mode shortens the period by the run time like that.",
        "That would need a 500 ms setting."
      ]
    },
    {
      q: "You need to build a report on a PLC 'batch done' bit. It takes 8 seconds and queries a slow database. What is the best design?",
      options: ["Run it inside the tag event script", "Put it in a shared 1-second timer", "Use a Vision client button", "The tag event sends a message to a dedicated-thread handler that builds the report"],
      answer: 3,
      explain: [
        "That blocks a shared tag event worker for eight seconds.",
        "A shared timer would block every other shared timer for the same time.",
        "A client may not be open, and the job must run unattended.",
        "Correct. The trigger returns immediately and the slow work runs on its own thread."
      ]
    },
    {
      q: "Which is the right tool for 'roll the shift counter at 06:00 every day'?",
      options: ["A timer script with a 86,400,000 ms delay", "A tag event script on the clock tag", "A scheduled script", "A startup script"],
      answer: 2,
      explain: [
        "It drifts by the run time and starts over at each Gateway restart.",
        "That would run on every clock tick change, not once a day.",
        "Correct. Scheduled scripts follow the wall clock.",
        "Startup runs only when the project starts."
      ]
    },
    {
      q: "What does missedEvents = True tell a valueChanged script?",
      options: ["Some changes were dropped because the event queue overflowed", "The tag has bad quality", "The previous script run raised an exception", "The Gateway clock jumped"],
      answer: 0,
      explain: [
        "Correct. It is a signal that your scripts cannot keep up with the rate of change.",
        "Quality is reported separately.",
        "Errors go to the Gateway log, not this flag.",
        "Clock changes are unrelated."
      ]
    },
    {
      q: "A motor UDT should log each run to history. Where is the cleanest place to attach that behavior?",
      options: ["A separate gateway tag change script listing all 300 motor paths", "A tag event script on the UDT definition", "A Perspective view script", "A client timer"],
      answer: 1,
      explain: [
        "That works but must be edited for every new motor.",
        "Correct. Each instance inherits the behavior, and new motors need no extra setup.",
        "Views only run while open.",
        "Clients are not guaranteed to be running."
      ]
    }
  ],

  resources: [
    { title: "Gateway Event Scripts (Ignition 8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/platform/scripting/scripting-in-ignition/gateway-event-scripts", type: "docs", source: "Inductive Automation" },
    { title: "Tag Event Scripts (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/tags/tag-event-scripts", type: "docs", source: "Inductive Automation" },
    { title: "Gateway Tag Change Script vs. Tag Change Script vs. Timer Script", url: "https://forum.inductiveautomation.com/t/gateway-tag-change-script-vs-tag-change-script-vs-timer-script/107902", type: "forum", source: "Inductive Automation Forum" },
    { title: "Best practice for time delay in script", url: "https://forum.inductiveautomation.com/t/best-practice-for-time-delay-in-script/96492", type: "forum", source: "Inductive Automation Forum" },
    { title: "Delay in Tag Event Script (Value Changed)", url: "https://forum.inductiveautomation.com/t/delay-in-tag-event-script-value-changed/70666", type: "forum", source: "Inductive Automation Forum" },
    { title: "Add delay between tag writes in a gateway script", url: "https://forum.inductiveautomation.com/t/add-delay-between-tag-writes-in-a-gateway-script/115367", type: "forum", source: "Inductive Automation Forum" }
  ]
});
