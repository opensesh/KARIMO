/**
 * KARIMO Subagent Registry
 *
 * Manages the lifecycle of spawned subagents, tracking their
 * execution state and aggregating usage statistics.
 */

import type {
  SubagentExecution,
  SubagentResult,
  SubagentSpawnRequest,
  SubagentStatus,
} from './types'

/**
 * Aggregated token usage across all subagents.
 */
export interface AggregatedUsage {
  /** Total input tokens */
  totalInputTokens: number

  /** Total output tokens */
  totalOutputTokens: number

  /** Total cache read tokens */
  totalCacheReadTokens: number

  /** Count by model */
  byModel: Record<string, { input: number; output: number }>

  /** Count of executions */
  executionCount: number

  /** Count of failed executions */
  failedCount: number
}

/**
 * Registry for managing subagent executions.
 *
 * Provides lifecycle management, usage tracking, and query capabilities.
 *
 * @example
 * ```typescript
 * const registry = new AgentRegistry()
 *
 * // Register a new execution
 * const execution = registry.register(request)
 *
 * // Mark as running
 * registry.markRunning(request.id)
 *
 * // Complete with result
 * registry.complete(request.id, result)
 *
 * // Get aggregated usage
 * const usage = registry.getAggregatedUsage()
 * ```
 */
export class AgentRegistry {
  private executions: Map<string, SubagentExecution> = new Map()

  /**
   * Register a new subagent execution.
   *
   * @param request - The spawn request
   * @returns The created execution record
   */
  register(request: SubagentSpawnRequest): SubagentExecution {
    const execution: SubagentExecution = {
      request,
      status: 'pending',
    }

    this.executions.set(request.id, execution)
    return execution
  }

  /**
   * Mark an execution as running.
   *
   * @param spawnId - The spawn ID
   */
  markRunning(spawnId: string): void {
    const execution = this.executions.get(spawnId)
    if (execution) {
      execution.status = 'running'
      execution.startedAt = new Date()
    }
  }

  /**
   * Complete an execution with a result.
   *
   * @param spawnId - The spawn ID
   * @param result - The execution result
   */
  complete(spawnId: string, result: SubagentResult): void {
    const execution = this.executions.get(spawnId)
    if (execution) {
      execution.status = result.status === 'completed' ? 'completed' : 'failed'
      execution.completedAt = new Date()
      execution.result = result
    }
  }

  /**
   * Cancel an execution.
   *
   * @param spawnId - The spawn ID
   */
  cancel(spawnId: string): void {
    const execution = this.executions.get(spawnId)
    if (execution && (execution.status === 'pending' || execution.status === 'running')) {
      execution.status = 'cancelled'
      execution.completedAt = new Date()
    }
  }

  /**
   * Get an execution by ID.
   *
   * @param spawnId - The spawn ID
   * @returns The execution or undefined
   */
  get(spawnId: string): SubagentExecution | undefined {
    return this.executions.get(spawnId)
  }

  /**
   * Get all executions with a specific status.
   *
   * @param status - The status to filter by
   * @returns Array of matching executions
   */
  getByStatus(status: SubagentStatus): SubagentExecution[] {
    return Array.from(this.executions.values()).filter((e) => e.status === status)
  }

  /**
   * Get all executions for a parent agent type.
   *
   * @param parent - The parent agent type
   * @returns Array of matching executions
   */
  getByParent(parent: string): SubagentExecution[] {
    return Array.from(this.executions.values()).filter((e) => e.request.parent === parent)
  }

  /**
   * Get all completed results.
   *
   * @returns Array of results
   */
  getCompletedResults(): SubagentResult[] {
    return Array.from(this.executions.values())
      .filter((e) => e.result !== undefined)
      .map((e) => e.result as SubagentResult)
  }

  /**
   * Get aggregated token usage across all completed executions.
   *
   * @returns Aggregated usage statistics
   */
  getAggregatedUsage(): AggregatedUsage {
    const usage: AggregatedUsage = {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      byModel: {},
      executionCount: 0,
      failedCount: 0,
    }

    for (const execution of this.executions.values()) {
      if (execution.result) {
        usage.executionCount++

        if (execution.result.status !== 'completed') {
          usage.failedCount++
        }

        const resultUsage = execution.result.usage
        usage.totalInputTokens += resultUsage.inputTokens
        usage.totalOutputTokens += resultUsage.outputTokens
        usage.totalCacheReadTokens += resultUsage.cacheReadTokens ?? 0

        // Track by model
        const model = resultUsage.model
        if (!usage.byModel[model]) {
          usage.byModel[model] = { input: 0, output: 0 }
        }
        const modelUsage = usage.byModel[model]
        if (modelUsage) {
          modelUsage.input += resultUsage.inputTokens
          modelUsage.output += resultUsage.outputTokens
        }
      }
    }

    return usage
  }

  /**
   * Check if there are any running executions.
   *
   * @returns True if any executions are running
   */
  hasRunning(): boolean {
    return this.getByStatus('running').length > 0
  }

  /**
   * Check if there are any pending executions.
   *
   * @returns True if any executions are pending
   */
  hasPending(): boolean {
    return this.getByStatus('pending').length > 0
  }

  /**
   * Get count of executions by status.
   *
   * @returns Object with counts per status
   */
  getCounts(): Record<SubagentStatus, number> {
    const counts: Record<SubagentStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }

    for (const execution of this.executions.values()) {
      counts[execution.status]++
    }

    return counts
  }

  /**
   * Clear all executions.
   */
  clear(): void {
    this.executions.clear()
  }

  /**
   * Export executions for session persistence.
   *
   * @returns Array of execution data
   */
  export(): Array<{ request: SubagentSpawnRequest; result?: SubagentResult }> {
    return Array.from(this.executions.values()).map((e) => ({
      request: e.request,
      result: e.result,
    }))
  }

  /**
   * Import executions from persisted data.
   *
   * @param data - Previously exported execution data
   */
  import(data: Array<{ request: SubagentSpawnRequest; result?: SubagentResult }>): void {
    for (const item of data) {
      const execution: SubagentExecution = {
        request: item.request,
        status: item.result
          ? item.result.status === 'completed'
            ? 'completed'
            : 'failed'
          : 'pending',
        result: item.result,
      }
      this.executions.set(item.request.id, execution)
    }
  }
}

/**
 * Create a new agent registry.
 *
 * @returns A new AgentRegistry instance
 */
export function createAgentRegistry(): AgentRegistry {
  return new AgentRegistry()
}
