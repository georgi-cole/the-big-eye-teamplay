export function classicLohEntrants(
  activeIds: string[],
  outgoingLohIds: Iterable<string>
): string[] {
  const outgoing = new Set(outgoingLohIds)
  const eligible = activeIds.filter((id) => !outgoing.has(id))
  return eligible.length ? eligible : activeIds
}

export function classicFinalFourNominees(
  activeIds: string[],
  lohId: string | null | undefined,
  posId: string,
  initialNominees: string[]
): string[] {
  const eligible = activeIds.filter((id) => id !== lohId && id !== posId)
  return eligible.length === 2 || initialNominees.length !== 2
    ? eligible
    : activeIds.filter((id) => initialNominees.includes(id))
}

export function classicFinalThreeEntrants(
  activeIds: string[],
  part: 1 | 2 | 3,
  partOneWinner?: string,
  partTwoWinner?: string
): string[] {
  if (part === 1) return activeIds
  if (part === 2) return activeIds.filter((id) => id !== partOneWinner)
  return activeIds.filter((id) => id === partOneWinner || id === partTwoWinner)
}
