import { describe, expect, it } from 'vitest'
import { getCurrentPact } from '../social/reality/allianceIdentity'
import { manageAlliance } from '../social/reality/allianceManagement'
import { createRealityAlliance } from '../social/reality/relationshipForms'
import { applyTeamplayCommand, createTeamplay, currentAttempt } from './engine'
import { createTeamplayPreview, delegatedPreviewAction } from './preview'
import { strategicChoice, tribeOf } from './social'
import { teamplayAlliances } from './tribeSocial'
import {
  recordTribePerformanceReads,
  teamCompetitionIntents,
  teamplayObservedPatterns,
} from './tribeStrategy'
import { simulatedScore } from './competition'
import type { TeamplayAction, TeamplayState, TribeSocialDecision } from './types'
import { validateTeamplay } from './validation'

const human = 'finn'
function advance(state: TeamplayState, action = delegatedPreviewAction(state)) {
  return applyTeamplayCommand(state, {
    id: `social-test:${state.revision}`,
    expectedRevision: state.revision,
    action,
  })
}
function act(state: TeamplayState, decision: TribeSocialDecision) {
  return advance(state, { type: 'tribe_social', decision } satisfies TeamplayAction)
}
function openWindow(seed = 42) {
  return advance(advance(advance(createTeamplay(seed, human, `local-${seed}`))))
}
function membersOf(state: TeamplayState, actorId = human) {
  return tribeOf(state, actorId)!.members.filter((id) => id !== actorId)
}
function commitment(state: TeamplayState, id: string, kind: 'PACT' | 'GROUP', memberIds: string[]) {
  return createRealityAlliance(state.reality, {
    id,
    kind,
    founderIds: memberIds,
    memberIds,
    purpose: 'Local cooperation',
    at: { day: state.cycle, phase: 'social_1' },
  })
}

