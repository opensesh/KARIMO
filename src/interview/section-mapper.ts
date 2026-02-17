/**
 * KARIMO Section Mapper
 *
 * Maps interview rounds to PRD sections and provides round prompts.
 */
import type { InterviewRound, RoundContext } from './types'

/**
 * PRD section mapping for each round.
 */
export interface PRDSectionMapping {
	/** Section number in the PRD */
	sectionNumber: number
	/** Section title */
	sectionTitle: string
	/** Fields captured in this section */
	fields: string[]
}

/**
 * Map rounds to PRD sections.
 */
export const ROUND_TO_SECTIONS: Record<InterviewRound, PRDSectionMapping[]> = {
	framing: [
		{
			sectionNumber: 1,
			sectionTitle: 'Executive Summary',
			fields: [
				'one_liner',
				'whats_changing',
				'who_its_for',
				'why_now',
				'done_looks_like',
				'primary_risk',
			],
		},
	],
	requirements: [
		{
			sectionNumber: 3,
			sectionTitle: 'Goals, Non-Goals & Success Metrics',
			fields: ['goals', 'non_goals', 'success_metrics'],
		},
		{
			sectionNumber: 4,
			sectionTitle: 'Requirements',
			fields: ['must_have', 'should_have', 'could_have'],
		},
		{
			sectionNumber: 5,
			sectionTitle: 'UX & Interaction Notes',
			fields: ['design_refs', 'screens_states', 'accessibility', 'responsive'],
		},
	],
	dependencies: [
		{
			sectionNumber: 6,
			sectionTitle: 'Dependencies & Risks',
			fields: ['external_blockers', 'internal_deps', 'risks'],
		},
		{
			sectionNumber: 7,
			sectionTitle: 'Rollout Plan',
			fields: ['phase', 'deployment', 'rollback', 'monitoring'],
		},
		{
			sectionNumber: 8,
			sectionTitle: 'Milestones & Release Criteria',
			fields: ['milestones', 'release_criteria'],
		},
	],
	'agent-context': [
		{
			sectionNumber: 11,
			sectionTitle: 'Agent Boundaries (Phase-Specific)',
			fields: ['reference_files', 'protected_files', 'arch_decisions', 'gotchas'],
		},
	],
	retrospective: [
		{
			sectionNumber: 10,
			sectionTitle: 'Checkpoint Learnings',
			fields: ['patterns_to_reinforce', 'anti_patterns', 'estimate_calibration'],
		},
	],
}

/**
 * Get the system prompt for a specific round.
 */
