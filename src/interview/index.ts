/**
 * KARIMO Interview Module
 *
 * PRD interview system with AI-powered conversation.
 * Supports both legacy round-based and new conversational modes.
 */
import * as p from '@clack/prompts'
import { stringify as stringifyYaml } from 'yaml'
import { getNextPRDNumber, loadState, setCurrentPRD } from '../cli/state'
import {
  type StreamRenderer,
  createCollapsibleRenderer,
  createKeypressManager,
  createStreamRenderer,
  processUserInput,
} from '../cli/ui'
import { loadConfig } from '../config/loader'
import {
  type ConversationMessageSimple,
  processConversationalMessage,
  startConversationalInterview as startConversationalAgent,
} from './agents/conversational-agent'
import { processIntake } from './agents/intake-agent'
import {
  processMessage,
  resumeInterview as resumeInterviewAgent,
  startInterview as startInterviewAgent,
} from './agents/interview-agent'
import { formatReviewResult, isReadyForFinalization, reviewPRD } from './agents/review-agent'
import { InterviewCancelledError } from './errors'
import {
  type PRDFrontmatter,
  createPRDFile,
  generatePRDSlug,
  readPRDFile,
  updatePRDSection,
} from './prd-file'
import { SectionTracker, formatProgressBar } from './section-tracker'
import {
  createSession,
  getRoundDisplayName,
  getRoundNumber,
  loadSession,
  saveSession,
  sessionExists,
} from './session'
import type { IntakeResult, InterviewSession } from './types'

// =============================================================================
// Stream Rendering Helper
// =============================================================================

/**
 * Create a stream renderer for agent output.
 * Buffers the full response for post-stream formatting.
 */
function createAgentStreamRenderer(): {
  renderer: StreamRenderer
  onChunk: (chunk: string) => void
  getFullResponse: () => string
} {
  const renderer = createStreamRenderer({ margin: 2 })
  let fullResponse = ''

  return {
    renderer,
    onChunk: (chunk: string) => {
      fullResponse += chunk
      renderer.handler(chunk)
    },
    getFullResponse: () => fullResponse,
  }
}

// =============================================================================
// Types
// =============================================================================

export type {
  InterviewSession,
  InterviewStatus,
  InterviewRound,
  ConversationMessage,
  ConversationSummary,
  RoundContext,
  InterviewConfig,
  InvestigationResult,
  ReviewResult,
  ReviewIssue,
  PRDSectionData,
  InterviewTask,
  // Conversational interview types
  IntakeResult,
  SectionStatus,
  SectionStatusValue,
  ConflictRecord,
  ConflictType,
  PRDProgress,
  ConversationalSession,
  ScopeType,
} from './types'

// =============================================================================
// Errors
// =============================================================================

export {
  InterviewError,
  AnthropicKeyNotFoundError,
  AnthropicAPIError,
  ContextOverflowError,
  SessionLoadError,
  SessionSaveError,
  PRDFileError,
  InterviewCancelledError,
  InvestigationError,
  ReviewError,
} from './errors'

// =============================================================================
// Session Management
// =============================================================================

export {
  sessionExists,
  loadSession,
  createSession,
  saveSession,
  ROUND_ORDER,
  getRoundDisplayName,
  getRoundNumber,
  getRoundEstimatedMinutes,
  // Subagent management
  addSubagentExecution,
  updateSubagentUsage,
  recordSubagentExecution,
  getSubagentUsageSummary,
  clearSubagentHistory,
} from './session'

export type { SubagentUsageSummary } from './session'

// =============================================================================
// PRD File Operations
// =============================================================================

export {
  createPRDFile,
  readPRDFile,
  generatePRDSlug,
  updatePRDSection,
  updatePRDStatus,
  appendTasks,
  getPRDsDir,
  getPRDPath,
} from './prd-file'

// =============================================================================
// Conversation
// =============================================================================

export {
  getAnthropicClient,
  sendMessage,
  streamMessage,
  collectStreamedResponse,
  sendMessageWithTools,
  continueWithToolResults,
  // Streaming tool APIs
  streamMessageWithTools,
  streamContinueWithToolResults,
  type ToolResultInput,
  type StreamToolResult,
} from './conversation'

