LC.lesson({
  id: "arch-remote-services",
  title: "Remote tag providers, historians and alarm journals",
  track: "arch",
  minutes: 25,
  level: 3,
  prereqs: ["arch-gateway-network", "ign-historian", "ign-alarming"],
  tags: ["remote-tag-provider", "historian", "alarm-journal", "store-and-forward", "gateway-network"],
  summary: "How one gateway uses another gateway's tags, history and alarm journal, and what actually happens to each of them when the link drops.",
  objectives: [
    "Set up the three remote services conceptually: tag provider, history provider, alarm journal",
    "Explain which of them buffer data during an outage and which do not",
    "Decide between a remote tag provider with local history and a remote historian",
    "Use Service Security on the owning gateway to allow reads, writes and storage",
    "Predict what operators and reports see when a link drops and recovers"
  ],

  body: `
## Why these three services

Most multi-gateway designs need the same three things to cross a gateway boundary: current values (tags), the past (history) and events (alarms). Ignition has a remote version of each. They all ride on the {{lesson:arch-gateway-network}}, and they all behave differently when the link drops. Knowing those differences is most of the skill. A design that looks fine on a diagram can lose a day of alarm events because someone assumed all three buffer the same way.

{{diagram:services}}

## Remote tag providers

A {{term:remote-tag-provider|remote tag provider}} lets a gateway browse and use another gateway's tags as if they were local. You create it in the tag provider configuration by choosing the Gateway Network type, then picking the remote gateway and the provider on it. The local gateway then shows the remote tag tree, and you can bind screens to \`[plantA]Line1/Motor1/Speed\` without knowing where the PLC really is.

What to know:

- **It is live, not stored.** Values come from the owning gateway on demand. The local gateway keeps nothing.
- **Access is set on the owner.** Service Security on the remote gateway decides whether other gateways get read-only or read/write access to that provider. If writes fail with a permission error, look there.
- **Quality tells the story.** If the link drops, every remote tag goes to bad quality (not "last value"). That is correct. A stale value shown as good would be a safety problem.
- **Cost.** Every tag subscribed through the provider is network traffic and load on the owner. Hundreds of screens subscribing to the same remote tags through many front-ends add up.

This is the mechanism behind scale-out. Front-ends use remote providers to read the back-ends. See {{lesson:arch-patterns}}.

## Remote history

Two different designs often get confused:

| Design | Where tags live | Where history is stored | Best for |
|---|---|---|---|
| **Remote tag provider + local history** | On the back-end | Gateway's own database, written by the back-end | Standard, scale-out: data is stored where it is collected |
| **Remote historian** (8.3) / remote history provider | On the back-end | Another gateway's historian, reached over the Gateway Network | Centralizing history from many sites in one place |

In 8.3 the **Remote Historian** connects to another gateway over the Gateway Network to read from or write to its history provider. If storing is allowed, the sending gateway sets up a {{term:store-and-forward|store-and-forward}} pipeline. Data is buffered locally (memory, then disk) when the destination is unreachable, and forwarded in order when it returns. The remote gateway's Service Security must explicitly permit storage to the named provider, or the writes are refused.

> [!note] In 8.1
> The 8.1 manual calls these Remote History Providers, and the Internal Historian has a Remote Sync setting. The 8.3 manual calls them Remote Historian and places the internal historian in the Historian Core module. The ideas are the same but menu names differ, so check the manual for your version.

Querying is separate from storing. A client on the hub can query a remote history provider through the Gateway Network, which means the hub shows a chart without owning the data. That is convenient for a few sites. For dozens of sites or heavy analytics, many integrators copy history into a central database instead, so the query load does not fall on the plant gateways.

**Store-and-forward is local to the sender.** A forum discussion makes this point that the buffer lives on the source gateway, not between gateways. If the source gateway itself is rebuilt before it forwards, buffered data on that machine goes with it.

## Remote alarm journals and notification

Alarm data also crosses gateways in two ways:

- **Remote alarm journal profile.** A gateway forwards its alarm events to a journal on another gateway. This is typical for hub-and-spoke where headquarters wants one searchable history of alarms. The remote profile has a **Use Store and Forward** option. When it is on, journal events go through store and forward. When it is off, events are written directly against the remote gateway, so an outage means missing rows.
- **Remote gateway notification.** A notification profile can use pipelines or hardware on another gateway (for example, one gateway with a modem or voice service for all sites). The Alarm Notification module must be installed and licensed on every gateway involved. The local gateway sees the remote pipelines and tags can target them directly.

Live alarm status is different from journal data. A status table on the hub that reads another gateway's active alarms is a live view and needs the link. The journal is a record.

> [!warning] Not every service buffers
> Tag history can be buffered. Remote tag values cannot, because they are live. Alarm journal buffering exists only if you turn on store and forward for that profile. Community reports of gaps in alarm journal data after an outage, while tag history filled in correctly, usually trace back to this difference. Test the drill, do not assume.

## What happens when the link drops

{{diagram:outage}}

| Service | During the outage | After the link returns |
|---|---|---|
| Remote tag provider | Remote tags bad quality; writes fail | Values resume. Nothing is back-filled |
| Remote historian (store enabled) | Sender buffers to its S&F cache | Buffered data forwards in order |
| Remote alarm journal (S&F on) | Events buffer on the sender | Events forward |
| Remote alarm journal (S&F off) | Events are lost for that period | Only new events are stored |
| Remote notification | Alarms queue for the remote pipeline per reports; verify in your build | Check notifications that were due during the gap |

The local plant keeps running through all of it, because local control and local alarms do not depend on the hub. That is the point of the architecture.

> [!example] Setting up a plant-to-HQ history flow
> 1. On HQ, make a history provider \`HQ_Hist\` backed by the HQ database.
> 2. On HQ, set Service Security so \`PLANT-A\` may store to \`HQ_Hist\`.
> 3. On PLANT-A, add a Remote Historian pointing at HQ's \`HQ_Hist\` with storage allowed.
> 4. Point the plant tags' history provider at that remote historian. Keep a local history provider too if the plant needs its own trends during outages.
> 5. Pull the network cable for 10 minutes. Confirm the gap fills when it is back.
`,

  eli5: `
Say your friend lives in another town and keeps a notebook of the weather, a diary of events, and a window they look out of.

A **remote tag provider** is like calling your friend and asking, "What's it doing outside right now?" They look out the window and tell you. If the phone line is down, you simply don't know. You can't guess from yesterday.

A **remote historian** is like asking your friend to also mail you their weather notebook pages. If the post office is closed for a day, your friend keeps the pages in a pile and sends them all when it reopens. Nothing is lost, it just arrives late.

A **remote alarm journal** is a diary of important events. If your friend has a "keep a pile if the post is down" rule, it works like the weather notebook. If they don't, any event written while the post was down never gets to you.

So the lesson is: ask which of the three has a pile, and make sure the pile rule is turned on.
`,

  why: `
**Why not just replicate everything?** Live values should never be copied into a store and shown later as if they were current. That is why remote tag providers go bad quality when the link breaks: it tells operators the truth. Anything that must survive a break (history, alarm events) has to be sent through a mechanism designed to buffer and retry.

**Why store at the source *and* centrally?** Plants want their own trends during an outage, and headquarters wants the cross-site view. The common compromise is for the plant gateway to keep local history and also forward a copy upward. It costs disk, and in exchange neither side depends on the other for its core job.

**Remote tag provider with local history, or remote historian?** Integrators argue about this. Local history keeps data close to the source, scales with the number of back-ends and queries fast. Remote historians centralize data without a separate ETL job, but make plant gateways dependent on one central store and put the sender's S&F disk on the critical path. A reasonable rule: use local history unless the business needs one place to query.

**Why Service Security matters more here.** A remote historian that can store anywhere, or a tag provider that anyone can write, is a mistake that shows up on an incident report. Be explicit on the owning gateway about who may read, write or store, and test it with a deliberately wrong gateway.

**Why drill the outage.** The failure modes are different by service. The only way to know your system's behavior is to unplug it during commissioning, with the customer watching.
`,

  examples: [
    {
      title: "Front-end writes fail after a security change",
      body: `A scale-out front-end shows a setpoint but writes silently fail. The back-end's Service Security for the \`default\` provider was set to read-only by a hardening checklist. Fix: set that provider's access to read/write for the front-end gateway only (not for all remote gateways), and verify with a write from a test screen.`
    },
    {
      title: "The missing alarm rows",
      body: `After a 3-hour WAN outage, HQ trends show full history for Plant B but the alarm journal has a hole. The remote alarm journal profile had Use Store and Forward off, so events went straight to HQ and failed. Enable it on the profile, accept that the 3 hours already lost cannot be recovered from HQ, and recover them from the plant's own local journal if one exists.`
    }
  ],

  diagrams: {
    services: `<svg viewBox="0 0 640 280" role="img" aria-label="A plant gateway exposes its tag provider, history and alarm journal over the Gateway Network to a central gateway, which uses them as remote tag provider, remote historian and remote alarm journal">
  <defs><marker id="arch-remote-services-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">Plant gateway (owner)</text>
  <text class="dg-title" x="400" y="26">Central gateway (user)</text>
  <rect class="dg-box" x="20" y="40" width="200" height="210" rx="6"/>
  <rect class="dg-box-2" x="36" y="56" width="168" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="120" y="83">Tag provider</text>
  <rect class="dg-box-2" x="36" y="114" width="168" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="120" y="141">History + S&amp;F</text>
  <rect class="dg-box-2" x="36" y="172" width="168" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="120" y="199">Alarm journal / pipelines</text>
  <rect class="dg-box" x="420" y="40" width="200" height="210" rx="6"/>
  <rect class="dg-box-accent" x="436" y="56" width="168" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="520" y="83">Remote tag provider</text>
  <rect class="dg-box-accent" x="436" y="114" width="168" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="520" y="141">Remote historian</text>
  <rect class="dg-box-accent" x="436" y="172" width="168" height="44" rx="4"/>
  <text class="dg-text-sm dg-mid" x="520" y="199">Remote alarm journal</text>
  <path class="dg-line" d="M204 78 L434 78" marker-end="url(#arch-remote-services-ah)"/>
  <path class="dg-line" d="M434 136 L206 136" marker-end="url(#arch-remote-services-ah)"/>
  <path class="dg-line" d="M434 194 L206 194" marker-end="url(#arch-remote-services-ah)"/>
  <text class="dg-text-muted dg-mid" x="320" y="70">live, on demand</text>
  <text class="dg-text-muted dg-mid" x="320" y="128">history stored via S&amp;F</text>
  <text class="dg-text-muted dg-mid" x="320" y="186">events (S&amp;F optional)</text>
  <text class="dg-text-muted dg-mid" x="320" y="270">Arrows show which side drives each flow. Service Security on the owner gates all three.</text>
</svg>`,
    outage: `<svg viewBox="0 0 640 220" role="img" aria-label="Timeline of a link outage: live tag values go bad during the gap, buffered history and alarm events are forwarded after the link returns, unbuffered alarm events are lost">
  <defs><marker id="arch-remote-services-ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-zone" x="230" y="30" width="180" height="150" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="48">Link down</text>
  <text class="dg-text-muted" x="20" y="48">Link up</text>
  <text class="dg-text-muted" x="440" y="48">Link restored</text>
  <text class="dg-text-sm" x="20" y="82">Remote tag values</text>
  <rect class="dg-box-ok" x="20" y="92" width="210" height="16" rx="3"/>
  <rect class="dg-box-alarm" x="230" y="92" width="180" height="16" rx="3"/>
  <rect class="dg-box-ok" x="410" y="92" width="210" height="16" rx="3"/>
  <text class="dg-text-sm" x="20" y="132">History (S&amp;F on)</text>
  <rect class="dg-box-ok" x="20" y="142" width="210" height="16" rx="3"/>
  <rect class="dg-box-warn" x="230" y="142" width="180" height="16" rx="3"/>
  <rect class="dg-box-ok" x="410" y="142" width="210" height="16" rx="3"/>
  <path class="dg-line-accent" d="M400 166 Q440 190 480 166" marker-end="url(#arch-remote-services-ah2)"/>
  <text class="dg-text-muted" x="440" y="198">buffered data forwards</text>
  <text class="dg-text-muted" x="20" y="198">Red = bad quality. Amber = buffered locally.</text>
</svg>`
  },

  pitfalls: [
    "Assuming remote tag values are buffered. They are live and go bad quality when the link breaks.",
    "Leaving Use Store and Forward off on a remote alarm journal profile and losing events in an outage.",
    "Giving every remote gateway read/write access to a tag provider instead of naming the ones that need it.",
    "Putting all plant history behind one central remote historian, then having plant trends depend on the WAN.",
    "Forgetting the Alarm Notification module must be installed and licensed on every gateway that uses a remote pipeline.",
    "Never testing the outage. The first real test should not be the customer's first real outage."
  ],

  keyTerms: ["remote-tag-provider", "remote-historian", "store-and-forward", "remote-alarm-journal", "service-security", "gateway-network", "historian", "stale-data"],

  quiz: [
    {
      q: "The WAN to a plant drops. What do remote tag provider tags show on the central gateway?",
      options: [
        "The last known value with good quality",
        "Zero",
        "Bad quality, because the values are live and cannot be fetched",
        "Values from the plant's historian"
      ],
      answer: 2,
      explain: [
        "Showing stale data as good would mislead operators. Ignition does not do this.",
        "Ignition does not substitute zero. Bad quality is the signal.",
        "Correct. Remote tag values are not stored on the central gateway, so they go bad quality when the link breaks.",
        "The provider does not fall back to history automatically."
      ]
    },
    {
      q: "A remote historian is configured with storage allowed, and the WAN is down for 2 hours. What happens to the plant's history rows?",
      options: [
        "They are lost",
        "They buffer in the sending gateway's store-and-forward cache and forward when the link returns",
        "They buffer on the receiving gateway",
        "They are written twice"
      ],
      answer: 1,
      explain: [
        "That would only be the case without store and forward, or if the cache overflowed.",
        "Correct. The buffer lives on the sender and forwards in order after reconnect.",
        "The receiving gateway can't hold data it never received.",
        "Duplicates are not the normal result of forwarding."
      ]
    },
    {
      q: "After an outage, history is complete but the HQ alarm journal has a gap. What is the first thing to check?",
      options: [
        "Whether the remote alarm journal profile has Use Store and Forward enabled",
        "Whether the tag deadband is set correctly",
        "Whether the historian module is licensed",
        "Whether Perspective sessions were active"
      ],
      answer: 0,
      explain: [
        "Correct. Without S&F, journal events are written straight to the remote and are lost if the link is down.",
        "Deadband affects tag logging, not alarm journal delivery.",
        "History worked, so the historian is fine.",
        "Sessions don't affect journal storage."
      ]
    },
    {
      q: "A front-end gateway can read a back-end tag but writes fail. Where do you fix this?",
      options: [
        "In Service Security on the back-end gateway that owns the provider",
        "In the front-end's Perspective session settings",
        "In the PLC's firmware",
        "In the load balancer"
      ],
      answer: 0,
      explain: [
        "Correct. The owning gateway decides the access level that remote gateways get on each provider.",
        "Session settings do not override provider security.",
        "The PLC is reachable by the back-end. The block is at the gateway permission layer.",
        "A load balancer routes sessions and does not grant tag permissions."
      ]
    },
    {
      q: "A plant needs its own trends during an outage and HQ needs a copy. Which design fits best?",
      options: [
        "Only a remote historian to HQ, no local history",
        "Local history at the plant, plus a forwarded copy to HQ",
        "Remote tag provider only",
        "Store history in the Perspective session"
      ],
      answer: 1,
      explain: [
        "With no local history, the plant's trends would depend on the WAN.",
        "Correct. Local history keeps the plant independent, and the forwarded copy gives HQ its cross-site view.",
        "Remote tag providers carry live values, not history.",
        "Sessions are temporary and are not a data store."
      ]
    }
  ],

  resources: [
    { title: "History Providers (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian/tag-history-providers", type: "docs", source: "Inductive Automation" },
    { title: "Historian (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/tag-historian", type: "docs", source: "Inductive Automation" },
    { title: "Remote Gateway Notification (8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/alarm-notification/notification-profile-types/remote-gateway-notification", type: "docs", source: "Inductive Automation" },
    { title: "Alarm Journal (8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/alarming/alarm-journal", type: "docs", source: "Inductive Automation" },
    { title: "Remote tag history provider vs remote tag provider + local history provider", url: "https://forum.inductiveautomation.com/t/remote-tag-history-provider-vs-remote-tag-provider-local-history-provider/91638", type: "forum", source: "Inductive Automation Forum" },
    { title: "How does store-and-forward work in a secondary (remote) gateway?", url: "https://forum.inductiveautomation.com/t/how-does-store-and-forward-work-in-a-secondary-remote-gateway/104792", type: "forum", source: "Inductive Automation Forum" },
    { title: "Remote Alarm Journal: keeping track of alarm events while disconnected", url: "https://forum.inductiveautomation.com/t/remote-alarm-journal-how-can-i-keep-track-of-alarm-events-while-disconnected/47860", type: "forum", source: "Inductive Automation Forum" }
  ]
});
