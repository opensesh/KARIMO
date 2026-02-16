/**
 * KARIMO Git Exec
 *
 * Thin wrapper around Bun.spawn for executing git commands.
 * Provides consistent environment setup and error handling.
 */

import { GitCommandError } from './errors'
import type { GitExecOptions, GitExecResult } from './types'

/** Default timeout for git commands (30 seconds) */
const DEFAULT_TIMEOUT = 30_000

/**
 * Execute a git command with the given arguments.
 *
 * @param args - Git command arguments (e.g., ['status', '--porcelain'])
 * @param options - Execution options
 * @returns Result containing exit code, stdout, stderr, and success flag
 * @throws {GitCommandError} If the command fails and throwOnError is true (default)
 *
 * @example
 * ```typescript
 * // Get current branch
 * const result = await gitExec(['branch', '--show-current'])
 * console.log(result.stdout.trim()) // 'main'
 *
 * // Run in specific directory
 * const status = await gitExec(['status'], { cwd: '/path/to/repo' })
 *
 * // Get result without throwing on error
 * const check = await gitExec(['diff', '--check'], { throwOnError: false })
 * if (!check.success) {
 *   console.log('Whitespace issues found')
 * }
 * ```
 */
export async function gitExec(
  args: string[],
  options: GitExecOptions = {}
): Promise<GitExecResult> {
  const { cwd, timeout = DEFAULT_TIMEOUT, throwOnError = true, env = {} } = options

  // Set environment for consistent output
  const gitEnv = {
    ...process.env,
    ...env,
    GIT_PAGER: '', // Disable pager
    LC_ALL: 'C', // Consistent locale for parsing
  }

  const proc = Bun.spawn(['git', ...args], {
    cwd,
    env: gitEnv,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Handle timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      proc.kill()
      reject(new GitCommandError(args, -1, `Command timed out after ${timeout}ms`, cwd))
    }, timeout)
    // Clear timeout if process completes
    proc.exited.then(() => clearTimeout(id)).catch(() => clearTimeout(id))
  })

  // Wait for process to complete
  const exitCode = await Promise.race([proc.exited, timeoutPromise])

  // Read outputs
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()

  const success = exitCode === 0

  if (!success && throwOnError) {
    throw new GitCommandError(args, exitCode, stderr, cwd)
  }

  return {
    exitCode,
    stdout,
    stderr,
    success,
  }
}

/**
 * Get the root directory of the git repository.
 *
 * @param cwd - Directory to start searching from
 * @returns Absolute path to repository root
 * @throws {GitCommandError} If not in a git repository
 */
export async function getRepoRoot(cwd?: string): Promise<string> {
  const result = await gitExec(['rev-parse', '--show-toplevel'], { cwd })
  return result.stdout.trim()
}

/**
 * Check if the given directory is inside a git repository.
 *
 * @param cwd - Directory to check
 * @returns True if inside a git repository
 */
export async function isGitRepo(cwd?: string): Promise<boolean> {
  const result = await gitExec(['rev-parse', '--is-inside-work-tree'], {
    cwd,
    throwOnError: false,
  })
  return result.success && result.stdout.trim() === 'true'
}

/**
 * Get the current HEAD commit SHA.
 *
 * @param cwd - Repository directory
 * @param short - Return short SHA (7 chars) instead of full
 * @returns Current HEAD commit SHA
 * @throws {GitCommandError} If unable to get HEAD
 */
export async function getHeadSha(cwd?: string, short = false): Promise<string> {
  const args = short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
  const result = await gitExec(args, { cwd })
  return result.stdout.trim()
}

/**
 * Get the default branch name (usually 'main' or 'master').
 *
 * @param cwd - Repository directory
 * @returns Default branch name
 */
export async function getDefaultBranch(cwd?: string): Promise<string> {
  // Try to get from remote HEAD reference
  const result = await gitExec(
    ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'],
    { cwd, throwOnError: false }
  )

  if (result.success) {
    // Returns 'origin/main' or 'origin/master', extract branch name
    const parts = result.stdout.trim().split('/')
    return parts[parts.length - 1] ?? 'main'
  }

  // Fallback: check if 'main' exists, otherwise 'master'
  const mainCheck = await gitExec(['show-ref', '--verify', '--quiet', 'refs/heads/main'], {
    cwd,
    throwOnError: false,
  })

  return mainCheck.success ? 'main' : 'master'
}