describe('Teamplay pacts and alliances', () => {
  it('receives an AI pact offer locally, charges once and preserves consent through a reload', () => {
    let state = advance(advance(createTeamplay(42, human, 'incoming-offer')))
    const [ally] = membersOf(state)
    Object.assign(state.reality.relationships[ally][human], { trust: 70, familiarity: 45 })
    state = advance(state)
    const proposal = Object.values(state.reality.allianceManagement.requests).find(
      (request) => request.proposerId === ally
    )!
    expect(proposal.status).toBe('CONSENT')
    expect(proposal.memberIds).toEqual([ally, human])
    expect(getCurrentPact(state.reality, human, ally)).toBeUndefined()
    const loaded = JSON.parse(JSON.stringify(state)) as TeamplayState
    const choice = {
      id: 'accept-local-pact',
      expectedRevision: loaded.revision,
      action: {
        type: 'tribe_social',
        decision: { kind: 'respond', requestId: proposal.id, accept: true },
      } as const,
    }
    const accepted = applyTeamplayCommand(loaded, choice)
    expect(getCurrentPact(accepted.reality, human, ally)?.memberIds).toEqual([ally, human])
    expect(
      accepted.resources.filter(
        (entry) => entry.playerId === ally && entry.reason === 'cost:proposeAlliance'
      )
    ).toHaveLength(1)
    expect(applyTeamplayCommand(accepted, choice)).toBe(accepted)
  })

  it('forms a group by unanimous consent without converting a separate pact', () => {
    let accepted: TeamplayState | undefined
    let founders: string[] = []
    for (let seed = 1; seed <= 20 && !accepted; seed++) {
      const state = openWindow(seed)
      founders = membersOf(state).slice(0, 2)
      commitment(state, 'independent-pact', 'PACT', [human, founders[0]])
      for (const id of founders)
        for (const other of [human, ...founders].filter((id2) => id2 !== id))
          state.reality.relationships[id][other].trust = 100
      const result = act(state, { kind: 'found', memberIds: founders })
      if (teamplayAlliances(result, human).some(({ alliance }) => alliance.kind === 'GROUP'))
        accepted = result
    }
    expect(accepted).toBeDefined()
    expect(getCurrentPact(accepted!.reality, human, founders[0])?.id).toBe('independent-pact')
    const group = teamplayAlliances(accepted!, human).find(
      ({ alliance }) => alliance.kind === 'GROUP'
    )!.alliance
    expect(group.memberIds).toEqual([human, ...founders])
    expect(getCurrentPact(accepted!.reality, human, founders[1])).toBeUndefined()
  })

  it('rejects foreign pact partners, group founders and meeting targets while prioritizing protected pacts', () => {
    const state = openWindow()
    const [partner, pawn, ally] = membersOf(state)
    const outsider = state.tribes.find((tribe) => !tribe.members.includes(human))!.members[0]
    commitment(state, 'pact', 'PACT', [human, partner])
    commitment(state, 'group', 'GROUP', [human, pawn, ally])
    expect(() => act(state, { kind: 'pact', targetId: outsider })).toThrow('local contestant')
    expect(() => act(state, { kind: 'found', memberIds: [pawn, outsider] })).toThrow(
      'local contestants'
    )
    expect(() => act(state, { kind: 'meet', allianceId: 'group', targetId: outsider })).toThrow(
      'local target'
    )
    expect(strategicChoice(state, human, [partner, pawn])).toBe(pawn)
    expect(strategicChoice(state, human, [partner, pawn], true)).toBe(partner)
    expect(strategicChoice(state, human, [partner])).toBe(partner)
  })

  it('preserves a captured contestant’s pact and cancels the stranded request without delivering an event', async () => {
    const state = await createTeamplayPreview('capture')
    const { captainId, donorId, recipientId } = state.capture!
    const donor = state.tribes.find((tribe) => tribe.id === donorId)!
    const [moved, partner, waiting] = donor.members
    commitment(state, 'old-pact', 'PACT', [moved, partner])
    if (captainId !== human) commitment(state, 'recruit-pact', 'PACT', [moved, captainId])
    const input = manageAlliance(
      state.reality,
      { type: 'PROPOSE', kind: 'PACT', actorId: moved, candidateId: waiting },
      {
        at: { day: state.cycle, phase: 'social_2' },
        activeActorIds: donor.members,
        humanActorIds: donor.members,
        seed: state.seed,
      }
    )
    expect(state.reality.allianceManagement.requests[input.requestId!]?.status).toBe('CONSENT')
    const beforeEvents = state.reality.events.length
    const next = advance(
      state,
      captainId === human ? { type: 'capture', playerId: moved } : { type: 'auto_choice' }
    )
    expect(tribeOf(next, moved)?.id).toBe(recipientId)
    expect(
      teamplayAlliances(next, moved).find(({ alliance }) => alliance.id === 'old-pact')?.separated
    ).toBe(true)
    expect(next.reality.relationships).toEqual(state.reality.relationships)
    expect(next.reality.events).toHaveLength(beforeEvents)
    expect(next.reality.allianceManagement.requests[input.requestId!]?.status).toBe('INVALIDATED')
    expect(next.resources).toEqual(state.resources)
    validateTeamplay(next)
  }, 20000)

  it('keeps split alliance meetings and departure notices local', () => {
    let state = openWindow()
    const [ally, target] = membersOf(state)
    const remote = state.tribes.find((tribe) => !tribe.members.includes(human))!.members[0]
    const group = commitment(state, 'split-group', 'GROUP', [human, ally, remote])
    group.memberPlanBeliefs[remote] = ['previous-plan']
    group.currentTargetIds = [ally]
    commitment(state, 'dormant-pact', 'PACT', [human, remote])
    const priorCommitment = group.memberCommitment[remote]
    state = act(state, { kind: 'meet', allianceId: group.id, targetId: target })
    const latest = state.reality.alliances[group.id]
    expect(latest.memberPlanBeliefs[remote]).toEqual(['previous-plan'])
    expect(latest.memberCommitment[remote]).toBe(priorCommitment)
    expect(latest.currentTargetIds).toEqual([ally])
    expect(state.reality.events.at(-1)!.participantIds).toEqual([human, ally])
    const beliefs = structuredClone(state.reality.relationships[remote])
    state = act(state, { kind: 'leave', allianceId: 'dormant-pact' })
    expect(state.reality.events.at(-1)!.participantIds).toEqual([human])
    expect(state.reality.alliances['dormant-pact'].status).toBe('DISSOLVED')
    state = act(state, { kind: 'leave', allianceId: group.id })
    expect(state.reality.events.at(-1)!.participantIds).not.toContain(remote)
    expect(state.reality.relationships[remote]).toEqual(beliefs)
    expect(state.reality.alliances[group.id].memberIds).toEqual([ally, remote])
  })

  it('freezes loyalty-driven competitive intent before the race, and leaves teammates’ scores alone', async () => {
    let state = await createTeamplayPreview('capture')
    const donor = state.tribes.find(({ id }) => id === state.capture!.donorId)!
    const actor = donor.members.find((id) => id !== human)!
    const other = donor.members.find((id) => id !== actor)!
    const captain = state.capture!.captainId
    if (captain !== human) commitment(state, 'recruit-pact', 'PACT', [actor, captain])
    state = advance(
      state,
      captain === human ? { type: 'capture', playerId: actor } : { type: 'auto_choice' }
    )
    expect(state.history.at(-1)?.transfers[0]?.playerId).toBe(actor)
    if (captain !== human) {
      // This fixture's recruit pact makes the transfer deterministic. The older
      // pact below is the only competing loyalty for the next race.
      state.reality.alliances['recruit-pact'].status = 'DISSOLVED'
    }
    commitment(state, 'old-pact', 'PACT', [actor, other])
    const unplayed = advance(state)
    const attempt = currentAttempt(unplayed)!
    const outcomes = new Map<string, number>()
    for (let seed = 1; seed <= 1000 && outcomes.size < 2; seed++) {
      const intent = teamCompetitionIntents(unplayed, { ...attempt, seed })[actor] ?? 'compete'
      if (intent !== 'conserve') outcomes.set(intent, seed)
    }
    expect(outcomes.has('compete')).toBe(true)
    expect(outcomes.has('throw')).toBe(true)
    state.plan[state.cycle].team.seed = outcomes.get('throw')!
    const prepared = advance(state)
    const fixed = currentAttempt(prepared)!
    expect(fixed.aiIntents).toEqual({ [actor]: 'throw' })
    expect(fixed.scores[actor]).toBeLessThan(simulatedScore(state, fixed, actor))
    for (const teammate of fixed.participants.filter((id) => id !== human && id !== actor))
      expect(fixed.scores[teammate]).toBe(simulatedScore(state, fixed, teammate))
    expect(currentAttempt(JSON.parse(JSON.stringify(prepared)))?.scores).toEqual(fixed.scores)
  }, 20000)

  it('only informs local observers after repeated weak performances', () => {
    const state = advance(createTeamplay(42, human, 'evidence'))
    state.cycle = 5
    const [ally] = membersOf(state)
    const remote = state.tribes.find(({ members }) => !members.includes(human))!.members[0]
    state.competitionState[ally] = {
      form: 0,
      confidence: 0,
      fatigue: 0,
      sandbagSuspicion: 30,
      recentBottomStreak: 1,
    }
    const attempt = currentAttempt(state)!
    recordTribePerformanceReads(state, attempt)
    expect(teamplayObservedPatterns(state, human, [ally])).toEqual([])
    state.competitionState[ally].recentBottomStreak = 3
    recordTribePerformanceReads(state, attempt)
    expect(teamplayObservedPatterns(state, human, [ally])).toEqual([ally])
    expect(teamplayObservedPatterns(state, remote, [ally])).toEqual([])
    const suspicion = state.reality.relationships[human][ally].suspicion
    recordTribePerformanceReads(state, attempt)
    expect(state.reality.relationships[human][ally].suspicion).toBe(suspicion)
  })
})
