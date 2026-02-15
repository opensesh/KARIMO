/**
 * KARIMO PRD Module
 *
 * PRD parser, YAML task extraction, and dependency resolver.
 * Handles parsing of PRD markdown files, extracting the YAML
 * task block, and building the dependency graph for execution ordering.
 */

export type { PRD, PRDMetadata, Task, TaskPriority } from '@/types'

// Dependency graph node
export interface DependencyNode {
  taskId: string
  dependsOn: string[]
  dependedBy: string[]
}

// Dependency graph
export type DependencyGraph = Map<string, DependencyNode>

// File overlap detection result
export interface FileOverlapResult {
  safe: string[]
  sequential: string[][]
  overlaps: Map<string, string[]>
}
