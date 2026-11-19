import { classicFinalFourNominees } from '../rules/classicEndgame'
import { tallyVotes } from '../utils/juryUtils'
import type { IndividualCompetitionKind, PowerRound, TeamplayState } from './types'

export function currentRound(state: TeamplayState): PowerRound | undefined {
  return state.endgame?.rounds.at(-1)
}

export function replacementPool(round: PowerRound): string[] {
  return round.entrants.filter(
    (id) => id !== round.lohId && id !== round.posId && !round.initialNominees.includes(id)
  )
}

export function finalNominees(round: PowerRound): string[] {
  if (round.size === 4 && round.posId)
    return classicFinalFourNominees(round.entrants, round.lohId, round.posId, round.initialNominees)
  return round.initialNominees.map((id) => (id === round.savedId ? round.replacementId! : id))
}

export function finalFiveVoters(round: PowerRound): string[] {
  const nominees = finalNominees(round)
  return round.entrants.filter((id) => id !== round.lohId && !nominees.includes(id))
}

export function highestBallotTargets(round: PowerRound): string[] {
  const totals = tallyVotes(round.ballots)
  const nominees = finalNominees(round)
  const high = Math.max(...nominees.map((id) => totals[id] ?? 0))
  return nominees.filter((id) => (totals[id] ?? 0) === high)
}

export function competitionForStep(state: TeamplayState): IndividualCompetitionKind | undefined {
  switch (state.endgame?.step) {
    case 'loh':
      return state.phase === 'finalFive' ? 'fiveLoh' : 'fourLoh'
    case 'pos':
      return state.phase === 'finalFive' ? 'fivePos' : 'fourPos'
    case 'partOne':
      return 'partOne'
    case 'partTwo':
      return 'partTwo'
    case 'partThree':
      return 'partThree'
  }
}

export interface IndividualDecision {
  actorId: string
  candidates: string[]
  slots: number
}

/** The same legal choices drive rendering, commands, and save validation. */
export function individualDecision(state: TeamplayState): IndividualDecision | undefined {
  const endgame = state.endgame
  if (!endgame) return
  const round = currentRound(state)!
  switch (endgame.step) {
    case 'nominate':
      return {
        actorId: round.lohId!,
        candidates: round.entrants.filter((id) => id !== round.lohId),
        slots: 2,
      }
    case 'safety':
      return {
        actorId: round.posId!,
        candidates: replacementPool(round).length ? round.initialNominees : [],
        slots: 1,
      }
    case 'replace':
      return { actorId: round.lohId!, candidates: replacementPool(round), slots: 1 }
    case 'ballots':
      if (finalFiveVoters(round).includes(state.humanId) && !round.ballots[state.humanId])
        return { actorId: state.humanId, candidates: finalNominees(round), slots: 1 }
      return
    case 'tie':
      return { actorId: round.lohId!, candidates: highestBallotTargets(round), slots: 1 }
    case 'soleVote':
      return { actorId: round.posId!, candidates: finalNominees(round), slots: 1 }
    case 'cut':
      return {
        actorId: endgame.partWinners[2],
        candidates: state.individualIds.filter((id) => id !== endgame.partWinners[2]),
        slots: 1,
      }
    case 'juryVote':
      if (state.jurors.includes(state.humanId) && !endgame.votes[state.humanId])
        return { actorId: state.humanId, candidates: state.individualIds, slots: 1 }
      return
  }
}

export function canContinueIndividual(state: TeamplayState): boolean {
  if (state.phase === 'fusion') return true
  if (!state.endgame || state.endgame.step === 'finished' || competitionForStep(state)) return false
  return individualDecision(state)?.actorId !== state.humanId
}
