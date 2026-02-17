# KARIMO Component Specifications

This document details the specifications for each KARIMO component, from auto-detection through task execution.

---

## 5.0 Auto-Detection & Config Initialization

The first touchpoint with KARIMO. Before any agent runs, the system needs to understand your project's stack and conventions.

### The Flow

1. Run `karimo init` in your target project
2. Five detectors scan in parallel (< 500ms):
   - **Project:** name, language, framework, runtime, database (from package.json, pyproject.toml, go.mod, Cargo.toml)
   - **Commands:** build, lint, test, typecheck (from package.json scripts, Makefile)
   - **Rules:** coding conventions (from tsconfig, biome.json, eslint, prettier configs)
   - **Boundaries:** never_touch and require_review patterns (from existing file structure)
   - **Sandbox:** safe environment variables (from .env.example only — never actual .env)
3. Results displayed with confidence indicators:
   - `●` **High** — Strong signal, auto-accepted
   - `◐` **Medium** — Good signal, verify recommended
   - `○` **Low** — Weak signal, likely needs correction
   - `?` **Not detected** — User must provide
4. User confirms or edits each section interactively
5. `.karimo/config.yaml` generated and saved

### Command Tiers

| Command | Requirement | Why |
|---------|-------------|-----|
| `build` | Required | Agent code must compile |
| `lint` | Required | Code quality gate |
| `test` | Recommended | Integration checks (can skip with `null`) |
| `typecheck` | Recommended | Pre-PR checks (can skip with `null`) |

### Stack-Aware Recommendations

When test/typecheck aren't detected, the system suggests commands based on your stack:

| Stack | Test Suggestion | Typecheck Suggestion |
|-------|-----------------|----------------------|
| TypeScript + Bun | `bun test` | `bunx tsc --noEmit` |
| TypeScript + Node | `npx vitest` | `npx tsc --noEmit` |
| Python | `pytest` | `mypy .` |
| Go | `go test ./...` | `go vet ./...` |
| Rust | `cargo test` | `cargo check` |

### Design Principles

- **Conservative detection** — Prefer `null` over wrong guess
- **Privacy-safe** — Never read actual .env files
- **Bounded output** — Rules capped at 10, boundaries only include existing files
- **Parallel execution** — All detectors run via Promise.all

### Module Reference

| File | Purpose |
|------|---------|
| `src/config/detect/types.ts` | DetectionResult, DetectedValue, Confidence types |
| `src/config/detect/project.ts` | Detect name, language, framework, runtime, database |
| `src/config/detect/commands.ts` | Detect build, lint, test, typecheck commands |
| `src/config/detect/rules.ts` | Infer coding rules from config files |
| `src/config/detect/boundaries.ts` | Detect never_touch and require_review patterns |
| `src/config/detect/sandbox.ts` | Detect safe environment variables |
| `src/config/detect/recommendations.ts` | Stack-aware test/typecheck suggestions |
| `src/config/detect/index.ts` | Orchestrator running all detectors in parallel |

---

## 5.1 PRD Interview Process

The bridge between your product thinking and agent-consumable tasks. This runs inside Claude Code — either through the VS Code extension or the terminal.

### The Flow

1. You kick off a feature. A feature is a well-scoped phase of development with strategic scope and user value. You tell Claude you're building a new feature and attach any supporting context — markdown documents, implementation plans, design specs, research notes. These serve as the basis for the PRD interview. (Configured via `/karimo:plan` command.)

2. Claude interviews you using the KARIMO PRD Template, walking through each section conversationally:
   - Project specifics (owner, status, target date)
   - Executive summary (one-liner, what's changing, who it's for, why now)
   - Problem + context (with supporting data from your attached docs)
   - Goals, non-goals, success metrics
   - Users + use cases
   - Requirements (functional, prioritized as Must / Should / Could)
   - UX / interaction notes
   - Assumptions, constraints, dependencies, risks
   - Rollout plan + milestones
   - Retrospective input (Round 5) — checkpoint learnings from previous phases are loaded automatically and presented for review

3. Claude generates a `PRD_[feature-name].md` with all sections filled in, plus an **Agent Tasks** appendix that breaks requirements into ordered, dependency-aware tasks following the YAML task schema.

