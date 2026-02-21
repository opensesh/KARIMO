# Changelog

All notable changes to KARIMO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2026-02-21

### Added

**Task Agents**
- `karimo-implementer` — Primary code-writing worker for feature implementation
- `karimo-tester` — Test-focused worker for test-only tasks
- `karimo-documenter` — Documentation-focused worker for docs tasks

**Task Agent Skills**
- `karimo-code-standards` — Coding patterns, boundaries, validation protocols
- `karimo-testing-standards` — Framework detection, test patterns, coverage requirements
- `karimo-doc-standards` — Documentation patterns, JSDoc templates, style guidelines

**findings.json Contract**
- Standard format for task-to-task discovery propagation
- Severity levels: `info`, `warning`, `blocker`
- Finding types: `discovery`, `pattern`, `api_change`, `blocker`
- PM agent reads and propagates findings to downstream tasks

### Changed

**PM Agent Step 5**
- Explicit worker type selection based on task indicators
- Agent delegation using `@karimo-implementer`, `@karimo-tester`, `@karimo-documenter`
- Complexity 3+ tasks get implementation planning prompt prepended
- Track `agent_type` in status.json

**PM Agent Step 6c**
- Read `findings.json` from worker worktrees
- Process findings by severity (blocker halts, warning propagates, info documents)
- Track `findings_received` in downstream task status

**install.sh**
- Copies all 10 agents (was 5, missing brief-writer and review-architect)
- Copies all 6 commands (was 5, missing review.md)
- Copies all 5 skills (was 2)
- Updated summary output with correct counts

### Fixed

**install.sh**
- Missing `karimo-brief-writer.md` agent copy
- Missing `karimo-review-architect.md` agent copy
- Missing `review.md` command copy
- Summary showed "5 agents" but 7 existed (now correctly shows 10)
- Missing `/karimo:review` in CLAUDE.md template slash commands section

---

## [2.1.0] - 2026-02-20

### Added

**Review/Architect Agent**
- New agent for code-level merge reconciliation and integration validation
- Validates task PRs integrate cleanly with feature branch
- Resolves merge conflicts between parallel task branches
- Performs feature-level reconciliation before PR to main
- Escalates architectural issues that require new tasks

**Dependency Cascade Protocol**
- Runtime dependency discovery by task agents
- `karimo-dependency-watch.yml` workflow for notifications
- Dependency classification: WITHIN-PRD, SCOPE-GAP, CROSS-FEATURE
- Resolution tracking: valid, false_positive, deferred, resequenced
- `DEPENDENCIES_TEMPLATE.md` for per-PRD tracking

**Two-Tier Merge Model**
- Task PRs target feature branch (automated with Review/Architect validation)
- Feature PR targets main (human gate)
- Single human approval gate per feature

**Cross-PRD Review Dashboard (`/karimo:review`)**
- Default mode shows cross-PRD visibility dashboard
- Blocked tasks (failed 3 Greptile attempts)
- Tasks in active revision loops
- Tasks needing human rebase
- Recently completed work
- Primary human oversight touchpoint

**Greptile Revision Loop Protocol**
- Corrected scale: 0-5 (was incorrectly documented as 0-10)
- Threshold: score ≥ 3 passes, < 3 triggers revision
- Model escalation: Sonnet → Opus after first failure (autonomous)
- Hard gate: `needs-human-review` status after 3 failed attempts
- New status tracking fields: `greptile_scores[]`, `model_escalated`, `escalation_reason`

**Cross-Feature Dependency Philosophy**
- Single-PRD scope: KARIMO operates one PRD per feature branch
- Sequential feature execution: finish dependencies before starting dependent features
- Cross-feature blockers tracked in PRD metadata and validated at execution start
- Human architects sequence PRDs — KARIMO doesn't manage cross-feature dependencies

### Changed

**Worktree Lifecycle**
- Worktrees now persist until PR **merged** (not just created)
- Enables revision loops without worktree recreation
- TTL policies: merged (immediate), closed (24h), stale (7d), paused (30d)
- Artifact hygiene rules for cleanup

**PM Agent**
- Exception-based engagement with Review/Architect
- Per-merge cleanup model
- Runtime dependency handling in monitoring loop
- Worktree TTL enforcement
- Cross-feature prerequisite validation before execution
- Greptile revision loop protocol with model escalation

