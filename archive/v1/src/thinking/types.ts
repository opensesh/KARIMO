/**
 * KARIMO Extended Thinking Types
 *
 * Type definitions for the extended thinking decision system.
 * Extended thinking enables deeper reasoning for complex tasks
 * but adds latency/cost, so it should auto-enable based on signals.
 */

/**
 * Context used to determine if extended thinking should be enabled.
 */
export interface ThinkingContext {
  /** Task complexity score (1-10) */
  complexity: number

  /** Number of files affected by the task */
  filesAffectedCount: number

  /** Number of success criteria */
  successCriteriaCount: number

  /** The prompt content for keyword analysis */
  promptContent: string

  /** Whether this is a review agent call */
  isReviewAgent: boolean

  /** Optional: Task description for additional analysis */
  taskDescription?: string

  /** Optional: Additional context keywords found */
  additionalKeywords?: string[]
}

/**
 * Result of the extended thinking decision.
 */
export interface ThinkingDecision {
  /** Whether extended thinking should be enabled */
  enabled: boolean

  /** Budget tokens for extended thinking (0 if disabled) */
  budgetTokens: number

  /** Score that led to this decision (0-100) */
  score: number

  /** Reasons for the decision */
  reasons: string[]
}

/**
 * Weight configuration for thinking decision signals.
 */
export interface ThinkingSignalWeights {
  /** Weight for complexity score signal */
  complexity: number

  /** Weight for files affected signal */
  filesAffected: number

  /** Weight for success criteria signal */
  successCriteria: number

  /** Weight for architecture keywords */
  architectureKeywords: number

  /** Weight for refactor keywords */
  refactorKeywords: number

  /** Weight for review agent calls */
  reviewAgent: number
}

/**
 * Default signal weights.
 */
export const DEFAULT_SIGNAL_WEIGHTS: ThinkingSignalWeights = {
  complexity: 25, // High weight - complexity >= 7 contributes significantly
  filesAffected: 15, // Medium weight - 8+ files adds to score
  successCriteria: 15, // Medium weight - 6+ criteria adds to score
  architectureKeywords: 20, // Medium weight - architecture decisions
  refactorKeywords: 15, // Medium weight - refactoring tasks
  reviewAgent: 30, // High weight - always enable for review
}

/**
 * Thresholds for activating different signals.
 */
export interface ThinkingThresholds {
  /** Minimum complexity score to trigger complexity signal */
  complexityMin: number

  /** Minimum files affected to trigger files signal */
  filesAffectedMin: number

  /** Minimum success criteria to trigger criteria signal */
  successCriteriaMin: number
}

/**
 * Default thresholds.
 */
export const DEFAULT_THRESHOLDS: ThinkingThresholds = {
  complexityMin: 7,
  filesAffectedMin: 8,
  successCriteriaMin: 6,
}

/**
 * Token budget tiers for extended thinking.
 */
export interface TokenBudgetTiers {
  /** Score range for no thinking (0-30) */
  disabled: { max: number; tokens: number }

  /** Score range for minimal thinking (31-50) */
  minimal: { max: number; tokens: number }

  /** Score range for moderate thinking (51-70) */
  moderate: { max: number; tokens: number }

  /** Score range for deep thinking (71+) */
  deep: { max: number; tokens: number }
}

/**
 * Default token budget tiers.
 *
 * Score 0-30: disabled (0 tokens)
 * Score 31-50: minimal (1024 tokens)
 * Score 51-70: moderate (4096 tokens)
 * Score 71+: deep (16384 tokens)
 */
export const DEFAULT_TOKEN_TIERS: TokenBudgetTiers = {
  disabled: { max: 30, tokens: 0 },
  minimal: { max: 50, tokens: 1024 },
  moderate: { max: 70, tokens: 4096 },
  deep: { max: 100, tokens: 16384 },
}

/**
 * Keywords that suggest architectural complexity.
 */
export const ARCHITECTURE_KEYWORDS = [
  'architecture',
  'design pattern',
  'refactor',
  'restructure',
  'migrate',
  'integration',
  'api design',
  'schema',
  'database',
  'performance',
  'scalability',
  'security',
  'authentication',
  'authorization',
  'caching',
  'infrastructure',
  'deployment',
  'ci/cd',
  'microservice',
  'monolith',
  'distributed',
  'concurrent',
  'async',
  'parallel',
] as const

/**
 * Keywords that suggest refactoring work.
 */
export const REFACTOR_KEYWORDS = [
  'refactor',
  'rewrite',
  'restructure',
  'reorganize',
  'consolidate',
  'simplify',
  'extract',
  'inline',
  'rename',
  'move',
  'split',
  'merge',
  'deduplicate',
  'generalize',
  'abstract',
  'encapsulate',
  'decouple',
  'modularize',
] as const
