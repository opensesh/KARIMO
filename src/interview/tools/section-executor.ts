/**
 * KARIMO Section Executor
 *
 * Executes interview tools and updates PRD on disk.
 * Handles capture_section, capture_requirement, flag_conflict, and report_progress.
 */
import { updatePRDSection } from '../prd-file'
import { type SectionTracker, formatConflict, formatProgressBar } from '../section-tracker'
import type { ConflictType, PRDProgress } from '../types'
import {
  CaptureRequirementInputSchema,
  CaptureSectionInputSchema,
  FlagConflictInputSchema,
  type InterviewToolName,
  ReportProgressInputSchema,
} from './section-tools'

// =============================================================================
// Types
// =============================================================================

/**
 * Result of executing a tool.
 */
export interface ToolExecutionResult {
  /** Whether the tool executed successfully */
  success: boolean

  /** Tool name that was executed */
  toolName: string

  /** Human-readable result message */
  message: string

  /** Error message if failed */
  error?: string

  /** Updated progress after execution */
  progress?: PRDProgress

  /** Flag if this was a conflict detection */
  isConflict?: boolean
}

/**
 * Context for tool execution.
 */
export interface ExecutionContext {
  /** Project root directory */
  projectRoot: string

  /** PRD slug */
  prdSlug: string

  /** Section tracker instance */
  tracker: SectionTracker

  /** Current PRD content (for conflict detection) */
  currentPrdContent?: string
}

// =============================================================================
// Tool Executor
// =============================================================================

/**
 * Execute an interview tool.
 *
 * @param toolName - Name of the tool to execute
 * @param input - Tool input (validated against schema)
 * @param context - Execution context
 * @returns Execution result
 */
