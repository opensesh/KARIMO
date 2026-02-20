/**
 * Project Signals
 *
 * Defines files and their weights for detecting valid project directories.
 * Higher weight = stronger signal that this is a legitimate project.
 */

/**
 * Project signal definition.
 */
export interface ProjectSignal {
  file: string
  weight: number
}

/**
 * Project signals with their detection weights.
 *
 * Weight meanings:
 * - 3: Primary project files (package managers, build configs)
 * - 2: Secondary project files (git, makefiles)
 * - 1: Tertiary signals (docs, license)
 */
export const PROJECT_SIGNALS: ProjectSignal[] = [
  // Weight 3: Primary project files (package managers, build configs)
  { file: 'package.json', weight: 3 },
  { file: 'Cargo.toml', weight: 3 },
  { file: 'pyproject.toml', weight: 3 },
  { file: 'go.mod', weight: 3 },
  { file: 'pom.xml', weight: 3 },
  { file: 'build.gradle', weight: 3 },
  { file: 'Gemfile', weight: 3 },
  { file: 'composer.json', weight: 3 },

  // Weight 2: Secondary project files
  { file: '.git', weight: 2 },
  { file: 'Makefile', weight: 2 },
  { file: 'CMakeLists.txt', weight: 2 },

  // Weight 1: Tertiary signals
  { file: 'README.md', weight: 1 },
  { file: 'LICENSE', weight: 1 },
]

/**
 * Minimum total weight required to consider a directory valid for KARIMO.
 */
export const MIN_SIGNAL_WEIGHT = 2
