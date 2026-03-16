# Feedback Interview Protocol

**Version:** 2.0
**Purpose:** Conduct adaptive feedback interviews that identify problems and guide investigation or direct rule creation
**Trigger:** `/karimo-feedback` command (complex path)
**Model:** Opus (recommended for adaptive questioning and nuanced problem scoping)
**Output:** Investigation directives for feedback-auditor agent OR direct rule for `.karimo/learnings/{category}/`

---

## Overview

The Feedback Interview is the complex path of `/karimo-feedback`. Unlike the PRD Interview (which captures what to build), the Feedback Interview captures what's broken about how KARIMO or Claude Code operates in this project.

### Key Principle

**Focus on "what's broken" not "what are we building."** This is debugging and improvement, not feature planning.

### Adaptive Flow

The interview adapts based on complexity:
- **Simple feedback** (70% of cases): 0-3 clarifying questions → direct rule generation
- **Complex feedback** (30% of cases): 3-7 adaptive questions → investigation directives → feedback document

```
Initial Feedback
    │
    ▼
Complexity Detection
    │
    ├─► SIMPLE PATH: 0-3 questions → Rule → Create in learnings/{category}/
    │
    └─► COMPLEX PATH: 3-7 adaptive questions → Investigation → Feedback document
```

---

## Pre-Interview Setup

Before the first question, the interviewer:

1. **Loads existing feedback cycles** from `.karimo/feedback/` (if any exist)
   - Lists previous feedback documents and their status
   - Notes recurring issues that might indicate systemic problems

2. **Scans recent PRD history** — reads last 2-3 completed PRDs from `.karimo/prds/`
   - Identifies recent patterns and potential problem areas
   - Does NOT deep-read all status.json files (that's the auditor's job)

3. **Reads current config** — loads `.karimo/config.yaml` (boundaries, commands) and `.karimo/learnings/` (patterns, anti-patterns, project-notes, execution-rules)

4. **Confirms with the developer:**

> "I've loaded [N] previous feedback cycles and your current KARIMO configuration. What feedback do you have about how things are working?"

If the user provides initial feedback in the command, analyze it immediately for complexity.

---

## Complexity Detection

Analyze the initial feedback for these signals:

### Simple Signals (Quick Path)
- Specific file, component, or pattern mentioned
- Clear root cause stated
- Straightforward fix ("never do X", "always use Y")
- Single, well-defined issue
- Confident about what went wrong

### Complex Signals (Investigation Path)
- Vague symptoms ("something's wrong", "keeps failing")
- Scope indicators ("all tests", "system-wide", "deployment")
- Investigation language ("figure out why", "not sure what's causing")
- Multiple related issues tangled together
- Unclear root cause

### Decision Point

After analyzing initial feedback:

**If SIMPLE:**
- Ask 0-3 clarifying questions (only if needed)
- Generate rule immediately
- Skip to confirmation and create entry in `.karimo/learnings/{category}/`

**If COMPLEX:**
- Notify user: "This needs investigation. Starting adaptive interview..."
- Proceed with adaptive questioning below
- Generate investigation directives for feedback-auditor

---

## Adaptive Questioning (Complex Path Only)

When complexity is detected, conduct an adaptive interview with 3-7 questions across these categories:

### Category 1: Problem Scoping (1-2 questions)

**Purpose:** Define what's broken and when it happens

**Core Questions:**
- "When does this problem occur? Is it during specific types of tasks, PRDs, or always?"
- "Which files, components, or areas of the codebase are affected?"
- "Is this a recent change or has it been happening for a while?"

**Stop when:** Clear scope and occurrence pattern established

### Category 2: Evidence (1-2 questions)

**Purpose:** Identify where to find proof of the problem

**Core Questions:**
- "Which PRDs, tasks, or PRs show this problem? Can you point me to specific examples?"
- "What did the agent/system do wrong? What should it have done instead?"
- "Is there any pattern in the status.json files, build logs, or review comments?"

**Stop when:** At least 2-3 specific examples identified with clear evidence sources

### Category 3: Root Cause (1-2 questions)

**Purpose:** Understand why this is happening

**Core Questions:**
- "What do you think is causing this? Configuration gap, missing rule, tool limitation?"
- "Is there information the agents need but don't have access to?"
- "Is this about agent behavior, workflow process, or tooling?"

**Stop when:** Working hypothesis about root cause established

### Category 4: Desired State (1-2 questions)

**Purpose:** Define what "fixed" looks like

**Core Questions:**
- "What should the ideal behavior be? Show me an example if one exists."
- "What would prevent this from happening in future PRDs/tasks?"
- "Should this be a hard rule (never do X) or a guideline (prefer Y)?"

**Stop when:** Clear target state and fix approach identified

---

## Adaptive Stopping Conditions

