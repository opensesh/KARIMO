/**
 * KARIMO Input Sanitizer
 *
 * Sanitize user input for terminal display within clack prompts.
 *
 * CRITICAL: Does NOT modify what gets sent to the agent.
 * The agent always receives the original, unmodified text.
 * This only affects how the text renders in the terminal UI.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Processed user input with original and display versions.
 */
export interface ProcessedInput {
  /** Original raw text, untouched, for sending to the agent */
  original: string
  /** Sanitized display text, for terminal rendering */
  display: string
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Line separator for collapsed display.
 * Uses box drawing character for visual clarity.
 */
const LINE_SEPARATOR = ' │ '

/**
 * Maximum lines to show in display mode before joining.
 * If content exceeds this, we join with separators.
 */
const MAX_DISPLAY_LINES = 5

// =============================================================================
// Sanitization
// =============================================================================

/**
 * Sanitize text for safe terminal display.
 *
 * This prevents clack from mishandling numbered/bulleted lists by:
 * - Normalizing line endings
 * - Collapsing excessive whitespace
 * - Joining multi-line content with visible separators for short content
 * - Preserving structure for longer content (handled by collapsible)
 *
 * @param input - Raw user input
 * @returns Sanitized display text
 */
export function sanitizeForDisplay(input: string): string {
  let result = input

  // 1. Normalize line endings (CRLF/CR → LF)
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 2. Collapse multiple consecutive newlines into double newline (paragraph break)
  result = result.replace(/\n{3,}/g, '\n\n')

  // 3. Remove leading/trailing whitespace from each line
  result = result
    .split('\n')
    .map((line) => line.trim())
    .join('\n')

  // 4. Escape problematic characters that may confuse clack's rendering
  // Specifically, numbered lists like "1." at start of line
  result = escapeListMarkers(result)

  return result.trim()
}

/**
 * Escape list markers that confuse clack's rendering.
 *
 * This replaces leading number+period patterns and bullet characters
 * with visually similar but safe alternatives.
 *
 * @param input - Text to escape
 * @returns Text with escaped list markers
 */
function escapeListMarkers(input: string): string {
  return input
    .split('\n')
    .map((line) => {
      // Replace leading "1. " style numbered lists with "1) "
      // This prevents clack from misinterpreting the text
      const numberedMatch = line.match(/^(\d+)\.\s/)
      if (numberedMatch) {
        return line.replace(/^(\d+)\.\s/, '$1) ')
      }

      // Replace leading bullet markers with consistent dash
      if (/^[•◦▪▸►]\s/.test(line)) {
        return line.replace(/^[•◦▪▸►]\s/, '- ')
      }

      return line
    })
    .join('\n')
}

/**
 * Create a flattened single-line preview for very long content.
 *
 * Used when content is too long to display in expanded form within clack.
 *
 * @param input - Text to flatten
 * @param maxLength - Maximum length of preview
 * @returns Flattened preview text
 */
export function createFlattenedPreview(input: string, maxLength = 100): string {
  const sanitized = sanitizeForDisplay(input)
  const lines = sanitized
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, MAX_DISPLAY_LINES)

  if (lines.length === 0) {
    return ''
  }

  if (lines.length === 1) {
    const line = lines[0] ?? ''
    if (line.length <= maxLength) {
      return line
    }
    return `${line.slice(0, maxLength - 3)}...`
  }

  // Join with separator
  const joined = lines.join(LINE_SEPARATOR)
  if (joined.length <= maxLength) {
    return joined
  }

  return `${joined.slice(0, maxLength - 3)}...`
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Process user input into original (for agent) and display (for terminal) versions.
 *
 * This is the main entry point for input sanitization.
 *
 * @param raw - Raw user input from p.text()
 * @returns ProcessedInput with original and display versions
 */
export function processUserInput(raw: string): ProcessedInput {
  return {
    original: raw,
    display: sanitizeForDisplay(raw),
  }
}

/**
 * Check if input contains complex formatting that may break clack.
 *
 * Useful for deciding whether to apply sanitization.
 *
 * @param input - Text to check
 * @returns True if input contains potentially problematic formatting
 */
export function hasComplexFormatting(input: string): boolean {
  // Check for numbered lists (1. 2. 3.)
  if (/^\d+\.\s/m.test(input)) {
    return true
  }

  // Check for bullet points
  if (/^[-*•◦▪▸►]\s/m.test(input)) {
    return true
  }

  // Check for multiple consecutive newlines
  if (/\n{3,}/.test(input)) {
    return true
  }

  // Check for excessive line count (>5 lines)
  const lineCount = input.split('\n').filter((line) => line.trim()).length
  if (lineCount > 5) {
    return true
  }

  return false
}
