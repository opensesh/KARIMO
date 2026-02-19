/**
 * KARIMO Section Tracker
 *
 * Tracks PRD section completion progress and manages conflicts.
 * Calculates overall progress based on weighted section scores.
 */
import type {
  ConflictRecord,
  ConflictType,
  PRDProgress,
  SectionStatus,
  SectionStatusValue,
} from './types'
import { PRD_SECTIONS } from './types'

// =============================================================================
// Section Tracker
// =============================================================================

/**
 * Section tracker for managing PRD progress.
 */
export class SectionTracker {
  private sections: Map<string, SectionStatus>
  private conflicts: ConflictRecord[]

  constructor() {
    this.sections = new Map()
    this.conflicts = []

    // Initialize sections from constants
    for (const section of PRD_SECTIONS) {
      this.sections.set(section.id, { ...section })
    }
  }

  /**
   * Get current progress snapshot.
   */
  getProgress(): PRDProgress {
    const sections = Array.from(this.sections.values())
    const totalSections = sections.length

    // Calculate weighted completion
    let weightedComplete = 0
    let completeSections = 0

    for (const section of sections) {
      if (section.status === 'complete') {
        weightedComplete += section.weight
        completeSections++
      } else if (section.status === 'partial') {
        // Partial completion contributes proportionally to confidence
        weightedComplete += (section.weight * section.confidence) / 100
      }
    }

    // Calculate suggested next topics based on empty/partial sections
    const suggestedNextTopics = this.getSuggestedNextTopics()

    return {
      sections,
      overallPercent: Math.round(weightedComplete),
      completeSections,
      totalSections,
      suggestedNextTopics,
      conflicts: [...this.conflicts],
    }
  }

  /**
   * Update a section's status.
   */
  updateSection(
    sectionId: string,
    status: SectionStatusValue,
    confidence: number
  ): void {
    const section = this.sections.get(sectionId)
    if (!section) {
      throw new Error(`Unknown section: ${sectionId}`)
    }

    section.status = status
    section.confidence = Math.min(100, Math.max(0, confidence))
    section.lastUpdated = new Date()
    this.sections.set(sectionId, section)
  }

  /**
   * Mark a section as complete.
   */
  completeSection(sectionId: string): void {
    this.updateSection(sectionId, 'complete', 100)
  }

  /**
   * Mark a section as partial with confidence.
   */
  partialSection(sectionId: string, confidence: number): void {
    this.updateSection(sectionId, 'partial', confidence)
  }

  /**
   * Get a section's current status.
   */
  getSection(sectionId: string): SectionStatus | undefined {
    return this.sections.get(sectionId)
  }

  /**
   * Get all sections.
   */
  getAllSections(): SectionStatus[] {
    return Array.from(this.sections.values())
  }

  /**
   * Get suggested next topics to explore.
   * Prioritizes high-weight sections that are empty or low-confidence.
   */
  private getSuggestedNextTopics(): string[] {
    const sections = Array.from(this.sections.values())

    // Sort by priority: empty high-weight > partial low-confidence > empty low-weight
    const prioritized = sections
      .filter((s) => s.weight > 0 && s.status !== 'complete')
      .sort((a, b) => {
        // Empty sections first
        if (a.status === 'empty' && b.status !== 'empty') return -1
        if (b.status === 'empty' && a.status !== 'empty') return 1

        // Then by weight (higher weight = higher priority)
        if (a.weight !== b.weight) return b.weight - a.weight

        // Then by confidence (lower confidence = higher priority)
        return a.confidence - b.confidence
      })
      .slice(0, 3)

    return prioritized.map((s) => s.title)
  }

  // ===========================================================================
  // Conflict Management
  // ===========================================================================

  /**
   * Add a new conflict.
   */
  addConflict(
    type: ConflictType,
    description: string,
    sectionAffected: string,
    earlierStatement: string,
    laterStatement: string
  ): ConflictRecord {
    const conflict: ConflictRecord = {
      id: crypto.randomUUID(),
      type,
      description,
      sectionAffected,
      earlierStatement,
      laterStatement,
      resolution: 'unresolved',
      detectedAt: new Date(),
    }

    this.conflicts.push(conflict)
    return conflict
  }

