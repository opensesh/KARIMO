/**
 * KARIMO Task Summary
 *
 * Formatting and display of task execution summaries.
 */

import type { DryRunPlan, RunTaskResult, TaskRunR0, TaskSummary } from './types'

/**
 * Format duration in milliseconds to human-readable string.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "2m 30s", "45s", "1h 5m")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${seconds}s`
}

/**
 * Create a task summary from a run record.
 *
 * @param run - Task run record
 * @param title - Task title
 * @param filesChanged - Number of files changed
 * @returns Task summary
 */
export function createTaskSummary(
  run: TaskRunR0,
  title: string,
  filesChanged: number
): TaskSummary {
  const duration =
    run.completedAt && run.startedAt
      ? formatDuration(run.completedAt.getTime() - run.startedAt.getTime())
      : 'unknown'

  return {
    taskId: run.taskId,
    phaseId: run.phaseId,
    title,
    status: run.status,
    duration,
    prUrl: run.prUrl,
    filesChanged,
    cautionFiles: run.cautionFilesModified,
    errorMessage: run.errorMessage,
  }
}

/**
 * Format a task summary for terminal output.
 *
 * @param summary - Task summary
 * @returns Formatted string
 */
export function formatTaskSummary(summary: TaskSummary): string {
  const lines: string[] = []

  // Status indicator
  const statusIcon = getStatusIcon(summary.status)
  lines.push(`${statusIcon} Task ${summary.taskId}: ${summary.title}`)
  lines.push('')

  // Details
  lines.push(`  Phase:    ${summary.phaseId}`)
  lines.push(`  Status:   ${summary.status}`)
  lines.push(`  Duration: ${summary.duration}`)
  lines.push(`  Files:    ${summary.filesChanged} changed`)

  // PR URL
  if (summary.prUrl) {
    lines.push(`  PR:       ${summary.prUrl}`)
  }

  // Caution files
  if (summary.cautionFiles.length > 0) {
    lines.push('')
    lines.push('  ⚠️  Caution files modified:')
    for (const file of summary.cautionFiles) {
      lines.push(`      - ${file}`)
    }
  }

  // Error message
  if (summary.errorMessage) {
    lines.push('')
    lines.push(`  ❌ Error: ${summary.errorMessage}`)
  }

  return lines.join('\n')
}

/**
 * Print task summary to console.
 *
 * @param summary - Task summary
 */
export function printTaskSummary(summary: TaskSummary): void {
  console.log('')
  console.log('─'.repeat(60))
  console.log(formatTaskSummary(summary))
  console.log('─'.repeat(60))
  console.log('')
}

/**
 * Format a dry run plan for terminal output.
 *
 * @param plan - Dry run plan
 * @returns Formatted string
 */
export function formatDryRunPlan(plan: DryRunPlan): string {
  const lines: string[] = []

  lines.push('🔍 DRY RUN - No changes will be made')
  lines.push('')
  lines.push('═'.repeat(60))
  lines.push('')

  lines.push('Task Details:')
  lines.push(`  ID:         ${plan.task.id}`)
  lines.push(`  Title:      ${plan.task.title}`)
  lines.push(`  Complexity: ${plan.task.complexity}/10`)
  lines.push(`  Cost Cap:   $${plan.task.costCeiling}`)
  lines.push('')

  lines.push('Execution Plan:')
  lines.push(`  PRD Path:      ${plan.prdPath}`)
  lines.push(`  Phase Branch:  ${plan.phaseBranch}`)
  lines.push(`  Task Branch:   ${plan.taskBranch}`)
  lines.push(`  Worktree:      ${plan.worktreePath}`)
  lines.push(`  Engine:        ${plan.engine}`)
  lines.push('')

  lines.push('Validation Commands:')
  lines.push(`  Build:     ${plan.commands.build}`)
  lines.push(`  Typecheck: ${plan.commands.typecheck}`)
  lines.push('')

  lines.push('═'.repeat(60))

  return lines.join('\n')
}

/**
 * Print dry run plan to console.
 *
 * @param plan - Dry run plan
 */
export function printDryRunPlan(plan: DryRunPlan): void {
  console.log('')
  console.log(formatDryRunPlan(plan))
  console.log('')
}

/**
 * Format run result for terminal output.
 *
 * @param result - Run task result
 * @returns Formatted string
 */
export function formatRunResult(result: RunTaskResult): string {
  const lines: string[] = []

  if (result.success) {
    lines.push('✅ Task completed successfully')
  } else {
    lines.push('❌ Task failed')
  }

  lines.push('')
  lines.push(formatTaskSummary(result.summary))

  return lines.join('\n')
}

/**
 * Get status icon for a task status.
 *
 * @param status - Task status
 * @returns Emoji icon
 */
function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    queued: '⏳',
    running: '🔄',
    review: '👀',
    'review-pending': '⏸️',
    revision: '🔧',
    done: '✅',
    failed: '❌',
    aborted: '🛑',
    'needs-human-rebase': '⚠️',
    'integration-failure': '💥',
  }

  return icons[status] ?? '❓'
}
