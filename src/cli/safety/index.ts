/**
 * Working Directory Safety Check
 *
 * Validates that KARIMO is being run in a suitable project directory.
 * Blocks execution in dangerous locations (home, root) and non-project directories.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { MIN_SIGNAL_WEIGHT, PROJECT_SIGNALS, type ProjectSignal } from './signals'

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a safety check.
 */
export interface SafetyCheckResult {
  safe: boolean
  reason?: SafetyBlockReason
  details?: string
  signalWeight?: number
  detectedSignals?: ProjectSignal[]
}

/**
 * Reasons why a directory might be blocked.
 */
export type SafetyBlockReason =
  | 'home_directory'
  | 'root_directory'
  | 'karimo_repo'
  | 'insufficient_signals'

// =============================================================================
// Self-Detection
// =============================================================================

/**
 * Check if the given directory is the KARIMO repository itself.
 */
function isKarimoRepo(projectRoot: string): boolean {
  const packageJsonPath = join(projectRoot, 'package.json')

  if (!existsSync(packageJsonPath)) {
    return false
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

    // Check package.json name
    if (packageJson.name !== 'karimo') {
      return false
    }

    // Verify KARIMO-specific files exist
    const karimoFiles = ['bin/karimo.ts', 'src/cli/main.ts']
    return karimoFiles.every((file) => existsSync(join(projectRoot, file)))
  } catch {
    return false
  }
}

// =============================================================================
// Signal Detection
// =============================================================================

/**
 * Detect project signals in the given directory.
 */
function detectProjectSignals(projectRoot: string): {
  signals: ProjectSignal[]
  totalWeight: number
} {
  const detected: ProjectSignal[] = []
  let totalWeight = 0

  for (const signal of PROJECT_SIGNALS) {
    const filePath = join(projectRoot, signal.file)
    if (existsSync(filePath)) {
      detected.push(signal)
      totalWeight += signal.weight
    }
  }

  return {
    signals: detected,
    totalWeight,
  }
}

// =============================================================================
// Main Check
// =============================================================================

/**
 * Check if the working directory is safe for KARIMO execution.
 *
 * Blocks execution in:
 * - Home directory (~)
 * - Root directory (/)
 * - KARIMO repository itself
 * - Directories with insufficient project signals (weight < 2)
 */
export function checkWorkingDirectory(projectRoot: string): SafetyCheckResult {
  const absolutePath = resolve(projectRoot)
  const home = homedir()

  // Block home directory
  if (absolutePath === home) {
    return {
      safe: false,
      reason: 'home_directory',
      details: 'Cannot run KARIMO in home directory',
    }
  }

  // Block root directory
  if (absolutePath === '/') {
    return {
      safe: false,
      reason: 'root_directory',
      details: 'Cannot run KARIMO in root directory',
    }
  }

  // Block KARIMO repo itself
  if (isKarimoRepo(absolutePath)) {
    return {
      safe: false,
      reason: 'karimo_repo',
      details: 'Cannot run KARIMO on the KARIMO repository itself',
    }
  }

  // Check for project signals
  const { signals, totalWeight } = detectProjectSignals(absolutePath)

  if (totalWeight < MIN_SIGNAL_WEIGHT) {
    return {
      safe: false,
      reason: 'insufficient_signals',
      details: `Directory does not appear to be a valid project (signal weight: ${totalWeight}/${MIN_SIGNAL_WEIGHT})`,
      signalWeight: totalWeight,
      detectedSignals: signals,
    }
  }

  // Directory is safe
  return {
    safe: true,
    signalWeight: totalWeight,
    detectedSignals: signals,
  }
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format a safety check failure for display.
 */
export function formatSafetyError(result: SafetyCheckResult): string {
  if (result.safe) {
    return ''
  }

  const lines: string[] = []

  switch (result.reason) {
    case 'home_directory':
      lines.push('You are in your home directory.')
      lines.push('')
      lines.push('KARIMO must be run inside a project directory.')
      lines.push('Navigate to a project folder and try again:')
      lines.push('')
      lines.push('  cd ~/path/to/your/project')
      lines.push('  karimo')
      break

    case 'root_directory':
      lines.push('You are in the root directory.')
      lines.push('')
      lines.push('KARIMO must be run inside a project directory.')
      lines.push('Navigate to a project folder and try again.')
      break

    case 'karimo_repo':
      lines.push('This is the KARIMO repository itself.')
      lines.push('')
      lines.push('KARIMO should not be used to modify its own codebase.')
      lines.push('Navigate to a different project to use KARIMO:')
      lines.push('')
      lines.push('  cd ~/path/to/your/project')
      lines.push('  karimo')
      break

    case 'insufficient_signals':
      lines.push('This directory does not appear to be a valid project.')
      lines.push('')
      lines.push('KARIMO looks for project indicators like:')
      lines.push('  - package.json, Cargo.toml, pyproject.toml, go.mod')
      lines.push('  - .git directory, Makefile')
      lines.push('  - README.md, LICENSE')
      lines.push('')
      if (result.detectedSignals && result.detectedSignals.length > 0) {
        lines.push(`Found: ${result.detectedSignals.map((s) => s.file).join(', ')}`)
        lines.push(`Signal weight: ${result.signalWeight}/${MIN_SIGNAL_WEIGHT} (minimum required)`)
      } else {
        lines.push('No project indicators found.')
      }
      lines.push('')
      lines.push('Make sure you are in a project directory with standard project files.')
      break
  }

  return lines.join('\n')
}

// Re-export types and constants
export { PROJECT_SIGNALS, MIN_SIGNAL_WEIGHT, type ProjectSignal } from './signals'
