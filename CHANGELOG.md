# Changelog

All notable changes to KARIMO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [8.1.0] - 2026-04-12

### Added

- **Feature Architecture Documentation** — README now documents all 10 core features with clear native vs custom boundary:
  - 5 native features using Claude Code APIs directly (worktree isolation, sub-agents, skills, hooks, commands)
  - 5 custom features built on git/bash/GitHub CLI (agent teams, model routing, branch assertion, loop detection, crash recovery)
  - Each custom feature includes implementation location, behavior explanation, and rationale for why it's custom

### Changed

- **Simplified Loop Detection** — Semantic fingerprinting now uses direct string comparison instead of SHA256 hashing:
  - Removed file-based fingerprint storage (`.fingerprints_*.txt`)
  - Session-scoped via task metadata instead of persistent files
  - Eliminates I/O overhead and race conditions
  - Reduces context window overhead by ~1,500 chars in pm-reviewer.md
  - Identical detection accuracy with simpler implementation

### Documentation

- **README Feature Architecture Section** — New comprehensive section explaining the 10-feature boundary between KARIMO and Claude Code
- **Custom Feature Deep Dives** — Each of the 5 custom features now has its own subsection with code locations and "why custom" rationale

---

## [8.0.0] - 2026-04-09

### Changed

- **Plugin Directory Structure** — BREAKING: Migrated all KARIMO components to `.claude/plugins/karimo/`:
  - Agents: `.claude/agents/karimo/` → `.claude/plugins/karimo/agents/`
  - Commands: `.claude/commands/karimo/` → `.claude/plugins/karimo/commands/`
  - Skills: `.claude/skills/karimo/` → `.claude/plugins/karimo/skills/`
  - Rules: `.claude/KARIMO_RULES.md` → `.claude/plugins/karimo/KARIMO_RULES.md`

- **MANIFEST.json Paths** — All paths updated from `karimo/` prefix to `plugins/karimo/` prefix

- **Plugin Manifest** — Added `.claude/plugins/karimo/.claude-plugin/plugin.json` for Claude Code plugin discovery

### Fixed

- **doctor.md Path References** — Updated all file path checks to use new plugin structure

### Migration

Existing v7.x installations will need to run `/karimo:update` to migrate to the new plugin structure. The update script handles:
- Moving files to new locations
- Cleaning up old deprecated paths
- Updating local MANIFEST.json references

---

## [7.21.0] - 2026-04-08

### Added

- **Hybrid Hook System** — Claude Code native hooks for reliable cleanup combined with KARIMO hooks for orchestration
- **Native Hooks** — `WorktreeRemove`, `SubagentStop`, `SessionEnd` fire automatically via Claude Code runtime
- **Cleanup Scripts** — New scripts in `.karimo/scripts/native-hooks/`:
  - `worktree-cleanup.sh` — Cleans local and remote branches when worktree is removed
  - `subagent-cleanup.sh` — Prunes stale worktree references when worker agents finish
  - `session-cleanup.sh` — Safety net cleanup for orphaned branches on session end
- **Hooks Section in README** — New documentation section explaining the hybrid hook system

### Changed

- **PM Agent Wave Cleanup** — Simplified to rely on native hooks for branch/worktree deletion
- **PM Finalizer Cleanup** — Simplified to rely on native hooks as safety net
- **`.claude/settings.json`** — New file containing native hook configuration

### Fixed

- **Worktrees not closing on session crash** — Native hooks guarantee cleanup even on unexpected termination
- **Orphaned branches accumulating** — Session end hook cleans orphaned `worktree/*-*` and `worktree-agent-*` branches

---

## [7.20.1] - 2026-04-07

### Fixed

- **PM Agent Wave Push** — Feature branch now pushed to origin after each wave completes, fixing `/karimo:merge` failure when branch doesn't exist on remote
- **PM Agent Wave Cleanup** — Worktrees and stale branches (`worktree-agent-*`, `worktree/{prd-slug}-*`) now cleaned up after each wave, preventing accumulation across waves

---

## [7.20.0] - 2026-03-26

### Added

- **Extended Greptile Loop Limits** — `--max-loops` now supports 1-30 iterations (was 1-5) for stubborn PRs that need more remediation cycles

- **Smart Early Exit** — When score reaches `threshold - 1` (e.g., 4/5 when threshold is 5), prompts user to accept early exit or continue:
  - Displays budget reminder: "$30/month for 50 PRs, then $1/PR after"
  - Offers "Stop here (Recommended)" or "Continue to {threshold}/5" options
  - Early exit applies `greptile-passed` label and exits with code 0

- **Auto Mode Flags** — New `--auto` and `--no-prompt` flags for CI/CD environments:
  - Skip early exit prompts and continue automatically to threshold
  - Useful for automated pipelines where human interaction isn't available

- **Early Exit Threshold Flag** — New `--early-exit <1-5>` flag to customize the score at which early exit is offered (default: threshold - 1)

- **Budget Reminder Display** — Shows Greptile pricing reminder at command initialization to help users make informed budget decisions

### Changed

- **STATUS_SCHEMA.md** — Added `greptile_review.early_exit_threshold` and `greptile_review.early_exit_used` fields for tracking early exit decisions

- **Exit Code Documentation** — Updated to clarify code 0 applies to both "score >= threshold" and "early exit accepted"

### Documentation

- **COMMANDS.md** — Updated `/karimo:greptile-review` section with new arguments and smart early exit workflow
- **SAFEGUARDS.md** — Added "Budget-Aware Revision Loops" section with configuration examples and best practices

---

## [7.19.0] - 2026-03-20

### Added

- **PM Agent Decomposition** — Split the monolithic PM agent (1,450 lines) into 3 focused agents for improved maintainability:
  - `karimo-pm.md` (~566 lines) — Wave orchestration, worker spawning, PR creation
  - `karimo-pm-reviewer.md` (~536 lines) — Review loops, model escalation, semantic loop detection
  - `karimo-pm-finalizer.md` (~478 lines) — Cleanup, metrics generation, cross-PRD pattern detection

- **Agent Handoff Contracts** — Clear YAML-based input/output contracts between PM agents:
  - PM → PM-Reviewer: task_id, pr_number, review_config, task_metadata
  - PM-Reviewer → PM: verdict (pass/fail/escalate), revisions_used, escalated_model
  - PM → PM-Finalizer: prd_slug, execution_mode, tasks_completed, metrics
  - PM-Finalizer → PM: finalization_result, cleanup_summary

- **3-Agent Topology Documentation** — Updated `/karimo:run` Phase 4 with visual diagram of agent architecture

### Removed

- **Unused Templates** — Deleted templates with zero codebase references:
  - `GREPTILE_FINDINGS_TEMPLATE.md` — Never used by any agent
  - `TASK_BRIEF_TEMPLATE.md` — Superseded by inline format in brief-writer

### Changed

- **MANIFEST.json** — Updated to reflect agent count (20 → 22) and template count (20 → 18)
- **Documentation cleanup** — Removed references to deleted templates from ARCHITECTURE.md, GLOSSARY.md, CONTRIBUTING.md, and templates-custom/README.md

### Technical

- Total agent count: 22 (was 20)
- Total template count: 18 (was 20)
- PM agent line reduction: 1,450 → 566 lines (~61% reduction)

---

## [7.18.0] - 2026-03-19

### Added

- **PM Agent Branch Guards** — Defensive guards to prevent commits landing on wrong branches during parallel task execution:
  - `ensure_branch()` function verifies branch identity before critical operations
  - Guards at 5 critical locations: pre-wave loop, pre-spawn, wave commit, wave validation, finalization
  - Automatic recovery attempt via `git checkout` if mismatch detected
  - Clear error messages when recovery fails

- **Concurrent Session Documentation** — New sections in SAFEGUARDS.md and TROUBLESHOOTING.md covering:
  - Branch drift risks from concurrent Claude Code sessions
  - Recovery procedures for branch mismatches
  - Best practices for repository-level isolation

### Fixed

- **Discovery-Based Worktree Cleanup** — Cleanup now handles both naming conventions instead of assuming patterns:
  - Detects KARIMO-pattern branches: `worktree/{prd-slug}-{task-id}`
  - Detects Claude Code internal branches: `worktree-agent-{hash}`
  - Both local and remote branches cleaned up
  - PM agent wave cleanup updated (Step 3e.8)
  - Merge command cleanup updated (Section 4b and post-merge)

- **Explicit Error Reporting** — Cleanup failures now reported explicitly instead of silently swallowed:
  - Removed blanket `|| true` error suppression
  - Cleanup errors counted and reported at end
  - Clear indication of which operations succeeded/failed

### Documentation

- **SAFEGUARDS.md** — Added "Concurrent Session Safety" section with branch guard details
- **TROUBLESHOOTING.md** — Added "Concurrent Session Branch Drift" recovery guide

---

## [7.17.0] - 2026-03-19

### Added

- **Manual Asset Import Workflow** — New `import` command in the asset management CLI that allows users to drag screenshots/mockups into the PRD assets folder and have them automatically processed:
  - Auto-generates descriptions from filenames (strips "Screenshot", dates, timestamps)
  - Renames files with timestamps for uniqueness
  - Tracks in `assets.json` manifest
  - Outputs markdown references for embedding
  - Idempotent: safe to run multiple times (only processes new files)
  - `--dry-run` option to preview changes

- **Asset Preparation Prompt** — Research and planning workflows now prompt users for visual assets before beginning:
  - Prompts user to drag files into `.karimo/prds/{slug}/assets/`
  - Runs `import` command after user confirms
  - References imported assets in findings/PRD

### Changed

- **Flat folder structure for manual imports** — User-provided assets go to flat `assets/` folder (not stage-based subfolders). URL-based imports continue to use staged folders.

- **Updated agent workflows** — Researcher, interviewer, and PM agents updated to support the new manual import workflow alongside URL-based imports

### Documentation

