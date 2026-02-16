/**
 * KARIMO Git Diff
 *
 * Functions for analyzing git diffs and detecting file changes.
 * Used for caution file detection and never_touch violation checking.
 */

import { Glob } from 'bun'
import { gitExec } from './exec'
import type {
  CautionFilesResult,
  ChangedFile,
  ChangedFilesResult,
  GitExecOptions,
  NeverTouchViolation,
} from './types'

/**
 * Parse the status code from git diff --name-status output.
 */
type StatusCode = 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | 'U' | 'X'

function parseStatusCode(code: string): StatusCode {
  // Handle rename/copy codes like R100, C050
  const firstChar = code.charAt(0).toUpperCase()
  if (['A', 'M', 'D', 'R', 'C', 'T', 'U', 'X'].includes(firstChar)) {
    return firstChar as StatusCode
  }
  return 'M' // Default to modified if unknown
}

/**
 * Get list of changed files between two refs.
 *
 * @param baseRef - Base reference (commit, branch, tag)
 * @param headRef - Head reference (defaults to HEAD)
 * @param options - Git execution options
 * @returns List of changed files with basic info
 *
 * @example
 * ```typescript
 * const files = await getChangedFiles('main', 'HEAD')
 * console.log(`Changed: ${files.join(', ')}`)
 * ```
 */
export async function getChangedFiles(
  baseRef: string,
  headRef = 'HEAD',
  options: GitExecOptions = {}
): Promise<string[]> {
  const result = await gitExec(['diff', '--name-only', `${baseRef}...${headRef}`], options)

  return result.stdout
    .trim()
    .split('\n')
    .filter((f) => f.length > 0)
}

/**
 * Get detailed information about changed files.
 *
 * @param baseRef - Base reference
 * @param headRef - Head reference (defaults to HEAD)
 * @param options - Git execution options
 * @returns Detailed change information including additions/deletions
 *
 * @example
 * ```typescript
 * const result = await getChangedFilesDetailed('main')
 * console.log(`${result.totalFiles} files, +${result.totalAdditions}/-${result.totalDeletions}`)
 * for (const file of result.files) {
 *   console.log(`  ${file.status} ${file.path}`)
 * }
 * ```
 */
export async function getChangedFilesDetailed(
  baseRef: string,
  headRef = 'HEAD',
  options: GitExecOptions = {}
): Promise<ChangedFilesResult> {
  // Get name-status for status codes and renames
  const nameStatusResult = await gitExec(
    ['diff', '--name-status', `${baseRef}...${headRef}`],
    options
  )

  // Get numstat for additions/deletions
  const numstatResult = await gitExec(
    ['diff', '--numstat', `${baseRef}...${headRef}`],
    options
  )

  // Parse name-status output
  const statusMap = new Map<string, { status: StatusCode; previousPath?: string }>()
  for (const line of nameStatusResult.stdout.trim().split('\n')) {
    if (!line) continue
    const parts = line.split('\t')
    if (parts.length >= 2) {
      const status = parseStatusCode(parts[0] ?? '')
      const path = parts[1] ?? ''

      if (status === 'R' || status === 'C') {
        // Rename/copy: format is "R100\told\tnew" or "C100\told\tnew"
        const previousPath = parts[1]
        const newPath = parts[2] ?? ''
        statusMap.set(newPath, { status, previousPath })
      } else {
        statusMap.set(path, { status })
      }
    }
  }

  // Parse numstat output
  const files: ChangedFile[] = []
  let totalAdditions = 0
  let totalDeletions = 0

  for (const line of numstatResult.stdout.trim().split('\n')) {
    if (!line) continue
    const parts = line.split('\t')
    if (parts.length >= 3) {
      // Handle binary files (show as '-' in numstat)
      const additions = parts[0] === '-' ? 0 : Number.parseInt(parts[0] ?? '0', 10)
      const deletions = parts[1] === '-' ? 0 : Number.parseInt(parts[1] ?? '0', 10)

      // Handle renamed files (format: "old => new" or "{old => new}/path")
      let path = parts.slice(2).join('\t')

      // Handle rename arrow notation
      const renameMatch = path.match(/^(.+)\{(.+) => (.+)\}(.+)$/)
      if (renameMatch) {
        path = renameMatch[1] + renameMatch[3] + renameMatch[4]
      } else if (path.includes(' => ')) {
        const renameParts = path.split(' => ')
        path = renameParts[1] ?? path
      }

      const statusInfo = statusMap.get(path) ?? { status: 'M' as const }

      files.push({
        path,
        status: statusInfo.status,
        additions,
        deletions,
        previousPath: statusInfo.previousPath,
      })

      totalAdditions += additions
      totalDeletions += deletions
    }
  }

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  }
}

/**
 * Check if a file path matches a glob pattern.
 * Uses Bun.Glob for pattern matching.
 *
 * @param filePath - File path to check
 * @param pattern - Glob pattern
 * @returns True if path matches pattern
 */
function matchesPattern(filePath: string, pattern: string): boolean {
  // Handle exact file paths (no glob characters)
  if (!pattern.includes('*') && !pattern.includes('?') && !pattern.includes('[')) {
    // Normalize paths for comparison
    const normalizedFile = filePath.replace(/\\/g, '/')
    const normalizedPattern = pattern.replace(/\\/g, '/')
    return normalizedFile === normalizedPattern || normalizedFile.endsWith(`/${normalizedPattern}`)
  }

  // Use Bun.Glob for glob patterns
  const glob = new Glob(pattern)
  return glob.match(filePath)
}

