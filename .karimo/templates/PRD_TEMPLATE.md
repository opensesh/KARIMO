# PRD Template (v2)

**Version:** 2.0 (stable, v5.0 compatible)
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
github_project: ""         # Link to GitHub Project board (filled by /karimo:run)
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

**Visual Assets:**

> Images can be embedded using relative paths:
> ![Mockup](./assets/planning/mockup-name.png)
>
> Assets are stored in `.karimo/prds/{slug}/assets/` organized by stage:
> - `research/` - Screenshots and diagrams from research phase
> - `planning/` - Mockups and designs provided during interview
> - `execution/` - Bug screenshots or runtime context added during execution

**User Experience:**
{describe user flows, interactions, state transitions}

**Visual Design:**
{describe UI elements, layout, styling expectations}

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

## Research Findings (Optional)

> **Note:** This section is automatically generated by `/karimo:research --prd {slug}`.
> If no research was conducted, this section will not appear.
> Research enhances task briefs with patterns, libraries, and implementation guidance.

**Last Updated:** {timestamp}
**Research Status:** Draft | In Progress | Approved
**Research Rounds:** {number of annotation rounds, if any}

### Implementation Context

**Existing Patterns (Internal Research):**

- **Pattern Name:** Brief description
  - **Location:** `path/to/file.ts:42`
  - **Usage:** When and how to use this pattern
  - **Relevance:** Tasks {1a, 1b, 2a}

**Best Practices (External Research):**

- **Practice Name:** Brief description
  - **Source:** [{Title}]({URL}) (2026)
  - **Recommendation:** How to apply in this project
  - **Relevance:** Tasks {1a, 3b}

**Recommended Libraries:**

- **Library Name** (`npm-package-name`)
  - **Purpose:** What problem it solves
  - **Why:** Rationale for recommendation
  - **Version:** Current stable version
  - **Relevance:** Tasks {2a, 2b}
  - **Documentation:** {url}

**Critical Issues Identified:**

- ⚠️ **Issue Title:** Description of issue
  - **Impact:** What breaks or degrades
  - **Affected Tasks:** {1a, 1b}
  - **Recommended Fix:** How to address
  - **Priority:** Critical | High | Medium | Low

**Architectural Decisions:**

- **Decision Title:** Decision made based on research
  - **Context:** Why this decision matters
  - **Choice:** What was chosen
  - **Rationale:** Why this choice over alternatives
  - **Affected Tasks:** {All tasks | Specific tasks}

### Task-Specific Research Notes

**Task 1a: {Task Title}**

**Patterns to Follow:**
- Pattern from internal research (file:line reference)

**Known Issues to Address:**
- Issue identified in research with recommended solution

**Implementation Guidance:**
- Concrete implementation steps
- Libraries to use
- Files to reference

**Dependencies:**
- File dependencies with paths
- Library dependencies with versions

{Repeat for each task}

### Research Artifacts

Full research details available in:
- Internal patterns: `.karimo/prds/{slug}/research/internal/`
- External research: `.karimo/prds/{slug}/research/external/`
- Imported research: `.karimo/prds/{slug}/research/imported/`

To refine this research:
1. Add annotations to research artifacts using `<!-- ANNOTATION -->` syntax
2. Run: `/karimo:research --refine --prd {slug}`

See `.karimo/templates/ANNOTATION_GUIDE.md` for annotation syntax.

---

## Agent Tasks

> **Note:** Tasks are stored in a separate `tasks.yaml` file for parsing.
> See `./tasks.yaml` in this PRD folder.
>
> The execution plan is in `./execution_plan.yaml` (generated by the reviewer agent).

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
