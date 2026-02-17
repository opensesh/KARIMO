/**
 * KARIMO Orchestrator Types
 *
 * Type definitions for task execution, pre-PR checks,
 * and orchestration options.
 */

import type { TaskStatus } from '@/types'

/**
 * Ring 0 task run record (minimal version for single-task execution).
 * Full TaskRun type in @/types is used for complete cost/iteration tracking.
 */
export interface TaskRunR0 {
  /** Task identifier */
  taskId: string
  /** Phase identifier */
  phaseId: string
  /** Current status */
  status: TaskStatus
  /** Agent engine used */
  engine: string
  /** Branch name for the task */
  branch: string
  /** Path to the worktree (if still exists) */
  worktreePath?: string | undefined
  /** When execution started */
  startedAt: Date
  /** When execution completed */
  completedAt?: Date | undefined
  /** PR number if created */
  prNumber?: number | undefined
  /** PR URL if created */
  prUrl?: string | undefined
  /** Files matching caution patterns */
  cautionFilesModified: string[]
  /** Error message if failed */
  errorMessage?: string | undefined
}

/**
 * Options for running a single task.
 */
export interface RunTaskOptions {
  /** Phase ID (e.g., "phase-1") */
  phaseId: string
  /** Task ID (e.g., "1a") */
  taskId: string
  /** Optional PRD path override (default: {rootDir}/.karimo/prds/{phaseId}.md) */
  prdPath?: string
  /** Dry run mode — print plan without executing */
  dryRun?: boolean
  /** Engine override (default: "claude-code") */
  engine?: string
}

/**
 * Result of a command execution (build, typecheck, etc.)
 */
export interface CommandResult {
  /** Command that was run */
  command: string
  /** Whether the command succeeded */
  success: boolean
  /** Exit code */
  exitCode: number
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
  /** Duration in milliseconds */
  durationMs: number
}

/**
 * Result of pre-PR checks.
 */
export interface PrePRCheckResult {
  /** Whether all checks passed */
  success: boolean
  /** Rebase result */
  rebase?: {
    success: boolean
    conflictFiles: string[]
  }
  /** Build command result */
  build?: CommandResult
  /** Typecheck command result */
  typecheck?: CommandResult
  /** Changed files from the diff */
  changedFiles: string[]
  /** Files matching caution patterns */
  cautionFiles: string[]
  /** Never-touch violations (should be empty for success) */
  neverTouchViolations: Array<{ file: string; pattern: string }>
  /** Error message if checks failed */
  errorMessage?: string
}

/**
 * Options for pre-PR checks.
 */
export interface PrePRCheckOptions {
  /** Path to the worktree */
  worktreePath: string
  /** Target branch for rebase (phase branch) */
  targetBranch: string
  /** Build command */
  buildCommand: string
  /** Typecheck command (null to skip typecheck) */
  typecheckCommand: string | null
  /** Files matching never_touch patterns */
  neverTouchPatterns: string[]
  /** Files matching require_review patterns */
  requireReviewPatterns: string[]
}

/**
 * Result of running a task.
 */
export interface RunTaskResult {
  /** Whether the task completed successfully */
  success: boolean
  /** Task run record */
  run: TaskRunR0
  /** Summary for display */
  summary: TaskSummary
}

/**
 * Summary information for terminal output.
 */
export interface TaskSummary {
  /** Task identifier */
  taskId: string
  /** Phase identifier */
  phaseId: string
  /** Task title */
  title: string
  /** Final status */
  status: TaskStatus
  /** Duration in human-readable format */
  duration: string
  /** PR URL if created */
  prUrl?: string | undefined
  /** Number of files changed */
  filesChanged: number
  /** Caution files modified */
  cautionFiles: string[]
  /** Error message if failed */
  errorMessage?: string | undefined
}

/**
 * Context for task execution (internal).
 */
export interface TaskExecutionContext {
  /** Phase ID */
  phaseId: string
  /** Task ID */
  taskId: string
  /** Root directory of the project */
  rootDir: string
  /** Path to the worktree */
  worktreePath: string
  /** Phase branch name */
  phaseBranch: string
  /** Task branch name */
  taskBranch: string
  /** Agent engine to use */
  engine: string
}

/**
 * Dry run plan output.
 */
export interface DryRunPlan {
  /** Phase ID */
  phaseId: string
  /** Task details */
  task: {
    id: string
    title: string
    complexity: number
    costCeiling: number
  }
  /** PRD path */
  prdPath: string
  /** Phase branch to create/use */
  phaseBranch: string
  /** Task branch to create */
  taskBranch: string
  /** Worktree path */
  worktreePath: string
  /** Engine to use */
  engine: string
  /** Commands that would be run */
  commands: {
    build: string
    typecheck: string | null
  }
}
