import { getAll } from '../data/houseguests'
import {
  getDefaultCompetitionProfile,
  updateCompetitionSeasonStateByPlayerId,
} from '../ai/competition'
import { createInitialRealityDomainState } from '../social/reality/state'
import { getRealityRelationship } from '../social/reality/relationships'
import { mulberry32, seededPickN } from '../store/rng'
import { resolveAvatar } from '../utils/avatar'
import {
  isIndividualCompetition,
  prepareAttempt,
  resolveTeamOrder,
  seedFor,
  simulatedScore,
} from './competition'
import { chooseIndividual, completeIndividualAttempt, progressIndividual } from './endgame'
import { competitionForStep } from './endgameRules'
import {
  activeIds,
  performSocial,
  resolveAiSocial,
  resourceChange,
  strategicChoice,
  tribeOf,
} from './social'
import { validateTeamplay } from './validation'
import type { Attempt, Cutoff, TeamplayAction, TeamplayCommand, TeamplayState } from './types'

export const FLAGS = [
  { id: 'ember', name: 'Ember', color: '#f6a772', priority: 1 },
  { id: 'tide', name: 'Tide', color: '#70d8e2', priority: 2 },
  { id: 'iris', name: 'Iris', color: '#bd9af7', priority: 3 },
]

export function createTeamplay(
  seed: number,
  humanId: string,
  id: string = crypto.randomUUID()
): TeamplayState {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error('Invalid season seed')
  const cast = getAll()
  const human = cast.find((player) => player.id === humanId)
  if (!human) throw new Error('Choose an existing contestant')
  const random = mulberry32(seed)
  const selected = [
    human,
    ...seededPickN(
      random,
      cast.filter((player) => player.id !== humanId),
      15
    ),
  ]
  if (selected.length !== 16) throw new Error('A Teamplay season requires 16 contestants')
  const shuffled = seededPickN(random, selected, 16)
  const reserve = shuffled.find((player) => player.id !== humanId)!
  const active = shuffled.filter((player) => player.id !== reserve.id)
  const state: TeamplayState = {
    schemaVersion: 1,
    rulesVersion: '2.0',
    manifestVersion: 'quick-tap-classic-30s-v1',
    id,
    seed,
    revision: 0,
    humanId,
    stage: 'threeTribes',
    phase: 'opening',
    cycle: 1,
    contestants: shuffled.map((player, index) => ({
      id: player.id,
      name: player.name,
      avatar: resolveAvatar({ id: player.id, name: player.name, avatar: player.avatar ?? '' }),
      isHuman: player.id === humanId,
      priority: index + 1,
      profile: player.competitionProfile ?? getDefaultCompetitionProfile(),
      bank: { energy: 0, influence: 0, info: 0 },
    })),
    tribes: FLAGS.map((flag, index) => ({
      ...flag,
      members: active.filter((_, place) => place % 3 === index).map((player) => player.id),
      captainId: null,
    })),
    reserveId: reserve.id,
    eliminated: [],
    jurors: [],
    individualIds: [],
    castOrder: shuffled.map((player) => player.id),
    plan: Array.from(
      { length: 11 },
      (_, index) =>
        Object.fromEntries(
          (['team', 'nominee', 'reserve'] as const).map((kind) => [
            kind,
            {
              seed: seedFor(seed, `${index + 1}:${kind}:0`),
              replaySeed: seedFor(seed, `${index + 1}:${kind}:1`),
            },
          ])
        ) as TeamplayState['plan'][number]
    ),
    attempts: {},
    currentAttemptId: null,
    frozenRosters: {},
    teamResults: [],
    individualOrder: [],
    previousTeamOrder: [],
    previousIndividualOrder: [],
    ballots: {},
    totals: {},
    cutoffs: [],
    nominees: [],
    nomineeWinnerId: null,
    challengerId: null,
    lastExitId: null,
    capture: null,
    merge: null,
    socialOneSpent: {},
    socialActions: [],
    reality: createInitialRealityDomainState(),
    competitionState: {},
    receipts: [],
    resources: [],
    history: [],
  }
  for (const actor of state.castOrder)
    for (const target of state.castOrder)
      if (actor !== target) getRealityRelationship(state.reality, actor, target)
  validateTeamplay(state)
  return state
}