// =============================================================================
// Context Management
// =============================================================================

export {
  estimateTokens,
  estimateMessagesTokens,
  calculateContextTokens,
  isNearCapacity,
  getAvailableTokens,
  getContextState,
  buildSummarizationPrompt,
  buildHandoffContext,
  formatHandoffContext,
} from './context-manager'

// =============================================================================
// Section Mapping
// =============================================================================

export {
  ROUND_TO_SECTIONS,
  getRoundSystemPrompt,
  getRoundContext,
  getReviewSystemPrompt,
} from './section-mapper'

// =============================================================================
// Agents
// =============================================================================

export {
  startInterview as startInterviewAgent,
  processMessage,
  resumeInterview as resumeInterviewAgent,
} from './agents/interview-agent'

export {
  investigate,
  COMMON_QUERIES,
} from './agents/investigation-agent'

export {
  reviewPRD,
  generateSuggestions,
  isReadyForFinalization,
  formatReviewResult,
} from './agents/review-agent'

// =============================================================================
// Conversational Interview Agent
// =============================================================================

export {
  processConversationalMessage,
  startConversationalInterview as startConversationalAgent,
  type ConversationalAgentOptions,
  type ConversationalAgentResult,
  type ConversationMessageSimple,
} from './agents/conversational-agent'

// =============================================================================
// Intake Agent
// =============================================================================

export { processIntake, type IntakeAgentOptions } from './agents/intake-agent'

// =============================================================================
// Section Tracker
// =============================================================================

export {
  SectionTracker,
  createSectionTracker,
  formatProgressBar,
  formatProgressSummary,
  formatConflict,
  formatSectionIcon,
} from './section-tracker'

// =============================================================================
// Interview Tools
// =============================================================================

export {
  INTERVIEW_TOOLS,
  executeTool,
  createToolExecutor,
  type ToolExecutionResult,
  type ExecutionContext,
  type InterviewToolName,
  type ToolDefinition,
} from './tools'

// =============================================================================
// Subagents
// =============================================================================

export type {
  SubagentType,
  SubagentSpawnRequest,
  SubagentResult,
  SubagentContext,
  SubagentTokenUsage,
  SubagentHistoryEntry,
  SubagentExecution,
  SubagentStatus,
  SubagentResultData,
  InterviewSubagentType,
  InvestigationSubagentType,
  ReviewSubagentType,
  ParentAgentType,
} from './subagents'

export {
  AgentRegistry,
  createAgentRegistry,
  SubagentSpawner,
  createSubagentSpawner,
  SubagentCostTracker,
  createCostTracker,
  calculateSingleUsageCost,
  formatCost,
  getSubagentPrompt,
} from './subagents'

export type {
  AggregatedUsage,
  SpawnOptions,
  ParallelSpawnOptions,
  CostCalculation,
} from './subagents'

// =============================================================================
// High-Level Interview Flow
// =============================================================================

/**
 * Start a new PRD interview.
 */
