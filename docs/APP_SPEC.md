# App spec (shell, reader, quiz, progress, gamification)

*Updated to match the shipped app. It was first written as a build brief, so a few sections (Ownership, Verification) still read as instructions to the original builders.*

Vanilla JS, classic `<script>` tags (no modules, no build, no dependencies). Everything hangs off `window.LC`.
Served by `server.py` over HTTP. Must work great at 360–430px phone width and on desktop.

## Ownership
- **App builder** owns: `index.html`, `assets/css/app.css`, `assets/js/core/*`, `assets/js/views/*` except `lab.js`.
- **Simulator builder** owns: `assets/js/sim/*`, `assets/js/views/lab.js`, `content/sim/*`, `tools/sim-test.js`.
- Shared read-only: `assets/css/tokens.css`, `assets/css/diagrams.css`, `content/*`, `docs/*`.

## Load order (index.html)
1. Fonts are self-hosted: `assets/fonts/*.woff2` (Barlow Condensed 500/600/700, Atkinson Hyperlegible 400/700 + 400 italic, IBM Plex Mono 400/500, latin subset), declared in `assets/css/fonts.css` with `font-display: swap`. `index.html` preloads the two most-used files. There are no external requests, so the app works with no internet.
2. CSS: fonts.css, tokens.css, diagrams.css, app.css, sim.css.
3. `content/curriculum.js`, then core JS (`registry.js` first: defines `LC.lesson/LC.glossary/LC.sim` registration functions), then the glossary files from `LC_GLOSSARY_FILES` injected in order, then views, sim scripts and `content/sim/index.js`, then `app.js` boots the router once glossary files have loaded.
- Lessons load **on demand**: `LC.loadLesson(id)` injects `content/lessons/<id>.js` and resolves when `LC.lessons[id]` exists.
  On a 404 the lesson is "Coming soon". Show its title, prereqs and summary from the index, and don't let it be completed.
- `content/sim/<id>.js` is loaded on demand by the simulator the same way.

## Registry API (exact names; content files depend on them)
- `LC.lesson(obj)` stores into `LC.lessons[obj.id]`.
- `LC.glossary(arr)` appends into `LC.terms[id]` (map) and rebuilds the alias matcher.
- `LC.sim(obj)` stores into `LC.sims[obj.id]`.

## Routes (hash)
`#/` home · `#/tracks` · `#/track/<trackId>` · `#/map` (skill tree; `#/map/<trackId>`) · `#/lesson/<id>` ·
`#/lesson/<id>/quiz` · `#/lesson/<id>/testout` · `#/review` · `#/glossary` · `#/glossary/<termId>` · `#/search/<q>` ·
`#/lab` · `#/lab/<simId>` · `#/lab/sandbox` · `#/profile` · `#/readiness`. An unknown or malformed hash shows a "Nothing at …" page with a Back home button.
Views live in `assets/js/views/`: home, tracks (list and track page), map, lesson, quiz (also test-out), review, glossary, search, profile, readiness, lab.

## Progress store (`assets/js/core/store.js`)
```js
{
  version: 1, updatedAt,               // ms epoch; bump on every change
  xp: 0, resetAt,                      // resetAt is set only by Reset progress
  streak: { count, lastDay },          // lastDay "YYYY-MM-DD" local
  daily: { day, xp },
  history: { "YYYY-MM-DD": xp },       // last 60 days, drives the 14-day chart
  stats: { reviewCorrect },
  settings: { theme: "system"|"light"|"dark", eli5Default: false, dailyGoal: 100 (50|100|150|...),
              welcomeSeen, updatedAt },
  lessons: { [id]: { status, bestScore, lastScore, attempts, startedAt, completedAt, readAt, quizPassed,
                     qDone: {qIndex: 1}, perfectAwarded, checks: {stepIndex: true} /* build labs */, updatedAt } },
  sims:    { [id]: { status: "started"|"passed", hintsUsed, program, passedAt, updatedAt } },
  cards:   { [lessonId + ":" + qIndex]: { lessonId, q: qIndex, box: 1..5, due, updatedAt } },
  badges:  { [badgeId]: { earnedAt, updatedAt } }
}
```
Reset progress overwrites every lessons/sims/cards/badges record with a `{ reset: true, updatedAt }` tombstone and sets `resetAt`, so
stale devices cannot bring old records back. Readers must ignore records with `reset: true`.

