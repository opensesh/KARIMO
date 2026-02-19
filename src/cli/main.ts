/**
 * KARIMO CLI Main Router
 *
 * Handles command parsing, state detection, and routing to appropriate handlers.
 * When no command is provided, runs the guided workflow based on project state.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as p from '@clack/prompts'

// =============================================================================
// Types
// =============================================================================

export type CommandType =
  | 'guided' // No command - run guided flow
  | 'init'
  | 'doctor'
  | 'onboard'
  | 'orchestrate'
  | 'status'
  | 'reset'
  | 'note'
  | 'checkpoint'
  | 'info'
  | 'help'
  | 'version'

export interface ParsedCommand {
  type: CommandType
  args: string[]
  flags: Map<string, string | boolean>
}

// =============================================================================
// Command Parsing
// =============================================================================

/**
 * Parse CLI arguments into a structured command.
 */
export function parseCommand(args: string[]): ParsedCommand {
  const flags = new Map<string, string | boolean>()
  const positional: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === undefined) continue

    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]

      // Check if next arg is a value (not another flag)
      if (nextArg !== undefined && !nextArg.startsWith('-')) {
        flags.set(key, nextArg)
        i++
      } else {
        flags.set(key, true)
      }
    } else if (arg.startsWith('-')) {
      // Short flags
      const key = arg.slice(1)
      flags.set(key, true)
    } else {
      positional.push(arg)
    }
  }

  // Determine command type from first positional argument
  const command = positional[0]?.toLowerCase()

  // Handle help and version flags
  if (flags.has('help') || flags.has('h')) {
    return { type: 'help', args: positional, flags }
  }
  if (flags.has('version') || flags.has('v')) {
    return { type: 'version', args: positional, flags }
  }

  // Map command names to types
  switch (command) {
    case 'init':
      return { type: 'init', args: positional.slice(1), flags }
    case 'doctor':
      return { type: 'doctor', args: positional.slice(1), flags }
    case 'onboard':
      return { type: 'onboard', args: positional.slice(1), flags }
    case 'orchestrate':
    case 'run':
      return { type: 'orchestrate', args: positional.slice(1), flags }
    case 'status':
      return { type: 'status', args: positional.slice(1), flags }
    case 'reset':
      return { type: 'reset', args: positional.slice(1), flags }
    case 'note':
      return { type: 'note', args: positional.slice(1), flags }
    case 'checkpoint':
      return { type: 'checkpoint', args: positional.slice(1), flags }
    case 'info':
    case 'about':
      return { type: 'info', args: positional.slice(1), flags }
    case 'help':
      return { type: 'help', args: positional.slice(1), flags }
    case 'version':
      return { type: 'version', args: positional.slice(1), flags }
    default:
      // No recognized command - run guided flow
      return { type: 'guided', args: positional, flags }
  }
}

// =============================================================================
// Command Execution
// =============================================================================

/**
 * Execute a specific command.
 * @param command - Parsed command object
 * @param projectRoot - Root directory of the project
 * @param firstRunHandled - If true, skip first-run flow (already handled before telemetry)
 */
