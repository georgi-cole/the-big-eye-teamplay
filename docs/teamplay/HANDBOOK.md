# The Big Eye Teamplay — complete proposed handbook

Version 2.0 · 2026-11-12

**Status:** Proposed release contract; no gameplay implementation completed. This replaces the earlier loose outline. The rules below define the supported release; existing source behavior is evidence for reuse, and Teamplay changes are proposed product decisions. No gameplay code or repository has been created by this concept update.

## Navigation

- Format and authority
- Exact team cycle
- Captures and the eight-player merger
- Reserve experience and social boundaries
- Social resources and exact grant rules
- Final fusion, qualification and champion
- Competition selection and supported scope
- Premium mobile experience
- Persistence, recovery and technical integrity
- Monetization and commercial delivery
- Delivery gates and unresolved evidence

## Format and authority

**R001 · Product.** The Big Eye Teamplay is one human playing against 15 AI contestants. A season starts with three tribes of five active players and one neutral AI reserve. The human always starts in a tribe. This is a proposed complete first commercial release, using Classic as its foundation.

**R002 · Source of truth.** This handbook specifies Teamplay v2. Existing Classic mechanics are reused only where explicitly enabled here. A generic Classic trigger must not override the Teamplay phase, roster, reward or nomination rules. Freeze the final contract and source revision together before implementation.

**R003 · Terminology.** Active means a surviving main-field contestant: assigned to exactly one tribe before fusion, and playing individually after fusion. Contender means active or reserve. Permanently eliminated means no longer a contender. All team-stage milestone counts exclude reserve. Qualification means joining the individual final five; Final Two finalist means surviving the later Classic endgame. Becoming reserve is not a permanent elimination.

**R004 · Stage counts.** Cycles 1–7 reduce active players from 15 to 8; then the three-to-two merger makes two tribes of four. Cycles 8–11 reduce active players from 8 to 4; then the reserve joins those four for individual Final Five. Eleven team cycles each create one permanent exit.

**R005 · Published events.** The opening rules show all stage thresholds, the capture condition, the reserve route and finale. Merger is announced again before cycle 7 begins; fusion before cycle 11 begins. No surprise entrant, extra departure, hidden immunity, producer rescue or random stage change is enabled. Minigame chance and existing personality variation remain part of play.

**R006 · Opening assignment.** Use the existing seeded cast generation and a persisted shuffled cast order. Remove one AI as initial reserve; deal the remaining 15 in round-robin order to the three flags. Persist assignment before reveal. Publish a season priority number for each contestant and a flag priority order for exact-tie fallback; these never change or reroll. No social actions or nominations occur before the opening competition and its captain selection.

**R007 · Rule changes.** Save the rule version and competition manifest at season creation. A later app update cannot silently change an in-progress season. Continue on compatible rules or offer an explicit migration/restart with the original save retained.

## Exact team cycle

**R008 · Cycle entry.** Validate roster, freeze current team membership, select the next existing minigames from the published manifest, and announce any merger/fusion stakes before play. Cycle means one game round, not a real-world day. Going offline or waiting cannot earn resources.

**R009 · Phase order.** Run: team competition → team results and captain assignment → Social 1 → secret nomination ballots and any captain cutoff decisions → nomination reveal → Social 2 → nominee duel → reserve duel → one permanent exit → merger/fusion/capture maintenance → cycle recap. No ordinary tribal LOH nominations, POS or house eviction vote runs in parallel.

**R010 · Team result.** Every active tribe member supplies one valid performance in the same supported game, with the same challenge configuration. The reserve does not enter. Team performance is the arithmetic mean of its frozen roster scores, using the adapter’s native score direction. Lowest time wins in a time game. Compare unrounded values; display total, divisor, mean and score unit.

**R011 · Team ranking ties.** Compare exact means first, then the best individual score in each tied tribe using the same native comparator. If still tied, the tribe with the better previous-cycle resolved team rank wins that tie. On the first cycle or a remaining equality, use the published fixed flag priority. Apply the comparator consistently to produce one total team order. No hidden lottery or final displayed rounding decides this.

**R012 · Individual ranking ties.** For captain and individual podium ranking, use native numeric score and any game-owned secondary comparison. If still equal, use previous-cycle individual rank, then published season priority. A missing previous-cycle rank sorts below every recorded rank; if both are missing, use season priority. This explicitly covers a returning reserve who has no recent team result. Never treat an invalid or absent current score as an exact tie. Native games that cannot expose comparable scores and a complete valid result are not eligible for team averaging.

**R013 · Immunity.** Only the first-ranked tribe is immune from nomination for this cycle. A good individual score in a losing tribe gives no individual immunity. All active players can compete again next cycle. Team immunity expires after the reserve duel and before structural transfers.

**R014 · Captain selection.** The highest-ranked individual in each tribe becomes captain immediately after team results, until the next team results or their departure/transfer. The captain has one ballot of weight two and chooses among tied candidates at a nomination cutoff. Other ballots weigh one. There is no additional captain election or separate captain competition.

**R015 · Captain vacancy.** If a captain leaves active membership or is captured, their highest-ranked surviving teammate from this cycle’s competition acts for the remaining transition decisions. A captured captain loses the old office and does not replace the recipient captain. During merger drafting, acting authority is fixed before drafting; recruits cannot take over that draft. Next competition selects all captains again.

**R016 · Three-tribe nominations.** Only the two losing tribes vote. Every member in each losing tribe secretly selects one current teammate other than themselves. No abstention. The highest weighted target in each tribe becomes its single nominee. The immune tribe and reserve cast no ballots. A two-member losing tribe necessarily nominates the noncaptain under these weights.

**R017 · Two-tribe nominations.** Only the losing tribe votes, selecting two nominees from one weighted ballot per member. Sort weighted target totals. Confirm any candidates strictly above the cutoff; the captain fills the remaining slots from the cutoff tie. With mandatory nonself ballots, at least two players receive votes, so a zero-vote second-slot cutoff is impossible in a valid ballot. In a two-member losing tribe, both are automatically nominated and ballots are skipped.

**R018 · Nomination tie decisions.** The captain chooses exactly the required number from the tied cutoff pool, after all ballots have been locked. The captain may be a tied nominee and may choose themselves or protect themselves. This tie decision is not another ballot and costs no social energy. A nominated captain retains tie authority. No tied candidates outside the cutoff pool can be added.

**R019 · Social-window completion.** In each social window the human may submit legal affordable actions, then explicitly Continue at any time; no minimum spend is required. AI initiators use the existing one-to-four-action phase budget, further limited by actual resources and legal targets. Incoming accept/decline responses are free. Continue locks that window and resolves or expires pending requests by their existing deadlines; reopening cannot create another turn or grant. Social 2 occurs after nominations are locked, so it can affect relationships and future strategy but cannot replace nominees or award safety. No social actions occur during duels or maintenance. Secret ballots hide voter identities in the interface; small tribes and double weights can still allow players to infer votes.

**R020 · Small-tribe captain consequence.** With one nominee, captain double weight and tie authority allow the captain of a two- or three-member tribe to protect themselves from nomination. Disclose this earned advantage in the rules and UI. In the two-tribe stage, two nominees are required, so the captain of a three-member losing tribe can be nominated. Do not promise that captaincy provides no protection.

**R021 · Nominee duel.** The two nominees play one supported existing head-to-head game. Its winner remains in their original tribe. Its loser becomes the challenger for the reserve duel. Losing this first duel never triggers game over, jury entry or a permanent placement.

**R022 · Reserve duel.** Run a fresh supported head-to-head attempt between the challenger and incumbent reserve. If the challenger wins, the challenger becomes the new neutral reserve and the incumbent exits permanently. If the incumbent wins, the incumbent remains reserve and the challenger exits permanently. The challenger leaves the active tribe roster in both branches. No player is sent back to fill the vacancy.

**R023 · Duel ties.** Use the existing game-owned tie procedure. If it still cannot produce one winner, replay the same existing duel game with its next persisted challenge seed; allow one replay. If that replay also ties after its native tie procedure, the contestant with the better published season priority wins. Reserve and challenger use the same fallback. Show the applied tie rule before play and in the result. Technical failures are recovery, not ties or forfeits.

**R024 · Choice and spectator behavior.** Wait for every legal human vote, captain choice, draft pick and played competition. There is no real-time timeout that secretly chooses for the human. AI-only play uses existing skill/strategy simulation and spectator controls. Explicit Auto Continue delegates the current choice to the existing AI policy, previews that consequence and records it. Closing the app pauses.

