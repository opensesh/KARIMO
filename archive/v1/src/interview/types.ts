/**
 * KARIMO Interview Types
 *
 * Type definitions for the PRD interview system.
 */
import type { KarimoConfig } from '../config/schema'
import type { SubagentHistoryEntry, SubagentTokenUsage } from './subagents/types'

/**
 * Interview round identifiers.
 * Maps to the 5 rounds from INTERVIEW_PROTOCOL.md
 */
export type InterviewRound =
  | 'framing' // Round 1: ~5 min
  | 'requirements' // Round 2: ~10 min
  | 'dependencies' // Round 3: ~5 min
  | 'agent-context' // Round 4: ~5 min
  | 'retrospective' // Round 5: ~3 min

/**
 * Interview status.
 */
export type InterviewStatus =
  | 'not-started'
  | 'in-progress'
  | 'reviewing'
  | 'finalized'
  | 'cancelled'

/**
 * A single message in the conversation.
 */
export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

/**
 * Conversation summary for context management.
 * Generated when context window is near capacity.
 */
export interface ConversationSummary {
  /** Summary text covering the conversation so far */
  summary: string
  /** Round that was active when summary was created */
  round: InterviewRound
  /** Number of messages summarized */
  messageCount: number
  /** Timestamp of summary creation */
  timestamp: string
}

/**
 * Interview session state.
 * Persisted to enable resume across terminal sessions.
 */
export interface InterviewSession {
  /** Unique session ID */
  id: string

  /** PRD slug being created */
  prdSlug: string

  /** Path to PRD file */
  prdPath: string

  /** Current interview status */
  status: InterviewStatus

  /** Current round */
  currentRound: InterviewRound

  /** Completed rounds */
  completedRounds: InterviewRound[]

  /** Conversation history (truncated on context overflow) */
  messages: ConversationMessage[]

  /** Conversation summaries (created on context overflow) */
  summaries: ConversationSummary[]

  /** Estimated token count for current context */
  estimatedTokens: number

  /** Session started at */
  startedAt: string

  /** Session last updated at */
  updatedAt: string

  /** Subagent execution history */
  subagentHistory: SubagentHistoryEntry[]

  /** Aggregated subagent token usage */
  subagentUsage: SubagentTokenUsage
}

/**
 * Round-specific context provided to the interview agent.
 */
export interface RoundContext {
  /** Round identifier */
  round: InterviewRound

  /** System prompt for this round */
  systemPrompt: string

  /** Questions to ask in this round */
  questions: string[]

  /** Data fields to capture in this round */
  dataFields: string[]

  /** Estimated duration in minutes */
  estimatedMinutes: number
}

/**
 * Interview configuration loaded from project.
 */
export interface InterviewConfig {
  /** Project root directory */
  projectRoot: string

  /** Loaded KARIMO config */
  config: KarimoConfig

  /** Whether checkpoint data exists */
  hasCheckpoints: boolean

  /** Context documents to include */
  contextDocs: string[]
}

/**
 * Investigation result from codebase scanning.
 */
export interface InvestigationResult {
  /** Query that was investigated */
  query: string

  /** Files found */
  files: string[]

  /** Relevant code snippets */
  snippets: {
    file: string
    content: string
    startLine: number
    endLine: number
  }[]

  /** Summary of findings */
  summary: string
}

/**
 * Review issue found by the review agent.
 */
export interface ReviewIssue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'suggestion'

  /** Issue category */
  category:
    | 'missing-acceptance-criteria'
    | 'high-complexity-not-split'
    | 'conflicting-requirements'
    | 'missing-edge-cases'
    | 'unclear-scope'
    | 'other'

  /** Issue description */
  description: string

  /** Affected section or task */
  location: string

  /** Suggested fix */
  suggestion?: string
}

/**
 * Review result from the review agent.
 */
export interface ReviewResult {
  /** Overall PRD quality score (1-10) */
  score: number

  /** Issues found */
  issues: ReviewIssue[]

  /** Overall summary */
  summary: string

  /** Recommended actions before finalization */
  recommendations: string[]
}

/**
 * PRD section data captured during interview.
 */
