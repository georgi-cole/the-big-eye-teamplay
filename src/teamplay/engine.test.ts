import { describe, expect, it } from 'vitest'
import { applyTeamplayCommand, createTeamplay, currentAttempt, humanBallotRequired } from './engine'
import { validateTeamplay } from './validation'
import { activeIds, socialTargets, strategicChoice } from './social'
import { simulatedScore } from './competition'
import type { TeamplayAction, TeamplayState } from './types'

export function step(state: TeamplayState, action: TeamplayAction): TeamplayState {
  return applyTeamplayCommand(state, {
    id: `${state.id}:command:${state.revision + 1}`,
    expectedRevision: state.revision,
    action,
  })
}

export function delegatedStep(state: TeamplayState): TeamplayState {
  if (['teamCompetition', 'nomineeDuel', 'reserveDuel'].includes(state.phase)) {
    return step(state, {
      type: currentAttempt(state)!.participants.includes(state.humanId)
        ? 'delegate_attempt'
        : 'resolve_attempt',
    })
  }
  if (humanBallotRequired(state) || ['nominationTies', 'capture', 'merge'].includes(state.phase))
    return step(state, { type: 'auto_choice' })
  return step(state, { type: 'continue' })
}

function reach(phase: string, seed = 42) {
  let state = createTeamplay(seed, 'finn', `test-${seed}`)
  for (let index = 0; index < 400 && state.phase !== phase; index++) state = delegatedStep(state)
  if (state.phase !== phase) throw new Error(`Never reached ${phase}`)
  return state
}