async function executeCommand(
  command: ParsedCommand,
  projectRoot: string,
  firstRunHandled = false
): Promise<void> {
  switch (command.type) {
    case 'init': {
      // Skip first-run flow if already handled before telemetry wrapper
      if (!firstRunHandled) {
        const { isOnboardedSync } = await import('./state')

        // Show animated welcome on fresh projects (not onboarded)
        if (!isOnboardedSync(projectRoot)) {
          const { runFirstRunFlow } = await import('./first-run')
          const shouldContinue = await runFirstRunFlow(projectRoot)

          if (!shouldContinue) {
            return
          }

          // Mark onboarding complete
          const { markOnboarded } = await import('./state')
          await markOnboarded(projectRoot)
        }
      }

      const { runInit } = await import('../config/init')
      const initResult = await runInit(projectRoot)

      // Offer PRD transition after successful init
      if (initResult.success) {
        console.log()
        const startPRD = await p.confirm({
          message: 'Ready to create your first PRD?',
          initialValue: true,
        })

        if (!p.isCancel(startPRD) && startPRD) {
          const { startInterview } = await import('../interview')
          await startInterview(projectRoot)
        } else {
          p.log.info('Run `karimo` anytime to start your first PRD.')
        }
      }
      break
    }
    case 'doctor': {
      const { handleDoctor, parseDoctorArgs } = await import('./doctor-command')
      const { recordDoctorRun } = await import('./state')
      const doctorOptions = {
        projectRoot,
        ...parseDoctorArgs([...command.args, ...flagsToArgs(command.flags)]),
      }
      const exitCode = await handleDoctor(doctorOptions)
      await recordDoctorRun(projectRoot)
      if (exitCode !== 0) {
        process.exit(exitCode)
      }
      break
    }
    case 'onboard': {
      await handleOnboard(projectRoot)
      break
    }
    case 'orchestrate': {
      const { handleOrchestrate, parseOrchestrateArgs } = await import('./orchestrate-command')
      const orchestrateOptions = parseOrchestrateArgs([
        ...command.args,
        ...flagsToArgs(command.flags),
      ])
      await handleOrchestrate(orchestrateOptions)
      break
    }
    case 'status':
      // TODO: Implement status command
      p.log.info('Status command not yet implemented')
      break
    case 'reset': {
      const { handleReset, parseResetArgs } = await import('./reset-command')
      const resetOptions = {
        projectRoot,
        ...parseResetArgs([...command.args, ...flagsToArgs(command.flags)]),
      }
      await handleReset(resetOptions)
      break
    }
    case 'note': {
      const { handleNote, parseNoteArgs, printNoteHelp } = await import('./note-command')
      const noteResult = parseNoteArgs([...command.args, ...flagsToArgs(command.flags)])
      if (!noteResult) {
        printNoteHelp()
        break
      }
      await handleNote({
        projectRoot,
        tag: noteResult.tag,
        message: noteResult.message,
      })
      break
    }
    case 'checkpoint': {
      p.log.info('Checkpoint command coming in Level 2.')
      console.log()
      p.log.info('For now, capture feedback with:')
      p.log.info('  karimo note "your observation"')
      break
    }
    case 'info': {
      const { handleInfo } = await import('./commands/info')
      handleInfo()
      break
    }
    case 'help':
      printHelp()
      break
    case 'version':
      printVersion()
      break
    default:
      p.log.error(`Unknown command: ${command.type}`)
      printHelp()
      process.exit(1)
  }
}

/**
 * Convert flags map back to CLI args.
 */
function flagsToArgs(flags: Map<string, string | boolean>): string[] {
  const args: string[] = []
  for (const [key, value] of flags) {
    if (typeof value === 'boolean' && value) {
      args.push(`--${key}`)
    } else if (typeof value === 'string') {
      args.push(`--${key}`, value)
    }
  }
  return args
}

// =============================================================================
// Guided Flow
// =============================================================================

/**
 * Run the guided workflow based on project state.
 * @param projectRoot - Root directory of the project
 * @param firstRunHandled - If true, skip first-run/welcome flow (already handled before telemetry)
 */
