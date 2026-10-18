LC.lesson({
  id: "arch-reporting",
  title: "The Reporting module",
  track: "arch",
  minutes: 10,
  level: 2,
  prereqs: ["ign-databases"],
  tags: ["reporting", "pdf", "schedules", "named-queries", "perspective"],
  summary: "Design a report once in the Designer, feed it from queries, tags or scripts, then deliver it on a schedule or on demand.",
  objectives: [
    "Describe the three parts of a report: data sources, parameters and components",
    "Choose between query, tag history and scripted data sources",
    "Configure a schedule with email, save, FTP or print actions",
    "Show a report as a PDF in Perspective",
    "Apply practical tips to keep reports fast"
  ],

  body: `
## What the module does

The Reporting module lets you build paginated, printable documents such as shift summaries, batch records, daily production and alarm summaries. You design them in the Designer's report editor, bind them to data, and run them from the Gateway on a schedule or from a screen. Output is a document, not a live screen, and that is the right tool when someone needs a PDF to sign, send or file.

## Anatomy of a report

A report has three pieces:

1. **Data sources.** Where the rows come from.
2. **Parameters.** Inputs such as start date, line number or shift, supplied when the report runs.
3. **Components.** The visual elements placed on the page: tables, charts, text, images and shapes. They bind to data sources and parameters.

{{diagram:flow}}

### Data sources

{{term:report-data-source|Report data sources}} come in several types:

| Type | Use it for | Notes |
|---|---|---|
| Query | Anything in a SQL database | Use a **named query** where possible for parameter safety and reuse. See {{lesson:ign-databases}}. |
| Tag history | Process values over time | Choose tag paths, a time range and a return format or aggregation |
| Alarm journal | Alarm summaries | Filter by time and priority |
| Script | Combine, reshape or compute data | Python builds a dataset. Use it for joins across sources or calculations SQL can't do |

Report parameters feed the data sources. A \`StartDate\` and \`EndDate\` parameter, bound into a named query and a tag history source, gives you one report that works for any period.

### Components

Tables, charts and text boxes repeat across the page for each row of their data source. Group and sort in the data binding. Page headers and footers hold titles, page numbers and run times. Keep the layout simple. Reporting is a document tool, so complex dashboards belong in Perspective.

## Running and delivering reports

### Schedules

A {{term:report-schedule|report schedule}} uses a cron-style expression and runs on the Gateway, so it uses the Gateway's local time. A schedule can have several actions at once:

- **Email:** send to addresses or to users by role, with the subject, body and attachment name driven by expressions. Needs an SMTP profile on the gateway.
- **Save:** write the file to a path on the gateway's file system (a network share is common).
- **FTP:** upload to a server, with the filename built by an expression.
- **Print:** send to a printer, with options such as copies, duplex and orientation.
- **Run Script:** call a script with the finished report so you can post-process it, for example to upload it somewhere custom.

Formats include PDF, CSV, HTML, XLS, RTF, XML and image types. PDF is the usual choice for documents people read, and CSV or XLS when someone will keep working with the data.

> [!example] Daily shift report
> Schedule: \`0 0 6,14,22 * * ?\` (a six-field, Quartz-style cron expression with seconds first: second 0, minute 0, hours 6, 14 and 22, any day of month and month, and \`?\` meaning "no specific value" for day of week; verify the format in the schedule editor for your version). It runs at 6:00, 14:00 and 22:00 on the Gateway clock. Parameters: \`StartDate\` = an expression for 8 hours earlier, \`EndDate\` = now. Actions: Email the PDF to the \`Supervisor\` role with subject \`Shift report \` plus the date, and Save a copy to \`\\\\fileserver\\reports\\shift\\\`. The email is delivered, and the file archive is there when someone asks for last Tuesday's report.

### On demand in Perspective

Perspective can show a report in a **Report Viewer** component, which displays the generated PDF. You bind the report path and parameters, often to dropdowns and date pickers on the screen. Users can also download the PDF. Scripts can call the report functions in the \`system.report\` package to generate files from buttons or events (names per the 8.3 scripting function list; check the manual for your version).

> [!note] In 8.1
> The same schedule model applies. Some Perspective report options and the print-mode behavior changed in later 8.3 patch releases, so read the release notes for your version.

## Performance tips

- **Push work to SQL.** Aggregate, filter and sort in the query, not in the report. A report that pulls a million raw rows to total them is the most common slow report.
- **Limit time ranges and rows.** Cap the parameter range, and use tag history aggregation (hourly or per-shift) over raw values.
- **Cache heavy data.** If five reports use the same expensive query, compute it once into a summary table on a schedule.
- **Avoid scripts for big loops.** Python over tens of thousands of rows is slower than the same logic in SQL.
- **Stagger schedules.** Twenty reports at 6:00:00 each hit the database at once. Offset them by a few minutes.
- **Mind the gateway.** Generating large PDFs uses memory. Heavy reporting at the end of a shift can slow screens if the gateway is small. Move reports to a separate gateway on large systems (see {{lesson:arch-patterns}} for splitting workloads).
`,

  eli5: `
Think of a school report card. The teacher doesn't write each one from scratch. There's a template with boxes: your name at the top, a table of grades, a comment at the bottom. The template stays the same. Only the facts change.

A report in Ignition works the same way. You draw the template once, and tell each box where to look: "get the grades from the gradebook, get the name from the student list". Then you tell it when to make them and where to send them: every Friday at 3 p.m., mail one to each parent and put a copy in the filing cabinet.

The template is the design. The gradebook and the student list are the data sources. The Friday schedule is the delivery. And if you ask the gradebook for every grade ever recorded, the report card will take forever, so you ask it only for this term.
`,

  why: `
**Why reports when you have dashboards?** Dashboards show now. Reports show a period and become a record. A batch record, a daily environmental report or a shift handover is something people sign, file and audit. A fixed document, generated at a known time from a known query, is a better record than a screen someone screenshotted.

**Why named queries?** A report that builds SQL by concatenating a parameter into a string is open to injection and breaks on odd characters. Named queries bind parameters properly, can be tested alone, and are shared by screens and reports, so the numbers agree everywhere. When two places report different totals for the same shift, the cause is usually two hand-written queries.

**Why compute in SQL?** The database is built to aggregate. The gateway is not. Reports that look fast in testing with a day of data become the slowest thing on the system after a year of production data.

**Why schedule on the Gateway?** Reports then run with no client open, at a defined time and under a defined identity. The tradeoff is that the schedule uses the Gateway's clock and time zone. Plants with multiple time zones should note which clock a report follows and say so in the report header.

**What integrators argue about.** Whether to use the Reporting module or an external BI tool for management reporting. The Reporting module wins for operational documents tied to tag history and alarms. External BI wins for cross-plant analytics and ad hoc exploration. Many systems use both.
`,

  history: `
The Reporting module has been part of Ignition since the 7.x line (the 7.9 manual documents it) and is used with both Vision and Perspective in 8.x. Schedules and delivery actions run on the Gateway.
`,

  examples: [
    {
      title: "Parameters and a named query",
      body: `A report has parameters \`LineId\` (integer), \`StartDate\` and \`EndDate\`. A Query data source calls the named query \`Production/ShiftTotals\` with all three bound. A second data source reads tag history for \`[default]Line1/Speed\` with the same dates. The table shows shift totals from SQL, and a chart shows speed over time from the historian.`
    },
    {
      title: "Fixing a slow monthly report",
      body: `A monthly report takes 4 minutes because a script data source loops over 2 million rows. Moving the \`GROUP BY day, product\` into the SQL query returns about 300 rows. The report now runs in seconds, and the script is deleted.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 220" role="img" aria-label="Parameters and data sources feed a report design, which produces a document delivered by schedule or on demand">
  <defs><marker id="arch-reporting-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="16" y="20" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="91" y="47">Parameters</text>
  <rect class="dg-box" x="16" y="80" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="91" y="107">Named query</text>
  <rect class="dg-box" x="16" y="140" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="91" y="167">Tag history / script</text>
  <rect class="dg-box-accent" x="250" y="60" width="140" height="80" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="95">Report design</text>
  <text class="dg-text-sm dg-mid" x="320" y="115">tables, charts, text</text>
  <rect class="dg-box" x="474" y="20" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="549" y="47">Schedule: email, save</text>
  <rect class="dg-box" x="474" y="80" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="549" y="107">FTP or print</text>
  <rect class="dg-box" x="474" y="140" width="150" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="549" y="167">Perspective PDF</text>
  <line class="dg-line" x1="166" y1="42" x2="248" y2="88" marker-end="url(#arch-reporting-ah)"/>
  <line class="dg-line" x1="166" y1="102" x2="248" y2="102" marker-end="url(#arch-reporting-ah)"/>
  <line class="dg-line" x1="166" y1="162" x2="248" y2="116" marker-end="url(#arch-reporting-ah)"/>
  <line class="dg-line" x1="392" y1="88" x2="472" y2="42" marker-end="url(#arch-reporting-ah)"/>
  <line class="dg-line" x1="392" y1="102" x2="472" y2="102" marker-end="url(#arch-reporting-ah)"/>
  <line class="dg-line" x1="392" y1="116" x2="472" y2="162" marker-end="url(#arch-reporting-ah)"/>
</svg>`
  },

  pitfalls: [
    "Aggregating in the report or a script instead of in SQL.",
    "Building SQL by string concatenation in a report query instead of using a named query.",
    "Scheduling many reports at the same minute.",
    "Forgetting that schedules use the Gateway's clock and time zone.",
    "Using a report to do a dashboard's job, with many components and no pagination."
  ],

  keyTerms: ["report-data-source", "report-schedule", "historian", "scada"],

  quiz: [
    {
      q: "A monthly report takes minutes because a script data source sums 2 million rows in Python. Best fix?",
      options: ["Aggregate in the SQL query so the report receives a few hundred rows", "Add more report components", "Print it instead of emailing", "Schedule it at midnight"],
      answer: 0,
      explain: [
        "Correct. Databases aggregate efficiently, and the report only formats the result.",
        "More components don't speed anything up.",
        "Delivery isn't the bottleneck.",
        "Midnight hides the problem but doesn't fix it."
      ]
    },
    {
      q: "Which actions can a report schedule run after generating a report?",
      options: ["Only email", "Only save to a file", "Print, FTP, Save, Email and Run Script", "Only open it in Perspective"],
      answer: 2,
      explain: [
        "Several actions can be attached to one schedule.",
        "Save is only one of the actions.",
        "Correct. You can combine them, for example email and save.",
        "On-demand viewing is separate from scheduled delivery."
      ]
    },
    {
      q: "Why prefer a named query to a concatenated SQL string in a report?",
      options: ["Named queries run in the browser", "They bind parameters safely, can be tested alone and are reused by screens and reports", "Named queries bypass the database", "They avoid needing parameters"],
      answer: 1,
      explain: [
        "They run on the Gateway against the database.",
        "Correct. Safety and consistency are the main benefits.",
        "They still query the database.",
        "They use parameters; that is their point."
      ]
    },
    {
      q: "A report scheduled for 06:00 arrives at 07:00 for the east-coast plant, but the Gateway is in the central time zone. Why?",
      options: ["Reports always run an hour late", "The email server is slow", "PDFs take an hour to generate", "Schedules use the Gateway's local time"],
      answer: 3,
      explain: [
        "There is no built-in delay.",
        "A slow mail server rarely shifts delivery by exactly an hour.",
        "Generation time is seconds to minutes, not a fixed hour.",
        "Correct. Schedule against the Gateway's clock or adjust the cron expression."
      ]
    },
    {
      q: "Operators need a PDF of the current shift on a Perspective screen, chosen with a date picker. What do you use?",
      options: ["A schedule that emails the report", "A Vision-only print button", "An external BI tool only", "A Report Viewer bound to the report path and parameters"],
      answer: 3,
      explain: [
        "Scheduling is for unattended delivery, not interactive choice.",
        "Perspective has its own viewer; no Vision is needed.",
        "The module can do this natively.",
        "Correct. Bind the parameters to screen inputs and display the PDF."
      ]
    }
  ],

  resources: [
    { title: "Reporting (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/reporting", type: "docs", source: "Inductive Automation" },
    { title: "Scheduling Actions (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/reporting/report-schedules/scheduling-actions", type: "docs", source: "Inductive Automation" },
    { title: "Report Designer Interface (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/reporting/report-designer-interface", type: "docs", source: "Inductive Automation" },
    { title: "Reporting Interface video", url: "https://inductiveuniversity.com/videos/reporting-interface/8.3", type: "video", source: "Inductive University" },
    { title: "Scheduling: Run Script video", url: "https://inductiveuniversity.com/videos/scheduling-run-script/8.3", type: "video", source: "Inductive University" }
  ]
});
