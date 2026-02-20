/**
 * KARIMO Doctor Check: Bun Runtime
 *
 * Verifies that Bun is installed and accessible.
 */

import type { CheckResult } from '../types'

/**
 * Check if Bun runtime is available.
 */
export async function checkBun(_projectRoot: string): Promise<CheckResult> {
  try {
    const proc = Bun.spawn(['bun', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited
    const stdout = await new Response(proc.stdout).text()

    if (exitCode === 0) {
      const version = stdout.trim()
      return {
        name: 'bun',
        label: 'Bun runtime',
        status: 'pass',
        version: `v${version}`,
      }
    }

    return {
      name: 'bun',
      label: 'Bun runtime',
      status: 'fail',
      message: 'Bun not responding correctly',
      fix: 'curl -fsSL https://bun.sh/install | bash',
    }
  } catch {
    return {
      name: 'bun',
      label: 'Bun runtime',
      status: 'fail',
      message: 'Not installed',
      fix: 'curl -fsSL https://bun.sh/install | bash',
    }
  }
}
