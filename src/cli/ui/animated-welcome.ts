/**
 * KARIMO Animated Welcome Screen
 *
 * Orchestrates the animated welcome screen with:
 * - Section-by-section reveal animation
 * - Pulsing ready prompt
 * - Any-key-to-skip functionality
 * - Graceful fallback for non-TTY environments
 */

import * as p from '@clack/prompts'

import {
  calculatePulseIntensity,
  createAnimationLoop,
  getCurrentPhase,
  isSectionVisible,
  pulseColor,
  TOTAL_ANIMATION_MS,
  type AnimationPhase,
} from './animations'
import { GY, OR, RST, WH } from './colors'
import {
  canRunAnimation,
  clearScreen,
  enableRawMode,
  getTerminalSize,
  hideCursor,
  moveCursorHome,
  showCursor,
} from './terminal-utils'
import {
  getCompleteWelcomeLines,
  getDivider,
  getGettingStartedLines,
  getHeaderLines,
  getLevelPlanLines,
  getOrchestrationFlowLines,
  getReadyPromptLine,
  getWordmarkLines,
} from './welcome-content'

// =============================================================================
// Animation State
// =============================================================================

/**
 * Animation state for tracking what to render.
 */
interface WelcomeAnimationState {
  /** Current animation phase */
  phase: AnimationPhase
  /** Elapsed time in milliseconds */
  elapsedMs: number
  /** Whether animation was skipped */
  skipped: boolean
  /** Whether user has pressed a key */
  keyPressed: boolean
  /** The key that was pressed */
  pressedKey: string | null
}

/**
 * Create initial animation state.
 */
function createInitialState(): WelcomeAnimationState {
  return {
    phase: 'wordmark',
    elapsedMs: 0,
    skipped: false,
    keyPressed: false,
    pressedKey: null,
  }
}

// =============================================================================
// Frame Rendering
// =============================================================================

/**
 * Build the frame based on current animation state.
 */
function buildFrame(state: WelcomeAnimationState): string[] {
  const lines: string[] = ['']

  // Always show wordmark after phase starts
  if (state.elapsedMs > 0 || state.skipped) {
    lines.push(...getWordmarkLines())
  }

  // Show header after wordmark phase
  if (state.elapsedMs >= 300 || state.skipped) {
    lines.push(...getHeaderLines())
  }

  // Show first divider
  if (state.elapsedMs >= 500 || state.skipped) {
    lines.push(getDivider())
  }

  // Show orchestration flow
  if (isSectionVisible('orchestration', state.elapsedMs) || state.skipped) {
    lines.push(...getOrchestrationFlowLines())
  }

  // Show second divider
  if (isSectionVisible('orchestration', state.elapsedMs) || state.skipped) {
    lines.push(getDivider())
  }

  // Show level plan
  if (isSectionVisible('levels', state.elapsedMs) || state.skipped) {
    lines.push(...getLevelPlanLines())
  }

  // Show third divider
  if (isSectionVisible('levels', state.elapsedMs) || state.skipped) {
    lines.push(getDivider())
  }

  // Show getting started
  if (isSectionVisible('gettingStarted', state.elapsedMs) || state.skipped) {
    lines.push(...getGettingStartedLines())
  }

  // Show fourth divider
  if (isSectionVisible('gettingStarted', state.elapsedMs) || state.skipped) {
    lines.push(getDivider())
  }

  // Show ready prompt with pulse effect
  if (isSectionVisible('ready', state.elapsedMs) || state.skipped) {
    const pulseIntensity = calculatePulseIntensity(state.elapsedMs)
    const bulletColor = pulseColor(pulseIntensity)
    lines.push('')
    lines.push(getReadyPromptLine(bulletColor))
    lines.push('')
  }

  return lines
}

/**
 * Render frame to terminal.
 */
function renderFrame(lines: string[]): void {
  moveCursorHome()
  process.stdout.write(lines.join('\n'))

  // Clear any remaining content from previous frame
  const { rows } = getTerminalSize()
  const remaining = rows - lines.length
  if (remaining > 0) {
    process.stdout.write('\n'.repeat(remaining))
  }
}

// =============================================================================
// Keypress Handler
// =============================================================================

/**
 * Set up keypress listener that can skip animation.
 *
 * @param onKey - Callback when key is pressed
 * @returns Cleanup function
 */
function setupKeypressListener(onKey: (key: string) => void): () => void {
  if (!process.stdin.isTTY) {
    return () => {
      // No-op for non-TTY
    }
  }

  const cleanup = enableRawMode()

  const handler = (key: string): void => {
    // Handle Ctrl+C
    if (key === '\u0003') {
      onKey('ctrl+c')
      return
    }

    // Handle Enter
    if (key === '\r' || key === '\n') {
      onKey('enter')
      return
    }

    // Any other key
    onKey(key)
  }

  process.stdin.on('data', handler)

  return () => {
    process.stdin.removeListener('data', handler)
    cleanup()
  }
}

// =============================================================================
// Main Animation
// =============================================================================