**Stop questioning when ANY of:**
1. All 4 categories have at least 1 answer
2. Enough information to generate clear investigation directives
3. The problem becomes simple enough for direct rule (switch to simple path)
4. 7 questions reached (hard limit)

**Do NOT rigidly go through 5 rounds.** Adapt to the feedback complexity.

---

## Output Generation

### For Simple Path

Generate a rule immediately:

```markdown
**Learning Rule:**
{Clear, actionable rule statement}

**Context:** {Why this rule exists}
**Example:** {Specific instance if provided}
**Added:** {timestamp}
```

Present to user for confirmation, then create entry in `.karimo/learnings/{category}/` using the [template](../learnings/TEMPLATE.md).

### For Complex Path

Generate investigation directives for the feedback-auditor:

```yaml
investigation:
  problem: string              # What's broken or suboptimal
  slug: string                 # URL-friendly identifier for feedback document
  scope: string[]              # Files, PRs, tasks to investigate
  data_sources:
    status_json: string[]      # Specific PRDs to check
    pr_history: string[]       # Specific PRs to review
    file_patterns: string[]    # Patterns to search
    config_files: string[]     # Config files to analyze
  question_to_answer: string   # What needs to be determined
  hypothesis: string           # Suspected root cause
  desired_state: string        # What "fixed" looks like
```

Pass these directives to the feedback-auditor agent for evidence gathering.

---

## Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Vague description | "Can you show me a specific example? Which PR or task number?" |
| Multiple issues mentioned | "These sound like separate issues. Should we focus on one or investigate them together?" |
| Unclear scope | "Is this affecting one file, one type of task, or everything?" |
| Missing evidence | "Do you have a PR number, task ID, or file path where this happened?" |
| User uncertain about cause | "That's okay — the investigation will determine the root cause. Tell me what you've observed." |
| Complexity changes mid-interview | "This is becoming more complex than expected. Should I switch to investigation mode?" |

---

## Interview Behavior

### Tone and Style
- **Debugging mindset** — treat this like a root cause analysis session
- **Evidence-focused** — always ask for specific examples
- **Adaptive** — stop when you have enough, don't force all questions
- **No assumptions** — if uncertain, ask clarifying questions
- **Respect time** — simple path should be < 5 min, complex path < 15 min

### Question Patterns

**Good questions:**
- "Show me an example where this went wrong."
- "What should have happened instead?"
- "Which files/PRs/tasks demonstrate this problem?"

**Avoid:**
- "What feature do you want?" (That's PRD territory)
- "How many user stories?" (Wrong framing)
- "What are the requirements?" (Not building, fixing)

---

## Edge Cases

### Multiple Distinct Issues

**Scenario:** User provides 3 separate observations in initial feedback

**Handling:**
```
"I'm seeing three distinct issues here:
1. {Issue 1}
2. {Issue 2}
3. {Issue 3}

Would you like to:
A) Handle each as a separate quick rule (simple path)
B) Investigate them together (if they're related)
C) Pick one to focus on right now"
```

### Complexity Changes Mid-Interview

**Scenario:** Started on simple path, becomes complex during questioning

**Handling:**
```
"This is more complex than I initially thought. I recommend switching to
investigation mode where I'll gather evidence and create a feedback document.
Sound good?"
```

### No Clear Examples

**Scenario:** User knows something's wrong but can't point to specifics

**Handling:**
- Switch to investigation mode
- Add directive to search recent PRDs for patterns
- Hypothesis: "General quality concern requiring evidence gathering"

---

## Handoff Points

### Handoff to Simple Path Completion

After confirming the rule:
1. Create entry in `.karimo/learnings/{category}/{YYYY-MM-DD}-{slug}.md`
2. Commit: `chore(feedback): add rule - {summary}`
3. Confirm with user: "Rule added. Agents will see this on next task."

### Handoff to Feedback Auditor

After generating investigation directives:
1. Pass directives to `karimo-feedback-auditor` agent
2. Auditor investigates (5-10 min) and returns findings
3. Create feedback document at `.karimo/feedback/{slug}.md`
4. Present recommended changes for approval
5. Apply approved changes to config files
6. Commit: `chore(feedback): {summary from investigation}`

---

## Session Management

### Interruption Handling

- Claude Code maintains conversation context
- Re-running `/karimo-feedback` should detect in-progress feedback
- Resume from where it left off

### Time Expectations

| Path | Estimated Duration | Notes |
|------|-------------------|-------|
| Simple | < 5 min | 0-3 questions + rule confirmation |
| Complex | 10-20 min | 3-7 questions + investigation + approval |
| Batch (from metrics) | 5-10 min | Pre-identified candidates, quick review |

---

*Part of the unified `/karimo-feedback` command — replaces legacy `/karimo-learn` workflow.*
