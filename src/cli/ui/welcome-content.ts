/**
 * KARIMO Welcome Screen Content
 *
 * Static content for the animated welcome screen including
 * the ASCII wordmark, flow diagram, level table, and section text.
 */

import { BOLD, GY, GYD, OR, ORD, RST, WH } from './colors'

// =============================================================================
// Constants
// =============================================================================

/** Version string */
export const VERSION = 'v0.1.0'

/** GitHub repository URL */
export const GITHUB_URL = 'https://github.com/opensesh/KARIMO'

// =============================================================================
// ASCII Wordmark
// =============================================================================

/**
 * KARIMO ASCII wordmark lines (without color codes).
 * Single line - never breaks across rows.
 */
export const WORDMARK_LINES = [
  '██╗  ██╗   █████╗   ██████╗   ██╗  ███╗   ███╗   ██████╗',
  '██║ ██╔╝  ██╔══██╗  ██╔══██╗  ██║  ████╗ ████║  ██╔═══██╗',
  '█████╔╝   ███████║  ██████╔╝  ██║  ██╔████╔██║  ██║   ██║',
  '██╔═██╗   ██╔══██║  ██╔══██╗  ██║  ██║╚██╔╝██║  ██║   ██║',
  '██║  ██╗  ██║  ██║  ██║  ██║  ██║  ██║ ╚═╝ ██║  ╚██████╔╝',
  '╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝  ╚═╝     ╚═╝   ╚═════╝',
]

/**
 * Get colored wordmark lines.
 */
export function getWordmarkLines(): string[] {
  return WORDMARK_LINES.map((line) => `   ${OR}${BOLD}${line}${RST}`)
}

// =============================================================================
// Header Section
// =============================================================================

/**
 * Get header lines (version and taglines).
 */
export function getHeaderLines(): string[] {
  return [
    '',
    `   ${GYD}${VERSION}${RST}`,
    `   ${WH}Open-source autonomous development framework${RST}`,
    `   ${GY}Model & Codebase Agnostic${RST}`,
    '',
  ]
}

// =============================================================================
// Divider
// =============================================================================

/**
 * Create a horizontal divider line.
 */
export function getDivider(): string {
  return ` ${ORD}${'─'.repeat(77)}${RST}`
}

// =============================================================================
// Orchestration Flow Section
// =============================================================================

/**
 * Flow diagram box characters.
 */
const BOX = {
  tl: '┌',
  tr: '┐',
  bl: '└',
  br: '┘',
  h: '─',
  v: '│',
  arrow: '→',
}

/**
 * Create a flow box with centered text.
 */
function flowBox(top: string, bottom: string): string[] {
  const width = 10
  const topPad = Math.floor((width - 2 - top.length) / 2)
  const topPadEnd = width - 2 - top.length - topPad
  const bottomPad = Math.floor((width - 2 - bottom.length) / 2)
  const bottomPadEnd = width - 2 - bottom.length - bottomPad

  return [
    `${OR}${BOX.tl}${BOX.h.repeat(width)}${BOX.tr}${RST}`,
    `${OR}${BOX.v}${RST}${' '.repeat(topPad + 1)}${WH}${top}${RST}${' '.repeat(topPadEnd + 1)}${OR}${BOX.v}${RST}`,
    `${OR}${BOX.v}${RST}${' '.repeat(bottomPad + 1)}${GY}${bottom}${RST}${' '.repeat(bottomPadEnd + 1)}${OR}${BOX.v}${RST}`,
    `${OR}${BOX.bl}${BOX.h.repeat(width)}${BOX.br}${RST}`,
  ]
}

/**
 * Get orchestration flow section lines.
 */
export function getOrchestrationFlowLines(): string[] {
  // Create the 5 flow boxes
  const boxes = [
    flowBox('Interview', '(5 rounds)'),
    flowBox('PRD File', '(generated)'),
    flowBox('Execute', '(agents)'),
    flowBox('Review', '(checks)'),
    flowBox('Merge', '(PR)'),
  ]

  // Combine boxes horizontally with arrows
  const flowLines: string[] = ['', '', '', '']
  for (let row = 0; row < 4; row++) {
    for (let box = 0; box < boxes.length; box++) {
      flowLines[row] += boxes[box][row]
      if (box < boxes.length - 1) {
        // Add arrow connector (only on middle rows)
        if (row === 1 || row === 2) {
          flowLines[row] += ` ${GYD}${BOX.arrow}${RST} `
        } else {
          flowLines[row] += '   '
        }
      }
    }
  }

  return [
    '',
    `   ${WH}${BOLD}Orchestration Flow${RST}`,
    `   ${GY}Turn product requirements into shipped code using agents,${RST}`,
    `   ${GY}automated code review, and human oversight.${RST}`,
    '',
    `   ${flowLines[0]}`,
    `   ${flowLines[1]}`,
    `   ${flowLines[2]}`,
    `   ${flowLines[3]}`,
    '',
  ]
}

