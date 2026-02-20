/**
 * KARIMO Execute Flow
 *
 * Wraps the orchestrator for the guided CLI flow.
 * Shows task breakdown, dependency graph, and execution progress.
 */
import * as p from '@clack/prompts'
import { createDryRunPlan, printDryRunPlan, runTask } from '../orchestrator'
import { buildDependencyGraph, getReadyTasks, parsePRDFile, topologicalSort } from '../prd'
import type { Task } from '../types'
import { getPRDFileInfos, loadState } from './state'

/**
 * Show the execution flow for finalized PRDs.
 */
export async function showExecutionFlow(projectRoot: string): Promise<void> {
  // Get finalized PRDs
  const prdInfos = await getPRDFileInfos(projectRoot)
  const finalizedPRDs = prdInfos.filter((prd) => prd.finalized)

  if (finalizedPRDs.length === 0) {
    p.log.warn('No finalized PRDs found. Create a PRD first.')
    return
  }

  // Load state
  const state = await loadState(projectRoot)
  const completedPRDSlugs = new Set(state.completed_prds)

  // Filter to pending PRDs
  const pendingPRDs = finalizedPRDs.filter((prd) => !completedPRDSlugs.has(prd.slug))

  if (pendingPRDs.length === 0) {
    p.log.success('All PRDs complete! 🎉')
    return
  }

  // Select PRD to execute
  let selectedPRD: (typeof pendingPRDs)[0]

  if (pendingPRDs.length === 1) {
    const firstPRD = pendingPRDs[0]
    if (!firstPRD) {
      p.log.error('No PRD found')
      return
    }
    selectedPRD = firstPRD
    p.log.info(`Executing PRD: ${selectedPRD.metadata?.feature_name ?? selectedPRD.slug}`)
  } else {
    const selection = await p.select({
      message: 'Select PRD to execute',
      options: pendingPRDs.map((prd) => ({
        value: prd.slug,
        label: prd.metadata?.feature_name ?? prd.slug,
        hint: prd.metadata?.status ?? 'active',
      })),
    })

    if (p.isCancel(selection)) {
      return
    }

    const found = pendingPRDs.find((prd) => prd.slug === selection)
    if (!found) {
      p.log.error('PRD not found')
      return
    }
    selectedPRD = found
  }

  // Parse PRD
  const prdResult = await parsePRDFile(selectedPRD.path)

  if (!prdResult.tasks || prdResult.tasks.length === 0) {
    p.log.error('No tasks found in PRD')
    return
  }

  // Build dependency graph
  const graph = buildDependencyGraph(prdResult.tasks)
  const sortedTasks = topologicalSort(graph)
  const sortedTaskIds = sortedTasks.map((t) => t.id)

  // Display task overview
  displayTaskOverview(prdResult.tasks, sortedTaskIds)

  // Ask what to do
  const action = await p.select({
    message: 'What would you like to do?',
    options: [
      { value: 'dry-run', label: 'Dry run (preview execution plan)' },
      { value: 'execute-one', label: 'Execute a single task' },
      { value: 'execute-ready', label: 'Execute all ready tasks' },
      { value: 'back', label: 'Go back' },
    ],
  })

  if (p.isCancel(action) || action === 'back') {
    return
  }

  switch (action) {
    case 'dry-run':
      await runDryRun(projectRoot, selectedPRD.slug, prdResult.tasks)
      break
    case 'execute-one':
      await executeOneTask(projectRoot, selectedPRD.slug, prdResult.tasks, graph)
      break
    case 'execute-ready':
      await executeReadyTasks(projectRoot, selectedPRD.slug, prdResult.tasks, graph)
      break
  }
}

/**
 * Display task overview.
 */
function displayTaskOverview(tasks: Task[], sortedTaskIds: string[]): void {
  const lines: string[] = []

  lines.push(`Tasks: ${tasks.length}`)
  lines.push('')

  // Group by priority
  const must = tasks.filter((t) => t.priority === 'must')
  const should = tasks.filter((t) => t.priority === 'should')
  const could = tasks.filter((t) => t.priority === 'could')

  if (must.length > 0) {
    lines.push(`Must Have (${must.length}):`)
    for (const task of must) {
      const deps = task.depends_on.length > 0 ? ` → depends on: ${task.depends_on.join(', ')}` : ''
      lines.push(`  ${task.id}. ${task.title} [complexity: ${task.complexity}]${deps}`)
    }
    lines.push('')
  }

  if (should.length > 0) {
    lines.push(`Should Have (${should.length}):`)
    for (const task of should) {
      const deps = task.depends_on.length > 0 ? ` → depends on: ${task.depends_on.join(', ')}` : ''
      lines.push(`  ${task.id}. ${task.title} [complexity: ${task.complexity}]${deps}`)
    }
    lines.push('')
  }

  if (could.length > 0) {
    lines.push(`Could Have (${could.length}):`)
    for (const task of could) {
      const deps = task.depends_on.length > 0 ? ` → depends on: ${task.depends_on.join(', ')}` : ''
      lines.push(`  ${task.id}. ${task.title} [complexity: ${task.complexity}]${deps}`)
    }
    lines.push('')
  }

  lines.push('Execution Order:')
  lines.push(`  ${sortedTaskIds.join(' → ')}`)

  p.note(lines.join('\n'), 'Task Overview')
}

