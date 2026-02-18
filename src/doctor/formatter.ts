/**
 * KARIMO Doctor Formatter
 *
 * Formats doctor check results for terminal display.
 */

import { BOLD, GN, GY, GYD, OR, ORD, RD, RST, WH } from '../cli/ui/colors'
import type { CheckResult, DoctorReport } from './types'

// =============================================================================
// Constants
// =============================================================================

/** Left padding for content lines */
const PAD = '  '

/** Width for the label column */
const LABEL_WIDTH = 32

/** Dot character for padding */
const DOT = '.'

// =============================================================================
// Status Indicators
// =============================================================================

/** Success checkmark (green) */
const CHECK = `${GN}✓${RST}`

/** Failure X (red) */
const CROSS = `${RD}✗${RST}`

// =============================================================================
// Formatters
// =============================================================================

/**
 * Format a single check result as a line.
 */
function formatCheckLine(result: CheckResult): string {
  const indicator = result.status === 'pass' ? CHECK : CROSS
  const label = result.label

  // Pad label with dots
  const dots = DOT.repeat(Math.max(2, LABEL_WIDTH - label.length))
  const paddedLabel = `${label} ${GYD}${dots}${RST}`

  // Version/message info
  let info: string
  if (result.status === 'pass') {
    info = `${GY}${result.version ?? 'OK'}${RST}`
  } else {
    info = `${RD}${result.message ?? 'Failed'}${RST}`
  }

  return `${PAD}├─ ${paddedLabel} ${indicator} ${info}`
}

/**
 * Format the full doctor report for terminal display.
 */
export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = []

  // Header
  lines.push(`${PAD}${ORD}◆${RST} ${WH}${BOLD}KARIMO Doctor${RST}`)
  lines.push(`${PAD}${ORD}│${RST}`)
  lines.push(`${PAD}${ORD}│${RST}  Checking your environment...`)
  lines.push(`${PAD}${ORD}│${RST}`)

  // Check results
  for (const check of report.checks) {
    lines.push(formatCheckLine(check))
  }

  // Footer
  lines.push(`${PAD}${ORD}│${RST}`)

  if (report.overall === 'pass') {
    lines.push(
      `${PAD}${ORD}└─${RST} ${GN}All ${report.passed} checks passed.${RST} You're ready to go.`
    )
  } else {
    // Show fix instructions for failed checks
    const failedChecks = report.checks.filter((c) => c.status === 'fail')

    if (failedChecks.length > 0) {
      lines.push(`${PAD}${ORD}│${RST}  ${WH}To fix:${RST}`)

      for (const check of failedChecks) {
        if (check.fix) {
          // Split multiline fix instructions
          const fixLines = check.fix.split('\n')
          for (const fixLine of fixLines) {
            lines.push(`${PAD}${ORD}│${RST}    ${GY}${fixLine}${RST}`)
          }
        }
      }

      lines.push(`${PAD}${ORD}│${RST}`)
    }

    lines.push(
      `${PAD}${ORD}│${RST}  ${GY}${report.passed} passed, ${RD}${report.failed} failed${RST}. Run the commands above to fix.`
    )
    lines.push(`${PAD}${ORD}│${RST}`)
    lines.push(`${PAD}${ORD}└─${RST} ${GY}Stuck? https://github.com/opensesh/KARIMO/issues${RST}`)
  }

  return lines.join('\n')
}

/**
 * Format doctor report as JSON.
 */
export function formatDoctorReportJson(report: DoctorReport): string {
  return JSON.stringify(
    {
      version: '1.0.0',
      timestamp: report.timestamp,
      overall: report.overall,
      checks: report.checks.map((c) => ({
        name: c.name,
        status: c.status,
        ...(c.version && { version: c.version }),
        ...(c.message && { message: c.message }),
        ...(c.fix && { fix: c.fix }),
      })),
    },
    null,
    2
  )
}

/**
 * Format a compact status line for inline display.
 */
export function formatCompactStatus(report: DoctorReport): string {
  if (report.overall === 'pass') {
    return `${GN}✓${RST} All ${report.passed} checks passed`
  }
  return `${RD}✗${RST} ${report.failed} of ${report.passed + report.failed} checks failed`
}

/**
 * Format the setup checklist header.
 */
