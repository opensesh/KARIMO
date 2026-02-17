/**
 * KARIMO Team Module Tests
 */

import { describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DEFAULT_SCHEDULER_CONFIG,
  // Errors
  QueueNotFoundError,
  type TaskFinding,
  // Types
  type TeamTaskEntry,
  type TeamTaskQueue,
  allTasksSucceeded,
  claimTask,
  completeTask,
  createAffectsFileFinding,
  // Findings
  createFinding,
  createInfoFinding,
  createQueue,
  createTaskEntriesFromPRD,
  // PM Agent
  createTaskEntry,
  createWarningFinding,
  // Scheduler
  detectFileOverlaps,
  formatFindingsForPrompt,
  getBlockingFindings,
  getNextBatch,
  getOverlapGroupForTask,
  // Queue operations
  getQueuePath,
  getQueueProgress,
  getQueueStats,
  getReadyTasks,
  getSchedulableTasks,
  hasBlockingFindings,
  isQueueComplete,
  markTaskRunning,
  queueExists,
  readQueue,
  tasksOverlap,
} from '../index'

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestTask(
  taskId: string,
  options: {
    blockedBy?: string[]
    filesAffected?: string[]
    status?: TeamTaskEntry['status']
    claimedBy?: string | null
    findings?: TaskFinding[]
  } = {}
): TeamTaskEntry {
  return {
    taskId,
    status: options.status ?? 'pending',
    claimedBy: options.claimedBy ?? null,
    blockedBy: options.blockedBy ?? [],
    filesAffected: options.filesAffected ?? [],
    findings: options.findings ?? [],
  }
}

// =============================================================================
// Type Tests
// =============================================================================

describe('Team Types', () => {
  it('should create a valid TeamTaskEntry', () => {
    const task = createTestTask('task-1', {
      blockedBy: ['task-0'],
      filesAffected: ['src/index.ts'],
    })

    expect(task.taskId).toBe('task-1')
    expect(task.status).toBe('pending')
    expect(task.blockedBy).toEqual(['task-0'])
    expect(task.filesAffected).toEqual(['src/index.ts'])
  })

  it('should create a valid TaskFinding', () => {
    const finding: TaskFinding = {
      fromTaskId: 'task-1',
      toTaskId: 'task-2',
      type: 'affects-file',
      message: 'Modified shared file',
      files: ['src/shared.ts'],
      blocking: true,
      createdAt: new Date().toISOString(),
    }

    expect(finding.fromTaskId).toBe('task-1')
    expect(finding.type).toBe('affects-file')
    expect(finding.blocking).toBe(true)
  })
})

// =============================================================================
// Queue Tests
// =============================================================================

// Helper to create unique test context
function createTestContext(): { testDir: string; phaseId: string; cleanup: () => void } {
  const id = Math.random().toString(36).slice(2)
  const testDir = join(tmpdir(), `karimo-team-test-${id}`)
  const phaseId = `phase-${id}`
  mkdirSync(testDir, { recursive: true })
  return {
    testDir,
    phaseId,
    cleanup: () => rmSync(testDir, { recursive: true, force: true }),
  }
}

