# /karimo:plan — PRD Interview Command

Start a structured interview to create a Product Requirements Document (PRD) that can be executed by KARIMO agents.

## Arguments

- `$PRD_NAME` (optional): Name for the PRD. If not provided, will be determined during the interview.

## Behavior

### First PRD Detection

If no PRDs exist (`.karimo/prds/` is empty), display welcome message:

```
╭──────────────────────────────────────────────────────────────╮
│  Welcome to KARIMO                                           │
╰──────────────────────────────────────────────────────────────╯

This is your first PRD. The interview process has 5 rounds:

  1. Vision    — What are we building and why?
  2. Scope     — Where are the boundaries?
  3. Investigate — Agent scans your codebase
  4. Tasks     — Break down into executable units
  5. Review    — Validate and generate dependency graph

Ready to begin?
```

Then proceed to normal config check and interview flow.

### Step 0: Configuration Check

Before starting the interview, verify configuration is in place.

**Step 0a: Check for config.yaml**

```bash
ls .karimo/config.yaml
```

**If config.yaml exists:**
- Read configuration from config.yaml
- Validate no `_pending_` values remain
- If valid, proceed directly to Step 1 (interview)
- If `_pending_` found, treat as missing config

**If config.yaml missing:**

Check CLAUDE.md for `_pending_` placeholders:

```bash
grep -q "_pending_" CLAUDE.md
```

**Step 0b: Handle missing configuration**

Present options to user:

```
╭──────────────────────────────────────────────────────────────╮
│  Configuration Required                                       │
╰──────────────────────────────────────────────────────────────╯

No .karimo/config.yaml found (or contains _pending_ values).

Configuration defines your project's runtime, commands, and boundaries.
Agents need this to execute tasks properly.

Options:
  1. Run /karimo:configure first (recommended)
     - Interactive 5-minute configuration wizard
     - Creates config.yaml and syncs CLAUDE.md
     - Return here after to create PRD

  2. Quick auto-detect now (fallback)
     - Scan project for smart defaults
     - Confirm detected values inline
     - May be less thorough than /karimo:configure

  3. Cancel

Choose [1/2/3]:
```

**If user chooses 1 (recommended):**
- Exit with message: "Run `/karimo:configure` then return to `/karimo:plan`"

**If user chooses 2 (fallback auto-detect):**

1. Spawn investigator in context-scan mode:
   ```
   @karimo-investigator.md --mode context-scan
   ```

2. Receive `project_context` YAML from investigator

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
   - Write `.karimo/config.yaml` with detected values
   - Update CLAUDE.md tables (replace `_pending_` markers)
   - Continue to Step 1

5. On edit:
   - Allow user to modify values
   - Apply modifications to both files
   - Continue to Step 1

**Step 0c: Drift check (if config exists but PRD is new)**

When config.yaml exists and is valid:

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

3. Apply acknowledged changes to config.yaml and CLAUDE.md
4. Continue to Step 1

---

### Step 1: Load Project Context

Read the following files:
- `CLAUDE.md` — Project configuration, commands, boundaries, learnings
- `.karimo/prds/*.md` — Previous PRDs for retrospective context
- `.karimo/templates/PRD_TEMPLATE.md` — Output format
- `.karimo/templates/INTERVIEW_PROTOCOL.md` — Interview flow

Extract from CLAUDE.md:
- `## KARIMO Configuration` section for boundaries, commands
- `## KARIMO Learnings` section for patterns and anti-patterns

### Step 2: Spawn Interviewer Agent

Use the karimo-interviewer agent to conduct the interview:

```
@karimo-interviewer.md
```

Pass the following context to the interviewer:
- Project configuration from CLAUDE.md
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

### Step 7: PRD Folder Structure

```
.karimo/prds/001_feature-slug/
├── PRD.md              # Narrative document
├── tasks.yaml          # Extracted YAML task block
├── dag.json            # Dependency graph (generated by reviewer)
├── status.json         # Execution state (empty until /karimo:execute)
├── findings.md         # Cross-task discoveries (maintained by PM agent)
├── task-briefs/        # Generated briefs per task (created by PM agent)
│   ├── 1a-brief.md
│   ├── 1b-brief.md
│   └── ...
└── assets/             # Images referenced during interview
```

## Output

On completion, confirm:

> "PRD created at `.karimo/prds/{NNN}_{slug}/PRD.md`
>
> - **Tasks:** {count} tasks defined
> - **Estimated complexity:** {total_complexity} points
> - **Ready tasks:** {ready_count} (no dependencies)
>
> Run `/karimo:execute --prd {slug}` to start execution."
