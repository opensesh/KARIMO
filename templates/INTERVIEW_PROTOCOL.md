# PRD Interview Protocol

**Version:** 1.1
**Purpose:** Conduct structured interviews that produce agent-executable PRDs
**Output format:** See [PRD_TEMPLATE.md](./PRD_TEMPLATE.md)

---

## Quick Reference: Rounds to PRD Sections

| Round | Name | Duration | PRD Sections Filled |
|-------|------|----------|---------------------|
| 1 | Framing | ~5 min | §1 Executive Summary |
| 2 | Requirements | ~10 min | §3 Goals, §4 Requirements, §5 UX Notes |
| 3 | Dependencies | ~5 min | §6 Dependencies, §7 Rollout, §8 Milestones |
| 4 | Agent Context | ~5 min | §11 Agent Boundaries |
| 5 | Retrospective | ~3 min | §10 Checkpoint Learnings |

See [PRD_TEMPLATE.md](./PRD_TEMPLATE.md) for the complete PRD structure.

---

## Context Overflow Handling

Long interviews may exceed the conversation context window. When this happens:

1. **Detection** — Token count approaches 90% of model capacity (~4 chars/token estimate)
2. **Summarization** — Completed rounds are condensed to key decisions
3. **Continuation** — New API call with PRD file + summary as context
4. **User experience** — Seamless; user doesn't notice the transition

Summaries are stored in the session and enable resume across terminal sessions.

---

## Round Completion

A round is complete when the user signals readiness to proceed. Common phrases:

- "Ready to move on"
- "Proceed to next round"
- "That covers it"
- "Next"
- "Done with this section"

The agent confirms round completion and transitions to the next.

---

## Pre-Interview Setup

Before the first question, complete this checklist:

- [ ] Developer triggers the interview (via `karimo` guided flow or `/karimo:plan` command)
- [ ] Load the project's `.karimo/config.yaml` (rules, boundaries, cost settings)
- [ ] Load any attached context documents (implementation plans, design specs, research notes)
- [ ] Load the latest checkpoint data from completed phases (if any exist)
- [ ] Read `PRD_TEMPLATE.md` to understand the output format
- [ ] Confirm with the developer:

> "I've loaded your project config, [N] context documents, and checkpoint data from [phases]. Ready to start?"

If no config exists, use defaults: `cost_multiplier: 3`, `base_iterations: 5`, `iteration_multiplier: 3`, `revision_budget_percent: 50`.

---

## Round 1: Framing (~5 minutes)

**Purpose:** Establish scope, success criteria, and risk.

**PRD sections filled:** §1 Executive Summary

### Core Questions (always ask)

1. **What are we building?** Describe the feature in plain language — what it does, not how it's built.
2. **What would you demo when this is done?** Walk me through the screen, the flow, the output.
3. **What's the thing most likely to go wrong or take longer than expected?** The biggest risk.
4. **Is this MVP-get-it-working or polished-ship-it?** What's the ambition level for this phase?
5. **Who uses this? What's their workflow before and after?** Target user and the change in their experience.

### Conditional Follow-Ups

| Trigger | Follow-Up |
| ------- | --------- |
| Feature touches existing data models or database schema | "What's the migration risk? Do you have a rollback strategy?" |
| Feature has external dependencies (APIs, services, pending design decisions) | "Are those ready now? What do we do if they're not ready when agents start?" |
| Developer mentions a tight deadline or says "as fast as possible" | "What can be cut? What's truly non-negotiable versus nice-to-have?" |

### After Round 1

- Summarize what you heard in 2-3 sentences
- State the scope classification: **new feature** / **refactor** / **migration** / **integration**
- Confirm: _"Does that capture it, or did I miss something?"_

### Data Captured

- `executive_summary.one_liner`
- `executive_summary.done_looks_like`
- `executive_summary.primary_risk`
- `executive_summary.scope_type`
- `executive_summary.target_user`

---

