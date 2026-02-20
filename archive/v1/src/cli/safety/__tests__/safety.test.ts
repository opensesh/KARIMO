/**
 * Safety Check Tests
 *
 * Tests for working directory safety validation.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { MIN_SIGNAL_WEIGHT, checkWorkingDirectory, formatSafetyError } from '../index'

describe('checkWorkingDirectory', () => {
  const testDir = join(tmpdir(), 'karimo-safety-test')

  beforeEach(() => {
    // Clean up any existing test directory
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  test('blocks home directory', () => {
    const result = checkWorkingDirectory(homedir())
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('home_directory')
  })

  test('blocks root directory', () => {
    const result = checkWorkingDirectory('/')
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('root_directory')
  })

  test('blocks directory with insufficient signals', () => {
    // Empty directory has no signals
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('insufficient_signals')
    expect(result.signalWeight).toBe(0)
  })

  test('allows directory with package.json (weight 3)', () => {
    writeFileSync(join(testDir, 'package.json'), '{}')
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
    expect(result.signalWeight).toBe(3)
  })

  test('allows directory with .git (weight 2)', () => {
    mkdirSync(join(testDir, '.git'))
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
    expect(result.signalWeight).toBe(2)
  })

  test('blocks directory with only README.md (weight 1)', () => {
    writeFileSync(join(testDir, 'README.md'), '# Test')
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('insufficient_signals')
    expect(result.signalWeight).toBe(1)
    expect(result.detectedSignals?.map((s) => s.file)).toContain('README.md')
  })

  test('allows directory with README.md + LICENSE (weight 2)', () => {
    writeFileSync(join(testDir, 'README.md'), '# Test')
    writeFileSync(join(testDir, 'LICENSE'), 'MIT')
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
    expect(result.signalWeight).toBe(2)
  })

  test('accumulates weights correctly', () => {
    // package.json (3) + .git (2) + README.md (1) = 6
    writeFileSync(join(testDir, 'package.json'), '{}')
    mkdirSync(join(testDir, '.git'))
    writeFileSync(join(testDir, 'README.md'), '# Test')
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
    expect(result.signalWeight).toBe(6)
  })

  test('detects Cargo.toml projects', () => {
    writeFileSync(join(testDir, 'Cargo.toml'), '[package]')
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
    expect(result.signalWeight).toBe(3)
  })

  test('detects pyproject.toml projects', () => {
    writeFileSync(join(testDir, 'pyproject.toml'), '[project]')
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
    expect(result.signalWeight).toBe(3)
  })

  test('detects go.mod projects', () => {
    writeFileSync(join(testDir, 'go.mod'), 'module test')
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
    expect(result.signalWeight).toBe(3)
  })

  test('detects KARIMO repo by package.json name', () => {
    // Create a fake KARIMO repo
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'karimo' }))
    mkdirSync(join(testDir, 'bin'), { recursive: true })
    mkdirSync(join(testDir, 'src/cli'), { recursive: true })
    writeFileSync(join(testDir, 'bin/karimo.ts'), '')
    writeFileSync(join(testDir, 'src/cli/main.ts'), '')

    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('karimo_repo')
  })

  test('does not block non-KARIMO package named karimo without required files', () => {
    // Just package.json with name karimo but missing karimo-specific files
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'karimo' }))
    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(true)
  })

  test('detects KARIMO repo with @karimo/core package name', () => {
    // Create a fake KARIMO repo with scoped package name
    writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: '@karimo/core' }))
    mkdirSync(join(testDir, 'bin'), { recursive: true })
    mkdirSync(join(testDir, 'src/cli'), { recursive: true })
    writeFileSync(join(testDir, 'bin/karimo.ts'), '')
    writeFileSync(join(testDir, 'src/cli/main.ts'), '')

    const result = checkWorkingDirectory(testDir)
    expect(result.safe).toBe(false)
    expect(result.reason).toBe('karimo_repo')
  })
})

describe('formatSafetyError', () => {
  test('returns empty string for safe result', () => {
    const result = formatSafetyError({ safe: true })
    expect(result).toBe('')
  })

  test('formats home directory error', () => {
    const result = formatSafetyError({
      safe: false,
      reason: 'home_directory',
    })
    expect(result).toContain('home directory')
    expect(result).toContain('cd ~/path/to/your/project')
  })

  test('formats root directory error', () => {
    const result = formatSafetyError({
      safe: false,
      reason: 'root_directory',
    })
    expect(result).toContain('root directory')
  })

  test('formats KARIMO repo error', () => {
    const result = formatSafetyError({
      safe: false,
      reason: 'karimo_repo',
    })
    expect(result).toContain('KARIMO repository itself')
    expect(result).toContain('should not be used')
  })

  test('formats insufficient signals error with no signals', () => {
    const result = formatSafetyError({
      safe: false,
      reason: 'insufficient_signals',
      signalWeight: 0,
      detectedSignals: [],
    })
    expect(result).toContain('does not appear to be a valid project')
    expect(result).toContain('No project indicators found')
  })

  test('formats insufficient signals error with some signals', () => {
    const result = formatSafetyError({
      safe: false,
      reason: 'insufficient_signals',
      signalWeight: 1,
      detectedSignals: [{ file: 'README.md', weight: 1 }],
    })
    expect(result).toContain('Found: README.md')
    expect(result).toContain(`1/${MIN_SIGNAL_WEIGHT}`)
  })
})
