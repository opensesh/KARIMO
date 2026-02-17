/**
 * KARIMO Team Queue Management
 *
 * File-based task queue with atomic operations and optimistic concurrency.
 * Uses file locking to prevent race conditions between parallel agents.
 */

import { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  QueueLockError,
  QueueNotFoundError,
  QueueReadError,
  QueueVersionConflictError,
  QueueWriteError,
  TaskAlreadyClaimedError,
  TaskBlockedError,
  TaskNotFoundError,
} from './errors'
import type { ClaimOptions, ClaimResult, TaskFinding, TeamTaskEntry, TeamTaskQueue } from './types'

/**
 * Directory for team queues.
 */
const TEAM_DIR = '.karimo/team'

/**
 * Lock file suffix.
 */
const LOCK_SUFFIX = '.lock'

/**
 * Default lock timeout in milliseconds.
 */
const DEFAULT_LOCK_TIMEOUT = 5000

/**
 * Lock polling interval in milliseconds.
 */
const LOCK_POLL_INTERVAL = 50

/**
 * Get the path to a queue file.
 */
export function getQueuePath(projectRoot: string, phaseId: string): string {
  return join(projectRoot, TEAM_DIR, phaseId, 'queue.json')
}

/**
 * Get the path to a queue lock file.
 */
export function getLockPath(projectRoot: string, phaseId: string): string {
  return join(projectRoot, TEAM_DIR, phaseId, `queue.json${LOCK_SUFFIX}`)
}

/**
 * Get the team directory path for a phase.
 */
export function getTeamDir(projectRoot: string, phaseId: string): string {
  return join(projectRoot, TEAM_DIR, phaseId)
}

/**
 * Ensure the team directory exists.
 */
export function ensureTeamDir(projectRoot: string, phaseId: string): void {
  const dir = getTeamDir(projectRoot, phaseId)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/**
 * Check if a queue exists.
 */
export function queueExists(projectRoot: string, phaseId: string): boolean {
  return existsSync(getQueuePath(projectRoot, phaseId))
}

/**
 * Simple file lock implementation using exclusive file creation.
 * Uses writeFileSync with 'wx' flag for atomic lock acquisition.
 */
async function acquireLock(
  lockPath: string,
  timeout: number = DEFAULT_LOCK_TIMEOUT
): Promise<boolean> {
  const startTime = Date.now()
  const lockData = JSON.stringify({ timestamp: Date.now(), pid: process.pid })

  while (Date.now() - startTime < timeout) {
    try {
      // Try exclusive file creation - fails if file already exists
      writeFileSync(lockPath, lockData, { flag: 'wx' })
      return true
    } catch (err) {
      // File exists - check if it's stale
      if (existsSync(lockPath)) {
        try {
          const content = readFileSync(lockPath, 'utf8')
          if (content.trim() === '') {
            // Empty file, delete and retry
            try {
              unlinkSync(lockPath)
            } catch {
              // Ignore
            }
            continue
          }
          const data = JSON.parse(content) as { timestamp: number }
          if (Date.now() - data.timestamp > 30000) {
            // Stale lock (> 30 seconds), delete and retry
            try {
              unlinkSync(lockPath)
            } catch {
              // Ignore
            }
            continue
          }
        } catch {
          // Malformed lock file, delete and retry
          try {
            unlinkSync(lockPath)
          } catch {
            // Ignore
          }
          continue
        }
      }
    }

    // Wait before retrying
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_INTERVAL))
  }

  return false
}

/**
 * Release a file lock.
 */
function releaseLock(lockPath: string): void {
  try {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath)
    }
  } catch {
    // Ignore errors during lock release
  }
}

/**
 * Read a queue from disk.
 */
export async function readQueue(projectRoot: string, phaseId: string): Promise<TeamTaskQueue> {
  const queuePath = getQueuePath(projectRoot, phaseId)

  if (!existsSync(queuePath)) {
    throw new QueueNotFoundError(phaseId, queuePath)
  }

  try {
    const content = await Bun.file(queuePath).text()
    return JSON.parse(content) as TeamTaskQueue
  } catch (error) {
    throw new QueueReadError(phaseId, (error as Error).message)
  }
}

/**
 * Write a queue to disk (internal, assumes lock is held).
 * Does not acquire lock - caller must hold the lock.
 */
