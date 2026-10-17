LC.lesson({
  id: "int-career",
  title: "Certifications and career path",
  track: "int",
  minutes: 10,
  level: 1,
  prereqs: ["int-lifecycle"],
  tags: ["career", "certification", "inductive-university", "isa", "csia", "pe", "portfolio", "home-lab"],
  summary: "Which credentials exist, what each one proves, what they cost in time, and how to build proof of skill that a hiring manager believes.",
  objectives: [
    "Explain the difference between an Inductive University credential and an Ignition certification",
    "Describe the Core and Gold certification tests and the integrator program tiers",
    "Pick among Rockwell training, ISA CCST and CAP, the PE exam and CSIA for a given goal",
    "Plan a home lab and a portfolio that demonstrates integrator skills"
  ],

  body: `
## Credentials prove less than projects, but they open doors

Certifications do two jobs. They give a hiring manager a quick filter, and they give a company points toward partner programs. They do not replace a track record. The practical plan is to collect the few that match your target role, and to build projects that show you can finish things. Fees, requirements and test formats change, so confirm every detail below on the issuing site before you pay.

## Ignition: Inductive University, Core and Gold

**Inductive University** is Inductive Automation's free online training site. It has video lessons, hands-on challenges and courses organized by Ignition version. Completing the credential courses and passing their challenges (each requires a perfect score) earns an **Ignition credential** for that version. A credential is a training-completion record. It is not a certification.

**Ignition certification** is a separate path and is earned by passing a test (or, historically, by completing the lab work in the five-day instructor-led classes):

| Level | Format | What it covers | Notes |
|---|---|---|---|
| Core | Online, auto-graded, one attempt per purchase | Ignition fundamentals: architecture, real-time status and control, historical logging, UDTs and templates, alarming | Listed at about 350 USD; must be completed within 30 days of purchase |
| Gold | Take-home practical, graded by Inductive Automation | Core material plus SQL and Python scripting | Typically 16 to 40 hours of work; submit within 6 months; open book (manual and Inductive University allowed) |

Core is required before Gold. Certifications last three years. Prices and rules shift, so check the current testing page.

### Integrator program tiers

Companies, not individuals, belong to the **Integrator Program**. The tiers build on staff credentials and sales:

| Tier | Typical requirement |
|---|---|
| Registered | Participating, no certified staff |
| Credentialed | Staff with an Inductive University credential for the current version |
| Certified | Staff with a current Core certification |
| Gold | At least one Gold-certified employee, plus a sales threshold |
| Premier | Two or more Gold-certified employees, technical reviews with Inductive Automation, and higher sales thresholds |

Program members get perks that scale with the tier, such as free certification test allotments and search listing on the Find an Integrator page. If your employer is in the program, ask which tier they want and which certifications count. Your Core or Gold may be the thing that moves the company up a tier, and that is a good argument in a review.

{{diagram:ladder}}

## Allen-Bradley and Rockwell

Rockwell Automation sells instructor-led, virtual and e-learning courses for Studio 5000 Logix Designer. The common sequence is Level 1 (system fundamentals), Level 2 and Level 3 (project development), plus certificate tracks for programmers and maintainers that end with an assessment. Accelerated five-day versions exist. Advanced courses cover topics like controller security and project optimization. Course numbers and prerequisites change, so check the training catalog.

Rockwell training pays off when your target employer is an Allen-Bradley shop. Pair it with real project time. Courses teach the tool, and projects teach you how plants use it. See {{lesson:plc-studio}} and {{lesson:plc-best-practices}}.

## ISA: CCST and CAP

The International Society of Automation (ISA) offers two certification programs. Both are experience-based with no formal application form, and both can be renewed through professional development points.

- **CCST (Certified Control Systems Technician)** targets technicians who calibrate, document, troubleshoot and repair instrumentation and control loops. It has three levels (Level 1, Level 2, Level 3) requiring increasing combined experience, education and training. It fits instrument and controls techs who want to prove field skill, and it suits the commissioning work in {{lesson:int-commissioning}}.
- **CAP (Certified Automation Professional)** targets people who define, design, develop, deploy and support control and information systems. The exam is a long computer-based test (on the order of 175 questions over four hours), and experience requirements run from about five to ten years depending on your degree. It fits system engineers and project leads, and it lines up with the standards in {{lesson:int-standards}}.

ISA also sells review courses and associate-level certificates for people earlier in their careers.

## The PE in Control Systems

A **Professional Engineer** license is a legal credential. Some jobs require a PE to sign and seal drawings (public water and wastewater, some utilities, government work). NCEES administers a PE exam in **Control Systems Engineering**. It is computer-based, closed book with an electronic reference, and the appointment runs about nine and a half hours, with roughly 85 questions. Topics include measurement, control systems, final control elements, signals, transmission and networking, and safety systems.

The path is: an engineering degree, the Fundamentals of Engineering exam, several years of experience under a licensed PE (state rules vary), then the PE exam. It is the longest route here, and it matters if your market is water, power or public sector. It matters less in food, packaging or discrete manufacturing, where a PE is rarely asked for.

## CSIA: a company credential

The **Control System Integrators Association** certifies companies, not people. A third-party audit checks the integrator against CSIA Best Practices in areas such as project management, quality, service, financial management and cybersecurity, and certification is renewed every three years. Why it matters to you: if you plan to work for or start an integrator, CSIA certification is a quality signal customers ask for, and the Best Practices manual is a free education in how a well-run integrator operates. See {{term:csia|CSIA}}.

## Which credential for which goal?

| Your goal | Start with | Add next |
|---|---|---|
| Ignition developer at an integrator | Inductive University credential, Core | Gold |
| PLC programmer on Allen-Bradley | Rockwell Level 1 and 2, real projects | Advanced Logix, Studio 5000 certificate |
| Controls or instrument technician | ISA CCST | Vendor courses |
| Systems engineer or lead | Core, Gold, ISA CAP | PE if the market needs it |
| Running or founding an integrator | Integrator program, CSIA Best Practices | CSIA certification |

## Build a home lab

You can learn nearly all of this at home for little money.

- **Ignition Maker Edition.** Inductive Automation offers it free for personal, non-commercial and educational use. It has limits on tags and sessions, restricted module support and community-only support, and it cannot be used for business demos or paid work. Install Ignition, choose Maker Edition during setup and sign in to get the license.
- **A PLC or an emulator.** A used Micro800 or CompactLogix gives real hardware experience. Rockwell's Connected Components Workbench works with Micro800 controllers and includes a simulator. Studio 5000 Logix Emulate is a paid option for Logix. Open-source runtimes also exist, such as OpenPLC. Match what your target employers use.
- **Docker.** Run Ignition, a SQL database such as PostgreSQL and an MQTT broker such as Mosquitto in containers with a compose file. Inductive University has an elective course on Ignition with Docker. See {{lesson:arch-containers}}.
- **A tiny network.** A managed switch and a small firewall let you practice VLANs and zones from {{lesson:net-vlan}} and {{lesson:net-security}}.

A good first lab: a simulated tank and pump in a PLC, UDTs mirrored in Ignition, a Perspective screen, alarms with notification, history in PostgreSQL, and a Sparkplug publish to a broker.

## Build a portfolio

A portfolio turns "I know Ignition" into evidence.

1. **Pick three projects** that look like real jobs: a tank-and-pump HMI, an OEE dashboard with downtime reasons, and an MQTT/UNS demo.
2. **Show your work.** Include screenshots, a short video, an architecture diagram, and a one-page design write-up in the style of a decision log ({{lesson:int-capstone}}).
3. **Publish sources.** Keep PLC exports, Ignition project exports and SQL scripts in a Git repository. Remove customer data, passwords and licenses.
4. **Document the standard.** Include a naming standard and a commissioning checklist ({{lesson:int-naming}}). Few candidates do, and interviewers notice.
5. **Write about failures.** One page on a bug you found and how you fixed it is worth more than ten screenshots.

Use only material you own. Never publish a client's screens or code without written permission.
`,

  eli5: `
Think about learning to cook. A certificate from a cooking class says you sat through the lessons and passed a quiz. A license from the health department says you are allowed to cook for the public. A kitchen with a good inspection grade says the whole restaurant runs well. None of them tastes like food.

What really convinces someone to hire you is a plate in front of them. So you do two things. You collect the papers that match the kitchen you want to work in, because some bosses will not look at you without them. And you cook at home, take photos, and keep your recipes written down, so that you can show a real meal.

Controls careers work the same way. There are classes and tests for the software, for the controllers, and for the whole profession, and there are licenses and company inspections. The home lab and the portfolio are your kitchen at home.
`,

  why: `
**Why not collect everything?** Each credential costs time, money and renewal effort, and only some match the work you want. A Gold certification means more at an Ignition integrator than an ISA credential does. A CAP means more in a regulated plant. A PE means more in public water. Pick the two or three that match the next job, then stop.

**Why do employers care about certifications?** For integrators, certification feeds the partner program, and partner level affects discounts, listings and customer trust. That gives hiring managers a practical reason to prefer a candidate who already holds one. For end users, certifications show you can learn the platform without a long ramp.

**What experienced people argue about.** Some hold that certifications are a checkbox and that portfolio and references matter more. Others point out that a take-home test like Gold demonstrates real skill because it takes a long time and needs working SQL and scripting. A common compromise is to treat the test as a study plan: preparing for it forces you to cover topics you would otherwise skip, such as alarming, history queries and scripting.

**Why a home lab matters most.** Hands-on repetition is the shortest route to competence. A lab lets you break things, which clients will not let you do. It also gives you a portfolio, a place to try the lessons in this course, and a way to pass the Gold test with confidence.

**Why mind licenses.** Free editions are free for a reason. Using Maker Edition for paid work or customer demos breaks the terms and can embarrass you and your employer. Learn on the free tool, deliver on a licensed one.
`,

  history: `
ISA created its certification programs to give automation practitioners a recognized standard of experience and knowledge. Inductive University began as a way to teach Ignition with free videos, and Ignition certification followed as the integrator program grew. CSIA was formed by integrators who wanted a shared definition of a well-run integrator, and its Best Practices manual became the audit standard.
`,

  examples: [
    {
      title: "A 12-week plan to Core",
      body: `Weeks 1 to 4: work through the Inductive University credential courses in Maker Edition and pass every challenge. Weeks 5 to 8: build the tank-and-pump lab with UDTs, alarms and history. Weeks 9 to 10: review the Core topics (architecture, tags, history, alarming, UDTs). Week 11: take the Core test. Week 12: start Gold prep by building an SQL-backed screen with a script that writes events.`
    },
    {
      title: "One portfolio project, summarized",
      body: `Project: Bottle line OEE demo. Stack: Ignition Maker Edition, PostgreSQL and a Micro800 simulator. Deliverables: UDT-based tag tree following a written naming standard, a Perspective dashboard, a downtime reason table, a screen recording, a one-page decision log explaining why history is stored in PostgreSQL and not in memory, and a commissioning checklist with a sample completed I/O list.`
    }
  ],

  diagrams: {
    ladder: `<svg viewBox="0 0 640 240" role="img" aria-label="Ignition integrator program ladder from Registered to Credentialed, Certified, Gold and Premier, with each step tied to staff credentials">
  <rect class="dg-box" x="20" y="176" width="116" height="48" rx="5"/>
  <text class="dg-text-sm dg-mid" x="78" y="196">Registered</text>
  <text class="dg-text-muted dg-mid" x="78" y="214">no certified staff</text>
  <rect class="dg-box" x="148" y="140" width="116" height="84" rx="5"/>
  <text class="dg-text-sm dg-mid" x="206" y="164">Credentialed</text>
  <text class="dg-text-muted dg-mid" x="206" y="184">IU credential</text>
  <text class="dg-text-muted dg-mid" x="206" y="202">current version</text>
  <rect class="dg-box" x="276" y="104" width="116" height="120" rx="5"/>
  <text class="dg-text-sm dg-mid" x="334" y="128">Certified</text>
  <text class="dg-text-muted dg-mid" x="334" y="148">Core certified</text>
  <text class="dg-text-muted dg-mid" x="334" y="166">staff member</text>
  <rect class="dg-box-accent" x="404" y="68" width="106" height="156" rx="5"/>
  <text class="dg-text-sm dg-mid" x="457" y="92">Gold</text>
  <text class="dg-text-muted dg-mid" x="457" y="112">1+ Gold holder</text>
  <text class="dg-text-muted dg-mid" x="457" y="130">sales threshold</text>
  <rect class="dg-box-ok" x="522" y="32" width="106" height="192" rx="5"/>
  <text class="dg-text-sm dg-mid" x="575" y="56">Premier</text>
  <text class="dg-text-muted dg-mid" x="575" y="76">2+ Gold holders</text>
  <text class="dg-text-muted dg-mid" x="575" y="94">technical review</text>
  <text class="dg-text-muted dg-mid" x="575" y="112">higher sales</text>
  <text class="dg-text-muted" x="20" y="24">Company tiers, built from staff credentials</text>
</svg>`
  },

  pitfalls: [
    "Treating an Inductive University credential as if it were a certification.",
    "Paying for a certification without checking that your target employers value it.",
    "Using Maker Edition for client demos or paid work.",
    "Publishing a portfolio that contains customer screens, passwords or licenses.",
    "Collecting certificates and never building a finished project."
  ],

  keyTerms: ["inductive-university", "ignition-core-certification", "ignition-gold-certification", "integrator-program", "isa-ccst", "isa-cap", "pe-license", "csia", "ign-maker-edition"],

  quiz: [
    {
      q: "What is the difference between an Inductive University credential and an Ignition certification?",
      options: ["A credential records completed training and challenges; certification is earned by passing a separate test", "They are the same thing with different names", "Certification is free and credentials are paid", "Credentials last forever and certification never expires"],
      answer: 0,
      explain: [
        "Correct. IU credentials come from courses and challenges for a version, and certifications such as Core and Gold come from tests.",
        "They are separate. Integrator program tiers treat them differently.",
        "IU is free to use, and certification tests are paid.",
        "Credentials are tied to a version, and certifications are valid for a limited period."
      ]
    },
    {
      q: "Which statement about the Ignition Gold certification is accurate?",
      options: ["It is a take-home practical that requires Core first and covers SQL and Python scripting", "It is a 30-minute multiple-choice quiz", "It requires no prior certification", "It replaces the Core test"],
      answer: 0,
      explain: [
        "Correct. Gold is a long practical, open book, and builds on Core.",
        "That describes neither Core nor Gold. Gold typically takes a day or more.",
        "Core is a prerequisite.",
        "Gold does not replace Core. It requires it."
      ]
    },
    {
      q: "A technician who calibrates instruments and troubleshoots loops wants a recognized credential. Which fits best?",
      options: ["ISA CCST", "ISA CAP", "PE in Control Systems", "CSIA certification"],
      answer: 0,
      explain: [
        "Correct. CCST targets technicians who calibrate, document and troubleshoot instrumentation.",
        "CAP targets people who design and deploy automation systems.",
        "A PE is a legal license for engineers who sign and seal designs.",
        "CSIA certifies integrator companies, not individuals."
      ]
    },
    {
      q: "An integrator wants to move from Certified to Gold in the Ignition Integrator Program. What must change?",
      options: ["At least one employee must hold a current Gold certification, and the sales threshold must be met", "They need a PE license", "They need CSIA certification", "They must pay for a new Maker license"],
      answer: 0,
      explain: [
        "Correct. Gold needs a Gold-certified employee plus sales since joining.",
        "A PE is unrelated to program tiers.",
        "CSIA is a separate company audit, not a requirement of the Ignition program.",
        "Maker Edition is free for personal use and has no role in tiers."
      ]
    },
    {
      q: "You want to build a portfolio demo using Ignition at home. Which is appropriate?",
      options: ["Use Maker Edition for personal learning projects and show screenshots and exports you own", "Use Maker Edition to run a paying customer's pilot", "Post a client's screens as examples", "Skip documentation, since screenshots are enough"],
      answer: 0,
      explain: [
        "Correct. Maker Edition is for personal, non-commercial and educational use.",
        "Paid or business use needs a commercial license.",
        "Client material needs written permission and is usually confidential.",
        "Documentation such as a decision log is what separates a portfolio from a screenshot collection."
      ]
    }
  ],

  resources: [
    { title: "Training Classes & Certification", url: "https://inductiveautomation.com/training/classes-and-certification", type: "course", source: "Inductive Automation" },
    { title: "Ignition Certification Tests", url: "https://inductiveautomation.com/training/certification-tests", type: "course", source: "Inductive Automation" },
    { title: "Integrator Program Guidelines", url: "https://inductiveautomation.com/integrators/program", type: "article", source: "Inductive Automation" },
    { title: "Ignition Maker Edition", url: "https://inductiveautomation.com/ignition/maker-edition", type: "article", source: "Inductive Automation" },
    { title: "Inductive University", url: "https://inductiveuniversity.com/", type: "course", source: "Inductive University" },
    { title: "ISA CAP and CCST Certification", url: "https://programs.isa.org/isa-certification", type: "course", source: "ISA" },
    { title: "Control Systems PE exam", url: "https://ncees.org/exams/pe-exam/control-systems/", type: "standard", source: "NCEES" },
    { title: "CSIA Certification", url: "https://controlsys.org/certification/", type: "standard", source: "Control System Integrators Association" }
  ]
});
