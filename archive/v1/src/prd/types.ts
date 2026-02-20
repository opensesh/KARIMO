/**
 * KARIMO PRD Types
 *
 * Additional types for PRD parsing, validation, and dependency resolution.
 * Reuses Task, PRDMetadata, PRD from @/types to avoid duplication.
 */

import type { PRDMetadata, Task } from '@/types'

/**
 * Result of parsing a PRD file.
 * Contains metadata, tasks, and the source file path.
 */
export interface ParsedPRD {
  metadata: PRDMetadata
  tasks: Task[]
  sourceFile: string
}

/**
 * Configuration values needed for computed field validation.
 * These come from the project's .karimo/config.yaml cost section.
 */
export interface ComputedFieldConfig {
  cost_multiplier: number
  base_iterations: number
  iteration_multiplier: number
  revision_budget_percent: number
}

/**
 * Represents drift between expected and actual computed field values.
 */
export interface ComputedFieldDrift {
  taskId: string
  field: 'cost_ceiling' | 'estimated_iterations' | 'revision_budget'
  expected: number
  actual: number
}

/**
 * Result of validating computed fields against config.
 */
export interface ValidationResult {
  valid: boolean
  drifts: ComputedFieldDrift[]
}

/**
 * Detailed information about file overlap between tasks.
 */
export interface FileOverlap {
  file: string
  taskIds: string[]
}

/**
 * Result of file overlap detection.
 */
export interface OverlapResult {
  /** Tasks with no file overlaps (safe for parallel execution) */
  safe: Task[]
  /** Groups of tasks that must run sequentially due to file overlaps */
  sequential: Task[][]
  /** Detailed overlap information for logging */
  overlaps: FileOverlap[]
}

/**
 * Node in the dependency graph.
 */
export interface DependencyNode {
  taskId: string
  task: Task
  dependsOn: string[]
  dependedBy: string[]
}

/**
 * Dependency graph mapping task IDs to their nodes.
 */
export type DependencyGraph = Map<string, DependencyNode>
