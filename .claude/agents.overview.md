# KARIMO Agents Overview

This document provides an L1 overview of all KARIMO agents for quick context scanning.

## Agent Categories

### Coordination Agents

Orchestrate workflows, conduct interviews, and manage execution.

| Agent | Model | Trigger | Purpose |
|-------|-------|---------|---------|
| [karimo-pm](agents/karimo/pm.abstract.md) | sonnet | /karimo-run | Coordinates task execution, spawns workers, manages PRs |
| [karimo-interviewer](agents/karimo/interviewer.abstract.md) | sonnet | /karimo-plan, /karimo-feedback | Conducts PRD or feedback interviews |
| [karimo-investigator](agents/karimo/investigator.abstract.md) | sonnet | /karimo-configure | Scans codebase for patterns and config |
| [karimo-reviewer](agents/karimo/reviewer.abstract.md) | opus | /karimo-run | Validates PRDs before execution |

### Research Agents

Gather context from codebase and external sources.

| Agent | Model | Trigger | Purpose |
|-------|-------|---------|---------|
| [karimo-researcher](agents/karimo/researcher.abstract.md) | sonnet | /karimo-research | Two-phase research (internal + external) |
| [karimo-refiner](agents/karimo/refiner.abstract.md) | sonnet | /karimo-research | Processes annotations, follow-up research |

### Brief Agents

Generate and validate task briefs.

| Agent | Model | Trigger | Purpose |
|-------|-------|---------|---------|
| [karimo-brief-writer](agents/karimo/brief-writer.abstract.md) | sonnet | /karimo-run Phase 1 | Generates task briefs from PRD |
| [karimo-brief-reviewer](agents/karimo/brief-reviewer.abstract.md) | sonnet | /karimo-run Phase 2 | Validates briefs against codebase |
| [karimo-brief-corrector](agents/karimo/brief-corrector.abstract.md) | sonnet | After review | Applies fixes to briefs |

### Task Agents

Execute implementation, testing, and documentation tasks.

| Agent | Model | Complexity | Purpose |
|-------|-------|------------|---------|
| [karimo-implementer](agents/karimo/implementer.abstract.md) | sonnet | 1-4 | Production code implementation |
| [karimo-implementer-opus](agents/karimo/implementer-opus.abstract.md) | opus | 5+ | Complex multi-file implementation |
| [karimo-tester](agents/karimo/tester.abstract.md) | sonnet | 1-4 | Test writing and coverage |
| [karimo-tester-opus](agents/karimo/tester-opus.abstract.md) | opus | 5+ | Complex test coordination |
| [karimo-documenter](agents/karimo/documenter.abstract.md) | sonnet | 1-4 | Documentation creation |
| [karimo-documenter-opus](agents/karimo/documenter-opus.abstract.md) | opus | 5+ | Complex documentation |

### Integration Agents

Handle code integration, review, and feedback.

| Agent | Model | Trigger | Purpose |
|-------|-------|---------|---------|
| [karimo-review-architect](agents/karimo/review-architect.abstract.md) | sonnet | PM Agent | Integration validation (deprecated v5.0) |
| [karimo-feedback-auditor](agents/karimo/feedback-auditor.abstract.md) | sonnet | /karimo-feedback | Investigates feedback issues |
| [karimo-coverage-reviewer](agents/karimo/coverage-reviewer.abstract.md) | sonnet | /karimo-merge | Analyzes coverage gaps, adds PR comments |

---

## Model Distribution

| Model | Count | Usage |
|-------|-------|-------|
| **sonnet** | 14 | Standard complexity tasks, coordination |
| **opus** | 4 | High complexity (5+), deep reasoning |

---

## Tool Access Summary

| Tools | Agents |
|-------|--------|
| Read, Write, Edit, Bash, Glob, Grep | PM, Implementer(s), Tester(s), Documenter(s), Review-Architect |
| Read, Grep, Glob | Interviewer, Investigator, Reviewer, Coverage-Reviewer |
| Read, Grep, Glob, Bash | Brief-Reviewer, Feedback-Auditor |
| Read, Write, Grep, Glob | Brief-Writer |
| Read, Edit, Write, Grep, Glob | Brief-Corrector |

---

## Quick Reference

**Start execution:** PM Agent orchestrates all task agents
**Start interview:** Interviewer Agent gathers requirements
**Start research:** Researcher Agent conducts two-phase research
**Validate PRD:** Reviewer Agent (opus) checks before execution
**Validate briefs:** Brief-Reviewer + Brief-Corrector cycle

---

*For full agent definitions, see `.claude/agents/karimo/{name}.md`*
*For quick abstracts, see `.claude/agents/karimo/{name}.abstract.md`*
