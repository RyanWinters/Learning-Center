LC.lesson({
  id: "dev-linux-services",
  title: "Linux services and troubleshooting",
  track: "dev",
  minutes: 25,
  level: 2,
  prereqs: ["dev-linux", "net-troubleshoot"],
  tags: ["linux", "systemd", "journalctl", "networking", "troubleshooting", "devops"],
  summary: "Processes, systemd services and the six commands that answer 'is it running, is it listening, can I reach it': the Linux version of the troubleshooting toolkit.",
  objectives: [
    "Explain the difference between a process and a service, and what systemd does",
    "Read a unit file's [Unit], [Service] and [Install] sections and use systemctl to start, enable and inspect a service",
    "Find a service's recent errors with journalctl",
    "Use ss, ip, curl, nc and dig to check listening ports, addresses, HTTP, TCP reachability and DNS",
    "Explain why a service bound to 127.0.0.1 cannot be reached from another machine while one on 0.0.0.0 can"
  ],

  body: `
## Processes and services

A **process** is a running program. Every process has a number (the PID), runs as some user, and ends when the program exits or is killed. You can start one by typing a command, and it dies when you close the terminal.

A **service** is a process the system keeps alive for you: started at boot, restarted when it crashes, stopped cleanly at shutdown, with its output captured in a log. Older Unix called these background programs {{term:daemon|daemons}}, which is why so many end in \`d\` (\`sshd\`, \`dockerd\`).

On almost every modern distribution, {{term:systemd}} is the program that manages services. It is the first process the kernel starts (PID 1), and everything else hangs off it.

| | Process you start by hand | systemd service |
|---|---|---|
| Starts at boot | No | Yes, when enabled |
| Restarts after a crash | No | Yes, if configured |
| Output goes to | Your terminal | The journal |
| Runs as | You | A user set in the unit file |
| Stops when you log out | Usually | No |

## Unit files

systemd reads a {{term:systemd-unit|unit file}} for each service. Packages install theirs under \`/lib/systemd/system/\`; your own go in \`/etc/systemd/system/\`, which also wins when both exist. A unit file is short, plain text, in three sections. This is an illustrative fragment, not a complete file:

\`\`\`text
[Unit]
Description=Meridian Modbus test server
After=network-online.target

[Service]
User=modsim
ExecStart=/opt/modsim/venv/bin/python /opt/modsim/server.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
\`\`\`

- **[Unit]** describes the service and its ordering. \`After=\` only sets order. It does not pull the other unit in.
- **[Service]** says how to run it: the command, the user, and the restart policy. \`Restart=on-failure\` restarts after a crash or a non-zero exit, but not after a clean stop.
- **[Install]** says what \`enable\` hooks it into. \`WantedBy=multi-user.target\` means "start at normal boot".

## systemctl: control and status

{{term:systemctl}} is how you talk to systemd.

| Command | Effect |
|---|---|
| \`systemctl status mosquitto\` | Is it running, since when, last few log lines |
| \`sudo systemctl start mosquitto\` | Start now (does not survive reboot by itself) |
| \`sudo systemctl enable mosquitto\` | Start at every boot (does not start it now) |
| \`sudo systemctl enable --now mosquitto\` | Both at once |
| \`sudo systemctl restart mosquitto\` | Stop then start, e.g. after a config change |
| \`sudo systemctl daemon-reload\` | Re-read unit files after you edit one |
| \`systemctl list-units --type=service --state=failed\` | Everything that is currently broken |

The **start vs enable** split catches everyone once. A service you started by hand runs fine until the first reboot, then quietly does not come back. Always check \`systemctl is-enabled\` after commissioning.

## journalctl: the logs

systemd captures everything a service prints into the **journal**. {{term:journalctl}} reads it.

\`\`\`text
journalctl -u mosquitto -e          # this service, jump to the end
journalctl -u mosquitto -f          # follow live, like tail -f
journalctl -u mosquitto --since "-1h"
journalctl -p err -b                # errors and worse since this boot
\`\`\`

Read from the bottom up. The last error before the service stopped is usually the real cause; everything after it is fallout.

## The network toolkit

You already know \`ping\`, \`tracert\` and \`Test-NetConnection\` from {{lesson:net-troubleshoot}}. On Linux the same questions have different commands.

{{diagram:ladder}}

| Question | Command | What good looks like |
|---|---|---|
| What is my address and route? | \`ip addr\`, \`ip route\` | Expected IP on the expected interface, default route via \`.1\` |
| Is the service listening, and on what? | \`ss -tlnp\` | A line for the port, with the right address and process |
| Does the name resolve? | \`dig +short sql.plant1.meridian.local\` | The address you expect |
| Can I open a TCP connection? | \`nc -vz 10.20.30.20 5432\` | "succeeded" or "open" |
| Does the web service answer? | \`curl -sS -o /dev/null -w '%{http_code}' http://10.20.30.10:8088/\` | An HTTP status such as 200 or 302 |

**ss** lists sockets. \`-t\` TCP, \`-u\` UDP, \`-l\` listening only, \`-n\` show numbers instead of names, \`-p\` show the owning process (needs sudo for other users' processes). **ip** replaced the older \`ifconfig\` and \`route\` commands. **curl** speaks HTTP and shows status codes and headers. **nc** (netcat) opens a raw TCP or UDP connection, which proves the port is reachable even for non-HTTP protocols like Modbus on 502. **dig** queries DNS and shows exactly which server answered.

## 127.0.0.1 versus 0.0.0.0

When a program listens, it chooses which address to listen on. This one choice explains a huge share of "it works locally but not from the HMI" calls.

{{diagram:bind}}

- **127.0.0.1** is the {{term:loopback}} address, also called \`localhost\`. Traffic to it never leaves the machine. A service listening only there is reachable from the same host and nowhere else.
- **0.0.0.0** in a listen address means "every interface on this machine". The service accepts connections on its LAN address, its loopback and any other interface.
- A specific address such as \`10.20.30.20\` listens on that interface only.

In \`ss -tlnp\` output, look at the Local Address column:

\`\`\`text
LISTEN 0 244   127.0.0.1:5432   0.0.0.0:*   users:(("postgres",pid=812,...))
LISTEN 0 100     0.0.0.0:1883   0.0.0.0:*   users:(("mosquitto",pid=640,...))
\`\`\`

PostgreSQL here accepts only local connections, so the Ignition Gateway at \`10.20.30.10\` cannot reach it, no matter what the firewall says. The broker listens everywhere. Many databases and brokers default to loopback for safety. Changing the listen address is a deliberate decision: open it only on the interface that needs it, and keep the firewall rule tight.

> [!tip] Work from the server outwards
> 1. \`systemctl status\`: is it running? 2. \`journalctl -u\`: why not? 3. \`ss -tlnp\`: is it listening, and on which address? 4. From the client, \`nc -vz\`: can I reach the port? 5. \`curl\` or the real client: does the protocol answer? Each step that passes rules out a whole class of causes.

The same rule appears inside containers, where "localhost" means the container itself. {{lesson:dev-docker}} builds on this.
`,

  eli5: `
A process is a worker you called in for one job. When the job is done, or you go home, they leave.

A service is a staff member on the payroll. A supervisor (systemd) makes sure they show up every morning, sends someone to replace them if they collapse, and keeps a diary of everything they said during the shift (the journal).

Listening on 127.0.0.1 is like a receptionist who only answers the internal phone: people inside the building can call, but nobody from outside gets through. Listening on 0.0.0.0 means answering every phone line coming into the building.

The network tools are the questions you'd ask when a delivery doesn't arrive. Is anyone at the desk (ss)? Is the address right (ip, dig)? Does the door open (nc)? Does the person at the desk actually answer in a language you understand (curl)?
`,

  why: `
**Why systemd and not a script in a startup folder.** A startup script starts a program once. systemd also restarts it, orders it after the network, runs it as the right user, captures its logs and stops it cleanly at shutdown. That is the difference between "it ran after the last reboot" and "it is a managed service".

**Why restart policies need care.** \`Restart=always\` sounds safe, but a service that crashes on startup will be restarted in a loop, filling the journal and hiding the first error. \`on-failure\` with systemd's built-in rate limiting is the usual compromise. You still need someone to notice a service that keeps dying: monitor it.

**Why loopback by default.** A database that listens on every interface the moment it is installed is reachable by anything on the network before anyone has set a password policy. Defaulting to loopback makes exposure a deliberate step. The trade-off is the classic commissioning call where the Gateway "cannot see the database" even though the firewall is open.

**Why work outward.** Random poking wastes hours. The checklist in this lesson eliminates one layer at a time, the same discipline as working up the OSI stack in {{lesson:net-troubleshoot}}. On site, write down what each step showed. That note turns into the ticket, the handover and the next person's shortcut.

**What people argue about.** Some engineers love systemd's breadth; others think PID 1 does too much. For an integrator the debate is academic: it is what the distribution ships, and its logs and restart behavior are what you will troubleshoot.
`,

  history: `
For decades, Unix systems started services with shell scripts in \`/etc/init.d\` run in a fixed order (SysV init). systemd, started by Lennart Poettering and Kay Sievers, replaced those scripts with declarative unit files, parallel startup and a central journal, and the major distributions (Debian, Ubuntu, Red Hat Enterprise Linux) adopted it as their default. The \`ip\` and \`ss\` commands come from the iproute2 package, which replaced the older \`ifconfig\`, \`route\` and \`netstat\` net-tools.
`,

  examples: [
    {
      title: "The Gateway cannot reach the new database",
      body: `The SQL server \`10.20.30.20\` is up, but the database connection on the Gateway \`10.20.30.10\` shows Faulted. On the SQL server, \`systemctl status postgresql\` says active. \`ss -tlnp\` shows \`127.0.0.1:5432\`. From the Gateway host, \`nc -vz 10.20.30.20 5432\` is refused. Root cause: the database only listens on loopback. The fix is to set its listen address to the server's VLAN 30 address and allow only the Gateway's address in the database's client rules and the host firewall.`
    },
    {
      title: "Works until reboot",
      body: `A Python Modbus simulator for an OEM skid ran fine for a week, then vanished after Windows Update rebooted the host VM. It had been started with \`systemctl start\` but never enabled. \`systemctl enable --now modsim\` fixes it, and \`systemctl is-enabled modsim\` goes into the commissioning checklist.`
    }
  ],

  diagrams: {
    ladder: `<svg viewBox="0 0 640 250" role="img" aria-label="Troubleshooting ladder from the server outward: systemctl status, journalctl, ss, then from the client nc, then curl or the real client">
  <defs><marker id="dev-linux-services-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">On the server</text>
  <text class="dg-title" x="400" y="26">From the client</text>
  <rect class="dg-box" x="20" y="40" width="330" height="40" rx="6"/>
  <text class="dg-text-mono" x="36" y="65">1  systemctl status</text>
  <text class="dg-text-muted" x="240" y="65">running?</text>
  <rect class="dg-box" x="20" y="96" width="330" height="40" rx="6"/>
  <text class="dg-text-mono" x="36" y="121">2  journalctl -u</text>
  <text class="dg-text-muted" x="240" y="121">why not?</text>
  <rect class="dg-box" x="20" y="152" width="330" height="40" rx="6"/>
  <text class="dg-text-mono" x="36" y="177">3  ss -tlnp</text>
  <text class="dg-text-muted" x="240" y="177">listening where?</text>
  <rect class="dg-box-accent" x="400" y="152" width="220" height="40" rx="6"/>
  <text class="dg-text-mono" x="416" y="177">4  nc -vz host port</text>
  <rect class="dg-box-accent" x="400" y="96" width="220" height="40" rx="6"/>
  <text class="dg-text-mono" x="416" y="121">5  curl / real client</text>
  <line class="dg-line" x1="185" y1="80" x2="185" y2="94" marker-end="url(#dev-linux-services-ah)"/>
  <line class="dg-line" x1="185" y1="136" x2="185" y2="150" marker-end="url(#dev-linux-services-ah)"/>
  <line class="dg-line" x1="350" y1="172" x2="398" y2="172" marker-end="url(#dev-linux-services-ah)"/>
  <line class="dg-line" x1="510" y1="152" x2="510" y2="138" marker-end="url(#dev-linux-services-ah)"/>
  <text class="dg-text-muted" x="20" y="226">Each step that passes rules out a whole layer. Stop at the first one that fails.</text>
</svg>`,
    bind: `<svg viewBox="0 0 640 230" role="img" aria-label="A host with a service bound to 127.0.0.1 reachable only from inside, and a service bound to 0.0.0.0 reachable from the LAN">
  <defs><marker id="dev-linux-services-ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-zone" x="200" y="20" width="420" height="190" rx="8"/>
  <text class="dg-title" x="216" y="44">Server 10.20.30.20</text>
  <rect class="dg-box-warn" x="230" y="64" width="170" height="54" rx="6"/>
  <text class="dg-text-sm" x="244" y="86">postgres</text>
  <text class="dg-text-mono" x="244" y="106">127.0.0.1:5432</text>
  <rect class="dg-box-ok" x="230" y="138" width="170" height="54" rx="6"/>
  <text class="dg-text-sm" x="244" y="160">mosquitto</text>
  <text class="dg-text-mono" x="244" y="180">0.0.0.0:1883</text>
  <rect class="dg-box" x="440" y="100" width="160" height="54" rx="6"/>
  <text class="dg-text-sm" x="454" y="122">local client</text>
  <text class="dg-text-muted" x="454" y="142">same host</text>
  <line class="dg-line" x1="440" y1="118" x2="402" y2="96" marker-end="url(#dev-linux-services-ah2)"/>
  <line class="dg-line" x1="440" y1="138" x2="402" y2="160" marker-end="url(#dev-linux-services-ah2)"/>
  <rect class="dg-box" x="20" y="100" width="140" height="54" rx="6"/>
  <text class="dg-text-sm" x="34" y="122">Gateway</text>
  <text class="dg-text-mono" x="34" y="142">10.20.30.10</text>
  <line class="dg-line" x1="160" y1="140" x2="228" y2="162" marker-end="url(#dev-linux-services-ah2)"/>
  <line class="dg-line-alarm dg-dash" x1="160" y1="114" x2="228" y2="92"/>
  <text class="dg-text-muted" x="150" y="80">refused</text>
</svg>`
  },

  pitfalls: [
    "Starting a service but never enabling it, so it disappears at the next reboot.",
    "Editing a unit file and forgetting systemctl daemon-reload, so the old settings keep running.",
    "Opening the firewall for a service that only listens on 127.0.0.1, then blaming the firewall.",
    "Setting Restart=always on a service that crashes at startup, and hiding the first error under a restart loop.",
    "Reading the journal from the top and chasing the last error instead of the first one."
  ],

  keyTerms: ["daemon", "systemd", "systemd-unit", "systemctl", "journalctl", "ss-command", "ip-command", "curl", "netcat", "dig-command", "loopback", "bind-address"],

  quiz: [
    {
      q: "A service ran fine all week and is missing after a reboot. systemctl status shows 'inactive (dead)' and is-enabled says 'disabled'. What happened?",
      options: ["It crashed and Restart= was not set", "It was started but never enabled", "The journal filled the disk", "systemd lost the unit file"],
      answer: 1,
      explain: [
        "A crash would show 'failed', and Restart= doesn't affect whether a service starts at boot.",
        "Correct. start runs it now; enable is what makes it start at boot.",
        "A full disk could cause trouble, but 'disabled' explains this precisely.",
        "If the unit file were missing, status would say the unit could not be found."
      ]
    },
    {
      q: "ss -tlnp shows a database listening on 127.0.0.1:5432. The Gateway on another host can't connect. What's the most likely fix?",
      options: ["Change the database's listen address to the server's LAN address (and restrict which clients may connect)", "Open TCP 5432 on the firewall", "Restart the Gateway", "Use port 5433 instead"],
      answer: 0,
      explain: [
        "Correct. Loopback-only services are unreachable from other machines by design.",
        "The firewall doesn't matter yet: nothing is listening on the LAN interface.",
        "The problem is on the database host, not the Gateway.",
        "A different port on loopback would have exactly the same problem."
      ]
    },
    {
      q: "You need to prove that TCP 502 on an OEM skid at 10.20.40.15 is reachable from the Ignition host. Which command fits best?",
      options: ["curl http://10.20.40.15:502", "dig 10.20.40.15", "nc -vz 10.20.40.15 502", "journalctl -u modbus"],
      answer: 2,
      explain: [
        "curl speaks HTTP. Modbus isn't HTTP, so you'd get a confusing error even if the port is open.",
        "dig is for DNS lookups, not port checks.",
        "Correct. nc opens a TCP connection and reports whether the port accepted it.",
        "journalctl reads local logs. It can't test a remote port."
      ]
    },
    {
      q: "In a unit file, what does After=network-online.target do on its own?",
      options: ["Starts the network if it is down", "Restarts the service when the network changes", "Makes the service start at boot", "Orders this service after the network target, without pulling it in"],
      answer: 3,
      explain: [
        "Pulling a unit in is done with Wants= or Requires=, not After=.",
        "There's no such behavior from After=.",
        "Starting at boot comes from enable plus the [Install] section.",
        "Correct. After= only sets order."
      ]
    },
    {
      q: "A service crashed. journalctl -u shows forty lines of errors. Which line is usually most useful?",
      options: ["The very last line", "The first error after the last successful start", "Any line containing 'warning'", "The line with the highest PID"],
      answer: 1,
      explain: [
        "The last lines are often fallout from the original failure.",
        "Correct. The first error is usually the cause; the rest follow from it.",
        "Warnings are often unrelated noise.",
        "PIDs are just process numbers. They don't rank importance."
      ]
    }
  ],

  resources: [
    { title: "journalctl manual page", url: "https://www.freedesktop.org/software/systemd/man/259/journalctl.html", type: "docs", source: "freedesktop.org (systemd)" },
    { title: "systemd unit file cheatsheet", url: "https://linuxize.com/cheatsheet/systemd-unit-file/", type: "article", source: "Linuxize" },
    { title: "ss(8) manual page", url: "https://man7.org/linux/man-pages/man8/ss.8.html", type: "docs", source: "man7.org" },
    { title: "dig manual page", url: "https://www.mankier.com/1/dig", type: "docs", source: "ManKier" }
  ]
});