async function runGuidedFlow(projectRoot: string, firstRunHandled = false): Promise<void> {
  // Import state detection dynamically
  const { detectProjectPhase, markOnboarded } = await import('./state')

  const phase = await detectProjectPhase(projectRoot)

  switch (phase) {
    case 'welcome': {
      // Skip first-run flow if already handled before telemetry wrapper
      if (firstRunHandled) {
        // Already onboarded, just run init
        const { runInit } = await import('../config/init')
        const initResult = await runInit(projectRoot)

        // Offer PRD transition after successful init
        if (initResult.success) {
          console.log()
          const startPRD = await p.confirm({
            message: 'Ready to create your first PRD?',
            initialValue: true,
          })

          if (!p.isCancel(startPRD) && startPRD) {
            const { startInterview } = await import('../interview')
            await startInterview(projectRoot)
          } else {
            p.log.info('Run `karimo` anytime to start your first PRD.')
          }
        }
        break
      }

      // Not yet onboarded - run first-run flow with doctor checks
      const { runFirstRunFlow } = await import('./first-run')
      const shouldContinue = await runFirstRunFlow(projectRoot)

      if (!shouldContinue) {
        return
      }

      // Mark onboarding complete and run init
      await markOnboarded(projectRoot)
      const { runInit: runInitAgain2 } = await import('../config/init')
      const initResult2 = await runInitAgain2(projectRoot)

      // Offer PRD transition after successful init
      if (initResult2.success) {
        console.log()
        const startPRD = await p.confirm({
          message: 'Ready to create your first PRD?',
          initialValue: true,
        })

        if (!p.isCancel(startPRD) && startPRD) {
          const { startInterview } = await import('../interview')
          await startInterview(projectRoot)
        } else {
          p.log.info('Run `karimo` anytime to start your first PRD.')
        }
      }
      break
    }

    case 'init': {
      // .karimo exists but no config - show returning welcome for init
      const { showReturningWelcome } = await import('./returning-welcome')
      const action = await showReturningWelcome(projectRoot, phase)

      if (!action || action === 'exit') {
        return
      }

      if (action === 'init') {
        const { runInit: runInitAgain } = await import('../config/init')
        const initResult = await runInitAgain(projectRoot)

        // Offer PRD transition after successful init
        if (initResult.success) {
          console.log()
          const startPRD = await p.confirm({
            message: 'Ready to create your first PRD?',
            initialValue: true,
          })

          if (!p.isCancel(startPRD) && startPRD) {
            const { startInterview } = await import('../interview')
            await startInterview(projectRoot)
          } else {
            p.log.info('Run `karimo` anytime to start your first PRD.')
          }
        }
      } else if (action === 'help') {
        printHelp()
      }
      break
    }

    case 'create-prd':
    case 'resume-prd':
    case 'execute':
    case 'complete': {
      // Returning user flow - show compact welcome with action selection
      const { showReturningWelcome } = await import('./returning-welcome')
      const action = await showReturningWelcome(projectRoot, phase)

      if (!action || action === 'exit') {
        return
      }

      // Route based on selected action
      switch (action) {
        case 'resume-prd': {
          const { resumeInterview } = await import('../interview')
          await resumeInterview(projectRoot)
          break
        }
        case 'start-prd': {
          const { startInterview } = await import('../interview')
          await startInterview(projectRoot)
          break
        }
        case 'execute': {
          const { showExecutionFlow } = await import('./execute-flow')
          await showExecutionFlow(projectRoot)
          break
        }
        case 'init': {
          const { runInit } = await import('../config/init')
          await runInit(projectRoot)
          break
        }
        case 'help':
          printHelp()
          break
      }
      break
    }
  }
}

/**
 * Handle the onboard command for team members joining existing projects.
 */
async function handleOnboard(projectRoot: string): Promise<void> {
  const { karimoDirExists, configExists } = await import('./state')
  const { runDoctorChecks, formatSetupChecklist } = await import('../doctor')
  const { showCompactHeader } = await import('./ui')

  // Show header
  showCompactHeader()

  // Check if project has KARIMO set up
  if (!karimoDirExists(projectRoot)) {
    p.log.error('This project has not been configured with KARIMO.')
    p.log.info('Run `karimo init` to set up this project.')
    return
  }

  if (!configExists(projectRoot)) {
    p.log.error('.karimo/ exists but config.yaml is missing.')
    p.log.info('Run `karimo init` to complete setup.')
    return
  }

  // Run doctor checks
  p.log.info('Verifying your environment...')
  console.log()

  const report = await runDoctorChecks({ projectRoot })

  console.log(formatSetupChecklist(report))
  console.log()

  if (report.overall === 'pass') {
    p.log.success('Your environment is ready to work on this project.')

    // Show existing config summary
    const { loadConfig } = await import('../config')
    try {
      const result = await loadConfig(projectRoot)
      const cfg = result.config
      console.log()
      const configSummary = cfg.commands.test
        ? `Project: ${cfg.project.name}\nBuild:   ${cfg.commands.build}\nLint:    ${cfg.commands.lint}\nTest:    ${cfg.commands.test}`
        : `Project: ${cfg.project.name}\nBuild:   ${cfg.commands.build}\nLint:    ${cfg.commands.lint}`
      p.note(configSummary, 'Project Configuration')
    } catch {
      // Config loading failed - already handled above
    }
  } else {
    p.log.error('Your environment has issues that need to be resolved.')
    p.log.info('Run `karimo doctor` for detailed fix instructions.')
    process.exit(1)
  }
}

