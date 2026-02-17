/**
 * KARIMO Telemetry Module
 *
 * Automatic telemetry for dogfooding and debugging.
 * All telemetry operations are fire-and-forget - they never throw
 * and never interrupt normal CLI operation.
 */

// Schema types
export type {
  TelemetryEvent,
  CommandStartEvent,
  CommandEndEvent,
  ErrorEvent,
  RetryEvent,
} from './schema'

// Writer
export { writeTelemetryEvent, getTelemetryPath } from './writer'

// Helper functions
export {
  logCommandStart,
  logCommandEnd,
  logError,
  logRetry,
  withTelemetry,
} from './helpers'
