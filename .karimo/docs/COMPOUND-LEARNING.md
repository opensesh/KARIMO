# KARIMO Compound Learning

KARIMO has an intelligent compound learning system with automatic complexity detection that makes agents smarter over time. This closes the gap between "agents made a mistake" and "agents never make that mistake again."

---

## Two-Tier Knowledge System

KARIMO distinguishes between **findings** (per-PRD, automatic) and **learnings** (project-wide, user-triggered). Understanding this distinction is critical for effective use.

### Findings: Per-PRD Task Communication

**What they are:** Discoveries made during PRD execution that downstream tasks need to know.

**Scope:** One PRD cycle. Findings are ephemeral — they exist to coordinate tasks within a single feature execution.

**Created by:** Worker agents automatically during task execution.

**Storage:**
```
During execution (worker level):
.worktrees/{prd-slug}/{task-id}/findings.md

After execution (PRD level):
.karimo/prds/{slug}/findings.md          # Aggregated by PM Agent
.karimo/findings/by-prd/{slug}.md        # Summary with links
.karimo/findings/by-pattern/             # Cross-PRD patterns
```

**What gets recorded:**
- New types, interfaces, or APIs created that other tasks will consume
- Patterns established (e.g., "used X library for form validation")
- Gotchas encountered (e.g., "this API returns paginated results")
- Files created or moved not in original `files_affected`
- Architecture decisions made under ambiguity

**How they're used:**
1. Worker agent creates `findings.md` in its worktree
2. PM Agent reads and propagates to downstream task briefs
3. After PRD completes, PM Agent aggregates into `.karimo/prds/{slug}/findings.md`
4. Patterns appearing in 2+ PRDs get indexed in `.karimo/findings/by-pattern/`

### Learnings: Project-Wide Wisdom

**What they are:** Permanent rules and guidelines learned from operational feedback.

**Scope:** All future tasks across all PRDs. Learnings persist indefinitely.

**Created by:** User via `/karimo:feedback` command (never automatic).

**Storage:**
```
.karimo/learnings/
├── index.md              # Master overview + navigation
├── TEMPLATE.md           # Template for new entries
├── patterns/             # Positive practices to replicate
├── anti-patterns/        # Mistakes to avoid
├── project-notes/        # Project-specific context
└── execution-rules/      # Mandatory guidelines
```

**What gets recorded:**
- "Never use inline styles — always use Tailwind classes"
- "All error handling must use structured error types"
- "The auth middleware has a race condition on first load"
- "Always check authentication requirements during PRD planning"

**How they're used:**
- Read by all agents before task execution
- Enforcement levels: `critical` (hard stop), `important` (warning), `info` (optional)
- Referenced in task briefs for relevant context

### Key Differences

| Aspect | Findings | Learnings |
|--------|----------|-----------|
| **Scope** | One PRD | All PRDs |
| **Lifespan** | Temporary (PRD cycle) | Permanent |
| **Created by** | Worker agents (automatic) | User via `/karimo:feedback` |
| **Purpose** | Task-to-task coordination | Prevent recurring mistakes |
| **Storage** | `.karimo/prds/{slug}/findings.md` | `.karimo/learnings/` |

### Promotion Path

Findings can become learnings when patterns repeat across PRDs:

```
FINDINGS (pattern in 3+ PRDs)
    ↓
PM Agent detects and flags in metrics.json
    ↓
/karimo:feedback --from-metrics surfaces candidates
    ↓
User approves promotion
    ↓
LEARNINGS (permanent rule)
```

This promotion is never automatic — user approval is required.

---

## Feedback Command Architecture

The `/karimo:feedback` command is the sole mechanism for creating learnings. It does NOT create findings (those are automatic during execution).

