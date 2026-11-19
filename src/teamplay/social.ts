import { SOCIAL_ACTIONS } from '../social/socialActions'
import { normalizeActionCosts } from '../social/smExecNormalize'
import { chooseActionFor, chooseTargetsFor, computeOutcomeDelta } from '../social/SocialPolicy'
import { computeRepeatedPositiveDelta } from '../social/SocialManeuvers'
import {
  applyLegacyRelationshipUpdateToReality,
  projectRealityAffinity,
} from '../social/reality/relationships'
import { scoreRealityNominationCandidate } from '../social/reality/ceremonies'
import { getRealityProtectionAlliances } from '../social/reality/relationshipFacts'
import { allianceKind } from '../social/reality/allianceIdentity'
import { mulberry32 } from '../store/rng'
import { seedFor } from './competition'
import type { Bank, TeamplayState } from './types'

// Deliberately small first-cycle pool. Unsupported proposal/mission/LOH actions
// never reach the Classic dispatch pipeline from this controller.
export const TEAMPLAY_SOCIAL_ACTIONS = SOCIAL_ACTIONS.filter((action) =>
  ['compliment', 'reassure', 'apologize', 'whisper', 'observe'].includes(action.id)
)

export function activeIds(state: TeamplayState): string[] {
  return state.stage === 'individual'
    ? [...state.individualIds]
    : [...state.tribes.flatMap((tribe) => tribe.members), ...(state.merge?.pool ?? [])]
}

export function tribeOf(state: TeamplayState, playerId: string) {
  return state.tribes.find((tribe) => tribe.members.includes(playerId))
}

export function socialTargets(state: TeamplayState, actorId: string): string[] {
  if (state.endgame?.step === 'social' && state.individualIds.includes(actorId))
    return state.individualIds.filter((id) => id !== actorId)
  if (!['socialOne', 'socialTwo'].includes(state.phase)) return []
  return (tribeOf(state, actorId)?.members ?? []).filter((id) => id !== actorId)
}

export function resourceChange(
  state: TeamplayState,
  playerId: string,
  reason: string,
  requested: Partial<Bank>,
  eventId: string
): void {
  const id = `${eventId}:${playerId}`
  if (state.resources.some((entry) => entry.id === id)) return
  const player = state.contestants.find((entry) => entry.id === playerId)!
  const before = { ...player.bank }
  const change: Bank = { energy: 0, influence: 0, info: 0, ...requested }
  for (const key of ['energy', 'influence', 'info'] as const) {
    const cap = key === 'energy' ? 20 : 10000
    const current = before[key]
    player.bank[key] =
      change[key] < 0
        ? Math.max(0, current + change[key])
        : current >= cap
          ? current
          : Math.min(cap, current + change[key])
  }
  const after = { ...player.bank }
  state.resources.push({
    id,
    playerId,
    reason,
    before,
    requested: change,
    credited: {
      energy: after.energy - before.energy,
      influence: after.influence - before.influence,
      info: after.info - before.info,
    },
    after,
  })
}

export function performSocial(
  state: TeamplayState,
  actorId: string,
  actionId: string,
  targetId: string | undefined,
  eventId: string
): void {
  const targets = socialTargets(state, actorId)
  if (!targets.length)
    throw new Error('Social actions require an active contestant in an open social window')
  const action = TEAMPLAY_SOCIAL_ACTIONS.find((entry) => entry.id === actionId)
  if (!action) throw new Error('This social action is not enabled for Teamplay')
  if (
    action.targetMode === 'none' ? targetId !== undefined : !targetId || !targets.includes(targetId)
  )
    throw new Error(
      state.stage === 'individual' ? 'Choose a remaining contender' : 'Choose a current teammate'
    )
  const cost = normalizeActionCosts(action, targetId ? 1 : 0)
  const player = state.contestants.find((entry) => entry.id === actorId)!
  if (Object.entries(cost).some(([key, value]) => player.bank[key as keyof Bank] < value))
    throw new Error('Insufficient resources')
  resourceChange(
    state,
    actorId,
    `cost:${actionId}`,
    { energy: -cost.energy, influence: -cost.influence, info: -cost.info },
    eventId
  )
  if (state.phase === 'socialOne')
    state.socialOneSpent[actorId] = (state.socialOneSpent[actorId] ?? 0) + cost.energy
  const repeats = state.socialActions.filter(
    (entry) =>
      entry.cycle === state.cycle &&
      entry.phase === state.phase &&
      entry.actorId === actorId &&
      entry.targetId === (targetId ?? null) &&
      entry.actionId === actionId
  ).length
  const random = mulberry32(seedFor(state.seed, eventId))
  // Use the source repetition/backfire policy; ordinary intel outcomes follow
  // the same success default as SocialManeuvers. No new acceptance lottery.
  const result =
    action.kind === 'rapport'
      ? computeRepeatedPositiveDelta(repeats, random)
      : {
          delta: computeOutcomeDelta(actionId, actorId, targetId ?? actorId, 'success'),
          didBackfire: false,
        }
  if (targetId) {
    const day = state.phase === 'finalFive' ? 12 : state.phase === 'finalFour' ? 13 : state.cycle
    applyLegacyRelationshipUpdateToReality(
      state.reality,
      actorId,
      targetId,
      result.delta,
      [],
      day,
      state.phase
    )
    applyLegacyRelationshipUpdateToReality(
      state.reality,
      targetId,
      actorId,
      result.delta,
      [],
      day,
      state.phase
    )
  }
  const success = !result.didBackfire && (action.kind !== 'rapport' || result.delta > 0)
  resourceChange(
    state,
    actorId,
    `outcome:${actionId}`,
    action.kind === 'intel_gain'
      ? { influence: success ? 1 : -1, info: success ? 100 : 25 }
      : { influence: success ? 3 : result.didBackfire ? -3 : -1 },
    `${eventId}:outcome`
  )
  state.socialActions.push({
    id: eventId,
    cycle: state.cycle,
    phase: state.phase,
    actorId,
    targetId: targetId ?? null,
    actionId,
    delta: result.delta,
  })
}

