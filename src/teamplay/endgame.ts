import { updateCompetitionSeasonStateByPlayerId } from '../ai/competition'
import { classicFinalThreeEntrants, classicLohEntrants } from '../rules/classicEndgame'
import { defaultTribunalSizeForCast, shouldJoinTribunal } from '../rules/tribunalPolicy'
import {
  computeRealityJuryEvaluation,
  finalizeRealityVote,
  realityJuryEvaluationScore,
  recordRealityCeremonyOutcome,
  scoreRealitySafetyDecision,
  type RealityCeremonyInput,
} from '../social/reality/ceremonies'
import { appendRealityEvent } from '../social/reality/events'
import { aiJurorVote, determineWinner, tallyVotes } from '../utils/juryUtils'
import { prepareIndividualAttempt, rankIndividualAttempt } from './competition'
import {
  currentRound,
  finalFiveVoters,
  finalNominees,
  highestBallotTargets,
  individualDecision,
  type IndividualDecision,
} from './endgameRules'
import { realityDecisionView, resolveAiSocial, strategicChoice } from './social'
import type { Attempt, PowerRound, TeamplayState } from './types'

function clock(state: TeamplayState) {
  const step = state.endgame!.step
  const day =
    state.phase === 'finalFive'
      ? 12
      : state.phase === 'finalFour'
        ? 13
        : state.phase === 'finalThree'
          ? step === 'partOne'
            ? 14
            : step === 'partTwo'
              ? 15
              : 16
          : 17
  return { day, phase: step }
}

function ceremony(
  state: TeamplayState,
  input: Omit<RealityCeremonyInput, 'day' | 'phase' | 'witnessIds' | 'publicEligible'>
) {
  return recordRealityCeremonyOutcome(state.reality, {
    ...input,
    ...clock(state),
    witnessIds: state.individualIds,
    publicEligible: true,
  })
}

/** Expose already published performance to the inherited Tribunal evaluator.
 * Old tribe saves contain the authoritative scores and outcomes. */
function restoreTeamPerformanceEvidence(state: TeamplayState) {
  for (const record of state.history) {
    const teamAttempt = state.attempts[`${state.id}:${record.cycle}:team:0`]
    const teamLeader = state.resources.find(
      (entry) => entry.id === `${state.id}:${record.cycle}:podium1:${entry.playerId}`
    )?.playerId
    const results = [
      { actorId: teamLeader, kind: 'team podium', participants: teamAttempt.participants },
      { actorId: record.nomineeWinnerId, kind: 'nominee duel', participants: record.nominees },
      {
        actorId: record.reserveId,
        kind: 'reserve duel',
        participants: [record.reserveId, record.exitId],
      },
    ]
    for (const result of results) {
      if (!result.actorId) continue
      appendRealityEvent(state.reality, {
        day: record.cycle,
        phase: result.kind,
        type: 'CEREMONY_POWER_WON',
        actorId: result.actorId,
        targetIds: [],
        participantIds: result.participants,
        witnessIds: state.castOrder,
        visibility: 'CEREMONY_PUBLIC',
        outcome: 'SYSTEM',
        reason: `Won the ${result.kind}.`,
        tags: ['competition', 'tribe-stage'],
        relatedFactIds: [],
        relatedPromiseIds: [],
        relatedThreadIds: [],
        publicEligible: true,
        juryEligible: true,
      })
    }
  }
}

function startPowerRound(state: TeamplayState, size: 5 | 4) {
  state.endgame!.rounds.push({
    size,
    entrants: [...state.individualIds],
    lohId: null,
    posId: null,
    initialNominees: [],
    savedId: null,
    replacementId: null,
    ballots: {},
    exitId: null,
  })
  state.phase = size === 5 ? 'finalFive' : 'finalFour'
  state.endgame!.step = 'social'
  state.currentAttemptId = null
}

function startEndgame(state: TeamplayState) {
  state.endgame = {
    version: 1,
    step: 'social',
    qualifiers: [...state.individualIds],
    rounds: [],
    partWinners: [],
    thirdPlaceId: null,
    votes: {},
    championId: null,
    placements: [],
  }
  // The last team results remain in history and attempts. Clear only live powers.
  state.currentAttemptId = null
  state.frozenRosters = {}
  state.teamResults = []
  state.individualOrder = []
  state.previousTeamOrder = []
  state.previousIndividualOrder = []
  state.ballots = {}
  state.totals = {}
  state.cutoffs = []
  state.nominees = []
  state.nomineeWinnerId = null
  state.challengerId = null
  state.capture = null
  state.merge = null
  state.socialOneSpent = {}
  restoreTeamPerformanceEvidence(state)
  startPowerRound(state, 5)
}

