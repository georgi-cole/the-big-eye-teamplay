import { assignAiGameIdentities, type AiGameIdentity } from '../ai/aiGameIdentity'
import { decideCompetitionIntent, type CompetitionIntent } from '../social/intelligenceSystem'
import { getCurrentPact } from '../social/reality/allianceIdentity'
import { addRealityFact, learnRealityFact } from '../social/reality/knowledge'
import { applyRealityRelationshipChange } from '../social/reality/relationships'
import type { Attempt, TeamplayState } from './types'

export function teamCompetitionIntents(
  state: TeamplayState,
  attempt: Attempt
): Record<string, CompetitionIntent> {
  if (attempt.kind !== 'team' || !Object.keys(state.reality.alliances).length) return {}
  const moved = new Set(
    state.history.flatMap((cycle) => cycle.transfers.map((move) => move.playerId))
  )
  if (!moved.size) return {}
  const cast = state.contestants.map(({ id, isHuman }) => ({
    id,
    isUser: isHuman,
    aiGameIdentity: undefined as AiGameIdentity | undefined,
  }))
  const identities = new Map(
    assignAiGameIdentities(cast, state.seed, 'classic').map(({ id, aiGameIdentity }) => [
      id,
      aiGameIdentity,
    ])
  )
  const intents: Record<string, CompetitionIntent> = {}
  for (const actorId of attempt.participants) {
    if (!moved.has(actorId) || actorId === state.humanId) continue
    const cohort = state.tribes.find((tribe) => tribe.members.includes(actorId))!.members
    let remoteLoyalty = 0
    let localLoyalty = 0
    for (const id of attempt.participants) {
      if (id === actorId) continue
      const pact = getCurrentPact(state.reality, actorId, id)
      if (!pact || pact.status === 'FRACTURED') continue
      const loyalty =
        (pact.memberCommitment[actorId] ?? 0.5) * 100 +
        (state.reality.relationships[actorId]?.[id]?.loyalty ?? 0)
      if (cohort.includes(id)) localLoyalty = Math.max(localLoyalty, loyalty)
      else remoteLoyalty = Math.max(remoteLoyalty, loyalty)
    }
    if (remoteLoyalty <= localLoyalty) continue
    const intent = decideCompetitionIntent(attempt.seed, actorId, identities.get(actorId), {
      mode: 'classic',
      day: state.cycle,
      phase: 'teamCompetition',
      prizeType: 'LOH',
    })
    if (intent !== 'compete') intents[actorId] = intent
  }
  return intents
}

const PERFORMANCE_FACT = 'COMPETITION_THROW_SUSPICION'

export function recordTribePerformanceReads(state: TeamplayState, attempt: Attempt) {
  if (state.cycle < 3 || attempt.kind !== 'team') return
  for (const actorId of attempt.participants) {
    const observation = state.competitionState[actorId]
    const suspicion = observation?.sandbagSuspicion ?? 0
    if (suspicion < 15 || (observation?.recentBottomStreak ?? 0) < 3) continue
    const id = `fact:teamplay:performance-pattern:${actorId}`
    if (state.reality.facts[id]) continue
    const witnesses = state.tribes
      .find((tribe) => tribe.members.includes(actorId))!
      .members.filter((id) => id !== actorId)
    const at = { day: state.cycle, phase: 'loh_results' }
    addRealityFact(state.reality, {
      ...at,
      id,
      propositionType: PERFORMANCE_FACT,
      subjectIds: [actorId],
      value: Math.round(suspicion),
      visibility: 'GROUP_VISIBLE',
      participantIds: [],
      witnessIds: witnesses,
      viewerVisible: false,
      publicVisible: false,
      juryVisible: false,
      sourceEventId: attempt.id,
    })
    const confidence = Math.min(0.82, 0.58 + suspicion / 180)
    for (const witness of witnesses) {
      learnRealityFact(state.reality, {
        ownerId: witness,
        factId: id,
        memory: {
          ...at,
          id: `memory:${witness}:${id}`,
          ownerId: witness,
          eventId: attempt.id,
          participantIds: [actorId, witness],
          sourceType: 'INFERRED',
          sourceChain: [],
          confidence,
          importance: 0.6,
          surprise: 0.3,
          emotionalValence: -0.2,
          emotionalIntensity: 0.2,
          secrecy: 0.4,
          strategicRelevance: 0.65,
          visibility: 'GROUP_VISIBLE',
          tags: ['competition', 'inference'],
          relatedPromiseIds: [],
          relatedSecretIds: [],
          recallStrength: 0.8,
        },
      })
      applyRealityRelationshipChange(state.reality, {
        sourceId: witness,
        targetId: actorId,
        eventId: attempt.id,
        ...at,
        deltas: { suspicion: 6, trust: -3 },
      })
    }
  }
}

export function teamplayObservedPatterns(
  state: TeamplayState,
  viewerId: string,
  targets: string[]
) {
  return Object.values(state.reality.beliefsByOwner[viewerId] ?? {})
    .filter((belief) => belief.propositionType === PERFORMANCE_FACT && belief.status === 'ACTIVE')
    .flatMap((belief) => belief.subjectIds.filter((id) => targets.includes(id)))
}
