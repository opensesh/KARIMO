# KARIMO Skills Overview

This document provides an L1 overview of all KARIMO skills for quick context scanning.

## Skill Categories

### Agent Utilities

| Skill | Applies To | Purpose |
|-------|------------|---------|
| [karimo-bash-utilities](skills/karimo/bash-utilities.abstract.md) | All agents | Bash patterns for config, status, GitHub |

### Task Agent Standards

| Skill | Applies To | Purpose |
|-------|------------|---------|
| [karimo-code-standards](skills/karimo/code-standards.abstract.md) | Implementer agents | Coding patterns and validation |
| [karimo-testing-standards](skills/karimo/testing-standards.abstract.md) | Tester agents | Test patterns and coverage |
| [karimo-doc-standards](skills/karimo/doc-standards.abstract.md) | Documenter agents | Documentation patterns |

### Research Skills

| Skill | Applies To | Purpose |
|-------|------------|---------|
| [karimo-research-methods](skills/karimo/research-methods.abstract.md) | Researcher, Refiner | Internal codebase research (Phase 1) |
| [karimo-external-research](skills/karimo/external-research.abstract.md) | Researcher, Refiner | External web research (Phase 2) |
| [karimo-firecrawl-web-tools](skills/karimo/firecrawl-web-tools.abstract.md) | Researcher, Refiner | Firecrawl MCP tool reference |

---

## Skill-Agent Mapping

| Agent | Skills Used |
|-------|-------------|
| karimo-pm | karimo-bash-utilities |
| karimo-implementer | karimo-code-standards |
| karimo-implementer-opus | karimo-code-standards |
| karimo-tester | karimo-testing-standards |
| karimo-tester-opus | karimo-testing-standards |
| karimo-documenter | karimo-doc-standards |
| karimo-documenter-opus | karimo-doc-standards |
| karimo-researcher | karimo-research-methods, karimo-external-research, karimo-firecrawl-web-tools |
| karimo-refiner | karimo-research-methods, karimo-external-research, karimo-firecrawl-web-tools |

---

## Quick Reference

**Task implementation:** karimo-code-standards
**Test writing:** karimo-testing-standards
**Documentation:** karimo-doc-standards
**Codebase research:** karimo-research-methods
**Web research:** karimo-external-research + karimo-firecrawl-web-tools

---

*For full skill definitions, see `.claude/skills/karimo/{name}.md`*
*For quick abstracts, see `.claude/skills/karimo/{name}.abstract.md`*
