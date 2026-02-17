/**
 * KARIMO Claude Code Engine
 *
 * Implementation of the AgentEngineInterface for Claude Code CLI.
 * Spawns Claude Code in print mode for non-interactive execution.
 */

import { AgentNotFoundError, AgentSpawnError, AgentTimeoutError } from './errors'
import type { AgentEngineInterface, AgentExecuteOptions, AgentExecuteResult } from './types'

/**
 * Claude Code engine implementation.
 *
 * Uses the `claude` CLI with `--print` flag for non-interactive execution.
 * Expects Claude Code to be installed and available in PATH.
 *
 * @example
 * ```typescript
 * const engine = new ClaudeCodeEngine()
 *
 * if (await engine.isAvailable()) {
 *   const result = await engine.execute({
 *     prompt: 'Implement the auth module',
 *     workdir: '/project/worktrees/phase-1',
 *     env: sandboxedEnv,
 *   })
 * }
 * ```
 */
export class ClaudeCodeEngine implements AgentEngineInterface {
  readonly name = 'claude-code' as const

  /**
   * Check if Claude Code CLI is available.
   *
   * Runs `claude --version` to verify installation.
   *
   * @returns True if Claude Code is installed and accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const proc = Bun.spawn(['claude', '--version'], {
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const exitCode = await proc.exited
      return exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Execute Claude Code with the given prompt.
   *
   * Uses `--print` flag for non-interactive execution.
   * Captures stdout/stderr and returns structured result.
   *
   * Supports extended options:
   * - `jsonSchema`: Pass to Claude Code for structured output validation
   * - `enableThinking`: Add system prompt enhancement for deeper reasoning
   * - `thinkingBudget`: Custom token budget for thinking mode
   *
   * @param options - Execution options
   * @returns Execution result with success, output, and timing
   * @throws {AgentNotFoundError} If Claude Code is not installed
   * @throws {AgentSpawnError} If process spawn fails
   * @throws {AgentTimeoutError} If execution times out
   */
  async execute(options: AgentExecuteOptions): Promise<AgentExecuteResult> {
    const { prompt, workdir, env, timeoutMs, jsonSchema, enableThinking } = options

    // Verify Claude Code is available
    if (!(await this.isAvailable())) {
      throw new AgentNotFoundError('claude-code')
    }

    const startTime = Date.now()

    try {
      // Build command arguments
      const args = ['claude', '--print']

      // Add JSON schema flag if provided
      if (jsonSchema) {
        args.push('--output-format', 'json')
      }

      // Enhance prompt for thinking mode if enabled
      let finalPrompt = prompt
      if (enableThinking) {
        finalPrompt = this.enhancePromptForThinking(prompt)
      }

      args.push(finalPrompt)

      // Build the command with --print flag for non-interactive mode
      const proc = Bun.spawn(args, {
        cwd: workdir,
        env: {
          ...env,
          // Ensure Claude Code knows it's non-interactive
          CI: 'true',
          TERM: 'dumb',
        },
        stdout: 'pipe',
        stderr: 'pipe',
      })

      // Handle timeout if specified
      if (timeoutMs !== undefined && timeoutMs > 0) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            proc.kill()
            reject(new AgentTimeoutError('claude-code', timeoutMs))
          }, timeoutMs)
        })

        const exitPromise = proc.exited

        // Race between completion and timeout
        try {
          await Promise.race([exitPromise, timeoutPromise])
        } catch (error) {
          if (error instanceof AgentTimeoutError) {
            throw error
          }
          throw new AgentSpawnError('claude-code', String(error))
        }
      }

      // Wait for process to complete
      const exitCode = await proc.exited
      const stdout = await new Response(proc.stdout).text()
      const stderr = await new Response(proc.stderr).text()
      const durationMs = Date.now() - startTime

      return {
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr,
        durationMs,
      }
    } catch (error) {
      if (error instanceof AgentTimeoutError || error instanceof AgentNotFoundError) {
        throw error
      }

      const message = error instanceof Error ? error.message : String(error)
      throw new AgentSpawnError('claude-code', message)
    }
  }
}

  /**
   * Enhance prompt with thinking mode instructions.
   *
   * Adds structured reasoning guidance to the prompt.
   */
  private enhancePromptForThinking(prompt: string): string {
    const thinkingPrefix = `## Reasoning Mode

Before implementing, take time to carefully analyze:
1. What are the key requirements and constraints?
2. What are the potential edge cases?
3. What is the best approach and why?
4. What could go wrong and how to prevent it?

Think through each step methodically before writing code.

---

`
    return thinkingPrefix + prompt
  }
}

/**
 * Create a new Claude Code engine instance.
 *
 * @returns Claude Code engine
 */
export function createClaudeCodeEngine(): AgentEngineInterface {
  return new ClaudeCodeEngine()
}
