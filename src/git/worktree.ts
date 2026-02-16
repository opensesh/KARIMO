/**
 * KARIMO Git Worktree
 *
 * Functions for managing git worktrees. Worktrees allow multiple working
 * directories to be attached to a single repository, enabling isolated
 * task execution without branch switching overhead.
 */

import { join } from 'node:path'
import { WorktreeCreateError, WorktreeNotFoundError } from './errors'
import { gitExec, getRepoRoot } from './exec'
import type { GitExecOptions, WorktreeInfo } from './types'

/**
 * Parse the output of `git worktree list --porcelain`.
 *
 * @param output - Raw porcelain output from git worktree list
 * @returns Array of WorktreeInfo objects
 */
function parseWorktreeList(output: string): WorktreeInfo[] {
  const worktrees: WorktreeInfo[] = []
  const lines = output.trim().split('\n')

  let current: Partial<WorktreeInfo> = {}

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      // Start of new worktree entry
      if (current.path) {
        worktrees.push(current as WorktreeInfo)
      }
      current = {
        path: line.slice('worktree '.length),
        branch: '',
        head: '',
        isDetached: false,
        isMain: false,
      }
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length)
    } else if (line.startsWith('branch ')) {
      // Format: branch refs/heads/branch-name
      const branchRef = line.slice('branch '.length)
      current.branch = branchRef.replace('refs/heads/', '')
    } else if (line === 'detached') {
      current.isDetached = true
    } else if (line === 'bare') {
      // Skip bare repositories
      current = {}
    }
  }

  // Add last worktree
  if (current.path) {
    worktrees.push(current as WorktreeInfo)
  }

  // Mark the first one as main (main worktree is always listed first)
  if (worktrees[0]) {
    worktrees[0].isMain = true
  }

  return worktrees
}

/**
 * List all worktrees in the repository.
 *
 * @param repoPath - Path to repository (or any worktree)
 * @returns Array of worktree information
 * @throws {GitCommandError} If unable to list worktrees
 *
 * @example
 * ```typescript
 * const worktrees = await listWorktrees('/path/to/repo')
 * for (const wt of worktrees) {
 *   console.log(`${wt.path} -> ${wt.branch || 'detached'} @ ${wt.head.slice(0, 7)}`)
 * }
 * ```
 */
export async function listWorktrees(repoPath?: string): Promise<WorktreeInfo[]> {
  const result = await gitExec(['worktree', 'list', '--porcelain'], { cwd: repoPath })
  return parseWorktreeList(result.stdout)
}

/**
 * Check if a worktree exists at the given path.
 *
 * @param worktreePath - Absolute path to check
 * @param repoPath - Path to repository
 * @returns True if a worktree exists at the path
 */
export async function worktreeExists(worktreePath: string, repoPath?: string): Promise<boolean> {
  const worktrees = await listWorktrees(repoPath)
  return worktrees.some((wt) => wt.path === worktreePath)
}

/**
 * Get information about a specific worktree.
 *
 * @param worktreePath - Absolute path to the worktree
 * @param repoPath - Path to repository
 * @returns Worktree information
 * @throws {WorktreeNotFoundError} If worktree doesn't exist at path
 */
export async function getWorktreeInfo(
  worktreePath: string,
  repoPath?: string
): Promise<WorktreeInfo> {
  const worktrees = await listWorktrees(repoPath)
  const worktree = worktrees.find((wt) => wt.path === worktreePath)

  if (!worktree) {
    throw new WorktreeNotFoundError(worktreePath)
  }

  return worktree
}

/**
 * Create a new worktree for a phase.
 *
 * @param basePath - Base directory for worktrees
 * @param phaseId - Phase identifier (used in path: {basePath}/worktrees/{phaseId})
 * @param branch - Branch to checkout (created if doesn't exist)
 * @param options - Git execution options
 * @returns Path to the created worktree
 * @throws {WorktreeCreateError} If worktree creation fails
 *
 * @example
 * ```typescript
 * // Create worktree for phase 1a
 * const worktreePath = await createWorktree('/project', 'phase-1a', 'feature/1a/implement')
 * console.log(worktreePath) // '/project/worktrees/phase-1a'
 * ```
 */
export async function createWorktree(
  basePath: string,
  phaseId: string,
  branch: string,
  options: GitExecOptions = {}
): Promise<string> {
  const repoRoot = await getRepoRoot(basePath)
  const worktreePath = join(basePath, 'worktrees', phaseId)

  // Check if worktree already exists
  if (await worktreeExists(worktreePath, repoRoot)) {
    // Worktree exists, just return its path
    return worktreePath
  }

  // Check if branch exists
  const branchCheck = await gitExec(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], {
    cwd: repoRoot,
    throwOnError: false,
  })

  if (branchCheck.success) {
    // Branch exists, create worktree with existing branch
    const result = await gitExec(['worktree', 'add', worktreePath, branch], {
      cwd: repoRoot,
      ...options,
      throwOnError: false,
    })

    if (!result.success) {
      throw new WorktreeCreateError(worktreePath, branch, result.stderr.trim())
    }
  } else {
    // Branch doesn't exist, create worktree with new branch
    const result = await gitExec(['worktree', 'add', '-b', branch, worktreePath], {
      cwd: repoRoot,
      ...options,
      throwOnError: false,
    })

    if (!result.success) {
      throw new WorktreeCreateError(worktreePath, branch, result.stderr.trim())
    }
  }

  return worktreePath
}

/**
 * Remove a worktree.
 *
 * @param worktreePath - Absolute path to the worktree
 * @param options - Options including force removal
 * @throws {GitCommandError} If unable to remove worktree
 *
 * @example
 * ```typescript
 * // Remove worktree after task completion
 * await removeWorktree('/project/worktrees/phase-1a')
 *
 * // Force removal of worktree with uncommitted changes
 * await removeWorktree('/project/worktrees/phase-1a', { force: true })
 * ```
 */
export async function removeWorktree(
  worktreePath: string,
  options: { force?: boolean; repoPath?: string } = {}
): Promise<void> {
  const { force = false, repoPath } = options

  const args = ['worktree', 'remove']
  if (force) {
    args.push('--force')
  }
  args.push(worktreePath)

  await gitExec(args, { cwd: repoPath })
}

/**
 * Prune stale worktree entries.
 * Removes worktree references for directories that no longer exist.
 *
 * @param repoPath - Path to repository
 */
export async function pruneWorktrees(repoPath?: string): Promise<void> {
  await gitExec(['worktree', 'prune'], { cwd: repoPath })
}

/**
 * Get the standard worktree path for a phase.
 *
 * @param basePath - Base directory (usually repo root)
 * @param phaseId - Phase identifier
 * @returns Standard worktree path
 */
export function getWorktreePath(basePath: string, phaseId: string): string {
  return join(basePath, 'worktrees', phaseId)
}