## Round 2: Requirements (~10 minutes)

**Purpose:** Break the feature into concrete requirements with priorities and acceptance criteria.

**PRD sections filled:** §3 Goals, Non-Goals & Success Metrics, §4 Requirements, §5 UX & Interaction Notes

### Question Flow

1. Walk through each sub-component or capability described in Round 1.
2. For each component: _"Is this a Must (blocks launch), Should (important but not blocking), or Could (nice to have)?"_
3. For each **Must** requirement: _"What are the specific acceptance criteria? If I handed you a PR, what would you check?"_
4. For each **Should/Could**: _"If we're over budget or running long, is this the first thing you'd cut?"_
5. After stated requirements: _"Are there requirements you're assuming that we haven't said out loud?"_
6. _"What should the agent definitely NOT do? What's off-limits for this feature?"_

### Conditional Follow-Ups

| Trigger | Follow-Up |
| ------- | --------- |
| A requirement has estimated complexity > 6 | "This feels like it could be split. Can we break it into two tasks?" |
| Requirements have unclear boundaries | "Let's draw a hard line. What's in scope for this phase, and what gets pushed to next?" |
| Developer mentions UI work | "Are there design references, component patterns, or responsive requirements?" |
| Developer mentions data work | "What are the validation rules? What does the error state look like?" |

### After Round 2

- Read back the prioritized requirement list
- Flag any requirements that feel too large for a single agent task
- Confirm: _"This is what agents will be working from. Anything to add or change?"_

### Data Captured

- `requirements[]` with priority, description, and acceptance criteria
- `non_goals[]` (the "off-limits" items)
- Initial task decomposition (one task per Must requirement, at minimum)

---

## Round 3: Dependencies & Architecture (~5 minutes)

**Purpose:** Establish task ordering, parallel opportunities, and file-level scope.

**PRD sections filled:** §6 Dependencies & Risks, §7 Rollout Plan, §8 Milestones & Release Criteria

### Question Flow

1. _"Which requirements can be worked on independently — no shared state, no shared files?"_
2. _"Which ones must complete before others can start? What's the dependency chain?"_
3. _"Are there files that multiple requirements will touch?"_ (Explain file-overlap detection)
4. _"Are there external blockers — APIs not ready, design decisions not made?"_
5. _"What's the testing strategy? Existing tests that must keep passing? New tests needed?"_

### Investigation Agent (Opt-In)

During Round 3, the user may opt in to codebase scanning:

> "Would you like me to scan the codebase to identify affected files and existing patterns?"

If accepted, the Investigation Agent uses:
- `find_files` — Locate files matching patterns
- `read_file` — Read file contents
- `search_content` — Search for code patterns
- `list_directory` — Explore directory structure

Results are summarized and used to populate `tasks[].files_affected`.

### Conditional Follow-Ups

| Trigger | Follow-Up |
| ------- | --------- |
| File overlap detected between tasks developer expected to be parallel | "Tasks [X] and [Y] both touch [file]. Should we restructure, or are you okay with them running sequentially?" |
| Developer mentions a shared service/utility multiple tasks need | "Should we extract that as its own task — build the shared piece first?" |
| External blockers exist | "What's the fallback? If [blocker] isn't ready, can the agent stub it out?" |

### After Round 3

- Present the dependency graph in text form
- Flag file overlaps
- Confirm: _"Does this ordering make sense?"_

### Data Captured

- `tasks[].depends_on`
- `tasks[].files_affected`
- Parallel vs. sequential recommendations
- External blockers and fallback plans

---

## Round 4: Agent Context (~5 minutes)

**Purpose:** Give agents the specific guidance they need to produce mergeable code on the first attempt.

**PRD sections filled:** §11 Agent Boundaries (Phase-Specific)

### Question Flow

