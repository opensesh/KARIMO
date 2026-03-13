# KARIMO Source Repository Rules

## Release Protocol (MANDATORY)

When changes impact target repositories (installed KARIMO projects), you MUST complete ALL steps below. **The release is NOT complete until the GitHub Release exists.**

### Release Checklist (ALL REQUIRED)

```
[ ] 1. VERSION BUMP
    - Update `.karimo/VERSION` with new semver
    - Update `version` field in `.karimo/MANIFEST.json` to match

[ ] 2. CHANGELOG ENTRY
    - Add entry to `CHANGELOG.md` under new version header
    - Format: `## [X.Y.Z] - YYYY-MM-DD`
    - Include: Added, Changed, Fixed, Removed subsections as needed

[ ] 3. COMMIT & PUSH
    - Commit all version-related changes
    - Push to origin/main

[ ] 4. GITHUB RELEASE (CRITICAL - DO NOT SKIP)
    - gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."
    - Include summary of changes in release notes
    - WITHOUT THIS, /karimo-update WILL NOT DETECT THE NEW VERSION

[ ] 5. DOCUMENTATION SCAN
    - README.md — Installation, features, command reference
    - .karimo/docs/COMMANDS.md — If slash commands changed
    - .karimo/docs/ARCHITECTURE.md — If system structure changed
    - .karimo/docs/GETTING-STARTED.md — If setup flow changed
