/**
 * KARIMO Orchestrator Tests
 *
 * Tests for pre-PR checks, task runner, and summary formatting.
 */

import { describe, expect, it } from 'bun:test'
import {
  type CommandResult,
  type DryRunPlan,
  type TaskRunR0,
  type TaskSummary,
  createTaskSummary,
  formatCommandResult,
  formatDryRunPlan,
  formatDuration,
  formatRunResult,
  formatTaskSummary,
} from '../index'

// =============================================================================
// Test Fixtures
// =============================================================================

// Note: Full mock factories for runTask integration tests will be added in a separate test file.

function createMockCommandResult(overrides: Partial<CommandResult> = {}): CommandResult {
  return {
    command: 'bun run build',
    success: true,
    exitCode: 0,
    stdout: 'Build successful',
    stderr: '',
    durationMs: 1500,
    ...overrides,
  }
}

function createMockTaskRun(overrides: Partial<TaskRunR0> = {}): TaskRunR0 {
  const startedAt = new Date('2024-01-01T10:00:00Z')
  const completedAt = new Date('2024-01-01T10:05:30Z')

  return {
    taskId: '1a',
    phaseId: 'phase-1',
    status: 'done',
    engine: 'claude-code',
    branch: 'feature/phase-1/1a',
    startedAt,
    completedAt,
    prNumber: 42,
    prUrl: 'https://github.com/owner/repo/pull/42',
    cautionFilesModified: [],
    ...overrides,
  }
}

function createMockDryRunPlan(overrides: Partial<DryRunPlan> = {}): DryRunPlan {
  return {
    phaseId: 'phase-1',
    task: {
      id: '1a',
      title: 'Implement user authentication',
      complexity: 5,
      costCeiling: 15,
    },
    prdPath: '/project/.karimo/prds/phase-1.md',
    phaseBranch: 'feature/phase-1',
    taskBranch: 'feature/phase-1/1a',
    worktreePath: '/project/worktrees/phase-1',
    engine: 'claude-code',
    commands: {
      build: 'bun run build',
      typecheck: 'bun run typecheck',
    },
    ...overrides,
  }
}

// =============================================================================
// formatDuration Tests
// =============================================================================

describe('formatDuration', () => {
  it('should format seconds only', () => {
    expect(formatDuration(45000)).toBe('45s')
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(0)).toBe('0s')
  })

  it('should format minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s')
    expect(formatDuration(300000)).toBe('5m 0s')
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  it('should format hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h 0m')
    expect(formatDuration(3900000)).toBe('1h 5m')
    expect(formatDuration(7320000)).toBe('2h 2m')
  })

  it('should handle edge cases', () => {
    expect(formatDuration(500)).toBe('0s') // Less than a second
    expect(formatDuration(59999)).toBe('59s') // Just under a minute
    expect(formatDuration(60000)).toBe('1m 0s') // Exactly a minute
  })
})

// =============================================================================
// createTaskSummary Tests
// =============================================================================

describe('createTaskSummary', () => {
  it('should create summary from successful run', () => {
    const run = createMockTaskRun()
    const summary = createTaskSummary(run, 'Test Task', 5)

    expect(summary.taskId).toBe('1a')
    expect(summary.phaseId).toBe('phase-1')
    expect(summary.title).toBe('Test Task')
    expect(summary.status).toBe('done')
    expect(summary.duration).toBe('5m 30s')
    expect(summary.prUrl).toBe('https://github.com/owner/repo/pull/42')
    expect(summary.filesChanged).toBe(5)
    expect(summary.cautionFiles).toEqual([])
  })

  it('should create summary from failed run', () => {
    const run = createMockTaskRun({
      status: 'failed',
      errorMessage: 'Build failed',
      prNumber: undefined,
      prUrl: undefined,
    })
    const summary = createTaskSummary(run, 'Test Task', 0)

    expect(summary.status).toBe('failed')
    expect(summary.errorMessage).toBe('Build failed')
    expect(summary.prUrl).toBeUndefined()
  })

  it('should include caution files', () => {
    const run = createMockTaskRun({
      cautionFilesModified: ['src/config/auth.ts', 'src/config/db.ts'],
    })
    const summary = createTaskSummary(run, 'Test Task', 3)

    expect(summary.cautionFiles).toEqual(['src/config/auth.ts', 'src/config/db.ts'])
  })

  it('should handle missing completedAt', () => {
    const run = createMockTaskRun({
      completedAt: undefined,
    })
    const summary = createTaskSummary(run, 'Test Task', 0)

    expect(summary.duration).toBe('unknown')
  })
})

