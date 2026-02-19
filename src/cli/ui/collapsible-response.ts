/**
 * KARIMO Collapsible Response
 *
 * Renders user responses as collapsible sections with Ctrl+O toggle.
 * Long submissions (>5 lines) show collapsed preview, short ones display fully.
 */

import { DIM, GYD, RST } from './colors'
import type { ProcessedInput } from './input-sanitizer'
import { clearLine, isTTY, moveCursorUp, write } from './terminal-utils'
import { getEffectiveWidth, getVisualWidth, wrapTextWithMargin } from './text-format'

// =============================================================================
// Types
// =============================================================================

/**
 * State of a single collapsible section.
 */
export interface CollapsibleState {
  /** Unique submission ID */
  id: number
  /** Original text content */
  fullContent: string
  /** Current expanded/collapsed state */
  isExpanded: boolean
  /** Total lines in full content */
  lineCount: number
  /** Lines shown when collapsed */
  previewLineCount: number
  /** Current rendered line count on screen */
  renderedLines: number
}

/**
 * Options for collapsible renderer.
 */
export interface CollapsibleOptions {
  /** Lines to show in preview (default: 3) */
  previewLines?: number
  /** Minimum lines to trigger collapse (default: 5) */
  collapseThreshold?: number
  /** Margin on each side (default: 2) */
  margin?: number
}

/**
 * Collapsible renderer for user responses.
 */
