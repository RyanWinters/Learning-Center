LC.lesson({
  id: "dev-bash",
  title: "Bash scripting for integrators",
  track: "dev",
  minutes: 25,
  level: 2,
  prereqs: ["dev-linux"],
  tags: ["bash", "shell", "scripting", "shellcheck", "devops"],
  summary: "Pipes, exit codes, arguments and strict mode: enough Bash to read the scripts inside containers and CI jobs, and to write small ones that fail loudly instead of silently.",
  objectives: [
    "Chain commands with pipes and redirect stdout and stderr to files",
    "Explain exit codes and use them with &&, || and if",
    "Read script arguments ($1, $@, $#) and quote them correctly",
    "Say exactly what set -e, set -u and set -o pipefail each change, including their blind spots",
    "Use ShellCheck to catch quoting and logic bugs before they reach a server"
  ],

  body: `
## Why Bash matters even if you never write a long script

Bash is the default {{term:bash|shell}} on most Linux servers, and it is the language of container entrypoints, CI job steps and one-line fixes typed at 2 a.m. You will read far more Bash than you write. The goal is to read it confidently and to write short scripts that **fail loudly**: a script that keeps going after a failed step can report "backup done" while copying nothing.

## Commands, pipes and redirection

Every command has three standard streams: **stdin** (input), **stdout** (normal output) and **stderr** (errors). The {{term:stdout-stderr|streams}} matter because pipes and redirection move them around.

A **pipe** (\`|\`) connects the stdout of one command to the stdin of the next. Each command does one small job.

\`\`\`text
journalctl -u mosquitto --since today | grep -i "error" | wc -l
\`\`\`

That reads today's broker log, keeps lines containing "error" and counts them.

| Syntax | Meaning |
|---|---|
| \`cmd > file\` | Write stdout to a file, replacing it |
| \`cmd >> file\` | Append stdout to a file |
| \`cmd 2> file\` | Write stderr to a file |
| \`cmd > file 2>&1\` | Send both streams to the same file |
| \`cmd < file\` | Read stdin from a file |
| \`a \\| b\` | stdout of a becomes stdin of b |

## Exit codes

Every command ends with an {{term:exit-code|exit code}}: **0 means success**, anything from 1 to 255 means some kind of failure. It is the opposite of what a PLC programmer expects, where 1 is TRUE. Think of it as "number of problems".

The shell keeps the last exit code in \`$?\`. The logical operators use it:

\`\`\`text
ping -c 1 10.20.10.10 && echo "PLC1 answers"
ping -c 1 10.20.10.10 || echo "PLC1 is not answering"
\`\`\`

\`&&\` runs the right side only if the left succeeded. \`||\` runs it only if the left failed. \`if\` works the same way: \`if command; then ...\` branches on the exit code, not on any printed text.

> [!warning] A pipeline's exit code is the last command's
> By default, \`a | b\` reports only \`b\`'s exit code. If \`a\` failed and \`b\` happily processed nothing, the pipeline "succeeded". \`pipefail\`, below, fixes that.

## Arguments and variables

A script receives its arguments as numbered variables.

| Variable | Contents |
|---|---|
| \`$0\` | The script's own name |
| \`$1\`, \`$2\` … | First, second … argument |
| \`$#\` | How many arguments |
| \`"$@"\` | All arguments, each kept as one word |

Variables are set with no spaces around \`=\` (\`HOST=10.20.30.20\`) and read with \`$HOST\` or \`\${HOST}\`. {{term:env-variable|Environment variables}} are variables exported to child processes; containers are configured almost entirely through them.

**Quote every expansion.** Write \`"$1"\`, not \`$1\`. Unquoted, the shell splits the value on spaces and expands wildcards, so a folder called \`Area10 Batching\` becomes two arguments, and a value of \`*\` becomes a list of files. This single habit prevents most Bash bugs.

## Strict mode: set -euo pipefail

Bash's defaults are forgiving: keep going after errors, treat unknown variables as empty, ignore failures in the middle of pipelines. For scripts that change things, most teams start with:

\`\`\`text
#!/usr/bin/env bash
set -euo pipefail
\`\`\`

The first line is the {{term:shebang}}, which tells the system which interpreter runs the file. The second is {{term:strict-mode|strict mode}}:

| Option | Effect | Blind spot |
|---|---|---|
| \`-e\` | Exit as soon as a command fails | Not triggered by failures inside an \`if\` or \`while\` condition, by any command in an \`&&\`/\`\\|\\|\` list except the last, or by a command negated with \`!\` |
| \`-u\` | Treat an unset variable as an error | \`$@\` and \`$*\` are exempt |
| \`-o pipefail\` | A pipeline fails if any command in it fails | It reports the rightmost failure, not which one |

{{diagram:pipefail}}

\`-e\` is a safety net with holes, not a guarantee. If a step must succeed, check it explicitly:

\`\`\`text
if ! pg_dump "$DB" > "$OUT"; then
  echo "backup of $DB failed" >&2
  exit 1
fi
\`\`\`

Note \`>&2\`: error messages go to stderr, so they reach the log even when stdout is piped somewhere else, and the non-zero \`exit\` tells whatever called the script (systemd, Docker, CI) that it failed.

## A worked example: reading an argument safely

A short helper that prints the size of an Ignition backup folder, used by an operator as \`./size.sh /srv/backups/plant1\`:

\`\`\`text
#!/usr/bin/env bash
set -euo pipefail
DIR="\${1:?usage: size.sh <folder>}"
du -sh -- "$DIR"
\`\`\`

\`\${1:?message}\` stops with the message if no argument was given. \`--\` tells \`du\` that what follows is a path even if it starts with a dash. Both habits are cheap and prevent confusing failures.

## ShellCheck

{{term:shellcheck|ShellCheck}} is a free static analyzer for shell scripts. It reads a script without running it and flags unquoted variables, useless \`cd\` without error checks, \`[ $x == y ]\` comparisons that break on empty values, and dozens of other traps, each with a code like SC2086 and a wiki page explaining the fix.

Run it on every script before it goes near a server: in your editor, as a {{term:pre-commit|pre-commit hook}}, and in CI ({{lesson:dev-ci}}). Treat its warnings like compiler errors. When a warning is genuinely wrong for your case, disable that one code with a comment that says why.

> [!tip] When to stop using Bash
> Bash is great for gluing commands together. Once a script needs data structures, real error handling, HTTP calls with JSON, or more than about a page of logic, switch to Python ({{lesson:dev-python}}). Integrators who ignore this rule end up maintaining 600-line Bash scripts no one dares touch.
`,

  eli5: `
Bash is like giving instructions to a very literal assistant, one line at a time.

A pipe is a conveyor belt between workstations: the first person sorts the mail, puts it on the belt, the next person picks out the bills, the next counts them.

Every time the assistant finishes a task, they hold up a card. A 0 card means "done, no problems". Any other number means "something went wrong". It's backwards from what you'd expect, so remember: zero problems.

By default the assistant is too polite. If a step fails, they shrug and carry on. Strict mode is you saying, "If anything goes wrong, stop and tell me immediately, and if I mention a name you don't recognize, don't guess." Even then, there are a few situations where they won't stop by themselves, so for the steps that really matter you check the card yourself.

ShellCheck is a proofreader who reads your instructions before you hand them over and points out the ones the assistant will misunderstand.
`,

  why: `
**Why fail loudly.** A backup script that silently skips its copy step is worse than no script: everyone believes the backup exists. Strict mode, explicit checks and a non-zero exit turn silent failures into alarms that systemd, Docker or CI can see. That is the same philosophy as fail-safe wiring in the field.

**Why exit codes, not text.** Scripts that parse messages like "OK" break when a tool's wording changes or is translated. Exit codes are a contract. Every orchestrator you will use (systemd restart policies, Docker healthchecks, CI job status) reads the exit code and nothing else.

**Why quoting is non-negotiable.** Unquoted variables are the single biggest source of Bash bugs, and they hide until the day a path contains a space or a value is empty. Plant folder names like "Area10 Batching" will find them.

**What experienced people argue about.** Whether \`set -e\` helps or hurts. Critics point out its long list of exceptions and argue it gives false confidence. Supporters say a partial safety net beats none. The practical middle ground is what this lesson teaches: use strict mode, know its blind spots, and explicitly check the steps that must not fail. Another debate is where to draw the Bash-to-Python line; most teams draw it earlier every year.
`,

  history: `
The Bourne shell (\`sh\`) shipped with Unix Version 7 and set the syntax most shell scripts still use. Bash, the "Bourne-Again SHell", was written by Brian Fox for the GNU Project as a free replacement and became the default on most Linux distributions. Some minimal systems and container images use a smaller POSIX \`sh\` instead (such as dash or BusyBox), which lacks some Bash features. That is why the shebang line matters. ShellCheck, written by Vidar Holen, became the de facto linter for shell scripts.
`,

  examples: [
    {
      title: "The backup that reported success",
      body: `A nightly script ran \`pg_dump meridian | gzip > /srv/backups/meridian.sql.gz\` and then \`echo "backup OK"\`. When the database password changed, \`pg_dump\` failed, \`gzip\` compressed an empty stream, and the pipeline exited 0 for three weeks. With \`set -o pipefail\` the pipeline would have returned the dump's failure, and with \`set -e\` the script would have stopped before printing "backup OK".`
    },
    {
      title: "ShellCheck catches a space",
      body: `\`rm -rf $TARGET/old\` looks harmless. ShellCheck flags SC2086 because if \`TARGET\` is empty, the command becomes \`rm -rf /old\`, and if it contains a space it deletes two paths. Writing \`rm -rf -- "\${TARGET:?}/old"\` makes the empty case an error and keeps the path in one piece.`
    }
  ],

  diagrams: {
    pipefail: `<svg viewBox="0 0 640 220" role="img" aria-label="A pipeline where the first command fails and the second succeeds: without pipefail the pipeline reports success, with pipefail it reports the failure">
  <defs><marker id="dev-bash-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">pg_dump meridian | gzip &gt; backup.gz</text>
  <rect class="dg-box-alarm" x="20" y="44" width="170" height="50" rx="6"/>
  <text class="dg-text-mono dg-mid" x="105" y="66">pg_dump</text>
  <text class="dg-text-sm dg-mid" x="105" y="84">exit 1</text>
  <line class="dg-line" x1="190" y1="69" x2="236" y2="69" marker-end="url(#dev-bash-ah)"/>
  <rect class="dg-box-ok" x="240" y="44" width="170" height="50" rx="6"/>
  <text class="dg-text-mono dg-mid" x="325" y="66">gzip</text>
  <text class="dg-text-sm dg-mid" x="325" y="84">exit 0</text>
  <rect class="dg-box" x="20" y="120" width="290" height="70" rx="6"/>
  <text class="dg-text" x="36" y="146">Default</text>
  <text class="dg-text-mono" x="36" y="172">pipeline exit = 0</text>
  <rect class="dg-box-accent" x="330" y="120" width="290" height="70" rx="6"/>
  <text class="dg-text" x="346" y="146">With pipefail</text>
  <text class="dg-text-mono" x="346" y="172">pipeline exit = 1</text>
  <text class="dg-text-muted" x="20" y="212">Default: last command wins. pipefail: rightmost failure wins.</text>
</svg>`
  },

  pitfalls: [
    "Leaving variables unquoted, so paths with spaces split and empty values vanish.",
    "Trusting set -e to catch a failure inside an if condition or a && chain.",
    "Piping a command into another and never checking whether the first one failed.",
    "Writing error messages to stdout, where a later pipe or redirect swallows them.",
    "Growing a Bash script past a page of logic instead of switching to Python."
  ],

  keyTerms: ["bash", "stdout-stderr", "shell-pipe", "exit-code", "env-variable", "shebang", "strict-mode", "shellcheck"],

  quiz: [
    {
      q: "A script runs 'curl -s http://10.20.30.10:8088/ | grep -q Ignition' with set -e but not pipefail. curl fails to connect. What happens?",
      options: ["Only grep's exit code counts: grep finds nothing and fails, so the script exits for grep's reason", "The script exits because curl failed", "Nothing; the script continues because pipelines are exempt from -e", "Bash retries curl automatically"],
      answer: 0,
      explain: [
        "Correct. The pipeline reports grep's status. Here grep fails too, so the script stops, but for the wrong reason, and with a different pipeline it might not stop at all.",
        "Without pipefail, curl's failure is invisible to -e.",
        "Pipelines aren't exempt; only the last command's status is used.",
        "Bash never retries commands on its own."
      ]
    },
    {
      q: "What does exit code 0 mean?",
      options: ["False", "The command was not found", "Success", "The command is still running"],
      answer: 2,
      explain: [
        "Shells use the opposite of Boolean logic here.",
        "Command not found is usually 127.",
        "Correct. 0 means success; any non-zero value is a failure.",
        "A finished command has an exit code; a running one doesn't yet."
      ]
    },
    {
      q: "A script is called as ./archive.sh \"Area10 Batching\". Which line passes the whole folder name to tar as one argument?",
      options: ["tar czf out.tgz $1", "tar czf out.tgz $@", "tar czf out.tgz '$1'", "tar czf out.tgz \"$1\""],
      answer: 3,
      explain: [
        "Unquoted, the value splits into 'Area10' and 'Batching'.",
        "Unquoted $@ splits on spaces too.",
        "Single quotes stop expansion, so tar receives the literal text $1.",
        "Correct. Double quotes keep the value as one word and still expand the variable."
      ]
    },
    {
      q: "Which failure does set -e NOT catch?",
      options: ["A failed cp on its own line", "A failed command used as an if condition", "A failed mkdir on its own line", "The last command of a && list failing"],
      answer: 1,
      explain: [
        "A plain failing command stops the script under -e.",
        "Correct. Commands tested by if, while or until are exempt, because their failure is the expected way to branch.",
        "A plain failing command stops the script under -e.",
        "The last command of an && or || list is still checked."
      ]
    },
    {
      q: "Your team wants every Bash script checked for quoting bugs before it's merged. What's the most effective approach?",
      options: ["Ask reviewers to read every line carefully", "Add set -x to every script", "Run ShellCheck locally as a pre-commit hook and again as a CI check", "Convert all scripts to sh"],
      answer: 2,
      explain: [
        "Humans miss these consistently; that's why linters exist.",
        "set -x prints commands as they run. It helps debugging, not prevention.",
        "Correct. A hook gives fast feedback; CI makes it impossible to skip.",
        "POSIX sh has the same quoting rules and fewer features."
      ]
    }
  ],

  resources: [
    { title: "The Set Builtin (Bash Reference Manual)", url: "https://docs.w3cub.com/bash/the-set-builtin", type: "docs", source: "GNU Bash manual (DevDocs mirror)" },
    { title: "Pipelines (Bash Reference Manual)", url: "https://docs.w3cub.com/bash/pipelines", type: "docs", source: "GNU Bash manual (DevDocs mirror)" },
    { title: "SC2086: Double quote to prevent globbing and word splitting", url: "https://shellcheck.net/wiki/SC2086", type: "tool", source: "ShellCheck" },
    { title: "pre-commit: a framework for managing git hooks", url: "https://pre-commit.com/", type: "tool", source: "pre-commit" }
  ]
});
