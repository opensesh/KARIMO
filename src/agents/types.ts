/**
 * KARIMO Agent Types
 *
 * Type definitions for agent execution, configuration,
 * and result handling.
 */

import type { KarimoConfig } from '@/config/schema'
import type { Task } from '@/types'

/**
 * Supported agent engines.
 */
export type AgentEngine = 'claude-code' | 'codex' | 'gemini'

/**
 * Result of an agent execution.
 */
export interface AgentExecuteResult {
  /** Whether the execution completed successfully */
  success: boolean
  /** Exit code from the agent process */
  exitCode: number
  /** Standard output from the agent */
  stdout: string
  /** Standard error from the agent */
  stderr: string
  /** Duration of execution in milliseconds */
  durationMs: number
}

/**
 * Options for executing an agent.
 */
export interface AgentExecuteOptions {
  /** The prompt to send to the agent */
  prompt: string
  /** Working directory for the agent (usually worktree path) */
  workdir: string
  /** Sandboxed environment variables */
  env: Record<string, string>
  /** Timeout in milliseconds (optional, defaults to no timeout) */
  timeoutMs?: number
  /** JSON schema for structured output (optional) */
  jsonSchema?: string
  /** Enable extended thinking mode (optional) */
  enableThinking?: boolean
  /** Custom thinking budget in tokens (optional) */
  thinkingBudget?: number
}

/**
 * Context for building agent prompts.
 */
export interface AgentPromptContext {
  /** The task to execute */
  task: Task
  /** KARIMO configuration */
  config: KarimoConfig
  /** Root directory of the project */
  rootDir: string
  /** Phase identifier */
  phaseId: string
}

/**
 * Interface for agent engine implementations.
 * Each engine (Claude Code, Codex, Gemini) implements this interface.
 */
export interface AgentEngineInterface {
  /** Engine name identifier */
  readonly name: AgentEngine

  /**
   * Check if the agent is available (CLI installed, authenticated, etc.)
   * @returns True if the agent can be used
   */
  isAvailable(): Promise<boolean>

  /**
   * Execute the agent with the given options.
   * @param options - Execution options
   * @returns Execution result
   */
  execute(options: AgentExecuteOptions): Promise<AgentExecuteResult>
}

/**
 * Agent spawn options (used internally by orchestrator).
 */
export interface AgentSpawnOptions {
  /** Agent engine to use */
  engine: AgentEngine
  /** Task prompt */
  taskPrompt: string
  /** Working directory */
  workdir: string
  /** Maximum iterations (future: for iteration tracking) */
  maxIterations: number
  /** Cost ceiling in dollars (future: for cost tracking) */
  costCeiling: number
  /** Sandboxed environment variables */
  env: Record<string, string>
  /** Progress callback (future: for real-time updates) */
  onProgress?: (iterationCount: number, logs: string) => void
}

/**
 * Agent process info (for tracking running agents).
 */
export interface AgentProcessInfo {
  /** Process ID */
  pid: number
  /** Agent engine */
  engine: AgentEngine
  /** When the agent started */
  startedAt: Date
  /** Current status */
  status: 'running' | 'completed' | 'aborted' | 'failed'
}
