/**
 * KARIMO PRD File Operations
 *
 * Create, read, and update PRD markdown files.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { stringify as stringifyYaml } from 'yaml'
import type { PRDSectionData, InterviewTask } from './types'
import { PRDFileError } from './errors'

const PRDS_DIR = '.karimo/prds'
const TEMPLATE_PATH = 'templates/PRD_TEMPLATE.md'

/**
 * PRD metadata for frontmatter.
 */
export interface PRDFrontmatter {
	feature_name: string
	feature_slug: string
	owner: string
	status: 'draft' | 'active' | 'complete'
	created_date: string
	target_date?: string
	phase?: string
	scope_type?: string
	github_project?: string
	links?: string[]
	checkpoint_refs?: string[]
}

/**
 * Get the PRDs directory path.
 */
export function getPRDsDir(projectRoot: string): string {
	return join(projectRoot, PRDS_DIR)
}

/**
 * Get the path for a PRD file by slug.
 */
export function getPRDPath(projectRoot: string, slug: string): string {
	return join(getPRDsDir(projectRoot), `${slug}.md`)
}

/**
 * Check if PRDs directory exists.
 */
export function prdsDirExists(projectRoot: string): boolean {
	return existsSync(getPRDsDir(projectRoot))
}

/**
 * Ensure PRDs directory exists.
 */
export function ensurePRDsDir(projectRoot: string): void {
	const prdsDir = getPRDsDir(projectRoot)
	if (!existsSync(prdsDir)) {
		mkdirSync(prdsDir, { recursive: true })
	}
}

/**
 * Generate a PRD slug from feature name.
 * Format: "NNN_slug-name"
 */
export function generatePRDSlug(number: string, featureName: string): string {
	const slug = featureName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 50)

	return `${number}_${slug}`
}

/**
 * Create initial PRD file from template.
 */
export async function createPRDFile(
	projectRoot: string,
	slug: string,
	frontmatter: PRDFrontmatter,
): Promise<string> {
	ensurePRDsDir(projectRoot)

	const prdPath = getPRDPath(projectRoot, slug)

	if (existsSync(prdPath)) {
		throw new PRDFileError(prdPath, 'create', 'File already exists')
	}

	// Read template
	const templatePath = join(projectRoot, TEMPLATE_PATH)
	let template: string

	if (existsSync(templatePath)) {
		template = readFileSync(templatePath, 'utf-8')
	} else {
		// Use minimal template if project template not found
		template = getMinimalTemplate()
	}

	// Build frontmatter YAML
	const frontmatterYaml = stringifyYaml(frontmatter, {
		indent: 2,
		lineWidth: 100,
	}).trim()

	// Replace template frontmatter with actual frontmatter
	const content = template.replace(
		/```yaml\n# =+\n# PRD METADATA[\s\S]*?---\n```/,
		`\`\`\`yaml\n---\n${frontmatterYaml}\n---\n\`\`\``,
	)

	try {
		await Bun.write(prdPath, content)
		return prdPath
	} catch (error) {
		throw new PRDFileError(prdPath, 'create', (error as Error).message)
	}
}

/**
 * Read PRD file content.
 */
export async function readPRDFile(projectRoot: string, slug: string): Promise<string> {
	const prdPath = getPRDPath(projectRoot, slug)

	if (!existsSync(prdPath)) {
		throw new PRDFileError(prdPath, 'read', 'File not found')
	}

	try {
		return await Bun.file(prdPath).text()
	} catch (error) {
		throw new PRDFileError(prdPath, 'read', (error as Error).message)
	}
}

/**
 * Update a specific section in the PRD file.
 */
export async function updatePRDSection(
	projectRoot: string,
	slug: string,
	sectionNumber: number,
	sectionTitle: string,
	content: string,
): Promise<void> {
	const prdPath = getPRDPath(projectRoot, slug)
	let currentContent: string

	try {
		currentContent = await readPRDFile(projectRoot, slug)
	} catch (error) {
		throw new PRDFileError(prdPath, 'update', (error as Error).message)
	}

	// Build section header pattern
	const sectionPattern = new RegExp(
		`(## ${sectionNumber}\\. ${sectionTitle}[\\s\\S]*?)(?=## \\d+\\.|$)`,
		'g',
	)

	// Replace section content
	const newContent = currentContent.replace(
		sectionPattern,
		`## ${sectionNumber}. ${sectionTitle}\n\n${content}\n\n`,
	)

	try {
		await Bun.write(prdPath, newContent)
	} catch (error) {
		throw new PRDFileError(prdPath, 'update', (error as Error).message)
	}
}

/**
 * Update the frontmatter status.
 */
