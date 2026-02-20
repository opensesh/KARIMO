# PRD Interview Protocol (v2)

**Version:** 2.0
**Purpose:** Conduct structured interviews that produce agent-executable PRDs
**Output format:** See [PRD_TEMPLATE.md](./PRD_TEMPLATE.md)
**Task schema:** See [TASK_SCHEMA.md](./TASK_SCHEMA.md)

---

## Overview

The KARIMO v2 interview system uses Claude Code agents to conduct structured interviews. The interviewer agent (`@karimo-interviewer.md`) leads the conversation, optionally spawning the investigator (`@karimo-investigator.md`) for codebase analysis and the reviewer (`@karimo-reviewer.md`) for validation.

### Agent Roles

| Agent | Role | When Spawned |
|-------|------|--------------|
| `karimo-interviewer` | Conducts 5-round interview | `/karimo:plan` command |
| `karimo-investigator` | Scans codebase for patterns/files | Round 3 (opt-in) |
| `karimo-reviewer` | Validates PRD before saving | After Round 5 |

---

## Quick Reference: Rounds to PRD Sections

| Round | Name | Duration | PRD Sections Filled |
|-------|------|----------|---------------------|
| 1 | Framing | ~5 min | §1 Executive Summary |
| 2 | Requirements | ~10 min | §3 Goals, §4 Requirements, §5 UX Notes |
| 3 | Dependencies | ~5 min | §6 Dependencies, §7 Rollout, §8 Milestones |
| 4 | Agent Context | ~5 min | §11 Agent Boundaries |
| 5 | Retrospective | ~3 min | §10 Checkpoint Learnings |

---

## Pre-Interview Setup

Before the first question, the interviewer:

1. Loads `.karimo/config.yaml` (if exists)
2. Loads previous PRDs from `.karimo/prds/` for retrospective context
3. Reads this protocol and the PRD template
4. Confirms with the developer:

> "I've loaded your project config and [N] previous PRDs. Ready to start?"

If no config exists, defaults are used and config will be generated in Round 4.

---

## Round 1: Framing (~5 minutes)

**Purpose:** Establish scope, success criteria, and risk.

**PRD sections filled:** §1 Executive Summary

### Core Questions

1. **What are we building?** Describe the feature in plain language.
2. **What would you demo when this is done?** Walk through the screen, flow, output.
3. **What's the thing most likely to go wrong?** The biggest risk.
4. **Is this MVP or polished?** Ambition level for this phase.
5. **Who uses this?** Target user and workflow change.

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Data model changes | "Migration risk? Rollback strategy?" |
| External dependencies | "Ready now? Fallback if not ready?" |
| Tight deadline | "What can be cut?" |

### Data Captured

- `executive_summary.one_liner`
- `executive_summary.done_looks_like`
- `executive_summary.primary_risk`
- `executive_summary.scope_type`
- `executive_summary.target_user`

---

## Round 2: Requirements (~10 minutes)

**Purpose:** Break the feature into concrete requirements with priorities.

**PRD sections filled:** §3 Goals, §4 Requirements, §5 UX Notes

### Question Flow

1. Walk through each sub-component from Round 1
2. For each: "Is this Must, Should, or Could?"
3. For Must requirements: "What are the acceptance criteria?"
4. "Are there implicit requirements we haven't said out loud?"
5. "What should the agent NOT do?"

### Conditional Follow-Ups

| Trigger | Follow-Up |
|---------|-----------|
| Complexity > 6 | "Can we split this into two tasks?" |
| UI work | "Design references? Responsive requirements?" |
| Data work | "Validation rules? Error states?" |

### Data Captured

- `requirements[]` with priority, description, acceptance criteria
- `non_goals[]`
- Initial task decomposition

---

## Round 3: Dependencies & Architecture (~5 minutes)

**Purpose:** Establish task ordering and file-level scope.

**PRD sections filled:** §6 Dependencies, §7 Rollout, §8 Milestones

### Question Flow

1. "Which requirements can be worked on independently?"
2. "What's the dependency chain?"
3. "Are there files multiple requirements will touch?"
4. "External blockers?"
5. "Testing strategy?"

### Investigator Agent (Opt-In)

The interviewer offers to spawn the investigator:

> "Would you like me to scan the codebase to identify affected files and existing patterns?"

If accepted, the investigator scans for:
- Affected files per task
- Existing patterns to follow
- File overlaps between tasks
- Import/dependency chains

Results populate `tasks[].files_affected` and `tasks[].agent_context`.

### Data Captured

- `tasks[].depends_on`
- `tasks[].files_affected`
- Parallel vs. sequential recommendations
- External blockers and fallback plans

---

## Round 4: Agent Context (~5 minutes)

**Purpose:** Give agents guidance for first-attempt success.

**PRD sections filled:** §11 Agent Boundaries

### Question Flow

1. "For each task, are there existing patterns to follow?"
2. "Any undocumented gotchas?"
3. "How handle edge cases — fail loudly or degrade gracefully?"
4. "Design tokens or component libraries to use?"
5. "What would make you reject a PR?"

### Config Generation (First Run)

If no `.karimo/config.yaml` exists, the interviewer collects:
- Project metadata (name, language, framework, runtime)
- Build commands (build, lint, test, typecheck)
- Coding rules
- Sensitive files for `require_review`

Config is saved after PRD approval.

### Data Captured

- `tasks[].agent_context`
- Updated `tasks[].success_criteria`
- `require_review` additions

---

## Round 5: Retrospective (~3 minutes)

**Purpose:** Feed learnings from previous work.

**PRD sections filled:** §10 Checkpoint Learnings

### If No Previous PRDs

> "No checkpoint data yet — we'll start collecting after first task. Any general learnings to incorporate?"

### If Previous PRDs Exist

1. Summarize patterns that worked, anti-patterns flagged
2. "Does this change our approach?"
3. "New rules to add?"

### Data Captured

- Adjusted estimates
- Updated `agent_context` with retrospective patterns
- New rules for config

---

## Post-Interview: PRD Generation

After Round 5:

1. **Generate PRD** following template
2. **Calculate derived fields:**
   - `cost_ceiling = complexity × cost_multiplier`
   - `estimated_iterations = base_iterations + (complexity × iteration_multiplier)`
   - `revision_budget = cost_ceiling × (revision_budget_percent / 100)`
3. **Spawn reviewer agent** for validation
4. **Address issues** flagged by reviewer
5. **Save artifacts** to PRD folder

---

## PRD Folder Structure

```
.karimo/prds/001_feature-slug/
├── PRD.md              # Narrative document
├── tasks.yaml          # Task definitions (parsed by orchestrator)
├── dag.json            # Dependency graph (generated by reviewer)
├── assets/             # Images from interview
│   ├── mockup.png
│   └── flow.png
└── status.json         # Execution state
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
- Re-running `/karimo:plan` continues from where you left off
- PRD progress is preserved in the conversation

---

*Generated by [KARIMO v2](https://github.com/opensesh/KARIMO)*
