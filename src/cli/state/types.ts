/**
 * KARIMO State Types
 *
 * Type definitions for CLI state management.
 */

/**
 * KARIMO level (corresponds to build plan levels).
 */
export type KarimoLevel = 0 | 1 | 2 | 3 | 4 | 5

/**
 * PRD section progress marker.
 * Maps to the 5 interview rounds plus review and finalized states.
 */
export type PRDSection =
  | 'framing' // Round 1
  | 'requirements' // Round 2
  | 'dependencies' // Round 3
  | 'agent-context' // Round 4
  | 'retrospective' // Round 5
  | 'review' // Post-interview review
  | 'finalized' // Ready for execution

/**
 * Project phase for routing.
 * Detected from .karimo/ directory contents.
 */
export type ProjectPhase =
  | 'welcome' // No .karimo/ directory
  | 'init' // .karimo/ exists but no config.yaml
  | 'create-prd' // config.yaml exists but no PRDs
  | 'resume-prd' // PRD in progress (not finalized)
  | 'execute' // Finalized PRDs with pending tasks
  | 'complete' // All tasks complete

/**
 * Persistent state stored in .karimo/state.json.
 */
export interface KarimoState {
  /**
   * Current KARIMO level (0-5).
   * Affects available features and execution modes.
   */
  level: KarimoLevel

  /**
   * Currently active PRD slug.
   * Format: "NNN_slug" (e.g., "001_token-studio")
   */
  current_prd: string | null

  /**
   * Current section within the active PRD interview.
   * Null if no interview in progress.
   */
  current_prd_section: PRDSection | null

  /**
   * List of completed PRD slugs.
   */
  completed_prds: string[]

  /**
   * Number of completed execution cycles.
   */
  completed_cycles: number

  /**
   * ISO timestamp of last activity.
   */
  last_activity: string

  /**
   * ISO timestamp when first-run onboarding was completed.
   * Null if not yet onboarded.
   */
  onboarded_at?: string

  /**
   * ISO timestamp of last doctor run.
   * Used for tracking environment health over time.
   */
  doctor_last_run?: string
}

/**
 * Default state for new projects.
 */
export const DEFAULT_STATE: KarimoState = {
  level: 0,
  current_prd: null,
  current_prd_section: null,
  completed_prds: [],
  completed_cycles: 0,
  last_activity: new Date().toISOString(),
}

/**
 * PRD metadata extracted from markdown frontmatter.
 * Re-exported from schema for type inference compatibility.
 */
import type { PRDMetadataFromSchema } from './schema'
export type PRDMetadata = PRDMetadataFromSchema

/**
 * PRD file info for listing/selection.
 */
export interface PRDFileInfo {
  /** Full path to PRD file */
  path: string
  /** PRD slug (e.g., "001_token-studio") */
  slug: string
  /** Parsed metadata from frontmatter */
  metadata: PRDMetadata | null
  /** Whether PRD is finalized (has tasks ready for execution) */
  finalized: boolean
}
