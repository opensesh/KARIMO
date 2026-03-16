# KARIMO Methodology Rules

Portable rules that define KARIMO agent behavior. These rules are appended to your project's CLAUDE.md during installation and apply to all agent executions.

---

## Core Philosophy

**"You are the architect, agents are the builders, Greptile is the inspector."**

KARIMO agents execute tasks defined in PRDs. The human architect designs the feature through the interview process; agents build it; automated review validates it.

---

## Command Context

Agents are spawned by these primary commands:
- `/karimo:research` — Spawns researcher + refiner agents (required first step)
- `/karimo:plan` — Spawns interviewer + investigator + reviewer
- `/karimo:run` — Creates feature branch, spawns PM agent for execution
- `/karimo:merge` — Final PR creation after feature branch execution
- `/karimo:feedback` — Intelligent feedback with auto-detection (simple or complex path)

Task agents (implementer, tester, documenter) are spawned by PM agent, not directly by commands.

---

## Execution Models

KARIMO v5.0 supports two execution models:

### Feature Branch Model (v5.0) — Recommended

PRs target a feature branch, which merges to main after all tasks complete:

- **Feature branch:** `feature/{prd-slug}` (created by `/karimo:run`)
- **Task PRs:** Target feature branch
- **Wave execution:** Within feature branch (wave 2 waits for wave 1 to merge to feature branch)
- **Final PR:** `feature/{prd-slug}` → main (one production deployment)
- **Branch naming:** `worktree/{prd-slug}-{task-id}`
- **Cleanup:** Feature branch deleted after merge to main

**Benefits:**
- Single production deployment per PRD
- No Vercel/Netlify spam
- Consolidated review before main merge
- Clean git history with feature-level commits

**Use for:** Most PRDs (5+ tasks), complex features, coordinated releases

### Direct-to-Main Model (v4.0) — Backward Compatible

PRs target main directly:

- **No feature branch:** Tasks merge directly to main
- **Task PRs:** Target main
- **Wave execution:** Sequenced by main merge status
- **Production deployments:** One per task (15+ per PRD)
- **Branch naming:** `worktree/{prd-slug}-{task-id}`

**Use when:**
- Simple PRDs (1-3 tasks)
- Hotfixes or urgent changes
- Existing v4.0 workflows

**Requirements (both models):**
- GitHub MCP server configured in Claude Code
- gh CLI authenticated with `repo` scope

---

## Agent Behavior Rules

### 1. Task Boundaries

- **Complete your assigned task only.** Do not modify code outside your task's `files_affected` list unless absolutely necessary.
- **Never touch `Never Touch` files.** These are defined in the CLAUDE.md Boundaries section and include migrations, lock files, and environment files.
- **Flag `Require Review` files.** If your task requires modifying a file on this list, complete the task but note it prominently in the PR.

### 2. Branch Identity & Parallel Execution

#### 2.1 Mandatory Branch Verification

Before EVERY commit operation, agents MUST verify branch identity:

```bash
CURRENT=$(git branch --show-current)
EXPECTED="worktree/{prd-slug}-{task-id}"

if [ "$CURRENT" != "$EXPECTED" ]; then
  echo "FATAL: Branch mismatch. Expected '$EXPECTED', got '$CURRENT'"
  echo "DO NOT COMMIT. Report to user immediately."
  exit 1
fi
```

**This is non-negotiable.** Branch contamination during parallel execution is
unacceptable. This check prevents commits from landing on wrong branches.

**When check fails:**
1. STOP immediately (do not commit)
2. Display expected vs actual branch
3. Check git branch state with `git branch --show-current`
4. Surface error to user for manual investigation

### 3. Commit Standards

- **Use Conventional Commits.** All commits must follow the format:
  ```
  <type>(<scope>): <description>

  [optional body]

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

- **Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`
- **Scope:** The component or module being modified
- **Always include the Co-Authored-By footer**

### 4. Code Quality

- **Follow existing patterns.** Before creating new patterns, check `files_affected` and `agent_context` for references to existing code.
- **Match the codebase style.** Use the same formatting, naming conventions, and architectural patterns as surrounding code.
- **No `any` types in TypeScript.** Use `unknown` and narrow, or define proper types.
- **Handle errors explicitly.** Use structured error types, never bare try/catch.

### 5. Testing

- **Add tests for new functionality.** If your task creates new code, include tests.
- **Don't break existing tests.** Run the test suite before committing.
- **Test edge cases.** Check for null, undefined, empty arrays, and error states.

### 6. Documentation

- **Update docs if behavior changes.** If your task changes how something works, update relevant documentation.
- **Add JSDoc to exported functions.** Public APIs should have documentation.
- **Don't create unnecessary docs.** Only document what needs explanation.

---

## Execution Rules

### 1. Task Completion

- **Complete your current task before stopping.** Don't leave partial implementations.
- **If blocked, document why.** Add a comment explaining what's blocking progress.
- **Mark ambiguous requirements.** If something is unclear, add a TODO and note it in the PR.

### 2. Branch Discipline

- **Push to your assigned branch:** `worktree/{prd-slug}-{task-id}`
- **Claude Code handles worktrees:** Task agents use `isolation: worktree`
- **Commit frequently:** Make atomic commits
- **PR target branch:**
  - Feature branch mode: Target `feature/{prd-slug}`
  - Direct-to-main mode: Target `main`
  - PM Agent determines target based on `status.json` execution mode

