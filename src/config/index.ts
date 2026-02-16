/**
 * KARIMO Config
 *
 * Configuration schema, validator, and initialization command.
 * Manages the .karimo/config.yaml file that stores project-specific
 * rules, boundaries, cost settings, and agent configuration.
 */

// =============================================================================
// Constants
// =============================================================================

export const CONFIG_DIR = '.karimo'
export const CONFIG_FILE = 'config.yaml'
export const CHECKPOINTS_DIR = 'checkpoints'
export const LOCAL_STATE_FILE = 'local-state.json'

// Legacy constants (prefer using DEFAULT_COST from defaults.ts)
export const DEFAULT_COST_MULTIPLIER = 3
export const DEFAULT_BASE_ITERATIONS = 5
export const DEFAULT_ITERATION_MULTIPLIER = 3
export const DEFAULT_REVISION_BUDGET_PERCENT = 50
export const DEFAULT_MAX_REVISION_LOOPS = 3
export const DEFAULT_BUDGET_WARNING_THRESHOLD = 0.75
export const DEFAULT_PHASE_BUDGET_OVERFLOW = 0.1
export const DEFAULT_FALLBACK_COST_PER_MINUTE = 0.5

// =============================================================================
// Schema & Types
// =============================================================================

export {
  // Section schemas
  ProjectSchema,
  CommandsSchema,
  RulesSchema,
  BoundariesSchema,
  CostSchema,
  ModelPreferenceSchema,
  FallbackTriggerSchema,
  FallbackEngineItemSchema,
  FallbackEngineSchema,
  SandboxSchema,
  // Root schema
  KarimoConfigSchema,
} from './schema'

export type {
  // Section types
  ProjectSection,
  CommandsSection,
  RulesSection,
  BoundariesSection,
  CostSection,
  FallbackTrigger,
  FallbackEngineItem,
  FallbackEngineSection,
  SandboxSection,
  // Root type
  KarimoConfig,
} from './schema'

// =============================================================================
// Loader
// =============================================================================

export { findConfigPath, loadConfig, loadConfigSync } from './loader'
export type { FindConfigResult, LoadConfigResult } from './loader'

// =============================================================================
// Defaults
// =============================================================================

export {
  DEFAULT_COST,
  DEFAULT_BOUNDARIES,
  DEFAULT_FALLBACK_ENGINE,
  COMMON_ALLOWED_ENV,
} from './defaults'

// =============================================================================
// Errors
// =============================================================================

export {
  KarimoConfigError,
  ConfigNotFoundError,
  ConfigReadError,
  ConfigParseError,
  ConfigValidationError,
} from './errors'

// =============================================================================
// Detection
// =============================================================================

export { detectProject, getDetectionSummary, hasMinimalDetection } from './detect'
export type {
  Confidence,
  DetectedValue,
  DetectionResult,
  PackageJson,
} from './detect'

// =============================================================================
// Init
// =============================================================================

export { runInit } from './init'
