/**
 * KARIMO Team Module
 *
 * Agent team coordination for parallel task execution.
 */

// Types
export type {
  TeamTaskStatus,
  FindingType,
  TaskFinding,
  TeamTaskEntry,
  TeamTaskQueue,
  ClaimOptions,
  ClaimResult,
  PMAgentOptions,
  PMAgentResult,
  OverlapGroup,
  SchedulerDecision,
} from './types'

// Errors
export {
  TeamError,
  QueueNotFoundError,
  QueueReadError,
  QueueWriteError,
  QueueLockError,
  QueueVersionConflictError,
  TaskNotFoundError,
  TaskClaimError,
  TaskAlreadyClaimedError,
  TaskBlockedError,
  PMAgentError,
  AllTasksFailedError,
  SchedulerError,
  CircularDependencyError,
} from './errors'

// Queue operations
export {
  getQueuePath,
  getLockPath,
  getTeamDir,
  ensureTeamDir,
  queueExists,
  readQueue,
  writeQueue,
  createQueue,
  claimTask,
  markTaskRunning,
  completeTask,
  getReadyTasks,
  getQueueStats,
  type QueueStats,
} from './queue'

// Findings
export {
  createFinding,
  createAffectsFileFinding,
  createInterfaceChangeFinding,
  createDiscoveredDependencyFinding,
  createWarningFinding,
  createInfoFinding,
  formatFindingsForPrompt,
  getBlockingFindings,
  hasBlockingFindings,
  groupFindingsBySource,
  groupFindingsByType,
  type CreateFindingOptions,
} from './findings'

// Scheduler
export {
  detectFileOverlaps,
  getOverlapGroupForTask,
  tasksOverlap,
  getSchedulingDecisions,
  getSchedulableTasks,
  getNextBatch,
  isQueueComplete,
  allTasksSucceeded,
  getQueueProgress,
  DEFAULT_SCHEDULER_CONFIG,
  type SchedulerConfig,
  type QueueProgress,
} from './scheduler'

// PM Agent
export {
  PMAgent,
  runPMAgent,
  createTaskEntry,
  createTaskEntriesFromPRD,
  type AgentExecutionResult,
  type TaskExecutor,
  type PRDTaskData,
} from './pm-agent'
