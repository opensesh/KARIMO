# Contributing to KARIMO

Thank you for your interest in contributing to KARIMO! This guide explains how to contribute to the Claude Code configuration framework.

## What You're Contributing

KARIMO is a configuration framework, not a compiled application. Contributions are markdown files and YAML configurations:

| Component | Location | Purpose |
|-----------|----------|---------|
| **Agents** | `.claude/agents/` | Agent definitions for specialized tasks |
| **Commands** | `.claude/commands/` | Slash commands for user workflows |
| **Skills** | `.claude/skills/` | Reusable skill modules |
| **Templates** | `.karimo/templates/` | PRD and task schemas |
| **Workflows** | `.github/workflows/` | GitHub Actions automation |
| **Documentation** | `.karimo/docs/` | Architecture and guides |

---

## How to Add an Agent

1. Create `.claude/agents/{name}.md`
2. Follow the existing agent structure:

```markdown
# Agent Name

## Role

Brief description of the agent's purpose.

## Responsibilities

- Primary task 1
- Primary task 2

## Inputs

What context this agent receives.

## Outputs

What this agent produces.

## Constraints

Boundaries and limitations.
```

3. Test manually by referencing the agent in Claude Code
4. Update documentation if adding new capabilities

---

## How to Add a Command

1. Create `.claude/commands/{name}.md`
2. Follow the existing command structure:

```markdown
# /karimo:{command-name}

## Purpose

What this command does.

## Usage

/karimo:{command-name} [--option value]

## Workflow

1. Step one
2. Step two

## Output

What the user sees after execution.
```

3. Test the workflow end-to-end with Claude Code
4. Add to README.md command table

---

## How to Add a Skill

1. Create `.claude/skills/{name}.md`
2. Define the skill's purpose and instructions
3. Reference from agents or commands as needed
4. Test in isolation before integration

---

## How to Update Templates

Templates live in `.karimo/templates/`:

- `PRD_TEMPLATE.md` — PRD output format
- `INTERVIEW_PROTOCOL.md` — Interview flow
- `TASK_SCHEMA.md` — Task definition format
- `STATUS_SCHEMA.md` — Status tracking format

When updating templates, ensure backward compatibility with existing PRDs.

---

## Documentation

Documentation lives in `.karimo/docs/`:

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System design and integration |
| `PHASES.md` | Adoption phases |
| `COMMANDS.md` | Slash command reference |
| `CODE-INTEGRITY.md` | Code quality practices |
| `COMPOUND-LEARNING.md` | Learning system |
| `SECURITY.md` | Agent boundaries |

Keep documentation concise and focused on the "what" and "how" — avoid lengthy explanations of "why" unless critical.

---

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `feat/{component}/{description}`
3. Make your changes
4. Test with Claude Code manually
5. Update relevant documentation
6. Submit PR with clear description

### PR Title Format

```
<type>(<scope>): <description>
```

Examples:
- `feat(agents): add task-decomposer agent`
- `fix(commands): correct execute workflow`
- `docs(architecture): update integration diagram`

---

## Code of Conduct

- Be respectful and constructive
- Focus on the contribution, not the contributor
- Assume good intent

---

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.

---

## Questions?

Open an issue with the `question` label or start a discussion.