```

### STOP CHECK

Before marking a version bump task as complete, verify:
1. `gh release view vX.Y.Z` returns the release (not "release not found")
2. The release URL is provided to the user

**If you forget the GitHub release, /karimo-update will not work.** This breaks the update flow for all users.

## What Impacts Target Repositories

Changes to these files affect installed projects:
- `.claude/agents/*` — Agent definitions
- `.claude/commands/*` — Slash commands
- `.claude/skills/*` — Skill definitions
- `.karimo/templates/*` — PRD/task templates
- `.claude/KARIMO_RULES.md` — Agent behavior rules

Changes to these files do NOT affect installed projects:
- `install.sh`, `update.sh` — Installer scripts (source-only)
- `CONTRIBUTING.md` — Contribution guidelines
- `.github/workflows/karimo-test-install.yml` — Source-only CI

## Atomic Commit Workflow (MANDATORY)

**Iron Law: COMMIT AFTER EACH LOGICAL UNIT OF WORK — NOT AT THE END**

Bundling all changes into one commit destroys traceability. Each plan phase, task, or logical unit gets its own commit. This is non-negotiable.

### When to Commit

| Trigger | Action |
|---------|--------|
| Plan phase complete | Commit immediately |
| TodoWrite task marked `completed` | Commit that task's changes |
| Bug fix verified | Commit the fix |
| Refactor complete | Commit separately from features |
| Moving to unrelated work | Commit current work first |

### Workflow Integration

1. **During Plan Execution:**
   - Complete a phase/task
   - Verify it works (tests, build, etc.)
   - Stage and commit with descriptive message
   - Mark TodoWrite item as `completed`
   - Move to next task

2. **At End of Work Session:**
   - Show commit summary to user
   - Format: list of commits made with messages
   - Example:
     ```
     ## Commits Made This Session
     - `abc1234` feat(auth): add logout button component
     - `def5678` feat(auth): implement logout API call
     - `ghi9012` test(auth): add logout flow tests
     ```

### Commit Format

Use Conventional Commits:

```
<type>[optional scope]: <description>

[optional body]

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, refactor, style, docs, test, chore, perf

**Rules:**
- Imperative mood: "add feature" not "added feature"
- Keep first line under 72 characters
- ALWAYS include Co-Authored-By footer

### Anti-Patterns (STOP if you catch yourself...)

- Saying "I'll commit everything at the end"
- Asking "do you want me to commit?" after all work is done
- Making one commit with unrelated changes
- Waiting to commit until user asks

---

# KARIMO Configuration Guide

## What is KARIMO?

KARIMO is an autonomous development **methodology** delivered via Claude Code configuration. It transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight.

**Core philosophy:** You are the architect, agents are the builders, automated review is the inspector.

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/karimo-research "feature-name"` | **REQUIRED first step** — Create PRD folder + run research |
| `/karimo-plan --prd {slug}` | PRD interview using research context |
| `/karimo-run --prd {slug}` | Execute tasks from a PRD (feature branch workflow, **recommended**) |
| `/karimo-run --review-only` | Generate briefs and review, then stop (no execution) |
| `/karimo-run --skip-review` | Skip pre-execution review and execute immediately |
| `/karimo-merge --prd {slug}` | Create final PR to main after execution completes |
| `/karimo-status [--prd {slug}]` | View execution state (no arg = all PRDs, with arg = details) |
| `/karimo-configure` | Create or update project configuration (~5 min) |
| `/karimo-update` | Check for and apply KARIMO updates from GitHub |
| `/karimo-feedback` | Intelligent feedback with auto-detection (simple or complex) |
| `/karimo-doctor` | Check installation health and diagnose issues |
| `/karimo-test` | Verify installation works end-to-end |
| `/karimo-help` | Help & documentation search |
| `/karimo-plugin` | Plugin management |
| `/karimo-dashboard` | CLI monitoring dashboard |

---

## Adoption Phases

KARIMO uses three optional adoption phases:

### Phase 1: Execute PRD
Your first planning process with KARIMO:
- Run `/karimo-research "feature-name"` to create PRD folder and run research
- Run `/karimo-plan --prd {slug}` to create PRD through agent interviews
- Agent teams coordinate task execution
- Wave-based execution (wave 2 waits for wave 1 to merge)
- PRs target main directly with labels for tracking
- Claude Code handles worktrees automatically via `isolation: worktree`

**This is where everyone starts.** Phase 1 is fully functional out of the box.

### Phase 2: Automate Review
Add automated code review to your workflow. Choose your provider:

| Provider | Pricing | Best For |
|----------|---------|----------|
| **Greptile** | $30/month flat | High volume (50+ PRs/month) |
| **Claude Code Review** | $15-25 per PR | Low-medium volume, native Claude integration |

Both providers support:
- Automated revision loops when issues are found
- Model escalation (Sonnet → Opus) after first failure
- Hard gate after 3 failed attempts (needs human review)

**Optional but highly recommended.** Run `/karimo-configure --review` to choose your provider.

### Phase 3: Monitor & Review
GitHub-native monitoring — no separate dashboard needed:
- `/karimo-status` — Smart monitoring (no arg = all PRDs, with arg = specific details)
- GitHub — PR comments, labels, activity
- Claude Code analytics — Review usage (if using Code Review)

---

## Execution Model

KARIMO uses a PR-centric workflow with wave-based execution:

**Key Features:**
- PRs target `main` directly (no feature branches)
- Tasks execute in wave order (wave 2 waits for wave 1 to merge)
- Claude Code manages worktrees via `isolation: worktree`
- PR labels replace GitHub Projects for tracking
- Branch naming: `{prd-slug}-{task-id}`

**Requirements:**
- GitHub MCP server configured in Claude Code
- gh CLI authenticated with `repo` scope

**Benefits:**
- Complete traceability (task → PR → merge)
- Wave-based parallel execution
- PR-based code review workflow
- Automated review integration (Greptile or Code Review)
- Git state reconstruction for crash recovery

---

## Configuration

KARIMO configuration lives in `.karimo/config.yaml`. On first `/karimo-plan` or `/karimo-configure`, the investigator agent auto-detects project context and populates the config file.

Key settings:
- **Project** — Runtime, framework, package manager
- **Commands** — Build, lint, test, typecheck commands
- **Boundaries** — Files agents must not touch (`never_touch`) or must flag for review (`require_review`)
- **GitHub** — Owner, repository, default branch
- **Learnings** — Patterns and anti-patterns stored in `.karimo/learnings.md`

---

## Agent Rules

Agent behavior is governed by `.claude/KARIMO_RULES.md`. This file defines:
- Task execution boundaries
- Wave-ordered execution model
- PR creation guidelines
- Finding propagation between waves

---

## Installed Components

When you run `install.sh`, these files are added:

| Location | Contents |
|----------|----------|
| `.claude/agents/` | **17** agent definitions (11 coordination + 6 task agents) |
| `.claude/commands/` | **13** slash commands |
| `.claude/skills/` | **6** skills (1 bash + 2 research + 3 task agent skills) |
| `.claude/KARIMO_RULES.md` | Agent behavior rules |
| `.karimo/templates/` | **15** templates |

**Optional:** Run `/karimo-configure --review` to choose and configure your automated code review provider (Greptile or Claude Code Review).

### Agent Types

**Coordination agents:** interviewer, investigator, researcher, refiner, reviewer, brief-reviewer, brief-corrector, brief-writer, pm, review-architect, feedback-auditor

**Task agents:** implementer, tester, documenter (each with Sonnet and Opus variants)

### Skills

All skills use the `karimo-*` prefix for reliable update management and clear distinction from user-added files.

**Coordination skills:** karimo-bash-utilities

**Research skills:** karimo-research-methods, karimo-external-research

**Task agent skills:** karimo-code-standards, karimo-testing-standards, karimo-doc-standards

---

## Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](.karimo/docs/ARCHITECTURE.md) | System design and integration |
| [CI-CD.md](.karimo/docs/CI-CD.md) | CI/CD integration and preview deployments |
| [COMMANDS.md](.karimo/docs/COMMANDS.md) | Slash command reference |
| [COMPOUND-LEARNING.md](.karimo/docs/COMPOUND-LEARNING.md) | Two-scope learning system |
| [DASHBOARD.md](.karimo/docs/DASHBOARD.md) | Dashboard spec (Phase 3) |
| [GETTING-STARTED.md](.karimo/docs/GETTING-STARTED.md) | Installation walkthrough |
| [PHASES.md](.karimo/docs/PHASES.md) | Adoption phases explained |
| [SAFEGUARDS.md](.karimo/docs/SAFEGUARDS.md) | Code integrity, security, Greptile |

---

## Learnings

Project-specific learnings are stored in `.karimo/learnings.md` and populated via `/karimo-feedback`. This keeps CLAUDE.md minimal while providing agents with accumulated knowledge._
