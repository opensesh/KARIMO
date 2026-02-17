/**
 * KARIMO Welcome Screen
 *
 * Beautiful ASCII art welcome screen for first-time users.
 * Based on the karimo-welcome.py prototype design.
 */

import * as p from '@clack/prompts'
import { BOLD, GY, GYD, OR, ORD, RST, WH, border } from './colors'

// =============================================================================
// Constants
// =============================================================================

/** Border width for the welcome box */
const BORDER_WIDTH = 60

/** Left padding for content lines */
const PAD = '  '

// =============================================================================
// ASCII Art
// =============================================================================

/**
 * KARIMO wordmark in block ASCII.
 * Uses box-drawing characters for a clean, modern look.
 */
const WORDMARK = `
${PAD}${OR}${BOLD}██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗${RST}
${PAD}${OR}${BOLD}██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗${RST}
${PAD}${OR}${BOLD}█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║${RST}
${PAD}${OR}${BOLD}██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║${RST}
${PAD}${OR}${BOLD}██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝${RST}
${PAD}${OR}${BOLD}╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝${RST}
`

// =============================================================================
// Screen Components
// =============================================================================

/**
 * Display the welcome header with wordmark and taglines.
 */
function showHeader(): void {
  console.log()
  console.log(`${PAD}${border(BORDER_WIDTH)}`)
  console.log(WORDMARK)
  console.log(`${PAD}${WH}${BOLD}Welcome to KARIMO.${RST}`)
  console.log()
  console.log(`${PAD}${GY}You are the architect. Agents are the builders.${RST}`)
  console.log(`${PAD}${GYD}Product requirements → shipped code.${RST}`)
  console.log()
  console.log(`${PAD}${border(BORDER_WIDTH)}`)
  console.log()
}

/**
 * Display the introduction explaining what KARIMO does.
 */
function showIntroduction(): void {
  console.log(`${PAD}KARIMO turns your ideas into working software.`)
  console.log()
  console.log(`${PAD}You describe what you want to build. AI agents write the code.`)
  console.log(`${PAD}Automated review keeps quality high. You stay in control.`)
  console.log()
  console.log(`${PAD}Here's how it works:`)
  console.log()
  console.log(`${PAD}  ${OR}1. Define${RST}   You describe features in plain language`)
  console.log(`${PAD}  ${OR}2. Build${RST}    AI agents implement your requirements`)
  console.log(`${PAD}  ${OR}3. Review${RST}   Automated checks ensure code quality`)
  console.log()
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Display the full welcome screen for first-time users.
 *
 * @returns true if user wants to continue, false if cancelled
 */
export async function showWelcomeScreen(): Promise<boolean> {
  showHeader()
  showIntroduction()

  const proceed = await p.confirm({
    message: 'Press Enter to continue...',
    active: 'Continue',
    inactive: 'Cancel',
    initialValue: true,
  })

  if (p.isCancel(proceed) || !proceed) {
    p.outro('Come back when you are ready.')
    return false
  }

  console.log() // Add spacing before next screen
  return true
}

/**
 * Display a compact welcome header (for returning users or subsequent screens).
 */
export function showCompactHeader(): void {
  console.log()
  console.log(`${PAD}${border(BORDER_WIDTH)}`)
  console.log()
  console.log(`${PAD}${OR}${BOLD}KARIMO${RST} ${GY}Autonomous Development Framework${RST}`)
  console.log()
  console.log(`${PAD}${border(BORDER_WIDTH)}`)
  console.log()
}

/**
 * Display the transition screen before starting init.
 *
 * @returns true if user wants to continue
 */
export async function showTransitionToInit(): Promise<boolean> {
  console.log(`${PAD}${ORD}◆${RST} ${WH}${BOLD}Ready to configure KARIMO${RST}`)
  console.log(`${PAD}${ORD}│${RST}`)
  console.log(`${PAD}${ORD}│${RST}  Your environment is set up. Now let's configure this project.`)
  console.log(`${PAD}${ORD}│${RST}`)
  console.log(`${PAD}${ORD}│${RST}  KARIMO will scan your codebase to detect:`)
  console.log(`${PAD}${ORD}│${RST}    • Project name and tech stack`)
  console.log(`${PAD}${ORD}│${RST}    • Build, lint, and test commands`)
  console.log(`${PAD}${ORD}│${RST}    • Code quality rules`)
  console.log(`${PAD}${ORD}│${RST}    • Files that need extra review`)
  console.log(`${PAD}${ORD}│${RST}`)
  console.log(
    `${PAD}${ORD}│${RST}  This creates ${GY}.karimo/config.yaml${RST} — you can edit it anytime.`
  )
  console.log(`${PAD}${ORD}│${RST}`)
  console.log(`${PAD}${ORD}└${RST}`)
  console.log()

  const proceed = await p.confirm({
    message: 'Start project setup?',
    initialValue: true,
  })

  if (p.isCancel(proceed) || !proceed) {
    p.outro('Run `karimo` again when you are ready.')
    return false
  }

  return true
}

// =============================================================================
// Exports
// =============================================================================

export { BORDER_WIDTH }