4. GitHub Issues are auto-created from the task list and added to the feature's GitHub Project with all custom fields populated.

### Interview Round 5: Retrospective Input

```
"Looking at the checkpoint data from Phase [N-1]:"
"- These patterns worked well: [list from checkpoints]"
"- These anti-patterns were flagged: [list from checkpoints]"
"- Cost estimates were [over/under] by [X]%"
"Does any of this change how we should approach this phase?"
```

### PRD-to-Task YAML Example

```yaml
tasks:
  - id: "settings-1a"
    title: "Create user_preferences table and API route"
    description: |
      Add a user_preferences table to the database with columns for
      theme, language, notification settings, and timezone. Expose a
      GET/PUT REST route at /api/settings/preferences.
    depends_on: []
    complexity: 4
    estimated_iterations: 17
    cost_ceiling: 12.00
    success_criteria:
      - "Migration creates user_preferences table"
      - "GET /api/settings/preferences returns 200"
      - "PUT /api/settings/preferences validates input with Zod"
      - "bun run build && bun run typecheck passes"
    files_affected:
      - "supabase/migrations/20260301_user_preferences.sql"
      - "src/app/api/settings/preferences/route.ts"
      - "src/lib/db/queries/preferences.ts"
    agent_context: |
      Follow the pattern in src/lib/db/queries/profiles.ts.
      Use Zod schemas in src/lib/validators/.
    assigned_to: "karim"
```

---

## 5.2 GitHub Projects Integration

GitHub Projects is the single source of truth for all task execution state. The PRD.md in the repo remains the narrative document, but where a task sits in the pipeline lives in GitHub Projects.

### Custom Fields

| Field | Type | Purpose |
|-------|------|---------|
| `complexity` | Number | 1–10 scale from PRD |
| `assigned_to` | Text | Owner of the task |
| `depends_on` | Text | Comma-separated task IDs |
| `cost_ceiling` | Number | Max USD for this task |
| `actual_cost` | Number | Actual USD spent |
| `estimated_iterations` | Number | Max iterations |
| `iterations_used` | Number | Actual iterations |
| `greptile_score` | Number | Latest review score (1–5) |
| `files_affected` | Text | Comma-separated file paths |
| `agent_status` | Single Select | queued / running / review / revision / done / failed / aborted |
| `pr_number` | Number | Linked PR number |
| `revision_count` | Number | Greptile revision loops |
| `require_review_triggered` | Boolean | Caution file flag |

### Status Columns

| Column | Meaning |
|--------|---------|
| Ready | Dependencies met, eligible for execution |
| In Progress | Agent actively working |
| In Review | PR created, awaiting review |
| Review Pending | Greptile timed out — needs manual review |
| Revision | Score < 4/5, agent revising |
| Done | Passed review, ready for merge |
| Failed | Exhausted retries, hit ceiling, or fatal error |
| Needs Human Rebase | Rebase conflicts agent can't resolve |
| Integration Failure | Merged but phase build/test failed — rolled back |

### Offline Mode

When `--offline` flag is set or GitHub API is unreachable, state is stored in `.karimo/local-state.json`. On reconnection, `karimo sync` pushes local state to GitHub Projects.

---

## 5.3 Project Config

Full schema for `.karimo/config.yaml`:

```yaml
project:
  name: "your-project"
  language: "TypeScript"
  framework: "Next.js"
  runtime: "Bun"
  database: "Supabase"

commands:
  build: "bun run build"
  lint: "bun run lint"
  test: "bun run test"          # null if not applicable
  typecheck: "bun run typecheck" # null if not applicable

rules:
  - "TypeScript strict mode — no `any` types"
  - "Use Zod validation for all API inputs"
  - "Follow existing patterns before creating new ones"

boundaries:
  never_touch:
    - "migrations/*.sql"
    - "*.lock"
    - ".env*"
    - ".karimo/config.yaml"
  require_review:
    - "middleware.ts"
    - "app/layout.tsx"

cost:
  model_preference: "sonnet"
  cost_multiplier: 3
  base_iterations: 5
  iteration_multiplier: 3
  revision_budget_percent: 50
  max_revision_loops: 3
  abort_on_fatal: true
  fallback_cost_per_minute: 0.50
  phase_budget_cap: 60          # null = no limit
  phase_budget_overflow: 0.10
  session_budget_cap: 100       # null = no limit
  budget_warning_threshold: 0.75

fallback_engine:
  enabled: true
  engines:
    - name: "codex"
      command: "codex"
      budget_cap: 50
      priority: 1
    - name: "gemini"
      command: "gemini-cli"
      budget_cap: 50
      priority: 2
  trigger_on:
    - "rate-limit"
    - "quota-exceeded"

sandbox:
  allowed_env:
    - "PATH"
    - "HOME"
    - "NODE_ENV"
```

