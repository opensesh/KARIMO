/**
 * KARIMO Interview Tools
 *
 * Tool definitions for the conversational interview agent.
 * These tools allow the agent to capture sections, requirements, and conflicts.
 */
import { z } from 'zod'

// =============================================================================
// Tool Schemas
// =============================================================================

/**
 * Schema for capture_section tool input.
 */
export const CaptureSectionInputSchema = z.object({
  sectionId: z.string().describe('The PRD section ID (e.g., "executive-summary", "requirements")'),
  content: z.string().describe('The content to write to this section'),
  mode: z
    .enum(['replace', 'append', 'refine'])
    .default('replace')
    .describe('How to update the section: replace (overwrite), append (add to end), refine (improve existing)'),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .default(70)
    .describe('Confidence level in this content (0-100)'),
})

/**
 * Schema for capture_requirement tool input.
 */
export const CaptureRequirementInputSchema = z.object({
  description: z.string().describe('Description of the requirement'),
  priority: z.enum(['must', 'should', 'could']).describe('Priority level'),
  acceptanceCriteria: z
    .array(z.string())
    .optional()
    .describe('Acceptance criteria for this requirement'),
})

/**
 * Schema for flag_conflict tool input.
 */
export const FlagConflictInputSchema = z.object({
  type: z
    .enum(['user-vs-user', 'user-vs-codebase', 'user-vs-prd'])
    .describe('Type of conflict detected'),
  description: z.string().describe('Description of the conflict'),
  sectionAffected: z.string().describe('Which section this conflict affects'),
  earlierStatement: z.string().describe('The earlier/original statement'),
  laterStatement: z.string().describe('The later/conflicting statement'),
})

/**
 * Schema for report_progress tool input.
 */
export const ReportProgressInputSchema = z.object({
  milestone: z
    .enum(['25', '50', '75', '100'])
    .optional()
    .describe('Optional milestone being reported (25%, 50%, 75%, 100%)'),
  message: z.string().optional().describe('Optional message to accompany the progress report'),
})

// =============================================================================
// Tool Types
// =============================================================================

export type CaptureSectionInput = z.infer<typeof CaptureSectionInputSchema>
export type CaptureRequirementInput = z.infer<typeof CaptureRequirementInputSchema>
export type FlagConflictInput = z.infer<typeof FlagConflictInputSchema>
export type ReportProgressInput = z.infer<typeof ReportProgressInputSchema>

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * Tool definition interface matching Claude's tool format.
 */
export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * JSON Schema type for tool input.
 */
interface JsonSchemaObject {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
}

/**
 * Convert Zod schema to JSON Schema for tool definition.
 */
function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): JsonSchemaObject {
  const shape = schema.shape
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny
    const description = zodType.description

    // Check if required (not optional)
    if (!zodType.isOptional()) {
      required.push(key)
    }

    // Get inner type if optional
    const innerType = zodType instanceof z.ZodOptional ? zodType.unwrap() : zodType

    // Handle different Zod types
    if (innerType instanceof z.ZodString) {
      properties[key] = { type: 'string', description }
    } else if (innerType instanceof z.ZodNumber) {
      properties[key] = { type: 'number', description }
    } else if (innerType instanceof z.ZodBoolean) {
      properties[key] = { type: 'boolean', description }
    } else if (innerType instanceof z.ZodEnum) {
      properties[key] = {
        type: 'string',
        enum: innerType.options,
        description,
      }
    } else if (innerType instanceof z.ZodArray) {
      properties[key] = {
        type: 'array',
        items: { type: 'string' },
        description,
      }
    } else if (innerType instanceof z.ZodDefault) {
      // Handle default values by processing the inner type
      const defaultInner = innerType._def.innerType
      if (defaultInner instanceof z.ZodEnum) {
        properties[key] = {
          type: 'string',
          enum: defaultInner.options,
          description,
        }
      } else if (defaultInner instanceof z.ZodNumber) {
        properties[key] = { type: 'number', description }
      } else {
        properties[key] = { type: 'string', description }
      }
    } else {
      properties[key] = { type: 'string', description }
    }
  }

  const result: JsonSchemaObject = {
    type: 'object',
    properties,
  }

  if (required.length > 0) {
    result.required = required
  }

  return result
}

/**
 * Interview tool definitions for use with Claude.
 */
export const INTERVIEW_TOOLS: ToolDefinition[] = [
  {
    name: 'capture_section',
    description: `Write or update content in a PRD section. Use this to capture information as you hear it from the user.

Modes:
- replace: Overwrite the entire section with new content
- append: Add content to the end of existing section
- refine: Improve/polish existing content

Available sections: executive-summary, problem-context, goals-metrics, requirements, ux-notes, dependencies-risks, rollout, milestones, open-questions, checkpoint-learnings, agent-boundaries`,
    input_schema: zodToJsonSchema(CaptureSectionInputSchema),
  },
  {
    name: 'capture_requirement',
    description: `Add a requirement to the requirements table. Use this when the user mentions something that should be a formal requirement.

Priority levels:
- must: Critical for MVP, blocks launch if missing
- should: Important but not launch-blocking
- could: Nice to have, can be deferred`,
    input_schema: zodToJsonSchema(CaptureRequirementInputSchema),
  },
  {
    name: 'flag_conflict',
    description: `Flag a contradiction or conflict that needs user resolution. ALWAYS use this immediately when you detect:

Types:
- user-vs-user: User said one thing earlier, now saying something different
- user-vs-codebase: User describes something that doesn't match the codebase
- user-vs-prd: New information contradicts what's already in the PRD

After flagging, present the conflict to the user and ask which direction they want to take.`,
    input_schema: zodToJsonSchema(FlagConflictInputSchema),
  },
  {
    name: 'report_progress',
    description: `Report current PRD completion progress. Use this at milestones (25%, 50%, 75%) to keep the user informed of progress.`,
    input_schema: zodToJsonSchema(ReportProgressInputSchema),
  },
]

/**
 * Get tool definition by name.
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return INTERVIEW_TOOLS.find((t) => t.name === name)
}

/**
 * Valid tool names.
 */
export type InterviewToolName = 'capture_section' | 'capture_requirement' | 'flag_conflict' | 'report_progress'

/**
 * Check if a string is a valid tool name.
 */
export function isValidToolName(name: string): name is InterviewToolName {
  return ['capture_section', 'capture_requirement', 'flag_conflict', 'report_progress'].includes(name)
}