// =============================================================================
// formatTaskSummary Tests
// =============================================================================

describe('formatTaskSummary', () => {
  it('should format successful task summary', () => {
    const summary: TaskSummary = {
      taskId: '1a',
      phaseId: 'phase-1',
      title: 'Implement auth',
      status: 'done',
      duration: '2m 30s',
      prUrl: 'https://github.com/owner/repo/pull/42',
      filesChanged: 5,
      cautionFiles: [],
    }

    const output = formatTaskSummary(summary)

    expect(output).toContain('Task 1a: Implement auth')
    expect(output).toContain('Phase:    phase-1')
    expect(output).toContain('Status:   done')
    expect(output).toContain('Duration: 2m 30s')
    expect(output).toContain('Files:    5 changed')
    expect(output).toContain('PR:       https://github.com/owner/repo/pull/42')
  })

  it('should format failed task summary with error', () => {
    const summary: TaskSummary = {
      taskId: '1a',
      phaseId: 'phase-1',
      title: 'Implement auth',
      status: 'failed',
      duration: '1m 0s',
      filesChanged: 0,
      cautionFiles: [],
      errorMessage: 'Build failed with exit code 1',
    }

    const output = formatTaskSummary(summary)

    expect(output).toContain('Error: Build failed with exit code 1')
  })

  it('should show caution files warning', () => {
    const summary: TaskSummary = {
      taskId: '1a',
      phaseId: 'phase-1',
      title: 'Implement auth',
      status: 'done',
      duration: '2m 0s',
      filesChanged: 3,
      cautionFiles: ['src/config/auth.ts'],
    }

    const output = formatTaskSummary(summary)

    expect(output).toContain('Caution files modified')
    expect(output).toContain('src/config/auth.ts')
  })
})

// =============================================================================
// formatCommandResult Tests
// =============================================================================

describe('formatCommandResult', () => {
  it('should format successful command', () => {
    const result = createMockCommandResult()
    const output = formatCommandResult(result)

    expect(output).toContain('bun run build')
    expect(output).toContain('1500ms')
  })

  it('should format failed command with stderr', () => {
    const result = createMockCommandResult({
      success: false,
      exitCode: 1,
      stderr: 'Error: Cannot find module',
    })
    const output = formatCommandResult(result)

    expect(output).toContain('bun run build')
    expect(output).toContain('stderr')
    expect(output).toContain('Cannot find module')
  })

  it('should include stdout in verbose mode', () => {
    const result = createMockCommandResult({
      stdout: 'Compiled 10 files',
    })
    const output = formatCommandResult(result, true)

    expect(output).toContain('stdout')
    expect(output).toContain('Compiled 10 files')
  })
})

// =============================================================================
// formatDryRunPlan Tests
// =============================================================================

describe('formatDryRunPlan', () => {
  it('should format complete dry run plan', () => {
    const plan = createMockDryRunPlan()
    const output = formatDryRunPlan(plan)

    expect(output).toContain('DRY RUN')
    expect(output).toContain('Task Details')
    expect(output).toContain('ID:         1a')
    expect(output).toContain('Title:      Implement user authentication')
    expect(output).toContain('Complexity: 5/10')
    expect(output).toContain('Cost Cap:   $15')
    expect(output).toContain('Execution Plan')
    expect(output).toContain('PRD Path')
    expect(output).toContain('Phase Branch:  feature/phase-1')
    expect(output).toContain('Task Branch:   feature/phase-1/1a')
    expect(output).toContain('Worktree')
    expect(output).toContain('Engine:        claude-code')
    expect(output).toContain('Validation Commands')
    expect(output).toContain('Build:     bun run build')
    expect(output).toContain('Typecheck: bun run typecheck')
  })
})

// =============================================================================
// formatRunResult Tests
// =============================================================================

describe('formatRunResult', () => {
  it('should format successful run result', () => {
    const run = createMockTaskRun()
    const summary = createTaskSummary(run, 'Test Task', 5)
    const output = formatRunResult({ success: true, run, summary })

    expect(output).toContain('Task completed successfully')
    expect(output).toContain('Test Task')
  })

  it('should format failed run result', () => {
    const run = createMockTaskRun({
      status: 'failed',
      errorMessage: 'Build failed',
    })
    const summary = createTaskSummary(run, 'Test Task', 0)
    const output = formatRunResult({ success: false, run, summary })

    expect(output).toContain('Task failed')
  })
})

