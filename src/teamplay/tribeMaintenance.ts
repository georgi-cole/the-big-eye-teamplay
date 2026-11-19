import { activeIds } from './social'
import { expireSeparatedRequests } from './tribeSocial'
import type { TeamplayState } from './types'

export function maintain(state: TeamplayState): void {
  const count = activeIds(state).length
  if (count === 4) {
    state.individualIds = [...activeIds(state), state.reserveId!]
    state.reserveId = null
    state.tribes = []
    state.stage = 'individual'
    state.phase = 'fusion'
    expireSeparatedRequests(state)
    return
  }
  if (count === 8 && state.stage === 'threeTribes') {
    const order = state.teamResults.map((entry) => entry.tribeId)
    const retired = state.tribes.find((tribe) => tribe.id === order[2])!
    const surviving = order.slice(0, 2).map((id) => state.tribes.find((tribe) => tribe.id === id)!)
    state.merge = {
      retiredId: retired.id,
      pool: [...retired.members],
      order: order.slice(0, 2),
      turn: 0,
      captains: Object.fromEntries(surviving.map((tribe) => [tribe.id, tribe.captainId!])),
    }
    state.tribes = surviving
    state.stage = 'twoTribes'
    state.phase = 'merge'
    expireSeparatedRequests(state)
    finishForcedDrafts(state)
    return
  }
  const sizes = state.tribes.map((tribe) => tribe.members.length)
  const gap = Math.max(...sizes) - Math.min(...sizes)
  if (gap > 3) throw new Error('Invalid tribe gap; restore the previous checkpoint')
  if (gap === 3) {
    const ordered = state.teamResults.map(
      (entry) => state.tribes.find((tribe) => tribe.id === entry.tribeId)!
    )
    const donor = ordered.find((tribe) => tribe.members.length === Math.max(...sizes))!
    const recipient = [...ordered]
      .reverse()
      .find((tribe) => tribe.members.length === Math.min(...sizes))!
    state.capture = {
      donorId: donor.id,
      recipientId: recipient.id,
      captainId: recipient.captainId!,
    }
    state.phase = 'capture'
  } else state.phase = 'recap'
}

function transfer(state: TeamplayState, playerId: string, from: string, to: string): void {
  state.history.at(-1)!.transfers.push({ playerId, from, to })
  expireSeparatedRequests(state)
}

export function capture(state: TeamplayState, playerId: string): void {
  const pending = state.capture!
  const donor = state.tribes.find((tribe) => tribe.id === pending.donorId)!
  const recipient = state.tribes.find((tribe) => tribe.id === pending.recipientId)!
  if (!donor.members.includes(playerId)) throw new Error('Choose a current donor tribe member')
  donor.members = donor.members.filter((id) => id !== playerId)
  recipient.members.push(playerId)
  if (donor.captainId === playerId)
    donor.captainId = state.individualOrder.find((id) => donor.members.includes(id))!
  transfer(state, playerId, donor.id, recipient.id)
  state.capture = null
  state.phase = 'recap'
}

export function draftTribe(state: TeamplayState) {
  if (!state.merge) return null
  const merge = state.merge
  for (let offset = 0; offset < 2; offset++) {
    const tribe = state.tribes.find((entry) => entry.id === merge.order[(merge.turn + offset) % 2])!
    if (tribe.members.length < 4) return tribe
  }
  return null
}

export function draft(state: TeamplayState, playerId: string): void {
  const merge = state.merge!
  const tribe = draftTribe(state)
  if (!tribe || !merge.pool.includes(playerId)) throw new Error('Choose a remaining recruit')
  merge.pool = merge.pool.filter((id) => id !== playerId)
  tribe.members.push(playerId)
  transfer(state, playerId, merge.retiredId, tribe.id)
  merge.turn = (merge.order.indexOf(tribe.id) + 1) % 2
}

export function finishForcedDrafts(state: TeamplayState): void {
  const merge = state.merge!
  if (state.tribes.filter((tribe) => tribe.members.length < 4).length === 1) {
    while (merge.pool.length) draft(state, merge.pool[0])
  }
  if (!merge.pool.length) {
    state.merge = null
    state.phase = 'recap'
  }
}
