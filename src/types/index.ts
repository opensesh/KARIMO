/**
 * KARIMO Core Types
 *
 * Shared TypeScript types and interfaces used across the KARIMO framework.
 * This module serves as the central type definitions for the entire system.
 */

// =============================================================================
// Task & PRD Types
// =============================================================================

export type TaskPriority = 'must' | 'should' | 'could'

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'review'
  | 'review-pending'
  | 'revision'
  | 'done'
  | 'failed'
  | 'aborted'
  | 'needs-human-rebase'
  | 'integration-failure'

export type ErrorType =
  | 'auth'
  | 'rate-limit'
  | 'build-failure'
  | 'stuck'
  | 'network'
  | 'cost-ceiling'
  | 'unknown'

export interface Task {
  id: string
  title: string
  description: string
  depends_on: string[]
  complexity: number
  estimated_iterations: number
  cost_ceiling: number
  revision_budget: number
  priority: TaskPriority
  assigned_to: string
  success_criteria: string[]
  files_affected: string[]
  agent_context?: string
}

export interface PRDMetadata {
  feature_name: string
  feature_slug: string
  owner: string
  status: 'draft' | 'active' | 'complete'
  created_date: string
  target_date?: string
  phase: string
  scope_type: 'new-feature' | 'refactor' | 'migration' | 'integration'
  github_project?: string
  links: string[]
  checkpoint_refs: string[]
}

export interface PRD {
  metadata: PRDMetadata
  tasks: Task[]
}

// =============================================================================
// Execution Types
// =============================================================================

export interface TaskRun {
  taskId: string
  phaseId: string
  issueNumber: number
  projectItemId: string
  status: TaskStatus
  pid?: number
  iterations: number
  maxIterations: number
  costCeiling: number
  currentCost: number
  revisionBudget: number
  startedAt?: Date
  completedAt?: Date
  prNumber?: number
  greptileScore?: number
  estimatedCost: number
  errorType?: ErrorType
  revisionCount: number
  engine: string
  cautionFilesModified: string[]
  assignedTo?: string
}

export interface CostEstimate {
  cost: number
  source: 'direct' | 'token-count' | 'json-usage' | 'duration-estimate' | 'minimum-fallback'
  confidence: 'high' | 'medium' | 'low' | 'none'
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface ProjectConfig {
  project: {
    name: string
    language: string
    framework?: string
    runtime: string
    database?: string
  }
  commands: {
    build: string
    lint: string
    test: string
    typecheck: string
  }
  rules: string[]
  boundaries: {
    never_touch: string[]
    require_review: string[]
  }
  cost: CostConfig
  fallback_engine?: FallbackEngineConfig
  sandbox: SandboxConfig
}

export interface CostConfig {
  model_preference: string
  cost_multiplier: number
  base_iterations: number
  iteration_multiplier: number
  revision_budget_percent: number
  max_revision_loops: number
  abort_on_fatal: boolean
  fallback_cost_per_minute: number
  phase_budget_cap?: number | null
  phase_budget_overflow: number
  session_budget_cap?: number | null
  budget_warning_threshold: number
}

export interface FallbackEngineConfig {
  enabled: boolean
  engines: Array<{
    name: string
    command: string
    budget_cap: number
    priority: number
  }>
  trigger_on: string[]
}

export interface SandboxConfig {
  allowed_env: string[]
}

// =============================================================================
// Checkpoint & Learning Types
// =============================================================================

export type CheckpointType = 'ring' | 'task' | 'phase'

export interface Checkpoint {
  id: string
  type: CheckpointType
  timestamp: Date
  whatWorked: string[]
  whatBroke: string[]
  costAnalysis: {
    estimated: number
    actual: number
    delta: number
    deltaPercent: number
  } | null
  qualitySignals: {
    greptileScores: number[]
    buildFailures: number
    typeErrors: number
    integrationFailures: number
    cautionFilesTriggered: string[]
  } | null
  recommendations: string[]
  userNotes: string
  surprises: string
  changes: string
  patternsToReinforce: string[]
  antiPatternsToAdd: string[]
  estimateAdjustments: {
    complexityBias: number
    costBias: number
  } | null
}

// =============================================================================
// GitHub Projects Types
// =============================================================================

export type StatusColumn =
  | 'Ready'
  | 'In Progress'
  | 'In Review'
  | 'Review Pending'
  | 'Revision'
  | 'Done'
  | 'Failed'
  | 'Needs Human Rebase'
  | 'Integration Failure'

export interface TaskState {
  status: StatusColumn
  complexity: number
  assigned_to: string
  depends_on: string
  cost_ceiling: number
  actual_cost: number
  estimated_iterations: number
  iterations_used: number
  greptile_score: number
  files_affected: string
  agent_status: TaskStatus
  pr_number: number
  revision_count: number
  require_review_triggered: boolean
}

// =============================================================================
// Agent Types
// =============================================================================

export interface AgentResult {
  iterations: number
  cost: number
  logs: string
  exitCode: number
}

export interface AgentOptions {
  engine: string
  maxIterations: number
  costCeiling: number
  sandboxEnv: string[]
  worktreePath: string
}
