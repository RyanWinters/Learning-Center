LC.lesson({
  id: "arch-containers",
  title: "Ignition in Docker, Kubernetes and the cloud",
  track: "arch",
  minutes: 15,
  level: 4,
  prereqs: ["arch-patterns", "ign-versioning"],
  tags: ["docker", "containers", "kubernetes", "cloud", "deployment", "devops", "8.3"],
  summary: "Run Ignition from an official image, commission it with environment variables, keep state in volumes, and combine 8.3's file-based config with git for repeatable deployments.",
  objectives: [
    "Explain what a container image, container and volume are and how they differ from a VM",
    "Start a commissioned Ignition Gateway with docker run and environment variables",
    "Write a docker-compose file that pairs Ignition with a database",
    "Describe how file-based 8.3 projects and config plus git make deployments repeatable",
    "Say what Kubernetes, Helm and Ignition Cloud Edition add, and where the limits are"
  ],

  body: `
## Why containers matter to an integrator

Installing Ignition by hand on a server is a ritual: run the installer, click through commissioning, create database connections, import projects, install modules. Do it ten times and you get ten slightly different Gateways. A **container** turns that ritual into a file. The same instructions start the same Gateway on a laptop, a test server or a cloud host. For an integrator with many customers and a lot of "it works on my machine," that is a big deal.

A **Docker image** is a read-only package of an application and its dependencies. A **container** is a running instance of an image. Unlike a virtual machine, containers share the host's kernel, so they start in seconds and use less memory, but they are not a full separate operating system.

## The official image

Inductive Automation publishes the \`inductiveautomation/ignition\` image on Docker Hub. Tags match Ignition versions, so pin one (for example an 8.3 patch tag) instead of using \`latest\`. An update should be a decision you make, not something that happens on a restart.

A Gateway needs three decisions: how it is **commissioned**, where its **state** lives, and which **ports** are reachable.

### Commissioning with environment variables

On a normal install, a new Gateway opens a commissioning wizard in the browser. In a container nobody is there to click it, so environment variables answer the questions.

| Variable | Purpose |
|---|---|
| \`ACCEPT_IGNITION_EULA=Y\` | Accepts the license agreement, skipping that wizard step |
| \`GATEWAY_ADMIN_USERNAME\` | Name of the first admin user |
| \`GATEWAY_ADMIN_PASSWORD\` | Its password. Plain text or a salted hash per the docs |
| \`IGNITION_EDITION\` | \`standard\`, \`edge\` or \`maker\` |
| \`IGNITION_LICENSE_KEY\` | 8-character license key for leased activation (e.g. Maker Edition) |
| \`GATEWAY_MODULES_ENABLED\` | Comma-separated list of module identifiers (built-in or third-party) to keep enabled |

Any variable can be supplied as a file by adding \`_FILE\`, such as \`GATEWAY_ADMIN_PASSWORD_FILE\`. That suits Docker secrets and Kubernetes secrets, which mount values as files. Never put production passwords in a compose file you commit to git.

A \`docker run\` version supplies the password file with a read-only bind mount. The file must exist on the host first (create it with restrictive permissions, outside git). HTTPS is published on 8043. Open 8088 only if you need plain HTTP on a trusted bench.

\`\`\`bash
docker run -d --name ignition \\
  -p 8043:8043 \\
  -e ACCEPT_IGNITION_EULA=Y \\
  -e GATEWAY_ADMIN_USERNAME=admin \\
  -e GATEWAY_ADMIN_PASSWORD_FILE=/run/secrets/admin_pw \\
  -e IGNITION_EDITION=standard \\
  -v "$PWD/secrets/gw_admin.txt:/run/secrets/admin_pw:ro" \\
  -v ignition-data:/usr/local/bin/ignition/data \\
  inductiveautomation/ignition:8.3.0 \\
  -n PlantGateway
\`\`\`

Arguments after the image name, like \`-n\` for the Gateway name, are passed to the Gateway launcher. Check the 8.3 Docker image page for the current list before relying on these.

### Volumes: where state lives

A container's own filesystem disappears when the container is removed. The Gateway's configuration, projects, internal databases and logs live in its **data directory**. If you do not mount it, a recreated container is a brand-new, uncommissioned Gateway.

- A **named volume** (\`ignition-data\`) is managed by Docker and survives container deletion. It is the simple choice for a single host.
- A **bind mount** maps a host folder in. It is handy when you want to see or version the files.
- A **data-less Gateway** is also valid: mount nothing, rebuild everything from a project and config repository on every start. This suits stateless front-end Gateways.

> [!warning] Upgrades and volumes
> Pointing a newer image at an old volume upgrades the data in place, and you cannot downgrade by pointing back. Back up the volume first ({{lesson:ign-versioning}}).

## Compose: Gateway plus database

A real system is several containers. Docker Compose describes them in one YAML file.

\`\`\`yaml
services:
  db:
    image: mariadb:11
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD_FILE: /run/secrets/db_root
      MARIADB_DATABASE: ignition
    secrets:
      - db_root
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect"]
      interval: 10s
      retries: 10

  gateway:
    image: inductiveautomation/ignition:8.3.0
    restart: unless-stopped
    ports:
      - "8043:8043"          # HTTPS for the web UI, Designer and Perspective
      # - "8060:8060"        # Gateway Network, only if another gateway dials in
    environment:
      ACCEPT_IGNITION_EULA: "Y"
      GATEWAY_ADMIN_USERNAME: admin
      GATEWAY_ADMIN_PASSWORD_FILE: /run/secrets/gw_admin
      IGNITION_EDITION: standard
    secrets:
      - gw_admin
    volumes:
      - gw-data:/usr/local/bin/ignition/data
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8088/StatusPing"]
      interval: 15s
      timeout: 5s
      retries: 10
      start_period: 120s
    depends_on:
      db:
        condition: service_healthy

secrets:
  db_root:
    file: ./secrets/db_root.txt
  gw_admin:
    file: ./secrets/gw_admin.txt

volumes:
  db-data:
  gw-data:
\`\`\`

The top-level \`secrets:\` block maps each secret to a file on the host (keep \`./secrets/\` out of git). Compose mounts each one inside the container at \`/run/secrets/<name>\`, which is where the \`_FILE\` variables point. Only 8043 is published, so the admin pages are reachable over HTTPS only. The Gateway also listens on 8088 inside the container, and the healthcheck uses that internal port without publishing it. The \`/StatusPing\` URL and the availability of \`curl\` in the image are worth confirming on the Docker image page for your tag. \`restart: unless-stopped\` brings both containers back after a host reboot. Terminate TLS with a certificate you control before exposing the Gateway beyond a lab (see the Gateway's SSL/TLS settings in the manual).

Inside the Compose network, containers reach each other by service name. The Ignition database connection URL points at \`db\`, not \`localhost\`. That one mistake accounts for many "connection refused" questions: \`localhost\` inside the Gateway container is the Gateway container.

{{diagram:compose}}

## 8.3 file-based config, git and repeatable deploys

Before 8.3, a Gateway's configuration was mostly a binary-ish internal database, and projects were exported as single files. 8.3 stores projects and Gateway configuration as **files on disk** (resources in directories), which diff and merge in git. That is what makes containers genuinely repeatable:

1. The repository holds projects and config resources, such as database connections, tag provider settings and security settings. See the version control guide in the 8.3 manual.
2. A pipeline builds or selects an image at a pinned version.
3. The container starts, commissions itself from environment variables and loads the repo content.
4. For anything that must change after start, the pipeline calls the Gateway's REST API with an API key ({{lesson:arch-webdev}}).

Secrets such as database passwords need care. 8.3 includes secrets management so that config files reference a secret instead of embedding it. Keep the secrets out of git and inject them at deploy time.

Environment differences, such as dev, test and prod database hosts, belong in overrides or variables, not in forks of the repository.

> [!note] In 8.1
> 8.1 projects can be exported and the image can restore a Gateway backup at start, but the Gateway configuration is not diffable files. Teams used a Gateway backup (.gwbk) as the unit of deployment. 8.3 makes a git-first workflow practical.

## Licensing and limits

Containers do not remove licensing. A standard Gateway still needs a license activated, and activation tied to a hardware identity can be awkward when a container moves. Ignition 8.3 conference material notes that Kubernetes deployments of standard Ignition use leased activation. Check current docs for your edition.

Containers also do not make Ignition magically highly available. Redundancy still means a primary and backup Gateway pair ({{lesson:arch-patterns}}). Gateways are stateful, so you generally treat them as pets with a good rebuild script, not as cattle you scale to ten identical copies.

## Kubernetes, briefly

**Kubernetes** schedules containers across a cluster, restarts failed ones and handles networking and secrets. **Helm** packages a set of Kubernetes resources as a reusable chart with values. For Ignition, this matters at larger scale: many front-end Gateways, scripted environments, or a company standardizing on a cluster. Inductive Automation has presented deployment patterns for Ignition on Kubernetes at its conference, and said at the time of 8.3's announcement that Helm charts would accompany it. Confirm what is shipped today before promising a customer a chart.

For most single-plant systems, Compose on one well-run host, or a normal VM, is simpler and good enough. Kubernetes is a skill set of its own. Do not adopt it for one Gateway.

## Ignition Cloud Edition

**Cloud Edition** is Ignition sold through cloud marketplaces with usage-based billing, so you pay for what runs instead of buying a perpetual license. It is listed on the AWS Marketplace, and release notes indicate it is available as a container deployable through EKS. The Cloud Edition page lists a pay-as-you-go VM on Azure. Availability varies by region and over time, so check the current listing.

Cloud suits central and enterprise tiers: a front-end Gateway, an analytics Gateway or a dev/test environment you spin up per project. It is a poor fit for a controller-adjacent Gateway that must keep running when the internet link fails. Edge or on-prem Gateways stay near the machines ({{lesson:arch-patterns}}).
`,

  eli5: `
Say you want to bake the same cake in many kitchens. You could mail a cake to each, but it would get stale. Or you could mail a recipe, and every kitchen would make it a little differently.

A Docker image is neither. It is a sealed meal kit with the exact flour, eggs and oven instructions already measured. Any kitchen that opens the kit gets the same cake. The running cake is called a container.

But a kit has no memory. If you throw out the cake, it is gone. So you keep your recipe notes and favorite decorations in a labelled drawer outside the kit. That drawer is a volume. Open a new kit, plug the same drawer in, and you have your old settings.

Docker Compose is a list of several kits to open together, such as a cake kit and a frosting kit that know where each other are. Kubernetes is the big restaurant manager who watches all the kitchens and replaces a cook who goes home sick.
`,

  why: `
**Why containerize at all?** Repeatability. When the Gateway, its modules and its settings come from files, you can rebuild a failed server in minutes, stand up a test copy for a customer demo, and show an auditor exactly what ran. The cost is a learning curve and new failure modes: volumes, networking and image updates.

**Why pin image versions?** \`latest\` means a routine restart can change your Ignition version overnight. Controls people want upgrades scheduled around production, not pulled at 3 a.m. by a restart policy.

**Why keep state in volumes, or in git?** The container is disposable by design. Either the state is in a volume you back up, or it is fully reconstructable from git plus secrets. Both are good. A Gateway with unbacked state inside the container is the worst of both: it looks reproducible and is not. Integrators debate which model to use. Volumes are simpler to start. Git-first is better for many sites and for CI, and 8.3's file-based config makes it feasible.

**Why not Kubernetes everywhere?** Orchestrators solve scaling and self-healing for stateless services. A Gateway is stateful, uses a license and talks to PLCs on specific networks that do not exist in a cluster. The plant floor usually has no one who can debug a cluster at 2 a.m. Use Kubernetes where the organization already runs it and has people to run it.

**Why not run the control Gateway in the cloud?** A WAN outage should not stop the line. Put anything that must survive an internet failure, including the PLC-facing Gateway, on site. Put aggregation, reporting and development in the cloud.
`,

  history: `
Docker appeared in 2013 and made Linux container packaging mainstream. Inductive Automation published an official Ignition image for the 8.x series, with commissioning through environment variables so that Gateways could start without a browser. Ignition 8.3 reworked how projects and configuration are stored on disk to support source control and automated deployment, and Cloud Edition arrived as a marketplace offering with usage-based billing.
`,

  examples: [
    {
      title: "A throwaway dev Gateway",
      body: `A developer runs the compose file above with a bind mount of \`./projects\` into the data directory. The Gateway starts in about a minute, already commissioned, with a MariaDB connection pointing at \`db\`. At the end of the week they run \`docker compose down -v\`, which also removes the volumes, and the whole environment is gone. Next week's is identical.`
    },
    {
      title: "Dev, test, prod from one repo",
      body: `One git repository holds projects and config. A pipeline starts three containers from the same pinned image. Each gets its database host and credentials from environment-specific variables and secrets. A merge to the main branch updates test automatically. Prod needs an approval, then the same image and repo commit are applied. If prod misbehaves, the previous commit and image are the rollback.`
    }
  ],

  diagrams: {
    compose: `<svg viewBox="0 0 640 230" role="img" aria-label="Docker Compose network with an Ignition Gateway container and a database container, each with its own volume, and HTTPS port 8043 published to the host">
  <defs>
    <marker id="arch-containers-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path class="dg-fill-line" d="M0,0 L10,5 L0,10 z"/></marker>
  </defs>
  <rect class="dg-box" x="10" y="10" width="620" height="210" rx="8"/>
  <text class="dg-title" x="24" y="34">Docker host: compose network</text>
  <rect class="dg-box-accent" x="40" y="55" width="220" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="150" y="86">gateway</text>
  <text class="dg-text-mono dg-mid" x="150" y="108">inductiveautomation/ignition</text>
  <rect class="dg-box-accent" x="380" y="55" width="220" height="80" rx="6"/>
  <text class="dg-text dg-mid" x="490" y="86">db</text>
  <text class="dg-text-mono dg-mid" x="490" y="108">mariadb</text>
  <line class="dg-line" x1="260" y1="95" x2="378" y2="95" marker-end="url(#arch-containers-ah)"/>
  <text class="dg-text-sm dg-mid" x="319" y="86">jdbc:db:3306</text>
  <rect class="dg-box" x="40" y="165" width="220" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="150" y="190">volume: gw-data</text>
  <rect class="dg-box" x="380" y="165" width="220" height="40" rx="6"/>
  <text class="dg-text-sm dg-mid" x="490" y="190">volume: db-data</text>
  <line class="dg-line" x1="150" y1="135" x2="150" y2="163"/>
  <line class="dg-line" x1="490" y1="135" x2="490" y2="163"/>
  <text class="dg-text-sm" x="280" y="160">host:8043 to gateway:8043</text>
</svg>`
  },

  pitfalls: [
    "Not mounting a volume for the Gateway data directory, then losing the whole configuration when the container is recreated.",
    "Using localhost in a database connection URL. Inside the Gateway container it points back at the Gateway. Use the service name.",
    "Using the latest tag, so a restart silently upgrades Ignition.",
    "Committing admin and database passwords in a compose file instead of using secrets or _FILE variables.",
    "Pointing a newer image at an old volume and assuming you can roll back by switching the tag back.",
    "Adopting Kubernetes for a single Gateway with nobody on site who can operate a cluster."
  ],

  keyTerms: ["ign-docker", "docker-compose", "docker-volume", "kubernetes", "helm", "cloud-edition", "ignition"],

  quiz: [
    {
      q: "You delete and recreate your Ignition container. It comes up asking to be commissioned again and your projects are gone. What was missing?",
      options: ["A larger memory limit", "A volume or bind mount for the Gateway data directory", "A different image tag", "Port 8088 published"],
      answer: 1,
      explain: [
        "Memory limits affect performance. They do not hold persistent state.",
        "Correct. Without a mount, state lives in the container's disposable filesystem and disappears with the container.",
        "A tag affects the version. It does not control where state is stored.",
        "A published port lets you reach the Gateway. It does not store anything."
      ]
    },
    {
      q: "The Gateway container cannot reach its database container using jdbc:mariadb://localhost:3306/ignition. What is the fix?",
      options: ["Open port 3306 on the plant firewall", "Install a MariaDB driver on the host", "Use the database's compose service name as the host", "Use the host machine's loopback address"],
      answer: 2,
      explain: [
        "The traffic never leaves the Docker network, so the plant firewall is not involved.",
        "The host's drivers are irrelevant. The Gateway container has its own Java and driver.",
        "Correct. Compose gives each service a DNS name on the network, and localhost inside the Gateway container is the Gateway itself.",
        "The host's loopback is also not reachable as localhost from inside a container."
      ]
    },
    {
      q: "Which environment variable is required so the official image skips the license-agreement step of commissioning?",
      options: ["ACCEPT_IGNITION_EULA=Y", "IGNITION_EDITION=standard", "GATEWAY_MODULES_ENABLED=all", "TZ=UTC"],
      answer: 0,
      explain: [
        "Correct. This variable accepts the license agreement and, with admin credentials, lets the Gateway commission without a browser.",
        "That chooses the edition. It does not accept the agreement.",
        "That controls which built-in modules stay enabled.",
        "That sets the time zone. It does not affect commissioning."
      ]
    },
    {
      q: "Why does 8.3's file-based configuration help container-based deployment?",
      options: ["It makes licenses free in containers", "It removes the need for any volume or secret", "It lets Ignition run without Java", "Config and projects are files that diff, merge and live in git, so a pipeline can rebuild a Gateway from a repository"],
      answer: 3,
      explain: [
        "Licensing is unchanged by storage format.",
        "Secrets still must be injected, and runtime data like logs and historian storage still need a home.",
        "Ignition still runs on the JVM.",
        "Correct. Text files in directories can be reviewed, branched and deployed repeatably, which is the point of infrastructure as code."
      ]
    },
    {
      q: "A customer wants the PLC-facing Gateway in a cloud region so they can drop their on-site server. What is the main risk?",
      options: ["A WAN or internet outage stops control-adjacent data collection and screens on site", "Cloud Edition cannot read tags", "Containers cannot use TCP", "The Gateway needs a GPU"],
      answer: 0,
      explain: [
        "Correct. Anything that must keep working through an internet failure belongs on site. The cloud suits aggregation and development.",
        "Tag reading is not the issue. The network path is.",
        "Containers use TCP freely.",
        "Ignition has no GPU requirement."
      ]
    }
  ],

  resources: [
    { title: "Docker Image Examples (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/docker-image/docker-image-examples", type: "docs", source: "Inductive Automation" },
    { title: "Docker Image (Ignition manual)", url: "https://www.docs.inductiveautomation.com/docs/8.1/platform/docker-image", type: "docs", source: "Inductive Automation" },
    { title: "Version and Source Control Guide (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/tutorials/version-control-guide", type: "docs", source: "Inductive Automation" },
    { title: "Secrets Management (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/security/secrets-management", type: "docs", source: "Inductive Automation" },
    { title: "Ignition Cloud Edition (Ignition 8.3 manual)", url: "https://www.docs.inductiveautomation.com/docs/8.3/other-editions/ignition-cloud-edition", type: "docs", source: "Inductive Automation" },
    { title: "Deployment Patterns for Ignition on Kubernetes (ICC 2023)", url: "https://inductiveautomation.com/resources/icc/2023/deployment-patterns-for-ignition-on-kubernetes", type: "video", source: "Inductive Automation" },
    { title: "Ignition Cloud Edition now available in AWS Marketplace", url: "https://inductiveautomation.com/news/ignition-cloud-edition-now-available-in-aws-marketplace", type: "article", source: "Inductive Automation" }
  ]
});