## Captures and the eight-player merger

**R025 · Balance promise.** At the start of every ordinary team cycle, each tribe has at least two players and the size gap is at most two. Sizes need not be identical. This rule balances headcount, not skill, affinities or winning streaks. A legal tribe is never dismantled merely for losing one player.

**R026 · Maintenance priority.** After the reserve result is committed once, count active players excluding reserve. If four remain, fuse into individual Final Five. Otherwise, if eight remain in the three-tribe stage, merge into two tribes. Otherwise evaluate the ordinary capture window. Only the applicable branch executes; never run capture after merger or fusion.

**R027 · Capture trigger.** A capture window is checked after each completed team cycle. It activates only if the largest active tribe is exactly three members larger than the smallest and no milestone takes priority. Gaps of zero, one or two cause no transfer. A gap greater than three signals an invalid state under these rules; restore the last valid checkpoint instead of inventing a repair. Before competition show whether a possible departure could open this window.

**R028 · Capture donor and recipient.** The smallest tribe receives one player from a largest tribe. If largest tribes tie in size, the higher-ranked one in this cycle’s team competition supplies the player. If smallest tribes tie, the lower-ranked one receives the player. The resolved team order makes these rules unambiguous. Size qualification is checked after the active departure.

**R029 · Capture choice.** The recipient captain or acting captain chooses one current active member of the selected donor. Every donor member is eligible, including its captain; the reserve and eliminated players are excluded. The recipient cannot refuse or choose from another tribe. The donor and recruit cannot veto. Choosing a pactmate, rival or strongest opponent is legal. Existing choose-player UI is reused.

**R030 · Capture effect.** Move the chosen member once, preserve their identity, energy, affinities, pacts, alliance membership and history, then refresh all social eligibility. No immunity, resource reward, extra vote or penalty is created. No second capture check occurs this cycle. Previous captures grant no cooldown immunity; a later legal capture can move the same person again. Losing deliberately to influence a later capture is a legal strategic risk, never a guaranteed capture entitlement.

**R031 · Merger announcement.** At nine active players, announce before the competition that first and second keep their flags, and third retires its flag after this cycle’s reserve duel. The ordinary nominations and both duels still run. Third place determines flag survival, not an extra player elimination. The reserve never belongs to the retired flag.

**R032 · Merger procedure.** At eight active, retire the flag ranked third in that just-completed team competition. Its surviving active members form the recruitment pool. Keep members of the first- and second-ranked flags in place. Each survivor must finish with four members. The first-ranked captain picks first if they have a vacancy; alternate picks, skipping full tribes, until the pool is empty. No negotiation, payment or veto changes pick order.

**R033 · Merger authority.** If a surviving captain became reserve or exited, use the acting-captain rule. The retired captain has no draft authority and is an ordinary recruit. If only one survivor has vacancies, all remaining recruits go there and pointless choice screens are skipped. Preserve the two surviving flags, old personal bonds and this cycle’s captain authority until the next competition.

**R034 · Singleton resolution.** A temporary one-member tribe can arise immediately after an exit at eight active (for example 4/3/1), at five active (4/1) or at four active (3/1). At eight the merger absorbs/recruits until 4/4; at five one capture makes 3/2; at four fusion ends tribes. No one-member tribe starts an ordinary cycle. A singleton elsewhere is a validation failure, with recovery from the prior checkpoint.

## Reserve experience and social boundaries

**R035 · Reserve role.** Reserve is a living contender with no tribe: no team competition, nomination ballot, captaincy, capture eligibility, direct social action, social refill or alliance consultation. Their next playable event is the reserve defence each cycle. They can view public scores, public nominations, rosters, their own history and rules. Private conversations and other players’ hidden pact intentions stay hidden.

**R036 · Long reserve tenure.** A reserve can defend all eleven cycles and qualify for individual Final Five. There is no defence limit, escalating penalty, paid revival or automatic active return. The human can become reserve and stays playable. Provide skip-to-next-defence for AI-only phases, with public recap retained; do not force long AI conversation playback.

**R037 · Permanent human defeat.** A human losing a reserve duel is permanently eliminated. Offer the inherited Tribunal/spectator continuation and save-and-exit flow. Disable Survival run purchases, ad revives and normal Battle Back for this season. Restart creates a new season; it cannot reverse the committed result.

**R038 · Who may socialize.** During team stages, the actor, direct recipients, selected subjects and audience of every contestant social interaction must share a current tribe. Apply this to outgoing/incoming actions, AI background interactions, pacts, romance, rumours, intelligence, meetings, missions and group consultation. Opponent profiles and public performance remain viewable without social contact. Big Eye confessional/help can give existing narrator advice using information already available to that player.

**R039 · Roster change cleanup.** After capture or merger, expire pending proposals and scheduled interactions whose participants no longer share a tribe. No automatic refund follows a legitimate previously submitted proposal; no cost is charged for an unsubmitted invalid action. Prevent delivery of a queued private message across the new boundary. Rebuild visible groups, subjects and audiences atomically with membership.

**R040 · Tribe versus alliance.** Being teammates does not automatically create an alliance or pact. Use existing personal pacts and formal groups. A group may contain a protective pact within a wider expendable alliance. Existing group limits remain: founding needs at least three, maximum six, maximum two groups per player; a group may continue at two. Only local eligible members can participate in a current conversation.

**R041 · Separated bonds.** A capture does not itself mean betrayal. Preserve old pacts, affinity and memories as dormant loyalty across tribes. No new cross-tribe conversation, plan delivery or intelligence exchange is allowed. Existing memory decay continues by game time; do not reset or reward relationships on transfer. A player may unilaterally leave a group or end their own pact using existing controls, without sending an illegal cross-tribe message. Dormant memberships count toward the existing group limit until left.

**R042 · Pact priority.** For AI nomination, captain cutoff and recruit preferences, first enforce legal eligibility. Protect active personal pact partners before broad alliance members when a legal nonpact choice exists, unless an existing explicit betrayal intent has been selected and recorded. Within a protection tier, reuse existing trust, threat, affinity and strategic scoring. If all candidates are pactmates, choose legally using existing pact trust/strategy; no exemption or endless refusal is allowed. Humans may break a pact, with existing consequences.

**R043 · Sabotage boundary.** Reuse existing compete/conserve/throw intent and each player’s own legal performance. A captured AI may consider stronger old pact loyalty when choosing an intent before the team attempt; use the current relationship/strategy model, not a new random sabotage event. No player may edit teammates’ scores, opponents’ inputs or already completed attempts. Human deliberate underperformance works through ordinary gameplay.

**R044 · Suspicion and evidence.** Keep the existing evidence-based suspicion and relationship consequences. A poor result is not automatic proof of sabotage; hidden intent must not leak through public copy, tooltips or accessible labels. Capture itself causes no betrayal penalty. Confirmed existing betrayals/promises keep their usual effects. The recap may describe observed performance and known reactions, not assert secret motives as fact.

## Social resources and exact grant rules

**R045 · Economy profile.** Teamplay v1 uses the existing Normal economy: Energy cap 20; Influence and Info caps 10,000. Drama economy is not selectable. New seasons initialize spendable Energy, Influence and Info at zero, without a duplicate hidden allowance. Apply the first competition podium and first Social 1 grant normally. AI and human use the same published grant and action-cost rules; AI may spend less by choice, never exceed their bank.

**R046 · Energy spending.** Show exact Energy, Influence and Info costs before confirmation. Charge only the initiating player, once when a valid proposal/action is submitted. A declined, failed, backfired or expired submitted action does not refund its cost. Accepting/declining a proposal, ballots, tie choices, capture/draft choices and Continue are free. Insufficient resources disable submission and explain the deficit. Invalid/rejected-before-submit actions charge nothing.

**R047 · Social 1 refill.** Each active player receives +5 Energy once on entering Social 1 in each team or individual ordinary cycle. Carried energy persists. These are game-cycle grants, not clock rewards. Reserve and eliminated players receive none. Reopening the screen or reloading cannot repeat the grant.

**R048 · Second wind.** At Social 2, give +3 Energy once if the player spent at least four Energy on valid submitted actions during Social 1 of the same cycle. Track gross Energy spent, not net balance change; nomination and podium grants do not count as spending. Partial capped grants do not change eligibility. Show a 0/4 to 4/4 progress indicator before leaving Social 1.

