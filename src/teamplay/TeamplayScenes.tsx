import { useState } from 'react'
import { useI18n, type TranslationKey } from '../i18n'
import { tallyVotes } from '../utils/juryUtils'
import { currentAttempt, draftTribe, FLAGS, humanBallotRequired } from './engine'
import { isIndividualCompetition, simulatedScore } from './competition'
import { competitionForStep, currentRound, finalNominees, individualDecision } from './endgameRules'
import { AvatarPicker, ContestantPortrait, DuelMatchup } from './TeamplayPresentation'
import { nameOf, teamplayEmblem, tribeAccent } from './presentationTheme'
import { tribeOf } from './social'
import TeamplayRace from './TeamplayRace'
import type { TeamplayAction, TeamplayPhase, TeamplayState } from './types'

type SceneProps = {
  state: TeamplayState
  act: (action: TeamplayAction) => Promise<boolean>
  busy: boolean
}

function ChoicePanel({
  state,
  candidates,
  slots,
  onChoose,
  busy,
}: {
  state: TeamplayState
  candidates: string[]
  slots: number
  onChoose: (ids: string[]) => void
  busy: boolean
}) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<string[]>([])
  return (
    <div className="tp-choice">
      <AvatarPicker
        state={state}
        candidates={candidates}
        label={t('teamplay.scene.contestants')}
        selected={selected}
        disabled={busy}
        multiple={slots > 1}
        limit={slots}
        onPick={(id) =>
          setSelected((current) =>
            slots === 1
              ? [id]
              : current.includes(id)
                ? current.filter((entry) => entry !== id)
                : [...current, id]
          )
        }
      />
      <button
        className="tp-primary"
        type="button"
        disabled={busy || selected.length !== slots}
        onClick={() => onChoose(selected)}
      >
        {t('teamplay.confirmChoice')}
      </button>
    </div>
  )
}

