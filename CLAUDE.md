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
| `thinking` | Extended thinking auto-enablement based on complexity |
| `structured-output` | Zod schema validation for agent outputs |
| `interview` | PRD interview system with subagents |
| `team` | Parallel task coordination (PMAgent, queue, findings) |
| `cli` | Command-line interface |
| `types` | Shared type definitions |

### No Circular Dependencies

Follow this dependency flow:

```
cli → orchestrator → {agents, git, github, cost, learning}
                   ↓
              config, prd, types
```

### Level-Based Development

KARIMO follows a level-based build plan. Current status: **Level 0**.

- **Level 0:** Basic agent execution (current)
- **Level 1:** GitHub Projects integration
- **Level 2:** Automated review (Greptile)
- **Level 3:** Full orchestration
- **Level 4:** Parallel execution + fallback engines
- **Level 5:** Dashboard

Only implement features appropriate for the current level.

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

### Changelog Updates

When completing `feat:` or `fix:` level work (not every commit):

1. Open `CHANGELOG.md`
2. Add entry under `## [Unreleased]` section
3. Use appropriate category: Added, Fixed, Changed, Deprecated, Removed, Security
4. Format: `- **Component/Feature**: Brief description`

**When to update:**
- After completing a feature (feat commits)
- After fixing a user-facing bug (fix commits)
- After significant refactors that change behavior

**When NOT to update:**
- Style/formatting changes
- Internal refactors with no behavior change
- Test additions
- Chore/maintenance tasks

**Release process:**
When releasing a version, move `[Unreleased]` entries to a new version section and reset `[Unreleased]` to empty (with a placeholder like `_No unreleased changes._`).

---

## Forbidden

- **No `any` types** — This is a hard requirement, no exceptions.
- **No dependencies without justification** — Keep the dependency tree minimal.
- **No files outside established structure** — Follow the module layout.
- **No skipping types** — Everything must be properly typed.
- **No circular dependencies** — Follow the dependency flow above.
- **No implementing features beyond current level** — Stay focused on Level 0.

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
| `docs/LEVELS.md` | Level-based build plan |

---

## When Adding New Code

1. **Check the level** — Is this feature appropriate for Level 0?
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
- Required fields: `project.name`, `commands.build`, `commands.lint`
- Recommended fields: `commands.test`, `commands.typecheck` (default to `null`)
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
- Stack-aware command recommendations when test/typecheck not detected

### Detection Module Files

| File | Purpose |
| ---- | ------- |
| `src/config/detect/types.ts` | DetectionResult, DetectedValue, Confidence types |
| `src/config/detect/project.ts` | Detect name, language, framework, runtime, database |
| `src/config/detect/commands.ts` | Detect build, lint, test, typecheck commands |
| `src/config/detect/rules.ts` | Infer coding rules from config files |
| `src/config/detect/boundaries.ts` | Detect never_touch and require_review patterns |
| `src/config/detect/sandbox.ts` | Detect safe environment variables |
| `src/config/detect/recommendations.ts` | Stack-aware test/typecheck suggestions |
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

---

## Phase 5 — Core Orchestrator Level 0 (Complete)

- Agents module lives in `src/agents/`
- Orchestrator module lives in `src/orchestrator/`
- Level 0 scope: single-task execution only (no parallel, no cost tracking, no revision loops)
- Agent engine interface supports future engines (Codex, Gemini)
- Environment sandboxing with ALWAYS_INCLUDE/ALWAYS_EXCLUDE lists
- Pre-PR checks: rebase, build, typecheck, boundary violations

### Agents Module Files

| File | Purpose |
| ---- | ------- |
| `src/agents/errors.ts` | Error classes: AgentNotFoundError, AgentSpawnError, etc. |
| `src/agents/types.ts` | AgentEngineInterface, AgentExecuteOptions, AgentExecuteResult |
| `src/agents/prompt-builder.ts` | buildAgentPrompt() — structured prompt generation |
| `src/agents/sandbox.ts` | buildAgentEnvironment() — env variable filtering |
| `src/agents/claude-code.ts` | ClaudeCodeEngine — spawns `claude --print` |
| `src/agents/index.ts` | Public API (barrel exports) |

### Orchestrator Module Files

| File | Purpose |
| ---- | ------- |
| `src/orchestrator/errors.ts` | Error classes: TaskNotFoundError, PhaseNotFoundError, etc. |
| `src/orchestrator/types.ts` | TaskRunR0, RunTaskOptions, PrePRCheckResult |
| `src/orchestrator/pre-pr-checks.ts` | prePRChecks(), runCommand() |
| `src/orchestrator/runner.ts` | runTask() — core orchestration loop |
| `src/orchestrator/summary.ts` | Task summary formatting functions |
| `src/orchestrator/index.ts` | Public API (barrel exports) |

