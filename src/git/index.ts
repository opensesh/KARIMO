/**
 * KARIMO Git Module
 *
 * Worktree management, branch operations, PR creation, and rebase handling.
 * Manages git worktrees for isolated task execution and handles all
 * git operations required by the orchestrator.
 */

// Worktree info
export interface WorktreeInfo {
  path: string
  branch: string
  head: string
  isDetached: boolean
}

// Rebase result
export interface RebaseResult {
  success: boolean
  conflicts: boolean
  conflictFiles?: string[]
  error?: string
}

// PR creation options
export interface CreatePROptions {
  head: string
  base: string
  title: string
  body: string
  draft?: boolean
  labels?: string[]
}

// Changed files result
export interface ChangedFilesResult {
  files: string[]
  additions: number
  deletions: number
}
