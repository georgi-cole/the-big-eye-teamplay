import { expect, it } from 'vitest'
import { resolveTribeBallots } from './tribeBallots'
import type { Tribe } from './types'

function combinations(ids: string[], count: number): string[][] {
  if (count === 0) return [[]]
  return ids.flatMap((id, index) =>
    combinations(ids.slice(index + 1), count - 1).map((rest) => [id, ...rest])
  )
}

it('matches every legal weighted ballot pattern and every maximum-score block for sizes two through five', () => {
  const covered = new Set<string>()
  let patterns = 0
  for (const size of [2, 3, 4, 5]) {
    const members = Array.from({ length: size }, (_, i) => String.fromCharCode(97 + i))
    const tribe: Tribe = {
      id: 'ember',
      name: 'Ember',
      priority: 1,
      color: '',
      members,
      captainId: members[0],
    }
    for (let index = 0; index < (size - 1) ** size; index++) {
      const ballots = Object.fromEntries(
        members.map((actor, position) => [
          actor,
          members.filter((id) => id !== actor)[
            Math.floor(index / (size - 1) ** position) % (size - 1)
          ],
        ])
      )
      for (const slots of [1, 2] as const) {
        if (size === 2 && slots === 2) continue
        patterns++
        const result = resolveTribeBallots(tribe, ballots, slots)
        const numericVotes = (id: string) =>
          Object.values(ballots).filter((target) => target === id).length +
          Number(ballots[members[0]] === id)
        const scored = combinations(members, slots).map((ids) => ({
          ids: ids.join(''),
          points: ids.reduce((sum, id) => sum + numericVotes(id), 0),
        }))
        const max = Math.max(...scored.map((entry) => entry.points))
        const blocks = result.cutoff
          ? combinations(result.cutoff.candidates, result.cutoff.slots).map((ids) =>
              [...result.confirmed, ...ids].sort().join('')
            )
          : [result.confirmed.slice().sort().join('')]
        expect(blocks.sort()).toEqual(
          scored
            .filter((entry) => entry.points === max)
            .map((entry) => entry.ids)
            .sort()
        )
        expect(result.totals).toEqual(
          Object.fromEntries(members.map((id) => [id, numericVotes(id)]))
        )
        if (result.cutoff && slots === 1) covered.add('first-slot tie')
        if (result.cutoff && slots === 2 && result.confirmed.length === 1)
          covered.add('second-slot tie')
        if (result.cutoff?.candidates.includes(members[0])) {
          covered.add('captain tied')
          expect(result.cutoff.captainId).toBe(members[0])
        }
      }
    }
  }
  expect(patterns).toBe(2227)
  expect(covered).toEqual(new Set(['first-slot tie', 'second-slot tie', 'captain tied']))
})

it('forces both members onto the two-person block and rejects missing, foreign, or self votes otherwise', () => {
  const tribe: Tribe = {
    id: 'ember',
    name: 'Ember',
    priority: 1,
    color: '',
    members: ['captain', 'ally'],
    captainId: 'captain',
  }
  expect(resolveTribeBallots(tribe, {}, 2)).toEqual({ totals: {}, confirmed: tribe.members })
  const invalidBallots: Record<string, string>[] = [
    {},
    { captain: 'outsider', ally: 'captain' },
    { captain: 'captain', ally: 'captain' },
  ]
  for (const invalid of invalidBallots)
    expect(() => resolveTribeBallots(tribe, invalid, 1)).toThrow('Invalid or missing secret ballot')
})