export interface PRDSectionData {
  /** Executive summary fields */
  executiveSummary?: {
    oneLiner?: string
    whatsChanging?: string
    whoItsFor?: string
    whyNow?: string
    doneLooksLike?: string
    primaryRisk?: string
  }

  /** Problem and context */
  problemContext?: {
    problemStatement?: string
    supportingData?: string
    costOfInaction?: string
    strategicFit?: string
  }

  /** Goals, non-goals, success metrics */
  goals?: {
    goals: string[]
    nonGoals: string[]
    successMetrics: {
      metric: string
      baseline: string
      target: string
      howMeasured: string
    }[]
  }

  /** Requirements */
  requirements?: {
    must: {
      id: string
      description: string
      acceptanceCriteria: string
    }[]
    should: {
      id: string
      description: string
      acceptanceCriteria: string
    }[]
    could: {
      id: string
      description: string
      acceptanceCriteria: string
    }[]
  }

  /** Dependencies and risks */
  dependencies?: {
    externalBlockers: {
      blocker: string
      status: string
      fallback: string
    }[]
    internalDependencies: string[]
    risks: {
      risk: string
      likelihood: string
      impact: string
      mitigation: string
    }[]
  }

  /** Agent context per task */
  agentContext?: {
    referenceFiles: string[]
    protectedFiles: string[]
    architectureDecisions: string[]
    knownGotchas: string[]
  }

  /** Checkpoint learnings */
  checkpointLearnings?: {
    patternsToReinforce: string[]
    antiPatternsToAvoid: string[]
    estimateCalibration: string[]
  }
}

/**
 * Task definition extracted from interview.
 */
export interface InterviewTask {
  id: string
  title: string
  description: string
  dependsOn: string[]
  complexity: number
  priority: 'must' | 'should' | 'could'
  successCriteria: string[]
  filesAffected: string[]
  agentContext?: string
}

// =============================================================================
// Conversational Interview Types (Track B)
// =============================================================================

/**
 * Scope type for the feature being defined.
 */
export type ScopeType = 'new-feature' | 'refactor' | 'migration' | 'integration'

/**
 * Result from the intake agent processing initial context.
 */
export interface IntakeResult {
  /** Suggested PRD title */
  suggestedTitle: string

  /** Suggested slug (URL-safe) */
  suggestedSlug: string

  /** One-line executive summary */
  executiveSummary: string

  /** Type of scope */
  scopeType: ScopeType

  /** Topics identified in user input */
  identifiedTopics: string[]

  /** Gaps that need exploration */
  gapsToExplore: string[]

  /** Initial section content extracted */
  initialSections: Record<string, string>
}

/**
 * Status of a PRD section.
 */
export type SectionStatusValue = 'empty' | 'partial' | 'complete'

/**
 * PRD section status tracking.
 */
export interface SectionStatus {
  /** Section identifier (e.g., "executive-summary") */
  id: string

  /** Human-readable section title */
  title: string

  /** PRD section number (1-11) */
  prdSection: number

  /** Current status */
  status: SectionStatusValue

  /** Confidence score (0-100) */
  confidence: number

  /** Section weight for progress calculation (percentage) */
  weight: number

  /** Last updated timestamp */
  lastUpdated: Date | null
}

/**
 * Type of conflict detected during interview.
 */
export type ConflictType = 'user-vs-user' | 'user-vs-codebase' | 'user-vs-prd'

/**
 * Resolution status for conflicts.
 */
export type ConflictResolution = 'unresolved' | 'resolved'

/**
 * Record of a detected conflict.
 */
export interface ConflictRecord {
  /** Unique conflict ID */
  id: string

  /** Type of conflict */
  type: ConflictType

  /** Description of the conflict */
  description: string

  /** Section affected by this conflict */
  sectionAffected: string

  /** Earlier statement that conflicts */
  earlierStatement: string

  /** Later statement that conflicts */
  laterStatement: string

  /** Resolution status */
  resolution: ConflictResolution

  /** How the conflict was resolved (if resolved) */
  resolvedAs?: string

  /** When the conflict was detected */
  detectedAt: Date
}

/**
 * Overall PRD progress tracking.
 */
export interface PRDProgress {
  /** Status of each section */
  sections: SectionStatus[]

