/**
 * KARIMO CLI Main Router
 *
 * Handles command parsing, state detection, and routing to appropriate handlers.
 * When no command is provided, runs the guided workflow based on project state.
 */
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
 */
async function executeCommand(command: ParsedCommand, projectRoot: string): Promise<void> {
  switch (command.type) {
    case 'init': {
      // Import dynamically to avoid circular dependencies
      const { runInit } = await import('../config/init')
      await runInit(projectRoot)
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
 */
async function runGuidedFlow(projectRoot: string): Promise<void> {
  // Import state detection dynamically
  const { detectProjectPhase, markOnboarded } = await import('./state')

  const phase = await detectProjectPhase(projectRoot)

  switch (phase) {
    case 'welcome': {
      // No .karimo directory - run first-run flow with doctor checks
      const { runFirstRunFlow } = await import('./first-run')
      const shouldContinue = await runFirstRunFlow(projectRoot)

      if (!shouldContinue) {
        return
      }

      // Mark onboarding complete and run init
      await markOnboarded(projectRoot)
      const { runInit } = await import('../config/init')
      await runInit(projectRoot)
      break
    }

    case 'init': {
      // .karimo exists but no config - run init
      const { runInit: runInitAgain } = await import('../config/init')
      await runInitAgain(projectRoot)
      break
    }

    case 'create-prd': {
      // Config exists but no PRDs - start PRD interview
      p.intro('KARIMO')
      p.log.info('No PRDs found. Starting PRD interview...')
      const { startInterview } = await import('../interview')
      await startInterview(projectRoot)
      break
    }

    case 'resume-prd': {
      // PRD in progress - offer to resume
      p.intro('KARIMO')
      p.log.info('Found PRD in progress. Resuming interview...')
      const { resumeInterview } = await import('../interview')
      await resumeInterview(projectRoot)
      break
    }

    case 'execute': {
      // Finalized PRDs with pending tasks - show execution options
      p.intro('KARIMO')
      p.log.info('Ready to execute tasks.')
      const { showExecutionFlow } = await import('./execute-flow')
      await showExecutionFlow(projectRoot)
      break
    }

    case 'complete': {
      // All tasks complete
      p.intro('KARIMO')
      p.log.success('All tasks complete!')
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
  karimo help              Show this help message
  karimo version           Show version

Options:
  --help, -h               Show help
  --version, -v            Show version

Doctor Options:
  --check                  CI mode (exit codes only)
  --json                   Output JSON format

Guided Workflow:
  Running \`karimo\` without arguments will detect your project state
  and guide you through the appropriate next step:

  1. Welcome & Doctor - First-time setup with prerequisite checks
  2. Init             - Configure project settings
  3. PRD Interview    - Create a PRD through conversation
  4. Execute          - Run agents on finalized PRDs

Documentation:
  https://github.com/opensesh/KARIMO
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

  if (command.type !== 'guided') {
    await executeCommand(command, projectRoot)
    return
  }

  // Run guided flow based on project state
  await runGuidedFlow(projectRoot)
}