/**
 * Run a dry run of the execution plan.
 */
async function runDryRun(_projectRoot: string, phaseId: string, tasks: Task[]): Promise<void> {
  const taskId = await selectTask(tasks, 'Select task for dry run')

  if (!taskId) return

  const spinner = p.spinner()
  spinner.start('Generating execution plan...')

  try {
    const plan = await createDryRunPlan({
      phaseId,
      taskId,
    })

    spinner.stop('Plan generated')

    console.log('\n')
    printDryRunPlan(plan)
  } catch (error) {
    spinner.stop('Failed to generate plan')
    p.log.error((error as Error).message)
  }
}

/**
 * Execute a single task.
 */
async function executeOneTask(
  _projectRoot: string,
  phaseId: string,
  tasks: Task[],
  graph: ReturnType<typeof buildDependencyGraph>
): Promise<void> {
  // Get ready tasks
  const readyTaskObjects = getReadyTasks(graph, new Set())
  const readyTaskIds = new Set(readyTaskObjects.map((t) => t.id))

  const taskId = await selectTask(tasks, 'Select task to execute', readyTaskIds)

  if (!taskId) return

  // Confirm execution
  const task = tasks.find((t) => t.id === taskId)
  if (!task) {
    p.log.error('Task not found')
    return
  }

  const confirm = await p.confirm({
    message: `Execute "${task.title}" (complexity: ${task.complexity})?`,
    initialValue: true,
  })

  if (p.isCancel(confirm) || !confirm) {
    return
  }

  // Execute
  const spinner = p.spinner()
  spinner.start('Executing task...')

  try {
    const result = await runTask({
      phaseId,
      taskId,
    })

    spinner.stop('Task completed')

    if (result.success) {
      p.log.success(`PR created: ${result.run.prUrl ?? 'N/A'}`)
    } else {
      p.log.error(`Task failed: ${result.run.errorMessage ?? 'Unknown error'}`)
    }
  } catch (error) {
    spinner.stop('Task failed')
    p.log.error((error as Error).message)
  }
}

/**
 * Execute all ready tasks.
 */
async function executeReadyTasks(
  _projectRoot: string,
  phaseId: string,
  _tasks: Task[],
  graph: ReturnType<typeof buildDependencyGraph>
): Promise<void> {
  const readyTaskObjects = getReadyTasks(graph, new Set())

  if (readyTaskObjects.length === 0) {
    p.log.warn('No tasks ready for execution')
    return
  }

  const readyTaskDetails = readyTaskObjects.map((task) => {
    return `${task.id}: ${task.title} (complexity: ${task.complexity})`
  })

  p.note(readyTaskDetails.join('\n'), 'Ready Tasks')

  const confirm = await p.confirm({
    message: `Execute ${readyTaskObjects.length} ready task(s)?`,
    initialValue: true,
  })

  if (p.isCancel(confirm) || !confirm) {
    return
  }

  // Execute tasks sequentially (Level 0)
  for (const task of readyTaskObjects) {
    p.log.step(`Executing: ${task.title}`)

    const spinner = p.spinner()
    spinner.start('Running agent...')

    try {
      const result = await runTask({
        phaseId,
        taskId: task.id,
      })

      spinner.stop('Complete')

      if (result.success) {
        p.log.success(`PR created: ${result.run.prUrl ?? 'N/A'}`)
      } else {
        p.log.error(`Task failed: ${result.run.errorMessage ?? 'Unknown error'}`)

        const continueExec = await p.confirm({
          message: 'Continue with remaining tasks?',
          initialValue: false,
        })

        if (p.isCancel(continueExec) || !continueExec) {
          return
        }
      }
    } catch (error) {
      spinner.stop('Failed')
      p.log.error((error as Error).message)

      const continueExec = await p.confirm({
        message: 'Continue with remaining tasks?',
        initialValue: false,
      })

      if (p.isCancel(continueExec) || !continueExec) {
        return
      }
    }
  }

  p.log.success('All ready tasks executed')
}

/**
 * Select a task from the list.
 */
async function selectTask(
  tasks: Task[],
  message: string,
  readyTasks?: Set<string>
): Promise<string | null> {
  const options = tasks.map((task) => {
    const isReady = !readyTasks || readyTasks.has(task.id)
    const hint = isReady
      ? `complexity: ${task.complexity}`
      : `blocked (depends on: ${task.depends_on.join(', ')})`

    return {
      value: task.id,
      label: `${task.id}: ${task.title}`,
      hint,
    }
  })

  const selection = await p.select({
    message,
    options,
  })

  if (p.isCancel(selection)) {
    return null
  }

  return selection as string
}
