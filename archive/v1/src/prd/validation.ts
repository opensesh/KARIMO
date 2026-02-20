/**
 * KARIMO Computed Field Validation
 *
 * Validates that PRD task computed fields match config formulas.
 * Detects drift between expected and actual values.
 */

import type { Task } from '@/types'
import type { ComputedFieldConfig, ComputedFieldDrift, ValidationResult } from './types'

/**
 * Calculate expected cost ceiling from complexity and config.
 * Formula: complexity × cost_multiplier
 */
function calculateCostCeiling(complexity: number, config: ComputedFieldConfig): number {
  return complexity * config.cost_multiplier
}

/**
 * Calculate expected estimated iterations from complexity and config.
 * Formula: base_iterations + (complexity × iteration_multiplier)
 */
function calculateEstimatedIterations(complexity: number, config: ComputedFieldConfig): number {
  return config.base_iterations + complexity * config.iteration_multiplier
}

/**
 * Calculate expected revision budget from cost ceiling and config.
 * Formula: cost_ceiling × (revision_budget_percent / 100)
 */
function calculateRevisionBudget(costCeiling: number, config: ComputedFieldConfig): number {
  return costCeiling * (config.revision_budget_percent / 100)
}

/**
 * Check for floating-point equality with tolerance.
 */
function isEqual(a: number, b: number, tolerance = 0.001): boolean {
  return Math.abs(a - b) < tolerance
}

/**
 * Validate computed fields for a single task against config formulas.
 *
 * @param task - The task to validate
 * @param config - The config values for computed field formulas
 * @returns ValidationResult with any detected drifts
 */
export function validateComputedFields(task: Task, config: ComputedFieldConfig): ValidationResult {
  const drifts: ComputedFieldDrift[] = []

  // Check cost_ceiling
  const expectedCostCeiling = calculateCostCeiling(task.complexity, config)
  if (!isEqual(task.cost_ceiling, expectedCostCeiling)) {
    drifts.push({
      taskId: task.id,
      field: 'cost_ceiling',
      expected: expectedCostCeiling,
      actual: task.cost_ceiling,
    })
  }

  // Check estimated_iterations
  const expectedIterations = calculateEstimatedIterations(task.complexity, config)
  if (!isEqual(task.estimated_iterations, expectedIterations)) {
    drifts.push({
      taskId: task.id,
      field: 'estimated_iterations',
      expected: expectedIterations,
      actual: task.estimated_iterations,
    })
  }

  // Check revision_budget (uses actual cost_ceiling from task, not expected)
  // This allows revision_budget to be calculated from the provided cost_ceiling
  const expectedRevisionBudget = calculateRevisionBudget(task.cost_ceiling, config)
  if (!isEqual(task.revision_budget, expectedRevisionBudget)) {
    drifts.push({
      taskId: task.id,
      field: 'revision_budget',
      expected: expectedRevisionBudget,
      actual: task.revision_budget,
    })
  }

  return {
    valid: drifts.length === 0,
    drifts,
  }
}

/**
 * Recalculate computed fields for a task using config formulas.
 * Returns a new task object with corrected values (does not mutate).
 *
 * @param task - The task to recalculate
 * @param config - The config values for computed field formulas
 * @returns New task with recalculated computed fields
 */
export function recalculateComputedFields(task: Task, config: ComputedFieldConfig): Task {
  const costCeiling = calculateCostCeiling(task.complexity, config)
  const estimatedIterations = calculateEstimatedIterations(task.complexity, config)
  const revisionBudget = calculateRevisionBudget(costCeiling, config)

  return {
    ...task,
    cost_ceiling: costCeiling,
    estimated_iterations: estimatedIterations,
    revision_budget: revisionBudget,
  }
}

/**
 * Validate computed fields for all tasks in a list.
 * Aggregates all drifts across tasks.
 *
 * @param tasks - The tasks to validate
 * @param config - The config values for computed field formulas
 * @returns ValidationResult with all detected drifts
 */
export function validateAllTasks(tasks: Task[], config: ComputedFieldConfig): ValidationResult {
  const allDrifts: ComputedFieldDrift[] = []

  for (const task of tasks) {
    const result = validateComputedFields(task, config)
    allDrifts.push(...result.drifts)
  }

  return {
    valid: allDrifts.length === 0,
    drifts: allDrifts,
  }
}

/**
 * Recalculate computed fields for all tasks in a list.
 * Returns new task objects with corrected values (does not mutate).
 *
 * @param tasks - The tasks to recalculate
 * @param config - The config values for computed field formulas
 * @returns New tasks with recalculated computed fields
 */
export function recalculateAllTasks(tasks: Task[], config: ComputedFieldConfig): Task[] {
  return tasks.map((task) => recalculateComputedFields(task, config))
}
