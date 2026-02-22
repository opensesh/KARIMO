# KARIMO Methodology Rules

Portable rules that define KARIMO agent behavior. These rules are appended to your project's CLAUDE.md during installation and apply to all agent executions.

---

## Core Philosophy

**"You are the architect, agents are the builders, Greptile is the inspector."**

KARIMO agents execute tasks defined in PRDs. The human architect designs the feature through the interview process; agents build it; automated review validates it.

---

## Agent Behavior Rules

### 1. Task Boundaries

- **Complete your assigned task only.** Do not modify code outside your task's `files_affected` list unless absolutely necessary.
- **Never touch `Never Touch` files.** These are defined in the CLAUDE.md Boundaries section and include migrations, lock files, and environment files.
- **Flag `Require Review` files.** If your task requires modifying a file on this list, complete the task but note it prominently in the PR.

### 2. Commit Standards

- **Use Conventional Commits.** All commits must follow the format:
  ```
  <type>(<scope>): <description>

  [optional body]

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

- **Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`
- **Scope:** The component or module being modified
- **Always include the Co-Authored-By footer**

### 3. Code Quality

- **Follow existing patterns.** Before creating new patterns, check `files_affected` and `agent_context` for references to existing code.
- **Match the codebase style.** Use the same formatting, naming conventions, and architectural patterns as surrounding code.
- **No `any` types in TypeScript.** Use `unknown` and narrow, or define proper types.
- **Handle errors explicitly.** Use structured error types, never bare try/catch.

### 4. Testing

- **Add tests for new functionality.** If your task creates new code, include tests.
- **Don't break existing tests.** Run the test suite before committing.
- **Test edge cases.** Check for null, undefined, empty arrays, and error states.

### 5. Documentation

- **Update docs if behavior changes.** If your task changes how something works, update relevant documentation.
- **Add JSDoc to exported functions.** Public APIs should have documentation.
- **Don't create unnecessary docs.** Only document what needs explanation.

---

## Execution Rules

### 1. Task Completion

- **Complete your current task before stopping.** Don't leave partial implementations.
- **If blocked, document why.** Add a comment explaining what's blocking progress.
- **Mark ambiguous requirements.** If something is unclear, add a TODO and note it in the PR.

### 2. Worktree Discipline

- **Work in your assigned directory.** The PM agent sets your working directory when spawning.
- **Don't navigate outside your directory.** Your changes should only affect your assigned branch.
- **Commit frequently.** Make atomic commits that can be understood independently.

### 3. Pre-PR Validation

Before creating a PR, verify:
- [ ] Build passes (from CLAUDE.md Commands table)
- [ ] Type check passes (from CLAUDE.md Commands table)
- [ ] Lint passes (from CLAUDE.md Commands table)
- [ ] No `Never Touch` files modified (from CLAUDE.md Boundaries)
- [ ] Branch rebased on feature branch

### 4. PR Standards

- **Clear title:** `[KARIMO] [{task_id}] {task_title}`
- **Complete description:** Task context, changes made, files affected
- **Success criteria checklist:** Include criteria from the task definition
- **Note caution files:** If `require_review` files were modified

---

## Learning Rules

### 1. Pattern Recognition

- **Note patterns that work.** When you find an effective approach, it may apply to similar future tasks.
- **Identify anti-patterns.** When something causes problems, flag it for the `/karimo:feedback` system.

### 2. Post-PR Learning

After a PR is merged:
- **What worked?** Patterns that made the task smoother
- **What was harder than expected?** Complexities not captured in the PRD
- **What would help future tasks?** Missing context or documentation

### 3. Continuous Improvement

The human architect uses `/karimo:feedback` to capture learnings. These become rules that apply to future executions. Always check CLAUDE.md's `## KARIMO Learnings` section for project-specific guidance.

---

## Conflict Resolution

### 1. Merge Conflicts

If you encounter merge conflicts:
1. **Do not resolve automatically.** Mark the task as `needs-human-rebase`.
2. **Document the conflict.** List the conflicting files.
3. **Continue with other tasks.** Don't block the entire execution.

### 2. Ambiguous Requirements

If requirements are unclear:
1. **Check the PRD narrative.** The human-readable sections often have context.
2. **Look at `agent_context`.** Specific guidance may be there.
3. **Make a reasonable choice and document it.** Add a comment explaining your decision.
4. **Flag for review.** Note the ambiguity in the PR description.

### 3. Blocked Dependencies

If a dependency isn't ready:
1. **Check if you can stub it.** Sometimes a placeholder enables progress.
2. **Mark the task as blocked.** Update status to `blocked` with reason.
3. **Move to other tasks.** Work on independent tasks while waiting.

---

## Loop Awareness

### 1. Loop Count Tracking

Each task has a `loop_count` tracked in `status.json`. A "loop" is one complete attempt at a task (code → validate → commit or retry).

**Guardrails:**
- After 3 loops without progress → stall detection triggers
- Maximum 5 loops per task before human intervention required
- Model upgrades (Sonnet → Opus) reset loop count

### 2. Stall Detection

The PM agent monitors for stalls:
- Same error appearing across consecutive attempts
- Validation failing repeatedly with same pattern
- No meaningful progress between loops

**When stalled:**
- Task is paused
- PM assesses if model upgrade is appropriate
- Human is notified with options

### 3. Model-Based Execution

Tasks are assigned models based on complexity:
- **Complexity 1–4**: Sonnet (efficient for straightforward tasks)
- **Complexity 5–10**: Opus (complex reasoning, multi-file coordination)

If a Sonnet task stalls with borderline complexity (4-5), PM may upgrade to Opus.

### 4. Efficient Execution

Work efficiently by:
- Completing success criteria directly
- Not over-engineering solutions
- Using provided `agent_context` and patterns from `findings.md`
- Asking for clarification rather than guessing

---

## Communication

### 1. PR Comments

Use comments to:
- Explain non-obvious decisions
- Flag areas that need human attention
- Note deviations from the original task

### 2. Status Updates

Keep `status.json` current:
- Mark task `running` when starting
- Update to `in-review` when PR created
- Record `model` and `loop_count` on completion

### 3. Handoffs

When finishing a task that other tasks depend on:
- Ensure the code is properly exported/accessible
- Document any APIs or interfaces created
- Note anything the dependent task needs to know

---

## Security

### 1. Never Commit Secrets

- No API keys, tokens, or passwords in code
- Use environment variables for sensitive values
- Check for accidental secret exposure before committing

### 2. Input Validation

- Validate all external inputs
- Use Zod or similar for schema validation
- Never trust user-provided data

### 3. Safe Defaults

- Fail closed, not open
- Default to restrictive permissions
- Log security-relevant events

---

*These rules enable consistent, high-quality autonomous execution across projects.*
