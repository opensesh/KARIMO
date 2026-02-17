/**
 * KARIMO Doctor Check: Claude Code CLI
 *
 * Verifies that the Claude Code CLI is installed and accessible.
 */

import type { CheckResult } from '../types'

/**
 * Check if Claude Code CLI is available.
 */
export async function checkClaudeCode(_projectRoot: string): Promise<CheckResult> {
  try {
    const proc = Bun.spawn(['claude', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited
    const stdout = await new Response(proc.stdout).text()

    if (exitCode === 0) {
      // Parse version from output (e.g., "claude-code 1.0.17")
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/)
      const version = versionMatch ? `v${versionMatch[1]}` : stdout.trim().slice(0, 20)

      return {
        name: 'claude_code',
        label: 'Claude Code CLI',
        status: 'pass',
        version,
      }
    }

    return {
      name: 'claude_code',
      label: 'Claude Code CLI',
      status: 'fail',
      message: 'CLI not responding correctly',
      fix: 'npm install -g @anthropic-ai/claude-code',
    }
  } catch {
    return {
      name: 'claude_code',
      label: 'Claude Code CLI',
      status: 'fail',
      message: 'Not installed',
      fix: 'npm install -g @anthropic-ai/claude-code',
    }
  }
}
