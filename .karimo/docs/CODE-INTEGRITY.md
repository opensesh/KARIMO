# KARIMO Code Integrity Safeguards

Code integrity is enforced at multiple points in the pipeline to ensure agents don't break existing functionality and that changes are properly reviewed before merging.

---

## Safeguard Summary

| Safeguard | When It Runs |
|-----------|--------------|
| File-overlap detection | Before launching parallel tasks |
| Cost ceiling check | Every 5 iterations during execution |
| Mandatory rebase | Before PR creation |
| Caution file detection | After rebase, flags PR |
| Integration check | After PR merge |
| Compound learning | After task marked done |
| Cumulative phase review | After all tasks in phase complete |

---

## 7.1 Mandatory Rebase Before PR

After an agent completes a task, the orchestrator rebases the task branch onto the latest phase branch HEAD before creating the PR. Conflicts mark the task as `needs-human-rebase` and the pipeline moves to the next task.

```bash
cd ~/worktrees/phase-1
git checkout feature/phase-1/1a-task
git fetch origin
git rebase feature/phase-1
# If conflicts → mark needs-human-rebase → move to next task
```

### Why This Matters

Without mandatory rebase, sibling branches become stale. If Task A merges first and Task B has an outdated base, the merge could:
- Introduce merge conflicts
- Overwrite Task A's changes
- Create integration failures that are hard to trace

By rebasing before PR creation, we ensure each task's changes are applied on top of the latest phase branch state.

---

## 7.2 File-Overlap Detection

Before launching parallel tasks, the orchestrator checks `files_affected` for overlapping paths. Overlap forces sequential execution.

### Implementation

```typescript
function detectFileOverlaps(readyTasks: Task[]): { safe: Task[], sequential: Task[][] } {
  const fileMap = new Map<string, string[]>();

  for (const task of readyTasks) {
    for (const file of task.files_affected) {
      const existing = fileMap.get(file) || [];
      existing.push(task.id);
      fileMap.set(file, existing);
    }
  }

  const overlapping = new Set<string>();
  for (const [file, taskIds] of fileMap) {
    if (taskIds.length > 1) {
      taskIds.forEach(id => overlapping.add(id));
      console.warn(`⚠️ File overlap: ${file} affected by tasks ${taskIds.join(', ')} — forcing sequential`);
    }
  }

  const safe = readyTasks.filter(t => !overlapping.has(t.id));
  const sequentialGroup = readyTasks.filter(t => overlapping.has(t.id));

  return { safe, sequential: sequentialGroup.length > 0 ? [sequentialGroup] : [] };
}
```

### Example

Given these tasks:
- Task A: touches `src/app/settings/page.tsx`
- Task B: touches `src/lib/services/notification.ts`
- Task C: touches `src/app/settings/page.tsx`

Result: Tasks A and C have file overlap. Tasks A and B can run in parallel. Task C must wait for A to complete.

---

## 7.3 Phase-Level Integration Check

After every task PR merges into the phase branch, the orchestrator runs integration checks:

```bash
bun run build && bun run typecheck && bun run test
```

If any check fails, the orchestrator rolls back the merge and moves the task to `integration-failure`.

### Implementation

```typescript
async function postMergeIntegrationCheck(
  phaseId: string,
  taskId: string,
  mergeCommit: string
): Promise<boolean> {
  const worktree = getWorktreePath(phaseId);

  const result = await runCommand(
    'bun run build && bun run typecheck && bun run test',
    worktree
  );

  if (!result.success) {
    await runCommand(`git revert --no-commit ${mergeCommit}`, worktree);
    await runCommand(`git commit -m "Rollback: ${taskId} integration failure"`, worktree);
    await updateGitHubProject(taskItemId, {
      status: 'Integration Failure',
      agent_status: 'integration-failure',
    });
    console.error(`🔴 Integration check failed for ${taskId}. Merge rolled back.`);
    return false;
  }

  console.log(`✅ Integration check passed for ${taskId}`);
  return true;
}
```

---

## 7.4 Caution File Enforcement

The `require_review` list in `config.yaml` identifies files that need human review when modified.

### Enforcement Flow

1. Orchestrator checks the diff after agent completes
2. If any `require_review` file is modified:
   - PR gets ⚠️ CAUTION FILE MODIFIED label
   - PR body lists which files triggered the flag
   - PR cannot auto-merge even with Greptile 5/5
   - You must explicitly approve

### Configuration

```yaml
# .karimo/config.yaml
boundaries:
  never_touch:
    - "migrations/*.sql"            # Migrations are append-only
    - "*.lock"                      # Package locks
    - ".env*"                       # Environment files
    - ".karimo/config.yaml"         # Pipeline config (read-only for agents)
  require_review:
    - "middleware.ts"               # Auth middleware
    - "app/layout.tsx"              # Root layout
```

### Implementation

