# Contributing to KARIMO

Thank you for your interest in contributing to KARIMO. This document provides guidelines and instructions for contributing.

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0.0
- [Git](https://git-scm.com/)
- TypeScript knowledge

### Getting Started

```bash
# Clone the repository
git clone https://github.com/opensesh/KARIMO.git
cd KARIMO

# Install dependencies
bun install

# Verify your setup (for new contributors)
bun run onboard

# Run type checking
bun run typecheck

# Run linting
bun run lint
```

> **Note:** If you're setting up KARIMO for a new target project, use `karimo init` to generate `.karimo/config.yaml`. The init command auto-detects project settings (language, framework, commands, rules) and lets you confirm before saving. For existing projects with config already committed, `bun run onboard` verifies your local setup is correct.

---

## Code Standards

### TypeScript

- **Strict mode** — No `any` types. Use `unknown` if the type is truly unknown.
- **Zod validation** — All external inputs must be validated with Zod schemas.
- **Explicit types** — Prefer explicit type annotations over inference for public APIs.
- **No `as` casts** — Use type guards or proper type narrowing.

### File Organization

- One primary export per file where possible
- Use barrel exports via `index.ts`
- Tests as `*.test.ts` next to source files
- Path aliases: `@/` maps to `src/`

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check for issues
bun run lint

# Fix issues automatically
bun run lint:fix

# Format code
bun run format
```

---

## Architecture Rules

### Ring-Based Development

KARIMO follows a ring-based build plan. Each ring adds capabilities:

- **Ring 0:** Basic agent execution
- **Ring 1:** GitHub Projects integration
- **Ring 2:** Automated review (Greptile)
- **Ring 3:** Full orchestration
- **Ring 4:** Parallel execution + fallback engines
- **Ring 5:** Dashboard

Contributions should target the current ring. See [RINGS.md](./RINGS.md) for details.

### Module Boundaries

Each module in `src/` has a clear boundary:

| Module | Responsibility |
| ------ | -------------- |
| `orchestrator` | Execution loop, task coordination |
| `config` | Configuration loading and validation |
| `prd` | PRD parsing and task extraction |
| `git` | Git operations (worktrees, branches, rebases) |
| `github` | GitHub API interactions |
| `agents` | Agent process management |
| `learning` | Checkpoint collection and config updates |
| `cost` | Cost tracking and budget enforcement |
| `cli` | Command-line interface |
| `types` | Shared type definitions |

### No Circular Dependencies

Modules should not import from each other in cycles. The dependency flow is:

```
cli → orchestrator → {agents, git, github, cost, learning}
                   ↓
              config, prd, types
```

---

## Git Workflow

### Branch Naming

```
karimo/<scope>/<description>
```

Examples:
- `karimo/orchestrator/add-cost-tracking`
- `karimo/cli/implement-status-command`
- `karimo/docs/update-architecture`

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

Co-Authored-By: Your Name <your@email.com>
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `refactor:` — Code restructuring
- `docs:` — Documentation changes
- `test:` — Test additions/updates
- `chore:` — Maintenance tasks

**Examples:**
```
feat(orchestrator): add cost ceiling enforcement

Implements per-task cost ceilings based on complexity × cost_multiplier.
Aborts tasks that exceed their ceiling.

Co-Authored-By: Your Name <your@email.com>
```

### Pull Requests

1. Create a branch from `main`
2. Make your changes with clear commits
3. Run `bun run typecheck` and `bun run lint`
4. Push and open a PR
5. Fill out the PR template
6. Wait for review

---

## Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test src/cost/index.test.ts

# Run with coverage
bun test --coverage
```

Tests should be placed next to the source file:
- `src/cost/index.ts` → `src/cost/index.test.ts`

---

## Documentation

- Update relevant docs when changing behavior
- Keep `ARCHITECTURE.md` in sync with major changes
- Add changelog entries for user-facing changes

---

## Questions?

Open an issue on GitHub or reach out to the maintainers.

---

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
