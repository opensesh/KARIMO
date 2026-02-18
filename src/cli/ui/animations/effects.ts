/**
 * KARIMO Animation Effects
 *
 * Visual effects for the animated welcome screen including
 * color pulsing, fade effects, and reveal transitions.
 */

import { RST } from '../colors'

// =============================================================================
// RGB Color Type
// =============================================================================

/**
 * RGB color representation.
 */
export interface RGB {
  r: number
  g: number
  b: number
}

// =============================================================================
// Color Constants
// =============================================================================

/** Primary orange (Aperol) */
export const COLOR_ORANGE: RGB = { r: 254, g: 81, b: 2 }

/** Light orange */
export const COLOR_ORANGE_LIGHT: RGB = { r: 255, g: 140, b: 70 }

/** Dark orange */
export const COLOR_ORANGE_DARK: RGB = { r: 200, g: 60, b: 0 }

/** White */
export const COLOR_WHITE: RGB = { r: 220, g: 220, b: 220 }

/** Gray */
export const COLOR_GRAY: RGB = { r: 140, g: 140, b: 140 }

// =============================================================================
// Color Interpolation
// =============================================================================

/**
 * Interpolate between two colors.
 *
 * @param from - Starting color
 * @param to - Ending color
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated RGB color
 */
export function lerpColor(from: RGB, to: RGB, t: number): RGB {
  const clampedT = Math.max(0, Math.min(1, t))
  return {
    r: Math.round(from.r + (to.r - from.r) * clampedT),
    g: Math.round(from.g + (to.g - from.g) * clampedT),
    b: Math.round(from.b + (to.b - from.b) * clampedT),
  }
}

/**
 * Convert RGB to ANSI 24-bit foreground color escape sequence.
 */
export function rgbToAnsi(color: RGB): string {
  return `\x1b[38;2;${color.r};${color.g};${color.b}m`
}

/**
 * Convert RGB to ANSI 24-bit background color escape sequence.
 */
export function rgbToAnsiBg(color: RGB): string {
  return `\x1b[48;2;${color.r};${color.g};${color.b}m`
}

// =============================================================================
// Pulse Effect
// =============================================================================

/**
 * Calculate pulsing color between base and highlight.
 *
 * @param intensity - Pulse intensity (0-1)
 * @param baseColor - Base color at low intensity
 * @param highlightColor - Highlight color at high intensity
 * @returns ANSI color escape sequence
 */
export function pulseColor(
  intensity: number,
  baseColor: RGB = COLOR_ORANGE_DARK,
  highlightColor: RGB = COLOR_ORANGE_LIGHT
): string {
  const color = lerpColor(baseColor, highlightColor, intensity)
  return rgbToAnsi(color)
}

// =============================================================================
// Fade Effects
// =============================================================================

/**
 * Create a faded (dim) version of a color.
 *
 * @param color - Base color
 * @param opacity - Opacity level (0-1)
 * @returns Dimmed RGB color
 */
export function fadeColor(color: RGB, opacity: number): RGB {
  const factor = Math.max(0, Math.min(1, opacity))
  return {
    r: Math.round(color.r * factor),
    g: Math.round(color.g * factor),
    b: Math.round(color.b * factor),
  }
}

/**
 * Apply fade effect to a line of text.
 * Preserves existing ANSI codes but reduces color intensity.
 *
 * @param line - Text line with ANSI codes
 * @param progress - Fade progress (0=invisible, 1=fully visible)
 * @returns Line with fade applied
 */
export function fadeLine(line: string, progress: number): string {
  if (progress >= 1) {
    return line
  }

  if (progress <= 0) {
    // Return empty line preserving length
    const stripped = stripAnsi(line)
    return ' '.repeat(stripped.length)
  }

  // For partial progress, apply dim effect
  // This is a simple approach - multiply brightness
  const dimLevel = Math.round(progress * 100)
  return `\x1b[2m${line}${RST}`
}

