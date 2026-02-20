/**
 * KARIMO Git Rebase
 *
 * Functions for handling git rebase operations. Rebases are used to
 * incorporate upstream changes and maintain a clean commit history.
 * Conflicts are handled gracefully — the orchestrator decides next steps.
 */

import { gitExec } from './exec'
import type { GitExecOptions, RebaseResult } from './types'

/**
 * Rebase the current branch onto a target branch.
 * On conflict: captures conflict files, aborts rebase, returns result.
 * Does NOT throw on conflicts — orchestrator decides what to do.
 *
 * @param targetBranch - Branch to rebase onto
 * @param options - Git execution options
 * @returns Rebase result with success flag and conflict info
 *
 * @example
 * ```typescript
 * const result = await rebaseOntoTarget('main', { cwd: '/repo' })
 * if (!result.success && result.conflictFiles.length > 0) {
 *   console.log(`Conflicts in: ${result.conflictFiles.join(', ')}`)
 *   // Orchestrator decides: manual resolution, different strategy, etc.
 * }
 * ```
 */
export async function rebaseOntoTarget(
  targetBranch: string,
  options: GitExecOptions = {}
): Promise<RebaseResult> {
  const result = await gitExec(['rebase', targetBranch], {
    ...options,
    throwOnError: false,
  })

  if (result.success) {
    return {
      success: true,
      conflictFiles: [],
    }
  }

  // Check if this is a conflict situation
  const isConflict =
    result.stderr.includes('CONFLICT') ||
    result.stderr.includes('could not apply') ||
    result.stderr.includes('Resolve all conflicts') ||
    result.stdout.includes('CONFLICT')

  if (isConflict) {
    // Get the list of conflicting files
    const conflictFiles = await getConflictFiles(options.cwd)

    // Abort the rebase to return to clean state
    await abortRebase(options)

    return {
      success: false,
      conflictFiles,
    }
  }

  // Non-conflict error
  return {
    success: false,
    conflictFiles: [],
    error: result.stderr.trim() || result.stdout.trim(),
  }
}

/**
 * Abort an in-progress rebase.
 *
 * @param options - Git execution options
 * @throws {GitCommandError} If abort fails
 */
export async function abortRebase(options: GitExecOptions = {}): Promise<void> {
  // Check if rebase is in progress before aborting
  if (!(await isRebaseInProgress(options.cwd))) {
    return
  }

  await gitExec(['rebase', '--abort'], options)
}

/**
 * Continue a rebase after resolving conflicts.
 *
 * @param options - Git execution options
 * @returns Rebase result
 */
export async function continueRebase(options: GitExecOptions = {}): Promise<RebaseResult> {
  const result = await gitExec(['rebase', '--continue'], {
    ...options,
    throwOnError: false,
  })

  if (result.success) {
    return {
      success: true,
      conflictFiles: [],
    }
  }

  // Check for more conflicts
  const conflictFiles = await getConflictFiles(options.cwd)

  if (conflictFiles.length > 0) {
    return {
      success: false,
      conflictFiles,
    }
  }

  return {
    success: false,
    conflictFiles: [],
    error: result.stderr.trim(),
  }
}

/**
 * Skip the current commit during a rebase.
 *
 * @param options - Git execution options
 * @returns Rebase result
 */
export async function skipRebase(options: GitExecOptions = {}): Promise<RebaseResult> {
  const result = await gitExec(['rebase', '--skip'], {
    ...options,
    throwOnError: false,
  })

  if (result.success) {
    return {
      success: true,
      conflictFiles: [],
    }
  }

  const conflictFiles = await getConflictFiles(options.cwd)

  const rebaseResult: RebaseResult = {
    success: false,
    conflictFiles,
  }
  if (conflictFiles.length === 0) {
    rebaseResult.error = result.stderr.trim()
  }
  return rebaseResult
}

/**
 * Check if a rebase is currently in progress.
 *
 * @param cwd - Repository directory
 * @returns True if a rebase is in progress
 */
export async function isRebaseInProgress(cwd?: string): Promise<boolean> {
  // Git stores rebase state in .git/rebase-merge or .git/rebase-apply
  const result = await gitExec(['rev-parse', '--git-path', 'rebase-merge'], {
    ...(cwd !== undefined && { cwd }),
    throwOnError: false,
  })

  if (result.success) {
    const rebaseMergePath = result.stdout.trim()
    // Check if the directory exists
    const exists = await Bun.file(rebaseMergePath).exists()
    if (exists) {
      return true
    }
  }

  // Also check rebase-apply (for git am rebases)
  const applyResult = await gitExec(['rev-parse', '--git-path', 'rebase-apply'], {
    ...(cwd !== undefined && { cwd }),
    throwOnError: false,
  })

  if (applyResult.success) {
    const rebaseApplyPath = applyResult.stdout.trim()
    return Bun.file(rebaseApplyPath).exists()
  }

  return false
}

/**
 * Get the list of files with conflicts.
 *
 * @param cwd - Repository directory
 * @returns Array of file paths with conflicts
 */
export async function getConflictFiles(cwd?: string): Promise<string[]> {
  // Use git diff to find files with conflict markers (unmerged)
  const result = await gitExec(['diff', '--name-only', '--diff-filter=U'], {
    ...(cwd !== undefined && { cwd }),
    throwOnError: false,
  })

  if (!result.success) {
    return []
  }

  return result.stdout
    .trim()
    .split('\n')
    .filter((f) => f.length > 0)
}

/**
 * Check if the current branch needs to be rebased onto target.
 * Returns true if target has commits not in current branch.
 *
 * @param targetBranch - Branch to check against
 * @param options - Git execution options
 * @returns True if rebase would have effect
 */
export async function needsRebase(
  targetBranch: string,
  options: GitExecOptions = {}
): Promise<boolean> {
  // Count commits in target that aren't in HEAD
  const result = await gitExec(['rev-list', '--count', `HEAD..${targetBranch}`], {
    ...options,
    throwOnError: false,
  })

  if (!result.success) {
    return false
  }

  const count = Number.parseInt(result.stdout.trim(), 10)
  return count > 0
}

/**
 * Perform an interactive rebase to squash commits.
 * Non-interactive — squashes all commits since base into one.
 *
 * @param baseBranch - Base branch for squash
 * @param commitMessage - Message for the squashed commit
 * @param options - Git execution options
 * @returns Rebase result
 */
export async function squashCommits(
  baseBranch: string,
  commitMessage: string,
  options: GitExecOptions = {}
): Promise<RebaseResult> {
  // Reset to merge base keeping changes staged
  const mergeBaseResult = await gitExec(['merge-base', 'HEAD', baseBranch], {
    ...options,
    throwOnError: false,
  })

  if (!mergeBaseResult.success) {
    return {
      success: false,
      conflictFiles: [],
      error: `Unable to find merge base: ${mergeBaseResult.stderr.trim()}`,
    }
  }

  const mergeBase = mergeBaseResult.stdout.trim()

  // Soft reset to merge base
  const resetResult = await gitExec(['reset', '--soft', mergeBase], {
    ...options,
    throwOnError: false,
  })

  if (!resetResult.success) {
    return {
      success: false,
      conflictFiles: [],
      error: `Reset failed: ${resetResult.stderr.trim()}`,
    }
  }

  // Create new squashed commit
  const commitResult = await gitExec(['commit', '-m', commitMessage], {
    ...options,
    throwOnError: false,
  })

  if (!commitResult.success) {
    return {
      success: false,
      conflictFiles: [],
      error: `Commit failed: ${commitResult.stderr.trim()}`,
    }
  }

  return {
    success: true,
    conflictFiles: [],
  }
}
