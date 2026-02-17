/**
 * Telemetry Helper Functions
 *
 * Convenience functions for logging common telemetry events.
 * All functions are fire-and-forget and never throw.
 */
import type { CommandEndEvent, CommandStartEvent, ErrorEvent, RetryEvent } from './schema'
import { writeTelemetryEvent } from './writer'

/**
 * Get current ISO timestamp.
 */
function now(): string {
  return new Date().toISOString()
}

/**
 * Log the start of a command execution.
 */
export function logCommandStart(projectRoot: string, command: string, args: string[]): void {
  const event: CommandStartEvent = {
    event: 'command_start',
    timestamp: now(),
    command,
    args,
  }
  writeTelemetryEvent(projectRoot, event)
}

/**
 * Log the end of a command execution.
 */
export function logCommandEnd(
  projectRoot: string,
  command: string,
  durationMs: number,
  exitCode: number
): void {
  const event: CommandEndEvent = {
    event: 'command_end',
    timestamp: now(),
    command,
    durationMs,
    exitCode,
  }
  writeTelemetryEvent(projectRoot, event)
}

/**
 * Log an error occurrence.
 */
export function logError(
  projectRoot: string,
  error: Error,
  options?: { fatal?: boolean }
): void {
  const event: ErrorEvent = {
    event: 'error',
    timestamp: now(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    fatal: options?.fatal,
  }
  writeTelemetryEvent(projectRoot, event)
}

/**
 * Log a retry attempt.
 */
export function logRetry(
  projectRoot: string,
  operation: string,
  attempt: number,
  maxAttempts: number,
  reason?: string
): void {
  const event: RetryEvent = {
    event: 'retry',
    timestamp: now(),
    operation,
    attempt,
    maxAttempts,
    reason,
  }
  writeTelemetryEvent(projectRoot, event)
}

/**
 * Wrap an async function with telemetry logging.
 *
 * Logs command_start at the beginning and command_end at the end.
 * If the function throws, logs an error event and re-throws.
 */
export async function withTelemetry<T>(
  projectRoot: string,
  command: string,
  args: string[],
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  logCommandStart(projectRoot, command, args)

  try {
    const result = await fn()
    const durationMs = Date.now() - startTime
    logCommandEnd(projectRoot, command, durationMs, 0)
    return result
  } catch (error) {
    const durationMs = Date.now() - startTime
    logCommandEnd(projectRoot, command, durationMs, 1)

    if (error instanceof Error) {
      logError(projectRoot, error)
    }

    throw error
  }
}