**R049 · Competition grants.** The resolved individual podium in the main team competition grants +5/+2/+1 Energy to first/second/third respectively, once. Only the overall individual winner receives the existing LOH-sized +15 Influence reward. Team immunity and captaincy give no additional Energy or Influence. During individual Classic play, retain the existing LOH/POS podium grants and winner Influence (+15 LOH, +12 POS) once for those competitions.

**R050 · Nomination and survival grants.** A newly revealed nominee receives +3 Energy once, including automatic two-person nominations. During team play, the nominee-duel winner receives the existing survived-nomination reward: +2 Energy and +8 Influence once. The challenger gets no survival bonus for becoming reserve. Neither duel pays ordinary competition podium/LOH/POS rewards. Individual Classic surviving nominees receive the existing +2/+8 reward once at eviction resolution.

**R051 · Individual safety grants.** After fusion, a contestant saved by POS receives +1 Energy once; a POS holder saving someone else receives +5 Influence. These events do not exist in team phases. Ordinary new nominations still grant +3 Energy; re-rendering the same nomination or swapping the same saved result does not grant twice.

**R052 · No transfer or reserve bonus.** Captures, merger picks, captain succession, reserve defence and reserve replacement give zero resource bonus. Reserve banks freeze while outside active play. Final fusion preserves the surviving reserve’s carried bank; the normal next Social 1 +5 applies. Suppress ordinary Battle Back resource floors and secret return caches on every reserve result and on this fusion.

**R053 · Optional event whitelist.** For the first commercial release, extra energy from weather, chocolate, recovery, eggs, secret missions, twin shocks, rewarded recharge and the general Shocks Director is disabled. Existing ambient story presentation may remain without resource effects. No purchased Energy/Influence/Info, paid votes or ad energy is offered. Thus this section and the action table fully specify spendable energy sources and sinks.

**R054 · Other resource changes.** Successful ordinary rapport gives +3 Influence, failure −1 and backfire −3. Ordinary intelligence gathering gives +1 Influence/+100 Info on success, −1/+25 on failure and −3/+0 on backfire. New formal-alliance transitions grant existing +20 Influence to affected participants once; alliance-break/betrayal and kept/broken promises retain their existing source effects (−25 alliance break or successful betrayal, +15 kept, −25 broken). No passive daily Influence/Info allowance exists. Keep action-specific existing effects; the implementation audit must export every enabled action effect, including refunds or costs, into the in-app table before release.

**R055 · Caps and receipts.** Clamp deductions at zero and reject unaffordable actions. Earned grants add up to cap20 (or 10,000); if a legitimate migrated bank already exceeds its cap, do not confiscate it—new grants add nothing until below cap. Record actual credited amount and discarded overflow. Every grant/cost has an event identity; history shows opening balance, reason, requested amount, credited/spent amount and closing balance. A zero bank never blocks free progression or required game decisions.

**R056 · Mood is different.** The existing contestant mood variable also named socialEnergy is not spendable currency. Keep its existing effects on mood/behavior and describe it as social stamina if shown. It cannot buy an interaction, refill a bank, transfer to a teammate or replace a paid action receipt.

## Final fusion, qualification and champion

**R057 · Final team cycle.** At five active plus reserve, run the full ordinary two-tribe competition, nomination, nominee duel and reserve duel. This resolves both the fourth active survivor count and the last reserve. No skipping the final defence and no qualifying the previous reserve in advance.

**R058 · Final Five fusion.** After the permanent exit leaves four active, add the surviving reserve to those four as an individual contender. Retire both flags; remove captain authority, tribe nomination weights and team immunity; reopen normal Classic social access. Preserve personal bonds, memories, resources and known betrayal history. No new alliance, immunity or private information is granted to the reserve.

**R059 · First individual competition.** All five enter the first individual LOH competition, including previous team captains and the returning reserve. Run existing Classic Final Five: LOH nominates two; POS may save one and requires a legal replacement; eligible nonnominees vote; LOH breaks an eviction tie. No reserve defence, capture, team average or team vote remains. Thereafter normal Classic competition eligibility applies.

**R060 · Final Four.** Reuse current Classic Final Four. LOH is safe; POS holder makes the sole eviction choice. If LOH also holds POS, keep the original two nominees and the POS/LOH holder chooses between them. Do not run an ordinary house vote or retain captain double weight.

**R061 · Final Three.** All three play Part 1; its winner advances to Part 3. The other two play Part 2; that winner advances. Those two play Part 3. The winner becomes final LOH and chooses which of the other two exits in third place. The remaining two are the Final Two finalists. AI-only results must use existing competition skill simulation rather than a fresh random finalist pick; retain native game chance where applicable.

**R062 · Tribunal eligibility.** Use the locked 16-contestant Classic jury policy: the first five permanent exits are pre-jury; the next nine permanent exits become jurors. Becoming or remaining reserve is never a jury-forming exit. After eleven team exits, six jurors exist; three individual exits bring the jury to nine. Each original contestant occupies exactly one role and one final placement.

**R063 · Champion.** Use Classic Tribunal evaluation of the Final Two, retaining relationships, promises, performance and betrayal history. Every one of nine jurors casts one vote; there are no public vote multipliers or purchased modifiers in this format. Five or more wins. No equal split is possible with nine valid votes. Missing juror evaluations must be restored/recomputed from committed season state, not replaced by an arbitrary winner. Keep legacy finale recovery logic only for importing a compatible legacy state, with an explicit recovery message.

**R064 · End of season.** Persist placements, champion, Tribunal votes, team history, capture history, reserve defences and final-five qualification. Present season recap, replay/new-season options and the existing profile/archive. An eliminated human may participate as juror if eligible and continue as spectator. Ending spectating cannot silently forfeit their later saved Tribunal choice.

## Competition selection and supported scope

**R065 · Existing-game manifest.** Maintain two explicit lists: team-score games and head-to-head duel games. A team game needs independent comparable numeric results, fixed difficulty, score direction, complete human/AI resolution and resumable attempts. A duel needs a native two-player winner and supported tie resolution. A game can be in both lists only after both contracts are verified. No new minigame rules or fabricated team score are permitted.

**R066 · Fixed variety schedule.** Before launch, freeze a versioned manifest and deterministic rotation of existing eligible games for each context. Store all eleven team games and twenty-two duel contexts in the season plan; a context seed is chosen before an attempt and saved. Skip immediate repetition when at least two supported games exist; if only one is qualified, repetition is explicit. Do not select a harder game because the human is winning or reselect after a loss.

**R067 · Game acceptance gate.** The named final pool is a delivery dependency, not a claim that every current Big Eye minigame is already compatible. Ship only source-audited games, with at least two team games and two duel games proven on human and AI paths. Existing games such as shared-pot/group-choice games are excluded from team averages unless their actual scores satisfy this contract. If this minimum cannot be reached with small adapters, reduce release scope or revisit the product before adding a new competition system.

**R068 · Conflicting powers.** Disable ordinary Battle Back, twin/new entrants, double exits, extra nominees, individual safety in team phases, Bella’s Will/custom exit, roster-mutating missions, public eviction variants and paid vote overrides. In the first commercial season keep the general random Shocks Director off throughout the run; the existing reserve, capture window, merger and fusion provide the planned format events. Individual endgame enables only its stated Classic LOH/POS/Tribunal rules.

**R069 · Content boundary.** Retain shared Classic assets and dependencies; hide unsupported mode selectors and their store offers. Do not remove shared files indiscriminately. English is the first release language; all new player copy still uses existing localization infrastructure. Desafío references inform design internally; do not ship its branding, names, footage, physical punishments or its season-specific rules.

## Premium mobile experience

**R070 · Hub and next-event clarity.** Adapt the existing 390×844 hub. Show cycle, stage, active/contender count, tribe sizes, current captain, reserve and next event. Use team names/icons plus restrained accent colors. Keep one main next-action button and existing secondary navigation. A compact timeline previews capture eligibility and both milestones. At larger text sizes allow scrolling rather than clipping.

**R071 · Role-aware roster.** Use existing avatars/cards and a separate neutral reserve slot. Show captain, immune, nominee, challenger and eliminated roles only when valid. Opponent profile views remain available; disabled social controls explain Different tribe or Reserve has no tribe. Render roster moves from committed old/new snapshots so no vacant-slot flash, duplicate avatar or wrong team badge appears.