export function currentAttempt(state: TeamplayState): Attempt | null {
  return state.currentAttemptId ? state.attempts[state.currentAttemptId] : null
}

export function votingTribes(state: TeamplayState) {
  const immuneId = state.teamResults[0]?.tribeId
  return state.tribes.filter((tribe) => tribe.id !== immuneId)
}

export function humanBallotRequired(state: TeamplayState): boolean {
  return (
    state.phase === 'ballots' &&
    votingTribes(state).some(
      (tribe) =>
        tribe.members.includes(state.humanId) &&
        !(state.stage === 'twoTribes' && tribe.members.length === 2)
    ) &&
    !state.ballots[state.humanId]
  )
}

function grant(state: TeamplayState, id: string, reason: string, energy: number, influence = 0) {
  resourceChange(state, id, reason, { energy, influence }, `${state.id}:${state.cycle}:${reason}`)
}

function startCycle(state: TeamplayState): void {
  state.frozenRosters = Object.fromEntries(
    state.tribes.map((tribe) => [tribe.id, [...tribe.members]])
  )
  state.teamResults = []
  state.individualOrder = []
  state.ballots = {}
  state.totals = {}
  state.cutoffs = []
  state.nominees = []
  state.nomineeWinnerId = null
  state.challengerId = null
  state.lastExitId = null
  state.socialOneSpent = {}
  state.capture = null
  state.merge = null
  state.phase = 'teamCompetition'
  prepareAttempt(state, 'team')
}

function enterSocial(state: TeamplayState, second: boolean): void {
  state.phase = second ? 'socialTwo' : 'socialOne'
  for (const id of activeIds(state)) {
    if (!second) grant(state, id, 'socialOne', 5)
    else if ((state.socialOneSpent[id] ?? 0) >= 4) grant(state, id, 'secondWind', 3)
  }
}

function enterBallots(state: TeamplayState): void {
  state.phase = 'ballots'
  for (const tribe of votingTribes(state)) {
    if (state.stage === 'twoTribes' && tribe.members.length === 2) continue
    for (const actorId of tribe.members) {
      if (actorId === state.humanId) continue
      state.ballots[actorId] = strategicChoice(
        state,
        actorId,
        tribe.members.filter((id) => id !== actorId)
      )
    }
  }
}

function revealNominees(state: TeamplayState): void {
  if (state.nominees.length !== 2 || new Set(state.nominees).size !== 2)
    throw new Error('Invalid nominee pair')
  state.phase = 'nominations'
  for (const id of state.nominees) grant(state, id, 'nomination', 3)
}

function chooseCutoff(state: TeamplayState, cutoff: Cutoff, selected: string[]): void {
  if (
    selected.length !== cutoff.slots ||
    new Set(selected).size !== selected.length ||
    selected.some((id) => !cutoff.candidates.includes(id))
  )
    throw new Error('Choose exactly the required number from the tied candidates')
  state.nominees.push(...selected)
  state.cutoffs = state.cutoffs.filter((entry) => entry.tribeId !== cutoff.tribeId)
}

