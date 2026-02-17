/**
 * KARIMO State Detector
 *
 * Detects current project phase from .karimo/ directory contents.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { PRDFileInfo, PRDMetadata, PRDSection, ProjectPhase } from './types'
import { PRDMetadataSchema } from './schema'
import { PRDMetadataError } from './errors'
import { karimoDirExists, loadState } from './loader'

const CONFIG_FILE = 'config.yaml'
const PRDS_DIR = 'prds'

/**
 * Check if config.yaml exists in .karimo directory.
 */
export function configExists(projectRoot: string): boolean {
	return existsSync(join(projectRoot, '.karimo', CONFIG_FILE))
}

/**
 * Check if prds directory exists in .karimo directory.
 */
export function prdsDirExists(projectRoot: string): boolean {
	return existsSync(join(projectRoot, '.karimo', PRDS_DIR))
}

/**
 * List all PRD files in .karimo/prds directory.
 */
export function listPRDFiles(projectRoot: string): string[] {
	const prdsPath = join(projectRoot, '.karimo', PRDS_DIR)

	if (!existsSync(prdsPath)) {
		return []
	}

	const entries = readdirSync(prdsPath)
	return entries
		.filter((entry) => entry.endsWith('.md'))
		.map((entry) => join(prdsPath, entry))
		.filter((path) => statSync(path).isFile())
		.sort()
}

/**
 * Extract PRD slug from filename.
 * Format: "NNN_slug.md" -> "NNN_slug"
 */
export function extractPRDSlug(path: string): string {
	const filename = basename(path)
	return filename.replace(/\.md$/, '')
}

/**
 * Extract YAML frontmatter from PRD markdown.
 */
function extractFrontmatter(content: string): string | null {
	const match = content.match(/^---\n([\s\S]*?)\n---/)
	return match ? match[1] : null
}

/**
 * Parse PRD metadata from frontmatter.
 */
export function parsePRDMetadata(content: string, path: string): PRDMetadata | null {
	const frontmatter = extractFrontmatter(content)

	if (!frontmatter) {
		return null
	}

	try {
		const yaml = parseYaml(frontmatter) as unknown
		const result = PRDMetadataSchema.safeParse(yaml)

		if (!result.success) {
			// Log warning but don't throw - allow partial metadata
			console.warn(`Warning: Invalid PRD metadata at ${path}: ${result.error.message}`)
			return null
		}

		return result.data
	} catch {
		return null
	}
}

/**
 * Check if a PRD is finalized (has tasks section with valid tasks).
 */
export function isPRDFinalized(content: string): boolean {
	// Check for tasks YAML block
	const tasksMatch = content.match(/```yaml\n[\s\S]*?tasks:\s*\n([\s\S]*?)```/)

	if (!tasksMatch) {
		return false
	}

	// Check if tasks array has at least one entry with an id
	return /- id:/.test(tasksMatch[1])
}

/**
 * Get PRD file info for all PRDs.
 */
export async function getPRDFileInfos(projectRoot: string): Promise<PRDFileInfo[]> {
	const files = listPRDFiles(projectRoot)
	const infos: PRDFileInfo[] = []

	for (const path of files) {
		const content = await Bun.file(path).text()
		const slug = extractPRDSlug(path)
		const metadata = parsePRDMetadata(content, path)
		const finalized = isPRDFinalized(content)

		infos.push({
			path,
			slug,
			metadata,
			finalized,
		})
	}

	return infos
}

/**
 * Get current PRD section from state or detect from file.
 */
export async function getCurrentPRDSection(
	projectRoot: string,
	prdSlug: string,
): Promise<PRDSection | null> {
	// First check state
	const state = await loadState(projectRoot)
	if (state.current_prd === prdSlug && state.current_prd_section) {
		return state.current_prd_section
	}

	// Try to detect from PRD file content
	const prdPath = join(projectRoot, '.karimo', PRDS_DIR, `${prdSlug}.md`)
	if (!existsSync(prdPath)) {
		return null
	}

	const content = await Bun.file(prdPath).text()

	// Check which sections are filled in
	// This is a heuristic based on section content
	if (isPRDFinalized(content)) {
		return 'finalized'
	}

	// Check for Agent Boundaries section (Round 4 output)
	if (/## 11\. Agent Boundaries/.test(content) && /Files the agent should reference/.test(content)) {
		return 'review'
	}

	// Check for Checkpoint Learnings section (Round 5 output)
	if (/## 10\. Checkpoint Learnings/.test(content) && /Patterns to reinforce/.test(content)) {
		return 'retrospective'
	}

	// Check for Dependencies section (Round 3 output)
	if (/## 6\. Dependencies & Risks/.test(content) && /### External Blockers/.test(content)) {
		return 'dependencies'
	}

	// Check for Requirements section (Round 2 output)
	if (/## 4\. Requirements/.test(content) && /### Must Have/.test(content)) {
		return 'requirements'
	}

	// Check for Executive Summary section (Round 1 output)
	if (/## 1\. Executive Summary/.test(content) && /One-liner:/.test(content)) {
		return 'framing'
	}

	return null
}

/**
 * Detect the current project phase.
 * Used for routing in the guided flow.
 */
export async function detectProjectPhase(projectRoot: string): Promise<ProjectPhase> {
	// Phase 1: Check if .karimo directory exists
	if (!karimoDirExists(projectRoot)) {
		return 'welcome'
	}

	// Phase 2: Check if config.yaml exists
	if (!configExists(projectRoot)) {
		return 'init'
	}

	// Phase 3: Check for PRDs
	const prdInfos = await getPRDFileInfos(projectRoot)

	if (prdInfos.length === 0) {
		return 'create-prd'
	}

	// Phase 4: Check for PRD in progress (current_prd in state)
	const state = await loadState(projectRoot)

	if (state.current_prd && state.current_prd_section !== 'finalized') {
		// Check if the PRD file exists
		const currentPRD = prdInfos.find((p) => p.slug === state.current_prd)
		if (currentPRD && !currentPRD.finalized) {
			return 'resume-prd'
		}
	}

	// Phase 5: Check for finalized PRDs with pending tasks
	const finalizedPRDs = prdInfos.filter((p) => p.finalized)

	if (finalizedPRDs.length > 0) {
		// Check if any tasks are pending
		// For now, assume if there are finalized PRDs, there are tasks to execute
		// In the future, this will check against completed tasks in state
		const completedPRDSlugs = new Set(state.completed_prds)
		const pendingPRDs = finalizedPRDs.filter((p) => !completedPRDSlugs.has(p.slug))

		if (pendingPRDs.length > 0) {
			return 'execute'
		}
	}

	// Phase 6: All complete
	return 'complete'
}

/**
 * Get the next PRD number for a new PRD.
 */
export async function getNextPRDNumber(projectRoot: string): Promise<string> {
	const prdInfos = await getPRDFileInfos(projectRoot)

	// Find highest existing number
	let maxNum = 0
	for (const info of prdInfos) {
		const match = info.slug.match(/^(\d+)_/)
		if (match) {
			const num = parseInt(match[1], 10)
			if (num > maxNum) {
				maxNum = num
			}
		}
	}

	// Return next number, zero-padded to 3 digits
	return String(maxNum + 1).padStart(3, '0')
}
