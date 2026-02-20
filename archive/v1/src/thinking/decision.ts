/**
 * KARIMO Thinking Decision
 *
 * Core decision logic for determining whether to enable extended thinking
 * and with what budget based on task complexity signals.
 */

import { analyzePrompt } from './analyzer'
import {
  DEFAULT_SIGNAL_WEIGHTS,
  DEFAULT_THRESHOLDS,
  DEFAULT_TOKEN_TIERS,
  type ThinkingContext,
  type ThinkingDecision,
  type ThinkingSignalWeights,
  type ThinkingThresholds,
  type TokenBudgetTiers,
} from './types'

/**
 * Options for the thinking decision function.
 */
export interface ThinkingDecisionOptions {
  /** Custom signal weights */
  weights?: Partial<ThinkingSignalWeights>

  /** Custom thresholds */
  thresholds?: Partial<ThinkingThresholds>

  /** Custom token budget tiers */
  tokenTiers?: Partial<TokenBudgetTiers>
}

/**
 * Calculate the thinking score based on context signals.
 *
 * @param context - The thinking context with all signals
 * @param weights - Signal weights to use
 * @param thresholds - Thresholds to use
 * @returns Score from 0-100 and reasons
 */
function calculateThinkingScore(
  context: ThinkingContext,
  weights: ThinkingSignalWeights,
  thresholds: ThinkingThresholds
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // 1. Complexity signal
  if (context.complexity >= thresholds.complexityMin) {
    const complexityContribution = weights.complexity
    score += complexityContribution
    reasons.push(`High complexity (${context.complexity}/10) +${complexityContribution}`)
  }

  // 2. Files affected signal
  if (context.filesAffectedCount >= thresholds.filesAffectedMin) {
    const filesContribution = weights.filesAffected
    score += filesContribution
    reasons.push(`Many files affected (${context.filesAffectedCount}) +${filesContribution}`)
  }

  // 3. Success criteria signal
  if (context.successCriteriaCount >= thresholds.successCriteriaMin) {
    const criteriaContribution = weights.successCriteria
    score += criteriaContribution
    reasons.push(`Many success criteria (${context.successCriteriaCount}) +${criteriaContribution}`)
  }

  // 4. Architecture keywords signal
  const analysis = analyzePrompt(`${context.promptContent} ${context.taskDescription ?? ''}`)

  if (analysis.architectureKeywords.length > 0) {
    const archContribution = weights.architectureKeywords
    score += archContribution
    reasons.push(
      `Architecture keywords found (${analysis.architectureKeywords.slice(0, 3).join(', ')}) +${archContribution}`
    )
  }

  // 5. Refactor keywords signal
  if (analysis.refactorKeywords.length > 0) {
    const refactorContribution = weights.refactorKeywords
    score += refactorContribution
    reasons.push(
      `Refactor keywords found (${analysis.refactorKeywords.slice(0, 3).join(', ')}) +${refactorContribution}`
    )
  }

  // 6. Review agent signal (always triggers if true)
  if (context.isReviewAgent) {
    const reviewContribution = weights.reviewAgent
    score += reviewContribution
    reasons.push(`Review agent call +${reviewContribution}`)
  }

  return { score: Math.min(100, score), reasons }
}

/**
 * Determine token budget based on score.
 *
 * @param score - Thinking score (0-100)
 * @param tiers - Token budget tiers
 * @returns Token budget
 */
function determineTokenBudget(score: number, tiers: TokenBudgetTiers): number {
  if (score <= tiers.disabled.max) {
    return tiers.disabled.tokens
  }

  if (score <= tiers.minimal.max) {
    return tiers.minimal.tokens
  }

  if (score <= tiers.moderate.max) {
    return tiers.moderate.tokens
  }

  return tiers.deep.tokens
}

/**
 * Determine whether extended thinking should be enabled for a given context.
 *
 * This is the main entry point for the thinking decision system.
 *
 * @param context - The thinking context with all signals
 * @param options - Optional configuration overrides
 * @returns Decision with enabled flag, token budget, score, and reasons
 *
 * @example
 * ```typescript
 * import { shouldEnableExtendedThinking } from '@/thinking'
 *
 * const context = {
 *   complexity: 8,
 *   filesAffectedCount: 12,
 *   successCriteriaCount: 4,
 *   promptContent: 'Refactor the authentication architecture',
 *   isReviewAgent: false,
 * }
 *
 * const decision = shouldEnableExtendedThinking(context)
 *
 * if (decision.enabled) {
 *   console.log(`Enabling thinking with ${decision.budgetTokens} tokens`)
 *   console.log('Reasons:', decision.reasons)
 * }
 * ```
 */
export function shouldEnableExtendedThinking(
  context: ThinkingContext,
  options?: ThinkingDecisionOptions
): ThinkingDecision {
  // Merge with defaults
  const weights: ThinkingSignalWeights = {
    ...DEFAULT_SIGNAL_WEIGHTS,
    ...options?.weights,
  }

  const thresholds: ThinkingThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...options?.thresholds,
  }

  const tiers: TokenBudgetTiers = {
    ...DEFAULT_TOKEN_TIERS,
    ...options?.tokenTiers,
  }

  // Calculate score
  const { score, reasons } = calculateThinkingScore(context, weights, thresholds)

  // Determine token budget
  const budgetTokens = determineTokenBudget(score, tiers)

  // Enabled if we have any token budget
  const enabled = budgetTokens > 0

  return {
    enabled,
    budgetTokens,
    score,
    reasons: enabled ? reasons : ['Score below threshold'],
  }
}

/**
 * Quick check if extended thinking should be enabled.
 *
 * A simpler version that just returns a boolean.
 *
 * @param context - The thinking context
 * @returns True if extended thinking should be enabled
 */
export function isThinkingRecommended(context: ThinkingContext): boolean {
  return shouldEnableExtendedThinking(context).enabled
}

/**
 * Get thinking configuration for API calls.
 *
 * Returns the thinking parameter object to pass to the API,
 * or undefined if thinking should be disabled.
 *
 * @param context - The thinking context
 * @param options - Optional configuration overrides
 * @returns Thinking configuration or undefined
 *
 * @example
 * ```typescript
 * const thinkingConfig = getThinkingConfig(context)
 *
 * const response = await client.messages.create({
 *   model: 'claude-sonnet-4-20250514',
 *   max_tokens: 8192,
 *   thinking: thinkingConfig, // undefined if disabled
 *   messages: [...],
 * })
 * ```
 */
export function getThinkingConfig(
  context: ThinkingContext,
  options?: ThinkingDecisionOptions
): { type: 'enabled'; budget_tokens: number } | undefined {
  const decision = shouldEnableExtendedThinking(context, options)

  if (!decision.enabled) {
    return undefined
  }

  return {
    type: 'enabled',
    budget_tokens: decision.budgetTokens,
  }
}