export function formatSetupChecklist(report: DoctorReport): string {
  const lines: string[] = []

  // Header
  lines.push(`${PAD}${ORD}◆${RST} ${WH}${BOLD}Setup Checklist${RST}`)
  lines.push(`${PAD}${ORD}│${RST}`)
  lines.push(`${PAD}${ORD}│${RST}  Verifying prerequisites for KARIMO:`)
  lines.push(`${PAD}${ORD}│${RST}  ${GY}CLI tools, API access, and repository state${RST}`)
  lines.push(`${PAD}${ORD}│${RST}`)

  // Check results
  for (const check of report.checks) {
    lines.push(formatCheckLine(check))
  }

  // Footer
  lines.push(`${PAD}${ORD}│${RST}`)

  if (report.overall === 'pass') {
    lines.push(`${PAD}${ORD}└${RST}  ${GN}All systems ready.${RST} Let's configure your project.`)
  } else {
    lines.push(
      `${PAD}${ORD}│${RST}  ${OR}${report.failed} issue${report.failed === 1 ? '' : 's'} need${report.failed === 1 ? 's' : ''} to be resolved${RST} before continuing.`
    )
    lines.push(`${PAD}${ORD}│${RST}`)
    lines.push(`${PAD}${ORD}└${RST}  ${GY}Stuck? https://github.com/opensesh/KARIMO/issues${RST}`)
  }

  return lines.join('\n')
}

/**
 * Format a single issue resolution screen.
 */
export function formatIssueResolution(check: CheckResult): string {
  const lines: string[] = []

  // Map check names to friendly descriptions
  const descriptions: Record<string, string[]> = {
    gh_auth: [
      'KARIMO uses GitHub to:',
      '  • Create pull requests for each task',
      '  • Track progress via GitHub Projects',
      '  • Trigger automated code review',
    ],
    anthropic_api_key: ['KARIMO uses Claude to power the interview and agent systems.'],
    claude_code: ['KARIMO uses Claude Code to execute tasks.'],
    bun: ['KARIMO requires Bun as its runtime.'],
    git: ['KARIMO requires Git for version control.'],
    git_repo: ['KARIMO needs to run inside a git repository.'],
    gh_cli: ['KARIMO uses the GitHub CLI for GitHub operations.'],
    karimo_writable: ['KARIMO needs write access to the .karimo/ directory.'],
  }

  // Title based on check
  const titles: Record<string, string> = {
    gh_auth: 'GitHub Authentication Required',
    anthropic_api_key: 'Anthropic API Key Required',
    claude_code: 'Claude Code CLI Required',
    bun: 'Bun Runtime Required',
    git: 'Git Required',
    git_repo: 'Git Repository Required',
    gh_cli: 'GitHub CLI Required',
    karimo_writable: 'Directory Permissions Required',
  }

  const title = titles[check.name] ?? `${check.label} Required`
  const desc = descriptions[check.name] ?? [`${check.label} is required by KARIMO.`]

  lines.push(`${PAD}${ORD}◆${RST} ${WH}${BOLD}${title}${RST}`)
  lines.push(`${PAD}${ORD}│${RST}`)

  for (const line of desc) {
    lines.push(`${PAD}${ORD}│${RST}  ${line}`)
  }

  lines.push(`${PAD}${ORD}│${RST}`)

  if (check.fix) {
    if (check.autoFixable) {
      lines.push(`${PAD}${ORD}│${RST}  Let's get you set up.`)
      lines.push(`${PAD}${ORD}│${RST}`)
      lines.push(`${PAD}${ORD}│${RST}  ${OR}→${RST} Press Enter to run: ${GY}${check.fix}${RST}`)
      lines.push(`${PAD}${ORD}│${RST}  ${GYD}→${RST} Or press Ctrl+C to exit and set up manually`)
    } else {
      lines.push(`${PAD}${ORD}│${RST}  To fix this issue:`)
      lines.push(`${PAD}${ORD}│${RST}`)

      const fixLines = check.fix.split('\n')
      for (const fixLine of fixLines) {
        lines.push(`${PAD}${ORD}│${RST}    ${GY}${fixLine}${RST}`)
      }
    }
  }

  lines.push(`${PAD}${ORD}│${RST}`)
  lines.push(`${PAD}${ORD}└${RST}  Need help? ${GY}https://github.com/opensesh/KARIMO/issues${RST}`)

  return lines.join('\n')
}
