# KARIMO Source Repository Rules

## Release Protocol (MANDATORY)

When changes impact target repositories (installed KARIMO projects), you MUST:

### 1. Version Bump
- Update `.karimo/VERSION` with new semver
- Update `version` field in `.karimo/MANIFEST.json` to match

### 2. Changelog Entry
- Add entry to `CHANGELOG.md` under new version header
- Format: `## [X.Y.Z] - YYYY-MM-DD`
- Include: Added, Changed, Fixed, Removed subsections as needed

### 3. GitHub Release
- Create release via `gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."`
- Include summary of changes in release notes

### 4. Documentation Scan
After making changes, scan these files for necessary updates:
- `README.md` — Installation, features, command reference
- `.karimo/docs/COMMANDS.md` — If slash commands changed
- `.karimo/docs/ARCHITECTURE.md` — If system structure changed
- `.karimo/docs/GETTING-STARTED.md` — If setup flow changed

## What Impacts Target Repositories

Changes to these files affect installed projects:
- `.claude/agents/*` — Agent definitions
- `.claude/commands/*` — Slash commands
- `.claude/skills/*` — Skill definitions
- `.karimo/templates/*` — PRD/task templates
- `.github/workflows/karimo-*.yml` — CI workflows
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

**Core philosophy:** You are the architect, agents are the builders, Greptile is the inspector.

---

## Slash Commands

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Start PRD interview with interactive approval |
| `/karimo-overview` | Cross-PRD oversight dashboard |
| `/karimo-execute --prd {slug}` | Execute tasks from a PRD (brief gen + execution) |
| `/karimo-modify --prd {slug}` | Modify an approved PRD before execution |
| `/karimo-status` | View execution state and progress |
| `/karimo-configure` | Create or update project configuration (~5 min) |
| `/karimo-cd-config` | Configure CD provider to skip KARIMO branch previews |
| `/karimo-update` | Check for and apply KARIMO updates from GitHub |
| `/karimo-feedback` | Quick capture of single learnings (~2 min) |
| `/karimo-learn` | Deep learning cycle with investigation (~45 min) |
| `/karimo-doctor` | Check installation health and diagnose issues |
| `/karimo-test` | Verify installation works end-to-end |

---

## Adoption Phases

KARIMO uses three optional adoption phases:

### Phase 1: Execute PRD
Your first planning process with KARIMO:
- Run `/karimo-plan` to create PRD through agent interviews
- Agent teams coordinate task execution
- Wave-based execution (wave 2 waits for wave 1 to merge)
- PRs target main directly with labels for tracking
- Claude Code handles worktrees automatically via `isolation: worktree`

**This is where everyone starts.** Phase 1 is fully functional out of the box.

### Phase 2: Automate Review
Add automated code review to your workflow:
- Integrate Greptile for code integrity checks (0-5 scale)
- Score ≥ 3 passes, < 3 triggers revision loop
- Model escalation (Sonnet → Opus) after first failure
- Hard gate after 3 failed attempts (needs human review)

**Optional but highly recommended.** Greptile acts as a force multiplier. Requires Greptile API key.

### Phase 3: Monitor & Review

**Coming soon.** Dashboard for team-wide visibility and oversight.

---

## Execution Model (v4.0)

KARIMO v4.0 uses a simplified PR-centric workflow:

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
- Greptile integration for automated review
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
| `.claude/agents/` | 13 agent definitions (7 coordination + 6 task agents) |
| `.claude/commands/` | 12 slash commands (plan, overview, execute, modify, status, configure, cd-config, update, feedback, learn, doctor, test) |
| `.claude/skills/` | 4 skills (1 coordination + 3 task agent skills) |
| `.claude/KARIMO_RULES.md` | Agent behavior rules |
| `.karimo/templates/` | 9 templates (PRD, interview, task, status, dependencies, DAG, learn-interview, findings, task-brief) |
| `.github/workflows/` | 1 required (karimo-ci.yml) + optional workflows via `/karimo-configure` |

### Agent Types

**Coordination agents:** interviewer, investigator, reviewer, brief-writer, pm, review-architect, learn-auditor

**Task agents:** implementer, tester, documenter (each with Sonnet and Opus variants)

### Skills

All skills use the `karimo-*` prefix for reliable update management and clear distinction from user-added files.

**Coordination skills:** karimo-bash-utilities

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

Project-specific learnings are stored in `.karimo/learnings.md` and populated via `/karimo-feedback` or `/karimo-learn`. This keeps CLAUDE.md minimal while providing agents with accumulated knowledge._
