/**
 * KARIMO Config
 *
 * Configuration schema, validator, and initialization command.
 * Manages the .karimo/config.yaml file that stores project-specific
 * rules, boundaries, cost settings, and agent configuration.
 */

export type { ProjectConfig, CostConfig, FallbackEngineConfig, SandboxConfig } from '@/types'

// Config file paths
export const CONFIG_DIR = '.karimo'
export const CONFIG_FILE = 'config.yaml'
export const CHECKPOINTS_DIR = 'checkpoints'
export const LOCAL_STATE_FILE = 'local-state.json'

// Default config values
export const DEFAULT_COST_MULTIPLIER = 3
export const DEFAULT_BASE_ITERATIONS = 5
export const DEFAULT_ITERATION_MULTIPLIER = 3
export const DEFAULT_REVISION_BUDGET_PERCENT = 50
export const DEFAULT_MAX_REVISION_LOOPS = 3
export const DEFAULT_BUDGET_WARNING_THRESHOLD = 0.75
export const DEFAULT_PHASE_BUDGET_OVERFLOW = 0.1
export const DEFAULT_FALLBACK_COST_PER_MINUTE = 0.5
