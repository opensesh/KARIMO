/**
 * KARIMO PRD Module
 *
 * PRD parser, YAML task extraction, dependency resolution, and file overlap detection.
 * Handles parsing of PRD markdown files, extracting the YAML task block,
 * building the dependency graph for execution ordering, and detecting file conflicts.
 */

// =============================================================================
// Types (from @/types)
// =============================================================================

export type { PRD, PRDMetadata, Task, TaskPriority } from '@/types'

// =============================================================================
// Local Types
// =============================================================================

export type {
  ComputedFieldConfig,
  ComputedFieldDrift,
  DependencyGraph,
  DependencyNode,
  FileOverlap,
  OverlapResult,
  ParsedPRD,
  ValidationResult,
} from './types'

// =============================================================================
// Schemas
// =============================================================================

export {
  PRDMetadataSchema,
  PRDStatusSchema,
  ScopeTypeSchema,
  TaskPrioritySchema,
  TaskSchema,
  TasksBlockSchema,
} from './schema'

export type { PRDMetadataSchemaType, TaskSchemaType, TasksBlockSchemaType } from './schema'

// =============================================================================
// Parser
// =============================================================================

export { parsePRD, parsePRDFile } from './parser'

// =============================================================================
// Dependencies
// =============================================================================

export {
  buildDependencyGraph,
  getBlockedTasks,
  getReadyTasks,
  getTaskDepths,
  topologicalSort,
} from './dependencies'

// =============================================================================
// Overlaps
// =============================================================================

export { detectFileOverlaps } from './overlaps'

// =============================================================================
// Validation
// =============================================================================

export {
  recalculateAllTasks,
  recalculateComputedFields,
  validateAllTasks,
  validateComputedFields,
} from './validation'

// =============================================================================
// Errors
// =============================================================================

export {
  CyclicDependencyError,
  DuplicateTaskIdError,
  InvalidDependencyError,
  KarimoPRDError,
  PRDExtractionError,
  PRDNotFoundError,
  PRDParseError,
  PRDReadError,
  PRDValidationError,
} from './errors'
