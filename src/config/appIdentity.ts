/** Standalone identity. Classic remains the internal engine during foundation work. */
export const APP_IDENTITY = {
  name: 'The Big Eye Teamplay',
  slug: 'the-big-eye-teamplay',
  appId: 'com.georgicole.thebigeyeteamplay',
  storageNamespace: 'the-big-eye-teamplay',
  databaseName: 'the-big-eye-teamplay-persistence',
  sourceRepository: 'georgi-cole/bbmobilenew-source',
  sourceCommit: '50676d77b76362b7d8461c23ca7c7473b7b66bdb',
} as const

// No original-app products, remote operations or advertising may activate in
// the isolated baseline. Enabling Teamplay services is a later delivery gate.
export const NATIVE_BILLING_ENABLED = false
export const EXTERNAL_SERVICES_ENABLED = false

export function isBaselineClassicRun(game: {
  mode?: string
  expansionMode?: string | null
}): boolean {
  return (game.mode == null || game.mode === 'classic') && game.expansionMode == null
}
