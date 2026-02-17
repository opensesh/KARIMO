/**
 * KARIMO Subagent Spawner
 *
 * Executes subagents using the same API client as the parent agent.
 * Supports both sequential and parallel execution.
 */

import { getAnthropicClient } from '../conversation'
import type { ConversationMessage } from '../types'
import { getSubagentPrompt } from './prompts'
import type { AgentRegistry } from './registry'
import type { SubagentResult, SubagentSpawnRequest, SubagentTokenUsage } from './types'

/**
 * Default timeout for subagent execution (60 seconds).
 */
const DEFAULT_TIMEOUT = 60_000

/**
 * Default model for subagents.
 */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

/**
 * Options for spawning subagents.
 */
export interface SpawnOptions {
  /** Model to use (defaults to claude-sonnet-4) */
  model?: string

  /** Temperature for generation */
  temperature?: number

  /** Maximum tokens for response */
  maxTokens?: number
}

/**
 * Options for parallel spawning.
 */
export interface ParallelSpawnOptions extends SpawnOptions {
  /** Maximum concurrent executions */
  maxConcurrency?: number

  /** Whether to stop on first failure */
  stopOnFailure?: boolean
}

/**
 * Spawner for executing subagents.
 *
 * Uses the parent's API client to minimize overhead and share
 * connection pooling benefits.
 *
 * @example
 * ```typescript
 * const spawner = new SubagentSpawner(registry)
 *
 * // Spawn a single subagent
 * const result = await spawner.spawn({
 *   id: 'spawn-1',
 *   type: 'clarification',
 *   parent: 'interview',
 *   task: 'Clarify the authentication requirements',
 *   context: { prdContent: '...' },
 * })
 *
 * // Spawn multiple in parallel
 * const results = await spawner.spawnParallel([
 *   { id: 'spawn-1', type: 'section-reviewer', ... },
 *   { id: 'spawn-2', type: 'section-reviewer', ... },
 * ], { maxConcurrency: 3 })
 * ```
 */
export class SubagentSpawner {
  constructor(private registry: AgentRegistry) {}

  /**
   * Spawn a single subagent and wait for completion.
   *
   * @param request - The spawn request
   * @param options - Spawn options
   * @returns The subagent result
   */
  async spawn(request: SubagentSpawnRequest, options?: SpawnOptions): Promise<SubagentResult> {
    const { model = DEFAULT_MODEL, temperature = 0.7, maxTokens = 4096 } = options ?? {}

    // Register the execution
    this.registry.register(request)
    this.registry.markRunning(request.id)

    const startTime = Date.now()

    try {
      // Get the appropriate system prompt
      const systemPrompt = getSubagentPrompt(request.type, request.context)

      // Build messages
      const messages: ConversationMessage[] = [
        {
          role: 'user',
          content: request.task,
          timestamp: new Date().toISOString(),
        },
      ]

      // Execute with timeout
      const timeout = request.timeout ?? DEFAULT_TIMEOUT
      const response = await this.executeWithTimeout(
        systemPrompt,
        messages,
        { model, temperature, maxTokens },
        timeout
      )

      const durationMs = Date.now() - startTime

      // Build result
      const result: SubagentResult = {
        spawnId: request.id,
        status: 'completed',
        content: response.text,
        usage: response.usage,
        durationMs,
      }

      // Try to extract structured data based on type
      result.data = this.extractStructuredData(request.type, response.text)

      // Complete the execution
      this.registry.complete(request.id, result)

      return result
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout')

      const result: SubagentResult = {
        spawnId: request.id,
        status: isTimeout ? 'timeout' : 'failed',
        content: '',
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          model: model,
        },
        durationMs,
        error: errorMessage,
      }

      this.registry.complete(request.id, result)

      return result
    }
  }

  /**
   * Spawn multiple subagents in parallel.
   *
   * @param requests - Array of spawn requests
   * @param options - Parallel spawn options
   * @returns Array of results (in same order as requests)
   */
  async spawnParallel(
    requests: SubagentSpawnRequest[],
    options?: ParallelSpawnOptions
  ): Promise<SubagentResult[]> {
    const { maxConcurrency = 5, stopOnFailure = false, ...spawnOptions } = options ?? {}

    const results: SubagentResult[] = new Array(requests.length)
    const pending = [...requests.entries()]
    const running: Promise<void>[] = []

    while (pending.length > 0 || running.length > 0) {
      // Start new executions up to concurrency limit
      while (pending.length > 0 && running.length < maxConcurrency) {
        const entry = pending.shift()
        if (!entry) break

        const [index, request] = entry

        const promise = this.spawn(request, spawnOptions).then((result) => {
          results[index] = result

          // Check for failure
          if (stopOnFailure && result.status !== 'completed') {
            // Cancel remaining pending
            for (const [, pendingRequest] of pending) {
              this.registry.cancel(pendingRequest.id)
            }
            pending.length = 0
          }
        })

        running.push(promise)
      }

      // Wait for at least one to complete
      if (running.length > 0) {
        await Promise.race(running)
        // Remove completed promises
        const completed = running.filter((p) => p.then(() => true).catch(() => true))
        for (const p of completed) {
          const index = running.indexOf(p)
          if (index > -1) {
            running.splice(index, 1)
          }
        }
        // Small delay to allow promise resolution
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    // Wait for any remaining
    await Promise.all(running)

    return results
  }

  /**
   * Execute API call with timeout.
   */
  private async executeWithTimeout(
    systemPrompt: string,
    messages: ConversationMessage[],
    options: { model: string; temperature: number; maxTokens: number },
    timeout: number
  ): Promise<{ text: string; usage: SubagentTokenUsage }> {
    const client = getAnthropicClient()

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Subagent execution timeout after ${timeout}ms`)), timeout)
    })

    const executePromise = (async () => {
      const response = await client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      })

      // Extract text
      const textBlocks = response.content.filter(
        (block): block is { type: 'text'; text: string } => block.type === 'text'
      )
      const text = textBlocks.map((b) => b.text).join('\n')

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          model: options.model,
        },
      }
    })()

    return Promise.race([executePromise, timeoutPromise])
  }

  /**
   * Extract structured data from response based on subagent type.
   */
  private extractStructuredData(type: string, content: string): SubagentResult['data'] | undefined {
    // Try to parse JSON from the response
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) ?? content.match(/(\{[\s\S]*\})/)
      if (jsonMatch?.[1]) {
        const parsed = JSON.parse(jsonMatch[1])
        // Add type marker
        return { ...parsed, type: this.mapTypeToDataType(type) }
      }
    } catch {
      // Failed to parse, return undefined
    }

    return undefined
  }

  /**
   * Map subagent type to result data type.
   */
  private mapTypeToDataType(type: string): string {
    const mapping: Record<string, string> = {
      clarification: 'clarification',
      research: 'research',
      'scope-validator': 'scope-validation',
      'pattern-analyzer': 'pattern-analysis',
      'dependency-mapper': 'dependency-map',
      'section-reviewer': 'section-review',
      'complexity-validator': 'complexity-validation',
    }
    return mapping[type] ?? type
  }
}

/**
 * Create a new subagent spawner.
 *
 * @param registry - The agent registry to use
 * @returns A new SubagentSpawner instance
 */
export function createSubagentSpawner(registry: AgentRegistry): SubagentSpawner {
  return new SubagentSpawner(registry)
}
