/**
 * KARIMO Team Module Types
 *
 * Type definitions for the agent team coordination system.
 * Teams enable parallel task execution with file-level conflict avoidance.
 */

/**
 * Task status in the team queue.
 */
export type TeamTaskStatus =
  | 'pending' // Ready to be claimed
  | 'claimed' // Claimed but not yet running
  | 'running' // Currently being executed
  | 'completed' // Successfully completed
  | 'failed' // Execution failed
  | 'blocked' // Waiting on dependencies

/**
 * Finding type for cross-agent communication.
 */
export type FindingType =
  | 'affects-file' // Task affects a file another task depends on
  | 'interface-change' // API/interface was modified
  | 'discovered-dependency' // Found a dependency not in the original graph
  | 'warning' // Non-blocking warning
  | 'info' // Informational message

/**
 * A finding from one task that affects another.
 */
export interface TaskFinding {
  /** Source task ID that generated this finding */
  fromTaskId: string

  /** Target task ID that may be affected */
  toTaskId: string

  /** Type of finding */
  type: FindingType

  /** Description of the finding */
  message: string

  /** Affected files (if applicable) */
  files?: string[]

  /** Whether this should block the target task */
  blocking?: boolean

  /** Timestamp when finding was created */
  createdAt: string
}

/**
 * A single task entry in the team queue.
 */
export interface TeamTaskEntry {
  /** Task ID */
  taskId: string

  /** Current status */
  status: TeamTaskStatus

  /** Agent ID that claimed this task (if any) */
  claimedBy: string | null

  /** Task IDs this task is blocked by */
  blockedBy: string[]

  /** Files this task affects (for overlap detection) */
  filesAffected: string[]

  /** Findings from other tasks that affect this task */
  findings: TaskFinding[]

  /** When the task was claimed */
  claimedAt?: string

  /** When the task started running */
  startedAt?: string

  /** When the task completed */
  completedAt?: string

  /** Error message if failed */
  error?: string

  /** PR URL if created */
  prUrl?: string
}

/**
 * The shared task queue for a phase.
 */
export interface TeamTaskQueue {
  /** Phase ID this queue belongs to */
  phaseId: string

  /** Version for optimistic concurrency control */
  version: number

  /** All tasks in this phase */
  tasks: TeamTaskEntry[]

  /** When the queue was created */
  createdAt: string

  /** When the queue was last updated */
  updatedAt: string
}

/**
 * Options for claiming a task.
 */
export interface ClaimOptions {
  /** Agent ID claiming the task */
  agentId: string

  /** Timeout for claim (in milliseconds) */
  timeout?: number
}

/**
 * Result of a claim attempt.
 */
export interface ClaimResult {
  /** Whether the claim was successful */
  success: boolean

  /** The task entry if successful */
  task?: TeamTaskEntry

  /** Reason for failure if not successful */
  reason?: string
}

/**
 * Options for the PM Agent coordinator.
 */
export interface PMAgentOptions {
  /** Maximum parallel agents */
  maxParallelAgents: number

  /** Phase ID to coordinate */
  phaseId: string

  /** Project root directory */
  projectRoot: string

  /** Whether to stop on first failure */
  stopOnFailure?: boolean

  /** Callback when a task completes */
  onTaskComplete?: (taskId: string, success: boolean) => void

  /** Callback when a finding is created */
  onFinding?: (finding: TaskFinding) => void
}

/**
 * Result from PM Agent execution.
 */
export interface PMAgentResult {
  /** Phase ID that was executed */
  phaseId: string

  /** Total tasks in the phase */
  totalTasks: number

  /** Number of completed tasks */
  completedTasks: number

  /** Number of failed tasks */
  failedTasks: number

  /** Duration in milliseconds */
  durationMs: number

  /** All findings generated */
  findings: TaskFinding[]

  /** Whether all tasks succeeded */
  success: boolean
}

/**
 * File overlap group.
 */
export interface OverlapGroup {
  /** Group ID */
  id: string

  /** Task IDs in this overlap group */
  taskIds: string[]

  /** Shared files between tasks */
  sharedFiles: string[]
}

/**
 * Scheduler decision for a task.
 */
export interface SchedulerDecision {
  /** Task ID */
  taskId: string

  /** Whether the task can be scheduled now */
  canSchedule: boolean

  /** Reason if cannot schedule */
  reason?: string

  /** Priority score (higher = run sooner) */
  priority: number
}