- **The server is the source of truth.** On boot, `GET /api/progress` and merge it with the localStorage cache (`lc.v1`) using the same rule as
  `server.py` (per-item newest `updatedAt` wins inside lessons/sims/cards/badges, and the newer document wins for scalars). Then render.
- On every change, save to localStorage immediately and debounce a `PUT /api/progress` (800 ms) with the whole document (header `X-LC: 1`,
  `Content-Type: application/json`). Adopt the merged response. On failure, retry with backoff (2 s, 5 s, 15 s, 60 s) and show a small "Offline, will sync" indicator. Also sync on
  `visibilitychange` → visible, so opening the phone pulls what the PC did.
- Wrap every localStorage access in try/catch.
- Public API used by other code: `LC.store.get()`, `LC.store.update(fn)`, `LC.store.lesson(id)`, `LC.store.recordQuiz(id, answers[])`,
  `LC.store.setLessonStatus(id, status)`, `LC.store.recordSim(id, {passed, hintsUsed})`, `LC.store.saveSimProgram(id, text)`,
  `LC.store.on("change", fn)`.

## Unlocking and skipping
- Statuses: `locked | available | in-progress | complete | skipped | tested-out` (the UI labels `skipped` as "Marked known"). A prereq is **satisfied** by complete, skipped or tested-out.
- Locks are **soft**. A locked lesson shows "Needs: A, B" with three actions: open those lessons, "I already know these" (marks them
  skipped), or "Read anyway". Nothing is ever hard-blocked.
- On every lesson: **"I already know this"** marks it known (status `skipped`; no XP, reversible with "Undo" on the lesson page). **"Test out"** runs the quiz cold.
  A score of 80% or more marks it tested-out and awards XP.
- **Complete** = the reader scrolled to the end (or pressed "Mark as read") AND scored ≥ 70% on the quiz. A build lab is complete when every
  checklist step is ticked and the quiz is passed.
- Track-level: on a track page, "I know this track" opens a confirm sheet that marks every lesson in it as known.

## XP, levels, streaks, badges, review
- XP: quiz correct answer 10 (first time each question is answered correctly), lesson complete by difficulty L1 40 / L2 60 / L3 90 / L4 130,
  perfect-quiz bonus 25 (once per lesson), test-out 30, sim passed 60 minus 10 per hint used (min 20, first pass only), review card answered
  correctly 5. Pass mark 70%, test-out mark 80%.
- 10 levels with titles: Apprentice, Field Tech, Panel Builder, Controls Technician, Controls Engineer, Senior Controls Engineer,
  Systems Integrator, Lead Integrator, Solutions Architect, Systems Architect. Cumulative thresholds: 0, 150, 400, 800, 1,400, 2,400, 4,000, 6,500, 10,500, 17,000
  (about 1.6× per step). Finishing the whole curriculum comes to roughly 20,000 XP. "Level" always means this XP level. Lesson difficulty is
  written L1 Intro, L2 Core, L3 Advanced, L4 Expert.
- Streak: +1 for each local day with ≥ 1 XP earned, and it resets after a missed day. Daily goal ring shows today's XP / goal.
- Badges (31, with designed SVG icons, not emoji): first lesson, first perfect quiz, "Off-by-one survivor" (perfect on proto-modbus), each
  track complete (12), 3/7/30-day streaks, first sim passed, 10 sims, all sims, 25 review cards, first L3 lesson, first L4 lesson, the
  capstone, one per build lab (5), and "Integrator ready" (every L3 and L4 lesson in T4 to T9).
