import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAppSelector } from '../store/hooks'
import { getAll } from '../data/houseguests'
import { useI18n, type TranslationKey } from '../i18n'
import { normalizeActionCosts } from '../social/smExecNormalize'
import { tallyVotes } from '../utils/juryUtils'
import {
  applyTeamplayCommand,
  createTeamplay,
  currentAttempt,
  draftTribe,
  FLAGS,
  humanBallotRequired,
} from './engine'
import { activeIds, socialTargets, TEAMPLAY_SOCIAL_ACTIONS, tribeOf } from './social'
import { isIndividualCompetition, simulatedScore } from './competition'
import {
  canContinueIndividual,
  competitionForStep,
  currentRound,
  finalNominees,
  individualDecision,
} from './endgameRules'
import {
  exportTeamplaySave,
  listTeamplayArchives,
  loadTeamplay,
  readTeamplayArchive,
  saveTeamplay,
} from './persistence'
import { createTeamplayPreview } from './preview'
import TeamplayRace from './TeamplayRace'
import type { TeamplayAction, TeamplayPhase, TeamplayState } from './types'
import './teamplay.css'

type Act = (action: TeamplayAction) => Promise<boolean>
const nameOf = (state: TeamplayState, id: string | null) =>
  state.contestants.find((player) => player.id === id)?.name ?? '—'
const previewPhases: TeamplayPhase[] = [
  'opening',
  'teamResults',
  'socialOne',
  'ballots',
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
    <div className="teamplay-choice">
      {candidates.map((id) => (
        <label key={id}>
          <input
            type="checkbox"
            checked={selected.includes(id)}
            disabled={busy}
            onChange={() =>
              setSelected((current) =>
                current.includes(id)
                  ? current.filter((entry) => entry !== id)
                  : slots === 1
                    ? [id]
                    : [...current, id]
              )
            }
          />
          {nameOf(state, id)}
        </label>
      ))}
      <button disabled={busy || selected.length !== slots} onClick={() => onChoose(selected)}>
        {t('teamplay.confirmChoice')}
      </button>
    </div>
  )
}

