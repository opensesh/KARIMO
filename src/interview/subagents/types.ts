/**
 * KARIMO Interview Subagent Types
 *
 * Type definitions for spawnable subagents that handle focused tasks
 * within the interview system.
 */

/**
 * Parent agent types that can spawn subagents.
 */
export type ParentAgentType = 'interview' | 'investigation' | 'review'

/**
 * Interview agent subagent types.
 */
export type InterviewSubagentType =
  | 'clarification' // Deep-dive on ambiguous requirements
  | 'research' // Investigate codebase during interview
  | 'scope-validator' // Validate scope against existing code

/**
 * Investigation agent subagent types.
 */
export type InvestigationSubagentType =
  | 'pattern-analyzer' // Analyze specific code patterns deeply
  | 'dependency-mapper' // Map import/dependency chains

/**
 * Review agent subagent types.
 */
export type ReviewSubagentType =
  | 'section-reviewer' // Review specific PRD section (parallelizable)
  | 'complexity-validator' // Validate complexity scores

/**
 * All subagent types.
 */
export type SubagentType = InterviewSubagentType | InvestigationSubagentType | ReviewSubagentType

/**
 * Context provided to a subagent.
 */
export interface SubagentContext {
  /** PRD content (full or partial) */
  prdContent?: string

  /** Relevant conversation messages */
  relevantMessages?: Array<{ role: 'user' | 'assistant'; content: string }>

  /** Project configuration */
  projectConfig?: {
    name: string
    language: string
    framework?: string
  }

  /** Files relevant to the task */
  relevantFiles?: string[]

  /** Additional context specific to the subagent type */
  additionalContext?: Record<string, unknown>
}

/**
 * Request to spawn a subagent.
 */
export interface SubagentSpawnRequest {
  /** Unique spawn ID */
  id: string

  /** Type of subagent to spawn */
  type: SubagentType

  /** Parent agent type */
  parent: ParentAgentType

  /** Task description for the subagent */
  task: string

  /** Context for the subagent */
  context: SubagentContext

  /** Timeout in milliseconds (default: 60000) */
  timeout?: number

  /** Priority (affects execution order) */
  priority?: 'high' | 'normal' | 'low'
}

/**
 * Token usage statistics for a subagent.
 */
export interface SubagentTokenUsage {
  /** Input tokens consumed */
  inputTokens: number

  /** Output tokens generated */
  outputTokens: number

  /** Cache read tokens (if applicable) */
  cacheReadTokens?: number

  /** Model used */
  model: string
}

/**
 * Result from a subagent execution.
 */
export interface SubagentResult {
  /** Spawn ID this result corresponds to */
  spawnId: string

  /** Completion status */
  status: 'completed' | 'failed' | 'timeout' | 'cancelled'

  /** Text content of the result */
  content: string

  /** Structured data (type-specific) */
  data?: SubagentResultData

  /** Token usage */
  usage: SubagentTokenUsage

  /** Duration in milliseconds */
  durationMs: number

  /** Error message if failed */
  error?: string
}

/**
 * Type-specific result data.
 */
export type SubagentResultData =
  | ClarificationResultData
  | ResearchResultData
  | ScopeValidationResultData
  | PatternAnalysisResultData
  | DependencyMapResultData
  | SectionReviewResultData
  | ComplexityValidationResultData

/**
 * Clarification subagent result.
 */
export interface ClarificationResultData {
  type: 'clarification'
  questions: Array<{
    id: string
    question: string
    reason: string
    priority: 'blocking' | 'important' | 'nice-to-have'
  }>
  resolvedAmbiguities: string[]
}

/**
 * Research subagent result.
 */
export interface ResearchResultData {
  type: 'research'
  findings: Array<{
    topic: string
    summary: string
    relevantFiles: string[]
    confidence: 'high' | 'medium' | 'low'
  }>
  recommendations: string[]
}

/**
 * Scope validation subagent result.
 */
export interface ScopeValidationResultData {
  type: 'scope-validation'
  isValid: boolean
  concerns: Array<{
    type: 'too-broad' | 'too-narrow' | 'overlapping' | 'unclear'
    description: string
    suggestion: string
  }>
  relatedExistingCode: string[]
}

/**
 * Pattern analysis subagent result.
 */
export interface PatternAnalysisResultData {
  type: 'pattern-analysis'
  patterns: Array<{
    name: string
    description: string
    locations: string[]
    frequency: 'common' | 'occasional' | 'rare'
  }>
  antiPatterns: Array<{
    name: string
    description: string
    locations: string[]
    suggestion: string
  }>
}

/**
 * Dependency map subagent result.
 */
export interface DependencyMapResultData {
  type: 'dependency-map'
  files: Array<{
    path: string
    imports: string[]
    importedBy: string[]
    externalDeps: string[]
  }>
  circularDependencies: string[][]
  suggestions: string[]
}

/**
 * Section review subagent result.
 */
export interface SectionReviewResultData {
  type: 'section-review'
  sectionId: string
  score: number
  issues: Array<{
    severity: 'error' | 'warning' | 'suggestion'
    description: string
    suggestion?: string
  }>
  summary: string
}

/**
 * Complexity validation subagent result.
 */
export interface ComplexityValidationResultData {
  type: 'complexity-validation'
  taskId: string
  originalComplexity: number
  validatedComplexity: number
  isAccurate: boolean
  reasoning: string
  factors: Array<{
    factor: string
    impact: 'increases' | 'decreases' | 'neutral'
  }>
}

/**
 * Subagent execution state.
 */
export type SubagentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/**
 * Tracked subagent execution.
 */
export interface SubagentExecution {
  /** Spawn request */
  request: SubagentSpawnRequest

  /** Current status */
  status: SubagentStatus

  /** Start time */
  startedAt?: Date

  /** Completion time */
  completedAt?: Date

  /** Result (if completed) */
  result?: SubagentResult
}

/**
 * History entry for session persistence.
 */
export interface SubagentHistoryEntry {
  /** Spawn request */
  request: SubagentSpawnRequest

  /** Result */
  result: SubagentResult

  /** When this was executed */
  executedAt: string
}
