import { describe, expect, it } from 'vitest'
import { tallyVotes } from '../utils/juryUtils'
import { applyTeamplayCommand, createTeamplay, currentAttempt } from './engine'
import { currentRound, finalNominees, individualDecision } from './endgameRules'
import { delegatedPreviewAction } from './preview'
import { socialTargets } from './social'
import type { TeamplayAction, TeamplayState } from './types'
import { validateTeamplay } from './validation'

function send(state: TeamplayState, action: TeamplayAction = delegatedPreviewAction(state)) {
  return applyTeamplayCommand(state, {
    id: `endgame:${state.revision}`,
    expectedRevision: state.revision,
    action,
  })
}

function reach(state: TeamplayState, predicate: (state: TeamplayState) => boolean) {
  for (let step = 0; step < 500; step++) {
    if (predicate(state)) return state
    state = JSON.parse(JSON.stringify(send(state))) as TeamplayState
  }
  throw new Error('The expected scene was not reached')
}

function season(seed: number, id = 'seed') {
  return createTeamplay(seed, 'finn', id)
}

describe('Teamplay Classic endgame', () => {
  it('continues an original fusion checkpoint with every qualifier, including the reserve, and preserves the banks and bonds', () => {
    const fused = reach(season(4), (state) => state.phase === 'fusion')
    expect(fused).not.toHaveProperty('endgame')
    expect(fused.jurors).toHaveLength(6)
    const individual = send(fused)
    expect(individual.contestants).toEqual(fused.contestants)
    expect(individual.competitionState).toEqual(fused.competitionState)
    expect(individual.reality.relationships).toEqual(fused.reality.relationships)
    expect(individual.reality.promises).toEqual(fused.reality.promises)
    expect(individual.history).toEqual(fused.history)
    expect(individual.resources).toEqual(fused.resources)
    expect(
      individual.reality.events.filter((entry) => entry.type === 'CEREMONY_POWER_WON')
    ).toHaveLength(33)
    expect(socialTargets(individual, 'finn')).toEqual(
      fused.individualIds.filter((id) => id !== 'finn')
    )
    expect(socialTargets(individual, fused.eliminated[0])).toEqual([])
    const loh = send(individual)
    expect(currentAttempt(loh)?.participants).toEqual(fused.individualIds)
    expect(currentAttempt(loh)?.participants).toContain(fused.history.at(-1)?.reserveId)
    expect(loh.tribes).toEqual([])
    expect(loh.currentAttemptId).not.toBe(fused.currentAttemptId)
  }, 20000)

  it('lets the human POS holder self-save and requires a legal replacement before anyone votes', () => {
    const safety = reach(season(4), (state) => state.endgame?.step === 'safety')
    const round = currentRound(safety)!
    expect(round.posId).toBe('finn')
    expect(round.initialNominees).toContain('finn')
    expect(() => send(safety, { type: 'continue' })).toThrow('Make your choice')
    expect(() => send(safety, { type: 'individual_choice', selectedIds: [round.lohId!] })).toThrow(
      'available contestants'
    )
    const replacing = send(safety, { type: 'individual_choice', selectedIds: ['finn'] })
    expect(replacing.endgame?.step).toBe('replace')
    expect(individualDecision(replacing)?.candidates).not.toContain('finn')
    expect(individualDecision(replacing)?.candidates).not.toContain(round.lohId)
    const ballots = send(replacing)
    expect(ballots.endgame?.step).toBe('ballots')
    expect(finalNominees(currentRound(ballots)!)).not.toContain('finn')
    expect(individualDecision(ballots)?.actorId).toBe('finn')
  }, 20000)

  it('gives a tied Final Five vote to the LOH and bars the outgoing LOH from the next LOH competition', () => {
    const tied = reach(season(5), (state) => state.endgame?.step === 'tie')
    const round = currentRound(tied)!
    expect(Object.values(tallyVotes(round.ballots))).toEqual([1, 1])
    expect(individualDecision(tied)?.actorId).toBe(round.lohId)
    const four = reach(tied, (state) => currentAttempt(state)?.kind === 'fourLoh')
    expect(currentAttempt(four)?.participants).toHaveLength(3)
    expect(currentAttempt(four)?.participants).not.toContain(round.lohId)
    expect(four.jurors).toHaveLength(7)
  }, 20000)

  it('uses the original block for a Final Four double holder and resolves only the POS holder’s vote', () => {
    const soleVote = reach(season(1), (state) => state.endgame?.step === 'soleVote')
    const round = currentRound(soleVote)!
    expect(round.posId).toBe(round.lohId)
    expect(individualDecision(soleVote)?.actorId).toBe(round.posId)
    expect([...(individualDecision(soleVote)?.candidates ?? [])].sort()).toEqual(
      [...round.initialNominees].sort()
    )
    const departed = send(soleVote)
    expect(currentRound(departed)?.ballots).toEqual({})
    expect(departed.individualIds).toHaveLength(3)
    expect(departed.jurors).toHaveLength(8)
  }, 20000)

  it('carries a human through the three distinct competition rosters and a saved Tribunal decision', () => {
    const one = reach(season(11, 'teamplay-preview'), (state) => state.endgame?.step === 'partOne')
    expect(currentAttempt(one)?.participants).toHaveLength(3)
    expect(currentAttempt(one)?.participants).toContain('finn')
    const two = reach(one, (state) => state.endgame?.step === 'partTwo')
    expect(currentAttempt(two)?.participants).toEqual(
      one.individualIds.filter((id) => id !== two.endgame!.partWinners[0])
    )
    const three = reach(two, (state) => state.endgame?.step === 'partThree')
    expect([...(currentAttempt(three)?.participants ?? [])].sort()).toEqual(
      [...three.endgame!.partWinners].sort()
    )
    const tribunal = reach(three, (state) => state.phase === 'tribunal')
    expect(tribunal.endgame?.thirdPlaceId).toBe('finn')
    expect(tribunal.jurors).toHaveLength(9)
    expect(tribunal.endgame?.votes).toEqual({})
    expect(() => send(tribunal, { type: 'continue' })).toThrow('Make your choice')
    const finalist = tribunal.individualIds[1]
    const voted = send(tribunal, { type: 'individual_choice', selectedIds: [finalist] })
    const restored = JSON.parse(JSON.stringify(voted)) as TeamplayState
    expect(individualDecision(restored)).toBeUndefined()
    const finished = send(restored)
    expect(finished.endgame?.votes.finn).toBe(finalist)
    expect(finished.reality.juryEvaluations).toHaveLength(16)
    const total = tallyVotes(finished.endgame!.votes)
    expect(Object.values(total).reduce((sum, score) => sum + score, 0)).toBe(9)
    expect(total[finished.endgame!.championId!]).toBeGreaterThanOrEqual(5)
    expect(new Set(finished.endgame?.placements).size).toBe(16)
    expect(finished.endgame?.placements[2]).toBe('finn')
    expect(finished.history).toHaveLength(11)
    const corrupted = structuredClone(finished)
    corrupted.endgame!.championId = finished.endgame!.placements[1]
    expect(() => validateTeamplay(corrupted)).toThrow('champion differs')
  }, 20000)

  it('lets a pre-Tribunal spectator watch without casting an additional vote', () => {
    const tribunal = reach(season(1), (state) => state.phase === 'tribunal')
    expect(tribunal.eliminated.slice(0, 5)).toContain('finn')
    expect(individualDecision(tribunal)).toBeUndefined()
    expect(() =>
      send(tribunal, { type: 'individual_choice', selectedIds: [tribunal.individualIds[0]] })
    ).toThrow('no pending choice')
    const finished = send(tribunal)
    expect(Object.keys(finished.endgame!.votes).sort()).toEqual([...tribunal.jurors].sort())
    expect(finished.reality.juryEvaluations).toHaveLength(18)
  }, 20000)
})
