#!/usr/bin/env bun
/**
 * KARIMO CLI Entry Point
 *
 * This is the main entry point for the `karimo` command.
 * It delegates to the main CLI module which handles state detection,
 * command routing, and the guided workflow.
 */
import { main } from '../src/cli/main'

await main(process.cwd(), process.argv.slice(2))
