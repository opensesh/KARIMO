# Changelog

All notable changes to KARIMO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [5.0.0] - 2026-03-10

### Added

**Feature Branch Execution Model**

New v5.0 feature branch aggregation workflow solves production deployment spam and Vercel/Netlify email flood:

- `/karimo-orchestrate` — Create feature branch and execute all tasks
  - Creates `feature/{prd-slug}` from main
  - Updates `status.json` with execution mode
  - Task PRs target feature branch (not main)
  - Pauses at `ready-for-merge` status for final review

- `/karimo-merge` — Consolidate feature branch and create final PR to main
  - Validates all task PRs merged to feature branch
  - Generates consolidated diff vs main
  - Runs full validation suite (build/lint/typecheck/test)
  - Presents comprehensive review
  - Creates final PR with task summary and labels
  - Handles post-merge cleanup (branch deletion)

**Status Schema Extensions**

New fields in `STATUS_SCHEMA.md` (v5.0):
- `execution_mode`: "feature-branch" or "direct-to-main"
- `feature_branch`: Branch name for feature branch mode (e.g., "feature/user-profiles")
- `ready_for_merge_at`: Timestamp when ready-for-merge status set
- `merged_to_main_at`: Timestamp when final PR merged to main
- Task field `pr_target`: Tracks PR base branch (feature branch or main)

**New PRD Status Values**

- `ready-for-merge`: All tasks merged to feature branch, awaiting `/karimo-merge` (v5.0, feature-branch mode only)
- `merging`: `/karimo-merge` in progress (v5.0, feature-branch mode only)

**Benefits**

- **Single production deployment per PRD** (vs 15+ in v4.0 direct-to-main)
- **No Vercel/Netlify email flood** (~2 events vs ~38 per PRD)
- **Consolidated review before main merge** (feature-level visibility)
- **Clean git history** (1 feature commit vs 15+ task commits in main)

### Changed

**PM Agent**

Updated `.claude/agents/karimo-pm.md` for dual execution mode support:
- Feature branch detection from `status.json` at spawn
- Dynamic PR base selection (feature branch or main)
- Wave transition verification against correct target branch
- Finalization logic per mode:
  - Feature-branch mode: Pause at `ready-for-merge`
  - Direct-to-main mode: Complete and clean up

**KARIMO Rules**

Updated `.claude/KARIMO_RULES.md` with dual execution model documentation:
- Feature Branch Model (v5.0) — Recommended for most PRDs
- Direct-to-Main Model (v4.0) — Backward compatible, use for simple PRDs
- Updated branch discipline to describe dynamic PR targets
- Updated validation checklist for target branch rebasing

**Brief Writer**

Updated `.claude/agents/karimo-brief-writer.md`:
- Removed legacy feature branch path references (`feature/{prd-slug}/{task-id}`)
- Updated GitHub context with dynamic target
- Updated validation checklist to reference target branch

**Vercel/Netlify Ignore Patterns**

Updated `.claude/commands/karimo-cd-config.md` patterns:
- **Old pattern:** `-[0-9]+[a-z]?$` (task branches only)
- **New pattern:** `(^feature/|-[0-9]+[a-z]?$)` (feature branches + task branches)

**Pattern breakdown:**
- `^feature/` — Skip all feature branches (v5.0 feature branch mode)
- `|` — OR
- `-[0-9]+[a-z]?$` — Skip task branches (both v4.0 and v5.0)

Updated for:
- Vercel (`vercel.json` ignoreCommand)
- Netlify (`netlify.toml` build.ignore)
- Render (dashboard configuration comment)
- Railway (dashboard configuration comment)
- Fly.io (GitHub Actions guidance)

**Status/Overview Commands**

Updated `.claude/commands/karimo-status.md` and `.claude/commands/karimo-overview.md`:
- Display execution mode and feature branch in PRD views
- Show PR targets (feature branch vs main)
- Display next steps based on execution mode
- New overview section for PRDs ready for final merge

### Deprecated

**Review Architect Agent**

Marked `.claude/agents/karimo-review-architect.md` as deprecated in v5.0+:
- Feature branch aggregation with `/karimo-merge` handles consolidation
- Kept for v4.0 direct-to-main backward compatibility
- Migration path documented

### Backward Compatibility

**v4.0 Direct-to-Main Mode Still Works**

No migration required for existing v4.0 PRDs:
- Missing `execution_mode` field defaults to "direct-to-main"
- PM agent detects missing field and uses v4.0 behavior
- `/karimo-execute` continues working as-is
- Task PRs target main directly
- Wave ordering preserved
- Finalization completes as before

**Use Cases**

- **Feature Branch Mode (v5.0):** Most PRDs (5+ tasks), complex features, coordinated releases
- **Direct-to-Main Mode (v4.0):** Simple PRDs (1-3 tasks), hotfixes, urgent changes

---

## [4.3.0] - 2026-03-10

### Added

**Atomic Commit Staging for PRD and Brief Generation**

Added commit steps to `/karimo-plan` and `/karimo-execute` to ensure PRD artifacts and task briefs are committed as separate atomic units before execution begins.

**New Steps:**
- `/karimo-plan` Step 8a: Commit PRD Artifacts — Commits PRD, tasks.yaml, execution_plan.yaml, and status.json immediately after approval
- `/karimo-execute` Phase 3a: Commit Task Briefs — Commits all generated briefs as a unit before spawning PM agent

**Rationale:** Previously, PRD generation and brief creation didn't commit, leading to 16+ uncommitted files accumulating. Now each phase is a discrete commit, providing:
- Clean atomic history
- Safe interruption points (work saved even if session ends)
- Clear traceability (PRD commit separate from brief commit separate from task commits)

### Changed

**Slug-Based File Naming for Searchability**

Updated PRD and brief file naming to include the slug for better searchability and distinguishable editor tabs.

**Before:**
```
.karimo/prds/003_feature-slug/
├── PRD.md                    # Generic filename
├── briefs/
│   ├── 1a.md                 # Generic filename
│   └── 1b.md
```

**After:**
```
.karimo/prds/003_feature-slug/
├── PRD_feature-slug.md       # Searchable filename
├── briefs/
│   ├── 1a_feature-slug.md    # Searchable filename
│   └── 1b_feature-slug.md
```

**Benefits:**
- Quick file search across multiple PRDs (search for "PRD_user-profiles" vs 30 matches for "PRD.md")
- Distinguishable editor tabs when multiple PRDs/briefs are open
- Clear identification in git history

**Files Updated:**
| File | Changes |
|------|---------|
| `karimo-reviewer.md` | PRD.md → PRD_{slug}.md |
| `karimo-brief-writer.md` | {task_id}.md → {task_id}_{slug}.md |
| `karimo-pm.md` | Updated brief and PRD path references |
| `karimo-plan.md` | Added Step 8a, updated folder structure |
| `karimo-execute.md` | Added Phase 3a, updated brief paths |

---

## [4.2.1] - 2026-03-10

### Fixed

**Update Script Legacy Workflow Bug**

- Removed `karimo-ci.yml` copy logic from `update.sh` that incorrectly installed source repo CI workflow to target projects
- `karimo-ci.yml` validates MANIFEST.json and should only exist in the KARIMO source repo

### Changed

**Documentation Cleanup**

- Removed references to deprecated `karimo-dependency-watch` workflow from DEPENDENCIES_TEMPLATE.md
- Updated ARCHITECTURE.md `done` status mechanism to reflect git state detection instead of legacy `karimo-sync.yml`

---

## [4.2.0] - 2026-03-09

### Added

**Claude Code Review as Review Provider Option**

Added Claude Code Review as an alternative to Greptile for automated code review. Users now choose their preferred provider based on cost and workflow preferences.

**Provider Comparison:**

| Feature | Greptile | Claude Code Review |
|---------|----------|-------------------|
| Pricing | $30/month flat | $15-25 per PR |
| Best For | High volume (50+ PRs/month) | Low-medium volume |
| Review Style | Score-based (0-5) | Finding-based (severity markers) |
| Setup | API key + GitHub workflow | Claude admin settings |
| Auto-resolve | Manual | Automatic |

**New Files:**
- `.karimo/templates/REVIEW_TEMPLATE.md` — Best practices template for Code Review guidelines

**New Command Flags:**
- `/karimo-configure --code-review` — Setup instructions for Claude Code Review
- `/karimo-configure --review` — Interactive provider choice

**Code Review Severity Markers:**
| Marker | Level | Action |
|--------|-------|--------|
| 🔴 | Normal | Bug to fix before merge |
| 🟡 | Nit | Minor issue, worth fixing |
| 🟣 | Pre-existing | Bug in codebase, not from this PR |

### Changed

**PM Agent Updates:**
- Added provider detection from `config.yaml` (`review_provider` field)
- Added Code Review revision loop alongside Greptile loop
- Updated model escalation triggers for finding-based reviews

**Configuration Changes:**
- `greptile_enabled` field replaced by `review_provider: none | greptile | code-review`
- REVIEW.md auto-generated from template with boundaries injected

**Phase 3 Clarification:**
- Removed "coming soon" dashboard language
- Clarified GitHub-native monitoring approach via `/karimo-status`, `/karimo-overview`, PR labels