- Review queue: every wrong answer creates or resets a card to box 1 (a cold test-out quiz also feeds it). Box intervals are 1, 2, 4, 8 and 16 days. A correct answer promotes the card,
  and a wrong one sends it back to box 1. `#/review` shows due cards one at a time with the explanation afterwards. Home and the Review tab show the due count.
- Celebrate with restraint: an XP toast, a level-up sheet, and a badge toast. Respect `prefers-reduced-motion`.

## Server (`server.py`)
- Binds to `127.0.0.1` by default (`--host 0.0.0.0` opts in to the LAN). Phones reach it through `tailscale serve --bg <port>` (HTTPS, tailnet only). Default port 8080.
- Serves only `/`, `/index.html`, `/assets/` and `/content/`; the path is decoded and normalised first, and dotfiles, `data/`, `docs/`, `tools/` and `server.py` return 404. `Cache-Control: no-cache`.
- HTTP/1.1 keep-alive, a 30 s socket timeout, and a listen queue of 128 (the default of 5 drops connections on a phone's first load).
- `GET/PUT /api/progress` need the `X-LC: 1` header, and PUT needs `Content-Type: application/json` and a body of 1 byte to 5 MB. Other sites can't send those without a CORS preflight, which the server never approves. PUT sanitises the body (non-numeric `updatedAt`/`resetAt`/`xp` and non-object records are dropped), merges it with the saved file under a lock, and returns the merged document. Bad input gets a JSON 400/403 and merge errors a JSON 500.
- Writes go to a temp file then `os.replace` (atomic). The previous version is copied to `data/progress.json.bak` before each write.
- `tools/test_server.py` and `tools/test-merge.js` cover the merge rules, the allowlist and the API checks.

## Glossary everywhere (required)
`LC.glossaryLink(rootEl)` runs after **every** render of lesson body, ELI5, why, history, examples, pitfalls, quiz questions, options,
explanations, review cards, glossary definitions, track blurbs and the simulator's challenge text.
- Walk text nodes. Skip anything inside `a, button, code, pre, h1, h2, input, textarea, .no-gloss, svg`.
- Build one regex from all aliases, longest first, case-sensitive, with boundaries `(?<![\w-])…(?![\w-])`.
- Link the **first occurrence of each term per block element** (p, li, td, callout). Wrap it in
  `<button type="button" class="gl" data-term="id">text</button>` styled as dotted-underlined text.
- Click or tap opens a popover on desktop (anchored to the word) or a bottom sheet on phones (≤ 640px). It shows the term, def, an "ELI5" toggle
  showing the eli5 line, "Learn it in: <lesson title>" (route link), and "Open glossary". Esc or tapping outside closes it. Focus moves into
  it and returns afterwards. Terms inside a popover's def are linked too, and tapping one replaces the popover content (keep a back arrow).
- `{{term:id|text}}` shortcodes render as the same button even if auto-linking wouldn't match.
- The glossary page lists all terms A–Z with a filter box and jump letters, and each entry links to its lesson.

## Markdown renderer (`assets/js/core/md.js`)
Supports exactly what `docs/CONTENT_GUIDE.md` lists: headings, paragraphs, lists (nested one level), bold/italic/code, links (external
links open in new tab with `rel="noopener"`), tables (wrapped in an `overflow-x:auto` div), fenced code with minimal highlighting for
python/sql/st/json, callouts (`> [!tip] Title` etc., each with its own icon and token color), and shortcodes
`{{diagram:key}}` (wrap in `<figure class="dg">` with an aria-label caption), `{{term:id|text}}`, `{{lesson:id}}` (link with the lesson title
and status chip) and `{{sim:id}}` (card linking to `#/lab/<id>`). Fenced ```ladder blocks call `LC.ladder.renderStatic(text)` if
present, else show the text as code. HTML-escape all text. Only diagram SVGs are injected raw.

## Screens
- **Home**: greeting with level title and XP bar; Continue card (last in-progress lesson); daily goal ring and streak; Review due count;
  "Up next" (3–5 available lessons, preferring tracks already started and lower levels); a progress grid of tracks.
- **Tracks / Track page**: track code and title, blurb, % complete, ordered lessons with status chips, minutes, level pips and prereq hints.
- **Skill map**: SVG node graph per track (columns = prereq depth), cross-track prereqs shown as small badges on the node. Nodes are colored by status.
  Its container scrolls horizontally (never the page). Tapping a node opens the lesson.
- **Lesson**: sticky slim header (back, track code, title truncated, reading progress bar). Then the title block (minutes, level, status
  chip, actions: I know this / Test out), prereq strip, objectives, **ELI5 toggle** (segmented control "Full / ELI5". ELI5 mode shows
  the eli5 text in a highlighted panel at the top and keeps the full body below it, collapsed behind "Read the full lesson"), body,
  examples (expandable), Why it's done this way, History, Pitfalls, Key terms (chips opening glossary popovers), Quiz CTA, Resources
  (grouped by type, with source and an external-link icon), and prev/next in track. ~68ch measure.
- **Quiz**: one question per screen on phones and a list on desktop is fine. Use radio-style option buttons. After answering, lock the question
  and show the explanation for the chosen option, plus the correct one if wrong. The end screen shows score, XP earned, retry and a link to review.
- **Profile**: level, XP history (simple bar chart of the last 14 days), per-difficulty progress (L1 to L4), badges grid, settings (theme, daily goal, ELI5 default), sync status, and "Reset progress" with an in-page confirm.
- **Integrator readiness** (`#/readiness`, linked from Profile and More): progress by Purdue level 0 to 4 and by lesson difficulty L1 to L4, with the capstone and build labs as the finish line.
- **Navigation**: left rail on ≥ 1024px (Home, Tracks, Lab, Review, Glossary, Profile, plus search); the skill map is the "Map" toggle on the Tracks page.
  Bottom tab bar on phones (Home, Tracks, Lab, Review, More). More holds Glossary, Integrator readiness, Profile, Search, theme and "How this works" (the welcome sheet). Search is a top-bar field (desktop) or icon (phone) that searches lesson titles/summaries and glossary.

## Design
Follow the token system in `tokens.css` and its header comment (ISA-101 discipline: color means something). Fundamentals:
- At least a 16px side gutter: `padding-left: max(16px, env(safe-area-inset-left))` (same for right). No horizontal page scroll at 360px.
- Inline SVG icons (stroke 1.75, `currentColor`). No emoji. Use visible `:focus-visible` (`--focus`) and `prefers-reduced-motion`.
- `font-variant-numeric: tabular-nums` for XP, scores and counts. Uppercase labels in the display face with letter-spacing 0.06em.
- Card styling only where an element is a distinct object (lesson rows are list rows, not cards). Don't use the same radius and shadow on everything.
- Status in form, not just color: chips with icon and label (Done, In progress, Marked known, Tested out, Locked).
- The `<title>` is "Learning Center".
- Theme: `data-theme` on `<html>` from settings. "system" removes the attribute.

## Verification (bounded)
1. `node --check` every JS file.
2. Run `python3 server.py --port 8099 &` and use Playwright (preinstalled Chromium at `/opt/pw-browsers`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`;
   install `playwright` into a scratch dir if needed, not the repo) to load home, a lesson (`proto-modbus`), its quiz, the glossary popover,
   map and profile at 390×844 and 1280×800, light and dark. Collect console errors and check `document.documentElement.scrollWidth <= innerWidth`.
3. Make one fix round from what you see, then one confirming run. Don't loop further. Report anything still open.