**R072 · Results and votes.** Team results show every contribution, the arithmetic and applied tie rule. Separate team immunity from individual resource receipts. Ballot screens state one or two nominees, self-vote restriction and captain weight before confirmation. Reveal nominee totals and cutoff decisions, without exposing who cast private ballots or secret AI reasoning. Explain automatic pairs; treat impossible zero-vote second-slot ties as validation failures.

**R073 · Distinct duel stakes.** Label Nominee duel and Reserve duel consistently. First-duel loss says You now challenge the reserve. Second result names the continuing reserve and one permanent departure. Never show the ordinary eliminated popup before the second result. Human and spectator versions use the same outcome data, with immediate skip and retained static results.

**R074 · Transfer and merger ceremony.** Show the exact rule, donor/recipient or retiring flag, legal selection pool and remaining vacancies before confirmation. Commit choices before animation. Reuse the existing monitor, avatar movement, sound and flag accents. Explain the new tribe, dormant old loyalties and next available social actions. A merger recap must show two complete rosters of four.

**R075 · Fusion and finale ceremony.** Announce Individual Final Five, identify all five qualifiers and visibly retire tribe powers. Avoid calling reserve qualification a guaranteed Final Two place. Reuse existing return, Final Three and Tribunal cinematics with real names and totals. Do not introduce a second art pipeline or long new cinematic production.

**R076 · Motion, sound and control.** Use existing typography/spacing and motion components. Target ordinary transitions at180–250ms and major reveals at700–1,200ms, with Skip available immediately. User-controlled reading has no forced auto-advance. Reduced motion uses static final states; sound and haptics have independent switches. No rule or outcome is communicated only through motion, color, sound or haptics.

**R077 · Accessibility and touch.** Support safe areas, touch targets of at least44×44 logical pixels, readable contrast, screen-reader labels and visible focus. Test390×844 plus smallest supported width, landscape/system interruption and enlarged text. Buttons, energy costs, long names and translated copy must remain readable. Never place ads or decorative motion over a decision.

**R078 · Guidance and recap.** Use existing contextual tutorial/help. First-use explanations cover average scores, weighted captain votes, social costs, reserve stakes and captures. Rules are searchable by current event. An end-cycle recap lists observed events, permanent exit, reserve, energy receipts and next-cycle stakes. Show changed rules before a new season; keep a full handbook reachable from settings.

**R079 · Interface state coverage.** Each interactive surface defines loading, ready, unaffordable, empty/legal-none, pending-human, pending-AI, submitting, committed, offline, retryable-error and resumed-result states. Buttons lock during commit. Empty legal pools in a normally required choice trigger validation recovery, never a blank screen or invented candidate. Existing paid skins/features must not hide required rule information.

## Persistence, recovery and technical integrity

**R080 · Atomic event commits.** Use the existing persistence stack with one authoritative season state. Every competition attempt, vote, tie choice, resource transaction, departure, roster move and milestone has a unique receipt. Save the outcome before revealing it; repeating Continue or resuming an animation cannot apply it again. Store presentation acknowledgement separately from game outcome.

**R081 · Recoverable interruptions.** Backgrounding, closing, low memory, offline use, failed ads and interrupted purchases preserve the pending choice or committed result. Resume the same attempt/result under existing minigame recovery. If a technical failure prevents scoring, restart that same uncommitted attempt with its stored context; do not fabricate a score, forfeit or new random draw. Record diagnostics for repeated failures.

**R082 · Validation.** Validate distinct IDs and stage-aware roles: before fusion each contender is active in exactly one tribe or is the one reserve; after fusion each contender is active individually, with no tribe or reserve. Validate one captain per current tribe once assigned, two legal distinct nominees where that phase requires them, frozen score rosters, one exit per team cycle, resources and jury uniqueness, milestone completion once and supported phase sequence. After maintenance ordinary team sizes have minimum two and maximum gap two. During merger/draft only documented temporary states are allowed.

**R083 · Invalid-state handling.** Stop progression at the last uncommitted boundary. Restore the latest valid checkpoint and retry the same pending event. If no valid checkpoint exists, preserve the broken save and diagnostics, explain the recovery failure, and offer restart/export through existing support tools. Do not randomly allocate players, add an AI, skip a duel, award immunity or silently delete a run to escape an error.

**R084 · AI information and consistency.** AI may use known public results and their own legitimate relationships/received information. They cannot read another tribe’s private conversation or hidden votes. Use existing seeded personality/strategy variability with committed decisions; mandatory event timing is fixed. Record enough decision context to explain legality and known reasons without exposing private intent.

**R085 · Source audit and migrations.** Pin the actual fork commit before coding; the reviewed search-index snapshot was0694de14b81de548bd3c74ec8e14bc09e24bdfa6 and must be rechecked. Audit existing final-three seeded selection paths and social middleware for duplicate rewards. Keep Teamplay saves, leaderboards and event analytics separate from Big Eye Classic. No silent import of an incompatible existing season.

## Monetization and commercial delivery

**R086 · Release offer.** First commercial release is a free complete game with interstitial advertising and one app-specific permanent Remove Ads purchase. Reuse the existing native ad/IAP bridges. No subscription, paid tribe advantage, currency pack, purchased captaincy, capture, energy, reserve revive or result reroll is offered. Cosmetic expansion is later scope. Premium presentation is present in the free game.

**R087 · Ad contract.** Allow an interstitial only after a normal team-cycle recap has been committed and acknowledged, before the next cycle begins. Suppress in the opening cycle, merger cycle, fusion cycle and individual finale. No ads on launch, resume, nomination, human choice, active competition, duel result or purchase flow. Apply a persisted cap of one per two completed cycles and at least180 seconds since the previous full-screen ad. No fill, consent refusal or ad failure continues immediately with the same season state. Remove Ads suppresses these requests immediately.

**R088 · Purchase contract.** Show the localized store price and permanent benefit before purchase. Use each platform’s supported billing flow, with loading, pending, success, cancel, failure, offline, already-owned and restore states. Validate entitlement, handle refund/revocation, and deduplicate callbacks. Restore must work after reinstall with the appropriate store account. Do not show fabricated prices, assume an entitlement from an unverified callback or reuse original-app product IDs.

**R089 · Separate identity.** Before native builds, register a unique repository/app name, bundle/package IDs, store products, ad units, save namespace, leaderboard and analytics scope. Audit Supabase profile ownership and entitlement boundaries. Existing Big Eye purchases stay associated with their original products unless a deliberate supported cross-app entitlement policy is later implemented. New source repository creation alone is not a store-ready app.

**R090 · Privacy and store setup.** Audit actual SDKs, analytics, ad consent, optional email collection, ATT where applicable, privacy policy, data-safety/privacy labels, account deletion when accounts exist, age/content rating, support and restore links. Verify current Apple/Google requirements at submission against the shipped configuration. Do not make store compliance claims from this handbook alone.

**R091 · Distinct product review.** Apple guideline4.3 and Google Play repetitive-content rules make a near-identical second listing a review risk. Teamplay must ship its distinct tribe/reserve loop, onboarding, screens, identity and accurate screenshots; document this distinction in review notes. A separate listing cannot be guaranteed approval. If a platform rejects duplication, evaluate offering Teamplay inside the original app as a distribution fallback; keep the isolated source project usable.

**R092 · Store assets and support.** Prepare truthful phone screenshots of the actual opening teams, average results, captain nominations, reserve duel, merger and fusion. Listing copy explains single-player AI play and the final-five reserve route. Provide icon/splash, support contact, gameplay help, privacy/terms links and a purchase troubleshooting flow. No Desafío branding or promise of real-world prizes.

**R093 · Analytics and commercial checks.** Reuse analytics only after consent/SDK review. Record aggregated phase completion, tutorial exits, reserve tenure, repeated nominations, capture frequency, time-to-next-defence, purchase/restore outcomes and ad interruptions. Exclude private conversation text, email addresses and secret AI intention from general analytics. Commercial success requires real user evidence; do not equate passing builds with monetization performance.

## Delivery gates and unresolved evidence

**R094 · Gate A: contract.** This document resolves the proposed game decisions, including captain advantage, unrestricted capture choice, third-place flag retirement, energy schedule and reserve treatment. Georgi may revise them before implementation. Rules remain proposed product decisions, not claims of existing feature support. Each rule must trace to backlog work and an acceptance scenario.

**R095 · Gate B: playable season.** Complete the Classic reuse map and named minigame manifest; implement and verify the full sixteen-to-two path, human reserve route, all count transitions, weighted ties, energy transactions, legal social boundaries and checkpoint recovery. No placeholder AI final result or manual developer intervention is accepted.

