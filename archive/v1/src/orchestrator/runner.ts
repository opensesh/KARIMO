/**
 * KARIMO Task Runner
 *
 * Core orchestration loop for running a single task from PRD to PR.
 * Level 0 implementation — no parallel execution, no cost tracking,
 * no revision loops. Just the single-task happy path.
 */

import { join } from 'node:path'
import { buildAgentEnvironment, buildAgentPrompt, createClaudeCodeEngine } from '@/agents'
import { loadConfig } from '@/config'
import {
  branchExists,
  createTaskBranch,
  createWorktree,
  getDefaultBranch,
  gitExec,
  pushBranch,
  removeWorktree,
} from '@/git'
import { buildPrBody, createPullRequest, verifyGhAuth } from '@/github'
import { type ParsedPRD, parsePRDFile } from '@/prd'
import {
  NeverTouchViolationError,
  PRCreationError,
  PhaseNotFoundError,
  PrePRCheckError,
  RebaseConflictError,
  TaskNotFoundError,
  WorktreeError,
} from './errors'
import { prePRChecks } from './pre-pr-checks'
import { createTaskSummary } from './summary'
import type { DryRunPlan, RunTaskOptions, RunTaskResult, TaskRunR0 } from './types'

/**
 * Run a single task from PRD to PR.
 *
 * Steps:
 * 1. Load config from .karimo/config.yaml
 * 2. Resolve and parse PRD file
 * 3. Find task by ID
 * 4. Create phase branch if needed
 * 5. Create worktree and task branch
 * 6. Build agent prompt and environment
 * 7. Execute agent (Claude Code)
 * 8. Run pre-PR checks (rebase, build, typecheck)
 * 9. Detect caution files and never-touch violations
 * 10. Create PR
 * 11. Cleanup worktree
 * 12. Return result
 *
 * @param options - Task run options
 * @returns Run result with status, run record, and summary
 *
 * @example
 * ```typescript
 * const result = await runTask({
 *   phaseId: 'phase-1',
 *   taskId: '1a',
 * })
 *
 * if (result.success) {
 *   console.log(`PR created: ${result.run.prUrl}`)
 * }
 * ```
 */
