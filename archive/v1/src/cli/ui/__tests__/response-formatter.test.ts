/**
 * Tests for response-formatter module.
 */
import { describe, expect, it } from 'bun:test'
import { GN, BOLD, RST } from '../colors'
import {
  convertMarkdownBold,
  countQuestions,
  findQuestionBlocks,
  formatAgentResponse,
  hasQuestions,
  isQuestionLine,
} from '../response-formatter'

describe('isQuestionLine', () => {
  it('should detect lines ending with question mark', () => {
    expect(isQuestionLine('What is the feature?')).toBe(true)
    expect(isQuestionLine('How does this work?')).toBe(true)
    expect(isQuestionLine('This is a statement.')).toBe(false)
  })

  it('should detect lines starting with question words', () => {
    expect(isQuestionLine('What the user expects')).toBe(true)
    expect(isQuestionLine('How the system works')).toBe(true)
    expect(isQuestionLine('Can we proceed')).toBe(true)
    expect(isQuestionLine('Should this be enabled')).toBe(true)
  })

  it('should handle case-insensitive question words', () => {
    // Question detection is case-insensitive (we lowercase before checking)
    expect(isQuestionLine('WHAT is this')).toBe(true)
    expect(isQuestionLine('what is this')).toBe(true)
    expect(isQuestionLine('What Is This')).toBe(true)
  })

  it('should detect continuation list items', () => {
    // After a question line, list items are considered part of the question
    expect(isQuestionLine('- Adding automated tests', true)).toBe(true)
    expect(isQuestionLine('* Extending the tokens page', true)).toBe(true)
    expect(isQuestionLine('1. First option', true)).toBe(true)
    expect(isQuestionLine('2) Second option', true)).toBe(true)

    // But not without previous question context
    expect(isQuestionLine('- Adding automated tests', false)).toBe(false)
  })

  it('should return false for empty lines', () => {
    expect(isQuestionLine('')).toBe(false)
    expect(isQuestionLine('   ')).toBe(false)
    expect(isQuestionLine('', true)).toBe(false) // Even after a question
  })

  it('should not match partial word matches', () => {
    // "can" should not match "cancel" or "candidate"
    expect(isQuestionLine('cancel the operation')).toBe(false)
    expect(isQuestionLine('candidate for review')).toBe(false)
  })
})

describe('findQuestionBlocks', () => {
  it('should find single-line questions', () => {
    const text = 'Some text.\nWhat is the feature?\nMore text.'
    const blocks = findQuestionBlocks(text)

    expect(blocks).toEqual([[1, 1]])
  })

  it('should find multi-line question blocks', () => {
    const text = `Some intro text.

Are we:
- Adding automated tests
- Extending the tokens page

Some other text.`

    const blocks = findQuestionBlocks(text)

    // The block should span from "Are we:" through the list items
    expect(blocks.length).toBe(1)
    expect(blocks[0]![0]).toBe(2) // "Are we:" line
    expect(blocks[0]![1]).toBe(4) // "- Extending..." line
  })

  it('should find multiple question blocks', () => {
    const text = `What is the feature?

Some explanation.

How should it work?`

    const blocks = findQuestionBlocks(text)

    expect(blocks.length).toBe(2)
  })

  it('should handle text with no questions', () => {
    const text = 'This is a statement.\nAnother statement.\nNo questions here.'
    const blocks = findQuestionBlocks(text)

    expect(blocks).toEqual([])
  })

  it('should handle question at end of text', () => {
    const text = 'Some text.\nWhat do you think?'
    const blocks = findQuestionBlocks(text)

    expect(blocks).toEqual([[1, 1]])
  })

  it('should handle question at start of text', () => {
    const text = 'What is this?\nSome explanation.'
    const blocks = findQuestionBlocks(text)

    expect(blocks).toEqual([[0, 0]])
  })
})

describe('convertMarkdownBold', () => {
  it('should convert single bold section', () => {
    const result = convertMarkdownBold('This is **bold** text')
    expect(result).toBe(`This is ${BOLD}bold${RST} text`)
  })

  it('should convert multiple bold sections', () => {
    const result = convertMarkdownBold('**First** and **second**')
    expect(result).toBe(`${BOLD}First${RST} and ${BOLD}second${RST}`)
  })

  it('should handle text without bold', () => {
    const text = 'Plain text without bold'
    expect(convertMarkdownBold(text)).toBe(text)
  })

  it('should handle multiline text', () => {
    const text = '**Line one**\n**Line two**'
    const result = convertMarkdownBold(text)
    expect(result).toContain(`${BOLD}Line one${RST}`)
    expect(result).toContain(`${BOLD}Line two${RST}`)
  })

  it('should handle empty bold markers', () => {
    // Empty bold markers should not match
    const text = 'This is **** empty'
    expect(convertMarkdownBold(text)).toBe(text)
  })
})

describe('formatAgentResponse', () => {
  it('should highlight questions in green', () => {
    const response = 'Some text.\nWhat is the feature?\nMore text.'
    const result = formatAgentResponse(response)

    expect(result).toContain(`${GN}What is the feature?${RST}`)
    expect(result).toContain('Some text.')
    expect(result).toContain('More text.')
  })

  it('should convert bold markdown', () => {
    const response = 'This is **important** text.'
    const result = formatAgentResponse(response)

    expect(result).toContain(`${BOLD}important${RST}`)
  })

  it('should handle both questions and bold', () => {
    const response = 'What is **this** feature?'
    const result = formatAgentResponse(response)

    // Should have both bold and green formatting
    expect(result).toContain(BOLD)
    expect(result).toContain(GN)
  })

  it('should respect highlightQuestions option', () => {
    const response = 'What is this?'
    const result = formatAgentResponse(response, { highlightQuestions: false })

    expect(result).not.toContain(GN)
    expect(result).toBe('What is this?')
  })

  it('should respect convertBold option', () => {
    const response = 'This is **bold**.'
    const result = formatAgentResponse(response, { convertBold: false })

    expect(result).not.toContain(BOLD)
    expect(result).toBe('This is **bold**.')
  })

  it('should handle text with no formatting needed', () => {
    const response = 'Plain text statement.'
    const result = formatAgentResponse(response)

    expect(result).toBe('Plain text statement.')
  })
})

describe('hasQuestions', () => {
  it('should return true for text with questions', () => {
    expect(hasQuestions('What is this?')).toBe(true)
    expect(hasQuestions('Some text.\nHow does it work?\nMore text.')).toBe(true)
  })

  it('should return false for text without questions', () => {
    expect(hasQuestions('This is a statement.')).toBe(false)
    expect(hasQuestions('No questions here.')).toBe(false)
  })
})

describe('countQuestions', () => {
  it('should count question blocks', () => {
    expect(countQuestions('What? Where?')).toBe(1) // Same line = 1 block (starts with What)

    const multiBlock = `What is this?

How does it work?`
    expect(countQuestions(multiBlock)).toBe(2)
  })

  it('should return 0 for no questions', () => {
    expect(countQuestions('No questions.')).toBe(0)
  })
})