export async function startInterview(projectRoot: string): Promise<void> {
  // Load config
  const config = await loadConfig(projectRoot)
  const configYaml = stringifyYaml(config)

  // Get next PRD number
  const prdNumber = await getNextPRDNumber(projectRoot)

  // Ask for feature name
  const featureName = await p.text({
    message: 'What feature are you building?',
    placeholder: 'e.g., Token Studio Integration',
    validate: (value) => {
      if (!value.trim()) return 'Feature name is required'
      return undefined
    },
  })

  if (p.isCancel(featureName)) {
    throw new InterviewCancelledError('framing', 'User cancelled')
  }

  // Generate slug
  const prdSlug = generatePRDSlug(prdNumber, featureName)

  // Get owner
  const owner = await p.text({
    message: 'Who owns this feature?',
    placeholder: 'Your name or username',
  })

  if (p.isCancel(owner)) {
    throw new InterviewCancelledError('framing', 'User cancelled')
  }

  // Create PRD frontmatter
  const dateStr = new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10)
  const frontmatter: PRDFrontmatter = {
    feature_name: featureName,
    feature_slug: prdSlug,
    owner: owner || 'unknown',
    status: 'draft',
    created_date: dateStr,
  }

  // Create PRD file
  const prdPath = await createPRDFile(projectRoot, prdSlug, frontmatter)
  p.log.success(`Created PRD: ${prdPath}`)

  // Create session
  const session = await createSession(projectRoot, prdSlug, prdPath)

  // Update state
  await setCurrentPRD(projectRoot, prdSlug, 'framing')

  // Start interview
  p.log.step(`Starting interview for "${featureName}"`)
  p.log.info('This will take approximately 28 minutes across 5 rounds.')

  // Load PRD content
  const prdContent = await readPRDFile(projectRoot, prdSlug)

  // Create stream renderer for wrapped output
  const { renderer, onChunk } = createAgentStreamRenderer()

  // Start the interview agent
  const result = await startInterviewAgent(session, {
    projectRoot,
    projectConfig: configYaml,
    checkpointData: null, // TODO: Load checkpoint data when available
    prdContent,
    onChunk,
    onRoundComplete: (round) => {
      renderer.flush()
      p.log.success(`Round ${getRoundNumber(round)} complete: ${getRoundDisplayName(round)}`)
    },
  })

  renderer.flush()
  console.log('\n')

  // Continue interview loop
  await runInterviewLoop(projectRoot, result.session, configYaml, null)
}

/**
 * Resume an existing interview.
 */
export async function resumeInterview(projectRoot: string): Promise<void> {
  // Load state to get current PRD
  const state = await loadState(projectRoot)

  if (!state.current_prd) {
    p.log.error('No interview in progress')
    return
  }

  const prdSlug = state.current_prd

  // Check if session exists
  if (!sessionExists(projectRoot, prdSlug)) {
    p.log.error(`Session not found for ${prdSlug}`)
    return
  }

  // Load session
  const session = await loadSession(projectRoot, prdSlug)

  p.log.info(`Resuming interview for "${prdSlug}"`)
  p.log.info(`Current round: ${getRoundDisplayName(session.currentRound)}`)

  // Load config
  const config = await loadConfig(projectRoot)
  const configYaml = stringifyYaml(config)

  // Load PRD content
  const prdContent = await readPRDFile(projectRoot, prdSlug)

  // Create stream renderer for wrapped output
  const { renderer, onChunk } = createAgentStreamRenderer()

  // Resume the interview
  const result = await resumeInterviewAgent(session, {
    projectRoot,
    projectConfig: configYaml,
    checkpointData: null,
    prdContent,
    onChunk,
    onRoundComplete: (round) => {
      renderer.flush()
      p.log.success(`Round ${getRoundNumber(round)} complete: ${getRoundDisplayName(round)}`)
    },
  })

  renderer.flush()
  console.log('\n')

  // Continue interview loop
  await runInterviewLoop(projectRoot, result.session, configYaml, null)
}

/**
 * Run the interactive interview loop.
 */