async function writeQueueInternal(
  projectRoot: string,
  queue: TeamTaskQueue,
  expectedVersion?: number
): Promise<void> {
  const queuePath = getQueuePath(projectRoot, queue.phaseId)

  // Ensure directory exists
  ensureTeamDir(projectRoot, queue.phaseId)

  try {
    // Check version if expected
    if (expectedVersion !== undefined && existsSync(queuePath)) {
      const current = await readQueue(projectRoot, queue.phaseId)
      if (current.version !== expectedVersion) {
        throw new QueueVersionConflictError(queue.phaseId, expectedVersion, current.version)
      }
    }

    // Update version and timestamp
    queue.version++
    queue.updatedAt = new Date().toISOString()

    // Write queue
    await Bun.write(queuePath, JSON.stringify(queue, null, 2))
  } catch (error) {
    if (error instanceof QueueVersionConflictError) {
      throw error
    }
    throw new QueueWriteError(queue.phaseId, (error as Error).message)
  }
}

/**
 * Write a queue to disk.
 * Acquires lock, writes, and releases lock.
 */
export async function writeQueue(
  projectRoot: string,
  queue: TeamTaskQueue,
  expectedVersion?: number
): Promise<void> {
  const lockPath = getLockPath(projectRoot, queue.phaseId)

  // Ensure directory exists before acquiring lock (lock file needs parent directory)
  ensureTeamDir(projectRoot, queue.phaseId)

  // Acquire lock
  const acquired = await acquireLock(lockPath)
  if (!acquired) {
    throw new QueueLockError(queue.phaseId, DEFAULT_LOCK_TIMEOUT)
  }

  try {
    await writeQueueInternal(projectRoot, queue, expectedVersion)
  } finally {
    releaseLock(lockPath)
  }
}

/**
 * Create a new queue for a phase.
 */