function finishBallots(state: TeamplayState): void {
  if (humanBallotRequired(state)) throw new Error('Your secret ballot is still required')
  for (const tribe of votingTribes(state)) {
    const slots = state.stage === 'threeTribes' ? 1 : 2
    if (tribe.members.length === 2 && slots === 2) {
      state.nominees.push(...tribe.members)
      continue
    }
    const tally: Record<string, number> = Object.fromEntries(tribe.members.map((id) => [id, 0]))
    for (const actorId of tribe.members) {
      const target = state.ballots[actorId]
      if (!target || target === actorId || !tribe.members.includes(target))
        throw new Error('Invalid or missing secret ballot')
      tally[target] += actorId === tribe.captainId ? 2 : 1
    }
    Object.assign(state.totals, tally)
    const ordered = [...tribe.members].sort((a, b) => tally[b] - tally[a])
    const threshold = tally[ordered[slots - 1]]
    if (threshold <= 0) throw new Error('Invalid zero-vote nomination cutoff')
    const confirmed = ordered.filter((id) => tally[id] > threshold)
    state.nominees.push(...confirmed)
    const candidates = ordered.filter((id) => tally[id] === threshold)
    const needed = slots - confirmed.length
    if (candidates.length === needed) state.nominees.push(...candidates)
    else
      state.cutoffs.push({
        tribeId: tribe.id,
        captainId: tribe.captainId!,
        candidates,
        slots: needed,
      })
  }
  for (const cutoff of [...state.cutoffs])
    if (cutoff.captainId !== state.humanId) {
      const pool = [...cutoff.candidates]
      const selected: string[] = []
      while (selected.length < cutoff.slots) {
        const id = strategicChoice(state, cutoff.captainId, pool)
        selected.push(id)
        pool.splice(pool.indexOf(id), 1)
      }
      chooseCutoff(state, cutoff, selected)
    }
  if (state.cutoffs.length) state.phase = 'nominationTies'
  else revealNominees(state)
}

function completeAttempt(state: TeamplayState, humanScore?: number, delegated = false): void {
  const attempt = currentAttempt(state)
  if (!attempt || attempt.status === 'complete') throw new Error('No uncommitted attempt')
  const hasHuman = attempt.participants.includes(state.humanId)
  if (hasHuman) {
    if (!delegated && attempt.status !== 'running')
      throw new Error('Start this competition before submitting a score')
    if (!Number.isSafeInteger(humanScore) || humanScore! < 0 || humanScore! > 1000000)
      throw new Error('Invalid human score; restart the same attempt')
    attempt.scores[state.humanId] = humanScore!
  } else if (humanScore !== undefined) throw new Error('The human is not in this competition')
  if (
    attempt.participants.some(
      (id) => !Number.isSafeInteger(attempt.scores[id]) || attempt.scores[id] < 0
    )
  )
    throw new Error('Incomplete competition scores')
  attempt.delegated = delegated
  attempt.status = 'complete'
  if (isIndividualCompetition(attempt.kind)) return completeIndividualAttempt(state, attempt)
  if (attempt.kind === 'team') {
    resolveTeamOrder(state, attempt)
    for (let index = 0; index < 3; index++)
      grant(
        state,
        state.individualOrder[index],
        `podium${index + 1}`,
        [5, 2, 1][index],
        index === 0 ? 15 : 0
      )
    // Public performance becomes the actor's legitimate threat read, never
    // another tribe's private conversations or hidden ballot intentions.
    for (const actor of activeIds(state))
      for (const target of activeIds(state))
        if (actor !== target) {
          getRealityRelationship(state.reality, actor, target).perceivedThreat =
            100 * (1 - state.individualOrder.indexOf(target) / (state.individualOrder.length - 1))
        }
    state.phase = 'teamResults'
  } else {
    const [first, second] = attempt.participants
    if (attempt.scores[first] === attempt.scores[second]) {
      attempt.tied = true
      if (attempt.replay === 0) {
        prepareAttempt(state, attempt.kind, 1)
        return
      }
      attempt.priorityFallback = true
    }
    const winner = attempt.priorityFallback
      ? [...attempt.participants].sort(
          (a, b) =>
            state.contestants.find((player) => player.id === a)!.priority -
            state.contestants.find((player) => player.id === b)!.priority
        )[0]
      : attempt.scores[first] > attempt.scores[second]
        ? first
        : second
    attempt.winnerId = winner
    const loser = attempt.participants.find((id) => id !== winner)!
    if (attempt.kind === 'nominee') {
      state.nomineeWinnerId = winner
      state.challengerId = loser
      grant(state, winner, 'nomineeSurvival', 2, 8)
      state.phase = 'nomineeResult'
    } else {
      const challenger = state.challengerId!
      const tribe = tribeOf(state, challenger)!
      tribe.members = tribe.members.filter((id) => id !== challenger)
      if (tribe.captainId === challenger)
        tribe.captainId = state.individualOrder.find((id) => tribe.members.includes(id))!
      state.reserveId = winner
      state.eliminated.push(loser)
      state.lastExitId = loser
      if (state.eliminated.length > 5) state.jurors.push(loser)
      state.phase = 'reserveResult'
      state.history.push({
        cycle: state.cycle,
        teamResults: structuredClone(state.teamResults),
        nominees: [...state.nominees],
        nomineeWinnerId: state.nomineeWinnerId!,
        challengerId: challenger,
        reserveId: winner,
        exitId: loser,
        transfers: [],
      })
    }
  }
  state.competitionState = updateCompetitionSeasonStateByPlayerId(state.competitionState, {
    playerIds: state.castOrder,
    participants: attempt.participants,
    scores: attempt.scores,
    winnerId: attempt.kind === 'team' ? state.individualOrder[0] : attempt.winnerId,
    includePlacementBonuses: attempt.kind === 'team',
  })
}

