/**
 * Detection Types
 *
 * Type definitions for the auto-detection system.
 * Each detected value carries confidence level and source attribution.
 */

/**
 * Confidence level for a detected value.
 * - high: Strong signal, almost certainly correct
 * - medium: Good signal, user should verify
 * - low: Weak signal, likely needs user correction
 */
export type Confidence = 'high' | 'medium' | 'low'

/**
 * A value detected from the project with metadata.
 */
export interface DetectedValue<T> {
  /** The detected value */
  value: T
  /** Confidence level in this detection */
  confidence: Confidence
  /** What file or signal produced this detection */
  source: string
  /** Human-readable explanation of why this was detected */
  reasoning?: string
}

/**
 * Complete detection result from scanning a project.
 */
export interface DetectionResult {
  /** Project name */
  name: DetectedValue<string> | null
  /** Primary programming language */
  language: DetectedValue<string> | null
  /** Framework (Next.js, React, FastAPI, etc.) */
  framework: DetectedValue<string> | null
  /** Runtime environment (Bun, Node, Deno, Python, etc.) */
  runtime: DetectedValue<string> | null
  /** Database (Supabase, Prisma, PostgreSQL, etc.) */
  database: DetectedValue<string> | null

  /** Build/lint/test/typecheck commands */
  commands: {
    build: DetectedValue<string> | null
    lint: DetectedValue<string> | null
    test: DetectedValue<string> | null
    typecheck: DetectedValue<string> | null
  }

  /** Inferred coding rules */
  rules: DetectedValue<string>[]

  /** File boundary patterns */
  boundaries: {
    /** Files that should never be modified */
    never_touch: DetectedValue<string>[]
    /** Files that require human review */
    require_review: DetectedValue<string>[]
  }

  /** Sandbox configuration */
  sandbox: {
    /** Environment variables safe to expose */
    allowed_env: DetectedValue<string>[]
  }

  /** How long the scan took in milliseconds */
  scanDurationMs: number

  /** Non-fatal issues encountered during detection */
  warnings: string[]
}

/**
 * Helper type for package.json structure.
 * Only includes fields we care about for detection.
 */
export interface PackageJson {
  name?: string
  version?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  engines?: Record<string, string>
  packageManager?: string
  workspaces?: string[] | { packages?: string[] }
}

/**
 * Helper type for tsconfig.json structure.
 */
export interface TsConfig {
  compilerOptions?: {
    strict?: boolean
    noImplicitAny?: boolean
    strictNullChecks?: boolean
    [key: string]: unknown
  }
  extends?: string
  include?: string[]
  exclude?: string[]
}

/**
 * Helper type for pyproject.toml structure (parsed as object).
 */
export interface PyProjectToml {
  project?: {
    name?: string
    dependencies?: string[]
  }
  tool?: {
    poetry?: {
      name?: string
      dependencies?: Record<string, unknown>
    }
  }
  'build-system'?: {
    requires?: string[]
    'build-backend'?: string
  }
}

/**
 * Create a detected value with high confidence.
 */
export function high<T>(
  value: T,
  source: string,
  reasoning?: string
): DetectedValue<T> {
  const result: DetectedValue<T> = { value, confidence: 'high', source }
  if (reasoning !== undefined) {
    result.reasoning = reasoning
  }
  return result
}

/**
 * Create a detected value with medium confidence.
 */
export function medium<T>(
  value: T,
  source: string,
  reasoning?: string
): DetectedValue<T> {
  const result: DetectedValue<T> = { value, confidence: 'medium', source }
  if (reasoning !== undefined) {
    result.reasoning = reasoning
  }
  return result
}

/**
 * Create a detected value with low confidence.
 */
export function low<T>(
  value: T,
  source: string,
  reasoning?: string
): DetectedValue<T> {
  const result: DetectedValue<T> = { value, confidence: 'low', source }
  if (reasoning !== undefined) {
    result.reasoning = reasoning
  }
  return result
}
