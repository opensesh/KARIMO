/**
 * KARIMO Team Findings
 *
 * Cross-agent communication through findings.
 * Findings allow one task to communicate discoveries to another.
 */

import type { FindingType, TaskFinding, TeamTaskEntry } from './types'

/**
 * Options for creating a finding.
 */
export interface CreateFindingOptions {
  /** Source task ID */
  fromTaskId: string

  /** Target task ID */
  toTaskId: string

  /** Type of finding */
  type: FindingType

  /** Description of the finding */
  message: string

  /** Affected files (if applicable) */
  files?: string[]

  /** Whether this should block the target task */
  blocking?: boolean
}

/**
 * Create a new finding.
 */
export function createFinding(options: CreateFindingOptions): TaskFinding {
  const finding: TaskFinding = {
    fromTaskId: options.fromTaskId,
    toTaskId: options.toTaskId,
    type: options.type,
    message: options.message,
    createdAt: new Date().toISOString(),
  }

  if (options.files !== undefined && options.files.length > 0) {
    finding.files = options.files
  }

  if (options.blocking !== undefined) {
    finding.blocking = options.blocking
  }

  return finding
}

/**
 * Create an "affects-file" finding when one task modifies files another depends on.
 */
export function createAffectsFileFinding(
  fromTaskId: string,
  toTaskId: string,
  files: string[],
  blocking = false
): TaskFinding {
  return createFinding({
    fromTaskId,
    toTaskId,
    type: 'affects-file',
    message: `Task modified files that may affect this task: ${files.join(', ')}`,
    files,
    blocking,
  })
}

/**
 * Create an "interface-change" finding when an API/interface was modified.
 */
export function createInterfaceChangeFinding(
  fromTaskId: string,
  toTaskId: string,
  description: string,
  files?: string[]
): TaskFinding {
  const options: CreateFindingOptions = {
    fromTaskId,
    toTaskId,
    type: 'interface-change',
    message: description,
    blocking: true, // Interface changes are typically blocking
  }

  if (files !== undefined) {
    options.files = files
  }

  return createFinding(options)
}

/**
 * Create a "discovered-dependency" finding for runtime-discovered dependencies.
 */
export function createDiscoveredDependencyFinding(
  fromTaskId: string,
  toTaskId: string,
  description: string
): TaskFinding {
  return createFinding({
    fromTaskId,
    toTaskId,
    type: 'discovered-dependency',
    message: description,
    blocking: true,
  })
}

/**
 * Create a warning finding (non-blocking).
 */
export function createWarningFinding(
  fromTaskId: string,
  toTaskId: string,
  message: string,
  files?: string[]
): TaskFinding {
  const options: CreateFindingOptions = {
    fromTaskId,
    toTaskId,
    type: 'warning',
    message,
    blocking: false,
  }

  if (files !== undefined) {
    options.files = files
  }

  return createFinding(options)
}

/**
 * Create an info finding (non-blocking).
 */
export function createInfoFinding(
  fromTaskId: string,
  toTaskId: string,
  message: string
): TaskFinding {
  return createFinding({
    fromTaskId,
    toTaskId,
    type: 'info',
    message,
    blocking: false,
  })
}

/**
 * Format findings for injection into an agent prompt.
 */
export function formatFindingsForPrompt(findings: TaskFinding[]): string {
  if (findings.length === 0) {
    return ''
  }

  const lines: string[] = [
    '## Findings from Other Tasks',
    '',
    'The following findings from other tasks may affect your work:',
    '',
  ]

  for (const finding of findings) {
    const blocking = finding.blocking ? ' **[BLOCKING]**' : ''
    const typeLabel = formatFindingType(finding.type)

    lines.push(`### ${typeLabel}${blocking}`)
    lines.push(`**From Task:** ${finding.fromTaskId}`)
    lines.push(`**Message:** ${finding.message}`)

    if (finding.files && finding.files.length > 0) {
      lines.push(`**Files:** ${finding.files.join(', ')}`)
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format finding type for display.
 */
function formatFindingType(type: FindingType): string {
  switch (type) {
    case 'affects-file':
      return 'File Modification'
    case 'interface-change':
      return 'Interface Change'
    case 'discovered-dependency':
      return 'Discovered Dependency'
    case 'warning':
      return 'Warning'
    case 'info':
      return 'Info'
  }
}

/**
 * Get all blocking findings for a task.
 */
export function getBlockingFindings(task: TeamTaskEntry): TaskFinding[] {
  return task.findings.filter((f) => f.blocking === true)
}

/**
 * Check if a task has any blocking findings.
 */
export function hasBlockingFindings(task: TeamTaskEntry): boolean {
  return task.findings.some((f) => f.blocking === true)
}

/**
 * Group findings by source task.
 */
export function groupFindingsBySource(findings: TaskFinding[]): Map<string, TaskFinding[]> {
  const groups = new Map<string, TaskFinding[]>()

  for (const finding of findings) {
    const existing = groups.get(finding.fromTaskId) ?? []
    existing.push(finding)
    groups.set(finding.fromTaskId, existing)
  }

  return groups
}

/**
 * Group findings by type.
 */
export function groupFindingsByType(findings: TaskFinding[]): Map<FindingType, TaskFinding[]> {
  const groups = new Map<FindingType, TaskFinding[]>()

  for (const finding of findings) {
    const existing = groups.get(finding.type) ?? []
    existing.push(finding)
    groups.set(finding.type, existing)
  }

  return groups
}