**R096 · Gate C: premium experience.** Review every screen state, static result, skipped animation and reduced-motion path on device. Complete human-led and spectator seasons, test enlarged text/small viewport, verify readable resource/nomination explanations, and resolve stalls/empty slots. Structured usability sessions must show players can explain reserve, captures and merger after onboarding.

**R097 · Gate D: commercial release.** After A–C, complete separate store identity, purchase restoration/refunds, consent and offline ad behavior, truthful screenshots, privacy disclosures, platform builds and review notes. Run required repository checks, signed device builds and store sandbox transactions. No critical correctness/progression/purchase-loss issues may remain; record the shipped revision and support plan.

**R098 · Evidence limits.** A conceptual specification cannot prove that no implementation bug or unforeseen device condition exists. Exhaustively enumerate all reachable roster transitions and weighted ballot patterns within the supported rules; use scenario coverage, complete-season simulations and device recovery tests for the rest. Unmet source audits, store setup and tests remain open backlog gates. This handbook does not claim implementation, store approval or revenue has occurred.

## Exact enabled social action prices

All numbers are displayed costs, not the authored unnormalized catalog scale. All phase/target eligibility rules still apply. Effects beyond the listed resource policy reuse the existing action outcome model and must be exported into shipped help by TTP-002/TTP-051.

| Action                                                                   | Energy         | Influence | Info | Conditions                                                                                    |
| ------------------------------------------------------------------------ | -------------- | --------- | ---- | --------------------------------------------------------------------------------------------- |
| Compliment / Reassure / Clear the Air / Whisper / Watch Room / Read Room | 1              | 0         | 0    | Team and individual social windows; local targets/subjects only                               |
| Heart-to-Heart / Open Up / Offer Protection / Consult Alliance           | 2              | 0         | 0    | Only local eligible members; no new immunity from a promise                                   |
| Propose personal pact                                                    | 2              | 0         | 0    | Local eligible target; existing pact acceptance                                               |
| Renew old pact                                                           | 1              | 0         | 0    | Only when both are currently eligible to interact                                             |
| Found group of three                                                     | 3              | 5         | 0    | Founder plus two local invitees; +1 Energy for each extra founding member                     |
| Invite one member to existing group                                      | 1              | 5         | 0    | Local target; existing group capacity                                                         |
| Group chat                                                               | max(2, guests) | 0         | 0    | Guests exclude initiator; current local participants only                                     |
| Share Intel                                                              | 1              | 0         | 200  | Existing verified intelligence eligibility; local subject                                     |
| Spread Rumor                                                             | 2              | 0         | 100  | Local subject/recipient; existing consequences                                                |
| Request Favour                                                           | 1              | 20        | 0    | Only an existing favour with a legal Teamplay effect                                          |
| Pitch Target                                                             | 2              | 10        | 100  | Teamplay: pitch a legal own-tribe nomination to a teammate; individual: usual legal target    |
| Warn About Danger / Warn About Player                                    | 1              | 0         | 100  | Local eligible subjects; no hidden opposing-tribe intelligence                                |
| Ask Why Nominated / Why Betray Me                                        | 1              | 0         | 0    | Only when existing context exists; local counterpart                                          |
| Ask Nomination Advice                                                    | 0              | 3         | 0    | Local teammate; never an extra ballot                                                         |
| Ask About a Player                                                       | 1              | 2         | 0    | Local subject and recipient during tribes                                                     |
| Betray Ally / Start Fight                                                | 3              | 0         | 0    | Existing social consequences; no immunity/score override                                      |
| Confront                                                                 | 2              | 0         | 0    | Local counterpart                                                                             |
| Lay Low                                                                  | 0              | 0         | 0    | Free progression-compatible choice; no energy generation                                      |
| Accept / decline / vote / leave / end / group governance                 | 0              | 0         | 0    | Existing legal governance; cannot contact a separated player                                  |
| Ask LOH Target                                                           | 1              | 0         | 0    | Individual stage only; no tribal LOH exists                                                   |
| Suggest Replacement                                                      | 2              | 10        | 100  | Individual POS stage only                                                                     |
| Ask to Use Safety / Respect Nominations                                  | 2              | 10        | 0    | Individual stage only with legal existing LOH/POS context                                     |
| Rally Votes Against                                                      | 2              | 20        | 0    | Individual eviction campaign only; tribal adaptation disabled to avoid changing its semantics |

## Resource-event ledger

| Event                                     | Energy | Influence    | Info           | Condition                                                    |
| ----------------------------------------- | ------ | ------------ | -------------- | ------------------------------------------------------------ |
| Initial banks                             | 0      | 0            | 0              | All contestants; one-time initialization                     |
| Social 1 refill                           | 5      | 0            | 0              | Active players once per ordinary cycle; cap20                |
| Social 2 second wind                      | 3      | 0            | 0              | Once if gross Social1 spending≥4                             |
| Main competition first                    | 5      | 15           | 0              | Overall individual first; not every captain                  |
| Main competition second                   | 2      | 0            | 0              | Overall individual second                                    |
| Main competition third                    | 1      | 0            | 0              | Overall individual third                                     |
| New nomination                            | 3      | 0            | 0              | Each revealed nominee once; includes forced pair             |
| Nominee-duel survival                     | 2      | 8            | 0              | Nominee-duel winner only; no duel podium                     |
| Reserve, transfer, merger or fusion       | 0      | 0            | 0              | Freeze reserve bank; preserve on transfer; no return floor   |
| Individual POS winner                     | 5      | 12           | 0              | First-place grant; other podium2/1 as applicable             |
| Saved by POS                              | 1      | 0            | 0              | Individual stage only                                        |
| POS holder saves another                  | 0      | 5            | 0              | Individual stage only                                        |
| Individual surviving nominee              | 2      | 8            | 0              | Once at eviction resolution                                  |
| Alliance formation                        | 0      | 20           | 0              | Existing formal transition once per affected player          |
| Alliance break / successful betrayal      | 0      | -25          | 0              | Existing event effects; no duplicate award/penalty           |
| Promise kept / broken                     | 0      | +15 / −25    | 0              | Existing semantic event; cost is separate                    |
| Ordinary rapport success/failure/backfire | 0      | +3 / −1 / −3 | 0              | Action cost paid separately                                  |
| Ordinary intel success/failure/backfire   | 0      | +1 / −1 / −3 | +100 / +25 / 0 | Existing intel-gathering outcome; action cost separate       |
| Optional event/recharge/purchase          | 0      | 0            | 0              | All unlisted energy sources disabled; no ad/purchased energy |

## Season schedule

| Cycle         | Before | After | Stage        | Result                                                   |
| ------------- | ------ | ----- | ------------ | -------------------------------------------------------- |
| 1             | 15     | 14    | Three tribes | Normal capture window                                    |
| 2             | 14     | 13    | Three tribes | Normal capture window                                    |
| 3             | 13     | 12    | Three tribes | Normal capture window                                    |
| 4             | 12     | 11    | Three tribes | Normal capture window                                    |
| 5             | 11     | 10    | Three tribes | Normal capture window                                    |
| 6             | 10     | 9     | Three tribes | Normal capture window                                    |
| 7             | 9      | 8     | Three tribes | Retire third-ranked flag; draft into4/4; no capture      |
| 8             | 8      | 7     | Two tribes   | Normal capture window                                    |
| 9             | 7      | 6     | Two tribes   | Normal capture window                                    |
| 10            | 6      | 5     | Two tribes   | Capture raw4/1 into3/2 if necessary                      |
| 11            | 5      | 4     | Two tribes   | Resolve reserve defence, then fuse4+reserve=5            |
| Individual F5 | 5      | 4     | Individual   | Classic LOH/nominations/POS/house vote                   |
| Individual F4 | 4      | 3     | Individual   | Classic POS-holder sole eviction choice                  |
| Individual F3 | 3      | 2     | Individual   | Three-part final LOH; final LOH chooses third place      |
| Final Two     | 2      | 1     | Tribunal     | Nine jurors elect champion; champion remains sole winner |

## Concrete worked cases

