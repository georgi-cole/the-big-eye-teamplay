import { beforeEach, describe, expect, it, vi } from 'vitest'
const storage = vi.hoisted(() => ({
  data: new Map<string, string>(),
  before: new Map<string, string | undefined>(),
  flush: true,
}))
vi.mock('../store/durablePersistence', () => ({
  getDurableItem: (key: string) => storage.data.get(key) ?? null,
  setDurableItem: (key: string, value: string) => {
    if (!storage.before.has(key)) storage.before.set(key, storage.data.get(key))
    storage.data.set(key, value)
    return true
  },
  flushDurablePersistence: async () => {
    if (!storage.flush)
      for (const [key, old] of storage.before) {
        if (old === undefined) storage.data.delete(key)
        else storage.data.set(key, old)
      }
    storage.before.clear()
    return storage.flush
  },
}))
import { applyTeamplayCommand, createTeamplay, currentAttempt } from './engine'
import {
  exportTeamplaySave,
  listTeamplayArchives,
  loadTeamplay,
  readTeamplayArchive,
  saveTeamplay,
} from './persistence'
import { createTeamplayPreview, delegatedPreviewAction } from './preview'
import type { TeamplayAction, TeamplayState } from './types'

const scope = 'play:guest'
const key = 'the-big-eye-teamplay:tribe-season:v1:play%3Aguest'
beforeEach(() => {
  storage.data.clear()
  storage.before.clear()
  storage.flush = true
})

function command(state: TeamplayState, action = delegatedPreviewAction(state)) {
  return { id: `recovery:${state.revision}`, expectedRevision: state.revision, action }
}

function reachFixture(seed: number, predicate: (state: TeamplayState) => boolean) {
  let state = createTeamplay(seed, 'finn', `recovery-${seed}`)
  for (let step = 0; step < 240 && state.phase !== 'fusion'; step++) {
    if (predicate(state)) return state
    state = applyTeamplayCommand(state, command(state))
  }
  return null
}

async function advanceSaved(state: TeamplayState, action?: TeamplayAction): Promise<TeamplayState> {
  const current = (await loadTeamplay(scope)).state!
  expect(JSON.stringify(current)).toBe(JSON.stringify(state))
  const decision = command(current, action)
  const next = applyTeamplayCommand(current, decision)
  await saveTeamplay(scope, next, current)
  const reloaded = (await loadTeamplay(scope)).state!
  expect(applyTeamplayCommand(reloaded, decision)).toBe(reloaded)
  expect(reloaded.revision).toBe(current.revision + 1)
  return reloaded
}

