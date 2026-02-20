/**
 * KARIMO Init Command
 *
 * Entry point for the interactive configuration initialization.
 * Run with: bun run karimo:init
 */

import { runInit } from '@/config'

await runInit()
