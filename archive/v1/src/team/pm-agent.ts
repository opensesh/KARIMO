/**
 * KARIMO PM Agent
 *
 * TypeScript coordinator for parallel task execution.
 * This is NOT an AI agent — it's a deterministic orchestration loop.
 */

import { AllTasksFailedError, PMAgentError } from './errors'
import { formatFindingsForPrompt } from './findings'
import { claimTask, completeTask, createQueue, markTaskRunning, readQueue } from './queue'
import {
  type SchedulerConfig,
  detectFileOverlaps,
  getNextBatch,
  getQueueProgress,
  isQueueComplete,
} from './scheduler'
import type {
  OverlapGroup,
  PMAgentOptions,
  PMAgentResult,
  TaskFinding,
  TeamTaskEntry,
  TeamTaskQueue,
} from './types'

/**
 * Agent execution handle for tracking spawned agents.
 */
interface AgentExecution {
  taskId: string
  agentId: string
  promise: Promise<AgentExecutionResult>
  startedAt: number
}

/**
 * Result from an agent execution.
 */
export interface AgentExecutionResult {
  taskId: string
  success: boolean
  error?: string
  prUrl?: string
  findings?: TaskFinding[]
}

/**
 * Task executor function type.
 * The PM Agent is given this function to execute individual tasks.
 */
export type TaskExecutor = (
  task: TeamTaskEntry,
  agentId: string,
  findingsContext: string
) => Promise<AgentExecutionResult>

/**
 * PM Agent coordinator.
 *
 * Manages parallel task execution with:
 * - Dependency resolution
 * - File overlap avoidance
 * - Cross-agent communication via findings
 * - Graceful error handling
 */
export class PMAgent {
  private readonly options: PMAgentOptions
  private readonly schedulerConfig: SchedulerConfig
  private readonly taskExecutor: TaskExecutor
  private readonly runningAgents: Map<string, AgentExecution> = new Map()
  private readonly completedTaskIds: Set<string> = new Set()
  private allFindings: TaskFinding[] = []
  private overlapGroups: OverlapGroup[] = []
  private startTime = 0
  private agentCounter = 0

  constructor(options: PMAgentOptions, taskExecutor: TaskExecutor) {
    this.options = options
    this.taskExecutor = taskExecutor
    this.schedulerConfig = {
      maxParallelAgents: options.maxParallelAgents,
      respectFileOverlaps: true,
    }
  }

  /**
   * Run the PM Agent coordination loop.
   */
  async run(tasks: TeamTaskEntry[]): Promise<PMAgentResult> {
    this.startTime = Date.now()

    // Initialize queue
    await this.initializeQueue(tasks)

    // Detect file overlaps upfront
    this.overlapGroups = detectFileOverlaps(tasks)

    // Main coordination loop
    while (!isQueueComplete(await this.getCurrentQueue())) {
      // Spawn new agents for ready tasks
      await this.spawnAgentsForReadyTasks()

      // Wait for at least one agent to complete
      if (this.runningAgents.size > 0) {
        const completed = await this.waitForCompletion()
        await this.processCompletedAgent(completed)
      } else {
        // No running agents and queue not complete — check for deadlock
        const currentQueue = await this.getCurrentQueue()
        const progress = getQueueProgress(currentQueue)

        if (progress.pending === 0 && progress.blocked === 0) {
          // All tasks either completed or failed, we're done
          break
        }

        if (progress.failed > 0 && this.options.stopOnFailure) {
          throw new PMAgentError(this.options.phaseId, 'Stopped due to task failure')
        }

        // Potential deadlock — all remaining tasks are blocked
        if (progress.running === 0 && progress.pending + progress.blocked > 0) {
          throw new PMAgentError(
            this.options.phaseId,
            'Deadlock detected: no tasks can be scheduled but queue is not complete'
          )
        }
      }
    }

    // Build final result
    return this.buildResult()
  }

  /**
   * Initialize the task queue.
   */
  private async initializeQueue(tasks: TeamTaskEntry[]): Promise<void> {
    await createQueue(this.options.projectRoot, this.options.phaseId, tasks)
  }

  /**
   * Get the current queue state.
   */
  private async getCurrentQueue(): Promise<TeamTaskQueue> {
    return readQueue(this.options.projectRoot, this.options.phaseId)
  }

  /**
   * Spawn agents for tasks that are ready.
   */
  private async spawnAgentsForReadyTasks(): Promise<void> {
    const queue = await this.getCurrentQueue()
    const runningTaskIds = new Set(Array.from(this.runningAgents.values()).map((a) => a.taskId))

    const batch = getNextBatch(
      queue,
      runningTaskIds,
      this.completedTaskIds,
      this.overlapGroups,
      this.schedulerConfig
    )

    for (const task of batch) {
      await this.spawnAgent(task)
    }
  }