**Documentation Updates:**
- PHASES.md — Rewrote Phase 2 with provider choice, Phase 3 for GitHub-native monitoring
- SAFEGUARDS.md — Added Code Review section alongside Greptile
- CI-CD.md — Added Code Review setup section
- GETTING-STARTED.md — Added provider choice FAQ
- ARCHITECTURE.md — Updated review phase for both providers
- DASHBOARD.md — Clarified GitHub-native approach, added query examples
- CLAUDE.md — Updated for provider choice
- README.md — Updated FAQ with provider comparison

**Doctor Command:**
- Added review provider status checks
- Shows configured provider and status

---

## [4.1.0] - 2026-03-09

### Removed

**CI Observer Integration**

Removed the CI Observer workflow (`karimo-ci-integration.yml`) entirely. KARIMO now focuses on orchestration, trusting developers' existing CI pipelines to catch issues at merge time.

**Philosophy shift:** When PRs merge to main, your existing CI (GitHub Actions, CircleCI, Jenkins, etc.) runs builds and catches issues. KARIMO doesn't need to observe or track CI results.

**Deleted files:**
- `.karimo/workflow-templates/karimo-ci-integration.yml` (269 lines)

**Deprecated labels:**
- `ci-passed` — No longer created
- `ci-failed` — No longer created
- `ci-skipped` — No longer created

**Configuration removed:**
- `ci_observer_enabled` field no longer used in config.yaml (harmless if present)

### Changed

**Zero-Workflow Default**

KARIMO no longer installs any workflows by default. Greptile is available as an explicit opt-in:

- Run `/karimo-configure --greptile` to install Greptile workflow
- Deleted: `karimo-dependency-watch.yml` (unused)
- Removed: All workflow prompts from installer

**Philosophy:** KARIMO focuses on orchestration, not CI. Your existing CI (GitHub Actions, CircleCI, Jenkins) catches issues at merge time.

**Files deleted:**
- `.github/workflows/karimo-dependency-watch.yml`

**Files updated:**
- `install.sh` — Removed all workflow installation code
- `karimo-configure.md` — Added `--greptile` flag for opt-in workflow installation
- `CI-CD.md` — Updated Greptile section for opt-in
- `PHASES.md` — Removed workflow sections, updated setup instructions
- `SAFEGUARDS.md` — Replaced "GitHub Actions Workflows" with "PR Labels"
- `GETTING-STARTED.md` — Removed workflow prompts
- `ARCHITECTURE.md` — Updated workflow references
- `CLAUDE.md` — Removed workflow from Installed Components
- `README.md` — Removed Workflows section

**Migration:**
- Existing installations can delete `.github/workflows/karimo-*.yml` files
- No functional impact — KARIMO orchestration works without workflows
- To add Greptile later: `/karimo-configure --greptile`

---

## [4.0.1] - 2026-03-07

### Added

**CD Provider Configuration**

New `/karimo-cd-config` command for configuring continuous deployment providers to skip preview builds on KARIMO task branches.

**Problem:** KARIMO task PRs contain partial code that won't build in isolation. When Vercel/Netlify triggers preview builds, they fail because tasks depend on code from other wave tasks that haven't merged yet. This is expected — the code works once all wave tasks merge to main.

**Solution:**
- Auto-detect CD provider (Vercel, Netlify, Render, Railway, Fly.io)
- Configure ignore rules using branch pattern: `-[0-9]+[a-z]?$`
- Pattern matches KARIMO task branches (e.g., `user-profiles-1a`, `token-studio-2b`)

**Files added:**
- `.claude/commands/karimo-cd-config.md` — New command definition
- `.karimo/docs/CI-CD.md` — CI/CD integration documentation

**Integration with `/karimo-configure`:**
- New Step 7: CD Integration (Optional)
- Auto-detects provider during onboarding
- Users can configure inline or defer to `/karimo-cd-config`

### Changed

**Updated Documentation:**
- CLAUDE.md: Added `/karimo-cd-config` to slash commands table, updated command count (11 → 12)
- COMMANDS.md: Added full documentation section for `/karimo-cd-config`
- GETTING-STARTED.md: Added CD configuration section and FAQ entry
- MANIFEST.json: Added `karimo-cd-config.md` to commands array

**`/karimo-configure` Step Renumbering:**
- Step 7 (new): CD Integration
- Step 8 (was 7): Confirm and Write
- Step 9 (was 8): Update CLAUDE.md GitHub Configuration

---

## [4.0.0] - 2026-03-07

### BREAKING CHANGES

**Major Simplification of Execution Model**

KARIMO v4.0 introduces a simplified PR-centric workflow that removes ~2,100 lines of code. This is a breaking change for existing PRD executions.

**What Changed:**
- PRs now target `main` directly (no feature branches)
- Tasks execute in wave order (wave 2 waits for wave 1 to merge)
- Claude Code manages worktrees via `isolation: worktree` (no manual worktree management)
- PR labels replace GitHub Projects for tracking
- Branch naming simplified to `{prd-slug}-{task-id}`
- Git state reconstruction for crash recovery

**Migration:**
- Existing active PRDs should complete before upgrading
- New PRDs will use the simplified model automatically
- No changes needed to your config.yaml or learnings.md

### Removed

**Deleted Files (~1,872 lines removed):**
- `.claude/skills/karimo-git-worktree-ops.md` (559 lines) — Claude Code's `isolation: worktree` handles this natively
- `.claude/skills/karimo-github-project-ops.md` (975 lines) — PR labels replace GitHub Projects V2
- `.github/workflows/karimo-sync.yml` (338 lines) — No feature branches to sync

**Removed Features:**
- GitHub Issues creation (PRs are the source of truth)
- GitHub Projects V2 integration (use `gh pr list --label karimo` instead)
- Fast Track mode (consolidated to single PR-based model)
- Manual worktree management (Claude Code handles automatically)
- Feature branches (PRs target main directly)

### Added

**Git State Reconstruction**

New crash recovery system that derives truth from git, not status.json:
- `/karimo-status --reconcile` forces state reconstruction
- `/karimo-execute` automatically reconciles on resume
- Detects crashed tasks (branch exists, no PR)
- Detects merged PRs that status.json missed
- Updates status.json to match git reality

**Wave-Ordered Execution**

Tasks execute in dependency-ordered waves:
- Wave 1 tasks execute in parallel
- Wave 2 waits for all Wave 1 PRs to merge
- Each wave's tasks branch from latest main (includes previous wave's code)
- findings.md propagation between waves

**PR-Centric Tracking**

PRs replace GitHub Projects as the source of truth:
- Labels: `karimo`, `karimo-{prd-slug}`, `wave-{n}`, `complexity-{n}`
- Dashboard queries: `gh pr list --label karimo-{slug}`
- Status derived from PR state (open, merged, closed)

**Finalization Protocol**

Mandatory finalization when all tasks complete:
- Generates metrics.json with duration, loops, model usage
- Deletes merged task branches from remote
- Updates status.json to `complete` with `finalized_at`
- Prompts for `/karimo-feedback` if learning candidates exist

**Task Agent Isolation**

All task agents now include `isolation: worktree` frontmatter:
- `karimo-implementer.md`
- `karimo-implementer-opus.md`
- `karimo-tester.md`
- `karimo-tester-opus.md`
- `karimo-documenter.md`
- `karimo-documenter-opus.md`

### Changed

**PM Agent Rewrite (~1,541 → ~512 lines)**

Complete rewrite with simplified responsibilities:
- Removed worktree management (Claude Code handles)
- Removed GitHub Issues creation
- Removed GitHub Projects setup
- Added wave-ordered execution with main-targeting PRs
- Added PR label management
- Added finalization protocol

**STATUS_SCHEMA.md Rewrite**

Updated for v4.0 model:
- Removed: `github_project_*`, `feature_branch`, `issue_number`, `worktree*`, `reconciliation_status`
- Added: `waves` object, simplified task fields
- Added: `version: "4.0"` field for schema versioning

**KARIMO_RULES.md Simplification**

- Removed Fast Track mode references
- Removed worktree management rules
- Added wave-ordered execution rules
- Simplified to ~250 lines

**karimo-execute.md Updates**

- Removed GitHub Projects pre-flight check
- Added label permission check
- Added resume protocol with git state reconstruction
- Updated pre-flight display for v4.0 model

**karimo-status.md Updates**

- Added git state reconstruction
- Added `--reconcile` flag
- Added crashed task detection (`💥` icon)
- Added wave-based display format
- Added reconciliation report display

### Documentation

**Updated Files:**
- `CLAUDE.md` — v4.0 execution model, removed Fast Track
- `COMMANDS.md` — Updated execute and status commands
- `GETTING-STARTED.md` — v4.0 workflow, crash recovery troubleshooting
- `PHASES.md` — Wave-ordered execution, updated Phase Comparison table

**Skills Count:**
- Reduced from 6 to 4 skills in manifest
- Removed `karimo-git-worktree-ops.md` and `karimo-github-project-ops.md`

---

## [3.5.3] - 2026-02-27

### Fixed

**Buggy Manifest Workflow Parsing**

