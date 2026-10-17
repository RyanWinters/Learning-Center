LC.lesson({
  id: "db-operations",
  title: "Backups, high availability and database security",
  track: "db",
  minutes: 20,
  level: 3,
  prereqs: ["db-intro", "net-security"],
  tags: ["backup", "recovery", "high-availability", "security", "least-privilege", "purdue", "operations"],
  summary: "How to keep the plant database alive, recoverable and locked down: backup types, RPO and RTO, restore tests, HA options in plain words, and what the Ignition DB user should be allowed to do.",
  objectives: [
    "Describe full, differential and transaction log backups and say what each lets you recover",
    "Choose a recovery model and explain what it costs you",
    "Turn a business requirement into an RPO and an RTO and pick a backup schedule that meets it",
    "Explain failover clustering, Always On availability groups and replication in plain words",
    "Create a least-privilege database account for Ignition and place the database correctly on the Purdue model",
    "Set up monitoring so historian growth does not fill the disk"
  ],

  body: `
## Why this is your problem

When the plant database goes down, the effects arrive fast. Operators can't pull up history, reports go blank, an MES stops recording production, and Ignition's store-and-forward buffer starts to fill. When the database is *lost*, the damage is worse: months of production runs, downtime reasons and quality data gone. Integrators who build the system are often the only people who ever think about how it recovers. Do not leave it to chance, and do not assume IT is backing it up. Ask.

This lesson uses SQL Server for specifics, because it is common in plants and Microsoft documents the concepts well. PostgreSQL and MySQL have the same ideas under different names.

## Backups

A **backup** is a copy of the database that you can restore from. There are three kinds you will meet.

| Type | What it holds | Size | Restore needs |
|---|---|---|---|
| **Full** | Every page of data plus enough log to make it consistent | Biggest | Just itself |
| **Differential** | Everything changed since the last full | Grows each day until the next full | The last full plus the latest differential |
| **Transaction log** | The log records since the previous log backup | Small, taken often | Full, then the differential if any, then every log in order |

Microsoft's [backup overview](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-overview-sql-server?view=sql-server-ver17) covers these. SQL Server has no true "incremental"; the log backup is the closest thing.

{{diagram:timeline}}

A common schedule for a plant database:

- Full backup Sunday at 02:00.
- Differential every night at 02:00.
- Log backup every 15 minutes.

### Recovery models

A database's {{term:recovery-model|recovery model}} decides how much of the transaction log is kept and so what you can restore.

| Model | Log backups | Point-in-time restore | Typical use |
|---|---|---|---|
| **Simple** | Not supported; log is reused automatically | No, only to the time of a full or differential backup | Test systems, data you can regenerate |
| **Full** | Required, or the log grows forever | Yes, to any moment covered by the logs | Production databases |
| **Bulk-logged** | Supported | Not for periods containing bulk operations | Temporary use during big loads |

Details are in Microsoft's [recovery models page](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/recovery-models-sql-server?view=sql-server-ver17).

> [!warning] The classic trap
> A database in the **full** recovery model with *no log backups* never frees its log. The log file grows until the disk is full and every write fails. Many plant databases hit this a year after commissioning, when the original integrator's maintenance job was never carried over. If nobody backs up the log, use the simple model, or do the log backups.

PostgreSQL's equivalent is WAL archiving plus base backups for point-in-time recovery. MySQL uses full dumps or physical backups plus binary logs.

## RPO and RTO

Two numbers turn "we need good backups" into a design.

- {{term:rpo|RPO}} (recovery point objective): how much data you can afford to lose, measured in time. An RPO of 15 minutes means that after a failure you may lose the last 15 minutes of data.
- {{term:recovery-time-objective|RTO}} (recovery time objective): how long the system may be down. An RTO of 2 hours means you must be running again within two hours.

Ask the plant manager both questions and write the answers down. They are business decisions with a price.

| Requirement | What it implies |
|---|---|
| RPO 24 h, RTO 1 day | Nightly full backup to a different machine is enough |
| RPO 15 min, RTO 4 h | Full + differential + 15-minute logs, with a tested restore procedure |
| RPO near zero, RTO minutes | A second server kept continuously in sync, with automatic failover |

Backups on their own can't give you a near-zero RPO. That needs high availability, below.

> [!example] Worked example
> The plant database holds production and downtime data. The plant says losing a shift is acceptable but losing a day is not (RPO 8 h) and can run on paper for half a day (RTO 12 h). A nightly full backup meets RPO only if nothing is lost before 02:00 the next night, which is a 24-hour exposure. So add log backups every hour. Worst-case loss is now about an hour, comfortably inside 8 hours, and a restore of the weekend full, the latest differential and a day of logs fits inside 12 hours if you rehearsed it.

### Test the restore

A backup nobody has restored is a hope. Restores fail for dull reasons: the backup job wrote to a disk that was itself lost, the log chain has a gap, the encryption key is missing, the person who knows the procedure left. At least twice a year:

1. Restore the latest full, differential and logs to a *different* server or a scratch instance.
2. Run a few checks, such as the row count of \`production_run\` and the newest \`downtime_event\` timestamp.
3. Time it. That is your real RTO.
4. Write down the steps, and the credentials location, where the next person will find them.

Also keep **offsite or offline copies**. A ransomware attack that encrypts the database server will encrypt backups mounted on the same network share.

> [!note] Ignition's own backup
> The Ignition gateway backup (.gwbk) saves projects, tags and gateway configuration, including the database *connection settings*. It does not contain the data in your database. You need both.

## High availability in plain words

Backups protect against loss. {{term:high-availability|High availability}} (HA) protects against *downtime* by keeping a second copy ready. The common options:

| Option | Plain description | Notes |
|---|---|---|
| **Failover cluster** (SQL Server FCI, Windows failover clustering) | Two servers share one set of storage. If server A dies, server B takes over the same data. | Protects against server failure, not storage failure. Needs shared storage. |
| **{{term:always-on-ag|Always On availability group}}** (SQL Server) | Each server keeps its own copy of the database. The primary sends log records to one or more secondaries, which can fail over automatically if synchronous. | Protects against server and storage loss. Needs Enterprise licensing for full features. |
| **Replication / streaming replica** (PostgreSQL streaming replication, MySQL replication) | A standby follows the primary by replaying its changes. Promote the standby if the primary fails. | Asynchronous replicas can lose the last few seconds. |
| **Virtual machine HA** (vSphere HA, Hyper-V clustering) | The VM restarts on another host if its host dies. | Simplest and the most common in plants. Downtime of a few minutes. |
| **Backup + warm standby** | Restore the latest logs onto a standby server regularly | Cheap, manual failover |

Words you'll hear: **synchronous** means a write is not confirmed until the second copy has it, so nothing is lost but writes are slower. **Asynchronous** confirms right away and may lose a moment of data. **Failover** is switching to the standby. **Split brain** is when both servers believe they are primary, which is why clusters use a witness or quorum to decide.

> [!tip] Ignition helps you
> Ignition's store-and-forward on database connections and the Tag Historian buffers data on disk while the database is unreachable and flushes it when it returns. A few minutes of database downtime costs you no history as long as the gateway's buffer has room. Many plants find that, plus a VM with HA, is enough, and skip clustering entirely. Size the buffer for the longest outage you accept.

HA is not a backup. A bad \`DELETE\` replicates to the standby in milliseconds.

## Security: the Ignition database user

Ignition connects to the database as a single account. What that account may do is your biggest security decision. {{term:least-privilege|Least privilege}} means giving it only what it needs.

| Account | Rights |
|---|---|
| Wrong | \`sa\`, \`postgres\`, or \`db_owner\` on every database, shared with the DBA |
| Better | A dedicated login per Ignition connection, owner of one database only |
| Best | Separate accounts by job: one read-write for the historian and groups, one read-only for reporting and Perspective queries, one with EXECUTE on specific procedures |

Practical rules:

- **One service account per application.** Don't share the Ignition login with the MES, BI tools or analysts. When something misbehaves, you want to know whose account it was.
- **Read-only where possible.** Analysts and report tools get SELECT on views, not on base tables.
- **No schema changes at runtime.** The Ignition historian needs to create partition tables, so give it CREATE rights in its own database or schema, but keep it away from the business schema. Run migrations with a separate admin account.
- **Strong, unique passwords stored once**, in the Ignition connection setup and a password manager, not in a script or a spreadsheet.
- **Use encrypted connections** (TLS) between the gateway and the database wherever the driver supports it.
- **Disable or lock down default accounts**, and turn on auditing of failed logins.
- **Patch.** Database servers are targets. Include them in the maintenance calendar.

A minimal SQL Server example for a reporting account:

\`\`\`sql
CREATE LOGIN ignition_reports WITH PASSWORD = '********';
USE PlantDB;
CREATE USER ignition_reports FOR LOGIN ignition_reports;
GRANT SELECT  ON v_downtime_report TO ignition_reports;
GRANT SELECT  ON v_production_summary TO ignition_reports;
GRANT EXECUTE ON sp_close_downtime TO ignition_reports;
\`\`\`

See {{lesson:db-procs}} for why views and procedures make this easier.

## Where the database goes on the Purdue model

The {{term:purdue-model|Purdue model}} puts plant control at Levels 0 to 2, site operations (SCADA, historians, MES) at Level 3, and business systems at Levels 4 to 5, with a {{term:dmz|DMZ}} between OT and IT. See {{lesson:found-purdue}} and {{lesson:net-security}}.

{{diagram:placement}}

- A database used only by Ignition and the plant's MES normally sits at **Level 3**, on the OT side, in a server VLAN behind a firewall.
- Allow only the Ignition gateway(s) and named admin hosts to reach the database port (1433 for SQL Server, 5432 for PostgreSQL, 3306 for MySQL).
- If the enterprise needs the data, **do not open a hole from IT into Level 3**. Replicate or push a copy into the DMZ or the IT side, or have the Level 3 system push outward. Direct inbound connections from corporate to a production database are a classic audit finding.
- If the database lives in the cloud, the connection should be outbound from OT, via a controlled path, not inbound.
- Don't put plant databases on the PLC network. A SQL Server on a control network is a patching and malware problem next to the controllers.

## Watch the disk

Historian data grows quietly. Ten thousand tags at one stored value per second is roughly 864 million rows a day before compression or deadband. Even with deadband, a busy plant adds gigabytes weekly. Disk-full is the most common cause of a database outage, and it often takes the transaction log down first.

Monitor, and alert on:

1. **Free space** on the data, log and backup volumes (warn at 20 percent, page at 10 percent).
2. **Database and log file size** growth per week. Plot it, and project the date you run out.
3. **Largest tables**, which are almost always the historian partitions (named like \`sqlt_data_1_2026_10\`) and any raw event tables.
4. **Backup job success** and the age of the last good backup.
5. **Log backup age**, so a stuck log chain is caught the same day.

Control growth on purpose. Set a retention policy in the Tag Historian, which prunes old partitions, and decide what to roll up (hourly averages) before deleting raw rows. Cover this in {{lesson:db-timeseries}}. For Ignition's own database connections, the gateway status pages show connection state and store-and-forward queue size, so alarm on those as well.

> [!warning] Don't let the log fill the disk
> Put data files, log files and backups on separate volumes. A runaway log can then fill only its own disk, and backups don't compete with the database for space.
`,

  eli5: `
Think of the database as the plant's filing cabinet of everything that has happened.

A **backup** is a photocopy of the cabinet. You make a full copy every week, a "what changed since" copy every night, and a running diary of every new page every fifteen minutes. If the cabinet burns, you rebuild it from the copy and replay the diary.

**RPO** is how many minutes of diary you can afford to lose. **RTO** is how long you can stand not having a cabinet. If the answer is "not even a minute", you keep a second cabinet in another room that copies every page as it arrives. That is high availability. If somebody shreds a page, the second cabinet shreds it too, which is why you still need photocopies.

Security is about keys. The person who restocks the cabinet should have a key for one drawer, not the master key to the building. And you check that the photocopies actually read, by trying one before the fire.
`,

  why: `
**Why test restores?** Because the failure you meet is never the one you planned for. Backup software reports success while writing an unreadable file; a log chain breaks after someone switches the recovery model for a bulk load; the encryption key was on the dead server. A timed restore drill is the only evidence that the RTO you promised is real. Integrators who skip it learn the number during an outage.

**Why not just buy HA?** Cost, complexity and a false sense of safety. Clusters add moving parts that fail in their own ways (split brain, a patch that breaks one node, a witness that goes missing). HA also copies mistakes instantly. Many plants do better with a VM on a hypervisor cluster, tested backups, and Ignition's store-and-forward to cover short outages. Match the spend to the RTO the plant actually needs, not the one that sounds good.

**Why least privilege on the Ignition account?** The gateway holds that password, and the gateway is reachable from many places. If the account is \`sa\`, anyone who compromises a project script, a named query with injectable SQL or a stolen gateway backup owns the whole server and can encrypt the backups. A narrow account turns a catastrophe into a nuisance. The counterargument is convenience: the historian needs to create tables, and tight permissions break at 3 a.m. when a new partition is due. The usual compromise is broad rights in the historian's own schema and narrow rights everywhere else.

**Why does the Purdue placement matter?** Most industrial intrusions travel through allowed paths. A database reachable from the corporate network gives an attacker a route into OT through a trusted protocol. Keep the production database at Level 3, and move data outward through a controlled one-way path.

**What do integrators argue about?** How much of this to do themselves. Some shops hand the database to corporate IT with an SLA. That's reasonable only if IT understands that the plant database can't be rebooted at will and that SCADA has a store-and-forward limit. Write the maintenance windows and the RPO/RTO into the contract.
`,

  history: `
The three-level backup scheme (full, differential, log) comes from enterprise relational databases of the 1990s, when disks were small and backup windows were short. Always On availability groups arrived in SQL Server 2012, building on database mirroring from SQL Server 2005. PostgreSQL added built-in streaming replication in version 9.0. OT networks adopted these tools later than IT, because plants valued uptime over change, which is why many sites still run on one aging database VM with a nightly backup.
`,

  examples: [
    {
      title: "Log full, writes failing",
      body: `Eleven months after commissioning, Ignition's status page shows the database connection faulted and store-and-forward is filling. The SQL Server's D: drive is at 100 percent. The cause is a 180 GB log file. The database was left in the full recovery model, and the nightly job only took full backups. The fix: take a log backup right away to free the log space, move the log to a larger volume, then schedule log backups every 15 minutes and alert on log age. The data is safe because the buffer flushed once the connection returned.`
    },
    {
      title: "A reporting account for Power BI",
      body: `The enterprise wants dashboards of downtime. Rather than hand over the Ignition login, the integrator creates \`powerbi_ro\` with SELECT on \`v_downtime_report\` and \`v_production_summary\` only. The firewall rule allows TCP 1433 from the DMZ reporting server alone. If the credentials leak, the attacker can read two views and can't touch \`production_run\`.`
    }
  ],

  diagrams: {
    timeline: `<svg viewBox="0 0 640 230" role="img" aria-label="A week of backups: a full backup on Sunday, differentials each night, and frequent log backups. A failure at Thursday 14:20 is recovered by restoring the full, the Thursday differential, then log backups.">
  <defs><marker id="dbo-ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <line class="dg-line" x1="30" y1="110" x2="610" y2="110" marker-end="url(#dbo-ah)"/>
  <text class="dg-text-sm" x="30" y="134">Sun</text><text class="dg-text-sm" x="130" y="134">Mon</text><text class="dg-text-sm" x="230" y="134">Tue</text><text class="dg-text-sm" x="330" y="134">Wed</text><text class="dg-text-sm" x="430" y="134">Thu</text>
  <rect class="dg-box-accent" x="26" y="56" width="22" height="44" rx="3"/>
  <text class="dg-text-sm" x="22" y="48">FULL</text>
  <rect class="dg-box" x="126" y="72" width="22" height="28" rx="3"/>
  <rect class="dg-box" x="226" y="68" width="22" height="32" rx="3"/>
  <rect class="dg-box" x="326" y="64" width="22" height="36" rx="3"/>
  <rect class="dg-box" x="426" y="60" width="22" height="40" rx="3"/>
  <text class="dg-text-sm" x="126" y="48">DIFF</text>
  <line class="dg-line-thin" x1="60" y1="96" x2="60" y2="104"/><line class="dg-line-thin" x1="75" y1="96" x2="75" y2="104"/><line class="dg-line-thin" x1="90" y1="96" x2="90" y2="104"/><line class="dg-line-thin" x1="105" y1="96" x2="105" y2="104"/>
  <line class="dg-line-thin" x1="160" y1="96" x2="160" y2="104"/><line class="dg-line-thin" x1="175" y1="96" x2="175" y2="104"/><line class="dg-line-thin" x1="190" y1="96" x2="190" y2="104"/><line class="dg-line-thin" x1="205" y1="96" x2="205" y2="104"/>
  <line class="dg-line-thin" x1="260" y1="96" x2="260" y2="104"/><line class="dg-line-thin" x1="275" y1="96" x2="275" y2="104"/><line class="dg-line-thin" x1="290" y1="96" x2="290" y2="104"/><line class="dg-line-thin" x1="305" y1="96" x2="305" y2="104"/>
  <line class="dg-line-thin" x1="360" y1="96" x2="360" y2="104"/><line class="dg-line-thin" x1="375" y1="96" x2="375" y2="104"/><line class="dg-line-thin" x1="390" y1="96" x2="390" y2="104"/><line class="dg-line-thin" x1="405" y1="96" x2="405" y2="104"/>
  <line class="dg-line-thin" x1="460" y1="96" x2="460" y2="104"/><line class="dg-line-thin" x1="475" y1="96" x2="475" y2="104"/>
  <line class="dg-line-alarm" x1="490" y1="70" x2="490" y2="116"/>
  <text class="dg-text-sm" x="446" y="58">failure</text>
  <text class="dg-text-muted" x="30" y="168">Thin ticks: log backups every 15 min.</text>
  <text class="dg-text" x="30" y="196">Restore: Sunday FULL, then Thursday DIFF, then every log since the DIFF.</text>
  <text class="dg-text-muted" x="30" y="216">RPO = gap between the last good log backup and the failure.</text>
</svg>`,
    placement: `<svg viewBox="0 0 640 260" role="img" aria-label="Purdue placement: the database sits at Level 3 behind a firewall; Ignition gateway reaches it; a DMZ holds a replica or reporting copy for the enterprise; corporate IT does not connect directly to Level 3">
  <defs><marker id="dbo-ah2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path class="dg-fill-line" d="M0,0 L8,4 L0,8 z"/></marker></defs>
  <rect class="dg-zone" x="20" y="14" width="600" height="52" rx="6"/>
  <text class="dg-title" x="34" y="36">Levels 4-5: enterprise IT</text>
  <text class="dg-text-sm" x="34" y="56">BI tools, ERP, cloud uplink</text>
  <rect class="dg-box-warn" x="20" y="84" width="600" height="56" rx="6"/>
  <text class="dg-title" x="34" y="106">DMZ</text>
  <text class="dg-text-sm" x="34" y="128">Read-only replica or reporting copy</text>
  <rect class="dg-zone" x="20" y="158" width="600" height="92" rx="6"/>
  <text class="dg-title" x="34" y="180">Level 3: site operations</text>
  <rect class="dg-box-accent" x="40" y="194" width="170" height="44" rx="4"/>
  <text class="dg-text dg-mid" x="125" y="221">Ignition gateway</text>
  <rect class="dg-box" x="300" y="194" width="170" height="44" rx="4"/>
  <text class="dg-text dg-mid" x="385" y="221">Plant database</text>
  <line class="dg-line" x1="210" y1="216" x2="298" y2="216" marker-end="url(#dbo-ah2)"/>
  <text class="dg-text-sm" x="494" y="212">TCP 1433 / 5432</text>
  <text class="dg-text-sm" x="494" y="230">from gateway only</text>
  <line class="dg-line" x1="385" y1="192" x2="385" y2="142" marker-end="url(#dbo-ah2)"/>
  <line class="dg-line-alarm" x1="560" y1="68" x2="560" y2="82"/>
</svg>`
  },

  pitfalls: [
    "Leaving a database in the full recovery model with no log backups, until the log fills the disk.",
    "Never restoring a backup, so the first test is the real outage.",
    "Storing backups on the same server or network share as the database.",
    "Running Ignition as sa or db_owner, shared with every other tool.",
    "Opening a firewall rule from corporate IT straight into the Level 3 database.",
    "Treating HA or replication as a backup. A bad DELETE replicates instantly.",
    "Forgetting that a gateway backup (.gwbk) does not contain database data."
  ],

  keyTerms: ["recovery-model", "rpo", "recovery-time-objective", "high-availability", "always-on-ag", "least-privilege", "service-account", "full-backup", "differential-backup", "log-backup"],

  quiz: [
    {
      q: "A SQL Server database in the full recovery model has a nightly full backup and no log backups. After eight months the data drive is full. What is the most likely cause?",
      options: ["The historian ignored its retention setting", "The transaction log was never truncated because no log backups ran", "Differential backups filled the disk", "The simple recovery model keeps too much log"],
      answer: 1,
      explain: [
        "Retention can contribute to data growth, but the described pattern points at the log file.",
        "Correct. In the full model the log is only reused after a log backup, so it grows without limit.",
        "No differential backups are mentioned, and backups are written elsewhere.",
        "The simple model reuses the log automatically."
      ]
    },
    {
      q: "The plant says it can lose at most 15 minutes of data and be back within 4 hours. Which pair of numbers is that?",
      options: ["RTO 15 minutes, RPO 4 hours", "RPO 15 minutes, RTO 4 hours", "Both are RPO", "Both are RTO"],
      answer: 1,
      explain: [
        "Reversed. RPO is about data lost and RTO is about downtime.",
        "Correct. RPO is the tolerable data loss and RTO is the tolerable time to recover.",
        "Only the 15 minutes of data loss is an RPO.",
        "Only the 4 hours of downtime is an RTO."
      ]
    },
    {
      q: "Which statement about high availability is true?",
      options: ["A synchronous replica makes backups unnecessary", "An accidental DELETE is repaired by failing over to the standby", "Asynchronous replication can lose the last few seconds of writes at failover", "A failover cluster with shared storage survives loss of the storage array"],
      answer: 2,
      explain: [
        "HA copies mistakes as well as data. You still need point-in-time backups.",
        "The standby receives the DELETE too.",
        "Correct. An asynchronous standby may not have received the newest log records when the primary dies.",
        "Shared storage is a single point of failure for that design."
      ]
    },
    {
      q: "Where should the production database that Ignition and the MES use normally sit, and who may connect?",
      options: ["On the corporate LAN, reachable by anyone for reporting", "At Level 3 behind a firewall, reachable by the gateway and named admin hosts", "On the PLC network, next to the controllers", "On the public cloud with inbound access from the plant"],
      answer: 1,
      explain: [
        "That exposes plant data and gives IT users a path to OT.",
        "Correct. Level 3 with a narrow firewall rule keeps the path small. Share data outward through the DMZ.",
        "Putting a patch-heavy server on the control network adds risk to the controllers.",
        "Inbound access from outside is the pattern to avoid. Push data out instead."
      ]
    },
    {
      q: "A BI team needs dashboards from the plant database. What is the best account setup?",
      options: ["Give them the Ignition gateway's login", "Create a read-only account with SELECT on specific views, reachable from the DMZ only", "Give them db_owner so they can build their own tables", "Share the sa password through the password manager"],
      answer: 1,
      explain: [
        "Sharing the gateway's account hides whose queries are whose and gives write access.",
        "Correct. A dedicated read-only account on views limits the damage if its credentials leak.",
        "db_owner allows destructive changes and is far more than a reader needs.",
        "sa is full control of the server."
      ]
    },
    {
      q: "Why run a timed restore on a different server twice a year?",
      options: ["To empty old backups to free space", "To prove the backups restore and to measure your real RTO", "Because SQL Server requires it", "To reset the log chain"],
      answer: 1,
      explain: [
        "Restore tests don't free space. Retention policy does.",
        "Correct. It finds broken chains, missing keys and missing steps, and gives you a measured recovery time.",
        "No database requires it. It is good practice.",
        "A restore test does not need to alter production's log chain, and doing it on production would risk it."
      ]
    }
  ],

  resources: [
    { title: "Backup overview (SQL Server)", url: "https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-overview-sql-server?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" },
    { title: "Recovery models (SQL Server)", url: "https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/recovery-models-sql-server?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" },
    { title: "Create a differential database backup (SQL Server)", url: "https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/create-a-differential-database-backup-sql-server?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" },
    { title: "Back up a transaction log (SQL Server)", url: "https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-a-transaction-log-sql-server?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" },
    { title: "Back up and restore of SQL Server databases", url: "https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/back-up-and-restore-of-sql-server-databases?view=sql-server-ver17", type: "docs", source: "Microsoft Learn" }
  ]
});