export function completeIndividualAttempt(state: TeamplayState, attempt: Attempt) {
  const endgame = state.endgame!
  const round = currentRound(state)!
  const winner = rankIndividualAttempt(state, attempt)[0]
  attempt.winnerId = winner
  state.competitionState = updateCompetitionSeasonStateByPlayerId(state.competitionState, {
    playerIds: state.castOrder,
    participants: attempt.participants,
    scores: attempt.scores,
    winnerId: winner,
    includePlacementBonuses: attempt.participants.length > 2,
  })
  ceremony(state, {
    kind: 'POWER_WON',
    actorId: winner,
    targetIds: [],
    participantIds: attempt.participants,
    tags: [attempt.kind],
  })
  switch (attempt.kind) {
    case 'fiveLoh':
    case 'fourLoh':
      round.lohId = winner
      endgame.step = 'nominate'
      break
    case 'fivePos':
    case 'fourPos':
      round.posId = winner
      endgame.step = round.size === 5 ? 'safety' : 'soleVote'
      break
    case 'partOne':
      endgame.partWinners.push(winner)
      endgame.step = 'partTwoReady'
      break
    case 'partTwo':
      endgame.partWinners.push(winner)
      endgame.step = 'partThreeReady'
      break
    case 'partThree':
      endgame.partWinners.push(winner)
      endgame.step = 'cut'
      break
  }
}

function evict(state: TeamplayState, actorId: string | undefined, target: string) {
  ceremony(state, { kind: 'EVICTION', actorId, targetIds: [target] })
  if (
    shouldJoinTribunal(
      state.eliminated.length,
      state.castOrder.length,
      defaultTribunalSizeForCast(state.castOrder.length)
    )
  )
    state.jurors.push(target)
  state.eliminated.push(target)
  state.individualIds = state.individualIds.filter((id) => id !== target)
  state.lastExitId = target
  state.endgame!.step = 'departure'
}

function recordDecisionVote(
  state: TeamplayState,
  actorId: string,
  targetId: string,
  candidates: string[],
  revealed: boolean
) {
  finalizeRealityVote(
    state.reality,
    actorId,
    targetId,
    clock(state),
    `${state.id}:individual:${state.phase}:${state.endgame!.step}:${actorId}`,
    candidates,
    { revealed }
  )
}

function juryVote(state: TeamplayState, jurorId: string): string {
  const scores = Object.fromEntries(
    state.individualIds.map((id) => [
      id,
      realityJuryEvaluationScore(computeRealityJuryEvaluation(state.reality, jurorId, id)),
    ])
  )
  return aiJurorVote(jurorId, state.individualIds, state.seed, state.reality, scores)
}

function sealTribunal(state: TeamplayState) {
  const endgame = state.endgame!
  const expected = defaultTribunalSizeForCast(state.castOrder.length)
  if (state.jurors.length !== expected) throw new Error('The Tribunal roster is incomplete')
  for (const id of state.jurors) {
    if (endgame.votes[id]) continue
    if (id === state.humanId) throw new Error('Your Tribunal vote is still required')
    endgame.votes[id] = juryVote(state, id)
  }
  const champion = determineWinner(tallyVotes(endgame.votes), state.individualIds)
  if (!champion) throw new Error('The Tribunal results could not be resolved')
  endgame.championId = champion
  endgame.placements = [
    champion,
    state.individualIds.find((id) => id !== champion)!,
    ...[...state.eliminated].reverse(),
  ]
  endgame.step = 'finished'
  state.phase = 'seasonComplete'
}

function applyChoice(state: TeamplayState, choice: IndividualDecision, selected: string[]) {
  const endgame = state.endgame!
  const round = currentRound(state)!
  const { actorId, candidates, slots } = choice
  const optionalSafety = endgame.step === 'safety'
  if (
    (!(optionalSafety && !selected.length) && selected.length !== slots) ||
    new Set(selected).size !== selected.length ||
    selected.some((id) => !candidates.includes(id))
  )
    throw new Error('Choose from the available contestants')
  const target = selected[0]
  switch (endgame.step) {
    case 'nominate':
      round.initialNominees = [...selected]
      ceremony(state, {
        kind: 'NOMINATIONS_LOCKED',
        actorId,
        targetIds: selected,
        eligibleAlternativeIds: candidates,
      })
      endgame.step = 'pos'
      prepareIndividualAttempt(state, round.size === 5 ? 'fivePos' : 'fourPos', round.entrants)
      break
    case 'safety':
      round.savedId = target ?? null
      ceremony(state, {
        kind: target ? 'SAFETY_USED' : 'SAFETY_DECLINED',
        actorId,
        targetIds: selected,
        safetyEligibleTargetIds: candidates,
      })
      endgame.step = target ? 'replace' : 'ballots'
      break
    case 'replace':
      round.replacementId = target
      ceremony(state, {
        kind: 'NOMINATIONS_LOCKED',
        actorId,
        targetIds: [target],
        eligibleAlternativeIds: candidates,
        nominationStage: 'REPLACEMENT',
      })
      endgame.step = 'ballots'
      break
    case 'ballots':
      round.ballots[actorId] = target
      recordDecisionVote(state, actorId, target, candidates, false)
      break
    case 'tie':
    case 'soleVote':
      recordDecisionVote(state, actorId, target, candidates, true)
      round.exitId = target
      evict(state, actorId, target)
      break
    case 'cut':
      recordDecisionVote(state, actorId, target, candidates, true)
      endgame.thirdPlaceId = target
      evict(state, actorId, target)
      break
    case 'juryVote':
      endgame.votes[actorId] = target
      break
  }
}

