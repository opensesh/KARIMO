# /karimo:overview — Cross-PRD Oversight Dashboard

Surface all tasks needing human attention and recently completed work across all active PRDs.

## Usage

```
/karimo:overview              # Full dashboard view
/karimo:overview --blocked    # Show only blocked tasks (needs human review)
/karimo:overview --active     # Show only active PRDs with progress
```

## Purpose

**Primary human oversight touchpoint.** Check this each morning or after execution runs complete.

Shows:
- 🚫 Blocked tasks (failed 3 Greptile attempts, needs human review)
- ⚠️ Tasks in active revision loops
- 🔀 Tasks needing human rebase (merge conflicts)
- ✅ Recently completed work

---

## Dashboard Output

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Overview                                             │
╰──────────────────────────────────────────────────────────────╯

🚫 Blocked — Needs Human Review
───────────────────────────────

  PRD: user-profiles
  Board: https://github.com/orgs/{org}/projects/{number}

    [2a] Implement profile edit form
         PR #44 · Greptile: 2/5, 2/5, 2/5 (3 attempts)
         Model: escalated sonnet → opus
         Blocked since: 2h ago
         → Review PR: https://github.com/{owner}/{repo}/pull/44

    [3b] Add notification preferences
         PR #47 · Greptile: 1/5, 2/5, 1/5 (3 attempts)
         Model: opus (no escalation — complexity 8)
         Blocked since: 45m ago
         → Review PR: https://github.com/{owner}/{repo}/pull/47


⚠️  In Revision — Active Loops
────────────────────────────────

  PRD: token-studio
  Board: https://github.com/orgs/{org}/projects/{number}

    [1c] Token validation logic
         PR #51 · Greptile: 2/5 (attempt 1 of 3)
         Model: escalated sonnet → opus
         → PR: https://github.com/{owner}/{repo}/pull/51


🔀 Needs Human Rebase
──────────────────────

  PRD: user-profiles
  Board: https://github.com/orgs/{org}/projects/{number}

    [2b] Add avatar upload
         Conflict files: src/types/index.ts, src/components/UserProfile.tsx
         → Branch: feature/user-profiles/2b


✅ Recently Completed
─────────────────────

  PRD: user-profiles (4/6 tasks done — 67%)
  Board: https://github.com/orgs/{org}/projects/{number}

    [1a] Create UserProfile component        ✓ merged 3h ago   PR #42
    [1b] Add user type definitions           ✓ merged 2h ago   PR #43
    [2c] Profile API endpoints               ✓ merged 1h ago   PR #45
    [2d] Profile page layout                 ✓ merged 30m ago  PR #46

  PRD: token-studio (2/8 tasks done — 25%)
  Board: https://github.com/orgs/{org}/projects/{number}

    [1a] Token schema types                  ✓ merged 4h ago   PR #49
    [1b] Token CRUD operations               ✓ merged 3h ago   PR #50


Summary: 2 blocked · 1 in revision · 1 needs rebase · 6 recently completed
```

---

## Data Sources

For each active PRD:
1. Read `.karimo/prds/{slug}/status.json` for task statuses
2. Read `github_project_url` from status.json for board links
3. Use `gh pr view {pr_number} --json url` to get PR URLs
4. Calculate time-ago from timestamps

---

## Filters

### `--blocked`

Show only blocked tasks (failed 3 Greptile attempts):

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Overview — Blocked Tasks                             │
╰──────────────────────────────────────────────────────────────╯

🚫 Blocked — Needs Human Review
───────────────────────────────

  PRD: user-profiles

    [2a] Implement profile edit form
         PR #44 · Greptile: 2/5, 2/5, 2/5 (3 attempts)
         → Review PR: https://github.com/{owner}/{repo}/pull/44

Summary: 2 blocked tasks across 1 PRD
```

### `--active`

Show only PRDs with in-progress work:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Overview — Active PRDs                               │
╰──────────────────────────────────────────────────────────────╯

  user-profiles     67% (4/6)     2 blocked, 0 in progress
  token-studio      25% (2/8)     1 in revision

Summary: 2 active PRDs
```

---

## Empty States

If no items in a category, omit that section entirely.

If no active PRDs exist:
```
No active PRDs found. Run /karimo:plan to create one, or /karimo:execute to start one.
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:review` | Review and approve PRD before execution |
| `/karimo:status` | View execution status for specific PRD |
| `/karimo:execute` | Execute approved PRD |
| `/karimo:plan` | Create or edit PRD |
