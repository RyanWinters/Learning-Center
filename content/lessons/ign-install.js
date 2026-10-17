LC.lesson({
  id: "ign-install",
  title: "Installing, commissioning and the Gateway web UI (8.3)",
  track: "ign",
  minutes: 25,
  level: 2,
  prereqs: ["ign-architecture"],
  tags: ["ignition", "install", "commissioning", "docker", "git", "rest-api", "ports", "backup"],
  summary: "Getting a Gateway running is the easy part. What you set on day one, and how 8.3 stores configuration as files, decides whether it stays maintainable.",
  objectives: [
    "Choose between the installer, the zip distribution and Docker for a given environment",
    "Walk through Gateway commissioning and name the first settings to review",
    "Explain how 8.3 stores configuration as files and why that makes Git practical",
    "Describe deployment modes and what the gateway REST API and API keys are for",
    "Identify the default ports and what to firewall"
  ],

  body: `
## Why installation is worth a lesson

A Gateway you can build by clicking can also be lost by clicking. The difference between a hobby install and an integrator's install is what you decide before the first user logs in: where it runs, how it is backed up, how its configuration is tracked and what is exposed on the network. Ignition 8.3 changed the storage model underneath all of that, so older habits need adjusting.

## Ways to install

| Method | What it is | Use it when |
|---|---|---|
| Installer (Windows, Linux, macOS) | Guided install that registers a service/daemon | A single server or a plant PC you will maintain by hand |
| Zip distribution | Unpacked folder you start yourself | Locked-down hosts, custom service wrappers, side-by-side versions |
| Docker image | Official container image, configured by environment variables | Repeatable deployments, dev/test copies, Kubernetes |

On Windows and Linux the installer sets Ignition to start with the machine. Plan the host the way you would a database server: dedicated, patched on a schedule and sized for the sessions and tag changes you expect. Ignition does not need a database installed on the same host, and in production it normally should not share one.

The Docker image reads settings such as the HTTP and HTTPS ports from environment variables (for example \`GATEWAY_HTTP_PORT\`, default 8088, and \`GATEWAY_HTTPS_PORT\`, default 8043), and it can accept commissioning options at start so a new container comes up already configured. See {{lesson:arch-containers}} for the full container story.

## Commissioning

The first time you reach a new Gateway in a browser (\`http://<host>:8088\`) you run the **commissioning** flow. It is short, and the choices matter:

1. Accept the license agreement.
2. Create the **administrator** account. This is the account that owns the Gateway until you connect an identity provider. Record it in your password manager.
3. Confirm the **ports** for HTTP, HTTPS and the Gateway Network. On a clean install the Gateway checks whether the defaults are free and increments the port number until it finds one that is. Upgraded Gateways do not search, so a port conflict faults the Gateway.
4. Finish, and the Gateway starts its modules.

After commissioning the Gateway's UI is available at the port you chose. The ports live in the Gateway's \`data/gateway.xml\` file as \`gateway.port\` and \`gateway.sslport\`, and Inductive recommends talking to support before editing them by hand.

| Port | Default | Purpose |
|---|---|---|
| 8088 | HTTP | Gateway web UI, Designer and client traffic |
| 8043 | HTTPS | Same, encrypted |
| 8060 | Gateway Network | Ignition-to-Ignition connections, see {{lesson:arch-gateway-network}} |
| 62541 | OPC UA server | Other OPC UA clients connecting to Ignition |

Check the current port reference before building firewall rules. Modbus device connections, database connections and MQTT add their own ports.

## The 8.3 Gateway web UI

The Gateway web UI was redesigned in 8.3. The main areas are still **Status** (diagnostics, connections, logs, running sessions) and **Config** (everything you can configure), and the pages you edit map onto the configuration resources that now exist as files on disk. If you know the 8.1 menus, expect the same items in somewhat different places, and use the in-page navigation and search rather than memorizing paths.

> [!note] In 8.1
> Gateway configuration lived in an internal database (the \`config.idb\` file). It was fast and atomic but opaque: you backed it up as a whole and could not diff it. Many 8.1 teams exported projects to files and ignored the rest.

## File-based configuration in 8.3

This is the biggest change for integrators. In 8.3, most Gateway configuration is stored as plain files under the Gateway's \`data/config\` directory. Resources are grouped into collections, and a resource is typically a folder holding a JSON file with its settings, plus any extra files it needs. Projects and tags are also stored as files.

\`\`\`text
data/
  config/
    resources/
      core/
        ignition/
          device/
          database-connection/
          tag-provider/
  projects/
    MyProject/
\`\`\`

(Treat the exact folder names as illustrative. Look at your own Gateway for the real layout.)

{{diagram:flow}}

Why that matters:

- **Diffs and history.** A device IP change becomes a one-line diff in a JSON file with an author and a commit message, rather than an invisible edit in a database.
- **Git as the source of truth.** You can keep \`data\` content in a repository and let a pipeline or a tool like Argo CD or Flux sync it to Gateways. Inductive's version control guide recommends it.
- **Cloning.** A new Gateway for dev or test is a copy of the config folders with the settings that must differ (IPs, passwords) changed.
- **Review.** Colleagues review a pull request instead of asking "who changed the database connection?"

Practical rules from the version control guide: switch project encoding to XML so projects diff cleanly, and expect some resource types, such as transaction groups and alarm pipelines, to still be binary and worth excluding from Git. Do not commit secrets in plain form, and watch for long paths on Windows, since 8.3 tag files can sit deep enough to hit the 255-character path limit. {{lesson:ign-versioning}} goes deeper.

> [!warning] Edit files only through a rescan
> If you change files on disk while the Gateway is running, the Gateway will not notice until a scan runs. Use the Gateway's scan trigger (UI or API) rather than assuming a change took effect.

## Deployment modes

A **deployment mode** lets one set of configuration files contain variants, for example a \`dev\` and a \`prod\` mode, where device IPs or database URLs differ. The Gateway applies the resources for the mode it started in. The same repository can then deploy to both environments without hand editing. A system tag for the current mode did not exist as of the forum threads on it, but a script can read the active mode through the platform's configuration manager, and the gateway info API returns it.

## The gateway REST API

8.3 adds a REST API served by the Gateway itself. The Gateway publishes an interactive documentation page at \`/openapi\` and the raw spec at \`/openapi.json\`. Typical uses:

- Read and write configuration resources under \`/data/api/v1/resources\`.
- Trigger project and config scans after a Git pull.
- Restart the Gateway or read its info (including deployment mode).

Authentication uses **API keys** created in the Gateway's security settings. A client sends the key in the \`X-Ignition-API-Token\` header. Give each key the narrowest security level that works. A key that cannot read the Gateway returns 401/403 errors, which is the most common first-day issue.

\`\`\`text
# After a git pull on the production Gateway host
curl -X POST http://gw-prod:8088/data/api/v1/scan/projects -H "X-Ignition-API-Token: <key>"
\`\`\`

Not everything is exposed. As of the forum replies at the time of writing, tag groups cannot be created through the API or scripting, so check before designing automation around a specific resource type.

## Day-one settings

Before you hand the Gateway to anyone:

1. **Name the Gateway** (system name). It appears in Designer, the Gateway Network and logs.
2. **Enable HTTPS** with a real certificate and decide whether to redirect HTTP. Passwords on port 8088 over plain HTTP cross the network in the clear.
3. **Replace the default admin approach.** Avoid shared admin logins. Connect an identity provider (see {{lesson:ign-security}}) and keep one local break-glass account.
4. **Configure the database connection** and test it. Set up store and forward expectations for outages.
5. **Set the timezone and clock source** correctly. History and alarms are meaningless with a wrong clock. Use NTP on the host.
6. **Review log and diagnostics retention** so a chatty script does not fill a disk.
7. **Set a backup schedule** and prove a restore.
8. **Restrict the network.** Only the people and systems that need the web UI, Designer and OPC UA port should reach them. Keep the Gateway out of the DMZ unless that is its job.

## Backups

A Gateway backup (\`.gwbk\`) contains the configuration, projects and, depending on options, other state. Take it from the web UI or schedule it. The rule experienced integrators repeat: a backup you have not restored is a hope, not a backup. Restore into a scratch Gateway of the same version at least once, and store backups off the Gateway host. With 8.3, a Git repository of the configuration is a second, independent copy and also gives you history. Use both.

> [!example] A day-one build
> You provision a Linux VM, install 8.3, and commission with HTTP on 8088 and HTTPS on 8043. You set the system name to \`PlantA-GW1\`, import a certificate, connect a PostgreSQL database, create an API key limited to read for monitoring, schedule a nightly \`.gwbk\` to a network share, and commit the \`data/config\` and \`data/projects\` directories to a private Git repo. The firewall allows 8043 and the OPC UA port from the plant network only.
`,

  eli5: `
Setting up a Gateway is like moving into a new house. The moving truck (the installer) drops everything off, but you still have to do the first-day jobs: pick a front door lock and give out keys, label the fuse box, set the clock, and decide who is allowed through the gate.

The old way, the house's blueprints and notes were locked inside a sealed safe. You could carry the whole safe to a new house, but you could not read what was inside or see what changed. The new way keeps the notes in ordinary folders on a shelf. You can read them, photocopy them, and write down every change in a logbook.

A backup is the photocopy you keep at your neighbor's house. It only counts once you have tried rebuilding your house from it.
`,

  why: `
**Why file-based configuration was worth a rewrite.** Plants run for decades, and the person who set a device IP in 2026 will not be there in 2036. Version control gives the system a memory: who changed what, when and why, and a way to undo it. It also makes the promise of dev, test and prod environments real, since a configuration you can diff is a configuration you can promote. A database blob cannot be reviewed.

**Why you still keep gateway backups.** Git captures the files you commit. A backup captures the whole, consistent state, including things you excluded from Git (binary resources, secrets). They answer different questions. Git answers "what changed?" and a backup answers "can we get the plant back by 3 a.m.?"

**Why deployment modes exist.** The classic failure is copying production configuration to a dev Gateway and having the dev copy start writing to production PLCs. Modes let identical files hold different targets, but they also introduce a new way to be wrong: the Gateway started in the wrong mode. Teams argue about whether a mode should be set by the host, the container or a launch parameter. The safest answer is the one an operator cannot change from a web page.

**Why integrators lock down the API.** A REST API that can change configuration is also an attack surface. Treat keys as production credentials, scope them narrowly, rotate them, and keep the API off any untrusted network.
`,

  history: `
Ignition 7 and 8.0/8.1 stored Gateway configuration in an internal database, with the project store separate. Over the years integrators built tooling around exports and backups to get version control. Ignition 8.3 (2025) replaced that with file-based configuration, a REST API and deployment modes, which Inductive Automation described in its 8.3 deep-dive sessions.
`,

  examples: [
    {
      title: "Promoting a change from dev to prod",
      body: `On a dev Gateway you add a new Logix device connection, commit the new device folder to a feature branch and open a pull request. A reviewer sees only the device JSON file. After merging, a pipeline pulls on the production host and calls the project/config scan endpoint with an API key. The production Gateway starts in \`prod\` deployment mode, so the device uses the production PLC IP instead of the dev one.`
    },
    {
      title: "First-login 403 on the API",
      body: `Your script calls the gateway info endpoint and gets 403. The API key exists, but its security level has no read access to the Gateway. Add a level that grants read access, rotate the key and retry. Do not widen the key to full access to make the error go away.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 170" role="img" aria-label="Configuration flow: edit on a dev Gateway, commit to Git, pull on the production host, call the scan API, Gateway applies the change.">
  <defs><marker id="ign-install-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="10" y="50" width="110" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="65" y="76">Dev Gateway</text>
  <text class="dg-text-muted dg-mid" x="65" y="96">edit config</text>
  <rect class="dg-box" x="150" y="50" width="110" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="205" y="76">Git repo</text>
  <text class="dg-text-muted dg-mid" x="205" y="96">review, merge</text>
  <rect class="dg-box" x="290" y="50" width="110" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="345" y="76">Prod host</text>
  <text class="dg-text-muted dg-mid" x="345" y="96">git pull</text>
  <rect class="dg-box" x="430" y="50" width="90" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="475" y="76">REST API</text>
  <text class="dg-text-muted dg-mid" x="475" y="96">scan</text>
  <rect class="dg-box-accent" x="545" y="50" width="85" height="60" rx="4"/>
  <text class="dg-text-sm dg-mid" x="587" y="76">Gateway</text>
  <text class="dg-text-muted dg-mid" x="587" y="96">applies</text>
  <line class="dg-line" x1="120" y1="80" x2="150" y2="80" marker-end="url(#ign-install-ah)"/>
  <line class="dg-line" x1="260" y1="80" x2="290" y2="80" marker-end="url(#ign-install-ah)"/>
  <line class="dg-line" x1="400" y1="80" x2="430" y2="80" marker-end="url(#ign-install-ah)"/>
  <line class="dg-line" x1="520" y1="80" x2="545" y2="80" marker-end="url(#ign-install-ah)"/>
  <text class="dg-text-muted" x="10" y="150">Mode selects the right IPs: dev vs prod</text>
</svg>`
  },

  pitfalls: [
    "Leaving the Gateway on HTTP only, with logins crossing the network in the clear.",
    "Editing config files on disk and assuming the running Gateway noticed without a scan.",
    "Committing everything to Git, including binary resources and secrets.",
    "Never testing a restore until the day a restore is needed.",
    "Starting a copied production configuration on a dev Gateway without a deployment mode, so it talks to real PLCs.",
    "Giving an API key full access when read access was all that was needed."
  ],

  keyTerms: ["commissioning", "ign-config-files", "deployment-mode", "rest-api", "ign-api-key", "ign-docker", "gwbk", "firewall", "port-number"],

  quiz: [
    {
      q: "Why does 8.3's file-based configuration make Git practical where 8.1 did not?",
      options: ["Configuration is plain files you can diff, review and sync", "Gateways no longer need backups", "Git runs inside the Gateway", "Configuration is now encrypted"],
      answer: 0,
      explain: [
        "Correct. Files give you diffs, history, review and promotion between environments.",
        "Backups remain valuable for state Git does not hold.",
        "Git is external. The Gateway just reads the files.",
        "The change is about file storage, not encryption."
      ]
    },
    {
      q: "You edit a device JSON file on disk while the Gateway runs. Nothing changes in the UI. What is the most likely reason?",
      options: ["The Gateway has not scanned the file system", "JSON files are ignored", "The device is offline", "The Gateway needs a license reset"],
      answer: 0,
      explain: [
        "Correct. A scan, triggered from the UI or API, makes the Gateway pick up on-disk changes.",
        "Configuration files are the source for resources.",
        "Device status does not control whether configuration is loaded.",
        "Licensing is unrelated."
      ]
    },
    {
      q: "A technician needs a script to monitor Gateway health through the REST API. What is the best practice?",
      options: ["Create an API key with the narrowest security level that includes read access", "Share the admin password with the script", "Open the API with no authentication on the plant network", "Use a key with full access for convenience"],
      answer: 0,
      explain: [
        "Correct. Least privilege keeps a leaked key from being a catastrophe.",
        "Admin credentials in scripts are hard to rotate and audit.",
        "The configuration routes require API keys.",
        "Convenience now means exposure later."
      ]
    },
    {
      q: "What problem do deployment modes solve?",
      options: ["The same configuration files can target different environments, such as dev and prod", "They speed up tag polling", "They let two Gateways share a license", "They replace backups"],
      answer: 0,
      explain: [
        "Correct. Modes apply environment-specific values like IPs without maintaining separate repositories.",
        "Polling speed is a driver and tag setting.",
        "Modes do not change licensing.",
        "Backups capture state. Modes vary configuration."
      ]
    },
    {
      q: "A clean install finds port 8088 already in use. What happens?",
      options: ["The Gateway iterates to the next available port", "The install fails and deletes itself", "It silently shares 8088", "It switches to port 502"],
      answer: 0,
      explain: [
        "Correct. Clean installs check defaults and move up until a free port is found. Upgrades do not search and fault instead.",
        "The install does not fail on this.",
        "Two services cannot bind the same port.",
        "Port 502 is Modbus TCP and unrelated."
      ]
    }
  ],

  resources: [
    { title: "Downloading and Installing Ignition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/startup-guide/downloading-and-installing-ignition", type: "docs", source: "Inductive Automation" },
    { title: "Installing and Upgrading Ignition (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/installing-and-upgrading", type: "docs", source: "Inductive Automation" },
    { title: "Version and Source Control Guide (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/tutorials/version-control-guide", type: "docs", source: "Inductive Automation" },
    { title: "API Documentation (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/gateway/openapi", type: "docs", source: "Inductive Automation" },
    { title: "API Keys (8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/security/api-keys", type: "docs", source: "Inductive Automation" },
    { title: "8.1 to 8.3 Upgrade Guide", url: "https://www.docs.inductiveautomation.com/docs/8.3/getting-started/installing-and-upgrading/ignition-8-upgrade-guide/81to83-upgrade-guide", type: "docs", source: "Inductive Automation" },
    { title: "Docker Image (8.3 manual)", url: "https://docs.inductiveautomation.com/docs/8.3/platform/docker-image", type: "docs", source: "Inductive Automation" },
    { title: "Deployment Mode (IGN-14256) forum thread", url: "https://forum.inductiveautomation.com/t/ign-14256-deployment-mode/110514", type: "forum", source: "Inductive Automation Forum" }
  ]
});
