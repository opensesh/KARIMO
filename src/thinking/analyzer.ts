/**
 * KARIMO Thinking Analyzer
 *
 * Analyzes prompts and task context to detect complexity signals
 * that would benefit from extended thinking.
 */

import { ARCHITECTURE_KEYWORDS, REFACTOR_KEYWORDS, type ThinkingContext } from './types'

/**
 * Result of prompt analysis.
 */
export interface PromptAnalysisResult {
  /** Architecture keywords found */
  architectureKeywords: string[]

  /** Refactor keywords found */
  refactorKeywords: string[]

  /** Total keyword count */
  keywordCount: number

  /** Whether significant keywords were found */
  hasSignificantKeywords: boolean
}

/**
 * Analyze prompt content for complexity-indicating keywords.
 *
 * @param content - The prompt or description content to analyze
 * @returns Analysis result with found keywords
 *
 * @example
 * ```typescript
 * const result = analyzePrompt('Refactor the authentication architecture')
 * // result.architectureKeywords = ['architecture', 'authentication']
 * // result.refactorKeywords = ['refactor']
 * ```
 */
export function analyzePrompt(content: string): PromptAnalysisResult {
  const lowerContent = content.toLowerCase()

  const foundArchitectureKeywords: string[] = []
  const foundRefactorKeywords: string[] = []

  // Check for architecture keywords
  for (const keyword of ARCHITECTURE_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      foundArchitectureKeywords.push(keyword)
    }
  }

  // Check for refactor keywords
  for (const keyword of REFACTOR_KEYWORDS) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      foundRefactorKeywords.push(keyword)
    }
  }

  const keywordCount = foundArchitectureKeywords.length + foundRefactorKeywords.length

  return {
    architectureKeywords: foundArchitectureKeywords,
    refactorKeywords: foundRefactorKeywords,
    keywordCount,
    hasSignificantKeywords: keywordCount >= 2,
  }
}

/**
 * Build a ThinkingContext from task information.
 *
 * @param params - Parameters to build context from
 * @returns ThinkingContext for decision making
 *
 * @example
 * ```typescript
 * const context = buildThinkingContext({
 *   complexity: 8,
 *   filesAffected: ['src/auth.ts', 'src/user.ts'],
 *   successCriteria: ['Tests pass', 'Build succeeds'],
 *   prompt: 'Implement OAuth2 authentication',
 *   isReviewAgent: false,
 * })
 * ```
 */
export function buildThinkingContext(params: {
  complexity: number
  filesAffected: string[]
  successCriteria: string[]
  prompt: string
  isReviewAgent?: boolean
  taskDescription?: string
}): ThinkingContext {
  const {
    complexity,
    filesAffected,
    successCriteria,
    prompt,
    isReviewAgent = false,
    taskDescription,
  } = params

  // Analyze the combined content
  const combinedContent = [prompt, taskDescription ?? ''].filter(Boolean).join(' ')

  const analysis = analyzePrompt(combinedContent)

  return {
    complexity,
    filesAffectedCount: filesAffected.length,
    successCriteriaCount: successCriteria.length,
    promptContent: prompt,
    isReviewAgent,
    taskDescription,
    additionalKeywords: [...analysis.architectureKeywords, ...analysis.refactorKeywords],
  }
}

/**
 * Estimate complexity from a task description when no explicit score is available.
 *
 * Uses heuristics based on content analysis.
 *
 * @param description - The task description
 * @returns Estimated complexity score (1-10)
 */
export function estimateComplexityFromDescription(description: string): number {
  let score = 3 // Base score

  const analysis = analyzePrompt(description)

  // Increase score based on keywords found
  if (analysis.architectureKeywords.length > 0) {
    score += Math.min(analysis.architectureKeywords.length, 3)
  }

  if (analysis.refactorKeywords.length > 0) {
    score += Math.min(analysis.refactorKeywords.length, 2)
  }

  // Check for complexity indicators in the text
  const complexityIndicators = [
    'complex',
    'difficult',
    'challenging',
    'comprehensive',
    'extensive',
    'thorough',
    'deep',
    'advanced',
    'sophisticated',
  ]

  const lowerDesc = description.toLowerCase()
  for (const indicator of complexityIndicators) {
    if (lowerDesc.includes(indicator)) {
      score += 1
    }
  }

  // Check for simplicity indicators
  const simplicityIndicators = ['simple', 'basic', 'straightforward', 'minor', 'small', 'quick']

  for (const indicator of simplicityIndicators) {
    if (lowerDesc.includes(indicator)) {
      score -= 1
    }
  }

  // Clamp to valid range
  return Math.max(1, Math.min(10, score))
}

/**
 * Analyze a task to extract all relevant context for thinking decision.
 *
 * @param task - Task object with standard fields
 * @param prompt - The prompt being sent to the agent
 * @param isReviewAgent - Whether this is a review agent call
 * @returns ThinkingContext ready for decision making
 */
export function analyzeTaskForThinking(
  task: {
    complexity: number
    files_affected?: string[]
    success_criteria?: string[]
    description?: string
  },
  prompt: string,
  isReviewAgent = false
): ThinkingContext {
  return buildThinkingContext({
    complexity: task.complexity,
    filesAffected: task.files_affected ?? [],
    successCriteria: task.success_criteria ?? [],
    prompt,
    isReviewAgent,
    taskDescription: task.description,
  })
}