1. _"For each task, are there existing files or patterns the agent should follow?"_
2. _"Any gotchas you've discovered that aren't documented?"_
3. _"How should the agent handle edge cases — fail loudly, degrade gracefully, or leave a TODO?"_
4. _"Are there design tokens, component libraries, or style patterns the agent must use?"_
5. _"What would make you reject a PR for this feature? What's your code review checklist?"_

### Conditional Follow-Ups

| Trigger | Follow-Up |
| ------- | --------- |
| Feature involves UI | "Component structure? Accessibility requirements? Responsive breakpoints?" |
| Feature involves data/database | "Validation rules? Row-level security? Migrations needed?" |
| Feature involves API routes | "Auth pattern? Error response format? Rate limiting?" |
| Developer mentioned `require_review` files | "The agent's PR will need your explicit approval for that file." |

### After Round 4

- Summarize the agent context per task
- Flag under-specified tasks
- Confirm: _"Is there anything else you'd want to tell a developer before they started?"_

### Data Captured

- `tasks[].agent_context`
- Updated `tasks[].success_criteria`
- Any new additions to `require_review` list

---

## Round 5: Retrospective Input (~3 minutes)

**Purpose:** Feed compound learning data into the current plan. Skipped if no checkpoint data exists.

**PRD sections filled:** §10 Checkpoint Learnings

### If No Checkpoint Data

> "No checkpoint data from previous phases — we'll start collecting it after this feature's first task completes."

Ask if the user has any general learnings from previous work they'd like to incorporate, then proceed to Post-Interview.

### If Checkpoint Data Exists

1. Summarize the latest checkpoint data:
   - _"Patterns that worked well: [list]"_
   - _"Anti-patterns that were flagged: [list]"_
   - _"Cost estimates were [over/under] by [X]% on average"_
   - _"These files caused integration failures: [list]"_
2. _"Does any of this change how we should approach this feature?"_
3. _"Are there new rules we should add — things you want agents to always do or never do?"_
4. _"The cost multiplier is currently $[X] per complexity point. Does that feel right?"_

### After Round 5

- Note adjustments to task estimates, agent context, or config rules
- Confirm: _"I'll incorporate these learnings into the PRD. Ready for me to generate it?"_

### Data Captured

- Adjusted `tasks[].estimated_iterations` if cost data suggests recalibration
- Updated `tasks[].agent_context` with retrospective patterns
- New rules for `.karimo/config.yaml`

---

## Post-Interview: PRD Generation

After all rounds complete:

1. **Generate the PRD** following [PRD_TEMPLATE.md](./PRD_TEMPLATE.md)
2. **Calculate derived fields** using `.karimo/config.yaml` formulas:
   - `cost_ceiling = complexity × cost_multiplier`
   - `estimated_iterations = base_iterations + (complexity × iteration_multiplier)`
   - `revision_budget = cost_ceiling × (revision_budget_percent / 100)`
3. **Run Review Agent** to check for gaps:
   - Missing acceptance criteria
   - High-complexity tasks not split
   - Conflicting requirements
   - Missing edge cases
4. **Present the full PRD** to the developer, highlighting:
   - Total estimated cost across all tasks
   - The dependency graph
   - Any tasks flagged as high-complexity (7+)
   - Any file overlaps forcing sequential execution
   - Issues found by the Review Agent
5. **On approval:** Save the PRD as `.karimo/prds/NNN_slug.md`
6. **Update state:** Set `current_prd_section` to `finalized`

---

## Session Resume

If the interview is interrupted (terminal closed, Ctrl+C), the session can be resumed:

1. **State persisted** — Session saved to `.karimo/sessions/{session_id}.json`
2. **Resume flow** — Running `karimo` detects in-progress PRD
3. **Context restored** — Conversation summaries + PRD progress reloaded
4. **Continue from round** — User continues where they left off

Session data includes:
- `currentRound` — Which round to resume
- `completedRounds` — Rounds already finished
- `messages` — Recent conversation history
- `summaries` — Condensed summaries from context overflow
- `estimatedTokens` — Current context usage
