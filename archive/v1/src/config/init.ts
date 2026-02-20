/**
 * KARIMO Config Init
 *
 * Interactive configuration initialization with auto-detection.
 * Detects project info first, then lets user confirm/edit.
 *
 * UX model: auto-detect → progressive display → user confirms/edits → write config
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import { stringify as stringifyYaml } from 'yaml'
import { formatBoundariesDisplay } from '../cli/ui/boundaries-display'
import {
  COMMON_ALLOWED_ENV,
  DEFAULT_BOUNDARIES,
  DEFAULT_COST,
  DEFAULT_FALLBACK_ENGINE,
} from './defaults'
import {
  type CommandRecommendation,
  type Confidence,
  type DetectedValue,
  type DetectionResult,
  detectProject,
  formatRecommendations,
  getCommandRecommendations,
} from './detect'
import type { KarimoConfig } from './schema'

const CONFIG_DIR = '.karimo'
const CONFIG_FILE = 'config.yaml'

/**
 * Result of running the init flow.
 */
export interface InitResult {
  /** Whether configuration was successfully created */
  success: boolean
  /** Whether the user cancelled (vs. an error) */
  cancelled: boolean
  /** Path to the created config file (only set on success) */
  configPath?: string
}

/**
 * Get confidence indicator symbol.
 * ● high (auto-accepted)
 * ◐ medium (user should verify)
 * ○ low (user likely needs to edit)
 * ? not detected (must fill in)
 */
function getConfidenceIndicator(confidence: Confidence | null): string {
  switch (confidence) {
    case 'high':
      return '●'
    case 'medium':
      return '◐'
    case 'low':
      return '○'
    default:
      return '?'
  }
}

/**
 * Format a detected value for display.
 */
function formatDetected<T>(
  label: string,
  detected: DetectedValue<T> | null,
  fallback = 'not detected'
): string {
  if (!detected) {
    return `${getConfidenceIndicator(null)} ${label}: ${fallback}`
  }
  return `${getConfidenceIndicator(detected.confidence)} ${label}: ${detected.value}`
}

/**
 * Check if a config file already exists.
 */
function configExists(projectRoot: string): boolean {
  const configPath = join(projectRoot, CONFIG_DIR, CONFIG_FILE)
  return existsSync(configPath)
}

/**
 * Write the configuration file.
 */
async function writeConfig(projectRoot: string, config: KarimoConfig): Promise<string> {
  const configDir = join(projectRoot, CONFIG_DIR)
  const configPath = join(configDir, CONFIG_FILE)

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  const yaml = stringifyYaml(config, {
    indent: 2,
    lineWidth: 100,
    nullStr: 'null',
  })

  await Bun.write(configPath, yaml)

  return configPath
}

/**
 * Display scan progress and results.
 */
async function displayScanProgress(result: DetectionResult): Promise<void> {
  const lines: string[] = []

  lines.push(`✓ Project detected (${result.scanDurationMs}ms)`)

  const commandCount = [
    result.commands.build,
    result.commands.lint,
    result.commands.test,
    result.commands.typecheck,
  ].filter(Boolean).length
  lines.push(`✓ Commands detected: ${commandCount}/4`)

  lines.push(`✓ Rules inferred: ${result.rules.length}`)

  const boundaryCount =
    result.boundaries.never_touch.length + result.boundaries.require_review.length
  lines.push(`✓ Boundaries detected: ${boundaryCount} patterns`)

  lines.push(`✓ Sandbox configured: ${result.sandbox.allowed_env.length} env vars`)

  p.note(lines.join('\n'), `Scan complete in ${result.scanDurationMs}ms`)

  // Show warnings if any
  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      p.log.warn(warning)
    }
  }
}

/**
 * Confirm or edit project section.
 */
async function confirmProjectSection(result: DetectionResult): Promise<
  | {
      name: string
      language: string
      framework?: string
      runtime: string
      database?: string
    }
  | symbol
