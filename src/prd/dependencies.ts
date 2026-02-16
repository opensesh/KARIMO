/**
 * KARIMO Dependency Resolver
 *
 * Builds dependency graphs from tasks and performs topological sorting
 * using Kahn's algorithm. Detects cycles and invalid dependencies.
 */

import type { Task } from '@/types'
import { CyclicDependencyError, InvalidDependencyError } from './errors'
import type { DependencyGraph, DependencyNode } from './types'

/**
 * Build a dependency graph from a list of tasks.
 * Validates that all depends_on references point to existing tasks.
 *
 * @param tasks - List of tasks to build the graph from
 * @returns DependencyGraph mapping task IDs to their nodes
 * @throws InvalidDependencyError if a task references a non-existent dependency
 */
export function buildDependencyGraph(tasks: Task[]): DependencyGraph {
  const graph: DependencyGraph = new Map()

  // Create nodes for all tasks
  for (const task of tasks) {
    graph.set(task.id, {
      taskId: task.id,
      task,
      dependsOn: [...task.depends_on],
      dependedBy: [],
    })
  }

  // Validate dependencies and build reverse edges
  for (const task of tasks) {
    for (const depId of task.depends_on) {
      const depNode = graph.get(depId)
      if (!depNode) {
        throw new InvalidDependencyError(task.id, depId)
      }
      depNode.dependedBy.push(task.id)
    }
  }

  return graph
}

/**
 * Find a cycle in the dependency graph using DFS.
 * Returns the cycle path if found, null otherwise.
 */
function findCycle(graph: DependencyGraph): string[] | null {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): string[] | null {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    const node = graph.get(nodeId)
    if (!node) return null

    for (const depId of node.dependsOn) {
      if (!visited.has(depId)) {
        const result = dfs(depId)
        if (result) return result
      } else if (recursionStack.has(depId)) {
        // Found cycle - extract the cycle path
        const cycleStart = path.indexOf(depId)
        return [...path.slice(cycleStart), depId]
      }
    }

    path.pop()
    recursionStack.delete(nodeId)
    return null
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) {
      const cycle = dfs(nodeId)
      if (cycle) return cycle
    }
  }

  return null
}

/**
 * Perform topological sort using Kahn's algorithm.
 * Returns tasks in execution order (dependencies before dependents).
 *
 * @param graph - The dependency graph to sort
 * @returns Tasks in topological order
 * @throws CyclicDependencyError if a cycle is detected
 */
export function topologicalSort(graph: DependencyGraph): Task[] {
  if (graph.size === 0) return []

  // Calculate in-degrees
  const inDegree = new Map<string, number>()
  for (const [id, node] of graph) {
    inDegree.set(id, node.dependsOn.length)
  }

  // Queue nodes with no dependencies
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id)
    }
  }

  const result: Task[] = []

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    const node = graph.get(nodeId)!
    result.push(node.task)

    // Decrease in-degree for dependents
    for (const dependentId of node.dependedBy) {
      const newDegree = inDegree.get(dependentId)! - 1
      inDegree.set(dependentId, newDegree)
      if (newDegree === 0) {
        queue.push(dependentId)
      }
    }
  }

  // Check for cycle
  if (result.length !== graph.size) {
    const cycle = findCycle(graph)
    if (cycle) {
      throw new CyclicDependencyError(cycle)
    }
    // This shouldn't happen if findCycle works correctly
    throw new CyclicDependencyError(['unknown cycle detected'])
  }

  return result
}

/**
 * Get tasks that are ready to run (all dependencies completed).
 *
 * @param graph - The dependency graph
 * @param completedIds - Set of task IDs that have been completed
 * @returns Tasks that are ready to run
 */
export function getReadyTasks(graph: DependencyGraph, completedIds: Set<string>): Task[] {
  const ready: Task[] = []

  for (const [id, node] of graph) {
    // Skip already completed tasks
    if (completedIds.has(id)) continue

    // Check if all dependencies are completed
    const allDepsCompleted = node.dependsOn.every((depId) => completedIds.has(depId))
    if (allDepsCompleted) {
      ready.push(node.task)
    }
  }

  return ready
}

/**
 * Get tasks that are blocked waiting on dependencies.
 *
 * @param graph - The dependency graph
 * @param completedIds - Set of task IDs that have been completed
 * @returns Tasks that are blocked
 */
export function getBlockedTasks(graph: DependencyGraph, completedIds: Set<string>): Task[] {
  const blocked: Task[] = []

  for (const [id, node] of graph) {
    // Skip already completed tasks
    if (completedIds.has(id)) continue

    // Check if any dependency is not completed
    const hasUncompletedDeps = node.dependsOn.some((depId) => !completedIds.has(depId))
    if (hasUncompletedDeps) {
      blocked.push(node.task)
    }
  }

  return blocked
}

/**
 * Get the depth of a task in the dependency graph (longest path from root).
 * Useful for visualizing dependency levels.
 *
 * @param graph - The dependency graph
 * @returns Map of task IDs to their depth
 */
export function getTaskDepths(graph: DependencyGraph): Map<string, number> {
  const depths = new Map<string, number>()

  function calculateDepth(nodeId: string): number {
    if (depths.has(nodeId)) return depths.get(nodeId)!

    const node = graph.get(nodeId)
    if (!node || node.dependsOn.length === 0) {
      depths.set(nodeId, 0)
      return 0
    }

    const maxDepDeath = Math.max(...node.dependsOn.map((depId) => calculateDepth(depId)))
    const depth = maxDepDeath + 1
    depths.set(nodeId, depth)
    return depth
  }

  for (const nodeId of graph.keys()) {
    calculateDepth(nodeId)
  }

  return depths
}
