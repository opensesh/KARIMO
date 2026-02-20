/**
 * KARIMO Animation Utilities
 *
 * Animation timing and effects for the welcome screen.
 */

export {
  // Frame rate
  TARGET_FPS,
  FRAME_MS,
  TOTAL_ANIMATION_MS,
  // Phase timing
  PHASE_TIMING,
  SECTION_TIMING,
  // Easing functions
  easeLinear,
  easeOutQuad,
  easeOutCubic,
  easeInOutQuad,
  easeInOutCubic,
  // Progress calculation
  calculateProgress,
  calculateEasedProgress,
  // Animation state
  getCurrentPhase,
  isSectionVisible,
  getSectionProgress,
  // Animation loop
  createAnimationLoop,
  // Pulse
  PULSE_CYCLE_MS,
  calculatePulseIntensity,
  // Types
  type AnimationPhase,
  type FrameCallback,
} from './timing'

export {
  // Color types
  type RGB,
  // Color constants
  COLOR_ORANGE,
  COLOR_ORANGE_LIGHT,
  COLOR_ORANGE_DARK,
  COLOR_WHITE,
  COLOR_GRAY,
  // Color utilities
  lerpColor,
  rgbToAnsi,
  rgbToAnsiBg,
  // Effects
  pulseColor,
  fadeColor,
  fadeLine,
  stripAnsi,
  revealFromTop,
  revealWithFade,
  cascadeReveal,
  cascadeRevealLines,
  typewriterReveal,
} from './effects'
