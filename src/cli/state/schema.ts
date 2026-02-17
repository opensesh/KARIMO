/**
 * KARIMO State Schema
 *
 * Zod schema for validating state.json.
 */
import { z } from 'zod'

/**
 * KARIMO level schema (0-5).
 */
export const KarimoLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])

/**
 * PRD section schema.
 */
export const PRDSectionSchema = z.enum([
  'framing',
  'requirements',
  'dependencies',
  'agent-context',
  'retrospective',
  'review',
  'finalized',
])

/**
 * Full state schema.
 */
export const KarimoStateSchema = z.object({
  level: KarimoLevelSchema,
  current_prd: z.string().nullable(),
  current_prd_section: PRDSectionSchema.nullable(),
  completed_prds: z.array(z.string()),
  completed_cycles: z.number().int().nonnegative(),
  last_activity: z.string().datetime({ offset: true }).or(z.string().datetime()),
  // Onboarding timestamps (optional for backwards compatibility)
  onboarded_at: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
  doctor_last_run: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
})

/**
 * PRD metadata schema (extracted from markdown frontmatter).
 */
export const PRDMetadataSchema = z.object({
  feature_name: z.string(),
  feature_slug: z.string(),
  owner: z.string(),
  status: z.enum(['draft', 'active', 'complete']),
  created_date: z.string(),
  target_date: z.string().optional(),
  phase: z.string().optional(),
  scope_type: z.string().optional(),
  github_project: z.string().optional(),
  links: z.array(z.string()).optional(),
  checkpoint_refs: z.array(z.string()).optional(),
})

/**
 * Inferred type from PRD metadata schema.
 */
export type PRDMetadataFromSchema = z.infer<typeof PRDMetadataSchema>
