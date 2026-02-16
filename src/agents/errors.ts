/**
 * KARIMO Agent Errors
 *
 * Error classes for agent operations including spawning,
 * execution, and timeout handling.
 */

/**
 * Base error class for all KARIMO agent errors.
 */
export class KarimoAgentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KarimoAgentError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error thrown when an agent CLI is not installed.
 */
export class AgentNotFoundError extends KarimoAgentError {
  readonly engine: string

  constructor(engine: string) {
    super(`Agent engine "${engine}" is not installed or not available in PATH`)
    this.name = 'AgentNotFoundError'
    this.engine = engine
  }
}

/**
 * Error thrown when spawning an agent process fails.
 */
export class AgentSpawnError extends KarimoAgentError {
  readonly engine: string
  readonly cause: string

  constructor(engine: string, cause: string) {
    super(`Failed to spawn ${engine} agent: ${cause}`)
    this.name = 'AgentSpawnError'
    this.engine = engine
    this.cause = cause
  }
}

/**
 * Error thrown when an agent execution times out.
 */
export class AgentTimeoutError extends KarimoAgentError {
  readonly engine: string
  readonly timeoutMs: number

  constructor(engine: string, timeoutMs: number) {
    super(`Agent ${engine} timed out after ${timeoutMs}ms`)
    this.name = 'AgentTimeoutError'
    this.engine = engine
    this.timeoutMs = timeoutMs
  }
}

/**
 * Error thrown when an agent exits with non-zero code.
 */
export class AgentExecutionError extends KarimoAgentError {
  readonly engine: string
  readonly exitCode: number
  readonly stderr: string

  constructor(engine: string, exitCode: number, stderr: string) {
    super(`Agent ${engine} failed with exit code ${exitCode}${stderr ? `: ${stderr}` : ''}`)
    this.name = 'AgentExecutionError'
    this.engine = engine
    this.exitCode = exitCode
    this.stderr = stderr
  }
}