export async function createQueue(
  projectRoot: string,
  phaseId: string,
  tasks: TeamTaskEntry[]
): Promise<TeamTaskQueue> {
  const queue: TeamTaskQueue = {
    phaseId,
    version: 0,
    tasks,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await writeQueue(projectRoot, queue)
  return queue
}

/**
 * Claim a task for execution.
 */
export async function claimTask(
  projectRoot: string,
  phaseId: string,
  taskId: string,
  options: ClaimOptions
): Promise<ClaimResult> {
  const lockPath = getLockPath(projectRoot, phaseId)

  // Ensure directory exists before acquiring lock
  ensureTeamDir(projectRoot, phaseId)

  // Acquire lock
  const acquired = await acquireLock(lockPath, options.timeout ?? DEFAULT_LOCK_TIMEOUT)
  if (!acquired) {
    return {
      success: false,
      reason: `Could not acquire lock within ${options.timeout ?? DEFAULT_LOCK_TIMEOUT}ms`,
    }
  }

  try {
    const queue = await readQueue(projectRoot, phaseId)

    // Find the task
    const task = queue.tasks.find((t) => t.taskId === taskId)
    if (!task) {
      throw new TaskNotFoundError(phaseId, taskId)
    }

    // Check if already claimed
    if (task.status === 'claimed' || task.status === 'running') {
      if (task.claimedBy && task.claimedBy !== options.agentId) {
        throw new TaskAlreadyClaimedError(taskId, task.claimedBy)
      }
    }

    // Check if blocked
    if (task.blockedBy.length > 0) {
      // Check if all blocking tasks are completed
      const stillBlocked = task.blockedBy.filter((blockerId) => {
        const blocker = queue.tasks.find((t) => t.taskId === blockerId)
        return blocker && blocker.status !== 'completed'
      })

      if (stillBlocked.length > 0) {
        throw new TaskBlockedError(taskId, stillBlocked)
      }

      // Clear blockedBy since all are completed
      task.blockedBy = []
    }

    // Check if task is in claimable state
    if (task.status !== 'pending' && task.status !== 'blocked') {
      return {
        success: false,
        reason: `Task is in ${task.status} state, cannot claim`,
      }
    }

    // Claim the task
    task.status = 'claimed'
    task.claimedBy = options.agentId
    task.claimedAt = new Date().toISOString()

    // Write back (use internal since we already hold the lock)
    // Pass current version as expected - writeQueueInternal checks this matches disk then increments
    await writeQueueInternal(projectRoot, queue, queue.version)

    return {
      success: true,
      task,
    }
  } catch (error) {
    if (
      error instanceof TaskNotFoundError ||
      error instanceof TaskAlreadyClaimedError ||
      error instanceof TaskBlockedError
    ) {
      return {
        success: false,
        reason: error.message,
      }
    }
    throw error
  } finally {
    releaseLock(lockPath)
  }
}

/**
 * Mark a task as running.
 */
export async function markTaskRunning(
  projectRoot: string,
  phaseId: string,
  taskId: string
): Promise<void> {
  const lockPath = getLockPath(projectRoot, phaseId)

  // Ensure directory exists before acquiring lock
  ensureTeamDir(projectRoot, phaseId)

  const acquired = await acquireLock(lockPath)
  if (!acquired) {
    throw new QueueLockError(phaseId, DEFAULT_LOCK_TIMEOUT)
  }

  try {
    const queue = await readQueue(projectRoot, phaseId)
    const task = queue.tasks.find((t) => t.taskId === taskId)

    if (!task) {
      throw new TaskNotFoundError(phaseId, taskId)
    }

    task.status = 'running'
    task.startedAt = new Date().toISOString()

    // Use internal since we already hold the lock
    // Pass current version as expected - writeQueueInternal checks this matches disk then increments
    await writeQueueInternal(projectRoot, queue, queue.version)
  } finally {
    releaseLock(lockPath)
  }
}

/**
 * Complete a task.
 */
export async function completeTask(
  projectRoot: string,
  phaseId: string,
  taskId: string,
  result: { success: boolean; error?: string; prUrl?: string; findings?: TaskFinding[] }
): Promise<void> {
  const lockPath = getLockPath(projectRoot, phaseId)

  // Ensure directory exists before acquiring lock
  ensureTeamDir(projectRoot, phaseId)

  const acquired = await acquireLock(lockPath)
  if (!acquired) {
    throw new QueueLockError(phaseId, DEFAULT_LOCK_TIMEOUT)
  }

  try {
    const queue = await readQueue(projectRoot, phaseId)
    const task = queue.tasks.find((t) => t.taskId === taskId)

    if (!task) {
      throw new TaskNotFoundError(phaseId, taskId)
    }

    task.status = result.success ? 'completed' : 'failed'
    task.completedAt = new Date().toISOString()

    if (result.error) {
      task.error = result.error
    }

    if (result.prUrl) {
      task.prUrl = result.prUrl
    }

    // Add findings to affected tasks
    if (result.findings) {
      for (const finding of result.findings) {
        const targetTask = queue.tasks.find((t) => t.taskId === finding.toTaskId)
        if (targetTask) {
          targetTask.findings.push(finding)
        }
      }
    }

    // Use internal since we already hold the lock
    // Pass current version as expected - writeQueueInternal checks this matches disk then increments
    await writeQueueInternal(projectRoot, queue, queue.version)
  } finally {
    releaseLock(lockPath)
  }
}

/**
 * Get all tasks ready to be claimed.
 */
export async function getReadyTasks(
  projectRoot: string,
  phaseId: string
): Promise<TeamTaskEntry[]> {
  const queue = await readQueue(projectRoot, phaseId)

  return queue.tasks.filter((task) => {
    // Must be pending
    if (task.status !== 'pending' && task.status !== 'blocked') {
      return false
    }

    // Check if all dependencies are completed
    const stillBlocked = task.blockedBy.filter((blockerId) => {
      const blocker = queue.tasks.find((t) => t.taskId === blockerId)
      return blocker && blocker.status !== 'completed'
    })

    return stillBlocked.length === 0
  })
}

/**
 * Get queue statistics.
 */
export interface QueueStats {
  total: number
  pending: number
  claimed: number
  running: number
  completed: number
  failed: number
  blocked: number
}

export async function getQueueStats(projectRoot: string, phaseId: string): Promise<QueueStats> {
  const queue = await readQueue(projectRoot, phaseId)

  const stats: QueueStats = {
    total: queue.tasks.length,
    pending: 0,
    claimed: 0,
    running: 0,
    completed: 0,
    failed: 0,
    blocked: 0,
  }

  for (const task of queue.tasks) {
    switch (task.status) {
      case 'pending':
        stats.pending++
        break
      case 'claimed':
        stats.claimed++
        break
      case 'running':
        stats.running++
        break
      case 'completed':
        stats.completed++
        break
      case 'failed':
        stats.failed++
        break
      case 'blocked':
        stats.blocked++
        break
    }
  }

  return stats
}
