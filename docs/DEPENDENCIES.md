# KARIMO Dependencies

This document covers the external dependencies required at each level and how KARIMO maintains framework portability.

---

## Dependency Inventory

| System | Used For | Required Level | Fallback If Unavailable |
|--------|----------|----------------|-------------------------|
| git | Version control, branches, worktrees | Level 0 | None — hard dependency |
| Bun | TypeScript runtime, package management | Level 0 | Node.js (slower but compatible) |
| Claude Code | Primary agent engine (Max plan) | Level 0 | Codex or Gemini (Level 4) |
| GitHub API (repos) | PR creation, branch management | Level 0 | `gh` CLI |
| GitHub Projects API | Task state management | Level 1 | Offline mode → local JSON |
| SQLite | Cost tracking | Level 2 | Log to JSON files |
| Greptile | Automated PR review | Level 2 | Manual review |
| Codex API | Fallback agent engine | Level 4 | Skip — use only Claude |
| Gemini API | Fallback agent engine | Level 4 | Skip — use only Claude |
| Vercel | Dashboard hosting | Level 5 | Run dashboard locally |
| React Flow | Dependency graph visualization | Level 5 | GitHub Projects board view |

---

## Day 1 Dependencies

To start with KARIMO at Level 0, you need only:

1. **git** — Version control
2. **Bun** — TypeScript runtime
3. **Claude Code** — Primary agent engine

That's it. Everything else is added as you progress through levels.

---

## Framework Portability

### What's Project-Specific vs. Generic

| Component | Project-Specific | Generic |
|-----------|------------------|---------|
| `.karimo/config.yaml` rules | The actual rules | The config format and all settings |
| PRD content | Your phases and tasks | PRD template, interview protocol, task schema |
| `require_review` file list | The specific files | The enforcement mechanism |
| Dashboard | Nothing — already generic | Everything |
| Orchestrator | Nothing | Everything |
| Compound learning system | Nothing | Everything |
| Checkpoint protocol | Nothing | Everything |
| GitHub Projects structure | Phase names | Column structure, custom fields |

### Key Insight

KARIMO's core orchestrator, learning system, and all safeguards are completely project-agnostic. The only project-specific elements are:
- Your rules and boundaries in `config.yaml`
- Your PRD content
- Your phase/task names in GitHub Projects

This means KARIMO works identically whether you're building a Next.js app, a Python API, a Rust CLI tool, or any other codebase.

---

## Minimum Viable Setup for a New Project

Skip Greptile (manual review), skip dashboard (use GitHub Projects board), skip fallback engines. Just orchestrator + GitHub Projects.

### Setup Steps

1. Fork the KARIMO repository
2. Run `karimo init` to create `.karimo/config.yaml` via auto-detection
3. Run `bun run init-project --phase "your-phase" --repo "owner/repo"` to scaffold the GitHub Project
4. Write one PRD.md with tasks in the standard YAML format
5. Run `karimo orchestrate --phase <phase-id> --task <first-task>`

### Repository Structure

KARIMO ships as a separate repository from any target project. The `.karimo/` directory in the target project contains project-specific configuration that points to the framework.

```
your-project/
├── .karimo/
│   ├── config.yaml          # Project-specific config
│   ├── prds/                 # PRD files
│   │   └── phase-1.md
│   ├── checkpoints/          # Learning data
│   └── projects.json         # GitHub Project IDs
├── src/
│   └── ...
└── package.json
```

---

## Offline Mode

When GitHub API is unavailable or `--offline` flag is set:

1. Task state is stored in `.karimo/local-state.json`
2. All state transitions happen locally
3. On reconnection, `karimo sync` pushes local state to GitHub Projects

This makes the system:
- Testable without network access
- Resilient to GitHub outages
- Usable in air-gapped environments (with local agent)

---

## Version Requirements

| Dependency | Minimum Version | Notes |
|------------|-----------------|-------|
| git | 2.20+ | Worktree support |
| Bun | 1.0+ | Native TypeScript |
| Node.js | 18+ | Fallback runtime |
| Claude Code | Latest | Max plan required for context |

---

## Related Documentation

- [LEVELS.md](./LEVELS.md) — Which dependencies are needed at each level
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview
- [COMPONENTS.md](./COMPONENTS.md) — Component specifications
