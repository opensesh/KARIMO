/**
 * KARIMO Doctor Check: GitHub CLI
 *
 * Verifies that gh CLI is installed and authenticated.
 * Reuses existing github module for auth verification.
 */

import type { CheckResult } from '../types'

/**
 * Check if gh CLI is installed.
 */
export async function checkGhCli(_projectRoot: string): Promise<CheckResult> {
  try {
    const proc = Bun.spawn(['gh', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited
    const stdout = await new Response(proc.stdout).text()

    if (exitCode === 0) {
      // Parse version from output (e.g., "gh version 2.43.0 (2024-01-15)")
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/)
      const version = versionMatch ? `v${versionMatch[1]}` : 'Installed'

      return {
        name: 'gh_cli',
        label: 'GitHub CLI',
        status: 'pass',
        version,
      }
    }

    return {
      name: 'gh_cli',
      label: 'GitHub CLI',
      status: 'fail',
      message: 'Not responding correctly',
      fix: 'brew install gh',
    }
  } catch {
    return {
      name: 'gh_cli',
      label: 'GitHub CLI',
      status: 'fail',
      message: 'Not installed',
      fix: 'brew install gh',
    }
  }
}

/**
 * Check if gh CLI is authenticated.
 */
export async function checkGhAuth(_projectRoot: string): Promise<CheckResult> {
  try {
    const proc = Bun.spawn(['gh', 'auth', 'status'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()

    // Check stderr for login prompt (gh sends auth status there too)
    const output = stdout + stderr

    if (output.includes('not logged in') || output.includes('gh auth login')) {
      return {
        name: 'gh_auth',
        label: 'GitHub authentication',
        status: 'fail',
        message: 'Not authenticated',
        fix: 'gh auth login',
        autoFixable: true,
      }
    }

    if (exitCode === 0 || output.includes('Logged in')) {
      // Extract username
      const accountMatch = output.match(/Logged in to .+ account (\S+)/)
      const username = accountMatch ? `@${accountMatch[1]}` : 'Authenticated'

      return {
        name: 'gh_auth',
        label: 'GitHub authentication',
        status: 'pass',
        version: username,
      }
    }

    return {
      name: 'gh_auth',
      label: 'GitHub authentication',
      status: 'fail',
      message: 'Auth status check failed',
      fix: 'gh auth login',
      autoFixable: true,
    }
  } catch {
    // gh CLI not installed - this will be caught by checkGhCli
    return {
      name: 'gh_auth',
      label: 'GitHub authentication',
      status: 'fail',
      message: 'GitHub CLI not available',
      fix: 'Install gh first: brew install gh',
    }
  }
}