function maintain(state: TeamplayState): void {
  const count = activeIds(state).length
  if (count === 4) {
    state.individualIds = [...activeIds(state), state.reserveId!]
    state.reserveId = null
    state.tribes = []
    state.stage = 'individual'
    state.phase = 'fusion'
    return
  }
  if (count === 8 && state.stage === 'threeTribes') {
    const order = state.teamResults.map((entry) => entry.tribeId)
    const retired = state.tribes.find((tribe) => tribe.id === order[2])!
    const surviving = order.slice(0, 2).map((id) => state.tribes.find((tribe) => tribe.id === id)!)
    state.merge = {
      retiredId: retired.id,
      pool: [...retired.members],
      order: order.slice(0, 2),
      turn: 0,
      captains: Object.fromEntries(surviving.map((tribe) => [tribe.id, tribe.captainId!])),
    }
    state.tribes = surviving
    state.stage = 'twoTribes'
    state.phase = 'merge'
    finishForcedDrafts(state)
    return
  }
  const sizes = state.tribes.map((tribe) => tribe.members.length)
  const gap = Math.max(...sizes) - Math.min(...sizes)
  if (gap > 3) throw new Error('Invalid tribe gap; restore the previous checkpoint')
  if (gap === 3) {
    const ordered = state.teamResults.map(
      (entry) => state.tribes.find((tribe) => tribe.id === entry.tribeId)!
    )
    const donor = ordered.find((tribe) => tribe.members.length === Math.max(...sizes))!
    const recipient = [...ordered]
      .reverse()
      .find((tribe) => tribe.members.length === Math.min(...sizes))!
    state.capture = {
      donorId: donor.id,
      recipientId: recipient.id,
      captainId: recipient.captainId!,
    }
    state.phase = 'capture'
  } else state.phase = 'recap'
}

function transfer(state: TeamplayState, playerId: string, from: string, to: string): void {
  state.history.at(-1)!.transfers.push({ playerId, from, to })
  // No private pending proposals exist in this first-cycle action pool. Personal
  // relationship/alliance records survive transfers; every action rechecks tribe.
}

function capture(state: TeamplayState, playerId: string): void {
  const pending = state.capture!
  const donor = state.tribes.find((tribe) => tribe.id === pending.donorId)!
  const recipient = state.tribes.find((tribe) => tribe.id === pending.recipientId)!
  if (!donor.members.includes(playerId)) throw new Error('Choose a current donor tribe member')
  donor.members = donor.members.filter((id) => id !== playerId)
  recipient.members.push(playerId)
  if (donor.captainId === playerId)
    donor.captainId = state.individualOrder.find((id) => donor.members.includes(id))!
  transfer(state, playerId, donor.id, recipient.id)
  state.capture = null
  state.phase = 'recap'
}