// =============================================================================
// Error Classes Tests
// =============================================================================

describe('Error Classes', () => {
  it('TaskNotFoundError should have correct properties', async () => {
    const { TaskNotFoundError } = await import('../errors')
    const error = new TaskNotFoundError('1a', 'phase-1')

    expect(error.name).toBe('TaskNotFoundError')
    expect(error.taskId).toBe('1a')
    expect(error.phaseId).toBe('phase-1')
    expect(error.message).toContain('1a')
    expect(error.message).toContain('phase-1')
  })

  it('PhaseNotFoundError should have correct properties', async () => {
    const { PhaseNotFoundError } = await import('../errors')
    const error = new PhaseNotFoundError('phase-1', '/path/to/prd.md')

    expect(error.name).toBe('PhaseNotFoundError')
    expect(error.phaseId).toBe('phase-1')
    expect(error.prdPath).toBe('/path/to/prd.md')
  })

  it('PrePRCheckError should have correct properties', async () => {
    const { PrePRCheckError } = await import('../errors')
    const error = new PrePRCheckError('build', 'Build failed')

    expect(error.name).toBe('PrePRCheckError')
    expect(error.checkType).toBe('build')
    expect(error.details).toBe('Build failed')
    expect(error.message).toContain('build')
  })

  it('NeverTouchViolationError should list all violations', async () => {
    const { NeverTouchViolationError } = await import('../errors')
    const violations = [
      { file: 'package-lock.json', pattern: 'package-lock.json' },
      { file: '.env', pattern: '.env*' },
    ]
    const error = new NeverTouchViolationError(violations)

    expect(error.name).toBe('NeverTouchViolationError')
    expect(error.violations).toEqual(violations)
    expect(error.message).toContain('package-lock.json')
    expect(error.message).toContain('.env')
  })

  it('RebaseConflictError should list conflict files', async () => {
    const { RebaseConflictError } = await import('../errors')
    const error = new RebaseConflictError(['src/index.ts', 'src/app.ts'], 'feature/phase-1')

    expect(error.name).toBe('RebaseConflictError')
    expect(error.conflictFiles).toEqual(['src/index.ts', 'src/app.ts'])
    expect(error.targetBranch).toBe('feature/phase-1')
  })

  it('PRCreationError should have task info', async () => {
    const { PRCreationError } = await import('../errors')
    const error = new PRCreationError('1a', 'Rate limit exceeded')

    expect(error.name).toBe('PRCreationError')
    expect(error.taskId).toBe('1a')
    expect(error.message).toContain('1a')
    expect(error.message).toContain('Rate limit exceeded')
  })

  it('WorktreeError should have phase info', async () => {
    const { WorktreeError } = await import('../errors')
    const error = new WorktreeError('phase-1', 'Worktree already exists')

    expect(error.name).toBe('WorktreeError')
    expect(error.phaseId).toBe('phase-1')
    expect(error.message).toContain('phase-1')
  })
})

// =============================================================================
// Type Exports Tests
// =============================================================================

describe('Type Exports', () => {
  it('should export all required types', async () => {
    const exports = await import('../index')

    // Error classes
    expect(exports.KarimoOrchestratorError).toBeDefined()
    expect(exports.TaskNotFoundError).toBeDefined()
    expect(exports.PhaseNotFoundError).toBeDefined()
    expect(exports.PrePRCheckError).toBeDefined()
    expect(exports.NeverTouchViolationError).toBeDefined()
    expect(exports.RebaseConflictError).toBeDefined()
    expect(exports.PhaseBranchError).toBeDefined()
    expect(exports.WorktreeError).toBeDefined()
    expect(exports.PRCreationError).toBeDefined()

    // Functions
    expect(exports.runCommand).toBeDefined()
    expect(exports.prePRChecks).toBeDefined()
    expect(exports.formatCommandResult).toBeDefined()
    expect(exports.runTask).toBeDefined()
    expect(exports.createDryRunPlan).toBeDefined()
    expect(exports.formatDuration).toBeDefined()
    expect(exports.createTaskSummary).toBeDefined()
    expect(exports.formatTaskSummary).toBeDefined()
    expect(exports.printTaskSummary).toBeDefined()
    expect(exports.formatDryRunPlan).toBeDefined()
    expect(exports.printDryRunPlan).toBeDefined()
    expect(exports.formatRunResult).toBeDefined()
  })
})