| Case                        | Starting event                                                                                                                                                                                                                      | Resolution                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary cycle              | Start Red 5 / Blue 5 / Gold 3; team rank is Blue, Red, Gold. Red nominates A; Gold nominates B. A wins the nominee duel; B challenges reserve.                                                                                      | If B wins, B becomes reserve and the old reserve exits. Gold loses B from active membership in either outcome: 5/5/2. Blue is donor because it is the higher-ranked largest tribe. Gold captain picks one Blue member, producing Red 5 / Blue 4 / Gold 3. |
| Merger, small flag survives | Raw eight is Red 4 / Blue 3 / Gold 1; team rank is Gold, Blue, Red.                                                                                                                                                                 | Red retires despite being largest. Gold has three vacancies and Blue one. Gold picks first, Blue second, and the final two Red recruits go to Gold. Gold 4 / Blue 4. There is no extra exit or capture.                                                   |
| Captain tie                 | Three-member tribe: A is captain; A votes for B (weight two), while B and C vote for A (weight one each).                                                                                                                           | A and B tie at two. A can protect themselves by nominating B, or voluntarily nominate themselves. This is the disclosed small-tribe captain advantage.                                                                                                    |
| Two-slot selection          | Three-member losing tribe: A is captain; A votes B (two), C votes B (one), B votes A (one).                                                                                                                                         | B with three and A with one are nominated. A zero-vote second-slot tie cannot occur: the leading target must cast a nonself ballot, giving someone else at least one vote. A saved ballot claiming otherwise is invalid.                                  |
| Energy budget               | Begin Social 1 with one Energy. Refill five to reach six. Heart-to-Heart costs two and two smaller actions cost one each, leaving two. Nomination grants three to reach five. At Social 2, second wind grants three to reach eight. | A declined submitted pact still costs two. Spending four during Social 2 does not create another second wind. Cap overflow is shown, and reloading gives no refill.                                                                                       |
| Reserve endpoint            | Human loses the nominee duel in cycle eleven, then beats the incumbent reserve.                                                                                                                                                     | The old reserve is the one permanent exit. The human becomes reserve for the result commit, then immediately qualifies with the four active players for Final Five. There is no extra Battle Back bonus or guaranteed Final Two berth.                    |

## Reachable roster proof

The independent conceptual enumerator considers every labeled tribe-size state, all resolved team-rank orders, either eligible losing tribe, each capture donor tie and every retiring flag. The ordinary next-cycle states below satisfy minimum two players per tribe and maximum size gap two. At the eight-active merger every raw tribe has at most four; therefore the surviving flags’ vacancies equal the retired active roster exactly.

| Active at cycle start | Tribes | Sorted states  | Labeled states | Evidence                 |
| --------------------- | ------ | -------------- | -------------- | ------------------------ |
| 15                    | 3      | 5/5/5          | 1              | Verified abstract counts |
| 14                    | 3      | 5/5/4          | 3              | Verified abstract counts |
| 13                    | 3      | 5/4/4 or 5/5/3 | 6              | Verified abstract counts |
| 12                    | 3      | 4/4/4 or 5/4/3 | 7              | Verified abstract counts |
| 11                    | 3      | 4/4/3 or 5/3/3 | 6              | Verified abstract counts |
| 10                    | 3      | 4/3/3 or 4/4/2 | 6              | Verified abstract counts |
| 9                     | 3      | 3/3/3 or 4/3/2 | 7              | Verified abstract counts |
| 8                     | 2      | 4/4            | 1              | Verified abstract counts |
| 7                     | 2      | 4/3            | 2              | Verified abstract counts |
| 6                     | 2      | 3/3 or 4/2     | 3              | Verified abstract counts |
| 5                     | 2      | 3/2            | 2              | Verified abstract counts |

The enumerator checked 448 abstract transitions. These are count/rank transitions, not every contestant identity, relationship state or device condition. Each of the 1114 legal ballot patterns below was checked for both one- and two-nominee contexts. At size two the two-nominee context is automatic.

| Tribe size | Legal ballots | Selection contexts | Captain forced for one nominee? | Zero second cutoffs |
| ---------- | ------------- | ------------------ | ------------------------------- | ------------------- |
| 2          | 1             | 2                  | Cannot be forced                | 0                   |
| 3          | 8             | 16                 | Cannot be forced                | 0                   |
| 4          | 81            | 162                | Possible                        | 0                   |
| 5          | 1024          | 2048               | Possible                        | 0                   |

## Required acceptance scenarios

All runtime, device and store scenarios remain **Not run**. The workbook provides editable result fields and ticket references.

