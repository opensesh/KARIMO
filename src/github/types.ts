/**
 * KARIMO GitHub Types
 *
 * Type definitions for GitHub API operations including PR creation,
 * gh CLI execution, and Octokit client configuration.
 */

/**
 * Options for executing gh CLI commands.
 */
export interface GhExecOptions {
  /** Working directory for the command */
  cwd?: string
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Whether to throw on non-zero exit code (default: true) */
  throwOnError?: boolean
  /** Additional environment variables */
  env?: Record<string, string>
}

/**
 * Result of a gh CLI command execution.
 */
export interface GhExecResult {
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
 * GitHub authentication status.
 */
export interface GhAuthStatus {
  /** Whether the user is authenticated */
  authenticated: boolean
  /** GitHub username */
  username?: string
  /** GitHub host (e.g., github.com) */
  host: string
  /** Token scopes */
  scopes?: string[]
  /** Protocol used (https or ssh) */
  protocol?: 'https' | 'ssh'
}

/**
 * Options for creating a GitHub client.
 */
export interface GitHubClientOptions {
  /** GitHub token (optional, will use gh auth token or GITHUB_TOKEN) */
  token?: string
  /** GitHub API base URL (for GitHub Enterprise) */
  baseUrl?: string
}

/**
 * Options for creating a pull request.
 */
export interface CreatePrOptions {
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** Head branch (source) */
  head: string
  /** Base branch (target) */
  base: string
  /** PR title */
  title: string
  /** PR body/description */
  body: string
  /** Create as draft PR */
  draft?: boolean
  /** Labels to apply */
  labels?: string[]
  /** Reviewers to request */
  reviewers?: string[]
  /** Whether the PR should be maintainer editable */
  maintainerCanModify?: boolean
}

/**
 * Result of PR creation.
 */
export interface PrResult {
  /** PR number */
  number: number
  /** PR URL */
  url: string
  /** PR node ID (for GraphQL) */
  nodeId: string
  /** PR state */
  state: 'open' | 'closed' | 'merged'
  /** Whether the PR is a draft */
  draft: boolean
  /** Head branch */
  head: string
  /** Base branch */
  base: string
}

/**
 * Status of a pull request.
 */
export interface PrStatusResult {
  /** PR number */
  number: number
  /** PR state */
  state: 'open' | 'closed'
  /** Whether the PR is merged */
  merged: boolean
  /** Whether the PR is a draft */
  draft: boolean
  /** Whether the PR is mergeable */
  mergeable: boolean | null
  /** Mergeable state */
  mergeableState: 'clean' | 'dirty' | 'blocked' | 'behind' | 'unknown'
  /** Review decision */
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  /** Status checks state */
  statusCheckRollup: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'ERROR' | null
  /** Number of comments */
  comments: number
  /** Number of commits */
  commits: number
  /** Number of changed files */
  changedFiles: number
  /** Additions count */
  additions: number
  /** Deletions count */
  deletions: number
}

/**
 * Context for building PR body.
 */
export interface PrBodyContext {
  /** Task ID */
  taskId: string
  /** Phase ID */
  phaseId: string
  /** Task complexity (1-10) */
  complexity: number
  /** Cost ceiling in dollars */
  costCeiling: number
  /** Task description */
  description: string
  /** List of affected files */
  files: string[]
  /** Files matching caution patterns */
  cautionFiles?: string[]
  /** Success criteria */
  successCriteria?: string[]
}

/**
 * GitHub client interface.
 * Thin wrapper around Octokit for PR operations.
 */
export interface GitHubClient {
  /** Create a pull request */
  createPullRequest(options: CreatePrOptions): Promise<PrResult>
  /** Get pull request status */
  getPullRequest(owner: string, repo: string, number: number): Promise<PrStatusResult>
  /** Add labels to a PR/issue */
  addLabels(owner: string, repo: string, number: number, labels: string[]): Promise<void>
  /** Remove labels from a PR/issue */
  removeLabels(owner: string, repo: string, number: number, labels: string[]): Promise<void>
  /** Execute a GraphQL query */
  graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T>
  /** Get the authenticated user */
  getAuthenticatedUser(): Promise<{ login: string; id: number }>
}

/**
 * Options for closing a PR.
 */
export interface ClosePrOptions {
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** PR number */
  number: number
}

/**
 * Options for marking PR ready for review.
 */
export interface MarkReadyOptions {
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** PR number */
  number: number
}
