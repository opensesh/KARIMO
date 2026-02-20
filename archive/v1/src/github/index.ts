/**
 * KARIMO GitHub Module
 *
 * GitHub API integration using dual-layer approach:
 * - gh CLI for simple operations (leverages existing auth)
 * - Octokit for complex operations and GraphQL (future GitHub Projects)
 *
 * Provides PR creation, status lookup, label management, and auth verification.
 */

// =============================================================================
// Error Classes
// =============================================================================

export {
  KarimoGitHubError,
  GhCliNotFoundError,
  GhAuthError,
  GhCommandError,
  PrCreateError,
  OctokitError,
  RepoAccessError,
} from './errors'

// =============================================================================
// Types
// =============================================================================

export type {
  GhExecOptions,
  GhExecResult,
  GhAuthStatus,
  GitHubClientOptions,
  CreatePrOptions,
  PrResult,
  PrStatusResult,
  PrBodyContext,
  GitHubClient,
  ClosePrOptions,
  MarkReadyOptions,
} from './types'

// =============================================================================
// gh CLI Execution
// =============================================================================

export {
  isGhAvailable,
  ensureGhAvailable,
  ghExec,
  ghExecJson,
  getGhToken,
  resetGhAvailabilityCache,
} from './exec'

// =============================================================================
// gh CLI Authentication
// =============================================================================

export {
  verifyGhAuth,
  ensureGhAuth,
  verifyRepoAccess,
  getAuthenticatedUsername,
  resetAuthCache,
  hasScope,
} from './cli-auth'

// =============================================================================
// Octokit Client
// =============================================================================

export {
  createGitHubClient,
  hasGitHubToken,
} from './client'

// =============================================================================
// PR Operations
// =============================================================================

export {
  buildPrBody,
  createPullRequest,
  getPrStatus,
  addLabels,
  removeLabels,
  closePr,
  reopenPr,
  markReadyForReview,
} from './pr'
