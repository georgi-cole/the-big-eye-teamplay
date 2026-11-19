import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTeamplayCommand, createTeamplay, currentAttempt } from './engine'
import { delegatedPreviewAction } from './preview'
import type { TeamplayAction } from './types'
import TeamplayEntry from './TeamplayScreen'
import { loadTeamplay, saveTeamplay } from './persistence'

vi.mock('../store/hooks', () => ({
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({ profiles: { isGuest: true, activeProfileId: null } }),
}))
vi.mock('./persistence', () => ({
  loadTeamplay: vi.fn(),
  saveTeamplay: vi.fn(),
  exportTeamplaySave: () => '{}',
}))

beforeEach(() => {
  vi.mocked(loadTeamplay).mockResolvedValue({
    state: createTeamplay(42, 'finn', 'screen'),
    recovered: false,
    error: null,
  })
  vi.mocked(saveTeamplay).mockReset().mockResolvedValue(undefined)
})

describe('Teamplay saved outcome presentation', () => {
  it('ignores an obsolete Strict Mode load that resolves after a newer decision', async () => {
    let obsolete!: (value: Awaited<ReturnType<typeof loadTeamplay>>) => void
    const opening = {
      state: createTeamplay(42, 'finn', 'stale-load'),
      recovered: false,
      error: null,
    }
    vi.mocked(loadTeamplay)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            obsolete = resolve
          })
      )
      .mockResolvedValueOnce(opening)
    render(
      <StrictMode>
        <MemoryRouter>
          <TeamplayEntry />
        </MemoryRouter>
      </StrictMode>
    )
    await screen.findByRole('heading', { name: 'Meet your tribes' })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Team competition' })
    await act(async () => obsolete(opening))
    expect(screen.getByRole('heading', { name: 'Team competition' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Meet your tribes' })).toBeNull()
  })
  it('shows both duel scores and the applied priority fallback after two tied attempts', async () => {
    let state = createTeamplay(42, 'finn', 'ui-tie')
    const send = (action: TeamplayAction) => {
      state = applyTeamplayCommand(state, {
        id: `tie:${state.revision}`,
        expectedRevision: state.revision,
        action,
      })
    }
    while (state.phase !== 'nomineeDuel') send(delegatedPreviewAction(state))
    for (let replay = 0; replay < 2; replay++) {
      const attempt = currentAttempt(state)!
      for (const id of attempt.participants) attempt.scores[id] = 250
      if (attempt.participants.includes(state.humanId)) {
        send({ type: 'start_attempt' })
        send({ type: 'finish_attempt', attemptId: attempt.id, score: 250 })
      } else send({ type: 'resolve_attempt' })
    }
    vi.mocked(loadTeamplay).mockResolvedValue({ state, recovered: false, error: null })
    render(
      <MemoryRouter>
        <TeamplayEntry />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { name: 'Nominee duel result' })
    expect(screen.getByText(/Both attempts tied\./)).toBeVisible()
    expect(screen.getAllByText('250')).toHaveLength(2)
  })
  it('waits for durable commit before revealing the next phase and rejects double taps', async () => {
    let complete!: () => void
    vi.mocked(saveTeamplay).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve
        })
    )
    render(
      <MemoryRouter>
        <TeamplayEntry />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { name: 'Meet your tribes' })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(saveTeamplay).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('heading', { name: 'Team competition' })).toBeNull()
    await act(async () => complete())
    await screen.findByRole('heading', { name: 'Team competition' })
  })

  it('retains the old visible checkpoint when saving fails', async () => {
    vi.mocked(saveTeamplay).mockRejectedValue(new Error('Disk full'))
    render(
      <MemoryRouter>
        <TeamplayEntry />
      </MemoryRouter>
    )
    await screen.findByRole('heading', { name: 'Meet your tribes' })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Disk full'))
    expect(screen.getByRole('heading', { name: 'Meet your tribes' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Team competition' })).toBeNull()
  })
})
