# Getting Started with KARIMO

This guide walks you through installing KARIMO and creating your first PRD.

**Total time: ~20 minutes** (5 min install + 10 min first PRD + 5 min verification)

---

## Prerequisites (~2 min)

Before installing KARIMO, ensure you have:

| Requirement | Command to Check | Installation |
|-------------|------------------|--------------|
| **Claude Code** | `claude --version` | [claude.ai/code](https://claude.ai/code) |
| **GitHub CLI** | `gh --version` | `brew install gh && gh auth login` |
| **Git 2.5+** | `git --version` | Included on macOS/Linux |

### Optional but Highly Recommended

| Tool | Purpose | Installation |
|------|---------|--------------|
| **Greptile** | Automated code review (Phase 2) | [app.greptile.com](https://app.greptile.com) |
| **Claude Code Review** | Automated code review (Phase 2) | Teams/Enterprise |

Automated code review catches issues before human review and enables revision loops. Choose your provider:
- **Greptile**: $30/month flat, GitHub App with configurable threshold. Best for high volume (50+ PRs/month)
- **Claude Code Review**: $15-25 per PR, native Claude integration

---

## Installation (~3 min)

### Option A: One-liner (fastest)

```bash
curl -sL https://raw.githubusercontent.com/opensesh/KARIMO/main/.karimo/remote-install.sh | bash -s /path/to/your/project
```

This downloads KARIMO to a temp directory, runs the installer, and cleans up automatically.

### Option B: Clone first (inspect before running)

```bash
git clone https://github.com/opensesh/KARIMO.git
bash KARIMO/.karimo/install.sh /path/to/your/project
```

**Configuration:** After installation, run `/karimo:configure` to auto-detect your project:
- Package manager (pnpm, yarn, npm, bun, poetry, etc.)
- Runtime (Node.js, Bun, Deno, Python, Go, Rust)
- Framework (Next.js, Nuxt, SvelteKit, Astro, etc.)
- Build commands from package.json scripts

Configuration is written to `.karimo/config.yaml`.

**Options:**
- `--ci` — CI mode: non-interactive, skips prompts

The installer uses `.karimo/MANIFEST.json` as the single source of truth for file inventory.

**Note:** KARIMO installs zero workflows by default. If you want Greptile integration, run `/karimo:configure --greptile` after installation.

This installs:
- Agent definitions to `.claude/plugins/karimo/agents/`
- Slash commands to `.claude/plugins/karimo/commands/`
- Skills to `.claude/plugins/karimo/skills/`
- Agent rules to `.claude/plugins/karimo/KARIMO_RULES.md`
- Templates to `.karimo/templates/`
- Scripts to `.karimo/scripts/` (asset management CLI)
- Learnings template to `.karimo/learnings/`
- Marker-delimited KARIMO section appended to `CLAUDE.md` (~20 lines)

### 3. Verify Installation

```bash
cd /path/to/your/project
ls -la .claude/
ls -la .karimo/
```

You should see the KARIMO components in both directories.

---

## Updating KARIMO (~1 min)

Two ways to update, depending on your setup:

### From within your project (recommended)

```bash
cd /path/to/your/project
.karimo/update.sh
```

This fetches the latest release from GitHub, shows a diff, and asks for confirmation.

### From a local KARIMO clone

If you have KARIMO cloned locally (e.g., for development or offline use):

```bash
bash KARIMO/.karimo/update.sh --local KARIMO /path/to/your/project
```

### Update flags

| Flag | Description |
|------|-------------|
| `--check` | Check for updates without installing |
| `--force` | Update even if already on latest version |
| `--ci` | Non-interactive mode (auto-confirm) |

### Files preserved during updates

These files are never modified by updates:
- `.karimo/config.yaml` — Your project configuration
- `.karimo/learnings/` — Your accumulated learnings
- `.karimo/prds/*` — Your PRD files
- `CLAUDE.md` — Your content is preserved; KARIMO section (marker-delimited) may be updated

---

## Two Installation Paths

KARIMO works whether you're starting fresh or adding to an existing Claude Code project.

### Path A: Fresh Project

If your project doesn't have `.claude/` yet:

1. Run `install.sh` as shown above
2. New `CLAUDE.md` created with minimal KARIMO reference block (~8 lines)
3. All components installed to empty directories
4. Ready to use immediately

### Path B: Existing Claude Code Project

If your project already has `.claude/` with custom agents, commands, or `CLAUDE.md`:

**What gets preserved:**
- Your existing agents in `.claude/agents/`
- Your existing commands in `.claude/commands/`
- Your existing skills in `.claude/skills/`
- Your existing `CLAUDE.md` content

**What gets added (from MANIFEST.json):**
- 22 KARIMO agents in `.claude/plugins/karimo/agents/`
- 11 slash commands in `.claude/plugins/karimo/commands/`
- 7 KARIMO skills in `.claude/plugins/karimo/skills/`
- `.claude/plugins/karimo/KARIMO_RULES.md`
- `.karimo/` directory with templates, scripts, manifest, and learnings
- Marker-delimited KARIMO section appended to `CLAUDE.md` (~20 lines)

**Optional (installed via `/karimo:configure --greptile`):**
- `karimo-greptile-review.yml` — automated code review via Greptile

**Naming convention:** All KARIMO-managed files use the `karimo-*` prefix for agents, commands, and skills. This enables reliable cleanup during updates and clear distinction from user-added files.

**Naming conflicts:** If you have files with the `karimo-*` prefix, rename yours before installing.

---

## Your First PRD (~15 min)

### v7.0 Workflow: Research First

KARIMO v7.0 uses a research-first workflow. Research is required before planning (unless you use `--skip-research`).

```
/karimo:research "my-feature"    # Creates folder, runs research (~5 min)
/karimo:plan --prd my-feature    # Uses research, creates PRD (~10 min)
```

### 1. Start Claude Code

```bash
cd your-project
claude
```

### 2. Run Research (Required First Step)

```
/karimo:research "user-profiles"
```

This creates the PRD folder and runs research:

1. **Creates folder structure** — `.karimo/prds/user-profiles/research/` and `assets/`
2. **Asks focus questions** — What patterns to look for, external research topics
3. **Scans codebase** — Finds patterns, dependencies, conventions
4. **External research** — Best practices, libraries, documentation
5. **Captures visual assets** — Downloads diagrams and screenshots from docs
6. **Generates findings** — `research/findings.md` summary

Research output:
```
.karimo/prds/user-profiles/
├── research/
│   ├── internal/
│   │   ├── patterns.md
│   │   ├── errors.md
│   │   └── dependencies.md
│   ├── external/
│   │   ├── best-practices.md
│   │   └── libraries.md
│   └── findings.md          # Summary for interview
├── assets/
│   └── research/            # Screenshots and diagrams captured
└── assets.json              # Asset metadata (if assets captured)
```

### 3. Run the Plan Command

```
/karimo:plan --prd user-profiles
```

The `--prd` flag is **required** and must point to an existing research folder.

**First-time setup:** If this is your first PRD, `/karimo:plan` detects missing configuration and guides you through inline setup:

1. Shows a brief explanation of why configuration matters
2. Spawns an investigator agent to scan your codebase
3. Presents detected settings (runtime, framework, commands, boundaries)
4. You can accept, edit, or reject the detected config
5. After config is set, the interview continues automatically

**Returning users:** If configuration already exists, the interview starts immediately with research context loaded.

### 4. Follow the Interview (~8 min)

The interviewer agent guides you through 4 rounds (research-informed):

| Round | Focus | Time |
|-------|-------|------|
| 1 | **Framing** — What are you building? (with research context) | ~5 min |
| 2 | **Requirements** — Priorities and acceptance criteria | ~10 min |
| 3 | **Dependencies** — Task ordering and blockers | ~5 min |
| 4 | **Retrospective** — Apply learnings from previous PRDs | ~3 min |

**Visual Assets (NEW in v7.8):** During the interview, you can provide:
- **Image URLs** — `https://example.com/mockup.png`
- **Local file paths** — `/Users/you/Desktop/design.jpg`

The interviewer automatically:
- Downloads or copies the file
- Stores in `assets/planning/` with timestamped filename
- Updates `assets.json` metadata
- Embeds markdown reference in PRD

**Example interaction:**
```
You: Here's the dashboard mockup: https://example.com/dashboard.png

Interviewer:
✓ Image stored: planning-dashboard-mockup-20260315151500.png
I've embedded the mockup in the PRD.
```

**Incremental Commits (v7.7+):** After each round, the PRD section is committed to git with a conventional commit message. This provides:
- Git-based crash recovery if interrupted
- Audit trail of interview progression
- No leftover uncommitted markdown artifacts

**Commit Messages:**
- Round 1: `docs(karimo): add PRD framing for {slug}`
- Round 2: `docs(karimo): add PRD requirements for {slug}`
- Round 3: `docs(karimo): add PRD dependencies for {slug}`
- Round 4: `docs(karimo): complete PRD for {slug}`

**PRD Lifecycle Flow:**

```mermaid
graph LR
    A[/karimo:research] --> B[Research<br/>internal+external]
    B --> C[/karimo:plan<br/>--prd slug]
    C --> D[Interview<br/>4 rounds]
    D --> E[Reviewer<br/>validates PRD]
    E --> F{User<br/>Approval?}
    F -->|Yes| G[PRD Saved<br/>status: ready]
    F -->|More Research| A
    F -->|Save Draft| H[Draft Saved]
    G --> I[/karimo:run]
    H --> J[/karimo:plan<br/>--resume]
    J --> D
```

### 5. Approve the PRD

After review, you'll see a summary with options:
- **Approve** — Marks PRD as `ready` for execution
- **Modify** — Make changes and re-run the reviewer
- **Save as draft** — Come back later with `/karimo:plan --resume {slug}`

### 6. Check the Generated PRD

After approval, verify your PRD:

```bash
cat .karimo/prds/{slug}/prd.md
cat .karimo/prds/{slug}/tasks.yaml
```

**Example output structure:**

```
.karimo/prds/user-profiles/
├── prd.md              # Full PRD document
├── tasks.yaml          # Task definitions with dependencies
├── execution_plan.yaml # DAG for parallel execution
├── status.json         # Execution state (created during /karimo:run)
└── metrics.json        # Execution metrics (created at PRD completion)
```

The `tasks.yaml` contains entries like:

```yaml
tasks:
  - id: T001
    title: Create user profile model
    type: implementation
    complexity: 2
    dependencies: []
  - id: T002
    title: Add profile API endpoints
    type: implementation
    complexity: 3
    dependencies: [T001]
```

---

## Research Details *(v7.0)*

Research is now the **required first step** in KARIMO v7.0. It runs before planning (not after).

### Why Research First?

- **40% fewer brief validation errors** — Agents understand your codebase before creating task briefs
- **Research-informed interviews** — Interviewer uses findings to ask better questions
- **Better library recommendations** — External research identifies proven approaches
- **Fewer revision loops** — Tasks are grounded in codebase reality

### Skip Research (Not Recommended)

For urgent hotfixes where research adds no value:

```
/karimo:plan --prd my-feature --skip-research
```

This shows a warning but proceeds without research context.

### Research Focus Questions

When you run `/karimo:research "feature-name"`, the researcher agent asks what to focus on:

```
What would you like to research for this feature?

□ Existing patterns in codebase
□ External best practices
□ Library recommendations
□ Error/gap identification
□ Dependencies and integration points
□ Performance considerations
□ Security considerations

Additional research notes: [free text]
```

Select relevant areas (use arrow keys and space to toggle).

### Research Execution

The agent will:
1. **Internal Research** (~10-15 min):
   - Scan codebase for patterns (grep/glob)
   - Identify missing components
   - Map dependencies (shared types, utilities)
   - Analyze directory structure and conventions

2. **External Research** (~10-15 min):
   - Web search for best practices
   - Find library recommendations
   - Scrape documentation
   - Evaluate npm packages

3. **Generate Findings** (~2 min):
   - Create `research/findings.md` summary
   - Save detailed artifacts to `research/internal/` and `research/external/`
   - Commit research to PRD folder

### Verify Research Output

After research completes, check the findings:

```bash
cat .karimo/prds/{slug}/research/findings.md
```

You'll see a summary like:

```markdown
# Research Findings: user-profiles

**Generated:** 2026-03-11T14:30:00Z

## Key Patterns Found

- **requireAuth() wrapper:** Route protection (src/lib/auth/middleware.ts:42)
  - All protected routes use this pattern
- **User model pattern:** Existing models in src/models/ use Prisma + Zod

## Recommended Approaches

- **Form validation with Zod:** Type-safe schema validation
  - Source: [Zod Documentation](https://zod.dev)
  - Already in use in codebase

## Identified Gaps

- ⚠️ **No Error Boundaries:** None found in codebase
  - Impact: Errors crash entire app
  - Recommendation: Create shared ErrorBoundary component

## Libraries

- **zod** (already installed, v3.22.4)
- Consider: **react-hook-form** for form state management
```

### Iterating on Research

After planning, you may want more research. Use the `--prd` flag to add to existing research:

```
/karimo:research --prd user-profiles
```

This adds to the existing research folder without starting over.

### Optional: Refine Research with Annotations

Add annotations to research files for clarification:

```markdown
### Pattern: Authentication Flow

**Location:** src/lib/auth/

<!-- ANNOTATION
type: question
text: "Should this pattern apply to API routes too?"
-->
```

Then refine:

```
/karimo:research --refine --prd user-profiles
```

The refiner agent addresses annotations and updates research.

---

## Execution: /karimo:run

### Run with Brief Review Loop

```
/karimo:run --prd user-profiles
```

KARIMO v7.0 uses a 4-phase execution model with a user approval loop before tasks execute:

### Phase 1: Brief Generation

- Reads research findings + PRD
- Generates self-contained task briefs (`.karimo/prds/{slug}/briefs/`)
- Each brief includes research context
- **NEW in v7.8:** Briefs inherit asset references from PRD for tasks involving UI/design

### Phase 2: Auto-Review

The brief-reviewer agent challenges the briefs:
- Is task order correct?
- Are dependencies properly specified?
- Are file boundaries respected?
- Are there gaps in coverage?

Generates recommendations for user review.

### Phase 3: User Iterate

You review the briefs and recommendations:

```
╭──────────────────────────────────────────────────────────╮
│  Brief Review Complete                                   │
╰──────────────────────────────────────────────────────────╯

Generated 5 task briefs.

Recommendations:
  ⚠️  Task T002 should run before T001 (dependency)
  ✓  All file boundaries respected
  ?  Consider adding test for edge case X

Options:
  1. Approve — Execute tasks as-is
  2. Apply fixes — Apply recommended changes
  3. Modify — Adjust briefs/order manually
  4. More research — Run /karimo:research --prd
  5. Cancel — Exit without executing

Your choice:
```

You can iterate until satisfied, then approve to proceed.

### Phase 4: Orchestrate

After approval, tasks execute in waves:

```
Wave 1: [1a, 1b] — Execute in parallel
        ↓ (wait for merge)
Wave 2: [2a, 2b] — Execute in parallel
        ↓ (wait for merge)
Wave 3: [3a] — Final task
```

- PM Agent coordinates wave-based execution
- Claude Code manages worktrees via `isolation: worktree`
- Branch naming: `worktree/{prd-slug}-{task-id}`
- **Safety guardrails (v7.6.0):**
  - Worktree manifest validates PRD-to-branch binding
  - 4-layer branch assertion prevents wrong-branch commits
  - Semantic loop detection catches stuck tasks
  - Orphan cleanup removes abandoned worktrees
  - See [Safeguards](SAFEGUARDS.md#parallel-execution-safety) for details

### 3. Monitor Progress

The PM Agent coordinates execution in real-time. Check status:

```
/karimo:dashboard
```

Shows progress across all PRDs:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Status                                               │
╰──────────────────────────────────────────────────────────────╯

PRDs:

  001_user-profiles          active     ████████░░ 80%
    Wave 2 of 3 in progress
    Tasks: 4/5 done, 1 in-review
```

---

## After Execution

### Review PRs (~5 min per PR)

Agent-created PRs appear in your repository. Review and merge as normal.

### Capture Learnings

If you notice agent patterns worth capturing:

```
/karimo:feedback

> "Always use the existing Button component"
```

This appends rules to `.karimo/learnings/` for future agents.

---

## Configuration

Configuration is stored in `.karimo/config.yaml` (single source of truth). Learnings are stored separately in `.karimo/learnings/`.

### Configure After Install

After running `install.sh`, configure your project:

```
/karimo:configure
```

This auto-detects and writes to `.karimo/config.yaml`:
- **Runtime** — Node.js, Bun, Deno, Python, Go, Rust
- **Framework** — Next.js, Nuxt, SvelteKit, Astro, Vue, etc.
- **Package manager** — pnpm, yarn, npm, bun, poetry, pip
- **Commands** — build, lint, test, typecheck from package.json
- **Boundaries** — Default patterns for lock files, .env files, migrations, auth
- **GitHub** — Owner, repository, default branch

### Configure CD Provider (Optional)

If you use preview deployments (Vercel, Netlify, etc.), KARIMO task PRs
may trigger build failures. This is expected — partial code doesn't build
in isolation, but works once all wave tasks merge.

To skip preview builds for KARIMO branches:

```
/karimo:configure --cd
```

This will detect your deployment provider and configure it to skip KARIMO task branches.

See [CI-CD.md](CI-CD.md) for details on KARIMO's CI/CD integration approach.

### Verify Configuration

After configuration, verify everything is valid:

```
/karimo:doctor
```

This checks for:
- KARIMO section exists in CLAUDE.md
- `.karimo/config.yaml` exists with valid structure
- `.karimo/learnings/` exists
- Configuration drift (values vs actual project state)

---

## Troubleshooting

### "GitHub CLI not authenticated"

```bash
gh auth login
gh auth status
```

### "Claude Code not found"

Ensure Claude Code is installed and in your PATH:
```bash
which claude
```

### "Command not found" after install

Restart Claude Code to reload commands:
```bash
claude
```

### "Agent not found"

Verify agents are installed:
```bash
ls .claude/agents/
```

Should show KARIMO agents alongside any existing agents.

### "Task crashed" or stale execution

KARIMO uses git state reconstruction. Run:
```bash
/karimo:run --prd {slug}
```

This will reconcile status.json with git reality and resume from the correct point.

### "Want automated code review?"

KARIMO installs zero review workflows by default. Choose your provider:

**Option A: Greptile** ($30/month, best for high volume)

Greptile is a GitHub App that provides AI-powered code review with confidence scores.

> **Important: No API key required.** Greptile uses a GitHub App, not API calls.
> You do NOT need a `GREPTILE_API_KEY` secret. Just install the GitHub App.

**Step 1: Dashboard Setup (Required First)**
1. Install Greptile GitHub App: [app.greptile.com](https://app.greptile.com)
2. Add your repository in Greptile dashboard
3. Wait for repository indexing (~1-2 hours for large repos)
4. Navigate to Code Review Agent section
5. Enable: PR Summary, Confidence Score, Issue Tables, Diagram, Comments Outside Diff

**Step 2: Run Configure Command**
```
/karimo:configure --greptile
```

This will:
- Verify you've completed dashboard setup
- Create `.greptile/config.json`
- **Generate project-specific `.greptile/rules.md`** by analyzing your codebase, CLAUDE.md, and learnings
- Install `karimo-greptile-trigger.yml` workflow
- Ask for your target threshold (5/5 recommended)
- Update `.karimo/config.yaml` with review settings

The rules generator analyzes your project to create review rules with CORRECT/WRONG code examples specific to your codebase.

**Step 3: Link Rules in Greptile Dashboard**

After KARIMO generates `.greptile/rules.md`, tell Greptile to use it:

1. Go to [app.greptile.com](https://app.greptile.com) → Code Review Agent → **Custom Context**
2. Click **"+ Add Context"**
3. Set **Context Type**: File
4. Set **File Path**: `.greptile/rules.md`
5. Click **Save**

This links your auto-generated project rules to Greptile. Changes to `rules.md` apply immediately — no need to re-link.

**How it works:**
1. PM Agent creates PR with `karimo` label
2. GitHub workflow posts `@greptileai` comment
3. Greptile GitHub App detects the @mention and reviews
4. Review appears as PR comment with confidence score
5. Subsequent pushes automatically trigger re-review

**Troubleshooting Greptile:**

| Issue | Cause | Solution |
|-------|-------|----------|
| No review after 10 minutes | App not installed | Install at app.greptile.com |
| "Repository not found" | Repo not indexed | Add repo in Greptile dashboard |
| No confidence score | Wrong settings | Enable "Confidence Score" in dashboard |
| Review not triggered | Missing @mention | Check workflow posted @greptileai comment |

**Option B: Claude Code Review** ($15-25/PR, native integration)
```
/karimo:configure --code-review
```
Then enable at `claude.ai/admin-settings/claude-code` and install Claude GitHub App.

**Interactive choice:**
```
/karimo:configure --review
```

---

## FAQ

### Will KARIMO disrupt my existing configuration?

No. KARIMO uses the `karimo-` prefix for both agents and commands to avoid conflicts. Your existing agents, commands, and skills remain unchanged.

### How does KARIMO modify CLAUDE.md?

KARIMO appends a marker-delimited section (~20 lines) after your existing content, separated by `---`. Your existing CLAUDE.md content remains untouched.

The KARIMO section uses HTML comment markers for clear boundaries:
```markdown
<!-- KARIMO:START - Do not edit between markers -->
## KARIMO
... quick reference and GitHub Configuration table ...
<!-- KARIMO:END -->
```

Benefits of marker-based format:
- Clear visual boundaries for users
- Programmatic detection for updates and uninstall
- GitHub Configuration table auto-populated by `/karimo:configure`

All detailed configuration is stored in `.karimo/config.yaml` and learnings in `.karimo/learnings/`.

### What if I have agents with the same names?

KARIMO agents are named `karimo-interviewer`, `karimo-investigator`, `karimo-reviewer`, `karimo-pm`, and `karimo-feedback-auditor`. If you have agents with these exact names, rename yours before installing. This is rare since KARIMO uses a consistent prefix.

### Can I uninstall KARIMO?

Yes. The recommended way is to run the uninstall script:

```bash
bash /path/to/KARIMO/.karimo/uninstall.sh /path/to/your/project
```

Or manually remove these files:

```bash
rm -rf .karimo/
rm -rf .claude/plugins/karimo/
rm .github/workflows/karimo-*.yml
```

Then remove the KARIMO section from `CLAUDE.md`. For marker-based installations, remove everything between `<!-- KARIMO:START -->` and `<!-- KARIMO:END -->` (inclusive). For legacy installations, remove from `## KARIMO` to the end of the file or the next `---` separator.

### Do I need automated code review?

Automated code review (Greptile or Claude Code Review) is optional but highly recommended.

**Without automated review**, KARIMO still:
- Creates PRDs through interviews
- Executes tasks with agent coordination
- Creates PRs with pre-validation

**With automated review**, you get:
- Code review on every PR
- Quality gates (score-based or finding-based)
- Automated revision loops when issues are found

**Choose your provider:**
- **Greptile**: $30/month flat. Best for high PR volume (50+/month).
- **Claude Code Review**: $15-25 per PR. Best for low-medium volume, native Claude integration.

Run `/karimo:configure --review` to choose your provider.

### How does KARIMO handle task isolation?

KARIMO v4.0 uses Claude Code's native `isolation: worktree` feature. Claude Code automatically creates and cleans up worktrees for each task agent. You don't need to manage worktrees manually.

### Vercel/Netlify previews fail on KARIMO PRs

This is expected. KARIMO task PRs contain partial code that won't build
in isolation. The code works once all wave tasks merge to main.

Run `/karimo:configure --cd` to configure your deployment provider to skip
KARIMO task branches, or accept the noise (failures don't block merges).

---

## Next Steps

| Task | Documentation |
|------|---------------|
| Learn about adoption phases | [PHASES.md](PHASES.md) |
| Explore slash commands | [COMMANDS.md](COMMANDS.md) |
| Understand safeguards | [SAFEGUARDS.md](SAFEGUARDS.md) |

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [PHASES.md](PHASES.md) | Adoption phases explained |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and integration |
| [COMMANDS.md](COMMANDS.md) | Slash command reference |
