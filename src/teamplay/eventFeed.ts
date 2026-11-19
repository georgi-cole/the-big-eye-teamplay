import type { TranslationKey } from '../i18n'
import { FLAGS } from './engine'
import { nameOf } from './presentationTheme'
import { socialActionDefinition } from './social'
import { teamplayAllianceRequests } from './tribeSocial'
import type { CycleRecord, TeamplayState } from './types'

type Copy = { key: TranslationKey; values?: Record<string, string | number> }
export type Broadcast = {
  id: string
  cycle: number
  tone: 'neutral' | 'gold' | 'danger' | 'social'
  title: Copy | string
  body?: Copy
  contestantId?: string
}

function flagName(id: string): string {
  return FLAGS.find((flag) => flag.id === id)?.name ?? id
}

/** The broadcast contains public outcomes and never reads raw ballots or AI intentions. */
export function publicBroadcasts(state: TeamplayState): Broadcast[] {
  const broadcasts: Broadcast[] = [
    {
      id: 'opening',
      cycle: 1,
      tone: 'neutral',
      title: { key: 'teamplay.events.opening' },
      body: { key: 'teamplay.events.openingCopy' },
    },
  ]

  function addCycle(
    round: Pick<CycleRecord, 'cycle' | 'teamResults' | 'nominees' | 'transfers'> & {
      nomineeWinnerId: string | null
      reserveId?: string
      exitId?: string
    }
  ) {
    const { cycle } = round
    const add = (id: string, entry: Omit<Broadcast, 'id' | 'cycle'>) =>
      broadcasts.push({ id: `${cycle}:${id}`, cycle, ...entry })
    const winner = round.teamResults[0]
    if (winner) {
      add('immunity', {
        tone: 'gold',
        title: { key: 'teamplay.events.immunity', values: { tribe: flagName(winner.tribeId) } },
        body: {
          key: 'teamplay.events.immunityCopy',
          values: { score: Number(winner.mean.toFixed(2)) },
        },
      })
    }
    if (round.nominees.length === 2) {
      add('nominations', {
        tone: 'danger',
        title: { key: 'teamplay.events.nominations' },
        body: {
          key: 'teamplay.events.nominationsCopy',
          values: { names: round.nominees.map((id) => nameOf(state, id)).join(' · ') },
        },
      })
    }
    if (round.nomineeWinnerId) {
      add('nominee-duel', {
        tone: 'gold',
        title: {
          key: 'teamplay.events.nomineeWinner',
          values: { name: nameOf(state, round.nomineeWinnerId) },
        },
        contestantId: round.nomineeWinnerId,
      })
    }
    if (round.reserveId && round.exitId) {
      add('reserve-duel', {
        tone: 'danger',
        title: { key: 'teamplay.events.departure', values: { name: nameOf(state, round.exitId) } },
        body: { key: 'teamplay.events.reserve', values: { name: nameOf(state, round.reserveId) } },
        contestantId: round.exitId,
      })
    }
    for (const [index, transfer] of round.transfers.entries()) {
      add(`transfer:${index}`, {
        tone: 'neutral',
        title: {
          key: 'teamplay.events.transfer',
          values: { name: nameOf(state, transfer.playerId), tribe: flagName(transfer.to) },
        },
        body: { key: 'teamplay.events.transferCopy', values: { tribe: flagName(transfer.from) } },
        contestantId: transfer.playerId,
      })
    }
  }

  state.history.forEach(addCycle)
  if (state.history.at(-1)?.cycle !== state.cycle) {
    addCycle({
      cycle: state.cycle,
      teamResults: state.teamResults,
      nominees: state.phase === 'nominationTies' ? [] : state.nominees,
      nomineeWinnerId: state.nomineeWinnerId,
      transfers: [],
    })
  }

  if (state.phase === 'fusion' || state.endgame) {
    broadcasts.push({
      id: 'fusion',
      cycle: state.cycle,
      tone: 'gold',
      title: { key: 'teamplay.events.fusion' },
      body: { key: 'teamplay.events.fusionCopy' },
    })
  }
  for (const round of state.endgame?.rounds ?? []) {
    const cycle = state.cycle + (round.size === 5 ? 1 : 2)
    for (const [kind, id] of [
      ['leader', round.lohId],
      ['safety', round.posId],
      ['departure', round.exitId],
    ] as const) {
      if (!id) continue
      broadcasts.push({
        id: `final-${round.size}:${kind}`,
        cycle,
        tone: kind === 'departure' ? 'danger' : 'gold',
        title: { key: `teamplay.events.${kind}`, values: { name: nameOf(state, id) } },
        body: { key: 'teamplay.events.round', values: { count: round.size } },
        contestantId: id,
      })
    }
  }
  const thirdPlaceId = state.endgame?.thirdPlaceId
  if (thirdPlaceId) {
    broadcasts.push({
      id: 'final-three:departure',
      cycle: state.cycle + 3,
      tone: 'danger',
      title: { key: 'teamplay.events.departure', values: { name: nameOf(state, thirdPlaceId) } },
      body: { key: 'teamplay.phase.finalThree' },
      contestantId: thirdPlaceId,
    })
  }
  const championId = state.endgame?.championId
  if (championId) {
    broadcasts.push({
      id: 'champion',
      cycle: state.cycle + 3,
      tone: 'gold',
      title: { key: 'teamplay.individual.champion', values: { name: nameOf(state, championId) } },
      contestantId: championId,
    })
  }
  return broadcasts.reverse()
}

export function personalBroadcasts(state: TeamplayState): Broadcast[] {
  const actions: Broadcast[] = state.socialActions
    .filter((entry) => entry.actorId === state.humanId || entry.targetId === state.humanId)
    .map((entry) => ({
      id: entry.id,
      cycle: entry.phase === 'finalFive' ? 12 : entry.phase === 'finalFour' ? 13 : entry.cycle,
      tone: 'social',
      title: socialActionDefinition(entry.actionId)?.title ?? { key: 'teamplay.social.last' },
      body: {
        key: entry.targetId ? 'teamplay.events.socialPair' : 'teamplay.events.socialRoom',
        values: {
          actor: nameOf(state, entry.actorId),
          target: nameOf(state, entry.targetId),
          delta: entry.delta > 0 ? `+${entry.delta}` : entry.delta,
        },
      },
      contestantId: entry.actorId === state.humanId ? (entry.targetId ?? undefined) : entry.actorId,
    }))
  const requests: Broadcast[] = teamplayAllianceRequests(state, state.humanId).map((request) => {
    const other = request.memberIds.find((id) => id !== state.humanId)
    return {
      id: request.id,
      cycle: (request.settledAt ?? request.createdAt).day,
      tone: 'social',
      title: { key: 'teamplay.events.alliance' },
      body: {
        key: `teamplay.alliance.status.${request.status}`,
        values: { names: request.memberIds.map((id) => nameOf(state, id)).join(', ') },
      },
      contestantId: other,
    }
  })
  return [...actions.reverse(), ...requests].sort((a, b) => b.cycle - a.cycle)
}