Fixed a bug where `manifest_nested_list` incorrectly extracted "optional" as a workflow name due to regex not understanding JSON nesting. The root cause was sed/regex parsing that couldn't properly scope to nested arrays.

### Changed

**Simplified CI Validation**

Radically simplified `karimo-ci.yml` from ~240 lines to ~45 lines:
- Removed brittle `manifest_list` and `manifest_nested_list` shell functions
- Removed file-by-file validation (over-engineered and fragile)
- Kept JSON validity check and install script test
- Philosophy: CI testing is the user's responsibility, not KARIMO's

**Removed Workflows from MANIFEST.json**

The `workflows` section is no longer tracked in MANIFEST.json:
- Update script already uses `karimo-*` glob patterns for cleanup
- Eliminates the buggy nested parsing entirely
- Simplifies manifest structure

**Workflow Installation via /karimo-configure**

Optional workflows are now installed when users enable features:
- Greptile: Copies `karimo-greptile-review.yml` when enabled
- CI Observer: New question added; copies `karimo-ci-integration.yml` when enabled
- Added `ci_observer_enabled` to config.yaml schema

**Update Script Uses Glob Patterns**

The update script now uses glob patterns instead of manifest parsing for workflows:
- `karimo-ci.yml` always updated (required)
- Other `karimo-*.yml` updated only if already installed
- Supports workflows from both `.github/workflows/` and `.karimo/workflow-templates/`

| File | Change |
|------|--------|
| `.karimo/MANIFEST.json` | Removed `workflows` section |
| `.github/workflows/karimo-ci.yml` | Simplified to ~45 lines |
| `.claude/commands/karimo-configure.md` | Added workflow installers, CI observer question |
| `.karimo/update.sh` | Removed `manifest_nested_list`, use glob patterns |

---

## [3.5.2] - 2026-02-27

### Added

**Manifest-Based Cleanup in Update Script**

The update script now automatically removes stale `karimo-*` files not present in the manifest. This handles file renames and deletions cleanly across updates.

- New `cleanup_stale_files()` function compares local files against manifest
- Removes orphaned agents, commands, and skills after copying new files
- User's custom files (without `karimo-*` prefix) are never touched

### Changed

**Consistent `karimo-*` Prefix for All Skills**

All KARIMO-managed skills now use the `karimo-*` prefix for consistent identification:
- `karimo-git-worktree-ops.md`
- `karimo-github-project-ops.md`
- `karimo-bash-utilities.md`
- `karimo-code-standards.md`
- `karimo-doc-standards.md`
- `karimo-testing-standards.md`

This enables reliable cleanup during updates and clear distinction from user-added files.

---

## [3.5.1] - 2026-02-27

### Fixed

**CI Manifest Validation Pattern Bug**

Fixed a bug where CI validation counted ALL markdown files instead of only Karimo-managed files. This caused CI failures when users added custom commands or skills alongside Karimo's.

**Problem:**
- `validate-manifest` job used `*.md` pattern for commands and skills
- Users adding custom files (e.g., `restart.md`, `my-tool.md`) broke CI
- Manifest only tracks Karimo-managed files, not user additions

**Solution:**
- Changed patterns to `karimo-*.md` for commands and skills
- Renamed 2 skills for consistent prefix:
  - `git-worktree-ops.md` → `karimo-git-worktree-ops.md`
  - `github-project-ops.md` → `karimo-github-project-ops.md`

### Changed

| File | Change |
|------|--------|
| `.github/workflows/karimo-ci.yml` | Use `karimo-*.md` pattern for commands/skills counting |
| `.karimo/MANIFEST.json` | Updated skill filenames, bumped to 3.5.1 |
| `.claude/skills/karimo-git-worktree-ops.md` | Renamed from `git-worktree-ops.md` |
| `.claude/skills/karimo-github-project-ops.md` | Renamed from `github-project-ops.md` |
| `.claude/agents/karimo-pm.md` | Updated skill references |
| `.karimo/docs/ARCHITECTURE.md` | Updated skill references |
| `.karimo/docs/SAFEGUARDS.md` | Updated skill references |
| `.karimo/docs/GETTING-STARTED.md` | Simplified uninstall command |
| `.karimo/uninstall.sh` | Updated skill filenames |
| `CLAUDE.md` | Updated skill names |

---

## [3.5.0] - 2026-02-27

### Added

**Execution Metrics & Telemetry**

New `metrics.json` file generated at PRD completion for execution analysis and learning automation:
- Duration tracking (total and per-wave)
- Loop count statistics with high-loop task detection
- Model usage tracking (Sonnet/Opus counts, escalations)
- Greptile review scores per task
- Learning candidates auto-identification

**Reference:** `.karimo/templates/METRICS_SCHEMA.md`

**Rollback Protocol**

Task and feature-level rollback capabilities for error recovery:
- Task-level: Record `rollback_sha` before worker spawn, reset on validation failure after 3 loops
- Feature-level: Revert merged task commits if integration fails
- Decision tree: Retry → Escalate → Rollback → Human review

**Safe Commit Protocol**

New `safe_commit()` function in `git-worktree-ops` skill:
- Record pre-commit SHA
- Commit changes
- Run validation (build, lint)
- Auto-revert if validation fails

**Three-Way Merge Conflict Resolution**

Enhanced conflict handling before escalating to human:
- Attempt `git merge --no-commit` before rebase
- Categorize conflicts (easy/moderate/hard)
- Auto-resolve easy conflicts (imports, whitespace, lock files)
- Only escalate hard conflicts to `needs-human-rebase`

**Cross-PRD Dependency Graph**

New `--deps` flag for `/karimo-overview`:
- Read `cross_feature_blockers` from all PRDs
- Display runtime discoveries from `dependencies.md`
- Show dependency graph with blocking relationships
- Recommend execution order

**Cross-PRD Findings Propagation**

Protocol for propagating findings between PRDs:
- Finding types: DEPENDENCY, PATTERN, ANTI-PATTERN, INSIGHT
- PM agent checks if target PRD exists
- Propagate to target's `findings.md` or `dependencies.md`
- Track propagation status

**Batch Learning from Metrics**

New `--from-metrics` flag for `/karimo-feedback`:
- Read `metrics.json` learning candidates
- Present formatted suggestions for selective capture
- Batch append to `.karimo/learnings.md`

**Bash Utilities Skill**

New `.claude/skills/karimo-bash-utilities.md` with reusable helpers:
- `update_project_status()` for GitHub Project updates
- `parse_yaml_field()` for config parsing
- `read_status_field()` / `read_task_field()` for status.json
- Validation and time utilities

### Changed

**PM Agent Token Reduction (~830 tokens)**

Consolidated PM agent with skill references:
- Replaced 55-line `update_project_status()` with skill reference
- Replaced 240-line Step 3 with 80-line skill-based workflow
- Added Step 7d for metrics generation with learning prompt

**Interview Protocol Consolidation**

Made `INTERVIEW_PROTOCOL.md` the single source of truth:
- Added model assignment rules and complexity scoring
- Reduced `karimo-interviewer.md` from ~200 to ~90 lines
- Standardized model assignment: 1-4 = Sonnet, 5-10 = Opus

**STATUS_SCHEMA.md Updates**

Added rollback-related fields:
- Task-level: `rollback_sha`, `rolled_back`, `rolled_back_at`, `rollback_reason`
- PRD-level: `rollback_event` object for feature-level rollbacks

### Files Updated

| File | Changes |
|------|---------|
| `.claude/skills/karimo-bash-utilities.md` | **NEW** — Reusable bash utilities |
| `.karimo/templates/METRICS_SCHEMA.md` | **NEW** — Execution metrics schema |
| `.karimo/templates/INTERVIEW_PROTOCOL.md` | Added model assignment, complexity scoring |
| `.claude/agents/karimo-interviewer.md` | Reduced to ~90 lines, references protocol |
| `.claude/agents/karimo-pm.md` | Skill refs, Step 7d metrics, rollback protocol |
| `.claude/skills/git-worktree-ops.md` | Safe commit protocol |
| `.claude/KARIMO_RULES.md` | Three-way merge conflict resolution |
| `.karimo/templates/STATUS_SCHEMA.md` | Rollback fields |
| `.claude/commands/karimo-overview.md` | `--deps` flag for dependency graph |
| `.karimo/templates/DEPENDENCIES_TEMPLATE.md` | Cross-PRD propagation protocol |
| `.claude/commands/karimo-feedback.md` | `--from-metrics` batch mode |
| `.karimo/MANIFEST.json` | Version bump to 3.4.0 |

---

## [3.3.5] - 2026-02-27

### Added

**Real-Time GitHub Project Status Updates**

Added `update_project_status` helper function to PM Agent that syncs task status changes with GitHub Projects in real-time. Previously, the Kanban board only updated after PR merge via `karimo-sync.yml`, causing a visibility gap during active execution where tasks appeared stuck with blank status.

**Status transitions now update the board immediately:**

| Transition Point | Status Set | Location |
|------------------|------------|----------|
| Task added to project | `queued` | Step 3f |
| Worker agent spawned | `running` | Step 5c |
| PR created | `in-review` | Step 6e |
| Greptile review fails | `needs-revision` | Step 6f |
| 3 failed Greptile attempts | `needs-human-review` | Step 6f |

