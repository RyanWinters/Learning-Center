# Content guide (for lesson writers)

The reader is a process control engineer. They build Ignition Perspective screens today and want to
become an integrator who can architect plant-to-enterprise systems. They are smart and practical,
but new to PLC programming, networking depth, databases and MES. Write for them.

**The exemplar is `content/lessons/proto-modbus.js`. Read it first and match its shape, depth and tone.**

## Files you own

- `content/lessons/<id>.js`: one per assigned lesson. The id and title come from `content/curriculum.js`. Don't edit curriculum.js.
- `content/glossary/<batch>.js`: your batch's glossary file (e.g. `a3.js`), already listed in curriculum.js.
  Start it with `LC.glossary([` and end it with `]);`.
- Don't touch any other file. If you think another file needs changing, say so in your report.

## Lesson object

Copy the field order from the exemplar. Required: `id, title, track, minutes, level, prereqs, tags, summary,
objectives, body, eli5, why, quiz, resources, keyTerms`. Optional: `history, examples, diagrams, pitfalls`.
`prereqs` must match curriculum.js. All markdown fields are JS template literals, so escape backticks as \\` and `${` as \\${.

### Body (900–2000 words)
- Open with what the thing is and why the reader should care, in 2–3 sentences. Don't use a "In this lesson" preamble.
- Use `##` sections and `###` subsections. Use tables wherever there's a comparison.
- Include at least one worked, concrete example with real numbers, addresses, tag paths or code.
- Prefer real vocabulary the reader will hear on site, and define it on first use.
- Ignition: target **8.3**. Where 8.1 differs materially, add a `> [!note] In 8.1` callout.
- Allen-Bradley: target Studio 5000 Logix Designer v3x and ControlLogix/CompactLogix 5380/5580. Mention Micro800/CCW and legacy RSLogix 500 only where they differ.

### Markdown the renderer supports
- `##`, `###`, paragraphs, `-` and `1.` lists, `**bold**`, `*italic*`, `` `code` ``, links `[text](https://…)`, GitHub tables, fenced code blocks with a language (`python`, `sql`, `st`, `json`, `text`).
- Callouts: `> [!tip] Title`, `> [!warning] Title`, `> [!example] Title`, `> [!note] Title`, `> [!why] Title`, followed by `> ` lines.
- Ladder in text: a fenced ```ladder block holding one rung per line in simple Logix neutral text, e.g. `XIC(Start) OTE(Motor)` or with a branch `[XIC(Start) ,XIC(Motor)] XIO(Stop) OTE(Motor)`. The app renders it as a rung.
- Shortcodes:
  - `{{diagram:key}}` places `diagrams.key`.
  - `{{term:id|shown text}}` links a glossary term explicitly. The app also auto-links known terms, so only use this where the wording differs from the term or an alias.
  - `{{lesson:id}}` links another lesson by its title.
  - `{{sim:id}}` puts a "Try it in the simulator" card. Use only the IDs listed below.

### ELI5 (120–300 words)
A genuine analogy a non-engineer would get. Use no jargon, or explain any jargon you use inside the analogy.

### Why (150–400 words)
This is the most important part for this reader. Explain *why* the practice is the practice: the failure it
prevents, the tradeoff it makes, what experienced integrators argue about. Use bold lead-ins.

### History (optional, 60–200 words)
Where it came from and what it replaced. Include dates only if your sources support them.

### Diagrams (1–3 per lesson, strongly encouraged)
Inline `<svg viewBox="…" role="img" aria-label="…">` strings. Diagrams must:
- Use only classes from `assets/css/diagrams.css` (`dg-box`, `dg-box-accent`, `dg-line`, `dg-text`, `dg-title`, `dg-mid`, …).
  Never use hex colors, `fill="red"`, or inline `style` colors (the validator rejects them). `fill="none"` is fine.
- Keep a viewBox around 640 wide. Keep text ≥ 12px and inside the viewBox with margin.
- For arrowheads, give the marker a unique id prefixed with the lesson id: `<marker id="net-ip-ah" …><path class="dg-fill-line" d="…"/></marker>`.
- Show the real mechanism (frames, levels, data flow, timing), not decoration.

### Quiz (4–8 questions; validator allows 2–10)
- Test understanding and application ("which fix", "what happens if"), not trivia.
- Use 3–5 options with one clearly correct. Make wrong options plausible misconceptions.
- Give one `explain` string per option. Say why each is right or wrong.
- Vary the position of the correct answer.

### Resources (3–8, real links only)
- Each has `title, url, type (docs|video|forum|course|article|standard|book|tool), source`.
- **Only cite URLs you saw returned by WebSearch in this task.** Never guess or construct a URL.
- Prefer, in order: docs.inductiveautomation.com (`https://www.docs.inductiveautomation.com/docs/8.3/...`),
  inductiveuniversity.com, forum.inductiveautomation.com, inductiveautomation.com/resources,
  literature.rockwellautomation.com and rockwellautomation.com, docs.sepasoft.com, docs.chariot.io / cirrus-link.com,
  standards bodies (isa.org, odva.org, opcfoundation.org, modbus.org, sparkplug.eclipse.org, mqtt.org), then well-known
  vendor-neutral sources (e.g. Wikipedia for history, a reputable vendor tech note).

## Research rules (keep it cheap)
- In this environment **WebFetch cannot reach most sites. Use WebSearch** (mode `standard`) with `allowed_domains` to
  target the sources above. Search result summaries are your evidence.
- Budget: about **5 searches per lesson**, 25 per task at most. Don't repeat a search you already ran.
- If you can't confirm a product-specific claim (a menu path, a default value, a version a feature arrived in),
  either leave it out or write it generally. Put `VERIFY:` in a JS comment beside it only as a last resort.
- Never copy text from sources. Write original explanations.

## Glossary entries
- `{ id, term, aliases, def, eli5, lesson }`. Use a kebab-case `id`. `aliases` are exact spellings to auto-link.
  They are case-sensitive, so include both "VLAN" and "VLANs". `lesson` is the lesson that teaches it best.
- `def` is 1–2 sentences. `eli5` is one plain sentence.
- **Before adding a term, grep `content/glossary/` for its id and aliases.** If it exists, reuse it. Don't redefine it.
- Every `keyTerms` id in your lessons must exist in some glossary file. Add 3–10 terms per lesson. Every acronym
  the reader might trip on counts.

## Writing style
- Plain, direct, short sentences. Write the way a senior integrator explains things at the whiteboard.
- Don't use em-dash asides, "not X, but Y" framing, rhetorical-question openers or filler ("it's worth noting", "in today's world").
- Be specific: real numbers, real defaults, real failure stories.
- Don't use emoji.

## Simulator challenge IDs (for `{{sim:…}}`)
| id | Topic |
|---|---|
| sim-tour | Using the simulator |
| sim-xic-ote | First rung: button → lamp |
| sim-and-or | Series (AND) and parallel (OR) |
| sim-xio | Normally-closed logic and XIO |
| sim-sealin | Three-wire start/stop seal-in |
| sim-latch | OTL/OTU latch with reset |
| sim-ons | One-shot push-on/push-off |
| sim-ton | On-delay timer |
| sim-tof | Off-delay fan run-on |
| sim-rto | Retentive runtime hours |
| sim-flasher | Two-timer flasher |
| sim-ctu | Part counter with reset |
| sim-ctd | Up/down car-park counter |
| sim-compare | Tank high/low with compares |
| sim-lim | Limit window check |
| sim-math | Totalizer math |
| sim-mov | Recipe select with MOV |
| sim-scp | Scaling a 4–20 mA input |
| sim-alarm-deadband | High alarm with delay and deadband |
| sim-udt-motor | Motor UDT with fault |
| sim-conveyor | Conveyor jam detection |
| sim-traffic | Traffic light state machine |
| sim-tank-fill | Fill/drain sequence |
| sim-pump-alternation | Lead/lag pump alternation |
| sim-mixer-batch | Mixer batch sequence |

## Done means
1. `node tools/validate.js <your ids…>` prints OK, with no errors. Warnings about missing sim files are fine. Fix other warnings where reasonable.
2. `node tools/validate.js` (everything) shows no errors caused by your glossary file, such as duplicate ids or aliases.
3. Stop after 3 validate-fix rounds. If it still fails, report what's left.
4. Your final reply is **under 150 words**. List the files written, the validator result, any VERIFY flags, and anything
   you think the orchestrator should know. Don't paste lesson content.
