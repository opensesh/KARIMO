/**
 * KARIMO Output Validator
 *
 * Validates agent outputs against Zod schemas with graceful fallback.
 */

import { ZodError, type ZodSchema, type ZodTypeDef } from 'zod'
import {
  DEFAULT_VALIDATION_OPTIONS,
  type ValidationError,
  type ValidationOptions,
  type ValidationResult,
  zodErrorToValidationErrors,
} from './types'

/**
 * Extract JSON from a string that may contain markdown or other content.
 *
 * @param content - The raw content to extract JSON from
 * @param stripMarkdown - Whether to strip markdown code blocks
 * @returns Extracted JSON string or null if not found
 */
function extractJson(content: string, stripMarkdown: boolean): string | null {
  let text = content.trim()

  if (stripMarkdown) {
    // Try to extract from markdown code blocks
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch?.[1]) {
      text = jsonBlockMatch[1].trim()
    }
  }

  // Try to find JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch?.[1]) {
    return jsonMatch[1]
  }

  return null
}

/**
 * Parse JSON with multiple attempts.
 *
 * @param content - The content to parse
 * @param maxAttempts - Maximum parse attempts
 * @returns Parsed object or null
 */
function parseJsonWithRetry(content: string, maxAttempts: number): unknown | null {
  const attempts: string[] = [
    content,
    content.trim(),
    // Try stripping trailing comma issues
    content.replace(/,\s*([}\]])/g, '$1'),
    // Try stripping leading/trailing content
    extractJson(content, true) ?? content,
  ]

  for (let i = 0; i < Math.min(maxAttempts, attempts.length); i++) {
    const attempt = attempts[i]
    if (!attempt) continue

    try {
      return JSON.parse(attempt)
    } catch {
      // Try next attempt
    }
  }

  return null
}

/**
 * Validate agent output against a Zod schema.
 *
 * @param output - The raw output string from the agent
 * @param schema - The Zod schema to validate against
 * @param options - Validation options
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```typescript
 * import { validateOutput } from '@/structured-output'
 * import { ReviewResultSchema } from '@/structured-output/schemas/review'
 *
 * const result = validateOutput(agentResponse, ReviewResultSchema)
 *
 * if (result.success) {
 *   console.log('Score:', result.data.score)
 * } else if (result.usedFallback) {
 *   console.log('Using raw output:', result.raw)
 * } else {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validateOutput<T>(
  output: string,
  schema: ZodSchema<T, ZodTypeDef, unknown>,
  options?: ValidationOptions
): ValidationResult<T> {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options }

  // Try to extract and parse JSON
  const jsonString = opts.stripMarkdownBlocks ? extractJson(output, true) : output
  const parsed = parseJsonWithRetry(jsonString ?? output, opts.maxParseAttempts ?? 3)

  if (parsed === null) {
    // JSON parsing failed
    if (opts.allowFallback) {
      return {
        success: false,
        raw: output,
        errors: [
          {
            path: [],
            message: 'Failed to parse JSON from output',
            expected: 'valid JSON',
            received: output.slice(0, 100) + (output.length > 100 ? '...' : ''),
          },
        ],
        usedFallback: true,
      }
    }

    return {
      success: false,
      raw: output,
      errors: [
        {
          path: [],
          message: 'Failed to parse JSON from output',
        },
      ],
      usedFallback: false,
    }
  }

  // Validate against schema
  const validationResult = schema.safeParse(parsed)

  if (validationResult.success) {
    return {
      success: true,
      data: validationResult.data,
      raw: output,
      usedFallback: false,
    }
  }

  // Validation failed
  const errors = zodErrorToValidationErrors(validationResult.error)

  if (opts.allowFallback) {
    return {
      success: false,
      raw: output,
      errors,
      usedFallback: true,
    }
  }

  return {
    success: false,
    raw: output,
    errors,
    usedFallback: false,
  }
}

/**
 * Validate and assert output, throwing on failure.
 *
 * @param output - The raw output string
 * @param schema - The Zod schema to validate against
 * @returns The validated and typed data
 * @throws Error if validation fails
 */
export function assertValidOutput<T>(
  output: string,
  schema: ZodSchema<T, ZodTypeDef, unknown>
): T {
  const result = validateOutput(output, schema, { allowFallback: false })

  if (!result.success) {
    const errorMessages = result.errors
      ?.map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')

    throw new Error(`Output validation failed: ${errorMessages}`)
  }

  return result.data as T
}

/**
 * Try to validate output, returning undefined on failure.
 *
 * @param output - The raw output string
 * @param schema - The Zod schema to validate against
 * @returns The validated data or undefined
 */
export function tryValidateOutput<T>(
  output: string,
  schema: ZodSchema<T, ZodTypeDef, unknown>
): T | undefined {
  const result = validateOutput(output, schema, { allowFallback: false })
  return result.success ? result.data : undefined
}

/**
 * Create a validator function bound to a specific schema.
 *
 * @param schema - The Zod schema
 * @param defaultOptions - Default options for this validator
 * @returns A validator function
 *
 * @example
 * ```typescript
 * const validateReview = createValidator(ReviewResultSchema)
 *
 * const result = validateReview(agentOutput)
 * ```
 */
export function createValidator<T>(
  schema: ZodSchema<T, ZodTypeDef, unknown>,
  defaultOptions?: ValidationOptions
): (output: string, options?: ValidationOptions) => ValidationResult<T> {
  return (output: string, options?: ValidationOptions) => {
    return validateOutput(output, schema, { ...defaultOptions, ...options })
  }
}

/**
 * Format validation errors for display.
 *
 * @param errors - Array of validation errors
 * @returns Formatted error string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => {
      const path = error.path.length > 0 ? `${error.path.join('.')}: ` : ''
      let message = `${path}${error.message}`

      if (error.expected) {
        message += ` (expected: ${error.expected})`
      }

      if (error.received) {
        message += ` (received: ${error.received})`
      }

      return message
    })
    .join('\n')
}

/**
 * Check if a validation result indicates a JSON parsing failure.
 */
export function isJsonParseError(result: ValidationResult<unknown>): boolean {
  return (
    !result.success &&
    result.errors?.some((e) => e.message.includes('Failed to parse JSON')) === true
  )
}

/**
 * Check if a validation result indicates a schema validation failure.
 */
export function isSchemaValidationError(result: ValidationResult<unknown>): boolean {
  return !result.success && !isJsonParseError(result)
}