export interface CollapsibleRenderer {
  /**
   * Render input as collapsible (auto-collapses previous).
   * Accepts either a raw string or a ProcessedInput object.
   * When ProcessedInput is provided:
   * - display text is used for terminal rendering
   * - original text is stored for expand/collapse
   */
  render: (input: string | ProcessedInput) => void
  /** Toggle the most recent submission */
  toggleLast: () => void
  /** Collapse all expanded sections */
  collapseAll: () => void
  /** Get current state of last submission */
  getLastState: () => CollapsibleState | null
  /** Clear all tracked state */
  cleanup: () => void
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PREVIEW_LINES = 3
const DEFAULT_COLLAPSE_THRESHOLD = 5
const DEFAULT_MARGIN = 2

// =============================================================================
// Line Counting
// =============================================================================

/**
 * Count visual lines needed to display text at given width.
 * Accounts for ANSI codes and word wrapping.
 */
function countVisualLines(text: string, width: number): number {
  const lines = text.split('\n')
  let totalLines = 0

  for (const line of lines) {
    if (line.length === 0) {
      totalLines += 1
      continue
    }

    // Calculate visual width and how many display lines this needs
    const visualWidth = getVisualWidth(line)
    const linesNeeded = Math.ceil(visualWidth / width) || 1
    totalLines += linesNeeded
  }

  return totalLines
}

/**
 * Get first N lines from text.
 */
function getFirstLines(text: string, n: number): string[] {
  return text.split('\n').slice(0, n)
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Create separator line.
 */
function createSeparator(width: number): string {
  return '─'.repeat(width)
}

/**
 * Render collapsed view.
 */
function renderCollapsedView(
  state: CollapsibleState,
  previewLines: number,
  margin: number
): string[] {
  const effectiveWidth = getEffectiveWidth(margin)
  const marginPad = ' '.repeat(margin)
  const lines: string[] = []

  // Get preview lines
  const preview = getFirstLines(state.fullContent, previewLines)
  for (const line of preview) {
    // Wrap each line and add margin + dim styling
    const wrapped = wrapTextWithMargin(line, margin)
    const wrappedLines = wrapped.split('\n')
    for (const wl of wrappedLines) {
      lines.push(`${DIM}${wl}${RST}`)
    }
  }

  // Separator
  lines.push(`${marginPad}${GYD}${createSeparator(effectiveWidth)}${RST}`)

  // Hint with remaining line count
  const remainingLines = state.lineCount - previewLines
  const hint = `ctrl+o to expand (${remainingLines} more line${remainingLines !== 1 ? 's' : ''})`
  lines.push(`${marginPad}${GYD}${hint}${RST}`)

  return lines
}

/**
 * Render expanded view.
 */
function renderExpandedView(state: CollapsibleState, margin: number): string[] {
  const effectiveWidth = getEffectiveWidth(margin)
  const marginPad = ' '.repeat(margin)
  const lines: string[] = []

  // Full content with wrapping
  const wrapped = wrapTextWithMargin(state.fullContent, margin)
  const wrappedLines = wrapped.split('\n')
  for (const wl of wrappedLines) {
    lines.push(`${DIM}${wl}${RST}`)
  }

  // Separator
  lines.push(`${marginPad}${GYD}${createSeparator(effectiveWidth)}${RST}`)

  // Toggle hint
  lines.push(`${marginPad}${GYD}ctrl+o to collapse${RST}`)

  return lines
}

/**
 * Render non-collapsible short text.
 */
function renderShortText(text: string, margin: number): string[] {
  const wrapped = wrapTextWithMargin(text, margin)
  const wrappedLines = wrapped.split('\n')
  return wrappedLines.map((line) => `${DIM}${line}${RST}`)
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a collapsible renderer instance.
 *
 * After p.text() returns and clack renders the submitted text,
 * call render(input) to replace clack's output with our collapsible view.
 *
 * Usage:
 * ```typescript
 * const collapsible = createCollapsibleRenderer()
 * const keypress = createKeypressManager()
 *
 * while (loop) {
 *   keypress.deactivate()
 *   const input = await p.text({ ... })
 *   collapsible.render(input)
 *   keypress.activate([{ key: 'ctrl+o', callback: () => collapsible.toggleLast() }])
 *   keypress.pause()
 *   // ... streaming ...
 *   keypress.resume()
 * }
 * ```
 */
export function createCollapsibleRenderer(options: CollapsibleOptions = {}): CollapsibleRenderer {
  const {
    previewLines = DEFAULT_PREVIEW_LINES,
    collapseThreshold = DEFAULT_COLLAPSE_THRESHOLD,
    margin = DEFAULT_MARGIN,
  } = options

  // Track all sections (for potential future multi-section expansion)
  // Currently only track the last one for toggling
  let sections: CollapsibleState[] = []
  let nextId = 1

  /**
   * Calculate how many lines clack rendered for this input.
   * This is based on the text wrapping at terminal width.
   */
  function estimateClackOutputLines(text: string): number {
    const effectiveWidth = getEffectiveWidth(margin)
    const lines = text.split('\n')
    let total = 0

    for (const line of lines) {
      if (line.length === 0) {
        total += 1
        continue
      }
      const visualWidth = getVisualWidth(line)
      total += Math.ceil(visualWidth / effectiveWidth) || 1
    }

    // Clack adds the submitted text on the same line after the prompt,
    // which means the first line doesn't get a new line before it.
    // Add safety buffer of 1 line
    return total + 1
  }

  /**
   * Clear N lines from cursor position going up.
   */
  function clearLines(count: number): void {
    for (let i = 0; i < count; i++) {
      moveCursorUp(1)
      clearLine()
    }
  }

  /**
   * Write lines to stdout.
   */
  function writeLines(lines: string[]): void {
    for (const line of lines) {
      write(`${line}\n`)
    }
  }

  /**
   * Collapse all expanded sections.
   * Called automatically when render() is invoked.
   */
  function collapseAll(): void {
    for (const section of sections) {
      if (section.isExpanded && section.lineCount > collapseThreshold) {
        // Clear current rendered lines
        clearLines(section.renderedLines)

        // Render collapsed view
        const lines = renderCollapsedView(section, previewLines, margin)
        writeLines(lines)

        section.isExpanded = false
        section.renderedLines = lines.length
      }
    }
  }

  /**
   * Extract original and display text from input.
   * Handles both raw string and ProcessedInput objects.
   */
  function extractContent(input: string | ProcessedInput): {
    original: string
    display: string
  } {
    if (typeof input === 'string') {
      return { original: input, display: input }
    }
    return { original: input.original, display: input.display }
  }

  /**
   * Render a new user input as collapsible.
   * Replaces clack's output with our styled view.
   */
  function render(input: string | ProcessedInput): void {
    const { original, display } = extractContent(input)

    // Skip in non-TTY environments
    if (!isTTY()) {
      renderNonTTY(original)
      return
    }

    // Auto-collapse any previously expanded sections
    collapseAll()

    // Count lines in display text (what we show collapsed)
    // But use original for line estimation since clack rendered the original
    const effectiveWidth = getEffectiveWidth(margin)
    const lineCount = countVisualLines(original, effectiveWidth)

    // Estimate and clear clack's output (based on original since that's what clack rendered)
    const clackLines = estimateClackOutputLines(original)
    clearLines(clackLines)

    // Create state for this submission
    // Store original for expand/collapse toggle (display is only for initial render)
    const state: CollapsibleState = {
      id: nextId++,
      fullContent: original,
      isExpanded: false,
      lineCount,
      previewLineCount: previewLines,
      renderedLines: 0,
    }

    // Render based on line count
    // Use display text for the rendered view
    let outputLines: string[]
    if (lineCount <= collapseThreshold) {
      // Short text - show fully, no collapse mechanism
      outputLines = renderShortText(display, margin)
      // Mark as "expanded" to indicate full content is shown
      state.isExpanded = true
    } else {
      // Long text - show collapsed (uses state.fullContent internally)
      outputLines = renderCollapsedView(state, previewLines, margin)
    }

    // Write output
    writeLines(outputLines)
    state.renderedLines = outputLines.length

    // Track this section
    sections.push(state)
  }

  /**
   * Render in non-TTY mode (pipes, CI).
   * Shows truncated preview with note about scrollback.
   */
  function renderNonTTY(input: string): void {
    const effectiveWidth = getEffectiveWidth(margin)
    const lineCount = countVisualLines(input, effectiveWidth)

    if (lineCount <= collapseThreshold) {
      // Short text - show fully
      const lines = renderShortText(input, margin)
      writeLines(lines)
    } else {
      // Long text - print full for scrollback, then show truncation indicator
      const marginPad = ' '.repeat(margin)

      // Print full text first (for scrollback access)
      const fullWrapped = wrapTextWithMargin(input, margin)
      for (const line of fullWrapped.split('\n')) {
        write(`${DIM}${line}${RST}\n`)
      }

      // Then truncation indicator
      const remainingLines = lineCount - previewLines
      write(`${marginPad}${GYD}[... ${remainingLines} more lines in scrollback]${RST}\n`)
    }
  }

  /**
   * Toggle the most recent submission between collapsed/expanded.
   */
  function toggleLast(): void {
    if (!isTTY()) {
      return
    }

    const last = sections[sections.length - 1]
    if (!last) {
      return
    }

    // Skip toggle for short texts (already fully displayed)
    if (last.lineCount <= collapseThreshold) {
      return
    }

    // Clear current rendered lines
    clearLines(last.renderedLines)

    // Toggle state and re-render
    last.isExpanded = !last.isExpanded

    let outputLines: string[]
    if (last.isExpanded) {
      outputLines = renderExpandedView(last, margin)
    } else {
      outputLines = renderCollapsedView(last, previewLines, margin)
    }

    writeLines(outputLines)
    last.renderedLines = outputLines.length
  }

  /**
   * Get state of the most recent submission.
   */
  function getLastState(): CollapsibleState | null {
    return sections[sections.length - 1] ?? null
  }

  /**
   * Clear all tracked state.
   */
  function cleanup(): void {
    sections = []
    nextId = 1
  }

  return {
    render,
    toggleLast,
    collapseAll,
    getLastState,
    cleanup,
  }
}