### CLI Command

| File | Purpose |
| ---- | ------- |
| `src/cli/orchestrate-command.ts` | handleOrchestrate(), parseOrchestrateArgs() |

### Agents Module Public API

| Function | Purpose |
|----------|---------|
| `buildAgentPrompt(context)` | Build structured prompt from task and config |
| `buildAgentEnvironment(config)` | Create sandboxed environment variables |
| `createClaudeCodeEngine()` | Create Claude Code engine instance |

### Orchestrator Module Public API

| Function | Purpose |
|----------|---------|
| `runTask(options)` | Execute a single task from PRD to PR |
| `createDryRunPlan(options)` | Preview execution plan without running |
| `prePRChecks(options)` | Run pre-PR validation checks |
| `runCommand(command, cwd)` | Execute shell command with timing |
| `formatDuration(ms)` | Format duration in human-readable form |
| `createTaskSummary(run, title, files)` | Create summary from run record |
| `formatTaskSummary(summary)` | Format summary for terminal |
| `printTaskSummary(summary)` | Print summary to console |
| `formatDryRunPlan(plan)` | Format dry run plan |
| `printDryRunPlan(plan)` | Print dry run plan to console |

### runTask Execution Flow

1. Load config from `.karimo/config.yaml`
2. Resolve PRD path: `{rootDir}/.karimo/prds/{phaseId}.md`
3. Parse PRD and find task by ID
4. Create phase branch if needed (`feature/{phaseId}`)
5. Create worktree and task branch (`feature/{phaseId}/{taskId}`)
6. Build agent prompt and sandboxed environment
7. Execute Claude Code agent
8. Run pre-PR checks (rebase, build, typecheck)
9. Detect caution files and never-touch violations
10. Create PR with KARIMO-styled body
11. Cleanup worktree
12. Return result with summary

### Environment Sandboxing

**ALWAYS_INCLUDE:** PATH, HOME, TERM, SHELL, USER, LANG, LC_ALL, TZ, EDITOR, VISUAL

**ALWAYS_EXCLUDE:** GITHUB_TOKEN, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, DATABASE_URL, DB_SERVICE_KEY, KARIMO_DASHBOARD_API_KEY, KARIMO_DASHBOARD_SECRET, OPENAI_API_KEY, ANTHROPIC_API_KEY

### Commands

```bash
# Run a specific task
bun run orchestrate --phase phase-1 --task 1a

# Preview execution plan (dry run)
bun run orchestrate --phase phase-1 --task 1a --dry-run
```

### Error Classes

| Error | When Thrown |
|-------|-------------|
| `KarimoAgentError` | Base agent error |
| `AgentNotFoundError` | CLI not installed |
| `AgentSpawnError` | Process spawn failed |
| `AgentTimeoutError` | Execution timed out |
| `AgentExecutionError` | Non-zero exit code |
| `KarimoOrchestratorError` | Base orchestrator error |
| `TaskNotFoundError` | Task ID not in PRD |
| `PhaseNotFoundError` | PRD file not found |
| `PrePRCheckError` | Build/typecheck failed |
| `NeverTouchViolationError` | Forbidden files modified |
| `RebaseConflictError` | Merge conflicts detected |
| `PhaseBranchError` | Cannot create phase branch |
| `WorktreeError` | Worktree operation failed |
| `PRCreationError` | PR creation failed |

### What NOT in Level 0

- Parallel execution
- Cost tracking / token parsing
- Revision loops (score < 4 → retry)
- GitHub Projects integration
- Codex/Gemini engines
- Fallback engine logic
- Full phase execution (`--all-ready`)

### Command Requirements

| Command | Requirement | Executed In |
|---------|-------------|-------------|
| `build` | Required | Level 0+ (pre-PR checks) |
| `lint` | Required | Level 2+ (Greptile review) |
| `test` | Recommended | Level 2+ (integration checks) |
| `typecheck` | Recommended | Level 0+ (pre-PR checks) |

- Required commands block `karimo init` if not detected/provided
- Recommended commands show a warning but can be skipped (set to `null`)
- Empty strings are invalid — use `null` for intentional skips
- Stack-aware recommendations are shown when commands not detected

---

## Phase 6 — Extended Thinking System (Complete)