export function resolveAiSocial(state: TeamplayState): void {
  for (const actorId of activeIds(state).filter((id) => id !== state.humanId)) {
    const random = mulberry32(
      seedFor(state.seed, `${state.cycle}:${state.phase}:${actorId}:budget`)
    )
    const budget = 1 + Math.floor(random() * 4)
    for (let index = 0; index < budget; index++) {
      const members =
        state.stage === 'individual' ? state.individualIds : tribeOf(state, actorId)!.members
      const relationships = Object.fromEntries(
        members.map((id) => [
          id,
          Object.fromEntries(
            members
              .filter((other) => other !== id)
              .map((other) => [
                other,
                {
                  affinity: projectRealityAffinity(state.reality.relationships[id]?.[other]),
                  tags: [],
                },
              ])
          ),
        ])
      )
      const context = {
        relationships,
        players: members.map((id) => ({ id, status: 'normal' })),
        week: state.cycle,
        seed: seedFor(state.seed, `${state.cycle}:${state.phase}:${actorId}:${index}`),
        availableActionIds: TEAMPLAY_SOCIAL_ACTIONS.map((entry) => entry.id),
      }
      const chosen = chooseActionFor(actorId, context)
      const action =
        TEAMPLAY_SOCIAL_ACTIONS.find((entry) => entry.id === chosen) ??
        TEAMPLAY_SOCIAL_ACTIONS.find((entry) => entry.id === 'observe')!
      const cost = normalizeActionCosts(action)
      const bank = state.contestants.find((entry) => entry.id === actorId)!.bank
      if (bank.energy < cost.energy || bank.influence < cost.influence || bank.info < cost.info)
        break
      const targetId =
        action.targetMode === 'none' ? undefined : chooseTargetsFor(actorId, action.id, context)[0]
      performSocial(
        state,
        actorId,
        action.id,
        targetId,
        `${state.id}:${state.cycle}:${state.phase}:ai:${actorId}:${index}`
      )
    }
  }
}

export function realityDecisionView(state: TeamplayState, actorId: string) {
  // The source scorer also consults a reciprocal reliability edge. Other
  // contestants' private feelings are not an observation available to this AI.
  // Give it only its own relationship row; missing reciprocal reads use the
  // source's neutral default rather than another tribe's private history.
  return {
    ...state.reality,
    relationships: { [actorId]: structuredClone(state.reality.relationships[actorId] ?? {}) },
    beliefsByOwner: { [actorId]: state.reality.beliefsByOwner[actorId] ?? {} },
  }
}

export function strategicChoice(
  state: TeamplayState,
  actorId: string,
  pool: string[],
  recruit = false
): string {
  if (!pool.length) throw new Error('Empty legal choice pool')
  const decisionView = realityDecisionView(state, actorId)
  const hasPact = (id: string) =>
    getRealityProtectionAlliances(state.reality, actorId, id).some(
      (alliance) => allianceKind(alliance) === 'PACT'
    )
  // Hard pact protection precedes the inherited strategic nomination score.
  const nonPact = pool.filter((id) => !hasPact(id))
  const eligible = recruit || !nonPact.length ? pool : nonPact
  return [...eligible].sort((a, b) => {
    const difference =
      scoreRealityNominationCandidate(decisionView, actorId, b) -
      scoreRealityNominationCandidate(decisionView, actorId, a)
    return (
      (recruit ? -difference : difference) ||
      state.contestants.find((player) => player.id === a)!.priority -
        state.contestants.find((player) => player.id === b)!.priority
    )
  })[0]
}
