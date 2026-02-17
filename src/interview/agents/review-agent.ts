/**
 * KARIMO Review Agent
 *
 * Reviews completed PRDs for gaps, ambiguities, and issues.
 * Runs after all interview rounds are complete.
 */
import type { ReviewResult, ReviewIssue, ConversationMessage } from '../types'
import { sendMessage } from '../conversation'
import { getReviewSystemPrompt } from '../section-mapper'
import { ReviewError } from '../errors'

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
		result.score = Math.min(10, Math.max(1, parseInt(scoreMatch[1], 10)))
	}

	// Parse issues section
	const issuesSection = response.match(/(?:issues|problems|findings):([\s\S]*?)(?=##|summary|recommendations|$)/i)
	if (issuesSection) {
		const issueLines = issuesSection[1].split('\n').filter((line) => line.trim())

		for (const line of issueLines) {
			// Try to parse structured issue
			const severityMatch = line.match(/\[(error|warning|suggestion)\]/i)
			const categoryMatch = line.match(/\(([\w-]+)\)/i)

			if (severityMatch) {
				const issue: ReviewIssue = {
					severity: severityMatch[1].toLowerCase() as ReviewIssue['severity'],
					category: 'other',
					description: line.replace(/\[.*?\]|\(.*?\)/g, '').trim(),
					location: '',
				}

				if (categoryMatch) {
					const category = categoryMatch[1].toLowerCase().replace(/\s+/g, '-')
					if (isValidCategory(category)) {
						issue.category = category as ReviewIssue['category']
					}
				}

				result.issues.push(issue)
			}
		}
	}

	// Parse summary
	const summaryMatch = response.match(/##?\s*summary[:\s]*([\s\S]*?)(?=##|recommendations|$)/i)
	if (summaryMatch) {
		result.summary = summaryMatch[1].trim()
	} else {
		// Use first paragraph as summary if no explicit section
		const firstParagraph = response.split('\n\n')[0]
		result.summary = firstParagraph.slice(0, 500)
	}

	// Parse recommendations
	const recsMatch = response.match(/##?\s*recommendations[:\s]*([\s\S]*?)$/i)
	if (recsMatch) {
		const recLines = recsMatch[1]
			.split('\n')
			.filter((line) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
			.map((line) => line.replace(/^[-\d.]\s*/, '').trim())
			.filter((line) => line.length > 0)

		result.recommendations = recLines
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
 */
export async function reviewPRD(prdContent: string): Promise<ReviewResult> {
	const systemPrompt = getReviewSystemPrompt(prdContent)

	const messages: ConversationMessage[] = [
		{
			role: 'user',
			content: 'Please review this PRD and provide a structured assessment.',
			timestamp: new Date().toISOString(),
		},
	]

	try {
		const response = await sendMessage(systemPrompt, messages, {
			temperature: 0.3, // Lower temperature for more consistent reviews
		})

		return parseReviewResult(response)
	} catch (error) {
		throw new ReviewError((error as Error).message)
	}
}

/**
 * Generate improvement suggestions for specific issues.
 */
export async function generateSuggestions(
	prdContent: string,
	issues: ReviewIssue[],
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
				const index = parseInt(match[1], 10) - 1
				const suggestion = match[2].trim()
				if (index >= 0 && index < issues.length) {
					suggestions.set(index, suggestion)
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
