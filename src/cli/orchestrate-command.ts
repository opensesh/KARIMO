/**
 * KARIMO Orchestrate Command
 *
 * Handles the `karimo orchestrate` CLI command for running tasks.
 * Level 0 implementation — single task execution only.
 */

import {
  PhaseNotFoundError,
  TaskNotFoundError,
  createDryRunPlan,
  formatRunResult,
  printDryRunPlan,
  printTaskSummary,
  runTask,
} from '@/orchestrator'
import type { OrchestrateOptions } from './index'

/**
 * Handle the orchestrate command.
 *
 * @param options - Command options
 * @returns Exit code (0 for success, non-zero for failure)
 *
 * @example
 * ```bash
 * # Run a specific task
 * bun run orchestrate --phase phase-1 --task 1a
 *
 * # Dry run to preview execution plan
 * bun run orchestrate --phase phase-1 --task 1a --dry-run
 * ```
 */
export async function handleOrchestrate(options: OrchestrateOptions): Promise<number> {
  const { phase, task, dryRun = false, engine = 'claude-code' } = options

  // Validate required options
  if (!phase) {
    console.error('Error: --phase is required')
    console.error('')
    console.error('Usage: karimo orchestrate --phase <phase-id> --task <task-id> [--dry-run]')
    return 1
  }

  if (!task) {
    console.error('Error: --task is required for Level 0')
    console.error('')
    console.error('Usage: karimo orchestrate --phase <phase-id> --task <task-id> [--dry-run]')
    console.error('')
    console.error('Note: Running all ready tasks (--all-ready) will be available in Level 1.')
    return 1
  }

  try {
    // Dry run mode: preview the execution plan
    if (dryRun) {
      const plan = await createDryRunPlan({
        phaseId: phase,
        taskId: task,
        engine,
      })

      printDryRunPlan(plan)
      return 0
    }

    // Execute the task
    console.log(`Starting task ${task} from phase ${phase}...`)
    console.log('')

    const result = await runTask({
      phaseId: phase,
      taskId: task,
      engine,
    })

    // Print results
    printTaskSummary(result.summary)

    if (result.success) {
      if (result.run.prUrl) {
        console.log(`PR created: ${result.run.prUrl}`)
      }
      return 0
    }

    console.error('')
    console.error(formatRunResult(result))
    return 1
  } catch (error) {
    // Handle known errors with friendly messages
    if (error instanceof PhaseNotFoundError) {
      console.error(`Error: Phase "${error.phaseId}" not found`)
      console.error(`Expected PRD at: ${error.prdPath}`)
      console.error('')
      console.error('Make sure the PRD file exists at the expected location.')
      return 1
    }

    if (error instanceof TaskNotFoundError) {
      console.error(`Error: Task "${error.taskId}" not found in phase "${error.phaseId}"`)
      console.error('')
      console.error('Check that the task ID matches an entry in the PRD.')
      return 1
    }

    // Unknown errors
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${message}`)
    return 1
  }
}

/**
 * Parse command-line arguments for the orchestrate command.
 *
 * @param args - Raw command-line arguments (after 'orchestrate')
 * @returns Parsed options
 */
export function parseOrchestrateArgs(args: string[]): OrchestrateOptions {
  const options: OrchestrateOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const next = args[i + 1]

    switch (arg) {
      case '--phase':
      case '-p':
        if (next !== undefined) {
          options.phase = next
          i++
        }
        break
      case '--task':
      case '-t':
        if (next !== undefined) {
          options.task = next
          i++
        }
        break
      case '--dry-run':
      case '-n':
        options.dryRun = true
        break
      case '--engine':
      case '-e':
        if (next !== undefined) {
          options.engine = next
          i++
        }
        break
      case '--prd':
        // Future: allow PRD path override
        i++
        break
    }
  }

  return options
}

/**
 * Print usage information for the orchestrate command.
 */
export function printOrchestrateHelp(): void {
  console.log('Usage: karimo orchestrate [options]')
  console.log('')
  console.log('Run tasks from a PRD using AI agents.')
  console.log('')
  console.log('Options:')
  console.log('  -p, --phase <id>     Phase ID (e.g., "phase-1") [required]')
  console.log('  -t, --task <id>      Task ID (e.g., "1a") [required for Level 0]')
  console.log('  -n, --dry-run        Preview execution plan without running')
  console.log('  -e, --engine <name>  Agent engine to use (default: claude-code)')
  console.log('')
  console.log('Examples:')
  console.log('  karimo orchestrate --phase phase-1 --task 1a')
  console.log('  karimo orchestrate -p phase-1 -t 1a --dry-run')
  console.log('')
}
