/**
 * KARIMO Cost Module
 *
 * Cost tracking, ceiling enforcement, and token parsing.
 * Provides resilient cost estimation from various sources
 * and enforces per-task, per-phase, and session budget caps.
 */

import type { CostConfig, CostEstimate } from '@/types'

export type { CostEstimate, CostConfig }

// Cost tracking record
export interface CostRecord {
  taskId: string
  phaseId: string
  engine: string
  estimatedCost: number
  actualCost: number
  iterations: number
  timestamp: Date
  source: CostEstimate['source']
}

// Cost summary
export interface CostSummary {
  totalEstimated: number
  totalActual: number
  byPhase: Map<string, { estimated: number; actual: number }>
  byEngine: Map<string, { estimated: number; actual: number }>
  byTask: CostRecord[]
}

// Custom error types
export class CostCeilingExceeded extends Error {
  constructor(
    public taskId: string,
    public currentCost: number,
    public ceiling: number
  ) {
    super(`Task ${taskId} exceeded cost ceiling: $${currentCost.toFixed(2)} > $${ceiling}`)
    this.name = 'CostCeilingExceeded'
  }
}

export class PhaseBudgetExceeded extends Error {
  constructor(
    public phaseId: string,
    public spent: number
  ) {
    super(`Phase ${phaseId} exceeded budget cap: $${spent.toFixed(2)}`)
    this.name = 'PhaseBudgetExceeded'
  }
}

export class SessionBudgetExceeded extends Error {
  constructor(
    public total: number,
    public cap: number
  ) {
    super(`Session exceeded budget cap: $${total.toFixed(2)} > $${cap}`)
    this.name = 'SessionBudgetExceeded'
  }
}
