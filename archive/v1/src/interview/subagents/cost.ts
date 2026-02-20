/**
 * KARIMO Subagent Cost Tracking
 *
 * Tracks and aggregates token usage across subagent executions
 * for cost reporting and budget management.
 */

import type { SubagentTokenUsage } from './types'

/**
 * Cost per million tokens by model (as of early 2025).
 * These are approximate and should be updated as pricing changes.
 */
const COST_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  default: { input: 3.0, output: 15.0 }, // Default to Sonnet pricing
}

/**
 * Cost calculation result.
 */
export interface CostCalculation {
  /** Input token cost in dollars */
  inputCost: number

  /** Output token cost in dollars */
  outputCost: number

  /** Total cost in dollars */
  totalCost: number

  /** Cost breakdown by model */
  byModel: Record<string, { inputCost: number; outputCost: number; totalCost: number }>
}

/**
 * Aggregated cost tracker for subagent executions.
 */
export class SubagentCostTracker {
  private usages: SubagentTokenUsage[] = []

  /**
   * Record token usage from a subagent execution.
   *
   * @param usage - The token usage to record
   */
  recordUsage(usage: SubagentTokenUsage): void {
    this.usages.push(usage)
  }

  /**
   * Calculate total cost from all recorded usages.
   *
   * @returns Cost calculation result
   */
  calculateCost(): CostCalculation {
    let totalInputCost = 0
    let totalOutputCost = 0
    const byModel: Record<string, { inputCost: number; outputCost: number; totalCost: number }> = {}

    for (const usage of this.usages) {
      const pricing = COST_PER_MILLION_TOKENS[usage.model] ?? COST_PER_MILLION_TOKENS['default']

      if (!pricing) {
        continue
      }

      const inputCost = (usage.inputTokens / 1_000_000) * pricing.input
      const outputCost = (usage.outputTokens / 1_000_000) * pricing.output

      totalInputCost += inputCost
      totalOutputCost += outputCost

      // Track by model
      if (!byModel[usage.model]) {
        byModel[usage.model] = { inputCost: 0, outputCost: 0, totalCost: 0 }
      }
      const modelEntry = byModel[usage.model]
      if (modelEntry) {
        modelEntry.inputCost += inputCost
        modelEntry.outputCost += outputCost
        modelEntry.totalCost += inputCost + outputCost
      }
    }

    return {
      inputCost: totalInputCost,
      outputCost: totalOutputCost,
      totalCost: totalInputCost + totalOutputCost,
      byModel,
    }
  }

  /**
   * Get total tokens used.
   *
   * @returns Token totals
   */
  getTotalTokens(): { input: number; output: number; total: number } {
    let input = 0
    let output = 0

    for (const usage of this.usages) {
      input += usage.inputTokens
      output += usage.outputTokens
    }

    return { input, output, total: input + output }
  }

  /**
   * Get number of recorded executions.
   *
   * @returns Execution count
   */
  getExecutionCount(): number {
    return this.usages.length
  }

  /**
   * Clear all recorded usages.
   */
  clear(): void {
    this.usages = []
  }

  /**
   * Export usages for persistence.
   *
   * @returns Array of token usages
   */
  export(): SubagentTokenUsage[] {
    return [...this.usages]
  }

  /**
   * Import usages from persisted data.
   *
   * @param usages - Previously exported usages
   */
  import(usages: SubagentTokenUsage[]): void {
    this.usages.push(...usages)
  }
}

/**
 * Calculate cost for a single token usage.
 *
 * @param usage - The token usage
 * @returns Cost in dollars
 */
export function calculateSingleUsageCost(usage: SubagentTokenUsage): number {
  const pricing = COST_PER_MILLION_TOKENS[usage.model] ?? COST_PER_MILLION_TOKENS['default']

  if (!pricing) {
    return 0
  }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output

  return inputCost + outputCost
}

/**
 * Format cost for display.
 *
 * @param cost - Cost in dollars
 * @returns Formatted string (e.g., "$0.0012")
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`
  }
  return `$${cost.toFixed(2)}`
}

/**
 * Create a new cost tracker.
 *
 * @returns A new SubagentCostTracker instance
 */
export function createCostTracker(): SubagentCostTracker {
  return new SubagentCostTracker()
}
