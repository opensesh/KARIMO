/**
 * KARIMO Agents Module
 *
 * Agent spawning, sandbox configuration, and prompt building.
 * Handles launching AI agents (Claude Code, Codex, Gemini) in isolated
 * worktree environments with restricted access.
 */

// =============================================================================
// Error Classes
// =============================================================================

export {
  KarimoAgentError,
  AgentNotFoundError,
  AgentSpawnError,
  AgentTimeoutError,
  AgentExecutionError,
} from './errors'

// =============================================================================
// Types
// =============================================================================

export type {
  AgentEngine,
  AgentEngineInterface,
  AgentExecuteOptions,
  AgentExecuteResult,
  AgentPromptContext,
  AgentSpawnOptions,
  AgentProcessInfo,
} from './types'

// Re-export legacy types for backward compatibility
export type { AgentResult, AgentOptions } from '@/types'

// =============================================================================
// Prompt Building
// =============================================================================

export { buildAgentPrompt } from './prompt-builder'

// =============================================================================
// Sandbox Environment
// =============================================================================

export {
  buildAgentEnvironment,
  isEnvVariableSafe,
  getExcludedEnvVariables,
  getIncludedEnvVariables,
} from './sandbox'

// =============================================================================
// Agent Engines
// =============================================================================

export { ClaudeCodeEngine, createClaudeCodeEngine } from './claude-code'
