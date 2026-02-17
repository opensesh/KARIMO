/**
 * KARIMO Team Scheduler
 *
 * Parallel scheduling logic for task execution.
 * Handles dependency resolution and file overlap avoidance.
 */

import { hasBlockingFindings } from './findings'
import type { OverlapGroup, SchedulerDecision, TeamTaskEntry, TeamTaskQueue } from './types'

/**
 * Configuration for the scheduler.
 */
export interface SchedulerConfig {
  /** Maximum parallel agents */
  maxParallelAgents: number

  /** Whether to respect file overlaps */
  respectFileOverlaps: boolean
}

/**
 * Default scheduler configuration.
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxParallelAgents: 4,
  respectFileOverlaps: true,
}

/**
 * Detect file overlaps between tasks.
 * Returns groups of tasks that share files and should not run in parallel.
 */
export function detectFileOverlaps(tasks: TeamTaskEntry[]): OverlapGroup[] {
  // Map of file -> task IDs that affect it
  const fileToTasks = new Map<string, Set<string>>()

  for (const task of tasks) {
    for (const file of task.filesAffected) {
      const existing = fileToTasks.get(file) ?? new Set()
      existing.add(task.taskId)
      fileToTasks.set(file, existing)
    }
  }

  // Find groups using Union-Find
  const parent = new Map<string, string>()

  function find(taskId: string): string {
    const existingParent = parent.get(taskId)
    if (existingParent === undefined) {
      parent.set(taskId, taskId)
      return taskId
    }
    if (existingParent !== taskId) {
      const root = find(existingParent)
      parent.set(taskId, root)
      return root
    }
    return taskId
  }

  function union(a: string, b: string): void {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) {
      parent.set(rootA, rootB)
    }
  }

  // Union tasks that share files
  for (const [, taskIds] of fileToTasks) {
    if (taskIds.size > 1) {
      const ids = Array.from(taskIds)
      const firstId = ids[0]
      if (firstId !== undefined) {
        for (let i = 1; i < ids.length; i++) {
          const otherId = ids[i]
          if (otherId !== undefined) {
            union(firstId, otherId)
          }
        }
      }
    }
  }

  // Build groups
  const groups = new Map<string, Set<string>>()

  for (const task of tasks) {
    const root = find(task.taskId)
    const existing = groups.get(root) ?? new Set()
    existing.add(task.taskId)
    groups.set(root, existing)
  }

  // Convert to OverlapGroup[]
  const result: OverlapGroup[] = []
  let groupId = 0

  for (const [, taskIds] of groups) {
    if (taskIds.size > 1) {
      // Find shared files for this group
      const sharedFiles: string[] = []
      for (const [filePath, fileTasks] of fileToTasks) {
        const intersection = Array.from(fileTasks).filter((id) => taskIds.has(id))
        if (intersection.length > 1) {
          sharedFiles.push(filePath)
        }
      }

      result.push({
        id: `overlap-${groupId++}`,
        taskIds: Array.from(taskIds),
        sharedFiles,
      })
    }
  }

  return result
}

/**
 * Get the overlap group for a task, if any.
 */
export function getOverlapGroupForTask(
  taskId: string,
  overlapGroups: OverlapGroup[]
): OverlapGroup | undefined {
  return overlapGroups.find((g) => g.taskIds.includes(taskId))
}

/**
 * Check if two tasks are in the same overlap group.
 */
export function tasksOverlap(
  taskIdA: string,
  taskIdB: string,
  overlapGroups: OverlapGroup[]
): boolean {
  const groupA = getOverlapGroupForTask(taskIdA, overlapGroups)
  if (!groupA) return false
  return groupA.taskIds.includes(taskIdB)
}

/**
 * Get scheduling decisions for all pending tasks.
 */
export function getSchedulingDecisions(
  queue: TeamTaskQueue,
  runningTaskIds: Set<string>,
  completedTaskIds: Set<string>,
  overlapGroups: OverlapGroup[],
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): SchedulerDecision[] {
  const decisions: SchedulerDecision[] = []

  for (const task of queue.tasks) {
    const decision = getTaskSchedulingDecision(
      task,
      queue.tasks,
      runningTaskIds,
      completedTaskIds,
      overlapGroups,
      config
    )
    decisions.push(decision)
  }

  // Sort by priority (highest first), then by task ID for determinism
  decisions.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    return a.taskId.localeCompare(b.taskId)
  })

  return decisions
}

/**
 * Get scheduling decision for a single task.
 */