// =============================================================================
// Help & Version
// =============================================================================

function printHelp(): void {
  console.log(`
KARIMO - Autonomous Development Framework

Usage:
  karimo                   Run guided workflow (recommended)
  karimo init              Initialize KARIMO in current project
  karimo doctor            Check environment prerequisites
  karimo onboard           Verify setup for team members
  karimo orchestrate       Execute tasks from PRD
  karimo status            Show current project status
  karimo note <message>    Capture dogfooding note
  karimo checkpoint        Capture learning checkpoint (Level 2)
  karimo reset             Reset KARIMO state
  karimo info              Show version and project info
  karimo help              Show this help message
  karimo version           Show version

Options:
  --root <PATH>            Run KARIMO in a different directory
  --help, -h               Show help
  --version, -v            Show version

Doctor Options:
  --check                  CI mode (exit codes only)
  --json                   Output JSON format

Note Options:
  --tag, -t <TAG>          Tag the note (NOTE, BUG, UX, FRICTION, IDEA)

Reset Options:
  --hard                   Delete entire .karimo directory
  --force, -f              Skip confirmation prompt

Guided Workflow:
  Running \`karimo\` without arguments will detect your project state
  and guide you through the appropriate next step:

  1. Welcome & Doctor - First-time setup with prerequisite checks
  2. Init             - Configure project settings
  3. PRD Interview    - Create a PRD through conversation
  4. Execute          - Run agents on finalized PRDs

Documentation:
  https://github.com/opensesh/KARIMO

Get Help:
  https://github.com/opensesh/KARIMO/issues
`)
}

function printVersion(): void {
  // Read version from package.json
  console.log('KARIMO v0.0.1')
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Main CLI entry point.
 */
export async function main(projectRoot: string, args: string[]): Promise<void> {
  const command = parseCommand(args)

  // Honor --root flag if provided
  let effectiveProjectRoot = projectRoot
  const rootFlag = command.flags.get('root')
  if (typeof rootFlag === 'string') {
    // Resolve relative paths (e.g., --root ../BOS-3.0)
    effectiveProjectRoot = resolve(rootFlag)

    // Verify the directory exists
    if (!existsSync(effectiveProjectRoot)) {
      p.log.error(`Directory not found: ${effectiveProjectRoot}`)
      process.exit(1)
    }
  }

  // Safety check (skip for help and version)
  if (command.type !== 'help' && command.type !== 'version') {
    const { checkWorkingDirectory, formatSafetyError } = await import('./safety')
    const safetyResult = checkWorkingDirectory(effectiveProjectRoot)
    if (!safetyResult.safe) {
      p.log.error('Cannot run KARIMO in this directory')
      console.log()
      console.log(formatSafetyError(safetyResult))
      process.exit(1)
    }
  }

  // BEFORE telemetry wrapper, check if this is a first run for 'init' or 'guided'
  // This avoids a race condition where telemetry creates .karimo/ before
  // the welcome check runs. We check for state.json with onboarded_at instead
  // of just the directory existence.
  let firstRunHandled = false
  if (command.type === 'init' || command.type === 'guided') {
    const { isOnboardedSync } = await import('./state')

    if (!isOnboardedSync(effectiveProjectRoot)) {
      const { runFirstRunFlow } = await import('./first-run')
      const shouldContinue = await runFirstRunFlow(effectiveProjectRoot)

      if (!shouldContinue) {
        return // User cancelled during welcome
      }

      const { markOnboarded } = await import('./state')
      await markOnboarded(effectiveProjectRoot)
      firstRunHandled = true
    }
  }

  // Wrap in telemetry (safe to create .karimo/ now since onboarding is complete)
  const { withTelemetry } = await import('./telemetry')
  await withTelemetry(effectiveProjectRoot, command.type, args, async () => {
    if (command.type !== 'guided') {
      await executeCommand(command, effectiveProjectRoot, firstRunHandled)
      return
    }

    // Run guided flow based on project state
    await runGuidedFlow(effectiveProjectRoot, firstRunHandled)
  })
}
