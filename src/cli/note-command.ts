/**
 * Note Command
 *
 * Captures dogfooding notes with tags for later analysis.
 * Notes are appended to .karimo/dogfood.log in a human-readable format.
 *
 * Usage:
 *   karimo note "message"              # [NOTE] tag (default)
 *   karimo note --tag BUG "message"    # [BUG] tag
 *   karimo note -t FRICTION "message"  # Short flag
 */
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'

// =============================================================================
// Types
// =============================================================================

/**
 * Supported note tags.
 */
export type NoteTag = 'NOTE' | 'BUG' | 'UX' | 'FRICTION' | 'IDEA'

/**
 * Valid tags list for validation.
 */
const VALID_TAGS: NoteTag[] = ['NOTE', 'BUG', 'UX', 'FRICTION', 'IDEA']

/**
 * Options for the note command.
 */
export interface NoteOptions {
  projectRoot: string
  tag: NoteTag
  message: string
}

// =============================================================================
// Constants
// =============================================================================

const DOGFOOD_FILE = 'dogfood.log'
const KARIMO_DIR = '.karimo'

// =============================================================================
// Argument Parsing
// =============================================================================

/**
 * Parse note command arguments.
 *
 * Handles:
 *   karimo note "message"
 *   karimo note --tag BUG "message"
 *   karimo note -t FRICTION "message"
 */
export function parseNoteArgs(args: string[]): { tag: NoteTag; message: string } | null {
  let tag: NoteTag = 'NOTE'
  const messageTokens: string[] = []

  let i = 0
  while (i < args.length) {
    const arg = args[i]

    if (arg === '--tag' || arg === '-t') {
      const tagValue = args[i + 1]
      if (tagValue !== undefined) {
        const upperTag = tagValue.toUpperCase()
        if (isValidTag(upperTag)) {
          tag = upperTag
          i += 2
          continue
        } else {
          // Invalid tag - treat as part of message
          messageTokens.push(arg)
          i++
          continue
        }
      }
    } else if (arg?.startsWith('--tag=')) {
      const tagValue = arg.slice(6).toUpperCase()
      if (isValidTag(tagValue)) {
        tag = tagValue
        i++
        continue
      }
    } else if (arg?.startsWith('-t=')) {
      const tagValue = arg.slice(3).toUpperCase()
      if (isValidTag(tagValue)) {
        tag = tagValue
        i++
        continue
      }
    } else if (arg !== undefined) {
      messageTokens.push(arg)
    }

    i++
  }

  const message = messageTokens.join(' ').trim()

  if (!message) {
    return null
  }

  return { tag, message }
}

/**
 * Type guard for valid tags.
 */
function isValidTag(value: string): value is NoteTag {
  return VALID_TAGS.includes(value as NoteTag)
}

// =============================================================================
// Command Handler
// =============================================================================

/**
 * Handle the note command.
 */
export async function handleNote(options: NoteOptions): Promise<void> {
  const { projectRoot, tag, message } = options

  // Ensure .karimo directory exists
  const karimoDir = join(projectRoot, KARIMO_DIR)
  if (!existsSync(karimoDir)) {
    mkdirSync(karimoDir, { recursive: true })
  }

  // Format the log entry
  const timestamp = new Date().toISOString()
  const logEntry = `[${timestamp}] [${tag}] ${message}\n`

  // Append to dogfood.log
  const logPath = join(karimoDir, DOGFOOD_FILE)
  appendFileSync(logPath, logEntry, 'utf-8')

  // Show success message
  p.log.success(`Note captured: [${tag}]`)
}

/**
 * Print help for the note command.
 */
export function printNoteHelp(): void {
  console.log(`
Usage: karimo note [options] <message>

Capture dogfooding notes for later analysis.

Options:
  --tag, -t <TAG>   Tag the note (default: NOTE)

Supported tags:
  NOTE      General observation (default)
  BUG       Something broken
  UX        User experience issue
  FRICTION  Something that slowed you down
  IDEA      Feature idea or improvement

Examples:
  karimo note "The init flow was smooth"
  karimo note --tag BUG "Config validation missed a required field"
  karimo note -t FRICTION "Had to restart after timeout"

Notes are saved to: .karimo/dogfood.log
`)
}