> {
  const projectNote = [
    formatDetected('Name', result.name),
    formatDetected('Language', result.language),
    formatDetected('Framework', result.framework),
    formatDetected('Runtime', result.runtime),
    formatDetected('Database', result.database),
  ].join('\n')

  p.note(projectNote, 'Project')

  const confirmed = await p.confirm({
    message: 'Everything look right?',
    initialValue: true,
  })

  if (p.isCancel(confirmed)) return confirmed

  if (confirmed) {
    const project: {
      name: string
      language: string
      framework?: string
      runtime: string
      database?: string
    } = {
      name: result.name?.value ?? '',
      language: result.language?.value ?? 'typescript',
      runtime: result.runtime?.value ?? 'node',
    }
    if (result.framework?.value) {
      project.framework = result.framework.value
    }
    if (result.database?.value) {
      project.database = result.database.value
    }
    return project
  }

  // User wants to edit - show form with pre-filled values
  // Track if user cancelled during group
  let wasCancelled = false

  const edited = await p.group(
    {
      name: () =>
        p.text({
          message: 'Project name',
          initialValue: result.name?.value ?? '',
          validate: (value) => {
            if (!value.trim()) return 'Project name is required'
            return undefined
          },
        }),
      language: () =>
        p.select({
          message: 'Primary language',
          initialValue: result.language?.value ?? 'typescript',
          options: [
            { value: 'typescript', label: 'TypeScript' },
            { value: 'javascript', label: 'JavaScript' },
            { value: 'python', label: 'Python' },
            { value: 'go', label: 'Go' },
            { value: 'rust', label: 'Rust' },
          ],
        }),
      framework: () =>
        p.text({
          message: 'Framework (optional)',
          initialValue: result.framework?.value ?? '',
          placeholder: 'e.g., react, nextjs, fastapi',
        }),
      runtime: () =>
        p.select({
          message: 'Runtime',
          initialValue: result.runtime?.value ?? 'node',
          options: [
            { value: 'bun', label: 'Bun' },
            { value: 'node', label: 'Node.js' },
            { value: 'deno', label: 'Deno' },
            { value: 'python', label: 'Python' },
            { value: 'go', label: 'Go runtime' },
          ],
        }),
      database: () =>
        p.text({
          message: 'Database (optional)',
          initialValue: result.database?.value ?? '',
          placeholder: 'e.g., postgresql, mongodb, sqlite',
        }),
    },
    {
      onCancel: () => {
        wasCancelled = true
        p.cancel('Init cancelled.')
      },
    }
  )

  // Return cancel symbol if user cancelled during group
  if (wasCancelled) {
    return Symbol.for('cancel')
  }

  const editedProject: {
    name: string
    language: string
    framework?: string
    runtime: string
    database?: string
  } = {
    name: edited.name as string,
    language: edited.language as string,
    runtime: edited.runtime as string,
  }
  const frameworkVal = edited.framework as string
  if (frameworkVal) {
    editedProject.framework = frameworkVal
  }
  const databaseVal = edited.database as string
  if (databaseVal) {
    editedProject.database = databaseVal
  }
  return editedProject
}

/**
 * Confirm a required command (build or lint).
 * Blocks until user provides a valid command.
 */
async function confirmRequiredCommand(
  commandName: string,
  detected: DetectedValue<string> | null,
  placeholder: string,
  examples: string[]
): Promise<string | symbol> {
  if (detected) {
    // Show detected value
    p.log.info(`${getConfidenceIndicator(detected.confidence)} ${commandName}: ${detected.value}`)

    const confirmed = await p.confirm({
      message: `Use this ${commandName.toLowerCase()} command?`,
      initialValue: true,
    })

    if (p.isCancel(confirmed)) return confirmed

    if (confirmed) {
      return detected.value
    }
  } else {
    // Not detected - explain why it's required
    const exampleLines = examples.map((e) => `    ${e}`).join('\n')
    p.log.warn(
      `${commandName} command is required.\n  KARIMO runs ${commandName.toLowerCase()} after every PR to verify code integrity.\n\n  Common examples:\n${exampleLines}`
    )
  }

  // Get user input
  const input = await p.text({
    message: `${commandName} command`,
    placeholder,
    validate: (value) => {
      if (!value.trim()) return `${commandName} command is required`
      return undefined
    },
  })

  if (p.isCancel(input)) return input

  return input as string
}

/**
 * Confirm a recommended command (test or typecheck).
 * Shows warning but allows user to skip.
 */
