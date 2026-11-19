import { useId } from 'react'
import { useI18n } from '../i18n'
import { currentAttempt } from './engine'
import { franchiseEmblem, tribeAccent } from './presentationTheme'
import { tribeOf } from './social'
import type { TeamplayPhase, TeamplayState } from './types'

const icons = {
  hub: 'M3 7l3-3h12l3 3v10l-3 3H6l-3-3Z M6 12c3-4 9-4 12 0-3 4-9 4-12 0Z M12 10v4',
  tribes: 'M3 7l4-2v11l-4 2Z M10 5l4-2v14l-4 2Z M17 7l4-2v11l-4 2Z',
  social: 'M3 6l2-2h9l2 2v5l-2 2H9l-4 3v-3l-2-2Z M17 8h2l2 2v6l-2 2h-1v3l-4-3h-3l-2-2 M7 8h5',
  events: 'M4 5h16v14H4z M7 9h3 M7 13h10 M7 16h7 M14 9h3',
  season: 'M7 4h10l4 4v8l-4 4H7l-4-4V8Z M7 9h10 M7 15h10 M10 7v4 M14 13v4',
  play: 'M8 5l11 7-11 7Z',
  rules: 'M4 5h6l2 2 2-2h6v13h-6l-2 2-2-2H4Z M12 7v13 M7 9h2 M15 9h2 M7 13h2 M15 13h2',
  archive: 'M4 8h16v12H4z M3 4h18v4H3z M9 12h6',
  store: 'M4 9h16l1 10-2 2H5l-2-2Z M8 9V7a4 4 0 0 1 8 0v2 M10 15l2-2 2 2-2 2Z',
  report: 'M3 6l2-2h14l2 2v9l-2 2h-7l-5 4v-4H5l-2-2Z M12 7v4 M12 14h.01',
  music:
    'M9 17V6l11-3v11 M9 10l11-3 M9 17c0 4-6 5-6 1.5 0-2.7 6-4.2 6-1.5Z M20 14c0 4-6 5-6 1.5 0-2.7 6-4.2 6-1.5Z',
  sound: 'M3 9h4l5-4v14l-5-4H3Z M15 9c2 1.5 2 4.5 0 6 M18 6c4 3 4 9 0 12',
  close: 'M6 6l12 12 M18 6L6 18',
} as const

export function TeamplayIcon({ name }: { name: keyof typeof icons }) {
  return (
    <svg
      className="tp-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={icons[name]} />
    </svg>
  )
}

export function TeamplayIntroHero() {
  const { t } = useI18n()
  return (
    <div className="teamplay-intro-hero">
      <h1 aria-label={t('teamplay.title')}>
        <span className="tp-franchise">
          <img src={franchiseEmblem} alt="" />
          {t('teamplay.brand')}
        </span>
        <span>{t('teamplay.mode')}</span>
      </h1>
      <p>{t('teamplay.introPitch')}</p>
    </div>
  )
}

export function TeamplayRules() {
  const { t } = useI18n()
  return (
    <div className="tp-rulebook">
      <p>{t('teamplay.openingHelp')}</p>
      <p>{t('teamplay.milestoneEight')}</p>
      <p>{t('teamplay.milestoneFour')}</p>
      <p>{t('teamplay.tieHelp')}</p>
    </div>
  )
}

export function ContestantPortrait({
  state,
  id,
  detail,
  score,
  captain,
  nominee,
  winner,
}: {
  state: TeamplayState
  id: string
  detail?: string
  score?: number
  captain?: boolean
  nominee?: boolean
  winner?: boolean
}) {
  const { t, formatNumber } = useI18n()
  const player = state.contestants.find((entry) => entry.id === id)!
  const tribe = tribeOf(state, id)
  return (
    <span
      className="teamplay-portrait"
      data-personal={id === state.humanId || undefined}
      data-nominee={nominee || undefined}
      data-winner={winner || undefined}
      style={tribeAccent(tribe)}
    >
      <span className="tp-portrait-art">
        <img src={player.avatar} alt="" decoding="async" />
        {captain && (
          <span className="tp-portrait-mark" data-mark="captain" aria-hidden="true">
            {t('teamplay.roster.captainMark')}
          </span>
        )}
        {nominee && (
          <span className="tp-portrait-mark" data-mark="nominee" aria-hidden="true">
            {t('teamplay.roster.nomineeMark')}
          </span>
        )}
      </span>
      <span className="teamplay-portrait-caption">
        <strong>{player.name}</strong>
        {id === state.humanId && <small>{t('teamplay.you')}</small>}
        {detail && <span>{detail}</span>}
        {score !== undefined && <b className="teamplay-portrait-score">{formatNumber(score)}</b>}
      </span>
    </span>
  )
}

export function AvatarPicker({
  state,
  candidates,
  label,
  selected,
  onPick,
  disabled,
  multiple = false,
  limit = candidates.length,
}: {
  state: TeamplayState
  candidates: string[]
  label: string
  selected: string[]
  onPick: (id: string) => void
  disabled?: boolean
  multiple?: boolean
  limit?: number
}) {
  const group = useId()
  return (
    <fieldset className="tp-avatar-picker" disabled={disabled}>
      <legend>{label}</legend>
      <div className="tp-avatar-options">
        {candidates.map((id) => (
          <label key={id}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={group}
              checked={selected.includes(id)}
              disabled={multiple && !selected.includes(id) && selected.length >= limit}
              onChange={() => onPick(id)}
            />
            <ContestantPortrait state={state} id={id} />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

const route = [
  { label: 'tribes', phases: ['opening'] },
  { label: 'race', phases: ['teamCompetition', 'teamResults'] },
  { label: 'social', phases: ['socialOne'] },
  { label: 'vote', phases: ['ballots', 'nominationTies', 'nominations', 'socialTwo'] },
  { label: 'duel', phases: ['nomineeDuel', 'nomineeResult'] },
  { label: 'reserve', phases: ['reserveDuel', 'reserveResult'] },
  { label: 'recap', phases: ['capture', 'merge', 'recap'] },
] as const satisfies readonly { label: string; phases: readonly TeamplayPhase[] }[]

export function CyclePath({ phase }: { phase: TeamplayPhase }) {
  const { t } = useI18n()
  const active = route.findIndex(({ phases }) => phases.some((entry) => phase === entry))
  if (active < 0) return null
  return (
    <ol className="teamplay-cycle-path" aria-label={t('teamplay.cyclePath')}>
      {route.map(({ label }, index) => (
        <li
          key={label}
          aria-current={index === active ? 'step' : undefined}
          data-complete={index < active || undefined}
        >
          {t(`teamplay.path.${label}`)}
        </li>
      ))}
    </ol>
  )
}

export function DuelMatchup({ state, scores }: { state: TeamplayState; scores?: boolean }) {
  const { t } = useI18n()
  const attempt = currentAttempt(state)!
  return (
    <div className="teamplay-matchup" data-arena={attempt.kind}>
      {attempt.participants.map((id) => {
        const role =
          attempt.kind === 'reserve'
            ? id === state.challengerId
              ? t('teamplay.challenger')
              : t('teamplay.reserve')
            : (tribeOf(state, id)?.name ?? t('teamplay.nominee'))
        return (
          <ContestantPortrait
            key={id}
            state={state}
            id={id}
            detail={scores && id === attempt.winnerId ? t('teamplay.duelWinner') : role}
            score={scores ? attempt.scores[id] : undefined}
            winner={scores && id === attempt.winnerId}
          />
        )
      })}
      <span className="teamplay-versus" aria-hidden="true">
        VS
      </span>
    </div>
  )
}