**Implementation details:**
- Helper function uses `gh project item-edit` with proper field/option ID lookups
- Gracefully skips in `fast-track` mode (no GitHub Projects)
- Handles missing project data with early returns
- Suppresses errors to avoid noisy output

**Before:** Tasks on Kanban board had blank status during execution, jumping to `done` only after PR merge.

**After:** Board reflects real-time execution state — `queued` → `running` → `in-review` → `done`.

**Files updated:**

| File | Changes |
|------|---------|
| `karimo-pm.md` | Added `update_project_status` helper, status update calls at 5 transition points |

---

## [3.3.4] - 2026-02-26

### Fixed

**Case-Insensitive CLAUDE.md Path Detection**

Fixed CLAUDE.md detection to handle both uppercase and lowercase file names. Some projects (like BOS-3.0) use lowercase `claude.md`, which works on macOS (case-insensitive filesystem) but would fail on Linux/CI (case-sensitive filesystem).

**Problem:** KARIMO checked for `CLAUDE.md` and `.claude/CLAUDE.md` but not lowercase variants. This worked on macOS but would fail on Linux CI environments.

**Solution:** Added 4-path case-insensitive detection to all files that read CLAUDE.md:

```bash
# Check all possible locations for CLAUDE.md (case-insensitive)
if [ -f ".claude/CLAUDE.md" ]; then
    CLAUDE_MD=".claude/CLAUDE.md"
elif [ -f ".claude/claude.md" ]; then
    CLAUDE_MD=".claude/claude.md"
elif [ -f "CLAUDE.md" ]; then
    CLAUDE_MD="CLAUDE.md"
elif [ -f "claude.md" ]; then
    CLAUDE_MD="claude.md"
else
    echo "❌ CLAUDE.md not found"
    exit 1
fi
```

**Files updated:**

| File | Change |
|------|--------|
| `karimo-configure.md` | Add lowercase checks after uppercase |
| `karimo-doctor.md` | Add lowercase checks in 4 locations |
| `karimo-execute.md` | Add lowercase checks after uppercase |
| `karimo-test.md` | Add lowercase checks after uppercase |
| `github-project-ops.md` | Add lowercase checks after uppercase |
| `install.sh` | Add lowercase checks after uppercase |
| `update.sh` | Add lowercase checks after uppercase |
| `uninstall.sh` | Add lowercase checks after uppercase |

---

## [3.3.3] - 2026-02-26

### Added

**GitHub Integration Improvements**

Major improvements to GitHub integration addressing gaps from BOS-3.0 testing.

