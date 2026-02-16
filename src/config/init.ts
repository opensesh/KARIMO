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
import {
  COMMON_ALLOWED_ENV,
  DEFAULT_BOUNDARIES,
  DEFAULT_COST,
  DEFAULT_FALLBACK_ENGINE,
} from './defaults'
import { type Confidence, type DetectedValue, type DetectionResult, detectProject } from './detect'
import type { KarimoConfig } from './schema'

const CONFIG_DIR = '.karimo'
const CONFIG_FILE = 'config.yaml'

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
function configExists(): boolean {
  const configPath = join(process.cwd(), CONFIG_DIR, CONFIG_FILE)
  return existsSync(configPath)
}

/**
 * Write the configuration file.
 */
async function writeConfig(config: KarimoConfig): Promise<string> {
  const configDir = join(process.cwd(), CONFIG_DIR)
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
        p.cancel('Init cancelled.')
        process.exit(0)
      },
    }
  )

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
 * Confirm or edit commands section.
 */
async function confirmCommandsSection(result: DetectionResult): Promise<
  | {
      build: string
      lint: string
      test: string
      typecheck: string
    }
  | symbol
> {
  const commandsNote = [
    formatDetected('Build', result.commands.build),
    formatDetected('Lint', result.commands.lint),
    formatDetected('Test', result.commands.test),
    formatDetected('Typecheck', result.commands.typecheck),
  ].join('\n')

  p.note(commandsNote, 'Commands')

  // If any command is missing, go straight to editing
  const allDetected =
    result.commands.build &&
    result.commands.lint &&
    result.commands.test &&
    result.commands.typecheck

  let needsEdit = !allDetected

  if (allDetected) {
    const confirmed = await p.confirm({
      message: 'Everything look right?',
      initialValue: true,
    })

    if (p.isCancel(confirmed)) return confirmed
    needsEdit = !confirmed
  } else {
    p.log.warn('Some commands were not detected. Please fill them in.')
  }

  if (!needsEdit) {
    return {
      build: result.commands.build?.value ?? '',
      lint: result.commands.lint?.value ?? '',
      test: result.commands.test?.value ?? '',
      typecheck: result.commands.typecheck?.value ?? '',
    }
  }

  // Edit commands
  const edited = await p.group(
    {
      build: () =>
        p.text({
          message: 'Build command',
          initialValue: result.commands.build?.value ?? '',
          placeholder: 'bun run build',
          validate: (value) => {
            if (!value.trim()) return 'Build command is required'
            return undefined
          },
        }),
      lint: () =>
        p.text({
          message: 'Lint command',
          initialValue: result.commands.lint?.value ?? '',
          placeholder: 'bun run lint',
          validate: (value) => {
            if (!value.trim()) return 'Lint command is required'
            return undefined
          },
        }),
      test: () =>
        p.text({
          message: 'Test command',
          initialValue: result.commands.test?.value ?? '',
          placeholder: 'bun test',
          validate: (value) => {
            if (!value.trim()) return 'Test command is required'
            return undefined
          },
        }),
      typecheck: () =>
        p.text({
          message: 'Type check command',
          initialValue: result.commands.typecheck?.value ?? '',
          placeholder: 'bun run typecheck',
          validate: (value) => {
            if (!value.trim()) return 'Type check command is required'
            return undefined
          },
        }),
    },
    {
      onCancel: () => {
        p.cancel('Init cancelled.')
        process.exit(0)
      },
    }
  )

  return {
    build: edited.build as string,
    lint: edited.lint as string,
    test: edited.test as string,
    typecheck: edited.typecheck as string,
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
 */
export async function runInit(): Promise<void> {
  p.intro('KARIMO Configuration')

  // Check if config already exists
  if (configExists()) {
    const shouldOverwrite = await p.confirm({
      message: 'Configuration file already exists. Overwrite?',
      initialValue: false,
    })

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel('Init cancelled.')
      process.exit(0)
    }
  }

  // Phase 1: Scan
  const scanSpinner = p.spinner()
  scanSpinner.start('Scanning project...')

  let result: DetectionResult
  try {
    result = await detectProject(process.cwd())
    scanSpinner.stop('Scan complete')
  } catch (error) {
    scanSpinner.stop('Scan failed')
    p.cancel(`Detection error: ${(error as Error).message}`)
    process.exit(1)
  }

  // Display scan results
  await displayScanProgress(result)

  // Phase 2: Confirm/Edit sections

  // Project section
  const project = await confirmProjectSection(result)
  if (p.isCancel(project)) {
    p.cancel('Init cancelled.')
    process.exit(0)
  }

  // Commands section
  const commands = await confirmCommandsSection(result)
  if (p.isCancel(commands)) {
    p.cancel('Init cancelled.')
    process.exit(0)
  }

  // Rules section
  const rules = await confirmRulesSection(result)
  if (p.isCancel(rules)) {
    p.cancel('Init cancelled.')
    process.exit(0)
  }

  // Sandbox section
  const allowedEnv = await confirmSandboxSection(result)
  if (p.isCancel(allowedEnv)) {
    p.cancel('Init cancelled.')
    process.exit(0)
  }

  // Build boundaries from detection
  const boundaries = buildBoundaries(result)

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
      test: string
      typecheck: string
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
    process.exit(0)
  }

  // Write config
  const writeSpinner = p.spinner()
  writeSpinner.start('Writing configuration...')

  try {
    const configPath = await writeConfig(config)
    writeSpinner.stop('Configuration written successfully.')

    p.note(
      `Configuration saved to:\n  ${configPath}\n\nNext steps:\n  1. Review and customize boundaries in config.yaml\n  2. Adjust cost settings if needed\n  3. Create your first PRD file`,
      'Success'
    )

    p.outro('KARIMO is ready.')
  } catch (error) {
    writeSpinner.stop('Failed to write configuration.')
    p.cancel(`Error: ${(error as Error).message}`)
    process.exit(1)
  }
}
