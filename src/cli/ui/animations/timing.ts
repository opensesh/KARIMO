/**
 * KARIMO Animation Timing
 *
 * Easing functions and frame scheduling for smooth animations.
 */

// =============================================================================
// Frame Rate Constants
// =============================================================================

/** Target frames per second */
export const TARGET_FPS = 30

/** Milliseconds per frame (33ms for 30 FPS) */
export const FRAME_MS = Math.floor(1000 / TARGET_FPS)

// =============================================================================
// Animation Timing
// =============================================================================

/** Total animation duration in milliseconds */
export const TOTAL_ANIMATION_MS = 2400

/** Phase timings (cumulative) */
export const PHASE_TIMING = {
  /** Phase 1: Wordmark reveal (0-600ms) */
  wordmark: { start: 0, end: 600 },
  /** Phase 2: Sections reveal (600-2000ms) */
  sections: { start: 600, end: 2000 },
  /** Phase 3: Ready state (2000ms+) */
  ready: { start: 2000, end: TOTAL_ANIMATION_MS },
}

/** Section reveal timing within Phase 2 */
export const SECTION_TIMING = {
  orchestration: { start: 600, duration: 300 },
  levels: { start: 900, duration: 300 },
  gettingStarted: { start: 1200, duration: 300 },
  ready: { start: 1800, duration: 200 },
}

// =============================================================================
// Easing Functions
// =============================================================================

/**
 * Linear easing - no acceleration.
 */
export function easeLinear(t: number): number {
  return t
}

/**
 * Ease out - decelerating to zero velocity.
 * Used for reveal animations.
 */
export function easeOutQuad(t: number): number {
  return t * (2 - t)
}

/**
 * Ease out cubic - stronger deceleration.
 */
export function easeOutCubic(t: number): number {
  const t1 = t - 1
  return t1 * t1 * t1 + 1
}

/**
 * Ease in out - smooth start and end.
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * Ease in out cubic - smoother start and end.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
}

// =============================================================================
// Progress Calculation
// =============================================================================

/**
 * Calculate progress (0-1) for a given time within a range.
 *
 * @param currentTime - Current elapsed time in ms
 * @param start - Start time in ms
 * @param end - End time in ms
 * @returns Progress from 0 to 1, clamped
 */
export function calculateProgress(currentTime: number, start: number, end: number): number {
  if (currentTime <= start) return 0
  if (currentTime >= end) return 1
  return (currentTime - start) / (end - start)
}

/**
 * Calculate progress with easing applied.
 *
 * @param currentTime - Current elapsed time in ms
 * @param start - Start time in ms
 * @param end - End time in ms
 * @param easingFn - Easing function to apply
 * @returns Eased progress from 0 to 1
 */
export function calculateEasedProgress(
  currentTime: number,
  start: number,
  end: number,
  easingFn: (t: number) => number = easeOutCubic
): number {
  const linear = calculateProgress(currentTime, start, end)
  return easingFn(linear)
}

// =============================================================================
// Animation State
// =============================================================================

/**
 * Animation phase enum.
 */
export type AnimationPhase = 'wordmark' | 'sections' | 'ready' | 'complete'

/**
 * Get current animation phase based on elapsed time.
 */
export function getCurrentPhase(elapsedMs: number): AnimationPhase {
  if (elapsedMs < PHASE_TIMING.wordmark.end) {
    return 'wordmark'
  }
  if (elapsedMs < PHASE_TIMING.sections.end) {
    return 'sections'
  }
  if (elapsedMs < TOTAL_ANIMATION_MS) {
    return 'ready'
  }
  return 'complete'
}

/**
 * Check if section should be visible at current time.
 */
export function isSectionVisible(
  sectionKey: keyof typeof SECTION_TIMING,
  elapsedMs: number
): boolean {
  const timing = SECTION_TIMING[sectionKey]
  return elapsedMs >= timing.start
}

/**
 * Get section reveal progress (0-1).
 */
export function getSectionProgress(
  sectionKey: keyof typeof SECTION_TIMING,
  elapsedMs: number
): number {
  const timing = SECTION_TIMING[sectionKey]
  return calculateEasedProgress(elapsedMs, timing.start, timing.start + timing.duration)
}

// =============================================================================
// Frame Scheduling
// =============================================================================

/**
 * Animation frame callback type.
 */
export type FrameCallback = (elapsedMs: number, deltaMs: number) => void

/**
 * Create an animation loop with consistent frame timing.
 *
 * @param callback - Function to call each frame
 * @param onComplete - Function to call when animation completes
 * @returns Object with stop() method to cancel animation
 */
export function createAnimationLoop(
  callback: FrameCallback,
  onComplete?: () => void
): { stop: () => void } {
  let startTime: number | null = null
  let lastFrameTime = 0
  let animationHandle: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const tick = (): void => {
    if (stopped) return

    const now = Date.now()
    if (startTime === null) {
      startTime = now
      lastFrameTime = now
    }

    const elapsed = now - startTime
    const delta = now - lastFrameTime
    lastFrameTime = now

    // Call the frame callback
    callback(elapsed, delta)

    // Check if animation is complete
    if (elapsed >= TOTAL_ANIMATION_MS) {
      if (onComplete) {
        onComplete()
      }
      return
    }

    // Schedule next frame
    animationHandle = setTimeout(tick, FRAME_MS)
  }

  // Start the loop
  animationHandle = setTimeout(tick, 0)

  return {
    stop: () => {
      stopped = true
      if (animationHandle !== null) {
        clearTimeout(animationHandle)
        animationHandle = null
      }
    },
  }
}

// =============================================================================
// Pulse Animation
// =============================================================================

/** Pulse cycle duration in milliseconds */
export const PULSE_CYCLE_MS = 1500

/**
 * Calculate pulse intensity (0-1) for a subtle pulsing effect.
 * Used for the ready prompt bullet.
 *
 * @param elapsedMs - Time since pulse started
 * @returns Intensity from 0 to 1
 */
export function calculatePulseIntensity(elapsedMs: number): number {
  // Use sine wave for smooth pulsing
  const cycle = (elapsedMs % PULSE_CYCLE_MS) / PULSE_CYCLE_MS
  // Map sine from [-1,1] to [0.3, 1] for subtle effect
  const sine = Math.sin(cycle * Math.PI * 2)
  return 0.65 + sine * 0.35
}
