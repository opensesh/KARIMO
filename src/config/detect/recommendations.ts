/**
 * Command Recommendations
 *
 * Provides stack-aware command suggestions for test and typecheck.
 * Used during init when these commands aren't auto-detected.
 */

/**
 * A single command recommendation with suggestion text.
 */
export interface CommandRecommendation {
  /** The suggested command */
  command: string
  /** Human-readable description */
  suggestion: string
}

/**
 * Recommendations for both test and typecheck commands.
 */
export interface CommandRecommendations {
  test: CommandRecommendation[]
  typecheck: CommandRecommendation[]
}

/**
 * Get stack-aware command recommendations based on runtime and language.
 *
 * @param runtime - Detected runtime (bun, node, deno, python, go, etc.)
 * @param language - Detected language (typescript, javascript, python, go, etc.)
 * @returns Recommendations for test and typecheck commands
 *
 * @example
 * ```typescript
 * const recs = getCommandRecommendations('bun', 'typescript')
 * // recs.test[0].command === 'bun test'
 * // recs.typecheck[0].command === 'bunx tsc --noEmit'
 * ```
 */
export function getCommandRecommendations(
  runtime: string | null,
  language: string | null
): CommandRecommendations {
  const normalizedRuntime = runtime?.toLowerCase() ?? null
  const normalizedLanguage = language?.toLowerCase() ?? null

  // TypeScript + Bun
  if (normalizedRuntime === 'bun' && normalizedLanguage === 'typescript') {
    return {
      test: [
        { command: 'bun test', suggestion: 'Bun has a built-in test runner' },
        { command: 'bunx vitest', suggestion: 'Vitest is fast and Vite-native' },
      ],
      typecheck: [
        { command: 'bunx tsc --noEmit', suggestion: 'TypeScript compiler check' },
        { command: 'bun run typecheck', suggestion: 'If you have a typecheck script' },
      ],
    }
  }

  // TypeScript + Node
  if (normalizedRuntime === 'node' && normalizedLanguage === 'typescript') {
    return {
      test: [
        { command: 'npx vitest', suggestion: 'Vitest is fast and Vite-native' },
        { command: 'npx jest', suggestion: 'Jest is widely used' },
        { command: 'npm test', suggestion: 'If you have a test script' },
      ],
      typecheck: [
        { command: 'npx tsc --noEmit', suggestion: 'TypeScript compiler check' },
        { command: 'npm run typecheck', suggestion: 'If you have a typecheck script' },
      ],
    }
  }

  // JavaScript + Node
  if (normalizedRuntime === 'node' && normalizedLanguage === 'javascript') {
    return {
      test: [
        { command: 'npx vitest', suggestion: 'Vitest is fast and Vite-native' },
        { command: 'npx jest', suggestion: 'Jest is widely used' },
        { command: 'npm test', suggestion: 'If you have a test script' },
      ],
      typecheck: [
        { command: 'npx tsc --noEmit --allowJs', suggestion: 'TypeScript can check JS files' },
      ],
    }
  }

  // Deno
  if (normalizedRuntime === 'deno') {
    return {
      test: [{ command: 'deno test', suggestion: 'Deno has a built-in test runner' }],
      typecheck: [{ command: 'deno check .', suggestion: 'Deno has built-in type checking' }],
    }
  }

  // Python
  if (normalizedRuntime === 'python' || normalizedLanguage === 'python') {
    return {
      test: [
        { command: 'pytest', suggestion: 'pytest is the standard Python test framework' },
        { command: 'python -m pytest', suggestion: 'Module-based pytest invocation' },
        { command: 'python -m unittest discover', suggestion: 'Built-in unittest' },
      ],
      typecheck: [
        { command: 'mypy .', suggestion: 'mypy is the standard Python type checker' },
        { command: 'pyright', suggestion: 'pyright is fast and VS Code native' },
        { command: 'python -m mypy .', suggestion: 'Module-based mypy invocation' },
      ],
    }
  }

  // Go
  if (normalizedRuntime === 'go' || normalizedLanguage === 'go') {
    return {
      test: [{ command: 'go test ./...', suggestion: 'Go has a built-in test runner' }],
      typecheck: [{ command: 'go vet ./...', suggestion: 'Go has built-in static analysis' }],
    }
  }

  // Rust
  if (normalizedRuntime === 'rust' || normalizedLanguage === 'rust') {
    return {
      test: [{ command: 'cargo test', suggestion: 'Cargo has a built-in test runner' }],
      typecheck: [{ command: 'cargo check', suggestion: 'Cargo check is faster than build' }],
    }
  }

  // Default fallback (generic suggestions)
  return {
    test: [
      { command: 'npm test', suggestion: 'Common npm test script' },
      { command: 'npx vitest', suggestion: 'Vitest works with most projects' },
    ],
    typecheck: [{ command: 'npx tsc --noEmit', suggestion: 'TypeScript compiler check' }],
  }
}

/**
 * Format recommendations for display in the init flow.
 *
 * @param recommendations - Array of recommendations
 * @returns Formatted string for terminal display
 */
export function formatRecommendations(recommendations: CommandRecommendation[]): string {
  return recommendations.map((r) => `  ${r.command} — ${r.suggestion}`).join('\n')
}