async function confirmRecommendedCommand(
  commandName: string,
  detected: DetectedValue<string> | null,
  placeholder: string,
  recommendations: CommandRecommendation[],
  usageDescription: string
): Promise<string | null | symbol> {
  if (detected) {
    // Show detected value
    p.log.info(`${getConfidenceIndicator(detected.confidence)} ${commandName}: ${detected.value}`)

    const confirmed = await p.confirm({
      message: `Use this ${commandName.toLowerCase()} command?`,
      initialValue: true,
    })

    if (p.isCancel(confirmed)) return confirmed

    if (confirmed) {
      return detected.value
    }

    // User wants to edit
    const input = await p.text({
      message: `${commandName} command`,
      initialValue: detected.value,
      placeholder,
    })

    if (p.isCancel(input)) return input

    const trimmed = (input as string).trim()
    if (!trimmed) {
      p.log.info(`${commandName} skipped — ${usageDescription}`)
      return null
    }

    return trimmed
  }

  // Not detected - show warning with recommendations
  const suggestionLines = formatRecommendations(recommendations)
  p.log.warn(
    `No ${commandName.toLowerCase()} command detected.\n\n  ${usageDescription}\n\n  Suggestions for your stack:\n${suggestionLines}`
  )

  const action = await p.select({
    message: 'What would you like to do?',
    options: [
      { value: 'provide', label: `Provide a ${commandName.toLowerCase()} command` },
      { value: 'skip', label: 'Skip for now (you can add it later)' },
    ],
  })

  if (p.isCancel(action)) return action

  if (action === 'skip') {
    p.log.info(`${commandName} skipped — you can add this later by editing .karimo/config.yaml`)
    return null
  }

  // Get user input
  const input = await p.text({
    message: `${commandName} command`,
    placeholder,
  })

  if (p.isCancel(input)) return input

  const trimmed = (input as string).trim()
  if (!trimmed) {
    p.log.info(`${commandName} skipped — you can add this later by editing .karimo/config.yaml`)
    return null
  }

  return trimmed
}

/**
 * Confirm or edit commands section.
 * Build and lint are required; test and typecheck can be skipped.
 */
async function confirmCommandsSection(result: DetectionResult): Promise<
  | {
      build: string
      lint: string
      test: string | null
      typecheck: string | null
    }
  | symbol
> {
  // Display overview
  const commandsNote = [
    formatDetected('Build', result.commands.build, 'required'),
    formatDetected('Lint', result.commands.lint, 'required'),
    formatDetected('Test', result.commands.test, 'recommended'),
    formatDetected('Typecheck', result.commands.typecheck, 'recommended'),
  ].join('\n')

  p.note(commandsNote, 'Commands')

  // Check if all required are detected
  const allRequiredDetected = result.commands.build && result.commands.lint
  const allRecommendedDetected = result.commands.test && result.commands.typecheck

  // Fast path: everything detected, just confirm
  if (allRequiredDetected && allRecommendedDetected) {
    const confirmed = await p.confirm({
      message: 'Everything look right?',
      initialValue: true,
    })

    if (p.isCancel(confirmed)) return confirmed

    if (confirmed) {
      return {
        build: result.commands.build?.value ?? '',
        lint: result.commands.lint?.value ?? '',
        test: result.commands.test?.value ?? null,
        typecheck: result.commands.typecheck?.value ?? null,
      }
    }
  }

  // Get recommendations based on detected stack
  const recommendations = getCommandRecommendations(
    result.runtime?.value ?? null,
    result.language?.value ?? null
  )

  // Required commands
  p.log.step('Required commands')

  const build = await confirmRequiredCommand('Build', result.commands.build, 'bun run build', [
    'Next.js:  bun run build / npm run build',
    'Python:   python -m build',
    'Go:       go build ./...',
  ])
  if (p.isCancel(build)) return build

  const lint = await confirmRequiredCommand('Lint', result.commands.lint, 'bun run lint', [
    'ESLint:   npx eslint . / bun run lint',
    'Biome:    bunx biome check .',
    'Ruff:     ruff check .',
    'golangci: golangci-lint run',
  ])
  if (p.isCancel(lint)) return lint

  // Recommended commands
  p.log.step('Recommended commands (can be skipped)')

  const test = await confirmRecommendedCommand(
    'Test',
    result.commands.test,
    'bun test',
    recommendations.test,
    'KARIMO uses test as part of post-merge integration checks.'
  )
  if (p.isCancel(test)) return test

  const typecheck = await confirmRecommendedCommand(
    'Typecheck',
    result.commands.typecheck,
    'bun run typecheck',
    recommendations.typecheck,
    'KARIMO runs typecheck in pre-PR checks to catch type errors.'
  )
  if (p.isCancel(typecheck)) return typecheck

  return {
    build: build as string,
    lint: lint as string,
    test: test as string | null,
    typecheck: typecheck as string | null,
  }
}

/**
 * Confirm or edit rules section using multi-select.
 */
