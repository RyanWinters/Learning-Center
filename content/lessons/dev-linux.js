LC.lesson({
  id: "dev-linux",
  title: "Linux essentials for integrators",
  track: "dev",
  minutes: 25,
  level: 2,
  prereqs: ["net-data"],
  tags: ["linux", "filesystem", "permissions", "apt", "devops"],
  summary: "Where things live on a Linux server, who is allowed to touch them, and how software gets installed: the three questions behind most 'it works on my laptop' failures.",
  objectives: [
    "Say what /etc, /var/log, /opt, /usr/local and /home are for, and where to look first for config and logs",
    "Read an ls -l line: type, owner, group and the three rwx triplets",
    "Convert between rwx and octal modes such as 640, 750 and 600, and pick the right one for a file",
    "Explain users, groups, root and sudo, and why services run as their own user",
    "Install, update and remove packages with apt, and know what apt update and apt upgrade each do"
  ],

  body: `
## Why an Ignition person needs Linux

Most of the servers you will deploy from now on run Linux, even when nobody in the plant says so. The official Ignition Docker image is Linux. Cloud VMs default to Linux. MQTT brokers, PostgreSQL, Grafana and open-source soft PLCs all run on it. When a container will not start or a service cannot write its data, the cause is usually one of three things: the file is not where you think, the process is not allowed to touch it, or a package is the wrong version. This lesson covers exactly those three.

Everything here applies to Debian and Ubuntu, the {{term:linux-distro|distributions}} you will meet most. Red Hat family systems use the same layout and permissions but a different package tool (\`dnf\`).

## The filesystem layout

Linux has one tree that starts at \`/\`. There are no drive letters. A second disk is *mounted* at some folder, such as \`/data\`, and from then on it looks like part of the tree. The {{term:fhs|Filesystem Hierarchy Standard}} (FHS) says what each top-level folder is for, so every distribution puts things in roughly the same place.

{{diagram:tree}}

| Path | What lives there | Integrator's rule of thumb |
|---|---|---|
| \`/etc\` | System and service configuration, as plain text files | Config goes here. Back it up. Never put data here. |
| \`/var/log\` | Log files written by the system and by services | First place to look when something failed |
| \`/var/lib\` | Variable state of installed services (databases, caches) | PostgreSQL's data usually lives under here |
| \`/opt\` | Add-on application packages installed as a whole | Vendor bundles that keep everything in one folder |
| \`/usr/local\` | Software the administrator installs locally, outside the package manager | The official Ignition image keeps Ignition under \`/usr/local/bin/ignition\` |
| \`/home/<user>\` | Each person's own files | Never run a service from someone's home folder |
| \`/tmp\` | Temporary files, often cleared on reboot | Never store anything you need tomorrow |

The split between \`/opt\` and \`/usr/local\` confuses everyone. FHS reserves \`/opt\` for add-on application packages and \`/usr/local\` for software the administrator installs locally. In practice, vendors choose one, and your job is to know which, so you can find the config and data.

> [!example] Meridian Foods Plant 1: where is everything?
> The Level 3 Ubuntu server \`10.20.30.20\` runs PostgreSQL and a Mosquitto MQTT broker. Its broker config is in \`/etc/mosquitto/\`, its log is in \`/var/log/mosquitto/\`, and the database files are under \`/var/lib/postgresql/\`. When the night shift says "MQTT stopped", you open the log first, not the config.

## Users, groups and root

Every process runs as a **user**, and every file has an **owner** and a **group**. That is how Linux decides who may do what.

- **root** (user id 0) can do anything. It bypasses every permission check.
- **Normal users** are people (\`ryan\`, \`jsmith\`).
- **System users** exist only to run one service (\`postgres\`, \`mosquitto\`). Nobody logs in as them.
- **Groups** collect users so you can grant access once. Add an engineer to the \`docker\` group and they can run Docker without root.

You rarely log in as root. Instead you prefix a command with {{term:sudo}}, which runs that one command as root after checking you are allowed to. \`sudo\` also writes a log line, so there is a record of who did what.

> [!warning] Being in the docker group is root in disguise
> Anyone who can start containers can mount \`/\` into one and edit any file on the host. Treat membership of the \`docker\` group with the same care as sudo rights.

## Reading permissions

Run \`ls -l\` and you see lines like this:

\`\`\`text
-rw-r-----  1 postgres postgres   4211 Oct 20 09:14 postgresql.conf
drwxr-x---  5 ignition ignition   4096 Oct 20 09:10 data
-rwxr-xr-x  1 root     root      18056 Oct 01 11:02 backup.sh
\`\`\`

The first character is the type: \`-\` is a file, \`d\` a directory, \`l\` a symbolic link. The next nine characters are three **triplets** of {{term:linux-permissions|permissions}}: owner, group, everyone else. Each triplet is read (\`r\`), write (\`w\`) and execute (\`x\`), or \`-\` when missing. Then come the owner and group.

On a **directory**, the letters mean slightly different things: \`r\` lets you list names, \`w\` lets you create and delete files inside, and \`x\` lets you enter it and reach files inside. A directory with \`r\` but no \`x\` is a common puzzle: you can see the names but cannot open any of them.

## Octal modes

Each triplet is three bits, so it fits one octal digit (0–7). That is why you will see \`chmod 640\` in every guide. If binary is rusty, revisit {{lesson:net-data}}.

{{diagram:octal}}

| Bit | Value |
|---|---|
| r | 4 |
| w | 2 |
| x | 1 |

Add the values for each triplet, then write the three digits as owner, group, other.

| Mode | Letters | Typical use |
|---|---|---|
| \`600\` | \`rw-------\` | A secret or password file only its owner reads |
| \`640\` | \`rw-r-----\` | Config file the service group may read |
| \`644\` | \`rw-r--r--\` | Ordinary readable file |
| \`750\` | \`rwxr-x---\` | Script or data folder for owner and group only |
| \`755\` | \`rwxr-xr-x\` | Program or public directory |
| \`777\` | \`rwxrwxrwx\` | Almost never right. Anyone can change it. |

A fourth, leading digit exists for special bits: setuid (4), setgid (2) and the sticky bit (1). You will mostly meet the sticky bit on \`/tmp\` (mode \`1777\`), which stops users deleting each other's files.

The commands are short:

\`\`\`text
sudo chown ignition:ignition /srv/ignition-data    # change owner and group
sudo chmod 750 /srv/ignition-data                  # set the mode in octal
sudo chmod g+r /etc/mosquitto/passwd               # or adjust with letters
\`\`\`

> [!tip] Why this matters for containers
> A container process runs as some user id inside the container. When you bind-mount a host folder into it, the host's permissions on that folder still apply, by number. If the container's user id cannot write the folder, the service fails at startup with "permission denied". {{lesson:dev-docker}} returns to this.

## Installing software with apt

Debian and Ubuntu install software as **packages** from online **repositories**, using {{term:apt|APT}}. The package manager tracks every file a package installs, so it can upgrade or remove it cleanly.

| Command | What it does |
|---|---|
| \`sudo apt update\` | Refreshes the list of available packages. Installs nothing. |
| \`sudo apt upgrade\` | Installs newer versions of packages you already have |
| \`sudo apt install postgresql\` | Installs a package and its dependencies |
| \`sudo apt remove <pkg>\` | Removes a package but keeps its config files |
| \`sudo apt purge <pkg>\` | Removes the package and its config files |
| \`apt list --installed\` | Shows what is installed and at which version |

The repositories are listed in \`/etc/apt/sources.list\` and files under \`/etc/apt/sources.list.d/\`. Vendors that publish their own repository add a file there plus a signing key.

\`apt\` is the friendly command for people at a terminal. \`apt-get\` is the older, stable-output version that scripts and Dockerfiles use. They share the same machinery.

> [!note] Package versions are a moving target
> \`apt install postgresql\` today and \`apt install postgresql\` in six months can give different versions. On a production server, write down what you installed, and test upgrades on a non-production machine first. {{lesson:dev-compose}} applies the same idea to container images.
`,

  eli5: `
Think of a Linux server as a very well-organized warehouse.

There is one big building with labeled aisles. The aisle marked "settings" holds every machine's instruction sheet. The aisle marked "logs" holds the diaries where machines write down what happened. There is an aisle for big vendor-supplied kits and an aisle for things the warehouse manager built themselves. If you know the labels, you can find anything without asking.

Every shelf has a sign saying who owns it, which team may use it, and what everyone else may do: look, change, or run. The warehouse manager (root) has a master key that opens everything, so they only use it when necessary and sign the logbook each time (that's sudo).

Getting new equipment works through a catalog (apt). You ask for an item by name, and the catalog delivers it with all its parts and remembers exactly what it put where, so it can take it away cleanly later.
`,

  why: `
**Why a fixed layout?** If every service invented its own folders, every server would be a scavenger hunt. FHS means a stranger can log into your server at 3 a.m. and look in \`/var/log\` and \`/etc\` without reading your notes. That stranger is often you, two years later.

**Why services run as their own user.** If the MQTT broker runs as root and has a bug, the attacker owns the whole server. If it runs as \`mosquitto\` with access only to its own files, the damage stays small. This is {{term:least-privilege|least privilege}}, the same idea as Ignition roles and ISA/IEC 62443 zones.

**Why 777 is a smell.** When something fails with "permission denied", the fast fix is \`chmod 777\`. It works, and it means any process on the box can now change that file, including a compromised one. Experienced integrators fix ownership instead: make the service user the owner and give the minimum mode.

**Why a package manager instead of downloading installers.** A package manager knows every file it put on disk and every dependency it pulled in. It can upgrade everything in one command and remove it cleanly. A hand-installed tarball is invisible to all of that, which is why vendor software in \`/opt\` or \`/usr/local\` needs its own written upgrade procedure.

**What people argue about.** Ubuntu versus Debian versus Red Hat family distributions. For a plant server the deciding factors are the vendor's support matrix, the length of security support and what your IT department already patches. Pick the one you can keep patched.
`,

  history: `
Linux began as Linus Torvalds' hobby kernel and was combined with the GNU tools to make a full Unix-like system. The permission model of owner, group and other with read, write and execute bits comes from the original Unix systems, which is why it looks so compact. Debian's dpkg and later APT gave Linux a package manager that resolves dependencies automatically. The Filesystem Hierarchy Standard grew out of efforts to make distributions lay out files consistently, and is now published by freedesktop.org.
`,

  examples: [
    {
      title: "A service that cannot write its log",
      body: `A new MQTT broker on the Level 3 server fails on start. \`journalctl\` shows "Permission denied: /var/log/mosquitto/mosquitto.log". \`ls -l /var/log/mosquitto\` shows the folder is owned by root with mode \`755\`. The fix is \`sudo chown mosquitto:mosquitto /var/log/mosquitto\`, not \`chmod 777\`. The service user now owns its own log folder and nobody else can write there.`
    },
    {
      title: "Locking down a password file",
      body: `You keep a database password for a backup script in \`/etc/meridian/db.pass\`. Set it to owner \`root\`, group \`backup\`, mode \`640\`: root can edit it, the backup group can read it, and everyone else sees nothing. \`600\` would be tighter still if only root runs the script.`
    }
  ],

  diagrams: {
    tree: `<svg viewBox="0 0 640 250" role="img" aria-label="The Linux directory tree: root with etc, var with log and lib, opt, usr with local, home and tmp">
  <rect class="dg-box-accent" x="280" y="16" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="320" y="38">/</text>
  <line class="dg-line" x1="320" y1="50" x2="320" y2="70"/>
  <line class="dg-line" x1="60" y1="70" x2="590" y2="70"/>
  <line class="dg-line" x1="60" y1="70" x2="60" y2="88"/>
  <line class="dg-line" x1="166" y1="70" x2="166" y2="88"/>
  <line class="dg-line" x1="272" y1="70" x2="272" y2="88"/>
  <line class="dg-line" x1="378" y1="70" x2="378" y2="88"/>
  <line class="dg-line" x1="484" y1="70" x2="484" y2="88"/>
  <line class="dg-line" x1="590" y1="70" x2="590" y2="88"/>
  <rect class="dg-box" x="20" y="88" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="60" y="110">/etc</text>
  <rect class="dg-box" x="126" y="88" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="166" y="110">/var</text>
  <rect class="dg-box" x="232" y="88" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="272" y="110">/opt</text>
  <rect class="dg-box" x="338" y="88" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="378" y="110">/usr</text>
  <rect class="dg-box" x="444" y="88" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="484" y="110">/home</text>
  <rect class="dg-box" x="550" y="88" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="590" y="110">/tmp</text>
  <line class="dg-line" x1="166" y1="122" x2="166" y2="150"/>
  <line class="dg-line" x1="126" y1="150" x2="206" y2="150"/>
  <line class="dg-line" x1="126" y1="150" x2="126" y2="164"/>
  <line class="dg-line" x1="206" y1="150" x2="206" y2="164"/>
  <rect class="dg-box-accent" x="96" y="164" width="64" height="30" rx="6"/>
  <text class="dg-text-mono dg-mid" x="128" y="184">log</text>
  <rect class="dg-box" x="176" y="164" width="64" height="30" rx="6"/>
  <text class="dg-text-mono dg-mid" x="208" y="184">lib</text>
  <line class="dg-line" x1="378" y1="122" x2="378" y2="164"/>
  <rect class="dg-box" x="340" y="164" width="76" height="30" rx="6"/>
  <text class="dg-text-mono dg-mid" x="378" y="184">local</text>
  <text class="dg-text-muted dg-mid" x="60" y="140">config</text>
  <text class="dg-text-muted dg-mid" x="128" y="214">logs</text>
  <text class="dg-text-muted dg-mid" x="208" y="214">state</text>
  <text class="dg-text-muted dg-mid" x="272" y="140">add-on apps</text>
  <text class="dg-text-muted dg-mid" x="378" y="214">admin installs</text>
  <text class="dg-text-muted dg-mid" x="484" y="140">people</text>
  <text class="dg-text-muted dg-mid" x="590" y="140">scratch</text>
</svg>`,
    octal: `<svg viewBox="0 0 640 200" role="img" aria-label="Mode 640 as bits: owner rw- is 4 plus 2 equals 6, group r-- is 4, other --- is 0">
  <text class="dg-title" x="20" y="28">chmod 640 postgresql.conf</text>
  <rect class="dg-box-accent" x="20" y="44" width="190" height="64" rx="6"/>
  <text class="dg-text dg-mid" x="115" y="68">owner</text>
  <text class="dg-text-mono dg-mid" x="115" y="94">r w -</text>
  <rect class="dg-box" x="225" y="44" width="190" height="64" rx="6"/>
  <text class="dg-text dg-mid" x="320" y="68">group</text>
  <text class="dg-text-mono dg-mid" x="320" y="94">r - -</text>
  <rect class="dg-box" x="430" y="44" width="190" height="64" rx="6"/>
  <text class="dg-text dg-mid" x="525" y="68">other</text>
  <text class="dg-text-mono dg-mid" x="525" y="94">- - -</text>
  <text class="dg-text-mono dg-mid" x="115" y="136">4 + 2 + 0</text>
  <text class="dg-text-mono dg-mid" x="320" y="136">4 + 0 + 0</text>
  <text class="dg-text-mono dg-mid" x="525" y="136">0 + 0 + 0</text>
  <text class="dg-label-accent dg-mid" x="115" y="172">6</text>
  <text class="dg-label-accent dg-mid" x="320" y="172">4</text>
  <text class="dg-label-accent dg-mid" x="525" y="172">0</text>
  <text class="dg-text-muted" x="20" y="194">r = 4, w = 2, x = 1. One octal digit per triplet.</text>
</svg>`
  },

  pitfalls: [
    "Running chmod 777 to make a permission error go away. Fix the owner instead.",
    "Running a service as root because it was easier during commissioning, then never changing it.",
    "Putting data in /tmp or a home folder and losing it on reboot or when that person leaves.",
    "Running apt upgrade on a production server without testing the same upgrade elsewhere first.",
    "Forgetting that a directory needs x as well as r before anyone can open the files inside it."
  ],

  keyTerms: ["linux-distro", "fhs", "root-user", "sudo", "linux-permissions", "octal-mode", "apt", "least-privilege"],

  quiz: [
    {
      q: "A service on a Level 3 Ubuntu server stopped overnight. Where do you look first?",
      options: ["/var/log", "/etc", "/opt", "/tmp"],
      answer: 0,
      explain: [
        "Correct. Logs are under /var/log (and in the systemd journal, covered next lesson).",
        "/etc holds configuration. You may need it later, but it won't tell you what happened.",
        "/opt holds add-on application files, not a record of what failed.",
        "/tmp holds scratch files and is often cleared on reboot."
      ]
    },
    {
      q: "Which mode lets the owner read and write a file, lets its group read it, and hides it from everyone else?",
      options: ["644", "600", "640", "755"],
      answer: 2,
      explain: [
        "644 also lets everyone else read it.",
        "600 gives the group nothing.",
        "Correct. 6 = rw for the owner, 4 = r for the group, 0 for others.",
        "755 adds execute and lets everyone read."
      ]
    },
    {
      q: "A container fails with 'permission denied' writing to a bind-mounted host folder. What is the best fix?",
      options: ["chmod 777 the folder", "Run the container as root", "Move the folder to /tmp", "Make the folder owned by the user id the container process runs as, with a tight mode"],
      answer: 3,
      explain: [
        "It works, but now any process on the host can change the data.",
        "That trades a permission error for a much bigger security risk.",
        "/tmp may be cleared on reboot, and the ownership problem would follow the folder anyway.",
        "Correct. Fix ownership so the right identity has access, and nothing else does."
      ]
    },
    {
      q: "You run 'sudo apt update' on a server. What changed?",
      options: ["Every package was upgraded to the newest version", "Only the list of available packages was refreshed", "The operating system was upgraded to the next release", "Unused packages were removed"],
      answer: 1,
      explain: [
        "That's apt upgrade.",
        "Correct. apt update downloads the package lists. It installs nothing.",
        "Release upgrades are a separate, deliberate procedure.",
        "That's apt autoremove."
      ]
    },
    {
      q: "Why is adding an engineer to the docker group a security decision, not just a convenience?",
      options: ["It lets them change the server's IP address", "It opens port 2375 to the network", "Anyone who can run containers can mount the host filesystem and act as root", "It disables sudo logging"],
      answer: 2,
      explain: [
        "Network settings are a separate permission.",
        "Joining a group doesn't open network ports.",
        "Correct. Docker access is effectively root access on that host.",
        "sudo logging is unaffected. That's part of the problem: Docker actions bypass it."
      ]
    }
  ],

  resources: [
    { title: "Filesystem Hierarchy Standard 3.0", url: "https://specifications.freedesktop.org/fhs/latest-single", type: "standard", source: "freedesktop.org" },
    { title: "chmod (POSIX manual page)", url: "https://man.archlinux.org/man/chmod.1p", type: "docs", source: "Arch Linux man pages" },
    { title: "Command line package management (apt)", url: "https://help.ubuntu.com/community/CommandLinePackageManagement", type: "docs", source: "Ubuntu Community Help" },
    { title: "Managing software (Ubuntu Server docs)", url: "https://ubuntu.com/server/docs/how-to/software/", type: "docs", source: "Canonical" }
  ]
});
