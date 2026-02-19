/**
 * KARIMO Info Command
 *
 * Display compact banner with version, tagline, and GitHub URL.
 * `karimo info` — Quick about block for the project.
 */

import { GY, GYD, OR, RST, WH } from '../ui/colors'
import { getCompactBannerString } from '../ui/compact-banner'
import { GITHUB_URL, VERSION } from '../ui/welcome-content'

// =============================================================================
// Info Display
// =============================================================================

/**
 * Tagline for KARIMO.
 */
const TAGLINE = 'Autonomous development framework — agent, tool, and repo agnostic'

/**
 * Display the info block.
 * Shows:
 * - Compact ASCII banner (orange)
 * - Version and tagline
 * - GitHub URL
 */
export function showInfo(): void {
  // Banner
  console.log(getCompactBannerString())
  console.log()

  // Version and tagline
  console.log(`${GYD}${VERSION}${RST}`)
  console.log(`${GY}${TAGLINE}${RST}`)
  console.log()

  // GitHub URL
  console.log(`${GY}Learn more:${RST} ${OR}>>${RST} ${WH}${GITHUB_URL}${RST}`)
  console.log()
}

/**
 * Handle the info command.
 * Called from main.ts when `karimo info` is invoked.
 */
export function handleInfo(): void {
  showInfo()
}
