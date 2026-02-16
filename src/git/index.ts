/**
 * KARIMO Git Module
 *
 * Worktree management, branch operations, rebase handling, and diff analysis.
 * Provides all git operations required by the orchestrator for isolated
 * task execution with clean worktrees.
 */

// =============================================================================
// Error Classes
// =============================================================================

export {
  KarimoGitError,
  GitCommandError,
  WorktreeCreateError,
  WorktreeNotFoundError,
  BranchCreateError,
  RebaseConflictError,
} from './errors'

// =============================================================================
// Types
// =============================================================================

export type {
  GitExecOptions,
  GitExecResult,
  WorktreeInfo,
  RebaseResult,
  DeleteBranchOptions,
  ChangedFile,
  ChangedFilesResult,
  CautionFilesResult,
  NeverTouchViolation,
} from './types'

// =============================================================================
// Git Execution
// =============================================================================

export {
  gitExec,
  getRepoRoot,
  isGitRepo,
  getHeadSha,
  getDefaultBranch,
} from './exec'

// =============================================================================
// Worktree Management
// =============================================================================

export {
  listWorktrees,
  worktreeExists,
  getWorktreeInfo,
  createWorktree,
  removeWorktree,
  pruneWorktrees,
  getWorktreePath,
} from './worktree'

// =============================================================================
// Branch Operations
// =============================================================================

export {
  createTaskBranch,
  branchExists,
  getCurrentBranch,
  checkoutBranch,
  deleteBranch,
  listBranches,
  getUpstreamBranch,
  setUpstreamBranch,
  pushBranch,
  getMergeBase,
} from './branch'

// =============================================================================
// Rebase Operations
// =============================================================================

export {
  rebaseOntoTarget,
  abortRebase,
  continueRebase,
  skipRebase,
  isRebaseInProgress,
  getConflictFiles,
  needsRebase,
  squashCommits,
} from './rebase'

// =============================================================================
// Diff & Change Detection
// =============================================================================

export {
  getChangedFiles,
  getChangedFilesDetailed,
  detectCautionFiles,
  detectNeverTouchViolations,
  getFileDiff,
  getUncommittedChanges,
  hasUncommittedChanges,
} from './diff'
