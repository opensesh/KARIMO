/**
 * KARIMO Boundaries Display
 *
 * Formats file boundary patterns for terminal display.
 * Handles long lists without terminal overflow.
 */

import { getEffectiveWidth, getVisualWidth } from './text-format'

// =============================================================================
// Types
// =============================================================================

/**
 * Options for formatting boundary lists.
 */
export interface BoundariesDisplayOptions {
  /** Maximum width per line (defaults to terminal width - margins) */
  maxWidth?: number
  /** Maximum items to display before truncating (default: 15) */
  maxItems?: number
  /** Indentation for wrapped content (default: 2) */
  wrapIndent?: number
  /** Use vertical list format (default: auto based on count) */
  useVerticalList?: boolean
}

// =============================================================================
// Constants
// =============================================================================

/** Default maximum items before truncation */
const DEFAULT_MAX_ITEMS = 15

/** Threshold for switching to vertical list */
const VERTICAL_LIST_THRESHOLD = 5

/** Default wrap indent */
const DEFAULT_WRAP_INDENT = 2

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format a list of boundary patterns for terminal display.
 *
 * For short lists (<=5 items): inline format with comma separation
 * For longer lists: vertical list with dash prefixes
 *
 * @param patterns - Array of file patterns
 * @param options - Display options
 * @returns Formatted string
 */
export function formatBoundaryList(
  patterns: string[],
  options: BoundariesDisplayOptions = {}
): string {
  const { maxItems = DEFAULT_MAX_ITEMS, wrapIndent = DEFAULT_WRAP_INDENT } = options

  if (patterns.length === 0) {
    return 'none'
  }

  // Determine display format
  const useVertical =
    options.useVerticalList !== undefined
      ? options.useVerticalList
      : patterns.length > VERTICAL_LIST_THRESHOLD

  // Calculate effective width
  const maxWidth = options.maxWidth ?? getEffectiveWidth(2)

  // Truncate if needed
  const displayPatterns = patterns.slice(0, maxItems)
  const truncatedCount = patterns.length - displayPatterns.length

  if (useVertical) {
    return formatVerticalList(displayPatterns, truncatedCount, wrapIndent)
  }
  return formatInlineList(displayPatterns, truncatedCount, maxWidth, wrapIndent)
}

/**
 * Format patterns as a vertical list with dash prefixes.
 */
function formatVerticalList(patterns: string[], truncatedCount: number, indent: number): string {
  const indentStr = ' '.repeat(indent)
  const lines = patterns.map((pattern) => `${indentStr}- ${pattern}`)

  if (truncatedCount > 0) {
    lines.push(`${indentStr}  ... and ${truncatedCount} more`)
  }

  return lines.join('\n')
}

/**
 * Format patterns as inline comma-separated list with wrapping.
 */
function formatInlineList(
  patterns: string[],
  truncatedCount: number,
  maxWidth: number,
  indent: number
): string {
  const joined = patterns.join(', ')

  if (truncatedCount > 0) {
    const suffix = ` ... and ${truncatedCount} more`
    const fullText = joined + suffix

    // Check if it needs wrapping
    if (getVisualWidth(fullText) <= maxWidth) {
      return fullText
    }

    // Wrap with indentation
    return wrapInlineList(patterns, truncatedCount, maxWidth, indent)
  }

  // Check if it fits on one line
  if (getVisualWidth(joined) <= maxWidth) {
    return joined
  }

  // Wrap with indentation
  return wrapInlineList(patterns, truncatedCount, maxWidth, indent)
}

/**
 * Wrap inline list with proper indentation.
 */
function wrapInlineList(
  patterns: string[],
  truncatedCount: number,
  maxWidth: number,
  indent: number
): string {
  const indentStr = ' '.repeat(indent)
  const lines: string[] = []
  let currentLine = ''

  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i] ?? ''
    const separator = i === 0 ? '' : ', '
    const addition = separator + pattern

    const testLine = currentLine + addition
    const testWidth = getVisualWidth(testLine)

    if (testWidth > maxWidth && currentLine.length > 0) {
      // Line would overflow, start a new line
      lines.push(currentLine)
      currentLine = indentStr + pattern
    } else {
      currentLine = testLine
    }
  }

  // Add any remaining content
  if (currentLine) {
    if (truncatedCount > 0) {
      const suffix = `, ... and ${truncatedCount} more`
      if (getVisualWidth(currentLine + suffix) > maxWidth) {
        lines.push(currentLine)
        lines.push(`${indentStr}... and ${truncatedCount} more`)
      } else {
        lines.push(currentLine + suffix)
      }
    } else {
      lines.push(currentLine)
    }
  }

  return lines.join('\n')
}

/**
 * Format complete boundaries section for p.note display.
 *
 * @param neverTouch - Patterns for never_touch
 * @param requireReview - Patterns for require_review
 * @param options - Display options
 * @returns Formatted string for p.note content
 */
export function formatBoundariesDisplay(
  neverTouch: string[],
  requireReview: string[],
  options: BoundariesDisplayOptions = {}
): string {
  const lines: string[] = ['Protect critical files from agent modifications.']

  // Format never_touch section
  if (neverTouch.length > 0) {
    const useVertical = neverTouch.length > VERTICAL_LIST_THRESHOLD
    if (useVertical) {
      lines.push('')
      lines.push('never_touch:')
      lines.push(formatBoundaryList(neverTouch, { ...options, useVerticalList: true }))
    } else {
      lines.push(`never_touch: ${formatBoundaryList(neverTouch, options)}`)
    }
  } else {
    lines.push('never_touch: none')
  }

  // Format require_review section
  if (requireReview.length > 0) {
    const useVertical = requireReview.length > VERTICAL_LIST_THRESHOLD
    if (useVertical) {
      lines.push('')
      lines.push('require_review:')
      lines.push(formatBoundaryList(requireReview, { ...options, useVerticalList: true }))
    } else {
      lines.push(`require_review: ${formatBoundaryList(requireReview, options)}`)
    }
  } else {
    lines.push('require_review: none')
  }

  return lines.join('\n')
}

/**
 * Truncate a long pattern to fit within a maximum width.
 *
 * @param pattern - File pattern to truncate
 * @param maxWidth - Maximum width
 * @returns Truncated pattern with ellipsis if needed
 */
export function truncatePattern(pattern: string, maxWidth: number): string {
  if (getVisualWidth(pattern) <= maxWidth) {
    return pattern
  }

  const ellipsis = '...'
  const targetWidth = maxWidth - ellipsis.length

  if (targetWidth <= 0) {
    return ellipsis.slice(0, maxWidth)
  }

  // Find a good truncation point
  // Prefer truncating from the beginning for paths
  if (pattern.includes('/')) {
    // Path-like pattern: truncate from the beginning
    const parts = pattern.split('/')
    let result = ''

    for (let i = parts.length - 1; i >= 0; i--) {
      const test = parts.slice(i).join('/')
      if (getVisualWidth(ellipsis + test) <= maxWidth) {
        result = ellipsis + test
      } else {
        break
      }
    }

    if (result) {
      return result
    }
  }

  // Simple truncation from end
  let result = ''
  for (const char of pattern) {
    if (getVisualWidth(result + char + ellipsis) > maxWidth) {
      break
    }
    result += char
  }

  return result + ellipsis
}
