import { useI18n } from '../i18n'
import { currentAttempt } from './engine'
import { teamplayEmblem, tribeAccent } from './presentationTheme'
import { tribeOf } from './social'
import type { TeamplayPhase, TeamplayState } from './types'

export function TeamplayIntroHero() {
  const { t } = useI18n()
  return (
    <div className="teamplay-intro-hero">
      <img src={teamplayEmblem} alt="" />
      <h1>{t('teamplay.title')}</h1>
      <p>{t('teamplay.introPitch')}</p>
    </div>
  )
}

export function TeamplayRules() {
  const { t } = useI18n()
  return (
    <details>
      <summary>{t('teamplay.rules')}</summary>
      <p>{t('teamplay.openingHelp')}</p>
      <p>{t('teamplay.milestoneEight')}</p>
      <p>{t('teamplay.milestoneFour')}</p>
    </details>
  )
}

export function ContestantPortrait({
  state,
  id,
  detail,
  score,
}: {
  state: TeamplayState
  id: string
  detail?: string
  score?: number
}) {
  const { t, formatNumber } = useI18n()
  const player = state.contestants.find((entry) => entry.id === id)!
  const tribe = tribeOf(state, id)
  return (
    <span className="teamplay-portrait" style={tribeAccent(tribe ?? undefined)}>
      <img src={player.avatar} alt="" />
      <span className="teamplay-portrait-caption">
        <strong>{player.name}</strong>
        {id === state.humanId && <small>{t('teamplay.you')}</small>}
        {detail && <span>{detail}</span>}
        {score !== undefined && <b className="teamplay-portrait-score">{formatNumber(score)}</b>}
      </span>
    </span>
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

export function TribeFlags({ state }: { state: TeamplayState }) {
  const { t } = useI18n()
  const home = tribeOf(state, state.humanId)
  if (!state.tribes.length) return null
  return (
    <ul className="teamplay-flags" aria-label={t('teamplay.tribes')}>
      {state.tribes.map((tribe) => (
        <li key={tribe.id} style={tribeAccent(tribe)}>
          <strong>{tribe.name}</strong>
          <span>{t('teamplay.memberCount', { count: tribe.members.length })}</span>
          {home?.id === tribe.id && <small>{t('teamplay.yourTribe')}</small>}
        </li>
      ))}
    </ul>
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
          />
        )
      })}
      <span className="teamplay-versus" aria-hidden="true">
        VS
      </span>
    </div>
  )
}
