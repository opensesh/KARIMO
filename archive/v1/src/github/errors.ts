/**
 * KARIMO GitHub Errors
 *
 * Custom error classes for GitHub API operations including gh CLI
 * execution, authentication, and pull request management.
 */

/**
 * Base class for all GitHub-related errors.
 */
export class KarimoGitHubError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KarimoGitHubError'
  }
}

/**
 * Thrown when the gh CLI is not found on the system.
 */
export class GhCliNotFoundError extends KarimoGitHubError {
  constructor() {
    super(
      'GitHub CLI (gh) not found.\n\nInstall it from: https://cli.github.com\n\nAfter installation, authenticate with: gh auth login'
    )
    this.name = 'GhCliNotFoundError'
  }
}

/**
 * Thrown when gh CLI authentication fails or is not configured.
 */
export class GhAuthError extends KarimoGitHubError {
  constructor(
    public reason: string,
    public hostName?: string
  ) {
    const hostInfo = hostName ? ` for ${hostName}` : ''
    super(
      `GitHub authentication failed${hostInfo}.\n  Reason: ${reason}\n\nRun 'gh auth login' to authenticate.`
    )
    this.name = 'GhAuthError'
  }
}

/**
 * Thrown when a gh CLI command fails.
 */
export class GhCommandError extends KarimoGitHubError {
  constructor(
    public args: string[],
    public exitCode: number,
    public stderr: string
  ) {
    const cmd = `gh ${args.join(' ')}`
    super(
      `GitHub CLI command failed.\n  Command: ${cmd}\n  Exit code: ${exitCode}\n  Error: ${stderr.trim()}\n\nEnsure you're authenticated and have the required permissions.`
    )
    this.name = 'GhCommandError'
  }
}

/**
 * Thrown when pull request creation fails.
 */
export class PrCreateError extends KarimoGitHubError {
  constructor(
    public head: string,
    public base: string,
    public reason: string
  ) {
    super(
      `Failed to create pull request.\n  Head: ${head}\n  Base: ${base}\n  Reason: ${reason}\n\nEnsure the branch exists and has commits not in the base branch.`
    )
    this.name = 'PrCreateError'
  }
}

/**
 * Thrown when Octokit API operations fail.
 */
export class OctokitError extends KarimoGitHubError {
  public status: number
  public documentationUrl?: string

  constructor(status: number, message: string, documentationUrl?: string) {
    const docsInfo = documentationUrl ? `\n  Docs: ${documentationUrl}` : ''
    super(
      `GitHub API error.\n  Status: ${status}\n  Message: ${message}${docsInfo}\n\nCheck your token permissions and API rate limits.`
    )
    this.name = 'OctokitError'
    this.status = status
    if (documentationUrl !== undefined) {
      this.documentationUrl = documentationUrl
    }
  }
}

/**
 * Thrown when repository access is denied.
 */
export class RepoAccessError extends KarimoGitHubError {
  constructor(
    public owner: string,
    public repo: string,
    public reason: string
  ) {
    super(
      `Repository access denied.\n  Repository: ${owner}/${repo}\n  Reason: ${reason}\n\nEnsure you have the required permissions for this repository.`
    )
    this.name = 'RepoAccessError'
  }
}