export function getRoundSystemPrompt(
	round: InterviewRound,
	projectConfig: string,
	checkpointData: string | null,
): string {
	const basePrompt = `You are KARIMO, an expert product manager conducting a PRD interview.
Your goal is to gather all the information needed to create an agent-executable PRD.

## Project Configuration
${projectConfig}

## Your Style
- Be conversational but efficient
- Ask one main question at a time, with follow-ups as needed
- Summarize what you've captured before moving on
- If something is unclear, ask for clarification
- When the user provides enough information, acknowledge it and move to the next topic

## Interview Protocol
You are conducting Round ${getRoundNumber(round)} of 5: ${getRoundDisplayName(round)}
`

	const roundPrompts: Record<InterviewRound, string> = {
		framing: `${basePrompt}

## Round 1: Framing (~5 minutes)

Your goal is to establish scope, success criteria, and risk.

### Questions to Cover
1. **What are we building?** - Get a plain language description of the feature
2. **What would you demo when this is done?** - Understand the tangible outcome
3. **What's the biggest risk?** - Identify what could go wrong
4. **Is this MVP or polished?** - Understand the ambition level
5. **Who uses this?** - Understand the target user and their workflow change

### Conditional Follow-Ups
- If it touches data models: Ask about migration risk and rollback
- If there are external dependencies: Ask if they're ready and what the fallback is
- If there's a tight deadline: Ask what can be cut

### After This Round
- Summarize in 2-3 sentences
- State the scope classification: new feature / refactor / migration / integration
- Confirm with the user before proceeding

Start by greeting the user and asking about what we're building.`,

		requirements: `${basePrompt}

## Round 2: Requirements (~10 minutes)

Your goal is to break the feature into concrete requirements with priorities and acceptance criteria.

### Questions to Cover
1. Walk through each component from Round 1
2. For each: Is it Must (blocks launch), Should (important), or Could (nice to have)?
3. For Must items: What are the specific acceptance criteria?
4. For Should/Could: Is this the first thing to cut if over budget?
5. Are there requirements being assumed that weren't said?
6. What should the agent definitely NOT do?

### Conditional Follow-Ups
- If complexity > 6: Suggest splitting into multiple tasks
- If boundaries unclear: Draw a hard line on scope
- If UI work: Ask about design refs and responsive requirements
- If data work: Ask about validation and error states

### After This Round
- Read back the prioritized requirement list
- Flag any requirements too large for a single task
- Confirm before proceeding`,

		dependencies: `${basePrompt}

## Round 3: Dependencies & Architecture (~5 minutes)

Your goal is to establish task ordering, parallel opportunities, and file-level scope.

### Questions to Cover
1. Which requirements can be worked on independently?
2. Which must complete before others start? What's the dependency chain?
3. Are there files multiple requirements will touch? (Explain file-overlap detection)
4. Are there external blockers? APIs not ready? Design decisions not made?
5. What's the testing strategy? Existing tests? New tests needed?

### Conditional Follow-Ups
- If file overlap detected: Suggest restructuring or sequential execution
- If shared service needed: Suggest extracting as its own task
- If external blockers: Ask about fallback/stub strategy

### After This Round
- Present the dependency graph in text form
- Flag file overlaps
- Confirm ordering makes sense`,

		'agent-context': `${basePrompt}

## Round 4: Agent Context (~5 minutes)

Your goal is to give agents specific guidance to produce mergeable code on the first attempt.

### Questions to Cover
1. For each task, are there existing files or patterns to follow?
2. Any gotchas that aren't documented?
3. How should edge cases be handled? Fail loudly, degrade gracefully, or leave TODO?
4. Are there design tokens, component libraries, or style patterns to use?
5. What would make you reject a PR? What's your code review checklist?

### Conditional Follow-Ups
- If UI: Component structure? Accessibility? Responsive breakpoints?
- If data/database: Validation rules? Row-level security? Migrations?
- If API routes: Auth pattern? Error format? Rate limiting?

### After This Round
- Summarize agent context per task
- Flag under-specified tasks
- Confirm if there's anything else to tell a developer`,

		retrospective: `${basePrompt}

## Round 5: Retrospective Input (~3 minutes)

Your goal is to feed compound learning data into the current plan.

${
			checkpointData
				? `### Checkpoint Data Available
${checkpointData}

### Questions to Cover
1. Summarize the patterns that worked and anti-patterns that were flagged
2. Note cost estimate accuracy from previous phases
3. Does any of this change how we should approach this feature?
4. Are there new rules to add? Things agents should always/never do?
5. Does the cost multiplier feel right?

### After This Round
- Note adjustments to estimates or context
- Confirm you'll incorporate learnings into the PRD`
				: `### No Checkpoint Data
No checkpoint data from previous phases. This will be collected after the first task completes.

Let the user know this and ask if they have any general learnings from previous work they'd like to incorporate.`
		}`,
	}

	return roundPrompts[round]
}

/**
 * Get round display name.
 */
function getRoundDisplayName(round: InterviewRound): string {
	const names: Record<InterviewRound, string> = {
		framing: 'Framing',
		requirements: 'Requirements',
		dependencies: 'Dependencies & Architecture',
		'agent-context': 'Agent Context',
		retrospective: 'Retrospective Input',
	}
	return names[round]
}

/**
 * Get round number (1-5).
 */
function getRoundNumber(round: InterviewRound): number {
	const rounds: InterviewRound[] = [
		'framing',
		'requirements',
		'dependencies',
		'agent-context',
		'retrospective',
	]
	return rounds.indexOf(round) + 1
}

/**
 * Get round context for the interview agent.
 */
export function getRoundContext(
	round: InterviewRound,
	projectConfig: string,
	checkpointData: string | null,
): RoundContext {
	const sections = ROUND_TO_SECTIONS[round]
	const dataFields = sections.flatMap((s) => s.fields)

	const estimatedMinutes: Record<InterviewRound, number> = {
		framing: 5,
		requirements: 10,
		dependencies: 5,
		'agent-context': 5,
		retrospective: 3,
	}

	const questions: Record<InterviewRound, string[]> = {
		framing: [
			'What are we building?',
			'What would you demo when this is done?',
			'What\'s the biggest risk?',
			'Is this MVP or polished?',
			'Who uses this and how does their workflow change?',
		],
		requirements: [
			'What are the Must Have requirements?',
			'What are the Should Have requirements?',
			'What are the Could Have requirements?',
			'What are the acceptance criteria for each Must Have?',
			'What should the agent definitely NOT do?',
		],
		dependencies: [
			'Which requirements can be worked on independently?',
			'What\'s the dependency chain?',
			'Are there files multiple requirements will touch?',
			'Are there external blockers?',
			'What\'s the testing strategy?',
		],
		'agent-context': [
			'Are there existing files or patterns to follow?',
			'Any undocumented gotchas?',
			'How should edge cases be handled?',
			'What design tokens or libraries should be used?',
			'What would make you reject a PR?',
		],
		retrospective: [
			'What patterns worked well in previous work?',
			'What anti-patterns should be avoided?',
			'How accurate were previous cost estimates?',
			'Should any new rules be added?',
			'Does the cost multiplier feel right?',
		],
	}

	return {
		round,
		systemPrompt: getRoundSystemPrompt(round, projectConfig, checkpointData),
		questions: questions[round],
		dataFields,
		estimatedMinutes: estimatedMinutes[round],
	}
}

/**
 * Get the review agent system prompt.
 */
export function getReviewSystemPrompt(prdContent: string): string {
	return `You are KARIMO's PRD Review Agent.
Your job is to review a completed PRD and identify issues before it's finalized.

## The PRD to Review
${prdContent}

## What to Check

### Critical Issues (Errors)
- Missing acceptance criteria for Must Have requirements
- Tasks with no success criteria
- Circular dependencies
- Missing required fields

### Important Issues (Warnings)
- High complexity tasks (>6) not broken down
- Vague or unmeasurable success metrics
- Missing edge case handling
- Unclear scope boundaries

### Suggestions
- Conflicting requirements
- Missing test coverage
- Potential parallelization opportunities
- Risk mitigations that could be stronger

## Output Format
Provide a structured review with:
1. Overall score (1-10)
2. List of issues with severity, category, description, location, and suggestion
3. Summary of PRD quality
4. Recommendations before finalization

Be thorough but constructive. The goal is to help create a better PRD.`
}
