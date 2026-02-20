/**
 * KARIMO Extended Thinking Module
 *
 * Provides automatic decision-making for when to enable extended thinking
 * based on task complexity signals.
 *
 * Extended thinking enables deeper reasoning for complex tasks but adds
 * latency and cost. This module analyzes prompts and task context to
 * determine when the benefits outweigh the costs.
 *
 * @example
 * ```typescript
 * import {
 *   shouldEnableExtendedThinking,
 *   buildThinkingContext,
 *   getThinkingConfig,
 * } from '@/thinking'
 *
 * // Build context from task
 * const context = buildThinkingContext({
 *   complexity: 8,
 *   filesAffected: ['src/auth.ts', 'src/user.ts'],
 *   successCriteria: ['Tests pass', 'Build succeeds'],
 *   prompt: 'Implement OAuth2 authentication',
 * })
 *
 * // Get decision
 * const decision = shouldEnableExtendedThinking(context)
 * console.log(`Thinking: ${decision.enabled ? 'ON' : 'OFF'}`)
 * console.log(`Budget: ${decision.budgetTokens} tokens`)
 * console.log(`Score: ${decision.score}/100`)
 * console.log('Reasons:', decision.reasons)
 *
 * // Or get API-ready config
 * const thinkingConfig = getThinkingConfig(context)
 * // Use in API call: thinking: thinkingConfig
 * ```
 *
 * ## Score Tiers
 *
 * | Score | Level | Tokens | When |
 * |-------|-------|--------|------|
 * | 0-30 | Disabled | 0 | Simple tasks, clear requirements |
 * | 31-50 | Minimal | 1,024 | Moderate complexity |
 * | 51-70 | Moderate | 4,096 | Complex tasks, multiple signals |
 * | 71+ | Deep | 16,384 | Very complex, review agent |
 *
 * ## Signals
 *
 * - Complexity >= 7: +25 points
 * - Files >= 8: +15 points
 * - Criteria >= 6: +15 points
 * - Architecture keywords: +20 points
 * - Refactor keywords: +15 points
 * - Review agent: +30 points (always triggers)
 */

// Types
export type {
  ThinkingContext,
  ThinkingDecision,
  ThinkingSignalWeights,
  ThinkingThresholds,
  TokenBudgetTiers,
} from './types'

export {
  ARCHITECTURE_KEYWORDS,
  DEFAULT_SIGNAL_WEIGHTS,
  DEFAULT_THRESHOLDS,
  DEFAULT_TOKEN_TIERS,
  REFACTOR_KEYWORDS,
} from './types'

// Analyzer
export type { PromptAnalysisResult } from './analyzer'

export {
  analyzePrompt,
  analyzeTaskForThinking,
  buildThinkingContext,
  estimateComplexityFromDescription,
} from './analyzer'

// Decision
export type { ThinkingDecisionOptions } from './decision'

export {
  getThinkingConfig,
  isThinkingRecommended,
  shouldEnableExtendedThinking,
} from './decision'
