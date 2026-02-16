/**
 * KARIMO Git Types
 *
 * Type definitions for git operations including worktree management,
 * branch operations, rebase handling, and diff analysis.
 */

/**
 * Options for executing git commands.
 */
export interface GitExecOptions {
  /** Working directory for the git command */
  cwd?: string
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Whether to throw on non-zero exit code (default: true) */
  throwOnError?: boolean
  /** Additional environment variables */
  env?: Record<string, string>
}

/**
 * Result of a git command execution.
 */
export interface GitExecResult {
  /** Exit code of the command */
  exitCode: number
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
  /** Whether the command succeeded (exit code 0) */
  success: boolean
}

/**
 * Information about a git worktree.
 */
export interface WorktreeInfo {
  /** Absolute path to the worktree directory */
  path: string
  /** Branch name (empty if detached) */
  branch: string
  /** HEAD commit SHA */
  head: string
  /** Whether HEAD is detached (not on a branch) */
  isDetached: boolean
  /** Whether this is the main worktree */
  isMain: boolean
}

/**
 * Result of a rebase operation.
 * Note: Does not throw on conflict — orchestrator decides next steps.
 */
export interface RebaseResult {
  /** Whether the rebase completed successfully */
  success: boolean
  /** List of files with conflicts (empty if no conflicts) */
  conflictFiles: string[]
  /** Error message if rebase failed for reasons other than conflicts */
  error?: string
}

/**
 * Options for deleting a branch.
 */
export interface DeleteBranchOptions {
  /** Force delete even if branch is not fully merged (default: false) */
  force?: boolean
  /** Also delete remote branch if it exists (default: false) */
  deleteRemote?: boolean
  /** Remote name (default: 'origin') */
  remote?: string
}

/**
 * Information about a changed file in a diff.
 */
export interface ChangedFile {
  /** File path relative to repository root */
  path: string
  /** Change type: added, modified, deleted, renamed, copied */
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | 'U' | 'X'
  /** Number of lines added */
  additions: number
  /** Number of lines deleted */
  deletions: number
  /** Previous path (for renamed/copied files) */
  previousPath?: string
}

/**
 * Result of analyzing changed files.
 */
export interface ChangedFilesResult {
  /** List of changed files with details */
  files: ChangedFile[]
  /** Total number of lines added */
  totalAdditions: number
  /** Total number of lines deleted */
  totalDeletions: number
  /** Total number of files changed */
  totalFiles: number
}

/**
 * Result of detecting caution files.
 */
export interface CautionFilesResult {
  /** Files matching caution patterns */
  cautionFiles: string[]
  /** Pattern that matched each file */
  matches: Array<{ file: string; pattern: string }>
}

/**
 * Result of detecting never_touch violations.
 */
export interface NeverTouchViolation {
  /** File that was modified */
  file: string
  /** Pattern that was violated */
  pattern: string
}