  /**
   * Resolve a conflict.
   */
  resolveConflict(conflictId: string, resolvedAs: string): void {
    const conflict = this.conflicts.find((c) => c.id === conflictId)
    if (!conflict) {
      throw new Error(`Unknown conflict: ${conflictId}`)
    }

    conflict.resolution = 'resolved'
    conflict.resolvedAs = resolvedAs
  }

  /**
   * Get unresolved conflicts.
   */
  getUnresolvedConflicts(): ConflictRecord[] {
    return this.conflicts.filter((c) => c.resolution === 'unresolved')
  }

  /**
   * Get all conflicts.
   */
  getAllConflicts(): ConflictRecord[] {
    return [...this.conflicts]
  }

  /**
   * Check if there are unresolved conflicts.
   */
  hasUnresolvedConflicts(): boolean {
    return this.conflicts.some((c) => c.resolution === 'unresolved')
  }

  /**
   * Get conflicts affecting a specific section.
   */
  getConflictsForSection(sectionId: string): ConflictRecord[] {
    return this.conflicts.filter((c) => c.sectionAffected === sectionId)
  }

  // ===========================================================================
  // Serialization
  // ===========================================================================

  /**
   * Serialize tracker state for persistence.
   */
  toJSON(): { sections: SectionStatus[]; conflicts: ConflictRecord[] } {
    return {
      sections: Array.from(this.sections.values()),
      conflicts: this.conflicts,
    }
  }

  /**
   * Restore tracker state from serialized data.
   */
  static fromJSON(data: {
    sections: SectionStatus[]
    conflicts: ConflictRecord[]
  }): SectionTracker {
    const tracker = new SectionTracker()

    // Restore sections
    for (const section of data.sections) {
      tracker.sections.set(section.id, {
        ...section,
        lastUpdated: section.lastUpdated ? new Date(section.lastUpdated) : null,
      })
    }

    // Restore conflicts
    tracker.conflicts = data.conflicts.map((c) => ({
      ...c,
      detectedAt: new Date(c.detectedAt),
    }))

    return tracker
  }

  // ===========================================================================
  // Progress Thresholds
  // ===========================================================================

  /**
   * Check if PRD is ready for finalization offer (80%+).
   */
  isReadyForFinalizationOffer(): boolean {
    return this.getProgress().overallPercent >= 80
  }

  /**
   * Check if PRD should proactively suggest finalization (95%+).
   */
  shouldSuggestFinalization(): boolean {
    return (
      this.getProgress().overallPercent >= 95 &&
      !this.hasUnresolvedConflicts()
    )
  }

  /**
   * Check if PRD can be finalized (all conflicts resolved).
   */
  canFinalize(): boolean {
    return !this.hasUnresolvedConflicts()
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new section tracker.
 */
export function createSectionTracker(): SectionTracker {
  return new SectionTracker()
}

// =============================================================================
// Progress Display Helpers
// =============================================================================

/**
 * Format progress as a visual bar.
 */
export function formatProgressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${percent}%`
}

/**
 * Format conflict for display.
 */
export function formatConflict(conflict: ConflictRecord): string {
  const typeLabels: Record<ConflictType, string> = {
    'user-vs-user': 'Earlier vs. Now',
    'user-vs-codebase': 'User vs. Codebase',
    'user-vs-prd': 'User vs. PRD',
  }

  return `⚠  CONFLICT (${typeLabels[conflict.type]})
   Earlier: "${conflict.earlierStatement}"
   Now:     "${conflict.laterStatement}"
   Affects: §${conflict.sectionAffected}`
}

/**
 * Format section status as icon.
 */
export function formatSectionIcon(status: SectionStatusValue): string {
  switch (status) {
    case 'complete':
      return '✓'
    case 'partial':
      return '◐'
    case 'empty':
      return '○'
  }
}

/**
 * Format progress summary for display.
 */
export function formatProgressSummary(progress: PRDProgress): string {
  const lines: string[] = []

  lines.push(formatProgressBar(progress.overallPercent))
  lines.push(`${progress.completeSections}/${progress.totalSections} sections complete`)

  if (progress.conflicts.length > 0) {
    const unresolved = progress.conflicts.filter((c) => c.resolution === 'unresolved').length
    if (unresolved > 0) {
      lines.push(`⚠  ${unresolved} unresolved conflict${unresolved > 1 ? 's' : ''}`)
    }
  }

  if (progress.suggestedNextTopics.length > 0) {
    lines.push(`\nNext: ${progress.suggestedNextTopics.join(', ')}`)
  }

  return lines.join('\n')
}
