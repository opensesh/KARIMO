#!/usr/bin/env bun
/**
 * KARIMO CLI Entry Point
 *
 * This is the main entry point for the `karimo` command.
 * It delegates to the main CLI module which handles state detection,
 * command routing, and the guided workflow.
 */
import { main } from '../src/cli/main'
import { logError } from '../src/cli/telemetry'

const projectRoot = process.cwd()

// Global error handlers for telemetry
process.on('uncaughtException', (error: Error) => {
  logError(projectRoot, error, { fatal: true })
  console.error('Fatal error:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason))
  logError(projectRoot, error, { fatal: true })
  console.error('Unhandled rejection:', error.message)
  process.exit(1)
})

await main(projectRoot, process.argv.slice(2))
