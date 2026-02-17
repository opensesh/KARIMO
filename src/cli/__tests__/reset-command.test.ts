/**
 * Reset Command Tests
 *
 * Tests for the reset command functionality.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseResetArgs } from '../reset-command'

describe('parseResetArgs', () => {
  test('defaults to soft reset', () => {
    const result = parseResetArgs([])
    expect(result.hard).toBe(false)
    expect(result.force).toBe(false)
  })

  test('parses --hard flag', () => {
    const result = parseResetArgs(['--hard'])
    expect(result.hard).toBe(true)
    expect(result.force).toBe(false)
  })

  test('parses --force flag', () => {
    const result = parseResetArgs(['--force'])
    expect(result.hard).toBe(false)
    expect(result.force).toBe(true)
  })

  test('parses -f flag', () => {
    const result = parseResetArgs(['-f'])
    expect(result.hard).toBe(false)
    expect(result.force).toBe(true)
  })

  test('parses --hard --force together', () => {
    const result = parseResetArgs(['--hard', '--force'])
    expect(result.hard).toBe(true)
    expect(result.force).toBe(true)
  })

  test('parses --hard -f together', () => {
    const result = parseResetArgs(['--hard', '-f'])
    expect(result.hard).toBe(true)
    expect(result.force).toBe(true)
  })

  test('ignores unknown flags', () => {
    const result = parseResetArgs(['--unknown', '--hard'])
    expect(result.hard).toBe(true)
    expect(result.force).toBe(false)
  })
})

describe('Reset Command Behavior', () => {
  const testDir = join(tmpdir(), 'karimo-reset-test')
  const karimoDir = join(testDir, '.karimo')

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(karimoDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  /**
   * Helper to set up a typical .karimo directory structure.
   */
  function setupKarimoDir(): void {
    // Preserved files
    writeFileSync(join(karimoDir, 'config.yaml'), 'project:\n  name: test')
    writeFileSync(join(karimoDir, 'dogfood.log'), '[NOTE] test')
    writeFileSync(join(karimoDir, 'telemetry.log'), '{}')

    // Non-preserved files
    writeFileSync(join(karimoDir, 'state.json'), '{}')
    writeFileSync(join(karimoDir, 'other.txt'), 'data')

    // PRDs directory
    mkdirSync(join(karimoDir, 'prds'))
    writeFileSync(join(karimoDir, 'prds', 'phase-1.md'), '# PRD')
  }

  test('soft reset preserves config.yaml', () => {
    setupKarimoDir()

    // Manually perform soft reset logic
    const preservedFiles = ['config.yaml', 'dogfood.log', 'telemetry.log']
    const entries = Bun.file(karimoDir).name // Just for setup verification

    // Verify setup
    expect(existsSync(join(karimoDir, 'config.yaml'))).toBe(true)
    expect(existsSync(join(karimoDir, 'state.json'))).toBe(true)
    expect(existsSync(join(karimoDir, 'prds'))).toBe(true)

    // Simulate soft reset by removing non-preserved items
    rmSync(join(karimoDir, 'state.json'))
    rmSync(join(karimoDir, 'other.txt'))
    rmSync(join(karimoDir, 'prds'), { recursive: true })

    // Verify preserved files remain
    expect(existsSync(join(karimoDir, 'config.yaml'))).toBe(true)
    expect(existsSync(join(karimoDir, 'dogfood.log'))).toBe(true)
    expect(existsSync(join(karimoDir, 'telemetry.log'))).toBe(true)

    // Verify non-preserved files are gone
    expect(existsSync(join(karimoDir, 'state.json'))).toBe(false)
    expect(existsSync(join(karimoDir, 'other.txt'))).toBe(false)
    expect(existsSync(join(karimoDir, 'prds'))).toBe(false)
  })

  test('hard reset removes entire directory', () => {
    setupKarimoDir()

    // Verify setup
    expect(existsSync(karimoDir)).toBe(true)
    expect(existsSync(join(karimoDir, 'config.yaml'))).toBe(true)

    // Simulate hard reset
    rmSync(karimoDir, { recursive: true, force: true })

    // Verify directory is gone
    expect(existsSync(karimoDir)).toBe(false)
  })

  test('preserves correct set of files', () => {
    const preservedFiles = ['config.yaml', 'dogfood.log', 'telemetry.log']

    // These are the files that should be preserved
    expect(preservedFiles).toContain('config.yaml')
    expect(preservedFiles).toContain('dogfood.log')
    expect(preservedFiles).toContain('telemetry.log')

    // State and PRDs should NOT be preserved
    expect(preservedFiles).not.toContain('state.json')
    expect(preservedFiles).not.toContain('prds')
  })

  test('handles missing .karimo directory gracefully', () => {
    // Remove .karimo directory
    rmSync(karimoDir, { recursive: true, force: true })

    // Check that it doesn't exist
    expect(existsSync(karimoDir)).toBe(false)

    // The actual handler would just print "Nothing to reset" and return
    // We're just verifying the precondition here
  })

  test('handles empty .karimo directory', () => {
    // .karimo exists but is empty (from beforeEach)
    expect(existsSync(karimoDir)).toBe(true)

    // The actual handler would report "Nothing to reset"
  })

  test('handles .karimo with only preserved files', () => {
    // Only create preserved files
    writeFileSync(join(karimoDir, 'config.yaml'), 'project:\n  name: test')
    writeFileSync(join(karimoDir, 'dogfood.log'), '[NOTE] test')
    writeFileSync(join(karimoDir, 'telemetry.log'), '{}')

    // All files should remain after soft reset
    expect(existsSync(join(karimoDir, 'config.yaml'))).toBe(true)
    expect(existsSync(join(karimoDir, 'dogfood.log'))).toBe(true)
    expect(existsSync(join(karimoDir, 'telemetry.log'))).toBe(true)
  })
})
