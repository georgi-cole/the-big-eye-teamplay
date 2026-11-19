import type { CSSProperties } from 'react'
import { joinPublicAssetPath } from '../utils/avatar'
import type { TeamplayState, Tribe } from './types'

export const teamplayEmblem = joinPublicAssetPath('assets/teamplay/teamplay-crest.webp')
export const franchiseEmblem = joinPublicAssetPath('assets/ceremonies/shared/shock-eye-seal.webp')

export function nameOf(state: TeamplayState, id: string | null | undefined): string {
  return state.contestants.find((player) => player.id === id)?.name ?? '–'
}

export function tribeAccent(tribe?: Tribe): CSSProperties {
  return tribe ? ({ '--teamplay-tribe': tribe.color } as CSSProperties) : {}
}
