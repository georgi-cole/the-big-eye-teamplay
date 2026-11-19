# Teamplay tribe-cycle development slice

17 November 2026. Built against the pinned Classic foundation, handbook v2.0.

## Implemented

The product launcher opens `/teamplay`; `/teamplay-preview` is a development/explicit-QA scene selector. The controller owns its own validated season snapshot and never sends Teamplay phase changes or resource rewards through the Classic Redux season reducer. Legacy ceremony, weather, onboarding and shock presenters are not mounted on these routes.

| Rule group     | Implementation                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R001–007       | Sixteen original contestants, fifteen active in three tribes, AI initial reserve, captured cast order and immutable season/flag priorities, saved rule/manifest versions and 33 deterministic contexts plus replay seeds.                                                                                                                                           |
| R008–024       | Competition first; exact team means, native higher-score comparison, published tie fallbacks, captains, team immunity, Social 1, secret weighted ballots/captain cutoffs, reveal, Social 2, separate nominee and reserve attempts/results. One replay, then season-priority fallback. Explicit human input or an explained delegation; no automatic human forfeits. |
| R025–034       | Capture only at a gap of three; ranked donor/recipient, acting captain succession and preserved banks/relationships. Eight-active merger retires the third-ranked flag, alternates legal draft picks and skips forced picks. Milestones precede captures.                                                                                                           |
| R035–039       | Reserve excluded from team competition, ballots, social windows and grants; a human reserve can skip AI-only phases to the next defence. Permanent human defeat permits spectator continuation. Current-tribe validation applies to every action and AI target; the first pool has no queued proposals that could cross a transfer.                                 |
| R042, R084     | Existing Reality nomination scorer and pact protection are applied after legal eligibility. The decision view contains the actor's own relationship row and beliefs, with neutral reciprocal defaults; private reciprocal relationships are not read. Pact/group creation UI is not included in this slice.                                                         |
| R045–056       | Zero initial banks; exact podium, Social 1, gross-spend second wind, nomination and nominee-survival grants. Same costs/banks for AI and human; one-to-four affordable AI actions per window. Every cost/grant has requested, applied, opening and closing balances. No reserve/Battle Back floor or transfer grant.                                                |
| R057–058, R062 | All eleven team cycles, one permanent exit per cycle, first five exits excluded from the Tribunal, six jurors after the team stage. Last defence precedes Final Five fusion; four active plus surviving reserve preserve their banks and bonds.                                                                                                                     |
| R065–066       | A deliberately one-game development manifest: existing Classic Quick Tap engine, 30 seconds, effective points for team means and two-player duels, using the existing AI score dispatcher. Human input is real; a delegated human score is separately previewed and explicitly accepted. AI scores and attempt seeds are saved before play.                         |
| R070–084       | Role-aware rosters/results, one main Continue, readable costs, keyboard/pointer controls and scrollable mobile layouts. Per-profile isolated durable saves, checkpoint recovery, retained damaged payloads, explicit version failure, archived restart, stale-revision rejection and duplicate-command receipts. UI changes only after durable flush succeeds.      |

## Validation

- The dedicated suite covers full team-stage simulations across eight seeds with serialization/revalidation at every command, both human reserve outcomes, same-challenge recovery data, ledger conservation, double taps, save failure, corrupted/unsupported saves and separate preview slots.
- All 1,024 legal five-member weighted ballot patterns and their human captain cutoff choices are enumerated. This is not exhaustive enumeration of every possible full-season social state or every smaller two-tribe ballot pattern.
- Preview scenes are reached through real receipted engine commands. Seed 7 naturally provides the capture scene in cycle 5; other scenes use seed 42. No roster or native score is altered to manufacture these scenes.
- Browser verification uses the actual production bundle, local asset interception and phone/desktop Chromium. Native hardware, online assets/services and store operation remain independent gates.
- Required command: `npm run check:pr`. Focused command: `npx vitest run src/teamplay/ tests/unit/quickTapRace/quickTapRaceCanvasEngine.test.ts`. Production browser command after the mobile build: `npx playwright test --config=playwright.bundle.config.ts`.

## Deliberate boundaries

This is a playable development slice, not a commercial release. Final Five fusion is a real committed state and an explicit stopping screen. R059–064's Classic individual endgame/Tribunal handoff is not connected. No arbitrary finalists or winner are fabricated.

Only Compliment, Reassure, Clear the Air, Whisper and Watch Room are exposed. Their prices, affinity changes, repetition/backfire handling and nomination strategy reuse the source policies. Full pacts, groups, romance, political actions, conversations, incoming requests and their transfer cleanup need their own Teamplay adapters. The source action catalog retained by the audit is not a claim that all 61 actions are enabled.

One existing game serves both contexts for this prototype. R067's commercial minimum of two independently qualified team games and two duel games is still open, including native device and human/AI parity evidence. Any change to this adapter/game contract must change the persisted manifest version; incompatible saves remain retained instead of being silently reinterpreted.

New copy uses the existing localization provider with an English-first namespace and normal English fallback. Existing translations remain type-checked. Device typography/touch/haptics/sound/cinematic polish, signed builds, online dependency audit, monetization and native CI results are not certified by controller tests.

## Next work

Connect the preserved Final Five to the existing Classic endgame without a reset, return grant or stale tribe power. Then expand the qualified game pools and social adapters, including formal pact/group creation and pending interaction cleanup. Keep release/commercial gates distinct from this prototype's engine verification.
