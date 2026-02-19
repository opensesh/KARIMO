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

// Compact banner (returning users)
export {
  COMPACT_WORDMARK_LINES,
  getColoredCompactWordmark,
  getCompactBannerString,
  getCompactWordmarkLines,
  renderCompactBanner,
  supportsUnicodeBlocks,
} from './compact-banner'

// Session info (returning users)
export {
  buildSessionContext,
  collapsePath,
  formatModelInfo,
  getSessionInfoLines,
  getSessionInfoString,
  renderSessionInfo,
  type SessionContext,
} from './session-info'

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

// Text formatting (ANSI-aware wrapping)
export {
  centerText,
  createDivider,
  createStreamRenderer,
  getEffectiveWidth,
  getTerminalWidth,
  getVisualWidth,
  truncateText,
  wrapText,
  wrapTextWithMargin,
  type StreamRenderer,
  type StreamRendererOptions,
} from './text-format'

// Long input handling
export {
  formatInputPreview,
  getEditor,
  getInputStats,
  getLongInput,
  isEditCommand,
  isEditorAvailable,
  openEditor,
  shouldUseEditor,
  type LongInputOptions,
  type LongInputResult,
} from './long-input'