**Branch-Issue Linking (Gap #2)**
- Branches now link to issues in GitHub UI via `gh issue develop`
- PM agent creates branch-to-issue link BEFORE creating worktree
- Visible in GitHub issue's "Development" sidebar
- Fallback documented for manual branch creation

**Sub-Issues Hierarchy (Gap #4)**
- Feature issue created first as parent
- Task issues linked as sub-issues via GitHub MCP `sub_issue_write`
- Clear hierarchy: Feature → Task issues in GitHub UI

**Wave Field Tracking (Gap #20)**
- New single-select "Wave" field in GitHub Projects
- Tasks tagged with wave number for filtering
- Enables wave-based progress tracking

**Board Automations Documentation (Gap #19)**
- Documentation for GitHub Projects workflow automations
- Auto-add, item-closed, PR-merged automations
- CLI fallback for repositories without UI access

**MCP-Based PR Review Comments**
- Review/Architect agent uses MCP for structured PR reviews
- Line-specific, multi-line, and file-level comments
- Pending review workflow with batch submission

**Enhanced Brief and Issue Templates**
- Brief template includes Wave, Feature Issue, GitHub Context sections
- Issue body template includes parent link, wave, success criteria, execution context

### Changed

**Execution Modes Documentation**
- `KARIMO_RULES.md` updated with Full Mode vs Fast Track Mode
- Tool selection guide (MCP vs CLI) documented
- Mode-specific agent behavior rules added

**SAFEGUARDS.md**
- Execution modes section with tradeability chains
- Mode selection guide with trade-offs

**Files Updated:**

| File | Changes |
|------|---------|
| `karimo-pm.md` | Branch-issue linking (Step 4), sub-issues (Step 3), wave field |
| `git-worktree-ops.md` | Branch-Issue Linking section |
| `github-project-ops.md` | Sub-issues, wave field, board automations, merge strategy |
| `karimo-review-architect.md` | MCP-based PR review comments |
| `karimo-brief-writer.md` | Enhanced brief and issue body templates |
| `KARIMO_RULES.md` | Execution modes, tool selection guide |
| `SAFEGUARDS.md` | Execution modes documentation |

### Fixed

**CLAUDE.md Dual-Path Support in Commands and Skills**

Fixed hardcoded `CLAUDE.md` path references that prevented commands from working when CLAUDE.md is located at `.claude/CLAUDE.md` (common in Claude Code projects like BOS-3.0).

**Problem:** Commands used hardcoded `CLAUDE.md` path, but some projects use `.claude/CLAUDE.md`. This caused:
- `/karimo-configure` failing to update GitHub Configuration table
- `/karimo-doctor` reporting false "KARIMO section missing" errors
- `/karimo-execute` pre-flight checks failing
- `/karimo-test` smoke tests failing

**Solution:** Added path detection to check both locations before any CLAUDE.md operation.

**Files updated:**

| File | Change |
|------|--------|
| `karimo-configure.md` | Add Step 8a path detection, use `$CLAUDE_MD` variable in sed commands |
| `karimo-doctor.md` | Add path detection in Check 1.5 and Check 3, update all grep references |
| `karimo-execute.md` | Add path detection in pre-flight checks |
| `karimo-test.md` | Add path detection in Test 5 |
| `github-project-ops.md` | Add path detection to owner resolution section |
| `uninstall.sh` | Add dual-path detection matching install.sh behavior |

**Standard detection pattern:**
```bash
# Check both possible locations for CLAUDE.md
if [ -f ".claude/CLAUDE.md" ]; then
    CLAUDE_MD=".claude/CLAUDE.md"
elif [ -f "CLAUDE.md" ]; then
    CLAUDE_MD="CLAUDE.md"
else
    CLAUDE_MD=""
fi
```

**GitHub Projects Workflow: Implement Status Updates**

Replaced placeholder code in `karimo-sync.yml` with actual `gh project item-edit` commands that update project item status when task PRs are merged.

**Problem:** The `update-project` job in `karimo-sync.yml` was a placeholder that logged messages but never actually updated the GitHub Project.

**Solution:** Implemented full project item update logic:
1. Read project info (number, owner) from `status.json`
2. Find project item by task ID pattern `[{task_id}]` in title
3. Get `agent_status` field and "done" option IDs
4. Update item status via `gh project item-edit`

**Graceful fallbacks:** The workflow skips without failing if:
- Status file missing or has no project info
- Project item not found for task
- `agent_status` field not configured in project
- Any `gh` command fails

---

## [3.3.2] - 2026-02-25

### Fixed

**Install/Update Scripts: CLAUDE.md Location and .gitignore Handling**

Fixed two issues that caused incomplete installations when updating projects with non-standard CLAUDE.md locations.

**Problem 1:** `install.sh` hardcoded `CLAUDE.md` at project root, but some Claude Code projects (like BOS-3.0) use `.claude/CLAUDE.md`. The KARIMO section was never added.

**Problem 2:** `update.sh` didn't handle `.gitignore` or CLAUDE.md at all. If the original install was incomplete, updates never fixed it.

**Solution:**
- `install.sh`: Check both `CLAUDE.md` and `.claude/CLAUDE.md` locations
- `update.sh`: Verify and fix `.gitignore` (.worktrees/) and CLAUDE.md KARIMO section if missing

**Changes:**

| File | Change |
|------|--------|
| `install.sh` | Check both CLAUDE.md locations (root and `.claude/`) |
| `update.sh` | Add .gitignore verification/fix for `.worktrees/` |
| `update.sh` | Add CLAUDE.md KARIMO section verification/fix |

**Documentation Fixes**

Fixed incorrect update command syntax in README and GETTING-STARTED docs.

| File | Change |
|------|--------|
| `README.md` | Fix update section with correct two-mode syntax |
| `GETTING-STARTED.md` | Fix update section, document all flags, list preserved files |

**`/karimo-execute` Pre-flight GitHub Config Fallback**

Added config.yaml fallback logic to `/karimo-execute` pre-flight checks, completing the fix started in v3.3.1.

**Problem:** `/karimo-execute` only read GitHub configuration from CLAUDE.md. When CLAUDE.md had `_pending_` placeholder values (before running `/karimo-configure`), execution would fail with a misleading error about not being able to access projects for `_pending_`.

**Solution:** Apply the same fallback logic from `github-project-ops` to the execute pre-flight checks.

**Changes:**

| File | Change |
|------|--------|
| `karimo-execute.md` | Add config.yaml fallback when CLAUDE.md has `_pending_` values |

**New behavior:**
1. Try reading GitHub owner from CLAUDE.md first
2. If empty or `_pending_`, fall back to `.karimo/config.yaml`
3. Show source indicator: `[from CLAUDE.md]` or `[from config.yaml]`
4. Display informational message when using fallback
5. Better error messages explaining configuration state

**Before:**
```
❌ GitHub Project permissions denied
Cannot access projects for '_pending_'
```

**After:**
```
ℹ️  Using GitHub config from .karimo/config.yaml
✓ GitHub owner: opensesh (organization) [from config.yaml]
```

---

## [3.3.1] - 2026-02-25

### Fixed

**CLAUDE.md Integration UX**

Improved user experience when KARIMO is installed into a repository with an existing CLAUDE.md.

**Problem:** Users couldn't distinguish what KARIMO added vs what was already in CLAUDE.md. The uninstaller couldn't find the section to remove due to a name mismatch.

**Solution:** Marker-delimited KARIMO section with clear boundaries.

**Changes:**

| File | Change |
|------|--------|
| `install.sh` | Replace 8-line block with marker-delimited section (~20 lines) |
| `uninstall.sh` | Fix section name (`## KARIMO` not `## KARIMO Framework`) + marker-based removal |
| `karimo-doctor.md` | Update checks to look for `<!-- KARIMO:START` markers |
| `karimo-test.md` | Update verification to check for markers and GitHub Configuration |
| `karimo-configure.md` | Add Step 8 to update CLAUDE.md GitHub Configuration table |
| `github-project-ops.md` | Add config.yaml fallback when CLAUDE.md has `_pending_` values |
| `GETTING-STARTED.md` | Document marker system |

**New CLAUDE.md format:**

```markdown
<!-- KARIMO:START - Do not edit between markers -->
## KARIMO

This project uses [KARIMO](https://github.com/opensesh/KARIMO) for PRD-driven autonomous development.

### Quick Reference
- **Commands:** Type `/karimo-` to see all commands
- **Agent rules:** `.claude/KARIMO_RULES.md`
- **Configuration:** `.karimo/config.yaml`
- **Learnings:** `.karimo/learnings.md`

### GitHub Configuration

| Setting | Value |
|---------|-------|
| Owner Type | _pending_ |
| Owner | _pending_ |
| Repository | _pending_ |

_Run `/karimo-configure` to detect and populate these values._
<!-- KARIMO:END -->
```

**Benefits:**
- Clear start/end boundaries users can see
- Programmatic detection for updates/uninstall
- Placeholder GitHub Configuration table that `/karimo-configure` populates
- Backward compatibility with legacy `## KARIMO` format

---

## [3.3.0] - 2026-02-25

### Added

**`/karimo-update` Command**

New self-update command that fetches and applies KARIMO updates from GitHub releases.

```
/karimo-update              # Check for updates and install if available
/karimo-update --check      # Only check for updates, don't install
/karimo-update --force      # Update even if already on latest version
```

**Update Script (`.karimo/update.sh`)**
- Fetches latest release from GitHub API (`opensesh/KARIMO`)
- Compares semver versions between installed and latest
- Downloads and extracts release tarball
- Uses MANIFEST.json to update only KARIMO-managed files
- Self-updates the update script itself
- Supports local mode for development: `--local <source> <target>`
- CI mode for automated pipelines: `--ci`

**Files preserved during updates (never modified):**
- `.karimo/config.yaml` — Your project configuration
- `.karimo/learnings.md` — Your accumulated learnings
- `.karimo/prds/*` — Your PRD files
- `CLAUDE.md` — Your project instructions

### Changed

**Interactive Configuration Settings**

`/karimo-configure` now uses interactive questions instead of passive acceptance:

- **Execution Settings** (Section 5): Users actively choose model, parallelism, and pre-PR checks with tradeoff descriptions
- **Cost Controls** (Section 6): Users actively choose escalation policy, max attempts, and Greptile toggle
- Each option now shows "(Recommended)" label and describes implications
- Added reminder that settings can be changed anytime via `/karimo-configure`

**Command Naming Convention**

All commands updated from `karimo:` to `karimo-` format for consistency:
- `/karimo:plan` → `/karimo-plan`
- `/karimo:execute` → `/karimo-execute`
- etc.

**First-Time Configuration UX**

`/karimo-plan` now handles missing configuration inline instead of requiring a separate `/karimo-configure` step:

1. Shows brief explanation of why configuration matters
2. Spawns investigator agent to scan codebase
3. Presents detected settings (runtime, framework, commands, boundaries)
4. User can accept, edit, or reject detected config
5. Interview continues automatically after config is set

This replaces the previous 3-option menu that required users to exit and return.

**Agent Voice & Delivery Guidelines**

Added "Voice & Delivery" sections to command and agent files to prevent narrator-style output where agents announce what they're about to do instead of just doing it.

Files updated:
- `.claude/commands/karimo-plan.md` — Voice guidelines with good/bad examples
- `.claude/agents/karimo-interviewer.md` — Voice guidelines for interview context

Language changes:
- "Would you like me to scan the codebase..." → "Codebase scan available. Proceed? [Y/n]"
- "I'll incorporate these learnings... Ready for me to generate it?" → "Incorporating learnings. Generate PRD now? [Y/n]"
- "I'll add this to..." → "Adding to..."

This addresses the UX friction where agents would say things like "Let me show you the welcome message, and then we'll get configuration set up" instead of simply presenting the content.

**Lazy File Loading for `/karimo-plan`**

Optimized startup performance by deferring file reads to when they're actually needed:

| File | Before | After | Reason |
|------|--------|-------|--------|
| `config.yaml` | Step 1 | Step 1 | Needed immediately ✓ |
| `learnings.md` | Step 1 | Round 4 | Only used in Retrospective |
| `prds/*.md` | Step 1 | Round 4 | Only used in Retrospective |
| `PRD_TEMPLATE.md` | Step 1 | Step 6 | Only used during PRD generation |
| `INTERVIEW_PROTOCOL.md` | Step 1 | Removed | Already embedded in interviewer agent |

This eliminates the noticeable delay at startup from reading 5 files that won't be used for 15+ minutes.

### Documentation

- Added `/karimo-update` to CLAUDE.md slash commands table
- Updated installed components count (10 → 11 commands)
- Added `karimo-update.md` to MANIFEST.json

---

## [3.2.0] - 2026-02-22

### Changed

**Slim CLAUDE.md Architecture**

KARIMO now follows Anthropic's best practice of keeping CLAUDE.md minimal. Configuration and learnings have been moved to dedicated files.

**Before:**
- CLAUDE.md contained ~65+ lines with full configuration tables, boundaries, commands, and learnings
- All agents read from CLAUDE.md sections
- `/karimo-configure` wrote directly to CLAUDE.md

**After:**
- CLAUDE.md receives only a minimal ~8 line reference block on install
- Configuration stored in `.karimo/config.yaml` (YAML format, single source of truth)
- Learnings stored in `.karimo/learnings.md` (dedicated file for compound learning)
- Agents read from config.yaml and learnings.md

**Why this matters:**
- CLAUDE.md content is wrapped in a system reminder saying it "may or may not be relevant"
- Anthropic recommends keeping CLAUDE.md under ~300-500 lines
- Separating configuration from learnings enables cleaner updates
- YAML format in config.yaml is easier to parse and validate

**New file structure:**
```
.karimo/
├── config.yaml      # Project configuration (runtime, commands, boundaries)
├── learnings.md     # Compound learnings (patterns, anti-patterns, rules, gotchas)
├── prds/            # PRD folders
└── ...
```

**Minimal CLAUDE.md block (appended by install.sh):**
```markdown
## KARIMO

This project uses KARIMO for PRD-driven autonomous development.

- **Agent rules:** `.claude/KARIMO_RULES.md`
- **Config & PRDs:** `.karimo/`
- **Learnings:** `.karimo/learnings.md`
- **All commands prefixed** `karimo:` — type `/karimo-` to see available commands
```

**Files updated (20+ files):**

| Category | Files |
|----------|-------|
| Install/Update | `install.sh`, `update.sh` |
| Commands | `configure.md`, `plan.md`, `execute.md`, `feedback.md`, `learn.md`, `doctor.md`, `test.md` |
| Agents | `karimo-pm.md`, `karimo-investigator.md`, `karimo-implementer.md`, `karimo-implementer-opus.md`, `karimo-brief-writer.md`, `karimo-review-architect.md`, `karimo-learn-auditor.md` |
| Skills | `karimo-code-standards.md` |
| Templates | `LEARN_INTERVIEW_PROTOCOL.md` |
| Documentation | `ARCHITECTURE.md`, `GETTING-STARTED.md`, `COMMANDS.md`, `COMPOUND-LEARNING.md`, `SAFEGUARDS.md`, `PHASES.md`, `README.md`, `CLAUDE.md`, `KARIMO_RULES.md` |

**Migration notes:**
- Existing installations: Run `/karimo-configure` to generate `.karimo/config.yaml`
- Existing learnings in CLAUDE.md: Manually move to `.karimo/learnings.md`
- `update.sh` now preserves `config.yaml` and `learnings.md` (never overwrites)

---

## [3.1.2] - 2026-02-22

### Fixed

**jq Dependency Removal**

Eliminated external `jq` dependency from all KARIMO agent and skill instructions. All JSON parsing now uses jq-free approaches.

**Three-pronged approach:**
- **Simple fields:** grep/sed for root-level status.json fields (POSIX-compliant)
- **GitHub CLI:** `gh --jq` built-in flag for API responses (embedded Go implementation)
- **Complex queries:** Node.js one-liner fallback for nested JSON (documented escape hatch)

**Files updated:**
- `karimo-pm.md` — status.json parsing (grep/sed), project listing/creation (gh --jq)
- `github-project-ops.md` — project creation, item filtering (gh --jq)
- `modify.md` — status.json parsing (grep/sed)
- `KARIMO_RULES.md` — Added "JSON Parsing Without jq" documentation section

**Why this matters:**
- install.sh, update.sh, and uninstall.sh were already jq-free
- Agent instructions contained jq commands that could fail on systems without jq
- GitHub CLI has embedded jq via `--jq` flag, no external binary needed
- grep/sed patterns work on any POSIX system

---

## [3.1.1] - 2026-02-22

### Fixed

**Documentation Sync**

Synced all documentation to reflect `/karimo-modify` command introduced in v3.1.0.

- **MANIFEST.json**: Added `modify.md` to commands array (now 10 commands)
- **COMMANDS.md**: Added full sections for `/karimo-modify` and `/karimo-test`, updated summary table (10 rows)
- **install.sh**: Added `/karimo-modify` to CLAUDE.md template slash commands list

### Added

**Integration Points for `/karimo-modify`**

- **plan.md**: Added tip after approval mentioning `/karimo-modify` for later adjustments
- **execute.md**: Added note about using `/karimo-modify` for structural changes before execution
- **status.md**: Added `modified_at` and `modification_count` to PRD details and JSON output
- **overview.md**: Added `(modified Nx)` annotation to PRD rows in dashboard

---

## [3.1.0] - 2026-02-22

### Added

**Wave-Based Execution Plan**

Replaced complex DAG algorithms (BFS/DFS) with simple wave-based task grouping. This simplification scales better and enables PRD modification.

- `EXECUTION_PLAN_SCHEMA.md`: New schema replacing `DAG_SCHEMA.md`
- Waves group tasks by dependency resolution (no graph theory required)
- Self-validation ensures dependencies are in earlier waves
- Complexity warning for PRDs with 10+ tasks

**`/karimo-modify` Command**

New command to modify approved PRDs before execution:
- Add, remove, or change tasks
- Update dependencies
- Split or merge tasks
- Automatic execution plan regeneration
- Natural language modification interface
- Validation and diff display before saving

### Changed

**Execution Plan Format**

Old (`dag.json`):
```json
{
  "nodes": [...], "edges": [...], "depth": ..., "critical_path": [...], "parallel_groups": [...]
}
```

New (`execution_plan.yaml`):
```yaml
waves:
  1: [1a]
  2: [1b, 1c]
  3: [2a]
summary:
  total_waves: 3
  longest_chain: "1a → 1b → 2a"
  parallel_capacity: 2
```

**Updated Components**
- `karimo-reviewer.md`: Wave-based generation with self-validation
- `karimo-pm.md`: Reads waves instead of parallel_groups
- `plan.md`: Updated review output format
- Templates, docs, and README updated for new schema

### Removed

- `DAG_SCHEMA.md` (replaced by `EXECUTION_PLAN_SCHEMA.md`)
- BFS depth calculation algorithm
- DFS critical path calculation algorithm
- Edge enumeration (deps now only in tasks.yaml)

---

## [3.0.4] - 2026-02-22

### Added

**Mid-Execution Failure Recovery Detection**

Detect stale state that indicates crashed or disconnected agents, guiding users to recovery.

**`/karimo-status` — Staleness Detection**
- New "Staleness Thresholds" section defining detection intervals
- Step 7b: Staleness Detection logic for running, cleanup, and review states
- `⏰` icon for stale tasks in status icons table
- Warnings section shows stale tasks and worktrees with recovery suggestions
- Next actions prioritize recovery command when stale state detected

**`/karimo-doctor` — Check 6: Execution Health**
- 6a: Stale running tasks (> 4 hours since `started_at`)
- 6b: Orphaned worktrees (in filesystem but not in status.json)
- 6c: Ghost branches (in status.json but deleted from git)
- 6d: Status-PR mismatch (merged PRs still showing `in-review`)
- 6e: Pending cleanup (worktrees stuck > 6 hours after merge)
- Recovery recommendations in summary output

**Staleness Thresholds**

| State | Threshold | Interpretation |
|-------|-----------|----------------|
| `running` | 4 hours | Agent likely crashed or disconnected |
| `pending-cleanup` | 6 hours | Worktree cleanup was interrupted |
| `in-review` | 48 hours | PR may need attention |
| `paused` | 7 days | Task may be forgotten |

### Documentation

- `STATUS_SCHEMA.md`: Added Staleness Thresholds section with recovery documentation

---

## [3.0.3] - 2026-02-22

### Added

- **GitHub Configuration Detection** — Automatically detect and store GitHub repository settings
  - Investigator agent now detects owner type (personal/org), owner name, repo name, default branch
  - Configure command adds Step 4.5: GitHub Configuration
  - Writes `### GitHub Configuration` table to CLAUDE.md

- **GitHub Project Access Validation** — Pre-flight checks for project permissions
  - Doctor command adds Check 1.5: GitHub Project Access
  - Execute command validates GitHub config and project access before starting
  - Clear error messages with remediation steps (`gh auth refresh -s project`)

- **Idempotent Project Creation** — Re-running execute reuses existing projects
  - PM agent checks for existing project before creating new one
  - github-project-ops skill updated with idempotent creation pattern

### Changed

- **PM Agent Step 3** — Now reads owner from CLAUDE.md instead of hardcoding
  - Step 3a: Read GitHub Configuration
  - Step 3b: Check if Project Exists (idempotency)
  - Step 3c: Configure Project

- **github-project-ops Skill** — Added owner resolution section
  - `Resolve Project Owner` section reads from CLAUDE.md
  - Replaced hardcoded `{org}` with dynamic `$PROJECT_OWNER`
  - Added validation commands for config and access

### Updated

**Files Modified:**
- `karimo-investigator.md` — GitHub repo detection in context-scan and drift-check
- `configure.md` — Step 4.5: GitHub Configuration (section numbering updated)
- `doctor.md` — Check 1.5: GitHub Project Access
- `execute.md` — GitHub pre-flight checks and error handling
- `karimo-pm.md` — Step 3 rewritten for config-driven owner resolution
- `github-project-ops.md` — Owner resolution and idempotent project creation

---

## [3.0.2] - 2026-02-22

### Changed

- **Standardized Findings Format** — Eliminated findings.json, all findings now use markdown format
  - Workers produce `findings.md` in worktree root (not JSON)
  - PM agent reads `findings.md` from worktrees, appends to PRD-level findings.md
  - Single format throughout the system for human readability and consistency

### Updated

**Worker Agents (6 files):**
- `karimo-implementer.md` — findings.json contract → findings.md contract
- `karimo-implementer-opus.md` — findings.json contract → findings.md contract
- `karimo-tester.md` — findings.json contract → findings.md contract
- `karimo-tester-opus.md` — findings.json contract → findings.md contract
- `karimo-documenter.md` — findings.json contract → findings.md contract
- `karimo-documenter-opus.md` — findings.json contract → findings.md contract

**PM Agent:**
- `karimo-pm.md` Step 6c now reads `findings.md` instead of `findings.json`

**Templates:**
- `FINDINGS_TEMPLATE.md` — Added two-level structure documentation (worker findings + PRD findings)

---

## [3.0.1] - 2026-02-22

### Fixed

**PRD Directory Numbering**
- Added sequential 3-digit numbering algorithm to reviewer agent
- PRD directories now created as `001_slug/`, `002_slug/`, etc.
- Handles edge cases: no existing PRDs, gaps in numbering, non-conforming directories

**PRD Date Population**
- `created_date` field in PRD.md frontmatter now auto-populated
- Uses ISO format (YYYY-MM-DD) at creation time

### Documentation

- Updated `karimo-reviewer.md` with PRD Directory Numbering and PRD Date Population sections
- Updated `plan.md` Step 8 to document auto-generated numbering and date behavior

---

## [3.0.0] - 2026-02-22

### Changed

- **Plan/Execute Flow Redesign** — Consolidated `/karimo-review` into `/karimo-plan` and `/karimo-execute`
  - Old flow: `/karimo-plan` → `/karimo-review` → `/karimo-execute`
  - New flow: `/karimo-plan` (with interactive review) → `/karimo-execute` (with brief generation)
- `/karimo-plan` now includes Step 7: Interactive Review & Feedback Loop
  - Options: Approve (→ ready), Modify (→ re-run reviewer), Save as draft
  - PRD summary displayed after generation for approval
- `/karimo-execute` now has two-phase structure
  - Phase 1: Brief Generation — spawns brief-writer, presents briefs for review
  - Phase 2: Execution — PM agent reads briefs from disk, runs workers
- `karimo-pm.md` reads existing briefs from disk instead of generating them
- `karimo-brief-writer.md` spawn context updated from "review" to "execute"
- Status flow simplified: `draft → ready → active → complete` (removed `approved`)
- Backward compatibility: `approved` status treated as equivalent to `ready`

### Removed

- `/karimo-review` command — functionality absorbed by plan.md and execute.md
- `approved` status from STATUS_SCHEMA.md (backward compat maintained)

### Documentation

- COMMANDS.md: Removed review section, updated plan/execute documentation
- ARCHITECTURE.md: Updated flow diagram to show two-command flow
- GETTING-STARTED.md: Updated quickstart (plan → execute, no review step)
- README.md: Updated flow diagram, command table, directory structure
- CLAUDE.md: Updated slash commands (9 instead of 10)

---

<details>
<summary>View v2.x changelog history (internal evolution)</summary>

## [2.9.0] - 2026-02-22

### Changed

- **CLAUDE.md as single source of truth** — Eliminated config.yaml entirely
- `/karimo-configure` writes directly to CLAUDE.md tables
- `/karimo-plan` checks CLAUDE.md for `_pending_` markers instead of config.yaml
- `/karimo-doctor` Check 3 validates CLAUDE.md configuration
- **Removed jq dependency** — All scripts use grep/sed/awk/Node.js
- `uninstall.sh` reads file lists from MANIFEST.json dynamically

### Removed

- `.karimo/config.yaml` — No longer created or used
- `--skip-config` flag from `install.sh`
- `jq` as required dependency

---

## [2.8.1] - 2026-02-21

### Added

**Manifest System**
- `.karimo/MANIFEST.json` — Single source of truth for file inventory
- Contains lists of agents, commands, skills, templates, and workflows
- Version tracking embedded in manifest
- Enables CI validation and consistent installation

**CI Mode**
- `install.sh --ci` — Non-interactive installation for CI/CD pipelines
- `update.sh --ci` — Non-interactive updates
- Auto-confirms all prompts, installs all workflows
- Required for automated testing and deployment

**CI Validation**
- `karimo-ci.yml` now validates against manifest
- `validate-manifest` job runs first, checks file existence
- `validate-installation` job tests install script with --ci flag
- Catches manifest drift before installation failures

### Changed

**install.sh**
- Reads file lists from MANIFEST.json instead of hardcoded copies
- Copies MANIFEST.json to target project
- Requires `jq` dependency (with helpful error message)
- Displays manifest-derived counts in summary

**update.sh**
- Uses manifest for file comparison
- Syncs MANIFEST.json on update
- Requires `jq` dependency

**test.md and doctor.md**
- Read expected counts from MANIFEST.json
- Dynamic validation instead of hardcoded expectations
- Template validation iterates manifest list

### Fixed

**CI Workflow**
- Previously expected 10 agents, now correctly reads 13 from manifest
- Previously expected 7 templates, now correctly reads 9 from manifest
- Counts stay in sync when files are added or removed

---

## [2.8.0] - 2026-02-21

### Added

**Dual-Model Task Agent System**
- `karimo-implementer-opus` — Complex implementation tasks (complexity 5+)
- `karimo-tester-opus` — Complex test writing (complexity 5+)
- `karimo-documenter-opus` — Complex documentation (complexity 5+)
- PM agent now routes to Opus variants automatically based on task complexity

**KARIMO vs Native Worktree Documentation**
- Added clarification section to `git-worktree-ops.md` explaining why KARIMO uses manual worktree creation
- Documents path control, branch naming, and lifecycle management requirements

### Changed

**PM Agent Spawn Mechanics**
- Replaced fake `Task: @{agent-type}` syntax with natural language Claude Code delegation
- Step 5c now uses actual Task tool delegation format
- Updated dual-model routing table (Sonnet for 1-4, Opus for 5+)
- Updated Greptile revision loop to reference Opus variant usage

**Worker Agent Descriptions**
- `karimo-implementer` — Added "(complexity 1-4)" scope clarification
- `karimo-tester` — Added "(complexity 1-4)" scope clarification
- `karimo-documenter` — Added "(complexity 1-4)" scope clarification

**Worktree Instructions**
- `TASK_BRIEF_TEMPLATE.md` — Generic working directory instruction (no hardcoded paths)
- `KARIMO_RULES.md` — Updated worktree discipline to use "assigned directory"

**Documentation**
- `ARCHITECTURE.md` — Expanded Task Agents table with dual-model system
- Added Model Assignment table showing complexity-to-model routing

---

## [2.7.1] - 2026-02-21

### Added

**Brief Count Validation**
- `/karimo-review` now validates brief count after generation
- Shows expected vs generated count with clear pass/fail status
- Offers retry, exclude, or cancel options if briefs are missing
- Prevents PRD approval with incomplete brief generation

**First-Run Welcome Message**
- `/karimo-plan` displays welcome message on first use (when no PRDs exist)
- Explains the 5-round interview process before proceeding
- Improves onboarding by setting expectations for new users

**KARIMO CI Workflow**
- New `karimo-ci.yml` validates installation integrity on push/PR
- Tests install script in isolated fixture project
- Verifies expected file counts: 10 agents, 10 commands, 5 skills, 7 templates
- Checks KARIMO_RULES.md and VERSION file existence

**Documentation**
- README.md: Added `/karimo-test` to slash commands table
- README.md: Added `overview.md` and `test.md` to directory listing
- README.md: Added CHANGELOG.md link to documentation section

### Changed

**Reinstall Warning**
- `install.sh` now explicitly warns that reinstallation overwrites all KARIMO files
- Directs users to `update.sh` to preview changes first

**Configure Command**
- Added `/karimo-doctor` reference in Greptile configuration section
- Helps users verify repository secrets are properly configured

### Fixed

**Uninstall Script**
- Now runs `git worktree prune` to clean up stale worktree references
- Prevents orphaned worktree entries after manual directory removal

---

## [2.7.0] - 2026-02-21

### Added

**Install Script Auto-Detection**
- Auto-detects package manager from lock files (pnpm, yarn, npm, bun, poetry, pip, go, cargo)
- Auto-detects runtime (Node.js, Bun, Deno, Python, Go, Rust)
- Auto-detects framework (Next.js, Nuxt, SvelteKit, Astro, Remix, Vite, Angular, Vue)
- Extracts build commands from package.json scripts (requires `jq`, graceful fallback)
- Creates `.karimo/config.yaml` with detected values during installation
- Populates CLAUDE.md with actual values instead of `_pending_` placeholders
- Added `--skip-config` flag to skip auto-detection

**Doctor Command Enhancements**
- config.yaml existence check as first validation step
- Drift detection: compares configured package manager vs actual lock files
- Drift detection: compares configured commands vs package.json scripts
- Recommendation mapping table for different issue types
- **Check 0: Version Status** — Detects when installed KARIMO is behind source version
- Compares `.karimo/VERSION` against `KARIMO_SOURCE_PATH/VERSION` environment variable
- Graceful degradation when source path unknown

**`/karimo-test` Command**
- New smoke test command for installation verification
- 5 lightweight validation tests (no agent spawning or PR simulation):
  - File presence: agents, commands, skills, templates
  - Template parsing validation
  - GitHub CLI authentication check
  - State file integrity (JSON validation)
  - CLAUDE.md integration check
- Pass/fail output with detailed error messages
- Fast and safe — suitable for CI/pre-commit hooks

**Install Script License Notice**
- Added Apache 2.0 license notice to installation completion output
- Clarifies installed files are Apache 2.0 while user code remains under their own license

**Documentation**
- CONTRIBUTING.md: Added "Testing Your Changes" section with validation checks table

### Changed

**Configuration Workflow**
- `config.yaml` is now the source of truth for KARIMO configuration
- CLAUDE.md mirrors config.yaml for human readability
- `/karimo-configure` now syncs both files on completion
- `/karimo-plan` checks for config.yaml first, offers choice if missing
- `/karimo-doctor` recommends `/karimo-configure` for config issues (not `/karimo-plan`)

**Documentation Updates**
- GETTING-STARTED.md: Documented auto-detection, `--skip-config` flag, new workflow
- COMMANDS.md: Updated configure and doctor sections with new behaviors
- doctor.md: Added config.yaml validation and drift detection steps
- configure.md: Added source-of-truth documentation, dual-file sync behavior
- plan.md: Added config.yaml check before interview, user choice for missing config

---

## [2.6.0] - 2026-02-21

### Added

**`/karimo-overview` Command**
- New cross-PRD oversight dashboard command
- Shows blocked tasks, revision loops, rebase needs, and recent completions
- Primary daily oversight touchpoint — check each morning or after execution runs
- Supports `--blocked` flag to show only blocked tasks
- Supports `--active` flag to show only active PRDs with progress

### Changed

**`/karimo-review` Refocused**
- Now focuses solely on PRD approval workflow
- Removed cross-PRD dashboard (moved to `/karimo-overview`)
- Default behavior changed from dashboard to `--pending` mode (lists PRDs awaiting approval)
- Updated command description and documentation throughout

**Install Script Updates**
- Added `overview.md` to commands copy section
- Updated command count from 8 to 9
- Updated CLAUDE.md template with `/karimo-overview` reference

**Documentation Updates**
- README.md: Updated slash commands table with overview/review split
- CLAUDE.md: Updated slash commands table and installed components count
- COMMANDS.md: Added /karimo-overview section, updated /karimo-review section
- ARCHITECTURE.md: Updated directory structure and Human Oversight section
- status.md: Added cross-reference to /karimo-overview for oversight visibility

---

## [2.5.0] - 2026-02-21

### Added

**`/karimo-configure` Command**
- New standalone configuration command for creating or updating `.karimo/config.yaml`
- 5 configuration sections:
  - Project Identity: runtime, framework, package manager
  - Build Commands: build, lint, test, typecheck
  - File Boundaries: never-touch and require-review patterns
  - Execution Settings: default model, parallelism, pre-PR checks
  - Cost Controls: model escalation, max attempts, Greptile enabled
- Auto-detection from package.json and project structure (suggestions only, user confirms)
- Update mode when config already exists (shows current vs new values)
- `--reset` flag to start fresh and ignore existing config

**Install Script Updates**
- Copies `configure.md` command during installation
- Updated command count from 7 to 8

**Documentation**
- CLAUDE.md: Added configure to slash commands table and installed components
- README.md: Added configure to slash commands table and directory structure
- COMMANDS.md: Full documentation section with usage, config format, and examples
- GETTING-STARTED.md: Added "Configure Without Planning" section

---

## [2.4.0] - 2026-02-21

### Added

**`/karimo-doctor` Command**
- New diagnostic command to check KARIMO installation health
- 5 diagnostic checks (read-only, never modifies files):
  - Environment: Claude Code, GitHub CLI, Git version, Greptile API key
  - Installation integrity: 10 agents, 7 commands, 5 skills, 7 templates
  - Configuration validation: CLAUDE.md structure and schema
  - Configuration sanity: Commands exist, boundary patterns match files
  - Phase assessment: Current adoption phase and PRD status
- Clear status indicators: ✅ passed, ⚠️ warning, ❌ error, ℹ️ informational
- Actionable recommendations for each issue found
- Graceful handling for partial installations

**Install Script Updates**
- Copies `doctor.md` command during installation
- Updated command count from 6 to 7
- Added `/karimo-doctor` to CLAUDE.md template slash commands
- Updated next steps to recommend running doctor first after install

**Documentation**
- CLAUDE.md: Added doctor to slash commands table and installed components
- README.md: Added doctor to slash commands table and directory structure
- COMMANDS.md: Full documentation section with usage, checks, and output examples

---

## [2.3.0] - 2026-02-21

### Added

**Three-Tier Workflow System**
- Portable workflow architecture that observes CI instead of running commands
- Tier 1 (Always installed): `karimo-sync.yml`, `karimo-dependency-watch.yml`
- Tier 2 (Opt-in, default Y): `karimo-ci-integration.yml` — observes external CI
- Tier 3 (Opt-in, default N): `karimo-greptile-review.yml` — Greptile code review

**CI Integration Workflow**
- Hybrid CI detection: Check Runs API + Combined Status API
- Covers GitHub Actions, CircleCI, Jenkins, Travis, and other CI systems
- Self-excludes KARIMO workflows from detection
- Labels: `ci-passed`, `ci-failed`, `ci-skipped`
- 30-minute timeout with informational comments

**Greptile Review Workflow**
- Graceful degradation when no API key configured
- Informational comment explaining setup when skipped
- Labels: `greptile-passed`, `greptile-needs-revision`, `greptile-skipped`

**Install Script Prompts**
- Interactive tier selection during installation
- Tier 2 defaults to Y (CI integration recommended for most projects)
- Tier 3 defaults to N (requires Greptile API key)
- Workflow status tracked in CLAUDE.md Workflows section

**CLAUDE.md Workflows Section**
- New section showing installed workflow status
- Table format with tier indicator and installation status

### Changed

**Workflow Architecture Philosophy**
- KARIMO never runs build commands — observes external CI instead
- Enables portability across any CI system
- Removes coupling to specific build/lint/test commands

**Documentation Updates**
- ARCHITECTURE.md: Added three-tier system, label table, CI detection details
- SAFEGUARDS.md: Replaced workflow section with three-tier documentation
- GETTING-STARTED.md: Added installation prompt examples, troubleshooting
- README.md: Updated workflow section with tier indicators

### Removed

**Legacy Workflows**
- `karimo-integration.yml` — Replaced by CI observation model
- `karimo-review.yml` — Renamed to `karimo-greptile-review.yml` with improvements

---

## [2.2.1] - 2026-02-21

### Added

**DAG Schema Definition**
- `.karimo/templates/DAG_SCHEMA.md` — Canonical schema for `dag.json`
- Field definitions: nodes, edges, critical_path, parallel_groups
- Algorithm pseudocode for depth calculation (topological level via BFS)
- Algorithm pseudocode for parallel grouping (by depth value)
- Algorithm pseudocode for critical path (longest chain by task count)
- Immutability contract: dag.json is planning-only, runtime changes in status.json
- Validation rules and worked example walkthrough

### Changed

**Reviewer Agent (Section 4)**
- Added algorithm pseudocode after dag.json example
- References DAG_SCHEMA.md for full specification

**PM Agent (Step 1)**
- Added explicit dag.json format expectations
- Documented field semantics (depth, parallel_groups, critical_path)
- Documented immutability contract
- References DAG_SCHEMA.md for full specification

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
- Missing `/karimo-review` in CLAUDE.md template slash commands section

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

**Cross-PRD Review Dashboard (`/karimo-review`)**
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
- Updated COMMANDS.md with /karimo-review documentation
- Updated README.md with philosophy and design principles
- Updated CLAUDE.md with review dashboard command
- Updated CONTRIBUTING.md with full templates list

### Resolved Open Questions

1. **Cross-feature dependency resolution** — KARIMO does NOT manage cross-feature dependencies. Single-PRD scope is intentional. Human architects sequence PRDs.

2. **Greptile as hard gate** — Defined: score < 3 triggers revision, 3 attempts max, then hard gate. Model escalation after first failure.

3. **Urgent dependency criteria** — Refined into WITHIN-PRD, SCOPE-GAP, CROSS-FEATURE classification with resolution tracking.

---

## [Unreleased]

### Added

**Version Tracking & Update System**
- `.karimo/VERSION` file for tracking installed KARIMO version
- `.karimo/update.sh` — Diff-based update script with preview before applying
- Version display in install completion message
- "Updating KARIMO" section in GETTING-STARTED.md
- Update mention in README.md Quick Start section

**Uninstall Script**
- `.karimo/uninstall.sh` — Clean removal of all KARIMO components
- Removes: .karimo/, agents, commands, skills, rules, workflows, issue templates
- Strips KARIMO Framework section from CLAUDE.md
- Removes .worktrees/ entry from .gitignore
- Cleans up empty directories after removal
- Requires explicit "yes" confirmation before destructive operations

### Changed

**install.sh**
- Copies VERSION file during installation

**Dual Configuration Storage**
- Configuration stored in both `CLAUDE.md` sections and `.karimo/config.yaml`
- `/karimo-configure` writes to config.yaml and updates CLAUDE.md
- `/karimo-plan` auto-detects and populates CLAUDE.md sections
- Investigator agent context-scan mode for auto-detection on first run
- Investigator agent drift-check mode for subsequent runs

**Documentation Compression**
- Merged `SECURITY.md` + `CODE-INTEGRITY.md` → `SAFEGUARDS.md`
- Merged `GETTING-STARTED.md` + `INTEGRATING.md` → `GETTING-STARTED.md`
- Updated Greptile: optional → "optional but highly recommended"
- Simplified Phase 3 (Dashboard): "Coming soon" instead of feature lists
- Added "Your CI/CD Responsibility" section to SAFEGUARDS.md
- Added FAQ section to GETTING-STARTED.md

### Removed
- `CONFIG-REFERENCE.md` — no longer needed (config format in COMMANDS.md)
- `SECURITY.md` — merged into `SAFEGUARDS.md`
- `CODE-INTEGRITY.md` — merged into `SAFEGUARDS.md`
- `INTEGRATING.md` — merged into `GETTING-STARTED.md`
- `sandbox.safe_env` config option — Claude Code manages environment isolation

### Fixed

**Documentation Accuracy**
- CLAUDE.md block size: Updated "~20 lines" → "~65 lines" (actual count from install.sh)
- Uninstall instructions: Added missing task agent skills (karimo-code-standards, karimo-testing-standards, karimo-doc-standards)
- Files updated: ARCHITECTURE.md, GETTING-STARTED.md (3 locations), CHANGELOG.md

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
- Modular CLAUDE.md integration (~65 lines appended instead of ~210)
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

</details>

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
- **Commands**: `/karimo-plan`, `/karimo-execute`, `/karimo-status`, `/karimo-feedback`
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
3. **Use slash commands** — `/karimo-plan`, `/karimo-execute`, etc.
4. **Review PHASES.md** — Understand the new adoption system

The v1 codebase is archived at `/archive/v1/` for reference.
