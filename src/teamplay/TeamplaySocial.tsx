import { useState } from 'react'
import { useI18n } from '../i18n'
import { normalizeActionCosts } from '../social/smExecNormalize'
import { AvatarPicker } from './TeamplayPresentation'
import { nameOf } from './presentationTheme'
import { socialActionDefinition, socialTargets, TEAMPLAY_SOCIAL_ACTIONS } from './social'
import TribeSocialPanel from './TribeSocialPanel'
import type { TeamplayAction, TeamplayState } from './types'

export default function TeamplaySocial({
  state,
  act,
  busy,
  initialTarget,
  notice,
}: {
  state: TeamplayState
  act: (action: TeamplayAction) => Promise<boolean>
  busy: boolean
  initialTarget?: string
  notice?: string | null
}) {
  const { t } = useI18n()
  const targets = socialTargets(state, state.humanId)
  const [selection, setSelection] = useState(initialTarget ?? '')
  const [alliances, setAlliances] = useState(false)
  const target = targets.includes(selection) ? selection : targets[0]
  const human = state.contestants.find((entry) => entry.id === state.humanId)!
  const socialWindow =
    state.endgame?.step === 'social' || ['socialOne', 'socialTwo'].includes(state.phase)
  const latest = state.socialActions
    .filter(
      (entry) =>
        entry.cycle === state.cycle &&
        entry.phase === state.phase &&
        (entry.actorId === state.humanId || entry.targetId === state.humanId)
    )
    .at(-1)
  const spent = Math.min(4, state.socialOneSpent[state.humanId] ?? 0)

  return (
    <section className="tp-social" aria-label={t('teamplay.social')}>
      <h2 tabIndex={-1} data-view-title>
        {t(socialWindow ? `teamplay.phase.${state.phase}` : 'teamplay.social')}
      </h2>
      <div className="tp-segments" role="group" aria-label={t('teamplay.social')}>
        <button type="button" aria-pressed={!alliances} onClick={() => setAlliances(false)}>
          {t('teamplay.social.talk')}
        </button>
        <button type="button" aria-pressed={alliances} onClick={() => setAlliances(true)}>
          {t('teamplay.alliance.title')}
        </button>
      </div>
      {notice && (
        <p className="tp-note" role="status">
          {notice}
        </p>
      )}
      {alliances ? (
        <TribeSocialPanel
          state={state}
          busy={busy}
          onDecision={(decision) => act({ type: 'tribe_social', decision })}
        />
      ) : !target ? (
        <p className="tp-empty">
          {t(socialWindow ? 'teamplay.noSocial' : 'teamplay.social.closed')}
        </p>
      ) : (
        <>
          {state.phase === 'socialOne' && (
            <div className="tp-second-wind">
              <span>{t('teamplay.social.secondWindShort', { spent })}</span>
              <progress max={4} value={spent} aria-label={t('teamplay.secondWind', { spent })} />
            </div>
          )}
          {state.phase === 'socialTwo' && <p>{t('teamplay.socialAfterVote')}</p>}
          <AvatarPicker
            state={state}
            candidates={targets}
            label={t(state.endgame ? 'teamplay.individual.target' : 'teamplay.target')}
            selected={[target]}
            onPick={setSelection}
            disabled={busy}
          />
          <div className="tp-social-actions" aria-label={t('teamplay.action')} role="group">
            {TEAMPLAY_SOCIAL_ACTIONS.map((action) => {
              const targetId = action.targetMode === 'none' ? undefined : target
              const cost = normalizeActionCosts(action, targetId ? 1 : 0)
              const resources = (['energy', 'influence', 'info'] as const).filter(
                (resource) => cost[resource] > 0
              )
              const affordable = resources.every(
                (resource) => human.bank[resource] >= cost[resource]
              )
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() =>
                    void act({
                      type: 'social',
                      actorId: state.humanId,
                      actionId: action.id,
                      targetId,
                    })
                  }
                  disabled={busy || !affordable}
                >
                  {action.icon && <span aria-hidden="true">{action.icon}</span>}
                  <strong>{action.title}</strong>
                  <small>
                    {resources.length
                      ? resources
                          .map(
                            (resource) => `${cost[resource]} ${t(`teamplay.resource.${resource}`)}`
                          )
                          .join(' · ')
                      : t('teamplay.social.free')}
                  </small>
                </button>
              )
            })}
          </div>
          {latest && (
            <div className="tp-note tp-social-receipt" role="status" key={latest.id}>
              <strong>
                {socialActionDefinition(latest.actionId)?.title ?? t('teamplay.social.last')}
              </strong>
              <p>
                {t(latest.targetId ? 'teamplay.events.socialPair' : 'teamplay.events.socialRoom', {
                  actor: nameOf(state, latest.actorId),
                  target: nameOf(state, latest.targetId),
                  delta: latest.delta > 0 ? `+${latest.delta}` : latest.delta,
                })}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
