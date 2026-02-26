# /karimo-plan — PRD Interview Command

Start a structured interview to create a Product Requirements Document (PRD) that can be executed by KARIMO agents.

## Arguments

- `$PRD_NAME` (optional): Name for the PRD. If not provided, will be determined during the interview.

---

## Voice & Delivery

**Do:** Present outputs directly without announcing them.
**Don't:** Narrate your actions ("Let me...", "I'm going to...", "I'll show you...")

| Good | Bad |
|------|-----|
| [show the welcome message] | "Let me show you the welcome message, then we'll check configuration." |
| "Codebase scan available. Proceed? [Y/n]" | "Would you like me to scan the codebase?" |
| "Configuration required." | "I need to check if configuration exists first." |
| "Generate PRD now? [Y/n]" | "Ready for me to generate the PRD?" |

Present content, prompts, and options directly. Users see actions happen — they don't need narration.

---

## Behavior

### First PRD Detection

If no PRDs exist (`.karimo/prds/` is empty), display welcome message:

```
╭──────────────────────────────────────────────────────────────╮
│  Welcome to KARIMO                                           │
╰──────────────────────────────────────────────────────────────╯

This is your first PRD. The interview process has 6 rounds:

  1. Vision    — What are we building and why?
  2. Scope     — Where are the boundaries?
  3. Investigate — Agent scans your codebase
  4. Tasks     — Break down into executable units
  5. Review    — Validate and generate dependency graph
  6. Approve   — Confirm PRD is ready for execution

Ready to begin?
```

Then proceed to normal config check and interview flow.

### Step 0: Configuration Check

Before starting the interview, verify configuration is in place.

**Step 0a: Check for config.yaml**

```bash
[ -f ".karimo/config.yaml" ] && echo "Config exists" || echo "No config"
```

**If `.karimo/config.yaml` exists:**
- Read configuration from config.yaml
- Proceed directly to Step 1 (interview)

**If config.yaml missing:**

**Step 0b: Handle missing configuration**

Present options to user:

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Required                                       │
╰──────────────────────────────────────────────────────────────╯

.karimo/config.yaml not found.

Configuration defines your project's runtime, commands, and boundaries.
Agents need this to execute tasks properly.

Options:
  1. Run /karimo-configure first (recommended)
     - Interactive 5-minute configuration wizard
     - Creates .karimo/config.yaml
     - Return here after to create PRD

  2. Quick auto-detect now (fallback)
     - Scan project for smart defaults
     - Confirm detected values inline
     - May be less thorough than /karimo-configure

  3. Cancel