export function chooseIndividual(
  state: TeamplayState,
  selected: string[] | undefined,
  delegate = false
) {
  const decision = individualDecision(state)
  if (!decision || decision.actorId !== state.humanId)
    throw new Error('There is no pending choice for your contestant')
  applyChoice(state, decision, delegate ? automaticChoice(state, decision) : (selected ?? []))
}

function automaticChoice(
  state: TeamplayState,
  { actorId, candidates, slots }: IndividualDecision
): string[] {
  if (state.endgame!.step === 'juryVote') return [juryVote(state, actorId)]
  if (state.endgame!.step === 'safety') {
    if (candidates.includes(actorId)) return [actorId]
    const decisionView = realityDecisionView(state, actorId)
    const choice = candidates
      .map((id) => ({ id, score: scoreRealitySafetyDecision(decisionView, actorId, id) }))
      .sort((a, b) => b.score - a.score)
      .find((entry) => entry.score > 0)
    return choice ? [choice.id] : []
  }
  const remaining = [...candidates]
  const selected: string[] = []
  for (let index = 0; index < slots; index++) {
    const id = strategicChoice(state, actorId, remaining)
    selected.push(id)
    remaining.splice(remaining.indexOf(id), 1)
  }
  return selected
}

function finishFinalFiveBallots(state: TeamplayState, round: PowerRound) {
  const nominees = finalNominees(round)
  for (const id of finalFiveVoters(round)) {
    if (round.ballots[id]) continue
    const target = strategicChoice(state, id, nominees)
    round.ballots[id] = target
    recordDecisionVote(state, id, target, nominees, false)
  }
  ceremony(state, { kind: 'VOTES_REVEALED', targetIds: nominees })
  const leaders = highestBallotTargets(round)
  if (leaders.length === 2) state.endgame!.step = 'tie'
  else {
    round.exitId = leaders[0]
    evict(state, undefined, leaders[0])
  }
}

export function progressIndividual(state: TeamplayState) {
  if (state.phase === 'fusion') return startEndgame(state)
  const endgame = state.endgame!
  const pending = individualDecision(state)
  if (pending) {
    if (pending.actorId === state.humanId) throw new Error('Make your choice before continuing')
    return applyChoice(state, pending, automaticChoice(state, pending))
  }
  const round = currentRound(state)!
  switch (endgame.step) {
    case 'social': {
      resolveAiSocial(state)
      const outgoing = endgame.rounds[0].lohId
      endgame.step = 'loh'
      prepareIndividualAttempt(
        state,
        round.size === 5 ? 'fiveLoh' : 'fourLoh',
        classicLohEntrants(round.entrants, round.size === 4 && outgoing ? [outgoing] : [])
      )
      break
    }
    case 'ballots':
      finishFinalFiveBallots(state, round)
      break
    case 'departure':
      if (state.phase === 'finalFive') startPowerRound(state, 4)
      else if (state.phase === 'finalFour') {
        state.phase = 'finalThree'
        endgame.step = 'partOne'
        prepareIndividualAttempt(
          state,
          'partOne',
          classicFinalThreeEntrants(state.individualIds, 1)
        )
      } else {
        state.phase = 'tribunal'
        endgame.step = 'juryVote'
        state.currentAttemptId = null
      }
      break
    case 'partTwoReady':
      endgame.step = 'partTwo'
      prepareIndividualAttempt(
        state,
        'partTwo',
        classicFinalThreeEntrants(state.individualIds, 2, endgame.partWinners[0])
      )
      break
    case 'partThreeReady':
      endgame.step = 'partThree'
      prepareIndividualAttempt(
        state,
        'partThree',
        classicFinalThreeEntrants(
          state.individualIds,
          3,
          endgame.partWinners[0],
          endgame.partWinners[1]
        )
      )
      break
    case 'juryVote':
      sealTribunal(state)
      break
    default:
      throw new Error('Complete the pending competition or choice before continuing')
  }
}
