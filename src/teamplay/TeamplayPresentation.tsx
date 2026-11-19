import { useId } from 'react'
import { useI18n } from '../i18n'
import { joinPublicAssetPath } from '../utils/avatar'
import { currentAttempt } from './engine'
import { teamplayEmblem, tribeAccent } from './presentationTheme'
import { tribeOf } from './social'
import type { TeamplayPhase, TeamplayState } from './types'

const icons = {
  hub: 'intro_hub_icons/campaign.svg',
  tribes: 'side_utilities_button/housemates_v2.svg',
  social: 'side_utilities_button/social_v2.svg',
  events: 'side_utilities_button/news_v2.svg',
  season: 'side_utilities_button/settings_v2.svg',
  play: 'intro_hub_icons/play.svg',
  rules: 'intro_hub_icons/rules.svg',
  archive: 'intro_hub_icons/hall_of_fame.svg',
} as const

export function TeamplayIcon({ name }: { name: keyof typeof icons }) {
  return <img className="tp-icon" src={joinPublicAssetPath(`assets/${icons[name]}`)} alt="" />
}

export function TeamplayIntroHero() {
  const { t } = useI18n()
  return (
    <div className="teamplay-intro-hero">
      <img src={teamplayEmblem} alt="" />
      <h1 aria-label={t('teamplay.title')}>
        <small>{t('teamplay.brand')}</small>
        {t('teamplay.mode')}
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
  mark,
  winner,
}: {
  state: TeamplayState
  id: string
  detail?: string
  score?: number
  mark?: string
  winner?: boolean
}) {
  const { t, formatNumber } = useI18n()
  const player = state.contestants.find((entry) => entry.id === id)!
  const tribe = tribeOf(state, id)
  return (
    <span
      className="teamplay-portrait"
      data-winner={winner || undefined}
      style={tribeAccent(tribe)}
    >
      <span className="tp-portrait-art">
        <img src={player.avatar} alt="" />
        {mark && <span className="tp-portrait-mark">{mark}</span>}
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
