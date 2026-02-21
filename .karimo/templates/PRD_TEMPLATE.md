# PRD Template (v2)

**Version:** 2.0
**Purpose:** Output format for PRDs generated through the KARIMO v2 interview system
**Usage:** Generated automatically after interview via `/karimo:plan`

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
status: "draft"            # draft | ready | active | complete
created_date: ""           # ISO date (e.g., 2026-02-19)
target_date: ""            # Target completion (optional, ISO date)
phase: ""                  # e.g., "Phase 1: Token Studio"
scope_type: ""             # new-feature | refactor | migration | integration
github_project: ""         # Link to GitHub Project board (filled by /karimo:execute)
links: []                  # Figma, Miro, docs, research URLs
checkpoint_refs: []        # IDs of checkpoints consulted during Round 5
cross_feature_blockers: [] # Features that must be merged to main before this PRD executes
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

> Images can be embedded using relative paths: `![Mockup](./assets/mockup.png)`

**Key screens & states:**

- Empty state: What the user sees with no data
- Loading state: Skeleton, spinner, or progressive load
- Error state: What happens when something fails
- Success state: Confirmation, toast, redirect

**Accessibility:** Requirements for keyboard navigation, screen readers, contrast ratios.

**Responsive:** Breakpoints and behavior changes across viewport sizes.

---

## 6. Dependencies & Risks

### Cross-Feature Blockers

> **KARIMO operates one PRD per feature branch.** If this feature depends on another feature that isn't merged to main yet, list it here. The PM Agent validates these blockers before execution starts.

| Feature | Status | Notes |
| ------- | ------ | ----- |
| Feature name/slug | Merged / In Progress / Not Started | When expected, workaround if delayed |

_Leave empty if no cross-feature dependencies exist._

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

**Phase/level:** Where this sits in the build sequence.

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

- Note on model selection and loop count accuracy from prior phases

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

> **Note:** Tasks are stored in a separate `tasks.yaml` file for parsing.
> See `./tasks.yaml` in this PRD folder.
>
> The dependency graph is in `./dag.json` (generated by the reviewer agent).

**Task Summary:**

| ID | Title | Complexity | Priority | Dependencies |
|----|-------|------------|----------|--------------|
| 1a | Task title | 5 | must | - |
| 1b | Task title | 3 | must | 1a |

---

## Appendix: Images

Images referenced during the interview are stored in `./assets/`:

- `./assets/mockup.png` — UI mockup
- `./assets/flow.png` — User flow diagram

---

*Generated by [KARIMO v2](https://github.com/opensesh/KARIMO) interview system*
