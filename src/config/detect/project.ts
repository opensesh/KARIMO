/**
 * Project Detection
 *
 * Detects project metadata from filesystem signals:
 * - name: from package.json or directory name
 * - language: from config files and source files
 * - framework: from dependencies
 * - runtime: from lockfiles and package manager fields
 * - database: from dependencies or directory structure
 */

import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { DetectedValue, PackageJson } from './types'
import { high, medium } from './types'

/**
 * Result of project info detection.
 */
export interface ProjectDetectionResult {
  name: DetectedValue<string> | null
  language: DetectedValue<string> | null
  framework: DetectedValue<string> | null
  runtime: DetectedValue<string> | null
  database: DetectedValue<string> | null
}

/**
 * Detect project name.
 */
function detectName(
  targetDir: string,
  pkg: PackageJson | null
): DetectedValue<string> | null {
  // High confidence: package.json name field
  if (pkg?.name && typeof pkg.name === 'string' && pkg.name.trim()) {
    return high(pkg.name, 'package.json', 'Name field in package.json')
  }

  // Medium confidence: directory name
  const dirName = basename(targetDir)
  if (dirName && dirName !== '.' && dirName !== '/') {
    return medium(dirName, 'directory name', 'Inferred from project directory')
  }

  return null
}

/**
 * Detect primary programming language.
 */
async function detectLanguage(
  targetDir: string,
  pkg: PackageJson | null
): Promise<DetectedValue<string> | null> {
  // High confidence: tsconfig.json exists
  if (existsSync(join(targetDir, 'tsconfig.json'))) {
    return high('typescript', 'tsconfig.json', 'TypeScript config found')
  }

  // High confidence: TypeScript in devDependencies
  if (pkg?.devDependencies?.['typescript']) {
    return high(
      'typescript',
      'package.json',
      'TypeScript in devDependencies'
    )
  }

  // High confidence: Python project files
  if (existsSync(join(targetDir, 'pyproject.toml'))) {
    return high('python', 'pyproject.toml', 'Python project config found')
  }
  if (existsSync(join(targetDir, 'setup.py'))) {
    return high('python', 'setup.py', 'Python setup file found')
  }
  if (existsSync(join(targetDir, 'requirements.txt'))) {
    return high('python', 'requirements.txt', 'Python requirements found')
  }

  // High confidence: Go module
  if (existsSync(join(targetDir, 'go.mod'))) {
    return high('go', 'go.mod', 'Go module file found')
  }

  // High confidence: Rust project
  if (existsSync(join(targetDir, 'Cargo.toml'))) {
    return high('rust', 'Cargo.toml', 'Rust manifest found')
  }

  // Medium confidence: package.json exists (could be JS or TS)
  if (pkg) {
    // Check for .ts/.tsx files in src/
    const srcDir = join(targetDir, 'src')
    if (existsSync(srcDir)) {
      try {
        const glob = new Bun.Glob('**/*.{ts,tsx}')
        for await (const _file of glob.scan({ cwd: srcDir, onlyFiles: true })) {
          return high(
            'typescript',
            'src/**/*.ts',
            'TypeScript files found in src/'
          )
        }
      } catch {
        // Glob failed, continue
      }
    }

    // Default to JavaScript if package.json exists
    return medium(
      'javascript',
      'package.json',
      'Node.js project without TypeScript'
    )
  }

  return null
}

/**
 * Detect framework from dependencies.
 */
function detectFramework(pkg: PackageJson | null): DetectedValue<string> | null {
  if (!pkg) return null

  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  // Next.js - high confidence
  if (deps['next']) {
    return high('next.js', 'package.json', 'Next.js in dependencies')
  }

  // Nuxt - high confidence
  if (deps['nuxt']) {
    return high('nuxt', 'package.json', 'Nuxt in dependencies')
  }

  // Remix - high confidence
  if (deps['@remix-run/react'] || deps['@remix-run/node']) {
    return high('remix', 'package.json', 'Remix in dependencies')
  }

  // Astro - high confidence
  if (deps['astro']) {
    return high('astro', 'package.json', 'Astro in dependencies')
  }

  // SvelteKit - high confidence
  if (deps['@sveltejs/kit']) {
    return high('sveltekit', 'package.json', 'SvelteKit in dependencies')
  }

  // Svelte (without Kit) - high confidence
  if (deps['svelte'] && !deps['@sveltejs/kit']) {
    return high('svelte', 'package.json', 'Svelte in dependencies')
  }

  // Vue.js - high confidence
  if (deps['vue']) {
    return high('vue', 'package.json', 'Vue in dependencies')
  }

  // Express - high confidence
  if (deps['express']) {
    return high('express', 'package.json', 'Express in dependencies')
  }

  // Fastify - high confidence
  if (deps['fastify']) {
    return high('fastify', 'package.json', 'Fastify in dependencies')
  }

  // Hono - high confidence
  if (deps['hono']) {
    return high('hono', 'package.json', 'Hono in dependencies')
  }

  // Elysia - high confidence
  if (deps['elysia']) {
    return high('elysia', 'package.json', 'Elysia in dependencies')
  }

  // React (without Next/Remix) - medium confidence (could be CRA, Vite, etc.)
  if (deps['react'] && !deps['next'] && !deps['@remix-run/react']) {
    return medium('react', 'package.json', 'React in dependencies')
  }

  return null
}

/**
 * Detect runtime from lockfiles and package.json fields.
 */