- Thinking module lives in `src/thinking/`
- Auto-enables extended thinking based on task complexity signals
- Calculates a score (0-100) from multiple signals, maps to token budget tiers
- No config dependency — pure functions that analyze context and return decisions

### Thinking Module Files

| File | Purpose |
| ---- | ------- |
| `src/thinking/types.ts` | ThinkingContext, ThinkingDecision, signal weights, token tiers |
| `src/thinking/analyzer.ts` | analyzePrompt(), buildThinkingContext(), estimateComplexityFromDescription() |
| `src/thinking/decision.ts` | shouldEnableExtendedThinking(), getThinkingConfig() |
| `src/thinking/index.ts` | Public API (barrel exports) |

### Thinking Module Public API

| Function | Purpose |
|----------|---------|
| `shouldEnableExtendedThinking(context)` | Core decision function returning enabled/budget/score/reasons |
| `getThinkingConfig(context)` | Returns API-ready config object or undefined |
| `buildThinkingContext(params)` | Build context from task data |
| `analyzePrompt(content)` | Detect architecture/refactor keywords in text |
| `analyzeTaskForThinking(task, prompt)` | Convenience wrapper for task analysis |
| `isThinkingRecommended(context)` | Quick boolean check |

### Signal Weights

| Signal | Points | Trigger |
|--------|--------|---------|
| Complexity | +25 | complexity >= 7 |
| Files affected | +15 | files >= 8 |
| Success criteria | +15 | criteria >= 6 |
| Architecture keywords | +20 | Keywords like "architecture", "migration", "security" |
| Refactor keywords | +15 | Keywords like "refactor", "restructure", "decouple" |
| Review agent | +30 | Always triggers for review calls |

### Token Budget Tiers

| Score | Level | Tokens |
|-------|-------|--------|
| 0-30 | Disabled | 0 |
| 31-50 | Minimal | 1,024 |
| 51-70 | Moderate | 4,096 |
| 71+ | Deep | 16,384 |

---

## Phase 7 — Structured Output System (Complete)

- Structured output module lives in `src/structured-output/`
- Validates agent JSON outputs against Zod schemas
- Converts Zod schemas to JSON Schema for CLI tools
- Graceful fallback when validation fails

### Structured Output Module Files

| File | Purpose |
| ---- | ------- |
| `src/structured-output/types.ts` | ValidationResult, ValidationError, ValidationOptions |
| `src/structured-output/converter.ts` | zodToJsonSchema(), createCliJsonSchema() |
| `src/structured-output/validator.ts` | validateOutput(), createValidator(), formatValidationErrors() |
| `src/structured-output/schemas/common.ts` | FileReferenceSchema, CodeSnippetSchema, TokenUsageSchema |
| `src/structured-output/schemas/review.ts` | ReviewResultSchema, SectionReviewSchema |
| `src/structured-output/schemas/agent.ts` | TaskResultSchema, InvestigationResultSchema |
| `src/structured-output/index.ts` | Public API (barrel exports) |

### Structured Output Public API

| Function | Purpose |
|----------|---------|
| `validateOutput(output, schema)` | Validate agent output against Zod schema |
| `assertValidOutput(output, schema)` | Validate or throw |
| `tryValidateOutput(output, schema)` | Validate, return undefined on failure |
| `createValidator(schema)` | Create a reusable validator function |
| `zodToJsonSchema(schema)` | Convert Zod schema to JSON Schema |
| `createCliJsonSchema(schema)` | Create CLI-ready JSON schema string |
| `formatValidationErrors(errors)` | Format errors for display |

### Validation Behavior

1. Extract JSON from output (handles markdown code blocks)
2. Parse JSON with retry logic for common issues (trailing commas, etc.)
3. Validate against Zod schema
4. On failure: return errors with optional fallback to raw output

---

## Phase 8 — Interview Subagents (Complete)

- Subagents module lives in `src/interview/subagents/`
- Interview agents can spawn focused subagents for specialized tasks
- Subagents use the same API client as parent (not separate processes)
- Results injected back into parent conversation
- Supports sequential and parallel execution

### Interview Subagents Module Files

| File | Purpose |
| ---- | ------- |
| `src/interview/subagents/types.ts` | SubagentType, SubagentSpawnRequest, SubagentResult, result data types |
| `src/interview/subagents/registry.ts` | AgentRegistry class for tracking executions |
| `src/interview/subagents/spawner.ts` | SubagentSpawner class for executing subagents |
| `src/interview/subagents/prompts/index.ts` | System prompts for each subagent type |
| `src/interview/subagents/cost.ts` | SubagentCostTracker for cost aggregation |
| `src/interview/subagents/index.ts` | Public API (barrel exports) |