describe('Teamplay durable saves', () => {
  it.each(['capture', 'merge'] as const)(
    'resumes a pending %s and commits each transfer just once',
    async (phase) => {
      let start: TeamplayState | null = null
      for (const seed of [7, 42, 1, 2, 3, 4, 5, 6, 8, 9])
        if ((start = reachFixture(seed, (state) => state.phase === phase))) break
      expect(start).not.toBeNull()
      await saveTeamplay(scope, start!, null)
      let state = start!
      while (state.phase === phase) state = await advanceSaved(state)
      expect(state.phase).toBe('recap')
      expect(state.eliminated).toEqual(start!.eliminated)
      const moved = state.history.at(-1)!.transfers
      expect(moved.length).toBeGreaterThan(0)
      expect(new Set(moved.map((entry) => entry.playerId)).size).toBe(moved.length)
      expect(JSON.stringify(state.resources)).toBe(JSON.stringify(start!.resources))
    },
    25000
  )

  it('recovers the captain’s pending tie and keeps a valid self-nomination locked', async () => {
    const start = createTeamplay(42, 'finn', 'captain-recovery')
    const run = (state: TeamplayState, action?: TeamplayAction) =>
      applyTeamplayCommand(state, command(state, action))
    let state = run(start)
    const attempt = currentAttempt(state)!
    const tribe = state.tribes.find(({ members }) => members.includes('finn'))!
    const [b, c, d, e] = tribe.members.filter((id) => id !== 'finn')
    for (const id of attempt.participants)
      if (id !== 'finn') attempt.scores[id] = tribe.members.includes(id) ? 0 : 200
    state = run(state, { type: 'start_attempt' })
    state = run(state, { type: 'finish_attempt', attemptId: attempt.id, score: 500 })
    state = run(run(state))
    state.ballots = { ...state.ballots, [b]: 'finn', [c]: 'finn', [d]: c, [e]: d }
    state = run(state, { type: 'vote', voterId: 'finn', targetId: b })
    await saveTeamplay(scope, state, null)
    const tie = await advanceSaved(state, { type: 'continue' })
    expect(tie.cutoffs[0]).toMatchObject({
      captainId: 'finn',
      slots: 1,
      candidates: expect.arrayContaining(['finn', b]),
    })
    const choice = await advanceSaved(tie, {
      type: 'cutoff',
      tribeId: tribe.id,
      selectedIds: ['finn'],
    })
    expect(choice.nominees).toContain('finn')
    expect(choice.cutoffs).toEqual([])
    expect(
      choice.resources.filter((entry) => entry.playerId === 'finn' && entry.reason === 'nomination')
    ).toHaveLength(1)
  })

  it('restarts the same human reserve attempt, then preserves consecutive defences and one permanent loss', async () => {
    let state: TeamplayState | null = null
    for (let seed = 1; seed <= 25 && !state; seed++)
      state = reachFixture(
        seed,
        (entry) => entry.phase === 'nomineeDuel' && entry.nominees.includes('finn')
      )
    expect(state).not.toBeNull()
    await saveTeamplay(scope, state!, null)
    const nominee = await advanceSaved(state!, { type: 'start_attempt' })
    const nomineeLoss = await advanceSaved(nominee, {
      type: 'finish_attempt',
      attemptId: currentAttempt(nominee)!.id,
      score: 0,
    })
    expect(nomineeLoss.challengerId).toBe('finn')
    let next = await advanceSaved(nomineeLoss)
    const bank = next.contestants.find((player) => player.id === 'finn')!.bank
    for (const score of [1000000, 1000000, 0]) {
      const frozen = currentAttempt(next)!
      next = await advanceSaved(next, { type: 'start_attempt' })
      expect(currentAttempt(next)).toEqual({ ...frozen, status: 'running' })
      next = await advanceSaved(next, { type: 'start_attempt' })
      expect(currentAttempt(next)).toEqual({ ...frozen, status: 'running' })
      const before = next.eliminated.length
      next = await advanceSaved(next, { type: 'finish_attempt', attemptId: frozen.id, score })
      expect(next.eliminated).toHaveLength(before + 1)
      expect(next.contestants.find((player) => player.id === 'finn')?.bank).toEqual(bank)
      if (!score) break
      expect(next.reserveId).toBe('finn')
      next = await advanceSaved(next, { type: 'skip_to_defence' })
      expect(currentAttempt(next)?.participants).toContain('finn')
    }
    expect(next.eliminated.filter((id) => id === 'finn')).toHaveLength(1)
    expect(next.reserveId).not.toBe('finn')
    expect(next.jurors).toEqual(next.eliminated.slice(5))
  }, 25000)

  it('reloads the final reserve defence and qualifies its winner at fusion', async () => {
    const start = reachFixture(4, (state) => state.phase === 'reserveDuel' && state.cycle === 11)!
    expect(start.eliminated).toHaveLength(10)
    await saveTeamplay(scope, start, null)
    let result = await advanceSaved(start)
    if (result.phase === 'reserveDuel') result = await advanceSaved(result)
    expect(result.phase).toBe('reserveResult')
    expect(result.jurors).toHaveLength(6)
    const fusion = await advanceSaved(result)
    expect(fusion.phase).toBe('fusion')
    expect(fusion.individualIds).toContain(result.reserveId)
    expect(fusion.individualIds).not.toContain(result.lastExitId)
    expect(fusion.individualIds).toHaveLength(5)
    expect(fusion.resources).toEqual(result.resources)
  }, 25000)

  it('keeps an unfinished Tribunal choice in the profile archive and resumes it without voting', async () => {
    const pending = await createTeamplayPreview('tribunal')
    expect(pending.jurors).toContain(pending.humanId)
    await saveTeamplay(scope, pending, null)
    const nextSeason = createTeamplay(4, 'finn', 'next-season')
    await saveTeamplay(scope, nextSeason, pending)
    expect(listTeamplayArchives(scope)).toEqual([
      { id: pending.id, contestant: 'Finn', champion: null, phase: 'tribunal' },
    ])
    expect(listTeamplayArchives('play:other-profile')).toEqual([])
    const resumed = readTeamplayArchive(scope, pending.id)
    await saveTeamplay(scope, resumed, nextSeason)
    const loaded = (await loadTeamplay(scope)).state!
    expect(loaded).toEqual(JSON.parse(JSON.stringify(pending)))
    expect(loaded.endgame?.votes).toEqual({})
    expect(() =>
      applyTeamplayCommand(loaded, {
        id: 'no-implicit-vote',
        expectedRevision: loaded.revision,
        action: { type: 'continue' },
      })
    ).toThrow('Make your choice')
  }, 15000)

  it('saves and reloads the same frozen attempt and previous checkpoint', async () => {
    const initial = createTeamplay(42, 'finn', 'saved')
    await saveTeamplay(scope, initial, null)
    const next = applyTeamplayCommand(initial, {
      id: 'start-cycle',
      expectedRevision: 0,
      action: { type: 'continue' },
    })
    await saveTeamplay(scope, next, initial)
    expect((await loadTeamplay(scope)).state).toEqual(next)
    expect(JSON.parse(storage.data.get(`${key}:checkpoint`)!)).toEqual(initial)
    expect((await loadTeamplay('preview:guest')).state).toBeNull()
  })

  it('quarantines corrupted data and recovers the latest valid checkpoint without deleting the original', async () => {
    const initial = createTeamplay(42, 'finn', 'saved')
    storage.data.set(key, '{broken')
    storage.data.set(`${key}:checkpoint`, JSON.stringify(initial))
    const loaded = await loadTeamplay(scope)
    expect(loaded.recovered).toBe(true)
    expect(loaded.state).toEqual(initial)
    expect(storage.data.get(key)).toBe('{broken')
    expect(
      [...storage.data.entries()].some(
        ([entry, raw]) => entry.includes(':invalid:') && raw === '{broken'
      )
    ).toBe(true)
    expect(exportTeamplaySave(scope)).toContain('{broken')
  })

  it('does not silently downgrade an unsupported rule version to an older checkpoint', async () => {
    const initial = createTeamplay(42, 'finn', 'saved')
    const future = JSON.stringify({ ...initial, rulesVersion: '3.0' })
    storage.data.set(key, future)
    storage.data.set(`${key}:checkpoint`, JSON.stringify(initial))
    const loaded = await loadTeamplay(scope)
    expect(loaded.state).toBeNull()
    expect(loaded.error).toContain('unsupported')
    expect(storage.data.get(key)).toBe(future)
  })

  it('rejects an unflushed outcome and a stale revision', async () => {
    const initial = createTeamplay(42, 'finn', 'saved')
    await saveTeamplay(scope, initial, null)
    const next = applyTeamplayCommand(initial, {
      id: 'continue',
      expectedRevision: 0,
      action: { type: 'continue' },
    })
    await saveTeamplay(scope, next, initial)
    await expect(saveTeamplay(scope, next, initial)).rejects.toThrow('changed')
    storage.flush = false
    const further = applyTeamplayCommand(next, {
      id: 'delegate',
      expectedRevision: 1,
      action: { type: 'delegate_attempt' },
    })
    await expect(saveTeamplay(scope, further, next)).rejects.toThrow('not been revealed')
    expect((await loadTeamplay(scope)).state).toEqual(next)
    storage.flush = true
    await saveTeamplay(scope, further, next)
    expect((await loadTeamplay(scope)).state).toEqual(further)
  })

  it('archives an existing season before explicitly starting another', async () => {
    const initial = createTeamplay(42, 'finn', 'first')
    await saveTeamplay(scope, initial, null)
    await expect(saveTeamplay(scope, createTeamplay(43, 'finn', 'second'), null)).rejects.toThrow(
      'already exists'
    )
    const second = createTeamplay(43, 'finn', 'second')
    await saveTeamplay(scope, second, initial)
    expect(storage.data.get(`${key}:archive:first`)).toBe(JSON.stringify(initial))
    expect((await loadTeamplay(scope)).state).toEqual(second)
  })
})
