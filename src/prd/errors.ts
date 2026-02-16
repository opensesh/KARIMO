/**
 * KARIMO PRD Errors
 *
 * Custom error classes for PRD parsing, validation, and dependency resolution.
 * These provide clear, actionable error messages with context for debugging.
 */

import type { ZodError, ZodIssue } from 'zod'

/**
 * Format a Zod issue into a human-readable string.
 */
function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
  return `  - ${path}: ${issue.message}`
}

/**
 * Base class for all PRD-related errors.
 */
export class KarimoPRDError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KarimoPRDError'
  }
}

/**
 * Thrown when the PRD file is not found at the specified path.
 */
export class PRDNotFoundError extends KarimoPRDError {
  constructor(public prdPath: string) {
    super(`PRD file not found.\n  Path: ${prdPath}\n\nEnsure the PRD file exists at the specified path.`)
    this.name = 'PRDNotFoundError'
  }
}

/**
 * Thrown when the PRD file exists but cannot be read.
 */
export class PRDReadError extends KarimoPRDError {
  constructor(
    public prdPath: string,
    public originalError: Error
  ) {
    super(
      `Failed to read PRD file.\n  Path: ${prdPath}\n  Reason: ${originalError.message}\n\nCheck file permissions and ensure the file is accessible.`
    )
    this.name = 'PRDReadError'
  }
}

/**
 * Thrown when the YAML task block cannot be extracted from the PRD.
 */
export class PRDExtractionError extends KarimoPRDError {
  constructor(
    public sourceFile: string,
    public reason: string
  ) {
    super(
      `Failed to extract tasks from PRD.\n  File: ${sourceFile}\n  Reason: ${reason}\n\nEnsure the PRD has a "## Agent Tasks" heading followed by a YAML code block.`
    )
    this.name = 'PRDExtractionError'
  }
}

/**
 * Thrown when the YAML content cannot be parsed.
 */
export class PRDParseError extends KarimoPRDError {
  constructor(
    public sourceFile: string,
    public originalError: Error
  ) {
    super(
      `Invalid YAML syntax in PRD file.\n  File: ${sourceFile}\n  Reason: ${originalError.message}\n\nFix the YAML syntax errors and try again.`
    )
    this.name = 'PRDParseError'
  }
}

/**
 * Thrown when the parsed YAML fails Zod schema validation.
 */
export class PRDValidationError extends KarimoPRDError {
  public issues: ZodIssue[]

  constructor(
    public sourceFile: string,
    public zodError: ZodError
  ) {
    const issueList = zodError.issues.map(formatZodIssue).join('\n')
    super(`PRD validation failed.\n  File: ${sourceFile}\n  Issues:\n${issueList}\n\nFix the task definitions and try again.`)
    this.name = 'PRDValidationError'
    this.issues = zodError.issues
  }

  /**
   * Get the field paths that failed validation.
   */
  getFieldPaths(): string[] {
    return this.issues.map((issue) => issue.path.join('.'))
  }
}

/**
 * Thrown when a task references a dependency that doesn't exist.
 */
export class InvalidDependencyError extends KarimoPRDError {
  constructor(
    public taskId: string,
    public missingDep: string
  ) {
    super(
      `Invalid task dependency.\n  Task: ${taskId}\n  Missing dependency: ${missingDep}\n\nEnsure all task IDs in depends_on reference valid tasks.`
    )
    this.name = 'InvalidDependencyError'
  }
}

/**
 * Thrown when a cyclic dependency is detected in the task graph.
 */
export class CyclicDependencyError extends KarimoPRDError {
  constructor(public cyclePath: string[]) {
    const cycleStr = cyclePath.join(' → ')
    super(`Cyclic dependency detected in task graph.\n  Cycle: ${cycleStr}\n\nRemove or restructure dependencies to eliminate the cycle.`)
    this.name = 'CyclicDependencyError'
  }
}

/**
 * Thrown when duplicate task IDs are found in the PRD.
 */
export class DuplicateTaskIdError extends KarimoPRDError {
  constructor(public duplicateId: string) {
    super(`Duplicate task ID found.\n  ID: ${duplicateId}\n\nEnsure all task IDs are unique within the PRD.`)
    this.name = 'DuplicateTaskIdError'
  }
}
