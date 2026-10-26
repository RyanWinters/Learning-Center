LC.lesson({
  id: "dev-compose",
  title: "Docker Compose and configuration",
  track: "dev",
  minutes: 25,
  level: 3,
  prereqs: ["dev-docker"],
  tags: ["docker", "compose", "healthcheck", "secrets", "configuration", "devops"],
  summary: "Describe a multi-container system in one file, decide what 'healthy' means, start things in the right order, and keep passwords and version drift out of it.",
  objectives: [
    "Explain what a Compose project, service, network and volume are, and how service names become hostnames",
    "Design a healthcheck: what signal means healthy, and how interval, timeout, retries and start period interact",
    "Explain what depends_on does with and without condition: service_healthy",
    "Separate configuration (.env, interpolation) from secrets (files mounted at /run/secrets)",
    "Pin image versions and explain the difference between a tag and a digest"
  ],

  body: `
## One file for the whole system

A real system is never one container. A Meridian Foods lab stack might be an Ignition Gateway, a PostgreSQL database, an MQTT broker and a soft PLC. Typing four long \`docker run\` commands in the right order with the right networks and volumes is error-prone. {{term:docker-compose|Docker Compose}} describes the whole set in one YAML file (\`compose.yaml\`), and \`docker compose up -d\` creates everything.

{{lesson:arch-containers}} shows a Gateway-plus-database Compose example. This lesson explains the parts you have to *decide* about: health, order, configuration, secrets and versions.

## Projects, services, networks, volumes

| Compose concept | What it becomes |
|---|---|
| **Project** | The folder name (or \`-p\` name); prefixes everything Compose creates |
| **Service** | One kind of container, e.g. \`db\`; can scale to several replicas |
| **Network** | A user-defined network per project, created automatically |
| **Volume** | Named volumes declared once and mounted into services |

Each **service name is a hostname** on the project network. That is how a Gateway reaches its database at \`db:5432\` without any IP address, as you saw in {{lesson:dev-docker}}.

A service definition fragment, showing the shape rather than a full file:

\`\`\`text
services:
  db:
    image: postgres:16.4
    volumes:
      - db-data:/var/lib/postgresql/data
\`\`\`

## Healthchecks: what does "healthy" mean?

By default Docker only knows whether a container's main process is **running**. A database that is still replaying its log, or a Gateway that is up but hasn't finished loading modules, is "running" and useless. A {{term:healthcheck}} is a command Docker runs inside the container on a schedule. Exit code **0 means healthy**, **1 means unhealthy**, using the same exit-code contract from {{lesson:dev-bash}}.

{{diagram:health}}

The settings work together:

| Setting | Meaning | Design question |
|---|---|---|
| \`test\` | The command to run | What signal proves the service can do its job? |
| \`interval\` | Time between checks | How fast must you notice a failure? |
| \`timeout\` | How long one check may take | Longer than a normal response under load |
| \`retries\` | Consecutive failures before "unhealthy" | How many blips do you tolerate? |
| \`start_period\` | Grace time after start; failures don't count yet | How long is a normal cold start? |

The \`test\` can be an argument list run directly (\`["CMD", ...]\`) or a string run through a shell (\`CMD-SHELL\`). The image must contain whatever tool the check uses. Minimal images often have no \`curl\`, so a check that calls it fails forever. Defaults for the timing values are listed in the Compose and Dockerfile references; set them explicitly so the next reader doesn't have to look them up.

> [!tip] Good checks are cheap, local and meaningful
> - **Meaningful:** prove the service does its job (accepts a query, answers its status endpoint), not just that a port is open.
> - **Local:** check this service only. A Gateway's healthcheck that fails when the database is down makes Docker report the wrong container as broken.
> - **Cheap:** it runs every few seconds forever. No heavy queries, no writes.
> - **Fails with a reason:** print one short line to stderr before exiting non-zero; it appears in \`docker inspect\`.

A healthcheck does **not** restart anything by itself in plain Docker or Compose. It changes a status that other things act on: \`depends_on\` conditions, \`docker ps\`, and your monitoring. Restarting crashed containers is the job of the {{term:restart-policy|restart policy}} (\`restart: unless-stopped\` and similar).

## Startup order: depends_on

\`depends_on\` lists services that must start first. On its own it only orders container *starts*: Compose starts \`db\` before \`gateway\`, but does not wait for the database to be ready.

| Form | Compose waits for |
|---|---|
| \`depends_on: [db]\` | The \`db\` container to be started |
| \`condition: service_started\` | Same as above |
| \`condition: service_healthy\` | \`db\`'s healthcheck to report healthy |
| \`condition: service_completed_successfully\` | \`db\`'s container to exit 0 (one-shot setup jobs) |

\`service_healthy\` is only as good as the dependency's healthcheck. And order is only about **startup**. If the database restarts at 2 a.m., Compose won't restart the Gateway; the Gateway's own reconnect logic and store-and-forward have to cope, which is how production should behave anyway.

## Configuration: .env and interpolation

Compose substitutes variables into the file before it runs: \`image: postgres:\${PG_VERSION}\`. Values come from your shell environment, then an \`--env-file\` if given, then a file named {{term:env-file|.env}} next to \`compose.yaml\`. Shell variables win over the file.

Two interpolation forms save debugging:

\`\`\`text
\${GATEWAY_NAME:-meridian-lab}       # default if unset or empty
\${PG_VERSION:?set PG_VERSION in .env}   # stop with an error if unset or empty
\`\`\`

Use \`.env\` for things that differ between machines but aren't secret: names, published ports, version numbers. Commit a \`.env.example\` with safe placeholder values; keep the real \`.env\` out of Git.

## Secrets are files, not environment variables

Environment variables are visible to every process in the container, appear in \`docker inspect\`, and leak into crash dumps and support bundles. Passwords belong in {{term:docker-secret|secrets}}.

Compose mounts each secret as a read-only file at \`/run/secrets/<name>\` inside the container. Many images follow a \`_FILE\` convention: instead of \`POSTGRES_PASSWORD=...\` you set \`POSTGRES_PASSWORD_FILE=/run/secrets/db_password\` and the image reads the file. The Ignition image supports the same pattern for its admin password, as {{lesson:arch-containers}} shows. The \`_FILE\` convention belongs to each image, so check that image's documentation.

The secret's source file on the host needs the permission discipline from {{lesson:dev-linux}}: owned by you, mode \`600\`, listed in \`.gitignore\`.

## Pin your image versions

An image reference has a **tag** and, underneath, a **digest**.

| Reference | Example | Can change under you? |
|---|---|---|
| No tag (means \`latest\`) | \`postgres\` | Yes, any time |
| Floating major tag | \`postgres:16\` | Yes, on every minor or patch release |
| Exact version tag | \`postgres:16.4\` | Rarely, but publishers *can* move tags |
| {{term:image-digest\\|Digest}} | \`postgres@sha256:…\` | No; it names exact content |

Tags are mutable labels. If your Compose file says \`latest\`, two engineers who run \`docker compose pull\` a week apart get different software, and a rebuilt lab no longer matches the one you tested. Pin an exact version tag at minimum. For anything you must reproduce precisely (a validated system, a release), pin the digest too. Then upgrade deliberately: change the pin in a pull request, test, merge. {{lesson:dev-ci}} shows how Dependabot can propose those pull requests for you.

For Ignition, pin the exact 8.3 patch version the project was tested on; the Gateway and its modules are version-sensitive.
`,

  eli5: `
Compose is a seating plan and instruction sheet for a dinner party. It lists every guest (service), which table they sit at (network), what each one brings (volumes) and who must arrive before whom (depends_on).

"Arrived" and "ready" are different. A guest can be in the door but still taking off their coat. A healthcheck is the host asking, every few minutes, "are you ready to eat?" and waiting for a clear yes. depends_on with service_healthy means "don't seat the main course chef until the kitchen helper says they're ready", not just "until the kitchen helper's car is in the drive".

The .env file is the sticky note with things that change between parties: how many places, which room. Secrets are the house keys: you don't write those on a sticky note on the fridge. You hand them over in a sealed envelope (a file in /run/secrets).

Pinning versions means ordering "the 2024 vintage" instead of "whatever wine is on the shelf", so next year's party tastes the same.
`,

  why: `
**Why healthchecks need design, not copy-paste.** A check that only tests "port open" marks a Gateway healthy long before it can serve a page. A check that tests the database from the Gateway container blames the wrong container. The check is a statement of what "working" means for that one service. That's an engineering decision, like choosing which signal drives a comm-loss alarm.

**Why depends_on isn't enough.** Ordering starts is not the same as ordering readiness, and neither covers a dependency that restarts later. Systems that only work when started in a perfect order fail in production at the first database reboot. Use healthy conditions for clean starts, and make each service tolerate its dependencies coming and going.

**Why secrets as files.** Environment variables were designed for configuration, not secrets. They are inherited by child processes, printed by debugging tools and copied into support bundles. Files under \`/run/secrets\` are visible only inside the container and only to processes that can read them.

**Why pin.** Reproducibility. If you can't rebuild exactly what passed testing, the test record means little. Floating tags also turn an unrelated restart into a surprise upgrade.

**What people argue about.** Pinning digests versus exact tags. Digests are exact but unreadable and need tooling to update; exact tags are readable and usually stable. Many teams pin a tag in day-to-day files and record the resolved digest at release time. Another debate is whether Compose belongs in production at all. For single-host edge and lab systems it's common; for multi-host clusters teams move to an orchestrator like Kubernetes.
`,

  history: `
Compose began as Fig, a tool from Orchard Labs that Docker acquired and renamed Docker Compose. It started as a separate Python program invoked as \`docker-compose\`, and was later rewritten and integrated into the Docker CLI as \`docker compose\` (a space instead of a hyphen). The file format was published as the open Compose Specification, which removed the need for the old \`version:\` field at the top of the file.
`,

  examples: [
    {
      title: "Healthy too early",
      body: `A lab Gateway's healthcheck only tested that TCP 8088 accepted a connection. The web server opens that port early in startup, so dependent containers started while the Gateway was still loading modules and failed their first requests. The fix was to change what the check measured to a signal that only appears once the Gateway is fully running, and to set a \`start_period\` longer than a normal cold start.`
    },
    {
      title: "Two labs, two versions",
      body: `Two engineers' Compose files both said \`postgres:latest\`. One pulled in March, the other in September after a new major version. A restore from one lab failed on the other. Pinning \`postgres:16.4\` in the file and storing the file in Git made both labs identical again, and upgrades now arrive as reviewed pull requests.`
    }
  ],

  diagrams: {
    health: `<svg viewBox="0 0 640 220" role="img" aria-label="Healthcheck timeline: start period where failures don't count, then interval checks; consecutive failures reaching retries mark the container unhealthy">
  <text class="dg-title" x="20" y="26">Container health over time</text>
  <line class="dg-line" x1="20" y1="120" x2="620" y2="120"/>
  <rect class="dg-box-warn" x="20" y="60" width="170" height="40" rx="4"/>
  <text class="dg-text-sm dg-mid" x="105" y="85">start_period</text>
  <text class="dg-text-muted" x="24" y="140">failures ignored</text>
  <circle class="dg-fill-alarm" cx="80" cy="120" r="6"/>
  <circle class="dg-fill-alarm" cx="150" cy="120" r="6"/>
  <circle class="dg-fill-ok" cx="230" cy="120" r="6"/>
  <circle class="dg-fill-ok" cx="300" cy="120" r="6"/>
  <circle class="dg-fill-ok" cx="370" cy="120" r="6"/>
  <circle class="dg-fill-alarm" cx="440" cy="120" r="6"/>
  <circle class="dg-fill-alarm" cx="510" cy="120" r="6"/>
  <circle class="dg-fill-alarm" cx="580" cy="120" r="6"/>
  <text class="dg-text-muted dg-mid" x="265" y="104">interval</text>
  <line class="dg-line-thin" x1="230" y1="110" x2="300" y2="110"/>
  <rect class="dg-box-ok" x="210" y="160" width="190" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="305" y="182">healthy</text>
  <rect class="dg-box-alarm" x="420" y="160" width="200" height="34" rx="4"/>
  <text class="dg-text-sm dg-mid" x="520" y="182">unhealthy after 3 = retries</text>
</svg>`
  },

  pitfalls: [
    "Using depends_on without a health condition and assuming the dependency is ready.",
    "A healthcheck that only proves a port is open, or that tests another service.",
    "A healthcheck that calls a tool (curl, wget) the image doesn't contain.",
    "Passwords in environment variables or committed in .env.",
    "Using latest or a floating major tag, so a pull silently upgrades the system."
  ],

  keyTerms: ["docker-compose", "healthcheck", "depends-on", "restart-policy", "env-file", "docker-secret", "image-tag", "image-digest"],

  quiz: [
    {
      q: "A Gateway service has depends_on: [db] with no condition. What does Compose guarantee?",
      options: ["The database is accepting queries before the Gateway starts", "The Gateway restarts whenever db restarts", "Nothing; depends_on is ignored", "The db container is started before the Gateway container"],
      answer: 3,
      explain: [
        "That needs condition: service_healthy and a meaningful healthcheck on db.",
        "Compose doesn't do that; services must handle dependencies coming back.",
        "It's not ignored; it sets start order.",
        "Correct. Plain depends_on only orders container starts."
      ]
    },
    {
      q: "Which is the best healthcheck design for a PostgreSQL service in the lab stack?",
      options: ["Check that the Ignition Gateway can query the database", "Run the database's own readiness check inside the db container", "Ping the db container's IP from the host", "Check that the container's main process exists"],
      answer: 1,
      explain: [
        "That tests two services at once and blames the database when the Gateway has a problem.",
        "Correct. It's local, cheap and proves the database can accept connections.",
        "Ping proves the network stack is up, not that the database works.",
        "Docker already knows whether the process is running; that's what healthchecks add to."
      ]
    },
    {
      q: "Where should a database password come from in a Compose stack?",
      options: ["An environment variable written in compose.yaml", "The .env file committed to Git", "A secret mounted at /run/secrets, read by the image via a _FILE variable", "A label on the container"],
      answer: 2,
      explain: [
        "Visible in the file, in docker inspect and to every process.",
        ".env is for non-secret configuration and shouldn't hold passwords.",
        "Correct. The password is a file only the container can read, kept out of Git.",
        "Labels are metadata and are visible to anyone who can inspect the container."
      ]
    },
    {
      q: "Your validated system uses image postgres:16. Why is that a risk?",
      options: ["The 16 tag moves to each new 16.x release, so a pull can change the software", "Tag 16 doesn't exist", "Major tags are slower to download", "Compose rejects floating tags"],
      answer: 0,
      explain: [
        "Correct. Pin an exact version, and a digest if you need byte-for-byte reproducibility.",
        "It exists; that's why it's tempting.",
        "Download speed is the same.",
        "Compose accepts any tag."
      ]
    },
    {
      q: "A healthcheck has interval 10 s, retries 3 and start_period 60 s. The service fails every check from second 0 to second 50, then passes. What status does it reach?",
      options: ["Unhealthy at second 30", "Unhealthy forever once it has failed", "Starting forever", "Healthy, because failures during the start period don't count"],
      answer: 3,
      explain: [
        "Failures inside start_period aren't counted toward retries.",
        "A container goes back to healthy when checks pass again.",
        "A successful check ends the starting state.",
        "Correct. The first success marks it healthy."
      ]
    }
  ],

  resources: [
    { title: "Control startup and shutdown order in Compose", url: "https://docs.docker.com/compose/how-tos/startup-order/", type: "docs", source: "Docker Docs" },
    { title: "Set, use, and manage variables with interpolation", url: "https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/", type: "docs", source: "Docker Docs" },
    { title: "Manage secrets securely in Docker Compose", url: "https://docs.docker.com/compose/how-tos/use-secrets/", type: "docs", source: "Docker Docs" },
    { title: "Building best practices (pinning base image versions)", url: "https://docs.docker.com/build/building/best-practices/", type: "docs", source: "Docker Docs" }
  ]
});