```
┌─────────────────────────────────────────────────────────────────────┐
│                  UNIFIED FEEDBACK COMMAND                            │
│                   /karimo:feedback                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Initial Feedback → Complexity Detection                            │
│                           ↓                                         │
│            ┌──────────────┴──────────────┐                          │
│            ↓                             ↓                          │
│                                                                     │
│   SIMPLE PATH (70% of cases)      COMPLEX PATH (30% of cases)       │
│   ┌───────────────────────┐      ┌───────────────────────────┐     │
│   │ < 5 minutes            │      │ 10-20 minutes              │     │
│   │                       │      │                           │     │
│   │ 0-3 clarifying Qs     │      │ Adaptive interview (3-7 Q) │     │
│   │ ↓                     │      │ ↓                         │     │
│   │ Generate rule         │      │ Evidence gathering        │     │
│   │ ↓                     │      │ ↓                         │     │
│   │ Append to             │      │ Create feedback document   │     │
│   │ learnings/            │      │ ↓                         │     │
│   │                       │      │ Present changes           │     │
│   │                       │      │ ↓                         │     │
│   │                       │      │ Apply approved changes     │     │
│   │                       │      │ (learnings/ + config +    │     │
│   │                       │      │  other files)             │     │
│   └───────────────────────┘      └───────────────────────────┘     │
│                                                                     │
│   BATCH MODE: --from-metrics                                        │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ Post-PRD retrospective from metrics.json                     │   │
│   │ Pre-identified candidates → Quick review → Batch append      │   │
│   │ Time: 5-10 minutes                                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Complexity Detection

The `/karimo:feedback` command auto-detects whether feedback needs quick capture or deep investigation.

### Simple Signals (Quick Path - 70%)

- Specific file, component, or pattern mentioned
- Clear root cause stated
- Straightforward fix ("never do X", "always use Y")
- Single, well-defined issue
- User confident about what went wrong

**Examples:**
- "Never use inline styles — always use Tailwind classes"
- "Components should have dev props like UserCard.tsx"
- "Don't let agents touch the middleware file"

### Complex Signals (Investigation Path - 30%)

- Vague symptoms ("something's wrong", "keeps failing")
- Scope indicators ("all tests", "system-wide", "deployment")
- Investigation language ("figure out why", "not sure what's causing")
- Multiple related issues tangled together
- Unclear root cause

**Examples:**
- "Tests failing on deploy but passing locally — investigate why"
- "Agents keep making the same mistake but I don't know what pattern they're missing"
- "CI/CD is broken — not sure what changed"

---

## Simple Path

Quick capture for well-defined feedback (70% of cases, < 5 min).

### How It Works

1. **Developer provides feedback** — Clear observation or rule
2. **Optional clarifying questions** — 0-3 questions if needed
3. **Generate rule** — Transform feedback into actionable instruction
4. **Confirm with user** — Present rule for approval
5. **Create entry in `.karimo/learnings/`** — Under appropriate category directory
6. **Commit** — `chore(feedback): add rule - {summary}`
7. **Future agents read** — Apply rule to subsequent tasks

### Example Usage

```
/karimo:feedback

> "Never use inline styles — always use Tailwind classes"
```

**Result:**

```markdown
**Anti-pattern:** Never use inline styles. Always use Tailwind utility classes.
Reference existing components for class patterns.

**Context:** Inline styles bypass the design system.
**Added:** 2026-03-11
```

Created in `.karimo/learnings/anti-patterns/` immediately.

### When to Use Simple Path

- Immediate capture after observing clear issue
- Quick patterns worth reinforcing
- Non-obvious constraints discovered
- Single, isolated observations with known fix

---

## Complex Path

Deep investigation for unclear or systemic issues (30% of cases, 10-20 min).

### How It Works

1. **Developer provides vague/systemic feedback** — Problem description without clear fix
2. **Notify investigation mode** — "This needs investigation. Starting adaptive interview..."
3. **Adaptive interview (3-7 questions):**
   - **Problem Scoping:** When does this occur? Which areas affected?
   - **Evidence:** Which PRDs/tasks/PRs show this? What went wrong?
   - **Root Cause:** What's causing this? Missing information?
   - **Desired State:** What should ideal behavior be?
4. **Spawn feedback-auditor agent:**
   - Investigates status.json files, PR history, codebase patterns
   - Gathers evidence relevant to specific problem
   - Analyzes root cause
   - Generates recommended changes
5. **Create feedback document:**
   - `.karimo/feedback/{slug}.md` with problem statement, evidence, analysis, recommendations
6. **Present recommended changes:**
   - Show each change with target file, confidence level, rationale
   - User approves/rejects/edits
7. **Apply approved changes:**
   - Update `.karimo/learnings/`, `.karimo/config.yaml`, `.claude/plugins/karimo/KARIMO_RULES.md`, or other files
   - Track in feedback document under "Applied Changes"
8. **Commit** — `chore(feedback): {summary from investigation}`

### Example Usage

```
/karimo:feedback

