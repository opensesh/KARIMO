/**
 * KARIMO Investigation Agent
 *
 * Scans the codebase to gather context for the interview.
 * Uses file system tools to read and search files.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { type ToolDefinition, continueWithToolResults, sendMessageWithTools } from '../conversation'
import { InvestigationError } from '../errors'
import type { ConversationMessage, InvestigationResult } from '../types'

/**
 * Maximum file size to read (50KB).
 */
const MAX_FILE_SIZE = 50 * 1024

/**
 * Maximum files to return from glob.
 */
const MAX_GLOB_RESULTS = 20

/**
 * Tool definitions for the investigation agent.
 */
const INVESTIGATION_TOOLS: ToolDefinition[] = [
  {
    name: 'find_files',
    description: 'Search for files matching a glob pattern. Returns file paths.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match (e.g., "**/*.ts", "src/components/*.tsx")',
        },
        exclude: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to exclude (e.g., ["node_modules", "dist"])',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file. Returns file content as text.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read (relative to project root)',
        },
        startLine: {
          type: 'number',
          description: 'Line to start reading from (optional, 1-indexed)',
        },
        endLine: {
          type: 'number',
          description: 'Line to end reading at (optional, 1-indexed)',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_content',
    description: 'Search for text/regex pattern in files. Returns matching files and snippets.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Text or regex pattern to search for',
        },
        filePattern: {
          type: 'string',
          description: 'Glob pattern to filter files (e.g., "**/*.ts")',
        },
        caseSensitive: {
          type: 'boolean',
          description: 'Whether search is case sensitive (default: false)',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'list_directory',
    description: 'List contents of a directory. Returns files and subdirectories.',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the directory (relative to project root)',
        },
        recursive: {
          type: 'boolean',
          description: 'Whether to list recursively (default: false)',
        },
      },
      required: ['path'],
    },
  },
]

/**
 * Simple glob pattern matching.
 */
function matchGlob(pattern: string, path: string): boolean {
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')
    .replace(/\./g, '\\.')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(path)
}

/**
 * Find files matching a glob pattern.
 */
function findFiles(
  projectRoot: string,
  pattern: string,
  exclude: string[] = ['node_modules', 'dist', '.git', 'coverage']
): string[] {
  const results: string[] = []

  function walk(dir: string): void {
    if (results.length >= MAX_GLOB_RESULTS) return

    try {
      const entries = readdirSync(dir)

      for (const entry of entries) {
        if (results.length >= MAX_GLOB_RESULTS) break

        const fullPath = join(dir, entry)
        const relativePath = relative(projectRoot, fullPath)

        // Check excludes
        if (exclude.some((ex) => relativePath.includes(ex))) {
          continue
        }

        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          walk(fullPath)
        } else if (matchGlob(pattern, relativePath)) {
          results.push(relativePath)
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(projectRoot)
  return results
}

/**
 * Read a file with optional line range.
 */
function readFile(
  projectRoot: string,
  path: string,
  startLine?: number,
  endLine?: number
): { content: string; truncated: boolean } {
  const fullPath = join(projectRoot, path)

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${path}`)
  }

  const stat = statSync(fullPath)

  if (stat.size > MAX_FILE_SIZE) {
    // Read partial
    const content = readFileSync(fullPath, 'utf-8')
    const lines = content.split('\n')
    const start = (startLine ?? 1) - 1
    const end = endLine ?? Math.min(lines.length, start + 100)
    const selectedLines = lines.slice(start, end)

    return {
      content: selectedLines.join('\n'),
      truncated: end < lines.length,
    }
  }

  const content = readFileSync(fullPath, 'utf-8')

  if (startLine !== undefined || endLine !== undefined) {
    const lines = content.split('\n')
    const start = (startLine ?? 1) - 1
    const end = endLine ?? lines.length
    const selectedLines = lines.slice(start, end)

    return {
      content: selectedLines.join('\n'),
      truncated: end < lines.length,
    }
  }

  return { content, truncated: false }
}

/**
 * Search for content in files.
 */
function searchContent(
  projectRoot: string,
  pattern: string,
  filePattern = '**/*',
  caseSensitive = false
): { file: string; line: number; content: string }[] {
  const results: { file: string; line: number; content: string }[] = []
  const files = findFiles(projectRoot, filePattern)

  const regex = new RegExp(pattern, caseSensitive ? '' : 'i')

  for (const file of files) {
    if (results.length >= 50) break

    try {
      const { content } = readFile(projectRoot, file)
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        if (results.length >= 50) break

        const line = lines[i]
        if (line !== undefined && regex.test(line)) {
          results.push({
            file,
            line: i + 1,
            content: line.trim(),
          })
        }
      }
    } catch {
      // Skip files we can't read
    }
  }

  return results
}

/**
 * List directory contents.
 */
function listDirectory(
  projectRoot: string,
  path: string,
  recursive = false
): { name: string; type: 'file' | 'directory'; path: string }[] {
  const fullPath = join(projectRoot, path)

  if (!existsSync(fullPath)) {
    throw new Error(`Directory not found: ${path}`)
  }

  const results: { name: string; type: 'file' | 'directory'; path: string }[] = []

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir)

      for (const entry of entries) {
        if (results.length >= 100) break

        const entryPath = join(dir, entry)
        const relativePath = relative(projectRoot, entryPath)

        // Skip common ignored directories
        if (['node_modules', '.git', 'dist', 'coverage'].includes(entry)) {
          continue
        }

        const stat = statSync(entryPath)

        results.push({
          name: entry,
          type: stat.isDirectory() ? 'directory' : 'file',
          path: relativePath,
        })

        if (recursive && stat.isDirectory()) {
          walk(entryPath)
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(fullPath)
  return results
}

/**
 * Execute a tool call.
 */
function executeTool(
  projectRoot: string,
  toolName: string,
  input: Record<string, unknown>
): string {
  switch (toolName) {
    case 'find_files': {
      const pattern = input['pattern'] as string
      const exclude = (input['exclude'] as string[]) ?? []
      const files = findFiles(projectRoot, pattern, exclude)
      return JSON.stringify({ files, count: files.length })
    }
    case 'read_file': {
      const path = input['path'] as string
      const startLine = input['startLine'] as number | undefined
      const endLine = input['endLine'] as number | undefined
      const result = readFile(projectRoot, path, startLine, endLine)
      return JSON.stringify(result)
    }
    case 'search_content': {
      const pattern = input['pattern'] as string
      const filePattern = input['filePattern'] as string | undefined
      const caseSensitive = input['caseSensitive'] as boolean | undefined
      const results = searchContent(projectRoot, pattern, filePattern, caseSensitive)
      return JSON.stringify({ matches: results, count: results.length })
    }
    case 'list_directory': {
      const path = input['path'] as string
      const recursive = input['recursive'] as boolean | undefined
      const results = listDirectory(projectRoot, path, recursive)
      return JSON.stringify({ entries: results, count: results.length })
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` })
  }
}

