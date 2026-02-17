/**
 * Command Recommendations Tests
 */

import { describe, expect, test } from 'bun:test'
import { formatRecommendations, getCommandRecommendations } from '../recommendations'

describe('getCommandRecommendations', () => {
  describe('TypeScript + Bun', () => {
    test('returns bun-specific recommendations', () => {
      const recs = getCommandRecommendations('bun', 'typescript')

      expect(recs.test.length).toBeGreaterThan(0)
      expect(recs.typecheck.length).toBeGreaterThan(0)
      expect(recs.test[0].command).toBe('bun test')
      expect(recs.typecheck[0].command).toBe('bunx tsc --noEmit')
    })
  })

  describe('TypeScript + Node', () => {
    test('returns node-specific recommendations', () => {
      const recs = getCommandRecommendations('node', 'typescript')

      expect(recs.test.length).toBeGreaterThan(0)
      expect(recs.typecheck.length).toBeGreaterThan(0)
      expect(recs.test.some((r) => r.command.includes('vitest'))).toBe(true)
      expect(recs.typecheck[0].command).toBe('npx tsc --noEmit')
    })
  })

  describe('JavaScript + Node', () => {
    test('returns node js recommendations', () => {
      const recs = getCommandRecommendations('node', 'javascript')

      expect(recs.test.length).toBeGreaterThan(0)
      expect(recs.typecheck.length).toBeGreaterThan(0)
      expect(recs.typecheck[0].command).toContain('--allowJs')
    })
  })

  describe('Python', () => {
    test('returns python recommendations via runtime', () => {
      const recs = getCommandRecommendations('python', null)

      expect(recs.test.some((r) => r.command.includes('pytest'))).toBe(true)
      expect(recs.typecheck.some((r) => r.command.includes('mypy'))).toBe(true)
    })

    test('returns python recommendations via language', () => {
      const recs = getCommandRecommendations(null, 'python')

      expect(recs.test.some((r) => r.command.includes('pytest'))).toBe(true)
      expect(recs.typecheck.some((r) => r.command.includes('mypy'))).toBe(true)
    })
  })

  describe('Go', () => {
    test('returns go recommendations', () => {
      const recs = getCommandRecommendations('go', 'go')

      expect(recs.test[0].command).toBe('go test ./...')
      expect(recs.typecheck[0].command).toBe('go vet ./...')
    })
  })

  describe('Deno', () => {
    test('returns deno recommendations', () => {
      const recs = getCommandRecommendations('deno', null)

      expect(recs.test[0].command).toBe('deno test')
      expect(recs.typecheck[0].command).toBe('deno check .')
    })
  })

  describe('Rust', () => {
    test('returns rust recommendations', () => {
      const recs = getCommandRecommendations('rust', 'rust')

      expect(recs.test[0].command).toBe('cargo test')
      expect(recs.typecheck[0].command).toBe('cargo check')
    })
  })

  describe('Unknown stack', () => {
    test('returns generic fallback recommendations', () => {
      const recs = getCommandRecommendations(null, null)

      expect(recs.test.length).toBeGreaterThan(0)
      expect(recs.typecheck.length).toBeGreaterThan(0)
    })

    test('handles unknown runtime gracefully', () => {
      const recs = getCommandRecommendations('unknown-runtime', 'unknown-language')

      expect(recs.test.length).toBeGreaterThan(0)
      expect(recs.typecheck.length).toBeGreaterThan(0)
    })
  })

  describe('case insensitive', () => {
    test('handles uppercase runtime', () => {
      const recs = getCommandRecommendations('BUN', 'TypeScript')

      expect(recs.test[0].command).toBe('bun test')
    })

    test('handles mixed case', () => {
      const recs = getCommandRecommendations('Python', 'PYTHON')

      expect(recs.test.some((r) => r.command.includes('pytest'))).toBe(true)
    })
  })
})

describe('formatRecommendations', () => {
  test('formats recommendations for display', () => {
    const recs = [
      { command: 'bun test', suggestion: 'Built-in test runner' },
      { command: 'bunx vitest', suggestion: 'Vite-native' },
    ]

    const formatted = formatRecommendations(recs)

    expect(formatted).toContain('bun test')
    expect(formatted).toContain('Built-in test runner')
    expect(formatted).toContain('bunx vitest')
    expect(formatted).toContain('Vite-native')
  })

  test('handles empty array', () => {
    const formatted = formatRecommendations([])
    expect(formatted).toBe('')
  })
})
