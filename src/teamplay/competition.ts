import { getMinigameAiModel, simulateMinigameAiScore } from '../ai/competition'
import type {
  Attempt,
  IndividualCompetitionKind,
  TeamCompetitionKind,
  TeamplayState,
} from './types'

export const INDIVIDUAL_COMPETITIONS = [
  'fiveLoh',
  'fivePos',
  'fourLoh',
  'fourPos',
  'partOne',
  'partTwo',
  'partThree',
] as const

export function isIndividualCompetition(kind: Attempt['kind']): kind is IndividualCompetitionKind {
  return INDIVIDUAL_COMPETITIONS.some((entry) => entry === kind)
}

export function seedFor(seed: number, label: string): number {
  let hash = seed >>> 0
  for (const letter of label) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0
  return hash || 1
}

export function simulatedScore(state: TeamplayState, attempt: Attempt, playerId: string): number {
  const player = state.contestants.find((entry) => entry.id === playerId)!
  return simulateMinigameAiScore({
    gameKey: 'quickTap',
    seed: attempt.seed,
    playerId,
    participantIndex: state.castOrder.indexOf(playerId),
    profile: player.profile,
    seasonState: state.competitionState[playerId],
    timeLimitSeconds: attempt.duration,
    minigameModel: getMinigameAiModel('quickTap'),
  })
}

export function prepareAttempt(
  state: TeamplayState,
  kind: TeamCompetitionKind,
  replay: 0 | 1 = 0
): Attempt {
  const participants =
    kind === 'team'
      ? Object.values(state.frozenRosters).flat()
      : kind === 'nominee'
        ? [...state.nominees]
        : [state.challengerId!, state.reserveId!]
  if (
    !participants.length ||
    new Set(participants).size !== participants.length ||
    participants.some((id) => !id)
  )
    throw new Error('Invalid competition roster')
  if (kind !== 'team' && participants.length !== 2)
    throw new Error('A duel requires exactly two contestants')
  const context = state.plan[state.cycle - 1][kind]
  return freezeAttempt(state, {
    id: `${state.id}:${state.cycle}:${kind}:${replay}`,
    kind,
    seed: replay ? context.replaySeed : context.seed,
    replay,
    participants,
  })
}

export function individualAttemptId(state: TeamplayState, kind: IndividualCompetitionKind) {
  return `${state.id}:individual:${kind}:0`
}

export function individualAttemptSeed(state: TeamplayState, kind: IndividualCompetitionKind) {
  return seedFor(state.seed, `classic-endgame-v1:${kind}`)
}

export function prepareIndividualAttempt(
  state: TeamplayState,
  kind: IndividualCompetitionKind,
  participants: string[]
): void {
  freezeAttempt(state, {
    id: individualAttemptId(state, kind),
    kind,
    seed: individualAttemptSeed(state, kind),
    replay: 0,
    participants: [...participants],
  })
}

function freezeAttempt(
  state: TeamplayState,
  context: Pick<Attempt, 'id' | 'kind' | 'seed' | 'replay' | 'participants'>
): Attempt {
  const attempt: Attempt = {
    ...context,
    game: 'quickTap',
    duration: 30,
    scores: {},
    status: 'ready',
    delegated: false,
  }
  for (const id of attempt.participants)
    if (id !== state.humanId) attempt.scores[id] = simulatedScore(state, attempt, id)
  state.attempts[attempt.id] = attempt
  state.currentAttemptId = attempt.id
  return attempt
}

export function rankIndividualAttempt(state: TeamplayState, attempt: Attempt): string[] {
  const priorities = new Map(state.contestants.map((player) => [player.id, player.priority]))
  return [...attempt.participants].sort(
    (a, b) => attempt.scores[b] - attempt.scores[a] || priorities.get(a)! - priorities.get(b)!
  )
}

export function rankIndividuals(state: TeamplayState, attempt: Attempt): string[] {
  const rank = (id: string) => {
    const previous = state.previousIndividualOrder.indexOf(id)
    return previous < 0 ? Infinity : previous
  }
  const priority = (id: string) => state.contestants.find((player) => player.id === id)!.priority
  return [...attempt.participants].sort(
    (a, b) =>
      attempt.scores[b] - attempt.scores[a] || rank(a) - rank(b) || priority(a) - priority(b)
  )
}

export function resolveTeamOrder(state: TeamplayState, attempt: Attempt): void {
  state.individualOrder = rankIndividuals(state, attempt)
  const previousRank = (id: string) => {
    const index = state.previousTeamOrder.indexOf(id)
    return index < 0 ? Infinity : index
  }
  const priority = (id: string) => state.tribes.find((tribe) => tribe.id === id)!.priority
  state.teamResults = state.tribes
    .map((tribe) => {
      const members = [...state.frozenRosters[tribe.id]]
      const total = members.reduce((sum, id) => sum + attempt.scores[id], 0)
      return {
        tribeId: tribe.id,
        members,
        total,
        divisor: members.length,
        mean: total / members.length,
        best: Math.max(...members.map((id) => attempt.scores[id])),
      }
    })
    .sort(
      (a, b) =>
        // Cross multiplication avoids rounded means deciding a result.
        b.total * a.divisor - a.total * b.divisor ||
        b.best - a.best ||
        previousRank(a.tribeId) - previousRank(b.tribeId) ||
        priority(a.tribeId) - priority(b.tribeId)
    )
  for (const tribe of state.tribes)
    tribe.captainId = state.individualOrder.find((id) => tribe.members.includes(id))!
}
