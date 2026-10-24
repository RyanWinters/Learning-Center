LC.lesson({
  id: "dev-docker",
  title: "Docker fundamentals",
  track: "dev",
  minutes: 25,
  level: 2,
  prereqs: ["dev-linux-services"],
  tags: ["docker", "containers", "volumes", "networking", "wsl2", "devops"],
  summary: "Images, layers, containers, volumes and networks: the model behind every docker command, and why 'localhost' inside a container is not your PC.",
  objectives: [
    "Explain the difference between an image, a layer and a container, and what happens to data written inside a container",
    "Choose between a named volume and a bind mount for a given kind of data",
    "Explain Docker networks, container-name DNS and published ports",
    "Explain why localhost inside a container refers to the container, and how containers reach each other and the host",
    "Describe how Docker Desktop runs Linux containers on Windows through WSL 2, and where to keep files for good performance"
  ],

  body: `
## What a container is

A **container** is a normal Linux process that the kernel fences off: it gets its own view of the filesystem, its own network stack, its own process list and limits on CPU and memory. The fences are Linux kernel features ({{term:cgroups-namespaces|namespaces and cgroups}}). There is no second operating system inside, which is why containers start in seconds and many can share one host.

{{lesson:arch-containers}} covers running Ignition itself in Docker: the official image, its environment variables and a full Gateway-plus-database example. This lesson is the general model underneath, so those examples make sense and so you can troubleshoot any container, not just Ignition's.

## Images and layers

An **image** is a read-only template: a filesystem plus metadata such as which command to start and which port the program uses. Images are built in **{{term:image-layer|layers}}**. Each build step adds a layer that records only what that step changed.

{{diagram:layers}}

A recipe for an image is a {{term:dockerfile|Dockerfile}}. Each instruction such as \`FROM\`, \`RUN\` or \`COPY\` produces a layer. A fragment:

\`\`\`text
FROM python:3.12-slim
RUN pip install --no-cache-dir pymodbus
COPY server.py /app/
\`\`\`

Layers are immutable and identified by their content, so they are shared. Ten images built \`FROM\` the same base store that base once. When you rebuild, Docker reuses every layer whose inputs did not change and rebuilds from the first changed step onward. That is why stable steps (installing packages) go before frequently changing ones (copying your code).

Images live in a {{term:container-registry|registry}} such as Docker Hub or GitHub's container registry. \`docker pull\` downloads one; \`docker push\` uploads one. An image name has a repository and a tag: \`inductiveautomation/ignition:8.3.x\`, where the tag is a label the publisher chooses. {{lesson:dev-compose}} explains why that tag should be pinned.

## Containers: a thin writable layer

A {{term:docker-container|container}} is an image plus **one thin writable layer** on top, plus a running process. The union of layers looks like one normal filesystem to the process. Writes go to the container's own writable layer; the image underneath never changes.

That writable layer is deleted with the container. Upgrading a containerized service means *removing* the old container and starting a new one from the new image. Anything you only wrote inside the container is gone. Every piece of state you care about must live somewhere else.

## Volumes and bind mounts

| | Named volume | Bind mount |
|---|---|---|
| What it is | Storage created and managed by Docker | A specific host folder mapped into the container |
| Example | \`-v ignition-data:/usr/local/bin/ignition/data\` | \`-v /srv/modsim/config:/app/config:ro\` |
| Where the files are | Docker's own storage area | Exactly the host path you named |
| Survives container removal | Yes | Yes (it's just a host folder) |
| Good for | Databases, Gateway data, anything the service owns | Config you edit on the host, source code in development |
| Permission surprises | Fewer; Docker sets it up | Common: host ownership and modes apply by user id |

The \`:ro\` suffix mounts read-only, a cheap way to stop a container changing its own configuration. Bind mounts are where the user-id permissions from {{lesson:dev-linux}} bite: the container process's numeric user must be allowed to read or write the host folder.

> [!warning] Bind-mounting over a populated folder hides it
> Mounting an empty host folder over a path that the image already fills (like a data directory) hides the image's files at that path. Services that expect their default files there then fail on first start. Named volumes behave differently: an empty named volume is initialized from the image's content the first time.

## Networks and published ports

Each container gets its own network stack and its own IP address on a Docker network. Containers on the same **user-defined** {{term:docker-network|network}} can reach each other **by container name**: Docker runs an internal DNS that resolves \`db\` to the database container's address. The default bridge network does not offer name resolution, which is one reason Compose creates a network per project.

Nothing outside the host can reach a container's port until you **publish** it. {{term:port-publishing|Publishing}} with \`-p 8088:8088\` tells Docker to forward the host's port 8088 to the container's port 8088. The two numbers can differ: \`-p 9088:8088\` exposes the container's 8088 as 9088 on the host, handy when two Gateways share one test machine. By default a published port listens on all of the host's interfaces; \`-p 127.0.0.1:8088:8088\` limits it to the host itself.

## localhost inside a container

This is the trap that catches every newcomer, and it follows directly from the {{lesson:dev-linux-services}} rule about loopback.

{{diagram:localhost}}

Inside a container, \`localhost\` and \`127.0.0.1\` mean **the container itself**, because the container has its own network stack. So:

- A Gateway container configured with \`jdbc:postgresql://localhost:5432/meridian\` looks for PostgreSQL *inside the Gateway container*, finds nothing and fails. Use the database container's name: \`db:5432\`.
- A service inside a container that listens only on \`127.0.0.1\` is unreachable even through a published port, because Docker forwards traffic to the container's network interface, not its loopback. Services in containers should listen on \`0.0.0.0\`.
- To reach something running on the host itself, Docker Desktop provides the name \`host.docker.internal\`. On a plain Linux host you use the host's real address or extra configuration.

## Docker on Windows: WSL 2

Containers need a Linux kernel. On Windows, Docker Desktop runs Linux containers inside a lightweight Linux virtual machine provided by the **Windows Subsystem for Linux 2** ({{term:wsl2|WSL 2}}). The \`docker\` command in PowerShell talks to the engine inside that VM.

Two consequences matter for a home lab:

- **Where you keep files matters.** Bind-mounting from the Windows drive (\`C:\\Users\\...\`, which WSL sees as \`/mnt/c/...\`) is much slower than keeping the files in the Linux filesystem (for example \`~/lab\` inside your WSL distribution), and file-change notifications only work reliably on the Linux side. Docker's own guidance is to keep bind-mounted source in the Linux filesystem.
- **Ports appear on Windows.** A port published by a container is reachable from Windows at \`localhost\`, which is convenient but hides the fact that there are three network stacks involved: Windows, the WSL VM and the container.

> [!tip] First moves when a container misbehaves
> \`docker ps -a\` (is it running or did it exit?), \`docker logs <name>\` (what did it print?), \`docker inspect <name>\` (mounts, networks, environment, exit code), and \`docker exec -it <name> sh\` to look around inside. These map one-to-one onto \`systemctl status\`, \`journalctl\` and \`ss\` from the previous lessons.
`,

  eli5: `
An image is a frozen, sealed lunchbox with exactly the same food every time you open one. It was packed in layers: bread, then filling, then sauce. If two lunchboxes share the same bread, the factory only bakes it once.

A container is one opened lunchbox on someone's desk. They can scribble on the napkin inside, but when the lunchbox goes in the bin, so does the napkin. If you want to keep notes, you write them in a notebook that lives outside the lunchbox (a volume), or on a shared whiteboard on the wall (a bind mount).

Each lunchbox sits in its own little room with its own phone. When a program inside dials "localhost", it's calling its own room, not the building's front desk. To call another room, it dials that room's name. To let people from outside the building call in, you set up call forwarding at the front desk (a published port).

On Windows, all those rooms are inside a small Linux annex attached to the main building (WSL 2).
`,

  why: `
**Why immutable images.** "It works on my machine" usually means two machines with slightly different libraries. An image freezes the exact files, so dev, test and production run the same bits. The price is that you never patch a running container; you build or pull a new image and replace the container.

**Why state lives outside.** If state is in the container, upgrading destroys it. Forcing all state into volumes makes upgrades and rollbacks a matter of swapping containers, and makes backups obvious: back up the volumes. It's the container version of separating config, data and program on a server.

**Why name-based networking.** Container IP addresses change every time a container is recreated. Hard-coding them works until the first restart. Container names on a user-defined network are stable, so configuration survives rebuilds.

**Why localhost is a trap and not a bug.** Network isolation is the point of a container. If localhost meant the host, any container could reach every service the host bound to loopback, which would defeat the isolation that keeps a compromised container contained.

**What people argue about.** Named volumes versus bind mounts for production data. Volumes are simpler and avoid permission problems; bind mounts make the files easy to see, back up with existing tools and inspect. Many teams use volumes for databases and Gateway data, and read-only bind mounts for configuration they keep in Git.
`,

  history: `
The building blocks are older than Docker: Unix chroot, FreeBSD jails, Solaris zones, and the Linux kernel's namespaces and cgroups. Docker, released by dotCloud (later renamed Docker, Inc.), packaged those features with a simple image format, layered builds and a public registry, which made containers mainstream. Its image and runtime formats were later standardized through the Open Container Initiative, so images built with Docker also run under other runtimes such as containerd and Podman.
`,

  examples: [
    {
      title: "The Gateway that couldn't find its database",
      body: `In a home lab, Ignition and PostgreSQL run as two containers on one Docker network. The database connection uses \`localhost:5432\` and faults. \`docker exec -it ignition sh\` then \`nc -vz localhost 5432\` fails, but \`nc -vz db 5432\` succeeds. Changing the connection URL host to \`db\` fixes it. Nothing was wrong with the database.`
    },
    {
      title: "Slow lab on Windows",
      body: `A Modbus simulator container bind-mounts its config from \`C:\\lab\\modsim\`. Restarts are slow and edits are not picked up. Moving the folder into the WSL 2 filesystem (\`~/lab/modsim\`) and mounting from there fixes both.`
    }
  ],

  diagrams: {
    layers: `<svg viewBox="0 0 640 220" role="img" aria-label="Image layers stacked read-only with a thin writable container layer on top; two containers share the same image layers">
  <text class="dg-title" x="20" y="26">Two containers from one image</text>
  <rect class="dg-box-accent" x="40" y="44" width="250" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="165" y="64">writable layer (container A)</text>
  <rect class="dg-box-accent" x="350" y="44" width="250" height="30" rx="4"/>
  <text class="dg-text-sm dg-mid" x="475" y="64">writable layer (container B)</text>
  <rect class="dg-box" x="40" y="88" width="560" height="30" rx="4"/>
  <text class="dg-text-mono dg-mid" x="320" y="108">COPY server.py</text>
  <rect class="dg-box" x="40" y="122" width="560" height="30" rx="4"/>
  <text class="dg-text-mono dg-mid" x="320" y="142">RUN pip install pymodbus</text>
  <rect class="dg-box" x="40" y="156" width="560" height="30" rx="4"/>
  <text class="dg-text-mono dg-mid" x="320" y="176">FROM python:3.12-slim (base layers)</text>
  <text class="dg-text-muted" x="40" y="210">Image layers: read-only, shared. Writable layer: per container, deleted with it.</text>
</svg>`,
    localhost: `<svg viewBox="0 0 640 240" role="img" aria-label="Inside the Gateway container, localhost points back to the Gateway container; the database is reached by its name db over the Docker network; the host publishes port 8088">
  <defs><marker id="dev-docker-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-zone" x="20" y="20" width="600" height="200" rx="8"/>
  <text class="dg-title" x="36" y="44">Docker host</text>
  <rect class="dg-zone" x="60" y="60" width="520" height="140" rx="8"/>
  <text class="dg-text-muted" x="76" y="80">user-defined network</text>
  <rect class="dg-box-accent" x="90" y="96" width="180" height="80" rx="6"/>
  <text class="dg-text-sm" x="104" y="120">ignition</text>
  <text class="dg-text-mono" x="104" y="142">localhost:5432</text>
  <text class="dg-text-muted" x="104" y="162">= itself, nothing there</text>
  <rect class="dg-box" x="380" y="96" width="170" height="80" rx="6"/>
  <text class="dg-text-sm" x="394" y="120">db</text>
  <text class="dg-text-mono" x="394" y="142">0.0.0.0:5432</text>
  <line class="dg-line" x1="270" y1="136" x2="378" y2="136" marker-end="url(#dev-docker-ah)"/>
  <text class="dg-text-mono dg-mid" x="324" y="126">db:5432</text>
  <path class="dg-line-alarm dg-dash" fill="none" d="M150 176 C150 196 220 196 220 176"/>
  <text class="dg-text-muted" x="236" y="196">loops back into itself</text>
  <text class="dg-text-mono" x="430" y="44">-p 8088:8088</text>
</svg>`
  },

  pitfalls: [
    "Writing important data inside the container instead of a volume, then losing it on the first upgrade.",
    "Using localhost in a container to reach another container or the host.",
    "Binding a service inside a container to 127.0.0.1, so published ports can't reach it.",
    "Bind-mounting an empty host folder over a directory the image needs populated.",
    "Keeping lab files on the Windows drive and bind-mounting them through WSL 2, then fighting slowness."
  ],

  keyTerms: ["docker-container", "image-layer", "dockerfile", "container-registry", "docker-volume", "docker-network", "port-publishing", "cgroups-namespaces", "wsl2", "ign-docker"],

  quiz: [
    {
      q: "You upgrade a container by removing it and starting a new one from a newer image. Which data survives?",
      options: ["Everything the old container wrote anywhere", "Only data stored in volumes or bind mounts", "Only files under /tmp", "Nothing; all data is lost"],
      answer: 1,
      explain: [
        "Writes to the container's own writable layer are deleted with the container.",
        "Correct. Volumes and bind mounts live outside the container, so they outlast it.",
        "/tmp is inside the writable layer like everything else.",
        "Volume and bind-mount data survives; that's what they're for."
      ]
    },
    {
      q: "An Ignition container's database connection uses jdbc:postgresql://localhost:5432/meridian, and PostgreSQL runs in a container named db on the same network. Why does it fail?",
      options: ["PostgreSQL doesn't support Docker", "Port 5432 must be published to the host first", "localhost inside the Ignition container means the Ignition container itself", "The network needs a static IP"],
      answer: 2,
      explain: [
        "PostgreSQL runs fine in containers.",
        "Container-to-container traffic on the same network doesn't need published ports.",
        "Correct. Use the container name db as the host instead.",
        "Name-based DNS on a user-defined network removes the need for static IPs."
      ]
    },
    {
      q: "Why do Dockerfiles usually install packages before copying application code?",
      options: ["Layers whose inputs didn't change are reused, so code edits don't force a slow package reinstall", "Docker requires that order", "Packages need the code to exist", "It makes the image smaller"],
      answer: 0,
      explain: [
        "Correct. Docker rebuilds from the first changed step, so put the stable, slow steps first.",
        "Docker allows any order.",
        "It's usually the other way round.",
        "The final size is about the same; the gain is rebuild speed."
      ]
    },
    {
      q: "Two test Gateways on one machine both listen on 8088 inside their containers. How do you reach both from your browser?",
      options: ["You can't; the ports clash", "Change Ignition's internal port in one image", "Put them on different Docker networks", "Publish one as -p 8088:8088 and the other as -p 9088:8088"],
      answer: 3,
      explain: [
        "Each container has its own network stack, so only the host-side ports must differ.",
        "Unnecessary; the host-side port mapping solves it.",
        "Networks don't change which host port is published.",
        "Correct. Host 9088 forwards to the second container's 8088."
      ]
    },
    {
      q: "On Windows with Docker Desktop, a bind-mounted config folder on C: makes the container slow. What's the recommended fix?",
      options: ["Switch to Windows containers", "Keep the files in the WSL 2 Linux filesystem and mount them from there", "Give Docker more RAM", "Use port publishing"],
      answer: 1,
      explain: [
        "Linux images don't run as Windows containers.",
        "Correct. Docker's WSL guidance is to keep bind-mounted files on the Linux side.",
        "Memory isn't the bottleneck; cross-filesystem access is.",
        "Ports have nothing to do with file access."
      ]
    }
  ],

  resources: [
    { title: "What is Docker? (Docker overview)", url: "https://docs.docker.com/get-started/docker-overview/", type: "docs", source: "Docker Docs" },
    { title: "Understanding the image layers", url: "https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/", type: "docs", source: "Docker Docs" },
    { title: "Storage (volumes, bind mounts, tmpfs)", url: "https://docs.docker.com/engine/storage/", type: "docs", source: "Docker Docs" },
    { title: "Docker Desktop WSL 2 backend on Windows", url: "https://docs.docker.com/desktop/features/wsl/", type: "docs", source: "Docker Docs" },
    { title: "WSL best practices (Docker Desktop)", url: "https://docs.docker.com/desktop/features/wsl/best-practices", type: "docs", source: "Docker Docs" }
  ]
});
