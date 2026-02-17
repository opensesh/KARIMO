/**
 * Telemetry Event Schema
 *
 * Defines the structure of telemetry events captured during KARIMO execution.
 * All events include a timestamp and event type discriminator.
 */

/**
 * Base properties for all telemetry events.
 */
interface BaseTelemetryEvent {
  timestamp: string
}

/**
 * Logged when a command starts execution.
 */
export interface CommandStartEvent extends BaseTelemetryEvent {
  event: 'command_start'
  command: string
  args: string[]
}

/**
 * Logged when a command completes execution.
 */
export interface CommandEndEvent extends BaseTelemetryEvent {
  event: 'command_end'
  command: string
  durationMs: number
  exitCode: number
}

/**
 * Logged when an error occurs.
 */
export interface ErrorEvent extends BaseTelemetryEvent {
  event: 'error'
  error: {
    name: string
    message: string
    stack?: string
  }
  fatal?: boolean
}

/**
 * Logged when an operation is retried.
 */
export interface RetryEvent extends BaseTelemetryEvent {
  event: 'retry'
  operation: string
  attempt: number
  maxAttempts: number
  reason?: string
}

/**
 * Union type of all telemetry events.
 */
export type TelemetryEvent = CommandStartEvent | CommandEndEvent | ErrorEvent | RetryEvent