function getTaskSchedulingDecision(
  task: TeamTaskEntry,
  allTasks: TeamTaskEntry[],
  runningTaskIds: Set<string>,
  completedTaskIds: Set<string>,
  overlapGroups: OverlapGroup[],
  config: SchedulerConfig
): SchedulerDecision {
  // Already running or completed
  if (task.status === 'running' || task.status === 'claimed') {
    return {
      taskId: task.taskId,
      canSchedule: false,
      reason: 'Task is already running',
      priority: 0,
    }
  }

  if (task.status === 'completed' || task.status === 'failed') {
    return {
      taskId: task.taskId,
      canSchedule: false,
      reason: 'Task is already completed',
      priority: 0,
    }
  }

  // Check dependencies
  const unresolvedDeps = task.blockedBy.filter((depId) => {
    const depTask = allTasks.find((t) => t.taskId === depId)
    return depTask && depTask.status !== 'completed'
  })

  if (unresolvedDeps.length > 0) {
    return {
      taskId: task.taskId,
      canSchedule: false,
      reason: `Blocked by dependencies: ${unresolvedDeps.join(', ')}`,
      priority: 0,
    }
  }

  // Check blocking findings
  if (hasBlockingFindings(task)) {
    return {
      taskId: task.taskId,
      canSchedule: false,
      reason: 'Has blocking findings from other tasks',
      priority: 0,
    }
  }

  // Check file overlaps with running tasks
  if (config.respectFileOverlaps) {
    const overlapGroup = getOverlapGroupForTask(task.taskId, overlapGroups)
    if (overlapGroup) {
      const conflictingRunning = overlapGroup.taskIds.filter(
        (id) => id !== task.taskId && runningTaskIds.has(id)
      )
      if (conflictingRunning.length > 0) {
        return {
          taskId: task.taskId,
          canSchedule: false,
          reason: `File overlap with running tasks: ${conflictingRunning.join(', ')}`,
          priority: calculatePriority(task, allTasks, completedTaskIds),
        }
      }
    }
  }

  // Check agent limit
  if (runningTaskIds.size >= config.maxParallelAgents) {
    return {
      taskId: task.taskId,
      canSchedule: false,
      reason: `Agent limit reached (${config.maxParallelAgents})`,
      priority: calculatePriority(task, allTasks, completedTaskIds),
    }
  }

  // Task can be scheduled
  return {
    taskId: task.taskId,
    canSchedule: true,
    priority: calculatePriority(task, allTasks, completedTaskIds),
  }
}

/**
 * Calculate priority for a task.
 * Higher priority = run sooner.
 */
function calculatePriority(
  task: TeamTaskEntry,
  allTasks: TeamTaskEntry[],
  completedTaskIds: Set<string>
): number {
  let priority = 0

  // Boost tasks that unblock many others
  const dependents = countDependents(task.taskId, allTasks)
  priority += dependents * 10

  // Boost tasks with fewer files (faster to run)
  priority -= task.filesAffected.length

  // Boost tasks with all dependencies already completed
  const allDepsCompleted = task.blockedBy.every((id) => completedTaskIds.has(id))
  if (allDepsCompleted) {
    priority += 50
  }

  // Boost tasks without findings
  if (task.findings.length === 0) {
    priority += 20
  }

  return priority
}

/**
 * Count how many tasks depend on this task.
 */
function countDependents(taskId: string, allTasks: TeamTaskEntry[]): number {
  return allTasks.filter((t) => t.blockedBy.includes(taskId)).length
}

/**
 * Get tasks that are ready to be scheduled.
 */
export function getSchedulableTasks(
  queue: TeamTaskQueue,
  runningTaskIds: Set<string>,
  completedTaskIds: Set<string>,
  overlapGroups: OverlapGroup[],
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): TeamTaskEntry[] {
  const decisions = getSchedulingDecisions(
    queue,
    runningTaskIds,
    completedTaskIds,
    overlapGroups,
    config
  )

  const schedulable = decisions.filter((d) => d.canSchedule).map((d) => d.taskId)

  return queue.tasks.filter((t) => schedulable.includes(t.taskId))
}

/**
 * Get the next batch of tasks to schedule.
 * Respects maxParallelAgents and returns tasks in priority order.
 */
export function getNextBatch(
  queue: TeamTaskQueue,
  runningTaskIds: Set<string>,
  completedTaskIds: Set<string>,
  overlapGroups: OverlapGroup[],
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG
): TeamTaskEntry[] {
  const available = config.maxParallelAgents - runningTaskIds.size
  if (available <= 0) {
    return []
  }

  const schedulable = getSchedulableTasks(
    queue,
    runningTaskIds,
    completedTaskIds,
    overlapGroups,
    config
  )

  // Take up to available slots, but ensure we don't add conflicting overlap tasks
  const batch: TeamTaskEntry[] = []
  const batchTaskIds = new Set<string>()

  for (const task of schedulable) {
    if (batch.length >= available) break

    // Check if this task conflicts with any already in the batch
    if (config.respectFileOverlaps) {
      const wouldConflict = Array.from(batchTaskIds).some((batchTaskId) =>
        tasksOverlap(task.taskId, batchTaskId, overlapGroups)
      )
      if (wouldConflict) continue
    }

    batch.push(task)
    batchTaskIds.add(task.taskId)
  }

  return batch
}

/**
 * Check if all tasks are complete (success or failure).
 */
export function isQueueComplete(queue: TeamTaskQueue): boolean {
  return queue.tasks.every((t) => t.status === 'completed' || t.status === 'failed')
}

/**
 * Check if all tasks succeeded.
 */
export function allTasksSucceeded(queue: TeamTaskQueue): boolean {
  return queue.tasks.every((t) => t.status === 'completed')
}

/**
 * Get queue progress statistics.
 */
export interface QueueProgress {
  total: number
  completed: number
  failed: number
  running: number
  pending: number
  blocked: number
  percentComplete: number
}

export function getQueueProgress(queue: TeamTaskQueue): QueueProgress {
  const total = queue.tasks.length
  const completed = queue.tasks.filter((t) => t.status === 'completed').length
  const failed = queue.tasks.filter((t) => t.status === 'failed').length
  const running = queue.tasks.filter((t) => t.status === 'running' || t.status === 'claimed').length
  const blocked = queue.tasks.filter((t) => t.status === 'blocked').length
  const pending = queue.tasks.filter((t) => t.status === 'pending').length

  return {
    total,
    completed,
    failed,
    running,
    pending,
    blocked,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}
