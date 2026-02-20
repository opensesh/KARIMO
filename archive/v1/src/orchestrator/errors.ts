/**
 * KARIMO Orchestrator Errors
 *
 * Error classes for orchestration operations including task execution,
 * phase management, and validation failures.
 */

/**
 * Base error class for all KARIMO orchestrator errors.
 */
export class KarimoOrchestratorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KarimoOrchestratorError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error thrown when a task ID is not found in the PRD.
 */
export class TaskNotFoundError extends KarimoOrchestratorError {
  readonly taskId: string
  readonly phaseId: string

  constructor(taskId: string, phaseId: string) {
    super(`Task "${taskId}" not found in phase "${phaseId}"`)
    this.name = 'TaskNotFoundError'
    this.taskId = taskId
    this.phaseId = phaseId
  }
}

/**
 * Error thrown when a phase PRD file is not found.
 */
export class PhaseNotFoundError extends KarimoOrchestratorError {
  readonly phaseId: string
  readonly prdPath: string

  constructor(phaseId: string, prdPath: string) {
    super(`Phase "${phaseId}" PRD not found at "${prdPath}"`)
    this.name = 'PhaseNotFoundError'
    this.phaseId = phaseId
    this.prdPath = prdPath
  }
}

/**
 * Error thrown when pre-PR checks fail.
 */
export class PrePRCheckError extends KarimoOrchestratorError {
  readonly checkType: 'build' | 'typecheck' | 'lint' | 'rebase'
  readonly details: string

  constructor(checkType: 'build' | 'typecheck' | 'lint' | 'rebase', details: string) {
    super(`Pre-PR ${checkType} check failed: ${details}`)
    this.name = 'PrePRCheckError'
    this.checkType = checkType
    this.details = details
  }
}

/**
 * Error thrown when forbidden files (never_touch) are modified.
 */
export class NeverTouchViolationError extends KarimoOrchestratorError {
  readonly violations: Array<{ file: string; pattern: string }>

  constructor(violations: Array<{ file: string; pattern: string }>) {
    const fileList = violations.map((v) => v.file).join(', ')
    super(`Forbidden files modified: ${fileList}`)
    this.name = 'NeverTouchViolationError'
    this.violations = violations
  }
}

/**
 * Error thrown when rebase conflicts are detected.
 * Note: This is informational — orchestrator decides handling.
 */
export class RebaseConflictError extends KarimoOrchestratorError {
  readonly conflictFiles: string[]
  readonly targetBranch: string

  constructor(conflictFiles: string[], targetBranch: string) {
    super(`Rebase onto "${targetBranch}" has conflicts in: ${conflictFiles.join(', ')}`)
    this.name = 'RebaseConflictError'
    this.conflictFiles = conflictFiles
    this.targetBranch = targetBranch
  }
}

/**
 * Error thrown when the phase branch cannot be created.
 */
export class PhaseBranchError extends KarimoOrchestratorError {
  readonly phaseId: string
  readonly reason: string

  constructor(phaseId: string, reason: string) {
    super(`Failed to create phase branch for "${phaseId}": ${reason}`)
    this.name = 'PhaseBranchError'
    this.phaseId = phaseId
    this.reason = reason
  }
}

/**
 * Error thrown when worktree creation fails.
 */
export class WorktreeError extends KarimoOrchestratorError {
  readonly phaseId: string
  readonly reason: string

  constructor(phaseId: string, reason: string) {
    super(`Worktree operation failed for phase "${phaseId}": ${reason}`)
    this.name = 'WorktreeError'
    this.phaseId = phaseId
    this.reason = reason
  }
}

/**
 * Error thrown when PR creation fails.
 */
export class PRCreationError extends KarimoOrchestratorError {
  readonly taskId: string
  readonly reason: string

  constructor(taskId: string, reason: string) {
    super(`Failed to create PR for task "${taskId}": ${reason}`)
    this.name = 'PRCreationError'
    this.taskId = taskId
    this.reason = reason
  }
}
