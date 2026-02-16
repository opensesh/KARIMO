/**
 * KARIMO PRD Parser
 *
 * Extracts YAML task blocks from PRD markdown files and validates them.
 * Handles metadata extraction, task parsing, and duplicate detection.
 */

import type { PRDMetadata, Task } from '@/types'
import { parse as parseYAML } from 'yaml'
import {
  DuplicateTaskIdError,
  PRDExtractionError,
  PRDNotFoundError,
  PRDParseError,
  PRDReadError,
  PRDValidationError,
} from './errors'
import { PRDMetadataSchema, TasksBlockSchema } from './schema'
import type { PRDMetadataSchemaType, TaskSchemaType } from './schema'
import type { ParsedPRD } from './types'

/**
 * Normalize line endings to Unix-style (LF).
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Extract YAML metadata block from the start of the PRD.
 * The metadata block is between `---` delimiters at the start of the file.
 */
function extractMetadataBlock(content: string, sourceFile: string): string {
  const lines = content.split('\n')

  // Skip any leading empty lines or whitespace
  let startIndex = 0
  while (startIndex < lines.length && lines[startIndex]?.trim() === '') {
    startIndex++
  }

  const startLine = lines[startIndex]
  if (startLine === undefined) {
    throw new PRDExtractionError(sourceFile, 'PRD file is empty')
  }

  // Check if we have a markdown code fence with yaml
  if (startLine.startsWith('```yaml')) {
    // Find the closing fence
    const closeIndex = lines.findIndex((line, i) => i > startIndex && line.trim() === '```')
    if (closeIndex === -1) {
      throw new PRDExtractionError(sourceFile, 'Unclosed YAML code fence in metadata block')
    }

    // Extract content between fences, skipping the inner --- delimiters
    const yamlLines = lines.slice(startIndex + 1, closeIndex)
    const innerStart = yamlLines.findIndex((line) => line.trim() === '---')
    const innerEnd = yamlLines.findLastIndex((line) => line.trim() === '---')

    if (innerStart !== -1 && innerEnd !== -1 && innerStart !== innerEnd) {
      return yamlLines.slice(innerStart + 1, innerEnd).join('\n')
    }
    return yamlLines.join('\n')
  }

  // Check for raw YAML block starting with ---
  if (startLine.trim() !== '---') {
    throw new PRDExtractionError(
      sourceFile,
      'PRD must start with YAML metadata block (--- delimiters)'
    )
  }

  // Find closing ---
  const closeIndex = lines.findIndex((line, i) => i > startIndex && line.trim() === '---')
  if (closeIndex === -1) {
    throw new PRDExtractionError(sourceFile, 'Unclosed metadata block (missing closing ---)')
  }

  return lines.slice(startIndex + 1, closeIndex).join('\n')
}

/**
 * Extract the YAML task block from the PRD content.
 * Looks for "## Agent Tasks" heading (case-insensitive) followed by YAML.
 */
function extractTasksBlock(content: string, sourceFile: string): string {
  const lines = content.split('\n')

  // Find the "## Agent Tasks" heading (case-insensitive)
  const headingPattern = /^#{1,3}\s*agent\s+tasks\s*$/i
  const headingIndex = lines.findIndex((line) => headingPattern.test(line.trim()))

  if (headingIndex === -1) {
    throw new PRDExtractionError(sourceFile, 'Missing "## Agent Tasks" heading')
  }

  // Look for YAML content after the heading
  let yamlStart = -1
  let yamlEnd = -1
  let inCodeFence = false
  let fenceIndent = 0

  for (let i = headingIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line === undefined) continue

    const trimmed = line.trim()

    // Skip empty lines when looking for YAML start
    if (yamlStart === -1 && trimmed === '') {
      continue
    }

    // Check for code fence start (handle 0-4 spaces indent)
    const fenceMatch = line.match(/^(\s{0,4})```(?:yaml|yml)?/)
    if (fenceMatch && !inCodeFence) {
      inCodeFence = true
      fenceIndent = fenceMatch[1]?.length ?? 0
      yamlStart = i + 1
      continue
    }

    // Check for code fence end
    if (inCodeFence) {
      const closeFenceMatch = line.match(/^(\s{0,4})```\s*$/)
      if (closeFenceMatch && (closeFenceMatch[1]?.length ?? 0) <= fenceIndent) {
        yamlEnd = i
        break
      }
    }

    // If not in code fence and we found non-empty content, treat as raw YAML
    if (!inCodeFence && yamlStart === -1 && trimmed !== '') {
      // Check if this looks like YAML (starts with key: or -)
      if (trimmed.startsWith('tasks:') || trimmed.startsWith('-') || trimmed.startsWith('#')) {
        yamlStart = i
        // Find end at next heading or end of file
        for (let j = i + 1; j < lines.length; j++) {
          const checkLine = lines[j]
          if (checkLine !== undefined && /^#{1,6}\s/.test(checkLine)) {
            yamlEnd = j
            break
          }
        }
        if (yamlEnd === -1) {
          yamlEnd = lines.length
        }
        break
      }
    }
  }

  if (yamlStart === -1) {
    throw new PRDExtractionError(sourceFile, 'No YAML content found after "## Agent Tasks" heading')
  }

  if (inCodeFence && yamlEnd === -1) {
    throw new PRDExtractionError(sourceFile, 'Unclosed code fence in Agent Tasks section')
  }

  return lines.slice(yamlStart, yamlEnd).join('\n')
}

