LC.lesson({
  id: "arch-notification",
  title: "Alarm notification, voice and SMS",
  track: "arch",
  minutes: 20,
  level: 2,
  prereqs: ["ign-alarming"],
  tags: ["alarm-notification", "pipelines", "twilio", "sms", "on-call"],
  summary: "Turn an alarm into the right person's phone call, and make sure that call happens once, in order, and stops when someone acknowledges.",
  objectives: [
    "Describe the parts of the Alarm Notification module: profiles, rosters, schedules and pipelines",
    "Build a pipeline that notifies, waits and escalates",
    "Explain how acknowledgment by phone or SMS works with Twilio",
    "Choose between email, SMS and voice for different priorities",
    "Design pipelines that avoid alarm spam"
  ],

  body: `
## What the module adds

Core Ignition alarming detects alarms, shows them on screens and records them in a journal. The Alarm Notification module takes alarm events and tells people who aren't looking at a screen, by email, SMS or voice call. It does this through four building blocks: notification profiles, on-call rosters, schedules and {{term:alarm-pipeline|alarm pipelines}}. Alarm configuration says *which* pipeline an alarm uses, and the pipeline says *who* hears about it and *when*.

## The building blocks

| Piece | Job |
|---|---|
| {{term:notification-profile|Notification profile}} | A delivery channel: an email (SMTP) profile, or a Twilio SMS or voice profile |
| User and contact info | Each user has contact methods (email address, phone number) |
| Schedule | When a person is available (days, hours, rotations) |
| {{term:on-call-roster|On-call roster}} | An ordered list of users. Filtered by each user's schedule at the moment of use |
| Pipeline | The flowchart that ties it all together |

Because the roster is filtered by schedule, the same pipeline reaches the day shift in the day and the night shift at night. You change who is on call by editing the roster or the schedules, not the pipeline.

## Pipeline blocks

A pipeline starts with the alarm event and flows through blocks. The ones you use most:

- **Notification block:** sends through a chosen profile to a chosen roster. Email can address many recipients at once. SMS and voice work through contacts one at a time, in roster order (verify in the Notification block page for your version).
- **Delay block:** holds the event for a set time. A typical use is "wait 5 minutes for someone to acknowledge before calling".
- **Expression and Switch blocks:** branch on alarm properties such as priority, or on computed values.
- **Set Property block:** stores values on the event, such as a counter, for use later in the pipeline.
- **Jump block:** sends the event to another pipeline, which keeps an escalation pipeline separate and reusable.
- **Splitter:** sends the event down more than one path at once.

{{diagram:pipeline}}

Blocks also react to acknowledgment. Ignition removes an acknowledged or cleared event from waiting blocks by their configured behavior, so a delay that is waiting for an ack doesn't go on to call someone after the operator already acknowledged. Check each block's options for exactly which conditions end the wait.

### An escalation pipeline

Escalation is usually built with a counter, as in the manual's example:

1. Notification block: SMS to the \`Operators\` roster.
2. Delay block: wait 10 minutes, exit early on acknowledge.
3. Expression block: has the alarm been acknowledged? If yes, finish.
4. Set Property: increment \`escalation\` counter.
5. Notification block: voice call to the \`Supervisors\` roster, with a delay between messages.

> [!example] Two-level escalation
> High-high level alarm (LAHH-101 on LT101). Priority is Critical. Pipeline: email the shift group and SMS the operator on duty immediately. Wait 5 minutes. If still unacknowledged, voice-call the supervisor roster. After 15 more minutes, jump to \`PlantManagerEscalation\`. An acknowledgment at any point ends the chain.

## Email, SMS and voice

| Channel | Good for | Cost and limits |
|---|---|---|
| Email | Low priority, summaries, many recipients, records | Free, slow to be seen |
| SMS (Twilio) | Medium priority, short and quick, ack by reply | Per-message cost, carrier delays |
| Voice (Twilio) | High priority, off-hours, no-ignore alerts | Per-minute cost, calls are serialized |

### Twilio

Ignition has Twilio SMS and voice profile types. You need a Twilio account with the right capability, a phone number, and a Gateway with internet access to Twilio. For voice, Twilio must also reach your Gateway to deliver the interactive part, which has consequences:

- **Acknowledgement by phone** needs the Gateway's public hostname configured, so Twilio can call back into it. Because that exposes an inbound path, treat the exposure as a security design item. See {{lesson:net-security}}.
- **SMS acknowledgement** by reply works the same way in principle: the person's reply goes to Twilio, and Twilio must deliver it to the Gateway, which again needs an inbound path and a public hostname. Without that route, SMS is notify-only and the pipeline must escalate on a timer instead of waiting for a reply. Check the SMS profile page for your version for the exact reply format.
- **PIN authentication** can be required so a person has to enter a code to acknowledge. The manual lists the default for voice; check the Twilio profile page for your version.
- **Broadcast notifications** deliver the message without acknowledgment or PIN, which suits a plant with no inbound route. These calls are unauthenticated, so use them only for information.
- A **delay between messages** setting exists on each profile type, and the manual gives the default and its advice for phone systems (check the Twilio profile page for your version). A very long delay can hold up other alarms waiting in the call queue.

> [!note] In 8.1
> The same block model applies. Check the 8.3 Twilio profile pages for current setting names before configuring.

## Designing pipelines that don't spam

1. **Page only for alarms that need a human now.** If nobody can act, it isn't a page. Review with ISA-18.2 style rationalization.
2. **Delay before paging.** A short delay with an acknowledge-exit absorbs flickers and gives an operator at the screen first chance.
3. **One pipeline per response, not per alarm.** Share a few pipelines by priority and area. A hundred bespoke pipelines can't be maintained.
4. **Group storms.** If a power loss trips 80 alarms, you don't want 80 calls. Filter by priority, use a rollup alarm for the parent condition, or use shelving and suppression on consequential alarms.
5. **Escalate on silence, not on repetition.** Escalation should move to a different person or channel, not repeat the same page.
6. **Test with the real phone path.** Fire a test alarm, check the schedule at an off-hours time, and check that acknowledgment really stops the chain.
7. **Watch the cost.** Voice and SMS cost money per use. A chattering alarm with a voice pipeline is a billing event.
`,

  eli5: `
Imagine you run a restaurant and the fire alarm panel is in the back. If it rings and nobody's in the back, you want it to phone someone.

You write instructions on a card. First, text the manager on duty. Then wait five minutes. If nobody has said "got it", phone the owner. If still nothing, phone the owner's spouse. At any point, if someone says "got it", throw the card away.

The card also knows who is working. At lunch it texts the lunch manager, and at night it texts the night manager, because there's a work calendar behind it.

The danger is a card that phones everyone for everything. If a loud noise triggers fifty tiny alarms in a minute, nobody wants fifty phone calls. They want one call that says, "the whole kitchen has a problem". So you write cards that wait a little, check whether someone's already on it, and only call about things that need a person right now.
`,

  why: `
**Why pipelines instead of a simple "email on alarm"?** Real response is a process. Someone must be told, someone must take ownership, and if they don't, someone else must be told. A pipeline makes that process visible and testable instead of leaving it as scattered scripts or tribal knowledge.

**Why rosters and schedules separate from pipelines?** People change shifts, go on leave and leave the company far more often than response processes change. Keeping people in rosters and schedules means a staffing change is an edit to data, not to logic, and doesn't risk breaking the escalation.

**Why so much emphasis on spam?** Notification fatigue is how real alarms get missed. When people receive hundreds of pages a week, they stop reading them. The failure story is familiar: a critical page gets lost among nuisance ones, and the post-incident review finds the nuisance pages were a known annoyance. Standards like ISA-18.2 and EEMUA 191 treat alarm rate per operator as a measured quantity for exactly this reason. See {{lesson:ign-alarming}}.

**Why voice for critical alarms?** SMS can sit unread on a phone on silent. A call that requires acknowledgment is harder to ignore, and the acknowledgment becomes part of the record. The tradeoff is cost, serialized calls that queue behind each other, and the inbound path Twilio needs for interactive acknowledgment.

**What integrators argue about.** Whether Ignition notification should be the primary path for critical alarms at all. Some customers use dedicated paging or call-out systems, or a third-party service, and have Ignition send events to it. For safety-related alarms, a notification system running on a general-purpose server is never the only layer. The PLC and the plant's own annunciation come first, and the phone call is an extra.
`,

  history: `
The Alarm Notification module predates 8.x (check the 7.9 manual if you maintain an old system). Pipelines let you express a response process as a flowchart instead of a fixed contact list. Twilio SMS and voice profiles are available in 8.x.
`,

  examples: [
    {
      title: "Three-tier pipeline for a tank alarm",
      body: `Priority High: email the area group only. Priority Critical: SMS the operator roster, delay 5 minutes (exit on ack), then voice call the supervisor roster with 2 seconds between messages. Pipeline names: \`Notify_High\` and \`Notify_Critical\`. Alarms point at one of two pipelines, so the response process is edited in two places.`
    },
    {
      title: "Debugging a double page",
      body: `An operator received two SMS messages for the same alarm. Cause: the alarm cleared and re-triggered within seconds, creating a new event and a new pipeline run. Fix: add an alarm on-delay of 30 seconds on the alarm and a deadband on the source, so a flickering condition doesn't create repeated events.`
    }
  ],

  diagrams: {
    pipeline: `<svg viewBox="0 0 640 200" role="img" aria-label="An alarm event goes to an SMS notification block, then a delay that exits on acknowledgement, then a voice notification block to the supervisor roster">
  <defs><marker id="arch-notification-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="10" y="60" width="100" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="60" y="84">Alarm</text>
  <text class="dg-text-sm dg-mid" x="60" y="102">event</text>
  <rect class="dg-box-accent" x="150" y="60" width="130" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="215" y="84">Notify: SMS</text>
  <text class="dg-text-sm dg-mid" x="215" y="102">Operators roster</text>
  <rect class="dg-box" x="320" y="60" width="110" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="375" y="84">Delay 5 min</text>
  <text class="dg-text-sm dg-mid" x="375" y="102">exit on ack</text>
  <rect class="dg-box-accent" x="470" y="60" width="160" height="56" rx="6"/>
  <text class="dg-text-sm dg-mid" x="550" y="84">Notify: Voice</text>
  <text class="dg-text-sm dg-mid" x="550" y="102">Supervisors roster</text>
  <line class="dg-line" x1="110" y1="88" x2="148" y2="88" marker-end="url(#arch-notification-ah)"/>
  <line class="dg-line" x1="280" y1="88" x2="318" y2="88" marker-end="url(#arch-notification-ah)"/>
  <line class="dg-line" x1="430" y1="88" x2="468" y2="88" marker-end="url(#arch-notification-ah)"/>
  <text class="dg-text-muted" x="320" y="160">Acknowledged at any point: the event leaves the pipeline.</text>
  <text class="dg-text-muted" x="320" y="180">Rosters are filtered by user schedules when each block runs.</text>
</svg>`
  },

  pitfalls: [
    "Sending a voice call for every priority, then having people ignore it.",
    "Building one bespoke pipeline per alarm.",
    "Not testing the off-hours schedule and acknowledgment path.",
    "Exposing the Gateway to the internet for Twilio callbacks without thinking through security, instead of using broadcast mode where it fits.",
    "Letting a chattering alarm trigger a new pipeline run each time."
  ],

  keyTerms: ["alarm-pipeline", "on-call-roster", "notification-profile", "deadband", "stale-data", "alarm-limits"],

  quiz: [
    {
      q: "A roster has five users with different schedules. At 3 a.m., who does a Notification block contact?",
      options: ["All five users", "Only the users whose schedules say they are available then", "The first user regardless of schedule", "Nobody, because rosters ignore schedules"],
      answer: 1,
      explain: [
        "Rosters are filtered by schedule before contacting.",
        "Correct. The roster is filtered by each user's schedule, then contacts are reached in order.",
        "The order matters, but availability is applied first.",
        "Schedules are exactly what filter the roster."
      ]
    },
    {
      q: "You want a supervisor called only if the operator has not acknowledged an SMS in 5 minutes. Which blocks?",
      options: ["Two Notification blocks back to back", "Notification (SMS), a Delay that exits on acknowledgement, then Notification (voice)", "A Splitter with both channels", "A Set Property block alone"],
      answer: 1,
      explain: [
        "That calls both immediately.",
        "Correct. The delay gives time to acknowledge, and acknowledgement ends the wait.",
        "A splitter sends both paths at once.",
        "Set Property stores a value; it notifies nobody."
      ]
    },
    {
      q: "A power loss trips 80 alarms and 80 phone calls start. What is the best design response?",
      options: ["Add more voice lines", "Use a rollup or parent alarm, priority filtering and suppression of consequential alarms", "Turn off the Twilio profile", "Set the delay between messages to zero"],
      answer: 1,
      explain: [
        "That scales the spam.",
        "Correct. One call about the root cause is more useful than 80 about its effects.",
        "Disabling it removes the notification entirely.",
        "A very small or zero delay does not fix queueing and can overload the phone system, so it is not the answer here."
      ]
    },
    {
      q: "Why does acknowledging an alarm by phone need the Gateway's public hostname set?",
      options: ["Twilio must call back into the Gateway to deliver the response", "Phones need a DNS name", "SMTP requires it", "It sets the alarm priority"],
      answer: 0,
      explain: [
        "Correct. Interactive acknowledgement needs Twilio to reach the Gateway, which is also why it needs security thought.",
        "Phones aren't the ones resolving the name.",
        "Email is unrelated to Twilio voice.",
        "Priority is set on the alarm."
      ]
    },
    {
      q: "When is a broadcast voice notification appropriate?",
      options: ["For critical alarms needing proof of acknowledgement", "For information-only messages where no inbound route or acknowledgement is needed", "Never", "Only for email"],
      answer: 1,
      explain: [
        "Broadcast calls skip PIN and acknowledgement.",
        "Correct. They suit informational calls when acknowledgement isn't possible or needed.",
        "They have a valid use.",
        "Broadcast is a voice option."
      ]
    }
  ],

  resources: [
    { title: "Pipeline Blocks (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/alarm-notification/alarm-notification-pipelines/pipeline-blocks", type: "docs", source: "Inductive Automation" },
    { title: "Notification Block (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/alarm-notification/alarm-notification-pipelines/pipeline-blocks/notification-block", type: "docs", source: "Inductive Automation" },
    { title: "Twilio Voice Notification (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/alarm-notification/notification-profile-types/twilio-notification-profiles/twilio-voice-notification", type: "docs", source: "Inductive Automation" },
    { title: "Alarming (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/alarming", type: "docs", source: "Inductive Automation" },
    { title: "Pipeline - Escalation (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/alarm-notification/alarm-notification-pipelines/pipeline-escalation", type: "docs", source: "Inductive Automation" },
    { title: "Pipeline - Escalation video", url: "https://inductiveuniversity.com/videos/pipeline-escalation/8.1", type: "video", source: "Inductive University" }
  ]
});