function CompetitionPanel({ state, act, busy }: SceneProps) {
  const { t } = useI18n()
  const attempt = currentAttempt(state)!
  const [delegate, setDelegate] = useState(false)
  const human = attempt.participants.includes(state.humanId)
  const individual = isIndividualCompetition(attempt.kind)
  return (
    <div className="tp-competition">
      <div className="tp-competition-intro">
        {attempt.kind === 'team' && <h3>{t('teamplay.quickTap')}</h3>}
        {!individual && attempt.kind !== 'team' && <DuelMatchup state={state} />}
        {individual && (
          <div className="tp-scene-lineup">
            {attempt.participants.map((id) => (
              <ContestantPortrait key={id} state={state} id={id} />
            ))}
          </div>
        )}
        <p>
          {t(
            individual
              ? 'teamplay.individual.race'
              : attempt.kind === 'team'
                ? 'teamplay.competitionHelp'
                : attempt.kind === 'reserve'
                  ? 'teamplay.reserveStakes'
                  : 'teamplay.nomineeStakes'
          )}
        </p>
        {attempt.replay === 1 && (
          <p className="tp-note" role="status">
            {t('teamplay.replayHelp')}
          </p>
        )}
      </div>
      {!human ? (
        <button
          type="button"
          className="tp-primary"
          disabled={busy}
          onClick={() => void act({ type: 'resolve_attempt' })}
        >
          {t('teamplay.spectator')}
        </button>
      ) : delegate ? (
        <div className="tp-confirm">
          <p>
            {t('teamplay.delegatePreview', {
              score: simulatedScore(state, attempt, state.humanId),
            })}
          </p>
          <button
            type="button"
            className="tp-primary"
            disabled={busy}
            onClick={() => void act({ type: 'delegate_attempt' })}
          >
            {t('teamplay.confirmDelegate')}
          </button>
          <button
            type="button"
            className="tp-quiet"
            disabled={busy}
            onClick={() => setDelegate(false)}
          >
            {t('teamplay.cancel')}
          </button>
        </div>
      ) : (
        <>
          <TeamplayRace
            key={attempt.id}
            attempt={attempt}
            busy={busy}
            onStart={() => act({ type: 'start_attempt' })}
            onFinish={(score) => void act({ type: 'finish_attempt', attemptId: attempt.id, score })}
          />
          {attempt.status === 'ready' && (
            <button
              type="button"
              className="tp-quiet"
              disabled={busy}
              onClick={() => setDelegate(true)}
            >
              {t('teamplay.delegateRace')}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function TeamResults({ state }: { state: TeamplayState }) {
  const { t, formatNumber } = useI18n()
  const [scores, setScores] = useState(false)
  return (
    <>
      <div className="tp-segments" role="group" aria-label={t('teamplay.scene.ranking')}>
        <button type="button" aria-pressed={!scores} onClick={() => setScores(false)}>
          {t('teamplay.tribes')}
        </button>
        <button type="button" aria-pressed={scores} onClick={() => setScores(true)}>
          {t('teamplay.scoreBreakdown')}
        </button>
      </div>
      {!scores ? (
        <ol className="tp-results">
          {state.teamResults.map((result, index) => {
            const tribe = state.tribes.find(({ id }) => id === result.tribeId)!
            return (
              <li key={tribe.id} style={tribeAccent(tribe)} data-winner={index === 0 || undefined}>
                <span className="tp-rank">{index + 1}</span>
                <div>
                  <strong>{tribe.name}</strong>
                  {index === 0 && <small>{t('teamplay.immune')}</small>}
                  <p>
                    {t('teamplay.captain')} · {nameOf(state, tribe.captainId)}
                  </p>
                </div>
                <b>{formatNumber(result.mean, { maximumFractionDigits: 2 })}</b>
              </li>
            )
          })}
        </ol>
      ) : (
        <>
          <ol className="tp-score-list">
            {state.individualOrder.map((id) => (
              <li key={id}>
                <span>{nameOf(state, id)}</span> <b>{currentAttempt(state)!.scores[id]}</b>
              </li>
            ))}
          </ol>
          <p>{t('teamplay.rankingHelp')}</p>
        </>
      )}
    </>
  )
}

function BallotPanel({ state, act, busy }: SceneProps) {
  const { t } = useI18n()
  const members = tribeOf(state, state.humanId)?.members.filter((id) => id !== state.humanId) ?? []
  const [target, setTarget] = useState('')
  if (!humanBallotRequired(state)) {
    return (
      <p className="tp-note">
        {t(state.ballots[state.humanId] ? 'teamplay.voteLocked' : 'teamplay.noVote')}
      </p>
    )
  }
  return (
    <>
      <p>{t('teamplay.voteHelp')}</p>
      <AvatarPicker
        state={state}
        candidates={members}
        label={t('teamplay.target')}
        selected={target ? [target] : []}
        onPick={setTarget}
        disabled={busy}
      />
      <button
        type="button"
        className="tp-primary"
        disabled={busy || !members.includes(target)}
        onClick={() => void act({ type: 'vote', voterId: state.humanId, targetId: target })}
      >
        {t('teamplay.lockVote')}
      </button>
    </>
  )
}

function NomineeReveal({ state }: { state: TeamplayState }) {
  const { t } = useI18n()
  const [tally, setTally] = useState(false)
  const totals = Object.entries(state.totals)
  return (
    <>
      {!!totals.length && (
        <div className="tp-segments" role="group" aria-label={t('teamplay.phase.nominations')}>
          <button type="button" aria-pressed={!tally} onClick={() => setTally(false)}>
            {t('teamplay.phase.nominations')}
          </button>
          <button type="button" aria-pressed={tally} onClick={() => setTally(true)}>
            {t('teamplay.voteTotals')}
          </button>
        </div>
      )}
      {tally ? (
        <ol className="tp-score-list">
          {totals.map(([id, votes]) => (
            <li key={id}>
              <span>{nameOf(state, id)}</span> <b>{t('teamplay.weightedVotes', { votes })}</b>
            </li>
          ))}
        </ol>
      ) : (
        <div className="teamplay-matchup" data-arena="nominations">
          {state.nominees.map((id) => (
            <ContestantPortrait
              key={id}
              state={state}
              id={id}
              detail={tribeOf(state, id)?.name}
              score={state.totals[id]}
            />
          ))}
        </div>
      )}
      {state.stage === 'twoTribes' && !totals.length && <p>{t('teamplay.automaticPair')}</p>}
    </>
  )
}

function DuelResult({ state, reserve }: { state: TeamplayState; reserve: boolean }) {
  const { t } = useI18n()
  const result = currentAttempt(state)!
  const winner = state.contestants.find((entry) => entry.id === result.winnerId)!
  return (
    <>
      <DuelMatchup state={state} scores />
      <p>
        {reserve
          ? t('teamplay.reserveResult', {
              reserve: nameOf(state, state.reserveId),
              exit: nameOf(state, state.lastExitId),
            })
          : t('teamplay.nomineeResult', {
              winner: nameOf(state, state.nomineeWinnerId),
              challenger: nameOf(state, state.challengerId),
            })}
      </p>
      {result.priorityFallback && (
        <p className="tp-note">
          {t('teamplay.priorityApplied', { name: winner.name, priority: winner.priority })}
        </p>
      )}
    </>
  )
}

function SeasonResult({ state }: { state: TeamplayState }) {
  const { t } = useI18n()
  const endgame = state.endgame!
  const voteTally = tallyVotes(endgame.votes)
  const [record, setRecord] = useState<'winner' | 'votes' | 'placements'>('winner')
  return (
    <>
      <h3 className="teamplay-champion">
        {t('teamplay.individual.champion', { name: nameOf(state, endgame.championId) })}
      </h3>
      <div className="tp-segments" role="group" aria-label={t('teamplay.scene.finale')}>
        <button
          type="button"
          aria-pressed={record === 'winner'}
          onClick={() => setRecord('winner')}
        >
          {t('teamplay.duelWinner')}
        </button>
        <button type="button" aria-pressed={record === 'votes'} onClick={() => setRecord('votes')}>
          {t('teamplay.individual.voteRecord')}
        </button>
        <button
          type="button"
          aria-pressed={record === 'placements'}
          onClick={() => setRecord('placements')}
        >
          {t('teamplay.individual.standings')}
        </button>
      </div>
      {record === 'winner' && (
        <div className="teamplay-matchup" data-arena="champion">
          {endgame.placements.slice(0, 2).map((id) => (
            <ContestantPortrait
              key={id}
              state={state}
              id={id}
              winner={id === endgame.championId}
              detail={t('teamplay.individual.voteCount', { votes: voteTally[id] ?? 0 })}
            />
          ))}
        </div>
      )}
      {record === 'votes' && (
        <ol className="tp-score-list">
          {state.jurors.map((id) => (
            <li key={id}>
              {t('teamplay.individual.ballotRecord', {
                member: nameOf(state, id),
                finalist: nameOf(state, endgame.votes[id]),
              })}
            </li>
          ))}
        </ol>
      )}
      {record === 'placements' && (
        <ol className="tp-score-list">
          {endgame.placements.map((id, index) => (
            <li key={id}>
              <span>{nameOf(state, id)}</span>
              <b>#{index + 1}</b>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

function IndividualScene({ state, act, busy }: SceneProps) {
  const { t } = useI18n()
  const endgame = state.endgame!
  const round = currentRound(state)!
  const step = endgame.step
  const attempt = currentAttempt(state)
  const decision = individualDecision(state)
  if (step === 'finished') return <SeasonResult state={state} />

  const attemptKind = competitionForStep(state)
  const competitionTitle =
    attemptKind === 'fiveLoh' || attemptKind === 'fourLoh'
      ? 'loh'
      : attemptKind === 'fivePos' || attemptKind === 'fourPos'
        ? 'pos'
        : attemptKind
  const isPowerRound = state.phase === 'finalFive' || state.phase === 'finalFour'
  const nominees =
    step === 'replace' || step === 'pos' ? round.initialNominees : finalNominees(round)
  const showNominees = isPowerRound && !['loh', 'nominate', 'departure'].includes(step)
  return (
    <>
      {competitionTitle && <h3>{t(`teamplay.individual.${competitionTitle}`)}</h3>}
      {attempt?.status === 'complete' && !['departure', 'juryVote'].includes(step) && (
        <p className="tp-note">
          {t('teamplay.individual.scored', {
            winner: nameOf(state, attempt.winnerId),
            score: attempt.scores[attempt.winnerId!],
          })}
        </p>
      )}
      {showNominees && (
        <p>
          {t('teamplay.individual.block', {
            names: nominees.map((id) => nameOf(state, id)).join(' · '),
          })}
        </p>
      )}
      {attemptKind && <CompetitionPanel key={attempt!.id} state={state} act={act} busy={busy} />}
      {step === 'ballots' && <p>{t('teamplay.individual.ballots')}</p>}
      {step === 'juryVote' && (
        <>
          <p>{t('teamplay.individual.tribunal')}</p>
          {decision && <p className="tp-note">{t('teamplay.individual.tribunalPrompt')}</p>}
          {endgame.votes[state.humanId] && <p className="tp-note">{t('teamplay.voteLocked')}</p>}
          {!decision && (
            <div className="teamplay-matchup" data-arena="tribunal">
              {state.individualIds.map((id) => (
                <ContestantPortrait key={id} state={state} id={id} />
              ))}
            </div>
          )}
        </>
      )}
      {step === 'departure' && (
        <p>
          {t('teamplay.individual.departure', {
            name: nameOf(state, state.lastExitId),
            place: t(`teamplay.individual.place.${(state.individualIds.length + 1) as 3 | 4 | 5}`),
          })}
        </p>
      )}
      {decision && !['ballots', 'juryVote'].includes(step) && (
        <p>
          {t(`teamplay.individual.${step}` as TranslationKey, {
            actor: nameOf(state, decision.actorId),
            saved: nameOf(state, round.savedId),
          })}
        </p>
      )}
      {decision?.actorId === state.humanId && (
        <>
          {!!decision.candidates.length && (
            <ChoicePanel
              key={`${state.phase}:${step}`}
              state={state}
              candidates={decision.candidates}
              slots={decision.slots}
              onChoose={(selectedIds) => void act({ type: 'individual_choice', selectedIds })}
              busy={busy}
            />
          )}
          {step === 'safety' && (
            <button
              className="tp-quiet"
              type="button"
              disabled={busy}
              onClick={() => void act({ type: 'individual_choice', selectedIds: [] })}
            >
              {t('teamplay.individual.decline')}
            </button>
          )}
        </>
      )}
    </>
  )
}

function SceneContent({ state, act, busy }: SceneProps) {
  const { t } = useI18n()
  switch (state.phase) {
    case 'teamCompetition':
    case 'nomineeDuel':
    case 'reserveDuel':
      return (
        <CompetitionPanel key={currentAttempt(state)!.id} state={state} act={act} busy={busy} />
      )
    case 'teamResults':
      return <TeamResults state={state} />
    case 'ballots':
      return <BallotPanel state={state} act={act} busy={busy} />
    case 'nominationTies': {
      const cutoff = state.cutoffs[0]
      return (
        <>
          <p>{t('teamplay.cutoffHelp', { count: cutoff.slots })}</p>
          {cutoff.captainId === state.humanId && (
            <ChoicePanel
              key={cutoff.tribeId}
              state={state}
              candidates={cutoff.candidates}
              slots={cutoff.slots}
              busy={busy}
              onChoose={(selectedIds) =>
                void act({ type: 'cutoff', tribeId: cutoff.tribeId, selectedIds })
              }
            />
          )}
        </>
      )
    }
    case 'nominations':
      return <NomineeReveal state={state} />
    case 'nomineeResult':
    case 'reserveResult':
      return <DuelResult state={state} reserve={state.phase === 'reserveResult'} />
    case 'capture': {
      const pending = state.capture!
      const donor = state.tribes.find((tribe) => tribe.id === pending.donorId)!
      const recipient = state.tribes.find((tribe) => tribe.id === pending.recipientId)!
      return (
        <>
          <div className="tp-transfer">
            <span style={tribeAccent(donor)}>{donor.name}</span>
            <b aria-hidden="true">→</b>
            <span style={tribeAccent(recipient)}>{recipient.name}</span>
          </div>
          <p>{t('teamplay.captureHelp', { donor: donor.name, recipient: recipient.name })}</p>
          {pending.captainId === state.humanId && (
            <ChoicePanel
              state={state}
              candidates={donor.members}
              slots={1}
              busy={busy}
              onChoose={([playerId]) => void act({ type: 'capture', playerId })}
            />
          )}
        </>
      )
    }
    case 'merge': {
      const tribe = draftTribe(state)!
      const merge = state.merge!
      return (
        <>
          <p>
            {t('teamplay.mergeHelp', {
              retired: FLAGS.find((flag) => flag.id === merge.retiredId)!.name,
              tribe: tribe.name,
            })}
          </p>
          {merge.captains[tribe.id] === state.humanId && (
            <ChoicePanel
              key={`${tribe.id}:${merge.pool.length}`}
              state={state}
              candidates={merge.pool}
              slots={1}
              busy={busy}
              onChoose={([playerId]) => void act({ type: 'draft', playerId })}
            />
          )}
        </>
      )
    }
    case 'fusion':
      return (
        <>
          <div className="tp-scene-lineup">
            {state.individualIds.map((id) => (
              <ContestantPortrait key={id} state={state} id={id} />
            ))}
          </div>
          <p>{t('teamplay.fusionHelp')}</p>
        </>
      )
    case 'finalFive':
    case 'finalFour':
    case 'finalThree':
    case 'tribunal':
    case 'seasonComplete':
      return <IndividualScene state={state} act={act} busy={busy} />
    default:
      return null
  }
}

function sceneTheme(phase: TeamplayPhase) {
  switch (phase) {
    case 'teamResults':
      return 'ranking'
    case 'teamCompetition':
      return 'tribal'
    case 'ballots':
    case 'nominationTies':
    case 'nominations':
      return 'vote'
    case 'nomineeDuel':
    case 'nomineeResult':
      return 'duel'
    case 'reserveDuel':
    case 'reserveResult':
      return 'reserve'
    case 'capture':
    case 'merge':
      return 'transfers'
    case 'tribunal':
    case 'seasonComplete':
    case 'finalThree':
      return 'finale'
    default:
      return 'ceremony'
  }
}

export default function TeamplayEventScene({
  state,
  act,
  busy,
  canDelegate,
}: SceneProps & { canDelegate: boolean }) {
  const { t } = useI18n()
  const [confirm, setConfirm] = useState(false)
  const title = t(`teamplay.phase.${state.phase}`)
  const theme = sceneTheme(state.phase)
  return (
    <section
      className="teamplay-event tp-scene"
      data-scene={theme}
      data-phase={state.phase}
      aria-label={title}
    >
      <div className="tp-scene-header">
        <img src={teamplayEmblem} alt="" />
        <div>
          <span>{t(`teamplay.scene.${theme}`)}</span>
          <h2 tabIndex={-1} data-view-title>
            {title}
          </h2>
        </div>
      </div>
      <div className="tp-scene-content">
        <SceneContent state={state} act={act} busy={busy} />
        {canDelegate &&
          (confirm ? (
            <div className="tp-confirm">
              <p>{t('teamplay.autoChoiceHelp')}</p>
              <button
                type="button"
                className="tp-quiet"
                disabled={busy}
                onClick={async () => {
                  if (await act({ type: 'auto_choice' })) setConfirm(false)
                }}
              >
                {t('teamplay.scene.confirmAuto')}
              </button>
              <button
                type="button"
                className="tp-quiet"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                {t('teamplay.cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="tp-quiet"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              {t('teamplay.scene.auto')}
            </button>
          ))}
      </div>
    </section>
  )
}