### Module Reference

| File | Purpose |
|------|---------|
| `src/config/schema.ts` | Zod schemas and inferred types |
| `src/config/loader.ts` | Config discovery, loading, and validation |
| `src/config/defaults.ts` | Default values for optional config fields |
| `src/config/errors.ts` | Custom error classes with clear messages |
| `src/config/init.ts` | Interactive config initialization |
| `src/config/index.ts` | Public API (barrel exports) |

---

## 5.4 CLI Commands

```bash
# === Execution ===
karimo orchestrate --phase 1              # Full phase sequentially
karimo orchestrate --phase 1 --parallel   # Full phase with file-overlap detection
karimo orchestrate --task 1a              # Single task
karimo orchestrate --all-ready            # All ready tasks across all phases
karimo orchestrate --phase 1 --user karim # Only your assigned tasks
karimo orchestrate --task 1a --engine codex  # Force specific engine
karimo orchestrate --phase 1 --dry-run    # Show what would execute
karimo orchestrate --task 1a --offline    # Local JSON state
karimo orchestrate --task 1a --no-cost-limit  # Override cost ceiling

# === Monitoring ===
karimo status                             # Quick status check
karimo status --phase 1
karimo status --user karim
karimo costs                              # Cost summary
karimo costs --phase 1

# === Control ===
karimo abort                              # Graceful abort
Ctrl+C                                    # Immediate abort
karimo sync                               # Push local state to GitHub Projects
karimo recover                            # Recover interrupted tasks

# === Checkpoints ===
karimo checkpoint --level 1               # Level checkpoint
karimo checkpoint --task 1a               # Task checkpoint
karimo checkpoint --phase 1               # Phase checkpoint

# === Setup ===
karimo init                               # Create config via auto-detection
karimo onboard                            # Verify setup for new team member
karimo doctor                             # Verify configuration and dependencies
```

### Setup Command Clarification

- **`karimo init`** — Run once per target project. Scans the codebase, detects project configuration, displays results with confidence levels, and writes `.karimo/config.yaml`.

- **`karimo onboard`** — Run by each new team member. Assumes config already exists. Verifies environment (Bun, Claude Code, GitHub token), explains project rules, and confirms access.

---

## 5.5 Orchestrator Engine

### Core Data Types

```typescript
interface TaskRun {
  taskId: string;
  phaseId: string;
  issueNumber: number;
  projectItemId: string;
  status: 'queued' | 'running' | 'review' | 'review-pending' | 'revision'
        | 'done' | 'failed' | 'aborted' | 'needs-human-rebase'
        | 'integration-failure';
  pid?: number;
  iterations: number;
  maxIterations: number;
  costCeiling: number;
  currentCost: number;
  revisionBudget: number;
  startedAt?: Date;
  completedAt?: Date;
  prNumber?: number;
  greptileScore?: number;
  estimatedCost: number;
  errorType?: ErrorType;
  revisionCount: number;
  engine: string;
  cautionFilesModified: string[];
  assignedTo?: string;
}

type ErrorType = 'auth' | 'rate-limit' | 'build-failure' | 'stuck'
               | 'network' | 'cost-ceiling' | 'unknown';
```

### Error Classification

| Error Type | Fatal? | Action | Rationale |
|------------|--------|--------|-----------|
| `auth` | Yes | Fallback engine | Current engine's credentials broken |
| `rate-limit` | Yes | Fallback engine | Current engine throttled |
| `network` | No | Retry with backoff | Transient infrastructure issue |
| `build-failure` | No | Agent revision | Agent produced code that doesn't compile |
| `cost-ceiling` | Yes | Abort | Budget exhausted |
| `stuck` | Yes | Abort | Agent hit max iterations |
| `unknown` | Yes | Abort | Unrecognized error |

