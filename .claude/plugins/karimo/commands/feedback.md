# /karimo:feedback — Unified Feedback Command

Intelligent feedback capture with automatic complexity detection and adaptive investigation.

## Purpose

Unified command for capturing feedback about KARIMO or Claude Code operation. Auto-detects whether feedback needs quick rule creation (simple) or deep investigation (complex).

**Key Principle:** Focus on "what's broken" not "what are we building."

---

## Usage

```bash
/karimo:feedback                           # Interactive mode with auto-detection
/karimo:feedback --from-metrics {prd-slug} # Batch mode from execution metrics
/karimo:feedback --undo                    # Remove recent learnings
```

---

## Adaptive Flow

```
Initial Feedback
    │
    ▼
Complexity Detection
    │
    ├─► SIMPLE PATH (70% of cases, < 5 min)
    │   │
    │   ├─ Ask 0-3 clarifying questions (if needed)
    │   ├─ Generate rule immediately
    │   ├─ Confirm with user
    │   └─ Write to .karimo/learnings/{category}/
    │
    └─► COMPLEX PATH (30% of cases, 10-20 min)
        │
        ├─ Notify: "This needs investigation. Starting adaptive interview..."
        │
        ├─ Adaptive interview (3-7 questions)
        │   - Problem Scoping
        │   - Evidence
        │   - Root Cause
        │   - Desired State
        │
        ├─ Spawn @karimo-feedback-auditor for evidence gathering
        │
        ├─ Create feedback document (.karimo/feedback/{slug}.md)
        │
        └─ Present recommended changes → Apply approved changes
```

---

## Interactive Mode

### Step 1: Collect Initial Feedback

Prompt the user:

> "What feedback do you have about how KARIMO or Claude Code is working? Describe what's broken, what's suboptimal, or patterns you want changed."

Accept free-form input. Examples:
- **Simple:** "Never use inline styles — always use Tailwind classes"
- **Simple:** "Components should have dev props like in UserCard.tsx"
- **Complex:** "Tests failing on deploy but passing locally — investigate why"
- **Complex:** "Agents keep making the same mistake but I don't know what pattern they're missing"

### Step 2: Complexity Detection

Analyze the feedback for signals:

#### Simple Signals (Quick Path)
- Specific file, component, or pattern mentioned
- Clear root cause stated ("because X", "always do Y")
- Straightforward fix ("never do X", "use Y pattern")
- Single, well-defined issue
- User confident about what went wrong

**Example:** "Never let agents use `any` types — use proper TypeScript interfaces"

#### Complex Signals (Investigation Path)
- Vague symptoms ("something's wrong", "keeps failing", "not working right")
- Scope indicators ("all tests", "system-wide", "deployment", "CI/CD")
- Investigation language ("figure out why", "not sure what's causing", "investigate")
- Multiple related issues tangled together
- Unclear root cause

**Example:** "Tests are failing when we deploy but pass locally — investigate why"

---

## Simple Path (<  min)

When simple signals detected:

### 1. Clarifying Questions (0-3 questions, only if needed)

**If file/component not specific enough:**
> "Which file or component? Can you point me to an example?"

**If rule scope unclear:**
> "Should this apply to all components or specific areas?"

**If fix ambiguous:**
> "What should the ideal behavior be?"

### 2. Generate Rule

Transform feedback into actionable rule:

**Input:** "Never use inline styles — use Tailwind classes"

**Output:**
```markdown
**Anti-pattern:** Never use inline styles. Always use Tailwind utility classes.
Reference existing components for class patterns.

**Context:** Inline styles bypass the design system and make components harder to theme.
**Added:** 2024-03-11
```

### 3. Confirm with User

> "Creating `.karimo/learnings/anti-patterns/2026-03-12-no-inline-styles.md`:
>
> ```markdown
> # No Inline Styles
>
> **Category:** anti-pattern
> **Severity:** important
> **Added:** 2026-03-12
> **Source:** /karimo:feedback
>
> ## Description
> Never use inline styles. Always use Tailwind utility classes.
>
> ## Context
> Inline styles bypass the design system and make components harder to theme.
> Reference existing components for class patterns.
>
> ## Example
> ```tsx
> // Bad
> <div style={{ marginTop: '8px' }}>...</div>
>
> // Good
> <div className="mt-2">...</div>
> ```
> ```
>
> Correct? [Y/n/edit]"

### 4. Write to .karimo/learnings/{category}/

Create learning file in appropriate category directory:
- `patterns/` — Approaches that work well
- `anti-patterns/` — Approaches to avoid
- `project-notes/` — Project-specific context
- `execution-rules/` — Mandatory guidelines

