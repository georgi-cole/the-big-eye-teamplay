import type { CSSProperties } from 'react'
import { joinPublicAssetPath } from '../utils/avatar'
import type { Tribe } from './types'

export const teamplayEmblem = joinPublicAssetPath('assets/ceremonies/shared/shock-eye-seal.webp')

export function tribeAccent(tribe?: Tribe): CSSProperties {
  return tribe ? ({ '--teamplay-tribe': tribe.color } as CSSProperties) : {}
}
