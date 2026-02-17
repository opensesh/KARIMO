/**
 * Telemetry Tests
 *
 * Tests for telemetry event logging.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  getTelemetryPath,
  logCommandEnd,
  logCommandStart,
  logError,
  logRetry,
  withTelemetry,
  writeTelemetryEvent,
} from '../index'
import type { TelemetryEvent } from '../schema'

describe('Telemetry', () => {
  const testDir = join(tmpdir(), 'karimo-telemetry-test')

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true })
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true })
  })

  describe('getTelemetryPath', () => {
    test('returns correct path', () => {
      const path = getTelemetryPath(testDir)
      expect(path).toBe(join(testDir, '.karimo', 'telemetry.log'))
    })
  })

  describe('writeTelemetryEvent', () => {
    test('creates .karimo directory if missing', () => {
      const event: TelemetryEvent = {
        event: 'command_start',
        timestamp: '2026-02-17T00:00:00.000Z',
        command: 'test',
        args: [],
      }
      writeTelemetryEvent(testDir, event)
      expect(existsSync(join(testDir, '.karimo'))).toBe(true)
    })

    test('writes event as JSONL', () => {
      const event: TelemetryEvent = {
        event: 'command_start',
        timestamp: '2026-02-17T00:00:00.000Z',
        command: 'init',
        args: ['--force'],
      }
      writeTelemetryEvent(testDir, event)

      const logPath = getTelemetryPath(testDir)
      const content = readFileSync(logPath, 'utf-8')
      const parsed = JSON.parse(content.trim())

      expect(parsed.event).toBe('command_start')
      expect(parsed.command).toBe('init')
      expect(parsed.args).toEqual(['--force'])
    })

    test('appends multiple events', () => {
      const event1: TelemetryEvent = {
        event: 'command_start',
        timestamp: '2026-02-17T00:00:00.000Z',
        command: 'init',
        args: [],
      }
      const event2: TelemetryEvent = {
        event: 'command_end',
        timestamp: '2026-02-17T00:00:01.000Z',
        command: 'init',
        durationMs: 1000,
        exitCode: 0,
      }

      writeTelemetryEvent(testDir, event1)
      writeTelemetryEvent(testDir, event2)

      const logPath = getTelemetryPath(testDir)
      const lines = readFileSync(logPath, 'utf-8').trim().split('\n')
      expect(lines.length).toBe(2)

      const parsed1 = JSON.parse(lines[0] ?? '{}')
      const parsed2 = JSON.parse(lines[1] ?? '{}')

      expect(parsed1.event).toBe('command_start')
      expect(parsed2.event).toBe('command_end')
    })
  })

  describe('logCommandStart', () => {
    test('logs command_start event', () => {
      logCommandStart(testDir, 'doctor', ['--check'])

      const logPath = getTelemetryPath(testDir)
      const content = readFileSync(logPath, 'utf-8')
      const parsed = JSON.parse(content.trim())

      expect(parsed.event).toBe('command_start')
      expect(parsed.command).toBe('doctor')
      expect(parsed.args).toEqual(['--check'])
      expect(parsed.timestamp).toBeDefined()
    })
  })

  describe('logCommandEnd', () => {
    test('logs command_end event', () => {
      logCommandEnd(testDir, 'doctor', 500, 0)

      const logPath = getTelemetryPath(testDir)
      const content = readFileSync(logPath, 'utf-8')
      const parsed = JSON.parse(content.trim())

      expect(parsed.event).toBe('command_end')
      expect(parsed.command).toBe('doctor')
      expect(parsed.durationMs).toBe(500)
      expect(parsed.exitCode).toBe(0)
    })
  })

  describe('logError', () => {
    test('logs error event', () => {
      const error = new Error('Test error')
      error.name = 'TestError'
      logError(testDir, error)

      const logPath = getTelemetryPath(testDir)
      const content = readFileSync(logPath, 'utf-8')
      const parsed = JSON.parse(content.trim())

      expect(parsed.event).toBe('error')
      expect(parsed.error.name).toBe('TestError')
      expect(parsed.error.message).toBe('Test error')
      expect(parsed.error.stack).toBeDefined()
    })

    test('logs fatal flag', () => {
      const error = new Error('Fatal error')
      logError(testDir, error, { fatal: true })

      const logPath = getTelemetryPath(testDir)
      const content = readFileSync(logPath, 'utf-8')
      const parsed = JSON.parse(content.trim())

      expect(parsed.fatal).toBe(true)
    })
  })

  describe('logRetry', () => {
    test('logs retry event', () => {
      logRetry(testDir, 'api_call', 2, 3, 'Rate limited')

      const logPath = getTelemetryPath(testDir)
      const content = readFileSync(logPath, 'utf-8')
      const parsed = JSON.parse(content.trim())

      expect(parsed.event).toBe('retry')
      expect(parsed.operation).toBe('api_call')
      expect(parsed.attempt).toBe(2)
      expect(parsed.maxAttempts).toBe(3)
      expect(parsed.reason).toBe('Rate limited')
    })
  })

  describe('withTelemetry', () => {
    test('logs start and end for successful execution', async () => {
      let executed = false
      await withTelemetry(testDir, 'test', ['arg1'], async () => {
        executed = true
      })

      expect(executed).toBe(true)

      const logPath = getTelemetryPath(testDir)
      const lines = readFileSync(logPath, 'utf-8').trim().split('\n')
      expect(lines.length).toBe(2)

      const start = JSON.parse(lines[0] ?? '{}')
      const end = JSON.parse(lines[1] ?? '{}')

      expect(start.event).toBe('command_start')
      expect(start.command).toBe('test')
      expect(end.event).toBe('command_end')
      expect(end.exitCode).toBe(0)
      expect(end.durationMs).toBeGreaterThanOrEqual(0)
    })

    test('logs error on exception and re-throws', async () => {
      const testError = new Error('Test failure')

      let caught = false
      try {
        await withTelemetry(testDir, 'failing', [], async () => {
          throw testError
        })
      } catch (e) {
        caught = true
        expect(e).toBe(testError)
      }

      expect(caught).toBe(true)

      const logPath = getTelemetryPath(testDir)
      const lines = readFileSync(logPath, 'utf-8').trim().split('\n')
      expect(lines.length).toBe(3) // start, end, error

      const end = JSON.parse(lines[1] ?? '{}')
      const errorEvent = JSON.parse(lines[2] ?? '{}')

      expect(end.exitCode).toBe(1)
      expect(errorEvent.event).toBe('error')
      expect(errorEvent.error.message).toBe('Test failure')
    })

    test('returns result from wrapped function', async () => {
      const result = await withTelemetry(testDir, 'compute', [], async () => {
        return 42
      })

      expect(result).toBe(42)
    })
  })
})
