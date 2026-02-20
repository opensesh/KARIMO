/**
 * KARIMO State Errors
 *
 * Error classes for state management operations.
 */

/**
 * Base error class for state-related errors.
 */
export class KarimoStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KarimoStateError'
  }
}

/**
 * Error thrown when state.json is corrupted or invalid.
 */
export class StateCorruptedError extends KarimoStateError {
  constructor(
    public readonly path: string,
    public readonly details: string
  ) {
    super(`State file corrupted at ${path}: ${details}`)
    this.name = 'StateCorruptedError'
  }
}

/**
 * Error thrown when state.json cannot be written.
 */
export class StateWriteError extends KarimoStateError {
  constructor(
    public readonly path: string,
    public override readonly cause: Error
  ) {
    super(`Failed to write state file at ${path}: ${cause.message}`)
    this.name = 'StateWriteError'
  }
}

/**
 * Error thrown when PRD metadata cannot be parsed.
 */
export class PRDMetadataError extends KarimoStateError {
  constructor(
    public readonly path: string,
    public readonly details: string
  ) {
    super(`Failed to parse PRD metadata at ${path}: ${details}`)
    this.name = 'PRDMetadataError'
  }
}
