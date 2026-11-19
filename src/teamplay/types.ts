import type { CompetitionSkillProfile, CompetitionSeasonState } from '../ai/competition/types'
import type { RealityDomainState } from '../social/reality/types'

export type TeamplayPhase =
  | 'opening'
  | 'teamCompetition'
  | 'teamResults'
  | 'socialOne'
  | 'ballots'
  | 'nominationTies'
  | 'nominations'
  | 'socialTwo'
  | 'nomineeDuel'
  | 'nomineeResult'
  | 'reserveDuel'
  | 'reserveResult'
  | 'capture'
  | 'merge'
  | 'recap'
  | 'fusion'
export type CompetitionKind = 'team' | 'nominee' | 'reserve'
export interface Bank {
  energy: number
  influence: number
  info: number
}
export interface Contestant {
  id: string
  name: string
  avatar: string
  isHuman: boolean
  priority: number
  profile: CompetitionSkillProfile
  bank: Bank
}
export interface Tribe {
  id: string
  name: string
  color: string
  priority: number
  members: string[]
  captainId: string | null
}
export interface Attempt {
  id: string
  kind: CompetitionKind
  game: 'quickTap'
  seed: number
  duration: 30
  replay: 0 | 1
  participants: string[]
  scores: Record<string, number>
  status: 'ready' | 'running' | 'complete'
  delegated: boolean
  winnerId?: string
  tied?: boolean
  priorityFallback?: boolean
}
export interface TeamResult {
  tribeId: string
  total: number
  divisor: number
  mean: number
  best: number
  members: string[]
}
export interface Cutoff {
  tribeId: string
  captainId: string
  candidates: string[]
  slots: number
}
export interface ResourceReceipt {
  id: string
  playerId: string
  reason: string
  before: Bank
  requested: Bank
  credited: Bank
  after: Bank
}
export interface CycleRecord {
  cycle: number
  teamResults: TeamResult[]
  nominees: string[]
  nomineeWinnerId: string
  challengerId: string
  reserveId: string
  exitId: string
  transfers: Array<{ playerId: string; from: string; to: string }>
}
export interface TeamplayState {
  schemaVersion: 1
  rulesVersion: '2.0'
  manifestVersion: 'quick-tap-classic-30s-v1'
  id: string
  seed: number
  revision: number
  humanId: string
  stage: 'threeTribes' | 'twoTribes' | 'individual'
  phase: TeamplayPhase
  cycle: number
  contestants: Contestant[]
  tribes: Tribe[]
  reserveId: string | null
  eliminated: string[]
  jurors: string[]
  individualIds: string[]
  castOrder: string[]
  plan: Array<Record<CompetitionKind, { seed: number; replaySeed: number }>>
  attempts: Record<string, Attempt>
  currentAttemptId: string | null
  frozenRosters: Record<string, string[]>
  teamResults: TeamResult[]
  individualOrder: string[]
  previousTeamOrder: string[]
  previousIndividualOrder: string[]
  ballots: Record<string, string>
  totals: Record<string, number>
  cutoffs: Cutoff[]
  nominees: string[]
  nomineeWinnerId: string | null
  challengerId: string | null
  lastExitId: string | null
  capture: { donorId: string; recipientId: string; captainId: string } | null
  merge: {
    retiredId: string
    pool: string[]
    order: string[]
    turn: number
    captains: Record<string, string>
  } | null
  socialOneSpent: Record<string, number>
  socialActions: Array<{
    id: string
    cycle: number
    phase: string
    actorId: string
    targetId: string | null
    actionId: string
    delta: number
  }>
  reality: RealityDomainState
  competitionState: Record<string, CompetitionSeasonState>
  receipts: string[]
  resources: ResourceReceipt[]
  history: CycleRecord[]
}
export type TeamplayAction =
  | { type: 'skip_to_defence' }
  | { type: 'continue' }
  | { type: 'start_attempt' }
  | { type: 'finish_attempt'; attemptId: string; score: number }
  | { type: 'delegate_attempt' }
  | { type: 'resolve_attempt' }
  | { type: 'social'; actorId: string; actionId: string; targetId?: string }
  | { type: 'vote'; voterId: string; targetId: string }
  | { type: 'cutoff'; tribeId: string; selectedIds: string[] }
  | { type: 'capture'; playerId: string }
  | { type: 'draft'; playerId: string }
  | { type: 'auto_choice' }
export interface TeamplayCommand {
  id: string
  expectedRevision: number
  action: TeamplayAction
}
