LC.lesson({
  id: "dev-git-team",
  title: "Team Git workflow",
  track: "dev",
  minutes: 25,
  level: 3,
  prereqs: ["dev-git"],
  tags: ["git", "github", "pull-requests", "releases", "devops"],
  summary: "Feature branches, pull requests and protected main: how a team changes a live system without stepping on each other, plus when to merge, rebase, revert or reset.",
  objectives: [
    "Describe a feature-branch workflow from branch to pull request to merge",
    "Explain what branch protection and required checks enforce, and why main is protected",
    "Write commit messages in the Conventional Commits format and say how they map to version numbers",
    "Choose between merge and rebase, and between revert and reset, for a given situation",
    "Cut a release: tag, release notes and what gets deployed"
  ],

  body: `
## One rule: main is always deployable

A team workflow exists to protect one thing: the branch that gets deployed. At Meridian Foods that is \`main\`, and whatever is on \`main\` can be pulled onto the Plant 1 Gateway at any time. Everything in this lesson either keeps unreviewed work off \`main\` or makes changes on it traceable and reversible.

## Feature branches

Every change starts on its own {{term:feature-branch|feature branch}}, created from the latest \`main\`:

\`\`\`text
git switch main && git pull
git switch -c feat/area20-case-packer-oee
\`\`\`

Name branches so a stranger can guess the content: a type, the area or equipment, and a few words. Keep them short-lived. A branch that lives for six weeks drifts away from \`main\` and ends in a painful merge. Days, not weeks.

## Pull requests

When the work is ready, push the branch and open a {{term:pull-request|pull request}} (PR): a request to merge it into \`main\`, with a place for discussion, review and automated checks.

{{diagram:flow}}

A good PR for an automation project says:

- **What and why**: "Adds OEE calculation for the Area20 case packer, because the plant manager's report needs availability per shift."
- **How it was tested**: "Ran against the Area20 test Gateway with the simulator; checked the three shift boundaries."
- **Risk and rollback**: "Only new resources. Rollback is reverting this PR."
- **Screenshots** for any screen change.

Reviewers look for correctness, naming against the standard ({{lesson:int-naming}}), and anything that touches production behavior: alarm setpoints, write permissions, scripts that run on the Gateway. Small PRs get real reviews. A 4,000-line PR gets "looks good to me".

## Protected branches and required checks

GitHub (and GitLab, Azure DevOps and others) let you make \`main\` a {{term:protected-branch|protected branch}}. Common rules:

| Rule | What it prevents |
|---|---|
| Require a pull request before merging | Anyone pushing straight to \`main\` |
| Require approvals (e.g. one reviewer) | Unreviewed changes |
| Require status checks to pass | Merging code that fails linting or tests |
| Require branches to be up to date | Merging something tested against an old \`main\` |
| Block force pushes and deletion | Rewriting or deleting shared history |

{{term:required-check|Required status checks}} are where CI ({{lesson:dev-ci}}) plugs in: the PR can't merge until the checks are green. Newer GitHub repositories can also use *rulesets*, which apply the same kinds of rules across many branches or repositories.

## Commit messages: Conventional Commits

A commit message is a note to the person debugging this at 3 a.m. {{term:conventional-commits|Conventional Commits}} is a widely used format that also lets tools read your history:

\`\`\`text
<type>[optional scope]: <description>

fix(area10): correct LT101 scaling to 0-5.0 m
feat(area20): add case packer OEE view
docs: add commissioning notes for PLC2
feat(tags)!: rename Motor UDT Cfg members
\`\`\`

| Type | Means | Version effect |
|---|---|---|
| \`fix\` | A bug fix | PATCH (1.4.0 → 1.4.1) |
| \`feat\` | A new feature | MINOR (1.4.1 → 1.5.0) |
| \`!\` after the type, or a \`BREAKING CHANGE:\` footer | Something others must adapt to | MAJOR (1.5.0 → 2.0.0) |
| \`docs\`, \`chore\`, \`ci\`, \`refactor\`, \`test\`… | Everything else | None by themselves |

The link to {{term:semantic-versioning|semantic versioning}} is the point. Renaming UDT members breaks every binding and every external system reading those tags, so it is a breaking change even if it is "just a rename".

## Merge versus rebase

When \`main\` has moved on since you branched, you must combine the two lines of history. There are two ways.

{{diagram:mergerebase}}

| | {{term:git-merge\\|Merge}} | {{term:git-rebase\\|Rebase}} |
|---|---|---|
| What it does | Adds a merge commit with two parents | Replays your commits on top of the new \`main\`, creating new commits |
| History shape | True record, with branches visible | Straight line, as if you'd started later |
| Rewrites commits? | No | Yes: new hashes |
| Safe on shared branches? | Yes | Only on commits nobody else has |

The golden rule: **never rebase commits that other people already have.** Rebasing rewrites hashes, and anyone who built on the old ones ends up with duplicate history. Rebasing your own local, unpushed branch to tidy it before a PR is fine. Many teams merge PRs with "squash and merge", which collapses a PR into one commit on \`main\`.

## Revert versus reset

Both "undo", in very different ways.

| | \`git revert <commit>\` | \`git reset <commit>\` |
|---|---|---|
| How | Creates a new commit that does the opposite | Moves the branch pointer back; later commits are dropped from the branch |
| History | Preserved; the mistake and its undo are both visible | Rewritten |
| Use on \`main\` / shared branches | Yes, this is the right tool | No |
| Use on your own local branch | Fine | Fine, e.g. to un-commit before pushing |

When a merged PR breaks the night shift, you **revert** it on \`main\`, deploy, and investigate in the morning. You never reset a shared branch. If a reset goes wrong locally, the reflog from {{lesson:dev-git}} brings the commits back.

## Releases

A release turns "whatever is on \`main\`" into a named, documented version.

1. Agree that \`main\` at commit \`c81d4e7\` is what passed site acceptance.
2. Tag it with an annotated tag: \`git tag -a v1.5.0 -m "Area20 OEE go-live"\` and push the tag.
3. Publish a {{term:github-release|release}} on the hosting service with notes. Conventional Commits make these notes easy to generate: all \`feat\` and \`fix\` lines since the last tag.
4. Deploy *the tag*, not "latest main". The deployed system and the release notes then refer to the same commit.

> [!tip] Hotfixes
> If a release breaks, fix forward on a branch from \`main\`, or revert, then cut \`v1.5.1\`. Avoid long-lived "release branches" unless you truly maintain several versions in the field at once.
`,

  eli5: `
Think of the master copy of a recipe book in a busy kitchen.

Nobody writes in the master copy directly. Each cook takes a photocopy of a page (a feature branch), tries out their change, and then hands it to the head chef with a note saying what they changed and why (a pull request). The head chef checks it, and a kitchen helper taste-tests it automatically (the required checks). Only then does the change get pasted into the master book.

The master book is locked in a glass case (a protected branch) so nobody can scribble in it by accident.

If a pasted-in change turns out bad, you don't rip pages out of the master book. You paste in a new page that says "undo the change on page 42" (revert), so everyone can see what happened.

Every time the kitchen opens a new menu, the head chef puts a dated ribbon on the exact version of the book being used (a release tag).
`,

  why: `
**Why protect main.** Without it, the shortcut always wins at the worst moment: someone pushes an "obvious" fix straight to production config during a shutdown. Protection makes the safe path the only path, and it costs a two-minute review.

**Why small PRs.** Review quality drops sharply as size grows. Small PRs also revert cleanly. A PR that mixes a naming cleanup, a new screen and an alarm change can't be partially undone.

**Why revert on shared branches.** History is the audit trail. In regulated plants (food safety, pharma) you may need to show what changed and when. A revert keeps that trail; a reset or force push erases it, and also breaks every colleague's clone.

**Why message conventions.** A free-form history ("fix", "more fixes", "asdf") is useless at 3 a.m. Conventional Commits make each line searchable by type and area, and let tools compute the next version number and release notes.

**What people argue about.** Merge commits versus a linear history from rebase or squash. Merge keeps the true story; linear history is easier to read and bisect. Both work if the team picks one and enforces it with branch rules. The other argument is trunk-based development (very short branches, merged daily) versus longer-lived feature branches. For most integrator teams, short feature branches plus protected \`main\` is the sweet spot.
`,

  history: `
Distributed Git made branching cheap, and hosting services turned the "please pull my branch" emails used in Linux kernel development into the web-based pull request. Branch protection and required status checks followed as teams connected automated testing to those pull requests. The Conventional Commits specification grew out of the commit message conventions of the Angular project and reached version 1.0.0 as a standalone specification aligned with semantic versioning.
`,

  examples: [
    {
      title: "A bad merge during a weekend run",
      body: `Saturday night, a merged PR changes an alarm pipeline and operators stop receiving SMS for LAHH-101. The on-call engineer runs \`git revert -m 1 <merge-commit>\` on \`main\`, opens a PR with the revert, gets it approved by phone, deploys, and confirms a test alarm arrives. Monday, the original author fixes the pipeline on a new branch. History shows the change, the revert and the fix.`
    },
    {
      title: "Reading a release from the log",
      body: `\`git log v1.4.0..v1.5.0 --oneline\` prints \`feat(area20): add case packer OEE view\`, \`fix(area10): correct LT101 scaling to 0-5.0 m\` and two \`docs\` commits. The release notes write themselves, and the MINOR bump is justified by the one \`feat\`.`
    }
  ],

  diagrams: {
    flow: `<svg viewBox="0 0 640 210" role="img" aria-label="Feature branch flow: branch from main, commit, push, open pull request, checks and review, merge to protected main, tag release">
  <defs><marker id="dev-git-team-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="16" y="40" width="96" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="64" y="62">branch</text>
  <text class="dg-text-muted dg-mid" x="64" y="80">from main</text>
  <rect class="dg-box" x="140" y="40" width="96" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="188" y="62">commit</text>
  <text class="dg-text-muted dg-mid" x="188" y="80">and push</text>
  <rect class="dg-box-accent" x="264" y="40" width="112" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="320" y="62">pull request</text>
  <text class="dg-text-muted dg-mid" x="320" y="80">review</text>
  <rect class="dg-box-warn" x="404" y="40" width="96" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="452" y="62">checks</text>
  <text class="dg-text-muted dg-mid" x="452" y="80">must pass</text>
  <rect class="dg-box-ok" x="528" y="40" width="96" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="576" y="62">merge</text>
  <text class="dg-text-muted dg-mid" x="576" y="80">to main</text>
  <line class="dg-line" x1="112" y1="65" x2="138" y2="65" marker-end="url(#dev-git-team-ah)"/>
  <line class="dg-line" x1="236" y1="65" x2="262" y2="65" marker-end="url(#dev-git-team-ah)"/>
  <line class="dg-line" x1="376" y1="65" x2="402" y2="65" marker-end="url(#dev-git-team-ah)"/>
  <line class="dg-line" x1="500" y1="65" x2="526" y2="65" marker-end="url(#dev-git-team-ah)"/>
  <rect class="dg-zone" x="404" y="120" width="220" height="70" rx="8"/>
  <text class="dg-text-sm" x="418" y="144">protected main</text>
  <text class="dg-text-muted" x="418" y="166">no direct pushes, no force</text>
  <line class="dg-line" x1="576" y1="90" x2="576" y2="118" marker-end="url(#dev-git-team-ah)"/>
  <rect class="dg-box" x="140" y="130" width="200" height="50" rx="6"/>
  <text class="dg-text-sm dg-mid" x="240" y="152">tag v1.5.0</text>
  <text class="dg-text-muted dg-mid" x="240" y="170">release notes, deploy</text>
  <line class="dg-line" x1="404" y1="155" x2="342" y2="155" marker-end="url(#dev-git-team-ah)"/>
</svg>`,
    mergerebase: `<svg viewBox="0 0 640 230" role="img" aria-label="Merge adds a merge commit joining two lines; rebase replays feature commits as new commits on top of main">
  <defs><marker id="dev-git-team-ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <text class="dg-title" x="20" y="26">Merge</text>
  <circle class="dg-box" cx="40" cy="70" r="14"/>
  <circle class="dg-box" cx="110" cy="70" r="14"/>
  <circle class="dg-box" cx="180" cy="70" r="14"/>
  <circle class="dg-box-accent" cx="110" cy="130" r="14"/>
  <circle class="dg-box-accent" cx="180" cy="130" r="14"/>
  <circle class="dg-box-ok" cx="260" cy="70" r="16"/>
  <text class="dg-text-mono dg-mid" x="260" y="75">M</text>
  <line class="dg-line" x1="96" y1="70" x2="56" y2="70" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="166" y1="70" x2="126" y2="70" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="98" y1="122" x2="52" y2="80" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="166" y1="130" x2="126" y2="130" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="244" y1="70" x2="196" y2="70" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="246" y1="80" x2="194" y2="122" marker-end="url(#dev-git-team-ah2)"/>
  <text class="dg-text-muted" x="20" y="178">two parents, nothing rewritten</text>
  <text class="dg-title" x="340" y="26">Rebase</text>
  <circle class="dg-box" cx="360" cy="70" r="14"/>
  <circle class="dg-box" cx="430" cy="70" r="14"/>
  <circle class="dg-box" cx="500" cy="70" r="14"/>
  <circle class="dg-box-accent" cx="570" cy="70" r="14"/>
  <circle class="dg-box-accent" cx="620" cy="70" r="14"/>
  <line class="dg-line" x1="416" y1="70" x2="376" y2="70" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="486" y1="70" x2="446" y2="70" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="556" y1="70" x2="516" y2="70" marker-end="url(#dev-git-team-ah2)"/>
  <line class="dg-line" x1="606" y1="70" x2="586" y2="70" marker-end="url(#dev-git-team-ah2)"/>
  <circle class="dg-box dg-dash" cx="430" cy="130" r="14"/>
  <circle class="dg-box dg-dash" cx="500" cy="130" r="14"/>
  <text class="dg-text-muted" x="340" y="178">feature commits copied on top</text>
  <text class="dg-text-muted" x="340" y="198">with new hashes; old ones abandoned</text>
</svg>`
  },

  pitfalls: [
    "Pushing directly to main 'just this once' because protection wasn't turned on.",
    "Rebasing or force-pushing a branch someone else is also working on.",
    "Using git reset on main to undo a bad change, which rewrites shared history.",
    "Treating a tag or UDT member rename as a minor change when it breaks every binding.",
    "Deploying 'whatever is on main' instead of a tagged release."
  ],

  keyTerms: ["feature-branch", "pull-request", "protected-branch", "required-check", "conventional-commits", "git-merge", "git-rebase", "git-revert", "github-release"],

  quiz: [
    {
      q: "A merged PR broke alarm notifications on the live system. What should you do on main?",
      options: ["git reset --hard to the commit before the merge and force-push", "Delete main and recreate it from the release tag", "git revert the merge commit and deploy that", "Edit the files by hand on the Gateway"],
      answer: 2,
      explain: [
        "That rewrites shared history and breaks everyone else's clone; protected branches usually block it anyway.",
        "Far more destructive than needed and loses later work.",
        "Correct. Revert adds a new commit that undoes the change and keeps the audit trail.",
        "That makes the Gateway disagree with Git, so the next deploy brings the bug back."
      ]
    },
    {
      q: "Which commit message would trigger a MAJOR version bump under Conventional Commits?",
      options: ["feat(tags)!: rename Motor UDT Cfg members", "fix(area10): correct LT101 scaling", "feat(area20): add OEE view", "docs: update commissioning notes"],
      answer: 0,
      explain: [
        "Correct. The ! marks a breaking change, which maps to MAJOR.",
        "fix maps to PATCH.",
        "feat maps to MINOR.",
        "docs has no version effect by itself."
      ]
    },
    {
      q: "Your local feature branch is behind main and nobody else has pulled it. You want a straight history before opening the PR. What's appropriate?",
      options: ["Rebase main onto your branch", "Reset main to your branch", "Delete main", "Rebase your branch onto main"],
      answer: 3,
      explain: [
        "That rewrites the shared branch. Never rebase what others have.",
        "That would throw away other people's work on main.",
        "That destroys the shared branch and everyone else's work on it.",
        "Correct. Rebasing your own unshared commits is safe and gives a linear history."
      ]
    },
    {
      q: "What does 'require status checks to pass' on a protected main enforce?",
      options: ["That the author has run tests on their laptop", "That the PR can't be merged until the configured CI checks report success", "That every commit is signed", "That a release is created automatically"],
      answer: 1,
      explain: [
        "Nothing proves that. This is exactly why the server runs the checks.",
        "Correct. The hosting service blocks the merge button until the named checks are green.",
        "Signed commits are a separate rule.",
        "Releases are a separate step."
      ]
    },
    {
      q: "Why deploy a tagged release instead of 'the latest main'?",
      options: ["The deployed system, release notes and acceptance record all point at one fixed commit", "Tags deploy faster", "main can't be deployed", "Tags are required by Ignition"],
      answer: 0,
      explain: [
        "Correct. A tag doesn't move, so everyone knows exactly what is running.",
        "Speed is the same; it's the same files.",
        "main can be deployed; it's just a moving target.",
        "Ignition doesn't know about Git tags."
      ]
    }
  ],

  resources: [
    { title: "About protected branches", url: "https://docs.github.com/en/enterprise-cloud@latest/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches", type: "docs", source: "GitHub Docs" },
    { title: "Conventional Commits 1.0.0", url: "https://www.conventionalcommits.org/en/v1.0.0/", type: "standard", source: "conventionalcommits.org" },
    { title: "Git Branching: Rebasing (Pro Git)", url: "https://git-scm.com/book/en/v2/Git-Branching-Rebasing", type: "book", source: "git-scm.com" },
    { title: "git-revert documentation", url: "https://git-scm.com/docs/git-revert.html", type: "docs", source: "git-scm.com" }
  ]
});
