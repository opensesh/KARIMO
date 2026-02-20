/**
 * KARIMO Orchestrator
 *
 * Core execution loop, task runner, and phase management.
 * This module coordinates agent execution, handles dependencies,
 * and manages the full task lifecycle from PRD to merged PR.
 */

// =============================================================================
// Error Classes
// =============================================================================

export {
  KarimoOrchestratorError,
  TaskNotFoundError,
  PhaseNotFoundError,
  PrePRCheckError,
  NeverTouchViolationError,
  RebaseConflictError,
  PhaseBranchError,
  WorktreeError,
  PRCreationError,
} from './errors'

// =============================================================================
// Types
// =============================================================================

export type {
  TaskRunR0,
  RunTaskOptions,
  CommandResult,
  PrePRCheckResult,
  PrePRCheckOptions,
  RunTaskResult,
  TaskSummary,
  TaskExecutionContext,
  DryRunPlan,
} from './types'

// Re-export legacy types for backward compatibility
export type { TaskRun, ErrorType, TaskStatus } from '@/types'

// =============================================================================
// Pre-PR Checks
// =============================================================================

export {
  runCommand,
  prePRChecks,
  formatCommandResult,
} from './pre-pr-checks'

// =============================================================================
// Task Runner
// =============================================================================

export {
  runTask,
  createDryRunPlan,
} from './runner'

// =============================================================================
// Summary & Output
// =============================================================================

export {
  formatDuration,
  createTaskSummary,
  formatTaskSummary,
  printTaskSummary,
  formatDryRunPlan,
  printDryRunPlan,
  formatRunResult,
} from './summary'

// =============================================================================
// Legacy Types (preserved for backward compatibility)
// =============================================================================

// Execution modes
export type ExecutionMode = 'sequential' | 'parallel'

// Pre-PR check result (legacy)
export interface PrePRResult {
  proceed: boolean
  reason?: string
  cautionFiles?: string[]
}

// Phase summary for terminal output
export interface PhaseSummary {
  phaseId: string
  totalTasks: number
  completed: number
  failed: number
  pending: number
  totalCost: number
}

// Budget check result
export type BudgetCheckResult = 'ok' | 'warn' | 'halt-phase' | 'halt-session'

// Budget state tracking
export interface BudgetState {
  sessionTotal: number
  sessionCap: number | null
  phases: Map<
    string,
    {
      spent: number
      cap: number | null
      overflow: number
      taskRunning: boolean
    }
  >
  warnings: string[]
}
