import { describe, expect, it } from 'vitest'
import { createTeamplayPreview } from './preview'
import { validateTeamplay } from './validation'
import type { TeamplayPhase } from './types'

describe('Teamplay preview scenes', () => {
  it.each<TeamplayPhase>([
    'opening',
    'teamResults',
    'ballots',
    'nomineeResult',
    'reserveResult',
    'capture',
    'merge',
    'fusion',
  ])(
    'reaches %s through real engine commands',
    async (phase) => {
      const state = await createTeamplayPreview(phase)
      validateTeamplay(state)
      if (phase === 'merge' && state.phase === 'recap')
        expect(state.tribes.map((tribe) => tribe.members.length)).toEqual([4, 4])
      else expect(state.phase).toBe(phase)
    },
    30000
  )
})
