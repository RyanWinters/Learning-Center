LC.lesson({
  id: "persp-events",
  title: "Events, actions and message handlers",
  track: "persp",
  minutes: 15,
  level: 3,
  prereqs: ["persp-bindings", "ign-scripting"],
  tags: ["perspective", "events", "actions", "message handlers", "scripting", "bindings"],
  summary: "Bindings describe what a screen is. Events describe what happens when someone touches it. Learn the event model, when a script is justified, and how message handlers decouple components.",
  objectives: [
    "Distinguish Perspective component events from browser DOM events",
    "Pick between an event action, a property change script and a binding for a given behavior",
    "Write message handlers with the right scope and send to them with system.perspective.sendMessage",
    "Design decoupled components that communicate by message or shared state rather than by reaching into each other",
    "Recognize scripts that should have been bindings"
  ],

  body: `
## Three ways to make something happen

A Perspective screen reacts in three ways, and picking the wrong one is the main source of fragile projects.

| Mechanism | Triggered by | Typical use | Cost to maintain |
|---|---|---|---|
| **Binding** | A value changes | Display, enable/disable, color, text | Lowest. Declarative and visible in the property editor |
| **Event action / script** | A user gesture or component event | Navigate, write a tag, open a popup | Low if it is a built-in action, higher if it is a script |
| **Property change script** | A property value changes | Side effects a binding cannot express | Highest. Hidden, order-dependent, easy to loop |

The rule experienced integrators repeat: if the result is a property value, use a binding. If the result is an action in the world (a write, a navigation, a message), use an event. Reach for a property change script only when a value change must cause an action.

## Component events

A {{term:component-event|component event}} is something Perspective raises for you, such as \`onActionPerformed\` on a button or \`onChange\` on a dropdown. It is not the raw browser (DOM) event. Perspective components are React components rendered in the browser, and the DOM events (mouse move, key down, focus) are handled in the client. Scripts and Gateway-side actions you attach to a component event run on the Gateway, so the client sends the event over the websocket and waits for the result. Purely visual interaction stays in the browser. The cost is therefore in what you attach: an event with a script costs a network hop and a Gateway thread each time it fires. Do not attach scripts to high-frequency interactions such as mouse movement or a slider's continuous change.

Many components offer DOM-like events too, for example \`onClick\`, \`onDoubleClick\`, \`onMouseDown\` and \`onMouseUp\` on any component through its **Events** configuration. Each event carries a list of actions that run in order.

### Built-in actions

Before writing a script, check the action list:

- **Navigate**: to a page, view or URL.
- **Popup**: open, close or toggle a popup by id, with params.
- **Dock**: open, close or toggle a dock.
- **Set Tag Value / write**: write a tag.
- **Logout**: end the session or return to the login flow.
- **Script**: run Jython with \`self\`, \`event\` and \`session\` in scope.

Built-in actions are checked by the Designer, show up in search, and are readable at a glance by the next person. A button whose whole job is "go to the pump page" should not contain a script.

> [!warning] Actions run in order, but scripts block
> Scripts in an event run on a Gateway thread. A slow database call in an \`onActionPerformed\` script makes that session sluggish for that click. Use \`system.util.invokeAsynchronous\` for slow work and give the user feedback (a disabled button, a spinner binding) in the meantime.

## Property change scripts

A {{term:property-change-script|property change script}} lives on a property (custom, params, props of a component) and fires when the value changes. The script receives \`previousValue\`, \`currentValue\`, \`origin\` and \`missedEvents\`. (Do not confuse it with a tag change script on a tag, whose signature is \`valueChanged(tag, tagPath, previousValue, currentValue, initialChange, missedEvents)\`. They are different events with different arguments.) It also fires on **startup** if you enable that option, which is how you do first-load initialization.

\`\`\`python
def valueChanged(self, previousValue, currentValue, origin, missedEvents):
    # Only react to a real transition, not the initial load
    if previousValue is None or previousValue.value is None:
        return
    if currentValue.value and not previousValue.value:
        system.perspective.sendMessage(
            "alarmAcknowledgedBanner",
            {"source": self.view.params.tagPath},
            scope="page"
        )
\`\`\`

Guard against nulls and initial values, since a binding delivering its first value counts as a change. Never write to the property you are watching (infinite loop), and avoid chains where script A changes a property that fires script B that changes a property that fires script A. Debugging those is painful because nothing in the property editor shows the dependency.

## Message handlers

A {{term:persp-message-handler|message handler}} is a named listener. A sender calls \`system.perspective.sendMessage(messageType, payload, scope)\`. Every handler registered for that \`messageType\` within reach receives the payload. The sender never needs to know who is listening or how many. That is the decoupling.

{{diagram:messages}}

### Scopes

The {{term:message-scope|scope}} controls how far a message travels:

| Scope | Reaches | Use for |
|---|---|---|
| \`view\` | Handlers in the same view | Parts of one faceplate talking to each other |
| \`page\` | Everything on the current page (the default if you omit it) | Page-wide refresh, toast, "alarm acknowledged" |
| \`session\` | Everything in the session | Logout cleanup, global notifications |

A handler also declares its **Listen Scopes**, so it can ignore messages from outside its own view even if someone sends at page scope. Two copies of the same faceplate on a page would otherwise both react to a message meant for one. Send at \`view\` scope, or include the target in the payload and filter in the handler.

Handlers run asynchronously from the sender, so do not expect the sender to see the effect right away. Session-level handlers (defined in the project's Session Events) are separate from component handlers. The function reference says \`system.perspective.sendMessage\` cannot reach them even with session scope. They are reached with \`system.util.sendMessage\`.

> [!note] In 8.1
> Message handlers and scopes work the same way in 8.1. The component handler configuration screens look slightly different, but \`system.perspective.sendMessage\` and its scope argument are unchanged.

## Worked example: a toast without coupling

Goal: any view can show a "Recipe saved" toast.

1. Put a small \`Toast\` view in the south dock. Give it a message handler for type \`toast\`, listen scope \`page\`.
2. The handler script sets \`self.custom.text = payload["text"]\` and \`self.custom.visible = True\`. A binding on the toast's style and visibility reads those properties.
3. Any button runs \`system.perspective.sendMessage("toast", {"text": "Recipe saved"})\`.

Nothing in the recipe view knows the toast exists. You can restyle or replace the toast without touching 50 call sites. The handler sets state; bindings do the presentation. That split is the pattern to copy.

## Avoiding scripts where a binding works

| You wrote | Replace with |
|---|---|
| \`onChange\` script copying one property to another | Binding with the first property as source |
| Script setting a style color from a value | Expression binding or a property binding with a map transform |
| Script showing/hiding a component | Binding on \`meta.visible\` |
| Timer script refreshing a label | Tag binding (subscribed, no polling) |
| Script concatenating text | Expression with \`concat\`, \`numberFormat\` or \`dateFormat\` |

Bindings are evaluated and cached by the platform, show where the data comes from, and run only when an input changes. Scripts hide dependencies and run on every trigger. See {{lesson:persp-bindings}} for the options and {{lesson:ign-scripting}} for scope details.
## If you already build Perspective

The mechanics are simple. What goes wrong in production is volume, repetition and silence.

### Throttle high-rate events

A slider's \`onChange\` or a text field's change event can fire many times during one gesture. If each runs a script that writes a tag, you send a stream of setpoint writes to a PLC. Options, best first:

1. **Do not write on change.** Edit a local custom prop and write on a button or on release. This also gives you a confirmation and audit point.
2. **Coalesce.** Where the binding offers a coalescing or delay option, use it so only the last value is written.
3. **Debounce in the script.** Store a timestamp in a view custom prop and ignore calls within a window you choose from the process, not from a table.

### Make writes idempotent and guarded

Double clicks happen, and so do two operators on one screen. A write action should be safe to repeat and should check state first:

\`\`\`python
def runAction(self, event):
    path = self.view.params.tagPath + "/Cmd/Start"
    ready = system.tag.readBlocking([self.view.params.tagPath + "/Sts/Ready"])[0]
    if not ready.quality.isGood() or not ready.value:
        system.perspective.sendMessage("toast", {"text": "M101 not ready"}, scope="page")
        return
    system.tag.writeBlocking([path], [True])
\`\`\`

This is a convenience check. The interlock still lives in PLC logic, and the PLC clears the command bit (house rule for \`Cmd\`). Disable the button with a binding (\`enabled\` from the same tag) so a second click is not possible while the command is pending, and re-enable it from the status tag, not from a timer.

### Async work needs a result path

\`system.util.invokeAsynchronous\` runs on another thread, so an exception there goes to the Gateway log and the operator sees nothing. Wrap the work, catch errors, and report through a message or a custom prop that a binding shows. Use try/except/finally inside the worker so the UI state (spinner, button disabled) always resets, whatever happens. Do not touch \`self\` properties from the worker without checking the view still exists.

### Loop breakers for change scripts

The loop cases the table warns about, concretely: script A writes \`custom.b\`, \`custom.b\` has a change script that writes \`custom.a\`. Break the cycle with \`origin\`: ignore changes where the origin shows the property was written by a script rather than by a binding or the user. Print \`origin\` in a log once to see the values your version produces. Better, remove one of the two scripts and replace it with a binding.

### Message handler patterns

- **Name by event, not by action.** \`recipe.saved\`, \`alarm.acknowledged\`. Handlers decide what to do.
- **Payload as a contract.** Document keys. Include a \`target\` key (a tag path) when several instances share a page, and have each handler compare it to its own \`tagPath\` and return if it differs. This gives per-instance targeting at page scope and is easier to debug than relying on listen scopes.
- **State, not events, for latecomers.** A message delivered while a view was not loaded is lost. Persist anything a late view must know in a tag or session prop, and use the message only as a nudge.
- **Session handlers for cross-cutting work.** Logout cleanup, audit logging and idle handling belong in session events, reached with \`system.util.sendMessage\`, so no view has to be loaded.

### Audit checklist

For each write event: who may click it, what it checks first, what it does when the tag is bad quality, and where it records the action.

`,

  eli5: `
Imagine a classroom. Some things happen on their own because of how the room is set up: when the sun comes in, the blinds on that window are down because someone rigged them to follow the light. That is a binding. Nobody has to do anything.

Other things happen because somebody does something: a student raises a hand and the teacher calls on them. That is an event. The hand is up, so a specific, planned thing follows.

Then there is a notice board. The teacher pins a note labeled "Lunch is in 5 minutes." The kids who care about lunch are watching the board and get ready. The teacher does not walk to each desk, and doesn't need to know who is paying attention. If a new kid joins, they start watching the board and nothing else has to change. That is a message handler.

The trick is choosing the simplest thing that works. If the blinds can follow the sun by themselves, don't have a student run over to move them every time.
`,

  why: `
**Why bindings first?** A binding is data flow you can see. Open the property and you find the source. A script is control flow that could be doing anything, and someone has to read it to learn. Bindings also let the platform optimize: they run only when inputs change and can share a tag subscription. Projects built mostly from scripts get slow and unpredictable as they grow, because every script is a custom thing that someone must understand and test.

**Why decouple with messages?** If component A reaches into component B (\`self.getSibling("B").props.text = ...\`) they are welded together. Rename B and A breaks without warning. With a message, A says "this happened" and B decides what that means. Faceplates, headers and toasts become reusable. The cost is indirection: finding who handles a message needs search, so name message types clearly (\`recipe.saved\`, not \`msg1\`) and document them.

**Why scope matters.** An unscoped page message reaching ten copies of a faceplate is a classic bug: you acknowledge one pump and all ten react. Treat the scope as part of the contract.

**Why shared state sometimes beats messages.** A message is an event, gone once delivered. If a view loads after the message was sent, it never sees it. For "what is selected right now" use a tag or session prop that views bind to. Use messages for things that happen, state for things that are.

**Where integrators disagree:** how much logic to place in view scripts versus project script libraries. The common compromise is one-line event handlers that call a function in a project library, which keeps the logic testable and out of the view JSON.
`,

  history: `
Ignition's older Vision client had a large set of component event handlers written in Jython. Perspective kept scripting but made the UI declarative first: bindings, built-in actions and style classes cover most needs, and scripting is the escape hatch. Message handlers carry on the idea of Ignition's Gateway messaging, adapted to the view, page and session hierarchy of a browser app.
`,

  examples: [
    {
      title: "Replace a script with a binding",
      body: `A label's text is set by a property change script on a tag value that formats \`"Level: " + str(round(value, 1)) + " m"\`. Replace it with an expression binding: \`"Level: " + toStr(round({[default]Plant1/Area10/Line1/LT101}, 1)) + " m"\`. (Ignition expressions accept single or double quotes. Pick one style for the project.) Same display, no script, no startup flicker, and the tag path is visible in the property editor.`
    },
    {
      title: "Targeted message to one faceplate",
      body: `Ten motor faceplates sit on a page. A "Reset all faults" button must reset only the one in its own row. The button calls \`sendMessage("resetFault", {}, scope="view")\` from inside each faceplate's own view. Because the scope is view, only that instance's handler runs.`
    }
  ],

  diagrams: {
    messages: `<svg viewBox="0 0 640 260" role="img" aria-label="A sender calls sendMessage with a type and scope; matching handlers within the view, page or session receive it">
  <defs>
    <marker id="persp-evt-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <rect class="dg-box-accent" x="20" y="100" width="150" height="56" rx="6"/>
  <text class="dg-text-sm" x="34" y="124">Sender (button)</text>
  <text class="dg-text-mono" x="34" y="144">sendMessage(type)</text>
  <line class="dg-line" x1="170" y1="128" x2="236" y2="128" marker-end="url(#persp-evt-ah)"/>
  <rect class="dg-zone" x="240" y="16" width="380" height="230" rx="8"/>
  <text class="dg-title" x="256" y="40">Session scope</text>
  <rect class="dg-zone" x="256" y="52" width="348" height="180" rx="8"/>
  <text class="dg-title" x="272" y="76">Page scope (default)</text>
  <rect class="dg-zone" x="272" y="88" width="190" height="130" rx="8"/>
  <text class="dg-title" x="288" y="112">View scope</text>
  <rect class="dg-box" x="288" y="124" width="156" height="34" rx="4"/>
  <text class="dg-text-sm" x="300" y="146">Handler in this view</text>
  <rect class="dg-box" x="288" y="168" width="156" height="34" rx="4"/>
  <text class="dg-text-sm" x="300" y="190">Handler in this view</text>
  <rect class="dg-box" x="476" y="124" width="116" height="34" rx="4"/>
  <text class="dg-text-sm" x="488" y="146">Other view</text>
  <rect class="dg-box" x="476" y="168" width="116" height="34" rx="4"/>
  <text class="dg-text-sm" x="488" y="190">Dock handler</text>
</svg>`
  },

  pitfalls: [
    "Writing to the property a change script is watching, creating a loop.",
    "Forgetting that the first binding value arrives as a change, so a script fires at load with a null previous value.",
    "Sending an unscoped (page) message and having every copy of a faceplate respond.",
    "Using a message for state. A view that loads later never sees it. Use a tag or session prop.",
    "Putting slow database or HTTP calls in an event script without running them asynchronously."
  ],

  keyTerms: ["component-event", "property-change-script", "persp-message-handler", "message-scope", "session-props"],

  quiz: [
    {
      q: "A label should show 'RUNNING' in green when a tag is 1 and 'STOPPED' in grey otherwise. What is the best implementation?",
      options: ["A property change script on the tag", "A timer script that polls every second", "A message handler that updates the label", "Expression or map bindings for text and a style class"],
      answer: 3,
      explain: [
        "It works but hides the dependency, fires at load and needs null handling.",
        "Polling wastes resources and lags behind. Tag bindings are subscribed.",
        "A message handler is for decoupled events, not to compute a display from a tag.",
        "Correct. The output is a property value, so a binding is the simplest, most visible approach."
      ]
    },
    {
      q: "Ten motor faceplates are on a page and each has a handler for 'resetFault'. A button inside faceplate 3 sends 'resetFault' with the default scope. What happens?",
      options: ["Only faceplate 3 resets", "All ten handlers run", "Nothing, because the default is session scope", "An error: scope is required"],
      answer: 1,
      explain: [
        "That requires view scope, or a payload filter.",
        "Correct. The default scope is page, so every matching handler on the page runs.",
        "The default is page, and it would reach handlers anyway.",
        "Scope is optional and defaults to page."
      ]
    },
    {
      q: "Which is the best use of a message rather than shared state?",
      options: ["Recording which area the operator selected", "Holding the current shift", "Showing a 'Recipe saved' toast", "Storing the user's preferred units"],
      answer: 2,
      explain: [
        "The selection is state that a late-loading view also needs, so use a tag or session prop.",
        "Shift is ongoing state.",
        "Correct. A toast is a one-time event, and late-loading views do not need to replay it.",
        "Units are a persistent preference. Use session.custom."
      ]
    },
    {
      q: "Why can a property change script run when a view first loads, with no user action?",
      options: ["The first value delivered by a binding counts as a change", "Scripts always run at load", "The Gateway restarts the script", "Message handlers trigger it"],
      answer: 0,
      explain: [
        "Correct. The property goes from its default to the bound value, so the script sees a change with a null or empty previous value.",
        "They only run when the property changes, or on startup if that option is selected.",
        "The Gateway doesn't re-run scripts on its own.",
        "Message handlers are a separate mechanism."
      ]
    },
    {
      q: "A button's onActionPerformed script runs a 3-second database query. Operators say that screen freezes. What is the right fix?",
      options: ["Add more RAM to the Gateway", "Convert it to a property change script", "Run the slow work asynchronously and give feedback in the UI", "Change the scope to session"],
      answer: 2,
      explain: [
        "The issue is blocking in the event thread, not memory.",
        "A property change script still runs in the same way.",
        "Correct. Use asynchronous execution for slow work and show a busy state bound to a flag.",
        "Scope applies to messages and has no effect on blocking."
      ]
    }
  ],

  resources: [
    { title: "Component Events and Actions (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/component-events-and-actions", type: "docs", source: "Inductive Automation" },
    { title: "system.perspective.sendMessage", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-perspective/system-perspective-sendMessage", type: "docs", source: "Inductive Automation" },
    { title: "system.perspective scripting functions (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/scripting-functions/system-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Component Message Handlers", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/perspective/scripting-in-perspective/component-message-handlers", type: "docs", source: "Inductive Automation" },
    { title: "A Vision-Oriented Guide to Perspective (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/a-vision-oriented-guide-to-perspective", type: "docs", source: "Inductive Automation" },
    { title: "Sending Messages Between Pages in Perspective", url: "https://forum.inductiveautomation.com/t/sending-messages-between-pages-in-perspective/41540", type: "forum", source: "Inductive Automation Forum" }
  ]
});