// =============================================================================
// Level-Based Build Plan Section
// =============================================================================

/**
 * Level definition for the build plan.
 */
interface LevelInfo {
  code: string
  name: string
  description: string
}

/**
 * Level definitions.
 */
const LEVELS: LevelInfo[] = [
  { code: 'L0', name: 'Foundation', description: 'One agent → one PR → manual review' },
  { code: 'L1', name: 'State', description: 'GitHub Projects integration, task tracking' },
  { code: 'L2', name: 'Review', description: 'Greptile automated review, revision loops' },
  { code: 'L3', name: 'Orchestrate', description: 'Full sequential execution, overnight runs' },
  { code: 'L4', name: 'Scale', description: 'Parallel execution, fallback engines' },
  { code: 'L5', name: 'Dashboard', description: 'Visual command center, one-click merge' },
]

/**
 * Format a level row.
 */
function formatLevelRow(level: LevelInfo): string {
  const code = `${GYD}${level.code}${RST}`
  const name = `${WH}${level.name.padEnd(12)}${RST}`
  const desc = `${GY}${level.description}${RST}`
  return `   ${code} ${name}${desc}`
}

/**
 * Get level-based build plan section lines.
 */
export function getLevelPlanLines(): string[] {
  const levelRows = LEVELS.map(formatLevelRow)

  return [
    '',
    `   ${WH}${BOLD}Level-Based Build Plan${RST}`,
    `   ${GY}Each level is a validation loop for trust and code integrity.${RST}`,
    `   ${GY}Complete one before starting the next.${RST}`,
    '',
    ...levelRows,
    '',
  ]
}

// =============================================================================
// Getting Started Section
// =============================================================================

/**
 * Get getting started section lines.
 */
export function getGettingStartedLines(): string[] {
  return [
    '',
    `   ${WH}${BOLD}Getting Started${RST}`,
    `   ${GY}We'll create a config for your codebase, ensure safe usage of${RST}`,
    `   ${GY}Model API keys, and kick off your first feature PRD.${RST}`,
    '',
    `   ${GY}Learn more at${RST} ${OR}>>${RST} ${WH}${GITHUB_URL}${RST}`,
    '',
  ]
}

// =============================================================================
// Ready Prompt
// =============================================================================

/**
 * Get ready prompt line.
 *
 * @param bulletColor - Color for the bullet (for pulse effect)
 */
export function getReadyPromptLine(bulletColor: string = OR): string {
  return `   ${bulletColor}●${RST} ${WH}Ready to get started${RST} ${GY}— Press Enter to continue${RST}`
}

// =============================================================================
// Complete Screen
// =============================================================================

/**
 * Get all content lines for the complete welcome screen.
 * Used for static fallback display.
 */
export function getCompleteWelcomeLines(): string[] {
  return [
    '',
    ...getWordmarkLines(),
    ...getHeaderLines(),
    getDivider(),
    ...getOrchestrationFlowLines(),
    getDivider(),
    ...getLevelPlanLines(),
    getDivider(),
    ...getGettingStartedLines(),
    getDivider(),
    '',
    getReadyPromptLine(),
    '',
  ]
}

// =============================================================================
// Section Types
// =============================================================================

/**
 * Section identifiers for animation sequencing.
 */
export type SectionId =
  | 'wordmark'
  | 'header'
  | 'divider1'
  | 'orchestration'
  | 'divider2'
  | 'levels'
  | 'divider3'
  | 'gettingStarted'
  | 'divider4'
  | 'ready'

/**
 * Get lines for a specific section.
 */
export function getSectionLines(sectionId: SectionId): string[] {
  switch (sectionId) {
    case 'wordmark':
      return ['', ...getWordmarkLines()]
    case 'header':
      return getHeaderLines()
    case 'divider1':
    case 'divider2':
    case 'divider3':
    case 'divider4':
      return [getDivider()]
    case 'orchestration':
      return getOrchestrationFlowLines()
    case 'levels':
      return getLevelPlanLines()
    case 'gettingStarted':
      return getGettingStartedLines()
    case 'ready':
      return ['', getReadyPromptLine(), '']
    default:
      return []
  }
}

/**
 * Section order for animation.
 */
export const SECTION_ORDER: SectionId[] = [
  'wordmark',
  'header',
  'divider1',
  'orchestration',
  'divider2',
  'levels',
  'divider3',
  'gettingStarted',
  'divider4',
  'ready',
]
