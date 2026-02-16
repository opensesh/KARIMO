# KARIMO Development Guide

## Project Identity

**KARIMO** is an open-source autonomous development framework — agent, tool, and repo agnostic. It turns product requirements into shipped code using AI agents, automated code review, and structured human oversight.

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Bun
- **Validation:** Zod
- **Linting/Formatting:** Biome
- **Testing:** Bun test

---

## Code Standards

### TypeScript Strict Mode

- **No `any` types** — Use `unknown` if the type is truly unknown, then narrow it.
- **No `as` casts** — Use type guards or proper type narrowing.
- **Explicit return types** — All exported functions must have explicit return types.
- **Strict null checks** — Handle `null` and `undefined` explicitly.

### Validation

- **Zod for all external inputs** — API inputs, config files, CLI arguments.
- **Schema-first design** — Define Zod schemas, infer types from them.
- **Fail fast** — Validate at boundaries, trust data internally.

### File Organization

- One primary export per file where possible
- Barrel exports via `index.ts`
- Tests as `*.test.ts` next to source files
- Path alias: `@/` → `src/`

### Error Handling

- Use structured error types (classes extending `Error`)
- Never bare `try/catch` without proper error handling
- Log errors with context before re-throwing
- Classify errors as fatal vs. retryable where applicable

---

## Architecture Rules

### Module Boundaries

Each module in `src/` has a clear, single responsibility:

| Module | Responsibility |
| ------ | -------------- |
| `orchestrator` | Execution loop, task coordination |
| `config` | Configuration loading and validation |
| `prd` | PRD parsing and task extraction |
| `git` | Git operations (worktrees, branches, rebases) |
| `github` | GitHub API interactions |
| `agents` | Agent process management |
| `learning` | Checkpoint collection and config updates |
| `cost` | Cost tracking and budget enforcement |
| `cli` | Command-line interface |
| `types` | Shared type definitions |

### No Circular Dependencies

Follow this dependency flow:

```
cli → orchestrator → {agents, git, github, cost, learning}
                   ↓
              config, prd, types
```

### Ring-Based Development

KARIMO follows a ring-based build plan. Current status: **Ring 0**.

- **Ring 0:** Basic agent execution (current)
- **Ring 1:** GitHub Projects integration
- **Ring 2:** Automated review (Greptile)
- **Ring 3:** Full orchestration
- **Ring 4:** Parallel execution + fallback engines
- **Ring 5:** Dashboard

Only implement features appropriate for the current ring.

---

## Git Conventions

### Branch Naming

```
karimo/<scope>/<description>
```

Examples:
- `karimo/orchestrator/add-cost-tracking`
- `karimo/cli/implement-status-command`

### Commit Messages

Use Conventional Commits:

```
<type>[optional scope]: <description>

[optional body]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code restructuring
- `docs:` — Documentation changes
- `test:` — Test additions/updates
- `chore:` — Maintenance tasks

---

## Forbidden

- **No `any` types** — This is a hard requirement, no exceptions.
- **No dependencies without justification** — Keep the dependency tree minimal.
- **No files outside established structure** — Follow the module layout.
- **No skipping types** — Everything must be properly typed.
- **No circular dependencies** — Follow the dependency flow above.
- **No implementing features beyond current ring** — Stay focused on Ring 0.

---

## Commands

```bash
# Development
bun run dev                 # Run CLI in development
bun run typecheck           # Type checking
bun run lint                # Linting
bun run lint:fix            # Fix lint issues
bun run format              # Format code
bun run test                # Run tests

# Build
bun run build               # Build for production
```

---

## Key Files

| File | Purpose |
| ---- | ------- |
| `src/types/index.ts` | All shared type definitions |
| `templates/config.example.yaml` | Configuration reference |
| `templates/PRD_TEMPLATE.md` | PRD output format |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/RINGS.md` | Ring-based build plan |

---

## When Adding New Code

1. **Check the ring** — Is this feature appropriate for Ring 0?
2. **Find the module** — Which module does this belong in?
3. **Define types first** — Add to `src/types/index.ts` if shared
4. **Write tests** — Add `*.test.ts` next to the source
5. **Update docs** — Keep architecture docs in sync
6. **Run checks** — `bun run typecheck && bun run lint`

---

## Cost Control Patterns

When implementing cost-related features:

- Per-task ceiling: `complexity × cost_multiplier`
- Iteration limit: `base_iterations + (complexity × iteration_multiplier)`
- Revision budget: `cost_ceiling × (revision_budget_percent / 100)`
- Phase budget: Soft cap with overflow for running tasks
- Session budget: Hard cap, no overflow

Always use the `CostEstimate` type with confidence levels.

---

## Learning System Patterns

When implementing learning features:

- **Layer 1 (Orchestrator):** Deterministic, code-driven, runs after every task
- **Layer 2 (Agent):** Developer-facing, plugin-driven, captures corrections

Checkpoint data flows: Collection → Processing → Config Updates → Future Agents

---

## Phase 2 — Config Schema & Validator (Complete)

