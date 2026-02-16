/**
 * Sandbox Detection
 *
 * Detects allowed environment variables from example files.
 *
 * IMPORTANT: Never reads actual .env or .env.local files.
 * Only reads example/template files like .env.example.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectedValue } from './types'
import { high, medium } from './types'

/**
 * Result of sandbox detection.
 */
export interface SandboxDetectionResult {
  allowed_env: DetectedValue<string>[]
}

/**
 * Environment variables that are always safe.
 */
const ALWAYS_ALLOWED = [
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TERM',
  'LANG',
  'NODE_ENV',
  'CI',
]

/**
 * Prefixes that indicate public/safe variables.
 */
const SAFE_PREFIXES = [
  'NEXT_PUBLIC_',
  'VITE_',
  'NUXT_PUBLIC_',
  'REACT_APP_',
  'VUE_APP_',
  'EXPO_PUBLIC_',
]

/**
 * Keywords that indicate the variable is safe.
 */
const SAFE_KEYWORDS = ['PUBLIC', 'ANON', 'URL', 'HOST', 'PORT', 'DOMAIN']

/**
 * Keywords that indicate the variable is secret (should be excluded).
 */
const SECRET_KEYWORDS = [
  'SECRET',
  'PRIVATE',
  'PASSWORD',
  'PASSWD',
  'TOKEN',
  'KEY',
  'API_KEY',
  'APIKEY',
  'SERVICE_KEY',
  'SERVICE_ROLE',
  'AUTH_SECRET',
  'JWT_SECRET',
  'ENCRYPTION',
  'CREDENTIAL',
]

/**
 * Example env files to check (in order of preference).
 */
const EXAMPLE_FILES = [
  '.env.example',
  '.env.sample',
  '.env.template',
  '.env.development.example',
  '.env.local.example',
  'env.example',
  'env.sample',
]

/**
 * Check if a variable name is safe based on prefixes and keywords.
 */
function isSafeVariable(name: string): boolean {
  const upper = name.toUpperCase()

  // Check if it has a safe prefix
  for (const prefix of SAFE_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return true
    }
  }

  // Check for secret keywords (exclude these)
  for (const keyword of SECRET_KEYWORDS) {
    if (upper.includes(keyword)) {
      // Exception: NEXT_PUBLIC_* etc. are still safe even if they contain these
      const hasSafePrefix = SAFE_PREFIXES.some((p) => upper.startsWith(p))
      if (!hasSafePrefix) {
        return false
      }
    }
  }

  // Check for safe keywords
  for (const keyword of SAFE_KEYWORDS) {
    if (upper.includes(keyword)) {
      return true
    }
  }

  return false
}

/**
 * Parse environment variables from a .env file content.
 */
function parseEnvFile(content: string): string[] {
  const vars: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Extract variable name (before =)
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/i)
    if (match?.[1]) {
      vars.push(match[1])
    }
  }

  return vars
}

/**
 * Find and read the first available example env file.
 */
function readExampleEnvFile(
  targetDir: string
): { vars: string[]; source: string } | null {
  for (const file of EXAMPLE_FILES) {
    const filePath = join(targetDir, file)
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8')
        const vars = parseEnvFile(content)
        return { vars, source: file }
      } catch {
        // Continue to next file
      }
    }
  }
  return null
}

/**
 * Detect allowed environment variables.
 */
export function detectSandbox(targetDir: string): SandboxDetectionResult {
  const allowed: DetectedValue<string>[] = []

  // Always include system variables
  for (const envVar of ALWAYS_ALLOWED) {
    allowed.push(
      high(envVar, 'system', 'Standard system environment variable')
    )
  }

  // Try to read example env file
  const envFile = readExampleEnvFile(targetDir)

  if (envFile) {
    for (const varName of envFile.vars) {
      // Skip if already in ALWAYS_ALLOWED
      if (ALWAYS_ALLOWED.includes(varName)) {
        continue
      }

      // Only include if it appears safe
      if (isSafeVariable(varName)) {
        allowed.push(
          medium(
            varName,
            envFile.source,
            `Found in ${envFile.source}, appears safe`
          )
        )
      }
    }
  }

  // Check for framework-specific patterns
  const frameworkVars: Array<{
    prefix: string
    source: string
    reason: string
  }> = [
    {
      prefix: 'NEXT_PUBLIC_',
      source: 'Next.js convention',
      reason: 'Client-exposed by Next.js',
    },
    {
      prefix: 'VITE_',
      source: 'Vite convention',
      reason: 'Client-exposed by Vite',
    },
    {
      prefix: 'NUXT_PUBLIC_',
      source: 'Nuxt convention',
      reason: 'Client-exposed by Nuxt',
    },
  ]

  // Add framework-specific prefixes as patterns if example file exists
  if (envFile) {
    for (const framework of frameworkVars) {
      const hasPrefix = envFile.vars.some((v) =>
        v.toUpperCase().startsWith(framework.prefix)
      )
      if (hasPrefix) {
        // Check if we haven't already added a note for this prefix
        const alreadyAdded = allowed.some(
          (a) => a.source === framework.source
        )
        if (!alreadyAdded) {
          allowed.push(
            medium(
              `${framework.prefix}*`,
              framework.source,
              framework.reason
            )
          )
        }
      }
    }
  }

  return { allowed_env: allowed }
}