export function draftTribe(state: TeamplayState) {
  if (!state.merge) return null
  const merge = state.merge
  for (let offset = 0; offset < 2; offset++) {
    const tribe = state.tribes.find((entry) => entry.id === merge.order[(merge.turn + offset) % 2])!
    if (tribe.members.length < 4) return tribe
  }
  return null
}

function draft(state: TeamplayState, playerId: string): void {
  const merge = state.merge!
  const tribe = draftTribe(state)
  if (!tribe || !merge.pool.includes(playerId)) throw new Error('Choose a remaining recruit')
  merge.pool = merge.pool.filter((id) => id !== playerId)
  tribe.members.push(playerId)
  transfer(state, playerId, merge.retiredId, tribe.id)
  merge.turn = (merge.order.indexOf(tribe.id) + 1) % 2
}

function finishForcedDrafts(state: TeamplayState): void {
  const merge = state.merge!
  if (state.tribes.filter((tribe) => tribe.members.length < 4).length === 1) {
    while (merge.pool.length) draft(state, merge.pool[0])
  }
  if (!merge.pool.length) {
    state.merge = null
    state.phase = 'recap'
  }
}

function chooseAutomatic(state: TeamplayState): void {
  if (humanBallotRequired(state)) {
    state.ballots[state.humanId] = strategicChoice(
      state,
      state.humanId,
      tribeOf(state, state.humanId)!.members.filter((id) => id !== state.humanId)
    )
  } else if (state.phase === 'nominationTies') {
    const cutoff = state.cutoffs[0]
    const pool = [...cutoff.candidates]
    const selected: string[] = []
    while (selected.length < cutoff.slots) {
      const id = strategicChoice(state, cutoff.captainId, pool)
      selected.push(id)
      pool.splice(pool.indexOf(id), 1)
    }
    chooseCutoff(state, cutoff, selected)
    if (!state.cutoffs.length) revealNominees(state)
  } else if (state.phase === 'capture') {
    capture(
      state,
      strategicChoice(
        state,
        state.capture!.captainId,
        state.tribes.find((tribe) => tribe.id === state.capture!.donorId)!.members,
        true
      )
    )
  } else if (state.phase === 'merge') {
    const tribe = draftTribe(state)!
    draft(state, strategicChoice(state, state.merge!.captains[tribe.id], state.merge!.pool, true))
    finishForcedDrafts(state)
  } else throw new Error('No pending choice to delegate')
}

function progress(state: TeamplayState): void {
  if (state.stage === 'individual') return progressIndividual(state)
  switch (state.phase) {
    case 'opening':
      startCycle(state)
      break
    case 'teamResults':
      enterSocial(state, false)
      break
    case 'socialOne':
      resolveAiSocial(state)
      enterBallots(state)
      break
    case 'ballots':
      finishBallots(state)
      break
    case 'nominations':
      enterSocial(state, true)
      break
    case 'socialTwo':
      resolveAiSocial(state)
      state.phase = 'nomineeDuel'
      prepareAttempt(state, 'nominee')
      break
    case 'nomineeResult':
      state.phase = 'reserveDuel'
      prepareAttempt(state, 'reserve')
      break
    case 'reserveResult':
      maintain(state)
      break
    case 'recap':
      state.previousTeamOrder = state.teamResults.map((entry) => entry.tribeId)
      state.previousIndividualOrder = [...state.individualOrder]
      state.cycle += 1
      startCycle(state)
      break
    default:
      throw new Error('Complete the pending competition or choice before continuing')
  }
}

