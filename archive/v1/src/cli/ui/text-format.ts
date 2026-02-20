/**
 * KARIMO Text Formatting Utilities
 *
 * ANSI-aware text wrapping for terminal output.
 * Handles streaming agent responses with proper line wrapping.
 */
import stringWidth from 'string-width'
import wrapAnsi from 'wrap-ansi'

// =============================================================================
// Constants
// =============================================================================

/** Default margin on each side (in columns) */
const DEFAULT_MARGIN = 2

/** Fallback width when terminal width cannot be determined */
const FALLBACK_WIDTH = 80

/** Minimum effective width to enforce */
const MIN_EFFECTIVE_WIDTH = 40

// =============================================================================
// Terminal Width
// =============================================================================

/**
 * Get current terminal width.
 * Falls back to 80 if unable to determine.
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || FALLBACK_WIDTH
}

/**
 * Get effective width for text output (terminal width minus margins).
 */
export function getEffectiveWidth(margin: number = DEFAULT_MARGIN): number {
  const totalMargin = margin * 2
  const effectiveWidth = getTerminalWidth() - totalMargin

  // Ensure minimum usable width
  return Math.max(effectiveWidth, MIN_EFFECTIVE_WIDTH)
}

// =============================================================================
// Text Wrapping
// =============================================================================

/**
 * Wrap text to fit terminal width with ANSI support.
 *
 * @param text - Text to wrap (may contain ANSI codes)
 * @param maxWidth - Maximum width per line (defaults to effective terminal width)
 * @returns Wrapped text
 */
export function wrapText(text: string, maxWidth?: number): string {
  const width = maxWidth ?? getEffectiveWidth()

  // wrap-ansi handles ANSI codes correctly
  return wrapAnsi(text, width, {
    hard: true, // Force break long words
    wordWrap: true, // Wrap at word boundaries
  })
}

/**
 * Wrap text with margin padding applied.
 *
 * @param text - Text to wrap
 * @param margin - Margin size in columns
 * @returns Wrapped and padded text
 */
export function wrapTextWithMargin(text: string, margin: number = DEFAULT_MARGIN): string {
  const effectiveWidth = getEffectiveWidth(margin)
  const wrapped = wrapAnsi(text, effectiveWidth, {
    hard: true,
    wordWrap: true,
  })

  // Add margin padding to each line
  const marginPad = ' '.repeat(margin)
  return wrapped
    .split('\n')
    .map((line) => `${marginPad}${line}`)
    .join('\n')
}

/**
 * Get the visual width of a string (accounting for ANSI codes).
 */
export function getVisualWidth(text: string): number {
  return stringWidth(text)
}

// =============================================================================
// Stream Renderer
// =============================================================================

/**
 * Options for stream renderer.
 */
export interface StreamRendererOptions {
  /** Margin on each side (default: 2) */
  margin?: number
  /** Maximum width per line (overrides terminal width) */
  maxWidth?: number
  /** Output function (default: process.stdout.write) */
  output?: (text: string) => void
}

/**
 * Stream renderer for handling chunked output.
 * Buffers text until complete lines are available, then wraps and outputs.
 */
export interface StreamRenderer {
  /** Process incoming chunk */
  handler: (chunk: string) => void
  /** Flush any remaining buffered content */
  flush: () => void
  /** Reset the renderer state */
  reset: () => void
}

/**
 * Create a stream renderer for chunked text output.
 *
 * The renderer buffers incoming chunks until a complete line is available
 * (ending with \n), then wraps and outputs it. This prevents mid-word
 * wrapping during streaming.
 *
 * @param options - Renderer options
 * @returns Stream renderer with handler and flush methods
 */
export function createStreamRenderer(options: StreamRendererOptions = {}): StreamRenderer {
  const {
    margin = DEFAULT_MARGIN,
    maxWidth,
    output = (text: string) => process.stdout.write(text),
  } = options

  const effectiveWidth = maxWidth ?? getEffectiveWidth(margin)
  const marginPad = ' '.repeat(margin)

  let buffer = ''

  /**
   * Wrap and output a complete line.
   */
  const outputLine = (line: string): void => {
    // Handle empty lines
    if (line === '') {
      output('\n')
      return
    }

    // Wrap the line
    const wrapped = wrapAnsi(line, effectiveWidth, {
      hard: true,
      wordWrap: true,
    })

    // Add margin to each wrapped line and output
    const wrappedLines = wrapped.split('\n')
    for (let i = 0; i < wrappedLines.length; i++) {
      const wrappedLine = wrappedLines[i] ?? ''
      output(`${marginPad}${wrappedLine}\n`)
    }
  }

  /**
   * Process a chunk, buffering until complete lines.
   */
  const handler = (chunk: string): void => {
    buffer += chunk

    // Process complete lines
    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      outputLine(line)
      newlineIndex = buffer.indexOf('\n')
    }
  }

  /**
   * Flush any remaining buffered content.
   */
  const flush = (): void => {
    if (buffer.length > 0) {
      // Output remaining buffer without newline, then add newline
      const wrapped = wrapAnsi(buffer, effectiveWidth, {
        hard: true,
        wordWrap: true,
      })

      const wrappedLines = wrapped.split('\n')
      for (let i = 0; i < wrappedLines.length; i++) {
        const line = wrappedLines[i] ?? ''
        if (i === wrappedLines.length - 1) {
          // Last line - don't add newline, let caller control that
          output(`${marginPad}${line}`)
        } else {
          output(`${marginPad}${line}\n`)
        }
      }

      buffer = ''
    }
  }

  /**
   * Reset the renderer state.
   */
  const reset = (): void => {
    buffer = ''
  }

  return { handler, flush, reset }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Truncate text to fit width, adding ellipsis if needed.
 *
 * @param text - Text to truncate
 * @param maxWidth - Maximum width
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 */
export function truncateText(text: string, maxWidth: number, suffix = '...'): string {
  const textWidth = getVisualWidth(text)

  if (textWidth <= maxWidth) {
    return text
  }

  const suffixWidth = getVisualWidth(suffix)
  const targetWidth = maxWidth - suffixWidth

  if (targetWidth <= 0) {
    return suffix.slice(0, maxWidth)
  }

  // Simple character-by-character truncation (ANSI-aware)
  let result = ''
  let currentWidth = 0

  for (const char of text) {
    const charWidth = getVisualWidth(char)
    if (currentWidth + charWidth > targetWidth) {
      break
    }
    result += char
    currentWidth += charWidth
  }

  return result + suffix
}

/**
 * Center text within a given width.
 *
 * @param text - Text to center
 * @param width - Total width to center within
 * @returns Centered text with padding
 */
export function centerText(text: string, width?: number): string {
  const targetWidth = width ?? getTerminalWidth()
  const textWidth = getVisualWidth(text)

  if (textWidth >= targetWidth) {
    return text
  }

  const totalPadding = targetWidth - textWidth
  const leftPad = Math.floor(totalPadding / 2)
  const rightPad = totalPadding - leftPad

  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
}

/**
 * Create a horizontal rule/divider.
 *
 * @param char - Character to use (default: '─')
 * @param width - Width (defaults to effective terminal width)
 * @returns Divider string
 */
export function createDivider(char = '─', width?: number): string {
  const targetWidth = width ?? getEffectiveWidth()
  return char.repeat(targetWidth)
}