### 3. Branch Lifecycle (Cleanup)

Task branches are cleaned **immediately after their PR merges**:

| Event | Action |
|-------|--------|
| Task PR merges to feature branch | PM deletes task branch + worktree |
| Final PR merges to main | Feature branch deleted by GitHub |
| `/karimo:merge` completes | Remaining branches cleaned (safety net) |

Branch naming uses `worktree/` prefix (e.g., `worktree/user-profiles-1a`) for visual distinction in GitHub UI and easier cleanup via pattern matching.

### 4. Pre-PR Validation

Before the PM creates a PR, verify:
- [ ] Build passes (from CLAUDE.md Commands table)
- [ ] Type check passes (from CLAUDE.md Commands table)
- [ ] Lint passes (from CLAUDE.md Commands table)
- [ ] No `Never Touch` files modified (from CLAUDE.md Boundaries)
- [ ] Branch based on latest target branch (feature branch or main)

### 5. PR Standards

PRs are created by the PM agent with:
- **Title:** `feat({prd-slug}): [{task-id}] {task-title}`
- **Labels:** `karimo`, `karimo-{prd-slug}`, `wave-{n}`, `complexity-{c}`
- **Description:** Task context, changes made, files affected
- **Success criteria checklist:** Include criteria from the task definition

---

## Learning Rules

### 1. Pattern Recognition

- **Note patterns that work.** When you find an effective approach, it may apply to similar future tasks.
- **Identify anti-patterns.** When something causes problems, flag it for the `/karimo:feedback` system.

### 2. Post-PR Learning

After a PR is merged:
- **What worked?** Patterns that made the task smoother
- **What was harder than expected?** Complexities not captured in the PRD
- **What would help future tasks?** Missing context or documentation

### 3. Continuous Improvement

The human architect uses `/karimo:feedback` to capture learnings. These become rules that apply to future executions. Always check `.karimo/learnings/` for project-specific guidance (patterns, anti-patterns, project-notes, execution-rules).

---

## Loop Awareness

### 1. Loop Awareness & Semantic Stall Detection

A "loop" is one complete attempt at a task (code → validate → commit or retry).

**Two types of loops detected:**

1. **Action-level loops:** Same bash command run 3+ times (existing detection)
2. **Semantic loops:** Different actions, but stuck in same state (NEW)

**Semantic loop fingerprint:**
```
SHA256({
  action_type: "commit" | "validation" | "file_read",
  files_touched: [sorted list],
  branch_state: git-HEAD-sha,
  validation_errors: [normalized patterns]
})
```

**Detection:** If current fingerprint matches any of last 5 → semantic loop detected

**Circuit breaker behavior:**
- **After 3 loops (action or semantic):** Trigger stall detection
- **If Sonnet:** Escalate to Opus, reset loop count to 1
- **If Opus:** Mark `needs-human-review`, notify user
- **Hard limit:** Max 5 total loops before human required

**Tracked in status.json:**
```json
{
  "tasks": {
    "1a": {
      "loops": 2,
      "fingerprints": ["abc123...", "def456..."],
      "model": "opus"
    }
  }
}
```

### 2. Model-Based Execution

Tasks are assigned models based on complexity:
- **Complexity 1–4**: Sonnet (efficient for straightforward tasks)
- **Complexity 5–10**: Opus (complex reasoning, multi-file coordination)

If a Sonnet task stalls with borderline complexity (4-5), PM may upgrade to Opus.

---

## Communication

### 1. PR Description

Use the PR description to:
- Explain non-obvious decisions
- Flag areas that need human attention
- Note deviations from the original task

### 2. Status Updates

Keep `status.json` current:
- Mark task `running` when starting
- Update to `in-review` when PR created
- Record `model` and `loops` on completion

### 3. Wave Findings

When a wave completes, findings are propagated:
- PM updates `.karimo/prds/{slug}/findings.md`
- Next wave gets context from merged PRs
- Files modified and patterns established are documented

---

## JSON Parsing Without jq

KARIMO avoids external `jq` dependency. Use these approaches:

### Simple Root-Level Fields (grep/sed)

```bash
# Parse status field
status=$(grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' file.json | \
  sed 's/.*"\([^"]*\)"$/\1/')
```

### GitHub CLI Operations (gh --jq)

GitHub CLI has built-in jq support via the `--jq` flag:

```bash
# Get PR state
gh pr view 42 --json state --jq '.state'

# List labels
gh pr view 42 --json labels --jq '.labels[].name'

# Check for merged PRs
gh pr list --head "branch-name" --json state,mergedAt --jq '.[0]'
```

### Complex JSON Queries (Node.js Fallback)

For complex nested queries:

```bash
node -e "const s = JSON.parse(require('fs').readFileSync('status.json','utf8')); console.log(s.tasks['1a'].status)"
```

---

## Security

### 1. Never Commit Secrets

- No API keys, tokens, or passwords in code
- Use environment variables for sensitive values
- Check for accidental secret exposure before committing

### 2. Input Validation

- Validate all external inputs
- Use Zod or similar for schema validation
- Never trust user-provided data

### 3. Safe Defaults

- Fail closed, not open
- Default to restrictive permissions
- Log security-relevant events

---

*These rules enable consistent, high-quality autonomous execution across projects.*
