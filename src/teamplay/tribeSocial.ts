import {
  advanceAllianceRequests,
  allianceRequestDecisionActors,
  canSeeAllianceRequest,
  isPendingAllianceRequest,
  manageAlliance,
  type AllianceManagementContext,
} from '../social/reality/allianceManagement'
import { allianceKind, getCurrentPact, isCurrentAlliance } from '../social/reality/allianceIdentity'
import { holdRealityAllianceStrategyMeeting } from '../social/reality/relationshipForms'
import type { RealityAllianceRequest } from '../social/reality/types'
import { nominationPlanId, socialCohort, socialTargets, spendSocialAction } from './social'
import type { TeamplayState, TribeSocialDecision } from './types'

const PACT_ACTION = 'proposeAlliance'
const MEETING_ACTION = 'consult_alliance'

function allianceClock(state: TeamplayState) {
  return {
    day:
      state.phase === 'finalFive'
        ? 12
        : state.phase === 'finalFour'
          ? 13
          : state.stage === 'individual'
            ? 12
            : state.cycle,
    phase:
      state.endgame?.step === 'social' || state.phase === 'socialOne'
        ? 'social_1'
        : state.phase === 'socialTwo'
          ? 'social_2'
          : 'eviction_results',
  }
}

function allianceContext(state: TeamplayState, actorId?: string): AllianceManagementContext {
  return {
    at: allianceClock(state),
    activeActorIds:
      state.stage === 'individual'
        ? state.individualIds
        : state.tribes.flatMap((tribe) => tribe.members),
    humanActorIds: [state.humanId],
    atRiskActorIds: state.phase === 'socialTwo' ? state.nominees : [],
    displayNames: Object.fromEntries(state.contestants.map(({ id, name }) => [id, name])),
    viewerActorId: state.humanId,
    seed: state.seed,
    ...(actorId ? { departureNoticeActorIds: socialCohort(state, actorId) } : {}),
  }
}

export function isLocalAllianceRequest(
  state: TeamplayState,
  request: RealityAllianceRequest
): boolean {
  const cohort = socialCohort(state, request.proposerId)
  return (
    cohort.length > 0 &&
    [
      ...request.memberIds,
      ...request.electorateIds,
      ...request.officerIds,
      ...(request.candidateId ? [request.candidateId] : []),
    ].every((id) => cohort.includes(id))
  )
}

/** Expiry is housekeeping. Nobody receives a new conversation at the old address. */
export function expireSeparatedRequests(state: TeamplayState): void {
  for (const request of Object.values(state.reality.allianceManagement.requests)) {
    if (!isPendingAllianceRequest(request) || isLocalAllianceRequest(state, request)) continue
    request.status = 'INVALIDATED'
    request.settledAt = allianceClock(state)
    request.reason = 'The roster changed before everyone could answer.'
  }
}

export function teamplayAlliances(state: TeamplayState, actorId: string) {
  const cohort = socialCohort(state, actorId)
  return Object.values(state.reality.alliances)
    .filter((alliance) => isCurrentAlliance(alliance) && alliance.memberIds.includes(actorId))
    .map((alliance) => {
      const local = alliance.memberIds.filter((id) => cohort.includes(id))
      return { alliance, local, separated: local.length !== alliance.memberIds.length }
    })
}

export function teamplayAllianceRequests(state: TeamplayState, actorId: string) {
  return Object.values(state.reality.allianceManagement.requests)
    .filter((request) => canSeeAllianceRequest(request, actorId))
    .reverse()
}

function proposePact(state: TeamplayState, actorId: string, targetId: string, eventId: string) {
  const result = manageAlliance(
    state.reality,
    {
      type: 'PROPOSE',
      kind: 'PACT',
      actorId,
      candidateId: targetId,
      commandId: eventId,
    },
    allianceContext(state)
  )
  if (result.status !== 'APPLIED') return result
  spendSocialAction(state, actorId, PACT_ACTION, 1, eventId)
  return result
}

