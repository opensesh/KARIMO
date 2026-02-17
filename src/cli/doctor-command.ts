/**
 * KARIMO Doctor Command
 *
 * CLI handler for the `karimo doctor` command.
 * Runs health checks and displays results.
 */

import * as p from '@clack/prompts'
import {
  formatDoctorReport,
  formatDoctorReportJson,
  formatIssueResolution,
  runDoctorChecks,
  runSingleCheck,
} from '../doctor'
import type { DoctorReport } from '../doctor/types'

// =============================================================================
// Types
// =============================================================================

export interface DoctorCommandOptions {
  /** Project root directory */
  projectRoot: string
  /** CI mode - no interactivity, exit codes only */
  check?: boolean
  /** Output JSON instead of formatted text */
  json?: boolean
}

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse doctor command arguments.
 */
export function parseDoctorArgs(args: string[]): Partial<DoctorCommandOptions> {
  const options: Partial<DoctorCommandOptions> = {}

  for (const arg of args) {
    if (arg === '--check') {
      options.check = true
    }
    if (arg === '--json') {
      options.json = true
    }
  }

  return options
}

// =============================================================================
// Auto-Fix Handlers
// =============================================================================

/**
 * Attempt to auto-fix GitHub authentication.
 *
 * @param projectRoot - Project root directory
 * @returns true if fix succeeded
 */
async function attemptGhAuthFix(projectRoot: string): Promise<boolean> {
  console.log()

  const proceed = await p.confirm({
    message: 'Run `gh auth login` to authenticate?',
    initialValue: true,
  })

  if (p.isCancel(proceed) || !proceed) {
    return false
  }

  console.log()
  p.log.info('Opening GitHub authentication flow...')
  console.log()

  try {
    // Run gh auth login interactively
    const proc = Bun.spawn(['gh', 'auth', 'login'], {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    })

    await proc.exited

    // Re-check auth status
    console.log()
    p.log.info('Verifying authentication...')

    const result = await runSingleCheck('gh_auth', projectRoot)

    if (result?.status === 'pass') {
      p.log.success(`Authenticated as ${result.version}`)
      return true
    }

    p.log.error('Authentication check failed. Please try again.')
    return false
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    p.log.error(`Authentication failed: ${message}`)
    return false
  }
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Handle the `karimo doctor` command.
 */
export async function handleDoctor(options: DoctorCommandOptions): Promise<number> {
  const { projectRoot, check = false, json = false } = options

  // Run all checks
  const report = await runDoctorChecks({ projectRoot })

  // JSON output mode
  if (json) {
    console.log(formatDoctorReportJson(report))
    return report.overall === 'pass' ? 0 : 1
  }

  // CI mode - minimal output
  if (check) {
    console.log(formatDoctorReport(report))
    return report.overall === 'pass' ? 0 : 1
  }

  // Interactive mode
  console.log()
  console.log(formatDoctorReport(report))
  console.log()

  // If all passed, we're done
  if (report.overall === 'pass') {
    return 0
  }

  // Offer to fix auto-fixable issues
  const autoFixable = report.checks.filter((c) => c.status === 'fail' && c.autoFixable === true)

  for (const check of autoFixable) {
    console.log()
    console.log(formatIssueResolution(check))
    console.log()

    let fixed = false

    switch (check.name) {
      case 'gh_auth':
        fixed = await attemptGhAuthFix(projectRoot)
        break
      default:
        // No auto-fix available
        break
    }

    if (fixed) {
      p.log.success(`Fixed: ${check.label}`)
    }
  }

  // Re-run checks to get final status
  const finalReport = await runDoctorChecks({ projectRoot })

  if (finalReport.overall === 'pass') {
    console.log()
    p.log.success('All checks passed!')
    return 0
  }

  return 1
}

/**
 * Run doctor checks and return the report.
 * Does not print output - for use by other commands.
 */
export async function runDoctorSilent(projectRoot: string): Promise<DoctorReport> {
  return runDoctorChecks({ projectRoot })
}
