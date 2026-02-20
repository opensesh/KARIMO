/**
 * KARIMO Compact Banner
 *
 * Condensed 3-line ASCII wordmark for returning user welcome screen.
 * Uses Unicode block characters for a modern, compact look.
 */

import { BOLD, OR, RST } from './colors'
import { isTTY } from './terminal-utils'

// =============================================================================
// Compact Wordmark
// =============================================================================

/**
 * Compact 3-line ASCII wordmark using Unicode blocks.
 * ~40 chars wide for minimal vertical space.
 */
export const COMPACT_WORDMARK_LINES = [
  '█▄▀ ▄▀▄ █▀▄ █ █▄ ▄█ █▀█',
  '█ █ █▀█ █▀▄ █ █ ▀ █ █ █',
  '▀ ▀ ▀ ▀ ▀ ▀ ▀ ▀   ▀ ▀▀▀',
]

/**
 * ASCII fallback for terminals without Unicode support.
 * Uses simple ASCII characters that render universally.
 */
export const ASCII_FALLBACK_LINES = [
  'K   A   R   I   M   O',
  '|  /|\\  |_) |  |\\/|  |_|',
  '| / | \\ | \\ | |  |   |_|',
]

// =============================================================================
// Rendering
// =============================================================================

/**
 * Check if the terminal likely supports Unicode block characters.
 * Checks for UTF-8 locale or known good terminal emulators.
 */
export function supportsUnicodeBlocks(): boolean {
  // Check locale settings
  const lang = process.env['LANG'] ?? ''
  const lcAll = process.env['LC_ALL'] ?? ''
  const hasUtf8 = lang.toLowerCase().includes('utf') || lcAll.toLowerCase().includes('utf')

  // Check terminal type (common terminals with good Unicode support)
  const term = process.env['TERM'] ?? ''
  const termProgram = process.env['TERM_PROGRAM'] ?? ''
  const knownGood =
    term.includes('xterm') ||
    term.includes('256color') ||
    term.includes('kitty') ||
    term.includes('alacritty') ||
    termProgram.includes('iTerm') ||
    termProgram.includes('Apple_Terminal') ||
    termProgram.includes('vscode')

  return hasUtf8 || knownGood
}

/**
 * Get the appropriate wordmark lines based on terminal capabilities.
 */
export function getCompactWordmarkLines(): string[] {
  const lines = supportsUnicodeBlocks() ? COMPACT_WORDMARK_LINES : ASCII_FALLBACK_LINES
  return lines
}

/**
 * Get colored compact wordmark lines.
 * Renders in Aperol orange (OR) with bold formatting.
 */
export function getColoredCompactWordmark(): string[] {
  const lines = getCompactWordmarkLines()
  return lines.map((line) => `${OR}${BOLD}${line}${RST}`)
}

/**
 * Render the compact banner to stdout.
 * Includes top padding for visual separation.
 */
export function renderCompactBanner(): void {
  if (!isTTY()) {
    // Non-TTY: skip visual banner
    return
  }

  const lines = getColoredCompactWordmark()

  // Print with padding
  console.log()
  for (const line of lines) {
    console.log(line)
  }
}

/**
 * Get the compact banner as a single string.
 * Useful for composing with other content.
 */
export function getCompactBannerString(): string {
  const lines = getColoredCompactWordmark()
  return ['', ...lines].join('\n')
}
