/**
 * KARIMO Orchestrator
 *
 * Core execution loop, task runner, and phase management.
 * This module coordinates agent execution, handles dependencies,
 * and manages the full task lifecycle from PRD to merged PR.
 */

export type { TaskRun, ErrorType, TaskStatus } from '@/types'

// Execution modes
export type ExecutionMode = 'sequential' | 'parallel'

// Pre-PR check result
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
