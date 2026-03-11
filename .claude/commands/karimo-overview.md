# /karimo-overview — Cross-PRD Oversight Dashboard

Surface all tasks needing human attention and recently completed work across all active PRDs.

## Usage

```
/karimo-overview              # Full dashboard view
/karimo-overview --blocked    # Show only blocked tasks (needs human review)
/karimo-overview --active     # Show only active PRDs with progress
/karimo-overview --deps       # Show cross-PRD dependency graph
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

  PRD: user-profiles (Mode: Feature Branch)
  Feature Branch: feature/user-profiles

    [2a] Implement profile edit form
         PR #44 → feature branch · Greptile: 2/5, 2/5, 2/5 (3 attempts)
         Model: escalated sonnet → opus
         Blocked since: 2h ago
         → Review PR: https://github.com/{owner}/{repo}/pull/44

    [3b] Add notification preferences
         PR #47 → feature branch · Greptile: 1/5, 2/5, 1/5 (3 attempts)
         Model: opus (no escalation — complexity 8)
         Blocked since: 45m ago
         → Review PR: https://github.com/{owner}/{repo}/pull/47


⚠️  In Revision — Active Loops
────────────────────────────────

  PRD: token-studio (Mode: Direct-to-Main)

    [1c] Token validation logic
         PR #51 → main · Greptile: 2/5 (attempt 1 of 3)
         Model: escalated sonnet → opus
         → PR: https://github.com/{owner}/{repo}/pull/51


🔀 Needs Human Rebase
──────────────────────

  PRD: user-profiles (Mode: Feature Branch)
  Feature Branch: feature/user-profiles

    [2b] Add avatar upload
         Conflict files: src/types/index.ts, src/components/UserProfile.tsx
         → Branch: user-profiles-2b


✅ Recently Completed
─────────────────────

  PRD: user-profiles (4/6 tasks done — 67%) — Feature Branch Mode
  Status: active (all tasks will merge to feature/user-profiles)

    [1a] Create UserProfile component        ✓ merged 3h ago   PR #42
    [1b] Add user type definitions           ✓ merged 2h ago   PR #43
    [2c] Profile API endpoints               ✓ merged 1h ago   PR #45
    [2d] Profile page layout                 ✓ merged 30m ago  PR #46

  PRD: token-studio (2/8 tasks done — 25%) — Direct-to-Main Mode
  Status: active

    [1a] Token schema types                  ✓ merged 4h ago   PR #49
    [1b] Token CRUD operations               ✓ merged 3h ago   PR #50


🎯 Ready for Final Merge
─────────────────────────

  PRD: auth-system (5/5 tasks done — 100%) — Feature Branch Mode
  Feature Branch: feature/auth-system
  Status: ready-for-merge

    All tasks merged to feature branch ✓
    Next: /karimo-merge --prd auth-system


Summary: 2 blocked · 1 in revision · 1 needs rebase · 6 recently completed · 1 ready for merge
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

  user-profiles     67% (4/6)     2 blocked, 0 in progress (modified 2x)
  token-studio      25% (2/8)     1 in revision

Summary: 2 active PRDs
```

Note: The `(modified Nx)` annotation appears when a PRD has been modified via `/karimo-modify`.

### `--deps`

Show cross-PRD dependency graph:

```
╭──────────────────────────────────────────────────────────────╮
│  KARIMO Overview — Cross-PRD Dependencies                    │
╰──────────────────────────────────────────────────────────────╯

📊 Dependency Graph
───────────────────

  token-studio
  └── user-profiles (blocks execution)
      └── Listed in cross_feature_blockers
      └── Runtime discovery: "Auth middleware needed" (from 2a)

  notification-system
  └── user-profiles (blocks execution)
      └── Listed in cross_feature_blockers

  analytics-dashboard
  └── token-studio (blocks execution)
      └── Listed in cross_feature_blockers
  └── user-profiles (blocks execution)
      └── Runtime discovery: "UserProfile types needed" (from 1c)


⚠️  Dependency Issues
────────────────────

  token-studio
    → Blocked by: user-profiles (status: running, 67% complete)
    → Recommendation: Wait for user-profiles to complete

  notification-system
    → Blocked by: user-profiles (status: running, 67% complete)
    → Can execute after: user-profiles completes

  analytics-dashboard
    → Blocked by: token-studio (status: ready), user-profiles (status: running)
    → Recommendation: Execute after both dependencies complete


📋 Recommended Execution Order
──────────────────────────────

  1. user-profiles          ← Currently running (67%)
  2. token-studio           ← Ready, waiting on (1)
  3. notification-system    ← Ready, waiting on (1)
  4. analytics-dashboard    ← Ready, waiting on (1) and (2)


Summary: 4 PRDs with dependencies · 1 running · 3 blocked
```

#### Data Sources for `--deps`

1. **cross_feature_blockers from PRD.md:**
   ```markdown
   ## Dependencies
   ### Cross-Feature Blockers
   - `user-profiles` — needs UserProfile types
   ```

2. **Runtime discoveries from dependencies.md:**
   ```markdown
   | Dependency | Classification | Source Task |
   |------------|----------------|-------------|
   | Auth middleware | CROSS-FEATURE | 2a |
   ```

3. **Status from each PRD's status.json:**
   - Calculate completion percentage
   - Determine if PRD is running, ready, or complete

---

## Empty States

If no items in a category, omit that section entirely.

If no active PRDs exist:
```
No active PRDs found. Run /karimo-plan to create one, or /karimo-execute to start one.
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo-plan` | Create PRD with interactive approval |
| `/karimo-execute` | Execute PRD (brief gen + task execution) |
| `/karimo-status` | View execution status for specific PRD |
