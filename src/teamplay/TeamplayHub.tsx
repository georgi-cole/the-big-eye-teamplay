import { useState } from 'react'
import { getAll } from '../data/houseguests'
import { useI18n } from '../i18n'
import { SoundManager } from '../services/sound/SoundManager'
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
          onClick={() => {
            void SoundManager.play('ui:navigate')
            onOpen(module)
          }}
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
  const headline =
    typeof latest.title === 'string' ? latest.title : t(latest.title.key, latest.title.values)
  return (
    <section className="tp-monitor" aria-label={t('teamplay.broadcast')}>
      <h2 tabIndex={-1} data-view-title>
        {t(`teamplay.phase.${state.phase}`)}
      </h2>
      <button className="tp-monitor-message" data-tone={latest.tone} type="button" onClick={onOpen}>
        <TeamplayIcon name="events" />
        <span className="tp-visually-hidden">{t('teamplay.events')}</span>
        <span role="status">
          {state.phase === 'opening' ? t('teamplay.openingSignal') : <strong>{headline}</strong>}
        </span>
        <span className="tp-chevron" aria-hidden="true" />
      </button>
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
  const currentTribes =
    state.stage !== 'individual' &&
    !['reserveResult', 'capture', 'merge', 'recap', 'fusion'].includes(state.phase)
  const immune = currentTribes ? state.teamResults[0]?.tribeId : undefined
  const bands = state.tribes.length
    ? state.tribes.map((tribe) => ({ tribe, members: tribe.members }))
    : [{ tribe: undefined, members: state.individualIds }]
  const reserve = state.contestants.find((player) => player.id === state.reserveId)
  return (
    <section className="tp-roster" aria-label={t('teamplay.roster')}>
      {expanded && (
        <h2 tabIndex={-1} data-view-title>
          {t(state.stage === 'individual' ? 'teamplay.individual.roster' : 'teamplay.tribes')}
        </h2>
      )}
      <ul
        className="tp-roster-bands"
        aria-label={t('teamplay.tribes')}
        data-count={state.tribes.length}
      >
        {bands.map(({ tribe, members }) => {
          const home = !!tribe && members.includes(state.humanId)
          const safe = !!tribe && tribe.id === immune
          return (
            <li
              key={tribe?.id ?? 'individual'}
              className="tp-tribe-band"
              data-tribe={tribe?.id}
              data-home={home || undefined}
              style={tribeAccent(tribe)}
            >
              {tribe && (
                <div className="tp-tribe-name">
                  <span className="tp-tribe-sigil" aria-hidden="true" />
                  <strong>{tribe.name}</strong>
                  {home && <span className="tp-visually-hidden">{t('teamplay.yourTribe')}</span>}
                  {safe && (
                    <span className="tp-tribe-immune" title={t('teamplay.roster.immunity')}>
                      {t('teamplay.roster.safe')}
                    </span>
                  )}
                </div>
              )}
              <div
                className="tp-lineup"
                role="group"
                aria-label={tribe?.name ?? t('teamplay.individual.roster')}
              >
                {members.map((id) => {
                  const captain = tribe?.captainId === id
                  const nominee = currentTribes && state.nominees.includes(id)
                  const status = [
                    id === state.humanId ? t('teamplay.you') : '',
                    captain ? t('teamplay.captain') : '',
                    nominee ? t('teamplay.nominee') : '',
                  ]
                    .filter(Boolean)
                    .join(', ')
                  return (
                    <button
                      type="button"
                      key={id}
                      className="tp-roster-person"
                      aria-label={t('teamplay.roster.pick', { name: nameOf(state, id) })}
                      aria-description={status || undefined}
                      onClick={() => onInspect(id)}
                    >
                      <ContestantPortrait
                        state={state}
                        id={id}
                        captain={captain}
                        nominee={nominee}
                      />
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
      {reserve && (
        <button
          className="tp-reserve-seat tp-quiet"
          type="button"
          onClick={() => onInspect(reserve.id)}
        >
          <img src={reserve.avatar} alt="" />
          <strong>{reserve.name}</strong>
          <span className="tp-reserve-label">{t('teamplay.reserve')}</span>
          <span className="tp-chevron" aria-hidden="true" />
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
                      {nameOf(state, id)} <span className="tp-chevron" aria-hidden="true" />
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
