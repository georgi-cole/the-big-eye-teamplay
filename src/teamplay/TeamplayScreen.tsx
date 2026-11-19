import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAppSelector } from '../store/hooks'
import { useI18n, type TranslationKey } from '../i18n'
import { applyTeamplayCommand, createTeamplay, draftTribe, humanBallotRequired } from './engine'
import { activeIds, socialActionDefinition } from './social'
import { canContinueIndividual, individualDecision } from './endgameRules'
import {
  exportTeamplaySave,
  listTeamplayArchives,
  loadTeamplay,
  readTeamplayArchive,
  saveTeamplay,
} from './persistence'
import { createTeamplayPreview } from './preview'
import { TeamplayIcon, TeamplayIntroHero, TeamplayRules } from './TeamplayPresentation'
import { teamplayEmblem } from './presentationTheme'
import TeamplayCastPicker from './TeamplayCastPicker'
import {
  BroadcastMonitor,
  ContestantDossier,
  EventsModule,
  GameDock,
  TribeRoster,
  type GameModule,
} from './TeamplayHub'
import TeamplaySocial from './TeamplaySocial'
import TeamplayEventScene from './TeamplayScenes'
import type { TeamplayAction, TeamplayPhase, TeamplayState } from './types'
import './teamplay.css'

const previewPhases: TeamplayPhase[] = [
  'opening',
  'teamCompetition',
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

const continueLabels: Partial<Record<TeamplayPhase, TranslationKey>> = {
  opening: 'teamplay.enterCompetition',
  teamResults: 'teamplay.nextSocial',
  socialOne: 'teamplay.nextBallot',
  ballots: 'teamplay.nextNominees',
  nominations: 'teamplay.nextSocial',
  socialTwo: 'teamplay.nextDuel',
  nomineeResult: 'teamplay.nextReserve',
  reserveResult: 'teamplay.continue',
  recap: 'teamplay.nextCycle',
}

type Location =
  | {
      view:
        | 'hub'
        | 'tribes'
        | 'events'
        | 'event'
        | 'season'
        | 'rules'
        | 'archive'
        | 'resources'
        | 'newSeason'
    }
  | { view: 'social'; targetId?: string }
  | { view: 'dossier'; contestantId: string; from: 'hub' | 'tribes' }

function defaultLocation(state: TeamplayState): Location {
  if (state.phase === 'opening' || state.phase === 'recap') return { view: 'hub' }
  if (state.endgame?.step === 'social' || ['socialOne', 'socialTwo'].includes(state.phase))
    return { view: 'social' }
  return { view: 'event' }
}

function tribalChooser(state: TeamplayState): string | undefined {
  if (state.phase === 'nominationTies') return state.cutoffs[0]?.captainId
  if (state.phase === 'capture') return state.capture?.captainId
  if (state.phase === 'merge') return state.merge?.captains[draftTribe(state)!.id]
}

function ResourceHistory({ state }: { state: TeamplayState }) {
  const { t } = useI18n()
  const entries = state.resources.filter((entry) => entry.playerId === state.humanId).reverse()
  if (!entries.length) return <p className="tp-empty">{t('teamplay.resources.empty')}</p>

  return (
    <ol className="tp-history">
      {entries.map((entry) => {
        const [kind, actionId] = entry.reason.split(':')
        const label = actionId
          ? t(kind === 'cost' ? 'teamplay.socialCost' : 'teamplay.socialYield', {
              action: socialActionDefinition(actionId)?.title ?? '',
            })
          : t(`teamplay.grant.${kind}` as TranslationKey)
        return (
          <li key={entry.id}>
            <strong>{label}</strong>
            {(['energy', 'influence', 'info'] as const)
              .filter((resource) => entry.requested[resource] !== 0)
              .map((resource) => (
                <p key={resource}>
                  {t('teamplay.resourceChange', {
                    resource: t(`teamplay.resource.${resource}`),
                    before: entry.before[resource],
                    after: entry.after[resource],
                    requested: entry.requested[resource],
                    credited: entry.credited[resource],
                    overflow: Math.max(0, entry.requested[resource] - entry.credited[resource]),
                  })}
                </p>
              ))}
          </li>
        )
      })}
    </ol>
  )
}

function TeamplayScreen({ scope, preview }: { scope: string; preview: boolean }) {
  const { t } = useI18n()
  const [state, setState] = useState<TeamplayState | null>(null)
  const latest = useRef<TeamplayState | null>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)
  const mounted = useRef(true)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recovered, setRecovered] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [reload, setReload] = useState(0)
  const [humanId, setHumanId] = useState('finn')
  const [scenario, setScenario] = useState<TeamplayPhase | 'intro' | ''>('')
  const [notice, setNotice] = useState<string | null>(null)
  const [archives, setArchives] = useState<ReturnType<typeof listTeamplayArchives>>([])
  const [navigation, setNavigation] = useState<{ scene: string; location: Location } | null>(null)

  const live = state && !(preview && scenario === 'intro') ? state : null
  const sceneKey = live ? `${live.id}:${live.cycle}:${live.phase}:${live.endgame?.step}` : ''
  const phaseLocation = live ? defaultLocation(live) : null
  const location = navigation?.scene === sceneKey ? navigation.location : phaseLocation
  const view = location?.view
  const module =
    view === 'hub' || view === 'tribes' || view === 'events' || view === 'social' ? view : null
  const detailId =
    location?.view === 'dossier'
      ? location.contestantId
      : location?.view === 'social'
        ? location.targetId
        : undefined

  useEffect(() => {
    const viewport = scroll.current
    if (!viewport) return
    viewport.scrollTop = 0
    viewport.querySelector<HTMLElement>('[data-view-title]')?.focus({ preventScroll: true })
  }, [sceneKey, view, detailId])

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

  function open(location: Location) {
    setNavigation({ scene: sceneKey, location })
  }

  async function commit(next: TeamplayState): Promise<boolean> {
    await saveTeamplay(scope, next, latest.current)
    latest.current = next
    if (mounted.current) {
      setState(next)
      setError(null)
      setNotice(null)
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
      let next: TeamplayState
      try {
        next = applyTeamplayCommand(current, { id, expectedRevision: current.revision, action })
      } catch (failure) {
        if (action.type !== 'tribe_social' && action.type !== 'social') throw failure
        if (mounted.current) setNotice(failure instanceof Error ? failure.message : String(failure))
        return false
      }
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
      setConfirmRestart(false)
      setNavigation(null)
      if (!scene) setScenario('')
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
      setNavigation(null)
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

  const human = live?.contestants.find((player) => player.id === live.humanId)
  const blocked = busy || !!error
  const chooser = live ? tribalChooser(live) : undefined
  const canDelegate =
    !!live &&
    (humanBallotRequired(live) ||
      chooser === live.humanId ||
      ((preview || live.phase !== 'tribunal') &&
        individualDecision(live)?.actorId === live.humanId))
  const canContinue =
    !!live &&
    (canContinueIndividual(live) ||
      (continueLabels[live.phase] !== undefined && !humanBallotRequired(live)))
  const isMainStage = view === phaseLocation?.view
  const canOpenStage = view === 'hub' && phaseLocation?.view !== 'hub'
  const autoContinue = !!chooser && chooser !== live?.humanId
  const primary =
    live &&
    (canOpenStage && phaseLocation
      ? {
          text:
            phaseLocation.view === 'social'
              ? t('teamplay.continueSocial')
              : t('teamplay.openEvent', { event: t(`teamplay.phase.${live.phase}`) }),
          run: () => open(phaseLocation),
        }
      : isMainStage && (canContinue || autoContinue)
        ? {
            text: t(
              live.phase === 'tribunal'
                ? 'teamplay.individual.reveal'
                : (continueLabels[live.phase] ?? 'teamplay.continue')
            ),
            run: () => void act({ type: autoContinue ? 'auto_choice' : 'continue' }),
          }
        : null)
  const canSkip =
    !!live &&
    live.reserveId === live.humanId &&
    live.phase !== 'reserveDuel' &&
    (view === 'hub' || view === 'event')
  const archivedSeasons = archives.filter((entry) => entry.id !== state?.id)

  function renderView(game: TeamplayState) {
    switch (location?.view) {
      case 'hub':
        return (
          <div className="tp-hub-content">
            <BroadcastMonitor state={game} onOpen={() => open({ view: 'events' })} />
            <TribeRoster
              state={game}
              onInspect={(contestantId) => open({ view: 'dossier', contestantId, from: 'hub' })}
            />
          </div>
        )
      case 'tribes':
        return (
          <TribeRoster
            state={game}
            expanded
            onInspect={(contestantId) => open({ view: 'dossier', contestantId, from: 'tribes' })}
          />
        )
      case 'dossier':
        return (
          <ContestantDossier
            state={game}
            id={location.contestantId}
            onBack={() => open({ view: location.from })}
            onTalk={(targetId) => open({ view: 'social', targetId })}
          />
        )
      case 'social':
        return (
          <TeamplaySocial
            state={game}
            act={act}
            busy={blocked}
            initialTarget={location.targetId}
            notice={notice}
          />
        )
      case 'events':
        return <EventsModule state={game} />
      case 'event':
        return (
          <TeamplayEventScene state={game} act={act} busy={blocked} canDelegate={canDelegate} />
        )
      case 'season':
        return (
          <section className="tp-season-menu">
            <h2 tabIndex={-1} data-view-title>
              {t('teamplay.season')}
            </h2>
            <button className="tp-menu-item" type="button" onClick={() => open({ view: 'rules' })}>
              <TeamplayIcon name="rules" />
              {t('teamplay.rules')}
              <span aria-hidden="true">›</span>
            </button>
            {!preview && (
              <button
                className="tp-menu-item"
                type="button"
                onClick={() => open({ view: 'archive' })}
              >
                <TeamplayIcon name="archive" />
                {t('teamplay.archive')}
                <span aria-hidden="true">›</span>
              </button>
            )}
            <button
              className="tp-menu-item"
              type="button"
              onClick={() => open({ view: 'resources' })}
            >
              <TeamplayIcon name="events" />
              {t('teamplay.receipts')}
              <span aria-hidden="true">›</span>
            </button>
            <button className="tp-quiet" type="button" disabled={busy} onClick={exportSave}>
              {t('teamplay.export')}
            </button>
            <button
              className="tp-quiet"
              type="button"
              disabled={busy}
              onClick={() => open({ view: 'newSeason' })}
            >
              {t('teamplay.newSeason')}
            </button>
          </section>
        )
      case 'rules':
        return (
          <>
            <h2 tabIndex={-1} data-view-title>
              {t('teamplay.rules')}
            </h2>
            <TeamplayRules />
          </>
        )
      case 'resources':
        return (
          <>
            <h2 tabIndex={-1} data-view-title>
              {t('teamplay.receipts')}
            </h2>
            <ResourceHistory state={game} />
          </>
        )
      case 'archive':
        return (
          <>
            <h2 tabIndex={-1} data-view-title>
              {t('teamplay.archive')}
            </h2>
            {archivedSeasons.length ? (
              <ol className="tp-history">
                {archivedSeasons.map((entry) => (
                  <li key={entry.id}>
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
                    <button
                      className="tp-quiet"
                      type="button"
                      disabled={busy}
                      onClick={() => void resumeArchive(entry.id)}
                    >
                      {t(entry.champion ? 'teamplay.archiveReview' : 'teamplay.archiveResume')}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tp-empty">{t('teamplay.season.empty')}</p>
            )}
          </>
        )
      case 'newSeason':
        return (
          <section className="tp-casting">
            <h2 tabIndex={-1} data-view-title>
              {t('teamplay.newSeason')}
            </h2>
            <p>{t('teamplay.restartWarning')}</p>
            <TeamplayCastPicker id={humanId} onPick={setHumanId} disabled={busy} />
            <button
              className="tp-primary"
              type="button"
              disabled={busy}
              onClick={() => void create()}
            >
              {t('teamplay.confirmRestart')}
            </button>
          </section>
        )
      default:
        return null
    }
  }

  return (
    <main className="teamplay-screen" data-view={view ?? 'casting'}>
      <div className="tp-device">
        <header className="tp-topbar">
          <Link
            className="tp-home-link"
            to={import.meta.env.VITE_TEAMPLAY_REVIEW === 'true' ? '/' : '/teamplay-hub'}
            aria-label={t('teamplay.home')}
          >
            <img src={teamplayEmblem} alt="" />
          </Link>
          <div className="tp-masthead">
            <strong>{t('teamplay.mode')}</strong>
            {live && (
              <p className="teamplay-count">
                {live.stage === 'individual'
                  ? t('teamplay.individual.report', {
                      count: live.individualIds.length,
                      members: live.jurors.length,
                    })
                  : t('teamplay.cycle', {
                      cycle: live.cycle,
                      active: activeIds(live).length,
                      contenders: live.contestants.length - live.eliminated.length,
                    })}
              </p>
            )}
          </div>
          {live && (
            <button
              className="tp-icon-button"
              type="button"
              disabled={busy}
              aria-label={t('teamplay.season')}
              onClick={() => open({ view: 'season' })}
            >
              <TeamplayIcon name="season" />
            </button>
          )}
        </header>
        {preview && (
          <div className="tp-qa">
            <select
              aria-label={t('teamplay.scenario')}
              value={scenario}
              disabled={busy || loading}
              onChange={(event) => {
                const next = event.target.value as TeamplayPhase | 'intro'
                setScenario(next)
                if (next !== 'intro') void create(next)
              }}
            >
              <option value="" disabled>
                {t('teamplay.scenario')}
              </option>
              <option value="intro">{t('teamplay.introScene')}</option>
              {previewPhases.map((phase) => (
                <option key={phase} value={phase}>
                  {t(`teamplay.phase.${phase}`)}
                </option>
              ))}
            </select>
            <button
              className="tp-quiet"
              type="button"
              disabled={busy || loading || !scenario || scenario === 'intro'}
              onClick={() => {
                if (scenario && scenario !== 'intro') void create(scenario)
              }}
            >
              {t('teamplay.resetScene')}
            </button>
          </div>
        )}
        {human && (
          <div className="tp-bank-strip">
            <ul className="tp-bank" aria-label={t('teamplay.resources')}>
              {(['energy', 'influence', 'info'] as const).map((resource) => (
                <li key={resource}>
                  <span>{t(`teamplay.resource.${resource}`)}</span>
                  <b>{human.bank[resource]}</b>
                </li>
              ))}
            </ul>
            {busy && (
              <span className="tp-save-state" role="status">
                {t('teamplay.saving')}
              </span>
            )}
          </div>
        )}
        <div className="teamplay-scroll tp-viewport" ref={scroll}>
          {recovered && (
            <p className="tp-note" role="status">
              {t('teamplay.recovered')}
            </p>
          )}
          {error && (
            <section className="tp-error" role="alert">
              <p>{error}</p>
              <p>{t('teamplay.recoveryHelp')}</p>
              <button type="button" className="tp-quiet" onClick={exportSave}>
                {t('teamplay.export')}
              </button>
              <button
                type="button"
                className="tp-quiet"
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
          ) : !live ? (
            <section className="tp-casting">
              <TeamplayIntroHero />
              <h2>{t('teamplay.castPicker')}</h2>
              <TeamplayCastPicker id={humanId} onPick={setHumanId} disabled={busy} />
              {confirmRestart && <p className="tp-note">{t('teamplay.restartWarning')}</p>}
              <button
                className="tp-primary"
                type="button"
                disabled={busy}
                onClick={() => (error && !confirmRestart ? setConfirmRestart(true) : void create())}
              >
                {t(confirmRestart ? 'teamplay.confirmRestart' : 'teamplay.begin')}
              </button>
            </section>
          ) : (
            <div className="tp-current-view" key={`${sceneKey}:${view}:${detailId ?? ''}`}>
              {!module && view !== 'dossier' && (
                <button
                  type="button"
                  className="tp-quiet tp-back"
                  disabled={busy}
                  onClick={() =>
                    open({ view: view === 'event' || view === 'season' ? 'hub' : 'season' })
                  }
                >
                  <span aria-hidden="true">‹</span>{' '}
                  {t(
                    view === 'event' || view === 'season' ? 'teamplay.backHub' : 'teamplay.season'
                  )}
                </button>
              )}
              {renderView(live)}
            </div>
          )}
        </div>
        {live && (
          <footer className="tp-footer">
            {(primary || canSkip) && (
              <div className="tp-next">
                {primary && (
                  <button
                    className="tp-primary"
                    type="button"
                    disabled={blocked}
                    onClick={primary.run}
                  >
                    {primary.text}
                    <span aria-hidden="true">›</span>
                  </button>
                )}
                {canSkip && (
                  <button
                    className="tp-quiet"
                    type="button"
                    disabled={blocked}
                    onClick={() => void act({ type: 'skip_to_defence' })}
                  >
                    {t('teamplay.skipDefence')}
                  </button>
                )}
              </div>
            )}
            {module && (
              <GameDock
                active={module}
                disabled={busy}
                onOpen={(next: GameModule) => open({ view: next })}
              />
            )}
          </footer>
        )}
      </div>
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