### Subagent Types

| Parent | Subagent Type | Purpose |
|--------|---------------|---------|
| Interview | `clarification` | Deep-dive on ambiguous requirements |
| Interview | `research` | Investigate codebase during interview |
| Interview | `scope-validator` | Validate scope against existing code |
| Investigation | `pattern-analyzer` | Analyze specific code patterns |
| Investigation | `dependency-mapper` | Map import/dependency chains |
| Review | `section-reviewer` | Review specific PRD section (parallelizable) |
| Review | `complexity-validator` | Validate complexity scores |

### Interview Subagents Public API

| Function | Purpose |
|----------|---------|
| `createAgentRegistry()` | Create a new registry instance |
| `createSubagentSpawner(registry)` | Create a spawner instance |
| `spawner.spawn(request)` | Spawn single subagent, wait for completion |
| `spawner.spawnParallel(requests)` | Spawn multiple subagents in parallel |
| `registry.getAggregatedUsage()` | Get total token usage across all subagents |
| `createCostTracker()` | Create cost tracking instance |

### Why Subagents?

- **Focused context** — Subagents get only relevant context, not full conversation
- **Parallel execution** — Section reviews can run concurrently
- **Cost efficiency** — Smaller prompts, lower per-call cost
- **Clear separation** — Parent delegates, subagent executes, results return

---

## Phase 9 — Agent Teams (Complete)

- Team module lives in `src/team/`
- Enables parallel task execution with coordination
- PMAgent (TypeScript coordinator) manages file-based task queue
- Tasks communicate via "findings" — messages propagated between dependent tasks
- Scheduler detects file overlaps to prevent conflicts

### Team Module Files

| File | Purpose |
| ---- | ------- |
| `src/team/types.ts` | TeamTaskEntry, TeamTaskQueue, TaskFinding, PMAgentOptions |
| `src/team/errors.ts` | Error classes: QueueLockError, TaskAlreadyClaimedError, etc. |
| `src/team/queue.ts` | File-based queue with atomic locking |
| `src/team/findings.ts` | Finding creation and formatting utilities |
| `src/team/scheduler.ts` | File overlap detection, batch scheduling |
| `src/team/pm-agent.ts` | PMAgent coordinator class |
| `src/team/index.ts` | Public API (barrel exports) |

### Team Module Public API

| Function | Purpose |
|----------|---------|
| `createQueue(projectRoot, phaseId, tasks)` | Initialize task queue for a phase |
| `claimTask(projectRoot, phaseId, taskId, options)` | Claim a task for execution |
| `completeTask(projectRoot, phaseId, taskId, result)` | Mark task complete with findings |
| `getReadyTasks(projectRoot, phaseId)` | Get tasks ready to be claimed |
| `detectFileOverlaps(tasks)` | Find tasks with shared files |
| `getNextBatch(queue, running, completed, overlaps, config)` | Get next batch of schedulable tasks |
| `runPMAgent(options, tasks, executor)` | Run the PMAgent coordination loop |
| `createTaskEntriesFromPRD(prdTasks)` | Create task entries from PRD data |

### PMAgent Coordination Loop

1. Initialize queue from PRD tasks
2. Detect file overlaps upfront
3. Loop: spawn agents for ready tasks (respecting parallelism limits)
4. Wait for completions, process findings
5. Update queue, unblock dependent tasks
6. Continue until queue complete

### Task Queue Design

- **File-based** — Stored in `.karimo/team/{phaseId}/queue.json`
- **Atomic locking** — Uses lock files to prevent race conditions
- **Optimistic concurrency** — Version checking prevents lost updates
- **Findings propagation** — Task A's findings appear in Task B's context

### Finding Types

| Type | Purpose |
|------|---------|
| `affects-file` | Task modified a file another task depends on |
| `interface-change` | API/interface was modified |
| `discovered-dependency` | Found a dependency not in original graph |
| `warning` | Non-blocking warning |
| `info` | Informational message |

### Error Classes

| Error | When Thrown |
|-------|-------------|
| `QueueNotFoundError` | Queue file not found |
| `QueueLockError` | Cannot acquire lock within timeout |
| `QueueVersionConflictError` | Optimistic concurrency violation |
| `TaskNotFoundError` | Task ID not in queue |
| `TaskAlreadyClaimedError` | Task claimed by another agent |
| `TaskBlockedError` | Task has unmet dependencies |
| `PMAgentError` | Coordination error |
| `AllTasksFailedError` | All tasks in phase failed |