function detectRuntime(
  targetDir: string,
  pkg: PackageJson | null
): DetectedValue<string> | null {
  // High confidence: bun.lockb exists
  if (existsSync(join(targetDir, 'bun.lockb'))) {
    return high('bun', 'bun.lockb', 'Bun lockfile found')
  }

  // High confidence: bun.lock exists (newer format)
  if (existsSync(join(targetDir, 'bun.lock'))) {
    return high('bun', 'bun.lock', 'Bun lockfile found')
  }

  // High confidence: packageManager field
  if (pkg?.packageManager) {
    const pm = pkg.packageManager.toLowerCase()
    if (pm.startsWith('bun')) {
      return high('bun', 'package.json', 'packageManager field specifies Bun')
    }
    if (pm.startsWith('pnpm')) {
      return high('node', 'package.json', 'packageManager field specifies pnpm')
    }
    if (pm.startsWith('yarn')) {
      return high('node', 'package.json', 'packageManager field specifies Yarn')
    }
    if (pm.startsWith('npm')) {
      return high('node', 'package.json', 'packageManager field specifies npm')
    }
  }

  // High confidence: engines field
  if (pkg?.engines) {
    if (pkg.engines['bun']) {
      return high('bun', 'package.json', 'engines.bun specified')
    }
    if (pkg.engines['node']) {
      return high('node', 'package.json', 'engines.node specified')
    }
  }

  // High confidence: pnpm-lock.yaml
  if (existsSync(join(targetDir, 'pnpm-lock.yaml'))) {
    return high('node', 'pnpm-lock.yaml', 'pnpm lockfile found')
  }

  // High confidence: yarn.lock
  if (existsSync(join(targetDir, 'yarn.lock'))) {
    return high('node', 'yarn.lock', 'Yarn lockfile found')
  }

  // High confidence: package-lock.json
  if (existsSync(join(targetDir, 'package-lock.json'))) {
    return high('node', 'package-lock.json', 'npm lockfile found')
  }

  // High confidence: deno.json or deno.jsonc
  if (
    existsSync(join(targetDir, 'deno.json')) ||
    existsSync(join(targetDir, 'deno.jsonc'))
  ) {
    return high('deno', 'deno.json', 'Deno config found')
  }

  // Python projects
  if (
    existsSync(join(targetDir, 'pyproject.toml')) ||
    existsSync(join(targetDir, 'setup.py')) ||
    existsSync(join(targetDir, 'requirements.txt'))
  ) {
    return high('python', 'python files', 'Python project files found')
  }

  // Go projects
  if (existsSync(join(targetDir, 'go.mod'))) {
    return high('go', 'go.mod', 'Go module found')
  }

  // Rust projects
  if (existsSync(join(targetDir, 'Cargo.toml'))) {
    return high('cargo', 'Cargo.toml', 'Rust project found')
  }

  // Medium confidence: package.json exists, default to node
  if (pkg) {
    return medium('node', 'package.json', 'Node.js project (no lockfile)')
  }

  return null
}

/**
 * Detect database from dependencies or directory structure.
 */
function detectDatabase(
  targetDir: string,
  pkg: PackageJson | null
): DetectedValue<string> | null {
  const deps = pkg
    ? { ...pkg.dependencies, ...pkg.devDependencies }
    : {}

  // High confidence: Supabase
  if (deps['@supabase/supabase-js'] || deps['supabase']) {
    return high('supabase', 'package.json', 'Supabase client in dependencies')
  }
  if (existsSync(join(targetDir, 'supabase'))) {
    return high('supabase', 'supabase/', 'Supabase directory found')
  }

  // High confidence: Prisma
  if (deps['prisma'] || deps['@prisma/client']) {
    return high('prisma', 'package.json', 'Prisma in dependencies')
  }
  if (existsSync(join(targetDir, 'prisma'))) {
    return high('prisma', 'prisma/', 'Prisma directory found')
  }

  // High confidence: Drizzle
  if (deps['drizzle-orm'] || deps['drizzle-kit']) {
    return high('drizzle', 'package.json', 'Drizzle ORM in dependencies')
  }

  // High confidence: MongoDB
  if (deps['mongodb'] || deps['mongoose']) {
    return high('mongodb', 'package.json', 'MongoDB driver in dependencies')
  }

  // High confidence: PostgreSQL
  if (deps['pg'] || deps['postgres']) {
    return high('postgresql', 'package.json', 'PostgreSQL driver in dependencies')
  }

  // High confidence: MySQL
  if (deps['mysql'] || deps['mysql2']) {
    return high('mysql', 'package.json', 'MySQL driver in dependencies')
  }

  // High confidence: SQLite
  if (deps['better-sqlite3'] || deps['sql.js']) {
    return high('sqlite', 'package.json', 'SQLite in dependencies')
  }

  // Medium confidence: Redis
  if (deps['redis'] || deps['ioredis']) {
    return medium('redis', 'package.json', 'Redis client in dependencies')
  }

  return null
}

/**
 * Detect all project information.
 */
export async function detectProjectInfo(
  targetDir: string,
  pkg: PackageJson | null
): Promise<ProjectDetectionResult> {
  const [language] = await Promise.all([
    detectLanguage(targetDir, pkg),
  ])

  return {
    name: detectName(targetDir, pkg),
    language,
    framework: detectFramework(pkg),
    runtime: detectRuntime(targetDir, pkg),
    database: detectDatabase(targetDir, pkg),
  }
}