| Check | Area                   | Scenario                                                         | Expected outcome                                                                                                         | Tickets                            | Status  |
| ----- | ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------- |
| TC01  | Opening                | Fresh seed                                                       | 15 distinct active members in 3 tribes plus 1 distinct reserve; no social window before membership.                      | TTP-007                            | Not run |
| TC02  | Average score          | Teams of unequal size                                            | Compare average canonical performance, not total points or rounded displayed averages.                                   | TTP-008                            | Not run |
| TC03  | Authoritative result   | Game reports native standings or winner                          | Respect its result contract and reject incompatible team aggregation.                                                    | TTP-002, TTP-008, TTP-012          | Not run |
| TC04  | Captain                | Best-score tie; captain is nominated                             | Resolve selection reproducibly. Captain receives no blanket immunity and retains the agreed tie authority.               | TTP-009, TTP-011                   | Not run |
| TC05  | Weighted votes         | Captain ballot plus ordinary ballots                             | Captain target receives 2, each ordinary target 1; legal totals match participating voters.                              | TTP-011, TTP-033                   | Not run |
| TC06  | One-slot tie           | Tied top nomination targets                                      | Captain selects a legal tied target; save and resume a pending human decision.                                           | TTP-011, TTP-033                   | Not run |
| TC07  | Two-slot cutoff        | One confirmed nominee and tied second place                      | Select exactly the tied cutoff slots; a zero-vote second cutoff is invalid under mandatory nonself ballots.              | TTP-018, TTP-033                   | Not run |
| TC08  | Forced pair            | Losing tribe has 2 members sharing a pact                        | Both are nominated, including the captain. No endless ballot or immunity exemption.                                      | TTP-018, TTP-024                   | Not run |
| TC09  | Nominee duel           | Human loses first duel                                           | Continue to reserve challenge; no permanent exit, jury entry or premature game-over.                                     | TTP-012, TTP-014                   | Not run |
| TC10  | Reserve defence        | Incumbent reserve wins                                           | Incumbent remains reserve, challenger leaves permanently, active team count drops by 1.                                  | TTP-013, TTP-014                   | Not run |
| TC11  | Reserve replacement    | Challenger wins                                                  | Challenger becomes neutral reserve, incumbent leaves permanently, no return to former tribe.                             | TTP-013, TTP-014                   | Not run |
| TC12  | Human reserve          | Repeated defences across cycles                                  | Human keeps the run and plays a defence each cycle without tribe social actions.                                         | TTP-013, TTP-014, TTP-023          | Not run |
| TC13  | Capture                | 5/5/2, 4/4/1 or 4/1 after departure                              | One largest-to-smallest transfer yields5/4/3 or3/2 where legal; milestone8/4 overrides capture; no recursive check.      | TTP-016, TTP-032                   | Not run |
| TC14  | Capture captain        | Recipient captain has departed; donor captain is recruited       | Use acting recipient captain; update membership once; avoid duplicate captain offices.                                   | TTP-009, TTP-016                   | Not run |
| TC15  | Merger                 | 3/3/2, 4/2/2 or 4/3/1 at 8 active                                | Retire the third-ranked flag, then fill the two surviving tribes to4/4 from its active survivors; reserve stays neutral. | TTP-017, TTP-032                   | Not run |
| TC16  | Milestone priority     | Capture condition coincides with 8 or 4 active                   | Merger or fusion takes priority; no redundant capture and no double movement.                                            | TTP-019                            | Not run |
| TC17  | Final defence          | 5 active plus reserve at last team-cycle start                   | Finish both duels, eliminate exactly 1, then merge 4 active plus final reserve into individual 5.                        | TTP-020, TTP-032                   | Not run |
| TC18  | Social actions         | Human targets an opponent or reserve                             | Roster can be viewed; conversation, pact/alliance offer and relationship actions reject the target.                      | TTP-023, TTP-035                   | Not run |
| TC19  | Incoming AI            | AI schedules an interaction across tribes                        | All inbound and background contact paths apply the same tribe boundary.                                                  | TTP-023, TTP-035                   | Not run |
| TC20  | Pact hierarchy         | Pact partner versus broad alliance member                        | Protect the pact partner where legally possible; use other allies as pawns when strategically appropriate.               | TTP-024, TTP-035                   | Not run |
| TC21  | Captured pact          | Old pact crosses the new tribe boundary                          | Keep old loyalty/memory without active cross-tribe coordination or illegal nomination targets.                           | TTP-023, TTP-025                   | Not run |
| TC22  | Sabotage               | Captured member has incentive to help former tribe               | Existing deliberate underperformance changes own legal performance, not fabricated teammate scores.                      | TTP-025, TTP-035                   | Not run |
| TC23  | Suspicion              | One bad result versus repeated unlikely underperformance         | Evidence may change trust through existing memory; hidden intent is not automatically known.                             | TTP-026, TTP-035                   | Not run |
| TC24  | Save and resume        | Close at ballot, tie, duel, capture, merger or fusion            | Resume the same pending choice/result once, with no duplicates or rerolls.                                               | TTP-006, TTP-034                   | Not run |
| TC25  | Classic handoff        | Individual five begins                                           | Clear team/captain powers, reopen normal contacts and use the existing Classic endgame.                                  | TTP-020, TTP-021                   | Not run |
| TC26  | Tribunal               | Track all permanent exits from original cast                     | 14 distinct permanent departures and 2 finalists; last 9 eligible departures vote under working default.                 | TTP-022, TTP-034                   | Not run |
| TC27  | Incompatible twist     | Pending double exit, entrant or extra vote power                 | Format gates prevent illegal activation and do not consume or grant unrelated outcomes.                                  | TTP-031                            | Not run |
| TC28  | All progressions       | Exhaustive team-loss sequence traversal                          | All reachable headcounts complete; each ordinary round starts with at least 2 per tribe and final fusion produces 5.     | TTP-032                            | Not run |
| TC29  | Complete season        | Purposeful seeds and different human strategies                  | Reach champion without stalled prompts, illegal targets, duplicate exits or leftover team flags.                         | TTP-036                            | Not run |
| TC30  | Internal mobile build  | New app identity and supported touch viewport                    | Launch/resume and representative team, reserve and fusion flows work without changing the original app.                  | TTP-037                            | Not run |
| TC31  | Event timing           | Last three-tribe competition at nine active                      | Merger stakes are disclosed before scores; third-ranked flag retires only after both duels.                              | TTP-017, TTP-040                   | Not run |
| TC32  | Merger by performance  | Third-ranked flag is largest at raw 4/3/1                        | It retires; survivors recruit to four each regardless of size rank.                                                      | TTP-017, TTP-043                   | Not run |
| TC33  | Merger by performance  | Retire each flag at 3/3/2, 4/2/2 and 4/3/1                       | Combined vacancies equal retired roster; keep survivors in place; no extra exit.                                         | TTP-017, TTP-032, TTP-083          | Not run |
| TC34  | Capture authority      | Two equal largest donors with different team ranks               | Higher-ranked donor supplies the recruit under the announced rule.                                                       | TTP-016, TTP-043                   | Not run |
| TC35  | Capture role           | Recruit the donor captain                                        | Recruit loses old office; highest surviving scorer acts; no second capture.                                              | TTP-009, TTP-016                   | Not run |
| TC36  | Captain protection     | Two- and three-member tribe choosing one nominee                 | Captain can protect themselves under weighted ballots and tie authority; UI explains it.                                 | TTP-009, TTP-011                   | Not run |
| TC37  | Captain exposure       | Three-member losing tribe choosing two nominees                  | Captain can enter the pair; no immunity flag overrides legal totals.                                                     | TTP-018                            | Not run |
| TC38  | Impossible ballot      | Saved ballot claims zero-vote second-place cutoff                | Reject as invalid: mandatory nonself ballots imply at least two positive totals.                                         | TTP-018, TTP-068                   | Not run |
| TC39  | Economy opening        | Fresh season before first Social 1                               | Banks start at zero; podium and scheduled grants apply once without duplicate init allowance.                            | TTP-047                            | Not run |
| TC40  | Economy equality       | AI and human on the same valid action/grant                      | Same published prices and grants; no hidden AI refill or overspend.                                                      | TTP-047, TTP-054                   | Not run |
| TC41  | Second wind            | Spend three versus four Energy in Social 1                       | Three gives no second wind; four gives +3 once at Social 2.                                                              | TTP-048                            | Not run |
| TC42  | Second wind            | Gain nomination/podium Energy without spending                   | Gains do not count toward the four-Energy spending threshold.                                                            | TTP-048, TTP-049                   | Not run |
| TC43  | Caps                   | Banks at 19,20 and legitimate 25; grant +5                       | Credit 1,0,0 respectively; show overflow; do not confiscate 25.                                                          | TTP-048, TTP-054                   | Not run |
| TC44  | Costs                  | Unaffordable, declined, failed and expired proposal              | Unaffordable submission charges nothing; valid submitted proposals retain their cost.                                    | TTP-051, TTP-054                   | Not run |
| TC45  | Costs                  | Group founder with four members; group chat with three guests    | Founding costs 4 Energy/5 Influence; chat costs 3 Energy; only proposer pays.                                            | TTP-051                            | Not run |
| TC46  | Free decisions         | All resources are zero at required ballot or draft               | Progression choices remain legal and free; no purchase or ad is required.                                                | TTP-054                            | Not run |
| TC47  | Reward contexts        | Both duels finish and screens reload                             | No duel podium rewards; nominee winner receives only stated survival bonus once.                                         | TTP-049                            | Not run |
| TC48  | Reserve bank           | Human defends repeatedly then qualifies                          | Bank freezes during reserve; no refill/farm; normal +5 applies at next Social 1 after fusion.                            | TTP-050, TTP-055                   | Not run |
| TC49  | Reward gates           | Weather, mission cache and recharge callbacks fire               | Format gates prevent every unlisted resource grant without changing season state.                                        | TTP-031, TTP-053                   | Not run |
| TC50  | Action eligibility     | LOH/POS-specific action during tribe social                      | Unavailable with clear explanation; no false LOH or replacement promise.                                                 | TTP-051, TTP-065                   | Not run |
| TC51  | Action effects         | Every enabled normalized catalog action                          | Cost and effect match source audit; all outcomes appear in published action help.                                        | TTP-002, TTP-051                   | Not run |
| TC52  | Ledger                 | Cap overflow, cost, nomination and survival in one cycle         | Opening plus actual credits minus costs equals closing bank with distinct receipts.                                      | TTP-052, TTP-054                   | Not run |
| TC53  | Dormant groups         | Captured player has two dormant alliances                        | Old bonds persist; local talks obey membership; unilateral leave can free a slot.                                        | TTP-045, TTP-046                   | Not run |
| TC54  | Queued privacy         | Private request is queued before a capture                       | Expire incompatible request; no delivery to separated tribe and no duplicate cost.                                       | TTP-045                            | Not run |
| TC55  | Pact exceptions        | All legal candidates are pactmates                               | Choose legally using existing trust/strategy; no refusal loop or automatic exemption.                                    | TTP-024, TTP-072                   | Not run |
| TC56  | AI knowledge           | Enemy holds private pact/ballot information                      | Opposing AI cannot read it; public recap never exposes it.                                                               | TTP-067, TTP-072                   | Not run |
| TC57  | Final-three simulation | AI-only Part 1,2,3                                               | Actual supported competition/skill results determine winners; no arbitrary finalist pick.                                | TTP-056                            | Not run |
| TC58  | First individual LOH   | Returning reserve and former captain                             | Both eligible; no inherited team immunity or captain vote weight.                                                        | TTP-055                            | Not run |
| TC59  | Final Four overlap     | LOH also wins POS                                                | Keep original nominees; holder alone chooses eviction under Classic.                                                     | TTP-021                            | Not run |
| TC60  | Jury arithmetic        | Eleven team exits and three individual exits                     | First five pre-jury; remaining nine jurors; five votes elect champion.                                                   | TTP-022, TTP-057                   | Not run |
| TC61  | Human juror            | Eliminated human stops and resumes spectating                    | Saved season preserves their eventual eligible Tribunal choice.                                                          | TTP-057                            | Not run |
| TC62  | UI static result       | Skip every major ceremony                                        | Same names, roles, roster and outcome remain inspectable; no extra commit.                                               | TTP-062, TTP-063, TTP-064          | Not run |
| TC63  | Accessibility          | Reduced motion, screen reader, enlarged text                     | All rules and results readable; no color/sound-only meaning or clipped controls.                                         | TTP-064                            | Not run |
| TC64  | Reserve pacing         | Human holds reserve for many cycles                              | Skip only AI phases; arrive at next playable defence with public recap available.                                        | TTP-044, TTP-085                   | Not run |
| TC65  | Atomic roster          | Move a recruit during animation and background app               | Committed snapshot restores with no empty slot, duplicate avatar or stale social target.                                 | TTP-041, TTP-063, TTP-069          | Not run |
| TC66  | Scoring recovery       | Missing/invalid score or technical disconnect                    | Recover the same uncommitted attempt; no fabricated zero, forfeit or reroll.                                             | TTP-059, TTP-068                   | Not run |
| TC67  | Tie fallback           | Duel native tie and replay tie                                   | Use published season priority after one replay and its native tie procedure; identical treatment for reserve/challenger. | TTP-059                            | Not run |
| TC68  | Ad timing              | Opening, merger, fusion, duel or finale                          | No interstitial request at any forbidden boundary.                                                                       | TTP-074                            | Not run |
| TC69  | Ad limits              | Two eligible recaps less than 180 seconds apart                  | Frequency/spacing caps persist through reload; only an eligible natural break can request.                               | TTP-074                            | Not run |
| TC70  | Ad failure             | No fill, consent refusal, close or offline                       | Continue immediately with unchanged committed season; no retry loop or lost input.                                       | TTP-074, TTP-077, TTP-081          | Not run |
| TC71  | Purchase states        | Cancel, pending, failure and duplicate success callback          | Correct UI/entitlement; no wrong charge or duplicate fulfillment.                                                        | TTP-076, TTP-081                   | Not run |
| TC72  | Restore                | Reinstall with the same store account                            | Restore verified Remove Ads without reviving or deleting a season.                                                       | TTP-076, TTP-081                   | Not run |
| TC73  | Refund                 | Previously paid entitlement is revoked                           | Handle revocation under supported store flow and preserve gameplay/save integrity.                                       | TTP-076                            | Not run |
| TC74  | Identity isolation     | Both original and Teamplay installed                             | Products, saves, ads, profiles and leaderboards remain correctly scoped.                                                 | TTP-070, TTP-075                   | Not run |
| TC75  | Store evidence         | Screenshots and listing versus actual build                      | Describe AI play, distinct tribe loop and real shipped features; no approval guarantee.                                  | TTP-078, TTP-079                   | Not run |
| TC76  | Privacy                | Consent off and account deletion if applicable                   | Data/SDK behavior matches declarations; no private chats or email in general analytics.                                  | TTP-077, TTP-080                   | Not run |
| TC77  | Invalid state          | Duplicate contestant/reserve or unsupported singleton            | Recover last valid checkpoint; preserve diagnostics; never add a random replacement.                                     | TTP-042, TTP-068                   | Not run |
| TC78  | Versioned save         | App update changes future rule defaults                          | Continue existing compatible contract or explicit migration; never silently alter the run.                               | TTP-006, TTP-041                   | Not run |
| TC79  | Concept coverage       | Enumerate all abstract count/rank/loss and ballot patterns       | Every legal transition satisfies the published invariants; reported separately from runtime tests.                       | TTP-032, TTP-083                   | Not run |
| TC80  | Usability              | Five independent testers complete onboarding tasks               | They can predict captures/merger and explain reserve, captain and Energy without developer help.                         | TTP-085                            | Not run |
| TC81  | Commercial gate        | Build passes but purchases/device checks are unrun               | Do not mark commercial readiness complete; outstanding evidence remains visible.                                         | TTP-081, TTP-086                   | Not run |
| TC82  | Stage-aware roles      | After fusion all five have no tribe or reserve                   | All five remain active individually, receive ordinary eligible Social1 grants and pass individual-stage validation.      | TTP-020, TTP-047, TTP-055, TTP-068 | Not run |
| TC83  | Missing rank           | Returning reserve ties a podium score without a prior-cycle rank | Recorded prior ranks sort ahead of missing ranks; equally missing prior ranks use published season priority.             | TTP-008, TTP-055, TTP-059          | Not run |

