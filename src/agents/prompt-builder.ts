/**
 * KARIMO Agent Prompt Builder
 *
 * Builds structured prompts for AI agents from task context,
 * config rules, and boundaries.
 */

import type { AgentPromptContext } from './types'

/**
 * Build a structured agent prompt from task context.
 *
 * The prompt includes:
 * - Task title, description, and success criteria
 * - Files affected as scope hints
 * - Agent context (if provided)
 * - Config rules as requirements
 * - Boundary warnings (never_touch, require_review)
 * - Build/lint/typecheck commands for self-validation
 *
 * @param context - Context for building the prompt
 * @returns Formatted prompt string
 *
 * @example
 * ```typescript
 * const prompt = buildAgentPrompt({
 *   task,
 *   config,
 *   rootDir: '/project',
 *   phaseId: 'phase-1',
 * })
 * ```
 */
export function buildAgentPrompt(context: AgentPromptContext): string {
  const { task, config, phaseId } = context

  const sections: string[] = []

  // Header
  sections.push('# KARIMO Task Execution')
  sections.push('')
  sections.push(`You are executing task **${task.id}** from phase **${phaseId}**.`)
  sections.push('')

  // Task details
  sections.push('## Task')
  sections.push('')
  sections.push(`**Title:** ${task.title}`)
  sections.push('')
  sections.push('**Description:**')
  sections.push(task.description)
  sections.push('')

  // Success criteria
  if (task.success_criteria.length > 0) {
    sections.push('## Success Criteria')
    sections.push('')
    sections.push('Your implementation must satisfy ALL of the following:')
    sections.push('')
    for (const criterion of task.success_criteria) {
      sections.push(`- ${criterion}`)
    }
    sections.push('')
  }

  // Files affected (scope hints)
  if (task.files_affected.length > 0) {
    sections.push('## Scope')
    sections.push('')
    sections.push('Focus your changes on these files/directories:')
    sections.push('')
    for (const file of task.files_affected) {
      sections.push(`- \`${file}\``)
    }
    sections.push('')
  }

  // Agent context (additional instructions)
  if (task.agent_context) {
    sections.push('## Additional Context')
    sections.push('')
    sections.push(task.agent_context)
    sections.push('')
  }

  // Project rules
  if (config.rules.length > 0) {
    sections.push('## Project Rules')
    sections.push('')
    sections.push('You MUST follow these rules:')
    sections.push('')
    for (const rule of config.rules) {
      sections.push(`- ${rule}`)
    }
    sections.push('')
  }

  // Boundaries
  const hasNeverTouch = config.boundaries.never_touch.length > 0
  const hasRequireReview = config.boundaries.require_review.length > 0

  if (hasNeverTouch || hasRequireReview) {
    sections.push('## File Boundaries')
    sections.push('')

    if (hasNeverTouch) {
      sections.push('### FORBIDDEN Files (never modify)')
      sections.push('')
      sections.push('Do NOT modify or create files matching these patterns:')
      sections.push('')
      for (const pattern of config.boundaries.never_touch) {
        sections.push(`- \`${pattern}\``)
      }
      sections.push('')
    }

    if (hasRequireReview) {
      sections.push('### Caution Files (require review)')
      sections.push('')
      sections.push('Changes to files matching these patterns will flag the PR for review:')
      sections.push('')
      for (const pattern of config.boundaries.require_review) {
        sections.push(`- \`${pattern}\``)
      }
      sections.push('')
    }
  }

  // Validation commands
  sections.push('## Validation')
  sections.push('')
  sections.push('Before completing, ensure your changes pass:')
  sections.push('')
  sections.push(`1. **Build:** \`${config.commands.build}\``)
  sections.push(`2. **Type check:** \`${config.commands.typecheck}\``)
  sections.push(`3. **Lint:** \`${config.commands.lint}\``)
  sections.push('')

  // Budget info
  sections.push('## Budget')
  sections.push('')
  sections.push(`- **Complexity:** ${task.complexity}/10`)
  sections.push(`- **Cost Ceiling:** $${task.cost_ceiling}`)
  sections.push(`- **Estimated Iterations:** ${task.estimated_iterations}`)
  sections.push('')

  // Final instructions
  sections.push('## Instructions')
  sections.push('')
  sections.push('1. Implement the changes required to satisfy all success criteria')
  sections.push('2. Run the validation commands and fix any issues')
  sections.push('3. Commit your changes with clear, descriptive messages')
  sections.push('4. Keep changes focused on the task scope')
  sections.push('')

  return sections.join('\n')
}