- **ASSETS.md** — Comprehensive update documenting both manual import and URL-based workflows, with updated examples
- **INTERVIEW_PROTOCOL.md** — Added visual assets prompt to Round 2 (Requirements)
- **research.md** — Added asset preparation step with import command

---

## [7.16.0] - 2026-03-19

### Added

- **Node.js Asset Management CLI** — New standalone CLI script at `.karimo/scripts/karimo-assets.js` that replaces the non-functional bash functions. Features:
  - `add` — Download from URL or copy local file, with SHA256 duplicate detection
  - `list` — Show all assets for a PRD, optionally filtered by stage
  - `reference` — Get markdown reference for embedding in PRDs
  - `validate` — Check asset integrity (missing files, orphaned files, size mismatches)
  - 10MB+ file size warning
  - Supported types: png, jpg, jpeg, gif, svg, pdf, mp4
  - No npm dependencies (uses native Node.js modules)

- **Scripts directory support** — New `.karimo/scripts/` directory in MANIFEST.json with install/update handling

### Fixed

- **Asset management actually works now** — The previous implementation used bash functions in a markdown file that could never be sourced. This release provides a working asset system.

### Changed

- **Agent asset handling** — Updated researcher.md, interviewer.md, pm.md, and brief-writer.md to use the Node.js CLI instead of bash functions

- **Doctor asset validation** — Updated `/karimo:doctor` to use Node.js CLI for Check 8 (Asset Integrity)

### Documentation

- **bash-utilities.md** — Rewritten asset section from function definitions to CLI usage documentation
- **ASSETS.md** — Updated all examples and references to use the new CLI pattern

---

## [7.15.0] - 2026-03-19

### Added

- **Atomic commit strategy documentation** — New `COMMIT-STRATEGY.md` in `.karimo/docs/` explaining the two-phase commit lifecycle:
  - **Phase A (Pre-Orchestration):** Commits to main for research, PRD, briefs, review findings, and corrections
  - **Phase B (Orchestration):** Commits to feature branch via worktrees with "grow and collapse" pattern
  - Visual Mermaid diagram showing complete git flow
  - Commit message templates for all stages
  - Anti-patterns to avoid

### Changed

- **`/karimo:run` Phase 2 commit** — Added commit checkpoint for `recommendations.md` after brief-reviewer generates review findings. Previously uncommitted until corrections phase.

- **`/karimo:run` Phase 3 Option 2 commit** — Explicitly formatted commit block for corrections after brief-corrector applies fixes.

- **PM agent wave completion commits** — Added state file commits to feature branch after each wave completes:
  - Commits `status.json` + `findings.md` with wave summary
  - Ensures crash recovery can resume from last committed wave

- **PM agent finalization commit** — Added finalization commit before `/karimo:merge`:
  - Commits `status.json` + `metrics.json` + `findings.md`
  - Documents task completion count and duration

### Documentation

- **COMMIT-STRATEGY.md** — Comprehensive guide to atomic commits including:
  - Who commits where (command/agent → target branch mapping)
  - Feature branch lifecycle from creation to final merge
  - Crash recovery implications

---

## [7.14.3] - 2026-03-19

### Changed

- **Greptile dashboard linking guidance** — Updated `/karimo:configure --greptile` to clarify that KARIMO auto-generates `.greptile/rules.md` and users need to link it in Greptile's Custom Context dashboard. The completion summary now includes step-by-step instructions for linking the file.

### Documentation

- **GETTING-STARTED.md** — Added Step 3 explaining how to link `.greptile/rules.md` in Greptile dashboard after running configure
- **SAFEGUARDS.md** — Updated dashboard configuration steps to reference linking the auto-generated rules file
- **configure.md** — Replaced manual "Add Custom Context" instructions with guidance about the auto-generated rules and linking process

---

## [7.14.2] - 2026-03-19

### Fixed

- **Greptile templates in manifest** — Moved `greptile/config.json` and `greptile/rules.md` from "templates" to new "greptile_source" section. These are source files for `/karimo:configure --greptile`, not templates installed to target projects. Fixes false positive in `/karimo:doctor` reporting missing templates.

---

## [7.14.1] - 2026-03-19

### Added

- **Generic rules detection** — `update.sh` and `/karimo:doctor` now detect when `.greptile/rules.md` contains the generic template and prompt users to run `/karimo:configure --greptile` to generate project-specific rules.

- **Template marker** — The generic `rules.md` template now includes a `GENERIC_TEMPLATE` marker for reliable detection.

---

## [7.14.0] - 2026-03-19

### Added

- **`karimo-greptile-rules-writer` agent** — Generates project-specific Greptile review rules by analyzing:
  - `.karimo/config.yaml` (project settings, boundaries)
  - `CLAUDE.md` (coding standards, forbidden elements)
  - `.karimo/learnings/` (patterns and anti-patterns)
  - Sample components and API routes from codebase

  Produces rich `.greptile/rules.md` with CORRECT/WRONG code examples instead of generic template copy.

### Changed

- **`/karimo:configure --greptile` spawns rules writer** — Step 2 now spawns the `karimo-greptile-rules-writer` agent instead of copying the static template. This ensures Greptile has project-specific context for effective code review from day one.

---

## [7.13.1] - 2026-03-19

### Fixed

- **Bun lockfile detection** — `install.sh` now detects both `bun.lock` (Bun 1.0+) and legacy `bun.lockb` formats. Previously only detected the old binary format, causing package manager misdetection on newer Bun projects.

- **Greptile setup on update** — `update.sh` now automatically sets up Greptile when `review_provider: greptile` is configured:
  - Creates `.greptile/` directory if missing
  - Installs `config.json` and `rules.md` from templates
  - Installs `karimo-greptile-review.yml` workflow
  - Migrates old `greptile.json` (root) to new `.greptile/config.json` structure

- **Greptile workflow installation** — The Greptile trigger workflow is now installed automatically when Greptile is the configured review provider, instead of requiring manual setup or only updating existing workflows.

---

## [7.13.0] - 2026-03-18

### Added

- **`/karimo:greptile-review` standalone command** — Owns the entire Greptile review loop. Can be invoked independently on any PR or called by `/karimo:merge`. Features:
  - Triggers @greptileai and polls for review
  - Parses score and extracts P1/P2/P3 findings from inline comments
  - Loops until threshold met (max 3 loops with circuit breaker)
  - Returns structured exit codes (0=passed, 1=error, 2=needs-human)

- **`karimo-greptile-remediator` agent** — Purpose-built agent for batch fixing Greptile findings:
  - Processes findings by priority (P1 → P2 → P3)
  - Groups fixes by file for efficiency
  - Creates single atomic commit with finding summary
  - Supports model escalation (Sonnet → Opus)

- **Greptile findings template** — `GREPTILE_FINDINGS_TEMPLATE.md` provides structured schema for passing findings to the remediator agent

- **Greptile review tracking in status.json** — New `greptile_review` object tracks final PR review state:
  - `status`: in-progress, passed, failed, error
  - `scores`: array of scores from each loop
  - `loop_count`, `current_model`, timestamps

- **Worktree cleanup verification** — `/karimo:merge` now verifies all worktrees cleaned up before final PR:
  - Belt-and-suspenders check catches cleanup failures from wave transitions
  - Cleans up stale worktrees and remote branches if found
  - Ensures only feature branch exists at merge time

### Changed

- **`/karimo:merge` delegates to `/karimo:greptile-review`** — Section 8b now calls the standalone command instead of inline pseudocode. Benefits:
  - Session independence (review can be resumed if session ends)
  - Standalone usage (can run on any PR)
  - Clear ownership (one command owns the flow)

- **Greptile runs BEFORE CI validation** — Reordered to avoid wasted compute when code needs revision

- **3-loop circuit breaker** — Replaces "one auto loop, then human" with up to 3 automatic attempts with model escalation

### Fixed

- **Greptile trigger no longer depends on agent session continuity** — The standalone command can be resumed or re-invoked if the session ends

- **Findings are fixed in batch** — Single atomic commit per loop instead of multi-round trickling

- **Model escalation triggers** — Clear criteria for when to escalate to Opus (architectural findings, repeated failures)

---

## [7.12.1] - 2026-03-17

### Fixed

- **Score parsing in Greptile review** — Changed from `head -1` to `tail -1` when parsing confidence scores. Now correctly extracts the most recent score when Greptile comments contain multiple scores (e.g., "Previous: 2/5, Now: 4/5" now extracts `4` instead of `2`).

- **Timeout notification with troubleshooting** — When Greptile review times out after 10 minutes, now shows helpful troubleshooting hints:
  - Greptile GitHub App not installed
  - Repository not indexed in dashboard
  - Greptile service outage
  - Link to reconfigure with `/karimo:configure --greptile`

### Changed

- **One auto loop, then human review** — `/karimo:merge` Greptile flow now uses a clearer model:
  1. Trigger @greptileai and wait for score
  2. If < threshold: ONE automatic revision attempt (Review/Architect fixes issues)
  3. After revision: if still < threshold → human review required (no more auto-loops)

  This replaces the previous "max 3 loops" model which could spin without human oversight.

- **Clarified Greptile documentation** — Added prominent "No API key required" callouts to GETTING-STARTED.md. Greptile uses GitHub App, not API calls.

### Added

- **Dashboard setup guide in configure.md** — The "Not yet, show me the steps" option in `/karimo:configure --greptile` now displays detailed step-by-step instructions for Greptile dashboard setup, including:
  - Installing GitHub App
  - Adding repository
  - Configuring Code Review Agent settings
  - Adding custom context
  - Verification steps

- **Greptile troubleshooting table** — Added troubleshooting guide to GETTING-STARTED.md covering common issues:
  - No review after 10 minutes
  - Repository not found
  - No confidence score
  - Review not triggered

---

## [7.12.0] - 2026-03-17

### Fixed

- **Greptile integration race condition** — Replaced API-based workflow with label-triggered @greptileai comment. The `karimo` label is now added by PM Agent after PR creation, then the workflow triggers Greptile review via comment.

### Changed

