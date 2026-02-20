/**
 * KARIMO Doctor Check: Git
 *
 * Verifies that Git is installed and the project is a git repository.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { CheckResult } from '../types'

/**
 * Check if Git is installed.
 */
export async function checkGit(_projectRoot: string): Promise<CheckResult> {
  try {
    const proc = Bun.spawn(['git', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const exitCode = await proc.exited
    const stdout = await new Response(proc.stdout).text()

    if (exitCode === 0) {
      // Parse version from output (e.g., "git version 2.43.0")
      const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/)
      const version = versionMatch ? `v${versionMatch[1]}` : 'Installed'

      return {
        name: 'git',
        label: 'Git',
        status: 'pass',
        version,
      }
    }

    return {
      name: 'git',
      label: 'Git',
      status: 'fail',
      message: 'Git not responding correctly',
      fix: 'Install Git: https://git-scm.com/downloads',
    }
  } catch {
    return {
      name: 'git',
      label: 'Git',
      status: 'fail',
      message: 'Not installed',
      fix: 'Install Git: https://git-scm.com/downloads',
    }
  }
}

/**
 * Check if current directory is a git repository.
 */
export async function checkGitRepo(projectRoot: string): Promise<CheckResult> {
  const gitDir = join(projectRoot, '.git')

  if (existsSync(gitDir)) {
    // Get current branch name
    try {
      const proc = Bun.spawn(['git', 'branch', '--show-current'], {
        cwd: projectRoot,
        stdout: 'pipe',
        stderr: 'pipe',
      })

      const exitCode = await proc.exited
      const stdout = await new Response(proc.stdout).text()

      if (exitCode === 0) {
        const branch = stdout.trim() || 'detached HEAD'
        return {
          name: 'git_repo',
          label: 'Git repository',
          status: 'pass',
          version: branch,
        }
      }
    } catch {
      // Fall through to basic pass
    }

    return {
      name: 'git_repo',
      label: 'Git repository',
      status: 'pass',
      version: 'Detected',
    }
  }

  return {
    name: 'git_repo',
    label: 'Git repository',
    status: 'fail',
    message: 'Not a git repository',
    fix: 'git init',
  }
}
