/**
 * KARIMO Git Module Tests
 *
 * Comprehensive tests for git operations including command execution,
 * worktree management, branch operations, rebase handling, and diff analysis.
 * Uses real temporary git repositories for accurate testing.
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  BranchCreateError,
  GitCommandError,
  WorktreeCreateError,
  WorktreeNotFoundError,
  branchExists,
  createTaskBranch,
  createWorktree,
  deleteBranch,
  detectCautionFiles,
  detectNeverTouchViolations,
  getChangedFiles,
  getChangedFilesDetailed,
  getCurrentBranch,
  getDefaultBranch,
  getHeadSha,
  getRepoRoot,
  getWorktreeInfo,
  getWorktreePath,
  gitExec,
  hasUncommittedChanges,
  isGitRepo,
  isRebaseInProgress,
  listBranches,
  listWorktrees,
  needsRebase,
  pruneWorktrees,
  rebaseOntoTarget,
  removeWorktree,
  worktreeExists,
} from '../index'

// =============================================================================
// Test Helpers
// =============================================================================

let tempDir: string

/**
 * Create a temporary git repository for testing.
 */
async function createTempRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'karimo-git-test-'))
  await gitExec(['init'], { cwd: dir })
  await gitExec(['config', 'user.email', 'test@karimo.dev'], { cwd: dir })
  await gitExec(['config', 'user.name', 'KARIMO Test'], { cwd: dir })
  // Create initial commit
  await Bun.write(join(dir, 'README.md'), '# Test Repository\n')
  await gitExec(['add', '.'], { cwd: dir })
  await gitExec(['commit', '-m', 'Initial commit'], { cwd: dir })
  return dir
}

/**
 * Create a file and commit it.
 */
async function createAndCommit(
  dir: string,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  await Bun.write(join(dir, filePath), content)
  await gitExec(['add', filePath], { cwd: dir })
  await gitExec(['commit', '-m', message], { cwd: dir })
}

// =============================================================================
// Setup/Teardown
// =============================================================================

beforeEach(async () => {
  tempDir = await createTempRepo()
})

