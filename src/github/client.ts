/**
 * KARIMO GitHub Client
 *
 * Thin Octokit wrapper for GitHub API operations.
 * Token resolution: GITHUB_TOKEN env → explicit token → gh auth token
 */

import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'
import { OctokitError } from './errors'
import { getGhToken } from './exec'
import type {
  CreatePrOptions,
  GitHubClient,
  GitHubClientOptions,
  PrResult,
  PrStatusResult,
} from './types'

/**
 * Resolve GitHub token from available sources.
 * Priority: GITHUB_TOKEN env → explicit token → gh CLI token
 *
 * @param explicitToken - Token passed explicitly
 * @returns Resolved token or null
 */
async function resolveToken(explicitToken?: string): Promise<string | null> {
  // 1. GITHUB_TOKEN environment variable (zero-config in CI)
  const envToken = process.env.GITHUB_TOKEN
  if (envToken) {
    return envToken
  }

  // 2. Explicit token passed in options
  if (explicitToken) {
    return explicitToken
  }

  // 3. Extract from gh auth token (local dev fallback)
  return getGhToken()
}

/**
 * Create a GitHub client with the resolved token.
 *
 * @param options - Client configuration options
 * @returns GitHubClient instance
 * @throws {OctokitError} If no token is available
 *
 * @example
 * ```typescript
 * // Uses GITHUB_TOKEN env or gh CLI token
 * const client = await createGitHubClient()
 *
 * // Or with explicit token
 * const client = await createGitHubClient({ token: 'ghp_...' })
 *
 * // Create a PR
 * const pr = await client.createPullRequest({
 *   owner: 'opensesh',
 *   repo: 'KARIMO',
 *   head: 'feature/task-1',
 *   base: 'main',
 *   title: 'Task 1 Implementation',
 *   body: 'Description here',
 * })
 * ```
 */
export async function createGitHubClient(
  options: GitHubClientOptions = {}
): Promise<GitHubClient> {
  const token = await resolveToken(options.token)

  if (!token) {
    throw new OctokitError(
      401,
      'No GitHub token available. Set GITHUB_TOKEN environment variable or run "gh auth login".'
    )
  }

  const octokit = new Octokit({
    auth: token,
    baseUrl: options.baseUrl,
  })

  const graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: `token ${token}`,
    },
  })

  return {
    async createPullRequest(prOptions: CreatePrOptions): Promise<PrResult> {
      try {
        const response = await octokit.rest.pulls.create({
          owner: prOptions.owner,
          repo: prOptions.repo,
          head: prOptions.head,
          base: prOptions.base,
          title: prOptions.title,
          body: prOptions.body,
          draft: prOptions.draft,
          maintainer_can_modify: prOptions.maintainerCanModify,
        })

        const pr = response.data

        // Add labels if provided
        if (prOptions.labels && prOptions.labels.length > 0) {
          await octokit.rest.issues.addLabels({
            owner: prOptions.owner,
            repo: prOptions.repo,
            issue_number: pr.number,
            labels: prOptions.labels,
          })
        }

        // Request reviewers if provided
        if (prOptions.reviewers && prOptions.reviewers.length > 0) {
          await octokit.rest.pulls.requestReviewers({
            owner: prOptions.owner,
            repo: prOptions.repo,
            pull_number: pr.number,
            reviewers: prOptions.reviewers,
          })
        }

        return {
          number: pr.number,
          url: pr.html_url,
          nodeId: pr.node_id,
          state: pr.state as 'open' | 'closed' | 'merged',
          draft: pr.draft ?? false,
          head: pr.head.ref,
          base: pr.base.ref,
        }
      } catch (error) {
        handleOctokitError(error)
      }
    },

    async getPullRequest(
      owner: string,
      repo: string,
      number: number
    ): Promise<PrStatusResult> {
      try {
        const response = await octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: number,
        })

        const pr = response.data

        return {
          number: pr.number,
          state: pr.state as 'open' | 'closed',
          merged: pr.merged,
          draft: pr.draft ?? false,
          mergeable: pr.mergeable,
          mergeableState: mapMergeableState(pr.mergeable_state),
          reviewDecision: null, // Would need GraphQL query
          statusCheckRollup: null, // Would need GraphQL query
          comments: pr.comments,
          commits: pr.commits,
          changedFiles: pr.changed_files,
          additions: pr.additions,
          deletions: pr.deletions,
        }
      } catch (error) {
        handleOctokitError(error)
      }
    },

    async addLabels(
      owner: string,
      repo: string,
      number: number,
      labels: string[]
    ): Promise<void> {
      try {
        await octokit.rest.issues.addLabels({
          owner,
          repo,
          issue_number: number,
          labels,
        })
      } catch (error) {
        handleOctokitError(error)
      }
    },

    async removeLabels(
      owner: string,
      repo: string,
      number: number,
      labels: string[]
    ): Promise<void> {
      try {
        for (const label of labels) {
          await octokit.rest.issues.removeLabel({
            owner,
            repo,
            issue_number: number,
            name: label,
          }).catch(() => {
            // Ignore errors for labels that don't exist
          })
        }
      } catch (error) {
        handleOctokitError(error)
      }
    },

    async graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
      try {
        return await graphqlWithAuth<T>(query, variables)
      } catch (error) {
        handleOctokitError(error)
      }
    },

    async getAuthenticatedUser(): Promise<{ login: string; id: number }> {
      try {
        const response = await octokit.rest.users.getAuthenticated()
        return {
          login: response.data.login,
          id: response.data.id,
        }
      } catch (error) {
        handleOctokitError(error)
      }
    },
  }
}

/**
 * Map GitHub's mergeable_state to our simplified enum.
 */
function mapMergeableState(
  state: string
): 'clean' | 'dirty' | 'blocked' | 'behind' | 'unknown' {
  switch (state) {
    case 'clean':
      return 'clean'
    case 'dirty':
    case 'unstable':
      return 'dirty'
    case 'blocked':
      return 'blocked'
    case 'behind':
      return 'behind'
    default:
      return 'unknown'
  }
}

/**
 * Handle Octokit errors and convert to OctokitError.
 */
function handleOctokitError(error: unknown): never {
  if (error && typeof error === 'object' && 'status' in error) {
    const octokitErr = error as { status: number; message?: string; documentation_url?: string }
    throw new OctokitError(
      octokitErr.status,
      octokitErr.message ?? 'Unknown error',
      octokitErr.documentation_url
    )
  }

  if (error instanceof Error) {
    throw new OctokitError(500, error.message)
  }

  throw new OctokitError(500, String(error))
}

/**
 * Check if a GitHub token is available.
 *
 * @returns True if a token can be resolved
 */
export async function hasGitHubToken(): Promise<boolean> {
  const token = await resolveToken()
  return token !== null
}
