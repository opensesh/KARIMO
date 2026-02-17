/**
 * KARIMO Agent Schemas
 *
 * Zod schemas for task execution and investigation agent outputs.
 */

import { z } from 'zod'
import {
  CodeSnippetSchema,
  CompletionStatusSchema,
  ConfidenceSchema,
  FileReferenceSchema,
  OutputMetadataSchema,
  SeveritySchema,
} from './common'

// =============================================================================
// Task Execution Schemas
// =============================================================================

/**
 * File modification made during task execution.
 */
export const FileModificationSchema = z.object({
  /** File path relative to project root */
  path: z.string(),
  /** Type of modification */
  modificationType: z.enum(['created', 'modified', 'deleted', 'renamed']),
  /** Old path (for renames) */
  oldPath: z.string().optional(),
  /** Lines added */
  linesAdded: z.number().int().nonnegative().optional(),
  /** Lines removed */
  linesRemoved: z.number().int().nonnegative().optional(),
})

export type FileModification = z.infer<typeof FileModificationSchema>

/**
 * Validation check result.
 */
export const ValidationCheckSchema = z.object({
  /** Check name (e.g., "build", "typecheck", "lint") */
  name: z.string(),
  /** Whether the check passed */
  passed: z.boolean(),
  /** Output or error message */
  output: z.string().optional(),
  /** Duration in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),
})

export type ValidationCheck = z.infer<typeof ValidationCheckSchema>

/**
 * Task execution result schema.
 */
export const TaskResultSchema = z.object({
  /** Task ID */
  taskId: z.string(),
  /** Completion status */
  status: CompletionStatusSchema,
  /** Human-readable summary of what was done */
  summary: z.string(),
  /** Files modified during execution */
  filesModified: z.array(FileModificationSchema),
  /** Validation checks performed */
  validationChecks: z.array(ValidationCheckSchema),
  /** Whether all success criteria were met */
  successCriteriaMet: z.boolean(),
  /** Details on each success criterion */
  criteriaResults: z
    .array(
      z.object({
        criterion: z.string(),
        met: z.boolean(),
        evidence: z.string().optional(),
      })
    )
    .optional(),
  /** Issues encountered during execution */
  issues: z
    .array(
      z.object({
        severity: SeveritySchema,
        message: z.string(),
        file: z.string().optional(),
      })
    )
    .optional(),
  /** Recommendations for follow-up */
  recommendations: z.array(z.string()).optional(),
  /** Output metadata */
  metadata: OutputMetadataSchema.optional(),
})

export type TaskResult = z.infer<typeof TaskResultSchema>

// =============================================================================
// Investigation Schemas
// =============================================================================

/**
 * Pattern found during investigation.
 */
export const PatternSchema = z.object({
  /** Pattern name */
  name: z.string(),
  /** Pattern description */
  description: z.string(),
  /** Example locations */
  examples: z.array(FileReferenceSchema),
  /** How common this pattern is */
  frequency: z.enum(['common', 'occasional', 'rare']),
})

export type Pattern = z.infer<typeof PatternSchema>

/**
 * Investigation result schema.
 */
export const InvestigationResultSchema = z.object({
  /** Query that was investigated */
  query: z.string(),
  /** Files found relevant to the query */
  files: z.array(z.string()),
  /** Relevant code snippets */
  snippets: z.array(CodeSnippetSchema),
  /** Summary of findings */
  summary: z.string(),
  /** Patterns discovered */
  patterns: z.array(PatternSchema).optional(),
  /** Confidence in the findings */
  confidence: ConfidenceSchema,
  /** Suggestions for further investigation */
  furtherInvestigation: z.array(z.string()).optional(),
  /** Output metadata */
  metadata: OutputMetadataSchema.optional(),
})

export type InvestigationResult = z.infer<typeof InvestigationResultSchema>

/**
 * Dependency mapping result.
 */
export const DependencyMapSchema = z.object({
  /** File being analyzed */
  file: z.string(),
  /** Direct imports */
  imports: z.array(
    z.object({
      source: z.string(),
      specifiers: z.array(z.string()),
      isTypeOnly: z.boolean().optional(),
    })
  ),
  /** Files that import this file */
  importedBy: z.array(z.string()),
  /** External dependencies used */
  externalDependencies: z.array(z.string()),
  /** Circular dependencies detected */
  circularDependencies: z.array(z.array(z.string())).optional(),
})

export type DependencyMap = z.infer<typeof DependencyMapSchema>

// =============================================================================
// Interview Schemas
// =============================================================================

/**
 * Clarification question for ambiguous requirements.
 */
export const ClarificationQuestionSchema = z.object({
  /** Question ID */
  id: z.string(),
  /** The question text */
  question: z.string(),
  /** Why this clarification is needed */
  reason: z.string(),
  /** Suggested answers if applicable */
  suggestedAnswers: z.array(z.string()).optional(),
  /** Related requirement or task */
  relatedTo: z.string().optional(),
  /** Priority of getting this clarified */
  priority: z.enum(['blocking', 'important', 'nice-to-have']),
})

export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>

/**
 * Scope validation result.
 */
export const ScopeValidationSchema = z.object({
  /** Whether the scope is valid */
  isValid: z.boolean(),
  /** Scope concerns identified */
  concerns: z.array(
    z.object({
      type: z.enum(['too-broad', 'too-narrow', 'overlapping', 'unclear', 'missing-context']),
      description: z.string(),
      suggestion: z.string(),
    })
  ),
  /** Existing code that relates to the scope */
  relatedCode: z.array(FileReferenceSchema).optional(),
  /** Potential conflicts with existing code */
  potentialConflicts: z.array(z.string()).optional(),
})

export type ScopeValidation = z.infer<typeof ScopeValidationSchema>

// =============================================================================
// Team/Coordination Schemas
// =============================================================================

/**
 * Finding from one task that affects another.
 */
export const TaskFindingSchema = z.object({
  /** Source task ID */
  fromTaskId: z.string(),
  /** Target task ID */
  toTaskId: z.string(),
  /** Type of finding */
  type: z.enum(['affects-file', 'interface-change', 'discovered-dependency', 'warning', 'info']),
  /** Description of the finding */
  message: z.string(),
  /** Affected files */
  files: z.array(z.string()).optional(),
  /** Whether this should block the target task */
  blocking: z.boolean().optional(),
})

export type TaskFinding = z.infer<typeof TaskFindingSchema>
