/**
 * KARIMO First-Run Flow
 *
 * Orchestrates the first-time user experience:
 * 1. Welcome screen with ASCII art
 * 2. Doctor checks (prerequisites)
 * 3. Fix any issues
 * 4. Transition to init
 */

import * as p from '@clack/prompts'
import {
  formatIssueResolution,
  formatSetupChecklist,
  runDoctorChecks,
  runSingleCheck,
} from '../doctor'
import type { CheckResult } from '../doctor/types'
import { showSimpleAnimatedWelcome, showTransitionToInit } from './ui'

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
    message: 'Press Enter to open the GitHub login flow...',
    active: 'Continue',
    inactive: 'Skip',
    initialValue: true,
  })

  if (p.isCancel(proceed) || !proceed) {
    return false
  }

  console.log()
  p.log.info('Opening GitHub authentication...')
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

/**
 * Show issue resolution screen and attempt fix if possible.
 *
 * @param check - Failed check result
 * @param projectRoot - Project root directory
 * @returns true if issue was resolved
 */
async function resolveIssue(check: CheckResult, projectRoot: string): Promise<boolean> {
  console.log()
  console.log(formatIssueResolution(check))
  console.log()

  // Handle auto-fixable issues
  if (check.autoFixable) {
    switch (check.name) {
      case 'gh_auth':
        return attemptGhAuthFix(projectRoot)
      default:
        break
    }
  }

  // Non-auto-fixable - show instructions and wait for user to fix manually
  const retry = await p.confirm({
    message: 'Have you completed the fix? Press Enter to re-check.',
    active: 'Re-check',
    inactive: 'Exit',
    initialValue: true,
  })

  if (p.isCancel(retry) || !retry) {
    return false
  }

  // Re-run the specific check
  const result = await runSingleCheck(check.name, projectRoot)

  if (result?.status === 'pass') {
    p.log.success(`Fixed: ${check.label}`)
    return true
  }

  p.log.error(`Still failing: ${check.label}`)
  return false
}

// =============================================================================
// First-Run Flow
// =============================================================================

/**
 * Run the complete first-run onboarding flow.
 *
 * @param projectRoot - Project root directory
 * @returns true if user is ready to proceed to init
 */
export async function runFirstRunFlow(projectRoot: string): Promise<boolean> {
  // Step 1: Animated welcome screen
  const continueAfterWelcome = await showSimpleAnimatedWelcome()

  if (!continueAfterWelcome) {
    return false
  }

  // Step 2: Run doctor checks
  let report = await runDoctorChecks({ projectRoot })

  // Step 3: Show setup checklist
  console.log()
  console.log(formatSetupChecklist(report))
  console.log()

  // Step 4: Handle failures
  if (report.overall === 'fail') {
    const failedChecks = report.checks.filter((c) => c.status === 'fail')

    // Process each failed check
    for (const check of failedChecks) {
      const resolved = await resolveIssue(check, projectRoot)

      if (!resolved) {
        // User couldn't/didn't want to fix - exit
        console.log()
        p.outro('Run `karimo` again when the issues are resolved.')
        return false
      }
    }

    // Re-run all checks to verify
    report = await runDoctorChecks({ projectRoot })

    if (report.overall === 'fail') {
      console.log()
      console.log(formatSetupChecklist(report))
      console.log()
      p.outro('Some issues remain. Run `karimo doctor` to see details.')
      return false
    }
  }

  // Step 5: All checks passed - show transition screen
  console.log()
  const proceedToInit = await showTransitionToInit()

  if (!proceedToInit) {
    return false
  }

  return true
}

/**
 * Check if this is a first-run scenario.
 *
 * @param projectRoot - Project root directory
 * @returns true if .karimo directory does not exist
 */
export async function isFirstRun(projectRoot: string): Promise<boolean> {
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')

  const karimoDir = join(projectRoot, '.karimo')
  return !existsSync(karimoDir)
}