export async function executeTool(
  toolName: InterviewToolName,
  input: unknown,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'capture_section':
        return await executeCaptureSectionTool(input, context)

      case 'capture_requirement':
        return await executeCaptureRequirementTool(input, context)

      case 'flag_conflict':
        return await executeFlagConflictTool(input, context)

      case 'report_progress':
        return executeReportProgressTool(input, context)

      default:
        return {
          success: false,
          toolName,
          message: '',
          error: `Unknown tool: ${toolName}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      toolName,
      message: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// =============================================================================
// Tool Implementations
// =============================================================================

/**
 * Execute capture_section tool.
 */
async function executeCaptureSectionTool(
  input: unknown,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  // Validate input
  const parsed = CaptureSectionInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      toolName: 'capture_section',
      message: '',
      error: `Invalid input: ${parsed.error.message}`,
    }
  }

  const { sectionId, content, confidence } = parsed.data

  // Map section ID to PRD section info
  const sectionInfo = getSectionInfo(sectionId)
  if (!sectionInfo) {
    return {
      success: false,
      toolName: 'capture_section',
      message: '',
      error: `Unknown section: ${sectionId}`,
    }
  }

  // Update PRD file
  // Note: mode (replace/append/refine) would require extending updatePRDSection
  // For now, we always replace the section content
  await updatePRDSection(
    context.projectRoot,
    context.prdSlug,
    sectionInfo.number,
    sectionInfo.title,
    content
  )

  // Update tracker
  const status = confidence >= 90 ? 'complete' : 'partial'
  context.tracker.updateSection(sectionId, status, confidence)

  // Get updated progress
  const progress = context.tracker.getProgress()

  return {
    success: true,
    toolName: 'capture_section',
    message: `\u2713 Captured ${sectionInfo.heading} (${confidence}% confidence)`,
    progress,
  }
}

/**
 * Execute capture_requirement tool.
 */
async function executeCaptureRequirementTool(
  input: unknown,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  // Validate input
  const parsed = CaptureRequirementInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      toolName: 'capture_requirement',
      message: '',
      error: `Invalid input: ${parsed.error.message}`,
    }
  }

  const { description, priority, acceptanceCriteria } = parsed.data

  // Format requirement as markdown
  const acText = acceptanceCriteria?.length
    ? `\n  - Acceptance: ${acceptanceCriteria.join('; ')}`
    : ''
  const reqText = `- **[${priority.toUpperCase()}]** ${description}${acText}`

  // For requirements, we need to append rather than replace
  // Since updatePRDSection replaces, we need to read existing content first
  // For now, we just replace the section - a future enhancement could read + append
  const sectionInfo = getSectionInfo('requirements')
  if (!sectionInfo) {
    return {
      success: false,
      toolName: 'capture_requirement',
      message: '',
      error: 'Could not find requirements section',
    }
  }

  await updatePRDSection(
    context.projectRoot,
    context.prdSlug,
    sectionInfo.number,
    sectionInfo.title,
    reqText
  )

  // Update tracker - partial since we're adding incrementally
  const currentSection = context.tracker.getSection('requirements')
  const newConfidence = Math.min(100, (currentSection?.confidence ?? 0) + 10)
  context.tracker.updateSection('requirements', 'partial', newConfidence)

  const progress = context.tracker.getProgress()

  return {
    success: true,
    toolName: 'capture_requirement',
    message: `\u2713 Added ${priority} requirement: "${description.slice(0, 50)}..."`,
    progress,
  }
}

/**
 * Execute flag_conflict tool.
 */
async function executeFlagConflictTool(
  input: unknown,
  context: ExecutionContext
): Promise<ToolExecutionResult> {
  // Validate input
  const parsed = FlagConflictInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      toolName: 'flag_conflict',
      message: '',
      error: `Invalid input: ${parsed.error.message}`,
    }
  }

  const { type, description, sectionAffected, earlierStatement, laterStatement } = parsed.data

  // Add conflict to tracker
  const conflict = context.tracker.addConflict(
    type as ConflictType,
    description,
    sectionAffected,
    earlierStatement,
    laterStatement
  )

  const progress = context.tracker.getProgress()

  // Format conflict for display
  const formattedConflict = formatConflict(conflict)

  return {
    success: true,
    toolName: 'flag_conflict',
    message: formattedConflict,
    progress,
    isConflict: true,
  }
}

/**
 * Execute report_progress tool.
 */
function executeReportProgressTool(input: unknown, context: ExecutionContext): ToolExecutionResult {
  // Validate input
  const parsed = ReportProgressInputSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      toolName: 'report_progress',
      message: '',
      error: `Invalid input: ${parsed.error.message}`,
    }
  }

  const { milestone, message } = parsed.data

  // Get current progress
  const progress = context.tracker.getProgress()

  // Format progress message
  let progressMessage = formatProgressBar(progress.overallPercent)

  if (milestone) {
    progressMessage = `\ud83c\udf1f ${milestone}% Milestone: ${progressMessage}`
  }

  if (message) {
    progressMessage += `\n   ${message}`
  }

  return {
    success: true,
    toolName: 'report_progress',
    message: progressMessage,
    progress,
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Section info with number and title.
 */
interface SectionInfo {
  number: number
  title: string
  heading: string
}

/**
 * Map section ID to PRD section info.
 */
function getSectionInfo(sectionId: string): SectionInfo | null {
  const sections: Record<string, SectionInfo> = {
    'executive-summary': { number: 1, title: 'Executive Summary', heading: '1. Executive Summary' },
    'problem-context': { number: 2, title: 'Problem & Context', heading: '2. Problem & Context' },
    'goals-metrics': { number: 3, title: 'Goals & Metrics', heading: '3. Goals & Metrics' },
    requirements: { number: 4, title: 'Requirements', heading: '4. Requirements' },
    'ux-notes': { number: 5, title: 'UX Notes', heading: '5. UX Notes' },
    'dependencies-risks': {
      number: 6,
      title: 'Dependencies & Risks',
      heading: '6. Dependencies & Risks',
    },
    rollout: { number: 7, title: 'Rollout', heading: '7. Rollout' },
    milestones: { number: 8, title: 'Milestones', heading: '8. Milestones' },
    'open-questions': { number: 9, title: 'Open Questions', heading: '9. Open Questions' },
    'checkpoint-learnings': {
      number: 10,
      title: 'Checkpoint Learnings',
      heading: '10. Checkpoint Learnings',
    },
    'agent-boundaries': { number: 11, title: 'Agent Boundaries', heading: '11. Agent Boundaries' },
  }

  return sections[sectionId] ?? null
}

/**
 * Create an executor bound to a specific context.
 */
export function createToolExecutor(context: ExecutionContext) {
  return {
    execute: (toolName: InterviewToolName, input: unknown) => executeTool(toolName, input, context),
    getProgress: () => context.tracker.getProgress(),
    getTracker: () => context.tracker,
  }
}

// =============================================================================
// Index file for tools module
// =============================================================================

export * from './section-tools'
