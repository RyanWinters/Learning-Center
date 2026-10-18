# Learning Center

A self-hosted course for becoming an Ignition and controls integrator. It has 121 lessons across 10 tracks, from field
devices and 4–20 mA up to MES, the Unified Namespace and multi-site architecture. There's also a ladder-logic simulator with graded
challenges, a tap-anywhere glossary, quizzes, a review queue, and XP, streaks and badges.

Your progress is stored on the PC that runs the server, so your phone and PC always show the same progress.

## Run it

You need Python 3.8 or newer. There's nothing else to install.

```
python server.py
```

Then open http://localhost:8080 on the PC.

Use `--port 9000` to change the port. Progress is saved to `data/progress.json`, with the previous version kept in
`progress.json.bak`. That folder is ignored by git. Copy it if you want a backup.

## Use it from your phone with Tailscale

The server only listens on the PC itself (127.0.0.1). Tailscale publishes it privately to your devices:

1. Install Tailscale on the PC and the phone, and sign both into the same tailnet.
2. On the PC, run once: `tailscale serve --bg 8080`. It prints an address like `https://<pc-name>.<tailnet>.ts.net`.
3. Open that address on the phone. On iPhone, Share → Add to Home Screen turns it into an app icon.

Only devices on your tailnet can reach it, and the connection uses HTTPS. Nothing on your home or plant LAN can see it.
`tailscale serve` remembers the setting across reboots. To undo it, run `tailscale serve --https=443 off`.

If you really want plain LAN access instead, use `python server.py --host 0.0.0.0`. The progress API has no login, so
anyone on that network could change your progress.

## Start it automatically on Windows

1. Make `start-learning-center.bat` next to `server.py`:
   ```
   @echo off
   cd /d "%~dp0"
   pythonw server.py
   ```
2. Press Win+R, type `shell:startup`, and put a shortcut to that .bat file in the folder that opens.

`pythonw` runs it without a console window. To stop it, end "pythonw.exe" in Task Manager.

## What's inside

| Path | What it is |
|---|---|
| `index.html`, `assets/` | The app: plain HTML, CSS and JavaScript, with no build step |
| `content/curriculum.js` | Tracks, lesson order and prerequisites |
| `content/lessons/*.js` | One file per lesson: reading, ELI5, why, history, diagrams, quiz, sources |
| `content/glossary/*.js` | About 720 industry terms. They are linked automatically wherever they appear |
| `content/sim/*.js` | Ladder simulator challenges |
| `server.py` | Static file server plus the progress API |
| `tools/validate.js` | Checks every lesson, quiz, diagram and glossary reference |
| `tools/sim-test.js` | Runs every simulator challenge's solution against its tests |
| `docs/` | The plan, specs, writer guide and verified-facts list used to build this |

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