```typescript
async function prePRChecks(task: Task, run: TaskRun, config: ProjectConfig): Promise<PrePRResult> {
  // ... rebase and build checks ...

  // 3. Caution file detection
  const diffFiles = await getChangedFiles(run.branch, run.phaseBranch);
  const cautionFiles = diffFiles.filter(f =>
    config.boundaries.require_review.some(pattern => minimatch(f, pattern))
  );
  if (cautionFiles.length > 0) {
    run.cautionFilesModified = cautionFiles;
    // Don't block PR creation — but flag it
  }

  // ... cost ceiling check ...

  return { proceed: true, cautionFiles };
}
```

---

## 7.5 Cumulative Phase Review

After all tasks in a phase merge, one final Greptile review on the entire phase branch diff against `main`. This catches interaction bugs that per-task reviews miss.

### Implementation

```typescript
async function cumulativePhaseReview(phaseId: string): Promise<GreptileReview> {
  const prNumber = await createPR({
    head: `feature/${phaseId}`,
    base: 'main',
    title: `[PHASE REVIEW] ${phaseId} — Cumulative Review`,
    body: 'Automated cumulative review of all phase changes against main.',
    draft: true,
  });

  const review = await waitForGreptileReview(prNumber, {
    timeout: 30 * 60 * 1000,
    pollInterval: 60 * 1000,
  });

  console.log(`📋 Phase ${phaseId} cumulative review: ${review.score}/5`);
  await closePR(prNumber);
  return review;
}
```

The review is on a draft PR (closed after review). Actual merge to `main` happens when you're ready.

---

## Git Worktree Strategy

One worktree per phase, task branches within. Mandatory rebase of task branch onto phase branch HEAD before PR creation.

### Branch Naming Convention

```
main
└── feature/auth-system              (long-lived phase branch)
    ├── feature/auth-system/1a-db-schema
    ├── feature/auth-system/1b-api-routes
    ├── feature/auth-system/1c-middleware
    └── feature/auth-system/1d-ui-components
```

### Worktree Structure

```
~/project/                    # Main repo (not used by agents)
~/project/worktrees/
    └── phase-1/              # Worktree for phase 1
        └── (agent works here)
```

### Why Worktrees?

1. **Isolation** — Each phase has its own working directory. Agents can't accidentally modify files in other phases.
2. **Parallel execution** — Multiple phases can run simultaneously in different worktrees.
3. **Clean state** — If a worktree gets corrupted, it can be deleted and recreated without affecting the main repo.

---

## Automated Code Review with Greptile

Starting at **Level 2**, you have the option to integrate [Greptile](https://greptile.com) for automated PR review. Greptile is a paid service that provides AI-powered code review specifically trained on your codebase.

### What Greptile Does

Greptile reviews every PR created by KARIMO agents and returns a score from 1–5:

| Score | Meaning | KARIMO Action |
|-------|---------|---------------|
| 5/5 | Excellent — ready to merge | Mark task as `done` |
| 4/5 | Good — minor issues acceptable | Mark task as `done` |
| 3/5 or below | Issues found | Trigger revision loop |

When a PR scores below 4, the orchestrator automatically:
1. Extracts the specific feedback from Greptile
2. Re-invokes the agent with that feedback
3. Deducts the revision cost from the task's revision budget
4. Repeats until score ≥ 4 or revision budget exhausted

### Why Use Greptile

**Without Greptile (Level 0–1):** You manually review every PR the agents create. This works, but it means you're the bottleneck — agents can produce PRs faster than you can review them.

**With Greptile (Level 2+):** PRs are reviewed automatically. You only step in when:
- Caution files are modified (always requires human approval)
- The task fails after exhausting its revision budget
- You want to spot-check high-complexity tasks

This shifts your role from "reviewer of everything" to "reviewer of exceptions."

### How Greptile Helps Code Integrity

1. **Per-task review** — Every PR gets reviewed before it can merge, catching issues early.

2. **Revision loops** — Bad code doesn't just get flagged, it gets fixed automatically (within budget).

3. **Cumulative phase review** — After all tasks in a phase merge, Greptile reviews the entire phase branch diff against `main`. This catches interaction bugs that per-task reviews miss.

4. **Non-blocking** — If Greptile times out, the task moves to `review-pending` and the pipeline continues. Results are processed asynchronously.

5. **Engine evaluation** — At Level 4, Greptile scores are tracked per-engine (Claude vs. Codex vs. Gemini), helping you understand which agents produce better code for your codebase.

### Configuration

Greptile requires a `GREPTILE_TOKEN` in your environment. Add it to `.env.local` (never commit this):

```bash
# .env.local
GREPTILE_TOKEN=your_token_here
```

The orchestrator handles Greptile polling automatically — no additional configuration needed in `config.yaml`.

### Without Greptile

Greptile is optional. If you skip it:
- All PRs require manual review
- No automated revision loops
- You're responsible for catching issues before merge
- Still works fine for small teams or low-volume projects

See [LEVELS.md](./LEVELS.md) for the full progression and what each level adds.

---

## Related Documentation

- [SECURITY.md](./SECURITY.md) — Agent sandbox and boundary enforcement
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview with pre-PR checks diagram
- [COMPONENTS.md](./COMPONENTS.md) — Orchestrator engine implementation details
