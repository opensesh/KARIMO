/**
 * KARIMO Response Formatter
 *
 * Formats agent responses with terminal styling.
 * Highlights questions and converts markdown bold to terminal bold.
 */

import { BOLD, GN, RST } from './colors'

// =============================================================================
// Types
// =============================================================================

/**
 * Options for formatting agent responses.
 */
export interface ResponseFormatOptions {
  /** Highlight questions in green (default: true) */
  highlightQuestions?: boolean
  /** Convert **bold** markdown to terminal bold (default: true) */
  convertBold?: boolean
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Question starter words (case-insensitive).
 * Used to detect lines that begin questions.
 */
const QUESTION_STARTERS = [
  'what',
  'how',
  'why',
  'when',
  'where',
  'who',
  'which',
  'can',
  'could',
  'would',
  'should',
  'do',
  'does',
  'is',
  'are',
  'will',
  'have',
  'has',
  'did',
  'was',
  'were',
]

/**
 * Regex for markdown bold: **text**
 */
const BOLD_MARKDOWN_REGEX = /\*\*([^*]+)\*\*/g

// =============================================================================
// Question Detection
// =============================================================================

/**
 * Detect if a line is part of a question block.
 *
 * A line is considered a question if:
 * - It ends with a question mark
 * - It starts with a question word
 * - It's a list item following a question (continuation)
 *
 * @param line - Line to check
 * @param prevLineWasQuestion - Whether the previous line was a question
 * @returns True if the line is part of a question
 */
export function isQuestionLine(line: string, prevLineWasQuestion = false): boolean {
  const trimmed = line.trim()

  // Empty line breaks question block
  if (!trimmed) {
    return false
  }

  // Ends with question mark
  if (trimmed.endsWith('?')) {
    return true
  }

  // Starts with question word
  const lowerLine = trimmed.toLowerCase()
  for (const starter of QUESTION_STARTERS) {
    // Match "word " or "word," at start (e.g., "What is", "How, exactly")
    if (lowerLine.startsWith(`${starter} `) || lowerLine.startsWith(`${starter},`)) {
      return true
    }
  }

  // List item following a question (continuation of question block)
  // This catches patterns like:
  //   Are we:
  //   - Adding automated...
  //   - Extending tokens page...
  if (prevLineWasQuestion && /^[-*•◦▪▸►]\s/.test(trimmed)) {
    return true
  }

  // Numbered list item following a question
  if (prevLineWasQuestion && /^\d+[.)]\s/.test(trimmed)) {
    return true
  }

  return false
}

/**
 * Find all question blocks in text.
 *
 * Returns an array of [startLine, endLine] pairs (0-indexed).
 *
 * @param text - Text to analyze
 * @returns Array of question block ranges
 */
export function findQuestionBlocks(text: string): Array<[number, number]> {
  const lines = text.split('\n')
  const blocks: Array<[number, number]> = []

  let inBlock = false
  let blockStart = 0
  let prevWasQuestion = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const isQuestion = isQuestionLine(line, prevWasQuestion)

    if (isQuestion) {
      if (!inBlock) {
        // Start new block
        inBlock = true
        blockStart = i
      }
      prevWasQuestion = true
    } else {
      if (inBlock) {
        // End current block
        blocks.push([blockStart, i - 1])
        inBlock = false
      }
      prevWasQuestion = false
    }
  }

  // Handle block at end of text
  if (inBlock) {
    blocks.push([blockStart, lines.length - 1])
  }

  return blocks
}

// =============================================================================
// Markdown Conversion
// =============================================================================

/**
 * Convert markdown bold (**text**) to terminal bold.
 *
 * @param text - Text with markdown bold
 * @returns Text with terminal ANSI bold
 */
export function convertMarkdownBold(text: string): string {
  return text.replace(BOLD_MARKDOWN_REGEX, `${BOLD}$1${RST}`)
}

// =============================================================================
// Response Formatting
// =============================================================================

/**
 * Format agent response with terminal styling.
 *
 * - Questions are highlighted in green (same as clack's indicators)
 * - **bold** markdown is converted to terminal bold
 *
 * IMPORTANT: This must be run on the complete response, not during streaming.
 *
 * @param response - Complete agent response text
 * @param options - Formatting options
 * @returns Formatted response with ANSI styling
 */
export function formatAgentResponse(
  response: string,
  options: ResponseFormatOptions = {}
): string {
  const { highlightQuestions = true, convertBold = true } = options

  let result = response

  // Convert markdown bold first (before question highlighting)
  if (convertBold) {
    result = convertMarkdownBold(result)
  }

  // Highlight questions
  if (highlightQuestions) {
    result = highlightQuestionBlocks(result)
  }

  return result
}

/**
 * Highlight question blocks with green color.
 *
 * @param text - Text to process
 * @returns Text with highlighted question blocks
 */
function highlightQuestionBlocks(text: string): string {
  const lines = text.split('\n')
  const blocks = findQuestionBlocks(text)

  if (blocks.length === 0) {
    return text
  }

  // Create a set of line indices that are questions
  const questionLines = new Set<number>()
  for (const [start, end] of blocks) {
    for (let i = start; i <= end; i++) {
      questionLines.add(i)
    }
  }

  // Apply highlighting
  const outputLines: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (questionLines.has(i) && line.trim()) {
      outputLines.push(`${GN}${line}${RST}`)
    } else {
      outputLines.push(line)
    }
  }

  return outputLines.join('\n')
}

/**
 * Check if a response contains questions.
 *
 * Useful for deciding whether to apply formatting.
 *
 * @param response - Response text
 * @returns True if response contains questions
 */
export function hasQuestions(response: string): boolean {
  const blocks = findQuestionBlocks(response)
  return blocks.length > 0
}

/**
 * Count the number of question blocks in a response.
 *
 * @param response - Response text
 * @returns Number of distinct question blocks
 */
export function countQuestions(response: string): number {
  return findQuestionBlocks(response).length
}