export async function runTask(options: RunTaskOptions): Promise<RunTaskResult> {
  const {
    phaseId,
    taskId,
    prdPath: prdPathOverride,
    dryRun = false,
    engine = 'claude-code',
  } = options

  const startedAt = new Date()

  // Initialize run record
  const run: TaskRunR0 = {
    taskId,
    phaseId,
    status: 'running',
    engine,
    branch: `feature/${phaseId}/${taskId}`,
    startedAt,
    cautionFilesModified: [],
  }

  try {
    // Step 1: Load config
    const { config, rootDir } = await loadConfig()

    // Step 2: Resolve PRD path
    const prdPath = prdPathOverride ?? join(rootDir, '.karimo', 'prds', `${phaseId}.md`)

    // Step 3: Parse PRD and find task
    let parsedPRD: ParsedPRD
    try {
      parsedPRD = await parsePRDFile(prdPath)
    } catch {
      throw new PhaseNotFoundError(phaseId, prdPath)
    }

    const task = parsedPRD.tasks.find((t) => t.id === taskId)
    if (!task) {
      throw new TaskNotFoundError(taskId, phaseId)
    }

    // Define branch names
    const phaseBranch = `feature/${phaseId}`
    const taskBranch = `feature/${phaseId}/${taskId}`

    // Dry run: just output the plan without executing
    if (dryRun) {
      run.status = 'done'
      run.completedAt = new Date()

      return {
        success: true,
        run,
        summary: {
          taskId,
          phaseId,
          title: task.title,
          status: 'done',
          duration: '0s (dry run)',
          filesChanged: 0,
          cautionFiles: [],
        },
      }
    }

    // Step 4: Create phase branch if needed
    const defaultBranch = await getDefaultBranch(rootDir)

    if (!(await branchExists(phaseBranch, rootDir))) {
      await gitExec(['checkout', '-b', phaseBranch, defaultBranch], { cwd: rootDir })
      // Push phase branch to remote
      await pushBranch(phaseBranch, 'origin', { cwd: rootDir })
      // Switch back to default branch
      await gitExec(['checkout', defaultBranch], { cwd: rootDir })
    }

    // Step 5: Create worktree and task branch
    try {
      run.worktreePath = await createWorktree(rootDir, phaseId, taskBranch)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new WorktreeError(phaseId, message)
    }

    // Ensure we're on the task branch in the worktree
    await createTaskBranch(phaseId, taskId, phaseBranch, { cwd: run.worktreePath })

    // Step 6: Build agent prompt and environment
    const prompt = buildAgentPrompt({
      task,
      config,
      rootDir,
      phaseId,
    })

    const agentEnv = buildAgentEnvironment(config)

    // Step 7: Execute agent
    const agentEngine = createClaudeCodeEngine()

    if (!(await agentEngine.isAvailable())) {
      run.status = 'failed'
      run.errorMessage = 'Claude Code is not installed'
      run.completedAt = new Date()

      return {
        success: false,
        run,
        summary: createTaskSummary(run, task.title, 0),
      }
    }

    const agentResult = await agentEngine.execute({
      prompt,
      workdir: run.worktreePath,
      env: agentEnv,
    })

    if (!agentResult.success) {
      run.status = 'failed'
      run.errorMessage = `Agent exited with code ${agentResult.exitCode}`
      run.completedAt = new Date()

      return {
        success: false,
        run,
        summary: createTaskSummary(run, task.title, 0),
      }
    }

    // Step 8: Run pre-PR checks
    const checkResult = await prePRChecks({
      worktreePath: run.worktreePath,
      targetBranch: phaseBranch,
      buildCommand: config.commands.build,
      typecheckCommand: config.commands.typecheck,
      neverTouchPatterns: config.boundaries.never_touch,
      requireReviewPatterns: config.boundaries.require_review,
    })

    // Handle check failures
    if (!checkResult.success) {
      // Rebase conflicts
      if (
        checkResult.rebase &&
        !checkResult.rebase.success &&
        checkResult.rebase.conflictFiles.length > 0
      ) {
        run.status = 'needs-human-rebase'
        run.errorMessage = checkResult.errorMessage
        run.completedAt = new Date()

        throw new RebaseConflictError(checkResult.rebase.conflictFiles, phaseBranch)
      }

      // Never-touch violations
      if (checkResult.neverTouchViolations.length > 0) {
        run.status = 'failed'
        run.errorMessage = checkResult.errorMessage
        run.completedAt = new Date()

        throw new NeverTouchViolationError(checkResult.neverTouchViolations)
      }

      // Build/typecheck failure
      const failedCheck =
        checkResult.build && !checkResult.build.success
          ? 'build'
          : checkResult.typecheck && !checkResult.typecheck.success
            ? 'typecheck'
            : 'rebase'

      run.status = 'failed'
      run.errorMessage = checkResult.errorMessage
      run.completedAt = new Date()

      throw new PrePRCheckError(failedCheck, checkResult.errorMessage ?? 'Unknown error')
    }

    // Step 9: Record caution files
    run.cautionFilesModified = checkResult.cautionFiles

    // Step 10: Push and create PR
    await pushBranch(taskBranch, 'origin', { cwd: run.worktreePath })

    // Verify GitHub auth
    await verifyGhAuth()

    // Parse remote URL to get owner/repo
    const remoteResult = await gitExec(['remote', 'get-url', 'origin'], { cwd: rootDir })
    const remoteUrl = remoteResult.stdout.trim()
    const repoMatch = remoteUrl.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/)

    if (!repoMatch?.[1] || !repoMatch[2]) {
      throw new PRCreationError(taskId, 'Could not parse GitHub repository from remote URL')
    }

    const owner = repoMatch[1]
    const repo = repoMatch[2]

    // Build PR body
    const prBody = buildPrBody({
      taskId,
      phaseId,
      complexity: task.complexity,
      costCeiling: task.cost_ceiling,
      description: task.description,
      files: checkResult.changedFiles,
      cautionFiles: checkResult.cautionFiles,
      successCriteria: task.success_criteria,
    })

    // Create PR
    try {
      const pr = await createPullRequest({
        owner,
        repo,
        head: taskBranch,
        base: phaseBranch,
        title: `[${taskId}] ${task.title}`,
        body: prBody,
        draft: false,
      })

      run.prNumber = pr.number
      run.prUrl = pr.url
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new PRCreationError(taskId, message)
    }

    // Step 11: Cleanup worktree
    try {
      await removeWorktree(run.worktreePath, { force: true, repoPath: rootDir })
      run.worktreePath = undefined
    } catch {
      // Worktree cleanup failure is non-fatal
    }

    // Step 12: Return success
    run.status = 'done'
    run.completedAt = new Date()

    return {
      success: true,
      run,
      summary: createTaskSummary(run, task.title, checkResult.changedFiles.length),
    }
  } catch (error) {
    // Ensure run is marked as failed
    if (run.status === 'running') {
      run.status = 'failed'
    }
    run.completedAt = new Date()

    if (!run.errorMessage) {
      run.errorMessage = error instanceof Error ? error.message : String(error)
    }

    // Attempt worktree cleanup
    if (run.worktreePath) {
      try {
        const { rootDir } = await loadConfig()
        await removeWorktree(run.worktreePath, { force: true, repoPath: rootDir })
      } catch {
        // Cleanup failure is non-fatal
      }
    }

    // Re-throw known errors
    if (
      error instanceof TaskNotFoundError ||
      error instanceof PhaseNotFoundError ||
      error instanceof PrePRCheckError ||
      error instanceof NeverTouchViolationError ||
      error instanceof RebaseConflictError ||
      error instanceof PRCreationError ||
      error instanceof WorktreeError
    ) {
      throw error
    }

    // Return failure result for unknown errors
    return {
      success: false,
      run,
      summary: createTaskSummary(run, options.taskId, 0),
    }
  }
}

/**
 * Create a dry run plan without executing.
 *
 * @param options - Task run options
 * @returns Dry run plan
 */
export async function createDryRunPlan(options: RunTaskOptions): Promise<DryRunPlan> {
  const { phaseId, taskId, prdPath: prdPathOverride, engine = 'claude-code' } = options

  const { config, rootDir } = await loadConfig()
  const prdPath = prdPathOverride ?? join(rootDir, '.karimo', 'prds', `${phaseId}.md`)

  let parsedPRD: ParsedPRD
  try {
    parsedPRD = await parsePRDFile(prdPath)
  } catch {
    throw new PhaseNotFoundError(phaseId, prdPath)
  }

  const task = parsedPRD.tasks.find((t) => t.id === taskId)
  if (!task) {
    throw new TaskNotFoundError(taskId, phaseId)
  }

  return {
    phaseId,
    task: {
      id: task.id,
      title: task.title,
      complexity: task.complexity,
      costCeiling: task.cost_ceiling,
    },
    prdPath,
    phaseBranch: `feature/${phaseId}`,
    taskBranch: `feature/${phaseId}/${taskId}`,
    worktreePath: join(rootDir, 'worktrees', phaseId),
    engine,
    commands: {
      build: config.commands.build,
      typecheck: config.commands.typecheck,
    },
  }
}
