/**
 * KARIMO Context Manager
 *
 * Manages context window for Anthropic API calls.
 * Handles token counting, summarization, and handoff.
 */
import type { ConversationMessage, ConversationSummary, InterviewSession } from './types'

/**
 * Approximate characters per token (conservative estimate).
 * Claude typically averages ~4 chars/token for English text.
 */
const CHARS_PER_TOKEN = 4

/**
 * Maximum context tokens for Claude Sonnet.
 * Using 180k to leave room for response and safety margin.
 */
const MAX_CONTEXT_TOKENS = 180000

/**
 * Threshold for triggering summarization (90% of max).
 */
const SUMMARIZATION_THRESHOLD = 0.9

/**
 * Reserved tokens for system prompt and response.
 */
const RESERVED_TOKENS = 10000

/**
 * Estimate token count for a string.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Estimate token count for messages.
 */
export function estimateMessagesTokens(messages: ConversationMessage[]): number {
  let total = 0

  for (const msg of messages) {
    // Add overhead for role markers and message structure
    total += estimateTokens(msg.content) + 10
  }

  return total
}

/**
 * Estimate token count for summaries.
 */
export function estimateSummariesTokens(summaries: ConversationSummary[]): number {
  let total = 0

  for (const summary of summaries) {
    total += estimateTokens(summary.summary) + 20 // Overhead for metadata
  }

  return total
}

/**
 * Calculate total context tokens for a session.
 */
export function calculateContextTokens(
  session: InterviewSession,
  systemPromptTokens: number,
  prdContentTokens: number
): number {
  const messagesTokens = estimateMessagesTokens(session.messages)
  const summariesTokens = estimateSummariesTokens(session.summaries)

  return systemPromptTokens + prdContentTokens + messagesTokens + summariesTokens
}

/**
 * Check if context is near capacity.
 */
export function isNearCapacity(
  currentTokens: number,
  threshold: number = SUMMARIZATION_THRESHOLD
): boolean {
  const effectiveMax = MAX_CONTEXT_TOKENS - RESERVED_TOKENS
  return currentTokens >= effectiveMax * threshold
}

/**
 * Calculate available tokens for response.
 */
export function getAvailableTokens(currentTokens: number): number {
  return Math.max(0, MAX_CONTEXT_TOKENS - currentTokens - RESERVED_TOKENS)
}

/**
 * Context state for decision making.
 */
export interface ContextState {
  /** Current total tokens */
  currentTokens: number

  /** Maximum allowed tokens */
  maxTokens: number

  /** Whether summarization is needed */
  needsSummarization: boolean

  /** Available tokens for response */
  availableTokens: number

  /** Utilization percentage (0-100) */
  utilizationPercent: number
}

/**
 * Get current context state.
 */
export function getContextState(
  session: InterviewSession,
  systemPromptTokens: number,
  prdContentTokens: number
): ContextState {
  const currentTokens = calculateContextTokens(session, systemPromptTokens, prdContentTokens)
  const effectiveMax = MAX_CONTEXT_TOKENS - RESERVED_TOKENS

  return {
    currentTokens,
    maxTokens: MAX_CONTEXT_TOKENS,
    needsSummarization: isNearCapacity(currentTokens),
    availableTokens: getAvailableTokens(currentTokens),
    utilizationPercent: Math.round((currentTokens / effectiveMax) * 100),
  }
}

/**
 * Build a summarization prompt for the current conversation.
 */
export function buildSummarizationPrompt(
  messages: ConversationMessage[],
  currentRound: string
): string {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  return `Summarize the following interview conversation from the "${currentRound}" round.
Capture:
- Key decisions made
- Requirements discussed
- Important context provided
- Any questions that were answered
- Outstanding items or concerns

Keep the summary concise but preserve critical details that would be needed to continue the interview.

Conversation:
${conversation}

Summary:`
}

/**
 * Build context for a new API call after summarization.
 */
export interface HandoffContext {
  /** Previous summaries combined */
  previousSummaries: string

  /** Current PRD content */
  prdContent: string

  /** Last few messages (most recent context) */
  recentMessages: ConversationMessage[]

  /** Round-specific context */
  roundContext: string
}

/**
 * Build handoff context after summarization.
 */
export function buildHandoffContext(
  session: InterviewSession,
  prdContent: string,
  roundContext: string,
  recentMessageCount = 4
): HandoffContext {
  // Combine all summaries
  const previousSummaries = session.summaries.map((s) => `[${s.round}] ${s.summary}`).join('\n\n')

  // Get most recent messages
  const recentMessages = session.messages.slice(-recentMessageCount)

  return {
    previousSummaries,
    prdContent,
    recentMessages,
    roundContext,
  }
}

/**
 * Format handoff context for injection into system prompt.
 */
export function formatHandoffContext(context: HandoffContext): string {
  const parts: string[] = []

  if (context.previousSummaries) {
    parts.push(`## Previous Conversation Summary\n\n${context.previousSummaries}`)
  }

  if (context.prdContent) {
    parts.push(`## Current PRD State\n\n${context.prdContent}`)
  }

  if (context.roundContext) {
    parts.push(`## Current Round Context\n\n${context.roundContext}`)
  }

  return parts.join('\n\n---\n\n')
}

/**
 * Determine how many messages to keep after summarization.
 * Keeps the most recent exchange to maintain conversational flow.
 */
export function getMessagesToKeep(
  messages: ConversationMessage[],
  targetTokens = 2000
): ConversationMessage[] {
  const result: ConversationMessage[] = []
  let tokens = 0

  // Work backwards from most recent
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg) continue

    const msgTokens = estimateTokens(msg.content) + 10

    if (tokens + msgTokens > targetTokens) {
      break
    }

    result.unshift(msg)
    tokens += msgTokens
  }

  return result
}
