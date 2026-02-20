/**
 * KARIMO CLI Colors
 *
 * ANSI 24-bit RGB color constants for terminal output.
 * Based on the karimo-welcome.py prototype color palette.
 */

// =============================================================================
// ANSI Escape Codes
// =============================================================================

/** Reset all formatting */
export const RST = '\x1b[0m'

/** Bold text */
export const BOLD = '\x1b[1m'

/** Dim text */
export const DIM = '\x1b[2m'

// =============================================================================
// Color Palette (24-bit RGB)
// =============================================================================

/**
 * Create an ANSI 24-bit foreground color escape sequence.
 */
function fg(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`
}

// Brand Colors
/** Primary accent - Aperol orange (#FE5102) */
export const OR = fg(254, 81, 2)

/** Light orange (#FF8C46) */
export const ORL = fg(255, 140, 70)

/** Dark orange - borders (#C83C00) */
export const ORD = fg(200, 60, 0)

// Neutral Colors
/** Primary text - soft white (#DCDCDC) */
export const WH = fg(220, 220, 220)

/** Secondary text - gray (#8C8C8C) */
export const GY = fg(140, 140, 140)

/** Tertiary/muted text - dark gray (#5A5A5A) */
export const GYD = fg(90, 90, 90)

// Status Colors
/** Success - green */
export const GN = fg(80, 200, 80)

/** Error - red */
export const RD = fg(200, 80, 80)

// =============================================================================
// Formatting Helpers
// =============================================================================

/**
 * Apply bold formatting to a color.
 */
export function bold(color: string): string {
  return BOLD + color
}

/**
 * Apply dim formatting to a color.
 */
export function dim(color: string): string {
  return DIM + color
}

/**
 * Wrap text with color and reset.
 */
export function colorize(text: string, color: string): string {
  return `${color}${text}${RST}`
}

/**
 * Create a horizontal border line.
 * Uses dark orange for subtle visual separation.
 */
export function border(width: number): string {
  return `${ORD}${'─'.repeat(width)}${RST}`
}
