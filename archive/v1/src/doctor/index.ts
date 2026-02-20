/**
 * KARIMO Doctor Module
 *
 * Health check system for validating prerequisites.
 */

// Types
export type { CheckName, CheckResult, CheckStatus, DoctorOptions, DoctorReport } from './types'

// Errors
export { DoctorCheckFailedError, DoctorError, PrerequisiteError } from './errors'

// Runner
export {
  allCriticalChecksPassed,
  getAutoFixableChecks,
  runDoctorChecks,
  runSingleCheck,
} from './runner'

// Formatter
export {
  formatCompactStatus,
  formatDoctorReport,
  formatDoctorReportJson,
  formatIssueResolution,
  formatSetupChecklist,
} from './formatter'
