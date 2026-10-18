LC.lesson({
  id: "int-career",
  title: "Certifications and career path",
  track: "int",
  minutes: 15,
  level: 1,
  prereqs: ["found-roles"],
  tags: ["career", "certification", "inductive-university", "isa", "csia", "pe", "portfolio", "home-lab"],
  summary: "Which credentials exist, what each one proves, and a capstone-style plan for what to build, using the Build Labs, so a hiring manager believes your skill.",
  objectives: [
    "Explain the difference between an Inductive University credential and an Ignition certification",
    "Describe the Core and Gold certification tests and the integrator program tiers",
    "Pick among Rockwell training, ISA CCST and CAP, the PE exam and CSIA for a given goal",
    "Plan the builds (Build Labs, decision log, naming standard, FDS excerpt, commissioning record) that demonstrate integrator skills"
  ],

  body: `
## Credentials prove less than projects, but they open doors

Certifications do two jobs. They give a hiring manager a quick filter, and they give a company points toward partner programs. They do not replace a track record. The practical plan is to collect the few that match your target role, and to build projects that show you can finish things. Fees, requirements and test formats change, so confirm every detail below on the issuing site before you pay.

## Ignition: Inductive University, Core and Gold

**Inductive University** is Inductive Automation's free online training site. It has video lessons, hands-on challenges and courses organized by Ignition version. Completing the credential courses and passing their challenges (each requires a perfect score) earns an **Ignition credential** for that version. A credential is a training-completion record. It is not a certification.

**Ignition certification** is a separate path and is earned by passing a test (or, historically, by completing the lab work in the five-day instructor-led classes):

| Level | Format | What it covers | Notes |
|---|---|---|---|
| Core | Online, auto-graded | Ignition fundamentals: architecture, real-time status and control, historical logging, UDTs and templates, alarming | Check the issuer's site for the current price, attempt rules and time limit |
| Gold | Take-home practical, graded by Inductive Automation | Core material plus SQL and Python scripting | A long practical that takes many hours; check the issuer's site for the time estimate, submission window and what resources are allowed |

Core is required before Gold. Certifications expire, and prices and rules shift, so check the issuer's site for the current validity period and testing page.

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

Rockwell Automation sells instructor-led, virtual and e-learning courses for Studio 5000 Logix Designer. The common sequence is Level 1 (system fundamentals), Level 2 and Level 3 (project development), plus certificate tracks for programmers and maintainers that end with an assessment. Accelerated versions exist. Advanced courses cover topics like controller security and project optimization. Course numbers and prerequisites change, so check the training catalog.

Rockwell training pays off when your target employer is an Allen-Bradley shop. Pair it with real project time. Courses teach the tool, and projects teach you how plants use it. See {{lesson:plc-studio}} and {{lesson:plc-best-practices}}.

## ISA: CCST and CAP

The International Society of Automation (ISA) offers two certification programs. Both combine experience and education requirements with an exam, and both are renewed through continuing professional development. Check ISA's site for the current application steps.

- **CCST (Certified Control Systems Technician)** targets technicians who calibrate, document, troubleshoot and repair instrumentation and control loops. It has three levels (Level 1, Level 2, Level 3) requiring increasing combined experience, education and training. It fits instrument and controls techs who want to prove field skill, and it suits the commissioning work in {{lesson:int-commissioning}}.
- **CAP (Certified Automation Professional)** targets people who define, design, develop, deploy and support control and information systems. The exam is a long computer-based test, and the experience requirement depends on your degree. Check ISA's site for the current question count, time and experience rules. It fits system engineers and project leads, and it lines up with the standards in {{lesson:int-standards}}.

ISA also sells review courses and associate-level certificates for people earlier in their careers.

## The PE in Control Systems

A **Professional Engineer** license is a legal credential. Some jobs require a PE to sign and seal drawings (public water and wastewater, some utilities, government work). NCEES administers a PE exam in **Control Systems Engineering**. It is computer-based, closed book with an electronic reference, and it is a long single-day exam (check NCEES for the current length and question count). Topics include measurement, control systems, final control elements, signals, transmission and networking, and safety systems.

The path is: an engineering degree, the Fundamentals of Engineering exam, several years of experience under a licensed PE (state rules vary), then the PE exam. It is the longest route here, and it matters if your market is water, power or public sector. It matters less in food, packaging or discrete manufacturing, where a PE is rarely asked for.

## CSIA: a company credential

The **Control System Integrators Association** certifies companies, not people. A third-party audit checks the integrator against CSIA Best Practices in areas such as project management, quality, service, financial management and cybersecurity, and certification is renewed on a cycle (check CSIA for the current term). Why it matters to you: if you plan to work for or start an integrator, CSIA certification is a quality signal customers ask for, and the Best Practices manual is a free education in how a well-run integrator operates. See {{term:csia|CSIA}}.

## Which credential for which goal?

| Your goal | Start with | Add next |
|---|---|---|
| Ignition developer at an integrator | Inductive University credential, Core | Gold |
| PLC programmer on Allen-Bradley | Rockwell Level 1 and 2, real projects | Advanced Logix, Studio 5000 certificate |
| Controls or instrument technician | ISA CCST | Vendor courses |
| Systems engineer or lead | Core, Gold, ISA CAP | PE if the market needs it |
| Running or founding an integrator | Integrator program, CSIA Best Practices | CSIA certification |

## What to build to be hireable

A hiring manager at an integrator wants evidence of three things: you can build the standard pieces correctly, you can document and defend a design, and you finish. Credentials help with the filter. These builds supply the evidence. Do them in order, because each one uses the one before it. Everything uses the Meridian Foods reference plant, so the names, tags and IP plan match the rest of this course.

| Evidence an employer looks for | Build it here | What you can show |
|---|---|---|
| You can stand up the tools and a repeatable environment | {{lesson:build-setup}} | A working Ignition Maker Edition install, a PLC simulator, a database connection and a Git repository |
| You can model equipment once and reuse it | {{lesson:build-motor-udt}} | A Logix \`UDT_Motor\` and a matching Ignition \`Motor\` UDT (\`M101.Cmd.Start\`, \`M101.Sts.Running\`), following the naming standard in {{lesson:int-naming}} |
| You can build screens that scale to every motor | {{lesson:build-faceplate}} | One Perspective faceplate driven by a single \`tagPath\` parameter |
| You understand alarms and history as engineering, not decoration | {{lesson:build-alarms-history}} | Alarms with delay and deadband, history in a database, a short rationalization record ({{lesson:int-alarm-mgmt}}) |
| You can turn plant data into a business answer | {{lesson:build-oee}} | A line OEE screen with downtime reasons for Plant 1, Line 1 ({{lesson:mes-oee}}) |

Then add the integrator layer on top, which is what separates a hireable candidate from a hobbyist:

1. **A one-page decision log.** Use the format from {{lesson:int-capstone}}: context, decision, alternatives, consequences. Write one for your own lab (why PostgreSQL for history, why one tagPath parameter, why the DMZ pattern).
2. **A naming standard.** One page, with the drawing-to-code mapping (\`LT-101\` on the drawing, \`LT101\` in the PLC, the Ignition path, the UNS topic) and a regular expression a script can check ({{lesson:int-naming}}).
3. **A short FDS excerpt.** A control narrative for one pump or tank with numbered requirements, an alarm table and a failure-behavior clause ({{lesson:int-fds}}).
4. **A commissioning checklist and a sample completed I/O list**, with a loop check for LT-101 using the NE43 limits ({{lesson:int-commissioning}}).
5. **A written failure.** One page on a bug you found and how you fixed it is worth more than ten screenshots.
6. **Source in Git.** PLC exports, Ignition project exports and SQL scripts, with customer data, passwords and licenses removed.

If you can walk an interviewer through that package in twenty minutes, you have already done a small version of the whole lifecycle in {{lesson:int-lifecycle}}.

## Build a home lab

You can learn nearly all of this at home for little money. The Build Labs list the exact steps; this is the shopping list.

- **Ignition Maker Edition.** Inductive Automation offers it free for personal, non-commercial and educational use. It has limits on tags and sessions, restricted module support and community-only support, and it cannot be used for business demos or paid work. Check the current Maker Edition page for the limits and the sign-in steps.
- **A PLC or an emulator.** A used Micro800 or CompactLogix gives real hardware experience. Rockwell's Connected Components Workbench works with Micro800 controllers and includes a simulator. Studio 5000 Logix Emulate is a paid option for Logix. Open-source runtimes also exist, such as OpenPLC. Match what your target employers use.
- **Docker.** Run Ignition, a SQL database such as PostgreSQL and an MQTT broker such as Mosquitto in containers with a compose file. Inductive University has an elective course on Ignition with Docker. See {{lesson:arch-containers}}.
- **A tiny network.** A managed switch and a small firewall let you practice VLANs and zones from {{lesson:net-vlan}} and {{lesson:net-security}}, using the house IP plan (control VLAN 10 at \`10.20.10.0/24\`, servers VLAN 30, DMZ VLAN 250).

A good first lab is the Build Labs path itself: a simulated motor and level transmitter in a PLC, UDTs mirrored in Ignition, a Perspective faceplate, alarms with notification, history in PostgreSQL, and a Sparkplug publish to a broker (group \`Plant1\`, edge node \`Area10_Line1\`, device \`M101\`).

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
      body: `Weeks 1 to 4: work through the Inductive University credential courses in Maker Edition and pass every challenge. Weeks 5 to 8: work through the Build Labs ({{lesson:build-setup}} to {{lesson:build-alarms-history}}) for the UDTs, faceplate, alarms and history. Weeks 9 to 10: review the Core topics (architecture, tags, history, alarming, UDTs). Week 11: take the Core test. Week 12: start Gold prep by building an SQL-backed screen with a script that writes events.`
    },
    {
      title: "One portfolio project, summarized",
      body: `Project: Meridian Foods Plant 1, Line 1 OEE demo ({{lesson:build-oee}}). Stack: Ignition Maker Edition, PostgreSQL and a PLC simulator. Deliverables: UDT-based tag tree (\`[default]Plant1/Area10/Line1/M101\`) following a written naming standard, a Perspective dashboard, a downtime reason table, a screen recording, a one-page decision log explaining why history is stored in PostgreSQL and not in memory, and a commissioning checklist with a sample completed I/O list.`
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
      options: ["They are the same thing with different names", "Certification is free and credentials are paid", "Credentials last forever and certification never expires", "A credential records completed training and challenges; certification is earned by passing a separate test"],
      answer: 3,
      explain: [
        "They are separate. Integrator program tiers treat them differently.",
        "IU is free to use, and certification tests are paid.",
        "Credentials are tied to a version, and certifications expire and must be renewed.",
        "Correct. IU credentials come from courses and challenges for a version, and certifications such as Core and Gold come from tests."
      ]
    },
    {
      q: "Which statement about the Ignition Gold certification is accurate?",
      options: ["It is a take-home practical that requires Core first and covers SQL and Python scripting", "It is a 30-minute multiple-choice quiz", "It requires no prior certification", "It replaces the Core test"],
      answer: 0,
      explain: [
        "Correct. Gold is a long practical that builds on Core.",
        "That describes neither Core nor Gold. Gold is a long practical, not a short quiz.",
        "Core is a prerequisite.",
        "Gold does not replace Core. It requires it."
      ]
    },
    {
      q: "A technician who calibrates instruments and troubleshoots loops wants a recognized credential. Which fits best?",
      options: ["ISA CAP", "ISA CCST", "PE in Control Systems", "CSIA certification"],
      answer: 1,
      explain: [
        "CAP targets people who design and deploy automation systems.",
        "Correct. CCST targets technicians who calibrate, document and troubleshoot instrumentation.",
        "A PE is a legal license for engineers who sign and seal designs.",
        "CSIA certifies integrator companies, not individuals."
      ]
    },
    {
      q: "An integrator wants to move from Certified to Gold in the Ignition Integrator Program. What must change?",
      options: ["They need a PE license", "They need CSIA certification", "At least one employee must hold a current Gold certification, and the sales threshold must be met", "They must pay for a new Maker license"],
      answer: 2,
      explain: [
        "A PE is unrelated to program tiers.",
        "CSIA is a separate company audit, not a requirement of the Ignition program.",
        "Correct. Gold needs a Gold-certified employee plus meeting the sales threshold. Check the current tier rules for the details.",
        "Maker Edition is free for personal use and has no role in tiers."
      ]
    },
    {
      q: "You want to build a portfolio demo using Ignition at home. Which is appropriate?",
      options: ["Use Maker Edition to run a paying customer's pilot", "Post a client's screens as examples", "Skip documentation, since screenshots are enough", "Use Maker Edition for personal learning projects and show screenshots and exports you own"],
      answer: 3,
      explain: [
        "Paid or business use needs a commercial license.",
        "Client material needs written permission and is usually confidential.",
        "Documentation such as a decision log is what separates a portfolio from a screenshot collection.",
        "Correct. Maker Edition is for personal, non-commercial and educational use."
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
