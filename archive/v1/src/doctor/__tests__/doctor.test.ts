/**
 * KARIMO Doctor Module Tests
 */

import { describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { formatCompactStatus, formatDoctorReport, formatDoctorReportJson } from '../formatter'
import { allCriticalChecksPassed, getAutoFixableChecks } from '../runner'
import type { CheckResult, DoctorReport } from '../types'

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockReport(checks: CheckResult[]): DoctorReport {
  const passed = checks.filter((c) => c.status === 'pass').length
  const failed = checks.filter((c) => c.status === 'fail').length

  return {
    timestamp: '2025-02-17T12:00:00Z',
    overall: failed === 0 ? 'pass' : 'fail',
    checks,
    passed,
    failed,
  }
}

const passingCheck: CheckResult = {
  name: 'bun',
  label: 'Bun runtime',
  status: 'pass',
  version: 'v1.1.34',
}

const failingCheck: CheckResult = {
  name: 'gh_auth',
  label: 'GitHub authentication',
  status: 'fail',
  message: 'Not authenticated',
  fix: 'gh auth login',
  autoFixable: true,
}

const failingNonAutoFixCheck: CheckResult = {
  name: 'anthropic_api_key',
  label: 'Anthropic API key',
  status: 'fail',
  message: 'Not set',
  fix: 'export ANTHROPIC_API_KEY="sk-ant-..."',
}

// =============================================================================
// Type Tests
// =============================================================================

describe('Doctor Types', () => {
  it('should create a valid CheckResult', () => {
    const result: CheckResult = {
      name: 'bun',
      label: 'Bun runtime',
      status: 'pass',
      version: 'v1.1.34',
    }

    expect(result.name).toBe('bun')
    expect(result.status).toBe('pass')
  })

  it('should create a valid DoctorReport', () => {
    const report: DoctorReport = {
      timestamp: new Date().toISOString(),
      overall: 'pass',
      checks: [passingCheck],
      passed: 1,
      failed: 0,
    }

    expect(report.overall).toBe('pass')
    expect(report.passed).toBe(1)
  })
})

// =============================================================================
// Formatter Tests
// =============================================================================

describe('Doctor Formatter', () => {
  describe('formatDoctorReport', () => {
    it('should format all-passing report', () => {
      const report = createMockReport([passingCheck])
      const output = formatDoctorReport(report)

      expect(output).toContain('KARIMO Doctor')
      expect(output).toContain('Bun runtime')
      expect(output).toContain('v1.1.34')
      expect(output).toContain('All 1 checks passed')
    })

    it('should format report with failures', () => {
      const report = createMockReport([passingCheck, failingCheck])
      const output = formatDoctorReport(report)

      expect(output).toContain('KARIMO Doctor')
      expect(output).toContain('1 passed')
      expect(output).toContain('1 failed')
      expect(output).toContain('To fix:')
      expect(output).toContain('gh auth login')
    })
  })

  describe('formatDoctorReportJson', () => {
    it('should output valid JSON', () => {
      const report = createMockReport([passingCheck, failingCheck])
      const output = formatDoctorReportJson(report)
      const parsed = JSON.parse(output)

      expect(parsed.version).toBe('1.0.0')
      expect(parsed.overall).toBe('fail')
      expect(parsed.checks).toHaveLength(2)
    })

    it('should include check details', () => {
      const report = createMockReport([failingCheck])
      const output = formatDoctorReportJson(report)
      const parsed = JSON.parse(output)

      expect(parsed.checks[0].name).toBe('gh_auth')
      expect(parsed.checks[0].status).toBe('fail')
      expect(parsed.checks[0].message).toBe('Not authenticated')
      expect(parsed.checks[0].fix).toBe('gh auth login')
    })
  })

  describe('formatCompactStatus', () => {
    it('should format passing status', () => {
      const report = createMockReport([passingCheck])
      const output = formatCompactStatus(report)

      expect(output).toContain('All 1 checks passed')
    })

    it('should format failing status', () => {
      const report = createMockReport([passingCheck, failingCheck])
      const output = formatCompactStatus(report)

      expect(output).toContain('1 of 2 checks failed')
    })
  })
})

// =============================================================================
// Runner Helper Tests
// =============================================================================

describe('Doctor Runner Helpers', () => {
  describe('getAutoFixableChecks', () => {
    it('should return empty array for all-passing report', () => {
      const report = createMockReport([passingCheck])
      const autoFixable = getAutoFixableChecks(report)

      expect(autoFixable).toHaveLength(0)
    })

    it('should return only auto-fixable failed checks', () => {
      const report = createMockReport([
        passingCheck,
        failingCheck, // autoFixable: true
        failingNonAutoFixCheck, // autoFixable: undefined
      ])
      const autoFixable = getAutoFixableChecks(report)

      expect(autoFixable).toHaveLength(1)
      expect(autoFixable[0]?.name).toBe('gh_auth')
    })
  })

  describe('allCriticalChecksPassed', () => {
    it('should return true for all-passing report', () => {
      const report = createMockReport([passingCheck])
      expect(allCriticalChecksPassed(report)).toBe(true)
    })

    it('should return false for report with failures', () => {
      const report = createMockReport([passingCheck, failingCheck])
      expect(allCriticalChecksPassed(report)).toBe(false)
    })
  })
})

// =============================================================================
// Check Tests
// =============================================================================

describe('Individual Checks', () => {
  describe('checkBun', () => {
    it('should pass when bun is available', async () => {
      const { checkBun } = await import('../checks/bun')
      const result = await checkBun('/tmp')

      // We know bun is available because we're running in bun
      expect(result.status).toBe('pass')
      expect(result.version).toMatch(/^v\d+\.\d+/)
    })
  })

  describe('checkGit', () => {
    it('should pass when git is available', async () => {
      const { checkGit } = await import('../checks/git')
      const result = await checkGit('/tmp')

      expect(result.status).toBe('pass')
      expect(result.version).toMatch(/^v\d+\.\d+/)
    })
  })

  describe('checkGitRepo', () => {
    it('should pass in a git repository', async () => {
      const { checkGitRepo } = await import('../checks/git')
      // Current directory is a git repo
      const result = await checkGitRepo(process.cwd())

      expect(result.status).toBe('pass')
    })

    it('should fail outside a git repository', async () => {
      const { checkGitRepo } = await import('../checks/git')
      const result = await checkGitRepo('/tmp')

      expect(result.status).toBe('fail')
      expect(result.fix).toBe('git init')
    })
  })

  describe('checkAnthropicApiKey', () => {
    it('should pass when ANTHROPIC_API_KEY is set', async () => {
      // Save original
      const original = process.env['ANTHROPIC_API_KEY']

      try {
        process.env['ANTHROPIC_API_KEY'] = 'sk-ant-test-key-1234567890'
        const { checkAnthropicApiKey } = await import('../checks/anthropic')
        const result = await checkAnthropicApiKey('/tmp')

        expect(result.status).toBe('pass')
        expect(result.version).toContain('sk-ant-')
      } finally {
        // Restore
        if (original) {
          process.env['ANTHROPIC_API_KEY'] = original
        } else {
          process.env['ANTHROPIC_API_KEY'] = undefined
        }
      }
    })
  })

  describe('checkKarimoWritable', () => {
    it('should pass when directory is writable', async () => {
      const testDir = join(tmpdir(), `karimo-test-${Date.now()}`)
      mkdirSync(testDir, { recursive: true })

      try {
        const { checkKarimoWritable } = await import('../checks/filesystem')
        const result = await checkKarimoWritable(testDir)

        expect(result.status).toBe('pass')
        expect(result.version).toBe('Writable')
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })
  })
})
