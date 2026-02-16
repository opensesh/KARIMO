/**
 * Boundaries Detection
 *
 * Detects file patterns for boundaries:
 * - never_touch: Files that should never be modified by agents
 * - require_review: Files that need human review before changes
 *
 * Only includes patterns for files/directories that actually exist.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectedValue, PackageJson } from './types'
import { high, medium } from './types'

/**
 * Result of boundaries detection.
 */
export interface BoundariesDetectionResult {
  never_touch: DetectedValue<string>[]
  require_review: DetectedValue<string>[]
}

/**
 * Hardcoded never_touch patterns that always apply.
 */
const ALWAYS_NEVER_TOUCH: Array<{ pattern: string; source: string }> = [
  { pattern: '*.lock', source: 'lockfiles' },
  { pattern: '*.lockb', source: 'lockfiles' },
  { pattern: '.env', source: 'environment files' },
  { pattern: '.env.*', source: 'environment files' },
  { pattern: '.karimo/config.yaml', source: 'KARIMO config' },
]

/**
 * Detect never_touch patterns.
 */
function detectNeverTouch(
  targetDir: string,
  _pkg: PackageJson | null
): DetectedValue<string>[] {
  const patterns: DetectedValue<string>[] = []

  // Always include hardcoded patterns
  for (const item of ALWAYS_NEVER_TOUCH) {
    patterns.push(
      high(item.pattern, item.source, 'Critical file that should never be modified')
    )
  }

  // Supabase migrations
  if (existsSync(join(targetDir, 'supabase', 'migrations'))) {
    patterns.push(
      high(
        'supabase/migrations/*.sql',
        'supabase/migrations/',
        'Existing database migrations are immutable'
      )
    )
  }

  // Prisma migrations
  if (existsSync(join(targetDir, 'prisma', 'migrations'))) {
    patterns.push(
      high(
        'prisma/migrations/**',
        'prisma/migrations/',
        'Existing database migrations are immutable'
      )
    )
  }

  // GitHub Actions workflows
  if (existsSync(join(targetDir, '.github', 'workflows'))) {
    patterns.push(
      medium(
        '.github/workflows/*.yml',
        '.github/workflows/',
        'CI/CD workflows require careful review'
      )
    )
    patterns.push(
      medium(
        '.github/workflows/*.yaml',
        '.github/workflows/',
        'CI/CD workflows require careful review'
      )
    )
  }

  // Docker files
  if (existsSync(join(targetDir, 'Dockerfile'))) {
    patterns.push(
      medium(
        'Dockerfile',
        'Dockerfile',
        'Container configuration is critical'
      )
    )
  }
  if (existsSync(join(targetDir, 'docker-compose.yml')) ||
      existsSync(join(targetDir, 'docker-compose.yaml'))) {
    patterns.push(
      medium(
        'docker-compose*.yml',
        'docker-compose.yml',
        'Container orchestration is critical'
      )
    )
  }

  // Terraform/IaC
  if (existsSync(join(targetDir, 'terraform')) ||
      existsSync(join(targetDir, 'infra'))) {
    const infraDir = existsSync(join(targetDir, 'terraform'))
      ? 'terraform'
      : 'infra'
    patterns.push(
      high(
        `${infraDir}/**/*.tf`,
        `${infraDir}/`,
        'Infrastructure as code requires careful review'
      )
    )
  }

  return patterns
}

/**
 * Detect require_review patterns.
 */
function detectRequireReview(
  targetDir: string,
  pkg: PackageJson | null
): DetectedValue<string>[] {
  const patterns: DetectedValue<string>[] = []
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies }

  // Next.js middleware
  if (deps['next']) {
    if (existsSync(join(targetDir, 'middleware.ts'))) {
      patterns.push(
        high(
          'middleware.ts',
          'middleware.ts',
          'Route protection and request handling'
        )
      )
    }
    if (existsSync(join(targetDir, 'src', 'middleware.ts'))) {
      patterns.push(
        high(
          'src/middleware.ts',
          'src/middleware.ts',
          'Route protection and request handling'
        )
      )
    }

    // App layout
    if (existsSync(join(targetDir, 'app', 'layout.tsx'))) {
      patterns.push(
        medium(
          'app/layout.tsx',
          'app/layout.tsx',
          'Root layout affects all pages'
        )
      )
    }
    if (existsSync(join(targetDir, 'src', 'app', 'layout.tsx'))) {
      patterns.push(
        medium(
          'src/app/layout.tsx',
          'src/app/layout.tsx',
          'Root layout affects all pages'
        )
      )
    }

    // Next.js config
    const nextConfigs = ['next.config.js', 'next.config.mjs', 'next.config.ts']
    for (const config of nextConfigs) {
      if (existsSync(join(targetDir, config))) {
        patterns.push(
          medium(
            config,
            config,
            'Build configuration affects entire application'
          )
        )
        break
      }
    }
  }

  // Auth-related directories/files (pattern match, not content read)
  const authPatterns = [
    { dir: 'auth', pattern: 'auth/**', reason: 'Authentication logic' },
    { dir: 'lib/auth', pattern: 'lib/auth/**', reason: 'Authentication logic' },
    { dir: 'src/auth', pattern: 'src/auth/**', reason: 'Authentication logic' },
    { dir: 'src/lib/auth', pattern: 'src/lib/auth/**', reason: 'Authentication logic' },
  ]

  for (const auth of authPatterns) {
    if (existsSync(join(targetDir, auth.dir))) {
      patterns.push(
        high(auth.pattern, auth.dir, auth.reason)
      )
      break // Only add one auth pattern
    }
  }

  // Security-related files
  const securityFiles = [
    { file: 'security.ts', reason: 'Security configuration' },
    { file: 'src/security.ts', reason: 'Security configuration' },
    { file: 'lib/security.ts', reason: 'Security configuration' },
  ]

  for (const sec of securityFiles) {
    if (existsSync(join(targetDir, sec.file))) {
      patterns.push(
        high(sec.file, sec.file, sec.reason)
      )
    }
  }

  // Database schema files
  if (existsSync(join(targetDir, 'prisma', 'schema.prisma'))) {
    patterns.push(
      medium(
        'prisma/schema.prisma',
        'prisma/schema.prisma',
        'Database schema changes require careful review'
      )
    )
  }

  if (existsSync(join(targetDir, 'drizzle'))) {
    patterns.push(
      medium(
        'drizzle/schema.ts',
        'drizzle/',
        'Database schema changes require careful review'
      )
    )
  }

  // API routes (be careful with these)
  if (existsSync(join(targetDir, 'app', 'api'))) {
    patterns.push(
      medium(
        'app/api/**/route.ts',
        'app/api/',
        'API routes handle external requests'
      )
    )
  }
  if (existsSync(join(targetDir, 'src', 'app', 'api'))) {
    patterns.push(
      medium(
        'src/app/api/**/route.ts',
        'src/app/api/',
        'API routes handle external requests'
      )
    )
  }
  if (existsSync(join(targetDir, 'pages', 'api'))) {
    patterns.push(
      medium(
        'pages/api/**/*.ts',
        'pages/api/',
        'API routes handle external requests'
      )
    )
  }

  return patterns
}

/**
 * Detect all boundary patterns.
 */
export function detectBoundaries(
  targetDir: string,
  pkg: PackageJson | null
): BoundariesDetectionResult {
  return {
    never_touch: detectNeverTouch(targetDir, pkg),
    require_review: detectRequireReview(targetDir, pkg),
  }
}