/**
 * Detect files that match caution patterns (require_review).
 *
 * @param changedFiles - List of changed file paths
 * @param patterns - Caution patterns (globs or exact paths)
 * @returns Files matching caution patterns with their matches
 *
 * @example
 * ```typescript
 * const result = detectCautionFiles(
 *   ['src/api/auth.ts', 'src/components/Button.tsx'],
 *   ['src/api/**', '*.sql']
 * )
 * if (result.cautionFiles.length > 0) {
 *   console.log('Review required for:', result.cautionFiles)
 * }
 * ```
 */
export function detectCautionFiles(
  changedFiles: string[],
  patterns: string[]
): CautionFilesResult {
  const matches: Array<{ file: string; pattern: string }> = []
  const cautionFiles: string[] = []

  for (const file of changedFiles) {
    for (const pattern of patterns) {
      if (matchesPattern(file, pattern)) {
        if (!cautionFiles.includes(file)) {
          cautionFiles.push(file)
        }
        matches.push({ file, pattern })
        break // Only need to match one pattern per file
      }
    }
  }

  return {
    cautionFiles,
    matches,
  }
}

/**
 * Detect never_touch violations.
 *
 * @param changedFiles - List of changed file paths
 * @param neverTouchPatterns - Never-touch patterns (globs or exact paths)
 * @returns Violations with file and matching pattern
 *
 * @example
 * ```typescript
 * const violations = detectNeverTouchViolations(
 *   ['package-lock.json', 'src/index.ts'],
 *   ['package-lock.json', '*.lock']
 * )
 * if (violations.length > 0) {
 *   console.error('Never-touch violations:', violations)
 * }
 * ```
 */
export function detectNeverTouchViolations(
  changedFiles: string[],
  neverTouchPatterns: string[]
): NeverTouchViolation[] {
  const violations: NeverTouchViolation[] = []

  for (const file of changedFiles) {
    for (const pattern of neverTouchPatterns) {
      if (matchesPattern(file, pattern)) {
        violations.push({ file, pattern })
        break // Only need one violation per file
      }
    }
  }

  return violations
}

/**
 * Get the diff content for a specific file.
 *
 * @param filePath - Path to the file
 * @param baseRef - Base reference
 * @param headRef - Head reference
 * @param options - Git execution options
 * @returns Diff content as string
 */
export async function getFileDiff(
  filePath: string,
  baseRef: string,
  headRef = 'HEAD',
  options: GitExecOptions = {}
): Promise<string> {
  const result = await gitExec(
    ['diff', `${baseRef}...${headRef}`, '--', filePath],
    options
  )
  return result.stdout
}

/**
 * Get uncommitted changes (staged and unstaged).
 *
 * @param options - Git execution options
 * @returns Changed files result for uncommitted changes
 */
export async function getUncommittedChanges(
  options: GitExecOptions = {}
): Promise<ChangedFilesResult> {
  // Get staged changes
  const stagedResult = await gitExec(['diff', '--cached', '--numstat'], {
    ...options,
    throwOnError: false,
  })

  // Get unstaged changes
  const unstagedResult = await gitExec(['diff', '--numstat'], {
    ...options,
    throwOnError: false,
  })

  // Get status for change types
  const statusResult = await gitExec(['status', '--porcelain'], {
    ...options,
    throwOnError: false,
  })

  const files: ChangedFile[] = []
  let totalAdditions = 0
  let totalDeletions = 0
  const seenPaths = new Set<string>()

  // Parse status output for change types
  const statusMap = new Map<string, StatusCode>()
  for (const line of statusResult.stdout.trim().split('\n')) {
    if (!line || line.length < 3) continue
    const statusCode = line.charAt(0) === ' ' ? line.charAt(1) : line.charAt(0)
    const path = line.slice(3)
    statusMap.set(path, parseStatusCode(statusCode))
  }

  // Parse numstat outputs
  for (const output of [stagedResult.stdout, unstagedResult.stdout]) {
    for (const line of output.trim().split('\n')) {
      if (!line) continue
      const parts = line.split('\t')
      if (parts.length >= 3) {
        const path = parts.slice(2).join('\t')
        if (seenPaths.has(path)) continue
        seenPaths.add(path)

        const additions = parts[0] === '-' ? 0 : Number.parseInt(parts[0] ?? '0', 10)
        const deletions = parts[1] === '-' ? 0 : Number.parseInt(parts[1] ?? '0', 10)

        files.push({
          path,
          status: statusMap.get(path) ?? 'M',
          additions,
          deletions,
        })

        totalAdditions += additions
        totalDeletions += deletions
      }
    }
  }

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  }
}

/**
 * Check if there are any uncommitted changes.
 *
 * @param options - Git execution options
 * @returns True if there are uncommitted changes
 */
export async function hasUncommittedChanges(options: GitExecOptions = {}): Promise<boolean> {
  const result = await gitExec(['status', '--porcelain'], options)
  return result.stdout.trim().length > 0
}