  /**
   * Spawn an agent for a task.
   */
  private async spawnAgent(task: TeamTaskEntry): Promise<void> {
    const agentId = this.generateAgentId()

    // Claim the task
    const claimResult = await claimTask(
      this.options.projectRoot,
      this.options.phaseId,
      task.taskId,
      { agentId }
    )

    if (!claimResult.success) {
      // Task was claimed by another agent, skip
      return
    }

    // Mark as running
    await markTaskRunning(this.options.projectRoot, this.options.phaseId, task.taskId)

    // Build findings context
    const findingsContext = formatFindingsForPrompt(task.findings)

    // Start the agent
    const promise = this.taskExecutor(task, agentId, findingsContext)

    const execution: AgentExecution = {
      taskId: task.taskId,
      agentId,
      promise,
      startedAt: Date.now(),
    }

    this.runningAgents.set(agentId, execution)
  }

  /**
   * Wait for at least one agent to complete.
   */
  private async waitForCompletion(): Promise<AgentExecution> {
    const executions = Array.from(this.runningAgents.values())

    // Race all promises to find the first to complete
    const result = await Promise.race(
      executions.map(async (exec) => {
        await exec.promise
        return exec
      })
    )

    return result
  }

  /**
   * Process a completed agent execution.
   */
  private async processCompletedAgent(execution: AgentExecution): Promise<void> {
    // Get the result
    const result = await execution.promise

    // Build completion result with proper optional handling
    const completionResult: {
      success: boolean
      error?: string
      prUrl?: string
      findings?: TaskFinding[]
    } = {
      success: result.success,
    }

    if (result.error !== undefined) {
      completionResult.error = result.error
    }
    if (result.prUrl !== undefined) {
      completionResult.prUrl = result.prUrl
    }
    if (result.findings !== undefined) {
      completionResult.findings = result.findings
    }

    // Update queue
    await completeTask(
      this.options.projectRoot,
      this.options.phaseId,
      execution.taskId,
      completionResult
    )

    // Track completion
    this.completedTaskIds.add(execution.taskId)
    this.runningAgents.delete(execution.agentId)

    // Collect findings
    if (result.findings) {
      this.allFindings.push(...result.findings)
    }

    // Notify callback
    if (this.options.onTaskComplete) {
      this.options.onTaskComplete(execution.taskId, result.success)
    }

    // Notify finding callbacks
    if (this.options.onFinding && result.findings) {
      for (const finding of result.findings) {
        this.options.onFinding(finding)
      }
    }

    // Check stop on failure
    if (!result.success && this.options.stopOnFailure) {
      // Cancel remaining agents
      await this.cancelAllAgents()
      throw new PMAgentError(
        this.options.phaseId,
        `Stopped due to failure of task ${execution.taskId}: ${result.error}`
      )
    }
  }

  /**
   * Cancel all running agents.
   */
  private async cancelAllAgents(): Promise<void> {
    // In a real implementation, this would send cancellation signals
    // For now, we just clear the tracking
    this.runningAgents.clear()
  }

  /**
   * Build the final result.
   */
  private async buildResult(): Promise<PMAgentResult> {
    const queue = await this.getCurrentQueue()
    const progress = getQueueProgress(queue)
    const durationMs = Date.now() - this.startTime

    // Check if all tasks failed
    if (progress.completed === 0 && progress.failed > 0) {
      throw new AllTasksFailedError(this.options.phaseId, progress.failed)
    }

    return {
      phaseId: this.options.phaseId,
      totalTasks: progress.total,
      completedTasks: progress.completed,
      failedTasks: progress.failed,
      durationMs,
      findings: this.allFindings,
      success: progress.failed === 0,
    }
  }

  /**
   * Generate a unique agent ID.
   */
  private generateAgentId(): string {
    return `agent-${this.options.phaseId}-${++this.agentCounter}`
  }
}

/**
 * Create and run a PM Agent.
 */
export async function runPMAgent(
  options: PMAgentOptions,
  tasks: TeamTaskEntry[],
  taskExecutor: TaskExecutor
): Promise<PMAgentResult> {
  const pmAgent = new PMAgent(options, taskExecutor)
  return pmAgent.run(tasks)
}

/**
 * Create a task entry from basic task data.
 */
export function createTaskEntry(
  taskId: string,
  blockedBy: string[],
  filesAffected: string[]
): TeamTaskEntry {
  return {
    taskId,
    status: 'pending',
    claimedBy: null,
    blockedBy,
    filesAffected,
    findings: [],
  }
}

/**
 * Create task entries from PRD task data.
 */
export interface PRDTaskData {
  id: string
  depends_on: string[]
  files: string[]
}

export function createTaskEntriesFromPRD(prdTasks: PRDTaskData[]): TeamTaskEntry[] {
  return prdTasks.map((task) => createTaskEntry(task.id, task.depends_on, task.files))
}