function SocialPanel({ state, act, busy }: { state: TeamplayState; act: Act; busy: boolean }) {
  const { t } = useI18n()
  const targets = socialTargets(state, state.humanId)
  const [target, setTarget] = useState(targets[0] ?? '')
  const [actionId, setActionId] = useState('compliment')
  const action = TEAMPLAY_SOCIAL_ACTIONS.find((entry) => entry.id === actionId)!
  const cost = normalizeActionCosts(action, action.targetMode === 'none' ? 0 : 1)
  const bank = state.contestants.find((player) => player.id === state.humanId)!.bank
  const affordable = Object.entries(cost).every(
    ([key, value]) => bank[key as keyof typeof bank] >= value
  )
  return (
    <>
      <p>
        {t(
          state.endgame
            ? targets.length
              ? 'teamplay.individual.social'
              : 'teamplay.individual.spectator'
            : targets.length
              ? 'teamplay.socialHelp'
              : 'teamplay.noSocial'
        )}
      </p>
      {targets.length > 0 && (
        <>
          {!state.endgame && (
            <p>
              {t('teamplay.secondWind', {
                spent: Math.min(4, state.socialOneSpent[state.humanId] ?? 0),
              })}
            </p>
          )}
          <label>
            {t('teamplay.action')}
            <select
              value={actionId}
              disabled={busy}
              onChange={(event) => setActionId(event.target.value)}
            >
              {TEAMPLAY_SOCIAL_ACTIONS.map((entry) => (
                <option value={entry.id} key={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
          {action.targetMode !== 'none' && (
            <label>
              {t(state.endgame ? 'teamplay.individual.target' : 'teamplay.target')}
              <select
                value={target}
                disabled={busy}
                onChange={(event) => setTarget(event.target.value)}
              >
                {targets.map((id) => (
                  <option key={id} value={id}>
                    {nameOf(state, id)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            disabled={busy || !affordable}
            onClick={() =>
              void act({
                type: 'social',
                actorId: state.humanId,
                actionId,
                ...(action.targetMode === 'none' ? {} : { targetId: target }),
              })
            }
          >
            {t('teamplay.actionCost', cost)}
          </button>
        </>
      )}
      {state.socialActions
        .filter(
          (entry) =>
            entry.cycle === state.cycle &&
            entry.phase === state.phase &&
            (entry.actorId === state.humanId || entry.targetId === state.humanId)
        )
        .slice(-3)
        .map((entry) => (
          <p className="teamplay-note" key={entry.id}>
            {t('teamplay.socialOutcome', {
              actor: nameOf(state, entry.actorId),
              target: nameOf(state, entry.targetId),
              delta: entry.delta,
            })}
          </p>
        ))}
    </>
  )
}

function CompetitionPanel({ state, act, busy }: { state: TeamplayState; act: Act; busy: boolean }) {
  const { t } = useI18n()
  const attempt = currentAttempt(state)!
  const [confirmDelegate, setConfirmDelegate] = useState(false)
  const hasHuman = attempt.participants.includes(state.humanId)
  const individual = isIndividualCompetition(attempt.kind)
  return (
    <>
      <p>
        {t(
          individual
            ? 'teamplay.individual.race'
            : attempt.kind === 'team'
              ? 'teamplay.competitionHelp'
              : 'teamplay.tieHelp'
        )}
      </p>
      {attempt.kind !== 'team' && (
        <p className="teamplay-duel-names">
          {attempt.participants.map((id) => nameOf(state, id)).join(' · ')}
        </p>
      )}
      {attempt.replay === 1 && <p role="status">{t('teamplay.replayHelp')}</p>}
      {hasHuman ? (
        <>
          <TeamplayRace
            key={attempt.id}
            attempt={attempt}
            busy={busy}
            onStart={() => act({ type: 'start_attempt' })}
            onFinish={(score) => void act({ type: 'finish_attempt', attemptId: attempt.id, score })}
          />
          <details>
            <summary>{t('teamplay.delegateRace')}</summary>
            <p>
              {t('teamplay.delegatePreview', {
                score: simulatedScore(state, attempt, state.humanId),
              })}
            </p>
            {!confirmDelegate ? (
              <button
                disabled={busy || attempt.status === 'running'}
                onClick={() => setConfirmDelegate(true)}
              >
                {t('teamplay.delegateRace')}
              </button>
            ) : (
              <button disabled={busy} onClick={() => void act({ type: 'delegate_attempt' })}>
                {t('teamplay.confirmDelegate')}
              </button>
            )}
          </details>
        </>
      ) : (
        <button disabled={busy} onClick={() => void act({ type: 'resolve_attempt' })}>
          {t('teamplay.spectator')}
        </button>
      )}
    </>
  )
}

function BallotPanel({ state, act, busy }: { state: TeamplayState; act: Act; busy: boolean }) {
  const { t } = useI18n()
  const members = tribeOf(state, state.humanId)?.members.filter((id) => id !== state.humanId) ?? []
  const [target, setTarget] = useState(members[0] ?? '')
  return (
    <>
      <p>{t('teamplay.voteHelp')}</p>
      {humanBallotRequired(state) ? (
        <>
          <label>
            {t('teamplay.target')}
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              disabled={busy}
            >
              {members.map((id) => (
                <option key={id} value={id}>
                  {nameOf(state, id)}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy}
            onClick={() => void act({ type: 'vote', voterId: state.humanId, targetId: target })}
          >
            {t('teamplay.lockVote')}
          </button>
        </>
      ) : (
        <p>{t(state.ballots[state.humanId] ? 'teamplay.voteLocked' : 'teamplay.noVote')}</p>
      )}
    </>
  )
}

function DuelResult({ state, reserve }: { state: TeamplayState; reserve: boolean }) {
  const { t } = useI18n()
  const result = currentAttempt(state)!
  const winner = state.contestants.find((player) => player.id === result.winnerId)!
  return (
    <>
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
      <ul className="teamplay-result">
        {result.participants.map((id) => (
          <li key={id}>
            {nameOf(state, id)}
            <span>{result.scores[id]}</span>
          </li>
        ))}
      </ul>
      {result.priorityFallback && (
        <p>{t('teamplay.priorityApplied', { name: winner.name, priority: winner.priority })}</p>
      )}
    </>
  )
}

function IndividualScene({ state, act, busy }: { state: TeamplayState; act: Act; busy: boolean }) {
  const { t } = useI18n()
  const endgame = state.endgame!
  const round = currentRound(state)!
  const step = endgame.step
  const attempt = currentAttempt(state)
  const decision = individualDecision(state)
  const tally = step === 'finished' ? tallyVotes(endgame.votes) : {}
  if (step === 'social')
    return <SocialPanel key={state.phase} state={state} act={act} busy={busy} />
  if (step === 'finished') {
    return (
      <>
        <h3 className="teamplay-champion">
          {t('teamplay.individual.champion', { name: nameOf(state, endgame.championId) })}
        </h3>
        <ul className="teamplay-result">
          {endgame.placements.slice(0, 2).map((id) => (
            <li key={id}>
              {nameOf(state, id)}{' '}
              <span>{t('teamplay.individual.voteCount', { votes: tally[id] ?? 0 })}</span>
            </li>
          ))}
        </ul>
        <details>
          <summary>{t('teamplay.individual.voteRecord')}</summary>
          <ul>
            {state.jurors.map((id) => (
              <li key={id}>
                {t('teamplay.individual.ballotRecord', {
                  member: nameOf(state, id),
                  finalist: nameOf(state, endgame.votes[id]),
                })}
              </li>
            ))}
          </ul>
        </details>
        <details>
          <summary>{t('teamplay.individual.standings')}</summary>
          <ol>
            {endgame.placements.map((id) => (
              <li key={id}>{nameOf(state, id)}</li>
            ))}
          </ol>
        </details>
      </>
    )
  }

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
  const decisionKey = step === 'juryVote' ? 'tribunalPrompt' : step
  const help =
    decision && !['ballots', 'juryVote'].includes(step)
      ? t(`teamplay.individual.${decisionKey}` as TranslationKey, {
          actor: nameOf(state, decision.actorId),
          saved: nameOf(state, round.savedId),
        })
      : null
  return (
    <>
      {competitionTitle && <h3>{t(`teamplay.individual.${competitionTitle}`)}</h3>}
      {attempt?.status === 'complete' && !['departure', 'juryVote'].includes(step) && (
        <p>
          {t('teamplay.individual.scored', {
            winner: nameOf(state, attempt.winnerId!),
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
          {decision && <p>{t('teamplay.individual.tribunalPrompt')}</p>}
          {endgame.votes[state.humanId] && <p>{t('teamplay.voteLocked')}</p>}
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
      {help && <p>{help}</p>}
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

function Scene({ state, act, busy }: { state: TeamplayState; act: Act; busy: boolean }) {
  const { t, formatNumber } = useI18n()
  switch (state.phase) {
    case 'opening':
      return (
        <>
          <p>{t('teamplay.openingHelp')}</p>
          <p>{t('teamplay.milestoneEight')}</p>
          <p>{t('teamplay.milestoneFour')}</p>
        </>
      )
    case 'teamCompetition':
    case 'nomineeDuel':
    case 'reserveDuel':
      return (
        <CompetitionPanel key={currentAttempt(state)!.id} state={state} act={act} busy={busy} />
      )
    case 'teamResults':
      return (
        <>
          {state.teamResults.map((result, index) => (
            <div className="teamplay-result" key={result.tribeId}>
              <strong>
                {index + 1}. {state.tribes.find((tribe) => tribe.id === result.tribeId)?.name}
                {index === 0 ? ` · ${t('teamplay.immune')}` : ''}
              </strong>
              <p>
                {t('teamplay.teamArithmetic', {
                  total: result.total,
                  count: result.divisor,
                  mean: formatNumber(result.mean, { maximumFractionDigits: 2 }),
                })}
              </p>
              <ul>
                {result.members.map((id) => (
                  <li key={id}>
                    {nameOf(state, id)} <span>{currentAttempt(state)!.scores[id]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p>{t('teamplay.rankingHelp')}</p>
        </>
      )
    case 'socialOne':
    case 'socialTwo':
      return (
        <SocialPanel key={`${state.cycle}:${state.phase}`} state={state} act={act} busy={busy} />
      )
    case 'ballots':
      return <BallotPanel state={state} act={act} busy={busy} />
    case 'nominationTies': {
      const cutoff = state.cutoffs[0]
      return (
        <>
          <p>{t('teamplay.cutoffHelp', { count: cutoff.slots })}</p>
          <ChoicePanel
            key={cutoff.tribeId}
            state={state}
            candidates={cutoff.candidates}
            slots={cutoff.slots}
            busy={busy}
            onChoose={(ids) =>
              void act({ type: 'cutoff', tribeId: cutoff.tribeId, selectedIds: ids })
            }
          />
        </>
      )
    }
    case 'nominations':
      return (
        <>
          <p className="teamplay-duel-names">
            {state.nominees.map((id) => nameOf(state, id)).join(' · ')}
          </p>
          {Object.entries(state.totals).map(([id, votes]) => (
            <p key={id}>{t('teamplay.nominationTotal', { name: nameOf(state, id), votes })}</p>
          ))}
          {state.stage === 'twoTribes' && !Object.keys(state.totals).length && (
            <p>{t('teamplay.automaticPair')}</p>
          )}
        </>
      )
    case 'nomineeResult':
      return <DuelResult state={state} reserve={false} />
    case 'reserveResult':
      return <DuelResult state={state} reserve />
    case 'capture': {
      const pending = state.capture!
      const donor = state.tribes.find((tribe) => tribe.id === pending.donorId)!
      const recipient = state.tribes.find((tribe) => tribe.id === pending.recipientId)!
      return (
        <>
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
      return (
        <>
          <p>
            {t('teamplay.mergeHelp', {
              retired: FLAGS.find((flag) => flag.id === state.merge!.retiredId)!.name,
              tribe: tribe.name,
            })}
          </p>
          {state.merge!.captains[tribe.id] === state.humanId && (
            <ChoicePanel
              key={`${tribe.id}:${state.merge!.pool.length}`}
              state={state}
              candidates={state.merge!.pool}
              slots={1}
              busy={busy}
              onChoose={([playerId]) => void act({ type: 'draft', playerId })}
            />
          )}
        </>
      )
    }
    case 'recap':
      return (
        <p>
          {t('teamplay.recap', {
            exit: nameOf(state, state.lastExitId),
            reserve: nameOf(state, state.reserveId),
          })}
        </p>
      )
    case 'fusion':
      return <p>{t('teamplay.fusionHelp')}</p>
    case 'finalFive':
    case 'finalFour':
    case 'finalThree':
    case 'tribunal':
    case 'seasonComplete':
      return <IndividualScene state={state} act={act} busy={busy} />
  }
}

function TeamplayScreen({ scope, preview }: { scope: string; preview: boolean }) {
  const { t } = useI18n()
  const [state, setState] = useState<TeamplayState | null>(null)
  const latest = useRef<TeamplayState | null>(null)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recovered, setRecovered] = useState(false)
  const [restart, setRestart] = useState(false)
  const [reload, setReload] = useState(0)
  const [humanId, setHumanId] = useState('finn')
  const [scenario, setScenario] = useState<TeamplayPhase>('opening')
  const [confirmAuto, setConfirmAuto] = useState(false)
  const [archives, setArchives] = useState<ReturnType<typeof listTeamplayArchives>>([])

  useEffect(() => {
    mounted.current = true
    let cancelled = false
    void loadTeamplay(scope)
      .then((loaded) => {
        if (cancelled) return
        latest.current = loaded.state
        setState(loaded.state)
        setError(loaded.error)
        setRecovered(loaded.recovered)
        if (!preview) setArchives(listTeamplayArchives(scope))
        setLoading(false)
      })
      .catch((failure: unknown) => {
        if (!cancelled) {
          setError(String(failure))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
      mounted.current = false
    }
  }, [scope, reload, preview])

  async function commit(next: TeamplayState): Promise<boolean> {
    await saveTeamplay(scope, next, latest.current)
    latest.current = next
    if (mounted.current) {
      setState(next)
      setError(null)
      setConfirmAuto(false)
      if (!preview) setArchives(listTeamplayArchives(scope))
    }
    return true
  }

  async function act(action: TeamplayAction): Promise<boolean> {
    if (busyRef.current || !latest.current) return false
    busyRef.current = true
    setBusy(true)
    try {
      const current = latest.current
      const id =
        action.type === 'finish_attempt'
          ? `${action.attemptId}:finish`
          : `${current.id}:ui:${current.revision}:${action.type}`
      const next = applyTeamplayCommand(current, { id, expectedRevision: current.revision, action })
      return await commit(next)
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : String(failure))
      return false
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function create(scene?: TeamplayPhase): Promise<void> {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const next = scene
        ? await createTeamplayPreview(scene)
        : createTeamplay(crypto.getRandomValues(new Uint32Array(1))[0], humanId)
      await commit(next)
      setRestart(false)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  async function resumeArchive(id: string) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await commit(readTeamplayArchive(scope, id))
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : String(failure))
    } finally {
      busyRef.current = false
      if (mounted.current) setBusy(false)
    }
  }

  function exportSave() {
    const url = URL.createObjectURL(
      new Blob([exportTeamplaySave(scope)], { type: 'application/json' })
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'teamplay-save.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const human = state?.contestants.find((player) => player.id === state.humanId)
  const pendingChoice =
    state &&
    (humanBallotRequired(state) ||
      ['nominationTies', 'capture', 'merge'].includes(state.phase) ||
      (individualDecision(state)?.actorId === state.humanId &&
        (preview || state.phase !== 'tribunal')))
  const canContinue =
    state &&
    (canContinueIndividual(state) ||
      ([
        'opening',
        'teamResults',
        'socialOne',
        'ballots',
        'nominations',
        'socialTwo',
        'nomineeResult',
        'reserveResult',
        'recap',
      ].includes(state.phase) &&
        !humanBallotRequired(state)))
  const immuneId =
    state && !['reserveResult', 'capture', 'merge', 'recap', 'fusion'].includes(state.phase)
      ? state.teamResults[0]?.tribeId
      : undefined

  return (
    <main className="teamplay-screen">
      <header className="teamplay-header">
        <Link to="/">{t('teamplay.home')}</Link>
        <span>{t(preview ? 'teamplay.preview' : 'teamplay.development')}</span>
        <span role="status">{busy ? t('teamplay.saving') : t('teamplay.saved')}</span>
      </header>
      <div className="teamplay-scroll">
        <h1>{t('teamplay.title')}</h1>
        <p className="teamplay-subtitle">{t('teamplay.scope')}</p>
        {preview && (
          <section className="teamplay-panel">
            <p>{t('teamplay.previewHelp')}</p>
            <label>
              {t('teamplay.scenario')}
              <select
                value={scenario}
                disabled={busy || loading}
                onChange={(event) => {
                  const phase = event.target.value as TeamplayPhase
                  setScenario(phase)
                  void create(phase)
                }}
              >
                {previewPhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {t(`teamplay.phase.${phase}`)}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy || loading} onClick={() => void create(scenario)}>
              {t('teamplay.confirmChoice')}
            </button>
          </section>
        )}
        {recovered && <p role="status">{t('teamplay.recovered')}</p>}
        {error && (
          <section className="teamplay-error" role="alert">
            <p>{error}</p>
            <p>{t('teamplay.recoveryHelp')}</p>
            <button onClick={exportSave}>{t('teamplay.export')}</button>
            <button
              disabled={busy}
              onClick={() => {
                setLoading(true)
                setReload((value) => value + 1)
              }}
            >
              {t('teamplay.retry')}
            </button>
          </section>
        )}
        {loading ? (
          <p>{t('teamplay.loading')}</p>
        ) : !state ? (
          <section className="teamplay-panel">
            <label>
              {t('teamplay.chooseContestant')}
              <select
                value={humanId}
                onChange={(event) => setHumanId(event.target.value)}
                disabled={busy}
              >
                {getAll().map((player) => (
                  <option value={player.id} key={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy} onClick={() => (error ? setRestart(true) : void create())}>
              {t(error ? 'teamplay.newSeason' : 'teamplay.begin')}
            </button>
          </section>
        ) : (
          <>
            <p className="teamplay-count">
              {state.stage === 'individual'
                ? t('teamplay.individual.report', {
                    count: state.individualIds.length,
                    members: state.jurors.length,
                  })
                : t('teamplay.cycle', {
                    cycle: state.cycle,
                    active: activeIds(state).length,
                    contenders: 16 - state.eliminated.length,
                  })}
            </p>
            <section
              className="teamplay-panel teamplay-event"
              aria-label={t(`teamplay.phase.${state.phase}`)}
            >
              <h2>{t(`teamplay.phase.${state.phase}`)}</h2>
              {state.reserveId === state.humanId && state.phase !== 'reserveDuel' && (
                <button
                  disabled={busy || !!error}
                  onClick={() => void act({ type: 'skip_to_defence' })}
                >
                  {t('teamplay.skipDefence')}
                </button>
              )}
              <Scene state={state} act={act} busy={busy || !!error} />
              {pendingChoice && (
                <details>
                  <summary>{t('teamplay.autoChoice')}</summary>
                  <p>{t('teamplay.autoChoiceHelp')}</p>
                  <button disabled={busy || !!error} onClick={() => setConfirmAuto(true)}>
                    {t('teamplay.autoChoice')}
                  </button>
                  {confirmAuto && (
                    <button disabled={busy} onClick={() => void act({ type: 'auto_choice' })}>
                      {t('teamplay.confirmChoice')}
                    </button>
                  )}
                </details>
              )}
            </section>
            <div className="teamplay-roster" aria-label={t('teamplay.phase.opening')}>
              {state.tribes.map((tribe) => (
                <section
                  className="teamplay-tribe"
                  key={tribe.id}
                  style={{ borderColor: tribe.color }}
                >
                  <h3>
                    {tribe.name}{' '}
                    <span>
                      {tribe.members.length}
                      {immuneId === tribe.id ? ` · ${t('teamplay.immune')}` : ''}
                    </span>
                  </h3>
                  <ul>
                    {tribe.members.map((id) => {
                      const player = state.contestants.find((entry) => entry.id === id)!
                      return (
                        <li key={id}>
                          <img src={player.avatar} alt="" loading="lazy" />
                          <span>
                            {player.name}
                            {id === state.humanId ? ` · ${t('teamplay.you')}` : ''}
                            <small>
                              {tribe.captainId === id ? t('teamplay.captain') : ''}
                              {state.nominees.includes(id) &&
                              !['reserveResult', 'capture', 'merge', 'recap'].includes(state.phase)
                                ? ` ${t('teamplay.nominee')}`
                                : ''}
                            </small>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
              {state.reserveId && (
                <section className="teamplay-tribe teamplay-reserve">
                  <h3>{t('teamplay.reserve')}</h3>
                  <p>
                    {nameOf(state, state.reserveId)}
                    {state.reserveId === state.humanId ? ` · ${t('teamplay.you')}` : ''}
                  </p>
                </section>
              )}
              {state.individualIds.length > 0 && (
                <section className="teamplay-tribe teamplay-individual-roster">
                  <h3>{t('teamplay.individual.roster')}</h3>
                  <ul>
                    {state.individualIds.map((id) => {
                      const player = state.contestants.find((entry) => entry.id === id)!
                      return (
                        <li key={id}>
                          <img src={player.avatar} alt="" loading="lazy" />
                          {player.name}
                          {id === state.humanId ? ` · ${t('teamplay.you')}` : ''}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}
              {state.merge?.pool.length ? (
                <section className="teamplay-tribe">
                  <h3>{t('teamplay.phase.merge')}</h3>
                  <p>{state.merge.pool.map((id) => nameOf(state, id)).join(' · ')}</p>
                </section>
              ) : null}
            </div>
            <details className="teamplay-panel">
              <summary>{t('teamplay.priority', { priority: human!.priority })}</summary>
              <p>{t('teamplay.tieHelp')}</p>
              <p>{t('teamplay.flagPriority')}</p>
              <ol>
                {[...state.contestants]
                  .sort((a, b) => a.priority - b.priority)
                  .map((player) => (
                    <li key={player.id}>{player.name}</li>
                  ))}
              </ol>
            </details>
            <details className="teamplay-panel">
              <summary>{t('teamplay.history')}</summary>
              {state.history.map((entry) => (
                <div key={entry.cycle}>
                  <strong>
                    {t('teamplay.cycle', {
                      cycle: entry.cycle,
                      active: 15 - entry.cycle,
                      contenders: 16 - entry.cycle,
                    })}
                  </strong>
                  <p>
                    {t('teamplay.historyItem', {
                      exit: nameOf(state, entry.exitId),
                      reserve: nameOf(state, entry.reserveId),
                    })}
                  </p>
                </div>
              ))}
            </details>
            <details className="teamplay-panel">
              <summary>{t('teamplay.receipts')}</summary>
              {state.resources
                .filter((entry) => entry.playerId === state.humanId)
                .map((entry) => {
                  const [kind, actionId] = entry.reason.split(':')
                  const actionName =
                    TEAMPLAY_SOCIAL_ACTIONS.find((action) => action.id === actionId)?.title ?? ''
                  const label = actionId
                    ? t(kind === 'cost' ? 'teamplay.socialCost' : 'teamplay.socialYield', {
                        action: actionName,
                      })
                    : t(`teamplay.grant.${kind}` as TranslationKey)
                  return (
                    <div className="teamplay-result" key={entry.id}>
                      <strong>{label}</strong>
                      {(['energy', 'influence', 'info'] as const).map((resource) => (
                        <p key={resource}>
                          {t('teamplay.resourceChange', {
                            resource: t(`teamplay.resource.${resource}`),
                            before: entry.before[resource],
                            after: entry.after[resource],
                            requested: entry.requested[resource],
                            credited: entry.credited[resource],
                            overflow: Math.max(
                              0,
                              entry.requested[resource] - entry.credited[resource]
                            ),
                          })}
                        </p>
                      ))}
                    </div>
                  )
                })}
            </details>
            <div className="teamplay-secondary">
              <button disabled={busy} onClick={() => setRestart(true)}>
                {t('teamplay.newSeason')}
              </button>
              <button onClick={exportSave}>{t('teamplay.export')}</button>
            </div>
          </>
        )}
        {restart && (
          <section
            className="teamplay-panel"
            role="alertdialog"
            aria-label={t('teamplay.newSeason')}
          >
            <p>{t('teamplay.restartWarning')}</p>
            <label>
              {t('teamplay.chooseContestant')}
              <select
                value={humanId}
                onChange={(event) => setHumanId(event.target.value)}
                disabled={busy}
              >
                {getAll().map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy} onClick={() => void create()}>
              {t('teamplay.confirmRestart')}
            </button>
            <button onClick={() => setRestart(false)}>{t('teamplay.cancel')}</button>
          </section>
        )}
        {archives.some((entry) => entry.id !== state?.id) && (
          <details className="teamplay-panel">
            <summary>{t('teamplay.archive')}</summary>
            <ul>
              {archives
                .filter((entry) => entry.id !== state?.id)
                .map((entry) => (
                  <li key={entry.id} className="teamplay-result">
                    <p>
                      {entry.champion
                        ? t('teamplay.archiveChampion', {
                            contestant: entry.contestant,
                            champion: entry.champion,
                          })
                        : t('teamplay.archivePending', {
                            contestant: entry.contestant,
                            stage: t(`teamplay.phase.${entry.phase}`),
                          })}
                    </p>
                    <button disabled={busy} onClick={() => void resumeArchive(entry.id)}>
                      {t(entry.champion ? 'teamplay.archiveReview' : 'teamplay.archiveResume')}
                    </button>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </div>
      {state && (
        <footer className="teamplay-footer">
          <p>
            {t('teamplay.bank', { ...human!.bank })}
            {state.reserveId === state.humanId
              ? ` · ${t('teamplay.reserve')}`
              : state.eliminated.includes(state.humanId)
                ? ` · ${t('teamplay.eliminated')}`
                : ''}
          </p>
          {canContinue && (
            <button disabled={busy || !!error} onClick={() => void act({ type: 'continue' })}>
              {t(state.phase === 'tribunal' ? 'teamplay.individual.reveal' : 'teamplay.continue')}
            </button>
          )}
        </footer>
      )}
    </main>
  )
}

export default function TeamplayEntry({ preview = false }: { preview?: boolean }) {
  const profile = useAppSelector((state) =>
    state.profiles.isGuest ? 'guest' : (state.profiles.activeProfileId ?? 'guest')
  )
  const scope = `${preview ? 'preview' : 'play'}:${profile}`
  return <TeamplayScreen key={scope} scope={scope} preview={preview} />
}