/**
 * Check for duplicate task IDs in the task list.
 */
function checkDuplicateIds(tasks: Task[]): void {
  const seen = new Set<string>()
  for (const task of tasks) {
    if (seen.has(task.id)) {
      throw new DuplicateTaskIdError(task.id)
    }
    seen.add(task.id)
  }
}

/**
 * Convert Zod-parsed metadata to PRDMetadata type.
 * Handles exactOptionalPropertyTypes by only including defined optional fields.
 */
function toMetadata(data: PRDMetadataSchemaType): PRDMetadata {
  const result: PRDMetadata = {
    feature_name: data.feature_name,
    feature_slug: data.feature_slug,
    owner: data.owner,
    status: data.status,
    created_date: data.created_date,
    phase: data.phase,
    scope_type: data.scope_type,
    links: data.links,
    checkpoint_refs: data.checkpoint_refs,
  }
  if (data.target_date !== undefined) {
    result.target_date = data.target_date
  }
  if (data.github_project !== undefined) {
    result.github_project = data.github_project
  }
  return result
}

/**
 * Convert Zod-parsed task to Task type.
 * Handles exactOptionalPropertyTypes by only including defined optional fields.
 */
function toTask(data: TaskSchemaType): Task {
  const result: Task = {
    id: data.id,
    title: data.title,
    description: data.description,
    depends_on: data.depends_on,
    complexity: data.complexity,
    estimated_iterations: data.estimated_iterations,
    cost_ceiling: data.cost_ceiling,
    revision_budget: data.revision_budget,
    priority: data.priority,
    assigned_to: data.assigned_to,
    success_criteria: data.success_criteria,
    files_affected: data.files_affected,
  }
  if (data.agent_context !== undefined) {
    result.agent_context = data.agent_context
  }
  return result
}

/**
 * Parse PRD content and extract tasks.
 *
 * @param content - The raw PRD markdown content
 * @param sourceFile - The source file path (for error messages)
 * @returns ParsedPRD with metadata and tasks
 */
export function parsePRD(content: string, sourceFile: string): ParsedPRD {
  // Normalize line endings
  const normalized = normalizeLineEndings(content)

  // Extract metadata block
  const metadataYaml = extractMetadataBlock(normalized, sourceFile)
  let rawMetadata: unknown
  try {
    rawMetadata = parseYAML(metadataYaml)
  } catch (error) {
    throw new PRDParseError(sourceFile, error instanceof Error ? error : new Error(String(error)))
  }

  // Validate metadata
  const metadataResult = PRDMetadataSchema.safeParse(rawMetadata)
  if (!metadataResult.success) {
    throw new PRDValidationError(sourceFile, metadataResult.error)
  }
  const metadata = toMetadata(metadataResult.data)

  // Extract tasks block
  const tasksYaml = extractTasksBlock(normalized, sourceFile)
  let rawTasks: unknown
  try {
    rawTasks = parseYAML(tasksYaml)
  } catch (error) {
    throw new PRDParseError(sourceFile, error instanceof Error ? error : new Error(String(error)))
  }

  // Validate tasks
  const tasksResult = TasksBlockSchema.safeParse(rawTasks)
  if (!tasksResult.success) {
    throw new PRDValidationError(sourceFile, tasksResult.error)
  }
  const tasks = tasksResult.data.tasks.map(toTask)

  // Check for duplicate IDs
  checkDuplicateIds(tasks)

  return {
    metadata,
    tasks,
    sourceFile,
  }
}

/**
 * Read and parse a PRD file from disk.
 *
 * @param filePath - Path to the PRD markdown file
 * @returns ParsedPRD with metadata and tasks
 */
export async function parsePRDFile(filePath: string): Promise<ParsedPRD> {
  const file = Bun.file(filePath)

  // Check if file exists
  if (!(await file.exists())) {
    throw new PRDNotFoundError(filePath)
  }

  // Read file content
  let content: string
  try {
    content = await file.text()
  } catch (error) {
    throw new PRDReadError(filePath, error instanceof Error ? error : new Error(String(error)))
  }

  return parsePRD(content, filePath)
}