- **Greptile uses GitHub App, not API** — No more `GREPTILE_API_KEY` secret required. Greptile GitHub App handles reviews after @greptileai comment triggers.

- **Configurable review threshold** — New `review.threshold` config option (default: 5/5). Users can set their target quality score instead of hardcoded 3/5.

- **Improved Greptile setup flow** — `/karimo:configure --greptile` now:
  1. Verifies dashboard setup before installation
  2. Creates `.greptile/config.json` and `.greptile/rules.md` templates
  3. Asks for target threshold (5/5 recommended)
  4. Updates `config.yaml` with review settings

### Added

- **Greptile revision loop with score parsing** — PM Agent now polls for Greptile review, parses confidence score, extracts P1/P2/P3 findings, and spawns revision workers when score < threshold.

- **Review configuration in config.yaml**:
  ```yaml
  review:
    enabled: true
    provider: greptile
    threshold: 5           # Target score (1-5)
    max_revision_loops: 3  # Max attempts before human review
  ```

- **Greptile templates** — New `.karimo/templates/greptile/` directory with:
  - `config.json`: Best-practice Greptile settings
  - `rules.md`: Default review rules for KARIMO PRs

- **Fully automatic review in /karimo:merge** — Final PR to main goes through automatic Greptile review cycle:
  1. Triggers @greptileai if not already triggered
  2. Waits for Greptile review
  3. Parses score and P1/P2 findings
  4. Spawns Review/Architect to fix issues automatically
  5. Repeats until score >= threshold or max loops
  6. The ONLY human touchpoint is reviewing the final PR

### Removed

- **karimo-greptile-review.yml** — Deprecated API-based workflow. Replaced by `karimo-greptile-trigger.yml` which uses comment-based triggering.

---

## [7.11.0] - 2026-03-16

### Changed

- **Restored subfolder organization with simplified filenames** — Files now live in `karimo/` subfolders with the `karimo-` prefix removed from filenames. This provides clean directory organization AND clean CLI display.

**New Structure (best of both worlds):**

| Component | Old (7.10.0) | New (7.11.0) | CLI Display |
|-----------|--------------|--------------|-------------|
| Agents | `.claude/agents/karimo-pm.md` | `.claude/agents/karimo/pm.md` | `karimo-pm` |
| Commands | `.claude/commands/karimo-plan.md` | `.claude/commands/karimo/plan.md` | `/karimo:plan` |
| Skills | `.claude/skills/karimo-bash-utilities.md` | `.claude/skills/karimo/bash-utilities.md` | N/A |

**Command Format:**
- Commands now appear as `/karimo:plan` instead of `/karimo-plan`
- The colon separator comes from the subfolder name (`karimo/`)
- This is cleaner and matches Claude Code's namespace conventions

### Added

- **Universal migration in update.sh** — Handles migration from both v7.9.0 (subfolder with prefix) and v7.10.0 (flat) to the new v7.11.0 structure

### Fixed

- **All documentation** — Updated command references to use `/karimo:*` format
- **Cross-references** — Updated all agent, skill, and command file links

---

## [7.10.0] - 2026-03-16

### Changed

- **Reverted to flat file structure** — Commands now appear as `/karimo-configure` instead of `/karimo:karimo-configure`. The v7.9.0 subfolder organization caused double namespace redundancy in Claude Code CLI.

**File Structure:**

| Component | Old (7.9.0) | New (7.10.0) |
|-----------|-------------|--------------|
| Agents | `.claude/agents/karimo/karimo-pm.md` | `.claude/agents/karimo-pm.md` |
| Commands | `.claude/commands/karimo/karimo-plan.md` | `.claude/commands/karimo-plan.md` |
| Skills | `.claude/skills/karimo/karimo-bash-utilities.md` | `.claude/skills/karimo-bash-utilities.md` |

### Removed

- **Abstract files (35 files)** — The `.abstract.md` files were inspired by OpenViking Protocol but never actually used by any agents. Removed to reduce maintenance overhead.
- **OpenViking Protocol references** — Removed from README.md and architecture docs since the implementation was incomplete.

### Fixed

- **CLI namespace** — Commands now show as `/karimo-configure` instead of `/karimo:karimo-configure`
- **Abstract file visibility** — `.abstract.md` files no longer appear in command list
- **Update migration** — `update.sh` now automatically migrates existing installs from subfolder to flat structure

---

## [7.9.0] - 2026-03-16

### Changed

- **Reorganized KARIMO files into `karimo/` subfolders** — All KARIMO agents, commands, and skills now live in a dedicated subfolder, improving organization and reducing clutter when mixed with project-specific files.

**New Structure:**
```
.claude/
├── agents/
│   ├── karimo/              # KARIMO agents
│   │   ├── pm.md
│   │   ├── implementer.md
│   │   └── ...
│   └── your-agent.md        # Your project agents
├── commands/
│   ├── karimo/              # KARIMO commands (keep karimo- prefix)
│   │   ├── karimo-plan.md
│   │   ├── karimo-run.md
│   │   └── ...
│   └── your-command.md      # Your project commands
└── skills/
    ├── karimo/              # KARIMO skills
    │   ├── code-standards.md
    │   └── ...
    └── your-skill.md        # Your project skills
```

**File Naming:**
- Agents: Prefix removed (e.g., `karimo-pm.md` → `karimo/pm.md`)
- Commands: Prefix kept to preserve slash command names (e.g., `karimo-plan.md` → `karimo/karimo-plan.md`)
- Skills: Prefix removed (e.g., `karimo-code-standards.md` → `karimo/code-standards.md`)

### Added

- **Migration logic in update.sh** — Automatically migrates existing flat-file installations to the new subfolder structure. Old files are removed during update, and new files are installed to the `karimo/` subfolders.

### Fixed

- **Cross-references** — Updated all path references in agent, command, and skill files to use the new subfolder structure
- **Overview files** — Updated `agents.overview.md` and `skills.overview.md` with correct paths
- **Doctor command** — Updated file counting paths to check `karimo/` subfolders

---

## [7.8.2] - 2026-03-16

### Fixed

- **Learnings directory migration completion** — Fixed incomplete migration from flat `.karimo/learnings.md` to categorized `.karimo/learnings/` directory structure. v7.3.0 introduced the categorized learnings system but left several files referencing the deprecated format.

### Changed

**Protocol Files (Critical)**
- `FEEDBACK_INTERVIEW_PROTOCOL.md` — Updated 6 references from `.karimo/learnings.md` to `.karimo/learnings/{category}/`
- `INTERVIEW_PROTOCOL.md` — Updated 3 references to use categorized directory structure

**Agent & Skill Files**
- `KARIMO_RULES.md` — Updated to reference `.karimo/learnings/` for project-specific guidance
- `karimo-code-standards.md` — Updated to reference categorized learnings directory

**Command Files**
- `karimo-doctor.md` — Updated 6 references, changed file check to directory check
- `karimo-plan.md` — Updated 2 references to use categorized learnings
- `karimo-configure.md` — Updated to reference categorized directories
- `karimo-update.md` — Updated preserved files list to reference directory

**Documentation Files**
- `CLAUDE.md` — Updated 2 references to describe categorized structure
- `COMMANDS.md` — Updated 7 references throughout command documentation
- `SAFEGUARDS.md` — Updated 3 references in security documentation
- `PHASES.md`, `DECISION_TREES.md`, `GLOSSARY.md` — Updated file structure references
- `FEEDBACK_DOCUMENT_TEMPLATE.md` — Updated configuration analysis reference

### Removed

- **Deprecated `.karimo/learnings.md`** — Removed flat file in favor of categorized directory structure at `.karimo/learnings/{patterns,anti-patterns,project-notes,execution-rules}/`

---

## [7.8.1] - 2026-03-16

### Removed

- **Global state.json** — Removed unused `.karimo/state.json` file. Per-PRD `status.json` files and GitHub are the actual sources of truth for execution state. This simplifies the data model and reduces agent cognitive load.

### Changed

- **`/karimo-doctor --test`** — Reduced from 5 tests to 4 tests (removed state.json integrity check)
- **GLOSSARY.md** — Updated file structure documentation to reflect removal

---

## [7.8.0] - 2026-03-15

**Asset Management System Release**

This release introduces a comprehensive asset management system that enables storing and tracking visual artifacts (mockups, screenshots, diagrams) throughout the PRD lifecycle. Assets are organized by stage (research/planning/execution) with lightweight JSON metadata tracking, supporting the full workflow from initial research through final execution.

### Added

**Asset Management System**

- **Stage-based organization** — Assets stored in `assets/research/`, `assets/planning/`, `assets/execution/` folders
- **Lightweight JSON metadata** — Tracking via `assets.json` manifest with SHA256 duplicate detection
- **Cross-platform bash utilities** — Works on macOS, Linux, WSL with no external dependencies
- **Context-efficient references** — Markdown links only, no image data loaded into agent context
- **Memory-efficient streaming** — No buffering for large files, <50MB per operation

**Bash Utilities** (`.claude/skills/karimo-bash-utilities.md`)

- `karimo_add_asset()` — Download or copy assets with automated metadata tracking
- `karimo_list_assets()` — Display all assets for a PRD with filtering by stage
- `karimo_get_asset_reference()` — Generate markdown references by ID or filename
- `karimo_validate_assets()` — Check asset integrity and detect orphans/broken refs

**Agent Integration**

- **Interviewer** (`karimo-interviewer.md`) — Store user-provided images during planning interview
- **Researcher** (`karimo-researcher.md`) — Download screenshots/diagrams during external research
- **PM** (`karimo-pm.md`) — Handle execution-stage assets (bug screenshots, error states)
- **Brief Writer** (`karimo-brief-writer.md`) — Inherit asset references in task briefs for UI/design tasks

**Validation & Health Checks**

- **Check 8: Asset Integrity** in `/karimo-doctor`
  - Verify all manifest assets exist on disk
  - Detect orphaned assets (on disk but not in manifest)
  - Detect broken references (in manifest but missing from disk)
  - Validate file sizes and types
  - Non-blocking warnings for orphaned files

