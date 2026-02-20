/**
 * KARIMO Returning User Welcome
 *
 * Polished welcome screen for returning users that mirrors Claude Code's
 * session start UX — condensed ASCII banner, session info, state hint,
 * and smart prompt with action selection.
 */

import * as p from '@clack/prompts'
import { buildDependencyGraph, getReadyTasks, parsePRDFile } from '../prd'
import { getPRDFileInfos, loadState } from './state'
import type { KarimoState, PRDSection, ProjectPhase } from './state/types'
import { GN, GY, GYD, OR, RST, WH } from './ui/colors'
import { getCompactBannerString } from './ui/compact-banner'
import { buildSessionContext, getSessionInfoString } from './ui/session-info'
import { isTTY } from './ui/terminal-utils'

// =============================================================================
// Types
// =============================================================================

/**
 * State context for rendering hints and actions.
 */
export interface StateContext {
  /** Current project phase */
  phase: ProjectPhase
  /** State data from .karimo/state.json */
  state: KarimoState | null
  /** Current PRD name (for resume-prd phase) */
  currentPRDName: string | null
  /** Current PRD section (for resume-prd phase) */
  currentSection: PRDSection | null
  /** Number of ready tasks (for execute phase) */
  readyTaskCount: number
}

/**
 * Available user actions based on state.
 */
export type ReturningAction =
  | 'resume-prd'
  | 'start-prd'
  | 'execute'
  | 'init'
  | 'reconfigure'
  | 'help'
  | 'exit'

// =============================================================================
// State Hint Generation
// =============================================================================

/**
 * Section display names for human-readable hints.
 */
const SECTION_DISPLAY: Record<PRDSection, string> = {
  framing: 'framing',
  requirements: 'requirements',
  dependencies: 'dependencies',
  'agent-context': 'agent context',
  retrospective: 'retrospective',
  review: 'review',
  finalized: 'finalized',
}

/**
 * Generate state hint line based on project phase.
 */
function getStateHint(context: StateContext): string {
  switch (context.phase) {
    case 'resume-prd': {
      const prdName = context.currentPRDName ?? 'untitled'
      const section = context.currentSection ? SECTION_DISPLAY[context.currentSection] : 'unknown'
      return `${OR}●${RST} ${WH}PRD in progress${RST} ${GY}—${RST} ${WH}"${prdName}"${RST} ${GYD}(${section})${RST}`
    }

    case 'execute': {
      const count = context.readyTaskCount
      const noun = count === 1 ? 'task' : 'tasks'
      return `${OR}●${RST} ${WH}${count} ${noun} ready for execution${RST}`
    }

    case 'create-prd':
      return `${OR}●${RST} ${WH}Ready to create your first PRD${RST}`

    case 'complete':
      return `${GN}✓${RST} ${WH}All tasks complete${RST}`

    case 'init':
      return `${OR}●${RST} ${WH}Configuration needed${RST}`

    case 'welcome':
      return `${OR}●${RST} ${WH}Welcome to KARIMO${RST}`

    default:
      return ''
  }
}

// =============================================================================
// Context Building
// =============================================================================

/**
 * Build state context from project state.
 */
export async function buildStateContext(
  projectRoot: string,
  phase: ProjectPhase
): Promise<StateContext> {
  let state: KarimoState | null = null
  let currentPRDName: string | null = null
  let currentSection: PRDSection | null = null
  let readyTaskCount = 0

  try {
    state = await loadState(projectRoot)
    currentPRDName = state.current_prd
    currentSection = state.current_prd_section
  } catch {
    // State not available
  }

  // Get ready task count for execute phase
  if (phase === 'execute') {
    try {
      const prdInfos = await getPRDFileInfos(projectRoot)
      const finalizedPRDs = prdInfos.filter((prd) => prd.finalized)
      const completedPRDSlugs = new Set(state?.completed_prds ?? [])
      const pendingPRDs = finalizedPRDs.filter((prd) => !completedPRDSlugs.has(prd.slug))

      // Count ready tasks across all pending PRDs
      for (const prd of pendingPRDs) {
        const prdResult = await parsePRDFile(prd.path)
        if (prdResult.tasks && prdResult.tasks.length > 0) {
          const graph = buildDependencyGraph(prdResult.tasks)
          const readyTasks = getReadyTasks(graph, new Set())
          readyTaskCount += readyTasks.length
        }
      }
    } catch {
      // PRD parsing failed, that's fine
    }
  }

  return {
    phase,
    state,
    currentPRDName,
    currentSection,
    readyTaskCount,
  }
}

// =============================================================================
// Action Selection
// =============================================================================

/**
 * Get action options based on project phase.
 */
