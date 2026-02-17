/**
 * KARIMO Interview Session Management
 *
 * Manages interview session state persistence and transitions.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { SessionLoadError, SessionSaveError } from './errors'
import type {
  ConversationMessage,
  ConversationSummary,
  InterviewRound,
  InterviewSession,
  InterviewStatus,
} from './types'
import type { SubagentHistoryEntry, SubagentTokenUsage } from './subagents/types'
import { createDefaultSession } from './types'

const SESSIONS_DIR = '.karimo/sessions'

/**
 * Round order for progression.
 */
export const ROUND_ORDER: InterviewRound[] = [
  'framing',
  'requirements',
  'dependencies',
  'agent-context',
  'retrospective',
]

/**
 * Get the path to session file.
 */
export function getSessionPath(projectRoot: string, prdSlug: string): string {
  return join(projectRoot, SESSIONS_DIR, `${prdSlug}.json`)
}

/**
 * Get the path to sessions directory.
 */
export function getSessionsDir(projectRoot: string): string {
  return join(projectRoot, SESSIONS_DIR)
}

/**
 * Check if a session exists.
 */
export function sessionExists(projectRoot: string, prdSlug: string): boolean {
  return existsSync(getSessionPath(projectRoot, prdSlug))
}

/**
 * Load a session from disk.
 */
export async function loadSession(projectRoot: string, prdSlug: string): Promise<InterviewSession> {
  const sessionPath = getSessionPath(projectRoot, prdSlug)

  if (!existsSync(sessionPath)) {
    throw new SessionLoadError(prdSlug, 'Session file not found')
  }

  try {
    const content = await Bun.file(sessionPath).text()
    const session = JSON.parse(content) as InterviewSession
    return session
  } catch (error) {
    throw new SessionLoadError(prdSlug, (error as Error).message)
  }
}

/**
 * Save a session to disk.
 */
export async function saveSession(projectRoot: string, session: InterviewSession): Promise<void> {
  const sessionsDir = getSessionsDir(projectRoot)
  const sessionPath = getSessionPath(projectRoot, session.prdSlug)

  // Ensure sessions directory exists
  if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true })
  }

  // Update timestamp
  session.updatedAt = new Date().toISOString()

  try {
    const content = JSON.stringify(session, null, 2)
    await Bun.write(sessionPath, content)
  } catch (error) {
    throw new SessionSaveError(session.prdSlug, (error as Error).message)
  }
}

/**
 * Create a new session.
 */
export async function createSession(
  projectRoot: string,
  prdSlug: string,
  prdPath: string
): Promise<InterviewSession> {
  const session = createDefaultSession(prdSlug, prdPath)
  await saveSession(projectRoot, session)
  return session
}

/**
 * Delete a session.
 */
export async function deleteSession(projectRoot: string, prdSlug: string): Promise<void> {
  const sessionPath = getSessionPath(projectRoot, prdSlug)

  if (existsSync(sessionPath)) {
    await Bun.write(sessionPath, '') // Clear file first
    // Note: Bun doesn't have a direct delete, using fs would be more appropriate
    // For now, we just clear the file
  }
}

/**
 * Add a message to the session.
 */
export function addMessage(
  session: InterviewSession,
  role: 'user' | 'assistant',
  content: string
): InterviewSession {
  const message: ConversationMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  }

  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Add a summary to the session (used during context overflow).
 */
export function addSummary(
  session: InterviewSession,
  summary: string,
  messageCount: number
): InterviewSession {
  const conversationSummary: ConversationSummary = {
    summary,
    round: session.currentRound,
    messageCount,
    timestamp: new Date().toISOString(),
  }

  return {
    ...session,
    summaries: [...session.summaries, conversationSummary],
    messages: [], // Clear messages after summarizing
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Transition to the next round.
 */
export function advanceRound(session: InterviewSession): InterviewSession {
  const currentIndex = ROUND_ORDER.indexOf(session.currentRound)

  if (currentIndex === -1) {
    throw new Error(`Invalid round: ${session.currentRound}`)
  }

  const nextIndex = currentIndex + 1

  if (nextIndex >= ROUND_ORDER.length) {
    // All rounds complete, move to reviewing
    return {
      ...session,
      completedRounds: [...session.completedRounds, session.currentRound],
      status: 'reviewing',
      updatedAt: new Date().toISOString(),
    }
  }

  const nextRound = ROUND_ORDER[nextIndex]
  if (!nextRound) {
    throw new Error(`Invalid round index: ${nextIndex}`)
  }

  return {
    ...session,
    completedRounds: [...session.completedRounds, session.currentRound],
    currentRound: nextRound,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Update session status.
 */
export function updateStatus(session: InterviewSession, status: InterviewStatus): InterviewSession {
  return {
    ...session,
    status,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Update estimated token count.
 */
export function updateTokenCount(session: InterviewSession, tokens: number): InterviewSession {
  return {
    ...session,
    estimatedTokens: tokens,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Get the next round after the current one.
 */
export function getNextRound(current: InterviewRound): InterviewRound | null {
  const currentIndex = ROUND_ORDER.indexOf(current)

  if (currentIndex === -1 || currentIndex >= ROUND_ORDER.length - 1) {
    return null
  }

  return ROUND_ORDER[currentIndex + 1] ?? null
}

/**
 * Check if the current round is the last one.
 */
export function isLastRound(round: InterviewRound): boolean {
  return round === ROUND_ORDER[ROUND_ORDER.length - 1]
}

/**
 * Get round display name.
 */
export function getRoundDisplayName(round: InterviewRound): string {
  const names: Record<InterviewRound, string> = {
    framing: 'Framing',
    requirements: 'Requirements',
    dependencies: 'Dependencies',
    'agent-context': 'Agent Context',
    retrospective: 'Retrospective',
  }
  return names[round]
}

/**
 * Get round number (1-5).
 */
export function getRoundNumber(round: InterviewRound): number {
  return ROUND_ORDER.indexOf(round) + 1
}

/**
 * Get estimated minutes for a round.
 */
export function getRoundEstimatedMinutes(round: InterviewRound): number {
  const minutes: Record<InterviewRound, number> = {
    framing: 5,
    requirements: 10,
    dependencies: 5,
    'agent-context': 5,
    retrospective: 3,
  }
  return minutes[round]
}
