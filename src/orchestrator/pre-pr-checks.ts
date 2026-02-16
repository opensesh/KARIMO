/**
 * KARIMO Pre-PR Checks
 *
 * Validation checks to run before creating a PR:
 * - Rebase onto target branch
 * - Run build command
 * - Run typecheck command
 * - Detect changed files
 * - Check for caution files and never-touch violations
 */

import {
  detectCautionFiles,
  detectNeverTouchViolations,
  getChangedFiles,
  rebaseOntoTarget,
} from '@/git'
import type { CommandResult, PrePRCheckOptions, PrePRCheckResult } from './types'

/**
 * Run a shell command and capture the result.
 *
 * @param command - Command string to execute
 * @param cwd - Working directory
 * @returns Command result with output and timing
 */
export async function runCommand(command: string, cwd: string): Promise<CommandResult> {
  const startTime = Date.now()

  try {
    // Split command for Bun.spawn (handles basic cases)
    const parts = command.split(' ').filter((p) => p.length > 0)
    const cmd = parts[0]
    const args = parts.slice(1)

    if (!cmd) {
      return {
        command,
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Empty command',
        durationMs: Date.now() - startTime,
      }
    }

    const proc = Bun.spawn([cmd, ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env: process.env,
    })

    const exitCode = await proc.exited
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    return {
      command,
      success: exitCode === 0,
      exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      command,
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: message,
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Run pre-PR checks on a worktree.
 *
 * Steps:
 * 1. Rebase onto target branch (abort if conflicts)
 * 2. Run build command (abort if fails)
 * 3. Run typecheck command (abort if fails)
 * 4. Get changed files
 * 5. Detect caution files and never-touch violations
 *
 * @param options - Check options
 * @returns Check result with all details
 *
 * @example
 * ```typescript
 * const result = await prePRChecks({
 *   worktreePath: '/project/worktrees/phase-1',
 *   targetBranch: 'feature/phase-1',
 *   buildCommand: 'bun run build',
 *   typecheckCommand: 'bun run typecheck',
 *   neverTouchPatterns: ['package-lock.json'],
 *   requireReviewPatterns: ['src/auth/**'],
 * })
 *
 * if (!result.success) {
 *   console.error(result.errorMessage)
 * }
 * ```
 */
export async function prePRChecks(options: PrePRCheckOptions): Promise<PrePRCheckResult> {
  const {
    worktreePath,
    targetBranch,
    buildCommand,
    typecheckCommand,
    neverTouchPatterns,
    requireReviewPatterns,
  } = options

  // Step 1: Rebase onto target branch
  const rebaseResult = await rebaseOntoTarget(targetBranch, { cwd: worktreePath })

  if (!rebaseResult.success) {
    if (rebaseResult.conflictFiles.length > 0) {
      return {
        success: false,
        rebase: {
          success: false,
          conflictFiles: rebaseResult.conflictFiles,
        },
        changedFiles: [],
        cautionFiles: [],
        neverTouchViolations: [],
        errorMessage: `Rebase conflicts in: ${rebaseResult.conflictFiles.join(', ')}`,
      }
    }

    return {
      success: false,
      rebase: {
        success: false,
        conflictFiles: [],
      },
      changedFiles: [],
      cautionFiles: [],
      neverTouchViolations: [],
      errorMessage: `Rebase failed: ${rebaseResult.error ?? 'Unknown error'}`,
    }
  }

  // Step 2: Run build command
  const buildResult = await runCommand(buildCommand, worktreePath)

  if (!buildResult.success) {
    return {
      success: false,
      rebase: { success: true, conflictFiles: [] },
      build: buildResult,
      changedFiles: [],
      cautionFiles: [],
      neverTouchViolations: [],
      errorMessage: `Build failed with exit code ${buildResult.exitCode}`,
    }
  }

  // Step 3: Run typecheck command
  const typecheckResult = await runCommand(typecheckCommand, worktreePath)

  if (!typecheckResult.success) {
    return {
      success: false,
      rebase: { success: true, conflictFiles: [] },
      build: buildResult,
      typecheck: typecheckResult,
      changedFiles: [],
      cautionFiles: [],
      neverTouchViolations: [],
      errorMessage: `Typecheck failed with exit code ${typecheckResult.exitCode}`,
    }
  }

  // Step 4: Get changed files
  const changedFiles = await getChangedFiles(targetBranch, 'HEAD', { cwd: worktreePath })

  // Step 5: Detect caution files
  const cautionResult = detectCautionFiles(changedFiles, requireReviewPatterns)
  const cautionFiles = cautionResult.cautionFiles

  // Step 6: Detect never-touch violations
  const violations = detectNeverTouchViolations(changedFiles, neverTouchPatterns)

  if (violations.length > 0) {
    return {
      success: false,
      rebase: { success: true, conflictFiles: [] },
      build: buildResult,
      typecheck: typecheckResult,
      changedFiles,
      cautionFiles,
      neverTouchViolations: violations,
      errorMessage: `Forbidden files modified: ${violations.map((v) => v.file).join(', ')}`,
    }
  }

  // All checks passed
  return {
    success: true,
    rebase: { success: true, conflictFiles: [] },
    build: buildResult,
    typecheck: typecheckResult,
    changedFiles,
    cautionFiles,
    neverTouchViolations: [],
  }
}

/**
 * Format a command result for display.
 *
 * @param result - Command result
 * @param verbose - Include full output
 * @returns Formatted string
 */
export function formatCommandResult(result: CommandResult, verbose = false): string {
  const lines: string[] = []

  const status = result.success ? '✓' : '✗'
  const time = `${result.durationMs}ms`

  lines.push(`${status} ${result.command} (${time})`)

  if (!result.success || verbose) {
    if (result.stderr.trim()) {
      lines.push('  stderr:')
      for (const line of result.stderr.trim().split('\n').slice(0, 10)) {
        lines.push(`    ${line}`)
      }
    }
    if (result.stdout.trim() && verbose) {
      lines.push('  stdout:')
      for (const line of result.stdout.trim().split('\n').slice(0, 10)) {
        lines.push(`    ${line}`)
      }
    }
  }

  return lines.join('\n')
}