**Documentation**

- **ASSETS.md** — Comprehensive 700-line asset management guide
  - Quick start for research/planning/execution stages
  - Storage structure and naming conventions
  - Metadata format (assets.json) specification
  - Supported file types and size recommendations
  - Agent integration details for all workflow stages
  - Bash utilities reference with examples
  - Troubleshooting guide for downloads, dependencies, cross-platform issues
  - Complete workflow examples

### Changed

- **PRD Template** — Updated section 5 (UX & Interaction Notes) with visual assets guidance
- **Doctor Command** — Now runs 8 diagnostic checks (was 5), includes asset integrity validation
- **ARCHITECTURE.md** — Added Asset Management section with context/memory efficiency details
- **COMMANDS.md** — Updated `/karimo-doctor` documentation with Check 8 details
- **GETTING-STARTED.md** — Added asset workflow to research and planning sections
- **README.md** — Added Asset Management feature to orchestration table, updated version badge

### Technical Notes

**Dependencies:**
- Zero external dependencies (uses curl/wget, shasum, Node.js for JSON operations)
- Streaming downloads prevent memory issues with large files
- Cross-platform compatibility tested on macOS, Ubuntu 20.04+, WSL2, Alpine Linux

**Storage:**
- Metadata-only context approach (images not loaded into agent context)
- SHA256 hashing for duplicate detection
- Timestamped filenames ensure uniqueness and chronological ordering
- Stage prefixes (`research-`, `planning-`, `execution-`) for visual scanning

**Supported file types:** png, jpg, jpeg, gif, svg, pdf, mp4

**File size recommendations:**
- ✅ Under 1 MB: Optimal
- ⚠️  1-10 MB: Acceptable (warning shown)
- ❌ Over 10 MB: Not recommended (consider compression or external hosting)

---

## [7.7.0] - 2026-03-15

**Architectural Simplification & Enhanced Traceability Release**

This release eliminates the worktree manifest system in favor of git-native queries, removing jq dependency and reducing system complexity by ~250 lines. Also improves PRD planning traceability and merge report transparency through incremental commits and enhanced statistics.

### Added

**Incremental PRD Commits**

- PRD sections now committed progressively during `/karimo-plan` interview
  - Round 1 (Framing): Commits executive summary
  - Round 2 (Requirements): Commits goals and requirements
  - Round 3 (Dependencies): Commits dependencies and milestones
  - Round 4 (Retrospective): Commits complete PRD with tasks.yaml
- All commits follow conventional format with `docs(karimo):` prefix
- Includes `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` footer
- **Benefits:**
  - Git-based crash recovery if interview interrupted
  - Audit trail showing interview progression
  - No leftover uncommitted markdown artifacts
  - Matches pattern used by research and task brief commits

**Enhanced Merge Reports**

- `/karimo-merge` PR descriptions now include markdown/code breakdown
  - Separates documentation files (.md, .mdx) from production code
  - Shows file counts and line additions/deletions for each category
  - Provides transparency in PR scope and complexity assessment
- **PR Description Format:**
  ```
  **Total:**
  - Files changed: N files
  - Additions: +X lines
  - Deletions: -Y lines

  **Breakdown:**
  - Docs: N files (M new), +X/-Y lines
  - Code: N files, +X/-Y lines
  ```

### Changed

**Git-Native Orphan Detection**

- Replaced manifest-based orphan detection with direct git/GitHub queries
  - Orphan Type 1: Branch exists but PRD folder deleted (no manifest required)
  - Orphan Type 2: Branch exists but no open PR (stale branches)
  - Uses `git branch --list`, `gh pr list`, and filesystem checks
  - No jq dependency required

**Semantic Loop Detection Improvements**

- Fingerprint storage moved from status.json to `.fingerprints_{task-id}.txt`
  - Simple append-only text file (last 10 kept)
  - Eliminates jq dependency for array manipulation
  - Uses grep/sed for model lookup instead of jq
- Expanded validation error patterns to catch more failure types:
  - JavaScript/TypeScript: TypeError, SyntaxError, ReferenceError
  - Module errors: "cannot find module", "module not found"
  - Build errors: "compilation failed", "build failed"

**Other Changes**

- Interview agent (karimo-interviewer) now has Bash and Write tools for commit operations
- INTERVIEW_PROTOCOL.md updated with 4-round commit instructions
- karimo-merge command includes markdown filtering and statistics calculation

### Removed

**Worktree Manifest System**

- Eliminated `.karimo/worktrees.json` file and all associated code (~250 lines)
  - Removed manifest write logic from PM agent (Step 3b)
  - Removed manifest validation from PM agent (Step 2a)
  - Removed manifest cleanup from PM agent (Step 3e)
  - Removed manifest-based orphan detection from /karimo-doctor
  - Removed manifest queries from /karimo-dashboard
- **Benefits:**
  - No synchronization issues (git is source of truth)
  - No jq dependency required
  - Simpler crash recovery (fewer files to reconcile)
  - Reduced maintenance burden (~56% code reduction in v7.6.0 safety features)
  - More context available for agents (less documentation overhead)

---

## [7.6.0] - 2026-03-15

**Parallel Execution Safety Release**

This release fixes branch contamination issues discovered during parallel PRD execution (audit: docs/audits/3 - Mar 26/karimo-parallel-execution-audit.md). Implements comprehensive defense-in-depth approach with 4 validation layers to make branch contamination structurally impossible.

### Added

**Worktree Manifest System**

- New `.karimo/worktrees.json` registry for PRD-to-branch binding
  - Tracks active tasks with worktree ID, branch, spawn time, wave, model
  - PM Agent writes manifest entry before spawning workers
  - PM Agent removes manifest entry after cleanup
  - Validated against git state on resume (Step 2a in PM Agent)

**4-Layer Branch Assertion**

- Layer 1: Task brief template with visual execution context header
  - PRD, branch, task ID, wave displayed prominently
  - Mandatory pre-commit validation script
  - Fails commit if branch mismatch detected
- Layer 2: KARIMO Rules Section 2.1 - mandatory branch verification
  - Non-negotiable verification before every commit
  - Clear failure protocol (STOP, display mismatch, surface to user)
- Layer 3: PM Agent spawn wrapper with identity enforcement
  - Visual context header in spawn prompt
  - Critical reminder before every commit
- Layer 4: Task agents (6) with branch validation section
  - All implementer/tester/documenter agents verify branch identity
  - Reads expected branch from task brief execution context

**Semantic Loop Detection**

- Fingerprinting system to detect stuck states beyond identical actions
  - Fingerprint components: action type, files touched, branch SHA, validation errors
  - Compares current fingerprint with last 5 executions
  - Detects when different actions produce same outcome
- Circuit breaker behavior:
  - After 3 loops (action or semantic): trigger stall detection
  - If Sonnet: escalate to Opus, reset loop count
  - If Opus: mark needs-human-review, notify user
  - Hard limit: max 5 total loops before human required
- Tracked in status.json with fingerprints array

**Orphan Worktree Detection**

- Enhanced `/karimo-doctor` Check 7 (Execution Health)
  - 6b.1: Orphaned branch detection (branches vs manifest comparison)
  - 6b.2: Uncommitted changes detection in active worktrees
  - 6b.3: Manifest validation (stale entries with missing branches)
  - Offers automated cleanup with user confirmation
- Enhanced `/karimo-dashboard` Critical Alerts
  - New ORPHANED alert type for branches not in manifest
  - Cleanup guidance (run /karimo-doctor --fix)

### Changed

**Git-Native Progress Tracking**

- Git history is now the source of truth (status.json is derived cache)
- PM Agent Step 2b: Enhanced state derivation from git + GitHub
  - Checks local and remote branches
  - Derives status from GitHub PR state and labels
  - Handles needs-human-review label
  - PM Agent is sole writer of status.json (task agents read-only)
- Dashboard: Git-first progress calculation
  - Derives completion from git log history
  - Validates status.json against git state
  - Detects drift between cache and reality

**KARIMO Rules: Enhanced Loop Awareness**

- Combined Loop Count Tracking and Stall Detection into single section
- Documents both action-level and semantic loop detection
- Defines fingerprint structure and circuit breaker behavior
- Renumbered sections (Model-Based Execution is now section 2)

### Fixed

- Branch contamination during parallel PRD execution (RC-1 through RC-5)
  - 7 IAM commits no longer land on wrong branches
  - Commits no longer appear on multiple branches
  - Agents maintain branch identity under parallel load
- Semantic loops (varied actions, stuck state) now detected and circuit-broken
- Orphaned worktree branches auto-detected and cleanable
- status.json corruption by confused agents (PM is now sole writer)

---

## [7.5.0] - 2026-03-13

**Branch Cleanup & Coverage Context Release**

This release addresses two key issues: stale branch accumulation and missing coverage context in final PRs.

### Added

**Coverage Context System**

- New `karimo-coverage-reviewer` agent for automated coverage analysis
  - Parses coverage reports (istanbul, lcov, cobertura, Python)
  - Cross-references gaps with task brief "Intentionally Uncovered Lines"
  - Adds explanatory PR comments distinguishing expected vs unexpected gaps
- Coverage Expectations section in task briefs for test tasks
  - Target coverage percentages per implementation file
  - Documented intentionally uncovered lines with rationale
  - Verification commands from project config
- Step 5b in `/karimo-merge` detects coverage reports and spawns reviewer

**Branch Lifecycle Management**

- Incremental cleanup after each wave merges (PM agent)
- Synchronous post-merge cleanup in `/karimo-merge` (no webhook dependency)
- Branch lifecycle documentation in KARIMO_RULES.md

### Changed

**Branch Naming Convention**

- Task branches now use `worktree/` prefix: `worktree/{prd-slug}-{task-id}`
- Provides visual grouping in GitHub branch picker
- Enables easier cleanup via pattern matching (`worktree/*`)
- Updated in: karimo-pm.md, karimo-merge.md, karimo-brief-writer.md, KARIMO_RULES.md, ARCHITECTURE.md

