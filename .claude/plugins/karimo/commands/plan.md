# /karimo:plan — PRD Interview Command

Start a structured interview to create a Product Requirements Document (PRD) that can be executed by KARIMO agents.

## Arguments

- `(no arguments)`: Interactive mode — guided flow to start new or resume existing PRD
- `--prd {slug}`: Use existing research folder from `/karimo:research`
- `--skip-research`: Allow planning without prior research (not recommended)
- `--resume {slug}`: Resume a draft PRD

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

### v7.0 Workflow Change

**Research is now required before planning.**

The workflow is:
1. `/karimo:research "feature-name"` — Creates folder, runs research
2. `/karimo:plan --prd feature-name` — Uses research, creates PRD

To skip research (not recommended):
```bash
/karimo:plan --prd feature-name --skip-research
```

### Interactive Mode (No Arguments)

**If no `--prd` flag provided**, enter interactive mode:

**Step 1: Main Menu**

```
╭──────────────────────────────────────────────────────╮
│  KARIMO Planning                                     │
╰──────────────────────────────────────────────────────╯

What would you like to do?

  1. Start a new feature
  2. Resume an existing PRD

Your choice:
```

**Step 2a: New Feature Flow (Option 1)**

1. Prompt for feature name:
   ```
   What's the feature you want to build?

   Feature name:
   ```

2. Sanitize input to slug (lowercase, hyphens)

3. Research context prompt (conversational flow):

   **Step 3a: Check KARIMO research folder**
   ```
   ╭──────────────────────────────────────────────────────╮
   │  Research Context                                    │
   ╰──────────────────────────────────────────────────────╯

   {if .karimo/research/ has files}
   Found existing research that might be relevant:
     • react-patterns-001.md — React component patterns
     • auth-libraries-002.md — Authentication library comparison

   Use any of these? [Y/n/select]
   {else}
   (No existing research in .karimo/research/)
   {endif}
   ```

   **Step 3b: Ask about user's own research (ALWAYS)**
   ```
   Do you have any other research to incorporate?

   This could be:
     • Markdown files or documentation
     • Architecture notes or design docs
     • Links to relevant files in your project

   [Enter file path(s), or press Enter to skip]
   ```

   - If user provides path(s):
     - Validate file exists
     - Copy to `.karimo/prds/{slug}/research/imported/`
     - Parse and summarize for context
   - If user skips: Continue to step 4

4. Research explanation + kickoff:
   ```
   ╭──────────────────────────────────────────────────────╮
   │  Research Phase                                      │
   ╰──────────────────────────────────────────────────────╯

   KARIMO is designed for complex features that benefit from
   understanding your codebase before planning. Research helps
   agents find existing patterns, identify gaps, and recommend
   libraries.

   {if user imported files}
   You've provided research context. Would you like KARIMO to
   also scan your codebase and search for best practices?
   {else}
   You can either:
     1. Let KARIMO run research (scans codebase + web search)
     2. Skip for now and add your own later
   {endif}

   Run research for "{slug}"? [Y/n]
   ```

5. **If Y**: Spawn researcher agent inline, then continue to planning
   **If n**:
   - If user imported files → Proceed to planning with imported research
   - If no research at all → Exit with guidance:
     ```
     Research helps KARIMO generate better task breakdowns.

     When ready, run:
       /karimo:research "{slug}"

     Or add your own research and resume:
       /karimo:plan --prd {slug}
     ```

**Step 2b: Existing PRD Flow (Option 2)**

1. Filter and list PRD folders:
   ```bash
   # Only show PRDs that can still be planned/iterated:
   # - draft (interview not complete)
   # - ready (approved but not executing)
   # EXCLUDE: executing, completed, merged
   for dir in .karimo/prds/*/; do
     slug=$(basename "$dir" | sed 's/^[0-9]*_//')
     status=$(jq -r '.status // "unknown"' "$dir/status.json" 2>/dev/null)
     # Skip if actively executing or completed
     [[ "$status" =~ ^(executing|completed|merged)$ ]] && continue
     has_research=$([ -f "$dir/research/findings.md" ] && echo "✓" || echo "✗")
     has_tasks=$([ -f "$dir/tasks.yaml" ] && echo "✓" || echo "✗")
   done
   ```

