/**
 * Tests for input-sanitizer module.
 */
import { describe, expect, it } from 'bun:test'
import {
  createFlattenedPreview,
  hasComplexFormatting,
  processUserInput,
  sanitizeForDisplay,
} from '../input-sanitizer'

describe('sanitizeForDisplay', () => {
  it('should normalize CRLF line endings', () => {
    const input = 'line1\r\nline2\r\nline3'
    const result = sanitizeForDisplay(input)
    expect(result).not.toContain('\r')
    expect(result).toBe('line1\nline2\nline3')
  })

  it('should normalize CR line endings', () => {
    const input = 'line1\rline2\rline3'
    const result = sanitizeForDisplay(input)
    expect(result).not.toContain('\r')
    expect(result).toBe('line1\nline2\nline3')
  })

  it('should collapse multiple consecutive newlines', () => {
    const input = 'para1\n\n\n\npara2'
    const result = sanitizeForDisplay(input)
    expect(result).toBe('para1\n\npara2')
  })

  it('should trim whitespace from each line', () => {
    const input = '  line1  \n  line2  '
    const result = sanitizeForDisplay(input)
    expect(result).toBe('line1\nline2')
  })

  it('should escape numbered list markers', () => {
    const input = '1. First item\n2. Second item\n3. Third item'
    const result = sanitizeForDisplay(input)
    expect(result).toBe('1) First item\n2) Second item\n3) Third item')
  })

  it('should escape bullet markers', () => {
    const input = '• Item one\n◦ Item two\n▪ Item three'
    const result = sanitizeForDisplay(input)
    expect(result).toBe('- Item one\n- Item two\n- Item three')
  })

  it('should preserve asterisk and dash bullets', () => {
    const input = '- Item one\n* Item two'
    const result = sanitizeForDisplay(input)
    expect(result).toBe('- Item one\n* Item two')
  })

  it('should handle mixed content', () => {
    const input = 'Meeting notes:\n\n1. Discuss roadmap\n2. Review budget\n\n• Action items\n• Follow-up'
    const result = sanitizeForDisplay(input)
    expect(result).toContain('1) Discuss roadmap')
    expect(result).toContain('2) Review budget')
    expect(result).toContain('- Action items')
  })

  it('should handle empty input', () => {
    const result = sanitizeForDisplay('')
    expect(result).toBe('')
  })

  it('should handle input with only whitespace', () => {
    const result = sanitizeForDisplay('   \n\n   ')
    expect(result).toBe('')
  })

  it('should not modify regular text', () => {
    const input = 'This is a simple sentence with no special formatting.'
    const result = sanitizeForDisplay(input)
    expect(result).toBe(input)
  })
})

describe('createFlattenedPreview', () => {
  it('should return single line as-is if under max length', () => {
    const input = 'Short line'
    const result = createFlattenedPreview(input)
    expect(result).toBe('Short line')
  })

  it('should truncate single line over max length', () => {
    const input = 'a'.repeat(150)
    const result = createFlattenedPreview(input, 100)
    expect(result.length).toBe(100)
    expect(result).toEndWith('...')
  })

  it('should join multiple lines with separator', () => {
    const input = 'Line one\nLine two\nLine three'
    const result = createFlattenedPreview(input)
    expect(result).toBe('Line one │ Line two │ Line three')
  })

  it('should truncate joined lines if over max length', () => {
    const input = 'Line one with text\nLine two with text\nLine three with text\nLine four with text'
    const result = createFlattenedPreview(input, 50)
    expect(result.length).toBe(50)
    expect(result).toEndWith('...')
  })

  it('should handle empty lines', () => {
    const input = 'Line one\n\nLine three'
    const result = createFlattenedPreview(input)
    expect(result).toBe('Line one │ Line three')
  })

  it('should limit to 5 lines', () => {
    const input = 'L1\nL2\nL3\nL4\nL5\nL6\nL7'
    const result = createFlattenedPreview(input)
    expect(result.split(' │ ').length).toBe(5)
    expect(result).not.toContain('L6')
  })

  it('should handle empty input', () => {
    const result = createFlattenedPreview('')
    expect(result).toBe('')
  })
})

describe('processUserInput', () => {
  it('should return original and display versions', () => {
    const raw = '1. First\n2. Second'
    const result = processUserInput(raw)

    expect(result.original).toBe(raw)
    expect(result.display).toBe('1) First\n2) Second')
  })

  it('should preserve original with complex formatting', () => {
    const raw = '• Bullet\n\n\n\n• Another'
    const result = processUserInput(raw)

    expect(result.original).toBe(raw)
    expect(result.display).toBe('- Bullet\n\n- Another')
  })

  it('should handle simple text', () => {
    const raw = 'Simple text'
    const result = processUserInput(raw)

    expect(result.original).toBe(raw)
    expect(result.display).toBe(raw)
  })
})

describe('hasComplexFormatting', () => {
  it('should detect numbered lists', () => {
    expect(hasComplexFormatting('1. First item')).toBe(true)
    expect(hasComplexFormatting('Some text\n1. First item')).toBe(true)
  })

  it('should detect bullet lists', () => {
    expect(hasComplexFormatting('- Item')).toBe(true)
    expect(hasComplexFormatting('* Item')).toBe(true)
    expect(hasComplexFormatting('• Item')).toBe(true)
  })

  it('should detect excessive newlines', () => {
    expect(hasComplexFormatting('a\n\n\nb')).toBe(true)
  })

  it('should detect excessive line count', () => {
    const manyLines = Array(7).fill('line').join('\n')
    expect(hasComplexFormatting(manyLines)).toBe(true)
  })

  it('should return false for simple text', () => {
    expect(hasComplexFormatting('Simple text')).toBe(false)
    expect(hasComplexFormatting('Two\nlines')).toBe(false)
  })
})
