LC.lesson({
  id: "dev-git",
  title: "How Git works",
  track: "dev",
  minutes: 25,
  level: 2,
  prereqs: ["dev-bash", "ign-versioning"],
  tags: ["git", "version-control", "commits", "branches", "devops"],
  summary: "Commits are snapshots, branches are sticky notes, HEAD is 'you are here', and the reflog is the undo history nobody tells you about. Get the model right and every Git command makes sense.",
  objectives: [
    "Describe a commit as a snapshot with a parent pointer, and explain what its hash identifies",
    "Explain the working tree, staging area and repository, and what add and commit move between them",
    "Explain that a branch is a movable pointer and HEAD says which one you are on, including detached HEAD",
    "Choose between annotated and lightweight tags for a release",
    "Recover 'lost' commits with the reflog"
  ],

  body: `
## Why the model matters

{{lesson:ign-versioning}} showed why an Ignition 8.3 project belongs in Git and what to ignore. This lesson is about what Git is actually doing, because almost every Git panic ("I lost my work", "detached HEAD", "where did my branch go") comes from a wrong mental model. Git has very few concepts. Learn these five and the commands stop being magic.

## Commits are snapshots

A {{term:git-commit|commit}} records the **whole state** of the project at one moment, not a list of changes. Git stores each file's content once, as a *blob*, and a *tree* that lists which blob sits at which path. A commit points to one tree, plus its author, date, message and **parent** commit.

Because unchanged files point to the same blob, a snapshot of 2,000 Ignition resource files where only three changed costs almost nothing extra. Git computes diffs on demand by comparing two snapshots.

Every object is named by a hash of its content, the {{term:commit-hash|commit hash}}: \`3f9c2a1…\`. Change one byte anywhere in the history and every later hash changes. That gives you two guarantees: you can't silently edit history without everyone noticing, and the short hash in a ticket identifies exactly one version of the system.

## Three places your files live

| Area | What it is | Moved by |
|---|---|---|
| **Working tree** | The files on disk you edit (or that Ignition writes) | Your editor, the Designer |
| **{{term:staging-area\\|Staging area}}** (the index) | The snapshot you are preparing for the next commit | \`git add\` |
| **Repository** | All committed snapshots, in \`.git\` | \`git commit\` |

\`git status\` shows the difference between these three. The staging area exists so you can commit part of what changed: for example, the faceplate fix but not the experimental view you also touched.

## Branches are pointers

A {{term:git-branch|branch}} is a tiny file containing one commit hash. That's it. Creating a branch costs nothing because no files are copied.

{{diagram:graph}}

When you commit, Git creates the new snapshot with the current commit as its parent, then **moves the current branch pointer forward** to it. The old commits don't move. Two branches that started from the same commit grow in different directions until someone merges them.

## HEAD: you are here

{{term:git-head|HEAD}} is a pointer to the branch you are on. When you \`git switch feature/m101-faceplate\`, Git moves HEAD to that branch and updates the working tree to match that branch's snapshot.

If you check out a commit hash or a tag directly, HEAD points at the commit itself instead of a branch. That is **detached HEAD**. It's safe for looking around (for example, inspecting what was deployed at release \`v1.4.0\`), but new commits made there belong to no branch, and once you switch away they are only reachable through the reflog. If you want to keep work started there, create a branch on the spot: \`git switch -c hotfix/lt101-scaling\`.

## Tags mark releases

A {{term:git-tag|tag}} is a name for one commit that, unlike a branch, does not move.

| | Lightweight tag | Annotated tag |
|---|---|---|
| What it stores | Just a pointer to a commit | A full object: tagger, date, message (can be signed) |
| Create | \`git tag v1.4.0\` | \`git tag -a v1.4.0 -m "Plant 1 Area10 go-live"\` |
| Use for | Private bookmarks | Releases anyone else relies on |

Tags are **not pushed by default**. \`git push\` sends commits and branches; you push a tag explicitly with \`git push origin v1.4.0\`. A release tag that only exists on your laptop is a classic handover surprise.

Tag names usually follow {{term:semantic-versioning|semantic versioning}}. {{lesson:dev-git-team}} connects tags to releases and commit messages.

## The reflog: Git's undo history

Every time HEAD or a branch tip moves (commit, switch, reset, rebase, merge), Git writes a line in the {{term:reflog}}, a private local log. \`git reflog\` shows it:

\`\`\`text
a41e0d2 HEAD@{0}: reset: moving to HEAD~3
9b77c10 HEAD@{1}: commit: Add LT101 high-high alarm
5e2f8aa HEAD@{2}: commit: Fix M101 faceplate tagPath binding
\`\`\`

\`HEAD@{1}\` means "where HEAD was one move ago". If a reset or a bad rebase seems to have erased three commits, they are almost certainly still there. Find the line before the mistake and put a branch on it:

\`\`\`text
git branch rescue 9b77c10
\`\`\`

Reflog entries expire (by default after 90 days, or 30 for commits no branch can reach), and the reflog is **local only**: it isn't pushed or cloned. It rescues mistakes on your machine, not a deleted server.

> [!example] Meridian Foods: what is running on the Gateway?
> The Area10 Gateway's project folder is a Git working tree. \`git log --oneline -1\` prints \`5e2f8aa Fix M101 faceplate tagPath binding\`, and \`git describe --tags\` prints \`v1.4.0-3-g5e2f8aa\`: three commits after the v1.4.0 tag. You now know exactly what is deployed, and that it isn't a tagged release.

## A worked sequence

\`\`\`text
git switch -c feature/lt101-alarms      # new branch at current commit, HEAD moves to it
# ... edit in the Designer, save ...
git status                              # see changed resource files
git add Plant1/Area10/LT101             # stage only the alarm changes
git commit -m "Add LT101 HH alarm"      # new snapshot; branch pointer moves
git log --oneline --graph --all         # see both branches diverge
\`\`\`

Nothing on \`main\` changed. Your work lives on its own pointer until it is reviewed and merged.
`,

  eli5: `
Imagine taking a photo of your whole workbench every time you finish a step. Each photo has a sticky note on the back saying which photo came before it. That stack of linked photos is your history. Git is very good at this: if nothing on part of the bench changed, it reuses the old picture of that part instead of taking a new one.

A branch is a bookmark stuck in the stack saying "my latest photo for this job is here". When you take a new photo, you move the bookmark forward. Two people can have two bookmarks and grow two different piles from the same starting photo.

HEAD is the "you are here" arrow pointing at the bookmark you're working with.

A tag is a bookmark that's glued down. It marks "this is what we shipped" and never moves.

The reflog is a diary of everywhere your arrow has pointed. If you think you threw photos away, you can read the diary and find them again, as long as you look within a few weeks.
`,

  why: `
**Why snapshots instead of diffs.** Diff-based tools have to replay every change to rebuild an old version, and a corrupted diff breaks everything after it. Snapshots make any version instantly available and make branches cheap. Cheap branches are what make the team workflow in the next lesson practical.

**Why content hashes.** A hash names the content itself, so two people who see the same hash are guaranteed to have the same files. For integrators this is the strongest form of "as-built": a commit hash on a site acceptance record identifies the exact configuration that was tested.

**Why a staging area.** Real work is messy. You fix the faceplate binding and also add a debug label you don't want shipped. Staging lets you commit the fix alone, keeping each commit about one change. Small, focused commits make review, revert and blame meaningful.

**Why the reflog exists.** Git rarely deletes anything right away. Commands that "lose" work usually just move a pointer. The reflog records every pointer move so you can put a pointer back. Knowing this changes how you react to mistakes: stop, read the reflog, rescue the commit, then think.

**What people argue about.** Whether to teach the internal model at all, or only a handful of commands. Engineers who learn only commands tend to delete and re-clone the repository when something odd happens, losing local work. Thirty minutes on the model saves that.
`,

  history: `
Git was written by Linus Torvalds for Linux kernel development, after the kernel project lost free access to the proprietary BitKeeper system. It was designed for speed, distributed work (every clone is a full repository) and integrity through content hashes. Hosting services built on Git, such as GitHub and GitLab, made it the default version control system for software and, increasingly, for automation projects whose configuration is stored as text.
`,

  examples: [
    {
      title: "Recovering after a hard reset",
      body: `An engineer ran \`git reset --hard HEAD~3\` to throw away a test commit and lost two good ones with it. \`git reflog\` shows the commit hash at \`HEAD@{1}\`, from before the reset. \`git branch rescue <hash>\` restores all three commits on a new branch, and the good ones are picked from there.`
    },
    {
      title: "Which version passed SAT?",
      body: `The Area20 site acceptance test record lists commit \`c81d4e7\`. Months later a complaint arrives. \`git switch --detach c81d4e7\` puts the exact tested configuration in the working tree for comparison, and \`git diff c81d4e7 main -- Plant1/Area20\` shows everything that changed in Area20 since.`
    }
  ],

  diagrams: {
    graph: `<svg viewBox="0 0 640 240" role="img" aria-label="Commit graph: main has commits A, B, C; feature branch has D and E from B; HEAD points to feature; tag v1.4.0 points to C">
  <defs><marker id="dev-git-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <circle class="dg-box" cx="70" cy="110" r="22"/>
  <text class="dg-text-mono dg-mid" x="70" y="115">A</text>
  <circle class="dg-box" cx="190" cy="110" r="22"/>
  <text class="dg-text-mono dg-mid" x="190" y="115">B</text>
  <circle class="dg-box" cx="310" cy="110" r="22"/>
  <text class="dg-text-mono dg-mid" x="310" y="115">C</text>
  <circle class="dg-box-accent" cx="310" cy="190" r="22"/>
  <text class="dg-text-mono dg-mid" x="310" y="195">D</text>
  <circle class="dg-box-accent" cx="430" cy="190" r="22"/>
  <text class="dg-text-mono dg-mid" x="430" y="195">E</text>
  <line class="dg-line" x1="168" y1="110" x2="94" y2="110" marker-end="url(#dev-git-ah)"/>
  <line class="dg-line" x1="288" y1="110" x2="214" y2="110" marker-end="url(#dev-git-ah)"/>
  <line class="dg-line" x1="290" y1="178" x2="210" y2="124" marker-end="url(#dev-git-ah)"/>
  <line class="dg-line" x1="408" y1="190" x2="334" y2="190" marker-end="url(#dev-git-ah)"/>
  <rect class="dg-box" x="360" y="92" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="400" y="114">main</text>
  <line class="dg-line-thin" x1="360" y1="109" x2="334" y2="109"/>
  <rect class="dg-box-warn" x="270" y="30" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="310" y="52">v1.4.0</text>
  <line class="dg-line-thin" x1="310" y1="64" x2="310" y2="88"/>
  <rect class="dg-box-accent" x="480" y="173" width="140" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="550" y="195">feature/lt101</text>
  <line class="dg-line-thin" x1="480" y1="190" x2="454" y2="190"/>
  <rect class="dg-box-ok" x="510" y="120" width="80" height="34" rx="6"/>
  <text class="dg-text-mono dg-mid" x="550" y="142">HEAD</text>
  <line class="dg-line-thin" x1="550" y1="154" x2="550" y2="172"/>
  <text class="dg-text-muted" x="20" y="232">Arrows point to the parent. Branches and tags are labels on commits; HEAD points to a branch.</text>
</svg>`
  },

  pitfalls: [
    "Thinking a branch is a copy of the files. It's a pointer; nothing is copied.",
    "Committing while in detached HEAD and then switching away, leaving the work on no branch.",
    "Tagging a release and forgetting to push the tag.",
    "Deleting and re-cloning a repository after a mistake, instead of reading the reflog.",
    "Making one huge commit of a week's work, which makes review and revert useless."
  ],

  keyTerms: ["git", "git-commit", "commit-hash", "staging-area", "git-branch", "git-head", "git-tag", "reflog", "semantic-versioning"],

  quiz: [
    {
      q: "You change 3 of 2,000 resource files in an Ignition project and commit. Roughly what does Git store for the new commit?",
      options: ["New blobs for the 3 changed files, a new tree, and a commit that reuses everything else", "A full copy of all 2,000 files", "A diff of the 3 changed files against the previous commit", "Nothing until you push"],
      answer: 0,
      explain: [
        "Correct. The snapshot is complete, but unchanged content is shared.",
        "Unchanged files point to blobs that already exist, so they aren't copied.",
        "Git stores snapshots, not diffs. Diffs are computed when you ask for them.",
        "Commits are stored locally the moment you make them."
      ]
    },
    {
      q: "What is a Git branch, physically?",
      options: ["A folder with a copy of the project", "A list of all commits made on it", "A separate repository on the server", "A movable pointer containing one commit hash"],
      answer: 3,
      explain: [
        "That's how some older tools worked; Git copies nothing.",
        "The history is found by following parent pointers from the branch's commit.",
        "Branches live inside a repository, locally and on remotes.",
        "Correct. That's why creating a branch is instant."
      ]
    },
    {
      q: "Git says 'You are in detached HEAD state' after you check out tag v1.4.0. What does that mean?",
      options: ["The repository is corrupted", "HEAD points directly at a commit, not a branch, so new commits won't belong to any branch", "The tag was deleted", "You can't look at files until you switch back"],
      answer: 1,
      explain: [
        "Detached HEAD is a normal, safe state.",
        "Correct. Look freely; create a branch with git switch -c if you want to keep new work.",
        "The tag is fine; you're looking at its commit.",
        "The working tree shows that commit's files and you can inspect them normally."
      ]
    },
    {
      q: "After a bad git reset --hard, two commits seem gone. What's the fastest safe recovery?",
      options: ["Find the earlier commit in git reflog and create a branch on it", "Delete the folder and clone again", "Ask a colleague to email their copy", "Run git gc to clean up"],
      answer: 0,
      explain: [
        "Correct. The reflog records where HEAD was before the reset.",
        "A fresh clone won't contain commits you never pushed.",
        "That might work if they had the commits, but the reflog is faster and exact.",
        "Garbage collection can permanently remove unreachable commits. That's the opposite of what you want."
      ]
    },
    {
      q: "Which tag should mark a release that the site will rely on?",
      options: ["A lightweight tag, because it's simpler", "A branch named release", "An annotated tag with a message, pushed to the shared remote", "No tag; the commit hash is enough"],
      answer: 2,
      explain: [
        "Lightweight tags carry no author, date or message, which matters for releases.",
        "Branches move. A release marker shouldn't.",
        "Correct. Annotated tags record who tagged it, when and why. Remember to push it.",
        "Hashes are exact but unreadable; a tag gives the release a name people can use."
      ]
    }
  ],

  resources: [
    { title: "Git Branching: Branches in a Nutshell (Pro Git)", url: "https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell", type: "book", source: "git-scm.com" },
    { title: "Git Basics: Tagging (Pro Git)", url: "https://git-scm.com/book/en/v2/Git-Basics-Tagging", type: "book", source: "git-scm.com" },
    { title: "git-reflog documentation", url: "https://git-scm.com/docs/git-reflog.html", type: "docs", source: "git-scm.com" }
  ]
});
