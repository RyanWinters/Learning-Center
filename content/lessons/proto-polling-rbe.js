LC.lesson({
  id: "proto-polling-rbe",
  title: "Polling vs report-by-exception",
  track: "proto",
  minutes: 15,
  level: 3,
  prereqs: ["proto-modbus", "proto-mqtt"],
  tags: ["polling", "report-by-exception", "deadband", "bandwidth", "cellular", "stale-data"],
  summary: "Ask constantly, or speak only when something changes: the math, the dangers and the rule of thumb for choosing.",
  objectives: [
    "Compare the bandwidth and latency of polling and report-by-exception with real numbers",
    "Explain how a deadband trades data volume for resolution",
    "Describe how a consumer detects stale data when nothing is arriving",
    "Say why cellular and satellite SCADA moved to report-by-exception",
    "Name the cases where polling is still the right design"
  ],

  body: `
## Two ways to learn that a value changed

{{term:polling|Polling}} means the consumer asks for every value on a schedule, whether or not anything changed. {{term:report-by-exception|Report-by-exception}} (RBE) means the source sends a value only when it changes by a meaningful amount. {{lesson:proto-modbus}} is purely polled, since a Modbus device never speaks unless asked. {{lesson:proto-mqtt}}, {{lesson:proto-sparkplug}}, DNP3 event classes and BACnet change-of-value are RBE. Choosing between them decides your bandwidth bill, your alarm latency and how you detect a dead device.

## Worked example: 10,000 tags

Assume a remote site with 10,000 tags on a cellular modem. Both designs need a way to count bytes, so use these round numbers, which are realistic once headers and acknowledgments are averaged over batched messages:

- Polled read: about **20 bytes per tag per cycle** (request share, reply, header overhead, batched).
- RBE update: about **30 bytes per changed tag** (name or alias, value, timestamp, header share). It is larger per tag because each message carries a timestamp and identity.

{{diagram:compare}}

| | Polling at 1 s | RBE, 2% of tags change per second |
|---|---|---|
| Tags sent per second | 10,000 | 200 |
| Bytes per second | 10,000 x 20 = 200,000 (200 KB/s) | 200 x 30 = 6,000 (6 KB/s) |
| Bits per second | about 1.6 Mbit/s | about 48 kbit/s |
| Per day | about 17.3 GB | about 518 MB |
| Per 30 days | about 518 GB | about 15.5 GB |

RBE uses roughly **one thirty-third** of the data. Even if the break-even is closer, with 100% of tags changing, RBE would cost 1.5 times polling here because of the larger message. RBE wins only when most tags are quiet most of the time. Process data usually is, since a tank level, a setpoint or a pump state holds still for minutes.

### The latency side

Bandwidth is half the story. Polling 10,000 tags is not one request. A device might return 100 tags per request, so a cycle is 100 request/response pairs. On a link with a 100 ms round trip, if requests go one after another, one cycle takes **100 x 100 ms = 10 seconds**. The "1 second" poll is a wish, and the real update rate is 10 s. The worst-case delay for a changed value is then up to 10 s plus processing.

RBE latency is the time to detect the change at the source (its scan, perhaps 100 ms) plus one-way transit (roughly 50 ms), so about **150 ms**, and it does not grow with the total tag count. Only the number of changes matters.

> [!example] Alarm that matters
> A high-high pressure alarm on a remote pipeline site. Polled every 10 s over a slow link: worst case 10 s to notice, plus a second poll cycle if one request fails. With RBE or DNP3 unsolicited reporting: the event goes out within a fraction of a second of crossing the limit.

## Deadbands

If RBE sends on any change, a noisy analog signal that flickers in the last decimal place changes every scan, and you have rebuilt polling with more overhead. A **{{term:deadband|deadband}}** says "don't report unless the value moved by at least this much since the last reported value."

For a pressure of 100.0 PSI with a 0.5 PSI deadband, readings of 100.1, 100.3 and 99.8 are all silent. A reading of 100.6 triggers a report, and 100.6 becomes the new reference. Typical choices are 0.5 to 2% of span for process values. Counters and states use no deadband, since any change matters.

| Deadband | Effect |
|---|---|
| Too small | Noise creates traffic, little savings over polling |
| Too large | Trends look stair-stepped, small but real changes are hidden |
| Just right | Hides sensor noise, keeps everything an operator or historian would notice |

Many systems also add a **maximum interval** (a heartbeat, such as one report every 5 minutes even without change), so a quiet value still refreshes.

## Stale data: what silence means

In polling, a missing reply is obvious: the poll times out and the tag goes bad. In RBE, silence has two meanings, "nothing changed" and "the source is dead," and nothing in the silence tells you which. Defenses, from weakest to strongest:

1. **Heartbeat or maximum interval.** Every value or a status tag is republished at least every N seconds. A consumer that hears nothing for 2 to 3 intervals marks the tag stale.
2. **Connection state.** MQTT keep-alive and a {{term:last-will|Last Will}} message announce a vanished client.
3. **Explicit state messages.** Sparkplug's births and deaths, and DNP3's quality flags such as "communications lost," give each tag a defined state.
4. **Periodic full refresh.** DNP3's integrity poll or a Sparkplug rebirth resynchronizes the consumer, which repairs any lost event.

An RBE design with no stale detection is an accident waiting to happen. The screen shows a calm, flat, wrong number for hours.

## Why SCADA over cellular moved to RBE

Cellular and satellite links bill by the megabyte, have high and variable latency, and drop out. Early radio SCADA polled a few hundred points over a 1,200 baud radio, and had to. When sites moved to cellular modems with per-GB plans, the numbers above stopped being acceptable. A site that polled at 1 s could consume 500 GB in a month, which is more than most plans allow. Moving to RBE cut that by one to two orders of magnitude and also made alarm latency independent of site size. That is the reason for DNP3 unsolicited reporting in utilities and Sparkplug in newer designs.

## When polling is still right

- **Fast control loops and deterministic data.** A fixed cycle (like an EtherNet/IP implicit connection at 10 ms) gives a known, predictable update rate. See {{lesson:proto-enip}}.
- **Devices that only speak request/response.** Modbus meters and drives cannot do anything else. Poll them locally and apply RBE above them, at the gateway, so only the cellular hop is RBE.
- **Small tag counts on a fast LAN.** For 200 tags on gigabit Ethernet, bandwidth is irrelevant. Polling is simpler and has built-in stale detection.
- **Trend-quality data.** If a historian needs evenly spaced samples, a time-based sample is better than reconstructing them from exceptions.
- **Easy debugging.** A polled value has a timestamp from the consumer, which is easier to reason about than a source clock that might be wrong.

The pattern most integrators land on: **poll locally, report by exception across the expensive link.** The edge gateway talks Modbus or EtherNet/IP to devices at fixed rates, applies deadbands, and publishes changes upstream with a heartbeat.

> [!note] Ignition's subscription model
> Ignition tags are not polled by Vision or Perspective. The tag system subscribes to the OPC UA driver with a rate, and the driver polls the device at that rate. The OPC UA subscription itself only sends data that changed, subject to a deadband on analog values. So you have polling on the device side and RBE on the client side of one gateway.
`,

  eli5: `
Suppose you want to know when your friend's pizza is ready.

One way is to call the pizza shop every minute and ask, "Is it ready yet?" Most calls get the answer "no." The shop gets tired, your phone bill gets huge, and if the oven catches fire you still only find out on the next call.

The other way is to ask them to call you when it's ready. That's much cheaper, and you hear the moment it's done. But there's a catch. If you haven't heard anything, either the pizza isn't ready yet, or the shop lost your number. So you also agree they'll text "still cooking" every ten minutes. If ten minutes pass and you hear nothing, you know something is wrong.

You can also tell them "only call me if the pizza changes by a lot," so they don't ring you about every tiny temperature wobble. That rule is the deadband.
`,

  why: `
**Why RBE saves so much and still isn't free.** Most process values are quiet most of the time, so sending only changes cuts traffic by an order of magnitude or more. The price is that the consumer loses the free "no reply means a problem" signal that polling gives. Every RBE design has to put that signal back with heartbeats, wills or births. Designs that skip this are the ones where operators discover hours later that a value froze.

**Why deadbands are a political decision.** A deadband is a decision about how much truth you are willing to throw away. Operators, process engineers and the historian owner may disagree. Set deadbands per tag class (flow, temperature, level), document them, and review them with the process owner. A deadband applied at the edge cannot be recovered later. Data you did not send does not exist in the historian. See {{lesson:ign-historian}}.

**Why you often need both.** Field devices rarely speak RBE natively, so polling is the first hop. The architecture question is where the line between the two sits. Put it as close to the expensive link as possible, so you spend local, cheap bandwidth on polling and expensive bandwidth only on changes.

**Why latency is non-linear for polling.** Polling cycle time grows with tag count, link round-trip time and the number of requests. A design that works at 500 tags can quietly fail at 5,000. RBE latency depends on the change rate. A process upset, when many tags change at once, is exactly when RBE traffic spikes and can exceed link capacity. Size for the upset, not the average, and decide what you drop first.

**Why timestamps matter more in RBE.** Polled data is timestamped when it arrives. RBE data can arrive late after an outage, so the source timestamp is what makes a replayed history correct. This is why DNP3 and Sparkplug carry timestamps from the source.
`,

  history: `
Early SCADA was polled out of necessity: radios and leased lines were slow, remote units were simple and a master asked each in turn. As telemetry moved to more capable RTUs, protocols like DNP3 added event buffers so units could remember changes and report them. Satellite and cellular economics, and then MQTT's design for oil pipeline telemetry in 1999, pushed report-by-exception into the mainstream.
`,

  examples: [
    {
      title: "Sizing a cellular plan",
      body: `A site has 2,000 tags, 5% change per second on average, 30 bytes per update. Data rate: 2,000 x 0.05 x 30 = 3,000 B/s, about 259 MB per day or 7.8 GB per 30 days. A 10 GB plan fits on average, but a process upset where 40% of tags change for ten minutes adds 2,000 x 0.4 x 30 x 600 = 14.4 MB. That spike is small in volume and large in rate (24 KB/s), so check the modem's uplink and the broker's queue limits too.`
    },
    {
      title: "Choosing a deadband",
      body: `A 0 to 200 PSI transmitter with 0.25% noise. Span is 200 PSI, so noise is about 0.5 PSI. A deadband of 1 PSI (0.5% of span) removes noise and still reports any move the operator would care about. Add a 5-minute heartbeat so the historian shows a point at least every 5 minutes.`
    }
  ],

  diagrams: {
    compare: `<svg viewBox="0 0 640 230" role="img" aria-label="Polling sends a request and reply every cycle even when nothing changed; report by exception sends a message only at the moments a value changes">
  <text class="dg-title" x="20" y="24">Polling (every 1 s)</text>
  <line class="dg-line-thin" x1="20" y1="90" x2="620" y2="90"/>
  <rect class="dg-box" x="30" y="44" width="10" height="46"/>
  <rect class="dg-box" x="90" y="44" width="10" height="46"/>
  <rect class="dg-box" x="150" y="44" width="10" height="46"/>
  <rect class="dg-box" x="210" y="44" width="10" height="46"/>
  <rect class="dg-box" x="270" y="44" width="10" height="46"/>
  <rect class="dg-box" x="330" y="44" width="10" height="46"/>
  <rect class="dg-box" x="390" y="44" width="10" height="46"/>
  <rect class="dg-box" x="450" y="44" width="10" height="46"/>
  <rect class="dg-box" x="510" y="44" width="10" height="46"/>
  <rect class="dg-box" x="570" y="44" width="10" height="46"/>
  <text class="dg-text-sm" x="20" y="110">Every cycle carries every tag, changed or not.</text>
  <text class="dg-title" x="20" y="148">Report by exception (2% change)</text>
  <line class="dg-line-thin" x1="20" y1="214" x2="620" y2="214"/>
  <rect class="dg-box-accent" x="150" y="168" width="10" height="46"/>
  <rect class="dg-box-accent" x="390" y="168" width="10" height="46"/>
  <rect class="dg-box-alarm" x="510" y="168" width="10" height="46"/>
  <text class="dg-text-sm" x="170" y="190">change</text>
  <text class="dg-text-sm" x="410" y="190">change</text>
  <text class="dg-text-sm" x="530" y="190">alarm</text>
  <text class="dg-text-muted" x="20" y="228">Silence between messages needs a heartbeat to mean healthy.</text>
</svg>`
  },

  pitfalls: [
    "Applying RBE with no heartbeat or state message, so a dead source looks like a steady value.",
    "Setting a deadband so wide that trends look stair-stepped and small excursions vanish from the historian.",
    "Sizing the link for the average change rate and not for a process upset.",
    "Quoting a 1-second poll rate without calculating how long a full cycle takes on a high-latency link.",
    "Doing RBE at the edge and later wanting raw data the historian never received."
  ],

  keyTerms: ["polling", "report-by-exception", "deadband", "stale-data", "mqtt", "unsolicited-response"],

  quiz: [
    {
      q: "10,000 tags polled at 1 s cost about 200 KB/s. With 2% of tags changing per second and 30 bytes per update, RBE costs about:",
      options: ["600 B/s", "6 KB/s", "60 KB/s", "200 KB/s"],
      answer: 1,
      explain: [
        "That would be 20 tags changing, not 200.",
        "Correct. 10,000 x 2% = 200 updates, 200 x 30 B = 6,000 B/s.",
        "That would be 2,000 tags changing, or 20% of the tags.",
        "That is the polling figure. RBE sends only the changes."
      ]
    },
    {
      q: "A poll of 10,000 tags needs 100 requests on a link with 100 ms round trip, one at a time. How long is one cycle?",
      options: ["1 second", "About 100 ms", "About 10 seconds", "About 100 seconds"],
      answer: 2,
      explain: [
        "That is the intended rate, not what the link can deliver.",
        "That is one round trip, not 100 of them.",
        "Correct. 100 requests x 100 ms = 10 s, regardless of the 1 s target.",
        "That would need 1 s per request."
      ]
    },
    {
      q: "A level tag has been flat for two hours in an RBE system. What is the best evidence it is really flat?",
      options: [
        "The last value's timestamp is two hours old",
        "The device's connection is alive, confirmed by heartbeat or state messages",
        "The deadband is large",
        "The value is retained on the broker"
      ],
      answer: 1,
      explain: [
        "An old timestamp is also what a dead source looks like.",
        "Correct. Evidence of a live source distinguishes 'unchanged' from 'unknown'.",
        "A large deadband makes silence more likely and no more trustworthy.",
        "Retention stores the last value, and keeps a dead source's value looking current."
      ]
    },
    {
      q: "Which is a good reason to keep polling in a design?",
      options: [
        "The device is a Modbus meter that can only answer requests",
        "The link is a metered cellular modem",
        "There are 50,000 mostly static tags",
        "You want to avoid heartbeats everywhere"
      ],
      answer: 0,
      explain: [
        "Correct. Poll it locally, then apply RBE above the poll if the upstream link is expensive.",
        "Metered links are the strongest reason to use RBE.",
        "Mostly static tags at scale are where RBE saves the most.",
        "Polling avoids heartbeats, but that alone is a weak reason."
      ]
    },
    {
      q: "A pressure signal flickers by 0.2 PSI around 100 PSI and RBE is sending constantly. What helps?",
      options: ["Raise the poll rate", "Add a deadband larger than the noise", "Lower QoS to 0", "Remove the heartbeat"],
      answer: 1,
      explain: [
        "Faster polling captures more noise.",
        "Correct. A deadband larger than the noise suppresses reports unless the value really moves.",
        "QoS changes delivery guarantees and not how often reports are generated.",
        "Removing the heartbeat reduces little and hurts stale detection."
      ]
    }
  ],

  resources: [
    { title: "DNP3 Primer: operating modes and unsolicited responses", url: "https://www.dnp.org/Portals/0/AboutUs/DNP3%20Primer%20Rev%20A.pdf", type: "standard", source: "DNP Users Group" },
    { title: "Introducing the MQTT Protocol (MQTT Essentials part 1)", url: "https://www.hivemq.com/blog/mqtt-essentials-part-1-introducing-mqtt/", type: "article", source: "HiveMQ" },
    { title: "Sparkplug 3.0.0 specification (PDF)", url: "https://sparkplug.eclipse.org/specification/version/3.0/documents/sparkplug-specification-3.0.0.pdf", type: "standard", source: "Eclipse Sparkplug" },
    { title: "The Language of BACnet: objects, properties and services", url: "https://bacnet.org/wp-content/uploads/sites/4/2022/06/The-Language-of-BACnet-1.pdf", type: "standard", source: "BACnet International" }
  ]
});
