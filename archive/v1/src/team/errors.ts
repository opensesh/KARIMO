/**
 * KARIMO Team Module Errors
 *
 * Custom error classes for the agent team coordination system.
 */

/**
 * Base error for team module.
 */
export class TeamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TeamError'
  }
}

/**
 * Error when queue file is not found.
 */
export class QueueNotFoundError extends TeamError {
  constructor(
    public readonly phaseId: string,
    public readonly path: string
  ) {
    super(`Queue not found for phase "${phaseId}" at ${path}`)
    this.name = 'QueueNotFoundError'
  }
}

/**
 * Error when queue file cannot be read.
 */
export class QueueReadError extends TeamError {
  constructor(
    public readonly phaseId: string,
    message: string
  ) {
    super(`Failed to read queue for phase "${phaseId}": ${message}`)
    this.name = 'QueueReadError'
  }
}

/**
 * Error when queue file cannot be written.
 */
export class QueueWriteError extends TeamError {
  constructor(
    public readonly phaseId: string,
    message: string
  ) {
    super(`Failed to write queue for phase "${phaseId}": ${message}`)
    this.name = 'QueueWriteError'
  }
}

/**
 * Error when queue lock cannot be acquired.
 */
export class QueueLockError extends TeamError {
  constructor(
    public readonly phaseId: string,
    public readonly timeout: number
  ) {
    super(`Failed to acquire lock for queue "${phaseId}" within ${timeout}ms`)
    this.name = 'QueueLockError'
  }
}

/**
 * Error when optimistic concurrency check fails.
 */
export class QueueVersionConflictError extends TeamError {
  constructor(
    public readonly phaseId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Version conflict for queue "${phaseId}": expected ${expectedVersion}, got ${actualVersion}`
    )
    this.name = 'QueueVersionConflictError'
  }
}

/**
 * Error when task is not found in queue.
 */
export class TaskNotFoundError extends TeamError {
  constructor(
    public readonly phaseId: string,
    public readonly taskId: string
  ) {
    super(`Task "${taskId}" not found in queue for phase "${phaseId}"`)
    this.name = 'TaskNotFoundError'
  }
}

/**
 * Error when task cannot be claimed.
 */
export class TaskClaimError extends TeamError {
  constructor(
    public readonly taskId: string,
    public readonly reason: string
  ) {
    super(`Cannot claim task "${taskId}": ${reason}`)
    this.name = 'TaskClaimError'
  }
}

/**
 * Error when task is already claimed by another agent.
 */
export class TaskAlreadyClaimedError extends TaskClaimError {
  constructor(
    taskId: string,
    public readonly claimedBy: string
  ) {
    super(taskId, `Already claimed by agent "${claimedBy}"`)
    this.name = 'TaskAlreadyClaimedError'
  }
}

/**
 * Error when task is blocked by dependencies.
 */
export class TaskBlockedError extends TaskClaimError {
  constructor(
    taskId: string,
    public readonly blockedBy: string[]
  ) {
    super(taskId, `Blocked by tasks: ${blockedBy.join(', ')}`)
    this.name = 'TaskBlockedError'
  }
}

/**
 * Error when PM Agent coordination fails.
 */
export class PMAgentError extends TeamError {
  constructor(
    public readonly phaseId: string,
    message: string
  ) {
    super(`PM Agent error for phase "${phaseId}": ${message}`)
    this.name = 'PMAgentError'
  }
}

/**
 * Error when all tasks have failed.
 */
export class AllTasksFailedError extends PMAgentError {
  constructor(
    phaseId: string,
    public readonly failedCount: number
  ) {
    super(phaseId, `All ${failedCount} tasks failed`)
    this.name = 'AllTasksFailedError'
  }
}

/**
 * Error when scheduler encounters an issue.
 */
export class SchedulerError extends TeamError {
  constructor(message: string) {
    super(`Scheduler error: ${message}`)
    this.name = 'SchedulerError'
  }
}

/**
 * Error when circular dependency is detected.
 */
export class CircularDependencyError extends SchedulerError {
  constructor(public readonly cycle: string[]) {
    super(`Circular dependency detected: ${cycle.join(' -> ')}`)
    this.name = 'CircularDependencyError'
  }
}