async function runInterviewLoop(
  projectRoot: string,
  initialSession: InterviewSession,
  projectConfig: string,
  checkpointData: string | null
): Promise<void> {
  let session = initialSession

  // Create collapsible renderer and keypress manager
  const collapsible = createCollapsibleRenderer({ previewLines: 3 })
  const keypress = createKeypressManager()

  try {
    while (session.status === 'in-progress') {
      // CRITICAL: Deactivate before prompt (let clack handle input)
      keypress.deactivate()

      // Get user input
      const input = await p.text({
        message: `Round ${getRoundNumber(session.currentRound)}`,
        placeholder: 'Your response...',
      })

      if (p.isCancel(input)) {
        const shouldSave = await p.confirm({
          message: 'Save progress and exit?',
          initialValue: true,
        })

        if (p.isCancel(shouldSave) || shouldSave) {
          await saveSession(projectRoot, session)
          p.log.info('Progress saved. Run `karimo` to resume.')
        }
        return
      }

      // Replace clack's output with collapsible view
      // (auto-collapses any previously expanded sections)
      // Use processUserInput to sanitize display while preserving original
      const processed = processUserInput(input)
      collapsible.render(processed)

      // Activate Ctrl+O listener (before streaming)
      keypress.activate([{ key: 'ctrl+o', callback: () => collapsible.toggleLast() }])

      // Load PRD content
      const prdContent = await readPRDFile(projectRoot, session.prdSlug)

      // Create stream renderer for this message
      const { renderer, onChunk, getFullResponse } = createAgentStreamRenderer()

      // PAUSE keypresses during streaming
      keypress.pause()

      // Process message (send original text to agent)
      const result = await processMessage(session, processed.original, {
        projectRoot,
        projectConfig,
        checkpointData,
        prdContent,
        onChunk,
        onRoundComplete: (round) => {
          renderer.flush()
          console.log('\n')
          p.log.success(`Round ${getRoundNumber(round)} complete: ${getRoundDisplayName(round)}`)
        },
        onSummarization: () => {
          renderer.flush()
          p.log.info('Context summarized to maintain quality.')
        },
      })

      renderer.flush()

      // TODO: Future enhancement - apply response formatting after streaming
      // The getFullResponse() function buffers the complete response for:
      // - Question highlighting (green)
      // - Bold markdown conversion
      // This will require cursor-based re-rendering to update in place.
      // For now, responses display as streamed.
      void getFullResponse() // Acknowledge buffered response

      console.log('\n')
      session = result.session

      // RESUME keypresses after streaming (user can toggle while reviewing)
      keypress.resume()

      if (result.allComplete) {
        p.log.success('All interview rounds complete!')
        break
      }
    }

    // Move to review if all rounds complete
    if (session.status === 'reviewing') {
      await runReview(projectRoot, session)
    }
  } finally {
    // Cleanup on exit
    keypress.deactivate()
    collapsible.cleanup()
  }
}

/**
 * Run the review phase.
 */
async function runReview(projectRoot: string, session: InterviewSession): Promise<void> {
  p.log.step('Running PRD review...')

  // Load PRD content
  const prdContent = await readPRDFile(projectRoot, session.prdSlug)

  // Run review
  const reviewSpinner = p.spinner()
  reviewSpinner.start('Analyzing PRD...')

  const result = await reviewPRD(prdContent)

  reviewSpinner.stop('Review complete')

  // Display results
  console.log('\n')
  console.log(formatReviewResult(result))
  console.log('\n')

  // Check if ready for finalization
  if (isReadyForFinalization(result)) {
    const finalize = await p.confirm({
      message: 'PRD looks good! Finalize it?',
      initialValue: true,
    })

    if (p.isCancel(finalize)) {
      await saveSession(projectRoot, { ...session, status: 'reviewing' })
      return
    }

    if (finalize) {
      // TODO: Finalize PRD (update status, create tasks)
      await saveSession(projectRoot, { ...session, status: 'finalized' })
      p.log.success('PRD finalized! Ready for execution.')
    }
  } else {
    p.log.warn('Please address the issues above before finalizing.')

    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'edit', label: 'Edit the PRD manually' },
        { value: 'continue', label: 'Continue interview to address issues' },
        { value: 'save', label: 'Save and exit for now' },
      ],
    })

    if (p.isCancel(action)) {
      await saveSession(projectRoot, session)
      return
    }

    switch (action) {
      case 'edit':
        p.log.info(`Edit the PRD at: ${session.prdPath}`)
        p.log.info('Run `karimo` again when ready to re-review.')
        break
      case 'continue': {
        // Reset to last round and continue
        const updatedSession = { ...session, status: 'in-progress' as const }
        await saveSession(projectRoot, updatedSession)
        p.log.info('Session reset. Run `karimo` again to continue the interview.')
        // TODO: Implement inline interview continuation
        break
      }
      case 'save':
        await saveSession(projectRoot, session)
        p.log.info('Progress saved.')
        break
    }
  }
}

// =============================================================================
// Conversational Interview Flow (New)
// =============================================================================

/**
 * State for the conversational interview.
 */
interface ConversationalState {
  projectRoot: string
  prdSlug: string
  prdPath: string
  tracker: SectionTracker
  messages: ConversationMessageSimple[]
  configYaml: string
}

