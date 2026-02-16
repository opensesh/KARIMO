/**
 * KARIMO Agents Module Tests
 *
 * Tests for prompt building, sandbox environment, and error handling.
 * Note: ClaudeCodeEngine execution tests are skipped unless Claude Code is installed.
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import type { Task } from '@/types'
import type { KarimoConfig } from '@/config/schema'
import {
  buildAgentPrompt,
  buildAgentEnvironment,
  isEnvVariableSafe,
  getExcludedEnvVariables,
  getIncludedEnvVariables,
  ClaudeCodeEngine,
  AgentNotFoundError,
  AgentSpawnError,
  AgentTimeoutError,
  AgentExecutionError,
} from '../index'

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1a',
    title: 'Implement user authentication',
    description: 'Add login/logout functionality with JWT tokens',
    depends_on: [],
    complexity: 5,
    estimated_iterations: 10,
    cost_ceiling: 15,
    revision_budget: 7.5,
    priority: 'must',
    assigned_to: 'claude-code',
    success_criteria: [
      'Login endpoint returns valid JWT',
      'Logout invalidates the token',
      'Protected routes reject invalid tokens',
    ],
    files_affected: ['src/auth/**', 'src/middleware/auth.ts'],
    agent_context: 'Use bcrypt for password hashing',
    ...overrides,
  }
}

function createMockConfig(overrides: Partial<KarimoConfig> = {}): KarimoConfig {
  return {
    project: {
      name: 'test-project',
      language: 'typescript',
      framework: 'express',
      runtime: 'bun',
      database: 'postgres',
    },
    commands: {
      build: 'bun run build',
      lint: 'bun run lint',
      test: 'bun test',
      typecheck: 'bun run typecheck',
    },
    rules: ['Use TypeScript strict mode', 'No any types', 'All functions must have return types'],
    boundaries: {
      never_touch: ['package-lock.json', '.env*', 'migrations/**'],
      require_review: ['src/auth/**', 'src/middleware/**'],
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
      phase_budget_cap: null,
      phase_budget_overflow: 0.1,
      session_budget_cap: null,
      budget_warning_threshold: 0.75,
    },
    fallback_engine: {
      enabled: false,
      engines: [],
      trigger_on: ['rate-limit', 'quota-exceeded'],
    },
    sandbox: {
      allowed_env: ['NODE_ENV', 'DEBUG', 'LOG_LEVEL'],
    },
    ...overrides,
  }
}

// =============================================================================
// Prompt Builder Tests
// =============================================================================

describe('buildAgentPrompt', () => {
  it('should include task title and description', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Implement user authentication')
    expect(prompt).toContain('Add login/logout functionality with JWT tokens')
    expect(prompt).toContain('task-1a')
    expect(prompt).toContain('phase-1')
  })

  it('should include success criteria', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Success Criteria')
    expect(prompt).toContain('Login endpoint returns valid JWT')
    expect(prompt).toContain('Logout invalidates the token')
    expect(prompt).toContain('Protected routes reject invalid tokens')
  })

  it('should include files affected as scope', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Scope')
    expect(prompt).toContain('src/auth/**')
    expect(prompt).toContain('src/middleware/auth.ts')
  })

  it('should include agent context when provided', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Additional Context')
    expect(prompt).toContain('Use bcrypt for password hashing')
  })

  it('should include project rules', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Project Rules')
    expect(prompt).toContain('Use TypeScript strict mode')
    expect(prompt).toContain('No any types')
  })

  it('should include never_touch boundaries', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('FORBIDDEN Files')
    expect(prompt).toContain('package-lock.json')
    expect(prompt).toContain('.env*')
    expect(prompt).toContain('migrations/**')
  })

  it('should include require_review boundaries', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Caution Files')
    expect(prompt).toContain('src/auth/**')
    expect(prompt).toContain('src/middleware/**')
  })

  it('should include validation commands', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Validation')
    expect(prompt).toContain('bun run build')
    expect(prompt).toContain('bun run typecheck')
    expect(prompt).toContain('bun run lint')
  })

  it('should include budget information', () => {
    const task = createMockTask()
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).toContain('Budget')
    expect(prompt).toContain('5/10')
    expect(prompt).toContain('$15')
  })

  it('should handle task without agent_context', () => {
    const task = createMockTask()
    // Remove agent_context to test optional field handling
    delete (task as { agent_context?: string }).agent_context
    const config = createMockConfig()

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).not.toContain('Additional Context')
  })

  it('should handle empty boundaries', () => {
    const task = createMockTask()
    const config = createMockConfig({
      boundaries: { never_touch: [], require_review: [] },
    })

    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir: '/project',
      phaseId: 'phase-1',
    })

    expect(prompt).not.toContain('File Boundaries')
    expect(prompt).not.toContain('FORBIDDEN Files')
    expect(prompt).not.toContain('Caution Files')
  })
})

// =============================================================================
// Sandbox Environment Tests
// =============================================================================

describe('buildAgentEnvironment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset process.env to a controlled state
    process.env = {
      PATH: '/usr/bin',
      HOME: '/home/user',
      TERM: 'xterm',
      SHELL: '/bin/bash',
      USER: 'testuser',
      LANG: 'en_US.UTF-8',
      NODE_ENV: 'test',
      DEBUG: 'true',
      LOG_LEVEL: 'info',
      GITHUB_TOKEN: 'secret-token',
      AWS_SECRET_ACCESS_KEY: 'aws-secret',
      CUSTOM_VAR: 'custom-value',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should always include essential variables', () => {
    const config = createMockConfig()
    const env = buildAgentEnvironment(config)

    expect(env['PATH']).toBe('/usr/bin')
    expect(env['HOME']).toBe('/home/user')
    expect(env['TERM']).toBe('xterm')
    expect(env['SHELL']).toBe('/bin/bash')
  })

  it('should include explicitly allowed variables', () => {
    const config = createMockConfig({
      sandbox: { allowed_env: ['NODE_ENV', 'DEBUG', 'LOG_LEVEL'] },
    })
    const env = buildAgentEnvironment(config)

    expect(env['NODE_ENV']).toBe('test')
    expect(env['DEBUG']).toBe('true')
    expect(env['LOG_LEVEL']).toBe('info')
  })

  it('should exclude sensitive variables even if allowed', () => {
    const config = createMockConfig({
      sandbox: { allowed_env: ['GITHUB_TOKEN', 'AWS_SECRET_ACCESS_KEY'] },
    })
    const env = buildAgentEnvironment(config)

    expect(env['GITHUB_TOKEN']).toBeUndefined()
    expect(env['AWS_SECRET_ACCESS_KEY']).toBeUndefined()
  })

  it('should not include non-allowed variables', () => {
    const config = createMockConfig({
      sandbox: { allowed_env: ['NODE_ENV'] },
    })
    const env = buildAgentEnvironment(config)

    expect(env['CUSTOM_VAR']).toBeUndefined()
  })
})

describe('isEnvVariableSafe', () => {
  it('should return true for always-included variables', () => {
    expect(isEnvVariableSafe('PATH', [])).toBe(true)
    expect(isEnvVariableSafe('HOME', [])).toBe(true)
    expect(isEnvVariableSafe('TERM', [])).toBe(true)
  })

  it('should return false for always-excluded variables', () => {
    expect(isEnvVariableSafe('GITHUB_TOKEN', ['GITHUB_TOKEN'])).toBe(false)
    expect(isEnvVariableSafe('AWS_SECRET_ACCESS_KEY', ['AWS_SECRET_ACCESS_KEY'])).toBe(false)
    expect(isEnvVariableSafe('ANTHROPIC_API_KEY', ['ANTHROPIC_API_KEY'])).toBe(false)
  })

  it('should return true for explicitly allowed variables', () => {
    expect(isEnvVariableSafe('NODE_ENV', ['NODE_ENV'])).toBe(true)
    expect(isEnvVariableSafe('DEBUG', ['DEBUG', 'LOG_LEVEL'])).toBe(true)
  })

  it('should return false for non-allowed variables', () => {
    expect(isEnvVariableSafe('CUSTOM_VAR', ['NODE_ENV'])).toBe(false)
    expect(isEnvVariableSafe('MY_SECRET', [])).toBe(false)
  })
})

describe('getExcludedEnvVariables', () => {
  it('should return a list of excluded variables', () => {
    const excluded = getExcludedEnvVariables()

    expect(excluded).toContain('GITHUB_TOKEN')
    expect(excluded).toContain('AWS_SECRET_ACCESS_KEY')
    expect(excluded).toContain('ANTHROPIC_API_KEY')
    expect(excluded).toContain('KARIMO_DASHBOARD_API_KEY')
  })
})

describe('getIncludedEnvVariables', () => {
  it('should return a list of always-included variables', () => {
    const included = getIncludedEnvVariables()

    expect(included).toContain('PATH')
    expect(included).toContain('HOME')
    expect(included).toContain('TERM')
    expect(included).toContain('SHELL')
  })
})

// =============================================================================
// Error Classes Tests
// =============================================================================

describe('Agent Error Classes', () => {
  describe('AgentNotFoundError', () => {
    it('should include engine name in message', () => {
      const error = new AgentNotFoundError('claude-code')

      expect(error.name).toBe('AgentNotFoundError')
      expect(error.engine).toBe('claude-code')
      expect(error.message).toContain('claude-code')
      expect(error.message).toContain('not installed')
    })
  })

  describe('AgentSpawnError', () => {
    it('should include engine and reason', () => {
      const error = new AgentSpawnError('claude-code', 'Permission denied')

      expect(error.name).toBe('AgentSpawnError')
      expect(error.engine).toBe('claude-code')
      expect(error.reason).toBe('Permission denied')
      expect(error.message).toContain('Permission denied')
    })
  })

  describe('AgentTimeoutError', () => {
    it('should include engine and timeout', () => {
      const error = new AgentTimeoutError('claude-code', 30000)

      expect(error.name).toBe('AgentTimeoutError')
      expect(error.engine).toBe('claude-code')
      expect(error.timeoutMs).toBe(30000)
      expect(error.message).toContain('30000ms')
    })
  })

  describe('AgentExecutionError', () => {
    it('should include engine, exit code, and stderr', () => {
      const error = new AgentExecutionError('claude-code', 1, 'Build failed')

      expect(error.name).toBe('AgentExecutionError')
      expect(error.engine).toBe('claude-code')
      expect(error.exitCode).toBe(1)
      expect(error.stderr).toBe('Build failed')
      expect(error.message).toContain('exit code 1')
    })
  })
})

// =============================================================================
// Claude Code Engine Tests
// =============================================================================

describe('ClaudeCodeEngine', () => {
  it('should have correct name', () => {
    const engine = new ClaudeCodeEngine()
    expect(engine.name).toBe('claude-code')
  })

  it('should check availability', async () => {
    const engine = new ClaudeCodeEngine()

    // This will return true or false depending on whether Claude Code is installed
    const available = await engine.isAvailable()
    expect(typeof available).toBe('boolean')
  })

  // Skip execution tests unless we're in an environment with Claude Code
  // These tests would be run in CI with Claude Code available
  it.skip('should execute with valid prompt', async () => {
    const engine = new ClaudeCodeEngine()

    const result = await engine.execute({
      prompt: 'echo "Hello, World!"',
      workdir: process.cwd(),
      env: { PATH: process.env['PATH'] ?? '' },
    })

    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
  })
})
