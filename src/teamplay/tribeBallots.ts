import type { Cutoff, Tribe } from './types'

export function resolveTribeBallots(
  tribe: Tribe,
  ballots: Record<string, string>,
  slots: 1 | 2
): { totals: Record<string, number>; confirmed: string[]; cutoff?: Cutoff } {
  if (slots === 2 && tribe.members.length === 2)
    return { totals: {}, confirmed: [...tribe.members] }
  if (!tribe.captainId || !tribe.members.includes(tribe.captainId))
    throw new Error('A nomination vote requires a current captain')
  const totals: Record<string, number> = Object.fromEntries(tribe.members.map((id) => [id, 0]))
  for (const actor of tribe.members) {
    const target = ballots[actor]
    if (!target || target === actor || !tribe.members.includes(target))
      throw new Error('Invalid or missing secret ballot')
    totals[target] += actor === tribe.captainId ? 2 : 1
  }
  const scores = Object.values(totals).sort((a, b) => b - a)
  const threshold = scores[slots - 1]
  if (!(threshold > 0)) throw new Error('Invalid zero-vote nomination cutoff')
  const confirmed = tribe.members
    .filter((id) => totals[id] > threshold)
    .sort((a, b) => totals[b] - totals[a])
  const candidates = tribe.members.filter((id) => totals[id] === threshold)
  const needed = slots - confirmed.length
  if (candidates.length === needed) return { totals, confirmed: [...confirmed, ...candidates] }
  return {
    totals,
    confirmed,
    cutoff: { tribeId: tribe.id, captainId: tribe.captainId, candidates, slots: needed },
  }
}
