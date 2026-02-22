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

| Template | Purpose |
|----------|---------|
| `PRD_TEMPLATE.md` | PRD output format |
| `INTERVIEW_PROTOCOL.md` | Interview flow |
| `TASK_SCHEMA.md` | Task definition format |
| `STATUS_SCHEMA.md` | Status tracking format |
| `DEPENDENCIES_TEMPLATE.md` | Runtime dependency tracking |
| `LEARN_INTERVIEW_PROTOCOL.md` | /karimo:learn interview flow |
| `FINDINGS_TEMPLATE.md` | Cross-task discoveries |
| `TASK_BRIEF_TEMPLATE.md` | Self-contained task briefs |

When updating templates, ensure backward compatibility with existing PRDs.

---

## Testing Your Changes

KARIMO is a configuration framework, not compiled code. Testing is validation-focused.

### Manual Testing (Required)

Before submitting a PR:

1. **Install to test project:**
   ```bash
   cd /path/to/test-project
   bash /path/to/KARIMO/.karimo/install.sh .
   ```

2. **Run doctor:**
   ```bash
   # In Claude Code
   /karimo:doctor
   ```
   All checks should pass.

3. **Test your specific change:**
   - Agent changes: Run `/karimo:plan` and verify agent behavior
   - Command changes: Execute the command with various inputs
   - Template changes: Create a PRD using the template
   - Workflow changes: Trigger workflow in test repo

4. **Run smoke test:**
   ```bash
   /karimo:test
   ```

### Validation Checks

| Change Type | Validation |
|-------------|------------|
| Agent | Spawn agent, verify output format |
| Command | Run command, check state.json updates |
| Template | Create PRD, verify structure |
| Workflow | Trigger action, check logs |
| Documentation | Render markdown, check links |

### Common Issues

- **Agent not spawning:** Check skill reference in agent definition
- **Command failing:** Verify state.json schema compatibility
- **Template errors:** Ensure placeholders match expected format

---

## Documentation

Documentation lives in `.karimo/docs/`:

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | System design and integration |
| `PHASES.md` | Adoption phases |
| `COMMANDS.md` | Slash command reference |
| `GETTING-STARTED.md` | Installation and first PRD |
| `SAFEGUARDS.md` | Code integrity, security, Greptile |
| `COMPOUND-LEARNING.md` | Learning system |
| `DASHBOARD.md` | Dashboard spec (Phase 3) |

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