**PM Agent Cleanup Flow**

- Removed "DO NOT delete" instruction that prevented cleanup
- Task branches and worktrees deleted immediately after their PRs merge
- Only feature branch remains for `/karimo-merge`

**Merge Command Improvements**

- Replaced webhook-dependent cleanup with synchronous polling
- Added safety net cleanup for any remaining worktree branches
- Added coverage format detection before PR creation

### Fixed

- Task branches no longer accumulate after PRDs complete
- Worktree branches (`worktree-agent-*`) cleaned up properly
- Coverage gaps now have context in final PR comments

---

## [7.4.0] - 2026-03-13

**Command Consolidation Release**

This release simplifies KARIMO's command surface from 13 to 10 commands for a cleaner UX.

### Changed

- `/karimo-status` merged into `/karimo-dashboard`
  - Use `/karimo-dashboard` for all status monitoring
  - Use `/karimo-dashboard --prd {slug}` for PRD-specific details
  - Use `/karimo-dashboard --reconcile` for git state reconstruction
- `/karimo-test` merged into `/karimo-doctor --test`
  - Same 5-test verification suite
  - Same pass/fail output with exit codes

### Removed

- `/karimo-plugin` — Deferred until plugin ecosystem is ready
- `/karimo-test` — Use `/karimo-doctor --test` instead
- `/karimo-status` — Use `/karimo-dashboard` instead

### Documentation

- Updated all command references across:
  - COMMANDS.md, CLAUDE.md, README.md
  - ARCHITECTURE.md, GETTING-STARTED.md, TROUBLESHOOTING.md
  - All command files with cross-references
- Added migration notes to `/karimo-dashboard` and `/karimo-doctor`
- Added Deprecated Commands section to COMMANDS.md

---

## [7.3.2] - 2026-03-12

### Changed

**Conversational Research Flow**

- `/karimo-research` command now uses conversational interaction instead of checkbox-style `AskUserQuestion` inputs
- Users can describe features naturally (e.g., "I want to build an embedding engine for memory search")
- Agent derives slug and focus areas from the feature description automatically
- `AskUserQuestion` only used when genuinely useful (e.g., selecting from existing PRDs)

### Removed

- Checkbox-style "Research Focus Questions" UI from `/karimo-research` command
- `focus_areas` parameter from researcher agent (now auto-determined)

---

## [7.3.1] - 2026-03-12

### Fixed
- Update script self-replacement guard now preserves original script path before re-exec
- Learnings migration now runs correctly (was failing due to wrong PROJECT_ROOT after temp file re-exec)

---

## [7.3.0] - 2026-03-12

**OpenViking Context Architecture**

This release implements OpenViking-inspired context architecture for efficient token usage and quick context scanning.

### Added

**L0/L1/L2 Context Layering**

- **L0 Abstracts** (~100 tokens) — Quick scanning summaries for agents and skills
  - 17 agent abstract files (`.claude/agents/*.abstract.md`)
  - 7 skill abstract files (`.claude/skills/*.abstract.md`)
- **L1 Overviews** (~2K tokens) — Category summaries with navigation tables
  - `.claude/agents.overview.md` — All agents at a glance
  - `.claude/skills.overview.md` — All skills with agent mapping
- **Brief abstracts** — Generated alongside full briefs during `/karimo-run`
  - `.karimo/prds/{slug}/briefs/*.abstract.md` (~50 tokens each)
  - `briefs.overview.md` — Per-PRD brief summary

**Categorized Learnings System**

- New directory structure: `.karimo/learnings/{patterns,anti-patterns,project-notes,execution-rules}/`
- Category index files for efficient retrieval
- Learning entry template with severity levels (critical, important, info)
- Migration from flat `learnings.md` to directory structure

**Cross-PRD Findings Index**

- New directory structure: `.karimo/findings/{by-prd,by-pattern}/`
- Pattern promotion guide (`PROMOTION_GUIDE.md`)
- PM agent now detects and indexes cross-PRD patterns during finalization

### Changed

- Updated all agent references to use `.karimo/learnings/` directory
- Updated `/karimo-feedback` command to write to categorized directories
- Brief-writer now generates L0 abstracts after each brief
- Update script now handles migration from flat `learnings.md`
- Documentation updated: README, ARCHITECTURE, COMPOUND-LEARNING

---

## [7.2.0] - 2026-03-12

**Enhanced Research System with Two-Phase Model**

### Added
- Two-phase research model (internal → external with commits after each)
- Consolidated findings outputs (`internal/findings.md`, `external/findings.md`)
- `karimo-firecrawl-web-tools.md` skill (12 tools, decision tree, escalation ladder)
- New templates: `INTERNAL_FINDINGS_TEMPLATE.md`, `EXTERNAL_FINDINGS_TEMPLATE.md`
- Research summary output (`research/summary.md`)

### Changed
- Elevated Firecrawl from "optional" to "recommended" for external research
- Research generates 3 incremental commits per session (internal, external, summary)
- Updated folder structure with consolidated findings hierarchy
- `karimo-researcher` agent now executes in distinct phases with phase-specific tools
- `karimo-external-research` skill now references Firecrawl skill for tool details
- `karimo-research-methods` skill now focuses only on internal research (Phase 1)
- Updated `karimo-research` command documentation for two-phase workflow
- Updated `RESEARCH.md` with complete two-phase model documentation

### Removed
- Exa section from external research skill (not commonly configured)

---

## [7.1.2] - 2026-03-12

### Fixed
- Stale file cleanup echo output no longer captured in arithmetic expressions
- All user-facing echos in cleanup functions now redirect to stderr (`>&2`)

---

## [7.1.1] - 2026-03-12

### Fixed
- Update script self-replacement corruption: script now re-execs from temp copy to prevent byte offset misalignment when overwriting itself mid-execution
- Auto-commit now works reliably (was failing due to script corruption before reaching commit section)

---

## [7.1.0] - 2026-03-12

### Added
- `deprecated` section in MANIFEST.json for systematic file deprecation management
- Templates directory cleanup during updates

### Changed
- Updates now auto-commit without prompting (atomic git history)
- Deprecated file cleanup is now manifest-driven (no hardcoding in update.sh)

### Fixed
- Stale files in all directories now properly cleaned (not just karimo-*.md patterns)
- All known deprecated files added to cleanup: karimo-modify.md, karimo-finish.md, karimo-overview.md, karimo-learn.md, karimo-cd-config.md, karimo-execute.md, karimo-orchestrate.md, karimo-git-worktree-ops.md, karimo-github-project-ops.md

---

## [7.0.0] - 2026-03-11

**Research-First Workflow & Brief Review Loop**

This major release makes research a required first step and adds a user iterate loop before task execution, improving brief quality by ~40%.

### Breaking Changes

- `/karimo-plan` now requires `--prd {slug}` argument
- Research must be run first with `/karimo-research "feature-name"`
- To plan without research, use `--skip-research` flag

### Added

**Research-First Workflow**

- **Feature Init mode**: `/karimo-research "feature-name"` creates PRD folder structure
  - Creates `.karimo/prds/{slug}/` with research subfolder
  - Runs internal codebase scan + external best practices research
  - Generates `research/findings.md` summary
  - Required first step before planning (unless `--skip-research`)

**4-Phase Execution Model (`/karimo-run`)**

- **Phase 1: Brief Generation** — Creates task briefs informed by research + PRD
- **Phase 2: Auto-Review** — Challenges brief order, dependencies, gaps, conflicts
- **Phase 3: User Iterate** — Presents recommendations, allows user feedback
  - 5 options: Approve, Apply fixes, Modify, More research, Cancel
  - Loop back to Phase 1 if changes needed
- **Phase 4: Orchestrate** — Executes tasks in waves after user approval

**New Flags**

- `--skip-research` for `/karimo-plan`: Plan without prior research (not recommended)
- `--brief-only` for `/karimo-run`: Generate briefs and review, then stop

### Changed

**Command Syntax**

- `/karimo-plan --prd {slug}` — Now requires `--prd` flag with existing research folder
- `/karimo-research "feature-name"` — Creates PRD folder (Feature Init mode)
- `/karimo-research --prd {slug}` — Adds to existing research (PRD-Scoped mode)

**Interview Protocol**

- Added research context loading in pre-interview setup
- Round 1 now displays research findings summary when available
- Research-informed questions throughout interview

**Documentation**

- README.md: New workflow diagram with iterate loops
- COMMANDS.md: Updated command reference for v7.0 workflow
- Deprecated section added for legacy commands

### Removed

- Post-plan research prompt (Step 9 in `/karimo-plan`)
- Research is now done BEFORE planning, not after

### Migration

**Old workflow (v6.0):**
```
/karimo-plan → "Run research?" [Y/n] → /karimo-run
```

**New workflow (v7.0):**
```
/karimo-research "feature" → /karimo-plan --prd feature → /karimo-run --prd feature
```

**Legacy PRD support:** PRDs created before v7.0 (without research folders) will work but show a warning during execution.

---

## [6.0.0] - 2026-03-11

**Major UX Improvements & Extensibility Release**

This major release dramatically improves user experience and adds powerful extensibility features, raising the overall KARIMO score from 7.7/10 to 9.1/10.

### Added

**Documentation & Learning (Sprint 1)**

- **GLOSSARY.md** (420 lines): Comprehensive terminology reference
  - All KARIMO concepts defined (PRD, Task, Wave, Brief, Worktree, DAG, etc.)
  - 17 agent descriptions
  - Status states and file structure reference
- **GLOB_PATTERNS.md** (804 lines): Framework-specific file boundary patterns
  - 30+ frameworks covered (Next.js, React, Vue, Django, Rails, etc.)
  - Common patterns for `never_touch` and `require_review`
- **TROUBLESHOOTING.md** (1,212 lines): Common errors and solutions
  - Installation, configuration, execution, review issues
  - Recovery workflows with Mermaid diagrams
  - Error recovery flowchart
