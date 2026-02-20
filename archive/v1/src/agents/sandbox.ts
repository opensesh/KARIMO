/**
 * KARIMO Agent Sandbox
 *
 * Environment variable filtering for sandboxed agent execution.
 * Ensures agents only have access to safe, allowed environment variables.
 */

import type { KarimoConfig } from '@/config/schema'

/**
 * Environment variables that are ALWAYS included regardless of config.
 * These are essential for process execution.
 */
const ALWAYS_INCLUDE: readonly string[] = ['PATH', 'HOME', 'TERM', 'SHELL', 'USER', 'LANG']

/**
 * Environment variables that are NEVER included regardless of config.
 * These contain sensitive credentials that should not be exposed to agents.
 */
const ALWAYS_EXCLUDE: readonly string[] = [
  // GitHub/Git tokens
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'GITHUB_PERSONAL_ACCESS_TOKEN',
  'GIT_ASKPASS',

  // KARIMO internal secrets
  'KARIMO_DASHBOARD_API_KEY',
  'KARIMO_DASHBOARD_SECRET',
  'KARIMO_WEBHOOK_SECRET',

  // Database credentials
  'DB_SERVICE_KEY',
  'DATABASE_URL',
  'DB_PASSWORD',
  'POSTGRES_PASSWORD',
  'MYSQL_PASSWORD',
  'MONGODB_URI',

  // Cloud provider credentials
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'AZURE_CLIENT_SECRET',

  // API keys commonly found in projects
  'API_KEY',
  'API_SECRET',
  'SECRET_KEY',
  'PRIVATE_KEY',
  'SIGNING_KEY',
  'ENCRYPTION_KEY',

  // Auth tokens
  'AUTH_TOKEN',
  'ACCESS_TOKEN',
  'REFRESH_TOKEN',
  'JWT_SECRET',
  'SESSION_SECRET',

  // Other sensitive values
  'STRIPE_SECRET_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SENDGRID_API_KEY',
  'TWILIO_AUTH_TOKEN',
]

/**
 * Build a sandboxed environment for agent execution.
 *
 * Filters process.env to only include:
 * 1. Always-included essential variables (PATH, HOME, etc.)
 * 2. Variables explicitly allowed in config.sandbox.allowed_env
 *
 * And excludes:
 * 1. Always-excluded sensitive variables (tokens, secrets, etc.)
 * 2. Any variable not in the allowed list
 *
 * @param config - KARIMO configuration
 * @returns Filtered environment variables
 *
 * @example
 * ```typescript
 * const env = buildAgentEnvironment(config)
 * // env contains only safe, allowed variables
 * ```
 */
export function buildAgentEnvironment(config: KarimoConfig): Record<string, string> {
  const env: Record<string, string> = {}
  const allowedSet = new Set(config.sandbox.allowed_env)
  const excludeSet = new Set(ALWAYS_EXCLUDE)

  // Add always-included variables first
  for (const key of ALWAYS_INCLUDE) {
    const value = process.env[key]
    if (value !== undefined && !excludeSet.has(key)) {
      env[key] = value
    }
  }

  // Add allowed variables from config (that aren't excluded)
  for (const key of allowedSet) {
    if (excludeSet.has(key)) {
      // Skip excluded variables even if explicitly allowed
      continue
    }

    const value = process.env[key]
    if (value !== undefined) {
      env[key] = value
    }
  }

  return env
}

/**
 * Check if an environment variable is safe to include.
 *
 * @param key - Environment variable name
 * @param allowedEnv - List of allowed environment variables from config
 * @returns True if the variable is safe to include
 */
export function isEnvVariableSafe(key: string, allowedEnv: string[]): boolean {
  // Always excluded takes precedence
  if (ALWAYS_EXCLUDE.includes(key)) {
    return false
  }

  // Always included is safe
  if (ALWAYS_INCLUDE.includes(key)) {
    return true
  }

  // Otherwise, must be in allowed list
  return allowedEnv.includes(key)
}

/**
 * Get the list of always-excluded environment variables.
 * Useful for documentation or validation purposes.
 *
 * @returns List of always-excluded variable names
 */
export function getExcludedEnvVariables(): readonly string[] {
  return ALWAYS_EXCLUDE
}

/**
 * Get the list of always-included environment variables.
 * Useful for documentation or validation purposes.
 *
 * @returns List of always-included variable names
 */
export function getIncludedEnvVariables(): readonly string[] {
  return ALWAYS_INCLUDE
}
