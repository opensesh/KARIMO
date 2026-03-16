# KARIMO CD Integration

How KARIMO interacts with your continuous deployment systems.

---

## Philosophy

**KARIMO focuses on orchestration — your CI catches issues at merge time.**

KARIMO creates PRs for each task. When those PRs merge to main, your existing CI (GitHub Actions, CircleCI, Jenkins) runs `build`, `lint`, `test`, and `typecheck` as normal.

This keeps KARIMO simple and portable across any CI system.

---

## Preview Deployments

### The Problem

KARIMO task PRs contain partial code that may not build in isolation:

```
Wave 1:
  Task 1a: Add UserProfile type definitions
  Task 1b: Add ProfileForm component (uses UserProfile)
```

If Vercel builds Task 1b before Task 1a merges, the build fails because `UserProfile` doesn't exist yet.

**This is expected behavior.** The code works once all wave tasks merge to main.

### Solutions

#### Option 1: Skip KARIMO Branches (Recommended)

Run `/karimo:configure --cd` to auto-configure your deployment provider.

Or manually configure:

**Vercel** — Add to `vercel.json`:
```json
{
  "ignoreCommand": "[[ \"$VERCEL_GIT_COMMIT_REF\" =~ (^feature/|^worktree/) ]] && exit 0 || exit 1"
}
```

**Netlify** — Add to `netlify.toml`:
```toml
[build]
  ignore = "[[ \"$HEAD\" =~ (^feature/|^worktree/) ]] && exit 0 || exit 1"
```

**Render** — In dashboard, set Auto-Deploy to exclude branches matching: `(^feature/|^worktree/)`

**The Pattern:** KARIMO creates feature branches (`feature/{prd-slug}`) and task branches (`worktree/{prd-slug}-{task-id}`). The regex `(^feature/|^worktree/)` matches both patterns.

#### Option 2: Accept the Noise

Preview failures are informational, not blocking:
- Configure branch protection to make preview checks non-required
- Rely on main branch builds for actual validation

#### Option 3: Disable PR Previews

Most platforms allow disabling PR previews while keeping main branch deployments.

---

## Branch Pattern Details

### KARIMO Branch Naming

KARIMO task branches follow this pattern:
```
worktree/{prd-slug}-{task-id}
```

Examples:
- `worktree/user-profiles-1a`
- `worktree/token-studio-2b`
- `worktree/auth-refactor-3a`
- `worktree/payment-flow-10a` (multi-digit task IDs supported)

### Ignore Pattern Breakdown (v5.0+)

```regex
(^feature/|^worktree/)
```

This pattern skips two types of KARIMO branches:

1. **Feature branches** (`^feature/`):
   - `feature/user-auth` ✓ Skip
   - `feature/token-studio` ✓ Skip
   - Used in v5.0 feature branch mode
   - Aggregate multiple task PRs before main merge

2. **Task branches** (`^worktree/`):
   - `worktree/user-auth-1a` ✓ Skip
   - `worktree/user-auth-2b` ✓ Skip
   - Used in both v5.0 and v4.0 modes
   - Individual task implementation branches

**Why skip these?**
- Feature branches: Aggregate review happens before main merge
- Task branches: Individual PRs reviewed separately
- Only deploy to production when changes merge to main
- Prevents 15+ preview deployments per PRD (v5.0) or per task (v4.0)

**What gets deployed?**
- PRs to `main` (final feature merge in v5.0, or direct task merge in v4.0)
- Direct pushes to `main` (emergency hotfixes)

### Pattern Validation

Test the pattern with bash:

```bash
# Should exit 0 (skip build)
BRANCH="user-profiles-1a" && [[ "$BRANCH" =~ -[0-9]+[a-z]?$ ]] && echo "skip" || echo "build"

# Should exit 1 (build)
BRANCH="feature/new-api" && [[ "$BRANCH" =~ -[0-9]+[a-z]?$ ]] && echo "skip" || echo "build"
```

### Edge Cases

| Branch Name | Matches? | Reason |
|-------------|----------|--------|
| `user-profiles-1a` | ✓ | Standard KARIMO format |
| `auth-refactor-10b` | ✓ | Multi-digit task ID |
| `fix-123` | ✗ | No dash before digits, no letter suffix |
| `feature/add-1a` | ✗ | Contains slash, different pattern |
| `hotfix-1` | ✓ | Matches (rare false positive, acceptable) |

The pattern is conservative — it may skip a rare non-KARIMO branch like `hotfix-1`, but this is preferable to missing KARIMO branches.

---

## Branch Protection

KARIMO doesn't enforce merge gates — that's your repository's policy.

Recommended settings for KARIMO PRs:

| Setting | Recommendation |
|---------|----------------|
| Require PR reviews | Optional (agents can merge if you trust them) |
| Require status checks | Enable for main branch builds |
| Require branches to be up to date | Disable (waves handle sequencing) |
| Allow force pushes | Disable |

### Making Preview Checks Non-Blocking

If you want previews to run but not block merges:

**GitHub:**
1. Go to Settings → Branches → Branch protection rules
2. Under "Require status checks", uncheck preview deployment checks
3. Keep only essential checks (CI tests, linting) as required

