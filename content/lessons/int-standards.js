LC.lesson({
  id: "int-standards",
  title: "Standards cheat-sheet",
  track: "int",
  minutes: 20,
  level: 2,
  prereqs: ["found-purdue"],
  tags: ["standards", "ISA", "IEC", "NFPA", "UL", "reference"],
  summary: "A dozen standards come up in nearly every integrator conversation. Know what each one covers, when a project actually needs it, and where to learn more.",
  objectives: [
    "Say in one sentence what each of twelve common standards covers",
    "Decide which standards a given project is likely to invoke",
    "Tell apart standards that govern documents, software, safety, security and hardware",
    "Know which lesson in this course teaches each standard in depth",
    "Explain why a standard is not the same as a design and what 'compliant' really commits you to"
  ],

  body: `
## Why a cheat-sheet

Specifications and RFQs name standards the way recipes name ingredients. "Panels shall be built to UL 508A." "Alarms shall follow ISA-18.2." "Network per 62443." As an integrator you will not memorize them, but you must recognize each, know whether it is a legal requirement or a style guide, and know who to call when it bites. A process engineer has met many of these in plant documents already. This lesson puts them on one page.

A **standard** is a published consensus document. Some are enforced by law or by the authority having jurisdiction (an inspector, an insurer), such as electrical codes and panel listings. Others are good practice that the customer adopts by naming it in the contract. When a contract says "in accordance with ISA-18.2," then your deliverable is judged against that text.

## The table

| Standard | Scope | When you need it | Lesson |
|---|---|---|---|
| {{term:isa-5-1|ISA-5.1}} | Instrument symbols and tag identification (FIC-101, PT-205) | Reading or producing P&IDs and loop sheets, naming instruments | {{lesson:found-pid-docs}} |
| {{term:isa-88|ISA-88}} (IEC 61512) | Batch control: physical, procedural and process models | Batch, recipe, or multi-product systems; PackML-style machine states | {{lesson:plc-isa88-packml}}, {{lesson:mes-batch}} |
| {{term:isa-95|ISA-95}} (IEC 62264) | Enterprise to control integration, functional levels, MES models | MES, ERP integration, plant-wide data models | {{lesson:found-purdue}}, {{lesson:mes-what}} |
| {{term:isa-101|ISA-101}} | HMI design and lifecycle for process automation | Any new operator interface with a style requirement | {{lesson:persp-hphmi}} |
| {{term:isa-18-2|ISA-18.2}} (IEC 62682) | Alarm management lifecycle | Process plants, regulated sites, any customer who has an alarm philosophy | {{lesson:int-alarm-mgmt}} |
| {{term:iec-62443|ISA/IEC 62443}} | Industrial control system cybersecurity | Remote access, new networks, critical infrastructure, insurer or customer security policy | {{lesson:net-security}} |
| {{term:iec-61131-3|IEC 61131-3}} | PLC languages and software model | Choosing languages, vendor-neutral code review | {{lesson:plc-languages}} |
| {{term:iec-61508|IEC 61508 / 61511}} | Functional safety, generic and process sector | Any safety instrumented function, SIL assignment | {{lesson:plc-safety}} |
| {{term:nfpa-79|NFPA 79}} | Electrical standard for industrial machinery (US) | Machine control panels, E-stops, wiring and disconnects | This lesson |
| {{term:ul-508a|UL 508A}} | Listing of industrial control panels (US, Canada) | Building or buying a panel to be shipped in North America | This lesson |
| {{term:opc-ua|OPC UA}} (IEC 62541) | Secure, typed industrial data exchange | Linking devices, servers and clients from different vendors | {{lesson:proto-opc}} |
| {{term:mqtt|MQTT}} and {{term:sparkplug|Sparkplug}} | Lightweight publish/subscribe and an industrial payload and state spec | Edge-to-cloud, unified namespace, report-by-exception | {{lesson:proto-mqtt}}, {{lesson:proto-sparkplug}} |

{{diagram:map}}

## Document and naming standards

### ISA-5.1

ISA-5.1 gives the letters and bubbles on a P&ID. The first letter is the measured variable (F flow, L level, P pressure, T temperature), and later letters describe function (I indicator, C controller, T transmitter, S switch, H high, L low). So **LT-101** is a level transmitter, **FIC-205** a flow indicating controller, **PSHH-310** a pressure switch high-high. You will be asked to follow it in drawings, I/O lists and, ideally, tag names. See {{lesson:int-naming}} for how it feeds a tag standard.

### ISA-88

ISA-88 (IEC 61512) models batch manufacturing. Its **physical model** nests enterprise, site, area, process cell, unit, equipment module and control module. Its **procedural model** nests procedure, unit procedure, operation and phase. Recipes are separate from equipment, so one plant can make many products. In day-to-day work you meet it as "phases," "units" and "recipes," and the machine-state vocabulary in PackML comes from the same family. You need it for any batch or recipe-driven process.

### ISA-95

ISA-95 (IEC 62264) defines the levels (0 to 4) in the Purdue-style hierarchy and the objects exchanged between control and business systems: equipment, material, personnel, production schedule and performance. It is the vocabulary behind MES design and the B2MML message format. You need it when integrating with MES or ERP.

## Operator interface and alarm standards

### ISA-101

ISA-101 covers HMI design for process automation: philosophy, style guide, display hierarchy, navigation, color use and a lifecycle for managing the HMI. It is a framework rather than a screen recipe. The high-performance HMI approach (grayscale, color only for abnormal) is a common way to satisfy it.

### ISA-18.2

ISA-18.2 defines a lifecycle for alarm systems (philosophy, rationalization, design, implementation, operation, maintenance, monitoring, change, audit) and metrics to judge them. If a customer says "alarm philosophy" or "master alarm database," it is in play. The full workflow is in {{lesson:int-alarm-mgmt}}.

## Security and safety standards

### ISA/IEC 62443

A multi-part series on industrial automation and control system security. It defines **zones and conduits** (grouped assets and the controlled links between them), **security levels** and requirements for asset owners, integrators and product suppliers. Integrators are explicitly a role in the standard, and customers increasingly ask for integrators with 62443 knowledge. It drives firewall design, remote access policy and patching.

### IEC 61508 and IEC 61511

IEC 61508 is the generic functional safety standard. IEC 61511 applies it to the process industry: a hazard analysis finds risks that need risk reduction, each safety instrumented function gets a **safety integrity level** (SIL), and the design, verification and proof testing must meet it. In the US, ANSI/ISA-84 is the matching document. Rules of thumb: a basic process control system cannot be your only protection for a high-consequence hazard, and safety logic lives in certified hardware and gets validated differently from ordinary code. Never improvise a SIL claim. Bring in a functional safety specialist.

## Software and data standards

### IEC 61131-3

This standard defines five PLC languages: ladder diagram, function block diagram, structured text, sequential function chart and instruction list (deprecated or removed in recent editions; check the edition you are working to), plus a software model of programs, tasks and variables. Allen-Bradley's Studio 5000 follows much of it with vendor extensions. Knowing it helps you read Siemens or Codesys code and write portable structure.

### OPC UA, MQTT and Sparkplug

OPC UA (IEC 62541) offers a typed information model, security and discovery for industrial data. MQTT is a general publish/subscribe transport (an OASIS and ISO standard). Sparkplug is an Eclipse Foundation specification on top of MQTT that defines topics, payloads and birth and death messages so devices describe themselves and report by exception. You choose between them in the architecture, not in the standard.

## Hardware and electrical standards

### NFPA 79

NFPA 79 is the US electrical standard for industrial machinery: conductor sizing and color, disconnects, control circuit voltage limits, emergency stop requirements, grounding and marking. It applies to the machine and its control equipment as installed. Machine builders (OEMs) deal with it daily, and integrators commissioning machine lines inherit it. The facility's installation sits under the National Electrical Code (NFPA 70).

### UL 508A

UL 508A is the standard for listing industrial control panels in the US and Canada. A panel shop with a UL listing builds to its rules (component recognition, short-circuit current rating, spacing, labeling). Inspectors and insurers often want the UL 508A label before a panel goes live. For a panel with an SCCR (short-circuit current rating) too low for the plant's available fault current, the panel can be refused.

> [!example] Worked example: which standards for a water-treatment upgrade?
> A municipal client wants a new SCADA for three pump stations. Likely list: ISA-5.1 for P&ID and tag names; ISA-101 for the HMI style guide; ISA-18.2 for the alarm philosophy; IEC 62443 for the remote access design between stations; IEC 61131-3 structure for PLC code; UL 508A for the new panels; NEC for the installation; OPC UA or MQTT/Sparkplug between sites. It probably does not need ISA-88 (no batch recipes) or IEC 61511 (no safety instrumented system) unless a hazard study says otherwise.

## What "compliant" means

Claiming "ISA-18.2 compliant" or "62443 aligned" is a promise. Read the contract wording. "Designed in accordance with" means you followed the method. "Certified to" means a third party audited you (as with product certifications under ISASecure). Be precise, and never claim certification you do not hold. Most customers want you to follow the intent and document your choices.
`,

  eli5: `
Imagine every school in the country wants to make a good cafeteria. Without agreement, one school labels peanut foods with a red sticker, another with a blue star, and a third does not label them at all. A child moving between schools would be in danger.

So people get together and agree: peanut foods get a red sticker, trays are sized this way, the fire exit sign looks like this. Those agreements are standards. Nobody has to like them, but when everyone follows them, a visitor can walk into any school and know what things mean.

Industrial standards do the same thing for factories. One agreement says how to draw and label a pump on a plan. Another says what an alarm should and should not do. Another says how a control panel must be wired so it will not start a fire. When a customer says "please follow the standard," they mean "please do it the way everyone agreed, so the next person can understand and maintain it."
`,

  why: `
**Why do customers name standards?** Because a standard turns a vague hope ("make the alarms good") into something auditable ("alarm rates and priority distribution per ISA-18.2"). It also lets a customer change integrators without losing the ability to maintain the system. A standard is a common language between two companies that do not trust each other yet.

**Why do integrators sometimes resist them?** Standards cost time. A full ISA-18.2 alarm rationalization or a 62443 risk assessment is real work and real money, and customers rarely budget for it. Meanwhile quick projects are won on price. The debate is how much of a standard to apply on a small job. A sensible answer: apply the parts that prevent real failures (alarm priorities, network segmentation, naming) and say plainly which parts you left out.

**Why distinguish law from guidance?** Mistaking them is expensive. NFPA 79, the NEC and UL listings are enforced by inspectors and insurers. ISA-101 and ISA-5.1 are enforced only by contract. Safety standards sit in between: IEC 61511 is a consensus standard, but regulators and insurers often use it as the measure of "good engineering practice," and in an incident, the investigation asks whether you followed it. If you cannot tell which is which, ask the customer.

**What about "just following the vendor's way"?** Vendor conventions (Rockwell's naming, Ignition's tag providers) are practical and often the real working standard. They answer *how in this tool*. Industry standards answer *what and why across tools*. A good integrator uses both and keeps a short document that says which applies to the project.

**Why learn the numbers?** Because the numbers are how people talk. Knowing ISA-95 is Level 3 and 4, or that 62443 is about zones and conduits, lets you join a meeting without a slow translation.
`,

  examples: [
    {
      title: "Reading an instrument tag with ISA-5.1",
      body: `Tag **TIC-210A**: T is temperature, I is indicate, C is control, 210 is the loop number, A distinguishes a second instrument in the same loop. On the P&ID the bubble sits in the field or on the panel depending on whether it is a field instrument or part of the DCS or PLC. In the PLC and Ignition the hyphen is dropped (hyphens are not valid in Logix tag names), so the house form is \`TIC210A\`, for example \`[default]Plant1/Area20/Line1/TIC210A\`. See {{lesson:int-naming}}.`
    },
    {
      title: "Panel refused for SCCR",
      body: `A UL 508A panel is listed with a 5 kA short-circuit current rating. The plant's study shows 22 kA available at the panel's location. The inspector refuses it. The fix is current-limiting fuses upstream or a panel redesigned with higher-rated components. Lesson: ask for available fault current in the RFQ, because it changes the bill of materials.`
    }
  ],

  diagrams: {
    map: `<svg viewBox="0 0 640 230" role="img" aria-label="Standards grouped by what they govern: documents and naming, operator interface and alarms, data and software, security and safety, electrical hardware">
  <rect class="dg-box" x="20" y="20" width="190" height="86" rx="6"/>
  <text class="dg-title" x="34" y="44">Documents + models</text>
  <text class="dg-text-sm" x="34" y="66">ISA-5.1 symbols and tags</text>
  <text class="dg-text-sm" x="34" y="84">ISA-88 batch</text>
  <text class="dg-text-sm" x="34" y="100">ISA-95 enterprise levels</text>
  <rect class="dg-box" x="225" y="20" width="190" height="86" rx="6"/>
  <text class="dg-title" x="239" y="44">Operators</text>
  <text class="dg-text-sm" x="239" y="66">ISA-101 HMI</text>
  <text class="dg-text-sm" x="239" y="84">ISA-18.2 alarms</text>
  <rect class="dg-box" x="430" y="20" width="190" height="86" rx="6"/>
  <text class="dg-title" x="444" y="44">Software + data</text>
  <text class="dg-text-sm" x="444" y="66">IEC 61131-3 PLC code</text>
  <text class="dg-text-sm" x="444" y="84">OPC UA</text>
  <text class="dg-text-sm" x="444" y="100">MQTT + Sparkplug</text>
  <rect class="dg-box-accent" x="20" y="124" width="300" height="86" rx="6"/>
  <text class="dg-title" x="34" y="148">Security + safety</text>
  <text class="dg-text-sm" x="34" y="170">ISA/IEC 62443 zones and conduits</text>
  <text class="dg-text-sm" x="34" y="190">IEC 61508 / 61511 SIL</text>
  <rect class="dg-box" x="335" y="124" width="285" height="86" rx="6"/>
  <text class="dg-title" x="349" y="148">Electrical + panels</text>
  <text class="dg-text-sm" x="349" y="170">NFPA 79 machine wiring</text>
  <text class="dg-text-sm" x="349" y="190">UL 508A panel listing</text>
</svg>`
  },

  pitfalls: [
    "Claiming 'compliant' or 'certified' when you only followed the general intent.",
    "Treating a safety function as ordinary PLC logic without a hazard study or SIL assessment.",
    "Ignoring available fault current when specifying panels to be UL 508A listed.",
    "Confusing ISA-88 (batch and recipes) with ISA-95 (enterprise levels and MES).",
    "Assuming every standard is law. Check whether it is code, contract or style guidance.",
    "Applying a full standard to a tiny job without telling the customer which parts you left out."
  ],

  keyTerms: ["isa-5-1", "isa-88", "isa-95", "isa-101", "isa-18-2", "iec-62443", "iec-61131-3", "iec-61508", "nfpa-79", "ul-508a", "opc-ua", "mqtt", "sparkplug"],

  quiz: [
    {
      q: "A customer wants phases, units and recipes so one reactor can make five products. Which standard supplies that vocabulary?",
      options: ["ISA-95", "ISA-88", "ISA-101", "NFPA 79"],
      answer: 1,
      explain: [
        "ISA-95 covers enterprise to control integration and MES objects, not recipe and phase models.",
        "Correct. ISA-88 defines the physical and procedural models, with phases and recipes separate from equipment.",
        "ISA-101 covers HMI design.",
        "NFPA 79 is an electrical standard for machinery."
      ]
    },
    {
      q: "Which pair is correctly matched?",
      options: ["IEC 61131-3 and PLC programming languages", "UL 508A and alarm priority rules", "ISA-18.2 and panel short-circuit rating", "ISA-5.1 and network zones and conduits"],
      answer: 0,
      explain: [
        "Correct. IEC 61131-3 defines LD, FBD, ST, SFC and the software model.",
        "UL 508A lists industrial control panels. Alarm rules are in ISA-18.2.",
        "Short-circuit rating belongs to panel standards like UL 508A.",
        "Zones and conduits are from ISA/IEC 62443. ISA-5.1 covers instrument symbols and tags."
      ]
    },
    {
      q: "A flow instrument is tagged FIC-205. What does ISA-5.1 say it is?",
      options: ["Frequency input converter", "Field instrument cabinet", "Flow indicating controller", "Fire inspection check"],
      answer: 2,
      explain: [
        "F is the measured variable flow, not frequency. An input converter would not be named with a loop number and the C of a controller.",
        "ISA-5.1 letters describe the measured variable and function (flow, indicate, control), not a cabinet.",
        "Correct. F is flow, I is indicate, C is controller.",
        "No ISA-5.1 letter means fire inspection. F here is flow."
      ]
    },
    {
      q: "You are asked to design a high-pressure trip that must reach SIL 2. What is the right approach?",
      options: ["Write it as an interlock in the standard PLC and label it SIL 2", "Follow NFPA 79 only", "Use OPC UA to make it secure", "Treat it as a safety instrumented function under IEC 61511 with certified components and a verification calculation, with a functional safety specialist involved"],
      answer: 3,
      explain: [
        "A label does not give you a SIL. Standard PLC logic is not evidence of the required integrity.",
        "NFPA 79 covers electrical safety of machinery, not process SIL.",
        "OPC UA is a data protocol and does not provide functional safety.",
        "Correct. SIL is an outcome of design, verification and proof-testing, not a tag."
      ]
    },
    {
      q: "Why does a UL 508A panel's SCCR matter on the RFQ?",
      options: ["It controls how fast the PLC scans", "The panel must be rated for at least the available fault current where it is installed", "It sets the Ethernet speed", "It applies only to HMI screens"],
      answer: 1,
      explain: [
        "SCCR is an electrical rating, unrelated to scan time.",
        "Correct. Too low an SCCR means a fault could damage the panel, so inspectors can reject it.",
        "Ethernet speed has nothing to do with SCCR.",
        "SCCR applies to the electrical assembly."
      ]
    }
  ],

  resources: [
    { title: "ISA/IEC 62443 Series of Standards", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards", type: "standard", source: "ISA" },
    { title: "ISA-18 Series of Standards", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-18-series-of-standards", type: "standard", source: "ISA" },
    { title: "Fundamentals of ISA Standards", url: "https://www.isa.org/intech-home/2023/2023-february-2023/departments/fundamentals-isa-standards", type: "article", source: "ISA InTech" },
    { title: "ISA Standards Committees", url: "https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees", type: "standard", source: "ISA" },
    { title: "ISA/IEC 62443 Cybersecurity Certificate Program", url: "https://www.isa.org/certification/certificate-programs/isa-iec-62443-cybersecurity-certificate-program", type: "course", source: "ISA" }
  ]
});
