/**
 * KARIMO Long Input Handler
 *
 * Provides editor fallback for long text input.
 * Opens $EDITOR (or nano) when input exceeds threshold or user types /edit.
 */
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getVisualWidth } from './text-format'

// =============================================================================
// Constants
// =============================================================================

/** Threshold for triggering editor suggestion (characters) */
const LONG_INPUT_THRESHOLD = 500

/** Command to trigger editor mode */
const EDIT_COMMAND = '/edit'

/** Default editor if $EDITOR not set */
const DEFAULT_EDITOR = 'nano'

/** Temp file prefix */
const TEMP_FILE_PREFIX = 'karimo-input-'

// =============================================================================
// Types
// =============================================================================

/**
 * Options for long input handling.
 */
export interface LongInputOptions {
  /** Prompt to show the user */
  prompt?: string
  /** Initial content for editor */
  initialContent?: string
  /** Custom editor command */
  editor?: string
  /** Threshold for suggesting editor (default: 500) */
  threshold?: number
}

/**
 * Result of long input.
 */
export interface LongInputResult {
  /** The input text */
  text: string
  /** Whether editor was used */
  usedEditor: boolean
  /** Whether user cancelled */
  cancelled: boolean
}

// =============================================================================
// Editor Detection
// =============================================================================

/**
 * Get the editor command to use.
 */
export function getEditor(): string {
  return process.env['EDITOR'] || process.env['VISUAL'] || DEFAULT_EDITOR
}

/**
 * Check if an editor is available.
 */
export async function isEditorAvailable(editor?: string): Promise<boolean> {
  const editorCmd = editor ?? getEditor()
  const whichCmd = process.platform === 'win32' ? 'where' : 'which'

  const proc = Bun.spawn([whichCmd, editorCmd.split(' ')[0] ?? editorCmd], {
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  return exitCode === 0
}

// =============================================================================
// Long Input Detection
// =============================================================================

/**
 * Check if input should trigger editor mode.
 *
 * @param input - User input to check
 * @param threshold - Character threshold
 * @returns Whether editor mode should be triggered
 */
export function shouldUseEditor(input: string, threshold: number = LONG_INPUT_THRESHOLD): boolean {
  // Explicit command
  if (input.trim().toLowerCase() === EDIT_COMMAND) {
    return true
  }

  // Length threshold
  return input.length > threshold
}

/**
 * Check if input is the edit command.
 */
export function isEditCommand(input: string): boolean {
  return input.trim().toLowerCase() === EDIT_COMMAND
}

// =============================================================================
// Editor Mode
// =============================================================================

/**
 * Create a temporary file for editing.
 */
async function createTempFile(content = ''): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filename = `${TEMP_FILE_PREFIX}${timestamp}-${random}.md`
  const filepath = join(tmpdir(), filename)

  await Bun.write(filepath, content)
  return filepath
}

/**
 * Read and delete a temporary file.
 */
async function readAndCleanupTempFile(filepath: string): Promise<string> {
  const file = Bun.file(filepath)
  const content = await file.text()

  // Cleanup
  try {
    const fs = await import('node:fs/promises')
    await fs.unlink(filepath)
  } catch {
    // Ignore cleanup errors
  }

  return content
}

/**
 * Open editor and get user input.
 *
 * @param options - Input options
 * @returns User's edited content
 */
export async function openEditor(options: LongInputOptions = {}): Promise<LongInputResult> {
  const { initialContent = '', editor } = options

  const editorCmd = editor ?? getEditor()

  // Create temp file with initial content
  const tempPath = await createTempFile(initialContent)

  try {
    // Split editor command (handles cases like "code --wait")
    const [cmd, ...args] = editorCmd.split(' ')

    if (!cmd) {
      throw new Error('Invalid editor command')
    }

    // Spawn editor process
    const proc = Bun.spawn([cmd, ...args, tempPath], {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    })

    const exitCode = await proc.exited

    if (exitCode !== 0) {
      // Editor exited with error, but user might have saved
      // Check if file has content
    }

    // Read the content
    const text = await readAndCleanupTempFile(tempPath)

    // Check if user cancelled (empty file or just whitespace)
    const trimmed = text.trim()
    if (trimmed === '' && initialContent.trim() === '') {
      return {
        text: '',
        usedEditor: true,
        cancelled: true,
      }
    }

    return {
      text: trimmed,
      usedEditor: true,
      cancelled: false,
    }
  } catch (error) {
    // Cleanup on error
    try {
      const fs = await import('node:fs/promises')
      await fs.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }

    throw error
  }
}

/**
 * Get long input from user, with optional editor fallback.
 *
 * If user types /edit or input exceeds threshold, opens editor.
 *
 * @param prompt - Prompt to display
 * @returns User input
 */
export async function getLongInput(prompt: string): Promise<string> {
  // For now, this is a simple wrapper that checks for /edit
  // The actual prompt handling is done by @clack/prompts in the interview flow
  // This function is called after receiving input to potentially upgrade to editor

  const editor = getEditor()
  const available = await isEditorAvailable(editor)

  if (!available) {
    console.warn(`Editor '${editor}' not available. Using direct input.`)
    return ''
  }

  const result = await openEditor({
    prompt,
    initialContent: `# ${prompt}\n\n`,
  })

  if (result.cancelled) {
    return ''
  }

  // Remove the prompt comment if user left it
  let text = result.text
  const promptLine = `# ${prompt}`
  if (text.startsWith(promptLine)) {
    text = text.slice(promptLine.length).trim()
  }

  return text
}

// =============================================================================
// Input Formatting
// =============================================================================

/**
 * Format long input for display (truncated preview).
 *
 * @param input - Full input text
 * @param maxLines - Maximum lines to show
 * @returns Formatted preview
 */
export function formatInputPreview(input: string, maxLines = 5): string {
  const lines = input.split('\n')

  if (lines.length <= maxLines) {
    return input
  }

  const preview = lines.slice(0, maxLines).join('\n')
  const remaining = lines.length - maxLines

  return `${preview}\n... (${remaining} more lines)`
}

/**
 * Get input statistics.
 */
export function getInputStats(input: string): {
  chars: number
  words: number
  lines: number
  visualWidth: number
} {
  const lines = input.split('\n')
  const words = input.split(/\s+/).filter((w) => w.length > 0)

  return {
    chars: input.length,
    words: words.length,
    lines: lines.length,
    visualWidth: Math.max(...lines.map((l) => getVisualWidth(l))),
  }
}