export function actTribeSocial(
  state: TeamplayState,
  decision: TribeSocialDecision,
  eventId: string
): void {
  const actorId = state.humanId
  const targets = socialTargets(state, actorId)
  if (!targets.length) throw new Error('Pacts and alliances require an open social window')
  const allLocal = (ids: string[]) =>
    new Set(ids).size === ids.length && ids.every((id) => targets.includes(id))
  expireSeparatedRequests(state)
  const context = allianceContext(state, actorId)
  if (decision.kind === 'meet') {
    if (state.phase === 'socialTwo') throw new Error('Nominations have already been locked')
    const record = teamplayAlliances(state, actorId).find(
      ({ alliance }) => alliance.id === decision.allianceId
    )
    if (!record || allianceKind(record.alliance) !== 'GROUP' || record.local.length < 2)
      throw new Error('A meeting needs at least two current local group members')
    if (
      !targets.includes(decision.targetId) ||
      record.alliance.memberIds.includes(decision.targetId)
    )
      throw new Error('Choose an eligible local target outside the alliance')
    spendSocialAction(state, actorId, MEETING_ACTION, 1, eventId)
    holdRealityAllianceStrategyMeeting(state.reality, {
      allianceId: record.alliance.id,
      callerId: actorId,
      attendeeIds: record.local,
      targetIds: [decision.targetId],
      planIds: [nominationPlanId(state, actorId, decision.targetId)],
      agenda: 'tribe nomination',
      at: context.at,
      sourceEventId: eventId,
      excusedAbsentIds: record.alliance.memberIds.filter((id) => !record.local.includes(id)),
      keepSharedTargets: record.separated,
    })
    return
  }
  let result
  switch (decision.kind) {
    case 'pact':
      if (!allLocal([decision.targetId])) throw new Error('Choose a current local contestant')
      result = proposePact(state, actorId, decision.targetId, eventId)
      break
    case 'found':
      if (decision.memberIds.length < 2 || !allLocal(decision.memberIds))
        throw new Error('A new alliance needs at least two other current local contestants')
      result = manageAlliance(
        state.reality,
        {
          type: 'PROPOSE',
          kind: 'FOUND',
          actorId,
          memberIds: decision.memberIds,
          commandId: eventId,
        },
        context
      )
      break
    case 'respond':
    case 'withdraw': {
      const request = state.reality.allianceManagement.requests[decision.requestId]
      if (
        !request ||
        !canSeeAllianceRequest(request, actorId) ||
        !isPendingAllianceRequest(request) ||
        !isLocalAllianceRequest(state, request)
      )
        throw new Error('This request is no longer available')
      result = manageAlliance(
        state.reality,
        decision.kind === 'respond'
          ? {
              type: 'RESPOND',
              actorId,
              requestId: decision.requestId,
              accept: decision.accept,
              commandId: eventId,
            }
          : { type: 'WITHDRAW', actorId, requestId: decision.requestId, commandId: eventId },
        context
      )
      break
    }
    case 'leave':
      result = manageAlliance(
        state.reality,
        { type: 'LEAVE', actorId, allianceId: decision.allianceId, commandId: eventId },
        context
      )
      break
  }
  if (result.status !== 'APPLIED') throw new Error(result.reason)
}

export function openTribeSocial(state: TeamplayState) {
  expireSeparatedRequests(state)
  advanceAllianceRequests(state.reality, allianceContext(state))
  // Give each tribe a chance to formalize a strong existing bond. Source
  // consent still determines whether either contestant accepts the offer.
  for (const tribe of state.tribes) {
    for (const actorId of tribe.members) {
      if (
        actorId === state.humanId ||
        state.contestants.find((player) => player.id === actorId)!.bank.energy < 2
      )
        continue
      const requests = Object.values(state.reality.allianceManagement.requests)
      const target = socialTargets(state, actorId)
        .filter((id) => {
          const edge = state.reality.relationships[actorId]?.[id]
          return (
            (edge?.trust ?? 0) >= 26 &&
            (edge?.familiarity ?? 0) >= 16 &&
            !getCurrentPact(state.reality, actorId, id) &&
            !requests.some(
              (r) =>
                r.kind === 'PACT' &&
                r.createdAt.day >= state.cycle - 1 &&
                r.memberIds.includes(actorId) &&
                r.memberIds.includes(id)
            )
          )
        })
        .sort(
          (a, b) =>
            state.reality.relationships[actorId][b].trust -
            state.reality.relationships[actorId][a].trust
        )[0]
      if (!target) continue
      if (
        proposePact(
          state,
          actorId,
          target,
          `${state.id}:${state.cycle}:${state.phase}:pact:${actorId}`
        ).status === 'APPLIED'
      )
        break
    }
  }
}

export function canAnswerTeamplayRequest(request: RealityAllianceRequest, actorId: string) {
  return allianceRequestDecisionActors(request).includes(actorId)
}