**git-worktree-ops Skill**
- Extended lifecycle documentation
- Artifact cleanup commands
- Safe teardown sequence
- TTL-based cleanup triggers

**STATUS_SCHEMA**
- New root fields: `feature_pr_number`, `feature_merged_at`, `reconciliation_status`
- New task fields: `worktree_status`, `worktree_created_at`
- New task status: `needs-human-review` (hard gate after 3 Greptile failures)
- New task fields: `greptile_scores`, `model_escalated`, `original_model`, `current_model`, `escalation_reason`, `block_reason`, `blocked_at`

**Interviewer Agent**
- Cross-feature dependency detection in Round 3
- `cross_feature_blockers[]` field in PRD metadata

**PRD Template**
- Added `cross_feature_blockers` metadata field
- Added Cross-Feature Blockers section in Dependencies & Risks

### Fixed

**karimo-review.yml Workflow**
- Corrected Greptile scale from 0-10 to 0-5
- Fixed threshold from ≥ 4 to ≥ 3 for passing
- Updated score display in PR comments
- Updated label logic and commit status

### Documentation

- Updated ARCHITECTURE.md with design principles (single-PRD scope, sequential execution)
- Updated SAFEGUARDS.md with correct Greptile scale and revision loop protocol
- Updated PHASES.md with correct scale and model escalation
- Updated COMMANDS.md with /karimo:review documentation
- Updated README.md with philosophy and design principles
- Updated CLAUDE.md with review dashboard command
- Updated CONTRIBUTING.md with full templates list

### Resolved Open Questions

1. **Cross-feature dependency resolution** — KARIMO does NOT manage cross-feature dependencies. Single-PRD scope is intentional. Human architects sequence PRDs.

2. **Greptile as hard gate** — Defined: score < 3 triggers revision, 3 attempts max, then hard gate. Model escalation after first failure.

3. **Urgent dependency criteria** — Refined into WITHIN-PRD, SCOPE-GAP, CROSS-FEATURE classification with resolution tracking.

---

## [Unreleased]

### Changed

**CLAUDE.md as Single Source of Truth**
- Eliminated `config.yaml` — all configuration now lives in `CLAUDE.md`
- Added investigator agent context-scan mode for auto-detection on first run
- Added investigator agent drift-check mode for subsequent runs
- Updated plan command with Step 0 auto-detection flow
- Updated install.sh with `_pending_` placeholder template
- Reduced interview from 5 rounds to 4 rounds (removed Agent Context round)
- Updated all agents, commands, and templates to reference CLAUDE.md

**Documentation Compression**
- Merged `SECURITY.md` + `CODE-INTEGRITY.md` → `SAFEGUARDS.md`
- Merged `GETTING-STARTED.md` + `INTEGRATING.md` → `GETTING-STARTED.md`
- Updated Greptile: optional → "optional but highly recommended"
- Simplified Phase 3 (Dashboard): "Coming soon" instead of feature lists
- Added "Your CI/CD Responsibility" section to SAFEGUARDS.md
- Added FAQ section to GETTING-STARTED.md
- Updated cross-references across all documentation

### Removed
- `.karimo/config.yaml` — replaced by CLAUDE.md sections
- `CONFIG-REFERENCE.md` — no longer needed
- `SECURITY.md` — merged into `SAFEGUARDS.md`
- `CODE-INTEGRITY.md` — merged into `SAFEGUARDS.md`
- `INTEGRATING.md` — merged into `GETTING-STARTED.md`

---

## [2.0.0] - 2026-02-19

**KARIMO v2: Claude Code Configuration Framework**

Complete architectural transformation from TypeScript CLI application to Claude Code configuration framework. KARIMO is now a methodology delivered through agents, commands, skills, and templates.

### Added

**Documentation**
- `GETTING-STARTED.md` — Installation and first PRD walkthrough
- `COMMANDS.md` — Slash command reference for all 4 commands
- `CONFIG-REFERENCE.md` — Full `.karimo/config.yaml` documentation
- `INTEGRATING.md` — Guide for existing Claude Code projects
- `PHASES.md` — Three-phase adoption system (replaces LEVELS.md)

**Adoption Phases**
- **Phase 1: Execute PRD** — Agent teams, worktrees, GitHub Projects (starting point)
- **Phase 2: Automate Review** — Greptile integration for code review (optional)
- **Phase 3: Monitor & Review** — Dashboard for oversight (future)

