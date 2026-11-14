import { registerHooks } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

// Read-only catalog evaluation: no app bootstrap, user saves or external calls.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const candidate = new URL(specifier + '.ts', context.parentURL)
      if (existsSync(fileURLToPath(candidate))) return next(candidate.href, context)
    }
    return next(specifier, context)
  },
})

const source = (path) => pathToFileURL(resolve(path)).href
const { SOCIAL_ACTIONS } = await import(source('src/social/socialActions.ts'))
const { normalizeActionCosts, normalizeActionYields } = await import(
  source('src/social/smExecNormalize.ts')
)
const { getAllGames, supportsPlayerCount } = await import(source('src/minigames/registryBase.ts'))
const { minigameAiRegistry } = await import(source('src/ai/competition/minigameAiRegistry.ts'))
const { SOCIAL_RESOURCE_CALIBRATION } = await import(
  source('src/social/socialResourceCalibration.ts')
)

const directory = 'docs/teamplay/audit'
mkdirSync(directory, { recursive: true })
const actions = SOCIAL_ACTIONS.map((action) => ({
  ...action,
  normalCostOneTarget: normalizeActionCosts(action, 1, false),
  normalCostThreeTargets: normalizeActionCosts(action, 3, false),
  normalYields: normalizeActionYields(action),
  teamStageReview: action.aiOnly
    ? 'AI shim: audit caller legality'
    : action.requiredActorStatus?.some(
          (status) => status.includes('loh') || status.includes('pos')
        ) ||
        action.requiredTargetStatus?.some(
          (status) => status.includes('loh') || status.includes('pos')
        ) ||
        ['rally_votes_against', 'vote_rally', 'nominate'].includes(action.id)
      ? 'Individual-stage only until adapted'
      : 'Requires tribe target validation',
}))
writeFileSync(`${directory}/social-actions.json`, JSON.stringify(actions, null, 2) + '\n')
writeFileSync(
  `${directory}/resource-calibration.json`,
  JSON.stringify(SOCIAL_RESOURCE_CALIBRATION, null, 2) + '\n'
)
const games = getAllGames().map((game) => ({
  ...game,
  supportsOpeningFifteen: supportsPlayerCount(game, 15),
  supportsDuelTwo: supportsPlayerCount(game, 2),
  aiModel: minigameAiRegistry[game.key] ?? null,
  review: game.retired
    ? 'Excluded: retired'
    : game.vipOnly
      ? 'Excluded: legacy paid replacement'
      : game.authoritative || game.resultMode === 'placement'
        ? 'Duel candidate; team means need native score audit'
        : 'Score candidate; full result/checkpoint parity still needs runtime verification',
}))
writeFileSync(`${directory}/minigame-inventory.json`, JSON.stringify(games, null, 2) + '\n')
const lines = [
  '# Social action catalog at the source pin',
  '',
  'Generated from authored actions and the actual normalization helpers. These are base Normal-mode costs for one target, not a promise that every action is enabled in Teamplay. Dynamic modifiers and multi-target costs remain part of the runtime contract. Full descriptions, effects, phases, flags and group prices are preserved in social-actions.json.',
  '',
  '| ID | Action | Energy | Influence | Info | Influence yield | Info yield | Team-stage review |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ...actions.map(
    (action) =>
      `| ${action.id} | ${action.title.replaceAll('|', '/')} | ${action.normalCostOneTarget.energy} | ${action.normalCostOneTarget.influence} | ${action.normalCostOneTarget.info} | ${action.normalYields.influence} | ${action.normalYields.info} | ${action.teamStageReview} |`
  ),
  '',
]
writeFileSync(`${directory}/social-actions.md`, lines.join('\n'))
console.log(
  `Exported ${actions.length} actions, ${games.length} minigames and canonical resource calibration.`
)
