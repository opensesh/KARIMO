/**
 * KARIMO Review Agent
 *
 * Reviews completed PRDs for gaps, ambiguities, and issues.
 * Runs after all interview rounds are complete.
 *
 * Features:
 * - Extended thinking for deeper analysis (auto-enabled)
 * - Structured output validation with Zod schemas
 * - Graceful fallback to text parsing on validation failure
 */
import { validateOutput, ReviewResultSchema } from '@/structured-output'
import type { ReviewResult as StructuredReviewResult } from '@/structured-output'
import { getThinkingConfig, buildThinkingContext } from '@/thinking'
import { sendMessage, sendMessageWithThinking } from '../conversation'
import { ReviewError } from '../errors'
import { getReviewSystemPrompt } from '../section-mapper'
import type { ConversationMessage, ReviewIssue, ReviewResult } from '../types'

/**
 * Options for review with extended capabilities.
 */
export interface ReviewOptions {
  /** Enable extended thinking (auto-determined if not specified) */
  enableThinking?: boolean
  /** Use structured output validation */
  useStructuredOutput?: boolean
  /** Custom thinking budget tokens */
  thinkingBudget?: number
}

/**
 * Parse review result from agent response.
 */
function parseReviewResult(response: string): ReviewResult {
  // Default result structure
  const result: ReviewResult = {
    score: 5,
    issues: [],
    summary: '',
    recommendations: [],
  }

  // Try to extract score
  const scoreMatch = response.match(/(?:score|rating):\s*(\d+)/i)
  if (scoreMatch) {
    const scoreStr = scoreMatch[1]
    if (scoreStr) {
      result.score = Math.min(10, Math.max(1, Number.parseInt(scoreStr, 10)))
    }
  }

  // Parse issues section
  const issuesSection = response.match(
    /(?:issues|problems|findings):([\s\S]*?)(?=##|summary|recommendations|$)/i
  )
  if (issuesSection) {
    const issuesContent = issuesSection[1]
    if (issuesContent) {
      const issueLines = issuesContent.split('\n').filter((line) => line.trim())

      for (const line of issueLines) {
        // Try to parse structured issue
        const severityMatch = line.match(/\[(error|warning|suggestion)\]/i)
        const categoryMatch = line.match(/\(([\w-]+)\)/i)

        if (severityMatch) {
          const severityStr = severityMatch[1]
          if (severityStr) {
            const issue: ReviewIssue = {
              severity: severityStr.toLowerCase() as ReviewIssue['severity'],
              category: 'other',
              description: line.replace(/\[.*?\]|\(.*?\)/g, '').trim(),
              location: '',
            }

            if (categoryMatch) {
              const categoryStr = categoryMatch[1]
              if (categoryStr) {
                const category = categoryStr.toLowerCase().replace(/\s+/g, '-')
                if (isValidCategory(category)) {
                  issue.category = category as ReviewIssue['category']
                }
              }
            }

            result.issues.push(issue)
          }
        }
      }
    }
  }

  // Parse summary
  const summaryMatch = response.match(/##?\s*summary[:\s]*([\s\S]*?)(?=##|recommendations|$)/i)
  if (summaryMatch) {
    const summaryContent = summaryMatch[1]
    if (summaryContent) {
      result.summary = summaryContent.trim()
    }
  } else {
    // Use first paragraph as summary if no explicit section
    const firstParagraph = response.split('\n\n')[0]
    if (firstParagraph) {
      result.summary = firstParagraph.slice(0, 500)
    }
  }

  // Parse recommendations
  const recsMatch = response.match(/##?\s*recommendations[:\s]*([\s\S]*?)$/i)
  if (recsMatch) {
    const recsContent = recsMatch[1]
    if (recsContent) {
      const recLines = recsContent
        .split('\n')
        .filter((line) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map((line) => line.replace(/^[-\d.]\s*/, '').trim())
        .filter((line) => line.length > 0)

      result.recommendations = recLines
    }
  }

  return result
}

/**
 * Check if a category string is valid.
 */
function isValidCategory(category: string): category is ReviewIssue['category'] {
  const validCategories = [
    'missing-acceptance-criteria',
    'high-complexity-not-split',
    'conflicting-requirements',
    'missing-edge-cases',
    'unclear-scope',
    'other',
  ]
  return validCategories.includes(category)
}

/**
 * Review a completed PRD.
 *
 * @param prdContent - The PRD markdown content to review
 * @param options - Optional review configuration
 * @returns Review result with score, issues, and recommendations
 */
export async function reviewPRD(
  prdContent: string,
  options?: ReviewOptions
): Promise<ReviewResult> {
  const { enableThinking, useStructuredOutput = true, thinkingBudget } = options ?? {}

  // Build thinking context for auto-detection
  const thinkingContext = buildThinkingContext({
    complexity: 8, // Reviews are inherently complex
    filesAffected: [],
    successCriteria: [],
    prompt: prdContent,
    isReviewAgent: true,
  })

  // Determine if thinking should be enabled
  const thinkingConfig =
    enableThinking === false
      ? undefined
      : thinkingBudget
        ? { type: 'enabled' as const, budget_tokens: thinkingBudget }
        : getThinkingConfig(thinkingContext)

  const systemPrompt = getReviewSystemPromptWithStructure(prdContent, useStructuredOutput)

  const messages: ConversationMessage[] = [
    {
      role: 'user',
      content: useStructuredOutput
        ? 'Please review this PRD and provide a structured JSON assessment.'
        : 'Please review this PRD and provide a structured assessment.',
      timestamp: new Date().toISOString(),
    },
  ]

  try {
    // Use thinking-enabled endpoint if thinking is configured
    if (thinkingConfig) {
      const response = await sendMessageWithThinking(systemPrompt, messages, {
        thinking: thinkingConfig,
      })

      // Try structured output validation first
      if (useStructuredOutput) {
        const validated = validateOutput(response.text, ReviewResultSchema)
        if (validated.success && validated.data) {
          return convertStructuredToLegacy(validated.data)
        }
        // Fall back to text parsing
        console.warn('Structured output validation failed, falling back to text parsing')
      }

      return parseReviewResult(response.text)
    }

    // Standard non-thinking path
    const response = await sendMessage(systemPrompt, messages, {
      temperature: 0.3,
    })

    // Try structured output validation first
    if (useStructuredOutput) {
      const validated = validateOutput(response, ReviewResultSchema)
      if (validated.success && validated.data) {
        return convertStructuredToLegacy(validated.data)
      }
      // Fall back to text parsing
    }

    return parseReviewResult(response)
  } catch (error) {
    throw new ReviewError((error as Error).message)
  }
}

/**
 * Get review system prompt with optional structured output instructions.
 */
function getReviewSystemPromptWithStructure(
  prdContent: string,
  useStructuredOutput: boolean
): string {
  const basePrompt = getReviewSystemPrompt(prdContent)

  if (!useStructuredOutput) {
    return basePrompt
  }

  return `${basePrompt}

## Output Format

You MUST respond with a valid JSON object matching this schema:

\`\`\`json
{
  "score": <number 1-10>,
  "issues": [
    {
      "severity": "error" | "warning" | "suggestion",
      "category": "missing-acceptance-criteria" | "high-complexity-not-split" | "conflicting-requirements" | "missing-edge-cases" | "unclear-scope" | "insufficient-context" | "security-concern" | "performance-concern" | "maintainability-concern" | "other",
      "description": "<string>",
      "location": "<section or task ID>",
      "suggestion": "<optional fix suggestion>"
    }
  ],
  "summary": "<overall assessment>",
  "recommendations": ["<action item 1>", "<action item 2>"],
  "readyForFinalization": <boolean>,
  "strengths": ["<optional strength 1>"]
}
\`\`\`

Respond ONLY with the JSON object, no additional text.`
}

/**
 * Convert structured review result to legacy format.
 */
function convertStructuredToLegacy(structured: StructuredReviewResult): ReviewResult {
  return {
    score: structured.score,
    issues: structured.issues.map((issue) => ({
      severity: issue.severity as ReviewIssue['severity'],
      category: isValidCategory(issue.category) ? issue.category : 'other',
      description: issue.description,
      location: issue.location,
      suggestion: issue.suggestion,
    })),
    summary: structured.summary,
    recommendations: structured.recommendations,
  }
}

/**
 * Generate improvement suggestions for specific issues.
 */
export async function generateSuggestions(
  prdContent: string,
  issues: ReviewIssue[]
): Promise<Map<number, string>> {
  const suggestions = new Map<number, string>()

  if (issues.length === 0) {
    return suggestions
  }

  const issueList = issues
    .map((issue, index) => `${index + 1}. [${issue.severity}] ${issue.description}`)
    .join('\n')

  const systemPrompt = `You are KARIMO's PRD Review Agent.
Given the following PRD and identified issues, provide specific suggestions for fixing each issue.

## PRD Content
${prdContent}

## Issues Found
${issueList}

For each issue, provide a brief, actionable suggestion on how to fix it.
Format your response as:
1. [suggestion for issue 1]
2. [suggestion for issue 2]
etc.`

  const messages: ConversationMessage[] = [
    {
      role: 'user',
      content: 'Please provide suggestions for fixing each issue.',
      timestamp: new Date().toISOString(),
    },
  ]

  try {
    const response = await sendMessage(systemPrompt, messages, {
      temperature: 0.3,
    })

    // Parse suggestions
    const lines = response.split('\n')
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s*(.+)/)
      if (match) {
        const indexStr = match[1]
        const suggestionStr = match[2]
        if (indexStr && suggestionStr) {
          const index = Number.parseInt(indexStr, 10) - 1
          const suggestion = suggestionStr.trim()
          if (index >= 0 && index < issues.length) {
            suggestions.set(index, suggestion)
          }
        }
      }
    }

    return suggestions
  } catch (error) {
    throw new ReviewError(`Failed to generate suggestions: ${(error as Error).message}`)
  }
}

/**
 * Check if PRD is ready for finalization.
 */
export function isReadyForFinalization(result: ReviewResult): boolean {
  // No errors allowed
  const hasErrors = result.issues.some((issue) => issue.severity === 'error')
  if (hasErrors) {
    return false
  }

  // Score must be at least 6
  if (result.score < 6) {
    return false
  }

  return true
}

/**
 * Format review result for display.
 */
export function formatReviewResult(result: ReviewResult): string {
  const lines: string[] = []

  // Score
  const scoreEmoji = result.score >= 8 ? '✅' : result.score >= 6 ? '⚠️' : '❌'
  lines.push(`${scoreEmoji} Score: ${result.score}/10`)
  lines.push('')

  // Issues by severity
  const errors = result.issues.filter((i) => i.severity === 'error')
  const warnings = result.issues.filter((i) => i.severity === 'warning')
  const suggestions = result.issues.filter((i) => i.severity === 'suggestion')

  if (errors.length > 0) {
    lines.push('❌ Errors (must fix):')
    for (const error of errors) {
      lines.push(`  • ${error.description}`)
    }
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push('⚠️ Warnings (should fix):')
    for (const warning of warnings) {
      lines.push(`  • ${warning.description}`)
    }
    lines.push('')
  }

  if (suggestions.length > 0) {
    lines.push('💡 Suggestions:')
    for (const suggestion of suggestions) {
      lines.push(`  • ${suggestion.description}`)
    }
    lines.push('')
  }

  // Summary
  if (result.summary) {
    lines.push('Summary:')
    lines.push(result.summary)
    lines.push('')
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('Recommendations:')
    for (const rec of result.recommendations) {
      lines.push(`  • ${rec}`)
    }
  }

  return lines.join('\n')
}
