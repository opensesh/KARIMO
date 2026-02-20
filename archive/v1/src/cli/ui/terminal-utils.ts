/**
 * KARIMO Terminal Utilities
 *
 * ANSI terminal control for cursor positioning, screen clearing,
 * and environment detection for animation support.
 */

// =============================================================================
// ANSI Escape Sequences
// =============================================================================

/** ESC character for ANSI sequences */
const ESC = '\x1b'

/** Control Sequence Introducer */
const CSI = `${ESC}[`

// =============================================================================
// Cursor Control
// =============================================================================

/**
 * Hide the terminal cursor.
 */
export function hideCursor(): void {
  process.stdout.write(`${CSI}?25l`)
}

/**
 * Show the terminal cursor.
 */
export function showCursor(): void {
  process.stdout.write(`${CSI}?25h`)
}

/**
 * Move cursor to specific position (1-indexed).
 *
 * @param row - Row number (1-indexed)
 * @param col - Column number (1-indexed)
 */
export function moveCursor(row: number, col: number): void {
  process.stdout.write(`${CSI}${row};${col}H`)
}

/**
 * Move cursor to home position (top-left).
 */
export function moveCursorHome(): void {
  process.stdout.write(`${CSI}H`)
}

/**
 * Move cursor up by n lines.
 */
export function moveCursorUp(n: number): void {
  if (n > 0) {
    process.stdout.write(`${CSI}${n}A`)
  }
}

/**
 * Move cursor down by n lines.
 */
export function moveCursorDown(n: number): void {
  if (n > 0) {
    process.stdout.write(`${CSI}${n}B`)
  }
}

/**
 * Save current cursor position.
 */
export function saveCursorPosition(): void {
  process.stdout.write(`${ESC}7`)
}

/**
 * Restore saved cursor position.
 */
export function restoreCursorPosition(): void {
  process.stdout.write(`${ESC}8`)
}

// =============================================================================
// Screen Control
// =============================================================================

/**
 * Clear the entire screen.
 */
export function clearScreen(): void {
  process.stdout.write(`${CSI}2J`)
  moveCursorHome()
}

/**
 * Clear from cursor to end of screen.
 */
export function clearToEndOfScreen(): void {
  process.stdout.write(`${CSI}0J`)
}

/**
 * Clear from cursor to end of line.
 */
export function clearToEndOfLine(): void {
  process.stdout.write(`${CSI}0K`)
}

/**
 * Clear entire line.
 */
export function clearLine(): void {
  process.stdout.write(`${CSI}2K`)
}

/**
 * Enter alternate screen buffer (preserves scrollback).
 */
export function enterAlternateScreen(): void {
  process.stdout.write(`${CSI}?1049h`)
}

/**
 * Exit alternate screen buffer (restores previous content).
 */
export function exitAlternateScreen(): void {
  process.stdout.write(`${CSI}?1049l`)
}

// =============================================================================
// Terminal Size
// =============================================================================

/**
 * Get current terminal dimensions.
 */
export function getTerminalSize(): { columns: number; rows: number } {
  return {
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  }
}

/**
 * Check if terminal is large enough for animation.
 * Requires at least 80 columns and 30 rows.
 */
export function isTerminalLargeEnough(): boolean {
  const { columns, rows } = getTerminalSize()
  return columns >= 80 && rows >= 30
}

// =============================================================================
// Environment Detection
// =============================================================================

/**
 * Check if running in a TTY (interactive terminal).
 */
export function isTTY(): boolean {
  return process.stdout.isTTY === true
}

/**
 * Check if running in a CI environment.
 */
export function isCI(): boolean {
  return (
    process.env['CI'] === 'true' ||
    process.env['CI'] === '1' ||
    process.env['CONTINUOUS_INTEGRATION'] === 'true' ||
    process.env['GITHUB_ACTIONS'] === 'true' ||
    process.env['JENKINS_URL'] !== undefined ||
    process.env['TRAVIS'] === 'true' ||
    process.env['CIRCLECI'] === 'true' ||
    process.env['GITLAB_CI'] === 'true'
  )
}

/**
 * Check if terminal supports color output.
 */
export function supportsColor(): boolean {
  // Explicit disable
  if (process.env['NO_COLOR'] !== undefined) {
    return false
  }

  // Explicit enable
  if (process.env['FORCE_COLOR'] !== undefined) {
    return true
  }

  // Check if TTY
  if (!isTTY()) {
    return false
  }

  // Check TERM
  const term = process.env['TERM'] ?? ''
  if (term === 'dumb') {
    return false
  }

  return true
}

/**
 * Check if animation should run.
 * Returns false in CI, non-TTY, or small terminals.
 */
export function canRunAnimation(): boolean {
  if (isCI()) {
    return false
  }

  if (!isTTY()) {
    return false
  }

  if (!isTerminalLargeEnough()) {
    return false
  }

  return true
}

// =============================================================================
// Raw Mode
// =============================================================================

/**
 * Enable raw mode for keypress detection.
 * Returns cleanup function.
 */
export function enableRawMode(): () => void {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
  }

  return () => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false)
      process.stdin.pause()
    }
  }
}

// =============================================================================
// Keypress Detection
// =============================================================================

/**
 * Wait for any keypress.
 * Returns the key pressed (or 'enter' for Enter, 'escape' for Ctrl+C).
 */
export function waitForKeypress(): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      // Not a TTY, resolve immediately
      resolve('enter')
      return
    }

    const cleanup = enableRawMode()

    const onData = (key: string): void => {
      cleanup()
      process.stdin.removeListener('data', onData)

      // Handle special keys
      if (key === '\u0003') {
        // Ctrl+C
        resolve('ctrl+c')
      } else if (key === '\r' || key === '\n') {
        // Enter
        resolve('enter')
      } else if (key === '\u001b') {
        // Escape
        resolve('escape')
      } else {
        resolve(key)
      }
    }

    process.stdin.on('data', onData)
  })
}

// =============================================================================
// Write Utilities
// =============================================================================

/**
 * Write content to stdout without newline.
 */
export function write(content: string): void {
  process.stdout.write(content)
}

/**
 * Write content to stdout with newline.
 */
export function writeLine(content: string): void {
  process.stdout.write(`${content}\n`)
}

/**
 * Write multiple lines at once (buffered for performance).
 */
export function writeLines(lines: string[]): void {
  process.stdout.write(`${lines.join('\n')}\n`)
}

/**
 * Write a frame (complete screen redraw).
 * Moves to home position and writes all lines.
 */
export function writeFrame(lines: string[]): void {
  moveCursorHome()
  process.stdout.write(lines.join('\n'))
  clearToEndOfScreen()
}
