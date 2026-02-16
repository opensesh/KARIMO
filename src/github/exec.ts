/**
 * KARIMO GitHub CLI Exec
 *
 * Thin wrapper around Bun.spawn for executing gh CLI commands.
 * Provides consistent error handling and JSON output parsing.
 */

import { GhCliNotFoundError, GhCommandError } from './errors'
import type { GhExecOptions, GhExecResult } from './types'

/** Default timeout for gh commands (30 seconds) */
const DEFAULT_TIMEOUT = 30_000

/** Cache for gh availability check */
let ghAvailable: boolean | null = null

/**
 * Check if gh CLI is available on the system.
 *
 * @returns True if gh is installed and accessible
 */
export async function isGhAvailable(): Promise<boolean> {
  if (ghAvailable !== null) {
    return ghAvailable
  }

  try {
    const proc = Bun.spawn(['gh', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await proc.exited
    ghAvailable = proc.exitCode === 0
    return ghAvailable
  } catch {
    ghAvailable = false
    return false
  }
}

/**
 * Ensure gh CLI is available, throwing if not.
 *
 * @throws {GhCliNotFoundError} If gh is not installed
 */
export async function ensureGhAvailable(): Promise<void> {
  if (!(await isGhAvailable())) {
    throw new GhCliNotFoundError()
  }
}

/**
 * Execute a gh CLI command.
 *
 * @param args - gh command arguments (e.g., ['pr', 'list'])
 * @param options - Execution options
 * @returns Result containing exit code, stdout, stderr, and success flag
 * @throws {GhCliNotFoundError} If gh is not installed
 * @throws {GhCommandError} If the command fails and throwOnError is true (default)
 *
 * @example
 * ```typescript
 * // List PRs
 * const result = await ghExec(['pr', 'list', '--state', 'open'])
 *
 * // Create PR
 * await ghExec(['pr', 'create', '--title', 'My PR', '--body', 'Description'])
 * ```
 */
export async function ghExec(
  args: string[],
  options: GhExecOptions = {}
): Promise<GhExecResult> {
  const { cwd, timeout = DEFAULT_TIMEOUT, throwOnError = true, env = {} } = options

  await ensureGhAvailable()

  const proc = Bun.spawn(['gh', ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  // Handle timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      proc.kill()
      reject(new GhCommandError(args, -1, `Command timed out after ${timeout}ms`))
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
    throw new GhCommandError(args, exitCode, stderr)
  }

  return {
    exitCode,
    stdout,
    stderr,
    success,
  }
}

/**
 * Execute a gh CLI command and parse JSON output.
 *
 * @param args - gh command arguments (--json flag is added automatically if not present)
 * @param options - Execution options
 * @returns Parsed JSON response
 * @throws {GhCliNotFoundError} If gh is not installed
 * @throws {GhCommandError} If the command fails
 * @throws {Error} If JSON parsing fails
 *
 * @example
 * ```typescript
 * // Get PR details as JSON
 * const pr = await ghExecJson<PrDetails>(['pr', 'view', '123', '--json', 'title,body'])
 * console.log(pr.title)
 * ```
 */
export async function ghExecJson<T>(
  args: string[],
  options: GhExecOptions = {}
): Promise<T> {
  const result = await ghExec(args, options)

  try {
    return JSON.parse(result.stdout) as T
  } catch (error) {
    const parseError = error instanceof Error ? error : new Error(String(error))
    throw new Error(`Failed to parse gh JSON output: ${parseError.message}\nOutput: ${result.stdout}`)
  }
}

/**
 * Get the GitHub token from gh CLI.
 *
 * @param hostname - GitHub hostname (default: github.com)
 * @returns Token string, or null if not available
 */
export async function getGhToken(hostname = 'github.com'): Promise<string | null> {
  try {
    const result = await ghExec(['auth', 'token', '--hostname', hostname], {
      throwOnError: false,
    })

    if (result.success) {
      return result.stdout.trim()
    }
    return null
  } catch {
    return null
  }
}

/**
 * Reset the gh availability cache.
 * Useful for testing or after installing gh.
 */
export function resetGhAvailabilityCache(): void {
  ghAvailable = null
}