**File naming:** `{YYYY-MM-DD}-{short-slug}.md`

**Example:**
```
.karimo/learnings/anti-patterns/2026-03-12-no-inline-styles.md
```

### 5. Commit

```bash
git add .karimo/learnings/
git commit -m "chore(feedback): add rule - no inline styles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 6. Confirm

> "Learning captured. Agents will see this rule on next task."

---

## Complex Path (10-20 min)

When complex signals detected:

### 1. Notify User

> "This needs investigation. Starting adaptive interview to gather details..."

### 2. Spawn Interviewer in Feedback Mode

```yaml
agent: @karimo-interviewer.md
mode: feedback
model: opus  # Recommended for adaptive questioning
protocol: .karimo/templates/FEEDBACK_INTERVIEW_PROTOCOL.md
```

### 3. Adaptive Interview (3-7 questions)

The interviewer conducts adaptive questioning across 4 categories:

**Category 1: Problem Scoping (1-2 questions)**
- When does this occur?
- Which files/components/areas affected?
- Recent change or ongoing issue?

**Category 2: Evidence (1-2 questions)**
- Which PRDs, tasks, or PRs show this?
- What should have happened instead?
- Patterns in status.json, logs, reviews?

**Category 3: Root Cause (1-2 questions)**
- What do you think is causing this?
- Missing information agents need?
- Behavior, workflow, or tooling issue?

**Category 4: Desired State (1-2 questions)**
- What should ideal behavior be?
- What prevents this in future?
- Hard rule or guideline?

**Stop conditions:**
- All 4 categories have at least 1 answer
- Enough info for investigation directives
- 7 questions reached (hard limit)
- Problem becomes simple (switch to simple path)

### 4. Generate Investigation Directives

Interviewer produces structured directives:

```yaml
investigation:
  problem: "Tests failing on deploy but passing locally"
  slug: "deploy-test-failures"
  scope:
    - CI/CD workflows
    - Test environment configuration
    - Deployment scripts
  data_sources:
    status_json:
      - user-profiles
      - payment-flow
    pr_history:
      - "#123"
      - "#127"
    file_patterns:
      - ".github/workflows/*.yml"
      - "tests/**/*.test.ts"
    config_files:
      - ".karimo/config.yaml"
      - "package.json"
  question_to_answer: "Why do tests pass locally but fail in CI/CD?"
  hypothesis: "Environment variable or dependency difference between local and CI"
  desired_state: "Tests pass consistently in all environments"
```

### 5. Spawn Feedback Auditor

```yaml
agent: @karimo-feedback-auditor.md
input: investigation directives from interviewer
tools: Read, Grep, Glob, Bash (gh CLI)
time_budget: 5-10 minutes
```

Auditor investigates and returns:
- Evidence from status files, PR history, codebase
- Root cause analysis
- Recommended changes with confidence levels

### 6. Create Feedback Document

Generate `.karimo/feedback/deploy-test-failures.md` using template:

```markdown
# Feedback: deploy-test-failures

**Type:** tooling
**Status:** investigating → resolved (after changes applied)
**Created:** 2024-03-11

## Problem Statement
Tests pass locally but fail in CI/CD

## Evidence Gathered
{From feedback-auditor}

## Root Cause Analysis
{From feedback-auditor}

## Recommended Changes
{From feedback-auditor}

## Applied Changes
{Tracked after user approval}

## Verification
{Success criteria for future PRDs}
```

### 7. Present Recommended Changes

Show user the proposed changes:

> "Investigation complete. Found root cause: missing environment variables in GitHub Actions.
>
> Recommended changes:
>
> 1. **Update** `.github/workflows/test.yml`
>    - Add DATABASE_URL env var
>    - Confidence: High
>
> 2. **Add rule** to `.karimo/learnings/execution-rules/`
>    - "Always verify test environment parity between local and CI"
>    - Confidence: High
>
> 3. **Update** `.karimo/config.yaml` boundaries
>    - Add `.github/workflows/` to `require_review`
>    - Confidence: Medium
>
> Apply these changes? [all/1,2/none/edit]"

### 8. Apply Approved Changes

For each approved change:
- Update target files
- Track in feedback document under "Applied Changes"

### 9. Commit

```bash
git add .karimo/feedback/deploy-test-failures.md .karimo/learnings/ .karimo/config.yaml .github/workflows/test.yml
git commit -m "chore(feedback): fix deploy test failures