2. Display filtered list:
   ```
   ╭──────────────────────────────────────────────────────╮
   │  Resume Planning                                     │
   ╰──────────────────────────────────────────────────────╯

   {if no eligible PRDs}
     No PRDs available for planning.

     (Active executions: /karimo:dashboard)
   {else}
     Select a PRD:

       1. {slug}     {status}     research: {✓|✗}  tasks: {n|—}
       2. {slug}     {status}     research: {✓|✗}  tasks: {n|—}

     Enter number or slug:
   {endif}
   ```

3. After selection, show research import prompt (Step 2a.3-4):
   - Always offer to import research (KARIMO folder + user files)
   - Then offer to run KARIMO research
   - If PRD already has tasks → Planning becomes iteration/refinement focused

---

### First PRD Detection

If `.karimo/prds/` is empty or contains no PRD folders, show:

```
╭──────────────────────────────────────────────────────────────╮
│  Welcome to KARIMO                                           │
╰──────────────────────────────────────────────────────────────╯

This is your first PRD. The interview process has 5 rounds:

  1. Research  — Load research context (from /karimo:research)
  2. Vision    — What are we building and why?
  3. Scope     — Where are the boundaries?
  4. Tasks     — Break down into executable units
  5. Review    — Validate and generate dependency graph
  6. Approve   — Confirm PRD is ready for execution

Ready to begin?
```

Do not announce this output. After user confirms, proceed directly to Step 0.

### Step 0: Configuration Check

Before starting the interview, verify configuration is in place.

**Step 0a: Check for config.yaml**

```bash
[ -f ".karimo/config.yaml" ] && echo "Config exists" || echo "No config"
```

**If `.karimo/config.yaml` exists:**
- Read configuration from config.yaml
- Proceed directly to Step 1 (research loading)

**If config.yaml missing:**

**Step 0b: Inline First-Time Setup**

Display explanation and prompt:

```
╭──────────────────────────────────────────────────────────────╮
│  First-Time Setup                                            │
╰──────────────────────────────────────────────────────────────╯

To maximize context efficiency, we create a configuration of your
codebase to give agents context about your architecture — reducing
token usage and improving accuracy throughout development.

Here's what happens:

  1. An investigator agent scans your codebase and presents findings
  2. You can edit, accept, or reject and complete manually
  3. We kick off your first PRD and start building features

Ready? [Y/n]
```

**If user confirms (Y or Enter):**

1. Spawn investigator in context-scan mode:
   ```
   @karimo-investigator.md --mode context-scan
   ```

2. Receive `project_context` from investigator

3. Present findings to user:
   ```
   Detected configuration:

   - Runtime: {{runtime}}
   - Framework: {{framework}}
   - Package manager: {{package_manager}}
   - Build: {{build_command}}
   - Lint: {{lint_command}}
   - Test: {{test_command}}
   - Typecheck: {{typecheck_command}}

   Boundaries:
   - Never touch: {{never_touch_list}}
   - Require review: {{require_review_list}}

   Accept? [Y/n/edit]
   ```

4. On accept (Y or Enter):
   - Write configuration to `.karimo/config.yaml`
   - Continue directly to Step 1 (research loading)

5. On edit:
   - Allow user to modify values inline
   - Apply modifications to `.karimo/config.yaml`
   - Continue directly to Step 1 (research loading)

6. On reject (n):
   - Exit with message: "Run `/karimo:configure` for manual configuration, then return to `/karimo:plan`"

**If user declines initial prompt (n):**
- Exit with message: "Run `/karimo:configure` when ready, then return to `/karimo:plan`"

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

### Step 1: Load Project Context + Research

1. **Load Project Configuration**

   Read `.karimo/config.yaml` to extract:
   - `project` section for runtime, framework
   - `commands` section for build, lint, test, typecheck
   - `boundaries` section for never_touch, require_review patterns