> "Tests failing on deploy but passing locally — investigate why"
```

**Result:**

1. Adaptive interview determines scope (CI/CD workflows, test environment)
2. Feedback-auditor investigates:
   - Reviews GitHub Actions workflows
   - Checks environment variables in status.json
   - Examines PR history for similar failures
   - Analyzes test configuration
3. Creates `.karimo/feedback/deploy-test-failures.md` with findings:
   - **Root Cause:** Missing DATABASE_URL in GitHub Actions
   - **Evidence:** 3 PRs (#123, #127, #131) failed with same error
   - **Recommended Changes:**
     - Add DATABASE_URL to `.github/workflows/test.yml`
     - Add rule to `.karimo/learnings/execution-rules/` about env var parity
     - Add `.github/workflows/` to `require_review` boundary
4. User approves changes
5. Changes applied to multiple files
6. Feedback document tracks resolution

### When to Use Complex Path

- Systemic issues affecting multiple PRDs/tasks
- Unclear root cause requiring investigation
- Deployment, CI/CD, or environment issues
- Patterns that need evidence gathering
- Problems where you know "something's wrong" but not what

---

## Batch Mode: --from-metrics

Post-PRD retrospective using automatically identified learning candidates.

### How It Works

After PRD execution completes, KARIMO generates `metrics.json` with auto-identified learning candidates based on:
- High loop counts (loops > 3)
- Model escalations (Sonnet → Opus)
- Hard gate tasks (failed 3 review attempts)
- Runtime dependencies

### Workflow

```bash
# After PRD completion
/karimo:feedback --from-metrics {prd-slug}
```

**Process:**
1. Read `metrics.json` from `.karimo/prds/{prd-slug}/`
2. Extract learning candidates with suggested rules
3. Present each candidate for review
4. User selects which to capture (all/specific/none)
5. Batch create approved entries in `.karimo/learnings/`
6. Update `metrics.json` with captured flags
7. Commit: `chore(feedback): batch capture from {prd-slug} metrics`

### Example Output

```
📊 Learnings from: user-profiles

Found 4 learning candidates in metrics.json:

1. [2a] High loops (5)
   → "Profile form validation patterns may be more complex than estimated"
   Category: gotcha

2. [2a] Runtime dependency
   → "Always check authentication requirements for API tasks during PRD planning"
   Category: rule

3. [3b] Model escalation (Sonnet → Opus)
   → "Tasks involving complex state management should start at complexity 5+"
   Category: rule

4. [4a] Hard gate (3 review failures)
   → "Integration tests for external services need mocking patterns"
   Category: gotcha

Select learnings to capture: [all/1,2,4/none]
```

### When to Use Batch Mode

- After completing a PRD
- Regular retrospectives (weekly/bi-weekly)
- Processing multiple learnings efficiently
- Metrics-driven improvement

---

## File Structure

### .karimo/learnings/

Categorized learnings directory for efficient retrieval. Read by all agents before task execution.

**Directory Structure:**
```
.karimo/learnings/
├── index.md              # Master overview + navigation + stats
├── TEMPLATE.md           # Template for new learning entries
├── patterns/
│   └── index.md          # Positive practices to replicate
├── anti-patterns/
│   └── index.md          # Mistakes to avoid
├── project-notes/
│   └── index.md          # Project-specific context
└── execution-rules/
    └── index.md          # Mandatory guidelines
```

**Category Index Structure:**
```markdown
# {Category Name}

_Description of this category_

## Entries

| Title | Severity | Added | Source |
|-------|----------|-------|--------|
| [Entry Title](entry-slug.md) | critical | 2026-03-12 | /karimo:feedback |

## Quick Reference

{Most important rules for quick scanning}
```

**Learning Entry Template:**
```markdown
# {Learning Title}

**Category:** pattern | anti-pattern | project-note | execution-rule
**Severity:** info | important | critical
**Added:** {ISO date}
**Source:** {/karimo:feedback | PRD-{slug} | manual}

## Description
{What this learning teaches}

## Context
{Why this matters, when it applies}

