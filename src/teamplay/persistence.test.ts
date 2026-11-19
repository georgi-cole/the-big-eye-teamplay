import { beforeEach, describe, expect, it, vi } from 'vitest'
const storage = vi.hoisted(() => ({ data: new Map<string, string>(), flush: true }))
vi.mock('../store/durablePersistence', () => ({
  getDurableItem: (key: string) => storage.data.get(key) ?? null,
  setDurableItem: (key: string, value: string) => {
    storage.data.set(key, value)
    return true
  },
  flushDurablePersistence: async () => storage.flush,
}))
import { applyTeamplayCommand, createTeamplay } from './engine'
import { exportTeamplaySave, loadTeamplay, saveTeamplay } from './persistence'

const scope = 'play:guest'
const key = 'the-big-eye-teamplay:tribe-season:v1:play%3Aguest'
beforeEach(() => {
  storage.data.clear()
  storage.flush = true
})

describe('Teamplay durable saves', () => {
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
