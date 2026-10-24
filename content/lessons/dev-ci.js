LC.lesson({
  id: "dev-ci",
  title: "CI/CD with GitHub Actions",
  track: "dev",
  minutes: 25,
  level: 3,
  prereqs: ["dev-git-team", "dev-compose"],
  tags: ["ci", "github-actions", "dependabot", "pre-commit", "containers", "devops"],
  summary: "Let a machine check every change the same way, every time: workflows, jobs, runners, service containers, required checks, local hooks, automated dependency updates and published images.",
  objectives: [
    "Explain CI and CD and what each protects against",
    "Describe a GitHub Actions workflow: triggers, jobs, steps, runners, and how jobs run in parallel or in sequence",
    "Explain service containers and how a job uses one to test against a real database or broker",
    "Connect CI results to required checks on a protected branch, and add fast local checks with pre-commit",
    "Explain what Dependabot and image publishing add, and the security trade-offs of both"
  ],

  body: `
## Why CI

**Continuous integration** ({{term:ci-cd|CI}}) means every change is automatically built and checked when it's pushed, before it is merged. **Continuous delivery or deployment** (CD) extends the same automation to producing release artifacts, such as a container image, and optionally to deploying them.

The reason is boring and powerful: people forget steps, machines don't. A lint step that an engineer runs "usually" catches the bug 90% of the time. A required check catches it every time, on every pull request, for every engineer, including the contractor who joined last week.

For an integrator, "checks" can mean: ShellCheck on scripts ({{lesson:dev-bash}}), a YAML and JSON syntax check on Ignition 8.3 resource files, unit tests for Python tools ({{lesson:dev-python}}), a test that the lab stack starts and turns healthy ({{lesson:dev-compose}}), and a naming-convention linter for tag exports.

## The pieces of GitHub Actions

{{term:github-actions|GitHub Actions}} is GitHub's built-in CI/CD service. The vocabulary:

{{diagram:anatomy}}

| Piece | What it is |
|---|---|
| **Workflow** | A YAML file in \`.github/workflows/\` in the repository |
| **Event / trigger** | What starts it: \`pull_request\`, \`push\` to a branch, a schedule, a release, a manual run |
| **Job** | A set of steps that runs on one runner. Jobs run **in parallel** unless one declares \`needs:\` another |
| **Step** | One shell command (\`run:\`) or one reusable **action** (\`uses:\`) |
| **Runner** | The machine that runs a job: GitHub-hosted (fresh VM each time) or self-hosted |
| **Action** | A packaged, reusable step, referenced like \`owner/repo@version\` |

A fragment, showing shape only:

\`\`\`text
on:
  pull_request:
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
\`\`\`

Every job on a GitHub-hosted {{term:gh-runner|runner}} starts on a **clean machine**. Nothing from the last run survives unless you explicitly cache it or pass it as an artifact. That is a feature: the job can't pass only because of a file left on some engineer's laptop.

## Service containers

Many useful tests need something real to talk to: a PostgreSQL database for named-query tests, an MQTT broker for a publisher, a Modbus server for a polling tool. A {{term:service-container|service container}} is a container the runner starts alongside a job, for the job's lifetime, declared under \`services:\` in the job.

Concepts to get right:

- **Readiness.** The service needs to be ready before the tests use it. You give the service a health check (the same idea as in {{lesson:dev-compose}}) so the runner waits for it.
- **Addressing.** If the job's steps run directly on the runner, they reach the service through a mapped port on \`localhost\`. If the job itself runs inside a container, it reaches the service by its service name, just like Compose. Mixing these up is the CI version of the localhost trap from {{lesson:dev-docker}}.
- **Throwaway data.** Each run gets a fresh, empty service. Tests must create the data they need.
- **Linux runners.** Service containers and job containers need a Linux runner.

## Required checks and the protected branch

CI only protects \`main\` if a failing check can **block the merge**. In the branch protection rules from {{lesson:dev-git-team}}, you mark specific check names as {{term:required-check|required}}. The pull request's merge button stays disabled until those checks pass.

Two practical notes:

- Required checks are matched by **name**. Rename a job and the protection quietly waits for a check that never runs again. Update the rule in the same change.
- Pair required checks with "branch must be up to date", so a change is tested against the current \`main\`, not last week's.

## Shift left: pre-commit hooks

CI feedback takes minutes. A Git hook gives it in seconds, on your machine, before the commit even exists. The {{term:pre-commit}} framework manages these hooks from a \`.pre-commit-config.yaml\` in the repository: install it once with pip, run \`pre-commit install\`, and each \`git commit\` runs the listed checks on the changed files (trailing whitespace, YAML syntax, ShellCheck, a Python formatter).

Local hooks are a convenience, not a control: anyone can skip them with \`--no-verify\`, and some people never install them. Run the same checks in CI as a required check. Local for speed, CI for enforcement.

## Dependabot: dependency updates as pull requests

Pinned versions ({{lesson:dev-compose}}) don't update themselves. {{term:dependabot|Dependabot}} reads a \`.github/dependabot.yml\` file listing package ecosystems (for example \`docker\`, \`github-actions\`, \`pip\`), a directory and a schedule, and opens pull requests that bump versions. Each PR runs your CI like any other change. You review the release notes, let CI prove it, and merge.

This turns "we should upgrade sometime" into a steady stream of small, tested changes. For a system containing a pinned Ignition image, treat a Gateway version bump as a real change: read the release notes and run your integration checks, rather than auto-merging it.

## Publishing images

The CD half: when a release is published, a workflow can build the project's container image and push it to a registry such as Docker Hub or the GitHub Container Registry ({{term:ghcr|ghcr.io}}). Typical concepts:

- **Trigger on release**, not on every push, so only tagged versions become images.
- **Tag the image with the release version** (and optionally the commit hash), never only \`latest\`.
- **Least privilege for tokens.** The workflow's token needs permission to write packages, and nothing more.
- **Provenance.** GitHub can attach build attestations so consumers can verify where an image came from.

## Security in CI

A workflow runs code with access to secrets and, often, the ability to push. Treat it like a production system:

- Pin third-party actions to a version (Dependabot can update them), and prefer well-known publishers.
- Grant the minimum \`permissions:\` per workflow or job.
- Don't expose secrets to workflows triggered by pull requests from forks.
- A self-hosted runner inside the plant network is a foothold for whoever can change a workflow. Isolate it, and never place one where it can reach Level 2 or below.
`,

  eli5: `
CI is a quality inspector standing at the door of the warehouse. Every box (change) that wants to go on the shelf (main) gets the same checks, in the same order, every time. The inspector never gets tired or skips a step on a Friday.

A workflow is the inspector's checklist. A job is one inspection station. Several stations can work at once, unless one has to wait for another. A runner is a fresh, clean workbench brought in for each inspection, then thrown away.

A service container is a test dummy wheeled in for the inspection: a fake database or broker to try the box against, removed afterwards.

Required checks are a lock on the warehouse door that only opens when the inspector stamps "pass".

Pre-commit hooks are a mirror by your desk so you can spot obvious mistakes before you even walk to the door.

Dependabot is a helper who reads the suppliers' newsletters and fills in change requests for you whenever a new version of a part comes out.
`,

  why: `
**Why machines check, not people.** Reviews are for judgment: is this the right design, does this alarm setpoint make sense. Machines are better at everything mechanical: syntax, naming patterns, tests. CI frees reviewers to review.

**Why clean runners.** A test that passes on a machine with leftover state proves little. Fresh runners force the repository to contain everything needed to build and test, which is exactly what you need when a new engineer or a disaster-recovery rebuild depends on it.

**Why required, not optional.** An optional red check gets merged "just this once" during an outage, and then the check stops meaning anything. Required checks hold the line, and the protected branch makes the exceptions visible and deliberate.

**Why small automated updates.** Upgrading a dependency every week with CI proving each step is cheap. Upgrading five years of dependencies at once, during a plant shutdown, is a project. Dependabot is the difference.

**What people argue about.** How much to run on every pull request versus nightly. Fast checks (lint, unit tests) belong on every PR; slow integration tests that start a full stack can run on merge or nightly if they take too long, as long as someone watches them. The other argument is self-hosted versus GitHub-hosted runners for OT projects. Self-hosted runners can reach plant test systems, which is useful and dangerous in equal measure.
`,

  history: `
Continuous integration as a named practice came from the Extreme Programming community, and tools such as CruiseControl and Hudson (later forked as Jenkins) ran builds on dedicated servers. Hosted services moved CI configuration into files stored alongside the code. GitHub Actions brought CI/CD into GitHub itself, with workflows as YAML files in the repository and a marketplace of reusable actions. Dependabot began as an independent service and was acquired by GitHub, which built it into the platform.
`,

  examples: [
    {
      title: "The renamed check",
      body: `A team renamed their CI job from \`check\` to \`validate\`. Branch protection still required a check called \`check\`, which never reported, so every PR sat at "Expected: waiting for status". The fix was to update the required check name in the protection rule in the same PR as the rename.`
    },
    {
      title: "Dependabot and the Gateway image",
      body: `Dependabot opens "Bump inductiveautomation/ignition from 8.3.x to 8.3.y" against the lab repository. CI starts the stack and its checks pass. Because the Gateway is version-sensitive, the team still reads the Ignition release notes and runs the commissioning checklist on the test Gateway before merging, then tags a release.`
    }
  ],

  diagrams: {
    anatomy: `<svg viewBox="0 0 640 240" role="img" aria-label="A pull request event triggers a workflow with two parallel jobs, lint and test; test has a service container; a third job needs both; results feed required checks on the protected branch">
  <defs><marker id="dev-ci-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box-accent" x="16" y="96" width="110" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="71" y="118">pull_request</text>
  <text class="dg-text-muted dg-mid" x="71" y="136">event</text>
  <rect class="dg-zone" x="150" y="20" width="330" height="200" rx="8"/>
  <text class="dg-text-muted" x="164" y="40">workflow .github/workflows/ci.yml</text>
  <rect class="dg-box" x="170" y="56" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="235" y="78">job: lint</text>
  <text class="dg-text-muted dg-mid" x="235" y="96">fresh runner</text>
  <rect class="dg-box" x="170" y="140" width="130" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="235" y="162">job: test</text>
  <text class="dg-text-muted dg-mid" x="235" y="180">fresh runner</text>
  <rect class="dg-box-warn" x="320" y="146" width="140" height="48" rx="6"/>
  <text class="dg-text-sm dg-mid" x="390" y="166">service</text>
  <text class="dg-text-muted dg-mid" x="390" y="184">postgres</text>
  <line class="dg-line-thin dg-dash" x1="300" y1="170" x2="320" y2="170"/>
  <rect class="dg-box" x="330" y="64" width="130" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="395" y="86">job: build</text>
  <text class="dg-text-muted dg-mid" x="395" y="104">needs lint, test</text>
  <line class="dg-line" x1="126" y1="112" x2="168" y2="84" marker-end="url(#dev-ci-ah)"/>
  <line class="dg-line" x1="126" y1="130" x2="168" y2="166" marker-end="url(#dev-ci-ah)"/>
  <line class="dg-line" x1="300" y1="82" x2="328" y2="86" marker-end="url(#dev-ci-ah)"/>
  <line class="dg-line" x1="290" y1="140" x2="340" y2="116" marker-end="url(#dev-ci-ah)"/>
  <rect class="dg-box-ok" x="500" y="90" width="124" height="60" rx="6"/>
  <text class="dg-text-sm dg-mid" x="562" y="114">required</text>
  <text class="dg-text-sm dg-mid" x="562" y="134">checks</text>
  <line class="dg-line" x1="480" y1="120" x2="498" y2="120" marker-end="url(#dev-ci-ah)"/>
</svg>`
  },

  pitfalls: [
    "Running CI but not marking the checks as required, so red PRs still merge.",
    "Renaming a job without updating the required check name in branch protection.",
    "Tests that depend on data left from an earlier run, which a fresh runner doesn't have.",
    "Giving workflows broad write permissions and secrets they don't need.",
    "Auto-merging every Dependabot PR, including version-sensitive ones like the Gateway image."
  ],

  keyTerms: ["ci-cd", "github-actions", "gh-workflow", "gh-runner", "service-container", "required-check", "pre-commit", "dependabot", "ghcr"],

  quiz: [
    {
      q: "Two jobs in a workflow, lint and test, have no needs: keys. How do they run?",
      options: ["lint first, then test, in file order", "In the same runner, one after another", "In parallel, each on its own runner", "Only the first job runs"],
      answer: 2,
      explain: [
        "File order doesn't create a dependency; needs: does.",
        "Each job gets its own runner.",
        "Correct. Jobs run in parallel by default, each on a fresh runner.",
        "All jobs whose conditions match run."
      ]
    },
    {
      q: "A test step running directly on the runner can't connect to its PostgreSQL service container using the hostname postgres. What's the likely issue?",
      options: ["Service containers don't support PostgreSQL", "The service needs a public IP", "The runner must be self-hosted", "Steps on the runner reach services via a mapped port on localhost; the service name only resolves when the job itself runs in a container"],
      answer: 3,
      explain: [
        "Databases are one of the main uses for service containers.",
        "Everything stays on the runner; no public address is involved.",
        "GitHub-hosted Linux runners support service containers.",
        "Correct. It's the same localhost-versus-container-name distinction as in Docker."
      ]
    },
    {
      q: "Your team has pre-commit hooks running ShellCheck. Why also run ShellCheck in CI?",
      options: ["CI runs it faster", "Hooks can be skipped or never installed; a required CI check can't be bypassed silently", "pre-commit only works on Windows", "CI is needed to install ShellCheck"],
      answer: 1,
      explain: [
        "Local hooks give faster feedback. CI is about enforcement.",
        "Correct. Local for speed, CI for enforcement.",
        "pre-commit is cross-platform.",
        "Installation isn't the issue."
      ]
    },
    {
      q: "What does Dependabot do with a pinned image version in a Compose file?",
      options: ["Upgrades the running container immediately", "Unpins it so the latest is always used", "Opens a pull request bumping the version, which runs CI like any other change", "Scans the plant network for old devices"],
      answer: 2,
      explain: [
        "Dependabot changes files in the repository, not running systems.",
        "It keeps versions pinned and moves the pin.",
        "Correct. Updates arrive as reviewable, tested PRs.",
        "It only reads dependency files in the repository."
      ]
    },
    {
      q: "Which trigger is most appropriate for a workflow that builds and publishes the project's container image?",
      options: ["A published release (tagged version)", "Every push to any branch", "Every pull request from a fork", "Every 5 minutes on a schedule"],
      answer: 0,
      explain: [
        "Correct. Only tagged releases become published images, tagged with the version.",
        "That floods the registry with untested, unnamed images.",
        "Fork PRs shouldn't get publishing credentials at all.",
        "Images should change when the code does, not on a timer."
      ]
    }
  ],

  resources: [
    { title: "Workflows (GitHub Actions concepts)", url: "https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows", type: "docs", source: "GitHub Docs" },
    { title: "Workflow syntax for GitHub Actions", url: "https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions", type: "docs", source: "GitHub Docs" },
    { title: "About service containers", url: "https://docs.github.com/en/enterprise-server@3.8/actions/using-containerized-services/about-service-containers", type: "docs", source: "GitHub Docs" },
    { title: "Configuring Dependabot version updates", url: "https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configuring-dependabot-version-updates", type: "docs", source: "GitHub Docs" },
    { title: "Publishing Docker images", url: "https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images", type: "docs", source: "GitHub Docs" },
    { title: "pre-commit", url: "https://pre-commit.com/", type: "tool", source: "pre-commit" }
  ]
});
