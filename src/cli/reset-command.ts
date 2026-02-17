/**
 * Reset Command
 *
 * Resets KARIMO state in the current project.
 *
 * Usage:
 *   karimo reset           # Soft reset - preserves config and logs
 *   karimo reset --hard    # Hard reset - removes entire .karimo directory
 *   karimo reset --force   # Skip confirmation prompt
 *   karimo reset -f        # Short flag for --force
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'

// =============================================================================
// Types
// =============================================================================

/**
 * Options for the reset command.
 */
export interface ResetOptions {
  projectRoot: string
  hard?: boolean
  force?: boolean
}

// =============================================================================
// Constants
// =============================================================================

const KARIMO_DIR = '.karimo'

/**
 * Files to preserve during soft reset.
 */
const PRESERVED_FILES = ['config.yaml', 'dogfood.log', 'telemetry.log']

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse reset command arguments.
 */
export function parseResetArgs(args: string[]): { hard: boolean; force: boolean } {
  let hard = false
  let force = false

  for (const arg of args) {
    if (arg === '--hard') {
      hard = true
    } else if (arg === '--force' || arg === '-f') {
      force = true
    }
  }

  return { hard, force }
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Handle the reset command.
 */
export async function handleReset(options: ResetOptions): Promise<void> {
  const { projectRoot, hard = false, force = false } = options
  const karimoDir = join(projectRoot, KARIMO_DIR)

  // Check if .karimo directory exists
  if (!existsSync(karimoDir)) {
    p.log.info('No .karimo directory found. Nothing to reset.')
    return
  }

  // Confirm with user unless --force is specified
  if (!force) {
    const confirmMessage = hard
      ? 'This will delete the entire .karimo directory including config and logs. Continue?'
      : 'This will delete state and PRDs but preserve config.yaml, dogfood.log, and telemetry.log. Continue?'

    const confirmed = await p.confirm({
      message: confirmMessage,
      initialValue: false,
    })

    if (p.isCancel(confirmed) || !confirmed) {
      p.log.info('Reset cancelled.')
      return
    }
  }

  if (hard) {
    // Hard reset - remove entire directory
    rmSync(karimoDir, { recursive: true, force: true })
    p.log.success('Hard reset complete. Removed .karimo directory.')
  } else {
    // Soft reset - remove everything except preserved files
    const deleted = softReset(karimoDir)
    if (deleted.length > 0) {
      p.log.success(`Soft reset complete. Removed: ${deleted.join(', ')}`)
    } else {
      p.log.info('Nothing to reset. Only preserved files exist.')
    }

    // Show what was preserved
    const preserved = PRESERVED_FILES.filter((f) => existsSync(join(karimoDir, f)))
    if (preserved.length > 0) {
      p.log.info(`Preserved: ${preserved.join(', ')}`)
    }
  }
}

/**
 * Perform a soft reset, removing everything except preserved files.
 * Returns list of deleted items.
 */
function softReset(karimoDir: string): string[] {
  const deleted: string[] = []
  const entries = readdirSync(karimoDir)

  for (const entry of entries) {
    // Skip preserved files
    if (PRESERVED_FILES.includes(entry)) {
      continue
    }

    const entryPath = join(karimoDir, entry)
    const stat = statSync(entryPath)

    if (stat.isDirectory()) {
      // Remove entire directory
      rmSync(entryPath, { recursive: true, force: true })
      deleted.push(`${entry}/`)
    } else {
      // Remove file
      rmSync(entryPath)
      deleted.push(entry)
    }
  }

  return deleted
}

/**
 * Print help for the reset command.
 */
export function printResetHelp(): void {
  console.log(`
Usage: karimo reset [options]

Reset KARIMO state in the current project.

Options:
  --hard          Delete entire .karimo directory (including config)
  --force, -f     Skip confirmation prompt

Soft Reset (default):
  Deletes: state.json, prds/, any other generated files
  Preserves: config.yaml, dogfood.log, telemetry.log

Hard Reset (--hard):
  Deletes the entire .karimo directory. You will need to run
  \`karimo init\` again to reconfigure the project.

Examples:
  karimo reset              # Soft reset with confirmation
  karimo reset --force      # Soft reset without confirmation
  karimo reset --hard       # Hard reset with confirmation
  karimo reset --hard -f    # Hard reset without confirmation
`)
}