2. **Load Research Context**

   Check for research folder `.karimo/prds/{slug}/research/`:

   **If research exists:**
   - Load `research/findings.md` into interview context
   - Display research summary:
     ```
     ╭──────────────────────────────────────────────────────╮
     │  Research Context Loaded: {slug}                     │
     ╰──────────────────────────────────────────────────────╯

     Key findings:
       • {pattern_1_summary}
       • {pattern_2_summary}
       • {recommended_approach}

     This research will inform the interview questions.
     ```

   **If research missing AND no `--skip-research`:**
   ```
   ❌ Error: No research found for '{slug}'

   Research is required before planning (v7.0).

   How to fix:
     Run: /karimo:research "{slug}"

   To plan without research (not recommended):
     /karimo:plan --prd {slug} --skip-research

   Note: Research improves brief quality by ~40% and reduces
         execution errors significantly.
   ```

   **If research missing AND `--skip-research`:**
   ```
   ⚠️  Proceeding without research context

   Warning: Planning without research may result in:
     • Less informed task decomposition
     • Higher brief validation failures
     • More execution errors

   You can add research later with:
     /karimo:research --prd {slug}
   ```

**Note:** Other files (learnings/, previous PRDs, templates) are loaded on-demand during later steps to keep startup fast.

### Step 2: Spawn Interviewer Agent

Use the karimo-interviewer agent to conduct the interview:

```
@karimo-interviewer.md
```

Pass the following context to the interviewer:
- Project configuration from `.karimo/config.yaml`
- Research findings from `research/findings.md` (if available)
- The PRD slug

### Step 3: Interview Flow

The interviewer conducts 4 rounds:

| Round | Name | Duration | Purpose |
|-------|------|----------|---------|
| 1 | Framing | ~5 min | Establish scope, success criteria, risk |
| 2 | Requirements | ~10 min | Break feature into prioritized requirements |
| 3 | Dependencies | ~5 min | Task ordering, file overlaps, external blockers |
| 4 | Retrospective | ~3 min | Learnings from previous PRDs |

### Round 4 Preparation (Automatic)

Before the interviewer begins Round 4 (Retrospective), load:
- `.karimo/learnings/` — If exists, contains categorized patterns and anti-patterns
- `.karimo/prds/*/PRD.md` — If previous PRDs exist, summarize key outcomes for retrospective questions

If these files don't exist, the interviewer proceeds with first-PRD flow (no retrospective data).

### Step 4: Round Completion Signals

Users signal readiness to proceed with phrases like:
- "Ready to move on"
- "Next"
- "Done with this section"
- "Proceed"
- "That covers it"

### Step 5: Investigator Agent (Optional)

During Round 3, offer to spawn the investigator agent for codebase scanning:

> "Codebase scan available to identify affected files and existing patterns. Proceed? [Y/n]"

If accepted:
```
@karimo-investigator.md --mode task-scan
```

### Step 6: PRD Generation

After Round 4:
1. Load `.karimo/templates/PRD_TEMPLATE.md` for output format
2. Generate the PRD following the template structure
3. **Include Research Findings:** If research exists, embed `## Research Findings` section from `research/findings.md`
4. Spawn the reviewer agent:
   ```
   @karimo-reviewer.md
   ```
5. Address any issues flagged by the reviewer
6. Save artifacts to `.karimo/prds/{NNN}_{slug}/`

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
  3. More research — Loop back to add context
  4. Save as draft — Come back later

Your choice:
```

**Option 1 — Approve:**
- Finalize PRD folder numbering (Step 8a)
- Update `status.json` with `status: "ready"`
- Commit PRD artifacts (Step 8b)
- Print completion message with execute command

**Option 2 — Modify:**
- Accept user feedback on what to change
- Re-spawn the reviewer agent with modifications
- Loop back to present updated summary

**Option 3 — More research:**
- Print: "Run `/karimo:research --prd {slug}` to add research context"
- Note: "Resume with `/karimo:plan --prd {slug}` after research completes"

**Option 4 — Save as draft:**
- Update `status.json` with `status: "draft"`
- Print resume information:
  ```
  PRD saved as draft: {slug}

  Resume planning later with:
    /karimo:plan --resume {slug}
  ```

---

### Step 8: PRD Folder Finalization

**Step 8a: Add Sequential Numbering**

When PRD is approved, add sequential numbering to the folder:

1. Check existing PRD folders for highest NNN prefix
2. Calculate next number (e.g., if 001, 002 exist, use 003)
3. Rename `.karimo/prds/{slug}/` to `.karimo/prds/{NNN}_{slug}/`

**Directory:** `.karimo/prds/{NNN}_{slug}/`

- `{NNN}` — Sequential 3-digit number (001, 002, 003...), auto-generated from existing PRDs
- `{slug}` — URL-safe feature slug from research command

The `created_date` field in `PRD_{slug}.md` is automatically set to the creation date.

```
.karimo/prds/001_feature-slug/
├── PRD_feature-slug.md # Narrative document (slug in filename for searchability)
├── tasks.yaml          # Extracted YAML task block
├── execution_plan.yaml # Wave-based execution plan (generated by reviewer)
├── status.json         # Execution state (empty until /karimo:run)
├── findings.md         # Cross-task discoveries (maintained by PM agent)
├── research/           # Research artifacts (from /karimo:research)
│   ├── internal/
│   ├── external/
│   └── findings.md
├── briefs/             # Generated briefs per task (created by brief-writer agent)
│   ├── 1a_feature-slug.md
│   ├── 1b_feature-slug.md
│   └── ...
└── assets/             # Images referenced during interview
```

**Step 8b: Commit PRD Artifacts**

**After the reviewer saves artifacts and folder is renamed, commit immediately.**

This is a critical atomic commit step — PRD artifacts should be committed before brief generation or task execution begins.

```bash
git add .karimo/prds/{NNN}_{slug}/
git commit -m "docs(karimo): add PRD for {feature_name}

