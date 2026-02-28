# PRD Interview Protocol (v3)

**Version:** 3.0
**Purpose:** Single source of truth for PRD interview structure and model assignment
**Output format:** See [PRD_TEMPLATE.md](./PRD_TEMPLATE.md)
**Task schema:** See [TASK_SCHEMA.md](./TASK_SCHEMA.md)

---

## Overview

The KARIMO interview system conducts structured interviews to produce agent-executable PRDs. This protocol defines the complete interview flow, agent roles, and output mapping.

### Agent Roles

| Agent | Role | Model | When Spawned |
|-------|------|-------|--------------|
| `karimo-interviewer` | Conducts 4-round interview | Sonnet | `/karimo-plan` command |
| `karimo-investigator` | Scans codebase for patterns/files | Sonnet | Step 0 (auto) + Round 3 (opt-in) |
| `karimo-reviewer` | Validates PRD before saving | Sonnet | After Round 4 |

---

## Quick Reference

### Round to PRD Section Mapping

| Round | Name | Duration | PRD Sections Filled |
|-------|------|----------|---------------------|
| 0 | Auto-Detection | ~1 min | Project context (first run only) |
| 1 | Framing | ~5 min | §1 Executive Summary |
| 2 | Requirements | ~10 min | §3 Goals, §4 Requirements, §5 UX Notes |
| 3 | Dependencies | ~5 min | §6 Dependencies, §7 Rollout, §8 Milestones |
| 4 | Retrospective | ~3 min | §10 Checkpoint Learnings |

### Model Assignment Rules

Task complexity determines which model executes the task:

| Complexity | Model | Rationale |
|------------|-------|-----------|
| 1–4 | Sonnet | Efficient for straightforward tasks |
| 5–10 | Opus | Complex reasoning, multi-file coordination |

**Assignment is deterministic:** There are no borderline cases or variants. A complexity score maps directly to a model.

### Complexity Scoring Guidelines

| Score | Description | Indicators |
|-------|-------------|------------|
| 1-2 | Trivial | Single file, clear pattern, <50 lines |
| 3-4 | Standard | 2-3 files, established patterns, clear requirements |
| 5-6 | Moderate | 4-5 files, some coordination, new patterns |
| 7-8 | Complex | Multi-file coordination, architectural decisions |
| 9-10 | Very Complex | System-wide changes, complex state management |

---

## Step 0: Auto-Detection (First Run)

Before the interview starts, `/karimo-plan` checks `.karimo/config.yaml`:

**If first run (no config exists):**
1. Spawn investigator in `--mode context-scan`
2. Auto-detect runtime, framework, commands, boundaries
3. Present findings for user approval
4. Create `.karimo/config.yaml` with detected values

**If subsequent run:**
1. Spawn investigator in `--mode drift-check`
2. Report any configuration drift
3. User acknowledges changes

---

## Pre-Interview Setup

Before the first question, the interviewer:

1. Load project configuration from `.karimo/config.yaml`
2. Load `.karimo/learnings.md` for compound learning context
3. Read previous PRDs from `.karimo/prds/` for retrospective context
4. Read this protocol and the PRD template

---

## Round 1: Framing (~5 minutes)

**Purpose:** Establish scope, success criteria, and risk.

**PRD sections filled:** §1 Executive Summary

### Core Questions (Always Ask)

1. **What are we building?** Describe the feature in plain language — what it does, not how it's built.
2. **What would you demo when this is done?** Walk through the screen, flow, output.
3. **What's the thing most likely to go wrong or take longer than expected?** The biggest risk.
4. **Is this MVP-get-it-working or polished-ship-it?** Ambition level for this phase.
5. **Who uses this? What's their workflow before and after?** Target user and workflow change.

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Data model changes | "What's the migration risk? Do you have a rollback strategy?" |
| External dependencies | "Are those ready now? Fallback if not ready?" |
| Tight deadline | "What can be cut? What's truly non-negotiable?" |

### Data Captured

- `executive_summary.one_liner`
- `executive_summary.done_looks_like`
- `executive_summary.primary_risk`
- `executive_summary.scope_type` (new feature / refactor / migration / integration)
- `executive_summary.target_user`

### Round Completion

After Round 1:
- Summarize what you heard in 2-3 sentences
- State the scope classification
- Confirm: "Does that capture it, or did I miss something?"

---

## Round 2: Requirements (~10 minutes)

**Purpose:** Break the feature into concrete requirements with priorities.

**PRD sections filled:** §3 Goals, §4 Requirements, §5 UX Notes

### Question Flow

1. Walk through each sub-component or capability described in Round 1
2. For each component: "Is this a Must (blocks launch), Should (important but not blocking), or Could (nice to have)?"
3. For each **Must** requirement: "What are the specific acceptance criteria? If I handed you a PR, what would you check?"
4. For each **Should/Could**: "If we're running short on time or capacity, is this the first thing you'd cut?"
5. After stated requirements: "Are there requirements you're assuming that we haven't said out loud?"
6. "What should the agent definitely NOT do? What's off-limits for this feature?"

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Requirement complexity > 6 | "This feels like it could be split. Can we break it into two tasks?" |
| Unclear boundaries | "Let's draw a hard line. What's in scope for this phase, and what gets pushed to next?" |
| UI work mentioned | "Are there design references, component patterns, or responsive requirements?" |
| Data work mentioned | "What are the validation rules? What does the error state look like?" |

### Data Captured

- `requirements[]` with priority, description, acceptance criteria
- `non_goals[]`
- Initial task decomposition

### Round Completion

After Round 2:
- Read back the prioritized requirement list
- Flag any requirements that feel too large for a single agent task
- Confirm: "This is what agents will be working from. Anything to add or change?"

---

