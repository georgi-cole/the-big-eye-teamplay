import { applyTeamplayCommand, createTeamplay, currentAttempt, humanBallotRequired } from './engine'
import type { TeamplayAction, TeamplayPhase, TeamplayState } from './types'

export function delegatedPreviewAction(state: TeamplayState): TeamplayAction {
  if (['teamCompetition', 'nomineeDuel', 'reserveDuel'].includes(state.phase))
    return {
      type: currentAttempt(state)!.participants.includes(state.humanId)
        ? 'delegate_attempt'
        : 'resolve_attempt',
    }
  if (humanBallotRequired(state) || ['nominationTies', 'capture', 'merge'].includes(state.phase))
    return { type: 'auto_choice' }
  return { type: 'continue' }
}

/** Test scenes are reached through real, receipted commands, never an invented
 * roster or a global mutable Redux probe. Each context uses its pinned seed. */
export async function createTeamplayPreview(target: TeamplayPhase): Promise<TeamplayState> {
  // Seed 7 naturally opens a capture in cycle 5; seed 42 covers the other
  // published scenes. Neither fixture alters native scores or roster rules.
  let state = createTeamplay(target === 'capture' ? 7 : 42, 'finn', 'teamplay-preview')
  for (let index = 0; index < 500; index++) {
    if (state.phase === target) return state
    // A forced merger can finish without a draft choice screen.
    if (target === 'merge' && state.stage === 'twoTribes' && state.phase === 'recap') return state
    if (state.phase === 'fusion') break
    state = applyTeamplayCommand(state, {
      id: `preview:${index}`,
      expectedRevision: state.revision,
      action: delegatedPreviewAction(state),
    })
    if (index % 12 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  throw new Error('This seeded season does not contain that decision. Choose another scene.')
}