function getActionOptions(phase: ProjectPhase): Array<{
  value: ReturningAction
  label: string
  hint?: string
}> {
  switch (phase) {
    case 'resume-prd':
      return [
        { value: 'resume-prd', label: 'Resume PRD interview', hint: 'Continue where you left off' },
        { value: 'start-prd', label: 'Start new PRD', hint: 'Create a different feature' },
        { value: 'reconfigure', label: 'Reconfigure project', hint: 'Update config.yaml' },
        { value: 'help', label: 'Show help', hint: 'Available commands' },
        { value: 'exit', label: 'Exit', hint: 'Ctrl+C' },
      ]

    case 'execute':
      return [
        { value: 'execute', label: 'Execute tasks', hint: 'Run ready tasks' },
        { value: 'start-prd', label: 'Create new PRD', hint: 'Add another feature' },
        { value: 'reconfigure', label: 'Reconfigure project', hint: 'Update config.yaml' },
        { value: 'help', label: 'Show help', hint: 'Available commands' },
        { value: 'exit', label: 'Exit', hint: 'Ctrl+C' },
      ]

    case 'create-prd':
      return [
        { value: 'start-prd', label: 'Create PRD', hint: 'Start PRD interview' },
        { value: 'reconfigure', label: 'Reconfigure project', hint: 'Update config.yaml' },
        { value: 'help', label: 'Show help', hint: 'Available commands' },
        { value: 'exit', label: 'Exit', hint: 'Ctrl+C' },
      ]

    case 'init':
      return [
        { value: 'init', label: 'Configure project', hint: 'Set up KARIMO' },
        { value: 'help', label: 'Show help', hint: 'Available commands' },
        { value: 'exit', label: 'Exit', hint: 'Ctrl+C' },
      ]

    case 'complete':
      return [
        { value: 'start-prd', label: 'Create new PRD', hint: 'Start a new feature' },
        { value: 'reconfigure', label: 'Reconfigure project', hint: 'Update config.yaml' },
        { value: 'help', label: 'Show help', hint: 'Available commands' },
        { value: 'exit', label: 'Exit', hint: 'Ctrl+C' },
      ]

    default:
      return [
        { value: 'help', label: 'Show help', hint: 'Available commands' },
        { value: 'exit', label: 'Exit', hint: 'Ctrl+C' },
      ]
  }
}

/**
 * Show inline help.
 */
function showInlineHelp(): void {
  console.log()
  console.log(`${WH}Available Commands${RST}`)
  console.log()
  console.log(`  ${OR}karimo${RST}             ${GY}Start guided flow${RST}`)
  console.log(`  ${OR}karimo init${RST}        ${GY}Configure project${RST}`)
  console.log(`  ${OR}karimo doctor${RST}      ${GY}Check environment${RST}`)
  console.log(`  ${OR}karimo status${RST}      ${GY}Show project status${RST}`)
  console.log(`  ${OR}karimo info${RST}        ${GY}About KARIMO${RST}`)
  console.log(`  ${OR}karimo help${RST}        ${GY}Show full help${RST}`)
  console.log()
}

// =============================================================================
// Main Orchestrator
// =============================================================================

/**
 * Show the returning user welcome screen.
 *
 * @param projectRoot - Project root directory
 * @param phase - Current project phase
 * @returns Selected action, or null if cancelled/non-TTY
 */
export async function showReturningWelcome(
  projectRoot: string,
  phase: ProjectPhase
): Promise<ReturningAction | null> {
  // Non-TTY: skip visual welcome, return default action
  if (!isTTY()) {
    return getDefaultAction(phase)
  }

  // Build context
  const sessionContext = await buildSessionContext(projectRoot)
  const stateContext = await buildStateContext(projectRoot, phase)

  // Render welcome screen
  console.log(getCompactBannerString())
  console.log(getSessionInfoString(sessionContext))
  console.log(getStateHint(stateContext))
  console.log()

  // Show action prompt
  const options = getActionOptions(phase)

  const action = await p.select({
    message: 'What would you like to do?',
    options,
  })

  if (p.isCancel(action)) {
    return null
  }

  // Handle help inline
  if (action === 'help') {
    showInlineHelp()
    // Re-prompt after showing help
    return showReturningWelcome(projectRoot, phase)
  }

  return action
}

/**
 * Get the default action for a phase (used in non-TTY mode).
 */
function getDefaultAction(phase: ProjectPhase): ReturningAction {
  switch (phase) {
    case 'resume-prd':
      return 'resume-prd'
    case 'execute':
      return 'execute'
    case 'create-prd':
      return 'start-prd'
    case 'init':
      return 'init'
    default:
      return 'exit'
  }
}
