# KARIMO Plugin

Autonomous development methodology for Claude Code.

**"You are the architect, agents are the builders, automated review is the inspector."**

## Overview

KARIMO transforms product requirements into shipped code using AI agents, GitHub automation, and structured human oversight.

## Contents

| Directory | Contents |
|-----------|----------|
| `agents/` | 22 agent definitions |
| `commands/` | 11 slash commands |
| `skills/` | 7 skills |
| `KARIMO_RULES.md` | Agent behavior rules |

## Commands

Type `/karimo:` in Claude Code to see available commands:

- `/karimo:research` — Research phase (required first step)
- `/karimo:plan` — PRD interview
- `/karimo:run` — Execute PRD
- `/karimo:merge` — Final PR creation
- `/karimo:dashboard` — Monitor progress
- `/karimo:feedback` — Capture learnings
- `/karimo:configure` — Project setup
- `/karimo:doctor` — Health check
- `/karimo:update` — Update KARIMO
- `/karimo:help` — Documentation

## Project State

KARIMO stores project-specific data in `.karimo/`:

- `config.yaml` — Project configuration
- `prds/` — PRD files and execution state
- `learnings/` — Accumulated patterns and anti-patterns
- `templates/` — PRD and task templates

## Documentation

See [github.com/opensesh/KARIMO](https://github.com/opensesh/KARIMO) for full documentation.

## License

Apache 2.0
