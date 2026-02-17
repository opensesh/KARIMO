/**
 * KARIMO Doctor Errors
 *
 * Custom error classes for the health check system.
 */

/**
 * Base error class for doctor-related errors.
 */
export class DoctorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DoctorError'
  }
}

/**
 * Thrown when a required prerequisite is not met.
 */
export class PrerequisiteError extends DoctorError {
  constructor(
    public readonly prerequisite: string,
    public readonly fix: string
  ) {
    super(`Missing prerequisite: ${prerequisite}`)
    this.name = 'PrerequisiteError'
  }
}

/**
 * Thrown when health checks fail and user cannot proceed.
 */
export class DoctorCheckFailedError extends DoctorError {
  constructor(
    public readonly failedChecks: number,
    public readonly totalChecks: number
  ) {
    super(`${failedChecks} of ${totalChecks} health checks failed`)
    this.name = 'DoctorCheckFailedError'
  }
}
