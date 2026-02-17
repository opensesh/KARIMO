/**
 * KARIMO Structured Output Module
 *
 * Provides type-safe agent output validation through Zod schemas.
 * Includes JSON Schema conversion for CLI tools and graceful fallback.
 *
 * @example
 * ```typescript
 * import {
 *   validateOutput,
 *   createValidator,
 *   zodToJsonSchema,
 *   ReviewResultSchema,
 * } from '@/structured-output'
 *
 * // Validate agent output
 * const result = validateOutput(agentResponse, ReviewResultSchema)
 *
 * if (result.success) {
 *   console.log('Score:', result.data.score)
 *   console.log('Issues:', result.data.issues.length)
 * } else if (result.usedFallback) {
 *   console.log('Validation failed, using raw output')
 * }
 *
 * // Create a reusable validator
 * const validateReview = createValidator(ReviewResultSchema)
 * const reviewResult = validateReview(output)
 *
 * // Convert to JSON Schema for CLI
 * const jsonSchema = zodToJsonSchema(ReviewResultSchema)
 * // Use: claude --json-schema '...'
 * ```
 *
 * ## Schemas
 *
 * ### Review Schemas
 * - `ReviewResultSchema` - Complete review with score, issues, recommendations
 * - `SectionReviewSchema` - Section-specific review for parallel processing
 * - `ComplexityValidationSchema` - Task complexity validation
 *
 * ### Agent Schemas
 * - `TaskResultSchema` - Task execution result
 * - `InvestigationResultSchema` - Codebase investigation findings
 * - `TaskFindingSchema` - Cross-task findings for team coordination
 *
 * ### Common Schemas
 * - `FileReferenceSchema` - File path with optional line numbers
 * - `CodeSnippetSchema` - Code with file location
 * - `TokenUsageSchema` - Token consumption statistics
 *
 * ## Validation Behavior
 *
 * 1. Attempts to extract JSON from output (handles markdown blocks)
 * 2. Parses JSON with retry logic for common issues
 * 3. Validates against Zod schema
 * 4. On failure: returns errors with optional fallback to raw output
 */

// Types
export type {
  SchemaEntry,
  StructuredOutputConfig,
  ValidationError,
  ValidationOptions,
  ValidationResult,
} from './types'

export { DEFAULT_VALIDATION_OPTIONS, zodErrorToValidationErrors } from './types'

// Converter
export type { ConversionOptions, JsonSchema } from './converter'

export { createCliJsonSchema, stringifyJsonSchema, zodToJsonSchema } from './converter'

// Validator
export {
  assertValidOutput,
  createValidator,
  formatValidationErrors,
  isJsonParseError,
  isSchemaValidationError,
  tryValidateOutput,
  validateOutput,
} from './validator'

// Schemas - re-export from schemas index
export * from './schemas'
