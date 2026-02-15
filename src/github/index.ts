/**
 * KARIMO GitHub Module
 *
 * GitHub Projects API integration and issue creation.
 * Provides a typed wrapper around GitHub's GraphQL API for
 * managing project items, custom fields, and status columns.
 */

import type { StatusColumn, Task, TaskState } from '@/types'

export type { TaskState, StatusColumn }

// GitHub Projects client interface
export interface GitHubProjectsClient {
  createItem(projectId: string, issueId: string): Promise<string>
  updateField(itemId: string, fieldName: string, value: string | number | boolean): Promise<void>
  moveToColumn(itemId: string, status: StatusColumn): Promise<void>
  getProjectState(projectId: string): Promise<Map<string, TaskState>>
  syncTasksFromPRD(projectId: string, tasks: Task[]): Promise<void>
  getReadyTasks(projectId: string): Promise<Task[]>
  getTasksByAssignee(projectId: string, user: string): Promise<Task[]>
}

// GitHub API error
export interface GitHubAPIError {
  status: number
  message: string
  documentation_url?: string
}
