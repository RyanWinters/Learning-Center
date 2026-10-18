LC.lesson({
  id: "mes-track-trace",
  title: "Track & trace and genealogy",
  track: "mes",
  minutes: 15,
  level: 3,
  prereqs: ["mes-what", "db-schema"],
  tags: ["genealogy", "lots", "serials", "traceability", "recall", "barcodes", "part-11"],
  summary: "When a supplier calls about a bad lot, genealogy is how you find every product it touched in minutes instead of weeks. It is a graph in a database, fed by scans at the right moments.",
  objectives: [
    "Distinguish lot and serial tracking and say when each is used",
    "Model material lots, consumption and output lots as a genealogy graph",
    "Run a forward trace and a backward trace, and explain which question each answers",
    "Walk through a recall and see how granularity changes the recall size",
    "Design scanning and labeling so records are created at the moment of truth, and describe the regulatory drivers at awareness level"
  ],

  body: `
## What track and trace is

**Tracking** records where something is and what happens to it. **Genealogy** records what it was made from and what was made from it. Together they let you answer two questions on demand. *Where did this finished product come from?* and *Where did this ingredient go?* In ISA-95 terms this is the tracking activity from {{lesson:mes-what}}, and it is the feature that customers and regulators care about most.

You do not need regulation to want it. Any plant that has had a bad lot of resin, steel or flour knows the cost of "we think it was a few days of production."

## Lots and serials

| | Lot (batch) | Serial number |
|---|---|---|
| Identifies | A group made together under the same conditions | One individual item |
| Typical use | Ingredients, chemicals, bulk, food, packaging | Electronics, medical devices, vehicles, serialized drugs |
| Record size | One row per lot | One row per unit, so millions of rows |
| Trace precision | The whole lot is suspect | Only the affected unit |
| Cost | Cheap | Needs a mark or label on every unit and a scan at each step |

Many plants use both. A cereal maker tracks ingredient lots into a mix batch, then a packaging lot code on every carton. An electronics maker serializes each board and records which reel of capacitors and which solder paste lot went onto it.

A **{{term:genealogy|genealogy}}** (or "as-built record") is the set of links connecting inputs to outputs. It is a graph, not a list, because lots split (one resin lot feeds many work orders) and merge (many lots feed one batch).

{{diagram:graph}}

## The data model

A handful of tables carry most of what you need.

\`\`\`sql
CREATE TABLE material_lot (
  lot_id       VARCHAR(40) PRIMARY KEY,   -- supplier lot or internal lot
  material     VARCHAR(30) NOT NULL,      -- part number
  qty_received DECIMAL(12,3) NOT NULL,
  uom          VARCHAR(8)  NOT NULL,
  status       VARCHAR(12) NOT NULL,      -- OK, QUARANTINE, HOLD, CONSUMED
  expiry_date  DATE NULL,
  supplier     VARCHAR(40) NULL
);

CREATE TABLE work_order (
  wo_id    VARCHAR(30) PRIMARY KEY,
  product  VARCHAR(30) NOT NULL,
  line_id  INT NOT NULL
);

-- The edge table: this input lot was consumed into this output lot
CREATE TABLE lot_consumption (
  id          BIGINT IDENTITY PRIMARY KEY,
  wo_id       VARCHAR(30) NOT NULL,
  input_lot   VARCHAR(40) NOT NULL,
  output_lot  VARCHAR(40) NOT NULL,
  qty         DECIMAL(12,3) NOT NULL,
  ts          DATETIME2 NOT NULL,
  equipment   VARCHAR(30) NULL,
  operator_id VARCHAR(20) NULL
);

CREATE TABLE unit (
  serial     VARCHAR(40) PRIMARY KEY,
  lot_id     VARCHAR(40) NOT NULL,       -- finished-goods lot
  wo_id      VARCHAR(30) NOT NULL,
  made_ts    DATETIME2 NOT NULL,
  status     VARCHAR(12) NOT NULL
);

-- Packing link: which units went into which carton (comes from the packing line)
CREATE TABLE carton_unit (
  carton_id  VARCHAR(40) NOT NULL,
  serial     VARCHAR(40) NOT NULL,
  PRIMARY KEY (carton_id, serial)
);

-- Output lot to customer
CREATE TABLE shipment (
  id         BIGINT IDENTITY PRIMARY KEY,
  lot_id     VARCHAR(40) NOT NULL,
  customer   VARCHAR(40) NOT NULL,
  ship_date  DATE NOT NULL,
  pallets    INT NOT NULL
);
\`\`\`

\`lot_consumption\` is the heart of it. Every trace is a walk over that table. Add an events table for inspections and holds and you have most of a traceability system. Cartons and shipments are separate links: if finished units are boxed, the carton-to-serial map has to come from the packing line, because nothing upstream knows it. Keep rows **append-only**. If a scan was wrong, add a correction record with a reason instead of overwriting the original.

## Forward and backward trace

- **Backward trace** (upstream): start from a finished unit or lot and find everything it was made from. This answers complaints: "Customer X found a defect in carton 7450-A. What was in it?"
- **Forward trace** (downstream): start from an input lot and find everything made with it, and where those went. This answers supplier notices: "Resin lot R-5521 is contaminated. What did it touch?"

Forward trace is the one that drives recalls, because it has to be complete. Backward trace has to be accurate. Either can be written as a recursive query:

\`\`\`sql
-- Forward trace: everything downstream of a bad input lot
WITH RECURSIVE downstream(lot_id, depth) AS (
  SELECT 'R-5521', 0
  UNION ALL
  SELECT c.output_lot, d.depth + 1
  FROM lot_consumption c
  JOIN downstream d ON c.input_lot = d.lot_id
  WHERE d.depth < 50              -- guard against a mis-scan that loops back
)
SELECT DISTINCT d.lot_id, d.depth, s.customer, s.ship_date
FROM downstream d
LEFT JOIN shipment s ON s.lot_id = d.lot_id
ORDER BY d.depth;
\`\`\`

(SQL Server omits the \`RECURSIVE\` keyword; the rest is the same.) The depth guard matters. One mis-scan that links a lot to its own descendant makes the query loop until the database stops it. Pick a limit above your deepest real chain. Swap the join direction to get the backward trace.

## A worked recall

On Wednesday the resin supplier reports that lot **R-5521** may be contaminated. The lot arrived as 1,000 kg.

| Step | Record |
|---|---|
| Consumed | 300 kg into work order WO-701 (Mon), 450 kg into WO-702 (Tue), 250 kg still in the warehouse |
| WO-701 output | finished lots FG-701A and FG-701B |
| WO-702 output | finished lot FG-702A |
| Shipments | FG-701A to Customer A (4 pallets), FG-701B to Customer B (2 pallets), FG-702A: 3 pallets shipped to Customer A, 5 pallets still in the warehouse |

The forward trace takes seconds:

1. **Quarantine** the 250 kg of R-5521 in stock. Set its status to HOLD so a scan at the hopper is rejected.
2. **Find finished goods** made with it: FG-701A, FG-701B, FG-702A.
3. **Locate them.** 5 pallets of FG-702A are in the warehouse and can be held. 9 pallets are with customers: 4 and 3 at Customer A, 2 at Customer B.
4. **Notify** Customer A and Customer B with the lot codes, quantities and ship dates.

The first check on any recall is a mass balance: **received = consumed + on hand + scrapped + returned**. Here 1,000 kg received = 300 + 450 consumed + 250 on hand, with nothing scrapped or returned, so it balances. A gap means a missing or wrong scan, and you must resolve it before you tell a customer the affected set is complete.

The diagram also shows R-5530 feeding WO-702. That was a top-up of the hopper from a second resin lot during Tuesday's run. It does not change this recall (R-5530 is not suspect) but it does mean FG-702A has two resin parents, and a recall on R-5530 would reach it too.

Without genealogy the plant would have to treat every product made in the window since the lot arrived as suspect. With it, three finished lots are affected. Now notice how granularity changes the answer. If operators scanned the resin lot only when the pallet was received, and the system assumed "all resin used on any line this week came from R-5521", the recall would cover every line. If the hopper was loaded from R-5521 and R-5530 mixed together, both lots link to every output made from that hopper afterward. Record consumption when the material **enters the process**, with a timestamp, and the recall shrinks to what actually happened.

> [!warning] Mixing and rework
> Blending lots, topping up a hopper before it empties, and reusing regrind all create fan-out. Decide the rule for each: blending creates a new lot with every input as a parent; topping-up should be recorded as a new consumption event with time; rework should link back to its original lot. Ignoring these makes a genealogy that looks complete and is wrong.

## Scanning and labels

Records are only as good as the moment they are created. The usual pattern:

1. **Receiving**: scan or key the supplier label, create \`material_lot\`, print an internal label if the supplier's is not usable.
2. **Loading**: the operator scans the lot at the point of use. MES validates it against the work order's bill of materials, checks the status (not on hold), expiry and FIFO, then writes the consumption record. A rejected scan should say why.
3. **Output**: MES creates the output lot ID from a sequence (never typed by hand), prints the label and records the link to the work order.
4. **Shipping**: scan the pallet to bind output lots to a customer shipment.

Labels carry data in a barcode. GS1 standards use **application identifiers** to say what each field means: for example (01) GTIN, (10) batch or lot, (17) expiry date, (21) serial number. 2D codes such as Data Matrix hold more data in a smaller space and are common on small parts and medical products. Whatever the format, validate on scan and reject unreadable or unknown codes, and make sure the scanner can be used by gloved hands.

Where scanning is impractical, use automatic capture. A PLC can read a barcode or an RFID tag at a station and hand it to MES, or can record which tank or hopper is connected through a recipe step. Use it where operator scans would be skipped.

## Regulatory drivers

Most traceability work is driven by customers and law, not by curiosity. At awareness level:

- **Regulated industries** such as pharmaceuticals, medical devices, food and automotive impose traceability requirements, and many customers audit for them.
- **FDA 21 CFR Part 11** governs electronic records and electronic signatures for FDA-regulated products. It expects things such as audit trails, controls on who can access and change records, unique user identification and secure, time-stamped records. If your system's records are used instead of paper for those products, you will be asked how the system meets it.
- **Validation.** Regulated customers often require documented testing that the system does what it says. That affects how you handle changes, upgrades and who may edit data after the fact.

Your job as an integrator is not to interpret regulations. It is to ask early whether Part 11 or another scheme applies, because it changes the design: append-only records, user identity on every action, no shared logins, reason-for-change on edits, and retention periods that may be years.

> [!note] In Ignition and Sepasoft
> Sepasoft's Track & Trace module is built on the ISA-95 model and covers lot tracking and genealogy. Check the module documentation for how your release handles serialized items, sub-assemblies and WIP inventory. Details are in {{lesson:mes-sepasoft}}. If you build your own, the tables above are a reasonable core, and {{lesson:ign-databases}} covers how to run them from Ignition.
`,

  eli5: `
Imagine you bake cookies for a school sale. You buy flour in big bags, sugar in big bags, and chocolate chips in big bags. Each bag has a number printed on it.

Every time you start a new tray, you write on a notebook page: "Tray 12 used flour bag 41, sugar bag 17, chips bag 9." When the cookies go into a box, you stick a sticker on the box with a number, and write down which tray went in which box, and which kid bought the box.

Later, the chocolate chip company phones and says, "Bag 9 had a problem." You flip through your notebook and find every tray that used bag 9, every box that tray went into, and every kid who bought one. You phone just those families.

Without the notebook, you would have to tell everyone who bought a cookie all month. Genealogy is that notebook, kept by a computer so the pages are never lost. The only catch is that you have to write in it at the right moment, when the bag is opened, not later when you cannot remember.
`,

  why: `
**Why a graph and not a flag on the product?** Putting "resin lot" on each finished item works until you have two resins, a regrind lot and an additive. Real products have many inputs, and inputs fan out into many outputs. A table of edges handles every shape, and the same query serves backward and forward trace.

**Why trace at the point of consumption.** Granularity is the main design tradeoff. Fine-grained records (every hopper load, every pallet) cost scans and discipline but shrink a recall to the units truly affected. Coarse records (everything made this week) are cheap and make every recall large. The cost of one large recall, in product, customer trust and lost time, usually exceeds the cost of years of scanning. Integrators should ask the customer for their worst-case recall cost before debating scanner count.

**Why append-only.** If a scan is wrong, the original record is evidence of what the system believed at the time. Overwriting it hides errors and, in regulated settings, breaks audit expectations. Corrections are new rows that point at the old one with a reason.

**Why automate capture where you can.** Manual scans are skipped under pressure. Reading the barcode at the station, recording the hopper's connected tank in the recipe, or interlocking the machine so it will not start until the right lot is scanned makes the record a by-product of running. Interlocking has a cost: false stops when a label is damaged. Provide a supervisor override that is logged.

**What integrators argue about.** Whether to serialize at all (it multiplies data and scan points), how to treat bulk materials that cannot be separated into lots (silos, tank farms), and whether genealogy belongs in MES or in ERP or a dedicated warehouse system. The practical answer is to choose a single system of record per lot, and exchange IDs, not copies, between systems.
`,

  history: `
Lot traceability began with paper batch records and lot codes stamped on containers, especially in food and pharmaceuticals, where recalls forced the issue. Barcodes and, later, 2D codes and RFID made it practical to capture lot and serial identity at speed. FDA 21 CFR Part 11 on electronic records and electronic signatures was issued in the 1990s and shaped how regulated plants adopted electronic batch records and MES.
`,

  examples: [
    {
      title: "Backward trace from a complaint",
      body: `Customer B reports a cracked housing on a unit from carton 7450-B. The \`carton_unit\` table (fed by the packing line) gives serial 000412 in lot FG-701B on WO-701, made Monday 09:14 on Line1. \`lot_consumption\` for WO-701 shows resin R-5521 and cap lot C-88. Now check whether other units from the same resin and time window were affected. You are looking at hours, not weeks.`
    },
    {
      title: "Rejecting a bad scan at the hopper",
      body: `The operator scans a lot at the Line1 hopper. MES looks up the lot: status HOLD. The screen shows "Lot R-5521 is on HOLD (supplier notice). Do not use." and the consumption record is not written. The PLC's permissive for "material loaded" is not set, so the line cannot start until a valid lot is scanned.`
    }
  ],

  diagrams: {
    graph: `<svg viewBox="0 0 640 250" role="img" aria-label="Genealogy graph: resin and cap lots feed two work orders, which produce finished lots shipped to customers; forward trace follows arrows right, backward trace follows them left">
  <defs>
    <marker id="mes-track-trace-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker>
  </defs>
  <text class="dg-title" x="20" y="20">Inputs</text>
  <text class="dg-title" x="190" y="20">Work orders</text>
  <text class="dg-title" x="360" y="20">Finished lots</text>
  <text class="dg-title" x="530" y="20">Customers</text>
  <rect class="dg-box-accent" x="20" y="36" width="110" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="75" y="59">Resin R-5521</text>
  <rect class="dg-box" x="20" y="96" width="110" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="75" y="119">Caps C-88</text>
  <rect class="dg-box" x="20" y="156" width="110" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="75" y="179">Resin R-5530</text>
  <rect class="dg-box" x="190" y="50" width="110" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="245" y="73">WO-701</text>
  <rect class="dg-box" x="190" y="130" width="110" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="245" y="153">WO-702</text>
  <rect class="dg-box-accent" x="360" y="36" width="110" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="415" y="56">FG-701A</text>
  <rect class="dg-box-accent" x="360" y="78" width="110" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="415" y="98">FG-701B</text>
  <rect class="dg-box-accent" x="360" y="140" width="110" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="415" y="160">FG-702A</text>
  <rect class="dg-box" x="530" y="50" width="90" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="575" y="70">Customer A</text>
  <rect class="dg-box" x="530" y="96" width="90" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="575" y="116">Customer B</text>
  <line class="dg-line" x1="130" y1="54" x2="188" y2="64" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="130" y1="114" x2="188" y2="76" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="130" y1="64" x2="188" y2="140" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="130" y1="174" x2="188" y2="156" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="300" y1="62" x2="358" y2="52" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="300" y1="72" x2="358" y2="92" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="300" y1="148" x2="358" y2="154" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="470" y1="52" x2="528" y2="62" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="470" y1="94" x2="528" y2="110" marker-end="url(#mes-track-trace-ah)"/>
  <line class="dg-line" x1="470" y1="152" x2="528" y2="72" marker-end="url(#mes-track-trace-ah)"/>
  <text class="dg-text-muted" x="20" y="222">Forward trace: start at R-5521 and follow arrows right.</text>
  <text class="dg-text-muted" x="20" y="240">Backward trace: start at a finished lot and follow arrows left.</text>
</svg>`
  },

  pitfalls: [
    "Recording consumption at receiving or by assumption instead of when material enters the process.",
    "Letting operators type output lot IDs by hand. Generate them from a sequence.",
    "Overwriting wrong scans instead of adding correction records with a reason.",
    "Ignoring blending, top-up and regrind, which create fan-out links the system never recorded.",
    "Shared logins on traceability screens, which defeats audit trails.",
    "Serializing every unit before anyone has asked what precision the customer actually needs."
  ],

  keyTerms: ["genealogy", "lot-number", "serial-number", "forward-trace", "backward-trace", "wip", "gs1-ai", "cfr-part-11", "work-order", "mes-master-data"],

  quiz: [
    {
      q: "A supplier notifies you that resin lot R-5521 is contaminated. Which trace answers 'what did it touch and where did it go?'",
      options: ["Backward trace from a finished lot", "Forward trace from the input lot", "An OEE report", "A downtime Pareto"],
      answer: 1,
      explain: [
        "Backward trace starts from a finished product and finds its inputs. Here you start with an input.",
        "Correct. Forward trace walks from the input lot to everything made with it and where it shipped.",
        "OEE measures equipment efficiency, not material flow.",
        "A Pareto ranks downtime reasons."
      ]
    },
    {
      q: "Operators scan material lots when pallets are received, and MES assumes any resin on a line that week came from that receipt. What is the main consequence for a recall?",
      options: ["The recall is more accurate","Serial numbers become required","The recall covers far more product than needed, because consumption was not recorded when material entered the process","Nothing changes"],
      answer: 2,
      explain: [
        "Assumed links are less accurate, not more.",
        "Serialization is a separate decision.",
        "Correct. Coarse records make every recall large. Record consumption at the point of use.",
        "Granularity directly sets recall size."
      ]
    },
    {
      q: "A hopper is topped up with lot R-5530 while still holding R-5521. What should the system do?",
      options: ["Delete R-5521 from the record","Stop the line permanently","Ignore it, since the hopper is one container","Record a new consumption event with a timestamp, and treat output as linked to both lots until the hopper is empty"],
      answer: 3,
      explain: [
        "Deleting history is the opposite of traceability.",
        "A top-up is normal, it only needs to be recorded.",
        "Ignoring it loses the link to R-5530 and understates recall scope.",
        "Correct. Mixed hoppers produce outputs with more than one parent. Record it and apply the blending rule."
      ]
    },
    {
      q: "A scan is entered against the wrong lot. How should the record be fixed?",
      options: ["Add a correction record that references the original with a reason, keeping both","Leave it, since fixing is not allowed","Overwrite the original row","Delete the row and re-enter it silently"],
      answer: 0,
      explain: [
        "Correct. Append-only records preserve the history, and the correction is auditable.",
        "Errors can be corrected, only through traceable records.",
        "Overwriting hides what the system believed and fails audit expectations.",
        "Silent deletes break the audit trail."
      ]
    },
    {
      q: "Which is the best description of why 21 CFR Part 11 matters to an integrator?",
      options: ["It defines the SQL schema for lot tables", "It sets expectations for electronic records and signatures, such as audit trails and unique user identity, that affect system design", "It applies to every manufacturing plant", "It replaces ISA-95"],
      answer: 1,
      explain: [
        "It does not define schemas.",
        "Correct. Ask early whether it applies, because it shapes logins, audit trails and edit rules.",
        "It applies to FDA-regulated products, not every plant.",
        "It is unrelated to ISA-95."
      ]
    },
    {
      q: "What does a GS1 application identifier such as (10) tell a scanner or MES?",
      options: ["The label printer model","The checksum","The barcode type","Which field follows, here a batch or lot number"],
      answer: 3,
      explain: [
        "AIs say nothing about hardware.",
        "Check digits are separate from AIs.",
        "The AI tells you about the data field, not the symbology.",
        "Correct. AIs label each field, for example (01) GTIN, (10) lot, (17) expiry and (21) serial."
      ]
    }
  ],

  resources: [
    { title: "Track & Trace (Sepasoft)", url: "https://www.sepasoft.com/products/track-trace/", type: "article", source: "Sepasoft" },
    { title: "Track & Trace Overview, MES 1.0 (Sepasoft help)", url: "https://help.sepasoft.com/docs/pages/viewpage.action?pageId=4818983", type: "docs", source: "Sepasoft" },
    { title: "Using Sepasoft MES Modules", url: "https://docs.sepasoft.com/articles/user-manual/mes-modules", type: "docs", source: "Sepasoft" },
    { title: "Track and Trace, MES 2.0 Training Manual (Sepasoft)", url: "https://help.sepasoft.com/docs/display/SMTM/Track+and+Trace", type: "docs", source: "Sepasoft" },
    { title: "ISA-95 Standard: Enterprise-Control System Integration", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard", type: "standard", source: "ISA" }
  ]
});
