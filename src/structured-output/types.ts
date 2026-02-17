/**
 * KARIMO Structured Output Types
 *
 * Type definitions for the structured output validation system.
 * Provides type-safe agent outputs through Zod schema validation.
 */

import type { ZodError, ZodSchema } from 'zod'

/**
 * Result of validating agent output.
 */
export interface ValidationResult<T> {
  /** Whether validation succeeded */
  success: boolean

  /** The validated and typed data (if successful) */
  data?: T

  /** The raw input that was validated */
  raw: string

  /** Validation errors (if failed) */
  errors?: ValidationError[]

  /** Whether fallback to unstructured was used */
  usedFallback: boolean
}

/**
 * A single validation error.
 */
export interface ValidationError {
  /** Path to the invalid field */
  path: string[]

  /** Error message */
  message: string

  /** Expected type or format */
  expected?: string

  /** Received value (truncated if long) */
  received?: string
}

/**
 * Options for output validation.
 */
export interface ValidationOptions {
  /** Whether to allow fallback to unstructured on failure */
  allowFallback?: boolean

  /** Maximum attempts to parse JSON from output */
  maxParseAttempts?: number

  /** Whether to strip markdown code blocks before parsing */
  stripMarkdownBlocks?: boolean
}

/**
 * Default validation options.
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  allowFallback: true,
  maxParseAttempts: 3,
  stripMarkdownBlocks: true,
}

/**
 * Schema registry entry.
 */
export interface SchemaEntry<T> {
  /** Schema identifier */
  id: string

  /** Zod schema for validation */
  schema: ZodSchema<T>

  /** Description of what this schema is for */
  description: string

  /** Version of the schema */
  version: string
}

/**
 * Structured output configuration for API calls.
 */
export interface StructuredOutputConfig {
  /** The Zod schema to use */
  schema: ZodSchema

  /** Name for the schema (used in API) */
  name: string

  /** Whether this is a strict schema */
  strict?: boolean
}

/**
 * Convert Zod errors to our ValidationError format.
 *
 * @param zodError - The Zod error to convert
 * @returns Array of ValidationError objects
 */
export function zodErrorToValidationErrors(zodError: ZodError): ValidationError[] {
  return zodError.errors.map((error) => ({
    path: error.path.map(String),
    message: error.message,
    expected: 'expected' in error ? String(error.expected) : undefined,
    received: 'received' in error ? truncateValue(error.received) : undefined,
  }))
}

/**
 * Truncate a value for display in error messages.
 */
function truncateValue(value: unknown): string {
  const str = String(value)
  if (str.length > 100) {
    return `${str.slice(0, 100)}...`
  }
  return str
}
