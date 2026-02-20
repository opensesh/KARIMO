/**
 * KARIMO Git Errors
 *
 * Custom error classes for git operations including worktree management,
 * branch operations, rebase handling, and command execution.
 * These provide clear, actionable error messages with context for debugging.
 */

/**
 * Base class for all git-related errors.
 */
export class KarimoGitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KarimoGitError'
  }
}

/**
 * Thrown when a git command fails during execution.
 * Contains the command args, exit code, and stderr for debugging.
 */
export class GitCommandError extends KarimoGitError {
  constructor(
    public args: string[],
    public exitCode: number,
    public stderr: string,
    public cwd?: string
  ) {
    const cmd = `git ${args.join(' ')}`
    const cwdInfo = cwd ? `\n  Working directory: ${cwd}` : ''
    super(
      `Git command failed.\n  Command: ${cmd}${cwdInfo}\n  Exit code: ${exitCode}\n  Error: ${stderr.trim()}\n\nCheck that git is installed and the repository state is valid.`
    )
    this.name = 'GitCommandError'
  }
}

/**
 * Thrown when a git worktree cannot be created.
 */
export class WorktreeCreateError extends KarimoGitError {
  constructor(
    public worktreePath: string,
    public branch: string,
    public reason: string
  ) {
    super(
      `Failed to create worktree.\n  Path: ${worktreePath}\n  Branch: ${branch}\n  Reason: ${reason}\n\nEnsure the path is valid and the branch exists or can be created.`
    )
    this.name = 'WorktreeCreateError'
  }
}

/**
 * Thrown when a git worktree is not found at the expected path.
 */
export class WorktreeNotFoundError extends KarimoGitError {
  constructor(public worktreePath: string) {
    super(
      `Worktree not found.\n  Path: ${worktreePath}\n\nEnsure the worktree exists or create it first.`
    )
    this.name = 'WorktreeNotFoundError'
  }
}

/**
 * Thrown when a branch cannot be created.
 */
export class BranchCreateError extends KarimoGitError {
  constructor(
    public branchName: string,
    public reason: string
  ) {
    super(
      `Failed to create branch.\n  Branch: ${branchName}\n  Reason: ${reason}\n\nEnsure the branch name is valid and doesn't already exist.`
    )
    this.name = 'BranchCreateError'
  }
}

/**
 * Thrown when a rebase operation encounters conflicts.
 * This is not a fatal error — the orchestrator decides what to do next.
 */
export class RebaseConflictError extends KarimoGitError {
  constructor(
    public targetBranch: string,
    public conflictFiles: string[]
  ) {
    const filesStr =
      conflictFiles.length > 0
        ? `\n  Conflict files:\n${conflictFiles.map((f) => `    - ${f}`).join('\n')}`
        : ''
    super(
      `Rebase conflict detected.\n  Target: ${targetBranch}${filesStr}\n\nThe rebase has been aborted. Resolve conflicts manually or use a different strategy.`
    )
    this.name = 'RebaseConflictError'
  }
}
