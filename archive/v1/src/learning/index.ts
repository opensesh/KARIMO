/**
 * KARIMO Learning Module
 *
 * Compound learning system with two layers:
 * - Layer 1: Orchestrator-level learning (deterministic, code-driven)
 * - Layer 2: Agent-level learning (developer-facing, plugin-driven)
 *
 * This module collects checkpoint data and propagates learnings
 * into configuration files for future agent sessions.
 */

export type { Checkpoint, CheckpointType } from '@/types'

// Feedback from developer (Layer 2)
export interface DeveloperFeedback {
  taskId?: string
  phaseId?: string
  prNumber?: number
  feedbackType: 'correction' | 'pattern' | 'rule'
  content: string
  timestamp: Date
}

// Config update action (from Layer 1)
export interface ConfigUpdate {
  target: 'claude.md' | 'config.yaml'
  action: 'append-rule' | 'add-caution-file' | 'adjust-multiplier'
  value: string | number
  reason: string
}

// Checkpoint summary for display
export interface CheckpointSummary {
  id: string
  type: CheckpointType
  timestamp: Date
  patternsCount: number
  antiPatternsCount: number
  costDeltaPercent: number | null
}

// Re-export CheckpointType
import type { CheckpointType } from '@/types'
