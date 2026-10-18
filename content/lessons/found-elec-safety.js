LC.lesson({
  id: "found-elec-safety",
  title: "Electrical safety in the plant",
  track: "found",
  minutes: 15,
  level: 1,
  prereqs: ["found-devices"],
  tags: ["safety", "nfpa-70e", "arc-flash", "loto", "osha", "stored-energy"],
  summary: "Awareness of shock, arc flash and lockout/tagout, so you know what you must not do alone and what to ask for before you open a panel.",
  objectives: [
    "Explain the difference between shock and arc flash hazards",
    "Read an arc flash label at awareness level: boundaries, incident energy and PPE category",
    "List the lockout/tagout steps and say why verification comes last",
    "Name the stored energy sources in a drive and in a pneumatic system",
    "Decide when a troubleshooting task needs a qualified person and a permit"
  ],

  body: `
## Why a controls engineer needs this

Most of your work happens in a software tool, but the equipment you configure sits behind doors with 480 V on the other side. You will be asked to look at a drive fault, check a field wire or "just measure that 24 V" inside a panel that also holds the main disconnect. This lesson gives you awareness, not a qualification. Doing energized work on electrical equipment takes formal training, employer authorization and the right PPE. Use this lesson to know what to ask, and when to stop and get someone qualified.

## Two different hazards

| Hazard | What happens | Typical cause | Main defense |
|---|---|---|---|
| **Shock** | Current passes through the body, which can stop the heart or burn tissue | Touching an energized conductor or a part that became energized | Keep away, insulate, de-energize |
| **Arc flash** | An arc through air releases intense heat, light and pressure in a fraction of a second | A dropped tool, a loose conductor, a failed breaker, or racking a breaker | De-energize, reduce incident energy, wear arc-rated PPE |

Shock needs contact (or near contact at higher voltage). {{term:arc-flash|Arc flash}} needs no contact at all. A tool slipping across two bus bars is enough. Both are governed in US workplaces by {{term:nfpa-70e|NFPA 70E}}, and OSHA expects employers to protect workers from them. OSHA's publication on arc flash hazards is a good plain-language start (see Resources).

## Approach boundaries

{{diagram:boundaries}}

NFPA 70E defines distances around exposed energized parts. The **limited approach boundary** is where a shock hazard exists. An unqualified person who must cross it is supervised and escorted by a qualified person. The **restricted approach boundary** is closer, where the risk of shock rises because of arc-over combined with inadvertent movement. OSHA's guidance is that an unqualified person never crosses it. The **arc flash boundary** is based on {{term:incident-energy|incident energy}}, the distance at which an arc would deliver 1.2 cal/cm2 to bare skin, the level associated with the onset of a second-degree burn. Inside it, everyone wears arc-rated PPE.

The distances depend on voltage and equipment, so you read them off the equipment, not from memory.

## Reading an arc flash label

An {{term:arc-flash-label|arc flash label}} is the sticker on switchgear, panelboards, MCCs and some control panels. It comes from an arc flash risk assessment and typically shows:

- The **nominal voltage** of the equipment
- The **arc flash boundary**
- The **incident energy** at a working distance, or an {{term:arc-flash-ppe-category|arc-rated PPE category}}
- The **shock boundaries** (limited and restricted)
- The date or study reference

One NFPA example label lists a restricted boundary of 2 ft 2 in, a limited boundary of 5 ft and an arc flash boundary of 14 ft. PPE categories in the 70E tables run from 1 to 4. A label that says "Category 2" tells you the minimum arc rating of clothing and gear for the tasks it covers. It does not tell you the task is safe to do live.

> [!warning] What a label does not do
> A label describes the equipment's hazard. It is not permission to work on it energized. Opening an enclosure with exposed live parts, or touching anything inside, needs an energized work permit under your employer's program in most cases. Check your site procedure.

## Lockout/tagout

{{term:loto|Lockout/tagout}} is the discipline of isolating a machine from every energy source and keeping it isolated while someone works. The US rule is {{term:osha-1910-147|OSHA 29 CFR 1910.147}}. It requires a written energy control procedure for the equipment, trained authorized employees, and periodic inspections.

A typical sequence looks like this. Your site procedure is the authority on the exact order.

1. **Prepare.** Identify every energy source: electrical (more than one feed), pneumatic, hydraulic, gravity, thermal, chemical.
2. **Notify** affected operators.
3. **Shut down** using the normal stop.
4. **Isolate.** Open the disconnect, close the air supply, close the valve.
5. **Lock and tag.** Each worker applies their own lock and tag. One lock, one key, one person.
6. **Relieve stored energy.** Bleed air, block raised loads, wait for capacitors.
7. **Verify.** Try to start the machine from the normal controls (the try-out), then test for voltage at the point of work with a meter you have checked on a known source before and after.

{{diagram:loto}}

Verification is last on purpose. The lock proves you applied a device. It does not prove the circuit is dead. Mislabeled disconnects, a second feed, a backfeed from a control transformer or a failed switch all exist. OSHA's guidance is to verify that isolation has been effectively accomplished before servicing begins.

> [!note] "Zero energy" in practice
> People say "verify zero energy" for step 7. OSHA's own interpretation letters note that the standard does not use the phrase, but it does require verification and release of stored energy. See the OSHA interpretation in Resources.

## Stored energy

Turning off the supply does not always remove the hazard.

| Source | What stays behind | What to do |
|---|---|---|
| VFD {{term:dc-bus|DC bus}} | Capacitors hold dangerous voltage after power is removed | Wait the time in the manual, then measure DC+ to DC- before touching |
| Control power capacitors, UPS, batteries | Voltage after the main is open | Treat as live until measured |
| Pneumatics | Compressed air in lines and cylinders | Close and lock the supply, vent to zero, block cylinders that can move on gravity |
| Hydraulics | Pressurized oil | Relieve through the specified valve, block loads |
| Springs, raised loads | Mechanical potential energy | Block or pin |

Rockwell's PowerFlex manuals illustrate the drive case. The PowerFlex 4, 520-series and 527 documents call for a three-minute wait, and the 527 manual states a DC bus voltage below 50 V DC as the safe level. The PowerFlex 750-series and some larger drives call for five minutes. Several manuals warn that a dark display does not mean the capacitors are discharged. Always check the manual for your catalog number.

## Working near energized panels while troubleshooting

You will sometimes need to see a live signal. Keep these rules of thumb.

- **Default to de-energized.** If the question can be answered with the power off (continuity, resistance, visual inspection), do that.
- **Use the HMI and the software first.** Online monitoring of a Logix tag, a drive's keypad, or the Ignition diagnostics page often answers the question without opening a door.
- **Don't open or reach into anything you are not qualified for.** An interposing relay at 120 V in a 480 V cabinet is still in a 480 V cabinet.
- **Keep doors closed when racking, switching or resetting breakers.** Many arc flash injuries happen during operation of equipment, not repair.
- **If a live measurement is truly required**, a qualified person does it, under your employer's permit process, with the right meter category and PPE. You can stand outside the boundary and read the numbers.
- **Never bypass interlocks, door switches or guards** to see something running.

> [!example] A Meridian Foods Plant 1 call
> M101 in Area10 is a 480 V motor fed by a VFD. The drive trips on overcurrent at 02:00. The operator asks you to "have a look at the drive." You connect to the drive's Ethernet port from the engineering workstation (VLAN 50) and read its fault history without opening the cabinet. The log shows a ground fault. You stop there and call the electrician. Checking the motor leads means lockout, a 5-minute wait, a DC bus measurement and a megohm test, all done by a qualified person.

## Why controls engineers still need this

You write the code that starts motors and moves actuators, and your design decisions affect what lives in a cabinet. Good habits at the design stage reduce live work later: put test points and indicator lights where they can be read without opening the door, use fused terminal blocks so a field wire can be isolated cleanly, and label every disconnect and every source. When you commission, you will stand next to people who do live work. Knowing the vocabulary lets you speak up.
`,

  eli5: `
Imagine a big water tank on a hill with a pipe running to your house. The water pressure is the electricity. Most of the time a closed tap keeps it away from you. Now picture the pipe bursting right as you walk by: water shoots out, and you don't even have to touch it to get hurt. That is an arc flash. Touching a bare, flowing pipe is a shock.

Before a plumber fixes a pipe, they shut the valve and put their own padlock on it so nobody can turn it back on while their arm is in the wall. Then they open a tap to check that the water has really stopped. That is lockout and tagout, and the tap check is the verification step.

Some pipes have a tank hanging off them that stays full even after the valve is closed. In a motor drive, that tank is a big capacitor. You have to wait for it to empty, and you check with a meter, not by looking.

A controls engineer is often the person who asks "can you look at this?" The safe answer is "only after someone trained has checked that the water is really off."
`,

  why: `
**Why verify instead of trusting the lock?** A lock proves that somebody applied a lock. Real plants have a disconnect labeled wrong, a second feed from another panel, a control circuit fed from a different source, and capacitors that hold charge. The accident reports tend to describe a person who trusted a label or a switch position. Verification with a tested meter is the step that replaces trust with evidence.

**Why does 70E push de-energizing as the default?** Personal protective equipment is the last line of defense, not the first. Arc-rated clothing limits burns but does not prevent an arc. The preferred order is to eliminate the hazard (shut it off), then engineering controls (remote racking, current-limiting devices), then procedures, then PPE. Live work is allowed in defined cases, such as when de-energizing would create greater hazard or is infeasible, but it requires a risk assessment and a permit. Experienced integrators argue about what counts as infeasible. A common failure is "it is inconvenient to shut down the line" being treated as infeasible.

**Why must controls engineers care at all?** Because you are the one nearby when something is wrong and the question is "is it the PLC or the field?" Pressure to answer quickly is how people end up with a meter in a live panel. If you know the boundaries, you can say no politely and offer a safer way, such as reading the fault from the drive or the controller.

**Where is the tradeoff?** Procedures slow work. Industry is moving toward designs that reduce live exposure: remote I/O in separate low-voltage enclosures, finger-safe terminals, viewing windows, and diagnostics over the network. That is a design choice you can influence.

None of this makes you a qualified person. It makes you a useful colleague who knows when to stop.
`,

  history: `
OSHA issued its control of hazardous energy standard, 29 CFR 1910.147, to cover servicing and maintenance of machines where unexpected energization or release of stored energy could injure workers. NFPA 70E grew out of a request by OSHA to NFPA for a consensus standard on electrical safety in the workplace, and it has been revised on a regular cycle since. Recent editions have added attention to DC arc flash and to the 50-volt threshold, so always check the current edition. Arc flash labeling became common as employers began running arc flash studies and applying the results to equipment.
`,

  examples: [
    {
      title: "Reading a label before a request",
      body: `A panelboard label reads: 480 V, arc flash boundary 14 ft, restricted approach 2 ft 2 in, limited approach 5 ft, PPE Category 2. A colleague asks you to "jump over to the panel and check the voltage on terminal 12." You are outside the limited approach boundary on the engineering side. You tell them you cannot enter the boundary. A qualified electrician does the measurement under a permit, or the check is done with the panel de-energized.`
    },
    {
      title: "Lockout on a VFD-driven motor",
      body: `To replace the M101 motor lead: stop M101 from the HMI, open and lock the VFD disconnect, close and lock the air supply to the nearby cylinder, and tag both. Wait for the time stated in the drive manual (five minutes on a larger frame). Press Start at the HMI to prove it will not run. Then measure DC+ to DC- at the drive terminals, with the meter checked on a known source before and after. Only then does anyone touch the leads.`
    }
  ],

  diagrams: {
    boundaries: `<svg viewBox="0 0 640 260" role="img" aria-label="Concentric zones around exposed energized equipment: restricted approach boundary closest, then limited approach boundary, then the arc flash boundary, whose size depends on incident energy">
  <circle class="dg-zone" cx="200" cy="130" r="118"/>
  <circle class="dg-zone" cx="200" cy="130" r="82"/>
  <circle class="dg-zone" cx="200" cy="130" r="46"/>
  <rect class="dg-box-alarm" x="176" y="112" width="48" height="36" rx="4"/>
  <text class="dg-text-sm dg-mid" x="200" y="135">Live part</text>
  <text class="dg-text-sm dg-mid" x="200" y="86">Restricted</text>
  <text class="dg-text-sm dg-mid" x="200" y="58">Limited</text>
  <text class="dg-text-sm dg-mid" x="200" y="26">Arc flash</text>
  <text class="dg-title" x="350" y="40">Who may cross</text>
  <rect class="dg-box" x="350" y="54" width="270" height="52" rx="6"/>
  <text class="dg-text-sm" x="362" y="76">Limited approach: unqualified</text>
  <text class="dg-text-sm" x="362" y="94">only when escorted by qualified</text>
  <rect class="dg-box-alarm" x="350" y="116" width="270" height="52" rx="6"/>
  <text class="dg-text-sm" x="362" y="138">Restricted approach: qualified</text>
  <text class="dg-text-sm" x="362" y="156">only, with a plan and protection</text>
  <rect class="dg-box-warn" x="350" y="178" width="270" height="62" rx="6"/>
  <text class="dg-text-sm" x="362" y="200">Arc flash boundary: arc-rated</text>
  <text class="dg-text-sm" x="362" y="218">PPE inside it. 1.2 cal/cm2 at</text>
  <text class="dg-text-sm" x="362" y="234">the edge. Size varies by equipment.</text>
</svg>`,
    loto: `<svg viewBox="0 0 640 120" role="img" aria-label="Lockout/tagout sequence: prepare, notify, shut down, isolate, lock and tag, relieve stored energy, verify">
  <rect class="dg-box" x="10" y="30" width="78" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="49" y="62">Prepare</text>
  <rect class="dg-box" x="98" y="30" width="78" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="137" y="62">Notify</text>
  <rect class="dg-box" x="186" y="30" width="78" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="225" y="62">Shut down</text>
  <rect class="dg-box" x="274" y="30" width="78" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="313" y="62">Isolate</text>
  <rect class="dg-box" x="362" y="30" width="78" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="401" y="56">Lock and</text>
  <text class="dg-text-sm dg-mid" x="401" y="72">tag</text>
  <rect class="dg-box" x="450" y="30" width="86" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="493" y="56">Relieve</text>
  <text class="dg-text-sm dg-mid" x="493" y="72">stored energy</text>
  <rect class="dg-box-accent" x="546" y="30" width="84" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="588" y="62">Verify</text>
</svg>`
  },

  pitfalls: [
    "Treating a label as permission. It describes the hazard and does not authorize live work.",
    "Trusting the position of a disconnect or a lock instead of measuring with a meter you proved on a known source.",
    "Assuming a dark drive display means the DC bus is discharged.",
    "Forgetting a second energy source: air, a second electrical feed, a gravity load.",
    "Reading a control voltage in a cabinet that also holds higher-voltage conductors, because 'it's only 24 V'.",
    "Leaving the lockout to the person before you at shift change instead of applying your own lock and verifying again."
  ],

  keyTerms: ["nfpa-70e", "arc-flash", "approach-boundaries", "arc-flash-label", "loto", "osha-1910-147", "stored-energy", "dc-bus", "qualified-person"],

  quiz: [
    {
      q: "What is the key difference between a shock hazard and an arc flash hazard?",
      options: ["Arc flash can injure without anyone touching the equipment, while shock needs contact or close approach", "Shock only occurs at DC voltages", "Arc flash only occurs at high voltage substations", "They are the same hazard with different names"],
      answer: 0,
      explain: [
        "Correct. An arc can start from a dropped tool or a failing device and burn people standing near it.",
        "Shock occurs at AC and DC voltages.",
        "Arc flash can occur in ordinary low-voltage panels, MCCs and drives.",
        "They have different causes, effects and defenses, which is why 70E has separate boundaries."
      ]
    },
    {
      q: "An unqualified controls engineer needs to read a label on a panel with an arc flash boundary of 14 ft. What does the boundary mean for them?",
      options: ["Nothing, because they are not touching anything", "It is the distance within which they may take voltage readings", "It only matters when the door is closed", "Inside it, arc-rated PPE is required and entry should follow site rules for unqualified people"],
      answer: 3,
      explain: [
        "Arc flash does not require contact.",
        "Measurements need a qualified person and a permit.",
        "Closed doors reduce exposure but operation of equipment still causes injuries.",
        "Correct. The boundary is where incident energy reaches the level that burns bare skin, so PPE and site permit rules apply."
      ]
    },
    {
      q: "Which is the best order for the final steps of lockout/tagout?",
      options: ["Verify, then relieve stored energy, then apply locks", "Apply locks, relieve stored energy, then verify with a try-out and a meter", "Apply tags only, then verify", "Relieve stored energy, then remove locks, then verify"],
      answer: 1,
      explain: [
        "Locks go on before you work, and verification comes after stored energy is relieved.",
        "Correct. Verification confirms the whole job: isolation and release of stored energy.",
        "Tags alone are weaker than locks and do not physically prevent re-energizing.",
        "Locks stay on while work is underway."
      ]
    },
    {
      q: "You locked out the VFD feeding M101 and waited the time in the manual. What do you do before touching the motor leads?",
      options: ["Nothing. The wait time is enough", "Check that the drive's display is dark", "Measure DC bus voltage with a meter proven on a known source", "Press the Start button on the drive keypad"],
      answer: 2,
      explain: [
        "The manual's wait time is a minimum, and the manuals tell you to measure.",
        "A dark display is not an indication that the capacitors are discharged.",
        "Correct. Measurement is the evidence that the stored energy is gone.",
        "A start attempt is part of the try-out, but it says nothing about capacitor charge."
      ]
    },
    {
      q: "A technician asks you to hold a flashlight while they measure voltage in a 480 V MCC bucket. What is the best response?",
      options: ["Stay beside them so you can help", "Open the door for them", "Hold the light from outside the limited approach boundary, if the permit and your site rules allow your presence at all", "Bypass the door interlock so it is easier"],
      answer: 2,
      explain: [
        "Standing next to an energized MCC puts you inside the boundaries.",
        "Opening an MCC door is an operation that is itself an arc flash risk.",
        "Correct. An unqualified person stays out of the boundaries and follows the permit process.",
        "Never defeat interlocks."
      ]
    },
    {
      q: "Which of these is stored energy that survives opening the main disconnect?",
      options: ["Capacitors in the VFD DC bus and air trapped in a cylinder", "The 480 V utility feed", "The PLC's firmware", "The Ethernet link light"],
      answer: 0,
      explain: [
        "Correct. Both capacitors and compressed air can injure someone after the disconnect is open.",
        "The feed is isolated by the disconnect, although upstream parts of the panel stay live.",
        "Firmware is not an energy hazard.",
        "A link light is not a hazard."
      ]
    }
  ],

  resources: [
    { title: "1910.147 - The control of hazardous energy (lockout/tagout)", url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147", type: "standard", source: "OSHA" },
    { title: "Control of Hazardous Energy Lockout/Tagout (OSHA 3120)", url: "https://www.osha.gov/sites/default/files/publications/OSHA3120.pdf", type: "docs", source: "OSHA" },
    { title: "Applicability of OSHA's LOTO standards; isolation and verification procedures", url: "https://www.osha.gov/laws-regs/standardinterpretations/2000-11-16", type: "docs", source: "OSHA" },
    { title: "Protecting Employees from Electric-Arc Flash Hazards (OSHA 4472)", url: "https://www.osha.gov/sites/default/files/publications/OSHA4472.pdf", type: "docs", source: "OSHA" },
    { title: "A better understanding of NFPA 70E: when to protect an employee from electrical hazards", url: "https://www.nfpa.org/news-blogs-and-articles/blogs/2020/02/05/a-better-understanding-of-nfpa-70e-when-to-protect-an-employee-from-electrical-hazards", type: "article", source: "NFPA" },
    { title: "PowerFlex 527 Adjustable Frequency AC Drive user manual", url: "https://literature.rockwellautomation.com/idc/groups/literature/documents/um/520-um002_-en-e.pdf", type: "docs", source: "Rockwell Automation" }
  ]
});
