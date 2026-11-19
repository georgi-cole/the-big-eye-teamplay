import { applyTeamplayCommand, createTeamplay, currentAttempt, humanBallotRequired } from './engine'
import { competitionForStep, individualDecision } from './endgameRules'
import type { TeamplayAction, TeamplayPhase, TeamplayState } from './types'

export function delegatedPreviewAction(state: TeamplayState): TeamplayAction {
  if (
    competitionForStep(state) ||
    ['teamCompetition', 'nomineeDuel', 'reserveDuel'].includes(state.phase)
  )
    return {
      type: currentAttempt(state)!.participants.includes(state.humanId)
        ? 'delegate_attempt'
        : 'resolve_attempt',
    }
  if (
    individualDecision(state)?.actorId === state.humanId ||
    humanBallotRequired(state) ||
    ['nominationTies', 'capture', 'merge'].includes(state.phase)
  )
    return { type: 'auto_choice' }
  return { type: 'continue' }
}

/** Test scenes are reached through real, receipted commands, never an invented
 * roster or a global mutable Redux probe. Each context uses its pinned seed. */
export async function createTeamplayPreview(target: TeamplayPhase): Promise<TeamplayState> {
  // These runs give Finn meaningful human decisions in the individual scenes:
  // seed 4 reaches the Tribunal, and seed 11 qualifies for Final Three.
  const seed =
    target === 'capture'
      ? 7
      : target === 'finalThree'
        ? 11
        : ['fusion', 'finalFive', 'finalFour', 'tribunal', 'seasonComplete'].includes(target)
          ? 4
          : 42
  let state = createTeamplay(seed, 'finn', 'teamplay-preview')
  for (let index = 0; index < 500; index++) {
    if (state.phase === target) return state
    // A forced merger can finish without a draft choice screen.
    if (target === 'merge' && state.stage === 'twoTribes' && state.phase === 'recap') return state
    if (state.phase === 'seasonComplete') break
    state = applyTeamplayCommand(state, {
      id: `preview:${index}`,
      expectedRevision: state.revision,
      action: delegatedPreviewAction(state),
    })
    if (index % 12 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  throw new Error('This seeded season does not contain that decision. Choose another scene.')
}
