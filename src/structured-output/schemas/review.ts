/**
 * KARIMO Review Schemas
 *
 * Zod schemas for review agent outputs.
 */

import { z } from 'zod'
import { OutputMetadataSchema, SeveritySchema } from './common'

/**
 * Review issue category.
 */
export const ReviewIssueCategorySchema = z.enum([
  'missing-acceptance-criteria',
  'high-complexity-not-split',
  'conflicting-requirements',
  'missing-edge-cases',
  'unclear-scope',
  'insufficient-context',
  'security-concern',
  'performance-concern',
  'maintainability-concern',
  'other',
])

export type ReviewIssueCategory = z.infer<typeof ReviewIssueCategorySchema>

/**
 * A single review issue.
 */
export const ReviewIssueSchema = z.object({
  /** Issue severity */
  severity: SeveritySchema,
  /** Issue category */
  category: ReviewIssueCategorySchema,
  /** Issue description */
  description: z.string(),
  /** Affected section or task ID */
  location: z.string(),
  /** Suggested fix */
  suggestion: z.string().optional(),
  /** Related files */
  affectedFiles: z.array(z.string()).optional(),
})

export type ReviewIssue = z.infer<typeof ReviewIssueSchema>

/**
 * Complete review result schema.
 */
export const ReviewResultSchema = z.object({
  /** Overall PRD quality score (1-10) */
  score: z.number().int().min(1).max(10),
  /** Issues found */
  issues: z.array(ReviewIssueSchema),
  /** Overall summary */
  summary: z.string(),
  /** Recommended actions before finalization */
  recommendations: z.array(z.string()),
  /** Whether the PRD is ready for finalization */
  readyForFinalization: z.boolean(),
  /** Strengths identified */
  strengths: z.array(z.string()).optional(),
  /** Output metadata */
  metadata: OutputMetadataSchema.optional(),
})

export type ReviewResult = z.infer<typeof ReviewResultSchema>

/**
 * Section-specific review result (for parallel reviews).
 */
export const SectionReviewSchema = z.object({
  /** Section being reviewed */
  sectionId: z.string(),
  /** Section name */
  sectionName: z.string(),
  /** Section-specific score (1-10) */
  score: z.number().int().min(1).max(10),
  /** Issues in this section */
  issues: z.array(ReviewIssueSchema),
  /** Section-specific summary */
  summary: z.string(),
  /** Suggestions for improvement */
  suggestions: z.array(z.string()),
})

export type SectionReview = z.infer<typeof SectionReviewSchema>

/**
 * Complexity validation result.
 */
export const ComplexityValidationSchema = z.object({
  /** Task ID being validated */
  taskId: z.string(),
  /** Original complexity score */
  originalComplexity: z.number().int().min(1).max(10),
  /** Validated complexity score */
  validatedComplexity: z.number().int().min(1).max(10),
  /** Whether the original was accurate */
  isAccurate: z.boolean(),
  /** Reasoning for the validation */
  reasoning: z.string(),
  /** Factors that influenced the assessment */
  factors: z.array(
    z.object({
      factor: z.string(),
      impact: z.enum(['increases', 'decreases', 'neutral']),
      weight: z.number().min(0).max(1),
    })
  ),
})

export type ComplexityValidation = z.infer<typeof ComplexityValidationSchema>

/**
 * Full PRD review with section breakdowns.
 */
export const FullPRDReviewSchema = z.object({
  /** Overall review result */
  overall: ReviewResultSchema,
  /** Section-by-section reviews */
  sections: z.array(SectionReviewSchema).optional(),
  /** Complexity validations for tasks */
  complexityValidations: z.array(ComplexityValidationSchema).optional(),
  /** Cross-cutting concerns */
  crossCuttingConcerns: z
    .array(
      z.object({
        concern: z.string(),
        affectedSections: z.array(z.string()),
        recommendation: z.string(),
      })
    )
    .optional(),
})

export type FullPRDReview = z.infer<typeof FullPRDReviewSchema>
