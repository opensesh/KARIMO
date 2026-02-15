# PRD Template

**Version:** 1.0
**Purpose:** Output format for PRDs generated through the KARIMO interview protocol
**Usage:** Generated automatically after interview, or hand-written for manual PRD creation

---

```yaml
# ============================================================
# PRD METADATA
# This block is parsed by the orchestrator for project setup.
# ============================================================
---
feature_name: ""           # Human-readable feature name
feature_slug: ""           # URL-safe slug (used for branch names, GitHub Project name)
owner: ""                  # Who ran the interview / owns this feature
status: "draft"            # draft | active | complete
created_date: ""           # ISO date (e.g., 2026-02-14)
target_date: ""            # Target completion (optional, ISO date)
phase: ""                  # e.g., "Phase 1: Token Studio"
scope_type: ""             # new-feature | refactor | migration | integration
github_project: ""         # Link to GitHub Project board
links: []                  # Figma, Miro, docs, research URLs
checkpoint_refs: []        # IDs of checkpoints consulted during Round 5
---
```

---

## 1. Executive Summary

**One-liner:** What this feature is in one sentence.

**What's changing:** What exists today vs. what will exist after this ships.

**Who it's for:** Target user and their workflow before/after.

**Why now:** Why this feature, why this priority order.

**Done looks like:** The demo scenario — what you'd show someone to prove it works.

**Primary risk:** The thing most likely to go wrong or take longer than expected.

---

## 2. Problem & Context

**Problem statement:** Describe the pain point or gap this feature addresses.

**Supporting data / evidence:** Research, user feedback, metrics, or context docs that justify this work.

**What happens if we don't build this:** The cost of inaction.

**Strategic fit:** How this connects to the broader product roadmap.

---

## 3. Goals, Non-Goals & Success Metrics

### Goals

1. Goal one
2. Goal two
3. Goal three

### Non-Goals

- Non-goal one
- Non-goal two

### Success Metrics

| Metric | Baseline | Target | How Measured |
| ------ | -------- | ------ | ------------ |
| Metric one | Current state | Desired state | Measurement method |

---

## 4. Requirements

### Must Have (blocks launch)

| ID | Requirement | Acceptance Criteria |
| -- | ----------- | ------------------- |
| R1 | Description | What must be true for this to pass review |
| R2 | Description | What must be true for this to pass review |

### Should Have (important, not blocking)

| ID | Requirement | Acceptance Criteria |
| -- | ----------- | ------------------- |
| R3 | Description | What must be true for this to pass review |

### Could Have (nice to have, cut first)

| ID | Requirement | Acceptance Criteria |
| -- | ----------- | ------------------- |
| R4 | Description | What must be true for this to pass review |

---

## 5. UX & Interaction Notes

**Design references:** Links to Figma, existing pages to follow, component patterns.

**Key screens & states:**

- Empty state: What the user sees with no data
- Loading state: Skeleton, spinner, or progressive load
- Error state: What happens when something fails
- Success state: Confirmation, toast, redirect

**Accessibility:** Requirements for keyboard navigation, screen readers, contrast ratios.

**Responsive:** Breakpoints and behavior changes across viewport sizes.

---

## 6. Dependencies & Risks

### External Blockers

| Blocker | Status | Fallback |
| ------- | ------ | -------- |
| Description | Ready / Not ready / Unknown | What to do if it's not ready |

### Internal Dependencies

- Dependency one
- Dependency two

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| Primary risk from Round 1 | High/Med/Low | High/Med/Low | Mitigation strategy |

---

## 7. Rollout Plan

**Phase/ring:** Where this sits in the build sequence.

**Deployment strategy:** Feature flag, direct merge, staged rollout.

**Rollback plan:** What to do if something breaks after merge.

**Monitoring:** How you'll know if something is wrong in production.

---

## 8. Milestones & Release Criteria

| Milestone | What's True When Done | Target Date |
| --------- | --------------------- | ----------- |
| Milestone one | Criteria | Date |

**Release criteria (what must be true to ship):**

- Criterion one
- Criterion two

---

## 9. Open Questions

| # | Question | Status | Resolution |
| - | -------- | ------ | ---------- |
| Q1 | Question text | Open / Resolved | Resolution if resolved |

---

## 10. Checkpoint Learnings

**Patterns to reinforce (from previous checkpoints):**

- Pattern one

**Anti-patterns to avoid:**

- Anti-pattern one

**Estimate calibration notes:**

- Note on cost/iteration accuracy from prior phases

---

## 11. Agent Boundaries (Phase-Specific)

**Files the agent should reference for patterns:**

- `path/to/example-file.ts`

**Files the agent should NOT touch (beyond the global `never_touch` list):**

- `path/to/protected-file.ts`

**Architecture decisions already made (don't re-decide):**

- Decision one

**Known gotchas discovered since the implementation plan:**

- Gotcha one

---

## Agent Tasks

```yaml
# ============================================================
# AGENT TASKS
# This section is parsed by the KARIMO orchestrator.
# Each task becomes a GitHub Issue with custom fields.
# Narrative sections above are for human context.
# If narrative and tasks conflict, narrative wins — update tasks to match.
# ============================================================

tasks:
  - id: ""
    # Unique task ID within this feature (e.g., "1a", "1b", "2a")

    title: ""
    # Short, descriptive title (becomes the GitHub Issue title)

    description: |
      # 2–3 sentence description of what the agent should build.
      # Reference the requirement ID (R1, R2) this task fulfills.

    depends_on: []
    # List of task IDs that must complete before this task starts.

    complexity: 0
    # 1–10 scale. Drives cost_ceiling and estimated_iterations.

    estimated_iterations: 0
    # Formula: base_iterations + (complexity × iteration_multiplier)

    cost_ceiling: 0
    # Formula: complexity × cost_multiplier

    revision_budget: 0
    # Formula: cost_ceiling × (revision_budget_percent / 100)

    priority: "must"
    # must | should | could

    assigned_to: ""
    # Task owner. Defaults to the PRD owner.

    success_criteria: []
    # List of 3–5 concrete, testable criteria.

    files_affected: []
    # File paths this task will likely modify.

    agent_context: |
      # Free-text guidance for the agent. Include:
      # - Specific files to reference as patterns
      # - Known gotchas or edge cases
      # - Design tokens or component libraries to use
```

---

## Task Schema Reference

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `id` | string | Yes | Unique task identifier within the phase |
| `title` | string | Yes | Short description for GitHub Issue title |
| `description` | string | Yes | Full task description for the agent |
| `depends_on` | string[] | Yes | Task IDs that must complete first |
| `complexity` | number (1–10) | Yes | Drives cost ceiling and iteration limits |
| `estimated_iterations` | number | Yes | Calculated from config |
| `cost_ceiling` | number | Yes | Calculated from config |
| `revision_budget` | number | Yes | Calculated from config |
| `priority` | must/should/could | Yes | From requirements section |
| `assigned_to` | string | Yes | Task owner |
| `success_criteria` | string[] | Yes | What must be true to pass review |
| `files_affected` | string[] | Yes | File paths for overlap detection |
| `agent_context` | string | Optional | Additional context and patterns |
