/**
 * KARIMO PRD Module Tests
 *
 * Comprehensive tests for PRD parsing, schema validation,
 * dependency resolution, file overlap detection, and computed field validation.
 */

import { describe, expect, test } from 'bun:test'
import type { Task } from '@/types'
import {
  CyclicDependencyError,
  DuplicateTaskIdError,
  InvalidDependencyError,
  PRDExtractionError,
  PRDValidationError,
  TaskSchema,
  TasksBlockSchema,
  buildDependencyGraph,
  detectFileOverlaps,
  getBlockedTasks,
  getReadyTasks,
  parsePRD,
  recalculateComputedFields,
  topologicalSort,
  validateAllTasks,
  validateComputedFields,
} from '../index'
import type { ComputedFieldConfig } from '../types'

// =============================================================================
// Test Fixtures
// =============================================================================

const VALID_MINIMAL_TASK = {
  id: '1a',
  title: 'Implement feature',
  description: 'Build the feature according to spec',
  depends_on: [],
  complexity: 5,
  estimated_iterations: 20,
  cost_ceiling: 15,
  revision_budget: 7.5,
  priority: 'must',
  assigned_to: 'agent-1',
  success_criteria: ['Tests pass', 'Build succeeds'],
  files_affected: ['src/feature.ts'],
}

const VALID_COMPLETE_TASK = {
  ...VALID_MINIMAL_TASK,
  id: '2a',
  agent_context: 'Reference the existing pattern in src/utils.ts',
}

const DEFAULT_CONFIG: ComputedFieldConfig = {
  cost_multiplier: 3,
  base_iterations: 5,
  iteration_multiplier: 3,
  revision_budget_percent: 50,
}

function createTask(overrides: Partial<Task> = {}): Task {
  return { ...VALID_MINIMAL_TASK, ...overrides } as Task
}

// =============================================================================
// Schema Tests
// =============================================================================

describe('TaskSchema', () => {
  test('accepts valid minimal task', () => {
    const result = TaskSchema.safeParse(VALID_MINIMAL_TASK)
    expect(result.success).toBe(true)
  })

  test('accepts valid complete task with agent_context', () => {
    const result = TaskSchema.safeParse(VALID_COMPLETE_TASK)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.agent_context).toBe('Reference the existing pattern in src/utils.ts')
    }
  })

  test('rejects complexity below 1', () => {
    const task = { ...VALID_MINIMAL_TASK, complexity: 0 }
    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(false)
  })

  test('rejects complexity above 10', () => {
    const task = { ...VALID_MINIMAL_TASK, complexity: 11 }
    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(false)
  })

  test('rejects negative complexity', () => {
    const task = { ...VALID_MINIMAL_TASK, complexity: -5 }
    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(false)
  })

  test('rejects missing required fields', () => {
    const task = {
      id: '1a',
      title: 'Missing fields',
    }
    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(false)
  })

  test('rejects invalid priority enum', () => {
    const task = { ...VALID_MINIMAL_TASK, priority: 'urgent' }
    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(false)
  })

  test('rejects empty success_criteria', () => {
    const task = { ...VALID_MINIMAL_TASK, success_criteria: [] }
    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(false)
  })
})

