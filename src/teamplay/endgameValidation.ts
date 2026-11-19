import { classicFinalThreeEntrants, classicLohEntrants } from '../rules/classicEndgame'
import { determineWinner, tallyVotes } from '../utils/juryUtils'
import { INDIVIDUAL_COMPETITIONS, individualAttemptId } from './competition'
import {
  competitionForStep,
  finalFiveVoters,
  finalNominees,
  highestBallotTargets,
  replacementPool,
} from './endgameRules'
import type { EndgameStep, IndividualCompetitionKind, PowerRound, TeamplayState } from './types'

const FIVE_STEPS = [
  'social',
  'loh',
  'nominate',
  'pos',
  'safety',
  'replace',
  'ballots',
  'tie',
  'departure',
] as const
const FOUR_STEPS = ['social', 'loh', 'nominate', 'pos', 'soleVote', 'departure'] as const
const THREE_STEPS = [
  'partOne',
  'partTwoReady',
  'partTwo',
  'partThreeReady',
  'partThree',
  'cut',
  'departure',
] as const

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Teamplay checkpoint: ${message}`)
}

function sameOrder(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function validateTeamplayEndgame(state: TeamplayState) {
  const endgame = state.endgame!
  check(endgame.version === 1, 'unsupported save/rules/competition version; original save retained')
  check(
    state.cycle === 11 && state.history.length === 11,
    'individual play requires eleven team departures'
  )
  const last = state.history.at(-1)!
  const expectedQualifiers = [
    ...last.teamResults.flatMap((entry) => entry.members).filter((id) => id !== last.challengerId),
    last.reserveId,
  ]
  check(
    Array.isArray(endgame.qualifiers) &&
      endgame.qualifiers.length === 5 &&
      sameOrder([...endgame.qualifiers].sort(), expectedQualifiers.sort()),
    'Final Five qualifiers differ from the last reserve defence'
  )
  check(
    !state.tribes.length &&
      state.reserveId === null &&
      !state.capture &&
      !state.merge &&
      !state.teamResults.length &&
      !state.nominees.length &&
      !state.cutoffs.length &&
      !Object.keys(state.frozenRosters).length &&
      !Object.keys(state.ballots).length &&
      !state.nomineeWinnerId &&
      !state.challengerId,
    'a team power persisted after fusion'
  )
  const trackedAttempts = new Set<string>()
  function attempt(kind: IndividualCompetitionKind, entrants: string[], complete: boolean) {
    const id = individualAttemptId(state, kind)
    const found = state.attempts[id]
    check(
      found && found.kind === kind && sameOrder(found.participants, entrants),
      `invalid ${kind} competition roster`
    )
    check((found.status === 'complete') === complete, `invalid ${kind} competition status`)
    if (!complete) check(state.currentAttemptId === id, `missing active ${kind} attempt`)
    trackedAttempts.add(id)
    return found.winnerId ?? null
  }
  function validateRound(
    round: PowerRound,
    entrants: string[],
    step: EndgameStep,
    size: 5 | 4,
    outgoing: string[]
  ) {
    check(
      round && round.size === size && sameOrder(round.entrants, entrants),
      'invalid Classic round roster'
    )
    const steps: readonly EndgameStep[] = size === 5 ? FIVE_STEPS : FOUR_STEPS
    const index = steps.indexOf(step)
    check(index >= 0, 'invalid Classic round phase')
    const reached = (milestone: EndgameStep) => index >= steps.indexOf(milestone)
    const loh = reached('loh')
      ? attempt(
          size === 5 ? 'fiveLoh' : 'fourLoh',
          classicLohEntrants(entrants, outgoing),
          reached('nominate')
        )
      : null
    check(round.lohId === loh, 'LOH differs from the committed score')
    check(
      round.initialNominees.length === (reached('pos') ? 2 : 0) &&
        new Set(round.initialNominees).size === round.initialNominees.length &&
        round.initialNominees.every((id) => entrants.includes(id) && id !== loh),
      'invalid initial nominees'
    )
    const pos = reached('pos')
      ? attempt(size === 5 ? 'fivePos' : 'fourPos', entrants, step !== 'pos')
      : null
    check(round.posId === pos, 'POS differs from the committed score')
    check((step === 'departure') === Boolean(round.exitId), 'individual departure is not committed')
    if (size === 4) {
      check(
        !round.savedId && !round.replacementId && !Object.keys(round.ballots).length,
        'Final Four must use the sole POS vote'
      )
      if (round.exitId)
        check(finalNominees(round).includes(round.exitId), 'illegal Final Four eviction')
      return
    }
    check(
      !round.savedId ||
        (reached('replace') &&
          round.initialNominees.includes(round.savedId) &&
          replacementPool(round).length > 0),
      'invalid saved nominee'
    )
    if (step === 'replace')
      check(round.savedId && !round.replacementId, 'no nominee awaits replacement')
    if (round.savedId && reached('ballots'))
      check(
        round.replacementId && replacementPool(round).includes(round.replacementId),
        'invalid replacement nominee'
      )
    else check(!round.replacementId, 'unexpected replacement nominee')

    const ballots = Object.entries(round.ballots)
    const voters = reached('ballots') ? finalFiveVoters(round) : []
    const targets = finalNominees(round)
    check(
      ballots.every(([actor, target]) => voters.includes(actor) && targets.includes(target)),
      'invalid Classic eviction ballot'
    )
    if (step === 'ballots')
      check(
        ballots.every(([actor]) => actor === state.humanId),
        'AI ballots were resolved before the tally'
      )
    if (reached('tie'))
      check(ballots.length === voters.length && voters.length === 2, 'incomplete eviction tally')
    if (step === 'tie') check(highestBallotTargets(round).length === 2, 'invalid LOH tiebreak')
    if (round.exitId)
      check(
        highestBallotTargets(round).includes(round.exitId),
        'eviction contradicts the Final Five tally'
      )
  }

  check(
    Array.isArray(endgame.rounds) &&
      Array.isArray(endgame.partWinners) &&
      Array.isArray(endgame.placements) &&
      endgame.votes,
    'missing endgame records'
  )
  const laterThanFive = state.phase !== 'finalFive'
  const inFinalThree = state.phase === 'finalThree'
  const atTribunal = state.phase === 'tribunal'
  const finished = state.phase === 'seasonComplete'
  check(endgame.rounds.length === (laterThanFive ? 2 : 1), 'invalid number of Classic power rounds')
  const five = endgame.rounds[0]
  validateRound(five, endgame.qualifiers, laterThanFive ? 'departure' : endgame.step, 5, [])
  const fourEntrants = endgame.qualifiers.filter((id) => id !== five.exitId)
  const four = endgame.rounds[1]
  if (laterThanFive)
    validateRound(four, fourEntrants, state.phase === 'finalFour' ? endgame.step : 'departure', 4, [
      five.lohId!,
    ])
  const threeEntrants = fourEntrants.filter((id) => id !== four?.exitId)
  if (inFinalThree || atTribunal || finished) {
    const step = inFinalThree
      ? THREE_STEPS.indexOf(endgame.step as (typeof THREE_STEPS)[number])
      : THREE_STEPS.length - 1
    check(step >= 0, 'invalid Final Three phase')
    const first = attempt('partOne', classicFinalThreeEntrants(threeEntrants, 1), step > 0)
    const second =
      step >= 2
        ? attempt('partTwo', classicFinalThreeEntrants(threeEntrants, 2, first!), step > 2)
        : null
    const third =
      step >= 4
        ? attempt(
            'partThree',
            classicFinalThreeEntrants(threeEntrants, 3, first!, second!),
            step > 4
          )
        : null
    check(
      sameOrder(endgame.partWinners, [first, second, third].filter(Boolean)),
      'Final Three winners differ from their competitions'
    )
    if (step === THREE_STEPS.length - 1)
      check(
        endgame.thirdPlaceId &&
          endgame.thirdPlaceId !== third &&
          threeEntrants.includes(endgame.thirdPlaceId),
        'invalid third-place cut'
      )
    else check(!endgame.thirdPlaceId, 'third place was assigned before the cut')
  } else
    check(
      !endgame.partWinners.length && !endgame.thirdPlaceId,
      'Final Three began before qualification'
    )

  for (const kind of INDIVIDUAL_COMPETITIONS) {
    const id = individualAttemptId(state, kind)
    check(!state.attempts[id] || trackedAttempts.has(id), `unexpected ${kind} competition`)
  }
  const pending = competitionForStep(state)
  if (!pending && state.currentAttemptId)
    check(
      trackedAttempts.has(state.currentAttemptId) &&
        state.attempts[state.currentAttemptId].status === 'complete',
      'unexpected live competition'
    )
  const departures = [five.exitId, four?.exitId, endgame.thirdPlaceId].filter(Boolean)
  check(
    sameOrder(state.eliminated.slice(11), departures),
    'individual departures differ from the season record'
  )
  check(
    sameOrder(
      state.individualIds,
      threeEntrants.filter((id) => id !== endgame.thirdPlaceId)
    ),
    'invalid remaining individual contestants'
  )

  const votes = Object.entries(endgame.votes)
  if (finished || atTribunal) {
    check(
      state.jurors.length === 9 && state.individualIds.length === 2,
      'invalid Final Two or Tribunal roster'
    )
    check(
      votes.every(
        ([juror, finalist]) =>
          state.jurors.includes(juror) && state.individualIds.includes(finalist)
      ),
      'invalid Tribunal ballot'
    )
  } else check(!votes.length, 'Tribunal ballots cast before the Final Two')
  if (finished) {
    const winner = determineWinner(tallyVotes(endgame.votes), state.individualIds)
    check(
      endgame.step === 'finished' && votes.length === 9 && winner && winner === endgame.championId,
      'champion differs from nine valid votes'
    )
    check(
      sameOrder(endgame.placements, [
        winner,
        state.individualIds.find((id) => id !== winner),
        ...[...state.eliminated].reverse(),
      ]),
      'invalid saved placements'
    )
  } else {
    if (atTribunal)
      check(
        endgame.step === 'juryVote' && votes.every(([juror]) => juror === state.humanId),
        'invalid pending Tribunal state'
      )
    check(
      !endgame.championId && !endgame.placements.length,
      'season result revealed before the Tribunal'
    )
  }
}
