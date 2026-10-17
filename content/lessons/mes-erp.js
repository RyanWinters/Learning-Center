LC.lesson({
  id: "mes-erp",
  title: "ERP integration, B2MML and ISA-95 Part 2",
  track: "mes",
  minutes: 25,
  level: 4,
  prereqs: ["mes-what", "arch-webdev"],
  tags: ["erp", "isa-95", "b2mml", "integration", "sap", "rest"],
  summary: "Orders flow down from ERP, production and consumption flow back up. ISA-95 gives the vocabulary, and B2MML gives the XML.",
  objectives: [
    "Name the ISA-95 Part 2 object models and what each carries",
    "Trace the typical flow of a work order from ERP to the plant and back",
    "Read a small B2MML message",
    "Choose between REST, file drops and middleware for an integration",
    "Describe what Sepasoft's Business Connector and Web Services do, and speak about SAP without overclaiming"
  ],

  body: `
## Why this integration exists

The {{term:erp|ERP}} knows what the business wants made, bought and shipped. The plant floor knows what actually happened. Without a connection, someone re-keys orders from a screen into a spreadsheet, and someone else types production totals back at the end of the week. ERP integration removes that re-keying. It is also where many MES projects stall, because the two sides use different words for the same things. {{term:isa-95|ISA-95}} exists to fix that.

## ISA-95 Part 2: the shared nouns

{{term:isa-95-part-2|ISA-95 Part 2}} (ANSI/ISA-95.00.02, also published as IEC 62264-2) defines the data that moves across the line between Level 4 (business) and Level 3 (manufacturing operations). It is a set of object models: lists of things, their attributes and how they relate. The standard is paid, so treat this lesson as orientation, not a replacement.

| Object model | What it describes | Example |
|---|---|---|
| Material | Material definitions, classes, lots and sublots | Part 4471 "Widget Blue", lot L-20481 |
| Equipment | Equipment, classes and capabilities | Filler 3, capacity 400 per minute |
| Personnel | People, classes and qualifications | Operator class "Forklift certified" |
| Process segment | A reusable step: what resources it needs | "Fill and cap" needs Filler class, Operator class |
| Production schedule | What to make, how much, by when | Order 1001234, 5,000 units, due Friday |
| Production performance | What was made, consumed and when | 4,980 good, 20 scrap, 312 kg resin used |
| Production capability | What the plant could make | Filler 3 available next shift |

In practice the integrations that matter first are **production schedule** (down) and **production performance** (up), with **material** data shared in both directions.

Part 4 of the standard goes deeper into operations management models for scheduling, performance and work records. Most plant projects use only Part 2 vocabulary and a subset of its fields.

## Typical flows

{{diagram:flow}}

**Down from ERP:**

1. **Master data.** Material definitions, bills of materials and sometimes routings or recipes. This changes slowly.
2. **Work orders (production orders).** A {{term:work-order|work order}} with product, quantity, due date and order number. This is the daily heartbeat.

**Up from MES:**

1. **Order status.** Released, running, complete.
2. **Production confirmation.** Good quantity, scrap, time, and the lot produced.
3. **Material consumption.** What was actually used, by lot. This feeds inventory and cost.
4. **Quality results and holds.** Where the business needs them.

> [!warning] Agree on the unit of truth
> Who owns the order quantity once it's released? Who can cancel a running order? If the ERP says 5,000 and the line made 5,200, whose number wins? Settle these rules before anyone writes a mapping.

## B2MML: ISA-95 in XML

{{term:b2mml|B2MML}} (Business To Manufacturing Markup Language) is an XML schema set that implements the ISA-95 models. It is maintained by MESA International and is free. A message names its type (such as ProductionSchedule or ProductionPerformance) and carries elements that line up with Part 2 objects.

A deliberately small production schedule fragment:

\`\`\`json
{
  "note": "Shown as JSON for readability. Real B2MML is XML, see the next block."
}
\`\`\`

\`\`\`text
<ProductionSchedule>
  <ID>SCHED-2026-10-17</ID>
  <ProductionRequest>
    <ID>1001234</ID>
    <StartTime>2026-10-19T06:00:00Z</StartTime>
    <EndTime>2026-10-21T14:00:00Z</EndTime>
    <SegmentRequirement>
      <ProcessSegmentID>FILL-CAP</ProcessSegmentID>
      <MaterialProducedRequirement>
        <MaterialDefinitionID>WIDGET-BLUE</MaterialDefinitionID>
        <Quantity>
          <QuantityString>5000</QuantityString>
          <UnitOfMeasure>EA</UnitOfMeasure>
        </Quantity>
      </MaterialProducedRequirement>
    </SegmentRequirement>
  </ProductionRequest>
</ProductionSchedule>
\`\`\`

The element names above follow the B2MML style, but real schema versions differ in detail (element names, namespaces, required fields). Always validate against the schema version your partners agree on, not a blog post.

A few things to know:

- B2MML is verbose. A single order can be a page of XML.
- Both sides rarely implement the whole schema. You agree on a **subset profile**: which elements are required, which codes are valid, which units are used.
- It's a format, not a transport. B2MML says what the message looks like. You still choose how it travels.
- Many modern projects send JSON that follows the same ISA-95 shapes, which keeps the model and drops the XML. That is a reasonable choice if both sides agree.

## Integration patterns

| Pattern | How it works | Strengths | Weak points |
|---|---|---|---|
| File drop | One system writes an XML or CSV file into a shared folder or SFTP; the other polls and picks it up | Simple, works across firewalls, easy to inspect | Latency, partial files, no immediate error response, cleanup |
| REST / web service | One system calls the other's HTTP endpoint with JSON or XML | Real-time, standard tooling, clear responses | Needs both ends reachable, authentication and retry logic |
| Database staging tables | Each side reads and writes agreed tables | Easy for DBAs, queued naturally | Tight coupling, schema changes break both sides |
| Message queue | Messages go through a broker with guaranteed delivery | Decoupled, handles outages | More infrastructure |
| Middleware / integration platform | A hub translates and routes between systems | One place for mapping, retries, monitoring | License cost, another thing to run |

For ERP traffic, the dominant concern is **not losing a confirmation**. An ERP that never hears a goods receipt shows wrong inventory. That makes retry, idempotency (sending the same message twice doesn't double-count) and a visible error queue more important than raw speed.

> [!example] Handling a duplicate confirmation
> The MES sends "order 1001234, 500 good units, confirmation ID C-77" and the network drops the reply. The MES retries. If the ERP keys on confirmation ID C-77, it recognizes the repeat and ignores it. If it doesn't, inventory shows 1,000. Always include a unique ID.

## Where Ignition and Sepasoft fit

Plain Ignition can do all of the above with Python scripting: \`system.net.httpClient\` for REST calls, file handling for drops, Named Queries for staging tables, and the gateway's web development tools for receiving calls (see {{lesson:arch-webdev}}). It's fully custom, so you own the mapping, retries and error screens.

Sepasoft provides products aimed at this job:

- **{{term:business-connector|Business Connector}}** is a module for linking MES with ERP and other business systems. You build the logic with visual blocks, map fields, and can run scripts to clean or convert data. Per Sepasoft's documentation, it can create MES objects from B2MML-style structures, including material, operations schedule, process segment and operations definition, plus a Sepasoft work order object.
- **Web Services** is a separate module for REST and SOAP connectivity.
- **Interface for SAP ERP** extends the Business Connector with a native SAP interface.

Module names, supported versions and capabilities change, so check the Sepasoft documentation for your release.

## SAP awareness

SAP is the ERP you will meet most, and it deserves care. Some safe, general points:

- SAP has used **{{term:sap-idoc|IDocs}}** (Intermediate Documents) as a standard way to exchange business documents. They are delivered through an SAP-side configuration and usually a connector or middleware.
- Newer SAP products expose business objects as **{{term:odata|OData}}** services, a REST-style API.
- SAP ERP, S/4HANA and SAP Digital Manufacturing differ in what interfaces exist. Which one the customer runs changes the design.
- SAP configuration (partner profiles, ports, authorizations) is done by SAP basis and functional people, not by you. Plan time with them.

Do not promise "we can connect to SAP" without knowing the version, the object (production orders? goods movements?), and who owns the SAP side. The plant-side mapping is usually the easy part.

## A worked slice

A food plant. ERP releases production order 1001234 for 5,000 cases of WIDGET-BLUE.

1. Middleware delivers a ProductionSchedule message to the gateway's REST endpoint.
2. The gateway validates it, writes a \`work_order\` row with status "Released", and raises it on the scheduler screen.
3. The operator starts the order. Status changes to "Running" and the MES posts status back.
4. The line runs. The MES accumulates good count, scrap and consumed resin by lot.
5. On completion, the MES builds a ProductionPerformance message: order 1001234, 4,980 good, 20 scrap, resin lot R-5521 312 kg, with a unique confirmation ID.
6. The middleware forwards it to ERP. If ERP is down, the message waits in a queue and a screen shows "1 confirmation pending."
`,

  eli5: `
Picture a school with two offices. The front office decides which classes run, who teaches and how many desks are needed. The classrooms actually do the teaching. They need to talk to each other all day.

If the front office writes in one language and the classrooms use another, notes get lost. So both sides agree on a form with the same boxes: "Class name, teacher, number of students, time." That agreed form is what ISA-95 is about.

The front office hands down a form saying "Teach math to 25 students at 9." The classroom teaches, then hands back a form saying "Taught 24 students, one was sick." Writing the form in a standard computer format makes it easy to send. B2MML is one such format.

You can pass the forms by leaving them in a tray (a file drop), by phoning (a web call), or through a messenger who carries them and tries again if no one answers (middleware). What matters is that no form gets lost and nobody counts the same form twice.
`,

  why: `
**Why use ISA-95 vocabulary at all?** Because the alternative is a custom mapping for every pair of systems. If ERP's "production order" and MES's "work order" both map to ISA-95's production request, you have one shared definition to point to when two teams argue. The standard won't settle every field, but it ends many meetings.

**Why not integrate directly at the database level?** It's tempting: read ERP tables, write MES tables. It's also fragile. ERP upgrades change tables, and the ERP team does not expect an outside system to depend on them. Supported interfaces (web services, IDocs, APIs) are slower to set up and far safer to keep.

**Why is MES-to-ERP usually asynchronous?** The plant must keep running if the ERP is down for maintenance. If every start button waits for an ERP answer, an ERP outage becomes a production outage. Experienced integrators buffer orders locally and queue confirmations so the line never depends on the back office being online.

**What do people argue about?** Whether to send XML or JSON, whether middleware is worth its cost for one plant, and how much of B2MML to implement. A common compromise: use ISA-95 shapes for data, pick the lightest transport that is reliable, and add middleware once there are three or more systems to connect.

**Where do projects fail?** Rarely on technology. They fail on ownership (who corrects bad master data?), on units and rounding that differ between systems, and on the ERP team's availability.
`,

  history: `
ISA-95 grew out of the Purdue Reference Model and work in the 1990s to define the boundary between business and plant systems. It was published as ANSI/ISA-95 and adopted internationally as IEC 62264. B2MML was created by the World Batch Forum, which later became part of MESA International, to give the ISA-95 models a concrete XML form. The standard continues to evolve, and the ISA site lists different editions across its parts, so check the current edition before you cite one.
`,

  examples: [
    {
      title: "Mapping a work order into an Ignition table",
      body: `Incoming fields map to a \`work_order\` table: ProductionRequest/ID to \`order_no\`, MaterialDefinitionID to \`product_code\`, Quantity to \`qty_ordered\`, UnitOfMeasure to \`uom\`, StartTime to \`planned_start\`. Add \`status\` ("Released"), \`received_at\` and \`erp_message_id\`. Store the raw message too, so you can replay it when a mapping bug turns up.`
    },
    {
      title: "File drop with a safe handoff",
      body: `ERP writes \`orders_20261017.xml.tmp\`, then renames it to \`orders_20261017.xml\` when complete. A gateway timer script only reads files that end in \`.xml\`, moves each to \`/processed\` after success or \`/error\` on failure. The rename trick avoids reading half-written files, the most common file-drop bug.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 230" role="img" aria-label="ERP sends master data and work orders down to MES; MES sends status, production confirmation and material consumption back up">
  <defs><marker id="mes-erp-ah" markerWidth="10" markerHeight="8" refX="8" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L9,4 L0,8 z"/></marker></defs>
  <rect class="dg-box-accent" x="20" y="30" width="170" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="105" y="62">ERP</text>
  <text class="dg-text-sm dg-mid" x="105" y="84">Level 4</text>
  <rect class="dg-box" x="450" y="30" width="170" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="535" y="62">MES / Ignition</text>
  <text class="dg-text-sm dg-mid" x="535" y="84">Level 3</text>
  <line class="dg-line" x1="190" y1="50" x2="448" y2="50" marker-end="url(#mes-erp-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="42">Work orders, master data</text>
  <line class="dg-line" x1="448" y1="82" x2="192" y2="82" marker-end="url(#mes-erp-ah)"/>
  <text class="dg-text-sm dg-mid" x="320" y="102">Status, good/scrap, consumption</text>
  <rect class="dg-box" x="200" y="140" width="240" height="44" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="160">Transport: REST, file drop,</text>
  <text class="dg-text-sm dg-mid" x="320" y="176">queue or middleware</text>
  <text class="dg-text-muted dg-mid" x="320" y="210">Payload shapes follow ISA-95 Part 2 (B2MML or JSON)</text>
</svg>`
  },

  pitfalls: [
    "Sending a confirmation with no unique ID, so a retry double-counts inventory.",
    "Making the line wait on a live ERP answer, so an ERP outage stops production.",
    "Reading from or writing to ERP database tables instead of a supported interface.",
    "Mapping units of measure by assumption (cases vs eaches, kg vs lb) and finding out at month-end close.",
    "Implementing the whole B2MML schema when you only need three message types and a subset profile.",
    "Promising SAP connectivity before knowing the SAP version, object and who owns the SAP configuration.",
    "Reading half-written files in a file-drop folder."
  ],

  keyTerms: ["erp", "isa-95", "isa-95-part-2", "b2mml", "work-order", "business-connector", "sap-idoc", "odata", "rest-api", "middleware"],

  quiz: [
    {
      q: "Which two ISA-95 Part 2 object models carry the main daily traffic between ERP and MES?",
      options: ["Personnel and equipment capability", "Production schedule (down) and production performance (up)", "Process segment and capability", "Material class and personnel class"],
      answer: 1,
      explain: [
        "These are real models but they change slowly and are not the daily flow.",
        "Correct. Orders go down as a production schedule and results come back as production performance.",
        "These describe reusable steps and what the plant could do, not what is happening today.",
        "Classes describe definitions and change rarely."
      ]
    },
    {
      q: "What is B2MML?",
      options: ["A network protocol like MQTT", "An XML implementation of the ISA-95 object models", "A Sepasoft database", "A SAP message format"],
      answer: 1,
      explain: [
        "B2MML is a message format, not a transport protocol.",
        "Correct. It defines the XML shapes for ISA-95 data, and you choose how to transport it.",
        "It's a standard schema, not a product-specific database.",
        "It's maintained by MESA and isn't specific to SAP, though SAP integrations may use or map to it."
      ]
    },
    {
      q: "The MES sends a production confirmation, the network drops the reply, and the MES retries. How do you avoid double inventory?",
      options: ["Never retry", "Include a unique confirmation ID that the receiver uses to ignore repeats", "Send it twice every time", "Make the operator re-enter it"],
      answer: 1,
      explain: [
        "Not retrying means lost confirmations, which is just as bad.",
        "Correct. An idempotent receiver keyed on a unique ID makes retries safe.",
        "That would guarantee duplicates unless the ID check exists.",
        "Manual re-entry is slow and error-prone."
      ]
    },
    {
      q: "A plant wants to keep running during ERP maintenance windows. Which design fits best?",
      options: ["Each start button waits for a live ERP response", "Buffer released orders locally and queue confirmations until ERP is reachable", "Disable order tracking during the window", "Run ERP on the plant network"],
      answer: 1,
      explain: [
        "That makes an ERP outage a production outage.",
        "Correct. Local buffering decouples the line from the back office.",
        "Losing tracking leaves gaps in the records.",
        "ERP location doesn't remove the dependency, and it is not usually possible."
      ]
    },
    {
      q: "A customer says, 'Just connect us to SAP.' What should you do first?",
      options: ["Quote a fixed price", "Find out the SAP product and version, which objects are needed, and who owns the SAP configuration", "Install the Business Connector and test", "Write the B2MML schema from scratch"],
      answer: 1,
      explain: [
        "Pricing before scoping is how integrations go over budget.",
        "Correct. SAP ERP, S/4HANA and other products expose different interfaces, and SAP-side work needs SAP staff.",
        "Tools come after you know the interface and the objects.",
        "B2MML is published. You don't write the schema, you agree on a profile."
      ]
    },
    {
      q: "Which integration pattern most easily produces half-read data if you are careless?",
      options: ["REST call", "File drop in a shared folder", "Message queue", "Middleware hub"],
      answer: 1,
      explain: [
        "A REST call delivers a complete request or fails.",
        "Correct. A poller can pick up a file the writer hasn't finished. Write to a temporary name and rename when complete.",
        "Queues deliver whole messages.",
        "Middleware normally deals in whole messages."
      ]
    }
  ],

  resources: [
    { title: "ISA-95 Standard: Enterprise-Control System Integration", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard", type: "standard", source: "ISA" },
    { title: "The ISA-95 Enterprise-Control System Integration standards", url: "https://www.isa.org/intech/2020/september-october/the-isa-95-enterprise-control-system-integration-s", type: "article", source: "ISA InTech" },
    { title: "ANSI/ISA-95.00.02-2018 (IEC 62264-2 Mod)", url: "https://www.isa.org/products/ansi-isa-95-00-02-2018-enterprise-control-system-i", type: "standard", source: "ISA" },
    { title: "Business Connector and Web Services", url: "https://docs.sepasoft.com/articles/user-manual/business-connector-and-web-services", type: "docs", source: "Sepasoft" },
    { title: "Mapping to B2MML Structures", url: "https://docs.sepasoft.com/articles/user-manual/mapping-to-b2mml-structures/a/h3__1605017496", type: "docs", source: "Sepasoft" },
    { title: "Business Connector Server", url: "https://docs.sepasoft.com/articles/user-manual/business-connector-server", type: "docs", source: "Sepasoft" }
  ]
});
