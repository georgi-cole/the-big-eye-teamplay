import { describe, expect, it } from 'vitest'
import { personalBroadcasts, publicBroadcasts } from './eventFeed'
import { createTeamplayPreview } from './preview'

describe('Teamplay broadcast feed', () => {
  it('keeps the current cycle results when they move into the season record', async () => {
    const live = await createTeamplayPreview('nomineeResult')
    const finished = await createTeamplayPreview('reserveResult')
    const previous = publicBroadcasts(live).map((entry) => entry.id)
    const after = publicBroadcasts(finished).map((entry) => entry.id)

    expect(previous).toEqual(['1:nominee-duel', '1:nominations', '1:immunity', 'opening'])
    expect(after).toEqual(['1:reserve-duel', ...previous])
  })

  it('keeps secret ballot choices out of the public and player feeds', async () => {
    const state = await createTeamplayPreview('ballots')
    const before = publicBroadcasts(state)
    const personalBefore = personalBroadcasts(state)
    state.ballots[state.humanId] = state.contestants.find((entry) => !entry.isHuman)!.id

    expect(publicBroadcasts(state)).toEqual(before)
    expect(personalBroadcasts(state)).toEqual(personalBefore)
  })

  it('includes the player’s interactions and leaves other conversations private', async () => {
    const state = await createTeamplayPreview('socialOne')
    const [first, second] = state.contestants.filter((entry) => !entry.isHuman)
    state.socialActions.push(
      {
        id: 'private',
        cycle: 1,
        phase: state.phase,
        actorId: first.id,
        targetId: second.id,
        actionId: 'reassure',
        delta: 1,
      },
      {
        id: 'received',
        cycle: 1,
        phase: state.phase,
        actorId: first.id,
        targetId: state.humanId,
        actionId: 'compliment',
        delta: 2,
      }
    )

    expect(personalBroadcasts(state).map((entry) => entry.id)).toContain('received')
    expect(personalBroadcasts(state).map((entry) => entry.id)).not.toContain('private')
    expect(publicBroadcasts(state).map((entry) => entry.id)).not.toContain('received')
  })
})
