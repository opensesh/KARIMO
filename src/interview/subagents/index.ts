/**
 * KARIMO Interview Subagents Module
 *
 * Provides spawnable subagents for focused tasks within the interview system.
 * Subagents use the same API client as parent agents for efficiency.
 *
 * @example
 * ```typescript
 * import {
 *   createAgentRegistry,
 *   createSubagentSpawner,
 *   createCostTracker,
 * } from '@/interview/subagents'
 *
 * // Set up infrastructure
 * const registry = createAgentRegistry()
 * const spawner = createSubagentSpawner(registry)
 * const costTracker = createCostTracker()
 *
 * // Spawn a clarification subagent
 * const result = await spawner.spawn({
 *   id: crypto.randomUUID(),
 *   type: 'clarification',
 *   parent: 'interview',
 *   task: 'Clarify the authentication requirements',
 *   context: {
 *     prdContent: '...',
 *     relevantMessages: [...],
 *   },
 * })
 *
 * // Track cost
 * costTracker.recordUsage(result.usage)
 *
 * // Parallel section reviews
 * const sections = ['requirements', 'dependencies', 'agent-context']
 * const reviews = await spawner.spawnParallel(
 *   sections.map((s, i) => ({
 *     id: `review-${i}`,
 *     type: 'section-reviewer' as const,
 *     parent: 'review' as const,
 *     task: `Review the ${s} section`,
 *     context: { prdContent: '...' },
 *   })),
 *   { maxConcurrency: 3 }
 * )
 *
 * // Get aggregated statistics
 * const usage = registry.getAggregatedUsage()
 * const cost = costTracker.calculateCost()
 * ```
 *
 * ## Subagent Types
 *
 * ### Interview Agent Subagents
 * - `clarification` - Deep-dive on ambiguous requirements
 * - `research` - Investigate codebase during interview
 * - `scope-validator` - Validate scope against existing code
 *
 * ### Investigation Agent Subagents
 * - `pattern-analyzer` - Analyze specific code patterns
 * - `dependency-mapper` - Map import/dependency chains
 *
 * ### Review Agent Subagents
 * - `section-reviewer` - Review specific PRD section (parallelizable)
 * - `complexity-validator` - Validate complexity scores
 *
 * ## Architecture
 *
 * Subagents share the parent's API client to:
 * - Minimize connection overhead
 * - Share rate limit awareness
 * - Simplify authentication
 */

// Types
export type {
  ClarificationResultData,
  ComplexityValidationResultData,
  DependencyMapResultData,
  InterviewSubagentType,
  InvestigationSubagentType,
  ParentAgentType,
  PatternAnalysisResultData,
  ResearchResultData,
  ReviewSubagentType,
  ScopeValidationResultData,
  SectionReviewResultData,
  SubagentContext,
  SubagentExecution,
  SubagentHistoryEntry,
  SubagentResult,
  SubagentResultData,
  SubagentSpawnRequest,
  SubagentStatus,
  SubagentTokenUsage,
  SubagentType,
} from './types'

// Registry
export type { AggregatedUsage } from './registry'

export { AgentRegistry, createAgentRegistry } from './registry'

// Spawner
export type { ParallelSpawnOptions, SpawnOptions } from './spawner'

export { createSubagentSpawner, SubagentSpawner } from './spawner'

// Cost tracking
export type { CostCalculation } from './cost'

export {
  calculateSingleUsageCost,
  createCostTracker,
  formatCost,
  SubagentCostTracker,
} from './cost'

// Prompts
export { getSubagentPrompt } from './prompts'
