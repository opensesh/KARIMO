# KARIMO Security Model

Security is enforced through agent boundaries, file protection, and scoped access. KARIMO implements these constraints at the configuration level.

---

## Security Summary

| Safeguard | Description |
|-----------|-------------|
| **File boundaries** | `never_touch` and `require_review` patterns |
| **Agent rules** | Behavior constraints in KARIMO_RULES.md |
| **Worktree isolation** | Each task runs in isolated directory |
| **Scoped GitHub tokens** | Minimum required permissions |
| **Environment sandboxing** | Filtered environment variables |

---

## Agent Boundaries

Agent behavior is constrained by rules defined in `.claude/KARIMO_RULES.md`:

### What Agents Cannot Do

- Modify files matching `never_touch` patterns
- Execute commands outside of task scope
- Access credentials directly
- Push to protected branches
- Merge PRs without review

### What Agents Must Do

- Work within assigned worktree
- Run pre-PR validation checks
- Create PRs (not direct pushes)
- Follow task boundaries from PRD

---

## File Protection

### Never-Touch Files

Files that agents cannot modify under any circumstances:

```yaml
boundaries:
  never_touch:
    - "*.lock"
    - ".env*"
    - "migrations/"
    - "package-lock.json"
    - ".github/workflows/*"
    - "secrets/*"
```

### Require-Review Files

Files that get flagged for human attention:

```yaml
boundaries:
  require_review:
    - "src/auth/*"
    - "api/middleware.ts"
    - "*.config.js"
    - "security/*"
```

### Pattern Matching

Patterns use glob syntax:
- `*` matches any characters except `/`
- `**` matches any characters including `/`
- `?` matches any single character

---

## Environment Sandboxing

Task agents receive a filtered environment:

### Always Included

Safe environment variables passed to agents:

| Variable | Purpose |
|----------|---------|
| `PATH` | Command execution |
| `HOME` | User directory |
| `TERM` | Terminal type |
| `SHELL` | Shell preference |
| `USER` | Username |
| `LANG`, `LC_ALL` | Locale settings |
| `TZ` | Timezone |
| `EDITOR`, `VISUAL` | Text editor |

### Always Excluded

Sensitive variables never passed to task agents:

| Variable | Why Excluded |
|----------|--------------|
| `GITHUB_TOKEN` | Repository access |
| `AWS_ACCESS_KEY_ID` | Cloud credentials |
| `AWS_SECRET_ACCESS_KEY` | Cloud credentials |
| `DATABASE_URL` | Database access |
| `OPENAI_API_KEY` | API credentials |
| `ANTHROPIC_API_KEY` | API credentials |
| `*_SECRET*` | Pattern for secrets |

### Custom Safe Variables

Add project-specific safe variables in config:

```yaml
sandbox:
  safe_env:
    - "NODE_ENV"
    - "DEBUG"
    - "LOG_LEVEL"
```

---

## Worktree Isolation

Each task runs in an isolated Git worktree:

### Isolation Benefits

- Changes cannot affect main branch directly
- Failed tasks don't contaminate other work
- Parallel tasks can't interfere
- Easy cleanup on failure

### Directory Structure

```
.worktrees/
└── {prd-slug}/
    └── {task-id}/    # Isolated environment
```

---

## GitHub Authentication

### Scoped Tokens

Use fine-grained personal access tokens with minimum permissions:

| Permission | Level | Why |
|------------|-------|-----|
| Issues | Read & Write | Task issues |
| Pull requests | Read & Write | PR creation |
| Projects | Read & Write | Status tracking |
| Contents | Read & Write | Branch/code work |
| Metadata | Read | Required for tokens |

### Permissions NOT Needed

- Actions
- Administration
- Secrets
- Variables
- Webhooks
- Deployments

### Setup

1. GitHub → Settings → Developer Settings → Fine-grained tokens
2. Repository access: "Only select repositories"
3. Set minimum permissions above
4. Expiration: 90 days (force rotation)

---

## GitHub Actions Security

### Workflow Permissions

KARIMO workflows use minimal permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

### Secret Management

Required secrets for Phase 2:
- `GREPTILE_API_KEY` — For automated review

Store in repository settings → Secrets → Actions.

---

## Best Practices

### For Developers

1. **Review boundaries** — Check `never_touch` and `require_review` before running agents
2. **Audit learnings** — Review rules captured in CLAUDE.md
3. **Rotate tokens** — Set short expiration on GitHub tokens
4. **Monitor PRs** — Review agent-created PRs before merge

### For Organizations

1. **Branch protection** — Require PR reviews before merge
2. **CODEOWNERS** — Define owners for sensitive directories
3. **Audit logs** — Monitor agent activity
4. **Access limits** — Use team-scoped tokens

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design |
| [CODE-INTEGRITY.md](CODE-INTEGRITY.md) | Code quality practices |
| [CONFIG-REFERENCE.md](CONFIG-REFERENCE.md) | Configuration guide |