Generated via /karimo:plan interview.
Research context: {included|not included}

Files:
- PRD_{slug}.md
- tasks.yaml
- execution_plan.yaml
- status.json
- research/ (if present)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Rationale:** Atomic commits keep PRD generation separate from brief generation and task execution. If the session is interrupted after PRD approval but before execution, the PRD artifacts are safely committed.

---

## Error Messages

### Configuration Not Found

```
❌ Error: No KARIMO configuration found

Configuration is required before creating a PRD.

How to fix:
  1. Run configuration: /karimo:configure
  2. Or run inline setup (will prompt during interview)

Configuration detects:
  • Runtime (Node.js, Python, etc.)
  • Framework (Next.js, Django, etc.)
  • Build/test commands
  • File boundaries

Time: ~5 minutes for basic mode
```

---

### Research Not Found

```
❌ Error: No research found for '{slug}'

v7.0 requires research before planning.

How to fix:
  1. Run research first: /karimo:research "{slug}"
  2. Then plan: /karimo:plan --prd {slug}

To plan without research (not recommended):
  /karimo:plan --prd {slug} --skip-research

Note: Research improves brief quality by ~40%
```

---

### PRD Already Exists

```
❌ Error: PRD with slug 'user-auth' already exists

A PRD with this slug has already been created.

Options:
  1. Resume existing PRD: /karimo:plan --resume user-auth
  2. View existing PRD: cat .karimo/prds/*/user-auth/PRD_user-auth.md
  3. Use different slug: /karimo:research "different-feature-name"

Note: Slugs must be unique within a project
```

---

### Interview Agent Failed

```
❌ Error: Interview agent failed during Round {N}

The interviewer agent encountered an error.

Possible causes:
  1. Agent timeout or resource limits
  2. Invalid input format
  3. Connectivity issues
  4. Model API errors

How to fix:
  • Check your input was valid (no special characters in names)
  • Retry: /karimo:plan --resume {slug}
  • If persists: /karimo:doctor

Draft saved to: .karimo/prds/{slug}/
```

---

### Investigator Detection Failed

```
❌ Error: Project detection failed

The investigator agent could not detect project settings.

Possible causes:
  1. Non-standard project structure
  2. Missing package.json or equivalent
  3. Unsupported framework/runtime
  4. Permission issues

How to fix:
  • Use manual configuration: /karimo:configure --advanced
  • Verify project structure: ls -la
  • Check permissions: ls -la .
  • See supported frameworks: /karimo:help frameworks

For help: Check TROUBLESHOOTING.md
```

---

### Task Decomposition Failed

```
❌ Error: Could not decompose PRD into tasks

The interviewer agent could not break down the requirements into tasks.

Possible causes:
  1. Requirements too vague or high-level
  2. Scope too large for single PRD
  3. Missing technical details
  4. Conflicting requirements

How to fix:
  1. Provide more specific requirements:
     - What files will change?
     - What functionality exactly?
     - What are the acceptance criteria?

  2. Or split into multiple PRDs:
     - Break large features into smaller parts
     - One PRD per major component

  3. Resume and clarify: /karimo:plan --resume {slug}

Tip: Aim for 5-15 tasks per PRD for best results
```

