/**
 * KARIMO Interview Types
 *
 * Type definitions for the PRD interview system.
 */
import type { KarimoConfig } from '../config/schema'

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
	}
}
