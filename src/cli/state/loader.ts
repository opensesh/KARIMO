/**
 * KARIMO State Loader
 *
 * Read/write operations for .karimo/state.json.
 */
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { StateCorruptedError, StateWriteError } from './errors'
import { KarimoStateSchema } from './schema'
import type { KarimoState } from './types'
import { DEFAULT_STATE } from './types'

const KARIMO_DIR = '.karimo'
const STATE_FILE = 'state.json'

/**
 * Get the path to state.json.
 */
export function getStatePath(projectRoot: string): string {
  return join(projectRoot, KARIMO_DIR, STATE_FILE)
}

/**
 * Get the path to .karimo directory.
 */
export function getKarimoDirPath(projectRoot: string): string {
  return join(projectRoot, KARIMO_DIR)
}

/**
 * Check if .karimo directory exists.
 */
export function karimoDirExists(projectRoot: string): boolean {
  return existsSync(getKarimoDirPath(projectRoot))
}

/**
 * Check if state.json exists.
 */
export function stateExists(projectRoot: string): boolean {
  return existsSync(getStatePath(projectRoot))
}

/**
 * Load state from state.json.
 * Returns default state if file doesn't exist.
 * Throws StateCorruptedError if file is invalid.
 */
export async function loadState(projectRoot: string): Promise<KarimoState> {
  const statePath = getStatePath(projectRoot)

  if (!existsSync(statePath)) {
    return { ...DEFAULT_STATE }
  }

  try {
    const content = await Bun.file(statePath).text()
    const json = JSON.parse(content) as unknown

    const result = KarimoStateSchema.safeParse(json)
    if (!result.success) {
      throw new StateCorruptedError(statePath, result.error.errors.map((e) => e.message).join(', '))
    }

    return result.data
  } catch (error) {
    if (error instanceof StateCorruptedError) {
      throw error
    }

    throw new StateCorruptedError(statePath, (error as Error).message)
  }
}

/**
 * Save state to state.json.
 * Creates .karimo directory if it doesn't exist.
 */
export async function saveState(projectRoot: string, state: KarimoState): Promise<void> {
  const karimoDir = getKarimoDirPath(projectRoot)
  const statePath = getStatePath(projectRoot)

  // Ensure .karimo directory exists
  if (!existsSync(karimoDir)) {
    mkdirSync(karimoDir, { recursive: true })
  }

  // Update last_activity timestamp
  const updatedState: KarimoState = {
    ...state,
    last_activity: new Date().toISOString(),
  }

  try {
    const content = JSON.stringify(updatedState, null, 2)
    await Bun.write(statePath, content)
  } catch (error) {
    throw new StateWriteError(statePath, error as Error)
  }
}

/**
 * Update specific fields in state.
 * Loads current state, merges updates, and saves.
 */
export async function updateState(
  projectRoot: string,
  updates: Partial<KarimoState>
): Promise<KarimoState> {
  const currentState = await loadState(projectRoot)
  const newState: KarimoState = {
    ...currentState,
    ...updates,
  }
  await saveState(projectRoot, newState)
  return newState
}

/**
 * Reset state to defaults.
 * Preserves completed_prds and completed_cycles.
 */
export async function resetState(projectRoot: string): Promise<KarimoState> {
  const currentState = await loadState(projectRoot)
  const resetState: KarimoState = {
    ...DEFAULT_STATE,
    completed_prds: currentState.completed_prds,
    completed_cycles: currentState.completed_cycles,
  }
  await saveState(projectRoot, resetState)
  return resetState
}

/**
 * Set the current PRD and section.
 */
export async function setCurrentPRD(
  projectRoot: string,
  prdSlug: string,
  section: KarimoState['current_prd_section'] = 'framing'
): Promise<KarimoState> {
  return updateState(projectRoot, {
    current_prd: prdSlug,
    current_prd_section: section,
  })
}

/**
 * Clear the current PRD (mark as completed or cancelled).
 */
export async function clearCurrentPRD(
  projectRoot: string,
  markCompleted = false
): Promise<KarimoState> {
  const currentState = await loadState(projectRoot)
  const completedPrds =
    markCompleted && currentState.current_prd
      ? [...currentState.completed_prds, currentState.current_prd]
      : currentState.completed_prds

  return updateState(projectRoot, {
    current_prd: null,
    current_prd_section: null,
    completed_prds: completedPrds,
  })
}

/**
 * Mark onboarding as complete.
 */
export async function markOnboarded(projectRoot: string): Promise<KarimoState> {
  return updateState(projectRoot, {
    onboarded_at: new Date().toISOString(),
  })
}

/**
 * Record that doctor was run.
 */
export async function recordDoctorRun(projectRoot: string): Promise<KarimoState> {
  return updateState(projectRoot, {
    doctor_last_run: new Date().toISOString(),
  })
}

/**
 * Check if onboarding has been completed.
 */
export async function isOnboarded(projectRoot: string): Promise<boolean> {
  const state = await loadState(projectRoot)
  return state.onboarded_at !== undefined
}
