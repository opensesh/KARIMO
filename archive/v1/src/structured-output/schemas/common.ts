/**
 * KARIMO Common Schemas
 *
 * Shared Zod schemas used across multiple agent outputs.
 */

import { z } from 'zod'

/**
 * Severity level for issues and findings.
 */
export const SeveritySchema = z.enum(['error', 'warning', 'suggestion', 'info'])

export type Severity = z.infer<typeof SeveritySchema>

/**
 * Confidence level for estimates and decisions.
 */
export const ConfidenceSchema = z.enum(['high', 'medium', 'low', 'none'])

export type Confidence = z.infer<typeof ConfidenceSchema>

/**
 * File reference with optional line numbers.
 */
export const FileReferenceSchema = z.object({
  /** File path relative to project root */
  path: z.string(),
  /** Starting line number (1-indexed) */
  startLine: z.number().int().positive().optional(),
  /** Ending line number (1-indexed) */
  endLine: z.number().int().positive().optional(),
})

export type FileReference = z.infer<typeof FileReferenceSchema>

/**
 * Code snippet with file location.
 */
export const CodeSnippetSchema = z.object({
  /** File reference */
  file: FileReferenceSchema,
  /** The code content */
  content: z.string(),
  /** Language for syntax highlighting */
  language: z.string().optional(),
})

export type CodeSnippet = z.infer<typeof CodeSnippetSchema>

/**
 * Token usage statistics.
 */
export const TokenUsageSchema = z.object({
  /** Input tokens consumed */
  inputTokens: z.number().int().nonnegative(),
  /** Output tokens generated */
  outputTokens: z.number().int().nonnegative(),
  /** Cache read tokens (if applicable) */
  cacheReadTokens: z.number().int().nonnegative().optional(),
  /** Cache write tokens (if applicable) */
  cacheWriteTokens: z.number().int().nonnegative().optional(),
})

export type TokenUsage = z.infer<typeof TokenUsageSchema>

/**
 * Generic recommendation item.
 */
export const RecommendationSchema = z.object({
  /** Short title */
  title: z.string(),
  /** Detailed description */
  description: z.string(),
  /** Priority level */
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  /** Related files */
  files: z.array(z.string()).optional(),
})

export type Recommendation = z.infer<typeof RecommendationSchema>

/**
 * Status for task or operation completion.
 */
export const CompletionStatusSchema = z.enum([
  'completed',
  'partial',
  'failed',
  'blocked',
  'skipped',
])

export type CompletionStatus = z.infer<typeof CompletionStatusSchema>

/**
 * Generic metadata for agent outputs.
 */
export const OutputMetadataSchema = z.object({
  /** When the output was generated */
  generatedAt: z.string().datetime().optional(),
  /** Model used to generate */
  model: z.string().optional(),
  /** Agent version */
  agentVersion: z.string().optional(),
  /** Processing duration in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),
  /** Token usage */
  tokenUsage: TokenUsageSchema.optional(),
})

export type OutputMetadata = z.infer<typeof OutputMetadataSchema>