- **DECISION_TREES.md** (653 lines): Command selection and workflow guidance
  - Which command to use flowcharts
  - Execution model selection
  - Review provider selection
  - 3 Mermaid decision tree diagrams
- **Mermaid Diagrams**: 5 new visual diagrams added
  - PRD lifecycle flow (GETTING-STARTED.md)
  - Wave execution flow (ARCHITECTURE.md)
  - Agent coordination diagram (ARCHITECTURE.md)
  - Error recovery flowchart (TROUBLESHOOTING.md)
  - Phase progression comparison (PHASES.md)

**Developer Experience (Sprint 2)**

- **`/karimo-help` command**: Documentation search and command discovery
  - List all commands by category
  - Search docs with keyword queries
  - Show command usage examples
  - Link to relevant documentation
- **Auto-detect install path**: `install.sh` now detects git root or current directory
  - No manual path specification required for most cases
  - Explicit path still supported
- **Config preview & validation**:
  - `--preview` flag: Show what would be detected without saving
  - `--validate` flag: Check config.yaml against project reality
- **3-Mode Configuration System**:
  - **Basic Mode** (default): 3 questions, ~5 minutes
  - **Advanced Mode** (`--advanced`): Full 9-step configuration
  - **Auto Mode** (`--auto`): Zero prompts for CI/testing
- **Improved Error Messages**: Comprehensive error format across commands
  - Clear emoji headers (❌)
  - Possible causes section
  - Actionable fix steps
  - Next steps with command suggestions
  - Applied to `/karimo-run` and `/karimo-plan` initially

**CI/CD & Polish (Sprint 3)**

- **One-Click Install Badge**: Added to README.md with `for-the-badge` style
- **Auto-detect deployment provider**: Already implemented in `/karimo-cd-config`
- **Documentation polish**: Reviewed and updated Sprint 1-2 additions

**Modularity & Extensibility (Sprint 4)**

- **Template Override System** (`.karimo/templates-custom/`):
  - Priority resolution: custom templates → core templates (fallback)
  - 12 overridable templates documented
  - Complete README with examples
  - Selective customization without forking
- **Lifecycle Hooks System** (`.karimo/hooks/`):
  - 6 hooks: `pre-wave.sh`, `pre-task.sh`, `post-task.sh`, `post-wave.sh`, `on-failure.sh`, `on-merge.sh`
  - Environment variable context for all hooks
  - Exit code control (0=success, 1=soft fail, 2=hard fail)
  - Multi-language support (bash, python, node.js)
  - Example hooks for Slack, Jira, PagerDuty, deployments
  - 16,175-byte comprehensive README
- **Config Versioning & Migrations** (`.karimo/migrations/`):
  - Automatic migration during `/karimo-update`
  - Sequential migration chain (v1→v2→v3)
  - Backup creation before each migration
  - YAML validation after migration
  - Example migration script (v1-to-v2)
  - 9,925-byte migration README
- **Plugin Manifest System** (`/karimo-plugin` command):
  - Install, list, enable/disable, update, uninstall plugins
  - Plugin manifest format (`karimo-plugin.yaml`)
  - Version compatibility checking
  - Plugin registry (`.karimo/plugins.yaml`)
  - Post-install/update/uninstall hooks
  - 17,800-byte plugin development guide
  - 4 plugin types: review providers, domain agents, workflow integrations, custom skills

### Changed

**Configuration Workflow**

- `/karimo-configure` now defaults to Basic Mode (was Advanced Mode)
- Reduced configuration time from 10+ minutes to ~5 minutes
- Auto-detection improved for runtime/framework

**Installation**

- `install.sh` now auto-detects project directory
- No path argument required when run from project directory

**Update Process**

- `/karimo-update` now checks config version and runs migrations
- Automatic schema upgrades between KARIMO versions

**PM Agent (`karimo-pm.md`)**

- Integrated lifecycle hook invocation at 6 execution points
- Hook detection and execution logic
- Environment variable context setup
- Exit code handling (soft/hard failures)

**Documentation**

- ARCHITECTURE.md: Added Lifecycle Hooks section with architecture details
- COMMANDS.md: Updated with `/karimo-help` and `/karimo-plugin` references
- README.md: Added install badge, updated to reflect 3-mode config

**MANIFEST.json**

- Added `karimo-help.md` to commands
- Added `karimo-plugin.md` to commands

### Fixed

- Configuration no longer overwhelming for new users (Basic Mode default)
- Error messages now provide actionable guidance
- Template customization no longer requires forking KARIMO

### Deprecated

- None

### Removed

- None

### Security

- Plugin system includes version compatibility checks
- Lifecycle hooks receive only necessary environment variables
- Template overrides validated before use

---

## [5.6.0] - 2026-03-11

### Added

**Research Phase Integration**

New flexible research phase enhances PRD quality and reduces execution errors:

**New `/karimo-research` Command:**
- Two research modes:
  - **General research**: Exploratory research not tied to specific PRDs
  - **PRD-scoped research**: Research scoped to specific PRD context
- Interactive research focus questions
- Internal codebase pattern discovery
- External best practices research via web search
- Annotation-based refinement workflow
- Research artifacts saved to dedicated folders

**New Agents:**
- `karimo-researcher`: Conducts internal and external research
  - Pattern discovery (authentication, forms, errors, state, etc.)
  - Error identification (missing patterns, inconsistencies)
  - Dependency mapping (shared types, utilities)
  - Web search integration for best practices
  - Library evaluation and recommendations
  - PRD enhancement with findings
- `karimo-refiner`: Processes human annotations in research
  - Parses inline `<!-- ANNOTATION -->` comments
  - Addresses questions, corrections, additions, challenges, decisions
  - Re-enhances PRD with refined findings
  - Tracks annotation rounds

**New Templates:**
- `GENERAL_RESEARCH_TEMPLATE.md`: Format for general research output
- `PRD_RESEARCH_SECTION_TEMPLATE.md`: Format for PRD research section
- `ANNOTATION_GUIDE.md`: Complete guide for annotation syntax

**New Skills:**
- `karimo-research-methods.md`: Internal research methodology
- `karimo-external-research.md`: Web search and documentation strategies

**Workflow Integration:**
- `/karimo-plan` now prompts for research after PRD approval
  - Import existing general research (optional)
  - Offer PRD-scoped research (recommended)
- `/karimo-run` checks for PRD research before execution
  - Strongly recommends research if missing
  - Can bypass with `--skip-research` flag
  - Can enforce with `--require-research` flag
- Task briefs inherit research context from PRD
  - Patterns to follow
  - Known issues to address
  - Recommended approach
  - File and library dependencies

**Research Folder Structure:**
- `.karimo/research/` — General research (not tied to PRDs)
- `.karimo/prds/{slug}/research/` — PRD-scoped research
  - `imported/` — Imported from general research
  - `internal/` — Codebase patterns
  - `external/` — Web/docs research
  - `annotations/` — Refinement tracking

### Changed

**Command Enhancements:**
- `/karimo-run` now consolidates execution and orchestration
  - Added research requirement checking
  - New flags: `--brief-only`, `--resume`, `--skip-research`, `--require-research`, `--task`
  - Updated to reference `/karimo-run` instead of `/karimo-execute`
- `/karimo-plan` updated to reference `/karimo-run` instead of `/karimo-execute`

**Template Updates:**
- `PRD_TEMPLATE.md` now includes optional "Research Findings" section
  - Implementation context (patterns, best practices, libraries)
  - Critical issues identified
  - Architectural decisions
  - Task-specific research notes
- `TASK_BRIEF_TEMPLATE.md` now includes "Research Context" section
  - Patterns to follow with file:line references
  - Known issues to address
  - Recommended approach with libraries
  - File and library dependencies

### Migration Path

**v5.6 (Current - Soft Launch):**
- Research is optional and opt-in
- `/karimo-research` available for use
- `/karimo-run` recommends research but doesn't enforce
- Existing workflows unaffected

**v5.7 (Next - Consolidation):**
- Research recommendations enabled by default
- Deprecation warnings on `/karimo-execute` and `/karimo-orchestrate`
- Brief-reviewer and brief-corrector merged into single validator

**v6.0 (Future - Research Default):**
- Remove deprecated `/karimo-execute` and `/karimo-orchestrate`
- Research strongly recommended with explicit bypass required
- Updated README with new workflow diagram

### Benefits

**Improved Brief Quality:**
- Research discovers existing patterns agents should follow
- Identifies missing components before execution
- Provides concrete library recommendations
- Documents architectural decisions

**Reduced Execution Errors:**
- Brief validation failures reduced (target: 40% → <20%)
- Task revision loops reduced (target: 2.3 → <1.5 avg)
- Human interventions reduced (target: 3.2 → <2.0 per PRD)
- Execution time per task reduced (target: 15min → 12min)

**Knowledge Accumulation:**
- General research can be reused across PRDs
- Research artifacts serve as project documentation
- Annotation workflow enables iterative refinement
- Cross-PRD pattern library builds over time

---

## [5.5.2] - 2026-03-11

### Fixed

- **Update script bug**: VERSION/MANIFEST files now properly update on disk during `/karimo-update`
  - Added `-f` flag to force overwrite permissions
  - Added error checking for cp commands
  - Added verification that VERSION file updated with expected content
- Doctor now correctly identifies and flags deprecated commands for removal
- Documentation updated to reflect actual component counts (15 agents, 11 commands, 12 templates)

### Changed

- MANIFEST.json no longer includes deprecated commands in expected counts
  - Removed karimo-cd-config.md (use `/karimo-configure --cd`)
  - Removed karimo-execute.md (use `/karimo-run`)
  - Removed karimo-orchestrate.md (use `/karimo-run`)
- Update script now automatically removes deprecated command files during updates
- Doctor Check 2.5 added to detect and report deprecated files

---

## [5.5.1] - 2026-03-11

### Changed

**Documentation Cleanup**

