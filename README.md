# Learning Center

A self-hosted course for becoming an Ignition and controls integrator. It has 141 lessons: 136 in 11 tracks (T0–T9 plus HMI & Screen Design) and 5 hands-on Ignition Build Labs, from field
devices and 4–20 mA up to MES, the Unified Namespace and multi-site architecture. There's also a ladder-logic simulator with 26 graded
challenges (Logix-style module I/O tags such as `Local:1:I.Data.0`), a tap-anywhere glossary of about 800 terms, quizzes, a review queue,
an Integrator readiness page, and XP, streaks and badges.

Your progress is stored on the PC that runs the server, so your phone and PC always show the same progress.

## Run it

You need Python 3.8 or newer. There's nothing else to install.

```
python server.py
```

Then open http://localhost:8080 on the PC.

Use `--port 9000` to change the port. Progress is saved to `data/progress.json`, with the previous version kept in
`data/progress.json.bak`. That folder is ignored by git. Copy it if you want a backup.

The server only serves `index.html`, `assets/` and `content/`. `docs/`, `tools/`, `server.py`, `data/` and dotfiles return 404.

## Ask Claude

Every lesson has an **Ask Claude** button. It opens a tutor chat that walks you through the lesson in small
chunks, each with an everyday analogy and a quick-check question, and waits for your answer before moving on.
`server.py` answers by running the [Claude Code](https://claude.com/claude-code) CLI on the same PC
(`claude -p`, Opus, no tools), so it uses your Claude plan and needs no API key. The CLI must be installed and
signed in; if `claude` isn't on PATH, set `LC_CLAUDE` to its full path. Each lesson's chat is kept in that
browser, and **Start over** clears it.

## Use it from your phone with Tailscale

The server only listens on the PC itself (127.0.0.1). Tailscale publishes it privately to your devices:

1. Install Tailscale on the PC and the phone, and sign both into the same tailnet.
2. On the PC, run once: `tailscale serve --bg 8080`. It prints an address like `https://<pc-name>.<tailnet>.ts.net`.
3. Open that address on the phone. On iPhone, Share → Add to Home Screen turns it into an app icon.

Only devices on your tailnet can reach it, and the connection uses HTTPS. Nothing on your home or plant LAN can see it.
`tailscale serve` remembers the setting across reboots. To undo it, run `tailscale serve --https=443 off`.

If you really want plain LAN access instead, use `python server.py --host 0.0.0.0`. The progress API has no login, so
anyone on that network could change your progress.

## Start it automatically on Windows, and keep it up to date

`autoupdate.pyw` runs the server with no console window and checks GitHub every 5 minutes. When `main` has new
commits it fast-forwards the checkout, so merged lessons show up on the next page load. It restarts the server only
when `server.py` changed. It skips the update if the checkout isn't on `main` or has edits to tracked files.
It logs to `data/autoupdate.log`. Git must be on the PATH.

1. Press Win+R, type `shell:startup`, and put a shortcut to `autoupdate.pyw` in the folder that opens.
   Python opens `.pyw` files with `pythonw`, so no window appears.
2. Double-click it once to start it now.

To stop it, end both "pythonw.exe" processes in Task Manager.

PRs from Claude's `claude/*` branches merge into `main` on their own once CI passes (`.github/workflows/ci.yml`),
so a change Claude makes reaches the PC within a few minutes of its checks going green.

## What's inside

| Path | What it is |
|---|---|
| `index.html`, `assets/` | The app: plain HTML, CSS and JavaScript, with no build step. Fonts are self-hosted in `assets/fonts/` (declared in `assets/css/fonts.css`), so it works with no internet |
| `content/curriculum.js` | Tracks, lesson order and prerequisites |
| `content/lessons/*.js` | One file per lesson: reading, ELI5, why, history, diagrams, quiz, sources |
| `content/glossary/*.js` | About 800 industry terms. They are linked automatically wherever they appear |
| `content/sim/*.js` | Ladder simulator challenges (`index.js` lists them) |
| `content/files/` | Downloads linked from lessons: FDS outline, HMI checklist, I/O list template, naming sheet |
| `autoupdate.pyw` | Runs the server and pulls new commits from `main` every 5 minutes |
| `server.py` | Static file server plus the progress API (`/api/progress`) and the tutor (`/api/tutor`); both need an `X-LC: 1` header |
| `tools/validate.js` | Checks every lesson, quiz, diagram and glossary reference |
| `tools/sim-test.js` | Runs every simulator challenge's solution against its tests |
| `docs/` | The original plan, specs, writer guide, house standard and verified-facts list used to build this. `docs/reviews/` holds the review and audit notes |

## Accuracy

Lessons were researched against the Ignition 8.3 manual, Inductive University, the IA forum, Rockwell, Sepasoft, Cirrus Link
and the standards bodies, and every lesson links its sources. Ignition moves quickly, so trust the official manual over a lesson
for exact menu paths and function signatures. `docs/FACTS.md` lists the version-sensitive facts that were checked directly.

## Editing content

Lessons are plain JavaScript objects (see `docs/CONTENT_GUIDE.md`). After editing, run:

```
node tools/validate.js
node tools/sim-test.js
node tools/test-merge.js
python tools/test_server.py
```
