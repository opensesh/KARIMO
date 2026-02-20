import { buildSummarizationPrompt, estimateTokens, getContextState } from '../context-manager'
import { collectStreamedResponse } from '../conversation'
import { getRoundSystemPrompt } from '../section-mapper'
import {
  addMessage,
  addSummary,
  advanceRound,
  isLastRound,
  saveSession,
  updateTokenCount,
} from '../session'
/**
 * KARIMO Interview Agent
 *
 * Primary conversation agent for the PRD interview.
 * Conducts the 5-round interview and captures section data.
 */
import type { ConversationMessage, InterviewRound, InterviewSession } from '../types'

/**
 * Interview agent options.
 */
export interface InterviewAgentOptions {
  /** Project root directory */
  projectRoot: string

  /** Project config as YAML string */
  projectConfig: string

  /** Checkpoint data as string (if available) */
  checkpointData: string | null

  /** Current PRD content */
  prdContent: string

  /** Callback for streaming response chunks */
  onChunk?: (chunk: string) => void

  /** Callback for round completion */
  onRoundComplete?: (round: InterviewRound) => void

  /** Callback when summarization occurs */
  onSummarization?: () => void
}

/**
 * Interview agent result.
 */
export interface InterviewAgentResult {
  /** Updated session */
  session: InterviewSession

  /** Response text */
  response: string

  /** Whether the round is complete */
  roundComplete: boolean

  /** Whether all rounds are complete */
  allComplete: boolean
}

/**
 * Check if a response indicates round completion.
 * The agent should explicitly signal when ready to move on.
 */
function isRoundComplete(response: string): boolean {
  const completionIndicators = [
    /ready to move on/i,
    /proceed to (?:the )?next round/i,
    /let's move on to/i,
    /that covers (?:round|the framing|requirements|dependencies)/i,
    /shall we proceed/i,
    /move forward/i,
  ]

  return completionIndicators.some((pattern) => pattern.test(response))
}

/**
 * Process a user message and get agent response.
 */
export async function processMessage(
  session: InterviewSession,
  userMessage: string,
  options: InterviewAgentOptions
): Promise<InterviewAgentResult> {
  const {
    projectRoot,
    projectConfig,
    checkpointData,
    prdContent,
    onChunk,
    onRoundComplete,
    onSummarization,
  } = options

  // Add user message to session
  let updatedSession = addMessage(session, 'user', userMessage)

  // Get system prompt for current round
  const systemPrompt = getRoundSystemPrompt(
    updatedSession.currentRound,
    projectConfig,
    checkpointData
  )

  // Check context state
  const systemTokens = estimateTokens(systemPrompt)
  const prdTokens = estimateTokens(prdContent)
  const contextState = getContextState(updatedSession, systemTokens, prdTokens)

  // Summarize if needed
  if (contextState.needsSummarization) {
    onSummarization?.()

    // Generate summary
    const summaryPrompt = buildSummarizationPrompt(
      updatedSession.messages,
      updatedSession.currentRound
    )

    const summaryMessages: ConversationMessage[] = [
      { role: 'user', content: summaryPrompt, timestamp: new Date().toISOString() },
    ]

    const summary = await collectStreamedResponse(
      'You are a helpful assistant that summarizes conversations concisely.',
      summaryMessages
    )

    // Add summary and clear messages
    updatedSession = addSummary(updatedSession, summary, updatedSession.messages.length)
  }

  // Build context with summaries if available
  let fullSystemPrompt = systemPrompt

  if (updatedSession.summaries.length > 0) {
    const summaryContext = updatedSession.summaries
      .map((s) => `[${s.round}] ${s.summary}`)
      .join('\n\n')

    fullSystemPrompt = `${systemPrompt}

## Previous Conversation Summary
${summaryContext}

## Current PRD State
${prdContent}

Continue the interview from where we left off.`
  } else if (prdContent) {
    fullSystemPrompt = `${systemPrompt}

## Current PRD State
${prdContent}`
  }

  // Get response from API
  const response = await collectStreamedResponse(fullSystemPrompt, updatedSession.messages, onChunk)

  // Add assistant response to session
  updatedSession = addMessage(updatedSession, 'assistant', response)

  // Update token count
  const newContextState = getContextState(
    updatedSession,
    estimateTokens(fullSystemPrompt),
    prdTokens
  )
  updatedSession = updateTokenCount(updatedSession, newContextState.currentTokens)

  // Check if round is complete
  const roundComplete = isRoundComplete(response)
  let allComplete = false

  if (roundComplete) {
    onRoundComplete?.(updatedSession.currentRound)

    if (isLastRound(updatedSession.currentRound)) {
      allComplete = true
      updatedSession = { ...updatedSession, status: 'reviewing' }
    } else {
      updatedSession = advanceRound(updatedSession)
    }
  }

  // Save session
  await saveSession(projectRoot, updatedSession)

  return {
    session: updatedSession,
    response,
    roundComplete,
    allComplete,
  }
}

