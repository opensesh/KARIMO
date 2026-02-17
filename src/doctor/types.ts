/**
 * KARIMO Doctor Types
 *
 * Type definitions for the health check system.
 */

// =============================================================================
// Check Status
// =============================================================================

/** Status of an individual check */
export type CheckStatus = 'pass' | 'fail'

/** Unique identifier for each check type */
export type CheckName =
  | 'bun'
  | 'anthropic_api_key'
  | 'claude_code'
  | 'git'
  | 'git_repo'
  | 'gh_cli'
  | 'gh_auth'
  | 'karimo_writable'

// =============================================================================
// Check Results
// =============================================================================

/** Result of a single health check */
export interface CheckResult {
  /** Unique identifier for this check */
  name: CheckName

  /** Human-readable label for display */
  label: string

  /** Whether the check passed or failed */
  status: CheckStatus

  /** Version info or success details (shown on pass) */
  version?: string

  /** Error message (shown on fail) */
  message?: string

  /** Instructions to fix the issue */
  fix?: string

  /** Whether this check can be auto-fixed interactively */
  autoFixable?: boolean
}

// =============================================================================
// Doctor Report
// =============================================================================

/** Aggregated results from all checks */
export interface DoctorReport {
  /** Timestamp of the report */
  timestamp: string

  /** Overall status: pass if all checks pass */
  overall: CheckStatus

  /** Individual check results */
  checks: CheckResult[]

  /** Number of passing checks */
  passed: number

  /** Number of failing checks */
  failed: number
}

// =============================================================================
// Doctor Options
// =============================================================================

/** Options for running doctor checks */
export interface DoctorOptions {
  /** Project root directory */
  projectRoot: string

  /** CI mode - no interactivity, exit codes only */
  check?: boolean

  /** Output JSON instead of formatted text */
  json?: boolean

  /** Skip cache and fetch fresh status */
  skipCache?: boolean
}

// =============================================================================
// Check Runner
// =============================================================================

/** Function signature for individual check implementations */
export type CheckRunner = (projectRoot: string) => Promise<CheckResult>

/** Registry of all available checks */
export interface CheckRegistry {
  [key: string]: CheckRunner
}
