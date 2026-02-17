# Changelog

All notable changes to KARIMO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial repository scaffolding (Phase 1)
- TypeScript type definitions for all modules
- Project configuration templates
- Documentation structure

---

## Phases

### Phase 4 — Git Operations Layer (February 2026)

#### Added
- `src/git/` module with complete git operations
  - `gitExec()` wrapper around Bun.spawn with timeout and error handling
  - Worktree management: `createWorktree()`, `removeWorktree()`, `listWorktrees()`
  - Branch operations: `createTaskBranch()`, `branchExists()`, `deleteBranch()`
  - Rebase handling: `rebaseOntoTarget()` with conflict detection and abort
  - Diff analysis: `getChangedFiles()`, `getChangedFilesDetailed()`
  - Caution detection: `detectCautionFiles()`, `detectNeverTouchViolations()`
- `src/github/` module with dual-layer GitHub integration
  - gh CLI wrapper: `ghExec()`, `ghExecJson()`, `getGhToken()`
  - Auth verification: `verifyGhAuth()`, `verifyRepoAccess()` with 5-min caching
  - Octokit client: `createGitHubClient()` with REST and GraphQL
  - PR operations: `createPullRequest()`, `getPrStatus()`, `addLabels()`
  - PR body generator: `buildPrBody()` for KARIMO-styled descriptions
- Error classes for both modules with contextual messages
- Comprehensive tests: ~30 git tests (real temp repos), ~20 github tests (mocked)

#### Dependencies
- `@octokit/rest` ^21.0.0 — GitHub REST API
- `@octokit/graphql` ^8.0.0 — GitHub GraphQL API

#### Design Decisions
- Token resolution: GITHUB_TOKEN env → explicit token → gh auth token
- Rebase conflicts return result instead of throwing (orchestrator decides)
- gh CLI fallback when Octokit not configured
- Bun.Glob for pattern matching (no minimatch dependency)
- Naming conventions: `feature/{phaseId}/{taskId}`, `{basePath}/worktrees/{phaseId}`

### Phase 3 — PRD Parser (February 2026)

#### Added
- `src/prd/` module for PRD parsing and validation
- Dependency graph with topological sort
- File overlap detection using Union-Find
- Computed field validation against config

### Phase 2b — Auto-Detection (February 2026)

#### Added
- `src/config/detect/` module with five detectors
- Confidence levels with source attribution
- Parallel detector execution (< 500ms target)

### Phase 2 — Config Schema (February 2026)

#### Added
- `src/config/` module with Zod schemas
- Interactive `karimo init` command
- Config loading with validation

---

## Architecture Spec Versions

### v1.3 (February 2026)

#### Added
- Auto-detection system for `karimo init` (Phase 2b)
- Detection modules: project, commands, rules, boundaries, sandbox
- Confidence levels (high/medium/low) with source attribution
- Detect-first, confirm-second UX flow
- Detection performance target: < 500ms

#### Changed
- Level 0 now includes auto-detection capability
- CLI Setup section clarifies `karimo init` vs `bun run onboard`
- New §5.3.1 documents auto-detection system

#### Fixed
- Ambiguity between project initialization and team member onboarding

### v1.2 (February 2026)

#### Added
- Aggregate budget caps (phase + session level)
- `phase_budget_cap` with configurable overflow for running tasks
- `session_budget_cap` as hard ceiling for orchestrator invocations
- `budget_warning_threshold` for proactive cost alerts
- Budget hierarchy: Session → Phase → Task → Revision
- Partial work recovery for interrupted tasks (lockfile mechanism)
- Budget check integration with existing `onAgentProgress()` callback

#### Changed
- Cost control now operates at three levels (task, phase, session)
- Running tasks can exceed phase cap by `phase_budget_overflow` percentage
- Session cap is a hard stop with no overflow

### v1.1 (February 2026)

#### Added
- Full code execution loop with annotated TypeScript
- Core execution loop (`runPhase()`) for sequential and parallel modes
- Single task execution (`executeTask()`) with all safeguards
- Progress callback (`onAgentProgress()`) for cost monitoring
- Terminal summary (`printPhaseSummary()`) for overnight runs
- Error classification system (`classifyError()`)
- Retry/fallback decision logic (`shouldRetry()`)
- PRD-to-task YAML worked example
- File-overlap detection for parallel safety
- Pre-PR checks (rebase, build, caution files, cost)
- Post-merge integration check with rollback

#### Changed
- Safeguard execution points now clearly documented
- Error types mapped to specific actions (retry, fallback, abort)

### v1.0 (February 2026)

#### Added
- Initial architecture specification
- Level-based build plan (Level 0-5)
- Compound learning system (Layer 1 + Layer 2)
- GitHub Projects integration design
- PRD interview protocol
- Cost control system
- Agent sandbox specification
