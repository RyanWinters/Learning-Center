# Handoff

**Goal**: Finish the project-wide consistency audit, then verify all Ignition claims against the offline Ignition manual, and deliver it all as a draft PR into `main`.

**Done**
- 141 lessons, 26 sims, ~800 glossary terms. Validator and tests pass: `tools/validate.js`, `tools/sim-test.js`, `tools/test-merge.js`, `tools/test_server.py`.
- Terminology audit: `docs/reviews/audit-terminology.md`, with a vocabulary list in `docs/HOUSE_STANDARD.md` §8.
- Structure audit: `docs/reviews/audit-structure.md`. Minutes were recomputed and quiz answer positions rebalanced. Its open items are links for orphan lessons and sims, and the longest option too often being the correct answer.
- All five audits are done: `docs/reviews/audit-{terminology,structure,ignition,glossary,app-docs}.md`. The Ignition claims inventory is `docs/IGNITION_CLAIMS.md`.

**Decisions**
- Push to `claude/beautiful-davinci-jhf9rd` and open a draft PR into `main`. The user asked for PRs, not direct pushes to `main`.
- Use "Gateway" (capitalized) for the Ignition Gateway and lowercase "gateway" for network or protocol gateways. This sweep hasn't been applied yet.
- The house standard (`docs/HOUSE_STANDARD.md`) and the verified facts (`docs/FACTS.md`) override any lesson.

**Next**
1. Consistency audit is complete (reports in `docs/reviews/audit-*.md`) and the Gateway capitalization sweep is applied. Both are in the draft PR into `main`.
2. Get the offline manual. It's at `C:\Users\ryanw\.claude\skills\ignition-manual` on the user's PC, unreachable from the cloud, so the user should push it to a private repo, which can be attached with add_repo. Then check every claim in `docs/IGNITION_CLAIMS.md` against it (★ items first), fix the lessons, and update `FACTS.md`.
3. Offer lessons on TOP Server/Kepware and on FIX32/iFIX migration. The user's ignition-dev skill mentions both.

**Gotchas**
- The network blocks the IA domains, and WebFetch fails on them too.
- Using `pkill -f "server.py"` kills your own shell.
- In lesson files, backticks are escaped as `` \` ``, so `sed` edits often miss. Edit them with Python.

**Load first**: `HANDOFF.md`, `docs/HOUSE_STANDARD.md`, `docs/FACTS.md`, `docs/reviews/audit-*.md`
