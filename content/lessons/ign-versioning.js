LC.lesson({
  id: "ign-versioning",
  title: "Backups, exports and version control",
  track: "ignition",
  minutes: 20,
  level: 3,
  prereqs: ["ign-projects"],
  tags: ["backup", "gwbk", "git", "version-control", "deployment", "promotion"],
  summary: "How to never lose a gateway, how to see who changed what, and how to move work from dev to production without hand-copying.",
  objectives: [
    "Distinguish a gateway backup from a project export and a tag export",
    "Set up scheduled backups and say what a restore does and does not bring back",
    "Describe how 8.3 stores projects and gateway config as files on disk",
    "Choose what to commit to git and what to ignore",
    "Explain dev, test and prod promotion and how deployment modes handle per-environment settings"
  ],

  body: `
## Three things people call "a backup"

A gateway can be saved in three different ways, and they serve different jobs.

| Artifact | File | What it holds | Use it for |
|---|---|---|---|
| Gateway backup | \`.gwbk\` | Projects, tags, gateway settings (devices, databases, security), many module settings | Disaster recovery, cloning a gateway |
| Project export | \`.zip\` (or \`.proj\` in older versions) | One project's resources | Moving one project between gateways |
| Tag export | \`.json\` | Tag definitions, UDTs, folders | Moving or reviewing tags |

A \`.gwbk\` is all-or-nothing. Restoring it replaces the gateway's state with the state at backup time. That is exactly what you want after a failed disk and exactly what you do not want when you only wanted to move last week's screen change to production.

## Gateway backups

You make one manually from the Gateway web page (Config, then Backup/Restore in the System area) or let the gateway make them on a schedule. Scheduled backups are set under gateway settings: enable them, pick a folder (a local path or a network share), give a cron-style schedule and a retention count so old files get removed. The default file name includes the gateway name and a timestamp.

> [!warning] A backup on the same disk is not a backup
> If the scheduled backup writes to \`C:\\Backups\` on the gateway machine and the disk dies, you lose both. Send backups to a different machine, such as a network share or an object store, and test a restore. An untested backup is a hope.

### What a restore does not bring back

- **Historian data and audit rows** live in your database. Back that up separately.
- **Licenses** may need re-activation on new hardware.
- **Audit profiles and some other resources** can come back disabled and need attention after a restore.
- **Module files and drivers** may need installing again if the new gateway lacks them.
- **The internal audit log** and transient data are not part of the file.

> [!tip] Take a backup before every change window
> A manual \`.gwbk\` takes seconds on most gateways and turns a bad change into a ten-minute rollback.

## Project and tag exports

A project export is a portable copy of one project. In the Designer, or on the Gateway project page, you export it and import it elsewhere. Importing into an existing project name can overwrite it, so check the prompt.

Tags export as JSON from the Tag Browser. Because the format is text, a tag export is a handy way to diff a UDT before and after a change. It is not the right tool for a large change history. For that, use version control.

## 8.3: configuration and projects are files

Ignition 8.3 changed where things live. The gateway keeps projects and configuration as files and folders under its data directory, not hidden in an internal database. That makes standard source control practical.

\`\`\`text
data/
  projects/
    Global/
      project.json
      com.inductiveautomation.perspective/views/Main/
        view.json
        resource.json
    Packaging/
      project.json
      ...
  config/
    resources/core/
      ignition/database-connection/MainDB/
        config.json
        resource.json
\`\`\`

Each resource is a folder with its payload (\`view.json\`, \`code.py\`, \`config.json\` and so on) and a small \`resource.json\` that records metadata: scope, version, last modification, who changed it and file signatures. Gateway-scope resources such as database connections, device connections and tag provider configuration are under the config tree. This means you can version more than screens: the whole gateway setup can sit in a repository.

> [!note] In 8.1
> Projects and gateway settings are stored in the gateway's internal database. There are no per-resource folders to commit, so teams used project exports, tag exports and the community \`ignition-git\` style tooling, or the Git module-based workflows, to get files. 8.3 makes the file layout native.

## Git for Ignition

A working pattern:

1. **Put \`data/projects\` and the gateway config you want to track under git.** A repository per gateway, or one per customer site, works well.
2. **Commit small.** One change to a view is one commit with a message like \`Motor faceplate: add run-hours\`.
3. **Use branches for features.** Engineers work on a dev gateway on a branch and merge when it is tested.
4. **Review diffs.** Because views are JSON, a diff shows what changed, though large Perspective views are noisy. Review the intent, not every line.
5. **Keep secrets out.** Database passwords and certificates do not belong in a public or widely shared repo. Treat them as environment-specific.

### What to ignore

- Runtime and cache files that the gateway rewrites constantly.
- Memory-tag persistence data.
- Any resources the vendor guide lists as binary. The official version-control guide suggests ignoring a few resource types that are stored as Java binary files and cannot be merged sensibly, including transaction groups, reports, alarm pipelines and client tags. Check the current guide for the list that matches your version.
- Local scratch folders and a \`.resources\` helper folder some teams see. Forum advice is not to commit it.

> [!warning] After switching branches, tell the gateway
> If you check out another branch on a live gateway, the gateway does not always notice the files changed. Trigger a project scan (the gateway exposes a scan endpoint) or reload, or you will see stale projects. This is a reason to switch branches on dev only.

## Dev, test and prod

A mature plant has at least three gateways: **dev** (engineers break things), **test or QA** (a copy of prod's structure that you can validate against), and **prod** (operators run the plant). Changes flow one way:

{{diagram:promote}}

The key rule is that **prod is never edited by hand**. Work is done on dev, committed, tested, then promoted. In 8.3 promotion can be a git pull on the server, a deployment tool, or an import. Whichever you choose, it should be repeatable. If two people cannot do it the same way, it is a ritual, not a process.

### The environment problem

The same project must behave differently per environment. Dev points at a test PLC and a dev database. Prod points at the real ones. Copying files blindly would send dev devices to prod.

8.3 addresses this with **deployment modes**: named modes (such as dev, test, prod) that let some configuration resources have a mode-specific version. A gateway is told which mode it is in, and mode-specific resources replace or add to the base ones. So the project and logic are identical everywhere, and only the endpoints change. In 8.1 you handled this with tag provider names, a startup script that sets values, or hand-editing after each import.

> [!example] Worked example: a safe release
> Tuesday: an engineer branches \`feature/line3-oee\` on dev, builds the view, commits three times. Wednesday: the branch is merged to \`main\` after review, and test pulls \`main\`. QA verifies against the test PLC simulator. Thursday 02:00: the prod gateway takes a manual \`.gwbk\`, pulls \`main\`, scans projects, and the operator confirms the new view. If it breaks, prod restores the \`.gwbk\` taken minutes earlier, or checks out the previous commit and rescans.
`,

  eli5: `
Suppose you write a long school essay on a computer. A backup is photocopying the whole essay and keeping the copy in a drawer at home, so a spilled drink on your laptop is not the end of the world. If the copy is in the same bag as the laptop, the spilled drink gets both.

Version control is different. It is like keeping every draft in a folder, labeled with who changed what and why: "Tuesday: fixed the second paragraph." If you ruin the essay on Friday, you can open Tuesday's draft. You can also compare any two drafts and see exactly what changed.

Dev, test and prod are like practice, dress rehearsal and the real show. You try the new scene in practice. You run it again in the dress rehearsal. Only after that does the audience see it. You never change the script during the show.
`,

  why: `
**Why not just back up the gateway?** A gateway backup restores the past. It does not explain it. If a setpoint view started behaving oddly three weeks ago, a pile of backups cannot tell you which change did it. Version control gives intent and history. Backups give disaster recovery. A serious system has both, because they answer different questions.

**Why is "all or nothing" a problem for promotion?** Restoring a backup onto prod also restores dev's device addresses, test users and whatever else differs. Promoting by files or project export moves only the thing you changed. That is why the official guidance treats gateway backups as recovery tools, not as the usual migration path.

**Why argue about what to commit?** Some teams commit everything the gateway writes, to be able to rebuild a site from the repository alone. Others commit only projects and tag exports because binary and secret-bearing files cause merge pain and leak risk. The tradeoff is completeness against noise and safety. A sensible middle is to commit projects and the config you can read, ignore binary and secret files, and keep the rest in the backup.

**Why forbid editing prod?** The quick fix at 2 a.m. works once and then nobody remembers it. The next promotion overwrites it and the bug returns. If an emergency edit must happen, back-port it to dev the same day.

**Why deployment modes?** The alternative is a sheet of manual steps to change after every deployment. Each step is a chance for a dev address to reach prod. Moving the differences into declared configuration makes the safe path the default.
`,

  history: `
Ignition 7 and 8.0 stored projects inside the gateway, and teams worked around that with exports and community tools that dumped projects into files for git. Inductive Automation later published a version control guide for 8.1 and made file-based storage native in 8.3, so a gateway's projects and configuration live as readable folders and files that standard tools can handle.
`,

  examples: [
    {
      title: "Recovering from a bad Friday change",
      body: `A tag change script deployed Friday starts writing the wrong value. Version history shows one commit touched it. Rolling back on prod: take a \`.gwbk\` anyway, \`git revert\` that commit, scan projects, confirm the script is back. Total time about five minutes, and the fix is on record for the post-mortem.`
    },
    {
      title: "Cloning a gateway for test",
      body: `You need a test gateway that matches prod. Restore last night's \`.gwbk\` onto a new server, then switch it to the test deployment mode so devices point at the simulator, disable alarm notification pipelines so test alarms do not text real people, and re-activate the license.`
    }
  ],

  diagrams: {
    promote: `<svg viewBox="0 0 640 220" role="img" aria-label="Changes go from a dev gateway to a git repository, then to a test gateway, then to production, with backups taken before each production change">
  <defs><marker id="ign-versioning-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="dg-fill-line" d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <rect class="dg-box" x="20" y="50" width="120" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="80" y="78">Dev</text>
  <text class="dg-text-sm dg-mid" x="80" y="100">build and break</text>
  <rect class="dg-box-accent" x="180" y="50" width="120" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="240" y="78">Git</text>
  <text class="dg-text-sm dg-mid" x="240" y="100">history, review</text>
  <rect class="dg-box" x="340" y="50" width="120" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="400" y="78">Test</text>
  <text class="dg-text-sm dg-mid" x="400" y="100">validate</text>
  <rect class="dg-box" x="500" y="50" width="120" height="70" rx="6"/>
  <text class="dg-title dg-mid" x="560" y="78">Prod</text>
  <text class="dg-text-sm dg-mid" x="560" y="100">operators</text>
  <line class="dg-line" x1="140" y1="85" x2="178" y2="85" marker-end="url(#ign-versioning-ah)"/>
  <line class="dg-line" x1="300" y1="85" x2="338" y2="85" marker-end="url(#ign-versioning-ah)"/>
  <line class="dg-line" x1="460" y1="85" x2="498" y2="85" marker-end="url(#ign-versioning-ah)"/>
  <rect class="dg-box" x="440" y="150" width="180" height="46" rx="6"/>
  <text class="dg-text-sm dg-mid" x="530" y="170">.gwbk before each release</text>
  <text class="dg-text-muted dg-mid" x="530" y="188">off-box copy</text>
  <text class="dg-text-muted" x="20" y="160">Each gateway runs its own</text>
  <text class="dg-text-muted" x="20" y="178">deployment mode (dev, test, prod)</text>
  <text class="dg-text-muted" x="20" y="196">for endpoints and credentials.</text>
</svg>`
  },

  pitfalls: [
    "Storing the only backup on the gateway's own disk.",
    "Never testing a restore until the day you need it.",
    "Promoting by restoring a .gwbk and overwriting prod with dev settings.",
    "Hand-editing production and losing the change at the next deployment.",
    "Committing passwords, certificates or runtime cache files to a shared repository.",
    "Switching git branches on a live gateway without a project scan."
  ],

  keyTerms: ["gwbk", "gateway-backup", "project-export", "git", "resource-json", "deployment-mode", "dev-test-prod"],

  quiz: [
    {
      q: "You changed one Perspective view on dev and want it on prod. Which approach is the best fit?",
      options: ["Restore dev's .gwbk onto prod", "Promote the project change through git or a project export", "Retype the view by hand on prod", "Copy the whole data folder from dev"],
      answer: 1,
      explain: [
        "A restore replaces everything, including dev's devices and settings.",
        "Correct. Promote the change itself and leave environment settings alone.",
        "Retyping invites mistakes and leaves no record.",
        "Copying the whole folder carries environment config too."
      ]
    },
    {
      q: "Which of these is NOT brought back by restoring a .gwbk file onto a new server?",
      options: ["Project resources", "Tag definitions", "Historian data stored in your SQL database", "Gateway settings such as database connections"],
      answer: 2,
      explain: [
        "Projects are in the backup.",
        "Tags are in the backup.",
        "Correct. Historian data lives in your database, which needs its own backup.",
        "Gateway settings are in the backup."
      ]
    },
    {
      q: "In an 8.3 project on disk, what is the job of resource.json?",
      options: ["It stores the resource's payload such as a view's layout", "It stores metadata about the resource, like its scope, version and signatures", "It stores the gateway password", "It holds historian data"],
      answer: 1,
      explain: [
        "The payload is in a separate file such as view.json.",
        "Correct. Each resource has a small metadata file next to its payload.",
        "Secrets are not stored this way.",
        "Historian data is in a database."
      ]
    },
    {
      q: "The dev and prod gateways must use different PLC addresses for the same project. What is the 8.3 way to handle that?",
      options: ["Edit the project on prod after each deployment", "Use deployment modes to give mode-specific configuration", "Keep two copies of every view", "Disable the devices in test"],
      answer: 1,
      explain: [
        "Post-deployment hand edits are the error-prone approach.",
        "Correct. Mode-specific resources let identical projects differ only in endpoints.",
        "Duplicated views drift apart.",
        "Disabling devices does not point them at the right addresses."
      ]
    },
    {
      q: "A scheduled backup runs nightly, writing to a folder on the gateway's own C: drive. What is the main weakness?",
      options: ["Backups cannot be scheduled", "A disk failure loses both the gateway and its backups", "The .gwbk file is unreadable", "Retention is not possible"],
      answer: 1,
      explain: [
        "Scheduled backups are supported.",
        "Correct. Store backups off the machine, and test a restore.",
        "The file is readable by Ignition.",
        "A retention count removes old files."
      ]
    },
    {
      q: "Why might a team add transaction groups and reports to .gitignore?",
      options: ["They are secret", "They are stored as binary data that cannot be merged or reviewed sensibly", "Git cannot store files over 1 KB", "They are never needed again"],
      answer: 1,
      explain: [
        "They are not secret by nature.",
        "Correct. The official guide suggests ignoring resource types stored as Java binary files, which cannot be diffed meaningfully.",
        "Git handles large files.",
        "They are needed, which is why backups still cover them."
      ]
    }
  ],

  resources: [
    { title: "Version and Source Control Guide (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/tutorials/version-control-guide", type: "docs", source: "Inductive Automation" },
    { title: "Ignition 8 Deployment Best Practices", url: "https://www.docs.inductiveautomation.com/docs/8.3/tutorials/ignition-8-deployment-best-practices", type: "docs", source: "Inductive Automation" },
    { title: "Gateway Backup and Restore (8.3)", url: "https://www.docs.inductiveautomation.com/docs/8.3/platform/gateway/gateway-backup-and-restore", type: "docs", source: "Inductive Automation" },
    { title: "Making Ignition Gateway Backups", url: "https://inductiveuniversity.com/videos/making-ignition-gateway-backups/8.3", type: "video", source: "Inductive University" },
    { title: "Gateway Folder Structure Reference", url: "https://www.docs.inductiveautomation.com/docs/8.3/appendix/reference-pages/gateway-folder-structure", type: "docs", source: "Inductive Automation" },
    { title: "Guide for Version Control with Ignition", url: "https://forum.inductiveautomation.com/t/guide-for-version-control-with-ignition/84004", type: "forum", source: "Inductive Automation Forum" },
    { title: "8.3 project load issues when switching git branches", url: "https://forum.inductiveautomation.com/t/ignition-8-3-project-load-issues-when-switching-git-branches/111132", type: "forum", source: "Inductive Automation Forum" }
  ]
});