/**
 * Start a new conversational PRD interview.
 *
 * This is the new flow that replaces the rigid round-based interview.
 * It listens first, extracts structure, and tracks progress via weighted sections.
 */
export async function startNewInterview(projectRoot: string): Promise<void> {
  // Load config
  const config = await loadConfig(projectRoot)
  const configYaml = stringifyYaml(config)

  // Get next PRD number
  const prdNumber = await getNextPRDNumber(projectRoot)

  // Open-ended intake prompt
  p.log.step("Let's define your product requirements.")
  p.log.info('Share as much context as you want - meeting notes, rough ideas, or detailed specs.')
  p.log.info("I'll extract the key information as we talk.\n")

  const initialContext = await p.text({
    message: "What feature or project are you working on? Tell me everything you've got.",
    placeholder: 'Paste context, describe the feature, or just start talking...',
    validate: (value) => {
      if (!value.trim()) return 'Please provide some context to get started'
      if (value.trim().length < 20)
        return 'Please provide more context (at least a sentence or two)'
      return undefined
    },
  })

  if (p.isCancel(initialContext)) {
    throw new InterviewCancelledError('intake', 'User cancelled')
  }

  // Run intake agent to extract structure
  const intakeSpinner = p.spinner()
  intakeSpinner.start('Analyzing your context...')

  let intakeResult: IntakeResult
  try {
    intakeResult = await processIntake(initialContext)
    intakeSpinner.stop('Context analyzed')
  } catch (error) {
    intakeSpinner.stop('Analysis failed')
    throw error
  }

  // Display suggested title and let user confirm/edit
  console.log('\n')
  p.log.info(`Suggested title: ${intakeResult.suggestedTitle}`)
  p.log.info(`Scope: ${intakeResult.scopeType.replace('-', ' ')}`)

  const featureName = await p.text({
    message: 'Feature name (press Enter to accept)',
    defaultValue: intakeResult.suggestedTitle,
    placeholder: intakeResult.suggestedTitle,
  })

  if (p.isCancel(featureName)) {
    throw new InterviewCancelledError('intake', 'User cancelled')
  }

  const finalName = featureName || intakeResult.suggestedTitle

  // Generate slug
  const prdSlug = generatePRDSlug(prdNumber, finalName)

  // Get owner
  const owner = await p.text({
    message: 'Who owns this feature?',
    placeholder: 'Your name or username',
  })

  if (p.isCancel(owner)) {
    throw new InterviewCancelledError('intake', 'User cancelled')
  }

  // Create PRD frontmatter
  const dateStr = new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10)
  const frontmatter: PRDFrontmatter = {
    feature_name: finalName,
    feature_slug: prdSlug,
    owner: owner || 'unknown',
    status: 'draft',
    created_date: dateStr,
  }

  // Create PRD file
  const prdPath = await createPRDFile(projectRoot, prdSlug, frontmatter)
  p.log.success(`Created PRD: ${prdPath}`)

  // Pre-fill sections from intake
  if (intakeResult.executiveSummary) {
    await updatePRDSection(
      projectRoot,
      prdSlug,
      1,
      'Executive Summary',
      intakeResult.executiveSummary
    )
  }

  for (const [sectionId, content] of Object.entries(intakeResult.initialSections)) {
    const sectionNum = getSectionNumber(sectionId)
    if (sectionNum && content) {
      await updatePRDSection(projectRoot, prdSlug, sectionNum, getSectionTitle(sectionId), content)
    }
  }

  // Initialize section tracker
  const tracker = new SectionTracker()

  // Mark pre-filled sections as partial
  if (intakeResult.executiveSummary) {
    tracker.updateSection('executive-summary', 'partial', 60)
  }
  for (const sectionId of Object.keys(intakeResult.initialSections)) {
    tracker.updateSection(sectionId, 'partial', 50)
  }

  // Update state - use 'requirements' since intake (framing) is done
  await setCurrentPRD(projectRoot, prdSlug, 'requirements')

  // Show initial progress
  const progress = tracker.getProgress()
  console.log('\n')
  p.log.info('Initial progress:')
  console.log(`  ${formatProgressBar(progress.overallPercent)}`)
  console.log('\n')

  // Show topics to explore
  if (intakeResult.gapsToExplore.length > 0) {
    p.log.info(`Topics to explore: ${intakeResult.gapsToExplore.join(', ')}`)
    console.log('\n')
  }

  // Create conversation state
  const state: ConversationalState = {
    projectRoot,
    prdSlug,
    prdPath,
    tracker,
    messages: [],
    configYaml,
  }

  // Get initial greeting from conversational agent
  const { renderer, onChunk } = createAgentStreamRenderer()
  const greeting = await startConversationalAgent({
    projectRoot,
    prdSlug,
    prdContent: await readPRDFile(projectRoot, prdSlug),
    projectConfig: configYaml,
    tracker,
    onChunk,
  })

  renderer.flush()
  console.log(greeting.response)
  console.log('\n')

  // Add assistant greeting to messages
  state.messages.push({
    role: 'assistant',
    content: greeting.response,
  })

  // Run conversational loop
  await runConversationalLoop(state)
}

