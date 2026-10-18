LC.lesson({
  id: "ign-logix-driver",
  title: "The Logix driver in practice: tuning and bad-quality triage",
  track: "ign",
  minutes: 25,
  level: 3,
  prereqs: ["ign-devices", "plc-tags"],
  tags: ["logix", "driver", "ethernet-ip", "quality", "troubleshooting", "tuning"],
  summary: "How Ignition polls a ControlLogix or CompactLogix, which settings matter, and a step-by-step checklist for Bad_NotFound, Bad_NotWritable and Bad_Stale.",
  objectives: [
    "Choose the Logix driver instead of a legacy driver and configure hostname, slot and connection path correctly",
    "Explain what Max Concurrent Requests and CIP Connection Size change and why tuning them is a controlled experiment",
    "Relate tag groups and scan rates to controller communication load",
    "Diagnose Bad_NotWritable, Bad_NotFound and Bad_Stale/Bad_Timeout from their usual causes",
    "Run a repeatable triage checklist against PLC1 at 10.20.10.10"
  ],

  body: `
## Why this driver deserves a whole lesson

Almost every plant you will work in has Allen-Bradley controllers, and most of your tags will come through one driver: the {{term:ign-logix-driver|Logix driver}}. It is the same {{term:cip|CIP}} conversation you met in {{lesson:proto-enip}}, wrapped in Ignition's device and tag model. When it works, you never think about it. When a screen full of tags turns grey on a Friday afternoon, you need a mental model of what the driver is doing to the controller and a checklist that finds the cause in minutes.

## Which driver

Ignition ships several Allen-Bradley drivers. Pick by controller family and firmware.

| Controller | Driver | Notes |
|---|---|---|
| ControlLogix, CompactLogix 5380/5580, firmware v21 and later | **Allen-Bradley Logix Driver** | Optimized for v21 and later. Browses tags by name. This is your default. |
| Logix firmware older than v21 | Legacy Logix drivers | Works, slower. Check the manual for the right legacy driver. |
| Micro800 | Micro800 driver | Different driver and settings. Concurrency can raise throughput, with diminishing returns. |
| MicroLogix, SLC, PLC-5 | Legacy file-based drivers | Address by file (\`N7:0\`), not tag name. See {{lesson:plc-other-vendors}}. |

In the Gateway, create the device from the Config area under the device connections page and choose the Logix driver. The Inductive University video on the Logix v21+ driver walks through it.

## Connection settings that matter

**Hostname** is the IP of the controller (or of the Ethernet module you route through). For the house plant, PLC1 is \`10.20.10.10\` on VLAN 10. EtherNet/IP explicit messaging runs on TCP 44818.

**Slot and connection path.** A CompactLogix with a built-in port needs no path: the processor is the Ethernet device. For a ControlLogix, the Ethernet module (such as a 1756-EN2T) can sit in any slot and the processor in another, so you tell the driver where the processor is. The manual describes two ways:

- **Slot Number** is the zero-based chassis slot of the processor. Default zero.
- **Connection Path**, when set, overrides slot number. It is a list of hops that must end with the backplane and slot. The first number is a 1, meaning "step onto the backplane of the first device."

> [!example] Routing through a gateway module
> PLC2 sits in slot 3 of a chassis whose Ethernet module is at \`10.20.10.11\`. Hostname is \`10.20.10.11\`. Connection path is \`1, 3\`: backplane, then slot 3. If the processor is in slot 0 of the same chassis as the module, \`1, 0\` or the slot setting alone works. Cross-check against the {{term:backplane|backplane}} layout in the project's I/O tree.

**Advanced settings.** From the 8.1 manual (check your 8.3 page for current values): Automatic Rebrowse defaults to true, Identity Request Frequency to 5,000 ms, CIP Connection Timeout to 16,000 ms. The two settings people tune most are in the next section.

## Max Concurrent Requests and CIP Connection Size

The driver groups subscribed tags into read requests and sends them to the controller. Two settings shape that.

- **{{term:ign-request-concurrency|Max Concurrent Requests}}** is how many requests Ignition keeps in flight to this one device. The default is 2 (see FACTS).
- **{{term:cip-connection|CIP Connection Size}}** is the buffer size negotiated when the connection opens. The default is 500. Larger values pack more tags per request; sizes above the standard limit need {{term:large-forward-open|Large Forward Open}}, which the forum reports not every controller supports.

The documentation warns that raising concurrency too far can overwhelm the device. Forum reports disagree with each other: one user saw problems vanish moving from 2 to 4 concurrent requests; another saw overload rise. A report on a large L83 with about 14,500 subscribed tags dropped from 200 to 350 percent overload to about 2 percent by cutting concurrency from 6 to 1 and raising connection size from 500 to 4000. Another user found 4000 worse. These are anecdotes from different firmware and projects. The lesson is the method, not the numbers:

1. Record the baseline: device load factor, controller communication load, and how many tags are bad.
2. Change **one** setting.
3. Wait several scan cycles. Record again.
4. Keep the change only if the controller's own comms load stayed healthy.

## How tag groups and scan rates drive load

{{diagram:load}}

Load comes from three things you control: how many tags are subscribed, how fast, and how they are laid out in the controller.

- A tag is polled only when something subscribes to it (an open screen, an alarm, history, a script). Historian and alarm tags are always subscribed.
- Each {{term:ign-tag-group|tag group}} polls at its rate. A thousand tags on a 250 ms group costs far more than the same tags at 5 s. Forum threads warn that when requests cannot finish before the next cycle, you get timeouts.
- Related reads group better. Whole UDTs or arrays read in fewer requests than scattered atomic tags. The forum notes that very large UDTs should stay below the connection buffer size and that the driver cannot bulk-read AOIs, so a large AOI can cost more than its size suggests.

Do not confuse scan rate with {{term:rpi|RPI}}. RPI is how fast the controller exchanges I/O with a module on an I/O connection. Ignition's tag group rate is how often the driver asks the controller for values over explicit messaging. They share the controller's communications capacity, which is why a fast HMI poll plus many {{term:msg-instruction|MSG}} instructions can crowd out each other.

> [!tip] Split by need, not by habit
> Keep a small fast group (for example 250 ms) for the few tags an operator watches, a normal group (1 s) for process values and a slow group (5 to 10 s) for configuration and counters. Do not leave everything at the fastest rate because that is what the first tag used.

## Reading the diagnostics

On the device's status page in the Gateway, look at the connection state, the request statistics and the load figure (the {{term:ign-device-overload|device load factor}}). Around 100 percent means requests cannot finish within the time between polls. Also read the controller side. In Studio 5000 you can check communications load and, per forum advice, the Class 3 MSG task load, because high MSG load leaves little time to serve Ignition. Compare the two views before touching a setting.

## The three bad qualities

{{term:ign-quality-code|Quality codes}} tell you where to start. Use \`isGood()\`/\`isBad()\` in expressions and never compare to numbers (see FACTS).

### Bad_NotWritable

The write was refused. Check, in order:

1. **External Access in Logix.** In the tag properties in Studio 5000, {{term:external-access|External Access}} must be Read/Write for a writable tag. Read Only blocks writes. The 8.1 manual also says a tag must be Read Only or Read/Write to appear in the browse at all, so "None" tags are invisible.
2. **The Ignition tag's access setting.** The tag itself must allow read/write. One forum case was exactly this.
3. **Driver and firmware mismatch.** Forum replies note that newer firmware needs the matching driver.
4. **Just after an edit.** A re-browse in progress can fail writes briefly.

### Bad_NotFound

The driver asked for a name the controller does not have. Typical triggers:

- A tag, program or UDT member was renamed or deleted in Studio 5000. \`M101.Sts.Running\` becomes \`M101.Sts.IsRunning\` and every tag pointing at the old name goes Bad_NotFound.
- A path error in the Ignition tag: wrong program scope (\`Program:MainProgram.M101\` versus a controller-scope tag), wrong case in a copied path or an instance parameter that resolves to nothing.
- A UDT was changed and downloaded, and Ignition has not yet re-browsed. Automatic Rebrowse helps, but the tag can stay bad until the next browse completes.

Checking for Bad_NotFound separately from "bad" is useful in scripts, because it tells "tag doesn't exist" from "device is unavailable."

### Bad_Stale and Bad_Timeout

The value did not arrive in time. Look at the pattern.

| Pattern | Likely cause |
|---|---|
| Everything on one device goes stale together | Controller comms overloaded, network path broken or device connection faulted |
| Only the fast group is stale | Rate too aggressive for the number of tags. Requests do not finish before the next cycle |
| Random tags flicker stale under load | Too many tags in one rate, concurrency or connection size mismatch |
| Stale only after a download | Controller was in program mode or rebrowsing |

## Triage checklist for PLC1 (10.20.10.10)

Work top to bottom and stop when you find the cause.

1. **Is the device connected?** Gateway device page: status Connected or Faulted. If faulted, go to step 2. If connected, go to step 5.
2. **Can you reach it?** From an engineering workstation on VLAN 50, \`ping 10.20.10.10\`. See {{lesson:net-troubleshoot}}. No reply means a network, firewall or switch problem, not an Ignition problem.
3. **Is TCP 44818 open?** A firewall rule between the Gateway at \`10.20.30.10\` and VLAN 10 must allow it.
4. **Is the path right?** Hostname, slot and connection path match the chassis. A wrong slot gives a connection that never forms.
5. **Is it one tag or many?** One tag: read its quality and message. Bad_NotFound means check the name and scope. Bad_NotWritable means check External Access. Many tags: continue.
6. **Did anyone download or edit the project?** Check change logs. Wait for the rebrowse or trigger one.
7. **Check load.** Device load factor in Ignition, communication load in the controller. High on both means reduce the subscribed tags or slow the fast groups before touching driver settings.
8. **Check scan rates.** Which tag group are the bad tags in? How many tags does it hold?
9. **Tune one setting.** Only now change concurrency or connection size, using the experiment method above.
10. **Write down what you changed** so the next person is not guessing.

> [!warning] Do not "fix" overload by raising concurrency first
> More simultaneous requests onto an already saturated controller makes the problem worse. Reduce demand first: fewer subscribed tags, slower groups, better-grouped tags.
`,

  eli5: `
Imagine a librarian (the controller) and a very eager visitor (Ignition) who keeps asking for books. The visitor hands the librarian a slip of paper listing book names and asks for them all, again and again, every second.

If the visitor lists a few books once a second, the librarian is happy. If the visitor lists thousands of books every quarter-second, the librarian spends the whole day fetching and has no time for anyone else. Some requests come back late. Those are the stale ones.

Sometimes the visitor asks for a book by a name the library changed last week. The librarian says "never heard of it." That is the not-found problem. Sometimes the visitor tries to write in a book the librarian has marked "look, but do not write." That is the not-writable problem.

The settings are like how many slips the visitor can hand over at the same time, and how big each slip can be. Bigger slips and more slips sound faster, but only if the librarian can keep up. The sensible way to find out is to change one thing, watch how the librarian copes, then decide.
`,

  why: `
**Why not just poll everything fast?** Controllers have a finite communications budget shared with MSG instructions, other clients and I/O connections. The controller runs your logic first, and communications share what is left, so check the manual for how your model divides its time. An HMI that polls ten thousand tags at 250 ms is spending that budget on values nobody looks at. The cost of over-polling shows up in the controller, not in Ignition, which is why a graph of Gateway CPU can look fine while the PLC struggles.

**Why is tuning a controlled experiment?** Because the field evidence conflicts. Reasonable integrators have gotten opposite results from the same setting on different firmware, tag layouts and modules. Publishing a "magic" connection size would be false certainty. The defaults (2 concurrent, 500 bytes) are conservative because they are safe on every supported controller. Changing them is a bet you verify with load measurements, one change at a time.

**Why does External Access exist?** It lets the PLC programmer decide what the outside world may see or change. A plant that sets everything to Read/Write for convenience has handed every HMI, script and OPC client the ability to write any tag. Setting None or Read Only on internal state is a security and stability practice, and the cost is that Ignition tags to those members fail. Agree the external interface with the controls programmer at design time and document it in the FDS.

**Why do renames break tags?** Ignition stores tag references by name, as text. Logix is a name-resolved system, so renaming is an interface change. Integrators argue about whether to freeze names early or tolerate churn. Most settle on UDT interfaces that change by addition only, and a short change process that tells the SCADA side before a download.

**Why a checklist?** Because the symptoms overlap. Stale tags can be a cable, a firewall, an overloaded controller or a bad scan group. A fixed order turns a hunch into a diagnosis and creates evidence you can hand to the PLC programmer or network team.
`,

  history: `
Rockwell controllers have been programmed by tag name since ControlLogix replaced the file-based addressing of the PLC-5 and SLC families, and Ignition's current Logix driver follows that model. The Ignition documentation describes it as optimized for firmware v21 and later, with older firmware still working but more slowly. Legacy file-based drivers remain for MicroLogix, SLC and PLC-5.
`,

  examples: [
    {
      title: "A fast group takes down the Area10 faceplates",
      body: `At 14:05 every tag on the Area10 motor faceplates goes Bad_Stale. The device connection to PLC1 (\`10.20.10.10\`) is still Connected. The device load factor shows well over 100 percent. A recent change moved 800 tags into a 250 ms tag group. Moving them back to 1 s clears the load and the quality within a few polls. Concurrency and connection size were never touched.`
    },
    {
      title: "Bad_NotFound after a UDT edit",
      body: `The controls programmer renames \`UDT_MotorSts.Running\` to \`UDT_MotorSts.IsRunning\` and downloads. Every \`M101.Sts.Running\` tag reads Bad_NotFound while \`M101.Sts.Fault\` is fine. The fix is on the Ignition side: update the UDT definition member names, wait for the re-browse, and confirm the quality returns to Good. The lesson for the team is to announce renames before downloads.`
    },
    {
      title: "Bad_NotWritable on a start command",
      body: `A Start button writes \`M101.Cmd.Start\` and fails with Bad_NotWritable. In Studio 5000 the tag's External Access is Read Only. Setting it to Read/Write on the \`Cmd\` member (and leaving \`Sts\` Read Only) matches the house UDT design: HMI writes commands, the PLC owns status.`
    }
  ],

  diagrams: {
    load: `<svg viewBox="0 0 640 260" role="img" aria-label="Tag groups at different scan rates feed the Logix driver, which sends a limited number of concurrent requests to a controller that also serves MSG and I/O traffic">
  <defs><marker id="ign-logix-driver-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="30" width="150" height="44" rx="4"/>
  <text class="dg-text-sm" x="30" y="50">Group Fast 250 ms</text>
  <text class="dg-text-muted" x="30" y="66">few tags</text>
  <rect class="dg-box" x="20" y="88" width="150" height="44" rx="4"/>
  <text class="dg-text-sm" x="30" y="108">Group Normal 1 s</text>
  <text class="dg-text-muted" x="30" y="124">process values</text>
  <rect class="dg-box" x="20" y="146" width="150" height="44" rx="4"/>
  <text class="dg-text-sm" x="30" y="166">Group Slow 10 s</text>
  <text class="dg-text-muted" x="30" y="182">config, counters</text>
  <rect class="dg-box-accent" x="230" y="60" width="170" height="100" rx="6"/>
  <text class="dg-text dg-mid" x="315" y="88">Logix driver</text>
  <text class="dg-text-muted dg-mid" x="315" y="110">packs tags into requests</text>
  <text class="dg-text-muted dg-mid" x="315" y="128">Max Concurrent Requests</text>
  <text class="dg-text-muted dg-mid" x="315" y="146">CIP Connection Size</text>
  <line class="dg-line" x1="170" y1="52" x2="228" y2="90" marker-end="url(#ign-logix-driver-ah)"/>
  <line class="dg-line" x1="170" y1="110" x2="228" y2="110" marker-end="url(#ign-logix-driver-ah)"/>
  <line class="dg-line" x1="170" y1="168" x2="228" y2="132" marker-end="url(#ign-logix-driver-ah)"/>
  <rect class="dg-box" x="460" y="40" width="160" height="150" rx="6"/>
  <text class="dg-text dg-mid" x="540" y="66">PLC1 10.20.10.10</text>
  <text class="dg-text-muted dg-mid" x="540" y="94">program scan first</text>
  <text class="dg-text-muted dg-mid" x="540" y="116">comms shares spare time</text>
  <text class="dg-text-muted dg-mid" x="540" y="138">Ignition + MSG + I/O</text>
  <text class="dg-text-muted dg-mid" x="540" y="160">too much = Bad_Stale</text>
  <line class="dg-line-accent" x1="400" y1="110" x2="458" y2="110" marker-end="url(#ign-logix-driver-ah)"/>
  <text class="dg-text-muted" x="400" y="100">44818</text>
  <text class="dg-text-muted" x="20" y="232">Cost is rate times tag count. Reduce demand before raising concurrency.</text>
</svg>`
  },

  pitfalls: [
    "Raising Max Concurrent Requests or CIP Connection Size on an overloaded controller before reducing demand.",
    "Changing two driver settings at once, so nobody knows which one helped.",
    "Putting hundreds of tags in a 250 ms group because the first tag needed it.",
    "Renaming UDT members or tags in Studio 5000 without telling the SCADA team.",
    "Leaving External Access on Read Only for command members, then chasing Bad_NotWritable in Ignition.",
    "Setting External Access to Read/Write on everything so the HMI 'just works'.",
    "Setting CIP Connection Size above 500 on a controller that does not support Large Forward Open."
  ],

  keyTerms: ["ign-logix-driver", "ign-request-concurrency", "cip-connection", "large-forward-open", "ign-device-overload", "ign-connection-path", "ign-bad-notfound", "ign-bad-notwritable", "ign-bad-stale", "external-access", "ign-tag-group", "rpi"],

  quiz: [
    {
      q: "Every tag on PLC1 goes Bad_Stale, the device shows Connected, and the device load factor is far above 100 percent. What is the best first move?",
      options: ["Raise Max Concurrent Requests to 10", "Reduce subscribed tags or slow the fastest tag groups", "Re-enter the hostname", "Switch to a legacy driver"],
      answer: 1,
      explain: [
        "More simultaneous requests can make an overloaded controller worse.",
        "Correct. Reducing demand attacks the cause. Tune driver settings afterwards as a controlled experiment.",
        "The connection is working, so the address is not the issue.",
        "Legacy drivers are slower and not the answer to overload."
      ]
    },
    {
      q: "M101.Cmd.Start writes fail with Bad_NotWritable, but M101.Sts.Running reads fine. Which check is most likely to find the cause?",
      options: ["Ping the PLC", "The tag's External Access setting in Studio 5000", "The hostname", "The historian"],
      answer: 1,
      explain: [
        "Reads work, so the network path is fine.",
        "Correct. A Read Only (or restricted) External Access setting blocks outside writes while allowing reads.",
        "A wrong hostname would break reads too.",
        "The historian does not affect writes to a tag."
      ]
    },
    {
      q: "After a download, only tags under UDT_MotorSts.Running show Bad_NotFound. What happened?",
      options: ["The CIP connection size is too small", "A member was renamed or removed and Ignition still uses the old name", "The scan class is too fast", "The activation token expired"],
      answer: 1,
      explain: [
        "A small connection size would slow reads, not produce a not-found error for one member.",
        "Correct. Ignition references tags by name, so renamed members no longer resolve.",
        "A fast scan class produces stale or timeout quality, not not-found.",
        "Licensing does not affect tag resolution."
      ]
    },
    {
      q: "A ControlLogix at 10.20.10.11 has its Ethernet module in slot 1 and the processor in slot 3. How do you reach the processor?",
      options: ["Hostname of the processor, no path", "Hostname of the module with connection path 1, 3", "Hostname 10.20.10.11 and port 502", "Use Modbus"],
      answer: 1,
      explain: [
        "A processor behind a separate module has no IP of its own.",
        "Correct. The first 1 steps onto the backplane; 3 selects the slot.",
        "Port 502 is Modbus TCP. EtherNet/IP explicit messaging uses 44818.",
        "Modbus would be a different protocol with a different driver."
      ]
    },
    {
      q: "A forum post says setting CIP Connection Size to 4000 fixed one site's overload. What should you do on your site?",
      options: ["Copy it everywhere", "Treat it as one data point: baseline, change one setting, measure, keep or revert", "Never change defaults", "Set it to the maximum value"],
      answer: 1,
      explain: [
        "Other users report 4000 making things worse. Results vary by controller and firmware.",
        "Correct. Measure controller communication load and device load before and after.",
        "Defaults are conservative and sometimes should change, with evidence.",
        "Larger sizes need Large Forward Open and may overload the controller."
      ]
    },
    {
      q: "What is the difference between tag group rate and RPI?",
      options: ["They are the same setting", "Tag group rate is how often Ignition polls values; RPI is the rate of a controller I/O connection to a module", "RPI controls Ignition historian writes", "Tag group rate sets the scan time of the PLC"],
      answer: 1,
      explain: [
        "They live on different systems and use different connections.",
        "Correct. They share the controller's communications capacity but are configured separately.",
        "RPI is a controller I/O setting, unrelated to the historian.",
        "Program scan time is independent of the HMI poll rate."
      ]
    }
  ],

  resources: [
    { title: "Connecting to Logix (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/opc-ua/opc-ua-drivers/allen-bradley-ethernet/connecting-to-logix", type: "docs", source: "Inductive Automation" },
    { title: "Connecting to Logix v21+ video", url: "https://inductiveuniversity.com/videos/connecting-to-logix-v21/8.3", type: "video", source: "Inductive University" },
    { title: "Quality Codes and Overlays", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/tags/quality-codes-and-overlays", type: "docs", source: "Inductive Automation" },
    { title: "Ignition & Logix best practice tips for better communications", url: "https://forum.inductiveautomation.com/t/ignition-logix-best-practice-tips-for-better-communications/60386", type: "forum", source: "Inductive Automation Forum" },
    { title: "Device connection is overloading like crazy", url: "https://forum.inductiveautomation.com/t/device-connection-is-overloading-like-crazy/113500", type: "forum", source: "Inductive Automation Forum" },
    { title: "CIP Connection Size parameter", url: "https://forum.inductiveautomation.com/t/cip-connection-size-parameter/14681", type: "forum", source: "Inductive Automation Forum" },
    { title: "How does the Logix driver divide the tags into request counts", url: "https://forum.inductiveautomation.com/t/how-does-the-logix-driver-divide-the-tags-into-request-counts/67902", type: "forum", source: "Inductive Automation Forum" },
    { title: "Bad_NotWritable: the access level does not allow writing to the Node", url: "https://forum.inductiveautomation.com/t/bad-notwritable-the-access-level-does-not-allow-writing-to-the-node/59005", type: "forum", source: "Inductive Automation Forum" }
  ]
});
