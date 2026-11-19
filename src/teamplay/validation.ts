import type { TeamplayState } from './types'
import {
  individualAttemptId,
  individualAttemptSeed,
  isIndividualCompetition,
  rankIndividualAttempt,
} from './competition'
import { validateTeamplayEndgame } from './endgameValidation'

function requireState(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Teamplay checkpoint: ${message}`)
}
const phases = [
  'opening',
  'teamCompetition',
  'teamResults',
  'socialOne',
  'ballots',
  'nominationTies',
  'nominations',
  'socialTwo',
  'nomineeDuel',
  'nomineeResult',
  'reserveDuel',
  'reserveResult',
  'capture',
  'merge',
  'recap',
  'fusion',
  'finalFive',
  'finalFour',
  'finalThree',
  'tribunal',
  'seasonComplete',
]
const individualPhases = ['finalFive', 'finalFour', 'finalThree', 'tribunal', 'seasonComplete']

export function validateTeamplay(input: unknown): asserts input is TeamplayState {
  requireState(input && typeof input === 'object', 'save is not an object')
  const state = input as TeamplayState
  requireState(
    state.schemaVersion === 1 &&
      state.rulesVersion === '2.0' &&
      state.manifestVersion === 'quick-tap-classic-30s-v1',
    'unsupported save/rules/competition version; original save retained'
  )
  requireState(
    typeof state.id === 'string' &&
      state.id.length > 0 &&
      Number.isSafeInteger(state.revision) &&
      state.revision >= 0,
    'invalid identity/revision'
  )
  requireState(
    Number.isInteger(state.seed) && state.seed >= 0 && state.seed <= 0xffffffff,
    'invalid season seed'
  )
  requireState(
    Number.isInteger(state.cycle) &&
      state.cycle >= 1 &&
      state.cycle <= 11 &&
      phases.includes(state.phase),
    'unsupported cycle or phase'
  )
  requireState(['threeTribes', 'twoTribes', 'individual'].includes(state.stage), 'invalid stage')
  requireState(
    Array.isArray(state.contestants) && state.contestants.length === 16,
    'expected the original 16 contestants'
  )
  const ids = state.contestants.map((player) => player.id)
  requireState(
    ids.every((id) => typeof id === 'string' && id.length > 0) && new Set(ids).size === 16,
    'duplicate/invalid contestant IDs'
  )
  requireState(
    new Set(state.contestants.map((player) => player.priority)).size === 16 &&
      state.contestants.every(
        (player) =>
          Number.isInteger(player.priority) && player.priority >= 1 && player.priority <= 16
      ),
    'invalid published priorities'
  )
  requireState(
    state.contestants.filter((player) => player.isHuman).length === 1 &&
      state.contestants.some((player) => player.id === state.humanId && player.isHuman),
    'invalid human identity'
  )
  for (const player of state.contestants) {
    requireState(
      typeof player.name === 'string' && typeof player.avatar === 'string' && player.profile,
      'invalid contestant metadata'
    )
    requireState(
      Object.values(player.profile).every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 100
      ),
      'invalid competition profile'
    )
    requireState(
      player.bank &&
        ['energy', 'influence', 'info'].every(
          (key) =>
            Number.isSafeInteger(player.bank[key as keyof typeof player.bank]) &&
            player.bank[key as keyof typeof player.bank] >= 0
        ),
      'invalid bank'
    )
  }
  requireState(
    Array.isArray(state.castOrder) &&
      state.castOrder.length === 16 &&
      new Set(state.castOrder).size === 16 &&
      state.castOrder.every((id) => ids.includes(id)),
    'invalid frozen cast order'
  )
  requireState(
    Array.isArray(state.plan) &&
      state.plan.length === 11 &&
      state.plan.every((entry) =>
        ['team', 'nominee', 'reserve'].every((kind) => {
          const context = entry[kind as keyof typeof entry]
          return (
            context &&
            Number.isInteger(context.seed) &&
            context.seed > 0 &&
            context.seed <= 0xffffffff &&
            Number.isInteger(context.replaySeed) &&
            context.replaySeed > 0 &&
            context.replaySeed <= 0xffffffff
          )
        })
      ),
    'invalid frozen competition plan'
  )
  requireState(
    Array.isArray(state.tribes) &&
      Array.isArray(state.eliminated) &&
      Array.isArray(state.jurors) &&
      Array.isArray(state.individualIds),
    'missing roster records'
  )
  requireState(
    state.tribes.every(
      (tribe) =>
        Array.isArray(tribe.members) &&
        tribe.members.length > 0 &&
        (!tribe.captainId || tribe.members.includes(tribe.captainId))
    ),
    'invalid tribe/captain'
  )
  requireState(
    new Set(state.tribes.map((tribe) => tribe.id)).size === state.tribes.length,
    'duplicate flags'
  )
  const active =
    state.stage === 'individual'
      ? state.individualIds
      : [...state.tribes.flatMap((tribe) => tribe.members), ...(state.merge?.pool ?? [])]
  const roles = [...active, ...(state.reserveId ? [state.reserveId] : []), ...state.eliminated]
  requireState(
    roles.length === 16 && new Set(roles).size === 16 && roles.every((id) => ids.includes(id)),
    'roles must be unique and cover the original cast'
  )
  requireState(
    new Set(state.jurors).size === state.jurors.length &&
      JSON.stringify(state.jurors) === JSON.stringify(state.eliminated.slice(5)),
    'invalid Tribunal membership/order'
  )
  if (state.stage === 'individual')
    requireState(
      state.endgame
        ? individualPhases.includes(state.phase)
        : state.phase === 'fusion' &&
            active.length === 5 &&
            state.reserveId === null &&
            state.tribes.length === 0 &&
            state.eliminated.length === 11,
      'invalid Final Five fusion'
    )
  else {
    requireState(
      !state.endgame && state.phase !== 'fusion' && !individualPhases.includes(state.phase),
      'individual phase before fusion'
    )
    requireState(
      state.reserveId && state.reserveId !== (state.phase === 'opening' ? state.humanId : ''),
      'missing/invalid reserve'
    )
    requireState(
      state.tribes.length === (state.stage === 'threeTribes' ? 3 : 2),
      'invalid flag count'
    )
    if (
      [
        'opening',
        'teamCompetition',
        'teamResults',
        'socialOne',
        'ballots',
        'nominationTies',
        'nominations',
        'socialTwo',
        'nomineeDuel',
        'nomineeResult',
        'reserveDuel',
        'recap',
      ].includes(state.phase)
    ) {
      const sizes = state.tribes.map((tribe) => tribe.members.length)
      requireState(
        Math.min(...sizes) >= 2 && Math.max(...sizes) - Math.min(...sizes) <= 2,
        'unbalanced ordinary-cycle roster'
      )
    }
  }
  requireState(
    Array.isArray(state.receipts) &&
      new Set(state.receipts).size === state.receipts.length &&
      state.receipts.length === state.revision,
    'invalid command receipts'
  )
  requireState(
    Array.isArray(state.resources) &&
      new Set(state.resources.map((entry) => entry.id)).size === state.resources.length,
    'duplicate resource receipts'
  )
  const ledger = Object.fromEntries(ids.map((id) => [id, { energy: 0, influence: 0, info: 0 }]))
  for (const receipt of state.resources) {
    requireState(ids.includes(receipt.playerId), 'unknown resource recipient')
    for (const key of ['energy', 'influence', 'info'] as const)
      requireState(
        Number.isSafeInteger(receipt.after[key]) &&
          receipt.after[key] >= 0 &&
          Number.isSafeInteger(receipt.requested[key]) &&
          receipt.before[key] === ledger[receipt.playerId][key] &&
          receipt.after[key] - receipt.before[key] === receipt.credited[key],
        'invalid resource ledger arithmetic'
      )
    ledger[receipt.playerId] = { ...receipt.after }
  }
  requireState(
    state.contestants.every((player) =>
      (['energy', 'influence', 'info'] as const).every(
        (key) => player.bank[key] === ledger[player.id][key]
      )
    ),
    'bank differs from its resource receipts'
  )
  requireState(
    Array.isArray(state.history) &&
      state.history.length === Math.min(11, state.eliminated.length) &&
      state.history.every(
        (entry, index) => entry.exitId === state.eliminated[index] && entry.cycle === index + 1
      ),
    'one permanent exit required per completed cycle'
  )
  const afterExit = ['reserveResult', 'capture', 'merge', 'recap', 'fusion'].includes(state.phase)
  if (state.lastExitId)
    requireState(
      state.lastExitId === state.eliminated.at(-1),
      'displayed exit differs from the committed departure'
    )
  requireState(
    state.endgame || state.eliminated.length === state.cycle - (afterExit ? 0 : 1),
    'cycle/departure count mismatch'
  )
  requireState(
    Array.isArray(state.nominees) &&
      new Set(state.nominees).size === state.nominees.length &&
      state.nominees.every((id) => ids.includes(id)),
    'invalid nominees'
  )
  if (
    [
      'nominations',
      'socialTwo',
      'nomineeDuel',
      'nomineeResult',
      'reserveDuel',
      'reserveResult',
    ].includes(state.phase)
  )
    requireState(state.nominees.length === 2, 'a duel needs two distinct nominees')
  requireState(
    state.attempts &&
      state.frozenRosters &&
      state.reality?.version === 2 &&
      Array.isArray(state.socialActions) &&
      state.socialOneSpent &&
      state.ballots &&
      state.totals &&
      Array.isArray(state.cutoffs),
    'missing gameplay records'
  )
  for (const [id, attempt] of Object.entries(state.attempts)) {
    requireState(
      attempt.id === id &&
        attempt.game === 'quickTap' &&
        attempt.duration === 30 &&
        [0, 1].includes(attempt.replay) &&
        ['ready', 'running', 'complete'].includes(attempt.status),
      'invalid competition attempt'
    )
    requireState(
      Array.isArray(attempt.participants) &&
        new Set(attempt.participants).size === attempt.participants.length &&
        attempt.participants.every((id) => ids.includes(id)),
      'invalid competition participants'
    )
    requireState(
      Object.entries(attempt.scores).every(
        ([id, score]) =>
          attempt.participants.includes(id) && Number.isSafeInteger(score) && score >= 0
      ),
      'invalid competition score'
    )
    if (attempt.status === 'complete')
      requireState(
        attempt.participants.every((id) => Object.hasOwn(attempt.scores, id)),
        'incomplete saved competition result'
      )
    if (isIndividualCompetition(attempt.kind)) {
      requireState(
        state.endgame &&
          attempt.replay === 0 &&
          attempt.id === individualAttemptId(state, attempt.kind) &&
          attempt.seed === individualAttemptSeed(state, attempt.kind) &&
          attempt.participants.length >= 2 &&
          attempt.participants.every(
            (id) => id === state.humanId || Object.hasOwn(attempt.scores, id)
          ) &&
          (attempt.status === 'complete'
            ? attempt.winnerId === rankIndividualAttempt(state, attempt)[0]
            : !attempt.winnerId && !Object.hasOwn(attempt.scores, state.humanId)),
        'invalid saved individual competition'
      )
      continue
    }
    const cycle = Number(attempt.id.split(':').at(-3))
    const context = state.plan[cycle - 1]?.[attempt.kind]
    requireState(
      context && attempt.seed === (attempt.replay ? context.replaySeed : context.seed),
      'attempt seed differs from frozen plan'
    )
    if (attempt.kind !== 'team')
      requireState(attempt.participants.length === 2, 'invalid duel roster')
    if (attempt.status === 'complete' && attempt.kind !== 'team') {
      const [first, second] = attempt.participants
      const tied = attempt.scores[first] === attempt.scores[second]
      if (tied && attempt.replay === 0)
        requireState(
          attempt.tied === true && !attempt.winnerId,
          'a first tied duel cannot claim a winner'
        )
      else {
        const expected = tied
          ? state.contestants.find((player) => player.id === first)!.priority <
            state.contestants.find((player) => player.id === second)!.priority
            ? first
            : second
          : attempt.scores[first] > attempt.scores[second]
            ? first
            : second
        requireState(
          attempt.winnerId === expected && Boolean(attempt.priorityFallback) === tied,
          'saved duel winner differs from its scores/tie rule'
        )
      }
    }
  }
  if (state.stage === 'individual') {
    for (const cycle of state.history) {
      const contest = state.attempts[`${state.id}:${cycle.cycle}:team:0`]
      const roster = cycle.teamResults.flatMap((result) => result.members)
      requireState(
        contest?.kind === 'team' &&
          contest.status === 'complete' &&
          roster.length === contest.participants.length &&
          new Set(roster).size === roster.length &&
          roster.every((id) => contest.participants.includes(id)) &&
          cycle.nominees.length === 2 &&
          cycle.nomineeWinnerId !== cycle.challengerId &&
          cycle.nominees.includes(cycle.nomineeWinnerId) &&
          cycle.nominees.includes(cycle.challengerId) &&
          ids.includes(cycle.reserveId) &&
          cycle.reserveId !== cycle.exitId,
        'invalid team evidence at fusion'
      )
    }
  }
  if (state.currentAttemptId)
    requireState(state.attempts[state.currentAttemptId], 'missing current attempt')
  if (state.nomineeWinnerId || state.challengerId)
    requireState(
      state.nomineeWinnerId !== state.challengerId &&
        state.nominees.includes(state.nomineeWinnerId!) &&
        state.nominees.includes(state.challengerId!),
      'invalid saved nominee outcome'
    )
  if (state.phase === 'nomineeResult')
    requireState(
      state.attempts[state.currentAttemptId ?? '']?.winnerId === state.nomineeWinnerId,
      'nominee result differs from its saved attempt'
    )
  if (state.phase === 'reserveResult')
    requireState(
      state.attempts[state.currentAttemptId ?? '']?.winnerId === state.reserveId &&
        state.attempts[state.currentAttemptId ?? ''].participants.includes(state.lastExitId!),
      'reserve result differs from its saved attempt'
    )
  if (['teamCompetition', 'nomineeDuel', 'reserveDuel'].includes(state.phase)) {
    const attempt = state.attempts[state.currentAttemptId ?? '']
    const kind =
      state.phase === 'teamCompetition'
        ? 'team'
        : state.phase === 'nomineeDuel'
          ? 'nominee'
          : 'reserve'
    requireState(
      attempt && attempt.kind === kind && attempt.status !== 'complete',
      'phase has no matching uncommitted competition'
    )
    const expected =
      kind === 'team'
        ? Object.values(state.frozenRosters).flat()
        : kind === 'nominee'
          ? state.nominees
          : [state.challengerId, state.reserveId]
    requireState(
      JSON.stringify([...attempt.participants].sort()) === JSON.stringify([...expected].sort()),
      'competition roster differs from its frozen context'
    )
  }
  for (const [actorId, targetId] of Object.entries(state.ballots)) {
    const members = Object.values(state.frozenRosters).find((roster) => roster.includes(actorId))
    requireState(actorId !== targetId && members?.includes(targetId), 'invalid saved secret ballot')
  }
  if (state.phase === 'capture')
    requireState(
      state.capture &&
        state.tribes.some(
          (tribe) =>
            tribe.id === state.capture!.recipientId && tribe.captainId === state.capture!.captainId
        ),
      'invalid capture authority'
    )
  if (state.phase === 'merge')
    requireState(
      state.merge &&
        state.merge.pool.length > 0 &&
        state.tribes.every(
          (tribe) =>
            tribe.members.length <= 4 && state.merge!.captains[tribe.id] === tribe.captainId
        ),
      'invalid merger draft'
    )
  if (state.endgame) validateTeamplayEndgame(state)
}
