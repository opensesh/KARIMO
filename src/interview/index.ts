/**
 * KARIMO Interview Module
 *
 * PRD interview system with AI-powered conversation.
 */
import * as p from '@clack/prompts'
import { stringify as stringifyYaml } from 'yaml'
import { getNextPRDNumber, loadState, setCurrentPRD } from '../cli/state'
import { loadConfig } from '../config/loader'
import {
  processMessage,
  resumeInterview as resumeInterviewAgent,
  startInterview as startInterviewAgent,
} from './agents/interview-agent'
import { formatReviewResult, isReadyForFinalization, reviewPRD } from './agents/review-agent'
import { InterviewCancelledError } from './errors'
import { type PRDFrontmatter, createPRDFile, generatePRDSlug, readPRDFile } from './prd-file'
import {
  createSession,
  getRoundDisplayName,
  getRoundNumber,
  loadSession,
  saveSession,
  sessionExists,
} from './session'
import type { InterviewSession } from './types'

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
} from './session'

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

  // Start the interview agent
  const result = await startInterviewAgent(session, {
    projectRoot,
    projectConfig: configYaml,
    checkpointData: null, // TODO: Load checkpoint data when available
    prdContent,
    onChunk: (chunk) => process.stdout.write(chunk),
    onRoundComplete: (round) => {
      p.log.success(`Round ${getRoundNumber(round)} complete: ${getRoundDisplayName(round)}`)
    },
  })

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

  // Resume the interview
  const result = await resumeInterviewAgent(session, {
    projectRoot,
    projectConfig: configYaml,
    checkpointData: null,
    prdContent,
    onChunk: (chunk) => process.stdout.write(chunk),
    onRoundComplete: (round) => {
      p.log.success(`Round ${getRoundNumber(round)} complete: ${getRoundDisplayName(round)}`)
    },
  })

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

  while (session.status === 'in-progress') {
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

    // Load PRD content
    const prdContent = await readPRDFile(projectRoot, session.prdSlug)

    // Process message
    const result = await processMessage(session, input, {
      projectRoot,
      projectConfig,
      checkpointData,
      prdContent,
      onChunk: (chunk) => process.stdout.write(chunk),
      onRoundComplete: (round) => {
        console.log('\n')
        p.log.success(`Round ${getRoundNumber(round)} complete: ${getRoundDisplayName(round)}`)
      },
      onSummarization: () => {
        p.log.info('Context summarized to maintain quality.')
      },
    })

    console.log('\n')
    session = result.session

    if (result.allComplete) {
      p.log.success('All interview rounds complete!')
      break
    }
  }

  // Move to review if all rounds complete
  if (session.status === 'reviewing') {
    await runReview(projectRoot, session)
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
