/**
 * KARIMO Config Schema
 *
 * Zod schemas defining the contract for .karimo/config.yaml.
 * All configuration types are inferred from these schemas.
 */

import { z } from 'zod'

// =============================================================================
// Section Schemas
// =============================================================================

/**
 * Project information schema.
 * Identifies the target project and its technology stack.
 */
export const ProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  language: z.string().min(1, 'Language is required').default('typescript'),
  framework: z.string().optional(),
  runtime: z.string().min(1, 'Runtime is required').default('bun'),
  database: z.string().optional(),
})

/**
 * Commands schema.
 * Shell commands for build, lint, test, and type checking.
 *
 * Required commands (must be non-empty strings):
 * - build: Agent code must compile
 * - lint: Code quality gate
 *
 * Recommended commands (can be null if not applicable):
 * - test: Used in integration checks (Level 2+)
 * - typecheck: Run in pre-PR checks (Level 0+)
 *
 * Empty strings are invalid — use null for intentional skips.
 */
export const CommandsSchema = z.object({
  build: z.string().min(1, 'Build command is required'),
  lint: z.string().min(1, 'Lint command is required'),
  test: z
    .string()
    .min(1, 'Test command cannot be empty (use null to skip)')
    .nullable()
    .default(null),
  typecheck: z
    .string()
    .min(1, 'Typecheck command cannot be empty (use null to skip)')
    .nullable()
    .default(null),
})

/**
 * Rules schema.
 * An array of project-specific rules for agents to follow.
 * Must have at least one rule.
 */
export const RulesSchema = z
  .array(z.string().min(1, 'Rule cannot be empty'))
  .min(1, 'At least one rule is required')

/**
 * Boundaries schema.
 * Defines files that should never be modified and files that require review.
 */
export const BoundariesSchema = z.object({
  never_touch: z.array(z.string()).default([]),
  require_review: z.array(z.string()).default([]),
})

/**
 * Model preference for cost calculations.
 */
export const ModelPreferenceSchema = z.enum(['haiku', 'sonnet', 'opus']).default('sonnet')

/**
 * Cost configuration schema.
 * Controls budget caps, iteration limits, and cost multipliers.
 */
export const CostSchema = z.object({
  model_preference: ModelPreferenceSchema,
  cost_multiplier: z.number().min(0.5).default(3),
  base_iterations: z.number().int().min(1).default(5),
  iteration_multiplier: z.number().min(0.5).default(3),
  revision_budget_percent: z.number().min(0).max(100).default(50),
  max_revision_loops: z.number().int().min(0).default(3),
  abort_on_fatal: z.boolean().default(true),
  fallback_cost_per_minute: z.number().min(0).default(0.5),
  phase_budget_cap: z.number().positive().nullable().default(null),
  phase_budget_overflow: z.number().min(0).max(1).default(0.1),
  session_budget_cap: z.number().positive().nullable().default(null),
  budget_warning_threshold: z.number().min(0).max(1).default(0.75),
})

/**
 * Valid trigger conditions for fallback engine activation.
 */
export const FallbackTriggerSchema = z.enum([
  'rate-limit',
  'quota-exceeded',
  'auth-failure',
  'timeout',
])

/**
 * Individual fallback engine configuration.
 */
export const FallbackEngineItemSchema = z.object({
  name: z.string().min(1, 'Engine name is required'),
  command: z.string().min(1, 'Engine command is required'),
  budget_cap: z.number().positive(),
  priority: z.number().int().min(1),
})

/**
 * Fallback engine configuration schema.
 * Defines backup engines to use when the primary engine fails.
 */
export const FallbackEngineSchema = z.object({
  enabled: z.boolean().default(false),
  engines: z.array(FallbackEngineItemSchema).default([]),
  trigger_on: z.array(FallbackTriggerSchema).default(['rate-limit', 'quota-exceeded']),
})

/**
 * Sandbox configuration schema.
 * Controls environment variable access for agents.
 */
export const SandboxSchema = z.object({
  allowed_env: z.array(z.string()).min(1, 'At least one allowed env variable is required'),
})

// =============================================================================
// Root Schema
// =============================================================================

/**
 * Complete KARIMO configuration schema.
 * This is the root schema that composes all section schemas.
 */
export const KarimoConfigSchema = z.object({
  project: ProjectSchema,
  commands: CommandsSchema,
  rules: RulesSchema,
  boundaries: BoundariesSchema.default({ never_touch: [], require_review: [] }),
  cost: CostSchema.default({
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
  }),
  fallback_engine: FallbackEngineSchema.default({
    enabled: false,
    engines: [],
    trigger_on: ['rate-limit', 'quota-exceeded'],
  }),
  sandbox: SandboxSchema,
})

// =============================================================================
// Inferred Types
// =============================================================================

export type ProjectSection = z.infer<typeof ProjectSchema>
export type CommandsSection = z.infer<typeof CommandsSchema>
export type RulesSection = z.infer<typeof RulesSchema>
export type BoundariesSection = z.infer<typeof BoundariesSchema>
export type CostSection = z.infer<typeof CostSchema>
export type FallbackTrigger = z.infer<typeof FallbackTriggerSchema>
export type FallbackEngineItem = z.infer<typeof FallbackEngineItemSchema>
export type FallbackEngineSection = z.infer<typeof FallbackEngineSchema>
export type SandboxSection = z.infer<typeof SandboxSchema>
export type KarimoConfig = z.infer<typeof KarimoConfigSchema>
