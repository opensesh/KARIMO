/**
 * KARIMO Config Init
 *
 * Interactive configuration initialization using @clack/prompts.
 * Detects project info from package.json and guides users through setup.
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import { stringify as stringifyYaml } from 'yaml'
import { COMMON_ALLOWED_ENV, DEFAULT_BOUNDARIES, DEFAULT_COST, DEFAULT_FALLBACK_ENGINE } from './defaults'
import type { KarimoConfig } from './schema'

const CONFIG_DIR = '.karimo'
const CONFIG_FILE = 'config.yaml'

/**
 * Detected project information from package.json.
 */
interface DetectedProject {
  name?: string
  language?: string
  runtime?: string
}

/**
 * Try to detect project info from package.json.
 */
function detectProjectInfo(): DetectedProject {
  const packagePath = join(process.cwd(), 'package.json')

  if (!existsSync(packagePath)) {
    return {}
  }

  try {
    const content = readFileSync(packagePath, 'utf-8')
    const pkg = JSON.parse(content) as Record<string, unknown>

    const detected: DetectedProject = {}

    if (typeof pkg.name === 'string') {
      detected.name = pkg.name
    }

    // Detect language from devDependencies
    const devDeps = pkg.devDependencies as Record<string, unknown> | undefined
    if (devDeps?.typescript || devDeps?.['@types/node']) {
      detected.language = 'typescript'
    } else {
      detected.language = 'javascript'
    }

    // Detect runtime from engines or dependencies
    const engines = pkg.engines as Record<string, unknown> | undefined
    if (engines?.bun) {
      detected.runtime = 'bun'
    } else if (engines?.node) {
      detected.runtime = 'node'
    } else {
      detected.runtime = 'node'
    }

    return detected
  } catch {
    return {}
  }
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

  // Create .karimo directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  // Convert to YAML with nice formatting
  const yaml = stringifyYaml(config, {
    indent: 2,
    lineWidth: 100,
    nullStr: 'null',
  })

  await Bun.write(configPath, yaml)

  return configPath
}

/**
 * Run the interactive init flow.
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

  // Detect project info
  const detected = detectProjectInfo()
  if (detected.name) {
    p.note(`Detected project: ${detected.name}`)
  }

  // Project section
  const projectGroup = await p.group(
    {
      name: () =>
        p.text({
          message: 'Project name',
          placeholder: detected.name ?? 'my-project',
          initialValue: detected.name,
          validate: (value) => {
            if (!value.trim()) return 'Project name is required'
          },
        }),
      language: () =>
        p.select({
          message: 'Primary language',
          initialValue: detected.language ?? 'typescript',
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
          placeholder: 'e.g., react, nextjs, fastapi',
        }),
      runtime: () =>
        p.select({
          message: 'Runtime',
          initialValue: detected.runtime ?? 'node',
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

  // Commands section
  const commandsGroup = await p.group(
    {
      build: () =>
        p.text({
          message: 'Build command',
          placeholder: 'bun run build',
          validate: (value) => {
            if (!value.trim()) return 'Build command is required'
          },
        }),
      lint: () =>
        p.text({
          message: 'Lint command',
          placeholder: 'bun run lint',
          validate: (value) => {
            if (!value.trim()) return 'Lint command is required'
          },
        }),
      test: () =>
        p.text({
          message: 'Test command',
          placeholder: 'bun test',
          validate: (value) => {
            if (!value.trim()) return 'Test command is required'
          },
        }),
      typecheck: () =>
        p.text({
          message: 'Type check command',
          placeholder: 'bun run typecheck',
          validate: (value) => {
            if (!value.trim()) return 'Type check command is required'
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

  // Rules section
  const rulesInput = await p.text({
    message: 'Project rules (comma-separated)',
    placeholder: 'No any types, Use Zod for validation, Prefer async/await',
    validate: (value) => {
      if (!value.trim()) return 'At least one rule is required'
    },
  })

  if (p.isCancel(rulesInput)) {
    p.cancel('Init cancelled.')
    process.exit(0)
  }

  const rules = rulesInput
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0)

  // Sandbox section
  const sandboxInput = await p.text({
    message: 'Allowed environment variables (comma-separated)',
    placeholder: COMMON_ALLOWED_ENV.join(', '),
    initialValue: COMMON_ALLOWED_ENV.join(', '),
    validate: (value) => {
      if (!value.trim()) return 'At least one environment variable is required'
    },
  })

  if (p.isCancel(sandboxInput)) {
    p.cancel('Init cancelled.')
    process.exit(0)
  }

  const allowedEnv = sandboxInput
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0)

  // Build config object
  const config: KarimoConfig = {
    project: {
      name: projectGroup.name as string,
      language: projectGroup.language as string,
      framework: (projectGroup.framework as string) || undefined,
      runtime: projectGroup.runtime as string,
      database: (projectGroup.database as string) || undefined,
    },
    commands: {
      build: commandsGroup.build as string,
      lint: commandsGroup.lint as string,
      test: commandsGroup.test as string,
      typecheck: commandsGroup.typecheck as string,
    },
    rules,
    boundaries: DEFAULT_BOUNDARIES,
    cost: DEFAULT_COST,
    fallback_engine: DEFAULT_FALLBACK_ENGINE,
    sandbox: {
      allowed_env: allowedEnv,
    },
  }

  // Write config
  const spinner = p.spinner()
  spinner.start('Writing configuration...')

  try {
    const configPath = await writeConfig(config)
    spinner.stop('Configuration written successfully.')

    p.note(
      `Configuration saved to:\n  ${configPath}\n\n` +
        'Next steps:\n' +
        '  1. Review and customize boundaries in config.yaml\n' +
        '  2. Adjust cost settings if needed\n' +
        '  3. Create your first PRD file',
      'Success'
    )

    p.outro('KARIMO is ready.')
  } catch (error) {
    spinner.stop('Failed to write configuration.')
    p.cancel(`Error: ${(error as Error).message}`)
    process.exit(1)
  }
}
