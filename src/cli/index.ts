/**
 * KARIMO CLI
 *
 * Command-line interface entry point and command routing.
 * Provides the main entry point for all KARIMO commands including
 * orchestrate, status, checkpoint, abort, and more.
 */

// CLI command names
export type Command =
  | 'orchestrate'
  | 'status'
  | 'costs'
  | 'checkpoint'
  | 'abort'
  | 'sync'
  | 'onboard'
  | 'doctor'
  | 'help'
  | 'version'

// Orchestrate command options
export interface OrchestrateOptions {
  phase?: string
  task?: string
  allReady?: boolean
  user?: string
  engine?: string
  parallel?: boolean
  dryRun?: boolean
  offline?: boolean
  noCostLimit?: boolean
  sessionBudget?: number
  noBudgetLimit?: boolean
}

// Status command options
export interface StatusOptions {
  phase?: string
  user?: string
  json?: boolean
}

// Checkpoint command options
export interface CheckpointOptions {
  level?: number
  task?: string
  phase?: string
}

// CLI result
export interface CLIResult {
  exitCode: number
  message?: string
}

// =============================================================================
// Command Handlers
// =============================================================================

export {
  handleOrchestrate,
  parseOrchestrateArgs,
  printOrchestrateHelp,
} from './orchestrate-command'
