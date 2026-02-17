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

export { handleDoctor, parseDoctorArgs, runDoctorSilent } from './doctor-command'

export { handleReset, parseResetArgs, printResetHelp } from './reset-command'

export { handleNote, parseNoteArgs, printNoteHelp, type NoteTag, type NoteOptions } from './note-command'

export { runFirstRunFlow, isFirstRun } from './first-run'

// =============================================================================
// Safety Check
// =============================================================================

export {
  checkWorkingDirectory,
  formatSafetyError,
  PROJECT_SIGNALS,
  MIN_SIGNAL_WEIGHT,
  type SafetyCheckResult,
  type SafetyBlockReason,
  type ProjectSignal,
} from './safety'

// =============================================================================
// Telemetry
// =============================================================================

export {
  logCommandStart,
  logCommandEnd,
  logError,
  logRetry,
  withTelemetry,
  writeTelemetryEvent,
  getTelemetryPath,
  type TelemetryEvent,
  type CommandStartEvent,
  type CommandEndEvent,
  type ErrorEvent,
  type RetryEvent,
} from './telemetry'

// =============================================================================
// Main Entry Point
// =============================================================================

export { main, parseCommand } from './main'

// =============================================================================
// Guided Flow
// =============================================================================

export { showWelcome, showWelcomeBack, showCommandHelp } from './welcome'
export { showExecutionFlow } from './execute-flow'

// =============================================================================
// UI Components
// =============================================================================

export {
  showWelcomeScreen,
  showCompactHeader,
  showTransitionToInit,
  BORDER_WIDTH,
} from './ui'

export { OR, GN, RD, GY, WH, RST, BOLD, colorize, border } from './ui'

// =============================================================================
// State Management
// =============================================================================

export {
  detectProjectPhase,
  loadState,
  saveState,
  updateState,
  setCurrentPRD,
  clearCurrentPRD,
  karimoDirExists,
  configExists,
  prdsDirExists,
  getPRDFileInfos,
  getNextPRDNumber,
  markOnboarded,
  recordDoctorRun,
  isOnboarded,
} from './state'

export type {
  KarimoState,
  KarimoLevel,
  PRDSection,
  ProjectPhase,
  PRDFileInfo,
  PRDMetadata,
} from './state'
