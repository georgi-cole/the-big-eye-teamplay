import { expect, it } from 'vitest'
import { createTeamplay } from './engine'
import { capture, draft, draftTribe, finishForcedDrafts, maintain } from './tribeMaintenance'
import type { CycleRecord, TeamplayState } from './types'

const base = createTeamplay(42, 'finn', 'roster-traversal')
type Shape = Record<string, number>

function permutations(ids: string[]): string[][] {
  if (!ids.length) return [[]]
  return ids.flatMap((id) =>
    permutations(ids.filter((other) => other !== id)).map((rest) => [id, ...rest])
  )
}

function checkpoint(shape: Shape, order: string[], losingId: string, cycle: number): TeamplayState {
  let offset = 0
  const tribes = Object.entries(shape).map(([id, size]) => {
    const members = base.castOrder.slice(offset, offset + size)
    offset += size
    return { id, members, captainId: members[0], name: id, color: '', priority: offset }
  })
  const teamResults = order.map((tribeId, rank) => {
    const members = [...tribes.find((tribe) => tribe.id === tribeId)!.members]
    const score = 50 - rank
    return {
      tribeId,
      members,
      total: score * members.length,
      divisor: members.length,
      mean: score,
      best: score,
    }
  })
  const loser = tribes.find((tribe) => tribe.id === losingId)!
  const departed = loser.members.pop()!
  const reserveId = base.castOrder[15]
  const active = tribes.flatMap((tribe) => tribe.members)
  const record: CycleRecord = {
    cycle,
    teamResults,
    nominees: [],
    nomineeWinnerId: active[0],
    challengerId: departed,
    reserveId,
    exitId: departed,
    transfers: [],
  }
  return {
    ...base,
    tribes,
    reserveId,
    cycle,
    stage: tribes.length === 3 ? 'threeTribes' : 'twoTribes',
    phase: 'reserveResult',
    teamResults,
    individualOrder: [...active, departed],
    eliminated: [...base.castOrder.slice(offset, 15), departed],
    history: [record],
    individualIds: [],
  }
}

function assertRoster(state: TeamplayState, incoming: string[]) {
  expect(
    [
      ...state.tribes.flatMap((tribe) => tribe.members),
      ...(state.merge?.pool ?? []),
      ...state.individualIds,
    ].sort()
  ).toEqual([...incoming].sort())
  for (const tribe of state.tribes) expect(tribe.members).toContain(tribe.captainId)
}

function allDrafts(state: TeamplayState, incoming: string[]): TeamplayState[] {
  if (!state.merge) {
    expect(state.tribes.map((tribe) => tribe.members.length)).toEqual([4, 4])
    return [state]
  }
  const { order, turn, pool } = state.merge
  const expected = state.tribes.find(
    (tribe) => tribe.id === order[turn] && tribe.members.length < 4
  )!
  expect(draftTribe(state)?.id).toBe(expected.id)
  return pool.flatMap((member) => {
    const copy = structuredClone(state)
    draft(copy, member)
    expect(copy.tribes.find((tribe) => tribe.id === expected.id)?.members).toContain(member)
    finishForcedDrafts(copy)
    assertRoster(copy, incoming)
    return allDrafts(copy, incoming)
  })
}

it('traverses every reachable ranked tribe shape and legal loss through the real maintenance rules', () => {
  // Scores can produce any flag order. Contestant identity does not affect later
  // roster sizes, so coalesce equivalent openings only after checking every move.
  let shapes: Shape[] = [{ ember: 5, tide: 5, iris: 5 }]
  const seen = new Set<string>()
  let edges = 0
  let captainTransfers = 0
  for (let cycle = 1; cycle <= 11; cycle++) {
    const next = new Map<string, Shape>()
    expect(shapes.length).toBeGreaterThan(0)
    for (const shape of shapes) {
      for (const order of permutations(Object.keys(shape))) {
        for (const losingId of order.slice(1)) {
          edges++
          const state = checkpoint(shape, order, losingId, cycle)
          const before = state.tribes.flatMap((tribe) => tribe.members)
          const sizes = state.tribes.map((tribe) => tribe.members.length)
          const low = Math.min(...sizes)
          const high = Math.max(...sizes)
          const priorReserve = state.reserveId!
          maintain(state)
          seen.add(state.phase)
          if (cycle === 11) {
            expect(state.phase).toBe('fusion')
            expect(state.reserveId).toBeNull()
            expect(state.individualIds).toHaveLength(5)
            assertRoster(state, [...before, priorReserve])
            continue
          }
          let outcomes = [state]
          if (cycle === 7) {
            expect(state.stage).toBe('twoTribes')
            expect(state.tribes.map((tribe) => tribe.id)).toEqual(order.slice(0, 2))
            const draftHistory = (done: TeamplayState) => done.history[0].transfers
            outcomes = allDrafts(state, before)
            for (const done of outcomes) {
              expect(done.phase).toBe('recap')
              expect(draftHistory(done).every((move) => move.from === order[2])).toBe(true)
              expect(draftHistory(done)).toHaveLength(
                (shape[order[2]] ?? 0) - Number(losingId === order[2])
              )
            }
          } else if (high - low === 3) {
            expect(state.phase).toBe('capture')
            const donorId = order.find((id) => shape[id] - Number(id === losingId) === high)!
            const recipientId = order
              .filter((id) => shape[id] - Number(id === losingId) === low)
              .at(-1)!
            const donor = state.tribes.find((tribe) => tribe.id === donorId)!
            expect(state.capture).toMatchObject({ donorId, recipientId })
            outcomes = donor.members.map((id) => {
              const copy = structuredClone(state)
              capture(copy, id)
              expect(copy.history[0].transfers).toEqual([
                { playerId: id, from: donorId, to: recipientId },
              ])
              if (donor.captainId === id) {
                captainTransfers++
                expect(copy.tribes.find((tribe) => tribe.id === donorId)?.captainId).toBe(
                  donor.members.find((member) => member !== id)
                )
              }
              return copy
            })
          } else expect(state.phase).toBe('recap')
          for (const result of outcomes) {
            assertRoster(result, before)
            expect(result.reserveId).toBe(priorReserve)
            const entries = result.tribes
              .map((tribe) => [tribe.id, tribe.members.length] as const)
              .sort()
            const counts = entries.map(([, size]) => size)
            expect(Math.min(...counts)).toBeGreaterThanOrEqual(2)
            expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2)
            next.set(JSON.stringify(entries), Object.fromEntries(entries))
          }
        }
      }
    }
    shapes = [...next.values()]
  }
  expect(shapes).toEqual([])
  expect(seen).toEqual(new Set(['recap', 'capture', 'merge', 'fusion']))
  expect(edges).toBeGreaterThan(100)
  expect(captainTransfers).toBeGreaterThan(0)
})
