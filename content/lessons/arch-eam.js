LC.lesson({
  id: "arch-eam",
  title: "Enterprise Administration Module (EAM)",
  track: "arch",
  minutes: 25,
  level: 3,
  prereqs: ["arch-gateway-network", "ign-versioning"],
  tags: ["eam", "fleet-management", "backup", "agent-tasks", "licensing", "upgrades"],
  summary: "One controller gateway that manages many agent gateways: backups, project pushes, module installs, upgrades and licenses from a single place.",
  objectives: [
    "Describe the controller and agent roles and how they connect",
    "List the main agent tasks and what each one does",
    "Explain why Collect Backup comes first and what it archives",
    "Decide what EAM should and should not be used for in a deployment pipeline",
    "Argue why it matters once you manage a fleet of 20 or more gateways"
  ],

  body: `
## The problem EAM solves

One {{term:ignition|Ignition}} gateway is easy to look after. Twenty are not. Each needs a backup, patches, module updates, a license and a way to know whether it is healthy. Doing that by logging into twenty web pages is slow and error prone. The **Enterprise Administration Module** ({{term:eam|EAM}}) turns it into one place: a **controller** gateway that sends **tasks** to **agent** gateways over the {{lesson:arch-gateway-network}}.

EAM is a module you install and license on the gateways involved. The 8.3 manual lists IA's recommendations for using it as health and diagnostics, licensing, backups and disaster recovery, and upgrades.

## Controller and agents

{{diagram:eam}}

| Role | What it is | Where you work |
|---|---|---|
| **Controller** | The gateway that assigns tasks and monitors agents, and holds an archive of their backups and modules | The controller's web interface |
| **Agent** | Any managed gateway. It runs the tasks the controller sends | Nothing to do locally for normal tasks |

You set a gateway's EAM role (controller or agent) in its EAM settings. Agents connect to the controller through Gateway Network connections, which you approve like any other. In 8.3, tasks, agents and archive are in the controller's **Network > Enterprise** section. In 8.1 the same functions sit under Config > Enterprise Administration.

Agents can also be installed automatically in large rollouts (the manual has an automated agent installation page, which is handy when you build gateways from containers or scripts).

> [!note] In 8.1
> The navigation path differs (Config > Enterprise Administration), and the Agent Recovery task still exists in 8.1. It was removed in 8.3, where you use other agent tasks, such as Restore Backup, to do similar work.

## Agent tasks

You create a task, choose which agents it targets, run it now or on a schedule, and read the result on the task page. The page shows running, scheduled and recently completed tasks, and whether each succeeded.

| Task | What it does |
|---|---|
| **Collect Backup** | Has the agent make a gateway backup and sends it to the controller. The backup, installed modules and current license are stored in the controller's archive |
| **Restore Backup** | Applies a backup to an agent, chosen from the archive or a file you pick. In 8.3 the restored agent keeps its previous name |
| **Send Project** / **Send Project Resources** | Pushes a whole project, or selected resources, from the controller to agents. Used for pushing the same screens and scripts to many sites |
| **Install Modules** | Installs modules on agents from files you provide or from the archive, and the archive only has modules after a Collect Backup |
| **Remote Upgrade** | Upgrades the agent's Ignition version remotely (the 8.1 to 8.3 path has limits, so read the upgrade guide) |
| **Restart Agent** | Stops and restarts the Ignition service on the agent |

Licensing is visible on the controller too. The 8.3 License Management page can show and manage leased licenses across the fleet, which means you can see which gateways are licensed, and when, without logging into each.

Health monitoring is the passive side. The controller tracks each agent's connection status and recent task results, so a dead link or a failed backup is visible in one table.

> [!warning] Collect Backup is the foundation
> Restores, module reinstalls and rebuilding an agent all depend on an archived backup. The manual states you need at least one Collect Backup before you can reinstall archived modules, and that the backup includes the license. In 8.3, Collect Backup waits up to 60 minutes for the agent to produce the backup and up to another 60 for the transfer. Large gateways with big historian configurations need that. Schedule backups first, and test a restore before you need one.

## Typical rollout

Say you run 24 plant gateways, all with the same base project and different tags.

1. Stand up a controller (ideally redundant, see {{lesson:arch-redundancy}}). Scheduled tasks on a master controller pause during failover and resume when it returns.
2. Create outgoing connections from each plant to the controller, or the reverse, and approve them.
3. Schedule **Collect Backup** weekly, staggered so 24 backups don't hit the WAN at once.
4. Develop on a staging gateway. When ready, use **Send Project** to push to a pilot group of 3 plants, then to all.
5. For Ignition patches, use **Remote Upgrade** in waves, with the staging gateway first.

> [!tip] Respect versions
> Not every resource can go to an older agent. For example, 8.3 gateway and Perspective event scripts cannot be sent to 8.1 agents with Send Project. Keep the fleet on one version where you can.

## What EAM is not

EAM moves gateway-level things. It is not source control, not a tag database and not a continuous integration tool. Many teams pair it with Git for project history (see {{lesson:ign-versioning}}) and use EAM to distribute a known-good version. It does not replace thinking about environments (dev, test, prod) or about tag and UDT standardization across sites. And a controller outage does not stop plants. Agents keep running on their own.
`,

  eli5: `
Picture a school district with 24 schools. Each school has its own principal, its own office and its own filing cabinet. If something needs to change district-wide, say a new safety rule, someone has to visit each school.

Now imagine the district office has a special phone line to every school. From the district office you can say, "Everybody, make a copy of your records and send it to me." You can also say, "School 7, here is the new rule book," or "School 12, please restart your office computer." You can see a board showing which schools answered and which didn't.

The district office is the **controller**. The schools are the **agents**. The things you ask them to do are **tasks**. The schools keep running perfectly well if the district office is closed for the day. The office is just how you look after all of them without driving to each one.
`,

  why: `
**Why a controller and not scripts?** You can script gateway chores yourself with your own tooling, and many teams do. EAM's advantage is that it already knows about licenses, module archives, scheduling and success tracking, and it uses the same trust model as the rest of the Gateway Network. Its tradeoff is that it ties your operations to Ignition's tooling and a version-sensitive module. Teams that already run Ansible, Docker and Git often use EAM only for backup collection and license visibility.

**Why back up through the controller?** A backup that sits on the same server as the gateway dies with the server. Collect Backup moves a copy off the box and includes modules and the license, which are the two things people forget when rebuilding. Recovery after a hardware failure becomes "build a clean Ignition, restore from the archive."

**Why fleet size changes the answer.** At 3 gateways, EAM is optional. At 20 or more, the sum of small manual tasks becomes the main operating cost, and inconsistent versions or missed backups become the main risk. EAM pays for itself in avoided mistakes: the plant that never got the security patch, the backup nobody took, the license that expired.

**Why the controller deserves care.** A controller can restore or overwrite agents, so it is a powerful machine. Treat access to it as privileged, use roles and audit, run it redundantly, and do not expose it to the internet. Compromising the controller is compromising the fleet.
`,

  examples: [
    {
      title: "Recovering a failed plant server",
      body: `Plant 9's server dies. You build a fresh machine with the same Ignition version, connect it as an agent, and use Restore Backup with the last archived backup. The restored agent keeps its previous name, the modules come back (they were archived with the backup), and the license restores with it. Remember that restoring a backup made before Ignition 8.1 onto an 8.3 gateway is not supported.`
    },
    {
      title: "A staged project rollout",
      body: `You changed an alarm status screen. In the controller you create a Send Project Resources task for just that screen, target a small pilot group of agents, run it, check operators' feedback for a day and then run it for the remaining 21 agents. If the task shows failures for two agents, the task page lists which ones, and you can retry those without touching the rest.`
    }
  ],

  diagrams: {
    eam: `<svg viewBox="0 0 640 320" role="img" aria-label="An EAM controller with its archive sends tasks to agent gateways over the Gateway Network and collects backups, status and results">
  <defs><marker id="arch-eam-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="170" y="20" width="300" height="100" rx="6"/>
  <text class="dg-title dg-mid" x="320" y="46">EAM controller</text>
  <text class="dg-text-muted dg-mid" x="320" y="68">schedules and assigns tasks</text>
  <rect class="dg-box-2" x="190" y="80" width="260" height="28" rx="4"/>
  <text class="dg-text-sm dg-mid" x="320" y="99">Archive: backups, modules, licenses</text>
  <rect class="dg-box" x="20" y="210" width="130" height="64" rx="6"/>
  <text class="dg-text-sm dg-mid" x="85" y="236">Agent: Plant 1</text>
  <text class="dg-text-muted dg-mid" x="85" y="256">runs tasks</text>
  <rect class="dg-box" x="175" y="210" width="130" height="64" rx="6"/>
  <text class="dg-text-sm dg-mid" x="240" y="236">Agent: Plant 2</text>
  <text class="dg-text-muted dg-mid" x="240" y="256">runs tasks</text>
  <rect class="dg-box" x="330" y="210" width="130" height="64" rx="6"/>
  <text class="dg-text-sm dg-mid" x="395" y="236">Agent: Plant 3</text>
  <text class="dg-text-muted dg-mid" x="395" y="256">runs tasks</text>
  <rect class="dg-box" x="485" y="210" width="135" height="64" rx="6"/>
  <text class="dg-text-sm dg-mid" x="552" y="236">Agent: ... N</text>
  <text class="dg-text-muted dg-mid" x="552" y="256">runs tasks</text>
  <path class="dg-line-accent" d="M260 120 L100 210" marker-end="url(#arch-eam-ah)"/>
  <path class="dg-line-accent" d="M300 120 L240 210" marker-end="url(#arch-eam-ah)"/>
  <path class="dg-line-accent" d="M340 120 L395 210" marker-end="url(#arch-eam-ah)"/>
  <path class="dg-line-accent" d="M380 120 L540 210" marker-end="url(#arch-eam-ah)"/>
  <text class="dg-text-muted" x="20" y="150">Tasks down:</text>
  <text class="dg-text-muted" x="20" y="168">Collect / Restore Backup</text>
  <text class="dg-text-muted" x="20" y="186">Send Project, Install Modules</text>
  <text class="dg-text-muted" x="450" y="150">Results up:</text>
  <text class="dg-text-muted" x="450" y="168">backups, status, success</text>
  <text class="dg-text-muted dg-mid" x="320" y="304">All links are Gateway Network connections. Agents keep running if the controller is down.</text>
</svg>`
  },

  pitfalls: [
    "Skipping Collect Backup, then finding there are no archived modules to reinstall.",
    "Scheduling all agents to back up at the same time over a thin WAN.",
    "Pushing a project to every agent at once instead of a pilot group first.",
    "Mixing 8.1 and 8.3 agents without checking that the resources you send are supported by the older version.",
    "Treating the controller as an ordinary server. It can restore and overwrite every agent.",
    "Expecting EAM to replace source control or environment promotion."
  ],

  keyTerms: ["eam", "eam-controller", "eam-agent", "agent-task", "gateway-network", "ignition", "commissioning"],

  quiz: [
    {
      q: "You want to reinstall the modules that a failed agent had. Where do the module files come from?",
      options: [
        "The controller's archive, populated by a previous Collect Backup",
        "They are fetched automatically from the internet",
        "The agent's local logs",
        "The Gateway Network connection, live from the dead agent"
      ],
      answer: 0,
      explain: [
        "Correct. Collect Backup stores the backup, installed modules and license in the controller's archive.",
        "Reinstallation uses archived files or files you supply. It does not fetch from the internet on its own.",
        "Logs record events, not module files.",
        "A failed agent cannot supply anything live."
      ]
    },
    {
      q: "Which statement about the controller and agents is correct?",
      options: [
        "Agents stop running if the controller goes offline",
        "The controller assigns tasks and monitors agents, and agents keep running normally if it is down",
        "Agents assign tasks to each other",
        "The controller must run on the same machine as an agent"
      ],
      answer: 1,
      explain: [
        "Agents are full gateways and keep doing their jobs without the controller. Only management stops.",
        "Correct. EAM is a management layer, not a runtime dependency.",
        "Tasks flow from the controller to agents.",
        "The controller is a separate gateway in the fleet."
      ]
    },
    {
      q: "You have 24 plant gateways to update with a new screen. What is the safest use of EAM?",
      options: [
        "Send Project to all 24 immediately",
        "Send Project Resources to a pilot group, check the results, then send to the rest",
        "Restart all agents first",
        "Run Restore Backup on every agent"
      ],
      answer: 1,
      explain: [
        "A bad change would hit every site at once.",
        "Correct. A staged rollout limits the blast radius and EAM reports task success per agent.",
        "Restarting does not deliver a screen and causes needless downtime.",
        "Restoring overwrites gateway configuration, which is far more than a screen update."
      ]
    },
    {
      q: "Why do experienced integrators care about EAM mostly once the fleet is large?",
      options: [
        "EAM is free only above 20 gateways",
        "Manual per-gateway chores multiply, and inconsistency and missed backups become the main risk",
        "Smaller fleets cannot use the Gateway Network",
        "EAM improves tag performance"
      ],
      answer: 1,
      explain: [
        "Licensing is not what makes fleet size matter.",
        "Correct. The savings are avoided mistakes and time, which grow with the number of gateways.",
        "The Gateway Network works with any number of gateways.",
        "EAM is for administration and does not affect tag performance."
      ]
    },
    {
      q: "A teammate suggests using EAM as the only source of truth for project history. What is the best reply?",
      options: [
        "Agreed, EAM keeps every project version",
        "EAM distributes and backs up. Keep project history in source control and use EAM to deploy a known-good version",
        "Use EAM only for licensing",
        "Store the projects in the Gateway Network"
      ],
      answer: 1,
      explain: [
        "EAM's archive holds backups, not a development history with diffs and reviews.",
        "Correct. Version control tracks changes. EAM moves the result to gateways and collects backups.",
        "EAM does far more than licensing.",
        "The Gateway Network is a transport and does not store projects."
      ]
    }
  ],

  resources: [
    { title: "Agent Management (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/ignition-modules/enterprise-administration/agent-management", type: "docs", source: "Inductive Automation" },
    { title: "Agent Task: Backup and Restore (8.3)", url: "https://docs.inductiveautomation.com/docs/8.3/ignition-modules/enterprise-administration/agent-tasks/backup-and-restore", type: "docs", source: "Inductive Automation" },
    { title: "Agent Task: Send Project (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/enterprise-administration/agent-tasks/send-project", type: "docs", source: "Inductive Automation" },
    { title: "Enterprise Administration (8.1 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/enterprise-administration", type: "docs", source: "Inductive Automation" },
    { title: "Redundant EAM Configuration (8.1)", url: "https://www.docs.inductiveautomation.com/docs/8.1/ignition-modules/enterprise-administration/redundant-eam-configuration", type: "docs", source: "Inductive Automation" },
    { title: "Ignition 8 Deployment Best Practices", url: "https://www.docs.inductiveautomation.com/docs/8.3/tutorials/ignition-8-deployment-best-practices", type: "docs", source: "Inductive Automation" },
    { title: "Introduction to the Enterprise Administration Module (transcript)", url: "https://inductiveuniversity.com/videos/transcript/introduction-to-enterprise-administration-module", type: "video", source: "Inductive University" }
  ]
});
