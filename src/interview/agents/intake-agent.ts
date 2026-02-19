/**
 * KARIMO Intake Agent
 *
 * Processes initial context dump from user and extracts structured data.
 * Generates IntakeResult with suggested title, scope type, and initial sections.
 */
import { z } from 'zod'
import { collectStreamedResponse } from '../conversation'
import type { IntakeResult, ScopeType } from '../types'

// =============================================================================
// Schemas
// =============================================================================

/**
 * Zod schema for validating intake agent output.
 */
const IntakeResultSchema = z.object({
  suggestedTitle: z.string().min(1),
  suggestedSlug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  executiveSummary: z.string().min(1),
  scopeType: z.enum(['new-feature', 'refactor', 'migration', 'integration']),
  identifiedTopics: z.array(z.string()),
  gapsToExplore: z.array(z.string()),
  initialSections: z.record(z.string()),
})

// =============================================================================
// Prompts
// =============================================================================

/**
 * System prompt for the intake agent.
 */
const INTAKE_SYSTEM_PROMPT = `You are KARIMO's Intake Agent. Your job is to process initial context from users and extract structured information for a Product Requirements Document (PRD).

## Your Task
The user will provide context about a feature they want to build. This could be:
- A stream-of-consciousness brain dump
- Notes from a meeting
- A rough idea with some details
- A detailed specification

From their input, extract and synthesize:

1. **suggestedTitle**: A concise, descriptive title for the feature (2-5 words)
2. **suggestedSlug**: A URL-safe slug derived from the title (lowercase, hyphens only)
3. **executiveSummary**: A one-sentence summary of what this feature does
4. **scopeType**: One of: "new-feature", "refactor", "migration", "integration"
5. **identifiedTopics**: Key topics/areas mentioned in their input
6. **gapsToExplore**: Questions or areas that need clarification
7. **initialSections**: Pre-fill any PRD sections you can from their input

## PRD Sections You Can Pre-fill
- executive-summary: One-liner, what's changing, who it's for, why now
- problem-context: Problem statement, supporting data, cost of inaction
- goals-metrics: Goals, non-goals, success metrics
- requirements: Must-have, should-have, could-have requirements
- ux-notes: User experience considerations
- dependencies-risks: External blockers, dependencies, risks
- rollout: Release strategy
- milestones: Key milestones
- agent-boundaries: Files to reference, files to protect, architecture decisions

## Output Format
Respond with valid JSON matching this structure:
\`\`\`json
{
  "suggestedTitle": "Feature Name",
  "suggestedSlug": "feature-name",
  "executiveSummary": "One sentence describing the feature",
  "scopeType": "new-feature",
  "identifiedTopics": ["topic1", "topic2"],
  "gapsToExplore": ["What is unclear?", "Need more info on..."],
  "initialSections": {
    "executive-summary": "Pre-filled content...",
    "requirements": "Pre-filled content..."
  }
}
\`\`\`

## Rules
1. Extract only what the user explicitly said - never fabricate
2. If unsure, list it as a gap to explore rather than guessing
3. Be concise - this is initial extraction, not final content
4. The slug must be URL-safe (lowercase letters, numbers, hyphens only)
5. Respond ONLY with the JSON object, no additional text`

// =============================================================================
// Intake Agent
// =============================================================================

/**
 * Options for the intake agent.
 */
export interface IntakeAgentOptions {
  /** Callback for streaming response chunks */
  onChunk?: (chunk: string) => void
}

/**
 * Process initial context and extract structured data.
 *
 * @param userContext - The user's initial context dump
 * @param options - Agent options
 * @returns Extracted intake result
 */
export async function processIntake(
  userContext: string,
  options: IntakeAgentOptions = {}
): Promise<IntakeResult> {
  const { onChunk } = options

  // Build messages
  const messages = [
    {
      role: 'user' as const,
      content: userContext,
      timestamp: new Date().toISOString(),
    },
  ]

  // Get response from API
  const response = await collectStreamedResponse(INTAKE_SYSTEM_PROMPT, messages, onChunk)

  // Parse JSON from response
  const result = parseIntakeResponse(response)

  return result
}

/**
 * Parse the intake agent response into structured data.
 */
function parseIntakeResponse(response: string): IntakeResult {
  // Try to extract JSON from the response
  let jsonStr = response.trim()

  // Handle markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch?.[1]) {
    jsonStr = jsonMatch[1].trim()
  }

  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    // Try to extract JSON object from response
    const objectMatch = response.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0])
      } catch {
        throw new Error(`Failed to parse intake response as JSON: ${response.slice(0, 200)}`)
      }
    } else {
      throw new Error(`No JSON object found in intake response: ${response.slice(0, 200)}`)
    }
  }

  // Validate with Zod
  const validated = IntakeResultSchema.parse(parsed)

  return validated
}

/**
 * Generate a slug from a title.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

/**
 * Validate a scope type string.
 */
export function isValidScopeType(value: string): value is ScopeType {
  return ['new-feature', 'refactor', 'migration', 'integration'].includes(value)
}

/**
 * Default intake result for empty input.
 */
export function createEmptyIntakeResult(): IntakeResult {
  return {
    suggestedTitle: '',
    suggestedSlug: '',
    executiveSummary: '',
    scopeType: 'new-feature',
    identifiedTopics: [],
    gapsToExplore: [],
    initialSections: {},
  }
}

// =============================================================================
// Exports
// =============================================================================

export { IntakeResultSchema }