describe('TasksBlockSchema', () => {
  test('accepts valid tasks block', () => {
    const block = { tasks: [VALID_MINIMAL_TASK, VALID_COMPLETE_TASK] }
    const result = TasksBlockSchema.safeParse(block)
    expect(result.success).toBe(true)
  })

  test('rejects empty tasks array', () => {
    const block = { tasks: [] }
    const result = TasksBlockSchema.safeParse(block)
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// Parser Tests
// =============================================================================

describe('parsePRD', () => {
  const VALID_PRD_CONTENT = `---
feature_name: Test Feature
feature_slug: test-feature
owner: test-owner
status: draft
created_date: 2024-01-01
phase: Phase 1
scope_type: new-feature
links: []
checkpoint_refs: []
---

## Executive Summary

This is a test feature.

## Agent Tasks

\`\`\`yaml
tasks:
  - id: "1a"
    title: "Implement feature"
    description: "Build the feature"
    depends_on: []
    complexity: 5
    estimated_iterations: 20
    cost_ceiling: 15
    revision_budget: 7.5
    priority: must
    assigned_to: agent-1
    success_criteria:
      - Tests pass
    files_affected:
      - src/feature.ts
\`\`\`
`

  test('parses valid PRD with fenced YAML', () => {
    const result = parsePRD(VALID_PRD_CONTENT, 'test.md')
    expect(result.tasks.length).toBe(1)
    expect(result.tasks[0].id).toBe('1a')
    expect(result.metadata.feature_name).toBe('Test Feature')
  })

  test('parses valid PRD with raw YAML (no fence)', () => {
    const content = `---
feature_name: Test Feature
feature_slug: test-feature
owner: test-owner
status: draft
created_date: 2024-01-01
phase: Phase 1
scope_type: new-feature
links: []
checkpoint_refs: []
---

## Agent Tasks

tasks:
  - id: "1a"
    title: "Implement feature"
    description: "Build the feature"
    depends_on: []
    complexity: 5
    estimated_iterations: 20
    cost_ceiling: 15
    revision_budget: 7.5
    priority: must
    assigned_to: agent-1
    success_criteria:
      - Tests pass
    files_affected: []
`
    const result = parsePRD(content, 'test.md')
    expect(result.tasks.length).toBe(1)
  })

  test('extracts metadata from header', () => {
    const result = parsePRD(VALID_PRD_CONTENT, 'test.md')
    expect(result.metadata.feature_slug).toBe('test-feature')
    expect(result.metadata.owner).toBe('test-owner')
    expect(result.metadata.status).toBe('draft')
    expect(result.metadata.scope_type).toBe('new-feature')
  })

  test('handles Windows line endings', () => {
    const windowsContent = VALID_PRD_CONTENT.replace(/\n/g, '\r\n')
    const result = parsePRD(windowsContent, 'test.md')
    expect(result.tasks.length).toBe(1)
  })

  test('rejects missing Agent Tasks heading', () => {
    const content = `---
feature_name: Test Feature
feature_slug: test-feature
owner: test-owner
status: draft
created_date: 2024-01-01
phase: Phase 1
scope_type: new-feature
links: []
checkpoint_refs: []
---

## Some Other Section

Content here.
`
    expect(() => parsePRD(content, 'test.md')).toThrow(PRDExtractionError)
  })

  test('rejects invalid YAML syntax', () => {
    const content = `---
feature_name: Test Feature
feature_slug: test-feature
owner: test-owner
status: draft
created_date: 2024-01-01
phase: Phase 1
scope_type: new-feature
links: []
checkpoint_refs: []
---

## Agent Tasks

\`\`\`yaml
tasks:
  - id: "1a"
    invalid: yaml: syntax: [
\`\`\`
`
    expect(() => parsePRD(content, 'test.md')).toThrow()
  })

  test('rejects duplicate task IDs', () => {
    const content = `---
feature_name: Test Feature
feature_slug: test-feature
owner: test-owner
status: draft
created_date: 2024-01-01
phase: Phase 1
scope_type: new-feature
links: []
checkpoint_refs: []
---

## Agent Tasks

\`\`\`yaml
tasks:
  - id: "1a"
    title: "First task"
    description: "Description"
    depends_on: []
    complexity: 5
    estimated_iterations: 20
    cost_ceiling: 15
    revision_budget: 7.5
    priority: must
    assigned_to: agent-1
    success_criteria:
      - Criterion
    files_affected: []
  - id: "1a"
    title: "Duplicate ID"
    description: "Description"
    depends_on: []
    complexity: 5
    estimated_iterations: 20
    cost_ceiling: 15
    revision_budget: 7.5
    priority: must
    assigned_to: agent-1
    success_criteria:
      - Criterion
    files_affected: []
\`\`\`
`
    expect(() => parsePRD(content, 'test.md')).toThrow(DuplicateTaskIdError)
  })

  test('parses PRD with multiple tasks', () => {
    const content = `---
feature_name: Multi Task Feature
feature_slug: multi-task
owner: test-owner
status: active
created_date: 2024-01-01
phase: Phase 1
scope_type: new-feature
links: []
checkpoint_refs: []
---

## Agent Tasks

\`\`\`yaml
tasks:
  - id: "1a"
    title: "Setup"
    description: "Initial setup"
    depends_on: []
    complexity: 3
    estimated_iterations: 14
    cost_ceiling: 9
    revision_budget: 4.5
    priority: must
    assigned_to: agent-1
    success_criteria:
      - Setup complete
    files_affected:
      - src/setup.ts
  - id: "1b"
    title: "Implement"
    description: "Main implementation"
    depends_on:
      - "1a"
    complexity: 7
    estimated_iterations: 26
    cost_ceiling: 21
    revision_budget: 10.5
    priority: must
    assigned_to: agent-1
    success_criteria:
      - Feature works
    files_affected:
      - src/feature.ts
\`\`\`
`
    const result = parsePRD(content, 'test.md')
    expect(result.tasks.length).toBe(2)
    expect(result.tasks[1].depends_on).toContain('1a')
  })
})

// =============================================================================
// Dependency Tests
// =============================================================================

describe('buildDependencyGraph', () => {
  test('builds graph from tasks', () => {
    const tasks = [
      createTask({ id: 'A', depends_on: [] }),
      createTask({ id: 'B', depends_on: ['A'] }),
    ]
    const graph = buildDependencyGraph(tasks)
    expect(graph.size).toBe(2)
    expect(graph.get('B')?.dependsOn).toContain('A')
    expect(graph.get('A')?.dependedBy).toContain('B')
  })

  test('throws InvalidDependencyError for non-existent dependency', () => {
    const tasks = [createTask({ id: 'A', depends_on: ['Z'] })]
    expect(() => buildDependencyGraph(tasks)).toThrow(InvalidDependencyError)
  })
})

describe('topologicalSort', () => {
  test('sorts linear chain (A → B → C)', () => {
    const tasks = [
      createTask({ id: 'C', depends_on: ['B'] }),
      createTask({ id: 'B', depends_on: ['A'] }),
      createTask({ id: 'A', depends_on: [] }),
    ]
    const graph = buildDependencyGraph(tasks)
    const sorted = topologicalSort(graph)

    const order = sorted.map((t) => t.id)
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'))
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'))
  })

  test('sorts diamond (A → B+C, B+C → D)', () => {
    const tasks = [
      createTask({ id: 'A', depends_on: [] }),
      createTask({ id: 'B', depends_on: ['A'] }),
      createTask({ id: 'C', depends_on: ['A'] }),
      createTask({ id: 'D', depends_on: ['B', 'C'] }),
    ]
    const graph = buildDependencyGraph(tasks)
    const sorted = topologicalSort(graph)

    const order = sorted.map((t) => t.id)
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'))
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('C'))
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'))
    expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'))
  })

  test('handles no dependencies (all parallel)', () => {
    const tasks = [
      createTask({ id: 'A', depends_on: [] }),
      createTask({ id: 'B', depends_on: [] }),
      createTask({ id: 'C', depends_on: [] }),
    ]
    const graph = buildDependencyGraph(tasks)
    const sorted = topologicalSort(graph)
    expect(sorted.length).toBe(3)
  })

  test('detects simple cycle (A → B → A)', () => {
    const tasks = [
      createTask({ id: 'A', depends_on: ['B'] }),
      createTask({ id: 'B', depends_on: ['A'] }),
    ]
    const graph = buildDependencyGraph(tasks)
    expect(() => topologicalSort(graph)).toThrow(CyclicDependencyError)
  })

  test('detects complex cycle (A → B → C → A) with path', () => {
    const tasks = [
      createTask({ id: 'A', depends_on: ['C'] }),
      createTask({ id: 'B', depends_on: ['A'] }),
      createTask({ id: 'C', depends_on: ['B'] }),
    ]
    const graph = buildDependencyGraph(tasks)
    try {
      topologicalSort(graph)
      expect(true).toBe(false) // Should not reach
    } catch (error) {
      expect(error).toBeInstanceOf(CyclicDependencyError)
      const cyclicError = error as CyclicDependencyError
      expect(cyclicError.cyclePath.length).toBeGreaterThan(2)
    }
  })
})

describe('getReadyTasks', () => {
  test('returns tasks with all dependencies completed', () => {
    const tasks = [
      createTask({ id: 'A', depends_on: [] }),
      createTask({ id: 'B', depends_on: ['A'] }),
      createTask({ id: 'C', depends_on: ['A'] }),
    ]
    const graph = buildDependencyGraph(tasks)

    const ready1 = getReadyTasks(graph, new Set())
    expect(ready1.map((t) => t.id)).toEqual(['A'])

    const ready2 = getReadyTasks(graph, new Set(['A']))
    expect(ready2.map((t) => t.id).sort()).toEqual(['B', 'C'])
  })
})

describe('getBlockedTasks', () => {
  test('returns tasks waiting on dependencies', () => {
    const tasks = [
      createTask({ id: 'A', depends_on: [] }),
      createTask({ id: 'B', depends_on: ['A'] }),
      createTask({ id: 'C', depends_on: ['B'] }),
    ]
    const graph = buildDependencyGraph(tasks)

    const blocked = getBlockedTasks(graph, new Set(['A']))
    expect(blocked.map((t) => t.id).sort()).toEqual(['B', 'C'])
  })
})

// =============================================================================
// Overlap Tests
// =============================================================================

describe('detectFileOverlaps', () => {
  test('no overlaps returns all safe', () => {
    const tasks = [
      createTask({ id: 'A', files_affected: ['src/a.ts'] }),
      createTask({ id: 'B', files_affected: ['src/b.ts'] }),
      createTask({ id: 'C', files_affected: ['src/c.ts'] }),
    ]
    const result = detectFileOverlaps(tasks)
    expect(result.safe.length).toBe(3)
    expect(result.sequential.length).toBe(0)
    expect(result.overlaps.length).toBe(0)
  })

  test('two tasks share one file creates sequential group', () => {
    const tasks = [
      createTask({ id: 'A', files_affected: ['src/shared.ts'] }),
      createTask({ id: 'B', files_affected: ['src/shared.ts'] }),
    ]
    const result = detectFileOverlaps(tasks)
    expect(result.safe.length).toBe(0)
    expect(result.sequential.length).toBe(1)
    expect(result.sequential[0].map((t) => t.id).sort()).toEqual(['A', 'B'])
    expect(result.overlaps.length).toBe(1)
    expect(result.overlaps[0].file).toBe('src/shared.ts')
  })

  test('transitive overlap groups all three sequentially', () => {
    const tasks = [
      createTask({ id: 'A', files_affected: ['src/ab.ts'] }),
      createTask({ id: 'B', files_affected: ['src/ab.ts', 'src/bc.ts'] }),
      createTask({ id: 'C', files_affected: ['src/bc.ts'] }),
    ]
    const result = detectFileOverlaps(tasks)
    expect(result.safe.length).toBe(0)
    expect(result.sequential.length).toBe(1)
    expect(result.sequential[0].map((t) => t.id).sort()).toEqual(['A', 'B', 'C'])
  })

  test('empty files_affected is always safe', () => {
    const tasks = [
      createTask({ id: 'A', files_affected: [] }),
      createTask({ id: 'B', files_affected: [] }),
    ]
    const result = detectFileOverlaps(tasks)
    expect(result.safe.length).toBe(2)
    expect(result.sequential.length).toBe(0)
  })

  test('exact string matching (src/foo.ts ≠ src/foo.tsx)', () => {
    const tasks = [
      createTask({ id: 'A', files_affected: ['src/foo.ts'] }),
      createTask({ id: 'B', files_affected: ['src/foo.tsx'] }),
    ]
    const result = detectFileOverlaps(tasks)
    expect(result.safe.length).toBe(2)
    expect(result.sequential.length).toBe(0)
  })

  test('mixed safe and sequential', () => {
    const tasks = [
      createTask({ id: 'A', files_affected: ['src/shared.ts'] }),
      createTask({ id: 'B', files_affected: ['src/shared.ts'] }),
      createTask({ id: 'C', files_affected: ['src/independent.ts'] }),
    ]
    const result = detectFileOverlaps(tasks)
    expect(result.safe.length).toBe(1)
    expect(result.safe[0].id).toBe('C')
    expect(result.sequential.length).toBe(1)
    expect(result.sequential[0].map((t) => t.id).sort()).toEqual(['A', 'B'])
  })
})

// =============================================================================
// Validation Tests
// =============================================================================

describe('validateComputedFields', () => {
  test('no drift when values match formulas', () => {
    // complexity=5, cost_multiplier=3 → cost_ceiling=15
    // base_iterations=5, iteration_multiplier=3 → estimated_iterations=5+15=20
    // revision_budget_percent=50 → revision_budget=15*0.5=7.5
    const task = createTask({
      complexity: 5,
      cost_ceiling: 15,
      estimated_iterations: 20,
      revision_budget: 7.5,
    })
    const result = validateComputedFields(task, DEFAULT_CONFIG)
    expect(result.valid).toBe(true)
    expect(result.drifts.length).toBe(0)
  })

  test('detects cost_ceiling drift', () => {
    const task = createTask({
      complexity: 5,
      cost_ceiling: 10, // Should be 15
      estimated_iterations: 20,
      revision_budget: 5, // Based on wrong cost_ceiling
    })
    const result = validateComputedFields(task, DEFAULT_CONFIG)
    expect(result.valid).toBe(false)
    const costDrift = result.drifts.find((d) => d.field === 'cost_ceiling')
    expect(costDrift).toBeDefined()
    expect(costDrift?.expected).toBe(15)
    expect(costDrift?.actual).toBe(10)
  })

  test('detects estimated_iterations drift', () => {
    const task = createTask({
      complexity: 5,
      cost_ceiling: 15,
      estimated_iterations: 10, // Should be 20
      revision_budget: 7.5,
    })
    const result = validateComputedFields(task, DEFAULT_CONFIG)
    expect(result.valid).toBe(false)
    const iterDrift = result.drifts.find((d) => d.field === 'estimated_iterations')
    expect(iterDrift).toBeDefined()
    expect(iterDrift?.expected).toBe(20)
    expect(iterDrift?.actual).toBe(10)
  })

  test('detects revision_budget drift', () => {
    const task = createTask({
      complexity: 5,
      cost_ceiling: 15,
      estimated_iterations: 20,
      revision_budget: 10, // Should be 7.5
    })
    const result = validateComputedFields(task, DEFAULT_CONFIG)
    expect(result.valid).toBe(false)
    const revDrift = result.drifts.find((d) => d.field === 'revision_budget')
    expect(revDrift).toBeDefined()
    expect(revDrift?.expected).toBe(7.5)
    expect(revDrift?.actual).toBe(10)
  })
})

describe('recalculateComputedFields', () => {
  test('returns corrected values', () => {
    const task = createTask({
      complexity: 5,
      cost_ceiling: 10,
      estimated_iterations: 10,
      revision_budget: 3,
    })
    const corrected = recalculateComputedFields(task, DEFAULT_CONFIG)
    expect(corrected.cost_ceiling).toBe(15)
    expect(corrected.estimated_iterations).toBe(20)
    expect(corrected.revision_budget).toBe(7.5)
  })

  test('does not mutate original task', () => {
    const task = createTask({
      complexity: 5,
      cost_ceiling: 10,
      estimated_iterations: 10,
      revision_budget: 3,
    })
    const original = { ...task }
    recalculateComputedFields(task, DEFAULT_CONFIG)
    expect(task.cost_ceiling).toBe(original.cost_ceiling)
  })
})

describe('validateAllTasks', () => {
  test('aggregates drifts across all tasks', () => {
    const tasks = [
      createTask({ id: 'A', complexity: 5, cost_ceiling: 10, estimated_iterations: 20, revision_budget: 7.5 }),
      createTask({ id: 'B', complexity: 5, cost_ceiling: 15, estimated_iterations: 10, revision_budget: 7.5 }),
    ]
    const result = validateAllTasks(tasks, DEFAULT_CONFIG)
    expect(result.valid).toBe(false)
    expect(result.drifts.length).toBe(3) // A: cost_ceiling, revision_budget; B: estimated_iterations
  })

  test('returns valid when all tasks match', () => {
    const tasks = [
      createTask({ id: 'A', complexity: 5, cost_ceiling: 15, estimated_iterations: 20, revision_budget: 7.5 }),
      createTask({ id: 'B', complexity: 5, cost_ceiling: 15, estimated_iterations: 20, revision_budget: 7.5 }),
    ]
    const result = validateAllTasks(tasks, DEFAULT_CONFIG)
    expect(result.valid).toBe(true)
    expect(result.drifts.length).toBe(0)
  })
})
