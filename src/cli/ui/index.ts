/**
 * KARIMO CLI UI Components
 *
 * Shared UI components for terminal output.
 */

// Colors and formatting
export {
  BOLD,
  DIM,
  GN,
  GY,
  GYD,
  OR,
  ORD,
  ORL,
  RD,
  RST,
  WH,
  bold,
  border,
  colorize,
  dim,
} from './colors'

// Welcome screens
export {
  BORDER_WIDTH,
  showCompactHeader,
  showTransitionToInit,
  showWelcomeScreen,
} from './welcome-screen'

// Animated welcome
export { showAnimatedWelcome, showSimpleAnimatedWelcome } from './animated-welcome'

// Terminal utilities
export {
  canRunAnimation,
  clearScreen,
  hideCursor,
  isTTY,
  showCursor,
} from './terminal-utils'

// Welcome content (for custom rendering)
export {
  getCompleteWelcomeLines,
  GITHUB_URL,
  VERSION,
} from './welcome-content'
