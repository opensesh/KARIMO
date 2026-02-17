/**
 * KARIMO Doctor Runner
 *
 * Executes all health checks in parallel and aggregates results.
 */

import {
  checkAnthropicApiKey,
  checkBun,
  checkClaudeCode,
  checkGhAuth,
  checkGhCli,
  checkGit,
  checkGitRepo,
  checkKarimoWritable,
} from './checks'
import type { CheckResult, DoctorOptions, DoctorReport } from './types'

// =============================================================================
// Check Registry
// =============================================================================

/**
 * Ordered list of checks to run.
 * Order matters for display purposes.
 */
const CHECKS = [
  checkBun,
  checkAnthropicApiKey,
  checkClaudeCode,
  checkGit,
  checkGitRepo,
  checkGhCli,
  checkGhAuth,
  checkKarimoWritable,
]

// =============================================================================
// Runner
// =============================================================================

/**
 * Run all health checks in parallel.
 *
 * @param options - Doctor options including project root
 * @returns Aggregated report with all check results
 */
export async function runDoctorChecks(options: DoctorOptions): Promise<DoctorReport> {
  const { projectRoot } = options

  // Run all checks in parallel
  const results = await Promise.all(CHECKS.map((check) => check(projectRoot)))

  // Count passed/failed
  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length

  return {
    timestamp: new Date().toISOString(),
    overall: failed === 0 ? 'pass' : 'fail',
    checks: results,
    passed,
    failed,
  }
}

/**
 * Run a single check by name.
 * Useful for re-running after a fix attempt.
 *
 * @param name - Check name
 * @param projectRoot - Project root directory
 * @returns Check result
 */
export async function runSingleCheck(
  name: string,
  projectRoot: string
): Promise<CheckResult | null> {
  const checkMap: Record<string, (root: string) => Promise<CheckResult>> = {
    bun: checkBun,
    anthropic_api_key: checkAnthropicApiKey,
    claude_code: checkClaudeCode,
    git: checkGit,
    git_repo: checkGitRepo,
    gh_cli: checkGhCli,
    gh_auth: checkGhAuth,
    karimo_writable: checkKarimoWritable,
  }

  const check = checkMap[name]
  if (!check) {
    return null
  }

  return check(projectRoot)
}

/**
 * Get the list of checks that can be auto-fixed.
 *
 * @param report - Doctor report
 * @returns Array of check results that are auto-fixable
 */
export function getAutoFixableChecks(report: DoctorReport): CheckResult[] {
  return report.checks.filter((c) => c.status === 'fail' && c.autoFixable === true)
}

/**
 * Check if all critical checks pass.
 * Critical checks are those required to proceed with init.
 *
 * @param report - Doctor report
 * @returns true if all critical checks pass
 */
export function allCriticalChecksPassed(report: DoctorReport): boolean {
  // All checks are required
  return report.overall === 'pass'
}