describe('Team Queue', () => {
  describe('getQueuePath', () => {
    it('should return correct queue path', () => {
      const path = getQueuePath('/project', 'phase-1')
      expect(path).toContain('.karimo/team/phase-1/queue.json')
    })
  })

  describe('createQueue', () => {
    it('should create a new queue', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1'), createTestTask('task-2')]

        const queue = await createQueue(ctx.testDir, ctx.phaseId, tasks)

        expect(queue.phaseId).toBe(ctx.phaseId)
        expect(queue.version).toBe(1)
        expect(queue.tasks).toHaveLength(2)
      } finally {
        ctx.cleanup()
      }
    })

    it('should create queue directory if not exists', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]

        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        expect(queueExists(ctx.testDir, ctx.phaseId)).toBe(true)
      } finally {
        ctx.cleanup()
      }
    })
  })

  describe('readQueue', () => {
    it('should read existing queue', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const queue = await readQueue(ctx.testDir, ctx.phaseId)

        expect(queue.phaseId).toBe(ctx.phaseId)
        expect(queue.tasks).toHaveLength(1)
      } finally {
        ctx.cleanup()
      }
    })

    it('should throw QueueNotFoundError for non-existent queue', async () => {
      const ctx = createTestContext()
      try {
        expect(readQueue(ctx.testDir, 'non-existent')).rejects.toThrow(QueueNotFoundError)
      } finally {
        ctx.cleanup()
      }
    })
  })

  describe('claimTask', () => {
    it('should claim a pending task', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const result = await claimTask(ctx.testDir, ctx.phaseId, 'task-1', {
          agentId: 'agent-1',
        })

        expect(result.success).toBe(true)
        expect(result.task?.status).toBe('claimed')
        expect(result.task?.claimedBy).toBe('agent-1')
      } finally {
        ctx.cleanup()
      }
    })

    it('should fail to claim already claimed task', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        await claimTask(ctx.testDir, ctx.phaseId, 'task-1', { agentId: 'agent-1' })
        const result = await claimTask(ctx.testDir, ctx.phaseId, 'task-1', {
          agentId: 'agent-2',
        })

        expect(result.success).toBe(false)
        expect(result.reason).toContain('agent-1')
      } finally {
        ctx.cleanup()
      }
    })

    it('should fail to claim blocked task', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [
          createTestTask('task-1'),
          createTestTask('task-2', { blockedBy: ['task-1'] }),
        ]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const result = await claimTask(ctx.testDir, ctx.phaseId, 'task-2', {
          agentId: 'agent-1',
        })

        expect(result.success).toBe(false)
        expect(result.reason).toContain('Blocked')
      } finally {
        ctx.cleanup()
      }
    })

    it('should return not found for non-existent task', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const result = await claimTask(ctx.testDir, ctx.phaseId, 'task-999', {
          agentId: 'agent-1',
        })

        expect(result.success).toBe(false)
        expect(result.reason).toContain('not found')
      } finally {
        ctx.cleanup()
      }
    })
  })

  describe('markTaskRunning', () => {
    it('should mark claimed task as running', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)
        await claimTask(ctx.testDir, ctx.phaseId, 'task-1', { agentId: 'agent-1' })

        await markTaskRunning(ctx.testDir, ctx.phaseId, 'task-1')

        const queue = await readQueue(ctx.testDir, ctx.phaseId)
        expect(queue.tasks[0]?.status).toBe('running')
        expect(queue.tasks[0]?.startedAt).toBeDefined()
      } finally {
        ctx.cleanup()
      }
    })
  })

  describe('completeTask', () => {
    it('should mark task as completed on success', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        await completeTask(ctx.testDir, ctx.phaseId, 'task-1', {
          success: true,
          prUrl: 'https://github.com/org/repo/pull/1',
        })

        const queue = await readQueue(ctx.testDir, ctx.phaseId)
        expect(queue.tasks[0]?.status).toBe('completed')
        expect(queue.tasks[0]?.prUrl).toBe('https://github.com/org/repo/pull/1')
      } finally {
        ctx.cleanup()
      }
    })

    it('should mark task as failed on error', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        await completeTask(ctx.testDir, ctx.phaseId, 'task-1', {
          success: false,
          error: 'Build failed',
        })

        const queue = await readQueue(ctx.testDir, ctx.phaseId)
        expect(queue.tasks[0]?.status).toBe('failed')
        expect(queue.tasks[0]?.error).toBe('Build failed')
      } finally {
        ctx.cleanup()
      }
    })

    it('should propagate findings to target tasks', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [createTestTask('task-1'), createTestTask('task-2')]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const finding: TaskFinding = {
          fromTaskId: 'task-1',
          toTaskId: 'task-2',
          type: 'affects-file',
          message: 'Modified shared.ts',
          createdAt: new Date().toISOString(),
        }

        await completeTask(ctx.testDir, ctx.phaseId, 'task-1', {
          success: true,
          findings: [finding],
        })

        const queue = await readQueue(ctx.testDir, ctx.phaseId)
        const task2 = queue.tasks.find((t) => t.taskId === 'task-2')
        expect(task2?.findings).toHaveLength(1)
        expect(task2?.findings[0]?.fromTaskId).toBe('task-1')
      } finally {
        ctx.cleanup()
      }
    })
  })

  describe('getReadyTasks', () => {
    it('should return pending tasks with completed dependencies', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [
          createTestTask('task-1', { status: 'completed' }),
          createTestTask('task-2', { blockedBy: ['task-1'] }),
          createTestTask('task-3', { blockedBy: ['task-1'] }),
        ]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const ready = await getReadyTasks(ctx.testDir, ctx.phaseId)

        expect(ready).toHaveLength(2)
        expect(ready.map((t) => t.taskId)).toContain('task-2')
        expect(ready.map((t) => t.taskId)).toContain('task-3')
      } finally {
        ctx.cleanup()
      }
    })

    it('should not return tasks with incomplete dependencies', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [
          createTestTask('task-1'),
          createTestTask('task-2', { blockedBy: ['task-1'] }),
        ]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const ready = await getReadyTasks(ctx.testDir, ctx.phaseId)

        expect(ready).toHaveLength(1)
        expect(ready[0]?.taskId).toBe('task-1')
      } finally {
        ctx.cleanup()
      }
    })
  })

  describe('getQueueStats', () => {
    it('should return correct statistics', async () => {
      const ctx = createTestContext()
      try {
        const tasks = [
          createTestTask('task-1', { status: 'completed' }),
          createTestTask('task-2', { status: 'running' }),
          createTestTask('task-3', { status: 'pending' }),
          createTestTask('task-4', { status: 'failed' }),
        ]
        await createQueue(ctx.testDir, ctx.phaseId, tasks)

        const stats = await getQueueStats(ctx.testDir, ctx.phaseId)

        expect(stats.total).toBe(4)
        expect(stats.completed).toBe(1)
        expect(stats.running).toBe(1)
        expect(stats.pending).toBe(1)
        expect(stats.failed).toBe(1)
      } finally {
        ctx.cleanup()
      }
    })
  })
})

