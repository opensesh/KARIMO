# /karimo-cd-config — CD Provider Configuration

Configure your continuous deployment provider to skip preview builds for KARIMO task branches.

## Usage

```
/karimo-cd-config              # Auto-detect and configure
/karimo-cd-config --provider vercel   # Skip detection, configure Vercel
/karimo-cd-config --check      # Show current configuration status
```

## Why This Matters

KARIMO task branches contain partial code that won't build in isolation:
- Task 1a adds types
- Task 1b adds the consumer that uses those types
- Building Task 1b alone fails (types don't exist yet)

**This is expected.** The code works once all wave tasks merge to main.

## Behavior

### Step 1: Provider Detection

Check for config files in priority order:

```bash
# Detection priority
if [ -f "vercel.json" ] || [ -f "vercel.ts" ] || [ -d ".vercel" ]; then
  PROVIDER="vercel"
elif [ -f "netlify.toml" ]; then
  PROVIDER="netlify"
elif [ -f "render.yaml" ]; then
  PROVIDER="render"
elif [ -f "railway.json" ] || [ -f "railway.toml" ]; then
  PROVIDER="railway"
elif [ -f "fly.toml" ]; then
  PROVIDER="fly"
else
  PROVIDER="unknown"
fi
```

**If `--provider` flag is passed:**
- Skip detection and use the specified provider
- Valid providers: `vercel`, `netlify`, `render`, `railway`, `fly`

**If `--check` flag is passed:**
- Display current configuration status for detected provider
- Show whether ignore rule is already configured
- Exit without making changes

### Step 2: Present Options

**If provider detected:**

```
╭──────────────────────────────────────────────────────────────╮
│  CD Provider Configuration                                   │
╰──────────────────────────────────────────────────────────────╯

Detected: Vercel (vercel.json found)

KARIMO task branches (e.g., user-profiles-1a) contain partial code
that won't build in isolation. This is expected — the code works
once all wave tasks merge to main.

Options:
  1. Configure ignore rule — Skip preview builds for KARIMO branches
  2. Accept the noise — Let previews fail (won't block merges)
  3. Learn more — Open CI-CD.md documentation
  4. Cancel

Your choice:
```

**If no provider detected:**

```
╭──────────────────────────────────────────────────────────────╮
│  CD Provider Configuration                                   │
╰──────────────────────────────────────────────────────────────╯

No CD provider detected. Which platform do you use?

  1. Vercel
  2. Netlify
  3. Render
  4. Railway
  5. Fly.io
  6. None / Other — I'll configure manually
  7. Cancel

Your choice:
```

Use AskUserQuestion for option selection.

### Step 3: Apply Configuration

For each provider, add the appropriate ignore rule:

**Vercel:**

Check if `vercel.json` exists. If not, create it.

```json
{
  "ignoreCommand": "[[ \"$VERCEL_GIT_COMMIT_REF\" =~ -[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
}
```

If `vercel.json` already exists:
- Parse existing JSON
- Add or update the `ignoreCommand` field
- Preserve all other fields

**Netlify:**

Check if `netlify.toml` exists. If not, create it with:

```toml
[build]
  ignore = "[[ \"$HEAD\" =~ -[0-9]+[a-z]?$ ]] && exit 0 || exit 1"
```

If `netlify.toml` already exists:
- Check if `[build]` section exists
- Add `ignore` command to `[build]` section
- If `ignore` already exists, show current value and ask to update

**Render:**

Add a comment to `render.yaml` (Render requires dashboard config):

```yaml
# KARIMO: Configure "Auto-Deploy" in dashboard to exclude branches matching: -[0-9]+[a-z]?$
# See: https://render.com/docs/deploys#skip-deploys
```

Display message:
```
Render requires dashboard configuration for branch filtering.

In the Render dashboard:
1. Go to your service settings
2. Under "Auto-Deploy", set to "No"
3. Or configure a branch pattern to exclude: -[0-9]+[a-z]?$

Added comment to render.yaml as a reminder.
```

**Railway:**

Check if `railway.toml` exists. If not, create it with:

```toml
# KARIMO: Railway doesn't support branch-level ignore via config
# Configure in dashboard: Settings → Deploys → Watch Patterns
# Exclude pattern: *-[0-9]+[a-z]$
```

Display message:
```
Railway requires dashboard configuration for branch filtering.

In the Railway dashboard:
1. Go to your project settings
2. Under "Deploys", find "Watch Patterns"
3. Add an exclude pattern: *-[0-9]+[a-z]$
```

**Fly.io:**

Fly.io doesn't auto-deploy on PR by default. Display:

```
Fly.io doesn't auto-deploy on PR branches by default.

If you've configured GitHub Actions for Fly deployment:
- Add a branch condition to skip KARIMO branches
- Pattern: branches ending with -[digit][letter] (e.g., -1a, -2b)

No configuration needed if using default Fly.io setup.
```

### Step 4: Verify Configuration

After applying, show confirmation:

```
✓ Updated vercel.json with KARIMO ignore rule

KARIMO task branches (e.g., user-profiles-1a) will skip preview deployments.
Non-KARIMO branches (feature/*, fix/*, etc.) will deploy normally.

Test by pushing a branch ending with -1a or -2b.
```

## The Pattern

KARIMO task branches follow: `{prd-slug}-{task-id}`

Examples: `user-profiles-1a`, `token-studio-2b`, `auth-refactor-3a`

**Regex:** `-[0-9]+[a-z]?$` (branches ending with dash-digit-optional-letter)

This is specific enough to avoid false positives while catching all KARIMO branches.

## Error Handling

| Scenario | Response |
|----------|----------|
| No provider detected | Ask user to select from list |
| Config file doesn't exist | Create it with just the ignore rule |
| Ignore rule already exists | Show current config, ask if user wants to update |
| Parse error | Show error, suggest manual configuration |
| Write permission denied | Display error with chmod suggestion |

## Voice & Delivery

- Be direct and concise
- Don't explain what you're about to do — just do it
- Show results, not intentions
- Use the box-drawing UI format for menus

**Good:** "Detected: Vercel"
**Bad:** "Let me check what CD provider you're using..."

**Good:** "✓ Updated vercel.json"
**Bad:** "I've successfully updated your vercel.json file with the ignore command"

## Related

- [CI-CD.md](/.karimo/docs/CI-CD.md) — Full CI/CD integration documentation
- [SAFEGUARDS.md](/.karimo/docs/SAFEGUARDS.md) — Code integrity and security
