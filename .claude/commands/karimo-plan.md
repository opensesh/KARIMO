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

If `.karimo/prds/` is empty or contains no PRD folders, show:

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

Do not announce this output. After user confirms, proceed directly to Step 0.

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
   - Continue directly to Step 1 (interview)

5. On edit:
   - Allow user to modify values inline
   - Apply modifications to `.karimo/config.yaml`
   - Continue directly to Step 1 (interview)

6. On reject (n):
   - Exit with message: "Run `/karimo-configure` for manual configuration, then return to `/karimo-plan`"

**If user declines initial prompt (n):**
- Exit with message: "Run `/karimo-configure` when ready, then return to `/karimo-plan`"

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

Read `.karimo/config.yaml` to extract:
- `project` section for runtime, framework
- `commands` section for build, lint, test, typecheck
- `boundaries` section for never_touch, require_review patterns

**Note:** Other files (learnings.md, previous PRDs, templates) are loaded on-demand during later steps to keep startup fast.

### Step 2: Spawn Interviewer Agent

Use the karimo-interviewer agent to conduct the interview:

```
@karimo-interviewer.md
```

Pass the following context to the interviewer:
- Project configuration from `.karimo/config.yaml`
- The PRD name argument (if provided)

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
- `.karimo/learnings.md` — If exists, contains accumulated patterns and anti-patterns
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
3. Spawn the reviewer agent:
   ```
   @karimo-reviewer.md
   ```
4. Address any issues flagged by the reviewer
5. Save artifacts to `.karimo/prds/{NNN}_{slug}/`

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

The `created_date` field in `PRD_{slug}.md` is automatically set to the creation date.

```
.karimo/prds/001_feature-slug/
├── PRD_feature-slug.md # Narrative document (slug in filename for searchability)
├── tasks.yaml          # Extracted YAML task block
├── execution_plan.yaml # Wave-based execution plan (generated by reviewer)
├── status.json         # Execution state (empty until /karimo-execute)
├── findings.md         # Cross-task discoveries (maintained by PM agent)
├── briefs/             # Generated briefs per task (created by brief-writer agent)
│   ├── 1a_feature-slug.md
│   ├── 1b_feature-slug.md
│   └── ...
└── assets/             # Images referenced during interview
```

### Step 8a: Commit PRD Artifacts

**After the reviewer saves artifacts to `.karimo/prds/{NNN}_{slug}/`, commit immediately.**

This is a critical atomic commit step — PRD artifacts should be committed before brief generation or task execution begins.

```bash
git add .karimo/prds/{NNN}_{slug}/
git commit -m "docs(karimo): add PRD for {feature_name}

Generated via /karimo-plan interview.

Files:
- PRD_{slug}.md
- tasks.yaml
- execution_plan.yaml
- status.json

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Rationale:** Atomic commits keep PRD generation separate from brief generation and task execution. If the session is interrupted after PRD approval but before execution, the PRD artifacts are safely committed.

---

### Step 9: Research Prompt (After Approval)

**After PRD is committed and approved**, automatically prompt for research integration:

#### Step 9a: Import Existing General Research

Check if `.karimo/research/` contains any general research files:

```bash
ls .karimo/research/*.md 2>/dev/null
```

**If general research files exist:**

Present import prompt:

```
╭──────────────────────────────────────────────────────────╮
│  General Research Available                              │
╰──────────────────────────────────────────────────────────╯

Found {count} general research document(s):

  1. {topic-001.md} — {summary from index.yaml}
  2. {topic-002.md} — {summary from index.yaml}
  ...

Import any into this PRD? [y/n or select numbers]:
```

**If user selects research to import:**
- Copy selected files to `.karimo/prds/{NNN}_{slug}/research/imported/`
- Update `.karimo/prds/{NNN}_{slug}/research/imported/index.yaml` with import tracking
- Note: "Imported {count} research document(s)"

**If no general research exists or user declines:**
- Continue to Step 9b

#### Step 9b: Offer PRD-Scoped Research

Present research recommendation:

```
╭──────────────────────────────────────────────────────────╮
│  Run Research on This PRD? (Recommended)                 │
╰──────────────────────────────────────────────────────────╯

Research will:
  • Discover patterns in your codebase
  • Find best practices from documentation
  • Identify potential issues
  • Recommend libraries and approaches
  • Enhance PRD with concrete implementation context

This helps agents generate better task briefs and reduces
execution errors.

Run research? [Y/n]:
```

**If user accepts (Y or Enter):**

1. Execute `/karimo-research --prd {slug}` command
2. Research agent conducts PRD-scoped research:
   - Interactive questions about research focus
   - Internal codebase research
   - External web/documentation research
   - PRD enhancement with findings
3. After research completes:
   ```
   ✓ PRD enhanced with research findings

   Research details saved to:
     .karimo/prds/{NNN}_{slug}/research/

   PRD updated with Research Findings section.
   Briefs will inherit this context during /karimo-run.
   ```

**If user declines (n):**

```
⚠️  Skipped research. You can run later with:
     /karimo-research --prd {slug}

Note: Research is highly recommended before execution.
      It provides agents with implementation context and
      reduces brief validation failures.
```

Continue to final output (Step 10).

---

## Error Messages

### Configuration Not Found

```
❌ Error: No KARIMO configuration found

Configuration is required before creating a PRD.

How to fix:
  1. Run configuration: /karimo-configure
  2. Or run inline setup (will prompt during interview)

Configuration detects:
  • Runtime (Node.js, Python, etc.)
  • Framework (Next.js, Django, etc.)
  • Build/test commands
  • File boundaries

Time: ~5 minutes for basic mode
```

---

### PRD Already Exists

```
❌ Error: PRD with slug 'user-auth' already exists

A PRD with this slug has already been created.

Options:
  1. Resume existing PRD: /karimo-plan --resume user-auth
  2. Modify existing PRD: /karimo-modify --prd user-auth
  3. View existing PRD: cat .karimo/prds/*/user-auth/prd.md
  4. Use different slug: /karimo-plan (will generate new slug)

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
  • Retry: /karimo-plan --resume {slug}
  • If persists: /karimo-doctor

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
  • Use manual configuration: /karimo-configure --advanced
  • Verify project structure: ls -la
  • Check permissions: ls -la .
  • See supported frameworks: /karimo-help frameworks

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

  3. Resume and clarify: /karimo-plan --resume {slug}

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
  • Modify PRD: /karimo-modify --prd {slug}
  • Or re-run interview: /karimo-plan --resume {slug}

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
  • Re-run interview: /karimo-plan --resume {slug}
  • Or manually add tasks: /karimo-modify --prd {slug}

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
  1. Use different slug: (interview will auto-generate)
  2. Resume existing: /karimo-plan --resume user-auth
  3. Delete existing: rm -rf .karimo/prds/*_user-auth (caution!)

Recommendation: Use auto-generated slug or choose unique name
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

The PRD is ready for execution. Run:

  /karimo-run --prd {slug}

Tip: Need research? Run /karimo-research --prd {slug}
```

### On Save as Draft (Option 3)

```
PRD saved as draft: {slug}

Resume planning later with:
  /karimo-plan --resume {slug}
```