**Vercel:**
- Preview check failures don't block merges by default
- Only production deployment failures can be made required

---

## Automated Code Review Integration (Optional)

KARIMO installs zero review workflows by default. Choose your review provider with `/karimo:configure --review`:

### Option A: Greptile

```bash
/karimo:configure --greptile
```

This installs `karimo-greptile-review.yml` and provides instructions for adding your `GREPTILE_API_KEY` secret.

When enabled:
1. Task PR created → Greptile reviews code
2. Score ≥ 3 → `greptile-passed` label
3. Score < 3 → `greptile-needs-revision` label, agent revises

**Pricing:** $30/month flat, 14-day trial

### Option B: Claude Code Review

```bash
/karimo:configure --code-review
```

This creates `REVIEW.md` with review guidelines and provides setup instructions.

When enabled:
1. Task PR created → Code Review multi-agent fleet activates
2. Inline comments posted with severity markers (🔴 🟡 🟣)
3. 🔴 findings → revision loop, 🟡/🟣 → logged but not blocking

**Setup:**
1. Enable at `claude.ai/admin-settings/claude-code`
2. Install Claude GitHub App on repository
3. Enable repository for Code Review

**Pricing:** $15-25 per review (token-based)

### Provider Comparison

| Feature | Greptile | Code Review |
|---------|----------|-------------|
| Best for | High volume (50+ PRs/month) | Low-medium volume |
| Style | Score-based (0-5) | Finding-based (severity) |
| Auto-resolve | Manual | Automatic |

Both providers enable revision loops and model escalation. See [PHASES.md](PHASES.md) for details.

---

## Platform-Specific Guides

### Vercel

**Configuration:**
```json
{
  "ignoreCommand": "[[ \"$VERCEL_GIT_COMMIT_REF\" =~ -[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
}
```

**How it works:**
- `VERCEL_GIT_COMMIT_REF` contains the branch name
- Exit code `0` = skip the build
- Exit code `1` = proceed with build

**Alternative (vercel.ts):**
```typescript
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  ignoreCommand: '[[ "$VERCEL_GIT_COMMIT_REF" =~ -[0-9]+[a-z]?$ ]] && exit 0 || exit 1',
};
```

### Netlify

**Configuration:**
```toml
[build]
  ignore = "[[ \"$HEAD\" =~ -[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
```

**How it works:**
- `$HEAD` contains the branch name
- Same exit code logic as Vercel

**Alternative (netlify-ignore.sh):**
```bash
#!/bin/bash
# Skip KARIMO task branches
if [[ "$HEAD" =~ -[0-9]+[a-z]?$ ]]; then
  echo "Skipping KARIMO task branch: $HEAD"
  exit 0
fi
exit 1
```

Reference in `netlify.toml`:
```toml
[build]
  ignore = "./netlify-ignore.sh"
```

### Render

Render requires dashboard configuration:

1. Go to your service in the Render dashboard
2. Navigate to Settings → Build & Deploy
3. Under "Auto-Deploy", select "No" or configure branch patterns
4. Add exclude pattern: `-[0-9]+[a-z]?$`

**Note:** As of 2026, Render doesn't support ignore commands in `render.yaml`.

### Railway

Railway requires dashboard configuration:

1. Go to your project in Railway dashboard
2. Navigate to Settings → Deploys
3. Configure "Watch Patterns" to exclude KARIMO branches
4. Add pattern: `*-[0-9]+[a-z]$`

### Fly.io

Fly.io doesn't auto-deploy PRs by default. If you've set up GitHub Actions for Fly:

```yaml
# .github/workflows/fly-deploy.yml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
    # Skip KARIMO task branches
    paths-ignore:
      - '**'  # Needs custom condition

jobs:
  deploy:
    # Add condition to skip KARIMO branches
    if: ${{ !endsWith(github.head_ref, '-1a') && !contains(github.head_ref, '-') }}
    # ... rest of workflow
```

Or use a more robust check:

```yaml
jobs:
  deploy:
    if: ${{ !contains(github.head_ref, '-') || !endsWith(github.head_ref, 'a') }}
```

---

## Troubleshooting

### "Preview builds failing on KARIMO PRs"

This is expected for partial code. Run `/karimo:configure --cd` to skip previews.

### "Previews still building after configuration"

1. Verify the config file was saved
2. Check the config file syntax (JSON/TOML)
3. Push a test branch ending with `-1a`
4. Check deployment logs for "Ignoring build" message

### "Pattern matching wrong branches"

The pattern `-[0-9]+[a-z]?$` is intentionally conservative. If you have branches like `hotfix-1` that get skipped:
- Rename to `hotfix/issue-1` or `hotfix-issue-1`
- Or adjust the pattern to be more specific

### "Need to debug a KARIMO branch build"

Temporarily force a build:
1. Rename the branch to not match the pattern
2. Or remove the ignore rule temporarily
3. Or use `vercel --force` / manual deploy trigger

---

## Related Documentation

| Document | Topic |
|----------|-------|
| [SAFEGUARDS.md](SAFEGUARDS.md) | Security and code integrity |
| [COMMANDS.md](COMMANDS.md) | All KARIMO commands |
| [PHASES.md](PHASES.md) | Adoption phases |