async function confirmRulesSection(result: DetectionResult): Promise<string[] | symbol> {
  if (result.rules.length === 0) {
    // No rules detected, ask for manual input
    const rulesInput = await p.text({
      message: 'Project rules (comma-separated)',
      placeholder: 'No any types, Use Zod for validation, Prefer async/await',
      validate: (value) => {
        if (!value.trim()) return 'At least one rule is required'
        return undefined
      },
    })

    if (p.isCancel(rulesInput)) return rulesInput

    return rulesInput
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
  }

  // Show detected rules with multi-select
  const rulesNote = result.rules
    .map((r) => `${getConfidenceIndicator(r.confidence)} ${r.value}`)
    .join('\n')

  p.note(rulesNote, 'Rules')

  const confirmed = await p.confirm({
    message: 'Use these rules? (You can add more afterward)',
    initialValue: true,
  })

  if (p.isCancel(confirmed)) return confirmed

  if (confirmed) {
    return result.rules.map((r) => r.value)
  }

  // Let user select which rules to keep
  const selected = await p.multiselect({
    message: 'Select rules to include',
    options: result.rules.map((r) => ({
      value: r.value,
      label: r.value,
      hint: r.source,
    })),
    initialValues: result.rules.map((r) => r.value),
    required: false,
  })

  if (p.isCancel(selected)) return selected

  // Allow adding custom rules
  const addMore = await p.confirm({
    message: 'Add custom rules?',
    initialValue: false,
  })

  if (p.isCancel(addMore)) return addMore

  let rules = selected as string[]

  if (addMore) {
    const customRules = await p.text({
      message: 'Additional rules (comma-separated)',
      placeholder: 'Rule 1, Rule 2, Rule 3',
    })

    if (p.isCancel(customRules)) return customRules

    if (customRules.trim()) {
      const custom = customRules
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0)
      rules = [...rules, ...custom]
    }
  }

  // Ensure at least one rule
  if (rules.length === 0) {
    const rulesInput = await p.text({
      message: 'At least one rule is required',
      placeholder: 'No any types, Use Zod for validation',
      validate: (value) => {
        if (!value.trim()) return 'At least one rule is required'
        return undefined
      },
    })

    if (p.isCancel(rulesInput)) return rulesInput

    rules = rulesInput
      .split(',')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
  }

  return rules
}

/**
 * Get sandbox allowed_env from detection result.
 * Uses detected values directly, allowing user to customize.
 */
async function confirmSandboxSection(result: DetectionResult): Promise<string[] | symbol> {
  const detectedVars = result.sandbox.allowed_env.map((v) => v.value)

  // If we have detected vars, use them as defaults
  const defaultVars = detectedVars.length > 0 ? detectedVars : COMMON_ALLOWED_ENV

  const sandboxInput = await p.text({
    message: 'Allowed environment variables (comma-separated)',
    placeholder: defaultVars.join(', '),
    initialValue: defaultVars.join(', '),
    validate: (value) => {
      if (!value.trim()) return 'At least one environment variable is required'
      return undefined
    },
  })

  if (p.isCancel(sandboxInput)) return sandboxInput

  return sandboxInput
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
}

/**
 * Build boundaries from detection result.
 */
function buildBoundaries(result: DetectionResult): {
  never_touch: string[]
  require_review: string[]
} {
  return {
    never_touch: result.boundaries.never_touch.map((b) => b.value),
    require_review: result.boundaries.require_review.map((b) => b.value),
  }
}

/**
 * Collect source attributions for boundaries.
 */
function collectBoundariesSources(result: DetectionResult): string {
  const sources = new Set<string>()
  for (const item of result.boundaries.never_touch) {
    sources.add(item.source)
  }
  for (const item of result.boundaries.require_review) {
    sources.add(item.source)
  }
  // Simplify common patterns and limit to 3
  const sourceList = [...sources].slice(0, 3)
  return sources.size > 3 ? `${sourceList.join(', ')}, ...` : sourceList.join(', ') || 'defaults'
}

/**
 * Display final summary before writing.
 */
function displaySummary(config: KarimoConfig): void {
  const lines: string[] = []

  lines.push(`Project: ${config.project.name}`)
  lines.push(`Language: ${config.project.language}`)
  if (config.project.framework) {
    lines.push(`Framework: ${config.project.framework}`)
  }
  lines.push(`Runtime: ${config.project.runtime}`)
  if (config.project.database) {
    lines.push(`Database: ${config.project.database}`)
  }
  lines.push('')
  lines.push(`Commands: ${Object.keys(config.commands).length}`)
  lines.push(`Rules: ${config.rules.length}`)
  lines.push(
    `Boundaries: ${config.boundaries.never_touch.length} never_touch, ${config.boundaries.require_review.length} require_review`
  )
  lines.push(`Allowed env vars: ${config.sandbox.allowed_env.length}`)

  p.note(lines.join('\n'), 'Configuration Summary')
}

