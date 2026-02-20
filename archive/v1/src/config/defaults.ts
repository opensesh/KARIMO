/**
 * KARIMO Config Defaults
 *
 * Default values for configuration sections.
 * These match the Zod schema defaults and provide
 * sensible starting points for new projects.
 */

import type { BoundariesSection, CostSection, FallbackEngineSection } from './schema'

/**
 * Default cost configuration.
 * Matches the defaults defined in CostSchema.
 */
export const DEFAULT_COST: CostSection = {
  model_preference: 'sonnet',
  cost_multiplier: 3,
  base_iterations: 5,
  iteration_multiplier: 3,
  revision_budget_percent: 50,
  max_revision_loops: 3,
  abort_on_fatal: true,
  fallback_cost_per_minute: 0.5,
  phase_budget_cap: null,
  phase_budget_overflow: 0.1,
  session_budget_cap: null,
  budget_warning_threshold: 0.75,
}

/**
 * Default boundaries configuration.
 * Empty arrays — projects should explicitly define their boundaries.
 */
export const DEFAULT_BOUNDARIES: BoundariesSection = {
  never_touch: [],
  require_review: [],
}

/**
 * Default fallback engine configuration.
 * Disabled by default with common trigger conditions.
 */
export const DEFAULT_FALLBACK_ENGINE: FallbackEngineSection = {
  enabled: false,
  engines: [],
  trigger_on: ['rate-limit', 'quota-exceeded'],
}

/**
 * Common environment variables that are typically allowed in sandbox.
 * Used as suggestions during init.
 */
export const COMMON_ALLOWED_ENV = [
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TERM',
  'LANG',
  'NODE_ENV',
  'CI',
]