**Install Script**
- Modular CLAUDE.md integration (~20 lines appended instead of ~210)
- KARIMO_RULES.md installed as separate file
- Reference block with commands, rules pointer, and learnings section

### Changed

**Architecture**
- Transformed from TypeScript CLI to Claude Code configuration framework
- Methodology delivered via markdown files (agents, commands, skills)
- No build step, no runtime dependencies, no CLI to install

**Documentation Rewrites**
- `CLAUDE.md` — Concise configuration guide (~100 lines from ~936)
- `CONTRIBUTING.md` — Claude Code component contribution guide
- `README.md` — Updated positioning as configuration framework
- `ARCHITECTURE.md` — v2 system design with integration guide
- `CODE-INTEGRITY.md` — Worktrees, branches, Greptile approach
- `COMPOUND-LEARNING.md` — Two-scope learning system
- `SECURITY.md` — Agent boundaries via KARIMO_RULES.md

**Terminology**
- "Levels 0-5" → "Phases 1-3"
- "TypeScript CLI" → "Claude Code configuration"
- "Installation" → "Integration"

### Removed

**Documentation**
- `COMPONENTS.md` — No longer applicable (no TypeScript components)
- `DEPENDENCIES.md` — No longer applicable (no npm dependencies)
- `LEVELS.md` — Replaced by `PHASES.md`

### Archived

**v1 TypeScript Implementation** (moved to `/archive/v1/`)
- `src/` — TypeScript source code
- `bin/` — CLI entry point
- `dist/` — Build output
- `templates/` (root) — Original templates
- `package.json`, `bun.lock`, `biome.json`, `tsconfig.json`

The v1 implementation is preserved for reference but no longer maintained. KARIMO v2 is configuration-only.

---

## [1.x] - v1 TypeScript CLI (Archived)

The v1 changelog entries below document the TypeScript CLI implementation, which has been archived to `/archive/v1/`. This implementation is no longer maintained.

<details>
<summary>View v1 changelog history</summary>

### [1.4.0] - 2026-02-17

#### Added
- **docs/CODE-INTEGRITY.md**: Greptile section explaining automated review integration

### [1.3.0] - 2026-02-17

#### Changed
- **templates/INTERVIEW_PROTOCOL.md**: Added round-to-section mapping and context handling

### [1.2.0] - 2026-02-17

#### Changed
- **templates/PRD_TEMPLATE.md**: Renamed "ring" → "level" terminology
- **templates/config.example.yaml**: Renamed "ring" → "level", tiered command requirements

### [1.1.0] - 2026-02-17

#### Added
- **docs/DASHBOARD.md**: Dashboard documentation for Level 5
- **docs/DEPENDENCIES.md**: Dependency inventory and portability guide
- **docs/COMPONENTS.md**: Comprehensive component specifications
- **docs/LEVELS.md**: Updated with detailed timelines and exit criteria
- **docs/ARCHITECTURE.md**: Risk Mitigation and Key Principles sections

### [1.0.0] - 2026-02-17

#### Added
- **templates/config.example.yaml**: Configuration reference
- **templates/PRD_TEMPLATE.md**: PRD template with YAML task blocks
- **templates/INTERVIEW_PROTOCOL.md**: PRD interview protocol
- **docs/**: Initial documentation structure

### [0.1.0] - 2026-02-17

#### Added
- **Commands**: `/karimo:plan`, `/karimo:execute`, `/karimo:status`, `/karimo:feedback`
- **Workflows**: karimo-integration GitHub Action
- **Skills**: git-worktree-ops skill
- **Agents**: karimo-investigator agent
- **CLI Features**: Input sanitizer, response formatter, keypress manager
- **Agent Teams (Phase 9)**: Parallel task execution with PMAgent coordination
- **Interview Subagents (Phase 8)**: Focused subagent spawning
- **Doctor Command**: Health checks for runtime, config, git, GitHub
- **First-Run Flow**: Welcome screen with ASCII wordmark

</details>

---

## Migration from v1

If upgrading from v1 TypeScript CLI:

1. **Stop using the CLI** — `karimo` command is no longer used
2. **Run install.sh** — Installs v2 configuration into your project
3. **Use slash commands** — `/karimo:plan`, `/karimo:execute`, etc.
4. **Review PHASES.md** — Understand the new adoption system

The v1 codebase is archived at `/archive/v1/` for reference.