- Config module lives in `src/config/`
- Zod schemas define the contract for `.karimo/config.yaml`
- Types are inferred from Zod — never duplicate manually
- `loadConfig()` finds, reads, and validates config with clear error messages
- `runInit()` provides interactive setup using @clack/prompts
- Dependencies added: `yaml`, `@clack/prompts`
- All config fields have defaults except `project.name` and `commands.*`
- `phase_budget_cap` and `session_budget_cap` accept `null` (no limit)
- Tests live in `src/config/__tests__/config.test.ts`

### Config Module Files

| File | Purpose |
| ---- | ------- |
| `src/config/schema.ts` | Zod schemas and inferred types |
| `src/config/loader.ts` | Config discovery, loading, and validation |
| `src/config/defaults.ts` | Default values for optional config fields |
| `src/config/errors.ts` | Custom error classes with clear messages |
| `src/config/init.ts` | Interactive config initialization |
| `src/config/index.ts` | Public API (barrel exports) |

### Commands

```bash
bun run karimo:init         # Interactive config setup
```

---

## Phase 2b — Auto-Detection (Complete)

- Detection module lives in `src/config/detect/`
- Five detectors: project, commands, rules, boundaries, sandbox
- Every detected value carries confidence (high/medium/low) and source
- `karimo init` scans first, then shows results for confirmation
- Detection targets < 500ms for typical projects
- Detectors run in parallel via Promise.all
- Sandbox reads .env.example only (never actual .env files)
- Rules capped at 10, boundaries only include existing files

### Detection Module Files

| File | Purpose |
| ---- | ------- |
| `src/config/detect/types.ts` | DetectionResult, DetectedValue, Confidence types |
| `src/config/detect/project.ts` | Detect name, language, framework, runtime, database |
| `src/config/detect/commands.ts` | Detect build, lint, test, typecheck commands |
| `src/config/detect/rules.ts` | Infer coding rules from config files |
| `src/config/detect/boundaries.ts` | Detect never_touch and require_review patterns |
| `src/config/detect/sandbox.ts` | Detect safe environment variables |
| `src/config/detect/index.ts` | Orchestrator running all detectors in parallel |

### Confidence Levels

- `●` **high** — Strong signal, auto-accepted
- `◐` **medium** — Good signal, user should verify
- `○` **low** — Weak signal, likely needs correction
- `?` **not detected** — User must fill in

### Init Flow

1. **Scan** — Run all detectors in parallel (< 500ms)
2. **Display** — Show detected values with confidence indicators
3. **Confirm** — User confirms or edits each section
4. **Write** — Generate and save config.yaml

### Init vs. Onboard

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `karimo init` | Creates `.karimo/config.yaml` via auto-detection + confirmation | First-time project setup |
| `bun run onboard` | Verifies existing setup for new team member | Joining a configured project |

**Key distinction:** `init` creates new config, `onboard` validates existing config.

---

## Phase 3 — PRD Parser, Dependency Resolver & File-Overlap Detection (Complete)

- PRD module lives in `src/prd/`
- Zod schemas validate the YAML task block
- Types reused from `src/types/index.ts` (no duplication)
- Config decoupling: parser reads values as-is, validation is separate
- String-only file overlap detection (no glob expansion)
- Union-Find for transitive overlap grouping
- Tests live in `src/prd/__tests__/prd.test.ts`

### PRD Module Files

| File | Purpose |
| ---- | ------- |
| `src/prd/errors.ts` | Custom error classes |
| `src/prd/types.ts` | ParsedPRD, ValidationResult, OverlapResult types |
| `src/prd/schema.ts` | Zod schemas for task validation |
| `src/prd/parser.ts` | YAML extraction and validation |
| `src/prd/dependencies.ts` | Dependency graph and topological sort |
| `src/prd/overlaps.ts` | File overlap detection |
| `src/prd/validation.ts` | Computed field drift detection |
| `src/prd/index.ts` | Public API (barrel exports) |

### Public API

| Function | Purpose |
|----------|---------|
| `parsePRDFile(path)` | Load and parse PRD markdown file |
| `buildDependencyGraph(tasks)` | Build dependency graph from tasks |
| `topologicalSort(graph)` | Get tasks in execution order |
| `getReadyTasks(graph, completed)` | Get tasks ready to run |
| `detectFileOverlaps(tasks)` | Detect file conflicts |
| `validateComputedFields(task, config)` | Check for config drift |

### Computed Field Formulas

- `cost_ceiling = complexity × cost_multiplier`
- `estimated_iterations = base_iterations + (complexity × iteration_multiplier)`
- `revision_budget = cost_ceiling × (revision_budget_percent / 100)`

### Error Classes

| Error | When Thrown |
|-------|-------------|
| `PRDNotFoundError` | PRD file not found at path |
| `PRDReadError` | Cannot read PRD file |
| `PRDExtractionError` | Missing heading or YAML block |
| `PRDParseError` | Invalid YAML syntax |
| `PRDValidationError` | Zod validation failed |
| `InvalidDependencyError` | Task references non-existent dependency |
| `CyclicDependencyError` | Circular dependency detected |
| `DuplicateTaskIdError` | Duplicate task ID in PRD |

