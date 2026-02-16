/**
 * Detection Module Tests
 *
 * Tests for the auto-detection system covering:
 * - Project detection (name, language, framework, runtime, database)
 * - Commands detection (build, lint, test, typecheck)
 * - Rules detection (tsconfig, dependencies, config files)
 * - Boundaries detection (never_touch, require_review)
 * - Sandbox detection (allowed_env from example files)
 * - Orchestrator (performance, error handling)
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  type PackageJson,
  detectBoundaries,
  detectCommands,
  detectProject,
  detectProjectInfo,
  detectRules,
  detectSandbox,
  getDetectionSummary,
  hasMinimalDetection,
  readPackageJsonSafe,
} from '../detect'

// Test directory setup
let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `karimo-detect-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  try {
    rmSync(testDir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
})

// Helper to write package.json
function writePackageJson(pkg: PackageJson): void {
  writeFileSync(join(testDir, 'package.json'), JSON.stringify(pkg, null, 2))
}

// Helper to write a file
function writeFile(relativePath: string, content: string): void {
  const fullPath = join(testDir, relativePath)
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
  mkdirSync(dir, { recursive: true })
  writeFileSync(fullPath, content)
}

// =============================================================================
// readPackageJsonSafe Tests
// =============================================================================

describe('readPackageJsonSafe', () => {
  it('returns null when package.json does not exist', () => {
    const result = readPackageJsonSafe(testDir)
    expect(result).toBeNull()
  })

  it('returns parsed package.json when it exists', () => {
    writePackageJson({ name: 'test-project', version: '1.0.0' })
    const result = readPackageJsonSafe(testDir)
    expect(result).toEqual({ name: 'test-project', version: '1.0.0' })
  })

  it('returns null for invalid JSON', () => {
    writeFile('package.json', 'not valid json')
    const result = readPackageJsonSafe(testDir)
    expect(result).toBeNull()
  })
})

// =============================================================================
// Project Detection Tests
// =============================================================================

describe('detectProjectInfo', () => {
  it('detects name from package.json with high confidence', async () => {
    writePackageJson({ name: 'my-awesome-project' })
    const pkg = readPackageJsonSafe(testDir)
    const result = await detectProjectInfo(testDir, pkg)

    expect(result.name).not.toBeNull()
    expect(result.name?.value).toBe('my-awesome-project')
    expect(result.name?.confidence).toBe('high')
    expect(result.name?.source).toBe('package.json')
  })

  it('detects TypeScript from tsconfig.json with high confidence', async () => {
    writeFile('tsconfig.json', '{}')
    const result = await detectProjectInfo(testDir, null)

    expect(result.language).not.toBeNull()
    expect(result.language?.value).toBe('typescript')
    expect(result.language?.confidence).toBe('high')
    expect(result.language?.source).toBe('tsconfig.json')
  })

  it('detects TypeScript from devDependencies', async () => {
    writePackageJson({
      name: 'test',
      devDependencies: { typescript: '^5.0.0' },
    })
    const pkg = readPackageJsonSafe(testDir)
    const result = await detectProjectInfo(testDir, pkg)

    expect(result.language?.value).toBe('typescript')
    expect(result.language?.confidence).toBe('high')
  })

  it('detects Python from pyproject.toml', async () => {
    writeFile('pyproject.toml', '[project]\nname = "test"')
    const result = await detectProjectInfo(testDir, null)

    expect(result.language?.value).toBe('python')
    expect(result.language?.confidence).toBe('high')
  })

  it('detects Go from go.mod', async () => {
    writeFile('go.mod', 'module example.com/test')
    const result = await detectProjectInfo(testDir, null)

    expect(result.language?.value).toBe('go')
    expect(result.language?.confidence).toBe('high')
  })

  it('detects Rust from Cargo.toml', async () => {
    writeFile('Cargo.toml', '[package]\nname = "test"')
    const result = await detectProjectInfo(testDir, null)

    expect(result.language?.value).toBe('rust')
    expect(result.language?.confidence).toBe('high')
  })

  it('detects Next.js framework with high confidence', async () => {
    writePackageJson({ name: 'test', dependencies: { next: '^14.0.0' } })
    const pkg = readPackageJsonSafe(testDir)
    const result = await detectProjectInfo(testDir, pkg)

    expect(result.framework?.value).toBe('next.js')
    expect(result.framework?.confidence).toBe('high')
  })

  it('detects React framework with medium confidence (no Next)', async () => {
    writePackageJson({ name: 'test', dependencies: { react: '^18.0.0' } })
    const pkg = readPackageJsonSafe(testDir)
    const result = await detectProjectInfo(testDir, pkg)

    expect(result.framework?.value).toBe('react')
    expect(result.framework?.confidence).toBe('medium')
  })

  it('detects Bun runtime from lockfile', async () => {
    writeFile('bun.lockb', '')
    const result = await detectProjectInfo(testDir, null)

    expect(result.runtime?.value).toBe('bun')
    expect(result.runtime?.confidence).toBe('high')
  })

  it('detects Node runtime from yarn.lock', async () => {
    writeFile('yarn.lock', '')
    const result = await detectProjectInfo(testDir, null)

    expect(result.runtime?.value).toBe('node')
    expect(result.runtime?.confidence).toBe('high')
  })

  it('detects Supabase database from dependencies', async () => {
    writePackageJson({
      name: 'test',
      dependencies: { '@supabase/supabase-js': '^2.0.0' },
    })
    const pkg = readPackageJsonSafe(testDir)
    const result = await detectProjectInfo(testDir, pkg)

    expect(result.database?.value).toBe('supabase')
    expect(result.database?.confidence).toBe('high')
  })

  it('detects Prisma database from directory', async () => {
    mkdirSync(join(testDir, 'prisma'), { recursive: true })
    const result = await detectProjectInfo(testDir, null)

    expect(result.database?.value).toBe('prisma')
    expect(result.database?.confidence).toBe('high')
  })

  it('returns nulls for empty directory except name from dir', async () => {
    const result = await detectProjectInfo(testDir, null)

    // Name is inferred from directory name with medium confidence
    expect(result.name).not.toBeNull()
    expect(result.name?.confidence).toBe('medium')
    expect(result.name?.source).toBe('directory name')
    // Other fields should be null
    expect(result.language).toBeNull()
    expect(result.framework).toBeNull()
    expect(result.database).toBeNull()
  })
})

// =============================================================================
// Commands Detection Tests
// =============================================================================

describe('detectCommands', () => {
  it('detects build command from scripts with high confidence', () => {
    writePackageJson({ name: 'test', scripts: { build: 'tsc' } })
    writeFile('bun.lockb', '')
    const pkg = readPackageJsonSafe(testDir)
    const result = detectCommands(testDir, pkg)

    expect(result.build).not.toBeNull()
    expect(result.build?.value).toBe('bun run build')
    expect(result.build?.confidence).toBe('high')
  })

  it('detects lint command from Biome config', () => {
    writeFile('biome.json', '{}')
    writeFile('bun.lockb', '')
    const result = detectCommands(testDir, null)

    expect(result.lint).not.toBeNull()
    expect(result.lint?.value).toBe('bunx @biomejs/biome check .')
    expect(result.lint?.confidence).toBe('medium')
  })

  it('detects test command from Vitest dependency', () => {
    writePackageJson({
      name: 'test',
      devDependencies: { vitest: '^1.0.0' },
    })
    writeFile('bun.lockb', '')
    const pkg = readPackageJsonSafe(testDir)
    const result = detectCommands(testDir, pkg)

    expect(result.test?.value).toBe('bunx vitest run')
    expect(result.test?.confidence).toBe('high')
  })

  it('detects typecheck command from tsconfig', () => {
    writeFile('tsconfig.json', '{}')
    writeFile('bun.lockb', '')
    const result = detectCommands(testDir, null)

    expect(result.typecheck).not.toBeNull()
    expect(result.typecheck?.value).toBe('bunx tsc --noEmit')
    expect(result.typecheck?.confidence).toBe('medium')
  })

  it('uses npm prefix for Node projects', () => {
    writePackageJson({ name: 'test', scripts: { build: 'tsc' } })
    writeFile('package-lock.json', '{}')
    const pkg = readPackageJsonSafe(testDir)
    const result = detectCommands(testDir, pkg)

    expect(result.build?.value).toBe('npm run build')
  })

  it('uses pnpm prefix for pnpm projects', () => {
    writePackageJson({ name: 'test', scripts: { lint: 'eslint .' } })
    writeFile('pnpm-lock.yaml', '')
    const pkg = readPackageJsonSafe(testDir)
    const result = detectCommands(testDir, pkg)

    expect(result.lint?.value).toBe('pnpm run lint')
  })
})

// =============================================================================
// Rules Detection Tests
// =============================================================================

describe('detectRules', () => {
  it('detects strict mode rule from tsconfig', () => {
    writeFile('tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } }))
    const result = detectRules(testDir, null)

    expect(result.length).toBeGreaterThan(0)
    const strictRule = result.find((r) => r.value.toLowerCase().includes('strict'))
    expect(strictRule).toBeDefined()
    expect(strictRule?.confidence).toBe('high')
  })

  it('detects Zod validation rule from dependencies', () => {
    writePackageJson({ name: 'test', dependencies: { zod: '^3.0.0' } })
    const pkg = readPackageJsonSafe(testDir)
    const result = detectRules(testDir, pkg)

    const zodRule = result.find((r) => r.value.toLowerCase().includes('zod'))
    expect(zodRule).toBeDefined()
    expect(zodRule?.confidence).toBe('medium')
  })

  it('detects Biome linting rule', () => {
    writeFile('biome.json', '{}')
    const result = detectRules(testDir, null)

    const biomeRule = result.find((r) => r.value.toLowerCase().includes('biome'))
    expect(biomeRule).toBeDefined()
    expect(biomeRule?.confidence).toBe('high')
  })

  it('detects migrations rule from supabase/migrations', () => {
    mkdirSync(join(testDir, 'supabase', 'migrations'), { recursive: true })
    const result = detectRules(testDir, null)

    const migrationRule = result.find((r) => r.value.toLowerCase().includes('migration'))
    expect(migrationRule).toBeDefined()
    expect(migrationRule?.confidence).toBe('high')
  })

  it('caps rules at 10', () => {
    // Create many config files to trigger many rules
    writeFile('tsconfig.json', JSON.stringify({ compilerOptions: { strict: true } }))
    writeFile('biome.json', '{}')
    writePackageJson({
      name: 'test',
      dependencies: {
        next: '^14.0.0',
        zod: '^3.0.0',
        tailwindcss: '^3.0.0',
        '@tanstack/react-query': '^5.0.0',
      },
      devDependencies: {
        vitest: '^1.0.0',
        prettier: '^3.0.0',
      },
    })
    mkdirSync(join(testDir, 'supabase', 'migrations'), { recursive: true })
    mkdirSync(join(testDir, '.github', 'workflows'), { recursive: true })
    mkdirSync(join(testDir, 'app'), { recursive: true })
    writeFile('middleware.ts', '')

    const pkg = readPackageJsonSafe(testDir)
    const result = detectRules(testDir, pkg)

    expect(result.length).toBeLessThanOrEqual(10)
  })
})

// =============================================================================
// Boundaries Detection Tests
// =============================================================================

describe('detectBoundaries', () => {
  it('always includes hardcoded never_touch patterns', () => {
    const result = detectBoundaries(testDir, null)

    const patterns = result.never_touch.map((b) => b.value)
    expect(patterns).toContain('*.lock')
    expect(patterns).toContain('.env')
    expect(patterns).toContain('.karimo/config.yaml')
  })

  it('detects supabase migrations in never_touch', () => {
    mkdirSync(join(testDir, 'supabase', 'migrations'), { recursive: true })
    const result = detectBoundaries(testDir, null)

    const migrationPattern = result.never_touch.find((b) => b.value.includes('supabase/migrations'))
    expect(migrationPattern).toBeDefined()
    expect(migrationPattern?.confidence).toBe('high')
  })

  it('detects middleware.ts in require_review', () => {
    writeFile('middleware.ts', 'export function middleware() {}')
    writePackageJson({ name: 'test', dependencies: { next: '^14.0.0' } })
    const pkg = readPackageJsonSafe(testDir)
    const result = detectBoundaries(testDir, pkg)

    const middlewarePattern = result.require_review.find((b) => b.value.includes('middleware.ts'))
    expect(middlewarePattern).toBeDefined()
    expect(middlewarePattern?.confidence).toBe('high')
  })

  it('detects app/layout.tsx in require_review', () => {
    mkdirSync(join(testDir, 'app'), { recursive: true })
    writeFile('app/layout.tsx', 'export default function Layout() {}')
    writePackageJson({ name: 'test', dependencies: { next: '^14.0.0' } })
    const pkg = readPackageJsonSafe(testDir)
    const result = detectBoundaries(testDir, pkg)

    const layoutPattern = result.require_review.find((b) => b.value.includes('app/layout.tsx'))
    expect(layoutPattern).toBeDefined()
  })

  it('detects GitHub workflows in never_touch', () => {
    mkdirSync(join(testDir, '.github', 'workflows'), { recursive: true })
    writeFile('.github/workflows/ci.yml', 'name: CI')
    const result = detectBoundaries(testDir, null)

    const workflowPattern = result.never_touch.find((b) => b.value.includes('.github/workflows'))
    expect(workflowPattern).toBeDefined()
  })
})

// =============================================================================
// Sandbox Detection Tests
// =============================================================================

describe('detectSandbox', () => {
  it('always includes system variables', () => {
    const result = detectSandbox(testDir)

    const vars = result.allowed_env.map((v) => v.value)
    expect(vars).toContain('PATH')
    expect(vars).toContain('HOME')
    expect(vars).toContain('NODE_ENV')
  })

  it('includes NEXT_PUBLIC_* vars from .env.example', () => {
    writeFile('.env.example', 'NEXT_PUBLIC_URL=https://example.com')
    const result = detectSandbox(testDir)

    const nextPublicVar = result.allowed_env.find((v) => v.value.includes('NEXT_PUBLIC'))
    expect(nextPublicVar).toBeDefined()
  })

  it('excludes SECRET vars from .env.example', () => {
    writeFile('.env.example', 'NEXT_PUBLIC_URL=https://example.com\nDB_SECRET_KEY=xxx')
    const result = detectSandbox(testDir)

    const secretVar = result.allowed_env.find((v) => v.value.includes('DB_SECRET_KEY'))
    expect(secretVar).toBeUndefined()
  })

  it('excludes TOKEN vars from .env.example', () => {
    writeFile('.env.example', 'PUBLIC_URL=https://example.com\nAPI_TOKEN=xxx')
    const result = detectSandbox(testDir)

    const tokenVar = result.allowed_env.find((v) => v.value.includes('API_TOKEN'))
    expect(tokenVar).toBeUndefined()
  })

  it('includes PUBLIC vars from .env.example', () => {
    writeFile('.env.example', 'PUBLIC_URL=https://example.com')
    const result = detectSandbox(testDir)

    const publicVar = result.allowed_env.find((v) => v.value.includes('PUBLIC_URL'))
    expect(publicVar).toBeDefined()
  })
})

// =============================================================================
// Orchestrator Tests
// =============================================================================

describe('detectProject', () => {
  it('completes scan in under 500ms', async () => {
    writePackageJson({
      name: 'test-project',
      dependencies: { next: '^14.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    })
    writeFile('tsconfig.json', '{}')
    writeFile('bun.lockb', '')

    const result = await detectProject(testDir)

    expect(result.scanDurationMs).toBeLessThan(500)
  })

  it('returns complete detection result', async () => {
    writePackageJson({
      name: 'test-project',
      dependencies: { next: '^14.0.0', '@supabase/supabase-js': '^2.0.0' },
      devDependencies: { typescript: '^5.0.0' },
      scripts: { build: 'next build', lint: 'eslint .', test: 'jest' },
    })
    writeFile('tsconfig.json', '{}')
    writeFile('bun.lockb', '')

    const result = await detectProject(testDir)

    expect(result.name?.value).toBe('test-project')
    expect(result.language?.value).toBe('typescript')
    expect(result.framework?.value).toBe('next.js')
    expect(result.runtime?.value).toBe('bun')
    expect(result.database?.value).toBe('supabase')
    expect(result.commands.build).not.toBeNull()
    expect(result.warnings).toBeInstanceOf(Array)
  })

  it('handles empty directory gracefully', async () => {
    const result = await detectProject(testDir)

    // Name is inferred from directory name with medium confidence
    expect(result.name).not.toBeNull()
    expect(result.name?.confidence).toBe('medium')
    // Other fields should be null
    expect(result.language).toBeNull()
    expect(result.framework).toBeNull()
    expect(result.warnings).toBeInstanceOf(Array)
  })

  it('detects monorepo and adds warning', async () => {
    writePackageJson({
      name: 'monorepo',
      workspaces: ['packages/*'],
    })

    const result = await detectProject(testDir)

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.toLowerCase().includes('monorepo'))).toBe(true)
  })
})

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('hasMinimalDetection', () => {
  it('returns true when name is detected', async () => {
    writePackageJson({ name: 'test' })
    const result = await detectProject(testDir)
    expect(hasMinimalDetection(result)).toBe(true)
  })

  it('returns true when language is detected', async () => {
    writeFile('tsconfig.json', '{}')
    const result = await detectProject(testDir)
    expect(hasMinimalDetection(result)).toBe(true)
  })

  it('returns true when only name is detected from directory', async () => {
    // Even for empty directories, name is inferred from directory name
    const result = await detectProject(testDir)
    // Since name is detected, hasMinimalDetection returns true
    expect(hasMinimalDetection(result)).toBe(true)
  })
})

describe('getDetectionSummary', () => {
  it('returns formatted summary string', async () => {
    writePackageJson({
      name: 'test-project',
      dependencies: { next: '^14.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    })
    writeFile('tsconfig.json', '{}')
    writeFile('bun.lockb', '')

    const result = await detectProject(testDir)
    const summary = getDetectionSummary(result)

    expect(summary).toContain('Project: test-project')
    expect(summary).toContain('Language: typescript')
    expect(summary).toContain('Framework: next.js')
    expect(summary).toContain('Runtime: bun')
    expect(summary).toContain('Commands:')
    expect(summary).toContain('Rules:')
    expect(summary).toContain('Scan time:')
  })
})
