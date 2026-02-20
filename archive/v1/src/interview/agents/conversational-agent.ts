import {
  type ToolResultInput,
  streamContinueWithToolResults,
  streamMessageWithTools,
} from '../conversation'
import { SectionTracker, formatProgressSummary } from '../section-tracker'
import {
  type ExecutionContext,
  INTERVIEW_TOOLS,
  type InterviewToolName,
  type ToolExecutionResult,
  executeTool,
} from '../tools'
/**
 * KARIMO Conversational Interview Agent
 *
 * Free-form interview agent that listens, extracts, and captures PRD data.
 * Uses tools to capture sections, requirements, and flag conflicts.
 */
import type { PRDProgress } from '../types'

// =============================================================================
// System Prompt
// =============================================================================

/**
 * System prompt for the conversational interview agent.
 */
const CONVERSATIONAL_SYSTEM_PROMPT = `You are KARIMO's Interview Agent. You help users define their product requirements through natural conversation.

## Your Approach
- LISTEN first, then extract. Do not interrogate.
- Use tools to capture AS YOU HEAR IT. Don't wait.
- SUMMARIZE what you captured, PROBE for gaps.
- Report progress at 25%, 50%, 75%, completion.

## Available Tools
You have access to these tools - use them frequently:

1. **capture_section** - Write/update PRD section content as you hear it
   - Use mode "replace" to overwrite, "append" to add, "refine" to improve
   - Set confidence based on how sure you are (70+ for clear info)

2. **capture_requirement** - Add requirements to the table
   - Categorize as must/should/could priority
   - Include acceptance criteria when the user specifies them

3. **flag_conflict** - Flag contradictions IMMEDIATELY
   - Never silently resolve conflicts
   - Present both statements to user and ask which direction

4. **report_progress** - Report completion at milestones
   - Use at 25%, 50%, 75%, and when nearing completion

## Conflict Detection — CRITICAL
You MUST flag contradictions immediately. Never silently resolve.

Types of conflicts:
- **user-vs-user**: User said one thing earlier, now saying something different
  Example: "MVP quality" then later "polished animations on every state"
- **user-vs-codebase**: User describes something that doesn't match the codebase
  Example: References a component that doesn't exist
- **user-vs-prd**: New information contradicts what's already in the PRD
  Example: Changing scope after sections are filled

When conflict detected:
1. Call flag_conflict tool immediately
2. Tell user: "I noticed [X] vs [Y]. Which direction?"
3. Do NOT write conflicting info until resolved

## Conversation Flow
1. User provides context (may be stream-of-consciousness)
2. You extract and capture using tools
3. You summarize what you captured
4. You probe for gaps
5. Repeat until PRD is complete

## Rules
- Never fabricate. Only capture what user said.
- If unsure, set confidence low and ask.
- Parse stream-of-consciousness input - users may ramble.
- If 3+ exchanges without capturing anything, you're interrogating. Stop.
- Keep responses concise. Don't repeat what user said back verbatim.

## PRD Sections (weights)
- Executive Summary (15%) - One-liner, what's changing, who it's for
- Problem & Context (10%) - Problem statement, why now
- Goals & Metrics (15%) - Goals, non-goals, success metrics
- Requirements (20%) - Must/should/could with acceptance criteria
- UX Notes (10%) - User experience considerations
- Dependencies & Risks (10%) - Blockers, dependencies, risks
- Rollout (5%) - Release strategy
- Milestones (5%) - Key milestones
- Checkpoint Learnings (5%) - Patterns to reinforce/avoid
- Agent Boundaries (5%) - Files to reference/protect`

// =============================================================================
// Types
// =============================================================================

/**
 * Options for the conversational agent.
 */
export interface ConversationalAgentOptions {
  /** Project root directory */
  projectRoot: string

  /** PRD slug */
  prdSlug: string

  /** Current PRD content */
  prdContent: string

  /** Project config as YAML string */
  projectConfig: string

  /** Section tracker instance */
  tracker: SectionTracker

  /** Callback for streaming response chunks */
  onChunk?: (chunk: string) => void

  /** Callback for tool execution results */
  onToolResult?: (result: ToolExecutionResult) => void

  /** Callback for progress updates */
  onProgress?: (progress: PRDProgress) => void
}

/**
 * Result from processing a message.
 */
export interface ConversationalAgentResult {
  /** Response text */
  response: string

  /** Tool calls made */
  toolCalls: ToolExecutionResult[]

  /** Updated progress */
  progress: PRDProgress

