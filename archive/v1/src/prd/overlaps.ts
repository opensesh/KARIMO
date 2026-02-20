/**
 * KARIMO File Overlap Detection
 *
 * Detects file overlaps between tasks using exact string matching
 * and union-find for transitive grouping. Tasks that share files
 * must run sequentially to avoid conflicts.
 */

import type { Task } from '@/types'
import type { FileOverlap, OverlapResult } from './types'

/**
 * Union-Find (Disjoint Set Union) data structure for grouping tasks.
 * Used to efficiently find transitive overlaps (A↔B, B↔C → A,B,C sequential).
 */
class UnionFind {
  private parent: Map<string, string> = new Map()
  private rank: Map<string, number> = new Map()

  /**
   * Find the root of an element with path compression.
   */
  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x)
      this.rank.set(x, 0)
    }

    const parentValue = this.parent.get(x)
    if (parentValue !== undefined && parentValue !== x) {
      this.parent.set(x, this.find(parentValue))
    }

    return this.parent.get(x) ?? x
  }

  /**
   * Union two elements by rank.
   */
  union(x: string, y: string): void {
    const rootX = this.find(x)
    const rootY = this.find(y)

    if (rootX === rootY) return

    const rankX = this.rank.get(rootX) || 0
    const rankY = this.rank.get(rootY) || 0

    if (rankX < rankY) {
      this.parent.set(rootX, rootY)
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX)
    } else {
      this.parent.set(rootY, rootX)
      this.rank.set(rootX, rankX + 1)
    }
  }

  /**
   * Get all connected components (groups of elements that share the same root).
   */
  getGroups(): Map<string, string[]> {
    const groups = new Map<string, string[]>()

    for (const element of this.parent.keys()) {
      const root = this.find(element)
      if (!groups.has(root)) {
        groups.set(root, [])
      }
      groups.get(root)?.push(element)
    }

    return groups
  }
}

/**
 * Detect file overlaps between tasks using exact string matching.
 * Tasks that share files (directly or transitively) are grouped for sequential execution.
 *
 * @param tasks - List of tasks to analyze
 * @returns OverlapResult with safe tasks, sequential groups, and overlap details
 */
export function detectFileOverlaps(tasks: Task[]): OverlapResult {
  // Build file → task IDs mapping
  const fileToTasks = new Map<string, string[]>()

  for (const task of tasks) {
    for (const file of task.files_affected) {
      if (!fileToTasks.has(file)) {
        fileToTasks.set(file, [])
      }
      fileToTasks.get(file)?.push(task.id)
    }
  }

  // Find overlapping files and union tasks
  const uf = new UnionFind()
  const overlaps: FileOverlap[] = []

  // Initialize all task IDs in union-find
  for (const task of tasks) {
    uf.find(task.id)
  }

  // Union tasks that share files
  for (const [file, taskIds] of fileToTasks) {
    if (taskIds.length > 1) {
      // Record the overlap
      overlaps.push({ file, taskIds: [...taskIds] })

      // Union all tasks that share this file
      const firstId = taskIds[0]
      if (firstId !== undefined) {
        for (let i = 1; i < taskIds.length; i++) {
          const otherId = taskIds[i]
          if (otherId !== undefined) {
            uf.union(firstId, otherId)
          }
        }
      }
    }
  }

  // Get connected components
  const groups = uf.getGroups()

  // Build task lookup
  const taskById = new Map<string, Task>()
  for (const task of tasks) {
    taskById.set(task.id, task)
  }

  // Separate safe tasks from sequential groups
  const safe: Task[] = []
  const sequential: Task[][] = []

  for (const [_, memberIds] of groups) {
    const groupTasks: Task[] = []
    for (const id of memberIds) {
      const task = taskById.get(id)
      if (task !== undefined) {
        groupTasks.push(task)
      }
    }

    if (groupTasks.length === 1 && groupTasks[0] !== undefined) {
      // Single task with no overlaps
      safe.push(groupTasks[0])
    } else if (groupTasks.length > 1) {
      // Multiple tasks must run sequentially
      sequential.push(groupTasks)
    }
  }

  return {
    safe,
    sequential,
    overlaps,
  }
}
