/**
 * Project Detection Orchestrator
 *
 * Runs all detectors in parallel and returns a complete DetectionResult.
 * Performance target: < 500ms for typical projects.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { detectBoundaries } from './boundaries'
import { detectCommands } from './commands'
import { detectProjectInfo } from './project'
import { detectRules } from './rules'
import { detectSandbox } from './sandbox'
import type { DetectionResult, PackageJson } from './types'

// Re-export types
export type {
  Confidence,
  DetectedValue,
  DetectionResult,
  PackageJson,
  PyProjectToml,
  TsConfig,
} from './types'

// Re-export utilities
export { high, low, medium } from './types'

// Re-export individual detectors for testing
export { detectBoundaries } from './boundaries'
export { detectCommands } from './commands'
export { detectProjectInfo } from './project'
export { detectRules } from './rules'
export { detectSandbox } from './sandbox'

/**
 * Safely read and parse package.json.
 */
export function readPackageJsonSafe(targetDir: string): PackageJson | null {
  const packagePath = join(targetDir, 'package.json')

  if (!existsSync(packagePath)) {
    return null
  }

  try {
    const content = readFileSync(packagePath, 'utf-8')
    return JSON.parse(content) as PackageJson
  } catch {
    return null
  }
}

/**
 * Detect all project information.
 *
 * Runs all detectors in parallel for maximum performance.
 * Typical execution time: < 500ms.
 *
 * @param targetDir - Directory to scan (defaults to cwd)
 * @returns Complete detection result with all findings
 */
export async function detectProject(targetDir: string = process.cwd()): Promise<DetectionResult> {
  const start = performance.now()
  const warnings: string[] = []

  // Read package.json once for all detectors
  let pkg: PackageJson | null = null
  try {
    pkg = readPackageJsonSafe(targetDir)
  } catch (error) {
    warnings.push(`Failed to read package.json: ${(error as Error).message}`)
  }

  // Run all detectors in parallel
  const [projectInfo, commands, rules, boundaries, sandbox] = await Promise.all([
    detectProjectInfo(targetDir, pkg).catch((error) => {
      warnings.push(`Project detection failed: ${(error as Error).message}`)
      return {
        name: null,
        language: null,
        framework: null,
        runtime: null,
        database: null,
      }
    }),
    Promise.resolve(detectCommands(targetDir, pkg)).catch((error) => {
      warnings.push(`Commands detection failed: ${(error as Error).message}`)
      return { build: null, lint: null, test: null, typecheck: null }
    }),
    Promise.resolve(detectRules(targetDir, pkg)).catch((error) => {
      warnings.push(`Rules detection failed: ${(error as Error).message}`)
      return []
    }),
    Promise.resolve(detectBoundaries(targetDir, pkg)).catch((error) => {
      warnings.push(`Boundaries detection failed: ${(error as Error).message}`)
      return { never_touch: [], require_review: [] }
    }),
    Promise.resolve(detectSandbox(targetDir)).catch((error) => {
      warnings.push(`Sandbox detection failed: ${(error as Error).message}`)
      return { allowed_env: [] }
    }),
  ])

  // Check for monorepo
  if (pkg?.workspaces) {
    const workspaceDef = pkg.workspaces
    const hasWorkspaces = Array.isArray(workspaceDef)
      ? workspaceDef.length > 0
      : Array.isArray(workspaceDef.packages) && workspaceDef.packages.length > 0

    if (hasWorkspaces) {
      warnings.push('Monorepo detected. Consider running karimo init in individual packages.')
    }
  }

  const scanDurationMs = Math.round(performance.now() - start)

  return {
    ...projectInfo,
    commands,
    rules,
    boundaries,
    sandbox,
    scanDurationMs,
    warnings,
  }
}

/**
 * Check if detection found enough information to proceed.
 */
export function hasMinimalDetection(result: DetectionResult): boolean {
  // At minimum, we need a name or language
  return result.name !== null || result.language !== null
}

/**
 * Get a summary of what was detected.
 */
export function getDetectionSummary(result: DetectionResult): string {
  const parts: string[] = []

  if (result.name) {
    parts.push(`Project: ${result.name.value}`)
  }
  if (result.language) {
    parts.push(`Language: ${result.language.value}`)
  }
  if (result.framework) {
    parts.push(`Framework: ${result.framework.value}`)
  }
  if (result.runtime) {
    parts.push(`Runtime: ${result.runtime.value}`)
  }
  if (result.database) {
    parts.push(`Database: ${result.database.value}`)
  }

  const commandCount = [
    result.commands.build,
    result.commands.lint,
    result.commands.test,
    result.commands.typecheck,
  ].filter(Boolean).length

  parts.push(`Commands: ${commandCount}/4 detected`)
  parts.push(`Rules: ${result.rules.length} inferred`)
  parts.push(
    `Boundaries: ${result.boundaries.never_touch.length + result.boundaries.require_review.length} patterns`
  )
  parts.push(`Env vars: ${result.sandbox.allowed_env.length} allowed`)
  parts.push(`Scan time: ${result.scanDurationMs}ms`)

  return parts.join('\n')
}
