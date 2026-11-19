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

export default function TribeSocialPanel({ state, busy, onDecision }: Props) {
  const { t } = useI18n()
  const actor = state.humanId
  const targets = socialTargets(state, actor)
  const name = (id: string) => state.contestants.find((player) => player.id === id)?.name ?? id
  const bank = state.contestants.find((player) => player.id === actor)!.bank
  const pactTargets = targets.filter((id) => !getCurrentPact(state.reality, actor, id))
  const foundingTargets = targets.filter(
    (id) => currentAllianceCounts(state.reality, id).groups < ALLIANCE_LIMITS.groupsPerMember
  )
  const canFound =
    currentAllianceCounts(state.reality, actor).groups < ALLIANCE_LIMITS.groupsPerMember &&
    foundingTargets.length >= 2
  const [pactSelection, setPactSelection] = useState('')
  const [foundSelection, setFoundSelection] = useState<string[]>([])
  const [meetingSelection, setMeetingSelection] = useState<Record<string, string>>({})
  const [leaving, setLeaving] = useState<string | null>(null)
  const pact = pactTargets.includes(pactSelection) ? pactSelection : pactTargets[0]
  const founding = foundSelection.filter((id) => foundingTargets.includes(id))
  const { energy: pactEnergy } = normalizeActionCosts(socialActionDefinition('proposeAlliance')!, 1)
  const { energy: meetingEnergy } = normalizeActionCosts(
    socialActionDefinition('consult_alliance')!,
    1
  )
  const requests = teamplayAllianceRequests(state, actor)
  const pending = requests.filter(isPendingAllianceRequest)
  const settled = requests.filter((request) => !isPendingAllianceRequest(request)).slice(0, 3)
  const patterns = [...new Set(teamplayObservedPatterns(state, actor, targets))]
  return (
    <section className="teamplay-commitments" aria-labelledby="teamplay-commitments-title">
      <h3 id="teamplay-commitments-title">{t('teamplay.alliance.title')}</h3>
      {patterns.map((id) => (
        <p className="teamplay-note" key={id}>
          {t('teamplay.alliance.pattern', { name: name(id) })}
        </p>
      ))}
      {pending.map((request) => {
        const canAnswer = canAnswerTeamplayRequest(request, actor)
        return (
          <div className="teamplay-commitment" key={request.id}>
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
            {canAnswer && (
              <div className="teamplay-secondary">
                <button
                  disabled={busy}
                  onClick={() =>
                    void onDecision({ kind: 'respond', requestId: request.id, accept: true })
                  }
                >
                  {t('teamplay.alliance.accept')}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void onDecision({ kind: 'respond', requestId: request.id, accept: false })
                  }
                >
                  {t('teamplay.alliance.decline')}
                </button>
              </div>
            )}
            {request.proposerId === actor && (
              <button
                disabled={busy}
                onClick={() => void onDecision({ kind: 'withdraw', requestId: request.id })}
              >
                {t('teamplay.alliance.withdraw')}
              </button>
            )}
          </div>
        )
      })}
      {settled.map((request) => (
        <p className="teamplay-note" key={request.id}>
          {t(`teamplay.alliance.status.${request.status}`, {
            names: request.memberIds.map(name).join(', '),
          })}
        </p>
      ))}
      {teamplayAlliances(state, actor).map(({ alliance, local, separated }) => {
        const isPact = allianceKind(alliance) === 'PACT'
        const candidates =
          isPact || local.length < 2 || state.phase === 'socialTwo'
            ? []
            : targets.filter((id) => !alliance.memberIds.includes(id))
        const target = candidates.includes(meetingSelection[alliance.id])
          ? meetingSelection[alliance.id]
          : candidates[0]
        return (
          <div className="teamplay-commitment" key={alliance.id}>
            <strong>
              {isPact
                ? t('teamplay.alliance.pactWith', {
                    name: name(alliance.memberIds.find((id) => id !== actor)!),
                  })
                : (alliance.name ?? t('teamplay.alliance.group'))}
            </strong>
            <p>
              {isPact
                ? t(separated ? 'teamplay.alliance.dormant' : 'teamplay.alliance.activePact')
                : t(separated ? 'teamplay.alliance.split' : 'teamplay.alliance.members', {
                    names: local.map(name).join(', '),
                  })}
            </p>
            {target && (
              <details>
                <summary>{t('teamplay.alliance.meet', { energy: meetingEnergy })}</summary>
                <label>
                  {t('teamplay.alliance.meetingTarget')}
                  <select
                    disabled={busy}
                    value={target}
                    onChange={(e) =>
                      setMeetingSelection((previous) => ({
                        ...previous,
                        [alliance.id]: e.target.value,
                      }))
                    }
                  >
                    {candidates.map((id) => (
                      <option key={id} value={id}>
                        {name(id)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={busy || bank.energy < meetingEnergy}
                  onClick={() =>
                    void onDecision({ kind: 'meet', allianceId: alliance.id, targetId: target })
                  }
                >
                  {t('teamplay.alliance.meet', { energy: meetingEnergy })}
                </button>
              </details>
            )}
            {leaving === alliance.id ? (
              <div className="teamplay-secondary">
                <button
                  disabled={busy}
                  onClick={async () => {
                    if (await onDecision({ kind: 'leave', allianceId: alliance.id }))
                      setLeaving(null)
                  }}
                >
                  {t('teamplay.confirmChoice')}
                </button>
                <button disabled={busy} onClick={() => setLeaving(null)}>
                  {t('teamplay.cancel')}
                </button>
              </div>
            ) : (
              <button disabled={busy} onClick={() => setLeaving(alliance.id)}>
                {t(isPact ? 'teamplay.alliance.endPact' : 'teamplay.alliance.leaveGroup')}
              </button>
            )}
          </div>
        )
      })}
      {pact && (
        <details>
          <summary>{t('teamplay.alliance.offer', { energy: pactEnergy })}</summary>
          <label>
            {t('teamplay.alliance.partner')}
            <select value={pact} disabled={busy} onChange={(e) => setPactSelection(e.target.value)}>
              {pactTargets.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy || bank.energy < pactEnergy}
            onClick={() => void onDecision({ kind: 'pact', targetId: pact })}
          >
            {t('teamplay.alliance.offer', { energy: pactEnergy })}
          </button>
        </details>
      )}
      {canFound && (
        <details>
          <summary>{t('teamplay.alliance.found')}</summary>
          <p>{t('teamplay.alliance.foundHelp')}</p>
          <div className="teamplay-choice">
            {foundingTargets.map((id) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={founding.includes(id)}
                  disabled={
                    busy ||
                    (!founding.includes(id) && founding.length >= ALLIANCE_LIMITS.groupMembers - 1)
                  }
                  onChange={() =>
                    setFoundSelection((previous) =>
                      previous.includes(id)
                        ? previous.filter((value) => value !== id)
                        : [...previous, id]
                    )
                  }
                />
                {name(id)}
              </label>
            ))}
          </div>
          <button
            disabled={busy || founding.length < 2}
            onClick={async () => {
              if (await onDecision({ kind: 'found', memberIds: founding })) setFoundSelection([])
            }}
          >
            {t('teamplay.alliance.send')}
          </button>
        </details>
      )}
    </section>
  )
}