describe('Teamplay authoritative cycle', () => {
  it('persists an opening with 15 active, one AI reserve, zero banks and 33 fixed contexts', () => {
    const state = createTeamplay(42, 'finn', 'opening')
    expect(state.tribes.map((tribe) => tribe.members.length)).toEqual([5, 5, 5])
    expect(state.reserveId).not.toBe(state.humanId)
    expect(
      state.contestants.every((player) => Object.values(player.bank).every((value) => value === 0))
    ).toBe(true)
    expect(
      new Set(
        state.plan.flatMap((cycle) =>
          Object.values(cycle).flatMap((context) => [context.seed, context.replaySeed])
        )
      ).size
    ).toBe(66)
    expect(createTeamplay(42, 'finn', 'opening')).toEqual(state)
    validateTeamplay(JSON.parse(JSON.stringify(state)))
  })

  it('deduplicates receipts and rejects queued stale Continue actions', () => {
    const state = createTeamplay(1, 'finn', 'receipt')
    const command = { id: 'continue-1', expectedRevision: 0, action: { type: 'continue' as const } }
    const next = applyTeamplayCommand(state, command)
    expect(applyTeamplayCommand(next, command)).toBe(next)
    expect(() => applyTeamplayCommand(next, { ...command, id: 'second-tap' })).toThrow('stale')
    expect(state.phase).toBe('opening')
  })

  it('uses exact means and published priorities for team and captain ties', () => {
    let state = step(createTeamplay(4, 'finn', 'ranking'), { type: 'continue' })
    const attempt = currentAttempt(state)!
    for (const id of attempt.participants) attempt.scores[id] = 100
    state = step(state, { type: 'start_attempt' })
    state = step(state, { type: 'finish_attempt', attemptId: attempt.id, score: 100 })
    expect(state.teamResults.map((result) => result.tribeId)).toEqual(['ember', 'tide', 'iris'])
    for (const tribe of state.tribes)
      expect(tribe.captainId).toBe(
        tribe.members.reduce((a, b) =>
          state.contestants.find((player) => player.id === a)!.priority <
          state.contestants.find((player) => player.id === b)!.priority
            ? a
            : b
        )
      )
  })

  it('does not expose an opponent score as the human result without explicit delegation', () => {
    const state = step(createTeamplay(42, 'finn', 'performance'), { type: 'continue' })
    const attempt = currentAttempt(state)!
    expect(attempt.scores.finn).toBeUndefined()
    expect(() => step(state, { type: 'resolve_attempt' })).toThrow('performance')
    const next = step(state, { type: 'delegate_attempt' })
    expect(next.attempts[attempt.id].scores.finn).toBe(simulatedScore(state, attempt, 'finn'))
    expect(next.attempts[attempt.id].delegated).toBe(true)
  })

  it('enforces tribe-local actions, affordability, free Continue and one-time second wind', () => {
    let state = reach('socialOne')
    const human = state.humanId
    const own = socialTargets(state, human)
    const other = state.tribes.find((tribe) => !tribe.members.includes(human))!.members[0]
    expect(() =>
      step(state, { type: 'social', actorId: human, actionId: 'compliment', targetId: other })
    ).toThrow('teammate')
    for (let index = 0; index < 4; index++)
      state = step(state, {
        type: 'social',
        actorId: human,
        actionId: 'compliment',
        targetId: own[index],
      })
    expect(state.socialOneSpent[human]).toBe(4)
    while (state.phase !== 'socialTwo') state = delegatedStep(state)
    expect(
      state.resources.filter(
        (receipt) => receipt.playerId === human && receipt.reason === 'secondWind'
      )
    ).toHaveLength(1)
    expect(
      state.resources.some(
        (receipt) => receipt.playerId === state.reserveId && receipt.reason === 'socialOne'
      )
    ).toBe(false)
    expect(socialTargets({ ...state, phase: 'reserveDuel' }, human)).toEqual([])
  })

  it('waits for a legal human ballot and applies the captain double weight', () => {
    let state = reach('ballots', 43)
    if (!humanBallotRequired(state)) {
      // Force an otherwise legal test result to put the human tribe in danger.
      state = reach('teamResults', 43)
      const tribe = state.tribes.find((entry) => entry.members.includes(state.humanId))!
      state.teamResults = [
        ...state.teamResults.filter((entry) => entry.tribeId !== tribe.id),
        state.teamResults.find((entry) => entry.tribeId === tribe.id)!,
      ]
      state = step(step(state, { type: 'continue' }), { type: 'continue' })
    }
    expect(humanBallotRequired(state)).toBe(true)
    expect(() => step(state, { type: 'continue' })).toThrow('ballot')
    expect(() =>
      step(state, { type: 'vote', voterId: state.humanId, targetId: state.humanId })
    ).toThrow('Invalid')
    state = step(state, { type: 'auto_choice' })
    const ballots = { ...state.ballots }
    state = step(state, { type: 'continue' })
    for (const tribe of state.tribes.filter((entry) => entry.id !== state.teamResults[0].tribeId)) {
      for (const candidate of tribe.members)
        expect(state.totals[candidate]).toBe(
          tribe.members.reduce(
            (sum, actor) =>
              sum + (ballots[actor] === candidate ? (actor === tribe.captainId ? 2 : 1) : 0),
            0
          )
        )
    }
  })

  it('keeps nominee and reserve duel results independent and commits only the second departure', () => {
    let state = reach('nomineeDuel')
    const nomineeAttempt = currentAttempt(state)!
    while (state.phase === 'nomineeDuel') state = delegatedStep(state)
    expect(state.eliminated).toHaveLength(0)
    expect(state.phase).toBe('nomineeResult')
    const survivorBank = {
      ...state.contestants.find((player) => player.id === state.nomineeWinnerId)!.bank,
    }
    state = step(state, { type: 'continue' })
    expect(currentAttempt(state)!.id).not.toBe(nomineeAttempt.id)
    expect(currentAttempt(state)!.participants).toEqual([state.challengerId, state.reserveId])
    while (state.phase === 'reserveDuel') state = delegatedStep(state)
    expect(state.eliminated).toHaveLength(1)
    expect(activeIds(state)).toHaveLength(14)
    expect(state.contestants.find((player) => player.id === state.nomineeWinnerId)!.bank).toEqual(
      survivorBank
    )
    expect(state.resources.some((receipt) => /reserve|battleBack/i.test(receipt.reason))).toBe(
      false
    )
  })

  it('replays tied duels once, then uses the published season priority', () => {
    let state = reach('nomineeDuel')
    for (let replay = 0; replay < 2; replay++) {
      const attempt = currentAttempt(state)!
      for (const id of attempt.participants) attempt.scores[id] = 200
      expect(attempt.replay).toBe(replay)
      if (attempt.participants.includes(state.humanId)) {
        state = step(state, { type: 'start_attempt' })
        state = step(state, { type: 'finish_attempt', attemptId: attempt.id, score: 200 })
      } else state = step(state, { type: 'resolve_attempt' })
      if (replay === 0) expect(state.phase).toBe('nomineeDuel')
    }
    expect(state.phase).toBe('nomineeResult')
    expect(currentAttempt(state)!.priorityFallback).toBe(true)
    const nominees = state.nominees.map(
      (id) => state.contestants.find((player) => player.id === id)!
    )
    expect(state.nomineeWinnerId).toBe(nominees.sort((a, b) => a.priority - b.priority)[0].id)
  })

  it.each([1, 2, 3, 4, 11, 42, 97, 2026])(
    'completes all eleven tribe cycles with atomic merger/fusion and one exit each (seed %s)',
    (seed) => {
      let state = createTeamplay(seed, 'finn', `season-${seed}`)
      let sawMerger = false
      for (let index = 0; index < 500 && state.phase !== 'fusion'; index++) {
        const previous = state
        state = delegatedStep(state)
        // A serialized reload at every single decision must preserve the exact run.
        state = JSON.parse(JSON.stringify(state)) as TeamplayState
        validateTeamplay(state)
        expect(state.eliminated.length - previous.eliminated.length).toBeLessThanOrEqual(1)
        if (state.stage === 'twoTribes' && !sawMerger && state.phase === 'recap') {
          expect(state.tribes.map((tribe) => tribe.members.length)).toEqual([4, 4])
          sawMerger = true
        }
      }
      expect(sawMerger).toBe(true)
      expect(state.phase).toBe('fusion')
      expect(state.individualIds).toHaveLength(5)
      expect(state.eliminated).toHaveLength(11)
      expect(state.jurors).toHaveLength(6)
      expect(state.resources.some((receipt) => receipt.reason === 'battleBack')).toBe(false)
    },
    30000
  )

  it.each([true, false])(
    'supports both human reserve outcomes without an early game over (human wins: %s)',
    (wins) => {
      let fixture: TeamplayState | null = null
      for (let seed = 1; seed < 50 && !fixture; seed++) {
        const candidate = reach('nomineeDuel', seed)
        if (candidate.nominees.includes(candidate.humanId)) fixture = candidate
      }
      expect(fixture).not.toBeNull()
      let state = fixture!
      const nomineeAttempt = currentAttempt(state)!
      const opponent = nomineeAttempt.participants.find((id) => id !== state.humanId)!
      nomineeAttempt.scores[opponent] = 100
      state = step(state, { type: 'start_attempt' })
      state = step(state, { type: 'finish_attempt', attemptId: nomineeAttempt.id, score: 0 })
      expect(state.challengerId).toBe(state.humanId)
      expect(state.eliminated).toEqual([])
      state = step(state, { type: 'continue' })
      const reserveAttempt = currentAttempt(state)!
      reserveAttempt.scores[state.reserveId!] = 100
      const bank = { ...state.contestants.find((player) => player.id === state.humanId)!.bank }
      state = step(state, { type: 'start_attempt' })
      state = step(state, {
        type: 'finish_attempt',
        attemptId: reserveAttempt.id,
        score: wins ? 200 : 0,
      })
      if (wins) {
        expect(state.reserveId).toBe(state.humanId)
        state = step(state, { type: 'skip_to_defence' })
        expect(state.phase).toBe('reserveDuel')
        expect(state.cycle).toBe(2)
        expect(state.contestants.find((player) => player.id === state.humanId)!.bank).toEqual(bank)
        expect(socialTargets(state, state.humanId)).toEqual([])
      } else {
        expect(state.eliminated).toContain(state.humanId)
        expect(state.reserveId).not.toBe(state.humanId)
        expect(state.jurors).toEqual([])
      }
    }
  )

  it('cannot read another contestant’s private reciprocal relationship when deciding a nomination', () => {
    const state = createTeamplay(1, 'finn', 'privacy')
    const candidates = state.tribes
      .find((tribe) => tribe.members.includes(state.humanId))!
      .members.filter((id) => id !== state.humanId)
      .slice(0, 2)
    const first = strategicChoice(state, state.humanId, candidates)
    state.reality.relationships[candidates[0]][state.humanId].reliability = -100
    state.reality.relationships[candidates[1]][state.humanId].reliability = 100
    expect(strategicChoice(state, state.humanId, candidates)).toBe(first)
  })

  it('resolves all 1,024 legal five-player ballot patterns and every human captain cutoff choice', () => {
    let state = step(createTeamplay(42, 'finn', 'ballot-enumeration'), { type: 'continue' })
    const tribe = state.tribes.find((entry) => entry.members.includes(state.humanId))!
    const attempt = currentAttempt(state)!
    for (const id of attempt.participants) attempt.scores[id] = tribe.members.includes(id) ? 0 : 200
    state = step(state, { type: 'start_attempt' })
    state = step(state, { type: 'finish_attempt', attemptId: attempt.id, score: 500 })
    expect(state.tribes.find((entry) => entry.id === tribe.id)!.captainId).toBe(state.humanId)
    state = step(step(state, { type: 'continue' }), { type: 'continue' })
    for (let pattern = 0; pattern < 4 ** 5; pattern++) {
      const fixture = structuredClone(state)
      let rest = pattern
      for (const actor of tribe.members) {
        fixture.ballots[actor] = tribe.members.filter((id) => id !== actor)[rest % 4]
        rest = Math.floor(rest / 4)
      }
      const resolved = step(fixture, { type: 'continue' })
      expect(
        resolved.nominees.length + resolved.cutoffs.reduce((sum, entry) => sum + entry.slots, 0)
      ).toBe(2)
      expect(tribe.members.reduce((sum, id) => sum + resolved.totals[id], 0)).toBe(6)
      for (const cutoff of resolved.cutoffs)
        for (const selected of cutoff.candidates) {
          const complete = step(resolved, {
            type: 'cutoff',
            tribeId: cutoff.tribeId,
            selectedIds: [selected],
          })
          expect(complete.nominees).toHaveLength(2)
          expect(complete.totals[selected]).toBeGreaterThan(0)
        }
    }
  }, 30000)

  it('rejects corrupted roles, receipts, plans and rules instead of inventing repair contestants', () => {
    const state = createTeamplay(42, 'finn', 'corrupt')
    expect(() => validateTeamplay({ ...state, rulesVersion: '3.0' })).toThrow('unsupported')
    expect(() => validateTeamplay({ ...state, reserveId: state.humanId })).toThrow()
    expect(() => validateTeamplay({ ...state, receipts: ['duplicate', 'duplicate'] })).toThrow(
      'receipts'
    )
    expect(() => validateTeamplay({ ...state, plan: [] })).toThrow('plan')
    const corruptBank = structuredClone(state)
    corruptBank.contestants[0].bank.energy = 999
    expect(() => validateTeamplay(corruptBank)).toThrow('bank differs')
    const corruptResult = reach('nomineeResult')
    const result = currentAttempt(corruptResult)!
    result.winnerId = result.participants.find((id) => id !== result.winnerId)!
    expect(() => validateTeamplay(corruptResult)).toThrow('saved duel winner')
  })
})