// =============================================================================
// Findings Tests
// =============================================================================

describe('Team Findings', () => {
  describe('createFinding', () => {
    it('should create a basic finding', () => {
      const finding = createFinding({
        fromTaskId: 'task-1',
        toTaskId: 'task-2',
        type: 'info',
        message: 'Test message',
      })

      expect(finding.fromTaskId).toBe('task-1')
      expect(finding.toTaskId).toBe('task-2')
      expect(finding.type).toBe('info')
      expect(finding.message).toBe('Test message')
      expect(finding.createdAt).toBeDefined()
    })

    it('should include optional properties when provided', () => {
      const finding = createFinding({
        fromTaskId: 'task-1',
        toTaskId: 'task-2',
        type: 'affects-file',
        message: 'Modified file',
        files: ['src/test.ts'],
        blocking: true,
      })

      expect(finding.files).toEqual(['src/test.ts'])
      expect(finding.blocking).toBe(true)
    })
  })

  describe('createAffectsFileFinding', () => {
    it('should create affects-file finding', () => {
      const finding = createAffectsFileFinding('task-1', 'task-2', ['src/shared.ts'], true)

      expect(finding.type).toBe('affects-file')
      expect(finding.files).toEqual(['src/shared.ts'])
      expect(finding.blocking).toBe(true)
    })
  })

  describe('createWarningFinding', () => {
    it('should create non-blocking warning', () => {
      const finding = createWarningFinding('task-1', 'task-2', 'Warning message')

      expect(finding.type).toBe('warning')
      expect(finding.blocking).toBe(false)
    })
  })

  describe('createInfoFinding', () => {
    it('should create non-blocking info', () => {
      const finding = createInfoFinding('task-1', 'task-2', 'Info message')

      expect(finding.type).toBe('info')
      expect(finding.blocking).toBe(false)
    })
  })

  describe('formatFindingsForPrompt', () => {
    it('should return empty string for no findings', () => {
      const result = formatFindingsForPrompt([])
      expect(result).toBe('')
    })

    it('should format findings for prompt injection', () => {
      const findings = [
        createAffectsFileFinding('task-1', 'task-2', ['src/shared.ts'], true),
        createWarningFinding('task-3', 'task-2', 'Check the API'),
      ]

      const result = formatFindingsForPrompt(findings)

      expect(result).toContain('Findings from Other Tasks')
      expect(result).toContain('File Modification')
      expect(result).toContain('[BLOCKING]')
      expect(result).toContain('src/shared.ts')
      expect(result).toContain('Warning')
    })
  })

  describe('getBlockingFindings', () => {
    it('should return only blocking findings', () => {
      const task = createTestTask('task-1', {
        findings: [
          createAffectsFileFinding('task-0', 'task-1', ['file.ts'], true),
          createWarningFinding('task-0', 'task-1', 'Non-blocking'),
        ],
      })

      const blocking = getBlockingFindings(task)

      expect(blocking).toHaveLength(1)
      expect(blocking[0]?.blocking).toBe(true)
    })
  })

  describe('hasBlockingFindings', () => {
    it('should return true if task has blocking findings', () => {
      const task = createTestTask('task-1', {
        findings: [createAffectsFileFinding('task-0', 'task-1', ['file.ts'], true)],
      })

      expect(hasBlockingFindings(task)).toBe(true)
    })

    it('should return false if no blocking findings', () => {
      const task = createTestTask('task-1', {
        findings: [createWarningFinding('task-0', 'task-1', 'Warning')],
      })

      expect(hasBlockingFindings(task)).toBe(false)
    })
  })
})

