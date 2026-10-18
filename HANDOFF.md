# Handoff

**Goal**: Finish the project-wide consistency audit, then verify all Ignition claims against the offline Ignition manual, and deliver it all as a draft PR into `main`.

**Done**
- 141 lessons, 26 sims, ~800 glossary terms. Validator and tests pass: `tools/validate.js`, `tools/sim-test.js`, `tools/test-merge.js`, `tools/test_server.py`.
- Terminology audit: `docs/reviews/audit-terminology.md`, with a vocabulary list in `docs/HOUSE_STANDARD.md` §8.
- Structure audit: `docs/reviews/audit-structure.md`. Minutes were recomputed and quiz answer positions rebalanced. Its open items are links for orphan lessons and sims, and the longest option too often being the correct answer.
- Two auditors were still writing when this note was written. Their reports go to `docs/reviews/audit-{ignition,glossary}.md` (app-docs audit done: `docs/reviews/audit-app-docs.md`), plus `docs/IGNITION_CLAIMS.md`. Check that they exist and are complete.

**Decisions**
- Push to `claude/beautiful-davinci-jhf9rd` and open a draft PR into `main`. The user asked for PRs, not direct pushes to `main`.
- Use "Gateway" (capitalized) for the Ignition Gateway and lowercase "gateway" for network or protocol gateways. This sweep hasn't been applied yet.
- The house standard (`docs/HOUSE_STANDARD.md`) and the verified facts (`docs/FACTS.md`) override any lesson.

**Next**
1. Wait for or check the two remaining audit reports. Resolve their "needs a decision" items.
2. Apply the Gateway capitalization sweep to the ign/persp/arch/build/hmi lessons, skipping code blocks.
3. Run all four tests, commit, push, and open a draft PR.
4. The offline manual is at `C:\Users\ryanw\.claude\skills\ignition-manual` on the user's PC. It's unreachable from the cloud, so the user should push it to a private repo, which can then be attached with add_repo. Check every claim in `docs/IGNITION_CLAIMS.md` against it, fix the lessons and update `FACTS.md`.
5. Offer lessons on TOP Server/Kepware and on FIX32/iFIX migration. The user's ignition-dev skill mentions both.

**Gotchas**
- The network blocks the IA domains, and WebFetch fails on them too.
- Using `pkill -f "server.py"` kills your own shell.
- In lesson files, backticks are escaped as `` \` ``, so `sed` edits often miss. Edit them with Python.

**Load first**: `HANDOFF.md`, `docs/HOUSE_STANDARD.md`, `docs/FACTS.md`, `docs/reviews/audit-*.md`
