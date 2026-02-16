/**
 * Commands Detection
 *
 * Detects build/lint/test/typecheck commands from:
 * - package.json scripts
 * - Config files (biome.json, eslint config, tsconfig)
 * - Runtime conventions
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectedValue, PackageJson } from './types'
import { high, medium } from './types'

/**
 * Result of command detection.
 */
export interface CommandsDetectionResult {
  build: DetectedValue<string> | null
  lint: DetectedValue<string> | null
  test: DetectedValue<string> | null
  typecheck: DetectedValue<string> | null
}

/**
 * Detected runtime for command prefix inference.
 */
type Runtime = 'bun' | 'node' | 'deno' | 'pnpm' | 'yarn' | 'npm'

/**
 * Detect the package manager/runtime for command prefixes.
 */
function detectPackageManager(
  targetDir: string,
  pkg: PackageJson | null
): Runtime {
  // Check lockfiles first
  if (
    existsSync(join(targetDir, 'bun.lockb')) ||
    existsSync(join(targetDir, 'bun.lock'))
  ) {
    return 'bun'
  }

  if (existsSync(join(targetDir, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }

  if (existsSync(join(targetDir, 'yarn.lock'))) {
    return 'yarn'
  }

  if (
    existsSync(join(targetDir, 'deno.json')) ||
    existsSync(join(targetDir, 'deno.jsonc'))
  ) {
    return 'deno'
  }

  // Check packageManager field
  if (pkg?.packageManager) {
    const pm = pkg.packageManager.toLowerCase()
    if (pm.startsWith('bun')) return 'bun'
    if (pm.startsWith('pnpm')) return 'pnpm'
    if (pm.startsWith('yarn')) return 'yarn'
  }

  // Check engines
  if (pkg?.engines?.['bun']) return 'bun'

  // Default to npm
  return 'npm'
}

/**
 * Get the run prefix for a package manager.
 */
function getRunPrefix(pm: Runtime): string {
  switch (pm) {
    case 'bun':
      return 'bun run'
    case 'pnpm':
      return 'pnpm run'
    case 'yarn':
      return 'yarn'
    case 'deno':
      return 'deno task'
    case 'npm':
    default:
      return 'npm run'
  }
}

/**
 * Get the test command for a package manager.
 */
function getTestCommand(pm: Runtime): string {
  switch (pm) {
    case 'bun':
      return 'bun test'
    case 'deno':
      return 'deno test'
    case 'pnpm':
      return 'pnpm test'
    case 'yarn':
      return 'yarn test'
    case 'npm':
    default:
      return 'npm test'
  }
}

/**
 * Detect build command.
 */
function detectBuildCommand(
  targetDir: string,
  pkg: PackageJson | null,
  pm: Runtime
): DetectedValue<string> | null {
  const scripts = pkg?.scripts ?? {}
  const prefix = getRunPrefix(pm)

  // High confidence: exact script name
  if (scripts['build']) {
    return high(`${prefix} build`, 'package.json scripts.build')
  }

  // Medium confidence: Next.js build
  if (existsSync(join(targetDir, 'next.config.js')) ||
      existsSync(join(targetDir, 'next.config.mjs')) ||
      existsSync(join(targetDir, 'next.config.ts'))) {
    return medium(
      pm === 'bun' ? 'bun run next build' : 'npx next build',
      'next.config.*',
      'Next.js project detected'
    )
  }

  // Medium confidence: TypeScript project (tsc)
  if (existsSync(join(targetDir, 'tsconfig.json'))) {
    return medium(`${prefix === 'bun run' ? 'bun' : prefix} tsc`, 'tsconfig.json', 'TypeScript project')
  }

  return null
}

/**
 * Detect lint command.
 */
function detectLintCommand(
  targetDir: string,
  pkg: PackageJson | null,
  pm: Runtime
): DetectedValue<string> | null {
  const scripts = pkg?.scripts ?? {}
  const prefix = getRunPrefix(pm)

  // High confidence: exact script name
  if (scripts['lint']) {
    return high(`${prefix} lint`, 'package.json scripts.lint')
  }

  // Medium confidence: Biome config exists
  if (existsSync(join(targetDir, 'biome.json')) ||
      existsSync(join(targetDir, 'biome.jsonc'))) {
    const biomeCmd = pm === 'bun'
      ? 'bunx @biomejs/biome check .'
      : 'npx @biomejs/biome check .'
    return medium(biomeCmd, 'biome.json', 'Biome config found')
  }

  // Medium confidence: ESLint config exists
  const eslintConfigs = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
  ]
  for (const config of eslintConfigs) {
    if (existsSync(join(targetDir, config))) {
      const eslintCmd = pm === 'bun' ? 'bunx eslint .' : 'npx eslint .'
      return medium(eslintCmd, config, 'ESLint config found')
    }
  }

  // Medium confidence: Deno
  if (pm === 'deno') {
    return medium('deno lint', 'deno runtime', 'Deno built-in linter')
  }

  return null
}

/**
 * Detect test command.
 */
function detectTestCommand(
  targetDir: string,
  pkg: PackageJson | null,
  pm: Runtime
): DetectedValue<string> | null {
  const scripts = pkg?.scripts ?? {}
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies }

  // High confidence: exact script name
  if (scripts['test'] && scripts['test'] !== 'echo "Error: no test specified" && exit 1') {
    return high(getTestCommand(pm), 'package.json scripts.test')
  }

  // High confidence: Vitest in dependencies
  if (deps['vitest']) {
    const vitestCmd = pm === 'bun' ? 'bunx vitest run' : 'npx vitest run'
    return high(vitestCmd, 'package.json', 'Vitest in dependencies')
  }

  // High confidence: Jest in dependencies
  if (deps['jest']) {
    const jestCmd = pm === 'bun' ? 'bunx jest' : 'npx jest'
    return high(jestCmd, 'package.json', 'Jest in dependencies')
  }

  // High confidence: Bun runtime (built-in test runner)
  if (pm === 'bun') {
    // Check if there are any test files
    const testPatterns = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.test.js']
    for (const pattern of testPatterns) {
      try {
        const glob = new Bun.Glob(pattern)
        for (const _file of glob.scanSync({
          cwd: targetDir,
          onlyFiles: true,
          absolute: false,
        })) {
          return medium('bun test', 'test files', 'Test files found, Bun runtime')
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Medium confidence: Deno
  if (pm === 'deno') {
    return medium('deno test', 'deno runtime', 'Deno built-in test runner')
  }

  return null
}

/**
 * Detect typecheck command.
 */
function detectTypecheckCommand(
  targetDir: string,
  pkg: PackageJson | null,
  pm: Runtime
): DetectedValue<string> | null {
  const scripts = pkg?.scripts ?? {}
  const prefix = getRunPrefix(pm)

  // High confidence: exact script name
  if (scripts['typecheck']) {
    return high(`${prefix} typecheck`, 'package.json scripts.typecheck')
  }

  // High confidence: type-check script name (hyphenated variant)
  if (scripts['type-check']) {
    return high(`${prefix} type-check`, 'package.json scripts.type-check')
  }

  // Medium confidence: tsconfig.json exists
  if (existsSync(join(targetDir, 'tsconfig.json'))) {
    const tscCmd = pm === 'bun'
      ? 'bunx tsc --noEmit'
      : 'npx tsc --noEmit'
    return medium(tscCmd, 'tsconfig.json', 'TypeScript project')
  }

  // Medium confidence: Deno
  if (pm === 'deno') {
    return medium('deno check .', 'deno runtime', 'Deno type checker')
  }

  return null
}

/**
 * Detect all commands.
 */
export function detectCommands(
  targetDir: string,
  pkg: PackageJson | null
): CommandsDetectionResult {
  const pm = detectPackageManager(targetDir, pkg)

  return {
    build: detectBuildCommand(targetDir, pkg, pm),
    lint: detectLintCommand(targetDir, pkg, pm),
    test: detectTestCommand(targetDir, pkg, pm),
    typecheck: detectTypecheckCommand(targetDir, pkg, pm),
  }
}
