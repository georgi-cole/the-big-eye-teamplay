import { useState } from 'react'
import { useI18n } from '../i18n'
import {
  ALLIANCE_LIMITS,
  allianceKind,
  currentAllianceCounts,
  getCurrentPact,
} from '../social/reality/allianceIdentity'
import { isPendingAllianceRequest } from '../social/reality/allianceManagement'
import { normalizeActionCosts } from '../social/smExecNormalize'
import { AvatarPicker } from './TeamplayPresentation'
import { nameOf } from './presentationTheme'
import { socialActionDefinition, socialTargets } from './social'
import {
  canAnswerTeamplayRequest,
  teamplayAllianceRequests,
  teamplayAlliances,
} from './tribeSocial'
import { teamplayObservedPatterns } from './tribeStrategy'
import type { TeamplayState, TribeSocialDecision } from './types'

interface Props {
  state: TeamplayState
  busy: boolean
  onDecision: (decision: TribeSocialDecision) => Promise<boolean>
}

type Composer = { kind: 'pact' | 'found' } | { kind: 'meet' | 'leave'; allianceId: string }

export default function TribeSocialPanel({ state, busy, onDecision }: Props) {
  const { t } = useI18n()
  const [composer, setComposer] = useState<Composer | null>(null)
  const [picks, setPicks] = useState<string[]>([])
  const actor = state.humanId
  const targets = socialTargets(state, actor)
  const name = (id: string) => nameOf(state, id)
  const bank = state.contestants.find((player) => player.id === actor)!.bank
  const available = targets.length > 0 && !busy
  const pactTargets = targets.filter((id) => !getCurrentPact(state.reality, actor, id))
  const foundingTargets = targets.filter(
    (id) => currentAllianceCounts(state.reality, id).groups < ALLIANCE_LIMITS.groupsPerMember
  )
  const canFound =
    currentAllianceCounts(state.reality, actor).groups < ALLIANCE_LIMITS.groupsPerMember &&
    foundingTargets.length >= 2
  const { energy: pactEnergy } = normalizeActionCosts(socialActionDefinition('proposeAlliance')!, 1)
  const { energy: meetingEnergy } = normalizeActionCosts(
    socialActionDefinition('consult_alliance')!,
    1
  )
  const requests = teamplayAllianceRequests(state, actor)
  const pending = requests.filter(isPendingAllianceRequest)
  const settled = requests.filter((request) => !isPendingAllianceRequest(request)).slice(0, 3)
  const partnerships = teamplayAlliances(state, actor)

  function open(next: Composer) {
    setPicks([])
    setComposer(next)
  }

  if (composer) {
    const record =
      'allianceId' in composer
        ? partnerships.find(({ alliance }) => alliance.id === composer.allianceId)
        : undefined
    const candidates =
      composer.kind === 'pact'
        ? pactTargets
        : composer.kind === 'found'
          ? foundingTargets
          : composer.kind === 'meet' && record
            ? targets.filter((id) => !record.alliance.memberIds.includes(id))
            : []
    const validPicks = picks.filter((id) => candidates.includes(id))
    const selected = validPicks[0]
    const label =
      composer.kind === 'pact'
        ? t('teamplay.alliance.offer', { energy: pactEnergy })
        : composer.kind === 'found'
          ? t('teamplay.alliance.send')
          : composer.kind === 'meet'
            ? t('teamplay.alliance.meet', { energy: meetingEnergy })
            : t('teamplay.confirmChoice')
    const decision: TribeSocialDecision | undefined =
      composer.kind === 'pact' && selected && bank.energy >= pactEnergy
        ? { kind: 'pact', targetId: selected }
        : composer.kind === 'found' && canFound && validPicks.length >= 2
          ? { kind: 'found', memberIds: validPicks }
          : composer.kind === 'meet' && record && selected && bank.energy >= meetingEnergy
            ? { kind: 'meet', allianceId: composer.allianceId, targetId: selected }
            : composer.kind === 'leave' && record
              ? { kind: 'leave', allianceId: composer.allianceId }
              : undefined

    return (
      <section className="tp-composer" aria-label={t('teamplay.alliance.title')}>
        <button type="button" className="tp-quiet tp-back" onClick={() => setComposer(null)}>
          <span aria-hidden="true">‹</span> {t('teamplay.back')}
        </button>
        {composer.kind === 'found' && <p>{t('teamplay.alliance.foundHelp')}</p>}
        {composer.kind === 'leave' && record && (
          <p>
            {t(
              allianceKind(record.alliance) === 'PACT'
                ? 'teamplay.alliance.endPact'
                : 'teamplay.alliance.leaveGroup'
            )}
          </p>
        )}
        {!!candidates.length && (
          <AvatarPicker
            state={state}
            candidates={candidates}
            selected={validPicks}
            disabled={busy}
            multiple={composer.kind === 'found'}
            limit={ALLIANCE_LIMITS.groupMembers - 1}
            label={t(
              composer.kind === 'pact'
                ? 'teamplay.alliance.partner'
                : composer.kind === 'found'
                  ? 'teamplay.scene.contestants'
                  : 'teamplay.alliance.meetingTarget'
            )}
            onPick={(id) =>
              setPicks((previous) =>
                composer.kind !== 'found'
                  ? [id]
                  : previous.includes(id)
                    ? previous.filter((entry) => entry !== id)
                    : [...previous, id]
              )
            }
          />
        )}
        <button
          type="button"
          className="tp-primary"
          disabled={!available || !decision}
          onClick={async () => {
            if (decision && (await onDecision(decision))) setComposer(null)
          }}
        >
          {label}
        </button>
      </section>
    )
  }

  return (
    <section className="tp-alliance-list" aria-labelledby="teamplay-commitments-title">
      <h3 id="teamplay-commitments-title">{t('teamplay.alliance.title')}</h3>
      {(pactTargets.length > 0 || canFound) && (
        <div className="tp-alliance-actions">
          {!!pactTargets.length && (
            <button
              type="button"
              className="tp-quiet"
              disabled={!available}
              onClick={() => open({ kind: 'pact' })}
            >
              {t('teamplay.alliance.offer', { energy: pactEnergy })}
            </button>
          )}
          {canFound && (
            <button
              type="button"
              className="tp-quiet"
              disabled={!available}
              onClick={() => open({ kind: 'found' })}
            >
              {t('teamplay.alliance.found')}
            </button>
          )}
        </div>
      )}
      {[...new Set(teamplayObservedPatterns(state, actor, targets))].map((id) => (
        <p className="tp-note" key={id}>
          {t('teamplay.alliance.pattern', { name: name(id) })}
        </p>
      ))}
      {pending.map((request) => (
        <article className="tp-alliance-card" key={request.id}>
          <p>
            {t(
              request.kind === 'PACT'
                ? 'teamplay.alliance.pendingPact'
                : 'teamplay.alliance.pendingGroup',
              {
                names: request.memberIds.map(name).join(', '),
              }
            )}
          </p>
          <div className="tp-inline-actions">
            {canAnswerTeamplayRequest(request, actor) && (
              <>
                <button
                  className="tp-quiet"
                  type="button"
                  disabled={!available}
                  onClick={() =>
                    void onDecision({ kind: 'respond', requestId: request.id, accept: true })
                  }
                >
                  {t('teamplay.alliance.accept')}
                </button>
                <button
                  className="tp-quiet"
                  type="button"
                  disabled={!available}
                  onClick={() =>
                    void onDecision({ kind: 'respond', requestId: request.id, accept: false })
                  }
                >
                  {t('teamplay.alliance.decline')}
                </button>
              </>
            )}
            {request.proposerId === actor && (
              <button
                className="tp-quiet"
                type="button"
                disabled={!available}
                onClick={() => void onDecision({ kind: 'withdraw', requestId: request.id })}
              >
                {t('teamplay.alliance.withdraw')}
              </button>
            )}
          </div>
        </article>
      ))}
      {partnerships.map(({ alliance, local, separated }) => {
        const pact = allianceKind(alliance) === 'PACT'
        const canMeet =
          !pact &&
          local.length >= 2 &&
          state.phase !== 'socialTwo' &&
          targets.some((id) => !alliance.memberIds.includes(id))
        return (
          <article className="tp-alliance-card" key={alliance.id}>
            <strong>
              {pact
                ? t('teamplay.alliance.pactWith', {
                    name: name(alliance.memberIds.find((id) => id !== actor)!),
                  })
                : (alliance.name ?? t('teamplay.alliance.group'))}
            </strong>
            <p>
              {pact
                ? t(separated ? 'teamplay.alliance.dormant' : 'teamplay.alliance.activePact')
                : t(separated ? 'teamplay.alliance.split' : 'teamplay.alliance.members', {
                    names: local.map(name).join(', '),
                  })}
            </p>
            <div className="tp-inline-actions">
              {canMeet && (
                <button
                  className="tp-quiet"
                  type="button"
                  disabled={!available}
                  onClick={() => open({ kind: 'meet', allianceId: alliance.id })}
                >
                  {t('teamplay.alliance.meet', { energy: meetingEnergy })}
                </button>
              )}
              <button
                className="tp-quiet"
                type="button"
                disabled={!available}
                onClick={() => open({ kind: 'leave', allianceId: alliance.id })}
              >
                {t(pact ? 'teamplay.alliance.endPact' : 'teamplay.alliance.leaveGroup')}
              </button>
            </div>
          </article>
        )
      })}
      {settled.map((request) => (
        <p className="tp-note" key={request.id}>
          {t(`teamplay.alliance.status.${request.status}`, {
            names: request.memberIds.map(name).join(', '),
          })}
        </p>
      ))}
      {!requests.length && !partnerships.length && (
        <p className="tp-empty">{t('teamplay.alliance.empty')}</p>
      )}
    </section>
  )
}
