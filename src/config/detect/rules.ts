/**
 * Rules Detection
 *
 * Infers coding rules from project configuration files:
 * - tsconfig.json: strict mode, no any, etc.
 * - Dependencies: Zod validation, Tailwind CSS, etc.
 * - Config files: Biome, ESLint settings
 * - Directory structure: migrations, tests, etc.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectedValue, PackageJson, TsConfig } from './types'
import { high, medium } from './types'

/** Maximum number of rules to detect */
const MAX_RULES = 10

/**
 * Safely parse JSON file.
 */
function parseJsonFile<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) return null
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

/**
 * Detect rules from tsconfig.json.
 */
function detectTsConfigRules(targetDir: string): DetectedValue<string>[] {
  const rules: DetectedValue<string>[] = []
  const tsconfig = parseJsonFile<TsConfig>(join(targetDir, 'tsconfig.json'))

  if (!tsconfig?.compilerOptions) return rules

  const opts = tsconfig.compilerOptions

  // Strict mode
  if (opts.strict === true) {
    rules.push(
      high(
        'TypeScript strict mode — no `any` types, explicit null checks',
        'tsconfig.json',
        'compilerOptions.strict: true'
      )
    )
  } else {
    // Individual strict options
    if (opts.noImplicitAny === true) {
      rules.push(
        high('No implicit `any` types', 'tsconfig.json', 'compilerOptions.noImplicitAny: true')
      )
    }
    if (opts.strictNullChecks === true) {
      rules.push(
        high(
          'Explicit null/undefined handling required',
          'tsconfig.json',
          'compilerOptions.strictNullChecks: true'
        )
      )
    }
  }

  return rules
}

/**
 * Detect rules from dependencies.
 */
function detectDependencyRules(pkg: PackageJson | null): DetectedValue<string>[] {
  const rules: DetectedValue<string>[] = []
  if (!pkg) return rules

  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  // Zod validation
  if (deps['zod']) {
    rules.push(
      medium(
        'Use Zod validation for API inputs and external data',
        'package.json',
        'Zod in dependencies'
      )
    )
  }

  // Tailwind CSS
  if (deps['tailwindcss']) {
    rules.push(
      medium(
        'Use Tailwind utility classes for styling',
        'package.json',
        'Tailwind CSS in dependencies'
      )
    )
  }

  // Testing libraries
  if (deps['vitest'] || deps['jest'] || deps['@testing-library/react']) {
    rules.push(
      medium('Write tests for new functionality', 'package.json', 'Testing library in dependencies')
    )
  }

  // React Query / TanStack Query
  if (deps['@tanstack/react-query'] || deps['react-query']) {
    rules.push(
      medium(
        'Use React Query for server state management',
        'package.json',
        'React Query in dependencies'
      )
    )
  }

  // Prettier
  if (deps['prettier']) {
    rules.push(
      medium(
        'Format code with Prettier before committing',
        'package.json',
        'Prettier in dependencies'
      )
    )
  }

  return rules
}

/**
 * Detect rules from config files.
 */
function detectConfigRules(targetDir: string): DetectedValue<string>[] {
  const rules: DetectedValue<string>[] = []

  // Biome
  if (existsSync(join(targetDir, 'biome.json')) || existsSync(join(targetDir, 'biome.jsonc'))) {
    rules.push(
      high('Follow Biome linting and formatting rules', 'biome.json', 'Biome config found')
    )
  }

  // ESLint (only if Biome not present)
  const eslintConfigs = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    'eslint.config.js',
    'eslint.config.mjs',
  ]
  if (!existsSync(join(targetDir, 'biome.json'))) {
    for (const config of eslintConfigs) {
      if (existsSync(join(targetDir, config))) {
        rules.push(high('Follow ESLint rules', config, 'ESLint config found'))
        break
      }
    }
  }

  return rules
}

/**
 * Detect rules from directory structure.
 */
function detectStructureRules(targetDir: string): DetectedValue<string>[] {
  const rules: DetectedValue<string>[] = []

  // Supabase migrations
  if (existsSync(join(targetDir, 'supabase', 'migrations'))) {
    rules.push(
      high(
        'Database migrations are append-only — never modify existing migrations',
        'supabase/migrations/',
        'Supabase migrations directory found'
      )
    )
  }

  // Prisma migrations
  if (existsSync(join(targetDir, 'prisma', 'migrations'))) {
    rules.push(
      high(
        'Prisma migrations are append-only — never modify existing migrations',
        'prisma/migrations/',
        'Prisma migrations directory found'
      )
    )
  }

  // GitHub Actions
  if (existsSync(join(targetDir, '.github', 'workflows'))) {
    rules.push(
      medium(
        'Ensure CI passes before merging — check GitHub Actions',
        '.github/workflows/',
        'GitHub Actions found'
      )
    )
  }

  return rules
}

/**
 * Detect rules from Next.js conventions.
 */
function detectNextJsRules(targetDir: string, pkg: PackageJson | null): DetectedValue<string>[] {
  const rules: DetectedValue<string>[] = []
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies }

  if (!deps['next']) return rules

  // App Router
  if (existsSync(join(targetDir, 'app'))) {
    rules.push(
      medium(
        'Use Next.js App Router conventions — server components by default',
        'app/',
        'Next.js App Router detected'
      )
    )
  }

  // Middleware
  if (
    existsSync(join(targetDir, 'middleware.ts')) ||
    existsSync(join(targetDir, 'src', 'middleware.ts'))
  ) {
    rules.push(
      medium(
        'Route protection via middleware — ensure auth checks are complete',
        'middleware.ts',
        'Next.js middleware found'
      )
    )
  }

  return rules
}

/**
 * Detect all coding rules.
 * Capped at MAX_RULES to avoid overwhelming the user.
 */
export function detectRules(targetDir: string, pkg: PackageJson | null): DetectedValue<string>[] {
  const allRules: DetectedValue<string>[] = []

  // Gather rules from all sources
  allRules.push(...detectTsConfigRules(targetDir))
  allRules.push(...detectDependencyRules(pkg))
  allRules.push(...detectConfigRules(targetDir))
  allRules.push(...detectStructureRules(targetDir))
  allRules.push(...detectNextJsRules(targetDir, pkg))

  // Sort by confidence (high first) and cap at MAX_RULES
  const sorted = allRules.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.confidence] - order[b.confidence]
  })

  return sorted.slice(0, MAX_RULES)
}
