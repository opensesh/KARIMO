/**
 * KARIMO PRD Schema
 *
 * Zod schemas for validating the YAML task block in PRD files.
 * All task types are inferred from these schemas.
 */

import { z } from 'zod'

// =============================================================================
// Task Schemas
// =============================================================================

/**
 * Task priority levels matching MoSCoW prioritization.
 */
export const TaskPrioritySchema = z.enum(['must', 'should', 'could'])

/**
 * Individual task schema matching the Task interface from @/types.
 */
export const TaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().min(1, 'Task description is required'),
  depends_on: z.array(z.string()).default([]),
  complexity: z
    .number()
    .int()
    .min(1, 'Complexity must be at least 1')
    .max(10, 'Complexity cannot exceed 10'),
  estimated_iterations: z.number().positive('Estimated iterations must be positive'),
  cost_ceiling: z.number().positive('Cost ceiling must be positive'),
  revision_budget: z.number().nonnegative('Revision budget cannot be negative'),
  priority: TaskPrioritySchema,
  assigned_to: z.string().min(1, 'Assigned to is required'),
  success_criteria: z
    .array(z.string().min(1, 'Success criterion cannot be empty'))
    .min(1, 'At least one success criterion is required'),
  files_affected: z.array(z.string()).default([]),
  agent_context: z.string().optional(),
})

/**
 * The tasks block schema for the YAML section in PRDs.
 */
export const TasksBlockSchema = z.object({
  tasks: z.array(TaskSchema).min(1, 'At least one task is required'),
})

// =============================================================================
// Metadata Schemas
// =============================================================================

/**
 * PRD status values.
 */
export const PRDStatusSchema = z.enum(['draft', 'active', 'complete'])

/**
 * Scope type for the PRD.
 */
export const ScopeTypeSchema = z.enum(['new-feature', 'refactor', 'migration', 'integration'])

/**
 * PRD metadata schema matching PRDMetadata from @/types.
 */
export const PRDMetadataSchema = z.object({
  feature_name: z.string().min(1, 'Feature name is required'),
  feature_slug: z.string().min(1, 'Feature slug is required'),
  owner: z.string().min(1, 'Owner is required'),
  status: PRDStatusSchema,
  created_date: z.string().min(1, 'Created date is required'),
  target_date: z.string().optional(),
  phase: z.string().min(1, 'Phase is required'),
  scope_type: ScopeTypeSchema,
  github_project: z.string().optional(),
  links: z.array(z.string()).default([]),
  checkpoint_refs: z.array(z.string()).default([]),
})

// =============================================================================
// Inferred Types
// =============================================================================

export type TaskSchemaType = z.infer<typeof TaskSchema>
export type TasksBlockSchemaType = z.infer<typeof TasksBlockSchema>
export type PRDMetadataSchemaType = z.infer<typeof PRDMetadataSchema>
