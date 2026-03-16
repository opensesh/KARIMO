# Feedback: {slug}

**Type:** configuration | behavior | workflow | tooling
**Status:** open | investigating | resolved
**Created:** {timestamp}
**Complexity:** simple | complex

---

## Problem Statement

{What's broken or suboptimal — clear description of the issue}

### Scope

{Files, PRs, tasks, or areas of the codebase affected}

### Occurrence

{When does this happen — always, occasionally, specific conditions}

---

## Evidence Gathered

{This section populated by feedback-auditor for complex path investigations}

### From Status Files

{Specific data from status.json files showing this problem}
- Task completion patterns
- Loop counts and model usage
- Stall patterns
- Failure modes

### From PR History

{PR numbers, comments, patterns demonstrating the issue}
- Review feedback
- Revision reasons
- Greptile scores (if applicable)
- Files changed frequency

### From Codebase

{File patterns, grep results, config analysis}
- Conventions being violated
- Repeated mistakes across files
- Boundary violations

### From Configuration

{Analysis of config.yaml, learnings/, KARIMO_RULES.md}
- Gaps in current rules
- Conflicting guidance
- Missing boundaries

---

## Root Cause Analysis

**Problem Confirmed:** Yes | Partially | No

**Root Cause:** {One sentence explanation of why this is happening}

**Impact:** {Quantified — X PRDs, Y tasks, Z% failure rate, or qualitative impact}

### Analysis

{2-3 paragraphs explaining:
- Why this problem occurs
- What patterns contribute to it
- What configuration gaps or missing rules enable it
- How it relates to agent behavior, tooling, or workflow}

---

## Recommended Changes

### Change 1: {Target File}

**Type:** config_change | rule_addition | rule_removal | template_update | workflow_change
**Target:** `{file_path}`
**Confidence:** High | Medium | Low

**Change:**
```{language}
{Specific change to make — diff or full block}
```

**Rationale:** {Why this fix addresses the root cause}

---

### Change 2: {Target File} (if applicable)

**Type:** {type}
**Target:** `{file_path}`
**Confidence:** {level}

**Change:**
```{language}
{Specific change to make}
```

**Rationale:** {Why this fix addresses the root cause}

---

### Change 3: {Target File} (if applicable)

**Type:** {type}
**Target:** `{file_path}`
**Confidence:** {level}

**Change:**
```{language}
{Specific change to make}
```

**Rationale:** {Why this fix addresses the root cause}

---

## Applied Changes

{This section updated when changes are approved and applied}

### Approved Changes

- [ ] Change 1: {summary}
- [ ] Change 2: {summary}
- [ ] Change 3: {summary}

### Applied on: {timestamp}

**Commit:** {commit_sha}
**Message:** `{commit_message}`

**Changes made:**
1. {File 1}: {description of change}
2. {File 2}: {description of change}
3. {File 3}: {description of change}

---

## Verification

{How to verify this fix works in future PRDs/tasks}

### Success Criteria

{What indicates this is fixed:
- Agents no longer do X
- PRs pass review on first attempt for Y
- Tasks complete without Z pattern
- Metrics show improvement in W}

### Related PRDs

{PRD slugs that should no longer exhibit this problem}

---

## Related Issues

{Cross-references to other feedback documents, PRD tasks, or GitHub issues}

- Related to: `feedback/{other-slug}.md` ({brief description})
- Impacts PRD: `{prd-slug}` ({task IDs if specific})
- GitHub issue: #{number} ({title})

---

## Notes

{Additional context, observations, or follow-up items}

---

*Investigation completed: {duration}*
*Feedback document created by `/karimo:feedback` (complex path)*
*Evidence gathered by karimo-feedback-auditor*