---

### Reviewer Validation Failed

```
❌ Error: PRD validation found critical issues

The reviewer agent identified problems that must be fixed.

Common issues:
  1. Circular task dependencies (T001 → T002 → T001)
  2. Missing dependency (T002 needs T001 but not specified)
  3. Task complexity mismatch (task too simple/complex)
  4. Insufficient acceptance criteria

How to fix:
  • View reviewer feedback: (shown in terminal output)
  • Choose "Modify" option to adjust
  • Or resume: /karimo:plan --resume {slug}

After fixing, reviewer will re-validate automatically.
```

---

### DAG Generation Failed

```
❌ Error: Could not generate dependency graph (DAG)

Task dependencies could not be visualized.

Possible causes:
  1. Circular dependencies detected
  2. Invalid dependency references (task IDs don't exist)
  3. Dependency graph too complex
  4. Missing tasks.yaml file

How to fix:
  • Check tasks.yaml: cat .karimo/prds/{slug}/tasks.yaml
  • Verify task IDs are sequential and valid
  • Remove circular dependencies
  • Simplify dependency structure

The PRD can still execute, but wave ordering may be suboptimal.
```

---

### No Tasks Generated

```
❌ Error: PRD has no tasks after interview

The interview completed but no tasks were generated.

Possible causes:
  1. Requirements were informational only (no code changes)
  2. Task generation step skipped or failed
  3. Tasks manually deleted from tasks.yaml

How to fix:
  • Check tasks.yaml: cat .karimo/prds/{slug}/tasks.yaml
  • Re-run interview: /karimo:plan --resume {slug}
  • Or modify PRD: edit tasks.yaml directly

A PRD must have at least 1 task to be executable.
```

---

### Slug Collision

```
❌ Error: PRD slug 'user-auth' conflicts with existing PRD

A PRD with this slug already exists in .karimo/prds/

Existing PRD:
  Path: .karimo/prds/001_user-auth/
  Status: ready
  Created: 2026-03-01

Options:
  1. Use different feature name: /karimo:research "user-authentication"
  2. Resume existing: /karimo:plan --resume user-auth
  3. Delete existing: rm -rf .karimo/prds/*_user-auth (caution!)

Recommendation: Use unique feature name or resume existing PRD
```

---

## Output

### On Approval (Option 1)

```
╭──────────────────────────────────────────────────────────────╮
│  PRD Approved: {slug}                                        │
╰──────────────────────────────────────────────────────────────╯

PRD saved to: .karimo/prds/{NNN}_{slug}/PRD_{slug}.md

Tasks: {count} tasks defined
Complexity: {total_complexity} points
Ready tasks: {ready_count} (no dependencies)
Research: {included|not included}

The PRD is ready for execution. Run:

  /karimo:run --prd {slug}

Tip: Need more research? Run /karimo:research --prd {slug}
```

### On Save as Draft (Option 4)

```
PRD saved as draft: {slug}

Resume planning later with:
  /karimo:plan --resume {slug}
```

---

## New Workflow (v7.0)

```
═══════════════════════════════════════════════════════
RESEARCH → PLAN (iterate loop)
═══════════════════════════════════════════════════════

USER: /karimo:research "dark-mode-toggle"
  → Creates: .karimo/prds/dark-mode-toggle/
  → Runs: internal + external research
  → Saves: research/findings.md

USER: /karimo:plan --prd dark-mode-toggle
  → Loads: research/findings.md into context
  → Runs: 4-round interview (research-informed)
  → Renames: folder to 001_dark-mode-toggle
  → Creates: PRD.md, tasks.yaml

[ITERATE if needed]
USER: /karimo:research --prd dark-mode-toggle
  → Adds: additional research
  → Returns to planning

USER: /karimo:plan --prd dark-mode-toggle
  → Resumes planning with new research
```

---

## Related Commands

- `/karimo:research` — Required before planning, creates PRD folder
- `/karimo:run` — Executes tasks after approval
- `/karimo:dashboard` — Shows PRD status

---

*Generated by [KARIMO v7.0](https://github.com/opensesh/KARIMO)*