/**
 * Run the interactive init flow with auto-detection.
 * @param projectRoot - The project root directory (defaults to process.cwd())
 * @returns InitResult indicating success/cancellation and config path
 */
export async function runInit(projectRoot: string = process.cwd()): Promise<InitResult> {
  p.intro('KARIMO Configuration')

  // Check if config already exists
  if (configExists(projectRoot)) {
    const shouldOverwrite = await p.confirm({
      message: 'Configuration file already exists. Overwrite?',
      initialValue: false,
    })

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel('Init cancelled.')
      return { success: false, cancelled: true }
    }
  }

  // Phase 1: Scan
  const scanSpinner = p.spinner()
  scanSpinner.start('Scanning project...')

  let result: DetectionResult
  try {
    result = await detectProject(projectRoot)
    scanSpinner.stop('Scan complete')
  } catch (error) {
    scanSpinner.stop('Scan failed')
    p.cancel(`Detection error: ${(error as Error).message}`)
    return { success: false, cancelled: false }
  }

  // Display scan results
  await displayScanProgress(result)

  // Phase 2: Confirm/Edit sections

  // Project section
  const project = await confirmProjectSection(result)
  if (p.isCancel(project)) {
    p.cancel('Init cancelled.')
    return { success: false, cancelled: true }
  }

  // Commands section
  p.note(
    `These commands verify agent work after every task.
PRs are only created when all commands pass.`,
    'Verification Commands'
  )

  const commands = await confirmCommandsSection(result)
  if (p.isCancel(commands)) {
    p.cancel('Init cancelled.')
    return { success: false, cancelled: true }
  }

  // Rules section
  p.note(
    `Coding standards that guide agent behavior.
Agents follow these patterns and flag deviations.`,
    'Coding Standards'
  )

  const rules = await confirmRulesSection(result)
  if (p.isCancel(rules)) {
    p.cancel('Init cancelled.')
    return { success: false, cancelled: true }
  }

  // Sandbox section
  p.note(
    `Agents run in a sandboxed environment.
Only listed variables are exposed to prevent secret leakage.`,
    'Agent Environment'
  )

  const allowedEnv = await confirmSandboxSection(result)
  if (p.isCancel(allowedEnv)) {
    p.cancel('Init cancelled.')
    return { success: false, cancelled: true }
  }

  // Build boundaries from detection
  const boundaries = buildBoundaries(result)

  // Display boundaries with sources (read-only, not editable inline)
  // Use formatBoundariesDisplay for proper terminal width handling
  const boundariesSources = collectBoundariesSources(result)
  if (boundaries.never_touch.length > 0 || boundaries.require_review.length > 0) {
    const boundariesContent = formatBoundariesDisplay(
      boundaries.never_touch,
      boundaries.require_review
    )
    p.note(boundariesContent, `File Boundaries (from ${boundariesSources})`)
  }

  // Use defaults for cost and fallback (not part of interactive flow)
  const config: KarimoConfig = {
    project: project as {
      name: string
      language: string
      framework?: string
      runtime: string
      database?: string
    },
    commands: commands as {
      build: string
      lint: string
      test: string | null
      typecheck: string | null
    },
    rules: rules as string[],
    boundaries:
      boundaries.never_touch.length > 0 || boundaries.require_review.length > 0
        ? boundaries
        : DEFAULT_BOUNDARIES,
    cost: DEFAULT_COST,
    fallback_engine: DEFAULT_FALLBACK_ENGINE,
    sandbox: {
      allowed_env: allowedEnv as string[],
    },
  }

  // Display summary
  displaySummary(config)

  // Phase 3: Confirm and write
  const shouldWrite = await p.confirm({
    message: 'Write configuration?',
    initialValue: true,
  })

  if (p.isCancel(shouldWrite) || !shouldWrite) {
    p.cancel('Init cancelled.')
    return { success: false, cancelled: true }
  }

  // Write config
  const writeSpinner = p.spinner()
  writeSpinner.start('Writing configuration...')

  try {
    const configPath = await writeConfig(projectRoot, config)
    writeSpinner.stop('Configuration written successfully.')

    p.note(
      `Configuration saved to:\n  ${configPath}\n\nNext steps:\n  1. Review and customize boundaries in config.yaml\n  2. Adjust cost settings if needed\n  3. Create your first PRD file`,
      'Success'
    )

    p.outro('KARIMO is ready.')
    return { success: true, cancelled: false, configPath }
  } catch (error) {
    writeSpinner.stop('Failed to write configuration.')
    p.cancel(`Error: ${(error as Error).message}`)
    return { success: false, cancelled: false }
  }
}