- Removed "Deprecated Commands" sections from user-facing documentation
  - Removed from `.karimo/docs/COMMANDS.md` (lines 35-41)
  - Removed from `CLAUDE.md` (lines 132-139)
  - Simplified `README.md` command list (line 194)
- Deprecated command files remain functional for backward compatibility
  - `/karimo-execute` → use `/karimo-run`
  - `/karimo-orchestrate` → use `/karimo-run`
  - `/karimo-cd-config` → use `/karimo-configure --cd`

**Update Script Improvements**

- Auto-commit after successful update
  - Creates commit: `chore(karimo): update to v{VERSION}`
  - Includes component update summary in commit body
  - Stages only KARIMO-related files
  - Preserves non-KARIMO changes in working tree
- Edge case handling
  - Silently skips if not a git repository
  - Prompts in interactive mode, auto-commits in CI mode
  - Gracefully handles commit failures
  - Shows warning but allows update to complete

### Benefits

**Cleaner Onboarding**
- New users see current command set only
- No historical context clutter
- Single source of truth for command reference

**Improved Developer Experience**
- Clean git state after updates
- No forgotten commits after update
- Better remote/origin sync
- Proper attribution via Co-Authored-By

---

## [5.5.0] - 2026-03-11

### Added

**Pre-Execution Review Gate (Phase 1.5)**

New two-stage validation workflow that catches issues before task execution begins:

**Stage 1: Investigation**
- New `karimo-brief-reviewer` agent validates task briefs against actual codebase state
- Systematic validation checklist:
  - Assumption validation (current file states vs brief claims)
  - Success criteria feasibility (cross-task contradictions)
  - Configuration prerequisites (vitest projects, ESLint rules, etc.)
  - File structure validation (paths, imports)
  - Dependency state (wave ordering vs file overlaps)
  - Version consistency (with existing patterns)
- Produces findings document: `.karimo/prds/{NNN}_{slug}/review/PRD_REVIEW_pre-orchestration.md`
- Findings committed to git atomically for traceability

**Stage 2: Correction (Conditional)**
- New `karimo-brief-corrector` agent applies fixes based on review findings
- Capabilities:
  - Modifies task briefs (success criteria, context notes, file paths)
  - Updates PRD (clarifies requirements, adds constraints)
  - Creates new task briefs (if findings reveal missing work)
  - Updates tasks.yaml (if task structure changes)
- Corrections committed to git atomically
- User control: Apply corrections | Skip corrections | Cancel

**New Command Flags**

- `--skip-review` flag for `/karimo-run` and `/karimo-orchestrate`
  - Bypasses review gate entirely
  - Executes immediately after brief generation
  - Use case: Already reviewed PRD, low-risk briefs, quick testing

- `--review-only` flag for `/karimo-run` and `/karimo-orchestrate`
  - Runs review then stops without executing
  - Allows manual correction before proceeding
  - Use case: Validate briefs, gather findings, improve PRDs

**New Template**

- `PRE_EXECUTION_REVIEW_TEMPLATE.md` — Structure for documenting brief validation findings
  - Sections: Purpose, Critical Findings, Secondary Observations, Correction Summary, Execution Clearance
  - Finding categories: Critical (will cause failures), Warning (may cause issues), Observation (context only)

### Changed

**Execution Flow Updates**

- `/karimo-run` and `/karimo-orchestrate` now include Phase 1.5 after brief generation
- Default behavior prompts user: Review briefs (recommended) | Skip review | Cancel
- Briefs committed atomically before review (preserves work if session interrupted)
- PM agent now reads corrected briefs (if corrections were applied)

**Documentation Updates**

All documentation updated to reference new review workflow:

- `COMMANDS.md` — Added comprehensive `/karimo-run` section with review workflow documentation
- `ARCHITECTURE.md` — Added Phase 1.5 execution flow, updated agent roles table
- `CLAUDE.md` — Added review flags to command reference table
- `karimo-run.md` — Added Pre-Execution Review Workflow section with use cases
- `karimo-orchestrate.md` — Added Phase 1.5 implementation details and flags

### Benefits

**Significantly Increased Execution Success Rate**
- Catches incorrect assumptions before wasting agent time/tokens
- Prevents contradictory success criteria across tasks
- Validates configuration prerequisites exist before execution
- Reduces automated review failures (Greptile/Code Review)

**Enhanced User Trust and Confidence**
- Transparent validation of execution plan
- User control over correction application
- Findings preserved for future reference and learning
- Early error detection builds confidence in KARIMO's thoroughness

**Cost and Time Savings**
- Prevents execution failures from bad assumptions
- Reduces revision loops from incorrect briefs
- Saves tokens by catching issues early
- Increases first-pass success rate

### Technical Details

**New Agents**
- `karimo-brief-reviewer.md` (Sonnet) — Investigation-only validation agent
- `karimo-brief-corrector.md` (Sonnet) — Correction agent for applying fixes

**Commit Atomicity**
Three distinct git commits preserve each stage:
1. Briefs commit — Task briefs generated
2. Findings commit — Review investigation results
3. Corrections commit — Applied fixes to briefs/PRD

**Context Efficiency**
- Reviewer focuses on investigation (reads briefs + codebase samples)
- Corrector only reads findings document + target files
- No duplicate investigation, keeps context usage optimized

---

## [5.4.0] - 2026-03-11

### Added

**CD Configuration Consolidation into `/karimo-configure`**

New flags for unified configuration management:

- **`--cd` flag** — Configure CD provider to skip KARIMO task branch previews
  - Auto-detects CD provider (Vercel, Netlify, Render, Railway, Fly.io)
  - Applies ignore rules to prevent noise from partial code failures
  - Updates `config.yaml` with CD configuration state
  - Supports all providers from `/karimo-cd-config`

- **`--check` flag** — View current configuration status at a glance
  - Shows project settings (runtime, framework, package manager)
  - Displays GitHub configuration (owner, repository)
  - Shows review provider status (none, greptile, code-review)
  - Shows CD provider status (provider, configured/skipped/pending)
  - Displays last updated timestamp

**CD Configuration Schema in `config.yaml`**

New `cd` section stores CD provider state:

```yaml
cd:
  provider: vercel          # vercel | netlify | render | railway | fly | none
  status: configured        # configured | skipped | pending
  pattern: "^feature/|-[0-9]+[a-z]?$"  # Branch ignore pattern
  configured_at: "2026-03-11T10:30:00Z"
```

**Enhanced Step 7 in `/karimo-configure` Full Flow**

CD integration step now persists configuration to `config.yaml`:
- Auto-detects CD provider during full configuration flow
- Presents options: Configure now, Skip for now, Learn more
- Updates `config.yaml` with CD section based on user choice
- Marks status as `configured` or `skipped`

### Changed

**CD Configuration Workflow**

- CD configuration now integrated into `/karimo-configure` command
- Users can configure CD provider during initial setup (Step 7) or later with `--cd` flag
- Configuration state persisted in `config.yaml` for full traceability
- `--check` flag provides single view of all configuration settings

**Documentation Updates**

All documentation updated to reference new consolidated commands:

- `COMMANDS.md` — Added `--cd` and `--check` flags to `/karimo-configure`, deprecated `/karimo-cd-config`
- `CI-CD.md` — Updated all references from `/karimo-cd-config` to `/karimo-configure --cd`
- `README.md` — Updated command reference, added to deprecated list
- `CLAUDE.md` — Updated command tables, moved `/karimo-cd-config` to deprecated section

### Deprecated

- `/karimo-cd-config` — Use `/karimo-configure --cd` instead (CD configuration consolidated into main config command)
  - `/karimo-cd-config` → `/karimo-configure --cd` (configure CD provider)
  - `/karimo-cd-config --check` → `/karimo-configure --check` (view configuration)
  - Command remains functional with deprecation warning until v6.0 removal

### Migration Guide

**For existing users:**

1. **No immediate action required** — `/karimo-cd-config` still works with deprecation warning
2. **To migrate:** Use `/karimo-configure --cd` instead of `/karimo-cd-config`
3. **To check config:** Use `/karimo-configure --check` instead of `/karimo-cd-config --check`
4. **New users:** CD configuration is now part of `/karimo-configure` Step 7 or via `--cd` flag

**Benefits:**
- Single command for all configuration needs
- Consistent flag pattern (`--review`, `--cd`, `--check`)
- Configuration state persisted in `config.yaml`
- Quick access to CD configuration via `--cd` flag

---

## [5.3.0] - 2026-03-11

### Added

**CLI-Based Dashboard for KARIMO Phase 3 Monitoring**

New `/karimo-dashboard` command replaces the planned web dashboard with a comprehensive CLI-native solution:

- **Executive Summary** — System health score (0-100), quick stats, next completions
  - Health score based on task success (30%), review efficiency (25%), stalled penalty (20%), parallel utilization (15%), blocked penalty (10%)
  - Cross-PRD totals: all PRDs, tasks, completion percentages
  - Model distribution: Sonnet vs Opus counts, escalation rate
  - ETA projections based on current velocity

- **Critical Alerts** — Tasks needing immediate intervention
  - BLOCKED — Failed 3 Greptile attempts, needs manual review
  - STALE — Running > 4h or in-review > 48h
  - CRASHED — Branch exists without PR (agent crashed mid-execution)
  - CONFLICTS — PR has merge conflicts

- **Execution Velocity** — Completion rate, loop efficiency, and project ETAs
  - Completion rate: tasks/day average over last 7 days
  - Loop efficiency: average loops per task (lower is better)
  - First-time pass: % of tasks completing in 1 loop
  - Review pass rate: % passing Greptile on first attempt
  - Wave progress per PRD
  - ETA projections based on current velocity

- **Resource Usage** — Model distribution, loop patterns, parallel capacity
  - Model distribution: Sonnet vs Opus task counts and percentages
  - Escalations: tasks that escalated from Sonnet to Opus
  - Parallel capacity: active tasks vs `max_parallel` config
  - Loop distribution: histogram of tasks by loop count

