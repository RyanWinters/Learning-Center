LC.lesson({
  id: "ign-expressions",
  title: "The expression language",
  track: "ign",
  minutes: 20,
  level: 2,
  prereqs: ["ign-tags"],
  tags: ["ignition", "expressions", "bindings", "runscript", "polling"],
  summary: "A small, side-effect-free formula language used in expression tags, bindings and alarm properties. Know its limits and you will know when to reach for a script instead.",
  objectives: [
    "Write expressions with references, operators and the core functions (if, switch, dateFormat, now, tag, lookup, try)",
    "Predict how often an expression re-evaluates, and what controls it",
    "Explain what runScript costs and when it is justified",
    "List where expressions appear in Ignition",
    "Decide between an expression and a script for a given task"
  ],

  body: `
## What the expression language is

The Ignition expression language is a small formula language. Like a spreadsheet cell, an expression takes inputs, computes, and returns one value. It cannot loop, assign variables or change the world. That limit is a feature: the platform can re-run an expression whenever an input changes, safely and cheaply, without worrying what it did the last time.

You write expressions constantly even if you do not call them that. Every Perspective expression binding and every expression tag uses this language.

## Syntax in five minutes

**References** go in braces. What goes inside depends on where the expression lives:

\`\`\`text
{[default]Plant1/Area10/Line1/LT101}  a tag, in an expression tag or binding
{[.]Level}                             a tag relative to this tag (in a UDT)
{view.params.tankPath}                 a Perspective view parameter
{this.props.text}                      a property on the same component
\`\`\`

**Operators** are what you would expect, with a few spellings worth memorising:

| Kind | Operators |
|---|---|
| Arithmetic | \`+ - * / %\`, and \`^\` for power (not \`**\`, which is Python) |
| Comparison | \`=\` or \`==\`, \`!=\` or \`<>\`, \`< <= > >=\` |
| Logic | \`&&\`, \`||\`, \`!\` |
| Bitwise | \`&\` (AND), \`xor\`, \`~\` (NOT), \`<<\` and \`>>\` shifts, plus a single pipe for OR. Used to unpack status words. Check the operator table for your version. |
| Strings | \`+\` joins, double quotes for text: \`"Motor " + {[.]Name}\` |

Division with integers can surprise you the way it does in any typed language, so cast with \`toFloat()\` when the fraction matters.

## Functions you will use every week

**if(condition, whenTrue, whenFalse)** is the workhorse.

\`\`\`text
if({[.]Sts/Fault}, "FAULT", if({[.]Sts/Running}, "RUNNING", "STOPPED"))
\`\`\`

**switch(value, case1, result1, case2, result2, ..., default)** replaces nested ifs when one value selects among many outcomes. Use it to turn a state number into text:

\`\`\`text
switch({[.]State}, 0, "Idle", 1, "Starting", 2, "Running", 3, "Stopping", "Unknown")
\`\`\`

**dateFormat(date, "pattern")** formats a timestamp: \`dateFormat(now(1000), "HH:mm:ss")\`.

**now(rate)** returns the current time and re-evaluates every \`rate\` milliseconds. \`now(0)\` evaluates once. \`now(1000)\` makes a clock. Without a rate it uses a default rate (see the function page for your version), which is why an expression containing \`now()\` is never quiet.

**lookup** searches a dataset for a value in one column and returns the matching value from another. Use it to translate codes using a small table (a dataset or a query result) instead of a giant switch. Check the manual for the exact argument order before you use it.

**try(expression, fallback)** returns the fallback when the expression errors, for example a divide by zero or a failed cast: \`try(1 / {[.]Flow}, 0)\`. Without it the whole expression goes to an error state.

**tag(path, [property])** reads a tag whose path is built at runtime. Plain \`{[default]...}\` references are fixed when you write them. \`tag("[default]" + {view.params.line} + "/Speed")\` is not. It is the expression-language route to indirect tags.

Others worth knowing: \`isNull\`, \`coalesce\`, \`round\`, \`abs\`, \`min\`/\`max\`, \`concat\`, \`toInt\`, \`toFloat\`, \`toStr\`, \`numberFormat\`, \`isGood\`, \`isBad\`, \`qualityOf\`, and the dataset helpers.

> [!example] Combined status text with a bad-quality guard
> \`\`\`text
> if(!isGood({[.]Sts/Running}), "NO COMM",
>    if({[.]Sts/Fault}, "FAULT", if({[.]Sts/Running}, "RUNNING", "STOPPED")))
> \`\`\`
> \`isGood()\` checks the tag's quality, not its value. Checking it first stops the screen from claiming a motor is "STOPPED" when the PLC link is down. Avoid comparing raw quality numbers: Ignition 7.x used 192 for Good, but 8.x uses a different set of quality codes, so old forum snippets that test for 192 no longer work.

## When does an expression re-run?

{{diagram:poll}}

Three triggers, depending on where the expression lives:

1. **A referenced input changes.** A binding re-evaluates when a tag it references changes, which is the common case and costs nothing when nothing moves.
2. **A time function ticks.** \`now(1000)\` reschedules the expression every 1000 ms.
3. **For expression tags, the tag's execution mode.** Fixed rate or tag group evaluates on a schedule. Event driven evaluates when inputs change.

\`runScript\` takes a polling rate as well, and in an expression *tag* that rate is limited by the tag group. If the group runs at 1 s and you ask for 60 s, the tag still evaluates every second. To poll at 60 s you need a 60 s group.

## runScript and what it costs

\`runScript("shared.fmt.timeAgo", 5000, {[.]LastSeen})\` calls a project script function from inside an expression. It is the bridge for anything the expression language cannot do. It is also the most abused function in Ignition.

- Each evaluation runs Python, which is slower than native expression functions. Fine for one tag, painful for 2000.
- A slow script, a database query or a network call inside it blocks the evaluation thread. Do not put those here.
- It is evaluated for every instance that uses it. In a UDT with 300 instances, that is 300 calls per poll.
- Pass inputs as arguments rather than reading tags from inside the script, so the platform knows what the expression depends on and re-evaluates it when they change.

If you are tempted to put logic with side effects in \`runScript\`, stop. Writes, database updates and messages belong in event scripts.

## Where expressions appear

| Location | What the expression decides |
|---|---|
| Expression tags | The tag's value |
| Perspective expression bindings | Any component property: text, colour, visibility, style classes |
| Tag properties | Many accept an expression, such as alarm setpoints, enabled flags and messages |
| Alarm properties | Active conditions, labels, display path, ack and notification text |
| Derived tag read/write expressions | The conversion in each direction |
| Vision bindings | Same language, evaluated on the client |

## Expression or script?

| Question | Expression | Script |
|---|---|---|
| Needs to re-evaluate automatically when inputs change | Yes, this is its strength | You must trigger it yourself |
| Needs loops, variables, error handling | No | Yes |
| Does something (write a tag, run SQL, send a message) | No, it cannot | Yes |
| Many instances evaluating continually | Cheap | Expensive when invoked via runScript |
| Must be reviewable by an operator-level engineer | Easy to read | Needs a developer |

Rule of thumb: use an expression for **derived values**, a script for **actions**. If an expression grows past three nested ifs, move the logic into a project library function, call it with \`runScript\` only if you must keep the live-update behaviour, and consider a transform or a Perspective custom property instead. See {{lesson:ign-scripting}} and {{lesson:persp-bindings}}.
`,

  eli5: `
A spreadsheet cell with a formula, like "=B2*9/5+32", is an expression. You never press a button to recalculate it. The moment B2 changes, the cell updates by itself. And the cell cannot do things like send an email. It only shows an answer.

Ignition's expression language is that cell. Put a formula in a text label, a colour or a tag, and Ignition keeps it up to date whenever any number it uses changes. You can add little decisions ("if the motor is faulted, say FAULT") and little lookups ("state 2 means Running").

A script is different. It is a recipe card for a person to follow: do step one, then step two, repeat until done, write the answer on the whiteboard. Recipes can do things, but someone has to tell them when to start.

runScript is when your spreadsheet cell secretly phones a cook to read a recipe every time it recalculates. It works, and it's handy for odd jobs, but if a thousand cells all phone the cook every second, the kitchen gets busy.
`,

  why: `
**Why a language with no side effects?** The platform re-runs expressions whenever any input changes, from many threads, with no guarantee about order or count. If an expression could write a tag or insert a row, that write would repeat on every re-evaluation. Making expressions pure means they can be re-run any number of times without harm.

**Why is runScript the controversial one?** It smuggles arbitrary code into a place the platform assumes is cheap. Experienced integrators accept it for formatting or small calculations on a handful of tags, and push back hard on database calls or loops inside it. A common compromise is to use \`runScript\` only for pure functions that take their inputs as arguments.

**Why polling rates matter.** A \`now(1000)\` in an expression on a Perspective view keeps the binding live for every open session, one evaluation per second per session. A hundred open sessions means a hundred evaluations a second. A tag expression runs once on the Gateway for everyone. If many screens need the same derived value, compute it once in an expression tag and bind to the tag.

**Why not compute everything in the PLC?** Do compute control-relevant values there. But presentation logic (text, colours, unit conversion for display) belongs in Ignition, where changing it needs no PLC download.

**Where people argue.** Expression tags versus Perspective bindings. Tags are shared, historized and alarmable but cost Gateway resources forever. Bindings are cheap and local but not visible elsewhere. If a value is used in one place, bind. If it is used in two or more places or needs history or alarms, make a tag.
`,

  examples: [
    {
      title: "Fahrenheit to Celsius for display",
      body: `A tag \`[default]Plant1/Area10/Line1/Mixer1/Temp\` holds temperature in F. A label binding: \`numberFormat(({[default]Plant1/Area10/Line1/Mixer1/Temp} - 32) * 5.0 / 9, "0.0") + " C"\`. A reading of 212 shows 100.0 C. Writing 5.0 (or wrapping the tag in \`toFloat()\`) keeps the arithmetic in floating point, so a whole-number tag cannot truncate the fraction. The tag is unchanged and the PLC never knows.`
    },
    {
      title: "Wrong poll rate on runScript",
      body: `An expression tag calls \`runScript("shared.calc.score", 60000, {[.]A})\`, but its tag group is 1 s. The tag evaluates every second, 60 times more than intended. Move it to a 60 s tag group, or use a derived design that does not need to poll at all.`
    }
  ],

  diagrams: {
    poll: `<svg viewBox="0 0 640 200" role="img" aria-label="Three things trigger expression evaluation: an input tag changing, a now() timer tick, and a tag group execution; runScript adds a call into the Python interpreter">
  <defs><marker id="ign-expressions-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="16" y="16" width="170" height="44" rx="6"/>
  <text class="dg-text-sm" x="28" y="43">Input tag changes</text>
  <rect class="dg-box" x="16" y="78" width="170" height="44" rx="6"/>
  <text class="dg-text-sm" x="28" y="105">now(1000) tick</text>
  <rect class="dg-box" x="16" y="140" width="170" height="44" rx="6"/>
  <text class="dg-text-sm" x="28" y="167">Tag group executes</text>
  <rect class="dg-box-accent" x="260" y="60" width="150" height="80" rx="6"/>
  <text class="dg-title dg-mid" x="335" y="92">Expression</text>
  <text class="dg-text-muted dg-mid" x="335" y="114">evaluated</text>
  <rect class="dg-box" x="480" y="16" width="144" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="552" y="42">New value</text>
  <text class="dg-text-muted dg-mid" x="552" y="60">tag or binding</text>
  <rect class="dg-box-warn" x="480" y="110" width="144" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="552" y="136">runScript</text>
  <text class="dg-text-muted dg-mid" x="552" y="154">Python call: costs</text>
  <line class="dg-line" x1="186" y1="38" x2="258" y2="84" marker-end="url(#ign-expressions-ah)"/>
  <line class="dg-line" x1="186" y1="100" x2="258" y2="100" marker-end="url(#ign-expressions-ah)"/>
  <line class="dg-line" x1="186" y1="162" x2="258" y2="116" marker-end="url(#ign-expressions-ah)"/>
  <line class="dg-line" x1="410" y1="84" x2="478" y2="50" marker-end="url(#ign-expressions-ah)"/>
  <line class="dg-dash" x1="410" y1="116" x2="478" y2="138" marker-end="url(#ign-expressions-ah)"/>
</svg>`
  },

  pitfalls: [
    "Putting a database query or HTTP call inside runScript, which blocks the evaluation.",
    "Using now() with the default rate in a binding and wondering why the Gateway is busy.",
    "Forgetting that an expression tag's runScript poll rate is capped by the tag group rate.",
    "Not guarding against bad quality, so an expression shows a plausible state for a dead device.",
    "Integer division giving 0 when you expected a fraction.",
    "Building 15-level nested ifs instead of using switch, lookup or a script function."
  ],

  keyTerms: ["ign-expression-language", "ign-runscript", "ign-expression-tag", "ign-quality-code", "ign-tag-group", "polling"],

  quiz: [
    {
      q: "An expression tag uses runScript with a 30,000 ms poll rate. The tag belongs to a 1,000 ms tag group. How often does it evaluate?",
      options: ["Every second, because the tag group limits the rate", "Every 30 seconds", "Never, the rates conflict", "Every 31 seconds"],
      answer: 0,
      explain: [
        "Correct. The tag keeps evaluating on its group schedule. A 30 s poll needs a 30 s group.",
        "The tag group, not the runScript argument, sets the minimum interval for an expression tag.",
        "Mismatched rates are legal. The faster group simply wins.",
        "Rates are not added together."
      ]
    },
    {
      q: "Which task should NOT be done in an expression?",
      options: ["Converting units for display", "Inserting a row into a database when a value changes", "Choosing a colour from a state number", "Formatting a timestamp"],
      answer: 1,
      explain: [
        "Pure conversions are the right use.",
        "Correct. Expressions are re-evaluated unpredictably and cannot cause side effects. Use an event script.",
        "A switch or if on a state number is ideal.",
        "dateFormat does this."
      ]
    },
    {
      q: "You need a Perspective label to show a tag chosen at runtime by a view parameter. Which expression feature do you reach for?",
      options: ["A constant braces reference", "now(0)", "A memory tag", "The tag() function with a built path"],
      answer: 3,
      explain: [
        "A braces reference is fixed in the expression text.",
        "now(0) returns the time once and has nothing to do with tag selection.",
        "A memory tag would still need something to choose which tag to mirror.",
        "Correct. tag() reads a path that is constructed when the expression runs."
      ]
    },
    {
      q: "What does try(1 / {[.]Flow}, 0) do when Flow is 0?",
      options: ["Returns infinity", "Raises an error and stops the tag", "Returns 0", "Returns null"],
      answer: 2,
      explain: [
        "Division by zero is an error in the expression, which try() catches.",
        "That is what would happen without try().",
        "Correct. try() returns its second argument when the first expression fails.",
        "The fallback is 0, not null."
      ]
    },
    {
      q: "The same derived value is needed on 12 views and in an alarm. Best approach?",
      options: ["Repeat the expression in each binding", "Use runScript in each view", "Create one expression tag and use it everywhere", "Write it in the PLC only"],
      answer: 2,
      explain: [
        "Twelve copies will diverge, and each session evaluates its own.",
        "This multiplies the cost and still repeats the logic.",
        "Correct. An expression tag computes once for everyone and can carry alarms and history.",
        "The PLC is right for control values. Presentation values can reasonably live in Ignition."
      ]
    }
  ],

  resources: [
    { title: "Expression Language and Syntax (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/expression-language-and-syntax", type: "docs", source: "Inductive Automation" },
    { title: "Expression Functions (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/expression-functions", type: "docs", source: "Inductive Automation" },
    { title: "runScript (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/expression-functions/advanced/runScript", type: "docs", source: "Inductive Automation" },
    { title: "tag expression function (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/expression-functions/advanced/tag", type: "docs", source: "Inductive Automation" },
    { title: "Expression Bindings in Perspective", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/perspective/working-with-perspective-components/bindings-in-perspective/expression-bindings-in-perspective", type: "docs", source: "Inductive Automation" }
  ]
});
