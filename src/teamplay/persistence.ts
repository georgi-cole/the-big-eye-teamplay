import {
  flushDurablePersistence,
  getDurableItem,
  setDurableItem,
} from '../store/durablePersistence'
import { validateTeamplay } from './validation'
import type { TeamplayState } from './types'

const prefix = 'the-big-eye-teamplay:tribe-season:v1:'
const keyFor = (scope: string) => `${prefix}${encodeURIComponent(scope)}`

function decode(raw: string): TeamplayState {
  const parsed: unknown = JSON.parse(raw)
  validateTeamplay(parsed)
  return parsed
}

export interface TeamplayArchiveEntry {
  id: string
  contestant: string
  champion: string | null
  phase: TeamplayState['phase']
}

function archiveKey(scope: string, seasonId: string) {
  return `${keyFor(scope)}:archive:${seasonId}`
}

export function listTeamplayArchives(scope: string): TeamplayArchiveEntry[] {
  try {
    const entries: unknown = JSON.parse(getDurableItem(`${keyFor(scope)}:archiveIndex`) ?? '[]')
    if (!Array.isArray(entries)) return []
    return entries.filter(
      (entry): entry is TeamplayArchiveEntry =>
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.contestant === 'string' &&
        (entry.champion === null || typeof entry.champion === 'string') &&
        typeof entry.phase === 'string'
    )
  } catch {
    return []
  }
}

export function readTeamplayArchive(scope: string, seasonId: string): TeamplayState {
  const raw = getDurableItem(archiveKey(scope, seasonId))
  if (!raw) throw new Error('This archived season could not be found.')
  return decode(raw)
}

function storeTeamplayArchive(scope: string, previous: TeamplayState): boolean {
  const entries = listTeamplayArchives(scope).filter((entry) => entry.id !== previous.id)
  const entry: TeamplayArchiveEntry = {
    id: previous.id,
    contestant: previous.contestants.find((player) => player.id === previous.humanId)!.name,
    champion:
      previous.contestants.find((player) => player.id === previous.endgame?.championId)?.name ??
      null,
    phase: previous.phase,
  }
  return (
    setDurableItem(archiveKey(scope, previous.id), JSON.stringify(previous)) &&
    setDurableItem(`${keyFor(scope)}:archiveIndex`, JSON.stringify([entry, ...entries]))
  )
}

export interface LoadedTeamplay {
  state: TeamplayState | null
  recovered: boolean
  error: string | null
}

export async function loadTeamplay(scope: string): Promise<LoadedTeamplay> {
  const key = keyFor(scope)
  const raw = getDurableItem(key)
  if (!raw) return { state: null, recovered: false, error: null }
  try {
    return { state: decode(raw), recovered: false, error: null }
  } catch (error) {
    // Keep the exact damaged/unsupported payload before offering recovery. It
    // is never overwritten/deleted merely by loading the screen.
    const quarantine = `${key}:invalid:${Date.now()}`
    if (!setDurableItem(quarantine, raw) || !(await flushDurablePersistence())) {
      return {
        state: null,
        recovered: false,
        error:
          'The original save is retained, but a recovery copy could not be stored. Export it before restarting.',
      }
    }
    if (
      error instanceof Error &&
      /unsupported save\/rules\/competition version/.test(error.message)
    ) {
      return { state: null, recovered: false, error: error.message }
    }
    const backup = getDurableItem(`${key}:checkpoint`)
    if (backup) {
      try {
        return { state: decode(backup), recovered: true, error: null }
      } catch {
        /* Preserve both original records for export. */
      }
    }
    return {
      state: null,
      recovered: false,
      error: error instanceof Error ? error.message : 'The saved season cannot be recovered.',
    }
  }
}

/** Both keys are in one durable flush; the UI reveals nothing until it succeeds.
 * The fallback writes the old checkpoint first, leaving it usable on failure. */
export async function saveTeamplay(
  scope: string,
  state: TeamplayState,
  previous: TeamplayState | null
): Promise<void> {
  validateTeamplay(state)
  const key = keyFor(scope)
  const raw = getDurableItem(key)
  if (raw && !previous) {
    try {
      decode(raw)
      throw new Error('A saved season already exists. Reload it before starting again.')
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('A saved season already exists'))
        throw error
      if (
        !setDurableItem(`${key}:invalid:${Date.now()}`, raw) ||
        !(await flushDurablePersistence())
      )
        throw new Error('The original save could not be retained. Restart cancelled.')
    }
  }
  if (raw && previous) {
    let existing: TeamplayState | null = null
    try {
      existing = decode(raw)
    } catch {
      /* Recovery already preserved the original. */
    }
    if (existing && (existing.id !== previous.id || existing.revision !== previous.revision))
      throw new Error('This season changed in another window. Reload before continuing.')
  }
  if (previous) {
    validateTeamplay(previous)
    if (
      previous.id !== state.id &&
      !scope.startsWith('preview:') &&
      !storeTeamplayArchive(scope, previous)
    )
      throw new Error('The old season could not be archived. Nothing was restarted.')
    if (!setDurableItem(`${key}:checkpoint`, JSON.stringify(previous)))
      throw new Error('Checkpoint storage failed')
  }
  if (!setDurableItem(key, JSON.stringify(state)) || !(await flushDurablePersistence()))
    throw new Error(
      'Saving failed. The new outcome has not been revealed; retry the same decision.'
    )
}

export function exportTeamplaySave(scope: string): string {
  const key = keyFor(scope)
  return JSON.stringify(
    { current: getDurableItem(key), checkpoint: getDurableItem(`${key}:checkpoint`) },
    null,
    2
  )
}
