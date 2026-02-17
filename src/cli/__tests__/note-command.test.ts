/**
 * Note Command Tests
 *
 * Tests for the dogfooding note command.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleNote, parseNoteArgs } from '../note-command'

describe('parseNoteArgs', () => {
  test('parses simple message', () => {
    const result = parseNoteArgs(['This', 'is', 'a', 'message'])
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('NOTE')
    expect(result?.message).toBe('This is a message')
  })

  test('parses --tag flag', () => {
    const result = parseNoteArgs(['--tag', 'BUG', 'Found', 'a', 'bug'])
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('BUG')
    expect(result?.message).toBe('Found a bug')
  })

  test('parses -t flag', () => {
    const result = parseNoteArgs(['-t', 'FRICTION', 'Slow', 'process'])
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('FRICTION')
    expect(result?.message).toBe('Slow process')
  })

  test('parses --tag=VALUE format', () => {
    const result = parseNoteArgs(['--tag=UX', 'UI', 'issue'])
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('UX')
    expect(result?.message).toBe('UI issue')
  })

  test('parses -t=VALUE format', () => {
    const result = parseNoteArgs(['-t=IDEA', 'New', 'feature'])
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('IDEA')
    expect(result?.message).toBe('New feature')
  })

  test('handles case-insensitive tags', () => {
    const result = parseNoteArgs(['--tag', 'bug', 'lowercase', 'tag'])
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('BUG')
  })

  test('returns null for empty message', () => {
    const result = parseNoteArgs([])
    expect(result).toBeNull()
  })

  test('returns null for only flags', () => {
    const result = parseNoteArgs(['--tag', 'BUG'])
    expect(result).toBeNull()
  })

  test('treats invalid tag as part of message', () => {
    const result = parseNoteArgs(['--tag', 'INVALID', 'message'])
    expect(result).not.toBeNull()
    expect(result?.tag).toBe('NOTE')
    expect(result?.message).toBe('--tag INVALID message')
  })

  test('handles quoted strings', () => {
    const result = parseNoteArgs(['This is a "quoted" message'])
    expect(result).not.toBeNull()
    expect(result?.message).toBe('This is a "quoted" message')
  })

  test('preserves all valid tags', () => {
    const tags = ['NOTE', 'BUG', 'UX', 'FRICTION', 'IDEA']
    for (const tag of tags) {
      const result = parseNoteArgs(['--tag', tag, 'message'])
      expect(result?.tag).toBe(tag)
    }
  })
})

describe('handleNote', () => {
  const testDir = join(tmpdir(), 'karimo-note-test')
  const dogfoodPath = join(testDir, '.karimo', 'dogfood.log')

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  test('creates .karimo directory if missing', async () => {
    await handleNote({
      projectRoot: testDir,
      tag: 'NOTE',
      message: 'Test message',
    })

    expect(existsSync(join(testDir, '.karimo'))).toBe(true)
  })

  test('writes note to dogfood.log', async () => {
    await handleNote({
      projectRoot: testDir,
      tag: 'NOTE',
      message: 'Test message',
    })

    expect(existsSync(dogfoodPath)).toBe(true)
    const content = readFileSync(dogfoodPath, 'utf-8')
    expect(content).toContain('[NOTE]')
    expect(content).toContain('Test message')
  })

  test('formats entry with ISO timestamp', async () => {
    await handleNote({
      projectRoot: testDir,
      tag: 'BUG',
      message: 'Bug report',
    })

    const content = readFileSync(dogfoodPath, 'utf-8')
    // Check for ISO date format pattern
    expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
    expect(content).toContain('[BUG]')
    expect(content).toContain('Bug report')
  })

  test('appends multiple notes', async () => {
    await handleNote({
      projectRoot: testDir,
      tag: 'NOTE',
      message: 'First note',
    })
    await handleNote({
      projectRoot: testDir,
      tag: 'BUG',
      message: 'Second note',
    })

    const content = readFileSync(dogfoodPath, 'utf-8')
    const lines = content.trim().split('\n')
    expect(lines.length).toBe(2)
    expect(lines[0]).toContain('First note')
    expect(lines[1]).toContain('Second note')
  })

  test('preserves existing content', async () => {
    // Create initial content
    mkdirSync(join(testDir, '.karimo'), { recursive: true })
    const existingContent = '[2026-01-01T00:00:00.000Z] [NOTE] Existing note\n'
    Bun.write(dogfoodPath, existingContent)

    await handleNote({
      projectRoot: testDir,
      tag: 'IDEA',
      message: 'New note',
    })

    const content = readFileSync(dogfoodPath, 'utf-8')
    expect(content).toContain('Existing note')
    expect(content).toContain('New note')
  })

  test('handles all tag types', async () => {
    const tags = ['NOTE', 'BUG', 'UX', 'FRICTION', 'IDEA'] as const

    for (const tag of tags) {
      await handleNote({
        projectRoot: testDir,
        tag,
        message: `${tag} message`,
      })
    }

    const content = readFileSync(dogfoodPath, 'utf-8')
    for (const tag of tags) {
      expect(content).toContain(`[${tag}]`)
    }
  })
})
