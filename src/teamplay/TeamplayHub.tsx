import { useState } from 'react'
import { getAll } from '../data/houseguests'
import { useI18n } from '../i18n'
import { ContestantPortrait, CyclePath, TeamplayIcon } from './TeamplayPresentation'
import { nameOf, tribeAccent } from './presentationTheme'
import { socialTargets, tribeOf } from './social'
import { personalBroadcasts, publicBroadcasts, type Broadcast } from './eventFeed'
import type { TeamplayState } from './types'

export type GameModule = 'hub' | 'tribes' | 'social' | 'events'

export function GameDock({
  active,
  onOpen,
  disabled,
}: {
  active: GameModule
  onOpen: (module: GameModule) => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  return (
    <nav className="tp-dock" aria-label={t('teamplay.navigation')}>
      {(['hub', 'tribes', 'social', 'events'] as const).map((module) => (
        <button
          key={module}
          type="button"
          aria-pressed={active === module}
          disabled={disabled}
          onClick={() => onOpen(module)}
        >
          <TeamplayIcon name={module} />
          <span>{t(`teamplay.${module}`)}</span>
        </button>
      ))}
    </nav>
  )
}

function BroadcastCopy({ entry }: { entry: Broadcast }) {
  const { t } = useI18n()
  return (
    <>
      <strong>
        {typeof entry.title === 'string' ? entry.title : t(entry.title.key, entry.title.values)}
      </strong>
      {entry.body && <p>{t(entry.body.key, entry.body.values)}</p>}
    </>
  )
}

export function BroadcastMonitor({ state, onOpen }: { state: TeamplayState; onOpen: () => void }) {
  const { t } = useI18n()
  const latest = publicBroadcasts(state)[0]
  return (
    <section className="tp-monitor" aria-label={t('teamplay.broadcast')}>
      <div className="tp-monitor-head">
        <span>{t('teamplay.onAir')}</span>
        <button className="tp-quiet" type="button" onClick={onOpen}>
          {t('teamplay.events')} <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="tp-monitor-title">
        <span>{t('teamplay.currentEvent')}</span>
        <h2 tabIndex={-1} data-view-title>
          {t(`teamplay.phase.${state.phase}`)}
        </h2>
      </div>
      <div className="tp-monitor-message" key={latest.id} data-tone={latest.tone} role="status">
        <TeamplayIcon name="events" />
        <div>
          <BroadcastCopy entry={latest} />
        </div>
      </div>
      <CyclePath phase={state.phase} />
    </section>
  )
}

export function EventsModule({ state }: { state: TeamplayState }) {
  const { t } = useI18n()
  const [personal, setPersonal] = useState(false)
  const entries = personal ? personalBroadcasts(state) : publicBroadcasts(state)
  return (
    <>
      <h2 tabIndex={-1} data-view-title>
        {t('teamplay.events')}
      </h2>
      <div className="tp-segments" role="group" aria-label={t('teamplay.events')}>
        <button type="button" aria-pressed={!personal} onClick={() => setPersonal(false)}>
          {t('teamplay.events.public')}
        </button>
        <button type="button" aria-pressed={personal} onClick={() => setPersonal(true)}>
          {t('teamplay.events.personal')}
        </button>
      </div>
      {entries.length ? (
        <ol className="tp-feed">
          {entries.map((entry) => (
            <li key={entry.id} data-tone={entry.tone}>
              {entry.contestantId ? (
                <img
                  className="tp-feed-avatar"
                  src={state.contestants.find((player) => player.id === entry.contestantId)?.avatar}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <TeamplayIcon name="events" />
              )}
              <div>
                <small>{t('teamplay.cycleLabel', { cycle: entry.cycle })}</small>
                <BroadcastCopy entry={entry} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="tp-empty">{t('teamplay.events.empty')}</p>
      )}
    </>
  )
}

export function TribeRoster({
  state,
  onInspect,
  expanded = false,
}: {
  state: TeamplayState
  onInspect: (id: string) => void
  expanded?: boolean
}) {
  const { t } = useI18n()
  const home = tribeOf(state, state.humanId)
  const [picked, setPicked] = useState<string | null>(null)
  const tribe = state.tribes.find((entry) => entry.id === picked) ?? home ?? state.tribes[0]
  const currentTribes = !['reserveResult', 'capture', 'merge', 'recap', 'fusion'].includes(
    state.phase
  )
  const immune = currentTribes ? state.teamResults[0]?.tribeId : undefined
  const members = tribe?.members ?? state.individualIds
  return (
    <section className="tp-roster" style={tribeAccent(tribe)} aria-label={t('teamplay.roster')}>
      <div className="tp-roster-head">
        {expanded ? (
          <h2 tabIndex={-1} data-view-title>
            {t(state.stage === 'individual' ? 'teamplay.individual.roster' : 'teamplay.tribes')}
          </h2>
        ) : (
          <h3>
            {t(state.stage === 'individual' ? 'teamplay.individual.roster' : 'teamplay.roster')}
          </h3>
        )}
        {tribe && tribe.id === home?.id && <span>{t('teamplay.yourTribe')}</span>}
      </div>
      {!!state.tribes.length && (
        <ul className="tp-tribe-tabs" aria-label={t('teamplay.tribes')}>
          {state.tribes.map((entry) => (
            <li key={entry.id} style={tribeAccent(entry)}>
              <button
                type="button"
                aria-pressed={entry.id === tribe?.id}
                onClick={() => setPicked(entry.id)}
              >
                <span className="tp-tribe-flag" aria-hidden="true" />
                {entry.name}
                <small aria-label={t('teamplay.memberCount', { count: entry.members.length })}>
                  {entry.members.length}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {tribe && tribe.id === immune && (
        <p className="tp-tribe-immune">{t('teamplay.roster.immunity')}</p>
      )}
      <div className="teamplay-home-lineup tp-lineup">
        {members.map((id) => (
          <button
            type="button"
            key={id}
            className="tp-roster-person"
            aria-label={t('teamplay.roster.pick', { name: nameOf(state, id) })}
            onClick={() => onInspect(id)}
          >
            <ContestantPortrait
              state={state}
              id={id}
              mark={tribe?.captainId === id ? t('teamplay.roster.captainMark') : undefined}
              detail={
                currentTribes && state.nominees.includes(id) ? t('teamplay.nominee') : undefined
              }
            />
          </button>
        ))}
      </div>
      {state.reserveId && (
        <button
          className="tp-reserve-seat tp-quiet"
          type="button"
          onClick={() => onInspect(state.reserveId!)}
        >
          <span>{t('teamplay.reserve')}</span>
          <strong>{nameOf(state, state.reserveId)}</strong>
          <span aria-hidden="true">›</span>
        </button>
      )}
      {expanded &&
        (
          [
            [state.merge?.pool ?? [], 'teamplay.roster.draft'],
            [state.eliminated, 'teamplay.roster.out'],
          ] as const
        ).map(([ids, label]) =>
          ids.length ? (
            <section className="tp-roster-secondary" key={label}>
              <h3>{t(label)}</h3>
              <ul>
                {ids.map((id) => (
                  <li key={id}>
                    <button type="button" className="tp-quiet" onClick={() => onInspect(id)}>
                      {nameOf(state, id)} <span aria-hidden="true">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null
        )}
    </section>
  )
}

export function ContestantDossier({
  state,
  id,
  onTalk,
  onBack,
}: {
  state: TeamplayState
  id: string
  onTalk: (id: string) => void
  onBack: () => void
}) {
  const { t } = useI18n()
  const tribe = tribeOf(state, id)
  const profile = getAll().find((entry) => entry.id === id)
  const status =
    state.reserveId === id
      ? t('teamplay.reserve')
      : state.jurors.includes(id)
        ? t('teamplay.roster.juror')
        : state.eliminated.includes(id)
          ? t('teamplay.roster.out')
          : (tribe?.name ?? t('teamplay.roster.inPlay'))
  return (
    <section className="tp-dossier">
      <button className="tp-quiet tp-back" type="button" onClick={onBack}>
        <span aria-hidden="true">‹</span> {t('teamplay.tribes')}
      </button>
      <div className="tp-dossier-main" style={tribeAccent(tribe)}>
        <img src={state.contestants.find((entry) => entry.id === id)?.avatar} alt="" />
        <div>
          <p>{status}</p>
          <h2 tabIndex={-1} data-view-title>
            {nameOf(state, id)}
          </h2>
          {profile && <p>{profile.profession}</p>}
          {!!tribe && tribe.captainId === id && <p>{t('teamplay.captain')}</p>}
        </div>
      </div>
      {profile?.motto && <blockquote>{profile.motto}</blockquote>}
      {socialTargets(state, state.humanId).includes(id) && (
        <button className="tp-primary" type="button" onClick={() => onTalk(id)}>
          {t('teamplay.roster.openSocial', { name: nameOf(state, id) })}
        </button>
      )}
    </section>
  )
}
