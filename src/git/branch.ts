/**
 * KARIMO Git Branch
 *
 * Functions for managing git branches. Handles branch creation,
 * deletion, and lookup operations for task execution.
 */

import { BranchCreateError } from './errors'
import { gitExec, getDefaultBranch } from './exec'
import type { DeleteBranchOptions, GitExecOptions } from './types'

/**
 * Create a task branch following the naming convention.
 * Branch naming: feature/{phaseId}/{taskId}
 *
 * @param phaseId - Phase identifier
 * @param taskId - Task identifier
 * @param baseBranch - Branch to create from (defaults to default branch)
 * @param options - Git execution options
 * @returns Full branch name
 * @throws {BranchCreateError} If branch creation fails
 *
 * @example
 * ```typescript
 * const branch = await createTaskBranch('phase-1', 'task-a', 'main', { cwd: '/repo' })
 * console.log(branch) // 'feature/phase-1/task-a'
 * ```
 */
export async function createTaskBranch(
  phaseId: string,
  taskId: string,
  baseBranch?: string,
  options: GitExecOptions = {}
): Promise<string> {
  const branchName = `feature/${phaseId}/${taskId}`
  const base = baseBranch ?? (await getDefaultBranch(options.cwd))

  // Check if branch already exists
  if (await branchExists(branchName, options.cwd)) {
    return branchName
  }

  const result = await gitExec(['checkout', '-b', branchName, base], {
    ...options,
    throwOnError: false,
  })

  if (!result.success) {
    throw new BranchCreateError(branchName, result.stderr.trim())
  }

  return branchName
}

/**
 * Check if a branch exists (local or remote).
 *
 * @param branchName - Branch name to check
 * @param cwd - Repository directory
 * @param checkRemote - Also check remote branches (default: true)
 * @returns True if branch exists
 *
 * @example
 * ```typescript
 * if (await branchExists('feature/task-1')) {
 *   console.log('Branch already exists')
 * }
 * ```
 */
export async function branchExists(
  branchName: string,
  cwd?: string,
  checkRemote = true
): Promise<boolean> {
  // Check local branch
  const localResult = await gitExec(
    ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`],
    { cwd, throwOnError: false }
  )

  if (localResult.success) {
    return true
  }

  if (checkRemote) {
    // Check remote branch
    const remoteResult = await gitExec(
      ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${branchName}`],
      { cwd, throwOnError: false }
    )
    return remoteResult.success
  }

  return false
}

/**
 * Get the current branch name.
 *
 * @param cwd - Repository directory
 * @returns Current branch name, or empty string if detached
 * @throws {GitCommandError} If unable to determine current branch
 *
 * @example
 * ```typescript
 * const branch = await getCurrentBranch()
 * console.log(`Currently on: ${branch || 'detached HEAD'}`)
 * ```
 */
export async function getCurrentBranch(cwd?: string): Promise<string> {
  const result = await gitExec(['branch', '--show-current'], { cwd })
  return result.stdout.trim()
}

/**
 * Checkout an existing branch.
 *
 * @param branchName - Branch to checkout
 * @param options - Git execution options
 * @throws {GitCommandError} If checkout fails
 *
 * @example
 * ```typescript
 * await checkoutBranch('main')
 * ```
 */
export async function checkoutBranch(
  branchName: string,
  options: GitExecOptions = {}
): Promise<void> {
  await gitExec(['checkout', branchName], options)
}

/**
 * Delete a branch (local and optionally remote).
 *
 * @param branchName - Branch to delete
 * @param options - Delete options (force, deleteRemote, remote)
 * @param execOptions - Git execution options
 * @throws {GitCommandError} If deletion fails
 *
 * @example
 * ```typescript
 * // Delete local branch
 * await deleteBranch('feature/old-task')
 *
 * // Force delete with remote
 * await deleteBranch('feature/old-task', { force: true, deleteRemote: true })
 * ```
 */
export async function deleteBranch(
  branchName: string,
  options: DeleteBranchOptions = {},
  execOptions: GitExecOptions = {}
): Promise<void> {
  const { force = false, deleteRemote = false, remote = 'origin' } = options

  // Delete local branch
  const deleteFlag = force ? '-D' : '-d'
  await gitExec(['branch', deleteFlag, branchName], execOptions)

  // Delete remote branch if requested
  if (deleteRemote) {
    await gitExec(['push', remote, '--delete', branchName], {
      ...execOptions,
      throwOnError: false, // Remote might not exist
    })
  }
}

/**
 * List all local branches.
 *
 * @param cwd - Repository directory
 * @returns Array of branch names
 */
export async function listBranches(cwd?: string): Promise<string[]> {
  const result = await gitExec(['branch', '--list', '--format=%(refname:short)'], { cwd })
  return result.stdout
    .trim()
    .split('\n')
    .filter((b) => b.length > 0)
}

/**
 * Get the upstream branch for a local branch.
 *
 * @param branchName - Local branch name
 * @param cwd - Repository directory
 * @returns Upstream branch (e.g., 'origin/main'), or null if not set
 */
export async function getUpstreamBranch(branchName: string, cwd?: string): Promise<string | null> {
  const result = await gitExec(
    ['rev-parse', '--abbrev-ref', `${branchName}@{upstream}`],
    { cwd, throwOnError: false }
  )

  if (!result.success) {
    return null
  }

  return result.stdout.trim()
}

/**
 * Set the upstream branch for a local branch.
 *
 * @param branchName - Local branch name
 * @param upstream - Upstream branch (e.g., 'origin/main')
 * @param cwd - Repository directory
 */
export async function setUpstreamBranch(
  branchName: string,
  upstream: string,
  cwd?: string
): Promise<void> {
  await gitExec(['branch', '--set-upstream-to', upstream, branchName], { cwd })
}

/**
 * Push a branch to remote, setting upstream if first push.
 *
 * @param branchName - Branch to push
 * @param remote - Remote name (default: 'origin')
 * @param options - Git execution options
 * @throws {GitCommandError} If push fails
 */
export async function pushBranch(
  branchName: string,
  remote = 'origin',
  options: GitExecOptions = {}
): Promise<void> {
  await gitExec(['push', '-u', remote, branchName], options)
}

/**
 * Get the merge base between two branches.
 *
 * @param branch1 - First branch
 * @param branch2 - Second branch
 * @param cwd - Repository directory
 * @returns Commit SHA of the merge base
 */
export async function getMergeBase(
  branch1: string,
  branch2: string,
  cwd?: string
): Promise<string> {
  const result = await gitExec(['merge-base', branch1, branch2], { cwd })
  return result.stdout.trim()
}