function execute(state: TeamplayState, action: TeamplayAction, eventId: string): void {
  if (action.type === 'individual_choice') return chooseIndividual(state, action.selectedIds)
  if (action.type === 'skip_to_defence') {
    if (state.reserveId !== state.humanId || state.phase === 'reserveDuel')
      throw new Error('No AI-only interval before your defence')
    for (let count = 0; count < 100; count++) {
      if (['reserveDuel', 'fusion'].includes(state.phase)) return
      if (['teamCompetition', 'nomineeDuel'].includes(state.phase)) completeAttempt(state)
      else if (['nominationTies', 'capture', 'merge'].includes(state.phase)) chooseAutomatic(state)
      else progress(state)
    }
    throw new Error('Could not reach the next defence; restore the last checkpoint')
  }
  if (action.type === 'continue') return progress(state)
  if (action.type === 'social') {
    if (action.actorId !== state.humanId)
      throw new Error('Only your own social actions may be submitted')
    return performSocial(state, action.actorId, action.actionId, action.targetId, eventId)
  }
  if (action.type === 'vote') {
    const tribe = tribeOf(state, state.humanId)
    if (
      action.voterId !== state.humanId ||
      !humanBallotRequired(state) ||
      !tribe?.members.includes(action.targetId) ||
      action.targetId === action.voterId
    )
      throw new Error('Invalid secret ballot')
    state.ballots[action.voterId] = action.targetId
    return
  }
  if (action.type === 'cutoff') {
    const cutoff = state.cutoffs.find((entry) => entry.tribeId === action.tribeId)
    if (state.phase !== 'nominationTies' || !cutoff || cutoff.captainId !== state.humanId)
      throw new Error('No captain choice available')
    chooseCutoff(state, cutoff, action.selectedIds)
    if (!state.cutoffs.length) revealNominees(state)
    return
  }
  if (action.type === 'capture') {
    if (state.phase !== 'capture' || state.capture?.captainId !== state.humanId)
      throw new Error('Only the recipient captain may choose')
    return capture(state, action.playerId)
  }
  if (action.type === 'draft') {
    const tribe = draftTribe(state)
    if (state.phase !== 'merge' || !tribe || state.merge?.captains[tribe.id] !== state.humanId)
      throw new Error('Wait for the current drafting captain')
    draft(state, action.playerId)
    finishForcedDrafts(state)
    return
  }
  if (action.type === 'auto_choice')
    return state.endgame ? chooseIndividual(state, undefined, true) : chooseAutomatic(state)
  if (
    !competitionForStep(state) &&
    !['teamCompetition', 'nomineeDuel', 'reserveDuel'].includes(state.phase)
  )
    throw new Error('No competition is pending')
  const attempt = currentAttempt(state)!
  if (action.type === 'start_attempt') {
    if (attempt.status === 'complete' || !attempt.participants.includes(state.humanId))
      throw new Error('No human attempt available')
    attempt.status = 'running'
    return
  }
  if (action.type === 'finish_attempt') {
    if (attempt.id !== action.attemptId) throw new Error('Stale competition result')
    return completeAttempt(state, action.score)
  }
  if (action.type === 'delegate_attempt') {
    if (!attempt.participants.includes(state.humanId))
      throw new Error('No human performance to delegate')
    return completeAttempt(state, simulatedScore(state, attempt, state.humanId), true)
  }
  if (action.type === 'resolve_attempt') {
    if (attempt.participants.includes(state.humanId))
      throw new Error('Your performance is still required')
    return completeAttempt(state)
  }
}

/** Pure command boundary. Expected revision rejects queued double taps; receipts
 * make replaying the exact same command a harmless acknowledgement. */
export function applyTeamplayCommand(
  state: TeamplayState,
  command: TeamplayCommand
): TeamplayState {
  validateTeamplay(state)
  if (state.receipts.includes(command.id)) return state
  if (!command.id || command.expectedRevision !== state.revision)
    throw new Error('This decision is stale; reload the saved state')
  const next = structuredClone(state)
  execute(next, command.action, command.id)
  next.receipts.push(command.id)
  next.revision += 1
  validateTeamplay(next)
  return next
}