Investigation findings:
- Root cause: missing DATABASE_URL in CI
- Added env var to GitHub Actions workflow
- Added rule to verify test environment parity
- Added CI workflows to require_review boundary

See .karimo/feedback/deploy-test-failures.md for full investigation.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 10. Confirm

> "Feedback captured and changes applied.
>
> Created: `.karimo/feedback/deploy-test-failures.md`
> Updated: `.karimo/learnings/`, `.karimo/config.yaml`, `.github/workflows/test.yml`
>
> Future PRDs will include this fix."

---

## Batch Mode: --from-metrics

Preserved from previous version with no changes.

### Usage

```bash
/karimo:feedback --from-metrics {prd-slug}
```

### Behavior

1. **Read metrics.json**
   ```bash
   METRICS_FILE=".karimo/prds/${prd_slug}/metrics.json"
   ```

2. **Extract learning candidates:**
   - High-loop tasks (loops > 3)
   - Escalated tasks (Sonnet → Opus)
   - Hard gate tasks (failed 3 review attempts)
   - Runtime dependency tasks

3. **Present suggested learnings:**
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

4. **Capture selected learnings:**
   - Write to `.karimo/learnings/{category}/` directories
   - Update metrics.json to mark as captured
   - Commit: `chore(feedback): batch capture from {prd-slug} metrics`

---

## Edge Cases

### Multiple Distinct Issues

**User provides:** "Three things: agents use inline styles, tests are flaky, and deployment fails"

**Response:**
```
I'm seeing three distinct issues:
1. Inline styles (simple)
2. Flaky tests (complex - needs investigation)
3. Deployment failures (complex - needs investigation)

Options:
A) Handle inline styles now (simple path), investigate others separately
B) Pick one complex issue to investigate now
C) Quick rules for all three (if you know the fixes)

What would you prefer?
```

### Complexity Changes Mid-Feedback

**Starts simple:** "Agents should add JSDoc comments"
**Becomes complex:** "...but I'm not sure which functions need it or if there's a pattern"

**Response:**
```
This is more complex than I initially thought. I recommend switching to investigation
mode to determine the right pattern by looking at existing code.

Should I start an adaptive interview to gather details?
```

### Vague Feedback

**User:** "Something's not working right"

**Response:**
```
Can you be more specific? For example:
- Which PRD or task showed the problem?
- What did you expect vs what happened?
- Is this about agent behavior, code quality, or workflow?

Even if you don't know the root cause, specific examples help me investigate.
```

---

## Undo

Preserved from previous version with no changes.

```bash
/karimo:feedback --undo
```

Shows recent learnings and allows removal:

> "Recent learnings:
>
> 1. [2024-03-11] Anti-pattern: Never use inline styles
> 2. [2024-03-10] Rule: Add JSDoc to exported functions
>
> Which would you like to remove?"

---

## File Structure

### Created/Modified Files

**Simple Path:**
- `.karimo/learnings/{category}/{date}-{slug}.md` (created)

**Complex Path:**
- `.karimo/feedback/{slug}.md` (created)
- `.karimo/learnings/{category}/{date}-{slug}.md` (created)
- `.karimo/config.yaml` (if boundaries updated)
- `.claude/KARIMO_RULES.md` (if rules updated)
- Other files (as recommended by investigation)

**Batch Mode:**
- `.karimo/learnings/{category}/{date}-{slug}.md` (created)
- `.karimo/prds/{prd-slug}/metrics.json` (updated with captured flag)

---

## Protocol References

**Simple path:** Direct rule generation (no protocol)
**Complex path:** `.karimo/templates/FEEDBACK_INTERVIEW_PROTOCOL.md`
**Feedback auditor:** `.claude/agents/karimo/feedback-auditor.md`
**Feedback document template:** `.karimo/templates/FEEDBACK_DOCUMENT_TEMPLATE.md`

---

## Success Criteria

**Simple path complete when:**
- ✅ Learning file created in `.karimo/learnings/{category}/`
- ✅ Changes committed
- ✅ User confirms capture

**Complex path complete when:**
- ✅ Feedback document created
- ✅ Evidence gathered and analyzed
- ✅ Recommended changes presented
- ✅ Approved changes applied
- ✅ Changes committed
- ✅ User confirms resolution

**Batch mode complete when:**
- ✅ All selected learnings written to `.karimo/learnings/{category}/`
- ✅ Metrics updated with captured flags
- ✅ Changes committed

---

*This unified command replaces the legacy `/karimo-learn` workflow. All learning capture now flows through `/karimo:feedback` with intelligent complexity detection.*