export async function updatePRDStatus(
	projectRoot: string,
	slug: string,
	status: 'draft' | 'active' | 'complete',
): Promise<void> {
	const prdPath = getPRDPath(projectRoot, slug)
	let content: string

	try {
		content = await readPRDFile(projectRoot, slug)
	} catch (error) {
		throw new PRDFileError(prdPath, 'update', (error as Error).message)
	}

	// Update status in frontmatter
	const newContent = content.replace(
		/status:\s*["']?(?:draft|active|complete)["']?/,
		`status: "${status}"`,
	)

	try {
		await Bun.write(prdPath, newContent)
	} catch (error) {
		throw new PRDFileError(prdPath, 'update', (error as Error).message)
	}
}

/**
 * Append tasks to the PRD file.
 */
export async function appendTasks(
	projectRoot: string,
	slug: string,
	tasks: InterviewTask[],
	config: { cost_multiplier: number; base_iterations: number; iteration_multiplier: number; revision_budget_percent: number },
): Promise<void> {
	const prdPath = getPRDPath(projectRoot, slug)
	let content: string

	try {
		content = await readPRDFile(projectRoot, slug)
	} catch (error) {
		throw new PRDFileError(prdPath, 'update', (error as Error).message)
	}

	// Build tasks YAML
	const tasksYaml = tasks.map((task) => {
		const costCeiling = task.complexity * config.cost_multiplier
		const estimatedIterations = config.base_iterations + (task.complexity * config.iteration_multiplier)
		const revisionBudget = costCeiling * (config.revision_budget_percent / 100)

		return {
			id: task.id,
			title: task.title,
			description: task.description,
			depends_on: task.dependsOn,
			complexity: task.complexity,
			estimated_iterations: estimatedIterations,
			cost_ceiling: costCeiling,
			revision_budget: revisionBudget,
			priority: task.priority,
			assigned_to: '',
			success_criteria: task.successCriteria,
			files_affected: task.filesAffected,
			agent_context: task.agentContext ?? '',
		}
	})

	const tasksYamlStr = stringifyYaml({ tasks: tasksYaml }, {
		indent: 2,
		lineWidth: 100,
	})

	// Find tasks section and replace/append
	const tasksSection = `## Agent Tasks

\`\`\`yaml
# ============================================================
# AGENT TASKS
# This section is parsed by the KARIMO orchestrator.
# Each task becomes a GitHub Issue with custom fields.
# ============================================================

${tasksYamlStr}
\`\`\``

	// Check if tasks section exists
	if (content.includes('## Agent Tasks')) {
		// Replace existing tasks section
		const newContent = content.replace(
			/## Agent Tasks[\s\S]*?```yaml[\s\S]*?```/,
			tasksSection,
		)
		try {
			await Bun.write(prdPath, newContent)
		} catch (error) {
			throw new PRDFileError(prdPath, 'update', (error as Error).message)
		}
	} else {
		// Append tasks section
		const newContent = `${content.trim()}\n\n---\n\n${tasksSection}\n`
		try {
			await Bun.write(prdPath, newContent)
		} catch (error) {
			throw new PRDFileError(prdPath, 'update', (error as Error).message)
		}
	}
}

/**
 * Get a minimal PRD template.
 */
function getMinimalTemplate(): string {
	return `# PRD

\`\`\`yaml
---
feature_name: ""
feature_slug: ""
owner: ""
status: "draft"
created_date: ""
---
\`\`\`

---

## 1. Executive Summary

**One-liner:**

**What's changing:**

**Who it's for:**

**Why now:**

**Done looks like:**

**Primary risk:**

---

## 2. Problem & Context

**Problem statement:**

**Supporting data / evidence:**

**What happens if we don't build this:**

**Strategic fit:**

---

## 3. Goals, Non-Goals & Success Metrics

### Goals

1.

### Non-Goals

-

### Success Metrics

| Metric | Baseline | Target | How Measured |
| ------ | -------- | ------ | ------------ |
|        |          |        |              |

---

## 4. Requirements

### Must Have (blocks launch)

| ID | Requirement | Acceptance Criteria |
| -- | ----------- | ------------------- |
|    |             |                     |

### Should Have (important, not blocking)

| ID | Requirement | Acceptance Criteria |
| -- | ----------- | ------------------- |
|    |             |                     |

### Could Have (nice to have, cut first)

| ID | Requirement | Acceptance Criteria |
| -- | ----------- | ------------------- |
|    |             |                     |

---

## 5. UX & Interaction Notes

**Design references:**

**Key screens & states:**

- Empty state:
- Loading state:
- Error state:
- Success state:

---

## 6. Dependencies & Risks

### External Blockers

| Blocker | Status | Fallback |
| ------- | ------ | -------- |
|         |        |          |

### Internal Dependencies

-

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
|      |            |        |            |

---

## 7. Rollout Plan

**Phase/level:**

**Deployment strategy:**

**Rollback plan:**

**Monitoring:**

---

## 8. Milestones & Release Criteria

| Milestone | What's True When Done | Target Date |
| --------- | --------------------- | ----------- |
|           |                       |             |

**Release criteria (what must be true to ship):**

-

---

## 9. Open Questions

| # | Question | Status | Resolution |
| - | -------- | ------ | ---------- |
|   |          |        |            |

---

## 10. Checkpoint Learnings

**Patterns to reinforce (from previous checkpoints):**

-

**Anti-patterns to avoid:**

-

**Estimate calibration notes:**

-

---

## 11. Agent Boundaries (Phase-Specific)

**Files the agent should reference for patterns:**

-

**Files the agent should NOT touch (beyond the global \`never_touch\` list):**

-

**Architecture decisions already made (don't re-decide):**

-

**Known gotchas discovered since the implementation plan:**

-
`
}