/**
 * Run an investigation query.
 */
export async function investigate(
  projectRoot: string,
  query: string
): Promise<InvestigationResult> {
  const systemPrompt = `You are KARIMO's Investigation Agent.
Your job is to explore the codebase to answer questions and gather context.

## Available Tools
- find_files: Search for files matching glob patterns
- read_file: Read file contents
- search_content: Search for text/regex in files
- list_directory: List directory contents

## Guidelines
- Use tools to explore the codebase
- Focus on finding relevant files and patterns
- Summarize your findings clearly
- Note any important patterns or conventions you discover

## Project Root
${projectRoot}

Answer the following investigation query by exploring the codebase.`

  const messages: ConversationMessage[] = [
    {
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    },
  ]

  const files: string[] = []
  const snippets: InvestigationResult['snippets'] = []
  let summary = ''

  try {
    // Initial API call with tools
    let results = await sendMessageWithTools(systemPrompt, messages, INVESTIGATION_TOOLS)

    // Process tool calls iteratively
    let iterations = 0
    const maxIterations = 10

    while (iterations < maxIterations) {
      iterations++

      // Find tool use results
      const toolUses = results.filter(
        (r): r is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
          r.type === 'tool_use'
      )

      if (toolUses.length === 0) {
        // No more tool calls, extract final text
        const textResults = results.filter(
          (r): r is { type: 'text'; content: string } => r.type === 'text'
        )
        if (textResults.length > 0) {
          summary = textResults.map((r) => r.content).join('\n')
        }
        break
      }

      // Execute each tool and continue
      for (const toolUse of toolUses) {
        const toolResult = executeTool(projectRoot, toolUse.name, toolUse.input)

        // Track files found
        try {
          const parsed = JSON.parse(toolResult)
          if (parsed.files) {
            files.push(...parsed.files)
          }
          if (parsed.matches) {
            for (const match of parsed.matches) {
              snippets.push({
                file: match.file,
                content: match.content,
                startLine: match.line,
                endLine: match.line,
              })
            }
          }
        } catch {
          // Not JSON, skip
        }

        // Continue with tool result
        results = await continueWithToolResults(
          systemPrompt,
          messages,
          toolUse.id,
          toolResult,
          INVESTIGATION_TOOLS
        )
      }
    }

    return {
      query,
      files: [...new Set(files)],
      snippets: snippets.slice(0, 20),
      summary: summary || 'Investigation complete.',
    }
  } catch (error) {
    throw new InvestigationError(query, (error as Error).message)
  }
}

/**
 * Investigation queries commonly needed during interview.
 */
export const COMMON_QUERIES = {
  projectStructure:
    'What is the overall structure of this project? List main directories and their purposes.',
  existingPatterns:
    'What patterns and conventions are used in this codebase? Look at file structure, naming, imports.',
  componentLibrary:
    'Is there a component library or design system in use? What UI components exist?',
  dataModels: 'What data models or database schemas exist? What are the main entities?',
  apiRoutes: 'What API routes or endpoints exist? How is the API structured?',
  testPatterns: 'How are tests organized? What testing patterns are used?',
  configFiles: 'What configuration files exist? What tools and frameworks are configured?',
} as const
