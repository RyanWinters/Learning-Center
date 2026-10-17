LC.lesson({
  id: "ign-scripting",
  title: "Python scripting and scopes",
  track: "ignition",
  minutes: 30,
  level: 2,
  prereqs: ["ign-expressions"],
  tags: ["ignition", "scripting", "python", "jython", "scopes", "system-library"],
  summary: "Ignition scripts are Jython 2.7 running in one of several scopes, each with its own threads, libraries and failure modes. Knowing where your code runs explains most scripting bugs.",
  objectives: [
    "Say what Jython 2.7 means for the syntax and libraries you can use",
    "Name the four scopes and the system.* functions each can call",
    "Read and write tags, query databases and call the Perspective API from the right scope",
    "Organize reusable code in the project script library and the gateway scripting project",
    "Log with system.util.getLogger instead of print",
    "Recognise blocking calls and the one-tag-at-a-time anti-pattern"
  ],

  body: `
## Python, with a Java engine underneath

Ignition scripting is **Jython 2.7**: the Python 2.7 language implemented on the Java Virtual Machine, the same JVM Ignition itself runs on. That has practical consequences.

- It is Python 2 syntax. \`print "hi"\` and \`print("hi")\` both work for one argument. There are no f-strings; use \`"%s is %d" % (name, n)\` or \`"{} is {}".format(name, n)\`. Strings are 8-bit \`str\` or \`unicode\`, and mixing them with non-ASCII text raises errors you will meet eventually.
- Pure-Python standard library modules work (\`json\`, \`re\`, \`datetime\`, \`math\`). Compiled C extensions such as NumPy and pandas do not, and cannot be installed with pip.
- You can import Java classes directly, such as \`from java.util import Date\`. Many Ignition objects you receive (datasets, qualified values, lists) are Java objects with Java methods.
- Python 3 is not available. Plan for 2.7 behaviour: integer division, \`dict.has_key\`, \`xrange\`.

> [!note] In 8.1
> 8.1 and 8.3 both run Jython 2.7. The scripting model in this lesson applies to both. The legacy functions \`system.tag.read\`, \`readAll\`, \`write\` and \`writeAll\` were replaced by the *Blocking* versions in the 8.0 line. If you see old code using them, migrate.

## The scopes: where does this code run?

A **scope** is the process and thread context in which a script executes. It decides which \`system.*\` functions exist, what \`self\` and \`event\` mean, and what happens when the script is slow.

{{diagram:scopes}}

| Scope | Runs in | Typical places | Library notes |
|---|---|---|---|
| Gateway | The Gateway JVM, shared by everyone | Tag event scripts, gateway timer and message events, alarm pipelines, WebDev, startup/shutdown | Has \`system.tag\`, \`system.db\`, \`system.util\`, \`system.net\`. No client GUI functions |
| Perspective session | The Gateway JVM, on behalf of one browser session | Component events, view and session events, binding transforms and script transforms | Adds \`system.perspective\`. Runs on gateway threads, so there are no popups through \`system.gui\` |
| Vision client | The client's own JVM on the operator's PC | Vision component events, client scripts | Adds \`system.gui\`, \`system.nav\`, \`system.printing\`. Calls to tags and databases travel to the Gateway over the network |
| Designer | The Designer's JVM | The Script Console, project tooling | Close to client scope. Great for tests. Not representative of production timing |

Perspective is easy to misread: despite living "in the browser", its Python runs on the Gateway. A Perspective button script that reads 50 tags makes no network hops from a client, but it shares the Gateway with everyone else, so slow code hurts every user.

### A scope-aware reading habit

Before writing a line, answer: *where will this run, and who else is sharing that process?* Tag event scripts run in the Gateway and cannot touch a client component. A Vision button script cannot assume the Gateway's tag provider names behave the same way. Always give tag paths in full, with the provider, so they work in any scope.

## The system library highlights

Ignition predefines the \`system\` package. These are the ones you will use daily.

### system.tag

\`\`\`python
paths = ["[default]Plant1/Pump3/Speed", "[default]Plant1/Pump3/Sts_Running"]
vals = system.tag.readBlocking(paths)     # one call, one list back
speed, running = vals[0], vals[1]
if speed.quality.isGood():
    print speed.value, speed.timestamp

system.tag.writeBlocking(["[default]Plant1/Pump3/SpeedSP"], [1450.0])
\`\`\`

\`readBlocking\` returns a list of qualified values in the same order as the paths. It blocks until the read finishes or the timeout (default 45 seconds) passes. \`writeBlocking\` returns a list of quality codes: look at them, because a write to a read-only or bad tag fails *without raising an exception*.

Other tag functions: \`configure\` and \`getConfiguration\` for creating and exporting tags in bulk, \`browse\`, \`exists\`, \`query\` and the asynchronous \`readAsync\`/\`writeAsync\`.

### system.db

\`\`\`python
rows = system.db.runPrepQuery(
    "SELECT id, name FROM pumps WHERE area = ? AND active = ?", ["North", 1], "plantdb")
for r in rows:
    print r["name"]
\`\`\`

Always use the prepared forms (\`runPrepQuery\`, \`runPrepUpdate\`) with \`?\` placeholders. String-building SQL invites injection and quoting bugs. For anything reused, call a **named query** with \`system.db.runNamedQuery\`. See {{lesson:ign-databases}}.

### system.util

\`getLogger\` (below), \`sendMessage\` and \`sendRequest\` (message handlers across scopes), \`invokeAsynchronous\` and \`invokeLater\` (threading), \`getGlobals\`, \`jsonEncode\`/\`jsonDecode\`, and \`getProjectName\`.

### system.perspective

Perspective-only helpers: \`navigate\`, \`openPopup\`/\`closePopup\`, \`sendMessage\`, \`getSessionInfo\`, \`print\`, \`download\`, \`refreshBinding\`. They need a session, so they fail in a gateway timer script that has no session.

## Where code lives: the project script library

Do not paste the same 30 lines into 40 button scripts. In the Designer, the **Project Library** (Scripting section) holds Python modules. Create a package such as \`shared\` with a module \`pumps\`, then call it from anywhere in the project:

\`\`\`python
# project library: shared/pumps.py
def startPump(path):
    """Pulse the start command, return True when the write was good."""
    q = system.tag.writeBlocking([path + "/Cmd_Start"], [True])
    return q[0].isGood()

# in a Perspective button's onActionPerformed
if shared.pumps.startPump(self.view.params.instancePath):
    system.perspective.print("Start sent")
\`\`\`

Libraries are inherited between projects, so a "global" parent project can carry the shared code for all child projects. Tag event scripts differ: they can only call functions defined in the **Gateway Script Project**, the project designated for gateway-level scripting, so shared tag logic must be there. See {{lesson:ign-projects}}.

## Logging, not printing

\`print\` goes to the Designer's output console or to the Gateway's wrapper log, depending on scope, and nobody can filter it. Use a logger:

\`\`\`python
log = system.util.getLogger("shared.pumps")   # name follows the code location
log.info("Start requested for %s" % path)
log.warn("Write rejected: %s" % q[0])
log.error("Unexpected failure", exception)    # passes the exception for a stack trace
if log.isDebugEnabled():
    log.debug("State dump: %s" % expensive_dump())
\`\`\`

Levels run trace, debug, info, warn, error. The default threshold is info, so debug lines are dropped until you raise the level on the Gateway's Logs page (the change lasts until restart). Loggers appear on the Gateway's Diagnostics logs page and in \`wrapper.log\`.

## Threads and blocking

Every script runs on a thread that someone else is waiting on.

- **Vision/Designer:** a long call on the GUI thread freezes the screen. Use \`system.util.invokeAsynchronous(fn)\` for the slow part, then \`invokeLater\` to update the UI.
- **Gateway:** tag change scripts and gateway events run on shared pools. A script that sleeps, waits for a lock or hits a slow web service holds a thread, and other events queue behind it. Never use \`time.sleep\` in a tag change script.
- **Perspective:** a session's events run on gateway threads for that session. A 10-second query blocks that user's event, and if enough users do it, the pool.

Network and database calls are the usual culprits. Set timeouts, and move work that takes seconds into a gateway timer or message handler.

## Anti-patterns to unlearn

**Reading tags one at a time in a loop.** Each call has overhead, and from a client scope each is also network round trips.

\`\`\`python
# slow: 200 separate calls
for p in paths:
    v = system.tag.readBlocking([p])[0].value

# right: one call, then loop over results
results = system.tag.readBlocking(paths)
values = dict(zip(paths, [r.value for r in results]))
\`\`\`

Reports from the forum show the single-call form running many times faster on large lists, and the gap is widest in clients. Build the path list first, read once, write once.

Other regulars:

- Swallowing errors with a bare \`except: pass\` so the only symptom is "nothing happens". Log them.
- Ignoring the quality of a read or the result of a write.
- Storing state in module globals when the project can restart or scripts run in several threads. Use tags, a database, or \`system.util.getGlobals\` consciously.
- Putting control logic in scripts that the PLC should own. A script is not a scan: it can be late, skipped or stopped by a Gateway restart.
- Polling in a loop where an event (tag change, message) would do. See {{lesson:ign-events}}.
`,

  eli5: `
Imagine a big restaurant. The kitchen is the Gateway. The dining room is where customers (screens) sit. Writing a script is leaving a note for a staff member, and the first question is which staff member reads it.

Some notes go to a cook in the kitchen, who can open the fridge (read tags) and use the ovens (databases) but cannot walk out and rearrange a customer's table. Some notes go to a waiter at one table, who can do table-specific things like bringing a menu (Perspective) or helping with the napkins (Vision's windows). The note-taker's name for this is the scope.

If you hand a cook a note that says "go count the 200 eggs, one trip at a time", he walks to the fridge 200 times. Better: "bring all 200 eggs in one trip". That's reading all tags in one call.

And if you tell the cook "stand still for ten minutes while you wait for the delivery", everyone behind him in the queue is stuck. That's a blocking call. Keep the cooks moving, and have them write down what they did in the kitchen logbook (the logger) so you can see what happened later.
`,

  why: `
**Why scopes at all?** Ignition is a client/server system, and a script has to run *somewhere*. A Gateway tag script runs once for the plant. A Vision click script runs on that operator's PC. The same function name (like \`system.tag.readBlocking\`) behaves the same in each, but the cost and the available libraries differ. Mistakes come from assuming the scope you were in last week.

**Why Jython 2.7 and not Python 3?** Jython is the Java-hosted Python that gives scripts direct access to Ignition's own Java objects and runs in the same process, with no external interpreter to manage. The price is being stuck on the Python 2.7 language and its libraries. Integrators work around it with Java libraries when needed.

**Why a project library?** Copy-pasted script in 60 places is 60 places to fix. One library function is tested once. This is the same reasoning as {{lesson:plc-aoi}} in a PLC.

**Why batch tag reads?** Every call to a tag function has a fixed cost: building the request, crossing threads or a network, and waiting. Batching amortizes that cost across many tags.

**Why logger and not print?** A logger carries a level and a name, so you can turn debug on for one module in production for ten minutes and then turn it off. A \`print\` cannot be filtered, and in Gateway scope it ends up buried in a text file.

**The debate.** Some integrators put as much logic as possible in scripts, others in expression tags and bindings, others in the PLC. A reasonable rule: the PLC owns control, expressions own derived display values, scripts own actions (writes, database, messaging) triggered by events.
`,

  examples: [
    {
      title: "Reading a motor's status in one call",
      body: `A gateway timer script needs the state of 40 motors. Build the 40 paths with a list comprehension, call \`system.tag.readBlocking(paths)\` once, and zip the paths with the results. Check \`quality.isGood()\` on each, and log, with the path, any that are not. This took under a second in the field where the loop version took over 10 seconds from a Vision client.`
    },
    {
      title: "A tag change script that hangs the Gateway",
      body: `A value changed script on a counter calls a web service with no timeout. The service goes down, each call waits 30 seconds, and the pool of gateway threads fills with waiting scripts. Alarms and other events are delayed. Fix: set a timeout, make the call from a message handler on a gateway timer, and log failures.`
    }
  ],

  diagrams: {
    scopes: `<svg viewBox="0 0 640 260" role="img" aria-label="Gateway JVM runs gateway scripts and Perspective session scripts; Vision clients and the Designer run scripts in their own JVMs and reach tags over the network">
  <defs><marker id="ign-scripting-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-zone" x="16" y="16" width="330" height="228" rx="8"/>
  <text class="dg-title" x="30" y="40">Gateway JVM (shared)</text>
  <rect class="dg-box-accent" x="30" y="56" width="300" height="52" rx="6"/>
  <text class="dg-text-sm" x="42" y="78">Gateway scope</text>
  <text class="dg-text-muted" x="42" y="96">tag events, timers, WebDev, alarms</text>
  <rect class="dg-box" x="30" y="122" width="300" height="52" rx="6"/>
  <text class="dg-text-sm" x="42" y="144">Perspective session scope</text>
  <text class="dg-text-muted" x="42" y="162">one per browser session, adds system.perspective</text>
  <rect class="dg-box-2" x="30" y="188" width="300" height="44" rx="6"/>
  <text class="dg-text-sm" x="42" y="214">Tags, databases, project library</text>
  <rect class="dg-box" x="420" y="30" width="204" height="82" rx="6"/>
  <text class="dg-text-sm" x="432" y="54">Vision client JVM</text>
  <text class="dg-text-muted" x="432" y="74">client scope, system.gui</text>
  <text class="dg-text-muted" x="432" y="92">own threads, GUI freezes</text>
  <rect class="dg-box" x="420" y="146" width="204" height="82" rx="6"/>
  <text class="dg-text-sm" x="432" y="170">Designer JVM</text>
  <text class="dg-text-muted" x="432" y="190">Script Console, testing</text>
  <text class="dg-text-muted" x="432" y="208">network hops to Gateway</text>
  <line class="dg-line" x1="420" y1="70" x2="348" y2="205" marker-end="url(#ign-scripting-ah)"/>
  <line class="dg-line" x1="420" y1="190" x2="348" y2="215" marker-end="url(#ign-scripting-ah)"/>
</svg>`
  },

  pitfalls: [
    "Reading tags one per call in a loop instead of one list per call.",
    "Ignoring quality on reads and the returned codes on writes.",
    "Assuming Python 3 behaviour (f-strings, print as a function with several arguments, str/bytes separation).",
    "Using time.sleep or slow web or database calls in gateway tag scripts or on the GUI thread.",
    "Leaving the provider off tag paths so scripts behave differently by scope.",
    "Using print for diagnostics in production instead of a named logger.",
    "Calling system.perspective functions from scopes that have no session."
  ],

  keyTerms: ["ign-jython", "ign-scripting-scope", "ign-readblocking", "ign-project-library", "ign-script-logger", "ign-qualified-value", "ign-gateway-script-project"],

  quiz: [
    {
      q: "A Perspective button's onActionPerformed script runs in which JVM?",
      options: ["The user's browser", "The Gateway's JVM, in the session's context", "A Vision client JVM", "The Designer's JVM"],
      answer: 1,
      explain: [
        "Perspective scripts are Python, which browsers don't run. Only the page's JavaScript runs there.",
        "Correct. Perspective Python runs on the Gateway, so slow scripts affect all users.",
        "That is Vision, a separate client technology.",
        "The Designer only runs scripts you launch from its Script Console."
      ]
    },
    {
      q: "You need the values of 150 tags in a gateway script. Which is best?",
      options: ["150 readBlocking calls in a loop", "One readBlocking call with a list of 150 paths", "A while loop reading until all are good", "Expression bindings for each"],
      answer: 1,
      explain: [
        "Each call has fixed overhead, so the total time is much worse.",
        "Correct. One call amortizes the overhead, and results come back in path order.",
        "A busy loop wastes a thread and doesn't speed up the read.",
        "Bindings belong to components, not to a gateway script."
      ]
    },
    {
      q: "Which statement about Ignition's Python is true?",
      options: ["It is CPython 3 with full pip support", "It is Jython 2.7 and can import Java classes", "It can import NumPy", "It supports f-strings"],
      answer: 1,
      explain: [
        "Ignition does not run CPython.",
        "Correct. Jython runs Python 2.7 on the JVM and gives direct access to Java.",
        "NumPy has compiled extensions that Jython cannot load.",
        "F-strings arrived in Python 3.6, so they are not available in 2.7."
      ]
    },
    {
      q: "A tag value-changed script needs to call a shared function. Where must the function be defined?",
      options: ["Any project's library", "In the Gateway Script Project", "In a Vision window", "In the Designer's Script Console"],
      answer: 1,
      explain: [
        "Tag event scripts run in the Gateway and use the gateway scripting project, not an arbitrary project.",
        "Correct. Tag event scripts can only call code from the Gateway Script Project.",
        "Windows exist only in Vision clients.",
        "The Script Console is for testing and doesn't persist code."
      ]
    },
    {
      q: "Why prefer system.util.getLogger over print in Gateway scripts?",
      options: ["print doesn't work in Jython", "A logger has names and levels, and shows in the Gateway's log viewer", "Loggers run faster than print", "print is blocked in the Gateway"],
      answer: 1,
      explain: [
        "print works, but its output is hard to find and filter.",
        "Correct. Named, levelled messages appear on the Gateway's Logs page and can be turned up or down.",
        "Speed isn't the reason.",
        "It is not blocked. It simply lands in wrapper.log."
      ]
    },
    {
      q: "A write via writeBlocking to a tag raised no exception, but the value didn't change. What should you have checked?",
      options: ["The Python version", "The list of quality codes returned by the write", "The Designer's output console only", "The tag's description"],
      answer: 1,
      explain: [
        "Version isn't the issue here.",
        "Correct. Failures are reported in the returned quality codes. A bad or read-only tag does not necessarily raise an exception.",
        "The console shows nothing unless you log the result.",
        "A description has no effect on writes."
      ]
    }
  ],

  resources: [
    { title: "Scripting in Ignition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/scripting/scripting-in-ignition", type: "docs", source: "Inductive Automation" },
    { title: "system.tag.readBlocking (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-tag/system-tag-readBlocking", type: "docs", source: "Inductive Automation" },
    { title: "Reading and Writing to Tags (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/scripting/scripting-examples/reading-and-writing-to-tags", type: "docs", source: "Inductive Automation" },
    { title: "Tag Event Scripts (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/tags/tag-event-scripts", type: "docs", source: "Inductive Automation" },
    { title: "system.util.getLogger", url: "https://www.docs.inductiveautomation.com/docs/8.1/appendix/scripting-functions/system-util/system-util-getLogger", type: "docs", source: "Inductive Automation" },
    { title: "Script Logging and Print Statement Output Reference", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/scripting/scripting-in-ignition/script-logging-print-statement-output", type: "docs", source: "Inductive Automation" },
    { title: "Multiple single readBlocking calls versus the array (forum)", url: "https://forum.inductiveautomation.com/t/multiple-single-lines-of-system-tag-readblocking-versus-utilizing-the-array/82198", type: "forum", source: "Inductive Automation Forum" },
    { title: "Benchmarking system.tag.readBlocking() with 21,000 tags (forum)", url: "https://forum.inductiveautomation.com/t/benchmarking-system-tag-readblocking-performance-with-21-000-tags/89370", type: "forum", source: "Inductive Automation Forum" }
  ]
});
