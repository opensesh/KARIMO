/**
 * KARIMO Agents Module
 *
 * Agent spawning, sandbox configuration, and environment filtering.
 * Handles launching AI agents (Claude Code, Codex, Gemini) in isolated
 * worktree environments with restricted access.
 */

export type { AgentResult, AgentOptions } from '@/types'

// Supported agent engines
export type AgentEngine = 'claude-code' | 'codex' | 'gemini'

// Agent spawn options
export interface SpawnOptions {
  engine: AgentEngine
  taskPrompt: string
  workdir: string
  maxIterations: number
  costCeiling: number
  env: Record<string, string>
  onProgress?: (iterationCount: number, logs: string) => void
}

// Agent process info
export interface AgentProcess {
  pid: number
  engine: AgentEngine
  startedAt: Date
  status: 'running' | 'completed' | 'aborted' | 'failed'
}

// Sandbox environment
export interface SandboxEnvironment {
  workdir: string
  allowedEnv: string[]
  readOnlyPaths: string[]
  writablePaths: string[]
}
