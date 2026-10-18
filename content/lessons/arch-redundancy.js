LC.lesson({
  id: "arch-redundancy",
  title: "Redundancy",
  track: "arch",
  minutes: 25,
  level: 3,
  prereqs: ["arch-gateway-network"],
  tags: ["redundancy", "failover", "high-availability", "master", "backup", "warm-standby"],
  summary: "Pairing two gateways so one takes over when the other fails: what gets synced, how fast the switch happens, and what redundancy does not protect.",
  objectives: [
    "Describe the master and backup roles and the active versus standby states",
    "Compare cold and warm standby and explain the failover time tradeoff",
    "List what syncs between the pair and what does not",
    "Explain how history modes and client failover behave during a switch",
    "Separate gateway redundancy from database high availability and design for both"
  ],

  body: `
## What redundancy is

An {{term:ignition|Ignition}} **redundant pair** is two gateways running the same project and configuration. One is **active** and does the work. The other watches it and takes over if it stops responding. The goal is to turn "the server died at 2 a.m." into "the system switched in a few seconds and someone looked at it in the morning."

Redundancy covers the **gateway**. It does not cover the PLC, the network, the SQL database or the plant. A system is only as available as its weakest single point, so this lesson ends with where else you need to look.

{{diagram:pair}}

## Roles and states

There are two things to keep apart.

- **Role** is configured and permanent: **master** or **backup**. The master normally owns the configuration. The Designer connects to the master, you change things there, and the changes flow to the backup.
- **State** changes at runtime: **active** (running the system) or **standby** (watching). Normally master is active and backup is standby. After a failover, the backup is active and the master is standby or offline.

The two gateways are joined by a {{lesson:arch-gateway-network}} connection on the backup. The backup sends pings to the master. When the master stops answering, the backup decides the master is faulted and takes responsibility.

## Cold, warm, and what the backup is doing

The **Standby Activity Level** setting determines how busy the standby gateway is.

| Level | Standby does | Failover speed | Cost |
|---|---|---|---|
| **Cold** | Connects to OPC servers but does not subscribe to tag values | Slower, since tags must subscribe and initialize at failover | Less load on devices and network |
| **Warm** | Runs like the active gateway, subscribing and evaluating, except it does not write to devices or log data | Faster | Doubles the polling load on your PLCs and servers |

Check the redundancy and upgrade guides for your version for IA's current advice on standby level when you patch a pair.

Make sure your PLCs and drivers can serve two clients at once before choosing warm. Some small devices cannot, which is a good reason to choose cold for those.

## What syncs and what does not

{{diagram:sync}}

| Synced from master to backup | Not synced (each gateway has its own) |
|---|---|
| Gateway configuration: tag providers, device connections, database connections, security settings | Gateway local settings tied to the machine (network interfaces, IP addresses, host names) |
| Projects and resources | Trust and approval for connections, which you verify on each machine |
| Tag configuration | Anything stored on the local disk outside the project, like custom files |
| Runtime state: live alarm state, so acknowledgements carry across, shared as changes after an initial full transfer | Database content (the database is a separate service) |
| Some history information, depending on history mode | Per-gateway edits you intentionally mark as backup-only |

Where the backup needs a different value from the master (a different device IP, a different database host), you add a **Backup version** of that resource. The manual says it is stored separately in its own file from the master's config. This is how you keep identical logic with different addresses.

Live alarm state is shared, using small differences after an initial full transfer. If the backup falls too far behind, it asks for a full transfer again.

> [!warning] "It synced" is not the same as "it works"
> Configuration sync does not prove the backup can reach the PLC, the database or the OPC server. Test the backup by failing over on purpose and operating the plant from it before go-live. Typical culprits: a firewall that only allowed the master's IP, a database user restricted to the master's host, a license activated for only one machine.

## Failover timing

Failover time is the sum of detection, takeover and recovery.

1. **Detection.** The backup pings the master on a schedule. When too many pings time out, it declares the master faulted. You tune this with the ping rate, ping timeout and maximum missed pings on the redundancy settings (the 8.3 setting names and defaults are on the redundancy page of the manual; look them up for your version). Smaller numbers mean faster detection and more false alarms. The manual warns that settings too tight for your network cause socket timeouts and repeated disconnects. In older 8.1 versions there was a separate Failover Timeout setting that was removed in 8.1.37.
2. **Takeover.** The backup becomes active. With warm standby, tag values are already subscribed, so this is quick. Cold must subscribe and initialize first.
3. **Recovery.** The recovery mode setting decides what happens when the master returns. In automatic recovery, the master takes back responsibility. In manual recovery, the backup stays active until you choose to switch (check the setting names in the manual for your version). Many integrators pick Manual for production so an unstable master cannot cause repeated switches in the middle of a shift.

Do not quote a single failover time to a customer. Measure on the real network, with real tag counts, and report a range.

A switch also affects things that run on the gateway. Running SFC charts stop with the gateway and do not simply resume where they were (see {{lesson:arch-sfc}}). EAM scheduled tasks depend on where the controller runs (see {{lesson:arch-eam}}). Perspective sessions on the failed node are lost, and clients reconnect to the active node as new sessions.

## Clients and history

**Clients.** Clients reconnect to whichever gateway is active, so plan the addressing (a shared name or both addresses) and test it. Client reconnect adds time on top of gateway failover. One forum report saw Perspective clients taking about a minute to switch even though the gateways had switched quickly, and the cause was the websocket idle timeout, not redundancy. Include the client in your test.

**History.** The **History Mode** on the backup decides how much it records.

- **Full**: the backup writes history to the database like the master.
- **Partial**: the backup caches history until the master returns, then reconciles (check the History Mode description in the manual for your version).

For the gaps between failover and recovery, check what you need: a continuous trend of key tags through the switch is a good commissioning test. Forum reports and release notes show that corner cases (for example, duplicate tag IDs after role reversal, or tags out of sync after failing back) have been fixed over the 8.1 and 8.3 releases. Keep the pair on a current patch release and read the notes.

## Redundancy is not high availability for the database

The pair of gateways shares one SQL database. If that database is down, history, alarm journals and anything that logs to SQL stops working, however well the gateways fail over. Ignition does not provide database redundancy. The historian database needs its own plan: a database cluster, an availability group, replication or a managed cloud service. Plan three layers: redundant gateways, a highly available database and redundant network paths (for example, ring topologies from {{lesson:net-topology}}).

> [!example] A failover test script
> 1. Note a trend and an alarm that is active. 2. Stop the Ignition service on the master. 3. Time how long until the backup reports active, and until a Perspective session shows live data. 4. Acknowledge the alarm on the backup and confirm state. 5. Write a setpoint and confirm the PLC accepted it. 6. Restart the master and watch recovery in the mode you chose. 7. Check the trend for a gap.
`,

  eli5: `
Think of a lifeguard tower with two lifeguards. Both of them know the same rules, have the same map of the pool and watch the same swimmers. Only one is on duty with the whistle, the other sits next to them and keeps watching.

If the lifeguard on duty faints, the second one notices (they were calling out to each other every second, and the calls stopped), picks up the whistle and carries on. If the second lifeguard has been watching closely the whole time ("warm"), they take over instantly. If they were dozing a bit ("cold"), they need a few seconds to catch up.

What gets passed along is the rules, the map and what's going on right now. What doesn't get passed along is the pool itself. If the pool is drained, two lifeguards don't help. In our system the "pool" is the database, and it needs its own backup plan.
`,

  why: `
**Why warm and cold both exist.** Warm gets you faster takeover but doubles the polling load on every PLC and OPC server, and some old devices cannot handle two masters. Cold is gentler on devices but slower. This is a real engineering tradeoff, not a default to accept. Ask what a few extra seconds cost the process versus what the doubled poll does to the weakest device.

**Why Manual recovery is common.** If the master's problem is intermittent (a flaky NIC, a failing disk), Automatic recovery can bounce control back and forth. Each switch risks a blip for operators. Manual recovery lets a person confirm the master is truly healthy and pick a quiet moment.

**Why not run everything redundant?** Because redundancy has costs: a second license, a second server, doubled polling in warm mode and added complexity. Reserve it for systems where downtime is expensive, and where the gateway is the likely failure. Often the correct answer is to make the weakest link (power, network, database) more robust first.

**The classic design mistake.** A redundant pair of gateways with a single database server and a single network switch gives the appearance of high availability and the reality of a single point of failure. Draw the full chain from sensor to screen and mark every single point.

**Redundancy versus scale-out.** They solve different problems. Redundancy protects against loss of a gateway. Scale-out adds capacity. Large systems use both: each back-end and front-end can be a pair. See {{lesson:arch-patterns}}.
`,

  history: `
The ping-based detection is the current model: the old Failover Timeout setting was removed in 8.1.37. In 8.3 the master owns the configuration, and a resource can carry a separate Backup version for the values that must differ on the standby node. Release notes across 8.1 and 8.3 list a steady series of redundancy fixes, which is a good reason to keep a pair on a current patch release.
`,

  examples: [
    {
      title: "A backup with its own addresses",
      body: `The Plant 1 master \`gw-a\` at 10.20.30.10 and backup \`gw-b\` at 10.20.30.11 both connect to PLC1 at 10.20.10.10 and the SQL server at 10.20.30.20. The database user was created with host \`10.20.30.10\` only. In the failover test, history stops writing on \`gw-b\`. The fix is to create the database user for both hosts. The sync copied the connection settings but not the permission on the database side.`
    },
    {
      title: "Choosing a standby level",
      body: `Plant with 40 Allen-Bradley PLCs and an old Modbus gateway that allows only two sessions. Warm standby doubles each connection and exhausts the Modbus gateway. You choose cold for the device connection that cannot handle two clients, accept a longer failover for that part, and test the result with operators.`
    }
  ],

  diagrams: {
    pair: `<svg viewBox="0 0 640 300" role="img" aria-label="A redundant pair: a master and backup gateway joined by a redundancy link, both connected to PLCs and a shared SQL database, with clients connecting to whichever is active">
  <defs><marker id="arch-redundancy-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="240" y="14" width="160" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="39">Clients</text>
  <rect class="dg-box-ok" x="60" y="100" width="190" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="155" y="128">Master (active)</text>
  <text class="dg-text-muted dg-mid" x="155" y="150">owns configuration</text>
  <rect class="dg-box-2" x="390" y="100" width="190" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="485" y="128">Backup (standby)</text>
  <text class="dg-text-muted dg-mid" x="485" y="150">warm or cold</text>
  <path class="dg-line-accent" d="M250 124 L388 124" marker-end="url(#arch-redundancy-ah)"/>
  <path class="dg-line-accent" d="M388 148 L252 148" marker-end="url(#arch-redundancy-ah)"/>
  <text class="dg-text-muted dg-mid" x="319" y="116">config + state sync</text>
  <text class="dg-text-muted dg-mid" x="319" y="166">pings</text>
  <path class="dg-line" d="M290 54 L180 100" marker-end="url(#arch-redundancy-ah)"/>
  <path class="dg-dash" d="M350 54 L460 100"/>
  <rect class="dg-box" x="60" y="230" width="190" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="155" y="260">PLCs / devices</text>
  <rect class="dg-box-warn" x="390" y="230" width="190" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="485" y="253">Shared SQL database</text>
  <text class="dg-text-muted dg-mid" x="485" y="270">needs its own HA</text>
  <path class="dg-line" d="M155 170 L155 230"/>
  <path class="dg-dash" d="M485 170 L485 230"/>
  <path class="dg-line" d="M200 170 L440 230"/>
  <path class="dg-dash" d="M440 170 L200 230"/>
</svg>`,
    sync: `<svg viewBox="0 0 640 250" role="img" aria-label="What synchronizes from master to backup: configuration, projects and live alarm state flow across; machine-local settings and the database do not">
  <defs><marker id="arch-redundancy-ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">Master</text>
  <text class="dg-title" x="470" y="26">Backup</text>
  <rect class="dg-box-accent" x="20" y="40" width="170" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="105" y="62">Gateway configuration</text>
  <rect class="dg-box-accent" x="20" y="84" width="170" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="105" y="106">Projects, tags</text>
  <rect class="dg-box-accent" x="20" y="128" width="170" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="105" y="150">Live alarm state</text>
  <rect class="dg-box-2" x="450" y="40" width="170" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="535" y="62">Gateway configuration</text>
  <rect class="dg-box-2" x="450" y="84" width="170" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="535" y="106">Projects, tags</text>
  <rect class="dg-box-2" x="450" y="128" width="170" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="535" y="150">Live alarm state</text>
  <path class="dg-line-accent" d="M190 57 L448 57" marker-end="url(#arch-redundancy-ah2)"/>
  <path class="dg-line-accent" d="M190 101 L448 101" marker-end="url(#arch-redundancy-ah2)"/>
  <path class="dg-line-accent" d="M190 145 L448 145" marker-end="url(#arch-redundancy-ah2)"/>
  <text class="dg-text-muted dg-mid" x="319" y="50">synced</text>
  <rect class="dg-box" x="20" y="186" width="170" height="40" rx="4"/>
  <text class="dg-text-sm dg-mid" x="105" y="203">IP, host name, certs</text>
  <text class="dg-text-muted dg-mid" x="105" y="219">local per machine</text>
  <rect class="dg-box" x="450" y="186" width="170" height="40" rx="4"/>
  <text class="dg-text-sm dg-mid" x="535" y="203">IP, host name, certs</text>
  <text class="dg-text-muted dg-mid" x="535" y="219">local per machine</text>
  <text class="dg-text-muted dg-mid" x="319" y="210">not synced</text>
</svg>`
  },

  pitfalls: [
    "Believing a synced configuration proves the backup can reach the PLC, OPC server and database. Test by failing over.",
    "Choosing warm standby for devices that cannot serve two clients.",
    "Setting ping timeouts so tight that the backup takes over during network blips.",
    "Using Automatic recovery with an unstable master, causing repeated switches.",
    "Leaving the SQL database as a single point of failure behind a redundant pair.",
    "Forgetting to test the client side. Gateway failover is quick, client reconnect is its own timer.",
    "Applying patches to both nodes at once instead of one after the other."
  ],

  keyTerms: ["redundancy", "master-gateway", "backup-gateway", "warm-standby", "cold-standby", "failover", "high-availability", "single-point-of-failure", "store-and-forward"],

  quiz: [
    {
      q: "The master has a PLC connection at 10.20.10.10. Your backup must reach the PLC at a different address on its own network. How do you handle that?",
      options: [
        "Edit the same device on both gateways by hand",
        "Disable synchronization",
        "Use cold standby",
        "Add a Backup version of that resource with the different address"
      ],
      answer: 3,
      explain: [
        "Manual edits on the backup get overwritten or drift, and defeat the purpose of synced configuration.",
        "Turning sync off makes the pair diverge and risks losing changes at failover.",
        "The standby level does not change which address the connection uses.",
        "Correct. A backup version of the resource overrides only the fields that must differ, and the rest still syncs from the master."
      ]
    },
    {
      q: "You need the fastest takeover, and your PLCs can handle two simultaneous clients. Which standby level?",
      options: ["Cold", "Manual", "Warm", "Partial"],
      answer: 2,
      explain: [
        "Cold must subscribe tags and initialize at failover, so it is slower.",
        "Manual is a recovery mode, not a standby level.",
        "Correct. Warm runs like the active node except for writing to devices and logging, so takeover is quick.",
        "Partial is a history mode."
      ]
    },
    {
      q: "A redundant pair fails over perfectly, but history stops logging. The database server crashed. What is the lesson?",
      options: [
        "Gateway redundancy does not provide database availability. The database needs its own HA plan",
        "Warm standby should have been used",
        "The ping rate was too slow",
        "Perspective sessions should reconnect faster"
      ],
      answer: 0,
      explain: [
        "Correct. Both gateways share the database, so it is a separate single point of failure.",
        "Standby level affects gateway failover speed, not database availability.",
        "Ping settings affect gateway detection time and not database behavior.",
        "Client reconnect timing is unrelated to the database."
      ]
    },
    {
      q: "Why might an integrator choose Manual recovery mode in production?",
      options: [
        "It makes failover faster",
        "It prevents an unstable master from taking control back and forth, so a person decides when to switch back",
        "It disables history",
        "It is required for warm standby"
      ],
      answer: 1,
      explain: [
        "Recovery mode governs what happens after the master returns, not the speed of the first failover.",
        "Correct. Controlled switch-back avoids repeated blips for operators when the master is flaky.",
        "History mode controls history. Recovery mode does not.",
        "Manual recovery is independent of the standby level."
      ]
    },
    {
      q: "In a failover test the backup becomes active in 5 seconds, but Perspective operators see stale screens for about a minute. Where do you look first?",
      options: [
        "The redundancy ping rate",
        "The SQL query cache",
        "The Designer connection",
        "Client reconnect behavior such as the websocket idle timeout"
      ],
      answer: 3,
      explain: [
        "Ping rate affects how fast the backup detects the master failure, and the gateway already switched in 5 seconds.",
        "Query caching does not hold screens stale for a minute after a gateway switch.",
        "The Designer only connects to the master and is not involved with operator sessions.",
        "Correct. Client reconnect is a separate timer, and forum reports trace slow client switching to the websocket idle timeout."
      ]
    },
    {
      q: "Which of these is NOT synced from master to backup?",
      options: [
        "Projects and tag configuration",
        "Live alarm state",
        "The machine's own IP address and host name",
        "Device connection settings"
      ],
      answer: 2,
      explain: [
        "Projects and tags are part of what the backup mirrors.",
        "Live alarm state is shared so acknowledgements carry across a failover.",
        "Correct. Each machine keeps its own network identity.",
        "Device connection configuration syncs, with Backup versions available for differences."
      ]
    }
  ],

  resources: [
    { title: "Ignition Redundancy (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/ignition-redundancy", type: "docs", source: "Inductive Automation" },
    { title: "Setting Up Redundancy (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/ignition-redundancy/setting-up-redundancy", type: "docs", source: "Inductive Automation" },
    { title: "How Redundancy Works (Inductive University)", url: "https://inductiveuniversity.com/videos/how-redundancy-works/8.3", type: "video", source: "Inductive University" },
    { title: "Setting Up Redundancy (Inductive University)", url: "https://inductiveuniversity.com/videos/setting-up-redundancy/8.3", type: "video", source: "Inductive University" },
    { title: "Upgrading or Patching a Redundant Ignition Pair", url: "https://support.inductiveautomation.com/hc/en-us/articles/360047136192-Upgrading-or-Patching-a-Redundant-Ignition-Pair", type: "article", source: "Inductive Automation Support" },
    { title: "Slow failover with redundancy", url: "https://forum.inductiveautomation.com/t/slow-failover-with-redundancy/106660", type: "forum", source: "Inductive Automation Forum" },
    { title: "Ignition Database - Redundancy Options", url: "https://forum.inductiveautomation.com/t/ignition-database-redundancy-options/53693", type: "forum", source: "Inductive Automation Forum" }
  ]
});
