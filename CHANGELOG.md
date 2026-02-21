# Changelog

All notable changes to KARIMO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Support for NEW, CROSS-FEATURE, and URGENT dependency types
- `DEPENDENCIES_TEMPLATE.md` for per-PRD tracking

**Two-Tier Merge Model**
- Task PRs target feature branch (automated with Review/Architect validation)
- Feature PR targets main (human gate)
- Single human approval gate per feature

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

**git-worktree-ops Skill**
- Extended lifecycle documentation
- Artifact cleanup commands
- Safe teardown sequence
- TTL-based cleanup triggers

**STATUS_SCHEMA**
- New root fields: `feature_pr_number`, `feature_merged_at`, `reconciliation_status`
- New task fields: `worktree_status`, `worktree_created_at`

### Documentation

- Updated ARCHITECTURE.md with v2.1 changes
- Updated SAFEGUARDS.md with two-tier merge model
- Updated PHASES.md with Review/Architect availability
- Updated README.md with new agent and features
- Updated CLAUDE.md installed components

### Open Questions

These questions remain open for discussion after Phase 1 validation:

1. **Cross-feature dependency resolution** — Should KARIMO support cross-feature dependency graphs?
2. **Greptile as hard gate vs. advisory** — Exact threshold and retry budget definition
3. **Urgent dependency false positives** — Criteria refinement after Phase 1 validation
4. **Worktree disk monitoring** — For large teams with many concurrent PRDs
5. **Review/Architect model selection** — Sonnet vs Opus for complex reconciliations
6. **Dependency cascade notification preferences** — Issue vs PR comment

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
- `COMPOUND-LEARNING.md` — Two-layer learning system
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
