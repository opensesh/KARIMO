/**
 * KARIMO Welcome Screen
 *
 * Displays introduction and level explanation for first-time users.
 * Uses @clack/prompts for interactive CLI.
 */
import * as p from '@clack/prompts'

/**
 * ASCII art logo for KARIMO.
 */
const LOGO = `
██╗  ██╗ █████╗ ██████╗ ██╗███╗   ███╗ ██████╗
██║ ██╔╝██╔══██╗██╔══██╗██║████╗ ████║██╔═══██╗
█████╔╝ ███████║██████╔╝██║██╔████╔██║██║   ██║
██╔═██╗ ██╔══██║██╔══██╗██║██║╚██╔╝██║██║   ██║
██║  ██╗██║  ██║██║  ██║██║██║ ╚═╝ ██║╚██████╔╝
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝ ╚═════╝
`

/**
 * Introduction text.
 */
const INTRO_TEXT = `Welcome to KARIMO — the autonomous development framework.

You are the architect. Agents are the builders.
KARIMO turns product requirements into shipped code using AI agents,
automated code review, and structured human oversight.`

/**
 * Level explanation text.
 */
const LEVELS_TEXT = `KARIMO builds capabilities in levels:

  Level 0  Basic agent execution (current)
           Single task execution with pre-PR checks

  Level 1  GitHub Projects integration
           Automatic issue creation and tracking

  Level 2  Automated review (Greptile)
           AI-powered code review before human review

  Level 3  Full orchestration
           Multi-task execution with dependency resolution

  Level 4  Parallel execution + fallback engines
           Concurrent agents with engine failover

  Level 5  Dashboard
           Web UI for monitoring and control

You're starting at Level 0.`

/**
 * Workflow explanation text.
 */
const WORKFLOW_TEXT = `How KARIMO works:

  1. Initialize   Set up your project with \`karimo init\`
                  Detects your stack, commands, and boundaries

  2. Plan         Create a PRD through guided conversation
                  Break features into agent-executable tasks

  3. Execute      Run agents on finalized PRDs
                  Each task gets its own branch and PR`

/**
 * Show the welcome screen.
 * @returns true if user wants to proceed, false if cancelled
 */
export async function showWelcome(): Promise<boolean> {
  // Display logo
  console.log(LOGO)

  // Display intro
  p.intro('Autonomous Development Framework')

  // Show introduction
  p.note(INTRO_TEXT, 'About KARIMO')

  // Show level explanation
  p.note(LEVELS_TEXT, 'Build Levels')

  // Show workflow
  p.note(WORKFLOW_TEXT, 'Workflow')

  // Confirmation prompt
  const proceed = await p.confirm({
    message: 'Ready to set up KARIMO for this project?',
    initialValue: true,
  })

  if (p.isCancel(proceed)) {
    p.cancel('Setup cancelled.')
    process.exit(0)
  }

  if (!proceed) {
    p.outro("Run `karimo` again when you're ready.")
    return false
  }

  return true
}

/**
 * Show a brief welcome back message for returning users.
 */
export async function showWelcomeBack(): Promise<void> {
  p.intro('KARIMO')
  p.log.info('Welcome back! Checking project status...')
}

/**
 * Show help for available commands.
 */
export function showCommandHelp(): void {
  console.log(`
Commands:
  karimo               Run guided workflow based on project state
  karimo init          Initialize KARIMO configuration
  karimo orchestrate   Execute tasks from a finalized PRD
  karimo status        Show current project and task status
  karimo help          Show this help message

Guided Workflow:
  When you run \`karimo\` without arguments, it detects your project
  state and guides you through the appropriate next step:

  • No .karimo/       → Welcome screen + initialization
  • Config exists     → Start PRD interview
  • PRD in progress   → Resume interview
  • PRD finalized     → Execute tasks

Documentation:
  https://github.com/opensesh/KARIMO
`)
}
