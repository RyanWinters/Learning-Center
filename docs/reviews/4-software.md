## Persona
Senior software engineer (Python, web, Docker, Git, Postgres) moving into industrial automation, judging the lessons' examples and the app's own engineering.

## What works
- ign-scripting: the Jython 2.7 framing, the scope table, and the one-call-versus-loop tag read are accurate and practical. The writeBlocking quality-code point is the kind of thing that bites real projects.
- persp-bindings: "transforms run in order, script transforms are the most expensive" is the right mental model. The advice to use an explicit Apply button for setpoints in a regulated plant is good.
- db-schema: the surrogate key plus UNIQUE natural code advice, and the HMI reason_id = 99 foreign-key example, are the strongest teaching in this set.
- arch-webdev: "validate, check role, write a request tag and let the PLC sequence it" is the correct design principle and is well argued.
- server.py: no dependencies, atomic write through os.replace, and per-item merge with reset tombstones is a thoughtful design.
- Cross-references I spot-checked ({{lesson:...}} targets) all resolve to existing files.

## Problems
**[severity: high] [area: code]** store.js `update()` (line 128) and server.py `merge()` (line 73): `doc.resetAt = now` is set on every local change, not only on reset(). So resetAt equals the latest edit time and the "stale document doesn't count" rule drops real XP. Verified with server.merge: phone has xp 50 at t=100 and synced; desktop, offline with xp 0, edits a lesson at t=120; merged xp = 0. Fix: set resetAt only in reset(), and add a test for this case.

**[severity: high] [area: code]** server.py `do_GET` (line 101): the `/data/` guard checks the raw, still percent-encoded path, but SimpleHTTPRequestHandler decodes it afterwards. GET `/%64ata/progress.json` returns the progress file (verified, 200). Dotfiles are also served (verified, `/.hidden-test` returned 200), which exposes `.git/` history and anything committed to it. Fix: unquote the path before checking, and serve an allowlist (index.html, assets/, content/) with everything else 404.

**[severity: high] [area: code]** server.py line 134 and the docstring: the default bind is 0.0.0.0 with no authentication, and PUT writes the progress file. Any host on the LAN, and any tailnet node including shared-in devices, can read and overwrite progress. Fix: default to 127.0.0.1 and let `tailscale serve`, which the docstring already suggests, do the exposure. If direct phone access is kept, add a shared token. Also set a request `timeout` on the handler, since stalled clients hold threads indefinitely.

**[severity: med] [area: code]** server.py `do_PUT`/`merge()` (lines 112 to 119): one record with a non-numeric updatedAt is stored. Verified: after PUT `{"lessons":{"y":{"updatedAt":"abc"}}}`, the next PUT containing y drops the connection with no response, because the comparison raises TypeError. The client always sends its whole document, so sync is wedged for that user. Invalid UTF-8 in the body also drops the connection, since UnicodeDecodeError is not caught. Fix: validate types (numbers for updatedAt and xp, objects for maps) before persisting, and return a JSON 400 on any exception from merge.

**[severity: high] [area: content]** arch-containers, compose example and the `docker run` example: `GATEWAY_ADMIN_PASSWORD_FILE=/run/secrets/gw_admin` and `MARIADB_ROOT_PASSWORD_FILE=/run/secrets/db_root` point at files that are never provided. There is no top-level `secrets:` block and no `--secret` or mount, so the file does not start as written. The example also publishes admin over plain HTTP on 8088 and never mentions the HTTPS port (8043 by default), which contradicts arch-webdev's "only expose over HTTPS" rule. Fix: declare `secrets:` with `file:` entries, publish and note the HTTPS port, and mention the gateway-network port if a second gateway is planned.

**[severity: med] [area: accuracy]** arch-webdev, doPost example: `isinstance(qty, (int, float))` accepts `True` because bool subclasses int, and rejects Jython `long`. It returns 202 "accepted" without checking the quality code from `writeBlocking`, which contradicts ign-scripting's own rule that a bad or read-only tag fails without raising. Writing a Python dict into a tag is also unexplained (the tag must be a UDT or string). Fix: check `q[0].isGood()` and return 502 or 503 on failure, exclude bool, and name the tag type. Also confirm the 8.3 names used in the httpClient example (`system.secrets.readSecretValue`, `resp.good`, `resp.json`, `resp.statusCode`) against the manual; I could not verify them.

**[severity: med] [area: accuracy]** db-schema, worked example: `downtime_reason` keeps both `category` and `is_planned`. is_planned depends on category, which is the transitive dependency the 3NF section says to remove. The 2NF/3NF walk also promises a supervisor table ("the supervisor phone depends on the supervisor, so people get their own table"), but the final SQL never creates it, so the phone example is left hanging. The `TIMESTAMP` columns (no time zone) also contradict the naming rule "Times ... are stored in UTC". Fix: drop is_planned or derive it, add supervisor to the result, and use TIMESTAMPTZ or say how UTC is enforced.

**[severity: med] [area: accuracy]** persp-bindings: the "Output param" quiz answer and the "Why" text say the parent reads data through an embedded view's params, but the same lesson says params are inputs ("Because the param is an input"). These two statements conflict. The transform example also asserts that dividing a formatted string "would fail", which is unverified, since Ignition expressions may coerce numeric strings. Fix: check against the 8.3 manual, correct the output-param answer (a bidirectional custom property is the likely pattern), and reword the failure claim as a risk.

**[severity: med] [area: code]** router.js line 24: `decodeURIComponent` on a malformed hash such as `#/lesson/%E0%A4%A` throws URIError inside parse(), which is called from the hashchange listener (line 32). There is no try/catch, so dispatch fails and the screen can stay blank. Fix: wrap the decode in try/catch and fall through to 'notfound'.

**[severity: med] [area: code]** Phone performance, store.js and index.html: every update() calls takeSnap(), which re-stringifies every record. writeCache() and adopt() each stringify the whole document, so a long session on a phone does this on every save. saveSimProgram writes the full program text on each call. Separately, index.html loads all glossary batches (about 304 KB) with synchronous document.write on every page load, plus a render-blocking Google Fonts request, which fails on a plant network with no internet. Fix: debounce saveSimProgram, track dirty ids instead of full snapshots, lazy-load glossary batches or defer them, and self-host the fonts.

**[severity: low] [area: code]** Merge uses device clocks for last-write-wins (store.js update(), server.py merge()). A phone whose clock runs ahead wins every conflict. Fix: note the limit in the code comment, or use a server-assigned sequence number.

## Missing
- Tests for the progress merge. Its rules are subtle, and a 20-line test would have caught both the XP loss and the poisoned-record wedge.
- Atomic-write backups for data/progress.json (keep the previous file), and a version check when reading it. The store already has a version field and the server ignores it.
- db-schema never says PostgreSQL does not index foreign key columns automatically, and says nothing about versioned migrations or concurrent writers. A Postgres engineer expects both.
- arch-containers has no gateway healthcheck, restart policy, or TLS termination guidance for the admin port, even though the lesson frames security.
- Nothing on how to test project-library Python outside the Designer (keep logic pure, mock the system module). A software engineer expects a test approach for scripts.

## One-line verdict
Sound teaching on the concepts, but the server leaks the repo and progress file through encoded paths and binds open, the XP merge can lose XP, and the compose and doPost examples would not work as written.
