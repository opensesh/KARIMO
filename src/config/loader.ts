/**
 * KARIMO Config Loader
 *
 * Finds, reads, parses, and validates KARIMO configuration files.
 * Traverses up the directory tree to find .karimo/config.yaml.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  ConfigNotFoundError,
  ConfigParseError,
  ConfigReadError,
  ConfigValidationError,
} from './errors'
import { type KarimoConfig, KarimoConfigSchema } from './schema'

const CONFIG_DIR = '.karimo'
const CONFIG_FILE = 'config.yaml'

/**
 * Result of finding a config file.
 */
export interface FindConfigResult {
  /** Full path to the config file */
  configPath: string
  /** Directory containing the .karimo folder */
  rootDir: string
}

/**
 * Result of loading a config file.
 */
export interface LoadConfigResult {
  /** Validated configuration object */
  config: KarimoConfig
  /** Full path to the config file */
  configPath: string
  /** Directory containing the .karimo folder */
  rootDir: string
}

/**
 * Find the config file by traversing up the directory tree.
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns The config path and root directory
 * @throws ConfigNotFoundError if no config file is found
 */
export function findConfigPath(startDir?: string): FindConfigResult {
  const searchFrom = startDir ? resolve(startDir) : process.cwd()
  let currentDir = searchFrom

  while (true) {
    const configPath = join(currentDir, CONFIG_DIR, CONFIG_FILE)

    try {
      // Use Bun.file to check existence
      const file = Bun.file(configPath)
      // size will throw if file doesn't exist
      if (file.size >= 0) {
        return {
          configPath,
          rootDir: currentDir,
        }
      }
    } catch {
      // File doesn't exist, continue searching
    }

    const parentDir = dirname(currentDir)

    // Reached filesystem root
    if (parentDir === currentDir) {
      throw new ConfigNotFoundError(searchFrom)
    }

    currentDir = parentDir
  }
}

/**
 * Read and parse a YAML config file.
 *
 * @param configPath - Path to the config file
 * @returns Parsed YAML as unknown (needs validation)
 * @throws ConfigReadError if file cannot be read
 * @throws ConfigParseError if YAML is invalid
 */
async function readConfigFile(configPath: string): Promise<unknown> {
  let content: string

  try {
    const file = Bun.file(configPath)
    content = await file.text()
  } catch (error) {
    throw new ConfigReadError(configPath, error as Error)
  }

  try {
    return parseYaml(content)
  } catch (error) {
    throw new ConfigParseError(configPath, error as Error)
  }
}

/**
 * Read and parse a YAML config file synchronously.
 *
 * @param configPath - Path to the config file
 * @returns Parsed YAML as unknown (needs validation)
 * @throws ConfigReadError if file cannot be read
 * @throws ConfigParseError if YAML is invalid
 */
function readConfigFileSync(configPath: string): unknown {
  let content: string

  try {
    content = readFileSync(configPath, 'utf-8')
  } catch (error) {
    throw new ConfigReadError(configPath, error as Error)
  }

  try {
    return parseYaml(content)
  } catch (error) {
    throw new ConfigParseError(configPath, error as Error)
  }
}

/**
 * Validate parsed config data against the schema.
 *
 * @param data - Parsed YAML data
 * @param configPath - Path to config file (for error messages)
 * @returns Validated configuration
 * @throws ConfigValidationError if validation fails
 */
function validateConfig(data: unknown, configPath: string): KarimoConfig {
  const result = KarimoConfigSchema.safeParse(data)

  if (!result.success) {
    throw new ConfigValidationError(configPath, result.error)
  }

  return result.data
}

/**
 * Load and validate configuration from .karimo/config.yaml.
 *
 * Complete pipeline: find -> read -> parse -> validate
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Validated config, config path, and root directory
 * @throws ConfigNotFoundError if no config file is found
 * @throws ConfigReadError if file cannot be read
 * @throws ConfigParseError if YAML is invalid
 * @throws ConfigValidationError if validation fails
 */
export async function loadConfig(startDir?: string): Promise<LoadConfigResult> {
  const { configPath, rootDir } = findConfigPath(startDir)
  const data = await readConfigFile(configPath)
  const config = validateConfig(data, configPath)

  return { config, configPath, rootDir }
}

/**
 * Load and validate configuration synchronously.
 *
 * Use for CLI bootstrapping where async is inconvenient.
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Validated config, config path, and root directory
 * @throws ConfigNotFoundError if no config file is found
 * @throws ConfigReadError if file cannot be read
 * @throws ConfigParseError if YAML is invalid
 * @throws ConfigValidationError if validation fails
 */
export function loadConfigSync(startDir?: string): LoadConfigResult {
  const { configPath, rootDir } = findConfigPath(startDir)
  const data = readConfigFileSync(configPath)
  const config = validateConfig(data, configPath)

  return { config, configPath, rootDir }
}
