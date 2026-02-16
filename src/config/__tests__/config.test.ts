/**
 * KARIMO Config Tests
 *
 * Tests for schema validation, config loading, and defaults.
 */

import { describe, expect, test } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { stringify as stringifyYaml } from 'yaml'
import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigValidationError,
  DEFAULT_COST,
  KarimoConfigSchema,
  findConfigPath,
  loadConfigSync,
} from '../index'
import type { KarimoConfig } from '../schema'

// =============================================================================
// Test Fixtures
// =============================================================================

const VALID_MINIMAL_CONFIG = {
  project: {
    name: 'test-project',
  },
  commands: {
    build: 'bun run build',
    lint: 'bun run lint',
    test: 'bun test',
    typecheck: 'tsc --noEmit',
  },
  rules: ['No any types'],
  sandbox: {
    allowed_env: ['PATH', 'HOME'],
  },
}

const VALID_COMPLETE_CONFIG: KarimoConfig = {
  project: {
    name: 'test-project',
    language: 'typescript',
    framework: 'nextjs',
    runtime: 'bun',
    database: 'postgresql',
  },
  commands: {
    build: 'bun run build',
    lint: 'bun run lint',
    test: 'bun test',
    typecheck: 'tsc --noEmit',
  },
  rules: ['No any types', 'Use Zod for validation'],
  boundaries: {
    never_touch: ['.env', 'secrets/'],
    require_review: ['src/auth/', 'src/payments/'],
  },
  cost: {
    model_preference: 'sonnet',
    cost_multiplier: 3,
    base_iterations: 5,
    iteration_multiplier: 3,
    revision_budget_percent: 50,
    max_revision_loops: 3,
    abort_on_fatal: true,
    fallback_cost_per_minute: 0.5,
    phase_budget_cap: 100,
    phase_budget_overflow: 0.1,
    session_budget_cap: 500,
    budget_warning_threshold: 0.75,
  },
  fallback_engine: {
    enabled: true,
    engines: [
      {
        name: 'codex',
        command: 'codex run',
        budget_cap: 50,
        priority: 1,
      },
    ],
    trigger_on: ['rate-limit', 'quota-exceeded'],
  },
  sandbox: {
    allowed_env: ['PATH', 'HOME', 'NODE_ENV'],
  },
}

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('KarimoConfigSchema', () => {
  describe('valid configs', () => {
    test('accepts minimal valid config', () => {
      const result = KarimoConfigSchema.safeParse(VALID_MINIMAL_CONFIG)
      expect(result.success).toBe(true)
    })

    test('accepts complete valid config', () => {
      const result = KarimoConfigSchema.safeParse(VALID_COMPLETE_CONFIG)
      expect(result.success).toBe(true)
    })

    test('applies defaults for optional fields', () => {
      const result = KarimoConfigSchema.safeParse(VALID_MINIMAL_CONFIG)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.cost.model_preference).toBe('sonnet')
        expect(result.data.cost.cost_multiplier).toBe(3)
        expect(result.data.boundaries.never_touch).toEqual([])
        expect(result.data.fallback_engine.enabled).toBe(false)
      }
    })

    test('accepts null for phase_budget_cap', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        cost: {
          phase_budget_cap: null,
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.cost.phase_budget_cap).toBeNull()
      }
    })

    test('accepts null for session_budget_cap', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        cost: {
          session_budget_cap: null,
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.cost.session_budget_cap).toBeNull()
      }
    })
  })

  describe('missing required fields', () => {
    test('rejects config without project.name', () => {
      const config = {
        project: {},
        commands: VALID_MINIMAL_CONFIG.commands,
        rules: VALID_MINIMAL_CONFIG.rules,
        sandbox: VALID_MINIMAL_CONFIG.sandbox,
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('rejects config without commands', () => {
      const config = {
        project: VALID_MINIMAL_CONFIG.project,
        rules: VALID_MINIMAL_CONFIG.rules,
        sandbox: VALID_MINIMAL_CONFIG.sandbox,
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('rejects config without rules', () => {
      const config = {
        project: VALID_MINIMAL_CONFIG.project,
        commands: VALID_MINIMAL_CONFIG.commands,
        sandbox: VALID_MINIMAL_CONFIG.sandbox,
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('rejects config without sandbox', () => {
      const config = {
        project: VALID_MINIMAL_CONFIG.project,
        commands: VALID_MINIMAL_CONFIG.commands,
        rules: VALID_MINIMAL_CONFIG.rules,
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('empty arrays', () => {
    test('rejects empty rules array', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        rules: [],
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('rejects empty sandbox.allowed_env array', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        sandbox: {
          allowed_env: [],
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('type validation', () => {
    test('rejects string where number expected', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        cost: {
          cost_multiplier: 'three',
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('rejects negative cost_multiplier', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        cost: {
          cost_multiplier: -1,
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('rejects cost_multiplier below minimum (0.5)', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        cost: {
          cost_multiplier: 0.3,
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('rejects invalid trigger_on values', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        fallback_engine: {
          enabled: true,
          engines: [],
          trigger_on: ['invalid-trigger'],
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })

    test('accepts valid trigger_on values', () => {
      const config = {
        ...VALID_MINIMAL_CONFIG,
        fallback_engine: {
          enabled: true,
          engines: [],
          trigger_on: ['rate-limit', 'quota-exceeded', 'auth-failure', 'timeout'],
        },
      }
      const result = KarimoConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })
})

// =============================================================================
// Defaults Tests
// =============================================================================

describe('DEFAULT_COST', () => {
  test('matches schema defaults', () => {
    const result = KarimoConfigSchema.safeParse(VALID_MINIMAL_CONFIG)
    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.cost.model_preference).toBe(DEFAULT_COST.model_preference)
      expect(result.data.cost.cost_multiplier).toBe(DEFAULT_COST.cost_multiplier)
      expect(result.data.cost.base_iterations).toBe(DEFAULT_COST.base_iterations)
      expect(result.data.cost.iteration_multiplier).toBe(DEFAULT_COST.iteration_multiplier)
      expect(result.data.cost.revision_budget_percent).toBe(DEFAULT_COST.revision_budget_percent)
      expect(result.data.cost.max_revision_loops).toBe(DEFAULT_COST.max_revision_loops)
      expect(result.data.cost.abort_on_fatal).toBe(DEFAULT_COST.abort_on_fatal)
      expect(result.data.cost.fallback_cost_per_minute).toBe(DEFAULT_COST.fallback_cost_per_minute)
      expect(result.data.cost.phase_budget_cap).toBe(DEFAULT_COST.phase_budget_cap)
      expect(result.data.cost.phase_budget_overflow).toBe(DEFAULT_COST.phase_budget_overflow)
      expect(result.data.cost.session_budget_cap).toBe(DEFAULT_COST.session_budget_cap)
      expect(result.data.cost.budget_warning_threshold).toBe(DEFAULT_COST.budget_warning_threshold)
    }
  })
})

// =============================================================================
// Loader Tests
// =============================================================================

describe('Config Loader', () => {
  /**
   * Helper to create a unique test directory for each test.
   */
  function createTestDir(): { testDir: string; karimoDir: string; configPath: string } {
    const testDir = join('/tmp', `karimo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const karimoDir = join(testDir, '.karimo')
    const configPath = join(karimoDir, 'config.yaml')
    mkdirSync(karimoDir, { recursive: true })
    return { testDir, karimoDir, configPath }
  }

  describe('findConfigPath', () => {
    test('finds config in current directory', () => {
      const { testDir, configPath } = createTestDir()
      try {
        writeFileSync(configPath, stringifyYaml(VALID_MINIMAL_CONFIG))

        const result = findConfigPath(testDir)
        expect(result.configPath).toBe(configPath)
        expect(result.rootDir).toBe(testDir)
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    test('finds config in parent directory', () => {
      const { testDir, configPath } = createTestDir()
      try {
        const subDir = join(testDir, 'subdir', 'nested')
        mkdirSync(subDir, { recursive: true })
        writeFileSync(configPath, stringifyYaml(VALID_MINIMAL_CONFIG))

        const result = findConfigPath(subDir)
        expect(result.configPath).toBe(configPath)
        expect(result.rootDir).toBe(testDir)
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    test('throws ConfigNotFoundError when no config exists', () => {
      const { testDir, karimoDir } = createTestDir()
      try {
        rmSync(karimoDir, { recursive: true, force: true })

        expect(() => findConfigPath(testDir)).toThrow(ConfigNotFoundError)
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })
  })

  describe('loadConfigSync', () => {
    test('loads and validates valid config', () => {
      const { testDir, configPath } = createTestDir()
      try {
        writeFileSync(configPath, stringifyYaml(VALID_MINIMAL_CONFIG))

        const result = loadConfigSync(testDir)
        expect(result.config.project.name).toBe('test-project')
        expect(result.configPath).toBe(configPath)
        expect(result.rootDir).toBe(testDir)
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    test('throws ConfigParseError for invalid YAML', () => {
      const { testDir, configPath } = createTestDir()
      try {
        writeFileSync(configPath, 'invalid: yaml: syntax: [')

        expect(() => loadConfigSync(testDir)).toThrow(ConfigParseError)
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    test('throws ConfigValidationError for invalid config', () => {
      const { testDir, configPath } = createTestDir()
      try {
        writeFileSync(configPath, stringifyYaml({ project: {} }))

        expect(() => loadConfigSync(testDir)).toThrow(ConfigValidationError)
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })

    test('ConfigValidationError includes field paths', () => {
      const { testDir, configPath } = createTestDir()
      try {
        writeFileSync(configPath, stringifyYaml({ project: {} }))

        try {
          loadConfigSync(testDir)
          expect(true).toBe(false) // Should not reach here
        } catch (error) {
          expect(error).toBeInstanceOf(ConfigValidationError)
          const validationError = error as ConfigValidationError
          const paths = validationError.getFieldPaths()
          expect(paths.length).toBeGreaterThan(0)
        }
      } finally {
        rmSync(testDir, { recursive: true, force: true })
      }
    })
  })
})
