/**
 * KARIMO Keypress Manager
 *
 * Safe keypress handling between prompts for Ctrl+O toggle functionality.
 * Manages raw mode lifecycle with proper pause/resume for streaming.
 */

import { isTTY } from './terminal-utils'

// =============================================================================
// Types
// =============================================================================

/**
 * Handler definition for a keypress action.
 */
export interface KeypressHandler {
  /** Key identifier (e.g., 'ctrl+o', 'ctrl+c') */
  key: string
  /** Callback to execute when key is pressed */
  callback: () => void
}

/**
 * Keypress manager for safe keyboard event handling.
 */
export interface KeypressManager {
  /** Enable raw mode and register handlers */
  activate: (handlers: KeypressHandler[]) => void
  /** Disable raw mode and clear handlers */
  deactivate: () => void
  /** Temporarily ignore keypresses (e.g., during streaming) */
  pause: () => void
  /** Resume keypress handling after pause */
  resume: () => void
  /** Check if keypress manager is currently active */
  isActive: () => boolean
  /** Check if keypress manager is currently paused */
  isPaused: () => boolean
}

// =============================================================================
// Key Detection Constants
// =============================================================================

/** Ctrl+O ASCII code (ASCII 15) */
const CTRL_O = '\x0f'

/** Ctrl+C ASCII code (ASCII 3) */
const CTRL_C = '\x03'

// =============================================================================
// Internal State
// =============================================================================

interface KeypressState {
  active: boolean
  paused: boolean
  handlers: KeypressHandler[]
  dataListener: ((data: string) => void) | null
  exitListener: (() => void) | null
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create a new keypress manager instance.
 *
 * The keypress manager enables raw mode to capture keypresses
 * between p.text() calls without interfering with clack's input handling.
 *
 * Lifecycle:
 * 1. deactivate() before p.text() - let clack handle input
 * 2. activate([handlers]) after p.text() returns - capture Ctrl+O
 * 3. pause() before agent streaming - ignore keypresses
 * 4. resume() after streaming completes - allow toggle again
 * 5. deactivate() before next p.text()
 */
export function createKeypressManager(): KeypressManager {
  const state: KeypressState = {
    active: false,
    paused: false,
    handlers: [],
    dataListener: null,
    exitListener: null,
  }

  /**
   * Parse keypress data and return normalized key identifier.
   */
  function parseKey(data: string): string | null {
    if (data === CTRL_O) {
      return 'ctrl+o'
    }
    if (data === CTRL_C) {
      return 'ctrl+c'
    }
    return null
  }

  /**
   * Enable raw mode and register keypress handlers.
   */
  function activate(handlers: KeypressHandler[]): void {
    // Skip in non-TTY environments
    if (!isTTY() || !process.stdin.isTTY) {
      return
    }

    // Already active - just update handlers
    if (state.active) {
      state.handlers = handlers
      state.paused = false
      return
    }

    state.handlers = handlers
    state.active = true
    state.paused = false

    // Create data listener
    state.dataListener = (data: string) => {
      // Ignore keypresses while paused
      if (state.paused) {
        return
      }

      const key = parseKey(data)
      if (!key) {
        return
      }

      // Handle Ctrl+C - cleanup and exit
      if (key === 'ctrl+c') {
        deactivate()
        process.exit(130) // Standard Ctrl+C exit code
        return
      }

      // Find matching handler
      const handler = state.handlers.find((h) => h.key === key)
      if (handler) {
        handler.callback()
      }
    }

    // Create exit listener for cleanup on Ctrl+C
    state.exitListener = () => {
      deactivate()
    }

    // Enable raw mode
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    // Register listeners
    process.stdin.on('data', state.dataListener)
    process.on('exit', state.exitListener)
    process.on('SIGINT', state.exitListener)
  }

  /**
   * Disable raw mode and clear handlers.
   */
  function deactivate(): void {
    if (!state.active) {
      return
    }

    // Remove listeners
    if (state.dataListener) {
      process.stdin.removeListener('data', state.dataListener)
      state.dataListener = null
    }

    if (state.exitListener) {
      process.removeListener('exit', state.exitListener)
      process.removeListener('SIGINT', state.exitListener)
      state.exitListener = null
    }

    // Disable raw mode (only if TTY)
    if (process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false)
        process.stdin.pause()
      } catch {
        // Ignore errors during cleanup
      }
    }

    state.active = false
    state.paused = false
    state.handlers = []
  }

  /**
   * Temporarily pause keypress handling.
   * Use during agent streaming to prevent accidental toggles.
   */
  function pause(): void {
    state.paused = true
  }

  /**
   * Resume keypress handling after pause.
   */
  function resume(): void {
    state.paused = false
  }

  /**
   * Check if keypress manager is active.
   */
  function isActive(): boolean {
    return state.active
  }

  /**
   * Check if keypress manager is paused.
   */
  function isPaused(): boolean {
    return state.paused
  }

  return {
    activate,
    deactivate,
    pause,
    resume,
    isActive,
    isPaused,
  }
}
