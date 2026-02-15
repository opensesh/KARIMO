# PRD Interview Protocol

**Version:** 1.0
**Purpose:** Conduct structured interviews that produce agent-executable PRDs
**Output format:** See `PRD_TEMPLATE.md`

---

## Pre-Interview Setup

Before the first question, complete this checklist:

- [ ] Developer triggers the interview (via `/karimo:plan` command or manually)
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

- Summarize what you heard in 2–3 sentences
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

### Question Flow

1. _"Which requirements can be worked on independently — no shared state, no shared files?"_
2. _"Which ones must complete before others can start? What's the dependency chain?"_
3. _"Are there files that multiple requirements will touch?"_ (Explain file-overlap detection)
4. _"Are there external blockers — APIs not ready, design decisions not made?"_
5. _"What's the testing strategy? Existing tests that must keep passing? New tests needed?"_

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

### If No Checkpoint Data

> "No checkpoint data from previous phases — we'll start collecting it after this feature's first task completes."

Skip to Post-Interview.

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

1. **Generate the PRD** following `PRD_TEMPLATE.md`
2. **Calculate derived fields** using `.karimo/config.yaml` formulas:
   - `cost_ceiling = complexity × cost_multiplier`
   - `estimated_iterations = base_iterations + (complexity × iteration_multiplier)`
   - `revision_budget = cost_ceiling × (revision_budget_percent / 100)`
3. **Present the full PRD** to the developer, highlighting:
   - Total estimated cost across all tasks
   - The dependency graph
   - Any tasks flagged as high-complexity (7+)
   - Any file overlaps forcing sequential execution
4. **On approval:** Create GitHub Issues and populate the GitHub Project with all custom fields
5. **Save the PRD** as `PRD_[feature-slug].md` in the project repo