  /** Whether finalization should be offered */
  offerFinalize: boolean

  /** Whether finalization should be suggested proactively */
  suggestFinalize: boolean
}

/**
 * Message history format.
 */
export interface ConversationMessageSimple {
  role: 'user' | 'assistant'
  content: string
}

// =============================================================================
// Agent Implementation
// =============================================================================

/**
 * Process a user message in the conversational interview.
 *
 * @param messages - Conversation history
 * @param userMessage - New user message
 * @param options - Agent options
 * @returns Agent result with response and tool calls
 */
export async function processConversationalMessage(
  messages: ConversationMessageSimple[],
  userMessage: string,
  options: ConversationalAgentOptions
): Promise<ConversationalAgentResult> {
  const {
    projectRoot,
    prdSlug,
    prdContent,
    projectConfig,
    tracker,
    onChunk,
    onToolResult,
    onProgress,
  } = options

  // Build system prompt with current state
  const progress = tracker.getProgress()
  const progressSummary = formatProgressSummary(progress)

  const systemPrompt = `${CONVERSATIONAL_SYSTEM_PROMPT}

## Current State
${progressSummary}

## Project Config
${projectConfig}

## Current PRD Content
${prdContent}`

  // Add user message to history
  const updatedMessages: ConversationMessageSimple[] = [
    ...messages,
    {
      role: 'user',
      content: userMessage,
    },
  ]

  // Create execution context for tools
  const executionContext: ExecutionContext = {
    projectRoot,
    prdSlug,
    tracker,
    currentPrdContent: prdContent,
  }

  // Send message with tools (streaming)
  const toolCalls: ToolExecutionResult[] = []
  let response = ''

  // Convert tools to the expected format
  const toolDefs = INTERVIEW_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Record<string, unknown>,
  }))

  // Use streaming tool-enabled conversation
  const result = await streamMessageWithTools(systemPrompt, updatedMessages, toolDefs, onChunk)

  response = result.response

  // Process any tool calls
  if (result.toolUse && result.toolUse.length > 0) {
    const toolResults: ToolResultInput[] = []
    const assistantContent: Array<
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    > = []

    // Add text response to assistant content if present
    if (result.response) {
      assistantContent.push({ type: 'text', text: result.response })
    }

    // Execute each tool and collect results
    for (const toolCall of result.toolUse) {
      // Add tool use to assistant content
      assistantContent.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.input,
      })

      if (isValidToolName(toolCall.name)) {
        const toolResult = await executeTool(toolCall.name, toolCall.input, executionContext)
        toolCalls.push(toolResult)
        onToolResult?.(toolResult)

        // Add to tool results for continuation
        toolResults.push({
          toolUseId: toolCall.id,
          content: toolResult.success ? toolResult.message : `Error: ${toolResult.error}`,
        })
      }
    }

    // If there were tool calls, continue the conversation to get final response
    if (toolResults.length > 0) {
      const continuation = await streamContinueWithToolResults(
        systemPrompt,
        updatedMessages,
        assistantContent,
        toolResults,
        toolDefs,
        onChunk
      )

      // Append continuation response
      if (continuation.response) {
        response = response ? `${response}\n\n${continuation.response}` : continuation.response
      }
    }
  }

  // Get final progress
  const finalProgress = tracker.getProgress()
  onProgress?.(finalProgress)

  return {
    response,
    toolCalls,
    progress: finalProgress,
    offerFinalize: tracker.isReadyForFinalizationOffer(),
    suggestFinalize: tracker.shouldSuggestFinalization(),
  }
}

/**
 * Check if a string is a valid tool name.
 */
function isValidToolName(name: string): name is InterviewToolName {
  return ['capture_section', 'capture_requirement', 'flag_conflict', 'report_progress'].includes(
    name
  )
}

/**
 * Start a conversational interview with an initial greeting.
 */
export async function startConversationalInterview(
  options: Omit<ConversationalAgentOptions, 'tracker'> & { tracker?: SectionTracker }
): Promise<ConversationalAgentResult> {
  const tracker = options.tracker ?? new SectionTracker()

  // Initial greeting message
  const greeting = `I'm here to help you define your product requirements. Tell me about what you're building - you can share as much context as you'd like, whether it's a rough idea, meeting notes, or detailed specs. I'll extract the key information as we talk.

What feature or project are you working on?`

  return {
    response: greeting,
    toolCalls: [],
    progress: tracker.getProgress(),
    offerFinalize: false,
    suggestFinalize: false,
  }
}