### Module Reference

| File | Purpose |
|------|---------|
| `src/orchestrator/errors.ts` | Error classes |
| `src/orchestrator/types.ts` | TaskRun, RunTaskOptions, PrePRCheckResult |
| `src/orchestrator/pre-pr-checks.ts` | prePRChecks(), runCommand() |
| `src/orchestrator/runner.ts` | runTask() — core orchestration loop |
| `src/orchestrator/summary.ts` | Task summary formatting |
| `src/orchestrator/index.ts` | Public API |

---

## 5.6 Cost Control System

### Per-Task Cost Ceiling

```typescript
function calculateCostCeiling(task: Task, config: ProjectConfig): number {
  return task.complexity * config.cost.cost_multiplier;
  // complexity-4 × $3 = $12 ceiling
}
```

### Complexity-Scaled Iteration Limits

```typescript
function calculateMaxIterations(task: Task, config: ProjectConfig): number {
  return config.cost.base_iterations + (task.complexity * config.cost.iteration_multiplier);
  // complexity-4: 5 + (4 × 3) = 17 iterations
}
```

### Aggregate Budget Caps

```
Session budget cap     ← Hard ceiling for entire orchestrator invocation
  └── Phase budget cap ← Soft ceiling per phase, with configurable overflow
       └── Task cost ceiling   ← complexity × cost_multiplier
            └── Revision budget ← revision_budget_percent of task estimate
```

The most restrictive ancestor wins. A task can't exceed its own ceiling, a phase can't exceed its cap, and the session can't exceed its cap.

---

## 5.7 Greptile Integration

### Non-Blocking Review

If Greptile doesn't respond within the timeout, the task moves to `review-pending` and the pipeline continues. Results are processed asynchronously.

### Cumulative Phase Review

After all tasks merge, one final Greptile review on the entire phase branch diff catches interaction bugs that per-task reviews miss.

---

## 5.7.1 Partial Work Recovery

### The Problem

Overnight runs face a failure mode where the process dies (machine sleeps, SSH disconnects, OOM). When the orchestrator isn't running, nobody updates GitHub Projects, nobody cleans up the worktree.

### Solution: Lockfiles + Recovery Command

**Part 1: Task Lockfiles** — The orchestrator writes heartbeat lockfiles during execution so stale state is detectable.

```typescript
interface TaskLockfile {
  taskId: string;
  phaseId: string;
  pid: number;
  agentPid?: number;
  engine: string;
  startedAt: string;
  heartbeat: string;       // Updated every ~5 iterations
  iteration: number;
  currentCost: number;
  branch: string;
  status: 'running' | 'reviewing' | 'rebasing';
  lastCommit?: string;
  filesModified: string[];
}
```

**Part 2: `karimo recover`** — Scans for orphaned state and offers recovery options:
- **Resume** — Commit WIP, restart agent from where it left off
- **Salvage** — Commit WIP to recovery branch, mark task as failed
- **Discard** — Hard reset worktree, mark task as ready for fresh retry
- **Skip** — Leave as-is for manual handling

---

## 5.8 `bun run init-project` Command

Creates a GitHub Project (V2) via the GraphQL API with all custom fields and status columns pre-configured.

```bash
# Create a project for a specific phase
bun run init-project --phase "auth-system" --repo "owner/my-app"

# Dry run
bun run init-project --phase "auth-system" --repo "owner/my-app" --dry-run

# Validate existing project
bun run init-project --phase "auth-system" --repo "owner/my-app" --validate
```

This is a **Level 1** feature. It should be the first thing a user runs after `karimo init`.

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview
- [LEVELS.md](./LEVELS.md) — Which components are built at each level
- [SECURITY.md](./SECURITY.md) — Agent sandbox implementation
- [CODE-INTEGRITY.md](./CODE-INTEGRITY.md) — Pre-PR checks and safeguards
- [COMPOUND-LEARNING.md](./COMPOUND-LEARNING.md) — Checkpoint system
