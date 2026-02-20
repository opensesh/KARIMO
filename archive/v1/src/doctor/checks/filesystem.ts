/**
 * KARIMO Doctor Check: Filesystem
 *
 * Verifies that .karimo/ directory is writable.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CheckResult } from '../types'

/**
 * Check if .karimo/ directory is writable.
 */
export async function checkKarimoWritable(projectRoot: string): Promise<CheckResult> {
  const karimoDir = join(projectRoot, '.karimo')
  const testFile = join(karimoDir, '.write-test')

  try {
    // Create directory if it doesn't exist
    if (!existsSync(karimoDir)) {
      mkdirSync(karimoDir, { recursive: true })
    }

    // Try to write a test file
    writeFileSync(testFile, 'write test')

    // Clean up
    rmSync(testFile)

    return {
      name: 'karimo_writable',
      label: '.karimo/ directory',
      status: 'pass',
      version: 'Writable',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    return {
      name: 'karimo_writable',
      label: '.karimo/ directory',
      status: 'fail',
      message: `Not writable: ${message}`,
      fix: `chmod -R u+w ${karimoDir}`,
    }
  }
}
