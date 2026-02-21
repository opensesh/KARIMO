# Learn Interview Protocol

**Version:** 1.0
**Purpose:** Conduct structured learning interviews that produce targeted audit briefs for KARIMO configuration improvement
**Trigger:** `/karimo:learn` command
**Model:** Opus (recommended — this interview benefits from deep reasoning and nuanced follow-up)
**Output:** `interview.md` saved to `.karimo/learn/{timestamp}/`

---

## Overview

The Learn Interview is Mode 1 of the `/karimo:learn` compound learning cycle. Unlike the PRD Interview (which captures what to build), the Learn Interview captures what to improve about how KARIMO operates in this project. The output scopes and prioritizes the subsequent Learning Audit (Mode 2), ensuring subagents investigate only what matters — not every PRD ever created.

### How It Fits in the Learn Cycle

```
Mode 1: Interview (this protocol)     → interview.md
Mode 2: Learning Audit (subagents)    → findings.md
Mode 3: Review and Act (action plan)  → action-plan.md → changes-applied.md
```

### Key Principle

**Interview first, audit second.** The human knows what's hurting. The interview surfaces those pain points. The audit then goes and finds the evidence. This prevents wasting tokens auditing 100 PRDs when the human has 3 specific concerns.

---

## Pre-Interview Setup

Before the first question, the interviewer:

1. **Loads previous learn cycles** from `.karimo/learn/` (if any exist)
   - Reads the most recent `interview.md` and `changes-applied.md`
   - Notes which issues were flagged before and whether applied changes resolved them
2. **Scans PRD index** — counts completed PRDs in `.karimo/prds/`, reads their slugs and status (complete/active/failed), but does NOT deep-read status.json files yet (that's the audit's job)
3. **Reads current CLAUDE.md** — notes learnings, boundaries, commands, and project context
4. **Confirms with the developer:**

> "I've loaded [N] previous learn cycles, [N] completed PRDs, and your current KARIMO configuration. Ready to start the learning interview?"

If previous learn cycles exist, open with continuity:

> "Last time, you flagged [top concerns]. I can see we applied [changes]. Has that improved things, or is it still an issue?"

---

## Round 1: What's Hurting (~5 minutes)

**Purpose:** Surface the human's top frustrations, friction points, and observations about how KARIMO and its agents are performing.

**Output section:** `§1 Pain Points`

### Core Questions

1. **What's the most frustrating thing about working with KARIMO right now?** Don't filter — anything from agent behavior to workflow friction to output quality.
2. **Are agents making the same mistakes repeatedly?** Things you've noticed across multiple tasks or PRDs.
3. **Is there anything you keep having to fix manually after agents finish?** Patterns where agents get close but not right.
4. **How's the PRD interview process feeling?** Too long, too short, missing important questions, asking irrelevant ones?
5. **Are there areas where the configuration isn't matching how you actually work?** Boundaries that are too strict, too loose, or missing entirely.

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Agent keeps touching files it shouldn't | "Which files? Should these be added to `never_touch` or `require_review`?" |
| Design system not being followed | "Is this documented anywhere the agent can read? Or is it implicit knowledge we need to capture?" |
| PRD tasks are scoped wrong | "Are they too large, too small, or missing dependencies?" |
| Cost or token concerns | "Which types of tasks feel like they're burning tokens? Simple ones or complex ones?" |
| Workflow friction | "Walk me through where the friction happens — is it during planning, execution, review, or between cycles?" |
| Previous learn cycle issues persist | "What specifically didn't improve? Was the change applied but ineffective, or was it not applied at all?" |

### Interviewer Behavior

- **Listen for specifics.** If the human says "agents aren't following patterns," ask "which patterns?" and "can you point me to a specific PR or task where this happened?"
- **Separate symptoms from causes.** "The agent used inline styles" is a symptom. "The agent doesn't know about our Tailwind configuration" is a cause.
- **Capture the scope of each issue.** Is this one task, one PRD, or systemic across everything?

### Data Captured

```yaml
pain_points:
  - description: string     # What's wrong
    severity: high | medium | low
    scope: task | prd | systemic
    frequency: once | occasional | every_time
    example: string         # Specific instance if provided
```

---

## Round 2: Configuration Health (~5 minutes)

**Purpose:** Assess whether the current KARIMO configuration files (`CLAUDE.md`, `KARIMO_RULES.md`, agent definitions, templates) are accurate and serving the project well.

**Output section:** `§2 Configuration Assessment`

### Core Questions