/**
 * Run the animated welcome screen.
 *
 * @returns true if user wants to continue, false if cancelled
 */
export async function showAnimatedWelcome(): Promise<boolean> {
  // Check if we can run animation
  if (!canRunAnimation()) {
    return showStaticWelcome()
  }

  return new Promise((resolve) => {
    const state = createInitialState()
    let cleanupKeypress: (() => void) | null = null
    let animationLoop: { stop: () => void } | null = null

    // Cleanup function
    const cleanup = (): void => {
      if (animationLoop) {
        animationLoop.stop()
        animationLoop = null
      }
      if (cleanupKeypress) {
        cleanupKeypress()
        cleanupKeypress = null
      }
      showCursor()
    }

    // Handle key press
    const handleKeypress = (key: string): void => {
      state.keyPressed = true
      state.pressedKey = key

      // Ctrl+C - exit
      if (key === 'ctrl+c') {
        cleanup()
        // Clear screen and show goodbye message
        clearScreen()
        p.outro('Come back when you are ready.')
        resolve(false)
        return
      }

      // If animation is not complete, skip to end
      if (!state.skipped && state.elapsedMs < TOTAL_ANIMATION_MS) {
        state.skipped = true
        state.elapsedMs = TOTAL_ANIMATION_MS + 1
        // Re-render with full content
        const frame = buildFrame(state)
        renderFrame(frame)
        return
      }

      // If animation is complete and Enter is pressed, continue
      if (key === 'enter') {
        cleanup()
        // Clear screen before proceeding
        clearScreen()
        resolve(true)
        return
      }

      // Other keys after animation - ignore (waiting for Enter)
    }

    // Set up keypress listener
    cleanupKeypress = setupKeypressListener(handleKeypress)

    // Prepare screen
    clearScreen()
    hideCursor()

    // Create animation loop
    animationLoop = createAnimationLoop(
      (elapsed) => {
        // Skip if already done
        if (state.skipped) return

        // Update state
        state.elapsedMs = elapsed
        state.phase = getCurrentPhase(elapsed)

        // Build and render frame
        const frame = buildFrame(state)
        renderFrame(frame)
      },
      () => {
        // Animation complete - keep showing ready prompt with pulse
        // Continue pulsing until user presses Enter
        if (!state.skipped) {
          state.skipped = true
        }
      }
    )

    // Handle process signals
    const signalHandler = (): void => {
      cleanup()
      process.exit(0)
    }

    process.on('SIGINT', signalHandler)
    process.on('SIGTERM', signalHandler)
  })
}

// =============================================================================
// Static Fallback
// =============================================================================

/**
 * Show static welcome screen (fallback for non-TTY).
 */
async function showStaticWelcome(): Promise<boolean> {
  const lines = getCompleteWelcomeLines()
  console.log(lines.join('\n'))

  const proceed = await p.confirm({
    message: 'Press Enter to continue...',
    active: 'Continue',
    inactive: 'Cancel',
    initialValue: true,
  })

  if (p.isCancel(proceed) || !proceed) {
    p.outro('Come back when you are ready.')
    return false
  }

  return true
}

// =============================================================================
// Simple Animated Version (without raw mode complexity)
// =============================================================================

/**
 * Show the animated welcome with simpler animation.
 * Uses setTimeout-based reveal instead of full raw mode animation.
 *
 * This is an alternative implementation that's easier to debug.
 */
export async function showSimpleAnimatedWelcome(): Promise<boolean> {
  if (!canRunAnimation()) {
    return showStaticWelcome()
  }

  // Clear screen
  clearScreen()
  hideCursor()

  try {
    // Phase 1: Wordmark (0-400ms)
    console.log('')
    for (const line of getWordmarkLines()) {
      console.log(line)
      await sleep(60)
    }

    // Header
    for (const line of getHeaderLines()) {
      console.log(line)
    }
    await sleep(100)

    // Divider 1
    console.log(getDivider())
    await sleep(50)

    // Orchestration flow
    for (const line of getOrchestrationFlowLines()) {
      console.log(line)
    }
    await sleep(150)

    // Divider 2
    console.log(getDivider())
    await sleep(50)

    // Level plan
    for (const line of getLevelPlanLines()) {
      console.log(line)
    }
    await sleep(150)

    // Divider 3
    console.log(getDivider())
    await sleep(50)

    // Getting started
    for (const line of getGettingStartedLines()) {
      console.log(line)
    }
    await sleep(100)

    // Divider 4
    console.log(getDivider())
    await sleep(50)

    // Ready prompt
    console.log('')
    console.log(getReadyPromptLine())
    console.log('')
  } finally {
    showCursor()
  }

  // Wait for user input
  const proceed = await p.confirm({
    message: `${OR}●${RST} ${WH}Continue?${RST}`,
    active: 'Yes, let\'s go',
    inactive: 'Exit',
    initialValue: true,
  })

  if (p.isCancel(proceed) || !proceed) {
    p.outro(`${GY}Come back when you're ready.${RST}`)
    return false
  }

  console.log() // Add spacing
  return true
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