## Delivery backlog

The updated workbook preserves TTP-001 through TTP-039 and expands to TTP-088. There are 86 release items and two later items. TTP-001 is Specified; every implementation ticket remains Not started. Dependency order is recorded in the workbook. Size labels are provisional and do not represent a quoted estimate.

## Sources and adaptation notes

Desafío varies by season. Its performance-based flag survival and earned transfer authority inspired clearer event ownership. The one-way size-gap capture, average-score flag retirement, double captain ballot and neutral reserve circuit here are Teamplay decisions, not attributed Desafío rules.

| Source | Subject                        | Reference                                                                                                                                          | Evidence                    | Use                                                                                                              |
| ------ | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| S1     | Product direction              | Georgi’s requests in this conversation, 12 November 2026                                                                                           | Original requirements       | Three tribes, reserve, Classic reuse, pacts, captain weight, local social, sabotage, complete commercial backlog |
| S2     | Classic social calibration     | https://github.com/georgi-cole/bbmobilenew-source/blob/0694de14b81de548bd3c74ec8e14bc09e24bdfa6/src/social/socialResourceCalibration.ts            | Source audit                | Normal grant 5 / cap 20; second wind 3 at spending 4; podium 5/2/1; nomination 3; survival 2                     |
| S3     | Social grants and costs        | https://github.com/georgi-cole/bbmobilenew-source/blob/0694de14b81de548bd3c74ec8e14bc09e24bdfa6/src/social/relationshipResourcePolicyMiddleware.ts | Source audit                | Secondwind and event rewards; recheck resolved path at fork                                                      |
| S4     | Social action catalog          | https://github.com/georgi-cole/bbmobilenew-source/blob/0694de14b81de548bd3c74ec8e14bc09e24bdfa6/src/social/socialActions.ts                        | Source audit                | Displayed normalized Energy/Influence/Info costs                                                                 |
| S5     | Classic Tribunal policy        | https://github.com/georgi-cole/bbmobilenew-source/blob/0694de14b81de548bd3c74ec8e14bc09e24bdfa6/src/rules/tribunalPolicy.ts                        | Source audit                | Cast16→jury9; first5 permanent exits pre-jury                                                                    |
| S6     | Classic game/finale flow       | https://github.com/georgi-cole/bbmobilenew-source/blob/0694de14b81de548bd3c74ec8e14bc09e24bdfa6/src/store/gameSlice.ts                             | Source audit                | F5/F4/F3 reuse; AI final-three result path must be checked                                                       |
| S7     | Desafío captain transition2025 | https://www.caracoltv.com/desafio/desafio-de-capitanas-una-participante-queda-atrapada-en-un-obstaculo-de-la-prueba-pr30?_amp=true                 | OfficialCaracol3Oct2025     | Captain performance determines flag survival. Our eight-player average-score merger is original adaptation.      |
| S8     | Desafío earned exchange2025    | https://www.caracoltv.com/desafio/dos-participantes-cambian-de-equipo-por-decision-de-alpha-hubo-bastante-llanto-pr30?_amp=true                    | OfficialCaracol13Nov2025    | Competition earns exchange authority. Our one-way size-gap capture is a different original rule.                 |
| S9     | Desafío nominations2025        | https://www.caracoltv.com/desafio/cambios-en-la-eleccion-de-la-sentencia-en-el-desafio-2025-por-que-unos-resultan-beneficiados-ed45?_amp=true      | OfficialCaracol3Jul2025     | Captain nomination authority varies by season; not evidence of our double ballot.                                |
| S10    | Apple review rules             | https://developer.apple.com/app-store/review/guidelines/                                                                                           | Official; accessed12Nov2026 | 4.3 repetitive apps;3.1.1 digital purchases; recheck at submission                                               |
| S11    | Google repetitive content      | https://support.google.com/googleplay/android-developer/answer/9899034?hl=en                                                                       | Official; accessed12Nov2026 | Distinct value for separate app listing                                                                          |
| S12    | Google ad policy               | https://support.google.com/googleplay/android-developer/answer/9857753                                                                             | Official; accessed12Nov2026 | Natural ad boundaries and disruptive-ad restrictions                                                             |
| S13    | Google billing                 | https://support.google.com/googleplay/android-developer/answer/10281818?hl=en                                                                      | Official; accessed12Nov2026 | Platform billing for digital features, subject to applicable policy exceptions                                   |
