/**
 * KARIMO Config Errors
 *
 * Custom error classes for configuration-related issues.
 * These provide clear, actionable error messages with context
 * for debugging configuration problems.
 */

import type { ZodError, ZodIssue } from 'zod'

/**
 * Base class for all configuration errors.
 */
export class KarimoConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KarimoConfigError'
  }
}

/**
 * Thrown when no config file is found in the directory tree.
 */
export class ConfigNotFoundError extends KarimoConfigError {
  constructor(
    public searchedFrom: string,
    public searchedFor = '.karimo/config.yaml'
  ) {
    super(
      `Configuration file not found.\n  Searched from: ${searchedFrom}\n  Looking for: ${searchedFor}\n\nRun 'karimo init' to create a configuration file.`
    )
    this.name = 'ConfigNotFoundError'
  }
}

/**
 * Thrown when the config file exists but cannot be read.
 */
export class ConfigReadError extends KarimoConfigError {
  public originalError: Error

  constructor(configPath: string, originalError: Error) {
    super(
      `Failed to read configuration file.\n  Path: ${configPath}\n  Reason: ${originalError.message}\n\nCheck file permissions and ensure the file is accessible.`
    )
    this.name = 'ConfigReadError'
    this.originalError = originalError
  }
}

/**
 * Thrown when the config file contains invalid YAML syntax.
 */
export class ConfigParseError extends KarimoConfigError {
  public originalError: Error

  constructor(configPath: string, originalError: Error) {
    super(
      `Invalid YAML syntax in configuration file.\n  Path: ${configPath}\n  Reason: ${originalError.message}\n\nFix the YAML syntax errors and try again.`
    )
    this.name = 'ConfigParseError'
    this.originalError = originalError
  }
}

/**
 * Format a Zod issue into a human-readable string.
 */
function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
  return `  - ${path}: ${issue.message}`
}

/**
 * Thrown when the config file fails Zod validation.
 */
export class ConfigValidationError extends KarimoConfigError {
  public issues: ZodIssue[]

  constructor(
    public configPath: string,
    public zodError: ZodError
  ) {
    const issueList = zodError.issues.map(formatZodIssue).join('\n')
    super(
      `Configuration validation failed.\n  Path: ${configPath}\n  Issues:\n${issueList}\n\nFix the configuration values and try again.`
    )
    this.name = 'ConfigValidationError'
    this.issues = zodError.issues
  }

  /**
   * Get the field paths that failed validation.
   */
  getFieldPaths(): string[] {
    return this.issues.map((issue) => issue.path.join('.'))
  }
}
