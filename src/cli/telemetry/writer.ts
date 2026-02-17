/**
 * Telemetry Writer
 *
 * Handles writing telemetry events to the JSONL log file.
 * Writing is fire-and-forget - errors are silently ignored to never
 * interrupt normal CLI operation.
 */
import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { TelemetryEvent } from './schema'

const TELEMETRY_FILE = 'telemetry.log'
const KARIMO_DIR = '.karimo'

/**
 * Get the path to the telemetry log file.
 */
export function getTelemetryPath(projectRoot: string): string {
  return join(projectRoot, KARIMO_DIR, TELEMETRY_FILE)
}

/**
 * Ensure the .karimo directory exists.
 */
function ensureKarimoDir(projectRoot: string): void {
  const karimoDir = join(projectRoot, KARIMO_DIR)
  if (!existsSync(karimoDir)) {
    mkdirSync(karimoDir, { recursive: true })
  }
}

/**
 * Write a telemetry event to the log file.
 *
 * This function is designed to never throw - all errors are silently ignored.
 * Telemetry should never interrupt normal CLI operation.
 */
export function writeTelemetryEvent(projectRoot: string, event: TelemetryEvent): void {
  try {
    ensureKarimoDir(projectRoot)
    const logPath = getTelemetryPath(projectRoot)
    const line = JSON.stringify(event) + '\n'
    appendFileSync(logPath, line, 'utf-8')
  } catch {
    // Silently ignore all errors - telemetry should never break the CLI
  }
}
