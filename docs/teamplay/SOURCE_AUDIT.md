# Teamplay source audit and foundation

Date: 14 November 2026. This is implementation evidence for the foundation package, not a claim that Teamplay gameplay or a commercial app has shipped.

## Provenance

- Source: `georgi-cole/bbmobilenew-source`.
- Pinned revision: `50676d77b76362b7d8461c23ca7c7473b7b66bdb`.
- Source change: **Animate all ceremony departures with reusable character walk cycles (#1762)**, committed 14 November 2026.
- Imported by `git archive` from the cached Git object at exactly that revision. The original working tree, its environment files, credentials, uncommitted fixes and dependencies were not used as source files.
- The standalone repository begins with local import commit `25a636a`. Existing shared code/assets remain present to avoid breaking Classic dependencies. Other modes are not offered in the Teamplay launcher.
- Handbook: the Library version 2 proposal, copied to `HANDBOOK.md` as the rules reference. Starting this foundation does not imply that unresolved product defaults have already been playtested.

## Product identity and isolation

| Surface                                    | Teamplay value / handling                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Name                                       | The Big Eye Teamplay                                                                      |
| Repository/package slug                    | `the-big-eye-teamplay`                                                                    |
| Capacitor/Android/iOS application ID       | `com.georgicole.thebigeyeteamplay`                                                        |
| Browser deployment base                    | `/the-big-eye-teamplay/`                                                                  |
| Durable database                           | `the-big-eye-teamplay-persistence`                                                        |
| Saved run keys                             | `the-big-eye-teamplay:savedRunSlot:<profile>:classic` during the baseline                 |
| Profile/archive/settings/auth key families | Former `bbmobilenew:` / `bbmobilenew_` / `bbmobile:` families are separately namespaced   |
| Native sign-in URL scheme                  | Separate Teamplay app ID; new provider/store registration remains future work             |
| Original paid products                     | Billing disabled before shared native queue/lifecycle operations; store route unavailable |
| Advertising                                | Native bridge and game eligibility disabled for the baseline                              |
| Cloud profiles/analytics/live config       | Disabled at the integration boundary; original remote-config endpoint cannot be fetched   |
| Optional downloadable cinematics           | Download controller disabled; bundled fallback retained                                   |
| Release/deployment automation              | Inherited workflows archived as `.disabled`; new Teamplay baseline CI and CodeQL retained |
| Development API proxy                      | Isolated port 4401, rather than the original development server on 4000                   |

The existing Classic run slot name is an internal engine implementation detail inside a separate product namespace. No original-app saved run is migrated or imported. New tribe/reserve/stage fields belong to TTP-005/006. No store record, product, signing identity, backend or leaderboard has been created by this package.

## Reuse map

| Concern                       | Existing implementation                                                                                                            | Reuse decision / required adapter                                                                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cast and human identity       | `src/appearance/seasonContestant.ts`, `src/appearance/initialSeasonAppearance.ts`, `src/store/gameSlice.ts:createInitialGameState` | Reuse distinct contestant identity; add tribe membership/reserve outside permanent elimination.                                                                               |
| Launch                        | `src/modes/launchSeason.ts`, `src/modes/seasonLaunchIntent.ts`, `src/screens/HomeHub/HomeHub.tsx`                                  | Keep Classic engine; use a product-level Classic-only launcher during foundation.                                                                                             |
| Phase transitions             | `src/store/gameSlice.ts`, `src/screens/GameScreen/GameScreen.tsx`                                                                  | Add an explicit Teamplay stage/controller; do not splice reserve results into ordinary eviction commits.                                                                      |
| Live competition host         | `src/components/MinigameHost/MinigameHost.tsx`                                                                                     | Reuse countdown, controls, music, spectator and saved competition outcomes; pass an explicit team/nominee/reserve context.                                                    |
| Raw result contract           | `src/minigames/competitionResult.ts`, `src/store/challengeResults.ts`, `src/store/challengeSlice.ts`                               | Preserve `rawResults`, authoritative ordering/tie groups and accepted result checkpoints. Incomplete/abandoned results must not become zero scores or duelling exits.         |
| Score conversion              | `src/minigames/scoring.ts`                                                                                                         | Use one audited native score per contestant. Do not average `points` or rounded displayed standings; authoritative ranking cannot be inferred from a display score.           |
| AI performances               | `src/ai/competition/index.ts`, `minigameAiRegistry.ts`                                                                             | Reuse skill profiles, fatigue/form and sandbag suspicion; retain the same game-native scale and score direction as the human.                                                 |
| AI-only reserve/nominee duels | `src/features/twists/battleBackCompetition.ts`                                                                                     | Useful headless foundation with deterministic seeded scores. Its current three-game rotation and hash tie-break are not the proposed Teamplay duel contract without adapters. |
| Weighted nominations          | `gameSlice.ts` nomination/vote helpers; `src/store/lohNominationPlanning.ts`                                                       | Existing individual LOH nomination planning is not an internal tribe ballot. Add a dedicated legal voter/target pool and captain cutoff decision, retaining UI components.    |
| Social definitions            | `src/social/socialActions.ts`, `dramaModeConfig.ts`                                                                                | 61 action entries exported, including AI shims/Reality-only entries. An entry in the catalog does not itself approve that action for Teamplay.                                |
| Social prices and effects     | `src/social/smExecNormalize.ts`, `SocialManeuvers.ts`, `SocialPolicy.ts`                                                           | Reuse actual normalization and outcome execution. Dynamic inquiry prices are layered on top of base catalog prices.                                                           |
| Contacts                      | `SocialManeuvers.ts`, `incomingInteractions.ts`, `SocialPanelV2`                                                                   | Tribe checks must exist in UI, direct execution, incoming offers and AI schedules; filtering one screen is insufficient.                                                      |
| Pacts/alliances               | `src/social` relationship state, existing pact-protection and autonomy tests                                                       | Reuse bonds and memory; add explicit pact-over-alliance target scoring and dormant cross-tribe contact handling.                                                              |
| Reward timing                 | `socialResourceCalibration.ts`, `relationshipResourcePolicyMiddleware.ts`, `socialSlice.ts`                                        | Gate each receipt by context. Existing ordinary LOH/POS/Battle Back grants cannot be applied blindly to both duels.                                                           |
| Saves                         | `saveStatePersistence.ts`, `runSnapshotAutosave.ts`, `durablePersistence.ts`                                                       | Existing per-profile slots, compaction, SQLite/IndexedDB and result checkpoints are reusable; extend the serialized contract once, with saved pending decisions.              |
| Captures/merger               | No complete current equivalent                                                                                                     | Reuse selection and roster components, but create one atomic transition and stage/milestone guard.                                                                            |
| Final Five/Four               | `gameSlice.ts`, `flows/useEndgameFlow.ts`                                                                                          | Preserve Classic LOH/POS and Final Four sole eviction. Explicitly clear team powers at the five-player handoff.                                                               |
| Final Three                   | `gameSlice.ts`, `flows/finalThreeSpectatorFlow.ts`, `FinalThreeCompetitionBroadcast`                                               | Reuse three-part presentation. Several AI-only reducer fallbacks still call `seededPick`; these need competition-backed resolution under TTP-056.                             |
| Jury                          | `src/rules/tribunalPolicy.ts`, `tribunalEligibilityMiddleware.ts`, finale components                                               | Cast 16 implies jury 9 and first 5 pre-jury exits. Only permanent reserve-duel exits count; a reserve never counts as an ordinary evictee.                                    |
| UI                            | `gameDesignSystem.css`, TVLog, HouseguestGrid, GameControlDock, existing ceremonies                                                | Reuse shell/tokens/assets. The generated mockups are design references, not implemented screens or exact source portraits.                                                    |

## Competition qualification

`audit/minigame-inventory.json` captures all 58 registry entries with player bounds, result contract, scoring adapter and explicit AI model where present. This is a source inventory, not 58 qualified Teamplay games.

| Game              | Team-average assessment                                                                                      | Two-player duel assessment                                                                           | Outstanding evidence                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `quickTap`        | First candidate: non-authoritative raw score, explicit AI model, metadata permits 15 participants            | Candidate: permits 2 and score comparison                                                            | Verify boosters, all-player raw results, native tie handling and reload through the actual Teamplay host. |
| `swipeMaze`       | Candidate only with lower-is-better conversion; cannot average raw completion times as if larger were better | Existing Battle Back headless candidate                                                              | Human/AI scale parity, legacy result and checkpoint audit.                                                |
| `holdWall`        | Do not use current placement/authoritative adapter as a team-average shortcut                                | Strong first candidate: native authoritative winner/full ordering, existing Battle Back presentation | Audit duration/tie/replay and human/reserve checkpoint paths.                                             |
| `biographyBlitz`  | Exclude from first team-average pool: knockout/final ordering is not comparable average performance          | Strong first candidate: two-player native result and existing Battle Back resolver                   | Audit tie/replay and AI-only native-vs-headless parity.                                                   |
| `percentagePanic` | Exclude initially: qualifier/final semantics require a separate contract                                     | Candidate only after feature-owned AI/result audit                                                   | Registry has no direct AI model entry; a generic fallback is not qualification evidence.                  |
| `snake`           | Authoritative result needs feature audit before averaging                                                    | Candidate after native standings audit                                                               | Preserve human/AI result semantics and ties.                                                              |

**No Teamplay competition pool is runtime-qualified yet.** The minimum next vertical slice should use one verified team-score game and one verified duel game, then add variety after result/save parity passes. A source metadata predicate or generic AI fallback is not enough to certify a game.

## Social economy findings

- Normal Social 1 refill: +5 Energy, accumulation cap 20. A legitimately larger carried balance is not confiscated.
- Social 2 second wind: +3 if at least 4 Energy was actually spent in Social 1.
- Main competition podium Energy: 5/2/1; LOH Influence 15; POS Influence 12 in Classic.
- Nomination campaign Energy 3; ordinary survival Energy 2 and Influence 8.
- Current Battle Back floors are Energy 10, Influence 25, Info 100 in Normal mode. Teamplay reserve/fusion must explicitly suppress them.
- Influence authored **costs** are multiplied by 10, Info costs by 100; authored Influence/Info **yields** are multiplied by 100. Reusing a single multiplier would price actions incorrectly.
- Multi-target actions use `max(base Energy, target count × energyPerTarget)` where configured. Repeated inquiries may add dynamic costs. The catalog records one- and three-target prices separately.
- Weather, missions, twin shock, recharge and other optional systems also grant resources. Their callbacks must be gated alongside scheduling under TTP-031/047–054.
- Pacts and alliances do not currently imply tribe-local eligibility. This remains work, not an outcome of the identity setup.

See `audit/social-actions.md`, `audit/social-actions.json` and `audit/resource-calibration.json` for exact authored descriptions, normalized base prices, yields, phase/status restrictions and effects. SocialPolicy and SocialManeuvers remain the authoritative dynamic execution paths.

## Compatibility gates still required

1. Add explicit stage/tribe/reserve state before changing active contestant counts. Classic often treats everyone not evicted/jury as alive, so a reserve cannot safely be represented by only a badge.
2. Prevent roster/safety/vote twists at scheduling, manual activation, restore and resource-award paths. Hiding settings alone is insufficient.
3. Replace both human and AI nomination decisions with the same legal tribe ballot contract; retain secret ballots.
4. Store nominee duel and reserve duel results separately. Commit one permanent exit only after the second duel.
5. Capture once outside milestones; merger at 8 and fusion at 4 active take precedence. Roster animations must consume the committed snapshot.
6. Handoff to Classic only after the final reserve defence. Clear outgoing role/eligibility and open contacts without Battle Back grants.
7. Qualify AI-only Final Three outcomes; seeded arbitrary picks are not acceptable competition evidence.
8. Keep commerce/ads/backends off until separately scoped Teamplay services and store products exist. The intended Remove Ads model is not implemented by retaining the original catalog.

## Validation and delivery status

Validation evidence is maintained in `FOUNDATION_STATUS.md`. Conceptual roster/ballot checks in the handbook do not replace runtime tests. Baseline tests must include launch, resume, persisted result recovery and existing Classic endgame regressions. A passing web build does not certify an Android/iOS install, purchase flow or store readiness.

Remote repository creation/push is pending: the available GitHub connector can read/update existing repositories but does not expose repository creation; direct Git/CLI connectivity and authentication failed. No write has been made to the original source repository.