afterEach(async () => {
  // Clean up temp directory
  try {
    await rm(tempDir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
})

// =============================================================================
// Git Exec Tests
// =============================================================================

describe('gitExec', () => {
  test('executes git commands successfully', async () => {
    const result = await gitExec(['status'], { cwd: tempDir })
    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('nothing to commit')
  })

  test('returns stderr on failure with throwOnError: false', async () => {
    const result = await gitExec(['checkout', 'nonexistent-branch'], {
      cwd: tempDir,
      throwOnError: false,
    })
    expect(result.success).toBe(false)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toBeTruthy()
  })

  test('throws GitCommandError on failure by default', async () => {
    await expect(
      gitExec(['checkout', 'nonexistent-branch'], { cwd: tempDir })
    ).rejects.toThrow(GitCommandError)
  })

  test('includes command in error message', async () => {
    try {
      await gitExec(['invalid-command-xyz'], { cwd: tempDir })
    } catch (error) {
      expect(error).toBeInstanceOf(GitCommandError)
      const gitError = error as GitCommandError
      expect(gitError.args).toContain('invalid-command-xyz')
    }
  })
})

describe('getRepoRoot', () => {
  test('returns repository root path', async () => {
    const root = await getRepoRoot(tempDir)
    expect(root).toBe(tempDir)
  })

  test('works from subdirectory', async () => {
    const subdir = join(tempDir, 'src', 'components')
    await Bun.write(join(subdir, 'test.ts'), 'export {}')
    const root = await getRepoRoot(subdir)
    expect(root).toBe(tempDir)
  })
})

describe('isGitRepo', () => {
  test('returns true for git repository', async () => {
    expect(await isGitRepo(tempDir)).toBe(true)
  })

  test('returns false for non-repo directory', async () => {
    const nonRepoDir = await mkdtemp(join(tmpdir(), 'non-repo-'))
    expect(await isGitRepo(nonRepoDir)).toBe(false)
    await rm(nonRepoDir, { recursive: true })
  })
})

describe('getHeadSha', () => {
  test('returns full commit SHA', async () => {
    const sha = await getHeadSha(tempDir)
    expect(sha).toMatch(/^[a-f0-9]{40}$/)
  })

  test('returns short SHA when requested', async () => {
    const sha = await getHeadSha(tempDir, true)
    expect(sha).toMatch(/^[a-f0-9]{7}$/)
  })
})

describe('getDefaultBranch', () => {
  test('returns main or master', async () => {
    const defaultBranch = await getDefaultBranch(tempDir)
    expect(['main', 'master']).toContain(defaultBranch)
  })
})

// =============================================================================
// Worktree Tests
// =============================================================================

describe('listWorktrees', () => {
  test('lists main worktree', async () => {
    const worktrees = await listWorktrees(tempDir)
    expect(worktrees.length).toBeGreaterThanOrEqual(1)
    expect(worktrees[0]?.isMain).toBe(true)
    expect(worktrees[0]?.path).toBe(tempDir)
  })
})

describe('createWorktree', () => {
  test('creates worktree at standard path', async () => {
    const worktreePath = await createWorktree(tempDir, 'phase-1', 'feature/phase-1/task-a')
    expect(worktreePath).toBe(join(tempDir, 'worktrees', 'phase-1'))
    expect(await worktreeExists(worktreePath, tempDir)).toBe(true)
  })

  test('returns existing worktree path if already exists', async () => {
    const path1 = await createWorktree(tempDir, 'phase-2', 'feature/phase-2/task-b')
    const path2 = await createWorktree(tempDir, 'phase-2', 'feature/phase-2/task-b')
    expect(path1).toBe(path2)
  })

  test('throws WorktreeCreateError for invalid path', async () => {
    // Try to create worktree in a path that will conflict
    await createWorktree(tempDir, 'conflict-test', 'feature/conflict-test/task')
    // Creating another worktree for the same branch should fail
    await expect(
      createWorktree(tempDir, 'conflict-test-2', 'feature/conflict-test/task')
    ).rejects.toThrow(WorktreeCreateError)
  })
})

describe('getWorktreeInfo', () => {
  test('returns worktree information', async () => {
    const worktreePath = await createWorktree(tempDir, 'info-test', 'feature/info-test/task')
    const info = await getWorktreeInfo(worktreePath, tempDir)
    expect(info.path).toBe(worktreePath)
    expect(info.branch).toBe('feature/info-test/task')
    expect(info.isDetached).toBe(false)
  })

  test('throws WorktreeNotFoundError for nonexistent path', async () => {
    await expect(
      getWorktreeInfo(join(tempDir, 'nonexistent-worktree'), tempDir)
    ).rejects.toThrow(WorktreeNotFoundError)
  })
})

describe('removeWorktree', () => {
  test('removes existing worktree', async () => {
    const worktreePath = await createWorktree(tempDir, 'remove-test', 'feature/remove-test/task')
    expect(await worktreeExists(worktreePath, tempDir)).toBe(true)
    await removeWorktree(worktreePath, { repoPath: tempDir })
    expect(await worktreeExists(worktreePath, tempDir)).toBe(false)
  })
})

describe('pruneWorktrees', () => {
  test('prunes stale worktree entries', async () => {
    // Create and manually delete worktree directory
    const worktreePath = await createWorktree(tempDir, 'prune-test', 'feature/prune-test/task')
    await rm(worktreePath, { recursive: true, force: true })

    // Prune should not throw
    await expect(pruneWorktrees(tempDir)).resolves.not.toThrow()
  })
})

describe('getWorktreePath', () => {
  test('returns standard worktree path', () => {
    const path = getWorktreePath('/repo', 'phase-1')
    expect(path).toBe('/repo/worktrees/phase-1')
  })
})

// =============================================================================
// Branch Tests
// =============================================================================

describe('createTaskBranch', () => {
  test('creates branch with standard naming', async () => {
    const branch = await createTaskBranch('phase-1', 'task-a', undefined, { cwd: tempDir })
    expect(branch).toBe('feature/phase-1/task-a')
    expect(await branchExists(branch, tempDir)).toBe(true)
  })

  test('returns existing branch name if already exists', async () => {
    await createTaskBranch('phase-2', 'task-b', undefined, { cwd: tempDir })
    const branch = await createTaskBranch('phase-2', 'task-b', undefined, { cwd: tempDir })
    expect(branch).toBe('feature/phase-2/task-b')
  })

  test('throws BranchCreateError for invalid base branch', async () => {
    await expect(
      createTaskBranch('phase-3', 'task-c', 'nonexistent-base', { cwd: tempDir })
    ).rejects.toThrow(BranchCreateError)
  })
})

describe('branchExists', () => {
  test('returns true for existing branch', async () => {
    await createTaskBranch('exists-test', 'task', undefined, { cwd: tempDir })
    expect(await branchExists('feature/exists-test/task', tempDir)).toBe(true)
  })

  test('returns false for nonexistent branch', async () => {
    expect(await branchExists('nonexistent-branch', tempDir)).toBe(false)
  })
})

describe('getCurrentBranch', () => {
  test('returns current branch name', async () => {
    const defaultBranch = await getDefaultBranch(tempDir)
    const current = await getCurrentBranch(tempDir)
    expect(current).toBe(defaultBranch)
  })
})

describe('listBranches', () => {
  test('lists all local branches', async () => {
    await createTaskBranch('list-test', 'task-1', undefined, { cwd: tempDir })
    await createTaskBranch('list-test', 'task-2', undefined, { cwd: tempDir })
    const branches = await listBranches(tempDir)
    expect(branches).toContain('feature/list-test/task-1')
    expect(branches).toContain('feature/list-test/task-2')
  })
})

describe('deleteBranch', () => {
  test('deletes existing branch', async () => {
    const branch = await createTaskBranch('delete-test', 'task', undefined, { cwd: tempDir })
    // Checkout default branch first (can't delete current branch)
    await gitExec(['checkout', await getDefaultBranch(tempDir)], { cwd: tempDir })
    await deleteBranch(branch, {}, { cwd: tempDir })
    expect(await branchExists(branch, tempDir)).toBe(false)
  })
})

// =============================================================================
// Rebase Tests
// =============================================================================

describe('rebaseOntoTarget', () => {
  test('successfully rebases onto target', async () => {
    // Create a branch with changes
    await createTaskBranch('rebase-test', 'task', undefined, { cwd: tempDir })
    await createAndCommit(tempDir, 'feature.ts', 'export const x = 1', 'Add feature')

    // Go back to default and create a different change
    await gitExec(['checkout', await getDefaultBranch(tempDir)], { cwd: tempDir })
    await createAndCommit(tempDir, 'other.ts', 'export const y = 2', 'Add other')

    // Checkout feature branch and rebase
    await gitExec(['checkout', 'feature/rebase-test/task'], { cwd: tempDir })
    const result = await rebaseOntoTarget(await getDefaultBranch(tempDir), { cwd: tempDir })

    expect(result.success).toBe(true)
    expect(result.conflictFiles).toEqual([])
  })

  test('handles conflicts gracefully', async () => {
    // Create conflicting changes on both branches
    await createTaskBranch('conflict-rebase', 'task', undefined, { cwd: tempDir })
    await createAndCommit(tempDir, 'conflict.ts', 'const x = "branch"', 'Branch change')

    await gitExec(['checkout', await getDefaultBranch(tempDir)], { cwd: tempDir })
    await createAndCommit(tempDir, 'conflict.ts', 'const x = "main"', 'Main change')

    await gitExec(['checkout', 'feature/conflict-rebase/task'], { cwd: tempDir })
    const result = await rebaseOntoTarget(await getDefaultBranch(tempDir), { cwd: tempDir })

    expect(result.success).toBe(false)
    expect(result.conflictFiles.length).toBeGreaterThan(0)
    expect(result.conflictFiles).toContain('conflict.ts')
  })
})

describe('isRebaseInProgress', () => {
  test('returns false when no rebase in progress', async () => {
    expect(await isRebaseInProgress(tempDir)).toBe(false)
  })
})

describe('needsRebase', () => {
  test('returns false when branch is up to date', async () => {
    const defaultBranch = await getDefaultBranch(tempDir)
    expect(await needsRebase(defaultBranch, { cwd: tempDir })).toBe(false)
  })

  test('returns true when target has new commits', async () => {
    await createTaskBranch('needs-rebase', 'task', undefined, { cwd: tempDir })
    await gitExec(['checkout', await getDefaultBranch(tempDir)], { cwd: tempDir })
    await createAndCommit(tempDir, 'new.ts', 'export {}', 'New commit')

    await gitExec(['checkout', 'feature/needs-rebase/task'], { cwd: tempDir })
    const defaultBranch = await getDefaultBranch(tempDir)
    expect(await needsRebase(defaultBranch, { cwd: tempDir })).toBe(true)
  })
})

// =============================================================================
// Diff Tests
// =============================================================================

describe('getChangedFiles', () => {
  test('returns empty array for no changes', async () => {
    const defaultBranch = await getDefaultBranch(tempDir)
    const files = await getChangedFiles(defaultBranch, 'HEAD', { cwd: tempDir })
    expect(files).toEqual([])
  })

  test('returns changed files between refs', async () => {
    const defaultBranch = await getDefaultBranch(tempDir)
    await createTaskBranch('diff-test', 'task', undefined, { cwd: tempDir })
    await createAndCommit(tempDir, 'changed.ts', 'export {}', 'Add file')

    const files = await getChangedFiles(defaultBranch, 'HEAD', { cwd: tempDir })
    expect(files).toContain('changed.ts')
  })
})

describe('getChangedFilesDetailed', () => {
  test('returns detailed file information', async () => {
    const defaultBranch = await getDefaultBranch(tempDir)
    await createTaskBranch('detailed-diff', 'task', undefined, { cwd: tempDir })
    await createAndCommit(tempDir, 'detailed.ts', 'export const x = 1\n', 'Add file')

    const result = await getChangedFilesDetailed(defaultBranch, 'HEAD', { cwd: tempDir })
    expect(result.totalFiles).toBe(1)
    expect(result.files[0]?.path).toBe('detailed.ts')
    expect(result.files[0]?.status).toBe('A')
  })
})

describe('detectCautionFiles', () => {
  test('detects files matching caution patterns', () => {
    const changedFiles = ['src/api/auth.ts', 'src/components/Button.tsx', 'package.json']
    const patterns = ['src/api/**', 'package.json']

    const result = detectCautionFiles(changedFiles, patterns)
    expect(result.cautionFiles).toContain('src/api/auth.ts')
    expect(result.cautionFiles).toContain('package.json')
    expect(result.cautionFiles).not.toContain('src/components/Button.tsx')
  })

  test('returns empty for no matches', () => {
    const changedFiles = ['src/components/Button.tsx']
    const patterns = ['*.sql', 'migrations/**']

    const result = detectCautionFiles(changedFiles, patterns)
    expect(result.cautionFiles).toEqual([])
  })

  test('handles exact path matching', () => {
    const changedFiles = ['app/layout.tsx', 'app/page.tsx']
    const patterns = ['app/layout.tsx']

    const result = detectCautionFiles(changedFiles, patterns)
    expect(result.cautionFiles).toEqual(['app/layout.tsx'])
  })
})

describe('detectNeverTouchViolations', () => {
  test('detects never_touch violations', () => {
    const changedFiles = ['package-lock.json', 'src/index.ts']
    const patterns = ['package-lock.json', '*.lock']

    const violations = detectNeverTouchViolations(changedFiles, patterns)
    expect(violations).toHaveLength(1)
    expect(violations[0]?.file).toBe('package-lock.json')
  })

  test('returns empty for no violations', () => {
    const changedFiles = ['src/feature.ts', 'tests/feature.test.ts']
    const patterns = ['package-lock.json', '*.lock']

    const violations = detectNeverTouchViolations(changedFiles, patterns)
    expect(violations).toHaveLength(0)
  })
})

describe('hasUncommittedChanges', () => {
  test('returns false for clean working tree', async () => {
    expect(await hasUncommittedChanges({ cwd: tempDir })).toBe(false)
  })

  test('returns true for uncommitted changes', async () => {
    await Bun.write(join(tempDir, 'uncommitted.ts'), 'export {}')
    expect(await hasUncommittedChanges({ cwd: tempDir })).toBe(true)
  })
})

// =============================================================================
// Error Class Tests
// =============================================================================

describe('GitCommandError', () => {
  test('includes command in message', () => {
    const error = new GitCommandError(['checkout', 'branch'], 1, 'error: pathspec not found')
    expect(error.message).toContain('git checkout branch')
    expect(error.message).toContain('error: pathspec not found')
  })
})

describe('WorktreeCreateError', () => {
  test('includes path and branch in message', () => {
    const error = new WorktreeCreateError('/path/to/worktree', 'feature/branch', 'already exists')
    expect(error.message).toContain('/path/to/worktree')
    expect(error.message).toContain('feature/branch')
  })
})

describe('BranchCreateError', () => {
  test('includes branch name and reason', () => {
    const error = new BranchCreateError('invalid-branch', 'already exists')
    expect(error.message).toContain('invalid-branch')
    expect(error.message).toContain('already exists')
  })
})