/**
 * Strip ANSI escape codes from a string.
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

// =============================================================================
// Reveal Effects
// =============================================================================

/**
 * Reveal lines from top to bottom.
 *
 * @param lines - Array of lines to reveal
 * @param progress - Reveal progress (0-1)
 * @returns Array with visible lines
 */
export function revealFromTop(lines: string[], progress: number): string[] {
  if (progress >= 1) {
    return lines
  }

  if (progress <= 0) {
    return []
  }

  const visibleCount = Math.ceil(lines.length * progress)
  return lines.slice(0, visibleCount)
}

/**
 * Reveal lines with fade-in effect.
 *
 * @param lines - Array of lines to reveal
 * @param progress - Overall progress (0-1)
 * @returns Array of lines with fade applied
 */
export function revealWithFade(lines: string[], progress: number): string[] {
  if (progress >= 1) {
    return lines
  }

  if (progress <= 0) {
    return []
  }

  // Calculate how many lines should be fully visible vs fading
  const totalLines = lines.length
  const fadeWindow = 0.2 // 20% of progress is fade window

  return lines.map((line, index) => {
    const lineProgress = (index + 1) / totalLines
    const lineStart = lineProgress - fadeWindow
    const lineEnd = lineProgress

    if (progress >= lineEnd) {
      return line
    }

    if (progress <= lineStart) {
      return ''
    }

    // Calculate fade for this line
    const fadeProgress = (progress - lineStart) / fadeWindow
    return fadeLine(line, fadeProgress)
  })
}

// =============================================================================
// Cascade Effect
// =============================================================================

/**
 * Cascade reveal - reveal characters from left to right.
 * Used for the wordmark animation.
 *
 * @param line - Line to reveal
 * @param progress - Progress (0-1)
 * @returns Partially revealed line
 */
export function cascadeReveal(line: string, progress: number): string {
  if (progress >= 1) {
    return line
  }

  if (progress <= 0) {
    return ''
  }

  const stripped = stripAnsi(line)
  const visibleChars = Math.floor(stripped.length * progress)

  // We need to handle ANSI codes carefully
  // For simplicity, reveal the line character by character
  let charCount = 0
  let result = ''
  let inEscape = false
  let escapeBuffer = ''

  for (const char of line) {
    if (char === '\x1b') {
      inEscape = true
      escapeBuffer = char
      continue
    }

    if (inEscape) {
      escapeBuffer += char
      if (char === 'm') {
        // End of escape sequence
        result += escapeBuffer
        inEscape = false
        escapeBuffer = ''
      }
      continue
    }

    // Regular character
    if (charCount < visibleChars) {
      result += char
      charCount++
    }
  }

  return result + RST
}

/**
 * Cascade reveal for multiple lines (staggered).
 *
 * @param lines - Lines to reveal
 * @param progress - Overall progress (0-1)
 * @param staggerDelay - Delay between lines (0-1 fraction of total)
 * @returns Revealed lines
 */
export function cascadeRevealLines(
  lines: string[],
  progress: number,
  staggerDelay: number = 0.1
): string[] {
  return lines.map((line, index) => {
    const lineStart = index * staggerDelay
    const lineProgress = Math.max(0, (progress - lineStart) / (1 - lineStart * lines.length))
    return cascadeReveal(line, Math.min(1, lineProgress))
  })
}

// =============================================================================
// Typewriter Effect
// =============================================================================

/**
 * Typewriter reveal - reveal text character by character.
 *
 * @param text - Text to reveal
 * @param progress - Progress (0-1)
 * @returns Partially revealed text
 */
export function typewriterReveal(text: string, progress: number): string {
  if (progress >= 1) {
    return text
  }

  if (progress <= 0) {
    return ''
  }

  const visibleChars = Math.floor(text.length * progress)
  return text.slice(0, visibleChars)
}
