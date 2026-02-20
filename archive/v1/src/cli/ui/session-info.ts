/**
 * KARIMO Session Info Display
 *
 * Shows version, model preference, provider, and current working directory
 * for the returning user welcome screen.
 */

import { homedir } from 'node:os'
import { GY, GYD, RST, WH } from './colors'
import { isTTY } from './terminal-utils'
import { VERSION } from './welcome-content'

// =============================================================================
// Types
// =============================================================================

/**
 * Session context for display.
 */
export interface SessionContext {
  /** Model preference from config (e.g., 'sonnet', 'opus', 'haiku') */
  modelPreference: string | null
  /** Current working directory */
  cwd: string
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Model display names and provider.
 */
const MODEL_DISPLAY: Record<string, { name: string; provider: string }> = {
  haiku: { name: 'Haiku', provider: 'Anthropic' },
  sonnet: { name: 'Sonnet', provider: 'Anthropic' },
  opus: { name: 'Opus', provider: 'Anthropic' },
}

/**
 * Format model preference for display.
 * Returns "Model via Provider" or "Unknown" if not configured.
 */
export function formatModelInfo(modelPreference: string | null): string {
  if (!modelPreference) {
    return 'Not configured'
  }

  const info = MODEL_DISPLAY[modelPreference]
  if (!info) {
    return modelPreference // Show raw value if unknown
  }

  return `${info.name} via ${info.provider}`
}

/**
 * Collapse home directory to ~ for display.
 */
export function collapsePath(path: string): string {
  const home = homedir()
  if (path.startsWith(home)) {
    return `~${path.slice(home.length)}`
  }
  return path
}

/**
 * Get formatted session info lines.
 * Format:
 *   v0.1.0  │  Sonnet via Anthropic
 *   ~/path/to/project
 */
export function getSessionInfoLines(context: SessionContext): string[] {
  const modelInfo = formatModelInfo(context.modelPreference)
  const displayPath = collapsePath(context.cwd)

  return [
    '',
    `${GYD}${VERSION}${RST}  ${GYD}│${RST}  ${WH}${modelInfo}${RST}`,
    `${GY}${displayPath}${RST}`,
    '',
  ]
}

/**
 * Render session info to stdout.
 */
export function renderSessionInfo(context: SessionContext): void {
  if (!isTTY()) {
    return
  }

  const lines = getSessionInfoLines(context)
  for (const line of lines) {
    console.log(line)
  }
}

/**
 * Get session info as a single string.
 * Useful for composing with other content.
 */
export function getSessionInfoString(context: SessionContext): string {
  return getSessionInfoLines(context).join('\n')
}

// =============================================================================
// Context Loading
// =============================================================================

/**
 * Build session context from config.
 * Attempts to load config for model preference.
 */
export async function buildSessionContext(projectRoot: string): Promise<SessionContext> {
  let modelPreference: string | null = null

  try {
    // Dynamic import to avoid circular dependency
    const { loadConfig } = await import('../../config')
    const result = await loadConfig(projectRoot)
    modelPreference = result.config.cost.model_preference
  } catch {
    // Config not available, that's fine
    modelPreference = null
  }

  return {
    modelPreference,
    cwd: projectRoot,
  }
}
