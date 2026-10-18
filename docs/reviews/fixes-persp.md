# Fixes: persp track (12 lessons)

Each lesson also gained a section "## If you already build Perspective" (about 400-600 words with code tokens).
Naming moved to HOUSE_STANDARD: `tagPath` param, `[default]Plant1/Area10/Line1/M101`, `Sts/Running`, `Sts/Speed`, `Sts/Fault`, `Cfg/Description`.
Verified by WebSearch (Ignition manual and forum): openPopup signature, navigate precedence, sendMessage vs session handlers, queryAggregatedPoints arguments, `ia_`/`psc-` prefixes, `system.util.threadDump`, `system.db.clearNamedQueryCache`, tag alarm runtime metrics.

## persp-views
- Fixed: naming drift (tagPath, M101). Softened: `persistent` flag claim and the vague "list-of-dict forms" wording (now a concrete conversion).
- Added advanced: param API design, session props as state store, typing, state-home table.

## persp-containers
- Fixed: 40 px glove claim (now site spec, links to mobile); tablet tile count (768 px gives two). Softened: which width column vs breakpoint containers measure; quiz q3 reworded.
- Added advanced: flex min-size trap and truncation class, nesting, container choice per region, hidden-branch cost.

## persp-bindings
- Fixed: output-param contradiction (input vs output vs in/out now explained, quiz explain aligned); reworded "would fail" to a risk; UDT paths.
- Added advanced: cost model, move shared logic to UDT expression tags, bindings vs change scripts, fan-out.

## persp-embedding
- Fixed: Area2/Pump/Run/Speed/Config/Name example replaced by house paths and members; retitled "Renaming a param breaks every embedder" with a safe sequence; JSON marked as orientation.
- Softened: instance reuse claim (now "measure it").
- Added advanced: rebuild rules, param timing, onStartup multiplication, paging, canvas vs repeater, tile contract tests.

## persp-navigation
- Fixed: `viewPath` -> `view` in two places; `backgroundDismissible` -> `overlayDismiss`; full openPopup signature; L3 -> Area10 deep link; popup title.
- Rejected: navigate precedence finding. The 8.1 function reference states page > view > url; kept, with "pass one" advice.
- Rejected: both IDs needed. Docs confirm sessionId and pageId in Gateway scope.
- Softened: dock option names and where docks are defined; refresh creates a new session.
- Added advanced: role-gated nav, deep links, Gateway-side navigation registry, kiosks, multi-area page architecture.

## persp-events
- Rejected (high): valueChanged signature. Perspective property change scripts use (self, previousValue, currentValue, origin, missedEvents); `initialChange` belongs to tag change scripts. Added a note distinguishing them.
- Fixed: round-trip claim tightened to scripts/Gateway actions; `format` -> `numberFormat`/`dateFormat`; example uses LT101; sendMessage vs session handlers stated per the function reference.
- Added advanced: throttling, idempotent guarded writes, async results, loop breakers, message patterns.

## persp-styles
- Fixed: built-in prefix is `ia_` (reserved), not `IA_`; cascade now includes the advanced stylesheet; removed "20 to 40" count; M101 expression; 8.3 custom theme text (config.json, index.css, derive from bundled themes).
- Confirmed: `psc-` prefix.
- Added advanced: token tiers, dark mode, class set design.

## persp-hphmi
- Fixed: unexplained alarm path replaced with two real mechanisms (tag runtime alarm properties, assumed for the example; `system.alarm.queryStatus` for priority) with names to be checked per version.
- Added worked example: ISA-101 theme tokens, class set (state, alarm priority, abnormal, quality), Level 2 layout for the Area10 unit, colour-blind check procedure. Palette marked as example, not from the standard.
- Added advanced section.

## persp-mobile
- Fixed: DMZ reverse proxy (10.20.250.10, 8043) is the default; mesh VPN presented as a documented exception ending in the DMZ; warning moved up; quiz q and pitfalls aligned; M101 path.
- Softened: 48 px (now site spec), unsourced Workstation auth/version sentence, `system.perspective.workstation` names, barcode handler signature.
- Added advanced: IdP and roles, kiosk recovery, enrollment/revocation runbook.

## persp-charts
- Fixed: queryAggregatedPoints keywords (startTime/endTime) and argument order; quiz q2 explain (two rows per slice); house tags for examples.
- Softened: return size zero and interval interaction, Power Chart strings, "now" edge claim and quiz q5 explain.
- Added advanced: stair-step vs interpolation, deadband-compressed history, bounding values, event markers, quality.

## persp-performance
- Fixed: runNamedQuery example now `system.db.execQuery` with an 8.1 note (FACTS #10); `${tag}` replaced by a real path; named `system.db.clearNamedQueryCache`; table marked directional.
- Rejected: threadDump finding. `system.util.threadDump()` exists (returns a string).
- Added advanced: binding-chain trace, profiler reading, measuring session cost, pool/cache arithmetic, alarm table, release gate.

## persp-library
- Fixed: Status/* members -> Sts/*, no invented Cfg/Units, Permissives or State; Area2/XV-204 -> FV101; faceplate script scope stated (Gateway) and `getConfiguration` cached instead of per click.
- Softened: popup repeat-open behavior.
- Added advanced: param API, optional members, override register, release/rollback, UDT drift.

No glossary changes (content/glossary/e7.js untouched; all keyTerms already exist).