/**
 * Run the conversational interview loop.
 */
async function runConversationalLoop(state: ConversationalState): Promise<void> {
  const { projectRoot, prdSlug, tracker, configYaml } = state

  // Create collapsible renderer and keypress manager
  const collapsible = createCollapsibleRenderer({ previewLines: 3 })
  const keypress = createKeypressManager()

  try {
    while (true) {
      // CRITICAL: Deactivate before prompt (let clack handle input)
      keypress.deactivate()

      // Get user input
      const progress = tracker.getProgress()
      const promptMsg =
        progress.overallPercent >= 80 ? 'Your response (or "done" to finalize)' : 'Your response'

      const input = await p.text({
        message: promptMsg,
        placeholder: 'Continue describing your feature...',
      })

      if (p.isCancel(input)) {
        // Save progress and exit
        p.log.info('Progress saved to PRD file.')
        return
      }

      // Check for done command
      if (input.toLowerCase().trim() === 'done' && progress.overallPercent >= 80) {
        await handleFinalization(state)
        return
      }

      // Replace clack's output with collapsible view
      // (auto-collapses any previously expanded sections)
      // Use processUserInput to sanitize display while preserving original
      const processed = processUserInput(input)
      collapsible.render(processed)

      // Activate Ctrl+O listener (before streaming)
      keypress.activate([{ key: 'ctrl+o', callback: () => collapsible.toggleLast() }])

      // Add user message to history (use original text)
      state.messages.push({
        role: 'user',
        content: processed.original,
      })

      // Load current PRD content
      const prdContent = await readPRDFile(projectRoot, prdSlug)

      // Create stream renderer
      const { renderer, onChunk, getFullResponse } = createAgentStreamRenderer()

      // PAUSE keypresses during streaming
      keypress.pause()

      // Process message (send original text to agent)
      const result = await processConversationalMessage(state.messages, processed.original, {
        projectRoot,
        prdSlug,
        prdContent,
        projectConfig: configYaml,
        tracker,
        onChunk,
        onToolResult: (toolResult) => {
          renderer.flush()
          if (toolResult.isConflict) {
            console.log('\n')
            p.log.warn(toolResult.message)
          } else if (toolResult.success) {
            console.log(`\n  ${toolResult.message}`)
          }
        },
        onProgress: (prog) => {
          // Show progress at milestones
          const milestones = [25, 50, 75, 95]
          const lastPercent = state.tracker.getProgress().overallPercent
          for (const milestone of milestones) {
            if (lastPercent < milestone && prog.overallPercent >= milestone) {
              console.log(
                `\n  🌟 ${milestone}% milestone: ${formatProgressBar(prog.overallPercent)}`
              )
            }
          }
        },
      })

      renderer.flush()

      // TODO: Future enhancement - apply response formatting after streaming
      // The getFullResponse() function buffers the complete response for:
      // - Question highlighting (green)
      // - Bold markdown conversion
      // This will require cursor-based re-rendering to update in place.
      // For now, responses display as streamed.
      void getFullResponse() // Acknowledge buffered response

      // RESUME keypresses after streaming (user can toggle while reviewing)
      keypress.resume()

      // Add assistant response to messages
      if (result.response) {
        state.messages.push({
          role: 'assistant',
          content: result.response,
        })
        console.log('\n')
      }

      // Check if we should suggest finalization
      if (result.suggestFinalize) {
        // Deactivate keypress before confirm prompt
        keypress.deactivate()

        const finalize = await p.confirm({
          message: 'PRD is looking comprehensive. Would you like to finalize it?',
          initialValue: true,
        })

        if (!p.isCancel(finalize) && finalize) {
          await handleFinalization(state)
          return
        }
      } else if (result.offerFinalize) {
        p.log.info('Tip: Type "done" when you\'re ready to finalize the PRD.')
      }
    }
  } finally {
    // Cleanup on exit
    keypress.deactivate()
    collapsible.cleanup()
  }
}