## Round 3: Dependencies & Architecture (~5 minutes)

**Purpose:** Establish task ordering, parallel opportunities, and file-level scope.

**PRD sections filled:** §6 Dependencies, §7 Rollout, §8 Milestones

### Question Flow

1. "Which requirements can be worked on independently — no shared state, no shared files?"
2. "Which ones must complete before others can start? What's the dependency chain?"
3. "Are there files that multiple requirements will touch?" (Explain file-overlap detection)
4. "Are there external blockers — APIs not ready, design decisions not made?"
5. "What's the testing strategy? Existing tests that must keep passing? New tests needed?"

### Investigator Agent (Opt-In)

Offer to spawn the investigator:

> "Codebase scan available to identify affected files and existing patterns. Proceed? [Y/n]"

If accepted, the investigator scans for:
- Affected files per task
- Existing patterns to follow
- File overlaps between tasks
- Import/dependency chains

Results populate `tasks[].files_affected` and `tasks[].agent_context`.

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| File overlap detected | "Tasks [X] and [Y] both touch [file]. Should we restructure, or are you okay with them running sequentially?" |
| Shared service/utility mentioned | "Should we extract that as its own task — build the shared piece first?" |
| External blockers exist | "What's the fallback? If [blocker] isn't ready, can the agent stub it out?" |
| Cross-feature dependency | "That feature needs to be merged to main first. Should we mark this as an external blocker, or is that feature already shipped?" |

### Data Captured

- `external_blockers[]` — APIs, decisions, or dependencies not controlled by this PRD
- `cross_feature_blockers[]` — Features that must be merged to main before this PRD can execute
- `file_overlaps[]` — Files touched by multiple tasks (impacts parallelization)
- `dependency_chain` — Task ordering based on requirements
- `tasks[].depends_on`
- `tasks[].files_affected`

### Round Completion

After Round 3:
- Present the dependency graph in text form
- Flag file overlaps
- Confirm: "Does this ordering make sense?"

---

## Round 4: Retrospective (~3 minutes)

**Purpose:** Feed compound learning data into the current plan.

**PRD section filled:** §10 Checkpoint Learnings

### If No Previous PRDs

> "No checkpoint data from previous phases — we'll start collecting after this feature's first task completes. Do you have any general learnings from previous work you'd like to incorporate?"

### If Previous PRDs Exist

1. Summarize the latest checkpoint data:
   - "Patterns that worked well: [list]"
   - "Anti-patterns that were flagged: [list]"
   - "Cost estimates were [over/under] by [X]% on average"
   - "These files caused integration failures: [list]"
2. "Does any of this change how we should approach this feature?"
3. "Are there new rules we should add — things you want agents to always do or never do?"

### If .karimo/learnings.md Exists

1. Reference relevant learnings from the project's accumulated knowledge
2. Apply applicable patterns and anti-patterns to task context
3. Note any learnings that specifically apply to this feature's scope

### Data Captured

- Adjusted estimates
- Updated `agent_context` with retrospective patterns
- Learnings to add to `.karimo/learnings.md`

### Round Completion

After Round 4:
- Note adjustments to task estimates and agent context
- Confirm: "Incorporating learnings. Generate PRD now? [Y/n]"

---

## Post-Interview: PRD Generation

After Round 4:

### 1. Generate PRD

Follow `.karimo/templates/PRD_TEMPLATE.md` structure.

### 2. Generate tasks.yaml

Create task definitions following `.karimo/templates/TASK_SCHEMA.md`.

### 3. Assign Models

Apply model assignment based on complexity:
- Complexity 1–4 → Sonnet
- Complexity 5–10 → Opus

Record model in each task entry.

### 4. Generate Execution Plan

Create `execution_plan.yaml` following `.karimo/templates/EXECUTION_PLAN_SCHEMA.md`.

### 5. Spawn Reviewer Agent

Spawn `karimo-reviewer` for validation with:
- Generated PRD content
- tasks.yaml
- execution_plan.yaml

### 6. Address Issues

If reviewer flags issues:
- Address each concern
- Re-submit for validation

### 7. Save Artifacts

On approval, save to PRD folder:
```
.karimo/prds/{NNN}_{slug}/
├── PRD.md
├── tasks.yaml
├── execution_plan.yaml
├── status.json (initial state)
├── findings.md (empty template)
├── dependencies.md (from template)
└── assets/
```

---

## PRD Folder Structure

```
.karimo/prds/001_feature-slug/
├── PRD.md              # Narrative document
├── tasks.yaml          # Task definitions (parsed by PM agent)
├── execution_plan.yaml # Wave-based execution plan
├── status.json         # Execution state
├── findings.md         # Cross-task discoveries (maintained by PM)
├── dependencies.md     # Runtime dependencies (maintained by agents)
├── briefs/             # Generated briefs per task (created by brief-writer)
│   ├── 1a.md
│   ├── 1b.md
│   └── ...
└── assets/             # Images from interview
    ├── mockup.png
    └── flow.png
```

---

## Image Handling

Images can be attached during the interview:
- Screenshots of UI mockups
- Figma exports
- Diagrams or flowcharts

Images are stored in `.karimo/prds/{slug}/assets/` and referenced using relative paths in the PRD: `./assets/mockup.png`

---

## Round Completion Signals

Users signal readiness to proceed:
- "Ready to move on" / "Next" / "Proceed"
- "Done with this section" / "That covers it"
- "Continue" / "Move on"

The interviewer confirms and transitions to the next round.

---

## Session Resume

If the interview is interrupted:
- Claude Code maintains conversation context
- Re-running `/karimo-plan` continues from where you left off
- PRD progress is preserved in the conversation

---

*Generated by [KARIMO v3](https://github.com/opensesh/KARIMO)*
