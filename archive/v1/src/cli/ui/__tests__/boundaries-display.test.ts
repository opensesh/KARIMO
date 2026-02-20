/**
 * Tests for boundaries-display module.
 */
import { describe, expect, it } from 'bun:test'
import {
  formatBoundariesDisplay,
  formatBoundaryList,
  truncatePattern,
} from '../boundaries-display'

describe('formatBoundaryList', () => {
  it('should return "none" for empty array', () => {
    expect(formatBoundaryList([])).toBe('none')
  })

  it('should format single pattern inline', () => {
    expect(formatBoundaryList(['.env'])).toBe('.env')
  })

  it('should format few patterns inline with commas', () => {
    const result = formatBoundaryList(['.env', '*.lock', 'secrets/'])
    expect(result).toBe('.env, *.lock, secrets/')
  })

  it('should switch to vertical list for many patterns', () => {
    const patterns = ['.env', '.env.*', '*.lock', '*.lockb', 'secrets/', 'credentials/']
    const result = formatBoundaryList(patterns)

    expect(result).toContain('  - .env')
    expect(result).toContain('  - secrets/')
    expect(result.split('\n').length).toBe(6)
  })

  it('should respect useVerticalList option', () => {
    const patterns = ['.env', '*.lock']

    const inline = formatBoundaryList(patterns, { useVerticalList: false })
    expect(inline).toBe('.env, *.lock')

    const vertical = formatBoundaryList(patterns, { useVerticalList: true })
    expect(vertical).toContain('  - .env')
    expect(vertical).toContain('  - *.lock')
  })

  it('should truncate long lists', () => {
    const patterns = Array.from({ length: 20 }, (_, i) => `pattern-${i + 1}`)
    const result = formatBoundaryList(patterns, { maxItems: 5 })

    expect(result).toContain('pattern-1')
    expect(result).toContain('pattern-5')
    expect(result).not.toContain('pattern-6')
    expect(result).toContain('... and 15 more')
  })

  it('should respect maxWidth for inline lists', () => {
    const patterns = ['a-long-pattern.ts', 'another-long-pattern.ts', 'third.ts']
    const result = formatBoundaryList(patterns, { maxWidth: 30, useVerticalList: false })

    // Should wrap to multiple lines
    expect(result.split('\n').length).toBeGreaterThan(1)
  })

  it('should handle custom wrapIndent', () => {
    const patterns = ['one', 'two', 'three', 'four', 'five', 'six']
    const result = formatBoundaryList(patterns, { wrapIndent: 4, useVerticalList: true })

    expect(result).toContain('    - one')
  })
})

describe('formatBoundariesDisplay', () => {
  it('should format both sections', () => {
    const result = formatBoundariesDisplay(['.env', '*.lock'], ['src/auth/**', 'middleware.ts'])

    expect(result).toContain('never_touch: .env, *.lock')
    expect(result).toContain('require_review: src/auth/**, middleware.ts')
    expect(result).toContain('Protect critical files')
  })

  it('should show "none" for empty sections', () => {
    const result = formatBoundariesDisplay([], [])

    expect(result).toContain('never_touch: none')
    expect(result).toContain('require_review: none')
  })

  it('should use vertical format for long lists', () => {
    const neverTouch = ['.env', '.env.*', '*.lock', '*.lockb', 'secrets/', 'credentials/']
    const result = formatBoundariesDisplay(neverTouch, [])

    expect(result).toContain('never_touch:')
    expect(result).toContain('  - .env')
    expect(result).toContain('  - credentials/')
  })

  it('should handle mixed formats', () => {
    // Short never_touch (inline), long require_review (vertical)
    const neverTouch = ['.env']
    const requireReview = ['a', 'b', 'c', 'd', 'e', 'f']
    const result = formatBoundariesDisplay(neverTouch, requireReview)

    expect(result).toContain('never_touch: .env')
    expect(result).toContain('require_review:')
    expect(result).toContain('  - a')
  })
})

describe('truncatePattern', () => {
  it('should not truncate short patterns', () => {
    expect(truncatePattern('.env', 50)).toBe('.env')
    expect(truncatePattern('src/auth/**', 50)).toBe('src/auth/**')
  })

  it('should truncate long patterns', () => {
    const pattern = 'very/long/path/to/some/deeply/nested/file.ts'
    const result = truncatePattern(pattern, 20)

    expect(result.length).toBeLessThanOrEqual(20)
    expect(result).toContain('...')
  })

  it('should prefer truncating from beginning for paths', () => {
    const pattern = 'src/very/long/path/to/file.ts'
    const result = truncatePattern(pattern, 20)

    // Should keep the end of the path visible
    expect(result).toEndWith('file.ts')
    expect(result).toStartWith('...')
  })

  it('should handle very short maxWidth', () => {
    const result = truncatePattern('some/path/file.ts', 5)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('should handle non-path patterns', () => {
    const pattern = 'a-very-long-pattern-name-that-exceeds-limit'
    const result = truncatePattern(pattern, 20)

    expect(result.length).toBeLessThanOrEqual(20)
    expect(result).toEndWith('...')
  })
})