---

## Phase 4 — Git Operations Layer (Complete)

- Git module lives in `src/git/`
- GitHub module lives in `src/github/`
- Pure git/gh plumbing — no imports from `src/config/` or `src/prd/`
- Dual-layer GitHub approach: gh CLI for simple ops + Octokit for complex/GraphQL
- Token resolution: GITHUB_TOKEN env → explicit token → gh auth token
- Dependencies added: `@octokit/rest`, `@octokit/graphql`
- Tests use real temp git repos for git module, mocks for github module

### Git Module Files

| File | Purpose |
| ---- | ------- |
| `src/git/errors.ts` | Error classes: GitCommandError, WorktreeCreateError, etc. |
| `src/git/types.ts` | WorktreeInfo, RebaseResult, ChangedFile, etc. |
| `src/git/exec.ts` | gitExec wrapper around Bun.spawn |
| `src/git/worktree.ts` | createWorktree, removeWorktree, listWorktrees |
| `src/git/branch.ts` | createTaskBranch, branchExists, deleteBranch |
| `src/git/rebase.ts` | rebaseOntoTarget, abortRebase, isRebaseInProgress |
| `src/git/diff.ts` | getChangedFiles, detectCautionFiles, detectNeverTouchViolations |
| `src/git/index.ts` | Public API (barrel exports) |

### GitHub Module Files

| File | Purpose |
| ---- | ------- |
| `src/github/errors.ts` | Error classes: GhCommandError, OctokitError, etc. |
| `src/github/types.ts` | CreatePrOptions, PrResult, GitHubClient, etc. |
| `src/github/exec.ts` | ghExec, ghExecJson wrappers for gh CLI |
| `src/github/cli-auth.ts` | verifyGhAuth, verifyRepoAccess with 5-min caching |
| `src/github/client.ts` | createGitHubClient Octokit wrapper |
| `src/github/pr.ts` | createPullRequest, getPrStatus, buildPrBody |
| `src/github/index.ts` | Public API (barrel exports) |

### Git Module Public API

| Function | Purpose |
|----------|---------|
| `gitExec(args, options)` | Execute git command |
| `createWorktree(basePath, phaseId, branch)` | Create worktree for phase |
| `removeWorktree(path)` | Remove worktree |
| `listWorktrees(repoPath)` | List all worktrees |
| `createTaskBranch(phaseId, taskId, base)` | Create feature/{phaseId}/{taskId} branch |
| `branchExists(name, cwd)` | Check if branch exists (local + remote) |
| `rebaseOntoTarget(target, options)` | Rebase with conflict handling |
| `getChangedFiles(base, head)` | Get files changed between refs |
| `detectCautionFiles(files, patterns)` | Detect require_review matches |
| `detectNeverTouchViolations(files, patterns)` | Detect never_touch violations |

### GitHub Module Public API

| Function | Purpose |
|----------|---------|
| `ghExec(args, options)` | Execute gh CLI command |
| `verifyGhAuth(hostname)` | Check gh authentication (cached) |
| `verifyRepoAccess(owner, repo)` | Verify repo access |
| `createGitHubClient(options)` | Create Octokit client |
| `createPullRequest(options)` | Create PR (Octokit or gh CLI fallback) |
| `getPrStatus(owner, repo, number)` | Get PR status |
| `buildPrBody(context)` | Generate KARIMO-styled PR body |
| `addLabels(owner, repo, number, labels)` | Add labels to PR |

### Naming Conventions

- **Worktree path:** `{basePath}/worktrees/{phaseId}`
- **Branch name:** `feature/{phaseId}/{taskId}`

### Rebase Conflict Handling

On conflict, `rebaseOntoTarget`:
1. Captures conflict files
2. Runs `git rebase --abort`
3. Returns `{ success: false, conflictFiles: [...] }`

Does NOT throw — orchestrator decides what to do.

### PR Body Template

```markdown
## :robot: KARIMO Automated PR

**Task:** {taskId}
**Phase:** {phaseId}
**Complexity:** {complexity}/10
**Cost Ceiling:** ${costCeiling}

### Changes
{description}

### Files Affected
{files list}

### Caution Files :warning:
{only if present}

### Validation
- [ ] `bun run build` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes

---
*Generated by [KARIMO](https://github.com/opensesh/KARIMO)*
```

### Error Classes

| Error | When Thrown |
|-------|-------------|
| `GitCommandError` | Git command failed |
| `WorktreeCreateError` | Cannot create worktree |
| `WorktreeNotFoundError` | Worktree not found at path |
| `BranchCreateError` | Cannot create branch |
| `RebaseConflictError` | Rebase conflict (info only) |
| `GhCliNotFoundError` | gh CLI not installed |
| `GhAuthError` | gh not authenticated |
| `GhCommandError` | gh command failed |
| `PrCreateError` | PR creation failed |
| `OctokitError` | GitHub API error |
| `RepoAccessError` | Repository access denied |