  /** Overall completion percentage (0-100) */
  overallPercent: number

  /** Number of complete sections */
  completeSections: number

  /** Total number of sections */
  totalSections: number

  /** Suggested topics to explore next */
  suggestedNextTopics: string[]

  /** Active conflicts that need resolution */
  conflicts: ConflictRecord[]
}

/**
 * Section weights for progress calculation.
 * Weights must sum to 100.
 */
export const SECTION_WEIGHTS: Record<string, number> = {
  'executive-summary': 15,
  'problem-context': 10,
  'goals-metrics': 15,
  requirements: 20,
  'ux-notes': 10,
  'dependencies-risks': 10,
  rollout: 5,
  milestones: 5,
  'open-questions': 0, // Doesn't count toward completion
  'checkpoint-learnings': 5,
  'agent-boundaries': 5,
}

/**
 * PRD section definitions with metadata.
 */
export const PRD_SECTIONS: SectionStatus[] = [
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    prdSection: 1,
    status: 'empty',
    confidence: 0,
    weight: 15,
    lastUpdated: null,
  },
  {
    id: 'problem-context',
    title: 'Problem & Context',
    prdSection: 2,
    status: 'empty',
    confidence: 0,
    weight: 10,
    lastUpdated: null,
  },
  {
    id: 'goals-metrics',
    title: 'Goals & Metrics',
    prdSection: 3,
    status: 'empty',
    confidence: 0,
    weight: 15,
    lastUpdated: null,
  },
  {
    id: 'requirements',
    title: 'Requirements',
    prdSection: 4,
    status: 'empty',
    confidence: 0,
    weight: 20,
    lastUpdated: null,
  },
  {
    id: 'ux-notes',
    title: 'UX Notes',
    prdSection: 5,
    status: 'empty',
    confidence: 0,
    weight: 10,
    lastUpdated: null,
  },
  {
    id: 'dependencies-risks',
    title: 'Dependencies & Risks',
    prdSection: 6,
    status: 'empty',
    confidence: 0,
    weight: 10,
    lastUpdated: null,
  },
  {
    id: 'rollout',
    title: 'Rollout',
    prdSection: 7,
    status: 'empty',
    confidence: 0,
    weight: 5,
    lastUpdated: null,
  },
  {
    id: 'milestones',
    title: 'Milestones',
    prdSection: 8,
    status: 'empty',
    confidence: 0,
    weight: 5,
    lastUpdated: null,
  },
  {
    id: 'open-questions',
    title: 'Open Questions',
    prdSection: 9,
    status: 'empty',
    confidence: 0,
    weight: 0,
    lastUpdated: null,
  },
  {
    id: 'checkpoint-learnings',
    title: 'Checkpoint Learnings',
    prdSection: 10,
    status: 'empty',
    confidence: 0,
    weight: 5,
    lastUpdated: null,
  },
  {
    id: 'agent-boundaries',
    title: 'Agent Boundaries',
    prdSection: 11,
    status: 'empty',
    confidence: 0,
    weight: 5,
    lastUpdated: null,
  },
]

/**
 * Interview mode for the session.
 * - 'conversational': New free-form interview flow
 * - 'legacy': Original 5-round structured interview
 */
export type InterviewMode = 'conversational' | 'legacy'

/**
 * Conversational interview session state.
 * Extends base session with progress tracking and conflicts.
 */
export interface ConversationalSession
  extends Omit<InterviewSession, 'currentRound' | 'completedRounds'> {
  /** Interview mode */
  mode: 'conversational'

  /** PRD progress tracking */
  progress: PRDProgress

  /** Intake result from initial context processing */
  intakeResult: IntakeResult | null
}

/**
 * Default interview session state.
 */
export function createDefaultSession(prdSlug: string, prdPath: string): InterviewSession {
  return {
    id: crypto.randomUUID(),
    prdSlug,
    prdPath,
    status: 'not-started',
    currentRound: 'framing',
    completedRounds: [],
    messages: [],
    summaries: [],
    estimatedTokens: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subagentHistory: [],
    subagentUsage: {
      model: 'claude-sonnet-4-20250514',
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
    },
  }
}