Choose [1/2/3]:
```

**If user chooses 1 (recommended):**
- Exit with message: "Run `/karimo-configure` then return to `/karimo-plan`"

**If user chooses 2 (fallback auto-detect):**

1. Spawn investigator in context-scan mode:
   ```
   @karimo-investigator.md --mode context-scan
   ```

2. Receive `project_context` from investigator

3. Present findings to user:
   ```
   Detected project configuration:

   - Runtime: {{runtime}}
   - Framework: {{framework}}
   - Package manager: {{package_manager}}
   - Build: {{build_command}}
   - Lint: {{lint_command}}
   - Test: {{test_command}}
   - Typecheck: {{typecheck_command}}

   Suggested boundaries:
   - Never touch: {{never_touch_list}}
   - Require review: {{require_review_list}}

   Accept this configuration? [Y/n/edit]
   ```

4. On acceptance:
   - Write configuration to `.karimo/config.yaml`
   - Continue to Step 1

5. On edit:
   - Allow user to modify values
   - Apply modifications to `.karimo/config.yaml`
   - Continue to Step 1

**Step 0c: Drift check (if configuration exists but PRD is new)**

When `.karimo/config.yaml` exists:

1. Spawn investigator in drift-check mode:
   ```
   @karimo-investigator.md --mode drift-check
   ```

2. If drift detected, present changes:
   ```
   Configuration drift detected:

   - {{change_type}}: {{description}}
     Recommendation: {{recommendation}}

   Update configuration with these changes? [Y/n/skip]
   ```

3. Apply acknowledged changes to `.karimo/config.yaml`
4. Continue to Step 1

---

### Step 1: Load Project Context

Read the following files:
- `.karimo/config.yaml` — Project configuration, commands, boundaries
- `.karimo/learnings.md` — Patterns, anti-patterns, rules, gotchas
- `.karimo/prds/*.md` — Previous PRDs for retrospective context
- `.karimo/templates/PRD_TEMPLATE.md` — Output format
- `.karimo/templates/INTERVIEW_PROTOCOL.md` — Interview flow

Extract from config.yaml:
- `project` section for runtime, framework
- `commands` section for build, lint, test, typecheck
- `boundaries` section for never_touch, require_review patterns

### Step 2: Spawn Interviewer Agent

Use the karimo-interviewer agent to conduct the interview:

```
@karimo-interviewer.md
```

Pass the following context to the interviewer:
- Project configuration from `.karimo/config.yaml` and `.karimo/learnings.md`
- Previous PRD summaries (if any exist)
- The PRD name argument (if provided)

### Step 3: Interview Flow

The interviewer conducts 4 rounds:

| Round | Name | Duration | Purpose |
|-------|------|----------|---------|
| 1 | Framing | ~5 min | Establish scope, success criteria, risk |
| 2 | Requirements | ~10 min | Break feature into prioritized requirements |
| 3 | Dependencies | ~5 min | Task ordering, file overlaps, external blockers |
| 4 | Retrospective | ~3 min | Learnings from previous PRDs |

### Step 4: Round Completion Signals

Users signal readiness to proceed with phrases like:
- "Ready to move on"
- "Next"
- "Done with this section"
- "Proceed"
- "That covers it"

### Step 5: Investigator Agent (Optional)

During Round 3, offer to spawn the investigator agent for codebase scanning:

> "Would you like me to scan the codebase to identify affected files and existing patterns?"

If accepted:
```
@karimo-investigator.md --mode task-scan
```

### Step 6: PRD Generation

After Round 4:
1. Generate the PRD following `.karimo/templates/PRD_TEMPLATE.md`
2. Spawn the reviewer agent:
   ```
   @karimo-reviewer.md
   ```
3. Address any issues flagged by the reviewer
4. Save artifacts to `.karimo/prds/{NNN}_{slug}/`

### Step 7: Interactive Review & Approval

After the reviewer validates the PRD, present a summary for user approval:

```
╭──────────────────────────────────────────────────────────────╮
│  PRD Ready: {slug}                                           │
╰──────────────────────────────────────────────────────────────╯

Summary: {2-3 sentence executive summary from PRD.md}

Tasks ({count}):
  [{id}] {title}    complexity: {n}  priority: {must|should|could}
    depends_on: {deps or "none"}

  [{id}] {title}    complexity: {n}  priority: {must|should|could}
    depends_on: {deps or "none"}

  ...

Execution Plan:
  Wave 1: [{ids}]  ← No dependencies
  Wave 2: [{ids}]  ← After wave 1
  Wave 3: [{ids}]  ← After wave 2

Longest chain: {id} → {id} → {id}

Total: {count} tasks, {complexity} complexity points

Options:
  1. Approve — Ready for execution
  2. Modify — Add, remove, or change tasks (re-runs reviewer)
  3. Save as draft — Come back later

Your choice:
```

**Option 1 — Approve:**
- Update `status.json` with `status: "ready"`
- Print completion message with execute command

**Option 2 — Modify:**
- Accept user feedback on what to change
- Re-spawn the reviewer agent with modifications
- Loop back to present updated summary

**Option 3 — Save as draft:**
- Update `status.json` with `status: "draft"`
- Print resume information:
  ```
  PRD saved as draft: {slug}

  Resume planning later with:
    /karimo-plan --resume {slug}
  ```

---

### Step 8: PRD Folder Structure

The reviewer agent creates the PRD folder with automatic numbering:

**Directory:** `.karimo/prds/{NNN}_{slug}/`

- `{NNN}` — Sequential 3-digit number (001, 002, 003...), auto-generated from existing PRDs
- `{slug}` — URL-safe feature slug from interview

The `created_date` field in `PRD.md` is automatically set to the creation date.

```
.karimo/prds/001_feature-slug/
├── PRD.md              # Narrative document (created_date auto-populated)
├── tasks.yaml          # Extracted YAML task block
├── execution_plan.yaml # Wave-based execution plan (generated by reviewer)
├── status.json         # Execution state (empty until /karimo-execute)
├── findings.md         # Cross-task discoveries (maintained by PM agent)
├── briefs/             # Generated briefs per task (created by brief-writer agent)
│   ├── 1a.md
│   ├── 1b.md
│   └── ...
└── assets/             # Images referenced during interview
```

## Output

### On Approval (Option 1)

```
╭──────────────────────────────────────────────────────────────╮
│  PRD Approved: {slug}                                        │
╰──────────────────────────────────────────────────────────────╯

PRD saved to: .karimo/prds/{NNN}_{slug}/PRD.md

Tasks: {count} tasks defined
Complexity: {total_complexity} points
Ready tasks: {ready_count} (no dependencies)

The PRD is ready for execution. Run:

  /karimo-execute --prd {slug}

Tip: Need to adjust later? Run /karimo-modify --prd {slug}
```

### On Save as Draft (Option 3)

```
PRD saved as draft: {slug}

Resume planning later with:
  /karimo-plan --resume {slug}
```
