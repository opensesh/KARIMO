# KARIMO Security Model

Security is a constraint, not a feature. KARIMO implements scoped tokens, sandboxed agents, and authenticated endpoints as requirements from Level 0.

---

## 6.1 Scoped GitHub Authentication

Use a fine-grained personal access token scoped to the target repository only.

### Required Permissions (Minimum Viable)

| Permission | Level | Why |
|------------|-------|-----|
| Issues | Read & Write | Create issues, update labels |
| Pull requests | Read & Write | Create PRs, read review comments |
| Projects | Read & Write | Update custom fields, move items |
| Contents | Read & Write | Create branches, push code |
| Metadata | Read | Required for all fine-grained tokens |

### Permissions NOT Needed

- Actions
- Administration
- Environments
- Secrets
- Variables
- Pages
- Webhooks
- Deployments

### Setup Steps

1. GitHub → Settings → Developer Settings → Fine-grained personal access tokens
2. Repository access: "Only select repositories" → select your project
3. Set only the permissions above
4. Expiration: 90 days (force rotation)
5. Store as `GITHUB_TOKEN` in `.env.local` (never committed)

---

## 6.2 Dashboard Authentication

All dashboard endpoints require API key authentication. The merge endpoint requires an additional confirmation token (60-second TTL) to prevent replay attacks.

### Confirmation Token Flow

```typescript
function generateConfirmationToken(prNumber: number): string {
  const payload = { pr: prNumber, ts: Date.now(), nonce: crypto.randomUUID() };
  return jwt.sign(payload, process.env.KARIMO_DASHBOARD_SECRET, { expiresIn: '60s' });
}

// Flow:
// 1. User clicks "Merge" → GET /api/merge/:prNumber/confirm
// 2. Server returns confirmation token + PR summary
// 3. User confirms → POST /api/merge/:prNumber with token
// 4. Server validates token → merges
```

This ensures that:
- Merge actions require explicit user confirmation
- Tokens expire quickly (60 seconds)
- Replay attacks are prevented via nonce

---

## 6.3 Agent Sandbox

Agents run with a restricted environment.

### Agents CAN Access

- Their worktree directory (read/write)
- `.karimo/config.yaml` (read-only)
- Environment variables in `sandbox.allowed_env`
- Network access for `bun install` and Claude API calls

### Agents CANNOT Access

- `.env` / `.env.local` files
- Service role keys
- Other worktrees
- The main repo working directory
- The orchestrator's SQLite database
- The dashboard's API key

### Implementation

```typescript
function buildAgentEnvironment(config: ProjectConfig): Record<string, string> {
  const allowed = new Set(config.sandbox.allowed_env);
  const agentEnv: Record<string, string> = {};

  for (const key of allowed) {
    if (process.env[key]) {
      agentEnv[key] = process.env[key];
    }
  }

  // Explicitly exclude dangerous keys (customize per project)
  delete agentEnv['DB_SERVICE_KEY'];
  delete agentEnv['KARIMO_DASHBOARD_API_KEY'];
  delete agentEnv['KARIMO_DASHBOARD_SECRET'];
  delete agentEnv['GITHUB_TOKEN'];

  return agentEnv;
}

const child = spawn('claude', args, {
  cwd: worktreePath,
  env: buildAgentEnvironment(config),
});
```

### 6.3.1 Known Limitation: Process-Level Isolation

The current sandbox filters environment variables but does not provide OS-level process isolation. An agent process runs as the host user and technically has filesystem access beyond its worktree — the `env` filtering, `never_touch` boundary enforcement, and `require_review` caution-file detection are application-level safeguards, not kernel-level ones.

**For single-user development (Level 0–3):** These layers provide sufficient protection. The agent has no credentials to do real damage, and caution-file enforcement catches unintended modifications before they merge.

**For multi-user or production deployments (Level 4+):** Agents should run inside Docker or Podman containers with the worktree mounted as the only writable volume and all host filesystem access revoked. This is tracked as a Level 4 hardening task.

---

## 6.4 Secrets Flow

### Secrets Table

| Secret | Where It Lives | Who Can Access It |
|--------|----------------|-------------------|
| `GITHUB_TOKEN` | .env.local | Orchestrator ONLY |
| `DB_PUBLIC_URL` | .env.local | Orchestrator + Agents |
| `DB_ANON_KEY` | .env.local | Orchestrator + Agents |
| `DB_SERVICE_KEY` (admin/service) | .env.local | Orchestrator ONLY, NEVER to agents |
| `DASHBOARD_API_KEY` | Vercel env vars | Dashboard app ONLY |
| `DASHBOARD_SECRET` | Vercel env vars | Dashboard app ONLY |
| `GREPTILE_TOKEN` | .env.local | Orchestrator ONLY |
| `CODEX_API_KEY` | .env.local | Orchestrator ONLY |
| `GEMINI_API_KEY` | .env.local | Orchestrator ONLY |

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     SECRETS FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   .env.local ─────► Orchestrator reads all secrets          │
│        │                      │                             │
│        │                      ▼                             │
│        │            Orchestrator filters                    │
│        │                      │                             │
│        │                      ▼                             │
│        │            Agent gets ONLY sandbox.allowed_env     │
│        │                                                    │
│   Vercel env vars ─► Dashboard gets its own keys            │
│                                                             │
│   GitHub token ────► Orchestrator only, never agents        │
│                                                             │
│   Agents authenticate to Claude API via their own CLI auth  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. `.env.local` → Orchestrator reads all secrets
2. Orchestrator filters → Agent gets ONLY `sandbox.allowed_env`
3. Vercel env vars → Dashboard gets its own keys
4. GitHub token → Orchestrator only, never agents
5. Agents authenticate to Claude API via their own CLI auth

---

## Related Documentation

- [CODE-INTEGRITY.md](./CODE-INTEGRITY.md) — Caution file enforcement and boundary rules
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System overview
- [COMPONENTS.md](./COMPONENTS.md) — Agent sandbox implementation details