/**
 * Handle PRD finalization.
 */
async function handleFinalization(state: ConversationalState): Promise<void> {
  const { projectRoot, prdSlug, tracker } = state

  // Check for unresolved conflicts
  const conflicts = tracker.getUnresolvedConflicts()
  if (conflicts.length > 0) {
    p.log.warn(`There are ${conflicts.length} unresolved conflict(s) that must be resolved first.`)
    for (const conflict of conflicts) {
      console.log(`\n  ⚠️  ${conflict.description}`)
      console.log(`     Earlier: "${conflict.earlierStatement}"`)
      console.log(`     Now: "${conflict.laterStatement}"`)

      const resolution = await p.text({
        message: 'How should this be resolved?',
        placeholder: 'Describe the resolution...',
      })

      if (p.isCancel(resolution)) {
        p.log.info('Finalization cancelled. Progress saved.')
        return
      }

      tracker.resolveConflict(conflict.id, resolution)
    }
  }

  // Show final progress
  const progress = tracker.getProgress()
  console.log('\n')
  p.log.info('Final PRD status:')
  console.log(`  ${formatProgressBar(progress.overallPercent)}`)
  console.log(`  ${progress.completeSections}/${progress.totalSections} sections complete`)
  console.log('\n')

  // Run review
  p.log.step('Running PRD review...')
  const prdContent = await readPRDFile(projectRoot, prdSlug)

  const reviewSpinner = p.spinner()
  reviewSpinner.start('Analyzing PRD...')

  const reviewResult = await reviewPRD(prdContent)
  reviewSpinner.stop('Review complete')

  console.log('\n')
  console.log(formatReviewResult(reviewResult))
  console.log('\n')

  if (isReadyForFinalization(reviewResult)) {
    p.log.success('PRD finalized! Ready for execution.')
  } else {
    p.log.warn('Some issues were found. Consider addressing them before execution.')
  }
}

// =============================================================================
// Section Helpers
// =============================================================================

/**
 * Get section number from section ID.
 */
function getSectionNumber(sectionId: string): number | null {
  const map: Record<string, number> = {
    'executive-summary': 1,
    'problem-context': 2,
    'goals-metrics': 3,
    requirements: 4,
    'ux-notes': 5,
    'dependencies-risks': 6,
    rollout: 7,
    milestones: 8,
    'open-questions': 9,
    'checkpoint-learnings': 10,
    'agent-boundaries': 11,
  }
  return map[sectionId] ?? null
}

/**
 * Get section title from section ID.
 */
function getSectionTitle(sectionId: string): string {
  const map: Record<string, string> = {
    'executive-summary': 'Executive Summary',
    'problem-context': 'Problem & Context',
    'goals-metrics': 'Goals & Metrics',
    requirements: 'Requirements',
    'ux-notes': 'UX Notes',
    'dependencies-risks': 'Dependencies & Risks',
    rollout: 'Rollout',
    milestones: 'Milestones',
    'open-questions': 'Open Questions',
    'checkpoint-learnings': 'Checkpoint Learnings',
    'agent-boundaries': 'Agent Boundaries',
  }
  return map[sectionId] ?? sectionId
}
