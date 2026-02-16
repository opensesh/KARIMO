/**
 * KARIMO GitHub CLI Auth
 *
 * Authentication verification and caching for gh CLI.
 * Provides 5-minute caching for auth status to reduce overhead.
 */

import { GhAuthError, RepoAccessError } from './errors'
import { ghExec, isGhAvailable } from './exec'
import type { GhAuthStatus } from './types'

/** Cache duration for auth status (5 minutes) */
const AUTH_CACHE_TTL = 5 * 60 * 1000

/** Cached auth status */
let authCache: {
  status: GhAuthStatus
  timestamp: number
} | null = null

/**
 * Parse gh auth status output.
 */
function parseAuthStatus(stdout: string, stderr: string, host: string): GhAuthStatus {
  // Check stderr for login prompt
  if (stderr.includes('not logged in') || stderr.includes('gh auth login')) {
    return {
      authenticated: false,
      host,
    }
  }

  // Parse successful auth status
  const lines = stdout.split('\n')
  let username: string | undefined
  let protocol: 'https' | 'ssh' | undefined
  const scopes: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Look for "Logged in to github.com account username"
    const accountMatch = trimmed.match(/Logged in to .+ account (\S+)/)
    if (accountMatch) {
      username = accountMatch[1]
    }

    // Look for "- Token: ..."
    if (trimmed.includes('Token:')) {
      // Token exists, authenticated
    }

    // Look for protocol
    if (trimmed.includes('Git Operations Protocol: https')) {
      protocol = 'https'
    } else if (trimmed.includes('Git Operations Protocol: ssh')) {
      protocol = 'ssh'
    }

    // Look for scopes
    const scopeMatch = trimmed.match(/Token scopes: (.+)/)
    if (scopeMatch?.[1]) {
      scopes.push(
        ...scopeMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s)
      )
    }
  }

  const result: GhAuthStatus = {
    authenticated: username !== undefined,
    host,
  }

  if (username !== undefined) {
    result.username = username
  }
  if (scopes.length > 0) {
    result.scopes = scopes
  }
  if (protocol !== undefined) {
    result.protocol = protocol
  }

  return result
}

/**
 * Verify gh CLI authentication status.
 * Results are cached for 5 minutes.
 *
 * @param hostname - GitHub hostname (default: github.com)
 * @param skipCache - Skip the cache and fetch fresh status
 * @returns Authentication status
 * @throws {GhAuthError} If not authenticated and throwOnUnauthenticated is true
 *
 * @example
 * ```typescript
 * const status = await verifyGhAuth()
 * if (status.authenticated) {
 *   console.log(`Logged in as ${status.username}`)
 * }
 * ```
 */
export async function verifyGhAuth(
  hostname = 'github.com',
  skipCache = false
): Promise<GhAuthStatus> {
  // Check cache
  if (!skipCache && authCache) {
    const age = Date.now() - authCache.timestamp
    if (age < AUTH_CACHE_TTL && authCache.status.host === hostname) {
      return authCache.status
    }
  }

  // Check if gh is available
  if (!(await isGhAvailable())) {
    return {
      authenticated: false,
      host: hostname,
    }
  }

  // Run auth status
  const result = await ghExec(['auth', 'status', '--hostname', hostname], {
    throwOnError: false,
  })

  const status = parseAuthStatus(result.stdout, result.stderr, hostname)

  // Cache result
  authCache = {
    status,
    timestamp: Date.now(),
  }

  return status
}

/**
 * Ensure gh CLI is authenticated, throwing if not.
 *
 * @param hostname - GitHub hostname
 * @throws {GhAuthError} If not authenticated
 */
export async function ensureGhAuth(hostname = 'github.com'): Promise<void> {
  const status = await verifyGhAuth(hostname)

  if (!status.authenticated) {
    throw new GhAuthError('Not authenticated', hostname)
  }
}

/**
 * Verify access to a specific repository.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @throws {RepoAccessError} If access is denied
 */
export async function verifyRepoAccess(owner: string, repo: string): Promise<void> {
  const result = await ghExec(['repo', 'view', `${owner}/${repo}`, '--json', 'name'], {
    throwOnError: false,
  })

  if (!result.success) {
    // Parse error message
    let reason = 'Unknown error'

    if (result.stderr.includes('not found')) {
      reason = 'Repository not found'
    } else if (result.stderr.includes('permission')) {
      reason = 'Permission denied'
    } else if (result.stderr.includes('Could not resolve')) {
      reason = 'Repository not found'
    } else if (result.stderr) {
      reason = result.stderr.trim()
    }

    throw new RepoAccessError(owner, repo, reason)
  }
}

/**
 * Get the current authenticated username.
 *
 * @param hostname - GitHub hostname
 * @returns Username, or null if not authenticated
 */
export async function getAuthenticatedUsername(hostname = 'github.com'): Promise<string | null> {
  const status = await verifyGhAuth(hostname)
  return status.username ?? null
}

/**
 * Reset the auth cache.
 * Useful for testing or after authentication changes.
 */
export function resetAuthCache(): void {
  authCache = null
}

/**
 * Check if a specific scope is available.
 *
 * @param scope - Scope to check (e.g., 'repo', 'workflow')
 * @param hostname - GitHub hostname
 * @returns True if the scope is available
 */
export async function hasScope(scope: string, hostname = 'github.com'): Promise<boolean> {
  const status = await verifyGhAuth(hostname)

  if (!status.authenticated || !status.scopes) {
    return false
  }

  return status.scopes.includes(scope)
}