// =============================================================================
// Scheduler Tests
// =============================================================================

describe('Team Scheduler', () => {
  describe('detectFileOverlaps', () => {
    it('should detect tasks sharing files', () => {
      const tasks = [
        createTestTask('task-1', { filesAffected: ['src/shared.ts', 'src/a.ts'] }),
        createTestTask('task-2', { filesAffected: ['src/shared.ts', 'src/b.ts'] }),
        createTestTask('task-3', { filesAffected: ['src/c.ts'] }),
      ]

      const overlaps = detectFileOverlaps(tasks)

      expect(overlaps).toHaveLength(1)
      expect(overlaps[0]?.taskIds).toContain('task-1')
      expect(overlaps[0]?.taskIds).toContain('task-2')
      expect(overlaps[0]?.sharedFiles).toContain('src/shared.ts')
    })

    it('should return empty array when no overlaps', () => {
      const tasks = [
        createTestTask('task-1', { filesAffected: ['src/a.ts'] }),
        createTestTask('task-2', { filesAffected: ['src/b.ts'] }),
      ]

      const overlaps = detectFileOverlaps(tasks)

      expect(overlaps).toHaveLength(0)
    })

    it('should group transitive overlaps', () => {
      const tasks = [
        createTestTask('task-1', { filesAffected: ['a.ts', 'shared1.ts'] }),
        createTestTask('task-2', { filesAffected: ['shared1.ts', 'shared2.ts'] }),
        createTestTask('task-3', { filesAffected: ['shared2.ts', 'b.ts'] }),
      ]

      const overlaps = detectFileOverlaps(tasks)

      expect(overlaps).toHaveLength(1)
      expect(overlaps[0]?.taskIds).toHaveLength(3)
    })
  })

  describe('getOverlapGroupForTask', () => {
    it('should return overlap group for task', () => {
      const tasks = [
        createTestTask('task-1', { filesAffected: ['src/shared.ts'] }),
        createTestTask('task-2', { filesAffected: ['src/shared.ts'] }),
      ]
      const overlaps = detectFileOverlaps(tasks)

      const group = getOverlapGroupForTask('task-1', overlaps)

      expect(group).toBeDefined()
      expect(group?.taskIds).toContain('task-1')
      expect(group?.taskIds).toContain('task-2')
    })

    it('should return undefined for task without overlaps', () => {
      const tasks = [createTestTask('task-1', { filesAffected: ['src/a.ts'] })]
      const overlaps = detectFileOverlaps(tasks)

      const group = getOverlapGroupForTask('task-1', overlaps)

      expect(group).toBeUndefined()
    })
  })

  describe('tasksOverlap', () => {
    it('should return true for overlapping tasks', () => {
      const tasks = [
        createTestTask('task-1', { filesAffected: ['src/shared.ts'] }),
        createTestTask('task-2', { filesAffected: ['src/shared.ts'] }),
      ]
      const overlaps = detectFileOverlaps(tasks)

      expect(tasksOverlap('task-1', 'task-2', overlaps)).toBe(true)
    })

    it('should return false for non-overlapping tasks', () => {
      const tasks = [
        createTestTask('task-1', { filesAffected: ['src/a.ts'] }),
        createTestTask('task-2', { filesAffected: ['src/b.ts'] }),
      ]
      const overlaps = detectFileOverlaps(tasks)

      expect(tasksOverlap('task-1', 'task-2', overlaps)).toBe(false)
    })
  })

  describe('getSchedulableTasks', () => {
    it('should return tasks that can be scheduled', () => {
      const tasks = [
        createTestTask('task-1'),
        createTestTask('task-2', { blockedBy: ['task-1'] }),
        createTestTask('task-3'),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const schedulable = getSchedulableTasks(
        queue,
        new Set(),
        new Set(),
        [],
        DEFAULT_SCHEDULER_CONFIG
      )

      expect(schedulable).toHaveLength(2)
      expect(schedulable.map((t) => t.taskId)).toContain('task-1')
      expect(schedulable.map((t) => t.taskId)).toContain('task-3')
    })

    it('should respect max parallel agents', () => {
      const tasks = [
        createTestTask('task-1'),
        createTestTask('task-2'),
        createTestTask('task-3'),
        createTestTask('task-4'),
        createTestTask('task-5'),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const runningIds = new Set(['task-1', 'task-2', 'task-3', 'task-4'])
      const schedulable = getSchedulableTasks(queue, runningIds, new Set(), [], {
        maxParallelAgents: 4,
        respectFileOverlaps: true,
      })

      expect(schedulable).toHaveLength(0)
    })
  })

  describe('getNextBatch', () => {
    it('should return tasks respecting overlap constraints', () => {
      const tasks = [
        createTestTask('task-1', { filesAffected: ['src/shared.ts'] }),
        createTestTask('task-2', { filesAffected: ['src/shared.ts'] }),
        createTestTask('task-3', { filesAffected: ['src/other.ts'] }),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const overlaps = detectFileOverlaps(tasks)

      const batch = getNextBatch(queue, new Set(), new Set(), overlaps, {
        maxParallelAgents: 4,
        respectFileOverlaps: true,
      })

      // Should only include one of task-1/task-2 due to overlap
      const overlappingInBatch = batch.filter((t) => t.taskId === 'task-1' || t.taskId === 'task-2')
      expect(overlappingInBatch).toHaveLength(1)
      expect(batch.map((t) => t.taskId)).toContain('task-3')
    })
  })

  describe('isQueueComplete', () => {
    it('should return true when all tasks are completed or failed', () => {
      const tasks = [
        createTestTask('task-1', { status: 'completed' }),
        createTestTask('task-2', { status: 'failed' }),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(isQueueComplete(queue)).toBe(true)
    })

    it('should return false when tasks are still pending', () => {
      const tasks = [
        createTestTask('task-1', { status: 'completed' }),
        createTestTask('task-2', { status: 'pending' }),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(isQueueComplete(queue)).toBe(false)
    })
  })

  describe('allTasksSucceeded', () => {
    it('should return true when all tasks completed', () => {
      const tasks = [
        createTestTask('task-1', { status: 'completed' }),
        createTestTask('task-2', { status: 'completed' }),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(allTasksSucceeded(queue)).toBe(true)
    })

    it('should return false when some tasks failed', () => {
      const tasks = [
        createTestTask('task-1', { status: 'completed' }),
        createTestTask('task-2', { status: 'failed' }),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      expect(allTasksSucceeded(queue)).toBe(false)
    })
  })

  describe('getQueueProgress', () => {
    it('should calculate correct progress', () => {
      const tasks = [
        createTestTask('task-1', { status: 'completed' }),
        createTestTask('task-2', { status: 'completed' }),
        createTestTask('task-3', { status: 'running' }),
        createTestTask('task-4', { status: 'pending' }),
      ]
      const queue: TeamTaskQueue = {
        phaseId: 'phase-1',
        version: 1,
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const progress = getQueueProgress(queue)

      expect(progress.total).toBe(4)
      expect(progress.completed).toBe(2)
      expect(progress.running).toBe(1)
      expect(progress.pending).toBe(1)
      expect(progress.percentComplete).toBe(50)
    })
  })
})

// =============================================================================
// PM Agent Helpers Tests
// =============================================================================

describe('PM Agent Helpers', () => {
  describe('createTaskEntry', () => {
    it('should create task entry with defaults', () => {
      const entry = createTaskEntry('task-1', ['task-0'], ['src/file.ts'])

      expect(entry.taskId).toBe('task-1')
      expect(entry.status).toBe('pending')
      expect(entry.blockedBy).toEqual(['task-0'])
      expect(entry.filesAffected).toEqual(['src/file.ts'])
      expect(entry.findings).toEqual([])
    })
  })

  describe('createTaskEntriesFromPRD', () => {
    it('should convert PRD task data to entries', () => {
      const prdTasks = [
        { id: 'task-1', depends_on: [], files: ['src/a.ts'] },
        { id: 'task-2', depends_on: ['task-1'], files: ['src/b.ts'] },
      ]

      const entries = createTaskEntriesFromPRD(prdTasks)

      expect(entries).toHaveLength(2)
      expect(entries[0]?.taskId).toBe('task-1')
      expect(entries[1]?.blockedBy).toEqual(['task-1'])
    })
  })
})