## Example
{Code example or scenario}
```

**Updated by:**
- Simple path: creates entry in appropriate category directory
- Complex path: creates entry from feedback investigation
- Batch mode: batch creates entries from metrics

### .karimo/feedback/

Investigation artifacts from complex path (created on-demand).

**Structure:**
```
.karimo/feedback/
├── deploy-test-failures.md
├── ci-cd-environment-issues.md
└── agent-behavior-patterns.md
```

**Each feedback document contains:**
- Problem statement with scope and occurrence
- Evidence gathered by feedback-auditor
- Root cause analysis with impact quantification
- Recommended changes with confidence levels
- Applied changes tracking
- Verification criteria

**Purpose:**
- Preserve evidence and analysis
- Link back to learnings added
- Reference for future feedback cycles
- Track resolution of complex issues

---

## Relationship: Simple vs Complex

| Aspect | Simple Path | Complex Path |
|--------|-------------|--------------|
| **Trigger** | Clear feedback with known fix | Vague symptoms or systemic issues |
| **Time** | < 5 minutes | 10-20 minutes |
| **Questions** | 0-3 (if needed) | 3-7 (adaptive) |
| **Investigation** | None | Evidence gathering via feedback-auditor |
| **Output Files** | `.karimo/learnings/{category}/` only | `.karimo/feedback/{slug}.md` + multiple config files |
| **Changes** | Single rule append | Multiple file updates |
| **Frequency** | After each observation | Periodic or when needed |
| **User Effort** | Minimal | Guided by adaptive interview |

---

## Learning Categories

All learnings (simple and complex) are classified into:

| Category | Use For | Example |
|----------|---------|---------|
| **Patterns to Follow** | Positive practices to replicate | "Always use existing component patterns from `src/components/`" |
| **Anti-Patterns to Avoid** | Mistakes to prevent | "Never use inline styles — use Tailwind classes" |
| **Rules** | Mandatory guidelines | "All error handling must use structured error types from `src/utils/errors.ts`" |
| **Gotchas** | Non-obvious constraints | "The auth middleware has a race condition on first load" |

---

## Learning Provenance

Complex path learnings include provenance linking back to feedback documents:

```markdown
## Anti-Patterns to Avoid

- **Never deploy without running build locally first.** CI/CD catches
  different errors than local dev server.
  See `.karimo/feedback/deploy-failures.md` for investigation.
  (Added: 2024-03-11)
```

This enables:
- Tracing rules back to root cause analysis
- Re-evaluating rules if context changes
- Understanding why rules exist
- Building institutional knowledge

---

## Usage Patterns

### Recommended Workflow

**Daily:**
- Use `/karimo:feedback` for immediate observations (simple path)
- Quick capture as patterns emerge

**After Each PRD:**
- Run `/karimo:feedback --from-metrics {prd-slug}` for batch capture
- Review learning candidates from execution

**Weekly/Bi-weekly:**
- Review complex issues that accumulated
- Use `/karimo:feedback` with complex path for systemic problems
- Periodic check of `.karimo/feedback/` for unresolved issues

**Monthly:**
- Review `.karimo/learnings/` for outdated or conflicting rules
- Consolidate learnings if needed
- Archive resolved feedback documents

---

## Edge Cases

### Multiple Distinct Issues

**User provides:** "Three things: agents use inline styles, tests are flaky, and deployment fails"

**Handling:**
```
I'm seeing three distinct issues:
1. Inline styles (simple)
2. Flaky tests (complex - needs investigation)
3. Deployment failures (complex - needs investigation)

Options:
A) Handle inline styles now (simple path), investigate others separately
B) Pick one complex issue to investigate now
C) Quick rules for all three (if you know the fixes)
```

### Complexity Changes Mid-Feedback

**Starts simple:** "Agents should add JSDoc comments"
**Becomes complex:** "...but I'm not sure which functions need it or if there's a pattern"

**Handling:**
```
This is more complex than I initially thought. I recommend switching to investigation
mode to determine the right pattern by looking at existing code.

Should I start an adaptive interview to gather details?
```

### Vague Feedback

**User:** "Something's not working right"

**Handling:**
```
Can you be more specific? For example:
- Which PRD or task showed the problem?
- What did you expect vs what happened?
- Is this about agent behavior, code quality, or workflow?

Even if you don't know the root cause, specific examples help me investigate.
```

---

## Success Metrics

### Simple Path
- ✅ Entry created in `.karimo/learnings/{category}/`
- ✅ Changes committed
- ✅ User confirms capture
- ✅ Completed in < 5 minutes

### Complex Path
- ✅ Feedback document created
- ✅ Evidence gathered and analyzed
- ✅ Recommended changes presented
- ✅ Approved changes applied to multiple files
- ✅ Changes committed
- ✅ User confirms resolution
- ✅ Completed in 10-20 minutes

### Batch Mode
- ✅ All selected learnings created in `.karimo/learnings/`
- ✅ Metrics updated with captured flags
- ✅ Changes committed
- ✅ Completed in 5-10 minutes

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [CONTEXT-ARCHITECTURE.md](CONTEXT-ARCHITECTURE.md) | L0/L1/L2 layering and learnings structure |
| [COMMANDS.md](COMMANDS.md) | `/karimo:feedback` command reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and folder structure |
| [GETTING-STARTED.md](GETTING-STARTED.md) | Installation and first feedback capture |

---

*This unified feedback system replaces the legacy two-scope model (/karimo:feedback + /karimo-learn). All learning capture now flows through `/karimo:feedback` with intelligent complexity detection.*
