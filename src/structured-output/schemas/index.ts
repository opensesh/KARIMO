/**
 * KARIMO Structured Output Schemas
 *
 * Barrel exports for all Zod schemas.
 */

// Common schemas
export {
  CodeSnippetSchema,
  CompletionStatusSchema,
  ConfidenceSchema,
  FileReferenceSchema,
  OutputMetadataSchema,
  RecommendationSchema,
  SeveritySchema,
  TokenUsageSchema,
} from './common'

export type {
  CodeSnippet,
  CompletionStatus,
  Confidence,
  FileReference,
  OutputMetadata,
  Recommendation,
  Severity,
  TokenUsage,
} from './common'

// Review schemas
export {
  ComplexityValidationSchema,
  FullPRDReviewSchema,
  ReviewIssueCategorySchema,
  ReviewIssueSchema,
  ReviewResultSchema,
  SectionReviewSchema,
} from './review'

export type {
  ComplexityValidation,
  FullPRDReview,
  ReviewIssue,
  ReviewIssueCategory,
  ReviewResult,
  SectionReview,
} from './review'

// Agent schemas
export {
  ClarificationQuestionSchema,
  DependencyMapSchema,
  FileModificationSchema,
  InvestigationResultSchema,
  PatternSchema,
  ScopeValidationSchema,
  TaskFindingSchema,
  TaskResultSchema,
  ValidationCheckSchema,
} from './agent'

export type {
  ClarificationQuestion,
  DependencyMap,
  FileModification,
  InvestigationResult,
  Pattern,
  ScopeValidation,
  TaskFinding,
  TaskResult,
  ValidationCheck,
} from './agent'