1. **Are the KARIMO Learnings rules in CLAUDE.md still accurate?** Any rules that are outdated, too vague, or contradicting each other?
2. **Is anything missing from the boundaries?** Files or directories that agents modify when they shouldn't, or files flagged for review that don't need it anymore.
3. **How are the cost settings working?** Are cost ceilings appropriate for the complexity of work, or are agents running out of budget on reasonable tasks?
4. **Are there project conventions that agents don't know about?** Naming patterns, folder structures, import conventions, component hierarchies — anything not captured in config.
5. **Has your tech stack or architecture changed since the last learn cycle?** New libraries, deprecated patterns, restructured directories.

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Rules are contradicting | "Which rules? I'll flag these for consolidation in the audit." |
| Missing boundaries | "Let's list the files or patterns. I'll check if agents have been touching them." |
| Stack changes | "What changed? I'll flag affected agent context and templates for review." |
| Cost issues | "Are tasks running over budget, or are budgets so tight that agents can't finish?" |

### Data Captured

```yaml
configuration_assessment:
  claude_md_rules:
    outdated: string[]        # Rules that no longer apply
    conflicting: string[]     # Rules that contradict each other
    missing: string[]         # Conventions not yet captured
  config_yaml:
    boundary_additions: string[]   # Files to add to never_touch or require_review
    boundary_removals: string[]    # Files to remove from boundaries
    cost_adjustments: string       # Description of cost tuning needed
  stack_changes: string[]          # New libraries, patterns, or structure changes
```

---

## Round 3: Workflow and Process (~5 minutes)

**Purpose:** Evaluate the KARIMO workflow itself — the interview process, task decomposition, execution patterns, and review cycles.

**Output section:** `§3 Workflow Assessment`

### Core Questions

1. **How's the PRD interview flow?** Are the 5 rounds capturing what agents need, or are there gaps? Are rounds too long or too short?
2. **How's task decomposition working?** Are tasks the right size? Are dependencies accurate? Are agents getting enough context in `agent_context`?
3. **How's the execution flow?** Worktree management, PR creation, the handoff between agents — any friction?
4. **If you're using Greptile (Phase 2), how's the review quality?** Useful feedback or noise? Score thresholds appropriate?
5. **Is there anything about the KARIMO workflow you wish worked differently?** Dream state — if you could change one thing about how the system operates.

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Interview gaps | "What information do you find yourself adding in `/karimo:feedback` that should have been captured in the interview?" |
| Task sizing issues | "Are they typically too large (agents get lost) or too small (overhead of many small PRs)?" |
| Execution friction | "Is this a git/worktree issue, a coordination issue, or an agent capability issue?" |
| Review noise | "Can you give me an example of unhelpful Greptile feedback? This helps tune the review prompts." |

### Data Captured

```yaml
workflow_assessment:
  interview_process:
    gaps: string[]            # Missing questions or rounds
    redundancies: string[]    # Unnecessary or repetitive questions
    timing: string            # Overall pacing feedback
  task_decomposition:
    sizing: too_large | appropriate | too_small
    dependency_accuracy: high | medium | low
    context_quality: string   # Quality of agent_context fields
  execution:
    friction_points: string[] # Specific workflow friction
  review:
    quality: helpful | mixed | noisy
    threshold_appropriate: boolean
    examples: string[]        # Specific examples of good/bad reviews
```

---

## Round 4: Deep Dive (~5-10 minutes, dynamic)

**Purpose:** Go deeper on the top 2-3 issues from Rounds 1-3. This round is unstructured — Opus uses its judgment to ask the questions that will produce the most actionable audit brief.

**Output section:** `§4 Deep Dive Findings`

### Interviewer Behavior

This round is **not scripted.** Based on what emerged in Rounds 1-3, the interviewer:

1. **Ranks the top 2-3 issues** by severity and frequency
2. **Presents the ranking** to the human: "Based on what you've told me, here's what I think we should focus the audit on. Does this match your priorities?"
3. **Deep dives** into each priority issue:
   - Gets specific examples (PRD slugs, task IDs, file paths, PR numbers)
   - Understands the root cause (not just the symptom)
   - Identifies what the audit should look for (specific files, patterns, metrics)
   - Proposes what a fix might look like (to validate understanding)

### Dynamic Follow-Up Patterns

| Issue Type | Deep Dive Approach |
|------------|-------------------|
| Agent behavior patterns | "Show me a specific example. What did the agent do? What should it have done? Is this documented anywhere?" |
| Configuration gaps | "Let's walk through the ideal config for this. What would you change in CLAUDE.md right now?" |
| Workflow friction | "Walk me through the last time this happened step by step. Where exactly did it break down?" |
| Quality issues | "What does 'good' look like for this? Can you point me to a task or PR that got it right?" |
| Template issues | "Which template? What's missing or wrong? What would you add to it?" |

### Audit Scoping

For each deep-dive topic, the interviewer produces an **audit directive** — a specific instruction for what Mode 2 subagents should investigate:

```yaml
audit_directives:
  - topic: string              # What to investigate
    priority: 1 | 2 | 3        # Investigation priority
    data_sources:               # Where to look
      - status_json: string[]   # Specific PRD slugs to check
      - pr_history: string[]    # PR numbers or patterns to review
      - file_patterns: string[] # Files or directories to scan
      - greptile_scores: boolean
      - build_logs: boolean
    question_to_answer: string  # What the audit should determine
    hypothesis: string          # What the interviewer suspects based on conversation
```

### Data Captured

- Ranked priority list with human confirmation
- Specific examples and references for each priority
- Audit directives for Mode 2 subagents
- Proposed fix directions (validated with human)

---

## Round 5: Summary and Confirmation (~3 minutes)

**Purpose:** Confirm the interview captured everything accurately and that the audit scope is correct before handing off to Mode 2.

**Output section:** `§5 Summary and Audit Brief`

### Interviewer Behavior

1. **Present the full summary:**
   - Top pain points with severity
   - Configuration changes identified
   - Workflow improvements suggested
   - Audit directives with priorities

2. **Confirm scope:** "Here's what I'm going to hand to the audit team. They'll investigate [priorities] by looking at [data sources]. Does this cover it, or did we miss something?"

3. **Ask for additions:** "Anything else you want the audit to look into that we haven't discussed?"

4. **Set expectations:** "The audit will produce a findings document. After that, I'll generate an action plan with specific changes for your review. Nothing gets changed without your approval."

### Data Captured

- Human-confirmed audit scope
- Any additional items added in final round
- Confidence level on each priority (human assessment)

---

## Interview Output: `interview.md`

After Round 5, generate and save the interview document to `.karimo/learn/{timestamp}/interview.md`:

```markdown
# KARIMO Learn Interview

**Date:** {timestamp}
**Previous cycles:** {count}
**PRDs reviewed:** {count completed}
**Interviewer model:** Opus

---

## §1 Pain Points

{Structured pain points with severity, scope, frequency, examples}

## §2 Configuration Assessment

{Current config health, outdated rules, missing boundaries, stack changes}

## §3 Workflow Assessment

{Interview process, task decomposition, execution, review feedback}

## §4 Deep Dive Findings

### Priority 1: {Topic}
{Detailed findings, specific examples, root cause analysis}

### Priority 2: {Topic}
{Detailed findings, specific examples, root cause analysis}

### Priority 3: {Topic} (if applicable)
{Detailed findings, specific examples, root cause analysis}

## §5 Audit Brief

### Directives for Mode 2

{Structured audit directives with data sources, questions to answer, and hypotheses}

### Scope Confirmation

{Human-confirmed scope and any additions}

### Out of Scope

{Items discussed but deferred to future learn cycles}
```

---

## Tone and Style

- **Empathetic and curious** — you're a senior engineering coach helping someone reflect on their workflow
- **Specific over general** — always push for concrete examples, file names, PR numbers, task IDs
- **Separate observation from judgment** — "I'm hearing that agents don't follow the design system" not "The agents are failing"
- **Build on previous cycles** — reference past learn interviews to show continuity and track improvement
- **Respect the human's time** — Rounds 1-3 have structure but should move efficiently. Round 4 is where depth happens.
- **No assumptions** — if you suspect something, say "I suspect X based on what you said — is that right?" rather than asserting it

---

## Session Management

### Round Completion Signals

Users signal readiness to proceed with:
- "Next" / "Move on" / "Continue"
- "That covers it" / "Done with this section"
- "Ready for the next round"

### If the Interview is Interrupted

- Claude Code maintains conversation context
- Re-running `/karimo:learn` should detect an in-progress interview in the learn folder
- Resume from the last completed round

### Time Estimates

| Round | Estimated Duration | Notes |
|-------|-------------------|-------|
| 1 | ~5 min | Fast — surface-level concerns |
| 2 | ~5 min | Structured config walkthrough |
| 3 | ~5 min | Workflow assessment |
| 4 | ~5-10 min | Dynamic — varies by issue complexity |
| 5 | ~3 min | Confirmation and handoff |
| **Total** | **~23-28 min** | Can be shorter if few issues |

---

## Handoff to Mode 2

After saving `interview.md`, the learn command transitions to Mode 2 (Learning Audit). The audit directives from §5 become the investigation brief for subagents. The interviewer's role is complete.

The subagents receive:
- The full `interview.md` document
- Access to `.karimo/prds/` for status files and PRD content
- Access to PR history via `gh` CLI
- Access to the codebase for pattern verification
- The specific `audit_directives` that scope their investigation

---

*Part of the [KARIMO Learn Cycle](.karimo/docs/COMPOUND-LEARNING.md) — `/karimo:learn` command.*