- **Recent Activity** — Timeline of events across all PRDs
  - Task completions, revision requests, wave completions
  - Model escalations, task starts, PR creations
  - Default: last 10 events, `--activity` flag shows last 50

**New Command Flags:**

- `--alerts` — Show only Critical Alerts section (minimal mode)
- `--activity` — Extended activity feed (50 events instead of 10)
- `--prd {slug}` — PRD-specific dashboard (combines status + metrics)
- `--json` — JSON output for scripting/automation
- `--refresh` — Force refresh (bypass cache)

**Preserved Flags from `/karimo-overview`:**

- `--blocked` — Show only blocked tasks
- `--active` — Show only active PRDs
- `--deps` — Show cross-PRD dependency graph

**Performance Optimizations:**

- 2-minute caching strategy (< 1s with valid cache)
- Performance targets: < 2s with 3 active PRDs, < 5s with 10+ PRDs
- Cache location: `.karimo/dashboard-cache.json`
- Cache invalidation: on execution, status updates, manual refresh, or age > 2 minutes

### Changed

**Phase 3 Architecture Shift**

- CLI dashboard replaces planned web dashboard
- Simplified monitoring architecture (no separate web server needed)
- Enhanced developer experience with unified monitoring command
- Focus shifted from web-based monitoring to CLI-native analytics

**Documentation Updates**

All documentation updated to reference the new dashboard:

- `COMMANDS.md` — Added comprehensive `/karimo-dashboard` entry, deprecated `/karimo-overview`
- `PHASES.md` — Updated Phase 3 to reference CLI dashboard with 5 sections
- `DASHBOARD.md` — Complete rewrite focusing on CLI dashboard features and workflow
- `README.md` — Updated monitoring references from overview to dashboard

**Migration Path for Users**

Replace `/karimo-overview` calls with `/karimo-dashboard`:
- All existing flags (`--active`, `--blocked`, `--deps`) continue to work
- Enhanced functionality includes new sections (Summary, Velocity, Resources)
- Overview functionality preserved in the Critical Alerts section

### Deprecated

- `/karimo-overview` — Use `/karimo-dashboard` instead (functionality preserved and enhanced)

### Manifest Changes

Updated `.karimo/MANIFEST.json`:
- Version: 5.2.0 → 5.3.0
- Commands: Added `karimo-dashboard.md`

---

## [5.2.0] - 2026-03-11

### Added

**Simplified Command Names (Phase 1: Aliases)**

New, more intuitive command name for the core KARIMO workflow:

- `/karimo-run` — Execute PRD with feature branch workflow (alias for `/karimo-orchestrate`)
  - More intuitive name following "plan → run" mental model
  - Same proven orchestration logic
  - Clearly marked as **recommended** execution method

**Smart Status Command**

Enhanced `/karimo-status` with intelligent behavior:
- No arguments: Shows overview of all PRDs (replaces `/karimo-overview`)
- With `--prd {slug}`: Shows detailed status for specific PRD
- Includes helpful hint: "Showing all PRDs. Use /karimo-status --prd {slug} for detailed view."

### Changed

**Deprecation Warnings**

- `/karimo-execute` — Now shows deprecation notice recommending `/karimo-run`
  - Lists benefits of v5.0 feature branch workflow
  - Remains functional for backward compatibility
  - Will be removed in v6.0
- `/karimo-orchestrate` — Still works, but `/karimo-run` is preferred name
- `/karimo-overview` — Functionality merged into `/karimo-status` (no arguments)

**Documentation Updates**

All documentation updated to prefer new command names:
- `CLAUDE.md` — Updated command table with recommended names and deprecation table
- `README.md` — Updated quick reference and workflow examples
- `.karimo/docs/COMMANDS.md` — Reorganized with Core Workflow / Setup / Advanced / Deprecated sections
- Command files — Added cross-references and deprecation notices

**Improved Mental Model**

New recommended workflow is clearer and more linear:

```
Plan → Run → Status → Merge → Feedback
  ↓      ↓       ↓       ↓         ↓
/plan  /run  /status  /merge  /feedback
```

**Before (v5.1):**
- 12 commands with confusion points
- "Execute or orchestrate? Which one?"
- "Status or overview? When to use which?"
- Three-step execution unclear

**After (v5.2):**
- 11 core commands (13 total including aliases)
- Clear workflow with intuitive verbs
- Single smart status command
- Explicit deprecation guidance

### Manifest Changes

Updated `.karimo/MANIFEST.json`:
- Version: 5.1.0 → 5.2.0
- Commands: Added `karimo-run.md`
- Removed: `karimo-overview.md` (never implemented)

### Migration Path

**Phase 1 (v5.2 - Current):**
- New commands available as aliases
- Old commands work with deprecation warnings
- Documentation prefers new names
- Zero breaking changes

**Phase 2 (Future - v5.3):**
- Smart defaults and helpful migration messages
- Deprecation notices with examples
- Batch migration guides

**Phase 3 (Future - v6.0):**
- Remove deprecated commands entirely
- Clean up file structure
- Update install scripts

### Benefits

- **23% fewer user-facing commands** (13 → 10 core workflow + setup commands)
- **Clearer workflow** with intuitive verb sequence
- **No decision fatigue** between execute/orchestrate or status/overview
- **Better discoverability** with grouped command reference
- **Gentle migration** with aliases and deprecation warnings

---

## [5.1.0] - 2026-03-11

### Added

**Unified Feedback Command with Intelligent Complexity Detection**

The `/karimo-feedback` command now automatically detects complexity and adapts its approach:

- **Auto-detection:** Analyzes feedback for simple vs complex signals
- **Simple path (70% of cases):** 0-3 clarifying questions → direct rule → < 5 min
- **Complex path (30% of cases):** 3-7 adaptive questions → investigation → feedback document → 10-20 min
- **Batch mode:** Preserved `--from-metrics` for post-PRD retrospectives (unchanged)

**New Complex Path Features**

When investigation is needed:
- Spawns `karimo-interviewer` in feedback mode (adaptive questioning, not rigid rounds)
- Spawns `karimo-feedback-auditor` for evidence gathering
- Creates `.karimo/feedback/{slug}.md` with:
  - Problem statement with scope and occurrence
  - Evidence from status.json, PR history, codebase patterns
  - Root cause analysis with impact quantification
  - Recommended changes with confidence levels
  - Applied changes tracking and verification criteria
- Supports multiple file updates (learnings.md, config.yaml, KARIMO_RULES.md, etc.)
- Learning provenance (links rules back to investigations)

**New Templates**

- `FEEDBACK_INTERVIEW_PROTOCOL.md` — Adaptive feedback interviews (replaces LEARN_INTERVIEW_PROTOCOL.md)
- `FEEDBACK_DOCUMENT_TEMPLATE.md` — Investigation artifact structure

**Renamed Agents**

- `karimo-learn-auditor.md` → `karimo-feedback-auditor.md` (refocused for scoped investigations)

**Renamed Templates**

- `LEARN_INTERVIEW_PROTOCOL.md` → `FEEDBACK_INTERVIEW_PROTOCOL.md`
- `FINDINGS_TEMPLATE.md` → incorporated into `FEEDBACK_DOCUMENT_TEMPLATE.md`

**Updated Interviewer Agent**

- `karimo-interviewer` now mode-aware (supports both PRD and feedback modes)
- PRD mode: Follow INTERVIEW_PROTOCOL.md (unchanged)
- Feedback mode: Follow FEEDBACK_INTERVIEW_PROTOCOL.md (new)

### Changed

**Complexity Detection Heuristics**

Simple signals (quick path):
- Specific file, component, or pattern mentioned
- Clear root cause stated
- Straightforward fix ("never do X", "always use Y")
- Single, well-defined issue

Complex signals (investigation path):
- Vague symptoms ("something's wrong", "keeps failing")
- Scope indicators ("all tests", "system-wide", "deployment")
- Investigation language ("figure out why", "not sure what's causing")
- Multiple related issues tangled together
- Unclear root cause

**Adaptive Questioning**

Complex path uses 4 categories (not rigid 5 rounds):
1. **Problem Scoping:** When does this occur? Which areas affected?
2. **Evidence:** Which PRDs/tasks/PRs show this? What went wrong?
3. **Root Cause:** What's causing this? Missing information?
4. **Desired State:** What should ideal behavior be?

Stops when: All 4 categories answered OR 7 questions reached OR problem becomes simple

**Edge Case Handling**

- Multiple distinct issues → Offer split/together/pick options
- Complexity changes mid-feedback → Offer investigation mode
- Vague feedback → Ask clarifying questions with examples

### Removed

**Deprecated Command**

- `/karimo-learn` — Functionality merged into `/karimo-feedback` with auto-detection

**Removed Legacy Workflow**

Old two-scope model:
- Scope 1: /karimo-feedback (quick capture, ~2 min)
- Scope 2: /karimo-learn (rigid 3-mode cycle, ~45 min)

New unified model:
- /karimo-feedback with auto-detection (simple or complex path)

**Removed Templates**

- `LEARN_INTERVIEW_PROTOCOL.md` — Replaced with `FEEDBACK_INTERVIEW_PROTOCOL.md`
- `FINDINGS_TEMPLATE.md` — Replaced with `FEEDBACK_DOCUMENT_TEMPLATE.md`

### Documentation

**Updated:**
- `COMMANDS.md` — Unified feedback documentation with complexity detection
- `COMPOUND-LEARNING.md` — Complete rewrite for complexity-based approach
- `ARCHITECTURE.md` — Updated folder structure and compound learning section
- `CLAUDE.md` — Removed /karimo-learn, updated /karimo-feedback description
- `README.md` — Updated command table and compound learning description

**Benefits**

- **Simpler mental model:** One command instead of two
- **Faster simple feedback:** No overhead for clear observations
- **Better investigation:** Adaptive questioning vs rigid rounds
- **Evidence preservation:** Feedback documents track investigations
- **Learning provenance:** Link rules back to root cause analysis
- **Time savings:** 10-20 min for complex (vs 45 min rigid cycle)

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