/**
 * Start a new interview.
 */
export async function startInterview(
  session: InterviewSession,
  options: InterviewAgentOptions
): Promise<InterviewAgentResult> {
  const { projectConfig, checkpointData, prdContent, onChunk } = options

  // Get initial system prompt
  const systemPrompt = getRoundSystemPrompt(session.currentRound, projectConfig, checkpointData)

  let fullSystemPrompt = systemPrompt
  if (prdContent) {
    fullSystemPrompt = `${systemPrompt}

## Current PRD State
${prdContent}`
  }

  // Generate initial greeting
  const initialMessages: ConversationMessage[] = [
    {
      role: 'user',
      content: "Hello! I'm ready to start the PRD interview.",
      timestamp: new Date().toISOString(),
    },
  ]

  const response = await collectStreamedResponse(fullSystemPrompt, initialMessages, onChunk)

  // Update session
  const firstMessage = initialMessages[0]
  if (!firstMessage) {
    throw new Error('No initial message provided')
  }
  let updatedSession = addMessage(session, 'user', firstMessage.content)
  updatedSession = addMessage(updatedSession, 'assistant', response)
  updatedSession = { ...updatedSession, status: 'in-progress' }

  // Save session
  await saveSession(options.projectRoot, updatedSession)

  return {
    session: updatedSession,
    response,
    roundComplete: false,
    allComplete: false,
  }
}

/**
 * Resume an existing interview.
 */
export async function resumeInterview(
  session: InterviewSession,
  options: InterviewAgentOptions
): Promise<InterviewAgentResult> {
  const { projectConfig, checkpointData, prdContent, onChunk } = options

  // Get system prompt for current round
  const systemPrompt = getRoundSystemPrompt(session.currentRound, projectConfig, checkpointData)

  // Build context with summaries
  let fullSystemPrompt = systemPrompt

  if (session.summaries.length > 0) {
    const summaryContext = session.summaries.map((s) => `[${s.round}] ${s.summary}`).join('\n\n')

    fullSystemPrompt = `${systemPrompt}

## Previous Conversation Summary
${summaryContext}

## Current PRD State
${prdContent}

The user is resuming the interview. Briefly acknowledge where we are and continue.`
  } else {
    fullSystemPrompt = `${systemPrompt}

## Current PRD State
${prdContent}

The user is resuming the interview. Briefly acknowledge where we are and continue.`
  }

  // Generate resume message
  const resumeMessage: ConversationMessage = {
    role: 'user',
    content: "I'm back to continue the interview.",
    timestamp: new Date().toISOString(),
  }

  let updatedSession = addMessage(session, 'user', resumeMessage.content)

  const response = await collectStreamedResponse(fullSystemPrompt, updatedSession.messages, onChunk)

  updatedSession = addMessage(updatedSession, 'assistant', response)

  // Save session
  await saveSession(options.projectRoot, updatedSession)

  return {
    session: updatedSession,
    response,
    roundComplete: false,
    allComplete: false,
  }
}
